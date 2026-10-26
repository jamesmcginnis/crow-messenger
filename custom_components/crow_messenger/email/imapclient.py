"""Talking to the mail server (IMAP), with plain blocking calls.

Each account has two connections, each used from one thread at a time:
* commands  - listing folders and emails, reading, flagging, moving (run in Home Assistant's
              executor, one at a time per account);
* idle      - sits in IMAP IDLE on the Inbox in its own thread, so new mail is noticed the
              moment it arrives.
"""
from __future__ import annotations

import base64
import contextlib
import imaplib
import logging
import re
import select
import socket
import ssl
import threading
import time
from typing import Callable

from .const import CONNECT_TIMEOUT, PREVIEW_BYTES
from .mailparse import addresses, date_ms, dec, has_attachments, preview_from, utf7_decode, utf7_encode

_LOGGER = logging.getLogger(__name__)
imaplib._MAXLINE = 10_000_000  # noqa: SLF001 - big FETCH responses (long header blocks)

HEADER_FIELDS = "FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES REPLY-TO"
SPECIAL_NAMES = {
    "sent": ("sent", "sent items", "sent messages", "sent mail", "[gmail]/sent mail"),
    "drafts": ("drafts", "draft", "[gmail]/drafts"),
    "trash": ("trash", "deleted", "deleted items", "deleted messages", "bin", "[gmail]/trash", "[gmail]/bin"),
    "junk": ("junk", "spam", "junk e-mail", "junk email", "bulk mail", "[gmail]/spam"),
    "archive": ("archive", "archives", "[gmail]/all mail"),
}
SPECIAL_FLAGS = {"\\sent": "sent", "\\drafts": "drafts", "\\trash": "trash", "\\junk": "junk",
                 "\\archive": "archive", "\\all": "archive", "\\flagged": "flagged", "\\important": "important"}


class ImapError(Exception):
    """Something went wrong talking to the mail server (the message is shown to people)."""


def _q(s: str) -> str:
    """A quoted IMAP string."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _ok(typ: str, data, what: str) -> list:
    if typ != "OK":
        msg = b" ".join(d for d in data if isinstance(d, bytes)).decode(errors="replace") if data else ""
        raise ImapError(f"The mail server refused to {what}{': ' + msg if msg else ''}")
    return data


def friendly(err: BaseException) -> str:
    text = str(err)
    low = text.lower()
    if isinstance(err, ImapError):
        return text
    if "authenticationfailed" in low or "invalid credentials" in low or "login failed" in low or "auth" in low and "fail" in low:
        return "The email address or password wasn't accepted. If two-step verification is on, use an app password."
    if isinstance(err, (socket.gaierror,)):
        return "Couldn't find the mail server. Check the server name."
    if isinstance(err, (socket.timeout, TimeoutError)):
        return "The mail server didn't answer in time."
    if isinstance(err, ssl.SSLError):
        return "Couldn't make a secure connection to the mail server. Check the port and security setting."
    if isinstance(err, (ConnectionRefusedError,)):
        return "The mail server refused the connection. Check the port."
    if isinstance(err, OSError):
        return "Couldn't reach the mail server. Check the internet connection."
    return text or "Something went wrong talking to the mail server."


def _uid_ranges(uids: list[int]) -> list[str]:
    """[1, 2, 3, 7, 9, 10] → ["1:3", "7", "9:10"]"""
    out: list[str] = []
    xs = sorted(set(int(u) for u in uids))
    i = 0
    while i < len(xs):
        j = i
        while j + 1 < len(xs) and xs[j + 1] == xs[j] + 1:
            j += 1
        out.append(str(xs[i]) if i == j else f"{xs[i]}:{xs[j]}")
        i = j + 1
    return out


def _uid_chunks(uids: list[int], limit: int = 6000) -> list[str]:
    """UID sets short enough for one command each (servers cap a command's length)."""
    chunks: list[str] = []
    cur = ""
    for r in _uid_ranges(uids):
        if cur and len(cur) + len(r) + 1 > limit:
            chunks.append(cur)
            cur = ""
        cur = f"{cur},{r}" if cur else r
    if cur:
        chunks.append(cur)
    return chunks


class ImapConn:
    """One connection to an account's mail server."""

    def __init__(self, cfg: dict, username: str, secret: Callable[[], str], oauth: bool) -> None:
        self.cfg = cfg
        self.username = username
        self.secret = secret        # the password, or a fresh Microsoft access token
        self.oauth = oauth
        self.m: imaplib.IMAP4 | None = None
        self.caps: set[str] = set()
        self.selected: str | None = None
        self.readonly = False
        self.lock = threading.RLock()
        self.used = 0.0

    # ── connecting ─────────────────────────────────────────────────────────
    def connect(self) -> None:
        self.close()
        host, port, sec = self.cfg["host"], int(self.cfg["port"]), self.cfg.get("security", "ssl")
        ctx = ssl.create_default_context()
        if sec == "ssl":
            m = imaplib.IMAP4_SSL(host, port, ssl_context=ctx, timeout=CONNECT_TIMEOUT)
        else:
            m = imaplib.IMAP4(host, port, timeout=CONNECT_TIMEOUT)
            if sec == "starttls":
                m.starttls(ssl_context=ctx)
        try:
            if self.oauth:
                token = self.secret()
                auth = f"user={self.username}\x01auth=Bearer {token}\x01\x01".encode()
                m.authenticate("XOAUTH2", lambda _x: auth)
            else:
                m.login(self.username, self.secret())
        except imaplib.IMAP4.error as err:
            try:
                m.logout()
            except Exception:  # noqa: BLE001
                pass
            raise ImapError("The email address or password wasn't accepted. If two-step verification is on, use an app password."
                            if not self.oauth else "Microsoft didn't accept the sign-in. Sign in again from the account's settings.") from err
        self.m = m
        typ, data = m.capability()
        self.caps = set(data[0].decode().upper().split()) if typ == "OK" and data and data[0] else set()
        self.selected = None

    def ensure(self) -> imaplib.IMAP4:
        if self.m is None:
            self.connect()
        elif time.monotonic() - self.used > 60:
            try:
                self.m.noop()
            except Exception:  # noqa: BLE001 - the connection dropped: open it again
                self.connect()
        assert self.m is not None
        self.used = time.monotonic()
        return self.m

    def close(self) -> None:
        m, self.m = self.m, None
        self.selected = None
        if m is not None:
            try:
                m.logout()
            except Exception:  # noqa: BLE001
                pass

    @property
    def gmail(self) -> bool:
        return "X-GM-EXT-1" in self.caps

    def select(self, path: str, readonly: bool = False) -> int:
        m = self.ensure()
        if self.selected == path and self.readonly == readonly:
            return -1
        m.untagged_responses.pop("UIDVALIDITY", None)
        typ, data = m.select(_q(path), readonly=readonly)
        _ok(typ, data, f"open the folder {utf7_decode(path)}")
        self.selected, self.readonly = path, readonly
        try:
            self._validity = int(m.response("UIDVALIDITY")[1][-1])
        except Exception:  # noqa: BLE001
            self._validity = 0
        try:
            return int(data[0])
        except Exception:  # noqa: BLE001
            return 0

    def uidvalidity(self) -> int:
        """The UIDVALIDITY of the folder that was last opened."""
        return getattr(self, "_validity", 0)

    # ── folders ────────────────────────────────────────────────────────────
    def folders(self) -> list[dict]:
        m = self.ensure()
        typ, data = m.list()
        _ok(typ, data, "list the folders")
        out = []
        for line in data:
            if not line:
                continue
            if isinstance(line, tuple):
                line = line[0] + b'"' + line[1] + b'"'
            s = line.decode(errors="replace")
            mm = re.match(r'\((?P<flags>[^)]*)\)\s+(?P<delim>"[^"]*"|NIL)\s+(?P<name>.+)$', s)
            if not mm:
                continue
            flags = mm.group("flags").lower().split()
            if "\\noselect" in flags or "\\nonexistent" in flags:
                continue
            delim = mm.group("delim").strip('"') if mm.group("delim") != "NIL" else ""
            raw = mm.group("name").strip()
            if raw.startswith('"') and raw.endswith('"'):
                raw = raw[1:-1].replace('\\"', '"').replace("\\\\", "\\")
            name = utf7_decode(raw)
            special = next((SPECIAL_FLAGS[f] for f in flags if f in SPECIAL_FLAGS), None)
            if raw.upper() == "INBOX":
                special = "inbox"
            out.append({"path": raw, "name": name, "delim": delim, "special": special})
        # folders with no special-use flag: guess from the name
        have = {f["special"] for f in out if f["special"]}
        for kind, names in SPECIAL_NAMES.items():
            if kind in have:
                continue
            for f in out:
                if not f["special"] and f["name"].lower() in names:
                    f["special"] = kind
                    have.add(kind)
                    break
        return out

    def create_folder(self, name: str) -> str:
        m = self.ensure()
        path = utf7_encode(name)
        typ, data = m.create(_q(path))
        _ok(typ, data, f"create the folder {name}")
        return path

    def status(self, path: str, items: str = "(MESSAGES UNSEEN UIDNEXT)") -> dict:
        m = self.ensure()
        typ, data = m.status(_q(path), items)
        _ok(typ, data, "check the folder")
        out = {}
        s = data[0].decode(errors="replace") if data and data[0] else ""
        for k, v in re.findall(r"([A-Z]+)\s+(\d+)", s.split("(", 1)[-1]):
            out[k.lower()] = int(v)
        return out

    def quota(self) -> dict | None:
        if "QUOTA" not in self.caps:
            return None
        m = self.ensure()
        try:
            typ, data = m.getquotaroot("INBOX")
        except Exception:  # noqa: BLE001
            return None
        if typ != "OK":
            return None
        for part in data:
            for item in (part if isinstance(part, list) else [part]):
                s = item.decode(errors="replace") if isinstance(item, bytes) else str(item)
                mm = re.search(r"STORAGE\s+(\d+)\s+(\d+)", s, re.I)
                if mm:
                    used, total = int(mm.group(1)) * 1024, int(mm.group(2)) * 1024
                    if total:
                        return {"used": used, "total": total}
        return None

    # ── emails ─────────────────────────────────────────────────────────────
    def search(self, path: str, *criteria: str, charset: str | None = None) -> list[int]:
        self.selected = None   # a fresh look, so email that arrived since is included
        self.select(path)
        assert self.m is not None
        typ, data = self.m.uid("SEARCH", *(("CHARSET", charset) if charset else ()), *criteria)
        _ok(typ, data, "search")
        return sorted({int(x) for x in (data[0] or b"").split()}, reverse=True)

    def search_text(self, path: str, query: str) -> list[int]:
        """Emails whose sender, subject or text contain the words (all of them)."""
        self.selected = None
        self.select(path)
        assert self.m is not None
        words = [w for w in query.split() if w][:6]
        if not words:
            return []
        if all(w.isascii() for w in words):
            crit = []
            for w in words:
                crit += ["OR", "OR", "FROM", _q(w), "SUBJECT", _q(w), "TEXT", _q(w)]
            typ, data = self.m.uid("SEARCH", *crit)
        else:
            self.m.literal = query.encode()
            typ, data = self.m.uid("SEARCH", "CHARSET", "UTF-8", "TEXT")
        _ok(typ, data, "search")
        return sorted({int(x) for x in (data[0] or b"").split()}, reverse=True)

    def search_subject(self, path: str, words: str) -> list[int]:
        """Emails whose subject contains the words: quick, even on a very large mailbox (Gmail)."""
        self.selected = None
        self.select(path)
        assert self.m is not None
        if not words.strip():
            return []
        if words.isascii():
            typ, data = self.m.uid("SEARCH", "SUBJECT", _q(words))
        else:
            self.m.literal = words.encode()
            typ, data = self.m.uid("SEARCH", "CHARSET", "UTF-8", "SUBJECT")
        _ok(typ, data, "search")
        return sorted({int(x) for x in (data[0] or b"").split()}, reverse=True)

    def headers(self, path: str, uids: list[int], previews: dict | None = None) -> list[dict]:
        """Who it's from, the subject, flags… for each email, with a preview line."""
        if not uids:
            return []
        self.select(path)
        assert self.m is not None
        uidset = ",".join(str(u) for u in uids)
        typ, data = self.m.uid("FETCH", uidset,
                               f"(UID FLAGS INTERNALDATE RFC822.SIZE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS ({HEADER_FIELDS})])")
        _ok(typ, data, "fetch emails")
        items = self._group(data)
        out = {}
        for meta, lits, heads in items:
            mu = re.search(rb"UID (\d+)", meta)
            if not mu:
                continue
            uid = int(mu.group(1))
            hdr = self._literal(lits, heads, b"HEADER.FIELDS")
            import email as _email
            msg = _email.message_from_bytes(hdr)
            flags = re.search(rb"FLAGS \(([^)]*)\)", meta)
            fl = flags.group(1).decode().split() if flags else []
            size = re.search(rb"RFC822\.SIZE (\d+)", meta)
            idate = re.search(rb'INTERNALDATE "([^"]+)"', meta)
            when = date_ms(msg.get("Date"))
            if idate:
                try:
                    tt = imaplib.Internaldate2tuple(b'INTERNALDATE "' + idate.group(1) + b'"')
                    if tt:
                        when = int(time.mktime(tt) * 1000)
                except Exception:  # noqa: BLE001
                    pass
            out[uid] = {
                "uid": uid,
                "subject": dec(msg.get("Subject")),
                "from": addresses(msg.get("From")),
                "to": addresses(msg.get("To")),
                "cc": addresses(msg.get("Cc")),
                "reply_to": addresses(msg.get("Reply-To")),
                "date": when,
                "message_id": (msg.get("Message-ID") or "").strip(),
                "in_reply_to": (msg.get("In-Reply-To") or "").strip(),
                "references": " ".join(str(msg.get("References") or "").split())[-2000:],
                "seen": "\\Seen" in fl,
                "flagged": "\\Flagged" in fl,
                "answered": "\\Answered" in fl,
                "forwarded": "$Forwarded" in fl,
                "draft": "\\Draft" in fl,
                "size": int(size.group(1)) if size else 0,
                "attachments": has_attachments(meta),
                "preview": (previews or {}).get(uid, ""),
            }
        # the preview: the start of each email, read once and remembered by the caller
        need = [u for u in uids if u in out and (previews is None or u not in previews)]
        if need:
            typ, data = self.m.uid("FETCH", ",".join(str(u) for u in need), f"(UID BODY.PEEK[]<0.{PREVIEW_BYTES}>)")
            if typ == "OK":
                for meta, lits, heads in self._group(data):
                    mu = re.search(rb"UID (\d+)", meta)
                    if mu and lits and int(mu.group(1)) in out:
                        p = preview_from(self._literal(lits, heads, b"BODY[]"))
                        out[int(mu.group(1))]["preview"] = p
                        if previews is not None:
                            previews[int(mu.group(1))] = p
        missing = [u for u in uids if u not in out]
        if missing:
            _LOGGER.warning("Crow Messenger Email couldn't read %s of %s emails in %s (%s): %r", len(missing), len(uids), path, missing[:10],
                            [d if isinstance(d, bytes) else d[0] for d in data][:6])
        return [out[u] for u in uids if u in out]

    @staticmethod
    def _group(data: list) -> list[tuple[bytes, list[bytes], list[bytes]]]:
        """imaplib's FETCH answer, put back together email by email: (all the text, [literals], [what each literal is])."""
        res: list[tuple[bytes, list[bytes], list[bytes]]] = []
        meta, lits, heads = b"", [], []
        for item in data:
            if isinstance(item, tuple):
                head = item[0]
                if re.match(rb"^\d+ \(", head):
                    if meta:
                        res.append((meta, lits, heads))
                    meta, lits, heads = head, [], []
                else:
                    meta += head
                lits.append(item[1])
                heads.append(head)
            elif isinstance(item, bytes):
                if re.match(rb"^\d+ \(", item):
                    if meta:
                        res.append((meta, lits, heads))
                    meta, lits, heads = item, [], []
                else:
                    meta += item
        if meta:
            res.append((meta, lits, heads))
        return res

    @staticmethod
    def _literal(lits: list[bytes], heads: list[bytes], marker: bytes) -> bytes:
        """The literal that belongs to one part of the answer (a BODYSTRUCTURE can carry literals of its own)."""
        for lit, head in zip(lits, heads):
            if marker in head.upper():
                return lit
        return lits[-1] if lits else b""

    def fetch_raw(self, path: str, uid: int) -> bytes:
        self.select(path)
        assert self.m is not None
        typ, data = self.m.uid("FETCH", str(uid), "(UID BODY.PEEK[])")
        _ok(typ, data, "open the email")
        for meta, lits, heads in self._group(data):
            if lits:
                return self._literal(lits, heads, b"BODY[]")
        raise ImapError("That email isn't there any more.")

    def flags(self, path: str, uids: list[int]) -> dict[int, dict]:
        """Read, flagged, answered and forwarded, for emails already shown (those that still exist)."""
        if not uids:
            return {}
        self.select(path)
        assert self.m is not None
        typ, data = self.m.uid("FETCH", ",".join(str(u) for u in uids[:300]), "(UID FLAGS)")
        _ok(typ, data, "check the emails")
        out = {}
        for d in data:
            line = d[0] if isinstance(d, tuple) else d
            if not isinstance(line, bytes):
                continue
            mu, mf = re.search(rb"UID (\d+)", line), re.search(rb"FLAGS \(([^)]*)\)", line)
            if mu and mf:
                fl = mf.group(1).decode(errors="replace").split()
                out[int(mu.group(1))] = {"seen": "\\Seen" in fl, "flagged": "\\Flagged" in fl, "answered": "\\Answered" in fl,
                                         "forwarded": "$Forwarded" in fl, "draft": "\\Draft" in fl}
        return out

    def set_flag(self, path: str, uids: list[int], flag: str, on: bool) -> None:
        if not uids:
            return
        self.select(path)
        assert self.m is not None
        typ, data = self.m.uid("STORE", ",".join(map(str, uids)), "+FLAGS.SILENT" if on else "-FLAGS.SILENT", f"({flag})")
        _ok(typ, data, "change the email")

    def move(self, path: str, uids: list[int], dest: str) -> None:
        if not uids:
            return
        self.select(path)
        assert self.m is not None
        uidset = ",".join(map(str, uids))
        if "MOVE" in self.caps:
            typ, data = self.m.uid("MOVE", uidset, _q(dest))
            _ok(typ, data, "move the email")
            return
        typ, data = self.m.uid("COPY", uidset, _q(dest))
        _ok(typ, data, "move the email")
        self.expunge(path, uids)

    def expunge(self, path: str, uids: list[int]) -> None:
        self.select(path)
        assert self.m is not None
        uidset = ",".join(map(str, uids))
        typ, data = self.m.uid("STORE", uidset, "+FLAGS.SILENT", "(\\Deleted)")
        _ok(typ, data, "delete the email")
        if "UIDPLUS" in self.caps:
            self.m.uid("EXPUNGE", uidset)
        else:
            self.m.expunge()

    def light_headers(self, path: str, uids: list[int], fields: str = "FROM TO CC DATE") -> list[dict]:
        """Just a few headers of many emails (no previews): for the Subscriptions list and the Screener."""
        out: list[dict] = []
        if not uids:
            return out
        self.select(path)
        assert self.m is not None
        import email as _email
        for i in range(0, len(uids), 500):
            part = uids[i:i + 500]
            typ, data = self.m.uid("FETCH", ",".join(str(u) for u in part), f"(UID FLAGS BODY.PEEK[HEADER.FIELDS ({fields})])")
            if typ != "OK":
                continue
            for meta, lits, heads in self._group(data):
                mu = re.search(rb"UID (\d+)", meta)
                if not mu:
                    continue
                hdr = self._literal(lits, heads, b"HEADER.FIELDS")
                msg = _email.message_from_bytes(hdr or b"")
                fl = re.search(rb"FLAGS \(([^)]*)\)", meta)
                out.append({
                    "uid": int(mu.group(1)),
                    "seen": bool(fl and b"\\Seen" in fl.group(1)),
                    "from": addresses(msg.get("From")),
                    "to": addresses(msg.get("To")),
                    "cc": addresses(msg.get("Cc")),
                    "date": date_ms(msg.get("Date")),
                    "subject": dec(msg.get("Subject")),
                    "message_id": (msg.get("Message-ID") or "").strip(),
                    "list_unsubscribe": " ".join(dec(msg.get("List-Unsubscribe")).split())[:600],
                    "one_click": "one-click" in str(msg.get("List-Unsubscribe-Post") or "").lower(),
                    "list_id": dec(msg.get("List-Id"))[:200],
                })
        return out

    def flag_deleted(self, path: str, uids: list[int], on: bool = True) -> None:
        """Mark (or unmark) emails as deleted, in as few commands as possible (runs of UIDs as ranges)."""
        if not uids:
            return
        self.select(path)
        assert self.m is not None
        with self._patient():
            for uidset in _uid_chunks(uids):
                typ, data = self.m.uid("STORE", uidset, "+FLAGS.SILENT" if on else "-FLAGS.SILENT", "(\\Deleted)")
                _ok(typ, data, "delete the emails")

    @contextlib.contextmanager
    def _patient(self, seconds: float = 180):
        """A big folder can take the server a while to mark or remove: wait longer than usual."""
        sock = getattr(self.m, "sock", None)
        old = sock.gettimeout() if sock else None
        try:
            if sock:
                sock.settimeout(seconds)
            yield
        finally:
            try:
                if sock:
                    sock.settimeout(old)
            except OSError:
                pass

    def expunge_flagged(self, path: str, uids: list[int]) -> bool:
        """Remove emails already marked as deleted. Answers True when the whole folder went at once
        (a server without UIDPLUS can only remove everything marked)."""
        self.select(path)
        assert self.m is not None
        with self._patient():
            if "UIDPLUS" in self.caps:
                for uidset in _uid_chunks(uids):
                    typ, data = self.m.uid("EXPUNGE", uidset)
                    _ok(typ, data, "delete the emails")
                return False
            typ, data = self.m.expunge()
            _ok(typ, data, "delete the emails")
            return True

    def append(self, path: str, raw: bytes, flags: str = "(\\Seen)") -> None:
        m = self.ensure()
        typ, data = m.append(_q(path), flags, imaplib.Time2Internaldate(time.time()), raw)
        _ok(typ, data, f"save the email in {utf7_decode(path)}")
        if self.selected == path:
            self.selected = None   # see the new email next time the folder's opened

    def find_message_id(self, path: str, message_id: str) -> int | None:
        if not message_id:
            return None
        uids = self.search(path, "HEADER", "Message-ID", _q(message_id.strip()))
        return uids[0] if uids else None

    def max_uid(self, path: str) -> int:
        st = self.status(path, "(UIDNEXT)")
        return max(0, st.get("uidnext", 1) - 1)

    def uids_after(self, path: str, last: int) -> list[int]:
        self.selected = None   # look again: new mail may have arrived since
        uids = self.search(path, "UID", f"{last + 1}:*")
        return sorted(u for u in uids if u > last)

    # ── IDLE: wait for new mail ────────────────────────────────────────────
    def idle(self, path: str, seconds: int, stop: threading.Event) -> bool:
        """Wait (up to seconds) for the server to say something changed. True if it did."""
        m = self.ensure()
        if "IDLE" not in self.caps:
            stop.wait(min(seconds, 120))
            return True
        self.selected = None
        self.select(path, readonly=True)
        tag = m._new_tag()  # noqa: SLF001
        m.send(tag + b" IDLE\r\n")
        line = m.readline()
        if not line.startswith(b"+"):
            raise ImapError("The mail server didn't accept IDLE")
        sock = m.sock
        changed = False
        end = time.monotonic() + seconds
        try:
            while not stop.is_set() and time.monotonic() < end:
                # wait for the server without a socket timeout (which would spoil imaplib's reader)
                pending = sock.pending() if hasattr(sock, "pending") else 0
                if not pending:
                    ready, _, _ = select.select([sock], [], [], min(5, max(0.5, end - time.monotonic())))
                    if not ready:
                        continue
                line = m.readline()
                if not line:
                    raise ImapError("The mail server closed the connection")
                if re.search(rb"\d+ (EXISTS|RECENT|EXPUNGE|FETCH)", line):
                    changed = True
                    break
        finally:
            try:
                m.send(b"DONE\r\n")
                for _ in range(50):
                    line = m.readline()
                    if line.startswith(tag) or not line:
                        break
            except Exception:  # noqa: BLE001 - reconnects next time
                self.close()
        return changed


def build_oauth_string(user: str, token: str) -> str:
    return base64.b64encode(f"user={user}\x01auth=Bearer {token}\x01\x01".encode()).decode()
