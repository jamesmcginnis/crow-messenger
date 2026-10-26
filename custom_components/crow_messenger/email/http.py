"""HTTP views: uploading attachments to send, and showing the attachments of an email.

Uploads go to /config/crow_messenger_email_uploads (never /config/www, which is public) and are kept only
until the email is sent. Attachments and inline pictures of received email are fetched from
the mail server when asked for, through a link the integration signs. The link names exactly
one part of one email and expires after a few hours, so the reader can show inline pictures
without handing the browser a login.
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
from .manager import MailError, Mailer, new_id

_LOGGER = logging.getLogger(__name__)

SAFE_MIME = re.compile(r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
# Types a browser may show inline. Anything else is a download, so an attached .html or .svg
# can never run script on the Home Assistant address.
INLINE_TYPES = ("image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif", "image/bmp",
                "video/", "audio/", "application/pdf", "text/plain")


def _safe_filename(name: str) -> str:
    name = os.path.basename(name or "attachment")
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip("._ ") or "attachment"
    return name[-120:]


def _mailer(hass: HomeAssistant) -> Mailer:
    mailer = hass.data.get(DOMAIN)
    if mailer is None:   # Email is switched off
        raise web.HTTPNotFound()
    return mailer


class UploadView(HomeAssistantView):
    """POST multipart with a 'file': an attachment for an email being written."""

    url = f"/api/{DOMAIN}/upload"
    name = f"api:{DOMAIN}:upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        mailer = _mailer(self.hass)
        user = request["hass_user"]
        limit = int(mailer.settings.get("max_attachment_mb", 25)) * 1024 * 1024
        reader = await request.multipart()
        dest = None
        try:
            while (field := await reader.next()) is not None:
                if field.name != "file":
                    await field.release()
                    continue
                original = (field.filename or "attachment")[:200]
                dest = os.path.join(mailer.upload_dir, f"{new_id()}_{_safe_filename(original)}")
                size = 0
                fh = await self.hass.async_add_executor_job(open, dest, "wb")
                try:
                    while chunk := await field.read_chunk(256 * 1024):
                        size += len(chunk)
                        if size > limit:
                            raise MailError("too_large", f"Attachments can be up to {limit // 1048576} MB.")
                        await self.hass.async_add_executor_job(fh.write, chunk)
                finally:
                    await self.hass.async_add_executor_job(fh.close)
                mime = (field.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                if not SAFE_MIME.match(mime) or mime == "application/octet-stream":
                    mime = mimetypes.guess_type(original)[0] or "application/octet-stream"
                return self.json(mailer.add_upload(user.id, original, mime, dest, size))
            raise MailError("invalid", "No file was sent.")
        except MailError as err:
            if dest:
                await self.hass.async_add_executor_job(_remove, dest)
            return self.json_message(str(err), status_code=413 if err.code == "too_large" else 400)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger Email upload failed")
            if dest:
                await self.hass.async_add_executor_job(_remove, dest)
            return self.json_message("Couldn't save the file.", status_code=500)


class PartView(HomeAssistantView):
    """GET a signed link: one attachment or inline picture of one email."""

    url = f"/api/{DOMAIN}/part/{{token}}"
    name = f"api:{DOMAIN}:part"
    requires_auth = False   # the link itself is the permission: signed, for one part, and short-lived

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, token: str) -> web.StreamResponse:
        mailer = _mailer(self.hass)
        info = mailer.check_signed(token)
        if not info:
            return web.Response(status=404)
        a = mailer.accounts.get(info["a"])
        if not a:
            return web.Response(status=404)
        try:
            got = await a.async_part(info["f"], int(info["u"]), int(info["p"]))
        except MailError:
            return web.Response(status=502, text="The mail server didn't answer.")
        if not got:
            return web.Response(status=404)
        data, mime, name = got
        mime = (mime or "").lower()
        if not SAFE_MIME.match(mime):
            mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
        inline = not info.get("d") and any(mime.startswith(t) for t in INLINE_TYPES)
        if not inline and not any(mime.startswith(t) for t in INLINE_TYPES):
            mime = "application/octet-stream"
        headers = {
            "Cache-Control": "private, max-age=21600",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
            "Content-Disposition": f'{"inline" if inline else "attachment"}; filename="{_safe_filename(name)}"',
        }
        if mime == "text/plain":
            mime = "text/plain; charset=utf-8"
        return web.Response(body=data, content_type=None, headers={**headers, "Content-Type": mime})


PROXY_TYPES = ("image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon")
PROXY_MAX_BYTES = 8 * 1024 * 1024


class ImageProxyView(HomeAssistantView):
    """GET a signed link: a picture from the web in an email, fetched by Home Assistant.

    The sender's server sees Home Assistant asking, not your phone, so it doesn't learn where
    you are. Only pictures (never SVG, which can carry script) from public addresses on the
    internet are fetched: never anything on your own network.
    """

    url = f"/api/{DOMAIN}/img/{{token}}"
    name = f"api:{DOMAIN}:img"
    requires_auth = False   # the link itself is the permission: signed, for one picture, and short-lived

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, token: str) -> web.StreamResponse:
        url = _mailer(self.hass).check_proxied(token)
        if not url:
            return web.Response(status=404)
        try:
            body, mime = await _fetch_public_image(self.hass, url)
        except _ProxyRefused as err:
            _LOGGER.debug("Crow Messenger Email didn't fetch picture %s: %s", url[:200], err)
            return web.Response(status=404)
        return web.Response(body=body, content_type=None, headers={
            "Content-Type": mime, "Cache-Control": "private, max-age=21600", "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline",
            "Referrer-Policy": "no-referrer"})


class _ProxyRefused(Exception):
    pass


async def _public_host(hass: HomeAssistant, host: str, port: int) -> None:
    """Refuse addresses on your own network (or this computer), so an email can't reach them."""
    import asyncio
    import ipaddress
    import socket
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError as err:
        raise _ProxyRefused(f"can't resolve {host}") from err
    if not infos:
        raise _ProxyRefused("no address")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if not ip.is_global or ip.is_multicast:
            raise _ProxyRefused(f"{host} is not on the public internet")


async def _fetch_public_image(hass: HomeAssistant, url: str) -> tuple[bytes, str]:
    import asyncio
    from urllib.parse import urljoin, urlsplit
    import aiohttp
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    session = async_get_clientsession(hass, verify_ssl=True)
    for _hop in range(4):
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise _ProxyRefused("not a web address")
        port = parts.port or (443 if parts.scheme == "https" else 80)
        if port not in (80, 443, 8080, 8443):
            raise _ProxyRefused("unusual port")
        if parts.username or parts.password:
            raise _ProxyRefused("address with a login")
        await _public_host(hass, parts.hostname, port)
        try:
            async with asyncio.timeout(12):
                async with session.get(url, allow_redirects=False, headers={
                        "User-Agent": "Mozilla/5.0 (compatible; CrowMessengerEmailImageProxy)", "Accept": "image/*",
                        "Accept-Language": "en"}) as resp:
                    if resp.status in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
                        url = urljoin(url, resp.headers["Location"])
                        continue
                    if resp.status != 200:
                        raise _ProxyRefused(f"status {resp.status}")
                    mime = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                    if mime not in PROXY_TYPES:
                        raise _ProxyRefused(f"not a picture ({mime})")
                    if int(resp.headers.get("Content-Length") or 0) > PROXY_MAX_BYTES:
                        raise _ProxyRefused("too big")
                    data = bytearray()
                    async for chunk in resp.content.iter_chunked(65536):
                        data += chunk
                        if len(data) > PROXY_MAX_BYTES:
                            raise _ProxyRefused("too big")
                    return bytes(data), mime
        except (aiohttp.ClientError, TimeoutError) as err:
            raise _ProxyRefused(str(err) or "failed") from err
    raise _ProxyRefused("too many redirects")


def _remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


ACTION_PAGE = """<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>{title}</title><style>
body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f2f2f7;
font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1c1c1e}}
@media (prefers-color-scheme:dark){{body{{background:#000;color:#fff}}.box{{background:#1c1c1e!important}}}}
.box{{background:#fff;border-radius:18px;padding:28px 24px;max-width:360px;margin:16px;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,.08)}}
h1{{font-size:20px;margin:0 0 8px}}p{{color:#8e8e93;margin:0 0 20px;font-size:15px;line-height:1.4}}
button{{border:0;border-radius:24px;background:#0A84FF;color:#fff;font-size:17px;font-weight:600;padding:13px 28px;cursor:pointer}}
</style></head><body><div class="box">{body}</div></body></html>"""


class ActionView(HomeAssistantView):
    """A button in an email sent by an automation. Opening the link asks first (so a mail app
    checking links can't press it); confirming fires crow_email_action, once."""

    url = f"/api/{DOMAIN}/act/{{token}}"
    name = f"api:{DOMAIN}:act"
    requires_auth = False   # the signed link is the permission: for one button, used once, for two weeks

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _page(self, title: str, body: str, status: int = 200) -> web.Response:
        import html as h
        return web.Response(status=status, content_type="text/html", charset="utf-8",
                            text=ACTION_PAGE.format(title=h.escape(title), body=body),
                            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
                                     "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
                                     "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY"})

    async def get(self, request: web.Request, token: str) -> web.Response:
        import html as h
        ex = _mailer(self.hass).extras
        d = ex.check_action(token)
        if not d:
            return self._page("Link expired", "<h1>This button has expired</h1><p>It's no longer valid.</p>", 404)
        if d["n"] in ex.data["acted"]:
            return self._page("Already done", f"<h1>Already done</h1><p>“{h.escape(d['t'])}” has already been pressed.</p>")
        what = f"<p>{h.escape(d['s'])}</p>" if d.get("s") else "<p>From Home Assistant.</p>"
        return self._page(d["t"], f'<h1>{h.escape(d["t"])}?</h1>{what}<form method="post"><button type="submit">{h.escape(d["t"])}</button></form>')

    async def post(self, request: web.Request, token: str) -> web.Response:
        import html as h
        ex = _mailer(self.hass).extras
        d = ex.check_action(token)
        if not d:
            return self._page("Link expired", "<h1>This button has expired</h1><p>It's no longer valid.</p>", 404)
        if not ex.use_action(d):
            return self._page("Already done", f"<h1>Already done</h1><p>“{h.escape(d['t'])}” has already been pressed.</p>")
        return self._page("Done", f"<h1>Done</h1><p>“{h.escape(d['t'])}” was sent to Home Assistant. You can close this page.</p>")


class PhotoView(HomeAssistantView):
    """GET a contact's photo from a signed, expiring link, for the picture on a notification."""

    url = f"/api/{DOMAIN}/photo/{{token}}"
    name = f"api:{DOMAIN}:photo"
    requires_auth = False   # the signed link is the permission: one person's photo, for a week

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, token: str) -> web.Response:
        from .notifyplus import photo_bytes
        got = photo_bytes(_mailer(self.hass), token)
        if not got:
            return web.Response(status=404)
        body, mime = got
        return web.Response(body=body, content_type=mime, headers={"Cache-Control": "private, max-age=86400",
                                                                   "X-Content-Type-Options": "nosniff"})

