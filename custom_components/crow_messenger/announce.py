"""Announce: say something out loud on the household's speakers (and, when an administrator
switches it on, on people's phones).

Everything happens here in Home Assistant rather than on the phone that asked, so music that was
paused carries on and volumes go back to how they were even if the phone is locked or the app is
closed straight after pressing Send. Who may announce is checked here too.

Music Assistant speakers use Music Assistant's own announcement (it pauses and resumes its music
itself). Every other speaker is paused, set to the announcement volume, spoken to with
text-to-speech, then put back.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant

from .const import DOMAIN, HA_SENDER_ID

if TYPE_CHECKING:  # pragma: no cover
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

MAX_TEXT = 300
HISTORY_RECENT = 10        # recent announcements kept (favourites are always kept)
HISTORY_FAVOURITES = 30
CHIME_FILE = "crow-chime.mp3"
CHIME_URL = f"/{DOMAIN}/{CHIME_FILE}"
CHIME_SECONDS = 1.8
# speakers that are really televisions or games consoles aren't offered
_NOT_SPEAKERS = ("_tv", "apple_tv", "samsung_tv", "lg_tv", "shield", "fire_tv", "playstation", "xbox", "roku", "this_device")

DEFAULTS = {
    "who": "everyone",         # everyone | admins | people
    "people": [],              # who may announce when who == "people"
    "tts": "",                 # "" (automatic), "entity:tts.x" or "service:tts.x_say"
    "hidden": [],              # speakers left out of the list
    "names": {},               # speaker -> a shorter name
    "volume": None,            # None keeps each speaker's volume; 1-100 sets it
    "pause": True,             # pause music while announcing, then carry on
    "chime": False,            # a chime before the words
    "phones": False,           # People: announce on phones too
}


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


def options(m: Messenger) -> dict:
    o = {**DEFAULTS, **(m.settings.get("announce") or {})}
    o["names"] = dict(o.get("names") or {})
    return o


def enabled(m: Messenger) -> bool:
    return m._feature("announce")


def allowed(m: Messenger, uid: str, is_admin: bool) -> bool:
    if not enabled(m) or uid == HA_SENDER_ID:
        return False
    o = options(m)
    if o["who"] == "admins":
        return is_admin
    if o["who"] == "people":
        return is_admin or uid in (o.get("people") or [])
    return True


def state_for(m: Messenger, uid: str, is_admin: bool) -> dict:
    """What the card needs to know to show Announce (sent with everything else when it starts)."""
    on = allowed(m, uid, is_admin)
    return {"enabled": enabled(m), "allowed": on, "phones": on and bool(options(m)["phones"])}


# ── Text-to-speech ───────────────────────────────────────────────────────────
def tts_choices(hass: HomeAssistant) -> list[dict]:
    """Every way Home Assistant can speak: its text-to-speech entities, and the older tts.*_say actions."""
    out = []
    for st in sorted(hass.states.async_all("tts"), key=lambda s: s.entity_id):
        if st.state == "unavailable":
            continue
        out.append({"value": f"entity:{st.entity_id}", "label": st.attributes.get("friendly_name") or st.entity_id})
    for svc in sorted((hass.services.async_services().get("tts") or {}).keys()):
        if svc in ("speak", "clear_cache", "reload"):
            continue
        out.append({"value": f"service:tts.{svc}", "label": f"tts.{svc}"})
    return out


def resolve_tts(hass: HomeAssistant, m: Messenger) -> dict | None:
    """The chosen way to speak while Home Assistant still has it, otherwise the best one there is."""
    want = str(options(m).get("tts") or "")
    services = hass.services.async_services().get("tts") or {}
    if want.startswith("entity:"):
        eid = want[7:]
        st = hass.states.get(eid)
        if st and st.state != "unavailable" and "speak" in services:
            return {"kind": "entity", "entity": eid, "label": st.attributes.get("friendly_name") or eid}
    elif want.startswith("service:tts."):
        svc = want[12:]
        if svc in services:
            return {"kind": "service", "service": svc, "label": f"tts.{svc}"}
    if "speak" in services:
        ents = [s for s in hass.states.async_all("tts") if s.state != "unavailable"]
        ents.sort(key=lambda s: (s.entity_id != "tts.home_assistant_cloud", s.entity_id))
        if ents:
            return {"kind": "entity", "entity": ents[0].entity_id,
                    "label": ents[0].attributes.get("friendly_name") or ents[0].entity_id}
    for svc in sorted(services):
        if svc not in ("speak", "clear_cache", "reload"):
            return {"kind": "service", "service": svc, "label": f"tts.{svc}"}
    return None


# ── Speakers ─────────────────────────────────────────────────────────────────
def _registry_info(hass: HomeAssistant) -> tuple[dict[str, str], set[str]]:
    """Each media player's room, and which ones belong to Music Assistant."""
    from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er
    areas = {a.id: a.name for a in ar.async_get(hass).async_list_areas()}
    devices = dr.async_get(hass)
    rooms: dict[str, str] = {}
    ma: set[str] = set()
    for e in er.async_get(hass).entities.values():
        if e.domain != "media_player":
            continue
        if e.platform == "music_assistant":
            ma.add(e.entity_id)
        area = e.area_id
        if not area and e.device_id:
            d = devices.async_get(e.device_id)
            area = d.area_id if d else None
        if area and area in areas:
            rooms[e.entity_id] = areas[area]
    return rooms, ma


def speakers(hass: HomeAssistant, m: Messenger, everything: bool = False) -> list[dict]:
    """The speakers people can announce on (everything=True: hidden ones too, for the editor)."""
    o = options(m)
    hidden = set(o.get("hidden") or [])
    names = o["names"]
    rooms, ma = _registry_info(hass)
    out = []
    for st in hass.states.async_all("media_player"):
        eid = st.entity_id
        if st.state in ("unavailable", "unknown") or not st.attributes.get("friendly_name"):
            continue
        if st.attributes.get("device_class") == "tv" or any(x in eid for x in _NOT_SPEAKERS):
            continue
        if str(st.attributes.get("friendly_name")).strip().lower() == "this device":
            continue
        if eid in hidden and not everything:
            continue
        vol = st.attributes.get("volume_level")
        out.append({"id": eid, "name": (names.get(eid) or st.attributes["friendly_name"]).strip(),
                    "ha_name": st.attributes["friendly_name"], "room": rooms.get(eid, ""),
                    "volume": round(vol * 100) if isinstance(vol, (int, float)) else None,
                    "ma": eid in ma, "hidden": eid in hidden})
    out.sort(key=lambda s: (s["room"] == "", s["room"].lower(), s["name"].lower()))
    return out


def chime_url(hass: HomeAssistant) -> str | None:
    """The chime's full address, as the speakers will fetch it."""
    from homeassistant.helpers.network import NoURLAvailableError, get_url
    try:
        return get_url(hass, prefer_external=False, allow_cloud=False) + CHIME_URL
    except NoURLAvailableError:
        try:
            return get_url(hass) + CHIME_URL
        except NoURLAvailableError:
            return None


# ── History (each person's own) ──────────────────────────────────────────────
def history(m: Messenger, uid: str) -> list[dict]:
    return list((m.data.setdefault("announce_history", {})).get(uid, []))


def _set_history(m: Messenger, uid: str, items: list[dict]) -> list[dict]:
    favs = [h for h in items if h.get("favourite")][:HISTORY_FAVOURITES]
    recent = [h for h in items if not h.get("favourite")][:HISTORY_RECENT]
    m.data.setdefault("announce_history", {})[uid] = favs + recent
    m._save()
    return favs + recent


def add_history(m: Messenger, uid: str, text: str) -> list[dict]:
    items = history(m, uid)
    old = next((h for h in items if h["text"].lower() == text.lower()), None)
    items = [h for h in items if h["text"].lower() != text.lower()]
    items.insert(0, {"text": text, "favourite": bool(old and old.get("favourite")), "ts": int(time.time() * 1000)})
    return _set_history(m, uid, items)


def edit_history(m: Messenger, uid: str, action: str, text: str) -> list[dict]:
    items = history(m, uid)
    if action == "delete":
        items = [h for h in items if h["text"] != text]
    elif action == "favourite":
        for h in items:
            if h["text"] == text:
                h["favourite"] = not h.get("favourite")
    elif action == "clear":
        items = [h for h in items if h.get("favourite")]
    return _set_history(m, uid, items)


# ── Announcing ───────────────────────────────────────────────────────────────
async def _call(hass: HomeAssistant, domain: str, service: str, data: dict, target: dict | None = None) -> bool:
    try:
        await hass.services.async_call(domain, service, data, target=target, blocking=True)
        return True
    except Exception as err:  # noqa: BLE001 - a speaker that's gone or can't do it shouldn't stop the rest
        _LOGGER.debug("Announce: %s.%s failed: %s", domain, service, err)
        return False


async def _speak(hass: HomeAssistant, tts: dict, eid: str, text: str) -> bool:
    if tts["kind"] == "entity":
        return await _call(hass, "tts", "speak", {"entity_id": tts["entity"], "media_player_entity_id": eid, "message": text})
    return await _call(hass, "tts", tts["service"], {"entity_id": eid, "message": text})


def _ma_fields(hass: HomeAssistant) -> set[str]:
    """What Music Assistant's announcement accepts (empty when it isn't installed)."""
    svc = (hass.services.async_services().get("music_assistant") or {}).get("play_announcement")
    if not svc:
        return set()
    keys: set[str] = set()

    def walk(s: Any, depth: int = 0) -> None:
        if s is None or depth > 4:
            return
        inner = getattr(s, "schema", None)
        if isinstance(inner, dict):
            for k in inner:
                keys.add(str(getattr(k, "schema", k)))
        elif inner is not None and inner is not s:
            walk(inner, depth + 1)
        for v in getattr(s, "validators", ()) or ():
            walk(v, depth + 1)

    try:
        walk(getattr(svc, "schema", None))
    except Exception:  # noqa: BLE001
        pass
    return keys or {"url"}


async def _run(hass: HomeAssistant, m: Messenger, text: str, targets: list[dict], volumes: dict[str, int],
               tts: dict | None) -> None:
    o = options(m)
    chime = bool(o.get("chime"))
    url = chime_url(hass) if chime else None
    default_vol = o.get("volume")
    ma_keys = _ma_fields(hass)
    ma_ok = "message" in ma_keys and tts is not None and tts["kind"] == "entity"

    def want_vol(eid: str) -> int | None:
        v = volumes.get(eid)
        if v is None and default_vol:
            v = default_vol
        return max(1, min(100, int(v))) if v is not None else None

    # Music Assistant speakers: Music Assistant pauses its music, announces, and carries on by itself
    ma_targets = [t for t in targets if t["ma"] and ma_ok]
    others = [t for t in targets if t not in ma_targets]
    for t in ma_targets:
        data: dict[str, Any] = {"message": text}
        if "tts_entity_id" in ma_keys:
            data["tts_entity_id"] = tts["entity"]
        if "use_pre_announce" in ma_keys:
            data["use_pre_announce"] = chime
        v = want_vol(t["id"])
        if v is not None and "announce_volume" in ma_keys:
            data["announce_volume"] = v
        if not await _call(hass, "music_assistant", "play_announcement", data, {"entity_id": t["id"]}):
            others.append(t)   # couldn't: announced the ordinary way instead
    if not others or tts is None:
        return

    saved: dict[str, dict] = {}
    for t in others:
        st = hass.states.get(t["id"])
        vol = st.attributes.get("volume_level") if st else None
        saved[t["id"]] = {"playing": bool(st and st.state == "playing" and o.get("pause", True)), "volume": vol}
    await asyncio.gather(*[_call(hass, "media_player", "media_pause", {}, {"entity_id": eid})
                           for eid, s in saved.items() if s["playing"]])
    changed = []
    for t in others:
        v = want_vol(t["id"])
        cur = saved[t["id"]]["volume"]
        if v is not None and (cur is None or abs(v / 100 - cur) > 0.01):
            if await _call(hass, "media_player", "volume_set", {"volume_level": v / 100}, {"entity_id": t["id"]}):
                changed.append(t["id"])
    await asyncio.sleep(1.2)   # let the music stop before speaking
    if url:
        await asyncio.gather(*[_call(hass, "media_player", "play_media",
                                     {"media_content_id": url, "media_content_type": "music"}, {"entity_id": t["id"]})
                               for t in others])
        await asyncio.sleep(CHIME_SECONDS)
    await asyncio.gather(*[_speak(hass, tts, t["id"], text) for t in others])
    # roughly how long it takes to say, then everything goes back
    await asyncio.sleep(max(4.0, len(text) * 0.08 + 3.0))
    for eid in changed:
        cur = saved[eid]["volume"]
        if cur is not None:
            await _call(hass, "media_player", "volume_set", {"volume_level": cur}, {"entity_id": eid})
    await asyncio.gather(*[_call(hass, "media_player", "media_play", {}, {"entity_id": eid})
                           for eid, s in saved.items() if s["playing"]])


async def _phones(hass: HomeAssistant, m: Messenger, sender: str, text: str, uids: list[str]) -> int:
    """People's phones: a critical alert on iPhone (sounds even on silent), and read aloud on Android."""
    from .notify import devices_for_user
    users = await m.async_user_map()
    who = "Home Assistant" if sender == HA_SENDER_ID else (users.get(sender, {}).get("name") or "Someone").split(" ")[0]
    title = f"📣 {who}"
    sent = 0
    for uid in dict.fromkeys(uids):
        # (your own phone too, when you've chosen yourself)
        if uid == HA_SENDER_ID or uid not in users:
            continue
        own = uid == sender
        for device in devices_for_user(hass, m, uid):
            if device["platform"] == "ios":
                data: dict[str, Any] = {"tag": f"crow_announce_{int(time.time())}",
                                        "push": {"sound": {"name": "default", "critical": 1, "volume": 1.0},
                                                 "interruption-level": "critical"}}
                calls = [{"title": title, "message": text, "data": data}]
            else:
                calls = [
                    # shown, on the alarm channel so it sounds even on silent
                    {"title": title, "message": text,
                     "data": {"channel": "alarm_stream", "importance": "high", "priority": "high", "ttl": 0,
                              "notification_icon": "mdi:bullhorn"}},
                    # and read aloud by the Home Assistant app
                    {"message": "TTS", "data": {"tts_text": text if own else f"{who} says: {text}", "media_stream": "alarm_stream_max",
                                                "priority": "high", "ttl": 0}},
                ]
            for c in calls:
                try:
                    await hass.services.async_call("notify", device["service"], c, blocking=False)
                except Exception as err:  # noqa: BLE001
                    _LOGGER.warning("Crow Messenger could not announce on %s: %s", device["service"], err)
            sent += 1
    return sent


async def async_announce(hass: HomeAssistant, m: Messenger, sender: str, text: str, speaker_ids: list[str],
                         volumes: dict[str, int] | None = None, people: list[str] | None = None,
                         keep: bool = True) -> dict:
    """Announce text on speakers (and phones). Returns at once; the speakers are looked after in
    the background until they've been put back."""
    text = " ".join((text or "").split())[:MAX_TEXT]
    if not text:
        raise _err("invalid_format", "Type something to announce")
    known = {s["id"]: s for s in speakers(hass, m, everything=sender == HA_SENDER_ID)}
    targets = [known[e] for e in dict.fromkeys(speaker_ids or []) if e in known]
    people = list(dict.fromkeys(people or [])) if options(m)["phones"] else []
    if not targets and not people:
        raise _err("invalid_format", "Choose where to announce")
    tts = resolve_tts(hass, m) if targets else None
    if targets and tts is None:
        raise _err("unavailable", "There’s no text-to-speech in Home Assistant to announce with")
    vols = {k: int(v) for k, v in (volumes or {}).items() if isinstance(v, (int, float))}
    if targets:
        hass.async_create_background_task(_run(hass, m, text, targets, vols, tts), f"{DOMAIN} announce")
    phones = await _phones(hass, m, sender, text, people) if people else 0
    out: dict[str, Any] = {"speakers": len(targets), "phones": phones}
    if keep and sender != HA_SENDER_ID:
        out["history"] = add_history(m, sender, text)
    hass.bus.async_fire(f"{DOMAIN}_announced", {"user_id": sender, "message": text,
                                                "speakers": [t["id"] for t in targets], "people": people})
    return out


IMPROVE = ("Rewrite this as a short, clear announcement to be read aloud by a speaker in a family home. "
           "Keep it friendly and natural to hear, keep the same meaning and language, and keep it under two sentences. "
           "Reply with only the announcement - no quotes, notes or explanation.\n\n")


async def async_improve(hass: HomeAssistant, m: Messenger, text: str) -> str:
    from . import ai
    text = (text or "").strip()[:MAX_TEXT]
    if not text:
        raise _err("invalid_format", "Type a message first")
    if not ai.capabilities(hass, m).get("announce"):
        raise _err("ai_unavailable", "AI Improve is switched off. An administrator can turn it on in the card editor’s AI settings.")
    return ai._clean(await ai._task(hass, m, "Crow Messenger announcement", IMPROVE + text))
