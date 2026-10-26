"""Email's part of the red number on the Home Assistant app's icon.

There's one badge for Crow Messenger: unread messages plus unread email. Crow Messenger's badge
(messenger badge.py) owns it, sets it and pushes it; this adds the email part and keeps each
person's own choices (whether email counts, and which email: all unread, email that notified
them or VIPs only). It's on when App Icon Badge is on in the card editor (Household).
iPhone and iPad: each notification, for a message or an email, carries the whole number, and when
it changes without a notification a silent update ("delete_alert") sets it.
Whether or not the badge is on, notifications for email you've read are taken away on every phone
and tablet (on Android that's also what makes the app's dot go away).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.core import callback

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

COUNTS = ("unread", "notified", "vip")


class Badge:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        mailer.data.setdefault("badge_extra", {})
        mailer.data.setdefault("notified", {})
        mailer.data.pop("badge_sent", None)   # the number sent is Crow Messenger's to keep now
        self._last_unread: dict[str, int] = {}

    def unload(self) -> None:
        pass

    # ── settings ───────────────────────────────────────────────────────────
    @property
    def _owner(self):
        """Crow Messenger's badge: the one that sets the number on everyone's phones."""
        return self.mailer.messenger.badge

    @property
    def enabled(self) -> bool:
        return bool(self._owner.enabled)

    def prefs(self, uid: str) -> dict:
        p = (self.mailer.data["prefs"].get(uid) or {}).get("badge") or {}
        return {"on": p.get("on", True), "count": p.get("count") if p.get("count") in COUNTS else "unread"}

    def save_prefs(self, uid: str, d: dict) -> dict:
        cur = self.prefs(uid)
        if isinstance(d.get("on"), bool):
            cur["on"] = d["on"]
        if d.get("count") in COUNTS:
            cur["count"] = d["count"]
        self.mailer.data["prefs"].setdefault(uid, {})["badge"] = cur
        self.mailer.save()
        self.changed(uid, now=True)
        return cur

    # ── the number ─────────────────────────────────────────────────────────
    def email_count(self, uid: str) -> int:
        field = {"unread": "unread", "notified": "unread_notified", "vip": "unread_vip"}[self.prefs(uid)["count"]]
        return sum(int(a.stats.get(field) or 0) for a in self.mailer.accounts.values() if a.acc["owner"] == uid)

    def unread(self, uid: str) -> int:
        """Unread email in this person's inboxes (the red dot on Email in the card's app bar)."""
        return sum(int(a.stats.get("unread") or 0) for a in self.mailer.accounts.values() if a.acc["owner"] == uid)

    def part(self, uid: str) -> int:
        """What email adds to this person's badge (0 when they've left email out of it)."""
        if not uid or not self.prefs(uid)["on"]:
            return 0
        return max(0, self.email_count(uid) + int(self.mailer.data["badge_extra"].get(uid) or 0))

    def total(self, uid: str) -> int | None:
        """The whole badge for this person (messages and email), or None when the badge is off."""
        return self._owner.total(uid)

    def state_for(self, uid: str) -> dict:
        return {"enabled": self.enabled, **self.prefs(uid), "total": self.total(uid)}

    @callback
    def sent(self, uid: str, n: int) -> None:
        """A notification just carried this number."""
        self._owner.note_sent(uid, n)

    def for_notification(self, uid: str, extra: int = 0) -> int | None:
        return self._owner.for_notification(uid, extra)

    def set_extra(self, uid: str, n: int) -> None:
        self.mailer.data["badge_extra"][uid] = max(0, int(n))
        self.mailer.save()
        self.changed(uid, now=True)

    # ── when the number changes without a notification ─────────────────────
    @callback
    def changed(self, uid: str, now: bool = False) -> None:
        if not uid:
            return
        self._owner.changed(uid, now=now)
        self._unread_changed(uid)

    @callback
    def _unread_changed(self, uid: str) -> None:
        """The red dot on Email in the app bar, on every open Crow Messenger card."""
        n = self.unread(uid)
        if self._last_unread.get(uid) == n:
            return
        self._last_unread[uid] = n
        self.mailer.messenger.send_to_user(uid, {"type": "email_unread", "unread": n})

    async def async_push(self, uid: str, force: bool = False) -> None:
        await self._owner.async_push(uid, force=force)
        for a in self.mailer.accounts.values():
            if a.acc["owner"] == uid:
                a.publish()
        self.mailer.send_to(uid, {"type": "badge", "badge": self.state_for(uid)})

    def devices(self, uid: str) -> list[tuple[str, bool]]:
        """This person's phones and tablets: (notify service, whether it's an iPhone or iPad)."""
        from homeassistant.util import slugify
        out = []
        for entry in self.hass.config_entries.async_entries("mobile_app"):
            if entry.data.get("user_id") != uid:
                continue
            service = f"mobile_app_{slugify(entry.data.get('device_name') or entry.title or '')}"
            if self.hass.services.has_service("notify", service):
                os_name = str(entry.data.get("os_name") or "").lower()
                out.append((service, os_name in ("ios", "ipados", "macos") or "iphone" in service or "ipad" in service))
        return out

    # ── notifications for email that's been read ────────────────────────────
    def note_notified(self, a: "Account", uid_: int) -> None:
        lst = self.mailer.data["notified"].setdefault(a.id, [])
        if uid_ not in lst:
            lst.append(uid_)
            del lst[:-400]
            self.mailer.save()

    def notified(self, account_id: str) -> list[int]:
        return self.mailer.data["notified"].get(account_id, [])

    async def async_clear(self, a: "Account", uids: list[int]) -> None:
        """Take away the notifications for email that's now been read - here or in another mail app -
        on every phone and tablet (on Android that's also what makes the app's dot go away)."""
        mine = set(self.notified(a.id))
        gone = [u for u in uids if u in mine]
        if not gone:
            return
        self.mailer.data["notified"][a.id] = [u for u in self.notified(a.id) if u not in gone]
        services = [s for s, _ios in self.devices(a.acc["owner"])]
        for u in gone[:20]:
            for service in services:
                try:
                    await self.hass.services.async_call("notify", service, {"message": "clear_notification",
                                                                            "data": {"tag": f"crow_email_{a.id}_{u}"}})
                except Exception:  # noqa: BLE001
                    pass
