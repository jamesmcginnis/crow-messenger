"""Crow Messenger Email's brain: accounts, the mail on them, and everything that happens when it arrives.

Each person's accounts are private to them: only their own card can see or use them.
Home Assistant keeps a live connection to every account (IMAP IDLE), notices new mail the
moment it arrives, fires events, runs rules, sends phone notifications and keeps each
account's sensors up to date.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any, Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from . import microsoft
from .const import (
    COUNTS_SECONDS, DEFAULT_SETTINGS, DOMAIN, EVENT_RECEIVED, EVENT_RULE_MATCHED, EVENT_SENT,
    IDLE_RENEW_SECONDS, MAX_ACCOUNTS_PER_USER, MAX_SEARCH_RESULTS, MAX_VIPS,
    UNREAD_GROUP_MAX,
    NOTIFY_ACTION_PREFIX, NOTIFY_CHOICES, PAGE_SIZE, PROVIDERS, SEND_LATER_GRACE,
    SIGNAL_ACCOUNT_UPDATED, SIGNAL_ACCOUNTS_CHANGED, STORAGE_KEY, STORAGE_VERSION,
)
from .imapclient import ImapConn, ImapError, friendly
from .mailparse import norm_subject, parse_message, preview_from, sanitise_email_html, text_to_html, find_part
from .sendmail import SendError, build_message, clean_compose_html, quote_html, recipients, send

_LOGGER = logging.getLogger(__name__)
# without UIDPLUS the server won't say where moved emails went: Undo finds up to this many again by Message-ID
UNDO_FIND_MAX = 2000


def _plain_fallback(raw: bytes) -> dict:
    """The email as plain text, when its layout can't be read (so it still opens)."""
    import email as _email
    from email.header import decode_header, make_header
    from email.utils import getaddresses, parsedate_to_datetime

    m = _email.message_from_bytes(raw)

    def hdr(name: str) -> str:
        try:
            return str(make_header(decode_header(m.get(name) or "")))
        except Exception:  # noqa: BLE001
            return str(m.get(name) or "")

    def addrs(name: str) -> list[dict]:
        return [{"name": n, "email": a} for n, a in getaddresses([hdr(name)]) if a]

    text = ""
    for part in m.walk():
        if part.get_content_maintype() == "text" and not part.get_filename():
            try:
                text = (part.get_payload(decode=True) or b"").decode(part.get_content_charset() or "utf-8", "replace")
            except Exception:  # noqa: BLE001
                continue
            if part.get_content_subtype() == "plain":
                break
    if "<" in text and ">" in text:
        text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", text)
        text = re.sub(r"(?s)<[^>]+>", " ", text)
    try:
        when = int(parsedate_to_datetime(m.get("Date")).timestamp() * 1000)
    except Exception:  # noqa: BLE001
        when = 0
    return {"subject": hdr("Subject"), "from": addrs("From"), "to": addrs("To"), "cc": addrs("Cc"), "reply_to": addrs("Reply-To"),
            "date": when, "message_id": (m.get("Message-ID") or "").strip(), "in_reply_to": "", "references": "",
            "list_unsubscribe": "", "receipt_to": "", "text": re.sub(r"[ \t]+", " ", text).strip()[:200000], "html": "", "attachments": []}


class MailError(Exception):
    """Shown to the person using the card."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def now_ms() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    return secrets.token_hex(8)


def _clean(s: Any, n: int = 300) -> str:
    return str(s or "").strip()[:n]


def _addr_list(v: Any) -> list[dict]:
    out = []
    for a in v or []:
        if isinstance(a, str):
            a = {"email": a}
        em = _clean(a.get("email"), 254).lower()
        if em and re.match(r"^[^@\s]+@[^@\s]+$", em):
            out.append({"name": _clean(a.get("name"), 120), "email": em})
    return out[:100]


# ── one account, while Home Assistant is running ─────────────────────────────


class Account:
    def __init__(self, mailer: "Mailer", acc: dict) -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        self.acc = acc
        self.id = acc["id"]
        oauth = acc.get("auth") == "microsoft"
        user = acc.get("username") or acc["email"]
        self.cmd = ImapConn(acc["imap"], user, self._secret, oauth)
        self.idle_conn = ImapConn(acc["imap"], user, self._secret, oauth)
        self.stop = threading.Event()
        self.thread: threading.Thread | None = None
        self.folders: list[dict] = []
        self.folders_at = 0.0
        self.previews: dict[str, dict[int, str]] = {}
        self.raw_cache: OrderedDict[tuple, bytes] = OrderedDict()
        self.checking = asyncio.Lock()
        self.emptying: dict[str, dict] = {}   # Delete All Spam / Empty Trash still on its way, by folder
        self.stats: dict[str, Any] = {
            "connected": False, "error": "", "last_sync": None, "unread": None, "unread_vip": None,
            "flagged": None, "drafts": None, "received_today": None, "storage": None, "latest": None,
            "new_mail": False, "latest_vip": None, "unread_groups": None, "screener": None,
        }
        self.kind_cache: dict[int, str] = {}       # Inbox UID -> group (People, Notifications...), for unread by group
        self.kind_validity: Any = None
        self.vip_looked = False                    # looked for the newest VIP email since starting (or the VIPs changed)
        self.screener_seen: tuple = ()             # the Screener's emails last time, so its senders are only read again on a change
        self.screener_senders: list[dict] = []

    # the password, or a Microsoft access token (refreshed when needed, from any thread)
    def _secret(self) -> str:
        if self.acc.get("auth") != "microsoft":
            return self.acc.get("password") or ""
        ms = self.acc.get("ms") or {}
        if ms.get("access_token") and ms.get("expires_at", 0) > time.time():
            return ms["access_token"]
        if threading.current_thread() is threading.main_thread():
            raise ImapError("Microsoft sign-in needs refreshing first")
        fut = asyncio.run_coroutine_threadsafe(self.async_refresh_token(), self.hass.loop)
        return fut.result(timeout=60)

    async def async_refresh_token(self) -> str:
        ms = self.acc.get("ms") or {}
        if ms.get("access_token") and ms.get("expires_at", 0) > time.time():
            return ms["access_token"]
        st = self.mailer.settings
        try:
            tok = await microsoft.refresh(self.hass, st.get("ms_client_id", ""), st.get("ms_tenant", "common"),
                                          ms.get("refresh_token", ""))
        except microsoft.MicrosoftError as err:
            self.set_error(str(err))
            raise ImapError(str(err)) from err
        ms.update({"access_token": tok["access_token"], "expires_at": tok["expires_at"]})
        if tok.get("refresh_token"):
            ms["refresh_token"] = tok["refresh_token"]
        self.acc["ms"] = ms
        self.mailer.save()
        return tok["access_token"]

    # ── running IMAP commands, one at a time, off the event loop ──────────────
    async def job(self, fn: Callable, *args) -> Any:
        if self.acc.get("auth") == "microsoft":
            await self.async_refresh_token()

        name = getattr(fn, "__name__", "job")
        asked = time.monotonic()

        def run():
            with self.cmd.lock:
                started = time.monotonic()
                if started - asked > 10:
                    _LOGGER.warning("Crow Messenger Email (%s): %s waited %.0f s for the mail server connection, which was busy with %s",
                                    self.acc["email"], name, started - asked, getattr(self, "busy_with", "?"))
                self.busy_with = name
                try:
                    try:
                        return fn(*args)
                    except (ImapError, MailError):
                        raise
                    except Exception:  # noqa: BLE001 - a dropped connection: try once more on a new one
                        self.cmd.close()
                        return fn(*args)
                finally:
                    took = time.monotonic() - started
                    if took > 10:
                        _LOGGER.warning("Crow Messenger Email (%s): %s took %.0f s on the mail server", self.acc["email"], name, took)
                    self.busy_with = None

        try:
            return await self.hass.async_add_executor_job(run)
        except MailError:
            raise
        except Exception as err:  # noqa: BLE001
            raise MailError("imap", friendly(err)) from err

    # ── start and stop ─────────────────────────────────────────────────────
    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return
        self.stop.clear()
        self.thread = threading.Thread(target=self._idle_loop, name=f"crow_email_{self.id}", daemon=True)
        self.thread.start()

    def shutdown(self) -> None:
        self.stop.set()   # the IDLE thread notices within a few seconds and signs out itself
        if not (self.thread and self.thread.is_alive()):
            self.idle_conn.close()
        try:
            self.cmd.close()
        except Exception:  # noqa: BLE001
            pass

    def _idle_loop(self) -> None:
        """Wait for new mail on the Inbox, for as long as Home Assistant is running."""
        backoff = 2
        first = True
        while not self.stop.is_set():
            try:
                if self.idle_conn.m is None:
                    self.idle_conn.connect()
                    self.hass.loop.call_soon_threadsafe(self._connected)
                    backoff = 2
                if first:
                    first = False
                    self._from_thread(self.async_check_new(initial=True))
                changed = self.idle_conn.idle("INBOX", IDLE_RENEW_SECONDS, self.stop)
                if self.stop.is_set():
                    break
                if changed:
                    self._from_thread(self.async_check_new())
            except Exception as err:  # noqa: BLE001 - try again after a pause, a bit longer each time
                if self.stop.is_set():
                    break
                _LOGGER.debug("Crow Messenger Email %s: IDLE stopped: %s", self.acc.get("email"), err)
                self.idle_conn.close()
                first = True   # catch up on anything that arrived while disconnected
                if backoff > 2:   # a dropped connection is reopened quietly the first time
                    self.hass.loop.call_soon_threadsafe(self.set_error, friendly(err))
                self.stop.wait(backoff)
                backoff = min(backoff * 3, 600)
        self.idle_conn.close()

    def _from_thread(self, coro) -> None:
        """Run a check from the IDLE thread, and log it if it fails (otherwise a failure would be silent,
        and new email would arrive with no notification and nothing in the log)."""
        fut = asyncio.run_coroutine_threadsafe(coro, self.hass.loop)

        def done(f) -> None:
            if f.cancelled():
                return
            err = f.exception()
            if err is not None:
                _LOGGER.error("Crow Messenger Email (%s): checking for new email failed", self.acc.get("email"),
                              exc_info=(type(err), err, err.__traceback__))
        fut.add_done_callback(done)

    @callback
    def _connected(self) -> None:
        self.stats["connected"] = True
        self.stats["error"] = ""
        self.publish()

    @callback
    def set_error(self, msg: str) -> None:
        self.stats["connected"] = False
        self.stats["error"] = msg
        self.publish()

    @callback
    def publish(self) -> None:
        async_dispatcher_send(self.hass, f"{SIGNAL_ACCOUNT_UPDATED}_{self.id}")
        self.mailer.send_to(self.acc["owner"], {"type": "counts", "account": self.id, "stats": self.public_stats()})

    def public_stats(self) -> dict:
        s = dict(self.stats)
        s["scheduled"] = len([x for x in self.mailer.data["scheduled"] if x["account"] == self.id and not x.get("undo")])
        return s

    # ── folders ────────────────────────────────────────────────────────────
    async def async_folders(self, force: bool = False, counts: bool = True) -> list[dict]:
        if force or not self.folders or time.time() - self.folders_at > 300:
            self.folders = await self.job(self.cmd.folders)
            self.folders_at = time.time()
        if counts:
            def unseen():
                out = {}
                for f in self.folders:
                    try:
                        out[f["path"]] = self.cmd.status(f["path"], "(UNSEEN MESSAGES)")
                    except Exception:  # noqa: BLE001
                        pass
                return out
            st = await self.job(unseen)
            for f in self.folders:
                f["unseen"] = st.get(f["path"], {}).get("unseen", 0)
                f["total"] = st.get(f["path"], {}).get("messages", 0)
        return self.folders

    def special(self, kind: str) -> str | None:
        if kind == "inbox":
            return "INBOX"
        f = next((f for f in self.folders if f.get("special") == kind), None)
        return f["path"] if f else None

    async def async_special(self, kind: str, create: str | None = None) -> str | None:
        if not self.folders:
            await self.async_folders(counts=False)
        path = self.special(kind)
        if path is None and create:
            path = await self.job(self.cmd.create_folder, create)
            await self.async_folders(force=True, counts=False)
        return path

    # ── reading ────────────────────────────────────────────────────────────
    def _criteria(self, filt: str) -> list[str]:
        if filt == "unread":
            return ["UNSEEN"]
        if filt == "flagged":
            return ["FLAGGED"]
        if filt == "attachments":
            return ["ALL"]
        if filt == "vip":
            return self.mailer.vip_criteria(self.acc["owner"])
        if filt == "today":
            return ["SINCE", datetime.now().strftime("%d-%b-%Y")]
        return ["ALL"]

    async def async_page(self, path: str, offset: int, limit: int, filt: str = "all") -> dict:
        prev = self.previews.setdefault(path, {})

        crit = self._criteria(filt)
        if not crit:
            return {"items": [], "total": 0}

        def run():
            if offset == 0:
                self.cmd.selected = None   # open the folder afresh, so the list is up to date
            uids = self.cmd.search(path, *crit)
            page = uids[offset:offset + limit]
            items = self.cmd.headers(path, page, prev)
            if filt == "attachments":
                items = [i for i in items if i["attachments"]]
            return {"items": items, "total": len(uids), "validity": self.cmd.uidvalidity()}

        res = await self.job(run)
        if len(prev) > 5000:
            for k in list(prev)[:2000]:
                prev.pop(k, None)
        for it in res["items"]:
            it["account"], it["folder"] = self.id, path
        return res

    async def async_changes(self, path: str, validity: int, since: int, uids: list[int], filt: str = "all") -> dict:
        """What's changed in a folder since the card last looked: new email, flags, and email that's gone."""
        prev = self.previews.setdefault(path, {})
        crit = self._criteria(filt) or ["ALL"]

        def run():
            self.cmd.selected = None
            self.cmd.select(path)
            now_validity = self.cmd.uidvalidity()
            if validity and now_validity and now_validity != validity:
                return {"reset": True, "validity": now_validity}
            matching = self.cmd.search(path, *crit)
            total = len(matching)
            newer = [u for u in matching if u > since][:60]
            new = self.cmd.headers(path, sorted(newer, reverse=True), prev) if newer else []
            if filt == "attachments":
                new = [i for i in new if i["attachments"]]
            flags = self.cmd.flags(path, uids) if uids else {}
            still = set(matching)
            gone = [u for u in uids if u not in flags or u not in still]
            return {"reset": False, "validity": now_validity, "new": new, "total": total,
                    "flags": {str(u): f for u, f in flags.items() if u in still}, "gone": gone}

        res = await self.job(run)
        for it in res.get("new") or []:
            it["account"], it["folder"] = self.id, path
        return res

    async def async_search(self, path: str, query: str) -> list[dict]:
        prev = self.previews.setdefault(path, {})

        def run():
            uids = self.cmd.search_text(path, query)[:MAX_SEARCH_RESULTS]
            return self.cmd.headers(path, uids[:60], prev)

        items = await self.job(run)
        for it in items:
            it["account"], it["folder"] = self.id, path
        return items

    async def async_raw(self, path: str, uid: int) -> bytes:
        key = (path, uid)
        if key in self.raw_cache:
            self.raw_cache.move_to_end(key)
            return self.raw_cache[key]
        raw = await self.job(self.cmd.fetch_raw, path, uid)
        self.raw_cache[key] = raw
        while sum(len(v) for v in self.raw_cache.values()) > 60_000_000 or len(self.raw_cache) > 40:
            self.raw_cache.popitem(last=False)
        return raw

    async def async_message(self, path: str, uid: int, remote: bool | None, mark_seen: bool = True,
                            ads: str | None = None) -> dict:
        """remote: load pictures from the web (None: as the person's image settings say).
        ads: "off", "networks" or "sponsored" (None: as the person's Block Ads setting says)."""
        raw = await self.async_raw(path, uid)
        try:
            msg = await self.hass.async_add_executor_job(parse_message, raw)
        except Exception:  # noqa: BLE001 - an email laid out in a way the reader can't follow: show it plainly
            _LOGGER.exception("Crow Messenger Email couldn't read the layout of email %s in %s; showing it as plain text", uid, path)
            msg = await self.hass.async_add_executor_job(_plain_fallback, raw)
        prefs = self.mailer.images_for(self.acc["owner"])
        reason = None
        if remote is None:
            reason = self.mailer.images_reason(self.acc["owner"], (msg.get("from") or [{}])[0].get("email", ""))
            remote = reason is not None
        proxy = self.mailer.proxied_url if prefs.get("proxy") else None
        cids = {a["cid"]: a for a in msg["attachments"] if a.get("cid")}

        def cid_url(cid: str):
            a = cids.get(cid)
            return self.mailer.signed_url(self.id, path, uid, a["part"]) if a else None

        from .spam import scam_signals
        try:
            scam = scam_signals(msg, msg.get("html"))
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: the scam check failed on email %s", uid)
            scam = {"reasons": [], "check": False}
        frm_email = ((msg.get("from") or [{}])[0].get("email") or "").lower()
        if not scam["reasons"] and (self.mailer.is_vip(self.acc["owner"], frm_email) or self.mailer.book.has_email(self.acc["owner"], frm_email)):
            scam["check"] = False   # urgent words from someone you know aren't worth an AI check
        msg["scam"] = scam
        # Block Ads: as the person chose, unless ads are allowed from this sender (or Show was tapped)
        ads_setting = prefs.get("ads", "networks")
        ads_reason = None
        if ads is not None:
            ads_mode = ads
            if ads == "off" and ads_setting != "off":
                ads_reason = "shown"
        elif ads_setting != "off" and frm_email and frm_email in prefs.get("ad_senders", []):
            ads_mode, ads_reason = "off", "sender"
        else:
            ads_mode = ads_setting
        ads_found = sponsored = 0
        trackers = 0
        safe = None
        if msg["html"]:
            try:
                res = await self.hass.async_add_executor_job(
                    sanitise_email_html, msg["html"], cid_url, remote, proxy, prefs.get("trackers", True), ads_mode)
                safe, blocked, trackers = res["html"], res["blocked"], res["trackers"]
                ads_found, sponsored = res.get("ads", 0), res.get("sponsored", 0)
            except Exception:  # noqa: BLE001 - HTML that can't be made safe: show the text version instead
                _LOGGER.exception("Crow Messenger Email couldn't make email %s safe to show; showing its text", uid)
        if safe is None:
            safe, blocked = text_to_html(msg.get("text") or ""), 0
        for a in msg["attachments"]:
            a["url"] = self.mailer.signed_url(self.id, path, uid, a["part"])
            a["download"] = self.mailer.signed_url(self.id, path, uid, a["part"], download=True)
        msg.pop("html", None)
        owner = self.acc["owner"]
        ex = self.mailer.extras
        # the extras (an invitation, a poll, a read receipt, pinning): one going wrong never stops the email opening
        cal = next((x for x in msg["attachments"] if str(x.get("mime", "")).split(";")[0].strip().lower() == "text/calendar"), None)
        if cal:
            try:
                from .extras import parse_ics
                from .mailparse import find_part
                got = await self.hass.async_add_executor_job(find_part, raw, cal["part"])
                if got:
                    body = got[0] if isinstance(got[0], str) else bytes(got[0]).decode("utf-8", "replace")
                    invite = parse_ics(body, self.hass.config.time_zone)
                    if invite:
                        me = self.acc["email"].lower()
                        mine = next((x for x in invite["attendees"] if x["email"] == me), None)
                        invite["my_status"] = mine["status"] if mine else ""
                        invite["replied"] = ex.data["receipts"].get(f"rsvp:{invite['uid']}")
                        msg["invite"] = invite
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Crow Messenger Email couldn't read the calendar invitation in email %s", uid)
        try:
            if msg.get("message_id"):
                poll = ex.poll_for_message(msg["message_id"], owner)
                if poll:
                    msg["poll"] = poll
            if msg.get("receipt_to"):
                msg["receipt_sent"] = ex.receipt_done(msg.get("message_id") or f"{self.id}:{path}:{uid}")
                if str(msg["receipt_to"]).lower() == self.acc["email"].lower():
                    msg["receipt_to"] = ""
            msg["pinned"] = any(x["account"] == self.id and x["folder"] == path and x["uid"] == uid for x in ex.pins_for(owner))
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: extras failed on email %s", uid)
        msg.update({"ads": ads_found, "sponsored": sponsored, "ads_mode": ads_mode, "ads_setting": ads_setting,
                    "ads_reason": ads_reason})
        try:
            msg["muted"] = bool(self.mailer.features.muted_entry(self.acc["owner"], msg))
        except Exception:  # noqa: BLE001
            msg["muted"] = False
        msg.update({"html_safe": safe, "blocked": blocked, "trackers": trackers, "remote": bool(remote),
                    "images_reason": reason, "uid": uid, "folder": path, "account": self.id})
        if mark_seen:
            try:
                await self.job(self.cmd.set_flag, path, [uid], "\\Seen", True)
                self.mailer.hass.async_create_task(self.async_counts())
            except MailError:
                pass
        try:
            self.mailer.note_people(self.acc["owner"], msg.get("from", []), 1)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: couldn't note the sender of email %s", uid)
        return msg

    async def async_part(self, path: str, uid: int, part: int) -> tuple[bytes, str, str] | None:
        raw = await self.async_raw(path, uid)
        return await self.hass.async_add_executor_job(find_part, raw, part)

    # ── changing ───────────────────────────────────────────────────────────
    async def async_flag(self, path: str, uids: list[int], flag: str, on: bool) -> None:
        name = {"seen": "\\Seen", "flagged": "\\Flagged", "answered": "\\Answered", "forwarded": "$Forwarded"}.get(flag)
        if not name:
            raise MailError("invalid", "Unknown flag")
        await self.job(self.cmd.set_flag, path, uids, name, on)
        self.hass.async_create_task(self.async_counts())
        if flag == "seen" and on and path == "INBOX":
            self.hass.async_create_task(self.mailer.badge.async_clear(self, uids))

    async def async_move(self, path: str, uids: list[int], dest: str, record: list | None = None) -> None:
        """Move emails. With record, notes where they went so the move can be undone."""
        if dest == path or not uids:
            return
        mids: dict[int, str] = {}
        if record is not None and "UIDPLUS" not in self.cmd.caps and len(uids) <= UNDO_FIND_MAX:
            # the server won't say where they went: remember each email's Message-ID to find it again
            mids = await self.job(self.cmd.message_ids, path, uids)
        moved = await self.job(self.cmd.move, path, uids, dest)
        for u in uids:
            self.raw_cache.pop((path, u), None)
        self.hass.async_create_task(self.async_counts())
        if record is not None:
            if moved:
                record.append({"account": self.id, "src": path, "dest": dest, "uids": [moved[u] for u in uids if u in moved], "mids": []})
            elif mids:
                record.append({"account": self.id, "src": path, "dest": dest, "uids": [], "mids": list(mids.values())})

    async def async_undo_move(self, step: dict) -> int:
        """Put emails back where they were before a move (from a note made by async_move)."""
        dest, src = step["dest"], step["src"]
        uids = list(step.get("uids") or [])
        if not uids and step.get("mids"):
            def find():
                self.cmd.selected = None
                found = []
                for mid in step["mids"]:
                    u = self.cmd.find_message_id(dest, mid)
                    if u:
                        found.append(u)
                return found
            uids = await self.job(find)
        if not uids:
            return 0
        await self.async_move(dest, uids, src)
        return len(uids)

    async def async_select_all(self, path: str, filt: str = "all") -> dict:
        """Select All: how many emails there are, and the newest (so email that arrives afterwards isn't included)."""
        crit = self._criteria(filt)
        if not crit:
            return {"total": 0, "upto": 0}

        def run():
            self.cmd.selected = None
            uids = self.cmd.search(path, *crit)
            return {"total": len(uids), "upto": max(uids) if uids else 0}
        return await self.job(run)

    async def async_all_uids(self, path: str, filt: str, upto: int, skip: set[int]) -> list[int]:
        """Every email in a folder (matching the filter) up to the newest one Select All saw, less those left out."""
        crit = self._criteria(filt)
        if not crit or upto <= 0:
            return []

        def run():
            self.cmd.selected = None
            return self.cmd.search(path, *crit)
        uids = await self.job(run)
        return sorted(u for u in uids if u <= upto and u not in skip)

    async def async_archive(self, path: str, uids: list[int], record: list | None = None) -> str:
        dest = await self.async_special("archive", create="Archive")
        if not dest or dest == path:
            raise MailError("invalid", "There's nowhere to archive to from here.")
        await self.async_move(path, uids, dest, record)
        return dest

    async def async_delete(self, path: str, uids: list[int], record: list | None = None) -> str:
        trash = await self.async_special("trash")
        if trash and path != trash:
            await self.async_move(path, uids, trash, record)
            return "moved"
        await self.job(self.cmd.expunge, path, uids)
        self.hass.async_create_task(self.async_counts())
        return "deleted"

    async def async_empty(self, path: str) -> dict:
        """Delete All Spam / Empty Trash: everything in Junk (Spam) or Trash, for good.
        It carries on in the background (so leaving the screen doesn't stop it) and tells the
        card how it's going; this answers straight away with how many there are."""
        if path not in {p for p in (await self.async_special("junk"), await self.async_special("trash")) if p}:
            raise MailError("invalid", "Only Junk (or Spam) and Trash can be emptied.")
        if path in self.emptying:   # already on its way
            return dict(self.emptying[path])
        uids = await self.job(self.cmd.search, path, "ALL")
        if not uids:
            return {"account": self.id, "folder": path, "total": 0, "done": 0, "state": "done", "count": 0}
        st = {"account": self.id, "folder": path, "total": len(uids), "done": 0, "state": "working"}
        self.emptying[path] = st
        self._send_emptying(st)
        self.hass.async_create_background_task(self._async_run_empty(path, sorted(uids), st), f"crow_email empty {path}")
        return dict(st)

    def _send_emptying(self, st: dict) -> None:
        self.mailer.send_to(self.acc["owner"], {"type": "emptying", **st})

    async def _async_run_empty(self, path: str, uids: list[int], st: dict) -> None:
        gone: list[int] = []
        started = time.monotonic()
        try:
            # every email is marked in one go (runs of UIDs as ranges), then removed: in steps of 1,000
            # on a big folder, so the card can show how far it's got
            await self.job(self.cmd.flag_deleted, path, uids, True)
            for i in range(0, len(uids), 1000):
                part = uids[i:i + 1000]
                if await self.job(self.cmd.expunge_flagged, path, part):
                    gone = list(uids)   # the server removed everything at once
                    break
                gone += part
                st["done"] = len(gone)
                if st["done"] < st["total"]:
                    self._send_emptying(st)
            st.update(done=len(gone), state="done", count=len(gone))
            _LOGGER.debug("Crow Messenger Email: emptied %s (%s emails) in %.1fs", path, len(gone), time.monotonic() - started)
        except Exception as err:  # noqa: BLE001 - say so, and put back what's still there
            _LOGGER.warning("Crow Messenger Email: emptying %s stopped after %s of %s: %s", path, len(gone), len(uids), err)
            done = set(gone)
            left = [u for u in uids if u not in done]
            try:
                await self.job(self.cmd.flag_deleted, path, left, False)   # not left looking deleted
            except Exception:  # noqa: BLE001
                pass
            msg = str(err) if isinstance(err, MailError) else ""
            st.update(done=len(gone), state="failed", count=len(gone),
                      error=msg or f"{self.acc.get('name') or 'The email server'} stopped responding. Try again.")
        finally:
            self.emptying.pop(path, None)
            if gone:
                try:
                    self.mailer.smart.drop_parcels(self, path, gone)   # parcels from those emails go too
                    self.mailer.orders.drop(self, path, gone)
                    self.mailer.finds.drop(self, path, gone)
                    self.mailer.aix.drop(self, path, gone)
                except Exception:  # noqa: BLE001
                    _LOGGER.exception("Crow Messenger Email: couldn't tidy parcels after emptying %s", path)
            self._send_emptying(st)
            self.hass.async_create_task(self.async_counts())

    async def async_find(self, path: str, message_id: str) -> int | None:
        return await self.job(self.cmd.find_message_id, path, message_id)

    # ── new mail ───────────────────────────────────────────────────────────
    async def async_check_new(self, initial: bool = False) -> None:
        """Look for mail that's arrived since last time: events, rules, notifications."""
        async with self.checking:
            st = self.mailer.data["state"].setdefault(self.id, {})
            prev = self.previews.setdefault("INBOX", {})

            def run():
                self.cmd.selected = None
                self.cmd.select("INBOX")
                validity = self.cmd.uidvalidity()
                last = st.get("last_uid")
                if last is None or st.get("uidvalidity") != validity:
                    return validity, self.cmd.max_uid("INBOX"), []
                uids = self.cmd.uids_after("INBOX", last)[-50:]
                items = self.cmd.headers("INBOX", uids, prev)
                return validity, max([last, *uids]), items

            try:
                validity, last, items = await self.job(run)
            except MailError as err:
                self.set_error(str(err))
                return
            st["uidvalidity"], st["last_uid"] = validity, last
            self.stats["connected"], self.stats["error"] = True, ""
            self.stats["last_sync"] = dt_util.utcnow().isoformat()
            self.mailer.save()
            fresh = sorted(items, key=lambda i: i["uid"])
            self.pending = 0   # new email not counted yet, for the badge on its notification
            for it in fresh:
                it["account"], it["folder"] = self.id, "INBOX"
                try:
                    await self.mailer.async_new_mail(self, it)
                except Exception:  # noqa: BLE001 - one email going wrong mustn't stop the rest (or their notifications)
                    _LOGGER.exception("Crow Messenger Email (%s): couldn't handle new email %s", self.acc.get("email"), it.get("uid"))
            # (blocked, muted and screened email left the Inbox: it isn't news)
            fresh = [i for i in fresh if not i.get("blocked") and not i.get("screened")]
            if fresh:
                self.stats["latest"] = self._latest(fresh[-1])
                owner = self.acc["owner"]
                vips = [i for i in fresh if self.mailer.is_vip(owner, ((i.get("from") or [{}])[0] or {}).get("email", ""))]
                if vips:
                    self.stats["latest_vip"] = self._latest(vips[-1])
                    self.vip_looked = True
                if any(not i["seen"] for i in fresh):
                    self.stats["new_mail"] = True
                self.mailer.send_to(self.acc["owner"], {"type": "mail", "account": self.id, "folder": "INBOX",
                                                        "items": fresh})
        await self.async_counts()

    def _latest(self, it: dict) -> dict:
        share = self.acc.get("share_details", True)
        frm = (it.get("from") or [{}])[0]
        return {
            "subject": it.get("subject") if share else "New email",
            "from_name": (frm.get("name") or frm.get("email")) if share else "",
            "from_email": frm.get("email") if share else "",
            "date": it.get("date"),
            "attachments": it.get("attachments"),
            "attachment_names": it.get("attachment_names", []) if share else [],
            "preview": it.get("preview") if self.acc.get("share_preview") else "",
            "vip": self.mailer.is_vip(self.acc["owner"], frm.get("email", "")),
        }

    async def async_counts(self) -> None:
        """Unread, VIP, flagged, drafts, today's mail and storage, for the sensors."""
        from .features import SCREENER_FOLDER
        from .kinds import GROUPS, sender_kind
        owner = self.acc["owner"]
        vip = self.mailer.vip_criteria(owner)
        drafts = await self.async_special("drafts")
        junk = await self.async_special("junk")
        screener_path = None
        if self.mailer.features.screener_for(owner)["on"]:
            try:
                folders = await self.async_folders(counts=False)
                screener_path = next((f["path"] for f in folders if f.get("name", "").lower() == SCREENER_FOLDER.lower()), None)
            except (ImapError, MailError):
                pass
        validity = self.mailer.data["state"].get(self.id, {}).get("uidvalidity")
        if validity != self.kind_validity:
            self.kind_cache, self.kind_validity = {}, validity
        kinds = self.kind_cache
        # emails added to Council and Local count in that group, whoever sent them
        council = {int(o.get("uid") or 0) for o in self.mailer.finds.items("council", self.id) if (o.get("folder") or "INBOX") == "INBOX"}
        look_vip = bool(vip) and not self.vip_looked

        def groups(unseen: list[int]) -> dict:
            """Unread in each Inbox group, reading only senders not seen before (the newest UNREAD_GROUP_MAX)."""
            mine = unseen[:UNREAD_GROUP_MAX]
            todo = [u for u in mine if u not in kinds]
            if todo:
                for h in self.cmd.light_headers("INBOX", todo, "FROM SUBJECT"):
                    kinds[h["uid"]] = sender_kind(h)
            res = {g: 0 for g in GROUPS}
            for u in mine:
                k = "council" if u in council else kinds.get(u)
                if k in res:
                    res[k] += 1
            res["not_counted"] = max(0, len(unseen) - len(mine))
            return res

        def screener() -> dict | None:
            uids = self.cmd.search(screener_path, "ALL")
            key = tuple(uids[:300])
            if key != self.screener_seen:
                who: dict[str, dict] = {}
                for h in self.cmd.light_headers(screener_path, list(key), "FROM SUBJECT DATE"):
                    frm = (h.get("from") or [{}])[0] or {}
                    e = (frm.get("email") or "").lower()
                    if not e:
                        continue
                    g = who.setdefault(e, {"name": frm.get("name") or "", "email": e, "emails": 0, "latest": 0, "subject": ""})
                    g["emails"] += 1
                    if (h.get("date") or 0) >= g["latest"]:
                        g["latest"], g["subject"] = h.get("date") or 0, h.get("subject") or ""
                self.screener_seen = key
                self.screener_senders = sorted(who.values(), key=lambda g: g["latest"], reverse=True)
            return {"emails": len(uids), "senders": len(self.screener_senders), "waiting": self.screener_senders[:10]}

        def run():
            out: dict[str, Any] = {}
            # (counted in the open Inbox: some servers' STATUS answers are out of date for an open folder)
            self.cmd.selected = None
            unseen = self.cmd.search("INBOX", "UNSEEN")
            out["unread"] = len(unseen)
            try:
                out["unread_groups"] = groups(unseen)
            except (ImapError, MailError) as err:
                _LOGGER.debug("Crow Messenger Email couldn't sort unread email into groups: %s", err)
            if screener_path:
                try:
                    out["screener"] = screener()
                except (ImapError, MailError) as err:
                    _LOGGER.debug("Crow Messenger Email couldn't count the Screener: %s", err)
            else:
                out["screener"] = None
            if look_vip:
                newest = self.cmd.search("INBOX", *vip)[:1]
                out["_vip"] = (self.cmd.headers("INBOX", newest, {}) or [None])[0] if newest else None
            out["unread_notified"] = len(set(unseen) & set(self.mailer.badge.notified(self.id)))
            out["_unseen"] = unseen
            out["unread_vip"] = len(self.cmd.search("INBOX", "UNSEEN", *vip)) if vip else 0
            out["flagged"] = len(self.cmd.search("INBOX", "FLAGGED"))
            out["received_today"] = len(self.cmd.search("INBOX", "SINCE", datetime.now().strftime("%d-%b-%Y")))
            out["drafts"] = self.cmd.status(drafts, "(MESSAGES)").get("messages", 0) if drafts else 0
            out["junk"] = self.cmd.status(junk, "(MESSAGES UNSEEN)") if junk else None
            q = self.cmd.quota()
            out["storage"] = {**q, "percent": round(q["used"] * 100 / q["total"], 1)} if q else None
            return out

        try:
            res = await self.job(run)
        except MailError as err:
            self.set_error(str(err))
            return
        unseen = set(res.pop("_unseen", None) or [])
        if look_vip:
            vip_item = res.pop("_vip", None)
            self.stats["latest_vip"] = self._latest(vip_item) if vip_item else None
            self.vip_looked = True
        elif not vip:
            self.stats["latest_vip"] = None
        for u in [u for u in kinds if u not in unseen]:   # read (or gone) since: no need to remember its group
            del kinds[u]
        self.stats.update(res)
        # notifications for email that's been read (or moved away) since - here or in another mail app
        gone = [u for u in self.mailer.badge.notified(self.id) if u not in unseen]
        if gone:
            self.hass.async_create_task(self.mailer.badge.async_clear(self, gone))
        self.stats["connected"], self.stats["error"] = True, ""
        self.stats["last_sync"] = dt_util.utcnow().isoformat()
        if self.stats["latest"] is None and res["unread"] is not None:
            try:
                page = await self.async_page("INBOX", 0, 1)
                if page["items"]:
                    self.stats["latest"] = self._latest(page["items"][0])
            except MailError:
                pass
        if not res["unread"]:
            self.stats["new_mail"] = False
        self.publish()
        self.mailer.badge.changed(self.acc["owner"])


def _sounds() -> dict:
    from .notifyplus import SOUNDS
    return SOUNDS


# ── everyone's accounts ──────────────────────────────────────────────────────


class Mailer:
    def __init__(self, hass: HomeAssistant, messenger) -> None:
        self.hass = hass
        # Crow Messenger, which Email is part of: its contacts book, its badge and its dashboards
        self.messenger = messenger
        self.store = Store(hass, STORAGE_VERSION, STORAGE_KEY, private=True, atomic_writes=True)
        self.data: dict[str, Any] = {}
        self.accounts: dict[str, Account] = {}
        self.subs: dict[str, list[Callable]] = {}
        self.timers: dict[str, Callable] = {}
        self.ms_flows: dict[str, dict] = {}
        self.uploads: dict[str, dict] = {}
        self.upload_dir = hass.config.path("crow_messenger_email_uploads")
        self._save_handle = None

    @property
    def settings(self) -> dict:
        return self.data["settings"]

    async def async_load(self) -> None:
        stored = await self.store.async_load() or {}
        settings = {**DEFAULT_SETTINGS, **(stored.get("settings") or {})}
        settings["ai"] = {**DEFAULT_SETTINGS["ai"], **(settings.get("ai") or {})}
        settings["ai"]["features"] = {**DEFAULT_SETTINGS["ai"]["features"], **(settings["ai"].get("features") or {})}
        self.data = {
            **stored,
            "settings": settings,
            "accounts": stored.get("accounts") or {},
            "vips": stored.get("vips") or {},
            "rules": stored.get("rules") or {},
            "scheduled": stored.get("scheduled") or [],
            "reminders": stored.get("reminders") or [],
            "recent": stored.get("recent") or {},
            "here": stored.get("here") or {},
            "prefs": stored.get("prefs") or {},
            "state": stored.get("state") or {},
            "secret": stored.get("secret") or secrets.token_hex(32),
        }
        from .people import People
        self.book = People(self.hass, self)
        await self.book.async_load()
        from .smart import Smart
        self.smart = Smart(self)
        from .spam import Spam
        self.spam = Spam(self)
        from .badge import Badge
        self.badge = Badge(self)
        from .extras import Extras
        self.extras = Extras(self)
        from .rules import Rules
        self.rules_engine = Rules(self)
        from .features import Features
        self.features = Features(self)
        from .aiextras import AiExtras
        self.aix = AiExtras(self)
        from .orders import Orders
        self.orders = Orders(self)
        from .finds import Finds
        self.finds = Finds(self)
        await self.hass.async_add_executor_job(os.makedirs, self.upload_dir, 0o700, True)
        # files waiting to go with a Send Later email
        for item in self.data["scheduled"]:
            for att in item["payload"].get("attachments") or []:
                f = att.get("file") or {}
                if att.get("upload") and f.get("path", "").startswith(self.upload_dir):
                    self.uploads[att["upload"]] = {"id": att["upload"], "owner": item["uid"], "at": time.time(), **f}
        self.save()

    def save(self) -> None:
        """Saved a moment later, so a burst of changes is written once."""
        self.store.async_delay_save(lambda: self.data, 2)

    async def async_start(self) -> None:
        for acc in self.data["accounts"].values():
            self._run(acc)
        for item in self.data["scheduled"]:
            self._arm_send(item)
        for r in self.data["reminders"]:
            if not r.get("fired"):
                self._arm_reminder(r)
        self.features.start()
        self.aix.start()
        from datetime import timedelta
        from homeassistant.helpers.event import async_track_time_interval
        self.timers["tick"] = async_track_time_interval(self.hass, self.async_tick, timedelta(seconds=COUNTS_SECONDS))

    def _run(self, acc: dict) -> Account:
        a = Account(self, acc)
        self.accounts[acc["id"]] = a
        a.start()
        return a

    async def async_tick(self, _now=None) -> None:
        """Every few minutes: fresh counts for the sensors, and a check for missed mail."""
        for a in list(self.accounts.values()):
            self.hass.async_create_task(a.async_check_new())
        await self.async_tidy_uploads()
        self.smart.tick()
        self.spam.tick()
        try:
            await self.aix.async_tick()
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: appointments and bills tidy-up failed")

    @callback
    def inbox_viewed(self, uid: str, account_id: str | None) -> None:
        """The card's showing the Inbox: the New Mail sensor goes off."""
        for a in self.accounts.values():
            if a.acc["owner"] == uid and (account_id in (None, a.id)) and a.stats.get("new_mail"):
                a.stats["new_mail"] = False
                a.publish()

    async def async_stop(self) -> None:
        for a in self.accounts.values():
            a.shutdown()
        for a in self.accounts.values():
            if a.thread:
                await self.hass.async_add_executor_job(a.thread.join, 8)
        for unsub in self.timers.values():
            unsub()
        self.timers.clear()
        self.badge.unload()
        self.extras.unload()
        await self.store.async_save(self.data)

    # ── talking to the card ────────────────────────────────────────────────
    @callback
    def subscribe(self, uid: str, send: Callable) -> Callable:
        self.subs.setdefault(uid, []).append(send)

        def unsub():
            if send in self.subs.get(uid, []):
                self.subs[uid].remove(send)
        return unsub

    @callback
    def send_to_all(self, payload: dict) -> None:
        for uid in list(self.subs):
            self.send_to(uid, payload)

    @callback
    def send_to(self, uid: str, payload: dict) -> None:
        for send in list(self.subs.get(uid, [])):
            try:
                send(payload)
            except Exception:  # noqa: BLE001 - a closed connection
                pass

    # ── accounts ───────────────────────────────────────────────────────────
    def account(self, uid: str | None, account_id: str) -> Account:
        """One of this person's accounts (uid None: automations, which may use any)."""
        a = self.accounts.get(account_id)
        if a is None:
            # automations can name an account by its email address too
            a = next((x for x in self.accounts.values() if x.acc["email"].lower() == str(account_id).lower()), None)
        if a is None or (uid is not None and a.acc["owner"] != uid):
            raise MailError("not_found", "That email account isn't set up.")
        return a

    def accounts_for(self, uid: str) -> list[dict]:
        return [self.public_account(a.acc) for a in self.accounts.values() if a.acc["owner"] == uid]

    def public_account(self, acc: dict) -> dict:
        out = {k: v for k, v in acc.items() if k not in ("password", "ms")}
        out["signed_in"] = bool(acc.get("password") or (acc.get("ms") or {}).get("refresh_token"))
        rt = self.accounts.get(acc["id"])
        out["stats"] = rt.public_stats() if rt else {}
        return out

    def _account_from(self, uid: str, d: dict, old: dict | None) -> dict:
        provider = d.get("provider") or (old or {}).get("provider") or "other"
        if provider not in PROVIDERS:
            raise MailError("invalid", "Unknown email provider")
        preset = PROVIDERS[provider]
        email_addr = _clean(d.get("email") or (old or {}).get("email"), 254).lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_addr):
            raise MailError("invalid", "Enter a valid email address.")

        def server(kind: str) -> dict:
            src = d.get(kind) or (old or {}).get(kind) or preset[kind]
            if provider != "other":
                src = preset[kind]
            host = _clean(src.get("host"), 255)
            if not host:
                raise MailError("invalid", f"Enter the {kind.upper()} server.")
            sec = src.get("security") if src.get("security") in ("ssl", "starttls", "none") else preset[kind]["security"]
            try:
                port = int(src.get("port") or preset[kind]["port"])
            except (TypeError, ValueError) as err:
                raise MailError("invalid", "The port must be a number.") from err
            return {"host": host, "port": port, "security": sec}

        acc = dict(old or {})
        acc.update({
            "id": (old or {}).get("id") or new_id(),
            "owner": uid,
            "provider": provider,
            "auth": preset["auth"],
            "email": email_addr,
            "name": _clean(d.get("name"), 60) or (old or {}).get("name") or preset["name"],
            "from_name": _clean(d.get("from_name") if "from_name" in d else (old or {}).get("from_name"), 120),
            "username": _clean(d.get("username"), 254) or (old or {}).get("username") or email_addr,
            "imap": server("imap"),
            "smtp": server("smtp"),
            "sent_copy": bool(d.get("sent_copy", (old or {}).get("sent_copy", preset["sent_copy"]))),
            "signature": _clean(d.get("signature") if "signature" in d else (old or {}).get("signature", "Sent from Home Assistant"), 2000),
            "notify": d.get("notify") if d.get("notify") in NOTIFY_CHOICES else (old or {}).get("notify", "all"),
            "devices": ([str(x) for x in d["devices"]][:20] if isinstance(d["devices"], list) else None) if "devices" in d else (old or {}).get("devices"),
            "share_details": bool(d.get("share_details", (old or {}).get("share_details", True))),
            "share_preview": bool(d.get("share_preview", (old or {}).get("share_preview", False))),
            # Ask Your Email: let Assist on shared voice speakers (where no one's signed in) read this account
            "assist_voice": bool(d.get("assist_voice", (old or {}).get("assist_voice", False))),
            "color": _clean(d.get("color") or (old or {}).get("color") or "#0A84FF", 20),
            # the notification sound for this account on iPhone and iPad
            "sound": d.get("sound") if d.get("sound") in _sounds() else (old or {}).get("sound", "default"),
            # My Card: a signature with your name, photo and details
            "sig_card": _sig_card(d["sig_card"]) if isinstance(d.get("sig_card"), dict) else (old or {}).get("sig_card"),
        })
        if preset["auth"] == "password" and d.get("password"):
            acc["password"] = str(d["password"])
        if preset["auth"] == "microsoft" and d.get("ms"):
            acc["ms"] = d["ms"]   # from take_ms_tokens: never from the card
        if preset["auth"] == "microsoft":
            acc.pop("password", None)
        else:
            acc.pop("ms", None)
        return acc

    async def async_test(self, acc: dict) -> None:
        """Can we sign in to both the incoming and the outgoing server?"""
        tmp = Account(self, acc)
        try:
            await tmp.job(lambda: (tmp.cmd.connect(), tmp.cmd.folders()))
            if acc.get("auth") != "microsoft":
                await self.hass.async_add_executor_job(_smtp_login_test, acc)
        finally:
            tmp.shutdown()

    async def async_save_account(self, uid: str, d: dict) -> dict:
        old = self.data["accounts"].get(d.get("id") or "")
        if old and old["owner"] != uid:
            raise MailError("not_found", "That email account isn't set up.")
        if not old and sum(1 for a in self.data["accounts"].values() if a["owner"] == uid) >= MAX_ACCOUNTS_PER_USER:
            raise MailError("invalid", f"You can add up to {MAX_ACCOUNTS_PER_USER} accounts.")
        acc = self._account_from(uid, d, old)
        if acc["auth"] == "password" and not acc.get("password"):
            raise MailError("invalid", "Enter the password (an app password for iCloud, Gmail and Yahoo).")
        if acc["auth"] == "microsoft" and not (acc.get("ms") or {}).get("refresh_token"):
            raise MailError("invalid", "Sign in with Microsoft first.")
        reconnect = not old or any(old.get(k) != acc.get(k) for k in ("imap", "smtp", "username", "password", "email", "ms"))
        if reconnect:
            try:
                await self.async_test(acc)
            except MailError:
                raise
            except Exception as err:  # noqa: BLE001
                raise MailError("connect", friendly(err)) from err
        self.data["accounts"][acc["id"]] = acc
        self.save()
        rt = self.accounts.get(acc["id"])
        if rt and reconnect:
            rt.shutdown()
            self.accounts.pop(acc["id"], None)
            rt = None
        if rt:
            rt.acc = acc
        else:
            self._run(acc)
        async_dispatcher_send(self.hass, SIGNAL_ACCOUNTS_CHANGED)
        self.send_to(uid, {"type": "accounts", "accounts": self.accounts_for(uid)})
        return self.public_account(acc)

    async def async_delete_account(self, uid: str, account_id: str) -> None:
        a = self.account(uid, account_id)
        a.shutdown()
        if a.thread:
            await self.hass.async_add_executor_job(a.thread.join, 8)
        self.accounts.pop(a.id, None)
        self.data["accounts"].pop(a.id, None)
        self.data["rules"].pop(a.id, None)
        self.data["state"].pop(a.id, None)
        for item in [x for x in self.data["scheduled"] if x["account"] == a.id]:
            self._cancel_timer(f"send_{item['id']}")
            self.data["scheduled"].remove(item)
        for r in [x for x in self.data["reminders"] if x["account"] == a.id]:
            self._cancel_timer(f"rem_{r['id']}")
            self.data["reminders"].remove(r)
        self.save()
        async_dispatcher_send(self.hass, SIGNAL_ACCOUNTS_CHANGED, a.id)
        self.send_to(uid, {"type": "accounts", "accounts": self.accounts_for(uid)})

    # ── Microsoft sign-in ──────────────────────────────────────────────────
    async def async_ms_start(self, uid: str) -> dict:
        st = self.settings
        flow = await microsoft.start_device_code(self.hass, st.get("ms_client_id", ""), st.get("ms_tenant", "common"))
        fid = new_id()
        self.ms_flows[fid] = {**flow, "uid": uid}
        return {"flow_id": fid, "user_code": flow["user_code"], "verification_uri": flow["verification_uri"],
                "expires_at": int(flow["expires_at"] * 1000), "interval": flow["interval"]}

    async def async_ms_poll(self, uid: str, flow_id: str) -> dict:
        flow = self.ms_flows.get(flow_id)
        if not flow or flow["uid"] != uid:
            raise MailError("not_found", "That sign-in has finished. Start again.")
        if time.time() > flow["expires_at"]:
            self.ms_flows.pop(flow_id, None)
            raise MailError("expired", "The code expired before sign-in finished. Start again.")
        st = self.settings
        try:
            tok = await microsoft.poll_device_code(self.hass, st.get("ms_client_id", ""), st.get("ms_tenant", "common"),
                                                   flow["device_code"])
        except microsoft.MicrosoftError as err:
            self.ms_flows.pop(flow_id, None)
            raise MailError("microsoft", str(err)) from err
        if tok is None:
            return {"status": "waiting"}
        self.ms_flows.pop(flow_id, None)
        flow["tokens"] = tok
        # kept for the account form to finish with: the token is never sent to the card
        key = new_id()
        self.ms_flows[key] = {"uid": uid, "tokens": tok, "expires_at": time.time() + 1800, "done": True}
        return {"status": "done", "token_key": key, "email": tok["email"], "name": tok["name"]}

    def take_ms_tokens(self, uid: str, key: str) -> dict:
        f = self.ms_flows.pop(key, None)
        if not f or f.get("uid") != uid or not f.get("done"):
            raise MailError("expired", "Sign in with Microsoft again.")
        t = f["tokens"]
        return {"ms": {"access_token": t["access_token"], "refresh_token": t["refresh_token"], "expires_at": t["expires_at"]},
                "email": t["email"], "name": t["name"]}

    # ── VIPs, rules and the people you email ───────────────────────────────
    def vips(self, uid: str) -> list[dict]:
        """Your VIPs: the ones you added, and (unless you've turned it off) your Favourites in Contacts."""
        own = self.data["vips"].get(uid, [])
        if (self.data["prefs"].get(uid) or {}).get("fav_vips") is False:
            return own
        have = {v["email"] for v in own}
        out = list(own)
        try:
            contacts = self.messenger.contacts_for(uid)
        except Exception:  # noqa: BLE001
            contacts = []
        for c in contacts:
            if not c.get("favourite"):
                continue
            name = " ".join(x for x in (c.get("first"), c.get("last")) if x) or c.get("company") or ""
            for e in c.get("emails") or []:
                addr = str(e.get("value") or "").strip().lower()
                if addr and addr not in have:
                    have.add(addr)
                    out.append({"email": addr, "name": name, "favourite": True})
        return out

    def is_vip(self, uid: str, email_addr: str) -> bool:
        e = (email_addr or "").lower()
        return any(v["email"] == e for v in self.vips(uid))

    def vip_criteria(self, uid: str) -> list[str]:
        emails = [v["email"] for v in self.vips(uid)][:50]
        if not emails:
            return []
        crit = ["FROM", f'"{emails[-1]}"']
        for e in reversed(emails[:-1]):
            crit = ["OR", "FROM", f'"{e}"', *crit]
        return crit

    def set_vip(self, uid: str, email_addr: str, name: str, on: bool) -> list[dict]:
        e = _clean(email_addr, 254).lower()
        lst = [v for v in self.vips(uid) if v["email"] != e]
        if on:
            if len(lst) >= MAX_VIPS:
                raise MailError("invalid", f"You can have up to {MAX_VIPS} VIPs.")
            lst.append({"email": e, "name": _clean(name, 120)})
        self.data["vips"][uid] = lst
        self.save()
        for a in self.accounts.values():
            if a.acc["owner"] == uid:
                a.vip_looked = False   # the Latest VIP email sensor looks again, with the new VIPs
                self.hass.async_create_task(a.async_counts())
        return lst

    def rules(self, account_id: str) -> list[dict]:
        return self.rules_engine.rules(account_id)

    def save_rules(self, uid: str, account_id: str, rules: list[dict]) -> list[dict]:
        return self.rules_engine.save(self.account(uid, account_id), rules)

    def note_people(self, uid: str, people: list[dict], weight: int) -> None:
        book = self.data["recent"].setdefault(uid, {})
        for p in people or []:
            e = (p.get("email") or "").lower()
            if not e or "noreply" in e or "no-reply" in e:
                continue
            cur = book.get(e) or {"name": "", "n": 0}
            cur["name"] = p.get("name") or cur["name"]
            cur["n"] = cur.get("n", 0) + weight
            cur["last"] = now_ms()
            book[e] = cur
        if len(book) > 600:
            for e, _ in sorted(book.items(), key=lambda kv: (kv[1].get("n", 0), kv[1].get("last", 0)))[:100]:
                book.pop(e, None)
        self.save()

    # ── with the rest of Crow Messenger ─────────────────────────────────────
    async def async_contact_mail(self, uid: str, emails: list[str], limit: int = 6) -> dict:
        """The newest email from (Inbox) and to (Sent) any of these addresses, across your accounts."""
        from .imapclient import _q
        addrs = [e.strip().lower() for e in emails if e and "@" in e][:10]
        if not addrs:
            return {"items": [], "count": 0}

        def either(field: str) -> list[str]:
            crit = [field, _q(addrs[-1])]
            for e in reversed(addrs[:-1]):
                crit = ["OR", field, _q(e), *crit]
            return crit

        out: list[dict] = []
        count = 0
        for a in [x for x in self.accounts.values() if x.acc["owner"] == uid]:
            try:
                sent = await a.async_special("sent")
            except Exception:  # noqa: BLE001
                sent = None

            def run(a=a, sent=sent):
                got = []
                n = 0
                for path, field in (("INBOX", "FROM"), (sent, "TO")):
                    if not path:
                        continue
                    try:
                        uids = a.cmd.search(path, *either(field))
                    except Exception:  # noqa: BLE001 - a folder that can't be searched is left out
                        continue
                    n += len(uids)
                    for it in a.cmd.headers(path, uids[:limit], a.previews.setdefault(path, {})):
                        it["account"], it["folder"], it["sent"] = a.id, path, path != "INBOX"
                        got.append(it)
                return got, n
            try:
                items, n = await a.job(run)
            except MailError:
                continue
            out += items
            count += n
        out.sort(key=lambda i: i.get("date") or 0, reverse=True)
        keep = ("account", "folder", "uid", "subject", "from", "to", "date", "seen", "preview", "sent", "flagged")
        return {"items": [{k: i.get(k) for k in keep} for i in out[:limit]], "count": count}

    async def known_people(self, uid: str) -> list[str]:
        """For Who's This?: your contacts (names, companies, email addresses), your chats and the household."""
        lines = []
        try:
            for c in self.messenger.contacts_for(uid)[:150]:
                name = " ".join(x for x in (c.get("first"), c.get("last")) if x) or c.get("company") or ""
                bits = [name, c.get("company") or "", c.get("job_title") or "",
                        ", ".join(str(e.get("value") or "") for e in (c.get("emails") or [])[:3])]
                lines.append("Contact: " + " | ".join(b for b in bits if b))
            users = await self.messenger.async_user_map()
            lines += [f"Household member: {u.get('name')}" for k, u in users.items() if k != uid and u.get("name")]
            for t in self.messenger.threads_for(uid)[:30]:
                if t.get("is_group") and t.get("name"):
                    lines.append(f"Group chat: {t['name']}")
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger Email couldn't list people for Who's This", exc_info=True)
        return lines

    def people(self, uid: str) -> list[dict]:
        book = self.data["recent"].get(uid, {})
        lst = sorted(book.items(), key=lambda kv: (-kv[1].get("n", 0), -kv[1].get("last", 0)))[:300]
        return [{"email": e, "name": v.get("name", "")} for e, v in lst]

    # ── when new mail arrives ───────────────────────────────────────────────
    async def async_new_mail(self, a: Account, it: dict) -> None:
        # a snoozed email coming back: straight to the Inbox, with its notification (no rules, no Screener)
        back = self.features.is_returning(it)
        if not back:
            # a blocked sender: straight to Junk, with no notification and no event for new mail
            if await self.spam.async_new_mail(a, it):
                it["blocked"] = True
                return
            # a reply in a muted conversation, or someone new waiting in the Screener: no notification
            if await self.features.async_new_mail(a, it):
                it["screened"] = True
                return
            # a vote on an email with voting buttons, or an email to Home Assistant: handled, no notification
            if await self.extras.async_new_mail(a, it):
                return
        # the preview is read from just the start of each email; a newsletter's start can be all page
        # styling, leaving no words for its notification. Then the whole email is read, as Apple Mail does.
        if not notify_preview(it.get("preview") or ""):
            await self.async_fuller_preview(a, it)
        acc = a.acc
        owner = acc["owner"]
        frm = (it.get("from") or [{}])[0]
        vip = self.is_vip(owner, frm.get("email", ""))
        it["vip"] = vip
        share = acc.get("share_details", True)
        data = {
            "account": acc["email"], "account_id": a.id, "account_name": acc.get("name"),
            "folder": "INBOX", "uid": it["uid"], "message_id": it.get("message_id"),
            "from_name": (frm.get("name") or "") if share else "", "from_email": frm.get("email", "") if share else "",
            "to": [x["email"] for x in it.get("to", [])] if share else [],
            "subject": it.get("subject", "") if share else "",
            "preview": it.get("preview", "") if acc.get("share_preview") else "",
            "has_attachments": bool(it.get("attachments")),
            "attachment_names": it.get("attachment_names", []) if share else [],
            "vip": vip, "unread": not it.get("seen"),
        }
        self.hass.bus.async_fire(EVENT_RECEIVED, data)
        self.smart.replied_by(a, frm.get("email", ""))
        # the AI features that read new mail: the email's text is fetched now, before a rule can move it
        want = self.smart.wants(a)
        full = await self.smart.async_text(a, it) if want else None
        # a sign-in code (no AI): from the text if it's been read, otherwise only when the subject or preview hints at one
        try:
            from .finds import _CODE_HINT
            if full is not None:
                self.finds.note_code(a, it, full.get("text") or "")
            elif _CODE_HINT.search(f"{it.get('subject') or ''} {it.get('preview') or ''}"):
                got = await self.smart.async_text(a, it)
                self.finds.note_code(a, it, (got or {}).get("text") or "")
        except Exception:  # noqa: BLE001 - never let this stop new mail
            _LOGGER.debug("Crow Messenger Email couldn't look for a sign-in code", exc_info=True)
        if full is None:
            want = set()
        notify = acc.get("notify", "all")
        # the rules: they can move the email, and change whether (and how) you're notified
        res = await self.rules_engine.async_new_mail(a, it, data) if not back else {"notify": ""}
        quiet = False
        if res["notify"] == "all":
            notify = "all"
        elif res["notify"] == "none":
            notify = "none"
        elif res["notify"] == "quiet":
            notify, quiet = "all", True
        if notify == "smart" and "notify" not in want:
            notify = "all"   # Smart Notifications is off (or the email couldn't be read): notify as usual
        if notify == "smart" and not it.get("seen") and not vip:
            # wait for the AI to say whether it's worth a notification
            res = await self.smart.async_analyse(a, it, full, want)
            if res is None or res.get("important"):
                await self.async_notify_mail(a, it, vip, quiet)
            return
        if want:
            self.hass.async_create_task(self.smart.async_analyse(a, it, full, want))
        if it.get("seen"):
            return
        if notify in ("all", "smart") or (notify == "vip" and vip):
            await self.async_notify_mail(a, it, vip, quiet)

    # ── phone notifications ─────────────────────────────────────────────────
    def devices(self, uid: str) -> list[str]:
        from homeassistant.util import slugify
        out = []
        for entry in self.hass.config_entries.async_entries("mobile_app"):
            if entry.data.get("user_id") != uid:
                continue
            service = f"mobile_app_{slugify(entry.data.get('device_name') or entry.title or '')}"
            if self.hass.services.has_service("notify", service):
                out.append(service)
        return out

    async def async_notify(self, a: Account | None, uid: str, title: str, message: str, data) -> None:
        """data: the notification's data, or a function giving it for an iPhone/iPad (True) or Android (False)."""
        devices = self.badge.devices(uid)
        wanted = a.acc.get("devices") if a else None
        if isinstance(wanted, list) and wanted:
            devices = [(s, ios) for s, ios in devices if s in wanted]
        for service, ios in devices:
            payload = data(ios) if callable(data) else data
            text = message
            if isinstance(payload, dict) and "_message" in payload:
                # the iPhone has the subject as its subtitle, so the words are just the email's start
                payload = dict(payload)
                text = payload.pop("_message")
            try:
                await self.hass.services.async_call("notify", service, {"title": title, "message": text, "data": payload})
            except Exception as err:  # noqa: BLE001 - one phone failing mustn't stop the rest
                _LOGGER.warning("Crow Messenger Email couldn't notify %s: %s", service, err)

    def link(self, uid: str, query: str) -> str:
        """Where a notification opens: the dashboard Crow Messenger uses for this person (the card opens Email)."""
        try:
            from ..notify import dashboard_path
            path = dashboard_path(self.messenger, uid)
        except Exception:  # noqa: BLE001
            path = self.data["here"].get(uid) or "/lovelace"
        return f"{path}{'&' if '?' in path else '?'}crow_email={query}"

    async def async_fuller_preview(self, a: Account, it: dict) -> None:
        """A preview from the whole email (remembered for the list too), when its start had no words."""
        try:
            raw = await a.async_raw(it.get("folder") or "INBOX", it["uid"])
            p = await self.hass.async_add_executor_job(preview_from, raw)
        except Exception as err:  # noqa: BLE001 - a preview is a nice-to-have
            _LOGGER.debug("Crow Messenger Email couldn't read email %s for its preview: %s", it.get("uid"), err)
            return
        if p:
            it["preview"] = p
            a.previews.setdefault(it.get("folder") or "INBOX", {})[it["uid"]] = p

    async def async_notify_mail(self, a: Account, it: dict, vip: bool, quiet: bool = False) -> None:
        from . import notifyplus
        owner = a.acc["owner"]
        frm = (it.get("from") or [{}])[0]
        who = frm.get("name") or frm.get("email") or "New email"
        subject = it.get("subject") or "(No subject)"
        # like Apple Mail: the sender, then the subject (bold, on iPhone), then the start of the email as words
        # (links, "[image: …]" placeholders and "view in browser" lines left out)
        preview = notify_preview(it.get("preview") or "")
        body = subject + (f"\n{preview}" if preview else "")
        ref = f"{a.id}|INBOX|{it['uid']}"
        url = self.link(owner, f"{a.id}:INBOX:{it['uid']}")
        a.pending = getattr(a, "pending", 0) + (0 if it.get("seen") else 1)
        badge = self.badge.for_notification(owner, extra=a.pending)
        if not it.get("seen"):
            # remembered so the notification can be taken away once the email has been read
            self.badge.note_notified(a, it["uid"])
        ns = notifyplus.notif_settings(self)
        # Quiet Hours: everything but VIPs arrives silently
        quiet = quiet or (not vip and notifyplus.in_quiet(self, owner))
        # quiet while your phone's Focus (or Do Not Disturb) is on, as in Crow Messenger (VIPs still come through)
        if not quiet and not vip and (self.data["prefs"].get(owner) or {}).get("follow_focus") is not False:
            try:
                quiet = bool(self.messenger.in_focus(owner))
            except Exception:  # noqa: BLE001
                pass
        group = notifyplus.thread_key(a, it, ns["group_sender"])
        try:
            picture = await notifyplus.async_picture(self, a, it)
        except Exception as err:  # noqa: BLE001 - a picture is a nice-to-have
            _LOGGER.debug("Crow Messenger Email notification picture: %s", err)
            picture = None
        # (a rule can make it quiet too: no sound, and it doesn't light up the screen)
        push = {"thread-id": group, "interruption-level": "passive" if quiet else "time-sensitive" if vip else "active",
                "sound": "none" if quiet else notifyplus.sound_for(a)}
        if ns["group_sender"]:
            push["summary-arg"] = who   # "3 more emails from Amazon"
        if badge is not None:
            push["badge"] = badge
        name = a.acc.get("name") or a.acc.get("email") or "Email"
        base = {
            "tag": f"crow_email_{a.id}_{it['uid']}",
            "group": group,
            "url": url, "clickAction": url,
        }
        if picture:
            base["image"] = picture

        def data_for(ios: bool) -> dict:
            d = dict(base)
            if ios:
                d["push"] = dict(push)
                # the subject in bold under the sender, as Apple Mail shows it (the account too, with more than one)
                d["subtitle"] = subject if len(self.accounts_for(owner)) <= 1 else f"{subject} · {name}"
                d["_message"] = preview or " "
            else:
                # each account has its own channel, so its sound can be chosen in the phone's settings
                d["channel"] = "Crow Messenger Email (quiet)" if quiet else f"Crow Messenger Email - {name}"
                d["importance"] = "low" if quiet else "high"
            acts = notifyplus.actions(self, ref, ios)
            if acts:
                d["actions"] = acts
            return d
        await self.async_notify(a, owner, ("★ " if vip else "") + who, body, data_for)

    async def async_notification_action(self, action: str, reply_text: str | None = None, user_id: str | None = None) -> None:
        parts = action.split("|")
        if len(parts) < 5 or parts[0] != NOTIFY_ACTION_PREFIX:
            return
        _, verb, acc_id, path, uid = parts[:5]
        a = self.accounts.get(acc_id)
        # only the account's owner can use its notification buttons
        if not a or (user_id and user_id != a.acc["owner"]):
            return
        try:
            if verb == "READ":
                await a.async_flag(path, [int(uid)], "seen", True)
            elif verb == "ARCHIVE":
                await a.async_archive(path, [int(uid)])
            elif verb == "FLAG":
                await a.async_flag(path, [int(uid)], "flagged", True)
            elif verb == "DELETE":
                await a.async_delete(path, [int(uid)])
            elif verb == "REMIND":
                await self.async_remind(a.acc["owner"], a.id, path, int(uid), int(time.time() * 1000) + 3_600_000)
            elif verb == "REPLY" and (reply_text or "").strip():
                # typed straight into the notification
                m = await a.async_message(path, int(uid), False, mark_seen=True)
                to = m.get("reply_to") or m.get("from") or []
                subj = m.get("subject") or ""
                html = text_to_html(reply_text.strip())
                if a.acc.get("signature"):
                    html += "<br><br>" + text_to_html(a.acc["signature"])
                await self.async_send(a.acc["owner"], a.id, {"to": to[:1], "subject": subj if subj.lower().startswith("re:") else f"Re: {subj}",
                                                             "html": html, "reply": {"mode": "reply", "folder": path, "uid": int(uid)}})
            self.send_to(a.acc["owner"], {"type": "mail", "account": a.id, "folder": path})
        except (MailError, ValueError) as err:
            _LOGGER.warning("Crow Messenger Email notification action failed: %s", err)

    # ── writing and sending ─────────────────────────────────────────────────
    async def async_build(self, uid: str | None, a: Account, p: dict):
        """The email to send (or save as a draft), from what was typed in the card."""
        to, cc, bcc = _addr_list(p.get("to")), _addr_list(p.get("cc")), _addr_list(p.get("bcc"))
        html = clean_compose_html(p.get("html") or "")
        if p.get("text") and not p.get("html"):
            html = text_to_html(str(p["text"]))
        reply = p.get("reply") or {}
        orig = None
        if reply.get("uid") and reply.get("mode") in ("reply", "replyall", "forward"):
            try:
                # a forward passes the email on exactly as sent; a reply's quote leaves out ads (never folds)
                ad_pref = self.images_for(a.acc["owner"]).get("ads", "networks")
                orig = await a.async_message(reply.get("folder") or "INBOX", int(reply["uid"]), True, mark_seen=False,
                                             ads="off" if reply["mode"] == "forward" or ad_pref == "off" else "networks")
            except MailError:
                orig = None
            if orig and p.get("quote", True):
                html += quote_html(orig, "forward" if reply["mode"] == "forward" else "reply")
        html, extra = self.extras.decorate(a, p, html)
        atts: list[tuple[str, str, bytes]] = []
        total = 0
        limit = int(self.settings.get("max_attachment_mb", 25)) * 1024 * 1024
        for item in p.get("attachments") or []:
            if item.get("upload"):
                up = self.uploads.get(item["upload"]) or {}
                if up.get("owner") not in (uid, None) or not up.get("path"):
                    raise MailError("not_found", "An attachment is missing. Add it again.")
                data = await self.hass.async_add_executor_job(_read, up["path"])
                atts.append((up["name"], up["mime"], data))
                total += len(data)
            elif item.get("part") and item.get("uid"):
                got = await a.async_part(item.get("folder") or "INBOX", int(item["uid"]), int(item["part"]))
                if got:
                    data, mime, name = got
                    atts.append((name, mime, data))
                    total += len(data)
            if total > limit:
                raise MailError("too_large", f"Attachments can add up to {self.settings.get('max_attachment_mb', 25)} MB.")
        sender = {"name": a.acc.get("from_name") or "", "email": a.acc["email"]}
        from .extras import build_ics, vcard
        for c in (p.get("vcards") or [])[:10]:
            if isinstance(c, dict) and (c.get("name") or c.get("email")):
                atts.append((f"{re.sub(r'[^A-Za-z0-9 _-]', '', c.get('name') or c.get('email') or 'Contact').strip() or 'Contact'}.vcf",
                             "text/vcard", vcard(c).encode()))
        ics_part, ics_method = None, "REQUEST"
        if isinstance(p.get("invite"), dict) and p["invite"].get("start"):
            ics_part = build_ics("REQUEST", p["invite"], sender, [*to, *cc], self.hass.config.time_zone)
        elif p.get("_ics"):   # an answer to an invitation (made here, never from the card)
            ics_method, ics_part = p["_ics"]
        if ics_part:
            atts.append(("invite.ics" if ics_method == "REQUEST" else "reply.ics", "application/ics", ics_part.encode()))
        in_reply_to = (orig or {}).get("message_id", "") if reply.get("mode") in ("reply", "replyall") else ""
        refs = (orig or {}).get("references", "") if in_reply_to else ""
        from .sendmail import extract_inline
        html, inline = extract_inline(html)
        msg = build_message(sender=sender, to=to, cc=cc, bcc=bcc, subject=_clean(p.get("subject"), 998),
                            html=html, in_reply_to=in_reply_to, references=refs, attachments=atts, inline=inline or None,
                            calendar=ics_part, calendar_method=ics_method)
        if p.get("read_receipt"):
            msg["Disposition-Notification-To"] = a.acc["email"]
        if p.get("_auto"):
            msg["Auto-Submitted"] = "auto-replied"
            msg["X-Auto-Response-Suppress"] = "All"
        msg.crow_extra = extra  # type: ignore[attr-defined]
        return msg, to, cc, bcc, reply

    async def async_send(self, uid: str | None, account_id: str, p: dict) -> dict:
        a = self.account(uid, account_id)
        msg, to, cc, bcc, reply = await self.async_build(uid, a, p)
        rcpt = recipients(msg, to, cc, bcc)
        if not rcpt:
            raise MailError("invalid", "Add someone to send to.")
        if a.acc.get("auth") == "microsoft":
            await a.async_refresh_token()
        try:
            await self.hass.async_add_executor_job(send, a.acc["smtp"], a.acc.get("username") or a.acc["email"],
                                                   a._secret,
                                                   a.acc.get("auth") == "microsoft", msg, rcpt)
        except SendError as err:
            raise MailError("send", str(err)) from err
        raw = msg.as_bytes()
        if a.acc.get("sent_copy"):
            try:
                sent = await a.async_special("sent", create="Sent")
                if sent:
                    await a.job(a.cmd.append, sent, raw, "(\\Seen)")
            except MailError as err:
                _LOGGER.warning("Crow Messenger Email couldn't save a copy in Sent: %s", err)
        try:
            if reply.get("uid") and reply.get("mode") in ("reply", "replyall"):
                await a.async_flag(reply.get("folder") or "INBOX", [int(reply["uid"])], "answered", True)
            elif reply.get("uid") and reply.get("mode") == "forward":
                await a.async_flag(reply.get("folder") or "INBOX", [int(reply["uid"])], "forwarded", True)
            if p.get("draft_uid"):
                drafts = await a.async_special("drafts")
                if drafts:
                    await a.job(a.cmd.expunge, drafts, [int(p["draft_uid"])])
        except (MailError, ValueError):
            pass
        for item in p.get("attachments") or []:
            if item.get("upload"):
                self.drop_upload(item["upload"])
        if uid:
            self.note_people(uid, [*to, *cc, *bcc], 3)
        self.features.note_sent(a.acc["owner"], [x.get("email") for x in [*to, *cc, *bcc] if isinstance(x, dict)])
        self.hass.bus.async_fire(EVENT_SENT, {
            "account": a.acc["email"], "account_id": a.id, "to": [x["email"] for x in to],
            "cc": [x["email"] for x in cc], "subject": msg["Subject"] if a.acc.get("share_details", True) else "",
            "message_id": msg["Message-ID"], "scheduled": bool(p.get("scheduled")),
        })
        self.extras.after_send(a, msg["Message-ID"], getattr(msg, "crow_extra", {}) or {})
        self.send_to(a.acc["owner"], {"type": "sent", "account": a.id})
        return {"message_id": msg["Message-ID"]}

    async def async_save_draft(self, uid: str, account_id: str, p: dict) -> dict:
        a = self.account(uid, account_id)
        msg, *_ = await self.async_build(uid, a, {**p, "quote": False})
        drafts = await a.async_special("drafts", create="Drafts")
        await a.job(a.cmd.append, drafts, msg.as_bytes(), "(\\Seen \\Draft)")
        if p.get("draft_uid"):
            try:
                await a.job(a.cmd.expunge, drafts, [int(p["draft_uid"])])
            except (MailError, ValueError):
                pass
        self.hass.async_create_task(a.async_counts())
        return {"folder": drafts}

    # ── Send Later ──────────────────────────────────────────────────────────
    def schedule(self, uid: str, account_id: str, p: dict, at: int | None, place: dict | None = None, undo: bool = False) -> dict:
        """Send Later: at a time, when you arrive at or leave a place, or in a few seconds (Undo Send)."""
        a = self.account(uid, account_id)
        if not _addr_list(p.get("to")) and not _addr_list(p.get("cc")) and not _addr_list(p.get("bcc")):
            raise MailError("invalid", "Add someone to send to.")
        if place:
            if place.get("event") not in ("arrive", "leave") or not str(place.get("zone", "")).startswith("zone."):
                raise MailError("invalid", "Choose a place.")
            person = self.extras.person_for(uid)
            if not person:
                raise MailError("invalid", "Sending when you arrive or leave needs you to be a person in Home Assistant, with the Companion app tracking where you are.")
            place = {"zone": place["zone"], "event": place["event"], "person": person, "name": self.extras.zone_name(place["zone"])}
            at = None
        elif at is None or at < now_ms() - SEND_LATER_GRACE:
            raise MailError("invalid", "Choose a time in the future.")
        atts = []
        for att in p.get("attachments") or []:
            up = self.uploads.get(att.get("upload") or "")
            if att.get("upload") and (not up or up.get("owner") not in (uid, None)):
                raise MailError("not_found", "An attachment is missing. Add it again.")
            if up:
                att = {"upload": up["id"], "file": {k: up[k] for k in ("name", "mime", "path", "size")}}
            atts.append(att)
        p = {**p, "attachments": atts}
        item = {"id": new_id(), "uid": uid, "account": a.id, "payload": {**p, "scheduled": not undo}, "at": int(at) if at else None,
                "subject": _clean(p.get("subject"), 200), "to": [x["email"] for x in _addr_list(p.get("to"))]}
        if place:
            item["place"] = place
        if undo:
            item["undo"] = True
        self.data["scheduled"].append(item)
        self.save()
        self._arm_send(item)
        a.publish()
        self.send_to(uid, {"type": "scheduled", "scheduled": self.scheduled_for(uid)})
        return item

    def scheduled_for(self, uid: str) -> list[dict]:
        return [{k: v for k, v in x.items() if k != "payload"} | {"html": (x["payload"].get("html") or "")[:20000],
                                                                   "cc": x["payload"].get("cc"), "bcc": x["payload"].get("bcc")}
                for x in self.data["scheduled"] if x["uid"] == uid and not x.get("undo")]

    def _cancel_timer(self, key: str) -> None:
        unsub = self.timers.pop(key, None)
        if unsub:
            unsub()

    def _arm_send(self, item: dict) -> None:
        key = f"send_{item['id']}"
        self._cancel_timer(key)
        if item.get("place") and not item.get("at"):
            self.extras.arm_place(item)
            return

        @callback
        def due(_now) -> None:
            self.timers.pop(key, None)
            self.hass.async_create_task(self.async_send_scheduled(item["id"]))

        when = datetime.fromtimestamp(max(item["at"], now_ms() + 2000) / 1000, tz=timezone.utc)
        self.timers[key] = async_track_point_in_utc_time(self.hass, due, when)

    async def async_send_scheduled(self, item_id: str, uid: str | None = None) -> None:
        item = next((x for x in self.data["scheduled"] if x["id"] == item_id), None)
        if not item or (uid and item["uid"] != uid):
            raise MailError("not_found", "That email has already been sent.")
        self._cancel_timer(f"send_{item_id}")
        self.extras.disarm_place(item_id)
        try:
            await self.async_send(item["uid"], item["account"], item["payload"])
        except MailError as err:
            item["error"] = str(err)
            item.pop("undo", None)    # it's shown under Scheduled now, so it can be fixed or cancelled
            item.pop("place", None)
            item["payload"]["scheduled"] = True
            item["at"] = now_ms() + 15 * 60_000   # try again in 15 minutes
            self._arm_send(item)
            self.save()
            a = self.accounts.get(item["account"])
            await self.async_notify(a, item["uid"], "Couldn't send a scheduled email",
                                    f"{item.get('subject') or '(No subject)'}: {err}. It'll be tried again in 15 minutes.",
                                    {"tag": f"crow_email_sched_{item_id}"})
            self.send_to(item["uid"], {"type": "scheduled", "scheduled": self.scheduled_for(item["uid"])})
            return
        self.data["scheduled"].remove(item)
        self.save()
        a = self.accounts.get(item["account"])
        if a:
            a.publish()
        self.send_to(item["uid"], {"type": "scheduled", "scheduled": self.scheduled_for(item["uid"])})

    def cancel_scheduled(self, uid: str, item_id: str, keep_files: bool = False) -> dict:
        item = next((x for x in self.data["scheduled"] if x["id"] == item_id and x["uid"] == uid), None)
        if not item:
            raise MailError("not_found", "That email has already been sent.")
        self._cancel_timer(f"send_{item_id}")
        self.extras.disarm_place(item_id)
        self.data["scheduled"].remove(item)
        for att in item["payload"].get("attachments") or []:
            if att.get("upload") and not keep_files:
                self.drop_upload(att["upload"])
            elif att.get("upload") and att["upload"] in self.uploads:
                self.uploads[att["upload"]]["at"] = time.time()
        self.save()
        a = self.accounts.get(item["account"])
        if a:
            a.publish()
        self.send_to(uid, {"type": "scheduled", "scheduled": self.scheduled_for(uid)})
        return item

    # ── Remind Me ───────────────────────────────────────────────────────────
    def reminders_for(self, uid: str) -> list[dict]:
        return [r for r in self.data["reminders"] if r["uid"] == uid]

    async def async_remind(self, uid: str, account_id: str, path: str, muid: int, at: int | None) -> list[dict]:
        a = self.account(uid, account_id)
        rems = self.data["reminders"]
        for r in [r for r in rems if r["uid"] == uid and r["account"] == a.id and r["muid"] == muid and r["folder"] == path]:
            self._cancel_timer(f"rem_{r['id']}")
            rems.remove(r)
        if at:
            if at < now_ms() + 30_000:
                raise MailError("invalid", "Choose a time in the future.")
            page = await a.job(a.cmd.headers, path, [muid], {})
            if not page:
                raise MailError("not_found", "That email isn't there any more.")
            h = page[0]
            r = {"id": new_id(), "uid": uid, "account": a.id, "folder": path, "muid": muid, "at": int(at),
                 "message_id": h.get("message_id"), "subject": h.get("subject"), "from": h.get("from"),
                 "date": h.get("date"), "fired": False}
            rems.append(r)
            self._arm_reminder(r)
        self.save()
        self.send_to(uid, {"type": "reminders", "reminders": self.reminders_for(uid)})
        for x in self.accounts.values():   # the Today sensor
            if x.acc["owner"] == uid:
                x.publish()
        return self.reminders_for(uid)

    def _arm_reminder(self, r: dict) -> None:
        key = f"rem_{r['id']}"
        self._cancel_timer(key)

        @callback
        def due(_now) -> None:
            self.timers.pop(key, None)
            self.hass.async_create_task(self.async_reminder_due(r["id"]))

        when = datetime.fromtimestamp(max(r["at"], now_ms() + 2000) / 1000, tz=timezone.utc)
        self.timers[key] = async_track_point_in_utc_time(self.hass, due, when)

    async def async_reminder_due(self, rid: str) -> None:
        r = next((x for x in self.data["reminders"] if x["id"] == rid), None)
        if not r or r.get("fired"):
            return
        r["fired"] = True
        self.save()
        a = self.accounts.get(r["account"])
        if a:
            try:
                # it may have been moved: find it again by its Message-ID
                uid_now = await a.async_find(r["folder"], r.get("message_id") or "") or r["muid"]
                r["muid"] = uid_now
                await a.async_flag(r["folder"], [uid_now], "seen", False)
            except MailError:
                pass
        frm = (r.get("from") or [{}])[0]
        url = self.link(r["uid"], f"{r['account']}:{r['folder']}:{r['muid']}")
        await self.async_notify(a, r["uid"], "⏰ " + (frm.get("name") or frm.get("email") or "Reminder"),
                                r.get("subject") or "(No subject)",
                                {"tag": f"crow_email_rem_{rid}", "url": url, "clickAction": url,
                                 "push": {"interruption-level": "time-sensitive"}})
        self.send_to(r["uid"], {"type": "reminders", "reminders": self.reminders_for(r["uid"])})
        if a:
            a.publish()

    def reminder_done(self, uid: str, rid: str) -> list[dict]:
        r = next((x for x in self.data["reminders"] if x["id"] == rid and x["uid"] == uid), None)
        if r:
            self._cancel_timer(f"rem_{rid}")
            self.data["reminders"].remove(r)
            self.save()
        self.send_to(uid, {"type": "reminders", "reminders": self.reminders_for(uid)})
        for x in self.accounts.values():   # the Today sensor
            if x.acc["owner"] == uid:
                x.publish()
        return self.reminders_for(uid)

    # ── attachments: uploads, and links for showing parts of an email ──────
    def add_upload(self, owner: str, name: str, mime: str, path: str, size: int) -> dict:
        uid = new_id()
        self.uploads[uid] = {"id": uid, "owner": owner, "name": name, "mime": mime, "path": path, "size": size, "at": time.time()}
        return {"id": uid, "name": name, "mime": mime, "size": size}

    def drop_upload(self, upload_id: str) -> None:
        up = self.uploads.pop(upload_id, None)
        if up:
            self.hass.async_add_executor_job(_remove, up["path"])

    async def async_tidy_uploads(self) -> None:
        keep = {att.get("upload") for x in self.data["scheduled"] for att in x["payload"].get("attachments") or []}
        for k, up in list(self.uploads.items()):
            if k not in keep and time.time() - up["at"] > 86400:
                self.drop_upload(k)

    def signed_url(self, account_id: str, path: str, uid: int, part: int, download: bool = False) -> str:
        payload = json.dumps({"a": account_id, "f": path, "u": uid, "p": part, "d": int(download),
                              "x": int(time.time()) + 6 * 3600}, separators=(",", ":")).encode()
        tok = base64.urlsafe_b64encode(payload).decode().rstrip("=")
        sig = hmac.new(self.data["secret"].encode(), tok.encode(), hashlib.sha256).hexdigest()[:32]
        return f"/api/{DOMAIN}/part/{tok}.{sig}"

    # ── pictures from the web ───────────────────────────────────────────────
    def images_for(self, uid: str) -> dict:
        d = self.data.setdefault("images", {}).get(uid) or {}
        return {"mode": d.get("mode", "ask"), "senders": d.get("senders", []), "domains": d.get("domains", []),
                "trackers": d.get("trackers", True), "proxy": d.get("proxy", False),
                "ads": d.get("ads", "networks"), "ad_senders": d.get("ad_senders", [])}

    def images_reason(self, uid: str, sender: str) -> str | None:
        """Why pictures from the web load for this sender without asking (None: they don't)."""
        p = self.images_for(uid)
        sender = (sender or "").lower()
        domain = sender.rsplit("@", 1)[-1] if "@" in sender else ""
        if p["mode"] == "always":
            return "always"
        if sender and sender in p["senders"]:
            return "sender"
        if domain and domain in p["domains"]:
            return "domain"
        if p["mode"] == "contacts" and sender and (self.is_vip(uid, sender) or self.book.has_email(uid, sender)):
            return "contact"
        return None

    def save_images(self, uid: str, d: dict) -> dict:
        cur = self.images_for(uid)
        if d.get("mode") in ("ask", "always", "contacts"):
            cur["mode"] = d["mode"]
        for k in ("trackers", "proxy"):
            if isinstance(d.get(k), bool):
                cur[k] = d[k]
        if d.get("ads") in ("off", "networks", "sponsored"):
            cur["ads"] = d["ads"]
        for k in ("senders", "domains", "ad_senders"):
            lst = [x for x in cur[k]]
            if isinstance(d.get(k), list):
                lst = [_clean(x, 254).lower() for x in d[k] if x]
            for x in d.get(f"add_{k}") or []:
                x = _clean(x, 254).lower().lstrip("@")
                if x and x not in lst:
                    lst.append(x)
            for x in d.get(f"remove_{k}") or []:
                x = str(x).lower()
                if x in lst:
                    lst.remove(x)
            cur[k] = lst[-1000:]
        self.data.setdefault("images", {})[uid] = cur
        self.save()
        self.send_to(uid, {"type": "images", "images": cur})
        return cur

    def proxied_url(self, url: str) -> str:
        """A picture from the web, fetched by Home Assistant so the sender never sees your address."""
        payload = json.dumps({"i": url, "x": int(time.time()) + 6 * 3600}, separators=(",", ":")).encode()
        tok = base64.urlsafe_b64encode(payload).decode().rstrip("=")
        sig = hmac.new(self.data["secret"].encode(), b"img:" + tok.encode(), hashlib.sha256).hexdigest()[:32]
        return f"/api/{DOMAIN}/img/{tok}.{sig}"

    def check_proxied(self, token: str) -> str | None:
        try:
            tok, sig = token.rsplit(".", 1)
            good = hmac.new(self.data["secret"].encode(), b"img:" + tok.encode(), hashlib.sha256).hexdigest()[:32]
            if not hmac.compare_digest(good, sig):
                return None
            data = json.loads(base64.urlsafe_b64decode(tok + "=" * (-len(tok) % 4)))
        except (ValueError, TypeError):
            return None
        return data.get("i") if data.get("x", 0) > time.time() else None

    def check_signed(self, token: str) -> dict | None:
        try:
            tok, sig = token.rsplit(".", 1)
        except ValueError:
            return None
        good = hmac.new(self.data["secret"].encode(), tok.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(good, sig):
            return None
        try:
            data = json.loads(base64.urlsafe_b64decode(tok + "=" * (-len(tok) % 4)))
        except ValueError:
            return None
        return data if data.get("x", 0) > time.time() else None

    # ── everything combined: all inboxes, VIP, flagged, unread ─────────────
    async def async_combined(self, uid: str, kind: str, cursor: dict, limit: int = PAGE_SIZE) -> dict:
        mine = [a for a in self.accounts.values() if a.acc["owner"] == uid]
        filt = {"inbox": "all", "vip": "vip", "flagged": "flagged", "unread": "unread", "attachments": "attachments", "today": "today"}.get(kind, "all")

        async def one(a: Account):
            try:
                return a, await a.async_page("INBOX", int(cursor.get(a.id, 0)), limit, filt)
            except MailError as err:
                return a, {"items": [], "total": 0, "error": str(err)}

        results = await asyncio.gather(*(one(a) for a in mine))
        merged = sorted((it for _, r in results for it in r["items"]), key=lambda i: i["date"], reverse=True)[:limit]
        nxt = dict(cursor)
        for a, _ in results:
            nxt[a.id] = int(cursor.get(a.id, 0)) + sum(1 for i in merged if i["account"] == a.id)
        return {"items": merged, "total": sum(r["total"] for _, r in results), "cursor": nxt,
                "validity": {a.id: r.get("validity", 0) for a, r in results},
                "errors": {a.id: r["error"] for a, r in results if r.get("error")}}

    async def async_conversation(self, uid: str, account_id: str, subject: str) -> list[dict]:
        """The other emails in a conversation, from the Inbox and Sent."""
        a = self.account(uid, account_id)
        key = norm_subject(subject)
        if not key:
            return []
        sent = await a.async_special("sent")
        words = " ".join(key.split()[:6])
        out = []
        for path in [p for p in ("INBOX", sent) if p]:
            prev = a.previews.setdefault(path, {})

            def conversation(path=path, prev=prev):
                uids = a.cmd.search_subject(path, words)[:60]
                return a.cmd.headers(path, uids[:30], prev)
            try:
                items = await a.job(conversation)
            except MailError:
                continue
            for it in items:
                it["account"], it["folder"] = a.id, path
            out += [i for i in items if norm_subject(i.get("subject", "")) == key]
        return sorted(out, key=lambda i: i["date"])[-30:]


def _sig_card(c: dict) -> dict:
    photo = str(c.get("photo") or "")
    if not re.match(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$", photo) or len(photo) > 200_000:
        photo = ""
    return {"on": bool(c.get("on")), "name": _clean(c.get("name"), 120), "title": _clean(c.get("title"), 120),
            "phone": _clean(c.get("phone"), 40), "web": _clean(c.get("web"), 200), "photo": photo}


def _smtp_login_test(acc: dict) -> None:
    import smtplib
    import ssl
    from .const import CONNECT_TIMEOUT
    cfg = acc["smtp"]
    ctx = ssl.create_default_context()
    try:
        if cfg["security"] == "ssl":
            s = smtplib.SMTP_SSL(cfg["host"], int(cfg["port"]), context=ctx, timeout=CONNECT_TIMEOUT)
        else:
            s = smtplib.SMTP(cfg["host"], int(cfg["port"]), timeout=CONNECT_TIMEOUT)
        s.ehlo()
        if cfg["security"] == "starttls":
            s.starttls(context=ctx)
            s.ehlo()
        if acc.get("password") and s.has_extn("auth"):
            s.login(acc.get("username") or acc["email"], acc["password"])
        s.quit()
    except smtplib.SMTPAuthenticationError as err:
        raise MailError("connect", "The outgoing (SMTP) server didn't accept the password.") from err
    except (OSError, smtplib.SMTPException) as err:
        raise MailError("connect", "Outgoing mail (SMTP): " + friendly(err)) from err


def _read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass



def notify_preview(text: str, limit: int = 300) -> str:
    """The start of an email as words for a notification: no links, no image placeholders, no
    "view in browser" or "having trouble viewing" lines, and no runs of spaces."""
    t = re.sub(r"<\s*(?:https?://|mailto:)[^>]*>", " ", text or "")
    t = re.sub(r"\[\s*image\s*:[^\]]*\]", " ", t, flags=re.I)
    t = re.sub(r"(?:https?://|www\.)\S+", " ", t)
    t = re.sub(r"(?i)\b(view|read|open) (this|it|the email|this email)? ?(online|in (your|a|the)? ?browser)\b[.:]?", " ", t)
    t = re.sub(r"(?i)\bhaving trouble (viewing|reading) this( email)?\??", " ", t)
    t = re.sub(r"[\s|·•]+", " ", t).strip(" -–—:|")
    return t[:limit].rstrip() + ("…" if len(t) > limit else "")
