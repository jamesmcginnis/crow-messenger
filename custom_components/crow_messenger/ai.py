"""AI features for Crow Messenger.

Two kinds of AI are used, both set up in Home Assistant itself:

* the **conversation agent** (Assist, or an LLM agent) answers messages sent to
  the "Home Assistant" chat, and can control the home like Assist does;
* an **AI Task** entity does everything else - suggested replies, rewriting,
  summaries, translation, events/reminders, photo descriptions and answering
  questions about a chat (Ask). AI Tasks
  have no access to your devices, so a message that says "turn off the
  heating" can be translated or summarised without anything being switched off.

Nothing is sent to an AI unless an administrator has turned AI Features on
and someone uses a feature.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any

from homeassistant.core import Context, HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN, HA_SENDER_ID
from .manager import Messenger, MessengerError

_LOGGER = logging.getLogger(__name__)

AI_TIMEOUT = 90
FEATURES = ("assistant", "replies", "writing", "catchup", "translate", "actions", "photos", "ask")

REWRITE_STYLES = {
    "proofread": "Correct the spelling, grammar and punctuation. Keep the wording, meaning and tone the same.",
    "friendly": "Make it warmer and friendlier, keeping it natural and about the same length.",
    "shorter": "Make it shorter and clearer, keeping everything important.",
    "formal": "Make it more formal and polite, as for a message to someone you don't know well.",
    "casual": "Make it more relaxed and casual, like a text to family.",
}


def ai_settings(messenger: Messenger) -> dict:
    return messenger.settings.get("ai", {}) or {}


def feature_on(messenger: Messenger, feature: str) -> bool:
    ai = ai_settings(messenger)
    return bool(ai.get("enabled")) and (ai.get("features", {}) or {}).get(feature, True) is not False


def task_entity(hass: HomeAssistant, messenger: Messenger) -> str | None:
    """The AI Task entity to use: the one chosen in the editor, or Home Assistant's preferred one."""
    chosen = (ai_settings(messenger).get("task_entity") or "").strip()
    if chosen:
        return chosen if hass.states.get(chosen) else None
    try:
        from homeassistant.components.ai_task.const import DATA_PREFERENCES
        prefs = hass.data.get(DATA_PREFERENCES)
        return getattr(prefs, "gen_data_entity_id", None)
    except Exception:  # noqa: BLE001 - AI Task isn't set up
        return None


def task_supports_photos(hass: HomeAssistant, entity_id: str | None) -> bool:
    if not entity_id:
        return False
    state = hass.states.get(entity_id)
    feats = int((state.attributes.get("supported_features") if state else 0) or 0)
    return bool(feats & 2)  # AITaskEntityFeature.SUPPORT_ATTACHMENTS


def capabilities(hass: HomeAssistant, messenger: Messenger) -> dict:
    """What the card may offer: a feature is on only when it's switched on and can work."""
    ai = ai_settings(messenger)
    if not ai.get("enabled"):
        return {f: False for f in FEATURES}
    entity = task_entity(hass, messenger)
    out = {}
    for f in FEATURES:
        on = feature_on(messenger, f)
        if f == "assistant":
            out[f] = on
        elif f == "photos":
            out[f] = on and task_supports_photos(hass, entity)
        else:
            out[f] = on and bool(entity)
    return out


# ── Friendly error messages ──────────────────────────────────────────────────
# AI services fail in all sorts of ways (quota, keys, network, safety filters…)
# and their own messages are written for developers. People see one of these
# instead; the original is written to the Home Assistant log for whoever
# looks after the AI integration.
FRIENDLY = {
    "busy": "The AI is busy or has reached its usage limit right now. Try again in a little while.",
    "auth": "The AI service isn’t signed in properly. Whoever looks after Home Assistant can check the AI integration’s settings.",
    "offline": "Couldn’t reach the AI service. Check the internet connection and try again.",
    "slow": "The AI is taking too long to answer. Try again in a moment.",
    "refused": "The AI wouldn’t help with that one.",
    "model": "The AI model that’s been chosen isn’t available. Whoever looks after Home Assistant can pick another in the AI integration’s settings.",
    "too_long": "That’s too much for the AI to read in one go. Try again with less.",
    "no_photos": "This AI can’t look at photos. An administrator can choose one that can in the card’s AI settings.",
    "garbled": "The AI’s answer came back in a muddle. Try again.",
    "not_set_up": "AI Features aren’t set up yet. An administrator can choose an AI in the card’s AI settings.",
    "other": "The AI couldn’t do that just now. Try again in a moment.",
}
_PATTERNS = (
    ("busy", r"quota|rate.?limit|too many requests|\b429\b|insufficient|billing|credit|overloaded|capacity|resource.?exhausted|\b529\b|\b503\b"),
    ("auth", r"api.?key|unauthori[sz]ed|authenticat|\b401\b|\b403\b|permission|forbidden|invalid.?key|invalid.?token|token.*(expired|invalid|revoked)"),
    ("offline", r"connect|network|unreachable|resolve|dns|offline|ssl|certificate|timed out while connecting|cannot reach"),
    ("slow", r"timeout|timed out|deadline"),
    ("refused", r"safety|blocked|content.?polic|content.?filter|refus|harm|moderation|prohibited"),
    ("model", r"model.*(not found|does not exist|unknown|unsupported|deprecated)|\b404\b|no such model"),
    ("too_long", r"context.?length|too long|maximum.*tokens|token limit|too large|payload"),
    ("no_photos", r"attachment|image|vision|multimodal|mime"),
)


def friendly_ai_error(err: BaseException | str | None) -> str:
    """A plain-English message for whatever went wrong with the AI."""
    if isinstance(err, TimeoutError):
        return FRIENDLY["slow"]
    text = str(err or "").lower()
    for key, pattern in _PATTERNS:
        if re.search(pattern, text):
            return FRIENDLY[key]
    return FRIENDLY["other"]


# ── Asking the AI ────────────────────────────────────────────────────────────
async def _task(hass: HomeAssistant, messenger: Messenger, name: str, instructions: str,
                attachments: list[dict] | None = None) -> str:
    entity = task_entity(hass, messenger)
    if not entity:
        raise MessengerError("ai_unavailable", FRIENDLY["not_set_up"])
    try:
        from homeassistant.components.ai_task import async_generate_data
    except ImportError as err:
        raise MessengerError("ai_unavailable", FRIENDLY["not_set_up"]) from err
    try:
        async with asyncio.timeout(AI_TIMEOUT):
            result = await async_generate_data(hass, task_name=name, entity_id=entity,
                                               instructions=instructions, attachments=attachments)
    except TimeoutError as err:
        raise MessengerError("ai_failed", FRIENDLY["slow"]) from err
    except MessengerError:
        raise
    except Exception as err:  # noqa: BLE001 - providers raise all sorts
        _LOGGER.warning("Crow Messenger AI task %s failed: %s", name, err)
        raise MessengerError("ai_failed", friendly_ai_error(err)) from err
    data = result.data
    return data if isinstance(data, str) else json.dumps(data)


def _json(text: str) -> Any:
    """Read JSON from an AI answer, even when it's wrapped in ``` fences or prose."""
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S).strip()
    try:
        return json.loads(text)
    except ValueError:
        pass
    for open_, close in (("[", "]"), ("{", "}")):
        a, b = text.find(open_), text.rfind(close)
        if a != -1 and b > a:
            try:
                return json.loads(text[a:b + 1])
            except ValueError:
                continue
    raise MessengerError("ai_failed", FRIENDLY["garbled"])


def _clean(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"^```\w*\s*|\s*```$", "", text, flags=re.S).strip()
    if len(text) > 1 and text[0] == text[-1] and text[0] in "\"'“”":
        text = text[1:-1].strip()
    return text


async def _names(messenger: Messenger) -> dict:
    users = await messenger.async_user_map()
    return {uid: u.get("name", "Someone") for uid, u in users.items()}


def _now_line(hass: HomeAssistant) -> str:
    now = dt_util.now()
    return f"Today is {now.strftime('%A %d %B %Y')} and the time is {now.strftime('%H:%M')} ({hass.config.time_zone})."


def _transcript(messenger: Messenger, msgs: list[dict], names: dict, me: str) -> str:
    lines = []
    for m in msgs:
        if m.get("type") == "system":
            continue
        who = "Me" if m["sender"] == me else names.get(m["sender"], "Someone")
        text = (m.get("text") or "").strip()
        if not text and m.get("attachments"):
            text = f"[{len(m['attachments'])} attachment(s)]"
        if text:
            when = dt_util.as_local(datetime.fromtimestamp(m["ts"] / 1000, dt_util.UTC)).strftime("%a %H:%M")
            lines.append(f"[{when}] {who}: {text}")
    return "\n".join(lines)


def _message(messenger: Messenger, uid: str, thread_id: str, message_id: str) -> tuple[dict, dict]:
    thread = messenger._thread(uid, thread_id)  # noqa: SLF001 - same package
    msg = next((m for m in messenger._visible_messages(thread, uid) if m["id"] == message_id), None)  # noqa: SLF001
    if not msg:
        raise MessengerError("not_found", "Message not found")
    return thread, msg


async def suggest_replies(hass, messenger: Messenger, uid: str, thread_id: str) -> list[str]:
    thread = messenger._thread(uid, thread_id)  # noqa: SLF001
    msgs = messenger._visible_messages(thread, uid)[-12:]  # noqa: SLF001
    names = await _names(messenger)
    convo = _transcript(messenger, msgs, names, uid)
    if not convo:
        return []
    answer = await _task(hass, messenger, "Crow Messenger suggested replies", (
        "Here is the end of a private text conversation. Suggest three short replies that \"Me\" could "
        "send next. Each should be natural and different (for example yes / no / a question), at most "
        "8 words, in the same language as the conversation, with no emoji unless the conversation uses them.\n"
        "Reply with only a JSON array of three strings.\n\n" + convo))
    data = _json(answer)
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [])
    return [str(s).strip()[:120] for s in data if str(s).strip()][:3]


async def rewrite(hass, messenger: Messenger, text: str, style: str) -> str:
    if style not in REWRITE_STYLES:
        raise MessengerError("invalid_format", "Unknown writing style")
    text = (text or "").strip()
    if not text:
        raise MessengerError("invalid_format", "Nothing to rewrite")
    answer = await _task(hass, messenger, "Crow Messenger writing tools", (
        f"Rewrite this text message. {REWRITE_STYLES[style]} Keep the same language. "
        "Reply with only the rewritten message - no quotes, notes or explanation.\n\n" + text))
    return _clean(answer)


async def summarise(hass, messenger: Messenger, uid: str, thread_id: str, count: int) -> str:
    thread = messenger._thread(uid, thread_id)  # noqa: SLF001
    msgs = [m for m in messenger._visible_messages(thread, uid) if m.get("type") != "system"]  # noqa: SLF001
    msgs = msgs[-max(3, min(count + 6, 120)):]
    names = await _names(messenger)
    answer = await _task(hass, messenger, "Crow Messenger catch up", (
        f"Summarise the latest {count} messages of this conversation for \"Me\", who hasn't read them yet, "
        "in one to three short sentences. Say who said what and include any plans, times or questions for me. "
        "Earlier messages are only there for context. Reply with only the summary.\n\n"
        + _transcript(messenger, msgs, names, uid)))
    return _clean(answer)


async def translate(hass, messenger: Messenger, uid: str, thread_id: str, message_id: str, language: str) -> str:
    _thread, msg = _message(messenger, uid, thread_id, message_id)
    if not (msg.get("text") or "").strip():
        raise MessengerError("invalid_format", "There's no text to translate")
    language = re.sub(r"[^\w\- ()]", "", language or "", flags=re.UNICODE)[:60].strip() or hass.config.language
    answer = await _task(hass, messenger, "Crow Messenger translate", (
        f"Translate this message into {language}. If it's already in that language, return it unchanged. "
        "Reply with only the translation.\n\n" + msg["text"]))
    return _clean(answer)


async def extract(hass, messenger: Messenger, uid: str, thread_id: str, message_id: str, kind: str) -> dict:
    """Pull an event (for a calendar) or a reminder (for a to-do list) out of a message."""
    _thread, msg = _message(messenger, uid, thread_id, message_id)
    names = await _names(messenger)
    sent = dt_util.as_local(datetime.fromtimestamp(msg["ts"] / 1000, dt_util.UTC))
    who = "me" if msg["sender"] == uid else names.get(msg["sender"], "someone")
    base = (f"{_now_line(hass)} This message was sent by {who} on {sent.strftime('%A %d %B %Y at %H:%M')}; "
            "work out words like \"tomorrow\" or \"Friday\" from the day it was sent.\n\n"
            f"Message: {msg.get('text') or ''}\n\n")
    if kind == "event":
        answer = await _task(hass, messenger, "Crow Messenger add to calendar", base + (
            "Make a calendar event from it. Reply with only JSON like "
            "{\"title\": \"Boiler service\", \"start\": \"2026-10-17T09:00\", \"end\": \"2026-10-17T11:00\", "
            "\"all_day\": false, \"location\": \"\"}. Use local times. For an all-day event use dates only "
            "(\"2026-10-17\") and set all_day to true. If no time is given, make it all day. If there's no "
            "end, make it one hour after the start. The title should be short, like a calendar entry."))
    else:
        answer = await _task(hass, messenger, "Crow Messenger add reminder", base + (
            "Make a to-do reminder from it. Reply with only JSON like "
            "{\"title\": \"Put the parcel in the hall\", \"due\": \"2026-10-17\"}. "
            "due is a local date (\"2026-10-17\"), a date and time (\"2026-10-17T18:00\"), or null if none is "
            "mentioned. The title should be short and start with a verb."))
    data = _json(answer)
    if not isinstance(data, dict):
        raise MessengerError("ai_failed", FRIENDLY["garbled"])
    out = {k: data.get(k) for k in ("title", "start", "end", "all_day", "location", "due")}
    out["title"] = str(out.get("title") or "").strip()[:200]
    out["note"] = (msg.get("text") or "")[:1000]
    return out


ASK_MAX_MESSAGES = 800
ASK_MAX_CHARS = 60000


def _ask_line(messenger: Messenger, m: dict, names: dict, me: str) -> str:
    """One message as a line the AI can read, including what's in polls, events, places and files."""
    kind = m.get("type") or "text"
    text = (m.get("text") or "").strip()
    bits = [text] if text else []
    if kind == "poll":
        opts = [str(o.get("text") if isinstance(o, dict) else o) for o in ((m.get("poll") or {}).get("options") or [])]
        bits = [f"(poll) {text}" + (f" - options: {', '.join(opts)}" if opts else "")]
    elif kind == "event":
        ev = m.get("event") or {}
        when = ""
        if ev.get("start"):
            when = dt_util.as_local(datetime.fromtimestamp(ev["start"] / 1000, dt_util.UTC)).strftime("%a %d %b %Y %H:%M")
        bits = [f"(event) {text}" + (f" on {when}" if when else "") + (f" at {ev['location']}" if ev.get("location") else "")]
    elif kind == "location":
        bits = [f"(shared location) {(m.get('location') or {}).get('label') or 'a place'}"]
    elif kind == "checklist":
        items = [str(i.get("text") if isinstance(i, dict) else i) for i in ((m.get("checklist") or {}).get("items") or [])]
        bits = [f"(list) {text}" + (f": {', '.join(items)}" if items else "")]
    elif kind not in ("text", "system"):
        bits = [f"({kind}) {text}".strip()]
    for aid in m.get("attachments") or []:
        att = messenger.data["attachments"].get(aid) or {}
        if att.get("removed"):
            continue
        mime = att.get("mime") or ""
        what = "photo" if mime.startswith("image/") else "video" if mime.startswith("video/") else "audio" if mime.startswith("audio/") else "file"
        extra = att.get("ai_description") or att.get("caption") or (att.get("name") if what == "file" else "")
        bits.append(f"[{what}{': ' + str(extra)[:300] if extra else ''}]")
    body = " ".join(b for b in bits if b)
    if not body:
        return ""
    who = "Me" if m["sender"] == me else names.get(m["sender"], "Someone")
    when = dt_util.as_local(datetime.fromtimestamp(m["ts"] / 1000, dt_util.UTC)).strftime("%a %d %b %Y %H:%M")
    return f"{when} {who}: {body}"


async def ask(hass, messenger: Messenger, uid: str, thread_id: str, question: str) -> dict:
    """Answer a question about one conversation, pointing at the messages the answer came from."""
    question = (question or "").strip()
    if not question:
        raise MessengerError("invalid_format", "Type a question first")
    thread = messenger._thread(uid, thread_id)  # noqa: SLF001
    hidden = messenger._hidden(thread, uid)  # noqa: SLF001
    msgs = [m for m in messenger._visible_messages(thread, uid) if m.get("type") != "system"][-ASK_MAX_MESSAGES:]  # noqa: SLF001
    names = await _names(messenger)
    lines, refs, size = [], [], 0
    # newest first so the most recent messages always fit, then put back in order
    for m in reversed(msgs):
        line = _ask_line(messenger, m, names, uid)
        if not line:
            continue
        if size + len(line) > ASK_MAX_CHARS:
            break
        size += len(line) + 8
        refs.append(m)
        lines.append(line)
    refs.reverse(); lines.reverse()
    if not lines:
        return {"answer": "There aren’t any messages in this chat to look through yet.", "messages": [], "found": False}
    convo = "\n".join(f"#{i + 1} {line}" for i, line in enumerate(lines))
    answer = await _task(hass, messenger, "Crow Messenger ask this chat", (
        f"{_now_line(hass)} Below is a private text conversation; \"Me\" is the person asking. Each message starts with "
        "#number, then when it was sent and who sent it. Answer the question using only this conversation. "
        "Be brief: one or two short sentences, in the same language as the question, saying who said it and "
        "giving exact details (times, dates, places, numbers, passwords, names) as written. Work out words like "
        "\"tomorrow\" from the day the message was sent. If the conversation doesn't answer it, say so plainly "
        "and don't guess.\n"
        "Reply with only JSON like {\"answer\": \"person2 said the plumber's coming on Thursday at 10am.\", "
        "\"messages\": [12, 14], \"found\": true} where messages are the numbers of up to three messages the "
        "answer comes from (most relevant first), and found is false when the answer isn't in the conversation.\n\n"
        f"Question: {question}\n\nConversation:\n{convo}"))
    data = _json(answer)
    if not isinstance(data, dict):
        raise MessengerError("ai_failed", FRIENDLY["garbled"])
    picked = []
    for n in data.get("messages") or []:
        try:
            i = int(str(n).lstrip("#")) - 1
        except (TypeError, ValueError):
            continue
        if 0 <= i < len(refs) and refs[i] not in picked:
            picked.append(refs[i])
    found = data.get("found") is not False and bool(str(data.get("answer") or "").strip())
    return {
        "answer": _clean(str(data.get("answer") or "")) or "I couldn’t find that in this chat.",
        "messages": [messenger.message_view(m, hidden) for m in picked[:3]] if found else [],
        "found": found,
    }


async def describe_photo(hass, messenger: Messenger, uid: str, thread_id: str, aid: str) -> str:
    att = messenger.attachment_for(uid, aid)
    if att.get("thread_id") != thread_id or att.get("removed") or not (att.get("mime") or "").startswith("image/"):
        raise MessengerError("not_found", "Photo not found")
    if att.get("ai_description"):
        return att["ai_description"]
    answer = await _task(hass, messenger, "Crow Messenger describe photo", (
        "Describe this photo in one or two sentences for someone who can't see it. Mention any people, "
        "text, places or things that stand out. Reply with only the description."),
        attachments=[{"media_content_id": f"media-source://{DOMAIN}/{aid}", "media_content_type": att.get("mime")}])
    text = _clean(answer)
    att["ai_description"] = text
    messenger._save()  # noqa: SLF001
    return text


# ── The "Home Assistant" chat ───────────────────────────────────────────────
class Assistant:
    """Answers messages sent to Home Assistant with the conversation agent."""

    def __init__(self, hass: HomeAssistant, messenger: Messenger) -> None:
        self.hass = hass
        self.messenger = messenger
        self._conversations: dict[tuple[str, str], str] = {}

    async def async_on_message(self, thread: dict, msg: dict) -> None:
        if msg["sender"] == HA_SENDER_ID or msg.get("type") == "system":
            return
        if HA_SENDER_ID not in thread["participants"] or thread["is_group"]:
            return
        if not feature_on(self.messenger, "assistant"):
            return
        text = (msg.get("text") or "").strip()
        if not text:
            return
        self.hass.async_create_task(self._answer(thread["id"], msg["sender"], text))

    async def _answer(self, thread_id: str, uid: str, text: str) -> None:
        from homeassistant.components import conversation

        agent = (ai_settings(self.messenger).get("agent_id") or "").strip() or None
        key = (thread_id, uid)

        async def _keep_typing() -> None:
            while True:
                self.messenger.typing(HA_SENDER_ID, thread_id, True)
                await asyncio.sleep(4)

        typing = self.hass.async_create_task(_keep_typing())
        try:
            async with asyncio.timeout(AI_TIMEOUT):
                result = await conversation.async_converse(
                    self.hass, text, self._conversations.get(key), Context(user_id=uid),
                    language=self.hass.config.language, agent_id=agent)
            self._conversations[key] = result.conversation_id
            speech = (result.response.speech or {}).get("plain", {}).get("speech", "") or ""
            reply = speech.strip() or "Done."
            # an agent that failed says so in developer-speak: put it in plain words
            rtype = getattr(getattr(result.response, "response_type", None), "value", "")
            code = getattr(getattr(result.response, "error_code", None), "value", None)
            # Assist's own "I didn't understand" answers are fine as they are
            if rtype == "error" and code not in ("no_intent_match", "no_valid_targets", "no_valid_targets_for_query"):
                _LOGGER.warning("Crow Messenger: Home Assistant chat error: %s", reply)
                reply = friendly_ai_error(reply)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Crow Messenger: Home Assistant chat failed: %s", err)
            reply = friendly_ai_error(err)
        finally:
            typing.cancel()
            self.messenger.typing(HA_SENDER_ID, thread_id, False)
        try:
            await self.messenger.async_send(HA_SENDER_ID, thread_id, reply[:4000], [])
        except MessengerError as err:
            _LOGGER.warning("Crow Messenger: couldn't post Home Assistant's reply: %s", err)
