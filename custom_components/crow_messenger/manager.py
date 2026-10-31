"""Core logic for Crow Messenger.

Owns every chat, message, attachment record, contact and setting, and is the
only place that decides who may see what. The websocket API, the HTTP views,
the notification sender and the service call all go through this class, so
the privacy rules live in one place:

* a chat (thread) is only visible to its current participants;
* someone added to a group later only sees messages from when they joined;
* "Delete conversation" hides everything up to that moment for that one
  person - once every participant has deleted it, the messages are removed;
* contacts and the My Card profile are stored per Home Assistant user and
  are never returned to anyone else.
"""
from __future__ import annotations

import copy
import hashlib
import hmac
import logging
import os
import re
import secrets
import time
from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_SETTINGS,
    EVENT_MESSAGE_RECEIVED,
    HA_SENDER_ID,
    HA_SENDER_NAME,
    MAX_CONTACTS_PER_USER,
    MAX_PHOTO_DATA_URL,
    MAX_TEXT_LENGTH,
    MEDIA_DIR_NAME,
    NOTIFY_MEDIA_TTL_DAYS,
    ORPHAN_UPLOAD_HOURS,
    RETENTION_CHOICES,
    STORAGE_KEY_BACKGROUNDS,
    STORAGE_KEY_CONTACTS,
    MAX_BACKGROUND_DATA_URL,
    MAX_BACKGROUNDS_PER_USER,
    LIVE_WALLPAPERS,
    UNSEND_WINDOW_MS,
    STORAGE_KEY_DATA,
    STORAGE_VERSION,
)

_LOGGER = logging.getLogger(__name__)

DAY_MS = 86_400_000


class MessengerError(Exception):
    """An error that is safe to show to the user."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def now_ms() -> int:
    return int(time.time() * 1000)


def new_id() -> str:
    return secrets.token_hex(8)


def _deep_merge(base: dict, patch: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


# ── Contact sanitising ─────────────────────────────────────────────────────
CONTACT_TEXT_FIELDS = (
    "prefix", "first", "middle", "last", "suffix", "nickname", "pronouns",
    "phonetic_first", "phonetic_last", "company", "job_title", "department",
    "notes", "ha_user", "birthday",
)
CONTACT_LIST_FIELDS = ("phones", "emails", "urls", "addresses", "dates", "related", "social")
ADDRESS_KEYS = ("label", "street", "city", "county", "postcode", "country")


def _clean_str(value: Any, limit: int = 2000) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def sanitize_contact(raw: dict) -> dict:
    """Keep only known contact fields, as plain strings / lists of dicts."""
    if not isinstance(raw, dict):
        raise MessengerError("invalid_format", "Contact must be an object")
    contact: dict[str, Any] = {}
    for key in CONTACT_TEXT_FIELDS:
        if raw.get(key):
            contact[key] = _clean_str(raw[key], 10000 if key == "notes" else 300)
    photo = raw.get("photo")
    if photo:
        photo = str(photo)
        if not photo.startswith("data:image/") or len(photo) > MAX_PHOTO_DATA_URL:
            raise MessengerError("invalid_format", "Contact photo is too large")
        contact["photo"] = photo
    contact["favourite"] = bool(raw.get("favourite"))
    for key in CONTACT_LIST_FIELDS:
        items = raw.get(key) or []
        if not isinstance(items, list):
            continue
        cleaned = []
        for item in items[:50]:
            if not isinstance(item, dict):
                continue
            if key == "addresses":
                entry = {k: _clean_str(item.get(k), 300) for k in ADDRESS_KEYS}
                if any(entry[k] for k in ADDRESS_KEYS if k != "label"):
                    cleaned.append(entry)
            else:
                entry = {"label": _clean_str(item.get("label"), 60), "value": _clean_str(item.get("value"), 500)}
                if entry["value"]:
                    cleaned.append(entry)
        if cleaned:
            contact[key] = cleaned
    return contact


class _Subscriber:
    __slots__ = ("uid", "send", "conn", "focus", "visible", "screen")

    def __init__(self, uid: str, send: Callable[[dict], None], conn: int) -> None:
        self.uid = uid
        self.send = send
        self.conn = conn
        self.focus: str | None = None
        self.visible = True
        self.screen: str | None = None   # messages | chat | feed | contacts | other (the Viewing sensor)


from .features import FeaturesMixin  # noqa: E402 - needs the helpers above
from .features2 import MoreFeaturesMixin  # noqa: E402
from .play import PlayMixin  # noqa: E402
from .organise import OrganiseMixin  # noqa: E402
from .ring import RingMixin  # noqa: E402
from .badge import COUNTED as BADGE_COUNTED  # noqa: E402


class Messenger(FeaturesMixin, MoreFeaturesMixin, PlayMixin, OrganiseMixin, RingMixin):
    """Everything Crow Messenger stores, plus the live-update fan-out."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY_DATA, private=True)
        self._cstore: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY_CONTACTS, private=True)
        self._bstore: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY_BACKGROUNDS, private=True)
        self.backgrounds: dict[str, dict[str, str]] = {}
        self.themes: dict[str, dict[str, str]] = {}
        self.stickers: dict[str, list] = {}
        self.data: dict[str, Any] = {}
        self.cdata: dict[str, Any] = {}
        self.media_dir = hass.config.path(MEDIA_DIR_NAME)
        self._subs: dict[int, _Subscriber] = {}
        self._sub_seq = 0
        # uid -> {"thread": tid, "title": str, "ts": ms} - lets an Android
        # "Reply" with no tag be matched back to the chat it came from.
        self.last_notified: dict[str, dict] = {}
        self.push_callback: Callable | None = None  # set by __init__ (notify.async_push)
        self.message_hook: Callable | None = None  # set by __init__ (the Home Assistant chat)
        self.alert_callback: Callable | None = None  # set by __init__ (notify.async_alert)
        self.ring_callback: Callable | None = None  # set by __init__ (notify.async_ring)
        self.ring_clear_callback: Callable | None = None  # set by __init__ (notify.async_ring_clear)
        from .badge import Badge
        self.badge = Badge(self)  # the app icon badge (off until turned on in the editor)
        from .entity import EntityHub
        self.entities = EntityHub(self)  # each person's sensors (started by __init__)
        from .feed import Feed
        self.feed = Feed(self)  # the household Feed (its own storage file)
        from .storage import MediaStore
        self.store = MediaStore(self)  # one copy of each file, made smaller, kept tidy

    # ── Persistence ─────────────────────────────────────────────────────────
    async def async_load(self) -> None:
        stored = await self._store.async_load() or {}
        self.data = {
            # everything else that's kept (zone towns, hidden places, starred messages, quick
            # replies, last active, …) comes back as it was saved
            **stored,
            "settings": _deep_merge(DEFAULT_SETTINGS, stored.get("settings", {})),
            "threads": stored.get("threads", {}),
            "messages": stored.get("messages", {}),
            "attachments": stored.get("attachments", {}),
            "secret": stored.get("secret") or secrets.token_hex(32),
            # where each person last opened the card - the automatic notification target
            "auto_paths": stored.get("auto_paths", {}),
            # messages waiting to be sent at a chosen time (Send Later)
            "scheduled": stored.get("scheduled", []),
        }
        cstored = await self._cstore.async_load() or {}
        self.cdata = {
            "contacts": cstored.get("contacts", {}),
            "profiles": cstored.get("profiles", {}),
        }
        bstored = await self._bstore.async_load() or {}
        self.backgrounds = bstored.get("users", {})
        self.themes = bstored.get("themes", {})
        self.stickers = bstored.get("stickers", {})
        await self.hass.async_add_executor_job(os.makedirs, self.media_dir, 0o700, True)
        await self.feed.async_load()
        self.store.rebuild()

    @callback
    def _save(self) -> None:
        self._store.async_delay_save(lambda: self.data, 1.0)

    @callback
    def _save_contacts(self) -> None:
        self._cstore.async_delay_save(lambda: self.cdata, 1.0)

    async def async_flush(self) -> None:
        """Write everything now. Saves wait a second to batch changes, and Home Assistant only writes
        waiting saves when it stops, so a reload of the integration would otherwise lose the last second."""
        await self._store.async_save(self.data)
        await self._cstore.async_save(self.cdata)
        await self._bstore.async_save({"users": self.backgrounds, "themes": self.themes, "stickers": self.stickers})
        await self.feed.async_flush()

    @property
    def settings(self) -> dict:
        return self.data["settings"]

    # ── Users ───────────────────────────────────────────────────────────────
    async def async_users(self) -> list[dict]:
        """People who can be messaged, with the name/photo they share."""
        users = await self.hass.auth.async_get_users()
        covers = self.feed.opt("covers") is not False and (self.settings.get("features") or {}).get("feed", True) is not False
        pictures: dict[str, str] = {}
        for state in self.hass.states.async_all("person"):
            uid = state.attributes.get("user_id")
            if uid and state.attributes.get("entity_picture"):
                pictures[uid] = state.attributes["entity_picture"]
        out = []
        for user in users:
            if user.system_generated or not user.is_active:
                continue
            profile = self.cdata["profiles"].get(user.id, {})
            name = user.name or "User"
            picture = pictures.get(user.id)
            photo_at = 0
            if profile.get("share"):
                name = profile.get("name") or name
                picture = profile.get("photo") or picture
                if profile.get("photo"):
                    photo_at = profile.get("photo_at") or 1   # (shared before pictures were dated: still newer than an undated contact photo)
            cover = profile.get("cover") if covers else None
            out.append({
                "id": user.id,
                "name": name,
                "ha_name": user.name or "",
                "picture": picture,
                # when the picture they share of themselves last changed (0: they don't share one)
                "photo_at": photo_at,
                "is_admin": user.is_admin,
                "cover": cover if cover and cover.get("id") in self.data["attachments"] else None,
            })
        out.sort(key=lambda u: u["name"].lower())
        return out

    async def async_user_map(self) -> dict[str, dict]:
        users = {u["id"]: u for u in await self.async_users()}
        users[HA_SENDER_ID] = {"id": HA_SENDER_ID, "name": HA_SENDER_NAME, "ha_name": HA_SENDER_NAME,
                               "picture": None, "is_admin": False, "virtual": True}
        return users

    # ── Live updates ────────────────────────────────────────────────────────
    @callback
    def add_subscriber(self, uid: str, send: Callable[[dict], None], conn: int) -> Callable[[], None]:
        self._sub_seq += 1
        key = self._sub_seq
        was = self.is_online(uid)
        self._subs[key] = _Subscriber(uid, send, conn)
        if not was:
            self._presence_changed(uid)

        @callback
        def _remove() -> None:
            self._subs.pop(key, None)
            self.__dict__.setdefault("_last_active", {})[uid] = now_ms()
            if not self.is_online(uid):
                self._presence_changed(uid)

        return _remove

    @callback
    def set_focus(self, conn: int, thread_id: str | None, visible: bool, screen: str | None = None) -> None:
        changed = set()
        for sub in self._subs.values():
            if sub.conn == conn:
                was = self.is_online(sub.uid)
                sub.focus = thread_id
                sub.visible = visible
                sub.screen = screen or ("chat" if thread_id else sub.screen)
                self.entities.changed(sub.uid)   # their Viewing sensor
                if was != self.is_online(sub.uid):
                    changed.add(sub.uid)
        for uid in changed:
            self.__dict__.setdefault("_last_active", {})[uid] = now_ms()
            self._presence_changed(uid)

    def is_watching(self, uid: str, thread_id: str) -> bool:
        return any(s.uid == uid and s.focus == thread_id and s.visible for s in self._subs.values())

    @callback
    def broadcast_all(self, payload: dict) -> None:
        for sub in list(self._subs.values()):
            try:
                sub.send(payload)
            except Exception:  # noqa: BLE001 - a closed connection
                pass

    def send_to_user(self, uid: str, payload: dict) -> None:
        """Something for one person's open cards (used by Email)."""
        self._send_to(uid, payload)

    def _send_to(self, uid: str, payload: dict) -> None:
        if payload.get("type") in BADGE_COUNTED:
            self.badge.changed(uid)
            self.entities.changed(uid)
        for sub in list(self._subs.values()):
            if sub.uid == uid:
                try:
                    sub.send(payload)
                except Exception:  # noqa: BLE001 - a dead socket must not stop the others
                    _LOGGER.debug("Dropping message to closed subscriber")

    @callback
    def _broadcast_thread(self, thread: dict, extra: dict | None = None, exclude: str | None = None) -> None:
        for uid in thread["participants"]:
            if uid == exclude:
                continue
            payload = {"type": "thread", "thread": self.thread_view(thread, uid)}
            if extra:
                payload.update(extra)
            self._send_to(uid, payload)

    # ── Threads ─────────────────────────────────────────────────────────────
    def _thread(self, uid: str, thread_id: str) -> dict:
        thread = self.data["threads"].get(thread_id)
        if not thread or uid not in thread["participants"]:
            raise MessengerError("not_found", "Conversation not found")
        return thread

    def _visible_from(self, thread: dict, uid: str) -> int:
        return max(thread["joined"].get(uid, 0), thread["cleared"].get(uid, -1) + 1)

    # Things each person has deleted for themselves: message ids, attachment ids and
    # "<message id>:text" for just the words of a message (like Apple Messages).
    def _hidden(self, thread: dict, uid: str) -> set:
        return set(thread.get("hidden", {}).get(uid, []))

    def _shows(self, msg: dict, hidden: set) -> bool:
        if msg["id"] in hidden:
            return False
        if msg.get("type", "text") != "text":
            return True  # system messages, polls, stickers, check-ins and shared devices
        text = msg.get("text") and f"{msg['id']}:text" not in hidden
        return bool(text or any(a not in hidden for a in msg.get("attachments", [])))

    def _visible_messages(self, thread: dict, uid: str) -> list[dict]:
        start = self._visible_from(thread, uid)
        hidden = self._hidden(thread, uid)
        return [m for m in self.data["messages"].get(thread["id"], []) if m["ts"] >= start and self._shows(m, hidden)]

    @staticmethod
    def anon_poll(poll: dict, viewer: str | None) -> dict:
        """An anonymous poll: the counts for everyone, and only your own vote (nobody, not even whoever made
        the poll, is told who chose what)."""
        votes = poll.get("votes") or {}
        counts: dict[str, int] = {}
        for chosen in votes.values():
            for o in chosen:
                counts[o] = counts.get(o, 0) + 1
        return {**{k: v for k, v in poll.items() if k != "votes"},
                "votes": {viewer: votes[viewer]} if viewer and viewer in votes else {},
                "counts": counts, "total": len(votes)}

    def message_view(self, msg: dict, hidden: set | None = None, viewer: str | None = None) -> dict:
        hidden = hidden or set()
        atts = []
        for aid in msg.get("attachments", []):
            att = self.data["attachments"].get(aid)
            if att and aid not in hidden:
                atts.append({k: att.get(k) for k in ("id", "name", "mime", "size", "width", "height", "duration")}
                            | {"has_thumb": bool(att.get("thumb")), "removed": bool(att.get("removed"))})
        return {
            "id": msg["id"],
            "thread_id": msg["thread_id"],
            "sender": msg["sender"],
            "text": "" if f"{msg['id']}:text" in hidden else msg.get("text", ""),
            "ts": msg["ts"],
            "type": msg.get("type", "text"),
            "attachments": atts,
            **self.extras_view(msg),
            **self.more_view(msg),
            **({"poll": self.anon_poll(msg["poll"], viewer)} if (msg.get("poll") or {}).get("anonymous") else {}),
        }

    def thread_view(self, thread: dict, uid: str) -> dict:
        msgs = self._visible_messages(thread, uid)
        # a "Message deleted" note isn't what the conversation was last about
        last = next((m for m in reversed(msgs) if m.get("note") != "deleted"), None)
        read_ts = thread["read"].get(uid, 0)
        unread = sum(1 for m in msgs if m["sender"] != uid and m.get("type") != "system" and m["ts"] > read_ts)
        has_any = bool(self.data["messages"].get(thread["id"]))
        visible = bool(msgs) or (not has_any and thread["cleared"].get(uid) is None
                                         and thread.get("created_by") == uid)
        return {
            "id": thread["id"],
            "name": thread.get("name", ""),
            "photo": thread.get("photo"),
            "participants": list(thread["participants"]),
            "is_group": thread["is_group"],
            "created_by": thread.get("created_by"),
            "created_at": thread["created_at"],
            "updated_at": last["ts"] if last else thread["created_at"],
            "last": self.message_view(last, self._hidden(thread, uid)) if last else None,
            "unread": unread,
            "muted": self.is_muted(thread, uid),
            "read": {p: thread["read"].get(p, 0) for p in thread["participants"]},
            "self_read": int(thread.get("self_read") or 0),
            "visible": visible,
            "pinned": uid in thread.get("pinned", []),
            "marked_unread": uid in thread.get("marked_unread", []),
            "disappear": int(thread.get("disappear") or 0),
            **self.more_thread_view(thread, uid),
            **self.organise_thread_view(thread, uid),
        }

    def threads_for(self, uid: str) -> list[dict]:
        views = [self.thread_view(t, uid) for t in self.data["threads"].values() if uid in t["participants"]]
        views = [v for v in views if v["visible"]]
        views.sort(key=lambda v: v["updated_at"], reverse=True)
        return views

    async def async_create_thread(self, uid: str, participant_ids: list[str], name: str = "") -> dict:
        users = await self.async_user_map()
        parts = {p for p in participant_ids if p}
        for pid in parts:
            if pid not in users:
                raise MessengerError("not_found", "One of the recipients is not a Home Assistant user")
        parts.add(uid)
        # a chat with just yourself is allowed (handy for testing notifications)
        ordered = sorted(parts)
        for thread in self.data["threads"].values():
            if sorted(thread["participants"]) == ordered:
                if name and thread["is_group"] and not thread.get("name"):
                    thread["name"] = _clean_str(name, 80)
                    self._save()
                return self.thread_view(thread, uid)
        ts = now_ms()
        thread = {
            "id": new_id(),
            "name": _clean_str(name, 80) if len(ordered) > 2 else "",
            "photo": None,
            "participants": ordered,
            "is_group": len(ordered) > 2,
            "created_by": uid,
            "created_at": ts,
            "read": {},
            "cleared": {},
            "joined": {p: 0 for p in ordered},
            "muted": [],
        }
        self.data["threads"][thread["id"]] = thread
        self.data["messages"][thread["id"]] = []
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        return self.thread_view(thread, uid)

    def messages_for(self, uid: str, thread_id: str, before: int | None = None, limit: int = 60) -> dict:
        thread = self._thread(uid, thread_id)
        msgs = self._visible_messages(thread, uid)
        if before:
            msgs = [m for m in msgs if m["ts"] < before]
        page = msgs[-limit:]
        return {
            "thread": self.thread_view(thread, uid),
            "messages": [self.message_view(m, self._hidden(thread, uid), viewer=uid) for m in page],
            "more": len(msgs) > len(page),
        }

    async def async_send(self, uid: str, thread_id: str, text: str, attachment_ids: list[str] | None = None,
                         *, notify: bool = True, extra: dict | None = None, scheduled: bool = False) -> dict:
        thread = self._thread(uid, thread_id)
        text = (text or "").strip()
        if len(text) > MAX_TEXT_LENGTH:
            raise MessengerError("invalid_format", "Message is too long")
        attachment_ids = list(dict.fromkeys(attachment_ids or []))
        for aid in attachment_ids:
            att = self.data["attachments"].get(aid)
            if not att or att["uploader"] != uid or att.get("status") != "pending" \
                    or att.get("thread_id") not in (None, thread_id):
                raise MessengerError("not_found", "Attachment not found")
        extra = await self.async_check_extra(uid, thread, text, extra or {}, attachment_ids)
        if not text and not attachment_ids and not extra.get("type"):
            raise MessengerError("invalid_format", "Message is empty")
        ts = max(now_ms(), self._last_ts(thread_id) + 1)
        for aid in attachment_ids:
            self.data["attachments"][aid].update({"status": "sent", "thread_id": thread_id})
        msg = {"id": new_id(), "thread_id": thread_id, "sender": uid, "text": text, "ts": ts,
               "type": "text", "attachments": attachment_ids, **extra}
        if thread.get("disappear"):
            msg["ttl"] = int(thread["disappear"])
        if scheduled:
            msg["scheduled"] = True  # sent with Send Later
        self.data["messages"].setdefault(thread_id, []).append(msg)
        thread["read"][uid] = ts
        self._save()
        view = self.message_view(msg)
        for pid in thread["participants"]:
            self._send_to(pid, {"type": "message", "message": view, "thread": self.thread_view(thread, pid)})

        users = await self.async_user_map()
        recipients = [p for p in thread["participants"] if p != uid] or [uid]
        event = {
            "thread_id": thread_id,
            "message_id": msg["id"],
            "sender_id": uid,
            "sender_name": users.get(uid, {}).get("name", ""),
            "recipient_ids": recipients,
            "is_group": thread["is_group"],
            "has_attachment": bool(attachment_ids),
        }
        # Message text is only put on the event bus (and so into the recorder)
        # for chats with Home Assistant itself - everything else stays private.
        if HA_SENDER_ID in thread["participants"]:
            event["text"] = text
        self.hass.bus.async_fire(EVENT_MESSAGE_RECEIVED, event)

        if notify and self.push_callback:
            self.hass.async_create_task(self.push_callback(thread, msg, users))
        if self.message_hook:
            await self.message_hook(thread, msg)
        self.after_send(thread, msg)
        self.after_send_more(thread, msg)
        self.after_send_organise(thread, msg)
        self.after_send_ring(thread, msg)
        if uid != HA_SENDER_ID:
            self.note_active(uid)
        return view

    def _last_ts(self, thread_id: str) -> int:
        msgs = self.data["messages"].get(thread_id) or []
        return msgs[-1]["ts"] if msgs else 0

    @callback
    def _system_message(self, thread: dict, text: str, actor: str, *, only: str | None = None,
                        ts: int | None = None, **fields) -> dict:
        """A grey line in the conversation. `only` keeps it to one person (it's hidden for the
        others); `ts` puts it at that point (where a deleted message was); `fields` are kept on it
        (`note` says what kind of line it is, `at` when it happened, for the card to show)."""
        ts = ts if ts is not None else max(now_ms(), self._last_ts(thread["id"]) + 1)
        msg = {"id": new_id(), "thread_id": thread["id"], "sender": actor, "text": text, "ts": ts,
               "type": "system", "attachments": [], **fields}
        box = self.data["messages"].setdefault(thread["id"], [])
        box.append(msg)
        box.sort(key=lambda m: m["ts"])
        if only:
            for pid in thread["participants"]:
                if pid != only:
                    thread.setdefault("hidden", {}).setdefault(pid, []).append(msg["id"])
        view = self.message_view(msg)
        for pid in thread["participants"]:
            if only and pid != only:
                continue
            self._send_to(pid, {"type": "message", "message": view, "thread": self.thread_view(thread, pid)})
        return msg

    @callback
    def mark_read(self, uid: str, thread_id: str) -> None:
        thread = self._thread(uid, thread_id)
        last = self._last_ts(thread_id)
        cleared = self.clear_reminded(thread, uid)
        if uid in thread.get("marked_unread", []) or cleared:
            if uid in thread.get("marked_unread", []):
                thread["marked_unread"].remove(uid)
            self._save()
            self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        self.note_seen(thread, uid, last)
        self.note_read_time(thread, uid, last)
        self.note_active(uid)
        # their notifications for this chat go from every phone (a chat with yourself counts as read
        # as soon as you send, so this comes before the check below)
        self.badge.read(uid, thread_id, last)
        # a chat with yourself: your own messages show "Read" once you've read them (from the
        # notification, or by opening the chat)
        if thread["participants"] == [uid] and (thread.get("self_read") or 0) < last:
            thread["self_read"] = last
            self._save()
            self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        if thread["read"].get(uid, 0) >= last:
            return
        thread["read"][uid] = last
        self._save()
        for pid in thread["participants"]:
            self._send_to(pid, {"type": "read", "thread_id": thread_id, "user_id": uid, "ts": last,
                                "unread": 0 if pid == uid else None})
        # for automations: an alert that repeats until it's read can stop now
        from .const import EVENT_READ
        self.hass.bus.async_fire(EVENT_READ, {
            "user_id": uid, "thread_id": thread_id, "read_up_to": last,
            "with_home_assistant": HA_SENDER_ID in thread["participants"],
            "last_sender_id": next((x["sender"] for x in reversed(self.data["messages"].get(thread_id, []))
                                    if x.get("type") != "system"), None),
        })

    def viewing(self, uid: str) -> str | None:
        """What part of the card someone has on screen (never which chat). None when it's closed."""
        subs = [s for s in self._subs.values() if s.uid == uid and s.visible]
        if not subs:
            return None
        s = subs[-1]
        return "chat" if s.focus else (s.screen or "messages")

    def is_typing(self, uid: str) -> bool:
        cutoff = now_ms() - 12_000
        return any(ts > cutoff for ts in (self.__dict__.get("_typing", {}).get(uid) or {}).values())

    @callback
    def typing(self, uid: str, thread_id: str, active: bool) -> None:
        thread = self._thread(uid, thread_id)
        # the Typing sensor: on while they type anywhere; a stop that never comes runs out by itself
        box = self.__dict__.setdefault("_typing", {}).setdefault(uid, {})
        was = self.is_typing(uid)
        if active:
            box[thread_id] = now_ms()
            from homeassistant.helpers.event import async_call_later
            async_call_later(self.hass, 13, lambda _n: self.entities.changed(uid))
        else:
            box.pop(thread_id, None)
        if was != self.is_typing(uid):
            self.entities.changed(uid)
        for pid in thread["participants"]:
            if pid != uid:
                self._send_to(pid, {"type": "typing", "thread_id": thread_id, "user_id": uid, "active": active})

    async def async_update_thread(self, uid: str, thread_id: str, *, name: str | None = None,
                                  photo: str | None = None, add: list[str] | None = None,
                                  muted: bool | None = None) -> dict:
        thread = self._thread(uid, thread_id)
        users = await self.async_user_map()
        actor = users.get(uid, {}).get("name", "Someone")
        if muted is not None:
            return self.set_mute(uid, thread_id, 0 if muted else None)
        if (name is not None or photo is not None or add) and not thread["is_group"]:
            raise MessengerError("invalid_format", "Only group chats can be renamed or have people added")
        if name is not None:
            name = _clean_str(name, 80)
            if name != thread.get("name", ""):
                thread["name"] = name
                self._system_message(thread, f"{actor} named the conversation “{name}”." if name
                                     else f"{actor} removed the name from the conversation.", uid)
        if photo is not None:
            if photo and (not photo.startswith("data:image/") or len(photo) > MAX_PHOTO_DATA_URL):
                raise MessengerError("invalid_format", "Photo is too large")
            thread["photo"] = photo or None
            self._system_message(thread, f"{actor} changed the group photo." if photo
                                 else f"{actor} removed the group photo.", uid)
        if add:
            new = [p for p in dict.fromkeys(add) if p not in thread["participants"]]
            for pid in new:
                if pid not in users or pid == HA_SENDER_ID:
                    raise MessengerError("not_found", "That person is not a Home Assistant user")
            if new:
                ts = max(now_ms(), self._last_ts(thread_id) + 1)
                for pid in new:
                    thread["participants"].append(pid)
                    thread["joined"][pid] = ts
                    thread["cleared"].pop(pid, None)
                names = ", ".join(users[p]["name"] for p in new)
                self._system_message(thread, f"{actor} added {names} to the conversation.", uid)
        self._save()
        self._broadcast_thread(thread)
        return self.thread_view(thread, uid)

    async def async_leave(self, uid: str, thread_id: str) -> None:
        thread = self._thread(uid, thread_id)
        if not thread["is_group"]:
            raise MessengerError("invalid_format", "You can only leave group chats")
        users = await self.async_user_map()
        thread["participants"].remove(uid)
        for key in ("read", "cleared", "joined"):
            thread[key].pop(uid, None)
        if uid in thread.get("muted", []):
            thread["muted"].remove(uid)
        self._send_to(uid, {"type": "thread_removed", "thread_id": thread_id})
        real = [p for p in thread["participants"] if p != HA_SENDER_ID]
        if not real:
            await self._async_delete_thread(thread_id)
        else:
            self._system_message(thread, f"{users.get(uid, {}).get('name', 'Someone')} left the conversation.", uid)
            self._broadcast_thread(thread)
        self._save()

    async def async_delete_for_me(self, uid: str, thread_id: str) -> None:
        thread = self._thread(uid, thread_id)
        thread["cleared"][uid] = max(now_ms(), self._last_ts(thread_id))
        self._send_to(uid, {"type": "thread_removed", "thread_id": thread_id})
        # Messages every participant has deleted are removed for good.
        real = [p for p in thread["participants"] if p != HA_SENDER_ID]
        if all(p in thread["cleared"] for p in real):
            cutoff = min(thread["cleared"][p] for p in real)
            await self._async_purge(thread_id, lambda m: m["ts"] <= cutoff)
            if not self.data["messages"].get(thread_id):
                await self._async_delete_thread(thread_id)
        self._save()

    async def _async_delete_thread(self, thread_id: str) -> None:
        await self._async_purge(thread_id, lambda m: True)
        for att in list(self.data["attachments"].values()):
            if att.get("thread_id") == thread_id:
                await self._async_remove_attachment(att["id"])
        thread = self.data["threads"].pop(thread_id, None)
        self.data["messages"].pop(thread_id, None)
        if thread:
            for pid in thread["participants"]:
                self._send_to(pid, {"type": "thread_removed", "thread_id": thread_id})

    async def _async_purge(self, thread_id: str, predicate: Callable[[dict], bool]) -> int:
        msgs = self.data["messages"].get(thread_id, [])
        keep, drop = [], []
        for msg in msgs:
            (drop if predicate(msg) else keep).append(msg)
        if not drop:
            return 0
        self.data["messages"][thread_id] = keep
        for msg in drop:
            for aid in msg.get("attachments", []):
                await self._async_remove_attachment(aid)
        return len(drop)

    def search(self, uid: str, query: str, limit: int = 60) -> list[dict]:
        words = [w for w in query.lower().split() if w]
        if not words:
            return []
        hits = []
        for thread in self.data["threads"].values():
            if uid not in thread["participants"]:
                continue
            for msg in self._visible_messages(thread, uid):
                if msg.get("type") == "system":
                    continue
                text = (msg.get("text") or "").lower()
                names = " ".join(self.data["attachments"].get(a, {}).get("name", "") for a in msg.get("attachments", [])).lower()
                if all(w in text or w in names for w in words):
                    hits.append(self.message_view(msg, self._hidden(thread, uid)))
        hits.sort(key=lambda m: m["ts"], reverse=True)
        return hits[:limit]

    # ── Deleting messages and photos (like Apple Messages) ─────────────────
    async def async_delete_items(self, uid: str, thread_id: str, message_id: str,
                                 parts: list[str] | None = None) -> dict:
        """Delete a message, or some of its parts, for this person only.

        parts are attachment ids and/or "text"; none means the whole message.
        Anything everyone in the chat has deleted is removed from the server.
        """
        thread = self._thread(uid, thread_id)
        msg = next((m for m in self.data["messages"].get(thread_id, []) if m["id"] == message_id), None)
        if not msg or msg["ts"] < self._visible_from(thread, uid):
            raise MessengerError("not_found", "Message not found")
        if parts:
            ids = []
            for part in dict.fromkeys(parts):
                if part == "text":
                    ids.append(f"{message_id}:text")
                elif part in msg.get("attachments", []):
                    ids.append(part)
                else:
                    raise MessengerError("not_found", "Attachment not found")
        else:
            ids = [message_id]
        mine = thread.setdefault("hidden", {}).setdefault(uid, [])
        mine.extend(i for i in ids if i not in mine)
        # a whole message deleted leaves a note where it was, for you only
        whole = not parts or not self._shows(msg, self._hidden(thread, uid))
        if whole and msg.get("type") != "system":
            self._system_message(thread, "Message deleted", uid, only=uid, ts=msg["ts"], note="deleted", at=now_ms())
        await self._async_drop_deleted(thread, msg)
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid), "reload": True})
        return self.thread_view(thread, uid)

    async def _async_drop_deleted(self, thread: dict, msg: dict) -> None:
        """Remove the parts of a message that every participant has deleted."""
        real = [p for p in thread["participants"] if p != HA_SENDER_ID]
        hidden = {p: self._hidden(thread, p) for p in real}

        def gone(part: str) -> bool:
            return all(msg["id"] in hidden[p] or part in hidden[p]
                       or msg["ts"] < self._visible_from(thread, p) for p in real)

        if msg.get("text") and gone(f"{msg['id']}:text"):
            msg["text"] = ""
        for aid in list(msg.get("attachments", [])):
            if gone(aid):
                msg["attachments"].remove(aid)
                await self._async_remove_attachment(aid)
        if msg.get("type", "text") != "text":
            if gone(msg["id"]):
                self.data["messages"][thread["id"]] = [m for m in self.data["messages"].get(thread["id"], []) if m is not msg]
        elif not msg.get("text") and not msg.get("attachments"):
            self.data["messages"][thread["id"]] = [m for m in self.data["messages"].get(thread["id"], []) if m is not msg]
        self._tidy_hidden(thread)

    def _tidy_hidden(self, thread: dict) -> None:
        """Forget deleted ids that no longer exist."""
        live: set = set()
        for m in self.data["messages"].get(thread["id"], []):
            live.add(m["id"])
            if m.get("text"):
                live.add(f"{m['id']}:text")
            live.update(m.get("attachments", []))
        for p, ids in list(thread.get("hidden", {}).items()):
            ids[:] = [i for i in ids if i in live]
            if not ids:
                thread["hidden"].pop(p)

    async def async_unsend(self, uid: str, thread_id: str, message_id: str) -> None:
        """Undo Send: your own message, within two minutes, removed for everyone."""
        thread = self._thread(uid, thread_id)
        msg = next((m for m in self.data["messages"].get(thread_id, []) if m["id"] == message_id), None)
        if not msg or msg["sender"] != uid or msg.get("type") == "system":
            raise MessengerError("not_found", "Message not found")
        if now_ms() - msg["ts"] > UNSEND_WINDOW_MS:
            raise MessengerError("invalid_format", "Messages can only be unsent for 2 minutes after sending")
        await self._async_purge(thread_id, lambda m: m is msg)
        self._tidy_hidden(thread)
        users = await self.async_user_map()
        self._system_message(thread, f"{users.get(uid, {}).get('name', 'Someone')} unsent a message", uid,
                             note="unsent", at=now_ms())
        self._save()
        self._broadcast_thread(thread, {"reload": True})

    # ── Storage (administrators, from the editor) ───────────────────────────
    def storage_stats(self) -> dict:
        sent = [a for a in self.data["attachments"].values() if a.get("status") == "sent" and not a.get("removed")]
        return {
            "count": len(sent),
            "bytes": sum(int(a.get("size") or 0) for a in sent),
            "oldest": min((a["ts"] for a in sent), default=None),
        }

    async def async_clear_attachments(self, older_than_days: int) -> dict:
        """Delete sent photos, videos and files from the server, for everyone.

        The messages stay; where a picture was, the card shows a question mark.
        """
        cutoff = now_ms() - older_than_days * DAY_MS if older_than_days > 0 else None
        removed, freed, threads = 0, 0, set()
        for att in list(self.data["attachments"].values()):
            if att.get("status") != "sent" or att.get("removed"):
                continue
            if cutoff is not None and att["ts"] >= cutoff:
                continue
            freed += await self._async_take_off_server(att)
            removed += 1
            if att.get("thread_id"):
                threads.add(att["thread_id"])
        self._save()
        for tid in threads:
            thread = self.data["threads"].get(tid)
            if thread:
                self._broadcast_thread(thread, {"reload": True})
        return {"removed": removed, "freed_bytes": freed, **self.storage_stats()}

    async def _async_take_off_server(self, att: dict) -> int:
        """Delete an attachment's files but keep its place in the message (shown as a question mark).
        A file another message or post still uses stays for them. Answers the bytes freed."""
        freed = await self.store.async_release(att)
        att.update({"removed": True, "file": None, "thumb": None, "blob": None})
        return freed

    async def async_remove_from_server(self, uid: str, is_admin: bool, thread_id: str, aid: str) -> None:
        """One photo, video or file deleted from the server for everyone in the chat.

        Whoever sent it can do this, and so can an administrator.
        """
        thread = self._thread(uid, thread_id)
        att = self.data["attachments"].get(aid)
        if not att or att.get("thread_id") != thread_id or att.get("status") != "sent":
            raise MessengerError("not_found", "Attachment not found")
        if att["uploader"] != uid and not is_admin:
            raise MessengerError("unauthorized", "Only the person who sent it can remove it from the server")
        if not att.get("removed"):
            await self._async_take_off_server(att)
        self._save()
        self._broadcast_thread(thread, {"reload": True})

    @staticmethod
    def _remove_files(paths: list[str]) -> None:
        for path in paths:
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
            except OSError as err:
                _LOGGER.warning("Could not delete attachment %s: %s", path, err)

    # ── Attachments ─────────────────────────────────────────────────────────
    def register_upload(self, uid: str, thread_id: str | None, info: dict) -> dict:
        if thread_id:
            self._thread(uid, thread_id)
        aid = info["id"]
        self.data["attachments"][aid] = {
            "id": aid,
            "uploader": uid,
            "thread_id": thread_id,
            "status": "pending",
            "ts": now_ms(),
            **{k: info.get(k) for k in ("name", "mime", "size", "file", "thumb", "width", "height", "duration", "blob")},
        }
        self._save()
        att = self.data["attachments"][aid]
        self.store.add_user(att)
        return {k: att.get(k) for k in ("id", "name", "mime", "size", "width", "height", "duration")} | {
            "has_thumb": bool(att.get("thumb"))}

    def attachment_for(self, uid: str, aid: str) -> dict:
        att = self.data["attachments"].get(aid)
        if not att:
            raise MessengerError("not_found", "Not found")
        if att.get("status") in ("pending", "scheduled"):
            if att["uploader"] != uid:
                raise MessengerError("not_found", "Not found")
        elif att.get("cover_of"):
            # a cover photo: everyone at home can see it, like the profile photo
            pass
        elif att.get("feed"):
            # a photo or video from the Feed: only for the people the post (or story) is shared with
            if not self.feed.media_visible(uid, att):
                raise MessengerError("not_found", "Not found")
        else:
            thread = self.data["threads"].get(att.get("thread_id"))
            if not thread or uid not in thread["participants"]:
                raise MessengerError("not_found", "Not found")
            msg = next((m for m in self.data["messages"].get(thread["id"], []) if aid in m.get("attachments", [])), None)
            if not msg or msg["ts"] < self._visible_from(thread, uid) \
                    or {msg["id"], aid} & self._hidden(thread, uid) or self.view_once_blocked(msg, uid):
                raise MessengerError("not_found", "Not found")
        return att

    def attachment_path(self, att: dict, thumb: bool = False) -> str | None:
        name = att.get("thumb") if thumb else att.get("file")
        if not name:
            return None
        path = os.path.join(self.media_dir, os.path.basename(name))
        return path

    async def async_copy_attachment(self, uid: str, aid: str) -> str:
        """A copy of an attachment's file (and its preview picture), ready to post as a new upload."""
        att = self.data["attachments"].get(aid)
        if not att or att.get("removed") or not att.get("file"):
            raise MessengerError("not_found", "That photo or video has gone")
        new = new_id()
        # the same file, not a copy of it (a file from before fingerprinting is fingerprinted first)
        await self.store.async_adopt(att)
        shared = self.store.share(att)
        if shared:
            self.register_upload(uid, None, {"id": new, **shared})
            return new
        src, tsrc = self.attachment_path(att), self.attachment_path(att, True)
        name = f"{new}_{os.path.basename(att['file']).split('_', 1)[-1]}"
        tname = f"{new}_thumb.jpg" if tsrc else None

        def _copy() -> None:
            import shutil
            shutil.copyfile(src, os.path.join(self.media_dir, name))
            if tsrc and os.path.exists(tsrc):
                shutil.copyfile(tsrc, os.path.join(self.media_dir, tname))

        try:
            await self.hass.async_add_executor_job(_copy)
        except OSError as err:
            raise MessengerError("unknown_error", f"Couldn’t copy it: {err}") from err
        self.register_upload(uid, None, {"id": new, "name": att.get("name"), "mime": att.get("mime"), "size": att.get("size"),
                                         "file": name, "thumb": tname, "width": att.get("width"), "height": att.get("height"),
                                         "duration": att.get("duration")})
        return new

    async def _async_remove_attachment(self, aid: str) -> None:
        att = self.data["attachments"].pop(aid, None)
        if not att:
            return
        # the file goes when nothing else uses it
        await self.store.async_release(att)

    async def async_discard_upload(self, uid: str, aid: str) -> None:
        att = self.data["attachments"].get(aid)
        if att and att["uploader"] == uid and att.get("status") == "pending":
            await self._async_remove_attachment(aid)
            self._save()

    def push_media_path(self, aid: str, thumb: bool = False) -> str:
        """A link the phone apps can fetch without logging in, valid for a few days."""
        kind = "thumb" if thumb else "file"
        exp = int(time.time()) + NOTIFY_MEDIA_TTL_DAYS * 86400
        sig = self._sign(f"{aid}:{kind}:{exp}")
        return f"/api/crow_messenger/push/{aid}/{kind}/{exp}/{sig}"

    def stream_path(self, aid: str, ttl: int = 6 * 3600) -> str:
        """A link to stream a video (or open a file) for a few hours, for someone who can already see it.
        The browser then fetches only the part it's playing, instead of the whole file first."""
        exp = int(time.time()) + ttl
        sig = self._sign(f"{aid}:file:{exp}")
        return f"/api/crow_messenger/push/{aid}/file/{exp}/{sig}"

    def verify_push(self, aid: str, kind: str, exp: str, sig: str) -> dict | None:
        try:
            if int(exp) < time.time():
                return None
        except ValueError:
            return None
        if not hmac.compare_digest(self._sign(f"{aid}:{kind}:{exp}"), sig):
            return None
        return self.data["attachments"].get(aid)

    def _sign(self, value: str) -> str:
        return hmac.new(self.data["secret"].encode(), value.encode(), hashlib.sha256).hexdigest()[:40]

    # ── Retention ───────────────────────────────────────────────────────────
    async def async_cleanup(self) -> None:
        now = now_ms()
        changed = False
        days = int(self.settings.get("retention_days") or 0)
        if days > 0:
            cutoff = now - days * DAY_MS
            for thread_id in list(self.data["threads"]):
                removed = await self._async_purge(thread_id, lambda m: m["ts"] < cutoff)
                changed = changed or bool(removed)
                thread = self.data["threads"][thread_id]
                if not self.data["messages"].get(thread_id) and thread["created_at"] < cutoff:
                    await self._async_delete_thread(thread_id)
                    changed = True
                elif removed:
                    self._broadcast_thread(thread, {"reload": True})
        orphan_cutoff = now - ORPHAN_UPLOAD_HOURS * 3_600_000
        for att in list(self.data["attachments"].values()):
            if att.get("status") == "pending" and att["ts"] < orphan_cutoff:
                await self._async_remove_attachment(att["id"])
                changed = True
        await self.async_expire()
        # the Feed follows Keep Messages too (stories always go after a day)
        await self.feed.async_cleanup(days)
        self._gc_stickers()
        # files nothing uses (weekly), and old photos and videos made smaller (if chosen)
        await self.store.async_maybe_sweep()
        if changed:
            self._save()

    # ── Settings ────────────────────────────────────────────────────────────
    async def async_update_settings(self, patch: dict) -> dict:
        if "retention_days" in patch and int(patch["retention_days"]) not in RETENTION_CHOICES:
            raise MessengerError("invalid_format", "Unsupported Keep Messages value")
        users_patch = patch.get("users")
        if "storage" in patch:
            self.store.wake()   # old photos and videos to make smaller, now or no longer
        self.data["settings"] = _deep_merge(self.settings, {k: v for k, v in patch.items() if k != "users"})
        if users_patch:
            users = dict(self.settings.get("users", {}))
            for uid, cfg in users_patch.items():
                if cfg is None:
                    users.pop(uid, None)
                else:
                    users[uid] = {**users.get(uid, {}), **cfg}
            self.data["settings"]["users"] = users
        self._save()
        if "retention_days" in patch or "keep_days" in (patch.get("feed") or {}):
            await self.async_cleanup()
        if "feed" in patch or "giphy_key" in patch or "feed" in (patch.get("features") or {}):
            # open cards follow the household's Feed settings straight away
            for sub in list(self._subs.values()):
                try:
                    sub.send({"type": "feed_options", "options": self.feed.options(), "enabled": self.feed.enabled()})
                except Exception:  # noqa: BLE001
                    pass
        if "badge" in (patch.get("notifications") or {}):
            self.badge.everyone_changed(force=True)
        if "email" in (patch.get("features") or {}) and getattr(self, "email", None):
            # Email starts or stops straight away (no restart)
            await self.email.async_sync()
        return self.settings

    @callback
    def set_auto_path(self, uid: str, path: str) -> None:
        path = path.split("?")[0].split("#")[0]
        if not path.startswith("/") or len(path) > 200 or path.startswith("/config") or path.startswith("/api"):
            return
        if self.data["auto_paths"].get(uid) != path:
            self.data["auto_paths"][uid] = path
            self._save()

    # ── Contacts & profile (always per user) ────────────────────────────────
    def contacts_for(self, uid: str) -> list[dict]:
        return list(self.cdata["contacts"].get(uid, {}).values())

    def save_contacts(self, uid: str, contacts: list[dict]) -> list[dict]:
        book = self.cdata["contacts"].setdefault(uid, {})
        saved = []
        for raw in contacts:
            contact = sanitize_contact(raw)
            cid = str(raw.get("id") or "") or new_id()
            if cid not in book and len(book) >= MAX_CONTACTS_PER_USER:
                raise MessengerError("invalid_format", "Too many contacts")
            contact["id"] = cid
            contact["updated"] = now_ms()
            # when the photo itself last changed (not the phone number or anything else): it decides
            # whether this photo or the one a household member shares of themselves is shown (the newer)
            old = book.get(cid) or {}
            if contact.get("photo"):
                contact["photo_at"] = old.get("photo_at", 0) if old.get("photo") == contact["photo"] else now_ms()
            book[cid] = contact
            saved.append(contact)
        self._save_contacts()
        for contact in saved:
            self._send_to(uid, {"type": "contact", "contact": contact})
        self._contacts_changed(uid)
        return saved

    def delete_contacts(self, uid: str, ids: list[str]) -> None:
        book = self.cdata["contacts"].get(uid, {})
        for cid in ids:
            book.pop(cid, None)
            self._send_to(uid, {"type": "contact_removed", "contact_id": cid})
        profile = self.cdata["profiles"].get(uid)
        if profile and profile.get("my_card") in ids:
            profile["my_card"] = None
        self._save_contacts()
        self._contacts_changed(uid)

    def _contacts_changed(self, uid: str) -> None:
        """Email (when it's on) shares this contacts book: its open screens follow too."""
        mailer = self.hass.data.get("crow_messenger_email")
        if mailer is not None:
            try:
                mailer.book.contacts_changed(uid)
            except Exception:  # noqa: BLE001 - Email must never stop a contact being saved
                _LOGGER.debug("Crow Messenger couldn't tell Email about a contacts change", exc_info=True)

    # ── Chat backgrounds (private to each person) ───────────────────────────
    # key "*" is the background for every conversation; a thread id overrides it;
    # "feed" is the one behind the Feed.
    def backgrounds_for(self, uid: str) -> dict:
        return dict(self.backgrounds.get(uid, {}))

    def _check_key(self, uid: str, key: str) -> None:
        # "feed" is the background behind the Feed (each person's own)
        if key in ("*", "feed"):
            return
        if key not in self.data["threads"]:
            raise MessengerError("not_found", "Conversation not found")
        self._thread(uid, key)

    @callback
    def _save_backgrounds(self) -> None:
        self._bstore.async_delay_save(lambda: {"users": self.backgrounds, "themes": self.themes, "stickers": self.stickers}, 1.0)

    def set_background(self, uid: str, key: str, image: str | None) -> dict:
        """A photo (data URL) or a Live Wallpaper ("live:<name>"), or None to remove it."""
        self._check_key(uid, key)
        mine = self.backgrounds.setdefault(uid, {})
        if image:
            if image == "none":
                pass  # this chat has no background, even when all chats have one
            elif image.startswith("live:"):
                if image[5:] not in LIVE_WALLPAPERS:
                    raise MessengerError("invalid_format", "Unknown live wallpaper")
            elif not image.startswith("data:image/") or len(image) > MAX_BACKGROUND_DATA_URL:
                raise MessengerError("invalid_format", "That picture is too large")
            if key not in mine and len(mine) >= MAX_BACKGROUNDS_PER_USER:
                raise MessengerError("invalid_format", "Too many chat backgrounds")
            mine[key] = image
        else:
            mine.pop(key, None)
        self._save_backgrounds()
        self._send_to(uid, {"type": "backgrounds", "backgrounds": self.backgrounds_for(uid)})
        if key == "*":
            # Email shares the background for everything
            mailer = self.hass.data.get("crow_messenger_email")
            if mailer is not None:
                mailer.send_to(uid, {"type": "backgrounds", "backgrounds": mailer.book.backgrounds_for(uid)})
        return self.backgrounds_for(uid)

    # ── Chat colour themes (private to each person, like backgrounds) ───────
    def themes_for(self, uid: str) -> dict:
        return dict(self.themes.get(uid, {}))

    def set_theme(self, uid: str, key: str, theme: str | None) -> dict:
        self._check_key(uid, key)
        mine = self.themes.setdefault(uid, {})
        if theme:
            if not re.fullmatch(r"[a-z0-9_-]{1,32}", theme):
                raise MessengerError("invalid_format", "Unknown theme")
            if key not in mine and len(mine) >= MAX_BACKGROUNDS_PER_USER:
                raise MessengerError("invalid_format", "Too many chat themes")
            mine[key] = theme
        else:
            mine.pop(key, None)
        self._save_backgrounds()
        self._send_to(uid, {"type": "themes", "themes": self.themes_for(uid)})
        return self.themes_for(uid)

    async def _async_set_cover(self, uid: str, profile: dict, cover: dict | None) -> None:
        """A new cover photo (an uploaded picture), or none. The old one's file is deleted."""
        old = (profile.get("cover") or {}).get("id")
        if cover:
            if self.feed.opt("covers") is False:
                raise MessengerError("unauthorized", "Cover photos are switched off")
            att = self.data["attachments"].get(cover["id"])
            if not att or att["uploader"] != uid or att.get("status") != "pending" \
                    or not str(att.get("mime") or "").startswith("image/"):
                raise MessengerError("invalid_format", "That picture can’t be used as a cover photo")
            att.update({"status": "cover", "cover_of": uid, "ts": now_ms()})
            profile["cover"] = {"id": att["id"], "y": round(float(cover.get("y", 50)), 1)}
        else:
            profile["cover"] = None
        if old and old != (profile.get("cover") or {}).get("id"):
            await self._async_remove_attachment(old)
        self._save()

    def profile_for(self, uid: str) -> dict:
        return {"share": False, "name": "", "photo": None, "my_card": None, "activity": True, "skin": "", "keep_archived": False, "cover": None,
                **self.cdata["profiles"].get(uid, {})}

    async def async_set_profile(self, uid: str, patch: dict) -> dict:
        profile = self.profile_for(uid)
        if "share" in patch:
            profile["share"] = bool(patch["share"])
        if "name" in patch:
            profile["name"] = _clean_str(patch["name"], 80)
        if "photo" in patch:
            photo = patch["photo"]
            if photo and (not str(photo).startswith("data:image/") or len(photo) > MAX_PHOTO_DATA_URL):
                raise MessengerError("invalid_format", "Photo is too large")
            if (photo or None) != profile.get("photo"):
                # a new picture is newer than any copy of the old one in other people's contacts
                profile["photo_at"] = now_ms() if photo else 0
            profile["photo"] = photo or None
        if "my_card" in patch:
            profile["my_card"] = patch["my_card"] or None
        if "activity" in patch:
            profile["activity"] = bool(patch["activity"])
        if "skin" in patch:
            # the look each person picks for their own screens; only they see it
            profile["skin"] = re.sub(r"[^a-z0-9_-]", "", str(patch["skin"] or "").lower())[:24]
        if "keep_archived" in patch:
            profile["keep_archived"] = bool(patch["keep_archived"])
        if "contact_emails" in patch:
            profile["contact_emails"] = bool(patch["contact_emails"])
        if "cover" in patch:
            await self._async_set_cover(uid, profile, patch["cover"])
        if "cover_y" in patch and profile.get("cover"):
            profile["cover"] = {**profile["cover"], "y": round(float(patch["cover_y"]), 1)}
        self.cdata["profiles"][uid] = profile
        self._send_to(uid, {"type": "profile", "profile": profile})
        self._save_contacts()
        # everyone's chat list shows the new name/photo
        users = await self.async_users()
        for sub_uid in {s.uid for s in self._subs.values()}:
            self._send_to(sub_uid, {"type": "users", "users": users})
        return profile
