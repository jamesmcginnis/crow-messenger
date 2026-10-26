"""Extras: event invitations, voting buttons, buttons in automation
emails, Email Home Assistant, pinned emails, Send Later by place, read receipts.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any
from urllib.parse import quote

from homeassistant.core import Context, Event, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_PREFIX
from .manager import MailError, new_id, now_ms

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

EVENT_ACTION = f"{EVENT_PREFIX}_action"    # a button in an email from an automation was tapped
EVENT_VOTE = f"{EVENT_PREFIX}_vote"        # someone voted on an email with voting buttons
ACTION_DAYS = 14
POLL_RE = re.compile(r"\[vote ([a-z0-9]{8})\]", re.I)
HA_SUBJECT = re.compile(r"^\s*(?:ha|home assistant)\s*:\s*(.*)$", re.I)


# ── calendar invitations (iCalendar) ─────────────────────────────────────────
def _ics_escape(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n")


def _ics_fold(line: str) -> str:
    out, b = [], line.encode()
    while len(b) > 74:
        cut = 74
        while cut > 0 and (b[cut] & 0xC0) == 0x80:   # don't split a letter in two
            cut -= 1
        out.append(b[:cut].decode())
        b = b[cut:]
    out.append(b.decode())
    return "\r\n ".join(out)


def _ics_time(value: str, tz: str) -> tuple[str, bool]:
    """('20261101T093000Z', False) for a time, ('20261101', True) for a whole day."""
    value = (value or "").strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return value.replace("-", ""), True
    d = dt_util.parse_datetime(value)
    if d is None:
        raise MailError("invalid", "Choose when the event starts.")
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt_util.get_time_zone(tz) or dt_util.DEFAULT_TIME_ZONE)
    return dt_util.as_utc(d).strftime("%Y%m%dT%H%M%SZ"), False


def build_ics(method: str, ev: dict, organizer: dict, attendees: list[dict], tz: str, partstat: str | None = None) -> str:
    start, allday = _ics_time(ev.get("start", ""), tz)
    if ev.get("end"):
        end, _ = _ics_time(ev["end"], tz)
    elif allday:
        end = (datetime.strptime(start, "%Y%m%d") + timedelta(days=1)).strftime("%Y%m%d")
    else:
        end = (datetime.strptime(start, "%Y%m%dT%H%M%SZ") + timedelta(hours=1)).strftime("%Y%m%dT%H%M%SZ")
    val = ";VALUE=DATE" if allday else ""
    lines = ["BEGIN:VCALENDAR", "PRODID:-//Crow Messenger//Home Assistant//EN", "VERSION:2.0", "CALSCALE:GREGORIAN", f"METHOD:{method}",
             "BEGIN:VEVENT", f"UID:{ev.get('uid') or (new_id() + '@crow-email')}",
             f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
             f"DTSTART{val}:{start}", f"DTEND{val}:{end}", f"SEQUENCE:{int(ev.get('sequence') or 0)}",
             f"SUMMARY:{_ics_escape(ev.get('title') or 'Event')}"]
    if ev.get("location"):
        lines.append(f"LOCATION:{_ics_escape(ev['location'])}")
    if ev.get("description"):
        lines.append(f"DESCRIPTION:{_ics_escape(ev['description'])}")
    lines.append(f"ORGANIZER;CN={_ics_escape(organizer.get('name') or organizer['email'])}:mailto:{organizer['email']}")
    for p in attendees:
        ps = partstat or "NEEDS-ACTION"
        rsvp = "" if partstat else ";RSVP=TRUE"
        lines.append(f"ATTENDEE;CN={_ics_escape(p.get('name') or p['email'])};ROLE=REQ-PARTICIPANT;PARTSTAT={ps}{rsvp}:mailto:{p['email']}")
    lines += ["STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_ics_fold(x) for x in lines) + "\r\n"


def parse_ics(text: str, tz: str) -> dict | None:
    """The first event in an invitation, with its times in local time."""
    text = re.sub(r"\r?\n[ \t]", "", text or "")   # unfold
    if "BEGIN:VEVENT" not in text:
        return None
    method = (re.search(r"^METHOD:(.+)$", text, re.M) or [None, "PUBLISH"])[1].strip().upper()
    ev_text = text[text.index("BEGIN:VEVENT"):]
    ev_text = ev_text[:ev_text.index("END:VEVENT")] if "END:VEVENT" in ev_text else ev_text
    props: dict[str, tuple[dict, str]] = {}
    attendees = []
    for line in ev_text.splitlines():
        if ":" not in line:
            continue
        head, value = line.split(":", 1)
        name, *params = head.split(";")
        pdict = {}
        for p in params:
            if "=" in p:
                k, v = p.split("=", 1)
                pdict[k.upper()] = v.strip('"')
        name = name.upper()
        if name == "ATTENDEE":
            attendees.append({"email": re.sub(r"(?i)^mailto:", "", value).strip().lower(), "name": pdict.get("CN", ""),
                              "status": pdict.get("PARTSTAT", "NEEDS-ACTION")})
        elif name not in props:
            props[name] = (pdict, value)

    def unesc(s: str) -> str:
        return s.replace("\\n", "\n").replace("\\N", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")

    def when(key: str) -> tuple[str, bool]:
        if key not in props:
            return "", False
        params, value = props[key]
        value = value.strip()
        if params.get("VALUE") == "DATE" or re.match(r"^\d{8}$", value):
            return f"{value[:4]}-{value[4:6]}-{value[6:8]}", True
        m = re.match(r"^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$", value)
        if not m:
            return "", False
        d = datetime(*[int(x) for x in m.groups()[:6]])
        if m.group(7):
            d = d.replace(tzinfo=timezone.utc)
        else:
            d = d.replace(tzinfo=dt_util.get_time_zone(params.get("TZID", "")) or dt_util.get_time_zone(tz) or dt_util.DEFAULT_TIME_ZONE)
        local = d.astimezone(dt_util.get_time_zone(tz) or dt_util.DEFAULT_TIME_ZONE)
        return local.strftime("%Y-%m-%dT%H:%M"), False
    start, allday = when("DTSTART")
    end, _ = when("DTEND")
    org = props.get("ORGANIZER")
    return {
        "method": method, "uid": props.get("UID", ({}, ""))[1].strip(), "title": unesc(props.get("SUMMARY", ({}, ""))[1]),
        "location": unesc(props.get("LOCATION", ({}, ""))[1]), "description": unesc(props.get("DESCRIPTION", ({}, ""))[1])[:2000],
        "start": start, "end": end, "all_day": allday, "sequence": props.get("SEQUENCE", ({}, "0"))[1].strip(),
        "organizer": {"email": re.sub(r"(?i)^mailto:", "", org[1]).strip().lower(), "name": org[0].get("CN", "")} if org else None,
        "attendees": attendees[:50], "cancelled": method == "CANCEL" or props.get("STATUS", ({}, ""))[1].strip().upper() == "CANCELLED",
    }


class Extras:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        for key in ("polls", "pins", "acted", "receipts"):
            mailer.data.setdefault(key, {})
        self._place_unsub: dict[str, Any] = {}

    @property
    def data(self) -> dict:
        return self.mailer.data

    def unload(self) -> None:
        for u in self._place_unsub.values():
            u()
        self._place_unsub.clear()

    # ── what's added to an email as it's built ─────────────────────────────
    def decorate(self, a: "Account", p: dict, html: str) -> tuple[str, dict]:
        """Voting buttons and automation buttons go into the email; returns the html and what to remember."""
        extra: dict[str, Any] = {}
        poll = p.get("poll") or None
        if poll and poll.get("choices"):
            pid = secrets.token_hex(4)
            choices = [str(c).strip()[:80] for c in poll["choices"] if str(c).strip()][:8]
            q = str(poll.get("question") or p.get("subject") or "Vote").strip()[:200]
            me = a.acc["email"]
            subj = p.get("subject") or q
            btns = "".join(
                f'<a href="mailto:{me}?subject={quote(f"Vote: {c} [vote {pid}]")}&amp;body={quote("I vote " + c + chr(10) + chr(10) + "(Just tap Send.)")}" '
                f'style="display:inline-block;margin:4px 6px 4px 0;padding:10px 18px;border-radius:20px;background:#0A84FF;color:#fff;'
                f'text-decoration:none;font-weight:600;font-family:-apple-system,Helvetica,Arial,sans-serif">{_h(c)}</a>' for c in choices)
            html += (f'<div style="margin:18px 0;padding:14px 16px;border-radius:14px;border:1px solid #d0d0d6">'
                     f'<div style="font-weight:700;margin-bottom:8px">{_h(q)}</div>{btns}'
                     f'<div style="font-size:12px;color:#8e8e93;margin-top:8px">Tap a choice to vote: it opens a reply, then tap Send.</div></div>')
            extra["poll"] = {"id": pid, "question": q, "choices": choices, "subject": subj}
        inv = p.get("invite") or None
        if inv and inv.get("start"):
            when = _when_text(inv.get("start", ""), inv.get("end"))
            html += (f'<div style="margin:18px 0;padding:14px 16px;border-radius:14px;border:1px solid #d0d0d6;font-family:-apple-system,Helvetica,Arial,sans-serif">'
                     f'<div style="font-size:12px;font-weight:700;color:#FF3B30;text-transform:uppercase;letter-spacing:.04em">Invitation</div>'
                     f'<div style="font-size:17px;font-weight:700;margin:4px 0">{_h(inv.get("title") or "Event")}</div>'
                     f'<div style="color:#3c3c43">{_h(when)}</div>'
                     + (f'<div style="color:#3c3c43">{_h(inv["location"])}</div>' if inv.get("location") else "")
                     + (f'<div style="color:#8e8e93;margin-top:6px;white-space:pre-wrap">{_h(inv["description"])}</div>' if inv.get("description") else "")
                     + '<div style="font-size:12px;color:#8e8e93;margin-top:8px">Your mail app shows Accept, Maybe and Decline, or open invite.ics to add it to your calendar.</div></div>')
        buttons = p.get("buttons") or []
        if buttons:
            base = self.base_url()
            links = []
            for b in buttons[:6]:
                tok = self.sign_action({"a": str(b.get("action") or "")[:120], "t": str(b.get("title") or "OK")[:60],
                                        "s": (p.get("subject") or "")[:120], "n": secrets.token_hex(6),
                                        "x": int(time.time()) + ACTION_DAYS * 86400,
                                        "o": [x["email"] if isinstance(x, dict) else str(x) for x in (p.get("to") or [])][:5]})
                links.append(f'<a href="{base}/api/{DOMAIN}/act/{tok}" style="display:inline-block;margin:4px 6px 4px 0;padding:11px 20px;'
                             f'border-radius:22px;background:{_colour(b.get("colour"))};color:#fff;text-decoration:none;font-weight:600;'
                             f'font-family:-apple-system,Helvetica,Arial,sans-serif">{_h(str(b.get("title") or "OK"))}</a>')
            html += f'<div style="margin:18px 0">{"".join(links)}</div>'
        return html, extra

    def after_send(self, a: "Account", message_id: str, extra: dict) -> None:
        if extra.get("poll"):
            self.data["polls"][extra["poll"]["id"]] = {**extra["poll"], "account": a.id, "owner": a.acc["owner"],
                                                        "message_id": message_id, "votes": {}, "at": now_ms()}
            if len(self.data["polls"]) > 300:
                for k in sorted(self.data["polls"], key=lambda k: self.data["polls"][k]["at"])[:50]:
                    self.data["polls"].pop(k, None)
            self.mailer.save()

    def poll_for_message(self, message_id: str, uid: str) -> dict | None:
        for p in self.data["polls"].values():
            if p["message_id"] == message_id and p["owner"] == uid:
                return self._poll_view(p)
        return None

    def _poll_view(self, p: dict) -> dict:
        counts = {c: 0 for c in p["choices"]}
        for v in p["votes"].values():
            if v["choice"] in counts:
                counts[v["choice"]] += 1
        return {"id": p["id"], "question": p["question"], "choices": p["choices"], "counts": counts,
                "voters": [{"email": e, "name": v.get("name", ""), "choice": v["choice"]} for e, v in p["votes"].items()]}

    # ── new mail: votes, invitations from people, Email Home Assistant ──────
    async def async_new_mail(self, a: "Account", it: dict) -> bool:
        """True if the email was handled here (a vote), so it doesn't notify."""
        subject = it.get("subject") or ""
        m = POLL_RE.search(subject)
        if m and m.group(1).lower() in self.data["polls"]:
            p = self.data["polls"][m.group(1).lower()]
            if p["owner"] == a.acc["owner"]:
                choice = next((c for c in p["choices"] if subject.lower().startswith(f"vote: {c.lower()} [")), None)
                if choice:
                    frm = (it.get("from") or [{}])[0]
                    p["votes"][(frm.get("email") or "").lower()] = {"choice": choice, "name": frm.get("name") or "", "at": now_ms()}
                    self.mailer.save()
                    try:
                        await a.async_flag("INBOX", [it["uid"]], "seen", True)
                    except MailError:
                        pass
                    self.hass.bus.async_fire(EVENT_VOTE, {"account": a.acc["email"], "account_id": a.id, "question": p["question"],
                                                          "choice": choice, "from_email": frm.get("email", ""),
                                                          "counts": self._poll_view(p)["counts"]})
                    self.mailer.send_to(a.acc["owner"], {"type": "poll", "poll": self._poll_view(p), "message_id": p["message_id"]})
                    return True
        mh = HA_SUBJECT.match(subject)
        if mh and self.ha_email_on():
            frm = (it.get("from") or [{}])[0].get("email", "").lower()
            mine = {x.acc["email"].lower() for x in self.mailer.accounts.values() if x.acc["owner"] == a.acc["owner"]}
            if frm in mine:
                self.hass.async_create_task(self.async_email_ha(a, it, mh.group(1)))
                return True
        return False

    # ── Email Home Assistant ───────────────────────────────────────────────
    def ha_email_on(self) -> bool:
        return bool((self.mailer.settings.get("email_ha") or {}).get("enabled"))

    async def async_email_ha(self, a: "Account", it: dict, subject_text: str) -> None:
        """An email to yourself with a subject starting "HA:" goes to Assist, and the answer comes back by email."""
        try:
            raw = await a.async_raw("INBOX", it["uid"])
        except MailError:
            return
        import email as _email
        msg = _email.message_from_bytes(raw)
        auth = " ".join(str(v) for v in msg.get_all("Authentication-Results") or []).lower()
        if auth and not re.search(r"\b(dmarc|dkim|spf)=pass\b", auth):
            _LOGGER.warning("Crow Messenger Email ignored an HA: email that couldn't be confirmed as yours (%s)", it.get("subject"))
            return
        from .mailparse import parse_message
        parsed = await self.hass.async_add_executor_job(parse_message, raw)
        body = (parsed.get("text") or "").strip().split("\n\n")[0][:500]
        question = (subject_text.strip() or body).strip()
        if subject_text.strip() and body and len(body) < 300 and not body.lower().startswith(("sent from", "--")):
            question = f"{subject_text.strip()} {body}".strip() if body.lower() not in subject_text.lower() else subject_text.strip()
        if not question:
            return
        from homeassistant.components import conversation
        try:
            res = await conversation.async_converse(self.hass, question, None, Context(user_id=a.acc["owner"]), None,
                                                    (self.mailer.settings.get("email_ha") or {}).get("agent") or None)
            answer = res.response.speech.get("plain", {}).get("speech") or "Done."
        except Exception as err:  # noqa: BLE001
            answer = f"Home Assistant couldn't do that: {err}"
        try:
            await a.async_flag("INBOX", [it["uid"]], "seen", True)
        except MailError:
            pass
        from .mailparse import text_to_html
        await self.mailer.async_send(a.acc["owner"], a.id, {
            "to": [{"email": a.acc["email"], "name": a.acc.get("from_name") or ""}],
            "subject": f"Re: {it.get('subject') or 'HA'}", "html": text_to_html(answer),
            "reply": {"mode": "reply", "folder": "INBOX", "uid": it["uid"]}, "quote": True})

    # ── buttons in emails from automations ──────────────────────────────────
    def base_url(self) -> str:
        from homeassistant.helpers.network import NoURLAvailableError, get_url
        try:
            return get_url(self.hass, prefer_external=True, allow_cloud=True)
        except NoURLAvailableError:
            return ""

    def sign_action(self, payload: dict) -> str:
        tok = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
        sig = hmac.new(self.data["secret"].encode(), b"act:" + tok.encode(), hashlib.sha256).hexdigest()[:32]
        return f"{tok}.{sig}"

    def check_action(self, token: str) -> dict | None:
        try:
            tok, sig = token.rsplit(".", 1)
            good = hmac.new(self.data["secret"].encode(), b"act:" + tok.encode(), hashlib.sha256).hexdigest()[:32]
            if not hmac.compare_digest(good, sig):
                return None
            d = json.loads(base64.urlsafe_b64decode(tok + "=" * (-len(tok) % 4)))
        except (ValueError, TypeError):
            return None
        return d if d.get("x", 0) > time.time() else None

    def use_action(self, d: dict) -> bool:
        """Each button works once: a second tap (or a link checker) does nothing."""
        if d["n"] in self.data["acted"]:
            return False
        self.data["acted"][d["n"]] = int(time.time())
        cutoff = time.time() - (ACTION_DAYS + 1) * 86400
        self.data["acted"] = {k: v for k, v in self.data["acted"].items() if v > cutoff}
        self.mailer.save()
        self.hass.bus.async_fire(EVENT_ACTION, {"action": d["a"], "title": d["t"], "subject": d["s"], "sent_to": d.get("o", [])})
        return True

    # ── pinned emails ──────────────────────────────────────────────────────
    def pins_for(self, uid: str) -> list[dict]:
        return list(self.data["pins"].get(uid, []))

    def set_pin(self, uid: str, a: "Account", folder: str, muid: int, on: bool, message_id: str = "") -> list[dict]:
        lst = [p for p in self.data["pins"].get(uid, []) if not (p["account"] == a.id and p["folder"] == folder and p["uid"] == muid)]
        if on:
            lst.insert(0, {"account": a.id, "folder": folder, "uid": muid, "message_id": message_id, "at": now_ms()})
        self.data["pins"][uid] = lst[:50]
        self.mailer.save()
        self.mailer.send_to(uid, {"type": "pins", "pins": self.data["pins"][uid]})
        return self.data["pins"][uid]

    async def async_pinned_items(self, uid: str) -> list[dict]:
        out = []
        by: dict[tuple, list[int]] = {}
        for p in self.pins_for(uid):
            by.setdefault((p["account"], p["folder"]), []).append(p["uid"])
        for (acc_id, folder), uids in by.items():
            a = self.mailer.accounts.get(acc_id)
            if not a or a.acc["owner"] != uid:
                continue
            try:
                items = await a.job(a.cmd.headers, folder, uids, a.previews.setdefault(folder, {}))
            except MailError:
                continue
            for it in items:
                it["account"], it["folder"], it["pinned"] = acc_id, folder, True
                out.append(it)
            found = {i["uid"] for i in items}
            gone = [u for u in uids if u not in found]
            if gone:   # moved or deleted somewhere else
                self.data["pins"][uid] = [p for p in self.data["pins"].get(uid, []) if not (p["account"] == acc_id and p["folder"] == folder and p["uid"] in gone)]
                self.mailer.save()
        order = {(p["account"], p["folder"], p["uid"]): i for i, p in enumerate(self.pins_for(uid))}
        return sorted(out, key=lambda i: order.get((i["account"], i["folder"], i["uid"]), 99))

    # ── Send Later when you arrive or leave ─────────────────────────────────
    def person_for(self, uid: str) -> str | None:
        for st in self.hass.states.async_all("person"):
            if st.attributes.get("user_id") == uid:
                return st.entity_id
        return None

    def zone_name(self, zone_id: str) -> str:
        if zone_id == "zone.home":
            return "home"
        st = self.hass.states.get(zone_id)
        return (st.attributes.get("friendly_name") or st.name) if st else zone_id

    def arm_place(self, item: dict) -> None:
        place = item.get("place") or {}
        person = place.get("person") or self.person_for(item["uid"])
        if not person:
            return
        key = item["id"]
        if key in self._place_unsub:
            self._place_unsub.pop(key)()
        name = self.zone_name(place["zone"]).lower()

        @callback
        def changed(event: Event) -> None:
            old, new = event.data.get("old_state"), event.data.get("new_state")
            if not old or not new:
                return
            was, now = old.state.lower(), new.state.lower()
            hit = (place["event"] == "arrive" and now == name and was != name) or (place["event"] == "leave" and was == name and now != name)
            if hit:
                self.disarm_place(key)
                self.hass.async_create_task(self.mailer.async_send_scheduled(key))
        self._place_unsub[key] = async_track_state_change_event(self.hass, [person], changed)

    def disarm_place(self, key: str) -> None:
        u = self._place_unsub.pop(key, None)
        if u:
            u()

    # ── read receipts ───────────────────────────────────────────────────────
    async def async_send_receipt(self, uid: str, a: "Account", folder: str, muid: int) -> None:
        msg = await a.async_message(folder, muid, False, mark_seen=False)
        to = msg.get("receipt_to") or ""
        if "@" not in to:
            raise MailError("invalid", "This email didn't ask for a read receipt.")
        n = dt_util.now()
        when = f"{n:%A} {n.day} {n:%B %Y} at {n:%H:%M}"
        from .mailparse import text_to_html
        await self.mailer.async_send(uid, a.id, {
            "to": [{"email": to}], "subject": f"Read: {msg.get('subject') or ''}",
            "html": text_to_html(f"Your email \u201c{msg.get('subject') or ''}\u201d to {a.acc['email']} was read on {when}.")})
        self.data["receipts"][msg.get("message_id") or f"{a.id}:{folder}:{muid}"] = now_ms()
        self.mailer.save()

    def receipt_done(self, message_id: str) -> bool:
        return message_id in self.data["receipts"]


def _when_text(start: str, end: str | None) -> str:
    def one(v: str) -> tuple[str, str]:
        if re.match(r"^\d{4}-\d{2}-\d{2}$", v or ""):
            d = datetime.strptime(v, "%Y-%m-%d")
            return f"{d:%A} {d.day} {d:%B %Y}", ""
        d = dt_util.parse_datetime(v or "")
        if d is None:
            return v or "", ""
        return f"{d:%A} {d.day} {d:%B %Y}", d.strftime("%H:%M")
    d1, t1 = one(start)
    if not end:
        return f"{d1}{', ' + t1 if t1 else ''}"
    d2, t2 = one(end)
    if d1 == d2:
        return f"{d1}{', ' + t1 + ' to ' + t2 if t1 else ''}"
    return f"{d1}{' ' + t1 if t1 else ''} to {d2}{' ' + t2 if t2 else ''}"


def _h(s: str) -> str:
    import html
    return html.escape(s or "", quote=True)


def _colour(c: Any) -> str:
    c = str(c or "").lower()
    named = {"red": "#FF3B30", "green": "#34C759", "orange": "#FF9500", "grey": "#8E8E93", "gray": "#8E8E93", "purple": "#AF52DE", "blue": "#0A84FF"}
    if c in named:
        return named[c]
    return c if re.match(r"^#[0-9a-f]{6}$", c) else "#0A84FF"


def vcard(c: dict) -> str:
    """A contact card (vCard 3.0) that any phone or mail app can add to its contacts."""
    def esc(s: Any) -> str:
        return str(s or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")
    name = str(c.get("name") or c.get("email") or "Contact").strip()
    parts = name.split(" ")
    last, first = (parts[-1], " ".join(parts[:-1])) if len(parts) > 1 else (name, "")
    lines = ["BEGIN:VCARD", "VERSION:3.0", f"FN:{esc(name)}", f"N:{esc(last)};{esc(first)};;;"]
    for e in ([c["email"]] if c.get("email") else []) + list(c.get("emails") or []):
        lines.append(f"EMAIL;TYPE=INTERNET:{esc(e)}")
    for ph in ([c["phone"]] if c.get("phone") else []) + list(c.get("phones") or []):
        lines.append(f"TEL;TYPE=CELL:{esc(ph)}")
    if c.get("company"):
        lines.append(f"ORG:{esc(c['company'])}")
    if c.get("title"):
        lines.append(f"TITLE:{esc(c['title'])}")
    if c.get("address"):
        lines.append(f"ADR;TYPE=HOME:;;{esc(c['address'])};;;;")
    if c.get("url"):
        lines.append(f"URL:{esc(c['url'])}")
    if c.get("note"):
        lines.append(f"NOTE:{esc(c['note'])}")
    photo = str(c.get("photo") or "")
    m = re.match(r"^data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+)$", photo)
    if m and len(photo) < 300_000:
        lines.append(_ics_fold(f"PHOTO;ENCODING=b;TYPE={m.group(1).upper()}:{m.group(2)}"))
    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"
