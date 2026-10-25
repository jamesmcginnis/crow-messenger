"""Sensors for each person: Unread messages, Latest message and New posts (in the Feed).

Latest message says who sent it and in which chat, never what it says."""
from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import UnitOfInformation
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .entity import WAIT_MINUTES, CrowHouseholdEntity, CrowMessengerEntity, EntityHub, _kind, setup_platform


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    setup_platform(hass, entry, add, lambda hub, uid: [
        UnreadSensor(hub, uid), LatestSensor(hub, uid), NewPostsSensor(hub, uid), FeedNotifSensor(hub, uid),
        LastSeenSensor(hub, uid), ViewingSensor(hub, uid), WaitingSensor(hub, uid), RemindersSensor(hub, uid),
        LastPostSensor(hub, uid)])
    hub = hass.data["crow_messenger"].entities
    add([MessagesTodaySensor(hub), StorageSensor(hub), NextEventSensor(hub), ActiveChatsSensor(hub), PeopleOnlineSensor(hub)])


def _ts(ms):
    return dt_util.utc_from_timestamp(ms / 1000) if ms else None


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


class NewPostsSensor(CrowMessengerEntity, SensorEntity):
    """Posts in the Feed shared with this person that they haven't seen yet (how many, never what)."""
    _attr_icon = "mdi:newspaper-variant-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "posts"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "new_posts")

    @property
    def native_value(self):
        return self.stats.get("new_posts", 0)


class FeedNotifSensor(CrowMessengerEntity, SensorEntity):
    """The red number on their Feed bell: reactions, comments, tags, mentions… they haven't seen."""
    _attr_icon = "mdi:bell-badge-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "notifications"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "feed_notifications")

    @property
    def native_value(self):
        return self.stats.get("feed_notif", 0)


class LastSeenSensor(CrowMessengerEntity, SensorEntity):
    """When they last had the card open (now, while they do). Unknown for anyone who hides their activity."""
    _attr_icon = "mdi:account-clock"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "last_seen")

    @property
    def native_value(self):
        return _ts(self.stats.get("last_seen"))


class ViewingSensor(CrowMessengerEntity, SensorEntity):
    """Which part of the card they have on screen - Messages, a chat (never which), Feed, Contacts - or
    off when it's closed. Unknown for anyone who hides their activity, or when switched off in the editor."""
    _attr_icon = "mdi:monitor-eye"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["off", "messages", "chat", "feed", "contacts", "other"]

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "viewing")

    @property
    def available(self) -> bool:
        return super().available and (self.hub.messenger.settings.get("sensors") or {}).get("viewing") is not False

    @property
    def native_value(self):
        if self.hub.messenger.profile_for(self.uid).get("activity") is False:
            return None
        return self.stats.get("viewing") or "off"


class WaitingSensor(CrowMessengerEntity, SensorEntity):
    """Chats (not muted) where someone's message has waited for a reply for an hour or more."""
    _attr_icon = "mdi:message-reply-text-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "chats"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "waiting")

    @property
    def native_value(self):
        return self.stats.get("waiting", 0)

    @property
    def extra_state_attributes(self):
        since = self.stats.get("waiting_since")
        return {"waiting_since": _ts(since).isoformat() if since else None, "after_minutes": WAIT_MINUTES}


class RemindersSensor(CrowMessengerEntity, SensorEntity):
    """Remind Me Later and Send Later items waiting for this person."""
    _attr_icon = "mdi:bell-ring-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "items"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "reminders")

    @property
    def native_value(self):
        return self.stats.get("reminders", 0)

    @property
    def extra_state_attributes(self):
        return {"remind_me_later": self.stats.get("remind_me_later", 0), "send_later": self.stats.get("send_later", 0)}


class LastPostSensor(CrowMessengerEntity, SensorEntity):
    """When they last posted in the Feed, and how many posts this week (never what they said)."""
    _attr_icon = "mdi:post-outline"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "last_post")

    @property
    def native_value(self):
        return _ts(self.stats.get("last_post"))

    @property
    def extra_state_attributes(self):
        return {"posts_this_week": self.stats.get("posts_week", 0)}


# ── the household ──────────────────────────────────────────────────────────
class MessagesTodaySensor(CrowHouseholdEntity, SensorEntity):
    """Messages sent in the house today (this week and this month as attributes)."""
    _attr_icon = "mdi:message-text-fast-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "messages"

    def __init__(self, hub: EntityHub) -> None:
        super().__init__(hub, "messages_today")

    @property
    def native_value(self):
        return self.house["today"]

    @property
    def extra_state_attributes(self):
        return {"this_week": self.house["week"], "this_month": self.house["month"]}


class StorageSensor(CrowHouseholdEntity, SensorEntity):
    """Space the photos, videos and files take on the server."""
    _attr_icon = "mdi:harddisk"
    _attr_device_class = SensorDeviceClass.DATA_SIZE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfInformation.BYTES
    _attr_suggested_unit_of_measurement = UnitOfInformation.MEGABYTES
    _attr_suggested_display_precision = 1

    def __init__(self, hub: EntityHub) -> None:
        super().__init__(hub, "storage")

    @property
    def native_value(self):
        return self.house["storage_bytes"]

    @property
    def extra_state_attributes(self):
        oldest = self.house.get("storage_oldest")
        return {"files": self.house["storage_count"], "oldest": _ts(oldest).isoformat() if oldest else None}


class NextEventSensor(CrowHouseholdEntity, SensorEntity):
    """The next event in the Feed that's shared with everyone."""
    _attr_icon = "mdi:calendar-star"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, hub: EntityHub) -> None:
        super().__init__(hub, "next_event")

    @property
    def native_value(self):
        nxt = self.house.get("next_event")
        return _ts(nxt[1].get("start")) if nxt else None

    @property
    def extra_state_attributes(self):
        nxt = self.house.get("next_event")
        if not nxt:
            return {"title": None, "going": None, "maybe": None, "location": None, "post_id": None, "ends": None}
        p, ev = nxt
        rsvp = ev.get("rsvp") or {}
        return {"title": (ev.get("title") or "")[:200], "going": sum(1 for a in rsvp.values() if a == "going"),
                "maybe": sum(1 for a in rsvp.values() if a == "maybe"), "location": ev.get("location") or None,
                "post_id": p["id"], "ends": _ts(ev.get("end")).isoformat() if ev.get("end") else None,
                "all_day": bool(ev.get("all_day"))}


class ActiveChatsSensor(CrowHouseholdEntity, SensorEntity):
    """Conversations with a message in the last 24 hours."""
    _attr_icon = "mdi:forum-outline"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "chats"

    def __init__(self, hub: EntityHub) -> None:
        super().__init__(hub, "active_chats")

    @property
    def native_value(self):
        return self.house["active_chats"]


class PeopleOnlineSensor(CrowHouseholdEntity, SensorEntity):
    """How many people have the card open right now (not counting anyone who hides their activity)."""
    _attr_icon = "mdi:account-multiple-check"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "people"

    def __init__(self, hub: EntityHub) -> None:
        super().__init__(hub, "people_online")

    @property
    def native_value(self):
        return len(self.house["online"])

    @property
    def extra_state_attributes(self):
        return {"names": [self.hub.name(u) for u in self.house["online"]], "user_ids": self.house["online"]}
