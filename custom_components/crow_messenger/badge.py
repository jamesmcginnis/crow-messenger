"""The red number on the Home Assistant app's icon: how many unread messages you have.

Off until an administrator turns on App Icon Badge in the card editor.

iPhone and iPad: each Crow Messenger notification carries the number, and when it changes without
a notification (you read a chat on another device, or a chat is muted or removed) a silent update
("delete_alert") sets it.
Whether or not the badge is on, a chat's notifications are taken away on every phone and tablet once
it's been read (on Android that's also what makes the app's dot go away).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.core import callback
from homeassistant.helpers.event import async_call_later

if TYPE_CHECKING:
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

DEBOUNCE = 4
# what the card is told about that can change someone's unread count
COUNTED = ("message", "message_update", "read", "thread", "thread_removed")


class Badge:
    def __init__(self, messenger: "Messenger") -> None:
        self.messenger = messenger
        self.hass = messenger.hass
        self._timers: dict[str, Any] = {}
        # uid -> the number last put on their phones
        self._sent: dict[str, int] = {}
        # uid -> thread id -> notification tags still showing on Android
        self._tags: dict[str, dict[str, list[str]]] = {}

    def unload(self) -> None:
        for cancel in self._timers.values():
            cancel()
        self._timers.clear()

    @property
    def enabled(self) -> bool:
        return bool((self.messenger.settings.get("notifications") or {}).get("badge"))

    # ── the number ─────────────────────────────────────────────────────────
    def total(self, uid: str) -> int | None:
        """Unread messages in chats that aren't muted, or None when the badge is off."""
        if not self.enabled or not uid:
            return None
        m = self.messenger
        n = 0
        for t in m.data.get("threads", {}).values():
            if uid not in t["participants"] or m.is_muted(t, uid):
                continue
            v = m.thread_view(t, uid)
            if v.get("visible"):
                n += int(v.get("unread") or 0) or (1 if v.get("marked_unread") else 0)
        return n

    def for_notification(self, uid: str) -> int | None:
        n = self.total(uid)
        if n is not None:
            self._sent[uid] = n
        return n

    def note_notified(self, uid: str, thread_id: str, tag: str, ts: int) -> None:
        lst = self._tags.setdefault(uid, {}).setdefault(thread_id, [])
        lst.append((tag, ts))
        del lst[:-30]

    @callback
    def read(self, uid: str, thread_id: str, ts: int) -> None:
        """Someone has just read a chat (opened it, or pressed Mark as Read or a tapback): take its
        notifications away on all their phones and tablets."""
        lst = (self._tags.get(uid) or {}).get(thread_id) or []
        gone = [t for t, at in lst if at <= ts]
        if not gone:
            return
        self._tags[uid][thread_id] = [(t, at) for t, at in lst if at > ts]
        self.hass.async_create_task(self._clear(uid, gone))

    # ── a silent update when the number changes without a notification ───────
    @callback
    def changed(self, uid: str, now: bool = False) -> None:
        """Something changed someone's unread messages: bring the badge up to date (when it's on)."""
        if not self.enabled or not uid:
            return
        if uid in self._timers:
            self._timers.pop(uid)()

        async def go(_now=None) -> None:
            self._timers.pop(uid, None)
            await self.async_push(uid)
        if now:
            self.hass.async_create_task(go())
        else:
            self._timers[uid] = async_call_later(self.hass, DEBOUNCE, go)

    @callback
    def everyone_changed(self, force: bool = False) -> None:
        """The setting was switched: bring everyone's badge up to date (or clear it)."""
        uids = {u for t in self.messenger.data.get("threads", {}).values() for u in t["participants"]}
        for uid in uids:
            self.hass.async_create_task(self.async_push(uid, force=force, clear=not self.enabled))

    async def async_push(self, uid: str, force: bool = False, clear: bool = False) -> None:
        from .notify import devices_for_user
        if clear:
            n = 0
            self._sent.pop(uid, None)
        else:
            n = self.total(uid)
            if n is None:
                return
            if not force and self._sent.get(uid) == n:
                return
            self._sent[uid] = n
        for device in devices_for_user(self.hass, self.messenger, uid):
            if device["platform"] != "ios":
                continue
            try:
                await self.hass.services.async_call("notify", device["service"],
                                                    {"message": "delete_alert", "data": {"push": {"badge": n}}})
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Crow Messenger couldn't update the badge on %s: %s", device["service"], err)

    async def _clear(self, uid: str, tags: list[str]) -> None:
        from .notify import devices_for_user
        for device in devices_for_user(self.hass, self.messenger, uid):
            for tag in tags[-20:]:
                try:
                    await self.hass.services.async_call("notify", device["service"], {"message": "clear_notification",
                                                                                      "data": {"tag": tag}})
                except Exception:  # noqa: BLE001
                    pass
