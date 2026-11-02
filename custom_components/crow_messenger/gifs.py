"""GIFs from GIPHY, for chats, the Feed (posts, comments and story stickers) and Email.

An administrator adds a GIPHY API key in the card editor (GIFs) and chooses where GIFs can be
used. Searches go through Home Assistant, so the key never reaches anyone's browser, and results
are always rated PG. A chosen GIF is downloaded here and stored like any photo, so it keeps
working if GIPHY removes it later. Each place gets a copy of a sensible size: chats a medium one
(with a small copy for phone notifications), the Feed a large one, Email and story stickers a
small one.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import logging
import os
import time

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .manager import Messenger, MessengerError, new_id

_LOGGER = logging.getLogger(__name__)

API = "https://api.giphy.com/v1/gifs"
RATING = "pg"                 # suitable for a household (always)
PAGE = 24
MB = 1048576
# the biggest copy each place takes (a smaller rendition is used above it)
# (Email is kept small: the GIF travels inside the email, and the whole email goes to Home Assistant in one message)
SIZES = {"feed": 15 * MB, "chat": 5 * MB, "email": 1 * MB, "sticker": 2 * MB}
THUMB_BYTES = int(1.5 * MB)   # the small copy for chat notifications
RENDITIONS = ("original", "downsized_large", "downsized_medium", "downsized", "fixed_width")
THUMB_RENDITIONS = ("fixed_width", "fixed_width_downsampled", "fixed_height", "downsized_small")
# where a chosen GIF may be downloaded from (never an address sent by the browser)
GIPHY_HOSTS = (".giphy.com",)
PLACES = ("chats", "feed", "email")
HISTORY_RECENT = 24
HISTORY_FAVOURITES = 48


def key(messenger: Messenger) -> str:
    return str(messenger.settings.get("giphy_key") or "").strip()


def place_on(messenger: Messenger, place: str) -> bool:
    """GIFs are on for chats, the Feed or Email: a key is set and that place isn't switched off."""
    if not key(messenger):
        return False
    return (messenger.settings.get("gifs") or {}).get(place, True) is not False


def state(messenger: Messenger) -> dict:
    """What every card is told: where GIFs can be used (the key itself stays here)."""
    return {p: place_on(messenger, p) for p in PLACES}


def _need(messenger: Messenger, purpose: str) -> str:
    k = key(messenger)
    if not k:
        raise MessengerError("unavailable", "GIFs aren’t set up. An administrator can add a GIPHY key in the card editor (GIFs).")
    place = {"chat": "chats", "feed": "feed", "sticker": "feed", "email": "email"}.get(purpose, "feed")
    if not place_on(messenger, place):
        raise MessengerError("unavailable", "GIFs are switched off here")
    if place == "feed" and not messenger.feed.enabled():
        raise MessengerError("unavailable", "The Feed is switched off")
    return k


async def _get(hass: HomeAssistant, path: str, params: dict) -> dict:
    session = async_get_clientsession(hass)
    try:
        async with asyncio.timeout(10):
            async with session.get(f"{API}/{path}", params=params) as resp:
                if resp.status in (401, 403):
                    raise MessengerError("unavailable", "GIPHY didn’t accept the key. An administrator can check it in the card editor (GIFs).")
                if resp.status == 429:
                    raise MessengerError("unavailable", "GIPHY is busy. Try again in a minute.")
                if resp.status != 200:
                    raise MessengerError("unavailable", "Couldn’t reach GIPHY. Try again.")
                return await resp.json(content_type=None)
    except MessengerError:
        raise
    except Exception as err:  # noqa: BLE001 - offline or a bad answer
        _LOGGER.debug("GIPHY request failed", exc_info=True)
        raise MessengerError("unavailable", "Couldn’t reach GIPHY. Try again.") from err


def _view(g: dict) -> dict | None:
    im = g.get("images") or {}
    prev = im.get("fixed_width") or im.get("fixed_width_downsampled") or {}
    still = im.get("fixed_width_still") or {}
    if not prev.get("url") or not g.get("id"):
        return None
    return {"id": str(g["id"]), "title": str(g.get("title") or "")[:120], "preview": prev["url"],
            "still": still.get("url") or "", "w": int(prev.get("width") or 200), "h": int(prev.get("height") or 200)}


async def async_search(hass: HomeAssistant, messenger: Messenger, q: str, offset: int = 0, purpose: str = "feed") -> dict:
    """Search GIPHY (or what's trending, with nothing typed)."""
    k = _need(messenger, purpose)
    q = (q or "").strip()[:50]
    params = {"api_key": k, "limit": str(PAGE), "offset": str(max(0, min(int(offset or 0), 4999))), "rating": RATING,
              "bundle": "messaging_non_clips"}
    if q:
        params["q"] = q
        params["lang"] = (hass.config.language or "en")[:2]
    data = await _get(hass, "search" if q else "trending", params)
    items = [v for v in (_view(g) for g in data.get("data") or []) if v]
    pg = data.get("pagination") or {}
    total = int(pg.get("total_count") or 0)
    nxt = int(pg.get("offset") or 0) + int(pg.get("count") or len(items))
    return {"gifs": items, "next": nxt if items and nxt < total else None}


def _pick(images: dict, names: tuple[str, ...], limit: int) -> dict | None:
    """The best copy of the GIF that isn't too big."""
    for name in names:
        r = images.get(name) or {}
        url = r.get("url") or ""
        try:
            size = int(r.get("size") or 0)
        except (TypeError, ValueError):
            size = 0
        if url and size and size <= limit:
            return r
    return None


def _safe_url(url: str) -> bool:
    host = url.split("/")[2].lower() if url.startswith("https://") and url.count("/") >= 3 else ""
    return host.endswith(GIPHY_HOSTS)


async def _download(hass: HomeAssistant, url: str, dest: str | None, limit: int) -> tuple[int, str, bytes | None]:
    """Fetch a GIF into a file (or into memory with dest=None). Returns its size, fingerprint and bytes."""
    if not _safe_url(url):
        raise MessengerError("invalid_format", "That GIF wasn’t found")
    sha = hashlib.sha256()
    size = 0
    buf = bytearray() if dest is None else None
    session = async_get_clientsession(hass)
    async with asyncio.timeout(30):
        async with session.get(url) as resp:
            if resp.status != 200:
                raise MessengerError("unavailable", "Couldn’t download that GIF. Try again.")
            fh = await hass.async_add_executor_job(open, dest, "wb") if dest else None
            try:
                async for chunk in resp.content.iter_chunked(256 * 1024):
                    size += len(chunk)
                    if size > limit:
                        raise MessengerError("too_large", "That GIF is too big to add. Try another.")
                    sha.update(chunk)
                    if fh:
                        await hass.async_add_executor_job(fh.write, chunk)
                    else:
                        buf.extend(chunk)
            finally:
                if fh:
                    await hass.async_add_executor_job(fh.close)
    return size, sha.hexdigest(), (bytes(buf) if buf is not None else None)


def _dims(r: dict) -> dict:
    out = {}
    for dim in ("width", "height"):
        try:
            out[dim] = int(r.get(dim) or 0) or None
        except (TypeError, ValueError):
            pass
    return out


async def async_add(hass: HomeAssistant, messenger: Messenger, uid: str, gif_id: str, purpose: str = "feed",
                    thread_id: str | None = None) -> dict:
    """Download a GIF chosen from GIPHY. For chats, the Feed and story stickers it's kept here like an
    upload (returned as one); for Email it comes back as a picture to put straight into the email."""
    if purpose not in SIZES:
        raise MessengerError("invalid_format", "Unknown place for a GIF")
    k = _need(messenger, purpose)
    if purpose == "chat":
        if not thread_id:
            raise MessengerError("invalid_format", "Choose a conversation first")
        messenger._thread(uid, thread_id)   # only someone in the chat can add to it
    gif_id = "".join(ch for ch in (gif_id or "") if ch.isalnum())[:40]
    if not gif_id:
        raise MessengerError("invalid_format", "That GIF wasn’t found")
    data = (await _get(hass, gif_id, {"api_key": k})).get("data") or {}
    images = data.get("images") or {}
    r = _pick(images, RENDITIONS, SIZES[purpose])
    if not r:
        raise MessengerError("too_large", "That GIF is too big to add. Try another.")
    title = str(data.get("title") or "GIF")[:80]
    view = _view(data)
    if view:
        _remember(messenger, uid, view)

    if purpose == "email":
        try:
            size, _sha, raw = await _download(hass, r["url"], None, SIZES["email"])
        except MessengerError:
            raise
        except Exception as err:  # noqa: BLE001
            raise MessengerError("unavailable", "Couldn’t download that GIF. Try again.") from err
        return {"data_url": "data:image/gif;base64," + base64.b64encode(raw).decode(), "size": size, **_dims(r), "name": f"{title}.gif"}

    info: dict = {"id": new_id()}
    dest = os.path.join(messenger.media_dir, f"{info['id']}_giphy.gif")
    thumb_path = None
    try:
        size, sha, _ = await _download(hass, r["url"], dest, SIZES[purpose])
        info.update({"size": size, "file": os.path.basename(dest), "name": f"{title}.gif", "mime": "image/gif", **_dims(r)})
        if purpose == "chat":
            # a small copy for phone notifications (and the conversation's Photos grid)
            t = _pick(images, THUMB_RENDITIONS, THUMB_BYTES)
            if t and t.get("url") != r["url"]:
                thumb_path = os.path.join(messenger.media_dir, f"{info['id']}_thumb.jpg")
                try:
                    await _download(hass, t["url"], thumb_path, THUMB_BYTES)
                    info["thumb"] = os.path.basename(thumb_path)
                except Exception:  # noqa: BLE001 - the GIF still works without it
                    await hass.async_add_executor_job(_remove, thumb_path)
                    thumb_path = None
        await messenger.store.async_ingest(info, sha, dest, thumb_path)
    except Exception as err:
        await hass.async_add_executor_job(_remove, dest)
        if thumb_path:
            await hass.async_add_executor_job(_remove, thumb_path)
        if isinstance(err, MessengerError):
            raise
        _LOGGER.debug("GIF download failed", exc_info=True)
        raise MessengerError("unavailable", "Couldn’t download that GIF. Try again.") from err
    return messenger.register_upload(uid, thread_id if purpose == "chat" else None, info)


# ── Recent and Favourites (each person's own, the same on every device) ─────
def history(messenger: Messenger, uid: str) -> list[dict]:
    return list((messenger.data.setdefault("gif_history", {})).get(uid, []))


def _store(messenger: Messenger, uid: str, items: list[dict]) -> list[dict]:
    favs = [h for h in items if h.get("favourite")][:HISTORY_FAVOURITES]
    recent = [h for h in items if not h.get("favourite")][:HISTORY_RECENT]
    messenger.data.setdefault("gif_history", {})[uid] = favs + recent
    messenger._save()
    return favs + recent


def _remember(messenger: Messenger, uid: str, view: dict) -> None:
    items = history(messenger, uid)
    old = next((h for h in items if h["id"] == view["id"]), None)
    items = [h for h in items if h["id"] != view["id"]]
    items.insert(0, {**view, "favourite": bool(old and old.get("favourite")), "ts": int(time.time() * 1000)})
    _store(messenger, uid, items)


def edit_history(messenger: Messenger, uid: str, action: str, gif_id: str) -> list[dict]:
    items = history(messenger, uid)
    if action == "delete":
        items = [h for h in items if h["id"] != gif_id]
    elif action == "favourite":
        for h in items:
            if h["id"] == gif_id:
                h["favourite"] = not h.get("favourite")
    elif action == "clear":
        items = [h for h in items if h.get("favourite")]
    return _store(messenger, uid, items)


def _remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass
