"""Reading email: headers, bodies, attachments, and HTML made safe to show.

Everything here is plain Python (no Home Assistant), so it's easy to test.
"""
from __future__ import annotations

import base64
import email
import email.policy
import html as html_lib
import re
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.utils import getaddresses, parsedate_to_datetime
from html.parser import HTMLParser
from typing import Any

from .adblock import FOLD_CLOSE, FOLD_OPEN, FOLD_STYLE, MARK, collapse, is_ad_url, is_sponsor_label

# ── IMAP folder names (modified UTF-7, RFC 3501 5.1.3) ────────────────────────


def utf7_decode(name: str) -> str:
    out, i = [], 0
    while i < len(name):
        c = name[i]
        if c == "&":
            j = name.find("-", i)
            if j == -1:
                out.append(name[i:])
                break
            chunk = name[i + 1:j]
            if not chunk:
                out.append("&")
            else:
                b64 = chunk.replace(",", "/")
                b64 += "=" * (-len(b64) % 4)
                try:
                    out.append(base64.b64decode(b64).decode("utf-16-be"))
                except Exception:  # noqa: BLE001 - leave odd names as they are
                    out.append(name[i:j + 1])
            i = j + 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def utf7_encode(name: str) -> str:
    out, buf = [], []

    def flush() -> None:
        if buf:
            raw = "".join(buf).encode("utf-16-be")
            out.append("&" + base64.b64encode(raw).decode().rstrip("=").replace("/", ",") + "-")
            buf.clear()

    for c in name:
        if 0x20 <= ord(c) <= 0x7E:
            flush()
            out.append("&-" if c == "&" else c)
        else:
            buf.append(c)
    flush()
    return "".join(out)


# ── Headers ───────────────────────────────────────────────────────────────────


def dec(value: Any) -> str:
    """A header, decoded from =?utf-8?...?= into plain text."""
    if value is None:
        return ""
    try:
        return str(make_header(decode_header(str(value)))).strip()
    except Exception:  # noqa: BLE001
        return str(value).strip()


def addresses(value: Any) -> list[dict]:
    if not value:
        return []
    out = []
    for name, addr in getaddresses([dec(value)]):
        if addr or name:
            out.append({"name": name.strip().strip('"'), "email": addr.strip().lower()})
    return out


def date_ms(value: Any) -> int:
    try:
        return int(parsedate_to_datetime(str(value)).timestamp() * 1000)
    except Exception:  # noqa: BLE001
        return 0


def norm_subject(subject: str) -> str:
    """For grouping a conversation: "Re: Fwd: Dinner" → "dinner"."""
    s = subject or ""
    while True:
        n = re.sub(r"^\s*(re|fw|fwd|aw|sv|antw|wg)\s*(\[\d+\])?\s*:\s*", "", s, flags=re.I)
        if n == s:
            break
        s = n
    return s.strip().lower()


# ── Bodies ───────────────────────────────────────────────────────────────────


def html_to_text(markup: str) -> str:
    markup = re.sub(r"(?s)<!--.*?(-->|$)", " ", markup or "")   # comments (and Outlook's hidden ones)
    markup = re.sub(r"(?is)<(script|style|head|title)[^>]*>.*?(</\1>|$)", " ", markup)   # (the start of a long email can stop part way)
    markup = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|li|h[1-6]|table|blockquote)>", "\n", markup)
    text = re.sub(r"<[^>]+>", " ", markup)
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t\r\f\v ]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def _part_text(part: Message) -> str:
    try:
        payload = part.get_payload(decode=True)
        if payload is None:
            return ""
        charset = part.get_content_charset() or "utf-8"
        try:
            return payload.decode(charset, errors="replace")
        except LookupError:
            return payload.decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return ""


_CSS_LEAD = re.compile(r"^\s*(?:@media[^{]*\{\s*)?[^{}]{0,160}?\{[^{}]*:[^{}]*\}\s*\}?")
_CSS_RULE = re.compile(r"(?:[.#@][\w\-]+[^{}.!?\s]*(?:[\s,>+~]+[.#:]?[\w\-]+)*\s*\{[^{}]*\}\s*)+")


def clean_preview(text: str) -> str:
    """A preview line without page styling code or rows of dashes.

    Some senders' emails start with their styles ("body{margin:0} table,td{…}"), even in the
    plain-text part, and the start of an email can stop part way through them. Others draw
    lines with dashes or equals signs."""
    text = text or ""
    for _ in range(40):                      # styles at the start, one rule at a time
        m = _CSS_LEAD.match(text)
        if not m:
            break
        text = text[m.end():]
    text = _CSS_RULE.sub(" ", text)          # .class{…} later on
    text = re.sub(r"(?:^|\s)[^\s{}]*\{[^{}]*$", " ", text)   # a rule cut off part way
    text = re.sub(r"^\s*[.#@][\w\-]+\s*$", "", text)      # all that's left is a cut-off .class
    text = re.sub(r"([-=_*~#+.•·]\s?){4,}", " ", text)        # ------ and ====== lines
    return " ".join(text.split())


def preview_from(raw: bytes) -> str:
    """A one-line preview from the start of an email (it may be cut off part way)."""
    try:
        msg = email.message_from_bytes(raw)
    except Exception:  # noqa: BLE001
        return ""
    plain = html = ""
    for part in msg.walk():
        if part.is_multipart():
            continue
        if part.get_content_disposition() == "attachment":
            continue
        ctype = part.get_content_type()
        if ctype == "text/plain" and not plain:
            plain = _part_text(part)
        elif ctype == "text/html" and not html:
            html = _part_text(part)
    text = plain or html_to_text(html)
    text = clean_preview(text)
    # some senders put HTML codes (like &#8204;) in the plain text too, and invisible spacers
    # (zero-width characters) to pad the preview other mail apps show: neither is wanted here
    text = html_lib.unescape(text)
    text = re.sub(r"[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]", "", text)
    # quoted replies and signatures don't make good previews
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith(">")]
    text = " ".join(" ".join(lines).split())
    return text[:220]


def has_attachments(bodystructure: bytes) -> bool:
    s = bodystructure.lower()
    # ("attachment" ...), or "attachment; filename=..." as some servers write it
    return b'"attachment' in s or (b'"application"' in s and b'"name"' in s)


def parse_message(raw: bytes) -> dict:
    """Everything the card needs to show an email."""
    msg: EmailMessage = email.message_from_bytes(raw, policy=email.policy.default)  # type: ignore[assignment]
    plain_parts, html_parts, atts = [], [], []
    index = 0
    for part in msg.walk():
        if part.is_multipart():
            continue
        index += 1
        disp = part.get_content_disposition()
        ctype = part.get_content_type()
        filename = part.get_filename()
        cid = (part.get("Content-ID") or "").strip().strip("<>")
        if ctype == "text/calendar" and not filename:
            filename = "invite.ics"   # an invitation: shown as one, with Accept, Maybe and Decline
        if disp == "attachment" or (filename and ctype not in ("text/plain", "text/html")) or (cid and ctype.startswith("image/")):
            try:
                size = len(part.get_payload(decode=True) or b"")
            except Exception:  # noqa: BLE001
                size = 0
            atts.append({
                "part": index, "name": dec(filename) if filename else (f"image.{ctype.split('/')[-1]}" if cid else "attachment"),
                "mime": ctype, "size": size, "cid": cid, "inline": bool(cid) and disp != "attachment",
            })
            continue
        if ctype == "text/plain":
            plain_parts.append(_part_text(part))
        elif ctype == "text/html":
            html_parts.append(_part_text(part))
    plain = "\n".join(plain_parts).strip()
    html = "\n".join(html_parts).strip()
    return {
        "subject": dec(msg.get("Subject")) or "",
        "from": addresses(msg.get("From")),
        "to": addresses(msg.get("To")),
        "cc": addresses(msg.get("Cc")),
        "reply_to": addresses(msg.get("Reply-To")),
        "date": date_ms(msg.get("Date")),
        "message_id": (msg.get("Message-ID") or "").strip(),
        "in_reply_to": (msg.get("In-Reply-To") or "").strip(),
        "references": " ".join(str(msg.get("References") or "").split()),
        "list_unsubscribe": dec(msg.get("List-Unsubscribe"))[:500],
        "receipt_to": (addresses(msg.get("Disposition-Notification-To")) or [{}])[0].get("email", ""),
        "text": plain if plain else html_to_text(html),
        "html": html,
        "attachments": atts,
    }


def find_part(raw: bytes, index: int) -> tuple[bytes, str, str] | None:
    """The bytes, type and name of one part (numbered as in parse_message)."""
    msg = email.message_from_bytes(raw, policy=email.policy.default)
    n = 0
    for part in msg.walk():
        if part.is_multipart():
            continue
        n += 1
        if n == index:
            name = part.get_filename()
            return part.get_payload(decode=True) or b"", part.get_content_type(), dec(name) if name else "attachment"
    return None


# ── Making HTML email safe to show ─────────────────────────────────────────────
# Kept: ordinary layout and formatting. Removed: scripts, forms, frames, event handlers,
# javascript: links and anything that could reach out to the internet - pictures from the
# web are only shown when you choose Load Images (so senders can't tell you've opened it).

ALLOWED_TAGS = {
    "a", "abbr", "address", "b", "bdi", "bdo", "big", "blockquote", "br", "caption", "center", "cite", "code",
    "col", "colgroup", "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "font",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "ins", "kbd", "label", "li", "mark", "ol", "p", "pre",
    "q", "s", "samp", "small", "span", "strike", "strong", "sub", "summary", "sup", "table", "tbody", "td",
    "tfoot", "th", "thead", "time", "tr", "tt", "u", "ul", "var", "wbr", "html", "body", "style", "center",
}
VOID_TAGS = {"br", "hr", "img", "col", "wbr"}
DROP_WITH_CONTENT = {"script", "noscript", "iframe", "object", "embed", "applet", "frame", "frameset", "form",
                     "input", "button", "select", "textarea", "svg", "math", "template", "title", "head",
                     "meta", "link", "base", "audio", "video", "source", "track", "canvas", "dialog", "xml"}
ALLOWED_ATTRS = {
    "align", "alt", "bgcolor", "border", "cellpadding", "cellspacing", "class", "color", "colspan", "dir",
    "face", "height", "href", "hspace", "lang", "rowspan", "size", "span", "src", "start", "style", "summary",
    "title", "type", "valign", "vspace", "width", "background", "nowrap", "role", "datetime", "reversed",
}
URL_ATTRS = {"href", "src", "background"}
_CSS_BAD = re.compile(r"expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import", re.I)
_CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I)
# Tracking pixels: tiny or hidden pictures, or pictures from the addresses that report "opened"
_TRACKER_URL = re.compile(
    r"list-manage\.com/track/open|/track/open|/wf/open\b|mandrillapp\.com/track|/e/o/|/e2t/|hubspotemail|"
    r"mailtrack\.io|getnotify\.com|yesware|mixmax|bananatag|streak\.com|superhuman\.com|mailstat|"
    r"//pixel\.|/pixel(?:\.gif|\.png|/|\?)|/beacon|/open\.aspx|/open\?|/o\.gif|/t\.gif|/1x1|"
    r"/trk/|/tracking/open|/email/open|sendgrid\.net/wf|mailgun\.org/o/|ct\.sendgrid", re.I)
_HIDDEN_STYLE = re.compile(r"display\s*:\s*none|visibility\s*:\s*hidden|(?:^|[;\s])(?:width|height)\s*:\s*[01](?:\.\d+)?px", re.I)


def _is_tracker(attrs: dict, url: str) -> bool:
    """A picture that's only there to tell the sender you opened the email."""
    def tiny(v: str | None) -> bool:
        m = re.match(r"\s*(\d+(?:\.\d+)?)\s*(?:px)?\s*$", v or "")
        return bool(m) and float(m.group(1)) <= 3
    if tiny(attrs.get("width")) and tiny(attrs.get("height")):
        return True
    if _HIDDEN_STYLE.search(attrs.get("style") or ""):
        return True
    return bool(_TRACKER_URL.search(url))


class _Sanitiser(HTMLParser):
    def __init__(self, cid_url, allow_remote: bool, proxy=None, block_trackers: bool = True, ads: str = "off") -> None:
        super().__init__(convert_charrefs=False)
        # ad blocking: "off", "networks" (ads from ad networks) or "sponsored" (and labelled sponsored sections)
        self.ads = ads if ads in ("networks", "sponsored") else "off"
        self.ad_units: set = set()       # the boxes ads were taken from (several pictures in one box are one ad)
        self.stack: list[list] = []      # open elements: [tag, index in out, text so far, id]
        self.closed: dict[int, tuple] = {}
        self.labels: list[tuple] = []    # "Sponsored" and the like: (the elements around it, innermost first; its length)
        self.text_len = 0
        self._ids = 0
        self.proxy = proxy                  # pictures from the web fetched through Home Assistant
        self.block_trackers = block_trackers
        self.trackers = 0
        self.out: list[str] = []
        self.drop_depth = 0
        self.drop_tag: list[str] = []
        self.cid_url = cid_url
        self.allow_remote = allow_remote
        self.blocked = 0
        self.in_style = False

    # urls: keep http(s)/mailto/tel links; cid: pictures come from the email itself
    def _url(self, attr: str, value: str) -> str | None:
        v = html_lib.unescape(value or "").strip()
        if self.ads != "off" and attr != "href" and is_ad_url(v):
            return None
        low = re.sub(r"[\s\x00-\x1f]", "", v).lower()
        if attr == "href":
            if low.startswith(("http://", "https://", "mailto:", "tel:")) or low.startswith("#"):
                return v
            return None
        if low.startswith("cid:"):
            u = self.cid_url(v[4:].strip("<>"))
            return u
        if low.startswith("data:image/") and not low.startswith("data:image/svg"):
            return v
        if low.startswith(("http://", "https://", "//")):
            if self.allow_remote:
                full = "https:" + v[v.find("//"):] if low.startswith("//") else v
                return self.proxy(full) if self.proxy else full
            self.blocked += 1
            return None
        return None

    def _style(self, value: str) -> str:
        if _CSS_BAD.search(value):
            value = _CSS_BAD.sub("", value)

        def repl(m: re.Match) -> str:
            u = self._url("src", m.group(2))
            return f"url('{u}')" if u else "none"

        return _CSS_URL.sub(repl, value)

    def handle_starttag(self, tag: str, attrs: list) -> None:
        tag = tag.lower()
        if self.drop_depth:
            if tag == self.drop_tag[-1] and tag not in VOID_TAGS:
                self.drop_depth += 1
            return
        if tag in DROP_WITH_CONTENT:
            if tag not in VOID_TAGS and tag not in ("meta", "link", "base", "input", "source", "track"):
                self.drop_depth = 1
                self.drop_tag.append(tag)
            return
        if tag not in ALLOWED_TAGS:
            return
        if tag == "style":
            self.in_style = True
            self.out.append("<style>")
            return
        if tag in ("html", "body"):
            tag = "div"
        if self.ads != "off" and tag in ("a", "img"):
            a = {(n or "").lower(): (v or "") for n, v in attrs}
            if is_ad_url(a.get("href" if tag == "a" else "src", "")):
                self._ad_hit()
                if tag == "a":   # the link and everything in it (the ad's picture)
                    self.drop_depth = 1
                    self.drop_tag.append("a")
                return
        if tag == "img" and self.block_trackers:
            a = {(n or "").lower(): (v or "") for n, v in attrs}
            src = html_lib.unescape(a.get("src", "")).strip()
            if re.match(r"(?i)^(https?:)?//", src) and _is_tracker(a, src):
                self.trackers += 1
                return
        kept = []
        for name, value in attrs:
            name = (name or "").lower()
            if name.startswith("on") or name not in ALLOWED_ATTRS:
                continue
            value = value or ""
            if name in URL_ATTRS:
                u = self._url(name, value)
                if u is None:
                    if name == "src" and tag == "img":
                        kept.append(('data-blocked', "1"))
                    continue
                value = u
            elif name == "style":
                value = self._style(value)
            kept.append((name, value))
        if tag == "a":
            kept = [(n, v) for n, v in kept if n not in ("target", "rel")] + [("target", "_blank"), ("rel", "noopener noreferrer")]
        attr_s = "".join(f' {n}="{html_lib.escape(v, quote=True)}"' for n, v in kept)
        self.out.append(f"<{tag}{attr_s}>")
        if tag not in VOID_TAGS:
            self._ids += 1
            self.stack.append([tag, len(self.out) - 1, self.text_len, self._ids])

    def _ad_hit(self) -> None:
        self.out.append(MARK)
        box = next((e[3] for e in reversed(self.stack) if e[0] in ("table", "div")), 0)
        self.ad_units.add(box)

    def handle_startendtag(self, tag: str, attrs: list) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID_TAGS and not self.drop_depth and tag.lower() in ALLOWED_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self.drop_depth:
            if tag == self.drop_tag[-1]:
                self.drop_depth -= 1
                if not self.drop_depth:
                    self.drop_tag.pop()
            return
        if tag == "style":
            self.in_style = False
            self.out.append("</style>")
            return
        if tag in ("html", "body"):
            tag = "div"
        if tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.out.append(f"</{tag}>")
            for i in range(len(self.stack) - 1, max(-1, len(self.stack) - 12), -1):
                if self.stack[i][0] == tag:
                    for e in self.stack[i + 1:]:   # left open inside it: they end here too
                        self.closed[e[3]] = (e[0], e[1], len(self.out) - 1, self.text_len - e[2], True)
                    e = self.stack[i]
                    self.closed[e[3]] = (e[0], e[1], len(self.out) - 1, self.text_len - e[2], False)
                    del self.stack[i:]
                    break

    def handle_data(self, data: str) -> None:
        if self.drop_depth:
            return
        if self.in_style:
            self.out.append(self._style(data).replace("</", "<\\/"))
        else:
            self.out.append(html_lib.escape(data, quote=False))
            t = data.strip()
            self.text_len += len(t)
            if self.ads == "sponsored" and t and is_sponsor_label(t):
                self.labels.append(([e[3] for e in reversed(self.stack)], len(t)))

    def sponsored(self) -> int:
        """Fold away each labelled sponsored section (it can be opened again in the email)."""
        if not self.labels:
            return 0
        total = max(self.text_len, 1)
        chosen: list[tuple] = []
        for ids, n in self.labels:
            for i in ids:   # the smallest box around the label that holds the ad too, never most of the email
                c = self.closed.get(i)
                if not c or c[0] not in ("table", "div", "td", "th", "center"):
                    continue
                if c[3] > min(2500, total * 0.45):
                    break
                if c[3] >= n + 40:
                    if c[0] in ("td", "th"):   # the only cell of its own little table: fold the whole table
                        for j in ids[ids.index(i) + 1:]:
                            o = self.closed.get(j)
                            if not o or o[0] in ("tr", "tbody", "thead", "tfoot"):
                                continue
                            if o[0] == "table" and o[3] == c[3]:
                                c = o
                            break
                    if not any(not (c[2] < x[1] or c[1] > x[2]) for x in chosen):
                        chosen.append(c)
                    break
        for tag, start, end, _n, _x in chosen:
            if tag in ("td", "th"):   # inside a table cell: fold its contents
                self.out[start] += FOLD_OPEN
                self.out[end] = FOLD_CLOSE + self.out[end]
            else:
                self.out[start] = FOLD_OPEN + self.out[start]
                self.out[end] += FOLD_CLOSE
        if chosen:
            self.out.insert(0, FOLD_STYLE)
        return len(chosen)

    def handle_entityref(self, name: str) -> None:
        if not self.drop_depth:
            self.out.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if not self.drop_depth:
            self.out.append(f"&#{name};")


def sanitise_html(markup: str, cid_url=lambda cid: None, allow_remote: bool = False) -> tuple[str, int]:
    """Safe HTML, and how many pictures from the web were held back."""
    res = sanitise_email_html(markup, cid_url, allow_remote, block_trackers=False)
    return res["html"], res["blocked"]


def sanitise_email_html(markup: str, cid_url=lambda cid: None, allow_remote: bool = False, proxy=None,
                        block_trackers: bool = True, ads: str = "off") -> dict:
    """Safe HTML, how many pictures from the web were held back, how many trackers were left out,
    and how many ads were taken out (and sponsored sections folded away)."""
    p = _Sanitiser(cid_url, allow_remote, proxy, block_trackers, ads)
    try:
        p.feed(markup or "")
        p.close()
    except Exception:  # noqa: BLE001 - a broken email shows what could be read
        pass
    sponsored = 0
    try:
        sponsored = p.sponsored()
    except Exception:  # noqa: BLE001 - never stops the email showing
        sponsored = 0
    out = "".join(p.out)
    try:
        out = collapse(out)
    except Exception:  # noqa: BLE001
        out = out.replace(MARK, "")
    return {"html": out, "blocked": p.blocked, "trackers": p.trackers, "ads": len(p.ad_units), "sponsored": sponsored}


def text_to_html(text: str) -> str:
    """Plain-text email shown with links you can tap and quotes set off."""
    esc = html_lib.escape(text or "")
    esc = re.sub(r"(https?://[^\s<>&\"']+)", r'<a href="\1" target="_blank" rel="noopener noreferrer">\1</a>', esc)
    lines = []
    for ln in esc.split("\n"):
        lines.append(f'<span class="q">{ln}</span>' if ln.startswith("&gt;") else ln)
    return '<div class="plain">' + "<br>".join(lines) + "</div>"
