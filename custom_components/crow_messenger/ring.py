"""Ring Phone: make someone's phone ring loudly, even on silent, until they say they've found it.

The ring is a message in the conversation. Its phone notification is sent again every
RING_EVERY seconds (with the same tag, so it replaces itself) until the person taps
"I've Found It" - on the notification or in the chat - or the sender taps "Stop Ringing",
or RING_TIMES rings have gone unanswered. Opening the chat doesn't stop it on purpose:
someone looking for their phone may well be reading the chat on a tablet.
A restart never starts a ring again; any still ringing are marked as stopped.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.core import callback
from homeassistant.helpers.event import async_call_later

from .const import HA_SENDER_ID

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

RING_EVERY = 30   # seconds between rings
RING_TIMES = 6    # rings before it gives up (about three minutes)


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


class RingMixin:
    # ── sending one ─────────────────────────────────────────────────────────
    def check_ring(self: Messenger, uid: str, thread: dict, extra: dict) -> dict:
        others = [p for p in thread["participants"] if p not in (uid, HA_SENDER_ID)]
        if not others:
            raise _err("invalid_format", "There's nobody here to ring")
        want = (extra.get("ring") or {}).get("to") or others
        to = [p for p in dict.fromkeys(want) if p in others]
        if not to:
            raise _err("invalid_format", "Choose whose phone to ring")
        # one ring at a time from each person in a conversation
        for m in (self.data["messages"].get(thread["id"]) or [])[-60:]:
            if m.get("type") == "ring" and m["sender"] == uid and "ringing" in ((m.get("ring") or {}).get("state") or {}).values():
                raise _err("invalid_format", "It's already ringing - stop that one first")
        return {"ring": {"to": to, "state": {p: "ringing" for p in to}, "rings": 0}}

    @callback
    def after_send_ring(self: Messenger, thread: dict, msg: dict) -> None:
        if msg.get("type") == "ring":
            self._ring_tick(thread["id"], msg["id"])

    # ── ringing ─────────────────────────────────────────────────────────────
    def _ring_msg(self: Messenger, thread_id: str, message_id: str) -> tuple[dict | None, dict | None]:
        thread = self.data["threads"].get(thread_id)
        msg = next((m for m in (self.data["messages"].get(thread_id) or []) if m["id"] == message_id), None)
        return thread, msg

    @callback
    def _ring_tick(self: Messenger, thread_id: str, message_id: str) -> None:
        timers = self.__dict__.setdefault("_ring_timers", {})
        timers.pop(message_id, None)
        thread, msg = self._ring_msg(thread_id, message_id)
        if not thread or not msg:
            return
        ring = msg.get("ring") or {}
        state = ring.setdefault("state", {})
        ringing = [p for p, st in state.items() if st == "ringing"]
        if not ringing:
            return
        if ring.get("rings", 0) >= RING_TIMES:
            for p in ringing:
                state[p] = "unanswered"
            self._save()
            self._push_update(thread, msg)
            self._ring_clear(thread, msg, ringing)
            self._ring_tell_sender(thread, msg, ringing, "unanswered")
            return
        ring["rings"] = ring.get("rings", 0) + 1
        self._save()
        self._push_update(thread, msg)
        cb = self.__dict__.get("ring_callback")
        if cb:
            self.hass.async_create_task(cb(thread, msg, ringing))
        timers[message_id] = async_call_later(self.hass, RING_EVERY, lambda _now: self._ring_tick(thread_id, message_id))

    async def async_ring_answer(self: Messenger, uid: str, thread_id: str, message_id: str, answer: str) -> dict:
        """'found' - the person whose phone it is has it; 'stop' - the sender stops it."""
        thread, msg = self._msg(uid, thread_id, message_id)
        ring = msg.get("ring")
        if msg.get("type") != "ring" or ring is None:
            raise _err("not_found", "That ring isn't here any more")
        state = ring.setdefault("state", {})
        if answer == "found":
            if state.get(uid) != "ringing":
                return self.message_view(msg, self._hidden(thread, uid))
            state[uid] = "found"
            done = [uid]
            self._ring_tell_sender(thread, msg, done, "found")
        else:
            if msg["sender"] != uid:
                raise _err("invalid_format", "Only the person ringing can stop it")
            done = [p for p, st in state.items() if st == "ringing"]
            for p in done:
                state[p] = "stopped"
        if not any(st == "ringing" for st in state.values()):
            unsub = self.__dict__.setdefault("_ring_timers", {}).pop(message_id, None)
            if unsub:
                unsub()
        self._save()
        self._push_update(thread, msg)
        self._ring_clear(thread, msg, done)
        return self.message_view(msg, self._hidden(thread, uid))

    async def async_ring_from_notification(self: Messenger, uid: str, thread_id: str, message_id: str) -> None:
        """'I've Found It' on the notification itself."""
        thread, msg = self._find(thread_id, message_id)
        if thread and msg and uid in thread["participants"]:
            await self.async_ring_answer(uid, thread_id, message_id, "found")

    def _ring_clear(self: Messenger, thread: dict, msg: dict, uids: list[str]) -> None:
        cb = self.__dict__.get("ring_clear_callback")
        if cb and uids:
            self.hass.async_create_task(cb(thread, msg, uids))

    def _ring_tell_sender(self: Messenger, thread: dict, msg: dict, uids: list[str], what: str) -> None:
        if msg["sender"] == HA_SENDER_ID or not uids:
            return

        async def _tell() -> None:
            users = await self.async_user_map()
            names = ", ".join(users.get(p, {}).get("name", "Someone").split(" ")[0] for p in uids)
            body = f"{names} found their phone." if what == "found" else f"{names} didn't answer - it rang {RING_TIMES} times."
            self._alert(thread, [msg["sender"]], "📳 Ring Phone", body, tag=f"ringdone_{msg['id']}")

        self.hass.async_create_task(_tell())

    # ── after a restart, and when unloading ──────────────────────────────────
    @callback
    def async_start_ring(self: Messenger) -> None:
        changed = False
        for msgs in self.data["messages"].values():
            for msg in msgs:
                state = (msg.get("ring") or {}).get("state") or {}
                for p, st in state.items():
                    if st == "ringing":
                        state[p] = "stopped"
                        changed = True
        if changed:
            self._save()

    @callback
    def async_stop_ring(self: Messenger) -> None:
        for unsub in list(self.__dict__.get("_ring_timers", {}).values()):
            unsub()
        self.__dict__["_ring_timers"] = {}
