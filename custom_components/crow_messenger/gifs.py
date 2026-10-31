"""GIFs for the Feed, from GIPHY.

An administrator adds a GIPHY API key in the card editor (Household -> Feed -> GIFs). Searches go
through Home Assistant, so the key never reaches anyone's browser. A chosen GIF is downloaded here
and stored like any photo, so posts and comments keep working if GIPHY removes it later.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .manager import Messenger, MessengerError, new_id

_LOGGER = logging.getLogger(__name__)

API = "https://api.giphy.com/v1/gifs"
RATING = "pg"                 # suitable for a household
PAGE = 24
MAX_GIF_BYTES = 15 * 1048576  # the biggest GIF kept (a smaller rendition is used above this)
# where a chosen GIF may be downloaded from (never an address sent by the browser)
GIPHY_HOSTS = (".giphy.com",)


def key(messenger: Messenger) -> str:
    return str(messenger.settings.get("giphy_key") or "").strip()


def _need_key(messenger: Messenger) -> str:
    k = key(messenger)
    if not k:
        raise MessengerError("unavailable", "GIFs aren’t set up. An administrator can add a GIPHY key in the card editor (Feed).")
    return k


async def _get(hass: HomeAssistant, path: str, params: dict) -> dict:
    session = async_get_clientsession(hass)
    try:
        async with asyncio.timeout(10):
            async with session.get(f"{API}/{path}", params=params) as resp:
                if resp.status in (401, 403):
                    raise MessengerError("unavailable", "GIPHY didn’t accept the key. An administrator can check it in the card editor (Feed).")
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


async def async_search(hass: HomeAssistant, messenger: Messenger, q: str, offset: int = 0) -> dict:
    """Search GIPHY (or what's trending, with nothing typed)."""
    k = _need_key(messenger)
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


def _pick_rendition(images: dict) -> dict | None:
    """The best copy of the GIF that isn't too big."""
    for name in ("original", "downsized_large", "downsized_medium", "downsized", "fixed_width"):
        r = images.get(name) or {}
        url = r.get("url") or ""
        try:
            size = int(r.get("size") or 0)
        except (TypeError, ValueError):
            size = 0
        if url and (size and size <= MAX_GIF_BYTES):
            return r
    return None


async def async_add(hass: HomeAssistant, messenger: Messenger, uid: str, gif_id: str) -> dict:
    """Download a GIF chosen from GIPHY and keep it here, ready to add to a post or comment.
    Returns the same as an upload."""
    k = _need_key(messenger)
    gif_id = "".join(ch for ch in (gif_id or "") if ch.isalnum())[:40]
    if not gif_id:
        raise MessengerError("invalid_format", "That GIF wasn’t found")
    data = (await _get(hass, gif_id, {"api_key": k})).get("data") or {}
    r = _pick_rendition(data.get("images") or {})
    if not r:
        raise MessengerError("too_large", "That GIF is too big to add. Try another.")
    url = r["url"]
    host = url.split("/")[2].lower() if url.startswith("https://") and url.count("/") >= 3 else ""
    if not host.endswith(GIPHY_HOSTS):
        raise MessengerError("invalid_format", "That GIF wasn’t found")

    info: dict = {"id": new_id()}
    file_name = f"{info['id']}_giphy.gif"
    dest = os.path.join(messenger.media_dir, file_name)
    sha = hashlib.sha256()
    size = 0
    session = async_get_clientsession(hass)
    try:
        async with asyncio.timeout(30):
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise MessengerError("unavailable", "Couldn’t download that GIF. Try again.")
                fh = await hass.async_add_executor_job(open, dest, "wb")
                try:
                    async for chunk in resp.content.iter_chunked(256 * 1024):
                        size += len(chunk)
                        if size > MAX_GIF_BYTES:
                            raise MessengerError("too_large", "That GIF is too big to add. Try another.")
                        sha.update(chunk)
                        await hass.async_add_executor_job(fh.write, chunk)
                finally:
                    await hass.async_add_executor_job(fh.close)
        info.update({"size": size, "file": file_name, "name": f"{(data.get('title') or 'GIF')[:80]}.gif", "mime": "image/gif"})
        for dim in ("width", "height"):
            try:
                info[dim] = int(r.get(dim) or 0) or None
            except (TypeError, ValueError):
                pass
        await messenger.store.async_ingest(info, sha.hexdigest(), dest, None)
    except Exception as err:
        await hass.async_add_executor_job(_remove, dest)
        if isinstance(err, MessengerError):
            raise
        _LOGGER.debug("GIF download failed", exc_info=True)
        raise MessengerError("unavailable", "Couldn’t download that GIF. Try again.") from err
    return messenger.register_upload(uid, None, info)


def _remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass
