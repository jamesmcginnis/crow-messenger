"""Sensors for each email account: unread (in total and by Inbox group), VIP, latest email, today, flagged, drafts, storage,
last checked, parcels, food orders, supermarket deliveries, junk, snoozed, reminders, follow-ups, the Screener, bills
and subscriptions."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import SUBSCRIPTIONS_EVERY
from .entity import CrowMessengerEmailEntity, HourlyRefresh, setup_platform
from .manager import Account

_LOGGER = logging.getLogger(__name__)


@callback
def email_setup(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback):
    """Called by Crow Messenger's own platform when Email is on. Returns the function that stops it."""
    def make(a: Account) -> list:
        return [UnreadSensor(a), UnreadVipSensor(a), LatestSensor(a), TodaySensor(a), FlaggedSensor(a),
                DraftsSensor(a), StorageSensor(a), LastCheckedSensor(a), ParcelsSensor(a), JunkSensor(a), BadgeSensor(a),
                AttentionTodaySensor(a), BillsDueSensor(a), SnoozedSensor(a), RemindersSensor(a), WaitingReplySensor(a),
                ScreenerSensor(a), NextBillSensor(a), LatestVipSensor(a), SubscriptionsSensor(a),
                *[UnreadGroupSensor(a, g) for g in UNREAD_GROUPS], FoodArrivingSensor(a), NextGroceryDeliverySensor(a),
                SpendSensor(a, "food"), SpendSensor(a, "groceries"), NextTravelSensor(a), RefundsOwedSensor(a),
                ReturnDeadlineSensor(a), NextRenewalSensor(a), NextHomeVisitSensor(a), NextEventSensor(a), CouncilSensor(a),
                WarrantiesSensor(a)]
    return setup_platform(hass, entry, add, make)


class _Count(CrowMessengerEmailEntity, SensorEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "emails"
    field = ""

    @property
    def native_value(self):
        return self.stats.get(self.field)


class UnreadSensor(_Count):
    _attr_icon = "mdi:email-mark-as-unread"
    field = "unread"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "unread")


class UnreadVipSensor(_Count):
    _attr_icon = "mdi:star-circle"
    field = "unread_vip"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "unread_vip")


class TodaySensor(_Count):
    _attr_icon = "mdi:email-receive"
    field = "received_today"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "received_today")


class FlaggedSensor(_Count):
    _attr_icon = "mdi:flag"
    field = "flagged"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "flagged")


class DraftsSensor(_Count):
    """Drafts waiting to be finished, plus emails waiting to Send Later."""
    _attr_icon = "mdi:email-edit"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "drafts_scheduled")

    @property
    def native_value(self):
        s = self.stats
        if s.get("drafts") is None:
            return None
        return int(s.get("drafts") or 0) + int(s.get("scheduled") or 0)

    @property
    def extra_state_attributes(self):
        s = self.stats
        rt = self.rt
        nxt = None
        if rt:
            times = sorted(x["at"] for x in rt.mailer.data["scheduled"] if x["account"] == rt.id and x.get("at") and not x.get("undo"))
            if times:
                nxt = dt_util.utc_from_timestamp(times[0] / 1000).isoformat()
        return {"drafts": s.get("drafts"), "scheduled": s.get("scheduled"), "next_scheduled": nxt}


class LatestSensor(CrowMessengerEmailEntity, SensorEntity):
    """The subject of the newest email in the Inbox, with who it's from."""
    _attr_icon = "mdi:email-newsletter"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "latest")

    @property
    def native_value(self):
        latest = self.stats.get("latest")
        if not latest:
            return None
        return (latest.get("subject") or "(No subject)")[:250]

    @property
    def extra_state_attributes(self):
        latest = self.stats.get("latest") or {}
        when = latest.get("date")
        return {
            "from_name": latest.get("from_name"),
            "from_email": latest.get("from_email"),
            "received": dt_util.utc_from_timestamp(when / 1000).isoformat() if when else None,
            "has_attachments": latest.get("attachments"),
            "vip": latest.get("vip"),
            "preview": latest.get("preview") or None,
        }


class StorageSensor(CrowMessengerEmailEntity, SensorEntity):
    _attr_icon = "mdi:harddisk"
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, a: Account) -> None:
        super().__init__(a, "storage")

    @property
    def native_value(self):
        st = self.stats.get("storage")
        return st.get("percent") if st else None

    @property
    def extra_state_attributes(self):
        st = self.stats.get("storage") or {}
        mb = lambda v: round(v / 1048576, 1) if v else None  # noqa: E731
        return {"used_mb": mb(st.get("used")), "total_mb": mb(st.get("total"))}


class LastCheckedSensor(CrowMessengerEmailEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, a: Account) -> None:
        super().__init__(a, "last_checked")

    @property
    def native_value(self):
        v = self.stats.get("last_sync")
        return datetime.fromisoformat(v) if v else None


class ParcelsSensor(CrowMessengerEmailEntity, SensorEntity):
    """Parcel Tracker (an AI feature): deliveries on their way, found in email."""
    _attr_icon = "mdi:package-variant-closed"
    _attr_native_unit_of_measurement = "parcels"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "parcels")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "parcels")

    @property
    def _list(self) -> list[dict]:
        return self.mailer.smart.parcels(self.account_id)

    @property
    def native_value(self):
        return sum(1 for p in self._list if p.get("status") != "delivered")

    @property
    def extra_state_attributes(self):
        today = dt_util.now().date().isoformat()
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        waiting = [p for p in self._list if p.get("status") != "delivered"]
        return {
            "expected_today": sum(1 for p in waiting if p.get("expected") == today),
            "out_for_delivery": sum(1 for p in waiting if p.get("status") == "out_for_delivery"),
            "parcels": [{"item": p.get("item") if share else "", "retailer": p.get("retailer") if share else "",
                         "courier": p.get("courier"), "status": p.get("status"), "expected": p.get("expected") or None,
                         "tracking": p.get("tracking") if share else ""} for p in self._list],
        }


class JunkSensor(CrowMessengerEmailEntity, SensorEntity):
    """Email in the account's Junk (or Spam) folder."""
    _attr_icon = "mdi:email-alert"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "emails"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "junk")

    @property
    def native_value(self):
        j = self.stats.get("junk")
        return j.get("messages") if isinstance(j, dict) else None

    @property
    def extra_state_attributes(self):
        j = self.stats.get("junk")
        return {"unread": j.get("unseen") if isinstance(j, dict) else None}


class BadgeSensor(CrowMessengerEmailEntity, SensorEntity):
    """The number on the Home Assistant app's icon for the person who owns this account."""
    _attr_icon = "mdi:numeric-9-plus-circle"
    _attr_entity_registry_enabled_default = True

    def __init__(self, a: Account) -> None:
        super().__init__(a, "badge")

    @property
    def available(self) -> bool:
        return self.rt is not None and self.mailer.badge.enabled

    @property
    def native_value(self):
        rt = self.rt
        return self.mailer.badge.total(rt.acc["owner"]) if rt else None

    @property
    def extra_state_attributes(self):
        rt = self.rt
        if not rt:
            return {}
        uid = rt.acc["owner"]
        p = self.mailer.badge.prefs(uid)
        return {"counts": p["count"], "email": self.mailer.badge.email_count(uid),
                "extra": int(self.mailer.data["badge_extra"].get(uid) or 0)}


class AttentionTodaySensor(CrowMessengerEmailEntity, SensorEntity):
    """Today: parcels arriving, reminders due, snoozed emails coming back and follow-ups, for this account."""
    _attr_icon = "mdi:calendar-today"
    _attr_native_unit_of_measurement = "items"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "attention_today")

    @property
    def _items(self) -> list[dict]:
        rt = self.rt
        if not rt:
            return []
        try:
            return self.mailer.features.today_for(rt.acc["owner"], rt.id)
        except Exception:  # noqa: BLE001
            return []

    @property
    def native_value(self):
        return len(self._items) if self.rt else None

    @property
    def extra_state_attributes(self):
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        items = self._items
        def pick(kind):
            return [{"title": x.get("title") if share else "", "detail": x.get("sub"), "at": x.get("at")} for x in items if x["kind"] == kind]
        return {"parcels": pick("parcel"), "reminders": pick("reminder"), "snoozed": pick("snoozed"), "follow_ups": pick("followup"),
                "appointments": pick("appointment"), "bills": pick("bill")}


class BillsDueSensor(CrowMessengerEmailEntity, SensorEntity):
    """Bills (found by the AI) due in the next 7 days, or overdue, and not marked paid."""
    _attr_icon = "mdi:cash-clock"
    _attr_native_unit_of_measurement = "bills"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "bills_due")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "bills")

    @property
    def native_value(self):
        return len(self.mailer.aix.bills_due(self.account_id)) if self.rt else None

    @property
    def extra_state_attributes(self):
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        due = self.mailer.aix.bills_due(self.account_id) if rt else []
        totals: dict[str, float] = {}
        for x in due:
            if x.get("amount") is not None:
                totals[x.get("currency") or ""] = round(totals.get(x.get("currency") or "", 0) + x["amount"], 2)
        return {"total": totals, "bills": [{"payee": x.get("payee") if share else "", "amount": x.get("amount"),
                                            "currency": x.get("currency"), "due": x.get("due"),
                                            "higher_than_last_time": x.get("higher")} for x in due]}


def _iso(ms) -> str | None:
    return dt_util.utc_from_timestamp(ms / 1000).isoformat() if ms else None


def _who(people, share: bool) -> list[str]:
    return [p.get("name") or p.get("email") or "" for p in (people or [])] if share else []


class SnoozedSensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    """Emails snoozed until later, and when the next one comes back."""
    _attr_icon = "mdi:clock-outline"
    _attr_native_unit_of_measurement = "emails"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "snoozed")

    @property
    def _list(self) -> list[dict]:
        rt = self.rt
        return [s for s in self.mailer.features.snoozed_for(rt.acc["owner"]) if s.get("account") == rt.id] if rt else []

    @property
    def native_value(self):
        return len(self._list) if self.rt else None

    @property
    def extra_state_attributes(self):
        lst, share = self._list, self.share
        return {"next_back": _iso(lst[0]["until"]) if lst else None,
                "emails": [{"subject": s.get("subject") if share else "", "from": _who(s.get("from"), share),
                            "back": _iso(s.get("until"))} for s in lst[:20]]}


class RemindersSensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    """Remind Me: emails with a reminder set, including ones whose time has come and not been dealt with."""
    _attr_icon = "mdi:bell-ring-outline"
    _attr_native_unit_of_measurement = "reminders"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "reminders")

    @property
    def _list(self) -> list[dict]:
        rt = self.rt
        if not rt:
            return []
        return sorted([r for r in self.mailer.reminders_for(rt.acc["owner"]) if r.get("account") == rt.id], key=lambda r: r.get("at", 0))

    @property
    def native_value(self):
        return len(self._list) if self.rt else None

    @property
    def extra_state_attributes(self):
        lst, share = self._list, self.share
        coming = [r for r in lst if not r.get("fired")]
        return {"due_now": sum(1 for r in lst if r.get("fired")), "next": _iso(coming[0]["at"]) if coming else None,
                "reminders": [{"subject": r.get("subject") if share else "", "from": _who(r.get("from"), share),
                               "at": _iso(r.get("at")), "due": bool(r.get("fired"))} for r in lst[:20]]}


class WaitingReplySensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    """Follow-Up Nudges (an AI feature): emails you sent that haven't had a reply."""
    _attr_icon = "mdi:email-fast-outline"
    _attr_native_unit_of_measurement = "emails"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "waiting_reply")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "followup")

    @property
    def _list(self) -> list[dict]:
        rt = self.rt
        return [n for n in self.mailer.smart.nudges_for(rt.acc["owner"]) if n.get("account") == rt.id] if rt else []

    @property
    def native_value(self):
        return len(self._list) if self.rt else None

    @property
    def extra_state_attributes(self):
        share = self.share
        return {"emails": [{"subject": n.get("subject") if share else "", "to": _who(n.get("to"), share),
                            "sent": _iso(n.get("date")), "why": n.get("why") if share else ""} for n in self._list[:20]]}


class ScreenerSensor(CrowMessengerEmailEntity, SensorEntity):
    """The Screener: emails from first-time senders, waiting for a Yes or No."""
    _attr_icon = "mdi:account-question"
    _attr_native_unit_of_measurement = "emails"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "screener")

    @property
    def available(self) -> bool:
        rt = self.rt
        return rt is not None and self.mailer.features.screener_for(rt.acc["owner"])["on"]

    @property
    def native_value(self):
        sc = self.stats.get("screener")
        return sc.get("emails") if sc else None

    @property
    def extra_state_attributes(self):
        sc = self.stats.get("screener") or {}
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        return {"senders": sc.get("senders"),
                "waiting": [{"name": g.get("name") if share else "", "email": g.get("email") if share else "",
                             "emails": g.get("emails"), "subject": g.get("subject") if share else "",
                             "latest": _iso(g.get("latest"))} for g in sc.get("waiting", [])]}


class NextBillSensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    """Bills (found by the AI): the next unpaid one, by its due date."""
    _attr_icon = "mdi:cash-clock"
    _attr_device_class = SensorDeviceClass.DATE

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_bill")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "bills")

    @property
    def _bill(self) -> tuple[dict, date] | None:
        today = dt_util.now().date()
        best = None
        for x in self.mailer.data["bills"].get(self.account_id, []):
            if x.get("paid") or not x.get("due"):
                continue
            try:
                d = datetime.fromisoformat(x["due"]).date()
            except ValueError:
                continue
            if d >= today and (best is None or d < best[1]):
                best = (x, d)
        return best

    @property
    def native_value(self):
        b = self._bill
        return b[1] if b else None

    @property
    def extra_state_attributes(self):
        b = self._bill
        if not b:
            return {}
        x, d = b
        return {"payee": x.get("payee") if self.share else "", "amount": x.get("amount"), "currency": x.get("currency"),
                "days_until_due": (d - dt_util.now().date()).days, "higher_than_last_time": x.get("higher")}


class LatestVipSensor(CrowMessengerEmailEntity, SensorEntity):
    """The subject of the newest email from a VIP in the Inbox, with who it's from."""
    _attr_icon = "mdi:star-circle-outline"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "latest_vip")

    @property
    def native_value(self):
        latest = self.stats.get("latest_vip")
        if not latest:
            return None
        return (latest.get("subject") or "(No subject)")[:250]

    @property
    def extra_state_attributes(self):
        latest = self.stats.get("latest_vip") or {}
        when = latest.get("date")
        return {
            "from_name": latest.get("from_name"),
            "from_email": latest.get("from_email"),
            "received": dt_util.utc_from_timestamp(when / 1000).isoformat() if when else None,
            "has_attachments": latest.get("attachments"),
            "preview": latest.get("preview") or None,
        }


UNREAD_GROUPS = {"person": ("unread_people", "mdi:account"), "notify": ("unread_notifications", "mdi:bell"),
                 "council": ("unread_council", "mdi:town-hall"),
                 "shop": ("unread_shopping", "mdi:shopping"), "social": ("unread_social", "mdi:account-group"),
                 "news": ("unread_newsletters", "mdi:newspaper-variant-outline")}


class UnreadGroupSensor(CrowMessengerEmailEntity, SensorEntity):
    """Unread emails in one of the Inbox's groups (People, Notifications, Council and Local, Shopping, Social, Newsletters),
    as the card sorts them."""
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "emails"

    def __init__(self, a: Account, group: str) -> None:
        key, icon = UNREAD_GROUPS[group]
        super().__init__(a, key)
        self.group = group
        self._attr_icon = icon

    @property
    def native_value(self):
        g = self.stats.get("unread_groups")
        return g.get(self.group) if g else None

    @property
    def extra_state_attributes(self):
        g = self.stats.get("unread_groups") or {}
        return {"not_counted": g.get("not_counted") or 0}


class SubscriptionsSensor(CrowMessengerEmailEntity, SensorEntity):
    """Mailing lists in the Inbox you're still subscribed to, counted every few hours."""
    _attr_icon = "mdi:email-newsletter"
    _attr_native_unit_of_measurement = "lists"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "subscriptions")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_call_later(self.hass, 120, self._refresh))
        self.async_on_remove(async_track_time_interval(self.hass, self._refresh, timedelta(seconds=SUBSCRIPTIONS_EVERY)))

    async def _refresh(self, _now=None) -> None:
        rt = self.rt
        if not rt or not rt.stats.get("connected"):
            return
        try:
            await self.mailer.features.async_subscriptions(rt.acc["owner"], rt.id, force=True)
        except Exception as err:  # noqa: BLE001 - tried again next time
            _LOGGER.debug("Crow Messenger Email couldn't count subscriptions for %s: %s", rt.acc["email"], err)
            return
        self.async_write_ha_state()

    @property
    def _lists(self) -> tuple[float, list[dict]] | None:
        rt = self.rt
        hit = self.mailer.features.subs_cache.get(self.account_id) if rt else None
        if not hit:
            return None
        return hit[0], [g for g in self.mailer.features._mark(rt.acc["owner"], hit[1]) if not g.get("unsubscribed")]

    @property
    def native_value(self):
        hit = self._lists
        return len(hit[1]) if hit else None

    @property
    def extra_state_attributes(self):
        hit = self._lists
        if not hit:
            return {}
        at, lst = hit
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        busiest = sorted(lst, key=lambda g: g.get("per_week", 0), reverse=True)[:10]
        return {"emails": sum(g.get("count", 0) for g in lst), "unread": sum(g.get("unread", 0) for g in lst),
                "per_week": round(sum(g.get("per_week", 0) for g in lst), 1),
                "busiest": [{"name": g.get("name") if share else "", "email": g.get("email") if share else "",
                             "per_week": g.get("per_week"), "emails": g.get("count")} for g in busiest],
                "counted": dt_util.utc_from_timestamp(at).isoformat()}


def _ms_dt(ms):
    return dt_util.utc_from_timestamp(ms / 1000) if ms else None


class _OrderSensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    kind = ""

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, self.kind)

    @property
    def _next(self) -> dict | None:
        act = self.mailer.orders.active(self.kind, self.account_id) if self.rt else []
        return act[0] if act else None


class FoodArrivingSensor(_OrderSensor):
    """Food Orders (an AI feature): when the next food order should arrive, or be ready to collect."""
    _attr_icon = "mdi:food"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    kind = "food"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "food_arriving")

    @property
    def native_value(self):
        o = self._next
        return _ms_dt(self.mailer.orders.when(o)) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        if not o:
            return {"orders": 0}
        share = self.share
        return {"orders": len(self.mailer.orders.active("food", self.account_id)),
                "restaurant": o.get("restaurant") if share else "", "service": o.get("service") if share else "",
                "status": o.get("status"), "method": o.get("method"), "time_given": bool(o.get("arrive_at")),
                "total": o.get("total"), "currency": o.get("currency")}


class NextGroceryDeliverySensor(_OrderSensor):
    """Supermarket Deliveries (an AI feature): the start of the next delivery (or click and collect) slot."""
    _attr_icon = "mdi:cart"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    kind = "groceries"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_grocery_delivery")

    @property
    def native_value(self):
        o = self._next
        return _ms_dt(self.mailer.orders.when(o)) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        if not o:
            return {"orders": 0}
        share = self.share
        return {"orders": len(self.mailer.orders.active("groceries", self.account_id)),
                "shop": o.get("shop") if share else "", "status": o.get("status"), "method": o.get("method"),
                "slot_end": _iso(o.get("slot_end_at")), "change_by": _iso(o.get("edit_by_at")),
                "total": o.get("total"), "currency": o.get("currency"),
                "substitutions": (o.get("substitutions") or []) if share else len(o.get("substitutions") or []),
                "missing": (o.get("missing") or []) if share else len(o.get("missing") or [])}


class SpendSensor(_OrderSensor):
    """What food orders (or supermarket deliveries) found in email have cost this month, in Home Assistant's currency."""
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, a: Account, kind: str) -> None:
        self.kind = kind
        super().__init__(a, "food_spend" if kind == "food" else "grocery_spend")
        self._attr_icon = "mdi:food-takeout-box" if kind == "food" else "mdi:cart-variant"

    @property
    def _cur(self) -> str:
        return (getattr(self.hass.config, "currency", "") or "GBP").upper() if self.hass else "GBP"

    @property
    def native_unit_of_measurement(self):
        return self._cur

    @property
    def last_reset(self):
        return dt_util.start_of_local_day().replace(day=1)

    @property
    def native_value(self):
        return self.mailer.orders.spend(self.kind, self.account_id).get(self._cur, 0) if self.rt else None

    @property
    def extra_state_attributes(self):
        now = dt_util.now()
        last = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        this = self.mailer.orders.spend(self.kind, self.account_id)
        books = self.mailer.data["order_spend"].get(self.account_id, {}).get(self.kind, {})
        return {"orders": len(books.get(now.strftime("%Y-%m"), {})),
                "last_month": self.mailer.orders.spend(self.kind, self.account_id, last).get(self._cur, 0),
                "other_currencies": {c: v for c, v in this.items() if c != self._cur}}


# ── Travel, Returns, Renewals, Home Visits, Tickets, Council and Receipts ──
EVERY_5 = tuple(range(0, 60, 5))


class _FindSensor(HourlyRefresh, CrowMessengerEmailEntity, SensorEntity):
    kind = ""

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, self.kind)

    @property
    def _active(self) -> list[dict]:
        return self.mailer.finds.active(self.kind, self.account_id) if self.rt else []

    def _p(self, v):
        """A detail that's only shown when the account's Show Sender and Subject is on."""
        return v if self.share else ""


def _cur(hass) -> str:
    return (getattr(hass.config, "currency", "") or "GBP").upper() if hass else "GBP"


def _days(iso: str):
    try:
        return (date.fromisoformat(iso[:10]) - dt_util.now().date()).days
    except (TypeError, ValueError):
        return None


class NextTravelSensor(_FindSensor):
    """Travel (an AI feature): when the next flight, train, ferry, hotel stay or car hire starts."""
    _attr_icon = "mdi:airplane-takeoff"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    kind = "travel"
    refresh_minutes = EVERY_5

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_travel")

    @property
    def _next(self):
        return next((o for o in self._active if o.get("start_at") and o["start_at"] + 3600_000 >= dt_util.utcnow().timestamp() * 1000), None)

    @property
    def native_value(self):
        o = self._next
        return _ms_dt(o["start_at"]) if o else None

    @property
    def extra_state_attributes(self):
        from .finds import trips
        o = self._next
        if not o:
            return {}
        trip = next((t for t in trips(self.mailer.finds.items("travel", self.account_id)) if o["id"] in t["ids"]), None)
        return {"type": o.get("type"), "title": self._p(o.get("title")), "provider": self._p(o.get("provider")),
                "number": self._p(o.get("number")), "from": self._p(o.get("from")), "to": self._p(o.get("to")),
                "end": _iso(o.get("end_at")), "terminal": o.get("terminal") or None, "gate": o.get("gate") or None,
                "seat": self._p(o.get("seat")) or None, "status": o.get("status"), "delay_minutes": o.get("delay_minutes"),
                "check_in_opens": _iso(o.get("checkin_opens_at")), "reference": self._p(o.get("reference")),
                "trip": self._p(trip["name"]) if trip else None, "trip_start": _iso(trip["start"]) if trip else None,
                "trip_end": _iso(trip["end"]) if trip else None}


class RefundsOwedSensor(_FindSensor):
    """Returns and Refunds (an AI feature): refunds still to come, in Home Assistant's currency."""
    _attr_icon = "mdi:cash-refund"
    _attr_device_class = SensorDeviceClass.MONETARY
    kind = "returns"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "refunds_owed")

    @property
    def native_unit_of_measurement(self):
        return _cur(self.hass)

    @property
    def native_value(self):
        if not self.rt:
            return None
        cur = _cur(self.hass)
        return round(sum(o.get("refund_amount") or 0 for o in self._active if (o.get("currency") or cur) == cur), 2)

    @property
    def extra_state_attributes(self):
        return {"returns": [{"item": self._p(o.get("item")), "shop": self._p(o.get("shop")), "status": o.get("status"),
                             "refund": o.get("refund_amount"), "currency": o.get("currency") or None,
                             "return_by": o.get("return_by") or None} for o in self._active]}


class ReturnDeadlineSensor(_FindSensor):
    """Returns and Refunds: the last day to send back the next thing that hasn't been sent yet."""
    _attr_icon = "mdi:package-variant-closed-remove"
    _attr_device_class = SensorDeviceClass.DATE
    kind = "returns"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "return_deadline")

    @property
    def _next(self):
        return next((o for o in sorted(self._active, key=lambda o: o.get("return_by") or "9999")
                     if o.get("return_by") and o.get("status") in ("started", "label_ready")), None)

    @property
    def native_value(self):
        o = self._next
        return date.fromisoformat(o["return_by"]) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        return {"item": self._p(o.get("item")), "shop": self._p(o.get("shop")), "method": o.get("method") or None,
                "days_left": _days(o["return_by"]), "status": o.get("status")} if o else {}


class NextRenewalSensor(_FindSensor):
    """Renewals (an AI feature): the next insurance, MOT, licence or contract to renew or run out."""
    _attr_icon = "mdi:autorenew"
    _attr_device_class = SensorDeviceClass.DATE
    kind = "renewals"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_renewal")

    @property
    def _next(self):
        return next((o for o in self._active if o.get("renews") and (_days(o["renews"]) or 0) >= 0), None)

    @property
    def native_value(self):
        o = self._next
        return date.fromisoformat(o["renews"]) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        if not o:
            return {}
        up = None
        if o.get("price") and o.get("previous_price"):
            up = round((o["price"] / o["previous_price"] - 1) * 100)
        return {"what": o.get("what"), "provider": self._p(o.get("provider")), "price": o.get("price"),
                "previous_price": o.get("previous_price"), "change_percent": up, "currency": o.get("currency") or None,
                "auto_renew": o.get("auto_renew"), "days_until": _days(o["renews"]),
                "upcoming": [{"what": x.get("what"), "renews": x.get("renews")} for x in self._active if x.get("renews")][:10]}


class NextHomeVisitSensor(_FindSensor):
    """Home Visits (an AI feature): the start of the next engineer, service or delivery window."""
    _attr_icon = "mdi:account-wrench"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    kind = "visits"
    refresh_minutes = EVERY_5

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_home_visit")

    @property
    def _next(self):
        return next((o for o in self._active if o.get("start_at")), None)

    @property
    def native_value(self):
        o = self._next
        return _ms_dt(o["start_at"]) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        return {"what": o.get("what"), "company": self._p(o.get("company")), "window_end": _iso(o.get("end_at")),
                "status": o.get("status")} if o else {}


class NextEventSensor(_FindSensor):
    """Tickets (an AI feature): when the next concert, match or show starts."""
    _attr_icon = "mdi:ticket-confirmation"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    kind = "tickets"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "next_event")

    @property
    def _next(self):
        return next((o for o in self._active if o.get("start_at")), None)

    @property
    def native_value(self):
        o = self._next
        return _ms_dt(o["start_at"]) if o else None

    @property
    def extra_state_attributes(self):
        o = self._next
        return {"event": self._p(o.get("event")), "venue": self._p(o.get("venue")), "doors": _iso(o.get("doors_at")),
                "seats": self._p(o.get("seats")) or None, "quantity": o.get("quantity"), "status": o.get("status")} if o else {}


class CouncilSensor(_FindSensor):
    """Council and Local (an AI feature): news from the council, school or local services that's still current."""
    _attr_icon = "mdi:town-hall"
    _attr_native_unit_of_measurement = "updates"
    kind = "council"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "council_updates")

    @property
    def native_value(self):
        return len(self._active) if self.rt else None

    @property
    def extra_state_attributes(self):
        bins = next((o for o in sorted(self._active, key=lambda o: o.get("date") or "9999")
                     if o.get("topic") == "bins" and o.get("date") and (_days(o["date"]) or 0) >= 0), None)
        return {"next_bin_change": bins.get("date") if bins else None,
                "updates": [{"topic": o.get("topic"), "title": self._p(o.get("title")), "date": o.get("date") or None,
                             "action_by": o.get("action_by") or None, "detail": self._p(o.get("detail"))} for o in self._active[:20]]}


class WarrantiesSensor(_FindSensor):
    """Receipts (an AI feature): warranties ending in the next 90 days."""
    _attr_icon = "mdi:shield-check-outline"
    _attr_native_unit_of_measurement = "warranties"
    kind = "receipts"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "warranties_ending")

    @property
    def _soon(self):
        return [o for o in self._active if o.get("warranty_until") and 0 <= (_days(o["warranty_until"]) or -1) <= 90]

    @property
    def native_value(self):
        return len(self._soon) if self.rt else None

    @property
    def extra_state_attributes(self):
        return {"receipts": len(self._active),
                "ending": [{"item": self._p(o.get("item")), "shop": self._p(o.get("shop")), "warranty_until": o.get("warranty_until"),
                            "days_left": _days(o["warranty_until"])} for o in self._soon]}
