"""Websocket commands used by the Crow Messenger card and its editor.

Every command works on behalf of `connection.user` - there is no way to ask
for another person's chats or contacts. Commands that change household-wide
settings (dashboards, notifications, Keep Messages) are admin-only.
"""
from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, RETENTION_CHOICES
from . import ai
from . import share
from .manager import Messenger, MessengerError
from .notify import mobile_devices


def _m(hass: HomeAssistant) -> Messenger:
    return hass.data[DOMAIN]


def _errors(func: Callable) -> Callable:
    """Turn MessengerError into a websocket error instead of a traceback."""

    @wraps(func)
    async def wrapper(hass, connection, msg):
        try:
            await func(hass, connection, msg)
        except MessengerError as err:
            connection.send_error(msg["id"], err.code, str(err))

    return wrapper


# What the card may send along with a message (checked again in features.py)
EXTRA_SCHEMA = vol.Schema({
    vol.Optional("type"): vol.In(("text", "poll", "checkin", "sticker", "entity", "location", "checklist", "event", "contact", "call",
                                  "timer", "game", "status", "locreq", "ring")),
    vol.Optional("timer"): vol.Schema({vol.Required("seconds"): vol.Coerce(int)}),
    vol.Optional("ring"): vol.Schema({vol.Optional("to"): [str]}),
    vol.Optional("game"): vol.Schema({vol.Required("kind"): vol.In(("ttt", "c4", "rev", "dr", "sea"))}),
    vol.Optional("reply_ext"): vol.Schema({vol.Required("thread_id"): str, vol.Required("message_id"): str}),
    vol.Optional("view_once"): bool,
    vol.Optional("ttl"): vol.In((60, 3600, 86400)),
    vol.Optional("location"): vol.Schema({vol.Optional("lat"): vol.Coerce(float), vol.Optional("lon"): vol.Coerce(float),
                                          vol.Optional("accuracy"): vol.Any(None, vol.Coerce(float)), vol.Optional("label"): str,
                                          vol.Optional("live_minutes"): int}),
    vol.Optional("checklist"): vol.Schema({vol.Required("items"): [str], vol.Optional("todo_entity"): str}),
    vol.Optional("event"): vol.Schema({vol.Required("start"): int, vol.Optional("end"): vol.Any(None, int),
                                       vol.Optional("all_day"): bool, vol.Optional("location"): str,
                                       vol.Optional("zone"): vol.Any(None, str)}),
    vol.Optional("contact"): dict,
    vol.Optional("call"): vol.Schema({vol.Required("kind"): vol.In(("facetime", "facetime_audio", "phone"))}),
    vol.Optional("reply_to"): vol.Any(str, None),
    vol.Optional("effect"): vol.Any(str, None),
    vol.Optional("spans"): [vol.Schema({vol.Required("s"): int, vol.Required("e"): int, vol.Required("style"): str})],
    vol.Optional("mentions"): [str],
    vol.Optional("poll"): vol.Schema({vol.Required("options"): [str], vol.Optional("multi"): bool}),
    vol.Optional("sticker"): vol.Schema({vol.Optional("emoji"): str, vol.Optional("image"): str}),
    vol.Optional("entity"): vol.Schema({vol.Required("entity_id"): str}),
    vol.Optional("checkin"): vol.Schema({vol.Required("zone"): str, vol.Required("due_ts"): int}),
})


async def _aw(value):
    """Lets a plain (non-async) method be used as a _simple handler."""
    return value


def _simple(name: str, schema: dict, handler: Callable) -> Callable:
    """A command that acts on one message and answers with it."""

    @websocket_api.websocket_command({vol.Required("type"): f"crow_messenger/{name}", **schema})
    @websocket_api.async_response
    @_errors
    async def command(hass, connection, msg) -> None:
        result = await handler(_m(hass), connection.user.id, msg)
        # message commands answer with the message itself
        connection.send_result(msg["id"], {"message": result} if "sender" in result else result)

    command.__name__ = "ws_" + name.replace("/", "_")
    return command


_MSG = {vol.Required("thread_id"): str, vol.Required("message_id"): str}

ws_react = _simple("react", {**_MSG, vol.Optional("emoji"): vol.Any(str, None)},
                   lambda m, u, d: m.async_react(u, d["thread_id"], d["message_id"], d.get("emoji")))
ws_edit = _simple("edit", {**_MSG, vol.Required("text"): str, vol.Optional("spans"): list},
                  lambda m, u, d: m.async_edit(u, d["thread_id"], d["message_id"], d["text"], d.get("spans")))
ws_vote = _simple("poll/vote", {**_MSG, vol.Required("options"): [str]},
                  lambda m, u, d: m.async_vote(u, d["thread_id"], d["message_id"], d["options"]))
ws_poll_add = _simple("poll/add", {**_MSG, vol.Required("text"): str},
                      lambda m, u, d: m.async_poll_add(u, d["thread_id"], d["message_id"], d["text"]))
ws_action = _simple("action", {**_MSG, vol.Required("action"): str},
                    lambda m, u, d: m.async_take_action(u, d["thread_id"], d["message_id"], d["action"]))
ws_checkin = _simple("checkin", {**_MSG, vol.Optional("end", default=False): bool,
                                 vol.Optional("add_minutes", default=0): int},
                     lambda m, u, d: m.async_checkin_update(u, d["thread_id"], d["message_id"],
                                                            d["end"], d["add_minutes"]))
ws_place_sticker = _simple("sticker/place", {
    **_MSG, vol.Required("sticker"): vol.Schema({vol.Optional("emoji"): str, vol.Optional("image"): str}),
    vol.Optional("x", default=0.8): vol.Coerce(float), vol.Optional("y", default=0.0): vol.Coerce(float),
    vol.Optional("rot", default=0): vol.Coerce(float), vol.Optional("scale", default=1): vol.Coerce(float)},
    lambda m, u, d: m.async_place_sticker(u, d["thread_id"], d["message_id"], d["sticker"],
                                          d["x"], d["y"], d["rot"], d["scale"]))
ws_remove_sticker = _simple("sticker/remove", {**_MSG, vol.Required("sticker_id"): str},
                            lambda m, u, d: m.async_remove_sticker(u, d["thread_id"], d["message_id"], d["sticker_id"]))


async def _disappear(m, u, d):
    return {"thread": await m.async_set_disappear(u, d["thread_id"], d["seconds"])}


async def _flag(m, u, d):
    if d["flag"] == "archived":
        return {"thread": m.set_archived(u, d["thread_id"], d["on"])}
    return {"thread": m.set_flag(u, d["thread_id"], d["flag"], d["on"])}


async def _reminder(m, u, d):
    return {"thread": m.set_reminder(u, d["thread_id"], d["message_id"], d.get("at"))}


async def _sched_list(m, u, d):
    return {"items": m.scheduled_for(u, d.get("thread_id"))}


async def _sched_cancel(m, u, d):
    await m.async_cancel_scheduled(u, d["scheduled_id"])
    return {}


async def _sched_now(m, u, d):
    await m.async_send_scheduled(d["scheduled_id"], u)
    return {}


async def _stickers_get(m, u, d):
    return {"images": m.sticker_images(d["ids"])}


async def _stickers_save(m, u, d):
    return {"sticker": m.save_sticker(u, d["image"]), "stickers": m.stickers_for(u)}


async def _stickers_delete(m, u, d):
    m.delete_sticker(u, d["sticker"])
    return {"stickers": m.stickers_for(u)}


async def _zones(m, u, d):
    person = m.person_for(u)
    return {"zones": m.zones(), "person": person.entity_id if person else None}


ws_disappear = _simple("disappear", {vol.Required("thread_id"): str,
                                     vol.Required("seconds"): int}, _disappear)
ws_flag = _simple("flag", {vol.Required("thread_id"): str, vol.Required("flag"): vol.In(("pinned", "marked_unread", "archived")),
                           vol.Required("on"): bool}, _flag)
ws_sched_list = _simple("scheduled/list", {vol.Optional("thread_id"): str}, _sched_list)
ws_sched_cancel = _simple("scheduled/cancel", {vol.Required("scheduled_id"): str}, _sched_cancel)
ws_sched_now = _simple("scheduled/send_now", {vol.Required("scheduled_id"): str}, _sched_now)
ws_stickers_get = _simple("stickers/get", {vol.Required("ids"): [str]}, _stickers_get)
ws_stickers_save = _simple("stickers/save", {vol.Required("image"): str}, _stickers_save)
ws_stickers_delete = _simple("stickers/delete", {vol.Required("sticker"): str}, _stickers_delete)
ws_zones = _simple("zones", {}, _zones)
ws_timer = _simple("timer", {**_MSG, vol.Required("action"): vol.In(("cancel", "add")), vol.Optional("minutes"): vol.Coerce(int)},
                   lambda m, u, d: m.async_timer_update(u, d["thread_id"], d["message_id"], d["action"], d.get("minutes", 0)))
ws_game = _simple("game/move", {**_MSG, vol.Required("move"): vol.Any(int, str, [int])},
                  lambda m, u, d: m.async_game_move(u, d["thread_id"], d["message_id"], d["move"]))
ws_reminder = _simple("reminder/set", {**_MSG, vol.Optional("at"): vol.Any(None, int)}, _reminder)
ws_ring = _simple("ring/answer", {**_MSG, vol.Required("answer"): vol.In(("found", "stop"))},
                  lambda m, u, d: m.async_ring_answer(u, d["thread_id"], d["message_id"], d["answer"]))
ws_locreq = _simple("locreq/answer", {**_MSG, vol.Required("answer"): vol.In(("share", "decline"))},
                    lambda m, u, d: m.async_locreq_answer(u, d["thread_id"], d["message_id"], d["answer"]))
ws_game_fleet = _simple("game/fleet", _MSG, lambda m, u, d: m.async_game_fleet(u, d["thread_id"], d["message_id"]))
ws_game_shuffle = _simple("game/shuffle", _MSG, lambda m, u, d: m.async_game_shuffle(u, d["thread_id"], d["message_id"]))


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/zone_create",
    vol.Required("name"): vol.All(str, vol.Length(min=1, max=100)),
    vol.Required("latitude"): vol.All(vol.Coerce(float), vol.Range(min=-90, max=90)),
    vol.Required("longitude"): vol.All(vol.Coerce(float), vol.Range(min=-180, max=180)),
    vol.Optional("radius"): vol.All(vol.Coerce(float), vol.Range(min=10, max=2000)),
})
@websocket_api.async_response
@_errors
async def ws_zone_create(hass, connection, msg) -> None:
    """Add a zone from the card - for anyone, unless an admin has turned that off."""
    result = await _m(hass).async_create_zone(connection.user.is_admin, msg)
    connection.send_result(msg["id"], result)


# ── More features (features2.py) ───────────────────────────────────────────
async def _mute(m, u, d):
    return {"thread": m.set_mute(u, d["thread_id"], d.get("minutes"))}


async def _star(m, u, d):
    return {"thread": m.set_star(u, d["thread_id"], d["message_id"], d["on"])}


async def _starred(m, u, d):
    return {"messages": m.starred_for(u)}


async def _pin_message(m, u, d):
    return {"thread": await m.async_pin_message(u, d["thread_id"], d["message_id"], d["on"])}


async def _nickname(m, u, d):
    return {"thread": await m.async_set_nickname(u, d["thread_id"], d["user_id"], d.get("name", ""))}


async def _quick(m, u, d):
    return {"thread": m.set_quick(u, d["thread_id"], d.get("emoji", ""))}


async def _info(m, u, d):
    return m.message_info(u, d["thread_id"], d["message_id"])


async def _media(m, u, d):
    return m.media_for(u, d["thread_id"])


async def _since(m, u, d):
    return m.messages_since(u, d["thread_id"], d["since"])


async def _forward(m, u, d):
    return {"messages": await m.async_forward(u, d["thread_id"], d["message_id"], d["to"])}


async def _notify_anyway(m, u, d):
    await m.async_notify_anyway(u, d["thread_id"])
    return {}


async def _presence(m, u, d):
    return {"presence": m.presence_all(u)}


ws_mute = _simple("mute", {vol.Required("thread_id"): str, vol.Optional("minutes"): vol.Any(None, int)}, _mute)
ws_star = _simple("star", {**_MSG, vol.Required("on"): bool}, _star)
ws_starred = _simple("starred", {}, _starred)
ws_pin_message = _simple("pin_message", {**_MSG, vol.Required("on"): bool}, _pin_message)
ws_nickname = _simple("nickname", {vol.Required("thread_id"): str, vol.Required("user_id"): str, vol.Optional("name"): str}, _nickname)
async def _share_hidden(m, u, d):
    return m.set_share_hidden(u, d["entity_id"], d["hidden"])


ws_share_hidden = _simple("share_hidden", {vol.Required("entity_id"): str, vol.Required("hidden"): bool}, _share_hidden)
ws_quick = _simple("quick", {vol.Required("thread_id"): str, vol.Optional("emoji"): str}, _quick)
ws_info = _simple("message_info", _MSG, _info)
ws_media = _simple("media", {vol.Required("thread_id"): str}, _media)
ws_since = _simple("messages_since", {vol.Required("thread_id"): str, vol.Required("since"): int}, _since)
ws_forward = _simple("forward", {**_MSG, vol.Required("to"): [str]}, _forward)
ws_live_stop = _simple("location/stop", _MSG, lambda m, u, d: _aw(m.stop_live(u, d["thread_id"], d["message_id"])))
ws_checklist = _simple("checklist", {**_MSG, vol.Required("op"): vol.In(("toggle", "add", "remove")),
                                     vol.Optional("item_id"): str, vol.Optional("text"): str},
                       lambda m, u, d: m.async_checklist(u, d["thread_id"], d["message_id"], d["op"], d.get("item_id"), d.get("text")))
ws_rsvp = _simple("rsvp", {**_MSG, vol.Optional("answer"): vol.Any(None, str)},
                  lambda m, u, d: m.rsvp(u, d["thread_id"], d["message_id"], d.get("answer")))
ws_view_once = _simple("view_once/opened", _MSG, lambda m, u, d: m.async_view_once_opened(u, d["thread_id"], d["message_id"]))
ws_notify_anyway = _simple("notify_anyway", {vol.Required("thread_id"): str}, _notify_anyway)
ws_presence = _simple("presence", {}, _presence)


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    messenger = _m(hass)

    @callback
    def forward(payload: dict) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = messenger.add_subscriber(connection.user.id, forward, id(connection))
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/focus",
    vol.Optional("thread_id"): vol.Any(str, None),
    vol.Optional("visible", default=True): bool,
})
@callback
def ws_focus(hass, connection, msg) -> None:
    _m(hass).set_focus(id(connection), msg.get("thread_id"), msg["visible"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/here", vol.Required("path"): str})
@callback
def ws_here(hass, connection, msg) -> None:
    """The card reports which dashboard it's on - used when no dashboard is chosen for this person."""
    _m(hass).set_auto_path(connection.user.id, msg["path"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/share/get", vol.Required("share_id"): str})
@websocket_api.async_response
@_errors
async def ws_share_get(hass, connection, msg) -> None:
    """A link shared from this person's phone, waiting to be sent to a chat."""
    connection.send_result(msg["id"], {"share": share.view(share.get(_m(hass), connection.user.id, msg["share_id"]))})


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/share/done", vol.Required("share_id"): str})
@websocket_api.async_response
@_errors
async def ws_share_done(hass, connection, msg) -> None:
    """Sent (or discarded): forget it and take its notification off the phones."""
    await share.async_done(hass, _m(hass), connection.user.id, msg["share_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/bootstrap"})
@websocket_api.async_response
@_errors
async def ws_bootstrap(hass, connection, msg) -> None:
    """Everything the card needs on first load, in one round trip."""
    messenger = _m(hass)
    uid = connection.user.id
    settings = messenger.settings
    connection.send_result(msg["id"], {
        "me": uid,
        "is_admin": connection.user.is_admin,
        "users": await messenger.async_users(),
        "threads": messenger.threads_for(uid),
        "contacts": messenger.contacts_for(uid),
        "profile": messenger.profile_for(uid),
        "backgrounds": messenger.backgrounds_for(uid),
        "themes": messenger.themes_for(uid),
        "ai": ai.capabilities(hass, messenger),
        "stickers": messenger.stickers_for(uid),
        "focus_entities": messenger.focus_entities(),
        "presence": messenger.presence_all(uid),
        "share_hidden": messenger.share_hidden(),
        "scheduled": messenger.scheduled_for(uid),
        "shares": share.pending(messenger, uid),
        "features": {"link_previews": messenger._feature("link_previews"),
                     "checkin": messenger.person_for(uid) is not None,
                     "zones": connection.user.is_admin or messenger._feature("zones")},
        "limits": {"max_upload_mb": settings.get("max_upload_mb", 300),
                   "retention_days": settings.get("retention_days", 30)},
    })


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/threads"})
@websocket_api.async_response
@_errors
async def ws_threads(hass, connection, msg) -> None:
    connection.send_result(msg["id"], {"threads": _m(hass).threads_for(connection.user.id)})


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/messages",
    vol.Required("thread_id"): str,
    vol.Optional("before"): vol.Any(int, None),
    vol.Optional("limit", default=60): vol.All(int, vol.Range(min=1, max=200)),
})
@websocket_api.async_response
@_errors
async def ws_messages(hass, connection, msg) -> None:
    connection.send_result(msg["id"], _m(hass).messages_for(
        connection.user.id, msg["thread_id"], msg.get("before"), msg["limit"]))


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/create_thread",
    vol.Required("participants"): [str],
    vol.Optional("name", default=""): str,
})
@websocket_api.async_response
@_errors
async def ws_create_thread(hass, connection, msg) -> None:
    thread = await _m(hass).async_create_thread(connection.user.id, msg["participants"], msg["name"])
    connection.send_result(msg["id"], {"thread": thread})


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/send",
    vol.Required("thread_id"): str,
    vol.Optional("text", default=""): str,
    vol.Optional("attachments", default=[]): [str],
    vol.Optional("extra"): EXTRA_SCHEMA,
    vol.Optional("at"): vol.Any(int, None),  # Send Later
    # Send Later "when I arrive at / leave" a zone
    vol.Optional("place"): vol.Schema({vol.Required("zone"): str, vol.Required("on"): vol.In(("arrive", "leave"))}),
})
@websocket_api.async_response
@_errors
async def ws_send(hass, connection, msg) -> None:
    m = _m(hass)
    extra = msg.get("extra") or {}
    if msg.get("at") or msg.get("place"):
        item = await m.async_schedule(connection.user.id, msg["thread_id"], msg["text"], msg["attachments"],
                                      extra, msg.get("at"), place=msg.get("place"))
        connection.send_result(msg["id"], {"scheduled": {"id": item["id"], "at": item["at"], "place": item.get("place")}})
        return
    message = await m.async_send(connection.user.id, msg["thread_id"], msg["text"], msg["attachments"], extra=extra)
    connection.send_result(msg["id"], {"message": message})


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/mark_read", vol.Required("thread_id"): str})
@websocket_api.async_response
@_errors
async def ws_mark_read(hass, connection, msg) -> None:
    _m(hass).mark_read(connection.user.id, msg["thread_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/typing",
    vol.Required("thread_id"): str,
    vol.Optional("active", default=True): bool,
})
@websocket_api.async_response
@_errors
async def ws_typing(hass, connection, msg) -> None:
    _m(hass).typing(connection.user.id, msg["thread_id"], msg["active"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/update_thread",
    vol.Required("thread_id"): str,
    vol.Optional("name"): str,
    vol.Optional("photo"): vol.Any(str, None),
    vol.Optional("add"): [str],
    vol.Optional("muted"): bool,
})
@websocket_api.async_response
@_errors
async def ws_update_thread(hass, connection, msg) -> None:
    photo = msg.get("photo") if "photo" in msg else None
    if "photo" in msg and msg["photo"] is None:
        photo = ""
    thread = await _m(hass).async_update_thread(
        connection.user.id, msg["thread_id"], name=msg.get("name"), photo=photo,
        add=msg.get("add"), muted=msg.get("muted"))
    connection.send_result(msg["id"], {"thread": thread})


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/leave_thread", vol.Required("thread_id"): str})
@websocket_api.async_response
@_errors
async def ws_leave(hass, connection, msg) -> None:
    await _m(hass).async_leave(connection.user.id, msg["thread_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/delete_thread", vol.Required("thread_id"): str})
@websocket_api.async_response
@_errors
async def ws_delete_thread(hass, connection, msg) -> None:
    await _m(hass).async_delete_for_me(connection.user.id, msg["thread_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/delete_message",
    vol.Required("thread_id"): str,
    vol.Required("message_id"): str,
    vol.Optional("parts"): [str],
})
@websocket_api.async_response
@_errors
async def ws_delete_message(hass, connection, msg) -> None:
    """Delete a message (or one photo or the words of it) for yourself, like Apple Messages."""
    thread = await _m(hass).async_delete_items(connection.user.id, msg["thread_id"], msg["message_id"], msg.get("parts"))
    connection.send_result(msg["id"], {"thread": thread})


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/unsend",
    vol.Required("thread_id"): str,
    vol.Required("message_id"): str,
})
@websocket_api.async_response
@_errors
async def ws_unsend(hass, connection, msg) -> None:
    await _m(hass).async_unsend(connection.user.id, msg["thread_id"], msg["message_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/remove_attachment",
    vol.Required("thread_id"): str,
    vol.Required("attachment_id"): str,
})
@websocket_api.async_response
@_errors
async def ws_remove_attachment(hass, connection, msg) -> None:
    """Delete one attachment from the server for everyone (its sender or an administrator)."""
    await _m(hass).async_remove_from_server(connection.user.id, connection.user.is_admin, msg["thread_id"], msg["attachment_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/storage/get"})
@websocket_api.require_admin
@websocket_api.async_response
@_errors
async def ws_storage_get(hass, connection, msg) -> None:
    connection.send_result(msg["id"], _m(hass).storage_stats())


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/storage/clear",
    vol.Required("older_than_days"): vol.All(int, vol.Range(min=0, max=36500)),
})
@websocket_api.require_admin
@websocket_api.async_response
@_errors
async def ws_storage_clear(hass, connection, msg) -> None:
    """Delete sent photos, videos and files from the server (0 = all of them)."""
    connection.send_result(msg["id"], await _m(hass).async_clear_attachments(msg["older_than_days"]))


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/discard_upload", vol.Required("attachment_id"): str})
@websocket_api.async_response
@_errors
async def ws_discard_upload(hass, connection, msg) -> None:
    await _m(hass).async_discard_upload(connection.user.id, msg["attachment_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/search",
    vol.Optional("query", default=""): str,
    vol.Optional("kind"): vol.Any(None, vol.In(("photos", "links", "files", "locations"))),
    vol.Optional("thread_id"): vol.Any(None, str),
})
@websocket_api.async_response
@_errors
async def ws_search(hass, connection, msg) -> None:
    connection.send_result(msg["id"], {"messages": _m(hass).search_more(
        connection.user.id, msg["query"], msg.get("kind"), msg.get("thread_id"))})


# ── Contacts & profile ──────────────────────────────────────────────────────
@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/contacts/save", vol.Required("contacts"): [dict]})
@websocket_api.async_response
@_errors
async def ws_contacts_save(hass, connection, msg) -> None:
    saved = _m(hass).save_contacts(connection.user.id, msg["contacts"])
    connection.send_result(msg["id"], {"contacts": saved})


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/contacts/delete", vol.Required("ids"): [str]})
@websocket_api.async_response
@_errors
async def ws_contacts_delete(hass, connection, msg) -> None:
    _m(hass).delete_contacts(connection.user.id, msg["ids"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/profile/set",
    vol.Optional("share"): bool,
    vol.Optional("name"): str,
    vol.Optional("photo"): vol.Any(str, None),
    vol.Optional("my_card"): vol.Any(str, None),
    vol.Optional("activity"): bool,
    vol.Optional("skin"): vol.All(str, vol.Length(max=24)),
    vol.Optional("keep_archived"): bool,
})
@websocket_api.async_response
@_errors
async def ws_profile_set(hass, connection, msg) -> None:
    patch = {k: msg[k] for k in ("share", "name", "photo", "my_card", "activity", "skin", "keep_archived") if k in msg}
    profile = await _m(hass).async_set_profile(connection.user.id, patch)
    connection.send_result(msg["id"], {"profile": profile})


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/background/set",
    vol.Required("key"): str,
    vol.Optional("image"): vol.Any(str, None),
})
@websocket_api.async_response
@_errors
async def ws_background_set(hass, connection, msg) -> None:
    backgrounds = _m(hass).set_background(connection.user.id, msg["key"], msg.get("image"))
    connection.send_result(msg["id"], {"backgrounds": backgrounds})


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/theme/set",
    vol.Required("key"): str,
    vol.Optional("theme"): vol.Any(str, None),
})
@websocket_api.async_response
@_errors
async def ws_theme_set(hass, connection, msg) -> None:
    themes = _m(hass).set_theme(connection.user.id, msg["key"], msg.get("theme"))
    connection.send_result(msg["id"], {"themes": themes})


# ── AI Features ─────────────────────────────────────────────────────────────
AI_FEATURE_FOR = {"replies": "replies", "rewrite": "writing", "summarise": "catchup", "translate": "translate",
                  "event": "actions", "reminder": "actions", "describe": "photos", "ask": "ask"}


@websocket_api.websocket_command({
    vol.Required("type"): "crow_messenger/ai",
    vol.Required("action"): vol.In(list(AI_FEATURE_FOR)),
    vol.Optional("thread_id"): str,
    vol.Optional("message_id"): str,
    vol.Optional("attachment_id"): str,
    vol.Optional("text"): vol.All(str, vol.Length(max=10000)),
    vol.Optional("style"): str,
    vol.Optional("language"): str,
    vol.Optional("count"): vol.All(int, vol.Range(min=1, max=200)),
})
@websocket_api.async_response
@_errors
async def ws_ai(hass, connection, msg) -> None:
    """One AI request from the card, for the person using it."""
    messenger = _m(hass)
    action, uid = msg["action"], connection.user.id
    if not ai.capabilities(hass, messenger).get(AI_FEATURE_FOR[action]):
        raise MessengerError("ai_off", "An administrator has turned this AI feature off.")
    tid = msg.get("thread_id") or ""
    if action == "replies":
        result: object = await ai.suggest_replies(hass, messenger, uid, tid)
    elif action == "rewrite":
        result = await ai.rewrite(hass, messenger, msg.get("text", ""), msg.get("style", ""))
    elif action == "summarise":
        result = await ai.summarise(hass, messenger, uid, tid, msg.get("count", 10))
    elif action == "translate":
        result = await ai.translate(hass, messenger, uid, tid, msg.get("message_id", ""), msg.get("language", ""))
    elif action == "ask":
        result = await ai.ask(hass, messenger, uid, tid, msg.get("text", ""))
    elif action in ("event", "reminder"):
        result = await ai.extract(hass, messenger, uid, tid, msg.get("message_id", ""), action)
    else:
        result = await ai.describe_photo(hass, messenger, uid, tid, msg.get("attachment_id", ""))
    connection.send_result(msg["id"], {"result": result})


# ── Household settings (editor) ─────────────────────────────────────────────
@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/settings/get"})
@websocket_api.async_response
@_errors
async def ws_settings_get(hass, connection, msg) -> None:
    messenger = _m(hass)
    result: dict[str, Any] = {"is_admin": connection.user.is_admin,
                              "retention_days": messenger.settings.get("retention_days", 30)}
    if connection.user.is_admin:
        result.update({
            "settings": messenger.settings,
            "users": await messenger.async_users(),
            "devices": mobile_devices(hass),
            "auto_paths": messenger.data.get("auto_paths", {}),
            "ai": ai.capabilities(hass, messenger),
            "ai_task_default": ai.task_entity(hass, messenger) if not (messenger.settings.get("ai", {}) or {}).get("task_entity") else None,
        })
    connection.send_result(msg["id"], result)


SETTINGS_SCHEMA = vol.Schema({
    vol.Optional("retention_days"): vol.All(int, vol.In(RETENTION_CHOICES)),
    vol.Optional("max_upload_mb"): vol.All(int, vol.Range(min=1, max=2000)),
    vol.Optional("notifications"): vol.Schema({
        vol.Optional("enabled"): bool,
        vol.Optional("show_text"): bool,
        vol.Optional("show_attachment"): bool,
        vol.Optional("sound"): bool,
        vol.Optional("reply_action"): bool,
        vol.Optional("badge"): bool,
        vol.Optional("buttons"): vol.Schema({vol.Optional(k): bool for k in
                                             ("tapbacks", "mark_read", "mute", "home")}),
    }),
    vol.Optional("features"): vol.Schema({
        vol.Optional("link_previews"): bool,
        vol.Optional("zones"): bool,
        vol.Optional("share_sheet"): bool,
    }),
    vol.Optional("dashboard"): vol.Schema({
        vol.Optional("everyone"): bool,
        vol.Optional("path"): vol.All(str, vol.Length(max=200)),
    }),
    vol.Optional("ai"): vol.Schema({
        vol.Optional("enabled"): bool,
        vol.Optional("agent_id"): str,
        vol.Optional("task_entity"): str,
        vol.Optional("features"): {vol.In(ai.FEATURES): bool},
    }),
    vol.Optional("users"): {str: vol.Any(None, vol.Schema({
        vol.Optional("path"): str,
        vol.Optional("dashboard"): str,
        vol.Optional("view"): str,
        vol.Optional("notify"): bool,
        vol.Optional("devices"): {str: bool},
    }))},
})


@websocket_api.websocket_command({vol.Required("type"): "crow_messenger/settings/set", vol.Required("settings"): SETTINGS_SCHEMA})
@websocket_api.require_admin
@websocket_api.async_response
@_errors
async def ws_settings_set(hass, connection, msg) -> None:
    messenger = _m(hass)
    settings = await messenger.async_update_settings(msg["settings"])
    if "ai" in msg["settings"]:
        messenger.broadcast_all({"type": "ai", "ai": ai.capabilities(hass, messenger)})
    connection.send_result(msg["id"], {"settings": settings, "ai": ai.capabilities(hass, messenger)})


COMMANDS = (
    ws_subscribe, ws_focus, ws_here, ws_bootstrap, ws_share_get, ws_share_done, ws_threads, ws_messages, ws_create_thread, ws_send,
    ws_mark_read, ws_typing, ws_update_thread, ws_leave, ws_delete_thread, ws_discard_upload,
    ws_delete_message, ws_unsend, ws_remove_attachment, ws_ai, ws_storage_get, ws_storage_clear,
    ws_react, ws_edit, ws_vote, ws_poll_add, ws_action, ws_checkin, ws_place_sticker,
    ws_remove_sticker, ws_disappear, ws_flag, ws_sched_list, ws_sched_cancel, ws_sched_now, ws_stickers_get,
    ws_stickers_save, ws_stickers_delete, ws_zones, ws_zone_create, ws_timer, ws_game, ws_game_fleet, ws_game_shuffle, ws_reminder, ws_locreq, ws_ring,
    ws_mute, ws_star, ws_starred, ws_pin_message, ws_nickname, ws_quick, ws_share_hidden, ws_info, ws_media, ws_since, ws_forward,
    ws_live_stop, ws_checklist, ws_rsvp, ws_view_once, ws_notify_anyway, ws_presence,
    ws_search, ws_contacts_save, ws_contacts_delete, ws_profile_set, ws_background_set, ws_theme_set, ws_settings_get, ws_settings_set,
)


@callback
def async_register(hass: HomeAssistant) -> None:
    for command in COMMANDS:
        websocket_api.async_register_command(hass, command)
