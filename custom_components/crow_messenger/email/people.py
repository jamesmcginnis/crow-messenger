"""Each person's contacts and card backgrounds, kept private to them.

Contacts are Crow Messenger's own contacts book (one book for Messages, Email and the Feed): Email
reads and changes it through Crow Messenger, so a contact added in either shows in both.

Contacts follow the vCard fields, so they can be imported from and exported to phones. Backgrounds
are a photo (a data URL, resized in the card) or a Live Wallpaper ("live:<name>"), for every
mailbox ("*") or for one mailbox.
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CONTACT_TEXT_FIELDS = (
    "prefix", "first", "middle", "last", "suffix", "nickname", "pronouns",
    "phonetic_first", "phonetic_last", "company", "job_title", "department",
    "notes", "birthday",
)
CONTACT_LIST_FIELDS = ("phones", "emails", "urls", "addresses", "dates", "related", "social")
ADDRESS_KEYS = ("label", "street", "city", "county", "postcode", "country")
MAX_CONTACTS = 5000
MAX_PHOTO = 400_000
MAX_BACKGROUND = 2_500_000
MAX_BACKGROUNDS = 40
LIVE_WALLPAPERS = ("rain", "aurora", "lava", "night", "fire", "ocean", "sky", "snowfall", "fireflies", "space", "fairy", "liquid")


class PeopleError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _clean(value: Any, limit: int = 2000) -> str:
    return "" if value is None else str(value).strip()[:limit]


def sanitize_contact(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raise PeopleError("invalid", "A contact must be an object")
    out: dict[str, Any] = {}
    for key in CONTACT_TEXT_FIELDS:
        if raw.get(key):
            out[key] = _clean(raw[key], 10000 if key == "notes" else 300)
    photo = raw.get("photo")
    if photo:
        photo = str(photo)
        if not photo.startswith("data:image/") or len(photo) > MAX_PHOTO:
            raise PeopleError("invalid", "That contact photo is too large")
        out["photo"] = photo
    out["favourite"] = bool(raw.get("favourite"))
    for key in CONTACT_LIST_FIELDS:
        items = raw.get(key) or []
        if not isinstance(items, list):
            continue
        cleaned = []
        for item in items[:50]:
            if not isinstance(item, dict):
                continue
            if key == "addresses":
                entry = {k: _clean(item.get(k), 300) for k in ADDRESS_KEYS}
                if any(entry[k] for k in ADDRESS_KEYS if k != "label"):
                    cleaned.append(entry)
            else:
                entry = {"label": _clean(item.get("label"), 60), "value": _clean(item.get("value"), 500)}
                if key == "emails":
                    entry["value"] = entry["value"].lower()
                if entry["value"]:
                    cleaned.append(entry)
        if cleaned:
            out[key] = cleaned
    return out


class People:
    def __init__(self, hass: HomeAssistant, mailer) -> None:
        self.hass = hass
        self.mailer = mailer
        self.bstore = Store(hass, 1, f"{DOMAIN}.backgrounds", private=True, atomic_writes=True)
        self.backgrounds: dict[str, dict[str, str]] = {}
        self.stickers: dict = {"images": {}, "users": {}}

    async def async_load(self) -> None:
        bdata = await self.bstore.async_load() or {}
        self.backgrounds = bdata.get("users", {})
        self.stickers = bdata.get("stickers") or {"images": {}, "users": {}}

    def _save_backgrounds(self) -> None:
        self.bstore.async_delay_save(lambda: {"users": self.backgrounds, "stickers": self.stickers}, 2)

    # ── stickers: Crow Messenger's, so the same ones are in Messages and Email ──
    def stickers_for(self, uid: str) -> list[str]:
        return self._messenger.stickers_for(uid)

    def sticker_images(self, uid: str, ids: list[str]) -> dict:
        mine = set(self._messenger.stickers_for(uid))
        return self._messenger.sticker_images([i for i in ids if i in mine])

    def save_sticker(self, uid: str, image: str) -> str:
        from ..manager import MessengerError
        try:
            return self._messenger.save_sticker(uid, image)
        except MessengerError as err:
            raise PeopleError("invalid", str(err)) from err

    def delete_sticker(self, uid: str, sid: str) -> None:
        self._messenger.delete_sticker(uid, sid)

    # ── contacts: Crow Messenger's book ─────────────────────────────────
    @property
    def _messenger(self):
        return self.mailer.messenger

    def contacts_for(self, uid: str) -> list[dict]:
        return self._messenger.contacts_for(uid)

    def has_email(self, uid: str, email_addr: str) -> bool:
        e = (email_addr or "").strip().lower()
        if not e:
            return False
        return any(str(x.get("value") or "").strip().lower() == e for c in self.contacts_for(uid) for x in c.get("emails") or [])

    def save_contacts(self, uid: str, contacts: list[dict]) -> list[dict]:
        from ..manager import MessengerError
        try:
            return self._messenger.save_contacts(uid, contacts)
        except MessengerError as err:
            raise PeopleError("invalid", str(err)) from err

    def delete_contacts(self, uid: str, ids: list[str]) -> None:
        self._messenger.delete_contacts(uid, ids)

    def contacts_changed(self, uid: str) -> None:
        """Crow Messenger's book changed (here, in Messages or anywhere else): open Email screens follow
        (and your VIPs, when your Favourites count as VIPs)."""
        self.mailer.send_to(uid, {"type": "contacts", "contacts": self.contacts_for(uid)})
        self.mailer.send_to(uid, {"type": "vips", "vips": self.mailer.vips(uid)})

    # ── backgrounds ──────────────────────────────────────────────────────
    def backgrounds_for(self, uid: str) -> dict:
        """Each mailbox's own background, and the one for everything ("*"), which is Crow Messenger's
        background for all your chats: set it in either and both have it."""
        out = {k: v for k, v in self.backgrounds.get(uid, {}).items() if k != "*"}
        try:
            shared = self._messenger.backgrounds_for(uid).get("*")
        except Exception:  # noqa: BLE001
            shared = None
        if shared:
            out["*"] = shared
        return out

    def set_background(self, uid: str, key: str, image: str | None) -> dict:
        key = _clean(key, 400) or "*"
        if key == "*":
            # the background for everything is Crow Messenger's (all chats and all mailboxes)
            from ..manager import MessengerError
            try:
                self._messenger.set_background(uid, "*", image)
            except MessengerError as err:
                raise PeopleError("invalid", str(err)) from err
            self.backgrounds.get(uid, {}).pop("*", None)
            self._save_backgrounds()
            self.mailer.send_to(uid, {"type": "backgrounds", "backgrounds": self.backgrounds_for(uid)})
            return self.backgrounds_for(uid)
        mine = self.backgrounds.setdefault(uid, {})
        if image:
            if image == "none":
                pass
            elif image.startswith("live:"):
                if image[5:] not in LIVE_WALLPAPERS:
                    raise PeopleError("invalid", "Unknown live wallpaper")
            elif not image.startswith("data:image/") or len(image) > MAX_BACKGROUND:
                raise PeopleError("invalid", "That picture is too large")
            if key not in mine and len(mine) >= MAX_BACKGROUNDS:
                raise PeopleError("invalid", "Too many backgrounds")
            mine[key] = image
        else:
            mine.pop(key, None)
        self._save_backgrounds()
        self.mailer.send_to(uid, {"type": "backgrounds", "backgrounds": self.backgrounds_for(uid)})
        return self.backgrounds_for(uid)
