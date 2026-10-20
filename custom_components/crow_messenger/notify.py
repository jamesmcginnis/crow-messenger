"""Phone notifications for Crow Messenger (Home Assistant Companion app).

Each Companion app install is a `mobile_app` config entry that records the
Home Assistant user who signed in on it, its device name and its platform.
That is how a message to "Sarah" reaches only Sarah's phones, and how each
phone gets the payload format its platform understands.
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import slugify

from .const import ACTION_PREFIX, ANDROID_CHANNEL, ANDROID_CHANNEL_SILENT, HA_SENDER_ID
from .manager import Messenger, now_ms

_LOGGER = logging.getLogger(__name__)

REPLY_ACTION_PREFIX = "CROW_REPLY_"
TAG_PREFIX = "crow_"


def mobile_devices(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Every Companion app install with its owner and notify action."""
    out = []
    for entry in hass.config_entries.async_entries("mobile_app"):
        data = entry.data
        name = data.get("device_name") or entry.title or ""
        service = f"mobile_app_{slugify(name)}"
        os_name = str(data.get("os_name") or "").lower()
        platform = "ios" if os_name in ("ios", "ipados", "macos", "watchos", "visionos") or "apple" in str(
            data.get("manufacturer", "")).lower() else "android"
        out.append({
            "service": service,
            "name": name,
            "user_id": data.get("user_id"),
            "platform": platform,
            "os_name": data.get("os_name") or "",
            "model": data.get("model") or "",
            "available": hass.services.has_service("notify", service),
        })
    return out


def devices_for_user(hass: HomeAssistant, messenger: Messenger, uid: str) -> list[dict]:
    chosen = (messenger.settings.get("users", {}).get(uid, {}) or {}).get("devices", {}) or {}
    return [d for d in mobile_devices(hass)
            if d["user_id"] == uid and d["available"] and chosen.get(d["service"], True)]


def dashboard_link(messenger: Messenger, uid: str, thread_id: str) -> str:
    """The dashboard chosen for this person in the editor, or - when it's left
    on Automatic - wherever they last opened the card."""
    everyone = messenger.settings.get("dashboard", {}) or {}
    cfg = messenger.settings.get("users", {}).get(uid, {}) or {}
    if everyone.get("everyone") and str(everyone.get("path") or "").strip("/ "):
        # one dashboard for everyone, chosen in the editor
        path = "/" + str(everyone["path"]).split("?")[0].strip().strip("/")
    elif cfg.get("path"):
        path = "/" + str(cfg["path"]).split("?")[0].strip().strip("/")
    elif cfg.get("dashboard"):
        dashboard = cfg["dashboard"].strip("/")
        view = str(cfg.get("view") if cfg.get("view") not in (None, "") else "0").strip("/")
        path = f"/{dashboard}/{view}"
    else:
        path = messenger.data.get("auto_paths", {}).get(uid) or "/lovelace/0"
    return f"{path}?crow_thread={thread_id}"


def _attachment_label(att: dict) -> str:
    mime = att.get("mime") or ""
    if mime.startswith("image/"):
        return "📷 Photo"
    if mime.startswith("video/"):
        return "🎥 Video"
    if mime.startswith("audio/"):
        return "🎤 Audio Message"
    return f"📎 {att.get('name') or 'Attachment'}"


def thread_title(thread: dict, users: dict, for_uid: str) -> str:
    if thread.get("name"):
        return thread["name"]
    others = [users.get(p, {}).get("name", "") for p in thread["participants"] if p != for_uid]
    others = [o.split(" ")[0] if len(others) > 1 else o for o in others if o]
    if len(others) <= 3:
        return " & ".join(others) if len(others) == 2 else ", ".join(others)
    return f"{', '.join(others[:2])} & {len(others) - 2} others"


async def async_push(hass: HomeAssistant, messenger: Messenger, thread: dict, msg: dict, users: dict) -> None:
    """Send the phone notifications for one new message."""
    settings = messenger.settings.get("notifications", {})
    if not settings.get("enabled", True):
        return
    sender = users.get(msg["sender"], {}).get("name", "Someone")
    atts = [messenger.data["attachments"].get(a) for a in msg.get("attachments", [])]
    atts = [a for a in atts if a]
    first = atts[0] if atts else None

    kind = msg.get("type", "text")
    if not settings.get("show_text", True):
        body = "New message"
    elif kind != "text":
        body = messenger._preview_of(msg)
        if kind == "checkin":
            ci = msg.get("checkin") or {}
            body = f"📍 Check In: {sender} will let you know when they get to {ci.get('zone_name', 'Home')}."
        elif kind == "sticker":
            body = f"Sent a sticker {body}" if body != "Sticker" else "Sent a sticker"
        elif kind == "call":
            word = {"facetime": "is FaceTiming you", "facetime_audio": "is FaceTime Audio calling you"}.get(
                (msg.get("call") or {}).get("kind"), "is calling you")
            body = f"{sender} {word}"
        elif kind == "entity" and msg.get("text"):
            body = f"{body} — {msg['text']}"
    elif msg.get("view_once"):
        body = "📷 View Once"
        first = None
    elif msg.get("effect") == "invisible":
        body = "Sent with Invisible Ink"
    elif msg.get("text"):
        body = msg["text"]
    elif first:
        body = _attachment_label(first) if len(atts) == 1 else f"{len(atts)} attachments"
    else:
        body = "New message"

    # In a chat with yourself you're notified of your own messages, so notifications can be tested
    self_chat = len(thread["participants"]) == 1
    # a call started from the card gets through Hide Alerts and Focus, like a ringing phone
    ringing = kind == "call" and settings.get("call_alerts", True)
    for uid in thread["participants"]:
        if uid == HA_SENDER_ID or (uid == msg["sender"] and not self_chat):
            continue
        # @mentions reach people even when they've hidden alerts for the chat
        mentioned = uid in (msg.get("mentions") or [])
        if messenger.is_muted(thread, uid) and not mentioned and not ringing:
            continue
        ucfg = messenger.settings.get("users", {}).get(uid, {}) or {}
        if ucfg.get("notify") is False:
            continue
        if messenger.is_watching(uid, thread["id"]) and not self_chat:
            continue
        devices = devices_for_user(hass, messenger, uid)
        if not devices:
            continue
        group_title = thread_title(thread, users, uid) if thread["is_group"] else ""
        title = group_title or sender
        if mentioned and group_title:
            title = f"{sender} mentioned you"
        link = dashboard_link(messenger, uid, thread["id"])
        tag = f"{TAG_PREFIX}{thread['id']}_{msg['id']}"
        messenger.last_notified[uid] = {"thread": thread["id"], "title": title, "ts": now_ms()}

        for device in devices:
            data: dict[str, Any] = {}
            message_text = body
            if device["platform"] == "ios":
                data["url"] = link
                data["group"] = f"{TAG_PREFIX}{thread['id']}"
                data["tag"] = tag
                data["push"] = {"thread-id": f"{TAG_PREFIX}{thread['id']}",
                                "sound": "default" if settings.get("sound", True) else "none"}
                badge = messenger.badge.for_notification(uid)
                if badge is not None:
                    data["push"]["badge"] = badge
                if group_title:
                    data["subtitle"] = group_title if mentioned else sender
                if mentioned or ringing:
                    data["push"]["interruption-level"] = "time-sensitive"
                if ringing:
                    data["push"]["sound"] = "default"
                data["actions"] = _action_buttons(msg)
                if settings.get("reply_action", True) and not msg.get("actions"):
                    data["actions"] += [{
                        "action": f"{REPLY_ACTION_PREFIX}{thread['id']}",
                        "title": "Reply",
                        "behavior": "textInput",
                        "textInputButtonTitle": "Send",
                        "textInputPlaceholder": "Message",
                    }]
            else:
                data["clickAction"] = link
                data["group"] = f"{TAG_PREFIX}{thread['id']}"
                data["tag"] = tag
                messenger.badge.note_notified(uid, thread["id"], tag)
                data["channel"] = ANDROID_CHANNEL if settings.get("sound", True) else ANDROID_CHANNEL_SILENT
                data["importance"] = "high"
                data["priority"] = "high"
                data["ttl"] = 0
                data["notification_icon"] = "mdi:message-text"
                if group_title and not mentioned:
                    message_text = f"{sender}: {body}"
                data["actions"] = _action_buttons(msg)[:3]
                if settings.get("reply_action", True) and len(data["actions"]) < 3:
                    data["actions"].append({"action": "REPLY", "title": "Reply"})
            if not data["actions"]:
                data.pop("actions")

            if first and settings.get("show_attachment", True) and settings.get("show_text", True):
                mime = first.get("mime") or ""
                if mime.startswith("image/"):
                    data["image"] = messenger.push_media_path(first["id"])
                elif mime.startswith("video/"):
                    if (first.get("size") or 0) <= 20 * 1024 * 1024:
                        data["video"] = messenger.push_media_path(first["id"])
                    elif first.get("thumb"):
                        data["image"] = messenger.push_media_path(first["id"], thumb=True)
                elif mime.startswith("audio/") and device["platform"] == "ios":
                    data["audio"] = messenger.push_media_path(first["id"])

            try:
                await hass.services.async_call(
                    "notify", device["service"],
                    {"title": title, "message": message_text, "data": data},
                    blocking=False,
                )
            except Exception as err:  # noqa: BLE001 - one bad phone must not stop the rest
                _LOGGER.warning("Crow Messenger could not notify %s: %s", device["service"], err)


def _action_buttons(msg: dict) -> list[dict]:
    """Buttons from an automation's message, so they can be tapped in the notification."""
    return [{"action": f"{ACTION_PREFIX}{msg['id']}_{i}", "title": a["title"]}
            for i, a in enumerate(msg.get("actions") or [])]


async def async_alert(hass: HomeAssistant, messenger: Messenger, thread: dict, uids: list[str],
                      title: str, body: str, options: dict) -> None:
    """A notification that isn't a new message: a tapback, a sticker, a Check In."""
    settings = messenger.settings.get("notifications", {})
    if not settings.get("enabled", True):
        return
    quiet = bool(options.get("quiet"))
    urgent = bool(options.get("urgent"))
    for uid in uids:
        if uid == HA_SENDER_ID:
            continue
        if quiet and (messenger.is_muted(thread, uid) or messenger.is_watching(uid, thread["id"])):
            continue
        ucfg = messenger.settings.get("users", {}).get(uid, {}) or {}
        if ucfg.get("notify") is False and not urgent:
            continue
        link = dashboard_link(messenger, uid, thread["id"])
        tag = f"{TAG_PREFIX}{thread['id']}_{options.get('tag') or 'alert'}"
        for device in devices_for_user(hass, messenger, uid):
            data: dict[str, Any] = {"tag": tag, "group": f"{TAG_PREFIX}{thread['id']}"}
            if device["platform"] == "ios":
                data["url"] = link
                push: dict[str, Any] = {"thread-id": f"{TAG_PREFIX}{thread['id']}"}
                if quiet or not settings.get("sound", True):
                    push["sound"] = "none"
                if urgent:
                    push["interruption-level"] = "time-sensitive"
                    push["sound"] = "default"
                data["push"] = push
            else:
                data["clickAction"] = link
                data["channel"] = ANDROID_CHANNEL_SILENT if quiet or not settings.get("sound", True) else ANDROID_CHANNEL
                data["notification_icon"] = "mdi:map-marker-check" if "Check In" in title else "mdi:message-text"
                if urgent:
                    data["importance"] = "high"
                    data["priority"] = "high"
                    data["ttl"] = 0
            try:
                await hass.services.async_call("notify", device["service"],
                                               {"title": title, "message": body, "data": data}, blocking=False)
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Crow Messenger could not notify %s: %s", device["service"], err)


async def async_clear_android(hass: HomeAssistant, messenger: Messenger, uid: str, tag: str) -> None:
    """Remove the 'replying…' Android notification once its reply is posted."""
    for device in devices_for_user(hass, messenger, uid):
        if device["platform"] != "android":
            continue
        try:
            await hass.services.async_call("notify", device["service"],
                                           {"message": "clear_notification", "data": {"tag": tag}}, blocking=False)
        except Exception:  # noqa: BLE001
            pass
