"""Snooze, Mute Conversation, the Screener, Subscriptions, Sweep and Today.

Each is used from the card (the visual editor decides which the card shows). The work happens
here, in Home Assistant, so it carries on when no card is open: a snoozed email comes back on
time, a muted conversation stays quiet and the Screener holds new senders.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

SNOOZED_FOLDER = "Snoozed"
SCREENER_FOLDER = "Screener"
DAY_MS = 86400_000
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def _now() -> int:
    return int(time.time() * 1000)


def _email(x: Any) -> str:
    return str(x or "").strip().lower()


def _ids(it: dict) -> set[str]:
    """The Message-IDs that tie an email to its conversation."""
    out = {it.get("message_id") or "", it.get("in_reply_to") or ""}
    out |= set(re.findall(r"<[^<>\s]+>", it.get("references") or ""))
    return {x.strip() for x in out if x and x.strip()}


def _imap_date(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return f"{d.day:02d}-{MONTHS[d.month - 1]}-{d.year}"


class Features:
    def __init__(self, mailer: Mailer) -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        d = mailer.data
        d.setdefault("snoozed", [])
        d.setdefault("muted", {})
        d.setdefault("screener", {})
        d.setdefault("unsubscribed", {})
        self.returning: set[str] = set()   # snoozed emails on their way back to the Inbox
        self.subs_cache: dict[str, tuple[float, list]] = {}

    @property
    def data(self) -> dict:
        return self.mailer.data

    def start(self) -> None:
        for s in self.data["snoozed"]:
            self._arm(s)
        self._watch_home()

    def _accounts(self, uid: str) -> list[Account]:
        return [a for a in self.mailer.accounts.values() if a.acc["owner"] == uid]

    def _changed(self, uid: str, kind: str) -> None:
        payload = {"type": kind}
        if kind == "snoozed":
            payload["snoozed"] = self.snoozed_for(uid)
        elif kind == "muted":
            payload["muted"] = self.muted_for(uid)
        elif kind == "screener":
            payload["screener"] = self.screener_for(uid)
        self.mailer.send_to(uid, payload)
        for a in self._accounts(uid):   # the Today sensor
            a.publish()

    async def _folder(self, a: Account, name: str) -> str:
        """A folder of ours (Snoozed, Screener), made the first time it's needed."""
        if not a.folders:
            await a.async_folders(counts=False)
        for f in a.folders:
            if f.get("name", "").lower() == name.lower() or f.get("path", "").lower() == name.lower():
                return f["path"]
        path = await a.job(a.cmd.create_folder, name)
        await a.async_folders(force=True, counts=False)
        return path

    async def _header(self, a: Account, folder: str, muid: int) -> dict:
        from .manager import MailError
        page = await a.job(a.cmd.headers, folder, [muid], {})
        if not page:
            raise MailError("not_found", "That email isn't there any more.")
        return page[0]

    # ── Snooze ─────────────────────────────────────────────────────────────
    def snoozed_for(self, uid: str) -> list[dict]:
        return sorted([s for s in self.data["snoozed"] if s["uid"] == uid], key=lambda s: s["until"])

    async def async_snooze(self, uid: str, account_id: str, folder: str, muid: int, until: int, home: bool = False) -> dict:
        """home: back when this person next arrives home (until is then only a safety net, 30 days on)."""
        from .manager import MailError, new_id
        a = self.mailer.account(uid, account_id)
        if home:
            if not self._person_of(uid):
                raise MailError("invalid", "There's no person in Home Assistant for you, so Email can't tell when you get home.")
            until = _now() + 30 * 86_400_000
        if until < _now() + 60_000:
            raise MailError("invalid", "Choose a time in the future.")
        h = await self._header(a, folder, muid)
        dest = await self._folder(a, SNOOZED_FOLDER)
        lst = self.data["snoozed"]
        if folder == dest:   # already snoozed: a new time
            s = next((x for x in lst if x["uid"] == uid and x["message_id"] and x["message_id"] == h.get("message_id")), None)
            if not s:
                raise MailError("invalid", "Move this email back to the Inbox to snooze it again.")
            s["until"] = int(until)
            s["home"] = bool(home)
            self._arm(s)
            self.mailer.save()
            self._changed(uid, "snoozed")
            return s
        # snoozing again just changes the time
        for old in [s for s in lst if s["uid"] == uid and s["message_id"] and s["message_id"] == h.get("message_id")]:
            self._cancel(old)
            lst.remove(old)
        await a.async_flag(folder, [muid], "seen", True)
        await a.async_move(folder, [muid], dest)
        s = {"id": new_id(), "uid": uid, "account": a.id, "folder": folder, "message_id": h.get("message_id") or "",
             "until": int(until), "subject": h.get("subject") or "", "from": h.get("from") or [], "date": h.get("date"),
             "at": _now(), "home": bool(home)}
        lst.append(s)
        self._arm(s)
        self.mailer.save()
        self._changed(uid, "snoozed")
        self.hass.async_create_task(a.async_counts())
        return s

    # ── Snooze until I get home (Crow Messenger knows where everyone is) ──
    def _person_of(self, uid: str) -> str | None:
        for st in self.hass.states.async_all("person"):
            if st.attributes.get("user_id") == uid:
                return st.entity_id
        return None

    @callback
    def _watch_home(self) -> None:
        from homeassistant.helpers.event import async_track_state_change_event
        if self.mailer.timers.get("snz_home"):
            return

        @callback
        def changed(event) -> None:
            new, old = event.data.get("new_state"), event.data.get("old_state")
            if not new or new.state != "home" or (old and old.state == "home"):
                return
            uid = new.attributes.get("user_id")
            for s in [x for x in self.data["snoozed"] if x.get("home") and x["uid"] == uid]:
                self.hass.async_create_task(self.async_wake(s["id"]))

        people = [st.entity_id for st in self.hass.states.async_all("person")]
        if people:
            self.mailer.timers["snz_home"] = async_track_state_change_event(self.hass, people, changed)

    def _cancel(self, s: dict) -> None:
        unsub = self.mailer.timers.pop(f"snz_{s['id']}", None)
        if unsub:
            unsub()

    def _arm(self, s: dict) -> None:
        key = f"snz_{s['id']}"
        self._cancel(s)

        @callback
        def due(_now) -> None:
            self.mailer.timers.pop(key, None)
            self.hass.async_create_task(self.async_wake(s["id"]))

        when = datetime.fromtimestamp(max(s["until"], _now() + 2000) / 1000, tz=timezone.utc)
        self.mailer.timers[key] = async_track_point_in_utc_time(self.hass, due, when)

    async def async_wake(self, sid: str, uid: str | None = None) -> dict | None:
        """Back to the Inbox, unread, at the top (now, or when its time comes)."""
        from .manager import MailError
        s = next((x for x in self.data["snoozed"] if x["id"] == sid and (uid is None or x["uid"] == uid)), None)
        if not s:
            if uid is not None:
                raise MailError("not_found", "That email isn't snoozed any more.")
            return None
        a = self.mailer.accounts.get(s["account"])
        self._cancel(s)
        self.data["snoozed"].remove(s)
        self.mailer.save()
        out = None
        if a:
            try:
                src = await self._folder(a, SNOOZED_FOLDER)
                muid = await a.async_find(src, s["message_id"]) if s["message_id"] else None
                if muid:
                    if s["message_id"]:
                        self.returning.add(s["message_id"])
                    await a.async_move(src, [muid], "INBOX")
                    back = await a.async_find("INBOX", s["message_id"]) if s["message_id"] else None
                    if back:
                        await a.async_flag("INBOX", [back], "seen", False)
                        out = {"account": a.id, "folder": "INBOX", "uid": back}
                    self.hass.async_create_task(a.async_check_new())
            except MailError as err:
                _LOGGER.warning("Crow Messenger Email couldn't bring back a snoozed email: %s", err)
        self._changed(s["uid"], "snoozed")
        return out

    async def async_locate_snoozed(self, uid: str, sid: str) -> dict:
        from .manager import MailError
        s = next((x for x in self.data["snoozed"] if x["id"] == sid and x["uid"] == uid), None)
        if not s:
            raise MailError("not_found", "That email isn't snoozed any more.")
        a = self.mailer.account(uid, s["account"])
        path = await self._folder(a, SNOOZED_FOLDER)
        muid = await a.async_find(path, s["message_id"]) if s["message_id"] else None
        if not muid:
            raise MailError("not_found", "That email isn't in Snoozed any more.")
        return {"account": a.id, "folder": path, "uid": muid}

    def is_returning(self, it: dict) -> bool:
        mid = it.get("message_id") or ""
        if mid and mid in self.returning:
            self.returning.discard(mid)
            return True
        return False

    # ── Mute Conversation ──────────────────────────────────────────────────
    def muted_for(self, uid: str) -> list[dict]:
        return [{k: m.get(k) for k in ("id", "account", "subject", "at")} for m in self.data["muted"].get(uid, [])]

    def muted_entry(self, owner: str, it: dict) -> dict | None:
        ids = _ids(it)
        if not ids:
            return None
        for m in self.data["muted"].get(owner, []):
            if ids & set(m.get("ids") or []):
                return m
        return None

    async def async_mute(self, uid: str, account_id: str | None, folder: str | None, muid: int | None, on: bool,
                         mid: str | None = None) -> dict:
        from .manager import new_id
        lst = self.data["muted"].setdefault(uid, [])
        if mid:   # unmuting from the list in Settings
            lst[:] = [m for m in lst if m["id"] != mid]
            self.mailer.save()
            self._changed(uid, "muted")
            return {"muted": False}
        a = self.mailer.account(uid, account_id)
        h = await self._header(a, folder or "INBOX", int(muid or 0))
        entry = self.muted_entry(uid, h)
        if not on:
            if entry:
                lst.remove(entry)
        elif not entry:
            lst.append({"id": new_id(), "account": a.id, "subject": h.get("subject") or "", "ids": sorted(_ids(h)), "at": _now()})
            del lst[:-300]
        self.mailer.save()
        self._changed(uid, "muted")
        archived = False
        if on and (folder or "INBOX") == "INBOX":   # out of the way now, like Gmail
            try:
                await a.async_archive("INBOX", [int(muid)])
                archived = True
            except Exception:  # noqa: BLE001 - nowhere to archive to: it just stays quiet
                pass
        return {"muted": on, "archived": archived}

    # ── the Screener ───────────────────────────────────────────────────────
    def screener_for(self, uid: str) -> dict:
        d = self.data["screener"].get(uid) or {}
        return {"on": bool(d.get("on")), "allowed": d.get("allowed", []), "learned": bool(d.get("learned")),
                "auto_out": bool(d.get("auto_out"))}

    def known(self, owner: str, addr: str) -> bool:
        e = _email(addr)
        if not e:
            return True
        dom = e.rsplit("@", 1)[-1]
        if any(_email(a.acc["email"]) == e for a in self._accounts(owner)):
            return True
        d = self.data["screener"].get(owner) or {}
        allowed = set(d.get("allowed", []))
        if e in allowed or f"@{dom}" in allowed:
            return True
        if self.mailer.is_vip(owner, e) or self.mailer.book.has_email(owner, e):
            return True
        lists = self.mailer.spam.lists_for(owner)
        return e in lists["safe_senders"] or dom in lists["safe_domains"]

    def note_sent(self, owner: str, emails: list[str]) -> None:
        """People you email are let in (as in HEY)."""
        d = self.data["screener"].get(owner)
        if not d or not d.get("on"):
            return
        allowed = d.setdefault("allowed", [])
        added = False
        for e in {_email(x) for x in emails if x}:
            if e and e not in allowed:
                allowed.append(e)
                added = True
        if added:
            del allowed[:-5000]
            self.mailer.save()

    async def async_screener_set(self, uid: str, on: bool, remove: list[str] | None = None, add: list[str] | None = None,
                                 auto_out: bool | None = None) -> dict:
        d = self.data["screener"].setdefault(uid, {"on": False, "allowed": []})
        if auto_out is not None:
            d["auto_out"] = bool(auto_out)
        allowed = d.setdefault("allowed", [])
        for x in remove or []:
            if _email(x) in allowed:
                allowed.remove(_email(x))
        for x in add or []:
            if _email(x) and _email(x) not in allowed:
                allowed.append(_email(x))
        if on and not d.get("on") and not d.get("learned"):
            # the first time: everyone you've emailed is let in, so the Screener only holds strangers
            for a in self._accounts(uid):
                try:
                    sent = await a.async_special("sent")
                    if not sent:
                        continue
                    uids = (await a.job(a.cmd.search, sent, "ALL"))[:1500]
                    heads = await a.job(a.cmd.light_headers, sent, uids, "TO CC")
                    for h in heads:
                        for x in [*h.get("to", []), *h.get("cc", [])]:
                            e = _email(x.get("email"))
                            if e and e not in allowed:
                                allowed.append(e)
                except Exception as err:  # noqa: BLE001
                    _LOGGER.warning("Crow Messenger Email couldn't read Sent for the Screener: %s", err)
            d["learned"] = True
        d["on"] = bool(on)
        del allowed[:-5000]
        self.mailer.save()
        self._changed(uid, "screener")
        return self.screener_for(uid)

    async def async_screener_list(self, uid: str) -> list[dict]:
        """Who's waiting in the Screener, newest first, with their emails."""
        out: dict[str, dict] = {}
        for a in self._accounts(uid):
            path = next((f["path"] for f in (a.folders or []) if f.get("name", "").lower() == SCREENER_FOLDER.lower()), None)
            if not path:
                continue
            uids = (await a.job(a.cmd.search, path, "ALL"))[:300]
            for h in await a.job(a.cmd.light_headers, path, uids, "FROM SUBJECT DATE MESSAGE-ID"):
                frm = (h.get("from") or [{}])[0]
                e = _email(frm.get("email"))
                if not e:
                    continue
                g = out.setdefault(f"{a.id}|{e}", {"account": a.id, "folder": path, "email": e, "name": frm.get("name") or "",
                                                  "emails": []})
                g["emails"].append({"uid": h["uid"], "subject": h.get("subject") or "", "date": h.get("date") or 0})
        res = list(out.values())
        for g in res:
            g["emails"].sort(key=lambda x: x["date"], reverse=True)
            g["count"] = len(g["emails"])
            g["latest"] = g["emails"][0]["date"] if g["emails"] else 0
            g["emails"] = g["emails"][:5]
        return sorted(res, key=lambda g: g["latest"], reverse=True)

    async def async_screener_decide(self, uid: str, account_id: str, addr: str, allow: bool) -> dict:
        from .manager import MailError
        a = self.mailer.account(uid, account_id)
        e = _email(addr)
        if "@" not in e:
            raise MailError("invalid", "That isn't an email address.")
        path = await self._folder(a, SCREENER_FOLDER)
        from .imapclient import _q
        uids = await a.job(a.cmd.search, path, "FROM", _q(e))
        moved = 0
        if allow:
            d = self.data["screener"].setdefault(uid, {"on": True, "allowed": []})
            if e not in d.setdefault("allowed", []):
                d["allowed"].append(e)
            for i in range(0, len(uids), 500):
                await a.async_move(path, uids[i:i + 500], "INBOX")
            moved = len(uids)
        else:
            # No: they're blocked (Settings → Blocked Senders can undo it), and what's waiting goes too
            await self.mailer.spam.async_block(uid, e, False, False)
            lists = self.mailer.spam.lists_for(uid)
            dest = await a.async_special("trash" if lists["action"] == "trash" else "junk", create="Junk")
            if dest and uids:
                await a.async_flag(path, uids, "seen", True)
                for i in range(0, len(uids), 500):
                    await a.async_move(path, uids[i:i + 500], dest)
            moved = len(uids)
        self.mailer.save()
        self._changed(uid, "screener")
        self.hass.async_create_task(a.async_counts())
        return {"moved": moved}

    # ── new mail: muted conversations and the Screener ─────────────────────
    async def async_new_mail(self, a: Account, it: dict) -> bool:
        """True when the email was dealt with here (no notification, no rules)."""
        owner = a.acc["owner"]
        m = self.muted_entry(owner, it)
        if m:
            if it.get("message_id") and it["message_id"] not in m["ids"]:
                m["ids"].append(it["message_id"])
                del m["ids"][:-400]
                self.mailer.save()
            try:
                await a.async_flag("INBOX", [it["uid"]], "seen", True)
                await a.async_archive("INBOX", [it["uid"]])
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Crow Messenger Email: a muted reply stayed in the Inbox: %s", err)
            return True
        d = self.data["screener"].get(owner) or {}
        if d.get("on"):
            frm = (it.get("from") or [{}])[0]
            if not self.known(owner, frm.get("email")):
                # Screen Out Marketing Automatically: read it first (it's about to move)
                msg = None
                if d.get("auto_out"):
                    from . import ai
                    if ai.on(self.hass, self.mailer, "screener_notes"):
                        msg = await self.mailer.smart.async_text(a, it)
                try:
                    dest = await self._folder(a, SCREENER_FOLDER)
                    await a.async_move("INBOX", [it["uid"]], dest)
                except Exception as err:  # noqa: BLE001 - couldn't: it stays in the Inbox as usual
                    _LOGGER.warning("Crow Messenger Email couldn't move an email to the Screener: %s", err)
                    return False
                if msg:
                    self.hass.async_create_task(self._auto_screen(a, it, msg, dest))
                self.mailer.send_to(owner, {"type": "screener", "screener": self.screener_for(owner), "new": True})
                return True
        return False

    async def _auto_screen(self, a: Account, it: dict, msg: dict, path: str) -> None:
        """Obvious marketing from someone new goes to Junk (the sender isn't blocked)."""
        from . import ai
        try:
            res = await ai.screener_notes(self.hass, self.mailer, [msg])
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger Email: the Screener AI couldn't look at a new sender: %s", err)
            return
        r = res[0] if res else None
        if not r:
            return
        if it.get("message_id"):
            self.mailer.aix.remember(f"scr:{it['message_id']}", r)
        if r["suggest"] != "screen_out" or r["kind"] not in ("marketing", "scam"):
            return
        try:
            muid = await a.async_find(path, it.get("message_id") or "") if it.get("message_id") else None
            dest = await a.async_special("junk", create="Junk")
            if muid and dest:
                await a.async_flag(path, [muid], "seen", True)
                await a.async_move(path, [muid], dest)
                self.mailer.send_to(a.acc["owner"], {"type": "screener", "screener": self.screener_for(a.acc["owner"]), "new": True})
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger Email couldn't screen out marketing: %s", err)

    # ── Subscriptions ──────────────────────────────────────────────────────
    async def async_subscriptions(self, uid: str, account_id: str, force: bool = False) -> list[dict]:
        a = self.mailer.account(uid, account_id)
        hit = self.subs_cache.get(a.id)
        if hit and not force and time.time() - hit[0] < 1800:
            return self._mark(uid, hit[1])
        uids = (await a.job(a.cmd.search, "INBOX", "ALL"))[:1500]
        heads = await a.job(a.cmd.light_headers, "INBOX", uids, "FROM DATE LIST-UNSUBSCRIBE LIST-UNSUBSCRIBE-POST LIST-ID")
        groups: dict[str, dict] = {}
        for h in heads:
            if not (h.get("list_unsubscribe") or h.get("list_id")):
                continue
            frm = (h.get("from") or [{}])[0]
            e = _email(frm.get("email"))
            if not e:
                continue
            g = groups.setdefault(e, {"email": e, "name": frm.get("name") or "", "count": 0, "latest": 0, "oldest": 0,
                                      "uid": 0, "list_unsubscribe": "", "one_click": False, "account": a.id, "unread": 0})
            g["count"] += 1
            if not h.get("seen"):
                g["unread"] += 1
            d = h.get("date") or 0
            if d >= g["latest"]:
                g["latest"], g["uid"] = d, h["uid"]
                g["name"] = frm.get("name") or g["name"]
                if h.get("list_unsubscribe"):
                    g["list_unsubscribe"], g["one_click"] = h["list_unsubscribe"], bool(h.get("one_click"))
            if d and (not g["oldest"] or d < g["oldest"]):
                g["oldest"] = d
        res = []
        for g in groups.values():
            weeks = max(1.0, ((g["latest"] - g["oldest"]) / (7 * DAY_MS)) if g["oldest"] else 1.0)
            g["per_week"] = round(g["count"] / weeks, 1)
            res.append(g)
        res.sort(key=lambda g: (g["count"], g["latest"]), reverse=True)
        self.subs_cache[a.id] = (time.time(), res)
        return self._mark(uid, res)

    def _mark(self, uid: str, res: list[dict]) -> list[dict]:
        done = self.data["unsubscribed"].get(uid, {})
        return [{**g, "unsubscribed": done.get(g["email"])} for g in res]

    async def async_unsubscribe(self, uid: str, account_id: str, addr: str, header: str, one_click: bool) -> dict:
        """One-click where the sender supports it (RFC 8058), else an email to the list, else its web page."""
        from .manager import MailError
        a = self.mailer.account(uid, account_id)
        links = re.findall(r"<([^>]+)>", header or "")
        http = next((l for l in links if l.lower().startswith("https://")), None) or next((l for l in links if l.lower().startswith("http://")), None)
        mail = next((l for l in links if l.lower().startswith("mailto:")), None)
        how = None
        if http and one_click:
            try:
                from homeassistant.helpers.aiohttp_client import async_get_clientsession
                import asyncio
                session = async_get_clientsession(self.hass)
                async with asyncio.timeout(15):
                    r = await session.post(http, data="List-Unsubscribe=One-Click",
                                           headers={"Content-Type": "application/x-www-form-urlencoded"})
                    if r.status < 400:
                        how = "one_click"
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Crow Messenger Email: one-click unsubscribe failed: %s", err)
        if not how and mail:
            from urllib.parse import parse_qs, unquote, urlsplit
            u = urlsplit(mail)
            to = unquote(u.path)
            q = parse_qs(u.query)
            try:
                await self.mailer.async_send(uid, a.id, {"to": [{"email": to}], "subject": (q.get("subject") or ["unsubscribe"])[0],
                                                         "html": (q.get("body") or ["unsubscribe"])[0]})
                how = "email"
            except MailError as err:
                if not http:
                    raise
                _LOGGER.debug("Crow Messenger Email: unsubscribe email failed: %s", err)
        if not how and http:
            return {"how": "open", "url": http}
        if not how:
            raise MailError("invalid", "This sender doesn't say how to unsubscribe.")
        self.data["unsubscribed"].setdefault(uid, {})[_email(addr)] = _now()
        self.mailer.save()
        return {"how": how}

    # ── Sweep ──────────────────────────────────────────────────────────────
    async def async_sweep(self, uid: str, account_id: str, folder: str, addr: str, action: str, keep: str) -> dict:
        """Everything from one sender here: deleted or archived; or all but the latest; or the ones over 10 days old."""
        from .imapclient import _q
        from .manager import MailError
        a = self.mailer.account(uid, account_id)
        e = _email(addr)
        if "@" not in e:
            raise MailError("invalid", "That isn't an email address.")
        crit = ["FROM", _q(e)]
        if keep == "older10":
            crit += ["BEFORE", _imap_date(_now() - 10 * DAY_MS)]
        uids = await a.job(a.cmd.search, folder, *crit)   # newest first
        if keep == "latest":
            uids = uids[1:]
        if not uids:
            return {"count": 0}
        to = None
        for i in range(0, len(uids), 500):
            part = uids[i:i + 500]
            if action == "archive":
                to = await a.async_archive(folder, part)
            else:
                to = await a.async_delete(folder, part)
        self.hass.async_create_task(a.async_counts())
        return {"count": len(uids), "to": to}

    # ── Today ──────────────────────────────────────────────────────────────
    def today_for(self, uid: str, account_id: str | None = None) -> list[dict]:
        """What needs attention today: parcels arriving, reminders due, snoozed emails coming back, follow-ups."""
        now = dt_util.now()
        today = now.date()
        end = int(datetime.combine(today, datetime.max.time(), tzinfo=now.tzinfo).timestamp() * 1000)
        items: list[dict] = []
        for p in self.mailer.smart.parcels_for(uid):
            if account_id and p.get("account") != account_id:
                continue
            if p.get("status") == "delivered":
                continue
            if p.get("expected") == today.isoformat() or p.get("status") == "out_for_delivery":
                items.append({"kind": "parcel", "title": p.get("item") or p.get("retailer") or "A parcel",
                              "sub": "Out for delivery" if p.get("status") == "out_for_delivery" else "Arriving today",
                              "account": p.get("account"), "id": p.get("id")})
        for r in self.mailer.reminders_for(uid):
            if account_id and r.get("account") != account_id:
                continue
            if r.get("fired") or r.get("at", 0) <= end:
                items.append({"kind": "reminder", "title": r.get("subject") or "(No subject)", "at": r.get("at"),
                              "sub": "Reminder", "account": r.get("account"), "folder": r.get("folder"), "uid": r.get("muid"),
                              "id": r.get("id"), "fired": bool(r.get("fired"))})
        for s in self.snoozed_for(uid):
            if account_id and s.get("account") != account_id:
                continue
            if s["until"] <= end:
                items.append({"kind": "snoozed", "title": s.get("subject") or "(No subject)", "at": s["until"],
                              "sub": "Back from Snooze", "account": s.get("account"), "id": s["id"]})
        for kind in ("food", "groceries"):
            for o in self.mailer.orders.list_for(uid, kind):
                if (account_id and o.get("account") != account_id) or o["status"] in ("delivered", "collected", "cancelled"):
                    continue
                at = o.get("when")
                if not at or at > end:
                    continue
                coll = o.get("method") == "collection"
                if kind == "food":
                    items.append({"kind": "food", "title": o.get("restaurant") or "Food order",
                                  "sub": "Ready to collect" if coll else "Food arriving", "at": at,
                                  "account": o.get("account"), "id": o["id"]})
                else:
                    items.append({"kind": "grocery", "title": o.get("shop") or "Supermarket",
                                  "sub": "Click and collect" if coll else "Supermarket delivery", "at": at,
                                  "account": o.get("account"), "id": o["id"]})
        # Travel, Home Visits and Tickets today; returns and renewals due today; council deadlines today
        today_s = today.isoformat()
        for a in self._accounts(uid):
            if account_id and a.id != account_id:
                continue
            fd = self.mailer.finds
            for o in fd.active("travel", a.id):
                if o.get("start_at") and o["start_at"] <= end:
                    items.append({"kind": "travel", "title": o.get("title") or "Travel", "at": o["start_at"], "account": a.id, "id": o["id"],
                                  "sub": "Delayed" if o.get("status") == "delayed" else "Cancelled" if o.get("status") == "cancelled" else "Travel"})
            for o in fd.active("visits", a.id):
                if o.get("start_at") and o["start_at"] <= end:
                    items.append({"kind": "visit", "title": o.get("what") or "Home visit", "at": o["start_at"], "account": a.id,
                                  "id": o["id"], "sub": o.get("company") or "Home visit"})
            for o in fd.active("tickets", a.id):
                if o.get("start_at") and o["start_at"] <= end:
                    items.append({"kind": "ticket", "title": o.get("event") or "Event", "at": o.get("doors_at") or o["start_at"],
                                  "account": a.id, "id": o["id"], "sub": o.get("venue") or "Tickets"})
            for o in fd.active("returns", a.id):
                if o.get("return_by") == today_s and o.get("status") in ("started", "label_ready"):
                    items.append({"kind": "return", "title": o.get("item") or "A return", "account": a.id, "id": o["id"],
                                  "sub": "Last day to send back"})
            for o in fd.active("renewals", a.id):
                if o.get("renews") == today_s:
                    items.append({"kind": "renewal", "title": o.get("what") or "Renewal", "account": a.id, "id": o["id"],
                                  "sub": "Renews today"})
            for o in fd.active("council", a.id):
                if today_s in (o.get("date"), o.get("action_by")):
                    items.append({"kind": "council", "title": o.get("title") or "Council", "account": a.id, "id": o["id"],
                                  "sub": "Deadline today" if o.get("action_by") == today_s else "Today"})
        try:
            items += self.mailer.aix.today_extra(uid, account_id)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: Today couldn't add appointments and bills")
        for n in self.mailer.smart.nudges_for(uid):
            if account_id and n.get("account") != account_id:
                continue
            items.append({"kind": "followup", "title": n.get("subject") or "(No subject)", "sub": "Follow up",
                          "account": n.get("account"), "folder": n.get("folder"), "uid": n.get("uid"), "id": n.get("id")})
        return items
