"""AI that builds on Today, Snooze, the Screener and Subscriptions: Appointments, Bills, the Morning
Briefing, Inbox Tidy-Up, and the short-lived notes the card asks for (screener, subscriptions,
signatures, snooze times)."""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util import dt as dt_util

from . import ai

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

DAY_MS = 86400_000
CODE_RE = re.compile(r"\b(verification|verify|sign[- ]?in|log[- ]?in|login|security|one[- ]time|passcode|otp|confirmation code|your code|access code|2fa|two[- ]factor)\b", re.I)
ORDER_RE = re.compile(r"\b(order (confirm|confirmation|received|placed|#|number|no\.?)|thanks? (you )?for your order|your order\b|order is confirmed|we('ve| have) received your order|receipt for your)", re.I)
BILL_SOON_DAYS = 3
VERIFY_EVERY = 3 * 3600_000   # how often a bill's or appointment's email is checked for still being there
VERIFY_PER_TICK = 8
FOLLOWS = {"bills": ("bill", "Bills"), "appointments": ("appointment", "Appointments")}


def _now() -> int:
    return int(time.time() * 1000)


def _imap_date(ms: int) -> str:
    d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return f"{d.day:02d}-{('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')[d.month - 1]}-{d.year}"


def _ms(iso: str) -> int | None:
    """'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' in Home Assistant's time zone, as ms."""
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(iso if "T" in iso else iso + "T00:00")
    except ValueError:
        return None
    return int(d.replace(tzinfo=dt_util.now().tzinfo).timestamp() * 1000)


def _money(x: dict) -> str:
    if x.get("amount") is None:
        return ""
    sym = {"GBP": "£", "USD": "$", "EUR": "€", "AUD": "A$", "CAD": "C$", "NZD": "NZ$"}.get((x.get("currency") or "").upper())
    return f"{sym}{x['amount']:,.2f}" if sym else f"{x.get('currency') or ''} {x['amount']:,.2f}".strip()


class AiExtras:
    def __init__(self, mailer: Mailer) -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        d = mailer.data
        d.setdefault("appointments", {})
        d.setdefault("bills", {})
        d.setdefault("briefing", {})
        self.notes: dict[str, tuple[float, Any]] = {}   # short-lived AI answers, by email

    @property
    def data(self) -> dict:
        return self.mailer.data

    def start(self) -> None:
        for uid in list(self.data["briefing"]):
            self._arm_briefing(uid)

    def _accounts(self, uid: str) -> list[Account]:
        return [a for a in self.mailer.accounts.values() if a.acc["owner"] == uid]

    def _changed(self, a: Account, kind: str) -> None:
        owner = a.acc["owner"]
        self.mailer.send_to(owner, {"type": kind, kind: self.appointments_for(owner) if kind == "appointments" else self.bills_for(owner)})
        a.publish()

    def note(self, key: str, max_age: float = 7 * 86400) -> Any:
        hit = self.notes.get(key)
        return hit[1] if hit and time.time() - hit[0] < max_age else None

    def remember(self, key: str, value: Any) -> None:
        self.notes[key] = (time.time(), value)
        while len(self.notes) > 3000:
            self.notes.pop(next(iter(self.notes)))

    # ── Appointments ───────────────────────────────────────────────────────
    def appointments_for(self, uid: str) -> list[dict]:
        out = []
        for a in self._accounts(uid):
            out += [{**x, "account": a.id} for x in self.data["appointments"].get(a.id, [])]
        return sorted(out, key=lambda x: x.get("at") or 0)

    def add_appointment(self, a: Account, it: dict, ap: dict) -> None:
        from .manager import new_id
        at = _ms(ap.get("start") or "")
        if not at or at < _now() - DAY_MS:
            return
        lst = self.data["appointments"].setdefault(a.id, [])
        mid = it.get("message_id") or ""
        same = next((x for x in lst if (mid and x.get("message_id") == mid)
                     or (x.get("title", "").lower() == ap["title"].lower() and x.get("start") == ap["start"])), None)
        frm = (it.get("from") or [{}])[0]
        entry = {"title": ap["title"], "start": ap["start"], "end": ap.get("end") or "", "location": ap.get("location") or "",
                 "at": at, "message_id": mid, "folder": it.get("folder") or "INBOX", "uid": it.get("uid"),
                 "subject": it.get("subject") or "", "from": frm.get("name") or frm.get("email") or ""}
        if same:
            same.update(entry)   # a change of time or place in a later email
        else:
            lst.append({"id": new_id(), "added": _now(), **entry})
            del lst[:-200]
        self.mailer.save()
        self._changed(a, "appointments")

    def appointment_action(self, uid: str, account_id: str, aid: str, action: str) -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.data["appointments"].get(a.id, [])
        if action == "remove":
            lst[:] = [x for x in lst if x["id"] != aid]
        elif action == "added":
            for x in lst:
                if x["id"] == aid:
                    x["in_calendar"] = True
        self.mailer.save()
        self._changed(a, "appointments")
        return self.appointments_for(uid)

    # ── the email behind a bill or an appointment ──────────────────────────
    async def _where(self, a: Account, x: dict) -> dict | None:
        """Where its email is now ({"folder", "uid", "gone"}; gone: in Trash or Junk), or None when it's
        nowhere. Raises MailError when the email server can't say, so nothing is removed by mistake."""
        from .manager import MailError
        mid = x.get("message_id") or ""
        if not mid:
            return {"folder": x.get("folder") or "INBOX", "uid": x.get("uid"), "gone": False}
        binned = {a.special("trash"), a.special("junk")} - {None}
        tried: list[str] = []
        failed = False
        for kind in (None, "inbox", "archive", "trash", "junk"):
            path = (x.get("folder") or "INBOX") if kind is None else ("INBOX" if kind == "inbox" else a.special(kind))
            if not path or path in tried:
                continue
            tried.append(path)
            try:
                found = await a.async_find(path, mid)
            except MailError:
                failed = True
                continue
            if found:
                return {"folder": path, "uid": found, "gone": path in binned}
        if failed:
            raise MailError("unavailable", "Couldn’t reach the email server. Try again in a moment.")
        return None

    async def async_locate(self, uid: str, account_id: str, kind: str, item_id: str) -> dict:
        """Where a bill's or appointment's email is now. One whose email has been deleted (or is in
        Trash or Junk) is taken out of Bills or Appointments, and Today."""
        from .manager import MailError
        noun, title = FOLLOWS[kind]
        a = self.mailer.account(uid, account_id)
        lst = self.data[kind].get(a.id, [])
        x = next((y for y in lst if y["id"] == item_id), None)
        if not x:
            raise MailError("not_found", f"That {noun} isn’t in {title} any more.")
        where = await self._where(a, x)
        if where is None or where["gone"]:
            lst[:] = [y for y in lst if y is not x]
            self.mailer.save()
            self._changed(a, kind)
            if where is None:
                raise MailError("not_found", f"The email for this {noun} has been deleted, so it’s been taken out of {title}.")
            return {"folder": where["folder"], "uid": where["uid"], "trash": True, "removed": True}
        x["checked"] = _now()
        if (where["folder"], where["uid"]) != (x.get("folder"), x.get("uid")):
            x.update({"folder": where["folder"], "uid": where["uid"]})
            self.mailer.save()
        return {"folder": where["folder"], "uid": where["uid"]}

    def drop(self, a: Account, folder: str, uids: list[int]) -> list[dict]:
        """Emails deleted, emptied or reported as junk: their bills and appointments go too.
        Answers what went, so Undo can put it back."""
        want = {int(u) for u in uids}
        out = []
        for kind in FOLLOWS:
            lst = self.data[kind].get(a.id) or []
            hit = [x for x in lst if (x.get("folder") or "INBOX") == folder and int(x.get("uid") or 0) in want]
            if hit:
                lst[:] = [x for x in lst if x not in hit]
                out += [{"kind": kind, "item": x} for x in hit]
        if out:
            self.mailer.save()
            for kind in {o["kind"] for o in out}:
                self._changed(a, kind)
        return out

    def restore(self, a: Account, items: list[dict]) -> None:
        """Undo: bills and appointments taken out with their emails come back (found again by the email)."""
        kinds = set()
        for o in items:
            lst = self.data[o["kind"]].setdefault(a.id, [])
            if not any(y["id"] == o["item"]["id"] for y in lst):
                lst.append({**o["item"], "checked": 0})
                kinds.add(o["kind"])
        if kinds:
            self.mailer.save()
            for kind in kinds:
                self._changed(a, kind)

    async def async_verify(self) -> None:
        """Now and then: a bill or appointment whose email was deleted somewhere else (another app, the
        web) leaves Bills, Appointments and Today. A few at a time, each every few hours."""
        from .manager import MailError
        now = _now()
        todo = []
        for kind in FOLLOWS:
            for acc_id, lst in self.data[kind].items():
                for x in lst:
                    if kind == "bills" and x.get("paid"):
                        continue
                    if x.get("message_id") and now - (x.get("checked") or x.get("added") or 0) >= VERIFY_EVERY:
                        todo.append((kind, acc_id, x))
        for kind, acc_id, x in sorted(todo, key=lambda t: t[2].get("checked") or 0)[:VERIFY_PER_TICK]:
            a = self.mailer.accounts.get(acc_id)
            if not a:
                continue
            try:
                where = await self._where(a, x)
            except MailError:
                continue   # the server didn't answer: try again later
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Crow Messenger Email couldn't check a %s's email", kind, exc_info=True)
                continue
            lst = self.data[kind].get(acc_id, [])
            if where is None or where["gone"]:
                lst[:] = [y for y in lst if y is not x]
                self._changed(a, kind)
            else:
                x.update({"folder": where["folder"], "uid": where["uid"], "checked": now})
            self.mailer.save()

    # ── Bills ──────────────────────────────────────────────────────────────
    def bills_for(self, uid: str) -> list[dict]:
        out = []
        for a in self._accounts(uid):
            out += [{**x, "account": a.id} for x in self.data["bills"].get(a.id, [])]
        return sorted(out, key=lambda x: (bool(x.get("paid")), x.get("due") or "9999"))

    def add_bill(self, a: Account, it: dict, bill: dict) -> None:
        from .manager import new_id
        lst = self.data["bills"].setdefault(a.id, [])
        mid = it.get("message_id") or ""
        if mid and any(x.get("message_id") == mid for x in lst):
            return
        payee = bill.get("payee") or ((it.get("from") or [{}])[0].get("name") or "")
        # much more than last time from the same payee?
        prev = next((x for x in sorted(lst, key=lambda x: x.get("added", 0), reverse=True)
                     if x.get("payee", "").lower() == payee.lower() and x.get("amount")), None)
        higher = None
        if prev and bill.get("amount") and prev["amount"] > 0 and bill["amount"] > prev["amount"] * 1.2:
            higher = round((bill["amount"] / prev["amount"] - 1) * 100)
        lst.append({"id": new_id(), "payee": payee, "amount": bill.get("amount"), "currency": bill.get("currency") or "",
                    "due": bill.get("due") or "", "reference": bill.get("reference") or "", "message_id": mid,
                    "folder": it.get("folder") or "INBOX", "uid": it.get("uid"), "subject": it.get("subject") or "",
                    "paid": False, "added": _now(), "higher": higher, "previous": prev.get("amount") if prev else None})
        del lst[:-300]
        self.mailer.save()
        self._changed(a, "bills")

    def bill_action(self, uid: str, account_id: str, bid: str, action: str) -> list[dict]:
        a = self.mailer.account(uid, account_id)
        lst = self.data["bills"].get(a.id, [])
        if action == "remove":
            lst[:] = [x for x in lst if x["id"] != bid]
        for x in lst:
            if x["id"] == bid and action in ("paid", "unpaid"):
                x["paid"] = action == "paid"
                x["paid_at"] = _now() if x["paid"] else None
        self.mailer.save()
        self._changed(a, "bills")
        return self.bills_for(uid)

    def bills_due(self, account_id: str, days: int = 7) -> list[dict]:
        today = dt_util.now().date()
        out = []
        for x in self.data["bills"].get(account_id, []):
            if x.get("paid") or not x.get("due"):
                continue
            try:
                d = datetime.fromisoformat(x["due"]).date()
            except ValueError:
                continue
            if (d - today).days <= days:
                out.append(x)
        return out

    async def async_tick(self) -> None:
        """Every few minutes: tidy old ones away, and a reminder a few days before a bill is due."""
        now = _now()
        today = dt_util.now().date()
        changed: set[str] = set()
        for acc_id, lst in self.data["appointments"].items():
            keep = [x for x in lst if (x.get("at") or 0) > now - DAY_MS]
            if len(keep) != len(lst):
                lst[:] = keep
                changed.add(acc_id)
        for acc_id, lst in self.data["bills"].items():
            keep = []
            for x in lst:
                if x.get("paid") and (x.get("paid_at") or x.get("added", 0)) < now - 30 * DAY_MS:
                    continue
                if not x.get("paid") and x.get("due") and (_ms(x["due"]) or now) < now - 30 * DAY_MS:
                    continue
                keep.append(x)
                if x.get("paid") or x.get("reminded") or not x.get("due"):
                    continue
                try:
                    days = (datetime.fromisoformat(x["due"]).date() - today).days
                except ValueError:
                    continue
                if days <= BILL_SOON_DAYS and dt_util.now().hour >= 8:
                    x["reminded"] = True
                    changed.add(acc_id)
                    self.hass.async_create_task(self._remind_bill(acc_id, x, days))
            if len(keep) != len(lst):
                lst[:] = keep
                changed.add(acc_id)
        for acc_id in changed:
            a = self.mailer.accounts.get(acc_id)
            if a:
                self._changed(a, "appointments")
                self._changed(a, "bills")
        if changed:
            self.mailer.save()
        await self.async_verify()

    async def _remind_bill(self, acc_id: str, x: dict, days: int) -> None:
        a = self.mailer.accounts.get(acc_id)
        if not a:
            return
        amount = _money(x)
        when = "today" if days == 0 else "tomorrow" if days == 1 else "overdue" if days < 0 else f"in {days} days"
        await self.mailer.async_notify(a, a.acc["owner"], f"💷 {x.get('payee') or 'A bill'}{' ' + amount if amount else ''}",
                                       f"Due {when}" + (f" · {x['higher']}% more than last time" if x.get("higher") else ""),
                                       {"tag": f"crow_email_bill_{x['id']}"})

    # ── what Today adds ────────────────────────────────────────────────────
    def today_extra(self, uid: str, account_id: str | None = None) -> list[dict]:
        now = dt_util.now()
        today = now.date()
        out = []
        for x in self.appointments_for(uid):
            if account_id and x["account"] != account_id:
                continue
            try:
                d = datetime.fromisoformat(x["start"] if "T" in x["start"] else x["start"] + "T00:00").date()
            except ValueError:
                continue
            if d == today:
                out.append({"kind": "appointment", "title": x["title"], "sub": x.get("location") or "Appointment",
                            "at": x["at"] if "T" in x["start"] else None, "account": x["account"], "id": x["id"]})
        for x in self.bills_for(uid):
            if account_id and x["account"] != account_id:
                continue
            if x.get("paid") or not x.get("due"):
                continue
            try:
                days = (datetime.fromisoformat(x["due"]).date() - today).days
            except ValueError:
                continue
            if days <= BILL_SOON_DAYS:
                amount = _money(x)
                out.append({"kind": "bill", "title": f"{x.get('payee') or 'A bill'}{' · ' + amount if amount else ''}",
                            "sub": "Overdue" if days < 0 else "Due today" if days == 0 else "Due tomorrow" if days == 1 else f"Due in {days} days",
                            "account": x["account"], "id": x["id"]})
        return out

    # ── Inbox Tidy-Up ──────────────────────────────────────────────────────
    async def async_tidy(self, uid: str) -> list[dict]:
        """Old email that could go: promotions, unopened newsletters, delivered parcels, old sign-in codes and order confirmations."""
        now = _now()
        groups: list[dict] = []
        for a in self._accounts(uid):
            try:
                old = (await a.job(a.cmd.search, "INBOX", "BEFORE", _imap_date(now - 14 * DAY_MS)))[:1500]
                heads = await a.job(a.cmd.light_headers, "INBOX", old, "FROM SUBJECT DATE LIST-UNSUBSCRIBE") if old else []
                recent = await a.job(a.cmd.search, "INBOX", "BEFORE", _imap_date(now - DAY_MS), "SINCE", _imap_date(now - 14 * DAY_MS))
                rheads = await a.job(a.cmd.light_headers, "INBOX", recent[:500], "FROM SUBJECT DATE") if recent else []
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Crow Messenger Email couldn't look for email to tidy: %s", err)
                continue
            cats = self.mailer.smart.data.get("cats", {}).get(a.id, {})
            promos = [h["uid"] for h in heads if (cats.get(h["uid"]) or cats.get(str(h["uid"]))) == "promotions"]
            if promos:
                groups.append({"account": a.id, "key": "promotions", "title": "Promotions over 2 weeks old",
                               "sub": "Offers and marketing", "action": "trash", "uids": promos})
            news = [h["uid"] for h in heads if h.get("list_unsubscribe") and not h.get("seen") and h["uid"] not in set(promos)]
            if news:
                groups.append({"account": a.id, "key": "newsletters", "title": "Unopened newsletters over 2 weeks old",
                               "sub": "Mailing lists you didn’t read", "action": "archive", "uids": news})
            codes = [h["uid"] for h in [*heads, *rheads] if CODE_RE.search(h.get("subject") or "")]
            if codes:
                groups.append({"account": a.id, "key": "codes", "title": "Old sign-in codes",
                               "sub": "Verification and security codes over a day old", "action": "trash", "uids": codes})
            orders = [h["uid"] for h in heads if (h.get("date") or now) < now - 60 * DAY_MS and ORDER_RE.search(h.get("subject") or "")]
            if orders:
                groups.append({"account": a.id, "key": "orders", "title": "Order confirmations over 2 months old",
                               "sub": "Things you’ve had for a while", "action": "archive", "uids": orders})
            delivered = [int(p["uid"]) for p in self.mailer.smart.parcels(a.id)
                         if p.get("status") == "delivered" and (p.get("folder") or "INBOX") == "INBOX" and p.get("uid")]
            if delivered:
                groups.append({"account": a.id, "key": "delivered", "title": "Emails about delivered parcels",
                               "sub": "Your parcels have arrived", "action": "archive", "uids": delivered})
        for g in groups:
            g["uids"] = sorted(set(g["uids"]), reverse=True)[:2000]
            g["count"] = len(g["uids"])
        return [g for g in groups if g["count"]]

    # ── the Morning Briefing ───────────────────────────────────────────────
    def briefing_for(self, uid: str) -> dict:
        d = self.data["briefing"].get(uid) or {}
        return {"on": bool(d.get("on")), "time": d.get("time") or "07:30", "notify": d.get("notify", True),
                "speaker": d.get("speaker") or "", "days": d.get("days") or "every", "last": d.get("last")}

    def save_briefing(self, uid: str, d: dict) -> dict:
        cur = self.data["briefing"].setdefault(uid, {})
        for k in ("on", "time", "notify", "speaker", "days"):
            if k in d:
                cur[k] = d[k]
        self.mailer.save()
        self._arm_briefing(uid)
        out = self.briefing_for(uid)
        self.mailer.send_to(uid, {"type": "briefing", "briefing": out})
        return out

    def _arm_briefing(self, uid: str) -> None:
        key = f"brief_{uid}"
        unsub = self.mailer.timers.pop(key, None)
        if unsub:
            unsub()
        b = self.briefing_for(uid)
        if not b["on"]:
            return
        try:
            hh, mm = (int(x) for x in b["time"].split(":")[:2])
        except ValueError:
            return
        now = dt_util.now()
        nxt = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        if b["days"] == "weekdays":
            while nxt.weekday() >= 5:
                nxt += timedelta(days=1)

        @callback
        def due(_now) -> None:
            self.mailer.timers.pop(key, None)
            self.hass.async_create_task(self._briefing_due(uid))

        self.mailer.timers[key] = async_track_point_in_utc_time(self.hass, due, dt_util.as_utc(nxt))

    async def _briefing_due(self, uid: str) -> None:
        try:
            await self.async_briefing(uid)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Crow Messenger Email couldn't make the morning briefing: %s", err)
        self._arm_briefing(uid)

    async def async_briefing(self, uid: str, test: bool = False) -> dict:
        """Make the briefing and send it (as a notification and/or on a speaker)."""
        user = await self.hass.auth.async_get_user(uid)
        name = (user.name or "").split(" ")[0] if user else ""
        today = []
        for x in [*self.mailer.features.today_for(uid)]:
            when = ""
            if x.get("at"):
                when = " at " + datetime.fromtimestamp(x["at"] / 1000, tz=dt_util.now().tzinfo).strftime("%H:%M")
            today.append(f"{x.get('sub')}: {x.get('title')}{when}")
        # and what's new in Messages and the Feed
        try:
            from ..together import briefing_lines
            today += await briefing_lines(self.mailer.messenger, uid)
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger couldn't add messages to the briefing", exc_info=True)
        emails: list[dict] = []
        since = _now() - DAY_MS
        for a in self._accounts(uid):
            try:
                items = (await a.async_page("INBOX", 0, 25, "unread"))["items"]
                emails += [i for i in items if (i.get("date") or 0) >= since]
            except Exception:  # noqa: BLE001
                continue
        text = await ai.briefing(self.hass, self.mailer, name, today, emails)
        b = self.briefing_for(uid)
        if b["notify"]:
            await self.mailer.async_notify(None, uid, "☀️ Good morning", text, {"tag": "crow_email_briefing"})
        if b["speaker"]:
            tts = next((s.entity_id for s in self.hass.states.async_all("tts")), None)
            if tts:
                try:
                    await self.hass.services.async_call("tts", "speak", {"media_player_entity_id": b["speaker"], "message": text, "cache": False},
                                                        target={"entity_id": tts}, blocking=False)
                except Exception as err:  # noqa: BLE001
                    _LOGGER.warning("Crow Messenger Email couldn't play the briefing on %s: %s", b["speaker"], err)
        if not test:
            self.data["briefing"].setdefault(uid, {})["last"] = _now()
            self.mailer.save()
        return {"text": text}
