"""Spam: reporting it, blocking senders, rescuing good email from Junk, phishing reports and scam warnings.

Providers don't let other apps change their own blocked-senders lists (Gmail only through
its own app review, Outlook not at all), so blocking is done by Crow Messenger Email: Home Assistant
sees each new email as it arrives and moves email from blocked senders straight to Junk.
Reporting spam moves the email to the provider's own spam folder, which Gmail, iCloud and
Yahoo learn from.
"""
from __future__ import annotations

import email
import email.policy
import logging
import re
import time
from datetime import timedelta
from email.message import EmailMessage
from html.parser import HTMLParser
from typing import TYPE_CHECKING
from urllib.parse import urlsplit

from homeassistant.util import dt as dt_util

from .const import EVENT_BLOCKED
from .manager import Account, MailError

if TYPE_CHECKING:
    from .manager import Mailer

_LOGGER = logging.getLogger(__name__)

RESCUE_EVERY = 300           # seconds between looks in Junk for email from people you trust
MAX_LIST = 2000

# where phishing can be reported (by forwarding the email as an attachment)
PHISHING_PLACES = {
    "ncsc": {"name": "UK National Cyber Security Centre", "email": "report@phishing.gov.uk"},
    "apwg": {"name": "Anti-Phishing Working Group", "email": "reportphishing@apwg.org"},
    "microsoft": {"name": "Microsoft", "email": "phish@office365.microsoft.com"},
}

# well-known names scammers pretend to be, and the addresses they really send from
BRANDS: dict[str, tuple[str, ...]] = {
    "paypal": ("paypal.com", "paypal.co.uk", "paypal.me"),
    "amazon": ("amazon.*", "amazonses.com", "amazonaws.com", "primevideo.com"),
    "apple": ("apple.com", "icloud.com", "me.com", "insideapple.apple.com"),
    "microsoft": ("microsoft.com", "outlook.com", "live.com", "office.com", "office365.com", "microsoftonline.com", "hotmail.com", "xbox.com", "microsoftstore.com"),
    "netflix": ("netflix.com",),
    "hmrc": ("hmrc.gov.uk", "gov.uk"),
    "royal mail": ("royalmail.com", "royalmail.co.uk", "royalmailgroup.com"),
    "dpd": ("dpd.co.uk", "dpd.com", "dpdlocal.co.uk", "dpdgroup.com"),
    "evri": ("evri.com", "hermes-europe.co.uk", "myhermes.co.uk"),
    "dhl": ("dhl.com", "dhl.co.uk", "dhl.de"),
    "ups": ("ups.com",),
    "fedex": ("fedex.com",),
    "dvla": ("gov.uk",),
    "tv licensing": ("tvlicensing.co.uk",),
    "google": ("google.com", "gmail.com", "youtube.com", "accounts.google.com"),
    "facebook": ("facebook.com", "facebookmail.com", "meta.com"),
    "instagram": ("instagram.com", "facebookmail.com"),
    "whatsapp": ("whatsapp.com",),
    "ebay": ("ebay.*",),
    "barclays": ("barclays.co.uk", "barclays.com", "barclaycard.co.uk"),
    "hsbc": ("hsbc.co.uk", "hsbc.com"),
    "lloyds": ("lloydsbank.co.uk", "lloydsbank.com", "lloydsbankinggroup.com"),
    "natwest": ("natwest.com",),
    "santander": ("santander.co.uk", "santander.com"),
    "nationwide": ("nationwide.co.uk",),
    "halifax": ("halifax.co.uk",),
    "monzo": ("monzo.com",),
    "starling": ("starlingbank.com",),
    "revolut": ("revolut.com",),
    "coinbase": ("coinbase.com",),
    "norton": ("norton.com", "nortonlifelock.com"),
    "mcafee": ("mcafee.com",),
    "docusign": ("docusign.net", "docusign.com"),
    "dropbox": ("dropbox.com", "dropboxmail.com"),
    "chase": ("chase.com",),
    "wells fargo": ("wellsfargo.com",),
    "bank of america": ("bankofamerica.com",),
}
_URGENT = re.compile(
    r"verify your (account|identity|details)|account (has been |is |was )?(suspended|locked|limited|disabled|on hold)|"
    r"unusual (sign-?in|activity|login)|confirm your (identity|details|payment|account)|payment (has )?(failed|declined)|"
    r"update your (payment|billing|card)|(could not|couldn't|unable to) (be )?deliver|redelivery fee|re-delivery|"
    r"within 24 hours|immediately to avoid|gift ?cards?|bitcoin|crypto(currency)? wallet|you have won|lottery|inheritance|"
    r"tax refund|refund (is )?(pending|waiting)|reset your password now|your (mailbox|storage) is (full|almost full)", re.I)
_TWO_PART_TLDS = ("co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "co.nz", "co.jp", "com.br", "co.za", "co.in")


def base_domain(host: str) -> str:
    host = (host or "").lower().strip(".")
    parts = host.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in _TWO_PART_TLDS:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def _legit(domain: str, allowed: tuple[str, ...]) -> bool:
    domain = domain.lower()
    for d in allowed:
        if d.endswith(".*"):
            root = d[:-2]
            if re.search(rf"(^|\.){re.escape(root)}\.[a-z.]+$", domain):
                return True
        elif domain == d or domain.endswith("." + d):
            return True
    return False


def _skeleton(text: str) -> str:
    """Lookalike letters made plain: paypa1 → paypal, arnazon → amazon."""
    t = text.lower().replace("rn", "m").replace("vv", "w")
    return t.translate(str.maketrans({"0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "@": "a", "$": "s", "-": "", "_": ""}))


class _Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href = None
        self._text: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href") or ""
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            self.links.append((self._href, "".join(self._text).strip()))
            self._href = None


def scam_signals(msg: dict, html: str | None) -> dict:
    """Simple checks for an email pretending to be someone it isn't. No AI needed."""
    reasons: list[str] = []
    frm = (msg.get("from") or [{}])[0]
    name = (frm.get("name") or "").lower()
    addr = (frm.get("email") or "").lower()
    domain = addr.rsplit("@", 1)[-1] if "@" in addr else ""
    brand_hit = None
    for brand, allowed in BRANDS.items():
        if re.search(rf"\b{re.escape(brand)}\b", name) and domain and not _legit(domain, allowed):
            reasons.append(f"It says it’s from {brand.title() if len(brand) > 4 else brand.upper()}, but was sent from {domain}.")
            brand_hit = brand
            break
    if not brand_hit and domain:
        sk = _skeleton(domain.split(".")[0] if domain.count(".") <= 1 else base_domain(domain).split(".")[0])
        for brand, allowed in BRANDS.items():
            token = brand.replace(" ", "")
            if len(token) >= 5 and token in sk and not _legit(domain, allowed) and token not in domain:
                reasons.append(f"The address {domain} looks like {brand.title()}’s, but isn’t.")
                brand_hit = brand
                break
    reply = (msg.get("reply_to") or [{}])[0].get("email", "").lower()
    if brand_hit and reply and "@" in reply and base_domain(reply.split("@")[1]) != base_domain(domain):
        reasons.append(f"Replies would go to a different address ({reply}).")
    if html:
        p = _Links()
        try:
            p.feed(html[:400000])
        except Exception:  # noqa: BLE001
            pass
        for href, text in p.links:
            m = re.match(r"^(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]|$)", text.lower())
            if not m or not href.lower().startswith(("http://", "https://")):
                continue
            shown, real = base_domain(m.group(1)), base_domain(urlsplit(href).hostname or "")
            if shown and real and shown != real:
                reasons.append(f"A link shows {m.group(1)} but really goes to {urlsplit(href).hostname}.")
                break
    body = f"{msg.get('subject') or ''}\n{(msg.get('text') or '')[:20000]}"
    urgent = bool(_URGENT.search(body))
    level = "warn" if reasons else None
    return {"level": level, "reasons": reasons[:3], "urgent": urgent, "check": bool(reasons) or urgent}


class Spam:
    def __init__(self, mailer: "Mailer") -> None:
        self.mailer = mailer
        self.hass = mailer.hass
        mailer.data.setdefault("blocked", {})
        self._rescued_at: dict[str, float] = {}

    # ── the lists ──────────────────────────────────────────────────────────
    def lists_for(self, uid: str) -> dict:
        d = self.mailer.data["blocked"].get(uid) or {}
        return {"senders": d.get("senders", []), "domains": d.get("domains", []), "action": d.get("action", "junk"),
                "safe_senders": d.get("safe_senders", []), "safe_domains": d.get("safe_domains", [])}

    def save_lists(self, uid: str, d: dict) -> dict:
        cur = self.lists_for(uid)
        if d.get("action") in ("junk", "trash"):
            cur["action"] = d["action"]
        for k in ("senders", "domains", "safe_senders", "safe_domains"):
            lst = list(cur[k])
            for x in d.get(f"add_{k}") or []:
                x = str(x).strip().lower().lstrip("@")[:254]
                if x and x not in lst:
                    lst.append(x)
            for x in d.get(f"remove_{k}") or []:
                x = str(x).strip().lower()
                if x in lst:
                    lst.remove(x)
            cur[k] = lst[-MAX_LIST:]
        # blocking someone stops trusting them, and the other way round
        for x in d.get("add_senders") or []:
            x = str(x).lower()
            if x in cur["safe_senders"]:
                cur["safe_senders"].remove(x)
        for x in d.get("add_safe_senders") or []:
            x = str(x).lower()
            if x in cur["senders"]:
                cur["senders"].remove(x)
        self.mailer.data["blocked"][uid] = cur
        self.mailer.save()
        self.mailer.send_to(uid, {"type": "blocked", "blocked": cur})
        return cur

    def blocked_reason(self, uid: str, addr: str) -> str | None:
        addr = (addr or "").lower()
        if not addr:
            return None
        lists = self.lists_for(uid)
        if addr in lists["senders"]:
            return "sender"
        dom = addr.rsplit("@", 1)[-1]
        if any(dom == d or dom.endswith("." + d) for d in lists["domains"]):
            return "domain"
        return None

    # ── new mail ───────────────────────────────────────────────────────────
    async def async_new_mail(self, a: Account, it: dict) -> bool:
        """Email from a blocked sender goes straight to Junk (or the Trash). True if it was moved."""
        owner = a.acc["owner"]
        frm = (it.get("from") or [{}])[0]
        why = self.blocked_reason(owner, frm.get("email", ""))
        if not why:
            return False
        lists = self.lists_for(owner)
        try:
            dest = await a.async_special("trash" if lists["action"] == "trash" else "junk", create="Junk")
            if dest:
                if not it.get("seen"):
                    await a.async_flag("INBOX", [it["uid"]], "seen", True)
                await a.async_move("INBOX", [it["uid"]], dest)
        except MailError as err:
            _LOGGER.warning("Crow Messenger Email couldn't move email from a blocked sender: %s", err)
            return False
        share = a.acc.get("share_details", True)
        self.hass.bus.async_fire(EVENT_BLOCKED, {
            "account": a.acc["email"], "account_id": a.id, "blocked": why, "moved_to": "trash" if lists["action"] == "trash" else "junk",
            "from_email": frm.get("email", "") if share else "", "from_name": (frm.get("name") or "") if share else "",
            "subject": it.get("subject", "") if share else ""})
        return True

    # ── blocking, with what's already there ─────────────────────────────────
    async def async_block(self, uid: str, addr: str, domain: bool, move_existing: bool) -> dict:
        addr = (addr or "").lower().strip()
        if "@" not in addr:
            raise MailError("invalid", "That isn't an email address.")
        dom = addr.rsplit("@", 1)[1]
        lists = self.save_lists(uid, {"add_domains": [dom]} if domain else {"add_senders": [addr]})
        moved = 0
        if move_existing:
            for a in [x for x in self.mailer.accounts.values() if x.acc["owner"] == uid]:
                try:
                    uids = await a.job(a.cmd.search, "INBOX", "FROM", f'"{dom if domain else addr}"')
                    dest = await a.async_special("trash" if lists["action"] == "trash" else "junk", create="Junk")
                    if uids and dest:
                        await a.async_move("INBOX", uids[:500], dest)
                        moved += len(uids[:500])
                        self.mailer.send_to(uid, {"type": "mail", "account": a.id, "folder": "INBOX"})
                except MailError as err:
                    _LOGGER.info("Crow Messenger Email couldn't move existing email from %s: %s", addr, err)
        return {"blocked": lists, "moved": moved}

    async def async_not_junk(self, uid: str, a: Account, folder: str, uids: list[int], trust: str | None) -> dict:
        await a.async_move(folder, uids, "INBOX")
        lists = None
        if trust and "@" in trust:
            lists = self.save_lists(uid, {"add_safe_senders": [trust.lower()]})
        return {"moved": len(uids), "blocked": lists or self.lists_for(uid)}

    # ── rescuing email from people you trust ────────────────────────────────
    def tick(self) -> None:
        now = time.time()
        for a in list(self.mailer.accounts.values()):
            lists = self.lists_for(a.acc["owner"])
            if not (lists["safe_senders"] or lists["safe_domains"]):
                continue
            if now - self._rescued_at.get(a.id, 0) < RESCUE_EVERY:
                continue
            self._rescued_at[a.id] = now
            self.hass.async_create_task(self.async_rescue(a, lists))

    async def async_rescue(self, a: Account, lists: dict) -> int:
        junk = await a.async_special("junk")
        if not junk:
            return 0
        who = [*lists["safe_senders"][-30:], *lists["safe_domains"][-10:]]
        since = (dt_util.now().date() - timedelta(days=14)).strftime("%d-%b-%Y")

        def run():
            found: set[int] = set()
            for i in range(0, len(who), 8):
                chunk = who[i:i + 8]
                crit: list[str] = []
                for x in chunk:
                    crit = ["OR", "FROM", f'"{x}"', *crit] if crit else ["FROM", f'"{x}"']
                found.update(a.cmd.search(junk, "SINCE", since, *crit))
            return sorted(found)

        try:
            uids = await a.job(run)
            if uids:
                await a.async_move(junk, uids[:200], "INBOX")
                self.mailer.send_to(a.acc["owner"], {"type": "mail", "account": a.id, "folder": "INBOX"})
            return len(uids)
        except MailError as err:
            _LOGGER.info("Crow Messenger Email couldn't check Junk in %s: %s", a.acc["email"], err)
            return 0

    # ── reporting phishing ─────────────────────────────────────────────────
    def phishing_places(self, a: Account) -> list[dict]:
        country = (self.hass.config.country or "").upper()
        out = []
        if country in ("GB", "UK", ""):
            out.append({"id": "ncsc", **PHISHING_PLACES["ncsc"], "on": country in ("GB", "UK")})
        if a.acc.get("provider") == "outlook":
            consumer = a.acc["email"].lower().rsplit("@", 1)[-1] in ("outlook.com", "hotmail.com", "live.com", "msn.com", "hotmail.co.uk", "live.co.uk", "outlook.co.uk")
            out.append({"id": "microsoft", **PHISHING_PLACES["microsoft"], "name": "Microsoft (work and school accounts)", "on": not consumer})
        out.append({"id": "apwg", **PHISHING_PLACES["apwg"], "on": country not in ("GB", "UK")})
        return out

    async def async_report_phishing(self, a: Account, folder: str, uid: int, places: list[str]) -> dict:
        targets = [PHISHING_PLACES[p] for p in places if p in PHISHING_PLACES]
        if not targets:
            raise MailError("invalid", "Choose where to report it.")
        raw = await a.async_raw(folder, uid)
        original = email.message_from_bytes(raw, policy=email.policy.default)
        from .sendmail import SendError, send
        msg = EmailMessage()
        msg["From"] = a.acc["email"]
        msg["To"] = ", ".join(t["email"] for t in targets)
        msg["Subject"] = "Phishing report: " + str(original.get("Subject") or "(No subject)")[:200]
        msg.set_content("I received this email and believe it is phishing or a scam. The original email is attached, "
                        "with its full headers.\n\nReported with Crow Messenger for Home Assistant.\n")
        msg.add_attachment(original)
        if a.acc.get("auth") == "microsoft":
            await a.async_refresh_token()
        try:
            await self.hass.async_add_executor_job(send, a.acc["smtp"], a.acc.get("username") or a.acc["email"], a._secret,
                                                   a.acc.get("auth") == "microsoft", msg, [t["email"] for t in targets])
        except SendError as err:
            raise MailError("send", str(err)) from err
        dest = await a.async_special("junk", create="Junk")
        if dest and dest != folder:
            await a.async_move(folder, [uid], dest)
        return {"reported_to": [t["name"] for t in targets], "moved_to": dest}
