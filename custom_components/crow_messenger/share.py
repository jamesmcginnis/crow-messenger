"""Share to Crow Messenger from a phone's share sheet.

Tap Share in any app and choose Home Assistant: the Companion app fires
`mobile_app.share` with the link (or text) and the person signed in on that
phone. Crow Messenger keeps it for a while and sends that phone a notification
with Send in a Chat and Post on a Page (when the Feed is on): the first opens the
card on a Send To sheet where the chat is chosen, the second opens the Feed on New
Post with the link filled in. Tapping the notification itself opens whichever the
card's Open in setting says (Messages or Feed). Nothing is posted until then, so things shared to Home Assistant
for other reasons never end up in a chat.

iPhone / iPad: `url` or `text`, plus `entered` (typed in the share box) and
`sourceDevicePermanentID` / `sourceDeviceName`.
Android: `url` or `text`, plus `subject` (usually the page title), `caller`
and `device_id`.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers import device_registry as dr

from .const import ANDROID_CHANNEL, ANDROID_CHANNEL_SILENT, MAX_TEXT_LENGTH
from .manager import Messenger, MessengerError, new_id, now_ms
from .notify import dashboard_path, mobile_devices

_LOGGER = logging.getLogger(__name__)

EVENT_SHARE = "mobile_app.share"
# the Discard button on the notification
DISCARD_PREFIX = "CROW_SHARE_X_"
TAG_PREFIX = "crow_share_"
SHARE_TTL_MS = 24 * 3_600_000
MAX_PER_USER = 10
PREVIEW_WAIT = 6  # seconds the notification waits for the page's title

URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)


def _inbox(messenger: Messenger) -> dict[str, dict]:
    """share id -> the shared item. Kept in memory: a restart clears what hasn't been sent."""
    return messenger.__dict__.setdefault("_shares", {})


def _tidy(messenger: Messenger) -> None:
    cutoff = now_ms() - SHARE_TTL_MS
    box = _inbox(messenger)
    for sid in [k for k, v in box.items() if v["ts"] < cutoff]:
        box.pop(sid, None)


def _clean(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def parse(data: dict) -> dict | None:
    """What was shared: a link (with any words around it) or just text."""
    url = _clean(data.get("url"), 4000)
    text = _clean(data.get("text"), MAX_TEXT_LENGTH)
    if not url:
        found = URL_RE.search(text)
        if found:
            url = found.group(0).rstrip(").,!?;:")
    if url and not URL_RE.fullmatch(url):
        # not a web address (a file:// or app link): send it as text instead
        text = f"{text}\n{url}".strip() if url not in text else text
        url = ""
    if url:
        # the words that came with the link, without the link itself
        text = re.sub(re.escape(url) + r"[).,!?;:]*", "", text).strip()
    if not url and not text:
        return None
    return {
        "url": url,
        "text": text[:MAX_TEXT_LENGTH],
        "comment": _clean(data.get("entered"), 2000),
        "title": _clean(data.get("subject"), 200),
    }


def view(item: dict) -> dict:
    """What the card is told about one shared item."""
    out = {k: item[k] for k in ("id", "url", "text", "comment", "title", "ts")}
    if item.get("preview"):
        out["preview"] = item["preview"]
    return out


def pending(messenger: Messenger, uid: str) -> list[dict]:
    _tidy(messenger)
    items = [v for v in _inbox(messenger).values() if v["uid"] == uid]
    return [view(v) for v in sorted(items, key=lambda v: v["seq"], reverse=True)]


def get(messenger: Messenger, uid: str, share_id: str) -> dict:
    _tidy(messenger)
    item = _inbox(messenger).get(share_id)
    if not item or item["uid"] != uid:
        raise MessengerError("not_found", "That shared link has expired. Share it again.")
    return item


async def async_on_share(hass: HomeAssistant, messenger: Messenger, event: Event) -> None:
    """Something was shared to the Home Assistant app."""
    if not messenger._feature("share_sheet"):
        return
    uid = event.context.user_id
    if not uid:
        return
    users = await messenger.async_user_map()
    if uid not in users or users[uid].get("virtual"):
        return
    data = dict(event.data or {})
    item = parse(data)
    if not item:
        return
    _tidy(messenger)
    box = _inbox(messenger)
    mine = sorted((v for v in box.values() if v["uid"] == uid), key=lambda v: v["seq"])
    for old in mine[: max(0, len(mine) - MAX_PER_USER + 1)]:
        box.pop(old["id"], None)
    seq = messenger.__dict__["_share_seq"] = messenger.__dict__.get("_share_seq", 0) + 1
    item.update({"id": new_id(), "uid": uid, "ts": now_ms(), "seq": seq})
    box[item["id"]] = item

    # the page's title and picture, fetched by Home Assistant like any link preview
    if item["url"] and messenger._feature("link_previews"):
        try:
            async with asyncio.timeout(PREVIEW_WAIT):
                preview = await messenger._async_fetch_preview(item["url"])
            if preview:
                item["preview"] = preview
            messenger.feed.link_put(item["url"], preview)
        except Exception as err:  # noqa: BLE001 - a preview is a nice-to-have
            _LOGGER.debug("Crow Messenger share preview for %s: %s", item["url"], err)

    messenger._send_to(uid, {"type": "share", "share": view(item)})
    await _async_notify(hass, messenger, item, data)


def _devices(hass: HomeAssistant, uid: str, data: dict) -> list[dict]:
    """The phone the link was shared from - or, if it can't be told apart, all of this person's phones."""
    devices = [d for d in mobile_devices(hass) if d["user_id"] == uid and d["available"]]
    hints = {str(data.get(k)) for k in ("sourceDevicePermanentID", "sourceDeviceID", "device_id") if data.get(k)}
    if hints:
        reg = dr.async_get(hass)
        for d in devices:
            ids = {d.get("device_id")}
            dev = reg.async_get_device(identifiers={("mobile_app", d.get("device_id") or "")})
            if dev:
                ids.add(dev.id)
            if hints & {i for i in ids if i}:
                return [d]
    name = str(data.get("sourceDeviceName") or "").strip().lower()
    if name:
        same = [d for d in devices if d["name"].strip().lower() == name]
        if len(same) == 1:
            return same
    return devices


async def _async_notify(hass: HomeAssistant, messenger: Messenger, item: dict, data: dict) -> None:
    devices = _devices(hass, item["uid"], data)
    if not devices:
        _LOGGER.info("Crow Messenger: something was shared but that person has no phone to ask who it's for")
        return
    preview = item.get("preview") or {}
    # with the Feed on, it can go to a chat or on someone's page; without it, only to a chat
    feed_on = messenger._feature("feed")
    what = "link" if item["url"] else ""
    if feed_on:
        title = f"Send or post this {what}".replace("  ", " ").strip()
    else:
        title = "Send link to…" if item["url"] else "Send to…"
    if item["url"]:
        body = preview.get("title") or item["title"] or item["url"]
        site = preview.get("site") or ""
        if site and site not in body:
            body = f"{body} · {site}"
    else:
        body = item["text"] if len(item["text"]) <= 160 else item["text"][:159] + "…"
    base = f"{dashboard_path(messenger, item['uid'])}?crow_share={item['id']}"
    link = base                       # tapping it: the card's Open in setting decides
    to_chat = f"{base}&crow_to=chat"  # Send in a Chat
    to_page = f"{base}&crow_to=feed"  # Post on a Page
    tag = f"{TAG_PREFIX}{item['id']}"
    sound = (messenger.settings.get("notifications", {}) or {}).get("sound", True)
    discard = {"action": f"{DISCARD_PREFIX}{item['id']}", "title": "Discard"}
    for device in devices:
        payload: dict[str, Any] = {"tag": tag, "group": "crow_share"}
        if device["platform"] == "ios":
            payload["url"] = link
            payload["push"] = {"thread-id": "crow_share", "sound": "default" if sound else "none"}
            payload["actions"] = [
                {"action": "URI", "title": "Send in a Chat", "uri": to_chat, "icon": "sfsymbols:bubble.left.and.bubble.right"},
                *([{"action": "URI", "title": "Post on a Page", "uri": to_page, "icon": "sfsymbols:newspaper"}] if feed_on else []),
                {**discard, "destructive": True, "activationMode": "background", "icon": "sfsymbols:trash"},
            ]
        else:
            payload["clickAction"] = link
            payload["channel"] = ANDROID_CHANNEL if sound else ANDROID_CHANNEL_SILENT
            payload["importance"] = "high"
            payload["priority"] = "high"
            payload["ttl"] = 0
            payload["notification_icon"] = "mdi:share-variant"
            # Android shows three buttons at most
            payload["actions"] = [
                {"action": "URI", "title": "Send in a Chat", "uri": to_chat},
                *([{"action": "URI", "title": "Post on a Page", "uri": to_page}] if feed_on else []),
                discard,
            ]
        try:
            await hass.services.async_call("notify", device["service"],
                                           {"title": title, "message": body, "data": payload}, blocking=False)
        except Exception as err:  # noqa: BLE001 - one bad phone must not stop the rest
            _LOGGER.warning("Crow Messenger could not notify %s: %s", device["service"], err)


async def async_done(hass: HomeAssistant, messenger: Messenger, uid: str, share_id: str) -> None:
    """Sent or discarded: forget it and take the notification off the phones."""
    item = _inbox(messenger).get(share_id)
    if not item or item["uid"] != uid:
        return
    _inbox(messenger).pop(share_id, None)
    messenger._send_to(uid, {"type": "share_done", "share_id": share_id})
    tag = f"{TAG_PREFIX}{share_id}"
    for device in mobile_devices(hass):
        if device["user_id"] != uid or not device["available"]:
            continue
        try:
            await hass.services.async_call("notify", device["service"],
                                           {"message": "clear_notification", "data": {"tag": tag}}, blocking=False)
        except Exception:  # noqa: BLE001
            pass
