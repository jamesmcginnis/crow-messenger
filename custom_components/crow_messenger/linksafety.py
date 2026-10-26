"""Link Safety (an AI feature): a warning on links in chats and the Feed that look like scams.

When someone shares a link, Home Assistant looks at the address itself (look-alike letters, a bank's or a
courier's name on a site that isn't theirs, a bare internet address, a shortened link…) and asks the AI
about it, with the page's title and description from the link preview if there is one. Only the link and
that title and description go to the AI, never the message.

Links to well-known sites are left alone without asking the AI, and each link is only checked once a day.
The answer is kept on the message or post: "safe" (nothing shown), "caution" or "danger", with a short
reason the card shows under the link.
"""
from __future__ import annotations

import asyncio
import ipaddress
import logging
import re
import time
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from . import ai
from .manager import MessengerError

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

FEATURE = "links"
KEEP_SECONDS = 24 * 3600
RISKS = ("safe", "caution", "danger")

# sites people share all the time: no need to ask the AI about these
KNOWN = {
    "google.com", "google.co.uk", "youtube.com", "youtu.be", "wikipedia.org", "bbc.co.uk", "bbc.com", "github.com",
    "apple.com", "icloud.com", "microsoft.com", "live.com", "office.com", "amazon.co.uk", "amazon.com", "amazon.de",
    "ebay.co.uk", "ebay.com", "facebook.com", "instagram.com", "whatsapp.com", "x.com", "twitter.com", "reddit.com",
    "netflix.com", "spotify.com", "linkedin.com", "tiktok.com", "gov.uk", "nhs.uk", "theguardian.com", "nytimes.com",
    "home-assistant.io", "homeassistant.io", "nabucasa.com", "maps.google.com", "goo.gl", "imdb.com", "tripadvisor.co.uk",
    "booking.com", "airbnb.co.uk", "airbnb.com", "royalmail.com", "dpd.co.uk", "evri.com", "dhl.com", "ups.com",
    "fedex.com", "argos.co.uk", "tesco.com", "sainsburys.co.uk", "asda.com", "ocado.com", "johnlewis.com", "ikea.com",
    "rightmove.co.uk", "zoopla.co.uk", "trainline.com", "nationalrail.co.uk", "tfl.gov.uk", "met-office.gov.uk",
    "metoffice.gov.uk", "paypal.com", "monzo.com", "revolut.com", "starlingbank.com", "deliveroo.co.uk",
    "just-eat.co.uk", "ubereats.com", "uber.com", "zoom.us", "dropbox.com", "drive.google.com", "docs.google.com",
}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
              "tiny.cc", "rb.gy", "t.ly", "s.id", "v.gd", "lnkd.in", "bl.ink", "short.io"}
# names scammers borrow, and the sites that really are theirs
BRANDS = {
    "paypal": ("paypal.com",), "apple": ("apple.com",), "icloud": ("icloud.com", "apple.com"),
    "amazon": ("amazon.co.uk", "amazon.com", "amazon.de", "amazon.fr"), "royalmail": ("royalmail.com",),
    "evri": ("evri.com",), "hermes": ("evri.com", "hermes.com"), "dpd": ("dpd.co.uk", "dpd.com"),
    "dhl": ("dhl.com", "dhl.co.uk"), "fedex": ("fedex.com",), "hmrc": ("gov.uk",), "dvla": ("gov.uk",),
    "netflix": ("netflix.com",), "microsoft": ("microsoft.com", "live.com", "office.com"), "outlook": ("live.com", "office.com", "outlook.com"),
    "office365": ("office.com", "microsoft.com"), "google": ("google.com", "google.co.uk"), "gmail": ("google.com",),
    "facebook": ("facebook.com",), "instagram": ("instagram.com",), "whatsapp": ("whatsapp.com",),
    "barclays": ("barclays.co.uk", "barclays.com"), "hsbc": ("hsbc.co.uk", "hsbc.com"), "lloyds": ("lloydsbank.com", "lloyds.com"),
    "natwest": ("natwest.com",), "santander": ("santander.co.uk", "santander.com"), "halifax": ("halifax.co.uk",),
    "nationwide": ("nationwide.co.uk",), "monzo": ("monzo.com",), "revolut": ("revolut.com",), "starling": ("starlingbank.com",),
    "nhs": ("nhs.uk",), "vodafone": ("vodafone.co.uk", "vodafone.com"), "virginmedia": ("virginmedia.com",),
    "steam": ("steampowered.com", "steamcommunity.com"), "coinbase": ("coinbase.com",),
}
BRAND_NAMES = {"paypal": "PayPal", "icloud": "iCloud", "royalmail": "Royal Mail", "dpd": "DPD", "dhl": "DHL", "fedex": "FedEx",
               "hmrc": "HMRC", "dvla": "DVLA", "office365": "Office 365", "whatsapp": "WhatsApp", "hsbc": "HSBC",
               "nhs": "NHS", "virginmedia": "Virgin Media"}
ODD_ENDINGS = {"zip", "mov", "top", "xyz", "click", "country", "gq", "tk", "ml", "cf", "ga", "work", "rest", "loan",
               "support", "cam", "quest", "icu", "buzz", "monster"}
SECOND_LEVEL = {"co", "org", "gov", "ac", "com", "net", "ltd", "plc", "me", "nhs", "police", "sch"}
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)


def first_url(text: str) -> str | None:
    found = URL_RE.search(text or "")
    return found.group(0).rstrip(").,!?;:") if found else None


def _registered(host: str) -> str:
    """example.co.uk from www.shop.example.co.uk, example.com from a.b.example.com."""
    parts = host.split(".")
    if len(parts) >= 3 and parts[-2] in SECOND_LEVEL and len(parts[-1]) == 2:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def flags(url: str) -> list[str]:
    """What looks wrong with the address itself, in plain words (empty when nothing does)."""
    try:
        u = urlparse(url)
    except ValueError:
        return ["The address doesn’t look right"]
    host = (u.hostname or "").lower().rstrip(".")
    out: list[str] = []
    if not host:
        return ["The address doesn’t look right"]
    if "@" in (u.netloc or ""):
        out.append("The address hides where it really goes")
    try:
        ipaddress.ip_address(host)
        out.append("It goes to a bare internet address, not a website name")
        return out
    except ValueError:
        pass
    if "xn--" in host:
        out.append("It uses look-alike letters in the website name")
    reg = _registered(host)
    if reg in SHORTENERS or host in SHORTENERS:
        out.append("It’s a shortened link, so you can’t see where it goes")
    words = set(re.split(r"[.\-_]", host))
    for brand, real in BRANDS.items():
        if (brand in words or any(w.startswith(brand) and len(w) - len(brand) <= 6 for w in words)) and reg not in real:
            out.append(f"It uses the name {BRAND_NAMES.get(brand) or brand.title()} but isn’t their website")
            break
    if host.rsplit(".", 1)[-1] in ODD_ENDINGS:
        out.append(f"Its address ends in .{host.rsplit('.', 1)[-1]}, which scam sites often use")
    if host.count(".") >= 4 or host.replace("xn--", "").count("-") >= 3:
        out.append("The website name is unusually long or complicated")
    if u.scheme == "http" and re.search(r"log-?in|sign-?in|verify|account|password|secure|bank|pay", url, re.I):
        out.append("It asks about signing in or paying but isn’t a secure (https) page")
    return out


def _cache(m: "Messenger") -> dict:
    return m.__dict__.setdefault("_link_safety_cache", {})


def on(m: "Messenger") -> bool:
    return ai.feature_on(m, FEATURE)


async def check(hass: "HomeAssistant", m: "Messenger", url: str, preview: dict | None = None) -> dict:
    """{"url", "risk", "reason"} for one link, from the cache when it was checked today."""
    cache = _cache(m)
    got = cache.get(url)
    if got and time.time() - got[0] < KEEP_SECONDS:
        return got[1]
    found = flags(url)
    host = (urlparse(url).hostname or "").lower()
    reg = _registered(host) if host else ""
    if not found and (host in KNOWN or reg in KNOWN):
        result = {"url": url, "risk": "safe"}
    else:
        result = None
        if ai.task_entity(hass, m):
            p = preview or {}
            try:
                answer = await ai._task(hass, m, "Crow Messenger link safety", (  # noqa: SLF001
                    "Someone in a family shared a link in their private home messenger. Is it likely to be a scam, "
                    "phishing, a fake shop or malware? Judge the address carefully (look-alike names, a well-known "
                    "company's name on a site that isn't theirs, odd endings). Ordinary shops, news, videos and small "
                    "businesses are safe. Reply with only JSON: {\"risk\": \"safe\" | \"caution\" | \"danger\", "
                    "\"reason\": \"one short sentence a non-technical person understands\"}.\n"
                    f"Link: {url[:500]}\n"
                    + (f"Page title: {str(p.get('title') or '')[:200]}\n" if p.get("title") else "")
                    + (f"Page description: {str(p.get('desc') or '')[:300]}\n" if p.get("desc") else "")
                    + (f"Site name: {str(p.get('site') or '')[:80]}\n" if p.get("site") else "")
                    + (("Noticed: " + "; ".join(found)) if found else "")))
                data = ai._json(answer)  # noqa: SLF001
                if isinstance(data, dict) and data.get("risk") in RISKS:
                    result = {"url": url, "risk": data["risk"]}
                    if data["risk"] != "safe":
                        result["reason"] = ai._clean(str(data.get("reason") or ""))[:160] or (found[0] if found else  # noqa: SLF001
                                                                                             "This link might not be what it seems")
            except MessengerError as err:
                _LOGGER.debug("Link Safety: no answer from the AI for %s: %s", url, err)
        if result is None:
            # no AI to ask (or it didn't answer): the address itself decides
            strong = [f for f in found if "bare internet" in f or "look-alike" in f or "isn’t their website" in f or "hides" in f]
            result = {"url": url, "risk": "caution", "reason": strong[0]} if strong else {"url": url, "risk": "safe"}
    cache[url] = (time.time(), result)
    if len(cache) > 500:
        for old in sorted(cache, key=lambda k: cache[k][0])[:200]:
            cache.pop(old, None)
    return result


async def check_message(hass: "HomeAssistant", m: "Messenger", thread_id: str, message_id: str, url: str) -> None:
    """Check a chat message's link and keep the answer on the message."""
    try:
        await asyncio.sleep(3)   # the link preview is usually there by then, and helps the AI
        thread, msg = m._find(thread_id, message_id)  # noqa: SLF001
        if not msg:
            return
        result = await check(hass, m, url, msg.get("link") if (msg.get("link") or {}).get("url") == url else None)
        thread, msg = m._find(thread_id, message_id)  # noqa: SLF001 - it may have changed meanwhile
        if not msg or first_url(msg.get("text") or "") != url:
            return
        msg["link_safety"] = result
        m._save()  # noqa: SLF001
        m._push_update(thread, msg)  # noqa: SLF001
    except Exception:  # noqa: BLE001 - a warning is a nice-to-have
        _LOGGER.debug("Link Safety failed for a message", exc_info=True)


async def check_post(hass: "HomeAssistant", m: "Messenger", pid: str, url: str) -> None:
    """Check a Feed post's link and keep the answer on the post."""
    try:
        await asyncio.sleep(3)
        f = m.feed
        post = f.data["posts"].get(pid)
        if not post:
            return
        result = await check(hass, m, url, post.get("link") if (post.get("link") or {}).get("url") == url else None)
        post = f.data["posts"].get(pid)
        if not post or f._link_url(post) != url:  # noqa: SLF001
            return
        post["link_safety"] = result
        f.save()
        f.push(post)
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Link Safety failed for a post", exc_info=True)
