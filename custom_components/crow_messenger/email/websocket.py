"""Websocket commands used by Email in the Crow Messenger card, and its part of the card editor.

Every command acts for `connection.user` and only on that person's own accounts: nobody can
read anyone else's email. Household settings (the Microsoft app registration, AI and the
attachment limit) can only be changed by an administrator.
"""
from __future__ import annotations

import asyncio
import logging
import secrets
import time
from collections.abc import Callable
from functools import wraps

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from . import ai, notifyplus
from .const import DOMAIN, PAGE_SIZE, PROVIDERS
from .manager import MailError, Mailer
from .people import PeopleError

P = f"{DOMAIN}/"
_LOGGER = logging.getLogger(__name__)


def _m(hass: HomeAssistant) -> Mailer:
    mailer = hass.data.get(DOMAIN)
    if mailer is None:
        raise MailError("unavailable", "Email is switched off. An administrator can turn it on on the Email page of the Crow Messenger card editor.")
    return mailer


def _errors(func: Callable) -> Callable:
    @wraps(func)
    async def wrapper(hass, connection, msg):
        try:
            await func(hass, connection, msg)
        except (MailError, PeopleError) as err:
            connection.send_error(msg["id"], err.code, str(err))
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001 - say what went wrong, not "Unknown error" (the details go in the log)
            _LOGGER.exception("Crow Messenger Email: %s failed", msg.get("type"))
            connection.send_error(msg["id"], "failed", f"Something went wrong ({type(err).__name__}: {str(err)[:160] or 'no details'}). Details are in Home Assistant’s log.")
    return wrapper


# Work the card may stop part-way (closing a Smart Search or an AI summary while it's still
# working). The card names the job, and crow_email/stop cancels it. Keyed by person, so
# nobody can stop anyone else's.
JOBS: dict[tuple[str, str], asyncio.Task] = {}
# a stop that arrived before its job had started (closed straight away)
STOPPED_EARLY: dict[tuple[str, str], None] = {}
STOPPING: set[asyncio.Task] = set()   # jobs being stopped by crow_email/stop (not by the connection closing)


def command(name: str, schema: dict | None = None, admin: bool = False):
    """Register func(hass, mailer, uid, msg) -> result as crow_email/<name>."""
    def deco(func: Callable):
        @websocket_api.websocket_command({vol.Required("type"): P + name, vol.Optional("job"): vol.All(str, vol.Length(max=64)),
                                          **(schema or {})})
        @websocket_api.async_response
        @_errors
        async def handler(hass, connection, msg):
            if admin and not connection.user.is_admin:
                raise MailError("unauthorized", "Only an administrator can change this.")
            job = msg.get("job")
            if not job:
                res = func(hass, _m(hass), connection.user.id, msg)
                if hasattr(res, "__await__"):
                    res = await res
                connection.send_result(msg["id"], res)
                return

            async def run():
                res = func(hass, _m(hass), connection.user.id, msg)
                return (await res) if hasattr(res, "__await__") else res
            key = (connection.user.id, job)
            if key in STOPPED_EARLY:
                STOPPED_EARLY.pop(key, None)
                connection.send_error(msg["id"], "cancelled", "Stopped.")
                return
            task = hass.async_create_task(run(), f"crow_email {name}")
            JOBS[key] = task
            try:
                res = await task
            except asyncio.CancelledError:
                if task not in STOPPING:
                    task.cancel()   # the connection itself is closing
                    raise
                connection.send_error(msg["id"], "cancelled", "Stopped.")
                return
            finally:
                STOPPING.discard(task)
                if JOBS.get(key) is task:
                    JOBS.pop(key, None)
            connection.send_result(msg["id"], res)
        COMMANDS.append(handler)
        return func
    return deco


COMMANDS: list[Callable] = []


@websocket_api.websocket_command({vol.Required("type"): P + "stop", vol.Required("job"): vol.All(str, vol.Length(max=64))})
@callback
def ws_stop(hass, connection, msg):
    """Stop a job this person started, if it's still running."""
    key = (connection.user.id, msg["job"])
    task = JOBS.pop(key, None)
    if task and not task.done():
        STOPPING.add(task)
        task.cancel()
    elif not task:
        STOPPED_EARLY[key] = None
        while len(STOPPED_EARLY) > 200:   # only ever a handful; forget the oldest
            STOPPED_EARLY.pop(next(iter(STOPPED_EARLY)))
    connection.send_result(msg["id"], {"stopped": bool(task)})


COMMANDS.append(ws_stop)
ADDR = [vol.Any(str, vol.Schema({vol.Optional("name"): str, vol.Required("email"): str}))]
SWIPE_ACTIONS = ("read", "flag", "pin", "archive", "trash", "move", "junk", "snooze", "remind", "mute", "more")
UIDS = vol.All([vol.Coerce(int)], vol.Length(min=1, max=500))
ACC = vol.Required("account")
FOLDER = vol.Optional("folder", default="INBOX")
ONE_MSG = {vol.Required("account"): str, vol.Optional("folder", default="INBOX"): str, vol.Required("uid"): vol.Coerce(int)}
COMPOSE = {
    vol.Optional("to", default=[]): ADDR, vol.Optional("cc", default=[]): ADDR, vol.Optional("bcc", default=[]): ADDR,
    vol.Optional("subject", default=""): str, vol.Optional("html", default=""): str, vol.Optional("text"): str,
    vol.Optional("attachments", default=[]): [vol.Schema({vol.Optional("upload"): str, vol.Optional("folder"): str,
                                                         vol.Optional("uid"): vol.Coerce(int), vol.Optional("part"): vol.Coerce(int),
                                                         vol.Optional("name"): str, vol.Optional("size"): int,
                                                         vol.Optional("mime"): str}, extra=vol.REMOVE_EXTRA)],
    vol.Optional("reply"): vol.Schema({vol.Required("mode"): vol.In(("reply", "replyall", "forward")),
                                       vol.Optional("folder"): str, vol.Required("uid"): vol.Coerce(int)}),
    vol.Optional("quote", default=True): bool,
    vol.Optional("draft_uid"): vol.Any(None, vol.Coerce(int)),
    # voting buttons, an event invitation, contact cards and a read receipt request
    vol.Optional("poll"): vol.Any(None, vol.Schema({vol.Optional("question", default=""): vol.All(str, vol.Length(max=200)),
                                                   vol.Required("choices"): vol.All([vol.All(str, vol.Length(max=80))], vol.Length(min=2, max=8))})),
    vol.Optional("invite"): vol.Any(None, vol.Schema({vol.Required("title"): vol.All(str, vol.Length(max=200)),
                                                     vol.Required("start"): str, vol.Optional("end"): vol.Any(None, str),
                                                     vol.Optional("location"): vol.All(str, vol.Length(max=300)),
                                                     vol.Optional("description"): vol.All(str, vol.Length(max=2000))})),
    vol.Optional("vcards"): vol.All([vol.Schema({vol.Optional(k): str for k in ("name", "email", "phone", "company", "title", "address", "url", "note", "photo")}, extra=vol.REMOVE_EXTRA)], vol.Length(max=10)),
    vol.Optional("read_receipt"): bool,
}


def _compose(msg: dict) -> dict:
    return {k: msg[k] for k in ("to", "cc", "bcc", "subject", "html", "text", "attachments", "reply", "quote", "draft_uid",
                                "poll", "invite", "vcards", "read_receipt") if k in msg}


# ── everything the card needs to start, and live updates ───────────────────
def _state(hass: HomeAssistant, mailer: Mailer, uid: str, is_admin: bool) -> dict:
    st = mailer.settings
    return {
        "accounts": mailer.accounts_for(uid),
        "vips": mailer.vips(uid),
        "scheduled": mailer.scheduled_for(uid),
        "reminders": mailer.reminders_for(uid),
        "providers": {k: {"name": v["name"], "auth": v["auth"], "help": v["help"], "imap": v["imap"], "smtp": v["smtp"],
                          "sent_copy": v["sent_copy"]} for k, v in PROVIDERS.items()},
        "microsoft_ready": bool(st.get("ms_client_id")),
        "max_attachment_mb": st.get("max_attachment_mb", 25),
        "parcel_keep_days": st.get("parcel_keep_days", 3),
        "ai": ai.capabilities(hass, mailer),
        "is_admin": is_admin,
        "devices": mailer.devices(uid),
        "prefs": mailer.data["prefs"].get(uid, {}),
        "contacts": mailer.book.contacts_for(uid),
        "backgrounds": mailer.book.backgrounds_for(uid),
        "parcels": mailer.smart.parcels_for(uid),
        "food": mailer.orders.list_for(uid, "food"),
        "groceries": mailer.orders.list_for(uid, "groceries"),
        "finds": {k: mailer.finds.list_for(uid, k) for k in FIND_KINDS},
        "codes": mailer.finds.codes_for(uid),
        "images": mailer.images_for(uid),
        "blocked": mailer.spam.lists_for(uid),
        "badge": mailer.badge.state_for(uid),
        "quiet": notifyplus.quiet_for(mailer, uid),
        "sounds": notifyplus.SOUNDS,
        "nudges": mailer.smart.nudges_for(uid),
        "pins": mailer.extras.pins_for(uid),
        "person": mailer.extras.person_for(uid),
        "email_ha": mailer.extras.ha_email_on(),
        "emptying": [dict(x) for a in mailer.accounts.values() if a.acc["owner"] == uid for x in a.emptying.values()],
        "snoozed": mailer.features.snoozed_for(uid),
        "muted": mailer.features.muted_for(uid),
        "screener": mailer.features.screener_for(uid),
        "appointments": mailer.aix.appointments_for(uid),
        "bills": mailer.aix.bills_for(uid),
        "briefing": mailer.aix.briefing_for(uid),
        # Snooze until I get home: there's a person in Home Assistant for you
        "home_snooze": bool(mailer.features._person_of(uid)),  # noqa: SLF001
    }


@websocket_api.websocket_command({vol.Required("type"): P + "subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    try:
        mailer = _m(hass)
    except MailError as err:
        connection.send_error(msg["id"], err.code, str(err))
        return
    uid = connection.user.id

    @callback
    def forward(payload: dict) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = mailer.subscribe(uid, forward)
    connection.send_result(msg["id"])
    forward({"type": "state", **_state(hass, mailer, uid, connection.user.is_admin)})


@command("state")
def ws_state(hass, mailer, uid, msg):
    return _state(hass, mailer, uid, False)


@command("here", {vol.Required("path"): vol.All(str, vol.Length(max=300))})
def ws_here(hass, mailer, uid, msg):
    """The dashboard the card is on: notifications open it."""
    path = msg["path"]
    if path.startswith("/") and not path.startswith("//"):
        if mailer.data["here"].get(uid) != path:
            mailer.data["here"][uid] = path
            mailer.save()
    return None


@command("prefs", {vol.Optional("skin"): vol.All(str, vol.Length(max=40)),
                   # Favourites in Contacts count as VIPs; email is quiet while your phone's Focus is on
                   vol.Optional("fav_vips"): bool, vol.Optional("follow_focus"): bool,
                   vol.Optional("accent"): vol.Any("", vol.Match(r"^#[0-9a-fA-F]{6}$")),
                   vol.Optional("account_accents"): bool,
                   vol.Optional("undo_send"): vol.In((0, 5, 10, 20, 30)),
                   # Custom Swipes: what each swipe shows (and a long swipe does)
                   vol.Optional("swipes"): vol.Schema({
                       vol.Optional("right"): vol.All([vol.In(SWIPE_ACTIONS)], vol.Length(max=2)),
                       vol.Optional("left"): vol.All([vol.In(SWIPE_ACTIONS)], vol.Length(max=3)),
                       vol.Optional("long_right"): vol.In(("none",) + SWIPE_ACTIONS),
                       vol.Optional("long_left"): vol.In(("none",) + SWIPE_ACTIONS),
                   })})
def ws_prefs(hass, mailer, uid, msg):
    """Each person's own choices that follow them to every device (skin, colour, Undo Send, swipes)."""
    prefs = mailer.data["prefs"].setdefault(uid, {})
    for k in ("skin", "accent", "account_accents", "undo_send", "swipes", "fav_vips", "follow_focus"):
        if k in msg:
            prefs[k] = msg[k]
    mailer.save()
    mailer.send_to(uid, {"type": "prefs", "prefs": prefs})
    if "fav_vips" in msg:
        mailer.send_to(uid, {"type": "vips", "vips": mailer.vips(uid)})
    return prefs


# ── contacts and backgrounds (private to each person) ──────────────────────
@command("contacts/save", {vol.Required("contacts"): vol.All([dict], vol.Length(max=5000))})
def ws_contacts_save(hass, mailer, uid, msg):
    return {"contacts": mailer.book.save_contacts(uid, msg["contacts"])}


@command("contacts/delete", {vol.Required("ids"): [str]})
def ws_contacts_delete(hass, mailer, uid, msg):
    mailer.book.delete_contacts(uid, msg["ids"])
    return None


@command("background/set", {vol.Required("key"): vol.All(str, vol.Length(max=400)), vol.Optional("image"): vol.Any(None, str)})
def ws_background_set(hass, mailer, uid, msg):
    return {"backgrounds": mailer.book.set_background(uid, msg["key"], msg.get("image"))}


@command("inbox_viewed", {vol.Optional("account"): vol.Any(None, str)})
def ws_inbox_viewed(hass, mailer, uid, msg):
    mailer.inbox_viewed(uid, msg.get("account"))
    return None


# ── accounts ───────────────────────────────────────────────────────────────
ACCOUNT = vol.Schema({
    vol.Optional("id"): str, vol.Optional("provider"): vol.In(tuple(PROVIDERS)), vol.Optional("email"): str,
    vol.Optional("name"): str, vol.Optional("from_name"): str, vol.Optional("username"): str,
    vol.Optional("password"): str, vol.Optional("token_key"): str,
    vol.Optional("imap"): dict, vol.Optional("smtp"): dict, vol.Optional("sent_copy"): bool,
    vol.Optional("signature"): str, vol.Optional("notify"): vol.In(("all", "smart", "vip", "none")),
    vol.Optional("devices"): vol.Any(None, [str]), vol.Optional("share_details"): bool,
    vol.Optional("share_preview"): bool, vol.Optional("color"): str, vol.Optional("assist_voice"): bool,
    vol.Optional("sound"): vol.In(list(notifyplus.SOUNDS)),
    vol.Optional("sig_card"): vol.Schema({vol.Optional(k): str for k in ("name", "title", "phone", "web", "photo")} | {vol.Optional("on"): bool},
                                         extra=vol.REMOVE_EXTRA),
}, extra=vol.REMOVE_EXTRA)


@command("account/save", {vol.Required("account"): ACCOUNT})
async def ws_account_save(hass, mailer, uid, msg):
    d = dict(msg["account"])
    if d.get("token_key"):
        got = mailer.take_ms_tokens(uid, d.pop("token_key"))
        d["ms"] = got["ms"]
        d.setdefault("email", got["email"])
        if not d.get("from_name") and got["name"]:
            d["from_name"] = got["name"]
    return await mailer.async_save_account(uid, d)


@command("account/delete", {ACC: str})
async def ws_account_delete(hass, mailer, uid, msg):
    await mailer.async_delete_account(uid, msg["account"])
    return None


@command("account/refresh", {ACC: str})
async def ws_account_refresh(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    await a.async_check_new()
    return a.public_stats()


@command("microsoft/start")
async def ws_ms_start(hass, mailer, uid, msg):
    try:
        return await mailer.async_ms_start(uid)
    except Exception as err:  # noqa: BLE001 - MicrosoftError
        if isinstance(err, MailError):
            raise
        raise MailError("microsoft", str(err)) from err


@command("microsoft/poll", {vol.Required("flow_id"): str})
async def ws_ms_poll(hass, mailer, uid, msg):
    return await mailer.async_ms_poll(uid, msg["flow_id"])


# ── reading ────────────────────────────────────────────────────────────────
@command("folders", {ACC: str, vol.Optional("force", default=False): bool})
async def ws_folders(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    return await a.async_folders(force=msg["force"])


@command("folder/create", {ACC: str, vol.Required("name"): vol.All(str, vol.Length(min=1, max=100))})
async def ws_folder_create(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    path = await a.job(a.cmd.create_folder, msg["name"].strip())
    await a.async_folders(force=True, counts=False)
    return {"path": path}


@command("list", {ACC: str, FOLDER: str, vol.Optional("offset", default=0): vol.All(int, vol.Range(min=0)),
                  vol.Optional("limit", default=PAGE_SIZE): vol.All(int, vol.Range(min=1, max=100)),
                  vol.Optional("filter", default="all"): vol.In(("all", "unread", "flagged", "vip", "attachments", "today"))})
async def ws_list(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    res = await a.async_page(msg["folder"], msg["offset"], msg["limit"], msg["filter"])
    for it in res["items"]:
        frm = (it.get("from") or [{}])[0]
        it["vip"] = mailer.is_vip(uid, frm.get("email", ""))
    if msg["folder"] == "INBOX" and msg["offset"] == 0:
        mailer.inbox_viewed(uid, a.id)
    return res


@command("combined", {vol.Required("kind"): vol.In(("inbox", "vip", "flagged", "unread", "attachments", "today")),
                      vol.Optional("cursor", default={}): dict,
                      vol.Optional("limit", default=PAGE_SIZE): vol.All(int, vol.Range(min=1, max=100))})
async def ws_combined(hass, mailer, uid, msg):
    res = await mailer.async_combined(uid, msg["kind"], msg["cursor"], msg["limit"])
    for it in res["items"]:
        frm = (it.get("from") or [{}])[0]
        it["vip"] = mailer.is_vip(uid, frm.get("email", ""))
    if msg["kind"] == "inbox" and not msg["cursor"]:
        mailer.inbox_viewed(uid, None)
    return res


@command("search", {vol.Optional("account"): vol.Any(None, str), FOLDER: str,
                    vol.Required("query"): vol.All(str, vol.Length(min=1, max=200))})
async def ws_search(hass, mailer, uid, msg):
    accounts = [mailer.account(uid, msg["account"])] if msg.get("account") else \
        [a for a in mailer.accounts.values() if a.acc["owner"] == uid]
    out, errors = [], {}
    for a in accounts:
        try:
            out += await a.async_search(msg["folder"] if msg.get("account") else "INBOX", msg["query"])
        except MailError as err:
            errors[a.id] = str(err)
    for it in out:
        frm = (it.get("from") or [{}])[0]
        it["vip"] = mailer.is_vip(uid, frm.get("email", ""))
    return {"items": sorted(out, key=lambda i: i["date"], reverse=True), "errors": errors}


@command("message", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int),
                     vol.Optional("remote", default=None): vol.Any(None, bool), vol.Optional("mark_seen", default=True): bool,
                     vol.Optional("ads"): vol.In(("off", "networks", "sponsored"))})
async def ws_message(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    m = await a.async_message(msg["folder"], msg["uid"], msg["remote"], msg["mark_seen"], msg.get("ads"))
    frm = (m.get("from") or [{}])[0]
    m["vip"] = mailer.is_vip(uid, frm.get("email", ""))
    m["reminder"] = next((r for r in mailer.reminders_for(uid) if r["account"] == a.id and r["muid"] == m["uid"]
                          and r["folder"] == m["folder"]), None)
    return m


@command("changes", {vol.Required("lists"): vol.All([vol.Schema({
    ACC: str, FOLDER: str, vol.Optional("validity", default=0): vol.Coerce(int), vol.Optional("since", default=0): vol.Coerce(int),
    vol.Optional("uids", default=[]): vol.All([vol.Coerce(int)], vol.Length(max=300)),
    vol.Optional("filter", default="all"): vol.In(("all", "unread", "flagged", "vip", "attachments", "today"))})], vol.Length(max=12))})
async def ws_changes(hass, mailer, uid, msg):
    """What's changed since the card last looked, so it only fetches what's new."""
    out = {}
    for ref in msg["lists"]:
        a = mailer.account(uid, ref["account"])
        try:
            res = await a.async_changes(ref["folder"], ref["validity"], ref["since"], ref["uids"], ref["filter"])
        except MailError as err:
            res = {"error": str(err)}
        for it in res.get("new") or []:
            frm = (it.get("from") or [{}])[0]
            it["vip"] = mailer.is_vip(uid, frm.get("email", ""))
        out[a.id] = res
        if ref["folder"] == "INBOX":
            mailer.inbox_viewed(uid, a.id)
    return out


# ── spam: blocking, Not Junk, phishing ─────────────────────────────────────
@command("blocked")
def ws_blocked(hass, mailer, uid, msg):
    return mailer.spam.lists_for(uid)


@command("blocked/save", {vol.Optional("action"): vol.In(("junk", "trash")),
                          **{vol.Optional(f"{op}{k}"): vol.All([str], vol.Length(max=500))
                             for k in ("senders", "domains", "safe_senders", "safe_domains") for op in ("add_", "remove_")}})
def ws_blocked_save(hass, mailer, uid, msg):
    return mailer.spam.save_lists(uid, msg)


@command("block", {vol.Required("email"): vol.All(str, vol.Length(max=254)), vol.Optional("domain", default=False): bool,
                   vol.Optional("move_existing", default=False): bool})
async def ws_block(hass, mailer, uid, msg):
    return await mailer.spam.async_block(uid, msg["email"], msg["domain"], msg["move_existing"])


@command("not_junk", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("trust"): vol.Any(None, str)})
async def ws_not_junk(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    return await mailer.spam.async_not_junk(uid, a, msg["folder"], msg["uids"], msg.get("trust"))


@command("phishing/places", {ACC: str})
def ws_phishing_places(hass, mailer, uid, msg):
    return mailer.spam.phishing_places(mailer.account(uid, msg["account"]))


@command("phishing/report", {**ONE_MSG, vol.Required("places"): [vol.In(("ncsc", "apwg", "microsoft"))]})
async def ws_phishing_report(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    mailer.smart.drop_parcels(a, msg["folder"], [msg["uid"]])
    mailer.orders.drop(a, msg["folder"], [msg["uid"]])
    mailer.finds.drop(a, msg["folder"], [msg["uid"]])
    mailer.aix.drop(a, msg["folder"], [msg["uid"]])
    return await mailer.spam.async_report_phishing(a, msg["folder"], msg["uid"], msg["places"])


@command("quiet", {vol.Optional("on"): bool, vol.Optional("from"): str, vol.Optional("to"): str})
def ws_quiet(hass, mailer, uid, msg):
    """Quiet Hours: email arrives silently between these times (VIPs still come through)."""
    q = notifyplus.save_quiet(mailer, uid, msg)
    mailer.send_to(uid, {"type": "quiet", "quiet": q})
    return q


@command("badge/prefs", {vol.Optional("on"): bool, vol.Optional("count"): vol.In(("unread", "notified", "vip"))})
def ws_badge_prefs(hass, mailer, uid, msg):
    mailer.badge.save_prefs(uid, msg)
    state = mailer.badge.state_for(uid)
    mailer.send_to(uid, {"type": "badge", "badge": state})
    return state


# ── stickers (each person's own) ──
@command("stickers")
def ws_stickers(hass, mailer, uid, msg):
    return {"stickers": mailer.book.stickers_for(uid)}


@command("stickers/get", {vol.Required("ids"): vol.All([str], vol.Length(max=200))})
def ws_stickers_get(hass, mailer, uid, msg):
    return {"images": mailer.book.sticker_images(uid, msg["ids"])}


@command("stickers/save", {vol.Required("image"): vol.All(str, vol.Length(max=700_000))})
def ws_stickers_save(hass, mailer, uid, msg):
    sid = mailer.book.save_sticker(uid, msg["image"])
    return {"sticker": sid, "stickers": mailer.book.stickers_for(uid)}


@command("stickers/delete", {vol.Required("sticker"): str})
def ws_stickers_delete(hass, mailer, uid, msg):
    mailer.book.delete_sticker(uid, msg["sticker"])
    return {"stickers": mailer.book.stickers_for(uid)}


@command("images")
def ws_images(hass, mailer, uid, msg):
    return mailer.images_for(uid)


@command("images/save", {vol.Optional("mode"): vol.In(("ask", "always", "contacts")), vol.Optional("trackers"): bool,
                         vol.Optional("proxy"): bool, vol.Optional("ads"): vol.In(("off", "networks", "sponsored")),
                         **{vol.Optional(f"{op}{k}"): vol.All([str], vol.Length(max=1000))
                            for k in ("senders", "domains", "ad_senders") for op in ("", "add_", "remove_")}})
def ws_images_save(hass, mailer, uid, msg):
    return mailer.save_images(uid, msg)


@command("conversation", {ACC: str, vol.Required("subject"): str})
async def ws_conversation(hass, mailer, uid, msg):
    return await mailer.async_conversation(uid, msg["account"], msg["subject"])


@command("people")
def ws_people(hass, mailer, uid, msg):
    return mailer.people(uid)


# ── changing ───────────────────────────────────────────────────────────────
@command("flag", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("uid"): vol.Coerce(int),
                  vol.Required("flag"): vol.In(("seen", "flagged")), vol.Required("on"): bool})
async def ws_flag(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    await a.async_flag(msg["folder"], msg["uids"], msg["flag"], msg["on"])
    return None


# ── Undo for Archive, Delete, Move and Junk ─────────────────────────────────
# a move notes where the emails went; the card gets a token, and crow_email/undo puts them back.
# Kept for a few minutes, and only the person who made the change can undo it.
UNDO: dict[str, dict] = {}
UNDO_KEEP = 600


def _undo_token(uid: str, steps: list[dict]) -> str | None:
    steps = [x for x in steps if x.get("uids") or x.get("mids")]
    if not steps:
        return None
    now = time.monotonic()
    for k in [k for k, v in UNDO.items() if now - v["at"] > UNDO_KEEP]:
        UNDO.pop(k, None)
    while len(UNDO) > 100:
        UNDO.pop(next(iter(UNDO)))
    token = secrets.token_urlsafe(12)
    UNDO[token] = {"owner": uid, "steps": steps, "at": now}
    return token


def _drop_extras(mailer, a, folder: str, uids: list[int]) -> list[dict]:
    """Junk: a fake delivery (or order) email's parcel goes too, and its bill or appointment."""
    mailer.smart.drop_parcels(a, folder, uids)
    mailer.orders.drop(a, folder, uids)
    mailer.finds.drop(a, folder, uids)
    return mailer.aix.drop(a, folder, uids)


def _keep_for_undo(token: str | None, a, gone: list[dict]) -> None:
    """Bills and appointments that left with their emails: Undo brings them back too."""
    if token and gone and token in UNDO:
        UNDO[token].setdefault("extras", []).append({"account": a.id, "items": gone})


@command("move", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("uid"): vol.Coerce(int), vol.Required("to"): str})
async def ws_move(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    rec: list = []
    await a.async_move(msg["folder"], msg["uids"], msg["to"], rec)
    return {"undo": _undo_token(uid, rec)}


@command("archive", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("uid"): vol.Coerce(int)})
async def ws_archive(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    rec: list = []
    to = await a.async_archive(msg["folder"], msg["uids"], rec)
    return {"to": to, "undo": _undo_token(uid, rec)}


@command("delete", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("uid"): vol.Coerce(int)})
async def ws_delete(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    rec: list = []
    res = await a.async_delete(msg["folder"], msg["uids"], rec)
    token = _undo_token(uid, rec)
    _keep_for_undo(token, a, mailer.aix.drop(a, msg["folder"], msg["uids"]))   # its bill or appointment goes too
    return {"result": res, "undo": token}


@command("undo", {vol.Required("token"): vol.All(str, vol.Length(max=40))})
async def ws_undo(hass, mailer, uid, msg):
    entry = UNDO.get(msg["token"])
    if not entry or entry["owner"] != uid:
        raise MailError("not_found", "It’s too late to undo that.")
    UNDO.pop(msg["token"], None)
    count = 0
    for step in reversed(entry["steps"]):
        a = mailer.account(uid, step["account"])
        count += await a.async_undo_move(step)
    for ex in entry.get("extras") or []:
        try:
            mailer.aix.restore(mailer.account(uid, ex["account"]), ex["items"])
        except MailError:
            pass
    return {"count": count}


# ── Select All: every email in a mailbox, not just those loaded ─────────────
ALL_FILTERS = ("all", "unread", "flagged", "vip", "today")
SCOPE = {vol.Optional("account"): vol.Any(None, str), FOLDER: str,
         vol.Optional("combined", default=False): bool,
         vol.Optional("filter", default="all"): vol.In(ALL_FILTERS)}


def _scope(mailer, uid: str, msg: dict) -> list[tuple]:
    """The (account, folder) pairs a Select All covers: one folder, or every Inbox for All Inboxes."""
    if msg.get("combined"):
        return [(a, "INBOX") for a in mailer.accounts.values() if a.acc["owner"] == uid]
    if not msg.get("account"):
        raise MailError("invalid", "Choose a mailbox.")
    return [(mailer.account(uid, msg["account"]), msg["folder"])]


@command("select_all", SCOPE)
async def ws_select_all(hass, mailer, uid, msg):
    total, upto = 0, {}
    for a, folder in _scope(mailer, uid, msg):
        try:
            r = await a.async_select_all(folder, msg["filter"])
        except MailError:
            continue
        total += r["total"]
        upto[a.id] = r["upto"]
    return {"total": total, "upto": upto}


@command("bulk_all", {**SCOPE,
                      vol.Required("action"): vol.In(("read", "unread", "flag", "unflag", "archive", "trash", "junk", "move")),
                      vol.Optional("to"): str,
                      vol.Required("upto"): {str: vol.Coerce(int)},
                      vol.Optional("except", default=[]): vol.All([vol.Schema({vol.Required("account"): str, vol.Required("folder"): str,
                                                                                vol.Required("uid"): vol.Coerce(int)})], vol.Length(max=20000))})
async def ws_bulk_all(hass, mailer, uid, msg):
    """An action on every email Select All picked: all of them up to the newest it saw, less any unticked."""
    action, scope = msg["action"], _scope(mailer, uid, msg)
    work = []
    for a, folder in scope:
        skip = {x["uid"] for x in msg["except"] if x["account"] == a.id and x["folder"] == folder}
        uids = await a.async_all_uids(folder, msg["filter"], msg["upto"].get(a.id, 0), skip)
        if uids:
            work.append((a, folder, uids))
    if action == "move":
        if not msg.get("to"):
            raise MailError("invalid", "Choose a folder.")
        if len({a.id for a, _, _ in work}) > 1:
            raise MailError("invalid", "Choose emails from one account to move them.")
    rec: list = []
    count, to = 0, None
    gone: list[tuple] = []
    for a, folder, uids in work:
        if action in ("read", "unread"):
            await a.async_flag(folder, uids, "seen", action == "read")
        elif action in ("flag", "unflag"):
            await a.async_flag(folder, uids, "flagged", action == "flag")
        elif action == "archive":
            to = await a.async_archive(folder, uids, rec)
        elif action == "trash":
            to = await a.async_delete(folder, uids, rec)
            gone.append((a, mailer.aix.drop(a, folder, uids)))
        elif action == "junk":
            gone.append((a, _drop_extras(mailer, a, folder, uids)))
            to = await a.async_special("junk", create="Junk")
            await a.async_move(folder, uids, to, rec)
        elif action == "move":
            to = msg["to"]
            await a.async_move(folder, uids, to, rec)
        count += len(uids)
    token = _undo_token(uid, rec)
    for a, items in gone:
        _keep_for_undo(token, a, items)
    return {"count": count, "to": to, "undo": token}


@command("mark_all_read", {vol.Optional("account"): vol.Any(None, str), FOLDER: str,
                           vol.Optional("kind"): vol.In(("inbox", "vip", "flagged", "unread", "attachments", "today"))})
async def ws_mark_all_read(hass, mailer, uid, msg):
    """Every unread email in a folder (or, for a smart mailbox, in every Inbox) marked as read."""
    if msg.get("account"):
        targets, folder = [mailer.account(uid, msg["account"])], msg["folder"]
    else:
        targets, folder = [a for a in mailer.accounts.values() if a.acc["owner"] == uid], "INBOX"
    count = 0
    for a in targets:
        crit = ["UNSEEN"]
        if msg.get("kind") == "vip":
            vip = mailer.vip_criteria(uid)
            if not vip:
                continue
            crit = ["UNSEEN", *vip]
        elif msg.get("kind") == "flagged":
            crit = ["UNSEEN", "FLAGGED"]
        elif msg.get("kind") == "today":
            from datetime import datetime
            crit = ["UNSEEN", "SINCE", datetime.now().strftime("%d-%b-%Y")]
        uids = await a.job(a.cmd.search, folder, *crit)
        if uids:
            await a.async_flag(folder, uids, "seen", True)
            count += len(uids)
    return {"count": count}


@command("folder/empty", {ACC: str, vol.Required("folder"): str})
async def ws_folder_empty(hass, mailer, uid, msg):
    """Delete All Spam / Empty Trash: starts it, and answers how many there are (progress comes as events)."""
    a = mailer.account(uid, msg["account"])
    return await a.async_empty(msg["folder"])


@command("junk", {ACC: str, FOLDER: str, vol.Required("uids"): UIDS, vol.Optional("uid"): vol.Coerce(int)})
async def ws_junk(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    gone = _drop_extras(mailer, a, msg["folder"], msg["uids"])
    dest = await a.async_special("junk", create="Junk")
    rec: list = []
    await a.async_move(msg["folder"], msg["uids"], dest, rec)
    token = _undo_token(uid, rec)
    _keep_for_undo(token, a, gone)
    return {"to": dest, "undo": token}


# ── Snooze, Mute, the Screener, Subscriptions, Sweep ───────────────────────
@command("snooze", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int), vol.Optional("until", default=0): vol.Coerce(int),
                    vol.Optional("home", default=False): bool})
async def ws_snooze(hass, mailer, uid, msg):
    return await mailer.features.async_snooze(uid, msg["account"], msg["folder"], msg["uid"], msg["until"], msg["home"])


# ── with the rest of Crow Messenger ─────────────────────────────────────────
@command("contact_mail", {vol.Required("emails"): vol.All([vol.All(str, vol.Length(max=254))], vol.Length(min=1, max=10)),
                          vol.Optional("limit", default=6): vol.All(vol.Coerce(int), vol.Range(min=1, max=20))})
async def ws_contact_mail(hass, mailer, uid, msg):
    """Recent email to and from one of your contacts (their card in Contacts)."""
    return await mailer.async_contact_mail(uid, msg["emails"], msg["limit"])


@command("whois", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int)})
async def ws_whois(hass, mailer, uid, msg):
    """Who's This?: who someone new seems to be, from the email and your contacts, chats and household."""
    a = mailer.account(uid, msg["account"])
    m = await a.async_message(msg["folder"], msg["uid"], False, mark_seen=False)
    frm = (m.get("from") or [{}])[0]
    return {"text": await ai.whois(hass, mailer, frm, m.get("subject") or "", m.get("text") or "",
                                   await mailer.known_people(uid))}


# (an item's id travels as "item": Home Assistant's own "id" is the number of the message itself)
@command("snooze/wake", {vol.Required("item"): str})
async def ws_snooze_wake(hass, mailer, uid, msg):
    """Unsnooze: back to the Inbox now."""
    return await mailer.features.async_wake(msg["item"], uid) or {}


@command("snooze/locate", {vol.Required("item"): str})
async def ws_snooze_locate(hass, mailer, uid, msg):
    return await mailer.features.async_locate_snoozed(uid, msg["item"])


@command("mute", {vol.Optional("account"): str, vol.Optional("folder"): str, vol.Optional("uid"): vol.Coerce(int),
                  vol.Optional("item"): str, vol.Required("on"): bool})
async def ws_mute(hass, mailer, uid, msg):
    return await mailer.features.async_mute(uid, msg.get("account"), msg.get("folder"), msg.get("uid"), msg["on"], msg.get("item"))


@command("screener/set", {vol.Optional("on"): bool, vol.Optional("remove"): [str], vol.Optional("add"): [str],
                          vol.Optional("auto_out"): bool})
async def ws_screener_set(hass, mailer, uid, msg):
    cur = mailer.features.screener_for(uid)
    return await mailer.features.async_screener_set(uid, msg.get("on", cur["on"]), msg.get("remove"), msg.get("add"), msg.get("auto_out"))


@command("screener/list")
async def ws_screener_list(hass, mailer, uid, msg):
    return await mailer.features.async_screener_list(uid)


@command("screener/decide", {ACC: str, vol.Required("email"): str, vol.Required("allow"): bool})
async def ws_screener_decide(hass, mailer, uid, msg):
    return await mailer.features.async_screener_decide(uid, msg["account"], msg["email"], msg["allow"])


@command("subscriptions", {ACC: str, vol.Optional("force", default=False): bool})
async def ws_subscriptions(hass, mailer, uid, msg):
    return await mailer.features.async_subscriptions(uid, msg["account"], msg["force"])


@command("subscriptions/unsubscribe", {ACC: str, vol.Required("email"): str, vol.Optional("header", default=""): str,
                                       vol.Optional("one_click", default=False): bool})
async def ws_subscriptions_unsub(hass, mailer, uid, msg):
    return await mailer.features.async_unsubscribe(uid, msg["account"], msg["email"], msg["header"], msg["one_click"])


@command("sweep", {ACC: str, FOLDER: str, vol.Required("email"): str, vol.Required("action"): vol.In(("trash", "archive")),
                   vol.Optional("keep", default="none"): vol.In(("none", "latest", "older10"))})
async def ws_sweep(hass, mailer, uid, msg):
    return await mailer.features.async_sweep(uid, msg["account"], msg["folder"], msg["email"], msg["action"], msg["keep"])


@command("today")
def ws_today(hass, mailer, uid, msg):
    return mailer.features.today_for(uid)


# ── the AI that builds on them ─────────────────────────────────────────────
async def _cached_msg(mailer, uid, account, folder, muid):
    a = mailer.account(uid, account)
    return await a.async_message(folder or "INBOX", int(muid), False, mark_seen=False)


@command("ai/snooze", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int)})
async def ws_ai_snooze(hass, mailer, uid, msg):
    m = await _cached_msg(mailer, uid, msg["account"], msg["folder"], msg["uid"])
    key = f"snz:{m.get('message_id') or msg['uid']}"
    times = mailer.aix.note(key, 3600)
    if times is None:
        times = await ai.snooze_times(hass, mailer, m)
        mailer.aix.remember(key, times)
    return {"times": times}


@command("ai/screener", {vol.Required("items"): vol.All([vol.Schema({ACC: str, vol.Required("folder"): str,
                                                                       vol.Required("uid"): vol.Coerce(int)}, extra=vol.REMOVE_EXTRA)], vol.Length(max=12))})
async def ws_ai_screener(hass, mailer, uid, msg):
    """Who each waiting sender seems to be (remembered, so it's only asked once)."""
    msgs, out, ask = [], [None] * len(msg["items"]), []
    for i, it in enumerate(msg["items"]):
        try:
            m = await _cached_msg(mailer, uid, it["account"], it["folder"], it["uid"])
        except Exception:  # noqa: BLE001
            continue
        hit = mailer.aix.note(f"scr:{m.get('message_id')}") if m.get("message_id") else None
        if hit:
            out[i] = hit
        else:
            ask.append(i)
            msgs.append(m)
    if msgs:
        for r in await ai.screener_notes(hass, mailer, msgs):
            i = ask[r["index"]]
            out[i] = {k: r[k] for k in ("kind", "note", "suggest")}
            mid = msgs[r["index"]].get("message_id")
            if mid:
                mailer.aix.remember(f"scr:{mid}", out[i])
    return {"notes": out}


@command("ai/subscriptions", {ACC: str, vol.Required("items"): vol.All([vol.Schema({vol.Required("email"): str, vol.Required("uid"): vol.Coerce(int)},
                                                                                   extra=vol.REMOVE_EXTRA)], vol.Length(max=15))})
async def ws_ai_subscriptions(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    out, ask, msgs = {}, [], []
    for it in msg["items"]:
        key = f"sub:{a.id}:{it['email'].lower()}"
        hit = mailer.aix.note(key, 30 * 86400)
        if hit:
            out[it["email"]] = hit
            continue
        try:
            msgs.append(await a.async_message("INBOX", it["uid"], False, mark_seen=False))
            ask.append(it["email"])
        except Exception:  # noqa: BLE001
            continue
    if msgs:
        for r in await ai.subscription_notes(hass, mailer, msgs):
            e = ask[r["index"]]
            out[e] = r["note"]
            mailer.aix.remember(f"sub:{a.id}:{e.lower()}", r["note"])
    return {"notes": out}


@command("ai/signature", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int)})
async def ws_ai_signature(hass, mailer, uid, msg):
    m = await _msg(mailer, uid, msg)
    key = f"sig:{m.get('message_id') or msg['uid']}"
    hit = mailer.aix.note(key, 30 * 86400)
    if hit is None:
        hit = await ai.signature(hass, mailer, m)
        mailer.aix.remember(key, hit)
    return {"details": hit}


@command("ai/chaser", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int)})
async def ws_ai_chaser(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    m = await _msg(mailer, uid, msg)
    me = a.acc.get("from_name") or ""
    return {"text": await ai.chaser(hass, mailer, m, me)}


@command("tidy")
async def ws_tidy(hass, mailer, uid, msg):
    if not ai.on(hass, mailer, "tidy"):
        raise MailError("ai_unavailable", "Inbox Tidy-Up is turned off. An administrator can turn it on in the card editor.")
    return await mailer.aix.async_tidy(uid)


@command("appointments/action", {ACC: str, vol.Required("item"): str, vol.Required("action"): vol.In(("remove", "added"))})
def ws_appointments_action(hass, mailer, uid, msg):
    return mailer.aix.appointment_action(uid, msg["account"], msg["item"], msg["action"])


@command("bills/action", {ACC: str, vol.Required("item"): str, vol.Required("action"): vol.In(("paid", "unpaid", "remove"))})
def ws_bills_action(hass, mailer, uid, msg):
    return mailer.aix.bill_action(uid, msg["account"], msg["item"], msg["action"])


@command("briefing/save", {vol.Optional("on"): bool, vol.Optional("time"): vol.Match(r"^\d{2}:\d{2}$"), vol.Optional("notify"): bool,
                           vol.Optional("speaker"): vol.Any("", vol.Match(r"^media_player\.[a-z0-9_]+$")),
                           vol.Optional("days"): vol.In(("every", "weekdays"))})
def ws_briefing_save(hass, mailer, uid, msg):
    return mailer.aix.save_briefing(uid, {k: msg[k] for k in ("on", "time", "notify", "speaker", "days") if k in msg})


@command("briefing/test")
async def ws_briefing_test(hass, mailer, uid, msg):
    if not ai.on(hass, mailer, "briefing"):
        raise MailError("ai_unavailable", "The Morning Briefing is turned off. An administrator can turn it on in the card editor.")
    return await mailer.aix.async_briefing(uid, test=True)


# ── writing ────────────────────────────────────────────────────────────────
@command("send", {ACC: str, vol.Optional("delay", default=0): vol.All(vol.Coerce(int), vol.Range(min=0, max=60)), **COMPOSE})
async def ws_send(hass, mailer, uid, msg):
    if msg["delay"]:
        # Undo Send: it goes in a few seconds, unless Undo is tapped first
        from .manager import now_ms
        item = mailer.schedule(uid, msg["account"], _compose(msg), now_ms() + msg["delay"] * 1000, undo=True)
        return {"undo": item["id"], "at": item["at"]}
    return await mailer.async_send(uid, msg["account"], _compose(msg))


def _unsent(item: dict) -> dict:
    payload = {k: item["payload"].get(k) for k in ("to", "cc", "bcc", "subject", "html", "reply", "poll", "invite", "vcards", "read_receipt")}
    payload["attachments"] = [{"upload": a["upload"], "name": (a.get("file") or {}).get("name"), "size": (a.get("file") or {}).get("size"),
                               "mime": (a.get("file") or {}).get("mime")} if a.get("upload") else a
                              for a in item["payload"].get("attachments") or []]
    return {"account": item["account"], "at": item["at"], "place": item.get("place"), **payload}


@command("send/undo", {vol.Required("item"): str})
def ws_send_undo(hass, mailer, uid, msg):
    return _unsent(mailer.cancel_scheduled(uid, msg["item"], keep_files=True))


@command("draft", {ACC: str, **COMPOSE})
async def ws_draft(hass, mailer, uid, msg):
    return await mailer.async_save_draft(uid, msg["account"], _compose(msg))


@command("schedule", {ACC: str, vol.Optional("at"): vol.Any(None, int),
                      vol.Optional("place"): vol.Schema({vol.Required("zone"): str, vol.Required("event"): vol.In(("arrive", "leave"))}),
                      **COMPOSE})
def ws_schedule(hass, mailer, uid, msg):
    item = mailer.schedule(uid, msg["account"], _compose(msg), msg.get("at"), place=msg.get("place"))
    return {"id": item["id"], "at": item["at"], "place": item.get("place")}


@command("scheduled/cancel", {vol.Required("item"): str, vol.Optional("keep_files", default=False): bool})
def ws_scheduled_cancel(hass, mailer, uid, msg):
    return _unsent(mailer.cancel_scheduled(uid, msg["item"], msg["keep_files"]))


@command("scheduled/send_now", {vol.Required("item"): str})
async def ws_scheduled_now(hass, mailer, uid, msg):
    await mailer.async_send_scheduled(msg["item"], uid)
    return None


@command("remind", {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int), vol.Optional("at"): vol.Any(None, int)})
async def ws_remind(hass, mailer, uid, msg):
    return await mailer.async_remind(uid, msg["account"], msg["folder"], msg["uid"], msg.get("at"))


@command("reminder/done", {vol.Required("item"): str})
def ws_reminder_done(hass, mailer, uid, msg):
    return mailer.reminder_done(uid, msg["item"])


@command("vip", {vol.Required("email"): str, vol.Optional("name", default=""): str, vol.Required("on"): bool})
def ws_vip(hass, mailer, uid, msg):
    lst = mailer.set_vip(uid, msg["email"], msg["name"], msg["on"])
    mailer.send_to(uid, {"type": "vips", "vips": lst})
    return lst


@command("rules", {ACC: str})
def ws_rules(hass, mailer, uid, msg):
    return mailer.rules(mailer.account(uid, msg["account"]).id)


@command("rules/save", {ACC: str, vol.Required("rules"): [dict]})
def ws_rules_save(hass, mailer, uid, msg):
    return mailer.save_rules(uid, msg["account"], msg["rules"])


@command("rules/test", {ACC: str, vol.Required("rule"): dict, vol.Optional("limit", default=50): vol.All(int, vol.Range(min=1, max=200))})
async def ws_rules_test(hass, mailer, uid, msg):
    """Which recent emails in the Inbox a rule would catch (nothing is changed)."""
    a = mailer.account(uid, msg["account"])
    return {"matches": await mailer.rules_engine.async_test(a, msg["rule"], msg["limit"])}


@command("rules/apply", {ACC: str, vol.Required("rule"): dict})
async def ws_rules_apply(hass, mailer, uid, msg):
    """Apply to Inbox Now: the rule's tidying actions on email already in the Inbox (nothing is sent)."""
    a = mailer.account(uid, msg["account"])
    return await mailer.rules_engine.async_apply(a, msg["rule"])


@command("rules/log", {ACC: str})
def ws_rules_log(hass, mailer, uid, msg):
    return mailer.rules_engine.log_for(mailer.account(uid, msg["account"]).id)


# ── household settings (administrators) ───────────────────────────────────
@command("settings", admin=True)
def ws_settings(hass, mailer, uid, msg):
    st = mailer.settings
    return {"ms_client_id": st.get("ms_client_id", ""), "ms_tenant": st.get("ms_tenant", "common"),
            "max_attachment_mb": st.get("max_attachment_mb", 25), "ai": st.get("ai", {}),
            "parcel_keep_days": st.get("parcel_keep_days", 3),
            "badge": {"enabled": bool((st.get("badge") or {}).get("enabled"))},
            "notifications": notifyplus.notif_settings(mailer),
            "email_ha": {"enabled": bool((st.get("email_ha") or {}).get("enabled")), "agent": (st.get("email_ha") or {}).get("agent", "")}}


@command("settings/save", {vol.Optional("ms_client_id"): vol.All(str, vol.Length(max=80)),
                           vol.Optional("ms_tenant"): vol.All(str, vol.Length(max=80)),
                           vol.Optional("max_attachment_mb"): vol.All(vol.Coerce(int), vol.Range(min=1, max=150)),
                           vol.Optional("parcel_keep_days"): vol.All(vol.Coerce(int), vol.In((0, 1, 2, 3, 5, 7, 14, 30, 90, 180, 365))),
                           vol.Optional("badge"): vol.Schema({vol.Optional("enabled"): bool}),
                           vol.Optional("notifications"): vol.Schema({
                               vol.Optional("buttons"): vol.Schema({vol.Optional(k): bool for k in notifyplus.BUTTON_DEFAULTS}),
                               vol.Optional("group_sender"): bool}),
                           vol.Optional("email_ha"): vol.Schema({vol.Optional("enabled"): bool, vol.Optional("agent"): vol.Any(None, str)}),
                           vol.Optional("ai"): vol.Schema({vol.Optional("enabled"): bool, vol.Optional("task_entity"): str,
                                                           vol.Optional("features"): {vol.In(ai.FEATURES): bool}})},
         admin=True)
def ws_settings_save(hass, mailer, uid, msg):
    st = mailer.settings
    for k in ("ms_client_id", "ms_tenant", "max_attachment_mb", "parcel_keep_days"):
        if k in msg:
            st[k] = msg[k].strip() if isinstance(msg[k], str) else msg[k]
    if not st.get("ms_tenant"):
        st["ms_tenant"] = "common"
    if "notifications" in msg:
        cur = st.setdefault("notifications", {})
        if "buttons" in msg["notifications"]:
            cur["buttons"] = {**(cur.get("buttons") or {}), **msg["notifications"]["buttons"]}
        if "group_sender" in msg["notifications"]:
            cur["group_sender"] = msg["notifications"]["group_sender"]
    if "badge" in msg:
        st["badge"] = {**(st.get("badge") or {}), **msg["badge"]}
        for owner in {a.acc["owner"] for a in mailer.accounts.values()}:
            if st["badge"].get("enabled"):
                mailer.badge.changed(owner, now=True)
            mailer.send_to(owner, {"type": "badge", "badge": mailer.badge.state_for(owner)})
    if "email_ha" in msg:
        st["email_ha"] = {**(st.get("email_ha") or {}), **msg["email_ha"]}
        for owner in list(mailer.subs):
            mailer.send_to(owner, {"type": "email_ha", "email_ha": mailer.extras.ha_email_on()})
    if "ai" in msg:
        cur = st.setdefault("ai", {})
        for k in ("enabled", "task_entity"):
            if k in msg["ai"]:
                cur[k] = msg["ai"][k]
        if "features" in msg["ai"]:
            cur["features"] = {**cur.get("features", {}), **msg["ai"]["features"]}
    mailer.save()
    if "parcel_keep_days" in msg:
        mailer.smart.tidy_all()
        for owner in {a.acc["owner"] for a in mailer.accounts.values()}:
            mailer.send_to(owner, {"type": "parcels", "parcels": mailer.smart.parcels_for(owner)})
    for owner in list(mailer.subs):
        mailer.send_to(owner, {"type": "settings", "ai": ai.capabilities(hass, mailer),
                               "microsoft_ready": bool(st.get("ms_client_id")),
                               "max_attachment_mb": st.get("max_attachment_mb", 25),
                               "parcel_keep_days": st.get("parcel_keep_days", 3)})
    return ws_settings(hass, mailer, uid, msg)


# ── AI ─────────────────────────────────────────────────────────────────────
async def _msg(mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    return await a.async_message(msg.get("folder") or "INBOX", int(msg["uid"]), False, mark_seen=False)


ONE = {ACC: str, FOLDER: str, vol.Required("uid"): vol.Coerce(int)}


@command("ai/summary", ONE)
async def ws_ai_summary(hass, mailer, uid, msg):
    return {"summary": await ai.summarise(hass, mailer, await _msg(mailer, uid, msg))}


@command("ai/catchup", {vol.Optional("account"): vol.Any(None, str)})
async def ws_ai_catchup(hass, mailer, uid, msg):
    if msg.get("account"):
        a = mailer.account(uid, msg["account"])
        items = (await a.async_page("INBOX", 0, 40, "unread"))["items"]
    else:
        items = (await mailer.async_combined(uid, "unread", {}, 40))["items"]
    return await ai.catch_up(hass, mailer, items)


@command("ai/replies", ONE)
async def ws_ai_replies(hass, mailer, uid, msg):
    m = await _msg(mailer, uid, msg)
    a = mailer.account(uid, msg["account"])
    return {"replies": await ai.smart_replies(hass, mailer, m, a.acc.get("from_name") or "")}


@command("ai/rewrite", {vol.Required("text"): vol.All(str, vol.Length(max=20000)), vol.Required("style"): str})
async def ws_ai_rewrite(hass, mailer, uid, msg):
    return {"text": await ai.rewrite(hass, mailer, msg["text"], msg["style"])}


@command("ai/compose", {vol.Required("prompt"): vol.All(str, vol.Length(min=1, max=2000)),
                        vol.Optional("account"): str, vol.Optional("folder"): str, vol.Optional("uid"): vol.Coerce(int)})
async def ws_ai_compose(hass, mailer, uid, msg):
    orig = await _msg(mailer, uid, msg) if msg.get("uid") and msg.get("account") else None
    return await ai.compose(hass, mailer, msg["prompt"], orig)


@command("ai/translate", {**ONE, vol.Optional("language", default="English"): vol.All(str, vol.Length(max=40))})
async def ws_ai_translate(hass, mailer, uid, msg):
    return {"text": await ai.translate(hass, mailer, await _msg(mailer, uid, msg), msg["language"])}


@command("ai/actions", ONE)
async def ws_ai_actions(hass, mailer, uid, msg):
    return {"actions": await ai.find_actions(hass, mailer, await _msg(mailer, uid, msg))}


@command("ai/categories", {vol.Required("items"): vol.All([vol.Schema({vol.Required("account"): str, vol.Required("uid"): vol.Coerce(int),
                                                                      vol.Optional("from"): list, vol.Optional("subject"): vol.Any(None, str),
                                                                      vol.Optional("preview"): vol.Any(None, str)}, extra=vol.REMOVE_EXTRA)],
                                                         vol.Length(max=120))})
async def ws_ai_categories(hass, mailer, uid, msg):
    return {"cats": await mailer.smart.async_categories(uid, msg["items"])}


@command("ai/ask", {**ONE, vol.Required("question"): vol.All(str, vol.Length(min=1, max=500)),
                    vol.Optional("history", default=[]): [vol.Schema({vol.Optional("q"): str, vol.Optional("a"): str})]})
async def ws_ai_ask(hass, mailer, uid, msg):
    return {"answer": await ai.ask(hass, mailer, await _msg(mailer, uid, msg), msg["question"], msg["history"])}


@command("ai/thread", {ACC: str, vol.Required("subject"): str})
async def ws_ai_thread(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    items = (await mailer.async_conversation(uid, a.id, msg["subject"]))[-12:]
    if len(items) < 2:
        raise MailError("invalid", "This email isn't part of a longer conversation.")
    from .mailparse import parse_message
    msgs = []
    for it in items:
        try:
            m = await hass.async_add_executor_job(parse_message, await a.async_raw(it["folder"], it["uid"]))
        except MailError:
            continue
        m.update({"date": it["date"], "from": it.get("from") or m.get("from")})
        msgs.append(m)
    return {"summary": await ai.thread_summary(hass, mailer, msgs, a.acc.get("from_name") or ""), "count": len(msgs)}


@command("ai/attachment", {**ONE, vol.Required("part"): vol.Coerce(int)})
async def ws_ai_attachment(hass, mailer, uid, msg):
    import os
    import tempfile
    a = mailer.account(uid, msg["account"])
    found = await a.async_part(msg["folder"], msg["uid"], msg["part"])
    if not found:
        raise MailError("not_found", "That attachment couldn't be found.")
    data, mime, name = found
    mime = (mime or "application/octet-stream").split(";")[0].strip().lower()
    if not (mime == "application/pdf" or mime.startswith("image/")):
        raise MailError("invalid", "The AI can look at PDFs and pictures.")
    if len(data) > 15_000_000:
        raise MailError("invalid", "That attachment is too big for the AI to read.")

    def write() -> str:
        ext = ".pdf" if mime == "application/pdf" else "." + mime.split("/")[-1].replace("jpeg", "jpg")
        fd, path = tempfile.mkstemp(prefix="crow_email_", suffix=ext)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return path
    path = await hass.async_add_executor_job(write)
    try:
        m = await _msg(mailer, uid, msg)
        return await ai.attachment_insights(hass, mailer, m, path, mime, name or "attachment")
    finally:
        await hass.async_add_executor_job(lambda: os.path.exists(path) and os.remove(path))


@command("ai/search", {vol.Required("query"): vol.All(str, vol.Length(min=1, max=300)), vol.Optional("account"): vol.Any(None, str)})
async def ws_ai_search(hass, mailer, uid, msg):
    if not ai.on(hass, mailer, "search"):
        raise MailError("ai_unavailable", ai.FRIENDLY["not_set_up"])
    return await mailer.smart.async_search(uid, msg["query"], msg.get("account"))


@command("ai/scam", ONE)
async def ws_ai_scam(hass, mailer, uid, msg):
    m = await _msg(mailer, uid, msg)
    return await ai.scam_check(hass, mailer, m, (m.get("scam") or {}).get("reasons") or [])


@command("ai/tone", {vol.Required("text"): vol.All(str, vol.Length(max=20000)), vol.Optional("to", default=""): vol.All(str, vol.Length(max=300))})
async def ws_ai_tone(hass, mailer, uid, msg):
    return await ai.tone_check(hass, mailer, msg["text"], msg["to"])


@command("parcels")
def ws_parcels(hass, mailer, uid, msg):
    return mailer.smart.parcels_for(uid)


@command("bills/locate", {ACC: str, vol.Required("item"): str})
async def ws_bills_locate(hass, mailer, uid, msg):
    """Where a bill's email is now; a bill whose email has been deleted leaves Bills."""
    return await mailer.aix.async_locate(uid, msg["account"], "bills", msg["item"])


@command("appointments/locate", {ACC: str, vol.Required("item"): str})
async def ws_appointments_locate(hass, mailer, uid, msg):
    """Where an appointment's email is now; one whose email has been deleted leaves Appointments."""
    return await mailer.aix.async_locate(uid, msg["account"], "appointments", msg["item"])


@command("parcels/locate", {ACC: str, vol.Required("item"): str})
async def ws_parcels_locate(hass, mailer, uid, msg):
    """Where a parcel's email is now (it follows the email when it's archived or moved)."""
    return await mailer.smart.async_locate(uid, msg["account"], msg["item"])


@command("parcels/action", {ACC: str, vol.Required("item"): str,
                            vol.Required("action"): vol.In(("remove", "delivered", "undelivered", "rename", "restore")),
                            vol.Optional("name", default=""): vol.All(str, vol.Length(max=120))})
def ws_parcels_action(hass, mailer, uid, msg):
    return mailer.smart.parcel_action(uid, msg["account"], msg["item"], msg["action"], msg["name"])


# Add to Parcels: an email the Parcel Tracker didn't catch as it arrived (older mail, or a forward).
# The AI reads it for the details; if it finds nothing, the tracking number the card found is used.
@command("parcels/add", {**ONE_MSG, vol.Optional("found"): vol.Schema({
    vol.Optional("tracking", default=""): vol.All(str, vol.Length(max=60)),
    vol.Optional("courier", default=""): vol.All(str, vol.Length(max=60)),
    vol.Optional("tracking_url", default=""): vol.All(str, vol.Length(max=500))}, extra=vol.REMOVE_EXTRA),
    vol.Optional("auto", default=False): bool})
async def ws_parcels_add(hass, mailer, uid, msg):
    import re
    if not ai.on(hass, mailer, "parcels"):
        raise MailError("ai_unavailable", "The Parcel Tracker is turned off. An administrator can turn it on in the card editor.")
    a = mailer.account(uid, msg["account"])
    m = await _msg(mailer, uid, msg)
    # opening the email again doesn't bring back a parcel you deleted (Add to Parcels does)
    if msg["auto"] and mailer.smart.was_removed(a, {"tracking": re.sub(r"\s+", "", (msg.get("found") or {}).get("tracking", ""))}, m.get("message_id") or ""):
        raise MailError("removed", "You deleted this parcel from Parcels.")
    it = {"uid": int(msg["uid"]), "folder": msg.get("folder") or "INBOX", "subject": m.get("subject", ""), "from": m.get("from"),
          "message_id": m.get("message_id") or ""}
    parcel = None
    try:
        parcel = (await ai.analyse(hass, mailer, m, {"parcels"})).get("parcel")
    except MailError:
        parcel = None
    found = msg.get("found") or {}
    if not parcel and not found.get("tracking"):
        raise MailError("not_found", "Couldn't find a delivery in this email.")
    if not parcel:
        parcel = {"item": re.sub(r"^((re|fwd?|aw|sv):\s*)+", "", it["subject"], flags=re.I)[:120], "retailer": "", "courier": "",
                  "status": "in_transit", "expected": "", "tracking": "", "tracking_url": ""}
    # what the card found fills any gaps
    if found.get("tracking") and not parcel.get("tracking"):
        parcel["tracking"] = re.sub(r"\s+", "", found["tracking"])
    if found.get("courier") and not parcel.get("courier"):
        parcel["courier"] = found["courier"]
    if found.get("tracking_url", "").startswith("https://") and not parcel.get("tracking_url"):
        parcel["tracking_url"] = found["tracking_url"]
    if not mailer.smart.add_parcel(a, it, parcel, force=not msg["auto"]):
        raise MailError("removed", "You deleted this parcel from Parcels.")
    return mailer.smart.parcels_for(uid)


# ── Food Orders and Supermarket Deliveries ──
ORDER_KIND = vol.Required("kind")


@command("orders", {ORDER_KIND: vol.In(("food", "groceries"))})
def ws_orders(hass, mailer, uid, msg):
    return mailer.orders.list_for(uid, msg["kind"])


@command("orders/locate", {ACC: str, ORDER_KIND: vol.In(("food", "groceries")), vol.Required("item"): str})
async def ws_orders_locate(hass, mailer, uid, msg):
    return await mailer.orders.async_locate(uid, msg["account"], msg["kind"], msg["item"])


@command("orders/action", {ACC: str, ORDER_KIND: vol.In(("food", "groceries")), vol.Required("item"): str,
                           vol.Required("action"): vol.In(("remove", "delivered", "undelivered", "restore"))})
def ws_orders_action(hass, mailer, uid, msg):
    return mailer.orders.action(uid, msg["account"], msg["kind"], msg["item"], msg["action"])


# Add to Food Orders or Supermarket Deliveries: an email that wasn't caught as it arrived (older mail, a forward,
# or one that went into Parcels before these existed). It leaves Parcels when it's added here.
@command("orders/add", {**ONE_MSG, ORDER_KIND: vol.In(("food", "groceries"))})
async def ws_orders_add(hass, mailer, uid, msg):
    kind = msg["kind"]
    if not ai.on(hass, mailer, kind):
        raise MailError("ai_unavailable", ("Food Orders are" if kind == "food" else "Supermarket Deliveries are")
                        + " turned off. An administrator can turn them on in the card editor.")
    a = mailer.account(uid, msg["account"])
    m = await _msg(mailer, uid, msg)
    it = {"uid": int(msg["uid"]), "folder": msg.get("folder") or "INBOX", "subject": m.get("subject", ""), "from": m.get("from"),
          "message_id": m.get("message_id") or ""}
    res = await ai.analyse(hass, mailer, m, {kind})
    found = res.get("food" if kind == "food" else "grocery")
    if not found:
        raise MailError("not_found", "Couldn't find a food order in this email." if kind == "food"
                        else "Couldn't find a supermarket delivery in this email.")
    mailer.orders.add(a, it, kind, found, force=True)
    mailer.smart.drop_parcels(a, it["folder"], [it["uid"]])
    return mailer.orders.list_for(uid, kind)


# ── Travel, Returns, Renewals, Home Visits, Tickets, Council and Receipts ──
FIND_KINDS = ("travel", "returns", "renewals", "visits", "tickets", "council", "receipts")
FIND_KIND = vol.Required("kind")


@command("finds", {FIND_KIND: vol.In(FIND_KINDS)})
def ws_finds(hass, mailer, uid, msg):
    return mailer.finds.list_for(uid, msg["kind"])


@command("finds/locate", {ACC: str, FIND_KIND: vol.In(FIND_KINDS), vol.Required("item"): str})
async def ws_finds_locate(hass, mailer, uid, msg):
    return await mailer.finds.async_locate(uid, msg["account"], msg["kind"], msg["item"])


@command("finds/action", {ACC: str, FIND_KIND: vol.In(FIND_KINDS), vol.Required("item"): str,
                          vol.Required("action"): vol.In(("remove", "restore", "status")),
                          vol.Optional("status", default=""): vol.All(str, vol.Length(max=20))})
def ws_finds_action(hass, mailer, uid, msg):
    return mailer.finds.action(uid, msg["account"], msg["kind"], msg["item"], msg["action"], msg["status"])


# Add to Travel, Returns and the rest: an email that wasn't caught as it arrived
@command("finds/add", {**ONE_MSG, FIND_KIND: vol.In(FIND_KINDS)})
async def ws_finds_add(hass, mailer, uid, msg):
    kind = msg["kind"]
    if not ai.on(hass, mailer, kind):
        raise MailError("ai_unavailable", "That's turned off. An administrator can turn it on in the card editor.")
    a = mailer.account(uid, msg["account"])
    m = await _msg(mailer, uid, msg)
    it = {"uid": int(msg["uid"]), "folder": msg.get("folder") or "INBOX", "subject": m.get("subject", ""), "from": m.get("from"),
          "message_id": m.get("message_id") or ""}
    found = ((await ai.analyse(hass, mailer, m, {kind})).get("finds") or {}).get(kind)
    if not found:
        raise MailError("not_found", "Couldn't find anything for that in this email.")
    mailer.finds.add(a, it, kind, found, force=True)
    if kind == "returns":
        mailer.smart.drop_parcels(a, it["folder"], [it["uid"]])
    return mailer.finds.list_for(uid, kind)


@command("codes/done", {vol.Required("item"): str})
def ws_codes_done(hass, mailer, uid, msg):
    return mailer.finds.code_done(uid, msg["item"])


@command("nudges", {vol.Optional("check", default=False): bool})
async def ws_nudges(hass, mailer, uid, msg):
    if msg["check"] and ai.on(hass, mailer, "followup"):
        for a in [x for x in mailer.accounts.values() if x.acc["owner"] == uid]:
            await mailer.smart.async_follow_ups(a)
    return mailer.smart.nudges_for(uid)


@command("nudges/action", {ACC: str, vol.Required("item"): str, vol.Required("action"): vol.In(("dismiss", "snooze"))})
def ws_nudges_action(hass, mailer, uid, msg):
    return mailer.smart.nudge_action(uid, msg["account"], msg["item"], msg["action"])


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe)
    for handler in COMMANDS:
        websocket_api.async_register_command(hass, handler)


# ── extras: pinned emails, invitations, read receipts, voting, describing pictures ──
@command("pins")
async def ws_pins(hass, mailer, uid, msg):
    return await mailer.extras.async_pinned_items(uid)


@command("pins/set", {**ONE_MSG, vol.Required("on"): bool, vol.Optional("message_id", default=""): str})
def ws_pins_set(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    return mailer.extras.set_pin(uid, a, msg["folder"], msg["uid"], msg["on"], msg["message_id"])


@command("invite/reply", {**ONE_MSG, vol.Required("status"): vol.In(("ACCEPTED", "TENTATIVE", "DECLINED")),
                          vol.Optional("note", default=""): vol.All(str, vol.Length(max=1000))})
async def ws_invite_reply(hass, mailer, uid, msg):
    from .extras import build_ics
    from .mailparse import text_to_html
    a = mailer.account(uid, msg["account"])
    m = await a.async_message(msg["folder"], msg["uid"], False, mark_seen=False)
    inv = m.get("invite")
    if not inv or not inv.get("organizer"):
        raise MailError("not_found", "This invitation can't be answered.")
    me = {"email": a.acc["email"], "name": a.acc.get("from_name") or ""}
    ev = {k: inv.get(k) for k in ("uid", "title", "location", "sequence")}
    ev["start"], ev["end"] = inv["start"], inv.get("end")
    ics = build_ics("REPLY", ev, inv["organizer"], [me], hass.config.time_zone, partstat=msg["status"])
    word = {"ACCEPTED": "Accepted", "TENTATIVE": "Maybe", "DECLINED": "Declined"}[msg["status"]]
    body = f"{me['name'] or me['email']} {'will' if msg['status'] == 'ACCEPTED' else 'might' if msg['status'] == 'TENTATIVE' else 'won’t'} be there."
    if msg["note"].strip():
        body += "\n\n" + msg["note"].strip()
    await mailer.async_send(uid, a.id, {"to": [inv["organizer"]], "subject": f"{word}: {inv.get('title') or m.get('subject') or ''}",
                                        "html": text_to_html(body), "_ics": ("REPLY", ics),
                                        "reply": {"mode": "reply", "folder": msg["folder"], "uid": msg["uid"]}, "quote": False})
    from .manager import now_ms
    mailer.extras.data["receipts"][f"rsvp:{inv['uid']}"] = {"status": msg["status"], "at": now_ms()}
    mailer.save()
    return {"status": msg["status"]}


@command("receipt/send", ONE_MSG)
async def ws_receipt_send(hass, mailer, uid, msg):
    a = mailer.account(uid, msg["account"])
    await mailer.extras.async_send_receipt(uid, a, msg["folder"], msg["uid"])
    return {"sent": True}


@command("ai/describe", {vol.Optional("account"): str, vol.Optional("folder", default="INBOX"): str, vol.Optional("uid"): vol.Coerce(int),
                         vol.Optional("part"): vol.Coerce(int), vol.Optional("image"): vol.All(str, vol.Length(max=12_000_000))})
async def ws_ai_describe(hass, mailer, uid, msg):
    """What's in a picture: one in an email, or one you're about to send (as its alt text)."""
    import base64
    import os
    import re
    import tempfile
    m = None
    if msg.get("image"):
        mt = re.match(r"^data:(image/(?:png|jpeg|gif|webp));base64,(.+)$", msg["image"], re.S)
        if not mt:
            raise MailError("invalid", "That isn't a picture.")
        mime, data = mt.group(1), base64.b64decode(mt.group(2))
    elif msg.get("account") and msg.get("uid") and msg.get("part"):
        a = mailer.account(uid, msg["account"])
        found = await a.async_part(msg["folder"], msg["uid"], msg["part"])
        if not found:
            raise MailError("not_found", "That picture couldn't be found.")
        data, mime, _name = found
        mime = (mime or "").split(";")[0].strip().lower()
        if not mime.startswith("image/"):
            raise MailError("invalid", "The AI can describe pictures.")
        try:
            m = await _msg(mailer, uid, msg)
        except MailError:
            m = None
    else:
        raise MailError("invalid", "Choose a picture.")
    if len(data) > 15_000_000:
        raise MailError("invalid", "That picture is too big for the AI.")

    def write() -> str:
        fd, path = tempfile.mkstemp(prefix="crow_email_", suffix="." + mime.split("/")[-1].replace("jpeg", "jpg"))
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return path
    path = await hass.async_add_executor_job(write)
    try:
        return await ai.describe_picture(hass, mailer, path, mime, m)
    finally:
        await hass.async_add_executor_job(lambda: os.path.exists(path) and os.remove(path))


@command("pdf/images", {vol.Required("urls"): vol.All([vol.All(str, vol.Length(max=2000))], vol.Length(max=80))})
def ws_pdf_images(hass, mailer, uid, msg):
    """Pictures from the web in an email being saved as a PDF: fetched through Home Assistant."""
    return {u: mailer.proxied_url(u) for u in msg["urls"] if u.lower().startswith(("http://", "https://"))}
