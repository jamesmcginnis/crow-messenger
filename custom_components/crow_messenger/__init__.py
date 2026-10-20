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
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.loader import async_get_integration

from .const import CLEANUP_INTERVAL_MINUTES, DOMAIN, HA_SENDER_ID, SERVICE_SEND_MESSAGE
from .http import MediaView, PushMediaView, UploadView
from .manager import Messenger, MessengerError, new_id, now_ms
from .const import ACTION_PREFIX
from .notify import REPLY_ACTION_PREFIX, TAG_PREFIX, async_alert, async_clear_android, async_push
from . import websocket

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "crow-messenger-card.js"
CARD_URL = f"/{DOMAIN}/{CARD_FILENAME}"

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
    card_path = Path(__file__).parent / "www" / CARD_FILENAME
    await hass.http.async_register_static_paths([StaticPathConfig(CARD_URL, str(card_path), True)])
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
    # Send Later timers and Check Ins carry on after a restart
    messenger.async_start_features()
    messenger.async_start_more()
    entry.async_on_unload(messenger.async_stop_features)

    # Messages to the "Home Assistant" chat are answered by the conversation agent
    from .ai import Assistant
    messenger.message_hook = Assistant(hass, messenger).async_on_message

    if not hass.data.get(f"{DOMAIN}_views_registered"):
        hass.http.register_view(UploadView(hass))
        hass.http.register_view(MediaView(hass))
        hass.http.register_view(PushMediaView(hass))
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

    # Reply typed into a phone notification.
    async def _on_notification_action(event: Event) -> None:
        data = event.data or {}
        action = str(data.get("action") or "")
        text = str(data.get("reply_text") or "").strip()
        uid = event.context.user_id
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

    async def _handle_send(call: ServiceCall) -> None:
        await _async_service_send(hass, messenger, call)

    hass.services.async_register(DOMAIN, SERVICE_SEND_MESSAGE, _handle_send, schema=SEND_SCHEMA)
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
            attachment_ids.append(await _async_import_file(hass, messenger, sender, thread["id"], call.data["attachment"]))
        extra = {"actions": call.data["actions"]} if call.data.get("actions") else None
        await messenger.async_send(sender, thread["id"], call.data["message"], attachment_ids, extra=extra)
    except MessengerError as err:
        raise HomeAssistantError(f"Crow Messenger: {err}") from err


async def _async_import_file(hass: HomeAssistant, messenger: Messenger, sender: str, thread_id: str, source: str) -> str:
    """Copy a file named in a service call into Crow Messenger's private folder."""
    if source.startswith("/local/"):
        path = hass.config.path("www", source[len("/local/"):].split("?")[0])
    elif source.startswith("/media/local/"):
        path = hass.config.path("media", source[len("/media/local/"):].split("?")[0])
    else:
        path = source
    path = os.path.realpath(path)
    if not hass.config.is_allowed_path(path):
        raise HomeAssistantError(
            f"Crow Messenger: {source} is not in an allowed folder (see allowlist_external_dirs)")
    if not await hass.async_add_executor_job(os.path.isfile, path):
        raise HomeAssistantError(f"Crow Messenger: file not found: {source}")
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


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.services.async_remove(DOMAIN, SERVICE_SEND_MESSAGE)
    m = hass.data.pop(DOMAIN, None)
    if m is not None and getattr(m, "badge", None):
        m.badge.unload()
    return True
