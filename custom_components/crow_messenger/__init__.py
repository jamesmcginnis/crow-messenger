"""The Crow Messenger integration.

Private messaging between Home Assistant users, with attachments, group
chats, phone notifications (iPhone and Android) and a per-user contacts book.
The card ships inside the integration and is added to every dashboard
automatically, so one download installs both.
"""
from __future__ import annotations

import hashlib
import logging
import mimetypes
import os
import shutil
from datetime import timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.loader import async_get_integration

from .const import CLEANUP_INTERVAL_MINUTES, DOMAIN, HA_SENDER_ID, SERVICE_SEND_MESSAGE

SERVICE_POST = "post"
# parts of the card in files of their own, fetched by the card the first time each is used
LAZY_FILES = {"feed": "crow-feed.js", "pdf": "crow-pdf.js", "games": "crow-games.js",
              "live": "crow-live.js", "people": "crow-people.js"}
from .http import BackupView, MediaView, PushMediaView, UploadView, PushImageView
from .manager import Messenger, MessengerError, new_id, now_ms
from .const import ACTION_PREFIX
from . import feedpush, pushplus
from . import share
from .notify import REPLY_ACTION_PREFIX, TAG_PREFIX, async_alert, async_clear_android, async_feed_push, async_push, async_ring, async_ring_clear
from . import websocket

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "crow-messenger-card.js"
CARD_URL = f"/{DOMAIN}/{CARD_FILENAME}"
# each person's Unread, Latest message, New messages, Active now and Phone ringing
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]

POST_SCHEMA = vol.Schema({
    vol.Required("message"): cv.string,
    vol.Optional("attachment"): vol.Any(cv.string, [cv.string]),
    # "everyone" (the default), a list of people (names, user IDs or person. entities), or a group's name
    vol.Optional("to"): vol.Any(cv.string, [cv.string]),
    vol.Optional("group"): cv.string,
    vol.Optional("background"): cv.string,
})

SEND_SCHEMA = vol.Schema({
    vol.Required("to"): vol.Any(cv.string, [cv.string]),
    vol.Required("message"): cv.string,
    vol.Optional("attachment"): cv.string,
    vol.Optional("group_name", default=""): cv.string,
    # Buttons under the message: a title, or {title, action}. Tapping one fires crow_messenger_action.
    vol.Optional("actions"): vol.All(cv.ensure_list, [vol.Any(cv.string, vol.Schema({
        vol.Required("title"): cv.string, vol.Optional("action"): cv.string}))]),
})


async def _async_register_card(hass: HomeAssistant) -> None:
    if hass.data.get(f"{DOMAIN}_card_registered"):
        return
    www = Path(__file__).parent / "www"
    card_path = www / CARD_FILENAME
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL, str(card_path), True)]
        + [StaticPathConfig(f"/{DOMAIN}/{name}", str(www / name), True) for name in LAZY_FILES.values()])
    integration = await async_get_integration(hass, DOMAIN)
    # The cache-buster includes a fingerprint of the card file itself, so any
    # change to the card reaches phones after a restart, even without a version bump.
    digest = await hass.async_add_executor_job(
        lambda: hashlib.sha1(card_path.read_bytes()).hexdigest()[:10]
    )
    url = f"{CARD_URL}?v={integration.version}-{digest}"
    add_extra_js_url(hass, url)
    # Also in the legacy build, which Home Assistant serves to some older
    # mobile web views - otherwise the card can be missing there.
    add_extra_js_url(hass, url, es5=True)
    # the files the card fetches when a feature is first used, each with its own fingerprint
    def _digests() -> dict[str, str]:
        return {mod: hashlib.sha1((www / name).read_bytes()).hexdigest()[:10] if (www / name).exists() else "0"
                for mod, name in LAZY_FILES.items()}

    digests = await hass.async_add_executor_job(_digests)
    hass.data[f"{DOMAIN}_modules"] = {mod: f"/{DOMAIN}/{name}?v={integration.version}-{digests[mod]}"
                                     for mod, name in LAZY_FILES.items()}
    hass.data[f"{DOMAIN}_card_registered"] = True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await _async_register_card(hass)

    messenger = Messenger(hass)
    await messenger.async_load()
    hass.data[DOMAIN] = messenger

    async def _push(thread, msg, users):
        await async_push(hass, messenger, thread, msg, users)

    messenger.push_callback = _push

    async def _alert(thread, uids, title, body, options):
        await async_alert(hass, messenger, thread, uids, title, body, options)

    messenger.alert_callback = _alert

    async def _ring(thread, msg, uids):
        await async_ring(hass, messenger, thread, msg, uids)

    async def _ring_clear(thread, msg, uids):
        await async_ring_clear(hass, messenger, thread, msg, uids)

    messenger.ring_callback = _ring
    messenger.ring_clear_callback = _ring_clear
    entry.async_on_unload(messenger.async_stop_ring)
    # Send Later timers and Check Ins carry on after a restart
    messenger.async_start_features()
    messenger.async_start_more()
    entry.async_on_unload(messenger.async_stop_features)

    # The Feed: its notifications, scheduled posts, event reminders and daily jobs
    async def _feed_notify(uids, post, title, body, comment_id=None, group_id=None, why=None, **kw):
        await async_feed_push(hass, messenger, uids, post, title, body, comment_id, group_id, why, **kw)

    messenger.feed.notify_callback = _feed_notify
    messenger.feed.start()
    entry.async_on_unload(messenger.feed.stop)

    # Messages to the "Home Assistant" chat are answered by the conversation agent
    from .ai import Assistant
    messenger.message_hook = Assistant(hass, messenger).async_on_message

    if not hass.data.get(f"{DOMAIN}_views_registered"):
        hass.http.register_view(UploadView(hass))
        hass.http.register_view(MediaView(hass))
        hass.http.register_view(PushMediaView(hass))
        hass.http.register_view(PushImageView(hass))
        hass.http.register_view(BackupView(hass))
        websocket.async_register(hass)
        hass.data[f"{DOMAIN}_views_registered"] = True

    # Keep Messages: tidy up now and every hour.
    await messenger.async_cleanup()

    async def _cleanup(_now) -> None:
        await messenger.async_cleanup()

    entry.async_on_unload(async_track_time_interval(hass, _cleanup, timedelta(minutes=CLEANUP_INTERVAL_MINUTES)))

    # Disappearing messages are checked every minute
    async def _expire(_now) -> None:
        await messenger.async_expire()

    entry.async_on_unload(async_track_time_interval(hass, _expire, timedelta(minutes=1)))

    # Each person's sensors
    entry.async_on_unload(await messenger.entities.async_start())
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Reply typed into a phone notification.
    async def _on_notification_action(event: Event) -> None:
        data = event.data or {}
        action = str(data.get("action") or "")
        text = str(data.get("reply_text") or "").strip()
        uid = event.context.user_id
        # Discard on a "Send link to…" notification (Share to Home Assistant)
        if action.startswith(share.DISCARD_PREFIX) and uid:
            await share.async_done(hass, messenger, uid, action[len(share.DISCARD_PREFIX):])
            return
        # Buttons on Feed notifications (and Android's Reply box on one) - before the chat Reply below,
        # whose "crow_" tags would otherwise catch "crow_feed_" ones
        if uid and (action.startswith(feedpush.PREFIX) or feedpush.is_feed_reply(action, str(data.get("tag") or ""))):
            await feedpush.async_handle(hass, messenger, uid, action, text, str(data.get("tag") or ""))
            return
        # Tapbacks, Mark as Read, suggested replies, Hide Alerts, I'm Home / On My Way
        if action.startswith(pushplus.PREFIX) and uid:
            try:
                await pushplus.async_handle(messenger, uid, action)
            except MessengerError as err:
                _LOGGER.info("Crow Messenger notification button: %s", err)
            return
        if action.startswith(ACTION_PREFIX) and uid:
            try:
                await messenger.async_push_action(uid, action)
            except MessengerError as err:
                _LOGGER.info("Crow Messenger button from notification: %s", err)
            return
        if not text or not uid:
            return
        thread_id = None
        tag = str(data.get("tag") or "")
        if action.startswith(REPLY_ACTION_PREFIX):
            thread_id = action[len(REPLY_ACTION_PREFIX):]
        elif action == "REPLY":
            if tag.startswith(TAG_PREFIX):
                thread_id = tag[len(TAG_PREFIX):].split("_")[0]
            else:
                # Some Android versions don't send the tag back: accept the
                # reply only if it matches the last notification we sent this
                # person, so replies to other automations are never captured.
                last = messenger.last_notified.get(uid)
                if last and data.get("title") == last["title"] and now_ms() - last["ts"] < 6 * 3_600_000:
                    thread_id = last["thread"]
        if not thread_id:
            return
        try:
            await messenger.async_send(uid, thread_id, text, [])
        except MessengerError as err:
            _LOGGER.warning("Crow Messenger could not post notification reply: %s", err)
            return
        if action == "REPLY" and tag:
            await async_clear_android(hass, messenger, uid, tag)

    entry.async_on_unload(hass.bus.async_listen("mobile_app_notification_action", _on_notification_action))

    # A link (or text) shared to the Home Assistant app from a phone's share sheet
    async def _on_share(event: Event) -> None:
        try:
            await share.async_on_share(hass, messenger, event)
        except Exception:  # noqa: BLE001 - never let a share break anything else
            _LOGGER.exception("Crow Messenger could not handle a shared link")

    entry.async_on_unload(hass.bus.async_listen(share.EVENT_SHARE, _on_share))

    async def _handle_send(call: ServiceCall) -> None:
        await _async_service_send(hass, messenger, call)

    hass.services.async_register(DOMAIN, SERVICE_SEND_MESSAGE, _handle_send, schema=SEND_SCHEMA)

    async def _handle_post(call: ServiceCall) -> None:
        await _async_service_post(hass, messenger, call)

    hass.services.async_register(DOMAIN, SERVICE_POST, _handle_post, schema=POST_SCHEMA)
    return True


async def _async_service_send(hass: HomeAssistant, messenger: Messenger, call: ServiceCall) -> None:
    users = await messenger.async_users()
    to = call.data["to"]
    if isinstance(to, str):
        to = [t.strip() for t in to.split(",") if t.strip()]

    persons = {s.entity_id: s.attributes.get("user_id") for s in hass.states.async_all("person")}

    def resolve(value: str) -> str:
        low = value.lower()
        if value in persons and persons[value]:
            return persons[value]
        for user in users:
            if value == user["id"] or low in (user["name"].lower(), user["ha_name"].lower()):
                return user["id"]
        raise HomeAssistantError(f"Crow Messenger: no Home Assistant user called '{value}'")

    recipients = [resolve(t) for t in to]
    sender = call.context.user_id if call.context.user_id in {u["id"] for u in users} else HA_SENDER_ID
    recipients = [r for r in dict.fromkeys(recipients) if r != sender]
    if not recipients:
        raise HomeAssistantError("Crow Messenger: no one to send to")

    try:
        thread = await messenger.async_create_thread(sender, recipients, call.data.get("group_name", ""))
        attachment_ids = []
        if call.data.get("attachment"):
            attachment_ids.append(await _async_import_file(hass, messenger, sender, thread["id"], call.data["attachment"],
                                                           caller=call.context.user_id))
        extra = {"actions": call.data["actions"]} if call.data.get("actions") else None
        await messenger.async_send(sender, thread["id"], call.data["message"], attachment_ids, extra=extra)
    except MessengerError as err:
        raise HomeAssistantError(f"Crow Messenger: {err}") from err


async def _async_resolve_people(hass: HomeAssistant, messenger: Messenger, names: list[str]) -> list[str]:
    users = await messenger.async_users()
    persons = {s.entity_id: s.attributes.get("user_id") for s in hass.states.async_all("person")}
    out = []
    for value in names:
        low = value.lower()
        if value in persons and persons[value]:
            out.append(persons[value])
            continue
        match = next((u["id"] for u in users if value == u["id"] or low in (u["name"].lower(), u["ha_name"].lower())), None)
        if not match:
            raise HomeAssistantError(f"Crow Messenger: no Home Assistant user called '{value}'")
        out.append(match)
    return list(dict.fromkeys(out))


async def _async_service_post(hass: HomeAssistant, messenger: Messenger, call: ServiceCall) -> None:
    """crow_messenger.post: a post in the Feed from an automation (as Home Assistant, or as the person
    whose action it was), to everyone, chosen people or a group."""
    feed = messenger.feed
    if not feed.enabled():
        raise HomeAssistantError("Crow Messenger: the Feed is switched off")
    users = {u["id"] for u in await messenger.async_users()}
    author = call.context.user_id if call.context.user_id in users else HA_SENDER_ID
    to = call.data.get("to")
    if isinstance(to, str):
        to = [t.strip() for t in to.split(",") if t.strip()]
    audience: dict = {"type": "everyone"}
    if call.data.get("group"):
        name = call.data["group"].strip().lower()
        group = next((g for g in feed.data["groups"].values() if g["name"].lower() == name), None)
        if not group:
            raise HomeAssistantError(f"Crow Messenger: there's no Feed group called '{call.data['group']}'")
        audience = {"type": "group", "group": group["id"]}
        if author != HA_SENDER_ID and author not in group["members"]:
            raise HomeAssistantError("Crow Messenger: you're not in that group")
    elif to and [t for t in to if t.lower() not in ("everyone", "all")]:
        people = await _async_resolve_people(hass, messenger, to)
        audience = {"type": "people", "people": [p for p in people if p != author]}
    files = call.data.get("attachment") or []
    if isinstance(files, str):
        files = [files]
    media = []
    try:
        for src in files[:20]:
            media.append(await _async_import_file(hass, messenger, author, None, src, caller=call.context.user_id))
        await feed.async_automation_post(author, call.data["message"], audience, media, call.data.get("background"))
    except MessengerError as err:
        for aid in media:
            await messenger.async_discard_upload(author, aid)
        raise HomeAssistantError(f"Crow Messenger: {err}") from err


async def _async_import_file(hass: HomeAssistant, messenger: Messenger, sender: str, thread_id: str | None, source: str,
                             caller: str | None = None) -> str:
    """Copy a file named in a service call into Crow Messenger's private folder.

    Automations and administrators can attach from any folder Home Assistant allows
    (allowlist_external_dirs). Everyone else can only attach from the www and media folders,
    so a family member can't copy private files (secrets.yaml, .storage) into a chat."""
    restricted = False
    if caller:
        user = await hass.auth.async_get_user(caller)
        restricted = not (user and user.is_admin)
    media_dirs = dict(hass.config.media_dirs or {})
    www = hass.config.path("www")

    def resolve() -> str:
        src = source.split("?")[0]
        if src.startswith("/local/"):
            path = os.path.join(www, src[len("/local/"):])
        elif src.startswith("/media/"):
            key, _, rest = src[len("/media/"):].partition("/")
            if key not in media_dirs:
                raise HomeAssistantError(f"Crow Messenger: there's no media folder called '{key}'")
            path = os.path.join(media_dirs[key], rest)
        else:
            path = src
        # the real location, after following any links and ../
        path = os.path.realpath(path)
        if restricted:
            roots = [os.path.realpath(r) for r in (www, *media_dirs.values())]
            if not any(path == r or path.startswith(r.rstrip(os.sep) + os.sep) for r in roots):
                raise HomeAssistantError(
                    f"Crow Messenger: {source} can't be attached. Only files in the www folder (/local/...) "
                    "or a media folder (/media/local/...) can be attached by people who aren't administrators")
        if not hass.config.is_allowed_path(path):
            raise HomeAssistantError(
                f"Crow Messenger: {source} is not in an allowed folder (see allowlist_external_dirs)")
        if not os.path.isfile(path):
            raise HomeAssistantError(f"Crow Messenger: file not found: {source}")
        return path

    path = await hass.async_add_executor_job(resolve)
    aid = new_id()
    name = os.path.basename(path)
    file_name = f"{aid}_{name[-80:]}"
    dest = os.path.join(messenger.media_dir, file_name)
    await hass.async_add_executor_job(shutil.copyfile, path, dest)
    size = await hass.async_add_executor_job(os.path.getsize, dest)
    messenger.register_upload(sender, thread_id, {
        "id": aid, "name": name, "file": file_name, "size": size,
        "mime": mimetypes.guess_type(name)[0] or "application/octet-stream",
    })
    return aid


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Crow Messenger deleted in Settings → Devices & Services: its data and files go too."""
    from .reset import async_remove_all
    await async_remove_all(hass)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    hass.services.async_remove(DOMAIN, SERVICE_SEND_MESSAGE)
    hass.services.async_remove(DOMAIN, SERVICE_POST)
    m = hass.data.pop(DOMAIN, None)
    if m is not None and getattr(m, "badge", None):
        m.badge.unload()
    if m is not None:
        await m.async_flush()
    return True
