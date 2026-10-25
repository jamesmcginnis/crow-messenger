"""What every Crow Messenger entity shares: one device for each person, kept up to date live.

Each person in the household gets a device ("Crow Messenger (person1)") with their unread
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

from homeassistant.util import dt as dt_util

from .const import DOMAIN, HA_SENDER_ID, HA_SENDER_NAME

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

SIGNAL_PERSON_UPDATED = f"{DOMAIN}_person_updated"   # + _<user id>
SIGNAL_HOUSEHOLD_UPDATED = f"{DOMAIN}_household_updated"
HOUSEHOLD_DEBOUNCE = 5.0
# Waiting on reply: someone messaged you and you haven't answered for this long
WAIT_MINUTES = 60
DAY_MS = 86_400_000
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
    now = int(dt_util.utcnow().timestamp() * 1000)
    sensors = (m.settings.get("sensors") or {})
    # Waiting on reply: chats (not muted) where the last word is someone else's and it's been a while
    waiting, oldest = 0, None
    for t in m.data.get("threads", {}).values():
        if uid not in t["participants"] or len(t["participants"]) < 2 or m.is_muted(t, uid):
            continue
        msgs = [x for x in m._visible_messages(t, uid) if x.get("type") != "system" and x.get("note") != "deleted"]
        if not msgs or msgs[-1]["sender"] in (uid, HA_SENDER_ID):
            continue
        last_theirs = msgs[-1]["ts"]
        if now - last_theirs >= WAIT_MINUTES * 60_000:
            waiting += 1
            oldest = min(oldest or last_theirs, last_theirs)
    # what's waiting to happen for them: Remind Me Later and Send Later
    reminders = sum(1 for r in m.data.get("reminders", []) if r.get("uid") == uid)
    send_later = sum(1 for x in m.data.get("scheduled", []) if x.get("uid") == uid)
    # sharing a Live Location in a chat right now
    live = False
    for t in m.data.get("threads", {}).values():
        if uid not in t["participants"]:
            continue
        for x in m.data["messages"].get(t["id"], [])[-200:]:
            loc = x.get("location") or {}
            if x["sender"] == uid and loc.get("live_until", 0) > now and not loc.get("stopped"):
                live = True
                break
        if live:
            break
    feed = getattr(m, "feed", None)
    last_post = posts_week = None
    birthday = False
    feed_notif = 0
    if feed and feed.enabled():
        mine = [p["ts"] for p in feed.data.get("posts", {}).values()
                if p["author"] == uid and not p.get("scheduled_at") and p.get("kind", "post") not in ("birthday", "milestone", "review")]
        last_post = max(mine) if mine else None
        posts_week = sum(1 for ts in mine if ts > now - 7 * DAY_MS)
        person = feed.data.get("people", {}).get(uid) or {}
        b = person.get("birthday") or ""
        birthday = bool(person.get("share_birthday")) and b.endswith(dt_util.now().strftime("%m-%d")) and feed.opt("birthdays")
        feed_notif = feed.notif_unread(uid)
    presence = None if hidden_activity else m.presence_for(uid)
    return {
        "unread": unread,
        "unread_muted": unread_muted,
        "unread_chats": chats,
        "latest": latest,
        "ringing_by": list(dict.fromkeys(ringing_by)),
        "online": None if hidden_activity else m.is_online(uid),
        # posts in the Feed shared with them that they haven't seen yet (never what they say)
        "new_posts": m.feed.unseen(uid) if getattr(m, "feed", None) else 0,
        "feed_notif": feed_notif,
        # when they last had the card open (now, while they do) - unknown for anyone hiding their activity
        "last_seen": None if presence is None else (now if presence.get("online") else presence.get("last")),
        "typing": None if hidden_activity or sensors.get("typing") is False else m.is_typing(uid),
        "viewing": None if hidden_activity or sensors.get("viewing") is False else m.viewing(uid),
        "waiting": waiting, "waiting_since": oldest,
        "reminders": reminders + send_later, "remind_me_later": reminders, "send_later": send_later,
        "live_location": live,
        "last_post": last_post, "posts_week": posts_week or 0,
        "birthday": birthday,
    }


def household_stats(m: "Messenger") -> dict[str, Any]:
    """The household's numbers: how many messages, how much storage, the next event, who's online."""
    now_dt = dt_util.now()
    now = int(now_dt.timestamp() * 1000)
    day0 = int(now_dt.replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
    week0 = day0 - now_dt.weekday() * DAY_MS
    month0 = int(now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
    today = week = month = 0
    active = 0
    for tid, msgs in m.data.get("messages", {}).items():
        last = 0
        for x in msgs:
            if x.get("type") == "system":
                continue
            ts = x.get("ts", 0)
            last = max(last, ts)
            if ts >= month0:
                month += 1
                if ts >= week0:
                    week += 1
                if ts >= day0:
                    today += 1
        if last > now - DAY_MS:
            active += 1
    store = m.storage_stats()
    # the next event in the Feed - only ones shared with everyone, as anyone can see a sensor
    nxt = None
    feed = getattr(m, "feed", None)
    if feed and feed.enabled():
        for p in feed.data.get("posts", {}).values():
            ev = p.get("event") if p.get("kind") == "event" else None
            if not ev or p["audience"].get("type") != "everyone" or p.get("scheduled_at"):
                continue
            start = ev.get("start") or 0
            if start > now - 3600_000 and (nxt is None or start < nxt[1]["start"]):
                nxt = (p, ev)
    online = [u for u in {s.uid for s in m._subs.values()} if m.profile_for(u).get("activity") is not False and m.is_online(u)]
    return {
        "today": today, "week": week, "month": month, "active_chats": active,
        "storage_bytes": store["bytes"], "storage_count": store["count"], "storage_oldest": store.get("oldest"),
        "next_event": nxt, "online": online,
    }


class EntityHub:
    """Keeps each person's numbers and tells their entities when they change."""

    def __init__(self, messenger: "Messenger") -> None:
        self.messenger = messenger
        self.hass = messenger.hass
        # user id -> {"name": shared name, "ha_name": their Home Assistant name}
        self.people: dict[str, dict] = {}
        self._stats: dict[str, dict] = {}
        self._house: dict | None = None
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
        self.household_changed()

    @callback
    def everyone_changed(self) -> None:
        for uid in self.people:
            self._stats[uid] = person_stats(self.messenger, uid)
            async_dispatcher_send(self.hass, f"{SIGNAL_PERSON_UPDATED}_{uid}")
        self._house = household_stats(self.messenger)
        async_dispatcher_send(self.hass, SIGNAL_HOUSEHOLD_UPDATED)

    def household(self) -> dict:
        if self._house is None:
            self._house = household_stats(self.messenger)
        return self._house

    @callback
    def household_changed(self) -> None:
        """Something changed: the household's numbers in a few seconds (they're counted over every chat)."""
        if not self._started or "__house" in self._timers:
            return

        @callback
        def _go(_now=None) -> None:
            self._timers.pop("__house", None)
            self._house = household_stats(self.messenger)
            async_dispatcher_send(self.hass, SIGNAL_HOUSEHOLD_UPDATED)

        self._timers["__house"] = async_call_later(self.hass, HOUSEHOLD_DEBOUNCE, _go)


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


class CrowHouseholdEntity(Entity):
    """The household's own entities, on one device: Crow Messenger (Household)."""
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hub: EntityHub, key: str) -> None:
        self.hub = hub
        self.key = key
        self._attr_unique_id = f"household_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, "household")}, name="Crow Messenger (Household)",
                                            manufacturer="Crow Messenger", model="Household",
                                            entry_type=DeviceEntryType.SERVICE)

    @property
    def house(self) -> dict:
        return self.hub.household()

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_HOUSEHOLD_UPDATED, self.async_write_ha_state))


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
