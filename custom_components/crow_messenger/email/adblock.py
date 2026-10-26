"""Ad blocking for emails: ads served by ad networks, and (optionally) labelled sponsored sections.

Newsletter ads are mostly pictures and links from a handful of ad companies, fetched when the
email is opened. They're recognised by their addresses (also when wrapped in the sender's own
click-tracking link) and left out before the email reaches the card, so they're never fetched.
No API keys, no lookups: the list below is updated with the integration.
"""
from __future__ import annotations

import html as html_lib
import re
from urllib.parse import unquote

# the companies that serve ads in emails, and the big display-ad networks they buy from
AD_DOMAINS = (
    # email ad networks
    "liadm.com", "liveintent.com", "powerinbox.com", "jeeng.com", "rs-stripe.com", "passendo.com",
    "paved.com", "launchbit.com", "buysellads.com", "carbonads.net", "zergnet.com", "mgid.com",
    # content recommendation ("Around the web")
    "taboola.com", "outbrain.com", "revcontent.com", "zemanta.com", "ntv.io", "nativo.com",
    # display ad servers and exchanges
    "doubleclick.net", "googlesyndication.com", "googleadservices.com", "adservice.google.com",
    "amazon-adsystem.com", "adzerk.net", "criteo.com", "criteo.net", "adnxs.com", "rubiconproject.com",
    "pubmatic.com", "openx.net", "lijit.com", "triplelift.com", "3lift.com", "sharethrough.com", "teads.tv",
    "adform.net", "smartadserver.com", "flashtalking.com", "moatads.com", "adsrvr.org", "serving-sys.com",
    "atdmt.com", "advertising.com", "yieldmo.com", "gumgum.com", "casalemedia.com", "contextweb.com",
    "bidswitch.net", "adroll.com", "media.net",
)
_DOMAINS = "|".join(re.escape(d) for d in AD_DOMAINS)
# the address itself, or one wrapped (encoded) inside a click-tracking link
_AD_URL = re.compile(rf"(?:^|//)(?:[a-z0-9-]+\.)*(?:{_DOMAINS})(?=[:/?#&%]|$)", re.I)
# LiveIntent also serves from the publisher's own address: li.<publisher>/imp?s=… and /click?s=…
_LIVEINTENT = re.compile(r"^(?:https?:)?//(?:li|lt|lp)\.[^/]+/(?:imp|click)\?(?:.*&)?s=", re.I)

# the labels newsletters put on a paid section (the whole bit of text, a heading or a tag)
SPONSOR_LABEL = re.compile(
    r"^(?:sponsored(?:\s+(?:content|post|message|links?|section|by\b.*))?|advertisement|advertisment|advert|ads?"
    r"|paid\s+(?:content|post|partnership|promotion)|partner(?:ed)?\s+content|in\s+partnership\s+with\b.*"
    r"|presented\s+by\b.*|together\s+with\b.*|brought\s+to\s+you\s+by\b.*"
    r"|(?:a\s+)?(?:word|message|note)s?\s+from\s+(?:our|today'?s)\s+(?:sponsors?|partners?)\b.*"
    r"|from\s+our\s+(?:sponsors?|partners?)\b.*|today'?s\s+sponsor\b.*"
    r"|this\s+(?:email|newsletter|issue|edition)\s+is\s+(?:sponsored|brought\s+to\s+you)\s+by\b.*)"
    r"[\s:.!|·•—–-]*$", re.I)

MARK = "<!--ce-ad-->"


def is_ad_url(url: str) -> bool:
    u = html_lib.unescape(url or "").strip()
    if not u or u.startswith(("cid:", "data:", "mailto:", "tel:", "#")):
        return False
    if _LIVEINTENT.match(u):
        return True
    try:
        plain = unquote(unquote(u))
    except Exception:  # noqa: BLE001
        plain = u
    return bool(_AD_URL.search(u) or _AD_URL.search(plain))


def is_sponsor_label(text: str) -> bool:
    t = re.sub(r"[\s ]+", " ", text or "").strip()
    return 0 < len(t) <= 70 and bool(SPONSOR_LABEL.match(t))


# ── tidying up where ads were ──────────────────────────────────────────────
_SP = r"(?:\s|&nbsp;|&#160;|&#xa0;|<br\s*/?>)"
_M = re.escape(MARK)
_EMPTY_CELL = rf"<t[dh]\b[^>]*>{_SP}*</t[dh]>"
_MARK_CELL = rf"<t[dh]\b[^>]*>(?:{_SP}|{_M})*{_M}(?:{_SP}|{_M})*</t[dh]>"
_INLINE = re.compile(rf"<(div|p|center|span|a|font|b|strong|i|em|u|small|li|ul|ol|blockquote)\b[^>]*>{_SP}*{_M}(?:{_SP}|{_M})*</\1>", re.I)
_ROW = re.compile(rf"<tr\b[^>]*>(?:\s|{_EMPTY_CELL}|{_MARK_CELL})*{_MARK_CELL}(?:\s|{_EMPTY_CELL}|{_MARK_CELL})*</tr>", re.I)
_TABLE = re.compile(rf"<(table|tbody|thead|tfoot)\b[^>]*>\s*{_M}(?:\s|{_M})*</\1>", re.I)


def collapse(markup: str) -> str:
    """The boxes that held only ads go too, so no gaps are left (spacer cells designed in stay)."""
    if MARK not in markup:
        return markup
    for _ in range(16):
        before = markup
        markup = _INLINE.sub(MARK, markup)
        markup = _ROW.sub(MARK, markup)
        markup = _TABLE.sub(MARK, markup)
        if markup == before:
            break
    return markup.replace(MARK, "")


FOLD_STYLE = ("<style>.ce-ad{display:block;margin:8px 0}.ce-ad>summary{display:block;list-style:none;cursor:pointer;padding:10px 12px;border-radius:10px;"
              "background:rgba(127,127,127,.13);color:#8e8e93;font:500 13px/1.3 -apple-system,system-ui,sans-serif;text-align:center}"
              ".ce-ad>summary::-webkit-details-marker{display:none}.ce-ad[open]>summary{margin-bottom:8px}"
              ".ce-ad[open] .ce-h,.ce-ad:not([open]) .ce-o{display:none}</style>")
FOLD_OPEN = ('<details class="ce-ad"><summary><span class="ce-h">Sponsored section hidden · Show</span>'
             '<span class="ce-o">Sponsored section · Hide</span></summary>')
FOLD_CLOSE = "</details>"
