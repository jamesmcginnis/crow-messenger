"""Reset Crow Messenger: delete what's chosen, for everyone, from Home Assistant too.

Administrators only, from the bottom of the card editor's household settings. Choose any of:

* messages   - chats, messages, reactions, polls, games, checklists, Send Later, reminders, starred
* media      - every photo, video and file (deleted from disk: the whole crow_messenger_media folder)
* feed       - posts, comments, stories, groups, albums, milestones, birthdays, Notifications history
* contacts   - everyone's private address books
* personal   - profiles, skins, chat backgrounds, chat themes, saved stickers, quick replies
* settings   - household settings back to the defaults

Afterwards the integration reloads itself, so every timer that was waiting (Send Later, reminders,
events, birthdays, live locations) is gone too, and every open card is told to start again empty
(and wipes what it kept in the browser). A card that was closed does the same the next time it
opens, because the reset is remembered by its id. Home Assistant users, the sensors and the
integration itself are kept.

A backup can be downloaded first: one .zip with everything Crow Messenger stores, photos and videos
included. Note that a Home Assistant backup made before a reset also brings Crow Messenger's data back
if it's restored.
"""
from __future__ import annotations

import copy
import json
import logging
import os
import shutil
import tempfile
import time
import zipfile
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later

from .const import DEFAULT_SETTINGS, DOMAIN

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

PARTS = ("messages", "media", "feed", "contacts", "personal", "settings")
CONFIRM_WORD = "RESET"
ERASE_WORD = "ERASE"   # Erase Everything: a complete reset, as if just installed
EVENT_RESET = "crow_messenger_reset"
BACKUP_TTL = 3600   # seconds a backup link works (and its file is kept)
BACKUP_PREFIX = "crow-messenger-backup-"

# what goes with "Messages and chats"
MESSAGE_KEYS = ("threads", "messages", "scheduled", "starred", "reminders", "last_active")
# what goes with "Personal settings" (in the main store; the rest is in contacts and backgrounds)
PERSONAL_KEYS = ("quick", "share_hidden", "zone_towns")


def _dir_size(path: str) -> tuple[int, int]:
    total = files = 0
    for root, _dirs, names in os.walk(path):
        for n in names:
            try:
                total += os.path.getsize(os.path.join(root, n))
                files += 1
            except OSError:
                pass
    return total, files


async def async_summary(hass: HomeAssistant, m: "Messenger") -> dict:
    """What a reset would delete, so the sheet can say so."""
    size, files = await hass.async_add_executor_job(_dir_size, m.media_dir)
    f = m.feed.data
    return {
        "threads": len(m.data.get("threads", {})),
        "messages": sum(len(v) for v in m.data.get("messages", {}).values()) if isinstance(m.data.get("messages"), dict) else 0,
        "attachments": len(m.data.get("attachments", {})),
        "media_bytes": size, "media_files": files,
        "posts": len(f.get("posts", {})), "stories": len(f.get("stories", {})),
        "groups": len(f.get("groups", {})), "albums": len(f.get("albums", {})),
        "contacts": sum(len(v) for v in m.cdata.get("contacts", {}).values() if isinstance(v, (dict, list))),
        "profiles": len(m.cdata.get("profiles", {})),
        "last_reset": m.data.get("reset"),
    }


def _empty_feed() -> dict:
    return {"posts": {}, "stories": {}, "groups": {}, "albums": {}, "milestones": {}, "pinned": [], "people": {}, "done": []}


async def async_reset(hass: HomeAssistant, m: "Messenger", uid: str, parts: list[str]) -> dict:
    everything = "everything" in parts
    if everything:
        parts = list(PARTS)
    parts = [p for p in PARTS if p in set(parts)]
    if not parts:
        return {"ok": False}
    from .manager import new_id, now_ms
    users = await m.async_user_map()
    who = (users.get(uid) or {}).get("name") or uid
    # notifications still on phones: clear the ones we know about before forgetting them
    tags: dict[str, list[str]] = {}
    if "messages" in parts or "feed" in parts:
        for u, threads in (getattr(m.badge, "_tags", {}) or {}).items():
            tags[u] = [t for lst in threads.values() for t, _at in lst] if "messages" in parts else []
        if "feed" in parts:
            recent = sorted(m.feed.data.get("posts", {}).values(), key=lambda p: p.get("ts", 0), reverse=True)[:50]
            for u in users:
                tags.setdefault(u, []).extend(f"crow_feed_{p['id']}" for p in recent)

    attachments = m.data.get("attachments", {})
    if "media" in parts:
        doomed = set(attachments)
    else:
        doomed = set()
        if "messages" in parts:
            doomed |= {a for a, att in attachments.items() if not att.get("feed") and not att.get("cover_of")}
        if "feed" in parts:
            doomed |= {a for a, att in attachments.items() if att.get("feed")}
        if "personal" in parts:
            # cover photos go with everyone's shared name and photo
            doomed |= {a for a, att in attachments.items() if att.get("cover_of")}

    if "messages" in parts:
        for k in MESSAGE_KEYS:
            if k in m.data:
                m.data[k] = [] if isinstance(m.data[k], list) else {}
        m.data.setdefault("threads", {})
        m.data.setdefault("messages", {})
        m.data.setdefault("scheduled", [])
        m.last_notified.clear()
        m.__dict__.pop("_shares", None)
    if "feed" in parts:
        m.feed.data = _empty_feed()
        m.feed.__dict__.pop("_links", None)
    if "contacts" in parts:
        m.cdata["contacts"] = {}
    if "personal" in parts:
        m.cdata["profiles"] = {}
        m.backgrounds, m.themes, m.stickers = {}, {}, {}
        for k in PERSONAL_KEYS:
            m.data.pop(k, None)
    if "settings" in parts:
        m.data["settings"] = copy.deepcopy(DEFAULT_SETTINGS)
    if everything:
        # Erase Everything: every last thing goes - which dashboard each person used, starred messages,
        # quick replies, games, saved places, the app badge's memory - and a new signing key, so links
        # made before (notification pictures, streams, backups) stop working too
        import secrets as _secrets
        m.data = {"settings": copy.deepcopy(DEFAULT_SETTINGS), "threads": {}, "messages": {}, "attachments": {},
                  "secret": _secrets.token_hex(32), "auto_paths": {}, "scheduled": []}
        attachments = m.data["attachments"]
        m.cdata = {"contacts": {}, "profiles": {}}
        m.backgrounds, m.themes, m.stickers = {}, {}, {}
        m.feed.data = _empty_feed()
        m.last_notified.clear()
        for k in ("_shares", "_share_seq"):
            m.__dict__.pop(k, None)
        try:
            m.badge._tags.clear()
            m.badge._sent.clear()
        except AttributeError:
            pass
        hass.data.pop(f"{DOMAIN}_backups", None)

    for aid in doomed:
        attachments.pop(aid, None)

    reset = {"id": new_id(), "ts": now_ms(), "by": uid, "parts": ["everything"] if everything else parts}
    m.data["reset"] = reset
    await m.async_flush()

    # the files: the whole folder for "Photos, videos and files", otherwise just what went
    def _wipe() -> int:
        removed = 0
        if "media" in parts:
            for name in os.listdir(m.media_dir):
                path = os.path.join(m.media_dir, name)
                try:
                    shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)
                    removed += 1
                except OSError as err:
                    _LOGGER.warning("Crow Messenger reset could not delete %s: %s", path, err)
            return removed
        keep = {os.path.basename(x) for att in attachments.values() for x in (att.get("file"), att.get("thumb")) if x}
        for att_id in doomed:
            for name in os.listdir(m.media_dir):
                if name.startswith(f"{att_id}_") and name not in keep:
                    try:
                        os.remove(os.path.join(m.media_dir, name))
                        removed += 1
                    except OSError:
                        pass
        return removed

    files = await hass.async_add_executor_job(_wipe)
    _LOGGER.warning("Crow Messenger was %s by %s (%s)%s. %s file(s) deleted.", "erased completely" if everything else "reset",
                    who, uid, "" if everything else f": {', '.join(parts)}", files)
    hass.bus.async_fire(EVENT_RESET, {"user_id": uid, "parts": reset["parts"], "reset_id": reset["id"]})

    # every open card: wipe what it keeps in the browser and start again
    for sub in list(m._subs.values()):
        try:
            sub.send({"type": "reset", "reset_id": reset["id"], "parts": reset["parts"]})
        except Exception:  # noqa: BLE001
            pass

    async def _clear_phones() -> None:
        from .notify import devices_for_user
        for u, ts in tags.items():
            for device in devices_for_user(hass, m, u):
                for tag in dict.fromkeys(ts):
                    try:
                        await hass.services.async_call("notify", device["service"],
                                                       {"message": "clear_notification", "data": {"tag": tag}}, blocking=False)
                    except Exception:  # noqa: BLE001
                        break
    hass.async_create_task(_clear_phones())

    # start again: reloading the integration cancels every timer that was waiting
    entries = hass.config_entries.async_entries(DOMAIN)
    if entries:
        entry_id = entries[0].entry_id
        async_call_later(hass, 1.5, lambda _now: hass.async_create_task(hass.config_entries.async_reload(entry_id)))
    return {"ok": True, "reset": reset, "files": files}


# ── Download a Backup First ───────────────────────────────────────────────────
def _write_backup(path: str, stores: dict[str, Any], media_dir: str) -> int:
    with zipfile.ZipFile(path, "w", allowZip64=True) as z:
        for name, data in stores.items():
            z.writestr(f"{name}.json", json.dumps(data, ensure_ascii=False, indent=1), compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("README.txt", "Crow Messenger backup: messages, contacts, chat backgrounds, the Feed and every photo, "
                   "video and file (in media/). Made " + time.strftime("%Y-%m-%d %H:%M") + ".\n", compress_type=zipfile.ZIP_DEFLATED)
        if os.path.isdir(media_dir):
            for root, _dirs, names in os.walk(media_dir):
                for n in names:
                    full = os.path.join(root, n)
                    # photos and videos are compressed already
                    z.write(full, os.path.join("media", os.path.relpath(full, media_dir)), compress_type=zipfile.ZIP_STORED)
    return os.path.getsize(path)


async def async_backup(hass: HomeAssistant, m: "Messenger") -> dict:
    await m.async_flush()
    data = {k: v for k, v in m.data.items() if k != "secret"}
    stores = {"messages": data, "contacts": m.cdata,
              "backgrounds": {"users": m.backgrounds, "themes": m.themes, "stickers": m.stickers}, "feed": m.feed.data}
    name = f"{BACKUP_PREFIX}{time.strftime('%Y-%m-%d-%H%M')}.zip"
    path = os.path.join(tempfile.gettempdir(), f"{os.urandom(8).hex()}-{name}")
    size = await hass.async_add_executor_job(_write_backup, path, stores, m.media_dir)
    exp = int(time.time()) + BACKUP_TTL
    token = os.path.basename(path)
    sig = m._sign(f"backup:{token}:{exp}")
    hass.data.setdefault(f"{DOMAIN}_backups", {})[token] = path

    def _gone(_now) -> None:
        hass.data.get(f"{DOMAIN}_backups", {}).pop(token, None)
        hass.async_add_executor_job(_rm, path)
    async_call_later(hass, BACKUP_TTL, _gone)
    return {"url": f"/api/crow_messenger/backup/{token}/{exp}/{sig}", "size": size, "name": name}


def _rm(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


def backup_path(hass: HomeAssistant, m: "Messenger", token: str, exp: str, sig: str) -> str | None:
    import hmac
    try:
        if int(exp) < time.time():
            return None
    except ValueError:
        return None
    if not hmac.compare_digest(m._sign(f"backup:{token}:{exp}"), sig):
        return None
    path = hass.data.get(f"{DOMAIN}_backups", {}).get(token)
    return path if path and os.path.exists(path) else None


# ── Removing the integration removes its data ─────────────────────────────────
async def async_remove_all(hass: HomeAssistant) -> None:
    """Called when Crow Messenger is deleted in Settings → Devices & Services: nothing is left behind."""
    from homeassistant.helpers.storage import Store
    from .const import (MEDIA_DIR_NAME, STORAGE_KEY_BACKGROUNDS, STORAGE_KEY_CONTACTS, STORAGE_KEY_DATA,
                        STORAGE_VERSION)
    from .feed import STORAGE_KEY_FEED
    for key in (STORAGE_KEY_DATA, STORAGE_KEY_CONTACTS, STORAGE_KEY_BACKGROUNDS, STORAGE_KEY_FEED):
        try:
            await Store(hass, STORAGE_VERSION, key, private=True).async_remove()
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Crow Messenger could not remove %s: %s", key, err)
    media = hass.config.path(MEDIA_DIR_NAME)
    await hass.async_add_executor_job(lambda: shutil.rmtree(media, ignore_errors=True))
    _LOGGER.warning("Crow Messenger was removed, with all its messages, posts, contacts, photos, videos and files")
