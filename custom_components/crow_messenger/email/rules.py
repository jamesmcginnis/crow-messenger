"""Rules: what happens to new email as it arrives in the Inbox.

Each rule has conditions (all or any of them), a list of actions, and can stop the rules below
it. Conditions can look at the email (sender, words, attachments, mailing lists, invitations,
size, category) and at Home Assistant (the time, whether you're home, any entity's state).
Actions tidy the email, forward it, reply while you're away, save its attachments, notify or
announce, run a script, or add a to-do or calendar event. An optional AI rule describes the
emails in plain English instead.

Rules made before conditions and actions (from, to, subject, body, attachment, mark_read, flag,
move_to, notify) are converted as they're read.
"""
from __future__ import annotations

import logging
import os
import re
import time
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.util import dt as dt_util

from .manager import MailError, new_id, now_ms

if TYPE_CHECKING:
    from .manager import Account, Mailer

_LOGGER = logging.getLogger(__name__)

MAX_RULES = 60
LOG_SIZE = 60
AUTO_REPLY_GAP = 4 * 86400   # an auto-reply goes to each sender at most once in this time
TEXT_FIELDS = ("from", "to", "subject", "body", "any_text", "attachment_name")
BOOL_FIELDS = ("attachment", "vip", "contact", "unknown", "list", "invite", "unread")
OTHER_FIELDS = ("attachment_type", "size", "category", "time", "home", "entity", "account_to")
FIELDS = (*TEXT_FIELDS, *BOOL_FIELDS, *OTHER_FIELDS)
TEXT_OPS = ("contains", "not_contains", "is", "is_not", "starts", "ends")
ACTIONS = ("mark_read", "flag", "move", "archive", "delete", "junk", "pin", "remind", "forward", "auto_reply",
           "save_attachments", "notify", "notify_text", "announce", "script", "todo", "calendar")
MOVING = ("move", "archive", "delete", "junk")
# what "Apply to Inbox Now" does to email you already have (never sends or notifies anything)
APPLY_NOW = ("mark_read", "flag", "move", "archive", "delete", "junk", "pin", "remind", "save_attachments", "todo")
AUTOMATED = re.compile(r"(^|[._+-])(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|bounce[s]?|notifications?)([._+-]|@)", re.I)


def _clean(s: Any, n: int = 300) -> str:
    return str(s or "").strip()[:n]


def convert(old: dict) -> dict:
    """A rule from before conditions and actions."""
    if isinstance(old.get("conditions"), list):
        return old
    conds = []
    for f in ("from", "to", "subject", "body"):
        if old.get(f):
            conds.append({"field": f, "op": "contains", "value": old[f]})
    if old.get("attachment"):
        conds.append({"field": "attachment", "op": "yes"})
    acts = []
    if old.get("mark_read"):
        acts.append({"type": "mark_read"})
    if old.get("flag"):
        acts.append({"type": "flag"})
    if old.get("notify") in ("always", "never"):
        acts.append({"type": "notify", "mode": old["notify"]})
    if old.get("move_to"):
        acts.append({"type": "move", "folder": old["move_to"]})
    return {"id": old.get("id") or new_id(), "name": old.get("name") or "Rule", "enabled": old.get("enabled", True),
            "match": "all", "stop": False, "conditions": conds, "actions": acts, "ai": ""}


def sanitise(r: dict) -> dict:
    r = convert(r)
    conds = []
    for c in (r.get("conditions") or [])[:20]:
        f = c.get("field")
        if f not in FIELDS:
            continue
        out: dict[str, Any] = {"field": f}
        if f in TEXT_FIELDS:
            out["op"] = c.get("op") if c.get("op") in TEXT_OPS else "contains"
            out["value"] = _clean(c.get("value"), 400)
            if not out["value"]:
                continue
        elif f in BOOL_FIELDS:
            out["op"] = "no" if c.get("op") == "no" else "yes"
        elif f == "attachment_type":
            out["value"] = c.get("value") if c.get("value") in ("pdf", "image", "document", "spreadsheet", "calendar", "archive") else "pdf"
        elif f == "size":
            out["op"] = "lt" if c.get("op") == "lt" else "gt"
            try:
                out["value"] = max(1, min(200000, int(c.get("value") or 1000)))   # KB
            except (TypeError, ValueError):
                out["value"] = 1000
        elif f == "category":
            out["op"] = "is_not" if c.get("op") == "is_not" else "is"
            out["value"] = c.get("value") if c.get("value") in ("primary", "transactions", "updates", "promotions") else "promotions"
        elif f == "time":
            days = [d for d in (c.get("days") or []) if isinstance(d, int) and 0 <= d <= 6]
            out["days"] = sorted(set(days)) or list(range(7))
            out["start"] = _clean(c.get("start"), 5) if re.match(r"^\d\d:\d\d$", str(c.get("start") or "")) else "00:00"
            out["end"] = _clean(c.get("end"), 5) if re.match(r"^\d\d:\d\d$", str(c.get("end") or "")) else "23:59"
            out["op"] = "outside" if c.get("op") == "outside" else "inside"
        elif f == "home":
            out["op"] = "away" if c.get("op") == "away" else "home"
            out["value"] = _clean(c.get("value"), 120)   # a person (empty: you)
        elif f == "entity":
            out["entity"] = _clean(c.get("entity"), 120)
            out["op"] = "is_not" if c.get("op") == "is_not" else "is"
            out["value"] = _clean(c.get("value"), 120)
            if not out["entity"]:
                continue
        elif f == "account_to":
            out["op"] = "yes" if c.get("op") != "no" else "no"
        conds.append(out)
    acts = []
    for x in (r.get("actions") or [])[:20]:
        t = x.get("type")
        if t not in ACTIONS:
            continue
        a: dict[str, Any] = {"type": t}
        if t == "move":
            a["folder"] = _clean(x.get("folder"), 300)
            if not a["folder"]:
                continue
        elif t == "remind":
            try:
                a["hours"] = max(1, min(24 * 60, int(x.get("hours") or 24)))
            except (TypeError, ValueError):
                a["hours"] = 24
        elif t == "forward":
            a["to"] = [e for e in re.split(r"[,;\s]+", _clean(x.get("to"), 600)) if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e)][:5]
            a["attachments"] = x.get("attachments", True) is not False
            if not a["to"]:
                continue
        elif t == "auto_reply":
            a["message"] = _clean(x.get("message"), 4000)
            a["subject"] = _clean(x.get("subject"), 200)
            a["start"] = _clean(x.get("start"), 10) if re.match(r"^\d{4}-\d\d-\d\d$", str(x.get("start") or "")) else ""
            a["end"] = _clean(x.get("end"), 10) if re.match(r"^\d{4}-\d\d-\d\d$", str(x.get("end") or "")) else ""
            a["contacts_only"] = bool(x.get("contacts_only"))
            if not a["message"]:
                continue
        elif t == "save_attachments":
            a["folder"] = re.sub(r"[^\w\- /]", "", _clean(x.get("folder"), 120)).strip(" /") or "Crow Messenger Email"
            a["types"] = x.get("types") if x.get("types") in ("all", "pdf", "image") else "all"
        elif t == "notify":
            a["mode"] = x.get("mode") if x.get("mode") in ("always", "never", "quiet") else "always"
        elif t == "notify_text":
            a["title"] = _clean(x.get("title"), 120)
            a["message"] = _clean(x.get("message"), 500) or "{subject}"
            a["devices"] = [str(d) for d in (x.get("devices") or [])][:10]
        elif t == "announce":
            a["entity"] = _clean(x.get("entity"), 120)
            a["tts"] = _clean(x.get("tts"), 120)
            a["message"] = _clean(x.get("message"), 400) or "New email from {from}: {subject}"
            if not a["entity"]:
                continue
        elif t == "script":
            a["entity"] = _clean(x.get("entity"), 120)
            if not re.match(r"^(script|automation)\.\w+$", a["entity"]):
                continue
        elif t == "todo":
            a["entity"] = _clean(x.get("entity"), 120)
            a["text"] = _clean(x.get("text"), 200) or "{subject}"
            if not a["entity"].startswith("todo."):
                continue
        elif t == "calendar":
            a["entity"] = _clean(x.get("entity"), 120)
            if not a["entity"].startswith("calendar."):
                continue
        acts.append(a)
    return {"id": r.get("id") or new_id(), "name": _clean(r.get("name"), 80) or "Rule", "enabled": bool(r.get("enabled", True)),
            "match": "any" if r.get("match") == "any" else "all", "stop": bool(r.get("stop")),
            "conditions": conds, "actions": acts, "ai": _clean(r.get("ai"), 400)}


def _fill(template: str, it: dict, a: "Account") -> str:
    frm = (it.get("from") or [{}])[0]
    vals = {"from": frm.get("name") or frm.get("email") or "someone", "from_email": frm.get("email") or "",
            "subject": it.get("subject") or "(No subject)", "preview": (it.get("preview") or "")[:200],
            "account": a.acc.get("name") or a.acc["email"]}
    return re.sub(r"\{(from|from_email|subject|preview|account)\}", lambda m: vals[m.group(1)], template or "")


class Rules:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        mailer.data.setdefault("rule_log", {})
        mailer.data.setdefault("auto_replied", {})
        # rules from before conditions and actions
        for acc_id, lst in list(mailer.data["rules"].items()):
            if any(not isinstance(r.get("conditions"), list) for r in lst):
                mailer.data["rules"][acc_id] = [sanitise(r) for r in lst]

    # ── stored rules ───────────────────────────────────────────────────────
    def rules(self, account_id: str) -> list[dict]:
        return [convert(r) for r in self.mailer.data["rules"].get(account_id, [])]

    def save(self, a: "Account", rules: list[dict]) -> list[dict]:
        out = [sanitise(r) for r in rules[:MAX_RULES]]
        self.mailer.data["rules"][a.id] = out
        self.mailer.save()
        return out

    def log_for(self, account_id: str) -> list[dict]:
        return list(self.mailer.data["rule_log"].get(account_id, []))

    def _log(self, a: "Account", rule: dict, it: dict, done: list[str]) -> None:
        lst = self.mailer.data["rule_log"].setdefault(a.id, [])
        frm = (it.get("from") or [{}])[0]
        lst.insert(0, {"at": now_ms(), "rule": rule["id"], "name": rule["name"], "subject": (it.get("subject") or "")[:120],
                       "from": frm.get("name") or frm.get("email") or "", "done": done})
        del lst[LOG_SIZE:]
        self.mailer.save()

    # ── does a rule match? ─────────────────────────────────────────────────
    def _needs_body(self, rule: dict) -> bool:
        return any(c["field"] in ("body", "any_text", "list", "invite", "attachment_type", "attachment_name") for c in rule["conditions"]) \
            or any(x["type"] in ("forward", "auto_reply", "save_attachments", "calendar") for x in rule["actions"])

    async def _full(self, a: "Account", it: dict, ctx: dict, folder: str = "INBOX") -> dict | None:
        """The whole email (fetched once for all the rules)."""
        if "msg" not in ctx:
            from .mailparse import parse_message
            try:
                raw = await a.async_raw(folder, it["uid"])
                ctx["raw"] = raw
                ctx["msg"] = await self.hass.async_add_executor_job(parse_message, raw)
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Crow Messenger Email rules couldn't read email %s: %s", it.get("uid"), err)
                ctx["msg"] = None
        return ctx["msg"]

    async def matches(self, a: "Account", rule: dict, it: dict, ctx: dict, folder: str = "INBOX", ai_ok: bool = True) -> bool:
        owner = a.acc["owner"]
        results = []
        for c in rule["conditions"]:
            results.append(await self._cond(a, owner, c, it, ctx, folder))
            if rule["match"] == "all" and not results[-1]:
                return False
            if rule["match"] == "any" and results[-1]:
                break
        if rule["conditions"]:
            ok = all(results) if rule["match"] == "all" else any(results)
            if not ok:
                return False
        if rule.get("ai"):
            if not ai_ok:
                return False
            return await self._ai(a, rule, it, ctx, folder)
        return bool(rule["conditions"])

    async def _cond(self, a: "Account", owner: str, c: dict, it: dict, ctx: dict, folder: str) -> bool:
        f, op = c["field"], c.get("op")
        frm = it.get("from") or []
        sender = (frm[0].get("email") if frm else "") or ""

        def text_test(hay: str, value: str) -> bool:
            hay = (hay or "").lower()
            vals = [v.strip().lower() for v in value.split(",") if v.strip()]
            if op == "is":
                return any(hay.strip() == v or v in hay.split() for v in vals)
            if op == "is_not":
                return not any(hay.strip() == v or v in hay.split() for v in vals)
            if op == "starts":
                return any(hay.startswith(v) for v in vals)
            if op == "ends":
                return any(hay.endswith(v) for v in vals)
            hit = any(v in hay for v in vals)
            return not hit if op == "not_contains" else hit

        if f in TEXT_FIELDS:
            if f == "from":
                hay = " ".join(f"{x.get('name', '')} {x.get('email', '')}" for x in frm)
                if op in ("is", "is_not"):
                    hay = sender
            elif f == "to":
                people = [*(it.get("to") or []), *(it.get("cc") or [])]
                hay = " ".join(f"{x.get('name', '')} {x.get('email', '')}" for x in people)
            elif f == "subject":
                hay = it.get("subject") or ""
            else:
                msg = await self._full(a, it, ctx, folder)
                if f == "attachment_name":
                    hay = " ".join(x.get("name", "") for x in (msg or {}).get("attachments") or [] if not x.get("inline"))
                else:
                    hay = (msg or {}).get("text") or it.get("preview") or ""
                    if f == "any_text":
                        hay = " ".join([hay, it.get("subject") or "", " ".join(f"{x.get('name', '')} {x.get('email', '')}" for x in frm)])
            return text_test(hay, c["value"])

        yes = op != "no"
        if f == "attachment":
            v = bool(it.get("attachments"))
        elif f == "vip":
            v = self.mailer.is_vip(owner, sender)
        elif f == "contact":
            v = self.mailer.book.has_email(owner, sender)
        elif f == "unknown":
            known = (self.mailer.data["recent"].get(owner) or {}).get(sender.lower())
            v = not known and not self.mailer.book.has_email(owner, sender) and not self.mailer.is_vip(owner, sender)
        elif f == "unread":
            v = not it.get("seen")
        elif f == "account_to":
            me = a.acc["email"].lower()
            v = any((x.get("email") or "").lower() == me for x in it.get("to") or [])
        elif f == "list":
            msg = await self._full(a, it, ctx, folder)
            v = bool((msg or {}).get("list_unsubscribe"))
        elif f == "invite":
            msg = await self._full(a, it, ctx, folder)
            v = any(x.get("mime") == "text/calendar" for x in (msg or {}).get("attachments") or [])
        elif f == "attachment_type":
            msg = await self._full(a, it, ctx, folder)
            kinds = {"pdf": ("application/pdf",), "image": ("image/",), "calendar": ("text/calendar",),
                     "document": ("application/msword", "application/vnd.openxmlformats-officedocument.wordprocessing", "application/vnd.oasis.opendocument.text", "application/rtf"),
                     "spreadsheet": ("application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheet", "text/csv", "application/vnd.oasis.opendocument.spreadsheet"),
                     "archive": ("application/zip", "application/x-zip", "application/x-7z", "application/x-rar", "application/gzip")}[c["value"]]
            return any(not x.get("inline") and any((x.get("mime") or "").startswith(k) for k in kinds) for x in (msg or {}).get("attachments") or [])
        elif f == "size":
            kb = (it.get("size") or 0) / 1024
            return kb > c["value"] if op == "gt" else kb < c["value"]
        elif f == "category":
            got = await self.mailer.smart.async_categories(owner, [{**it, "account": a.id}])
            cat = (got.get(a.id) or {}).get(str(it["uid"]))
            if not cat:
                return False
            return cat == c["value"] if op == "is" else cat != c["value"]
        elif f == "time":
            now = dt_util.now()
            hm = now.strftime("%H:%M")
            s, e = c["start"], c["end"]
            within = (s <= hm <= e) if s <= e else (hm >= s or hm <= e)   # (overnight, like 22:00 to 07:00)
            within = within and now.weekday() in c["days"]
            return within if op == "inside" else not within
        elif f == "home":
            person = c.get("value") or self.mailer.extras.person_for(owner)
            st = self.hass.states.get(person) if person else None
            if not st:
                return False
            at_home = st.state == "home"
            return at_home if op == "home" else not at_home
        elif f == "entity":
            st = self.hass.states.get(c["entity"])
            if not st:
                return False
            same = st.state.lower() == (c.get("value") or "").lower()
            return same if op == "is" else not same
        else:
            return False
        return v if yes else not v

    async def _ai(self, a: "Account", rule: dict, it: dict, ctx: dict, folder: str) -> bool:
        from . import ai
        if not ai.on(self.hass, self.mailer, "rules"):
            return False
        msg = await self._full(a, it, ctx, folder) or {**it, "text": it.get("preview") or ""}
        try:
            return await ai.rule_matches(self.hass, self.mailer, msg, rule["ai"])
        except MailError as err:
            _LOGGER.debug("Crow Messenger Email AI rule %s: %s", rule["name"], err)
            return False

    # ── new email ──────────────────────────────────────────────────────────
    async def async_new_mail(self, a: "Account", it: dict, data: dict) -> dict:
        """Run the rules on a new email. Returns {notify: None|all|none|quiet, moved: bool}."""
        from .const import EVENT_RULE_MATCHED
        ctx: dict = {}
        out: dict[str, Any] = {"notify": None, "moved": False}
        ai_used = False
        for rule in self.rules(a.id):
            if not rule.get("enabled") or not (rule["conditions"] or rule.get("ai")):
                continue
            # the AI only looks at email no ordinary rule has already handled
            if not await self.matches(a, rule, it, ctx, ai_ok=not ai_used and not out["moved"]):
                continue
            if rule.get("ai"):
                ai_used = True
            self.hass.bus.async_fire(EVENT_RULE_MATCHED, {**data, "rule": rule["name"], "rule_id": rule["id"]})
            done = await self.async_actions(a, rule, it, ctx, out, data)
            self._log(a, rule, it, done)
            if rule.get("stop") or out["moved"]:
                break
        return out

    async def async_actions(self, a: "Account", rule: dict, it: dict, ctx: dict, out: dict, data: dict | None,
                            folder: str = "INBOX", only: tuple | None = None) -> list[str]:
        owner = a.acc["owner"]
        done: list[str] = []
        acts = [x for x in rule["actions"] if only is None or x["type"] in only]
        # moving the email goes last, so everything else can still find it
        acts = [x for x in acts if x["type"] not in MOVING] + [x for x in acts if x["type"] in MOVING][:1]
        for x in acts:
            t = x["type"]
            try:
                if t == "mark_read":
                    await a.async_flag(folder, [it["uid"]], "seen", True)
                    it["seen"] = True
                elif t == "flag":
                    await a.async_flag(folder, [it["uid"]], "flagged", True)
                elif t == "pin":
                    self.mailer.extras.set_pin(owner, a, folder, it["uid"], True, it.get("message_id") or "")
                elif t == "remind":
                    await self.mailer.async_remind(owner, a.id, folder, it["uid"], now_ms() + x["hours"] * 3600_000)
                elif t == "notify":
                    out["notify"] = {"always": "all", "never": "none", "quiet": "quiet"}[x["mode"]]
                elif t == "notify_text":
                    await self._notify_text(a, x, it)
                elif t == "announce":
                    await self._announce(x, it, a)
                elif t == "script":
                    await self._script(x, it, a, data)
                elif t == "todo":
                    await self.hass.services.async_call("todo", "add_item", {"item": _fill(x["text"], it, a)[:250]},
                                                        target={"entity_id": x["entity"]}, blocking=True)
                elif t == "calendar":
                    if not await self._calendar(a, x, it, ctx, folder):
                        continue
                elif t == "forward":
                    await self._forward(a, x, it, ctx, folder)
                elif t == "auto_reply":
                    if not await self._auto_reply(a, rule, x, it, ctx, folder):
                        continue
                elif t == "save_attachments":
                    n = await self._save_attachments(a, x, it, ctx, folder)
                    if not n:
                        continue
                elif t == "move":
                    await a.async_move(folder, [it["uid"]], x["folder"])
                    out["moved"] = True
                elif t == "archive":
                    await a.async_archive(folder, [it["uid"]])
                    out["moved"] = True
                elif t == "delete":
                    await a.async_delete(folder, [it["uid"]])
                    out["moved"] = True
                elif t == "junk":
                    dest = await a.async_special("junk", create="Junk")
                    await a.async_move(folder, [it["uid"]], dest)
                    out["moved"] = True
                done.append(t)
            except Exception as err:  # noqa: BLE001 - one action failing mustn't stop the rest
                _LOGGER.warning("Crow Messenger Email rule %s couldn't %s: %s", rule["name"], t.replace("_", " "), err)
        return done

    # ── the actions that do more than flag or move ─────────────────────────
    async def _notify_text(self, a: "Account", x: dict, it: dict) -> None:
        services = self.mailer.devices(a.acc["owner"])
        if x.get("devices"):
            services = [s for s in services if s in x["devices"]]
        url = self.mailer.link(a.acc["owner"], f"{a.id}:INBOX:{it['uid']}")
        for s in services:
            await self.hass.services.async_call("notify", s, {
                "title": _fill(x.get("title") or "{from}", it, a), "message": _fill(x["message"], it, a),
                "data": {"url": url, "clickAction": url, "tag": f"crow_email_rule_{a.id}_{it['uid']}"}})

    async def _announce(self, x: dict, it: dict, a: "Account") -> None:
        message = _fill(x["message"], it, a)
        tts = x.get("tts") or next((s.entity_id for s in self.hass.states.async_all("tts")), "")
        if x["entity"].startswith("assist_satellite."):
            await self.hass.services.async_call("assist_satellite", "announce", {"message": message}, target={"entity_id": x["entity"]})
        elif tts:
            await self.hass.services.async_call("tts", "speak", {"media_player_entity_id": x["entity"], "message": message},
                                                target={"entity_id": tts})
        else:
            raise MailError("invalid", "There's no text-to-speech set up in Home Assistant.")

    async def _script(self, x: dict, it: dict, a: "Account", data: dict | None) -> None:
        frm = (it.get("from") or [{}])[0]
        variables = {"account": a.acc["email"], "subject": it.get("subject") or "", "from_name": frm.get("name") or "",
                     "from_email": frm.get("email") or "", "uid": it["uid"], "preview": it.get("preview") or ""}
        if (data or {}).get("subject") == "" and not a.acc.get("share_details", True):
            variables.update({"subject": "", "from_name": "", "from_email": ""})
        domain = x["entity"].split(".")[0]
        if domain == "script":
            await self.hass.services.async_call("script", "turn_on", {"variables": variables}, target={"entity_id": x["entity"]})
        else:
            await self.hass.services.async_call("automation", "trigger", {"skip_condition": False, "variables": variables},
                                                target={"entity_id": x["entity"]})

    async def _calendar(self, a: "Account", x: dict, it: dict, ctx: dict, folder: str) -> bool:
        """An invitation in the email goes into a Home Assistant calendar."""
        msg = await self._full(a, it, ctx, folder)
        cal = next((p for p in (msg or {}).get("attachments") or [] if p.get("mime") == "text/calendar"), None)
        if not cal or "raw" not in ctx:
            return False
        from .extras import parse_ics
        from .mailparse import find_part
        got = await self.hass.async_add_executor_job(find_part, ctx["raw"], cal["part"])
        inv = parse_ics(got[0].decode("utf-8", "replace"), self.hass.config.time_zone) if got else None
        if not inv or not inv.get("start") or inv.get("cancelled"):
            return False
        svc: dict[str, Any] = {"summary": inv.get("title") or it.get("subject") or "Event"}
        if inv.get("all_day"):
            start = datetime.strptime(inv["start"], "%Y-%m-%d").date()
            end = datetime.strptime(inv["end"], "%Y-%m-%d").date() if inv.get("end") else start + timedelta(days=1)
            svc.update({"start_date": start.isoformat(), "end_date": max(end, start + timedelta(days=1)).isoformat()})
        else:
            s = datetime.strptime(inv["start"], "%Y-%m-%dT%H:%M")
            e = datetime.strptime(inv["end"], "%Y-%m-%dT%H:%M") if inv.get("end") else s + timedelta(hours=1)
            svc.update({"start_date_time": s.strftime("%Y-%m-%d %H:%M:%S"), "end_date_time": e.strftime("%Y-%m-%d %H:%M:%S")})
        if inv.get("location"):
            svc["location"] = inv["location"]
        await self.hass.services.async_call("calendar", "create_event", svc, target={"entity_id": x["entity"]}, blocking=True)
        return True

    async def _forward(self, a: "Account", x: dict, it: dict, ctx: dict, folder: str) -> None:
        msg = await self._full(a, it, ctx, folder)
        if msg is None:
            raise MailError("not_found", "The email couldn't be read.")
        atts = [{"folder": folder, "uid": it["uid"], "part": p["part"]} for p in msg.get("attachments") or []
                if x.get("attachments", True) and not p.get("inline")]
        from .manager import _clean as mclean
        subj = it.get("subject") or ""
        await self.mailer.async_send(a.acc["owner"], a.id, {
            "to": [{"email": e} for e in x["to"]], "subject": mclean(subj if subj.lower().startswith("fwd:") else f"Fwd: {subj}", 998),
            "html": "", "attachments": atts, "reply": {"mode": "forward", "folder": folder, "uid": it["uid"]}, "quote": True})

    def _automated(self, msg: dict, raw: bytes | None, sender: str) -> bool:
        if AUTOMATED.search(sender or "") or msg.get("list_unsubscribe"):
            return True
        if raw:
            head = raw.split(b"\r\n\r\n", 1)[0][:20000].lower()
            if re.search(rb"^auto-submitted:\s*(?!no)", head, re.M) or re.search(rb"^precedence:\s*(bulk|list|junk|auto_reply)", head, re.M) \
                    or re.search(rb"^x-auto-response-suppress:", head, re.M) or re.search(rb"^list-id:", head, re.M):
                return True
        return False

    async def _auto_reply(self, a: "Account", rule: dict, x: dict, it: dict, ctx: dict, folder: str) -> bool:
        """Out of office: once per sender in a few days, and never to lists, robots or yourself."""
        today = dt_util.now().strftime("%Y-%m-%d")
        if (x.get("start") and today < x["start"]) or (x.get("end") and today > x["end"]):
            return False
        frm = (it.get("from") or [{}])[0]
        sender = (frm.get("email") or "").lower()
        owner = a.acc["owner"]
        mine = {acc.acc["email"].lower() for acc in self.mailer.accounts.values() if acc.acc["owner"] == owner}
        if not sender or sender in mine:
            return False
        if x.get("contacts_only") and not (self.mailer.book.has_email(owner, sender) or self.mailer.is_vip(owner, sender)):
            return False
        msg = await self._full(a, it, ctx, folder)
        if msg is None or self._automated(msg, ctx.get("raw"), sender):
            return False
        seen = self.mailer.data["auto_replied"].setdefault(rule["id"], {})
        if seen.get(sender, 0) > time.time() - AUTO_REPLY_GAP:
            return False
        from .mailparse import text_to_html
        subj = x.get("subject") or (it.get("subject") or "")
        if not x.get("subject") and not subj.lower().startswith("re:"):
            subj = f"Re: {subj}"
        html = text_to_html(_fill(x["message"], it, a))
        if a.acc.get("signature"):
            html += "<br><br>" + text_to_html(a.acc["signature"])
        await self.mailer.async_send(owner, a.id, {"to": [{"email": sender, "name": frm.get("name") or ""}], "subject": subj,
                                                   "html": html, "reply": {"mode": "reply", "folder": folder, "uid": it["uid"]},
                                                   "quote": False, "_auto": True})
        seen[sender] = int(time.time())
        if len(seen) > 2000:
            for k in sorted(seen, key=seen.get)[:500]:
                seen.pop(k, None)
        self.mailer.save()
        return True

    async def _save_attachments(self, a: "Account", x: dict, it: dict, ctx: dict, folder: str) -> int:
        """Into a folder in Home Assistant's Media (/media/<folder>), never anywhere else."""
        msg = await self._full(a, it, ctx, folder)
        if not msg:
            return 0
        parts = [p for p in msg.get("attachments") or [] if not p.get("inline")]
        if x["types"] == "pdf":
            parts = [p for p in parts if p.get("mime") == "application/pdf"]
        elif x["types"] == "image":
            parts = [p for p in parts if (p.get("mime") or "").startswith("image/")]
        if not parts:
            return 0
        media = (self.hass.config.media_dirs or {}).get("local") or self.hass.config.path("media")
        base = os.path.realpath(media)
        dest = os.path.realpath(os.path.join(base, x["folder"]))
        if not dest.startswith(base + os.sep) and dest != base:
            raise MailError("invalid", "That folder isn't inside Media.")
        from .mailparse import find_part
        files = []
        for p in parts[:20]:
            got = await self.hass.async_add_executor_job(find_part, ctx["raw"], p["part"])
            if got:
                files.append((got[2] or p.get("name") or "attachment", got[0]))

        def write() -> int:
            os.makedirs(dest, exist_ok=True)
            n = 0
            stamp = dt_util.now().strftime("%Y-%m-%d")
            for name, data in files:
                safe = re.sub(r"[^\w.\- ]", "_", os.path.basename(name)).strip("._ ")[:120] or "attachment"
                path = os.path.join(dest, f"{stamp} {safe}")
                root, ext = os.path.splitext(path)
                i = 2
                while os.path.exists(path):
                    path = f"{root} ({i}){ext}"
                    i += 1
                with open(path, "wb") as fh:
                    fh.write(data)
                n += 1
            return n
        return await self.hass.async_add_executor_job(write)

    # ── trying a rule on email you already have ─────────────────────────────
    async def async_recent(self, a: "Account", limit: int = 50) -> list[dict]:
        page = await a.async_page("INBOX", 0, limit)
        return page["items"]

    async def async_test(self, a: "Account", rule: dict, limit: int = 50) -> list[dict]:
        rule = sanitise(rule)
        out = []
        for it in await self.async_recent(a, limit):
            if await self.matches(a, rule, it, {}, ai_ok=bool(rule.get("ai"))):
                out.append({k: it.get(k) for k in ("uid", "subject", "from", "date", "seen", "preview")})
            if len(out) >= 30:
                break
        return out

    async def async_apply(self, a: "Account", rule: dict, limit: int = 200) -> dict:
        rule = sanitise(rule)
        n = 0
        for it in await self.async_recent(a, limit):
            ctx: dict = {}
            if not await self.matches(a, rule, it, ctx, ai_ok=bool(rule.get("ai"))):
                continue
            done = await self.async_actions(a, rule, it, ctx, {"notify": None, "moved": False}, None, only=APPLY_NOW)
            if done:
                n += 1
                self._log(a, rule, it, done)
        a.mailer.send_to(a.acc["owner"], {"type": "mail", "account": a.id, "folder": "INBOX"})
        self.hass.async_create_task(a.async_counts())
        return {"changed": n}
