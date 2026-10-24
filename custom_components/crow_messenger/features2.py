"""More messaging features for Crow Messenger (WhatsApp, Messenger and Apple ideas).

Mixed into ``Messenger`` like features.py, and goes through the same privacy
checks (``_thread`` / ``_msg``), so people only ever act on what they can see.

* Location pins and Live Location from the person's Home Assistant ``person``
* Focus / Do Not Disturb from the Companion app, and Notify Anyway
* Forward, Star, pinned messages, a conversation's photos/links/files
* Message Info (who has read a message, and when)
* Shared checklists (optionally kept in step with a Home Assistant to-do list)
* Events with RSVP, contact cards
* Mute for a while, nicknames, quick reaction, reply privately, View Once
* Search by kind (photos, links, files) and jumping to a date
* Activity status ("Active now", "Active 5m ago")
"""
from __future__ import annotations

import logging
import os
import shutil
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from homeassistant.core import Context, Event, callback
from homeassistant.helpers.event import async_track_point_in_utc_time, async_track_state_change_event

from .const import HA_SENDER_ID

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

MAX_PINNED_MESSAGES = 3
MAX_STARRED = 2000
MAX_CHECKLIST_ITEMS = 100
LIVE_CHOICES = (0, 15, 60, 480)  # minutes; 0 = a single pin
MUTE_CHOICES = (60, 480, 10080, 0)  # minutes; 0 = always
RSVP = ("going", "maybe", "no")
NOT_FORWARDABLE = ("poll", "checkin", "checklist", "event", "call")
READ_LOG_KEEP = 200


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


def _now() -> int:
    return int(time.time() * 1000)


def _id() -> str:
    from .manager import new_id
    return new_id()


def _str(value: Any, n: int) -> str:
    return str(value or "").strip()[:n]


def _short(text: str, n: int = 80) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


class MoreFeaturesMixin:
    """Methods mixed into Messenger."""

    # ── extra fields in message and thread views ────────────────────────────
    def more_view(self: Messenger, msg: dict) -> dict:
        out: dict[str, Any] = {}
        for key in ("location", "checklist", "event", "contact", "forwarded"):
            if msg.get(key):
                out[key] = msg[key]
        if msg.get("view_once"):
            out["view_once"] = {"opened": list((msg["view_once"].get("opened") or {}).keys())}
        if msg.get("reply_static"):
            out["reply_preview"] = msg["reply_static"]
            out["reply_private"] = True
        return out

    def more_thread_view(self: Messenger, thread: dict, uid: str) -> dict:
        until = (thread.get("muted_until") or {}).get(uid)
        pins = []
        msgs = {m["id"]: m for m in self.data["messages"].get(thread["id"], [])}
        hidden = self._hidden(thread, uid)
        start = self._visible_from(thread, uid)
        for mid in thread.get("pinned_msgs", []):
            m = msgs.get(mid)
            if m and m["ts"] >= start and mid not in hidden:
                pins.append({"id": mid, "sender": m["sender"], "text": _short(self._preview_of(m), 120), "ts": m["ts"]})
        starred = {mid for tid, mid in self.data.get("starred", {}).get(uid, []) if tid == thread["id"]}
        return {
            "muted_until": until or None,
            "pinned_messages": pins,
            "starred": sorted(starred),
            "nicknames": dict(thread.get("nicknames") or {}),
            "quick": (self.data.get("quick", {}).get(uid) or {}).get(thread["id"]) or "",
        }

    # ── Mute for a while ────────────────────────────────────────────────────
    def is_muted(self: Messenger, thread: dict, uid: str) -> bool:
        if uid in thread.get("muted", []):
            return True
        until = (thread.get("muted_until") or {}).get(uid)
        return bool(until and until > _now())

    def set_mute(self: Messenger, uid: str, thread_id: str, minutes: int | None) -> dict:
        """minutes: None unmutes, 0 mutes always, otherwise for that long."""
        thread = self._thread(uid, thread_id)
        if minutes is not None and int(minutes) not in MUTE_CHOICES:
            raise _err("invalid_format", "Unsupported mute time")
        mlist = thread.setdefault("muted", [])
        until = thread.setdefault("muted_until", {})
        if uid in mlist:
            mlist.remove(uid)
        until.pop(uid, None)
        if minutes is not None:
            if int(minutes) == 0:
                mlist.append(uid)
            else:
                until[uid] = _now() + int(minutes) * 60_000
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        return self.thread_view(thread, uid)

    # ── Star ────────────────────────────────────────────────────────────────
    def set_star(self: Messenger, uid: str, thread_id: str, message_id: str, on: bool) -> dict:
        thread, _msg = self._msg(uid, thread_id, message_id)
        lst = self.data.setdefault("starred", {}).setdefault(uid, [])
        lst[:] = [x for x in lst if x != [thread_id, message_id]]
        if on:
            lst.insert(0, [thread_id, message_id])
            del lst[MAX_STARRED:]
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        return self.thread_view(thread, uid)

    def starred_for(self: Messenger, uid: str) -> list[dict]:
        out = []
        keep = []
        for tid, mid in self.data.get("starred", {}).get(uid, []):
            try:
                thread, msg = self._msg(uid, tid, mid)
            except Exception:  # noqa: BLE001 - gone, or no longer in that chat
                continue
            keep.append([tid, mid])
            out.append(self.message_view(msg, self._hidden(thread, uid)))
        if uid in self.data.get("starred", {}):
            self.data["starred"][uid] = keep
        return out

    # ── Pinned messages (shared with everyone in the chat) ──────────────────
    async def async_pin_message(self: Messenger, uid: str, thread_id: str, message_id: str, on: bool) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        pins = thread.setdefault("pinned_msgs", [])
        users = await self.async_user_map()
        name = users.get(uid, {}).get("name", "Someone")
        if on and message_id not in pins:
            pins.insert(0, message_id)
            del pins[MAX_PINNED_MESSAGES:]
            self._system_message(thread, f"{name} pinned a message.", uid)
        elif not on and message_id in pins:
            pins.remove(message_id)
            self._system_message(thread, f"{name} unpinned a message.", uid)
        self._save()
        self._broadcast_thread(thread)
        return self.thread_view(thread, uid)

    # ── Nicknames (shared with everyone in the chat) ────────────────────────
    async def async_set_nickname(self: Messenger, uid: str, thread_id: str, user_id: str, name: str) -> dict:
        thread = self._thread(uid, thread_id)
        if user_id not in thread["participants"] or user_id == HA_SENDER_ID:
            raise _err("not_found", "That person isn't in this conversation")
        name = _str(name, 40)
        nicks = thread.setdefault("nicknames", {})
        if nicks.get(user_id, "") == name:
            return self.thread_view(thread, uid)
        users = await self.async_user_map()
        actor = users.get(uid, {}).get("name", "Someone")
        whose = "their own" if user_id == uid else f"{users.get(user_id, {}).get('name', 'someone')}’s"
        if name:
            nicks[user_id] = name
            self._system_message(thread, f"{actor} set {whose} nickname to “{name}”.", uid)
        else:
            nicks.pop(user_id, None)
            self._system_message(thread, f"{actor} cleared {whose} nickname.", uid)
        self._save()
        self._broadcast_thread(thread)
        return self.thread_view(thread, uid)

    # ── Quick reaction button (your own, per chat) ──────────────────────────
    def set_quick(self: Messenger, uid: str, thread_id: str, emoji: str) -> dict:
        thread = self._thread(uid, thread_id)
        quick = self.data.setdefault("quick", {}).setdefault(uid, {})
        emoji = _str(emoji, 24)
        if emoji:
            quick[thread_id] = emoji
        else:
            quick.pop(thread_id, None)
        self._save()
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})
        return self.thread_view(thread, uid)

    # ── Share Device: devices hidden from the list for the whole household ──
    def share_hidden(self: Messenger) -> list[str]:
        return list(self.data.get("share_hidden", []))

    def set_share_hidden(self: Messenger, uid: str, entity_id: str, hidden: bool) -> dict:
        entity_id = _str(entity_id, 255)
        if not entity_id or "." not in entity_id:
            raise _err("invalid_format", "Not a device")
        items = self.data.setdefault("share_hidden", [])
        if hidden and entity_id not in items:
            items.append(entity_id)
        elif not hidden and entity_id in items:
            items.remove(entity_id)
        self._save()
        self.broadcast_all({"type": "share_hidden", "items": list(items)})
        return {"items": list(items)}

    # ── Message Info ────────────────────────────────────────────────────────
    def note_read_time(self: Messenger, thread: dict, uid: str, upto: int) -> None:
        log = thread.setdefault("read_log", {}).setdefault(uid, [])
        if log and log[-1][0] >= upto:
            return
        log.append([upto, _now()])
        del log[:-READ_LOG_KEEP]

    def message_info(self: Messenger, uid: str, thread_id: str, message_id: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        if msg["sender"] != uid:
            raise _err("not_found", "Message Info is only for your own messages")
        read, waiting = [], []
        for p in thread["participants"]:
            if p in (uid, HA_SENDER_ID) or msg["ts"] < self._visible_from(thread, p):
                continue
            if thread["read"].get(p, 0) >= msg["ts"]:
                at = next((t for upto, t in thread.get("read_log", {}).get(p, []) if upto >= msg["ts"]), None)
                read.append({"user_id": p, "at": at})
            else:
                waiting.append(p)
        return {"read": read, "delivered": waiting}

    # ── Search by kind, a conversation's media, jumping to a date ───────────
    def search_more(self: Messenger, uid: str, query: str, kind: str | None = None,
                    thread_id: str | None = None, limit: int = 100) -> list[dict]:
        words = [w for w in (query or "").lower().split() if w]
        if not words and not kind:
            return []
        hits = []
        for thread in self.data["threads"].values():
            if uid not in thread["participants"] or (thread_id and thread["id"] != thread_id):
                continue
            hidden = self._hidden(thread, uid)
            for msg in self._visible_messages(thread, uid):
                if msg.get("type") == "system" or not self._kind_match(msg, kind, hidden):
                    continue
                text = (msg.get("text") or "").lower()
                names = " ".join(self.data["attachments"].get(a, {}).get("name", "") for a in msg.get("attachments", [])).lower()
                link = " ".join(str((msg.get("link") or {}).get(k, "")) for k in ("title", "site", "url")).lower()
                if all(w in text or w in names or w in link for w in words):
                    hits.append(self.message_view(msg, hidden))
        hits.sort(key=lambda m: m["ts"], reverse=True)
        return hits[:limit]

    def _kind_match(self: Messenger, msg: dict, kind: str | None, hidden: set) -> bool:
        if not kind:
            return True
        atts = [self.data["attachments"].get(a) or {} for a in msg.get("attachments", []) if a not in hidden]
        atts = [a for a in atts if not a.get("removed")]
        if kind == "photos":
            return any((a.get("mime") or "").startswith(("image/", "video/")) for a in atts) and not msg.get("view_once")
        if kind == "files":
            return any(not (a.get("mime") or "").startswith(("image/", "video/", "audio/")) for a in atts)
        if kind == "links":
            from .features import URL_RE
            return bool(msg.get("link") or URL_RE.search(msg.get("text") or ""))
        if kind == "locations":
            return msg.get("type") == "location"
        return False

    def media_for(self: Messenger, uid: str, thread_id: str) -> dict:
        thread = self._thread(uid, thread_id)
        hidden = self._hidden(thread, uid)
        photos, files, links = [], [], []
        from .features import URL_RE
        for msg in reversed(self._visible_messages(thread, uid)):
            if msg.get("type") == "system":
                continue
            for aid in msg.get("attachments", []):
                att = self.data["attachments"].get(aid)
                if not att or aid in hidden or att.get("removed"):
                    continue
                item = {"message_id": msg["id"], "sender": msg["sender"], "ts": msg["ts"],
                        **{k: att.get(k) for k in ("id", "name", "mime", "size", "width", "height", "duration")},
                        "has_thumb": bool(att.get("thumb"))}
                mime = att.get("mime") or ""
                if mime.startswith(("image/", "video/")):
                    if not msg.get("view_once"):
                        photos.append(item)
                else:
                    files.append(item)
            text = msg.get("text") or ""
            if msg.get("link") or URL_RE.search(text):
                link = dict(msg.get("link") or {})
                link.setdefault("url", URL_RE.search(text).group(0) if URL_RE.search(text) else "")
                links.append({"message_id": msg["id"], "sender": msg["sender"], "ts": msg["ts"], **link})
        return {"photos": photos[:500], "files": files[:300], "links": links[:300]}

    def messages_since(self: Messenger, uid: str, thread_id: str, since: int) -> dict:
        thread = self._thread(uid, thread_id)
        msgs = self._visible_messages(thread, uid)
        page = [m for m in msgs if m["ts"] >= since][-2000:]
        return {
            "thread": self.thread_view(thread, uid),
            "messages": [self.message_view(m, self._hidden(thread, uid)) for m in page],
            "more": len(msgs) > len(page),
        }

    # ── Forward ─────────────────────────────────────────────────────────────
    async def async_forward(self: Messenger, uid: str, thread_id: str, message_id: str, to: list[str]) -> list[dict]:
        thread, msg = self._msg(uid, thread_id, message_id)
        if msg.get("type") in NOT_FORWARDABLE or msg.get("type") == "system":
            raise _err("invalid_format", "This kind of message can’t be forwarded")
        if msg.get("view_once"):
            raise _err("invalid_format", "View Once photos can’t be forwarded")
        hidden = self._hidden(thread, uid)
        text = "" if f"{msg['id']}:text" in hidden else msg.get("text", "")
        sent = []
        for target in list(dict.fromkeys(to))[:20]:
            self._thread(uid, target)
            att_ids = []
            for aid in msg.get("attachments", []):
                att = self.data["attachments"].get(aid)
                if not att or aid in hidden or att.get("removed") or not att.get("file"):
                    continue
                att_ids.append(await self._async_copy_attachment(uid, target, att))
            extra: dict[str, Any] = {"forwarded": True}
            for key in ("spans", "sticker", "entity", "contact"):
                if msg.get(key):
                    extra[key] = msg[key]
            if msg.get("type") in ("sticker", "entity", "contact", "location"):
                extra["type"] = msg["type"]
            if msg.get("type") == "location":
                loc = {k: v for k, v in msg["location"].items() if k in ("lat", "lon", "label", "accuracy")}
                extra["location_static"] = loc
            sent.append(await self.async_send(uid, target, text, att_ids, extra=extra))
        return sent

    async def _async_copy_attachment(self: Messenger, uid: str, thread_id: str, att: dict) -> str:
        aid = _id()

        def _copy() -> tuple[str, str | None]:
            src = self.attachment_path(att)
            name = f"{aid}_{os.path.basename(att['file']).split('_', 1)[-1]}"
            shutil.copyfile(src, os.path.join(self.media_dir, name))
            thumb = None
            if att.get("thumb") and os.path.exists(self.attachment_path(att, True)):
                thumb = f"{aid}_thumb.jpg"
                shutil.copyfile(self.attachment_path(att, True), os.path.join(self.media_dir, thumb))
            return name, thumb

        try:
            file_name, thumb = await self.hass.async_add_executor_job(_copy)
        except OSError as err:
            raise _err("not_found", "That attachment is no longer on the server") from err
        self.register_upload(uid, thread_id, {"id": aid, "file": file_name, "thumb": thumb,
                                              **{k: att.get(k) for k in ("name", "mime", "size", "width", "height", "duration")}})
        return aid

    # ── Checking the extras sent with a message ─────────────────────────────
    async def async_check_more(self: Messenger, uid: str, thread: dict, text: str, extra: dict,
                               attachment_ids: list[str]) -> dict:
        out: dict[str, Any] = {}
        kind = extra.get("type") or "text"
        if extra.get("forwarded"):
            out["forwarded"] = True
        if extra.get("reply_ext"):
            ref = extra["reply_ext"]
            othread, omsg = self._msg(uid, str(ref.get("thread_id")), str(ref.get("message_id")))
            if othread["id"] == thread["id"]:
                out["reply_to"] = omsg["id"]
            else:
                if omsg["sender"] not in thread["participants"]:
                    raise _err("invalid_format", "You can only reply privately to the person who sent it")
                out["reply_static"] = {"sender": omsg["sender"], "text": _short(self._preview_of(omsg), 140),
                                       "ts": omsg["ts"], "from": othread.get("name") or "a group"}
        if extra.get("view_once"):
            atts = [self.data["attachments"].get(a) or {} for a in attachment_ids]
            if not atts or not all((a.get("mime") or "").startswith(("image/", "video/")) for a in atts):
                raise _err("invalid_format", "View Once is for photos and videos")
            out["view_once"] = {"opened": {}}
        if kind == "location":
            out["location"] = self._check_location(uid, extra)
        elif kind == "checklist":
            items = [_str(i, 200) for i in (extra.get("checklist") or {}).get("items", [])]
            items = [i for i in items if i][:MAX_CHECKLIST_ITEMS]
            if not text:
                raise _err("invalid_format", "A checklist needs a title")
            todo = _str((extra.get("checklist") or {}).get("todo_entity"), 255)
            if todo and (not todo.startswith("todo.") or not self.hass.states.get(todo)):
                raise _err("not_found", "That to-do list isn't in Home Assistant")
            out["checklist"] = {"items": [{"id": _id()[:8], "text": i, "done": False, "by": uid} for i in items],
                                **({"todo_entity": todo} if todo else {})}
        elif kind == "event":
            ev = extra.get("event") or {}
            start = int(ev.get("start") or 0)
            end = int(ev.get("end") or 0) or None
            if not text or not start:
                raise _err("invalid_format", "An event needs a title and a start time")
            if end and end < start:
                raise _err("invalid_format", "The event ends before it starts")
            out["event"] = {"start": start, "end": end, "all_day": bool(ev.get("all_day")),
                            "location": _str(ev.get("location"), 200), "rsvp": {uid: "going"}}
            # a zone chosen for the place: the event card can open it in Maps and check in to it
            zone = _str(ev.get("zone"), 255)
            if zone:
                if not zone.startswith("zone.") or not self.hass.states.get(zone):
                    raise _err("not_found", "That place isn't a zone in Home Assistant")
                out["event"]["zone"] = zone
        elif kind == "contact":
            c = extra.get("contact") or {}
            card = {"first": _str(c.get("first"), 80), "last": _str(c.get("last"), 80), "company": _str(c.get("company"), 120)}
            for key in ("phones", "emails"):
                card[key] = [{"label": _str(x.get("label"), 30), "value": _str(x.get("value"), 120)}
                             for x in (c.get(key) or [])[:10] if isinstance(x, dict) and x.get("value")]
            photo = c.get("photo")
            if photo and str(photo).startswith("data:image/") and len(photo) < 200_000:
                card["photo"] = photo
            if c.get("ha_user"):
                card["ha_user"] = _str(c.get("ha_user"), 64)
            if not (card["first"] or card["last"] or card["company"]):
                raise _err("invalid_format", "The contact has no name")
            out["contact"] = card
        return out

    # ── Location and Live Location ──────────────────────────────────────────
    def _check_location(self: Messenger, uid: str, extra: dict) -> dict:
        loc = extra.get("location") or {}
        if extra.get("location_static"):
            s = extra["location_static"]
            return {"lat": float(s["lat"]), "lon": float(s["lon"]), "label": _str(s.get("label"), 120),
                    "accuracy": s.get("accuracy"), "ts": _now()}
        live = int(loc.get("live_minutes") or 0)
        if live not in LIVE_CHOICES:
            raise _err("invalid_format", "Unsupported Live Location time")
        person = self.person_for(uid)
        if loc.get("lat") is not None and loc.get("lon") is not None and not live:
            # a place picked on the phone (its own GPS), not the Home Assistant person
            lat, lon = float(loc["lat"]), float(loc["lon"])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise _err("invalid_format", "That isn't a place on Earth")
            return {"lat": lat, "lon": lon, "label": _str(loc.get("label"), 120),
                    "accuracy": loc.get("accuracy"), "source": "phone", "ts": _now()}
        if not person or person.attributes.get("latitude") is None:
            raise _err("invalid_format", "Your Home Assistant person has no location to share")
        out = {"lat": person.attributes["latitude"], "lon": person.attributes["longitude"],
               "accuracy": person.attributes.get("gps_accuracy"), "label": self._zone_label(person.state),
               "person": person.entity_id, "source": "ha", "ts": _now()}
        if live:
            out["live_until"] = _now() + live * 60_000
        return out

    def _zone_label(self: Messenger, state: str) -> str:
        if state == "home":
            zone = self.hass.states.get("zone.home")
            return zone.name if zone else "Home"
        if state in ("not_home", "unknown", "unavailable", None):
            return ""
        return state

    @callback
    def _arm_live(self: Messenger, thread: dict, msg: dict) -> None:
        loc = msg.get("location") or {}
        if not loc.get("live_until") or loc.get("stopped") or loc["live_until"] <= _now() or not loc.get("person"):
            return
        key = f"live_{msg['id']}"
        self._cancel_timer(key)
        self._cancel_timer(key + "_end")
        timers = self.__dict__.setdefault("_timers", {})
        tid, mid = thread["id"], msg["id"]

        @callback
        def _moved(event: Event) -> None:
            new = event.data.get("new_state")
            t, m = self._find(tid, mid)
            if not m or not new or new.attributes.get("latitude") is None:
                return
            loc = m["location"]
            loc.update({"lat": new.attributes["latitude"], "lon": new.attributes["longitude"],
                        "accuracy": new.attributes.get("gps_accuracy"), "label": self._zone_label(new.state), "ts": _now()})
            self._save()
            self._push_update(t, m)

        @callback
        def _end(_now_dt) -> None:
            timers.pop(key + "_end", None)
            self._cancel_timer(key)
            t, m = self._find(tid, mid)
            if m:
                self._save()
                self._push_update(t, m)

        timers[key] = async_track_state_change_event(self.hass, [loc["person"]], _moved)
        timers[key + "_end"] = async_track_point_in_utc_time(
            self.hass, _end, datetime.fromtimestamp(loc["live_until"] / 1000, tz=timezone.utc))

    def stop_live(self: Messenger, uid: str, thread_id: str, message_id: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        loc = msg.get("location") or {}
        if msg["sender"] != uid or not loc.get("live_until"):
            raise _err("not_found", "Live Location not found")
        loc["stopped"] = _now()
        loc["live_until"] = min(loc["live_until"], _now())
        key = f"live_{message_id}"
        self._cancel_timer(key)
        self._cancel_timer(key + "_end")
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Checklists ──────────────────────────────────────────────────────────
    async def async_checklist(self: Messenger, uid: str, thread_id: str, message_id: str, op: str,
                              item_id: str | None = None, text: str | None = None) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        cl = msg.get("checklist")
        if not cl:
            raise _err("not_found", "Checklist not found")
        item = next((i for i in cl["items"] if i["id"] == item_id), None) if item_id else None
        todo = cl.get("todo_entity")
        if op == "toggle" and item:
            item["done"] = not item["done"]
            item["done_by"] = uid if item["done"] else None
            if todo:
                await self._todo_call("update_item", todo, uid, item=item["text"],
                                      status="completed" if item["done"] else "needs_action")
        elif op == "add":
            text = _str(text, 200)
            if not text:
                raise _err("invalid_format", "Type something to add")
            if len(cl["items"]) >= MAX_CHECKLIST_ITEMS:
                raise _err("invalid_format", "The checklist is full")
            cl["items"].append({"id": _id()[:8], "text": text, "done": False, "by": uid})
            if todo:
                await self._todo_call("add_item", todo, uid, item=text)
        elif op == "remove" and item:
            cl["items"].remove(item)
            if todo:
                await self._todo_call("remove_item", todo, uid, item=item["text"])
        else:
            raise _err("not_found", "Item not found")
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    async def _todo_call(self: Messenger, service: str, entity: str, uid: str, **data: Any) -> None:
        cl_key = f"todo_quiet_{entity}"
        self.__dict__[cl_key] = _now()  # our own change: don't read it back straight away
        try:
            await self.hass.services.async_call("todo", service, {"entity_id": entity, **data},
                                                blocking=True, context=Context(user_id=uid))
        except Exception as err:  # noqa: BLE001 - the list may not have that item any more
            _LOGGER.debug("Crow Messenger to-do %s on %s failed: %s", service, entity, err)

    async def async_todo_sync_out(self: Messenger, msg: dict, uid: str) -> None:
        cl = msg.get("checklist") or {}
        for item in cl.get("items", []):
            await self._todo_call("add_item", cl["todo_entity"], uid, item=item["text"])

    @callback
    def _arm_todo(self: Messenger, thread: dict, msg: dict) -> None:
        todo = (msg.get("checklist") or {}).get("todo_entity")
        if not todo:
            return
        key = f"todo_{msg['id']}"
        self._cancel_timer(key)
        tid, mid = thread["id"], msg["id"]

        @callback
        def _changed(event: Event) -> None:
            if _now() - self.__dict__.get(f"todo_quiet_{todo}", 0) < 3000:
                return
            self.hass.async_create_task(self._async_todo_sync_in(tid, mid, todo))

        self.__dict__.setdefault("_timers", {})[key] = async_track_state_change_event(self.hass, [todo], _changed)

    async def _async_todo_sync_in(self: Messenger, tid: str, mid: str, todo: str) -> None:
        """Ticks and new items made in the Home Assistant to-do list show in the chat too."""
        try:
            resp = await self.hass.services.async_call("todo", "get_items", {"entity_id": todo},
                                                       blocking=True, return_response=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger could not read %s: %s", todo, err)
            return
        items = ((resp or {}).get(todo) or {}).get("items", [])
        thread, msg = self._find(tid, mid)
        if not msg:
            return
        cl = msg["checklist"]
        by_text = {i["text"].lower(): i for i in cl["items"]}
        changed = False
        for it in items:
            summary = str(it.get("summary") or "").strip()
            if not summary:
                continue
            done = it.get("status") == "completed"
            mine = by_text.get(summary.lower())
            if mine and mine["done"] != done:
                mine["done"] = done
                changed = True
            elif not mine and len(cl["items"]) < MAX_CHECKLIST_ITEMS:
                cl["items"].append({"id": _id()[:8], "text": summary[:200], "done": done, "by": HA_SENDER_ID})
                changed = True
        if changed:
            self._save()
            self._push_update(thread, msg)

    # ── Events with RSVP ────────────────────────────────────────────────────
    async def rsvp(self: Messenger, uid: str, thread_id: str, message_id: str, answer: str | None) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        ev = msg.get("event")
        if not ev:
            raise _err("not_found", "Event not found")
        if answer and answer not in RSVP:
            raise _err("invalid_format", "Unknown answer")
        before = ev["rsvp"].get(uid)
        if answer:
            ev["rsvp"][uid] = answer
        else:
            ev["rsvp"].pop(uid, None)
        if answer != before:
            name = (await self.async_user_map()).get(uid, {}).get("name", "Someone")
            self._rsvp_note(thread, msg, uid, answer, name)
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    def _rsvp_note(self: Messenger, thread: dict, msg: dict, uid: str, answer: str | None, name: str) -> None:
        """One grey line per person for their answer ("person2 is going to Dinner"): a new answer
        replaces their old line, and the person who made the event is told."""
        ev = msg["event"]
        notes = ev.setdefault("notes", {})
        old_id = notes.pop(uid, None)
        if old_id:
            box = self.data["messages"].get(thread["id"], [])
            self.data["messages"][thread["id"]] = [m for m in box if m["id"] != old_id]
            self._tidy_hidden(thread)
            self._broadcast_thread(thread, {"reload": True})
        if not answer:
            return
        title = msg.get("text") or "the event"
        words = {"going": f"is going to {title}", "maybe": f"might go to {title}", "no": f"can’t go to {title}"}[answer]
        note = self._system_message(thread, f"{name} {words}", uid, note="rsvp", at=_now(), event_id=msg["id"])
        notes[uid] = note["id"]
        if msg["sender"] != uid and msg["sender"] != HA_SENDER_ID:
            self._alert(thread, [msg["sender"]], title, f"{name} {words.split(' to ')[0]}.", tag=f"rsvp_{msg['id']}")

    # ── View Once ───────────────────────────────────────────────────────────
    def view_once_blocked(self: Messenger, msg: dict, uid: str) -> bool:
        vo = msg.get("view_once")
        return bool(vo) and msg["sender"] != uid and uid in (vo.get("opened") or {})

    async def async_view_once_opened(self: Messenger, uid: str, thread_id: str, message_id: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        vo = msg.get("view_once")
        if not vo or msg["sender"] == uid:
            raise _err("not_found", "Message not found")
        vo.setdefault("opened", {})[uid] = _now()
        readers = [p for p in thread["participants"] if p not in (msg["sender"], HA_SENDER_ID)]
        if all(p in vo["opened"] for p in readers):
            # everyone has seen it: the photo is deleted from the server
            for aid in list(msg.get("attachments", [])):
                att = self.data["attachments"].get(aid)
                if att and not att.get("removed"):
                    await self._async_take_off_server(att)
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Focus / Do Not Disturb (from the Companion app) ─────────────────────
    def focus_entities(self: Messenger) -> dict[str, list[str]]:
        """Each person's Focus (iPhone) and Do Not Disturb (Android) sensors."""
        from homeassistant.helpers import entity_registry as er
        reg = er.async_get(self.hass)
        out: dict[str, list[str]] = {}
        for entry in self.hass.config_entries.async_entries("mobile_app"):
            uid = entry.data.get("user_id")
            if not uid:
                continue
            for ent in er.async_entries_for_config_entry(reg, entry.entry_id):
                eid = ent.entity_id
                if (eid.startswith("binary_sensor.") and eid.endswith("_focus")) or \
                        (eid.startswith("sensor.") and "do_not_disturb" in eid):
                    out.setdefault(uid, []).append(eid)
        return out

    def in_focus(self: Messenger, uid: str) -> bool:
        for eid in self.focus_entities().get(uid, []):
            st = self.hass.states.get(eid)
            if not st:
                continue
            if eid.startswith("binary_sensor.") and st.state == "on":
                return True
            if eid.startswith("sensor.") and st.state not in ("off", "unknown", "unavailable", ""):
                return True
        return False

    async def async_notify_anyway(self: Messenger, uid: str, thread_id: str) -> None:
        thread = self._thread(uid, thread_id)
        users = await self.async_user_map()
        name = users.get(uid, {}).get("name", "Someone")
        mine = [m for m in self.data["messages"].get(thread_id, []) if m["sender"] == uid and m.get("type") != "system"]
        body = _short(self._preview_of(mine[-1]), 160) if mine else "Wants to reach you"
        others = [p for p in thread["participants"] if p not in (uid, HA_SENDER_ID)]
        self._alert(thread, others, f"{name} (Notify Anyway)", body, urgent=True, tag="anyway")
        self._system_message(thread, f"{name} used Notify Anyway.", uid)
        self._save()

    # ── Activity status ─────────────────────────────────────────────────────
    def note_active(self: Messenger, uid: str) -> None:
        last = self.__dict__.setdefault("_last_active", {})
        was = self.is_online(uid)
        last[uid] = _now()
        if not was and self.is_online(uid):
            self._presence_changed(uid)

    def is_online(self: Messenger, uid: str) -> bool:
        return any(s.uid == uid and s.visible for s in self._subs.values())

    def presence_for(self: Messenger, uid: str) -> dict | None:
        if self.profile_for(uid).get("activity") is False:
            return None
        last = self.__dict__.get("_last_active", {}).get(uid) or self.data.get("last_active", {}).get(uid)
        return {"online": self.is_online(uid), "last": last}

    def presence_all(self: Messenger, viewer: str) -> dict:
        # someone who hides their own activity doesn't see other people's either (like WhatsApp)
        if self.profile_for(viewer).get("activity") is False:
            return {}
        out = {}
        for u in {s.uid for s in self._subs.values()} | set(self.__dict__.get("_last_active", {})) | set(self.data.get("last_active", {})):
            p = self.presence_for(u)
            if p:
                out[u] = p
        return out

    @callback
    def _presence_changed(self: Messenger, uid: str) -> None:
        self.data.setdefault("last_active", {})[uid] = self.__dict__.get("_last_active", {}).get(uid, _now())
        self._save()
        self.entities.changed(uid)  # their Active Now sensor
        p = self.presence_for(uid)
        for sub_uid in {s.uid for s in self._subs.values()}:
            if sub_uid != uid and self.profile_for(sub_uid).get("activity") is not False:
                self._send_to(sub_uid, {"type": "presence", "user_id": uid, "presence": p})

    # ── after a message is sent / at start ──────────────────────────────────
    @callback
    def after_send_more(self: Messenger, thread: dict, msg: dict) -> None:
        if msg.get("type") == "location":
            self._arm_live(thread, msg)
        if msg.get("type") == "checklist" and (msg.get("checklist") or {}).get("todo_entity"):
            self.hass.async_create_task(self.async_todo_sync_out(msg, msg["sender"]))
            self._arm_todo(thread, msg)

    @callback
    def async_start_more(self: Messenger) -> None:
        for tid, msgs in self.data["messages"].items():
            thread = self.data["threads"].get(tid)
            if not thread:
                continue
            for msg in msgs:
                if msg.get("type") == "location":
                    self._arm_live(thread, msg)
                elif msg.get("type") == "checklist":
                    self._arm_todo(thread, msg)
