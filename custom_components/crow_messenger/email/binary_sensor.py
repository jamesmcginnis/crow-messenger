"""Binary sensors for each email account: Connected, New Mail, Parcel Out for Delivery, Bill Overdue,
Food Order in Progress, Supermarket Delivery Coming, Away on a Trip, Travel Disruption, Renewal Due Soon,
Home Visit Today and Home Visit Now."""
from __future__ import annotations

from datetime import datetime

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .entity import CrowMessengerEmailEntity, HourlyRefresh, setup_platform
from .manager import Account


@callback
def email_setup(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback):
    """Called by Crow Messenger's own platform when Email is on. Returns the function that stops it."""
    return setup_platform(hass, entry, add, lambda a: [ConnectedSensor(a), NewMailSensor(a), OutForDeliverySensor(a),
                                                 BillOverdueSensor(a), FoodOrderSensor(a), GroceriesComingSensor(a),
                                                 AwayOnTripSensor(a), TravelDisruptionSensor(a), RenewalDueSoonSensor(a),
                                                 HomeVisitTodaySensor(a), HomeVisitNowSensor(a)])


class ConnectedSensor(CrowMessengerEmailEntity, BinarySensorEntity):
    """On while Home Assistant is signed in to the mail server."""
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, a: Account) -> None:
        super().__init__(a, "connected")

    @property
    def is_on(self):
        return bool(self.stats.get("connected"))

    @property
    def extra_state_attributes(self):
        return {"error": self.stats.get("error") or None}


class NewMailSensor(CrowMessengerEmailEntity, BinarySensorEntity):
    """On when unread mail has arrived since the Inbox was last looked at in the card."""
    _attr_icon = "mdi:email-alert"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "new_mail")

    @property
    def is_on(self):
        return bool(self.stats.get("new_mail"))


class OutForDeliverySensor(CrowMessengerEmailEntity, BinarySensorEntity):
    """Parcel Tracker (an AI feature): on while a parcel is out for delivery."""
    _attr_icon = "mdi:truck-delivery"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "out_for_delivery")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "parcels")

    @property
    def _list(self) -> list[dict]:
        return [p for p in self.mailer.smart.parcels(self.account_id) if p.get("status") == "out_for_delivery"]

    @property
    def is_on(self):
        return bool(self._list)

    @property
    def extra_state_attributes(self):
        rt = self.rt
        share = rt.acc.get("share_details", True) if rt else True
        lst = self._list
        return {"count": len(lst),
                "parcels": [{"item": p.get("item") if share else "", "retailer": p.get("retailer") if share else "",
                             "courier": p.get("courier")} for p in lst]}


class BillOverdueSensor(HourlyRefresh, CrowMessengerEmailEntity, BinarySensorEntity):
    """Bills (an AI feature): on while a bill is past its due date and not marked paid."""
    _attr_icon = "mdi:cash-remove"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "bill_overdue")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "bills")

    @property
    def _list(self) -> list[tuple[dict, int]]:
        today = dt_util.now().date()
        out = []
        for x in self.mailer.data["bills"].get(self.account_id, []):
            if x.get("paid") or not x.get("due"):
                continue
            try:
                late = (today - datetime.fromisoformat(x["due"]).date()).days
            except ValueError:
                continue
            if late > 0:
                out.append((x, late))
        return sorted(out, key=lambda t: t[1], reverse=True)

    @property
    def is_on(self):
        return bool(self._list)

    @property
    def extra_state_attributes(self):
        share = self.share
        lst = self._list
        totals: dict[str, float] = {}
        for x, _ in lst:
            if x.get("amount") is not None:
                totals[x.get("currency") or ""] = round(totals.get(x.get("currency") or "", 0) + x["amount"], 2)
        return {"count": len(lst), "total": totals,
                "bills": [{"payee": x.get("payee") if share else "", "amount": x.get("amount"), "currency": x.get("currency"),
                           "due": x.get("due"), "days_overdue": late} for x, late in lst]}


class FoodOrderSensor(HourlyRefresh, CrowMessengerEmailEntity, BinarySensorEntity):
    """Food Orders (an AI feature): on from ordering until it's delivered (or probably delivered)."""
    _attr_icon = "mdi:food"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "food_order")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "food")

    @property
    def is_on(self):
        return bool(self.mailer.orders.active("food", self.account_id))

    @property
    def extra_state_attributes(self):
        share = self.share
        act = self.mailer.orders.active("food", self.account_id)
        return {"on_its_way": any(o["status"] == "on_its_way" for o in act),
                "ready_to_collect": any(o["status"] == "ready" for o in act),
                "orders": [{"restaurant": o.get("restaurant") if share else "", "status": o.get("status"), "method": o.get("method"),
                            "arrive": o.get("arrive") or None} for o in act]}


class GroceriesComingSensor(HourlyRefresh, CrowMessengerEmailEntity, BinarySensorEntity):
    """Supermarket Deliveries (an AI feature): on while a delivery is on its way, or during its slot."""
    _attr_icon = "mdi:cart-arrow-down"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "groceries_coming")

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, "groceries")

    @property
    def _now(self) -> list[dict]:
        now = dt_util.utcnow().timestamp() * 1000
        out = []
        for o in self.mailer.orders.active("groceries", self.account_id):
            start, end = o.get("slot_start_at"), o.get("slot_end_at") or ((o.get("slot_start_at") or 0) + 3600_000)
            if o["status"] in ("on_its_way", "ready") or (start and start <= now <= end):
                out.append(o)
        return out

    @property
    def is_on(self):
        return bool(self._now)

    @property
    def extra_state_attributes(self):
        share = self.share
        return {"deliveries": [{"shop": o.get("shop") if share else "", "status": o.get("status"), "method": o.get("method"),
                                "slot_start": o.get("slot_start") or None, "slot_end": o.get("slot_end") or None} for o in self._now]}


# ── Travel, Renewals and Home Visits ──
class _FindBinary(HourlyRefresh, CrowMessengerEmailEntity, BinarySensorEntity):
    kind = ""
    refresh_minutes = tuple(range(0, 60, 5))

    @property
    def available(self) -> bool:
        from . import ai
        return self.rt is not None and ai.on(self.hass, self.mailer, self.kind)

    @property
    def _now(self) -> int:
        return int(dt_util.utcnow().timestamp() * 1000)


class AwayOnTripSensor(_FindBinary):
    """Travel: on from the start of a trip (with somewhere to stay, or more than one booking) to its end."""
    _attr_icon = "mdi:bag-suitcase"
    kind = "travel"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "away_on_trip")

    @property
    def _trip(self):
        from .finds import trips
        now = self._now
        return next((t for t in trips(self.mailer.finds.items("travel", self.account_id)) if t["away"] and t["start"] <= now <= t["end"]), None)

    @property
    def is_on(self):
        return self._trip is not None

    @property
    def extra_state_attributes(self):
        t = self._trip
        if not t:
            return {}
        return {"trip": t["name"] if self.share else "", "back": dt_util.utc_from_timestamp(t["end"] / 1000).isoformat()}


class TravelDisruptionSensor(_FindBinary):
    """Travel: on while a booking in the next two days is delayed, changed or cancelled."""
    _attr_icon = "mdi:airplane-alert"
    kind = "travel"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "travel_disruption")

    @property
    def _hit(self):
        now = self._now
        return [o for o in self.mailer.finds.items("travel", self.account_id)
                if o.get("status") in ("delayed", "changed", "cancelled") and o.get("start_at")
                and now - 6 * 3600_000 <= o["start_at"] <= now + 48 * 3600_000]

    @property
    def is_on(self):
        return bool(self._hit)

    @property
    def extra_state_attributes(self):
        return {"bookings": [{"title": o.get("title") if self.share else "", "number": o.get("number") if self.share else "",
                              "status": o.get("status"), "delay_minutes": o.get("delay_minutes"), "gate": o.get("gate") or None,
                              "start": o.get("start")} for o in self._hit]}


class RenewalDueSoonSensor(_FindBinary):
    """Renewals: on while something renews or runs out in the next 30 days."""
    _attr_icon = "mdi:calendar-alert"
    kind = "renewals"
    refresh_minutes = (0,)

    def __init__(self, a: Account) -> None:
        super().__init__(a, "renewal_due_soon")

    @property
    def _soon(self):
        today = dt_util.now().date()
        out = []
        for o in self.mailer.finds.active("renewals", self.account_id):
            try:
                d = (datetime.fromisoformat(o.get("renews") or "").date() - today).days
            except ValueError:
                continue
            if 0 <= d <= 30:
                out.append((o, d))
        return out

    @property
    def is_on(self):
        return bool(self._soon)

    @property
    def extra_state_attributes(self):
        return {"renewals": [{"what": o.get("what"), "renews": o.get("renews"), "days_until": d, "auto_renew": o.get("auto_renew"),
                              "price": o.get("price")} for o, d in self._soon]}


class HomeVisitTodaySensor(_FindBinary):
    """Home Visits: on all day when an engineer, service or delivery is due today."""
    _attr_icon = "mdi:account-clock"
    kind = "visits"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "home_visit_today")

    @property
    def _today(self):
        day = dt_util.now().date().isoformat()
        return [o for o in self.mailer.finds.active("visits", self.account_id) if (o.get("start") or "")[:10] == day]

    @property
    def is_on(self):
        return bool(self._today)

    @property
    def extra_state_attributes(self):
        return {"visits": [{"what": o.get("what"), "company": o.get("company") if self.share else "", "start": o.get("start") or None,
                            "end": o.get("end") or None, "status": o.get("status")} for o in self._today]}


class HomeVisitNowSensor(_FindBinary):
    """Home Visits: on during a visit's time window (or for four hours from its start, with no end given)."""
    _attr_icon = "mdi:home-account"
    kind = "visits"

    def __init__(self, a: Account) -> None:
        super().__init__(a, "home_visit_now")

    @property
    def _now_visits(self):
        now = self._now
        return [o for o in self.mailer.finds.active("visits", self.account_id)
                if o.get("start_at") and o["start_at"] <= now <= (o.get("end_at") or o["start_at"] + 4 * 3600_000)]

    @property
    def is_on(self):
        return bool(self._now_visits)

    @property
    def extra_state_attributes(self):
        return {"visits": [{"what": o.get("what"), "company": o.get("company") if self.share else "", "end": o.get("end") or None,
                            "status": o.get("status")} for o in self._now_visits]}
