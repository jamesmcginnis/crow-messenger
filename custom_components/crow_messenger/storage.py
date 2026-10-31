"""Crow Messenger storage: one copy of each file, made smaller, and kept tidy.

* Every upload is fingerprinted (SHA-256). The same bytes are stored once, under their fingerprint, however
  many messages, posts, albums or forwards use them, whenever they were sent. Each message or post keeps its
  own record (who can see it, when it was sent); the file goes only when the last record using it has gone.
* Photos are stored as WebP (smaller at the same quality) and videos re-encoded to 720p (an administrator's
  choice: 720p, 1080p or as sent), in the background, one at a time, at low priority.
* Old photos and videos can be shrunk instead of deleted (an administrator's choice; off to begin with).
* Duplicates already on the server can be found (a dry run first) and merged.
* A weekly sweep removes files nothing points at, and the stats count what's really on disk.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import shutil
import time
from collections import defaultdict
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from homeassistant.core import callback

if TYPE_CHECKING:
    from .manager import Messenger

_LOGGER = logging.getLogger(__name__)

DAY_MS = 86_400_000
SWEEP_EVERY_MS = 7 * DAY_MS
STRAY_MIN_AGE = 24 * 3600          # a file nothing points at is only removed once it's a day old (uploads in progress)
PHOTO_MAX_SIDE = 2560              # photos bigger than this are scaled down when they're stored
WEBP_QUALITY = 82
THUMB_SIDE = 520
SHRINK_PHOTO_SIDE = 1280
SHRINK_VIDEO_SIDE = 480
VIDEO_CRF = {"720": 26, "1080": 24}
VIDEO_KEEP_BITRATE = 2_500_000     # a video already this small (and no bigger than the target) is left alone
CONVERTIBLE = ("image/jpeg", "image/png")
DEFAULTS = {"video": "720", "webp": True, "shrink_days": 0}


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while chunk := fh.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()


def _size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def _remove(paths: list[str]) -> int:
    freed = 0
    for p in paths:
        try:
            freed += os.path.getsize(p)
            os.remove(p)
        except FileNotFoundError:
            pass
        except OSError as err:
            _LOGGER.warning("Crow Messenger couldn't delete %s: %s", p, err)
    return freed


def _kind(mime: str) -> str:
    mime = mime or ""
    return "video" if mime.startswith("video/") else "photo" if mime.startswith("image/") else "audio" if mime.startswith("audio/") else "file"


def _ext(name: str) -> str:
    ext = os.path.splitext(name or "")[1].lower()
    return ext if 1 < len(ext) <= 8 and ext[1:].isalnum() else ""


def _rename_ext(name: str, ext: str) -> str:
    base, old = os.path.splitext(name or "attachment")
    return (base if old else name or "attachment") + ext


def _to_webp(src: str, dst: str, max_side: int, quality: int) -> tuple[int, int, int] | None:
    """A photo as WebP (turned the right way up, scaled down to max_side, its location data left out).
    None when it can't be (no Pillow, not a still photo)."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return None
    try:
        with Image.open(src) as im:
            if getattr(im, "is_animated", False):
                return None
            im = ImageOps.exif_transpose(im)
            if max(im.size) > max_side:
                im.thumbnail((max_side, max_side), Image.LANCZOS)
            alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
            im = im.convert("RGBA" if alpha else "RGB")
            im.save(dst, "WEBP", quality=quality, method=4)
            w, h = im.size
        return w, h, os.path.getsize(dst)
    except Exception as err:  # noqa: BLE001 - keep the original
        _LOGGER.debug("Crow Messenger couldn't make %s smaller: %s", src, err)
        try:
            os.remove(dst)
        except OSError:
            pass
        return None


def _jpeg_thumb(src: str, dst: str) -> bool:
    """A small JPEG preview (for the chat list and phone notifications, which don't all show WebP)."""
    try:
        from PIL import Image, ImageOps
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
            im.save(dst, "JPEG", quality=80)
        return True
    except Exception:  # noqa: BLE001
        return False


def _walk(path: str) -> tuple[int, int]:
    total = files = 0
    for root, _dirs, names in os.walk(path):
        for n in names:
            try:
                total += os.path.getsize(os.path.join(root, n))
                files += 1
            except OSError:
                pass
    return total, files


class MediaStore:
    """The files behind every photo, video and file in Messages and the Feed."""

    def __init__(self, messenger: Messenger) -> None:
        self.m = messenger
        self.hass = messenger.hass
        self.users: dict[str, set[str]] = defaultdict(set)
        self._wake = asyncio.Event()
        self._task: asyncio.Task | None = None
        self._ffmpeg: str | None | bool = False   # False: not looked for yet
        self.tidy: dict[str, Any] = {"state": "idle"}
        self.working: str | None = None

    # ── the records ────────────────────────────────────────────────────────
    @property
    def blobs(self) -> dict[str, dict]:
        return self.m.data.setdefault("blobs", {})

    @property
    def opts(self) -> dict:
        return {**DEFAULTS, **(self.m.settings.get("storage") or {})}

    def path(self, name: str) -> str:
        return os.path.join(self.m.media_dir, os.path.basename(name))

    def name_for(self, h: str, ext: str) -> str:
        return f"b_{h}{ext}"

    @callback
    def rebuild(self) -> None:
        """Which records use each file (after loading, a reset or a restore)."""
        self.users = defaultdict(set)
        for aid, att in self.m.data["attachments"].items():
            if att.get("blob") and not att.get("removed"):
                self.users[att["blob"]].add(aid)
        for b in self.blobs.values():
            if b.get("state") == "working":
                b["state"] = "queued"

    @callback
    def add_user(self, att: dict) -> None:
        if att.get("blob"):
            self.users[att["blob"]].add(att["id"])

    def _sync_atts(self, h: str) -> None:
        """Every record using a file follows it when it's made smaller (its type, size and name)."""
        b = self.blobs.get(h)
        if not b:
            return
        ext = _ext(b["file"])
        for aid in self.users.get(h, ()):
            att = self.m.data["attachments"].get(aid)
            if not att:
                continue
            if _ext(att.get("name") or "") != ext and att.get("mime") != b["mime"]:
                att["name"] = _rename_ext(att.get("name") or "attachment", ext)
            att.update({"file": b["file"], "thumb": b.get("thumb"), "mime": b["mime"], "size": b["size"]})
            if b.get("w") and b.get("h") and _kind(b["mime"]) == "photo":
                att.update({"width": b["w"], "height": b["h"]})

    # ── new files ──────────────────────────────────────────────────────────
    async def async_ingest(self, info: dict, sha: str | None, src: str, thumb: str | None) -> None:
        """A file that's just arrived (written to src, with its preview at thumb): stored once under its
        fingerprint. When the same bytes are already here, the new copy is thrown away and the stored one used.
        Fills in info's file, thumb, blob, size and mime."""
        h = sha or await self.hass.async_add_executor_job(_sha256, src)
        b = self.blobs.get(h)
        if b and await self.hass.async_add_executor_job(os.path.isfile, self.path(b["file"])):
            # already here: the new copy goes (its preview is kept if the stored one has none)
            if thumb and not b.get("thumb"):
                tname = self.name_for(h, "_thumb.jpg")
                await self.hass.async_add_executor_job(os.replace, thumb, self.path(tname))
                b["thumb"] = tname
                thumb = None
            await self.hass.async_add_executor_job(_remove, [p for p in (src, thumb) if p])
            self._fill(info, h)
            return
        mime = info.get("mime") or "application/octet-stream"
        size = await self.hass.async_add_executor_job(_size, src)
        b = {"file": "", "thumb": None, "mime": mime, "size": size, "orig_size": size, "at": int(time.time() * 1000),
             "w": info.get("width"), "h": info.get("height"), "dur": info.get("duration"), "state": "done"}
        name = self.name_for(h, _ext(info.get("file") or info.get("name") or ""))
        converted = None
        if mime in CONVERTIBLE and self.opts["webp"]:
            webp = self.name_for(h, ".webp")
            converted = await self.hass.async_add_executor_job(_to_webp, src, self.path(webp), PHOTO_MAX_SIDE, WEBP_QUALITY)
            if converted and (converted[2] < size or max(b["w"] or 0, b["h"] or 0) > PHOTO_MAX_SIDE):
                b.update({"file": webp, "mime": "image/webp", "size": converted[2], "w": converted[0], "h": converted[1], "opt": "webp"})
            else:
                if converted:
                    await self.hass.async_add_executor_job(_remove, [self.path(webp)])
                converted = None
        if converted:
            # the photo's preview: kept as JPEG for the chat list and notifications
            if not thumb:
                tname = self.name_for(h, "_thumb.jpg")
                if await self.hass.async_add_executor_job(_jpeg_thumb, src, self.path(tname)):
                    b["thumb"] = tname
            await self.hass.async_add_executor_job(_remove, [src])
        else:
            b["file"] = name
            await self.hass.async_add_executor_job(os.replace, src, self.path(name))
        if thumb:
            tname = self.name_for(h, "_thumb.jpg")
            await self.hass.async_add_executor_job(os.replace, thumb, self.path(tname))
            b["thumb"] = tname
        if _kind(b["mime"]) == "video":
            b["state"] = "queued" if self._video_wanted(b) else "done"
        self.blobs[h] = b
        self._fill(info, h)
        self._wake.set()

    def _fill(self, info: dict, h: str) -> None:
        b = self.blobs[h]
        if info.get("mime") != b["mime"]:
            info["name"] = _rename_ext(info.get("name") or "attachment", _ext(b["file"]))
        info.update({"blob": h, "file": b["file"], "thumb": b.get("thumb"), "mime": b["mime"], "size": b["size"]})
        if _kind(b["mime"]) == "photo" and b.get("w"):
            info.update({"width": b["w"], "height": b["h"]})

    def share(self, att: dict) -> dict | None:
        """What a copy (a forward, a share to the Feed, an album) needs to use the same file. None for a file
        stored before fingerprinting (async_adopt it first)."""
        h = att.get("blob")
        if not h or h not in self.blobs:
            return None
        b = self.blobs[h]
        return {"blob": h, "file": b["file"], "thumb": b.get("thumb"), "mime": b["mime"], "size": b["size"],
                **{k: att.get(k) for k in ("name", "width", "height", "duration")}}

    async def async_adopt(self, att: dict, queue: bool = False) -> int:
        """A file stored before fingerprinting: fingerprinted and stored once (merged with an identical one).
        Answers the bytes freed. queue: also make it smaller in the background, as the settings say."""
        if att.get("blob") or att.get("removed") or not att.get("file"):
            return 0
        src = self.path(att["file"])
        tsrc = self.path(att["thumb"]) if att.get("thumb") else None
        if not await self.hass.async_add_executor_job(os.path.isfile, src):
            return 0
        h = att.get("hash") or await self.hass.async_add_executor_job(_sha256, src)
        freed = 0
        b = self.blobs.get(h)
        if b and await self.hass.async_add_executor_job(os.path.isfile, self.path(b["file"])):
            if tsrc and not b.get("thumb") and await self.hass.async_add_executor_job(os.path.isfile, tsrc):
                tname = self.name_for(h, "_thumb.jpg")
                await self.hass.async_add_executor_job(os.replace, tsrc, self.path(tname))
                b["thumb"] = tname
                tsrc = None
            freed = await self.hass.async_add_executor_job(_remove, [p for p in (src, tsrc) if p])
        else:
            size = await self.hass.async_add_executor_job(_size, src)
            name = self.name_for(h, _ext(att["file"]) or _ext(att.get("name") or ""))
            await self.hass.async_add_executor_job(os.replace, src, self.path(name))
            b = {"file": name, "thumb": None, "mime": att.get("mime") or "application/octet-stream", "size": size,
                 "orig_size": size, "at": att.get("ts") or int(time.time() * 1000), "w": att.get("width"),
                 "h": att.get("height"), "dur": att.get("duration"), "state": "done"}
            if tsrc and await self.hass.async_add_executor_job(os.path.isfile, tsrc):
                tname = self.name_for(h, "_thumb.jpg")
                await self.hass.async_add_executor_job(os.replace, tsrc, self.path(tname))
                b["thumb"] = tname
            self.blobs[h] = b
        if queue and self._wants_work(b):
            b["state"] = "queued"
        att.pop("hash", None)
        att.update({"blob": h, "file": b["file"], "thumb": b.get("thumb"), "size": b["size"]})
        self.users[h].add(att["id"])
        self.m._save()
        self._wake.set()
        return freed

    # ── files going ────────────────────────────────────────────────────────
    async def async_release(self, att: dict) -> int:
        """A record no longer needs its file: the file goes when nothing else uses it. Answers the bytes freed."""
        h = att.get("blob")
        if not h:
            paths = [self.path(x) for x in (att.get("file"), att.get("thumb")) if x]
            return await self.hass.async_add_executor_job(_remove, paths)
        users = self.users.get(h)
        if users is not None:
            users.discard(att["id"])
        if users:
            return 0
        self.users.pop(h, None)
        b = self.blobs.pop(h, None)
        if not b:
            return 0
        return await self.hass.async_add_executor_job(_remove, [self.path(x) for x in (b.get("file"), b.get("thumb")) if x])

    # ── making files smaller (in the background, one at a time) ───────────
    def _video_wanted(self, b: dict) -> bool:
        target = self.opts["video"]
        if target == "off" or b.get("opt") in (target, "shrunk") or (b.get("opt") == "720" and target == "1080"):
            return False
        w, hgt, dur = b.get("w") or 0, b.get("h") or 0, b.get("dur") or 0
        short = min(w, hgt) if w and hgt else 0
        if short and short <= int(target) and dur and b["size"] * 8 / dur < VIDEO_KEEP_BITRATE:
            return False
        return True

    def _wants_work(self, b: dict) -> bool:
        kind = _kind(b["mime"])
        if kind == "video":
            return self._video_wanted(b)
        return kind == "photo" and b["mime"] in CONVERTIBLE and bool(self.opts["webp"]) and not b.get("opt")

    @callback
    def start(self) -> Callable[[], None]:
        self._task = self.hass.async_create_background_task(self._run(), "crow_messenger storage")
        self._wake.set()

        def stop() -> None:
            if self._task:
                self._task.cancel()
        return stop

    @callback
    def wake(self) -> None:
        self._wake.set()

    def _next(self) -> tuple[str, str] | None:
        for h, b in self.blobs.items():
            if b.get("state") == "queued":
                return h, "optimise"
        days = int(self.opts.get("shrink_days") or 0)
        if days > 0:
            cutoff = int(time.time() * 1000) - days * DAY_MS
            for h, b in self.blobs.items():
                if b.get("shrunk") or b.get("state") in ("failed", "working") or _kind(b["mime"]) not in ("photo", "video"):
                    continue
                if b["mime"] == "image/gif":
                    continue
                last = max((self.m.data["attachments"].get(a, {}).get("ts") or 0 for a in self.users.get(h, ())), default=0)
                if last and last < cutoff:
                    return h, "shrink"
        return None

    async def _run(self) -> None:
        while True:
            await self._wake.wait()
            self._wake.clear()
            while job := self._next():
                h, what = job
                b = self.blobs[h]
                b["state"] = "working"
                self.working = h
                try:
                    if what == "shrink":
                        await self._shrink(h)
                    elif _kind(b["mime"]) == "video":
                        await self._video(h, int(self.opts["video"]) if self.opts["video"] != "off" else 0, False)
                    else:
                        await self._photo(h, PHOTO_MAX_SIDE, WEBP_QUALITY, False)
                    if h in self.blobs and self.blobs[h].get("state") == "working":
                        self.blobs[h]["state"] = "done"
                except asyncio.CancelledError:
                    if h in self.blobs:
                        self.blobs[h]["state"] = "queued" if what == "optimise" else "done"
                    raise
                except Exception:  # noqa: BLE001
                    _LOGGER.exception("Crow Messenger couldn't make a file smaller")
                    if h in self.blobs:
                        self.blobs[h]["state"] = "failed"
                finally:
                    self.working = None
                self.m._save()
                await asyncio.sleep(1)

    async def _swap(self, h: str, tmp: str, ext: str, mime: str, extra: dict) -> None:
        """Put a smaller version in place of a file, for every record that uses it."""
        b = self.blobs.get(h)
        if not b:   # deleted while it was being made smaller
            await self.hass.async_add_executor_job(_remove, [tmp])
            return
        old = b["file"]
        new = self.name_for(h, ext)
        await self.hass.async_add_executor_job(os.replace, tmp, self.path(new))
        if new != old:
            await self.hass.async_add_executor_job(_remove, [self.path(old)])
        size = await self.hass.async_add_executor_job(_size, self.path(new))
        b.update({"file": new, "mime": mime, "size": size, **extra})
        self._sync_atts(h)
        self.m._save()

    async def _photo(self, h: str, side: int, quality: int, shrink: bool) -> None:
        b = self.blobs[h]
        src = self.path(b["file"])
        tmp = self.path(f".tmp_{h[:16]}.webp")
        if not b.get("thumb") and not shrink:
            tname = self.name_for(h, "_thumb.jpg")
            if await self.hass.async_add_executor_job(_jpeg_thumb, src, self.path(tname)):
                b["thumb"] = tname
        res = await self.hass.async_add_executor_job(_to_webp, src, tmp, side, quality)
        if not res or res[2] >= b["size"] * 0.95:
            await self.hass.async_add_executor_job(_remove, [tmp])
            b["opt"] = b.get("opt") or "webp"
            if shrink:
                b["shrunk"] = True
            return
        await self._swap(h, tmp, ".webp", "image/webp", {"w": res[0], "h": res[1], "opt": "webp", **({"shrunk": True} if shrink else {})})

    def _ffmpeg_bin(self) -> str | None:
        if self._ffmpeg is False:
            path = None
            try:
                from homeassistant.components.ffmpeg import DATA_FFMPEG
                mgr = self.hass.data.get(DATA_FFMPEG)
                path = getattr(mgr, "binary", None)
            except ImportError:
                pass
            self._ffmpeg = path if path and shutil.which(path) else shutil.which("ffmpeg")
            if not self._ffmpeg:
                _LOGGER.info("Crow Messenger: ffmpeg isn't available, so videos are kept as they were sent")
        return self._ffmpeg or None

    async def _video(self, h: str, side: int, shrink: bool) -> None:
        b = self.blobs[h]
        ff = self._ffmpeg_bin()
        if not ff or not side:
            if shrink:
                b["shrunk"] = True
            return
        src = self.path(b["file"])
        tmp = self.path(f".tmp_{h[:16]}.mp4")
        crf = 30 if shrink else VIDEO_CRF.get(str(side), 26)
        scale = (f"scale='if(gte(iw,ih),-2,trunc(min({side},iw)/2)*2)':"
                 f"'if(gte(iw,ih),trunc(min({side},ih)/2)*2,-2)'")
        cmd = [ff, "-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", src,
               "-map", "0:v:0", "-map", "0:a:0?", "-vf", scale,
               "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "96k" if shrink else "128k", "-movflags", "+faststart", "-threads", "2", tmp]
        if shutil.which("nice"):
            cmd = ["nice", "-n", "15", *cmd]
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
        limit = max(300, int((b.get("dur") or 60) * 10))
        try:
            _out, err = await asyncio.wait_for(proc.communicate(), timeout=limit)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            await self.hass.async_add_executor_job(_remove, [tmp])
            raise RuntimeError(f"ffmpeg took more than {limit} s") from None
        except asyncio.CancelledError:
            proc.kill()
            await self.hass.async_add_executor_job(_remove, [tmp])
            raise
        size = await self.hass.async_add_executor_job(_size, tmp)
        opt = "shrunk" if shrink else str(side)
        if proc.returncode != 0 or not size or size >= b["size"] * 0.85:
            if proc.returncode != 0:
                _LOGGER.debug("Crow Messenger: ffmpeg couldn't re-encode a video: %s", (err or b"")[-400:])
            await self.hass.async_add_executor_job(_remove, [tmp])
            if h in self.blobs:
                self.blobs[h]["opt"] = opt
                if shrink:
                    self.blobs[h]["shrunk"] = True
            return
        await self._swap(h, tmp, ".mp4", "video/mp4", {"opt": opt, **({"shrunk": True} if shrink else {})})

    async def _shrink(self, h: str) -> None:
        b = self.blobs[h]
        if _kind(b["mime"]) == "video":
            await self._video(h, SHRINK_VIDEO_SIDE, True)
        else:
            await self._photo(h, SHRINK_PHOTO_SIDE, 72, True)
        if h in self.blobs:
            self.blobs[h]["shrunk"] = True

    # ── duplicates already on the server ──────────────────────────────────
    @callback
    def start_tidy(self, apply: bool) -> dict:
        if self.tidy.get("state") == "running":
            return self.tidy
        self.tidy = {"state": "running", "apply": apply, "done": 0, "total": 0, "started": int(time.time() * 1000)}
        self.hass.async_create_background_task(self._tidy(apply), "crow_messenger tidy")
        return self.tidy

    async def _tidy(self, apply: bool) -> None:
        try:
            atts = [a for a in self.m.data["attachments"].values() if not a.get("blob") and not a.get("removed") and a.get("file")]
            self.tidy["total"] = len(atts)
            groups: dict[str, list[dict]] = defaultdict(list)
            for a in atts:
                path = self.path(a["file"])
                if not await self.hass.async_add_executor_job(os.path.isfile, path):
                    self.tidy["done"] += 1
                    continue
                a["hash"] = a.get("hash") or await self.hass.async_add_executor_job(_sha256, path)
                groups[a["hash"]].append(a)
                self.tidy["done"] += 1
            dupes = dupe_bytes = 0
            for h, lst in groups.items():
                extra = len(lst) - (0 if h in self.blobs else 1)
                if extra > 0:
                    dupes += extra
                    dupe_bytes += sum(int(a.get("size") or 0) for a in lst[-extra:])
            res: dict[str, Any] = {"duplicates": dupes, "duplicate_bytes": dupe_bytes, "older_files": len(atts)}
            if apply:
                freed = 0
                for lst in groups.values():
                    for a in lst:
                        freed += await self.async_adopt(a, queue=True)
                for b in self.blobs.values():
                    if b.get("state") in ("done", None) and self._wants_work(b):
                        b["state"] = "queued"
                sweep = await self.async_sweep()
                res.update({"freed": freed + sweep["bytes"], "stray": sweep["files"]})
            else:
                videos = photos = vb = pb = 0
                for h, lst in groups.items():
                    a = lst[0]
                    probe = {"mime": a.get("mime") or "", "size": int(a.get("size") or 0), "w": a.get("width"),
                             "h": a.get("height"), "dur": a.get("duration")}
                    if self._wants_work(probe):
                        if _kind(probe["mime"]) == "video":
                            videos, vb = videos + 1, vb + probe["size"]
                        else:
                            photos, pb = photos + 1, pb + probe["size"]
                for b in self.blobs.values():
                    if b.get("state") in ("done", None) and self._wants_work(b):
                        if _kind(b["mime"]) == "video":
                            videos, vb = videos + 1, vb + b["size"]
                        else:
                            photos, pb = photos + 1, pb + b["size"]
                stray = await self.async_sweep(dry=True)
                res.update({"videos": videos, "video_bytes": vb, "photos": photos, "photo_bytes": pb,
                            "stray": stray["files"], "stray_bytes": stray["bytes"]})
            self.tidy.update({"state": "done", "result": res, "finished": int(time.time() * 1000)})
            self.m._save()
            self._wake.set()
        except Exception as err:  # noqa: BLE001
            _LOGGER.exception("Crow Messenger couldn't tidy the server's files")
            self.tidy.update({"state": "failed", "error": str(err)[:200]})

    # ── files nothing points at ────────────────────────────────────────────
    async def async_sweep(self, dry: bool = False, min_age: int = STRAY_MIN_AGE) -> dict:
        """Files in the media folder that no message, post or upload uses (left by a crash, a reset or an
        older version). Only files at least a day old go, so an upload in progress is never touched."""
        for h in [h for h in self.blobs if not self.users.get(h)]:
            b = self.blobs[h]
            if int(time.time() * 1000) - (b.get("at") or 0) > min_age * 1000:
                if not dry:
                    self.blobs.pop(h, None)
        keep = {os.path.basename(x) for b in self.blobs.values() for x in (b.get("file"), b.get("thumb")) if x}
        keep |= {os.path.basename(x) for a in self.m.data["attachments"].values() for x in (a.get("file"), a.get("thumb")) if x}
        media = self.m.media_dir

        def run() -> dict:
            files = size = 0
            now = time.time()
            for name in os.listdir(media):
                p = os.path.join(media, name)
                if name in keep or not os.path.isfile(p):
                    continue
                try:
                    st = os.stat(p)
                except OSError:
                    continue
                if now - st.st_mtime < min_age:
                    continue
                files += 1
                size += st.st_size
                if not dry:
                    try:
                        os.remove(p)
                    except OSError:
                        files -= 1
                        size -= st.st_size
            return {"files": files, "bytes": size}

        res = await self.hass.async_add_executor_job(run)
        if not dry:
            self.m.data["storage_sweep"] = {"at": int(time.time() * 1000), **res}
            self.m._save()
        return res

    async def async_maybe_sweep(self) -> None:
        last = (self.m.data.get("storage_sweep") or {}).get("at") or 0
        if int(time.time() * 1000) - last >= SWEEP_EVERY_MS:
            await self.async_sweep()
        self._wake.set()

    # ── what's on the server ──────────────────────────────────────────────
    async def async_report(self) -> dict:
        disk, files = await self.hass.async_add_executor_job(_walk, self.m.media_dir)
        atts = self.m.data["attachments"]
        kinds = {k: {"count": 0, "bytes": 0} for k in ("video", "photo", "audio", "file")}
        areas = {"messages": 0, "feed": 0}
        sent_bytes = saved_dupes = saved_smaller = 0
        queued = 0
        largest = []
        for h, b in self.blobs.items():
            users = [atts[a] for a in self.users.get(h, ()) if a in atts]
            if not users:
                continue
            k = kinds[_kind(b["mime"])]
            k["count"] += 1
            k["bytes"] += b["size"]
            orig = b.get("orig_size") or b["size"]
            sent_bytes += orig * len(users)
            saved_dupes += orig * (len(users) - 1)
            saved_smaller += max(0, orig - b["size"])
            queued += b.get("state") in ("queued", "working")
            where = {"feed" if (u.get("feed") or u.get("cover_of")) else "messages" for u in users}
            for w in where:
                areas[w] += b["size"]
            first = min(users, key=lambda u: u.get("ts") or 0)
            largest.append({"name": first.get("name") or "attachment", "kind": _kind(b["mime"]), "size": b["size"],
                            "uses": len(users), "where": sorted(where), "ts": first.get("ts")})
        older = 0
        for a in atts.values():
            if a.get("blob") or a.get("removed") or not a.get("file"):
                continue
            older += 1
            size = int(a.get("size") or 0)
            k = kinds[_kind(a.get("mime") or "")]
            k["count"] += 1
            k["bytes"] += size
            sent_bytes += size
            areas["feed" if (a.get("feed") or a.get("cover_of")) else "messages"] += size
            largest.append({"name": a.get("name") or "attachment", "kind": _kind(a.get("mime") or ""), "size": size,
                            "uses": 1, "where": ["feed" if a.get("feed") else "messages"], "ts": a.get("ts")})
        largest.sort(key=lambda x: -x["size"])
        o = self.opts
        return {
            "disk_bytes": disk, "disk_files": files, "kinds": kinds, "areas": areas,
            "sent_bytes": sent_bytes, "saved_duplicates": saved_dupes, "saved_smaller": saved_smaller,
            "queued": queued, "working": bool(self.working), "older_files": older, "largest": largest[:8],
            "sweep": self.m.data.get("storage_sweep"), "tidy": self.tidy,
            "ffmpeg": bool(self._ffmpeg_bin()) if o["video"] != "off" else None,
            "options": o,
        }

