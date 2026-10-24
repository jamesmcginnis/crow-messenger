"""Binary sensors for each person: New messages, Active now and Phone ringing."""
from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .entity import CrowMessengerEntity, EntityHub, setup_platform


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddEntitiesCallback) -> None:
    setup_platform(hass, entry, add, lambda hub, uid: [NewMessagesSensor(hub, uid), ActiveSensor(hub, uid),
                                                       RingingSensor(hub, uid)])


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
