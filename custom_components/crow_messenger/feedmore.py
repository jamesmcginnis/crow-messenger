"""More of Facebook in the Feed.

Profiles: an Intro (a short bio and details, each for everyone or only you), Featured photos and
Story Highlights. Posts: Archive, Manage Posts (several at once), Share a post, Ask for
Recommendations, List posts (optionally kept in step with a Home Assistant to-do list) and Share
from Home (a snapshot of a sensor, a chart or the weather). Stories: reactions, replies (they arrive
in Messages) and stickers (a poll, a question, a countdown, a mention, a place, the weather, the
time). People: waves, weekly badges and Saved collections. Comfort: Quiet Mode.

The same privacy rule as the rest of the Feed: nothing is shown to someone who couldn't already
see it. A shared post only shows the original to people who can see the original; a highlight
keeps each story's own audience; a featured photo only shows to people who can see its post;
an Intro detail set to "Only me" never leaves the server for anyone else.
"""
from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from homeassistant.core import Context, Event, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import HA_SENDER_ID

if TYPE_CHECKING:  # pragma: no cover
    from .feed import Feed

_LOGGER = logging.getLogger(__name__)

ABOUT_KEYS = ("work", "school", "lives", "hometown", "team", "pets", "hobbies")
MAX_FEATURED = 9
MAX_HIGHLIGHTS = 20
MAX_HIGHLIGHT_ITEMS = 50
MAX_STORY_ARCHIVE = 300          # stories kept in each person's private Story Archive
MAX_COLLECTIONS = 30
MAX_LIST_ITEMS = 100
MAX_STICKERS = 3
STORY_EMOJI = ("❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "👏")
WAVE_GAP_MS = 3_600_000
HOME_TYPES = ("sensor", "chart", "weather", "camera")
BADGES = {
    "photographer": ("📸", "Top Photographer"),
    "starter": ("💬", "Conversation Starter"),
    "supporter": ("❤️", "Biggest Supporter"),
    "helpful": ("🤝", "Most Helpful"),
    "early": ("🌅", "Early Bird"),
    "night": ("🦉", "Night Owl"),
    "planner": ("📅", "Event Planner"),
}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _now() -> int:
    from .manager import now_ms
    return now_ms()


def _id() -> str:
    from .manager import new_id
    return new_id()


def _str(value: Any, n: int) -> str:
    return str(value or "").strip()[:n]


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


class FeedMoreMixin:
    """Mixed into feed.Feed."""

    # ── switches (Household → Feed) ─────────────────────────────────────────
    def on(self: "Feed", key: str) -> bool:
        return self.opt(key) is not False

    def _need(self: "Feed", key: str, what: str) -> None:
        if not self.on(key):
            raise _err("unavailable", f"{what} {'is' if not what.endswith('s') else 'are'} switched off for the household")

    # ── Quiet Mode ──────────────────────────────────────────────────────────
    def quiet_view(self: "Feed", uid: str) -> dict:
        q = self.person(uid).get("quiet") or {}
        return {"until": q.get("until") if (q.get("until") or 0) > _now() else None, "schedule": bool(q.get("schedule")),
                "from": q.get("from") or "22:00", "to": q.get("to") or "07:00", "dots": bool(q.get("dots")),
                "on": self.in_quiet(uid)}

    def set_quiet(self: "Feed", uid: str, raw: dict) -> dict:
        self._need("quiet", "Quiet Mode")
        q = self.person(uid).setdefault("quiet", {})
        if "until" in raw:
            until = raw["until"]
            q["until"] = int(until) if until and int(until) > _now() else None
        for k in ("from", "to"):
            if k in raw:
                if not TIME_RE.match(str(raw[k] or "")):
                    raise _err("invalid_format", "Times look like 22:00")
                q[k] = raw[k]
        for k in ("schedule", "dots"):
            if k in raw:
                q[k] = bool(raw[k])
        self.save()
        if not self.in_quiet(uid) and self.person(uid).get("quiet_held"):
            self.quiet_summary(uid)
        view = self.quiet_view(uid)
        self.m._send_to(uid, {"type": "feed_quiet", "quiet": view})
        return view

    def in_quiet(self: "Feed", uid: str) -> bool:
        """Quiet Mode: no Feed notifications on the phone (the bell in the card still counts them)."""
        if not self.on("quiet"):
            return False
        q = (self.data["people"].get(uid) or {}).get("quiet") or {}
        if (q.get("until") or 0) > _now():
            return True
        if q.get("schedule"):
            now = dt_util.now().strftime("%H:%M")
            a, b = q.get("from") or "22:00", q.get("to") or "07:00"
            return (a <= now < b) if a <= b else (now >= a or now < b)
        return False

    # ── Notifications that aren't about a post (waves, stories) ─────────────
    def _notify_plain(self: "Feed", uids: set[str], pref: str, title: str, body: str, *, query: str, tag: str,
                      why: str, ref: str = "") -> None:
        self._notif_push(uids)
        if not self.notify_callback:
            return
        targets = self.quiet_filter([u for u in uids if u != HA_SENDER_ID and self.wants(u, pref)])
        if targets:
            self.hass.async_create_task(self.notify_callback(targets, None, title, body, None, None, why,
                                                             query=query, tag=tag, ref=ref))

    def notif_more(self: "Feed", uid: str, add) -> None:
        """Bell notifications from the things in this file: shares, waves and stories."""
        # someone shared your post (the notification opens their share)
        for p in self.data["posts"].values():
            orig = self.data["posts"].get(p.get("shared") or "")
            if orig and orig["author"] == uid and p["author"] != uid and not p.get("scheduled_at") \
                    and self.can_see(uid, p):
                add("shared", p["ts"], p, [p["author"]], key=f"shared:{p['id']}")
        me = self.data["people"].get(uid) or {}
        latest: dict[str, int] = {}
        for w in me.get("waves") or []:
            latest[w["from"]] = max(latest.get(w["from"], 0), w["ts"])
        for who, ts in latest.items():
            add("wave", ts, None, [who], key=f"wave:{who}:{ts}", profile=who, back=self._waved_back(who, uid, ts))
        cutoff = _now() - 86_400_000
        for s in self.data["stories"].values():
            if s["ts"] <= cutoff:
                continue
            if s["author"] == uid:
                rx = s.get("reactions") or {}
                if rx:
                    order = sorted(rx, key=lambda u: rx[u]["ts"], reverse=True)
                    add("story_reactions", rx[order[0]]["ts"], None, order, key=f"sreact:{s['id']}", story_id=s["id"],
                        reaction=rx[order[0]]["emoji"])
                answers = [a for st in s.get("stickers") or [] if st.get("type") == "question" for a in st.get("answers", [])]
                if answers:
                    answers.sort(key=lambda a: a["ts"], reverse=True)
                    add("story_answers", answers[0]["ts"], None, [a["uid"] for a in answers], key=f"sanswer:{s['id']}",
                        story_id=s["id"], text=answers[0]["text"][:100])
            elif self.can_see_story(uid, s) and any(st.get("type") == "mention" and st.get("uid") == uid
                                                   for st in s.get("stickers") or []):
                add("story_mention", s["ts"], None, [s["author"]], key=f"smention:{s['id']}", story_id=s["id"])

    # ── New posts: who hears about them ─────────────────────────────────────
    IMPORTANT_KINDS = ("event", "poll", "grabs", "fund", "list")
    BURST_MS = 5 * 60_000

    def notify_base(self: "Feed") -> dict:
        """Everyone's notification choices before they change any: the household default (Household → Feed)."""
        from .feed import NOTIFY_DEFAULTS
        base = dict(NOTIFY_DEFAULTS)
        d = self.opt("notify_default") or "everything"
        if d == "important":
            base["new_posts"] = False
        elif d == "nothing":
            base.update({"new_posts": False, "important": False, "favourites": False})
        return base

    def is_favourite_of(self: "Feed", viewer: str, author: str) -> bool:
        return any(c.get("favourite") and c.get("ha_user") == author for c in (self.m.cdata["contacts"].get(viewer) or {}).values())

    def following_level(self: "Feed", viewer: str, author: str) -> str | None:
        return ((self.data["people"].get(viewer) or {}).get("follow") or {}).get(author)

    def follow(self: "Feed", uid: str, other: str, level: str | None) -> dict:
        """Get Notified: Off, Their Posts, or Their Posts and Stories."""
        if other == uid or other not in self.household():
            raise _err("not_found", "That person isn't in the household")
        f = self.person(uid).setdefault("follow", {})
        if level in ("posts", "stories"):
            f[other] = level
        else:
            f.pop(other, None)
        self.save()
        return {"following": f.get(other)}

    def new_post_reason(self: "Feed", viewer: str, post: dict) -> str | None:
        """Why someone hears about a new post (the Feed Settings switch it falls under), or None."""
        author = post["author"]
        if author in self._snoozed(viewer):
            return None   # hidden for 30 days
        if self.following_level(viewer, author) and self.wants(viewer, "following"):
            return "following"
        if self.wants(viewer, "new_posts"):
            return "new_posts"
        if post.get("kind") in self.IMPORTANT_KINDS and self.wants(viewer, "important"):
            return "important"
        if self.is_favourite_of(viewer, author) and self.wants(viewer, "favourites"):
            return "favourites"
        return None

    def notify_new_post(self: "Feed", post: dict, viewers: set[str], author: str) -> None:
        """A new post: told to whoever wants to hear about it. Several posts in a few minutes from the same
        person become one notification ("person2 posted 3 times") instead of a buzz each time."""
        self._notif_push(viewers)
        if not self.notify_callback:
            return
        title = {"event": f"{author} created an event", "poll": f"{author} asked", "grabs": f"{author} is giving something away",
                 "fund": f"{author} started a Chip In", "list": f"{author} made a list", "recs": f"{author} is asking for recommendations"}.get(
            post.get("kind"), f"{author} posted")
        if post.get("profile_update") == "photo":
            title = f"{author} updated their profile picture"
        elif post.get("profile_update") == "cover":
            title = f"{author} updated their cover photo"
        elif post.get("shared"):
            title = f"{author} shared a post"
        body = self._summary(post)
        bursts = self.__dict__.setdefault("_bursts", {})
        now = _now()
        plain: dict[str, list[str]] = {}
        for v in viewers:
            if v == HA_SENDER_ID or not self.can_see(v, post):
                continue
            why = self.new_post_reason(v, post)
            if not why:
                continue
            key = (v, post["author"])
            b = bursts.get(key)
            if b and now - b["last"] < self.BURST_MS:
                b["count"] += 1
                b["last"] = now
                if not self.quiet_filter([v]):
                    continue
                self.hass.async_create_task(self.notify_callback(
                    [v], post, f"{author} posted {b['count']} times", body, None, None, "new_posts",
                    query=f"crow_profile={post['author']}", tag=b["tag"]))
                continue
            bursts[key] = {"tag": f"crow_feed_{post['id']}", "count": 1, "last": now}
            plain.setdefault(why, []).append(v)
        for why, uids in plain.items():
            targets = self.quiet_filter(uids)
            if targets:
                self.hass.async_create_task(self.notify_callback(targets, post, title, body, None, None, "new_posts"))
        if len(bursts) > 500:
            for k in [k for k, b in bursts.items() if now - b["last"] > self.BURST_MS]:
                bursts.pop(k, None)

    def story_followers_notify(self: "Feed", story: dict) -> None:
        who = {u for u in self.household() if u != story["author"] and self.following_level(u, story["author"]) == "stories"
               and self.can_see_story(u, story) and story["author"] not in self._snoozed(u)}
        if who:
            name = self.m.entities.name(story["author"])
            self._notify_plain(who, "following", f"{name} added to their story", self._story_text(story) if story.get("text") else "Tap to see it",
                               query=f"crow_story={story['id']}", tag=f"crow_feed_story_{story['id']}", why="story")

    # ── Quiet Mode: held back, then one summary when it ends ────────────────
    def quiet_filter(self: "Feed", uids) -> list[str]:
        """The people who can be told now; anyone in Quiet Mode has it counted for their summary instead."""
        out = []
        for u in uids:
            if self.in_quiet(u):
                p = self.person(u)
                p["quiet_held"] = int(p.get("quiet_held") or 0) + 1
                p.setdefault("quiet_since", _now())
                self.save()
            else:
                out.append(u)
        return out

    @callback
    def _quiet_tick(self: "Feed", _now_dt=None) -> None:
        for uid, p in list(self.data["people"].items()):
            if p.get("quiet_held") and not self.in_quiet(uid):
                self.quiet_summary(uid)

    def quiet_summary(self: "Feed", uid: str) -> None:
        p = self.person(uid)
        n = int(p.pop("quiet_held", 0) or 0)
        p.pop("quiet_since", None)
        self.save()
        if not n or not self.notify_callback:
            return
        unread = self.notif_unread(uid)
        body = f"{n} notification{'s' if n != 1 else ''} were held back while Quiet Mode was on" + (f" · {unread} unread in the bell" if unread else "")
        self.hass.async_create_task(self.notify_callback([uid], None, "🌙 While you were quiet", body, None, None, "quiet",
                                                         query="crow_feed=alerts", tag="crow_feed_quiet"))

    # ── Intro / About, Featured photos ──────────────────────────────────────
    def profile_info(self: "Feed", uid: str, other: str) -> dict:
        """The extra parts of someone's profile, as this person may see them."""
        if other not in self.household() and other != uid:
            raise _err("not_found", "That person isn't in the household")
        person = self.data["people"].get(other) or {}
        out: dict[str, Any] = {"user_id": other}
        if self.on("intro"):
            about = person.get("about") or {}
            details = []
            for k in ABOUT_KEYS:
                d = (about.get("details") or {}).get(k)
                if d and d.get("value") and (other == uid or d.get("aud", "everyone") == "everyone"):
                    details.append({"key": k, "value": d["value"], **({"aud": d.get("aud", "everyone")} if other == uid else {})})
            out["about"] = {"bio": about.get("bio") or "", "details": details}
            featured = []
            for aid in person.get("featured") or []:
                att = self.m.data["attachments"].get(aid)
                if att and not att.get("removed") and att.get("feed") and self.media_visible(uid, att):
                    ref = att["feed"]
                    featured.append({**self._att_view(aid), "post_id": ref.get("post"), "author": other})
            out["featured"] = featured
        if self.on("highlights"):
            out["highlights"] = self._highlights_for(uid, other)
            if other == uid:
                # the + for a new highlight only shows once there's a story to put in one
                out["can_highlight"] = bool(person.get("story_archive")) or any(
                    s["author"] == uid for s in self.data["stories"].values())
        if self.on("badges"):
            out["badges"] = [{"key": b, "emoji": BADGES[b][0], "name": BADGES[b][1]}
                             for b in ((self.data.get("badges") or {}).get("by") or {}).get(other, []) if b in BADGES]
        if other != uid:
            out["following"] = self.following_level(uid, other)
        if self.on("waves") and other != uid:
            mine = [w["ts"] for w in (person.get("waves") or []) if w["from"] == uid]
            out["waved"] = max(mine) if mine else None
        return out

    def set_about(self: "Feed", uid: str, raw: dict) -> dict:
        self._need("intro", "Intro")
        about = self.person(uid).setdefault("about", {"bio": "", "details": {}})
        if "bio" in raw:
            about["bio"] = _str(raw["bio"], 160)
        for k, d in (raw.get("details") or {}).items():
            if k not in ABOUT_KEYS:
                continue
            value = _str((d or {}).get("value"), 80)
            if k == "lives" and value.startswith("zone."):
                state = self.hass.states.get(value)
                value = state.name if state else ""
            if not value:
                about.setdefault("details", {}).pop(k, None)
            else:
                about.setdefault("details", {})[k] = {"value": value, "aud": "me" if (d or {}).get("aud") == "me" else "everyone"}
        self.save()
        return self.profile_info(uid, uid)

    def set_featured(self: "Feed", uid: str, aids: list[str]) -> dict:
        """Up to nine of your photos at the top of your profile: from your own posts, or ones you're tagged in."""
        self._need("intro", "Featured photos")
        out = []
        for aid in list(dict.fromkeys(aids or []))[:MAX_FEATURED]:
            att = self.m.data["attachments"].get(aid) or {}
            post = self.data["posts"].get((att.get("feed") or {}).get("post") or "")
            tagged = post and uid in [t["uid"] for t in (post.get("tags") or {}).get(aid, [])]
            if not post or att.get("removed") or not (att.get("mime") or "").startswith("image/") \
                    or not (post["author"] == uid or tagged) or post.get("archived"):
                raise _err("invalid_format", "Featured photos come from your own posts or photos you're tagged in")
            out.append(aid)
        self.person(uid)["featured"] = out
        self.save()
        return self.profile_info(uid, uid)

    # ── Story Highlights ────────────────────────────────────────────────────
    def _highlights_for(self: "Feed", uid: str, owner: str) -> list[dict]:
        out = []
        for h in (self.data["people"].get(owner) or {}).get("highlights") or []:
            items = [self._hl_item_view(i) for i in h["items"] if self._audience_ok(uid, i["audience"], owner)]
            if items:
                cover = next((i for i in items if i["id"] == h.get("cover")), items[0])
                out.append({"id": h["id"], "name": h["name"], "items": items, "cover": cover})
        return out

    def _hl_item_view(self: "Feed", i: dict) -> dict:
        return {"id": i["id"], "ts": i["ts"], "text": i.get("text", ""), "bg": i.get("bg"),
                "media": self._att_view(i["media"]) if i.get("media") else None}

    def highlight_save(self: "Feed", uid: str, raw: dict) -> dict:
        self._need("highlights", "Story Highlights")
        hls = self.person(uid).setdefault("highlights", [])
        h = next((x for x in hls if x["id"] == raw.get("highlight_id")), None) if raw.get("highlight_id") else None
        if raw.get("delete"):
            if h:
                hls.remove(h)
                for i in h["items"]:
                    self._hl_release(i)
            self.save()
            return {"highlights": self._highlights_for(uid, uid)}
        if not h:
            if len(hls) >= MAX_HIGHLIGHTS:
                raise _err("invalid_format", f"You can have up to {MAX_HIGHLIGHTS} highlights")
            h = {"id": _id(), "name": _str(raw.get("name"), 30) or "Highlights", "items": [], "created": _now()}
            hls.append(h)
        if raw.get("name"):
            h["name"] = _str(raw["name"], 30)
        adds = [raw["add_story"]] if raw.get("add_story") else []
        adds += [x for x in raw.get("add_stories") or [] if x not in adds]
        added: dict[str, str] = {}
        single = bool(raw.get("add_story")) and not raw.get("add_stories")   # from a story's Highlight button
        for sid in adds:
            # a story that's still up, or one from your Story Archive
            s = self.data["stories"].get(sid)
            if not s or s["author"] != uid:
                s = next((a for a in self.person(uid).get("story_archive") or [] if a["id"] == sid), None)
            if not s:
                if single:
                    raise _err("not_found", "That story has gone")
                continue
            if any(i.get("story") == s["id"] for i in h["items"]):
                if single:
                    raise _err("invalid_format", "That story is already in this highlight")
                continue
            if len(h["items"]) >= MAX_HIGHLIGHT_ITEMS:
                raise _err("invalid_format", "This highlight is full")
            item = {"id": _id(), "story": s["id"], "ts": s["ts"], "text": s.get("text", ""), "bg": s.get("bg"),
                    "media": s.get("media"), "audience": dict(s["audience"])}
            h["items"].append(item)
            added[s["id"]] = item["id"]
            if item["media"]:
                att = self.m.data["attachments"].get(item["media"])
                if att:
                    # kept after the story ends, for the same people the story was for
                    att.setdefault("highlights", [])
                    att["highlights"] = list(dict.fromkeys([*att["highlights"], f"{uid}:{h['id']}:{item['id']}"]))
        if adds and not added and not h["items"]:
            hls.remove(h)
            raise _err("not_found", "Those stories have gone")
        if raw.get("cover_story"):
            cid = added.get(raw["cover_story"]) or next((i["id"] for i in h["items"] if i.get("story") == raw["cover_story"]), None)
            if cid:
                h["cover"] = cid
        if raw.get("remove_item"):
            item = next((i for i in h["items"] if i["id"] == raw["remove_item"]), None)
            if item:
                h["items"].remove(item)
                self._hl_release(item, f"{uid}:{h['id']}:{item['id']}")
        if raw.get("cover"):
            h["cover"] = raw["cover"]
        if not h["items"] and not adds:
            hls.remove(h)
        self.m._save()
        self.save()
        return {"highlights": self._highlights_for(uid, uid), "highlight_id": h["id"]}

    def _hl_release(self: "Feed", item: dict, _key: str | None = None) -> None:
        aid = item.get("media")
        att = self.m.data["attachments"].get(aid or "")
        if not att:
            return
        att["highlights"] = [k for k in att.get("highlights", []) if not k.endswith(f":{item['id']}")]
        if not att["highlights"] and not att.get("story_archive") \
                and not self.data["stories"].get((att.get("feed") or {}).get("story") or ""):
            self.hass.async_create_task(self.m._async_remove_attachment(aid))

    # ── Story Archive: your stories after their 24 hours, only for you (to make highlights from) ──
    def story_archive_add(self: "Feed", story: dict) -> bool:
        if not self.on("story_archive"):
            return False
        arch = self.person(story["author"]).setdefault("story_archive", [])
        if any(a["id"] == story["id"] for a in arch):
            return True
        arch.append({"id": story["id"], "ts": story["ts"], "text": story.get("text", ""), "bg": story.get("bg"),
                     "media": story.get("media"), "audience": dict(story["audience"])})
        att = self.m.data["attachments"].get(story.get("media") or "")
        if att:
            att["story_archive"] = story["author"]
        while len(arch) > MAX_STORY_ARCHIVE:
            self._story_archive_drop(story["author"], arch[0])
        return True

    def _story_archive_drop(self: "Feed", uid: str, entry: dict) -> None:
        arch = self.person(uid).get("story_archive") or []
        if entry in arch:
            arch.remove(entry)
        att = self.m.data["attachments"].get(entry.get("media") or "")
        if att:
            att.pop("story_archive", None)
            if not att.get("highlights"):
                self.hass.async_create_task(self.m._async_remove_attachment(entry["media"]))

    def story_archive_tidy(self: "Feed", cutoff: int | None) -> None:
        """Keep Posts applies to the archive too; with the archive switched off it's emptied."""
        for uid, person in list(self.data["people"].items()):
            for entry in list(person.get("story_archive") or []):
                if not self.on("story_archive") or (cutoff and entry["ts"] < cutoff):
                    self._story_archive_drop(uid, entry)

    def story_archive_view(self: "Feed", uid: str) -> dict:
        self._need("highlights", "Story Highlights")
        used = {i.get("story") for h in self.person(uid).get("highlights") or [] for i in h["items"]}
        live = [s for s in self.data["stories"].values() if s["author"] == uid]
        items = [{"id": s["id"], "ts": s["ts"], "text": s.get("text", ""), "bg": s.get("bg"), "live": live_,
                  "media": self._att_view(s["media"]) if s.get("media") else None, "in_highlight": s["id"] in used}
                 for s, live_ in [*((x, True) for x in live), *((x, False) for x in self.person(uid).get("story_archive") or [])]]
        items.sort(key=lambda x: -x["ts"])
        return {"stories": items, "archive": self.on("story_archive")}

    def story_archive_delete(self: "Feed", uid: str, sid: str) -> dict:
        entry = next((a for a in self.person(uid).get("story_archive") or [] if a["id"] == sid), None)
        if entry:
            self._story_archive_drop(uid, entry)
            self.m._save()
            self.save()
        return self.story_archive_view(uid)

    def highlight_visible(self: "Feed", uid: str, att: dict) -> bool:
        for key in att.get("highlights") or []:
            owner, hid, iid = (key.split(":") + ["", "", ""])[:3]
            h = next((x for x in (self.data["people"].get(owner) or {}).get("highlights") or [] if x["id"] == hid), None)
            item = next((i for i in (h or {}).get("items", []) if i["id"] == iid), None)
            if item and self._audience_ok(uid, item["audience"], owner):
                return True
        return False

    # ── Archive, Manage Posts ───────────────────────────────────────────────
    def archive(self: "Feed", uid: str, pid: str, on: bool) -> dict:
        post = self.data["posts"].get(pid)
        if not post or post["author"] != uid:
            raise _err("not_found", "Only the person who posted it can archive it")
        before = self.viewers(post)
        if on:
            post["archived"] = _now()
            if pid in self.data["pinned"]:
                self.data["pinned"].remove(pid)
        else:
            post.pop("archived", None)
        self.save()
        self.push(post, before)
        return self.post_view(post, uid)

    async def async_bulk(self: "Feed", uid: str, is_admin: bool, pids: list[str], action: str,
                         audience: dict | None = None) -> dict:
        done, failed = 0, 0
        aud = self.check_audience(uid, audience) if action == "audience" else None
        for pid in list(dict.fromkeys(pids))[:200]:
            try:
                if action in ("archive", "unarchive"):
                    self.archive(uid, pid, action == "archive")
                elif action == "delete":
                    await self.async_delete(uid, pid, is_admin)
                elif action == "audience":
                    post = self.data["posts"].get(pid)
                    if not post or post["author"] != uid or post.get("album"):
                        raise _err("not_found", "Not yours")
                    await self.async_edit(uid, pid, {"audience": aud})
                done += 1
            except Exception:  # noqa: BLE001 - one that can't be changed doesn't stop the rest
                failed += 1
        return {"done": done, "failed": failed}

    # ── Share a post ────────────────────────────────────────────────────────
    def check_share(self: "Feed", uid: str, pid: str) -> str:
        self._need("shares", "Sharing posts")
        orig = self._post(uid, pid)
        orig = self.data["posts"].get(orig.get("shared") or "") or orig   # sharing a share shares the original
        if not self.can_see(uid, orig) or orig.get("archived") or orig.get("scheduled_at"):
            raise _err("not_found", "This post can't be shared")
        return orig["id"]

    def shared_view(self: "Feed", post: dict, uid: str) -> dict:
        orig = self.data["posts"].get(post["shared"])
        if not orig or not self.can_see(uid, orig):
            return {"id": post["shared"], "unavailable": True}
        v = self.post_view(orig, uid)
        return {k: v.get(k) for k in ("id", "author", "ts", "kind", "text", "bg", "feeling", "place", "link", "media",
                                      "audience", "poll", "event", "fund", "grabs", "list", "home", "page")}

    # ── Ask for Recommendations ─────────────────────────────────────────────
    def rec_contact(self: "Feed", uid: str, cid: str) -> dict:
        """A contact from your own Contacts, put in a comment: only what's useful to pass on."""
        c = (self.m.cdata["contacts"].get(uid) or {}).get(cid)
        if not c:
            raise _err("not_found", "That contact wasn't found")
        name = " ".join(x for x in (c.get("first"), c.get("last")) if x) or c.get("company") or c.get("nickname") or "Contact"
        return {"name": name[:120], "company": (c.get("company") or "")[:120], "job_title": (c.get("job_title") or "")[:120],
                "phones": [{"label": p.get("label", ""), "value": p.get("value", "")} for p in (c.get("phones") or [])[:2]],
                "emails": [{"label": e.get("label", ""), "value": e.get("value", "")} for e in (c.get("emails") or [])[:1]],
                "urls": [{"label": u.get("label", ""), "value": u.get("value", "")} for u in (c.get("urls") or [])[:1]]}

    @staticmethod
    def recs_summary(post: dict) -> list[dict]:
        """Everything recommended in the comments, most recommended first."""
        found: dict[str, dict] = {}
        for c in post.get("comments", []):
            ct = c.get("contact")
            if not ct:
                continue
            key = (ct["name"] + "|" + ((ct.get("phones") or [{}])[0].get("value") or "")).lower()
            entry = found.setdefault(key, {"contact": ct, "by": [], "comment_id": c["id"]})
            if c["author"] not in entry["by"]:
                entry["by"].append(c["author"])
        return sorted(found.values(), key=lambda e: -len(e["by"]))

    # ── List posts ──────────────────────────────────────────────────────────
    def check_list(self: "Feed", uid: str, raw: dict | None, text: str) -> dict:
        raw = raw or {}
        items = [_str(i, 200) for i in raw.get("items") or []]
        items = [i for i in dict.fromkeys(items) if i][:MAX_LIST_ITEMS]
        if not text:
            raise _err("invalid_format", "Give the list a title")
        todo = _str(raw.get("todo"), 255)
        if todo and (not todo.startswith("todo.") or not self.hass.states.get(todo)):
            raise _err("not_found", "That to-do list isn't in Home Assistant")
        return {"items": [{"id": _id()[:8], "text": i, "done": False, "by": uid} for i in items],
                **({"todo": todo} if todo else {})}

    async def async_list_item(self: "Feed", uid: str, pid: str, action: str, item_id: str | None, text: str | None) -> dict:
        post = self._post(uid, pid)
        lst = post.get("list")
        if not lst:
            raise _err("not_found", "That isn't a list")
        if not self.can_comment(uid, post):
            raise _err("unauthorized", "Only chosen people can change this list")
        item = next((i for i in lst["items"] if i["id"] == item_id), None) if item_id else None
        todo = lst.get("todo")
        if action == "toggle" and item:
            item["done"] = not item["done"]
            item["done_by"] = uid if item["done"] else None
            if todo:
                await self._todo("update_item", todo, uid, item=item["text"], status="completed" if item["done"] else "needs_action")
        elif action == "add":
            text = _str(text, 200)
            if not text:
                raise _err("invalid_format", "Type something to add")
            if len(lst["items"]) >= MAX_LIST_ITEMS:
                raise _err("invalid_format", "The list is full")
            lst["items"].append({"id": _id()[:8], "text": text, "done": False, "by": uid})
            if todo:
                await self._todo("add_item", todo, uid, item=text)
        elif action == "remove" and item:
            if item["by"] != uid and post["author"] != uid:
                raise _err("unauthorized", "Only whoever added it, or whoever posted the list, can remove it")
            lst["items"].remove(item)
            if todo:
                await self._todo("remove_item", todo, uid, item=item["text"])
        else:
            raise _err("not_found", "That item has gone")
        self.save()
        self.push(post)
        return self.post_view(post, uid)

    async def _todo(self: "Feed", service: str, entity: str, uid: str, **data: Any) -> None:
        self.__dict__[f"_todo_quiet_{entity}"] = _now()
        try:
            await self.hass.services.async_call("todo", service, {"entity_id": entity, **data},
                                                blocking=True, context=Context(user_id=uid))
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger Feed list: to-do %s on %s failed: %s", service, entity, err)

    async def async_list_published(self: "Feed", post: dict) -> None:
        lst = post.get("list") or {}
        if lst.get("todo"):
            for item in lst["items"]:
                await self._todo("add_item", lst["todo"], post["author"], item=item["text"])
            self.arm_list(post)

    @callback
    def arm_list(self: "Feed", post: dict) -> None:
        """Ticks and new items made in the Home Assistant to-do list show on the post too."""
        todo = (post.get("list") or {}).get("todo")
        if not todo:
            return
        key = f"list:{post['id']}"
        self._cancel(key)
        pid = post["id"]

        @callback
        def _changed(_event: Event) -> None:
            if _now() - self.__dict__.get(f"_todo_quiet_{todo}", 0) < 3000:
                return
            self.hass.async_create_task(self._async_list_in(pid, todo))

        self._timers[key] = async_track_state_change_event(self.hass, [todo], _changed)

    async def _async_list_in(self: "Feed", pid: str, todo: str) -> None:
        try:
            resp = await self.hass.services.async_call("todo", "get_items", {"entity_id": todo},
                                                       blocking=True, return_response=True)
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Crow Messenger could not read %s: %s", todo, err)
            return
        post = self.data["posts"].get(pid)
        if not post or not post.get("list"):
            return
        lst = post["list"]
        by_text = {i["text"].lower(): i for i in lst["items"]}
        changed = False
        for it in ((resp or {}).get(todo) or {}).get("items", []):
            summary = str(it.get("summary") or "").strip()
            if not summary:
                continue
            done = it.get("status") == "completed"
            mine = by_text.get(summary.lower())
            if mine and mine["done"] != done:
                mine["done"] = done
                changed = True
            elif not mine and len(lst["items"]) < MAX_LIST_ITEMS:
                lst["items"].append({"id": _id()[:8], "text": summary[:200], "done": done, "by": HA_SENDER_ID})
                changed = True
        if changed:
            self.save()
            self.push(post)

    # ── Share from Home ─────────────────────────────────────────────────────
    def check_home(self: "Feed", raw: dict | None) -> dict | None:
        """A snapshot from Home Assistant, as it was when posted (it doesn't change afterwards)."""
        if not raw:
            return None
        self._need("home_cards", "Share from Home")
        kind = raw.get("type")
        if kind not in HOME_TYPES:
            raise _err("invalid_format", "Unknown kind of card")
        entity = _str(raw.get("entity"), 255)
        if not re.fullmatch(r"[a-z_]+\.[a-z0-9_]+", entity):
            raise _err("invalid_format", "Choose something from Home Assistant")
        out: dict[str, Any] = {"type": kind, "entity": entity, "name": _str(raw.get("name"), 80) or entity,
                               "state": _str(raw.get("state"), 60), "unit": _str(raw.get("unit"), 16),
                               "icon": _str(raw.get("icon"), 60), "ts": _now()}
        if kind == "chart":
            pts = []
            for p in (raw.get("points") or [])[:160]:
                try:
                    pts.append([int(p[0]), round(float(p[1]), 3)])
                except (TypeError, ValueError, IndexError):
                    continue
            if len(pts) < 2:
                raise _err("invalid_format", "There isn't enough history to draw a chart")
            out["points"] = pts
            out["hours"] = max(1, min(int(raw.get("hours") or 24), 24 * 31))
        if kind == "weather":
            w = raw.get("weather") or {}
            out["weather"] = {k: _str(w.get(k), 30) for k in ("condition", "temperature", "temp_unit", "high", "low",
                                                              "humidity", "wind", "wind_unit") if w.get(k) not in (None, "")}
        return out

    # ── Stories: reactions, replies, stickers ───────────────────────────────
    def check_stickers(self: "Feed", uid: str, raw: list | None, audience: dict) -> list[dict]:
        if not raw:
            return []
        self._need("story_stickers", "Story stickers")
        out = []
        for st in raw[:MAX_STICKERS]:
            kind = (st or {}).get("type")
            pos = {"x": min(0.95, max(0.05, float(st.get("x", 0.5)))), "y": min(0.92, max(0.08, float(st.get("y", 0.5))))}
            base = {"id": _id()[:8], "type": kind, **pos}
            if kind == "poll":
                q = _str(st.get("question"), 80)
                opts = [_str(o, 30) for o in st.get("options") or []]
                opts = [o for o in opts if o][:4]
                if len(opts) < 2:
                    raise _err("invalid_format", "A poll sticker needs two answers")
                out.append({**base, "question": q, "options": opts, "votes": {}})
            elif kind == "question":
                out.append({**base, "prompt": _str(st.get("prompt"), 80) or "Ask me anything", "answers": []})
            elif kind == "countdown":
                at = int(st.get("at") or 0)
                if at <= _now():
                    raise _err("invalid_format", "A countdown needs a time in the future")
                out.append({**base, "title": _str(st.get("title"), 40) or "Countdown", "at": at})
            elif kind == "mention":
                who = _str(st.get("uid"), 64)
                if who not in self.household() or who == uid or not self._audience_ok(who, audience, uid):
                    raise _err("invalid_format", "You can mention someone the story is shared with")
                out.append({**base, "uid": who})
            elif kind == "place":
                place = self._check_place(uid, {"zone": st.get("zone")})
                if not place:
                    raise _err("invalid_format", "Choose a place")
                out.append({**base, **place})
            elif kind == "weather":
                ent = _str(st.get("entity"), 255)
                state = self.hass.states.get(ent) if ent.startswith("weather.") else None
                if not state:
                    raise _err("not_found", "That weather isn't in Home Assistant")
                temp = state.attributes.get("temperature")
                unit = state.attributes.get("temperature_unit") or "°"
                out.append({**base, "condition": state.state, "temperature": f"{round(float(temp))}{unit}" if temp not in (None, "") else ""})
            elif kind == "time":
                out.append(base)
            else:
                raise _err("invalid_format", "Unknown sticker")
        return out

    def stickers_view(self: "Feed", story: dict, uid: str) -> list[dict]:
        mine = uid == story["author"]
        out = []
        for st in story.get("stickers") or []:
            v = {k: st[k] for k in st if k not in ("votes", "answers")}
            if st["type"] == "poll":
                counts = [0] * len(st["options"])
                for i in st["votes"].values():
                    if 0 <= i < len(counts):
                        counts[i] += 1
                v["counts"] = counts
                v["mine"] = st["votes"].get(uid)
                if mine:
                    v["voters"] = st["votes"]
            elif st["type"] == "question":
                v["answered"] = any(a["uid"] == uid for a in st["answers"])
                if mine:
                    v["answers"] = st["answers"]
            out.append(v)
        return out

    def story_react(self: "Feed", uid: str, sid: str, emoji: str | None) -> dict:
        self._need("story_replies", "Story reactions")
        story = self.data["stories"].get(sid)
        if not story or not self.can_see_story(uid, story) or story["author"] == uid:
            raise _err("not_found", "That story has gone")
        rx = story.setdefault("reactions", {})
        had = uid in rx
        if emoji:
            if emoji not in STORY_EMOJI:
                raise _err("invalid_format", "Unknown reaction")
            rx[uid] = {"emoji": emoji, "ts": _now()}
        else:
            rx.pop(uid, None)
        self.save()
        self.m._send_to(story["author"], {"type": "story", "story": self.story_view(story, story["author"])})
        if emoji and not had:
            name = self.m.entities.name(uid)
            self._notify_plain({story["author"]}, "stories", f"{name} reacted {emoji} to your story", self._story_text(story),
                               query=f"crow_story={sid}", tag=f"crow_feed_story_{sid}", why="story")
        return self.story_view(story, uid)

    def story_reply_ok(self: "Feed", uid: str, sid: str) -> dict:
        self._need("story_replies", "Story replies")
        story = self.data["stories"].get(sid)
        if not story or not self.can_see_story(uid, story) or story["author"] == uid:
            raise _err("not_found", "That story has gone")
        return story

    def story_replied(self: "Feed", uid: str, story: dict) -> None:
        story.setdefault("replies", {})[uid] = _now()
        self.save()
        self.m._send_to(story["author"], {"type": "story", "story": self.story_view(story, story["author"])})

    @staticmethod
    def _story_text(story: dict) -> str:
        return (story.get("text") or "")[:80] or "Your story"

    def story_sticker(self: "Feed", uid: str, sid: str, stid: str, vote: int | None, answer: str | None) -> dict:
        story = self.data["stories"].get(sid)
        if not story or not self.can_see_story(uid, story):
            raise _err("not_found", "That story has gone")
        st = next((x for x in story.get("stickers") or [] if x["id"] == stid), None)
        if not st:
            raise _err("not_found", "That sticker has gone")
        name = self.m.entities.name(uid)
        if st["type"] == "poll" and vote is not None:
            if not 0 <= vote < len(st["options"]):
                raise _err("invalid_format", "Unknown answer")
            st["votes"][uid] = vote
        elif st["type"] == "question" and answer and uid != story["author"]:
            text = _str(answer, 200)
            st["answers"] = [a for a in st["answers"] if a["uid"] != uid] + [{"uid": uid, "text": text, "ts": _now()}]
            self._notify_plain({story["author"]}, "stories", f"{name} answered your question", text,
                               query=f"crow_story={sid}", tag=f"crow_feed_story_{sid}", why="story")
        else:
            raise _err("invalid_format", "That sticker can't be answered")
        self.save()
        self.m._send_to(story["author"], {"type": "story", "story": self.story_view(story, story["author"])})
        return self.story_view(story, uid)

    def story_mentions_notify(self: "Feed", story: dict) -> None:
        who = {st["uid"] for st in story.get("stickers") or [] if st.get("type") == "mention"}
        if who:
            name = self.m.entities.name(story["author"])
            self._notify_plain(who, "stories", f"{name} mentioned you in their story", self._story_text(story),
                               query=f"crow_story={story['id']}", tag=f"crow_feed_story_{story['id']}", why="story")

    # ── Waves ───────────────────────────────────────────────────────────────
    def _waved_back(self: "Feed", who: str, uid: str, ts: int) -> bool:
        """Did `who` wave at `uid` after `uid` waved at them? (a wave back)"""
        theirs = (self.data["people"].get(who) or {}).get("waves") or []
        return any(w["from"] == uid and w["ts"] <= ts and ts - w["ts"] < 7 * 86_400_000 for w in theirs)

    def wave(self: "Feed", uid: str, other: str) -> dict:
        self._need("waves", "Waves")
        if other == uid or other not in self.household():
            raise _err("not_found", "That person isn't in the household")
        target = self.person(other)
        waves = target.setdefault("waves", [])
        last = max((w["ts"] for w in waves if w["from"] == uid), default=0)
        if _now() - last < WAVE_GAP_MS:
            raise _err("invalid_format", "You waved a moment ago")
        ts = _now()
        waves.append({"from": uid, "ts": ts})
        target["waves"] = waves[-50:]
        self.save()
        name = self.m.entities.name(uid)
        back = self._waved_back(uid, other, ts)
        self._notify_plain({other}, "waves", f"👋 {name} waved {'back' if back else 'at you'}", "Wave back from your Feed",
                           query=f"crow_profile={uid}", tag=f"crow_feed_wave_{uid}", why="wave", ref=uid)
        return {"waved": ts, "back": back}

    # ── Badges ──────────────────────────────────────────────────────────────
    def compute_badges(self: "Feed", start: int, end: int) -> list[dict]:
        """This week's badges, only from posts shared with everyone at home (nothing private counts)."""
        posts = [p for p in self.data["posts"].values() if p["audience"].get("type") == "everyone"
                 and p["author"] != HA_SENDER_ID and p.get("kind") not in ("birthday", "milestone", "review", "badges")]
        tally: dict[str, dict[str, int]] = {b: {} for b in BADGES}

        def bump(b: str, u: str, n: int = 1) -> None:
            if u and u != HA_SENDER_ID:
                tally[b][u] = tally[b].get(u, 0) + n

        for p in posts:
            in_week = start <= p["ts"] < end
            if in_week:
                photos = sum(1 for a in p.get("media", []) if ((self.m.data["attachments"].get(a) or {}).get("mime") or "").startswith("image/"))
                if photos:
                    bump("photographer", p["author"], photos)
                hour = dt_util.as_local(dt_util.utc_from_timestamp(p["ts"] / 1000)).hour
                if hour < 8 and hour >= 4:
                    bump("early", p["author"])
                if hour >= 22 or hour < 2:
                    bump("night", p["author"])
                if p.get("kind") == "event":
                    bump("planner", p["author"])
            for c in p.get("comments", []):
                if start <= c["ts"] < end and c["author"] != p["author"]:
                    bump("starter", p["author"])
            for u, ts in (p.get("reacted") or {}).items():
                if start <= ts < end and u != p["author"]:
                    bump("supporter", u)
            g = p.get("grabs") or {}
            if g.get("claimed_by") and start <= (g.get("claimed_ts") or 0) < end:
                bump("helpful", p["author"])
            for u, pl in ((p.get("fund") or {}).get("pledges") or {}).items():
                if start <= (pl.get("ts") or 0) < end:
                    bump("helpful", u)
        minimum = {"photographer": 3, "starter": 3, "supporter": 5}
        awards = []
        for b, counts in tally.items():
            if not counts:
                continue
            best = max(counts.values())
            if best < minimum.get(b, 2):
                continue
            winners = sorted(u for u, n in counts.items() if n == best)
            for u in winners[:2]:
                awards.append({"badge": b, "uid": u, "count": best})
        return awards

    async def async_weekly_badges(self: "Feed", now_dt=None, *, force: bool = False) -> dict | None:
        if not self.enabled() or not self.on("badges"):
            return None
        now_dt = now_dt or dt_util.now()
        week = now_dt.strftime("%G-W%V")
        if not force and self._done(f"badges:{week}"):
            return None
        end_dt = now_dt.replace(hour=23, minute=59, second=59, microsecond=0)
        end = int(end_dt.timestamp() * 1000)
        start = end - 7 * 86_400_000
        awards = self.compute_badges(start, end)
        by: dict[str, list[str]] = {}
        for a in awards:
            by.setdefault(a["uid"], []).append(a["badge"])
        self.data["badges"] = {"week": week, "by": by, "ts": _now()}
        self.save()
        if not awards:
            return None
        users = await self.m.async_user_map()
        lines = [f"{BADGES[a['badge']][0]} {BADGES[a['badge']][1]}: {users.get(a['uid'], {}).get('name', 'Someone')}"
                 for a in awards]
        return await self._async_auto_post("badges", "This week's badges 🏅\n" + "\n".join(lines), {"type": "everyone"},
                                           {"week": week, "awards": awards})

    @callback
    def _weekly(self: "Feed", now_dt=None) -> None:
        now_dt = now_dt or dt_util.now()
        if now_dt.weekday() == 6:
            self.hass.async_create_task(self.async_weekly_badges(now_dt))

    # ── Saved collections ───────────────────────────────────────────────────
    def collections_view(self: "Feed", uid: str) -> list[dict]:
        p = self.person(uid)
        out = []
        for c in p.get("collections") or []:
            posts = [x for x in c["posts"] if x in self.data["posts"] and self.can_see(uid, self.data["posts"][x])]
            cover = None
            for pid in reversed(posts):
                media = [a for a in self.data["posts"][pid].get("media", [])
                         if ((self.m.data["attachments"].get(a) or {}).get("mime") or "").startswith("image/")]
                if media:
                    cover = self._att_view(media[0])
                    break
            out.append({"id": c["id"], "name": c["name"], "count": len(posts), "cover": cover, "posts": posts})
        return out

    def collection_save(self: "Feed", uid: str, raw: dict) -> dict:
        self._need("collections", "Saved collections")
        cols = self.person(uid).setdefault("collections", [])
        c = next((x for x in cols if x["id"] == raw.get("collection_id")), None) if raw.get("collection_id") else None
        if raw.get("delete"):
            if c:
                cols.remove(c)
        else:
            name = _str(raw.get("name"), 40)
            if not name:
                raise _err("invalid_format", "Give the collection a name")
            if c:
                c["name"] = name
            else:
                if len(cols) >= MAX_COLLECTIONS:
                    raise _err("invalid_format", f"You can have up to {MAX_COLLECTIONS} collections")
                c = {"id": _id(), "name": name, "posts": []}
                cols.append(c)
        self.save()
        return {"collections": self.collections_view(uid), "collection_id": c["id"] if c and not raw.get("delete") else None}

    def collection_post(self: "Feed", uid: str, col_id: str, pid: str, on: bool) -> dict:
        self._need("collections", "Saved collections")
        self._post(uid, pid)
        c = next((x for x in self.person(uid).get("collections") or [] if x["id"] == col_id), None)
        if not c:
            raise _err("not_found", "That collection has gone")
        if on:
            if pid not in c["posts"]:
                c["posts"].append(pid)
            self.save_post(uid, pid, True)   # in a collection means saved
        else:
            c["posts"] = [x for x in c["posts"] if x != pid]
        self.save()
        return {"collections": self.collections_view(uid)}

    def forget_post_more(self: "Feed", post: dict) -> None:
        """A post deleted: out of featured photos, collections and the original's share count."""
        orig = self.data["posts"].get(post.get("shared") or "")
        if orig:
            orig["shared_by"] = [x for x in orig.get("shared_by", []) if x != post["id"]]
        media = set(post.get("media", []))
        for p in self.data["people"].values():
            if p.get("featured"):
                p["featured"] = [a for a in p["featured"] if a not in media]
            for c in p.get("collections") or []:
                c["posts"] = [x for x in c["posts"] if x != post["id"]]
