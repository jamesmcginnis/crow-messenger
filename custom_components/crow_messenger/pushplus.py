"""The extras on a message notification: its buttons, the picture on it, and what happens when a
button is tapped.

Buttons (each one can be switched on or off in the card editor):
  Reply (typed), Tapbacks (Heart, Thumbs Up, Ha Ha), Mark as Read, Hide Alerts for 1 Hour,
  and I'm Home / On My Way.
iPhone and iPad show up to ten buttons when the notification is pressed and held, each with an
SF Symbol. Android shows three at most: Reply, Mark as Read and Thumbs Up.

The picture: a photo or video that was sent, otherwise the sticker, the link's preview image,
a map of a shared place, the live view of a shared camera, or the sender's own photo.
"""
from __future__ import annotations

import asyncio
import base64
import io
import logging
import math
import os
import re
import time
from typing import TYPE_CHECKING, Any

from homeassistant.helpers.aiohttp_client import async_get_clientsession

if TYPE_CHECKING:
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

PREFIX = "CROW_N_"           # every button below starts with this
TAPBACK_BUTTONS = (("heart", "❤️", "Heart", "heart.fill"), ("like", "👍", "Thumbs Up", "hand.thumbsup.fill"),
                   ("haha", "😂", "Ha Ha", "face.smiling"))
TAPBACK_EMOJI = {k: e for k, e, _t, _i in TAPBACK_BUTTONS}
HOME_TEXT = {"home": "I'm home 🏠", "omw": "On my way 🚗"}
MAX_IOS_BUTTONS = 10
MAX_ANDROID_BUTTONS = 3
IMG_TTL = 7 * 86400

EFFECT_WORDS = {
    "slam": "Sent with Slam", "loud": "Sent with Loud", "gentle": "Sent with Gentle", "invisible": "Sent with Invisible Ink",
    "confetti": "Sent with Confetti", "balloons": "Sent with Balloons", "fireworks": "Sent with Fireworks",
    "hearts": "Sent with Love", "lasers": "Sent with Lasers", "celebration": "Sent with Celebration",
    "spotlight": "Sent with Spotlight", "echo": "Sent with Echo", "shootingstar": "Sent with Shooting Star",
    "poppers": "Sent with Party Poppers", "snow": "Sent with Snow", "bubbles": "Sent with Bubbles",
    "fireflies": "Sent with Fireflies", "aurora": "Sent with Aurora", "petals": "Sent with Petals",
    "leaves": "Sent with Leaves", "thunder": "Sent with Thunder", "halloween": "Sent with Halloween",
}
URL_RE = re.compile(r"https?://\S+", re.I)


# ── settings ──────────────────────────────────────────────────────────────────
def buttons_on(messenger: "Messenger") -> dict:
    n = messenger.settings.get("notifications", {}) or {}
    b = n.get("buttons") or {}
    return {"tapbacks": b.get("tapbacks", True), "mark_read": b.get("mark_read", True),
            "mute": b.get("mute", False),
            "home": b.get("home", False)}


# ── the buttons ───────────────────────────────────────────────────────────────
def actions_for(messenger: "Messenger", thread: dict, msg: dict, uid: str, platform: str, reply: bool,
                users: dict | None = None) -> list[dict]:
    """The buttons on one person's notification for this message."""
    on = buttons_on(messenger)
    tid, mid = thread["id"], msg["id"]
    ios = platform == "ios"
    out: list[dict] = []

    def add(action: str, title: str, icon: str, **extra: Any) -> None:
        a = {"action": action, "title": title, **extra}
        if ios:
            a["icon"] = f"sfsymbols:{icon}"
        else:
            a.pop("activationMode", None)
            a.pop("authenticationRequired", None)
        out.append(a)

    kind = msg.get("type", "text")
    if ios:
        if reply:
            out.append({"action": f"CROW_REPLY_{tid}", "title": "Reply", "behavior": "textInput",
                        "textInputButtonTitle": "Send", "textInputPlaceholder": "Message", "icon": "sfsymbols:arrowshape.turn.up.left.fill"})
        if on["tapbacks"] and kind not in ("call", "system"):
            for key, _emoji, title, icon in TAPBACK_BUTTONS:
                add(f"{PREFIX}TB_{tid}_{mid}_{key}", title, icon, activationMode="background")
        if on["mark_read"]:
            add(f"{PREFIX}READ_{tid}", "Mark as Read", "envelope.open", activationMode="background")
        if on["mute"]:
            add(f"{PREFIX}MUTE_{tid}", "Hide Alerts for 1 Hour", "bell.slash", activationMode="background")
        if on["home"]:
            add(f"{PREFIX}HOME_{tid}", "I'm Home", "house.fill", activationMode="background")
            add(f"{PREFIX}OMW_{tid}", "On My Way", "car.fill", activationMode="background")
        return out[:MAX_IOS_BUTTONS]
    # Android: three at most
    if reply:
        out.append({"action": "REPLY", "title": "Reply"})
    if on["mark_read"]:
        add(f"{PREFIX}READ_{tid}", "Mark as Read", "")
    if on["tapbacks"] and kind not in ("call", "system"):
        add(f"{PREFIX}TB_{tid}_{mid}_like", "👍", "")
    return out[:MAX_ANDROID_BUTTONS]


async def async_handle(messenger: "Messenger", uid: str, action: str) -> bool:
    """A button from this module was tapped. True when it was one of ours."""
    if not action.startswith(PREFIX):
        return False
    parts = action[len(PREFIX):].split("_")
    what, tid = parts[0], parts[1] if len(parts) > 1 else ""
    if not tid:
        return True
    if what == "TB" and len(parts) >= 4:
        emoji = TAPBACK_EMOJI.get(parts[3])
        thread, msg = messenger._find(tid, parts[2])
        if emoji and msg and uid in thread["participants"] and (msg.get("reactions") or {}).get(uid) != emoji:
            await messenger.async_react(uid, tid, parts[2], emoji)
        messenger.mark_read(uid, tid)
    elif what == "READ":
        messenger.mark_read(uid, tid)
    elif what == "MUTE":
        messenger.set_mute(uid, tid, 60)
    elif what == "RING" and len(parts) >= 3:
        await messenger.async_ring_from_notification(uid, tid, parts[2])
    elif what in ("HOME", "OMW"):
        await messenger.async_send(uid, tid, HOME_TEXT["home" if what == "HOME" else "omw"], [])
    return True


# ── the subtitle ──────────────────────────────────────────────────────────────
def subtitle_for(messenger: "Messenger", thread: dict, msg: dict) -> str:
    """One-to-one chats: a note about how it was sent, like "Sent with Slam" or "Replied to …"."""
    eff = msg.get("effect")
    if eff in EFFECT_WORDS and eff != "invisible":
        return EFFECT_WORDS[eff]
    rid = msg.get("reply_to")
    if isinstance(rid, dict):
        rid = rid.get("id")
    if rid:
        _t, orig = messenger._find(thread["id"], str(rid))
        if orig:
            prev = messenger._preview_of(orig)
            prev = prev if len(prev) <= 40 else prev[:39] + "…"
            return f"Replied to “{prev}”"
        return "Replied to a message"
    if msg.get("forwarded"):
        return "Forwarded"
    return ""


# ── the picture ───────────────────────────────────────────────────────────────
def signed(messenger: "Messenger", kind: str, key: str) -> str:
    exp = int(time.time()) + IMG_TTL
    sig = messenger._sign(f"img:{kind}:{key}:{exp}")
    return f"/api/crow_messenger/pushimg/{kind}/{key}/{exp}/{sig}"


def verify(messenger: "Messenger", kind: str, key: str, exp: str, sig: str) -> bool:
    import hmac
    try:
        if int(exp) < time.time():
            return False
    except ValueError:
        return False
    return hmac.compare_digest(messenger._sign(f"img:{kind}:{key}:{exp}"), sig)


def _data_url_bytes(url: str) -> tuple[bytes, str] | None:
    m = re.match(r"data:(image/[\w.+-]+);base64,(.*)$", url or "", re.S)
    if not m:
        return None
    try:
        return base64.b64decode(m.group(2)), m.group(1)
    except Exception:  # noqa: BLE001
        return None


def sender_photo(messenger: "Messenger", viewer: str, sender: str, users: dict) -> str | None:
    """The sender's picture as the viewer sees it: their contact photo, or the photo the sender shares."""
    book = messenger.cdata.get("contacts", {}).get(viewer, {}) or {}
    contact = next((c for c in book.values() if c.get("ha_user") == sender and c.get("photo")), None)
    if contact:
        return signed(messenger, "avatar", f"{viewer}.{sender}")
    pic = (users.get(sender) or {}).get("picture")
    if not pic:
        return None
    if pic.startswith("data:"):
        return signed(messenger, "avatar", f"{viewer}.{sender}")
    return pic if pic.startswith("/") else None


def image_bytes(messenger: "Messenger", kind: str, key: str) -> tuple[bytes, str] | None:
    """What a signed picture link serves."""
    if kind == "avatar":
        viewer, _, sender = key.partition(".")
        book = messenger.cdata.get("contacts", {}).get(viewer, {}) or {}
        contact = next((c for c in book.values() if c.get("ha_user") == sender and c.get("photo")), None)
        if contact:
            return _data_url_bytes(contact["photo"])
        prof = messenger.cdata.get("profiles", {}).get(sender) or {}
        if prof.get("share") and prof.get("photo"):
            return _data_url_bytes(prof["photo"])
        return None
    if kind == "sticker":
        return _data_url_bytes(messenger._sticker_store()["images"].get(key) or "")
    if kind == "link":
        tid, _, mid = key.partition(".")
        _t, msg = messenger._find(tid, mid)
        return _data_url_bytes(((msg or {}).get("link") or {}).get("image") or "")
    if kind == "map":
        path = map_path(messenger, key)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                return f.read(), "image/png"
    return None


def map_path(messenger: "Messenger", key: str) -> str:
    return os.path.join(messenger.media_dir, "maps", re.sub(r"[^\w.-]", "", key) + ".png")


TILE_URL = "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"


def _tile_xy(lat: float, lon: float, z: int) -> tuple[float, float]:
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    r = math.radians(lat)
    y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
    return x, y


async def async_map(messenger: "Messenger", hass, key: str, lat: float, lon: float, fetch=None) -> str | None:
    """A small map of a shared place with a pin, for the notification. None if it couldn't be made."""
    path = map_path(messenger, key)
    if os.path.isfile(path):
        return signed(messenger, "map", key)
    z, W, H, T = 15, 720, 420, 512
    fx, fy = _tile_xy(lat, lon, z)
    px, py = fx * T, fy * T
    x0, y0 = px - W / 2, py - H / 2
    tiles = {}
    session = None if fetch else async_get_clientsession(hass)

    async def get(tx: int, ty: int) -> None:
        url = TILE_URL.format(z=z, x=tx % (2 ** z), y=ty)
        try:
            if fetch:
                tiles[(tx, ty)] = await fetch(url)
            else:
                async with session.get(url, timeout=6, headers={"User-Agent": "Crow Messenger for Home Assistant"}) as r:
                    if r.status == 200:
                        tiles[(tx, ty)] = await r.read()
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Map tile %s failed: %s", url, err)
    want = [(tx, ty) for tx in range(int(x0 // T), int((x0 + W) // T) + 1) for ty in range(int(y0 // T), int((y0 + H) // T) + 1)]
    await asyncio.gather(*(get(tx, ty) for tx, ty in want))
    if len(tiles) < len(want):
        return None

    def draw() -> bool:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (W, H), (230, 230, 230))
        for (tx, ty), data in tiles.items():
            try:
                t = Image.open(io.BytesIO(data)).convert("RGB").resize((T, T))
            except Exception:  # noqa: BLE001
                return False
            img.paste(t, (int(tx * T - x0), int(ty * T - y0)))
        d = ImageDraw.Draw(img, "RGBA")
        cx, cy = W // 2, H // 2
        d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=(0, 122, 255, 50))
        d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(255, 255, 255, 255))
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(0, 122, 255, 255))
        d.text((W - 150, H - 18), "© OpenStreetMap © CARTO", fill=(80, 80, 80, 255))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img.save(path, "PNG", optimize=True)
        return True
    ok = await hass.async_add_executor_job(draw)
    return signed(messenger, "map", key) if ok else None


async def async_picture(messenger: "Messenger", hass, thread: dict, msg: dict, uid: str, users: dict) -> dict:
    """The picture for a notification that has no photo or video attached: data to merge in."""
    kind = msg.get("type", "text")
    if kind == "sticker":
        sid = (msg.get("sticker") or {}).get("image")
        if sid:
            return {"image": signed(messenger, "sticker", sid)}
    if kind == "entity":
        eid = (msg.get("entity") or {}).get("entity_id") or ""
        if eid.startswith("camera."):
            return {"entity_id": eid}
    if kind == "location":
        loc = msg.get("location") or {}
        if loc.get("lat") is not None and loc.get("lon") is not None:
            try:
                got = await async_map(messenger, hass, f"{thread['id']}.{msg['id']}", float(loc["lat"]), float(loc["lon"]))
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Map for notification failed: %s", err)
                got = None
            if got:
                return {"image": got}
    if kind == "text" and msg.get("text") and URL_RE.search(msg["text"]) and messenger._feature("link_previews"):
        # the link preview is fetched just after sending: give it a moment
        for _ in range(10):
            _t, cur = messenger._find(thread["id"], msg["id"])
            if (cur or {}).get("link"):
                break
            await asyncio.sleep(0.3)
        _t, cur = messenger._find(thread["id"], msg["id"])
        if ((cur or {}).get("link") or {}).get("image"):
            return {"image": signed(messenger, "link", f"{thread['id']}.{msg['id']}")}
    pic = sender_photo(messenger, uid, msg["sender"], users)
    return {"image": pic} if pic else {}
