"""Writing and sending email (SMTP)."""
from __future__ import annotations

import base64
import html as html_lib
import mimetypes
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from typing import Callable

from .const import CONNECT_TIMEOUT
from .mailparse import html_to_text


class SendError(Exception):
    """Sending failed (the message is shown to people)."""


def _addr(a: dict) -> str:
    return formataddr((a.get("name") or "", a["email"])) if a.get("name") else a["email"]


def build_message(*, sender: dict, to: list[dict], cc: list[dict], bcc: list[dict], subject: str,
                  html: str, text: str | None = None, in_reply_to: str = "", references: str = "",
                  attachments: list[tuple[str, str, bytes]] | None = None,
                  inline: list[tuple[str, str, bytes, str]] | None = None, calendar: str | None = None, calendar_method: str = "REQUEST") -> EmailMessage:
    """A ready-to-send email: plain text and HTML versions, attachments, and threading headers."""
    msg = EmailMessage()
    msg["From"] = _addr(sender)
    if to:
        msg["To"] = ", ".join(_addr(a) for a in to)
    if cc:
        msg["Cc"] = ", ".join(_addr(a) for a in cc)
    msg["Subject"] = subject or ""
    msg["Date"] = formatdate(localtime=True)
    domain = sender["email"].split("@")[-1] if "@" in sender["email"] else None
    msg["Message-ID"] = make_msgid(domain=domain)
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
    if references or in_reply_to:
        msg["References"] = " ".join(x for x in (references, in_reply_to) if x).strip()
    msg["X-Mailer"] = "Crow Messenger for Home Assistant"
    plain = text if text is not None else html_to_text(html)
    msg.set_content(plain or " ")
    if html:
        body = ('<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
                '<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;">'
                f"{html}</body></html>")
        msg.add_alternative(body, subtype="html")
        if inline:
            html_part = msg.get_payload()[-1]
            for name, mime, data, cid in inline:
                maintype, subtype = (mime or "application/octet-stream").split("/", 1)
                html_part.add_related(data, maintype=maintype, subtype=subtype, cid=f"<{cid}>", filename=name)
    if calendar:
        # an invitation: mail apps show Accept, Maybe and Decline for this part
        msg.add_alternative(calendar, subtype="calendar", params={"method": calendar_method})
    for name, mime, data in attachments or []:
        mime = mime or mimetypes.guess_type(name)[0] or "application/octet-stream"
        maintype, subtype = mime.split("/", 1)
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=name)
    # Bcc never goes in the headers: it's only used for who the email's sent to
    msg.bcc_list = [a["email"] for a in bcc]  # type: ignore[attr-defined]
    return msg


def recipients(msg: EmailMessage, to: list[dict], cc: list[dict], bcc: list[dict]) -> list[str]:
    return list(dict.fromkeys(a["email"] for a in (*to, *cc, *bcc) if a.get("email")))


def send(cfg: dict, username: str, secret: Callable[[], str], oauth: bool, msg: EmailMessage, rcpt: list[str]) -> None:
    host, port, sec = cfg["host"], int(cfg["port"]), cfg.get("security", "starttls")
    ctx = ssl.create_default_context()
    try:
        if sec == "ssl":
            s = smtplib.SMTP_SSL(host, port, context=ctx, timeout=CONNECT_TIMEOUT)
        else:
            s = smtplib.SMTP(host, port, timeout=CONNECT_TIMEOUT)
        try:
            s.ehlo()
            if sec == "starttls":
                s.starttls(context=ctx)
                s.ehlo()
            if oauth:
                token = secret()
                auth = base64.b64encode(f"user={username}\x01auth=Bearer {token}\x01\x01".encode()).decode()
                code, resp = s.docmd("AUTH", "XOAUTH2 " + auth)
                if code == 334:   # the server explains the error, then wants an empty line
                    code, resp = s.docmd("")
                if code != 235:
                    raise SendError("Microsoft didn't accept the sign-in for sending. Sign in again from the account's settings.")
            elif username and s.has_extn("auth"):
                s.login(username, secret())
            refused = s.send_message(msg, to_addrs=rcpt)
            if refused and len(refused) == len(rcpt):
                raise SendError("The mail server wouldn't send to any of the addresses.")
        finally:
            try:
                s.quit()
            except Exception:  # noqa: BLE001
                pass
    except SendError:
        raise
    except smtplib.SMTPAuthenticationError as err:
        raise SendError("The mail server didn't accept the password for sending. If two-step verification is on, use an app password.") from err
    except smtplib.SMTPRecipientsRefused as err:
        raise SendError("The mail server wouldn't send to: " + ", ".join(err.recipients)) from err
    except smtplib.SMTPSenderRefused as err:
        raise SendError("The mail server wouldn't send from this address" + (": the email may be too large." if err.smtp_code == 552 else ".")) from err
    except smtplib.SMTPDataError as err:
        raise SendError(f"The mail server refused the email: {err.smtp_error.decode(errors='replace')[:200] if isinstance(err.smtp_error, bytes) else err.smtp_error}") from err
    except (OSError, smtplib.SMTPException) as err:
        from .imapclient import friendly
        raise SendError(friendly(err)) from err


def quote_html(original: dict, mode: str) -> str:
    """The quoted original under a reply, or the forwarded email."""
    who = original.get("from") or [{}]
    name = who[0].get("name") or who[0].get("email") or "someone"
    when = time.strftime("%d %b %Y at %H:%M", time.localtime((original.get("date") or 0) / 1000))
    body = original.get("html_safe") or html_lib.escape(original.get("text") or "").replace("\n", "<br>")
    if mode == "forward":
        lines = [f"From: {html_lib.escape(_addr(who[0]) if who[0].get('email') else name)}",
                 f"Date: {html_lib.escape(when)}",
                 f"Subject: {html_lib.escape(original.get('subject') or '')}",
                 "To: " + html_lib.escape(", ".join(_addr(a) for a in original.get("to") or []))]
        return ('<br><br><div>Begin forwarded message:</div><br><div style="color:#555">'
                + "<br>".join(lines) + f"</div><br><div>{body}</div>")
    return (f'<br><br><div>On {html_lib.escape(when)}, {html_lib.escape(name)} wrote:</div>'
            f'<blockquote type="cite" style="margin:0 0 0 .8ex;border-left:2px solid #0A84FF;padding-left:1ex;color:#555">{body}</blockquote>')


def extract_inline(html: str) -> tuple[str, list[tuple[str, str, bytes, str]]]:
    """Pictures typed into the email (stickers) become parts of the email, so every mail app shows them."""
    import base64 as b64
    import hashlib
    inline: list[tuple[str, str, bytes, str]] = []
    seen: dict[str, str] = {}

    def repl(m: re.Match) -> str:
        mime, data = m.group(1), m.group(2)
        try:
            raw = b64.b64decode(data, validate=False)
        except Exception:  # noqa: BLE001
            return m.group(0)
        key = hashlib.sha256(raw).hexdigest()[:20]
        if key not in seen:
            cid = f"sticker-{key}@crow-email"
            seen[key] = cid
            ext = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}[mime]
            inline.append((f"sticker-{key[:8]}.{ext}", mime, raw, cid))
        return f'src="cid:{seen[key]}"'
    html = re.sub(r'src="data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+)"', repl, html)
    return html, inline[:40]


def clean_compose_html(markup: str) -> str:
    """What was typed in the card, tidied up for sending (no scripts or event handlers)."""
    from .mailparse import sanitise_html
    safe, _ = sanitise_html(markup or "", allow_remote=True)
    return re.sub(r'\sdata-blocked="1"', "", safe)
