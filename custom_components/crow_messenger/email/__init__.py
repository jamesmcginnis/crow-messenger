"""Email, part of Crow Messenger.

An email client for the people in your home: each person adds their own iCloud, Gmail, Yahoo,
Outlook / Microsoft 365 or other IMAP account and reads and writes email in the Crow Messenger
card (the Email button in the app bar). Home Assistant stays connected to every account, so new
mail shows up instantly, sends phone notifications, fires events and keeps each account's sensors
up to date for automations.

Off until an administrator switches it on in the card editor (the editor's Email page).
While it's off nothing here runs: no mail server connections, no entities, no actions, no Assist
tools, and the card never downloads Email's screens. Switching it on or off takes effect
straight away, with no restart.

Contacts are Crow Messenger's own book, and the app icon badge is Crow Messenger's one badge
(messages plus email).
"""
from __future__ import annotations

import asyncio
import logging
import mimetypes
import os
from collections.abc import Callable

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN, NOTIFY_ACTION_PREFIX, PARENT
from .manager import Account, MailError, Mailer

_LOGGER = logging.getLogger(__name__)

# Email's actions, as Crow Messenger actions (crow_messenger.<name>)
SERVICES = {
    "send_email": "send_email",
    "mark_as_read": "mark_email_as_read",
    "archive": "archive_email",
    "move_to_folder": "move_email",
    "flag": "flag_email",
    "refresh": "refresh_email",
    "update_badge": "update_email_badge",
}

ADDRS = vol.Any(cv.string, [cv.string])
MESSAGE = {
    vol.Required("account"): cv.string,
    vol.Optional("folder", default="INBOX"): cv.string,
    vol.Optional("uid"): vol.Any(vol.Coerce(int), [vol.Coerce(int)]),
    vol.Optional("message_id"): cv.string,
}
SCHEMAS = {
    "send_email": vol.Schema({
        vol.Required("account"): cv.string,
        vol.Required("to"): ADDRS,
        vol.Optional("cc"): ADDRS,
        vol.Optional("bcc"): ADDRS,
        vol.Optional("subject", default=""): cv.string,
        vol.Optional("message", default=""): cv.string,
        vol.Optional("html"): cv.string,
        vol.Optional("attachments"): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional("send_at"): cv.datetime,
        # buttons in the email: tapping one fires a crow_email_action event (once)
        vol.Optional("buttons"): vol.All(cv.ensure_list, [vol.Schema({
            vol.Required("title"): vol.All(cv.string, vol.Length(max=60)),
            vol.Required("action"): vol.All(cv.string, vol.Length(max=120)),
            vol.Optional("colour"): cv.string,
        })], vol.Length(max=6)),
        # voting buttons: replies are counted, and each vote fires a crow_email_vote event
        vol.Optional("poll"): vol.All(cv.ensure_list, [cv.string], vol.Length(min=2, max=8)),
        vol.Optional("read_receipt", default=False): cv.boolean,
    }),
    "mark_as_read": vol.Schema({**MESSAGE, vol.Optional("read", default=True): cv.boolean,
                                vol.Optional("all", default=False): cv.boolean}),
    "archive": vol.Schema(MESSAGE),
    "move_to_folder": vol.Schema({**MESSAGE, vol.Required("to_folder"): cv.string}),
    "flag": vol.Schema({**MESSAGE, vol.Optional("flagged", default=True): cv.boolean}),
    "refresh": vol.Schema({vol.Optional("account"): cv.string}),
    # the app icon badge: add a number of your own (like parcels on their way), or just bring it up to date
    "update_badge": vol.Schema({vol.Required("account"): cv.string, vol.Optional("extra"): vol.All(vol.Coerce(int), vol.Range(min=0, max=9999))}),
}


def switched_on(messenger) -> bool:
    """Email is off unless an administrator has switched it on (the editor's Email page)."""
    return (messenger.settings.get("features") or {}).get("email") is True


class EmailRuntime:
    """Starts and stops Email inside Crow Messenger, following the household switch."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, messenger) -> None:
        self.hass = hass
        self.entry = entry
        self.messenger = messenger
        self.mailer: Mailer | None = None
        self.adders: dict[str, Callable] = {}
        self._stops: list[Callable] = []
        self._lock = asyncio.Lock()

    @property
    def running(self) -> bool:
        return self.mailer is not None

    def status(self) -> dict:
        return {"enabled": self.running, "switched_on": switched_on(self.messenger)}

    def status_for(self, uid: str) -> dict:
        out = self.status()
        out["unread"] = self.mailer.badge.unread(uid) if self.mailer else 0
        return out

    # ── entities: Crow Messenger's sensor and binary_sensor platforms hand over their add function ──
    @callback
    def platform_ready(self, platform: str, add: Callable) -> None:
        self.adders[platform] = add
        if self.running:
            self._add_platform(platform)

    @callback
    def _add_platform(self, platform: str) -> None:
        if platform == "sensor":
            from .sensor import email_setup
        else:
            from .binary_sensor import email_setup
        self._stops.append(email_setup(self.hass, self.entry, self.adders[platform]))

    # ── on and off ──
    async def async_sync(self) -> None:
        """Bring Email in line with the household switch."""
        async with self._lock:
            want = switched_on(self.messenger)
            if want and not self.running:
                try:
                    await self._async_start()
                except Exception:  # noqa: BLE001 - a broken Email must never take Messages down with it
                    _LOGGER.exception("Crow Messenger couldn't start Email")
                    await self._async_stop(remove=False)
            elif not want and self.running:
                await self._async_stop(remove=True)
            elif not want and not switched_on(self.messenger):
                self._remove_leftovers()
        self.messenger.broadcast_all({"type": "email_state", **self.status()})

    async def async_unload(self) -> None:
        """Home Assistant stopping or the integration reloading: stop, but keep the entities for next time."""
        async with self._lock:
            if self.running:
                await self._async_stop(remove=False)

    async def _async_start(self) -> None:
        hass = self.hass
        mailer = Mailer(hass, self.messenger)
        await mailer.async_load()
        hass.data[DOMAIN] = mailer
        self.mailer = mailer
        await mailer.async_start()
        self._stops.append(mailer.async_stop)

        if not hass.data.get(f"{DOMAIN}_views_registered"):
            from . import websocket
            from .http import ActionView, ImageProxyView, PartView, PhotoView, UploadView
            hass.http.register_view(UploadView(hass))
            hass.http.register_view(PartView(hass))
            hass.http.register_view(ImageProxyView(hass))
            hass.http.register_view(ActionView(hass))
            hass.http.register_view(PhotoView(hass))
            websocket.async_register(hass)
            hass.data[f"{DOMAIN}_views_registered"] = True

        for platform in list(self.adders):
            self._add_platform(platform)

        # Ask Your Email: offered to AI conversation agents in Assist
        from .assist import async_register as register_assist
        unregister = register_assist(hass)
        if unregister:
            self._stops.append(unregister)

        # the buttons on new-email notifications (Reply, Mark as Read, Archive, Flag, Remind Me, Delete)
        async def _on_action(event: Event) -> None:
            action = str((event.data or {}).get("action") or "")
            if action.startswith(NOTIFY_ACTION_PREFIX + "|") and self.mailer:
                await self.mailer.async_notification_action(action, (event.data or {}).get("reply_text"),
                                                            user_id=event.context.user_id)

        self._stops.append(hass.bus.async_listen("mobile_app_notification_action", _on_action))

        for name, service in SERVICES.items():
            hass.services.async_register(
                PARENT, service, _service(hass, mailer, name), schema=SCHEMAS[name],
                supports_response=SupportsResponse.OPTIONAL if name == "send_email" else SupportsResponse.NONE)
        self._stops.append(self._remove_services)

        # household notices from email, posted in the Feed (each kind off until switched on)
        from ..together import Notices
        notices = Notices(hass, self.messenger)
        notices.start()
        self._stops.append(notices.stop)

        # everyone's badge now counts email too
        self.messenger.badge.everyone_changed()
        _LOGGER.info("Crow Messenger: Email is on")

    @callback
    def _remove_services(self) -> None:
        for service in SERVICES.values():
            self.hass.services.async_remove(PARENT, service)

    async def _async_stop(self, remove: bool) -> None:
        mailer = self.mailer
        if mailer is not None:
            mailer.send_to_all({"type": "email_off"})
        stops, self._stops = self._stops, []
        for stop in reversed(stops):
            try:
                res = stop()
                if asyncio.iscoroutine(res):
                    await res
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Crow Messenger: something went wrong switching Email off")
        self.hass.data.pop(DOMAIN, None)
        self.mailer = None
        if remove:
            self._remove_leftovers()
            # the badge goes back to messages only
            self.messenger.badge.everyone_changed()
            _LOGGER.info("Crow Messenger: Email is off")

    @callback
    def _remove_leftovers(self) -> None:
        """No Email entities or devices while it's switched off."""
        from .entity import remove_account_entities
        remove_account_entities(self.hass, self.entry)

# ── actions for automations ─────────────────────────────────────────────────
def _account(mailer: Mailer, ref: str) -> Account:
    """An account by its email address, its name or its id."""
    ref = (ref or "").strip()
    low = ref.lower()
    for a in mailer.accounts.values():
        if low in (a.acc["email"].lower(), a.id, (a.acc.get("name") or "").lower()):
            return a
    raise HomeAssistantError(f"Crow Messenger: there's no account called '{ref}'")


async def _uids(a: Account, data: dict) -> list[int]:
    if data.get("uid") is not None:
        u = data["uid"]
        return [int(x) for x in (u if isinstance(u, list) else [u])]
    if data.get("message_id"):
        found = await a.async_find(data["folder"], data["message_id"])
        if found:
            return [found]
        raise HomeAssistantError("Crow Messenger: that email isn't in the folder any more")
    raise HomeAssistantError("Crow Messenger: say which email, with uid or message_id (from the crow_email_received event)")


def _addr(v) -> list[dict]:
    if not v:
        return []
    items = v if isinstance(v, list) else [x for x in str(v).replace(";", ",").split(",")]
    return [{"email": x.strip()} for x in items if x.strip()]


async def _import(hass: HomeAssistant, mailer: Mailer, source: str) -> dict:
    """A file named in an action, as an attachment (only from allowed folders)."""
    source = source.strip()
    if source.startswith("media-source://media_source/"):   # as the media browser gives it
        source = "/media/" + source[len("media-source://media_source/"):]
    if source.startswith("/local/"):
        path = hass.config.path("www", source[len("/local/"):].split("?")[0])
    elif source.startswith("/media/") and source.split("/")[2:3] and source.split("/")[2] in (hass.config.media_dirs or {}):
        # /media/<media folder>/…: the folder Home Assistant's media browser uses for it
        # (on Home Assistant OS "local" is /media, outside /config; on other installs often /config/media)
        key = source.split("/")[2]
        rest = source[len(f"/media/{key}/"):].split("?")[0]
        path = os.path.join(hass.config.media_dirs[key], rest)
    elif source.startswith("/media/local/"):
        path = hass.config.path("media", source[len("/media/local/"):].split("?")[0])
    else:
        path = source   # a full path, e.g. /media/snapshots/door.jpg or /config/www/door.jpg
    path = os.path.realpath(path)
    if not hass.config.is_allowed_path(path):
        raise HomeAssistantError(f"Crow Messenger: {source} isn't in an allowed folder (see allowlist_external_dirs)")
    if not await hass.async_add_executor_job(os.path.isfile, path):
        raise HomeAssistantError(f"Crow Messenger: file not found: {source}")
    import shutil
    name = os.path.basename(path)
    dest = os.path.join(mailer.upload_dir, f"svc_{os.urandom(6).hex()}_{name[-80:]}")
    await hass.async_add_executor_job(shutil.copyfile, path, dest)
    size = await hass.async_add_executor_job(os.path.getsize, dest)
    up = mailer.add_upload(None, name, mimetypes.guess_type(name)[0] or "application/octet-stream", dest, size)
    return {"upload": up["id"]}


def _service(hass: HomeAssistant, mailer: Mailer, name: str):
    async def handle(call: ServiceCall) -> ServiceResponse:
        d = call.data
        try:
            if name == "refresh":
                targets = [_account(mailer, d["account"])] if d.get("account") else list(mailer.accounts.values())
                for a in targets:
                    await a.async_check_new()
                return None
            a = _account(mailer, d["account"])
            if name == "update_badge":
                owner = a.acc["owner"]
                if "extra" in d:
                    mailer.badge.set_extra(owner, d["extra"])
                await mailer.badge.async_push(owner, force=True)
                return None
            if name == "send_email":
                html = d.get("html")
                if html is None:
                    from .mailparse import text_to_html
                    html = text_to_html(d.get("message") or "")
                    sig = a.acc.get("signature")
                    if sig:
                        html += "<br><br>" + text_to_html(sig)
                payload = {"to": _addr(d.get("to")), "cc": _addr(d.get("cc")), "bcc": _addr(d.get("bcc")),
                           "subject": d.get("subject", ""), "html": html,
                           "attachments": [await _import(hass, mailer, s) for s in d.get("attachments") or []],
                           "buttons": d.get("buttons") or [], "read_receipt": d.get("read_receipt", False)}
                if d.get("poll"):
                    payload["poll"] = {"question": d.get("subject", ""), "choices": d["poll"]}
                if d.get("send_at"):
                    from homeassistant.util import dt as dt_util
                    when = dt_util.as_utc(d["send_at"] if d["send_at"].tzinfo else d["send_at"].replace(tzinfo=dt_util.get_default_time_zone()))
                    item = mailer.schedule(a.acc["owner"], a.id, payload, int(when.timestamp() * 1000))
                    return {"scheduled": True, "id": item["id"]}
                res = await mailer.async_send(None, a.id, payload)
                return {"scheduled": False, **res}
            if name == "mark_as_read" and d.get("all"):
                uids = await a.job(a.cmd.search, d["folder"], "UNSEEN" if d["read"] else "SEEN")
                if uids:
                    await a.async_flag(d["folder"], uids, "seen", d["read"])
                return None
            uids = await _uids(a, d)
            if name == "mark_as_read":
                await a.async_flag(d["folder"], uids, "seen", d["read"])
            elif name == "flag":
                await a.async_flag(d["folder"], uids, "flagged", d["flagged"])
            elif name == "archive":
                await a.async_archive(d["folder"], uids)
            elif name == "move_to_folder":
                dest = d["to_folder"]
                if not a.folders:
                    await a.async_folders(counts=False)
                f = next((f for f in a.folders if dest in (f["path"], f["name"]) or dest.lower() == (f.get("special") or "")), None)
                await a.async_move(d["folder"], uids, f["path"] if f else dest)
            mailer.send_to(a.acc["owner"], {"type": "mail", "account": a.id, "folder": d["folder"]})
        except MailError as err:
            raise HomeAssistantError(f"Crow Messenger: {err}") from err
        return None

    return handle
