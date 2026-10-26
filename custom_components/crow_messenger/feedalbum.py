"""Make an Album (an AI feature in the Feed).

After a busy few days of photos - a weekend away, a birthday, a trip - the Feed offers to gather them into
an album, with a name the AI suggests from the photos. Only photos shared with everyone are gathered, so
the album can be shared with everyone too.

Everyone keeps their own photos: the person who makes the album has their own photos copied into it, and
everyone else who posted photos in those days is asked (once, at the top of their Feed) whether to add
theirs. The copies are only shown in the album, never as new posts in the Feed.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from . import ai
from .const import HA_SENDER_ID
from .manager import MessengerError

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

HOUR_MS = 3_600_000
DAY_MS = 24 * HOUR_MS
LOOK_BACK_DAYS = 21          # photos from the last three weeks
GAP_MS = 36 * HOUR_MS        # a quiet day and a half between photos starts a new set
MAX_SPAN_MS = 6 * DAY_MS     # a set covers a long weekend or a week away, not a month
MIN_PHOTOS = 10              # enough photos to be worth an album
SETTLE_MS = 6 * HOUR_MS      # the last photo was a while ago: it's over
MAX_PER_POST = 20            # photos in each of the album's own posts (as many as a post can hold)
MAX_PHOTOS_TO_AI = 4


def _now() -> int:
    return int(dt_util.utcnow().timestamp() * 1000)


def _day(ts: int) -> str:
    return dt_util.as_local(datetime.fromtimestamp(ts / 1000, dt_util.UTC)).strftime("%Y-%m-%d")


def _nice_day(ts: int) -> str:
    return dt_util.as_local(datetime.fromtimestamp(ts / 1000, dt_util.UTC)).strftime("%a %-d %b")


def _photos_of(m: "Messenger", post: dict) -> list[str]:
    out = []
    for aid in post.get("media", []):
        att = m.data["attachments"].get(aid) or {}
        if att and not att.get("removed") and (att.get("mime") or "").startswith("image/"):
            out.append(aid)
    return out


def _pool(m: "Messenger", uid: str, *, since: int | None = None) -> list[dict]:
    """Posts with photos that everyone can see, and this person can see, oldest first."""
    f = m.feed
    since = since if since is not None else _now() - LOOK_BACK_DAYS * DAY_MS
    out = []
    for p in f.data["posts"].values():
        if p["ts"] < since or p.get("album") or p.get("archived") or p.get("scheduled_at") or p.get("album_only"):
            continue
        if p.get("kind", "post") != "post" or p["author"] == HA_SENDER_ID or p["audience"].get("type") != "everyone":
            continue
        if not f.can_see(uid, p) or not _photos_of(m, p):
            continue
        out.append(p)
    out.sort(key=lambda p: p["ts"])
    return out


def _sets(posts: list[dict]) -> list[list[dict]]:
    """The posts in bursts: a new set after a quiet day and a half, or when a set gets too long."""
    sets: list[list[dict]] = []
    for p in posts:
        if sets and p["ts"] - sets[-1][-1]["ts"] <= GAP_MS and p["ts"] - sets[-1][0]["ts"] <= MAX_SPAN_MS:
            sets[-1].append(p)
        else:
            sets.append([p])
    return sets


def _key(posts: list[dict]) -> str:
    return _day(posts[0]["ts"])


def _state(m: "Messenger", uid: str) -> dict:
    p = m.feed.person(uid)
    st = p.setdefault("album_ai", {})
    st.setdefault("skipped", [])
    st.setdefault("made", {})
    st.setdefault("names", {})
    st.setdefault("invites", [])
    return st


def _find_set(m: "Messenger", uid: str, key: str) -> list[dict]:
    for s in _sets(_pool(m, uid)):
        if _key(s) == key:
            return s
    raise MessengerError("not_found", "Those photos aren’t there any more")


async def _names(hass: "HomeAssistant", m: "Messenger", posts: list[dict]) -> list[str]:
    """Three album names from the photos (or, with an AI that can't see photos, from what was written)."""
    from . import feedai
    aids = [a for p in posts for a in _photos_of(m, p)]
    step = max(1, len(aids) // MAX_PHOTOS_TO_AI)
    atts = feedai._photos(m, aids[::step][:MAX_PHOTOS_TO_AI])  # noqa: SLF001
    words = []
    for p in posts:
        bits = [p.get("text") or ""]
        place = (p.get("place") or {}).get("name")
        if place:
            bits.append(f"at {place}")
        if any(bits):
            words.append(" ".join(b for b in bits if b)[:160])
    first, last = posts[0]["ts"], posts[-1]["ts"]
    when = _nice_day(first) if _day(first) == _day(last) else f"{_nice_day(first)} to {_nice_day(last)}"
    answer = await ai._task(hass, m, "Crow Messenger make an album", (  # noqa: SLF001
        f"{ai._now_line(hass)} A family took these photos {when} and shared them on their private home feed. "  # noqa: SLF001
        "Suggest three short names for an album of them (2 to 5 words), like \"Weekend in Cornwall\" or "
        "\"Grandad's 70th\". Use the language of anything they wrote. Reply with only a JSON array of three strings."
        + ("\nWhat they wrote with the photos:\n" + "\n".join(words[:15]) if words else "")), attachments=atts or None)
    data = ai._json(answer)  # noqa: SLF001
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return [ai._clean(str(x))[:80] for x in data if str(x).strip()][:3]  # noqa: SLF001


def _summary(m: "Messenger", uid: str, posts: list[dict]) -> dict:
    f = m.feed
    aids = [(p, a) for p in posts for a in _photos_of(m, p)]
    people = list(dict.fromkeys(p["author"] for p in posts))
    cover = [a for _p, a in aids[::max(1, len(aids) // 4)]][:4]
    return {"key": _key(posts), "start": posts[0]["ts"], "end": posts[-1]["ts"], "count": len(aids),
            "mine": sum(1 for p, _a in aids if p["author"] == uid), "people": people,
            "cover": [f._att_view(a) for a in cover]}  # noqa: SLF001


async def suggest(hass: "HomeAssistant", m: "Messenger", uid: str) -> dict:
    """What to offer at the top of this person's Feed: albums others made with their photos in, and a set
    of photos worth an album (the most recent one they haven't made or said no to)."""
    f = m.feed
    st = _state(m, uid)
    invites = []
    for inv in list(st["invites"]):
        album = f.data["albums"].get(inv.get("album_id") or "")
        if not album or uid not in album.get("contributors", []):
            st["invites"].remove(inv)
            continue
        mine = [a for p in _pool(m, uid, since=inv["start"] - 1) if p["author"] == uid and p["ts"] <= inv["end"]
                for a in _photos_of(m, p)]
        if not mine:
            st["invites"].remove(inv)
            continue
        invites.append({"album_id": album["id"], "name": album["name"], "by": album["owner"], "count": len(mine)})
    offer = None
    now = _now()
    for s in reversed(_sets(_pool(m, uid))):
        key = _key(s)
        if key in st["skipped"] or key in st["made"]:
            continue
        if now - s[-1]["ts"] < SETTLE_MS:
            continue
        if sum(len(_photos_of(m, p)) for p in s) < MIN_PHOTOS:
            continue
        offer = _summary(m, uid, s)
        if key not in st["names"]:
            try:
                st["names"][key] = await _names(hass, m, s)
            except MessengerError as err:
                _LOGGER.debug("Make an Album: no names from the AI: %s", err)
                st["names"][key] = []
            # keep just the recent ones
            for old in sorted(st["names"])[:-6]:
                st["names"].pop(old, None)
        first, last = s[0]["ts"], s[-1]["ts"]
        fallback = f"Photos from {_nice_day(first)}" if _day(first) == _day(last) else f"{_nice_day(first)} – {_nice_day(last)}"
        offer["names"] = st["names"][key] or [fallback]
        break
    f.save()
    return {"offer": offer, "invites": invites}


async def _copy_in(m: "Messenger", uid: str, album_id: str, aids: list[str]) -> int:
    """Copies of this person's photos, in the album only (never as new posts in the Feed)."""
    f = m.feed
    copies = []
    for aid in aids:
        try:
            copies.append(await m.async_copy_attachment(uid, aid))
        except MessengerError as err:
            _LOGGER.debug("Make an Album: skipped a photo: %s", err)
    for i in range(0, len(copies), MAX_PER_POST):
        await f.async_create(uid, {"text": "", "media": copies[i:i + MAX_PER_POST], "album": album_id}, album_only=True)
    return len(copies)


async def make(hass: "HomeAssistant", m: "Messenger", uid: str, key: str, name: str) -> dict:
    f = m.feed
    posts = _find_set(m, uid, key)
    name = (name or "").strip()[:80]
    if not name:
        raise MessengerError("invalid_format", "Give the album a name")
    others = [a for a in dict.fromkeys(p["author"] for p in posts) if a != uid and a in f.household()]
    album = f.album_save(uid, {"name": name, "contributors": others, "audience": {"type": "everyone"}})
    mine = [a for p in posts if p["author"] == uid for a in _photos_of(m, p)]
    added = await _copy_in(m, uid, album["id"], mine) if mine else 0
    st = _state(m, uid)
    st["made"][key] = album["id"]
    st["names"].pop(key, None)
    # everyone else with photos in it is asked whether to add theirs
    for other in others:
        ost = _state(m, other)
        if not any(i.get("album_id") == album["id"] for i in ost["invites"]):
            ost["invites"].append({"album_id": album["id"], "start": posts[0]["ts"], "end": posts[-1]["ts"]})
        ost["made"][key] = album["id"]   # and they're not offered the same photos again
    f.save()
    if others:
        who = m.entities.name(uid)
        f._notify_plain(set(others), "groups", f"{who} made an album: {name}", "Add your photos to it",  # noqa: SLF001
                        query="crow_feed=home", tag=f"crow_feed_album_{album['id']}", why="album")
    f.push_albums()
    return {"album": f.album_view(f.data["albums"][album["id"]], uid), "added": added, "asked": len(others)}


async def join(hass: "HomeAssistant", m: "Messenger", uid: str, album_id: str, add: bool) -> dict:
    """Add your own photos from those days to an album someone made (or say no)."""
    f = m.feed
    st = _state(m, uid)
    inv = next((i for i in st["invites"] if i.get("album_id") == album_id), None)
    if not inv:
        raise MessengerError("not_found", "That’s already been done")
    st["invites"].remove(inv)
    added = 0
    if add:
        album = f.data["albums"].get(album_id)
        if not album or uid not in album.get("contributors", []):
            f.save()
            raise MessengerError("not_found", "That album has gone")
        mine = [a for p in _pool(m, uid, since=inv["start"] - 1) if p["author"] == uid and p["ts"] <= inv["end"]
                for a in _photos_of(m, p)]
        added = await _copy_in(m, uid, album_id, mine)
        f.push_albums()
    f.save()
    return {"added": added}


def skip(m: "Messenger", uid: str, key: str) -> dict:
    st = _state(m, uid)
    if key not in st["skipped"]:
        st["skipped"] = [*st["skipped"], key][-30:]
    st["names"].pop(key, None)
    m.feed.save()
    return {"ok": True}


async def run(hass: "HomeAssistant", m: "Messenger", uid: str, action: str, d: dict) -> Any:
    if action == "album_suggest":
        return await suggest(hass, m, uid)
    if action == "album_make":
        return await make(hass, m, uid, d.get("key", ""), d.get("text", ""))
    if action == "album_join":
        return await join(hass, m, uid, d.get("album_id", ""), bool(d.get("add", True)))
    if action == "album_skip":
        return skip(m, uid, d.get("key", ""))
    raise MessengerError("invalid_format", "Unknown AI action")
