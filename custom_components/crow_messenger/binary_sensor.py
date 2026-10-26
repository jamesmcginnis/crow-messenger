"""Binary sensors for each person: New messages, Active now and Phone ringing."""
from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import CrowMessengerEntity, EntityHub, setup_platform


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    setup_platform(hass, entry, add, lambda hub, uid: [NewMessagesSensor(hub, uid), ActiveSensor(hub, uid),
                                                       RingingSensor(hub, uid), TypingSensor(hub, uid),
                                                       LiveLocationSensor(hub, uid), BirthdaySensor(hub, uid),
                                                       QuietModeSensor(hub, uid)])
    # each email account's sensors, while Email is on
    hass.data["crow_messenger"].email.platform_ready("binary_sensor", add)


class NewMessagesSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while there are unread messages in chats that aren't muted."""
    _attr_icon = "mdi:message-alert"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "new_messages")

    @property
    def is_on(self) -> bool:
        return self.stats["unread"] > 0


class ActiveSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while the card is open and on screen, the "Active now" the others see. Unknown for anyone
    who has switched off Show Activity, so automations can't see what the people in their chats can't."""
    _attr_icon = "mdi:message-processing"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "active")

    @property
    def is_on(self) -> bool | None:
        return self.stats["online"]


class RingingSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while someone is using Ring Phone on this person's phone."""
    _attr_icon = "mdi:phone-ring"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "ringing")

    @property
    def is_on(self) -> bool:
        return bool(self.stats["ringing_by"])

    @property
    def extra_state_attributes(self):
        by = self.stats["ringing_by"]
        return {"rung_by": [self.hub.name(u) for u in by] or None}


class TypingSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while they're typing in any chat (never which). Unknown for anyone who hides their activity,
    and unavailable when switched off in the editor."""
    _attr_icon = "mdi:keyboard-outline"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "typing")

    @property
    def available(self) -> bool:
        return super().available and (self.hub.messenger.settings.get("sensors") or {}).get("typing") is not False

    @property
    def is_on(self) -> bool | None:
        return self.stats.get("typing")


class LiveLocationSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while they're sharing a Live Location in a chat."""
    _attr_icon = "mdi:map-marker-radius"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "live_location")

    @property
    def is_on(self) -> bool:
        return bool(self.stats.get("live_location"))


class BirthdaySensor(CrowMessengerEntity, BinarySensorEntity):
    """On all day on their birthday, if they share it in the Feed."""
    _attr_icon = "mdi:cake-variant"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "birthday")

    @property
    def is_on(self) -> bool:
        return bool(self.stats.get("birthday"))


class QuietModeSensor(CrowMessengerEntity, BinarySensorEntity):
    """On while they don't want to be disturbed: the Feed's Quiet Mode (paused, or its nightly hours), or
    Focus (iPhone) / Do Not Disturb (Android) on their phone. So other automations can stay quiet too."""
    _attr_icon = "mdi:weather-night"

    def __init__(self, hub: EntityHub, uid: str) -> None:
        super().__init__(hub, uid, "quiet_mode")

    @property
    def is_on(self) -> bool:
        return bool(self.stats.get("quiet"))

    @property
    def extra_state_attributes(self):
        s = self.stats
        out = {"feed_quiet_mode": bool(s.get("quiet_feed")), "phone_focus": bool(s.get("focus")),
               "conversations_with_hide_alerts": s.get("muted_chats", 0), "quiet_until": None, "nightly": None}
        feed = getattr(self.hub.messenger, "feed", None)
        if feed and feed.enabled():
            q = feed.quiet_view(self.uid)
            if q.get("until"):
                from homeassistant.util import dt as dt_util
                out["quiet_until"] = dt_util.utc_from_timestamp(q["until"] / 1000).isoformat()
            if q.get("schedule"):
                out["nightly"] = f"{q['from']}–{q['to']}"
        return out
