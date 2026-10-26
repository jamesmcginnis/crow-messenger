"""More things the AI finds in new email, each with a section of its own in the card:
Travel, Returns and Refunds, Renewals, Home Visits, Tickets, Council and Local, and Receipts.

They share one store. What differs between them (the fields, how two emails are known to be
about the same booking, when one is finished and when it leaves) is in KINDS below.
Sign-in codes are here too, but they don't use the AI and are never saved or shared.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_PREFIX
from .manager import Account, MailError, new_id, now_ms

if TYPE_CHECKING:
    from .manager import Mailer

_LOGGER = logging.getLogger(__name__)

HOUR_MS = 3600_000
DAY_MS = 86400_000
FORGET_REMOVED = 60 * DAY_MS
TRIP_GAP = 2 * DAY_MS        # bookings further apart than this are separate trips

# kind: the AI feature (and the card's section), "key": what the AI answers with
KINDS: dict[str, dict[str, Any]] = {
    "travel": {
        "key": "travel", "event": f"{EVENT_PREFIX}_travel", "max": 100,
        "fields": ("type", "title", "provider", "number", "from", "to", "start", "end", "terminal", "gate", "seat",
                   "reference", "status", "delay_minutes", "checkin_opens", "trip"),
        "dates": ("start", "end", "checkin_opens"),
        "statuses": ("booked", "changed", "delayed", "cancelled"),
        "finished": ("cancelled",), "private": ("title", "provider", "number", "from", "to", "seat", "reference", "trip"),
    },
    "returns": {
        "key": "return", "event": f"{EVENT_PREFIX}_return", "max": 100,
        "fields": ("shop", "item", "status", "return_by", "method", "refund_amount", "currency", "reference"),
        "dates": ("return_by",),
        "statuses": ("started", "label_ready", "sent", "received", "refunded", "rejected"),
        "finished": ("refunded", "rejected"), "private": ("shop", "item", "reference"),
    },
    "renewals": {
        "key": "renewal", "event": f"{EVENT_PREFIX}_renewal", "max": 100,
        "fields": ("what", "provider", "renews", "price", "previous_price", "currency", "auto_renew", "reference", "status"),
        "dates": ("renews",),
        "statuses": ("upcoming", "renewed", "cancelled"),
        "finished": ("renewed", "cancelled"), "private": ("provider", "reference"),
    },
    "visits": {
        "key": "visit", "event": f"{EVENT_PREFIX}_visit", "max": 100,
        "fields": ("what", "company", "start", "end", "status", "reference"),
        "dates": ("start", "end"),
        "statuses": ("booked", "changed", "on_the_way", "done", "cancelled"),
        "finished": ("done", "cancelled"), "private": ("company", "reference"),
    },
    "tickets": {
        "key": "ticket", "event": f"{EVENT_PREFIX}_ticket", "max": 100,
        "fields": ("event", "venue", "start", "doors", "seats", "quantity", "reference", "status"),
        "dates": ("start", "doors"),
        "statuses": ("booked", "changed", "cancelled"),
        "finished": ("cancelled",), "private": ("event", "venue", "seats", "reference"),
    },
    "council": {
        "key": "council", "event": f"{EVENT_PREFIX}_council", "max": 100,
        "fields": ("topic", "title", "date", "action_by", "detail", "organisation"),
        "dates": ("date", "action_by"),
        "statuses": (), "finished": (), "private": ("title", "detail"),
    },
    "receipts": {
        "key": "receipt", "event": f"{EVENT_PREFIX}_receipt", "max": 300,
        "fields": ("shop", "item", "price", "currency", "purchased", "warranty_until", "reference"),
        "dates": ("purchased", "warranty_until"),
        "statuses": (), "finished": (), "private": ("shop", "item", "reference"),
    },
}
COUNCIL_TOPICS = ("bins", "council_tax", "school", "roads", "consultation", "other")
TRAVEL_TYPES = ("flight", "train", "hotel", "car", "ferry", "coach", "other")


def local_ms(v: str) -> int | None:
    """A local "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD" as milliseconds (a day on its own: its start)."""
    if not v:
        return None
    try:
        d = datetime.fromisoformat(v)
    except ValueError:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt_util.get_default_time_zone())
    return int(d.timestamp() * 1000)


def _low(v: Any) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip().lower()


def _day(v: str) -> str:
    return (v or "")[:10]


def _same(kind: str, o: dict, old: dict) -> bool:
    """Two emails about the same booking, return, renewal…"""
    if o.get("reference") and old.get("reference") and _low(o["reference"]) == _low(old["reference"]):
        if kind != "travel":
            return True
        # one booking reference can cover several flights: the same one is the same flight (or the same day)
        return (_low(o.get("number")) == _low(old.get("number")) or not o.get("number")) and \
            (not o.get("start") or not old.get("start") or _day(o["start"]) == _day(old["start"]))
    if kind == "travel":
        if o.get("number") and _low(o["number"]) == _low(old.get("number")):
            return not o.get("start") or _day(o["start"]) == _day(old.get("start", ""))
        return bool(o.get("start")) and o.get("type") == old.get("type") and _low(o.get("provider")) == _low(old.get("provider")) \
            and _day(o["start"]) == _day(old.get("start", ""))
    if kind == "returns":
        return bool(o.get("item")) and _low(o.get("shop")) == _low(old.get("shop")) and _low(o["item"]) == _low(old.get("item"))
    if kind == "renewals":
        return bool(o.get("what")) and _low(o["what"]) == _low(old.get("what")) and _low(o.get("provider")) == _low(old.get("provider"))
    if kind == "visits":
        if _low(o.get("company")) != _low(old.get("company")) or not o.get("company"):
            return False
        if o.get("start") and old.get("start"):
            return _day(o["start"]) == _day(old["start"]) or old.get("status") not in KINDS["visits"]["finished"]
        return old.get("status") not in KINDS["visits"]["finished"]
    if kind == "tickets":
        return bool(o.get("event")) and _low(o["event"]) == _low(old.get("event")) and _day(o.get("start", "")) == _day(old.get("start", ""))
    if kind == "council":
        return bool(o.get("title")) and _low(o["title"]) == _low(old.get("title")) and o.get("date", "") == old.get("date", "")
    if kind == "receipts":
        return bool(o.get("item")) and _low(o.get("shop")) == _low(old.get("shop")) and _low(o["item"]) == _low(old.get("item")) \
            and o.get("purchased", "") == old.get("purchased", "")
    return False


def finished(kind: str, o: dict) -> bool:
    return o.get("status") in KINDS[kind]["finished"]


def leaves_at(kind: str, o: dict) -> int:
    """When it's taken out of its section."""
    added = o.get("added", now_ms())
    fin = o.get("finished_at")
    if kind == "travel":
        if o.get("status") == "cancelled":
            return (fin or added) + 2 * DAY_MS
        last = o.get("end_at") or o.get("start_at")
        return last + 2 * DAY_MS if last else added + 60 * DAY_MS
    if kind == "returns":
        if fin:
            return fin + 14 * DAY_MS
        return (o.get("return_by_at") or added + 30 * DAY_MS) + 30 * DAY_MS
    if kind == "renewals":
        if fin:
            return fin + 7 * DAY_MS
        return (o.get("renews_at") or added + 365 * DAY_MS) + 7 * DAY_MS
    if kind == "visits":
        if fin:
            return fin + DAY_MS
        last = o.get("end_at") or ((o.get("start_at") or 0) + 4 * HOUR_MS if o.get("start_at") else None)
        return last + DAY_MS if last else added + 30 * DAY_MS
    if kind == "tickets":
        if o.get("status") == "cancelled":
            return (fin or added) + 2 * DAY_MS
        return (o["start_at"] + DAY_MS) if o.get("start_at") else added + 180 * DAY_MS
    if kind == "council":
        last = max(o.get("date_at") or 0, o.get("action_by_at") or 0)
        return last + 3 * DAY_MS if last else added + 30 * DAY_MS
    # receipts: until the warranty's over (and a month), or two years
    if o.get("warranty_until_at"):
        return o["warranty_until_at"] + 30 * DAY_MS
    return (o.get("purchased_at") or added) + 730 * DAY_MS


def trips(segments: list[dict]) -> list[dict]:
    """Travel bookings grouped into trips: ones less than two days apart go together."""
    segs = sorted([s for s in segments if s.get("start_at") and s.get("status") != "cancelled"], key=lambda s: s["start_at"])
    out: list[dict] = []
    for s in segs:
        end = s.get("end_at") or s["start_at"]
        if out and s["start_at"] - out[-1]["end"] <= TRIP_GAP:
            t = out[-1]
            t["end"] = max(t["end"], end)
            t["ids"].append(s["id"])
        else:
            out.append({"start": s["start_at"], "end": end, "ids": [s["id"]], "name": ""})
    by_id = {s["id"]: s for s in segs}
    for t in out:
        first = [by_id[i] for i in t["ids"]]
        named = next((x.get("trip") for x in first if x.get("trip")), "")
        going = next((x.get("to") for x in first if x.get("type") != "hotel" and x.get("to")), "")
        stay = next((x.get("to") or x.get("provider") for x in first if x.get("type") == "hotel"), "")
        t["name"] = named or going or stay or first[0].get("title") or "Trip"
        # away from home: a trip with somewhere to stay, more than one booking, or that lasts over 12 hours
        t["away"] = any(x.get("type") == "hotel" for x in first) or len(first) > 1 or t["end"] - t["start"] > 12 * HOUR_MS
    return out


# ── sign-in codes: found without the AI, kept for 10 minutes, in memory only ──
CODE_MINUTES = 10
_CODE_HINT = re.compile(r"\b(code|passcode|pass code|one[- ]time|otp|verif|sign[- ]?in|log[- ]?in|2fa|two[- ]factor|"
                        r"security code|authenticat|confirm your)", re.I)
_PROMO = re.compile(r"discount|promo|voucher|coupon|\boffer|% off|\bsave\b|checkout|gift card|referral", re.I)
_CODE = re.compile(r"(?<![\w£$€#/.:-])(\d{4,8}|\d{3}[ -]\d{3}|[A-Z0-9]{6,8})(?![\w/:-]|\.\w)")


def find_code(subject: str, text: str) -> str | None:
    """A one-time code: digits (or capitals and digits, with at least two digits) near the word code."""
    if not _CODE_HINT.search(f"{subject} {text[:600]}"):
        return None
    for chunk in (subject, text[:1500]):
        for m in _CODE.finditer(chunk or ""):
            c = m.group(1)
            # part of a longer run of digits (a phone or card number), not a code
            if re.match(r"[ -]?\d", chunk[m.end():m.end() + 2]) or re.search(r"\d[ -]?$", chunk[max(0, m.start() - 2):m.start()]):
                continue
            near = chunk[max(0, m.start() - 120):m.end() + 40]
            if not _CODE_HINT.search(near) or _PROMO.search(chunk[max(0, m.start() - 40):m.end() + 30]):
                continue
            plain = c.replace(" ", "").replace("-", "")
            if plain.isdigit():
                if re.fullmatch(r"(19|20)\d\d", plain) and len(plain) == 4:
                    continue   # a year
                return c
            if sum(ch.isdigit() for ch in plain) >= 2 and not plain.isdigit() and plain.isupper():
                return c
    return None


class Finds:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        d = mailer.data.setdefault("finds", {})
        for k in KINDS:
            d.setdefault(k, {})
        mailer.data.setdefault("finds_removed", {})
        self.codes: dict[str, list[dict]] = {}

    @property
    def store(self) -> dict:
        return self.mailer.data["finds"]

    # ── reading ────────────────────────────────────────────────────────────
    def items(self, kind: str, account_id: str) -> list[dict]:
        return self.store[kind].get(account_id, [])

    def list_for(self, uid: str, kind: str) -> list[dict]:
        out = []
        for a in self.mailer.accounts.values():
            if a.acc["owner"] == uid:
                out += [{**o, "account": a.id, "leaves_at": leaves_at(kind, o)} for o in self.items(kind, a.id)]
        return sorted(out, key=lambda o: (finished(kind, o), self.when(kind, o) or 9e15))

    @staticmethod
    def when(kind: str, o: dict) -> int | None:
        return {"travel": o.get("start_at"), "returns": o.get("return_by_at"), "renewals": o.get("renews_at"),
                "visits": o.get("start_at"), "tickets": o.get("start_at"),
                "council": o.get("action_by_at") or o.get("date_at"), "receipts": o.get("warranty_until_at")}[kind]

    def active(self, kind: str, account_id: str) -> list[dict]:
        """Not finished and not over yet, soonest first."""
        now = now_ms()
        out = []
        for o in self.items(kind, account_id):
            if finished(kind, o):
                continue
            if kind in ("travel", "visits", "tickets"):
                last = o.get("end_at") or ((o.get("start_at") or 0) + (4 * HOUR_MS if kind != "travel" else HOUR_MS))
                if o.get("start_at") and last < now:
                    continue
            out.append(o)
        return sorted(out, key=lambda o: self.when(kind, o) or 9e15)

    # ── adding (from new email) ────────────────────────────────────────────
    def _was_removed(self, a: Account, kind: str, o: dict, mid: str) -> dict | None:
        now = now_ms()
        mem = self.mailer.data["finds_removed"].setdefault(a.id, [])
        mem[:] = [r for r in mem if now - r.get("at", now) < FORGET_REMOVED]
        for r in mem:
            if r.get("kind") != kind:
                continue
            if mid and mid in (r.get("message_ids") or []):
                return r
            if _same(kind, o, r.get("item") or {}):
                return r
        return None

    def add(self, a: Account, it: dict, kind: str, o: dict, force: bool = False) -> dict | None:
        cfg = KINDS[kind]
        mid = it.get("message_id") or ""
        gone = self._was_removed(a, kind, o, mid)
        if gone:
            if not force:
                return None
            self.mailer.data["finds_removed"][a.id].remove(gone)
        lst = self.store[kind].setdefault(a.id, [])
        match = next((old for old in lst if _same(kind, o, old)), None)
        now = now_ms()
        changed_status = False
        if match:
            for k in cfg["fields"]:
                if k == "status":
                    continue
                if o.get(k) not in (None, "", []):
                    match[k] = o[k]
            if o.get("status") and o["status"] != match.get("status"):
                # a return or a renewal only moves forwards; news about travel, a visit or tickets always counts
                order = {s: i for i, s in enumerate(cfg["statuses"])}
                if kind not in ("returns", "renewals") or order.get(o["status"], 0) >= order.get(match.get("status"), 0):
                    match["status"] = o["status"]
                    changed_status = True
            match.update({"uid": it["uid"], "folder": it.get("folder") or "INBOX", "updated": now, "subject": it.get("subject", "")})
            if mid:
                match["message_id"] = mid
                match["message_ids"] = [*[x for x in match.get("message_ids") or [] if x != mid], mid][-10:]
            item = match
        else:
            frm = (it.get("from") or [{}])[0]
            item = {"id": new_id(), "kind": kind, **{k: o.get(k) for k in cfg["fields"] if k in o},
                    "uid": it["uid"], "folder": it.get("folder") or "INBOX", "subject": it.get("subject", ""),
                    "sender": frm.get("name") or frm.get("email") or "", "added": now, "updated": now,
                    "message_id": mid, "message_ids": [mid] if mid else []}
            lst.append(item)
            del lst[:-cfg["max"]]
            changed_status = True
        for k in cfg["dates"]:
            item[f"{k}_at"] = local_ms(item.get(k) or "")
        if finished(kind, item):
            item.setdefault("finished_at", now)
        else:
            item.pop("finished_at", None)
        self.mailer.save()
        self._event(a, kind, item, "added" if not match else "changed" if changed_status else "updated")
        self._changed(a, kind)
        return item

    # ── tidying ────────────────────────────────────────────────────────────
    def tidy_all(self) -> None:
        now = now_ms()
        for kind in KINDS:
            for aid, lst in list(self.store[kind].items()):
                gone = [o for o in lst if leaves_at(kind, o) <= now]
                if not gone:
                    continue
                lst[:] = [o for o in lst if o not in gone]
                self.mailer.save()
                a = self.mailer.accounts.get(aid)
                if a:
                    for o in gone:
                        self._event(a, kind, o, "removed")
                    self._changed(a, kind)
        # sign-in codes past their 10 minutes
        for uid, lst in list(self.codes.items()):
            keep = [c for c in lst if c["until"] > now]
            if len(keep) != len(lst):
                self.codes[uid] = keep
                self.mailer.send_to(uid, {"type": "codes", "codes": keep})

    def drop(self, a: Account, folder: str, uids: list[int]) -> None:
        """Email reported as junk or phishing: what was found in it goes too."""
        want = {int(u) for u in uids}
        for kind in KINDS:
            lst = self.store[kind].get(a.id) or []
            hit = [o for o in lst if (o.get("folder") or "INBOX") == folder and int(o.get("uid") or 0) in want]
            if not hit:
                continue
            lst[:] = [o for o in lst if o not in hit]
            for o in hit:
                self._remember(a, kind, o)
                self._event(a, kind, o, "removed")
            self.mailer.save()
            self._changed(a, kind)

    # ── what people do in the card ─────────────────────────────────────────
    def _remember(self, a: Account, kind: str, o: dict) -> None:
        mem = self.mailer.data["finds_removed"].setdefault(a.id, [])
        mem.append({"at": now_ms(), "kind": kind, "message_ids": list(o.get("message_ids") or []),
                    "item": {k: v for k, v in o.items() if k not in ("account", "leaves_at")}})
        del mem[:-300]

    def action(self, uid: str, account_id: str, kind: str, fid: str, action: str, status: str = "") -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.store[kind].setdefault(a.id, [])
        if action == "restore":
            mem = self.mailer.data["finds_removed"].setdefault(a.id, [])
            r = next((x for x in mem if (x.get("item") or {}).get("id") == fid), None)
            if r:
                mem.remove(r)
                if not any(x["id"] == fid for x in lst):
                    lst.append(dict(r["item"]))
        for o in list(lst):
            if o["id"] != fid:
                continue
            if action == "remove":
                lst.remove(o)
                self._remember(a, kind, o)
                self._event(a, kind, o, "removed")
            elif action == "status" and status in KINDS[kind]["statuses"]:
                o.update({"status": status, "updated": now_ms()})
                if finished(kind, o):
                    o["finished_at"] = now_ms()
                else:
                    o.pop("finished_at", None)
                self._event(a, kind, o, "changed")
        self.mailer.save()
        self._changed(a, kind)
        return self.list_for(uid, kind)

    async def async_locate(self, uid: str, account_id: str, kind: str, fid: str) -> dict:
        a = self.mailer.account(uid, account_id)
        o = next((x for x in self.items(kind, a.id) if x["id"] == fid), None)
        if not o:
            raise MailError("not_found", "That isn't there any more.")
        mid = o.get("message_id") or ""
        if not mid:
            return {"folder": o.get("folder") or "INBOX", "uid": o.get("uid")}
        tried = []
        for k in (None, "inbox", "archive", "trash", "junk"):
            path = (o.get("folder") or "INBOX") if k is None else ("INBOX" if k == "inbox" else a.special(k))
            if not path or path in tried:
                continue
            tried.append(path)
            try:
                found = await a.async_find(path, mid)
            except MailError:
                found = None
            if found:
                if (path, found) != (o.get("folder"), o.get("uid")):
                    o.update({"folder": path, "uid": found})
                    self.mailer.save()
                return {"folder": path, "uid": found}
        raise MailError("not_found", "The email for this has been deleted.")

    # ── sign-in codes ──────────────────────────────────────────────────────
    def note_code(self, a: Account, it: dict, text: str) -> None:
        code = find_code(it.get("subject") or "", text or it.get("preview") or "")
        if not code:
            return
        owner = a.acc["owner"]
        frm = (it.get("from") or [{}])[0]
        now = now_ms()
        lst = [c for c in self.codes.get(owner, []) if c["until"] > now]
        lst.insert(0, {"id": new_id(), "code": code, "from": frm.get("name") or frm.get("email") or "", "account": a.id,
                       "uid": it["uid"], "at": now, "until": now + CODE_MINUTES * 60_000})
        self.codes[owner] = lst[:3]
        self.mailer.send_to(owner, {"type": "codes", "codes": self.codes[owner]})

    def codes_for(self, uid: str) -> list[dict]:
        now = now_ms()
        return [c for c in self.codes.get(uid, []) if c["until"] > now]

    def code_done(self, uid: str, cid: str) -> list[dict]:
        self.codes[uid] = [c for c in self.codes.get(uid, []) if c["id"] != cid]
        self.mailer.send_to(uid, {"type": "codes", "codes": self.codes_for(uid)})
        return self.codes_for(uid)

    # ── telling everyone ───────────────────────────────────────────────────
    def _event(self, a: Account, kind: str, o: dict, change: str) -> None:
        cfg = KINDS[kind]
        share = a.acc.get("share_details", True)
        data = {k: (o.get(k) if share or k not in cfg["private"] else "") for k in cfg["fields"]}
        data.update({"id": o.get("id"), "change": change, "account": a.acc["email"], "account_id": a.id})
        self.hass.bus.async_fire(cfg["event"], data)

    def _changed(self, a: Account, kind: str) -> None:
        a.publish()
        if kind == "council":   # the Unread Council and Local sensor counts emails added here
            self.hass.async_create_task(a.async_counts())
        owner = a.acc["owner"]
        self.mailer.send_to(owner, {"type": f"finds_{kind}", "kind": kind, "items": self.list_for(owner, kind)})
