"""Archive, Remind Me Later and location requests for Crow Messenger.

* Archive: each person can tuck a conversation away in Archived. A new message brings it
  back to the chat list, unless that person has chosen Keep Chats Archived.
* Remind Me Later: press and hold a message and choose when to be reminded. Home Assistant
  keeps the time (so it still goes off after a restart), then sends a notification, marks
  the conversation unread and brings it back out of Archived.
* Location request: "Where are you?" - the other person can share where they are once,
  from their Home Assistant person, or say Not Now.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_utc_time

from .const import HA_SENDER_ID

if TYPE_CHECKING:
    from .manager import Messenger

MAX_REMINDERS = 100        # per person
REMIND_MAX_DAYS = 366


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


class OrganiseMixin:
    """Mixed into Messenger."""

    # ── what each person sees ───────────────────────────────────────────────
    def organise_thread_view(self: Messenger, thread: dict, uid: str) -> dict:
        reminders = [{"message_id": r["message_id"], "at": r["at"]} for r in self.data.get("reminders", [])
                     if r["uid"] == uid and r["thread_id"] == thread["id"]]
        return {
            "archived": uid in thread.get("archived", []),
            "reminders": reminders,
            "reminded": (thread.get("reminded") or {}).get(uid),
        }

    def _push_thread(self: Messenger, thread: dict, uid: str) -> None:
        self._send_to(uid, {"type": "thread", "thread": self.thread_view(thread, uid)})

    # ── Archive ─────────────────────────────────────────────────────────────
    def set_archived(self: Messenger, uid: str, thread_id: str, on: bool) -> dict:
        thread = self._thread(uid, thread_id)
        lst = thread.setdefault("archived", [])
        if on and uid not in lst:
            lst.append(uid)
            # an archived chat isn't pinned to the top any more
            if uid in thread.get("pinned", []):
                thread["pinned"].remove(uid)
        elif not on and uid in lst:
            lst.remove(uid)
        for key in ("archived", "pinned"):
            if not thread.get(key):
                thread.pop(key, None)
        self._save()
        self._push_thread(thread, uid)
        return self.thread_view(thread, uid)

    def _unarchive_for(self: Messenger, thread: dict, uids: list[str]) -> list[str]:
        lst = thread.get("archived") or []
        back = [u for u in uids if u in lst]
        for u in back:
            lst.remove(u)
        if not lst:
            thread.pop("archived", None)
        return back

    @callback
    def after_send_organise(self: Messenger, thread: dict, msg: dict) -> None:
        """A new message brings the chat back out of Archived (unless someone keeps theirs archived)."""
        if not thread.get("archived") or msg.get("type") == "system":
            return
        keep = [u for u in thread["archived"] if self.profile_for(u).get("keep_archived")]
        back = self._unarchive_for(thread, [u for u in list(thread["archived"]) if u not in keep])
        if back:
            self._save()
            for u in back:
                self._push_thread(thread, u)

    # ── Remind Me Later ─────────────────────────────────────────────────────
    def set_reminder(self: Messenger, uid: str, thread_id: str, message_id: str, at: int | None) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        rems = self.data.setdefault("reminders", [])
        old = [r for r in rems if r["uid"] == uid and r["message_id"] == message_id]
        if at:
            # check the new time before the old reminder goes, so a mistake doesn't lose it
            at = int(at)
            if at < _now() + 30_000:
                raise _err("invalid_format", "Choose a time in the future")
            if at > _now() + REMIND_MAX_DAYS * 86_400_000:
                raise _err("invalid_format", "Choose a time within the next year")
            if sum(1 for r in rems if r["uid"] == uid) - len(old) >= MAX_REMINDERS:
                raise _err("invalid_format", f"You can have up to {MAX_REMINDERS} reminders")
        for r in old:
            self._cancel_reminder(r)
            rems.remove(r)
        if at:
            r = {"uid": uid, "thread_id": thread_id, "message_id": message_id, "at": at}
            rems.append(r)
            self._arm_reminder(r)
        self._save()
        self._push_thread(thread, uid)
        return self.thread_view(thread, uid)

    def _cancel_reminder(self: Messenger, r: dict) -> None:
        unsub = self.__dict__.setdefault("_rem_unsubs", {}).pop(f"{r['uid']}:{r['message_id']}", None)
        if unsub:
            unsub()

    @callback
    def _arm_reminder(self: Messenger, r: dict) -> None:
        key = f"{r['uid']}:{r['message_id']}"
        subs = self.__dict__.setdefault("_rem_unsubs", {})
        if key in subs:
            subs.pop(key)()

        @callback
        def _due(_when) -> None:
            subs.pop(key, None)
            self.hass.async_create_task(self._async_remind(r))

        when = datetime.fromtimestamp(max(r["at"], _now() + 500) / 1000, tz=timezone.utc)
        subs[key] = async_track_point_in_utc_time(self.hass, _due, when)

    async def _async_remind(self: Messenger, r: dict) -> None:
        rems = self.data.get("reminders", [])
        if r in rems:
            rems.remove(r)
        thread = self.data["threads"].get(r["thread_id"])
        msg = next((m for m in self.data["messages"].get(r["thread_id"], []) if m["id"] == r["message_id"]), None)
        uid = r["uid"]
        if not thread or uid not in thread["participants"] or not msg:
            self._save()
            return
        # back to the top of the list: unread, out of Archived, with the message to jump to
        thread.setdefault("reminded", {})[uid] = msg["id"]
        mu = thread.setdefault("marked_unread", [])
        if uid not in mu:
            mu.append(uid)
        self._unarchive_for(thread, [uid])
        self._save()
        self._push_thread(thread, uid)
        users = await self.async_user_map()
        who = "You" if msg["sender"] == uid else users.get(msg["sender"], {}).get("name", "Someone")
        title = thread.get("name") or ("Reminder" if not thread["is_group"] else "Group")
        self._alert(thread, [uid], f"⏰ Reminder · {title}" if thread.get("name") else "⏰ Reminder",
                    f"{who}: {self._preview_of(msg)}", tag=f"remind_{msg['id']}", urgent=True)

    @callback
    def clear_reminded(self: Messenger, thread: dict, uid: str) -> bool:
        """Reading the conversation clears its "Reminder" label."""
        rem = thread.get("reminded") or {}
        if uid in rem:
            rem.pop(uid)
            if not rem:
                thread.pop("reminded", None)
            return True
        return False

    @callback
    def async_start_organise(self: Messenger) -> None:
        """Reminders keep going after a restart (any that came due meanwhile go off now)."""
        for r in list(self.data.get("reminders", [])):
            self._arm_reminder(r)

    # ── Location request ────────────────────────────────────────────────────
    def check_locreq(self: Messenger, uid: str, thread: dict) -> dict:
        others = [p for p in thread["participants"] if p not in (uid, HA_SENDER_ID)]
        if not others:
            raise _err("invalid_format", "There's nobody here to ask")
        return {"locreq": {"shared": {}, "declined": []}}

    async def async_locreq_answer(self: Messenger, uid: str, thread_id: str, message_id: str, answer: str) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        req = msg.get("locreq")
        if msg.get("type") != "locreq" or req is None:
            raise _err("not_found", "Location request not found")
        if msg["sender"] == uid:
            raise _err("invalid_format", "That's your own request")
        if uid in req.get("shared", {}) or uid in req.get("declined", []):
            raise _err("invalid_format", "You've already answered")
        if answer == "share":
            # the place comes from your Home Assistant person, sent once (not Live)
            sent = await self.async_send(uid, thread_id, "", extra={"type": "location", "location": {}, "reply_to": message_id})
            req.setdefault("shared", {})[uid] = sent["id"]
        else:
            req.setdefault("declined", []).append(uid)
        self._save()
        self._push_update(thread, msg)
        if answer != "share":
            users = await self.async_user_map()
            who = users.get(uid, {}).get("name", "Someone")
            self._alert(thread, [msg["sender"]], "Location", f"{who} isn't sharing their location right now.",
                        tag=f"locreq_{message_id}")
        return self.message_view(msg, self._hidden(thread, uid))

