"""AI in the Feed: the same AI Task as the rest of Crow Messenger, with the same rules.

Each feature is switched on separately (Household → AI → Feed) and only works when AI Features are on.
The AI only ever sees posts, comments and photos the person using the feature can already see, and only
when they tap something - except Photo Search, which describes each new photo once when it's posted
(its own switch, off until an administrator turns it on).

* writing   - Writing Tools on New Post and comments (Proofread, Friendlier, Shorter, Formal, Casual)
* captions  - Suggest a Caption from the photos being posted
* comments  - suggested comments under a post
* smart     - "Make It an Event" / "Make It a Poll" from what's being written
* albums    - Suggest a Name for an album
* catchup   - What Did I Miss? at the top of the Feed
* threads   - Catch Up on a post with a lot of comments
* translate - Translate a post or a comment
* photos    - describe a photo
* search    - search photos by what's in them (descriptions made once, when posted)
* memories  - a caption for On This Day (and the Year in Review post)
* kindness  - a gentle "this might come across as harsh" before posting
* ask       - Ask the Feed a question
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from . import ai
from .const import DOMAIN, HA_SENDER_ID
from .manager import MessengerError

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

# the AI features' keys in the household settings (ai.features), and whether each starts on
FEED_FEATURES = {"feed_writing": True, "feed_captions": True, "feed_comments": True, "feed_smart": True,
                 "feed_albums": True, "feed_catchup": True, "feed_threads": True, "feed_translate": True,
                 "feed_photos": True, "feed_search": False, "feed_memories": True, "feed_kindness": True,
                 "feed_ask": True}
ACTION_FEATURE = {"rewrite": "feed_writing", "caption": "feed_captions", "comments": "feed_comments",
                  "detect": "feed_smart", "album_name": "feed_albums", "catchup": "feed_catchup",
                  "thread": "feed_threads", "translate": "feed_translate", "describe": "feed_photos",
                  "search": "feed_search", "memory": "feed_memories", "kindness": "feed_kindness", "ask": "feed_ask"}
MAX_PHOTOS = 4


def _when(ts: int) -> str:
    return dt_util.as_local(datetime.fromtimestamp(ts / 1000, dt_util.UTC)).strftime("%a %d %b %H:%M")


def _att(aid: str, mime: str | None) -> dict:
    return {"media_content_id": f"media-source://{DOMAIN}/{aid}", "media_content_type": mime or "image/jpeg"}


def _photos(m: "Messenger", aids: list[str]) -> list[dict]:
    """Photos to show the AI - none when the chosen AI can't look at photos."""
    if not ai.task_supports_photos(m.hass, ai.task_entity(m.hass, m)):
        return []
    out = []
    for aid in aids:
        att = m.data["attachments"].get(aid) or {}
        if att and not att.get("removed") and (att.get("mime") or "").startswith("image/"):
            out.append(_att(aid, att.get("mime")))
        if len(out) >= MAX_PHOTOS:
            break
    return out


def _post_line(m: "Messenger", p: dict, names: dict, uid: str, comments: int = 3) -> str:
    who = "Me" if p["author"] == uid else names.get(p["author"], "Someone")
    kind = p.get("kind", "post")
    bits = [p.get("text") or ""]
    if kind == "event" and p.get("event"):
        ev = p["event"]
        bits.append(f"[Event: {ev.get('title', '')} at {_when(ev.get('start') or p['ts'])}"
                    + (f", {ev['location']}" if ev.get("location") else "") + "]")
    elif kind == "poll" and p.get("poll"):
        bits.append("[Poll: " + " / ".join(o.get("text", "") for o in p["poll"].get("options", [])) + "]")
    elif kind == "fund" and p.get("fund"):
        bits.append(f"[Chip In: {p['fund'].get('title', '')}]")
    elif kind == "grabs":
        bits.append("[Up for grabs]")
    n = len(p.get("media", []))
    if n:
        descs = [(m.data["attachments"].get(a) or {}).get("ai_description") for a in p["media"]]
        descs = [d for d in descs if d]
        bits.append(f"[{n} photo(s)/video(s)" + (": " + "; ".join(descs[:2]) if descs else "") + "]")
    line = f"{_when(p['ts'])} {who}: {' '.join(b for b in bits if b).strip()}"
    cs = [c for c in p.get("comments", []) if c.get("text")][-comments:] if comments else []
    for c in cs:
        line += f"\n   ↳ {('Me' if c['author'] == uid else names.get(c['author'], 'Someone'))}: {c['text'][:200]}"
    return line


async def _visible(m: "Messenger", uid: str, *, since: int | None = None, limit: int = 60) -> list[dict]:
    f = m.feed
    posts = [p for p in f.data["posts"].values() if not p.get("scheduled_at") and f.can_see(uid, p)
             and (since is None or p["ts"] > since)]
    posts.sort(key=lambda p: p["ts"], reverse=True)
    return posts[:limit]


# ── each feature ─────────────────────────────────────────────────────────────
async def caption(hass: "HomeAssistant", m: "Messenger", uid: str, media: list[str], text: str = "") -> list[str]:
    """Three caption ideas from photos that are being posted (the person's own uploads)."""
    mine = [a for a in media if (m.data["attachments"].get(a) or {}).get("uploader") == uid]
    atts = _photos(m, mine)
    if not atts:
        raise MessengerError("invalid_format", "Add a photo first")
    pending = m.__dict__.setdefault("_ai_pending", set())
    pending.update(mine)
    try:
        answer = await ai._task(hass, m, "Crow Messenger Feed caption", (  # noqa: SLF001
            "These photos are about to be posted to a private family feed at home. Suggest three short, warm "
            "captions (at most 12 words each), different in tone: one simple, one fun, one heartfelt. Use the "
            "language of any words already written. No hashtags. Reply with only a JSON array of three strings."
            + (f"\nAlready written: {text[:300]}" if text else "")), attachments=atts)
    finally:
        pending.difference_update(mine)
    data = ai._json(answer)  # noqa: SLF001
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return [ai._clean(str(x))[:200] for x in data if str(x).strip()][:3]  # noqa: SLF001


async def comments(hass, m: "Messenger", uid: str, pid: str) -> list[str]:
    p = m.feed._post(uid, pid)  # noqa: SLF001 - the privacy check
    names = await ai._names(m)  # noqa: SLF001
    answer = await ai._task(hass, m, "Crow Messenger suggested comments", (  # noqa: SLF001
        "Here's a post on a private family feed, with its latest comments. Suggest three short comments \"Me\" "
        "could add - natural, kind, different from each other, at most 10 words, in the same language as the "
        "post. An emoji is fine if it fits. Reply with only a JSON array of three strings.\n\n"
        + _post_line(m, p, names, uid, comments=6)), attachments=_photos(m, p.get("media", [])) or None)
    data = ai._json(answer)  # noqa: SLF001
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return [ai._clean(str(x))[:150] for x in data if str(x).strip()][:3]  # noqa: SLF001


async def detect(hass, m: "Messenger", uid: str, text: str) -> dict:
    """Is what's being written really an event or a poll? (the card only asks when it looks likely)"""
    text = (text or "").strip()[:800]
    if len(text) < 8:
        return {"kind": None}
    answer = await ai._task(hass, m, "Crow Messenger make it an event", (  # noqa: SLF001
        f"{ai._now_line(hass)} Someone is writing a post for a private family feed:\n\"{text}\"\n\n"  # noqa: SLF001
        "If it's announcing something happening at a particular time (a party, a BBQ, a visit, an appointment), "
        "reply with JSON like {\"kind\": \"event\", \"event\": {\"title\": \"BBQ in the garden\", "
        "\"start\": \"2026-10-31T14:00\", \"end\": null, \"all_day\": false, \"location\": \"\"}} using local times "
        "(a date only with all_day true if there's no time). If it's asking the household to choose between "
        "options, reply with {\"kind\": \"poll\", \"poll\": {\"question\": \"Takeaway on Friday?\", \"options\": "
        "[\"Pizza\", \"Curry\"]}}. Otherwise reply {\"kind\": null}. Reply with only JSON."))
    data = ai._json(answer)  # noqa: SLF001
    if not isinstance(data, dict) or data.get("kind") not in ("event", "poll"):
        return {"kind": None}
    if data["kind"] == "event":
        ev = data.get("event") or {}
        if not ev.get("start"):
            return {"kind": None}
        return {"kind": "event", "event": {"title": str(ev.get("title") or "")[:120], "start": str(ev["start"]),
                                           "end": ev.get("end"), "all_day": bool(ev.get("all_day")),
                                           "location": str(ev.get("location") or "")[:120]}}
    poll = data.get("poll") or {}
    opts = [str(o)[:80] for o in (poll.get("options") or []) if str(o).strip()][:10]
    if len(opts) < 2:
        return {"kind": None}
    return {"kind": "poll", "poll": {"question": str(poll.get("question") or text)[:300], "options": opts}}


async def album_name(hass, m: "Messenger", uid: str, album_id: str) -> list[str]:
    f = m.feed
    album = f.data["albums"].get(album_id)
    if not album or not f.can_see_album(uid, album):
        raise MessengerError("not_found", "Album not found")
    posts = [p for p in f.data["posts"].values() if p.get("album") == album_id and f.can_see(uid, p)]
    aids = [a for p in sorted(posts, key=lambda p: p["ts"], reverse=True) for a in p.get("media", [])]
    atts = _photos(m, aids)
    if not atts:
        raise MessengerError("invalid_format", "Add some photos to the album first")
    answer = await ai._task(hass, m, "Crow Messenger album name", (  # noqa: SLF001
        f"{ai._now_line(hass)} These photos are in a family album. Suggest three short album names (2 to 5 words), "  # noqa: SLF001
        "like \"Summer at the Beach 2026\". Reply with only a JSON array of three strings."), attachments=atts)
    data = ai._json(answer)  # noqa: SLF001
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return [ai._clean(str(x))[:80] for x in data if str(x).strip()][:3]  # noqa: SLF001


async def catchup(hass, m: "Messenger", uid: str, since: int) -> dict:
    posts = [p for p in await _visible(m, uid, since=since, limit=40) if p["author"] != uid]
    if not posts:
        return {"summary": "You’re all caught up — nothing new since you last looked.", "posts": []}
    names = await ai._names(m)  # noqa: SLF001
    refs = list(reversed(posts))
    lines = "\n".join(f"#{i + 1} {_post_line(m, p, names, uid, comments=2)}" for i, p in enumerate(refs))
    answer = await ai._task(hass, m, "Crow Messenger Feed catch up", (  # noqa: SLF001
        f"{ai._now_line(hass)} These are the posts on a private family feed that \"Me\" hasn't seen yet. "  # noqa: SLF001
        "Sum them up in two or three short, friendly sentences: who posted what, and any plans, events or "
        "questions for me. Reply with only JSON like {\"summary\": \"...\", \"posts\": [3, 1]} where posts are the "
        "numbers of up to four posts worth opening, most important first.\n\n" + lines))
    data = ai._json(answer)  # noqa: SLF001
    if not isinstance(data, dict):
        raise MessengerError("ai_failed", ai.FRIENDLY["garbled"])
    picked = []
    for n in data.get("posts") or []:
        try:
            i = int(str(n).lstrip("#")) - 1
        except (TypeError, ValueError):
            continue
        if 0 <= i < len(refs) and refs[i]["id"] not in picked:
            picked.append(refs[i]["id"])
    return {"summary": ai._clean(str(data.get("summary") or "")), "posts": picked[:4]}  # noqa: SLF001


async def thread(hass, m: "Messenger", uid: str, pid: str) -> str:
    p = m.feed._post(uid, pid)  # noqa: SLF001
    names = await ai._names(m)  # noqa: SLF001
    if len([c for c in p.get("comments", []) if c.get("text")]) < 3:
        raise MessengerError("invalid_format", "There aren’t enough comments to sum up yet")
    answer = await ai._task(hass, m, "Crow Messenger comments catch up", (  # noqa: SLF001
        "Sum up this post's comments on a private family feed in one or two short sentences for \"Me\": what "
        "people think, who's coming or doing what, and anything decided. Reply with only the summary.\n\n"
        + _post_line(m, p, names, uid, comments=60)))
    return ai._clean(answer)  # noqa: SLF001


async def translate(hass, m: "Messenger", uid: str, pid: str, cid: str | None, language: str) -> str:
    p = m.feed._post(uid, pid)  # noqa: SLF001
    text = p.get("text") or ""
    if cid:
        c = next((x for x in p.get("comments", []) if x["id"] == cid), None)
        if not c:
            raise MessengerError("not_found", "Comment not found")
        text = c.get("text") or ""
    if not text.strip():
        raise MessengerError("invalid_format", "There's no text to translate")
    language = re.sub(r"[^\w\- ()]", "", language or "", flags=re.UNICODE)[:60].strip() or hass.config.language
    answer = await ai._task(hass, m, "Crow Messenger translate post", (  # noqa: SLF001
        f"Translate this into {language}. If it's already in that language, return it unchanged. "
        "Reply with only the translation.\n\n" + text[:4000]))
    return ai._clean(answer)  # noqa: SLF001


async def _describe(hass, m: "Messenger", aid: str) -> str:
    att = m.data["attachments"].get(aid) or {}
    if att.get("ai_description"):
        return att["ai_description"]
    answer = await ai._task(hass, m, "Crow Messenger describe photo", (  # noqa: SLF001
        "Describe this photo in one or two sentences for someone who can't see it. Mention any people, "
        "pets, text, places or things that stand out. Reply with only the description."),
        attachments=[_att(aid, att.get("mime"))])
    text = ai._clean(answer)[:600]  # noqa: SLF001
    att["ai_description"] = text
    m._save()  # noqa: SLF001
    return text


async def describe(hass, m: "Messenger", uid: str, pid: str, aid: str) -> str:
    p = m.feed._post(uid, pid)  # noqa: SLF001
    if aid not in p.get("media", []):
        raise MessengerError("not_found", "Photo not found")
    return await _describe(hass, m, aid)


async def describe_new(hass, m: "Messenger", post: dict) -> None:
    """Photo Search: each new photo is described once, when it's posted."""
    for aid in post.get("media", [])[:10]:
        att = m.data["attachments"].get(aid) or {}
        if (att.get("mime") or "").startswith("image/") and not att.get("ai_description"):
            try:
                await _describe(hass, m, aid)
            except Exception as err:  # noqa: BLE001 - search just won't find this one
                _LOGGER.debug("Crow Messenger couldn't describe a photo for search: %s", err)


def search(m: "Messenger", uid: str, q: str) -> dict:
    """Photos you can see whose description (or post) matches every word - no AI needed to look."""
    words = [w for w in re.findall(r"\w+", (q or "").lower()) if len(w) > 1]
    if not words:
        return {"items": []}
    f = m.feed
    items = []
    for p in f.data["posts"].values():
        if p.get("scheduled_at") or not f.can_see(uid, p):
            continue
        for aid in p.get("media", []):
            att = m.data["attachments"].get(aid) or {}
            if att.get("removed") or not (att.get("mime") or "").startswith(("image/", "video/")):
                continue
            hay = f"{att.get('ai_description') or ''} {p.get('text') or ''}".lower()
            if all(w in hay or w.rstrip("s") in hay for w in words):
                items.append({**f._att_view(aid), "post_id": p["id"], "author": p["author"], "ts": p["ts"],  # noqa: SLF001
                              "description": att.get("ai_description")})
    items.sort(key=lambda x: x["ts"], reverse=True)
    return {"items": items[:120]}


async def memory(hass, m: "Messenger", uid: str, pid: str) -> str:
    p = m.feed._post(uid, pid)  # noqa: SLF001
    names = await ai._names(m)  # noqa: SLF001
    years = max(1, dt_util.now().year - dt_util.as_local(datetime.fromtimestamp(p["ts"] / 1000, dt_util.UTC)).year)
    answer = await ai._task(hass, m, "Crow Messenger memory caption", (  # noqa: SLF001
        f"This post is from {years} year(s) ago today on a private family feed. Write one warm, short line (at most "
        "14 words) to show above it as a memory, like \"A year ago today: the first swim of summer 🌊\". "
        "Reply with only the line.\n\n" + _post_line(m, p, names, uid, comments=0)),
        attachments=_photos(m, p.get("media", [])) or None)
    return ai._clean(answer)[:200]  # noqa: SLF001


async def kindness(hass, m: "Messenger", text: str) -> dict:
    text = (text or "").strip()[:1500]
    if len(text) < 8:
        return {"unkind": False}
    answer = await ai._task(hass, m, "Crow Messenger kindness check", (  # noqa: SLF001
        "Someone is about to post this on a private family feed at home. Would most people find it unkind, "
        "hurtful, mocking or aggressive towards someone? Jokes and honest opinions are fine. Reply with only JSON "
        "like {\"unkind\": false} or {\"unkind\": true, \"why\": \"It could sound like a dig at person2.\"}.\n\n"
        + text))
    data = ai._json(answer)  # noqa: SLF001
    if not isinstance(data, dict):
        return {"unkind": False}
    return {"unkind": bool(data.get("unkind")), "why": ai._clean(str(data.get("why") or ""))[:200]}  # noqa: SLF001


async def ask(hass, m: "Messenger", uid: str, question: str) -> dict:
    question = (question or "").strip()
    if not question:
        raise MessengerError("invalid_format", "Type a question first")
    posts = list(reversed(await _visible(m, uid, limit=80)))
    if not posts:
        return {"answer": "There aren’t any posts shared with you to look through yet.", "posts": [], "found": False}
    names = await ai._names(m)  # noqa: SLF001
    lines, size, refs = [], 0, []
    for p in reversed(posts):
        line = _post_line(m, p, names, uid, comments=4)
        if size + len(line) > 50000:
            break
        size += len(line)
        lines.append(line)
        refs.append(p)
    lines.reverse(); refs.reverse()
    feed = "\n".join(f"#{i + 1} {ln}" for i, ln in enumerate(lines))
    answer = await ai._task(hass, m, "Crow Messenger ask the Feed", (  # noqa: SLF001
        f"{ai._now_line(hass)} Below are posts on a private family feed that \"Me\" can see, each starting with #number, "  # noqa: SLF001
        "when it was posted and who posted it, with some comments. Answer the question using only these posts, in "
        "one or two short sentences, giving exact details as written. If they don't answer it, say so plainly and "
        "don't guess. Reply with only JSON like {\"answer\": \"The BBQ is on Saturday at 2pm in the garden.\", "
        "\"posts\": [7], \"found\": true}.\n\n"
        f"Question: {question}\n\nPosts:\n{feed}"))
    data = ai._json(answer)  # noqa: SLF001
    if not isinstance(data, dict):
        raise MessengerError("ai_failed", ai.FRIENDLY["garbled"])
    picked = []
    for n in data.get("posts") or []:
        try:
            i = int(str(n).lstrip("#")) - 1
        except (TypeError, ValueError):
            continue
        if 0 <= i < len(refs) and refs[i]["id"] not in picked:
            picked.append(refs[i]["id"])
    found = data.get("found") is not False and bool(str(data.get("answer") or "").strip())
    return {"answer": ai._clean(str(data.get("answer") or "")) or "I couldn’t find that in the Feed.",  # noqa: SLF001
            "posts": [m.feed.post_view(m.feed.data["posts"][x], uid) for x in picked[:3]] if found else [],
            "found": found}


async def review_caption(hass, m: "Messenger", post: dict) -> None:
    """The Year in Review post gets a warm caption, when Memories is on (its photos are shared with everyone)."""
    try:
        atts = _photos(m, post.get("refs", []))
        answer = await ai._task(hass, m, "Crow Messenger year in review", (  # noqa: SLF001
            "These are a family's most-loved photos of the year. Write one warm sentence (at most 20 words) to go "
            "with them. Reply with only the sentence."), attachments=atts or None)
        line = ai._clean(answer)[:240]  # noqa: SLF001
        if line:
            post["text"] = f"{post.get('text', '')}\n\n{line}".strip()
            m.feed.save()
            m.feed.push(post)
    except Exception as err:  # noqa: BLE001 - the review is fine without it
        _LOGGER.debug("Crow Messenger couldn't caption the Year in Review: %s", err)


async def run(hass, m: "Messenger", uid: str, action: str, d: dict) -> Any:
    if action == "rewrite":
        return await ai.rewrite(hass, m, d.get("text", ""), d.get("style", ""))
    if action == "caption":
        return await caption(hass, m, uid, d.get("media") or [], d.get("text", ""))
    if action == "comments":
        return await comments(hass, m, uid, d.get("post_id", ""))
    if action == "detect":
        return await detect(hass, m, uid, d.get("text", ""))
    if action == "album_name":
        return await album_name(hass, m, uid, d.get("album_id", ""))
    if action == "catchup":
        return await catchup(hass, m, uid, int(d.get("since") or 0))
    if action == "thread":
        return await thread(hass, m, uid, d.get("post_id", ""))
    if action == "translate":
        return await translate(hass, m, uid, d.get("post_id", ""), d.get("comment_id"), d.get("language", ""))
    if action == "describe":
        return await describe(hass, m, uid, d.get("post_id", ""), d.get("media_id", ""))
    if action == "search":
        return search(m, uid, d.get("text", ""))
    if action == "memory":
        return await memory(hass, m, uid, d.get("post_id", ""))
    if action == "kindness":
        return await kindness(hass, m, d.get("text", ""))
    if action == "ask":
        return await ask(hass, m, uid, d.get("text", ""))
    raise MessengerError("invalid_format", "Unknown AI action")
