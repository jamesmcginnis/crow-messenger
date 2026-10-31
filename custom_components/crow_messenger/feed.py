"""Feed: a private, household-only social feed inside Crow Messenger.

Posts (text, photos, videos, link previews, a feeling, a place), reactions, comments with
replies and @mentions, stories, groups, albums, polls, events with RSVPs and reminders,
Chip In pots, Up for Grabs, birthdays, milestones, On This Day, Year in Review, pinned and
saved posts, snoozing people, an activity log and posts from automations.

Privacy is the rule everything else follows: every post has an audience - everyone at home,
chosen people, only me, or a group - and the server only ever shows a post (its text, its
photos, its comments, who reacted, the notifications about it) to the people in that
audience. Nothing about a post's content goes into an entity or an event, only who posted.

Posts follow Keep Messages: they (and their photos, videos and comments) are deleted on the
same schedule as messages. Stories always go after 24 hours.

Everything is kept in its own storage file (crow_messenger.feed), so a busy feed never slows
down the chats.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_utc_time, async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, HA_SENDER_ID, HA_SENDER_NAME, MAX_TEXT_LENGTH, STORAGE_VERSION
from .feedmore import FeedMoreMixin

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY_FEED = f"{DOMAIN}.feed"
EVENT_POST_CREATED = f"{DOMAIN}_post_created"
DAY_MS = 86_400_000
STORY_MS = DAY_MS
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)

REACTIONS = {"love": "❤️", "like": "👍", "haha": "😂", "wow": "😮", "sad": "😢", "angry": "😡"}
BACKGROUNDS = ("accent", "sunset", "ocean", "forest", "berry", "night", "rose", "gold")
KINDS = ("post", "poll", "event", "fund", "grabs", "recs", "list")
AUTO_KINDS = ("birthday", "milestone", "review", "badges")
RSVP = ("going", "maybe", "no")
COMMENT_AUDIENCE = ("all", "people")
REMIND_CHOICES = (0, 15, 60, 180, 1440)

MAX_MEDIA = 20
MAX_COMMENT = 4000
MAX_POLL_OPTIONS = 12
MAX_PINNED = 3
MAX_STORIES = 30
MAX_GROUPS = 50
MAX_ALBUMS = 200
MAX_MILESTONES = 50
MAX_TAGS = 20
BG_MAX_CHARS = 160
PAGE = 20

NOTIFY_DEFAULTS = {"page": True, "comments": True, "reactions": True, "mentions": True, "tags": True,
                   "new_posts": True, "birthdays": True, "events": True, "groups": True,
                   "shares": True, "waves": True, "stories": True,
                   # new posts: the ones that ask something of you, posts from your Favourites, people you follow
                   "important": True, "favourites": True, "following": True}


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


def _now() -> int:
    from .manager import now_ms
    return now_ms()


def _id() -> str:
    from .manager import new_id
    return new_id()


def _str(value: Any, n: int) -> str:
    return str(value or "").strip()[:n]


def _short(text: str, n: int = 80) -> str:
    text = " ".join(str(text or "").split())
    return text if len(text) <= n else text[: n - 1] + "…"


class Feed(FeedMoreMixin):
    """The household feed. One instance, kept on the Messenger as `messenger.feed`."""

    def __init__(self, messenger: "Messenger") -> None:
        self.m = messenger
        self.hass: HomeAssistant = messenger.hass
        self._store: Store = Store(self.hass, STORAGE_VERSION, STORAGE_KEY_FEED, private=True)
        self.data: dict[str, Any] = {}
        self._timers: dict[str, Any] = {}
        self._unsubs: list = []
        # link previews already fetched (url -> (when, preview or None)), and posts being given one
        self._links: dict[str, tuple[int, dict | None]] = {}
        self._link_tries: dict[str, int] = {}
        self.notify_callback = None   # set by __init__ (feed notifications)

    # ── storage ─────────────────────────────────────────────────────────────
    async def async_load(self) -> None:
        stored = await self._store.async_load() or {}
        self.data = {
            "posts": stored.get("posts", {}),
            "stories": stored.get("stories", {}),
            "groups": stored.get("groups", {}),
            "albums": stored.get("albums", {}),
            "milestones": stored.get("milestones", {}),
            "pinned": stored.get("pinned", []),
            # user id -> their own feed things: saved posts, snoozed people, last seen,
            # notification choices, birthday
            "people": stored.get("people", {}),
            # what the daily jobs have already done ("birthday:<uid>:2026", "review:2026", …)
            "done": stored.get("done", []),
        }

    @callback
    def save(self) -> None:
        self._store.async_delay_save(lambda: self.data, 1.0)

    async def async_flush(self) -> None:
        await self._store.async_save(self.data)

    def enabled(self) -> bool:
        return self.m._feature("feed")

    def opt(self, key: str):
        """A household Feed setting (the editor's Household → Feed)."""
        from .const import DEFAULT_SETTINGS
        return {**DEFAULT_SETTINGS["feed"], **(self.m.settings.get("feed") or {})}.get(key)

    def options(self) -> dict:
        from .const import DEFAULT_SETTINGS
        o = {**DEFAULT_SETTINGS["feed"], **(self.m.settings.get("feed") or {})}
        o["kinds"] = {**DEFAULT_SETTINGS["feed"]["kinds"], **(o.get("kinds") or {})}
        # GIFs from GIPHY: only whether they're available (the key itself stays here)
        o["gifs"] = bool(str(self.m.settings.get("giphy_key") or "").strip())
        return o

    def kind_on(self, kind: str) -> bool:
        return self.options()["kinds"].get(kind) is not False

    def person(self, uid: str) -> dict:
        p = self.data["people"].setdefault(uid, {})
        p.setdefault("saved", [])
        p.setdefault("hidden", {})
        p.setdefault("seen", 0)
        p.setdefault("notify", {})
        p.setdefault("notif_seen", _now())   # the bell starts empty
        return p

    def prefs_view(self, uid: str) -> dict:
        p = self.person(uid)
        return {"notify": {**self.notify_base(), **p["notify"]}, "birthday": p.get("birthday") or "",
                "share_birthday": bool(p.get("share_birthday")),
                "hidden": {k: v for k, v in p["hidden"].items() if not v or v > _now()}}

    def set_prefs(self, uid: str, patch: dict) -> dict:
        p = self.person(uid)
        if "notify" in patch:
            for k, v in (patch["notify"] or {}).items():
                if k in NOTIFY_DEFAULTS:
                    p["notify"][k] = bool(v)
        if "birthday" in patch:
            b = _str(patch["birthday"], 10)
            if b and not re.fullmatch(r"(\d{4}|--)-?\d{2}-\d{2}", b):
                raise _err("invalid_format", "Birthday should look like 1990-04-21")
            p["birthday"] = b
        if "share_birthday" in patch:
            p["share_birthday"] = bool(patch["share_birthday"])
        self.save()
        return self.prefs_view(uid)

    def wants(self, uid: str, kind: str) -> bool:
        return {**self.notify_base(), **self.person(uid)["notify"]}.get(kind, True)

    # ── who's who ───────────────────────────────────────────────────────────
    def household(self) -> set[str]:
        """Everyone who can use the feed: the people in the household entity hub."""
        return set(self.m.entities.people) or {u for u in self.data["people"]}

    async def async_household(self) -> set[str]:
        return {u["id"] for u in await self.m.async_users()}

    # ── privacy ─────────────────────────────────────────────────────────────
    def _audience_ok(self, uid: str, aud: dict, author: str) -> bool:
        if uid == author:
            return True
        kind = aud.get("type", "everyone")
        if kind == "everyone":
            return True
        if kind == "people":
            return uid in (aud.get("people") or [])
        if kind == "group":
            g = self.data["groups"].get(aud.get("group") or "")
            return bool(g) and uid in g["members"]
        return False   # "me"

    def can_see(self, uid: str, post: dict) -> bool:
        if not uid or uid == HA_SENDER_ID:
            return False
        if post.get("archived"):
            return uid == post["author"]   # archived: back to only the person who posted it
        if post.get("scheduled_at") and post["scheduled_at"] > _now():
            return uid == post["author"]
        if post.get("page") == uid:
            return True   # a post on your page is always yours to see
        if post.get("album"):
            album = self.data["albums"].get(post["album"])
            if album:
                # an album's photos are for the album's owner, its contributors and its audience
                return uid == post["author"] or self.can_see_album(uid, album)
        return self._audience_ok(uid, post["audience"], post["author"])

    def viewers(self, post: dict, among: set[str] | None = None) -> set[str]:
        people = among if among is not None else self.household()
        return {u for u in people if self.can_see(u, post)}

    def can_comment(self, uid: str, post: dict) -> bool:
        if not self.can_see(uid, post):
            return False
        if post.get("comment_audience") == "people" and uid != post["author"]:
            return uid in (post.get("commenters") or [])
        return True

    def can_see_story(self, uid: str, story: dict) -> bool:
        return story["ts"] > _now() - STORY_MS and self._audience_ok(uid, story["audience"], story["author"])

    def can_see_album(self, uid: str, album: dict) -> bool:
        return uid == album["owner"] or uid in album.get("contributors", []) \
            or self._audience_ok(uid, album["audience"], album["owner"])

    def media_visible(self, uid: str, att: dict) -> bool:
        """Can this person open a photo or video from the feed?"""
        ref = att.get("feed") or {}
        if att.get("highlights") and self.highlight_visible(uid, att):
            return True
        if att.get("story_archive"):
            # your own Story Archive: only you
            if att["story_archive"] == uid:
                return True
        if ref.get("story"):
            story = self.data["stories"].get(ref["story"])
            return bool(story) and self.can_see_story(uid, story)
        post = self.data["posts"].get(ref.get("post") or "")
        if not post:
            return False
        if self.can_see(uid, post):
            return True
        # a post shared into a chat: everyone in that chat could see it when it was sent
        return False

    def check_audience(self, uid: str, raw: dict | None, *, allow_group: bool = True) -> dict:
        raw = raw or {}
        kind = raw.get("type", "everyone")
        if kind == "everyone":
            return {"type": "everyone"}
        if kind == "me":
            return {"type": "me"}
        if kind == "people":
            known = self.household()
            people = [p for p in dict.fromkeys(raw.get("people") or []) if p in known and p != uid]
            if not people:
                raise _err("invalid_format", "Choose who can see it")
            return {"type": "people", "people": people}
        if kind == "group" and allow_group:
            g = self.data["groups"].get(_str(raw.get("group"), 40))
            if not g or uid not in g["members"]:
                raise _err("not_found", "That group isn't one of yours")
            return {"type": "group", "group": g["id"]}
        raise _err("invalid_format", "Unknown audience")

    def _post(self, uid: str, pid: str) -> dict:
        post = self.data["posts"].get(pid)
        if not post or not self.can_see(uid, post):
            raise _err("not_found", "This post isn't available")
        return post

    # ── what the card is shown ──────────────────────────────────────────────
    def _att_view(self, aid: str) -> dict | None:
        att = self.m.data["attachments"].get(aid)
        if not att:
            return {"id": aid, "removed": True}
        return {k: att.get(k) for k in ("id", "name", "mime", "size", "width", "height", "duration")} | {
            "has_thumb": bool(att.get("thumb")), "removed": bool(att.get("removed"))}

    def post_view(self, post: dict, uid: str) -> dict:
        mine = uid == post["author"]
        out: dict[str, Any] = {
            "id": post["id"], "author": post["author"], "ts": post["ts"], "kind": post.get("kind", "post"),
            "text": post.get("text", ""), "bg": post.get("bg"), "feeling": post.get("feeling"),
            "place": post.get("place"), "link": post.get("link"), "link_safety": post.get("link_safety"), "mentions": post.get("mentions", []),
            "media": [v for v in (self._att_view(a) for a in post.get("media", [])) if v],
            "refs": [v for v in (self._att_view(a) for a in post.get("refs", [])) if v and not v.get("removed")],
            "tags": post.get("tags", {}),
            "audience": {"type": post["audience"]["type"],
                         **({"group": post["audience"]["group"]} if post["audience"].get("group") else {}),
                         **({"people": post["audience"].get("people", [])} if mine else {})},
            "comment_audience": post.get("comment_audience", "all"),
            "can_comment": self.can_comment(uid, post),
            "reactions": post.get("reactions", {}),
            "comments": post.get("comments", []),
            "edited": post.get("edited"), "edits": len(post.get("edits", [])),
            "pinned": post["id"] in self.data["pinned"],
            "saved": post["id"] in self.person(uid)["saved"],
            "album": post.get("album"),
            "page": post.get("page"),
            "page_hidden": bool(post.get("page_hidden")),
            "scheduled_at": post.get("scheduled_at") if mine else None,
        }
        if mine:
            out["commenters"] = post.get("commenters", [])
        views = post.get("views") or {}
        if views:
            out["views"] = {a: len(v) for a, v in views.items()}
        kind = out["kind"]
        if kind == "poll":
            out["poll"] = self.m.anon_poll(post["poll"], uid) if post["poll"].get("anonymous") else post["poll"]
        elif kind == "event":
            out["event"] = post["event"]
        elif kind == "fund":
            f = post["fund"]
            pledges = f.get("pledges", {})
            out["fund"] = {k: f.get(k) for k in ("title", "target", "currency", "note")} | {
                "total": round(sum(p["amount"] for p in pledges.values()), 2),
                "count": len(pledges),
                "mine": pledges.get(uid),
                # who chipped in what is for the organiser
                **({"pledges": pledges} if mine else {}),
            }
        elif kind == "grabs":
            out["grabs"] = post["grabs"]
        elif kind in ("birthday", "milestone", "review", "badges"):
            out[kind] = post.get(kind)
        elif kind == "list":
            out["list"] = {"items": post["list"]["items"], "todo": post["list"].get("todo")}
        elif kind == "recs":
            out["recs"] = self.recs_summary(post)
        if post.get("home"):
            out["home"] = post["home"]
        if post.get("shared"):
            out["shared_post"] = self.shared_view(post, uid)
        if post.get("shared_by"):
            out["shares"] = len(post["shared_by"])
        if post.get("profile_update"):
            out["profile_update"] = post["profile_update"]
        if mine and post.get("archived"):
            out["archived"] = post["archived"]
        return out

    def story_view(self, story: dict, uid: str) -> dict:
        out = {k: story.get(k) for k in ("id", "author", "ts", "text", "bg")}
        out["media"] = self._att_view(story["media"]) if story.get("media") else None
        out["seen"] = uid in story.get("views", {})
        out["stickers"] = self.stickers_view(story, uid)
        rx = story.get("reactions") or {}
        if uid == story["author"]:
            out["views"] = story.get("views", {})
            out["audience"] = story["audience"]
            out["reactions"] = {u: r["emoji"] for u, r in rx.items()}
            out["replies"] = story.get("replies") or {}
            out["highlighted"] = any(i.get("story") == story["id"] for h in self.person(uid).get("highlights") or []
                                     for i in h["items"])
        else:
            out["my_reaction"] = (rx.get(uid) or {}).get("emoji")
        return out

    def group_view(self, g: dict, uid: str) -> dict:
        return {**g, "admin": g["created_by"] == uid}

    def album_view(self, a: dict, uid: str) -> dict:
        posts = [p for p in self.data["posts"].values() if p.get("album") == a["id"] and self.can_see(uid, p)]
        media = [x for p in sorted(posts, key=lambda p: p["ts"], reverse=True) for x in p.get("media", [])]
        out = {k: a.get(k) for k in ("id", "name", "owner", "created", "contributors")}
        out["audience"] = {"type": a["audience"]["type"], **({"group": a["audience"]["group"]} if a["audience"].get("group") else {}),
                           **({"people": a["audience"].get("people", [])} if uid == a["owner"] else {})}
        out["count"] = len(media)
        cover = a.get("cover") if a.get("cover") in media else (media[0] if media else None)
        out["cover"] = self._att_view(cover) if cover else None
        out["cover_set"] = bool(a.get("cover") in media)
        out["can_add"] = uid == a["owner"] or uid in a.get("contributors", [])
        return out

    # ── live updates ────────────────────────────────────────────────────────
    def push(self, post: dict, before: set[str] | None = None) -> None:
        """Tell everyone who can see it (and anyone who just lost sight of it)."""
        now_see = self.viewers(post)
        for uid in now_see:
            self.m._send_to(uid, {"type": "feed", "post": self.post_view(post, uid)})
        for uid in (before or set()) - now_see:
            self.m._send_to(uid, {"type": "feed_removed", "post_id": post["id"]})
        for uid in now_see | (before or set()):
            self.m.entities.changed(uid)

    def push_removed(self, post: dict, viewers: set[str]) -> None:
        for uid in viewers:
            self.m._send_to(uid, {"type": "feed_removed", "post_id": post["id"]})
            self.m.entities.changed(uid)

    def push_story(self, story: dict) -> None:
        for uid in self.household():
            if self.can_see_story(uid, story):
                self.m._send_to(uid, {"type": "story", "story": self.story_view(story, uid)})

    def push_groups(self, uids: set[str]) -> None:
        for uid in uids:
            self.m._send_to(uid, {"type": "feed_groups", "groups": self.groups_for(uid)})

    def push_albums(self, uids: set[str] | None = None) -> None:
        for uid in uids or self.household():
            self.m._send_to(uid, {"type": "feed_albums", "albums": self.albums_for(uid)})

    # ── reading ─────────────────────────────────────────────────────────────
    def unseen(self, uid: str) -> int:
        if not self.enabled():
            return 0
        person = self.person(uid)
        seen = person["seen"]
        seen_ids = set(person.get("seen_ids") or [])
        hidden = self._snoozed(uid)
        return sum(1 for p in self.data["posts"].values()
                   if p["ts"] > seen and p["id"] not in seen_ids and p["author"] != uid and not p.get("album_only")
                   and p["author"] not in hidden and self.can_see(uid, p))

    def _snoozed(self, uid: str) -> set[str]:
        now = _now()
        return {a for a, until in self.person(uid)["hidden"].items() if not until or until > now}

    def list_posts(self, uid: str, *, before: int | None = None, limit: int = PAGE, author: str | None = None,
                   group: str | None = None, album: str | None = None, kind: str | None = None,
                   collection: str | None = None) -> dict:
        posts = [p for p in self.data["posts"].values() if self.can_see(uid, p)]
        if kind == "archive":
            posts = [p for p in posts if p["author"] == uid and p.get("archived")]
        else:
            posts = [p for p in posts if not p.get("archived")]
        if kind == "archive":
            pass
        elif collection:
            col = next((c for c in self.person(uid).get("collections") or [] if c["id"] == collection), None)
            ids = set(col["posts"]) if col else set()
            posts = [p for p in posts if p["id"] in ids]
        elif author:
            # someone's profile: their posts, and posts on their page they haven't hidden
            posts = [p for p in posts if not p.get("album_only")
                     and (p["author"] == author or (p.get("page") == author and not p.get("page_hidden")))]
        elif group:
            posts = [p for p in posts if p["audience"].get("group") == group]
        elif album:
            posts = [p for p in posts if p.get("album") == album]
        elif kind == "saved":
            saved = set(self.person(uid)["saved"])
            posts = [p for p in posts if p["id"] in saved]
        else:
            # the main feed leaves out snoozed people, and group posts show in their group too
            hidden = self._snoozed(uid)
            posts = [p for p in posts if p["author"] not in hidden and not p.get("album_only")]
        if kind == "events":
            posts = [p for p in posts if p.get("kind") == "event"]
        posts.sort(key=lambda p: p.get("archived") or p["ts"] if kind == "archive" else p["ts"], reverse=True)
        if before:
            posts = [p for p in posts if p["ts"] < before]
        page = posts[:limit]
        for p in page:
            self._maybe_link(p)
        return {"posts": [self.post_view(p, uid) for p in page], "more": len(posts) > limit}

    def pinned_for(self, uid: str) -> list[dict]:
        out = []
        for pid in self.data["pinned"]:
            post = self.data["posts"].get(pid)
            if post and self.can_see(uid, post):
                out.append(self.post_view(post, uid))
        return out

    def stories_for(self, uid: str) -> list[dict]:
        if not self.opt("stories"):
            return []
        cutoff = _now() - STORY_MS
        return [self.story_view(s, uid) for s in sorted(self.data["stories"].values(), key=lambda s: s["ts"])
                if s["ts"] > cutoff and self.can_see_story(uid, s)]

    def groups_for(self, uid: str) -> list[dict]:
        return [self.group_view(g, uid) for g in sorted(self.data["groups"].values(), key=lambda g: g["name"].lower())
                if uid in g["members"]]

    def albums_for(self, uid: str) -> list[dict]:
        return [self.album_view(a, uid) for a in sorted(self.data["albums"].values(), key=lambda a: a["created"], reverse=True)
                if self.can_see_album(uid, a)]

    def memories(self, uid: str) -> list[dict]:
        """On This Day: posts you can see from this day in earlier years."""
        today = dt_util.now()
        out = []
        for p in self.data["posts"].values():
            when = dt_util.as_local(dt_util.utc_from_timestamp(p["ts"] / 1000))
            if when.year < today.year and when.month == today.month and when.day == today.day \
                    and p.get("kind") not in AUTO_KINDS and not p.get("archived") and not p.get("album_only") \
                    and self.can_see(uid, p):
                out.append(p)
        out.sort(key=lambda p: p["ts"], reverse=True)
        return [self.post_view(p, uid) for p in out[:5]]

    def media_for(self, uid: str, *, kind: str, author: str | None = None, before: int | None = None,
                  limit: int = 60) -> dict:
        """Photos or Videos: everything shared with you, or one person's (their posts and photos they're tagged in)."""
        want = "video/" if kind == "videos" else "image/"
        items = []
        for p in self.data["posts"].values():
            if p.get("kind") == "review" or p.get("archived") or p.get("album_only") or not self.can_see(uid, p):
                continue
            for aid in p.get("media", []):
                tagged = [t["uid"] for t in (p.get("tags") or {}).get(aid, [])]
                on_page = p.get("page") == author and not p.get("page_hidden")
                if author and p["author"] != author and author not in tagged and not on_page:
                    continue
                att = self.m.data["attachments"].get(aid)
                if not att or att.get("removed") or not (att.get("mime") or "").startswith(want):
                    continue
                items.append({"id": aid, "post_id": p["id"], "author": p["author"], "ts": p["ts"],
                              "mime": att.get("mime"), "has_thumb": bool(att.get("thumb")),
                              "width": att.get("width"), "height": att.get("height"),
                              "duration": att.get("duration"), "size": att.get("size"),
                              "tagged": author in tagged if author else False})
        items.sort(key=lambda x: x["ts"], reverse=True)
        if before:
            items = [x for x in items if x["ts"] < before]
        return {"items": items[:limit], "more": len(items) > limit}

    ACTIVITY_KINDS = ("posts", "comments", "reactions", "tagged", "mentions", "page")

    def activity(self, uid: str, kind: str | None = None, before: int | None = None, limit: int = 30) -> dict:
        """Your wall: your posts, your comments and reactions, and what others did with you - posts
        on your page, photo tags and @mentions - newest first, with the posts themselves. Only posts
        you can still see are included."""
        out = []
        want = (lambda k: True) if not kind else (lambda k: k == kind)
        for p in self.data["posts"].values():
            if not self.can_see(uid, p) or p.get("scheduled_at") and p["author"] != uid:
                continue
            pid, author = p["id"], p["author"]
            if author == uid and want("posts"):
                out.append({"kind": "post", "ts": p["ts"], "post_id": pid})
            if author != uid:
                if p.get("page") == uid and not p.get("page_hidden") and want("page"):
                    out.append({"kind": "page", "ts": p["ts"], "post_id": pid, "by": author})
                tagged = any(uid in [t.get("uid") for t in tags] for tags in (p.get("tags") or {}).values())
                on_page = p.get("page") == uid and not p.get("page_hidden")
                # one story per post: on your page, else tagged, else mentioned (unless you're filtering by it)
                if tagged and want("tagged") and (kind or not on_page):
                    out.append({"kind": "tagged", "ts": p["ts"], "post_id": pid, "by": author})
                elif uid in (p.get("mentions") or []) and want("mentions") and (kind or not on_page):
                    out.append({"kind": "mention", "ts": p["ts"], "post_id": pid, "by": author})
            for c in p.get("comments", []):
                if c["author"] == uid and want("comments"):
                    out.append({"kind": "comment", "ts": c["ts"], "post_id": pid, "comment_id": c["id"], "on": author,
                                "reply_to": next((x["author"] for x in p["comments"] if x["id"] == c.get("reply_to")), None)})
                elif c["author"] != uid and uid in (c.get("mentions") or []) and want("mentions"):
                    out.append({"kind": "comment_mention", "ts": c["ts"], "post_id": pid, "comment_id": c["id"],
                                "by": c["author"], "on": author})
                cr = (c.get("reactions") or {}).get(uid)
                if cr and c["author"] != uid and want("reactions"):
                    out.append({"kind": "comment_reaction", "ts": (c.get("reacted") or {}).get(uid, c["ts"]), "post_id": pid,
                                "comment_id": c["id"], "reaction": cr, "on": c["author"]})
            r = (p.get("reactions") or {}).get(uid)
            if r and author != uid and want("reactions"):
                out.append({"kind": "reaction", "ts": p.get("reacted", {}).get(uid, p["ts"]), "post_id": pid,
                            "reaction": r, "on": author})
        out.sort(key=lambda x: (x["ts"], x["kind"]), reverse=True)
        if before:
            out = [x for x in out if x["ts"] < before]
        page = out[:limit]
        posts = {}
        for it in page:
            if it["post_id"] not in posts:
                posts[it["post_id"]] = self.post_view(self.data["posts"][it["post_id"]], uid)
        counts = {}
        if not before and not kind:
            for it in out:
                k = {"post": "posts", "comment": "comments", "reaction": "reactions", "comment_reaction": "reactions",
                     "tagged": "tagged", "mention": "mentions", "comment_mention": "mentions", "page": "page"}[it["kind"]]
                counts[k] = counts.get(k, 0) + 1
        return {"items": page, "posts": list(posts.values()), "more": len(out) > limit,
                **({"counts": counts} if counts else {})}

    # ── Notifications (the bell in the Feed's bottom bar) ───────────────────
    def _notif_all(self, uid: str) -> list[dict]:
        """What other people did that concerns you, like Facebook's Notifications: posts on your page,
        tags, @mentions, reactions and comments on your posts, replies and reactions to your comments,
        birthday cards, claims, Chip Ins and being added to a group. Built from the posts themselves,
        so only posts you can still see are ever listed. Several people doing the same thing to the
        same post are one notification ("person2 and 2 others reacted to your post")."""
        out: list[dict] = []
        now = _now()

        def add(kind: str, ts: int, post: dict | None, users: list[str], key: str | None = None, **extra) -> None:
            users = [u for u in dict.fromkeys(users) if u != uid]
            if users and ts:
                ref = post["id"] if post else extra.get("group_id") or extra.get("story_id") or extra.get("profile")
                out.append({"kind": kind, "key": key or f"{kind}:{ref}", "ts": ts, "post_id": post["id"] if post else None,
                            "users": users, **extra})

        for p in self.data["posts"].values():
            if not self.can_see(uid, p) or p.get("scheduled_at") or p.get("archived"):
                continue
            author, mine = p["author"], p["author"] == uid
            kind = p.get("kind")
            bday_for = (p.get("birthday") or {}).get("for") if kind == "birthday" else None
            if not mine:
                on_page = p.get("page") == uid
                if on_page:
                    add("page", p["ts"], p, [author])
                if any(uid in [t.get("uid") for t in tags] for tags in (p.get("tags") or {}).values()):
                    add("tagged", p["ts"], p, [author])
                elif uid in (p.get("mentions") or []) and not on_page:
                    add("mention", p["ts"], p, [author])
                if bday_for and bday_for != uid and now - p["ts"] < 86_400_000:
                    add("birthday", p["ts"], p, [bday_for])
            # reactions to your post: one notification per post
            if mine:
                rx = {u: r for u, r in (p.get("reactions") or {}).items() if u != uid}
                if rx:
                    when = p.get("reacted") or {}
                    order = sorted(rx, key=lambda u: when.get(u, p["ts"]), reverse=True)
                    add("reactions", when.get(order[0], p["ts"]), p, order, reaction=rx[order[0]])
                g = p.get("grabs") or {}
                if g.get("claimed_by") and g.get("claimed_ts"):
                    add("claimed", g["claimed_ts"], p, [g["claimed_by"]])
                for pu, pl in ((p.get("fund") or {}).get("pledges") or {}).items():
                    add("pledge", pl.get("ts") or p["ts"], p, [pu], key=f"pledge:{p['id']}:{pu}", title=(p.get("fund") or {}).get("title", ""))
            comments = p.get("comments", [])
            by_id = {c["id"]: c for c in comments}
            # comments on your post (or on your birthday card), newest commenter first
            if mine or bday_for == uid:
                theirs = [c for c in comments if c["author"] != uid]
                if theirs:
                    theirs.sort(key=lambda c: c["ts"], reverse=True)
                    add("birthday_card" if bday_for == uid else "comments", theirs[0]["ts"], p, [c["author"] for c in theirs],
                        comment_id=theirs[0]["id"], text=_short(theirs[0].get("text") or "", 100))
            else:
                # replies under a comment of yours on someone else's post
                threads: dict[str, list[dict]] = {}
                for c in comments:
                    parent = by_id.get(c.get("reply_to") or "")
                    if parent and parent["author"] == uid and c["author"] != uid:
                        threads.setdefault(parent["id"], []).append(c)
                for cid, rs in threads.items():
                    rs.sort(key=lambda c: c["ts"], reverse=True)
                    add("replies", rs[0]["ts"], p, [c["author"] for c in rs], key=f"replies:{p['id']}:{cid}", comment_id=rs[0]["id"],
                        text=_short(rs[0].get("text") or "", 100))
            for c in comments:
                if c["author"] == uid:
                    crx = {u: r for u, r in (c.get("reactions") or {}).items() if u != uid}
                    if crx:
                        when = c.get("reacted") or {}
                        order = sorted(crx, key=lambda u: when.get(u, c["ts"]), reverse=True)
                        add("comment_reactions", when.get(order[0], c["ts"]), p, order, key=f"creact:{p['id']}:{c['id']}", comment_id=c["id"],
                            reaction=crx[order[0]], text=_short(c.get("text") or "", 100))
                elif uid in (c.get("mentions") or []):
                    add("comment_mention", c["ts"], p, [c["author"]], key=f"cmention:{p['id']}:{c['id']}", comment_id=c["id"],
                        text=_short(c.get("text") or "", 100))
        for g in self.data["groups"].values():
            if uid in g["members"] and g["created_by"] != uid:
                add("group", g.get("created") or 0, None, [g["created_by"]], group_id=g["id"], group=g["name"])
        self.notif_more(uid, add)
        out.sort(key=lambda x: x["ts"], reverse=True)
        return out[:300]

    # which Feed notification setting each kind of bell notification falls under
    NOTIF_PREF = {"reactions": "reactions", "comment_reactions": "reactions", "comments": "comments", "replies": "comments",
                  "birthday_card": "comments", "claimed": "comments", "pledge": "comments", "mention": "mentions",
                  "comment_mention": "mentions", "tagged": "tags", "page": "page", "birthday": "birthdays", "group": "groups",
                  "shared": "shares", "wave": "waves", "story_reactions": "stories", "story_answers": "stories",
                  "story_mention": "stories"}
    NOTIF_FILTERS = {"reactions": {"reactions", "comment_reactions", "story_reactions"}, "comments": {"comments", "replies"},
                     "mentions": {"mention", "comment_mention", "tagged", "story_mention"}, "page": {"page"},
                     "more": {"birthday", "birthday_card", "claimed", "pledge", "group", "shared", "wave", "story_answers"}}
    REMOVED_DAYS = 30

    def _nstate(self, uid: str) -> dict:
        """Each person's bell: what they've read, marked unread, removed or cleared, and posts turned off.
        It's kept on the server, so it's the same on every device."""
        p = self.person(uid)
        st = p.get("nstate")
        if st is None:
            # notifications from before this existed count as read (the bell already showed them)
            st = p["nstate"] = {"base": p.get("notif_seen") or _now(), "all_read": 0, "read": {}, "unread": {},
                                "unread_at": {}, "removed": {}, "cleared": None, "restored": {}, "muted": {}}
        return st

    def _n_hidden(self, st: dict, it: dict) -> int:
        """When it was removed (0 if it shows). New activity after removing it brings it back."""
        k, ts = it["key"], it["ts"]
        if st["restored"].get(k) == ts:
            return 0
        rm = st["removed"].get(k)
        if rm and ts <= rm[1]:
            return rm[0]
        cl = st.get("cleared")
        if cl and ts <= cl[1]:
            return cl[0]
        return 0

    def _n_unread(self, st: dict, it: dict) -> bool:
        k, ts = it["key"], it["ts"]
        if st["unread"].get(k) == ts:
            return True
        return ts > max(st["base"], st["all_read"], st["read"].get(k, 0))

    def _n_visible(self, uid: str, st: dict, it: dict) -> bool:
        if it.get("post_id") and it["post_id"] in st["muted"]:
            return False
        if not self.wants(uid, self.NOTIF_PREF.get(it["kind"], "comments")):
            return False
        return not self._n_hidden(st, it)

    def notifications(self, uid: str, before: int | None = None, limit: int = 40, filt: str | None = None) -> dict:
        st = self._nstate(uid)
        items = [x for x in self._notif_all(uid) if self._n_visible(uid, st, x)]
        if filt == "unread":
            items = [x for x in items if self._n_unread(st, x)]
        elif filt in self.NOTIF_FILTERS:
            items = [x for x in items if x["kind"] in self.NOTIF_FILTERS[filt]]
        if before:
            items = [x for x in items if x["ts"] < before]
        page = [{**x, "unread": self._n_unread(st, x)} for x in items[:limit]]
        return {"items": page, "posts": self._n_posts(uid, page), "more": len(items) > limit,
                "unread": self.notif_unread(uid), "muted": len(st["muted"])}

    def _n_posts(self, uid: str, items: list[dict]) -> list[dict]:
        posts = {}
        for it in items:
            pid = it.get("post_id")
            if pid and pid not in posts and pid in self.data["posts"]:
                posts[pid] = self.post_view(self.data["posts"][pid], uid)
        return list(posts.values())

    def notif_unread(self, uid: str) -> int:
        """The red number on the bell: unread ones that came (or were marked unread) since it was last opened."""
        if not self.enabled():
            return 0
        st = self._nstate(uid)
        seen = self.person(uid)["notif_seen"]
        return sum(1 for x in self._notif_all(uid)
                   if self._n_visible(uid, st, x) and self._n_unread(st, x)
                   and (x["ts"] > seen or st["unread_at"].get(x["key"], 0) >= seen))

    MENTION_KINDS = {"mention", "comment_mention", "story_mention"}

    def notif_counts(self, uid: str) -> tuple[int, int]:
        """The bell's red number, and the unread @mentions among everything not yet read (for the sensors)."""
        if not self.enabled():
            return 0, 0
        st = self._nstate(uid)
        seen = self.person(uid)["notif_seen"]
        bell = mentions = 0
        for x in self._notif_all(uid):
            if not (self._n_visible(uid, st, x) and self._n_unread(st, x)):
                continue
            if x["ts"] > seen or st["unread_at"].get(x["key"], 0) >= seen:
                bell += 1
            if x["kind"] in self.MENTION_KINDS:
                mentions += 1
        return bell, mentions

    def notif_seen(self, uid: str) -> None:
        self.person(uid)["notif_seen"] = _now()
        self.save()
        self.m._send_to(uid, {"type": "feed_notif", "unread": 0})

    def _n_find(self, uid: str, key: str) -> dict | None:
        return next((x for x in self._notif_all(uid) if x["key"] == key), None)

    def _n_changed(self, uid: str) -> None:
        self.save()
        self.m._send_to(uid, {"type": "feed_notif", "unread": self.notif_unread(uid), "changed": True})

    def notif_read(self, uid: str, keys: list[str], read: bool = True) -> None:
        """Opened, or Mark as Read / Mark as Unread."""
        st = self._nstate(uid)
        for k in keys:
            it = self._n_find(uid, k)
            if not it:
                continue
            if read:
                st["read"][k] = it["ts"]
                st["unread"].pop(k, None)
                st["unread_at"].pop(k, None)
            else:
                st["unread"][k] = it["ts"]
                st["unread_at"][k] = _now()
                st["read"].pop(k, None)
        self._n_changed(uid)

    def notif_read_post(self, uid: str, pid: str) -> None:
        """A post opened from a notification: everything in the bell about it counts as read, and the
        post as seen."""
        st = self._nstate(uid)
        keys = [x["key"] for x in self._notif_all(uid) if x.get("post_id") == pid and self._n_unread(st, x)]
        if keys:
            self.notif_read(uid, keys)
        self.mark_post_seen(uid, pid)

    def notif_read_all(self, uid: str) -> None:
        st = self._nstate(uid)
        st["all_read"] = _now()
        st["read"], st["unread"], st["unread_at"] = {}, {}, {}
        self._n_changed(uid)

    def notif_remove(self, uid: str, key: str) -> None:
        st = self._nstate(uid)
        it = self._n_find(uid, key)
        if not it:
            return
        st["removed"][key] = [_now(), it["ts"]]
        st["restored"].pop(key, None)
        self._n_changed(uid)

    def notif_restore(self, uid: str, key: str) -> None:
        """Undo, or put back from Recently Removed."""
        st = self._nstate(uid)
        it = self._n_find(uid, key)
        st["removed"].pop(key, None)
        if it and st.get("cleared") and it["ts"] <= st["cleared"][1]:
            st["restored"][key] = it["ts"]
        self._n_changed(uid)

    def notif_clear(self, uid: str) -> None:
        """Clear All: everything in the list now goes; anything new still comes."""
        st = self._nstate(uid)
        latest = max((x["ts"] for x in self._notif_all(uid)), default=_now())
        st["cleared"] = [_now(), max(latest, (st.get("cleared") or [0, 0])[1])]
        st["restored"] = {}
        self._n_changed(uid)

    def notif_removed(self, uid: str) -> dict:
        """Recently Removed: what was removed or cleared in the last 30 days, to put back."""
        st = self._nstate(uid)
        cutoff = _now() - self.REMOVED_DAYS * 86_400_000
        items = []
        for x in self._notif_all(uid):
            when = self._n_hidden(st, x)
            if when and when > cutoff:
                items.append({**x, "removed_at": when, "unread": False})
        items.sort(key=lambda x: x["removed_at"], reverse=True)
        items = items[:100]
        return {"items": items, "posts": self._n_posts(uid, items)}

    def notif_mute(self, uid: str, pid: str, on: bool) -> None:
        """Turn Off Notifications for This Post: nothing more about it in the bell or on the phone."""
        st = self._nstate(uid)
        if on:
            self._post(uid, pid)
            st["muted"][pid] = _now()
        else:
            st["muted"].pop(pid, None)
        self._n_changed(uid)

    def notif_muted(self, uid: str) -> dict:
        st = self._nstate(uid)
        for pid in [p for p in st["muted"] if p not in self.data["posts"]]:
            st["muted"].pop(pid, None)
        posts = [self.post_view(self.data["posts"][p], uid) for p in sorted(st["muted"], key=lambda p: st["muted"][p], reverse=True)
                 if self.can_see(uid, self.data["posts"][p])]
        return {"posts": posts}

    def post_muted(self, uid: str, pid: str) -> bool:
        st = self.person(uid).get("nstate") or {}
        return pid in (st.get("muted") or {})

    def _notif_push(self, uids) -> None:
        """Tell people's open cards the bell's count changed."""
        for u in set(uids):
            if u != HA_SENDER_ID:
                self.m._send_to(u, {"type": "feed_notif", "unread": self.notif_unread(u)})

    def contact_extras(self, uid: str, other: str) -> dict:
        """What a household member's contact card shows from the Feed - only what's shared with you:
        their latest post, a few recent photos from their own posts, and their birthday if they share it."""
        if not self.enabled() or other not in self.household():
            return {"enabled": False}
        now = _now()
        mine = [p for p in self.data["posts"].values()
                if p["author"] == other and not p.get("scheduled_at") and p.get("kind", "post") not in AUTO_KINDS
                and self.can_see(uid, p)]
        mine.sort(key=lambda p: p["ts"], reverse=True)
        latest = None
        if mine:
            p = mine[0]
            latest = {"id": p["id"], "ts": p["ts"], "kind": p.get("kind", "post"), "summary": _short(self._summary_text(p), 120)}
        photos = []
        for p in mine:
            for aid in p.get("media", []):
                att = self.m.data["attachments"].get(aid) or {}
                if att and not att.get("removed") and (att.get("mime") or "").startswith("image/"):
                    photos.append({**self._att_view(aid), "post_id": p["id"], "author": other, "ts": p["ts"]})
            if len(photos) >= 8:
                break
        person = self.data["people"].get(other) or {}
        bday = person.get("birthday") if person.get("share_birthday") and self.opt("birthdays") else None
        today = dt_util.now().strftime("%m-%d")
        card = None
        if bday and bday.endswith(today):
            card = next((p["id"] for p in self.data["posts"].values() if p.get("kind") == "birthday"
                         and (p.get("birthday") or {}).get("for") == other and now - p["ts"] < 86_400_000
                         and self.can_see(uid, p)), None)
        return {"enabled": True, "latest": latest, "photos": photos[:8], "posts": len(mine),
                "birthday": bday or None, "birthday_today": bool(bday and bday.endswith(today)), "birthday_post": card,
                "page_posts": bool(self.opt("page_posts"))}

    def _summary_text(self, p: dict) -> str:
        if p.get("text"):
            return p["text"]
        kind = p.get("kind", "post")
        if kind == "event":
            return "📅 " + ((p.get("event") or {}).get("title") or "An event")
        if kind == "poll":
            return "📊 A poll"
        if kind == "fund":
            return "💰 " + ((p.get("fund") or {}).get("title") or "Chip In")
        if kind == "grabs":
            return "🎁 Up for grabs"
        if kind == "list":
            return "📝 A list"
        if kind == "recs":
            return "💡 Asked for recommendations"
        if p.get("shared"):
            return "Shared a post"
        if p.get("home"):
            return "🏠 " + (p["home"].get("name") or "From Home")
        n = len(p.get("media", []))
        return "Shared a photo" if n == 1 else f"Shared {n} photos and videos" if n else "A post"

    def mark_post_seen(self, uid: str, pid: str) -> None:
        """One post counts as seen (a button on its notification was used) - the rest stay new."""
        person = self.person(uid)
        post = self.data["posts"].get(pid)
        if not post or post["ts"] <= person["seen"]:
            return
        ids = [i for i in (person.get("seen_ids") or []) if i != pid and i in self.data["posts"]]
        person["seen_ids"] = (ids + [pid])[-500:]
        self.save()
        self.m.entities.changed(uid)
        self.m._send_to(uid, {"type": "feed_seen", "unseen": self.unseen(uid)})

    def mark_seen(self, uid: str) -> None:
        self.person(uid).pop("seen_ids", None)
        self.person(uid)["seen"] = _now()
        self.save()
        self.m.entities.changed(uid)
        self.m._send_to(uid, {"type": "feed_seen", "unseen": 0})

    def bootstrap(self, uid: str) -> dict:
        if not self.enabled():
            return {"enabled": False}
        return {"enabled": True, "unseen": self.unseen(uid), "notif_unread": self.notif_unread(uid), "prefs": self.prefs_view(uid),
                "options": self.options(), "seen": self.person(uid)["seen"],
                "collections": self.collections_view(uid), "quiet": self.quiet_view(uid),
                "groups": self.groups_for(uid), "albums": self.albums_for(uid),
                "milestones": [m for m in self.data["milestones"].values() if m["owner"] == uid],
                "reactions": REACTIONS, "backgrounds": list(BACKGROUNDS)}

    # ── writing posts ───────────────────────────────────────────────────────
    def _take_media(self, uid: str, aids: list[str], ref: dict) -> list[str]:
        out = []
        for aid in list(dict.fromkeys(aids or []))[:MAX_MEDIA]:
            att = self.m.data["attachments"].get(aid)
            if not att or att["uploader"] != uid or att.get("status") != "pending":
                raise _err("not_found", "A photo or video wasn't found. Try adding it again.")
            mime = att.get("mime") or ""
            if not mime.startswith(("image/", "video/")):
                raise _err("invalid_format", "Only photos and videos can be posted")
            out.append(aid)
        for aid in out:
            self.m.data["attachments"][aid].update({"status": "sent", "thread_id": None, "feed": ref})
        return out

    def _check_tags(self, post: dict, raw: dict | None) -> dict:
        tags: dict[str, list] = {}
        if not raw:
            return tags
        people = self.viewers(post)
        count = 0
        for aid, lst in raw.items():
            if aid not in post.get("media", []):
                continue
            clean = []
            for t in lst or []:
                tu = str((t or {}).get("uid") or "")
                if tu not in people or tu in {c["uid"] for c in clean}:
                    continue
                try:
                    x, y = float(t.get("x", 0.5)), float(t.get("y", 0.5))
                except (TypeError, ValueError):
                    x = y = 0.5
                clean.append({"uid": tu, "x": min(1, max(0, x)), "y": min(1, max(0, y))})
                count += 1
                if count >= MAX_TAGS:
                    break
            if clean:
                tags[aid] = clean
        return tags

    def _check_mentions(self, post: dict, ids: list | None, author: str) -> list[str]:
        people = self.viewers(post)
        return [u for u in dict.fromkeys(ids or []) if u in people and u != author]

    def _check_place(self, uid: str, raw: dict | None) -> dict | None:
        if not raw or not raw.get("zone"):
            return None
        zid = _str(raw["zone"], 255)
        state = self.hass.states.get(zid)
        if not zid.startswith("zone.") or not state:
            raise _err("not_found", "That place isn't a zone in Home Assistant")
        return {"zone": zid, "name": state.name}

    def _check_feeling(self, raw: dict | None) -> dict | None:
        if not raw or not raw.get("text"):
            return None
        return {"text": _str(raw["text"], 40), "emoji": _str(raw.get("emoji"), 8),
                "activity": bool(raw.get("activity"))}

    def _check_kind(self, uid: str, kind: str, raw: dict, text: str) -> dict:
        out: dict[str, Any] = {}
        if kind == "poll":
            p = raw.get("poll") or {}
            opts = [_str(o, 120) for o in p.get("options", [])]
            opts = [o for o in dict.fromkeys(opts) if o][:MAX_POLL_OPTIONS]
            if not text or len(opts) < 2:
                raise _err("invalid_format", "A poll needs a question and at least two choices")
            out["poll"] = {"options": [{"id": _id()[:8], "text": o, "by": uid} for o in opts],
                           "votes": {}, "multi": bool(p.get("multi", True)), "add": bool(p.get("add", True)),
                           **({"anonymous": True} if p.get("anonymous") else {})}
        elif kind == "event":
            ev = raw.get("event") or {}
            title = _str(ev.get("title"), 120)
            start = int(ev.get("start") or 0)
            end = int(ev.get("end") or 0) or None
            if not title or not start:
                raise _err("invalid_format", "An event needs a title and a start time")
            if end and end < start:
                raise _err("invalid_format", "The event ends before it starts")
            remind = ev.get("remind")
            if remind not in (None, *REMIND_CHOICES):
                raise _err("invalid_format", "Unsupported reminder time")
            zone = None
            if ev.get("zone"):
                zone = self._check_place(uid, {"zone": ev["zone"]})
            out["event"] = {"title": title, "start": start, "end": end, "all_day": bool(ev.get("all_day")),
                            "location": _str(ev.get("location"), 200), "zone": zone["zone"] if zone else None,
                            "remind": remind, "rsvp": {uid: "going"}, "reminded": False}
        elif kind == "fund":
            f = raw.get("fund") or {}
            title = _str(f.get("title"), 120)
            if not title:
                raise _err("invalid_format", "Give the pot a name")
            target = f.get("target")
            try:
                target = round(float(target), 2) if target not in (None, "") else None
            except (TypeError, ValueError) as err:
                raise _err("invalid_format", "The target should be a number") from err
            if target is not None and target <= 0:
                target = None
            out["fund"] = {"title": title, "target": target, "currency": _str(f.get("currency"), 4) or self._currency(),
                           "note": _str(f.get("note"), 300), "pledges": {}}
        elif kind == "grabs":
            out["grabs"] = {"status": "available", "claimed_by": None, "claimed_ts": None}
        elif kind == "list":
            out["list"] = self.check_list(uid, raw.get("list"), text)
        elif kind == "recs":
            if not text:
                raise _err("invalid_format", "Ask what you'd like recommended")
        return out

    def _currency(self) -> str:
        code = (getattr(self.hass.config, "currency", "") or "").upper()
        return {"GBP": "£", "USD": "$", "EUR": "€", "AUD": "$", "CAD": "$", "NZD": "$", "JPY": "¥",
                "INR": "₹", "CHF": "CHF", "SEK": "kr", "NOK": "kr", "DKK": "kr"}.get(code, code or "£")

    async def async_create(self, uid: str, raw: dict, *, automation: bool = False, album_only: bool = False) -> dict:
        if not self.enabled():
            raise _err("unavailable", "The Feed is switched off")
        kind = raw.get("kind") or "post"
        if kind not in KINDS:
            raise _err("invalid_format", "Unknown kind of post")
        names = {"poll": "Polls", "event": "Events", "fund": "Chip In", "grabs": "Up for Grabs",
                 "recs": "Recommendations", "list": "Lists"}
        if not automation and kind in names and (self.options()["kinds"].get(kind) is False):
            raise _err("unavailable", f"{names[kind]} are switched off for the household")
        text = _str(raw.get("text"), MAX_TEXT_LENGTH)
        pid = _id()
        album = None
        if raw.get("album"):
            album = self.data["albums"].get(_str(raw["album"], 40))
            if not album or not (uid == album["owner"] or uid in album.get("contributors", [])):
                raise _err("not_found", "You can't add to that album")
        if album:
            audience = dict(album["audience"])
        elif automation:
            # Home Assistant's own posts: the audience was already worked out from the action
            audience = raw.get("audience") or {"type": "everyone"}
        else:
            # no audience chosen: the household's default for new posts
            audience = self.check_audience(uid, raw.get("audience") or {"type": self.opt("default_audience") or "everyone"})
        page = None
        if raw.get("page") and raw["page"] != uid and not self.opt("page_posts"):
            raise _err("unavailable", "Posting on someone's page is switched off for the household")
        if raw.get("page") and raw["page"] != uid:
            page = _str(raw["page"], 64)
            if page not in self.household():
                raise _err("not_found", "That person isn't in the household")
            if album:
                raise _err("invalid_format", "A post on someone's page can't go in an album")
            audience = self._with_page(audience, page)
        sched = raw.get("scheduled_at")
        if sched:
            sched = int(sched)
            if sched < _now() + 30_000:
                sched = None
            elif sched > _now() + 366 * DAY_MS:
                raise _err("invalid_format", "Choose a time within the next year")
        post: dict[str, Any] = {
            "id": pid, "author": uid, "ts": sched or _now(), "kind": kind, "text": text,
            "audience": audience, "comment_audience": "all", "commenters": [],
            "reactions": {}, "reacted": {}, "comments": [], "edits": [],
            **({"scheduled_at": sched} if sched else {}),
            **({"album": album["id"]} if album else {}),
            **({"page": page} if page else {}),
            # Make an Album's copies: shown in the album only, never as new posts in the Feed
            **({"album_only": True} if album_only and album else {}),
        }
        post.update(self._check_kind(uid, kind, raw, text))
        shared = self.check_share(uid, raw["shared"]) if raw.get("shared") else None
        if shared:
            if kind != "post" or album or raw.get("media"):
                raise _err("invalid_format", "A shared post is words and the post you're sharing")
            post["shared"] = shared
        home = self.check_home(raw.get("home")) if raw.get("home") else None
        if home:
            post["home"] = home
        if raw.get("comment_audience") == "people":
            post["comment_audience"] = "people"
            known = self.household()
            post["commenters"] = [p for p in dict.fromkeys(raw.get("commenters") or []) if p in known and p != uid]
        if raw.get("no_link"):
            post["no_link"] = True   # the preview was taken off while writing
        bg = raw.get("bg")
        if bg in BACKGROUNDS and kind == "post" and not raw.get("media") and 0 < len(text) <= BG_MAX_CHARS and not (
                URL_RE.search(text) and not raw.get("no_link")):
            post["bg"] = bg
        if raw.get("profile_update") in ("photo", "cover"):
            post["profile_update"] = raw["profile_update"]
        post["feeling"] = self._check_feeling(raw.get("feeling"))
        post["place"] = self._check_place(uid, raw.get("place"))
        if not text and not raw.get("media") and kind == "post" and not shared and not (home and home["type"] != "camera"):
            raise _err("invalid_format", "Write something or add a photo")
        post["media"] = self._take_media(uid, raw.get("media") or [], {"post": pid})
        post["tags"] = self._check_tags(post, raw.get("tags"))
        post["mentions"] = self._check_mentions(post, raw.get("mentions"), uid)
        self.data["posts"][pid] = post
        if shared:
            orig = self.data["posts"][shared]
            orig["shared_by"] = [*orig.get("shared_by", []), pid]
        self.m._save()
        self.save()
        self._after_write(post)
        if sched:
            self._arm_schedule(post)
            self.m._send_to(uid, {"type": "feed", "post": self.post_view(post, uid)})
        elif post.get("album_only"):
            self.push(post)   # quietly: no notifications, nothing new in the Feed
        else:
            await self._async_published(post)
        return self.post_view(post, uid)

    def _with_page(self, audience: dict, page: str) -> dict:
        """A post on someone's page is always shared with them, whoever else it's shared with."""
        kind = audience.get("type")
        if kind == "everyone":
            return audience
        if kind == "group":
            g = self.data["groups"].get(audience.get("group") or "")
            if not g or page not in g["members"]:
                raise _err("invalid_format", "They're not in that group, so it can't go on their page")
            return audience
        people = audience.get("people", []) if kind == "people" else []
        return {"type": "people", "people": list(dict.fromkeys([*people, page]))}

    def page_hide(self, uid: str, pid: str, hidden: bool) -> dict:
        """Hide a post someone put on your page from your profile (or show it again)."""
        post = self._post(uid, pid)
        if post.get("page") != uid:
            raise _err("unauthorized", "Only the person whose page it's on can do that")
        post["page_hidden"] = bool(hidden)
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    # ── link previews ───────────────────────────────────────────────────────
    LINK_KEEP_MS = 3_600_000
    LINK_RETRY_MS = 6 * 3_600_000

    def link_put(self, url: str, preview: dict | None) -> None:
        self._links[url] = (_now(), preview)
        if len(self._links) > 300:
            for old in sorted(self._links, key=lambda k: self._links[k][0])[:100]:
                self._links.pop(old, None)

    async def async_link_preview(self, url: str) -> dict | None:
        """A link's preview, for the New Post screen while someone's writing (kept for an hour)."""
        url = _str(url, 2000)
        if not URL_RE.fullmatch(url) or not self.m._feature("link_previews"):
            return None
        got = self._links.get(url)
        if got and _now() - got[0] < self.LINK_KEEP_MS:
            return got[1]
        try:
            preview = await self.m._async_fetch_preview(url)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Feed link preview for %s: %s", url, err)
            preview = None
        self.link_put(url, preview)
        return preview

    def _link_url(self, post: dict) -> str | None:
        if post.get("media") or post.get("kind") != "post" or post.get("no_link"):
            return None
        found = URL_RE.search(post.get("text") or "")
        return found.group(0).rstrip(").,!?;:") if found else None

    def _maybe_link(self, post: dict) -> None:
        """A post with a link but no preview yet (the site didn't answer last time): try again now and then."""
        url = self._link_url(post)
        if not url or (post.get("link") or {}).get("url") == url or not self.m._feature("link_previews"):
            return
        last = self._link_tries.get(post["id"], 0)
        if _now() - last < self.LINK_RETRY_MS:
            return
        self._link_tries[post["id"]] = _now()
        self.hass.async_create_task(self._async_link(post["id"], url))

    def _after_write(self, post: dict) -> None:
        """Link preview and event reminder, after a post is written or edited."""
        if self.m._feature("link_previews"):
            url = self._link_url(post)
            if url and (post.get("link") or {}).get("url") != url:
                post.pop("link", None)
                known = self._links.get(url)
                if known and known[1] and _now() - known[0] < self.LINK_KEEP_MS:
                    # already fetched while it was being written: it's there straight away
                    post["link"] = known[1]
                else:
                    self._link_tries[post["id"]] = _now()
                    self.hass.async_create_task(self._async_link(post["id"], url))
            elif not url:
                post.pop("link", None)
        # Link Safety (an AI feature): check the post's link
        url = self._link_url(post)
        if url != (post.get("link_safety") or {}).get("url"):
            post.pop("link_safety", None)
            if url and post["author"] != HA_SENDER_ID:
                from . import linksafety
                if linksafety.on(self.m):
                    self.hass.async_create_task(linksafety.check_post(self.hass, self.m, post["id"], url))
        if post.get("kind") == "event":
            self._arm_event(post)

    async def _async_link(self, pid: str, url: str) -> None:
        try:
            preview = await self.m._async_fetch_preview(url)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Feed link preview for %s: %s", url, err)
            return
        self.link_put(url, preview)
        post = self.data["posts"].get(pid)
        if not preview or not post or self._link_url(post) != url:
            return
        post["link"] = preview
        self.save()
        self.push(post)

    async def _async_published(self, post: dict) -> None:
        """A post appears: tell the people who can see it, and the automations (who, never what)."""
        post.pop("scheduled_at", None)
        self.save()
        self.push(post)
        users = await self.m.async_user_map()
        self.hass.bus.async_fire(EVENT_POST_CREATED, {
            "post_id": post["id"], "author_id": post["author"],
            "author_name": users.get(post["author"], {}).get("name", ""),
            "kind": post.get("kind", "post"), "audience": post["audience"]["type"],
            "has_media": bool(post.get("media")),
        })
        author = users.get(post["author"], {}).get("name", "Someone")
        viewers = self.viewers(post) - {post["author"]}
        if post.get("list"):
            self.hass.async_create_task(self.async_list_published(post))
        orig = self.data["posts"].get(post.get("shared") or "")
        if orig:
            self.push(orig)   # the share count
            if orig["author"] not in (post["author"], HA_SENDER_ID) and orig["author"] in viewers:
                self._notify({orig["author"]}, "shares", post, f"{author} shared your post", self._summary(post), why="activity")
                viewers = viewers - {orig["author"]}
        # Photo Search: new photos are described once, in the background (only when switched on)
        try:
            from . import ai as _ai, feedai
            caps = _ai.capabilities(self.hass, self.m)
            if caps.get("feed_search") and post.get("media"):
                self.hass.async_create_task(feedai.describe_new(self.hass, self.m, post))
            if caps.get("feed_memories") and post.get("kind") == "review":
                self.hass.async_create_task(feedai.review_caption(self.hass, self.m, post))
        except Exception:  # noqa: BLE001
            pass
        # @mentions and tags first, then everyone else who asked to hear about new posts
        told: set[str] = set()
        page = post.get("page")
        if page and page in viewers:
            self._notify({page}, "page", post, f"{author} posted on your page", self._summary(post))
            told.add(page)
        mention = set(post.get("mentions", [])) - told
        if mention:
            self._notify(mention & viewers, "mentions", post, f"{author} mentioned you in a post", self._summary(post))
            told |= mention
        tagged = {t["uid"] for lst in (post.get("tags") or {}).values() for t in lst} - told
        if tagged:
            self._notify(tagged & viewers, "tags", post, f"{author} tagged you in a photo", self._summary(post))
            told |= tagged
        group = self.data["groups"].get(post["audience"].get("group") or "")
        rest = viewers - told
        if group:
            self._notify(rest, "groups", post, f"{author} posted in {group['name']}", self._summary(post))
        elif post["author"] == HA_SENDER_ID or post.get("kind") in AUTO_KINDS:
            kind = "birthdays" if post.get("kind") == "birthday" else "new_posts"
            self._notify(rest, kind, post, self._auto_title(post), self._summary(post))
        else:
            # who hears about an ordinary new post, and why (Every New Post, Important, Favourites, Get Notified)
            self.notify_new_post(post, rest, author)

    def _auto_title(self, post: dict) -> str:
        kind = post.get("kind")
        if kind == "birthday":
            return "🎂 Birthday"
        if kind == "badges":
            return "🏅 This week's badges"
        if kind == "milestone":
            return "✨ Milestone"
        if kind == "review":
            return "🗓 Year in Review"
        return HA_SENDER_NAME

    def _summary(self, post: dict) -> str:
        kind = post.get("kind")
        if kind == "poll":
            return f"📊 {post.get('text')}"
        if kind == "event":
            return f"📅 {post['event']['title']}"
        if kind == "fund":
            return f"💰 {post['fund']['title']}"
        if kind == "grabs":
            return f"🎁 Up for grabs: {_short(post.get('text') or 'something', 60)}"
        if kind == "list":
            return f"📝 {_short(post.get('text') or 'A list', 120)}"
        if kind == "recs":
            return f"💡 {_short(post.get('text') or 'Recommendations', 120)}"
        if post.get("text"):
            return _short(post["text"], 140)
        media = [self.m.data["attachments"].get(a) or {} for a in post.get("media", [])]
        if media:
            videos = sum(1 for a in media if (a.get("mime") or "").startswith("video/"))
            photos = len(media) - videos
            bits = []
            if photos:
                bits.append("a photo" if photos == 1 else f"{photos} photos")
            if videos:
                bits.append("a video" if videos == 1 else f"{videos} videos")
            return "Shared " + " and ".join(bits)
        return "New post"

    def _notify(self, uids: set[str], kind: str, post: dict, title: str, body: str, comment_id: str | None = None,
                why: str | None = None) -> None:
        """kind: which Feed notification setting it falls under. why: what happened, which decides the
        buttons on it (defaults to kind)."""
        # the bell in the card counts it whatever the phone notification settings say
        self._notif_push(u for u in uids if self.can_see(u, post))
        if not self.notify_callback:
            return
        targets = [u for u in uids if u != HA_SENDER_ID and self.can_see(u, post) and self.wants(u, kind)
                   and not self.post_muted(u, post["id"])]
        targets = self.quiet_filter(targets)
        if targets:
            self.hass.async_create_task(self.notify_callback(targets, post, title, body, comment_id, None, why or kind))

    async def async_edit(self, uid: str, pid: str, raw: dict) -> dict:
        post = self.data["posts"].get(pid)
        if not post or post["author"] != uid:
            raise _err("not_found", "Only the person who posted it can change it")
        before = self.viewers(post)
        if "text" in raw:
            text = _str(raw["text"], MAX_TEXT_LENGTH)
            if text != post.get("text", ""):
                if not text and not post.get("media") and post.get("kind") == "post":
                    raise _err("invalid_format", "A post can't be empty")
                post.setdefault("edits", []).append({"ts": post.get("edited") or post["ts"], "text": post.get("text", "")})
                post["edits"] = post["edits"][-20:]
                post["text"] = text
                post["edited"] = _now()
                if post.get("bg") and (not text or len(text) > BG_MAX_CHARS):
                    post.pop("bg", None)
        if "bg" in raw:
            if raw["bg"] in BACKGROUNDS and post.get("kind") == "post" and not post.get("media") \
                    and 0 < len(post.get("text", "")) <= BG_MAX_CHARS:
                post["bg"] = raw["bg"]
            else:
                post.pop("bg", None)
        if "no_link" in raw:
            if raw["no_link"]:
                post["no_link"] = True
                post.pop("link", None)
            else:
                post.pop("no_link", None)
        if "feeling" in raw:
            post["feeling"] = self._check_feeling(raw["feeling"])
        if "place" in raw:
            post["place"] = self._check_place(uid, raw["place"])
        if "audience" in raw and not post.get("album"):
            post["audience"] = self.check_audience(uid, raw["audience"])
            if post.get("page"):
                post["audience"] = self._with_page(post["audience"], post["page"])
        if "comment_audience" in raw:
            post["comment_audience"] = "people" if raw["comment_audience"] == "people" else "all"
            known = self.household()
            post["commenters"] = [p for p in dict.fromkeys(raw.get("commenters") or post.get("commenters") or [])
                                  if p in known and p != uid] if post["comment_audience"] == "people" else []
        if "tags" in raw:
            post["tags"] = self._check_tags(post, raw["tags"])
        if "mentions" in raw:
            post["mentions"] = self._check_mentions(post, raw["mentions"], uid)
        else:
            post["mentions"] = self._check_mentions(post, post.get("mentions"), uid)
        # tags and mentions never reach people who can no longer see it
        post["tags"] = self._check_tags(post, post.get("tags"))
        if "scheduled_at" in raw and post.get("scheduled_at"):
            sched = int(raw["scheduled_at"] or 0)
            if sched and sched > _now() + 30_000:
                post["scheduled_at"] = post["ts"] = sched
                self._arm_schedule(post)
            else:
                self._cancel(f"sched:{pid}")
                post["ts"] = _now()
                await self._async_published(post)
        if post.get("kind") == "event" and raw.get("event"):
            ev = raw["event"]
            cur = post["event"]
            if ev.get("title"):
                cur["title"] = _str(ev["title"], 120)
            if ev.get("start"):
                cur["start"] = int(ev["start"])
                cur["end"] = int(ev.get("end") or 0) or None
                cur["all_day"] = bool(ev.get("all_day"))
                cur["reminded"] = False
            if "location" in ev:
                cur["location"] = _str(ev["location"], 200)
            if "remind" in ev and ev["remind"] in (None, *REMIND_CHOICES):
                cur["remind"] = ev["remind"]
                cur["reminded"] = False
        self.save()
        self._after_write(post)
        self.push(post, before)
        return self.post_view(post, uid)

    def edits(self, uid: str, pid: str) -> list[dict]:
        post = self._post(uid, pid)
        return list(reversed(post.get("edits", []))) + []

    async def async_delete(self, uid: str, pid: str, is_admin: bool = False) -> None:
        post = self.data["posts"].get(pid)
        if not post or not (post["author"] == uid or post.get("page") == uid or (is_admin and self.can_see(uid, post)) or
                            (is_admin and post["author"] == HA_SENDER_ID)):
            raise _err("not_found", "Only the person who posted it, whose page it's on, or an administrator, can delete it")
        await self._async_remove_post(post)

    async def _async_remove_post(self, post: dict) -> None:
        viewers = self.viewers(post)
        self.data["posts"].pop(post["id"], None)
        self.forget_post_more(post)
        self._cancel(f"list:{post['id']}")
        if post["id"] in self.data["pinned"]:
            self.data["pinned"].remove(post["id"])
        for p in self.data["people"].values():
            if post["id"] in p.get("saved", []):
                p["saved"].remove(post["id"])
        self._cancel(f"sched:{post['id']}")
        self._cancel(f"event:{post['id']}")
        for al in self.data["albums"].values():
            if al.get("cover") in post.get("media", []):
                al.pop("cover", None)
        for aid in post.get("media", []) + [a for c in post.get("comments", []) for a in c.get("media", [])]:
            await self.m._async_remove_attachment(aid)
        self.m._save()
        self.save()
        self.push_removed(post, viewers | {post["author"]})

    # ── one photo or video (press and hold it in Photos, Videos, a profile or an album) ──
    def _media_post(self, uid: str, pid: str, aid: str) -> dict:
        post = self._post(uid, pid)
        if aid not in post.get("media", []):
            raise _err("not_found", "That photo or video has already gone")
        return post

    @staticmethod
    def _only_item(post: dict, aid: str) -> bool:
        """Would the post be empty without this photo or video?"""
        return (post.get("kind", "post") == "post" and not (post.get("text") or "").strip() and not post.get("link")
                and not [a for a in post.get("media", []) if a != aid])

    async def async_media_delete(self, uid: str, pid: str, aid: str, is_admin: bool = False, whole: bool = False) -> dict:
        """Delete one photo or video from a post, for everyone, and its file from Home Assistant. Only
        the person who posted it, or an administrator, can. If it's all the post had, the post goes
        too - but only when asked (whole), so nobody deletes a post by surprise."""
        post = self._media_post(uid, pid, aid)
        if post["author"] != uid and not is_admin:
            raise _err("unauthorized", "Only the person who posted it, or an administrator, can delete it")
        if self._only_item(post, aid):
            if not whole:
                raise _err("only_item", "It’s all that post has. Delete the post instead?")
            await self._async_remove_post(post)
            return {"deleted": True}
        post["media"] = [a for a in post["media"] if a != aid]
        (post.get("tags") or {}).pop(aid, None)
        (post.get("views") or {}).pop(aid, None)
        for a in self.data["albums"].values():
            if a.get("cover") == aid:
                a.pop("cover", None)
        await self.m._async_remove_attachment(aid)
        self.m._save()
        self.save()
        self.push(post)
        self.push_albums()
        return {"post": self.post_view(post, uid)}

    def media_view(self, uid: str, pid: str, aid: str) -> None:
        """Someone watched a video (or opened a photo): counted once per person, never the poster."""
        post = self._media_post(uid, pid, aid)
        if post["author"] == uid or uid == HA_SENDER_ID:
            return
        seen = post.setdefault("views", {}).setdefault(aid, {})
        if uid not in seen:
            seen[uid] = _now()
            self.save()
            self.push(post)

    def media_details(self, uid: str, pid: str, aid: str) -> dict:
        post = self._media_post(uid, pid, aid)
        att = self.m.data["attachments"].get(aid) or {}
        views = (post.get("views") or {}).get(aid) or {}
        out = {"id": aid, "post_id": pid, "author": post["author"], "ts": post["ts"], "mime": att.get("mime"),
               "size": att.get("size"), "width": att.get("width"), "height": att.get("height"),
               "duration": att.get("duration"), "name": att.get("name"), "views": len(views),
               "audience": self.post_view(post, uid)["audience"], "album": post.get("album")}
        if post["author"] == uid:
            # who watched it is for the person who posted it
            out["viewers"] = sorted(views, key=lambda u: views[u], reverse=True)
        return out

    async def async_media_to_album(self, uid: str, pid: str, aid: str, album_id: str) -> dict:
        """Add one of your own photos or videos to an album. It's copied into a new post in the album
        (the album's audience then decides who sees the copy), so the original post is untouched."""
        post = self._media_post(uid, pid, aid)
        if post["author"] != uid:
            raise _err("unauthorized", "You can add your own photos and videos to an album")
        album = self.data["albums"].get(album_id)
        if not album or not (album["owner"] == uid or uid in album.get("contributors", [])):
            raise _err("not_found", "You can’t add to that album")
        if post.get("album") == album_id:
            raise _err("invalid_format", "It’s already in that album")
        new_aid = await self.m.async_copy_attachment(uid, aid)
        return await self.async_create(uid, {"text": "", "media": [new_aid], "album": album_id})

    def album_cover(self, uid: str, album_id: str, aid: str | None) -> dict:
        album = self.data["albums"].get(album_id)
        if not album or album["owner"] != uid:
            raise _err("unauthorized", "Only the person who made the album can choose its cover")
        if aid:
            ok = any(p.get("album") == album_id and aid in p.get("media", []) for p in self.data["posts"].values())
            if not ok:
                raise _err("not_found", "That isn’t in the album")
            album["cover"] = aid
        else:
            album.pop("cover", None)
        self.save()
        self.push_albums()
        return self.album_view(album, uid)

    # ── reacting, saving, pinning ───────────────────────────────────────────
    def react(self, uid: str, pid: str, reaction: str | None) -> dict:
        post = self._post(uid, pid)
        if reaction and reaction not in REACTIONS:
            raise _err("invalid_format", "Unknown reaction")
        old = post["reactions"].get(uid)
        if reaction:
            post["reactions"][uid] = reaction
            post.setdefault("reacted", {})[uid] = _now()
        else:
            post["reactions"].pop(uid, None)
            post.get("reacted", {}).pop(uid, None)
        self.save()
        self.push(post)
        if reaction and reaction != old:
            from .const import EVENT_REACTION
            self.hass.bus.async_fire(EVENT_REACTION, {"user_id": uid, "on": "post", "post_id": pid,
                                                      "reaction": reaction, "to_user_id": post["author"]})
        if reaction and not old and post["author"] != uid:
            name = self.m.entities.name(uid)
            self._notify({post["author"]}, "reactions", post, f"{name} reacted {REACTIONS[reaction]} to your post",
                         self._summary(post))
        return self.post_view(post, uid)

    def save_post(self, uid: str, pid: str, on: bool) -> dict:
        post = self._post(uid, pid)
        saved = self.person(uid)["saved"]
        if on and pid not in saved:
            saved.insert(0, pid)
        elif not on and pid in saved:
            saved.remove(pid)
        self.save()
        view = self.post_view(post, uid)
        self.m._send_to(uid, {"type": "feed", "post": view})
        return view

    def pin(self, uid: str, pid: str, on: bool, is_admin: bool) -> dict:
        post = self._post(uid, pid)
        if post["author"] != uid and not is_admin:
            raise _err("unauthorized", "Only the person who posted it, or an administrator, can pin it")
        pins = self.data["pinned"]
        if on and pid not in pins:
            if len(pins) >= MAX_PINNED:
                raise _err("invalid_format", f"Up to {MAX_PINNED} posts can be pinned. Unpin one first.")
            pins.insert(0, pid)
        elif not on and pid in pins:
            pins.remove(pid)
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def snooze(self, uid: str, author: str, days: int | None) -> dict:
        hidden = self.person(uid)["hidden"]
        if days is None:
            hidden.pop(author, None)
        else:
            if author == uid:
                raise _err("invalid_format", "You can't hide your own posts")
            hidden[author] = _now() + int(days) * DAY_MS if days else 0
        self.save()
        self.m.entities.changed(uid)
        return self.prefs_view(uid)

    def untag(self, uid: str, pid: str, aid: str) -> dict:
        post = self._post(uid, pid)
        tags = post.get("tags", {})
        if aid in tags:
            tags[aid] = [t for t in tags[aid] if t["uid"] != uid]
            if not tags[aid]:
                tags.pop(aid)
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    # ── comments ────────────────────────────────────────────────────────────
    def _check_sticker(self, uid: str, raw: dict | None) -> dict | None:
        return self.m._check_sticker(uid, raw) if raw else None

    async def async_comment(self, uid: str, pid: str, raw: dict) -> dict:
        post = self._post(uid, pid)
        if not self.can_comment(uid, post):
            raise _err("unauthorized", "Only chosen people can comment on this post")
        text = _str(raw.get("text"), MAX_COMMENT)
        sticker = self._check_sticker(uid, raw.get("sticker"))
        reply_to = raw.get("reply_to")
        parent = None
        if reply_to:
            parent = next((c for c in post["comments"] if c["id"] == reply_to), None)
            if not parent:
                raise _err("not_found", "That comment has gone")
            if parent.get("reply_to"):
                parent = next((c for c in post["comments"] if c["id"] == parent["reply_to"]), parent)
        cid = _id()
        contact = None
        if raw.get("contact_id"):
            if post.get("kind") != "recs":
                raise _err("invalid_format", "Contacts can be recommended on a Recommendations post")
            contact = self.rec_contact(uid, raw["contact_id"])
        media = self._take_media(uid, (raw.get("media") or [])[:1], {"post": pid, "comment": cid})
        if not text and not media and not sticker and not contact:
            raise _err("invalid_format", "Write a comment first")
        c = {"id": cid, "author": uid, "ts": _now(), "text": text, "media": media,
             **({"sticker": sticker} if sticker else {}),
             **({"contact": contact} if contact else {}),
             **({"reply_to": parent["id"]} if parent else {}),
             "mentions": self._check_mentions(post, raw.get("mentions"), uid), "reactions": {}}
        post["comments"].append(c)
        self.m._save()
        self.save()
        self.push(post)
        # for automations: who commented on whose post (never what they said)
        from .const import EVENT_COMMENT
        self.hass.bus.async_fire(EVENT_COMMENT, {
            "user_id": uid, "post_id": pid, "comment_id": cid, "post_author_id": post["author"],
            "reply_to_user_id": parent["author"] if parent else None,
            "has_photo": bool(c.get("media")), "has_sticker": bool(c.get("sticker")),
        })
        # who to tell: the person who posted, whoever you replied to, others in the conversation, @mentions
        name = self.m.entities.name(uid)
        body = _short(text, 140) if text else ("Recommended " + contact["name"] if contact else "Sent a sticker" if sticker else "Sent a photo")
        told = {uid}
        if c["mentions"]:
            self._notify(set(c["mentions"]) - told, "mentions", post, f"{name} mentioned you in a comment", body, cid,
                         why="comments")
            told |= set(c["mentions"])
        if parent and parent["author"] not in told:
            self._notify({parent["author"]}, "comments", post, f"{name} replied to your comment", body, cid)
            told.add(parent["author"])
        if post["author"] not in told:
            title = f"{name} wrote on your birthday card" if post.get("kind") == "birthday" and \
                (post.get("birthday") or {}).get("for") == post["author"] else f"{name} commented on your post"
            self._notify({post["author"]}, "comments", post, title, body, cid)
            told.add(post["author"])
        if post.get("kind") == "birthday":
            bday = (post.get("birthday") or {}).get("for")
            if bday and bday not in told:
                self._notify({bday}, "comments", post, f"{name} wrote on your birthday card", body, cid)
                told.add(bday)
        others = {x["author"] for x in post["comments"]} - told
        if others:
            self._notify(others, "comments", post, f"{name} also commented", body, cid)
        return self.post_view(post, uid)

    def _comment(self, post: dict, cid: str) -> dict:
        c = next((c for c in post["comments"] if c["id"] == cid), None)
        if not c:
            raise _err("not_found", "That comment has gone")
        return c

    def comment_edit(self, uid: str, pid: str, cid: str, text: str) -> dict:
        post = self._post(uid, pid)
        c = self._comment(post, cid)
        if c["author"] != uid:
            raise _err("unauthorized", "You can only change your own comments")
        text = _str(text, MAX_COMMENT)
        if not text and not c.get("media") and not c.get("sticker"):
            raise _err("invalid_format", "A comment can't be empty")
        c.setdefault("edits", []).append({"ts": c.get("edited") or c["ts"], "text": c["text"]})
        c["text"] = text
        c["edited"] = _now()
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    async def async_comment_delete(self, uid: str, pid: str, cid: str, is_admin: bool) -> dict:
        post = self._post(uid, pid)
        c = self._comment(post, cid)
        if c["author"] != uid and post["author"] != uid and not is_admin:
            raise _err("unauthorized", "You can delete your own comments, and comments on your posts")
        gone = [x for x in post["comments"] if x["id"] == cid or x.get("reply_to") == cid]
        post["comments"] = [x for x in post["comments"] if x not in gone]
        for x in gone:
            for aid in x.get("media", []):
                await self.m._async_remove_attachment(aid)
        self.m._save()
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def comment_react(self, uid: str, pid: str, cid: str, reaction: str | None) -> dict:
        post = self._post(uid, pid)
        c = self._comment(post, cid)
        if reaction and reaction not in REACTIONS:
            raise _err("invalid_format", "Unknown reaction")
        old = c["reactions"].get(uid)
        if reaction:
            c["reactions"][uid] = reaction
            if not old:
                c.setdefault("reacted", {})[uid] = _now()
        else:
            c["reactions"].pop(uid, None)
            c.get("reacted", {}).pop(uid, None)
        self.save()
        self.push(post)
        if reaction and reaction != old:
            from .const import EVENT_REACTION
            self.hass.bus.async_fire(EVENT_REACTION, {"user_id": uid, "on": "comment", "post_id": pid, "comment_id": cid,
                                                      "reaction": reaction, "to_user_id": c["author"]})
        if reaction and not old and c["author"] != uid:
            self._notify({c["author"]}, "reactions", post,
                         f"{self.m.entities.name(uid)} reacted {REACTIONS[reaction]} to your comment",
                         _short(c.get("text") or "", 140), cid)
        return self.post_view(post, uid)

    # ── polls, events, chip in, up for grabs ────────────────────────────────
    def vote(self, uid: str, pid: str, options: list[str]) -> dict:
        post = self._post(uid, pid)
        poll = post.get("poll")
        if not poll:
            raise _err("invalid_format", "That isn't a poll")
        ids = {o["id"] for o in poll["options"]}
        picks = [o for o in dict.fromkeys(options) if o in ids]
        if not poll.get("multi"):
            picks = picks[:1]
        if picks:
            poll["votes"][uid] = picks
        else:
            poll["votes"].pop(uid, None)
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def poll_add(self, uid: str, pid: str, text: str) -> dict:
        post = self._post(uid, pid)
        poll = post.get("poll")
        if not poll or not (poll.get("add") or post["author"] == uid):
            raise _err("invalid_format", "Choices can't be added to this poll")
        text = _str(text, 120)
        if not text or any(o["text"].lower() == text.lower() for o in poll["options"]):
            raise _err("invalid_format", "That choice is already there")
        if len(poll["options"]) >= MAX_POLL_OPTIONS:
            raise _err("invalid_format", f"A poll can have up to {MAX_POLL_OPTIONS} choices")
        poll["options"].append({"id": _id()[:8], "text": text, "by": uid})
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def rsvp(self, uid: str, pid: str, answer: str | None) -> dict:
        post = self._post(uid, pid)
        ev = post.get("event")
        if not ev:
            raise _err("invalid_format", "That isn't an event")
        if answer and answer not in RSVP:
            raise _err("invalid_format", "Unknown answer")
        if answer:
            ev["rsvp"][uid] = answer
        else:
            ev["rsvp"].pop(uid, None)
        self.save()
        self.push(post)
        if answer in ("going", "maybe") and post["author"] != uid:
            word = "is going to" if answer == "going" else "might go to"
            self._notify({post["author"]}, "events", post, f"{self.m.entities.name(uid)} {word} {ev['title']}",
                         self._when_text(ev), why="activity")
        return self.post_view(post, uid)

    def pledge(self, uid: str, pid: str, amount: float | None) -> dict:
        post = self._post(uid, pid)
        f = post.get("fund")
        if not f:
            raise _err("invalid_format", "That isn't a Chip In")
        if amount is None or float(amount) <= 0:
            f["pledges"].pop(uid, None)
        else:
            amount = round(float(amount), 2)
            if amount > 1_000_000:
                raise _err("invalid_format", "That's a lot! Check the amount")
            old = f["pledges"].get(uid) or {}
            f["pledges"][uid] = {"amount": amount, "paid": bool(old.get("paid")) and old.get("amount") == amount,
                                 "ts": _now()}
            if post["author"] != uid and not old:
                self._notify({post["author"]}, "comments", post,
                             f"{self.m.entities.name(uid)} chipped in to {f['title']}", f"{f['currency']}{amount:g}",
                             why="activity")
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def pledge_paid(self, uid: str, pid: str, who: str, paid: bool) -> dict:
        post = self._post(uid, pid)
        f = post.get("fund")
        if not f or post["author"] != uid:
            raise _err("unauthorized", "Only the organiser can mark who's paid")
        if who in f["pledges"]:
            f["pledges"][who]["paid"] = bool(paid)
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def grabs(self, uid: str, pid: str, action: str) -> dict:
        post = self._post(uid, pid)
        g = post.get("grabs")
        if not g:
            raise _err("invalid_format", "That isn't up for grabs")
        if action == "claim":
            if post["author"] == uid:
                raise _err("invalid_format", "It's yours already")
            if g["status"] != "available":
                raise _err("invalid_format", "Someone's already claimed it")
            g.update({"status": "claimed", "claimed_by": uid, "claimed_ts": _now()})
            self._notify({post["author"]}, "comments", post, f"{self.m.entities.name(uid)} claimed it",
                         _short(post.get("text") or "Up for grabs", 120), why="activity")
        elif action == "release":
            if uid not in (g.get("claimed_by"), post["author"]):
                raise _err("unauthorized", "Only the person who claimed it can let it go")
            g.update({"status": "available", "claimed_by": None, "claimed_ts": None})
        elif action in ("gone", "available"):
            if post["author"] != uid:
                raise _err("unauthorized", "Only the person who posted it can change that")
            g["status"] = "gone" if action == "gone" else ("claimed" if g.get("claimed_by") else "available")
        else:
            raise _err("invalid_format", "Unknown action")
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    def _when_text(self, ev: dict) -> str:
        start = dt_util.as_local(dt_util.utc_from_timestamp(ev["start"] / 1000))
        if ev.get("all_day"):
            return start.strftime("%A %-d %B")
        return start.strftime("%A %-d %B at %H:%M")

    # ── stories ─────────────────────────────────────────────────────────────
    def story_add(self, uid: str, raw: dict) -> dict:
        if not self.enabled():
            raise _err("unavailable", "The Feed is switched off")
        if not self.opt("stories"):
            raise _err("unavailable", "Stories are switched off for the household")
        mine = [s for s in self.data["stories"].values() if s["author"] == uid and s["ts"] > _now() - STORY_MS]
        if len(mine) >= MAX_STORIES:
            raise _err("invalid_format", f"You can have up to {MAX_STORIES} stories at once")
        sid = _id()
        text = _str(raw.get("text"), 300)
        media = self._take_media(uid, [raw["media"]] if raw.get("media") else [], {"story": sid})
        if not text and not media:
            raise _err("invalid_format", "Add a photo, a video or some words")
        audience = self.check_audience(uid, raw.get("audience"))
        story = {"id": sid, "author": uid, "ts": _now(), "text": text,
                 "bg": raw.get("bg") if raw.get("bg") in BACKGROUNDS else ("accent" if not media else None),
                 "media": media[0] if media else None, "audience": audience,
                 "views": {}, "stickers": self.check_stickers(uid, raw.get("stickers"), audience)}
        self.data["stories"][sid] = story
        self.m._save()
        self.save()
        self.push_story(story)
        self.story_mentions_notify(story)
        self.story_followers_notify(story)
        return self.story_view(story, uid)

    def story_seen(self, uid: str, sid: str) -> dict:
        story = self.data["stories"].get(sid)
        if not story or not self.can_see_story(uid, story):
            raise _err("not_found", "That story has gone")
        if uid != story["author"] and uid not in story["views"]:
            story["views"][uid] = _now()
            self.save()
            self.m._send_to(story["author"], {"type": "story", "story": self.story_view(story, story["author"])})
        return self.story_view(story, uid)

    async def async_story_delete(self, uid: str, sid: str, is_admin: bool) -> None:
        story = self.data["stories"].get(sid)
        if not story or (story["author"] != uid and not is_admin):
            raise _err("not_found", "That story has gone")
        await self._async_drop_story(story)

    async def _async_drop_story(self, story: dict, archive: bool = False) -> None:
        self.data["stories"].pop(story["id"], None)
        kept = archive and self.story_archive_add(story)
        att = self.m.data["attachments"].get(story.get("media") or "") or {}
        if story.get("media") and not att.get("highlights") and not kept:
            # a story in a highlight keeps its photo or video
            await self.m._async_remove_attachment(story["media"])
        self.m._save()
        self.save()
        for uid in self.household():
            self.m._send_to(uid, {"type": "story_removed", "story_id": story["id"]})

    # ── groups ──────────────────────────────────────────────────────────────
    def group_save(self, uid: str, raw: dict) -> dict:
        known = self.household()
        name = _str(raw.get("name"), 60)
        if not name:
            raise _err("invalid_format", "Give the group a name")
        members = [p for p in dict.fromkeys(raw.get("members") or []) if p in known]
        gid = raw.get("group_id")
        if gid:
            g = self.data["groups"].get(gid)
            if not g or g["created_by"] != uid:
                raise _err("unauthorized", "Only the person who made the group can change it")
            before = set(g["members"])
            g["name"] = name
            g["members"] = list(dict.fromkeys([uid, *members]))
            if "photo" in raw:
                g["photo"] = raw["photo"] if (raw["photo"] or "").startswith("data:image/") and len(raw["photo"]) < 400_000 else None
            if "about" in raw:
                g["about"] = _str(raw["about"], 300)
            self._regroup(g, before)
        else:
            if sum(1 for g in self.data["groups"].values() if g["created_by"] == uid) >= MAX_GROUPS:
                raise _err("invalid_format", "You've made a lot of groups already")
            g = {"id": _id(), "name": name, "members": list(dict.fromkeys([uid, *members])), "created_by": uid,
                 "created": _now(), "about": _str(raw.get("about"), 300), "photo": None}
            self.data["groups"][g["id"]] = g
            self.push_groups(set(g["members"]))
            told = set(g["members"]) - {uid}
            self._notif_push(told)
            if told and self.notify_callback:
                self.hass.async_create_task(self.notify_callback(
                    [u for u in told if self.wants(u, "groups")], None,
                    f"{self.m.entities.name(uid)} added you to {name}", "A new group in the Feed", None, g["id"], "groups"))
        self.save()
        return self.group_view(g, uid)

    def _regroup(self, g: dict, before: set[str]) -> None:
        """Members changed: the group's posts appear for new members and go for anyone who left."""
        after = set(g["members"])
        self.push_groups(before | after)
        for post in self.data["posts"].values():
            if post["audience"].get("group") == g["id"]:
                for uid in before - after:
                    self.m._send_to(uid, {"type": "feed_removed", "post_id": post["id"]})
                for uid in after - before:
                    self.m._send_to(uid, {"type": "feed", "post": self.post_view(post, uid)})
        for uid in before | after:
            self.m.entities.changed(uid)

    def group_leave(self, uid: str, gid: str) -> None:
        g = self.data["groups"].get(gid)
        if not g or uid not in g["members"]:
            raise _err("not_found", "You're not in that group")
        if g["created_by"] == uid:
            raise _err("invalid_format", "You made this group, so delete it instead (or give it to someone else)")
        before = set(g["members"])
        g["members"].remove(uid)
        self._regroup(g, before)
        self.save()

    async def async_group_delete(self, uid: str, gid: str, is_admin: bool) -> None:
        g = self.data["groups"].get(gid)
        if not g or (g["created_by"] != uid and not is_admin):
            raise _err("unauthorized", "Only the person who made the group can delete it")
        for post in [p for p in self.data["posts"].values() if p["audience"].get("group") == gid]:
            await self._async_remove_post(post)
        members = set(g["members"])
        self.data["groups"].pop(gid, None)
        self.save()
        self.push_groups(members)

    # ── albums ──────────────────────────────────────────────────────────────
    def album_save(self, uid: str, raw: dict) -> dict:
        known = self.household()
        name = _str(raw.get("name"), 80)
        if not name:
            raise _err("invalid_format", "Give the album a name")
        contributors = [p for p in dict.fromkeys(raw.get("contributors") or []) if p in known and p != uid]
        aid = raw.get("album_id")
        if aid:
            a = self.data["albums"].get(aid)
            if not a or a["owner"] != uid:
                raise _err("unauthorized", "Only the person who made the album can change it")
            old_posts = [p for p in self.data["posts"].values() if p.get("album") == aid]
            before = {p["id"]: self.viewers(p) for p in old_posts}
            a["name"] = name
            a["contributors"] = contributors
            if "audience" in raw:
                a["audience"] = self.check_audience(uid, raw["audience"])
                # the album's photos follow the album
                for p in old_posts:
                    p["audience"] = dict(a["audience"])
            for p in old_posts:
                self.push(p, before[p["id"]])
        else:
            if len(self.data["albums"]) >= MAX_ALBUMS:
                raise _err("invalid_format", "There are a lot of albums already")
            a = {"id": _id(), "name": name, "owner": uid, "contributors": contributors, "created": _now(),
                 "audience": self.check_audience(uid, raw.get("audience"))}
            self.data["albums"][a["id"]] = a
        self.save()
        self.push_albums()
        return self.album_view(a, uid)

    async def async_album_delete(self, uid: str, aid: str, keep_posts: bool = True) -> None:
        a = self.data["albums"].get(aid)
        if not a or a["owner"] != uid:
            raise _err("unauthorized", "Only the person who made the album can delete it")
        for post in [p for p in self.data["posts"].values() if p.get("album") == aid]:
            if keep_posts:
                post.pop("album", None)
                self.push(post)
            else:
                await self._async_remove_post(post)
        self.data["albums"].pop(aid, None)
        self.save()
        self.push_albums()

    # ── milestones ──────────────────────────────────────────────────────────
    def milestone_save(self, uid: str, raw: dict) -> dict:
        title = _str(raw.get("title"), 100)
        date = _str(raw.get("date"), 10)
        if not title or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise _err("invalid_format", "A milestone needs a name and a date")
        mid = raw.get("milestone_id")
        if mid:
            ms = self.data["milestones"].get(mid)
            if not ms or ms["owner"] != uid:
                raise _err("not_found", "That milestone isn't yours")
        else:
            if sum(1 for x in self.data["milestones"].values() if x["owner"] == uid) >= MAX_MILESTONES:
                raise _err("invalid_format", f"You can have up to {MAX_MILESTONES} milestones")
            ms = {"id": _id(), "owner": uid, "created": _now()}
            self.data["milestones"][ms["id"]] = ms
        ms.update({"title": title, "date": date, "yearly": bool(raw.get("yearly", True)),
                   "audience": self.check_audience(uid, raw.get("audience"), allow_group=False)})
        self.save()
        self.m._send_to(uid, {"type": "feed_milestones",
                              "milestones": [x for x in self.data["milestones"].values() if x["owner"] == uid]})
        return ms

    def milestone_delete(self, uid: str, mid: str) -> None:
        ms = self.data["milestones"].get(mid)
        if not ms or ms["owner"] != uid:
            raise _err("not_found", "That milestone isn't yours")
        self.data["milestones"].pop(mid)
        self.save()
        self.m._send_to(uid, {"type": "feed_milestones",
                              "milestones": [x for x in self.data["milestones"].values() if x["owner"] == uid]})

    # ── a post shared into a chat ───────────────────────────────────────────
    def post_ref(self, uid: str, participants: list[str], pid: str) -> dict:
        """Send to a chat: only when everyone in the chat can already see the post."""
        post = self._post(uid, pid)
        blocked = [p for p in participants if p != HA_SENDER_ID and not self.can_see(p, post)]
        if blocked:
            raise _err("unauthorized", "Not everyone in this chat can see that post")
        media = [a for a in post.get("media", []) if not (self.m.data["attachments"].get(a) or {}).get("removed")]
        return {"id": pid, "author": post["author"], "text": _short(post.get("text") or self._summary(post), 160),
                "kind": post.get("kind", "post"), "thumb": media[0] if media else None, "ts": post["ts"]}

    # ── timers: scheduled posts, event reminders, the daily jobs ────────────
    def _cancel(self, key: str) -> None:
        unsub = self._timers.pop(key, None)
        if unsub:
            unsub()

    def _arm_schedule(self, post: dict) -> None:
        key = f"sched:{post['id']}"
        self._cancel(key)
        if not post.get("scheduled_at"):
            return

        @callback
        def _due(_when) -> None:
            self._timers.pop(key, None)
            current = self.data["posts"].get(post["id"])
            if current and current.get("scheduled_at"):
                current["ts"] = _now()
                self.hass.async_create_task(self._async_published(current))

        when = dt_util.utc_from_timestamp(max(post["scheduled_at"], _now() + 1000) / 1000)
        self._timers[key] = async_track_point_in_utc_time(self.hass, _due, when)

    def _arm_event(self, post: dict) -> None:
        key = f"event:{post['id']}"
        self._cancel(key)
        ev = post.get("event") or {}
        if ev.get("remind") is None or ev.get("reminded"):
            return
        at = ev["start"] - int(ev["remind"]) * 60_000
        if ev["start"] < _now():
            return

        @callback
        def _due(_when) -> None:
            self._timers.pop(key, None)
            current = self.data["posts"].get(post["id"])
            if not current:
                return
            cev = current["event"]
            cev["reminded"] = True
            self.save()
            people = {u for u, a in cev["rsvp"].items() if a in ("going", "maybe")} | {current["author"]}
            soon = "now" if not cev["remind"] else self._remind_text(cev["remind"])
            self._notify(people, "events", current, f"📅 {cev['title']} {soon}", self._when_text(cev),
                         why="event_reminder")

        when = dt_util.utc_from_timestamp(max(at, _now() + 1000) / 1000)
        self._timers[key] = async_track_point_in_utc_time(self.hass, _due, when)

    @staticmethod
    def _remind_text(minutes: int) -> str:
        if minutes >= 1440:
            return "is tomorrow"
        if minutes >= 60:
            return f"starts in {minutes // 60} hour{'s' if minutes >= 120 else ''}"
        return f"starts in {minutes} minutes"

    def start(self) -> None:
        for post in self.data["posts"].values():
            if post.get("scheduled_at"):
                self._arm_schedule(post)
            if post.get("kind") == "event":
                self._arm_event(post)
            if (post.get("list") or {}).get("todo"):
                self.arm_list(post)
        self._unsubs.append(async_track_time_change(self.hass, self._daily, hour=0, minute=5, second=0))
        self._unsubs.append(async_track_time_change(self.hass, self._weekly, hour=19, minute=0, second=0))
        # Quiet Mode ending: one summary of what was held back
        self._unsubs.append(async_track_time_change(self.hass, self._quiet_tick, second=7))
        self._unsubs.append(async_track_time_change(self.hass, self._review_time, hour=10, minute=0, second=0))
        # catch up on today's birthdays and milestones after a restart
        self.hass.async_create_task(self.async_daily())

    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        for key in list(self._timers):
            self._cancel(key)

    @callback
    def _daily(self, _now_dt=None) -> None:
        self.hass.async_create_task(self.async_daily())

    @callback
    def _review_time(self, now_dt=None) -> None:
        now_dt = now_dt or dt_util.now()
        if now_dt.month == 12 and now_dt.day == 31:
            if self.opt("review"):
                self.hass.async_create_task(self.async_year_in_review(now_dt.year))

    def _done(self, key: str) -> bool:
        if key in self.data["done"]:
            return True
        self.data["done"].append(key)
        self.data["done"] = self.data["done"][-500:]
        return False

    async def async_daily(self) -> None:
        if not self.enabled():
            return
        today = dt_util.now()
        md = today.strftime("%m-%d")
        users = await self.m.async_user_map()
        if not self.opt("birthdays"):
            return   # birthday cards and milestones are switched off
        for uid, p in list(self.data["people"].items()):
            b = p.get("birthday") or ""
            if not p.get("share_birthday") or uid not in users or not b.endswith(md):
                continue
            if self._done(f"birthday:{uid}:{today.year}"):
                continue
            age = None
            if re.match(r"\d{4}", b):
                age = today.year - int(b[:4])
            name = users[uid]["name"]
            await self._async_auto_post("birthday", f"It's {name}'s birthday today! 🎂 Write on their card.",
                                        {"type": "everyone"}, {"for": uid, "age": age, "year": today.year})
        for ms in list(self.data["milestones"].values()):
            date = ms["date"]
            if ms.get("yearly"):
                if date[5:] != md or int(date[:4]) >= today.year:
                    continue
            elif date != today.strftime("%Y-%m-%d"):
                continue
            if self._done(f"milestone:{ms['id']}:{today.year}"):
                continue
            years = today.year - int(date[:4]) if ms.get("yearly") else None
            text = ms["title"] + (f" — {years} year{'s' if years != 1 else ''} today" if years else " — today")
            aud = dict(ms["audience"])
            await self._async_auto_post("milestone", text, aud, {"owner": ms["owner"], "years": years,
                                                                 "title": ms["title"]}, owner=ms["owner"])
        self.save()

    async def _async_auto_post(self, kind: str, text: str, audience: dict, extra: dict, *,
                               refs: list[str] | None = None, owner: str | None = None) -> dict:
        pid = _id()
        if audience.get("type") == "people" and owner:
            audience = {"type": "people", "people": list(dict.fromkeys([owner, *audience.get("people", [])]))}
        elif audience.get("type") == "me" and owner:
            audience = {"type": "people", "people": [owner]}
        post = {"id": pid, "author": HA_SENDER_ID, "ts": _now(), "kind": kind, "text": text, "audience": audience,
                "comment_audience": "all", "commenters": [], "reactions": {}, "reacted": {}, "comments": [],
                "edits": [], "media": [], "refs": refs or [], "tags": {}, "mentions": [], kind: extra}
        self.data["posts"][pid] = post
        self.save()
        await self._async_published(post)
        return post

    async def async_year_in_review(self, year: int, *, force: bool = False) -> dict | None:
        """The household's most-loved photos of the year - only from posts everyone could see."""
        if not self.enabled() or (not force and self._done(f"review:{year}")):
            return None
        start = datetime(year, 1, 1, tzinfo=dt_util.DEFAULT_TIME_ZONE).timestamp() * 1000
        end = datetime(year + 1, 1, 1, tzinfo=dt_util.DEFAULT_TIME_ZONE).timestamp() * 1000
        posts = [p for p in self.data["posts"].values()
                 if start <= p["ts"] < end and p["audience"].get("type") == "everyone" and not p.get("album")
                 and p.get("kind") not in AUTO_KINDS and p["author"] != HA_SENDER_ID]
        if not posts:
            return None
        photos = []
        for p in posts:
            for aid in p.get("media", []):
                att = self.m.data["attachments"].get(aid) or {}
                if (att.get("mime") or "").startswith("image/") and not att.get("removed"):
                    photos.append((len(p.get("reactions", {})) * 3 + len(p.get("comments", [])), p["ts"], aid))
        photos.sort(reverse=True)
        refs = [aid for _s, _t, aid in photos[:9]]
        counts = {"posts": len(posts), "photos": len(photos),
                  "reactions": sum(len(p.get("reactions", {})) for p in posts),
                  "comments": sum(len(p.get("comments", [])) for p in posts)}
        text = (f"Our {year} in the Feed: {counts['posts']} posts, {counts['photos']} photos, "
                f"{counts['reactions']} reactions and {counts['comments']} comments. Here are the most-loved moments.")
        post = await self._async_auto_post("review", text, {"type": "everyone"}, {"year": year, **counts}, refs=refs)
        return post

    # ── automations ─────────────────────────────────────────────────────────
    async def async_automation_post(self, author: str, text: str, audience: dict, media: list[str],
                                    bg: str | None = None) -> dict:
        raw = {"text": text, "media": media, "bg": bg}
        if author != HA_SENDER_ID:
            raw["audience"] = audience
            return await self.async_create(author, raw)
        raw["audience"] = audience
        return await self.async_create(author, raw, automation=True)

    # ── Keep Messages ───────────────────────────────────────────────────────
    async def async_cleanup(self, retention_days: int) -> None:
        # Keep Posts: its own time, or (not set) the same as Keep Messages
        keep = self.opt("keep_days")
        if keep is not None:
            retention_days = int(keep)
        now = _now()
        for story in [s for s in self.data["stories"].values() if s["ts"] < now - STORY_MS]:
            # after its 24 hours a story goes into your private Story Archive (to make highlights from)
            await self._async_drop_story(story, archive=True)
        self.story_archive_tidy(now - retention_days * DAY_MS if retention_days > 0 else None)
        if retention_days > 0:
            cutoff = now - retention_days * DAY_MS
            for post in [p for p in self.data["posts"].values() if p["ts"] < cutoff and not p.get("scheduled_at")]:
                await self._async_remove_post(post)
        # snoozes that have run out
        for p in self.data["people"].values():
            p["hidden"] = {a: u for a, u in p.get("hidden", {}).items() if not u or u > now}
        self.save()

    def forget_user(self, uid: str) -> None:  # noqa: D401
        """Someone removed from Home Assistant: out of groups and albums they didn't make."""
        for g in self.data["groups"].values():
            if uid in g["members"] and g["created_by"] != uid:
                g["members"].remove(uid)
        for a in self.data["albums"].values():
            if uid in a.get("contributors", []):
                a["contributors"].remove(uid)
        self.save()


def zone_now(hass: HomeAssistant, messenger: "Messenger", uid: str) -> dict | None:
    """The zone someone is in right now, from their Home Assistant person (for "Check in here")."""
    person = messenger.person_for(uid)
    if not person:
        return None
    state = person
    if not state or state.state in ("not_home", "unknown", "unavailable"):
        return None
    for z in hass.states.async_all("zone"):
        if z.name == state.state or (state.state == "home" and z.entity_id == "zone.home"):
            return {"zone": z.entity_id, "name": z.name}
    return None


def ts_to_local(ts: int) -> datetime:
    return dt_util.as_local(dt_util.utc_from_timestamp(ts / 1000))


def tomorrow_start() -> datetime:
    return (dt_util.start_of_local_day() + timedelta(days=1))
