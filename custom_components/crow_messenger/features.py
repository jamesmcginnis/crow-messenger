"""The Apple Messages-style extras for Crow Messenger.

Kept apart from manager.py so the core privacy rules stay easy to read. Every
method here is mixed into ``Messenger`` and goes through ``_thread`` (and the
per-person hidden lists) exactly like the core, so a person can only react
to, reply to, vote in or tap buttons on messages they can see.

* Tapbacks, replies, edits, polls, stickers placed on bubbles
* Disappearing messages (counted from when a message has been read)
* Send Later (timers that survive a restart)
* Pinned and marked-unread conversations
* Check In ("let them know when I get Home") using the person's zone
* Link previews, fetched by Home Assistant with private addresses refused
* Shared devices, buttons from automations, @mentions
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import html as html_lib
import io
import ipaddress
import logging
import os
import re
import socket
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any
from urllib.parse import urljoin, urlparse

from homeassistant.core import Event, callback
from homeassistant.helpers.event import async_track_point_in_utc_time, async_track_state_change_event

from .const import (
    ACTION_PREFIX,
    BUBBLE_EFFECTS,
    DISAPPEAR_CHOICES,
    MESSAGE_TTL_CHOICES,
    EDIT_WINDOW_MS,
    EVENT_ACTION,
    HA_SENDER_ID,
    LINK_MAX_HTML,
    LINK_MAX_IMAGE,
    LINK_TIMEOUT,
    MAX_ACTIONS,
    MAX_EDITS,
    MAX_PINNED,
    MAX_PLACED_STICKERS,
    MAX_POLL_OPTIONS,
    MAX_SCHEDULE_AHEAD_DAYS,
    MAX_SCHEDULED_PER_USER,
    MAX_STICKER_DATA_URL,
    MAX_STICKERS_PER_USER,
    MAX_TEXT_LENGTH,
    SCREEN_EFFECTS,
    TEXT_STYLES,
)

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
EXTRA_TYPES = ("text", "post", "poll", "checkin", "sticker", "entity", "location", "checklist", "event", "contact", "call",
               "timer", "game", "status", "locreq", "ring")
CALL_KINDS = {"facetime": "📹 FaceTime", "facetime_audio": "📞 FaceTime Audio", "phone": "📞 Phone Call"}
# Apple's names for the standard tapbacks, used in the quiet notification
TAPBACK_WORDS = {"❤️": "Loved", "👍": "Liked", "👎": "Disliked", "😂": "Laughed at",
                 "‼️": "Emphasized", "❓": "Questioned"}


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


def _now() -> int:
    return int(time.time() * 1000)


def _id() -> str:
    from .manager import new_id
    return new_id()


def _short(text: str, n: int = 60) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def _str(value: Any, n: int) -> str:
    return str(value or "").strip()[:n]


def disappear_label(seconds: int) -> str:
    return {3600: "1 hour", 86400: "1 day", 604800: "1 week"}.get(int(seconds), f"{int(seconds) // 60} minutes")


TOWN_LOOKUP = "https://nominatim.openstreetmap.org/reverse"
TOWN_RETRY = 3600   # seconds before a failed town lookup is tried again


def _town_key(lat: float, lon: float) -> str:
    return f"{round(float(lat), 4)},{round(float(lon), 4)}"


def _zone_collection(hass: Any) -> Any:
    """Home Assistant's stored zones (the ones made in the UI). Newer versions keep them in a
    ZoneData object under hass.data["zone"]; older ones kept the collection there directly."""
    data = hass.data.get("zone")
    if data is None:
        return None
    if hasattr(data, "storage_collection"):
        return data.storage_collection
    return data if hasattr(data, "async_create_item") else None


def _str_town(town: Any) -> str:
    return str(town or "").strip()[:80]


def _is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value.split("%")[0])
    except ValueError:
        return False
    # an IPv4 address reached through IPv6 (NAT64 or IPv4-mapped) is judged by the IPv4 address
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        elif ip in ipaddress.ip_network("64:ff9b::/96"):
            ip = ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
    return ip.is_global and not ip.is_multicast


# how link previews ask for a page: as a browser, then as a link-preview robot
BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) "
              "Version/18.0 Safari/605.1.15")
BOT_UA = "Mozilla/5.0 (compatible; CrowMessenger link preview; facebookexternalhit/1.1)"


class _MetaParser:
    """Just enough HTML reading for a link preview: <title> and <meta> tags in <head>."""

    def __init__(self) -> None:
        from html.parser import HTMLParser

        outer = self
        self.meta: dict[str, str] = {}
        self.title = ""
        self.icon = ""

        class P(HTMLParser):
            in_title = False

            def handle_starttag(self, tag, attrs):  # noqa: ANN001
                a = {k.lower(): (v or "") for k, v in attrs}
                if tag == "meta":
                    key = (a.get("property") or a.get("name") or "").lower()
                    if key and a.get("content") and key not in outer.meta:
                        outer.meta[key] = a["content"]
                elif tag == "title":
                    self.in_title = True
                elif tag == "link" and "icon" in a.get("rel", "").lower() and not outer.icon:
                    outer.icon = a.get("href", "")
                elif tag == "body":
                    raise StopIteration

            def handle_endtag(self, tag):  # noqa: ANN001
                if tag == "title":
                    self.in_title = False

            def handle_data(self, data):  # noqa: ANN001
                if self.in_title and len(outer.title) < 300:
                    outer.title += data

        self._p = P(convert_charrefs=True)

    def feed(self, text: str) -> None:
        try:
            self._p.feed(text)
        except StopIteration:
            pass
        except Exception:  # noqa: BLE001 - broken HTML is common
            pass


class FeaturesMixin:
    """Methods mixed into Messenger."""

    # ── helpers ─────────────────────────────────────────────────────────────
    def _msg(self: Messenger, uid: str, thread_id: str, message_id: str) -> tuple[dict, dict]:
        """A message this person can see (or not_found)."""
        thread = self._thread(uid, thread_id)
        msg = next((m for m in self.data["messages"].get(thread_id, []) if m["id"] == message_id), None)
        if not msg or msg["ts"] < self._visible_from(thread, uid) or msg["id"] in self._hidden(thread, uid):
            raise _err("not_found", "Message not found")
        return thread, msg

    @callback
    def _push_update(self: Messenger, thread: dict, msg: dict) -> None:
        """Tell everyone who can see a message that it changed."""
        for pid in thread["participants"]:
            if msg["ts"] < self._visible_from(thread, pid):
                continue
            hidden = self._hidden(thread, pid)
            if msg["id"] in hidden:
                continue
            self._send_to(pid, {"type": "message_update", "thread_id": thread["id"],
                                "message": self.message_view(msg, hidden, viewer=pid)})

    def _feature(self: Messenger, name: str) -> bool:
        return (self.settings.get("features", {}) or {}).get(name, True) is not False

    def _alert(self: Messenger, thread: dict, uids: list[str], title: str, body: str, **kw: Any) -> None:
        """A phone notification that isn't a new message (tapbacks, check-ins, …)."""
        if self.alert_callback and uids:
            self.hass.async_create_task(self.alert_callback(thread, uids, title, body, kw))

    def _preview_of(self: Messenger, msg: dict) -> str:
        kind = msg.get("type", "text")
        if kind == "poll":
            return f"📊 {msg.get('text') or 'Poll'}"
        if kind == "checkin":
            return "📍 Check In"
        if kind == "timer":
            return f"⏰ {msg.get('text') or 'Timer'}"
        if kind == "game":
            from .play import GAME_NAMES
            return f"🎮 {GAME_NAMES.get((msg.get('game') or {}).get('kind'), 'Game')}"
        if kind == "status":
            return "🏠 Home Status"
        if kind == "locreq":
            return "📍 Where are you?"
        if kind == "ring":
            return "📳 Ring Phone"
        if kind == "sticker":
            return (msg.get("sticker") or {}).get("emoji") or "Sticker"
        if kind == "entity":
            state = self.hass.states.get((msg.get("entity") or {}).get("entity_id", ""))
            return f"🏠 {state.name if state else 'Device'}"
        if kind == "call":
            return CALL_KINDS.get((msg.get("call") or {}).get("kind"), "📞 Call")
        if kind == "location":
            loc = msg.get("location") or {}
            return "📍 Live Location" if loc.get("live_until") else f"📍 {loc.get('label') or 'Location'}"
        if kind == "checklist":
            return f"☑️ {msg.get('text') or 'Checklist'}"
        if kind == "event":
            return f"📅 {msg.get('text') or 'Event'}"
        if kind == "post":
            return "📰 Shared a post"
        if kind == "contact":
            c = msg.get("contact") or {}
            return f"👤 {' '.join(x for x in (c.get('first'), c.get('last')) if x) or c.get('company') or 'Contact'}"
        if msg.get("view_once"):
            return "📷 View Once"

        if msg.get("text"):
            return msg["text"]
        atts = [self.data["attachments"].get(a) or {} for a in msg.get("attachments", [])]
        if atts:
            mime = atts[0].get("mime") or ""
            if mime.startswith("image/"):
                return "Photo" if len(atts) == 1 else f"{len(atts)} Photos"
            if mime.startswith("video/"):
                return "Video"
            if mime.startswith("audio/"):
                return "Audio Message"
            return atts[0].get("name") or "Attachment"
        return "Message"

    # ── message view additions ──────────────────────────────────────────────
    def extras_view(self: Messenger, msg: dict) -> dict:
        out: dict[str, Any] = {}
        for key in ("call", "reactions", "effect", "spans", "mentions", "poll", "sticker", "stickers", "entity",
                    "actions", "action_taken", "link", "link_safety", "ttl", "checkin", "scheduled", "note", "at", "timer", "locreq", "ring"):
            if msg.get(key):
                out[key] = msg[key]
        if msg.get("game"):
            out["game"] = self.game_view(msg)
        if msg.get("edits"):
            out["edited"] = msg.get("edited")
            out["edits"] = msg["edits"]
        if msg.get("reply_to"):
            out["reply_to"] = msg["reply_to"]
            orig = next((m for m in self.data["messages"].get(msg["thread_id"], [])
                         if m["id"] == msg["reply_to"]), None)
            out["reply_preview"] = ({"sender": orig["sender"], "text": _short(self._preview_of(orig), 140),
                                     "ts": orig["ts"]} if orig else {"gone": True})
        if msg.get("ttl"):
            exp = self._expires_at(msg)
            if exp:
                out["expires"] = exp
        return out

    # ── checking what's sent with a message ─────────────────────────────────
    async def async_check_extra(self: Messenger, uid: str, thread: dict, text: str, extra: dict,
                                attachment_ids: list[str] | None = None) -> dict:
        """Validate the extras sent with a message and return what is stored."""
        out: dict[str, Any] = {}
        if not extra:
            return out
        out.update(await self.async_check_more(uid, thread, text, extra, attachment_ids or []))
        kind = extra.get("type") or "text"
        if kind not in EXTRA_TYPES:
            raise _err("invalid_format", "Unknown message type")
        if extra.get("reply_to"):
            self._msg(uid, thread["id"], str(extra["reply_to"]))
            out["reply_to"] = str(extra["reply_to"])
        if extra.get("ttl"):
            if int(extra["ttl"]) not in MESSAGE_TTL_CHOICES:
                raise _err("invalid_format", "Unsupported disappearing time")
            out["ttl"] = int(extra["ttl"])
        if extra.get("effect"):
            if extra["effect"] not in BUBBLE_EFFECTS + SCREEN_EFFECTS:
                raise _err("invalid_format", "Unknown effect")
            out["effect"] = extra["effect"]
        if extra.get("spans"):
            spans = []
            for span in list(extra["spans"])[:200]:
                try:
                    s, e, style = int(span["s"]), int(span["e"]), str(span["style"])
                except (KeyError, TypeError, ValueError) as err:
                    raise _err("invalid_format", "Bad text style") from err
                if style in TEXT_STYLES and 0 <= s < e <= len(text):
                    spans.append({"s": s, "e": e, "style": style})
            if spans:
                out["spans"] = spans
        if extra.get("mentions"):
            ids = [m for m in dict.fromkeys(extra["mentions"]) if m in thread["participants"] and m != uid]
            if ids:
                out["mentions"] = ids
        if kind != "text":
            out["type"] = kind
        if kind == "poll":
            poll = extra.get("poll") or {}
            options = [_str(o, 120) for o in poll.get("options", [])]
            options = [o for o in dict.fromkeys(options) if o][:MAX_POLL_OPTIONS]
            if not text or len(options) < 2:
                raise _err("invalid_format", "A poll needs a question and at least two choices")
            out["poll"] = {"options": [{"id": _id()[:6], "text": o, "by": uid} for o in options],
                           "votes": {}, "multi": bool(poll.get("multi", True)),
                           **({"anonymous": True} if poll.get("anonymous") else {})}
        elif kind == "sticker":
            st = extra.get("sticker") or {}
            out["sticker"] = self._check_sticker(uid, st)
        elif kind == "entity":
            eid = _str((extra.get("entity") or {}).get("entity_id"), 255)
            if not self.hass.states.get(eid):
                raise _err("not_found", "That device isn't in Home Assistant")
            out["entity"] = {"entity_id": eid}
        elif kind == "checkin":
            out["checkin"] = self._check_checkin(uid, extra.get("checkin") or {})
        elif kind in ("timer", "game", "status"):
            out.update(self.check_play(uid, thread, kind, extra))
        elif kind == "locreq":
            out.update(self.check_locreq(uid, thread))
        elif kind == "ring":
            out.update(self.check_ring(uid, thread, extra))
        elif kind == "call":
            call = extra.get("call") or {}
            if call.get("kind") not in CALL_KINDS:
                raise _err("invalid_format", "Unknown kind of call")
            if thread["is_group"]:
                raise _err("invalid_format", "Calls are for one-to-one chats")
            out["call"] = {"kind": call["kind"]}
        if extra.get("actions"):
            actions = []
            for act in list(extra["actions"])[:MAX_ACTIONS]:
                if isinstance(act, str):
                    act = {"title": act}
                title = _str(act.get("title"), 40)
                if not title:
                    continue
                action = _str(act.get("action"), 100) or re.sub(r"[^A-Z0-9]+", "_", title.upper()).strip("_")
                actions.append({"title": title, "action": action or "ACTION"})
            if actions:
                out["actions"] = actions
        return out

    def _check_sticker(self: Messenger, uid: str, st: dict) -> dict:
        if st.get("emoji"):
            emoji = _str(st["emoji"], 24)
            if not emoji:
                raise _err("invalid_format", "Sticker is empty")
            return {"emoji": emoji}
        sid = _str(st.get("image"), 64)
        if not sid or sid not in self._sticker_store()["images"]:
            raise _err("not_found", "Sticker not found")
        return {"image": sid}

    # ── after a message is sent ─────────────────────────────────────────────
    @callback
    def after_send(self: Messenger, thread: dict, msg: dict) -> None:
        if msg.get("type", "text") == "text" and msg.get("text") and not msg.get("attachments") \
                and self._feature("link_previews"):
            found = URL_RE.search(msg["text"])
            if found:
                self.hass.async_create_task(self._async_link_preview(thread, msg, found.group(0).rstrip(").,!?;:")))
        self._link_safety(thread, msg)
        if msg.get("type") == "checkin":
            self._arm_checkin(thread, msg)
        if msg.get("type") == "timer":
            self._arm_timer(thread, msg)

    # ── Tapbacks ────────────────────────────────────────────────────────────
    async def async_react(self: Messenger, uid: str, thread_id: str, message_id: str, emoji: str | None) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        if msg.get("type") == "system":
            raise _err("invalid_format", "You can't react to that")
        emoji = _str(emoji, 24)
        reactions = msg.setdefault("reactions", {})
        if not emoji or reactions.get(uid) == emoji:
            reactions.pop(uid, None)
            emoji = ""
        else:
            reactions[uid] = emoji
        if not reactions:
            msg.pop("reactions", None)
        self._save()
        self._push_update(thread, msg)
        # the sender is told - and in a chat with yourself you're told too, so tapbacks can be tried out
        self_chat = thread["participants"] == [uid]
        if emoji:
            from .const import EVENT_REACTION
            self.hass.bus.async_fire(EVENT_REACTION, {"user_id": uid, "on": "message", "thread_id": thread_id,
                                                      "message_id": message_id, "reaction": emoji, "to_user_id": msg["sender"]})
        if emoji and msg["sender"] != HA_SENDER_ID and (msg["sender"] != uid or self_chat):
            users = await self.async_user_map()
            name = users.get(uid, {}).get("name", "Someone")
            word = TAPBACK_WORDS.get(emoji)
            what = f"“{_short(self._preview_of(msg))}”"
            body = f"{name} {word.lower() if word else 'reacted ' + emoji + ' to'} {what}"
            self._alert(thread, [msg["sender"]], name, body, quiet=True, tag=f"react_{msg['id']}")
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Edit ────────────────────────────────────────────────────────────────
    async def async_edit(self: Messenger, uid: str, thread_id: str, message_id: str, text: str,
                         spans: list | None = None) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        if msg["sender"] != uid or msg.get("type", "text") != "text":
            raise _err("not_found", "Message not found")
        if _now() - msg["ts"] > EDIT_WINDOW_MS:
            raise _err("invalid_format", "Messages can only be edited for 15 minutes after sending")
        if len(msg.get("edits", [])) >= MAX_EDITS:
            raise _err("invalid_format", "A message can only be edited 5 times")
        text = (text or "").strip()
        if len(text) > MAX_TEXT_LENGTH:
            raise _err("invalid_format", "Message is too long")
        if not text and not msg.get("attachments"):
            raise _err("invalid_format", "Message is empty")
        if text == msg.get("text"):
            return self.message_view(msg, self._hidden(thread, uid))
        edits = msg.setdefault("edits", [])
        edits.append({"text": msg.get("text", ""), "ts": msg.get("edited") or msg["ts"]})
        msg["text"] = text
        msg["edited"] = _now()
        clean = await self.async_check_extra(uid, thread, text, {"spans": spans or []})
        if clean.get("spans"):
            msg["spans"] = clean["spans"]
        else:
            msg.pop("spans", None)
        old_url = (msg.get("link") or {}).get("url")
        found = URL_RE.search(text)
        new_url = found.group(0).rstrip(").,!?;:") if found else None
        if new_url != old_url:
            msg.pop("link", None)
            if new_url and not msg.get("attachments") and self._feature("link_previews"):
                self.hass.async_create_task(self._async_link_preview(thread, msg, new_url))
        if new_url != (msg.get("link_safety") or {}).get("url"):
            msg.pop("link_safety", None)
            self._link_safety(thread, msg)
        self._save()
        self._push_update(thread, msg)
        self._broadcast_thread(thread)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Disappearing messages ───────────────────────────────────────────────
    async def async_set_disappear(self: Messenger, uid: str, thread_id: str, seconds: int) -> dict:
        thread = self._thread(uid, thread_id)
        seconds = int(seconds or 0)
        if seconds not in DISAPPEAR_CHOICES:
            raise _err("invalid_format", "Unsupported Disappearing Messages value")
        if int(thread.get("disappear") or 0) != seconds:
            thread["disappear"] = seconds
            users = await self.async_user_map()
            actor = users.get(uid, {}).get("name", "Someone")
            self._system_message(thread, f"{actor} set messages to disappear {disappear_label(seconds)} after "
                                         f"they're read." if seconds else
                                 f"{actor} turned off disappearing messages.", uid)
            self._save()
        self._broadcast_thread(thread)
        return self.thread_view(thread, uid)

    def note_seen(self: Messenger, thread: dict, uid: str, upto: int) -> None:
        """Start the clock on disappearing messages this person has now read."""
        if uid == HA_SENDER_ID:
            return
        now = _now()
        changed = []
        start = self._visible_from(thread, uid)
        for msg in self.data["messages"].get(thread["id"], []):
            if msg.get("ttl") and msg["sender"] != uid and msg["ts"] <= upto and msg["ts"] >= start \
                    and uid not in msg.get("seen", {}):
                msg.setdefault("seen", {})[uid] = now
                changed.append(msg)
        if changed:
            self._save()
            for msg in changed:
                self._push_update(thread, msg)

    def _expires_at(self: Messenger, msg: dict) -> int | None:
        ttl = int(msg.get("ttl") or 0) * 1000
        if not ttl:
            return None
        thread = self.data["threads"].get(msg["thread_id"])
        if not thread:
            return None
        readers = [p for p in thread["participants"] if p not in (msg["sender"], HA_SENDER_ID)]
        seen = msg.get("seen", {})
        if not readers:
            return msg["ts"] + ttl
        if not all(p in seen for p in readers):
            return None
        return max(seen[p] for p in readers) + ttl

    async def async_expire(self: Messenger) -> bool:
        now = _now()
        changed = False
        for thread in list(self.data["threads"].values()):
            def gone(m: dict) -> bool:
                exp = self._expires_at(m) if m.get("ttl") else None
                return bool(exp and exp <= now)
            removed = await self._async_purge(thread["id"], gone)
            if removed:
                changed = True
                self._tidy_hidden(thread)
                self._broadcast_thread(thread, {"reload": True})
        if changed:
            self._save()
        return changed

    # ── Pins and Mark as Unread ─────────────────────────────────────────────
    def set_flag(self: Messenger, uid: str, thread_id: str, flag: str, on: bool) -> dict:
        thread = self._thread(uid, thread_id)
        lst = thread.setdefault(flag, [])
        if on and uid not in lst:
            if flag == "pinned" and sum(1 for t in self.data["threads"].values()
                                        if uid in t.get("pinned", [])) >= MAX_PINNED:
                raise _err("invalid_format", f"You can pin up to {MAX_PINNED} conversations")
            lst.append(uid)
        elif not on and uid in lst:
            lst.remove(uid)
        if not lst:
            thread.pop(flag, None)
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        return self.thread_view(thread, uid)

    # ── Polls ───────────────────────────────────────────────────────────────
    async def async_vote(self: Messenger, uid: str, thread_id: str, message_id: str, option_ids: list[str]) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        poll = msg.get("poll")
        if not poll:
            raise _err("not_found", "Poll not found")
        valid = {o["id"] for o in poll["options"]}
        chosen = [o for o in dict.fromkeys(option_ids or []) if o in valid]
        if not poll.get("multi", True):
            chosen = chosen[-1:]
        if chosen:
            poll["votes"][uid] = chosen
        else:
            poll["votes"].pop(uid, None)
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid), viewer=uid)

    async def async_poll_add(self: Messenger, uid: str, thread_id: str, message_id: str, text: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        poll = msg.get("poll")
        text = _str(text, 120)
        if not poll or not text:
            raise _err("not_found", "Poll not found")
        if any(o["text"].lower() == text.lower() for o in poll["options"]):
            raise _err("invalid_format", "That choice is already in the poll")
        if len(poll["options"]) >= MAX_POLL_OPTIONS:
            raise _err("invalid_format", f"A poll can have up to {MAX_POLL_OPTIONS} choices")
        poll["options"].append({"id": _id()[:6], "text": text, "by": uid})
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Stickers ────────────────────────────────────────────────────────────
    def _sticker_store(self: Messenger) -> dict:
        st = self.stickers
        st.setdefault("images", {})
        st.setdefault("users", {})
        return st

    def stickers_for(self: Messenger, uid: str) -> list[str]:
        return list(self._sticker_store()["users"].get(uid, []))

    def sticker_images(self: Messenger, ids: list[str]) -> dict:
        images = self._sticker_store()["images"]
        return {i: images[i] for i in ids[:200] if i in images}

    def save_sticker(self: Messenger, uid: str, image: str) -> str:
        if not image.startswith(("data:image/png", "data:image/webp")) or len(image) > MAX_STICKER_DATA_URL:
            raise _err("invalid_format", "Sticker is too large")
        st = self._sticker_store()
        mine = st["users"].setdefault(uid, [])
        sid = hashlib.sha256(image.encode()).hexdigest()[:32]
        if sid in mine:
            return sid
        if len(mine) >= MAX_STICKERS_PER_USER:
            raise _err("invalid_format", f"You can keep up to {MAX_STICKERS_PER_USER} stickers")
        st["images"][sid] = image
        mine.insert(0, sid)
        self._save_backgrounds()
        self._send_to(uid, {"type": "stickers", "stickers": list(mine)})
        return sid

    def delete_sticker(self: Messenger, uid: str, sid: str) -> None:
        st = self._sticker_store()
        mine = st["users"].get(uid, [])
        if sid in mine:
            mine.remove(sid)
            self._gc_stickers()
            self._save_backgrounds()
        self._send_to(uid, {"type": "stickers", "stickers": list(mine)})

    def _gc_stickers(self: Messenger) -> None:
        st = self._sticker_store()
        used = {s for lst in st["users"].values() for s in lst}
        for msgs in self.data["messages"].values():
            for m in msgs:
                if (m.get("sticker") or {}).get("image"):
                    used.add(m["sticker"]["image"])
                used.update(p["image"] for p in m.get("stickers", []) if p.get("image"))
        feed = getattr(self, "feed", None)
        if feed is not None:
            for post in feed.data.get("posts", {}).values():
                for c in post.get("comments", []):
                    if (c.get("sticker") or {}).get("image"):
                        used.add(c["sticker"]["image"])
        unused = [s for s in st["images"] if s not in used]
        for sid in unused:
            st["images"].pop(sid)
        if unused:
            self._save_backgrounds()

    async def async_place_sticker(self: Messenger, uid: str, thread_id: str, message_id: str, sticker: dict,
                                  x: float, y: float, rot: float = 0, scale: float = 1) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        if msg.get("type") == "system":
            raise _err("invalid_format", "You can't put a sticker there")
        placed = msg.setdefault("stickers", [])
        if len(placed) >= MAX_PLACED_STICKERS:
            raise _err("invalid_format", "There are already lots of stickers on that message")
        entry = {"id": _id()[:8], "uid": uid, "ts": _now(), **self._check_sticker(uid, sticker or {}),
                 "x": max(0.0, min(1.0, float(x))), "y": max(0.0, min(1.0, float(y))),
                 "rot": max(-45.0, min(45.0, float(rot or 0))), "scale": max(0.5, min(2.0, float(scale or 1)))}
        placed.append(entry)
        self._save()
        self._push_update(thread, msg)
        if msg["sender"] not in (uid, HA_SENDER_ID):
            users = await self.async_user_map()
            name = users.get(uid, {}).get("name", "Someone")
            self._alert(thread, [msg["sender"]], name,
                        f"{name} put a sticker on “{_short(self._preview_of(msg))}”", quiet=True)
        return self.message_view(msg, self._hidden(thread, uid))

    async def async_remove_sticker(self: Messenger, uid: str, thread_id: str, message_id: str, sticker_id: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        before = len(msg.get("stickers", []))
        msg["stickers"] = [s for s in msg.get("stickers", []) if not (s["id"] == sticker_id and s["uid"] == uid)]
        if len(msg["stickers"]) == before:
            raise _err("not_found", "Sticker not found")
        if not msg["stickers"]:
            msg.pop("stickers")
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Buttons on messages from automations ────────────────────────────────
    async def async_take_action(self: Messenger, uid: str, thread_id: str, message_id: str, action: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        act = next((a for a in msg.get("actions", []) if a["action"] == action), None)
        if not act:
            raise _err("not_found", "That button isn't on this message")
        if msg.get("action_taken"):
            raise _err("invalid_format", "Someone has already answered this")
        users = await self.async_user_map()
        name = users.get(uid, {}).get("name", "")
        msg["action_taken"] = {"action": act["action"], "title": act["title"], "user": uid, "ts": _now()}
        self._save()
        self.hass.bus.async_fire(EVENT_ACTION, {
            "action": act["action"], "title": act["title"], "thread_id": thread_id,
            "message_id": message_id, "user_id": uid, "user_name": name,
        })
        self._push_update(thread, msg)
        if thread["is_group"]:
            self._system_message(thread, f"{name or 'Someone'} chose “{act['title']}”.", uid)
            self._save()
        return self.message_view(msg, self._hidden(thread, uid))

    async def async_push_action(self: Messenger, uid: str, action_id: str) -> bool:
        """A button pressed in a phone notification: CROW_ACT_<message id>_<n>."""
        if not action_id.startswith(ACTION_PREFIX):
            return False
        rest = action_id[len(ACTION_PREFIX):]
        mid, _, idx = rest.rpartition("_")
        for tid, msgs in self.data["messages"].items():
            msg = next((m for m in msgs if m["id"] == mid), None)
            if msg:
                try:
                    act = msg.get("actions", [])[int(idx)]
                    await self.async_take_action(uid, tid, mid, act["action"])
                    return True
                except (IndexError, ValueError):
                    return False
        return False

    # ── Send Later ──────────────────────────────────────────────────────────
    def scheduled_for(self: Messenger, uid: str, thread_id: str | None = None) -> list[dict]:
        out = []
        for item in self.data.get("scheduled", []):
            if item["uid"] == uid and (thread_id is None or item["thread_id"] == thread_id):
                atts = [self.data["attachments"][a] for a in item.get("attachments", []) if a in self.data["attachments"]]
                out.append({k: item.get(k) for k in ("id", "thread_id", "text", "at", "extra", "place")} | {
                    "attachments": [{k: a.get(k) for k in ("id", "name", "mime", "size", "width", "height", "duration")}
                                    | {"has_thumb": bool(a.get("thumb"))} for a in atts]})
        # the ones waiting for a place come after those with a time
        return sorted(out, key=lambda x: (x["at"] is None, x["at"] or x.get("created") or 0))

    def _scheduled_changed(self: Messenger, uid: str, thread_id: str) -> None:
        self._send_to(uid, {"type": "scheduled", "thread_id": thread_id,
                            "items": self.scheduled_for(uid, thread_id)})

    async def async_schedule(self: Messenger, uid: str, thread_id: str, text: str, attachment_ids: list[str],
                             extra: dict, at: int | None, place: dict | None = None) -> dict:
        thread = self._thread(uid, thread_id)
        now = _now()
        if place:
            # "when I arrive at" / "when I leave" a zone, from the person linked to you
            person = self.person_for(uid)
            if not person:
                raise _err("invalid_format", "Sending when you arrive or leave needs a person in Home Assistant linked to your user")
            zone_id = _str(place.get("zone"), 255)
            zone = self.hass.states.get(zone_id)
            if not zone_id.startswith("zone.") or not zone:
                raise _err("not_found", "That place isn't a zone in Home Assistant")
            if place.get("on") not in ("arrive", "leave"):
                raise _err("invalid_format", "Choose arriving or leaving")
            place = {"zone": zone_id, "zone_name": zone.name, "on": place["on"], "person": person.entity_id}
            at = None
        else:
            at = int(at or 0)
            if at < now + 30_000:
                raise _err("invalid_format", "Choose a time in the future")
            if at > now + MAX_SCHEDULE_AHEAD_DAYS * 86_400_000:
                raise _err("invalid_format", "That's too far ahead")
        if sum(1 for s in self.data["scheduled"] if s["uid"] == uid) >= MAX_SCHEDULED_PER_USER:
            raise _err("invalid_format", "You have too many messages waiting to be sent")
        text = (text or "").strip()
        if len(text) > MAX_TEXT_LENGTH:
            raise _err("invalid_format", "Message is too long")
        attachment_ids = list(dict.fromkeys(attachment_ids or []))
        for aid in attachment_ids:
            att = self.data["attachments"].get(aid)
            if not att or att["uploader"] != uid or att.get("status") != "pending" \
                    or att.get("thread_id") not in (None, thread_id):
                raise _err("not_found", "Attachment not found")
        await self.async_check_extra(uid, thread, text, extra or {})
        if not text and not attachment_ids and not (extra or {}).get("type"):
            raise _err("invalid_format", "Message is empty")
        for aid in attachment_ids:
            self.data["attachments"][aid].update({"status": "scheduled", "thread_id": thread_id})
        item = {"id": _id(), "uid": uid, "thread_id": thread_id, "text": text, "attachments": attachment_ids,
                "extra": dict(extra or {}), "at": at, "created": now, **({"place": place} if place else {})}
        self.data["scheduled"].append(item)
        self._save()
        self._arm_scheduled(item)
        self._scheduled_changed(uid, thread_id)
        return item

    def _arm_scheduled(self: Messenger, item: dict) -> None:
        timers = self.__dict__.setdefault("_timers", {})
        if item["id"] in timers:
            timers.pop(item["id"])()
        place = item.get("place")
        if place:
            # sent the next time the person goes into (or out of) the zone
            target = self.zone_state_name(place["zone"])

            @callback
            def _moved(event: Event) -> None:
                old, new = event.data.get("old_state"), event.data.get("new_state")
                if not old or not new or not target or old.state == new.state:
                    return
                if (place["on"] == "arrive" and new.state == target) or (place["on"] == "leave" and old.state == target):
                    self._cancel_timer(item["id"])
                    self.hass.async_create_task(self.async_send_scheduled(item["id"]))

            timers[item["id"]] = async_track_state_change_event(self.hass, [place["person"]], _moved)
            return
        when = datetime.fromtimestamp(max(item["at"], _now() + 1000) / 1000, tz=timezone.utc)

        @callback
        def _fire(_now_dt) -> None:
            timers.pop(item["id"], None)
            self.hass.async_create_task(self.async_send_scheduled(item["id"]))

        timers[item["id"]] = async_track_point_in_utc_time(self.hass, _fire, when)

    async def async_send_scheduled(self: Messenger, sid: str, uid: str | None = None) -> None:
        item = next((s for s in self.data["scheduled"] if s["id"] == sid), None)
        if not item or (uid and item["uid"] != uid):
            if uid:
                raise _err("not_found", "Message not found")
            return
        self._cancel_timer(sid)
        self.data["scheduled"].remove(item)
        for aid in item["attachments"]:
            if aid in self.data["attachments"]:
                self.data["attachments"][aid]["status"] = "pending"
        try:
            await self.async_send(item["uid"], item["thread_id"], item["text"],
                                  [a for a in item["attachments"] if a in self.data["attachments"]],
                                  extra=item.get("extra") or {}, scheduled=True)
        except Exception as err:  # noqa: BLE001 - e.g. the person has left the group since
            _LOGGER.warning("Crow Messenger could not send a scheduled message: %s", err)
            for aid in item["attachments"]:
                await self._async_remove_attachment(aid)
            self._send_to(item["uid"], {"type": "notice", "text": f"A message you scheduled couldn't be sent: {err}"})
        self._save()
        self._scheduled_changed(item["uid"], item["thread_id"])

    def _cancel_timer(self: Messenger, key: str) -> None:
        unsub = self.__dict__.setdefault("_timers", {}).pop(key, None)
        if unsub:
            unsub()

    async def async_cancel_scheduled(self: Messenger, uid: str, sid: str) -> None:
        item = next((s for s in self.data["scheduled"] if s["id"] == sid and s["uid"] == uid), None)
        if not item:
            raise _err("not_found", "Message not found")
        self._cancel_timer(sid)
        self.data["scheduled"].remove(item)
        for aid in item["attachments"]:
            await self._async_remove_attachment(aid)
        self._save()
        self._scheduled_changed(uid, item["thread_id"])

    # ── Check In ────────────────────────────────────────────────────────────
    def person_for(self: Messenger, uid: str):  # noqa: ANN201
        found = [s for s in self.hass.states.async_all("person") if s.attributes.get("user_id") == uid]
        # the one with a location, if there's more than one
        return next((s for s in found if s.attributes.get("latitude") is not None), found[0] if found else None)

    def zone_state_name(self: Messenger, zone_id: str) -> str:
        """The state a person has while in a zone: 'home' for Home, otherwise the zone's name."""
        if zone_id == "zone.home":
            return "home"
        zone = self.hass.states.get(zone_id)
        return zone.name if zone else ""

    def _check_checkin(self: Messenger, uid: str, data: dict) -> dict:
        person = self.person_for(uid)
        if not person:
            raise _err("invalid_format", "Check In needs a person in Home Assistant linked to your user")
        zone_id = _str(data.get("zone") or "zone.home", 255)
        zone = self.hass.states.get(zone_id)
        if not zone_id.startswith("zone.") or not zone:
            raise _err("not_found", "That place isn't a zone in Home Assistant")
        due = int(data.get("due_ts") or 0)
        now = _now()
        if due < now + 60_000 or due > now + 2 * 86_400_000:
            raise _err("invalid_format", "Choose a time in the next two days")
        return {"person": person.entity_id, "zone": zone_id, "zone_name": zone.name, "due_ts": due,
                "status": "active", "started": now}

    def _checkin_targets(self: Messenger, thread: dict, msg: dict) -> list[str]:
        return [p for p in thread["participants"] if p not in (msg["sender"], HA_SENDER_ID)] or [msg["sender"]]

    def _arm_checkin(self: Messenger, thread: dict, msg: dict) -> None:
        ci = msg.get("checkin") or {}
        if ci.get("status") not in ("active", "late"):
            return
        key = f"ci_{msg['id']}"
        self._cancel_timer(key)
        self._cancel_timer(key + "_due")
        target = self.zone_state_name(ci["zone"])
        timers = self.__dict__.setdefault("_timers", {})

        # already there when it was started (or when Home Assistant restarted)?
        state = self.hass.states.get(ci["person"])
        if state and target and state.state == target and ci.get("status") == "active" and \
                _now() - ci.get("started", 0) > 120_000:
            self.hass.async_create_task(self._async_checkin_arrived(thread["id"], msg["id"]))
            return

        @callback
        def _moved(event: Event) -> None:
            new = event.data.get("new_state")
            if new and target and new.state == target:
                self.hass.async_create_task(self._async_checkin_arrived(thread["id"], msg["id"]))

        timers[key] = async_track_state_change_event(self.hass, [ci["person"]], _moved)
        if ci.get("status") == "active":
            @callback
            def _due(_now_dt) -> None:
                timers.pop(key + "_due", None)
                self.hass.async_create_task(self._async_checkin_late(thread["id"], msg["id"]))

            when = datetime.fromtimestamp(max(ci["due_ts"], _now() + 1000) / 1000, tz=timezone.utc)
            timers[key + "_due"] = async_track_point_in_utc_time(self.hass, _due, when)

    def _find(self: Messenger, thread_id: str, message_id: str) -> tuple[dict | None, dict | None]:
        thread = self.data["threads"].get(thread_id)
        msg = next((m for m in self.data["messages"].get(thread_id, []) if m["id"] == message_id), None) \
            if thread else None
        return thread, msg

    def _last_location(self: Messenger, person_id: str) -> dict:
        state = self.hass.states.get(person_id)
        if not state:
            return {}
        out = {"state": state.state, "ts": int(state.last_changed.timestamp() * 1000)}
        lat, lon = state.attributes.get("latitude"), state.attributes.get("longitude")
        if lat is not None and lon is not None:
            out.update({"lat": lat, "lon": lon})
        return out

    def _place_words(self: Messenger, loc: dict) -> str:
        state = loc.get("state")
        if state in (None, "unknown", "unavailable"):
            return "an unknown location"
        if state == "not_home":
            where = "Away"
        elif state == "home":
            where = "Home"
        else:
            where = state
        if loc.get("lat") is not None:
            where += f" ({loc['lat']:.4f}, {loc['lon']:.4f})"
        return where

    async def _async_checkin_arrived(self: Messenger, thread_id: str, message_id: str) -> None:
        thread, msg = self._find(thread_id, message_id)
        if not msg or (msg.get("checkin") or {}).get("status") not in ("active", "late"):
            return
        key = f"ci_{message_id}"
        self._cancel_timer(key)
        self._cancel_timer(key + "_due")
        ci = msg["checkin"]
        ci["status"] = "arrived"
        ci["ended"] = _now()
        users = await self.async_user_map()
        name = users.get(msg["sender"], {}).get("name", "Someone")
        self._save()
        self._push_update(thread, msg)
        self._system_message(thread, f"{name} arrived at {ci['zone_name']}.", msg["sender"])
        self._save()
        self._alert(thread, self._checkin_targets(thread, msg), "Check In",
                    f"{name} has arrived at {ci['zone_name']}.", tag=f"checkin_{message_id}")

    async def _async_checkin_late(self: Messenger, thread_id: str, message_id: str) -> None:
        thread, msg = self._find(thread_id, message_id)
        if not msg or (msg.get("checkin") or {}).get("status") != "active":
            return
        ci = msg["checkin"]
        ci["status"] = "late"
        ci["last"] = self._last_location(ci["person"])
        users = await self.async_user_map()
        name = users.get(msg["sender"], {}).get("name", "Someone")
        self._save()
        self._push_update(thread, msg)
        where = self._place_words(ci["last"])
        self._system_message(thread, f"{name} hasn't arrived at {ci['zone_name']} yet. Last location: {where}.",
                             msg["sender"])
        self._save()
        self._alert(thread, self._checkin_targets(thread, msg), "Check In",
                    f"{name} hasn't arrived at {ci['zone_name']} as expected. Last location: {where}.",
                    tag=f"checkin_{message_id}", urgent=True)
        # tell the person themselves too, so they can end it if all is well
        self._alert(thread, [msg["sender"]], "Check In",
                    f"You haven't arrived at {ci['zone_name']}. Your Check In contacts have been told.",
                    tag=f"checkin_self_{message_id}")
        self._arm_checkin(thread, msg)  # keeps watching for the arrival

    async def async_checkin_update(self: Messenger, uid: str, thread_id: str, message_id: str,
                                   end: bool = False, add_minutes: int = 0) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        ci = msg.get("checkin")
        if not ci or msg["sender"] != uid:
            raise _err("not_found", "Check In not found")
        if ci["status"] not in ("active", "late"):
            raise _err("invalid_format", "This Check In has already ended")
        users = await self.async_user_map()
        name = users.get(uid, {}).get("name", "Someone")
        if end:
            key = f"ci_{message_id}"
            self._cancel_timer(key)
            self._cancel_timer(key + "_due")
            ci["status"] = "ended"
            ci["ended"] = _now()
            self._system_message(thread, f"{name} ended their Check In.", uid)
        elif add_minutes:
            add = max(15, min(240, int(add_minutes)))
            ci["due_ts"] = max(ci["due_ts"], _now()) + add * 60_000
            ci["status"] = "active"
            ci.pop("last", None)
            self._arm_checkin(thread, msg)
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    async def async_create_zone(self: Messenger, is_admin: bool, data: dict) -> dict:
        """Add a zone to Home Assistant for someone using the card. Home Assistant's own
        zone/create is admin-only; this lets everyone add one unless an admin has turned
        "Everyone Can Add Zones" off. The zone is stored by Home Assistant exactly as if it
        had been made in Settings → Areas, labels & zones."""
        if not is_admin and not self._feature("zones"):
            raise _err("unauthorized", "Only a Home Assistant administrator can add zones")
        name = _str(data.get("name"), 100)
        if not name:
            raise _err("invalid", "Give the zone a name")
        if any(s.name.casefold() == name.casefold() for s in self.hass.states.async_all("zone")):
            raise _err("exists", f"There's already a zone called “{name}”")
        coll = _zone_collection(self.hass)
        if coll is None:
            raise _err("unavailable", "Home Assistant's zones aren't available")
        item = {"name": name, "latitude": float(data["latitude"]), "longitude": float(data["longitude"]),
                "radius": float(min(2000, max(10, data.get("radius") or 100))), "passive": False,
                "icon": data.get("icon") or "mdi:map-marker"}
        try:
            created = await coll.async_create_item(item)
        except Exception as err:  # noqa: BLE001 - Home Assistant's own validation message
            raise _err("invalid", str(err) or "Home Assistant couldn't add that zone") from err
        from homeassistant.helpers import entity_registry as er
        entity_id = er.async_get(self.hass).async_get_entity_id("zone", "zone", created.get("id", "")) or ""
        _LOGGER.info("Zone %s added from Crow Messenger", entity_id or name)
        return {"zone": {"entity_id": entity_id, "name": name, "lat": item["latitude"], "lon": item["longitude"], "town": ""}}

    def zones(self: Messenger) -> list[dict]:
        """The zones you can check in to, each with the town it's in: a Home Assistant label on
        the zone if it has one, else the town looked up from its position (once, and kept)."""
        from homeassistant.helpers import entity_registry as er, label_registry as lr

        ents, labels = er.async_get(self.hass), lr.async_get(self.hass)
        towns = self.data.get("zone_towns", {})
        out, missing = [], []
        for s in self.hass.states.async_all("zone"):
            if s.attributes.get("passive"):
                continue
            lat, lon = s.attributes.get("latitude"), s.attributes.get("longitude")
            town = ""
            entry = ents.async_get(s.entity_id)
            for label_id in sorted(entry.labels) if entry else ():
                label = labels.async_get_label(label_id)
                if label:
                    town = label.name
                    break
            if not town and lat is not None and lon is not None:
                key = _town_key(lat, lon)
                town = towns.get(key, "")
                if key not in towns:
                    missing.append((key, lat, lon))
            out.append({"entity_id": s.entity_id, "name": s.name, "lat": lat, "lon": lon, "town": town})
        if missing:
            self._start_town_lookup(missing)
        return out

    @callback
    def _start_town_lookup(self: Messenger, missing: list[tuple[str, float, float]]) -> None:
        if self.__dict__.get("_town_task") and not self.__dict__["_town_task"].done():
            return
        tried = self.__dict__.setdefault("_town_tried", {})
        now = time.monotonic()
        todo = [m for m in missing if now - tried.get(m[0], -1e9) > TOWN_RETRY]
        if todo:
            self.__dict__["_town_task"] = self.hass.async_create_task(self._async_lookup_towns(todo))

    async def _async_lookup_towns(self: Messenger, todo: list[tuple[str, float, float]]) -> None:
        """Which town each zone is in, from OpenStreetMap. Only the zones' own positions are
        sent, one a second as OpenStreetMap asks, and each answer is kept for good."""
        from homeassistant.helpers.aiohttp_client import async_get_clientsession

        session = async_get_clientsession(self.hass)
        tried = self.__dict__.setdefault("_town_tried", {})
        found = False
        for i, (key, lat, lon) in enumerate(todo):
            if i:
                await asyncio.sleep(1.1)
            tried[key] = time.monotonic()
            try:
                async with asyncio.timeout(10):
                    async with session.get(TOWN_LOOKUP, params={"format": "jsonv2", "lat": str(lat), "lon": str(lon), "zoom": "12",
                                                                "accept-language": self.hass.config.language or "en"},
                                           headers={"User-Agent": "CrowMessenger Home Assistant integration (zone towns)"}) as resp:
                        if resp.status != 200:
                            continue
                        data = await resp.json(content_type=None)
            except Exception:  # noqa: BLE001 - offline, blocked or a bad answer: the list just stays flat
                _LOGGER.debug("Couldn't look up the town for a zone", exc_info=True)
                continue
            addr = (data or {}).get("address") or {}
            town = next((addr[k] for k in ("town", "city", "village", "hamlet", "municipality", "suburb", "county") if addr.get(k)), "")
            self.data.setdefault("zone_towns", {})[key] = _str_town(town)
            found = True
        if found:
            self._save()
            self.broadcast_all({"type": "zone_towns"})

    # ── Starting things again after a restart ───────────────────────────────
    @callback
    def async_start_features(self: Messenger) -> None:
        self._sticker_store()
        for item in list(self.data.get("scheduled", [])):
            self._arm_scheduled(item)
        for tid, msgs in self.data["messages"].items():
            thread = self.data["threads"].get(tid)
            for msg in msgs:
                if thread and msg.get("type") == "checkin":
                    self._arm_checkin(thread, msg)
        self.async_start_play()
        self.async_start_organise()
        self.async_start_ring()

    @callback
    def async_stop_features(self: Messenger) -> None:
        for unsub in list(self.__dict__.get("_timers", {}).values()):
            unsub()
        self.__dict__["_timers"] = {}

    # ── Link previews ───────────────────────────────────────────────────────
    async def _async_safe_get(self: Messenger, url: str, limit: int, ua: str | None = None) -> tuple[str, str, bytes] | None:
        """GET a public web address. Private and local addresses are refused, so a
        message can't be used to make Home Assistant reach things on your network."""
        from homeassistant.helpers.aiohttp_client import async_get_clientsession

        session = async_get_clientsession(self.hass)
        for _ in range(4):
            parts = urlparse(url)
            if parts.scheme not in ("http", "https") or not parts.hostname:
                return None
            try:
                infos = await self.hass.loop.getaddrinfo(parts.hostname, parts.port or (443 if parts.scheme == "https" else 80),
                                                         type=socket.SOCK_STREAM)
            except OSError:
                return None
            if not infos or not all(_is_public_ip(i[4][0]) for i in infos):
                return None
            async with asyncio.timeout(LINK_TIMEOUT):
                async with session.get(url, allow_redirects=False, headers={
                    "User-Agent": ua or BOT_UA,
                    "Accept": "text/html,image/*;q=0.9,*/*;q=0.5",
                    "Accept-Language": self.hass.config.language or "en",
                }) as resp:
                    if resp.status in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
                        url = urljoin(url, resp.headers["Location"])
                        continue
                    if resp.status != 200:
                        _LOGGER.debug("Link preview for %s: the site answered %s", url, resp.status)
                        return None
                    if int(resp.headers.get("Content-Length") or 0) > limit:
                        return None
                    body = b""
                    async for chunk in resp.content.iter_chunked(65536):
                        body += chunk
                        if len(body) > limit:
                            if limit == LINK_MAX_HTML:
                                break  # the head is all that's needed
                            return None
                    return str(resp.url), resp.headers.get("Content-Type", ""), body
        return None

    def _link_safety(self: Messenger, thread: dict, msg: dict) -> None:
        """Link Safety (an AI feature): check a link someone shared (not Home Assistant's own)."""
        if msg.get("sender") == HA_SENDER_ID or msg.get("type", "text") != "text":
            return
        from . import linksafety
        url = linksafety.first_url(msg.get("text") or "")
        if url and linksafety.on(self):
            self.hass.async_create_task(linksafety.check_message(self.hass, self, thread["id"], msg["id"], url))

    async def _async_link_preview(self: Messenger, thread: dict, msg: dict, url: str) -> None:
        try:
            preview = await self._async_fetch_preview(url)
        except Exception as err:  # noqa: BLE001 - a preview is a nice-to-have
            _LOGGER.debug("Link preview for %s failed: %s", url, err)
            preview = None
        if not preview:
            return
        thread, current = self._find(thread["id"], msg["id"])
        if not current or URL_RE.search(current.get("text") or "") is None:
            return
        current["link"] = preview
        self._save()
        self._push_update(thread, current)

    async def _async_fetch_preview(self: Messenger, url: str) -> dict | None:
        """A link's title, site, description and picture. Asks as a browser first and, if the site
        refuses or gives nothing useful, again as a link-preview robot (the way Facebook asks)."""
        best = None
        for ua in (BROWSER_UA, BOT_UA):
            try:
                got = await self._async_preview_once(url, ua)
            except Exception as err:  # noqa: BLE001 - try the other way of asking
                _LOGGER.debug("Link preview for %s failed: %s", url, err)
                got = None
            if got and (got.get("image") or got.get("desc")):
                return got
            best = best or got
        if not best:
            _LOGGER.info("Crow Messenger couldn't make a link preview for %s (the site didn't answer, or "
                         "refused). Turn on debug logging for crow_messenger to see why.", url)
        return best

    async def _async_preview_once(self: Messenger, url: str, ua: str) -> dict | None:
        got = await self._async_safe_get(url, LINK_MAX_HTML, ua)
        if not got:
            return None
        final, ctype, body = got
        site = (urlparse(final).hostname or "").removeprefix("www.")
        preview: dict[str, Any] = {"url": url, "site": site}
        image_url = None
        if ctype.startswith("image/"):
            preview["image"] = await self.hass.async_add_executor_job(self._thumb_data_url, body)
            preview["title"] = os.path.basename(urlparse(final).path) or site
            return preview if preview.get("image") else None
        if "html" not in ctype and "xml" not in ctype:
            return {"url": url, "site": site, "title": os.path.basename(urlparse(final).path) or site}
        charset = "utf-8"
        m = re.search(r"charset=([\w-]+)", ctype)
        if m:
            charset = m.group(1)
        text = body.decode(charset, errors="replace")
        parser = _MetaParser()
        parser.feed(text)
        meta = parser.meta

        def pick(*keys: str) -> str:
            for k in keys:
                if meta.get(k):
                    return html_lib.unescape(meta[k]).strip()
            return ""

        preview["title"] = _short(pick("og:title", "twitter:title") or html_lib.unescape(parser.title).strip(), 200)
        preview["desc"] = _short(pick("og:description", "twitter:description", "description"), 300)
        preview["site"] = _short(pick("og:site_name") or site, 80)
        image_url = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src")
        if not preview["title"] and not image_url:
            return None
        if image_url:
            image_url = urljoin(final, image_url)
            try:
                got = await self._async_safe_get(image_url, LINK_MAX_IMAGE, ua)
                if got and got[1].startswith("image/"):
                    preview["image"] = await self.hass.async_add_executor_job(self._thumb_data_url, got[2])
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Link preview image %s failed: %s", image_url, err)
        return {k: v for k, v in preview.items() if v}

    @staticmethod
    def _thumb_data_url(data: bytes) -> str | None:
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(data))
            img.load()
            img.thumbnail((720, 720))
            if img.mode not in ("RGB", "L"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.convert("RGBA").split()[-1])
                img = bg
            out = io.BytesIO()
            img.save(out, "JPEG", quality=72, optimize=True)
            return "data:image/jpeg;base64," + base64.b64encode(out.getvalue()).decode()
        except Exception:  # noqa: BLE001 - not an image Pillow can read
            return None
