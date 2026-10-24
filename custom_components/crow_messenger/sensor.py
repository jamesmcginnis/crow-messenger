"""Sensors for each person: Unread messages and Latest message.

Latest message says who sent it and in which chat, never what it says."""
from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .entity import CrowMessengerEntity, EntityHub, _kind, setup_platform


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    setup_platform(hass, entry, add, lambda hub, uid: [UnreadSensor(hub, uid), LatestSensor(hub, uid)])


class UnreadSensor(CrowMessengerEntity, SensorEntity):
    """Unread messages in chats that aren't muted (the same number as the app icon badge)."""
    _attr_icon = "mdi:message-badge"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "messages"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "unread")

    @property
    def native_value(self):
        return self.stats["unread"]

    @property
    def extra_state_attributes(self):
        s = self.stats
        return {"conversations": s["unread_chats"], "in_muted_conversations": s["unread_muted"]}


class LatestSensor(CrowMessengerEntity, SensorEntity):
    """Who last sent this person a message."""
    _attr_icon = "mdi:message-text-clock"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "latest")

    @property
    def native_value(self):
        latest = self.stats["latest"]
        return self.hub.name(latest[1]["sender"])[:250] if latest else None

    @property
    def extra_state_attributes(self):
        latest = self.stats["latest"]
        if not latest:
            return {"conversation": None, "is_group": None, "received": None, "kind": None,
                    "unread": None, "thread_id": None, "sender_id": None}
        thread, msg = latest
        if thread["is_group"]:
            others = [self.hub.name(p) for p in thread["participants"] if p != self.uid]
            conversation = thread.get("name") or ", ".join(others)
        else:
            conversation = self.hub.name(msg["sender"])
        m = self.hub.messenger
        return {
            "conversation": conversation[:250],
            "is_group": thread["is_group"],
            "received": dt_util.utc_from_timestamp(msg["ts"] / 1000).isoformat(),
            "kind": _kind(m, msg),
            "unread": msg["ts"] > thread["read"].get(self.uid, 0),
            "thread_id": thread["id"],
            "sender_id": msg["sender"],
        }
