"""What every Crow Messenger entity shares: one device for each person, kept up to date live.

Each person in the household gets a device ("Crow Messenger (James)") with their unread
messages, who last messaged them, whether they have new messages, whether the card is open
("Active now") and whether someone is ringing their phone.

Message text never goes into an entity, only who sent a message and in which chat (the
same things the crow_messenger_message_received event already shares), because anyone who
can see Home Assistant can see entity states and the recorder keeps them.

How it stays up to date: everything that can change someone's unread messages already goes
through Messenger._send_to (the same hook the app icon badge uses), which calls
EntityHub.changed(uid). That's debounced, the person's numbers are worked out once, and
their entities are told to update. A refresh every few minutes covers things that change
with the clock (a Hide Alerts for 1 hour running out).
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_call_later, async_track_time_interval

from .const import DOMAIN, HA_SENDER_ID, HA_SENDER_NAME

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

SIGNAL_PERSON_UPDATED = f"{DOMAIN}_person_updated"   # + _<user id>
SIGNAL_PEOPLE_CHANGED = f"{DOMAIN}_people_changed"   # someone added to or removed from Home Assistant
DEBOUNCE = 1.0
REFRESH_EVERY = timedelta(minutes=5)
# what's kept of a ring, when looking for one still ringing
RING_LOOKBACK = 60
# Home Assistant's own events for people being added, changed or removed
USER_EVENTS = ("user_added", "user_updated", "user_removed")


def _kind(m: "Messenger", msg: dict) -> str:
    """What a message is, in a word: text, photo, video, file, or its own type (poll, location, ring…)."""
    kind = msg.get("type") or "text"
    if kind != "text":
        return kind
    atts = [m.data["attachments"].get(a) or {} for a in msg.get("attachments", [])]
    if atts:
        mime = atts[0].get("mime") or ""
        if mime.startswith("image/"):
            return "photo"
        if mime.startswith("video/"):
            return "video"
        return "file"
    return "text"


def person_stats(m: "Messenger", uid: str) -> dict[str, Any]:
    """Everything this person's entities show, worked out in one pass over their chats.

    Unread is counted the same way as the app icon badge (badge.Badge.total): muted chats
    are left out, and a chat marked as unread counts as one."""
    unread = unread_muted = chats = 0
    latest: tuple[dict, dict] | None = None
    ringing_by: list[str] = []
    for t in m.data.get("threads", {}).values():
        if uid not in t["participants"]:
            continue
        msgs = m._visible_messages(t, uid)
        if not msgs:
            continue
        read_ts = t["read"].get(uid, 0)
        n = sum(1 for x in msgs if x["sender"] != uid and x.get("type") != "system" and x["ts"] > read_ts)
        if not n and uid in t.get("marked_unread", []):
            n = 1
        if n:
            if m.is_muted(t, uid):
                unread_muted += n
            else:
                unread += n
                chats += 1
        for x in reversed(msgs):
            if x["sender"] != uid and x.get("type") != "system" and x.get("note") != "deleted":
                if latest is None or x["ts"] > latest[1]["ts"]:
                    latest = (t, x)
                break
        for x in msgs[-RING_LOOKBACK:]:
            if x.get("type") == "ring" and ((x.get("ring") or {}).get("state") or {}).get(uid) == "ringing":
                ringing_by.append(x["sender"])
    hidden_activity = m.profile_for(uid).get("activity") is False
    return {
        "unread": unread,
        "unread_muted": unread_muted,
        "unread_chats": chats,
        "latest": latest,
        "ringing_by": list(dict.fromkeys(ringing_by)),
        "online": None if hidden_activity else m.is_online(uid),
    }


class EntityHub:
    """Keeps each person's numbers and tells their entities when they change."""

    def __init__(self, messenger: "Messenger") -> None:
        self.messenger = messenger
        self.hass = messenger.hass
        # user id -> {"name": shared name, "ha_name": their Home Assistant name}
        self.people: dict[str, dict] = {}
        self._stats: dict[str, dict] = {}
        self._timers: dict[str, Callable[[], None]] = {}
        self._started = False

    # ── starting and stopping (from __init__) ─────────────────────────────────
    async def async_start(self) -> Callable[[], None]:
        """Learn who's in the household and start listening. Returns the function that stops it."""
        await self.async_refresh_people()
        self._started = True
        stops: list[Callable[[], None]] = []

        async def _every(_now) -> None:
            await self.async_refresh_people()
            self.everyone_changed()

        stops.append(async_track_time_interval(self.hass, _every, REFRESH_EVERY))

        async def _on_user(event: Event) -> None:
            before = set(self.people)
            await self.async_refresh_people()
            async_dispatcher_send(self.hass, SIGNAL_PEOPLE_CHANGED, before - set(self.people))
            self.everyone_changed()

        for ev in USER_EVENTS:
            stops.append(self.hass.bus.async_listen(ev, _on_user))

        @callback
        def _stop() -> None:
            self._started = False
            for s in stops:
                s()
            for cancel in self._timers.values():
                cancel()
            self._timers.clear()

        return _stop

    async def async_refresh_people(self) -> None:
        users = await self.messenger.async_users()
        self.people = {u["id"]: {"name": u["name"], "ha_name": u["ha_name"] or u["name"]} for u in users}

    def name(self, uid: str) -> str:
        if uid == HA_SENDER_ID:
            return HA_SENDER_NAME
        p = self.people.get(uid)
        return p["name"] if p else "Someone"

    # ── the numbers ───────────────────────────────────────────────────────────
    def stats(self, uid: str) -> dict:
        if uid not in self._stats:
            self._stats[uid] = person_stats(self.messenger, uid)
        return self._stats[uid]

    @callback
    def changed(self, uid: str) -> None:
        """Something about this person's chats changed: update their entities in a moment."""
        if not self._started or uid not in self.people or uid in self._timers:
            return

        @callback
        def _go(_now=None) -> None:
            self._timers.pop(uid, None)
            self._stats[uid] = person_stats(self.messenger, uid)
            async_dispatcher_send(self.hass, f"{SIGNAL_PERSON_UPDATED}_{uid}")

        self._timers[uid] = async_call_later(self.hass, DEBOUNCE, _go)

    @callback
    def everyone_changed(self) -> None:
        for uid in self.people:
            self._stats[uid] = person_stats(self.messenger, uid)
            async_dispatcher_send(self.hass, f"{SIGNAL_PERSON_UPDATED}_{uid}")


class CrowMessengerEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hub: EntityHub, uid: str, key: str) -> None:
        self.hub = hub
        self.uid = uid
        self.key = key
        self._attr_unique_id = f"{uid}_{key}"
        self._attr_translation_key = key
        person = hub.people.get(uid) or {}
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, uid)},
            name=f"Crow Messenger ({person.get('ha_name') or person.get('name') or 'User'})",
            manufacturer="Crow Messenger",
            model="Messages",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def stats(self) -> dict:
        return self.hub.stats(self.uid)

    @property
    def available(self) -> bool:
        return self.uid in self.hub.people

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(
            self.hass, f"{SIGNAL_PERSON_UPDATED}_{self.uid}", self.async_write_ha_state))


def setup_platform(hass: HomeAssistant, entry: ConfigEntry, add: Callable,
                   make: Callable[[EntityHub, str], list]) -> None:
    """Entities for everyone now, for people added to Home Assistant later, and gone with people removed."""
    messenger: Messenger = hass.data[DOMAIN]
    hub = messenger.entities
    known: set[str] = set()

    @callback
    def sync(removed: set[str] | None = None) -> None:
        new = []
        for uid in list(hub.people):
            if uid not in known:
                known.add(uid)
                new += make(hub, uid)
        if new:
            add(new)
        if not removed:
            return
        reg = er.async_get(hass)
        dreg = dr.async_get(hass)
        for uid in removed:
            known.discard(uid)
            for ent in er.async_entries_for_config_entry(reg, entry.entry_id):
                if ent.unique_id.startswith(f"{uid}_"):
                    reg.async_remove(ent.entity_id)
            dev = dreg.async_get_device(identifiers={(DOMAIN, uid)})
            if dev:
                dreg.async_remove_device(dev.id)

    sync()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_PEOPLE_CHANGED, sync))
