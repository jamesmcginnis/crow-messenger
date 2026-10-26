"""Food Orders and Supermarket Deliveries: found in new email by the AI, like the Parcel Tracker.

Food orders matter for an hour or two: they arrive at a time (not on a day), are probably
delivered an hour after that time if no email says so, and leave a few hours later.
Supermarket deliveries have a booked slot, substitutions and missing items, and stay a
couple of days after they arrive so the substitutions can be checked.

What's spent on each is kept by month (for the spend sensors), apart from the orders
themselves, so it survives the orders being tidied away.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from .const import EVENT_FOOD, EVENT_GROCERY
from .manager import Account, MailError, new_id, now_ms

if TYPE_CHECKING:
    from .manager import Mailer

_LOGGER = logging.getLogger(__name__)

HOUR_MS = 3600_000
DAY_MS = 86400_000
KINDS = ("food", "groceries")
FOOD_STATUSES = ("ordered", "preparing", "on_its_way", "ready", "delivered", "collected", "cancelled")
GROCERY_STATUSES = ("booked", "picking", "on_its_way", "ready", "delivered", "collected", "cancelled")
FINISHED = ("delivered", "collected", "cancelled")

FOOD_NO_TIME = 75 * 60_000            # no arrival time given: expected this long after ordering
FOOD_PROBABLY_AFTER = HOUR_MS         # this long past its arrival time with no news: probably delivered
FOOD_KEEP = 6 * HOUR_MS               # delivered or cancelled food orders leave after this
FOOD_SAME_ORDER = 6 * HOUR_MS         # emails from the same restaurant this close together are one order
GROCERY_PROBABLY_AFTER = 2 * HOUR_MS  # this long past the end of the slot: probably delivered
GROCERY_NO_SLOT = 3 * DAY_MS          # no slot and no news for this long: probably delivered
GROCERY_KEEP = 2 * DAY_MS             # delivered ones stay this long (to check substitutions)
GROCERY_CANCELLED_KEEP = DAY_MS
FORGET_REMOVED = 30 * DAY_MS          # an order you deleted isn't added again for this long
SPEND_MONTHS = 13

_FIELDS = {
    "food": ("restaurant", "service", "method", "arrive", "total", "currency", "order_number"),
    "groceries": ("shop", "method", "slot_start", "slot_end", "edit_by", "total", "currency", "order_number"),
}
_EVENT_FIELDS = {
    "food": ("id", "restaurant", "service", "status", "method", "arrive", "total", "currency"),
    "groceries": ("id", "shop", "status", "method", "slot_start", "slot_end", "edit_by", "total", "currency"),
}


def local_ms(v: str) -> int | None:
    """A local "YYYY-MM-DDTHH:MM" (or "YYYY-MM-DD") as milliseconds."""
    if not v:
        return None
    try:
        d = datetime.fromisoformat(v)
    except ValueError:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt_util.get_default_time_zone())
    return int(d.timestamp() * 1000)


def _status_order(kind: str) -> dict[str, int]:
    return {s: i for i, s in enumerate(FOOD_STATUSES if kind == "food" else GROCERY_STATUSES)}


class Orders:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        for key in (*KINDS, "orders_removed", "order_spend"):
            mailer.data.setdefault(key, {})

    @property
    def data(self) -> dict:
        return self.mailer.data

    # ── reading ────────────────────────────────────────────────────────────
    def orders(self, kind: str, account_id: str) -> list[dict]:
        return self.data[kind].get(account_id, [])

    def list_for(self, uid: str, kind: str) -> list[dict]:
        out = []
        for a in self.mailer.accounts.values():
            if a.acc["owner"] == uid:
                out += [{**o, "account": a.id, "when": self.when(o)} for o in self.orders(kind, a.id)]
        return sorted(out, key=lambda o: (o["status"] in FINISHED, o["when"] or 9e15, -o.get("updated", 0)))

    @staticmethod
    def when(o: dict) -> int | None:
        """When it's due: a food order's arrival time, a delivery's slot."""
        if o["kind"] == "food":
            return o.get("arrive_at") or (o.get("added", 0) + FOOD_NO_TIME)
        return o.get("slot_start_at") or o.get("slot_end_at")

    def active(self, kind: str, account_id: str) -> list[dict]:
        return sorted([o for o in self.orders(kind, account_id) if o["status"] not in FINISHED],
                      key=lambda o: self.when(o) or 9e15)

    def spend(self, kind: str, account_id: str, month: str | None = None) -> dict[str, float]:
        """Spent this month (or another "YYYY-MM"), by currency."""
        month = month or dt_util.now().strftime("%Y-%m")
        led = self.data["order_spend"].get(account_id, {}).get(kind, {}).get(month, {})
        out: dict[str, float] = {}
        for amount, cur in led.values():
            out[cur] = round(out.get(cur, 0) + amount, 2)
        return out

    # ── adding (from new email) ────────────────────────────────────────────
    def _same(self, kind: str, o: dict, old: dict) -> bool:
        if o.get("order_number") and old.get("order_number"):
            return o["order_number"].lower() == old["order_number"].lower()
        if kind == "food":
            same = (o.get("restaurant") or "").lower() == (old.get("restaurant") or "").lower() and bool(o.get("restaurant"))
            return same and now_ms() - old.get("added", 0) < FOOD_SAME_ORDER
        if (o.get("shop") or "").lower() != (old.get("shop") or "").lower() or not o.get("shop"):
            return False
        if o.get("slot_start") and old.get("slot_start"):
            return o["slot_start"] == old["slot_start"]
        return old["status"] not in FINISHED   # no slot in this email: the shop's order that's still to come

    def was_removed(self, a: Account, kind: str, o: dict, message_id: str) -> bool:
        now = now_ms()
        mem = self.data["orders_removed"].setdefault(a.id, [])
        mem[:] = [r for r in mem if now - r.get("at", now) < FORGET_REMOVED]
        for r in mem:
            if r.get("kind") != kind:
                continue
            if message_id and message_id in (r.get("message_ids") or []):
                return True
            if o.get("order_number") and o["order_number"].lower() == (r.get("order_number") or "").lower():
                return True
        return False

    def add(self, a: Account, it: dict, kind: str, o: dict, force: bool = False) -> dict | None:
        """Add an order, or update the one it's about. One you deleted isn't added again unless you ask (force)."""
        mid = it.get("message_id") or ""
        if self.was_removed(a, kind, o, mid):
            if not force:
                return None
            mem = self.data["orders_removed"][a.id]
            mem[:] = [r for r in mem if not (r.get("kind") == kind and (mid in (r.get("message_ids") or [])
                      or (o.get("order_number") and o["order_number"].lower() == (r.get("order_number") or "").lower())))]
        lst = self.data[kind].setdefault(a.id, [])
        order = _status_order(kind)
        match = next((old for old in lst if self._same(kind, o, old)), None)
        now = now_ms()
        if match:
            if o["status"] == "cancelled" or order.get(o["status"], 0) >= order.get(match["status"], 0) or match.get("probable"):
                match["status"] = o["status"]
                match.pop("probable", None)
            for k in _FIELDS[kind]:
                if o.get(k) not in (None, ""):
                    match[k] = o[k]
            for k in ("substitutions", "missing"):
                if o.get(k):
                    match[k] = o[k]
            match.update({"uid": it["uid"], "folder": it.get("folder") or "INBOX", "updated": now, "subject": it.get("subject", "")})
            if mid:
                match["message_id"] = mid
                match["message_ids"] = [*[x for x in match.get("message_ids") or [] if x != mid], mid][-10:]
            item = match
        else:
            frm = (it.get("from") or [{}])[0]
            item = {"id": new_id(), "kind": kind, **o, "uid": it["uid"], "folder": it.get("folder") or "INBOX",
                    "subject": it.get("subject", ""), "from": frm.get("name") or frm.get("email") or "",
                    "added": now, "updated": now, "message_id": mid, "message_ids": [mid] if mid else []}
            lst.append(item)
            del lst[:-100]
        self._times(item)
        if item["status"] in FINISHED and not item.get("finished_at"):
            item["finished_at"] = now
        elif item["status"] not in FINISHED:
            item.pop("finished_at", None)
        self._note_spend(a, item)
        self.mailer.save()
        self._event(a, item)
        self._changed(a, kind)
        return item

    def _times(self, o: dict) -> None:
        if o["kind"] == "food":
            o["arrive_at"] = local_ms(o.get("arrive", ""))
        else:
            for k in ("slot_start", "slot_end", "edit_by"):
                o[f"{k}_at"] = local_ms(o.get(k, ""))

    def _note_spend(self, a: Account, o: dict) -> None:
        """What it cost, in the month it was ordered (a cancelled order costs nothing)."""
        books = self.data["order_spend"].setdefault(a.id, {}).setdefault(o["kind"], {})
        month = datetime.fromtimestamp(o.get("added", now_ms()) / 1000, tz=dt_util.get_default_time_zone()).strftime("%Y-%m")
        led = books.setdefault(month, {})
        if o.get("total") is not None and o["status"] != "cancelled":
            led[o["id"]] = [float(o["total"]), (o.get("currency") or "").upper() or self._currency()]
        else:
            led.pop(o["id"], None)
        for old in sorted(books)[:-SPEND_MONTHS]:
            books.pop(old, None)

    def _forget_spend(self, a: Account, o: dict) -> None:
        for led in self.data["order_spend"].get(a.id, {}).get(o["kind"], {}).values():
            led.pop(o["id"], None)

    def _currency(self) -> str:
        return (getattr(self.hass.config, "currency", "") or "GBP").upper()

    # ── tidying (every few minutes) ────────────────────────────────────────
    def _tidy(self, kind: str, lst: list[dict]) -> tuple[list[dict], list[dict], bool]:
        """Orders past their time become "probably delivered", and old ones go.
        Answers those taken out, those now probably delivered, and whether anything changed."""
        now = now_ms()
        changed = False
        probable = []
        for o in lst:
            if o["status"] in FINISHED:
                continue
            if kind == "food":
                due = self.when(o) + FOOD_PROBABLY_AFTER
            elif o.get("slot_end_at") or o.get("slot_start_at"):
                due = (o.get("slot_end_at") or o["slot_start_at"] + HOUR_MS) + GROCERY_PROBABLY_AFTER
            else:
                due = o.get("updated", now) + GROCERY_NO_SLOT
            if now >= due:
                o.update({"status": "collected" if o.get("method") == "collection" else "delivered", "probable": True, "finished_at": due})
                probable.append(o)
                changed = True
        gone = [o for o in lst if o["status"] in FINISHED and now >= o.get("finished_at", now) + self._keep(o)]
        if gone:
            lst[:] = [o for o in lst if o not in gone]
            changed = True
        return gone, [o for o in probable if o not in gone], changed

    @staticmethod
    def _keep(o: dict) -> int:
        if o["kind"] == "food":
            return FOOD_KEEP
        return GROCERY_CANCELLED_KEEP if o["status"] == "cancelled" else GROCERY_KEEP

    def tidy_all(self) -> None:
        for kind in KINDS:
            for aid, lst in list(self.data[kind].items()):
                gone, probable, changed = self._tidy(kind, lst)
                if not changed:
                    continue
                self.mailer.save()
                a = self.mailer.accounts.get(aid)
                if not a:
                    continue
                for o in probable:
                    self._event(a, o)
                for o in gone:
                    self._event(a, o, "removed")
                self._changed(a, kind)

    def drop(self, a: Account, folder: str, uids: list[int]) -> None:
        """Email reported as junk or phishing: its order goes too."""
        want = {int(u) for u in uids}
        for kind in KINDS:
            lst = self.data[kind].get(a.id) or []
            hit = [o for o in lst if (o.get("folder") or "INBOX") == folder and int(o.get("uid") or 0) in want]
            if not hit:
                continue
            lst[:] = [o for o in lst if o not in hit]
            for o in hit:
                self._remember_removed(a, o)
                self._forget_spend(a, o)
                self._event(a, o, "removed")
            self.mailer.save()
            self._changed(a, kind)

    # ── what people do in the card ─────────────────────────────────────────
    def _remember_removed(self, a: Account, o: dict) -> None:
        mem = self.data["orders_removed"].setdefault(a.id, [])
        mem.append({"at": now_ms(), "kind": o["kind"], "order_number": o.get("order_number") or "",
                    "message_ids": list(o.get("message_ids") or []), "order": {k: v for k, v in o.items() if k not in ("account", "when")}})
        del mem[:-200]

    def action(self, uid: str, account_id: str, kind: str, oid: str, action: str) -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.data[kind].setdefault(a.id, [])
        if action == "restore":   # Undo after deleting
            mem = self.data["orders_removed"].setdefault(a.id, [])
            r = next((x for x in mem if (x.get("order") or {}).get("id") == oid), None)
            if r:
                mem.remove(r)
                if not any(x["id"] == oid for x in lst):
                    o = dict(r["order"])
                    lst.append(o)
                    self._note_spend(a, o)
        now = now_ms()
        for o in list(lst):
            if o["id"] != oid:
                continue
            if action == "remove":
                lst.remove(o)
                self._remember_removed(a, o)
                self._forget_spend(a, o)
                self._event(a, o, "removed")
            elif action == "delivered":
                o.update({"status": "collected" if o.get("method") == "collection" else "delivered", "finished_at": now, "updated": now})
                o.pop("probable", None)
                self._event(a, o)
            elif action == "undelivered":   # Not Yet: a "probably delivered" guess was wrong
                o.update({"status": "on_its_way" if o.get("method") != "collection" else "ready", "updated": now})
                for k in ("probable", "finished_at"):
                    o.pop(k, None)
                if kind == "food":   # give it another hour
                    o["arrive_at"] = max(o.get("arrive_at") or 0, now + HOUR_MS - FOOD_PROBABLY_AFTER)
                elif (o.get("slot_end_at") or 0) < now:
                    o["slot_end_at"] = now + HOUR_MS
                self._event(a, o)
        self.mailer.save()
        self._changed(a, kind)
        return self.list_for(uid, kind)

    async def async_locate(self, uid: str, account_id: str, kind: str, oid: str) -> dict:
        """Where an order's email is now: it may have been archived or deleted since."""
        a = self.mailer.account(uid, account_id)
        o = next((x for x in self.orders(kind, a.id) if x["id"] == oid), None)
        if not o:
            raise MailError("not_found", "That order isn't there any more.")
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
        raise MailError("not_found", "The email for this order has been deleted.")

    # ── telling everyone ───────────────────────────────────────────────────
    def _event(self, a: Account, o: dict, status: str | None = None) -> None:
        share = a.acc.get("share_details", True)
        data: dict[str, Any] = {k: o.get(k) for k in _EVENT_FIELDS[o["kind"]]}
        if status:
            data["status"] = status
        if not share:
            for k in ("restaurant", "service", "shop"):
                if k in data:
                    data[k] = ""
        if o["kind"] == "groceries":
            data["substitutions"] = len(o.get("substitutions") or [])
            data["missing"] = len(o.get("missing") or [])
        data["probable"] = bool(o.get("probable"))
        self.hass.bus.async_fire(EVENT_FOOD if o["kind"] == "food" else EVENT_GROCERY,
                                 {"account": a.acc["email"], "account_id": a.id, **data})

    def _changed(self, a: Account, kind: str) -> None:
        a.publish()
        owner = a.acc["owner"]
        self.mailer.send_to(owner, {"type": kind, kind: self.list_for(owner, kind)})
