"""The extras on a new-email notification.

Buttons: Reply, Mark as Read, Archive, Flag, Remind Me in 1 Hour and Delete, each switched on or
off in the card editor, each with an SF Symbol on iPhone and iPad. Android shows three at most, and
no typed reply (Android has one shared Reply button for every app).

The picture: the sender's photo from your contacts, otherwise the first photo attached to the email.

Grouping: by account (as before), or - when turned on in the editor - by sender, so a stack of
notifications reads "3 more emails from Amazon".

Quiet Hours: each person can choose hours when email arrives silently (VIPs still come through).

Sound: each account can have its own sound on iPhone (Android: each account has its own
notification channel, so the sound is chosen in the phone's settings).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
import time
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from .const import DOMAIN, NOTIFY_ACTION_PREFIX

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

# key, title, SF Symbol, extras; in the order they appear
BUTTONS = (
    ("reply", "Reply", "arrowshape.turn.up.left.fill", {"behavior": "textInput", "textInputButtonTitle": "Send",
                                                          "textInputPlaceholder": "Reply"}),
    ("read", "Mark as Read", "envelope.open", {"activationMode": "background"}),
    ("archive", "Archive", "archivebox", {"activationMode": "background"}),
    ("flag", "Flag", "flag.fill", {"activationMode": "background"}),
    ("remind", "Remind Me in 1 Hour", "clock", {"activationMode": "background"}),
    ("delete", "Delete", "trash", {"activationMode": "background", "destructive": True}),
)
BUTTON_DEFAULTS = {"reply": True, "read": True, "archive": True, "flag": False, "remind": False, "delete": False}
VERB = {"reply": "REPLY", "read": "READ", "archive": "ARCHIVE", "flag": "FLAG", "remind": "REMIND", "delete": "DELETE"}
MAX_IOS = 10
MAX_ANDROID = 3

# iPhone sounds: "default" is the usual tri-tone; the rest are the iPhone's own alert tones, which the
# Home Assistant app can use once they've been imported (App Settings > Notifications > Sounds > System)
SOUNDS = {
    "default": "Default", "new-mail.caf": "New Mail", "Anticipate.caf": "Anticipate", "Bloom.caf": "Bloom",
    "Calypso.caf": "Calypso", "Choo_Choo.caf": "Choo Choo", "Descent.caf": "Descent", "Fanfare.caf": "Fanfare",
    "Ladder.caf": "Ladder", "Minuet.caf": "Minuet", "News_Flash.caf": "News Flash", "Noir.caf": "Noir",
    "Sherwood_Forest.caf": "Sherwood Forest", "Spell.caf": "Spell", "Suspense.caf": "Suspense",
    "Telegraph.caf": "Telegraph", "Tiptoes.caf": "Tiptoes", "Typewriters.caf": "Typewriters", "Update.caf": "Update",
}
QUIET_DEFAULT = {"on": False, "from": "22:00", "to": "07:00"}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


# ── settings ──────────────────────────────────────────────────────────────────
def notif_settings(mailer: "Mailer") -> dict:
    n = mailer.settings.get("notifications") or {}
    b = n.get("buttons") or {}
    return {"buttons": {k: bool(b.get(k, v)) for k, v in BUTTON_DEFAULTS.items()},
            "group_sender": bool(n.get("group_sender", False))}


def quiet_for(mailer: "Mailer", uid: str) -> dict:
    q = (mailer.data["prefs"].get(uid) or {}).get("quiet") or {}
    out = {**QUIET_DEFAULT, **{k: q[k] for k in ("on", "from", "to") if k in q}}
    for k in ("from", "to"):
        if not TIME_RE.match(str(out[k])):
            out[k] = QUIET_DEFAULT[k]
    out["on"] = bool(out["on"])
    return out


def save_quiet(mailer: "Mailer", uid: str, d: dict) -> dict:
    cur = quiet_for(mailer, uid)
    if isinstance(d.get("on"), bool):
        cur["on"] = d["on"]
    for k in ("from", "to"):
        if TIME_RE.match(str(d.get(k) or "")):
            cur[k] = d[k]
    mailer.data["prefs"].setdefault(uid, {})["quiet"] = cur
    mailer.save()
    return cur


def in_quiet(mailer: "Mailer", uid: str, now: datetime | None = None) -> bool:
    q = quiet_for(mailer, uid)
    if not q["on"]:
        return False
    now = now or dt_util.now()
    cur = now.hour * 60 + now.minute
    f = int(q["from"][:2]) * 60 + int(q["from"][3:])
    t = int(q["to"][:2]) * 60 + int(q["to"][3:])
    if f == t:
        return False
    return f <= cur < t if f < t else (cur >= f or cur < t)


def sound_for(a: "Account") -> str:
    s = a.acc.get("sound") or "default"
    return s if s in SOUNDS else "default"


# ── buttons ───────────────────────────────────────────────────────────────────
def actions(mailer: "Mailer", ref: str, ios: bool) -> list[dict]:
    on = notif_settings(mailer)["buttons"]
    out = []
    for key, title, icon, extra in BUTTONS:
        if not on.get(key):
            continue
        a = {"action": f"{NOTIFY_ACTION_PREFIX}|{VERB[key]}|{ref}", "title": title}
        if ios:
            a.update(extra)
            a["icon"] = f"sfsymbols:{icon}"
        elif key == "reply":
            # Android only has one typed-reply button for every app ("REPLY"), so it isn't offered there
            continue
        out.append(a)
    return out[:MAX_IOS] if ios else out[:MAX_ANDROID]


# ── the sender's photo ────────────────────────────────────────────────────────
def _sign(mailer: "Mailer", tok: str) -> str:
    return hmac.new(mailer.data["secret"].encode(), f"photo:{tok}".encode(), hashlib.sha256).hexdigest()[:32]


def contact_photo(mailer: "Mailer", uid: str, email_addr: str) -> str | None:
    email_addr = (email_addr or "").strip().lower()
    if not email_addr:
        return None
    for c in mailer.book.contacts_for(uid):
        if c.get("photo") and any(str(e.get("value") or "").strip().lower() == email_addr for e in c.get("emails") or []):
            return c["photo"]
    return None


def photo_url(mailer: "Mailer", uid: str, email_addr: str) -> str | None:
    if not contact_photo(mailer, uid, email_addr):
        return None
    payload = json.dumps({"u": uid, "e": email_addr.strip().lower(), "x": int(time.time()) + 7 * 86400},
                         separators=(",", ":")).encode()
    tok = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    return f"/api/{DOMAIN}/photo/{tok}.{_sign(mailer, tok)}"


def photo_bytes(mailer: "Mailer", token: str) -> tuple[bytes, str] | None:
    tok, _, sig = token.partition(".")
    if not tok or not hmac.compare_digest(_sign(mailer, tok), sig):
        return None
    try:
        info = json.loads(base64.urlsafe_b64decode(tok + "=" * (-len(tok) % 4)))
    except Exception:  # noqa: BLE001
        return None
    if int(info.get("x") or 0) < time.time():
        return None
    photo = contact_photo(mailer, info.get("u"), info.get("e"))
    m = re.match(r"data:(image/[\w.+-]+);base64,(.*)$", photo or "", re.S)
    if not m:
        return None
    try:
        return base64.b64decode(m.group(2)), m.group(1)
    except Exception:  # noqa: BLE001
        return None


async def async_picture(mailer: "Mailer", a: "Account", it: dict) -> str | None:
    """The sender's photo, or the first photo attached to the email."""
    frm = (it.get("from") or [{}])[0]
    url = photo_url(mailer, a.acc["owner"], frm.get("email") or "")
    if url:
        return url
    if not it.get("attachments"):
        return None
    try:
        msg = await a.async_message("INBOX", int(it["uid"]), False, mark_seen=False)
    except Exception as err:  # noqa: BLE001 - a picture is a nice-to-have
        _LOGGER.debug("Crow Messenger Email notification picture: %s", err)
        return None
    for att in msg.get("attachments") or []:
        if str(att.get("mime") or "").startswith("image/") and not att.get("inline") and att.get("part") is not None:
            return mailer.signed_url(a.id, "INBOX", int(it["uid"]), int(att["part"]))
    return None


def thread_key(a: "Account", it: dict, by_sender: bool) -> str:
    if not by_sender:
        return f"crow_email_{a.id}"
    frm = ((it.get("from") or [{}])[0].get("email") or "").lower()
    return f"crow_email_{a.id}_{hashlib.sha1(frm.encode()).hexdigest()[:10]}"
