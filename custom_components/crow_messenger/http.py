"""HTTP views: attachment upload, private attachment serving, phone previews.

Attachments are saved under /config/crow_messenger_media - deliberately NOT
under /config/www, because everything in www is public at /local/ without
logging in. They are only ever served:

* to a logged-in Home Assistant user who is in the chat (MediaView), or
* to the Companion app through a link signed by the integration that
  expires after a few days (PushMediaView) - that is what lets the phone
  show the picture in the notification itself.
"""
from __future__ import annotations

import logging
import mimetypes
import os
import re

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .manager import Messenger, MessengerError, new_id

_LOGGER = logging.getLogger(__name__)

SAFE_MIME = re.compile(r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
# Types a browser may render inline; anything else is sent as a download so
# an uploaded .html/.svg can never run script on the Home Assistant origin.
INLINE_TYPES = ("image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
                "video/", "audio/", "application/pdf")


def _safe_filename(name: str) -> str:
    name = os.path.basename(name or "attachment")
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._") or "attachment"
    return name[-80:]


def _messenger(hass: HomeAssistant) -> Messenger:
    return hass.data[DOMAIN]


async def _file_response(hass: HomeAssistant, path: str | None, att: dict, thumb: bool) -> web.StreamResponse:
    if not path or not await hass.async_add_executor_job(os.path.isfile, path):
        return web.Response(status=404)
    mime = "image/jpeg" if thumb else (att.get("mime") or "application/octet-stream")
    inline = any(mime.startswith(t) for t in INLINE_TYPES)
    if not inline:
        mime = "application/octet-stream"
    filename = (att.get("name") or "attachment").replace('"', "")
    headers = {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
        "Content-Disposition": f'{"inline" if inline else "attachment"}; filename="{_safe_filename(filename)}"',
    }
    return web.FileResponse(path, headers=headers)


class UploadView(HomeAssistantView):
    """POST multipart: file (required), thumb (optional jpeg), thread_id, width, height, duration."""

    url = "/api/crow_messenger/upload"
    name = "api:crow_messenger:upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        messenger = _messenger(self.hass)
        user = request["hass_user"]
        limit = int(messenger.settings.get("max_upload_mb", 300)) * 1024 * 1024
        reader = await request.multipart()
        fields: dict[str, str] = {}
        info: dict = {"id": new_id()}
        written: list[str] = []

        async def _stream(field, dest: str, max_bytes: int) -> int:
            size = 0
            fh = await self.hass.async_add_executor_job(open, dest, "wb")
            try:
                while chunk := await field.read_chunk(256 * 1024):
                    size += len(chunk)
                    if size > max_bytes:
                        raise MessengerError("too_large", f"File too large (max {max_bytes // 1048576} MB)")
                    await self.hass.async_add_executor_job(fh.write, chunk)
            finally:
                await self.hass.async_add_executor_job(fh.close)
            return size

        try:
            while (field := await reader.next()) is not None:
                if field.name == "file":
                    original = field.filename or "attachment"
                    file_name = f"{info['id']}_{_safe_filename(original)}"
                    dest = os.path.join(messenger.media_dir, file_name)
                    written.append(dest)
                    info["size"] = await _stream(field, dest, limit)
                    info["file"] = file_name
                    info["name"] = original[:200]
                    mime = (field.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                    if not SAFE_MIME.match(mime) or mime == "application/octet-stream":
                        mime = mimetypes.guess_type(original)[0] or "application/octet-stream"
                    info["mime"] = mime
                elif field.name == "thumb":
                    thumb_name = f"{info['id']}_thumb.jpg"
                    dest = os.path.join(messenger.media_dir, thumb_name)
                    written.append(dest)
                    await _stream(field, dest, 2 * 1024 * 1024)
                    info["thumb"] = thumb_name
                else:
                    fields[field.name] = (await field.text())[:200]
            if "file" not in info:
                raise MessengerError("invalid_format", "No file provided")
            for key in ("width", "height"):
                if fields.get(key, "").isdigit():
                    info[key] = int(fields[key])
            try:
                info["duration"] = round(float(fields.get("duration", "")), 1)
            except ValueError:
                pass
            result = messenger.register_upload(user.id, fields.get("thread_id") or None, info)
        except MessengerError as err:
            await self.hass.async_add_executor_job(_remove_all, written)
            status = 413 if err.code == "too_large" else 400
            return self.json_message(str(err), status_code=status)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger upload failed")
            await self.hass.async_add_executor_job(_remove_all, written)
            return self.json_message("Could not save file", status_code=500)
        return self.json(result)


def _remove_all(paths: list[str]) -> None:
    for path in paths:
        try:
            os.remove(path)
        except OSError:
            pass


class MediaView(HomeAssistantView):
    """GET an attachment as a logged-in user who is in the chat."""

    url = "/api/crow_messenger/media/{aid}"
    name = "api:crow_messenger:media"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, aid: str) -> web.StreamResponse:
        messenger = _messenger(self.hass)
        try:
            att = messenger.attachment_for(request["hass_user"].id, aid)
        except MessengerError:
            return web.Response(status=404)
        thumb = request.query.get("thumb") == "1" and bool(att.get("thumb"))
        return await _file_response(self.hass, messenger.attachment_path(att, thumb), att, thumb)


class PushMediaView(HomeAssistantView):
    """GET an attachment from a signed, expiring link (notification previews)."""

    url = "/api/crow_messenger/push/{aid}/{kind}/{exp}/{sig}"
    name = "api:crow_messenger:push"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, aid: str, kind: str, exp: str, sig: str) -> web.StreamResponse:
        messenger = _messenger(self.hass)
        att = messenger.verify_push(aid, kind, exp, sig)
        if not att or kind not in ("file", "thumb"):
            return web.Response(status=404)
        thumb = kind == "thumb"
        return await _file_response(self.hass, messenger.attachment_path(att, thumb), att, thumb)


class PushImageView(HomeAssistantView):
    """GET a notification picture from a signed, expiring link: a sender's photo, a sticker,
    a link's preview image or a map of a shared place."""

    url = "/api/crow_messenger/pushimg/{kind}/{key}/{exp}/{sig}"
    name = "api:crow_messenger:pushimg"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, kind: str, key: str, exp: str, sig: str) -> web.Response:
        from . import pushplus
        messenger = _messenger(self.hass)
        if kind not in ("avatar", "sticker", "link", "map") or not pushplus.verify(messenger, kind, key, exp, sig):
            return web.Response(status=404)
        got = await self.hass.async_add_executor_job(pushplus.image_bytes, messenger, kind, key)
        if not got:
            return web.Response(status=404)
        body, ctype = got
        return web.Response(body=body, content_type=ctype, headers={"Cache-Control": "private, max-age=86400"})

