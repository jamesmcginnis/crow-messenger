"""The AI features that work by themselves, and what they remember.

Smart Notifications, Smart Categories, Email Details for automations and the Parcel Tracker
all come from one look at each new email. Follow-Up Nudges look through Sent mail once or
twice a day. Everything is kept with the rest of Crow Messenger Email's private storage, per account.
"""
from __future__ import annotations

import logging
import re
import time
from collections import deque
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.util import dt as dt_util

from . import ai
from .const import EVENT_DETAILS, EVENT_FOLLOW_UP, EVENT_PARCEL
from .mailparse import parse_message
from .manager import Account, MailError, new_id, now_ms

if TYPE_CHECKING:
    from .manager import Mailer

_LOGGER = logging.getLogger(__name__)

MAX_PER_HOUR = 60           # new emails read by the AI, per account
MAX_CATEGORIES = 4000       # remembered per account
FOLLOWUP_EVERY = 12 * 3600  # seconds between looks through Sent mail
FOLLOWUP_AFTER_DAYS = 3     # how long to wait for a reply before suggesting a follow-up
FOLLOWUP_WITHIN_DAYS = 14
DAY_MS = 86400_000
# How long parcels stay in Parcels. Delivered ones go after the household setting (3 days to begin with,
# or never); the rest follow these. "Never" means the Parcel Tracker never removes anything itself.
PARCEL_KEEP_DAYS_DEFAULT = 3
PARCEL_PROBABLY_AFTER = 2 * DAY_MS     # this long past its expected day with no news: probably delivered
PARCEL_UNDATED = 14 * DAY_MS           # no expected day, no news for this long
PARCEL_UNDATED_ABROAD = 45 * DAY_MS    # ... or this long for parcels coming from abroad
PARCEL_PROBLEM = 30 * DAY_MS           # a problem stays until it's dealt with, up to this long
PARCEL_DATED_MAX = 45 * DAY_MS         # an expected day that keeps moving: no news for this long
PARCEL_FORGET_REMOVED = 60 * DAY_MS     # a parcel you deleted isn't added again for this long
PARCEL_ABROAD = re.compile(r"aliexpress|alibaba|temu|shein|wish\.com|banggood|joom|cainiao|yanwen|4px|yunexpress|china ?post|\bcne\b", re.I)
STATUS_ORDER = {s: i for i, s in enumerate(ai.PARCEL_STATUSES)}


class Smart:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        d = mailer.data
        for key in ("cats", "parcels", "parcels_removed", "nudges", "followup_seen"):
            d.setdefault(key, {})
        self.recent: dict[str, deque] = {}
        self.busy: set[str] = set()

    @property
    def data(self) -> dict:
        return self.mailer.data

    def on(self, feature: str) -> bool:
        return ai.on(self.hass, self.mailer, feature)

    # ── new mail ───────────────────────────────────────────────────────────
    def wants(self, a: Account) -> set[str]:
        """Which of the new-mail features apply to this account right now."""
        want = {f for f in ("automation", "parcels", "categories", "appointments", "bills", "food", "groceries", *ai.FIND_KINDS) if self.on(f)}
        if a.acc.get("notify") == "smart" and self.on("notify"):
            want.add("notify")
        if not want:
            return want
        q = self.recent.setdefault(a.id, deque())
        cutoff = time.time() - 3600
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= MAX_PER_HOUR:
            return set()
        q.append(time.time())
        return want

    async def async_text(self, a: Account, it: dict) -> dict | None:
        try:
            raw = await a.async_raw("INBOX", it["uid"])
            msg = await self.hass.async_add_executor_job(parse_message, raw)
        except (MailError, Exception) as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger Email couldn't read email %s for the AI: %s", it.get("uid"), err)
            return None
        msg.setdefault("from", it.get("from"))
        msg.setdefault("to", it.get("to"))
        msg.setdefault("subject", it.get("subject"))
        return msg

    async def async_analyse(self, a: Account, it: dict, msg: dict, want: set[str]) -> dict | None:
        try:
            res = await ai.analyse(self.hass, self.mailer, msg, want)
        except MailError as err:
            _LOGGER.info("Crow Messenger Email couldn't read a new email with the AI: %s", err)
            return None
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email AI reading failed")
            return None
        try:
            self.apply(a, {**it, "message_id": it.get("message_id") or msg.get("message_id") or ""}, res, want)
        except Exception:  # noqa: BLE001 - never let this stop new mail
            _LOGGER.exception("Crow Messenger Email couldn't use what the AI found")
        return res

    def apply(self, a: Account, it: dict, res: dict, want: set[str]) -> None:
        owner = a.acc["owner"]
        if "categories" in want:
            self.remember_categories(a.id, {it["uid"]: res["category"]})
            self.mailer.send_to(owner, {"type": "categories", "account": a.id, "cats": {str(it["uid"]): res["category"]}})
        share = a.acc.get("share_details", True)
        frm = (it.get("from") or [{}])[0]
        if "automation" in want:
            self.hass.bus.async_fire(EVENT_DETAILS, {
                "account": a.acc["email"], "account_id": a.id, "account_name": a.acc.get("name"), "uid": it["uid"],
                "from_name": (frm.get("name") or "") if share else "", "from_email": frm.get("email", "") if share else "",
                "subject": it.get("subject", "") if share else "",
                "category": res["category"], "important": res["important"], "why": res.get("why", ""),
                "kind": res.get("kind", "other"), "summary": res.get("summary", "") if share else "",
                "amount": res.get("amount"), "currency": res.get("currency", ""), "due": res.get("due", ""),
                "when": res.get("when", ""), "location": res.get("location", "") if share else "",
                "reference": res.get("reference", "") if share else "",
                "parcel": res.get("parcel") if share else ({"status": res["parcel"]["status"], "expected": res["parcel"]["expected"]} if res.get("parcel") else None),
                "food": res.get("food") if share else ({"status": res["food"]["status"], "arrive": res["food"]["arrive"]} if res.get("food") else None),
                "grocery": res.get("grocery") if share else ({"status": res["grocery"]["status"], "slot_start": res["grocery"]["slot_start"],
                                                              "slot_end": res["grocery"]["slot_end"]} if res.get("grocery") else None),
            })
        if "parcels" in want and res.get("parcel"):
            self.add_parcel(a, it, res["parcel"])
        if "appointments" in want and res.get("appointment"):
            self.mailer.aix.add_appointment(a, it, res["appointment"])
        if "bills" in want and res.get("bill"):
            self.mailer.aix.add_bill(a, it, res["bill"])
        if "food" in want and res.get("food"):
            self.mailer.orders.add(a, it, "food", res["food"])
        if "groceries" in want and res.get("grocery"):
            self.mailer.orders.add(a, it, "groceries", res["grocery"])
        for kind, found in (res.get("finds") or {}).items():
            if kind in want:
                self.mailer.finds.add(a, it, kind, found)

    # ── Smart Categories ───────────────────────────────────────────────────
    def remember_categories(self, account_id: str, cats: dict[int, str]) -> None:
        book = self.data["cats"].setdefault(account_id, {})
        for uid, cat in cats.items():
            book[str(uid)] = cat
        if len(book) > MAX_CATEGORIES:
            for k in sorted(book, key=lambda x: int(x))[:len(book) - MAX_CATEGORIES]:
                book.pop(k, None)
        self.mailer.save()

    async def async_categories(self, uid: str, items: list[dict]) -> dict[str, dict[str, str]]:
        """The category of each email (account, uid), asking the AI about the ones not seen before."""
        out: dict[str, dict[str, str]] = {}
        missing: dict[str, list[dict]] = {}
        for it in items:
            a = self.mailer.accounts.get(it.get("account"))
            if not a or a.acc["owner"] != uid:
                continue
            known = self.data["cats"].get(a.id, {}).get(str(it["uid"]))
            if known:
                out.setdefault(a.id, {})[str(it["uid"])] = known
            else:
                missing.setdefault(a.id, []).append(it)
        if not self.on("categories"):
            return out
        for acc_id, lst in missing.items():
            for i in range(0, min(len(lst), 120), 40):   # as many as the card asks for at once
                key = f"cat:{acc_id}:{lst[i]['uid']}"
                if key in self.busy:
                    continue
                self.busy.add(key)
                try:
                    got = await ai.categorise(self.hass, self.mailer, lst[i:i + 40])
                finally:
                    self.busy.discard(key)
                self.remember_categories(acc_id, got)
                out.setdefault(acc_id, {}).update({str(k): v for k, v in got.items()})
        return out

    # ── Parcel Tracker ─────────────────────────────────────────────────────
    def parcels(self, account_id: str) -> list[dict]:
        return self.data["parcels"].get(account_id, [])

    def parcels_for(self, uid: str) -> list[dict]:
        out = []
        for a in self.mailer.accounts.values():
            if a.acc["owner"] == uid:
                out += [{**p, "account": a.id, "remove_at": self.expires(p)} for p in self.parcels(a.id)]
        return sorted(out, key=_parcel_sort)

    # ── when parcels leave Parcels ──
    def keep_ms(self) -> int | None:
        days = self.mailer.settings.get("parcel_keep_days", PARCEL_KEEP_DAYS_DEFAULT)
        return None if not days else int(days) * DAY_MS

    def expires(self, p: dict) -> int | None:
        """When this parcel will be taken out of Parcels (None: it won't be, by itself)."""
        keep = self.keep_ms()
        if keep is None:
            return None
        now = now_ms()
        upd = p.get("updated", now)
        status = p.get("status")
        if status == "delivered":
            return p.get("delivered_at", upd) + keep
        # keeping parcels longer (say a month or a year) keeps the ones with no news at least that long too
        if status == "problem":
            return upd + max(PARCEL_PROBLEM, keep)
        exp = _expected_end(p.get("expected"))
        if exp:
            # the "probably delivered" clock starts at the expected day, or at the latest news if that's later
            return min(max(exp, upd) + PARCEL_PROBABLY_AFTER + keep, upd + max(PARCEL_DATED_MAX, keep))
        return upd + max(PARCEL_UNDATED_ABROAD if p.get("abroad") or _abroad(p) else PARCEL_UNDATED, keep)

    def _same(self, p: dict, old: dict) -> bool:
        """The same parcel: the same tracking number, or (without one) the same shop and item."""
        if p.get("tracking") and old.get("tracking") == p["tracking"]:
            return True
        if not p.get("tracking") or not old.get("tracking"):
            same_shop = (p.get("retailer") or p.get("courier") or "").lower() == (old.get("retailer") or old.get("courier") or "").lower()
            item = (old.get("ai_item") or old.get("item") or "").lower()   # a renamed parcel still matches what the AI calls it
            return bool(p.get("item")) and same_shop and p["item"].lower() == item
        return False

    def was_removed(self, a: Account, p: dict, message_id: str = "") -> dict | None:
        """A parcel deleted from Parcels in the last 60 days (by its emails or its tracking number)."""
        now = now_ms()
        mem = self.data["parcels_removed"].setdefault(a.id, [])
        mem[:] = [r for r in mem if now - r.get("at", now) < PARCEL_FORGET_REMOVED]
        for r in mem:
            if message_id and message_id in (r.get("message_ids") or []):
                return r
            if self._same(p, r.get("parcel") or {}):
                return r
        return None

    def add_parcel(self, a: Account, it: dict, p: dict, force: bool = False) -> dict | None:
        """Add a parcel, or update the one it's about. One you deleted isn't added again unless you ask (force)."""
        lst = self.data["parcels"].setdefault(a.id, [])
        self._tidy(lst)
        gone = self.was_removed(a, p, it.get("message_id") or "")
        if gone:
            if not force:
                return None
            self.data["parcels_removed"][a.id].remove(gone)   # added back on purpose: forget it was deleted
            if gone.get("parcel") and not any(x["id"] == gone["parcel"].get("id") for x in lst):
                lst.append(dict(gone["parcel"]))   # the same parcel as before (with your name for it)
        match = next((old for old in lst if self._same(p, old)), None)
        now = now_ms()
        frm = (it.get("from") or [{}])[0]
        if match:
            changed = (STATUS_ORDER.get(p["status"], 0) >= STATUS_ORDER.get(match["status"], 0) or p["status"] == "problem"
                       or bool(match.get("probable")))   # "probably delivered" was a guess: real news wins
            for k in ("item", "retailer", "courier", "tracking", "tracking_url", "expected"):
                if p.get(k) and not (k == "item" and match.get("renamed")):   # your own name for it stays
                    match[k] = p[k]
            if changed:
                match["status"] = p["status"]
                match.pop("probable", None)
            match.update({"uid": it["uid"], "folder": it.get("folder") or "INBOX", "updated": now, "subject": it.get("subject", "")})
            if it.get("message_id"):
                match["message_id"] = it["message_id"]
                match["message_ids"] = [*[x for x in match.get("message_ids") or [] if x != it["message_id"]], it["message_id"]][-10:]
            if p["status"] == "delivered":
                match["delivered_at"] = now
            item = match
        else:
            item = {"id": new_id(), **p, "uid": it["uid"], "folder": it.get("folder") or "INBOX", "subject": it.get("subject", ""),
                    "from": frm.get("name") or frm.get("email") or "", "added": now, "updated": now,
                    "message_id": it.get("message_id") or "", "message_ids": [it["message_id"]] if it.get("message_id") else []}
            if p["status"] == "delivered":
                item["delivered_at"] = now
            lst.append(item)
        item["abroad"] = _abroad(item)
        self.mailer.save()
        self.hass.bus.async_fire(EVENT_PARCEL, {"account": a.acc["email"], "account_id": a.id, **{
            k: item.get(k) for k in ("id", "item", "retailer", "courier", "status", "expected", "tracking")}})
        self._changed(a)
        return item

    def _remember_removed(self, a: Account, p: dict) -> None:
        mem = self.data["parcels_removed"].setdefault(a.id, [])
        mem.append({"at": now_ms(), "message_ids": list(p.get("message_ids") or ([p["message_id"]] if p.get("message_id") else [])),
                    "parcel": {k: v for k, v in p.items() if k != "remove_at"}})
        del mem[:-200]

    def _tidy(self, lst: list[dict]) -> tuple[list[dict], bool]:
        """Parcels past their expected day become "probably delivered", and expired ones go.
        Answers the parcels taken out, and whether anything changed."""
        if self.keep_ms() is None:
            return [], False
        now = now_ms()
        changed = False
        for p in lst:
            exp = _expected_end(p.get("expected"))
            start = max(exp, p.get("updated", now)) if exp else None
            if start and p.get("status") not in ("delivered", "problem") and now >= start + PARCEL_PROBABLY_AFTER:
                p.update({"status": "delivered", "probable": True, "delivered_at": start + PARCEL_PROBABLY_AFTER})
                changed = True
        gone = [p for p in lst if (self.expires(p) or now + 1) <= now]
        if gone:
            lst[:] = [p for p in lst if p not in gone]
            changed = True
        return gone, changed

    def tidy_all(self) -> None:
        """Run from the regular tick: save, and tell the card, the sensors and automations."""
        for aid, lst in list(self.data["parcels"].items()):
            gone, changed = self._tidy(lst)
            if not changed:
                continue
            self.mailer.save()
            a = self.mailer.accounts.get(aid)
            if not a:
                continue
            for p in gone:
                self.hass.bus.async_fire(EVENT_PARCEL, {"account": a.acc["email"], "account_id": a.id,
                                                        **{k: p.get(k) for k in ("id", "item", "retailer", "courier", "expected", "tracking")},
                                                        "status": "removed"})
            self._changed(a)

    def drop_parcels(self, a: Account, folder: str, uids: list[int]) -> None:
        """Email reported as junk or phishing: its parcel goes too (fake delivery emails are a common scam)."""
        lst = self.data["parcels"].get(a.id) or []
        hit = [p for p in lst if (p.get("folder") or "INBOX") == folder and int(p.get("uid") or 0) in {int(u) for u in uids}]
        if not hit:
            return
        lst[:] = [p for p in lst if p not in hit]
        for p in hit:
            self._remember_removed(a, p)
        self.mailer.save()
        for p in hit:
            self.hass.bus.async_fire(EVENT_PARCEL, {"account": a.acc["email"], "account_id": a.id,
                                                    **{k: p.get(k) for k in ("id", "item", "retailer", "courier", "expected", "tracking")},
                                                    "status": "removed"})
        self._changed(a)

    async def async_locate(self, uid: str, account_id: str, pid: str) -> dict:
        """Where a parcel's email is now: it may have been archived or deleted since."""
        a = self.mailer.account(uid, account_id)
        p = next((x for x in self.parcels(a.id) if x["id"] == pid), None)
        if not p:
            raise MailError("not_found", "That parcel isn't in Parcels any more.")
        mid = p.get("message_id") or ""
        if not mid:
            return {"folder": p.get("folder") or "INBOX", "uid": p.get("uid")}
        tried = []
        for kind in (None, "inbox", "archive", "trash", "junk"):
            path = (p.get("folder") or "INBOX") if kind is None else ("INBOX" if kind == "inbox" else a.special(kind))
            if not path or path in tried:
                continue
            tried.append(path)
            try:
                found = await a.async_find(path, mid)
            except MailError:
                found = None
            if found:
                if (path, found) != (p.get("folder"), p.get("uid")):
                    p.update({"folder": path, "uid": found})
                    self.mailer.save()
                return {"folder": path, "uid": found, "trash": path == a.special("trash")}
        raise MailError("not_found", "The email for this parcel has been deleted.")

    def parcel_action(self, uid: str, account_id: str, pid: str, action: str, name: str = "") -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.data["parcels"].setdefault(a.id, [])
        if action == "restore":   # Undo after deleting
            mem = self.data["parcels_removed"].setdefault(a.id, [])
            r = next((x for x in mem if (x.get("parcel") or {}).get("id") == pid), None)
            if r:
                mem.remove(r)
                if not any(x["id"] == pid for x in lst):
                    lst.append({**r["parcel"], "updated": max(r["parcel"].get("updated", 0), now_ms() - DAY_MS)})
        for p in list(lst):
            if p["id"] != pid:
                continue
            if action == "remove":
                lst.remove(p)
                self._remember_removed(a, p)
                self.hass.bus.async_fire(EVENT_PARCEL, {"account": a.acc["email"], "account_id": a.id,
                                                        **{k: p.get(k) for k in ("id", "item", "retailer", "courier", "expected", "tracking")},
                                                        "status": "removed"})
            elif action == "delivered":
                p.update({"status": "delivered", "delivered_at": now_ms(), "updated": now_ms()})
                p.pop("probable", None)
            elif action == "undelivered":   # Not Yet: back on its way (a "probably delivered" guess was wrong)
                p.update({"status": "in_transit", "updated": now_ms()})
                p.pop("probable", None)
                p.pop("delivered_at", None)
                if p.get("expected") and (_expected_end(p["expected"]) or 0) < now_ms():
                    p["expected"] = ""   # its old date has passed: wait for news instead
            elif action == "rename" and name.strip():
                p.setdefault("ai_item", p.get("item") or "")
                p.update({"item": name.strip()[:120], "renamed": True})
        self.mailer.save()
        self._changed(a)
        return self.parcels_for(uid)

    def _changed(self, a: Account) -> None:
        a.publish()
        self.mailer.send_to(a.acc["owner"], {"type": "parcels", "parcels": self.parcels_for(a.acc["owner"])})

    # ── Follow-Up Nudges ───────────────────────────────────────────────────
    def nudges_for(self, uid: str) -> list[dict]:
        out = []
        now = now_ms()
        for a in self.mailer.accounts.values():
            if a.acc["owner"] == uid:
                out += [{**n, "account": a.id} for n in self.data["nudges"].get(a.id, []) if n.get("snooze", 0) <= now]
        return sorted(out, key=lambda n: n.get("date", 0), reverse=True)

    def nudge_action(self, uid: str, account_id: str, nid: str, action: str) -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.data["nudges"].setdefault(a.id, [])
        for n in list(lst):
            if n["id"] == nid:
                if action == "snooze":
                    n["snooze"] = now_ms() + 2 * 86400_000
                else:
                    lst.remove(n)
        self.mailer.save()
        self.mailer.send_to(uid, {"type": "nudges", "nudges": self.nudges_for(uid)})
        a.publish()   # the Waiting for a reply sensor
        return self.nudges_for(uid)

    def replied_by(self, a: Account, email_addr: str) -> None:
        """A reply arrived from someone: no need to follow up with them any more."""
        email_addr = (email_addr or "").lower()
        lst = self.data["nudges"].get(a.id)
        if not lst or not email_addr:
            return
        keep = [n for n in lst if email_addr not in [x.lower() for x in n.get("to_emails", [])]]
        if len(keep) != len(lst):
            self.data["nudges"][a.id] = keep
            self.mailer.save()
            self.mailer.send_to(a.acc["owner"], {"type": "nudges", "nudges": self.nudges_for(a.acc["owner"])})
            a.publish()

    def tick(self) -> None:
        self.tidy_all()
        try:
            self.mailer.orders.tidy_all()
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: tidying food orders and supermarket deliveries failed")
        try:
            self.mailer.finds.tidy_all()
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email: tidying travel, returns, renewals and the rest failed")
        if not self.on("followup"):
            return
        for a in list(self.mailer.accounts.values()):
            st = self.data["state"].setdefault(a.id, {})
            if time.time() - st.get("followup_at", 0) >= FOLLOWUP_EVERY and f"fu:{a.id}" not in self.busy:
                self.hass.async_create_task(self.async_follow_ups(a))

    async def async_follow_ups(self, a: Account) -> None:
        key = f"fu:{a.id}"
        if key in self.busy:
            return
        self.busy.add(key)
        try:
            await self._follow_ups(a)
        except MailError as err:
            _LOGGER.info("Crow Messenger Email couldn't look for follow-ups in %s: %s", a.acc["email"], err)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email follow-up check failed")
        finally:
            self.busy.discard(key)

    async def _follow_ups(self, a: Account) -> None:
        st = self.data["state"].setdefault(a.id, {})
        st["followup_at"] = time.time()
        self.mailer.save()
        sent = await a.async_special("sent")
        if not sent:
            return
        seen = self.data["followup_seen"].setdefault(a.id, [])
        seen_set = set(seen)
        today = dt_util.now().date()
        since = (today - timedelta(days=FOLLOWUP_WITHIN_DAYS)).strftime("%d-%b-%Y")
        before = (today - timedelta(days=FOLLOWUP_AFTER_DAYS - 1)).strftime("%d-%b-%Y")
        me = a.acc["email"].lower()

        def look():
            uids = a.cmd.search(sent, "SINCE", since, "BEFORE", before)[:40]
            items = a.cmd.headers(sent, uids, {})
            fresh = [i for i in items if i.get("message_id") and i["message_id"] not in seen_set]
            waiting = []
            for it in fresh:
                to = [p["email"].lower() for p in (it.get("to") or []) if p.get("email") and p["email"].lower() != me]
                if not to or any(x.startswith(("noreply", "no-reply", "donotreply", "do-not-reply")) for x in to):
                    continue
                mid = it["message_id"].replace('"', "")
                when = datetime.fromtimestamp(it["date"] / 1000).strftime("%d-%b-%Y")
                answered = a.cmd.search("INBOX", "OR", "HEADER", "In-Reply-To", f'"{mid}"', "HEADER", "References", f'"{mid}"')
                if not answered:
                    crit: list[str] = []
                    for x in to[:4]:
                        crit = ["OR", "FROM", f'"{x}"', *crit] if crit else ["FROM", f'"{x}"']
                    answered = a.cmd.search("INBOX", "SINCE", when, *crit)
                if not answered:
                    it["to_emails"] = to
                    waiting.append(it)
            return fresh, waiting

        fresh, waiting = await a.job(look)
        for it in fresh:
            seen.append(it["message_id"])
        del seen[:-600]
        found = await ai.follow_ups(self.hass, self.mailer, waiting[:25]) if waiting else {}
        lst = self.data["nudges"].setdefault(a.id, [])
        known = {n.get("message_id") for n in lst}
        for idx, why in found.items():
            it = waiting[idx]
            if it["message_id"] in known:
                continue
            n = {"id": new_id(), "uid": it["uid"], "folder": sent, "message_id": it["message_id"],
                 "subject": it.get("subject", ""), "to": it.get("to", []), "to_emails": it["to_emails"],
                 "date": it["date"], "why": why, "preview": (it.get("preview") or "")[:200]}
            lst.append(n)
            share = a.acc.get("share_details", True)
            self.hass.bus.async_fire(EVENT_FOLLOW_UP, {
                "account": a.acc["email"], "account_id": a.id, "uid": it["uid"],
                "subject": n["subject"] if share else "", "to": n["to_emails"] if share else [],
                "sent": dt_util.utc_from_timestamp(it["date"] / 1000).isoformat(), "why": why if share else ""})
        # forget nudges older than the window
        cutoff = now_ms() - (FOLLOWUP_WITHIN_DAYS + 7) * 86400_000
        lst[:] = [n for n in lst if n.get("date", 0) >= cutoff]
        self.mailer.save()
        self.mailer.send_to(a.acc["owner"], {"type": "nudges", "nudges": self.nudges_for(a.acc["owner"])})
        a.publish()

    # ── Smart Search ───────────────────────────────────────────────────────
    async def async_search(self, uid: str, query: str, account_id: str | None) -> dict:
        terms = await ai.search_query(self.hass, self.mailer, query)
        accounts = [self.mailer.account(uid, account_id)] if account_id else \
            [a for a in self.mailer.accounts.values() if a.acc["owner"] == uid]
        out: list[dict] = []
        errors = {}
        for a in accounts:
            folders = []
            if terms["folder"] in ("inbox", "any"):
                folders.append("INBOX")
            if terms["folder"] in ("sent", "any"):
                folders.append(await a.async_special("sent"))
            if terms["folder"] == "any":
                folders.append(await a.async_special("archive"))
            for path in dict.fromkeys(f for f in folders if f):
                try:
                    out += await self._search(a, path, terms)
                except MailError as err:
                    errors[a.id] = str(err)
        if not out and terms["words"]:
            # too specific: try again with just who, when and the subject
            relaxed = {**terms, "words": ""}
            if relaxed["from"] or relaxed["subject"] or relaxed["since"]:
                for a in accounts:
                    try:
                        out += await self._search(a, "INBOX", relaxed)
                    except MailError:
                        pass
        seen = set()
        uniq = []
        for it in sorted(out, key=lambda i: i["date"], reverse=True):
            k = (it["account"], it.get("message_id") or f"{it['folder']}:{it['uid']}")
            if k not in seen:
                seen.add(k)
                uniq.append(it)
        for it in uniq:
            frm = (it.get("from") or [{}])[0]
            it["vip"] = self.mailer.is_vip(uid, frm.get("email", ""))
        return {"items": uniq[:100], "errors": errors, "explain": terms["explain"], "terms": terms}

    async def _search(self, a: Account, path: str, t: dict) -> list[dict]:
        crit: list[str] = []

        def add(key: str, value: str) -> None:
            value = " ".join(w for w in value.split() if w.isascii())   # (servers differ on searching other letters)
            if value:
                crit.extend([key, f'"{value}"'])
        add("FROM", t["from"])
        add("TO", t["to"])
        add("SUBJECT", t["subject"])
        for w in t["words"].split()[:4]:
            add("TEXT", w)
        for key, field in (("SINCE", "since"), ("BEFORE", "before")):
            if t[field]:
                crit += [key, datetime.strptime(t[field], "%Y-%m-%d").strftime("%d-%b-%Y")]
        if t["unread"]:
            crit.append("UNSEEN")
        if t["flagged"]:
            crit.append("FLAGGED")
        if not crit:
            crit = ["ALL"]
        prev = a.previews.setdefault(path, {})

        def run():
            uids = a.cmd.search(path, *crit)
            return a.cmd.headers(path, uids[:60], prev)

        items = await a.job(run)
        if t["attachments"]:
            items = [i for i in items if i.get("attachments")]
        for it in items:
            it["account"], it["folder"] = a.id, path
        return items


def _expected_end(day: str | None) -> int | None:
    """The end of a parcel's expected day, local time, in ms."""
    d = dt_util.parse_date(str(day or "")[:10]) if day else None
    if not d:
        return None
    end = datetime.combine(d, datetime.max.time().replace(microsecond=0), tzinfo=dt_util.DEFAULT_TIME_ZONE)
    return int(end.timestamp() * 1000)


def _abroad(p: dict) -> bool:
    """Coming from abroad (slower): an international post number from another country, or a shop that ships from abroad."""
    t = str(p.get("tracking") or "").upper()
    if re.fullmatch(r"[A-Z]{2}\d{9}[A-Z]{2}", t) and not t.endswith("GB"):
        return True
    return bool(PARCEL_ABROAD.search(" ".join(str(p.get(k) or "") for k in ("retailer", "courier", "from", "subject"))))


def _parcel_sort(p: dict) -> tuple:
    delivered = p.get("status") == "delivered"
    return (delivered, p.get("expected") or "9999", -p.get("updated", 0))

