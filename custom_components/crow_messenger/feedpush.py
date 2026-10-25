"""Buttons on Feed notifications, like the ones on message notifications.

Press and hold a Feed notification to react, comment, reply, save, answer an event, vote in a
poll, claim something up for grabs, write on a birthday card, leave a group you were added to,
or hide someone for 30 days - without opening the card. iPhone and iPad show up to ten buttons;
Android shows three at most, so each kind of notification lists its most useful three first.

Every button goes through the same Feed methods as the card, so the same privacy rules apply:
a button never lets someone see, comment on or answer a post they couldn't in the card.

Typed answers: iPhone uses a text box on the button itself; Android has one Reply box per
notification (the "REPLY" action), matched back to the post through the notification's tag.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from .const import DEFAULT_SETTINGS, HA_SENDER_ID

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

PREFIX = "CROW_F_"                 # every Feed button starts with this
TAG_PREFIX = "crow_feed_"          # the notification tag: crow_feed_<post>[_<comment>] or crow_feed_group_<group>
MAX_IOS = 10
MAX_ANDROID = 3
OMW_TEXT = "On my way 🚗"

# each can be switched off in the editor (Notifications → Feed Notification Buttons)
BUTTON_DEFAULTS = DEFAULT_SETTINGS["notifications"]["feed_buttons"]

# why a notification was sent -> the kind of buttons it gets
POST_REASONS = ("new_posts", "mentions", "tags", "page", "groups", "birthdays", "events", "event_reminder")


def buttons_on(messenger: "Messenger") -> dict:
    fb = (messenger.settings.get("notifications", {}) or {}).get("feed_buttons") or {}
    return {k: bool(fb.get(k, v)) for k, v in BUTTON_DEFAULTS.items()}


def tag_for(post: dict | None, comment_id: str | None = None, group_id: str | None = None) -> str:
    if post is None:
        return f"{TAG_PREFIX}group_{group_id}"
    return f"{TAG_PREFIX}{post['id']}" + (f"_{comment_id}" if comment_id else "")


def actions_for(messenger: "Messenger", uid: str, post: dict | None, why: str, platform: str,
                comment_id: str | None = None, group_id: str | None = None, ref: str = "", dash: str = "") -> list[dict]:
    """The buttons on one person's Feed notification."""
    feed = messenger.feed
    on = buttons_on(messenger)
    ios = platform == "ios"
    out: list[dict] = []
    typed_done = False   # Android has room for one typed answer per notification

    def add(action: str, title: str, icon: str) -> None:
        a: dict[str, Any] = {"action": action, "title": title}
        if ios:
            a["icon"] = f"sfsymbols:{icon}"
            a["activationMode"] = "background"
        out.append(a)

    def typed(action: str, title: str, placeholder: str, icon: str) -> None:
        nonlocal typed_done
        if typed_done:
            return
        typed_done = True
        if ios:
            out.append({"action": action, "title": title, "behavior": "textInput", "textInputButtonTitle": "Send",
                        "textInputPlaceholder": placeholder, "icon": f"sfsymbols:{icon}"})
        else:
            out.append({"action": "REPLY", "title": title})

    def open_link(title: str, query: str, icon: str) -> None:
        # a button that opens the card (iPhone and Android both open a link from a notification button)
        if not dash:
            return
        a: dict[str, Any] = {"action": "URI", "title": title, "uri": f"{dash}?{query}"}
        if ios:
            a["icon"] = f"sfsymbols:{icon}"
        out.append(a)

    def react(pid: str, key: str) -> None:
        names = {"love": ("❤️ Love", "heart.fill"), "like": ("👍 Like", "hand.thumbsup.fill"),
                 "haha": ("😂 Haha", "face.smiling"), "wow": ("😮 Wow", "exclamationmark.bubble")}
        title, icon = names[key]
        add(f"{PREFIX}RX_{pid}_{key}", title, icon)

    # a wave: Wave Back
    if post is None and why == "wave":
        if ref and feed.on("waves"):
            add(f"{PREFIX}WB_{ref}", "👋 Wave Back", "hand.wave.fill")
        return out
    if post is None and why == "story":
        return out   # a tap opens the story
    if post is None and why == "quiet":
        open_link("Open", "crow_feed=alerts", "bell.fill")
        return out
    # added to a group: Leave Group
    if post is None:
        if group_id and on["leave"]:
            g = feed.data["groups"].get(group_id)
            if g and uid in g["members"] and g["created_by"] != uid:
                add(f"{PREFIX}GL_{group_id}", "Leave Group", "rectangle.portrait.and.arrow.right")
        return out

    if not feed.can_see(uid, post) or why in ("reactions", "activity"):
        return []   # someone reacted, or answered something of yours: a tap opens it, that's all
    pid = post["id"]
    kind = post.get("kind", "post")
    can_comment = feed.can_comment(uid, post)
    mine = post["author"] == uid

    # a comment on your post, or a reply to yours: Reply, and Like or Love their comment
    if why == "comments" and comment_id:
        c = next((x for x in post.get("comments", []) if x["id"] == comment_id), None)
        if c and c["author"] != uid:
            if on["comment"] and can_comment:
                typed(f"{PREFIX}RP_{pid}_{comment_id}", "Reply", "Reply", "arrowshape.turn.up.left.fill")
            if on["reactions"]:
                add(f"{PREFIX}CRX_{pid}_{comment_id}_like", "👍 Like", "hand.thumbsup.fill")
                add(f"{PREFIX}CRX_{pid}_{comment_id}_love", "❤️ Love", "heart.fill")
        return out[:MAX_IOS if ios else MAX_ANDROID]

    if why not in POST_REASONS:
        return []

    if kind == "birthday":
        if on["birthday"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Write on the Card", "Happy birthday!", "gift.fill")
        if on["reactions"]:
            add(f"{PREFIX}RX_{pid}_love", "🎂 Celebrate", "party.popper.fill")
    elif kind == "event" and post.get("event"):
        if why == "event_reminder" and on["events"] and not mine:
            # a reminder: On My Way first
            add(f"{PREFIX}OMW_{pid}", "On My Way", "car.fill")
        if on["events"]:
            current = (post["event"].get("rsvp") or {}).get(uid)
            for ans, title, icon in (("going", "Going", "checkmark.circle.fill"), ("maybe", "Maybe", "questionmark.circle"),
                                     ("no", "Can't Go", "xmark.circle")):
                if current != ans:
                    add(f"{PREFIX}EV_{pid}_{ans}", title, icon)
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
    elif kind == "poll" and post.get("poll"):
        if on["polls"]:
            mine_votes = set((post["poll"].get("votes") or {}).get(uid) or [])
            for opt in post["poll"]["options"]:
                tick = "✓ " if opt["id"] in mine_votes else ""
                add(f"{PREFIX}PV_{pid}_{opt['id']}", f"{tick}{opt['text'][:40]}", "chart.bar.fill")
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
        if on["reactions"]:
            react(pid, "love")
    elif kind == "list" and post.get("list"):
        # tick things off, or add one
        if can_comment:
            for item in [i for i in post["list"]["items"] if not i.get("done")][:2 if not ios else 6]:
                add(f"{PREFIX}LT_{pid}_{item['id']}", f"☐ {item['text'][:40]}", "checklist")
            if on["comment"]:
                typed(f"{PREFIX}LA_{pid}", "Add an Item", "Item", "plus.circle.fill")
    elif kind == "recs":
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Recommend Someone", "Who would you suggest?", "lightbulb.fill")
        if on["reactions"]:
            react(pid, "like")
    elif post.get("shared"):
        if on["reactions"]:
            react(pid, "like")
            react(pid, "love")
        open_link("Open Original", f"crow_post={post['shared']}", "arrow.up.right.square")
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
    elif post.get("profile_update"):
        if on["reactions"]:
            react(pid, "love")
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
        if on["reactions"]:
            react(pid, "like")
    elif kind == "grabs" and post.get("grabs"):
        if on["claim"] and not mine and post["grabs"].get("status") == "available":
            add(f"{PREFIX}CL_{pid}", "Claim It", "hand.raised.fill")
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
        if on["reactions"]:
            react(pid, "like")
    else:
        # a post, an @mention, a photo tag or a post on your page
        if on["reactions"]:
            react(pid, "love")
            react(pid, "like")
        if on["comment"] and can_comment:
            typed(f"{PREFIX}CM_{pid}", "Comment", "Write a comment", "text.bubble.fill")
        if on["save"] and pid not in feed.person(uid)["saved"]:
            add(f"{PREFIX}SV_{pid}", "Save", "bookmark.fill")
        if on["reactions"]:
            react(pid, "haha")
            react(pid, "wow")
        if on["hide"] and not mine and post["author"] != HA_SENDER_ID:
            name = messenger.entities.name(post["author"]).split(" ")[0]
            add(f"{PREFIX}HD_{pid}", f"Hide {name} for 30 Days", "eye.slash")
    return out[:MAX_IOS if ios else MAX_ANDROID]


def is_feed_reply(action: str, tag: str) -> bool:
    return action == "REPLY" and tag.startswith(TAG_PREFIX) and not tag.startswith(f"{TAG_PREFIX}group_")


async def async_handle(hass: "HomeAssistant", messenger: "Messenger", uid: str, action: str,
                       text: str = "", tag: str = "") -> bool:
    """A button on a Feed notification was tapped. True when it was one of ours."""
    if is_feed_reply(action, tag):
        # Android's Reply box: the tag says which post (and which comment)
        rest = tag[len(TAG_PREFIX):].split("_")
        action = f"{PREFIX}RP_{rest[0]}_{rest[1]}" if len(rest) > 1 else f"{PREFIX}CM_{rest[0]}"
    if not action.startswith(PREFIX):
        return False
    feed = messenger.feed
    parts = action[len(PREFIX):].split("_")
    what, ref = parts[0], parts[1] if len(parts) > 1 else ""
    text = (text or "").strip()
    try:
        if what == "GL":
            feed.group_leave(uid, ref)
            await _async_clear(hass, messenger, uid, f"{TAG_PREFIX}group_{ref}")
            return True
        if what == "WB":
            try:
                feed.wave(uid, ref)
            finally:
                await _async_clear(hass, messenger, uid, f"{TAG_PREFIX}wave_{ref}")
            return True
        post = feed._post(uid, ref)   # not shared with them (any more): stops here
        if what == "RX" and len(parts) > 2:
            if (post.get("reactions") or {}).get(uid) != parts[2]:
                feed.react(uid, ref, parts[2])
        elif what == "CRX" and len(parts) > 3:
            c = next((x for x in post.get("comments", []) if x["id"] == parts[2]), None)
            if c and (c.get("reactions") or {}).get(uid) != parts[3]:
                feed.comment_react(uid, ref, parts[2], parts[3])
        elif what == "LT" and len(parts) > 2:
            item = next((i for i in (post.get("list") or {}).get("items", []) if i["id"] == parts[2]), None)
            if item and not item.get("done"):
                await feed.async_list_item(uid, ref, "toggle", parts[2], None)
        elif (what == "LA" or (what == "CM" and post.get("kind") == "list")) and text:
            await feed.async_list_item(uid, ref, "add", None, text)   # Android's Reply box adds to the list too
        elif what == "CM" and text:
            await feed.async_comment(uid, ref, {"text": text})
        elif what == "RP" and len(parts) > 2 and text:
            await feed.async_comment(uid, ref, {"text": text, "reply_to": parts[2]})
        elif what == "SV":
            feed.save_post(uid, ref, True)
        elif what == "HD":
            feed.snooze(uid, post["author"], 30)
        elif what == "EV" and len(parts) > 2:
            feed.rsvp(uid, ref, parts[2])
        elif what == "OMW":
            await feed.async_comment(uid, ref, {"text": OMW_TEXT})
        elif what == "PV" and len(parts) > 2:
            poll = post.get("poll") or {}
            votes = list((poll.get("votes") or {}).get(uid) or [])
            if poll.get("multi"):
                votes = [v for v in votes if v != parts[2]] if parts[2] in votes else votes + [parts[2]]
            else:
                votes = [parts[2]]
            feed.vote(uid, ref, votes)
        elif what == "CL":
            feed.grabs(uid, ref, "claim")
        else:
            return True
    except Exception as err:  # noqa: BLE001 - a button that can't do it just doesn't (the card shows why)
        _LOGGER.info("Crow Messenger Feed notification button: %s", err)
        return True
    feed.mark_post_seen(uid, ref)
    # done: take that notification away (iPhone keeps a background action's notification otherwise)
    if not tag:
        tag = f"{TAG_PREFIX}{ref}" + (f"_{parts[2]}" if what in ("RP", "CRX") and len(parts) > 2 else "")
    await _async_clear(hass, messenger, uid, tag)
    return True


async def _async_clear(hass: "HomeAssistant", messenger: "Messenger", uid: str, tag: str) -> None:
    from .notify import devices_for_user
    for device in devices_for_user(hass, messenger, uid):
        try:
            await hass.services.async_call("notify", device["service"],
                                           {"message": "clear_notification", "data": {"tag": tag}}, blocking=False)
        except Exception:  # noqa: BLE001
            pass
