/*
 * Crow Messenger Card
 * Private messages, group chats, attachments and contacts between Home Assistant users.
 * Ships inside the crow_messenger integration (loaded into every dashboard automatically).
 * https://github.com/jamesmcginnis/crow-messenger
 */
(() => {
'use strict';
const CM_VERSION = '2.0.5';
// when this copy of the card was built (shown at the bottom of the visual editor)
const CM_BUILD = '20 Oct 2026 14:20';

// ── Icons (24×24, stroke = currentColor unless noted) ─────────────────────────
const _s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const _f = (d) => `<svg viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;
const ARCH_ICON = _s('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V9M10 13h4"/>');
const REMIND_ICON = _s('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.6 1.6M5 3.5L2.8 5.6M19 3.5l2.2 2.1"/>');
const ICON = {
  back: _s('<path d="M15 19l-7-7 7-7"/>', 'stroke-width="2.4"'),
  chevR: _s('<path d="M9 6l6 6-6 6"/>', 'stroke-width="2.4"'),
  chevD: _s('<path d="M6 9l6 6 6-6"/>', 'stroke-width="2.4"'),
  filter: _s('<path d="M4 7h16M7 12h10M10 17h4"/>', 'stroke-width="2.2"'),
  search: _s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 'stroke-width="2.3"'),
  // Ask: the search magnifier with a question mark in the lens
  askSearch: _s('<circle cx="10.5" cy="10.5" r="7.5"/><path d="M21 21l-5.2-5.2"/><path d="M8.4 8.6a2.2 2.2 0 014.2.9c0 1.5-2.1 1.9-2.1 3" stroke-width="1.9"/><circle cx="10.5" cy="14.6" r="0.6" fill="currentColor" stroke="none"/>', 'stroke-width="2.2"'),
  mic: _s('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
  compose: _s('<path d="M12 4H6.5A2.5 2.5 0 004 6.5v11A2.5 2.5 0 006.5 20h11a2.5 2.5 0 002.5-2.5V12"/><path d="M18.4 2.8a2 2 0 112.8 2.8L12.5 14.3 9 15l.7-3.5z"/>'),
  plus: _s('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.4"'),
  x: _s('<path d="M6 6l12 12M18 6L6 18"/>', 'stroke-width="2.4"'),
  up: _s('<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>', 'stroke-width="2.8"'),
  wave: _s('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>', 'stroke-width="2.2"'),
  phone: _f('<path d="M20.6 16.3l-3.4-1.5a1.6 1.6 0 00-1.9.5l-1.1 1.4a12.6 12.6 0 01-5-5l1.4-1.1a1.6 1.6 0 00.5-1.9L9.6 3.4a1.6 1.6 0 00-1.8-.9L4.6 3.3A1.6 1.6 0 003.4 5 17.6 17.6 0 0019 20.6a1.6 1.6 0 001.7-1.2l.8-3.2a1.6 1.6 0 00-.9-1.9z"/>'),
  video: _f('<rect x="2" y="6" width="13.5" height="12" rx="3"/><path d="M17 10.2l4.2-2.6a.6.6 0 01.9.5v7.8a.6.6 0 01-.9.5L17 13.8z"/>'),
  mail: _f('<path d="M3.5 5h17A1.5 1.5 0 0122 6.5v.3l-10 6.4L2 6.8v-.3A1.5 1.5 0 013.5 5z"/><path d="M2 8.6l10 6.3 10-6.3v8.9a1.5 1.5 0 01-1.5 1.5h-17A1.5 1.5 0 012 17.5z"/>'),
  mailO: _s('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 6.5l9 6.5 9-6.5"/>'),
  bubble: _f('<path d="M12 3C6.5 3 2 6.6 2 11.1c0 2.5 1.4 4.8 3.6 6.3-.2 1.3-.9 2.5-2 3.5 2.2 0 4.1-.8 5.5-2 1 .2 1.9.3 2.9.3 5.5 0 10-3.6 10-8.1S17.5 3 12 3z"/>'),
  pen: _s('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/><path d="M14 20h6"/>'),
  shorter: _s('<path d="M4 7h16M4 12h11M4 17h6"/>'),
  smile: _s('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1.9 2 5.1 2 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>'),
  caption: _s('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 15h6M7 11h10"/>'),
  todo: _s('<circle cx="6" cy="7" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="6" cy="17" r="1.6"/><path d="M10.5 7H20M10.5 12H20M10.5 17H20"/>'),
  wallpaper: _s('<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M5 14.5c2.3-1.8 4.7-1.8 7 0s4.7 1.8 7 0"/><path d="M5 18c2.3-1.8 4.7-1.8 7 0s4.7 1.8 7 0"/>'),
  undo: _s('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>'),
  palette: _s('<path d="M12 3a9 9 0 100 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/><circle cx="17" cy="11" r="1.2"/>'),
  sparkle: _s('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  pin: _s('<path d="M12 21.5s-7-6.3-7-12a7 7 0 1114 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  cal: _s('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  link: _s('<path d="M10 13.5a4.5 4.5 0 006.8.5l2.7-2.7a4.5 4.5 0 00-6.4-6.4l-1.5 1.5"/><path d="M14 10.5a4.5 4.5 0 00-6.8-.5l-2.7 2.7a4.5 4.5 0 006.4 6.4l1.5-1.5"/>'),
  person: _s('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  personFill: _f('<circle cx="12" cy="8" r="4.6"/><path d="M3.5 21.5c0-4.9 3.8-7.8 8.5-7.8s8.5 2.9 8.5 7.8z"/>'),
  contacts: _s('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3.3"/><path d="M6 18.6c1.3-2.3 3.5-3.5 6-3.5s4.7 1.2 6 3.5"/>'),
  addPerson: _s('<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.1-6.8 7-6.8s7 2.8 7 6.8M19 8v6M16 11h6"/>'),
  check: _s('<path d="M5 12.5l4.5 4.5L19 7"/>', 'stroke-width="2.6"'),
  trash: _s('<path d="M3.5 6h17M9 6V4h6v2M6 6l1 14.5h10L18 6M10 10.5v6M14 10.5v6"/>'),
  bellOff: _s('<path d="M13.7 21a2 2 0 01-3.4 0M18.6 13A17.9 17.9 0 0118 8M6.3 6.3A6 6 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.3-5M2 2l20 20"/>'),
  bell: _s('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>'),
  camera: _s('<path d="M3 8.5A2.5 2.5 0 015.5 6H7l2-2.5h6L17 6h1.5A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z"/><circle cx="12" cy="12.5" r="3.8"/>'),
  photo: _s('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15.5l-5-5L5.5 20"/>'),
  doc: _s('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>'),
  info: _s('<circle cx="12" cy="12" r="9.3"/><path d="M12 11v5.5M12 7.6h.01"/>', 'stroke-width="2.2"'),
  play: _f('<path d="M8 4.8v14.4a.8.8 0 001.2.7l11.3-7.2a.8.8 0 000-1.4L9.2 4.1A.8.8 0 008 4.8z"/>'),
  pause: _f('<rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/>'),
  share: _s('<path d="M12 3.5v12M8 7.5l4-4 4 4"/><path d="M6.5 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-.5"/>'),
  download: _s('<path d="M12 3.5v12M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 20.5h15"/>'),
  copy: _s('<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0013.5 3h-8A2.5 2.5 0 003 5.5v8A2.5 2.5 0 005.5 16H8"/>'),
  more: _f('<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>'),
  leave: _s('<path d="M9 21H5.5A2.5 2.5 0 013 18.5v-13A2.5 2.5 0 015.5 3H9M16 17l5-5-5-5M21 12H9"/>'),
  globe: _s('<circle cx="12" cy="12" r="9.3"/><path d="M2.7 12h18.6M12 2.7c2.6 2.6 3.8 5.7 3.8 9.3s-1.2 6.7-3.8 9.3c-2.6-2.6-3.8-5.7-3.8-9.3S9.4 5.3 12 2.7z"/>'),
  at: _s('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.9 7.9"/>'),
  people: _s('<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20c0-3.7 2.9-6.2 6.5-6.2s6.5 2.5 6.5 6.2"/><path d="M16 4.6a3.6 3.6 0 010 7M18.3 14.2c1.9.8 3.2 2.9 3.2 5.8"/>'),
  star: _s('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>'),
  starFill: _f('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>'),
  ha: _f('<path d="M12 2.6l9.4 8.2a.9.9 0 01-.6 1.6H19v8a1 1 0 01-1 1h-4.2v-5.2h-3.6v5.2H6a1 1 0 01-1-1v-8H3.2a.9.9 0 01-.6-1.6z"/>'),
  stop: _f('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>'),
  sms: _s('<path d="M21 11.5c0 4.2-4 7.5-9 7.5-1 0-2-.1-2.9-.4L4 20.5l1.3-3.6C3.9 15.6 3 13.6 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5z"/>'),
  minusCircle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FF3B30"/><path d="M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  plusCircle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#34C759"/><path d="M7 12h10M12 7v10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

// ── Small helpers ────────────────────────────────────────────────────────────
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid8 = () => Math.random().toString(36).slice(2, 10);
const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/.test(navigator.userAgent);
const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;
const fmtBytes = (n) => !n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(1)} GB`;
const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function hashHue(str) {
  let h = 0;
  for (const ch of String(str || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h % 360;
}

function initials(name) {
  const parts = String(name || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*\s*){1,3}$/u;

function linkify(text) {
  const out = esc(text);
  return out.replace(/\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi, (m) => {
    const href = m.startsWith('http') ? m : `https://${m}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });
}

// ── Dates ────────────────────────────────────────────────────────────────────
function locale(hass) { return hass?.locale?.language || navigator.language || 'en-GB'; }
function hour12(hass) {
  const f = hass?.locale?.time_format;
  if (f === '12') return true;
  if (f === '24') return false;
  return undefined;
}
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtTime(ts, hass) { return new Date(ts).toLocaleTimeString(locale(hass), { hour: 'numeric', minute: '2-digit', hour12: hour12(hass) }); }
function fmtListDate(ts, hass) {
  const d = new Date(ts), now = new Date();
  if (sameDay(d, now)) return fmtTime(ts, hass);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  if (now - d < 6 * 86400000) return d.toLocaleDateString(locale(hass), { weekday: 'long' });
  return d.toLocaleDateString(locale(hass), { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtStamp(ts, hass) {
  const d = new Date(ts), now = new Date(), t = fmtTime(ts, hass);
  if (sameDay(d, now)) return `<b>Today</b> ${t}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return `<b>Yesterday</b> ${t}`;
  if (now - d < 6 * 86400000) return `<b>${d.toLocaleDateString(locale(hass), { weekday: 'long' })}</b> ${t}`;
  return `<b>${d.toLocaleDateString(locale(hass), { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })}</b> at ${t}`;
}
function fmtLongDate(iso, hass) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}|-{1,2})-?(\d{2})-?(\d{2})$/);
  if (!m) return iso;
  const noYear = !/^\d{4}$/.test(m[1]);
  const d = new Date(noYear ? 2000 : +m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString(locale(hass), noYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Images ───────────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function resizeToBlob(file, max, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
    return { blob, width: img.naturalWidth, height: img.naturalHeight, outW: w, outH: h };
  } finally { URL.revokeObjectURL(url); }
}

// Chat backgrounds: scaled to fit any screen without being huge to store.
async function fileToBackground(file) {
  const r = await resizeToBlob(file, 1800, 0.82);
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(r.blob); });
}

async function fileToAvatar(file, size = 320) {
  const url = URL.createObjectURL(file);
  try { return await srcToAvatar(url, size); } finally { URL.revokeObjectURL(url); }
}
async function srcToAvatar(src, size = 320) {
  const img = await loadImage(src);
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.82);
}

async function videoInfo(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 8000); });
    v.currentTime = Math.min(0.2, (v.duration || 1) / 2);
    await new Promise(res => { v.onseeked = res; setTimeout(res, 2000); });
    const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const thumb = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
    return { thumb, width: v.videoWidth, height: v.videoHeight, duration: v.duration };
  } catch (e) { return {}; } finally { URL.revokeObjectURL(url); }
}

async function averageColour(src) {
  try {
    const img = await loadImage(src);
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 16, 16);
    const d = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return [r / n, g / n, b / n].map(Math.round);
  } catch (e) { return null; }
}

// ── vCard ────────────────────────────────────────────────────────────────────
const VC_LABEL = (l) => {
  const v = String(l || '').replace(/^_\$!<(.*)>!\$_$/, '$1').trim().toLowerCase();
  return ({ homefax: 'home fax', workfax: 'work fax', otherfax: 'other fax', homepage: 'homepage' })[v] || v;
};
const vcUnesc = (v) => String(v || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
const vcEsc = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function qpDecode(str) {
  const bytes = [];
  str = str.replace(/=\r?\n/g, '');
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '=' && /^[0-9A-F]{2}$/i.test(str.substr(i + 1, 2))) { bytes.push(parseInt(str.substr(i + 1, 2), 16)); i += 2; }
    else bytes.push(str.charCodeAt(i));
  }
  try { return new TextDecoder().decode(new Uint8Array(bytes)); } catch (e) { return str; }
}

const PHONE_TYPES = { cell: 'mobile', mobile: 'mobile', iphone: 'iPhone', home: 'home', work: 'work', main: 'main', pager: 'pager', other: 'other', voice: '' };

function parseVCards(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const cards = [];
  let cur = null, labels = {};
  for (let raw of lines) {
    if (!raw.trim()) continue;
    const colon = raw.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    if (colon < 0) continue;
    let key = raw.slice(0, colon), value = raw.slice(colon + 1);
    const up = key.toUpperCase();
    if (up === 'BEGIN' && value.toUpperCase() === 'VCARD') { cur = { _items: {} }; labels = {}; continue; }
    if (up === 'END' && cur) { cards.push(finishVCard(cur, labels)); cur = null; continue; }
    if (!cur) continue;
    let group = '';
    const dot = key.indexOf('.');
    if (dot > 0 && dot < key.indexOf(';') || (dot > 0 && key.indexOf(';') < 0)) { group = key.slice(0, dot); key = key.slice(dot + 1); }
    const [nameRaw, ...paramParts] = key.split(';');
    const name = nameRaw.toUpperCase();
    const params = {};
    const types = [];
    for (const p of paramParts) {
      const [pk, pv] = p.includes('=') ? p.split('=') : ['TYPE', p];
      const k = pk.toUpperCase();
      params[k] = (pv || '').replace(/^"|"$/g, '');
      if (k === 'TYPE') types.push(...params[k].toLowerCase().split(','));
    }
    if ((params.ENCODING || '').toUpperCase() === 'QUOTED-PRINTABLE') value = qpDecode(value);
    if (name === 'X-ABLABEL') { labels[group] = VC_LABEL(vcUnesc(value)); continue; }
    (cur[name] = cur[name] || []).push({ value, params, types, group });
  }
  return cards;
}

function finishVCard(v, labels) {
  const c = {};
  const lab = (it, fallback) => (it.group && labels[it.group]) || fallback;
  const first = (k) => v[k]?.[0]?.value;
  if (v.N) {
    const p = v.N[0].value.split(/(?<!\\);/).map(vcUnesc);
    [c.last, c.first, c.middle, c.prefix, c.suffix] = p;
  }
  if (!c.first && !c.last && first('FN')) c.first = vcUnesc(first('FN'));
  if (first('NICKNAME')) c.nickname = vcUnesc(first('NICKNAME'));
  if (first('ORG')) { const o = first('ORG').split(/(?<!\\);/).map(vcUnesc); c.company = o[0]; if (o[1]) c.department = o[1]; }
  if (first('TITLE')) c.job_title = vcUnesc(first('TITLE'));
  if (first('X-PHONETIC-FIRST-NAME')) c.phonetic_first = vcUnesc(first('X-PHONETIC-FIRST-NAME'));
  if (first('X-PHONETIC-LAST-NAME')) c.phonetic_last = vcUnesc(first('X-PHONETIC-LAST-NAME'));
  if (first('PRONOUNS')) c.pronouns = vcUnesc(first('PRONOUNS'));
  if (first('NOTE')) c.notes = vcUnesc(first('NOTE'));
  c.phones = (v.TEL || []).map(t => {
    let label = '';
    if (t.types.includes('fax')) label = t.types.includes('work') ? 'work fax' : 'home fax';
    else for (const ty of t.types) if (PHONE_TYPES[ty] !== undefined && PHONE_TYPES[ty]) { label = PHONE_TYPES[ty]; if (ty === 'iphone') break; }
    return { label: lab(t, label || 'phone'), value: vcUnesc(t.value.replace(/^tel:/i, '')) };
  });
  c.emails = (v.EMAIL || []).map(t => ({ label: lab(t, t.types.find(x => ['home', 'work', 'school', 'icloud', 'other'].includes(x)) || 'email'), value: vcUnesc(t.value) }));
  c.urls = (v.URL || []).map(t => ({ label: lab(t, t.types.find(x => ['home', 'work'].includes(x)) || 'homepage'), value: vcUnesc(t.value) }));
  c.addresses = (v.ADR || []).map(t => {
    const p = t.value.split(/(?<!\\);/).map(vcUnesc);
    return { label: lab(t, t.types.find(x => ['home', 'work', 'school', 'other'].includes(x)) || 'home'), street: [p[1], p[2]].filter(Boolean).join('\n'), city: p[3] || '', county: p[4] || '', postcode: p[5] || '', country: p[6] || '' };
  });
  const bday = first('BDAY');
  if (bday) c.birthday = normDate(bday);
  c.dates = (v['X-ABDATE'] || v.ANNIVERSARY || []).map(t => ({ label: lab(t, 'anniversary'), value: normDate(t.value) })).filter(d => d.value);
  c.related = (v['X-ABRELATEDNAMES'] || []).map(t => ({ label: lab(t, 'other'), value: vcUnesc(t.value) }));
  c.social = (v['X-SOCIALPROFILE'] || []).map(t => {
    const service = (t.types[0] || t.params['X-SERVICE'] || 'profile');
    const user = t.params['X-USER'] || vcUnesc(t.value).replace(/^x-apple:/, '').split('/').filter(Boolean).pop();
    return { label: service.toLowerCase(), value: user || vcUnesc(t.value) };
  });
  const photo = v.PHOTO?.[0];
  if (photo) {
    if (/^data:image\//.test(photo.value)) c._photoSrc = photo.value;
    else if ((photo.params.ENCODING || '').toLowerCase() === 'b' || (photo.params.ENCODING || '').toLowerCase() === 'base64') {
      const t = (photo.types.find(x => /jpe?g|png|gif|heic/.test(x)) || 'jpeg').replace('jpg', 'jpeg');
      c._photoSrc = `data:image/${t};base64,${photo.value.replace(/\s/g, '')}`;
    }
  }
  for (const k of ['phones', 'emails', 'urls', 'addresses', 'dates', 'related', 'social']) if (!c[k]?.length) delete c[k];
  return c;
}

function normDate(v) {
  v = String(v || '').trim().split('T')[0];
  let m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (m) return m[1] === '1604' ? `--${m[2]}-${m[3]}` : `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^--(\d{2})-?(\d{2})$/);
  if (m) return `--${m[1]}-${m[2]}`;
  return '';
}

function contactToVCard(c) {
  const L = ['BEGIN:VCARD', 'VERSION:3.0'];
  L.push(`N:${[c.last, c.first, c.middle, c.prefix, c.suffix].map(vcEsc).join(';')}`);
  L.push(`FN:${vcEsc(contactName(c, 'first'))}`);
  if (c.nickname) L.push(`NICKNAME:${vcEsc(c.nickname)}`);
  if (c.company || c.department) L.push(`ORG:${vcEsc(c.company)};${vcEsc(c.department)}`);
  if (c.job_title) L.push(`TITLE:${vcEsc(c.job_title)}`);
  if (c.phonetic_first) L.push(`X-PHONETIC-FIRST-NAME:${vcEsc(c.phonetic_first)}`);
  if (c.phonetic_last) L.push(`X-PHONETIC-LAST-NAME:${vcEsc(c.phonetic_last)}`);
  let item = 0;
  const custom = (prop, value, label) => { item++; L.push(`item${item}.${prop}:${value}`); L.push(`item${item}.X-ABLabel:${vcEsc(label)}`); };
  const tel = { mobile: 'CELL', iphone: 'IPHONE', home: 'HOME', work: 'WORK', main: 'MAIN', pager: 'PAGER', 'home fax': 'HOME,FAX', 'work fax': 'WORK,FAX', other: 'OTHER' };
  for (const p of c.phones || []) { const t = tel[(p.label || '').toLowerCase()]; if (t) L.push(`TEL;type=${t};type=VOICE:${vcEsc(p.value)}`); else custom('TEL', vcEsc(p.value), p.label || 'phone'); }
  for (const e of c.emails || []) { const t = ['home', 'work', 'other'].includes((e.label || '').toLowerCase()); if (t) L.push(`EMAIL;type=INTERNET;type=${e.label.toUpperCase()}:${vcEsc(e.value)}`); else custom('EMAIL;type=INTERNET', vcEsc(e.value), e.label || 'email'); }
  for (const a of c.addresses || []) {
    const v = `;;${vcEsc(a.street)};${vcEsc(a.city)};${vcEsc(a.county)};${vcEsc(a.postcode)};${vcEsc(a.country)}`;
    if (['home', 'work'].includes((a.label || '').toLowerCase())) L.push(`ADR;type=${a.label.toUpperCase()}:${v}`); else custom('ADR', v, a.label || 'address');
  }
  for (const u of c.urls || []) custom('URL', vcEsc(u.value), u.label || 'homepage');
  if (c.birthday) L.push(`BDAY:${c.birthday.startsWith('--') ? c.birthday : c.birthday}`);
  for (const d of c.dates || []) custom('X-ABDATE', d.value, d.label === 'anniversary' ? '_$!<Anniversary>!$_' : (d.label || 'other'));
  for (const r of c.related || []) custom('X-ABRELATEDNAMES', vcEsc(r.value), `_$!<${(r.label || 'other').replace(/^./, s => s.toUpperCase())}>!$_`);
  for (const s of c.social || []) L.push(`X-SOCIALPROFILE;type=${vcEsc(s.label || 'profile')};x-user=${vcEsc(s.value)}:${vcEsc(socialUrl(s) || s.value)}`);
  if (c.notes) L.push(`NOTE:${vcEsc(c.notes)}`);
  if (c.photo) { const m = c.photo.match(/^data:image\/(\w+);base64,(.*)$/); if (m) L.push(`PHOTO;ENCODING=b;TYPE=${m[1].toUpperCase()}:${m[2]}`); }
  L.push('END:VCARD');
  return L.join('\r\n');
}

// ── Contacts: names, labels, links ───────────────────────────────────────────
function contactName(c, order = 'first') {
  if (!c) return '';
  const parts = order === 'last'
    ? [c.prefix, c.last, c.first, c.middle, c.suffix]
    : [c.prefix, c.first, c.middle, c.last, c.suffix];
  const n = parts.filter(Boolean).join(' ').trim();
  return n || c.company || c.nickname || c.phones?.[0]?.value || c.emails?.[0]?.value || 'No Name';
}
function contactSortKey(c, order = 'last') {
  const k = order === 'last' ? (c.last || c.first) : (c.first || c.last);
  return (k || c.company || c.nickname || '').trim();
}
function contactLetter(c, order) {
  const ch = contactSortKey(c, order).normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

const LABELS = {
  phones: ['mobile', 'iPhone', 'home', 'work', 'school', 'main', 'SIP', 'home fax', 'work fax', 'pager', 'other'],
  emails: ['home', 'work', 'iCloud', 'school', 'other'],
  urls: ['homepage', 'home', 'work', 'school', 'other'],
  addresses: ['home', 'work', 'school', 'other'],
  dates: ['anniversary', 'other'],
  related: ['mother', 'father', 'parent', 'brother', 'sister', 'child', 'son', 'daughter', 'friend', 'spouse', 'wife', 'husband', 'partner', 'grandparent', 'grandchild', 'assistant', 'manager', 'other'],
  social: ['X', 'Facebook', 'Instagram', 'LinkedIn', 'Threads', 'Bluesky', 'Mastodon', 'TikTok', 'YouTube', 'Snapchat', 'Flickr', 'other'],
};
const SOCIAL_URL = {
  x: u => `https://x.com/${u}`, twitter: u => `https://x.com/${u}`, facebook: u => `https://facebook.com/${u}`,
  instagram: u => `https://instagram.com/${u}`, linkedin: u => `https://www.linkedin.com/in/${u}`, threads: u => `https://www.threads.net/@${u}`,
  bluesky: u => `https://bsky.app/profile/${u}`, tiktok: u => `https://www.tiktok.com/@${u}`, youtube: u => `https://www.youtube.com/@${u}`,
  snapchat: u => `https://www.snapchat.com/add/${u}`, flickr: u => `https://www.flickr.com/people/${u}`,
};
function socialUrl(s) {
  const v = String(s.value || '').trim().replace(/^@/, '');
  if (/^https?:\/\//i.test(v)) return v;
  const key = String(s.label || '').toLowerCase();
  if (key === 'mastodon') { const m = v.match(/^([^@]+)@(.+)$/); return m ? `https://${m[2]}/@${m[1]}` : ''; }
  return SOCIAL_URL[key] ? SOCIAL_URL[key](encodeURIComponent(v)) : '';
}
function formatAddress(a) {
  return [a.street, [a.city, a.county].filter(Boolean).join(a.city && a.county ? '\n' : ''), a.postcode, a.country]
    .filter(Boolean).join('\n');
}
function mapsUrl(addr) {
  const q = encodeURIComponent(addr.replace(/\n/g, ', '));
  if (isApple()) return `https://maps.apple.com/?q=${q}`;
  if (isAndroid()) return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
function telValue(v) { return String(v || '').replace(/[^\d+*#,;]/g, ''); }

// Open tel:/mailto:/facetime:/maps etc.
// The Home Assistant iPhone/iPad app ignores these as normal links: it only hands
// a link to iOS (Mail, Phone, FaceTime, Maps) when it opens in a new window. So in
// that app every outside link opens as a new window; elsewhere only web pages do
// (a mailto: in a new tab would leave an empty tab behind).
function inIosApp() { return !!window.webkit?.messageHandlers?.externalBus; }
function linkTarget(url) { return /^https?:/i.test(url) || inIosApp() ? '_blank' : ''; }
function openExternal(url) {
  if (/^https?:/i.test(url) && !inIosApp()) {
    const w = window.open(url, '_blank', 'noopener');
    if (!w) window.location.href = url;
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  if (linkTarget(url)) a.target = '_blank';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 500);
}

function icsForDate(title, iso) {
  const m = String(iso).match(/^(\d{4}|-{1,2})-?(\d{2})-?(\d{2})$/);
  if (!m) return null;
  const now = new Date();
  const year = /^\d{4}$/.test(m[1]) ? m[1] : String(now.getFullYear());
  const d = `${year}${m[2]}${m[3]}`;
  const next = new Date(+year, +m[2] - 1, +m[3] + 1);
  const d2 = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crow Messenger//EN', 'BEGIN:VEVENT',
    `UID:${uid8()}${uid8()}@crow-messenger`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`,
    'RRULE:FREQ=YEARLY', `SUMMARY:${vcEsc(title)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

// ── Colour themes (Messenger-style) ──────────────────────────────────────────
// A theme fills in the accent, bubble and background colours; any colour
// can then be changed on its own in the editor.
const COLOUR_THEMES = [
  { id: 'classic',  name: 'Classic',  accent: '', sent: '', sentText: '', recv: '', recvText: '', bg: '' },
  { id: 'dragon',   name: 'Dragon',   accent: '#E5251B', sent: '#C8100E', sentText: '#ffffff', recv: '#3A3A3C', recvText: '#ffffff', bg: '#0B0B0C' },
  { id: 'ocean',    name: 'Ocean',    accent: '#0A84FF', sent: '#0A6CD8', sentText: '#ffffff', recv: '#1E2C3B', recvText: '#ffffff', bg: '#04101C' },
  { id: 'berry',    name: 'Berry',    accent: '#BF5AF2', sent: '#A23ED6', sentText: '#ffffff', recv: '#2E2238', recvText: '#ffffff', bg: '#120A18' },
  { id: 'forest',   name: 'Forest',   accent: '#30D158', sent: '#248A3D', sentText: '#ffffff', recv: '#1F2B22', recvText: '#ffffff', bg: '#06110A' },
  { id: 'sunset',   name: 'Sunset',   accent: '#FF9F0A', sent: '#FF6A3D', sentText: '#ffffff', recv: '#3A2A26', recvText: '#ffffff', bg: '#120A14' },
  { id: 'midnight', name: 'Midnight', accent: '#5E5CE6', sent: '#5856D6', sentText: '#ffffff', recv: '#22243A', recvText: '#ffffff', bg: '#05060F' },
  { id: 'graphite', name: 'Graphite', accent: '#8E8E93', sent: '#636366', sentText: '#ffffff', recv: '#2C2C2E', recvText: '#ffffff', bg: '#000000' },
];

// Shown in place of a picture that's been deleted from the server
const MISSING_Q = '<svg class="q" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.6-3 4.4"/><circle cx="12" cy="18" r="0.6" fill="currentColor"/></svg>';

// iMessage-style bubble tail (drawn as SVG so it works over glass)
const TAIL = '<svg class="tail" viewBox="0 0 17 21" aria-hidden="true"><path d="M0 0h6v12.2c0 3.6 2.6 6.6 6.9 8.1C14.5 20.8 16 21 17 21 9.3 21.4 4.1 19.6 1.5 17.2 1 17.9.5 18.6 0 19z"/></svg>';

// ── Card styles ──────────────────────────────────────────────────────────────
const CM_CSS = `
:host {
  display: block;
  --cm-accent: #007AFF;
  --cm-sent: var(--cm-accent);
  --cm-sent-text: #ffffff;
  --cm-red: #FF3B30;
  --cm-green: #34C759;
  --cm-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", Roboto, sans-serif;
}
:host([data-mode="dark"]) {
  --cm-bg: #000000; --cm-bg2: #1c1c1e; --cm-bg3: #2c2c2e; --cm-group: #1c1c1e;
  --cm-text: #ffffff; --cm-text2: rgba(235,235,245,0.6); --cm-text3: rgba(235,235,245,0.3);
  --cm-sep: rgba(84,84,88,0.6); --cm-fill: rgba(118,118,128,0.24); --cm-fill2: rgba(118,118,128,0.16);
  --cm-recv: #262628; --cm-recv-text: #ffffff;
  --cm-glass: rgba(56,56,60,0.58); --cm-glass-strong: rgba(30,30,32,0.97); --cm-glass-edge: rgba(255,255,255,0.10);
  --cm-glass-shine: rgba(255,255,255,0.12); --cm-glass-solid: #2c2c2e;
  --cm-card-glass: rgba(10,10,12,0.42); --cm-sheet-solid: #1c1c1e;
  --cm-shadow: 0 10px 34px rgba(0,0,0,0.5);
  --crow-ios-bg: rgba(48,48,52,0.78); --crow-ios-edge: rgba(255,255,255,0.12); --crow-ios-shine: rgba(255,255,255,0.08);
  --crow-ios-pill: rgba(255,255,255,0.12); --crow-ios-text: #fff; --crow-ios-sub: rgba(235,235,245,0.75);
  color-scheme: dark;
}
:host([data-mode="light"]) {
  --cm-bg: #ffffff; --cm-bg2: #f2f2f7; --cm-bg3: #e5e5ea; --cm-group: #ffffff;
  --cm-text: #000000; --cm-text2: rgba(60,60,67,0.6); --cm-text3: rgba(60,60,67,0.3);
  --cm-sep: rgba(60,60,67,0.2); --cm-fill: rgba(118,118,128,0.12); --cm-fill2: rgba(116,116,128,0.08);
  --cm-recv: #E9E9EB; --cm-recv-text: #000000;
  --cm-glass: rgba(255,255,255,0.56); --cm-glass-strong: rgba(246,246,248,0.97); --cm-glass-edge: rgba(255,255,255,0.75);
  --cm-glass-shine: rgba(255,255,255,0.7); --cm-glass-solid: #ffffff;
  --cm-card-glass: rgba(255,255,255,0.46); --cm-sheet-solid: #f2f2f7;
  --cm-shadow: 0 10px 34px rgba(0,0,0,0.14);
  --crow-ios-bg: rgba(250,250,252,0.86); --crow-ios-edge: rgba(0,0,0,0.08); --crow-ios-shine: rgba(255,255,255,0.7);
  --crow-ios-pill: rgba(120,120,128,0.16); --crow-ios-text: #000; --crow-ios-sub: rgba(60,60,67,0.72);
  color-scheme: light;
}
:host([data-ha]) {
  --cm-bg: var(--ha-card-background, var(--card-background-color, #1c1c1e));
  --cm-text: var(--primary-text-color); --cm-text2: var(--secondary-text-color); --cm-sep: var(--divider-color, rgba(128,128,128,0.25));
  --cm-group: var(--secondary-background-color, var(--cm-bg2));
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
ha-card {
  position: relative; overflow: hidden; height: var(--cm-height, 700px);
  border-radius: var(--ha-card-border-radius, 28px);
  background: var(--cm-bg); color: var(--cm-text);
  font-family: var(--cm-font); -webkit-font-smoothing: antialiased; letter-spacing: -0.01em;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
  border: none;
}
:host([data-ha][data-style="glass"]) ha-card { background: color-mix(in srgb, var(--cm-bg) 55%, transparent); }
button { font: inherit; color: inherit; background: none; border: none; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
input, textarea, select { font: inherit; color: inherit; }
svg { display: block; }
.sel { user-select: text; -webkit-user-select: text; }

/* ── Pages ─────────────────────────────────────────── */
.cm-root { position: absolute; inset: 0; overflow: hidden; }
.page { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; will-change: transform; }
:host([data-style="classic"]) .page { background: var(--cm-bg); }
.chatbg { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: center; background-repeat: no-repeat; pointer-events: none; }
.page.thread.has-bg .chatbg::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.18); }
:host([data-mode="light"]) .page.thread.has-bg .chatbg::after { background: rgba(255,255,255,0.12); }
.page.thread .scroll { position: relative; z-index: 1; }
.page.thread.has-bg .edge { background: none; }
.page.thread.has-bg .stamp, .page.thread.has-bg .sys, .page.thread.has-bg .receipt { text-shadow: 0 1px 3px rgba(0,0,0,0.55); color: rgba(255,255,255,0.9); }
:host([data-mode="light"]) .page.thread.has-bg .stamp, :host([data-mode="light"]) .page.thread.has-bg .sys, :host([data-mode="light"]) .page.thread.has-bg .receipt { text-shadow: 0 1px 3px rgba(255,255,255,0.8); color: rgba(0,0,0,0.75); }
.page.anim-in { animation: cm-push-in 0.38s cubic-bezier(.2,.9,.25,1) both; }
.page.anim-out { animation: cm-push-out 0.38s cubic-bezier(.2,.9,.25,1) both; }
.page.anim-back-in { animation: cm-back-in 0.34s cubic-bezier(.2,.9,.25,1) both; }
.page.anim-back-out { animation: cm-back-out 0.34s cubic-bezier(.2,.9,.25,1) both; }
@keyframes cm-push-in { from { transform: translateX(100%); } to { transform: none; } }
@keyframes cm-push-out { from { transform: none; opacity: 1; } to { transform: translateX(-28%); opacity: 0; } }
@keyframes cm-back-in { from { transform: translateX(-28%); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes cm-back-out { from { transform: none; } to { transform: translateX(100%); } }
:host([data-noanim]) .page { animation: none !important; }
.scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-width: none; }
.scroll::-webkit-scrollbar { display: none; }

/* scroll-edge effect (iOS 26) under floating bars */
.edge { position: absolute; left: 0; right: 0; z-index: 4; pointer-events: none;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.edge.top { top: 0; height: 84px; -webkit-mask-image: linear-gradient(#000 45%, transparent); mask-image: linear-gradient(#000 45%, transparent);
  background: linear-gradient(color-mix(in srgb, var(--cm-bg) 70%, transparent), transparent); }
.edge.bottom { bottom: 0; height: 86px; -webkit-mask-image: linear-gradient(transparent, #000 55%); mask-image: linear-gradient(transparent, #000 55%);
  background: linear-gradient(transparent, color-mix(in srgb, var(--cm-bg) 70%, transparent)); }
:host([data-style="glass"]) .edge { backdrop-filter: none; -webkit-backdrop-filter: none; background: none; }

/* ── Liquid glass controls ─────────────────────────── */
.g {
  background: var(--cm-glass);
  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid var(--cm-glass-edge);
  box-shadow: inset 0 1px 0 var(--cm-glass-shine), 0 4px 18px rgba(0,0,0,0.16);
  color: var(--cm-text);
}
:host([data-bars="solid"]) .g { background: var(--cm-glass-solid); backdrop-filter: none; -webkit-backdrop-filter: none;
  border-color: var(--cm-sep); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.top { position: absolute; top: 0; left: 0; right: 0; z-index: 6; display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 12px 14px 0; pointer-events: none; min-height: 60px; }
.top > * { pointer-events: auto; }
.top .title { position: absolute; left: 50%; top: 22px; transform: translateX(-50%); font-weight: 600; font-size: 17px; pointer-events: none;
  white-space: nowrap; max-width: 55%; overflow: hidden; text-overflow: ellipsis; }
.cb { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: transform 0.15s ease, background 0.2s; }
.cb svg { width: 21px; height: 21px; }
.cb:active, .pill:active, .capsule button:active { transform: scale(0.92); }
.pill { height: 44px; padding: 0 18px; border-radius: 22px; font-size: 17px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;
  transition: transform 0.15s ease; white-space: nowrap; }
.pill.accent { color: #fff; background: var(--cm-accent); border-color: transparent; box-shadow: 0 4px 14px color-mix(in srgb, var(--cm-accent) 40%, transparent); }
.pill[disabled] { opacity: 0.45; pointer-events: none; }
.capsule { display: flex; align-items: center; height: 44px; border-radius: 22px; padding: 0 4px; }
.capsule button { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: transform .15s; }
.capsule button svg { width: 21px; height: 21px; }
.bottom { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; display: flex; align-items: center; gap: 10px; padding: 0 14px 14px; pointer-events: none; }
.bottom > * { pointer-events: auto; }
.searchbar { flex: 1; height: 48px; border-radius: 24px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 16px; min-width: 0; }
.searchbar svg { width: 19px; height: 19px; color: var(--cm-text2); flex-shrink: 0; }
.searchbar input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 17px; height: 100%; color: var(--cm-text); }
.searchbar input::placeholder { color: var(--cm-text2); }
.searchbar .sb-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--cm-text2); }
.searchbar .sb-btn.rec { color: var(--cm-red); }
.bottom .cb { width: 48px; height: 48px; }

.large-title { font-size: 34px; font-weight: 700; letter-spacing: 0.01em; padding: 70px 18px 6px; line-height: 1.15; }
.empty { text-align: center; color: var(--cm-text2); padding: 60px 30px; font-size: 15px; line-height: 1.45; }
.empty b { display: block; color: var(--cm-text); font-size: 20px; margin-bottom: 6px; }

/* ── Avatars ───────────────────────────────────────── */
.av { border-radius: 50%; overflow: hidden; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #A5ABB9, #858994); color: #fff; font-weight: 600; letter-spacing: 0.02em; }
.av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.av svg { width: 62%; height: 62%; }
.av.ha { background: linear-gradient(180deg, #41BDF5, #1A8FD0); }
.av.ha svg { width: 55%; height: 55%; }
.av-group { position: relative; flex-shrink: 0; }
.av-group .av { position: absolute; border: 1.5px solid var(--cm-bg); }

/* ── Conversation list ─────────────────────────────── */
.list-pad { padding-bottom: 96px; }
.row { position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 4px; overflow: hidden; touch-action: pan-y; }
.row-inner { display: flex; align-items: center; gap: 12px; width: 100%; transition: transform 0.25s ease; position: relative; z-index: 1; }
.row .dot { width: 12px; flex-shrink: 0; display: flex; justify-content: center; }
.row .dot i { width: 10px; height: 10px; border-radius: 50%; background: var(--cm-accent); display: block; }
.row .dot .mute { width: 12px; height: 12px; color: var(--cm-text3); }
.row .body { flex: 1; min-width: 0; padding: 2px 0; }
.row .line1 { display: flex; align-items: baseline; gap: 6px; }
.row .name { flex: 1; min-width: 0; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .date { font-size: 15px; color: var(--cm-text2); white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.row .date svg { width: 13px; height: 13px; color: var(--cm-text3); }
.row .preview { font-size: 15px; color: var(--cm-text2); line-height: 1.3; margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; word-break: break-word; }
.row .preview.one { min-height: 0; -webkit-line-clamp: 1; }
.row::after { content: ''; position: absolute; bottom: 0; left: 80px; right: 0; height: 1px; transform: scaleY(0.6); transform-origin: bottom; background: var(--cm-sep); z-index: 2; }
.row.last::after { display: none; }
.row:active .row-inner { opacity: 0.7; }
.row .selc { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--cm-text3); flex-shrink: 0; display: none; align-items: center; justify-content: center; color: #fff; margin-left: 8px; }
.editing .row .selc { display: flex; }
.editing .row .dot { display: none; }
.row .selc.on { background: var(--cm-accent); border-color: var(--cm-accent); }
.row .selc svg { width: 14px; height: 14px; }
.swipe-actions { position: absolute; top: 0; bottom: 0; right: 0; display: flex; z-index: 0; visibility: hidden; transform: translateX(100%); transition: transform 0.25s ease; }
.swipe-actions button { width: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; font-size: 13px; font-weight: 500; }
.swipe-actions button svg { width: 22px; height: 22px; }
.swipe-actions .del { background: var(--cm-red); }
.swipe-actions .mute { background: #5856D6; }
.section-h { font-size: 22px; font-weight: 700; padding: 18px 18px 6px; }
.hl { color: var(--cm-text); font-weight: 600; }

/* ── Thread ────────────────────────────────────────── */
.th-head { display: flex; flex-direction: column; align-items: center; gap: 4px; position: absolute; left: 50%; top: 24px; transform: translateX(-50%); z-index: 6; cursor: pointer; max-width: 60%; }
.th-head .namepill { height: 28px; padding: 0 10px 0 12px; border-radius: 14px; display: flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 600; max-width: 100%; }
.th-head .namepill span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.th-head .namepill svg { width: 11px; height: 11px; color: var(--cm-text3); flex-shrink: 0; }
.msgs { padding: 110px 12px 96px; display: flex; flex-direction: column; }
.msgs .more-spin { text-align: center; color: var(--cm-text2); font-size: 13px; padding: 6px; }
.stamp { text-align: center; font-size: 12px; color: var(--cm-text2); margin: 14px 0 6px; }
.stamp b { font-weight: 600; }
.sys { text-align: center; font-size: 12px; color: var(--cm-text2); margin: 10px 30px; line-height: 1.35; }
.mrow { display: flex; align-items: flex-end; gap: 8px; margin-top: 2px; position: relative; }
.mrow.first { margin-top: 8px; }
.mrow.me { justify-content: flex-end; }
.mrow .mav { width: 28px; height: 28px; flex-shrink: 0; }
.mrow .buddy { display: none; }
.mcol { display: flex; flex-direction: column; gap: 2px; max-width: min(76%, 540px); min-width: 0; }
.me .mcol { align-items: flex-end; }
.them .mcol { align-items: flex-start; }
.sender { font-size: 11px; color: var(--cm-text2); margin: 0 0 1px 12px; }
.bub { position: relative; padding: 7px 13px 8px; border-radius: 19px; font-size: 16.5px; line-height: 1.32; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; max-width: 100%; user-select: text; -webkit-user-select: text; }
/* on a touch screen a press and hold on a message opens its menu (with Copy), as on an iPhone,
   rather than starting the phone's text selection, which used to cancel the menu */
@media (pointer: coarse) { .bub, .bub * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; } }
.me .bub { background: var(--cm-sent); color: var(--cm-sent-text); }
.them .bub { background: var(--cm-recv); color: var(--cm-recv-text); }
.bub a { color: inherit; text-decoration: underline; }
.bub .tail { position: absolute; bottom: 0; width: 17px; height: 21px; }
.me .bub .tail { right: -5px; fill: var(--cm-sent); }
.them .bub .tail { left: -5px; fill: var(--cm-recv); transform: scaleX(-1); }
.bub.emoji { background: none !important; font-size: 46px; line-height: 1.1; padding: 2px 4px; }
.bub.emoji .tail { display: none; }
.bub.pending { opacity: 0.65; }
.bub.failed { opacity: 0.6; }
.media { border-radius: 18px; overflow: hidden; position: relative; background: var(--cm-fill); cursor: pointer; max-width: 100%; }
.media img, .media video { display: block; max-width: min(260px, 62vw); max-height: 320px; width: auto; height: auto; min-width: 80px; min-height: 60px; object-fit: cover; }
.media .playov { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.media .playov span { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff;
  background: rgba(0,0,0,0.38); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.media .playov svg { width: 20px; height: 20px; margin-left: 3px; }
.media .dur { position: absolute; right: 8px; bottom: 6px; font-size: 12px; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.media.loading { width: 200px; height: 150px; }
.filebub { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 18px; cursor: pointer; max-width: 280px; }
.me .filebub { background: var(--cm-sent); color: var(--cm-sent-text); }
.them .filebub { background: var(--cm-recv); color: var(--cm-recv-text); }
.filebub svg { width: 28px; height: 28px; flex-shrink: 0; }
.filebub .fn { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filebub .fs { font-size: 12px; opacity: 0.7; }
.audio { display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 8px; border-radius: 19px; min-width: 200px; }
.me .audio { background: var(--cm-sent); color: var(--cm-sent-text); }
.them .audio { background: var(--cm-recv); color: var(--cm-recv-text); }
.audio .ap { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.22); }
.them .audio .ap { background: color-mix(in srgb, var(--cm-recv-text) 12%, transparent); }
.audio .ap svg { width: 15px; height: 15px; }
.audio .bars { flex: 1; display: flex; align-items: center; gap: 2px; height: 26px; }
.audio .bars i { flex: 1; border-radius: 2px; background: currentColor; opacity: 0.45; min-height: 3px; }
.audio .bars i.on { opacity: 1; }
.audio .at { font-size: 12px; opacity: 0.8; font-variant-numeric: tabular-nums; }
.receipt { font-size: 11px; color: var(--cm-text2); text-align: right; margin: 3px 4px 0 0; }
.receipt b { font-weight: 600; }
.receipt.err { color: var(--cm-red); cursor: pointer; }
.typing { display: inline-flex; gap: 4px; padding: 12px 14px; border-radius: 19px; background: var(--cm-recv); position: relative; }
.typing i { width: 8px; height: 8px; border-radius: 50%; background: var(--cm-text2); animation: cm-dot 1.2s infinite ease-in-out; }
.typing i:nth-child(2) { animation-delay: 0.15s; } .typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes cm-dot { 0%, 60%, 100% { opacity: 0.35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
.mrow.flash .bub { animation: cm-flash 1.6s ease; }
@keyframes cm-flash { 0%, 100% { filter: none; } 20%, 60% { filter: brightness(1.35) saturate(1.2); } }
.newpill { position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 7; height: 32px; padding: 0 14px; border-radius: 16px;
  font-size: 13px; font-weight: 600; display: none; align-items: center; gap: 4px; color: var(--cm-accent); }
.newpill.show { display: flex; }
.newpill svg { width: 13px; height: 13px; }

/* ── Composer ──────────────────────────────────────── */
.composer { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; display: flex; flex-direction: column; gap: 8px; padding: 0 12px 12px; pointer-events: none; }
.composer > * { pointer-events: auto; }
.composer .crow { display: flex; align-items: flex-end; gap: 8px; }
.composer .cb { width: 42px; height: 42px; }
.field { flex: 1; min-width: 0; border-radius: 22px; display: flex; flex-direction: column; min-height: 42px; }
.field .stage { display: flex; gap: 8px; overflow-x: auto; padding: 8px 8px 0; scrollbar-width: none; }
.field .stage:empty { display: none; }
.field .stage .st { position: relative; width: 72px; height: 72px; border-radius: 14px; overflow: hidden; flex-shrink: 0; background: var(--cm-fill); display: flex; align-items: center; justify-content: center; }
.field .stage .st img { width: 100%; height: 100%; object-fit: cover; }
.field .stage .st .fname { font-size: 10px; padding: 4px; text-align: center; color: var(--cm-text2); word-break: break-all; line-height: 1.2; }
.field .stage .st .stx { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; }
.field .stage .st .stx svg { width: 11px; height: 11px; }
.field .stage .st .prog { position: absolute; left: 6px; right: 6px; bottom: 6px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.35); overflow: hidden; }
.field .stage .st .prog i { display: block; height: 100%; background: #fff; width: 0; transition: width 0.2s; }
.field .stage .st.err::after { content: '!'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,59,48,0.55); color: #fff; font-weight: 700; font-size: 24px; }
.field .inrow { display: flex; align-items: flex-end; gap: 4px; padding: 0 4px 0 16px; }
.field .rbox { flex: 1; min-width: 0; min-height: 42px; max-height: 140px; overflow-y: auto; border: none; outline: none; background: transparent; font-size: 17px; line-height: 22px; padding: 10px 0; color: var(--cm-text);
  white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; cursor: text; user-select: text; -webkit-user-select: text; -webkit-tap-highlight-color: transparent; scrollbar-width: none; }
.field .rbox::-webkit-scrollbar { display: none; }
.field .rbox, .field .rbox * { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
.field .rbox { text-align: left; position: relative; }
.field .rbox.rb-empty::before { content: attr(data-placeholder); position: absolute; left: 0; top: 10px; color: var(--cm-text2); pointer-events: none; white-space: nowrap; }
.field .rbox[contenteditable="false"] { cursor: default; }
.field .fbtn { width: 34px; height: 34px; margin: 4px 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); flex-shrink: 0; }
.field .fbtn svg { width: 20px; height: 20px; }
.field .send { background: var(--cm-accent); color: #fff; }
.field .send svg { width: 17px; height: 17px; }
@keyframes cm-pulse { 50% { opacity: 0.3; } }

/* ── Sheet (New Message) ───────────────────────────── */
.sheet-wrap { position: absolute; inset: 0; z-index: 30; display: flex; align-items: flex-end; background: rgba(0,0,0,0); transition: background 0.3s; }
.sheet-wrap.show { background: rgba(0,0,0,0.3); }
.sheet { position: relative; width: 100%; height: calc(100% - 14px); border-radius: 34px 34px 0 0; display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(100%); transition: transform 0.42s cubic-bezier(.2,.9,.25,1);
  background: var(--cm-glass-strong); backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-top: 0.5px solid var(--cm-glass-edge); box-shadow: 0 -10px 40px rgba(0,0,0,0.25); }
:host([data-popups="solid"]) .sheet { background: var(--cm-sheet-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
.sheet-wrap.show .sheet { transform: none; }
:host([data-noanim]) .sheet, :host([data-noanim]) .sheet-wrap { transition: none; }
.sheet .grab { display: none; width: 36px; height: 5px; border-radius: 3px; background: var(--cm-text3); margin: 6px auto 0; flex-shrink: 0; }
.sheet .shead { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 8px; min-height: 58px; position: relative; }
.sheet .shead h3 { position: absolute; left: 50%; transform: translateX(-50%); margin: 0; font-size: 17px; font-weight: 600; white-space: nowrap; }
.to-field { margin: 4px 14px 0; min-height: 50px; border-radius: 25px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 6px 6px 16px; background: var(--cm-fill); }
.to-field .lbl { color: var(--cm-text2); font-size: 17px; }
.to-field input { flex: 1; min-width: 80px; border: none; outline: none; background: transparent; font-size: 17px; height: 34px; color: var(--cm-text); }
.to-field .chip { height: 30px; padding: 0 10px; border-radius: 15px; background: color-mix(in srgb, var(--cm-accent) 18%, transparent); color: var(--cm-accent); font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.to-field .chip.sel { background: var(--cm-accent); color: #fff; }
.to-field .addbtn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: auto; background: var(--cm-fill); }
.to-field .addbtn svg { width: 18px; height: 18px; }
.gname { margin: 8px 14px 0; height: 44px; border-radius: 22px; background: var(--cm-fill); display: flex; align-items: center; padding: 0 16px; }
.gname input { flex: 1; border: none; outline: none; background: transparent; font-size: 16px; color: var(--cm-text); }
.suggest { flex: 1; overflow-y: auto; padding: 6px 0 100px; }
.suggest[hidden] { display: none; }
.cprev { flex: 1; overflow-y: auto; position: relative; cursor: pointer; -webkit-mask-image: linear-gradient(transparent, #000 24px); mask-image: linear-gradient(transparent, #000 24px); }
.cprev[hidden] { display: none; }
.cprev .msgs { padding: 16px 12px calc(var(--cm-composer-h, 66px) + 24px); min-height: 100%; box-sizing: border-box; justify-content: flex-end; }
.suggest .srow { display: flex; align-items: center; gap: 12px; padding: 8px 18px; cursor: pointer; }
.suggest .srow:active { background: var(--cm-fill2); }
.suggest .srow .sn { font-size: 16px; font-weight: 500; }
.suggest .srow .ss { font-size: 13px; color: var(--cm-text2); }
.suggest .srow .ck { margin-left: auto; width: 22px; height: 22px; color: var(--cm-accent); }
.suggest .sh { font-size: 13px; font-weight: 600; color: var(--cm-text2); text-transform: uppercase; letter-spacing: 0.02em; padding: 12px 18px 4px; }

/* ── Overlays: iOS alert, menus, viewer ─ */
.crow-ios-backdrop {
  position: absolute; inset: 0; z-index: 60;
  background: rgba(0,0,0,0); transition: background 0.22s ease;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; border-radius: inherit;
}
.crow-ios-backdrop.visible { background: rgba(0,0,0,0.42); }
.crow-ios-alert {
  width: min(320px, 100%);
  background: var(--crow-ios-bg, rgba(48,48,52,0.78));
  backdrop-filter: blur(34px) saturate(1.8); -webkit-backdrop-filter: blur(34px) saturate(1.8);
  border: 0.5px solid var(--crow-ios-edge, rgba(255,255,255,0.12));
  border-radius: 34px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 var(--crow-ios-shine, rgba(255,255,255,0.08));
  padding: 26px 18px 18px;
  opacity: 0; transform: scale(1.08);
  transition: opacity 0.2s ease, transform 0.28s cubic-bezier(.2,.9,.3,1.15);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  text-align: left; color: var(--crow-ios-text);
}
:host([data-popups="solid"]) .crow-ios-alert { background: var(--cm-glass-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
.crow-ios-backdrop.visible .crow-ios-alert { opacity: 1; transform: scale(1); }
.crow-ios-title { font-size: 17px; font-weight: 700; line-height: 1.3; padding: 0 8px; word-break: break-word; }
.crow-ios-msg { font-size: 15px; line-height: 1.42; margin-top: 6px; padding: 0 8px; color: var(--crow-ios-sub); white-space: pre-line; word-break: break-word; }
.crow-ios-input { margin: 14px 4px 0; width: calc(100% - 8px); height: 44px; border-radius: 14px; border: none; outline: none; padding: 0 14px; font-size: 16px;
  background: var(--crow-ios-pill); color: var(--crow-ios-text); user-select: text; -webkit-user-select: text; }
.crow-ios-btns { display: flex; flex-direction: column; gap: 9px; margin-top: 22px; }
.crow-ios-btns button, .crow-ios-btns a {
  display: block; box-sizing: border-box; text-align: center; text-decoration: none; line-height: normal;
  width: 100%; padding: 14px 16px; margin: 0;
  border: none; border-radius: 999px !important;
  font-size: 17px; font-weight: 600; font-family: inherit; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease, filter 0.12s ease;
}
.crow-ios-btns button:active, .crow-ios-btns a:active { transform: scale(0.97); filter: brightness(1.15); }
.crow-ios-btns .crow-ios-cancel { background: var(--crow-ios-pill, rgba(255,255,255,0.12)); color: var(--crow-ios-text); }
.crow-ios-btns .crow-ios-ok { background: #4AA8F5; color: #fff; }
.crow-ios-btns .crow-ios-ok.destructive { background: #FF3B30; }

.menu-wrap { position: absolute; inset: 0; z-index: 50; }
.menu { position: absolute; min-width: 230px; max-width: calc(100% - 28px); border-radius: 22px; padding: 6px 0; overflow: hidden;
  background: var(--cm-glass-strong); backdrop-filter: blur(34px) saturate(1.8); -webkit-backdrop-filter: blur(34px) saturate(1.8);
  border: 0.5px solid var(--cm-glass-edge); box-shadow: var(--cm-shadow), inset 0 1px 0 var(--cm-glass-shine);
  transform-origin: top right; animation: cm-menu 0.24s cubic-bezier(.2,.9,.3,1.2) both; color: var(--cm-text); }
:host([data-popups="solid"]) .menu { background: var(--cm-glass-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
@keyframes cm-menu { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: none; } }
.menu button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 18px; font-size: 17px; text-align: left; }
.menu button:active { background: var(--cm-fill); }
.menu button .mi { width: 20px; height: 20px; margin-left: auto; flex-shrink: 0; }
.menu button .mc { width: 18px; height: 18px; flex-shrink: 0; color: var(--cm-text); }
.menu button.red { color: var(--cm-red); }
.menu .msep { height: 0.5px; background: var(--cm-sep); margin: 4px 0; }
.menu .mh { font-size: 13px; color: var(--cm-text2); padding: 8px 18px 4px; }
.menu button .mchev { width: 16px; height: 16px; margin-left: auto; flex-shrink: 0; color: var(--cm-text2); display: flex; }
.menu button .mi + .mchev { margin-left: 8px; }
.menu button .mchev svg { width: 16px; height: 16px; }
.menu .mback { color: var(--cm-accent); font-weight: 600; gap: 10px; }
.menu .mback svg { width: 20px; height: 20px; flex-shrink: 0; }

.viewer { position: absolute; inset: 0; z-index: 40; background: #000; display: flex; align-items: center; justify-content: center; animation: cm-fade 0.2s; }
@keyframes cm-fade { from { opacity: 0; } }
.viewer img, .viewer video { max-width: 100%; max-height: 100%; object-fit: contain; }
.viewer .top .g { color: #fff; }
:host([data-mode="light"]) .viewer .g { background: rgba(40,40,44,0.55); border-color: rgba(255,255,255,0.15); }
.toast { position: absolute; left: 50%; top: 70px; transform: translateX(-50%); z-index: 70; padding: 10px 16px; border-radius: 18px; font-size: 14px; font-weight: 500; animation: cm-fade 0.2s; max-width: 85%; text-align: center; }

/* ── Grouped list (info pages, contacts) ───────────── */
.ipage { padding: 70px 16px 40px; }
/* conversation details: what scrolls up fades and blurs under the back button (in Liquid Glass too) */
.infopg .edge.top, :host([data-style="glass"]) .infopg .edge.top { height: 104px; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  background: linear-gradient(color-mix(in srgb, var(--cm-bg) 78%, transparent) 40%, transparent);
  -webkit-mask-image: linear-gradient(#000 55%, transparent); mask-image: linear-gradient(#000 55%, transparent); }
.ghead { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 6px 0 18px; text-align: center; }
.ghead .gtitle { font-size: 26px; font-weight: 700; line-height: 1.2; word-break: break-word; }
.ghead .gsub { font-size: 15px; color: var(--cm-text2); }
.ghead .glink { font-size: 15px; color: var(--cm-accent); }
.group { border-radius: 26px; overflow: hidden; margin-bottom: 18px; background: var(--cm-group); }
.group-h { font-size: 13px; color: var(--cm-text2); text-transform: uppercase; letter-spacing: 0.02em; margin: 0 18px 6px; }
.gr { display: flex; align-items: center; gap: 12px; padding: 12px 18px; min-height: 52px; position: relative; cursor: pointer; }
.gr + .gr::before { content: ''; position: absolute; top: 0; left: 18px; right: 0; height: 0.5px; background: var(--cm-sep); }
.gr.av-row + .gr::before, .gr.av-row + .gr.av-row::before { left: 66px; }
.gr:active { background: var(--cm-fill2); }
.gr .gl { flex: 1; min-width: 0; font-size: 17px; }
.gr .gv { color: var(--cm-text2); font-size: 17px; }
.gr .gi { width: 22px; height: 22px; color: var(--cm-accent); flex-shrink: 0; }
.gr .gch { width: 14px; height: 14px; color: var(--cm-text3); flex-shrink: 0; }
.gr.blue .gl { color: var(--cm-accent); }
.gr.red .gl { color: var(--cm-red); }
.gr .tsw { position: relative; width: 51px; height: 31px; flex-shrink: 0; }
.gr .tsw input { opacity: 0; width: 0; height: 0; position: absolute; }
.gr .tsw span { position: absolute; inset: 0; border-radius: 31px; background: rgba(120,120,128,0.32); transition: background .25s; }
.gr .tsw span::after { content: ''; position: absolute; width: 27px; height: 27px; border-radius: 50%; background: #fff; top: 2px; left: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform .25s; }
.gr .tsw input:checked + span { background: var(--cm-green); }
.gr .tsw input:checked + span::after { transform: translateX(20px); }

/* ── Contacts list ─────────────────────────────────── */
.ct-list { padding: 64px 0 100px; }
.ct-me { display: flex; align-items: center; gap: 14px; padding: 8px 18px 14px; cursor: pointer; }
.ct-me .n { font-size: 20px; font-weight: 600; }
.ct-me .s { font-size: 15px; color: var(--cm-text2); }
.ct-row.ct-ha { margin-bottom: 8px; }
.ct-row.ct-ha .s { color: var(--cm-text2); }
.ct-sec { font-size: 15px; font-weight: 600; color: var(--cm-text2); padding: 14px 18px 6px; position: sticky; top: 0; z-index: 2; }
.ct-sec::after { content: ''; position: absolute; left: 18px; right: 18px; bottom: 0; height: 0.5px; background: var(--cm-sep); }
.ct-row { display: flex; align-items: center; gap: 14px; padding: 9px 30px 9px 18px; cursor: pointer; position: relative; }
.ct-row + .ct-row::before { content: ''; position: absolute; top: 0; left: 82px; right: 30px; height: 0.5px; background: var(--cm-sep); }
.ct-row:active { background: var(--cm-fill2); }
.ct-row .n { font-size: 17px; font-weight: 600; }
.ct-row .n .ln { font-weight: 700; }
.ct-row .s { font-size: 14px; color: var(--cm-text2); margin-top: 1px; }
.az { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); z-index: 7; display: flex; flex-direction: column; align-items: center; padding: 4px 3px; touch-action: none; }
.az b { font-size: 11px; font-weight: 600; color: var(--cm-accent); line-height: 14.5px; width: 16px; text-align: center; cursor: pointer; }

/* ── Contact card ─────────────────────────────────── */
.cbg { position: absolute; inset: -40px; z-index: 0; pointer-events: none; overflow: hidden; }
.cbg .ph { position: absolute; inset: 0; background-size: cover; background-position: center; filter: blur(46px) saturate(1.5); transform: scale(1.3); opacity: 0.85; }
.cbg .tint { position: absolute; inset: 0; }
.cpage .scroll { position: relative; z-index: 1; }
.cpage.tinted { --cm-text: #fff; --cm-text2: rgba(255,255,255,0.72); --cm-text3: rgba(255,255,255,0.42); --cm-sep: rgba(255,255,255,0.16); color: #fff; }
:host([data-mode="light"]) .cpage.tinted { --cm-text: #000; --cm-text2: rgba(0,0,0,0.6); --cm-text3: rgba(0,0,0,0.3); --cm-sep: rgba(0,0,0,0.1); color: #000; }
.cpage.tinted .group { background: rgba(255,255,255,0.13); border: 0.5px solid rgba(255,255,255,0.14); backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); }
:host([data-mode="light"]) .cpage.tinted .group { background: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.7); }
.cpage.tinted .g { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.18); color: var(--cm-text); }
:host([data-mode="light"]) .cpage.tinted .g { background: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.75); }
.cpage.tinted .gr .gi { color: var(--cm-text); }
.c-hero { display: flex; flex-direction: column; align-items: center; padding: 64px 16px 14px; text-align: center; }
.c-hero .cn { font-size: 30px; font-weight: 700; margin-top: 12px; line-height: 1.15; word-break: break-word; }
.c-hero .cs { font-size: 15px; color: var(--cm-text2); margin-top: 4px; }
.c-actions { display: flex; justify-content: center; gap: 10px; padding: 8px 16px 20px; }
.c-act { flex: 1; max-width: 86px; height: 64px; border-radius: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 500; transition: transform .15s; }
.c-act svg { width: 22px; height: 22px; }
.c-act:active { transform: scale(0.94); }
.c-act[disabled] { opacity: 0.4; pointer-events: none; }
.c-body { padding: 0 16px 40px; }
.cf { padding: 11px 18px; min-height: 60px; display: flex; align-items: center; gap: 12px; position: relative; cursor: pointer; }
.cf + .cf::before { content: ''; position: absolute; top: 0; left: 18px; right: 18px; height: 0.5px; background: var(--cm-sep); }
.cf:active { background: rgba(127,127,127,0.12); }
.cf .cl { font-size: 14px; color: var(--cm-text); opacity: 0.85; }
.cf .cvv { font-size: 17px; color: var(--cm-accent); line-height: 1.3; white-space: pre-line; word-break: break-word; margin-top: 1px; }
.cpage.tinted .cf .cvv { color: var(--cm-text); }
.cf .cvv.plain { color: var(--cm-text); }
.cf .ci { width: 22px; height: 22px; margin-left: auto; flex-shrink: 0; color: var(--cm-text); opacity: 0.9; }
.cf .cmain { flex: 1; min-width: 0; }
.cf.shared { min-height: 74px; }
.cf.shared .sh1 { font-size: 17px; }
.cf.shared .sh2 { font-size: 17px; color: var(--cm-text2); }

/* ── Contact edit ─────────────────────────────────── */
.ce { padding: 66px 16px 60px; }
.ce .photo-btn { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 18px; }
.ce .photo-btn button.lnk { font-size: 15px; font-weight: 500; padding: 6px 14px; border-radius: 16px; background: var(--cm-fill); }
.ce .group { margin-bottom: 14px; }
.ce .fi { display: flex; align-items: center; gap: 10px; padding: 0 16px; min-height: 48px; position: relative; }
.ce .fi + .fi::before { content: ''; position: absolute; top: 0; left: 16px; right: 0; height: 0.5px; background: var(--cm-sep); }
.ce .fi input, .ce .fi textarea, .ce .fi select.fs { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 17px; padding: 12px 0; color: var(--cm-text); user-select: text; -webkit-user-select: text; }
.ce .fi textarea { resize: vertical; min-height: 90px; line-height: 1.35; }
.ce .fi input::placeholder, .ce .fi textarea::placeholder { color: var(--cm-text3); }
.ce .fi input[type="date"] { min-height: 44px; }
.ce .ha-sug { margin: -4px 0 16px; }
.ce .ha-sug-h { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--cm-text2); margin: 0 6px 8px; }
.ce .ha-sug-h svg { width: 15px; height: 15px; color: #18BCF2; }
.ce .ha-sug-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px; }
.ce .ha-sug-row::-webkit-scrollbar { display: none; }
.ce .ha-sug-row button { display: flex; align-items: center; gap: 8px; padding: 5px 14px 5px 5px; border-radius: 22px; font-size: 15px; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.ce .ha-sug-row button:active { transform: scale(0.96); }
.ce .fi .rm, .ce .fi .ad { width: 24px; height: 24px; flex-shrink: 0; }
.ce .fi .lab { display: flex; align-items: center; gap: 2px; font-size: 15px; color: var(--cm-accent); min-width: 78px; max-width: 110px; flex-shrink: 0; padding: 12px 0; }
.ce .fi .lab span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ce .fi .lab svg { width: 12px; height: 12px; color: var(--cm-text3); flex-shrink: 0; }
.ce .fi .vline { width: 0.5px; align-self: stretch; background: var(--cm-sep); margin: 8px 0; }
.ce .fi.addr { align-items: flex-start; }
.ce .fi.addr .rm, .ce .fi.addr .lab { margin-top: 10px; }
.ce .fi .addr-fields { flex: 1; display: flex; flex-direction: column; }
.ce .fi .addr-fields input + input { border-top: 0.5px solid var(--cm-sep); }
.ce .fi.adder { color: var(--cm-text); font-size: 17px; cursor: pointer; }
.ce .fi.adder > span:last-child { flex: 1; }
.ce .fi .ad, .ce .fi .rm { display: flex; align-items: center; justify-content: center; }
.ce .fi .ad svg, .ce .fi .rm svg { width: 22px; height: 22px; }
.ce .del-btn { width: 100%; text-align: center; color: var(--cm-red); font-size: 17px; padding: 15px; }
.ce select.fs { -webkit-appearance: none; appearance: none; }

/* ══ Glass style (editor → Style: Glass) ═════════════════════════════════ */
:host([data-style="glass"]) ha-card {
  background: var(--cm-card-glass);
  backdrop-filter: blur(24px) saturate(170%); -webkit-backdrop-filter: blur(24px) saturate(170%);
  border: 0.5px solid var(--cm-glass-edge);
  box-shadow: inset 0 1px 0 var(--cm-glass-shine), 0 12px 40px rgba(0,0,0,0.22);
}
:host([data-style="glass"]) .group { background: var(--cm-glass); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); border: 0.5px solid var(--cm-glass-edge); }

/* ── iOS 27 Liquid Glass alerts ── */
/* while an alert is open the card behind it is blurred,
   so the glass alert reads clearly over it */
:host([data-popups="glass"]) .crow-ios-backdrop.visible { background: rgba(0,0,0,0.24); }
.cm-pages, .sheet-wrap { transition: filter 0.22s ease; }
:host([data-popups="glass"]) .cm-root.alerting > .cm-pages, :host([data-popups="glass"]) .cm-root.alerting > .sheet-wrap { filter: blur(12px) saturate(1.3); }
:host([data-popups="glass"]) .crow-ios-alert {
  position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
  backdrop-filter: blur(26px) saturate(2.1) brightness(0.92); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(0.92);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 30px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(255,255,255,0.08), inset 0 0 24px rgba(255,255,255,0.05);
}
:host([data-popups="glass"]) .crow-ios-alert::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 55%; pointer-events: none; border-radius: 34px 34px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0));
}
:host([data-popups="glass"]) .crow-ios-alert > * { position: relative; }
:host([data-popups="glass"]) .crow-ios-msg { color: rgba(235,235,245,0.72) !important; }
:host([data-popups="glass"]) .crow-ios-btns .crow-ios-cancel {
  background: rgba(255,255,255,0.12); border: 0.5px solid rgba(255,255,255,0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
  backdrop-filter: blur(12px) saturate(1.6); -webkit-backdrop-filter: blur(12px) saturate(1.6);
}
:host([data-popups="glass"]) .crow-ios-btns .crow-ios-ok {
  background: linear-gradient(180deg, color-mix(in srgb, var(--cm-accent, #007AFF) 95%, transparent), color-mix(in srgb, var(--cm-accent, #007AFF) 78%, transparent));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--cm-accent, #007AFF) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.12);
}
/* a destructive button (e.g. Delete) keeps its red, as tinted glass */
:host([data-popups="glass"]) .crow-ios-btns .crow-ios-ok.destructive {
  background: linear-gradient(180deg, rgba(255,69,58,0.92), rgba(220,40,30,0.85)) !important;
  box-shadow: 0 8px 22px rgba(255,59,48,0.35), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.12);
}
:host([data-popups="glass"]) .crow-ios-input { background: rgba(255,255,255,0.12); border: 0.5px solid rgba(255,255,255,0.2); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
/* light panels */
:host([data-popups="glass"][data-mode="light"]) .crow-ios-backdrop.visible { background: rgba(255,255,255,0.14); }
:host([data-popups="glass"][data-mode="light"]) .crow-ios-alert {
  background: linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.38));
  backdrop-filter: blur(26px) saturate(2.1) brightness(1.05); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(1.05);
  border-color: rgba(255,255,255,0.75);
  box-shadow: 0 30px 70px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.35), inset 0 0 24px rgba(255,255,255,0.25);
}
:host([data-popups="glass"][data-mode="light"]) .crow-ios-alert::before { background: linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); }
:host([data-popups="glass"][data-mode="light"]) .crow-ios-msg { color: rgba(60,60,67,0.7) !important; }
:host([data-popups="glass"][data-mode="light"]) .crow-ios-btns .crow-ios-cancel, :host([data-popups="glass"][data-mode="light"]) .crow-ios-input {
  background: rgba(255,255,255,0.62); border-color: rgba(0,0,0,0.07);
  box-shadow: inset 0 1px 0 #ffffff, 0 1px 3px rgba(0,0,0,0.08); color: #000;
}

/* menus: the same Liquid Glass panel */
:host([data-popups="glass"]) .menu {
  background: linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
  backdrop-filter: blur(26px) saturate(2.1) brightness(0.92); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(0.92);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 30px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(255,255,255,0.08), inset 0 0 24px rgba(255,255,255,0.05);
}
:host([data-popups="glass"]) .menu::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 55%; pointer-events: none; border-radius: 22px 22px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0));
}
:host([data-popups="glass"]) .menu > * { position: relative; }
:host([data-popups="glass"][data-mode="light"]) .menu {
  background: linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.38));
  backdrop-filter: blur(26px) saturate(2.1) brightness(1.05); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(1.05);
  border-color: rgba(255,255,255,0.75);
  box-shadow: 0 30px 70px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.35), inset 0 0 24px rgba(255,255,255,0.25);
}
:host([data-popups="glass"][data-mode="light"]) .menu::before { background: linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); }

/* toasts: a floating glass capsule */
:host([data-popups="glass"]) .toast {
  background: linear-gradient(160deg, rgba(255,255,255,0.2), rgba(255,255,255,0.07));
  border: 1px solid rgba(255,255,255,0.26); border-radius: 999px; padding: 10px 18px;
  backdrop-filter: blur(24px) saturate(2) brightness(0.9); -webkit-backdrop-filter: blur(24px) saturate(2) brightness(0.9);
  box-shadow: 0 12px 32px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(255,255,255,0.08);
  color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.25);
}
:host([data-popups="glass"][data-mode="light"]) .toast {
  background: linear-gradient(160deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58)); border-color: rgba(255,255,255,0.85);
  backdrop-filter: blur(24px) saturate(2) brightness(1.05); -webkit-backdrop-filter: blur(24px) saturate(2) brightness(1.05);
  box-shadow: 0 12px 32px rgba(0,0,0,0.16), inset 0 1px 0 #ffffff; color: #1c1c1e; text-shadow: none;
}

/* ── Deleted pictures: a question mark in the card's own style ── */
.missing-img, .media.missing, .av.missing { display: flex; align-items: center; justify-content: center; color: var(--cm-text3); }
.media.missing, .missing-img { background: color-mix(in srgb, var(--cm-recv) 82%, transparent); color: color-mix(in srgb, var(--cm-recv-text) 45%, transparent);
  border: 0.5px solid var(--cm-glass-edge); box-shadow: inset 0 1px 0 var(--cm-glass-shine); cursor: default;
  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); }
.media.missing .q, .missing-img .q { width: min(44%, 54px); height: auto; aspect-ratio: 1; }
.missing-img { border-radius: 18px; min-width: 40px; min-height: 40px; }
.av.missing { background: linear-gradient(180deg, #a5a9b3, #868a94); color: rgba(255,255,255,0.95); }
.av.missing .q { width: 58%; height: 58%; }
.filebub.missing-file { cursor: default; }
.filebub.missing-file .q-sm { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--cm-fill); color: var(--cm-text3); flex-shrink: 0; }
.filebub.missing-file .q-sm svg { width: 22px; height: 22px; }
.viewer-missing { flex-direction: column; gap: 10px; width: 180px; height: 180px; color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.14) !important; font-size: 14px; }

/* ── Live Wallpaper in a chat ── */
.page.thread.has-live .chatbg::after { background: rgba(0,0,0,0.1); }
:host([data-mode="light"]) .page.thread.has-live .chatbg::after { background: rgba(0,0,0,0.06); }
:host([data-mode]) .page.thread.has-live .stamp, :host([data-mode]) .page.thread.has-live .sys, :host([data-mode]) .page.thread.has-live .receipt { text-shadow: 0 1px 3px rgba(0,0,0,0.6); color: rgba(255,255,255,0.88); }
.page.themed { background: var(--cm-bg); }

/* ── Theme & Live Wallpaper pickers ── */
.th-dots { display: flex; margin-right: 2px; }
.th-dots i { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--cm-group); }
.th-dots i + i { margin-left: -5px; }
.segc { display: flex; padding: 2px; border-radius: 12px; background: var(--cm-fill); margin: 0 2px 18px; position: relative; }
.segc button { flex: 1; height: 32px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--cm-text); transition: background .2s, box-shadow .2s; }
.segc button.on { background: var(--cm-glass-solid); box-shadow: 0 2px 8px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.04); font-weight: 600; }
:host([data-mode="dark"]) .segc button.on { background: #636366; }
.pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 14px 12px; margin-bottom: 20px; }
.pick { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; text-align: center; }
.pick .tile { position: relative; width: 100%; aspect-ratio: 0.62; border-radius: 18px; overflow: hidden; border: 0.5px solid var(--cm-glass-edge);
  box-shadow: 0 6px 18px rgba(0,0,0,0.16); transition: transform .15s; }
.pick:active .tile { transform: scale(0.96); }
.pick .tile .live { position: absolute; inset: 0; }
.pick .nm { font-size: 13px; font-weight: 500; color: var(--cm-text); line-height: 1.2; }
.pick .ck { position: absolute; right: 7px; bottom: 7px; width: 22px; height: 22px; border-radius: 50%; background: var(--cm-accent); color: #fff; display: none; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.3); z-index: 2; }
.pick .ck svg { width: 13px; height: 13px; }
.pick.on .ck { display: flex; }
.pick.on .tile { box-shadow: 0 0 0 3px var(--cm-accent), 0 6px 18px rgba(0,0,0,0.16); }
.pick .tile.none-tile { display: flex; align-items: center; justify-content: center; background: var(--cm-fill); }
.pick .tile.none-tile .none-x { width: 34px; height: 34px; color: var(--cm-text3); }
.pick .tile.none-tile .none-x svg { width: 100%; height: 100%; }
.pick .tile.th { aspect-ratio: 0.82; display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; padding: 10px 8px 34px; }
.pick .tile.th .b { max-width: 80%; height: 14px; border-radius: 8px; }
.pick .tile.th .b.r { align-self: flex-start; width: 62%; }
.pick .tile.th .b.s { align-self: flex-end; width: 70%; }
.pick .tile.th .b.s2 { align-self: flex-end; width: 44%; }
.pick-note { font-size: 13px; color: var(--cm-text2); margin: -6px 18px 18px; line-height: 1.35; }


/* ── AI Features ── */
.composer .ai-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px 2px 0; }
.composer .ai-chips::-webkit-scrollbar { display: none; }
.composer .ai-chips button { flex-shrink: 0; height: 34px; padding: 0 14px; border-radius: 17px; font-size: 15px; font-weight: 500; color: var(--cm-accent); white-space: nowrap; animation: cm-fade 0.25s; }
.composer .ai-chips button:active { transform: scale(0.96); }
.field .fbtn.ai-w { color: var(--cm-accent); }
.field .fbtn.ai-w svg { width: 20px; height: 20px; }
.field.ai-busy { animation: cm-ai-pulse 1.2s ease-in-out infinite; }
.field.ai-busy .rbox { opacity: 0.55; }
@keyframes cm-ai-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--cm-accent) 0%, transparent); } 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--cm-accent) 45%, transparent); } }
.catchup { position: absolute; left: 12px; right: 12px; top: 96px; z-index: 6; display: flex; justify-content: center; pointer-events: none; }
.catchup > * { pointer-events: auto; }
.cu-pill { height: 32px; padding: 0 14px; border-radius: 16px; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--cm-accent); }
.cu-pill svg { width: 15px; height: 15px; }
.cu-card { width: 100%; max-height: 40%; overflow: auto; border-radius: 20px; padding: 12px 14px; background: var(--cm-glass-strong) !important; }
.viewer .vbar { position: absolute; left: 12px; right: 12px; bottom: 14px; z-index: 3; display: flex; align-items: center; justify-content: space-between; }
.viewer .vbar .g { color: #fff; }
.viewer .vdesc { height: 44px; font-size: 15px; font-weight: 600; }
.viewer .vdesc svg { width: 18px; height: 18px; }
.cu-h { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--cm-accent); margin-bottom: 4px; }
.cu-h svg { width: 15px; height: 15px; }
.cu-h b { flex: 1; font-weight: 600; }
.cu-x { width: 24px; height: 24px; border-radius: 50%; background: var(--cm-fill); color: var(--cm-text2); display: flex; align-items: center; justify-content: center; }
.cu-x svg { width: 11px; height: 11px; }
.cu-text { font-size: 15px; line-height: 1.38; color: var(--cm-text); }
.cu-wait { color: var(--cm-text2); animation: cm-fade 1s ease-in-out infinite alternate; }
.bub .trans { margin-top: 6px; padding-top: 6px; border-top: 0.5px solid color-mix(in srgb, currentColor 30%, transparent); }
.bub .trans span { display: flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.7; margin-bottom: 2px; }
.bub .trans span svg { width: 11px; height: 11px; }
.viewer .vcap { position: absolute; left: 12px; right: 12px; bottom: 70px; z-index: 2; border-radius: 20px; padding: 12px 14px; color: #fff; background: rgba(40,40,44,0.72); border-color: rgba(255,255,255,0.15); }
.viewer .vcap-h { display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.75; margin-bottom: 4px; }
.viewer .vcap-h svg { width: 14px; height: 14px; }
.viewer .vcap-t { font-size: 15px; line-height: 1.4; }
.ai-add { padding-top: 70px; }
.ai-add-h { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--cm-text2); margin: 0 6px 14px; line-height: 1.35; }
.ai-add-h svg { width: 20px; height: 20px; color: var(--cm-accent); flex-shrink: 0; }
.ce .fi .lab2 { min-width: 86px; font-size: 17px; color: var(--cm-text); }
.ce .fi input[type="date"], .ce .fi input[type="time"] { flex: 0 1 auto; text-align: right; }
.ce .fi.tgl { justify-content: space-between; cursor: pointer; }
.ce .fi .tsw { position: relative; width: 51px; height: 31px; flex-shrink: 0; }
.ce .fi .tsw input { opacity: 0; width: 0; height: 0; position: absolute; }
.ce .fi .tsw span { position: absolute; inset: 0; border-radius: 31px; background: rgba(120,120,128,0.32); transition: background .25s; }
.ce .fi .tsw span::after { content: ''; position: absolute; width: 27px; height: 27px; border-radius: 50%; background: #fff; top: 2px; left: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform .25s; }
.ce .fi .tsw input:checked + span { background: var(--cm-green); }
.ce .fi .tsw input:checked + span::after { transform: translateX(20px); }
.ai-note { font-size: 14px; color: var(--cm-text2); margin: 0 6px 20px; line-height: 1.4; white-space: pre-wrap; }
.ai-note b { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px; font-weight: 500; }


/* ── PDF exports ── */
.pdfpage { background: var(--cm-bg); }
.pdfpage .pdf-frame { position: absolute; left: 0; right: 0; top: 64px; bottom: 74px; overflow: hidden; }
.pdfpage .pdf-inner { width: 100%; height: 100%; position: relative; }
.pdfpage .pdf-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 30px; text-align: center; color: var(--cm-text2); font-size: 15px; }
.pdfpage .pdf-status b { color: var(--cm-text); font-size: 17px; }
.pdfpage .pdf-status .spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--cm-fill); border-top-color: var(--cm-accent); animation: cm-spin 0.9s linear infinite; }
@keyframes cm-spin { to { transform: rotate(360deg); } }
.pdfpage .pdf-bar { width: 60%; max-width: 240px; height: 4px; border-radius: 2px; background: var(--cm-fill); overflow: hidden; visibility: hidden; }
.pdfpage .pdf-bar i { display: block; height: 100%; width: 0; background: var(--cm-accent); transition: width 0.2s; }
.pdfpage .pdf-actions { position: absolute; left: 12px; right: 12px; bottom: 14px; display: flex; gap: 10px; justify-content: center; z-index: 6; }
.pdfpage .pdf-actions .pill { flex: 1; max-width: 200px; justify-content: center; }
.pdfpage .pdf-actions .pill svg { width: 18px; height: 18px; }
.pdf-range .fi.tgl input[type="radio"] { position: absolute; opacity: 0; pointer-events: none; }
.pdf-range .fi.tgl .ck { width: 20px; height: 20px; color: var(--cm-accent); visibility: hidden; }
.pdf-range .fi.tgl.on .ck { visibility: visible; }
.pdf-range .fi .lab2 { flex: 1; }

`;

// ── Styles for the Apple Messages-style extras ───────────────────────────────
const CM_EXTRA_CSS = `
/* ── Pinned conversations ─────────────────────────── */
.pins { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 6px; padding: 6px 12px 14px; }
.pin { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; cursor: pointer; position: relative; }
.pin .pav { position: relative; }
.pin .pname { font-size: 12.5px; color: var(--cm-text2); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pin.unread .pname { color: var(--cm-text); font-weight: 600; }
.pin .pdot { position: absolute; left: -2px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: var(--cm-accent); border: 2px solid var(--cm-bg); }
.pin .pbub { position: absolute; left: 50%; top: -6px; transform: translate(-50%, -100%); max-width: 120px; padding: 5px 9px; border-radius: 13px; font-size: 11.5px; line-height: 1.25;
  background: var(--cm-recv); color: var(--cm-recv-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.pins.has-bub { padding-top: 34px; }
.swipe-lead { position: absolute; top: 0; bottom: 0; left: 0; display: flex; z-index: 0; visibility: hidden; transform: translateX(-100%); transition: transform 0.25s ease; }
.swipe-lead button { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; font-size: 13px; font-weight: 500; }
.swipe-lead button svg { width: 22px; height: 22px; }
.swipe-lead .unr { background: var(--cm-accent); }
.swipe-lead .pinb { background: #FF9F0A; }

/* ── Reply quotes, edits, reactions ───────────────── */
.quote { font-size: 13px; line-height: 1.3; color: var(--cm-text2); padding: 5px 11px; border-radius: 14px; margin-bottom: 1px; max-width: 100%;
  border: 1px solid var(--cm-sep); cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.quote b { font-weight: 600; color: var(--cm-text); display: block; font-size: 11.5px; }
.quote.gone { font-style: italic; }
.quote-line { width: 2px; align-self: stretch; }
.edited { font-size: 11px; color: var(--cm-accent); margin: 1px 6px 0; cursor: pointer; }
.mcol { position: relative; }
.mrow.has-tb { margin-top: 40px; }
.mrow.has-tb.first { margin-top: 44px; }
.tapbacks { position: absolute; top: -41px; display: flex; z-index: 3; cursor: pointer; }
.me .tapbacks { left: -16px; flex-direction: row-reverse; }
.them .tapbacks { right: -16px; }
/* a reaction badge: a circle with a two-dot thought-bubble tail towards the message */
.tapbacks .tb { position: relative; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--cm-tb, #3A3A3C); color: var(--cm-tb-fg, #fff); box-shadow: 0 0 0 2px var(--cm-tb-ring, rgba(0,0,0,0.35)), 0 2px 6px rgba(0,0,0,0.25); }
:host([data-mode="light"]) .tapbacks .tb { --cm-tb: #E9E9EB; --cm-tb-fg: #8E8E93; --cm-tb-ring: #fff; }
.tapbacks .tb.mine, :host([data-mode="light"]) .tapbacks .tb.mine { --cm-tb: var(--cm-accent); --cm-tb-fg: #fff; }
.tapbacks .tb + .tb { margin-left: -5px; }
.me .tapbacks .tb + .tb { margin-left: 0; margin-right: -5px; }
.tapbacks .tb svg { width: 18px; height: 18px; }
.tapbacks .tb.emo .tbe { font-size: 19px; line-height: 1; }
.tapbacks .tb small { position: absolute; right: -4px; bottom: -4px; min-width: 15px; height: 15px; border-radius: 8px; padding: 0 3px; font-size: 10px; font-weight: 700;
  background: var(--cm-tb); color: var(--cm-tb-fg); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 1.5px var(--cm-tb-ring, rgba(0,0,0,0.35)); }
.tapbacks .tb.lead::before, .tapbacks .tb.lead::after { content: ''; position: absolute; border-radius: 50%; background: var(--cm-tb); box-shadow: 0 0 0 1.5px var(--cm-tb-ring, rgba(0,0,0,0.35)); }
.tapbacks .tb.lead::before { width: 10px; height: 10px; bottom: -3px; }
.tapbacks .tb.lead::after { width: 5px; height: 5px; bottom: -9px; }
.them .tapbacks .tb.lead::before { right: 1px; }
.them .tapbacks .tb.lead::after { right: -4px; }
.me .tapbacks .tb.lead::before { left: 1px; }
.me .tapbacks .tb.lead::after { left: -4px; }
.tb-row { display: flex; align-items: center; justify-content: space-between; gap: 2px; padding: 6px 10px 8px; }
.tb-row button { width: 40px; height: 40px; border-radius: 50%; font-size: 23px; display: flex; align-items: center; justify-content: center; padding: 0 !important; flex-shrink: 0; }
.tb-row button.on { background: var(--cm-accent); }
.tb-row button.more { background: var(--cm-fill); font-size: 0; }
.tb-row button.more svg { width: 18px; height: 18px; }
.mstk { position: absolute; z-index: 4; pointer-events: auto; cursor: pointer; transform-origin: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); line-height: 1; }
.mstk.e { font-size: 34px; }
.mstk img { width: 58px; height: 58px; object-fit: contain; display: block; }

/* ── Text styles ──────────────────────────────────── */
.ts-bold { font-weight: 700; }
.ts-italic { font-style: italic; }
.ts-underline { text-decoration: underline; }
.ts-strike { text-decoration: line-through; }
.ts-underline.ts-strike { text-decoration: underline line-through; }
.ts-big { font-size: 1.55em; line-height: 1.15; font-weight: 600; }
.ts-small { font-size: 0.72em; }
.ts-anim i { font-style: inherit; display: inline-block; white-space: pre; }
.ts-shake i { animation: cm-shake 0.5s ease-in-out infinite; }
.ts-nod i { animation: cm-nod 1.2s ease-in-out infinite; }
.ts-ripple i { animation: cm-ripple 1.6s ease-in-out infinite; animation-delay: calc(var(--i) * 70ms); }
.ts-bloom i { animation: cm-bloom 1.8s ease-in-out infinite; animation-delay: calc(var(--i) * 40ms); }
.ts-jitter i { animation: cm-jitter 0.32s steps(2) infinite; animation-delay: calc(var(--i) * -37ms); }
@keyframes cm-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-1.5px) rotate(-2deg); } 75% { transform: translateX(1.5px) rotate(2deg); } }
@keyframes cm-nod { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2.5px) rotate(1deg); } }
@keyframes cm-ripple { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
@keyframes cm-bloom { 0%,100% { transform: scale(1); } 40% { transform: scale(1.28); } }
@keyframes cm-jitter { 0% { transform: translate(0.6px, -0.6px); } 50% { transform: translate(-0.6px, 0.8px); } 100% { transform: translate(0.4px, 0.3px); } }
:host([data-noanim]) .ts-anim i { animation: none !important; }
.mention { font-weight: 600; }
.them .mention { color: var(--cm-accent); }

/* ── Bubble effects ───────────────────────────────── */
.mrow.fx-slam .mcol { animation: cm-slam 0.7s cubic-bezier(.2,1.4,.4,1) both; }
.mrow.fx-loud .mcol { animation: cm-loud 1.1s ease both; }
.mrow.fx-gentle .mcol { animation: cm-gentle 1.8s ease both; }
.me .mcol { transform-origin: right bottom; }
.them .mcol { transform-origin: left bottom; }
@keyframes cm-slam { 0% { transform: scale(3) translateY(-30px); opacity: 0; } 45% { transform: scale(0.9); opacity: 1; } 65% { transform: scale(1.04); } 100% { transform: none; } }
@keyframes cm-loud { 0% { transform: scale(1); } 15% { transform: scale(2) rotate(-3deg); } 25% { transform: scale(2) rotate(3deg); } 35% { transform: scale(2) rotate(-3deg); } 45% { transform: scale(2) rotate(2deg); } 70% { transform: scale(1.9); } 100% { transform: none; } }
@keyframes cm-gentle { 0% { transform: scale(0.4); opacity: 0.4; } 60% { transform: scale(0.45); opacity: 1; } 100% { transform: none; } }
.mrow.fx-slam.shake-page { }
.ink-wrap { position: relative; display: inline; }
.bub.ink:not(.revealed) .btxt { filter: blur(7px); opacity: 0.5; }
.bub.ink:not(.revealed) { cursor: pointer; }
.me .bub.ink { --ink: rgba(255,255,255,0.9); }
.them .bub.ink { --ink: var(--cm-recv-text); }
.bub.ink:not(.revealed)::after { content: ''; position: absolute; inset: 4px 8px; border-radius: 14px; pointer-events: none;
  background-image: radial-gradient(circle, var(--ink) 0.8px, transparent 1.2px); background-size: 6px 6px; opacity: 0.55; animation: cm-ink 1.4s linear infinite; }
@keyframes cm-ink { 0% { background-position: 0 0; } 100% { background-position: 6px -6px; } }
.fx-layer { position: absolute; inset: 0; z-index: 40; pointer-events: none; }
.fx-layer canvas { width: 100%; height: 100%; display: block; }
.fx-shake { animation: cm-pageshake 0.5s ease; }
@keyframes cm-pageshake { 0%,100% { transform: none; } 20% { transform: translate(-4px, 2px); } 40% { transform: translate(4px, -2px); } 60% { transform: translate(-3px, 1px); } 80% { transform: translate(2px, -1px); } }
.fx-note { font-size: 11px; color: var(--cm-text2); margin: 1px 8px 0; cursor: pointer; }
.fx-note b { color: var(--cm-accent); font-weight: 600; }

/* ── Cards inside messages (polls, check in, devices, links) ── */
.xcard { width: 260px; max-width: 100%; border-radius: 18px; overflow: hidden; position: relative; }
.me .xcard { background: color-mix(in srgb, var(--cm-sent) 18%, var(--cm-recv)); color: var(--cm-recv-text); }
.them .xcard { background: var(--cm-recv); color: var(--cm-recv-text); }
.xcard .xh { display: flex; align-items: center; gap: 8px; padding: 11px 13px 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.65; }
.xcard .xh svg { width: 15px; height: 15px; }
.xcard .xt { padding: 2px 13px 8px; font-size: 17px; font-weight: 600; line-height: 1.25; word-break: break-word; }
.xcard .xs { padding: 0 13px 10px; font-size: 14px; opacity: 0.75; line-height: 1.35; }
.xcard .xbtns { display: flex; border-top: 0.5px solid color-mix(in srgb, currentColor 18%, transparent); }
.xcard .xbtns button { flex: 1; padding: 11px 6px; font-size: 15px; font-weight: 600; color: var(--cm-accent); }
.xcard .xbtns button + button { border-left: 0.5px solid color-mix(in srgb, currentColor 18%, transparent); }
.xcard .xbtns button.red { color: var(--cm-red); }
/* three or more: one per row, like an iPhone action list */
.xcard .xbtns.stack { flex-direction: column; }
.xcard .xbtns.stack button + button { border-left: none; border-top: 0.5px solid color-mix(in srgb, currentColor 18%, transparent); }
.popt { display: flex; align-items: center; gap: 10px; padding: 9px 13px; position: relative; cursor: pointer; }
.popt + .popt { border-top: 0.5px solid color-mix(in srgb, currentColor 12%, transparent); }
.popt .pbar { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--cm-accent) 16%, transparent); transition: width 0.35s ease; }
.popt .pck { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, currentColor 35%, transparent); flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; color: #fff; }
.popt.on .pck { background: var(--cm-accent); border-color: var(--cm-accent); }
.popt .pck svg { width: 13px; height: 13px; }
.popt .ptx { flex: 1; min-width: 0; font-size: 15.5px; position: relative; word-break: break-word; }
.popt .pvt { display: flex; align-items: center; position: relative; }
.popt .pvt .av { border: 1.5px solid var(--cm-recv); margin-left: -6px; }
.popt .pn { font-size: 13px; opacity: 0.6; min-width: 14px; text-align: right; position: relative; font-variant-numeric: tabular-nums; }
.ci-badge { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #34C759; color: #fff; flex-shrink: 0; }
.ci-badge svg { width: 22px; height: 22px; }
.ci-badge.late { background: var(--cm-red); }
.ci-badge.ended { background: #8E8E93; }
.ci-badge.active { background: var(--cm-accent); }
.ci-top { display: flex; align-items: center; gap: 11px; padding: 13px 13px 10px; }
.ci-top .ct { font-size: 16px; font-weight: 600; }
.ci-top .cs { font-size: 13.5px; opacity: 0.72; line-height: 1.3; margin-top: 1px; }
.ent-top { display: flex; align-items: center; gap: 11px; padding: 12px 13px; cursor: pointer; }
.ent-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: color-mix(in srgb, currentColor 10%, transparent); --mdc-icon-size: 22px; }
.ent-icon.on { background: color-mix(in srgb, #FFB300 28%, transparent); color: #FFB300; }
.ent-top .en { font-size: 15.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ent-top .es { font-size: 13.5px; opacity: 0.7; }
.ent-cam { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; background: #000; }
.ent-note { padding: 0 13px 11px; font-size: 15px; }
.linkc { width: 260px; max-width: 100%; border-radius: 18px; overflow: hidden; cursor: pointer; }
.me .linkc { background: color-mix(in srgb, var(--cm-sent) 18%, var(--cm-recv)); color: var(--cm-recv-text); }
.them .linkc { background: var(--cm-recv); color: var(--cm-recv-text); }
.linkc img { width: 100%; max-height: 190px; object-fit: cover; display: block; background: var(--cm-fill); }
.linkc .lt { padding: 9px 12px 1px; font-size: 14.5px; font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.linkc .ls { padding: 0 12px 9px; font-size: 12.5px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actbtns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; max-width: 280px; }
.actbtns button { padding: 8px 14px; border-radius: 16px; font-size: 15px; font-weight: 600; color: var(--cm-accent); }
.actbtns button[disabled] { opacity: 0.4; }
.actdone { font-size: 12.5px; color: var(--cm-text2); margin: 2px 8px 0; display: flex; align-items: center; gap: 4px; }
.actdone svg { width: 13px; height: 13px; color: var(--cm-green); }
.stkmsg { cursor: default; line-height: 1; }
.stkmsg.e { font-size: 92px; padding: 0 4px; }
.stkmsg img { width: 150px; height: 150px; object-fit: contain; display: block; }
.stkmsg.loading { width: 150px; height: 150px; }

/* ── Audio files ──────────────────────────────────── */
.audio { min-width: 250px; }
.audio .bars { gap: 1.5px; }
.audio .bars i { min-width: 2px; }
.audio .spd { font-size: 12px; font-weight: 700; min-width: 34px; height: 22px; border-radius: 11px; padding: 0 6px; background: rgba(255,255,255,0.22); }
.them .audio .spd { background: color-mix(in srgb, var(--cm-recv-text) 12%, transparent); }

/* ── Disappearing & Send Later ────────────────────── */
.dis-note { display: flex; align-items: center; justify-content: center; gap: 5px; }
.dis-note svg { width: 13px; height: 13px; }
.sched-h { font-size: 11.5px; color: var(--cm-text2); margin: 10px 6px 2px; display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.sched-h svg { width: 12px; height: 12px; }
.mrow.sched .bub, .mrow.sched .xcard, .mrow.sched .stkmsg { opacity: 0.6; outline: 1.5px dashed color-mix(in srgb, var(--cm-sent) 70%, transparent); outline-offset: 2px; cursor: pointer; }
.mrow.sched .bub { background: transparent; color: var(--cm-text); }
.mrow.sched .bub .tail { display: none; }

/* ── Composer additions ───────────────────────────── */
.cbanner { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-radius: 18px; font-size: 13.5px; }
.cbanner .cbt { flex: 1; min-width: 0; line-height: 1.3; }
.cbanner .cbt b { display: block; font-size: 12px; color: var(--cm-accent); }
.cbanner .cbt span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--cm-text2); }
.cbanner button { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--cm-fill); flex-shrink: 0; }
.cbanner button svg { width: 12px; height: 12px; }
/* Text formatting: one capsule of B I U S, like Apple Messages */
.fmtbar { display: flex; align-self: flex-start; width: fit-content; gap: 2px; padding: 4px; border-radius: 999px; margin-left: 4px; }
.fmtbar[hidden] { display: none; }
.fmtbar button { width: 50px; height: 38px; border-radius: 999px; font-size: 19px; line-height: 1; color: var(--cm-text); background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif; transition: background 0.15s ease, color 0.15s ease; }
.fmtbar button:active { background: var(--cm-fill); }
.fmtbar button.on { background: var(--cm-text); color: var(--cm-bg, #000); }
.fmtbar .fb-bold { font-weight: 700; }
.fmtbar .fb-italic { font-style: italic; }
.fmtbar .fb-underline { text-decoration: underline; text-underline-offset: 3px; }
.fmtbar .fb-strike { text-decoration: line-through; }
.mentsug { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.mentsug button { display: flex; align-items: center; gap: 6px; padding: 4px 12px 4px 4px; border-radius: 18px; font-size: 14.5px; white-space: nowrap; flex-shrink: 0; }
.composer .fxbadge { position: absolute; right: 4px; top: -6px; background: var(--cm-accent); color: #fff; border-radius: 8px; font-size: 9.5px; font-weight: 700; padding: 1px 5px; }
.field .fbtn.aa { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif; }
.field .fbtn.aa.on { color: var(--cm-accent); }
.cmode { font-size: 12px; color: var(--cm-accent); padding: 0 6px; }

/* ── Sheets for the extras (apps, stickers, polls, …) ── */
.xs-wrap { position: absolute; inset: 0; z-index: 35; display: flex; align-items: flex-end; background: rgba(0,0,0,0); transition: background 0.25s; }
.xs-wrap.show { background: var(--cm-scrim, rgba(0,0,0,0.3)); }
.xsheet { width: 100%; max-height: 86%; border-radius: 30px 30px 0 0; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.34s cubic-bezier(.2,.9,.25,1);
  background: var(--cm-sheet); border-top: 0.5px solid var(--cm-sheetedge); box-shadow: 0 -10px 40px rgba(0,0,0,0.25); backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%); }
/* Glass popups on: the bottom sheets use exactly the same Liquid Glass as the popup boxes and
   menus - a light white tint, blur, a bright edge and a shine across the top - with the same
   light shade behind them */
:host([data-popups="glass"]) .xs-wrap.show { background: rgba(0,0,0,0.24); }
:host([data-popups="glass"]) .xsheet {
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 240px), linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
  backdrop-filter: blur(26px) saturate(2.1) brightness(0.92); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(0.92);
  border: 1px solid rgba(255,255,255,0.22); border-bottom: none;
  box-shadow: 0 -20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 0 24px rgba(255,255,255,0.05);
}
:host([data-popups="glass"][data-mode="light"]) .xs-wrap.show { background: rgba(255,255,255,0.14); }
:host([data-popups="glass"][data-mode="light"]) .xsheet {
  background: linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0) 240px), linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.38));
  backdrop-filter: blur(26px) saturate(2.1) brightness(1.05); -webkit-backdrop-filter: blur(26px) saturate(2.1) brightness(1.05);
  border-color: rgba(255,255,255,0.75);
  box-shadow: 0 -20px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 24px rgba(255,255,255,0.25);
}
/* the message box shows through the glass at the bottom: leave room so the last row sits above it */
:host([data-popups="glass"]) .xsheet .xbody { padding-bottom: 84px; }
:host([data-popups="solid"]) .xsheet { background: var(--cm-sheet-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
.xs-wrap.show .xsheet { transform: none; }
:host([data-noanim]) .xsheet, :host([data-noanim]) .xs-wrap { transition: none; }
.xsheet .xhd { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 6px; min-height: 56px; position: relative; flex-shrink: 0; }
.xsheet .xhd h3 { position: absolute; left: 50%; transform: translateX(-50%); margin: 0; font-size: 17px; font-weight: 600; white-space: nowrap; }
.xsheet .xbody { overflow-y: auto; padding: 4px 16px 24px; -webkit-overflow-scrolling: touch; }
.xsheet .pill.accent[disabled] { opacity: 0.4; }
.apps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 8px; padding: 8px 4px 10px; }
.app { display: flex; flex-direction: column; align-items: center; gap: 7px; font-size: 13px; cursor: pointer; text-align: center; }
.app .ai { width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.18); }
.app .ai svg { width: 28px; height: 28px; }
.app .ai { transition: transform 0.12s ease, filter 0.12s ease; }
.app:active .ai { transform: scale(0.94); }
/* Glass popups on: frosted glass circles with white symbols, like the iPhone's call screen
   (the coloured circles are kept when glass is off) */
:host([data-popups="glass"]) .app .ai {
  background: linear-gradient(160deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08)) !important;
  border: 1px solid rgba(255,255,255,0.26);
  backdrop-filter: blur(18px) saturate(1.8); -webkit-backdrop-filter: blur(18px) saturate(1.8);
  box-shadow: 0 6px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -1px 0 rgba(255,255,255,0.06);
  color: #fff;
}
:host([data-popups="glass"]) .app:active .ai { filter: brightness(1.35); }
:host([data-popups="glass"][data-mode="light"]) .app .ai {
  background: linear-gradient(160deg, rgba(255,255,255,0.80), rgba(255,255,255,0.50)) !important;
  border-color: rgba(255,255,255,0.9);
  box-shadow: 0 6px 18px rgba(0,0,0,0.10), inset 0 1px 0 #fff;
  color: #1c1c1e;
}
:host([data-popups="glass"][data-mode="light"]) .app:active .ai { filter: brightness(0.92); }
.app[aria-disabled="true"] { opacity: 0.4; }
.segc2 { display: flex; background: var(--cm-fill); border-radius: 10px; padding: 2px; margin: 0 0 12px; }
.segc2 button { flex: 1; padding: 6px 4px; border-radius: 8px; font-size: 13.5px; font-weight: 500; }
.segc2 button.on { background: var(--cm-glass-solid); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.egrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 6px; }
.egrid button { font-size: 40px; height: 62px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.egrid button:active { background: var(--cm-fill); transform: scale(0.92); }
/* the emoji picker: a row of categories, then the emoji */
.emo-tabs { display: flex; gap: 4px; background: var(--cm-fill); border-radius: 14px; padding: 4px; margin: 0 0 10px; overflow-x: auto; scrollbar-width: none; position: sticky; top: 0; z-index: 1; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.emo-tabs::-webkit-scrollbar { display: none; }
.emo-tabs button { flex: 1 0 36px; height: 36px; border-radius: 10px; font-size: 21px; display: flex; align-items: center; justify-content: center; opacity: 0.55; }
.emo-tabs button.on { opacity: 1; background: var(--cm-glass-solid); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.emo-search { position: relative; display: flex; align-items: center; margin: 0 0 10px; }
.emo-search-icon { position: absolute; left: 11px; width: 15px; height: 15px; fill: var(--cm-text2); pointer-events: none; }
.emo-search-input { width: 100%; box-sizing: border-box; background: var(--cm-fill); border: 1px solid color-mix(in srgb, var(--cm-text) 13%, transparent); border-radius: 12px; padding: 9px 34px; color: var(--cm-text); font: 15px -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; outline: none; -webkit-appearance: none; user-select: text; -webkit-user-select: text; }
.emo-search-input::placeholder { color: var(--cm-text2); }
.emo-search-input:focus { border-color: color-mix(in srgb, var(--cm-text) 28%, transparent); }
.emo-search-clear { display: none; position: absolute; right: 9px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; border-radius: 50%; background: color-mix(in srgb, var(--cm-text) 22%, transparent); padding: 0; align-items: center; justify-content: center; }
.emo-search-clear svg { width: 10px; height: 10px; fill: var(--cm-text); display: block; }
.emo-body { min-height: min(62vh, 520px); }
.emo-none { text-align: center; color: var(--cm-text2); font-size: 14px; padding: 30px 10px; }
.emo-body .egrid { grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 4px; }
.emo-body .egrid button { font-size: 34px; height: 54px; }
.sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
.sgrid .stile { aspect-ratio: 1; border-radius: 16px; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
.sgrid .stile img { width: 86%; height: 86%; object-fit: contain; }
.sgrid .stile.add { border: 1.5px dashed var(--cm-text3); color: var(--cm-accent); flex-direction: column; gap: 4px; font-size: 12.5px; }
.sgrid .stile.add svg { width: 26px; height: 26px; }
.sgrid .stile .sx { position: absolute; top: -4px; right: -4px; width: 22px; height: 22px; border-radius: 50%; background: var(--cm-red); color: #fff; display: none; align-items: center; justify-content: center; }
.sgrid.editing .stile .sx { display: flex; }
.sgrid .stile .sx svg { width: 11px; height: 11px; }
.xfield { width: 100%; border: none; outline: none; background: var(--cm-fill); border-radius: 12px; padding: 12px 14px; font-size: 16px; margin-bottom: 8px; color: var(--cm-text); }
.xfield::placeholder { color: var(--cm-text2); }
.xrow { display: flex; align-items: center; gap: 8px; }
.xrow .xfield { flex: 1; margin-bottom: 8px; }
.xlabel { font-size: 13px; color: var(--cm-text2); text-transform: uppercase; letter-spacing: 0.02em; margin: 12px 4px 6px; }
.chipsel { display: flex; flex-wrap: wrap; gap: 6px; }
.chipsel button { padding: 8px 13px; border-radius: 16px; font-size: 14.5px; background: var(--cm-fill); }
.chipsel button.on { background: var(--cm-accent); color: #fff; }
.xnote { font-size: 13px; color: var(--cm-text2); line-height: 1.4; margin: 10px 4px; }
.entlist .gr { min-height: 56px; }
.entlist .gr ha-state-icon { color: var(--cm-accent); --mdc-icon-size: 22px; }
.entlist .gr .gsub { font-size: 13px; color: var(--cm-text2); }
.crop-stage { position: relative; width: 260px; height: 260px; margin: 6px auto 12px; border-radius: 20px; overflow: hidden; touch-action: none;
  background: repeating-conic-gradient(var(--cm-fill) 0% 25%, transparent 0% 50%) 50% / 20px 20px; }
.crop-stage canvas { width: 100%; height: 100%; display: block; }

/* ── Sketch & Markup ──────────────────────────────── */
.sketch { position: absolute; inset: 0; z-index: 45; display: flex; flex-direction: column; background: #111; color: #fff; }
.sketch .skt { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; gap: 8px; }
.sketch .skt .pill { height: 38px; font-size: 16px; padding: 0 16px; }
.sketch .skt .g { color: #fff; background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.16); }
.sketch .skt .g.accent { background: var(--cm-accent); border-color: transparent; }
.sketch .skc { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; padding: 0 12px; }
.sketch canvas { touch-action: none; border-radius: 18px; max-width: 100%; max-height: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
.sketch .skb { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; padding: 12px 14px 16px; }
.sketch .skb .brk { flex-basis: 100%; height: 0; }
.sketch .sw { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.35); }
.sketch .sw.on { outline: 2.5px solid #fff; outline-offset: 2px; }
.sketch .sz { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(255,255,255,0.1); }
.sketch .sz i { display: block; border-radius: 50%; background: #fff; }
.sketch .sz.on { background: rgba(255,255,255,0.32); }
.sketch .skb .cb { width: 38px; height: 38px; color: #fff; background: rgba(255,255,255,0.14); }
.sketch .skb .cb svg { width: 18px; height: 18px; }
.sketch .vsep { width: 1px; height: 26px; background: rgba(255,255,255,0.25); flex-shrink: 0; }
.field .stage .st .mk { position: absolute; left: 4px; bottom: 4px; height: 20px; padding: 0 6px; border-radius: 10px; background: rgba(0,0,0,0.6); color: #fff; font-size: 10.5px; font-weight: 600; display: flex; align-items: center; }
`;

// ── Styles for the WhatsApp / Messenger / Apple extras ──────────────────────
const CM_MORE_CSS = `
.thread .msgs { padding-top: 120px; padding-bottom: calc(var(--cm-composer-h, 66px) + 30px); }
.thread .edge.top { height: 94px; }
.mrow.callwrap { justify-content: center; margin: 10px 0; }
.callrow { display: flex; align-items: center; gap: 11px; padding: 9px 10px 9px 10px; border-radius: 20px; max-width: 340px; width: 100%; cursor: default; position: relative; }
.callrow .cic { width: 38px; height: 38px; border-radius: 50%; background: var(--cm-green); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.callrow .cic.ft { background: linear-gradient(160deg, #5BE37D, #1DB954); }
.callrow .cic svg { width: 19px; height: 19px; }
.callrow .cbody { flex: 1; min-width: 0; line-height: 1.3; }
.callrow .cbody b { display: block; font-size: 15px; }
.callrow .cbody span { display: block; font-size: 12.5px; color: var(--cm-text2); }
.callrow button { color: var(--cm-accent); font-weight: 600; font-size: 14px; padding: 6px 10px; border-radius: 14px; background: var(--cm-fill); white-space: nowrap; }
.mrow.callwrap .tapbacks { top: -41px; right: calc(50% - 170px); left: auto; }
.fwd { font-size: 11.5px; color: var(--cm-text2); margin: 0 8px 1px; display: flex; align-items: center; gap: 4px; font-style: italic; }
.fwd svg { width: 12px; height: 12px; }
.starmk { font-size: 11px; color: #FFCC00; margin: 1px 8px 0; display: flex; align-items: center; gap: 3px; }
.starmk svg { width: 12px; height: 12px; }
.quote .qfrom { font-weight: 400; color: var(--cm-text2); }

/* Sent with Send Later; the timer beside a disappearing message */
.sl-note { display: flex; align-items: center; gap: 3px; cursor: default; }
.sl-note svg { width: 11px; height: 11px; }
.ttl-anchor { position: relative; align-self: stretch; height: 0; margin-top: -2px; }
.ttl-ic { position: absolute; bottom: 4px; width: 18px; height: 18px; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--cm-text3, var(--cm-text2)); opacity: 0.8; }
.ttl-ic svg { width: 13px; height: 13px; }
.me .ttl-ic { left: -22px; }
.them .ttl-ic { right: -22px; }

/* pinned messages bar, Focus, activity, birthday */
.pinbar { position: absolute; left: 12px; right: 12px; top: 110px; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 16px; cursor: pointer; }
.pinbar svg { width: 16px; height: 16px; color: var(--cm-accent); flex-shrink: 0; }
.pinbar .pbt { flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.3; }
.pinbar .pbt b { display: block; font-size: 11.5px; color: var(--cm-accent); }
.pinbar .pbt span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pinbar .pbn { font-size: 11px; color: var(--cm-text2); }
.thread.has-pins .msgs { padding-top: 166px; }
.th-head .presence { font-size: 11px; color: var(--cm-text2); margin-top: 1px; white-space: nowrap; padding: 1px 8px; border-radius: 9px; background: var(--cm-glass); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
.bdaybar .bx svg { width: 12px; height: 12px; }
.th-head .presence.on { color: var(--cm-green); }
.focusbar, .bdaybar { display: flex; align-items: center; gap: 8px; padding: 7px 8px 7px 12px; border-radius: 16px; font-size: 13px; }
.focusbar svg { width: 15px; height: 15px; color: #5E5CE6; flex-shrink: 0; }
.focusbar span, .bdaybar span { flex: 1; min-width: 0; color: var(--cm-text2); }
.focusbar button, .bdaybar button { color: var(--cm-accent); font-weight: 600; font-size: 13.5px; padding: 4px 8px; white-space: nowrap; }
.bdaybar .bx { color: var(--cm-text2); font-weight: 400; padding: 4px; }
.field .fbtn.quick { font-size: 21px; }
.field .stage .st.st-app { width: auto; max-width: 260px; height: 56px; padding: 0 34px 0 8px; gap: 9px; justify-content: flex-start; border-radius: 16px; }
.st-app .sai { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.st-app .sai svg { width: 20px; height: 20px; }
.st-app .sat { min-width: 0; line-height: 1.25; }
.st-app .sat b { display: block; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-app .sat span { display: block; font-size: 12px; color: var(--cm-text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.field .stage .st.st-app .stx { top: 50%; transform: translateY(-50%); right: 6px; }
.field .fbtn.send.dim { opacity: 0.35; box-shadow: none; cursor: default; }

/* iPhone-style sheets (Checklist, Poll, Event): a big title, grouped rows, notes underneath */
.ios-title { display: block; width: 100%; box-sizing: border-box; border: none; outline: none; background: transparent; color: var(--cm-text);
  font-size: 26px; font-weight: 700; letter-spacing: -0.02em; padding: 4px 6px 14px; user-select: text; -webkit-user-select: text; }
.ios-title::placeholder { color: var(--cm-text3, var(--cm-text2)); }
.sgroup { border-radius: 14px; overflow: hidden; background: var(--cm-fill); margin-bottom: 8px; }
.sgroup + .sgroup { margin-top: 18px; }
.sgroup .gr { min-height: 48px; padding: 8px 16px; cursor: default; }
.sgroup .gr[role="button"], .sgroup label.gr { cursor: pointer; }
.sgroup .gr:active { background: transparent; }
.sgroup .gr[role="button"]:active { background: var(--cm-fill2, var(--cm-fill)); }
.sgroup .gr[hidden] { display: none; }
.sgroup .gr .gi { color: var(--cm-text2); width: 20px; height: 20px; }
.sfoot { font-size: 13px; color: var(--cm-text2); line-height: 1.35; margin: 2px 16px 0; }
.sfoot + .sfoot { margin-top: 8px; }
.sgroup + .sfoot, .lrows + .sfoot { margin-top: 0; }
.xbody .items, .xbody .opts { margin-bottom: 18px; }
.gin-text { flex: 1; min-width: 0; border: none; outline: none; background: transparent; color: var(--cm-text); font-size: 17px; padding: 6px 0; user-select: text; -webkit-user-select: text; }
.gin-text::placeholder { color: var(--cm-text2); }
.fbox .frow { min-height: 50px; cursor: text; }
.fbox .frow + .frow::before { left: 16px; }
.fbox .gin-text { padding: 12px 0; }
.fbox .frow.zoned::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--cm-accent); flex-shrink: 0; }
.sugg { margin-top: -2px; }
.sugg .srow { display: flex; align-items: center; gap: 12px; padding: 8px 14px; min-height: 52px; position: relative; cursor: pointer; }
.sugg .srow + .srow::before { content: ''; position: absolute; top: 0; left: 60px; right: 0; height: 0.5px; background: var(--cm-sep); }
.sugg .srow:active { background: var(--cm-fill2, var(--cm-fill)); }
.sugg .sav { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--cm-accent) 16%, transparent); color: var(--cm-accent); --mdc-icon-size: 19px; }
.sugg .sb { flex: 1; min-width: 0; }
.sugg .sn { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sugg .ss { font-size: 13px; color: var(--cm-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gpill { border: none; outline: none; background: color-mix(in srgb, var(--cm-text) 10%, transparent); color: var(--cm-text); border-radius: 8px; padding: 6px 10px; font-size: 16px; font-family: inherit; -webkit-appearance: none; appearance: none; min-height: 34px; }
/* the rows you type into, like Reminders */
.lrow { display: flex; align-items: center; gap: 12px; padding: 0 12px 0 16px; min-height: 48px; position: relative; width: 100%; box-sizing: border-box; text-align: left; }
.lrow + .lrow::before { content: ''; position: absolute; top: 0; left: 50px; right: 0; height: 0.5px; background: var(--cm-sep); }
.lrow .lc { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--cm-text3, var(--cm-text2)); flex-shrink: 0; box-sizing: border-box; }
.lrow input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; color: var(--cm-text); font-size: 17px; padding: 12px 0; user-select: text; -webkit-user-select: text; }
.lrow input::placeholder { color: var(--cm-text3, var(--cm-text2)); }
.lrow .ldel { width: 24px; height: 24px; padding: 0; flex-shrink: 0; display: none; }
.lrow .ldel svg { width: 22px; height: 22px; }
.lrow.li:focus-within .ldel { display: flex; }
.lrows.one .ldel { display: none !important; }
.lrow.ladd { color: var(--cm-text); font-size: 17px; cursor: pointer; }
.lrow.ladd .lpl { width: 22px; height: 22px; display: flex; flex-shrink: 0; }
.lrow.ladd .lpl svg { width: 22px; height: 22px; }
.lrow.ladd:active { background: var(--cm-fill2, var(--cm-fill)); }
.lrow.ladd[hidden] { display: none; }

/* Share Device: collapsible rooms / types, one-line rows with the state on the right */
.dview { margin-bottom: 14px; }
.dsec { margin-bottom: 10px; }
.dsec .xlabel { margin-top: 2px; }
.dhead { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 72px; box-sizing: border-box; padding: 10px 16px 10px 12px; border-radius: 14px; background: var(--cm-fill); text-align: left; color: var(--cm-text); }
.dhead:active { filter: brightness(1.15); }
.dhead .dav { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--cm-accent) 16%, transparent); color: var(--cm-accent); --mdc-icon-size: 26px; }
.dhead .db { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 2px 0; }
.dhead .dt { font-size: 17px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dhead .dc { font-size: 15px; font-weight: 400; color: var(--cm-text2); margin-top: 1px; }
.dhead .dchev { width: 14px; height: 14px; color: var(--cm-text3, var(--cm-text2)); display: flex; transition: transform 0.2s ease; }
.dhead .dchev svg { width: 14px; height: 14px; }
.dsec.open .dhead { border-radius: 14px 14px 0 0; }
.dsec.open .dhead .dchev { transform: rotate(90deg); }
.dsec.open .dhead + .dbox { border-radius: 0 0 14px 14px; margin-top: 0; }
.dsec.open .dhead + .dbox .drow:first-child::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 0.5px; background: var(--cm-sep); }
.drow { position: relative; overflow: hidden; cursor: pointer; touch-action: pan-y; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.drow-in { display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 12px; min-height: 72px; box-sizing: border-box; position: relative; z-index: 1; transition: transform 0.25s ease; }
.drow + .drow::before { content: ''; position: absolute; top: 0; left: 76px; right: 0; height: 0.5px; background: var(--cm-sep); z-index: 2; }
.drow:active .drow-in, .drow.held .drow-in { background: var(--cm-fill2, var(--cm-fill)); }
.drow.open-l .drow-in, .drow.open-r .drow-in { background: transparent; }
.drow .dav { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--cm-accent) 16%, transparent); }
.drow ha-state-icon { --mdc-icon-size: 26px; display: flex; color: var(--cm-accent); }
.drow .db { flex: 1; min-width: 0; padding: 2px 0; }
.drow .dn { font-size: 17px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drow .ds { color: var(--cm-text2); font-size: 15px; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dlab { margin-top: 14px; }
.dsw-l, .dsw-r { position: absolute; top: 0; bottom: 0; display: flex; visibility: hidden; transition: transform 0.25s ease; }
.dsw-l { left: 0; transform: translateX(-80px); }
.dsw-r { right: 0; transform: translateX(80px); }
.dsw-l button, .dsw-r button { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; font-size: 13px; font-weight: 500; }
.dsw-l button svg, .dsw-r button svg { width: 22px; height: 22px; }
.dsw-l .pinb { background: #FF9F0A; }
.dsw-r .hid { background: #8E8E93; }
.dsw-r .del { background: var(--cm-red); }
.dsw-r .shw { background: var(--cm-accent); }
.drow .dtick { width: 22px; height: 22px; flex-shrink: 0; color: var(--cm-accent); display: flex; }
.drow .dtick svg { width: 22px; height: 22px; }
.drow .dav ha-icon { --mdc-icon-size: 26px; display: flex; color: var(--cm-accent); }
.dhead.znew { margin-top: 10px; }
.dhid { display: block; margin: 14px auto 0; padding: 8px 14px; font-size: 15px; color: var(--cm-accent); background: none; }
.dhid[hidden] { display: none; }

/* location */
.locmap { position: relative; width: 100%; height: 150px; overflow: hidden; background: #dfe3e8; cursor: pointer; }
.locmap .tiles { position: absolute; }
.locmap .tiles img { position: absolute; width: 256px; height: 256px; max-width: none; }
:host([data-mode="dark"]) .locmap .tiles { filter: invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.9); }
.locmap .lpin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -100%); width: 30px; height: 38px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); }
.locmap .ldot { position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: var(--cm-accent); border: 3px solid #fff; box-shadow: 0 0 0 8px color-mix(in srgb, var(--cm-accent) 25%, transparent); animation: cm-pulse 2s infinite; }
.locmap .attr { position: absolute; right: 4px; bottom: 2px; font-size: 8px; color: rgba(0,0,0,0.55); }
.loc-info { padding: 9px 13px 10px; }
.loc-info .lt { font-size: 15px; font-weight: 600; }
.loc-info .ls { font-size: 12.5px; opacity: 0.7; margin-top: 1px; }
.loc-info .ls.live { color: var(--cm-green); opacity: 1; font-weight: 600; }

/* checklist */
.cli { display: flex; align-items: center; gap: 10px; padding: 8px 13px; }
.cli + .cli { border-top: 0.5px solid color-mix(in srgb, currentColor 12%, transparent); }
.cli .cck { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, currentColor 35%, transparent); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; }
.cli.done .cck { background: var(--cm-green); border-color: var(--cm-green); }
.cli .cck svg { width: 13px; height: 13px; }
.cli .ctx { flex: 1; min-width: 0; font-size: 15.5px; cursor: pointer; word-break: break-word; }
.cli.done .ctx { text-decoration: line-through; opacity: 0.55; }
.cli .cx { width: 22px; height: 22px; opacity: 0.35; display: flex; align-items: center; justify-content: center; }
.cli .cx svg { width: 11px; height: 11px; }

/* event */
.ev-top { display: flex; gap: 12px; padding: 12px 13px 8px; }
/* like the iOS Calendar icon: a white tile (dark in Dark Mode), the weekday in red, the date large */
.ev-date { width: 58px; height: 58px; flex-shrink: 0; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(#ffffff, #f4f4f6); color: #1c1c1e; text-align: center;
  box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.08); }
:host([data-mode="dark"]) .ev-date { background: linear-gradient(#2c2c2e, #1c1c1e); color: #fff;
  box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 3px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.2); }
.ev-date .em { color: #FF3B30; font-size: 10.5px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1; margin-top: 1px; }
:host([data-mode="dark"]) .ev-date .em { color: #FF453A; }
.ev-date .ed { font-size: 31px; font-weight: 400; letter-spacing: -0.03em; line-height: 1; margin-top: 3px; font-variant-numeric: tabular-nums; }
.ev-top .et { font-size: 16px; font-weight: 600; line-height: 1.25; word-break: break-word; }
.ev-top .es { font-size: 13px; opacity: 0.72; margin-top: 2px; line-height: 1.3; }
.ev-rsvp { display: flex; gap: 6px; padding: 4px 13px 10px; }
.ev-rsvp button { flex: 1; padding: 7px 4px; border-radius: 12px; font-size: 13.5px; font-weight: 600; background: color-mix(in srgb, currentColor 10%, transparent); }
.ev-rsvp button.on { background: var(--cm-accent); color: #fff; }
.ev-count { padding: 0 13px 10px; font-size: 12.5px; opacity: 0.65; }

/* contact card */
.ct-top { display: flex; align-items: center; gap: 11px; padding: 12px 13px; }
.ct-top .cn { font-size: 16px; font-weight: 600; }
.ct-top .cs { font-size: 13px; opacity: 0.7; }

/* View Once */
.vo { display: flex; align-items: center; gap: 9px; padding: 9px 14px; border-radius: 19px; font-size: 15px; cursor: pointer; }
.me .vo { background: var(--cm-sent); color: var(--cm-sent-text); }
.them .vo { background: var(--cm-recv); color: var(--cm-recv-text); }
.vo .vo1 { width: 24px; height: 24px; border-radius: 50%; border: 2px dashed currentColor; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.vo.opened { opacity: 0.6; cursor: default; }

/* pages: media, starred, search */
.segc3 { display: flex; background: var(--cm-fill); border-radius: 10px; padding: 2px; margin: 0 0 14px; }
.segc3 button { flex: 1; padding: 6px 4px; border-radius: 8px; font-size: 13.5px; font-weight: 500; }
.segc3 button.on { background: var(--cm-glass-solid); box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.mgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; border-radius: 14px; overflow: hidden; }
.mgrid .mt { aspect-ratio: 1; background: var(--cm-fill); position: relative; cursor: pointer; overflow: hidden; }
.mgrid .mt img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mgrid .mt .vd { position: absolute; left: 6px; bottom: 4px; font-size: 11px; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
.lrow { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; }
.lrow + .lrow { border-top: 0.5px solid var(--cm-sep); }
.lrow .lth { width: 48px; height: 48px; border-radius: 10px; background: var(--cm-fill); flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); }
.lrow .lth img { width: 100%; height: 100%; object-fit: cover; }
.lrow .lth svg { width: 22px; height: 22px; }
.lrow .lb { flex: 1; min-width: 0; }
.lrow .l1 { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lrow .l2 { font-size: 13px; color: var(--cm-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lrow .l3 { font-size: 12px; color: var(--cm-text3); }
.schips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 4px 16px 6px; }
.schips button { padding: 6px 12px; border-radius: 15px; font-size: 13.5px; background: var(--cm-fill); white-space: nowrap; flex-shrink: 0; }
.schips button.on { background: var(--cm-accent); color: #fff; }
/* Ask This Chat */
.schips .ask-chip { display: inline-flex; align-items: center; gap: 4px; color: var(--cm-accent); font-weight: 600; }
.schips .ask-chip.on { color: #fff; }
.ask-sp { display: inline-flex; color: var(--cm-accent); }
.ask-sp svg { width: 15px; height: 15px; }
.schips .ask-chip.on .ask-sp { color: inherit; }
.ask-slot:empty { display: none; }
.ask-slot { margin: 6px 0 12px; }
.ask-card { border-radius: 20px; padding: 12px 14px 10px; background: var(--cm-glass-strong) !important; }
.ask-card .cu-h { margin-bottom: 6px; }
.ask-copy { width: 26px; height: 26px; border-radius: 50%; background: var(--cm-fill); color: var(--cm-text2); display: flex; align-items: center; justify-content: center; }
.ask-copy svg { width: 13px; height: 13px; }
.ask-q { font-size: 13px; color: var(--cm-text2); margin-bottom: 4px; }
.ask-a { font-size: 16px; line-height: 1.4; user-select: text; -webkit-user-select: text; }
.ask-a.none { color: var(--cm-text2); }
.ask-from { font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--cm-text2); margin: 12px 2px 4px; }
.ask-quotes { margin: 0 -4px; background: none !important; }
.ask-note { font-size: 11.5px; color: var(--cm-text3, var(--cm-text2)); margin-top: 10px; }
.ask-offer { width: 100%; display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 16px; margin: 4px 0 10px; font-size: 15.5px; text-align: left; color: var(--cm-text); }
.ask-offer .ask-ot { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ask-offer > svg { width: 13px; height: 13px; color: var(--cm-text3, var(--cm-text2)); flex-shrink: 0; }
.ask-hint { padding-top: 40px; }
.pick-row { display: flex; align-items: center; gap: 12px; padding: 9px 14px; cursor: pointer; }
.pick-row + .pick-row { border-top: 0.5px solid var(--cm-sep); }
.pick-row .pn { flex: 1; min-width: 0; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-row .pck2 { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--cm-text3); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.pick-row.on .pck2 { background: var(--cm-accent); border-color: var(--cm-accent); }
.pick-row .pck2 svg { width: 13px; height: 13px; }
.inforow { display: flex; align-items: center; gap: 12px; padding: 9px 14px; }
.inforow + .inforow { border-top: 0.5px solid var(--cm-sep); }
.inforow .in { flex: 1; font-size: 15.5px; }
.inforow .it { font-size: 13px; color: var(--cm-text2); }
.xselect { width: 100%; border: none; outline: none; background: var(--cm-fill); border-radius: 12px; padding: 12px 14px; font-size: 16px; color: var(--cm-text); margin-bottom: 8px; appearance: none; -webkit-appearance: none; }
`;

// ── The card ─────────────────────────────────────────────────────────────────
const HA_ID = '__home_assistant__';
// Colour settings older versions kept in the editor; colours now come from each person's theme in the card
const CM_OLD_COLOURS = ['accent_color', 'sent_bubble_color', 'sent_text_color', 'received_bubble_color', 'received_text_color', 'background_color'];
// ── Keeping chats on this device ─────────────────────────────────────────────
// Your conversations, contacts and the newest messages of your recent chats are remembered on
// this device, so opening the card (or coming back to the app) shows them straight away, then
// quietly brings them up to date. Photo thumbnails are kept too (in the browser's own database).
// Each person's copy is separate, and anyone else's is cleared when a different person signs in.
const CM_KEEP_DAYS = 14;
const CM_SHARED = new Map();   // user id -> { boot, msgs, blobs, ready }: shared by every card on the page
const cmStore = {
  key: (uid) => `crowMessengerCache:${uid}`,
  shared(uid) {
    let sh = CM_SHARED.get(uid);
    if (sh) return sh;
    sh = { boot: null, msgs: {}, blobs: new Map(), ready: new Map() };
    CM_SHARED.set(uid, sh);
    try {
      const raw = JSON.parse(localStorage.getItem(this.key(uid)) || 'null');
      if (raw && raw.v === 1 && raw.at > Date.now() - CM_KEEP_DAYS * 86400000 && raw.boot?.me === uid) { sh.boot = raw.boot; sh.msgs = raw.msgs || {}; }
    } catch (e) { /* nothing kept, or it couldn't be read */ }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('crowMessengerCache:') && k !== this.key(uid)) localStorage.removeItem(k);
      }
    } catch (e) { /* */ }
    cmMedia.purgeOthers(uid);
    return sh;
  },
  // big pictures (photos, backgrounds, stickers) aren't kept: they come with the fresh copy
  slim(v) { return JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'string' && x.length > 60000 && x.startsWith('data:') ? undefined : x))); },
  persist(uid, build) {
    clearTimeout(this._t?.[uid]);
    this._t = this._t || {};
    this._t[uid] = setTimeout(() => {
      const sh = CM_SHARED.get(uid);
      if (!sh) return;
      let data;
      try { data = build(); } catch (e) { return; }
      if (!data) return;
      sh.boot = data.boot; sh.msgs = data.msgs;
      let msgs = Object.entries(data.msgs);
      const pack = () => JSON.stringify({ v: 1, at: Date.now(), boot: cmStore.slim(data.boot), msgs: Object.fromEntries(msgs) });
      try {
        let out = pack();
        while (out.length > 2000000 && msgs.length) { msgs = msgs.slice(0, -1); out = pack(); }
        localStorage.setItem(this.key(uid), out);
      } catch (e) {
        try { msgs = msgs.slice(0, 2); localStorage.setItem(this.key(uid), pack()); } catch (e2) { /* storage full or blocked */ }
      }
    }, 1200);
  },
};

// photo and video thumbnails, kept in the browser's database (IndexedDB) so they appear at once
const cmMedia = {
  MAX: 500,
  open() {
    if (this._db !== undefined) return this._db;
    this._db = new Promise((res) => {
      try {
        const rq = indexedDB.open('crowMessenger', 1);
        rq.onupgradeneeded = () => { const st = rq.result.createObjectStore('media'); st.createIndex('at', 'at'); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
    return this._db;
  },
  async get(key) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((res) => {
      try {
        const rq = db.transaction('media').objectStore('media').get(key);
        rq.onsuccess = () => res(rq.result?.blob || null);
        rq.onerror = () => res(null);
      } catch (e) { res(null); }
    });
  },
  async put(key, blob) {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = db.transaction('media', 'readwrite');
      const st = tx.objectStore('media');
      st.put({ blob, at: Date.now() }, key);
      const cnt = st.count();
      cnt.onsuccess = () => {
        let extra = cnt.result - this.MAX;
        if (extra <= 0) return;
        const cur = st.index('at').openKeyCursor();
        cur.onsuccess = () => { const c = cur.result; if (c && extra-- > 0) { st.delete(c.primaryKey); c.continue(); } };
      };
    } catch (e) { /* full or blocked */ }
  },
  async purgeOthers(uid) {
    const db = await this.open();
    if (!db) return;
    try {
      const st = db.transaction('media', 'readwrite').objectStore('media');
      const cur = st.openKeyCursor();
      cur.onsuccess = () => { const c = cur.result; if (!c) return; if (!String(c.primaryKey).startsWith(`${uid}|`)) st.delete(c.primaryKey); c.continue(); };
    } catch (e) { /* */ }
  },
};

const CM_DEFAULTS = {
  card_liquid_glass: true, appearance: 'auto', use_ha_theme: false, default_skin: '',
  glass_popups: true, glass_bars: true, contact_blur: true, animations: true, effect_words: true,
  glass: 50, card_height: 700, pdf_enabled: true, pdf_conversations: true, pdf_contact: true, pdf_contacts: true, enter_sends: true, contact_sort: 'last', contact_display: 'first', show_my_card: true, show_people_map: true,
};

class CrowMessengerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = { ...CM_DEFAULTS };
    this._s = {
      me: null, isAdmin: false, ready: false, error: null,
      users: new Map(), threads: new Map(), contacts: new Map(), profile: {}, backgrounds: {}, themes: {}, ai: {}, limits: { max_upload_mb: 300 },
      msgs: new Map(), typing: new Map(), drafts: new Map(), stickers: [], scheduled: new Map(), features: {}, focusEntities: {}, presence: {}, searchKind: '',
      filter: 'all', search: '', searchHits: [], editing: false, selected: new Set(),
    };
    this._stack = [];
    this._blobs = new Map();
    this._blobReady = new Map();
    this._missing = new Set();   // attachments deleted from the server
    this._aiReplies = new Map();     // message id -> suggested replies
    this._translations = new Map();  // message id -> translated text
    this._captions = new Map();      // attachment id -> photo description
    this._lives = new Set();     // running Live Wallpapers
    this._played = new Set();    // messages whose effect has played
    this._fxQueue = new Set();   // messages whose effect should play next
    this._revealed = new Set();  // Invisible Ink messages tapped open
    this._fleets = new Map();    // your own Sea Battle ships, per game
    this._fleetAsk = new Set();
    this._onLoc = () => this._checkDeepLink();
    this._onVis = () => {
      // going into the background: keep what's typed in the message box
      if (document.visibilityState === 'hidden') this._saveDrafts();
      this._reportFocus(); this._maybeMarkRead();
    };
    this._onHide = () => this._saveDrafts();
    this._onReady = () => this._bootstrap(true);
  }

  static getConfigElement() { return document.createElement('crow-messenger-card-editor'); }
  static getStubConfig() { return {}; }

  setConfig(config) {
    this._config = { ...CM_DEFAULTS, ...(config || {}) };
    if (this._built) { this._applyTheme(); this._refresh('all'); }
  }

  getCardSize() { return Math.ceil(this._heightPx() / 50); }
  getGridOptions() { return { columns: 12, min_columns: 4, rows: 'auto' }; }
  _heightPx() { const h = parseInt(this._config.card_height, 10); return Number.isFinite(h) ? h : 700; }

  set hass(hass) {
    const first = !this._hass;
    const darkChanged = this._hass?.themes?.darkMode !== hass?.themes?.darkMode;
    this._hass = hass;
    this._lives.forEach(l => { l.hass = hass; });
    if (!this._built) this._build();
    if (first || darkChanged) this._applyTheme();
    if (first && this.isConnected) this._connect();
    if (!first && this._stack.some(p => p.type === 'people' || p.type === 'contact' || p.type === 'info' || (p.type === 'thread' && (p.hasEntities || p.watchStates)))) {
      clearTimeout(this._statesTimer);
      this._statesTimer = setTimeout(() => this._refresh('states'), 800);
    }
  }
  get hass() { return this._hass; }

  // every open message box keeps what's been typed
  _saveDrafts() { (this._stack || []).forEach(p => { try { p.composer?.saveDraft?.(); } catch (e) { /* */ } }); }

  connectedCallback() {
    window.addEventListener('location-changed', this._onLoc);
    window.addEventListener('popstate', this._onLoc);
    document.addEventListener('visibilitychange', this._onVis);
    window.addEventListener('pagehide', this._onHide);
    if (this._hass && !this._unsub && !this._connecting) this._connect();
    else this._reportFocus();
    if (this._built) this._refresh('background', null, true);
  }

  disconnectedCallback() {
    window.removeEventListener('location-changed', this._onLoc);
    window.removeEventListener('popstate', this._onLoc);
    document.removeEventListener('visibilitychange', this._onVis);
    window.removeEventListener('pagehide', this._onHide);
    this._saveDrafts();
    this._audio?.pause();
    this._lives.forEach(l => l.stop()); this._lives.clear();
    if (this._unsub) { try { this._unsub(); } catch (e) { /* closed */ } this._unsub = null; }
    this._hass?.connection?.removeEventListener('ready', this._onReady);
  }

  // ── Build & theme ──────────────────────────────────────────────────────────
  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `<style>${CM_CSS}${CM_LIVE_CSS}${CM_EXTRA_CSS}${CM_MORE_CSS}${PLAY_CSS}${SKIN_CSS}</style><ha-card><div class="cm-root"><div class="cm-pages"></div></div></ha-card>`;
    this._root = this.shadowRoot.querySelector('.cm-root');
    this._pagesEl = this.shadowRoot.querySelector('.cm-pages');
    // a picture that's been deleted from the server shows a question mark instead of a broken image
    this.shadowRoot.addEventListener('error', (e) => {
      const img = e.target;
      if (img?.tagName !== 'IMG' || img.dataset.noMissing !== undefined) return;
      const av = img.parentElement?.classList.contains('av') ? img.parentElement : null;
      if (av) { img.remove(); av.classList.add('missing'); av.innerHTML = MISSING_Q; return; }
      if (img.dataset.att) { this._missing.add(img.dataset.att); this._markMissing(img); return; }
      const box = this._el(`<span class="missing-img" role="img" aria-label="Picture not available">${MISSING_Q}</span>`);
      box.style.cssText = img.style.cssText;
      if (img.className) box.className += ' ' + img.className;
      img.replaceWith(box);
    }, true);
    this._pagesEl.innerHTML = '';
    this._nav('list', {}, { anim: false });
  }

  // the skin each person picks for their own screens (⋯ → Skin); the admin sets the default
  _skin() { return SKIN_BY[this._s?.profile?.skin] || SKIN_BY[this._config.default_skin] || SKIN_BY.iphone; }

  _isDark() {
    const sk = this._skin();
    if (sk.mode) return sk.mode === 'dark';
    const a = this._config.appearance;
    if (a === 'dark') return true;
    if (a === 'light') return false;
    const d = this._hass?.themes?.darkMode;
    if (typeof d === 'boolean') return d;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }

  _applyTheme() {
    const c = this._config, h = this;
    const dark = this._isDark();
    const sk = this._skin(), skinned = sk.id !== 'iphone';
    h.setAttribute('data-mode', dark ? 'dark' : 'light');
    if (skinned) h.setAttribute('data-skin', sk.id); else h.removeAttribute('data-skin');
    h.toggleAttribute('data-retro', sk.group === 'retro');
    h.toggleAttribute('data-win', !!sk.win);
    h.toggleAttribute('data-log', !!sk.log);
    // a skin brings its own colours and solid bars, so the glass and HA theme settings sit out
    h.setAttribute('data-style', skinned || c.card_liquid_glass === false ? 'classic' : 'glass');
    h.toggleAttribute('data-ha', !skinned && c.use_ha_theme === true);
    h.setAttribute('data-bars', skinned || c.glass_bars === false ? 'solid' : 'glass');
    h.setAttribute('data-popups', skinned || c.glass_popups === false ? 'solid' : 'glass');
    h.toggleAttribute('data-noanim', c.animations === false);
    const set = (k, v) => v ? h.style.setProperty(k, v) : h.style.removeProperty(k);
    // glass tokens (Glass amount: 0 = clear … 100 = frosted)
    let a = parseFloat(c.glass); a = isNaN(a) ? 0.5 : clamp(a / 100, 0, 1);
    const f = n => n.toFixed(3);
    const g = dark ? {
      g1: `rgba(255,255,255,${f(0.10 + a * 0.16)})`, g2: `rgba(255,255,255,${f(0.03 + a * 0.08)})`,
      gedge: 'rgba(255,255,255,0.26)', ghi: 'rgba(255,255,255,0.42)', glo: 'rgba(255,255,255,0.07)', gshadow: '0 14px 36px rgba(0,0,0,0.32)',
      chip: `rgba(255,255,255,${f(0.08 + a * 0.08)})`, chipedge: 'rgba(255,255,255,0.16)',
      sheet: 'linear-gradient(160deg,rgba(70,70,80,0.90),rgba(30,30,36,0.95))', sheetedge: 'rgba(255,255,255,0.22)', scrim: 'rgba(0,0,0,0.5)',
    } : {
      g1: `rgba(255,255,255,${f(0.50 + a * 0.32)})`, g2: `rgba(255,255,255,${f(0.34 + a * 0.30)})`,
      gedge: 'rgba(255,255,255,0.85)', ghi: 'rgba(255,255,255,0.95)', glo: 'rgba(0,0,0,0.04)', gshadow: '0 10px 30px rgba(28,36,80,0.14), 0 0 0 0.5px rgba(0,0,0,0.05)',
      chip: `rgba(255,255,255,${f(0.45 + a * 0.25)})`, chipedge: 'rgba(120,120,128,0.14)',
      sheet: 'linear-gradient(160deg,rgba(255,255,255,0.94),rgba(244,244,250,0.96))', sheetedge: 'rgba(255,255,255,0.9)', scrim: 'rgba(0,0,0,0.30)',
    };
    Object.entries(g).forEach(([k, v]) => h.style.setProperty(`--cm-${k}`, v));
    ['--cm-accent', '--cm-sent', '--cm-sent-text', '--cm-recv', '--cm-recv-text', '--cm-bg'].forEach(k => h.style.removeProperty(k));
    // the colour theme each person picks for all their chats (conversation details → Theme)
    const all = !skinned && this._s?.themes?.['*'];
    if (all) Object.entries(this._themeVars(all, dark)).forEach(([k, v]) => set(k, v));
    if (skinned) { h.style.setProperty('--cm-sheet', 'var(--cm-sheet-solid)'); h.style.setProperty('--cm-sheetedge', 'var(--cm-sep)'); }
    h.style.setProperty('--cm-height', c.card_height === 'fill'
      ? 'calc(100dvh - var(--header-height, 56px) - 24px)' : `${this._heightPx()}px`);
  }

  // ── Server connection ──────────────────────────────────────────────────────
  _ws(type, payload = {}) { return this._hass.callWS({ type: `crow_messenger/${type}`, ...payload }); }

  // what was on screen last time: shown at once, before Home Assistant answers
  _warmStart() {
    const uid = this._hass?.user?.id;
    if (!uid || this._s.ready) return;
    const sh = cmStore.shared(uid);
    this._blobs = sh.blobs; this._blobReady = sh.ready;
    if (!sh.boot) return;
    try {
      this._applyBoot(sh.boot);
      for (const [tid, b] of Object.entries(sh.msgs || {})) {
        if (this._s.threads.has(tid) && !this._s.msgs.has(tid)) this._s.msgs.set(tid, { list: b.list || [], more: !!b.more, loaded: true, loading: false, stale: true });
      }
      this._s.cached = true;
      this._refresh('all');
      this._restoreLastChat();
    } catch (e) { this._s.ready = false; }
  }

  // the conversations and newest messages, for next time
  _keepSoon() {
    const uid = this._s.me;
    if (!uid || !this._s.ready || this._s.cached) return;
    cmStore.persist(uid, () => {
      const s = this._s;
      const threads = [...s.threads.values()];
      const boot = { ...(this._boot || {}), me: s.me, is_admin: s.isAdmin, profile: s.profile, backgrounds: s.backgrounds, themes: s.themes, ai: s.ai,
        stickers: s.stickers, features: s.features, focus_entities: s.focusEntities, presence: s.presence, share_hidden: [...(s.shareHidden || [])],
        limits: s.limits, users: [...s.users.values()], threads, contacts: [...s.contacts.values()],
        scheduled: [...s.scheduled.values()].flat() };
      const recent = threads.slice().sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0)).map(t => t.id);
      const msgs = {};
      for (const tid of recent) {
        const b = s.msgs.get(tid);
        if (!b?.loaded || b.stale) { const old = CM_SHARED.get(uid)?.msgs?.[tid]; if (old) msgs[tid] = old; }
        else {
          const list = b.list.filter(m => !m.pending && !m.failed);
          msgs[tid] = { list: list.slice(-40), more: b.more || list.length > 40 };
        }
        if (Object.keys(msgs).length >= 15) break;
      }
      return { boot, msgs };
    });
  }

  async _connect() {
    if (this._connecting || !this._hass) return;
    this._connecting = true;
    this._warmStart();
    try {
      this._unsub = await this._hass.connection.subscribeMessage((ev) => this._onEvent(ev), { type: 'crow_messenger/subscribe' });
      this._hass.connection.addEventListener('ready', this._onReady);
      await this._bootstrap();
    } catch (err) {
      this._s.error = err?.code === 'unknown_command'
        ? 'Crow Messenger isn’t set up yet. Go to Settings → Devices & Services → Add Integration and add Crow Messenger, then reload this page.'
        : (err?.message || 'Could not connect to Crow Messenger.');
      this._refresh('all');
    } finally { this._connecting = false; }
  }

  async _bootstrap(reconnect = false) {
    const r = await this._ws('bootstrap');
    const warm = !!this._s.cached;
    this._applyBoot(r);
    const s = this._s;
    s.cached = false;
    // what was shown from this device is brought up to date quietly: the open chat now, others when opened
    for (const [tid, box] of s.msgs) {
      if (!s.threads.has(tid)) { s.msgs.delete(tid); continue; }
      if (box.loaded && (reconnect || warm)) box.stale = true;
    }
    const open = [...this._stack].reverse().find(p => p.type === 'thread');
    if (open && s.msgs.get(open.data.tid)?.stale) this._loadMsgs(open.data.tid, { soft: true });
    this._refresh('all');
    this._checkDeepLink();
    if (!reconnect && !warm) this._restoreLastChat();
    else this._restoreTried = true;
    this._reportFocus();
    this._keepSoon();
    // Tell the integration which dashboard this card is on, so notifications
    // can open here when no dashboard has been chosen for this person.
    if (!new URLSearchParams(window.location.search).has('edit')) {
      this._ws('here', { path: window.location.pathname }).catch(() => {});
    }
  }

  _applyBoot(r) {
    const s = this._s;
    this._boot = r;
    s.me = r.me; s.isAdmin = r.is_admin; s.profile = r.profile || {}; s.limits = r.limits || s.limits;
    s.backgrounds = r.backgrounds || {};
    s.themes = r.themes || {};
    s.ai = r.ai || {};
    s.stickers = r.stickers || [];
    s.features = r.features || {};
    s.focusEntities = r.focus_entities || {};
    s.presence = r.presence || {};
    s.shareHidden = new Set(r.share_hidden || []);
    s.scheduled = new Map();
    (r.scheduled || []).forEach(it => { if (!s.scheduled.has(it.thread_id)) s.scheduled.set(it.thread_id, []); s.scheduled.get(it.thread_id).push(it); });
    this._applyTheme();
    s.users = new Map(r.users.map(u => [u.id, u]));
    s.threads = new Map(r.threads.map(t => [t.id, t]));
    this._loadDrafts();
    s.contacts = new Map(r.contacts.map(c => [c.id, c]));
    s.error = null; s.ready = true;
  }

  _onEvent(ev) {
    const s = this._s;
    switch (ev.type) {
      case 'message': {
        const m = ev.message;
        this._upsertThread(ev.thread);
        const box = s.msgs.get(m.thread_id);
        if (box?.loaded && !box.list.some(x => x.id === m.id)) {
          if (m.sender === s.me) {
            const i = box.list.findIndex(x => x.pending && !x.failed && x.text === m.text && (x.attachments?.length || 0) === m.attachments.length);
            if (i >= 0) {
              this._adoptLocal(box.list[i], m);
              if (this._fxQueue.delete(box.list[i].id)) this._fxQueue.add(m.id);
              this._played.add(m.id);
              box.list.splice(i, 1);
            }
          }
          box.list.push(m);
          box.list.sort((a, b) => a.ts - b.ts);
        }
        this._clearTyping(m.thread_id, m.sender);
        // an effect plays when it arrives in the conversation you're looking at
        const top = this._stack[this._stack.length - 1];
        if (m.effect && m.sender !== s.me && top?.type === 'thread' && top.data.tid === m.thread_id && document.visibilityState === 'visible') this._queueFx(m);
        this._refresh('thread', m.thread_id);
        if (m.sender !== s.me) this._maybeMarkRead();
        break;
      }
      case 'read': {
        const t = s.threads.get(ev.thread_id);
        if (t) { t.read = { ...(t.read || {}), [ev.user_id]: ev.ts }; if (ev.user_id === s.me) t.unread = 0; }
        this._refresh('read', ev.thread_id);
        break;
      }
      case 'typing': {
        let map = s.typing.get(ev.thread_id);
        if (!map) s.typing.set(ev.thread_id, map = new Map());
        clearTimeout(map.get(ev.user_id));
        if (ev.active) map.set(ev.user_id, setTimeout(() => this._clearTyping(ev.thread_id, ev.user_id), 7000));
        else map.delete(ev.user_id);
        this._refresh('typing', ev.thread_id);
        break;
      }
      case 'thread':
        this._upsertThread(ev.thread);
        if (ev.reload) this._loadMsgs(ev.thread.id, { reset: true });
        this._refresh('thread', ev.thread.id);
        break;
      case 'thread_removed':
        s.threads.delete(ev.thread_id);
        s.msgs.delete(ev.thread_id);
        this._closeThreadPages(ev.thread_id);
        this._refresh('thread', ev.thread_id);
        break;
      case 'users':
        s.users = new Map(ev.users.map(u => [u.id, u]));
        this._refresh('all');
        break;
      case 'contact':
        s.contacts.set(ev.contact.id, ev.contact);
        this._refresh('contacts');
        break;
      case 'backgrounds':
        s.backgrounds = ev.backgrounds || {};
        this._refresh('background');
        break;
      case 'ai':
        s.ai = ev.ai || {};
        this._refresh('all');
        break;
      case 'profile':
        // a skin picked on another of your devices
        if ((ev.profile?.skin || '') !== (s.profile?.skin || '')) { s.profile = ev.profile || {}; this._applyTheme(); this._refresh('all'); }
        else s.profile = ev.profile || s.profile;
        break;
      case 'themes':
        s.themes = ev.themes || {};
        this._applyTheme();
        this._refresh('theme');
        break;
      case 'message_update': {
        // a tapback, an edit, a vote, a link preview…
        const m = ev.message;
        const box = s.msgs.get(ev.thread_id);
        if (box) { const i = box.list.findIndex(x => x.id === m.id); if (i >= 0) box.list[i] = m; }
        const t = s.threads.get(ev.thread_id);
        if (t?.last?.id === m.id) t.last = m;
        this._refresh('messages', ev.thread_id);
        break;
      }
      case 'scheduled':
        s.scheduled.set(ev.thread_id, ev.items || []);
        this._refresh('messages', ev.thread_id);
        break;
      case 'stickers':
        s.stickers = ev.stickers || [];
        this._stickerViews?.forEach(f => f());
        break;
      case 'zone_towns':
        this._zoneViews?.forEach(f => f());
        break;
      case 'share_hidden':
        s.shareHidden = new Set(ev.items || []);
        this._shareDevViews?.forEach(f => f());
        break;
      case 'presence':
        if (ev.presence) s.presence[ev.user_id] = ev.presence; else delete s.presence[ev.user_id];
        this._refresh('presence');
        break;
      case 'notice':
        this._toast(ev.text);
        break;
      case 'contact_removed':
        s.contacts.delete(ev.contact_id);
        this._refresh('contacts');
        break;
    }
  }

  _upsertThread(t) {
    if (!t) return;
    if (t.visible === false) this._s.threads.delete(t.id);
    else this._s.threads.set(t.id, t);
  }

  _clearTyping(tid, uid) {
    const map = this._s.typing.get(tid);
    if (map?.has(uid)) { clearTimeout(map.get(uid)); map.delete(uid); this._refresh('typing', tid); }
  }

  _closeThreadPages(tid) {
    while (this._stack.length > 1 && this._stack.some(p => p.data?.tid === tid)) this._back(false);
  }

  _checkDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('crow_thread');
    if (!tid || !this._s.ready || !this.isConnected) return;
    params.delete('crow_thread');
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    if (this._s.threads.has(tid)) this._openThread(tid, { reset: true, anim: false });
  }

  // the chat you were in, so leaving the app (or the dashboard) and coming back opens it again
  _lastChatKey() { return `crowMessengerLastChat:${this._s.me || ''}`; }
  _saveLastChat() {
    // nothing is saved until the card has had its chance to reopen the last chat
    if (!this._s?.ready || !this._s.me || !this._restoreTried) return;
    const th = [...this._stack].reverse().find(p => p.type === 'thread');
    try { localStorage.setItem(this._lastChatKey(), th ? th.data.tid : ''); } catch (e) { /* private window */ }
  }
  _restoreLastChat() {
    this._restoreTried = true;
    if (this._stack.length > 1) return;
    let tid = '';
    try { tid = localStorage.getItem(this._lastChatKey()) || ''; } catch (e) { /* private window */ }
    if (tid && this._s.threads.has(tid)) this._openThread(tid, { anim: false });
  }

  _reportFocus() {
    this._saveLastChat();
    if (!this._unsub || !this._hass) return;
    const top = this._stack[this._stack.length - 1];
    const tid = top?.type === 'thread' ? top.data.tid : null;
    const visible = document.visibilityState === 'visible' && this.isConnected;
    const key = `${tid}|${visible}`;
    if (key === this._lastFocus) return;
    this._lastFocus = key;
    this._ws('focus', { thread_id: tid, visible }).catch(() => {});
  }

  // ── Names & avatars ────────────────────────────────────────────────────────
  _contactForUser(uid) {
    for (const c of this._s.contacts.values()) if (c.ha_user === uid) return c;
    // a contact with exactly the same full name as the Home Assistant user counts too
    const u = this._s.users.get(uid);
    const n = (u?.ha_name || u?.name || '').trim().toLowerCase();
    if (!n) return null;
    for (const c of this._s.contacts.values()) if (!c.ha_user && contactName(c, 'first').trim().toLowerCase() === n) return c;
    return null;
  }
  _userName(uid, short = false) {
    if (uid === HA_ID) return 'Home Assistant';
    const c = this._contactForUser(uid);
    let n = c ? contactName(c, this._config.contact_display) : (this._s.users.get(uid)?.name || 'Former member');
    if (short) n = (c?.first || c?.nickname || n).split(' ')[0];
    return n;
  }
  _userPic(uid) {
    if (uid === HA_ID) return null;
    return this._contactForUser(uid)?.photo || this._s.users.get(uid)?.picture || null;
  }
  _picUrl(pic) { return !pic ? '' : /^(data:|https?:)/.test(pic) ? pic : this._hass.hassUrl(pic); }

  _avHtml({ pic, name, ha, size = 40 }) {
    const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px`;
    if (ha) return `<div class="av ha" style="${st}">${ICON.ha}</div>`;
    const ini = initials(name);
    if (pic) return `<div class="av" style="${st}" data-ini="${esc(ini)}"><img src="${esc(this._picUrl(pic))}" alt="" loading="lazy" draggable="false"></div>`;
    return `<div class="av" style="${st}">${ini ? esc(ini) : ICON.personFill}</div>`;
  }
  _userAv(uid, size) { return this._avHtml({ pic: this._userPic(uid), name: this._userName(uid), ha: uid === HA_ID, size }); }

  _threadTitle(t) {
    if (!t) return '';
    if (t.name) return t.name;
    const others = t.participants.filter(p => p !== this._s.me);
    if (!others.length) return `${this._userName(this._s.me)} (You)`;
    if (others.length === 1) return this._userName(others[0]);
    const names = others.map(p => this._userName(p, true));
    if (names.length <= 3) return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
    return `${names.slice(0, 2).join(', ')} & ${names.length - 2} others`;
  }

  _threadAv(t, size) {
    if (t.photo) return this._avHtml({ pic: t.photo, name: t.name, size });
    const others = t.participants.filter(p => p !== this._s.me);
    if (!t.is_group || others.length < 2) return this._userAv(others[0] || this._s.me, size);
    const pick = others.slice(0, 3);
    const sm = Math.round(size * (pick.length === 2 ? 0.64 : 0.54));
    const pos = pick.length === 2
      ? [[0, 0], [size - sm, size - sm]]
      : [[(size - sm) / 2, 0], [0, size - sm], [size - sm, size - sm]];
    return `<div class="av-group" style="width:${size}px;height:${size}px">${pick.map((p, i) =>
      this._userAv(p, sm).replace('style="', `style="left:${pos[i][0]}px;top:${pos[i][1]}px;`)).join('')}</div>`;
  }

  _previewText(t) {
    const m = t.last;
    if (!m) return t.is_group ? 'New group' : 'No messages yet';
    let txt = m.text;
    if (m.type === 'poll') txt = `📊 ${m.text}`;
    else if (m.type === 'sticker') txt = m.sticker?.emoji ? `Sticker ${m.sticker.emoji}` : 'Sticker';
    else if (m.type === 'checkin') txt = 'Check In';
    else if (m.type === 'entity') txt = `🏠 ${this._hass?.states?.[m.entity?.entity_id]?.attributes?.friendly_name || 'Device'}`;
    else if (m.type === 'call') txt = CALL_LABEL[m.call?.kind] || '📞 Call';
    else if (m.type === 'location') txt = m.location?.live_until ? 'Live Location' : `📍 ${m.location?.label || 'Location'}`;
    else if (m.type === 'locreq') txt = '📍 Where are you?';
    else if (m.type === 'checklist') txt = `☑️ ${m.text}`;
    else if (m.type === 'event') txt = `📅 ${m.text}`;
    else if (m.type === 'timer') txt = `⏰ ${m.text || 'Timer'}`;
    else if (m.type === 'game') txt = `🎮 ${GAME_NAME[m.game?.kind] || 'Game'}`;
    else if (m.type === 'status') txt = '🏠 Home Status';
    else if (m.type === 'contact') txt = `👤 ${[m.contact?.first, m.contact?.last].filter(Boolean).join(' ') || m.contact?.company || 'Contact'}`;
    else if (m.view_once) txt = '📷 View Once';
    else if (m.effect === 'invisible' && txt) txt = 'Sent with Invisible Ink';
    if (!txt && m.attachments?.length) {
      const a = m.attachments[0];
      txt = a.mime?.startsWith('image/') ? (m.attachments.length > 1 ? `${m.attachments.length} Photos` : 'Photo')
        : a.mime?.startsWith('video/') ? 'Video' : a.mime?.startsWith('audio/') ? 'Audio Message' : (a.name || 'Attachment');
    }
    if (t.is_group && m.type !== 'system' && m.sender !== this._s.me) txt = `${this._userName(m.sender, true)}: ${txt}`;
    return txt || '';
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  _nav(type, data = {}, { anim = true, reset = false } = {}) {
    if (reset) while (this._stack.length > 1) this._back(false);
    const page = this[`_pg_${type}`](data);
    page.type = type; page.data = data;
    page.el.classList.add('page');
    const prev = this._stack[this._stack.length - 1];
    this._pagesEl.appendChild(page.el);
    this._stack.push(page);
    const animate = anim && prev && this._config.animations !== false;
    if (prev) {
      prev.onHide?.();
      if (animate) {
        prev.el.classList.add('anim-out'); page.el.classList.add('anim-in');
        setTimeout(() => { prev.el.classList.remove('anim-out'); page.el.classList.remove('anim-in'); if (this._stack.includes(prev) && this._stack[this._stack.length - 1] !== prev) prev.el.style.display = 'none'; }, 400);
      } else prev.el.style.display = 'none';
    }
    page.refresh?.('all');
    page.onShow?.();
    this._reportFocus();
    return page;
  }

  _back(anim = true) {
    if (this._stack.length <= 1) return;
    const cur = this._stack.pop();
    const prev = this._stack[this._stack.length - 1];
    cur.onHide?.();
    prev.el.style.display = '';
    const animate = anim && this._config.animations !== false;
    if (animate) {
      cur.el.classList.add('anim-back-out'); prev.el.classList.add('anim-back-in');
      setTimeout(() => { cur.el.remove(); prev.el.classList.remove('anim-back-in'); }, 360);
    } else cur.el.remove();
    cur.destroy?.();
    prev.refresh?.('all');
    prev.onShow?.();
    this._reportFocus();
  }

  _refresh(what, tid, force) {
    for (const p of this._stack) p.refresh?.(what, tid, force);
    if (['all', 'messages', 'thread', 'read', 'contacts'].includes(what)) this._keepSoon();
  }

  _openThread(tid, opts = {}) {
    const top = this._stack[this._stack.length - 1];
    if (top?.type === 'thread' && top.data.tid === tid) return;
    this._nav('thread', { tid }, opts);
  }

  _el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

  // Only touch the DOM when the markup actually changed - re-creating the same
  // <img> elements on every update is what made photos flicker.
  _set(el, html) {
    if (el._cmHtml === html) return false;
    el._cmHtml = html;
    el.innerHTML = html;
    return true;
  }

  _errorHtml() {
    return `<div class="empty" style="padding-top:110px"><b>Crow Messenger</b>${esc(this._s.error)}</div>`;
  }

  // ── Page: conversation list ────────────────────────────────────────────────
  _pg_list() {
    const el = this._el(`<div class="clist">
      <div class="scroll"><div class="large-title">Messages</div><div class="lst list-pad"></div></div>
      <div class="edge top"></div><div class="edge bottom"></div>
      <div class="top">
        <button class="pill g" data-a="edit">Edit</button>
        <button class="pill g archback" data-a="archback" hidden>${ICON.back}<span>Messages</span></button>
        <div class="title" style="opacity:0">Messages</div>
        <div class="capsule g cap-normal"><button data-a="contacts" aria-label="Contacts">${ICON.contacts}</button><button data-a="filter" aria-label="Filter">${ICON.filter}</button></div>
        <button class="pill g cap-edit" data-a="editactions" hidden>Options</button>
      </div>
      <div class="bottom sbar">
        <label class="searchbar g">${ICON.search}<input type="text" placeholder="Search" enterkeyhint="search" autocomplete="off"><button class="sb-btn clr" hidden aria-label="Clear">${ICON.x}</button><button class="sb-btn mic" aria-label="Dictate">${ICON.mic}</button></label>
        <button class="cb g" data-a="compose" aria-label="New Message">${ICON.compose}</button>
      </div>
    </div>`);
    const page = { el };
    const s = this._s;
    const lst = el.querySelector('.lst'), scroll = el.querySelector('.scroll'), smallTitle = el.querySelector('.top .title');
    const input = el.querySelector('.searchbar input'), clr = el.querySelector('.clr'), mic = el.querySelector('.mic');
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) mic.hidden = true;
    scroll.addEventListener('scroll', () => { smallTitle.style.opacity = scroll.scrollTop > 44 ? '1' : '0'; }, { passive: true });

    let searchTimer;
    const onSearch = () => {
      s.search = input.value;
      clr.hidden = !input.value;
      if (Rec) mic.hidden = !!input.value;
      page.refresh('list');
      clearTimeout(searchTimer);
      if (input.value.trim().length >= 2 || s.searchKind) {
        searchTimer = setTimeout(async () => {
          try { const r = await this._ws('search', { query: input.value.trim(), ...(s.searchKind ? { kind: s.searchKind } : {}) }); s.searchHits = r.messages; page.refresh('list'); } catch (e) { /* ignore */ }
        }, 280);
      } else s.searchHits = [];
    };
    input.addEventListener('input', onSearch);
    // search filters (Photos, Links, Files…) appear while searching
    input.addEventListener('focus', () => { s.searchOpen = true; page.refresh('list'); });
    input.addEventListener('blur', () => setTimeout(() => { if (!input.value && !s.searchKind && s.searchOpen) { s.searchOpen = false; page.refresh('list'); } }, 250));
    lst.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-skind]')) e.preventDefault(); });
    lst.addEventListener('click', (e) => {
      const k = e.target.closest('[data-skind]');
      if (!k) return;
      e.stopPropagation();
      s.searchKind = s.searchKind === k.dataset.skind ? '' : k.dataset.skind;
      s.searchOpen = true;
      onSearch();
    }, true);
    clr.addEventListener('click', (e) => { e.preventDefault(); input.value = ''; onSearch(); input.focus(); });
    mic.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        const rec = new Rec();
        rec.lang = locale(this._hass); rec.interimResults = true;
        mic.classList.add('rec');
        rec.onresult = (ev) => { input.value = [...ev.results].map(r => r[0].transcript).join(''); onSearch(); };
        rec.onend = () => mic.classList.remove('rec');
        rec.onerror = () => mic.classList.remove('rec');
        rec.start();
      } catch (err) { mic.hidden = true; }
    });

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'edit') { s.editing = !s.editing; s.selected.clear(); page.refresh('list'); return; }
      if (a === 'contacts') { this._nav('contacts'); return; }
      if (a === 'filter') {
        const v = await this._menu(e.target.closest('button'), [
          { header: 'Filter' },
          { text: 'All Messages', value: 'all', checked: s.filter === 'all', icon: ICON.bubble },
          { text: 'Unread Messages', value: 'unread', checked: s.filter === 'unread', icon: ICON.mailO },
          { text: 'Group Chats', value: 'groups', checked: s.filter === 'groups', icon: ICON.people },
          { sep: true }, { text: 'Starred Messages', value: 'starred', checked: false, icon: MICON.star },
          { sep: true }, { text: 'Skin', sub: this._skinItems(), icon: ICON.palette },
        ]);
        if (v?.startsWith?.('skin:')) { this._setSkin(v.slice(5)); return; }
        if (v === 'starred') { this._nav('starred'); return; }
        if (v) { s.filter = v; page.refresh('list'); }
        return;
      }
      if (a === 'compose') { this._openCompose(); return; }
      if (a === 'editactions') { this._editActions(page); return; }
      if (a === 'archived' || a === 'archback') { s.archivedView = a === 'archived'; s.editing = false; s.selected.clear(); page.refresh('list'); scroll.scrollTop = 0; return; }
      if (a === 'keeparch') { await this._setProfile({ keep_archived: !s.profile?.keep_archived }); page.refresh('list'); return; }
      const lead = e.target.closest('.swipe-lead button');
      if (lead) {
        const tid = lead.closest('.row').dataset.tid, t = s.threads.get(tid);
        this._closeSwipes(el);
        if (lead.classList.contains('pinb')) this._ws('flag', { thread_id: tid, flag: 'pinned', on: !t?.pinned }).catch(err => this._toast(err.message));
        else if (t?.unread || t?.marked_unread) { t.marked_unread = false; this._ws('mark_read', { thread_id: tid }).catch(() => {}); }
        else this._ws('flag', { thread_id: tid, flag: 'marked_unread', on: true }).catch(err => this._toast(err.message));
        return;
      }
      const pin = e.target.closest('[data-pin]');
      if (pin && Date.now() - (page.swipeClosedAt || 0) < 700) return;
      if (pin) {
        if (pin.dataset.held) { delete pin.dataset.held; return; }
        this._openThread(pin.dataset.pin);
        return;
      }
      const sw = e.target.closest('.swipe-actions button');
      if (sw) {
        const tid = sw.closest('.row').dataset.tid;
        if (sw.classList.contains('del')) this._confirmDeleteThread(tid);
        else if (sw.classList.contains('arch')) this._archive(tid, !s.threads.get(tid)?.archived);
        else { const t = s.threads.get(tid); this._ws('update_thread', { thread_id: tid, muted: !t?.muted }).catch(err => this._toast(err.message)); }
        this._closeSwipes(el);
        return;
      }
      const sm = e.target.closest('[data-smid]');
      if (sm) { this._jumpTo(sm.dataset.stid, +sm.dataset.ts, sm.dataset.smid); return; }
      const hit = e.target.closest('.hit');
      if (hit) { this._openThread(hit.dataset.tid, {}); this._flashMsg = hit.dataset.mid; return; }
      const row = e.target.closest('.row');
      if (row && Date.now() - (page.swipeClosedAt || 0) < 700) return;
      if (row) {
        if (row.classList.contains('swiped') || row.classList.contains('swiped-l')) { this._closeSwipes(el); return; }
        if (s.editing) { s.selected.has(row.dataset.tid) ? s.selected.delete(row.dataset.tid) : s.selected.add(row.dataset.tid); page.refresh('list'); return; }
        const rt = s.threads.get(row.dataset.tid);
        this._openThread(row.dataset.tid);
        if (rt?.reminded) this._flashMsg = rt.reminded;   // straight to the message you were reminded about
      }
    });
    this._wireSwipe(lst);
    // tapping anywhere else puts a swiped conversation back
    el.addEventListener('pointerdown', (e) => {
      const open = lst.querySelector('.row.swiped, .row.swiped-l');
      if (!open || open.contains(e.target)) return;
      this._closeSwipes(lst);
      // the tap only closes it: it doesn't also open whatever was tapped
      page.swipeClosedAt = Date.now();
    }, true);
    // press and hold a pinned conversation: Unpin, Mark as Unread
    let pinTimer = null;
    const pinMenu = async (pin) => {
      const tid = pin.dataset.pin, t = s.threads.get(tid);
      pin.dataset.held = '1';
      const v = await this._menu(pin, [
        { text: 'Unpin', value: 'unpin', icon: XICON.pushpin },
        t?.unread || t?.marked_unread ? { text: 'Mark as Read', value: 'read', icon: ICON.mailO } : { text: 'Mark as Unread', value: 'unread', icon: ICON.bubble },
        { text: t?.muted ? 'Show Alerts' : 'Hide Alerts', value: 'mute', icon: t?.muted ? ICON.bell : ICON.bellOff },
        { text: 'Archive', value: 'archive', icon: ARCH_ICON },
        { sep: true }, { text: 'Delete', value: 'delete', icon: ICON.trash, red: true },
      ], { align: 'left' });
      if (v === 'archive') { this._archive(tid, true); return; }
      setTimeout(() => { delete pin.dataset.held; }, 50);
      try {
        if (v === 'unpin') await this._ws('flag', { thread_id: tid, flag: 'pinned', on: false });
        if (v === 'unread') await this._ws('flag', { thread_id: tid, flag: 'marked_unread', on: true });
        if (v === 'read') await this._ws('mark_read', { thread_id: tid });
        if (v === 'mute') await this._ws('update_thread', { thread_id: tid, muted: !t?.muted });
        if (v === 'delete') this._confirmDeleteThread(tid);
      } catch (err) { this._toast(err.message); }
    };
    lst.addEventListener('pointerdown', (e) => { const pin = e.target.closest('[data-pin]'); if (!pin) return; pinTimer = setTimeout(() => { pinTimer = null; pinMenu(pin); }, 480); });
    ['pointerup', 'pointercancel', 'pointermove'].forEach(ev => lst.addEventListener(ev, (e) => { if (ev === 'pointermove' && Math.abs(e.movementX) + Math.abs(e.movementY) < 4) return; clearTimeout(pinTimer); }));
    lst.addEventListener('contextmenu', (e) => { const pin = e.target.closest('[data-pin]'); if (pin) { e.preventDefault(); pinMenu(pin); } });

    page.refresh = (what) => {
      if (!['all', 'list', 'messages', 'thread', 'read', 'contacts', 'typing'].includes(what)) return;
      if (what === 'typing') return;
      // nothing to edit with no conversations: Edit is greyed out, like on an iPhone
      const anyChats = [...s.threads.values()].some(t => t.visible !== false && t.last && !!t.archived === !!s.archivedView);
      if (!anyChats && s.editing) { s.editing = false; s.selected.clear(); }
      el.querySelector('[data-a="edit"]').textContent = s.editing ? 'Done' : 'Edit';
      el.querySelector('[data-a="edit"]').disabled = !anyChats || !s.ready;
      // Archived: the same list, showing only the archived chats, with a way back
      const av = !!s.archivedView;
      el.querySelector('[data-a="archback"]').hidden = !av || s.editing;
      el.querySelector('[data-a="edit"]').hidden = av && !s.editing;
      el.querySelector('.large-title').textContent = av ? 'Archived' : 'Messages';
      smallTitle.textContent = av ? 'Archived' : 'Messages';
      el.querySelector('.cap-normal').hidden = s.editing;
      const opt = el.querySelector('.cap-edit');
      opt.hidden = !s.editing;
      opt.textContent = s.selected.size ? `Options (${s.selected.size})` : 'Options';
      lst.classList.toggle('editing', s.editing);
      this._set(lst, this._listHtml());
    };
    return page;
  }

  // Edit mode actions open as a popup (glass when Popup Liquid Glass is on)
  // instead of a bar at the bottom of the card.
  async _editActions(page) {
    const s = this._s;
    const n = s.selected.size;
    const done = () => { s.editing = false; s.selected.clear(); page.refresh('list'); };
    if (!n) {
      const r = await this._alert({
        title: 'Edit Messages',
        message: 'Tap conversations to select them, or choose an option for all of them.',
        buttons: [{ text: 'Mark All as Read', style: 'ok', value: 'read' }, { text: 'Select All', style: 'cancel', value: 'all' }, { text: 'Cancel', style: 'cancel' }],
      });
      if (r.value === 'read') { for (const [id, t] of s.threads) if (t.unread) this._ws('mark_read', { thread_id: id }).catch(() => {}); done(); }
      if (r.value === 'all') { for (const [id, t] of s.threads) if (t.visible !== false && t.last) s.selected.add(id); page.refresh('list'); }
      return;
    }
    const label = `${n} Conversation${n > 1 ? 's' : ''}`;
    const r = await this._alert({
      title: `${label} Selected`,
      message: `Deleting removes ${n > 1 ? 'them' : 'it'} from your account only — other people keep their copy. This can’t be undone.`,
      buttons: [{ text: 'Delete', style: 'destructive', value: 'delete' }, { text: s.archivedView ? 'Unarchive' : 'Archive', style: 'cancel', value: 'archive' }, { text: 'Mark as Read', style: 'cancel', value: 'read' }, { text: 'Cancel', style: 'cancel' }],
    });
    if (r.value === 'archive') { for (const id of s.selected) this._archive(id, !s.archivedView, true); done(); }
    if (r.value === 'read') { for (const id of s.selected) if (s.threads.get(id)?.unread) this._ws('mark_read', { thread_id: id }).catch(() => {}); done(); }
    if (r.value === 'delete') { for (const id of s.selected) this._ws('delete_thread', { thread_id: id }).catch(err => this._toast(err.message)); done(); }
  }

  _listHtml() {
    const s = this._s;
    if (s.error) return this._errorHtml();
    if (!s.ready) return `<div class="empty">Loading…</div>`;
    const q = s.search.trim().toLowerCase();
    const kind = s.searchKind || '';
    const chips = s.searchOpen || q || kind ? `<div class="schips">${[['photos', 'Photos'], ['links', 'Links'], ['files', 'Files'], ['locations', 'Locations']].map(([v, n]) => `<button data-skind="${v}" class="${kind === v ? 'on' : ''}">${n}</button>`).join('')}</div>` : '';
    if (kind) {
      const KN = { photos: 'Photos', links: 'Links', files: 'Files', locations: 'Locations' };
      return chips + (s.searchHits.length ? `<div class="section-h">${KN[kind]}</div>` + s.searchHits.map(m => this._starRow(m)).join('') : `<div class="empty"><b>No ${KN[kind]}</b>${q ? `Nothing matches “${esc(s.search.trim())}”.` : ''}</div>`);
    }
    // like Apple Messages, a conversation only shows in the list once something's been said in it
    let threads = [...s.threads.values()].filter(t => t.visible !== false && t.last);
    // Archived chats live in their own list (a search still finds them)
    const archived = threads.filter(t => t.archived);
    if (!q) threads = threads.filter(t => !!t.archived === !!s.archivedView);
    if (s.filter === 'unread') threads = threads.filter(t => t.unread > 0 || t.marked_unread);
    if (s.filter === 'groups') threads = threads.filter(t => t.is_group);
    if (q) threads = threads.filter(t => (this._threadTitle(t) + ' ' + t.participants.map(p => this._userName(p)).join(' ')).toLowerCase().includes(q));
    threads.sort((a, b) => b.updated_at - a.updated_at);
    let html = chips;
    if (s.archivedView && !q) {
      const keep = !!s.profile?.keep_archived;
      html += `<div class="arch-note">${keep ? 'These chats stay archived when new messages arrive.' : 'Archived chats come back to Messages when a new message arrives.'}<button data-a="keeparch">${keep ? 'Bring Them Back Instead' : 'Keep Chats Archived'}</button></div>`;
      if (!threads.length) return html + '<div class="empty"><b>No Archived Chats</b>Swipe left on a conversation and tap Archive to tidy it away here.</div>';
    } else if (!q && archived.length && s.filter === 'all' && !s.editing) {
      const unr = archived.filter(t => t.unread || t.marked_unread).length;
      html += `<button class="arch-row" data-a="archived"><span class="ai">${ARCH_ICON}</span><span class="al">Archived</span><span class="ac">${unr ? `<b>${unr}</b>` : archived.length}</span>${ICON.chevR}</button>`;
    }
    // pinned conversations: big circles at the top (not while searching or editing)
    const pinned = !q && !s.editing && s.filter === 'all' && !s.archivedView ? threads.filter(t => t.pinned) : [];
    if (pinned.length) {
      threads = threads.filter(t => !t.pinned);
      const bub = (t) => (t.unread && t.last && t.last.sender !== s.me ? this._previewText(t) : '');
      html += `<div class="pins${pinned.some(bub) ? ' has-bub' : ''}">${pinned.map(t => {
        const b = bub(t);
        return `<div class="pin${t.unread || t.marked_unread ? ' unread' : ''}" data-pin="${esc(t.id)}" role="button"><div class="pav">${this._threadAv(t, 76)}${t.unread || t.marked_unread ? '<span class="pdot"></span>' : ''}${b ? `<span class="pbub">${esc(b)}</span>` : ''}</div><div class="pname">${esc(this._threadTitle(t))}</div></div>`;
      }).join('')}</div>`;
    }
    if (!threads.length && !q && !pinned.length) {
      const what = s.filter === 'unread' ? 'No Unread Messages' : s.filter === 'groups' ? 'No Group Chats' : 'No Messages';
      return `<div class="empty"><b>${what}</b>${s.filter === 'all' ? 'Tap the compose button to send a message to someone in your home.' : ''}</div>`;
    }
    if (q && threads.length) html += `<div class="section-h">Conversations</div>`;
    html += threads.map((t, i) => `
      <div class="row${i === threads.length - 1 ? ' last' : ''}" data-tid="${esc(t.id)}">
        <div class="row-inner">
          <div class="selc${s.selected.has(t.id) ? ' on' : ''}">${s.selected.has(t.id) ? ICON.check : ''}</div>
          <div class="dot">${t.unread || t.marked_unread ? '<i></i>' : t.muted ? `<span class="mute">${ICON.bellOff}</span>` : ''}</div>
          ${this._threadAv(t, 52)}
          <div class="body">
            <div class="line1"><div class="name">${esc(this._threadTitle(t))}</div><div class="date">${t.last ? esc(fmtListDate(t.updated_at, this._hass)) : ''}${ICON.chevR}</div></div>
            <div class="preview">${(() => {
              const d = s.drafts.get(t.id)?.text?.trim();
              if (d) return `<span style="color:var(--cm-red)">Draft:</span> ${esc(d)}`;
              // a reminder that's come due shows the message it was about
              if (t.reminded) {
                const rm = s.msgs.get(t.id)?.list.find(x => x.id === t.reminded);
                return `<span class="remtag">Reminder</span> ${esc(rm ? this._previewText({ last: rm, is_group: t.is_group }) : this._previewText(t))}`;
              }
              return esc(this._previewText(t));
            })()}</div>
          </div>
        </div>
        <div class="swipe-lead"><button class="unr">${t.unread || t.marked_unread ? ICON.mailO : ICON.bubble}<span>${t.unread || t.marked_unread ? 'Read' : 'Unread'}</span></button><button class="pinb">${XICON.pushpin}<span>${t.pinned ? 'Unpin' : 'Pin'}</span></button></div>
        <div class="swipe-actions"><button class="mute">${t.muted ? ICON.bell : ICON.bellOff}<span>${t.muted ? 'Show Alerts' : 'Hide Alerts'}</span></button><button class="arch">${ARCH_ICON}<span>${t.archived ? 'Unarchive' : 'Archive'}</span></button><button class="del">${ICON.trash}<span>Delete</span></button></div>
      </div>`).join('');
    if (q && s.searchHits.length) {
      html += `<div class="section-h">Messages</div>`;
      html += s.searchHits.map(m => {
        const t = s.threads.get(m.thread_id);
        if (!t) return '';
        const words = q.split(/\s+/).filter(Boolean);
        let txt = esc(m.text || m.attachments?.[0]?.name || '');
        for (const w of words) txt = txt.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<span class="hl">$1</span>');
        return `<div class="row hit" data-tid="${esc(t.id)}" data-mid="${esc(m.id)}"><div class="row-inner"><div class="dot"></div>${this._threadAv(t, 52)}
          <div class="body"><div class="line1"><div class="name">${esc(this._threadTitle(t))}</div><div class="date">${esc(fmtListDate(m.ts, this._hass))}${ICON.chevR}</div></div>
          <div class="preview">${m.sender === s.me ? 'You: ' : t.is_group ? esc(this._userName(m.sender, true)) + ': ' : ''}${txt}</div></div></div></div>`;
      }).join('');
    }
    if (q && !threads.length && !s.searchHits.length) html = chips + `<div class="empty"><b>No Results</b>Nothing matches “${esc(s.search.trim())}”.</div>`;
    return html;
  }

  _wireSwipe(container) {
    let row = null, sx = 0, sy = 0, dx = 0, base = 0, active = false, id = null;
    container.addEventListener('pointerdown', (e) => {
      if (this._s.editing || e.pointerType === 'mouse' && e.button !== 0) return;
      const r = e.target.closest('.row:not(.hit)');
      if (!r) return;
      if (row && row !== r) this._closeSwipes(container);
      row = r; sx = e.clientX; sy = e.clientY; dx = 0; active = false; id = e.pointerId;
    });
    container.addEventListener('pointermove', (e) => {
      if (!row || e.pointerId !== id) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!active) {
        if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.4) { active = true; base = row.classList.contains('swiped') ? -216 : row.classList.contains('swiped-l') ? 160 : 0; row.classList.add('swiping'); try { row.setPointerCapture(id); } catch (err) { /* */ } }
        else if (Math.abs(my) > 10) { row = null; return; }
      }
      if (active) {
        // swipe left for Hide Alerts and Delete, right for Unread and Pin
        dx = clamp(base + mx, -250, 200);
        row.querySelector('.swipe-actions').style.visibility = dx < 0 ? 'visible' : 'hidden';
        const lead = row.querySelector('.swipe-lead');
        if (lead) lead.style.visibility = dx > 0 ? 'visible' : 'hidden';
        const inner = row.querySelector('.row-inner');
        inner.style.transition = 'none';
        inner.style.transform = `translateX(${dx}px)`;
        // the buttons slide in and out with the row, so nothing ever shows through the gap
        this._swipeButtons(row, dx, false);
      }
    });
    const end = () => {
      if (!row) return;
      const inner = row.querySelector('.row-inner');
      inner.style.transition = '';
      if (active) {
        // an open row closes as soon as it's pushed back a little way, rather than needing to be
        // dragged nearly all the way across
        const moved = dx - base;
        const open = base < 0 ? moved < 40 && dx < -60 : dx < -60;
        const openL = base > 0 ? moved > -40 && dx > 60 : dx > 60;
        inner.style.transform = open ? 'translateX(-216px)' : openL ? 'translateX(160px)' : '';
        this._swipeButtons(row, open ? -216 : openL ? 160 : 0, true);
        row.classList.toggle('swiped', open);
        row.classList.toggle('swiped-l', openL);
        const r0 = row;
        if (!open && !openL) setTimeout(() => { if (!r0.classList.contains('swiped') && !r0.classList.contains('swiped-l')) { r0.querySelector('.swipe-actions').style.visibility = ''; const l = r0.querySelector('.swipe-lead'); if (l) l.style.visibility = ''; } }, 260);
        // the release of a swipe isn't a tap, but only for a moment and never on the buttons:
        // on iPhone no click follows a swipe, so a lasting guard ate the next real tap
        { const r1 = row, t0 = Date.now(), swallow = (ev) => { if (!ev.target.closest('.swipe-actions, .swipe-lead') || Date.now() - t0 < 80) { ev.stopPropagation(); ev.preventDefault(); } };
          r1.addEventListener('click', swallow, true); setTimeout(() => r1.removeEventListener('click', swallow, true), 350); }
      }
      row.classList.remove('swiping');
      if (!active) row = null;
      active = false;
    };
    container.addEventListener('pointerup', end);
    container.addEventListener('pointercancel', end);
  }

  // Hide Alerts / Delete (and Unread / Pin) move in step with the row as it slides
  _swipeButtons(row, dx, animate) {
    const acts = row.querySelector('.swipe-actions'), lead = row.querySelector('.swipe-lead');
    [acts, lead].forEach(b => { if (b) b.style.transition = animate ? '' : 'none'; });
    if (acts) acts.style.transform = `translateX(${Math.max(0, 216 + Math.min(dx, 0))}px)`;
    if (lead) lead.style.transform = `translateX(${Math.min(0, Math.max(dx, 0) - 160)}px)`;
  }

  _closeSwipes(scope) {
    scope.querySelectorAll('.row.swiped, .row.swiped-l').forEach(r => {
      this._swipeButtons(r, 0, true);
      r.classList.remove('swiped', 'swiped-l');
      r.querySelector('.row-inner').style.transform = '';
      setTimeout(() => { r.querySelector('.swipe-actions').style.visibility = ''; const l = r.querySelector('.swipe-lead'); if (l) l.style.visibility = ''; }, 260);
    });
  }

  async _confirmDeleteThread(tid) {
    const t = this._s.threads.get(tid);
    const r = await this._alert({
      title: 'Delete Conversation?',
      message: `This conversation with ${this._threadTitle(t)} will be deleted from your account. ${t?.is_group ? 'Other people in the group keep their copy.' : 'They keep their copy.'}`,
      buttons: [{ text: 'Delete', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }],
    });
    if (!r.value) return false;
    try { await this._ws('delete_thread', { thread_id: tid }); } catch (err) { this._toast(err.message); return false; }
    return true;
  }

  // ── Page: thread ───────────────────────────────────────────────────────────
  _pg_thread({ tid }) {
    const el = this._el(`<div class="thread">
      <div class="chatbg"></div>
      <div class="scroll"><div class="msgs"></div></div>
      <div class="edge top"></div><div class="edge bottom"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="tright"></div></div>
      <div class="th-head" data-a="info"></div>
      <div class="pinbar g" data-x="pinjump" hidden></div>
      <button class="newpill g" data-a="tobottom">${ICON.chevD}New Messages</button>
      <div class="catchup" hidden></div>
    </div>`);
    const page = { el };
    const s = this._s;
    // effects play for messages that arrived since you last read this chat
    page.readAtOpen = s.threads.get(tid)?.read?.[s.me] || 0;
    // Catch Up: offered when you open a chat with several unread messages
    const unreadAtOpen = s.threads.get(tid)?.unread || 0;
    const catchup = el.querySelector('.catchup');
    const scroll = el.querySelector('.scroll'), msgsEl = el.querySelector('.msgs'), head = el.querySelector('.th-head'), newpill = el.querySelector('.newpill');
    let lastCount = 0;
    const nearBottom = () => scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 140;

    const composer = this._makeComposer({
      threadId: () => tid,
      draftKey: tid,
      plain: () => (s.threads.get(tid)?.participants || []).includes(HA_ID),
      onSend: (text, staged, extra, at) => this._sendMessage(tid, text, staged, extra, at),
      onTyping: (active) => this._ws('typing', { thread_id: tid, active }).catch(() => {}),
    });
    el.appendChild(composer.el);
    page.composer = composer;
    // keep the last message clear of the message box, however tall it gets (banners, chips, Focus…)
    if (window.ResizeObserver) {
      page.ro = new ResizeObserver(() => {
        const h = composer.el.offsetHeight;
        if (h && h !== page.composerH) {
          const grow = h - (page.composerH || h);
          page.composerH = h;
          el.style.setProperty('--cm-composer-h', `${h}px`);
          if (grow > 0 && scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 200 + grow) scroll.scrollTop = scroll.scrollHeight;
        }
      });
      page.ro.observe(composer.el);
    }

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { composer.saveDraft(); this._back(); return; }
      if (a === 'info') { this._nav('info', { tid }); return; }
      if (a === 'tobottom') { scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' }); return; }
      if (a === 'catchup') { this._aiCatchUp(tid, catchup, unreadAtOpen); return; }
      if (a === 'catchup-x') { catchup.hidden = true; page.catchupDone = true; return; }
      if (a === 'call') { this._callMenu(e.target.closest('button'), tid); return; }
      if (a === 'addcontact') { this._addContactFor(this._other(tid)); return; }
      if (a === 'more') {
        const v = await this._menu(e.target.closest('button'), [
          { text: 'Details', value: 'info', icon: ICON.info },
          { text: s.ai?.ask ? 'Search & Ask' : 'Search', value: 'search', icon: ICON.search },
          ...((s.threads.get(tid)?.participants || []).some(p => p !== s.me && p !== HA_ID) ? [{ text: 'Ask Where They Are', value: 'locreq', icon: MICON.locate }] : []),
          { sep: true }, { text: 'Background', sub: this._bgItems(tid), icon: ICON.photo },
          { text: 'Skin', sub: this._skinItems(), icon: ICON.palette },
        ]);
        if (v === 'info') this._nav('info', { tid });
        else if (v === 'search') this._nav('tsearch', { tid });
        else if (v === 'locreq') this._sendMessage(tid, '', [], { type: 'locreq' });
        else if (v?.startsWith?.('bg:')) this._bgChoice(tid, v.slice(3));
        else if (v?.startsWith?.('skin:')) this._setSkin(v.slice(5));
        return;
      }
      const retry = e.target.closest('.receipt.err');
      if (retry) { this._retrySend(tid, retry.dataset.pid); return; }
      // double-tap a message for Tapbacks and the other options
      const tb = e.target.closest('.bub,.xcard,.stkmsg,.linkc');
      if (tb && !e.target.closest('a,button,[data-x],.ink:not(.revealed)')) {
        const now = Date.now();
        clearTimeout(page.replayTimer);
        if (page.lastTap && page.lastTap.el === tb && now - page.lastTap.t < 330) { page.lastTap = null; this._bubbleMenu(tb, tid); return; }
        page.lastTap = { el: tb, t: now };
        // one tap on a message sent with an effect plays it again (a second tap opens the menu instead)
        const fxm = s.msgs.get(tid)?.list.find(x => x.id === tb.closest('.mrow')?.dataset.mid);
        if (fxm?.effect && fxm.effect !== 'invisible' && !fxm.pending) page.replayTimer = setTimeout(() => this._replayFx(page, fxm), 340);
        // one tap on Invisible Ink you've uncovered covers it up again
        else if (fxm?.effect === 'invisible' && !fxm.pending && this._revealed.has(fxm.id)) {
          page.replayTimer = setTimeout(() => this._setInk(tb.closest('.mrow'), fxm.id, false), 340);
        }
      }
      if (await this._moreClick(e, tid, page)) return;
      if (await this._extraClick(e, tid, page)) return;
      const media = e.target.closest('[data-view]');
      if (media) { this._openViewer(media.dataset.view, tid); return; }
      const file = e.target.closest('[data-file]');
      if (file) { this._saveAttachment(file.dataset.file, file.dataset.name); return; }
      const ap = e.target.closest('.audio .ap');
      if (ap) { this._toggleAudio(ap.closest('.audio')); }
    });
    this._wireLongPress(msgsEl, (target) => this._bubbleMenu(target, tid));
    // swipe a message to the right to reply to it
    let sw = null;
    msgsEl.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.mrow[data-mid]');
      if (!row || e.pointerType === 'mouse' || e.target.closest('.sketch,.popt')) return;
      sw = { row, x: e.clientX, y: e.clientY, id: e.pointerId, active: false, dx: 0 };
    });
    msgsEl.addEventListener('pointermove', (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const mx = e.clientX - sw.x, my = e.clientY - sw.y;
      if (!sw.active) {
        if (mx > 12 && mx > Math.abs(my) * 1.6) sw.active = true;
        else if (Math.abs(my) > 10 || mx < -10) { sw = null; return; }
      }
      if (sw.active) { sw.dx = clamp(mx, 0, 80); sw.row.style.transition = 'none'; sw.row.style.transform = `translateX(${sw.dx}px)`; }
    });
    const swEnd = () => {
      if (sw?.active) {
        const row = sw.row;
        row.style.transition = 'transform .22s ease'; row.style.transform = '';
        if (sw.dx > 55) {
          const m = s.msgs.get(tid)?.list.find(x => x.id === row.dataset.mid);
          if (m && !m.pending) composer.setReply(m);
        }
        // the release of a swipe isn't a tap, but only for a moment and never on the buttons:
        // on iPhone no click follows a swipe, so a lasting guard ate the next real tap
        { const r1 = row, t0 = Date.now(), swallow = (ev) => { if (!ev.target.closest('.swipe-actions, .swipe-lead') || Date.now() - t0 < 80) { ev.stopPropagation(); ev.preventDefault(); } };
          r1.addEventListener('click', swallow, true); setTimeout(() => r1.removeEventListener('click', swallow, true), 350); }
      }
      sw = null;
    };
    msgsEl.addEventListener('pointerup', swEnd);
    msgsEl.addEventListener('pointercancel', swEnd);

    scroll.addEventListener('scroll', () => {
      if (nearBottom()) newpill.classList.remove('show');
      const box = s.msgs.get(tid);
      if (scroll.scrollTop < 150 && box?.more && !box.loading) this._loadOlder(tid, page);
    }, { passive: true });

    // press and hold ⋯ to go straight to Ask (or Search when Ask is off)
    {
      let holdT = null, held = false;
      const cancel = () => { clearTimeout(holdT); holdT = null; };
      el.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('[data-a="more"]')) return;
        held = false; cancel();
        holdT = setTimeout(() => { held = true; holdT = null; navigator.vibrate?.(10); this._nav('tsearch', { tid, ask: !!s.ai?.ask }); }, 550);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, cancel));
      el.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-a="more"]')) e.preventDefault(); });
      el.addEventListener('click', (e) => { if (held && e.target.closest('[data-a="more"]')) { held = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    }

    page.renderHead = () => {
      const t = s.threads.get(tid);
      if (!t) return;
      const pr = !t.is_group && this._other(tid) && this._other(tid) !== HA_ID ? this._presenceText(this._other(tid)) : '';
      this._set(head, `${this._threadAv(t, 46)}<div class="namepill g"><span>${esc(this._threadTitle(t))}</span>${ICON.chevR}</div>${pr ? `<div class="presence${pr === 'Active now' ? ' on' : ''}">${esc(pr)}</div>` : ''}`);
      const other = this._other(tid);
      const c = other && this._contactForUser(other);
      const hd = c ? this._callHandles(c) : null;
      const sk = this._skin();
      this._set(el.querySelector('.tright'), (hd && (hd.phones.length || hd.ft) ? `<button class="cb g" data-a="call" aria-label="Call or FaceTime">${hd.ft && isApple() ? ICON.video : ICON.phone}</button>`
        : other && other !== HA_ID && !c && s.users.has(other) ? `<button class="cb g" data-a="addcontact" aria-label="Add to Contacts">${ICON.addPerson}</button>` : '')
        + `<button class="cb g tmore" data-a="more" aria-label="More: details and skin">${ICON.more}<span class="tlbl">${esc(sk.more || 'More')}</span></button>`);
    };

    // pinned messages along the top
    const pinbar = el.querySelector('.pinbar');
    page.renderPins = () => {
      const pins = s.threads.get(tid)?.pinned_messages || [];
      pinbar.hidden = !pins.length;
      el.classList.toggle('has-pins', !!pins.length);
      if (!pins.length) return;
      const i = (page.pinIdx ?? 0) % pins.length, p = pins[i];
      this._set(pinbar, `${XICON.pushpin}<div class="pbt"><b>${esc(p.sender === s.me ? 'You' : this._nameIn(tid, p.sender, true))}</b><span>${esc(p.text)}</span></div>${pins.length > 1 ? `<span class="pbn">${i + 1}/${pins.length}</span>` : ''}`);
    };
    // Focus ("has notifications silenced") and birthday nudges above the message box
    page.renderBars = () => {
      const focus = this._focusUsers(tid);
      const t = s.threads.get(tid);
      page.watchStates = (t?.participants || []).some(p => p !== s.me && (s.focusEntities[p] || []).length);
      let html = '';
      if (focus.length) {
        const who = focus.length === 1 ? this._nameIn(tid, focus[0], true) : `${focus.length} people`;
        html += `<div class="focusbar g">${MICON.moon}<span>${esc(who)} ${focus.length === 1 ? 'has' : 'have'} notifications silenced</span><button data-x="anyway">Notify Anyway</button></div>`;
      }
      const b = this._birthdayFor(tid);
      if (b) html += `<div class="bdaybar g"><span>🎂 It’s ${esc(b.name)}’s birthday</span><button data-x="bday">Say Happy Birthday</button><button class="bx" data-x="bdayx" aria-label="Dismiss">${ICON.x}</button></div>`;
      composer.setBars(html);
    };

    page.renderMsgs = ({ keep = false } = {}) => {
      const box = s.msgs.get(tid);
      const wasBottom = nearBottom() || !lastCount;
      const prevH = scroll.scrollHeight, prevTop = scroll.scrollTop;
      if (this._set(msgsEl, this._msgsHtml(tid))) { this._hydrate(msgsEl); this._hydrateExtras(msgsEl); }
      page.hasEntities = !!box?.list.some(m => m.type === 'entity' || m.type === 'status');
      // effects for messages that came in while you were away
      if (!page.fxChecked && box?.loaded) {
        page.fxChecked = true;
        box.list.forEach(m => { if (m.effect && m.sender !== s.me && m.ts > page.readAtOpen) this._queueFx(m); });
      }
      if (this._fxQueue.size) this._playQueuedFx(page, tid);
      const count = box?.list.length || 0;
      if (keep) scroll.scrollTop = prevTop + (scroll.scrollHeight - prevH);
      else if (wasBottom) scroll.scrollTop = scroll.scrollHeight;
      else if (count > lastCount) newpill.classList.add('show');
      lastCount = count;
      page.updateAi();
      if (this._flashMsg) {
        const row = msgsEl.querySelector(`[data-mid="${CSS.escape(this._flashMsg)}"]`);
        if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); this._flashMsg = null; }
      }
    };

    // AI: suggested replies for the latest message from someone else, and the Catch Up pill
    page.updateAi = () => {
      const ai = s.ai || {};
      composer.refreshTools();
      if (ai.catchup && unreadAtOpen >= 3 && !page.catchupDone && !catchup.dataset.busy && !catchup.querySelector('.cu-text')) {
        catchup.hidden = false;
        this._set(catchup, `<button class="cu-pill g" data-a="catchup">${ICON.bubble}<span>Summarise ${unreadAtOpen} unread</span></button>`);
      } else if (!ai.catchup) catchup.hidden = true;
      const box = s.msgs.get(tid), t = s.threads.get(tid);
      const last = box?.loaded ? [...box.list].reverse().find(m => m.type !== 'system' && !m.pending) : null;
      const other = this._other(tid);
      if (!ai.replies || !last || last.sender === s.me || other === HA_ID || !composer.isEmpty()) { composer.setChips(null); return; }
      if (this._aiReplies.has(last.id)) { composer.setChips(this._aiReplies.get(last.id)); return; }
      composer.setChips(null);
      if (page.repliesFor === last.id) return;
      page.repliesFor = last.id;
      this._ws('ai', { action: 'replies', thread_id: tid }).then(r => {
        this._aiReplies.set(last.id, r.result || []);
        if (page.repliesFor === last.id) page.updateAi();
      }).catch(() => { this._aiReplies.set(last.id, []); });
    };

    const bgEl = el.querySelector('.chatbg');
    // a photo, or a Live Wallpaper ("live:ocean") that only runs while this chat is on screen
    page.renderBg = (force) => {
      const img = this._bgFor(tid);
      const kind = img.startsWith('live:') ? img.slice(5) : '';
      const want = kind && page.visible && this.isConnected;
      if (!force && bgEl.dataset.src === img && !!page.live === !!want) return;
      bgEl.dataset.src = img;
      if (page.live) { page.live.stop(); this._lives.delete(page.live); page.live = null; }
      bgEl.style.backgroundImage = img && !kind ? `url("${img}")` : '';
      if (want) { page.live = new CrowLiveWallpaper(bgEl, kind, this._hass); this._lives.add(page.live); }
      el.classList.toggle('has-bg', !!img);
      el.classList.toggle('has-live', !!kind);
    };
    page.refresh = (what, which, force) => {
      if (what === 'background' || what === 'all') page.renderBg(force);
      if (what === 'theme' || what === 'all') this._applyPageTheme(el, tid);
      if (what === 'background' || what === 'theme') return;
      if (what === 'states') { if (page.hasEntities) { page.renderMsgs(); this._hydrateExtras(msgsEl); } page.renderBars(); return; }
      if (what === 'presence') { page.renderHead(); return; }
      if (which && which !== tid && what !== 'all' && what !== 'contacts') return;
      if (!s.threads.has(tid) && s.ready) return;
      if (['all', 'thread', 'contacts', 'messages'].includes(what)) { page.renderHead(); page.renderPins(); page.renderBars(); }
      if (['all', 'messages', 'read', 'typing', 'contacts', 'thread'].includes(what)) page.renderMsgs();
    };
    page.onShow = () => {
      page.visible = true; page.renderBg();
      const box = s.msgs.get(tid);
      if (!box?.loaded) this._loadMsgs(tid);
      else if (box.stale && !this._s.cached) this._loadMsgs(tid, { soft: true });
      this._maybeMarkRead();
      if (!coarse()) setTimeout(() => composer.focus(), 350);
    };
    page.onHide = () => { composer.typingStop(); page.visible = false; page.renderBg(); };
    page.destroy = () => { page.ro?.disconnect(); composer.saveDraft(); composer.destroy(); page.visible = false; page.renderBg(); this._revealed.clear(); clearTimeout(page.fxTimer); };
    return page;
  }

  // ── Chat backgrounds & themes (each person's own) ──────────────────────────
  // ── Archive ────────────────────────────────────────────────────────────────
  async _archive(tid, on, quiet = false) {
    const t = this._s.threads.get(tid);
    if (t) { t.archived = on; if (on) t.pinned = false; this._refresh('list'); }
    try {
      await this._ws('flag', { thread_id: tid, flag: 'archived', on });
      if (!quiet) this._toast(on ? 'Archived' : 'Moved back to Messages');
    } catch (err) { if (t) t.archived = !on; this._refresh('list'); this._toast(err.message); }
  }

  // ── Remind Me Later ────────────────────────────────────────────────────────
  _remindItems() {
    const now = new Date(), at = (d, h, m = 0) => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.getTime(); };
    const items = [{ text: 'In 1 Hour', value: `remind:${Date.now() + 3600e3}`, icon: REMIND_ICON }];
    if (now.getHours() < 19) items.push({ text: 'Tonight', value: `remind:${at(0, 20)}` });
    items.push({ text: 'Tomorrow Morning', value: `remind:${at(1, 9)}` });
    const dow = now.getDay();
    if (dow >= 1 && dow <= 4) items.push({ text: 'This Weekend', value: `remind:${at(6 - dow, 9)}` });
    items.push({ text: 'Next Week', value: `remind:${at(((8 - dow) % 7) || 7, 9)}` });
    items.push({ sep: true }, { text: 'Choose a Time…', value: 'remind:custom', icon: MICON.cal });
    return items;
  }

  _remindWhen(at) {
    const d = new Date(at), now = new Date(), tm = fmtTime(at, this._hass);
    if (sameDay(d, now)) return `today at ${tm}`;
    const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
    if (sameDay(d, tmr)) return `tomorrow at ${tm}`;
    return `${d.toLocaleDateString(locale(this._hass), { weekday: 'short', day: 'numeric', month: 'short' })} at ${tm}`;
  }

  async _remindChoice(tid, m, v) {
    const set = async (at) => {
      try {
        await this._ws('reminder/set', { thread_id: tid, message_id: m.id, at });
        this._toast(at ? `I’ll remind you ${this._remindWhen(at)}` : 'Reminder cancelled');
      } catch (err) { this._toast(err.message); }
    };
    if (v === 'off') { set(null); return; }
    if (v !== 'custom') { set(+v); return; }
    const pad = n => String(n).padStart(2, '0');
    const d = new Date(Date.now() + 3600e3); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const sh = this._xsheet({
      title: 'Remind Me', action: 'Set',
      body: `<div class="xnote" style="margin-top:0">Home Assistant will remind you about this message, bring the conversation back to the top as unread, and send a notification.</div>
        <div class="xlabel">Date and Time</div><input type="datetime-local" class="xfield when" value="${val}">`,
      onAction: async () => {
        const at = new Date(sh.el.querySelector('.when').value).getTime();
        if (!at || at < Date.now() + 60000) { this._toast('Choose a time in the future'); return false; }
        await set(at);
        return true;
      },
    });
  }

  _remindHtml(m, t) {
    const r = (t?.reminders || []).find(x => x.message_id === m.id);
    return r ? `<button class="remindmk" data-x="remchip">${REMIND_ICON}<span>Remind me ${esc(this._remindWhen(r.at))}</span></button>` : '';
  }

  // ── Location request: "Where are you?" ────────────────────────────────────
  _locreqHtml(m, t) {
    const me = this._s.me, rq = m.locreq || {}, shared = rq.shared || {}, declined = rq.declined || [];
    const others = (t?.participants || []).filter(p => p !== m.sender && p !== HA_ID);
    const nm = (u) => this._nameIn(m.thread_id, u, true);
    let title, sub, btns = '';
    if (m.sender === me) {
      title = 'Where are you?';
      const lines = others.map(u => shared[u] ? `${nm(u)} shared their location` : declined.includes(u) ? `${nm(u)} isn’t sharing right now` : `Waiting for ${nm(u)}…`);
      sub = lines.slice(0, 4).join('<br>') || 'Waiting…';
      return `<div class="xcard lqcard" data-x="locreq"><div class="xh">${MICON.locate}Location Request</div><div class="xt">${esc(title)}</div><div class="xs">${sub.split('<br>').map(esc).join('<br>')}</div></div>`;
    }
    title = `${nm(m.sender)} asked where you are`;
    if (shared[me]) sub = 'You shared your location.';
    else if (declined.includes(me)) sub = 'You chose Not Now.';
    else {
      sub = 'Sends where your Home Assistant person is right now, just once. It isn’t Live Location.';
      btns = '<div class="xbtns"><button data-x="lqno">Not Now</button><button class="bold" data-x="lqshare">Share My Location</button></div>';
    }
    return `<div class="xcard lqcard" data-x="locreq"><div class="xh">${MICON.locate}Location Request</div><div class="xt">${esc(title)}</div><div class="xs">${esc(sub)}</div>${btns}</div>`;
  }

  // the Background folder in a conversation's ⋯ menu (the same choices as in Details)
  _bgItems(tid) {
    const b = this._s.backgrounds || {}, own = b[tid] && b[tid] !== 'none', cur = this._bgFor(tid);
    const items = [
      { text: 'Photo for This Chat…', value: 'bg:this', icon: ICON.photo },
      { text: 'Photo for All Chats…', value: 'bg:all', icon: ICON.bubble },
      { text: 'Live Wallpaper…', value: 'bg:live', icon: ICON.wallpaper },
    ];
    if (cur) items.push({ sep: true }, { text: 'Remove from This Chat', value: 'bg:remove', icon: ICON.x });
    return items;
  }

  async _bgChoice(tid, what) {
    if (what === 'live') { this._nav('live', { tid }); return; }
    if (what === 'remove') {
      // a chat's own background goes; a background for all chats is switched off for just this one
      const b = this._s.backgrounds || {};
      const image = b[tid] && b[tid] !== 'none' && !b['*'] ? null : 'none';
      try { await this._ws('background/set', { key: tid, image }); this._toast('Background removed from this chat'); }
      catch (err) { this._toast(err.message || 'Couldn’t change the background'); }
      return;
    }
    const key = what === 'all' ? '*' : tid;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
    this._root.appendChild(input);
    input.addEventListener('change', async () => {
      const f = input.files[0]; input.remove();
      if (!f) return;
      try {
        this._toast('Setting background…');
        const image = await fileToBackground(f);
        await this._ws('background/set', { key, image });
        this._toast(key === '*' ? 'Background set for all chats' : 'Background set for this chat');
      } catch (err) { this._toast(err.message || 'Couldn’t use that picture'); }
    });
    input.click();
  }

  _bgFor(tid) { const b = this._s.backgrounds; const v = (tid && b[tid]) || b['*'] || ''; return v === 'none' ? '' : v; }
  _themeFor(tid) { const m = this._s.themes; return (tid && m[tid]) || m['*'] || ''; }
  _bgLabel(v) {
    if (!v || v === 'none') return 'None';
    if (v.startsWith('live:')) return cmLiveInfo(v.slice(5))?.name || 'Live Wallpaper';
    return 'Photo';
  }
  _themeName(id) { return COLOUR_THEMES.find(t => t.id === id)?.name || 'Default'; }

  // The colours a theme sets. Dark mode takes the whole theme; light mode keeps
  // the bubbles and accent, over a pale tint of the theme's colour.
  _themeVars(id, dark = this._isDark()) {
    const t = COLOUR_THEMES.find(x => x.id === id);
    if (!t) return {};
    const ha = this._config.use_ha_theme === true;
    if (!t.accent) {
      // Classic sets the standard Messages colours outright, so a chat (or a preview tile)
      // on Classic doesn't pick up the colours of an All Chats theme around it
      const v = { '--cm-accent': '#007AFF', '--cm-sent': '#007AFF', '--cm-sent-text': '#ffffff',
        '--cm-recv': dark ? '#262628' : '#E9E9EB', '--cm-recv-text': dark ? '#ffffff' : '#000000' };
      if (!ha) v['--cm-bg'] = dark ? '#000000' : '#ffffff';
      return v;
    }
    const v = { '--cm-accent': t.accent, '--cm-sent': t.sent, '--cm-sent-text': t.sentText };
    if (dark) {
      Object.assign(v, { '--cm-recv': t.recv, '--cm-recv-text': t.recvText });
      if (!ha) v['--cm-bg'] = t.bg;
    } else {
      Object.assign(v, { '--cm-recv': `color-mix(in srgb, ${t.accent} 13%, #E9E9EB)`, '--cm-recv-text': '#000000' });
      if (!ha) v['--cm-bg'] = `color-mix(in srgb, ${t.accent} 6%, #ffffff)`;
    }
    return v;
  }

  // A chat with a theme of its own wears it on its pages; otherwise the card's colours show through.
  _applyPageTheme(el, tid) {
    const id = this._s.themes[tid] || '';
    const all = this._s.themes['*'] || '';
    // Classic only needs setting when an All Chats theme would otherwise show through
    const vars = id && this._skin().id === 'iphone' && !(id === 'classic' && (!all || all === 'classic')) ? this._themeVars(id) : {};
    ['--cm-accent', '--cm-sent', '--cm-sent-text', '--cm-recv', '--cm-recv-text', '--cm-bg'].forEach(k => {
      if (vars[k]) el.style.setProperty(k, vars[k]); else el.style.removeProperty(k);
    });
    el.classList.toggle('themed', !!vars['--cm-bg']);
  }

  // the Skin folder in the ⋯ and Filter menus: only you see the skin you pick
  _skinItems() {
    const cur = this._skin().id;
    const it = k => ({ text: k.name, value: `skin:${k.id}`, checked: k.id === cur });
    return [{ header: 'Modern' }, ...SKINS.filter(k => k.group === 'modern').map(it), { header: 'Old School' }, ...SKINS.filter(k => k.group === 'retro').map(it)];
  }

  async _setSkin(id) {
    const s = this._s, before = s.profile?.skin || '';
    if (!SKIN_BY[id] || id === this._skin().id) return;
    s.profile = { ...(s.profile || {}), skin: id };
    this._applyTheme(); this._refresh('all');
    try { const r = await this._ws('profile/set', { skin: id }); if (r?.profile) s.profile = r.profile; }
    catch (err) { s.profile = { ...s.profile, skin: before }; this._applyTheme(); this._refresh('all'); this._toast(err.message || 'Could not change the skin'); }
  }

  // New contact for a Home Assistant user, with their name filled in and linked to them
  _addContactFor(uid) {
    const u = this._s.users.get(uid);
    if (!u) return;
    const shared = (u.name || '').trim(), ha = (u.ha_name || '').trim();
    const full = shared.split(/\s+/).length > ha.split(/\s+/).length ? shared : (ha || shared);
    const [first, ...rest] = full.split(/\s+/);
    this._nav('contactEdit', { prefill: { first, last: rest.join(' '), ha_user: uid } });
  }

  _other(tid) {
    const t = this._s.threads.get(tid);
    if (!t || t.is_group) return null;
    return t.participants.find(p => p !== this._s.me) || null;
  }

  async _loadMsgs(tid, { reset = false, soft = false } = {}) {
    const s = this._s;
    let box = s.msgs.get(tid);
    // soft: what's on screen stays while the newest messages are fetched (no loading spinner)
    if (soft && box?.loaded) {
      if (box.refreshing) return;
      box.refreshing = true;
    } else if (!box || reset) { const pending = box?.list.filter(m => m.pending) || []; box = { list: pending, more: false, loaded: false, loading: true }; s.msgs.set(tid, box); }
    try {
      const r = await this._ws('messages', { thread_id: tid, limit: 60 });
      const pending = box.list.filter(m => m.pending);
      const first = r.messages[0]?.ts;
      // older messages you'd already scrolled back to are kept
      const older = soft && first !== undefined && r.more ? box.list.filter(m => !m.pending && m.ts < first) : [];
      box.list = [...older, ...r.messages, ...pending];
      box.more = older.length ? box.more : r.more; box.loaded = true; box.stale = false;
      this._upsertThread(r.thread);
    } catch (err) {
      box.loaded = true;
      if (err?.code === 'not_found') { s.threads.delete(tid); this._closeThreadPages(tid); this._toast('This conversation is no longer available'); }
    } finally { box.loading = false; box.refreshing = false; }
    this._refresh('messages', tid);
    this._maybeMarkRead();
  }

  async _loadOlder(tid, page) {
    const box = this._s.msgs.get(tid);
    const first = box?.list.find(m => !m.pending);
    if (!box || !first) return;
    box.loading = true;
    try {
      const r = await this._ws('messages', { thread_id: tid, before: first.ts, limit: 60 });
      box.list = [...r.messages, ...box.list];
      box.more = r.more;
      page.renderMsgs({ keep: true });
    } catch (e) { /* ignore */ } finally { box.loading = false; }
  }

  _maybeMarkRead() {
    const top = this._stack[this._stack.length - 1];
    if (top?.type !== 'thread' || document.visibilityState !== 'visible' || !this.isConnected) return;
    const tid = top.data.tid, t = this._s.threads.get(tid);
    if (!t || (!t.unread && !t.marked_unread)) return;
    clearTimeout(this._readTimer);
    this._readTimer = setTimeout(() => {
      t.unread = 0; t.marked_unread = false;
      this._ws('mark_read', { thread_id: tid }).catch(() => {});
      this._refresh('read', tid);
    }, 250);
  }

  _msgsHtml(tid) {
    const s = this._s, t = s.threads.get(tid), box = s.msgs.get(tid);
    if (!box || (!box.loaded && !box.list.length)) return `<div class="more-spin">Loading…</div>`;
    const list = box.list;
    const isGroup = t?.is_group, skinned = this._skin().id !== 'iphone', buddy = !!this._skin().buddy;
    let html = box.more ? `<div class="more-spin">Loading earlier messages…</div>` : '';
    html += this._disappearNote(t);
    if (!list.length) html += `<div class="sys" style="margin-top:30px">${t ? `Send a message to ${esc(this._threadTitle(t))}.` : ''}</div>`;
    const lastMineIdx = (() => { for (let i = list.length - 1; i >= 0; i--) if (list[i].sender === s.me && list[i].type !== 'system' && list[i].type !== 'call') return i; return -1; })();
    const realMsgs = list;
    for (let i = 0; i < realMsgs.length; i++) {
      const m = realMsgs[i], prev = realMsgs[i - 1], next = realMsgs[i + 1];
      const stamp = !prev || m.ts - prev.ts > 3600000;
      if (stamp) html += `<div class="stamp">${fmtStamp(m.ts, this._hass)}</div>`;
      if (m.type === 'system') {
        // "Message deleted" and "… unsent a message" say when it happened
        const at = (m.note === 'deleted' || m.note === 'unsent') && m.at
          ? ` · ${sameDay(new Date(m.at), new Date()) ? 'Today' : fmtListDate(m.at, this._hass)} ${fmtTime(m.at, this._hass)}` : '';
        html += `<div class="sys${m.note ? ` n-${esc(m.note)}` : ''}">${esc(m.text)}${esc(at)}</div>`;
        continue;
      }
      if (m.type === 'call') { html += this._callHtml(m); continue; }
      const runStart = stamp || !prev || prev.type === 'system' || prev.type === 'call' || prev.sender !== m.sender || m.ts - prev.ts > 120000;
      const runEnd = !next || next.type === 'system' || next.type === 'call' || next.sender !== m.sender || next.ts - m.ts > 120000 || next.ts - m.ts > 3600000;
      const mine = m.sender === s.me;
      const special = SPECIAL_TYPES.has(m.type) || MORE_TYPES.has(m.type);
      let inner = '';
      if (!mine && isGroup && runStart) inner += `<div class="sender">${esc(this._nameIn(tid, m.sender))}</div>`;
      inner += this._forwardedHtml(m) + this._quoteHtml(m);
      if (special) inner += this._specialHtml(m, t) || this._moreSpecialHtml(m, t);
      const atts = m.attachments || [];
      if (m.view_once && atts.length) inner += this._viewOnceHtml(m);
      else atts.forEach((a, ai) => { inner += this._attHtml(a, m, runEnd && !m.text && ai === atts.length - 1); });
      // a message that's just a link shows only the preview card, like Apple Messages
      const linkOnly = m.link && m.text && m.text.trim().replace(/[).,!?;:]+$/, '') === m.link.url;
      if (m.text && !special && !linkOnly) {
        const emoji = !atts.length && !m.spans?.length && EMOJI_ONLY.test(m.text.trim());
        const tr = this._translations.get(m.id);
        const ink = m.effect === 'invisible' ? ` ink${this._revealed.has(m.id) || m.pending ? ' revealed' : ''}` : '';
        inner += `<div class="bub${emoji && !tr ? ' emoji' : ''}${ink}${m.pending && !m.failed ? ' pending' : ''}${m.failed ? ' failed' : ''}"${skinned && runEnd ? ` data-t="${esc(fmtTime(m.ts, this._hass))}"` : ''}><span class="btxt">${this._richText(m)}</span>${tr ? `<div class="trans"><span>${ICON.globe}Translated</span>${linkify(tr)}</div>` : ''}${runEnd ? TAIL : ''}</div>`;
      }
      inner += this._linkHtml(m) + this._actionsHtml(m) + this._ttlHtml(m) + this._editedHtml(m) + this._fxNoteHtml(m) + this._sentNotesHtml(m) + this._starHtml(m, t) + this._remindHtml(m, t);
      inner += this._tapbacksHtml(m) + this._placedHtml(m);
      const avSlot = (!mine && isGroup ? `<div class="mav">${runEnd ? this._userAv(m.sender, 28) : ''}</div>` : '')
        // skins with a buddy picture beside the first message of each run (Mac OS X Aqua)
        + (buddy && runStart ? `<div class="buddy">${this._userAv(m.sender, 30)}</div>` : '');
      html += `<div class="mrow ${mine ? 'me' : 'them'}${runStart ? ' first' : ''}${m.reactions && Object.keys(m.reactions).length ? ' has-tb' : ''}" data-mid="${esc(m.id)}"${skinned ? ` data-who="${esc(mine ? this._userName(s.me, true) || 'Me' : this._nameIn(tid, m.sender))}" data-t="${esc(fmtTime(m.ts, this._hass))}"` : ''}>${avSlot}<div class="mcol">${inner}</div></div>`;
      if (i === lastMineIdx) html += this._receiptHtml(m, t);
    }
    html += this._scheduledHtml(tid);
    const typers = [...(s.typing.get(tid)?.keys() || [])];
    if (typers.length) {
      const avSlot = isGroup ? `<div class="mav">${this._userAv(typers[0], 28)}</div>` : '';
      html += `<div class="mrow them first">${avSlot}<div class="mcol"><div class="typing"><i></i><i></i><i></i></div></div></div>`;
    }
    return html;
  }

  _receiptHtml(m, t) {
    if (m.failed) return `<div class="receipt err" data-pid="${esc(m.id)}">Not Delivered — tap to try again</div>`;
    if (m.pending) return `<div class="receipt">Sending…</div>`;
    if (!t) return '';
    const others = t.participants.filter(p => p !== this._s.me && p !== HA_ID);
    const readers = others.filter(p => (t.read?.[p] || 0) >= m.ts);
    if (!t.is_group && readers.length) {
      const ts = t.read[readers[0]];
      return `<div class="receipt"><b>Read</b> ${esc(sameDay(new Date(ts), new Date()) ? fmtTime(ts, this._hass) : fmtListDate(ts, this._hass))}</div>`;
    }
    if (t.is_group && readers.length) return `<div class="receipt"><b>Read by ${readers.length === others.length ? 'Everyone' : readers.length}</b></div>`;
    return `<div class="receipt"><b>Delivered</b></div>`;
  }

  _attHtml(a, m, tail) {
    const mime = a.mime || '';
    // deleted from the server (by an administrator, from the editor's Storage): a question mark in its place
    if (a.removed) {
      this._missing.add(a.id);
      if (!mime.startsWith('image/') && !mime.startsWith('video/'))
        return `<div class="filebub missing-file" data-mid-att="${esc(a.id)}"><span class="q-sm">${MISSING_Q}</span><div style="min-width:0"><div class="fn">${esc(a.name || 'Attachment')}</div><div class="fs">No longer available</div></div></div>`;
    }
    const local = a._local ? ` data-local="${esc(a._local)}"` : '';
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      let w = a.width || 240, h = a.height || 180;
      const sc = Math.min(1, 240 / w, 300 / h);
      w = Math.max(90, Math.round(w * sc)); h = Math.max(70, Math.round(h * sc));
      const video = mime.startsWith('video/');
      const useThumb = a.has_thumb || !video ? (a.has_thumb ? 1 : 0) : 1;
      if (this._missing.has(a.id)) return `<div class="media missing" data-view="${esc(a.id)}" style="width:${w}px;height:${h}px">${MISSING_Q}</div>`;
      const known = a._local || this._blobReady.get(`${a.id}:${useThumb}`) || '';
      return `<div class="media" data-view="${esc(a.id)}" style="width:${w}px;height:${h}px"><img data-att="${esc(a.id)}" data-thumb="${useThumb}"${local}${known ? ` src="${esc(known)}"` : ''} alt="" style="width:${w}px;height:${h}px;max-width:none;max-height:none" draggable="false">${video ? `<div class="playov"><span>${ICON.play}</span></div>${a.duration ? `<div class="dur">${fmtDur(a.duration)}</div>` : ''}` : ''}</div>`;
    }
    if (mime.startsWith('audio/')) {
      let hsh = hashHue(a.id) + 7;
      const bars = Array.from({ length: 28 }, () => { hsh = (hsh * 9301 + 49297) % 233280; return 20 + Math.round((hsh / 233280) * 80); });
      return `<div class="audio" data-aid="${esc(a.id)}" data-dur="${a.duration || 0}"${local}><button class="ap" aria-label="Play">${ICON.play}</button><div class="bars">${bars.map(b => `<i style="height:${b}%"></i>`).join('')}</div><span class="at">${fmtDur(a.duration)}</span><button class="spd" data-s="${this._audioRate || 1}" aria-label="Playback speed">${this._audioRate || 1}×</button></div>`;
    }
    return `<div class="filebub" data-file="${esc(a.id)}" data-name="${esc(a.name)}">${ICON.doc}<div style="min-width:0"><div class="fn">${esc(a.name || 'Attachment')}</div><div class="fs">${esc(fmtBytes(a.size))}</div></div></div>`;
  }

  // Attachments are fetched with the user's login and shown from blob: URLs.
  _media(aid, thumb = false) {
    const key = `${aid}:${thumb ? 1 : 0}`;
    if (!this._blobs.has(key)) {
      const dbKey = `${this._s.me || this._hass?.user?.id || ''}|${key}`;
      const fetchIt = () => this._hass.fetchWithAuth(`/api/crow_messenger/media/${encodeURIComponent(aid)}${thumb ? '?thumb=1' : ''}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(b => { if (thumb || (b.type.startsWith('image/') && b.size < 1500000)) cmMedia.put(dbKey, b); return b; });
      const p = cmMedia.get(dbKey).then(b => b || fetchIt())
        .then(b => { const u = URL.createObjectURL(b); this._blobReady.set(key, u); return u; });
      p.catch(() => this._blobs.delete(key));
      this._blobs.set(key, p);
    }
    return this._blobs.get(key);
  }

  _hydrate(scope) {
    scope.querySelectorAll('img[data-att]').forEach(img => {
      if (img.dataset.local) { img.src = img.dataset.local; return; }
      if (img.getAttribute('src')) return;
      const thumb = img.dataset.thumb === '1';
      // only a "not found" from the server means it's been deleted; a dropped connection just retries later
      const gone = (err) => { if (!this._isGone(err)) return; this._missing.add(img.dataset.att); this._markMissing(img); };
      this._media(img.dataset.att, thumb).then(u => { img.src = u; }).catch((err) => {
        if (thumb) this._media(img.dataset.att, false).then(u => { img.src = u; }).catch(gone);
        else gone(err);
      });
    });
  }

  _isGone(err) { return ['404', '410'].includes(String(err?.message)); }

  // swap a photo or video that's no longer on the server for the question mark
  _markMissing(img) {
    const box = img.closest('.media');
    if (!box) return;
    box.classList.add('missing');
    box.innerHTML = MISSING_Q;
  }

  _adoptLocal(pending, real) {
    (pending.attachments || []).forEach((a, i) => {
      const r = real.attachments?.[i];
      if (r && a._local) { this._blobs.set(`${r.id}:0`, Promise.resolve(a._localFull || a._local)); this._blobs.set(`${r.id}:1`, Promise.resolve(a._local)); }
    });
  }

  // Send Later is either a time, or a place: { zone, on: 'arrive' | 'leave', name }
  _laterArgs(when) { return typeof when === 'number' ? { at: when } : { place: { zone: when.zone, on: when.on } }; }
  _laterText(when) {
    if (typeof when !== 'number') return `Will send when you ${when.on === 'leave' ? 'leave' : 'arrive at'} ${when.name || 'there'}`;
    return `Will send ${sameDay(new Date(when), new Date()) ? 'today' : fmtListDate(when, this._hass)} at ${fmtTime(when, this._hass)}`;
  }

  async _sendMessage(tid, text, staged, extra = {}, at = null) {
    const s = this._s;
    extra = extra || {};
    // "Happy Birthday" sends balloons, "Congratulations" confetti… like iMessage
    if (!extra.effect && (!extra.type || extra.type === 'text') && text && this._config.effect_words !== false) {
      const w = fxForWords(text);
      if (w) extra = { ...extra, effect: w };
    }
    if (at) {
      // Send Later: Home Assistant keeps it and sends it at that time (or when you arrive or leave)
      try {
        await this._ws('send', { thread_id: tid, text, attachments: staged.map(x => x.id), extra, ...this._laterArgs(at) });
        this._toast(this._laterText(at));
      } catch (err) { this._toast(err.message || 'Couldn’t schedule that message'); }
      return;
    }
    let box = s.msgs.get(tid);
    if (!box) { box = { list: [], more: false, loaded: false }; s.msgs.set(tid, box); }
    const orig = extra.reply_to ? box.list.find(x => x.id === extra.reply_to) : null;
    const pending = {
      id: `p${uid8()}`, pending: true, thread_id: tid, sender: s.me, text, ts: Date.now(), type: 'text',
      attachments: staged.map(x => ({ id: x.id, name: x.name, mime: x.mime, size: x.size, width: x.width, height: x.height, duration: x.duration, _local: x.preview, _localFull: x.fullUrl })),
      _ids: staged.map(x => x.id), _extra: extra,
      effect: extra.effect, spans: extra.spans, mentions: extra.mentions, reply_to: extra.reply_to,
      reply_preview: orig ? { sender: orig.sender, text: orig.text || this._previewText({ last: orig }) } : undefined,
    };
    if (extra.effect && extra.effect !== 'invisible') this._fxQueue.add(pending.id);
    box.list.push(pending);
    this._refresh('messages', tid);
    await this._deliver(tid, pending);
  }

  async _deliver(tid, pending) {
    const box = this._s.msgs.get(tid);
    try {
      const r = await this._ws('send', { thread_id: tid, text: pending.text, attachments: pending._ids, ...(pending._extra && Object.keys(pending._extra).length ? { extra: pending._extra } : {}) });
      const i = box.list.indexOf(pending);
      this._adoptLocal(pending, r.message);
      if (this._fxQueue.delete(pending.id)) this._fxQueue.add(r.message.id);
      this._played.add(r.message.id);
      if (i >= 0) {
        if (box.list.some(m => m.id === r.message.id)) box.list.splice(i, 1);
        else box.list.splice(i, 1, r.message);
      }
    } catch (err) {
      pending.failed = true;
      this._toast(err?.message || 'Message not sent');
    }
    this._refresh('messages', tid);
  }

  _retrySend(tid, pid) {
    const box = this._s.msgs.get(tid);
    const p = box?.list.find(m => m.id === pid);
    if (!p) return;
    p.failed = false;
    this._refresh('messages', tid);
    this._deliver(tid, p);
  }

  async _bubbleMenu(target, tid) {
    const row = target.closest('.mrow');
    if (!row) return;
    const box = this._s.msgs.get(tid);
    const m = box?.list.find(x => x.id === row.dataset.mid);
    if (!m) return;
    const me = this._s.me;
    const tpage = this._stack.find(p => p.type === 'thread' && p.data.tid === tid);
    const tt = this._s.threads.get(tid);
    const mine = m.sender === me;
    const live = !m.pending && m.type !== 'system';
    const att = target.closest('[data-view],[data-file],[data-mid-att],.audio');
    const aid = att?.dataset.view || att?.dataset.file || att?.dataset.aid || att?.dataset.midAtt;
    const gone = aid && (this._missing.has(aid) || m.attachments.find(x => x.id === aid)?.removed);
    const ai = this._s.ai || {};
    const onText = m.text && !aid && !m.pending;
    const starred = tt?.starred?.includes(m.id), pinned = tt?.pinned_messages?.some(p => p.id === m.id);
    const canEdit = mine && (m.type || 'text') === 'text' && m.text && !m.pending && Date.now() - m.ts < 15 * 60000 && (m.edits?.length || 0) < 5;
    const audio = (m.attachments || []).find(x => (x.mime || '').startsWith('audio/') && !x.removed);

    // Grouped like Apple Messages: what you do most, then sharing, then folders, then Delete
    const quick = [], share = [], addTo = [], more = [], danger = [];
    if (live) quick.push({ text: 'Reply', value: 'reply', icon: XICON.reply });
    if (m.text) quick.push({ text: 'Copy', value: 'copy', icon: ICON.copy });
    if (canEdit) quick.push({ text: 'Edit', value: 'edit', icon: XICON.edit });
    // like Apple Messages: Undo Send for two minutes after sending
    if (mine && !m.pending && Date.now() - m.ts < 120000) quick.push({ text: 'Undo Send', value: 'unsend', icon: ICON.undo });
    // a friendly follow-up about this message, worded to suit it
    if (mine && live && (tt?.participants || []).some(p => p !== me && p !== HA_ID)) quick.push({ text: 'Send a Nudge', value: 'nudge', icon: ICON.bell });
    if (live && !['poll', 'checkin', 'checklist', 'event', 'call'].includes(m.type) && !m.view_once) share.push({ text: 'Forward…', value: 'forward', icon: MICON.fwd });
    // Remind Me Later: the conversation comes back to the top, unread, at the time you choose
    if (live) {
      const rem = (tt?.reminders || []).find(r => r.message_id === m.id);
      share.push(rem ? { text: 'Reminder', icon: REMIND_ICON, sub: [{ header: `Remind me ${this._remindWhen(rem.at)}` }, ...this._remindItems().filter(x => !x.sep), { sep: true }, { text: 'Cancel Reminder', value: 'remind:off', icon: ICON.x, red: true }] }
        : { text: 'Remind Me', icon: REMIND_ICON, sub: this._remindItems() });
    }
    if (live && tt?.is_group && !mine && m.sender !== HA_ID) share.push({ text: 'Reply Privately', value: 'private', icon: MICON.privately });
    if (aid && !gone) share.push({ text: 'Save', value: 'save', icon: ICON.download });
    // AI: turn a message into a calendar event or a reminder
    if (onText && ai.actions) addTo.push({ text: 'Calendar', full: 'Add to Calendar', value: 'event', icon: ICON.cal }, { text: 'Reminders', full: 'Add Reminder', value: 'reminder', icon: ICON.todo });
    if (onText && ai.translate) more.push(this._translations.has(m.id) ? { text: 'Show Original', value: 'untranslate', icon: ICON.globe } : { text: 'Translate', value: 'translate', icon: ICON.globe });
    if (live) {
      more.push({ text: 'Add Sticker', value: 'sticker', icon: XICON.sticker },
        { text: pinned ? 'Unpin' : 'Pin', value: 'pinmsg', icon: XICON.pushpin },
        { text: starred ? 'Unstar' : 'Star', value: 'star', icon: starred ? MICON.starFill : MICON.star });
      if (mine && (tt?.participants || []).some(p => p !== me && p !== HA_ID)) more.push({ text: 'Info', value: 'info', icon: MICON.info });
    }
    danger.push({ text: 'Delete', value: 'delete', icon: ICON.trash, red: true });
    // whoever sent a photo or file (or an administrator) can also take it off the server for everyone
    if (aid && !gone && !m.pending && (mine || this._s.isAdmin)) danger.push({ text: 'Remove from Server', value: 'server', icon: ICON.trash, red: true });
    // a folder with just one thing in it shows that thing instead
    const folder = (text, list, icon) => (list.length > 1 ? [{ text, icon, sub: list.map(({ full, ...x }) => x) }]
      : list.map(({ full, ...x }) => ({ ...x, text: full || x.text })));
    const groups = [quick, share, [...folder('Add To', addTo), ...folder('More', more)], danger].filter(g => g.length);
    const items = [];
    if (live) items.push({ reactions: true, current: m.reactions?.[me] });
    groups.forEach((g, i) => { if (i) items.push({ sep: true }); items.push(...g); });
    const v = await this._menu(target.closest('.bub,.media,.filebub,.audio,.xcard,.stkmsg,.linkc') || row, items, { align: mine ? 'right' : 'left' });
    if (typeof v === 'string' && v.startsWith('react:')) {
      let emoji = v.slice(6);
      if (emoji === '+') emoji = await this._pickEmoji();
      if (emoji) this._react(tid, m, emoji);
      return;
    }
    if (v === 'reply') tpage?.composer?.setReply(m);
    if (v?.startsWith?.('remind:')) { this._remindChoice(tid, m, v.slice(7)); return; }
    if (v === 'nudge') { this._sendMessage(tid, this._nudgeText(tid, m), [], { reply_to: m.id }); this._toast('Nudge sent'); }
    if (v === 'star') this._ws('star', { thread_id: tid, message_id: m.id, on: !tt?.starred?.includes(m.id) }).catch(err => this._toast(err.message));
    if (v === 'pinmsg') this._ws('pin_message', { thread_id: tid, message_id: m.id, on: !tt?.pinned_messages?.some(p => p.id === m.id) }).catch(err => this._toast(err.message));
    if (v === 'forward') this._openForward(tid, m);
    if (v === 'private') this._replyPrivately(tid, m);
    if (v === 'info') this._openInfo(tid, m);
    if (v === 'edit') tpage?.composer?.startEdit(m);
    if (v === 'sticker') this._openStickers({ tid, place: m });
    if (v === 'copy') { try { await navigator.clipboard.writeText(m.text); this._toast('Copied'); } catch (e) { this._toast('Copy not available here'); } }
    if (v === 'save') { const a = m.attachments.find(x => x.id === aid); this._saveAttachment(aid, a?.name); }
    if (v === 'unsend') {
      try { await this._ws('unsend', { thread_id: tid, message_id: m.id }); } catch (err) { this._toast(err.message); }
    }
    if (v === 'delete') this._deleteFromMessage(tid, m, aid ? [aid] : (m.attachments?.length ? ['text'] : null));
    if (v === 'server') this._removeFromServer(tid, m, aid);
    if (v === 'translate') this._aiTranslate(tid, m);
    if (v === 'untranslate') { this._translations.delete(m.id); this._refresh('messages', tid); }
    if (v === 'event' || v === 'reminder') this._aiAddFrom(tid, m, v);
  }

  // Send a Nudge: a follow-up that quotes your message, worded for what it is and whether it's been seen
  _nudgeText(tid, m) {
    const s = this._s, t = s.threads.get(tid);
    const others = (t?.participants || []).filter(p => p !== s.me && p !== HA_ID);
    const seen = others.length && others.every(p => (t.read?.[p] || 0) >= m.ts);
    const group = others.length > 1;
    const a = (m.attachments || []).find(x => !x.removed);
    const kind = (a?.mime || '').startsWith('image/') ? 'photo' : (a?.mime || '').startsWith('video/') ? 'video' : (a?.mime || '').startsWith('audio/') ? 'audio' : a ? 'file' : '';
    const text = (m.text || '').trim();
    const pick = list => list[Math.floor(Math.random() * list.length)];
    if (m.type === 'poll') return pick(['🗳️ Don’t forget to vote!', '🗳️ Quick nudge – your vote’s still needed!']);
    if (m.type === 'event') return pick(['📅 Can you let me know if you’re coming?', '📅 Just a nudge – are you able to make it?']);
    if (m.type === 'checklist') return '✅ Just a reminder about the list!';
    if (m.type === 'location') return seen ? '📍 Just checking you saw where I am' : '📍 Did you see my location?';
    if (m.type === 'timer') return '⏰ Just a nudge about the timer!';
    if (m.type === 'game') return '🎮 Your move!';
    if (m.type === 'checkin') return '👋 Just letting you know I checked in';
    if (kind && !text) return seen ? `👋 What did you think of the ${kind}?` : `👋 Did you get the ${kind} I sent?`;
    if (/\?\s*[\p{Extended_Pictographic}\s]*$/u.test(text)) {
      return seen ? pick(['👋 Just nudging you about my question 🙂', '👋 Any thoughts on this?', group ? '👋 Any thoughts, anyone?' : '👋 When you get a sec…'])
        : pick(['👋 Did you see my question?', '👋 Just checking you got my question 🙂']);
    }
    return seen ? pick(['👋 Just a little nudge about this 🙂', '👋 Any thoughts?', '👋 Nudge nudge 😊'])
      : pick(['👋 Did you get my message?', '👋 Just checking you saw this 🙂']);
  }

  async _removeFromServer(tid, m, aid) {
    const a = m.attachments.find(x => x.id === aid);
    const what = (a?.mime || '').startsWith('image/') ? 'photo' : (a?.mime || '').startsWith('video/') ? 'video' : 'file';
    const r = await this._alert({
      title: 'Remove from Server?',
      message: `This ${what} will be deleted from Home Assistant for everyone in the conversation. A question mark is left in its place. This can’t be undone.`,
      buttons: [{ text: 'Remove', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }],
    });
    if (!r.value) return;
    try { await this._ws('remove_attachment', { thread_id: tid, attachment_id: aid }); this._missing.add(aid); }
    catch (err) { this._toast(err.message); }
  }

  // Delete a whole message, one photo or file, or just the words, for yourself (Apple Messages style).
  // Anything everyone in the chat has deleted is removed from the server.
  async _deleteFromMessage(tid, m, parts) {
    const box = this._s.msgs.get(tid);
    const att = parts && parts[0] !== 'text' ? m.attachments.find(x => x.id === parts[0]) : null;
    // one photo that's the only thing in the message deletes the message
    if (parts && parts[0] !== 'text' && !m.text && (m.attachments || []).length <= 1) parts = null;
    const t = this._s.threads.get(tid);
    const others = (t?.participants || []).filter(p => p !== this._s.me && p !== HA_ID);
    const what = att ? ((att.mime || '').startsWith('image/') ? 'Photo' : (att.mime || '').startsWith('video/') ? 'Video' : 'Attachment') : 'Message';
    const r = await this._alert({
      title: `Delete ${what}?`,
      message: !others.length ? `This ${what.toLowerCase()} will be deleted.`
        : `This ${what.toLowerCase()} will be deleted from your conversation. ${others.length === 1 ? this._userName(others[0], true) + ' will still have it' : 'Others in the conversation will still have it'}.`,
      buttons: [{ text: 'Delete', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }],
    });
    if (!r.value) return;
    // a message that never sent just goes
    if (m.pending) { box.list = box.list.filter(x => x !== m); this._refresh('messages', tid); return; }
    // take it off the screen straight away; the server confirms with a reload
    if (box) {
      if (!parts) box.list = box.list.filter(x => x.id !== m.id);
      else if (parts[0] === 'text') m.text = '';
      else m.attachments = m.attachments.filter(x => !parts.includes(x.id));
      this._refresh('messages', tid);
    }
    try { await this._ws('delete_message', { thread_id: tid, message_id: m.id, ...(parts ? { parts } : {}) }); }
    catch (err) { this._toast(err.message); this._loadMsgs(tid, { reset: true }); }
  }

  _wireLongPress(scope, cb) {
    let timer = null, sx = 0, sy = 0, firedAt = 0;
    const fire = (t) => {
      // the phone may report its own long press as well; one menu is enough
      if (Date.now() - firedAt < 800) return;
      firedAt = Date.now();
      try { window.getSelection()?.removeAllRanges(); } catch (err) { /* */ }
      cb(t);
    };
    scope.addEventListener('pointerdown', (e) => {
      // photos and videos keep the phone's own press-and-hold menu (Save, Share…); use the viewer's bin instead
      const t = e.target.closest('.bub,.media.missing,.filebub,.audio,.xcard,.stkmsg,.linkc,.vo,.callrow');
      if (!t || e.target.closest('a,button')) return;
      sx = e.clientX; sy = e.clientY;
      timer = setTimeout(() => { timer = null; fire(t); }, 420);
    });
    const cancel = () => { clearTimeout(timer); timer = null; };
    scope.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
    scope.addEventListener('pointerup', cancel);
    scope.addEventListener('pointercancel', cancel);
    scope.addEventListener('contextmenu', (e) => {
      const t = e.target.closest('.bub,.media.missing,.filebub,.audio,.xcard,.stkmsg,.linkc,.vo,.callrow');
      if (t) { e.preventDefault(); cancel(); fire(t); }
    });
  }

  async _saveAttachment(aid, name) {
    try {
      const url = await this._media(aid, false);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], name || 'attachment', { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      downloadBlob(blob, name || 'attachment');
    } catch (err) { if (err?.name !== 'AbortError') this._toast('Couldn’t open that attachment'); }
  }

  async _toggleAudio(box) {
    if (!this._audio) {
      this._audio = new Audio();
      this._audio.addEventListener('timeupdate', () => this._audioTick());
      this._audio.addEventListener('ended', () => { this._audioEl?.querySelector('.ap')?.replaceChildren(this._el(ICON.play)); this._audioEl?.querySelectorAll('.bars i').forEach(i => i.classList.remove('on')); this._audioEl = null; });
    }
    const aid = box.dataset.aid;
    if (this._audioAid === aid && !this._audio.paused) { this._audio.pause(); box.querySelector('.ap').innerHTML = ICON.play; return; }
    if (this._audioAid !== aid) {
      this._audioAid = aid;
      try { this._audio.src = box.dataset.local || await this._media(aid, false); } catch (e) { this._toast('Couldn’t play that message'); return; }
    }
    this._audioEl = box;
    box.querySelector('.ap').innerHTML = ICON.pause;
    this._audio.playbackRate = this._audioRate || 1;
    this._audio.play().catch(() => {});
  }
  _audioTick() {
    const box = this._audioEl, a = this._audio;
    if (!box || !box.isConnected) return;
    const dur = a.duration && isFinite(a.duration) ? a.duration : parseFloat(box.dataset.dur) || 1;
    const bars = box.querySelectorAll('.bars i');
    const n = Math.round((a.currentTime / dur) * bars.length);
    bars.forEach((b, i) => b.classList.toggle('on', i < n));
    box.querySelector('.at').textContent = fmtDur(dur - a.currentTime);
  }

  async _openViewer(aid, tid, { once = false } = {}) {
    const box = this._s.msgs.get(tid);
    let a = null, m = null;
    for (const x of box?.list || []) { const f = (x.attachments || []).find(y => y.id === aid); if (f) { a = f; m = x; break; } }
    if (!a) return;
    const video = (a.mime || '').startsWith('video/');
    if (this._missing.has(aid) || a.removed) { this._toast('This photo is no longer available'); return; }
    const v = this._el(`<div class="viewer">
      <div class="top"><button class="cb g" data-a="close" aria-label="Close">${ICON.x}</button><div class="title" style="color:#fff;font-size:15px">${esc(this._userName(m.sender))}<div style="font-size:12px;font-weight:400;opacity:.7;text-align:center">${esc(fmtListDate(m.ts, this._hass))}</div></div><div style="width:44px"></div></div>
      ${once || m.view_once ? '' : `<div class="vbar"><button class="cb g" data-a="save" aria-label="Share or Save">${ICON.share}</button>${this._s.ai?.photos && !video ? `<button class="pill g vdesc" data-a="desc">${ICON.caption}<span>Describe</span></button>` : '<span></span>'}<button class="cb g" data-a="del" aria-label="Delete">${ICON.trash}</button></div>`}
      ${video ? '<video controls playsinline autoplay></video>' : '<img alt="">'}
    </div>`);
    this._root.appendChild(v);
    const media = v.querySelector('img,video');
    const local = a._localFull || (video ? null : a._local);
    if (once) { media.style.webkitTouchCallout = 'none'; media.addEventListener('contextmenu', ev => ev.preventDefault()); }
    const loaded = local ? (media.src = local, Promise.resolve()) : this._media(aid, false).then(u => { media.src = u; }).catch((err) => {
      if (!this._isGone(err)) { this._toast('Couldn’t load that attachment'); return; }
      this._missing.add(aid);
      media.replaceWith(this._el(`<div class="missing-img viewer-missing" role="img" aria-label="Not available">${MISSING_Q}<span>No longer available</span></div>`));
      this._refresh('messages', tid);
    });
    v.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-a]')?.dataset.a;
      if (act === 'close' || e.target === v) { media.pause?.(); v.remove(); }
      if (act === 'save') this._saveAttachment(aid, a.name);
      if (act === 'desc') {
        // a description of the photo from the AI, shown along the bottom
        let cap = v.querySelector('.vcap');
        if (cap) { cap.remove(); return; }
        cap = this._el(`<div class="vcap g"><div class="vcap-h">${ICON.caption}<b>Description</b></div><div class="vcap-t sel">Looking at the photo…</div></div>`);
        v.appendChild(cap);
        const known = this._captions.get(aid);
        if (known) { cap.querySelector('.vcap-t').textContent = known; return; }
        try {
          const r = await this._ws('ai', { action: 'describe', thread_id: tid, attachment_id: aid });
          this._captions.set(aid, r.result || '');
          cap.querySelector('.vcap-t').textContent = r.result || 'No description.';
        } catch (err) { cap.querySelector('.vcap-t').textContent = this._aiError(err, 'Couldn’t describe this photo just now. Try again in a moment.'); }
        return;
      }
      if (act === 'del') {
        const canServer = m.sender === this._s.me || this._s.isAdmin;
        const pick = canServer
          ? await this._menu(e.target.closest('button'), [
              { text: 'Delete', value: 'me', icon: ICON.trash, red: true },
              { text: 'Remove from Server', value: 'server', icon: ICON.trash, red: true },
            ], { align: 'right' })
          : 'me';
        if (!pick) return;
        media.pause?.(); v.remove();
        if (pick === 'me') this._deleteFromMessage(tid, m, [aid]);
        else this._removeFromServer(tid, m, aid);
      }
    });
    // View Once: the picture has to arrive before it's marked as opened
    if (once) await loaded;
  }

  // ── Composer (thread + New Message) ────────────────────────────────────────
  _makeComposer({ threadId, draftKey, onSend, onTyping, ensureThread, plain }) {
    const s = this._s;
    const inThread = !!threadId();
    const el = this._el(`<div class="composer">
      <div class="ai-chips" hidden></div>
      <div class="mentsug" hidden></div>
      <div class="fmtbar g" hidden></div>
      <div class="cbars"></div>
      <div class="cbanner g" hidden></div>
      <div class="crow">
        <button class="cb g" data-c="plus" aria-label="Attach">${ICON.plus}</button>
        ${inThread || ensureThread ? `<button class="cb g" data-c="apps" aria-label="Add to Message: stickers, polls, location and more">${XICON.apps}</button>` : ''}
        <div class="field g"><div class="stage"></div><div class="inrow"><div class="rbslot"></div><button class="fbtn aa" data-c="fmt" aria-label="Text Effects" hidden>Aa</button><button class="fbtn ai-w" data-c="write" aria-label="Writing Tools" hidden>${ICON.pen}</button><button class="fbtn send" data-c="action"></button></div></div>
      </div>
      <input type="file" class="f-any" multiple hidden>
    </div>`);
    // the message box shows Bold, Italic, Underline and Strikethrough as you type
    // On an iPhone or iPad, formatting comes from the phone's own menu (select words → Format);
    // Aa still opens the card's bar (it has Strikethrough too)
    const nativeFmt = isApple() && coarse();
    const ta = makeRichBox({ placeholder: 'Message', enterkeyhint: this._config.enter_sends !== false && !coarse() ? 'send' : 'enter', native: nativeFmt });
    el.querySelector('.rbslot').replaceWith(ta.el);
    const stage = el.querySelector('.stage'), action = el.querySelector('[data-c="action"]'), crow = el.querySelector('.crow');
    const chipsEl = el.querySelector('.ai-chips'), writeBtn = el.querySelector('[data-c="write"]'), field = el.querySelector('.field');
    let staged = [], beforeRewrite = null;
    // something from the Apps screen (a sticker, poll, location…) waiting in the message box until Send
    let appItem = null;
    // Reply, Edit, text styles and @mentions
    let reply = null, editing = null, fmtOpen = false, selOn = false, fmtShut = null;
    const mentions = new Map();
    const banner = el.querySelector('.cbanner'), fmtbar = el.querySelector('.fmtbar'), mentsug = el.querySelector('.mentsug');
    const aaBtn = el.querySelector('[data-c="fmt"]');
    let typingTimer = null, typingOn = false, lastTyping = 0;
    const draft = draftKey ? s.drafts.get(draftKey) : null;
    if (draft) { ta.value = draft.text || ''; staged = draft.staged || []; ta.spans = draft.spans || []; }

    // the box grows by itself (up to a limit set in the styles)
    const autosize = () => {};
    const updateAction = () => {
      const hasContent = ta.value.trim() || staged.length || appItem;
      // Writing Tools appear once there's something to rewrite
      writeBtn.hidden = !(s.ai?.writing && ta.value.trim().length >= 3) || !!editing;
      // Text Effects and Send stay put whether or not anything's been typed.
      // The Home Assistant chat is plain text: no apps or Text Effects there.
      const isPlain = !!plain?.();
      // Aa only shows while words are selected
      aaBtn.hidden = isPlain || !(fmtOpen || selOn);
      const appsBtn = el.querySelector('[data-c="apps"]'); if (appsBtn) appsBtn.hidden = isPlain;
      if (isPlain && (fmtOpen || ta.spans.length)) { fmtOpen = false; ta.spans = []; fmtbar.hidden = true; }
      aaBtn.classList.toggle('on', fmtOpen);
      if (ta.value.trim()) chipsEl.hidden = true;
      action.hidden = false;
      action.className = `fbtn send${hasContent || editing ? '' : ' dim'}`;
      action.setAttribute('aria-disabled', hasContent || editing ? 'false' : 'true');
      if (editing) { action.innerHTML = ICON.check; action.setAttribute('aria-label', 'Save Edit'); }
      else { if (!action.querySelector('svg') || action._icon !== 'up') { action.innerHTML = ICON.up; action._icon = 'up'; } action.setAttribute('aria-label', 'Send (press and hold for effects and Send Later)'); }
      if (editing) action._icon = 'check';
    };
    const renderStage = () => {
      stage.innerHTML = (appItem ? `<div class="st st-app" data-k="app"><span class="sai" style="background:${appItem.bg || 'var(--cm-accent)'}">${appItem.icon || ''}</span><div class="sat"><b>${esc(appItem.label)}</b>${appItem.sub ? `<span>${esc(appItem.sub)}</span>` : ''}</div><button class="stx" aria-label="Remove">${ICON.x}</button></div>` : '') + staged.map(x => `<div class="st${x.status === 'error' ? ' err' : ''}" data-k="${x.key}">${x.preview ? `<img src="${esc(x.preview)}" alt="">${(x.mime || '').startsWith('image/') && x.status !== 'uploading' ? '<span class="mk">Markup</span>' : ''}` : `<div class="fname">${esc(x.name)}</div>`}<button class="stx" aria-label="Remove">${ICON.x}</button>${x.status === 'uploading' ? `<div class="prog"><i style="width:${Math.round((x.progress || 0) * 100)}%"></i></div>` : ''}</div>`).join('');
      updateAction();
    };
    const typing = (active) => {
      if (!onTyping) return;
      if (active) {
        const now = Date.now();
        if (!typingOn || now - lastTyping > 4000) { onTyping(true); lastTyping = now; typingOn = true; }
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => typing(false), 5000);
      } else if (typingOn) { typingOn = false; clearTimeout(typingTimer); onTyping(false); }
    };

    const addFiles = async (files) => {
      const maxB = (s.limits.max_upload_mb || 300) * 1048576;
      for (const file of files) {
        if (file.size > maxB * 1.6 || (!file.type.startsWith('image/') && file.size > maxB)) { this._toast(`${file.name} is too large (max ${s.limits.max_upload_mb} MB)`); continue; }
        const item = { key: uid8(), name: file.name || 'attachment', mime: file.type || 'application/octet-stream', size: file.size, status: 'uploading', progress: 0 };
        staged.push(item);
        renderStage();
        item.promise = this._prepareAndUpload(file, item, threadId(), () => renderStage());
        item.promise.then(() => renderStage(), () => renderStage());
      }
    };

    const thread = () => s.threads.get(threadId());
    const doSend = async (opts = {}) => {
      const text = ta.value.trim();
      if (editing) {
        const m = editing;
        if (!text) { this._toast('A message can’t be empty'); return; }
        const tid = threadId();
        const sp = trimSpans(ta.value, ta.spans);
        endEdit(false);
        if (text === m.text && JSON.stringify(sp) === JSON.stringify(m.spans || [])) return;
        try { await this._ws('edit', { thread_id: tid, message_id: m.id, text, spans: sp }); }
        catch (err) { this._toast(err.message); }
        return;
      }
      if (!text && !staged.length && !appItem) return;
      if (staged.some(x => x.status === 'uploading')) {
        action.disabled = true;
        await Promise.allSettled(staged.map(x => x.promise));
        action.disabled = false;
      }
      if (staged.some(x => x.status === 'error')) { this._toast('Remove the attachments that couldn’t upload, then try again'); return; }
      const out = staged;
      const extra = {};
      if (reply?._ext) extra.reply_ext = { thread_id: reply._ext, message_id: reply.id };
      else if (reply) extra.reply_to = reply.id;
      if (opts.view_once) extra.view_once = true;
      if (opts.effect) extra.effect = opts.effect;
      if (opts.ttl) extra.ttl = opts.ttl;
      const sp = trimSpans(ta.value, ta.spans);
      if (sp.length) extra.spans = sp;
      const ments = [...mentions].filter(([, name]) => text.includes('@' + name)).map(([uid]) => uid);
      if (ments.length) extra.mentions = ments;
      const app = appItem; appItem = null;
      staged = []; ta.value = ''; beforeRewrite = null; chipsEl.hidden = true; mentions.clear(); reply = null;
      fmtOpen = false; renderExtras(); autosize(); renderStage(); typing(false);
      if (draftKey) { s.drafts.delete(draftKey); this._storeDrafts(); }
      if (app) {
        // the app's message goes first (with the reply, and the effect when there's nothing else to send)
        const only = !text && !out.length;
        const ax = { ...app.extra };
        ['reply_to', 'reply_ext'].forEach(k => { if (extra[k]) { ax[k] = extra[k]; delete extra[k]; } });
        if (only && extra.effect) ax.effect = extra.effect;
        const later = opts.at || opts.place || null;
        try { await this._ws('send', { thread_id: threadId(), text: app.text || '', extra: ax, ...(later ? this._laterArgs(later) : {}) }); }
        catch (err) { this._toast(err.message); appItem = app; renderStage(); return; }
        if (only) { if (later) this._toast(this._laterText(later)); return; }
      }
      await onSend(text, out, extra, opts.at || opts.place || null);
    };
    // the styles, moved to the trimmed text that's actually sent
    const trimSpans = (raw, list) => {
      const lead = raw.length - raw.trimStart().length, len = raw.trim().length;
      return list.map(x => ({ s: clamp(x.s - lead, 0, len), e: clamp(x.e - lead, 0, len), style: x.style })).filter(x => x.e > x.s);
    };

    // ── Reply and Edit banners ──
    const renderExtras = () => {
      const who = (m) => (m.sender === s.me ? 'Yourself' : this._userName(m.sender, true));
      if (editing) banner.innerHTML = `<div class="cbt"><b>Editing Message</b><span>${esc(editing.text)}</span></div><button data-c="xbanner" aria-label="Cancel">${ICON.x}</button>`;
      else if (reply) banner.innerHTML = `<div class="cbt"><b>${reply._ext ? `Replying privately to ${esc(who(reply))} · ${esc(reply._from || 'group')}` : `Replying to ${esc(who(reply))}`}</b><span>${esc(this._previewText({ last: reply }) || '')}</span></div><button data-c="xbanner" aria-label="Cancel">${ICON.x}</button>`;
      banner.hidden = !editing && !reply;
      // the formatting bar (the styles show in the message box itself)
      fmtbar.hidden = !fmtOpen;
      if (fmtOpen) {
        const [a, b] = selRange();
        // just Bold, Italic, Underline and Strikethrough, like Apple Messages (older animated styles still show on messages)
        fmtbar.innerHTML = TEXT_STYLES.slice(0, 4).map(st => `<button data-style="${st.id}" class="fb-${st.id}${covered(st.id, a, b) ? ' on' : ''}" aria-label="${esc(st.label)}" aria-pressed="${covered(st.id, a, b)}">${esc(st.name)}</button>`).join('');
      }
      updateAction();
    };
    // the words selected in the box ([a, a] when nothing is)
    const selRange = () => {
      if (!ta.hasSelection()) return [0, 0];
      return [ta.selectionStart ?? 0, ta.selectionEnd ?? 0];
    };
    const covered = (style, a, b) => {
      if (a >= b) return false;
      const spans = ta.spans;
      for (let i = a; i < b; i++) if (!spans.some(x => x.style === style && x.s <= i && x.e > i)) return false;
      return true;
    };
    const toggleStyle = (style) => {
      const [a, b] = selRange();
      if (a >= b) return;
      const on = covered(style, a, b);
      // take this style off the chosen text, then put it back on if it wasn't all there already
      const out = [];
      for (const x of ta.spans) {
        if (x.style !== style || x.e <= a || x.s >= b) { out.push(x); continue; }
        if (x.s < a) out.push({ ...x, e: a });
        if (x.e > b) out.push({ ...x, s: b });
      }
      if (!on) out.push({ s: a, e: b, style });
      ta.spans = out;
      // done: the bar closes and the cursor goes to the end of those words, ready for plain text
      fmtOpen = false; selOn = false;
      if (ta.hasSelection()) ta.setSelectionRange(b, b);
      renderExtras();
    };
    const endEdit = (restore = true) => {
      if (!editing) return;
      editing = null; ta.value = restore ? (el._preEdit?.text || '') : ''; if (restore && el._preEdit?.spans) ta.spans = el._preEdit.spans; fmtOpen = false;
      autosize(); renderExtras();
    };
    // @mentions in group chats
    const renderMentions = () => {
      const t = thread();
      const caret = ta.selectionStart ?? ta.value.length;
      const mm = t?.is_group ? /(^|\s)@([^\s@]*)$/.exec(ta.value.slice(0, caret)) : null;
      if (!mm) { mentsug.hidden = true; return; }
      const q = mm[2].toLowerCase();
      const people = t.participants.filter(p => p !== s.me && p !== HA_ID)
        .map(p => ({ id: p, short: this._userName(p, true), full: this._userName(p) }))
        .filter(x => !q || x.full.toLowerCase().split(/\s+/).some(w => w.startsWith(q)) || x.short.toLowerCase().startsWith(q));
      mentsug.hidden = !people.length;
      this._set(mentsug, people.map(x => `<button class="g" data-mention="${esc(x.id)}">${this._userAv(x.id, 26)}${esc(x.full)}</button>`).join(''));
    };

    el.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-c]')?.dataset.c;
      const rm = e.target.closest('.stx');
      if (rm) {
        const k = rm.closest('.st').dataset.k;
        if (k === 'app') { appItem = null; renderStage(); return; }
        const it = staged.find(x => x.key === k);
        staged = staged.filter(x => x.key !== k);
        it?.xhr?.abort();
        if (it?.id) this._ws('discard_upload', { attachment_id: it.id }).catch(() => {});
        renderStage();
        return;
      }
      // + goes straight to the phone's own picker (Photo Library, Take Photo or Video, Choose Files)
      if (c === 'plus') { el.querySelector('.f-any').click(); return; }
      if (c === 'apps') {
        // in New Message, the conversation is started first, then the apps open in it
        if (!threadId() && ensureThread) { const r = await ensureThread(api); if (r) setTimeout(() => this._openApps(r.tid, r.composer), 420); return; }
        this._openApps(threadId(), api);
        return;
      }
      if (c === 'xbanner') { if (editing) endEdit(true); else { reply = null; renderExtras(); } return; }
      if (c === 'fmt') {
        // the formatting bar is for words you've selected
        const [a, b] = selRange();
        // tapping Aa again puts the bar away (and it stays away for these words)
        if (fmtOpen) { fmtOpen = false; fmtShut = `${a},${b}`; renderExtras(); return; }
        if (a >= b) { this._toast('Select some words first'); return; }
        fmtOpen = true; fmtShut = null; renderExtras();
        return;
      }
      const fs = e.target.closest('[data-style]');
      if (fs) { toggleStyle(fs.dataset.style); return; }
      const mn = e.target.closest('[data-mention]');
      if (mn) {
        const uid = mn.dataset.mention, short = this._userName(uid, true);
        const caret = ta.selectionStart ?? ta.value.length;
        const typed = /@([^\s@]*)$/.exec(ta.value.slice(0, caret));
        ta.focus();
        ta.replaceRange(typed ? caret - typed[0].length : caret, caret, `@${short} `, { styleFrom: false });
        mentions.set(uid, short);
        mentsug.hidden = true;
        updateAction(); renderExtras();
        return;
      }
      // tap a photo waiting to be sent to draw on it
      const mk = e.target.closest('.st');
      if (mk && !e.target.closest('.stx')) {
        const it = staged.find(x => x.key === mk.dataset.k);
        if (it && (it.mime || '').startsWith('image/') && it.status !== 'uploading' && (it.fullUrl || it.preview)) {
          this._openSketch({ bg: it.fullUrl || it.preview, onDone: (file) => {
            staged = staged.filter(x => x !== it);
            if (it.id) this._ws('discard_upload', { attachment_id: it.id }).catch(() => {});
            renderStage();
            addFiles([file]);
          } });
        }
        return;
      }
      if (c === 'write') { writingTools(e.target.closest('button')); return; }
      const chip = e.target.closest('[data-chip]');
      if (chip) { ta.value = chip.dataset.chip; chipsEl.hidden = true; autosize(); updateAction(); ta.focus(); return; }
      if (c === 'action') {
        if (sendHeld) { sendHeld = false; return; }
        if (!action.classList.contains('dim')) doSend();
      }
    });
    // press and hold Send for effects and Send Later
    let sendHeld = false, holdTimer = null;
    action.addEventListener('pointerdown', () => {
      if (action.classList.contains('dim') || editing) return;
      holdTimer = setTimeout(() => { holdTimer = null; sendHeld = true; this._chooseEffect(action, api, true); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => action.addEventListener(ev, () => { clearTimeout(holdTimer); holdTimer = null; }));
    action.addEventListener('contextmenu', (e) => { if (action.classList.contains('dim') || editing) return; e.preventDefault(); sendHeld = true; this._chooseEffect(action, api, true); });
    // keep the formatting bar's buttons from taking the focus (and the selection) away
    fmtbar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    fmtbar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    // tapping Aa keeps the words you've selected selected
    aaBtn.addEventListener('pointerdown', (e) => e.preventDefault());
    aaBtn.addEventListener('mousedown', (e) => e.preventDefault());
    mentsug.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    el.querySelectorAll('input[type=file]').forEach(inp => inp.addEventListener('change', () => { addFiles([...inp.files]); inp.value = ''; }));
    // what you've typed is kept as you go, so it's still there if the app is closed or reloaded
    let draftT = null;
    const saveSoon = () => { clearTimeout(draftT); draftT = setTimeout(() => api.saveDraft(), 400); };
    ta.addEventListener('input', () => {
      saveSoon();
      updateAction(); renderMentions();
      if (fmtOpen) renderExtras();
      if (ta.value.trim() && !editing) typing(true);
    });
    // the B / I / U / S buttons light up for the words you've selected
    let selT = null;
    // selecting words brings up the formatting bar by itself (not on an iPhone or iPad, where the
    // phone's own menu has Format); nothing selected, it goes away
    const selChanged = () => {
      if (!ta.hasSelection() || plain?.() || ta.el.getRootNode().activeElement !== ta.el) return;
      clearTimeout(selT);
      selT = setTimeout(() => {
        const [a, b] = selRange();
        const want = a < b;
        if (want !== selOn) { selOn = want; updateAction(); }
        // put away with Aa: don't bring it back until different words are selected
        if (fmtShut === `${a},${b}` && want) return;
        fmtShut = null;
        if (nativeFmt && want && !fmtOpen) { renderExtras(); return; }
        if (want === fmtOpen && !want) return;
        fmtOpen = want;
        renderExtras();
      }, 120);
    };
    document.addEventListener('selectionchange', selChanged);
    ta.addEventListener('blur', () => {
      typing(false); api.saveDraft();
      // leaving the box puts the formatting bar away
      setTimeout(() => {
        const act = ta.el.getRootNode().activeElement;
        if (act === ta.el) return;
        selOn = false;
        if (fmtOpen) { fmtOpen = false; renderExtras(); } else updateAction();
      }, 150);
    });
    ta.addEventListener('keydown', (e) => {
      // Ctrl/⌘ + B, I or U on a keyboard style the selected words
      const short = (e.ctrlKey || e.metaKey) && !e.altKey && { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()];
      if (short) { e.preventDefault(); if (!plain?.()) toggleStyle(short); return; }
      if (e.key === 'Escape' && (editing || reply)) { e.preventDefault(); if (editing) endEdit(true); else { reply = null; renderExtras(); } return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && this._config.enter_sends !== false && !coarse()) { e.preventDefault(); doSend(); }
    });
    ta.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) { e.preventDefault(); addFiles(files); }
    });
    ta.addEventListener('drop', (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (files.length) { e.preventDefault(); addFiles(files); }
    });

    // Writing Tools (Apple Intelligence style): rewrite what you've typed before sending
    const writingTools = async (btn) => {
      const items = [
        { text: 'Proofread', value: 'proofread', icon: ICON.check },
        { text: 'Make Friendlier', value: 'friendly', icon: ICON.bubble },
        { text: 'Make Shorter', value: 'shorter', icon: ICON.shorter },
        { text: 'Make More Formal', value: 'formal', icon: ICON.doc },
        { text: 'Make More Casual', value: 'casual', icon: ICON.smile },
      ];
      if (beforeRewrite !== null) items.push({ sep: true }, { text: 'Undo Rewrite', value: 'undo', icon: ICON.undo });
      const style = await this._menu(btn, items, { align: 'right', above: true });
      if (!style) return;
      if (style === 'undo') { ta.value = beforeRewrite; beforeRewrite = null; autosize(); updateAction(); return; }
      const original = ta.value;
      field.classList.add('ai-busy'); ta.readOnly = true;
      try {
        const r = await this._ws('ai', { action: 'rewrite', text: original, style });
        if (r.result && ta.value === original) { beforeRewrite = original; ta.value = r.result; }
      } catch (err) { this._toast(this._aiError(err, 'Writing Tools aren’t available right now. Try again in a moment.')); }
      field.classList.remove('ai-busy'); ta.readOnly = false;
      autosize(); updateAction(); ta.focus();
    };

    requestAnimationFrame(autosize);
    renderStage();
    renderExtras();
    const api = {
      refresh: () => updateAction(),
      setReply: (m) => { if (editing) endEdit(true); reply = m; renderExtras(); ta.focus(); },
      startEdit: (m) => {
        if (!editing) el._preEdit = { text: ta.value, spans: ta.spans };
        reply = null; editing = m;
        ta.value = m.text || ''; ta.spans = (m.spans || []).map(x => ({ ...x }));
        autosize(); renderExtras(); ta.focus();
        try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* */ }
      },
      addFiles,
      // suggested replies above the message box
      setChips: (list) => {
        const show = list?.length && !ta.value.trim() && !staged.length;
        chipsEl.hidden = !show;
        this._set(chipsEl, show ? list.map(x => `<button class="g" data-chip="${esc(x)}">${esc(x)}</button>`).join('') : '');
      },
      isEmpty: () => !ta.value.trim() && !staged.length && !appItem,
      // put something from the Apps screen in the message box; it's sent with the next Send
      stageApp: (item) => { appItem = item; renderStage(); if (!coarse()) ta.focus(); },
      refreshTools: updateAction,
      el,
      focus: () => ta.focus(),
      setPlaceholder: (v) => { ta.placeholder = v; },
      typingStop: () => typing(false),
      saveDraft: () => { if (draftKey && !editing) { if (ta.value.trim() || staged.length) s.drafts.set(draftKey, { text: ta.value, staged, spans: ta.spans }); else s.drafts.delete(draftKey); this._storeDrafts(); } },
      setBars: (html) => this._set(el.querySelector('.cbars'), html),
      // hands over what's been typed (used when New Message becomes a conversation)
      takeDraft: () => {
        const d = { text: ta.value, staged, spans: ta.spans };
        staged = []; ta.value = '';
        autosize(); renderStage(); renderExtras();
        return d;
      },
      hasPhotos: () => staged.length > 0 && staged.every(x => /^(image|video)\//.test(x.mime || '')),
      destroy: () => { typing(false); document.removeEventListener('selectionchange', selChanged); },
      hasContent: () => !!(ta.value.trim() || staged.length),
      send: doSend,
    };
    return api;
  }

  async _prepareAndUpload(file, item, threadId, onProgress) {
    const type = file.type || '';
    let body = file, thumb = null;
    try {
      if (/^image\/(jpeg|png|webp|heic|heif)$/.test(type)) {
        const full = await resizeToBlob(file, 2048, 0.86);
        item.width = full.width; item.height = full.height;
        if (file.size > 1.5 * 1048576 || Math.max(full.width, full.height) > 2560 || /heic|heif/.test(type)) {
          body = new File([full.blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
          item.width = full.outW; item.height = full.outH;
        }
        thumb = (await resizeToBlob(file, 520, 0.8)).blob;
      } else if (type === 'image/gif') {
        const img = await loadImage(URL.createObjectURL(file));
        item.width = img.naturalWidth; item.height = img.naturalHeight;
      } else if (type.startsWith('video/')) {
        const v = await videoInfo(file);
        thumb = v.thumb || null; item.width = v.width; item.height = v.height; item.duration = v.duration;
      }
    } catch (e) { /* send the original */ }
    item.mime = body.type || item.mime;
    item.size = body.size;
    item.name = body.name || item.name;
    if (thumb) item.preview = URL.createObjectURL(thumb);
    else if (type.startsWith('image/')) item.preview = URL.createObjectURL(body);
    if (type.startsWith('image/')) item.fullUrl = URL.createObjectURL(body);
    onProgress();

    const max = (this._s.limits.max_upload_mb || 300) * 1048576;
    if (body.size > max) { item.status = 'error'; this._toast(`${file.name} is too large (max ${this._s.limits.max_upload_mb} MB)`); throw new Error('too large'); }
    const fd = new FormData();
    fd.append('file', body, body.name || 'attachment');
    if (thumb) fd.append('thumb', thumb, 'thumb.jpg');
    if (threadId) fd.append('thread_id', threadId);
    if (item.width) fd.append('width', String(Math.round(item.width)));
    if (item.height) fd.append('height', String(Math.round(item.height)));
    if (item.duration) fd.append('duration', String(item.duration));
    if (this._hass.auth?.expired) await this._hass.auth.refreshAccessToken();
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      item.xhr = xhr;
      xhr.open('POST', this._hass.hassUrl('/api/crow_messenger/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${this._hass.auth.data.access_token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) { item.progress = e.loaded / e.total; onProgress(); } };
      xhr.onload = () => {
        let json = {};
        try { json = JSON.parse(xhr.responseText); } catch (e) { /* */ }
        if (xhr.status === 200) resolve(json); else reject(new Error(json.message || `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new Error('Cancelled'));
      xhr.send(fd);
    }).catch((err) => { item.status = 'error'; if (err.message !== 'Cancelled') this._toast(err.message); throw err; });
    Object.assign(item, { id: result.id, status: 'done', progress: 1, mime: result.mime, size: result.size, width: result.width ?? item.width, height: result.height ?? item.height });
    return item;
  }

  // ── New Message sheet ──────────────────────────────────────────────────────
  _openCompose(prefill = []) {
    const s = this._s;
    const wrap = this._el(`<div class="sheet-wrap"><div class="sheet">
      <div class="grab"></div>
      <div class="shead"><div style="width:44px"></div><h3>New Message</h3><button class="cb g" data-a="close" aria-label="Cancel">${ICON.x}</button></div>
      <div class="to-field"><span class="lbl">To:</span><span class="chips" style="display:contents"></span><input type="text" autocomplete="off" enterkeyhint="next"><button class="addbtn" data-a="all" aria-label="Choose people">${ICON.plus}</button></div>
      <div class="gname" hidden><input type="text" placeholder="Group Name (optional)" maxlength="80"></div>
      <div class="suggest"></div>
      <div class="cprev" hidden><div class="msgs"></div></div>
    </div></div>`);
    const sheet = wrap.querySelector('.sheet');
    const prev = wrap.querySelector('.cprev'), prevMsgs = prev.querySelector('.msgs');
    let prevTid = null;
    // the conversation you already have with exactly these people (as Home Assistant will reuse it)
    const existing = () => {
      if (!chosen.length) return null;
      const want = [...new Set([...chosen, s.me])].sort().join('|');
      return [...s.threads.values()].find(t => [...new Set(t.participants)].sort().join('|') === want) || null;
    };
    // show it, like iMessage does, above the message box
    const showPrev = (show) => {
      const t = show ? existing() : null;
      prev.hidden = !t; sug.hidden = !!t;
      if (!t) { prevTid = null; return; }
      const fresh = prevTid !== t.id;
      prevTid = t.id;
      const box = s.msgs.get(t.id);
      if (!box?.loaded) this._loadMsgs(t.id).then(() => { if (prevTid === t.id && !prev.hidden) { prevMsgs._cmHtml = null; showPrev(true); } }).catch(() => {});
      this._applyPageTheme(prev, t.id);
      if (this._set(prevMsgs, this._msgsHtml(t.id))) { this._hydrate(prevMsgs); this._hydrateExtras(prevMsgs); }
      if (fresh || box?.loaded) requestAnimationFrame(() => { prev.scrollTop = prev.scrollHeight; });
    };
    const chipsEl = wrap.querySelector('.chips'), input = wrap.querySelector('.to-field input'), sug = wrap.querySelector('.suggest'), gname = wrap.querySelector('.gname');
    let chosen = [...prefill], chipSel = null, browse = false;
    // only people in your contacts can be messaged: add someone to Contacts first
    // (you're always there too, so you can message yourself to test notifications)
    const people = () => [...s.users.values()].filter(u => u.id === s.me || this._contactForUser(u.id)).map(u => {
      const me = u.id === s.me;
      const c = me ? null : this._contactForUser(u.id);
      const name = me ? `${this._userName(u.id)} (You)` : this._userName(u.id);
      return { id: u.id, name, contact: me || !!c, keys: `${name} ${u.name || ''} ${u.ha_name || ''}${me ? ' me you myself' : ''}`.toLowerCase(),
        sub: me ? 'Message yourself' : c ? (u.ha_name && u.ha_name !== name ? u.ha_name : (u.is_admin ? 'Administrator' : 'Home Assistant user')) : 'Not in Contacts' };
    }).concat(s.ai?.assistant ? [{ id: HA_ID, name: 'Home Assistant', contact: true, keys: 'home assistant ha assist ai', sub: 'Ask about or control your home' }] : [])
      .sort((a, b) => (b.contact - a.contact) || a.name.localeCompare(b.name));
    const render = () => {
      chipsEl.innerHTML = chosen.map(id => `<span class="chip${chipSel === id ? ' sel' : ''}" data-id="${esc(id)}">${esc(this._userName(id))}</span>`).join('');
      gname.hidden = chosen.length < 2;
      const q = input.value.trim().toLowerCase();
      const words = q.split(/\s+/).filter(Boolean);
      // people only appear once you start typing a name (or tap + to browse your contacts)
      const list = q || browse ? people().filter(p => words.every(w => p.keys.includes(w))) : [];
      const row = p => `<div class="srow" data-id="${esc(p.id)}">${this._userAv(p.id, 40)}<div><div class="sn">${esc(p.name)}</div><div class="ss">${esc(p.sub)}</div></div>${chosen.includes(p.id) ? `<span class="ck">${ICON.check}</span>` : ''}</div>`;
      const mine = list.filter(p => p.contact), others = list.filter(p => !p.contact);
      const noContacts = !people().some(p => p.id !== s.me);
      const hint = `<div class="empty" style="padding:30px">Add people to your Contacts to message them.<br><button data-a="tocontacts" style="margin-top:12px;color:var(--cm-accent);font-size:15px;font-weight:600">Open Contacts</button></div>`;
      sug.innerHTML = list.length
        ? (mine.length && others.length ? `<div class="sh">Contacts</div>` : '') + mine.map(row).join('')
          + (others.length ? `<div class="sh">${mine.length ? 'Others in Your Home' : 'People in Your Home'}</div>` + others.map(row).join('') : '')
          + (noContacts && !q ? hint : '')
        : noContacts && (q || browse) ? hint
          : (q ? `<div class="empty" style="padding:30px">No one in your Contacts called “${esc(input.value.trim())}”.</div>` : '');
      composer.setPlaceholder(chosen.length > 1 ? 'Message the group' : 'Message');
      composer.refresh();
      showPrev(!q && !browse);
    };
    const composer = this._makeComposer({
      threadId: () => null,
      draftKey: null,
      plain: () => chosen.includes(HA_ID),
      onSend: async (text, staged, extra, at) => {
        if (!chosen.length) { this._toast('Choose who to send this to'); return; }
        try {
          const r = await this._ws('create_thread', { participants: chosen, name: chosen.length > 1 ? wrap.querySelector('.gname input').value.trim() : '' });
          // a conversation you deleted earlier comes back as soon as you write to it
          this._upsertThread({ ...r.thread, visible: true });
          close();
          this._openThread(r.thread.id, { anim: true });
          await this._sendMessage(r.thread.id, text, staged, extra, at);
        } catch (err) { this._toast(err.message || 'Couldn’t start that conversation'); }
      },
      ensureThread: async (api) => {
        if (!chosen.length) { this._toast('Choose who to send this to first'); return null; }
        try {
          const r = await this._ws('create_thread', { participants: chosen, name: chosen.length > 1 ? wrap.querySelector('.gname input').value.trim() : '' });
          this._upsertThread({ ...r.thread, visible: true });
          // anything typed so far carries on in the conversation
          const d = api.takeDraft();
          if (d.text.trim() || d.staged.length) s.drafts.set(r.thread.id, d);
          close();
          this._openThread(r.thread.id, { anim: true });
          const page = this._stack.find(p => p.type === 'thread' && p.data.tid === r.thread.id);
          return page ? { tid: r.thread.id, composer: page.composer } : null;
        } catch (err) { this._toast(err.message || 'Couldn’t start that conversation'); return null; }
      },
    });
    composer.el.style.position = 'absolute';
    sheet.appendChild(composer.el);
    const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 420); };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) { close(); return; }
      // tapping the conversation opens it properly, carrying on with anything typed
      if (prevTid && e.target.closest('.cprev')) {
        const tid = prevTid, d = composer.takeDraft?.();
        if (d && (d.text.trim() || d.staged.length)) s.drafts.set(tid, d);
        close(); this._openThread(tid, { anim: true });
        return;
      }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') { close(); return; }
      if (a === 'all') { browse = !browse; render(); input.focus(); return; }
      if (a === 'tocontacts') { close(); this._nav('contacts'); return; }
      const chip = e.target.closest('.chip');
      if (chip) { chipSel = chipSel === chip.dataset.id ? null : chip.dataset.id; render(); input.focus(); return; }
      const row = e.target.closest('.srow');
      if (row) {
        const id = row.dataset.id;
        chosen = chosen.includes(id) ? chosen.filter(x => x !== id) : [...chosen, id];
        input.value = ''; chipSel = null; browse = false; render();
        if (!coarse()) composer.focus();
      }
    });
    input.addEventListener('input', () => { chipSel = null; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && chosen.length) {
        if (chipSel) { chosen = chosen.filter(x => x !== chipSel); chipSel = null; }
        else chipSel = chosen[chosen.length - 1];
        render();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = sug.querySelector('.srow');
        if (first && input.value.trim()) first.click(); else composer.focus();
      }
    });
    this._root.appendChild(wrap);
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
    setTimeout(() => (chosen.length ? composer : input).focus(), 380);
  }

  // ── Page: conversation details ─────────────────────────────────────────────
  _pg_info({ tid }) {
    const el = this._el(`<div class="infopg">
      <div class="scroll"><div class="ipage"></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div></div></div>
      <input type="file" accept="image/*" class="f-gp" hidden>
      <input type="file" accept="image/*" class="f-bg" hidden>
    </div>`);
    const page = { el };
    const s = this._s, body = el.querySelector('.ipage');
    let bgKey = tid;
    el.querySelector('.f-bg').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        this._toast('Setting background…');
        const image = await fileToBackground(f);
        await this._ws('background/set', { key: bgKey, image });
        this._toast(bgKey === '*' ? 'Background set for all chats' : 'Background set for this chat');
      } catch (err) { this._toast(err.message || 'Couldn’t use that picture'); }
    });
    page.refresh = (what, which) => {
      if (which && which !== tid && !['all', 'contacts', 'background', 'theme', 'states'].includes(what)) return;
      const t = s.threads.get(tid);
      if (!t) return;
      this._applyPageTheme(el, tid);
      const other = this._other(tid);
      const contact = other && this._contactForUser(other);
      // Find My: where they are now, from their Home Assistant person
      const mapOn = this._config.show_people_map !== false;
      const person = mapOn && other && other !== HA_ID ? this._people().find(p => p.uid === other) : null;
      const findRow = person ? `<div class="gr" data-a="findmy"><span class="gi">${ICON.pin}</span><div class="gl">Find Me</div><span class="gv" style="font-size:15px;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(this._placeLabel(person))}</span><span class="gch">${ICON.chevR}</span></div>` : '';
      const bgVal = this._bgFor(tid);
      const thVal = this._themeFor(tid);
      const thObj = COLOUR_THEMES.find(x => x.id === thVal);
      const swatch = thObj && thObj.accent ? `<span class="th-dots"><i style="background:${thObj.sent}"></i><i style="background:${thObj.recv}"></i></span>` : '';
      const members = [...t.participants].sort((a, b) => (a === s.me) - (b === s.me) || this._userName(a).localeCompare(this._userName(b)));
      this._set(body, `
        <div class="ghead">${this._threadAv(t, 92)}
          <div class="gtitle">${esc(this._threadTitle(t))}</div>
          ${t.is_group ? `<button class="glink" data-a="rename">Change Name and Photo</button>` : (other && other !== HA_ID ? `<div class="gsub">${esc(s.users.get(other)?.ha_name || '')}</div>` : '')}
        </div>
        ${t.is_group ? `<div class="group-h">${members.length} People</div><div class="group">
          ${members.map(p => `<div class="gr av-row" data-member="${esc(p)}">${this._userAv(p, 36)}<div class="gl">${esc(this._userName(p))}${p === s.me ? ' <span style="color:var(--cm-text2)">(You)</span>' : ''}</div>${p !== s.me && p !== HA_ID ? `<span class="gch">${ICON.chevR}</span>` : ''}</div>`).join('')}
          <div class="gr blue" data-a="add"><span class="gi">${ICON.addPerson}</span><div class="gl">Add People</div></div>
          ${mapOn ? `<div class="gr" data-a="findall"><span class="gi">${ICON.pin}</span><div class="gl">Find Everyone</div><span class="gv" style="font-size:15px"></span><span class="gch">${ICON.chevR}</span></div>` : ''}
        </div>` : (other && other !== HA_ID ? `<div class="group">
          ${contact ? `<div class="gr" data-a="contact"><span class="gi">${ICON.contacts}</span><div class="gl">Contact Card</div><span class="gch">${ICON.chevR}</span></div>`
            : `<div class="gr" data-a="addcontact"><span class="gi">${ICON.addPerson}</span><div class="gl">Add to Contacts</div><span class="gch">${ICON.chevR}</span></div>`}
          ${findRow}
          <div class="gr" data-a="addgroup"><span class="gi">${ICON.people}</span><div class="gl">Add People (New Group)</div><span class="gch">${ICON.chevR}</span></div>
        </div>` : '')}
        <div class="group-h">Chat Background</div>
        <div class="group">
          <div class="gr" data-a="bg"><span class="gi">${ICON.photo}</span><div class="gl">${bgVal ? 'Change Background' : 'Choose Background'}</div><span class="gv" style="font-size:15px">${esc(this._bgLabel(bgVal))}</span><span class="gch">${ICON.chevR}</span></div>
          <div class="gr" data-a="theme"><span class="gi">${ICON.palette}</span><div class="gl">Theme</div>${swatch}<span class="gv" style="font-size:15px">${esc(this._themeName(thVal))}</span><span class="gch">${ICON.chevR}</span></div>
        </div>
        <div style="font-size:13px;color:var(--cm-text2);margin:-8px 18px 18px;line-height:1.35">Only you see your chat backgrounds and themes.</div>
        ${this._pdfOn('conversations') ? `<div class="group"><div class="gr" data-a="pdf"><span class="gi">${ICON.doc}</span><div class="gl">Export as PDF</div><span class="gch">${ICON.chevR}</span></div></div>` : ''}
        <div class="group">
          <div class="gr" data-a="media"><span class="gi">${MICON.photos}</span><div class="gl">Photos, Links &amp; Files</div><span class="gch">${ICON.chevR}</span></div>
          <div class="gr" data-a="tsearch"><span class="gi">${MICON.search}</span><div class="gl">Search in Conversation</div><span class="gch">${ICON.chevR}</span></div>
          <div class="gr" data-a="jumpdate"><span class="gi">${XICON.clock}</span><div class="gl">Jump to Date</div><span class="gch">${ICON.chevR}</span></div></div>
        <div class="group"><div class="gr" data-a="mutemenu"><span class="gi">${ICON.bellOff}</span><div class="gl">Hide Alerts</div><span class="gv" style="font-size:15px">${esc(this._muteLabel(t))}</span><span class="gch">${ICON.chevR}</span></div>
          <div class="gr" data-a="nick"><span class="gi">${MICON.nick}</span><div class="gl">Nicknames</div><span class="gv" style="font-size:15px">${Object.keys(t.nicknames || {}).length || ''}</span><span class="gch">${ICON.chevR}</span></div>
          <label class="gr"><span class="gi">${XICON.pushpin}</span><div class="gl">Pin Conversation</div><span class="tsw"><input type="checkbox" data-a="pin" ${t.pinned ? 'checked' : ''}><span></span></span></label>
          ${t.disappear ? `<div class="gr" data-a="disappear"><span class="gi">${XICON.timer}</span><div class="gl">Disappearing Messages</div><span class="gv" style="font-size:15px">${esc(DISAPPEAR.find(d => d.v === t.disappear)?.name || 'On')}</span><span class="gch">${ICON.chevR}</span></div>` : ''}</div>
        <div style="font-size:13px;color:var(--cm-text2);margin:-8px 18px 18px;line-height:1.35">${t.disappear ? 'Every message in this conversation disappears after it’s read. Turn this off and use Disappearing on the send button for single messages instead.' : 'To send a message that disappears after it’s read, press and hold the send button and choose Disappearing.'}</div>
        <div class="group">
          ${t.is_group ? `<div class="gr red" data-a="leave"><div class="gl">Leave this Conversation</div></div>` : ''}
          <div class="gr red" data-a="delete"><div class="gl">Delete Conversation</div></div>
        </div>`);
    };
    el.addEventListener('change', (e) => {
      if (e.target.dataset.a === 'mute') this._ws('update_thread', { thread_id: tid, muted: e.target.checked }).catch(err => this._toast(err.message));
      if (e.target.dataset.a === 'pin') this._ws('flag', { thread_id: tid, flag: 'pinned', on: e.target.checked }).catch(err => { e.target.checked = !e.target.checked; this._toast(err.message); });
    });
    el.querySelector('.f-gp').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { const photo = await fileToAvatar(f); await this._ws('update_thread', { thread_id: tid, photo }); } catch (err) { this._toast(err.message || 'Couldn’t use that photo'); }
    });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      const t = s.threads.get(tid);
      if (a === 'back') { this._back(); return; }
      if (a === 'contact') { const c = this._contactForUser(this._other(tid)); if (c) this._nav('contact', { cid: c.id }); return; }
      if (a === 'addcontact') { this._addContactFor(this._other(tid)); return; }
      if (a === 'addgroup') { this._openCompose([this._other(tid)]); return; }
      if (a === 'findmy') { const p = this._people().find(x => x.uid === this._other(tid)); this._nav('people', p ? { focus: p.eid } : {}); return; }
      if (a === 'findall') { this._nav('people'); return; }
      if (a === 'theme') { this._nav('theme', { tid }); return; }
      if (a === 'pdf') { this._nav('pdfOptions', { tid }); return; }
      if (a === 'disappear') { this._chooseDisappear(e.target.closest('.gr'), tid); return; }
      if (a === 'mutemenu') { this._chooseMute(e.target.closest('.gr'), tid); return; }
      if (a === 'nick') { this._chooseNickname(e.target.closest('.gr'), tid); return; }
      if (a === 'media') { this._nav('media', { tid }); return; }
      if (a === 'tsearch') { this._nav('tsearch', { tid }); return; }
      if (a === 'jumpdate') { this._openJumpDate(tid); return; }
      if (a === 'rename') {
        const r = await this._alert({
          title: 'Change Name and Photo', input: { value: t.name || '', placeholder: 'Group Name' },
          buttons: [{ text: 'Save Name', style: 'ok', value: 'save' }, { text: 'Choose Photo…', style: 'cancel', value: 'photo' }, ...(t.photo ? [{ text: 'Remove Photo', style: 'cancel', value: 'rmphoto' }] : []), { text: 'Cancel', style: 'cancel' }],
        });
        if (r.value === 'save') this._ws('update_thread', { thread_id: tid, name: r.input }).catch(err => this._toast(err.message));
        if (r.value === 'photo') el.querySelector('.f-gp').click();
        if (r.value === 'rmphoto') this._ws('update_thread', { thread_id: tid, photo: null }).catch(err => this._toast(err.message));
        return;
      }
      if (a === 'add') {
        const choices = [...s.users.values()].filter(u => !t.participants.includes(u.id));
        if (!choices.length) { this._toast('Everyone is already in this conversation'); return; }
        const v = await this._menu(e.target.closest('.gr'), [{ header: 'Add to the conversation' }, ...choices.map(u => ({ text: this._userName(u.id), value: u.id, icon: ICON.person }))], { align: 'left' });
        if (v) this._ws('update_thread', { thread_id: tid, add: [v] }).catch(err => this._toast(err.message));
        return;
      }
      if (a === 'leave') {
        const r = await this._alert({ title: 'Leave this Conversation?', message: 'You won’t get any more messages from this group.', buttons: [{ text: 'Leave', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }] });
        if (r.value) { try { await this._ws('leave_thread', { thread_id: tid }); } catch (err) { this._toast(err.message); } }
        return;
      }
      if (a === 'delete') { this._confirmDeleteThread(tid); return; }
      if (a === 'bg') {
        const items = [
          { text: 'Photo for This Chat…', value: 'this', icon: ICON.photo },
          { text: 'Photo for All Chats…', value: 'all', icon: ICON.bubble },
          { sep: true }, { text: 'Live Wallpaper…', value: 'live', icon: ICON.wallpaper },
        ];
        const v = await this._menu(e.target.closest('.gr'), items, { align: 'left' });
        if (v === 'this' || v === 'all') { bgKey = v === 'all' ? '*' : tid; el.querySelector('.f-bg').click(); }
        if (v === 'live') this._nav('live', { tid });
        return;
      }
      const mem = e.target.closest('[data-member]')?.dataset.member;
      if (mem && mem !== s.me && mem !== HA_ID) {
        const c = this._contactForUser(mem);
        if (c) this._nav('contact', { cid: c.id });
        else {
          // someone who isn't in your contacts has to be added before you can message them
          const v = await this._menu(e.target.closest('.gr'), [{ text: 'Add to Contacts', value: 'add', icon: ICON.addPerson }], { align: 'left' });
          if (v === 'add') this._addContactFor(mem);
        }
      }
    });
    return page;
  }

  // ── Overlays: alert, menu, toast ───────────────────────────────────────────
  _alert({ title, message, input, buttons }) {
    return new Promise((resolve) => {
      const back = this._el(`<div class="crow-ios-backdrop"><div class="crow-ios-alert" role="alertdialog">
        ${title ? `<div class="crow-ios-title">${esc(title)}</div>` : ''}
        ${message ? `<div class="crow-ios-msg">${esc(message)}</div>` : ''}
        ${input ? `<input class="crow-ios-input" type="text" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}">` : ''}
        <div class="crow-ios-btns">${buttons.map((b, i) => {
          const cls = b.style === 'cancel' ? 'crow-ios-cancel' : `crow-ios-ok${b.style === 'destructive' ? ' destructive' : ''}`;
          // a real link, so the tap itself opens Mail / Phone / FaceTime (iOS ignores links opened after the popup closes)
          return b.href ? `<a data-i="${i}" class="${cls}" href="${esc(b.href)}"${linkTarget(b.href) ? ' target="_blank"' : ''} rel="noopener">${esc(b.text)}</a>`
            : `<button data-i="${i}" class="${cls}">${esc(b.text)}</button>`;
        }).join('')}</div>
      </div></div>`);
      this._root.appendChild(back);
      this._root.classList.add('alerting');
      requestAnimationFrame(() => back.classList.add('visible'));
      const inp = back.querySelector('input');
      if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 60);
      const done = (b) => {
        back.classList.remove('visible');
        if (this._root.querySelectorAll('.crow-ios-backdrop').length <= 1) this._root.classList.remove('alerting');
        setTimeout(() => back.remove(), 220);
        resolve({ value: b?.value, input: inp?.value ?? null });
      };
      back.addEventListener('click', (e) => {
        const i = e.target.closest('button, a[data-i]')?.dataset.i;
        if (i !== undefined) { try { buttons[+i].onTap?.(); } catch (err) { /* */ } done(buttons[+i]); }
        else if (e.target === back) done(buttons.find(b => b.style === 'cancel' && b.value === undefined) || null);
      });
      inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(buttons.find(b => b.style !== 'cancel') || buttons[0]); } });
    });
  }

  _menu(anchor, items, { align = 'right', above = false } = {}) {
    // An item with `sub` is a folder: tapping it shows its items in the same popup,
    // with "‹ Name" at the top to go back.
    const rowsHtml = (list, back) => {
      // when any item can be ticked, every item keeps the tick column so the text lines up
      const ticks = list.some(it => it.checked !== undefined);
      return (back ? `<button class="mback" data-back="1">${ICON.back}<span>${esc(back)}</span></button><div class="msep"></div>` : '')
        + list.map((it, i) => it.reactions
        ? `<div class="tb-row">${TAPBACKS.map(e => `<button data-r="${esc(e)}" class="${it.current === e ? 'on' : ''}" aria-label="${esc(e)}">${tbFace(e)}</button>`).join('')}<button class="more${it.current && !TAPBACKS.includes(it.current) ? ' on' : ''}" data-r="+" aria-label="More">${it.current && !TAPBACKS.includes(it.current) ? `<span style="font-size:23px">${esc(it.current)}</span>` : XICON.smilePlus}</button></div><div class="msep"></div>`
        : it.header ? `<div class="mh">${esc(it.header)}</div>`
        : it.sep ? '<div class="msep"></div>'
          : `<button data-i="${i}" class="${it.red ? 'red' : ''}${it.sub ? ' mfolder' : ''}">${ticks ? `<span class="mc">${it.checked ? ICON.check : ''}</span>` : ''}<span>${esc(it.text)}</span>${it.icon ? `<span class="mi">${it.icon}</span>` : ''}${it.sub ? `<span class="mchev">${ICON.chevR}</span>` : ''}</button>`).join('');
    };
    return new Promise((resolve) => {
      const wrap = this._el(`<div class="menu-wrap"><div class="menu" role="menu">${rowsHtml(items)}</div></div>`);
      this._root.appendChild(wrap);
      const menu = wrap.querySelector('.menu');
      const rr = this._root.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      let cur = items, folder = null;
      const place = () => {
        menu.style.maxHeight = `${rr.height - 20}px`; menu.style.overflowY = 'auto';
        const mw = menu.offsetWidth, mh = menu.offsetHeight;
        let left = align === 'right' ? ar.right - rr.left - mw : ar.left - rr.left;
        left = clamp(left, 10, rr.width - mw - 10);
        let top = above ? ar.top - rr.top - mh - 8 : ar.bottom - rr.top + 8;
        if (top + mh > rr.height - 10) top = Math.max(10, ar.top - rr.top - mh - 8);
        if (top < 10) top = 10;
        menu.style.left = `${left}px`; menu.style.top = `${top}px`;
        menu.style.transformOrigin = `${align === 'right' ? 'right' : 'left'} ${above ? 'bottom' : 'top'}`;
      };
      // a folder keeps the popup the same width, so it doesn't jump about
      const show = (list, back) => {
        const w = menu.offsetWidth;
        cur = list; folder = back;
        menu.innerHTML = rowsHtml(list, back);
        menu.style.minWidth = `${w}px`;
        menu.scrollTop = 0;
        place();
      };
      place();
      // only a tap that starts once the menu is open counts: lifting the finger that opened it
      // (a press and hold) mustn't close it again straight away
      let armed = false;
      wrap.addEventListener('pointerdown', () => { armed = true; });
      wrap.addEventListener('click', (e) => {
        if (!armed && e.detail !== 0) return;
        const r = e.target.closest('[data-r]')?.dataset.r;
        if (r) { wrap.remove(); resolve(r === '+' ? 'react:+' : `react:${r}`); return; }
        if (e.target.closest('[data-back]')) { show(items, null); return; }
        const i = e.target.closest('button')?.dataset.i;
        const it = i !== undefined ? cur[+i] : null;
        if (it?.sub) { show(it.sub, it.text); return; }
        if (!it && e.target.closest('.menu')) return;   // tapped a heading or the gap between rows
        wrap.remove();
        resolve(it ? it.value : null);
      });
      void folder;
    });
  }

  _toast(text) {
    this._root.querySelector('.toast')?.remove();
    const t = this._el(`<div class="toast g">${esc(text)}</div>`);
    // with a sheet open, the message shows just under its header, by the button you pressed
    // (the top of the card can be off the screen, or under the keyboard, on a phone)
    const sheets = this._root.querySelectorAll('.xs-wrap.show .xsheet');
    const sheet = sheets[sheets.length - 1];
    if (sheet && !this._root.querySelector('.fm-zwrap')) {
      const top = sheet.getBoundingClientRect().top - this._root.getBoundingClientRect().top;
      if (top > 0) t.style.top = `${Math.round(top + 62)}px`;
    }
    this._root.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
}

// ── Rich message box ──────────────────────────────────────────────────────────
// An editable box that shows Bold, Italic, Underline and Strikethrough as you
// type, like Apple Messages. It keeps the text and its styles as plain text plus
// "spans" ({s, e, style}) — the same shape that's sent with a message — and has
// the parts of a <textarea> the message box uses (value, selectionStart/End,
// setSelectionRange, focus, readOnly, placeholder), so the rest of the composer
// barely needs to know it isn't one.
const RB_LOOK = { bold: 'font-weight:700', italic: 'font-style:italic' };
const RB_LINE = { underline: 'underline', strike: 'line-through' };

function makeRichBox({ placeholder = '', enterkeyhint = 'enter', native = false } = {}) {
  const el = document.createElement('div');
  el.className = 'rbox';
  // On an iPhone or iPad ("native"), the box is a normal rich box, so the phone's own menu
  // offers Format → Bold / Italic / Underline; the card picks those styles up. Elsewhere it's
  // "plaintext-only" and the card's own formatting bar does the styling.
  let mode = 'true';
  if (!native) {
    try { el.contentEditable = 'plaintext-only'; mode = el.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; } catch (e) { mode = 'true'; }
  }
  el.contentEditable = mode;
  el.setAttribute('role', 'textbox');
  el.setAttribute('aria-multiline', 'true');
  el.setAttribute('enterkeyhint', enterkeyhint);
  el.setAttribute('autocapitalize', 'sentences');
  el.spellcheck = true;
  el.dataset.placeholder = placeholder;

  let text = '', spans = [], lastSel = [0, 0];

  // ── text + spans → the box ──
  const render = () => {
    const cuts = new Set([0, text.length]);
    spans.forEach(x => { cuts.add(x.s); cuts.add(x.e); });
    const pts = [...cuts].filter(p => p >= 0 && p <= text.length).sort((a, b) => a - b);
    let html = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], seg = esc(text.slice(a, b));
      const st = [...new Set(spans.filter(x => x.s <= a && x.e >= b).map(x => x.style))];
      if (!st.length) { html += seg; continue; }
      const lines = st.filter(x => RB_LINE[x]).map(x => RB_LINE[x]);
      const css = st.filter(x => RB_LOOK[x]).map(x => RB_LOOK[x]).concat(lines.length ? [`text-decoration:${lines.join(' ')}`] : []).join(';');
      html += `<span data-st="${st.join(',')}" style="${css}">${seg}</span>`;
    }
    // On an iPhone, typed text is never touched while you type (that upsets autocorrect), so
    // when the text ends in styled words an invisible plain spot follows them: carry on typing
    // there and it's plain. (It isn't part of the text: it's skipped when reading the box.)
    if (native && spans.some(x => x.e === text.length)) html += '\u200b';
    // a line ending in a new line needs something after it to show the empty line
    if (text.endsWith('\n')) html += '<br data-s="1">';
    el.innerHTML = html;
    el.classList.toggle('rb-empty', !text);
  };

  // ── the box → text + spans (also understands the iPhone's own B / I / U menu) ──
  const BLOCK = /^(DIV|P|LI|H\d)$/;
  const read = (root) => {
    let out = '';
    const marks = [];
    const walk = (node, st) => {
      if (node.nodeType === 3) {
        const v = node.data.replace(/ /g, ' ').replace(/​/g, '');
        out += v;
        for (let k = 0; k < v.length; k++) marks.push(st);
        return;
      }
      if (node.nodeType !== 1 && node.nodeType !== 11) return;
      if (node.nodeName === 'BR') {
        if (node.dataset?.s) return;
        // the browser's own end-of-box line break
        if (!node.nextSibling && node.parentNode === root && (!out || out.endsWith('\n'))) return;
        out += '\n'; marks.push(st); return;
      }
      let my = st;
      if (node.nodeType === 1) {
        const add = new Set(st);
        (node.dataset?.st || '').split(',').filter(Boolean).forEach(x => add.add(x));
        const tag = node.nodeName, cs = node.style || {};
        if (tag === 'B' || tag === 'STRONG' || /bold|[6-9]00/.test(cs.fontWeight || '')) add.add('bold');
        if (tag === 'I' || tag === 'EM' || cs.fontStyle === 'italic') add.add('italic');
        const deco = `${cs.textDecoration || ''} ${cs.textDecorationLine || ''}`;
        if (tag === 'U' || /underline/.test(deco)) add.add('underline');
        if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(deco)) add.add('strike');
        my = add.size === st.size ? st : add;
        if (BLOCK.test(tag) && out && !out.endsWith('\n')) { out += '\n'; marks.push(st); }
      }
      node.childNodes.forEach(c => walk(c, my));
    };
    walk(root, new Set());
    // per-character styles back into spans
    const sp = [];
    const open = new Map();
    for (let i = 0; i <= marks.length; i++) {
      const cur = marks[i] || new Set();
      for (const [style, start] of [...open]) if (!cur.has(style)) { sp.push({ s: start, e: i, style }); open.delete(style); }
      for (const style of cur) if (!open.has(style)) open.set(style, i);
    }
    return { text: out, spans: sp.sort((a, b) => a.s - b.s) };
  };

  // ── where the caret is, as a position in the text ──
  const rangeIn = () => {
    const root = el.getRootNode();
    const sel = (root.getSelection && root.getSelection()) || document.getSelection();
    if (!sel) return null;
    if (sel.getComposedRanges) {
      try {
        const r = sel.getComposedRanges(root instanceof ShadowRoot ? { shadowRoots: [root] } : undefined)[0];
        if (r && el.contains(r.startContainer) && el.contains(r.endContainer)) return r;
      } catch (e) { /* older browser */ }
    }
    if (sel.rangeCount) {
      const r = sel.getRangeAt(0);
      if (el.contains(r.startContainer) && el.contains(r.endContainer)) return r;
    }
    return null;
  };
  const posOf = (node, off) => {
    const r = document.createRange();
    r.setStart(el, 0);
    try { r.setEnd(node, off); } catch (e) { return text.length; }
    return Math.min(text.length, read(r.cloneContents()).text.length);
  };
  const sel = () => {
    const r = rangeIn();
    if (!r) return lastSel;
    const a = posOf(r.startContainer, r.startOffset), b = posOf(r.endContainer, r.endOffset);
    lastSel = [Math.min(a, b), Math.max(a, b)];
    return lastSel;
  };
  const pointAt = (pos) => {
    // our own rendering is just text, styled spans, the invisible plain spot and the end <br>
    const nodes = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) nodes.push(n);
    let left = pos;
    for (let i = 0; i < nodes.length; i++) {
      const t = nodes[i], len = t.data.replace(/​/g, '').length;
      // at the very end of styled words, go past them into the plain spot
      const next = nodes[i + 1];
      if (left === len && next && /^​/.test(next.data)) { left = 0; continue; }
      if (left <= len) {
        const zw = t.data.indexOf('​');
        return [t, zw >= 0 && zw <= left ? Math.min(t.data.length, left + 1) : left];
      }
      left -= len;
    }
    const last = nodes[nodes.length - 1];
    return last ? [last, last.data.length] : [el, el.childNodes.length && el.lastChild.nodeName === 'BR' ? el.childNodes.length - 1 : el.childNodes.length];
  };
  const setSel = (a, b = a) => {
    a = clamp(a, 0, text.length); b = clamp(b, 0, text.length);
    lastSel = [a, b];
    const root = el.getRootNode();
    const s = (root.getSelection && root.getSelection()) || document.getSelection();
    if (!s) return;
    const [n1, o1] = pointAt(a), [n2, o2] = pointAt(b);
    try { s.setBaseAndExtent(n1, o1, n2, o2); } catch (e) { /* not focused */ }
  };

  // keep the styles on the right words when text is replaced in code (mentions, new lines)
  const replaceRange = (a, b, str, { styleFrom = true } = {}) => {
    const delta = str.length - (b - a), after = a + str.length;
    // starts at or inside the replaced text move past the new text; ends there take the new
    // text in only when it should carry on the style before it (styleFrom)
    const mapS = (p) => (p < a ? p : p > b ? p + delta : after);
    const mapE = (p) => (p < a ? p : p > b ? p + delta : (styleFrom ? after : a));
    spans = spans.map(x => ({ ...x, s: mapS(x.s), e: mapE(x.e) })).filter(x => x.e > x.s);
    text = text.slice(0, a) + str + text.slice(b);
    render();
    setSel(a + str.length);
  };

  const dirty = () => !!el.querySelector('b,strong,i,em,u,s,strike,del,div,p,font,li,h1,h2,h3')
    || [...el.querySelectorAll('br[data-s]')].some(br => br !== el.lastChild)
    || (text.endsWith('\n') && !(el.lastChild?.nodeName === 'BR' && el.lastChild.dataset?.s));

  el.addEventListener('input', (e) => {
    const r = read(el);
    text = r.text; spans = r.spans;
    el.classList.toggle('rb-empty', !text);
    // tidy up what the browser added (its own bold/italic tags, line <div>s) once the word's finished
    if (!e.isComposing && e.inputType !== 'insertCompositionText' && dirty()) {
      const [a, b] = sel(); render(); setSel(a, b);
    }
    if (!text && el.innerHTML) el.innerHTML = '';
  });
  // The card turns text selection off everywhere else, which stops the iPhone selecting a word
  // with a double tap until the box already has the cursor. So the box takes the cursor as
  // soon as a finger touches it, and the second tap selects the word.
  el.addEventListener('touchstart', () => {
    const active = el.getRootNode().activeElement || document.activeElement;
    if (active !== el && el.isContentEditable) el.focus({ preventScroll: true });
  }, { passive: true });
  // Home Assistant's keyboard shortcuts (e for search, c for commands…) don't know this is a
  // place you type, so keys pressed here stay here (Escape still reaches the card)
  ['keydown', 'keypress', 'keyup'].forEach(t => el.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
  // new lines are plain "\n" in the text
  el.addEventListener('beforeinput', (e) => {
    // typing straight after styled words goes back to plain text
    if (!native && e.inputType === 'insertText' && e.data && !e.isComposing) {
      const [a, b] = sel();
      if (a === b && spans.some(x => x.e === a)) {
        e.preventDefault();
        replaceRange(a, b, e.data, { styleFrom: false });
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
      e.preventDefault();
      const [a, b] = sel();
      replaceRange(a, b, '\n');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  // pasted text comes in plain (files are handled by the message box)
  el.addEventListener('paste', (e) => {
    if (e.clipboardData?.files?.length) return;
    const t = e.clipboardData?.getData('text/plain');
    if (t == null) return;
    e.preventDefault();
    const [a, b] = sel();
    replaceRange(a, b, t.replace(/\r\n?/g, '\n'), { styleFrom: false });
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // drops of styled text from elsewhere also come in plain
  el.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) e.preventDefault(); });

  render();
  const box = {
    el,
    get value() { return text; },
    set value(v) { text = String(v ?? '').replace(/\r\n?/g, '\n'); spans = []; render(); if (document.activeElement === el || el.getRootNode().activeElement === el) setSel(text.length); },
    get spans() { return spans.map(x => ({ ...x })); },
    set spans(v) {
      const keep = rangeIn() ? sel() : null;
      spans = (v || []).filter(x => x && x.e > x.s).map(x => ({ s: clamp(x.s, 0, text.length), e: clamp(x.e, 0, text.length), style: x.style })).filter(x => x.e > x.s);
      render();
      if (keep) setSel(keep[0], keep[1]);
    },
    get selectionStart() { return sel()[0]; },
    get selectionEnd() { return sel()[1]; },
    setSelectionRange: (a, b) => setSel(a, b),
    replaceRange,
    hasSelection: () => !!rangeIn(),
    focus: () => { el.focus({ preventScroll: true }); },
    blur: () => el.blur(),
    get readOnly() { return el.contentEditable === 'false'; },
    set readOnly(v) { el.contentEditable = v ? 'false' : mode; },
    get placeholder() { return el.dataset.placeholder; },
    set placeholder(v) { el.dataset.placeholder = v; },
    get isConnected() { return el.isConnected; },
    addEventListener: (...a) => el.addEventListener(...a),
  };
  return box;
}

// ── Apple Messages-style extras: how they look in a conversation ────────────
// Tapbacks, replies, edits, text styles, bubble effects, polls, Check In,
// stickers, shared devices, buttons from automations, link previews, voice
// message speed, disappearing messages and Send Later.
const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];
// a reaction shows as the emoji itself
const tbFace = (e) => `<span class="tbe">${esc(e)}</span>`;
const BUBBLE_FX = [
  { id: 'slam', name: 'Slam' }, { id: 'loud', name: 'Loud' }, { id: 'gentle', name: 'Gentle' }, { id: 'invisible', name: 'Invisible Ink' },
];
const SCREEN_FX = [
  { id: 'confetti', name: 'Confetti' }, { id: 'balloons', name: 'Balloons' }, { id: 'fireworks', name: 'Fireworks' },
  { id: 'hearts', name: 'Love' }, { id: 'lasers', name: 'Lasers' }, { id: 'celebration', name: 'Celebration' },
  { id: 'spotlight', name: 'Spotlight' }, { id: 'echo', name: 'Echo' }, { id: 'shootingstar', name: 'Shooting Star' },
  { id: 'poppers', name: 'Party Poppers' }, { id: 'snow', name: 'Snow' }, { id: 'bubbles', name: 'Bubbles' },
  { id: 'fireflies', name: 'Fireflies' }, { id: 'aurora', name: 'Aurora' }, { id: 'petals', name: 'Petals' },
  { id: 'leaves', name: 'Leaves' }, { id: 'thunder', name: 'Thunderstorm' }, { id: 'halloween', name: 'Halloween' },
];
const TEXT_STYLES = [
  { id: 'bold', name: 'B', label: 'Bold' }, { id: 'italic', name: 'I', label: 'Italic' }, { id: 'underline', name: 'U', label: 'Underline' },
  { id: 'strike', name: 'S', label: 'Strikethrough' },
  { id: 'big', name: 'Big' }, { id: 'small', name: 'Small' }, { id: 'shake', name: 'Shake' }, { id: 'nod', name: 'Nod' },
  { id: 'ripple', name: 'Ripple' }, { id: 'bloom', name: 'Bloom' }, { id: 'jitter', name: 'Jitter' },
];
const ANIM_STYLES = new Set(['shake', 'nod', 'ripple', 'bloom', 'jitter']);
const DISAPPEAR = [
  { v: 0, name: 'Off' }, { v: 3600, name: '1 Hour' }, { v: 86400, name: '1 Day' }, { v: 604800, name: '1 Week' },
];
// The emoji picker (tapbacks and quick reactions)
const EMOJI_SETS = [
  { id: 'smileys', icon: '😀', name: 'Smileys', list: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '😌', '😔', '😪', '😴', '😷', '🤒', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '💀', '💩', '🤡', '👻', '👽', '🤖', '😺', '😸', '😹', '😻', '😼', '🙈', '🙉', '🙊'] },
  { id: 'people', icon: '👋', name: 'People & Hands', list: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '💪', '🦾', '👀', '👁️', '👅', '👄', '🫦', '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵', '🙋', '🙆', '🙅', '🤷', '🤦', '🙇', '💁', '🕺', '💃', '🧘', '🏃', '🚶', '👨‍👩‍👧‍👦', '👪', '💏', '💑', '🤰', '🧑‍🍳', '🧑‍💻', '🧑‍🔧', '🧑‍🎄', '🎅', '🤶', '🦸', '🧙', '🧚', '👑'] },
  { id: 'hearts', icon: '❤️', name: 'Hearts & Symbols', list: ['❤️', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '🩷', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '💭', '💤', '✨', '⭐', '🌟', '⚡', '🔥', '✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '❓', '❗', '‼️', '⁉️', '⚠️', '🚫', '⛔', '🆗', '🆒', '🆕', '🆓', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔶', '🔷', '♻️', '🎵', '🎶', '➡️', '⬅️', '⬆️', '⬇️', '🔁', '🔄'] },
  { id: 'animals', icon: '🐶', name: 'Animals & Nature', list: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐦‍⬛', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐘', '🦒', '🦓', '🐕', '🐈', '🐇', '🦔', '🐾', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍄', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌙', '⭐', '🌍', '☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌩️', '❄️', '☃️', '⛄', '🌬️', '🌈', '☔', '🌊'] },
  { id: 'food', icon: '🍔', name: 'Food & Drink', list: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥕', '🌽', '🌶️', '🥔', '🧄', '🧅', '🍞', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍚', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍿', '🥜', '🍯', '☕', '🍵', '🧃', '🥤', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🧊'] },
  { id: 'activity', icon: '⚽', name: 'Activities', list: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '⛸️', '🎿', '🏂', '🏋️', '🤸', '⛹️', '🏊', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🕹️', '🧩', '🎉', '🎊', '🎈', '🎁', '🎀', '🪅', '🎃', '🎄', '🎆', '🎇', '🧨'] },
  { id: 'travel', icon: '🚗', name: 'Travel & Places', list: ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚂', '🚆', '🚇', '🚊', '✈️', '🛫', '🛬', '🚁', '🚀', '🛸', '⛵', '🚤', '🛳️', '⚓', '⛽', '🚦', '🗺️', '🗽', '🗼', '🏰', '🏯', '🎡', '🎢', '⛲', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🏕️', '🏠', '🏡', '🏘️', '🏢', '🏬', '🏥', '🏦', '🏨', '🏪', '🏫', '⛪', '🕌', '🌅', '🌄', '🌠', '🌃', '🌉', '🌌'] },
  { id: 'objects', icon: '💡', name: 'Objects', list: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📸', '📹', '🎥', '📞', '☎️', '📺', '📻', '🎙️', '⏰', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '💸', '💵', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '🛠️', '🔩', '⚙️', '🧱', '🧲', '🔑', '🗝️', '🚪', '🪑', '🛏️', '🛋️', '🚽', '🚿', '🛁', '🧴', '🧽', '🧹', '🧺', '🧻', '🧼', '🛒', '🎁', '✉️', '📦', '📫', '📝', '📅', '📆', '📌', '📎', '✂️', '🔒', '🔓', '🔔', '🔕', '🏷️', '📚', '📖', '🔍', '💊', '🩹', '🌡️', '🧸', '🪴'] },
];

// Words to find each emoji by (Unicode names plus everyday words)
const EMOJI_NAMES = {"😀": "grinning happy smile", "😃": "smiling open mouth happy smile", "😄": "smiling open mouth smiling eyes happy smile", "😁": "grinning smiling eyes happy grin", "😆": "smiling open mouth tightly-closed eyes laugh happy", "😅": "smiling open mouth cold sweat phew relief", "🤣": "rolling on the floor laughing laugh lol rofl", "😂": "tears of joy laugh lol funny tears", "🙂": "slightly smiling smile ok", "😉": "winking wink", "😊": "smiling smiling eyes happy blush", "😇": "smiling halo angel innocent", "🥰": "smiling smiling eyes three hearts love hearts", "😍": "smiling heart-shaped eyes love heart eyes", "🤩": "grinning star eyes wow star amazing", "😘": "throwing a kiss kiss love", "😗": "kissing", "😚": "kissing closed eyes", "😋": "savouring delicious food yum tasty", "😛": "stuck-out tongue", "😜": "stuck-out tongue winking eye cheeky joke", "🤪": "grinning one one eye crazy silly", "😝": "stuck-out tongue tightly-closed eyes", "🤑": "money-mouth", "🤗": "hugging", "🤭": "smiling smiling eyes hand covering mouth", "🤫": "finger covering closed lips", "🤔": "thinking hmm think", "🤐": "zipper-mouth", "🤨": "one eyebrow raised", "😐": "neutral", "😑": "expressionless", "😶": "without mouth", "😏": "smirking", "😒": "unamused", "🙄": "rolling eyes eye roll whatever", "😬": "grimacing awkward oops", "😮‍💨": "open mouth dash sigh phew", "😌": "relieved", "😔": "pensive", "😪": "sleepy", "😴": "sleeping sleep tired", "😷": "medical mask", "🤒": "thermometer", "🤢": "nauseated sick ill", "🤮": "open mouth vomiting sick vomit", "🥵": "overheated hot", "🥶": "freezing cold freezing", "🥴": "uneven eyes wavy mouth", "😵": "dizzy", "🤯": "shocked exploding head mind blown shocked", "🤠": "cowboy hat", "🥳": "party horn party hat party celebrate birthday", "🥸": "disguised", "😎": "smiling sunglasses cool", "🤓": "nerd", "🧐": "monocle", "😕": "confused", "😟": "worried", "🙁": "slightly frowning", "😮": "open mouth", "😯": "hushed", "😲": "astonished", "😳": "flushed", "🥺": "pleading eyes please puppy", "🥹": "holding back tears grateful touched", "😦": "frowning open mouth", "😧": "anguished", "😨": "fearful", "😰": "open mouth cold sweat", "😥": "disappointed but relieved", "😢": "crying sad cry", "😭": "loudly crying sad cry sob", "😱": "screaming in fear scared shock", "😖": "confounded", "😣": "persevering", "😞": "disappointed", "😓": "cold sweat", "😩": "weary", "😫": "tired", "🥱": "yawning", "😤": "look of triumph", "😡": "pouting angry mad", "😠": "angry angry", "🤬": "serious symbols covering mouth angry swear", "😈": "smiling horns", "💀": "skull dead lol", "💩": "pile of poo poo", "🤡": "clown clown", "👻": "ghost ghost halloween", "👽": "extraterrestrial alien", "🤖": "robot", "😺": "smiling cat open mouth", "😸": "grinning cat smiling eyes", "😹": "cat tears of joy", "😻": "smiling cat heart-shaped eyes", "😼": "cat wry smile", "🙈": "see-no-evil monkey", "🙉": "hear-no-evil monkey", "🙊": "speak-no-evil monkey", "👋": "waving hand hello hi bye wave", "🤚": "raised back of hand", "🖐️": "raised hand fingers splayed", "✋": "raised hand", "🖖": "raised hand part between middle ring fingers", "👌": "ok hand", "🤌": "pinched fingers", "🤏": "pinching hand", "✌️": "victory hand", "🤞": "hand index middle fingers crossed luck hope fingers crossed", "🫰": "hand index finger thumb crossed", "🤟": "i love you hand", "🤘": "of the horns", "🤙": "call me hand", "👈": "left pointing backhand index", "👉": "right pointing backhand index", "👆": "up pointing backhand index", "👇": "down pointing backhand index", "☝️": "up pointing index", "👍": "thumbs up yes ok like good agree", "👎": "thumbs down no dislike bad", "✊": "raised fist", "👊": "fisted hand", "🤛": "left-facing fist", "🤜": "right-facing fist", "👏": "clapping hands clap well done bravo", "🙌": "person raising both hands in celebration hooray celebrate", "🫶": "heart hands love heart hands", "👐": "open hands", "🤲": "palms up together", "🤝": "handshake deal handshake agree", "🙏": "person folded hands please thanks pray", "✍️": "writing hand", "💅": "nail polish", "💪": "flexed biceps strong gym", "🦾": "mechanical arm", "👀": "eyes look eyes see", "👁️": "eye", "👅": "tongue", "👄": "mouth", "🫦": "biting lip", "👶": "baby", "🧒": "child", "👦": "boy", "👧": "girl", "🧑": "adult", "👨": "man", "👩": "woman", "🧓": "older adult", "👴": "older man", "👵": "older woman", "🙋": "happy person raising one hand", "🙆": "ok gesture", "🙅": "no good gesture", "🤷": "shrug shrug dunno", "🤦": "palm facepalm", "🙇": "person bowing deeply", "💁": "information desk person", "🕺": "man dancing", "💃": "dancer", "🧘": "person in lotus position", "🏃": "runner", "🚶": "pedestrian", "👨‍👩‍👧‍👦": "man woman girl boy", "👪": "family", "💏": "kiss", "💑": "couple heart", "🤰": "pregnant woman", "🧑‍🍳": "adult cooking", "🧑‍💻": "adult personal computer", "🧑‍🔧": "adult wrench", "🧑‍🎄": "adult christmas tree", "🎅": "father christmas christmas santa", "🤶": "mother christmas", "🦸": "superhero", "🧙": "mage", "🧚": "fairy", "👑": "crown", "❤️": "heavy heart love heart red", "🧡": "orange heart", "💛": "yellow heart", "💚": "green heart", "💙": "blue heart", "🩵": "light blue heart", "💜": "purple heart", "🤎": "brown heart", "🖤": "heart", "🩶": "grey heart", "🤍": "heart", "🩷": "pink heart", "💔": "broken heart heartbreak sad", "❤️‍🔥": "heavy heart fire", "❤️‍🩹": "heavy heart adhesive bandage", "❣️": "heavy heart exclamation mark ornament", "💕": "two hearts", "💞": "revolving hearts", "💓": "beating heart", "💗": "growing heart", "💖": "sparkling heart", "💘": "heart arrow", "💝": "heart ribbon", "💟": "heart decoration", "💯": "hundred points hundred perfect", "💢": "anger", "💥": "collision", "💫": "dizzy", "💦": "splashing sweat", "💨": "dash", "🕳️": "hole", "💬": "speech balloon", "💭": "thought balloon", "💤": "sleeping sleep", "✨": "sparkles sparkle magic", "⭐": "star star", "🌟": "glowing star", "⚡": "high voltage", "🔥": "fire fire hot lit", "✅": "heavy check mark done yes tick check", "☑️": "ballot box check", "✔️": "heavy check mark", "❌": "cross mark no wrong cross", "❎": "negative squared cross mark", "➕": "heavy plus", "➖": "heavy minus", "❓": "question mark ornament question", "❗": "heavy exclamation mark exclamation important", "‼️": "double exclamation mark wow important", "⁉️": "exclamation question mark", "⚠️": "warning", "🚫": "no entry", "⛔": "no entry", "🆗": "squared ok ok", "🆒": "squared cool", "🆕": "squared new", "🆓": "squared free", "🔴": "red circle", "🟠": "orange circle", "🟡": "yellow circle", "🟢": "green circle", "🔵": "blue circle", "🟣": "purple circle", "⚫": "circle", "⚪": "circle", "🔶": "orange diamond", "🔷": "blue diamond", "♻️": "universal recycling", "🎵": "musical note", "🎶": "multiple musical notes", "➡️": "rightwards arrow", "⬅️": "leftwards arrow", "⬆️": "upwards arrow", "⬇️": "downwards arrow", "🔁": "clockwise rightwards leftwards open circle arrows", "🔄": "anticlockwise downwards upwards open circle arrows", "🐶": "dog dog puppy", "🐱": "cat cat kitten", "🐭": "mouse", "🐹": "hamster", "🐰": "rabbit", "🦊": "fox", "🐻": "bear", "🐼": "panda", "🐨": "koala", "🐯": "tiger", "🦁": "lion", "🐮": "cow", "🐷": "pig", "🐸": "frog", "🐵": "monkey", "🐔": "chicken", "🐧": "penguin", "🐦": "bird", "🐦‍⬛": "black bird crow raven", "🐤": "baby chick", "🦆": "duck", "🦅": "eagle", "🦉": "owl", "🦇": "bat", "🐺": "wolf", "🐗": "boar", "🐴": "horse", "🦄": "unicorn", "🐝": "honeybee", "🐛": "bug", "🦋": "butterfly", "🐌": "snail", "🐞": "lady beetle", "🐢": "turtle", "🐍": "snake", "🦎": "lizard", "🐙": "octopus", "🦑": "squid", "🦀": "crab", "🐠": "tropical fish", "🐟": "fish", "🐬": "dolphin", "🐳": "spouting whale", "🦈": "shark", "🐊": "crocodile", "🐘": "elephant", "🦒": "giraffe", "🦓": "zebra", "🐕": "dog", "🐈": "cat", "🐇": "rabbit", "🦔": "hedgehog", "🐾": "paw prints", "🌵": "cactus", "🎄": "christmas tree christmas tree", "🌲": "evergreen tree", "🌳": "deciduous tree", "🌴": "palm tree", "🌱": "seedling", "🌿": "herb", "☘️": "shamrock", "🍀": "four leaf clover", "🍁": "maple leaf", "🍂": "fallen leaf", "🍄": "mushroom", "🌷": "tulip", "🌹": "rose", "🥀": "wilted flower", "🌺": "hibiscus", "🌸": "cherry blossom", "🌼": "blossom", "🌻": "sunflower", "🌞": "sun", "🌝": "full moon", "🌙": "crescent moon", "🌍": "earth globe europe-africa", "☀️": "sun rays sun sunny weather", "🌤️": "sun cloud", "⛅": "sun behind cloud", "🌧️": "cloud rain rain weather", "⛈️": "thunder cloud rain", "🌩️": "cloud lightning", "❄️": "snowflake snow cold winter", "☃️": "snowman", "⛄": "snowman without snow", "🌬️": "wind blowing", "🌈": "rainbow rainbow", "☔": "umbrella rain drops", "🌊": "water wave", "🍏": "green apple", "🍎": "red apple", "🍐": "pear", "🍊": "tangerine", "🍋": "lemon", "🍌": "banana", "🍉": "watermelon", "🍇": "grapes", "🍓": "strawberry", "🫐": "blueberries", "🍒": "cherries", "🍑": "peach", "🥭": "mango", "🍍": "pineapple", "🥥": "coconut", "🥝": "kiwifruit", "🍅": "tomato", "🥑": "avocado", "🥦": "broccoli", "🥕": "carrot", "🌽": "ear of maize", "🌶️": "hot pepper", "🥔": "potato", "🧄": "garlic", "🧅": "onion", "🍞": "bread", "🥐": "croissant", "🥖": "baguette bread", "🥨": "pretzel", "🧀": "cheese wedge", "🥚": "egg", "🍳": "cooking", "🥞": "pancakes", "🧇": "waffle", "🥓": "bacon", "🥩": "cut of meat", "🍗": "poultry leg", "🍖": "meat on bone", "🌭": "hot dog", "🍔": "hamburger burger", "🍟": "french fries", "🍕": "slice of pizza pizza", "🥪": "sandwich", "🌮": "taco", "🌯": "burrito", "🥗": "green salad", "🍝": "spaghetti", "🍜": "steaming bowl", "🍲": "pot of food", "🍛": "curry rice", "🍣": "sushi", "🍱": "bento box", "🥟": "dumpling", "🍤": "fried shrimp", "🍚": "cooked rice", "🍦": "soft ice cream", "🍧": "shaved ice", "🍨": "ice cream", "🍩": "doughnut", "🍪": "cookie", "🎂": "birthday cake birthday cake", "🍰": "shortcake", "🧁": "cupcake", "🥧": "pie", "🍫": "chocolate bar", "🍬": "candy", "🍭": "lollipop", "🍿": "popcorn", "🥜": "peanuts", "🍯": "honey pot", "☕": "hot beverage coffee tea", "🍵": "teacup without handle", "🧃": "beverage box", "🥤": "cup straw", "🧋": "bubble tea", "🍺": "beer mug beer pint pub", "🍻": "clinking beer mugs", "🥂": "clinking glasses cheers champagne", "🍷": "wine glass wine", "🥃": "tumbler glass", "🍸": "cocktail glass", "🍹": "tropical drink", "🍾": "bottle popping cork champagne celebrate", "🧊": "ice cube", "⚽": "soccer ball football soccer", "🏀": "basketball hoop", "🏈": "american football", "⚾": "baseball", "🥎": "softball", "🎾": "tennis racquet ball", "🏐": "volleyball", "🏉": "rugby football", "🎱": "billiards", "🏓": "table tennis paddle ball", "🏸": "badminton racquet shuttlecock", "🏒": "ice hockey stick puck", "🏏": "cricket bat ball", "⛳": "flag in hole", "🏹": "bow arrow", "🎣": "fishing pole fish", "🥊": "boxing glove", "🥋": "martial arts uniform", "⛸️": "ice skate", "🎿": "ski ski boot", "🏂": "snowboarder", "🏋️": "weight lifter", "🤸": "person doing cartwheel", "⛹️": "person ball", "🏊": "swimmer", "🚴": "bicyclist", "🏆": "trophy win trophy champion", "🥇": "first place medal", "🥈": "second place medal", "🥉": "third place medal", "🏅": "sports medal", "🎖️": "military medal", "🎫": "ticket", "🎟️": "admission tickets", "🎪": "circus tent", "🎭": "performing arts", "🎨": "artist palette", "🎬": "clapper board", "🎤": "microphone", "🎧": "headphone", "🎼": "musical score", "🎹": "musical keyboard", "🥁": "drum drumsticks", "🎷": "saxophone", "🎺": "trumpet", "🎸": "guitar", "🎻": "violin", "🎲": "game die", "♟️": "chess pawn", "🎯": "direct hit", "🎳": "bowling", "🎮": "video game", "🕹️": "joystick", "🧩": "jigsaw puzzle piece", "🎉": "party popper party celebrate", "🎊": "confetti ball", "🎈": "balloon balloon party", "🎁": "wrapped present present gift birthday", "🎀": "ribbon", "🪅": "pinata", "🎃": "jack-o-lantern halloween pumpkin", "🎆": "fireworks", "🎇": "firework sparkler", "🧨": "firecracker", "🚗": "automobile car drive", "🚕": "taxi", "🚙": "recreational vehicle", "🚌": "bus", "🏎️": "racing car", "🚓": "police car", "🚑": "ambulance", "🚒": "fire engine", "🚐": "minibus", "🛻": "pickup truck", "🚚": "delivery truck", "🚜": "tractor", "🛵": "motor scooter", "🏍️": "racing motorcycle", "🚲": "bicycle", "🛴": "scooter", "🚂": "steam locomotive", "🚆": "train", "🚇": "metro", "🚊": "tram", "✈️": "airplane plane holiday travel flight", "🛫": "airplane departure", "🛬": "airplane arriving", "🚁": "helicopter", "🚀": "rocket", "🛸": "flying saucer", "⛵": "sailboat", "🚤": "speedboat", "🛳️": "passenger ship", "⚓": "anchor", "⛽": "fuel pump", "🚦": "vertical traffic light", "🗺️": "world map", "🗽": "statue of liberty", "🗼": "tokyo tower", "🏰": "european castle", "🏯": "japanese castle", "🎡": "ferris wheel", "🎢": "roller coaster", "⛲": "fountain", "🏖️": "beach umbrella", "🏝️": "desert island", "🏜️": "desert", "🌋": "volcano", "⛰️": "mountain", "🏔️": "snow capped mountain", "🏕️": "camping", "🏠": "house building home house", "🏡": "house garden", "🏘️": "house buildings", "🏢": "office building", "🏬": "department store", "🏥": "hospital", "🏦": "bank", "🏨": "hotel", "🏪": "convenience store", "🏫": "school", "⛪": "church", "🕌": "mosque", "🌅": "sunrise", "🌄": "sunrise over mountains", "🌠": "shooting star", "🌃": "night stars", "🌉": "bridge at night", "🌌": "milky way", "⌚": "watch", "📱": "mobile phone", "💻": "personal computer", "⌨️": "keyboard", "🖥️": "desktop computer", "🖨️": "printer", "🖱️": "three button mouse", "📷": "camera", "📸": "camera flash", "📹": "video camera", "🎥": "movie camera", "📞": "telephone receiver", "☎️": "telephone", "📺": "television", "📻": "radio", "🎙️": "studio microphone", "⏰": "alarm clock", "⏳": "hourglass flowing sand", "📡": "satellite antenna", "🔋": "battery", "🔌": "electric plug", "💡": "electric light bulb", "🔦": "electric torch", "🕯️": "candle", "🧯": "fire extinguisher", "💸": "money wings", "💵": "banknote dollar", "💳": "credit card", "💎": "gem stone", "⚖️": "scales", "🧰": "toolbox", "🔧": "wrench", "🔨": "hammer", "🛠️": "hammer wrench", "🔩": "nut bolt", "⚙️": "gear", "🧱": "brick", "🧲": "magnet", "🔑": "key", "🗝️": "old key", "🚪": "door", "🪑": "chair", "🛏️": "bed", "🛋️": "couch lamp", "🚽": "toilet", "🚿": "shower", "🛁": "bathtub", "🧴": "lotion bottle", "🧽": "sponge", "🧹": "broom", "🧺": "basket", "🧻": "roll of paper", "🧼": "bar of soap", "🛒": "shopping trolley", "✉️": "envelope", "📦": "package", "📫": "closed mailbox raised flag", "📝": "memo", "📅": "calendar", "📆": "tear-off calendar", "📌": "pushpin", "📎": "paperclip", "✂️": "scissors", "🔒": "lock", "🔓": "open lock", "🔔": "bell", "🔕": "bell cancellation stroke", "🏷️": "label", "📚": "books", "📖": "open book", "🔍": "left-pointing magnifying glass", "💊": "pill", "🩹": "adhesive bandage", "🌡️": "thermometer", "🧸": "teddy bear", "🪴": "potted plant"};

const SPECIAL_TYPES = new Set(['poll', 'checkin', 'sticker', 'entity']);
const XICON = {
  apps: _s('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  reply: _s('<path d="M10 8L4 13l6 5"/><path d="M4 13h10a6 6 0 016 6v1"/>'),
  edit: _s('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/>'),
  sticker: _s('<path d="M20.5 12.5V7a3.5 3.5 0 00-3.5-3.5H7A3.5 3.5 0 003.5 7v10A3.5 3.5 0 007 20.5h5.5z"/><path d="M12.5 20.5c0-4.4 3.6-8 8-8"/><path d="M8.5 9.5h.01M14.5 9.5h.01" stroke-width="2.6"/>'),
  sketch: _s('<path d="M3 17c3-1 4-7 7-7s1 6 4 6 4-5 7-5"/><path d="M17 4l3 3-8 8H9v-3z"/>'),
  poll: _s('<path d="M5 20V10M12 20V4M19 20v-7"/>', 'stroke-width="2.6"'),
  checkin: _s('<path d="M12 21.5s-7-6.3-7-12a7 7 0 1114 0c0 5.7-7 12-7 12z"/><path d="M9 9.5l2 2 4-4"/>'),
  device: _s('<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><circle cx="12" cy="14.5" r="2.2"/>'),
  minus: _s('<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>'),
  eyeOff: _s('<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.6 4.2 9.6 7-.4 1.1-1.2 2.5-2.4 3.8M6.6 6.6C4.6 7.9 3.1 10 2.4 12c1 2.8 4.6 7 9.6 7 1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  eye: _s('<path d="M2.4 12c1-2.8 4.6-7 9.6-7s8.6 4.2 9.6 7c-1 2.8-4.6 7-9.6 7s-8.6-4.2-9.6-7z"/><circle cx="12" cy="12" r="3"/>'),
  pushpin: _s('<path d="M9 3.5h6M10 3.5v6.2L6.5 14h11L14 9.7V3.5M12 14v7"/>'),
  clock: _s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  ink: _s('<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><path d="M4 4l16 16"/>'),
  timer: _s('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M19 6l1.5-1.5"/>'),
  effect: _s('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  aa: '<span style="font-size:16px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif">Aa</span>',
  smilePlus: _s('<circle cx="11" cy="12" r="8"/><path d="M7.8 14.3c1.7 1.8 4.7 1.8 6.4 0"/><path d="M8.5 10h.01M13.5 10h.01" stroke-width="2.6"/><path d="M19.5 3v5M17 5.5h5" stroke-width="2"/>'),
  speaker: _s('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7"/>'),
  undo: _s('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>'),
  eraser: _s('<path d="M20 20H9L4 15a2 2 0 010-2.8L13.2 3a2 2 0 012.8 0l4 4a2 2 0 010 2.8L11 18.8"/>'),
};

Object.assign(CrowMessengerCard.prototype, {

  // ── Text with styles and @mentions ──────────────────────────────────────────
  _richText(m) {
    const text = m.text || '';
    const spans = (m.spans || []).filter(x => x && x.e > x.s && x.s >= 0 && x.e <= text.length);
    let html;
    if (!spans.length) html = linkify(text);
    else {
      const cuts = new Set([0, text.length]);
      spans.forEach(x => { cuts.add(x.s); cuts.add(x.e); });
      const pts = [...cuts].sort((a, b) => a - b);
      html = '';
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], seg = text.slice(a, b);
        const styles = [...new Set(spans.filter(x => x.s <= a && x.e >= b).map(x => x.style))];
        if (!styles.length) { html += linkify(seg); continue; }
        const anim = styles.some(st => ANIM_STYLES.has(st));
        const inner = anim ? [...seg].map((ch, k) => ch === '\n' ? '\n' : `<i style="--i:${a + k}">${esc(ch)}</i>`).join('') : linkify(seg);
        html += `<span class="${styles.map(st => 'ts-' + st).join(' ')}${anim ? ' ts-anim' : ''}">${inner}</span>`;
      }
    }
    for (const uid of m.mentions || []) {
      for (const name of new Set([this._userName(uid, true), this._userName(uid)])) {
        const at = esc('@' + name);
        if (html.includes(at)) { html = html.split(at).join(`<span class="mention">${at}</span>`); break; }
      }
    }
    return html;
  },

  // ── Pieces around a bubble ──────────────────────────────────────────────────
  _quoteHtml(m) {
    if (m.reply_private && m.reply_preview) {
      // Reply Privately: the quote comes from a group chat
      const p = m.reply_preview;
      const who = p.sender === this._s.me ? 'You' : this._userName(p.sender, true);
      return `<div class="quote"><b>${esc(who)} <span class="qfrom">· ${esc(p.from || 'a group')}</span></b>${esc(p.text || '')}</div>`;
    }
    if (!m.reply_to) return '';
    const p = m.reply_preview || {};
    if (p.gone) return `<div class="quote gone" data-x="jump" data-to="">Original message deleted</div>`;
    const who = p.sender === this._s.me ? 'You' : this._nameIn(m.thread_id, p.sender, true);
    return `<div class="quote" data-x="jump" data-to="${esc(m.reply_to)}"><b>${esc(who)}</b>${esc(p.text || '')}</div>`;
  },

  _tapbacksHtml(m) {
    const r = m.reactions || {};
    const keys = Object.keys(r);
    if (!keys.length) return '';
    const counts = new Map();
    keys.forEach(uid => counts.set(r[uid], (counts.get(r[uid]) || 0) + 1));
    const mineE = r[this._s.me];
    // round badges on the corner of the message, with a little thought-bubble tail (like the iPhone):
    // blue when it's your reaction, grey when it's someone else's
    return `<div class="tapbacks" data-x="tapbacks">${[...counts].slice(0, 3).map(([e, n], i) =>
      `<span class="tb emo${e === mineE ? ' mine' : ''}${i === 0 ? ' lead' : ''}" aria-label="${esc(e)}">${tbFace(e)}${n > 1 ? `<small>${n}</small>` : ''}</span>`).join('')}</div>`;
  },

  _placedHtml(m) {
    return (m.stickers || []).map(st => {
      const style = `left:calc(${(st.x * 100).toFixed(1)}% - 24px);top:calc(${(st.y * 100).toFixed(1)}% - 22px);transform:rotate(${st.rot || 0}deg) scale(${st.scale || 1})`;
      if (st.emoji) return `<span class="mstk e" style="${style}" data-x="placed" data-sid="${esc(st.id)}" data-uid="${esc(st.uid)}">${esc(st.emoji)}</span>`;
      const src = this._stickerSrc(st.image);
      return `<span class="mstk" style="${style}" data-x="placed" data-sid="${esc(st.id)}" data-uid="${esc(st.uid)}">${src ? `<img src="${esc(src)}" alt="" draggable="false" data-no-missing>` : ''}</span>`;
    }).join('');
  },

  // A sticker image: from the cache, or fetched (in one batch) and then redrawn
  _stickerSrc(id) {
    if (!id) return '';
    this._stickerImgs = this._stickerImgs || new Map();
    if (this._stickerImgs.has(id)) return this._stickerImgs.get(id);
    this._stickerWant = this._stickerWant || new Set();
    if (!this._stickerWant.has(id)) {
      this._stickerWant.add(id);
      clearTimeout(this._stickerTimer);
      this._stickerTimer = setTimeout(async () => {
        const ids = [...this._stickerWant].filter(x => !this._stickerImgs.has(x));
        this._stickerWant.clear();
        if (!ids.length) return;
        try {
          const r = await this._ws('stickers/get', { ids });
          ids.forEach(x => this._stickerImgs.set(x, r.images[x] || ''));
          this._refresh('messages'); this._stickerViews?.forEach(f => f());
        } catch (e) { /* try again next time */ }
      }, 30);
    }
    return '';
  },

  _editedHtml(m) {
    if (!m.edits?.length) return '';
    return `<div class="edited" data-x="edits">Edited</div>`;
  },

  _linkHtml(m) {
    const l = m.link;
    if (!l) return '';
    return `<div class="linkc" data-x="link" data-url="${esc(l.url)}">${l.image ? `<img src="${esc(l.image)}" alt="" draggable="false" data-no-missing>` : ''}
      <div class="lt">${esc(l.title || l.url)}</div><div class="ls">${esc(l.site || '')}</div></div>`;
  },

  _actionsHtml(m) {
    if (!m.actions?.length) return '';
    const taken = m.action_taken;
    if (taken) {
      const who = taken.user === this._s.me ? 'You' : this._userName(taken.user, true);
      return `<div class="actdone">${ICON.check}${esc(taken.title)} · ${esc(who)}</div>`;
    }
    return `<div class="actbtns">${m.actions.map(a => `<button class="g" data-x="action" data-act="${esc(a.action)}">${esc(a.title)}</button>`).join('')}</div>`;
  },


  // ── Special messages ────────────────────────────────────────────────────────
  _specialHtml(m, t) {
    if (m.type === 'sticker') {
      const st = m.sticker || {};
      if (st.emoji) return `<div class="stkmsg e" data-x="stk">${esc(st.emoji)}</div>`;
      const src = this._stickerSrc(st.image);
      return `<div class="stkmsg${src ? '' : ' loading'}" data-x="stk">${src ? `<img src="${esc(src)}" alt="Sticker" draggable="false" data-no-missing>` : ''}</div>`;
    }
    if (m.type === 'poll') return this._pollHtml(m, t);
    if (m.type === 'checkin') return this._checkinHtml(m);
    if (m.type === 'entity') return this._entityHtml(m);
    return '';
  },

  _pollHtml(m, t) {
    const p = m.poll || { options: [], votes: {} };
    const votes = p.votes || {};
    const mine = new Set(votes[this._s.me] || []);
    const voters = Object.keys(votes);
    const counts = new Map(p.options.map(o => [o.id, voters.filter(v => votes[v].includes(o.id))]));
    const max = Math.max(1, ...[...counts.values()].map(v => v.length));
    const people = (t?.participants || []).filter(x => x !== HA_ID).length;
    return `<div class="xcard poll" data-x="poll">
      <div class="xh">${XICON.poll}Poll</div>
      <div class="xt">${esc(m.text)}</div>
      ${p.options.map(o => {
        const who = counts.get(o.id) || [];
        return `<div class="popt${mine.has(o.id) ? ' on' : ''}" data-x="vote" data-opt="${esc(o.id)}">
          <div class="pbar" style="width:${who.length ? Math.round(who.length / max * 100) : 0}%"></div>
          <span class="pck">${mine.has(o.id) ? ICON.check : ''}</span><span class="ptx">${esc(o.text)}</span>
          <span class="pvt">${who.slice(0, 3).map(u => this._userAv(u, 20)).join('')}</span><span class="pn">${who.length || ''}</span></div>`;
      }).join('')}
      <div class="xs" style="padding-top:8px">${voters.length} of ${people} voted${p.multi === false ? ' · one choice' : ''}</div>
      <div class="xbtns"><button data-x="polladd">Add Choice</button></div>
    </div>`;
  },

  _checkinHtml(m) {
    const ci = m.checkin || {};
    const mine = m.sender === this._s.me;
    const name = mine ? 'You' : this._userName(m.sender, true);
    const zone = ci.zone_name || 'Home';
    const due = fmtTime(ci.due_ts, this._hass) + (sameDay(new Date(ci.due_ts), new Date()) ? '' : ` ${fmtListDate(ci.due_ts, this._hass)}`);
    let title = 'Check In', sub = '', cls = ci.status || 'active', btns = '';
    if (ci.status === 'active') {
      sub = mine ? `You’ll be checked on if you haven’t arrived at ${zone} by ${due}.` : `${name} expects to arrive at ${zone} by ${due}.`;
      btns = mine ? `<button data-x="ciadd">Add Time</button><button class="red" data-x="ciend">End</button>` : `<button data-x="cimap">Details</button>`;
    } else if (ci.status === 'late') {
      title = 'Not Arrived Yet';
      const where = ci.last ? this._ciPlace(ci.last) : 'unknown';
      sub = `${mine ? 'You haven’t' : name + ' hasn’t'} arrived at ${zone} as expected. Last location: ${where}${ci.last?.ts ? ' · ' + fmtTime(ci.last.ts, this._hass) : ''}.`;
      btns = mine ? `<button data-x="ciadd">Add Time</button><button class="red" data-x="ciend">End</button>` : `<button data-x="cimap">Find Me</button>`;
      // the last location isn't a zone: offer to make it one
      if (ci.last?.lat != null && ci.last?.lon != null && (!ci.last.state || ci.last.state === 'not_home') && this._zoneCan()) btns += '<button data-x="cizone">Add Zone</button>';
    } else if (ci.status === 'arrived') {
      title = 'Arrived';
      sub = `${name} arrived at ${zone}${ci.ended ? ' at ' + fmtTime(ci.ended, this._hass) : ''}.`;
    } else {
      title = 'Check In Ended';
      sub = `${mine ? 'You' : name} ended this Check In.`;
    }
    return `<div class="xcard checkin" data-x="checkin">
      <div class="ci-top"><span class="ci-badge ${esc(cls)}">${ci.status === 'arrived' ? ICON.check : XICON.checkin}</span>
        <div style="min-width:0"><div class="ct">${esc(title)}</div><div class="cs">${esc(sub)}</div></div></div>
      ${btns ? `<div class="xbtns">${btns}</div>` : ''}
    </div>`;
  },

  _ciPlace(loc) {
    const st = loc.state;
    if (!st || ['unknown', 'unavailable'].includes(st)) return 'unknown';
    if (st === 'home') return 'Home';
    if (st !== 'not_home') return st;
    return loc.lat != null ? `${(+loc.lat).toFixed(4)}, ${(+loc.lon).toFixed(4)}` : 'Away';
  },

  _entityHtml(m) {
    const eid = m.entity?.entity_id;
    const st = this._hass?.states?.[eid];
    const name = st?.attributes?.friendly_name || eid;
    const domain = (eid || '').split('.')[0];
    const state = st ? (this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state) : 'Not available';
    const on = st && ['on', 'open', 'unlocked', 'playing', 'home', 'heat', 'cool'].includes(st.state);
    const act = this._entityAction(domain, st);
    const cam = domain === 'camera' && st?.attributes?.entity_picture
      ? `<img class="ent-cam" src="${esc(this._hass.hassUrl(st.attributes.entity_picture) + `&t=${Math.floor(Date.now() / 10000)}`)}" alt="" data-no-missing draggable="false">` : '';
    return `<div class="xcard entity" data-x="entity" data-eid="${esc(eid)}">
      ${cam}
      <div class="ent-top" data-x="moreinfo"><span class="ent-icon${on ? ' on' : ''}"><ha-state-icon data-eid="${esc(eid)}"></ha-state-icon></span>
        <div style="min-width:0;flex:1"><div class="en">${esc(name)}</div><div class="es">${esc(state)}</div></div><span class="gch" style="width:13px;height:13px;opacity:.4">${ICON.chevR}</span></div>
      ${m.text ? `<div class="ent-note">${linkify(m.text)}</div>` : ''}
      ${act ? `<div class="xbtns"><button data-x="entact">${esc(act.label)}</button></div>` : ''}
    </div>`;
  },

  // The one-tap action a shared device offers
  _entityAction(domain, st) {
    if (!st || st.state === 'unavailable') return null;
    const s = st.state;
    switch (domain) {
      case 'light': case 'switch': case 'fan': case 'input_boolean': case 'siren': case 'humidifier':
        return { label: s === 'on' ? 'Turn Off' : 'Turn On', domain: 'homeassistant', service: s === 'on' ? 'turn_off' : 'turn_on' };
      case 'cover': return { label: s === 'open' || s === 'opening' ? 'Close' : 'Open', domain, service: s === 'open' || s === 'opening' ? 'close_cover' : 'open_cover' };
      case 'lock': return { label: s === 'locked' ? 'Unlock' : 'Lock', domain, service: s === 'locked' ? 'unlock' : 'lock', confirm: s === 'locked' };
      case 'scene': return { label: 'Activate', domain, service: 'turn_on' };
      case 'script': return { label: 'Run', domain, service: 'turn_on' };
      case 'automation': return { label: 'Run', domain, service: 'trigger' };
      case 'button': case 'input_button': return { label: 'Press', domain, service: 'press' };
      case 'media_player': return { label: s === 'playing' ? 'Pause' : 'Play', domain, service: 'media_play_pause' };
      case 'vacuum': return { label: s === 'cleaning' ? 'Return to Dock' : 'Start', domain, service: s === 'cleaning' ? 'return_to_base' : 'start' };
      case 'climate': return { label: s === 'off' ? 'Turn On' : 'Turn Off', domain, service: s === 'off' ? 'turn_on' : 'turn_off' };
      case 'camera': return { label: 'Refresh', refresh: true };
      default: return null;
    }
  },

  _hydrateExtras(scope) {
    if (scope.querySelector('[data-ends]')) this._tickTimers();
    scope.querySelectorAll('ha-state-icon[data-eid]').forEach(icon => {
      const st = this._hass?.states?.[icon.dataset.eid];
      icon.hass = this._hass;
      if (st) icon.stateObj = st;
    });
  },

  // ── Things you've scheduled with Send Later (shown faded at the bottom) ─────
  _scheduledHtml(tid) {
    const items = this._s.scheduled.get(tid) || [];
    if (!items.length) return '';
    return items.map(it => {
      const pl = it.place;
      const when = pl ? `When You ${pl.on === 'leave' ? 'Leave' : 'Arrive at'} ${pl.zone_name || 'a Place'}`
        : sameDay(new Date(it.at), new Date()) ? `Today ${fmtTime(it.at, this._hass)}` : `${fmtListDate(it.at, this._hass)} ${fmtTime(it.at, this._hass)}`;
      const ex = it.extra || {};
      let body = '';
      if (ex.type === 'sticker') body = `<div class="stkmsg e">${esc(ex.sticker?.emoji || '🖼️')}</div>`;
      else {
        const label = it.text || (it.attachments?.length ? `${it.attachments.length} attachment${it.attachments.length > 1 ? 's' : ''}` : 'Message');
        body = `<div class="bub">${this._richText({ text: label, spans: it.text ? ex.spans : [] })}</div>`;
      }
      return `<div class="sched-h">${pl ? ICON.pin : XICON.clock}Send Later · ${esc(when)}</div><div class="mrow me sched" data-sched="${esc(it.id)}"><div class="mcol">${body}</div></div>`;
    }).join('');
  },

  _disappearNote(t) {
    if (!t?.disappear) return '';
    const n = DISAPPEAR.find(d => d.v === t.disappear)?.name.toLowerCase() || '';
    return `<div class="sys dis-note">${XICON.timer}Messages disappear ${esc(n)} after they’re read</div>`;
  },

  // ── Clicks on the extras inside a conversation ─────────────────────────────
  async _extraClick(e, tid, page) {
    const x = e.target.closest('[data-x]');
    const sched = e.target.closest('[data-sched]');
    if (sched) { this._schedMenu(sched, sched.dataset.sched); return true; }
    const ink = e.target.closest('.bub.ink:not(.revealed)');
    if (ink) {
      const mid = ink.closest('.mrow')?.dataset.mid;
      if (mid) this._setInk(ink.closest('.mrow'), mid, true);
      return true;
    }
    const spd = e.target.closest('.audio .spd');
    if (spd) { this._audioSpeed(spd); return true; }
    if (!x) return false;
    const row = x.closest('.mrow');
    const box = this._s.msgs.get(tid);
    const m = row ? box?.list.find(y => y.id === row.dataset.mid) : null;
    const kind = x.dataset.x;
    try {
      if (kind === 'jump') {
        const to = x.dataset.to;
        if (!to) return true;
        const target = page.el.querySelector(`.mrow[data-mid="${CSS.escape(to)}"]`);
        if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash'); }
        else this._toast('That message is further back in the conversation');
        return true;
      }
      if (!m) return true;
      if (kind === 'tapbacks') { this._whoReacted(m); return true; }
      if (kind === 'replay') { this._replayFx(page, m); return true; }
      if (kind === 'ttl') { this._toast(this._ttlText(m)); return true; }
      if (kind === 'ink') { this._setInk(row, m.id, !this._revealed.has(m.id)); return true; }
      if (kind === 'edits') { this._showEdits(m); return true; }
      if (kind === 'link') { openExternal(x.dataset.url); return true; }
      if (kind === 'action') {
        x.closest('.actbtns')?.querySelectorAll('button').forEach(b => { b.disabled = true; });
        await this._ws('action', { thread_id: tid, message_id: m.id, action: x.dataset.act });
        return true;
      }
      if (kind === 'vote') {
        const p = m.poll; const mine = new Set(p.votes?.[this._s.me] || []);
        const id = x.dataset.opt;
        if (mine.has(id)) mine.delete(id); else { if (p.multi === false) mine.clear(); mine.add(id); }
        // show it straight away; the server confirms
        p.votes = { ...(p.votes || {}), [this._s.me]: [...mine] };
        if (!mine.size) delete p.votes[this._s.me];
        this._refresh('messages', tid);
        await this._ws('poll/vote', { thread_id: tid, message_id: m.id, options: [...mine] });
        return true;
      }
      if (kind === 'polladd') {
        const r = await this._alert({ title: 'Add Choice', input: { placeholder: 'Choice' }, buttons: [{ text: 'Add', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
        if (r.value && r.input?.trim()) await this._ws('poll/add', { thread_id: tid, message_id: m.id, text: r.input.trim() });
        return true;
      }
      if (kind === 'ciend') {
        const r = await this._alert({ title: 'End Check In?', message: 'The people in this conversation won’t be told whether you arrive.', buttons: [{ text: 'End Check In', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }] });
        if (r.value) await this._ws('checkin', { thread_id: tid, message_id: m.id, end: true });
        return true;
      }
      if (kind === 'ciadd') {
        const v = await this._menu(x, [{ header: 'Add Time' }, { text: '15 Minutes', value: 15 }, { text: '30 Minutes', value: 30 }, { text: '1 Hour', value: 60 }, { text: '2 Hours', value: 120 }], { align: 'left' });
        if (v) { await this._ws('checkin', { thread_id: tid, message_id: m.id, add_minutes: v }); this._toast('Time added'); }
        return true;
      }
      if (kind === 'cimap') { this._nav('people', m.checkin?.person ? { focus: m.checkin.person } : {}); return true; }
      if (kind === 'cizone') {
        const last = m.checkin?.last;
        if (last?.lat == null) return true;
        const who = m.sender === this._s.me ? 'You were' : `${this._userName(m.sender, true)} was`;
        await this._newZone({ lat: +last.lat, lon: +last.lon, intro: `${who} last seen here${last.ts ? ' at ' + fmtTime(last.ts, this._hass) : ''}.` });
        return true;
      }
      if (kind === 'moreinfo') {
        this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: m.entity?.entity_id } }));
        return true;
      }
      if (kind === 'entact') {
        const eid = m.entity?.entity_id, st = this._hass.states[eid];
        const act = this._entityAction(eid.split('.')[0], st);
        if (!act) return true;
        if (act.refresh) { this._refresh('messages', tid); return true; }
        if (act.confirm) {
          const r = await this._alert({ title: `${act.label} ${st.attributes.friendly_name || eid}?`, buttons: [{ text: act.label, style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
          if (!r.value) return true;
        }
        await this._hass.callService(act.domain, act.service, { entity_id: eid });
        return true;
      }
      if (kind === 'placed') {
        if (x.dataset.uid !== this._s.me) return true;
        const v = await this._menu(x, [{ text: 'Remove Sticker', value: 'rm', icon: ICON.trash, red: true }], { align: 'left' });
        if (v) await this._ws('sticker/remove', { thread_id: tid, message_id: m.id, sticker_id: x.dataset.sid });
        return true;
      }
    } catch (err) { this._toast(err.message || 'That didn’t work'); this._loadMsgs(tid, { reset: true }); return true; }
    return false;
  },

  async _whoReacted(m) {
    const r = m.reactions || {};
    const items = [{ header: 'Reactions' }, ...Object.entries(r).map(([uid, e]) => ({ text: `${e}  ${uid === this._s.me ? 'You' : this._userName(uid)}`, value: uid }))];
    await this._menu(this.shadowRoot.querySelector(`.mrow[data-mid="${CSS.escape(m.id)}"] .tapbacks`) || this._root, items, { align: m.sender === this._s.me ? 'right' : 'left' });
  },

  async _showEdits(m) {
    const lines = [...(m.edits || [])].map(e => `${fmtTime(e.ts, this._hass)} — ${e.text || '(empty)'}`);
    await this._alert({ title: 'Edit History', message: lines.join('\n\n') + `\n\nNow — ${m.text}`, buttons: [{ text: 'OK', style: 'ok', value: true }] });
  },

  async _schedMenu(el, sid) {
    const v = await this._menu(el, [
      { text: 'Send Now', value: 'now', icon: ICON.up },
      { sep: true }, { text: 'Delete Message', value: 'del', icon: ICON.trash, red: true },
    ], { align: 'right' });
    try {
      if (v === 'now') await this._ws('scheduled/send_now', { scheduled_id: sid });
      if (v === 'del') await this._ws('scheduled/cancel', { scheduled_id: sid });
    } catch (err) { this._toast(err.message); }
  },

  _audioSpeed(btn) {
    const speeds = [1, 1.5, 2];
    const cur = parseFloat(btn.dataset.s || '1');
    const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length];
    this._audioRate = next;
    this.shadowRoot.querySelectorAll('.audio .spd').forEach(b => { b.dataset.s = String(next); b.textContent = `${next}×`; });
    if (this._audio) this._audio.playbackRate = next;
  },

  // ── Reactions picker (top of the press-and-hold menu) ─────────────────────────
  async _react(tid, m, emoji) {
    const me = this._s.me;
    const r = { ...(m.reactions || {}) };
    if (r[me] === emoji || !emoji) delete r[me]; else r[me] = emoji;
    m.reactions = r;
    this._refresh('messages', tid);
    try { await this._ws('react', { thread_id: tid, message_id: m.id, emoji: emoji || null }); }
    catch (err) { this._toast(err.message); this._loadMsgs(tid, { reset: true }); }
  },

  // Choose any emoji from a sheet like Stickers (recently used ones first)
  _pickEmoji(title = 'React') {
    const KEY = 'crowMessengerRecentEmoji';
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem(KEY) || '[]').filter(x => typeof x === 'string').slice(0, 30); } catch (e) { /* private window */ }
    const tabs = (recent.length ? [{ id: 'recent', icon: '🕘', name: 'Recent', list: recent }] : []).concat(EMOJI_SETS);
    const all = [...new Set(EMOJI_SETS.flatMap(t => t.list))];
    let tab = tabs[0].id, q = '';
    return new Promise((resolve) => {
      let done = false;
      const SEARCH = '<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>';
      const CLEAR = '<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>';
      // a search box, then the categories and the emoji
      const sh = this._xsheet({ title, body: `<div class="emo-search"><svg class="emo-search-icon" viewBox="0 0 24 24">${SEARCH}</svg>
          <input class="emo-search-input" type="text" placeholder="Search emoji…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
          <button class="emo-search-clear" type="button" aria-label="Clear search"><svg viewBox="0 0 24 24">${CLEAR}</svg></button></div>
        <div class="emo-body"></div>` });
      const finish = (v) => { if (done) return; done = true; resolve(v); };
      const close = sh.close; sh.close = () => { close(); finish(null); };
      const box = sh.el.querySelector('.emo-body'), input = sh.el.querySelector('.emo-search-input'), clr = sh.el.querySelector('.emo-search-clear');
      const grid = (list) => `<div class="egrid">${list.map(e => `<button data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
      const render = () => {
        clr.style.display = q ? 'flex' : 'none';
        if (q) {
          // every word typed has to match the start of a word in the emoji's name
          const words = q.toLowerCase().split(/\s+/).filter(Boolean);
          const hits = all.filter(e => { const n = ` ${EMOJI_NAMES[e] || ''}`; return words.every(w => n.includes(' ' + w)); });
          box.innerHTML = hits.length ? `<div class="xlabel">Results</div>${grid(hits)}` : `<div class="emo-none">No emoji found for “${esc(q)}”</div>`;
          return;
        }
        const cur = tabs.find(t => t.id === tab) || tabs[0];
        box.innerHTML = `<div class="emo-tabs">${tabs.map(t => `<button data-etab="${t.id}" class="${t.id === cur.id ? 'on' : ''}" aria-label="${esc(t.name)}">${t.icon}</button>`).join('')}</div>
          <div class="xlabel">${esc(cur.name)}</div>${grid(cur.list)}`;
      };
      render();
      input.addEventListener('input', () => { q = input.value.trim(); render(); sh.el.scrollTop = 0; });
      input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && q) { e.stopPropagation(); input.value = ''; q = ''; render(); } });
      ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
      clr.addEventListener('click', () => { input.value = ''; q = ''; render(); input.focus(); });
      box.addEventListener('click', (e) => {
        const t = e.target.closest('[data-etab]');
        if (t) { tab = t.dataset.etab; render(); sh.el.scrollTop = 0; return; }
        const em = e.target.closest('[data-emoji]');
        if (!em) return;
        const v = em.dataset.emoji;
        try { localStorage.setItem(KEY, JSON.stringify([v, ...recent.filter(x => x !== v)].slice(0, 30))); } catch (err) { /* */ }
        close(); finish(v);
      });
    });
  },

  // ── Effects, played once for new messages ───────────────────────────────────
  _queueFx(m) {
    if (!m?.effect || this._played.has(m.id) || m.effect === 'invisible') return;
    this._fxQueue.add(m.id);
  },

  // "Sent with Slam · Replay" under a message sent with an effect
  _fxNoteHtml(m) {
    if (m.effect === 'invisible' && !m.pending) {
      return `<div class="fx-note" data-x="ink">Sent with Invisible Ink · <b>${this._revealed.has(m.id) ? 'Hide' : 'Reveal'}</b></div>`;
    }
    if (!m.effect || m.effect === 'invisible' || m.pending) return '';
    const name = [...BUBBLE_FX, ...SCREEN_FX].find(f => f.id === m.effect)?.name || '';
    return `<div class="fx-note" data-x="replay">Sent with ${esc(name)} · <b>Replay</b></div>`;
  },

  // Sent with Send Later, and the little timer on a disappearing message
  _sentNotesHtml(m) {
    if (m.pending) return '';
    let h = '';
    if (m.scheduled) h += `<div class="fx-note sl-note">${XICON.clock}Sent with Send Later</div>`;
    return h;
  },

  // sits just under the message itself, so the timer lines up with the bubble (not the notes below it)
  _ttlHtml(m) {
    return m.ttl && !m.pending ? `<div class="ttl-anchor"><button class="ttl-ic" data-x="ttl" aria-label="Disappearing message">${XICON.timer}</button></div>` : '';
  },

  _ttlText(m) {
    const n = DISAPPEAR.find(d => d.v === m.ttl)?.name.toLowerCase() || '';
    if (!m.expires) return `This message disappears ${n} after it’s read`;
    const left = m.expires - Date.now();
    if (left <= 60000) return 'This message is about to disappear';
    const mins = Math.round(left / 60000), hrs = Math.round(left / 3600000), days = Math.round(left / 86400000);
    return `This message disappears in ${mins < 60 ? `${mins} minute${mins === 1 ? '' : 's'}` : hrs < 48 ? `${hrs} hour${hrs === 1 ? '' : 's'}` : `${days} days`}`;
  },

  // Show or cover up an Invisible Ink message (the bubble and its "Reveal / Hide" note)
  _setInk(row, mid, show) {
    if (show) this._revealed.add(mid); else this._revealed.delete(mid);
    row?.querySelector('.bub.ink')?.classList.toggle('revealed', show);
    const b = row?.querySelector('.fx-note[data-x="ink"] b');
    if (b) b.textContent = show ? 'Hide' : 'Reveal';
  },

  _replayFx(page, m) {
    if (!page.visible || !m?.effect) return;
    if (SCREEN_FX.some(f => f.id === m.effect)) { this._screenFx(page.el, m.effect, m); return; }
    const row = page.el.querySelector(`.mrow[data-mid="${CSS.escape(m.id)}"]`);
    if (!row) return;
    BUBBLE_FX.forEach(f => row.classList.remove(`fx-${f.id}`));
    void row.offsetWidth;
    row.classList.add(`fx-${m.effect}`);
    if (m.effect === 'slam') setTimeout(() => { page.el.classList.add('fx-shake'); setTimeout(() => page.el.classList.remove('fx-shake'), 520); }, 280);
  },

  _playQueuedFx(page, tid) {
    clearTimeout(page.fxTimer);
    page.fxTimer = setTimeout(() => {
      if (!page.visible || !this._fxQueue.size) return;
      const box = this._s.msgs.get(tid);
      let screen = null;
      for (const m of box?.list || []) {
        if (!this._fxQueue.has(m.id)) continue;
        this._fxQueue.delete(m.id); this._played.add(m.id);
        if (this._config.animations === false) continue;
        if (SCREEN_FX.some(f => f.id === m.effect)) screen = m;
        else {
          const row = page.el.querySelector(`.mrow[data-mid="${CSS.escape(m.id)}"]`);
          if (row) {
            row.classList.add(`fx-${m.effect}`);
            if (m.effect === 'slam') setTimeout(() => { page.el.classList.add('fx-shake'); setTimeout(() => page.el.classList.remove('fx-shake'), 520); }, 280);
          }
        }
      }
      if (screen) this._screenFx(page.el, screen.effect, screen);
    }, 450);
  },
});

// ── Sheets for the extras: apps, stickers, polls, Check In, devices, Send Later ─
const STICKER_EMOJI = ['😂', '🥰', '😍', '🤩', '😎', '🥳', '😭', '😱', '🤯', '🥺', '😴', '🤔', '🙄', '😬', '🤗', '😘', '😇', '🤪', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤞', '✌️', '👋', '🫶', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💯', '🔥',
  '✨', '🎉', '🎂', '🎁', '🎈', '🏆', '⭐', '🌈', '☀️', '🌙', '⛈️', '❄️', '🌸', '🍕', '🍔', '🍟', '🍩', '☕', '🍷', '🍺',
  '🐶', '🐱', '🐦‍⬛', '🦊', '🐻', '🐼', '🦄', '🐝', '🏠', '🚗', '✈️', '⚽', '🎮', '🎵', '📸', '💡', '⏰', '✅', '❌', '👀'];
// Share Device: the everyday things worth sharing, the name of each kind, and its order in the Types view.
// Everything else (automations, scenes, buttons, helpers, motion and door sensors, power and battery
// readings…) isn't offered. Of the sensors, only temperature and humidity are.
const DEVICE_TYPES = [
  ['light', 'Lights'], ['switch', 'Switches & Plugs'], ['climate', 'Heating'], ['water_heater', 'Heating'],
  ['lock', 'Locks'], ['cover', 'Doors & Blinds'], ['camera', 'Cameras'], ['media_player', 'TV & Speakers'],
  ['fan', 'Fans'], ['vacuum', 'Vacuums'], ['alarm_control_panel', 'Alarm'], ['sensor', 'Temperature & Humidity'],
];
const DEVICE_TYPE = Object.fromEntries(DEVICE_TYPES);
const SENSOR_KINDS = new Set(['temperature', 'humidity']);

Object.assign(CrowMessengerCard.prototype, {

  // A bottom sheet: Cancel, a title, and an optional action on the right.
  _xsheet({ title, body, action, onAction }) {
    const wrap = this._el(`<div class="xs-wrap"><div class="xsheet" role="dialog" aria-label="${esc(title)}">
      <div class="xhd"><button class="cb g" data-xs="close" aria-label="Cancel">${ICON.x}</button><h3>${esc(title)}</h3>
        ${action ? `<button class="pill g accent" data-xs="act" style="height:38px;font-size:16px">${esc(action)}</button>` : '<div style="width:44px"></div>'}</div>
      <div class="xbody">${body}</div></div></div>`);
    const api = {
      wrap, el: wrap.querySelector('.xbody'), actBtn: wrap.querySelector('[data-xs="act"]'),
      close: () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 360); },
    };
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.closest('[data-xs="close"]')) { api.close(); return; }
      if (e.target.closest('[data-xs="act"]') && onAction) {
        const b = api.actBtn;
        // put the keyboard (or a date wheel) away first, so what was typed is in place
        try { const a = this.shadowRoot?.activeElement || document.activeElement; if (a && a !== b && a.blur) a.blur(); } catch (err) { /* */ }
        b.disabled = true;
        try { if (await onAction(api) !== false) api.close(); } catch (err) { this._toast(err.message || 'That didn’t work'); }
        b.disabled = false;
      }
    });
    this._root.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
    return api;
  },

  // A sheet's first field(s) in a rounded box, like Calendar's Title and Location
  _fieldBox(rows) {
    return `<div class="sgroup fbox">${rows.map(r => `<label class="gr frow">${r.icon ? `<span class="gi">${r.icon}</span>` : ''}<input class="gin-text ${r.cls}" placeholder="${esc(r.placeholder)}" maxlength="200" enterkeyhint="next" autocomplete="off"${r.cap ? ' autocapitalize="sentences"' : ''}></label>`).join('')}</div>`;
  },

  // Add stays grey until the sheet has what it needs, as in Calendar
  _needs(sh, ready) {
    const check = () => { if (sh.actBtn) sh.actBtn.disabled = !ready(); };
    sh.el.addEventListener('input', check);
    sh.el.addEventListener('change', check);
    sh.el.addEventListener('click', () => setTimeout(check, 0));
    check();
    return check;
  },

  // the cursor in a field as the sheet opens: straight away (the iPhone only shows the
  // keyboard when this happens inside the tap), and again once it has slid up, if need be
  _focusFirst(input) {
    try { input.focus({ preventScroll: true }); } catch (e) { /* */ }
    setTimeout(() => { if ((this.shadowRoot?.activeElement) !== input) try { input.focus({ preventScroll: true }); } catch (e) { /* */ } }, 380);
  },

  // ── The apps button next to + ───────────────────────────────────────────────
  _appLook(id) {
    return {
      stickers: { name: 'Stickers', bg: 'linear-gradient(160deg,#FFB340,#FF7A00)', icon: XICON.sticker },
      sketch: { name: 'Sketch', bg: 'linear-gradient(160deg,#BF5AF2,#7D3CD8)', icon: XICON.sketch },
      poll: { name: 'Poll', bg: 'linear-gradient(160deg,#30D158,#1FA046)', icon: XICON.poll },
      checkin: { name: 'Check In', bg: 'linear-gradient(160deg,#34C759,#0A9E3C)', icon: XICON.checkin },
      device: { name: 'Share Device', bg: 'linear-gradient(160deg,#41BDF5,#1A8FD0)', icon: XICON.device },
      location: { name: 'Location', bg: 'linear-gradient(160deg,#FF6961,#E0302A)', icon: MICON.locate },
      locreq: { name: 'Where Are You?', bg: 'linear-gradient(160deg,#FF6961,#E0302A)', icon: MICON.locate },
      checklist: { name: 'Checklist', bg: 'linear-gradient(160deg,#FFD60A,#E5A800)', icon: MICON.list },
      event: { name: 'Event', bg: 'linear-gradient(160deg,#FF9F0A,#E07000)', icon: MICON.cal },
      contact: { name: 'Contact', bg: 'linear-gradient(160deg,#A2A2A7,#6E6E73)', icon: MICON.contact },
      camera: { name: 'Camera', bg: 'linear-gradient(160deg,#3A3A3C,#1C1C1E)', icon: MICON.camera },
      status: { name: 'Home Status', bg: 'linear-gradient(160deg,#5E5CE6,#3634A3)', icon: PICON.status },
      timer: { name: 'Timer', bg: 'linear-gradient(160deg,#FF9F0A,#E07000)', icon: PICON.timer },
      games: { name: 'Games', bg: 'linear-gradient(160deg,#FF375F,#C2185B)', icon: PICON.games },
    }[id];
  },

  // What you choose in an app waits in the message box; it's sent when you press Send.
  _stageApp(composer, tid, id, { text = '', extra, label, sub = '' }) {
    const look = this._appLook(id) || {};
    if (!composer?.stageApp) return this._ws('send', { thread_id: tid, text, extra }).catch(err => this._toast(err.message));
    composer.stageApp({ text, extra, label: label || look.name, sub, bg: look.bg, icon: look.icon });
  },

  // Press and hold the send button: Send Later and message effects
  async _chooseEffect(anchor, composer, withLater = false) {
    const fx = (ids) => ids.map(id => [...BUBBLE_FX, ...SCREEN_FX].find(f => f.id === id)).map(f => ({ text: f.name, value: f.id }));
    // Send Later, View Once and Invisible Ink change how it's sent; the effects (which only animate it) live in their own folder
    const items = [];
    if (withLater) items.push({ text: 'Send Later…', value: 'later', icon: XICON.clock });
    if (composer.hasPhotos?.()) items.push({ text: 'Send as View Once', value: 'once', icon: MICON.once });
    items.push({ text: 'Invisible Ink', value: 'invisible', icon: XICON.ink },
      { text: 'Disappearing', icon: XICON.timer, sub: [
        { header: 'Disappears after it’s read' },
        { text: 'In 1 Minute', value: 'ttl:60' }, { text: 'In 1 Hour', value: 'ttl:3600' }, { text: 'In 1 Day', value: 'ttl:86400' },
      ] },
      { sep: true },
      { text: 'Effects', sub: [
        ...fx(['gentle', 'loud', 'slam']),
        { sep: true },
        ...fx(SCREEN_FX.map(f => f.id)),
      ] });
    const v = await this._menu(anchor, items, { align: 'right', above: true });
    if (!v) return;
    if (v === 'later') { this._openSendLater(composer); return; }
    if (v === 'once') { composer.send({ view_once: true }); return; }
    if (v.startsWith('ttl:')) { composer.send({ ttl: +v.slice(4) }); return; }
    composer.send({ effect: v });
  },

  // ── Stickers ────────────────────────────────────────────────────────────────
  _openStickers({ tid, place = null, composer = null }) {
    const s = this._s;
    let tab = s.stickers?.length ? 'mine' : 'emoji', editing = false;
    const sh = this._xsheet({ title: place ? 'Add Sticker' : 'Stickers', body: '<div class="stk-body"></div>' });
    const bodyEl = sh.el.querySelector('.stk-body');
    const render = () => {
      const mine = s.stickers || [];
      bodyEl.innerHTML = `<div class="segc2"><button data-tab="mine" class="${tab === 'mine' ? 'on' : ''}">My Stickers</button><button data-tab="emoji" class="${tab === 'emoji' ? 'on' : ''}">Emoji</button></div>`
        + (tab === 'emoji'
          ? `<div class="egrid">${STICKER_EMOJI.map(e => `<button data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div>`
          : `<div class="sgrid${editing ? ' editing' : ''}"><div class="stile add" data-new role="button">${ICON.plus}New Sticker</div>${mine.map(id => {
            const src = this._stickerSrc(id);
            return `<div class="stile" data-img="${esc(id)}" role="button">${src ? `<img src="${esc(src)}" alt="" data-no-missing draggable="false">` : ''}<span class="sx" data-del="${esc(id)}">${ICON.x}</span></div>`;
          }).join('')}</div>
          ${mine.length ? `<div class="xnote" style="text-align:center"><button data-edit style="color:var(--cm-accent);font-size:15px">${editing ? 'Done' : 'Edit'}</button></div>` : `<div class="xnote">Make stickers from your photos — a circle, a rounded square, or a cut-out picture with a see-through background (PNG).</div>`}`);
    };
    // redrawn when sticker pictures arrive from the server
    this._stickerViews = this._stickerViews || new Set();
    this._stickerViews.add(render);
    const close = sh.close; sh.close = () => { this._stickerViews.delete(render); close(); };
    render();
    const use = async (sticker) => {
      sh.close();
      try {
        if (place) {
          // near the top corner, like peeling a sticker onto the bubble
          const right = place.sender === this._s.me ? 0.12 : 0.88;
          await this._ws('sticker/place', { thread_id: tid, message_id: place.id, sticker, x: right + (Math.random() - 0.5) * 0.16, y: 0.05 + Math.random() * 0.2, rot: Math.round((Math.random() - 0.5) * 30), scale: 1 });
        } else this._stageApp(composer, tid, 'stickers', { extra: { type: 'sticker', sticker }, label: 'Sticker', sub: sticker.emoji || '' });
      } catch (err) { this._toast(err.message); }
    };
    bodyEl.addEventListener('click', async (e) => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; editing = false; render(); return; }
      if (e.target.closest('[data-edit]')) { editing = !editing; render(); return; }
      const del = e.target.closest('[data-del]');
      if (del && editing) { try { const r = await this._ws('stickers/delete', { sticker: del.dataset.del }); s.stickers = r.stickers; render(); } catch (err) { this._toast(err.message); } return; }
      const em = e.target.closest('[data-emoji]');
      if (em) { use({ emoji: em.dataset.emoji }); return; }
      const img = e.target.closest('[data-img]');
      if (img && !editing) { use({ image: img.dataset.img }); return; }
      if (e.target.closest('[data-new]')) this._newSticker(() => { tab = 'mine'; render(); });
    });
  },

  // Make a sticker from a photo: a circle, a rounded square or the picture as it is (keeps see-through PNGs)
  _newSticker(after) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', async () => {
      const f = inp.files[0];
      if (!f) return;
      let img;
      try { img = await loadImage(URL.createObjectURL(f)); } catch (e) { this._toast('Couldn’t open that picture'); return; }
      let shape = /png|webp|gif/.test(f.type) ? 'original' : 'circle', zoom = 1, ox = 0, oy = 0;
      const sh = this._xsheet({
        title: 'New Sticker', action: 'Save',
        body: `<div class="crop-stage"><canvas width="520" height="520"></canvas></div>
          <div class="chipsel" style="justify-content:center">${[['circle', 'Circle'], ['rounded', 'Rounded'], ['original', 'Original']].map(([v, n]) => `<button data-shape="${v}">${n}</button>`).join('')}</div>
          <div class="xlabel">Size</div><input type="range" min="1" max="4" step="0.01" value="1" class="zoom" style="width:100%">
          <div class="xnote">Drag to move the picture. Original keeps a see-through background, so a cut-out photo becomes a sticker shaped like its subject.</div>`,
        onAction: async () => {
          const url = draw(true);
          const r = await this._ws('stickers/save', { image: url });
          this._s.stickers = r.stickers;
          this._stickerImgs = this._stickerImgs || new Map();
          this._stickerImgs.set(r.sticker, url);
          this._toast('Sticker saved');
          after?.();
        },
      });
      const cv = sh.el.querySelector('canvas'), ctx = cv.getContext('2d');
      const draw = (out = false) => {
        const size = out ? 360 : 520;
        const c = out ? document.createElement('canvas') : cv;
        c.width = c.height = size;
        const x = c.getContext('2d');
        x.clearRect(0, 0, size, size);
        x.save();
        if (shape !== 'original') {
          x.beginPath();
          if (shape === 'circle') x.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
          else { const r = size * 0.2; x.roundRect ? x.roundRect(4, 4, size - 8, size - 8, r) : x.rect(4, 4, size - 8, size - 8); }
          x.clip();
        }
        const base = shape === 'original' ? Math.min(size / img.naturalWidth, size / img.naturalHeight) : Math.max(size / img.naturalWidth, size / img.naturalHeight);
        const sc = base * zoom, w = img.naturalWidth * sc, h = img.naturalHeight * sc;
        x.drawImage(img, (size - w) / 2 + ox * size, (size - h) / 2 + oy * size, w, h);
        x.restore();
        if (shape !== 'original') {
          x.lineWidth = size * 0.025; x.strokeStyle = '#fff';
          x.beginPath();
          if (shape === 'circle') x.arc(size / 2, size / 2, size / 2 - 4 - x.lineWidth / 2, 0, Math.PI * 2);
          else if (x.roundRect) x.roundRect(4 + x.lineWidth / 2, 4 + x.lineWidth / 2, size - 8 - x.lineWidth, size - 8 - x.lineWidth, size * 0.2);
          x.stroke();
        }
        return out ? c.toDataURL('image/png') : null;
      };
      const marks = () => sh.el.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('on', b.dataset.shape === shape));
      sh.el.addEventListener('click', (e) => { const b = e.target.closest('[data-shape]'); if (b) { shape = b.dataset.shape; marks(); draw(); } });
      sh.el.querySelector('.zoom').addEventListener('input', (e) => { zoom = parseFloat(e.target.value); draw(); });
      let drag = null;
      cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, ox, oy }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { if (!drag) return; const r = cv.getBoundingClientRect(); ox = drag.ox + (e.clientX - drag.x) / r.width; oy = drag.oy + (e.clientY - drag.y) / r.height; draw(); });
      cv.addEventListener('pointerup', () => { drag = null; });
      marks(); draw();
      void ctx;
    });
    inp.click();
  },

  // ── A list of rows to type into, like the iPhone's Reminders ────────────────
  // A circle, the text, a red ⊖ while you're in the row; Return adds a row, backspace on an
  // empty row takes it away, and "⊕ Add …" at the bottom adds one.
  _listRows(host, { placeholder = 'Item', addLabel = 'Add Item', start = 2, max = 100, values = [] } = {}) {
    host.innerHTML = `<div class="sgroup lrows"></div>`;
    const box = host.querySelector('.lrows');
    const addRow = this._el(`<button type="button" class="lrow ladd"><span class="lpl">${ICON.plusCircle}</span><span>${esc(addLabel)}</span></button>`);
    box.appendChild(addRow);
    const rows = () => [...box.querySelectorAll('.lrow.li')];
    const number = () => rows().forEach((r, i) => { r.querySelector('input').placeholder = `${placeholder} ${i + 1}`; });
    const sync = () => { addRow.hidden = rows().length >= max; box.classList.toggle('one', rows().length <= 1); number(); };
    const make = (after, value = '') => {
      const r = this._el(`<div class="lrow li"><span class="lc"></span><input type="text" maxlength="200" enterkeyhint="next" autocomplete="off"><button type="button" class="ldel" aria-label="Remove">${ICON.minusCircle}</button></div>`);
      r.querySelector('input').value = value;
      box.insertBefore(r, after ? after.nextSibling : addRow);
      sync();
      return r;
    };
    const remove = (r, focusPrev = true) => {
      if (rows().length <= 1) { r.querySelector('input').value = ''; return; }
      const prev = r.previousElementSibling?.classList.contains('li') ? r.previousElementSibling : r.nextElementSibling;
      r.remove(); sync();
      if (focusPrev && prev?.classList.contains('li')) { const i = prev.querySelector('input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    };
    (values.length ? values : Array(start).fill('')).forEach(v => make(null, v));
    // ⊖ takes a row away (pressed before the field loses the cursor)
    box.addEventListener('pointerdown', (e) => { if (e.target.closest('.ldel')) e.preventDefault(); });
    box.addEventListener('click', (e) => {
      const del = e.target.closest('.ldel');
      if (del) { remove(del.closest('.lrow')); return; }
      if (e.target.closest('.ladd')) { if (rows().length < max) make(rows().at(-1)).querySelector('input').focus(); return; }
      const row = e.target.closest('.lrow.li');
      if (row && e.target !== row.querySelector('input')) row.querySelector('input').focus();
    });
    box.addEventListener('keydown', (e) => {
      const inp = e.target.closest('.lrow.li input');
      if (!inp) return;
      const row = inp.closest('.lrow');
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!inp.value.trim()) { inp.blur(); return; }
        // the next row if it's still empty, otherwise a new row underneath
        const next = row.nextElementSibling;
        if (next?.classList.contains('li') && !next.querySelector('input').value) { next.querySelector('input').focus(); return; }
        if (rows().length < max) make(row).querySelector('input').focus();
      } else if (e.key === 'Backspace' && !inp.value && rows().length > 1) {
        e.preventDefault(); remove(row);
      }
    });
    return {
      values: () => rows().map(r => r.querySelector('input').value.trim()).filter(Boolean),
      focus: () => rows()[0]?.querySelector('input').focus(),
    };
  },

  // ── Poll ───────────────────────────────────────────────────────────────────
  _openPoll(tid, composer) {
    let multi = true;
    const sh = this._xsheet({
      title: 'New Poll', action: 'Add',
      body: `${this._fieldBox([{ cls: 'q', placeholder: 'Question', cap: true }])}
        <div class="opts"></div>
        <div class="sgroup"><label class="gr"><div class="gl">Allow More Than One Choice</div><span class="tsw"><input type="checkbox" class="multi" checked><span></span></span></label></div>
        <div class="sfoot">Everyone in the conversation can vote and add choices. Votes update live.</div>`,
      onAction: async () => {
        const q = sh.el.querySelector('.q').value.trim();
        const options = list.values();
        if (!q || options.length < 2) { this._toast('Add a question and at least two choices'); return false; }
        this._stageApp(composer, tid, 'poll', { text: q, extra: { type: 'poll', poll: { options, multi } }, label: `Poll: ${q}`, sub: `${options.length} choices` });
      },
    });
    const list = this._listRows(sh.el.querySelector('.opts'), { placeholder: 'Choice', addLabel: 'Add Choice', max: 12 });
    sh.el.querySelector('.q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); list.focus(); } });
    sh.el.querySelector('.multi').addEventListener('change', (e) => { multi = e.target.checked; });
    this._needs(sh, () => sh.el.querySelector('.q').value.trim() && list.values().length >= 2);
    this._focusFirst(sh.el.querySelector('.q'));
  },

  // ── Check In ───────────────────────────────────────────────────────────────
  // The places are a list like Share Device's: search, Pinned, Recent, then every place (Home
  // first), each with how far away it is. Swipe right to pin, left to hide for everyone (or
  // remove from Recent); press and hold for both. Tapping a place ticks it.
  async _openCheckIn(tid, composer) {
    const h = this._hass, s = this._s;
    let zones = [];
    try { zones = (await this._ws('zones')).zones; } catch (e) { /* none */ }
    if (!zones.length) { this._toast('Add a zone in Home Assistant to use Check In'); return; }
    const REC = 'crowMessengerRecentPlaces', PIN = 'crowMessengerPinnedPlaces';
    const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]').filter(x => typeof x === 'string'); } catch (e) { return []; } };
    const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } };
    let recent = load(REC), pinned = load(PIN);
    // where you are, from your Home Assistant person, for "2.3 miles away"
    const me = Object.values(h.states).find(st => st.entity_id.startsWith('person.') && st.attributes.user_id === s.me && st.attributes.latitude != null);
    const miles = h.config?.unit_system?.length === 'mi';
    const kmTo = (z) => {
      if (!me || z.lat == null) return null;
      const R = 6371, rad = (d) => d * Math.PI / 180;
      const dLat = rad(z.lat - me.attributes.latitude), dLon = rad(z.lon - me.attributes.longitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(me.attributes.latitude)) * Math.cos(rad(z.lat)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    const distText = (km) => { const d = miles ? km / 1.609 : km; return `${d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString()} ${miles ? (d === 1 ? 'mile' : 'miles') : 'km'} away`; };
    const away = (z, km) => {
      if (km == null) return '';
      const radius = (h.states[z.entity_id]?.attributes.radius || 100) / 1000;
      if (km <= radius) return 'You’re here';
      return distText(km);
    };
    let places = [], byId = new Map();
    const build = () => {
      places = zones.map(z => { const km = kmTo(z); return { ...z, town: z.town || '', km, icon: h.states[z.entity_id]?.attributes.icon || (z.entity_id === 'zone.home' ? 'mdi:home' : 'mdi:map-marker'), away: away(z, km) }; })
        .sort((a, b) => (b.entity_id === 'zone.home') - (a.entity_id === 'zone.home') || a.name.localeCompare(b.name));
      byId = new Map(places.map(z => [z.entity_id, z]));
    };
    build();
    const hidden = () => s.shareHidden || new Set();
    const visible = (id) => byId.has(id) && !hidden().has(id);
    let zone = [...recent, ...pinned].find(visible) || (visible('zone.home') ? 'zone.home' : places.find(z => visible(z.entity_id))?.entity_id) || places[0].entity_id;
    let mins = 30, q = '', showHidden = false, opened = null;
    const open = new Set();
    const pad = n => String(n).padStart(2, '0');
    const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const SEARCH = '<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>';
    const CLEAR = '<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>';
    const sh = this._xsheet({
      title: 'Check In', action: 'Add',
      body: `<div class="xnote" style="margin-top:0">Let the people in this conversation know when you arrive. If you haven’t arrived by the time you choose, they’ll be told — with your last location.</div>
        <div class="xlabel">Expected By</div><div class="chipsel mins">${[[30, 'In 30 min'], [60, 'In 1 hour'], [120, 'In 2 hours'], [240, 'In 4 hours'], [0, 'Choose Time']].map(([v, n]) => `<button data-mins="${v}">${n}</button>`).join('')}</div>
        <input type="datetime-local" class="xfield when" style="margin-top:10px" hidden>
        <div class="xlabel">When I Arrive At</div>
        <div class="emo-search"><svg class="emo-search-icon" viewBox="0 0 24 24">${SEARCH}</svg>
          <input class="emo-search-input dq" type="text" placeholder="Search places…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
          <button class="emo-search-clear" type="button" aria-label="Clear search"><svg viewBox="0 0 24 24">${CLEAR}</svg></button></div>
        <div class="dlist plist"></div>
        ${this._zoneCan() ? `<button type="button" class="dhead znew"><span class="dav"><ha-icon icon="mdi:map-marker-plus-outline"></ha-icon></span><span class="db"><span class="dt">New Zone</span><span class="dc">Make a place on the map</span></span></button>` : ''}
        <button type="button" class="dhid"></button>`,
      onAction: async () => {
        const due = mins ? Date.now() + mins * 60000 : new Date(sh.el.querySelector('.when').value).getTime();
        if (!due || due < Date.now() + 60000) { this._toast('Choose a time in the future'); return false; }
        const zn = byId.get(zone)?.name || 'there';
        keep(REC, [zone, ...recent.filter(id => id !== zone)].slice(0, 10));
        this._stageApp(composer, tid, 'checkin', { extra: { type: 'checkin', checkin: { zone, due_ts: Math.round(due) } }, label: `Check In: ${zn}`, sub: `Expected by ${fmtTime(Math.round(due), this._hass)}` });
      },
    });
    const list = sh.el.querySelector('.plist'), input = sh.el.querySelector('.dq'), clr = sh.el.querySelector('.emo-search-clear');
    const hidBtn = sh.el.querySelector('.dhid');
    const row = (z, sec) => this._swipeRowHtml({ id: z.entity_id, sec, icon: `<ha-icon icon="${esc(z.icon)}"></ha-icon>`, name: z.name,
      sub: z.away, pinned: pinned.includes(z.entity_id), tick: z.entity_id === zone });
    const render = () => {
      clr.style.display = q ? 'flex' : 'none';
      const hid = hidden();
      const nHid = places.filter(z => hid.has(z.entity_id)).length;
      if (showHidden && !nHid) showHidden = false;
      hidBtn.textContent = showHidden ? 'Done' : `Show Hidden (${nHid})`;
      hidBtn.hidden = !nHid;
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = (z) => !words.length || words.every(w => `${z.name} ${z.town}`.toLowerCase().includes(w));
      const out = [];
      if (showHidden) {
        out.push(['hidden', 'Hidden from This List', places.filter(z => hid.has(z.entity_id) && hit(z))]);
      } else {
        if (!words.length) {
          out.push(['pinned', 'Pinned', pinned.map(id => byId.get(id)).filter(z => z && !hid.has(z.entity_id))]);
          out.push(['recent', 'Recent', recent.filter(id => !pinned.includes(id)).map(id => byId.get(id)).filter(z => z && !hid.has(z.entity_id)).slice(0, 5)]);
        }
        const rest = places.filter(z => !hid.has(z.entity_id) && hit(z));
        if (!rest.some(z => z.town)) out.push(['all', 'Places', rest]);
        else {
          // by town, nearest first; a town's distance is its nearest place
          const towns = new Map();
          rest.forEach(z => { const k = z.town || ''; if (!towns.has(k)) towns.set(k, []); towns.get(k).push(z); });
          const near = (its) => Math.min(...its.map(z => z.km ?? Infinity));
          const keys = [...towns.keys()].filter(Boolean).sort((a, b) => near(towns.get(a)) - near(towns.get(b)) || a.localeCompare(b));
          if (towns.has('')) keys.push('');
          // the nearest town starts open the first time
          // (and the town of the place that's ticked, so you can see it)
          if (opened === null) { opened = keys[0] || ''; open.add('t:' + opened); const sel = byId.get(zone); if (sel) open.add('t:' + (sel.town || '')); }
          keys.forEach(k => out.push(['t:' + k, k || 'Other Places', towns.get(k), true]));
        }
      }
      const secs = out.filter(([, , its]) => its.length);
      const firstTown = secs.findIndex(x => x[3]);
      list.innerHTML = secs.length ? secs.map(([key, name, its, town], i) => {
        if (!town) return `<div class="dsec open" data-key="${key}"><div class="xlabel${key === 'all' && secs.length > 1 ? ' dlab' : ''}">${esc(name)}</div>
          <div class="sgroup dbox">${its.map(z => row(z, key)).join('')}</div></div>`;
        const isOpen = q || open.has(key) || secs.length === 1;
        const n = Math.min(...its.map(z => z.km ?? Infinity));
        const hereNow = its.some(z => z.away === 'You’re here');
        const sub = `${its.length} ${its.length === 1 ? 'place' : 'places'}${hereNow ? ' · You’re here' : Number.isFinite(n) ? ` · ${distText(n)}` : ''}`;
        return `${i === firstTown && !q ? `<div class="xlabel dlab">Areas</div>` : ''}<div class="dsec${isOpen ? ' open' : ''}" data-key="${esc(key)}">
          <button type="button" class="dhead" data-sec="${esc(key)}"><span class="dav"><ha-icon icon="${key === 't:' ? 'mdi:map-marker-multiple' : 'mdi:city-variant-outline'}"></ha-icon></span><span class="db"><span class="dt">${esc(name)}</span><span class="dc">${esc(sub)}</span></span><span class="dchev">${ICON.chevR}</span></button>
          ${isOpen ? `<div class="sgroup dbox">${its.map(z => row(z, 'all')).join('')}</div>` : ''}</div>`;
      }).join('')
          + (showHidden ? '<div class="sfoot">Hidden places are hidden for everyone in the household. Swipe left on one, or press and hold, to show it again.</div>' : '')
        : `<div class="emo-none">${q ? `No places match “${esc(q)}”` : 'No places'}</div>`;
    };
    const act = async (eid, what) => {
      if (what === 'pin') { pinned = pinned.includes(eid) ? pinned.filter(id => id !== eid) : [...pinned, eid]; keep(PIN, pinned); }
      else if (what === 'remove') { recent = recent.filter(id => id !== eid); keep(REC, recent); }
      else if (what === 'hide' || what === 'unhide') await this._setShareHidden(eid, what === 'hide', render);
      render();
    };
    const rows = this._wireRowSwipes(sh.el, list, { onHold: (r) => this._rowMenu(r, pinned.includes(r.dataset.eid), act) });
    const markMins = () => {
      sh.el.querySelectorAll('[data-mins]').forEach(b => b.classList.toggle('on', +b.dataset.mins === mins));
      sh.el.querySelector('.when').hidden = mins !== 0;
    };
    list.addEventListener('click', (e) => {
      if (rows.consume(e, act)) return;
      const head = e.target.closest('.dhead[data-sec]');
      if (head) { const k = head.dataset.sec; if (open.has(k)) open.delete(k); else open.add(k); render(); return; }
      const r = e.target.closest('.drow[data-eid]');
      if (!r) return;
      zone = r.dataset.eid;
      render();
    });
    sh.el.querySelector('.mins').addEventListener('click', (e) => {
      const m = e.target.closest('[data-mins]'); if (!m) return;
      mins = +m.dataset.mins;
      if (!mins) sh.el.querySelector('.when').value = localInput(new Date(Date.now() + 3600000));
      markMins();
    });
    input.addEventListener('input', () => { q = input.value.trim(); render(); });
    ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
    clr.addEventListener('click', () => { input.value = ''; q = ''; render(); input.focus(); });
    hidBtn.addEventListener('click', () => { showHidden = !showHidden; render(); });
    // a new zone, made on the map, becomes the place you're checking in to
    sh.el.querySelector('.znew')?.addEventListener('click', async () => {
      const z = await this._newZone();
      if (!z?.entity_id) return;
      try { zones = (await this._ws('zones')).zones; } catch (e) { /* */ }
      build();
      if (!byId.has(z.entity_id)) return;
      zone = z.entity_id; q = ''; input.value = ''; showHidden = false;
      open.add('t:' + (byId.get(zone).town || ''));
      render();
      list.querySelector(`.drow[data-eid="${CSS.escape(zone)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    // someone else hides or shows a place while this is open
    const live = () => { if (!sh.wrap.isConnected) { this._shareDevViews.delete(live); return; } render(); };
    (this._shareDevViews ||= new Set()).add(live);
    // the towns arrive from the integration a moment after a new zone is first seen
    const towns = async () => {
      if (!sh.wrap.isConnected) { this._zoneViews.delete(towns); return; }
      try { zones = (await this._ws('zones')).zones; build(); render(); } catch (e) { /* keep what's shown */ }
    };
    (this._zoneViews ||= new Set()).add(towns);
    markMins();
    render();
  },

  // ── Places (Home Assistant zones): Event's location, Send Later and Check In ─
  // Each with its town, icon and how far away it is (from your Home Assistant person).
  async _places() {
    let zones = [];
    try { zones = (await this._ws('zones')).zones || []; } catch (e) { /* none */ }
    const h = this._hass, s = this._s;
    const me = Object.values(h.states).find(st => st.entity_id.startsWith('person.') && st.attributes.user_id === s.me && st.attributes.latitude != null);
    const miles = h.config?.unit_system?.length === 'mi';
    const kmTo = (z) => {
      if (!me || z.lat == null) return null;
      const rad = (d) => d * Math.PI / 180, la = me.attributes.latitude, lo = me.attributes.longitude;
      const a = Math.sin(rad(z.lat - la) / 2) ** 2 + Math.cos(rad(la)) * Math.cos(rad(z.lat)) * Math.sin(rad(z.lon - lo) / 2) ** 2;
      return 2 * 6371 * Math.asin(Math.sqrt(a));
    };
    const distText = (km) => { const d = miles ? km / 1.609 : km; return `${d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString()} ${miles ? (d === 1 ? 'mile' : 'miles') : 'km'} away`; };
    return zones.map(z => {
      const km = kmTo(z), st = h.states[z.entity_id];
      const here = km != null && km <= (st?.attributes.radius || 100) / 1000;
      return { ...z, town: z.town || '', km, away: km == null ? '' : here ? 'You’re here' : distText(km),
        icon: st?.attributes.icon || (z.entity_id === 'zone.home' ? 'mdi:home' : 'mdi:map-marker') };
    }).sort((a, b) => (b.entity_id === 'zone.home') - (a.entity_id === 'zone.home') || a.name.localeCompare(b.name));
  },

  // the place to use, from a menu: Pinned first, then each town (nearest first) as a folder
  async _choosePlace(anchor, places, current, { canNew = false } = {}) {
    let pinned = [];
    try { pinned = JSON.parse(localStorage.getItem('crowMessengerPinnedPlaces') || '[]'); } catch (e) { /* */ }
    const hid = this._s.shareHidden || new Set();
    const vis = places.filter(z => !hid.has(z.entity_id) || z.entity_id === current);
    const item = (z) => ({ text: z.name, value: z.entity_id, checked: z.entity_id === current });
    const items = [];
    const pins = pinned.map(id => vis.find(z => z.entity_id === id)).filter(Boolean);
    if (pins.length) items.push({ header: 'Pinned' }, ...pins.map(item), { sep: true });
    if (vis.some(z => z.town)) {
      const towns = new Map();
      vis.forEach(z => { const k = z.town || ''; if (!towns.has(k)) towns.set(k, []); towns.get(k).push(z); });
      const near = (its) => Math.min(...its.map(z => z.km ?? Infinity));
      const keys = [...towns.keys()].filter(Boolean).sort((a, b) => near(towns.get(a)) - near(towns.get(b)) || a.localeCompare(b));
      if (towns.has('')) keys.push('');
      keys.forEach(k => items.push({ text: k || 'Other Places', value: '', sub: towns.get(k).map(item) }));
    } else items.push(...vis.map(item));
    if (canNew) items.push({ sep: true }, { text: 'New Zone…', value: '__new__', icon: ICON.plus });
    return this._menu(anchor, items, { align: 'right' });
  },

  // ── Swipeable rows, shared by Share Device and Check In ───────────────────
  // Right for Pin; left for Hide (for the whole household), or Remove in Recent, or Show in
  // Show Hidden. Press and hold gives the same in a menu.
  _swipeRowHtml({ id, sec, icon, name, sub, pinned, tick }) {
    const [act, cls, ic, label] = sec === 'recent' ? ['remove', 'del', XICON.minus, 'Remove']
      : sec === 'hidden' ? ['unhide', 'shw', XICON.eye, 'Show'] : ['hide', 'hid', XICON.eyeOff, 'Hide'];
    return `<div class="drow${tick ? ' on' : ''}" data-eid="${esc(id)}" data-sec="${esc(sec)}" role="button">
      <div class="drow-in"><div class="dav">${icon}</div>
        <div class="db"><div class="dn">${esc(name)}</div>${sub ? `<div class="ds">${esc(sub)}</div>` : ''}</div>
        ${tick !== undefined ? `<span class="dtick">${tick ? ICON.check : ''}</span>` : ''}</div>
      <div class="dsw-l"><button type="button" data-act="pin" class="pinb">${XICON.pushpin}<span>${pinned ? 'Unpin' : 'Pin'}</span></button></div>
      <div class="dsw-r"><button type="button" data-act="${act}" class="${cls}">${ic}<span>${label}</span></button></div></div>`;
  },

  async _rowMenu(r, pinned, act) {
    const eid = r.dataset.eid, sec = r.dataset.sec;
    const items = [{ text: pinned ? 'Unpin' : 'Pin', value: 'pin', icon: XICON.pushpin }];
    if (sec === 'recent') items.push({ text: 'Remove from Recent', value: 'remove', icon: XICON.minus });
    items.push(sec === 'hidden' ? { text: 'Show in This List', value: 'unhide', icon: XICON.eye } : { text: 'Hide from This List', value: 'hide', icon: XICON.eyeOff, red: true });
    r.classList.add('held');
    const v = await this._menu(r, items, { align: 'right' });
    r.classList.remove('held');
    if (v) act(eid, v);
  },

  // hide (or show) something in these lists for everyone in the household
  async _setShareHidden(eid, on, render) {
    const s = this._s, flip = (set) => { const n = new Set(set || []); if (on) n.add(eid); else n.delete(eid); return n; };
    s.shareHidden = flip(s.shareHidden);   // straight away; the household list follows
    render();
    try { const r = await this._ws('share_hidden', { entity_id: eid, hidden: on }); s.shareHidden = new Set(r.items || []); } catch (err) {
      on = !on; s.shareHidden = flip(s.shareHidden);
      this._toast(err.message || 'That didn’t work');
    }
  },

  _wireRowSwipes(sheetEl, list, { onHold }) {
    // swiping, as on the Messages list: right for Pin, left for Hide (or Remove)
    const W = 80;
    let sw = null, sx = 0, sy = 0, dx = 0, active = false, pid = null, holdT = null, held = false, closedAt = 0;
    const parts = (r) => [r.querySelector('.drow-in'), r.querySelector('.dsw-l'), r.querySelector('.dsw-r')];
    const place = (r, x, animate) => {
      const [inner, l, rt] = parts(r);
      [inner, l, rt].forEach(e => { e.style.transition = animate ? '' : 'none'; });
      inner.style.transform = x ? `translateX(${x}px)` : '';
      l.style.transform = `translateX(${Math.min(0, Math.max(x, 0) - W)}px)`;
      rt.style.transform = `translateX(${Math.max(0, W + Math.min(x, 0))}px)`;
      l.style.visibility = x > 0 ? 'visible' : '';
      rt.style.visibility = x < 0 ? 'visible' : '';
    };
    const closeAll = (except) => list.querySelectorAll('.drow.open-l, .drow.open-r').forEach(r => {
      if (r === except) return;
      r.classList.remove('open-l', 'open-r');
      place(r, 0, true);
      closedAt = Date.now();
    });
    list.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const r = e.target.closest('.drow');
      if (!r || e.target.closest('.dsw-l, .dsw-r')) return;
      if (list.querySelector('.drow.open-l, .drow.open-r') && !r.matches('.open-l, .open-r')) { closeAll(); sw = null; return; }
      sw = r; sx = e.clientX; sy = e.clientY; dx = 0; active = false; held = false; pid = e.pointerId;
      clearTimeout(holdT);
      holdT = setTimeout(() => { holdT = null; if (sw === r && !active) { held = true; onHold(r); } }, 500);
    });
    list.addEventListener('pointermove', (e) => {
      if (!sw || e.pointerId !== pid) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!active) {
        if (Math.abs(mx) > 8 || Math.abs(my) > 8) { clearTimeout(holdT); holdT = null; }
        if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.4) { active = true; try { sw.setPointerCapture(pid); } catch (err) { /* */ } }
        else if (Math.abs(my) > 10) { sw = null; return; }
      }
      if (active) {
        const base = sw.classList.contains('open-r') ? -W : sw.classList.contains('open-l') ? W : 0;
        dx = clamp(base + mx, -W - 30, W + 30);
        place(sw, dx, false);
      }
    });
    const end = () => {
      clearTimeout(holdT); holdT = null;
      if (!sw) return;
      if (active) {
        const r = sw, openR = dx < -40, openL = dx > 40;
        r.classList.toggle('open-r', openR); r.classList.toggle('open-l', openL);
        place(r, openR ? -W : openL ? W : 0, true);
        // the release of a swipe isn't a tap, but only for a moment and never on the buttons:
        // on iPhone no click follows a swipe, so a lasting guard ate the next real tap
        { const r1 = r, t0 = Date.now(), swallow = (ev) => { if (!ev.target.closest('.dsw-l, .dsw-r') || Date.now() - t0 < 80) { ev.stopPropagation(); ev.preventDefault(); } };
          r1.addEventListener('click', swallow, true); setTimeout(() => r1.removeEventListener('click', swallow, true), 350); }
      }
      sw = null; active = false;
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
    list.addEventListener('contextmenu', (e) => { const r = e.target.closest('.drow'); if (!r) return; e.preventDefault(); if (!held) onHold(r); });
    // tapping anywhere else in the sheet puts a swiped row back
    sheetEl.addEventListener('pointerdown', (e) => { if (!list.contains(e.target)) closeAll(); }, true);
    return {
      closeAll,
      // a tap on a row: a swipe button does its job; a tap that only puts a swipe back, or ends a
      // press and hold, does nothing else
      consume(e, act) {
        const btn = e.target.closest('.dsw-l button, .dsw-r button');
        if (btn) { act(btn.closest('.drow').dataset.eid, btn.dataset.act); return true; }
        const r = e.target.closest('.drow[data-eid]');
        if (!r) return false;
        if (held) { held = false; return true; }
        if (r.matches('.open-l, .open-r') || Date.now() - closedAt < 400) { closeAll(); return true; }
        return false;
      },
    };
  },

  // ── Share a device: grouped by room (or by type), like the visual editor's sections ──
  // Only everyday things are listed. Swipe a row right to pin it, left to hide it from the
  // list for everyone (or, in Recent, to remove it from Recent); press and hold for both.
  _openShareDevice(tid, composer) {
    const h = this._hass, s = this._s;
    const REC = 'crowMessengerRecentDevices', PIN = 'crowMessengerPinnedDevices';
    const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]').filter(x => typeof x === 'string'); } catch (e) { return []; } };
    const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } };
    let recent = load(REC), pinned = load(PIN);
    const areaName = (id) => (id && h.areas?.[id]?.name) || '';
    const devName = (id) => { const d = id && h.devices?.[id]; return (d && (d.name_by_user || d.name)) || ''; };
    const gone = (st) => st.state === 'unavailable' || st.state === 'unknown';
    const same = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
    // 1. the candidates: the right domains, not hidden or diagnostic, sensors only for temperature and humidity
    const cand = Object.values(h.states).map(st => {
      const eid = st.entity_id, dom = eid.split('.')[0];
      if (!DEVICE_TYPE[dom]) return null;
      if (dom === 'sensor' && !SENSOR_KINDS.has(st.attributes.device_class)) return null;
      const reg = h.entities?.[eid];
      if (reg && (reg.hidden || reg.entity_category)) return null;
      const full = st.attributes.friendly_name || eid;
      const dev = reg?.device_id || '';
      return { eid, dom, st, full, reg, dev, dname: devName(dev) };
    }).filter(Boolean);
    const byDev = new Map();
    cand.forEach(x => { if (x.dev) { if (!byDev.has(x.dev)) byDev.set(x.dev, []); byDev.get(x.dev).push(x); } });
    // a device's main entity carries the device's own name
    const isMain = (x) => !x.dev || same(x.full, x.dname);
    const all = cand.filter(x => {
      const mates = x.dev ? byDev.get(x.dev) : [x];
      const otherMain = mates.some(o => o !== x && o.dom !== 'switch' && o.dom !== 'sensor');
      if (x.dom === 'switch') {
        // a switch that's a setting on something else (a camera's siren, a radiator's scale protection)
        if (otherMain && !isMain(x)) return false;
        if (gone(x.st) && !isMain(x)) return false;
      }
      if (x.dom === 'sensor') {
        // temperature and humidity from a sensor of its own, not one built into a radiator or plug
        if (mates.some(o => o.dom !== 'sensor')) return false;
        if (gone(x.st)) return false;
      }
      if (x.dom === 'camera') {
        if (/snapshot/i.test(x.eid) || /snapshot/i.test(x.full)) return false;
        // one camera per device: the one named after it, else the shortest name
        const cams = mates.filter(o => o.dom === 'camera' && !/snapshot/i.test(o.eid) && !/snapshot/i.test(o.full));
        if (cams.length > 1) {
          const best = cams.find(o => same(o.full, o.dname)) || [...cams].sort((a, b) => a.full.length - b.full.length || a.eid.localeCompare(b.eid))[0];
          if (best !== x) return false;
        }
      }
      return true;
    }).map(x => {
      const areaId = x.reg?.area_id || (x.dev && h.devices?.[x.dev]?.area_id) || '';
      const room = areaName(areaId);
      // inside its room, the room's name is left off ("Kitchen Light" → "Light")
      let short = x.full;
      if (room && x.full.toLowerCase().startsWith(room.toLowerCase() + ' ') && x.full.length > room.length + 1) short = x.full.slice(room.length + 1);
      short = short.charAt(0).toUpperCase() + short.slice(1);
      return { eid: x.eid, dom: x.dom, st: x.st, full: x.full, short, room, type: DEVICE_TYPE[x.dom] };
    }).sort((a, b) => a.full.localeCompare(b.full));
    const byId = new Map(all.map(x => [x.eid, x]));
    // each room's own icon from Home Assistant, and one for each type
    const roomIcon = new Map(Object.values(h.areas || {}).filter(a => a.icon).map(a => [a.name, a.icon]));
    const TYPE_ICON = { 'Lights': 'mdi:lightbulb', 'Switches & Plugs': 'mdi:power-plug', 'Heating': 'mdi:radiator', 'Locks': 'mdi:lock',
      'Doors & Blinds': 'mdi:blinds', 'Cameras': 'mdi:cctv', 'TV & Speakers': 'mdi:television', 'Fans': 'mdi:fan',
      'Vacuums': 'mdi:robot-vacuum', 'Alarm': 'mdi:shield-home', 'Temperature & Humidity': 'mdi:thermometer' };
    const hidden = () => s.shareHidden || new Set();
    let view = 'rooms', q = '', showHidden = false;
    const open = new Set();
    const SEARCH = '<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>';
    const CLEAR = '<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>';
    const sh = this._xsheet({
      title: 'Share Device',
      body: `<div class="emo-search"><svg class="emo-search-icon" viewBox="0 0 24 24">${SEARCH}</svg>
          <input class="emo-search-input dq" type="text" placeholder="Search devices or rooms…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
          <button class="emo-search-clear" type="button" aria-label="Clear search"><svg viewBox="0 0 24 24">${CLEAR}</svg></button></div>
        <div class="segc2 dview"><button data-view="rooms" class="on">Rooms</button><button data-view="types">Types</button></div>
        <div class="dlist"></div>
        <div class="sfoot dfoot">The message shows the device live — its state, a button to use it and, for a camera, a picture.</div>
        <button type="button" class="dhid"></button>`,
    });
    const list = sh.el.querySelector('.dlist'), input = sh.el.querySelector('.dq'), clr = sh.el.querySelector('.emo-search-clear');
    const hidBtn = sh.el.querySelector('.dhid');
    const stateText = (st) => (h.formatEntityState ? h.formatEntityState(st) : st.state);
    const row = (x, named, sec) => {
      const where = !named && x.room && (view === 'types' || sec !== 'room') ? x.room : '';
      return this._swipeRowHtml({ id: x.eid, sec, icon: `<ha-state-icon data-eid="${esc(x.eid)}"></ha-state-icon>`, name: named ? x.short : x.full,
        sub: `${where ? `${where} · ` : ''}${stateText(x.st)}`, pinned: pinned.includes(x.eid) });
    };
    // the sections: Pinned, Recent, then rooms (or types), and "No Room" last
    const groups = () => {
      const out = [];
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = (x) => !words.length || words.every(w => `${x.full} ${x.room} ${x.type} ${x.eid}`.toLowerCase().includes(w));
      const hid = hidden();
      if (showHidden) {
        const its = all.filter(x => hid.has(x.eid) && hit(x));
        if (its.length) out.push({ key: 'hidden', name: 'Hidden from This List', items: its, named: false, fixed: true });
        return out;
      }
      const items = all.filter(x => !hid.has(x.eid) && hit(x));
      if (!words.length) {
        const pin = pinned.map(id => byId.get(id)).filter(x => x && !hid.has(x.eid));
        if (pin.length) out.push({ key: 'pinned', name: 'Pinned', items: pin, named: false, fixed: true });
        const rec = recent.filter(id => !pinned.includes(id)).map(id => byId.get(id)).filter(x => x && !hid.has(x.eid)).slice(0, 5);
        if (rec.length) out.push({ key: 'recent', name: 'Recent', items: rec, named: false, fixed: true });
      }
      if (view === 'rooms') {
        const rooms = new Map();
        items.forEach(x => { const k = x.room || ''; if (!rooms.has(k)) rooms.set(k, []); rooms.get(k).push(x); });
        [...rooms.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b)).forEach(k => out.push({ key: 'r:' + k, name: k, items: rooms.get(k), named: true, icon: roomIcon.get(k) || 'mdi:texture-box' }));
        // devices with no room aren't listed here; they're under Types and in search
      } else {
        const order = [...new Set(DEVICE_TYPES.map(t => t[1]))];
        order.forEach(t => { const its = items.filter(x => x.type === t); if (its.length) out.push({ key: 't:' + t, name: t, items: its, named: false, icon: TYPE_ICON[t] || 'mdi:devices' }); });
      }
      return out;
    };
    const render = () => {
      clr.style.display = q ? 'flex' : 'none';
      const nHid = all.filter(x => hidden().has(x.eid)).length;
      if (showHidden && !nHid) showHidden = false;
      hidBtn.textContent = showHidden ? 'Done' : `Show Hidden (${nHid})`;
      hidBtn.hidden = !nHid;
      sh.el.querySelector('.dview').style.display = showHidden ? 'none' : '';
      sh.el.querySelector('.dfoot').style.display = showHidden ? 'none' : '';
      const gs = groups();
      if (!gs.length) { list.innerHTML = `<div class="emo-none">${q ? `No devices match “${esc(q)}”` : view === 'rooms' && all.length ? 'None of your devices are in a room yet — try Types' : 'No devices to share'}</div>`; return; }
      const firstMain = gs.findIndex(g => !g.fixed);
      list.innerHTML = gs.map((g, i) => {
        const lab = i === firstMain && !q ? `<div class="xlabel dlab">${view === 'rooms' ? 'Rooms' : 'Types'}</div>` : '';
        const isOpen = g.fixed || q || open.has(g.key) || gs.length === 1;
        return `${lab}<div class="dsec${isOpen ? ' open' : ''}" data-key="${esc(g.key)}">
          ${g.fixed ? `<div class="xlabel">${esc(g.name)}</div>` : `<button type="button" class="dhead" data-sec="${esc(g.key)}"><span class="dav"><ha-icon icon="${esc(g.icon)}"></ha-icon></span><span class="db"><span class="dt">${esc(g.name)}</span><span class="dc">${g.items.length} ${g.items.length === 1 ? 'device' : 'devices'}</span></span><span class="dchev">${ICON.chevR}</span></button>`}
          ${isOpen ? `<div class="sgroup dbox">${g.items.slice(0, 150).map(x => row(x, g.named, g.fixed ? g.key : 'room')).join('')}</div>` : ''}</div>`;
      }).join('') + (showHidden ? '<div class="sfoot">Hidden devices are hidden for everyone in the household. Swipe left on one, or press and hold, to show it again.</div>' : '');
      this._hydrateExtras(list);
    };
    // the row actions, from a swipe or the press-and-hold menu
    const act = async (eid, what) => {
      if (what === 'pin') {
        pinned = pinned.includes(eid) ? pinned.filter(id => id !== eid) : [...pinned, eid];
        keep(PIN, pinned);
      } else if (what === 'remove') {
        recent = recent.filter(id => id !== eid);
        keep(REC, recent);
      } else if (what === 'hide' || what === 'unhide') {
        await this._setShareHidden(eid, what === 'hide', render);
      }
      render();
    };
    const rows = this._wireRowSwipes(sh.el, list, { onHold: (r) => this._rowMenu(r, pinned.includes(r.dataset.eid), act) });
    input.addEventListener('input', () => { q = input.value.trim(); render(); });
    ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); }));
    clr.addEventListener('click', () => { input.value = ''; q = ''; render(); input.focus(); });
    hidBtn.addEventListener('click', () => { showHidden = !showHidden; render(); sh.el.scrollTop = 0; });
    sh.el.querySelector('.dview').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]'); if (!b) return;
      view = b.dataset.view; open.clear();
      sh.el.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x === b));
      render();
    });
    list.addEventListener('click', (e) => {
      if (rows.consume(e, act)) return;
      const head = e.target.closest('[data-sec].dhead');
      if (head) { const k = head.dataset.sec; if (open.has(k)) open.delete(k); else open.add(k); render(); return; }
      const r = e.target.closest('.drow[data-eid]');
      if (!r) return;
      const x = byId.get(r.dataset.eid);
      if (!x) return;
      keep(REC, [x.eid, ...recent.filter(id => id !== x.eid)].slice(0, 10));
      sh.close();
      this._stageApp(composer, tid, 'device', { extra: { type: 'entity', entity: { entity_id: x.eid } }, label: x.full, sub: x.room || 'Device' });
    });
    // someone else hides or shows a device while this is open
    const live = () => { if (!sh.wrap.isConnected) { this._shareDevViews.delete(live); return; } render(); };
    (this._shareDevViews ||= new Set()).add(live);
    render();
  },

  // ── Send Later ─────────────────────────────────────────────────────────────
  _openSendLater(composer) {
    const pad = n => String(n).padStart(2, '0');
    const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const at = (days, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
    const now = new Date();
    const quick = [
      ['In 1 Hour', new Date(Date.now() + 3600000)],
      ...(now.getHours() < 20 ? [['Tonight', at(0, 20)]] : []),
      ['Tomorrow Morning', at(1, 8)], ['Tomorrow Evening', at(1, 18)],
    ];
    const canPlace = !!this._s.features?.checkin;
    let chosen = quick[0][1], mode = 'time', on = 'arrive', zone = '', places = [];
    const sh = this._xsheet({
      title: 'Send Later', action: 'Schedule',
      body: `<div class="segc2 lmode"><button data-m="time" class="on">At a Time</button><button data-m="place">At a Place</button></div>
        <div class="ltime"><div class="chipsel">${quick.map(([n, d], i) => `<button data-q="${i}">${esc(n)}</button>`).join('')}</div>
          <div class="xlabel">Date and Time</div><input type="datetime-local" class="xfield when">
          <div class="xnote">Home Assistant sends it at that time, even if this page is closed. You can send it sooner or delete it from the conversation.</div></div>
        <div class="lplace" hidden>${canPlace ? `<div class="chipsel lon"><button data-on="arrive" class="on">When I Arrive</button><button data-on="leave">When I Leave</button></div>
          <div class="sgroup"><div class="gr" data-pick role="button"><div class="gl">Place</div><span class="gv pv">Choose…</span><span class="gch">${ICON.chevR}</span></div></div>
          <div class="xnote">Home Assistant sends it the next time it sees you arrive at (or leave) that place, from your Home Assistant person — even if this page is closed.</div>`
          : '<div class="xnote">Sending when you arrive or leave needs a person in Home Assistant linked to your user (Settings → People).</div>'}</div>`,
      onAction: async () => {
        if (mode === 'place') {
          const z = places.find(p => p.entity_id === zone);
          if (!canPlace || !z) { this._toast('Choose a place'); return false; }
          let rec = [];
          try { rec = JSON.parse(localStorage.getItem('crowMessengerRecentPlaces') || '[]'); localStorage.setItem('crowMessengerRecentPlaces', JSON.stringify([zone, ...rec.filter(x => x !== zone)].slice(0, 10))); } catch (e) { /* */ }
          await composer.send({ place: { zone, on, name: z.name } });
          return;
        }
        const t = new Date(sh.el.querySelector('.when').value).getTime();
        if (!t || t < Date.now() + 30000) { this._toast('Choose a time in the future'); return false; }
        await composer.send({ at: t });
      },
    });
    const when = sh.el.querySelector('.when');
    const mark = () => { when.value = localInput(chosen); sh.el.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', quick[+b.dataset.q][1] === chosen)); };
    const showPlace = () => { const z = places.find(p => p.entity_id === zone); const v = sh.el.querySelector('.pv'); if (v) v.textContent = z ? z.name : 'Choose…'; };
    sh.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-q]'); if (b) { chosen = quick[+b.dataset.q][1]; mark(); return; }
      const m = e.target.closest('[data-m]');
      if (m) {
        mode = m.dataset.m;
        sh.el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === m));
        sh.el.querySelector('.ltime').hidden = mode !== 'time';
        sh.el.querySelector('.lplace').hidden = mode !== 'place';
        return;
      }
      const o = e.target.closest('[data-on]');
      if (o) { on = o.dataset.on; sh.el.querySelectorAll('[data-on]').forEach(x => x.classList.toggle('on', x === o)); return; }
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        const v = await this._choosePlace(pick, places, zone, { canNew: this._zoneCan() });
        if (v === '__new__') {
          const z = await this._newZone();
          if (!z?.entity_id) return;
          places = await this._places();
          if (places.some(p => p.entity_id === z.entity_id)) { zone = z.entity_id; showPlace(); }
        } else if (v) { zone = v; showPlace(); }
      }
    });
    when.addEventListener('input', () => sh.el.querySelectorAll('[data-q]').forEach(b => b.classList.remove('on')));
    mark();
    // the place starts as the one you used last, or Home
    if (canPlace) this._places().then(list => {
      places = list;
      let rec = [];
      try { rec = JSON.parse(localStorage.getItem('crowMessengerRecentPlaces') || '[]'); } catch (e) { /* */ }
      zone = rec.find(id => list.some(z => z.entity_id === id)) || (list.some(z => z.entity_id === 'zone.home') ? 'zone.home' : list[0]?.entity_id || '');
      showPlace();
    });
  },

  // ── Disappearing Messages (conversation details) ───────────────────────────
  async _chooseDisappear(anchor, tid) {
    const t = this._s.threads.get(tid);
    const cur = t?.disappear || 0;
    const v = await this._menu(anchor, [{ header: 'Every message disappears after it’s read' }, { text: 'Turn Off', value: '0' }], { align: 'right' });
    if (v == null || +v === cur) return;
    try { await this._ws('disappear', { thread_id: tid, seconds: +v }); } catch (err) { this._toast(err.message); }
  },
});

// ── Sketch & Markup, and full-screen message effects ────────────────────────
const SKETCH_COLOURS = ['#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#0A84FF', '#5E5CE6', '#FF2D55', '#000000'];
const SKETCH_SIZES = [4, 10, 22];

Object.assign(CrowMessengerCard.prototype, {

  // Draw with a finger and send it; or mark up a photo before it's sent (bg = the photo)
  async _openSketch({ bg = null, onDone }) {
    let base = null;
    if (bg) { try { base = await loadImage(bg); } catch (e) { this._toast('Couldn’t open that photo'); return; } }
    const W = base ? Math.min(2048, base.naturalWidth) : 1000;
    const H = base ? Math.round(W * base.naturalHeight / base.naturalWidth) : 1000;
    const el = this._el(`<div class="sketch">
      <div class="skt"><button class="pill g" data-k="cancel">Cancel</button><b>${bg ? 'Markup' : 'Sketch'}</b><button class="pill g accent" data-k="done">Done</button></div>
      <div class="skc"><canvas width="${W}" height="${H}"></canvas></div>
      <div class="skb">
        ${SKETCH_COLOURS.map((c, i) => `<button class="sw${i === (bg ? 1 : 0) ? ' on' : ''}" data-col="${c}" style="background:${c}" aria-label="Colour"></button>`).join('')}
        <span class="brk"></span>
        ${SKETCH_SIZES.map((z, i) => `<button class="sz${i === 1 ? ' on' : ''}" data-size="${z}" aria-label="Size"><i style="width:${4 + i * 5}px;height:${4 + i * 5}px"></i></button>`).join('')}
        <span class="vsep"></span>
        <button class="cb" data-k="undo" aria-label="Undo">${XICON.undo}</button>
        <button class="cb" data-k="clear" aria-label="Clear">${XICON.eraser}</button>
      </div></div>`);
    this._root.appendChild(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    const wrap = el.querySelector('.skc');
    // fit the canvas in the space, keeping its shape
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const sc = Math.min((r.width - 24) / W, (r.height - 8) / H);
      cv.style.width = `${Math.floor(W * sc)}px`; cv.style.height = `${Math.floor(H * sc)}px`;
    };
    requestAnimationFrame(fit);
    let colour = bg ? SKETCH_COLOURS[1] : SKETCH_COLOURS[0], size = SKETCH_SIZES[1];
    const strokes = [];
    let cur = null;
    const scale = () => W / cv.getBoundingClientRect().width;
    const redraw = () => {
      ctx.clearRect(0, 0, W, H);
      if (base) ctx.drawImage(base, 0, 0, W, H);
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      for (const s of strokes) {
        ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (s.p.length === 1) { ctx.beginPath(); ctx.arc(s.p[0][0], s.p[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.beginPath(); ctx.moveTo(s.p[0][0], s.p[0][1]);
        for (let i = 1; i < s.p.length - 1; i++) {
          const mx = (s.p[i][0] + s.p[i + 1][0]) / 2, my = (s.p[i][1] + s.p[i + 1][1]) / 2;
          ctx.quadraticCurveTo(s.p[i][0], s.p[i][1], mx, my);
        }
        const last = s.p[s.p.length - 1]; ctx.lineTo(last[0], last[1]); ctx.stroke();
      }
    };
    redraw();
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * scale(), (e.clientY - r.top) * scale()]; };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      cur = { c: colour, w: size * (W / 500), p: [pt(e)] };
      strokes.push(cur); redraw();
    });
    cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.p.push(pt(e)); redraw(); });
    const end = () => { cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    const close = () => el.remove();
    el.addEventListener('click', async (e) => {
      const col = e.target.closest('[data-col]');
      if (col) { colour = col.dataset.col; el.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b === col)); return; }
      const sz = e.target.closest('[data-size]');
      if (sz) { size = +sz.dataset.size; el.querySelectorAll('.sz').forEach(b => b.classList.toggle('on', b === sz)); return; }
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (k === 'undo') { strokes.pop(); redraw(); }
      if (k === 'clear') { strokes.length = 0; redraw(); }
      if (k === 'cancel') close();
      if (k === 'done') {
        if (!strokes.length && !base) { close(); return; }
        const type = base ? 'image/jpeg' : 'image/png';
        const blob = await new Promise(res => cv.toBlob(res, type, 0.9));
        close();
        if (blob) onDone(new File([blob], base ? 'Markup.jpg' : 'Sketch.png', { type }));
      }
    });
  },

  // ── Full-screen effects ─────────────────────────────────────────────────────
  // Drawn as soft glowing sprites made once and added
  // together where they overlap, things near and far, movement by the clock (so a 120 Hz
  // phone isn't twice as fast), and a fade in and out. Reduce Motion gets a calm version.
  _screenFx(host, kind, m = null) {
    if (!FX_DRAW[kind]) return;
    host.querySelector('.fx-layer')?.remove();
    clearTimeout(this._fxShakeT);
    host.classList.remove('fx-shake');
    const layer = this._el('<div class="fx-layer"><canvas></canvas></div>');
    host.appendChild(layer);
    const cv = layer.querySelector('canvas');
    const r = host.getBoundingClientRect();
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    // sharp on a 3× iPhone, within a pixel budget on a big screen
    const S = Math.max(1, Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(5e6 / (W * H))));
    cv.width = Math.round(W * S); cv.height = Math.round(H * S);
    const ctx = cv.getContext('2d');
    const calm = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // the message the effect came with: its bubble (where it is on screen) and its text
    const row = m?.id ? host.querySelector(`.mrow[data-mid="${CSS.escape(m.id)}"]`) : null;
    const bubEl = row?.querySelector('.bub') || null;
    const rel = (el) => { const b = el.getBoundingClientRect(); return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }; };
    const env = {
      W, H, calm, n: (k) => Math.max(1, Math.round(k * (calm ? 0.4 : 1))),
      bubble: bubEl ? rel(bubEl) : null,
      text: (m?.text || '').replace(/\s+/g, ' ').trim(),
      mine: m ? m.sender === this._s.me : true,
      accent: getComputedStyle(this).getPropertyValue('--cm-accent').trim() || '#0A84FF',
      // the bubbles on screen, for snow to settle on
      bubbles: () => [...host.querySelectorAll('.mrow .bub')].map(rel).filter(b => b.y > -20 && b.y < H && b.w > 30),
      shake: () => {
        if (calm) return;
        host.classList.remove('fx-shake'); void host.offsetWidth; host.classList.add('fx-shake');
        this._fxShakeT = setTimeout(() => host.classList.remove('fx-shake'), 520);
      },
      host,
    };
    const fx = FX_DRAW[kind](env);
    const dur = (fx.dur || 4) * (calm ? 0.8 : 1);
    let t0 = 0, prev = 0, stopped = false;
    const stop = () => { if (stopped) return; stopped = true; fx.end?.(); layer.remove(); };
    layer._stop = stop;
    const tick = (now) => {
      if (stopped) return;
      if (!layer.isConnected) { stop(); return; }
      if (!t0) t0 = prev = now;
      const t = (now - t0) / 1000, dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (t > dur) { stop(); return; }
      // the whole effect fades in quickly and out over its last 0.8 seconds
      cv.style.opacity = String(Math.min(1, t / 0.15, (dur - t) / 0.8));
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      fx.frame(ctx, t, dt, dur);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
});

// ── Screen effect drawing ─────────────────────────────────────────────────────
// Each effect is set up with what it needs (the card's size, the message's bubble and text,
// Reduce Motion) and answers with how long it runs and a frame(ctx, t, dt) that draws it in
// CSS pixels. The shapes (balloons, hearts, petals, flakes…) are drawn once, at three times
// their size so they stay sharp on a 3× iPhone, and reused.
const FX_COL = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#0A84FF', '#5E5CE6', '#FF2D55', '#64D2FF', '#BF5AF2'];
const FX_PAPER = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#0A84FF', '#5E5CE6', '#FF2D55', '#BF5AF2'];
const fxRnd = (a, b) => a + Math.random() * (b - a);
const fxPick = (a) => a[(Math.random() * a.length) | 0];
const fxHex = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
const fxRgba = (c, a) => { const [r, g, b] = Array.isArray(c) ? c : fxHex(c); return `rgba(${r},${g},${b},${a})`; };
// lighter (k > 0) or darker (k < 0)
const fxShade = (c, k) => '#' + fxHex(c).map(x => Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k)))).map(x => x.toString(16).padStart(2, '0')).join('');
const fxEase = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
// a canvas to draw a shape on, at k times its size; lw/lh are its size in CSS pixels
const fxCanvas = (w, h, k = 1) => {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
  const g = c.getContext('2d'); g.scale(k, k); c.lw = w; c.lh = h;
  return [c, g];
};
const _fxSpr = new Map();
const fxSprite = (key, make) => { let s = _fxSpr.get(key); if (!s) { s = make(); _fxSpr.set(key, s); } return s; };
const fxDraw = (ctx, spr, x, y, size, a = 1) => {
  if (a <= 0.003 || size <= 0.3) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(spr, x - size / 2, y - size / 2, size, size);
};
const fxDim = (ctx, W, H, col, a) => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = fxRgba(col, a); ctx.fillRect(0, 0, W, H); };

// a soft glow, white-hot in the middle when hot > 0 (soft things scale up smoothly, so these stay small)
const fxGlow = (col, hot = 0) => fxSprite(`g${col}${hot}`, () => {
  const [c, g] = fxCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (hot) { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(hot, fxRgba(col, 0.9)); } else gr.addColorStop(0, fxRgba(col, 0.9));
  gr.addColorStop(0.35, fxRgba(col, 0.38)); gr.addColorStop(0.7, fxRgba(col, 0.08)); gr.addColorStop(1, fxRgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
});
// out-of-focus light: a soft disc with a brighter rim
const fxBokeh = (col) => fxSprite(`b${col}`, () => {
  const [c, g] = fxCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 31);
  gr.addColorStop(0, fxRgba(col, 0.2)); gr.addColorStop(0.78, fxRgba(col, 0.28)); gr.addColorStop(0.92, fxRgba(col, 0.45)); gr.addColorStop(1, fxRgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
  return c;
});
// a four-pointed glint
const fxGlint = (col) => fxSprite(`s${col}`, () => {
  const [c, g] = fxCanvas(64, 64, 2);
  g.translate(32, 32);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, fxRgba(col, 0.85)); gr.addColorStop(1, fxRgba(col, 0));
  g.fillStyle = gr; g.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? 3.5 : 32; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  return c;
});
// a heart, centred on 0,0 and s wide
const fxHeartPath = (g, s) => {
  g.beginPath(); g.moveTo(0, 0.45 * s);
  g.bezierCurveTo(-0.12 * s, 0.33 * s, -0.5 * s, 0.1 * s, -0.5 * s, -0.15 * s);
  g.bezierCurveTo(-0.5 * s, -0.4 * s, -0.18 * s, -0.52 * s, 0, -0.28 * s);
  g.bezierCurveTo(0.18 * s, -0.52 * s, 0.5 * s, -0.4 * s, 0.5 * s, -0.15 * s);
  g.bezierCurveTo(0.5 * s, 0.1 * s, 0.12 * s, 0.33 * s, 0, 0.45 * s);
  g.closePath();
};
const fxHeart = (col) => fxSprite(`h${col}`, () => {
  const [c, g] = fxCanvas(64, 64, 3);
  g.translate(32, 33);
  const s = 60;
  fxHeartPath(g, s);
  const gr = g.createRadialGradient(-s * 0.18, -s * 0.22, 0, 0, 0, s * 0.62);
  gr.addColorStop(0, fxShade(col, 0.45)); gr.addColorStop(0.45, col); gr.addColorStop(1, fxShade(col, -0.35));
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.22, s * 0.15, s * 0.08, -0.6, 0, Math.PI * 2); g.fill();
  g.restore();
  return c;
});
// a balloon: shiny, a little see-through, lit from the top left with a rim of light opposite; knot at y 111
const fxBalloon = (col) => fxSprite(`bl${col}`, () => {
  const [c, g] = fxCanvas(96, 128, 3);
  const cx = 48, cy = 54, rx = 40, ry = 50;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const gr = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 2, cx, cy, ry * 1.05);
  gr.addColorStop(0, fxShade(col, 0.55)); gr.addColorStop(0.35, col); gr.addColorStop(0.85, fxShade(col, -0.3)); gr.addColorStop(1, fxShade(col, -0.45));
  g.globalAlpha = 0.94; g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  const rim = g.createRadialGradient(cx + rx * 0.5, cy + ry * 0.55, 0, cx + rx * 0.5, cy + ry * 0.55, rx * 0.7);
  rim.addColorStop(0, fxRgba(fxShade(col, 0.45), 0.55)); rim.addColorStop(1, fxRgba(col, 0));
  g.fillStyle = rim; g.fillRect(0, 0, 96, 128);
  g.globalAlpha = 0.85;
  const hl = g.createRadialGradient(cx - rx * 0.38, cy - ry * 0.45, 0, cx - rx * 0.38, cy - ry * 0.45, rx * 0.42);
  hl.addColorStop(0, 'rgba(255,255,255,0.95)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(0, 0, 96, 128);
  g.restore();
  g.globalAlpha = 1; g.fillStyle = fxShade(col, -0.25);
  g.beginPath(); g.moveTo(cx - 6, cy + ry + 7); g.lineTo(cx + 6, cy + ry + 7); g.lineTo(cx, cy + ry - 2); g.closePath(); g.fill();
  return c;
});
const fxFlake = () => fxSprite('flake', () => {
  const [c, g] = fxCanvas(64, 64, 3);
  g.translate(32, 32); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineCap = 'round'; g.lineWidth = 2.6;
  g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 5;
  for (let k = 0; k < 6; k++) {
    g.save(); g.rotate(k * Math.PI / 3); g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, -27); g.moveTo(0, -12); g.lineTo(-8, -19); g.moveTo(0, -12); g.lineTo(8, -19);
    g.moveTo(0, -20); g.lineTo(-5, -25); g.moveTo(0, -20); g.lineTo(5, -25);
    g.stroke(); g.restore();
  }
  return c;
});
const fxPetal = (col) => fxSprite(`p${col}`, () => {
  const [c, g] = fxCanvas(64, 64, 3);
  g.translate(32, 32);
  g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-22, 14, -20, -16, -6, -24); g.lineTo(0, -17); g.lineTo(6, -24); g.bezierCurveTo(20, -16, 22, 14, 0, 26); g.closePath();
  const gr = g.createLinearGradient(0, 26, 0, -24);
  gr.addColorStop(0, fxShade(col, -0.18)); gr.addColorStop(0.5, col); gr.addColorStop(1, fxShade(col, 0.55));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = fxRgba(fxShade(col, -0.35), 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -10); g.stroke();
  return c;
});
const fxLeaf = (col) => fxSprite(`l${col}`, () => {
  const [c, g] = fxCanvas(64, 64, 3);
  g.translate(32, 30);
  const pts = [[0, -28], [6, -14], [18, -20], [14, -6], [27, -4], [16, 6], [20, 16], [6, 12], [2, 22], [-2, 22], [-6, 12], [-20, 16], [-16, 6], [-27, -4], [-14, -6], [-18, -20], [-6, -14]];
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  const gr = g.createRadialGradient(-4, -6, 2, 0, 0, 30);
  gr.addColorStop(0, fxShade(col, 0.35)); gr.addColorStop(0.6, col); gr.addColorStop(1, fxShade(col, -0.35));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = fxRgba(fxShade(col, -0.45), 0.6); g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
  g.moveTo(0, 32); g.lineTo(0, -24); g.moveTo(0, 4); g.lineTo(19, -16); g.moveTo(0, 4); g.lineTo(-19, -16); g.moveTo(0, 9); g.lineTo(22, -3); g.moveTo(0, 9); g.lineTo(-22, -3);
  g.stroke();
  return c;
});
// a soap bubble: clear in the middle, a rainbow film toward the rim, two window highlights
const fxSoap = () => fxSprite('soap', () => {
  const [c, g] = fxCanvas(64, 64, 3);
  const R = 30, cx = 32, cy = 32;
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  g.globalCompositeOperation = 'lighter';
  [[255, 80, 200], [80, 200, 255], [120, 255, 160], [255, 220, 90], [180, 110, 255]].forEach((h, i, all) => {
    const a = i / all.length * Math.PI * 2 + 0.4, x = cx + Math.cos(a) * R * 0.85, y = cy + Math.sin(a) * R * 0.85;
    const gg = g.createRadialGradient(x, y, 0, x, y, R * 0.65); gg.addColorStop(0, fxRgba(h, 0.45)); gg.addColorStop(1, fxRgba(h, 0));
    g.fillStyle = gg; g.fillRect(0, 0, 64, 64);
  });
  const film = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
  film.addColorStop(0, 'rgba(255,255,255,0)'); film.addColorStop(0.85, 'rgba(255,255,255,0.12)'); film.addColorStop(1, 'rgba(255,255,255,0.5)');
  g.fillStyle = film; g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = 'destination-out';
  const hole = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.78); hole.addColorStop(0, 'rgba(0,0,0,0.85)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hole; g.fillRect(0, 0, 64, 64);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(cx - R * 0.4, cy - R * 0.42, R * 0.17, R * 0.08, -0.75, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(cx + R * 0.42, cy + R * 0.46, R * 0.06, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.arc(cx, cy, R - 0.4, 0, Math.PI * 2); g.stroke();
  return c;
});
// a slice of aurora curtain: brightest at its lower edge, fading up through other colours
const fxAuroraStrip = (k) => fxSprite(`au${k}`, () => {
  const [c, g] = fxCanvas(4, 256);
  const sets = [[[60, 255, 160], [40, 220, 200], [150, 90, 255]], [[90, 255, 120], [60, 200, 255], [255, 90, 200]], [[40, 240, 200], [80, 140, 255], [180, 80, 255]]][k % 3];
  const gr = g.createLinearGradient(0, 256, 0, 0);
  gr.addColorStop(0, fxRgba(sets[0], 0)); gr.addColorStop(0.05, fxRgba(sets[0], 0.95)); gr.addColorStop(0.3, fxRgba(sets[0], 0.5));
  gr.addColorStop(0.6, fxRgba(sets[1], 0.25)); gr.addColorStop(0.85, fxRgba(sets[2], 0.12)); gr.addColorStop(1, fxRgba(sets[2], 0));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  return c;
});
// a message bubble with its text, for Echo
const fxEchoSprite = (text, bg, fg) => {
  const font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  const [, m] = fxCanvas(1, 1); m.font = font;
  const tw = Math.min(280, m.measureText(text).width);
  const [c, g] = fxCanvas(tw + 28, 37, 3);
  g.fillStyle = bg; g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, tw + 28, 37, 18.5); else g.rect(0, 0, tw + 28, 37);
  g.fill();
  g.font = font; g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, 14, 19, tw);
  return c;
};
// a bat, wings at w (-1 down … 1 up)
const fxBat = (ctx, x, y, s, w, a) => {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, a);
  const up = w * 13;
  ctx.beginPath(); ctx.moveTo(0, -3);
  ctx.quadraticCurveTo(-8, -6 - up * 0.4, -16, -up); ctx.quadraticCurveTo(-20, -up * 0.6 + 2, -24, -up * 0.3 + 4);
  ctx.quadraticCurveTo(-18, 2, -14, 3); ctx.quadraticCurveTo(-11, 1, -8, 5); ctx.quadraticCurveTo(-5, 2, -2, 5);
  ctx.lineTo(2, 5); ctx.quadraticCurveTo(5, 2, 8, 5); ctx.quadraticCurveTo(11, 1, 14, 3); ctx.quadraticCurveTo(18, 2, 24, -up * 0.3 + 4);
  ctx.quadraticCurveTo(20, -up * 0.6 + 2, 16, -up); ctx.quadraticCurveTo(8, -6 - up * 0.4, 0, -3);
  ctx.moveTo(3.6, 1); ctx.ellipse(0, 1, 3.6, 5, 0, 0, Math.PI * 2);
  ctx.moveTo(-3, -2); ctx.lineTo(-2.4, -7.5); ctx.lineTo(-0.8, -3); ctx.lineTo(0.8, -3); ctx.lineTo(2.4, -7.5); ctx.lineTo(3, -2);
  ctx.fillStyle = '#07030c'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,170,90,0.35)'; ctx.lineWidth = 0.9 / s; ctx.stroke();
  ctx.restore();
};
// a lightning bolt and its branches, as lines
const fxBolt = (x0, y0, x1, y1, spread, depth = 0, out = []) => {
  let pts = [[x0, y0], [x1, y1]], off = spread;
  for (let i = 0; i < 6; i++) {
    const np = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
      np.push(pts[j], [(ax + bx) / 2 + fxRnd(-off, off), (ay + by) / 2 + fxRnd(-off * 0.3, off * 0.3)]);
    }
    np.push(pts[pts.length - 1]); pts = np; off *= 0.55;
  }
  out.push({ pts, w: depth ? 1.1 : 2.4 });
  if (depth < 2) {
    for (let k = 0; k < (depth ? 1 : 3); k++) {
      const [sx, sy] = pts[(pts.length * fxRnd(0.15, 0.7)) | 0];
      fxBolt(sx, sy, sx + fxRnd(-1, 1) * spread * 1.4, sy + fxRnd(0.15, 0.35) * (y1 - y0), spread * 0.5, depth + 1, out);
    }
  }
  return out;
};

// confetti: paper that tumbles, a different shade on its back, catching the light as it turns
const fxPaper = (x, y, vx, vy, z = fxRnd(0.6, 1.15)) => {
  const c = fxPick(FX_PAPER);
  return { x, y, vx, vy, z, c, back: fxShade(c, -0.38), rot: fxRnd(0, 6.3), vr: fxRnd(-6, 6), flip: fxRnd(0, 6.3), vf: fxRnd(6, 14),
    w: fxRnd(7, 11) * z, h: fxRnd(11, 17) * z, strip: Math.random() < 0.12, len: fxRnd(26, 44) * z, ph: fxRnd(0, 6.3) };
};
const fxPaperStep = (p, dt, t) => {
  p.vy += 520 * p.z * dt;
  const drag = Math.exp(-dt * (p.strip ? 2.6 : 3.2));
  p.vx *= drag; p.vy *= drag;
  p.vx += Math.sin(t * 3 + p.ph) * 40 * dt;
  p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
};
const fxPaperDraw = (ctx, p) => {
  const f = Math.cos(p.flip);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, p.z);
  if (p.strip) {
    ctx.strokeStyle = f > 0 ? p.c : p.back; ctx.lineWidth = 3.2 * p.z; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const u = i / 8, x = Math.sin(u * 9 + p.flip) * 5 * p.z, y = (u - 0.5) * p.len; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  } else {
    ctx.scale(1, Math.max(0.08, Math.abs(f)));
    ctx.fillStyle = f > 0 ? p.c : p.back; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    const shine = Math.pow(Math.max(0, f), 6) * 0.45;
    if (shine > 0.02) { ctx.fillStyle = `rgba(255,255,255,${shine.toFixed(3)})`; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
  }
  ctx.restore();
};

// petals and leaves share their drifting
const fxFall = (e, kind) => {
  const { W, H } = e;
  const leaves = kind === 'leaves';
  const cols = leaves ? ['#E8590C', '#D9480F', '#F59F00', '#C92A2A', '#A0522D', '#FAB005'] : ['#FFC0D3', '#FFB3C7', '#FFD6E2', '#FFF0F5', '#F8A5C2'];
  const ps = Array.from({ length: e.n(leaves ? 56 : 95) }, () => {
    const z = fxRnd(0.45, 1.25);
    return { x: fxRnd(-0.25, 1) * W, y: fxRnd(-H * 0.9, H * 0.3), z, s: (leaves ? fxRnd(28, 42) : fxRnd(17, 27)) * z,
      vy: fxRnd(55, 95) * (0.5 + z * 0.6) * (leaves ? 1.25 : 1), vx: fxRnd(20, 50), rot: fxRnd(0, 6.3), vr: fxRnd(-2.5, 2.5),
      flip: fxRnd(0, 6.3), vf: fxRnd(2, 5), ph: fxRnd(0, 6.3), c: fxPick(cols) };
  }).sort((a, b) => a.z - b.z);
  return { dur: 7, frame(ctx, t, dt) {
    fxDim(ctx, W, H, leaves ? '#1a0d04' : '#1a0710', 0.18);
    const gust = 1 + 0.8 * Math.max(0, Math.sin(t * 0.9 - 1));
    for (const p of ps) {
      p.y += p.vy * dt; p.x += (p.vx * gust + Math.sin(t * 1.8 + p.ph) * 30) * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.y > H + 40) continue;
      const spr = leaves ? fxLeaf(p.c) : fxPetal(p.c), f = Math.cos(p.flip);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.max(0.15, Math.abs(f)), 1);
      ctx.globalAlpha = (0.55 + 0.45 * Math.min(1, p.z)) * (f < 0 ? 0.85 : 1);
      ctx.drawImage(spr, -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
    }
  } };
};

const FX_DRAW = {
  confetti: (e) => {
    const { W, H } = e, sp = Math.sqrt(H / 800), ps = [];
    // two bursts from the bottom corners, and more drifting down from the top
    for (let i = 0; i < e.n(120); i++) { const a = fxRnd(-1.38, -0.95), v = fxRnd(1500, 2300) * sp; ps.push(fxPaper(fxRnd(-10, 20), H + 10, Math.cos(a) * v, Math.sin(a) * v)); }
    for (let i = 0; i < e.n(120); i++) { const a = fxRnd(-1.38, -0.95), v = fxRnd(1500, 2300) * sp; ps.push(fxPaper(W - fxRnd(-10, 20), H + 10, -Math.cos(a) * v, Math.sin(a) * v)); }
    for (let i = 0; i < e.n(80); i++) ps.push(fxPaper(fxRnd(0, W), fxRnd(-H * 0.7, -10), fxRnd(-30, 30), fxRnd(40, 120)));
    ps.sort((a, b) => a.z - b.z);
    return { dur: 4.8, frame(ctx, t, dt) { for (const p of ps) { fxPaperStep(p, dt, t); if (p.y < H + 40) fxPaperDraw(ctx, p); } } };
  },

  balloons: (e) => {
    const { W, H } = e, k = Math.min(1.3, W / 390);
    const bs = Array.from({ length: e.n(16) }, (_, i) => {
      const z = fxRnd(0.55, 1.1);
      return { x: fxRnd(0.06, 0.94) * W, y: H + fxRnd(20, H * 0.75), z, vy: fxRnd(170, 240) * (0.6 + z * 0.5) * Math.sqrt(H / 800),
        s: fxRnd(0.62, 0.8) * z * k, ph: fxRnd(0, 6.3), c: FX_COL[i % FX_COL.length] };
    }).sort((a, b) => a.z - b.z);
    return { dur: 5.4, frame(ctx, t, dt) {
      ctx.lineCap = 'round';
      for (const b of bs) {
        b.y -= b.vy * dt;
        const spr = fxBalloon(b.c), w = spr.lw * b.s, h = spr.lh * b.s;
        if (b.y + h * 1.8 < 0) continue;
        const sway = Math.sin(t * 1.3 + b.ph), vx = Math.cos(t * 1.3 + b.ph) * 18 * b.z;
        const x = b.x + sway * 14 * b.z, ky = b.y + 111 * b.s;
        // the string trails behind the way the balloon's moving
        const L = 190 * b.s;
        ctx.globalAlpha = 0.5 * Math.min(1, b.z + 0.2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1 * b.z;
        ctx.beginPath(); ctx.moveTo(x, ky);
        ctx.bezierCurveTo(x - vx * 0.6, ky + L * 0.35, x - vx * 1.2 + Math.sin(t * 2.2 + b.ph) * 6, ky + L * 0.7, x - vx * 1.4, ky + L);
        ctx.stroke();
        ctx.save(); ctx.translate(x, ky); ctx.rotate(-vx * 0.01);
        ctx.globalAlpha = Math.min(1, 0.6 + b.z * 0.4);
        ctx.drawImage(spr, -w / 2, -111 * b.s, w, h); ctx.restore();
      }
    } };
  },

  fireworks: (e) => {
    const { W, H } = e, rockets = [], sparks = [], smoke = [], flashes = [];
    const times = e.calm ? [0.2, 1.4, 2.6] : [0.15, 0.55, 0.95, 1.3, 1.75, 2.1, 2.5, 2.9, 3.3, 3.65];
    const PAL = [['#FF453A', '#FFD60A'], ['#0A84FF', '#64D2FF'], ['#30D158', '#FFFFFF'], ['#BF5AF2', '#FF375F'], ['#FFD60A', '#FF9F0A'], ['#64D2FF', '#FFFFFF'], ['#FF375F', '#FFD60A']];
    const scale = Math.sqrt(Math.min(W, H) / 400);
    let next = 0;
    const burst = (x, y) => {
      const [c1, c2] = fxPick(PAL), type = fxPick(['peony', 'peony', 'ring', 'willow', 'crackle']);
      const n = e.n(type === 'ring' ? 64 : 110), v0 = fxRnd(190, 270) * scale;
      for (let i = 0; i < n; i++) {
        const a = type === 'ring' ? i / n * Math.PI * 2 : fxRnd(0, Math.PI * 2);
        const v = type === 'ring' ? v0 : v0 * (0.35 + 0.65 * Math.sqrt(Math.random()));
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: type === 'willow' ? fxRnd(2, 2.6) : fxRnd(1.1, 1.7),
          c: type === 'willow' ? '#FFC864' : Math.random() < 0.7 ? c1 : c2, type, tr: [], ph: fxRnd(0, 6.3) });
      }
      flashes.push({ x, y, c: c1, t: 0 });
      for (let k = 0; k < 4; k++) smoke.push({ x: x + fxRnd(-30, 30), y: y + fxRnd(-30, 30), s: fxRnd(90, 150) * scale, t: 0, vx: fxRnd(-8, 8) });
    };
    return { dur: 5.8, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#03040c', 0.62 * Math.min(1, t / 0.6));
      while (next < times.length && t >= times[next]) { rockets.push({ x: fxRnd(0.15, 0.85) * W, ty: fxRnd(0.14, 0.45) * H, t: 0, tr: [], wob: fxRnd(0, 6.3) }); next++; }
      // smoke from earlier bursts, drifting
      smoke.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y -= 6 * dt; fxDraw(ctx, fxGlow('#8a90a8'), s.x, s.y, s.s * (1 + s.t * 0.25), 0.07 * Math.max(0, 1 - s.t / 4)); });
      ctx.globalCompositeOperation = 'lighter';
      // the flash of each burst lights up the whole screen
      flashes.forEach(f => {
        f.t += dt; const a = Math.max(0, 0.22 - f.t * 0.8); if (a <= 0) return;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, Math.max(W, H) * 0.9);
        g.addColorStop(0, fxRgba(f.c, a)); g.addColorStop(1, fxRgba(f.c, 0)); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.t += dt;
        const k = fxEase(r.t / 0.75), x = r.x + Math.sin(r.t * 9 + r.wob) * 3, y = H + (r.ty - H) * k;
        r.tr.push([x, y]); if (r.tr.length > 18) r.tr.shift();
        if (r.tr.length > 1) {
          const g = ctx.createLinearGradient(r.tr[0][0], r.tr[0][1], x, y);
          g.addColorStop(0, 'rgba(255,200,120,0)'); g.addColorStop(1, 'rgba(255,220,160,0.9)');
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          ctx.beginPath(); r.tr.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        }
        fxDraw(ctx, fxGlow('#FFD58A', 0.2), x, y, 16, 1);
        if (r.t >= 0.75) { burst(x, y); rockets.splice(i, 1); }
      }
      ctx.lineCap = 'round';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.life += dt;
        if (p.life >= p.max) { sparks.splice(i, 1); continue; }
        const willow = p.type === 'willow', d = Math.exp(-dt * (willow ? 1.5 : 2.2));
        p.vx *= d; p.vy = p.vy * d + (willow ? 75 : 110) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.tr.push([p.x, p.y]); if (p.tr.length > (willow ? 16 : 7)) p.tr.shift();
        const k = p.life / p.max;
        let a = 1 - k * k;
        if (p.type === 'crackle' && k > 0.55) a *= Math.sin(t * 55 + p.ph) > 0 ? 1 : 0.15;
        if (p.tr.length > 1) {
          ctx.globalAlpha = a * 0.5; ctx.strokeStyle = p.c; ctx.lineWidth = willow ? 1.4 : 1.8;
          ctx.beginPath(); p.tr.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        }
        fxDraw(ctx, fxGlow(p.c, 0.18), p.x, p.y, willow ? 10 : 13, a);
        if (p.type === 'crackle' && k > 0.55) fxDraw(ctx, fxGlint('#FFFFFF'), p.x, p.y, 12, a);
      }
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  lasers: (e) => {
    const { W, H } = e, L = Math.hypot(W, H) * 1.25;
    const LC = ['#FF2D55', '#30D158', '#0A84FF', '#BF5AF2', '#64D2FF', '#FFD60A'];
    // emitters along the top, and two in the bottom corners
    const em = [[0.12, -0.01, Math.PI / 2], [0.5, -0.02, Math.PI / 2], [0.88, -0.01, Math.PI / 2], [-0.01, 1.01, -Math.PI / 4], [1.01, 1.01, -Math.PI * 0.75]]
      .map(([x, y, base], i) => ({ x: x * W, y: y * H, base, beams: e.calm ? 2 : 3, ph: i * 1.7 }));
    const haze = Array.from({ length: 8 }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H), s: fxRnd(220, 380), vx: fxRnd(-12, 12), vy: fxRnd(-6, 6) }));
    const beam = (ctx, c, w, a, core) => {
      const gr = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      gr.addColorStop(0, fxRgba(c, 0)); gr.addColorStop(0.32, fxRgba(c, 0.3));
      gr.addColorStop(0.5, core ? 'rgba(255,255,255,0.95)' : fxRgba(c, 0.45));
      gr.addColorStop(0.68, fxRgba(c, 0.3)); gr.addColorStop(1, fxRgba(c, 0));
      ctx.fillStyle = gr; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.lineTo(L, -w / 2); ctx.lineTo(L, w / 2); ctx.lineTo(0, 1.4); ctx.closePath(); ctx.fill();
    };
    return { dur: 5.4, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#020208', 0.7 * Math.min(1, t / 0.5));
      ctx.globalCompositeOperation = 'lighter';
      // haze in the air, lit by the beams
      haze.forEach(h => { h.x += h.vx * dt; h.y += h.vy * dt; fxDraw(ctx, fxGlow('#6a5cff'), h.x, h.y, h.s, 0.07); });
      em.forEach((m, i) => {
        for (let k = 0; k < m.beams; k++) {
          const c = LC[(i * 2 + k + Math.floor(t * 1.1)) % LC.length];
          const a = m.base + Math.sin(t * (0.9 + k * 0.35) + m.ph + k * 2.1) * 0.7 + (k - 1) * 0.22;
          ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(a);
          beam(ctx, c, 110, 0.22, false);   // the glow round it
          beam(ctx, c, 26, 0.9, true);      // the beam, white-hot along its middle
          ctx.restore();
        }
        fxDraw(ctx, fxGlow(LC[(i * 2) % LC.length], 0.15), m.x, m.y, 80, 0.9);
      });
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  hearts: (e) => {
    const { W, H } = e, COLS = ['#FF2D55', '#FF375F', '#FF6482', '#FF8FA3', '#E0245E'];
    const small = Array.from({ length: e.n(26) }, () => {
      const z = fxRnd(0.5, 1.1);
      return { x: fxRnd(0, W), y: H + fxRnd(10, H * 0.7), z, vy: fxRnd(90, 150) * (0.5 + z * 0.6), s: fxRnd(18, 34) * z, ph: fxRnd(0, 6.3), c: fxPick(COLS), rot: fxRnd(-0.3, 0.3) };
    }).sort((a, b) => a.z - b.z);
    const bokeh = Array.from({ length: e.n(14) }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H), s: fxRnd(40, 110), vy: fxRnd(-20, -8), ph: fxRnd(0, 6.3) }));
    return { dur: 4.8, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#2a0010', 0.3 * Math.min(1, t / 0.4));
      ctx.globalCompositeOperation = 'lighter';
      bokeh.forEach(b => { b.y += b.vy * dt; fxDraw(ctx, fxBokeh('#FF5C8A'), b.x, b.y, b.s, 0.5 + 0.3 * Math.sin(t * 2 + b.ph)); });
      ctx.globalCompositeOperation = 'source-over';
      small.forEach(p => {
        p.y -= p.vy * dt;
        const x = p.x + Math.sin(t * 1.6 + p.ph) * 12 * p.z;
        ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot + Math.sin(t * 2 + p.ph) * 0.15);
        ctx.globalAlpha = 0.55 + 0.45 * p.z; ctx.drawImage(fxHeart(p.c), -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
      });
      // the big heart grows in, then beats: lub-dub
      const cyc = (t % 0.95) / 0.95;
      const beat = Math.exp(-Math.pow((cyc - 0.1) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((cyc - 0.3) / 0.05, 2));
      const s = Math.min(W, H) * 0.56 * fxEase(t / 0.5) * (1 + (e.calm ? 0.03 : 0.09) * beat);
      const cx = W / 2, cy = H * 0.44;
      ctx.globalCompositeOperation = 'lighter'; fxDraw(ctx, fxGlow('#FF2D55'), cx, cy, s * 2.1, 0.5 + 0.35 * beat); ctx.globalCompositeOperation = 'source-over';
      if (s < 2) return;
      ctx.save(); ctx.translate(cx, cy); fxHeartPath(ctx, s);
      const gr = ctx.createRadialGradient(-s * 0.18, -s * 0.24, s * 0.02, 0, 0, s * 0.65);
      gr.addColorStop(0, '#FF8FAB'); gr.addColorStop(0.45, '#FF2D55'); gr.addColorStop(1, '#B0002E');
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fill();
      ctx.clip();
      const gl = ctx.createRadialGradient(-s * 0.2, -s * 0.26, 0, -s * 0.2, -s * 0.26, s * 0.2);
      gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-s, -s, 2 * s, 2 * s);
      const rim = ctx.createRadialGradient(s * 0.15, s * 0.35, 0, s * 0.15, s * 0.35, s * 0.45);
      rim.addColorStop(0, 'rgba(255,170,200,0.35)'); rim.addColorStop(1, 'rgba(255,170,200,0)'); ctx.fillStyle = rim; ctx.fillRect(-s, -s, 2 * s, 2 * s);
      ctx.restore();
    } };
  },

  celebration: (e) => {
    const { W, H } = e, GOLD = ['#FFD60A', '#FFE58A', '#FFC24A', '#FFF4C8'], ps = [];
    const bok = Array.from({ length: e.n(12) }, () => ({ x: fxRnd(0.3, 1) * W, y: fxRnd(0, 0.7) * H, s: fxRnd(30, 90), ph: fxRnd(0, 6.3) }));
    const scale = Math.sqrt(Math.min(W, H) / 400);
    let acc = 0;
    return { dur: 4.8, frame(ctx, t, dt) {
      // golden shimmer pouring from the top right corner
      if (t < 2.6) {
        acc += dt * (e.calm ? 90 : 260);
        while (acc >= 1) {
          acc--;
          const a = fxRnd(1.95, 2.75), v = fxRnd(160, 520) * scale;
          ps.push({ x: W + 6, y: -6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: fxRnd(1.6, 2.6), s: fxRnd(5, 13), c: fxPick(GOLD), ph: fxRnd(0, 6.3), glint: Math.random() < 0.18 });
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      const wash = ctx.createRadialGradient(W, 0, 0, W, 0, Math.max(W, H) * 0.8);
      wash.addColorStop(0, `rgba(255,200,80,${(0.22 * Math.min(1, t / 0.4)).toFixed(3)})`); wash.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
      bok.forEach(b => fxDraw(ctx, fxBokeh('#FFD27A'), b.x, b.y, b.s, 0.35 + 0.25 * Math.sin(t * 1.5 + b.ph)));
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.life += dt;
        if (p.life > p.max) { ps.splice(i, 1); continue; }
        const d = Math.exp(-dt * 1.1);
        p.vx *= d; p.vy = p.vy * d + 60 * dt;
        p.x += p.vx * dt + Math.sin(t * 3 + p.ph) * 8 * dt; p.y += p.vy * dt;
        const k = p.life / p.max, a = (1 - k * k) * (0.55 + 0.45 * Math.sin(t * 9 + p.ph));
        fxDraw(ctx, fxGlow(p.c, 0.15), p.x, p.y, p.s, a);
        if (p.glint) fxDraw(ctx, fxGlint('#FFE9A8'), p.x, p.y, p.s * 2.6 * (0.6 + 0.4 * Math.sin(t * 7 + p.ph)), a);
      }
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  spotlight: (e) => {
    const { W, H } = e, b = e.bubble || { x: W * 0.3, y: H * 0.4, w: W * 0.4, h: 50 };
    const tx = b.x + b.w / 2, ty = b.y + b.h / 2, R = Math.max(b.w, b.h) / 2 + 34;
    const sx = -R, sy = H * 0.18;
    return { dur: 4.4, frame(ctx, t) {
      // the light wanders in, settles on the message with a little wobble
      const k = fxEase(t / 1.4), after = t - 1.4;
      const wob = after > 0 ? Math.sin(after * 3) * Math.exp(-after * 1.5) * 10 : 0;
      const x = sx + (tx - sx) * k + wob, y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 70, rr = R * (0.9 + 0.1 * k);
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${(0.8 * Math.min(1, t / 0.4)).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(x, y, rr * 0.7, x, y, rr * 1.15);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // the beam from a light above
      ctx.globalCompositeOperation = 'lighter';
      const bx = W * 0.5, grd = ctx.createLinearGradient(bx, -20, x, y);
      grd.addColorStop(0, 'rgba(255,250,230,0.2)'); grd.addColorStop(1, 'rgba(255,250,230,0.04)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(bx - 14, -20); ctx.lineTo(bx + 14, -20); ctx.lineTo(x + rr * 0.95, y); ctx.lineTo(x - rr * 0.95, y); ctx.closePath(); ctx.fill();
      fxDraw(ctx, fxGlow('#FFF6DA'), x, y, rr * 2.4, 0.16);
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  echo: (e) => {
    const { W, H } = e, b = e.bubble || { x: W / 2 - 60, y: H * 0.45, w: 120, h: 37 };
    let text = e.text || '…';
    if (text.length > 38) text = text.slice(0, 37) + '…';
    const spr = fxEchoSprite(text, e.mine ? e.accent : '#3A3A3C', '#FFFFFF');
    const n = e.n(46);
    const cs = Array.from({ length: n }, (_, i) => ({ d: i / n * 1.4, tx: fxRnd(-0.1, 1.1) * W, ty: fxRnd(-0.05, 1.05) * H, s: fxRnd(0.35, 1.1), rot: fxRnd(-0.12, 0.12) }))
      .sort((a, c) => a.s - c.s);
    const ox = b.x + b.w / 2, oy = b.y + b.h / 2, s0 = Math.min(1.6, b.w / spr.lw);
    return { dur: 3.9, frame(ctx, t) {
      cs.forEach(c => {
        const u = (t - c.d) / 1.1;
        if (u <= 0) return;
        const k = fxEase(u), x = ox + (c.tx - ox) * k, y = oy + (c.ty - oy) * k, sc = s0 * (1 + (c.s - 1) * k);
        const a = Math.min(1, u * 4) * (u > 1.6 ? Math.max(0, 1 - (u - 1.6) / 0.6) : 1);
        if (a <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot * k); ctx.globalAlpha = a * (0.55 + 0.45 * Math.min(1, c.s));
        ctx.drawImage(spr, -spr.lw * sc / 2, -spr.lh * sc / 2, spr.lw * sc, spr.lh * sc); ctx.restore();
      });
    } };
  },

  shootingstar: (e) => {
    const { W, H } = e, P0 = [-40, H * 0.78], P1 = [W * 0.45, H * 0.02], P2 = [W + 60, H * 0.3];
    const at = (u) => { const v = 1 - u; return [v * v * P0[0] + 2 * v * u * P1[0] + u * u * P2[0], v * v * P0[1] + 2 * v * u * P1[1] + u * u * P2[1]]; };
    const trail = [], dust = [];
    const stars = Array.from({ length: e.n(45) }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H * 0.85), s: fxRnd(2, 6), ph: fxRnd(0, 6.3) }));
    return { dur: 3.8, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#020616', 0.55 * Math.min(1, t / 0.4));
      ctx.globalCompositeOperation = 'lighter';
      stars.forEach(s => fxDraw(ctx, fxGlow('#CFE0FF', 0.2), s.x, s.y, s.s, 0.45 + 0.45 * Math.sin(t * 3 + s.ph)));
      const u = t / 1.6;
      if (u <= 1) {
        const [x, y] = at(u);
        trail.push([x, y, t]);
        for (let k = 0; k < 2; k++) dust.push({ x: x + fxRnd(-4, 4), y: y + fxRnd(-4, 4), vx: fxRnd(-20, 20), vy: fxRnd(10, 50), life: 0, max: fxRnd(0.8, 1.8), s: fxRnd(3, 8), ph: fxRnd(0, 6.3) });
      }
      while (trail.length && t - trail[0][2] > 0.4) trail.shift();
      // the tail: wide and white at the star, thin and blue far behind
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const k = i / trail.length;
        ctx.globalAlpha = k * 0.9; ctx.strokeStyle = k > 0.7 ? '#FFFFFF' : k > 0.4 ? '#FFE9A8' : '#9CC2FF'; ctx.lineWidth = 1 + k * 7;
        ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i]; d.life += dt;
        if (d.life > d.max) { dust.splice(i, 1); continue; }
        d.x += d.vx * dt; d.y += d.vy * dt;
        fxDraw(ctx, fxGlint('#FFF1C2'), d.x, d.y, d.s * 2, (1 - d.life / d.max) * (0.5 + 0.5 * Math.sin(t * 12 + d.ph)));
      }
      if (u <= 1) { const [x, y] = at(u); fxDraw(ctx, fxGlow('#FFF6D8', 0.2), x, y, 90, 1); fxDraw(ctx, fxGlint('#FFFFFF'), x, y, 46, 1); }
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  snow: (e) => {
    const { W, H } = e, fl = [];
    const add = (y0) => {
      const z = Math.random(), layer = z < 0.45 ? 0 : z < 0.85 ? 1 : 2;
      fl.push({ x: fxRnd(0, W), y: y0, layer, s: [fxRnd(2.5, 4.5), fxRnd(11, 18), fxRnd(22, 34)][layer], vy: [fxRnd(28, 45), fxRnd(55, 85), fxRnd(110, 150)][layer],
        ph: fxRnd(0, 6.3), rot: fxRnd(0, 6.3), vr: fxRnd(-1, 1), stuck: false });
    };
    for (let i = 0; i < e.n(210); i++) add(fxRnd(-H * 0.9, H * 0.15));
    const rects = e.bubbles();
    let settled = 0;
    return { dur: 7, frame(ctx, t, dt, dur) {
      fxDim(ctx, W, H, '#0a1424', 0.38 * Math.min(1, t / 0.6));
      for (const f of fl) {
        if (!f.stuck) {
          f.y += f.vy * dt; f.x += Math.sin(t * 0.9 + f.ph) * [12, 22, 30][f.layer] * dt; f.rot += f.vr * dt;
          // some come to rest along the tops of the messages
          if (f.layer === 1 && settled < 90) {
            for (const r of rects) {
              if (f.x > r.x + 8 && f.x < r.x + r.w - 8 && f.y >= r.y - 3 && f.y <= r.y + 5 && Math.random() < 0.6) { f.stuck = true; f.y = r.y - 1; f.s *= 0.5; settled++; break; }
            }
          }
          if (f.y > H + 30) { if (t < dur - 3) { f.y = -20; f.x = fxRnd(0, W); } else continue; }
        }
        if (f.layer === 0) fxDraw(ctx, fxGlow('#FFFFFF'), f.x, f.y, f.s * 2.4, 0.9);
        else if (f.layer === 2) fxDraw(ctx, fxGlow('#FFFFFF'), f.x, f.y, f.s * 2, 0.35);   // near the lens, out of focus
        else if (f.stuck) fxDraw(ctx, fxGlow('#FFFFFF', 0.2), f.x, f.y, f.s * 2.4, 0.95);
        else { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = 0.95; ctx.drawImage(fxFlake(), -f.s / 2, -f.s / 2, f.s, f.s); ctx.restore(); }
      }
    } };
  },

  bubbles: (e) => {
    const { W, H, host } = e, bs = [], pops = [];
    let acc = 0;
    const spawn = (y) => { const z = fxRnd(0.5, 1.15); bs.push({ x: fxRnd(0.05, 0.95) * W, y, z, r: fxRnd(16, 38) * z, vy: fxRnd(60, 120) * (0.6 + z * 0.4), ph: fxRnd(0, 6.3), wob: fxRnd(0, 6.3), top: fxRnd(0.02, 0.35) * H }); };
    for (let i = 0; i < e.n(10); i++) spawn(H + fxRnd(10, H * 0.5));
    const pop = (b) => {
      b.dead = true;
      pops.push({ x: b.x, y: b.y, r: b.r, t: 0, drops: Array.from({ length: 10 }, () => { const a = fxRnd(0, 6.3), v = fxRnd(60, 160); return { x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * v, vy: Math.sin(a) * v }; }) });
    };
    // tap a bubble to pop it (taps still reach the conversation)
    const onDown = (ev) => {
      const hr = host.getBoundingClientRect(), x = ev.clientX - hr.left, y = ev.clientY - hr.top;
      const b = bs.find(q => !q.dead && Math.hypot(q.x - x, q.y - y) < q.r + 10);
      if (b) pop(b);
    };
    host.addEventListener('pointerdown', onDown, true);
    return { dur: 7.5, end() { host.removeEventListener('pointerdown', onDown, true); }, frame(ctx, t, dt, dur) {
      fxDim(ctx, W, H, '#06101c', 0.22 * Math.min(1, t / 0.5));
      if (t < dur - 2.5) { acc += dt * (e.calm ? 1.2 : 3); while (acc >= 1) { acc--; spawn(H + 50); } }
      const spr = fxSoap();
      for (const b of bs) {
        if (b.dead) continue;
        b.y -= b.vy * dt; b.x += Math.sin(t * 1.4 + b.ph) * 18 * dt;
        if (b.y < b.top) { pop(b); continue; }
        const q = Math.sin(t * 5 + b.wob) * 0.045;
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1 + q, 1 - q); ctx.globalAlpha = 0.6 + 0.4 * Math.min(1, b.z);
        ctx.drawImage(spr, -b.r, -b.r, b.r * 2, b.r * 2); ctx.restore();
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt;
        if (p.t > 0.45) { pops.splice(i, 1); continue; }
        const k = p.t / 0.45;
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 0.6), 0, Math.PI * 2); ctx.stroke();
        p.drops.forEach(d => { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; fxDraw(ctx, fxGlow('#E6F6FF', 0.2), d.x, d.y, 7, 1 - k); });
      }
    } };
  },

  fireflies: (e) => {
    const { W, H } = e;
    const ff = Array.from({ length: e.n(42) }, () => {
      const z = fxRnd(0.4, 1.3);
      return { x: fxRnd(0, W), y: fxRnd(0.15, 1) * H, z, ax: fxRnd(0.2, 0.6), ay: fxRnd(0.2, 0.5), p1: fxRnd(0, 6.3), p2: fxRnd(0, 6.3), per: fxRnd(1.6, 3.2), off: fxRnd(0, 3), sp: fxRnd(14, 30) };
    }).sort((a, b) => a.z - b.z);
    return { dur: 7, frame(ctx, t, dt) {
      const fin = Math.min(1, t / 0.8);
      fxDim(ctx, W, H, '#020a0c', 0.7 * fin);
      const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
      g.addColorStop(0, 'rgba(10,40,20,0)'); g.addColorStop(1, `rgba(10,40,20,${(0.5 * fin).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ff.forEach(f => {
        f.x += (Math.cos(t * f.ax + f.p1) * f.sp + Math.sin(t * 1.7 + f.p2) * 6) * dt;
        f.y += (Math.sin(t * f.ay + f.p2) * f.sp * 0.7 + Math.cos(t * 1.3 + f.p1) * 5) * dt;
        // each one blinks on its own rhythm
        const ph = ((t + f.off) % f.per) / f.per, a = 0.12 + 0.88 * Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 3);
        fxDraw(ctx, fxGlow('#C8FF5A'), f.x, f.y, 46 * f.z, a * 0.55);
        fxDraw(ctx, fxGlow('#F4FFB8', 0.2), f.x, f.y, 9 * f.z, a);
      });
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  aurora: (e) => {
    const { W, H } = e;
    const ribbons = [0, 1, 2].map(k => ({ k, base: H * (0.24 + k * 0.12), amp: H * fxRnd(0.05, 0.09), f1: fxRnd(1.2, 2.4), f2: fxRnd(3.5, 6), sp: fxRnd(0.25, 0.5) * (k % 2 ? 1 : -1), ht: H * fxRnd(0.28, 0.42), ph: fxRnd(0, 6.3) }));
    const stars = Array.from({ length: e.n(70) }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H * 0.75), s: fxRnd(1.5, 4.5), ph: fxRnd(0, 6.3) }));
    // the curtains are drawn at a quarter size and scaled up, which blurs them softly (and is quick)
    const q = 4, [off, og] = fxCanvas(Math.ceil(W / q), Math.ceil(H / q));
    return { dur: 7, frame(ctx, t) {
      fxDim(ctx, W, H, '#01040f', 0.72 * Math.min(1, t / 0.8));
      ctx.globalCompositeOperation = 'lighter';
      stars.forEach(s => fxDraw(ctx, fxGlow('#DDE8FF', 0.2), s.x, s.y, s.s, 0.4 + 0.4 * Math.sin(t * 2.3 + s.ph)));
      const grow = fxEase(t / 1.5);
      og.globalCompositeOperation = 'source-over'; og.clearRect(0, 0, off.width, off.height); og.globalCompositeOperation = 'lighter';
      ribbons.forEach(r => {
        const spr = fxAuroraStrip(r.k);
        for (let x = 0; x < off.width; x++) {
          const u = x * q / W;
          const y = r.base + Math.sin(u * r.f1 * Math.PI * 2 + t * r.sp + r.ph) * r.amp + Math.sin(u * r.f2 * Math.PI * 2 - t * r.sp * 1.7) * r.amp * 0.35;
          const bright = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(u * 9 + t * 1.3 + r.ph), 2);   // the folds of the curtain
          const h = r.ht * (0.7 + 0.3 * Math.sin(u * 5 + t * 0.8 + r.k)) * grow;
          if (h < 1) continue;
          og.globalAlpha = bright * 0.6; og.drawImage(spr, x, (y - h) / q, 1, h / q);
        }
      });
      ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, off.width * q, off.height * q);
      ctx.globalCompositeOperation = 'source-over';
    } };
  },

  petals: (e) => fxFall(e, 'petals'),
  leaves: (e) => fxFall(e, 'leaves'),

  thunder: (e) => {
    const { W, H } = e, wind = -0.22;
    const drops = Array.from({ length: e.n(260) }, () => { const z = fxRnd(0.3, 1.2); return { x: fxRnd(-0.1, 1.2) * W, y: fxRnd(-H, H), z, v: fxRnd(900, 1300) * z, len: fxRnd(14, 26) * z }; });
    const splash = [], strikes = (e.calm ? [1.2] : [0.9, 2.7, 3.15]).map(at => ({ at, bolt: null, t: 0 }));
    let flash = 0;
    return { dur: 6, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#0b1220', 0.62 * Math.min(1, t / 0.6));
      // rain slanting in the wind: far drops faint and thin, near ones brighter
      ctx.lineCap = 'round';
      [[0, 0.75, 0.28, 0.7], [0.75, 9, 0.5, 1.3]].forEach(([lo, hi, a, lw]) => {
        ctx.globalAlpha = a; ctx.strokeStyle = 'rgb(190,210,235)'; ctx.lineWidth = lw; ctx.beginPath();
        for (const d of drops) { if (d.z < lo || d.z >= hi) continue; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * wind, d.y - d.len); }
        ctx.stroke();
      });
      for (const d of drops) {
        d.y += d.v * dt; d.x += d.v * wind * dt;
        if (d.y > H) { if (d.z > 0.8 && Math.random() < 0.5) splash.push({ x: d.x, y: H - fxRnd(0, 8), t: 0 }); d.y = -fxRnd(10, 80); d.x = fxRnd(-0.1, 1.3) * W; }
      }
      ctx.strokeStyle = 'rgba(200,220,240,0.9)'; ctx.lineWidth = 1;
      for (let i = splash.length - 1; i >= 0; i--) {
        const s = splash[i]; s.t += dt;
        if (s.t > 0.25) { splash.splice(i, 1); continue; }
        ctx.globalAlpha = (1 - s.t / 0.25) * 0.6; ctx.beginPath(); ctx.ellipse(s.x, s.y, 3 + s.t * 40, 1 + s.t * 8, 0, Math.PI, 0); ctx.stroke();
      }
      strikes.forEach(s => {
        if (!s.bolt && t >= s.at) { const x0 = fxRnd(0.2, 0.8) * W; s.bolt = fxBolt(x0, -10, x0 + fxRnd(-0.25, 0.25) * W, H * fxRnd(0.6, 0.95), W * 0.08); flash = e.calm ? 0.35 : 0.85; e.shake(); }
        if (!s.bolt || s.t > 0.5) return;
        s.t += dt;
        // it flickers: on, off, on again, then fades
        const a = s.t < 0.08 ? 1 : s.t < 0.14 ? 0.3 : s.t < 0.22 ? 0.9 : Math.max(0, 1 - (s.t - 0.22) / 0.28);
        ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        s.bolt.forEach(seg => {
          [[seg.w * 7, 'rgba(120,150,255,0.12)'], [seg.w * 2.6, 'rgba(180,200,255,0.5)'], [seg.w, 'rgba(255,255,255,0.95)']].forEach(([lw, c]) => {
            ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
            seg.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          });
        });
        ctx.globalCompositeOperation = 'source-over';
      });
      if (flash > 0) { ctx.globalAlpha = 1; ctx.fillStyle = `rgba(225,232,255,${(flash * 0.55).toFixed(3)})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 3.2); }
    } };
  },

  poppers: (e) => {
    const { W, H } = e, sp = Math.sqrt(H / 800), ps = [], streamers = [], fired = [null, null], glows = [];
    const mouth = (side) => [side ? W - 30 - Math.sin(0.55) * 58 : 30 + Math.sin(0.55) * 58, H - 18 - Math.cos(0.55) * 58];
    const fire = (side, t) => {
      fired[side] = t;
      const [x0, y0] = mouth(side), dir = side ? -1 : 1;
      for (let i = 0; i < e.n(110); i++) { const a = -Math.PI / 2 + dir * fxRnd(0.2, 0.8), v = fxRnd(900, 1900) * sp; ps.push(fxPaper(x0, y0, Math.cos(a) * v, Math.sin(a) * v)); }
      for (let i = 0; i < e.n(9); i++) {
        const a = -Math.PI / 2 + dir * fxRnd(0.25, 0.65), v = fxRnd(1000, 1600) * sp;
        streamers.push({ pts: Array.from({ length: 16 }, () => [x0, y0]), vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: fxPick(FX_PAPER), w: fxRnd(3, 5), ph: fxRnd(0, 6.3) });
      }
      glows.push({ x: x0, y: y0, t: 0 });
      ps.sort((a, b) => a.z - b.z);
    };
    const cone = (ctx, side, rec, a) => {
      ctx.save(); ctx.translate(side ? W - 30 : 30, H - 18); ctx.rotate((side ? -1 : 1) * 0.55); ctx.scale(1, 1 - 0.2 * rec);
      ctx.globalAlpha = a;
      const h = 58, w = 28;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.closePath();
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#B8860B'); g.addColorStop(0.5, '#FFE08A'); g.addColorStop(1, '#A87400');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,59,48,0.9)'; ctx.lineWidth = 5;
      for (let i = -2; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-w, -i * 12); ctx.lineTo(w, -i * 12 - 14); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#6b4a00'; ctx.beginPath(); ctx.ellipse(0, -h, w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    return { dur: 4.8, frame(ctx, t, dt) {
      if (fired[0] === null && t >= 0.3) fire(0, t);
      if (fired[1] === null && t >= 0.6) fire(1, t);
      for (const p of ps) { fxPaperStep(p, dt, t); if (p.y < H + 40) fxPaperDraw(ctx, p); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const s of streamers) {
        s.vy += 380 * dt; const d = Math.exp(-dt * 2.2); s.vx = s.vx * d + Math.sin(t * 4 + s.ph) * 60 * dt; s.vy *= d;
        s.pts[0][0] += s.vx * dt; s.pts[0][1] += s.vy * dt;
        for (let i = 1; i < s.pts.length; i++) {
          const p = s.pts[i], q = s.pts[i - 1]; p[1] += 40 * dt;
          const dx = p[0] - q[0], dy = p[1] - q[1], dd = Math.hypot(dx, dy) || 1;
          if (dd > 9) { p[0] = q[0] + dx / dd * 9; p[1] = q[1] + dy / dd * 9; }
        }
        ctx.globalAlpha = 0.95; ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.beginPath();
        s.pts.forEach(([x, y], i) => { const cx = x + Math.sin(i * 1.3 + s.ph + t * 5) * 4; if (i) ctx.lineTo(cx, y); else ctx.moveTo(cx, y); });
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      glows.forEach(g => { g.t += dt; fxDraw(ctx, fxGlow('#FFD27A', 0.15), g.x, g.y, 150, Math.max(0, 0.9 - g.t * 3)); });
      ctx.globalCompositeOperation = 'source-over';
      [0, 1].forEach(side => cone(ctx, side, fired[side] === null ? 0 : Math.exp(-(t - fired[side]) * 10), fxEase(t / 0.25)));
    } };
  },

  halloween: (e) => {
    const { W, H } = e;
    const fog = Array.from({ length: e.n(10) }, () => ({ x: fxRnd(-0.3, 1.1) * W, y: fxRnd(0.55, 1.05) * H, s: fxRnd(220, 380), vx: fxRnd(10, 28) * (Math.random() < 0.5 ? -1 : 1) }));
    const bats = [];
    const add = (d, big) => { const dir = Math.random() < 0.5 ? 1 : -1; bats.push({ d, x: dir > 0 ? -40 : W + 40, y: fxRnd(0.14, 0.6) * H, vx: dir * fxRnd(110, 190), ph: fxRnd(0, 6.3), fr: fxRnd(9, 13), s: fxRnd(0.6, 1.15), big, bob: fxRnd(0, 6.3) }); };
    for (let i = 0; i < e.n(14); i++) add(fxRnd(0, 3.2), false);
    if (!e.calm) add(1.6, true);
    return { dur: 6.5, frame(ctx, t, dt) {
      fxDim(ctx, W, H, '#241038', 0.68 * Math.min(1, t / 0.6));
      const mx = W * 0.8, my = H * 0.13, mr = Math.min(W, H) * 0.09;
      ctx.globalCompositeOperation = 'lighter'; fxDraw(ctx, fxGlow('#FF9A3C'), mx, my, mr * 7, 0.38); ctx.globalCompositeOperation = 'source-over';
      const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, '#FFE9B8'); mg.addColorStop(1, '#F2A14A');
      ctx.globalAlpha = 0.95; ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      fog.forEach(f => { f.x += f.vx * dt; fxDraw(ctx, fxGlow('#a58fd0'), f.x, f.y, f.s, 0.26); });
      bats.forEach(b => {
        if (t < b.d) return;
        const u = t - b.d, flap = Math.sin(u * b.fr + b.ph);
        if (b.big) {
          // one swoops at you
          const k = Math.min(1, u / 1.4);
          fxBat(ctx, W * 0.5 + Math.sin(u * 2) * W * 0.1, H * 0.45 + Math.sin(u * 3) * 20, 0.6 + k * k * 6, flap, k < 0.75 ? 1 : (1 - k) / 0.25);
          return;
        }
        fxBat(ctx, b.x + b.vx * u, b.y + Math.sin(u * 2.2 + b.bob) * 18, b.s * 1.3, flap, 1);
      });
    } };
  },
};

// Words that play an effect by themselves, like iMessage (turn off in the card's settings)
const FX_WORDS = [
  [/\bhappy\s+birthday\b/i, 'balloons'], [/\bcongrat(s|ulations)\b/i, 'confetti'], [/\bhappy\s+new\s+year\b/i, 'fireworks'],
  [/\bmerry\s+(christmas|xmas)\b|\bhappy\s+holidays\b/i, 'snow'], [/\bhappy\s+hallowe'?en\b/i, 'halloween'], [/\bpew\s*pew\b/i, 'lasers'],
  [/\bi\s+love\s+you\b/i, 'hearts'], [/\bgood\s*night\b|\bnight\s+night\b|\bsweet\s+dreams\b/i, 'fireflies'],
  [/\bhappy\s+anniversary\b|\bwell\s+done\b/i, 'celebration'], [/\bhappy\s+(easter|spring)\b/i, 'petals'],
];
const fxForWords = (text) => (FX_WORDS.find(([re]) => re.test(text || '')) || [])[1] || null;

// ── Home Status, Shared Timer and Games ──────────────────────────────────────
// Home Status reads Home Assistant live on each phone; the timer and the games are kept by
// Home Assistant, which checks every move and sends the "time's up" and "your turn" alerts.
const PICON = {
  status: _s('<path d="M3.5 11.2L12 4l8.5 7.2"/><path d="M5.8 9.6V20h12.4V9.6"/><path d="M9.6 14.6l1.8 1.8 3.4-3.6"/>', 'stroke-width="2.1"'),
  timer: _s('<circle cx="12" cy="13.2" r="7.6"/><path d="M12 9.2v4.2l2.6 1.8M9.6 2.8h4.8M12 2.8v2.8M18.6 6.4l1.4-1.4"/>', 'stroke-width="2.1"'),
  games: _s('<path d="M7.2 8h9.6a4.2 4.2 0 014.1 3.4l.9 4.8a2.6 2.6 0 01-4.5 2.2L15.6 16H8.4l-1.7 2.4a2.6 2.6 0 01-4.5-2.2l.9-4.8A4.2 4.2 0 017.2 8z"/><path d="M8 10.6v3.4M6.3 12.3h3.4"/><circle cx="15.6" cy="11.4" r=".6" fill="currentColor"/><circle cx="17.4" cy="13.4" r=".6" fill="currentColor"/>', 'stroke-width="2"'),
  lock: _s('<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 017.6 0v2.7"/>', 'stroke-width="2.1"'),
  unlock: _s('<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 017.4-1.2"/>', 'stroke-width="2.1"'),
  shield: _s('<path d="M12 3l7.5 2.8v5.6c0 4.6-3.2 8.2-7.5 9.6-4.3-1.4-7.5-5-7.5-9.6V5.8z"/>', 'stroke-width="2.1"'),
  door: _s('<path d="M6 20.5V4.5a1 1 0 011-1h10a1 1 0 011 1v16M3.5 20.5h17"/><circle cx="14.6" cy="12.4" r=".9" fill="currentColor"/>', 'stroke-width="2.1"'),
  bulb: _s('<path d="M9.2 17.6h5.6M10 20.8h4M12 3.2a6 6 0 00-3.6 10.8c.6.5.9 1.2.9 2v1.6h5.4V16c0-.8.3-1.5.9-2A6 6 0 0012 3.2z"/>', 'stroke-width="2"'),
  x: _s('<path d="M6 6l12 12M18 6L6 18"/>', 'stroke-width="3.2"'),
  o: _s('<circle cx="12" cy="12" r="7.2"/>', 'stroke-width="3.2"'),
  disc: _s('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 010 16z" fill="currentColor"/>', 'stroke-width="2.2"'),
  crown: _s('<path d="M4 17.5L3 8l5 4 4-6.5 4 6.5 5-4-1 9.5z"/><path d="M5 20.5h14"/>', 'stroke-width="2.1"'),
  anchor: _s('<circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V21M8 11h8M4.5 13.5a7.5 7.5 0 0015 0"/>', 'stroke-width="2.1"'),
};
// ── Skins ───────────────────────────────────────────────────────────────────
// Each person picks a skin for their own screens (⋯ → Skin in a conversation, or
// Filter → Skin in the chat list) and only they see it. A skin is a look "in the
// style of" a well-known messenger or desktop - its colours, fonts, bubble shapes
// and bars, drawn here in CSS. No logos, artwork or sounds are copied.
//   mode: a fixed light/dark look (otherwise it follows the card's Theme setting)
//   win: drawn inside an old-style window with a title bar
//   log: messages read as a transcript ("Sarah says:", "<Sarah> …") instead of bubbles
//   more: what the ⋯ button in a conversation says in that skin
const SKINS = [
  { id: 'iphone', name: 'iPhone', group: 'modern' },
  { id: 'whatsapp', name: 'WhatsApp', group: 'modern', more: 'More' },
  { id: 'messenger', name: 'Messenger', group: 'modern' },
  { id: 'telegram', name: 'Telegram', group: 'modern' },
  { id: 'signal', name: 'Signal', group: 'modern' },
  { id: 'discord', name: 'Discord', group: 'modern', mode: 'dark' },
  { id: 'material', name: 'Material You', group: 'modern' },
  { id: 'msn', name: 'MSN 2005', group: 'retro', mode: 'light', win: true, log: true, more: 'Tools' },
  { id: 'icq', name: 'ICQ 2000', group: 'retro', mode: 'light', win: true, log: true, more: 'Options' },
  { id: 'aim', name: 'AIM', group: 'retro', mode: 'light', win: true, log: true, more: 'Edit' },
  { id: 'yahoo', name: 'Yahoo!', group: 'retro', mode: 'light', win: true, log: true, more: 'Skins' },
  { id: 'win98', name: 'Windows 98', group: 'retro', mode: 'light', win: true, log: true, more: 'Settings' },
  { id: 'xp', name: 'Windows XP', group: 'retro', mode: 'light', win: true, more: 'Chats' },
  { id: 'aqua', name: 'Mac OS X Aqua', group: 'retro', mode: 'light', win: true, buddy: true, more: 'View' },
  { id: 'bbm', name: 'BlackBerry Messenger', group: 'retro', mode: 'light', log: true, more: 'Menu' },
  { id: 'nokia', name: 'Nokia SMS', group: 'retro', mode: 'light', log: true, more: 'Options' },
  { id: 'irc', name: 'IRC / Terminal', group: 'retro', mode: 'dark', log: true, more: '/skin' },
];
const SKIN_BY = Object.fromEntries(SKINS.map(k => [k.id, k]));

const SKIN_CSS = `
.thread .tright { display: flex; align-items: center; gap: 8px; }
.tmore .tlbl { display: none; }
/* ═══ Shared by every skin other than iPhone ═══════════════════════════════ */
:host([data-skin]) ha-card { font-family: var(--sk-font, var(--cm-font)); letter-spacing: normal; border-radius: var(--sk-card-r, var(--ha-card-border-radius, 12px)); }
:host([data-skin]) .page { background: var(--cm-bg); }
:host([data-skin]) .edge { display: none; }
:host([data-skin]) .g { backdrop-filter: none; -webkit-backdrop-filter: none; background: var(--sk-ctl, var(--cm-bg2)); border: var(--sk-ctl-bd, 0); box-shadow: var(--sk-ctl-sh, none); color: var(--sk-ctl-text, var(--cm-text)); }
:host([data-skin]) .cb { border-radius: var(--sk-ctl-r, 50%); }
:host([data-skin]) .pill, :host([data-skin]) .capsule { border-radius: var(--sk-pill-r, 22px); }
:host([data-skin]) .cb:active, :host([data-skin]) .pill:active, :host([data-skin]) .capsule button:active { transform: none; filter: brightness(0.92); }
:host([data-skin]) .pill.accent { background: var(--sk-send, var(--cm-accent)); color: var(--sk-send-text, #fff); box-shadow: none; }
:host([data-skin]) .av { border-radius: var(--sk-av-r, 50%); }
:host([data-skin]) .av-group .av { border-color: var(--cm-bg); }

/* the header bar of the chat list and of a conversation */
:host([data-skin]) :is(.clist, .thread) > .top { height: var(--sk-bar-h, 56px); min-height: 0; padding: 0 6px; gap: 2px; background: var(--sk-bar, var(--cm-bg2)); color: var(--sk-bar-text, var(--cm-text));
  border-bottom: var(--sk-bar-bd, 0.5px solid var(--cm-sep)); box-shadow: var(--sk-bar-sh, none); pointer-events: auto; }
:host([data-skin]) :is(.clist, .thread) > .top :is(.cb, .pill, .capsule, .capsule button) { background: none; border: 0; box-shadow: none; color: inherit; }
:host([data-skin]) :is(.clist, .thread) > .top .pill { height: 36px; padding: 0 10px; font-size: 15px; }
:host([data-skin]) :is(.clist, .thread) > .top .cb { width: 40px; height: 40px; }
:host([data-skin]) .clist > .top .title { opacity: 1 !important; position: static; transform: none; flex: 1; order: -1; max-width: none; padding-left: 10px; text-align: left;
  font-size: var(--sk-title-fs, 21px); font-weight: var(--sk-title-fw, 700); font-family: var(--sk-title-ff, inherit); font-style: var(--sk-title-fst, normal); letter-spacing: var(--sk-title-ls, normal); }
:host([data-skin]) .clist .large-title { display: none; }
:host([data-skin]) .clist > .scroll { margin-top: var(--sk-bar-h, 56px); }
:host([data-skin]) .clist .bottom { padding: 8px 10px; gap: 8px; background: var(--sk-comp, var(--cm-bg2)); border-top: var(--sk-comp-bd, 0.5px solid var(--cm-sep)); }
:host([data-skin]) .clist .bottom .cb { width: 42px; height: 42px; background: var(--sk-fab, var(--cm-accent)); color: var(--sk-fab-text, #fff); border: var(--sk-fab-bd, 0); border-radius: var(--sk-fab-r, var(--sk-ctl-r, 50%)); box-shadow: var(--sk-fab-sh, none); }
:host([data-skin]) .searchbar { height: 42px; background: var(--sk-field, var(--cm-fill)); border: var(--sk-field-bd, 0); border-radius: var(--sk-field-r, 21px); box-shadow: var(--sk-field-sh, none); color: var(--sk-field-text, var(--cm-text)); }
:host([data-skin]) .searchbar input { font-size: 15.5px; color: inherit; }
:host([data-skin]) .list-pad { padding-bottom: 70px; }

/* chat list rows */
:host([data-skin]) .clist .row { padding: var(--sk-row-pad, 8px 14px 8px 2px); background: var(--sk-row, transparent); }
:host([data-skin]) .clist .row .name { font-size: var(--sk-name-fs, 16.5px); font-weight: var(--sk-name-fw, 600); color: var(--sk-name, var(--cm-text)); }
:host([data-skin]) .clist .row .preview { font-size: var(--sk-prev-fs, 14.5px); -webkit-line-clamp: var(--sk-prev-lines, 1); min-height: 0; }
:host([data-skin]) .clist .row .date { font-size: 12.5px; color: var(--sk-date, var(--cm-text2)); }
:host([data-skin]) .clist .row .date svg { display: none; }
:host([data-skin]) .clist .row .dot i { background: var(--sk-unread, var(--cm-accent)); }
:host([data-skin]) .clist .row::after { left: var(--sk-sep-left, 78px); transform: none; background: var(--sk-row-sep, var(--cm-sep)); }
:host([data-skin]) .clist .row .av, :host([data-skin]) .clist .row .av-group { zoom: var(--sk-lav-zoom, 0.94); }

/* conversation header: avatar and name sit in the bar beside Back */
:host([data-skin]) .thread .th-head { top: 0; left: 50px; transform: none; height: var(--sk-bar-h, 56px); max-width: calc(100% - 150px);
  display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 10px; row-gap: 0; align-content: center; align-items: center; justify-items: start; color: var(--sk-bar-text, var(--cm-text)); }
:host([data-skin]) .thread .th-head > :first-child { grid-row: 1 / span 2; zoom: var(--sk-hav-zoom, 0.8); }
:host([data-skin]) .thread .th-head .namepill { background: none; border: 0; box-shadow: none; padding: 0; height: auto; font-size: var(--sk-hname-fs, 16.5px); font-weight: var(--sk-hname-fw, 600); color: inherit; min-width: 0; max-width: 100%; }
:host([data-skin]) .thread .th-head .namepill svg { display: none; }
:host([data-skin]) .thread .th-head .namepill:last-child { grid-row: 1 / span 2; }
:host([data-skin]) .thread .th-head .presence { background: none; backdrop-filter: none; -webkit-backdrop-filter: none; padding: 0; margin: 0; font-size: 12px; color: var(--sk-bar-sub, var(--cm-text2)); }
:host([data-skin]) .thread .tright { display: flex; align-items: center; gap: 0; }
:host([data-skin]) .tmore .tlbl { display: none; }
:host([data-retro]) .tmore { width: auto !important; padding: 0 10px; border-radius: var(--sk-ctl-r, 3px); }
:host([data-retro]) .tmore svg { display: none; }
:host([data-retro]) .tmore .tlbl { display: inline; font-size: 13.5px; font-weight: 600; white-space: nowrap; }
:host([data-retro]) .tmore .tlbl::after { content: ' ▾'; font-size: 10px; }
:host([data-skin]) .thread .msgs { padding: calc(var(--sk-bar-h, 56px) + 8px) 10px calc(var(--cm-composer-h, 66px) + 20px); }
:host([data-skin]) .page.thread { background: var(--sk-wall, var(--cm-bg)); }
:host([data-skin]) .page.thread.has-bg .chatbg::after { background: none; }
:host([data-retro]) .page.thread .chatbg { display: none; }
:host([data-retro]) .page.thread.has-bg :is(.stamp, .sys, .receipt) { color: var(--cm-text2); text-shadow: none; }
:host([data-skin]) .pinbar { top: calc(var(--sk-bar-h, 56px) + 6px); }

/* bubbles */
:host([data-skin]) .bub .tail { display: none; }
:host([data-skin]) .bub { border-radius: var(--sk-bub-r, 8px); font-size: var(--sk-bub-fs, 15.5px); padding: var(--sk-bub-pad, 6px 10px 7px); box-shadow: var(--sk-bub-sh, none); line-height: var(--sk-bub-lh, 1.35); }
:host([data-skin]) .me .bub { background: var(--sk-sent-bg, var(--cm-sent)); border: var(--sk-sent-bd, 0); }
:host([data-skin]) .them .bub { background: var(--sk-recv-bg, var(--cm-recv)); border: var(--sk-recv-bd, 0); }
:host([data-skin]) .mrow.me.first .bub { border-top-right-radius: var(--sk-bub-corner, var(--sk-bub-r, 8px)); }
:host([data-skin]) .mrow.them.first .bub { border-top-left-radius: var(--sk-bub-corner, var(--sk-bub-r, 8px)); }
:host([data-skin]) .bub.emoji { box-shadow: none; border: 0 !important; }
:host([data-skin]) :is(.filebub, .audio, .typing) { border-radius: var(--sk-bub-r, 8px); }
:host([data-skin]) .stamp, :host([data-skin]) .sys { color: var(--sk-stamp, var(--cm-text2)); }
:host([data-skin]) .sender { color: var(--sk-sender, var(--cm-text2)); }
/* the time inside the bubble, bottom right (WhatsApp, Telegram, Signal…) */
:host(:is([data-skin="whatsapp"], [data-skin="telegram"], [data-skin="signal"])) .bub[data-t]::after { content: attr(data-t); float: right; font-size: 11px; line-height: 1; opacity: 0.62; margin: 9px -2px -3px 10px; white-space: nowrap; }
:host(:is([data-skin="whatsapp"], [data-skin="telegram"], [data-skin="signal"])) .bub.emoji[data-t]::after { display: none; }

/* message box */
:host([data-skin]) .thread .composer { padding: 8px; gap: 6px; background: var(--sk-comp, var(--cm-bg2)); border-top: var(--sk-comp-bd, 0.5px solid var(--cm-sep)); }
:host([data-skin]) .composer .crow { gap: 6px; }
:host([data-skin]) .composer .cb { width: 40px; height: 40px; background: var(--sk-comp-btn, transparent); border: var(--sk-comp-btn-bd, 0); box-shadow: none; color: var(--sk-icon, var(--cm-accent)); border-radius: var(--sk-ctl-r, 50%); }
:host([data-skin]) .composer .field { min-height: 40px; background: var(--sk-field, var(--cm-fill)); border: var(--sk-field-bd, 0); border-radius: var(--sk-field-r, 20px); box-shadow: var(--sk-field-sh, none); color: var(--sk-field-text, var(--cm-text)); }
:host([data-skin]) .composer .field .rbox { min-height: 40px; padding: 9px 0; font-size: 16px; color: inherit; }
:host([data-skin]) .composer .field .rbox.rb-empty::before { top: 9px; color: var(--sk-ph, var(--cm-text2)); }
:host([data-skin]) .composer .field .inrow { padding-left: 12px; }
:host([data-skin]) .composer .field .fbtn { width: 32px; height: 32px; color: var(--sk-ph, var(--cm-text2)); }
:host([data-skin]) .composer .field .send { background: var(--sk-send, var(--cm-accent)); color: var(--sk-send-text, #fff); border-radius: var(--sk-send-r, 50%); border: var(--sk-send-bd, 0); box-shadow: var(--sk-send-sh, none); }
:host([data-skin]) .newpill { bottom: 70px; }

/* menus, sheets and popups pick up the skin's colours */
:host([data-skin]) .menu { background: var(--sk-menu, var(--cm-glass-solid)); border-radius: var(--sk-menu-r, 12px); border: var(--sk-menu-bd, 0.5px solid var(--cm-sep)); box-shadow: var(--sk-menu-sh, var(--cm-shadow)); color: var(--sk-menu-text, var(--cm-text)); animation-duration: 0.12s; }
:host([data-skin]) .menu button { font-size: var(--sk-menu-fs, 16px); padding: var(--sk-menu-pad, 10px 16px); }
:host([data-skin]) .menu button:hover, :host([data-skin]) .menu button:active { background: var(--sk-hl, var(--cm-fill)); color: var(--sk-hl-text, inherit); }
:host([data-skin]) .menu button:hover .mc, :host([data-skin]) .menu button:active .mc { color: inherit; }
:host([data-skin]) .menu .mh { color: var(--sk-mh, var(--cm-text2)); font-size: 12px; }
:host([data-skin]) .xsheet { border-radius: var(--sk-sheet-r, 18px 18px 0 0); backdrop-filter: none; -webkit-backdrop-filter: none; }
:host([data-skin]) .crow-ios-alert { border-radius: var(--sk-alert-r, 14px); }
:host([data-retro]) .crow-ios-alert, :host([data-retro]) .menu { animation: none; }
:host([data-skin]) :is(.ask-card, .ask-offer) { border-radius: var(--sk-menu-r, 12px); background: var(--sk-menu, var(--cm-glass-solid)) !important; border: var(--sk-menu-bd, 0.5px solid var(--cm-sep)); box-shadow: none; color: var(--sk-menu-text, var(--cm-text)); }
:host([data-skin]) .schips button { border-radius: var(--sk-pill-r, 15px); }
:host([data-retro]) .ask-sp { display: none; }
:host([data-retro]) .ask-card .cu-h { color: var(--sk-mh, var(--cm-accent)); }

/* ═══ Old-style window: a title bar across the top of the card ═════════════ */
:host([data-win]) ha-card { border: var(--sk-win-bd, 0); }
:host([data-win]) ha-card::before { content: var(--sk-win-title, 'Crow Messenger'); position: absolute; left: 0; right: 0; top: 0; height: var(--sk-win-h, 28px); z-index: 2;
  display: flex; align-items: center; justify-content: var(--sk-win-align, flex-start); padding: var(--sk-win-pad, 0 80px 0 10px); box-sizing: border-box; white-space: nowrap; overflow: hidden;
  background: var(--sk-win-bg); color: var(--sk-win-text, #fff); font: var(--sk-win-font, 700 13px/1 Tahoma, Verdana, sans-serif); text-shadow: var(--sk-win-ts, none); border-bottom: var(--sk-win-bb, 0); }
:host([data-win]) ha-card::after { content: ''; position: absolute; z-index: 3; top: var(--sk-btn-top, 5px); right: var(--sk-btn-right, 6px); left: var(--sk-btn-left, auto);
  width: var(--sk-btn-w, 60px); height: var(--sk-btn-h, 18px); background: var(--sk-btns); background-repeat: no-repeat; pointer-events: none; }
:host([data-win]) .cm-root { top: var(--sk-win-h, 28px); }

/* ═══ Transcript skins: "Sarah says:", "<Sarah> …" instead of bubbles ══════ */
:host([data-log]) .mrow { display: flex; flex-direction: var(--sk-log-dir, row); align-items: baseline; justify-content: flex-start; gap: 0 6px; margin-top: var(--sk-log-gap, 3px); }
:host([data-log]) .mrow.first { margin-top: var(--sk-log-gap-first, 8px); }
:host([data-log]) .mrow .mav, :host([data-log]) .sender { display: none; }
:host([data-log]) .mcol { max-width: 100%; min-width: 0; flex: 1; align-items: flex-start !important; }
:host([data-log]) .bub { background: none !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; padding: var(--sk-log-pad, 0) !important;
  color: var(--cm-text) !important; font-size: var(--sk-bub-fs, 14px); line-height: var(--sk-bub-lh, 1.4); }
:host([data-log]) .bub.emoji { font-size: 32px; padding: 0 !important; }
:host([data-log]) .mrow::before { flex-shrink: 0; white-space: nowrap; font-weight: var(--sk-who-fw, 700); color: var(--sk-who-them, var(--cm-text2)); font-size: var(--sk-who-fs, 14px); }
:host([data-log]) .mrow.me::before { color: var(--sk-who-me, var(--cm-text2)); }
:host([data-log]) .thread .msgs { gap: 0; }
:host([data-log]) .receipt { text-align: left; margin-left: var(--sk-log-indent, 0); }

/* ═══ WhatsApp ═══════════════════════════════════════════════════════════ */
:host([data-skin="whatsapp"]) {
  --sk-font: "Segoe UI", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif;
  --cm-accent: #00a884; --cm-bg: #ffffff; --cm-bg2: #f0f2f5; --cm-text: #111b21; --cm-text2: #667781; --cm-sep: #e9edef;
  --cm-sent: #d9fdd3; --cm-sent-text: #111b21; --cm-recv: #ffffff; --cm-recv-text: #111b21; --cm-glass-solid: #ffffff; --cm-sheet-solid: #ffffff;
  --sk-bar: #008069; --sk-bar-text: #fff; --sk-bar-sub: rgba(255,255,255,0.8); --sk-bar-bd: 0; --sk-title-fs: 21px; --sk-title-fw: 600;
  --sk-wall: #efeae2 radial-gradient(circle at 20% 20%, rgba(0,0,0,0.035) 0 2px, transparent 2.5px) 0 0 / 26px 26px;
  --sk-bub-r: 8px; --sk-bub-corner: 0; --sk-bub-sh: 0 1px 0.5px rgba(11,20,26,0.13); --sk-bub-pad: 6px 9px 7px;
  --sk-comp: transparent; --sk-comp-bd: 0; --sk-field: #fff; --sk-field-r: 22px; --sk-field-sh: 0 1px 0.5px rgba(11,20,26,0.13); --sk-icon: #54656f;
  --sk-send: #00a884; --sk-fab: #00a884; --sk-fab-r: 14px; --sk-unread: #25d366; --sk-date: #667781; --sk-row-sep: #e9edef;
  --sk-stamp: #54656f; --sk-menu-r: 4px; --sk-menu-bd: 0; --sk-menu-sh: 0 2px 5px rgba(11,20,26,0.26), 0 2px 10px rgba(11,20,26,0.16);
}
:host([data-skin="whatsapp"][data-mode="dark"]) {
  --cm-bg: #111b21; --cm-bg2: #202c33; --cm-text: #e9edef; --cm-text2: #8696a0; --cm-sep: #222d34;
  --cm-sent: #005c4b; --cm-sent-text: #e9edef; --cm-recv: #202c33; --cm-recv-text: #e9edef; --cm-glass-solid: #233138; --cm-sheet-solid: #111b21;
  --sk-bar: #202c33; --sk-bar-text: #e9edef; --sk-bar-sub: #8696a0; --sk-wall: #0b141a radial-gradient(circle at 20% 20%, rgba(255,255,255,0.03) 0 2px, transparent 2.5px) 0 0 / 26px 26px;
  --sk-field: #2a3942; --sk-icon: #8696a0; --sk-stamp: #8696a0; --sk-row-sep: #222d34;
}
:host([data-skin="whatsapp"]) .stamp { display: table; margin: 12px auto 6px; padding: 5px 12px; border-radius: 8px; background: var(--cm-recv); box-shadow: 0 1px 0.5px rgba(11,20,26,0.13); font-size: 12px; }
:host([data-skin="whatsapp"]) .stamp b { font-weight: 500; }

/* ═══ Messenger ══════════════════════════════════════════════════════════ */
:host([data-skin="messenger"]) {
  --sk-font: "Helvetica Neue", Helvetica, "Segoe UI", Roboto, Arial, sans-serif;
  --cm-accent: #0a7cff; --cm-bg: #ffffff; --cm-bg2: #ffffff; --cm-text: #050505; --cm-text2: #65676b; --cm-sep: transparent;
  --cm-sent-text: #fff; --cm-recv: #f0f0f0; --cm-recv-text: #050505; --cm-glass-solid: #ffffff; --cm-sheet-solid: #ffffff;
  --sk-sent-bg: linear-gradient(135deg, #a033ff 0%, #ff5c87 55%, #ff8c5f 100%) fixed; --sk-bar: #ffffff; --sk-bar-bd: 0; --sk-bar-sh: 0 1px 2px rgba(0,0,0,0.08);
  --sk-title-fs: 24px; --sk-title-fw: 800; --sk-bub-r: 18px; --sk-bub-pad: 8px 12px; --sk-bub-fs: 15.5px; --sk-icon: #0a7cff;
  --sk-comp: #ffffff; --sk-comp-bd: 0; --sk-field: #f0f2f5; --sk-field-r: 20px; --sk-send: transparent; --sk-send-text: #0a7cff;
  --sk-fab: #f0f2f5; --sk-fab-text: #050505; --sk-ctl: #f0f2f5; --sk-unread: #0a7cff; --sk-row-sep: transparent; --sk-menu-r: 12px;
}
:host([data-skin="messenger"][data-mode="dark"]) {
  --cm-bg: #000; --cm-bg2: #242526; --cm-text: #e4e6eb; --cm-text2: #b0b3b8; --cm-recv: #303030; --cm-recv-text: #e4e6eb; --cm-glass-solid: #242526; --cm-sheet-solid: #18191a;
  --sk-bar: #000; --sk-bar-sh: 0 1px 0 #242526; --sk-comp: #000; --sk-field: #303030; --sk-fab: #303030; --sk-fab-text: #e4e6eb; --sk-ctl: #303030;
}
:host([data-skin="messenger"]) .mrow.me:not(.first) .bub { border-top-right-radius: 5px; }
:host([data-skin="messenger"]) .mrow.them:not(.first) .bub { border-top-left-radius: 5px; }
:host([data-skin="messenger"]) .thread > .top .cb { color: var(--cm-accent); }
:host([data-skin="messenger"]) .clist .row .name { font-weight: 500; }

/* ═══ Telegram ═══════════════════════════════════════════════════════════ */
:host([data-skin="telegram"]) {
  --sk-font: Roboto, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --cm-accent: #3390ec; --cm-bg: #ffffff; --cm-bg2: #f4f4f5; --cm-text: #000; --cm-text2: #707579; --cm-sep: #e7e7e7;
  --cm-sent: #e3fee0; --cm-sent-text: #000; --cm-recv: #ffffff; --cm-recv-text: #000; --cm-glass-solid: #ffffff; --cm-sheet-solid: #ffffff;
  --sk-bar: #517da2; --sk-bar-text: #fff; --sk-bar-sub: rgba(255,255,255,0.75); --sk-bar-bd: 0; --sk-title-fs: 20px; --sk-title-fw: 500;
  --sk-wall: linear-gradient(160deg, #c9daa5 0%, #8fb98b 40%, #7ca8a0 70%, #a6c38a 100%);
  --sk-bub-r: 15px; --sk-bub-corner: 4px; --sk-bub-sh: 0 1px 1.5px rgba(0,0,0,0.16); --sk-bub-pad: 6px 10px 7px;
  --sk-comp: #ffffff; --sk-comp-bd: 0; --sk-field: transparent; --sk-field-r: 0; --sk-icon: #8d969c; --sk-send: transparent; --sk-send-text: #3390ec;
  --sk-fab: #3390ec; --sk-unread: #3390ec; --sk-stamp: #fff; --sk-menu-r: 10px; --sk-menu-bd: 0;
}
:host([data-skin="telegram"][data-mode="dark"]) {
  --cm-bg: #17212b; --cm-bg2: #242f3d; --cm-text: #f5f5f5; --cm-text2: #708499; --cm-sep: #101921;
  --cm-sent: #2b5278; --cm-sent-text: #fff; --cm-recv: #182533; --cm-recv-text: #f5f5f5; --cm-glass-solid: #17212b; --cm-sheet-solid: #17212b;
  --sk-bar: #17212b; --sk-wall: #0e1621; --sk-comp: #17212b; --sk-icon: #6c7883;
}
:host([data-skin="telegram"]) .stamp { display: table; margin: 10px auto 6px; padding: 3px 10px; border-radius: 12px; background: rgba(0,0,0,0.22); color: #fff; font-size: 13px; font-weight: 500; }
:host([data-skin="telegram"]) .stamp b { font-weight: 500; }
:host([data-skin="telegram"]) .receipt { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }

/* ═══ Signal ═════════════════════════════════════════════════════════════ */
:host([data-skin="signal"]) {
  --sk-font: Inter, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif;
  --cm-accent: #2c6bed; --cm-bg: #ffffff; --cm-bg2: #f6f6f6; --cm-text: #1b1b1b; --cm-text2: #5e5e5e; --cm-sep: transparent;
  --cm-sent: #2c6bed; --cm-sent-text: #fff; --cm-recv: #e9e9e9; --cm-recv-text: #1b1b1b; --cm-glass-solid: #ffffff; --cm-sheet-solid: #ffffff;
  --sk-bar: #ffffff; --sk-bar-bd: 0; --sk-title-fs: 20px; --sk-title-fw: 600;
  --sk-bub-r: 18px; --sk-bub-pad: 7px 12px 8px; --sk-comp: #ffffff; --sk-comp-bd: 0; --sk-field: #f0f0f0; --sk-field-r: 20px;
  --sk-icon: #3b3b3b; --sk-fab: #e9e9e9; --sk-fab-text: #1b1b1b; --sk-fab-r: 16px; --sk-unread: #2c6bed; --sk-row-sep: transparent; --sk-menu-r: 10px;
}
:host([data-skin="signal"][data-mode="dark"]) {
  --cm-bg: #121212; --cm-bg2: #1b1b1b; --cm-text: #e9e9e9; --cm-text2: #a0a0a0; --cm-recv: #3b3b3b; --cm-recv-text: #e9e9e9; --cm-glass-solid: #2b2b2b; --cm-sheet-solid: #1b1b1b;
  --sk-bar: #121212; --sk-comp: #121212; --sk-field: #2b2b2b; --sk-icon: #e9e9e9; --sk-fab: #2b2b2b; --sk-fab-text: #e9e9e9;
}
:host([data-skin="signal"]) .mrow.me:not(.first) .bub { border-top-right-radius: 4px; }
:host([data-skin="signal"]) .mrow.them:not(.first) .bub { border-top-left-radius: 4px; }

/* ═══ Discord ════════════════════════════════════════════════════════════ */
:host([data-skin="discord"]) {
  --sk-font: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --cm-accent: #5865f2; --cm-bg: #313338; --cm-bg2: #2b2d31; --cm-bg3: #1e1f22; --cm-text: #dbdee1; --cm-text2: #949ba4; --cm-sep: #3f4147;
  --cm-sent: transparent; --cm-sent-text: #dbdee1; --cm-recv: transparent; --cm-recv-text: #dbdee1; --cm-glass-solid: #111214; --cm-sheet-solid: #2b2d31; --cm-fill: #383a40;
  --sk-bar: #313338; --sk-bar-text: #f2f3f5; --sk-bar-bd: 1px solid #1f2023; --sk-title-fs: 17px; --sk-title-fw: 700;
  --sk-bub-r: 0; --sk-bub-pad: 0; --sk-bub-fs: 15.5px; --sk-comp: #313338; --sk-comp-bd: 0; --sk-field: #383a40; --sk-field-r: 8px; --sk-icon: #b5bac1;
  --sk-send: transparent; --sk-send-text: #b5bac1; --sk-fab: #5865f2; --sk-fab-r: 12px; --sk-unread: #f2f3f5; --sk-row-sep: transparent; --sk-ctl-r: 8px;
  --sk-menu-r: 6px; --sk-menu-bd: 0; --sk-hl: #5865f2; --sk-hl-text: #fff; --sk-menu-fs: 14.5px; --sk-menu-pad: 8px 12px;
}
:host([data-skin="discord"]) .clist .row .name { font-weight: 500; }
:host([data-skin="discord"]) .clist .row .dot i { width: 8px; height: 8px; }
:host([data-skin="discord"]) .clist > .top .title::before { content: '@ '; color: #80848e; font-weight: 600; }
/* chat reads like a channel: everyone's lines on the left, name and time on the first one */
:host([data-skin="discord"]) .mrow, :host([data-skin="discord"]) .mrow.me { justify-content: flex-start; flex-direction: column; align-items: stretch; padding-left: 52px; position: relative; }
:host([data-skin="discord"]) .mrow.first { margin-top: 14px; min-height: 40px; }
:host([data-skin="discord"]) .mrow.first::before { content: attr(data-who) '  '; font-weight: 600; font-size: 15.5px; color: #f2f3f5; margin-bottom: 1px; }
:host([data-skin="discord"]) .mrow.first::after { content: ''; position: absolute; left: 4px; top: 2px; width: 38px; height: 38px; border-radius: 50%; background: #5865f2; }
:host([data-skin="discord"]) .mrow.me.first::after { background: #23a55a; }
:host([data-skin="discord"]) .mrow .mav, :host([data-skin="discord"]) .sender { display: none; }
:host([data-skin="discord"]) .mcol { max-width: 100%; align-items: flex-start !important; }
:host([data-skin="discord"]) .bub { color: #dbdee1 !important; }
:host([data-skin="discord"]) .receipt { text-align: left; margin-left: 52px; }

/* ═══ Material You ═══════════════════════════════════════════════════════ */
:host([data-skin="material"]) {
  --sk-font: "Google Sans", Roboto, "Segoe UI", Arial, sans-serif;
  --cm-accent: #0b57d0; --cm-bg: #fdfbff; --cm-bg2: #f3f0f7; --cm-text: #1b1b1f; --cm-text2: #46464f; --cm-sep: transparent;
  --cm-sent: #d3e3fd; --cm-sent-text: #041e49; --cm-recv: #ece8f1; --cm-recv-text: #1b1b1f; --cm-glass-solid: #f3f0f7; --cm-sheet-solid: #f7f2fa;
  --sk-bar: #fdfbff; --sk-bar-bd: 0; --sk-title-fs: 22px; --sk-title-fw: 400;
  --sk-bub-r: 20px; --sk-bub-corner: 20px; --sk-bub-pad: 9px 14px; --sk-comp: #fdfbff; --sk-comp-bd: 0; --sk-field: #ece8f1; --sk-field-r: 24px;
  --sk-icon: #46464f; --sk-send: #0b57d0; --sk-fab: #d3e3fd; --sk-fab-text: #041e49; --sk-fab-r: 16px; --sk-unread: #0b57d0; --sk-row-sep: transparent;
  --sk-menu-r: 4px; --sk-menu-bd: 0; --sk-menu-sh: 0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.3); --sk-sheet-r: 28px 28px 0 0; --sk-alert-r: 28px; --sk-pill-r: 20px;
}
:host([data-skin="material"][data-mode="dark"]) {
  --cm-bg: #131316; --cm-bg2: #1f1f23; --cm-text: #e4e1e6; --cm-text2: #c7c5d0; --cm-sent: #0842a0; --cm-sent-text: #d3e3fd; --cm-recv: #2a2a2e; --cm-recv-text: #e4e1e6;
  --cm-glass-solid: #2a2a2e; --cm-sheet-solid: #1f1f23; --sk-bar: #131316; --sk-comp: #131316; --sk-field: #2a2a2e; --sk-icon: #c7c5d0; --sk-send: #a8c7fa; --sk-send-text: #062e6f;
  --sk-fab: #0842a0; --sk-fab-text: #d3e3fd; --sk-unread: #a8c7fa;
}
:host([data-skin="material"]) .mrow.me:not(.first) .bub { border-top-right-radius: 6px; }
:host([data-skin="material"]) .mrow.them:not(.first) .bub { border-top-left-radius: 6px; }
:host([data-skin="material"]) .clist .bottom .cb { width: 52px; height: 52px; }

/* ═══ MSN 2005 ═══════════════════════════════════════════════════════════ */
:host([data-skin="msn"]) {
  --sk-font: Tahoma, "Segoe UI", Verdana, sans-serif;
  --cm-accent: #2f63ad; --cm-bg: #ffffff; --cm-bg2: #eaf2fb; --cm-text: #1b1b1b; --cm-text2: #5a6b7d; --cm-sep: #c9daee; --cm-fill: #e4effb;
  --cm-glass-solid: #ffffff; --cm-sheet-solid: #eef4fb; --sk-card-r: 6px;
  --sk-win-bg: linear-gradient(#5a8fd6, #2f63ad 55%, #24539a); --sk-win-h: 30px; --sk-win-ts: 0 1px 1px rgba(0,0,0,0.4); --sk-win-bd: 1px solid #2c5a9a; --sk-win-pad: 0 86px 0 30px;
  --sk-btns: radial-gradient(circle at 35% 35%, #9df07a, #2f9e1e 70%) left 0 top 0 / 16px 16px no-repeat; --sk-btn-left: 9px; --sk-btn-w: 16px; --sk-btn-h: 16px; --sk-btn-top: 7px;
  --sk-bar: linear-gradient(#f4f8fd, #dbe8f7); --sk-bar-bd: 1px solid #a9c4e3; --sk-bar-text: #1d3d66; --sk-title-fs: 15px; --sk-bar-h: 48px; --sk-hname-fs: 14px;
  --sk-wall: linear-gradient(#e4effb, #c7dcf2 60%, #b5d0ec); --sk-ctl-r: 4px; --sk-pill-r: 4px; --sk-av-r: 4px;
  --sk-comp: linear-gradient(#e4effb, #c7dcf2); --sk-comp-bd: 1px solid #a9c4e3; --sk-field: #fff; --sk-field-bd: 1px solid #7fa3d0; --sk-field-r: 4px; --sk-icon: #2f63ad;
  --sk-send: linear-gradient(#ffffff, #cfe1f6); --sk-send-text: #1d3d66; --sk-send-r: 4px; --sk-send-bd: 1px solid #7fa3d0;
  --sk-fab: linear-gradient(#ffffff, #cfe1f6); --sk-fab-text: #2f63ad; --sk-fab-bd: 1px solid #7fa3d0;
  --sk-who-them: #5a6b7d; --sk-who-me: #5a6b7d; --sk-who-fw: 400; --sk-who-fs: 13px; --sk-bub-fs: 14px; --sk-log-dir: column; --sk-log-pad: 0 0 0 14px; --sk-log-gap: 1px;
  --sk-menu: #fff; --sk-menu-r: 0; --sk-menu-bd: 1px solid #7fa3d0; --sk-menu-sh: 2px 2px 6px rgba(0,0,0,0.25); --sk-hl: #3168c6; --sk-hl-text: #fff; --sk-menu-fs: 13.5px; --sk-menu-pad: 6px 14px; --sk-mh: #2f63ad;
  --sk-row-pad: 6px 12px 6px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 70px; --sk-unread: #2f9e1e;
}
:host([data-skin="msn"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 8px) 8px calc(var(--cm-composer-h, 66px) + 16px); padding: 8px 10px; min-height: calc(100% - var(--sk-bar-h) - 8px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 1px solid #7fa3d0; border-radius: 4px; justify-content: flex-end; }
:host([data-skin="msn"]) .mrow.first::before { content: attr(data-who) ' says:'; }
:host([data-skin="msn"]) .mrow:not(.first)::before { content: none; }
:host([data-skin="msn"]) .clist .row .dot i { width: 9px; height: 9px; background: radial-gradient(circle at 35% 35%, #9df07a, #2f9e1e 70%); }

/* ═══ ICQ 2000 ═══════════════════════════════════════════════════════════ */
:host([data-skin="icq"]) {
  --sk-font: Tahoma, "MS Sans Serif", Verdana, sans-serif;
  --cm-accent: #000080; --cm-bg: #c0c0c0; --cm-bg2: #c0c0c0; --cm-text: #000; --cm-text2: #404040; --cm-sep: #808080; --cm-fill: #d4d4d4; --cm-red: #c00000;
  --cm-glass-solid: #c0c0c0; --cm-sheet-solid: #c0c0c0; --sk-card-r: 0;
  --sk-win-bg: linear-gradient(90deg, #000080, #1084d0); --sk-win-h: 26px; --sk-win-bd: 2px outset #dfdfdf; --sk-win-pad: 0 60px 0 26px;
  --sk-btns: radial-gradient(circle, #7cfc00 30%, #2e8b57 70%) left 0 top 0 / 14px 14px no-repeat; --sk-btn-left: 6px; --sk-btn-w: 14px; --sk-btn-h: 14px; --sk-btn-top: 6px;
  --sk-bar: #c0c0c0; --sk-bar-bd: 1px solid #808080; --sk-bar-text: #000; --sk-title-fs: 14px; --sk-bar-h: 46px; --sk-hname-fs: 14px;
  --sk-ctl: #c0c0c0; --sk-ctl-bd: 2px outset #fff; --sk-ctl-r: 0; --sk-pill-r: 0; --sk-av-r: 0;
  --sk-comp: #c0c0c0; --sk-comp-bd: 0; --sk-field: #fff; --sk-field-bd: 2px inset #fff; --sk-field-r: 0; --sk-icon: #000;
  --sk-comp-btn: #c0c0c0; --sk-comp-btn-bd: 2px outset #fff;
  --sk-send: #c0c0c0; --sk-send-text: #000; --sk-send-r: 0; --sk-send-bd: 2px outset #fff; --sk-fab: #c0c0c0; --sk-fab-text: #000; --sk-fab-bd: 2px outset #fff;
  --sk-who-them: #c00000; --sk-who-me: #0000c0; --sk-bub-fs: 13.5px; --sk-who-fs: 13.5px; --sk-log-dir: column;
  --sk-menu: #c0c0c0; --sk-menu-r: 0; --sk-menu-bd: 2px outset #fff; --sk-menu-sh: 2px 2px 0 #000; --sk-hl: #000080; --sk-hl-text: #fff; --sk-menu-fs: 13px; --sk-menu-pad: 5px 12px; --sk-mh: #000080;
  --sk-sheet-r: 0; --sk-alert-r: 0; --sk-row-pad: 5px 12px 5px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 66px; --sk-unread: #2e8b57;
}
:host([data-skin="icq"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 6px) 8px calc(var(--cm-composer-h, 66px) + 16px); padding: 8px; min-height: calc(100% - var(--sk-bar-h) - 6px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 2px inset #fff; justify-content: flex-end; }
:host([data-skin="icq"]) .mrow.first::before { content: attr(data-who) ' (' attr(data-t) '):'; }
:host([data-skin="icq"]) .mrow:not(.first)::before { content: none; }
:host([data-skin="icq"]) .clist .scroll { background: #fff; border: 2px inset #fff; margin-left: 6px; margin-right: 6px; }
:host([data-skin="icq"]) .clist .row .dot i { border-radius: 50%; background: radial-gradient(circle, #7cfc00 30%, #2e8b57 70%); }

/* ═══ AIM ════════════════════════════════════════════════════════════════ */
:host([data-skin="aim"]) {
  --sk-font: Tahoma, Arial, sans-serif;
  --cm-accent: #0a246a; --cm-bg: #d4d0c8; --cm-bg2: #d4d0c8; --cm-text: #000; --cm-text2: #555; --cm-sep: #808080; --cm-fill: #e4e1da;
  --cm-glass-solid: #d4d0c8; --cm-sheet-solid: #d4d0c8; --sk-card-r: 0;
  --sk-win-bg: linear-gradient(90deg, #0a246a, #a6caf0); --sk-win-h: 26px; --sk-win-bd: 2px outset #fff; --sk-win-title: 'Crow Messenger - Instant Message';
  --sk-btns: linear-gradient(#d4d0c8, #d4d0c8) right 0 top 0 / 18px 16px no-repeat; --sk-btn-w: 18px; --sk-btn-h: 16px; --sk-btn-top: 5px; --sk-btn-right: 4px;
  --sk-bar: linear-gradient(#ffe866, #ffcc00); --sk-bar-bd: 1px solid #b38f00; --sk-bar-text: #000; --sk-title-fs: 15px; --sk-bar-h: 50px; --sk-hname-fs: 14px;
  --sk-ctl: #d4d0c8; --sk-ctl-bd: 2px outset #fff; --sk-ctl-r: 0; --sk-pill-r: 0; --sk-av-r: 0;
  --sk-comp: #d4d0c8; --sk-comp-bd: 0; --sk-field: #fff; --sk-field-bd: 2px inset #fff; --sk-field-r: 0; --sk-icon: #000;
  --sk-comp-btn: #d4d0c8; --sk-comp-btn-bd: 2px outset #fff;
  --sk-send: linear-gradient(#ffe866, #ffcc00); --sk-send-text: #000; --sk-send-r: 0; --sk-send-bd: 2px outset #fff7c0; --sk-fab: linear-gradient(#ffe866, #ffcc00); --sk-fab-text: #000; --sk-fab-bd: 2px outset #fff7c0;
  --sk-who-them: #0000ff; --sk-who-me: #ff0000; --sk-bub-fs: 14px; --sk-who-fs: 14px; --sk-bub-lh: 1.35;
  --sk-menu: #d4d0c8; --sk-menu-r: 0; --sk-menu-bd: 2px outset #fff; --sk-menu-sh: 2px 2px 0 #404040; --sk-hl: #0a246a; --sk-hl-text: #fff; --sk-menu-fs: 13px; --sk-menu-pad: 5px 12px; --sk-mh: #0a246a;
  --sk-sheet-r: 0; --sk-alert-r: 0; --sk-row-pad: 5px 12px 5px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 66px; --sk-unread: #ffcc00;
}
:host([data-skin="aim"]) ha-card::after { box-shadow: inset -1px -1px #404040, inset 1px 1px #fff; }
:host([data-skin="aim"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 6px) 6px calc(var(--cm-composer-h, 66px) + 16px); padding: 8px; min-height: calc(100% - var(--sk-bar-h) - 6px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 2px inset #fff; justify-content: flex-end; font-family: Arial, sans-serif; }
:host([data-skin="aim"]) .mrow::before { content: attr(data-who) ' (' attr(data-t) '):'; }
:host([data-skin="aim"]) .clist .scroll { background: #fff; border: 2px inset #fff; margin-left: 6px; margin-right: 6px; }

/* ═══ Yahoo! ═════════════════════════════════════════════════════════════ */
:host([data-skin="yahoo"]) {
  --sk-font: Verdana, Tahoma, sans-serif;
  --cm-accent: #7b3fc4; --cm-bg: #ffffff; --cm-bg2: #efe6fb; --cm-text: #1d0b33; --cm-text2: #6b5a85; --cm-sep: #d9c8f2; --cm-fill: #efe6fb;
  --cm-glass-solid: #ffffff; --cm-sheet-solid: #f6f0fd; --sk-card-r: 6px;
  --sk-win-bg: linear-gradient(#7b3fc4, #4b1a8c); --sk-win-h: 30px; --sk-win-bd: 1px solid #4b1a8c; --sk-win-pad: 0 60px 0 12px;
  --sk-btns: linear-gradient(#6a32b0, #6a32b0) left 0 top 0 / 20px 18px no-repeat, linear-gradient(#c63b5b, #c63b5b) right 0 top 0 / 20px 18px no-repeat; --sk-btn-w: 46px; --sk-btn-top: 6px;
  --sk-bar: linear-gradient(#f6f0fd, #e6d9f7); --sk-bar-bd: 1px solid #b9a2dc; --sk-bar-text: #4b1a8c; --sk-title-fs: 15px; --sk-bar-h: 48px; --sk-hname-fs: 14px;
  --sk-wall: linear-gradient(#efe6fb, #d9c8f2); --sk-ctl-r: 4px; --sk-pill-r: 4px; --sk-av-r: 4px;
  --sk-comp: linear-gradient(#efe6fb, #d9c8f2); --sk-comp-bd: 1px solid #b9a2dc; --sk-field: #fff; --sk-field-bd: 1px solid #b9a2dc; --sk-field-r: 4px; --sk-icon: #7b3fc4;
  --sk-send: linear-gradient(#9b6ae0, #6a32b0); --sk-send-text: #fff; --sk-send-r: 4px; --sk-send-bd: 1px solid #4b1a8c; --sk-fab: linear-gradient(#9b6ae0, #6a32b0); --sk-fab-bd: 1px solid #4b1a8c;
  --sk-who-them: #7b3fc4; --sk-who-me: #c63b5b; --sk-bub-fs: 13.5px; --sk-who-fs: 13.5px;
  --sk-menu: #fff; --sk-menu-r: 6px; --sk-menu-bd: 1px solid #7b3fc4; --sk-menu-sh: 0 6px 18px rgba(40,10,80,0.35); --sk-hl: #efe6fb; --sk-hl-text: #4b1a8c; --sk-menu-fs: 13.5px; --sk-menu-pad: 7px 14px; --sk-mh: #7b3fc4;
  --sk-row-pad: 6px 12px 6px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 70px; --sk-unread: #7b3fc4;
}
:host([data-skin="yahoo"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 8px) 8px calc(var(--cm-composer-h, 66px) + 16px); padding: 10px; min-height: calc(100% - var(--sk-bar-h) - 8px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 1px solid #b9a2dc; border-radius: 4px; justify-content: flex-end; }
:host([data-skin="yahoo"]) .mrow::before { content: attr(data-who) ':'; }
:host([data-skin="yahoo"]) .tmore { border: 2px solid #7b3fc4 !important; background: #efe6fb !important; color: #4b1a8c !important; height: 30px !important; }

/* ═══ Windows 98 ═════════════════════════════════════════════════════════ */
:host([data-skin="win98"]) {
  --sk-font: Tahoma, "MS Sans Serif", Verdana, sans-serif;
  --cm-accent: #000080; --cm-bg: #c0c0c0; --cm-bg2: #c0c0c0; --cm-text: #000; --cm-text2: #404040; --cm-sep: #808080; --cm-fill: #d4d4d4;
  --cm-glass-solid: #c0c0c0; --cm-sheet-solid: #c0c0c0; --sk-card-r: 0;
  --sk-win-bg: linear-gradient(90deg, #000080, #1084d0); --sk-win-h: 24px; --sk-win-bd: 2px outset #fff; --sk-win-pad: 0 64px 0 8px;
  --sk-btns: linear-gradient(#c0c0c0, #c0c0c0) left 0 top 0 / 16px 14px no-repeat, linear-gradient(#c0c0c0, #c0c0c0) left 16px top 0 / 16px 14px no-repeat, linear-gradient(#c0c0c0, #c0c0c0) right 0 top 0 / 16px 14px no-repeat;
  --sk-btn-w: 50px; --sk-btn-h: 14px; --sk-btn-top: 5px; --sk-btn-right: 4px;
  --sk-bar: #c0c0c0; --sk-bar-bd: 1px solid #808080; --sk-bar-text: #000; --sk-title-fs: 14px; --sk-bar-h: 44px; --sk-hname-fs: 13.5px;
  --sk-ctl: #c0c0c0; --sk-ctl-bd: 2px outset #fff; --sk-ctl-r: 0; --sk-pill-r: 0; --sk-av-r: 0;
  --sk-comp: #c0c0c0; --sk-comp-bd: 0; --sk-field: #fff; --sk-field-bd: 2px inset #fff; --sk-field-r: 0; --sk-icon: #000;
  --sk-comp-btn: #c0c0c0; --sk-comp-btn-bd: 2px outset #fff;
  --sk-send: #c0c0c0; --sk-send-text: #000; --sk-send-r: 0; --sk-send-bd: 2px outset #fff; --sk-send-sh: 1px 1px 0 #000; --sk-fab: #c0c0c0; --sk-fab-text: #000; --sk-fab-bd: 2px outset #fff;
  --sk-who-them: #000; --sk-who-me: #000080; --sk-bub-fs: 13.5px; --sk-who-fs: 13.5px;
  --sk-menu: #c0c0c0; --sk-menu-r: 0; --sk-menu-bd: 2px outset #fff; --sk-menu-sh: 1px 1px 0 #000; --sk-hl: #000080; --sk-hl-text: #fff; --sk-menu-fs: 13px; --sk-menu-pad: 5px 14px; --sk-mh: #000080;
  --sk-sheet-r: 0; --sk-alert-r: 0; --sk-row-pad: 4px 12px 4px 2px; --sk-name-fs: 13.5px; --sk-prev-fs: 12.5px; --sk-sep-left: 64px; --sk-unread: #000080;
}
:host([data-skin="win98"]) ha-card { background: #008080; }
:host([data-skin="win98"]) ha-card::after { box-shadow: none; filter: drop-shadow(1px 1px 0 #000); }
:host([data-skin="win98"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 4px) 6px calc(var(--cm-composer-h, 66px) + 16px); padding: 6px; min-height: calc(100% - var(--sk-bar-h) - 4px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 2px inset #fff; justify-content: flex-end; }
:host([data-skin="win98"]) .mrow::before { content: '<' attr(data-who) '>'; }
:host([data-skin="win98"]) .clist .scroll { background: #fff; border: 2px inset #fff; margin-left: 6px; margin-right: 6px; }
:host([data-skin="win98"]) .composer .field .send::after, :host([data-skin="icq"]) .composer .field .send::after, :host([data-skin="aim"]) .composer .field .send::after,
:host([data-skin="msn"]) .composer .field .send::after, :host([data-skin="yahoo"]) .composer .field .send::after, :host([data-skin="xp"]) .composer .field .send::after, :host([data-skin="aqua"]) .composer .field .send::after { content: 'Send'; font-size: 13px; font-weight: 600; }
:host(:is([data-skin="win98"], [data-skin="icq"], [data-skin="aim"], [data-skin="msn"], [data-skin="yahoo"], [data-skin="xp"], [data-skin="aqua"])) .composer .field .send { width: auto; padding: 0 12px; }
:host(:is([data-skin="win98"], [data-skin="icq"], [data-skin="aim"], [data-skin="msn"], [data-skin="yahoo"], [data-skin="xp"], [data-skin="aqua"])) .composer .field .send svg { display: none; }

/* ═══ Windows XP ═════════════════════════════════════════════════════════ */
:host([data-skin="xp"]) {
  --sk-font: Tahoma, "Segoe UI", Verdana, sans-serif;
  --cm-accent: #0a5ce6; --cm-bg: #ece9d8; --cm-bg2: #ece9d8; --cm-text: #000; --cm-text2: #555; --cm-sep: #d0cdb9; --cm-fill: #f3f3ee;
  --cm-sent: #dce8fb; --cm-sent-text: #000; --cm-recv: #f3f3ee; --cm-recv-text: #000; --cm-glass-solid: #ffffff; --cm-sheet-solid: #ece9d8; --sk-card-r: 8px 8px 0 0;
  --sk-win-bg: linear-gradient(#3d95ff, #0a5ce6 18%, #0050e6 60%, #0a3fc0); --sk-win-h: 30px; --sk-win-bd: 3px solid #0831d9; --sk-win-ts: 1px 1px 1px #0a246a; --sk-win-pad: 0 80px 0 10px;
  --sk-btns: linear-gradient(#5c9cff, #2a6ae6) left 0 top 0 / 21px 21px no-repeat, linear-gradient(#5c9cff, #2a6ae6) left 23px top 0 / 21px 21px no-repeat, linear-gradient(#e9876c, #c4351b) right 0 top 0 / 21px 21px no-repeat;
  --sk-btn-w: 67px; --sk-btn-h: 21px; --sk-btn-top: 4px; --sk-btn-right: 5px;
  --sk-bar: #ece9d8; --sk-bar-bd: 1px solid #d0cdb9; --sk-bar-text: #000; --sk-title-fs: 15px; --sk-bar-h: 46px; --sk-hname-fs: 14px;
  --sk-ctl: linear-gradient(#fff, #ece9d8 85%, #d6d0c0); --sk-ctl-bd: 1px solid #003c74; --sk-ctl-r: 4px; --sk-pill-r: 4px; --sk-av-r: 4px;
  --sk-bub-r: 6px; --sk-bub-fs: 14px; --sk-bub-pad: 6px 9px; --sk-sent-bd: 1px solid #a9c1ea; --sk-recv-bd: 1px solid #d0cdb9;
  --sk-comp: #ece9d8; --sk-comp-bd: 0; --sk-field: #fff; --sk-field-bd: 1px solid #7f9db9; --sk-field-r: 0; --sk-icon: #0a246a;
  --sk-send: linear-gradient(#fff, #ece9d8 85%, #d6d0c0); --sk-send-text: #000; --sk-send-r: 4px; --sk-send-bd: 1px solid #003c74;
  --sk-fab: linear-gradient(#5eac56, #3c8f3c 40%, #2f7a2f); --sk-fab-text: #fff; --sk-fab-r: 4px;
  --sk-menu: #fff; --sk-menu-r: 0; --sk-menu-bd: 1px solid #0a3fc0; --sk-menu-sh: 3px 3px 8px rgba(0,0,0,0.35); --sk-hl: #316ac5; --sk-hl-text: #fff; --sk-menu-fs: 13.5px; --sk-menu-pad: 6px 14px; --sk-mh: #0a246a;
  --sk-row-pad: 6px 12px 6px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 70px; --sk-unread: #0a5ce6;
}
:host([data-skin="xp"]) ha-card { border-top: 0; }
:host([data-skin="xp"]) ha-card::after { box-shadow: inset 0 0 0 1px #fff; border-radius: 3px; }
:host([data-skin="xp"]) .thread .msgs { margin: calc(var(--sk-bar-h) + 8px) 8px calc(var(--cm-composer-h, 66px) + 16px); padding: 8px; min-height: calc(100% - var(--sk-bar-h) - 8px - var(--cm-composer-h, 66px) - 16px); background: #fff; border: 1px solid #7f9db9; justify-content: flex-end; }
:host([data-skin="xp"]) .mrow { flex-direction: column; align-items: flex-start; }
:host([data-skin="xp"]) .mrow.me { align-items: flex-end; }
:host([data-skin="xp"]) .mrow.first::before { content: attr(data-who); font-weight: 700; font-size: 12.5px; color: #0a246a; margin: 0 4px 1px; }
:host([data-skin="xp"]) .mrow.me.first::before { color: #1f5b1f; }
:host([data-skin="xp"]) .clist .bottom { background: linear-gradient(#3168d5, #245edb 10%, #1941a5); border-top: 0; }
:host([data-skin="xp"]) .clist .bottom .cb { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.35); }

/* ═══ Mac OS X Aqua ══════════════════════════════════════════════════════ */
:host([data-skin="aqua"]) {
  --sk-font: "Lucida Grande", "Helvetica Neue", Helvetica, sans-serif;
  --cm-accent: #3875d7; --cm-bg: #ffffff; --cm-bg2: #ececec; --cm-text: #000; --cm-text2: #6d6d6d; --cm-sep: #d8d8d8; --cm-fill: #ececec;
  --cm-sent-text: #000; --cm-recv-text: #000; --cm-glass-solid: rgba(255,255,255,0.97); --cm-sheet-solid: #ececec; --sk-card-r: 8px;
  --sk-win-bg: linear-gradient(#e9e9e9, #c8c8c8); --sk-win-text: #222; --sk-win-h: 26px; --sk-win-bb: 1px solid #8f8f8f; --sk-win-align: center; --sk-win-pad: 0 60px;
  --sk-win-font: 600 13px/1 "Lucida Grande", "Helvetica Neue", Helvetica, sans-serif; --sk-win-bd: 1px solid #8f8f8f;
  --sk-btns: radial-gradient(circle at 40% 35%, #ffb3a8, #e0443a 60%, #a8231b) left 0 top 0 / 13px 13px no-repeat, radial-gradient(circle at 40% 35%, #fff0a8, #f2b83a 60%, #b8800f) left 20px top 0 / 13px 13px no-repeat, radial-gradient(circle at 40% 35%, #c8f5b0, #5fc23a 60%, #2f8a17) left 40px top 0 / 13px 13px no-repeat;
  --sk-btn-left: 9px; --sk-btn-w: 53px; --sk-btn-h: 13px; --sk-btn-top: 7px;
  --sk-bar: repeating-linear-gradient(#f5f5f5 0 2px, #e9e9e9 2px 4px); --sk-bar-bd: 1px solid #b0b0b0; --sk-bar-text: #000; --sk-title-fs: 15px; --sk-bar-h: 48px; --sk-hname-fs: 14px;
  --sk-av-r: 6px; --sk-ctl-r: 13px; --sk-pill-r: 13px;
  --sk-bub-r: 16px; --sk-bub-fs: 13.5px; --sk-bub-pad: 7px 12px;
  --sk-sent-bg: linear-gradient(#f4ffe9, #c9f0a8); --sk-sent-bd: 1px solid #94cc6c; --sk-recv-bg: linear-gradient(#f5fbff, #cfe6ff); --sk-recv-bd: 1px solid #9fc4ea; --sk-bub-sh: inset 0 6px 6px rgba(255,255,255,0.7);
  --sk-comp: repeating-linear-gradient(#f5f5f5 0 2px, #e9e9e9 2px 4px); --sk-comp-bd: 1px solid #b0b0b0; --sk-field: #fff; --sk-field-bd: 1px solid #8f8f8f; --sk-field-r: 14px; --sk-field-sh: inset 0 1px 2px rgba(0,0,0,0.25); --sk-icon: #444;
  --sk-send: linear-gradient(#b8dcff, #5ea2f2 50%, #3a83e4 51%, #8fc4ff); --sk-send-text: #000; --sk-send-r: 13px; --sk-send-bd: 1px solid #2a5aa8;
  --sk-fab: linear-gradient(#b8dcff, #5ea2f2 50%, #3a83e4 51%, #8fc4ff); --sk-fab-text: #000; --sk-fab-bd: 1px solid #2a5aa8;
  --sk-menu: rgba(255,255,255,0.97); --sk-menu-r: 0 0 6px 6px; --sk-menu-bd: 1px solid #9a9a9a; --sk-menu-sh: 0 6px 16px rgba(0,0,0,0.35); --sk-hl: #3875d7; --sk-hl-text: #fff; --sk-menu-fs: 13.5px; --sk-menu-pad: 4px 16px;
  --sk-row-pad: 6px 12px 6px 2px; --sk-name-fs: 14px; --sk-prev-fs: 12.5px; --sk-sep-left: 70px; --sk-unread: #3875d7;
}
:host([data-skin="aqua"]) ha-card { background: linear-gradient(160deg, #3a7bd5, #6fb1fc 50%, #2b5fa8); }
:host([data-skin="aqua"]) .page.thread { background: #fff; }
:host([data-skin="aqua"]) .mrow .buddy { display: block; width: 30px; height: 30px; flex-shrink: 0; align-self: flex-end; border-radius: 6px; overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.12); background: linear-gradient(160deg, #ffd1dc, #f39ab2); }
:host([data-skin="aqua"]) .mrow.me .buddy { background: linear-gradient(160deg, #c8e0ff, #7fb0ef); }
:host([data-skin="aqua"]) .mrow .buddy .av { width: 30px !important; height: 30px !important; border-radius: 6px !important; font-size: 12px !important; background: none; color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
:host([data-skin="aqua"]) .mrow .buddy .av img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
:host([data-skin="aqua"]) .mrow { gap: 8px; }
:host([data-skin="aqua"]) .mrow:not(.first) { padding-left: 38px; }
:host([data-skin="aqua"]) .mrow.me { flex-direction: row-reverse; justify-content: flex-start; }
:host([data-skin="aqua"]) .mrow.me:not(.first) { padding: 0 38px 0 0; }
:host([data-skin="aqua"]) .mrow .mav { display: none; }

/* ═══ BlackBerry Messenger ═══════════════════════════════════════════════ */
:host([data-skin="bbm"]) {
  --sk-font: "BBAlpha Sans", "Helvetica Neue", Arial, sans-serif;
  --cm-accent: #2f7fd1; --cm-bg: #f4f4f4; --cm-bg2: #e2e2e2; --cm-text: #1a1a1a; --cm-text2: #555; --cm-sep: #dddddd; --cm-fill: #e6edf5;
  --cm-glass-solid: #ffffff; --cm-sheet-solid: #f4f4f4; --sk-card-r: 10px;
  --sk-bar: linear-gradient(#4a5d73, #2c3a4c); --sk-bar-text: #fff; --sk-bar-sub: #cfd8e3; --sk-bar-bd: 0; --sk-title-fs: 17px; --sk-bar-h: 60px; --sk-hav-zoom: 0.9; --sk-av-r: 4px;
  --sk-ctl-r: 4px; --sk-pill-r: 4px; --sk-comp: #e2e2e2; --sk-comp-bd: 1px solid #c4c4c4; --sk-field: #fff; --sk-field-bd: 1px solid #a8a8a8; --sk-field-r: 4px; --sk-icon: #2c3a4c;
  --sk-send: #2f7fd1; --sk-send-r: 4px; --sk-fab: #2f7fd1; --sk-fab-r: 4px;
  --sk-who-them: #3b6aa0; --sk-who-me: #333; --sk-who-fs: 12.5px; --sk-bub-fs: 15px; --sk-log-dir: column; --sk-log-gap: 0; --sk-log-gap-first: 0;
  --sk-menu: #fff; --sk-menu-r: 6px; --sk-menu-bd: 0; --sk-menu-sh: 0 4px 14px rgba(0,0,0,0.45); --sk-hl: linear-gradient(#5aa2f0, #2f7fd1); --sk-hl-text: #fff; --sk-menu-fs: 15px; --sk-menu-pad: 10px 14px;
  --sk-unread: #2f7fd1; --sk-av-r: 4px;
}
:host([data-skin="bbm"]) .thread .msgs { padding-left: 0; padding-right: 0; }
:host([data-skin="bbm"]) .mrow { padding: 7px 12px; border-bottom: 1px solid #ddd; margin: 0 !important; }
:host([data-skin="bbm"]) .mrow.me { background: #e6edf5; }
:host([data-skin="bbm"]) .mrow::before { content: attr(data-who); }
:host([data-skin="bbm"]) .mrow + .receipt { padding: 0 12px; }
:host([data-skin="bbm"]) .thread .th-head .av { border: 2px solid #fff; }

/* ═══ Nokia SMS ══════════════════════════════════════════════════════════ */
:host([data-skin="nokia"]) {
  --sk-font: VT323, "Courier New", monospace;
  --cm-accent: #43523d; --cm-bg: #c7f0d8; --cm-bg2: #b9e3ca; --cm-text: #43523d; --cm-text2: #43523d; --cm-text3: #6b7d63; --cm-sep: #43523d; --cm-fill: #b9e3ca; --cm-red: #43523d; --cm-green: #43523d;
  --cm-glass-solid: #c7f0d8; --cm-sheet-solid: #c7f0d8; --sk-card-r: 18px;
  --sk-bar: #c7f0d8; --sk-bar-text: #43523d; --sk-bar-sub: #43523d; --sk-bar-bd: 2px solid #43523d; --sk-title-fs: 21px; --sk-title-fw: 400; --sk-bar-h: 48px; --sk-hname-fs: 19px; --sk-hname-fw: 400; --sk-av-r: 0;
  --sk-ctl: #c7f0d8; --sk-ctl-r: 0; --sk-pill-r: 0; --sk-comp: #c7f0d8; --sk-comp-bd: 2px solid #43523d; --sk-field: #c7f0d8; --sk-field-bd: 0; --sk-field-r: 0; --sk-icon: #43523d; --sk-ph: #6b7d63;
  --sk-send: #43523d; --sk-send-text: #c7f0d8; --sk-send-r: 0; --sk-fab: #43523d; --sk-fab-text: #c7f0d8; --sk-fab-r: 0;
  --sk-who-them: #43523d; --sk-who-me: #43523d; --sk-who-fw: 400; --sk-who-fs: 19px; --sk-bub-fs: 19px; --sk-bub-lh: 1.1; --sk-log-gap: 6px; --sk-log-gap-first: 8px;
  --sk-menu: #c7f0d8; --sk-menu-r: 0; --sk-menu-bd: 2px solid #43523d; --sk-menu-sh: none; --sk-hl: #43523d; --sk-hl-text: #c7f0d8; --sk-menu-fs: 18px; --sk-menu-pad: 3px 12px; --sk-mh: #43523d;
  --sk-name-fs: 19px; --sk-name-fw: 400; --sk-prev-fs: 16px; --sk-row-sep: #43523d; --sk-sep-left: 12px; --sk-unread: #43523d; --sk-date: #43523d; --sk-stamp: #43523d;
  --sk-sheet-r: 0; --sk-alert-r: 0;
}
:host([data-skin="nokia"]) ha-card { border: 10px solid #0d1218; box-shadow: inset 0 0 0 4px #9fbfaa; }
:host([data-skin="nokia"]) .cm-root { inset: 4px; box-shadow: inset 6px 6px 20px rgba(0,40,20,0.22); border-radius: 10px; }
:host([data-skin="nokia"]) .clist .row .av, :host([data-skin="nokia"]) .clist .row .av-group, :host([data-skin="nokia"]) .thread .th-head > :first-child, :host([data-skin="nokia"]) .mrow .mav { display: none; }
:host([data-skin="nokia"]) .thread .th-head { left: 50%; transform: translateX(-50%); grid-template-columns: auto; justify-items: center; max-width: 60%; }
:host([data-skin="nokia"]) .mrow.me { justify-content: flex-end; }
:host([data-skin="nokia"]) .mrow.me .mcol { align-items: flex-end !important; flex: 0 1 auto; }
:host([data-skin="nokia"]) .mrow.them .bub .btxt::before { content: '< '; }
:host([data-skin="nokia"]) .mrow.me .bub .btxt::after { content: ' >'; }
:host([data-skin="nokia"]) .receipt, :host([data-skin="nokia"]) .stamp { font-size: 18px; }
:host([data-skin="nokia"]) .av { filter: grayscale(1) contrast(1.2); }

/* ═══ IRC / Terminal ═════════════════════════════════════════════════════ */
:host([data-skin="irc"]) {
  --sk-font: "IBM Plex Mono", Menlo, Consolas, "Courier New", monospace;
  --cm-accent: #33ff66; --cm-bg: #0c0c0c; --cm-bg2: #141414; --cm-bg3: #1d1d1d; --cm-text: #c8c8c8; --cm-text2: #7d7d7d; --cm-sep: #2a2a2a; --cm-fill: #1d1d1d;
  --cm-glass-solid: #0f1a12; --cm-sheet-solid: #101010; --sk-card-r: 4px;
  --sk-bar: #1a3a7a; --sk-bar-text: #e8eeff; --sk-bar-sub: #ffd75f; --sk-bar-bd: 0; --sk-title-fs: 14px; --sk-title-fw: 400; --sk-bar-h: 40px; --sk-hname-fs: 13.5px; --sk-hname-fw: 400; --sk-av-r: 0;
  --sk-ctl: #141414; --sk-ctl-r: 0; --sk-pill-r: 0; --sk-comp: #0c0c0c; --sk-comp-bd: 0; --sk-field: #0c0c0c; --sk-field-bd: 0; --sk-field-r: 0; --sk-icon: #5fd7ff; --sk-ph: #555;
  --sk-send: transparent; --sk-send-text: #33ff66; --sk-send-r: 0; --sk-fab: transparent; --sk-fab-text: #33ff66; --sk-fab-bd: 1px solid #33ff66; --sk-fab-r: 0;
  --sk-who-them: #ff7ab8; --sk-who-me: #5fd7ff; --sk-who-fw: 400; --sk-who-fs: 13px; --sk-bub-fs: 13px; --sk-bub-lh: 1.5; --sk-log-gap: 0; --sk-log-gap-first: 0;
  --sk-menu: #0f1a12; --sk-menu-r: 0; --sk-menu-bd: 1px solid #33ff66; --sk-menu-sh: none; --sk-hl: #33ff66; --sk-hl-text: #0c0c0c; --sk-menu-fs: 13px; --sk-menu-pad: 3px 10px; --sk-mh: #33ff66; --sk-menu-text: #b8ffcc;
  --sk-name-fs: 13.5px; --sk-name-fw: 400; --sk-prev-fs: 12.5px; --sk-row-sep: #1d1d1d; --sk-sep-left: 12px; --sk-unread: #ffd75f; --sk-date: #7d7d7d; --sk-stamp: #6fb3ff; --sk-row-pad: 5px 10px 5px 2px;
  --sk-sheet-r: 0; --sk-alert-r: 0;
}
:host([data-skin="irc"]) .clist .row .av, :host([data-skin="irc"]) .clist .row .av-group, :host([data-skin="irc"]) .thread .th-head > :first-child { display: none; }
:host([data-skin="irc"]) .clist .row .name::before { content: '#'; color: #7d7d7d; }
:host([data-skin="irc"]) .clist .row .dot i { border-radius: 0; width: 7px; height: 7px; }
:host([data-skin="irc"]) .thread .th-head { grid-template-columns: auto; }
:host([data-skin="irc"]) .thread .th-head .namepill::before { content: '[2:'; } :host([data-skin="irc"]) .thread .th-head .namepill::after { content: ']'; }
:host([data-skin="irc"]) .mrow::before { content: attr(data-t) ' <' attr(data-who) '>'; color: var(--sk-who-them); }
:host([data-skin="irc"]) .mrow.me::before { color: var(--sk-who-me); }
:host([data-skin="irc"]) .stamp, :host([data-skin="irc"]) .sys { text-align: left; margin: 6px 0; font-size: 12.5px; }
:host([data-skin="irc"]) .stamp::before, :host([data-skin="irc"]) .sys::before { content: '-!- '; }
:host([data-skin="irc"]) .composer { border-top: 0; }
:host([data-skin="irc"]) .composer .field .inrow::before { content: '>'; color: #33ff66; align-self: center; margin-right: 6px; }
:host([data-skin="irc"]) .composer .crow { border-top: 0; }
:host([data-skin="irc"]) .thread .composer { box-shadow: 0 -26px 0 -2px #1a3a7a; margin-top: 26px; }
:host([data-skin="irc"]) .receipt { color: #555; }
`;

const GAMES = [
  { id: 'ttt', name: 'Noughts and Crosses', sub: 'Three in a row wins', bg: 'linear-gradient(160deg,#FF6482,#E0245E)' },
  { id: 'c4', name: 'Connect Four', sub: 'Drop counters, line up four', bg: 'linear-gradient(160deg,#FFD60A,#FF9F0A)' },
  { id: 'rev', name: 'Reversi', sub: 'Turn over your opponent’s discs', bg: 'linear-gradient(160deg,#30D158,#1E7A3C)', icon: 'disc' },
  { id: 'dr', name: 'Draughts', sub: 'Jump and take, crown your kings', bg: 'linear-gradient(160deg,#C0392B,#7B1E14)', icon: 'crown' },
  { id: 'sea', name: 'Sea Battle', sub: 'Find and sink the hidden fleet', bg: 'linear-gradient(160deg,#0A84FF,#0B3E8A)', icon: 'anchor' },
];
const GAME_NAME = { ttt: 'Noughts and Crosses', c4: 'Connect Four', rev: 'Reversi', dr: 'Draughts', sea: 'Sea Battle', word: 'Word Game' };


// ── Sea Battle drawing: each ship is one hull across its squares ───────────────
const SEA_SHIPS = [['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2], ['Patrol Boat', 2]];
const seaN = (v) => +v.toFixed(3);
// a hull lying along x from 0 to n (one square high), bow on the right
const seaHull = (n, kind, wreck) => {
  const h = (a) => seaN(a);
  if (kind === 'Submarine' && !wreck) {
    return `<path d="M0.32,0.3 L${h(n - 0.4)},0.3 Q${h(n - 0.08)},0.32 ${h(n - 0.08)},0.5 Q${h(n - 0.08)},0.68 ${h(n - 0.4)},0.7 L0.32,0.7 Q0.1,0.7 0.1,0.5 Q0.1,0.3 0.32,0.3Z" fill="#4f5b66" stroke="#222a31" stroke-width="0.05"/>
      <rect x="${h(n * 0.45 - 0.2)}" y="0.36" width="0.5" height="0.28" rx="0.12" fill="#8b98a5"/><circle cx="${h(n * 0.45 + 0.05)}" cy="0.5" r="0.07" fill="#222a31"/>`;
  }
  const hull = `M0.3,0.2 L${h(n - 0.5)},0.2 Q${h(n - 0.12)},0.24 ${h(n - 0.05)},0.5 Q${h(n - 0.12)},0.76 ${h(n - 0.5)},0.8 L0.3,0.8 Q0.1,0.8 0.1,0.5 Q0.1,0.2 0.3,0.2Z`;
  if (wreck) {
    // a burnt-out, broken hull
    const mid = n / 2;
    return `<path d="${hull}" fill="#4a3027" stroke="#1a0e0a" stroke-width="0.05"/>
      <path d="M${h(mid - 0.15)},0.2 L${h(mid + 0.05)},0.42 L${h(mid - 0.1)},0.55 L${h(mid + 0.1)},0.8" fill="none" stroke="#1a0e0a" stroke-width="0.08" stroke-linejoin="round"/>
      <path d="M0.45,0.38 L${h(n - 0.8)},0.38" stroke="#6b463a" stroke-width="0.06" stroke-dasharray="0.18 0.12"/>`;
  }
  const turrets = [0.6, ...(n >= 3 ? [n - 0.9] : [])].map(x => `<circle cx="${h(x)}" cy="0.5" r="0.11" fill="#39424c"/><rect x="${h(x)}" y="0.47" width="0.28" height="0.06" fill="#39424c"/>`).join('');
  return `<path d="${hull}" fill="#6b7783" stroke="#2b333c" stroke-width="0.05"/>
    <rect x="0.34" y="0.34" width="${h(n - 0.95)}" height="0.32" rx="0.12" fill="#8794a1"/>
    <rect x="${h(n * 0.45 - 0.22)}" y="0.29" width="0.46" height="0.42" rx="0.07" fill="#c7d0d8" stroke="#2b333c" stroke-width="0.03"/>
    ${n >= 3 ? `<circle cx="${h(n * 0.45 + 0.42)}" cy="0.5" r="0.09" fill="#2b333c"/>` : ''}${turrets}`;
};
// placed on the 8 x 8 board: lying across a row, or turned upright down a column
const seaShip = (cells, kind, { wreck = false, ghost = false } = {}) => {
  const c = [...cells].sort((a, b) => a - b), n = c.length, r0 = Math.floor(c[0] / 8), c0 = c[0] % 8;
  const across = n < 2 || c[1] - c[0] === 1;
  const tf = across ? `translate(${c0},${r0})` : `translate(${c0 + 1},${r0}) rotate(90)`;
  return `<g transform="${tf}"${ghost ? ' opacity="0.55"' : ''}>${seaHull(n, kind, wreck)}</g>`;
};
const seaMark = (i, v, last) => {
  const x = i % 8 + 0.5, y = Math.floor(i / 8) + 0.5;
  let out = '';
  if (v === 1) out += `<circle cx="${x}" cy="${y}" r="0.3" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.05"/><circle cx="${x}" cy="${y}" r="0.18" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="0.06"/><circle cx="${x}" cy="${y}" r="0.06" fill="#fff"/>`;
  else if (v >= 2) {
    const k = v === 3 ? 0.6 : 1, f = (dx, dy) => `${seaN(x + dx * k)},${seaN(y + dy * k)}`;
    out += `${v === 2 ? `<circle cx="${seaN(x + 0.12)}" cy="${seaN(y - 0.3)}" r="0.16" fill="rgba(60,60,60,0.45)"/>` : ''}
      <path d="M${f(0, -0.34)} C${f(0.25, -0.1)} ${f(0.24, 0.26)} ${f(0, 0.3)} C${f(-0.24, 0.26)} ${f(-0.25, -0.1)} ${f(0, -0.34)}Z" fill="#ff6d00"/>
      <path d="M${f(0, -0.12)} C${f(0.13, 0.02)} ${f(0.12, 0.22)} ${f(0, 0.24)} C${f(-0.12, 0.22)} ${f(-0.13, 0.02)} ${f(0, -0.12)}Z" fill="#ffd54f"/>`;
  }
  if (last) out += `<rect x="${seaN(x - 0.46)}" y="${seaN(y - 0.46)}" width="0.92" height="0.92" rx="0.14" fill="none" stroke="#ffd60a" stroke-width="0.08" class="sea-last"/>`;
  return out;
};
// which kind each sunk ship was, from its size (the two 3s and the two 2s in the order they went down)
const seaKinds = (lists) => {
  const used = new Set();
  return lists.map(cells => { const k = SEA_SHIPS.findIndex(([nm, n], j) => n === cells.length && !used.has(j)); used.add(k); return SEA_SHIPS[k]?.[0] || 'Ship'; });
};

// The same rules Home Assistant checks, so the board can show where you're allowed to go
const G8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const g8ok = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const revFlips = (b, i, who) => {
  if (b[i]) return [];
  const other = 3 - who, r0 = Math.floor(i / 8), c0 = i % 8, out = [];
  for (const [dr, dc] of G8) {
    const run = []; let r = r0 + dr, c = c0 + dc;
    while (g8ok(r, c) && b[r * 8 + c] === other) { run.push(r * 8 + c); r += dr; c += dc; }
    if (run.length && g8ok(r, c) && b[r * 8 + c] === who) out.push(...run);
  }
  return out;
};
const drOwner = (v) => (v === 1 || v === 3 ? 0 : v === 2 || v === 4 ? 1 : null);
const drDirs = (v) => (v >= 3 ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : v === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
const drCrowns = (v, i) => (v === 1 && i < 8) || (v === 2 && i >= 56);
const drJumps = (b, start, v, pos, taken) => {
  const out = [], r0 = Math.floor(pos / 8), c0 = pos % 8, me = drOwner(v);
  for (const [dr, dc] of drDirs(v)) {
    const r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;
    if (!g8ok(r2, c2)) continue;
    const mid = (r0 + dr) * 8 + c0 + dc, land = r2 * 8 + c2;
    if (taken.includes(mid) || drOwner(b[mid]) !== 1 - me || (b[land] && land !== start)) continue;
    const nt = [...taken, mid];
    if (drCrowns(v, land)) { out.push([[land], nt]); continue; }
    const more = drJumps(b, start, v, land, nt);
    if (more.length) more.forEach(([p, t]) => out.push([[land, ...p], t])); else out.push([[land], nt]);
  }
  return out;
};
const drMoves = (b, turn) => {
  const caps = [], steps = [];
  b.forEach((v, i) => {
    if (drOwner(v) !== turn) return;
    drJumps(b, i, v, i, []).forEach(([p, t]) => caps.push({ path: [i, ...p], taken: t }));
    if (caps.length) return;
    const r0 = Math.floor(i / 8), c0 = i % 8;
    for (const [dr, dc] of drDirs(v)) { const r = r0 + dr, c = c0 + dc; if (g8ok(r, c) && !b[r * 8 + c]) steps.push({ path: [i, r * 8 + c], taken: [] }); }
  });
  return caps.length ? caps : steps;
};
const APP_ORDER = ['stickers', 'sketch', 'poll', 'checkin', 'locreq', 'device', 'checklist', 'event', 'status', 'timer', 'games'];
const fmtLeft = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const fmtSpan = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
  return [h && `${h} hr`, m && `${m} min`, s && `${s} sec`].filter(Boolean).join(' ') || '0 sec';
};

const PLAY_CSS = `
/* the Add to Message drawer, while you're editing it */
.apps.editing .app { animation: cm-jiggle 0.32s ease-in-out infinite alternate; touch-action: none; }
.apps.editing .app:nth-child(2n) { animation-delay: -0.16s; }
@keyframes cm-jiggle { from { transform: rotate(-1.6deg); } to { transform: rotate(1.6deg); } }
.app { position: relative; }
.app.hid { opacity: 0.38; }
.app .abadge { display: none; position: absolute; top: -4px; left: calc(50% - 36px); width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 18px; font-weight: 700; line-height: 22px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.3); z-index: 2; }
.apps.editing .app .abadge { display: block; background: #8E8E93; }
.apps.editing .app.hid .abadge { background: #34C759; }
.app.dragging { z-index: 5; animation: none !important; transform: scale(1.12); opacity: 0.9; }
.apps-note { font-size: 13px; color: var(--cm-text2); text-align: center; margin: 2px 12px 8px; line-height: 1.4; }
.apps-note[hidden] { display: none; }

/* Home Status */
.xcard.status { width: 268px; }
.st-row { display: flex; align-items: center; gap: 10px; padding: 7px 13px; cursor: pointer; }
.st-row .sti { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; }
.st-row .sti svg { width: 17px; height: 17px; }
.st-row .stl { font-size: 13px; opacity: 0.7; }
.st-row .stv { font-size: 15px; font-weight: 500; line-height: 1.25; word-break: break-word; }
.st-row.ok .sti { background: #34C759; } .st-row.warn .sti { background: #FF9F0A; } .st-row.bad .sti { background: #FF3B30; } .st-row.info .sti { background: #5E5CE6; }

/* Shared Timer */
.xcard.timer { width: 248px; }
.tm-top { display: flex; align-items: center; gap: 12px; padding: 12px 13px 10px; }
.tm-ring { width: 54px; height: 54px; flex-shrink: 0; transform: rotate(-90deg); }
.tm-ring circle { fill: none; stroke-width: 4.5; stroke-linecap: round; }
.tm-ring .bg { stroke: color-mix(in srgb, currentColor 16%, transparent); }
.tm-ring .fg { stroke: #FF9F0A; transition: stroke-dashoffset 0.95s linear; }
.timer.done .tm-ring .fg { stroke: #34C759; } .timer.cancelled .tm-ring .fg { stroke: #8E8E93; }
.tm-left { font-size: 26px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1.1; }
.tm-lab { font-size: 14px; opacity: 0.75; margin-top: 2px; word-break: break-word; }

/* Games */
.xcard.game { width: 268px; }
.g-who { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px; opacity: 0.8; padding: 0 13px 6px; }
.g-who span { display: inline-flex; align-items: center; gap: 5px; }
.g-who i { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.g-who svg { width: 13px; height: 13px; }
.g-ttt { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 4px 22px 12px; }
.g-ttt button { aspect-ratio: 1; border-radius: 12px; background: color-mix(in srgb, currentColor 10%, transparent); display: flex; align-items: center; justify-content: center; }
.g-ttt button svg { width: 62%; height: 62%; }
.g-ttt button .gx { color: #FF453A; } .g-ttt button .go { color: #0A84FF; }
.g-ttt button.win { background: color-mix(in srgb, #34C759 30%, transparent); }
.g-ttt button.last span { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }
.g-ttt span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
@keyframes g-pop { from { transform: scale(0.2); opacity: 0; } to { transform: none; opacity: 1; } }
.g-c4 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 4px 12px 12px; padding: 6px; border-radius: 12px; background: #1E5BD6; }
.g-c4 button { display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; padding: 0; border-radius: 8px; }
.g-c4 button:not([disabled]):active { background: rgba(255,255,255,0.12); }
.g-c4 .d { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.35); box-shadow: inset 0 2px 3px rgba(0,0,0,0.35); }
.g-c4 .d.p1 { background: radial-gradient(circle at 35% 30%, #FF8A80, #E53935 60%, #B71C1C); box-shadow: none; }
.g-c4 .d.p2 { background: radial-gradient(circle at 35% 30%, #FFF59D, #FDD835 60%, #F9A825); box-shadow: none; }
.g-c4 .d.win { outline: 2.5px solid #fff; outline-offset: -2px; }
.g-c4 .d.last { animation: g-drop 0.45s cubic-bezier(.4,0,.7,1.4); }
@keyframes g-drop { from { transform: translateY(-160px); } to { transform: none; } }
.gpick { display: flex; flex-direction: column; gap: 10px; }
.gpick button { width: 100%; display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 16px; background: var(--cm-fill); text-align: left; color: var(--cm-text); }
.gpick .gpi { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; }
.gpick .gpi svg { width: 26px; height: 26px; }
.gpick .gpn { font-size: 16px; font-weight: 600; } .gpick .gps { font-size: 13px; color: var(--cm-text2); margin-top: 2px; }
.tm-custom { display: flex; gap: 8px; margin-top: 10px; }
.tm-custom[hidden] { display: none; }
.tm-custom label { flex: 1; display: flex; align-items: center; gap: 6px; background: var(--cm-fill); border-radius: 12px; padding: 0 12px; height: 46px; color: var(--cm-text2); font-size: 15px; }
.tm-custom input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--cm-text); font-size: 17px; text-align: right; }

/* ── Reversi, Draughts and Sea Battle ── */
.xcard.game.big { width: 276px; }
.g-note { text-align: center; font-size: 12.5px; opacity: 0.75; padding: 0 12px 6px; margin-top: -2px; }
.g-who .rd, .g-who .pc { width: 12px; height: 12px; }
.g-rev { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; margin: 4px 10px 12px; padding: 4px; border-radius: 10px; background: #145a32; box-shadow: inset 0 0 0 2px #0d3d22; }
.g-rev button { aspect-ratio: 1; padding: 0; border-radius: 3px; background: #1e8a4c; display: flex; align-items: center; justify-content: center; }
.g-rev button.ok:active { background: #27a85d; }
.rd { display: block; width: 84%; height: 84%; border-radius: 50%; }
.rd.d1 { background: radial-gradient(circle at 35% 30%, #5a5a5e, #111 70%); box-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.rd.d2 { background: radial-gradient(circle at 35% 30%, #fff, #d9d9de 70%); box-shadow: 0 1px 2px rgba(0,0,0,0.45); }
.g-rev .hint { width: 26%; height: 26%; border-radius: 50%; background: rgba(0,0,0,0.28); }
.g-rev .rd.last { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }
.g-rev .rd.flip { animation: g-flip 0.5s ease; }
@keyframes g-flip { 0% { transform: scaleX(1); } 50% { transform: scaleX(0.05); } 100% { transform: scaleX(1); } }
.g-dr { display: grid; grid-template-columns: repeat(8, 1fr); margin: 4px 10px 12px; border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 3px #5b3a1e; }
.g-dr > * { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
.g-dr .lt { background: #f0d9b5; }
.g-dr .dk { padding: 0; border-radius: 0; background: #8b5a2b; }
.g-dr .dk.trail { background: #a8743e; }
.g-dr .dk.sel { background: #c9a227; }
.g-dr .dk.tgt { background: #6f9a3a; }
.g-dr .dk.tgt::after { content: ''; width: 30%; height: 30%; border-radius: 50%; background: rgba(255,255,255,0.55); }
.pc { display: flex; align-items: center; justify-content: center; width: 70%; height: 70%; border-radius: 50%; }
.pc.p0 { background: radial-gradient(circle at 35% 30%, #ff7a6b, #c0392b 60%, #7b1e14); box-shadow: 0 2px 2px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.18); }
.pc.p1 { background: radial-gradient(circle at 35% 30%, #fffdf4, #e8dcc0 60%, #b5a37a); box-shadow: 0 2px 2px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(0,0,0,0.08); }
.pc svg { width: 58%; height: 58%; }
.pc.p0 svg { color: #ffd76a; } .pc.p1 svg { color: #9a6b10; }
.g-dr .dk.can .pc { box-shadow: 0 0 0 2px #ffd60a, 0 2px 2px rgba(0,0,0,0.45); }
.g-dr .pc.last { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }
.g-who .pc { display: inline-block; }
.sea-l { font-size: 12px; font-weight: 600; opacity: 0.75; padding: 2px 12px 4px; }
.g-sea { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; margin: 0 10px 10px; padding: 3px; border-radius: 8px; background: #0b3e8a; position: relative; }
.g-sea > button, .g-sea > span { aspect-ratio: 1; padding: 0; border-radius: 3px; background: #1565c0; }
.g-sea button:not([disabled]):active { background: #1e88e5; }
.g-sea .sea-art { position: absolute; inset: 3px; width: calc(100% - 6px); height: calc(100% - 6px); pointer-events: none; overflow: visible; }
.g-sea .sea-last { animation: g-fade 1.2s ease-out both; }
@keyframes g-fade { from { opacity: 0; } 30% { opacity: 1; } }
.g-sea.small { gap: 1px; padding: 2px; border-radius: 6px; margin: 0; width: 132px; }
.g-sea.small > button, .g-sea.small > span { border-radius: 2px; }
.g-sea.small .sea-art { inset: 2px; width: calc(100% - 4px); height: calc(100% - 4px); }
.sea-roster { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.sr-row { display: flex; align-items: center; gap: 8px; }
.sr-n { width: 64px; flex-shrink: 0; font-size: 12px; font-weight: 600; opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sr-ships { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.sr-ship { position: relative; display: inline-flex; }
.sr-ship svg { height: 11px; display: block; }
.sr-ship.sunk { opacity: 0.35; }
.sr-ship.sunk::after { content: ''; position: absolute; left: -2px; right: -2px; top: 50%; height: 1.5px; background: #ff453a; transform: rotate(-12deg); }
.sea-own { display: flex; align-items: flex-end; gap: 10px; padding: 0 10px 10px; }
.sea-own .sea-l { padding: 2px 0 4px; }
.sea-move { flex: 1; padding: 9px 8px; border-radius: 12px; font-size: 13.5px; font-weight: 600; color: var(--cm-accent); background: color-mix(in srgb, currentColor 10%, transparent); }
.sea-two { display: flex; gap: 8px; padding: 0 10px 10px; justify-content: center; }
.sea-two .g-sea.small { width: 124px; }
.sea-two .sea-l { padding: 2px 0 4px; }

/* ── Archive, Remind Me, Location request ── */
.arch-row { width: calc(100% - 20px); margin: 2px 10px 6px; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: var(--cm-fill2, var(--cm-fill)); color: var(--cm-text); text-align: left; font-size: 16px; }
.arch-row .ai { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--cm-fill); color: var(--cm-text2); }
.arch-row .ai svg { width: 18px; height: 18px; }
.arch-row .al { flex: 1; font-weight: 600; }
.arch-row .ac { color: var(--cm-text2); font-size: 15px; }
.arch-row .ac b { color: #fff; background: var(--cm-accent); border-radius: 10px; padding: 1px 7px; font-size: 13px; }
.arch-row > svg { width: 13px; height: 13px; color: var(--cm-text3, var(--cm-text2)); }
.arch-note { margin: 0 16px 10px; font-size: 13px; line-height: 1.4; color: var(--cm-text2); text-align: center; }
.arch-note button { display: block; margin: 6px auto 0; color: var(--cm-accent); font-size: 14px; font-weight: 600; }
.pill.archback { padding: 0 14px 0 10px; gap: 2px; }
.pill.archback svg { width: 18px; height: 18px; }
.swipe-actions .arch { background: #8E8E93; }
.remindmk { display: inline-flex; align-items: center; gap: 4px; margin: 2px 6px 0; font-size: 11.5px; font-weight: 600; color: var(--cm-accent); }
.remindmk svg { width: 13px; height: 13px; }
.remtag { color: var(--cm-accent); font-weight: 600; }
.remtag::before { content: '⏰ '; }
.xcard.lqcard { width: 260px; }
.xcard.lqcard .xh svg { color: #FF453A; }
.xbtns button.bold { font-weight: 700; }
`;

Object.assign(CrowMessengerCard.prototype, {

  // ── The Add to Message drawer: your own order, and apps you've hidden ─────
  _appPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem('crowMessengerApps') || '{}') || {}; } catch (e) { /* */ }
    const order = (Array.isArray(p.order) ? p.order : []).filter(id => APP_ORDER.includes(id));
    APP_ORDER.forEach(id => { if (!order.includes(id)) order.splice(Math.min(order.length, APP_ORDER.indexOf(id)), 0, id); });
    return { order, hidden: new Set((Array.isArray(p.hidden) ? p.hidden : []).filter(id => APP_ORDER.includes(id))) };
  },
  _saveAppPrefs(order, hidden) {
    try { localStorage.setItem('crowMessengerApps', JSON.stringify({ order, hidden: [...hidden] })); } catch (e) { /* private window */ }
  },

  _openApps(tid, composer) {
    const f = this._s.features || {};
    const prefs = this._appPrefs();
    let editing = false;
    const appHtml = (id) => {
      const a = this._appLook(id), off = id === 'checkin' && !f.checkin;
      return `<div class="app${prefs.hidden.has(id) ? ' hid' : ''}" data-app="${id}" role="button"${off ? ' aria-disabled="true"' : ''}><span class="abadge">${prefs.hidden.has(id) ? '+' : '−'}</span><span class="ai" style="background:${a.bg}">${a.icon}</span>${esc(a.name)}</div>`;
    };
    const sh = this._xsheet({
      title: 'Add to Message', action: 'Edit',
      body: `<div class="apps-note" hidden>Drag to reorder. Tap an app to hide or show it.</div><div class="apps"></div>`,
      onAction: () => { setEditing(!editing); return false; },
    });
    const grid = sh.el.querySelector('.apps'), note = sh.el.querySelector('.apps-note');
    const render = () => { grid.innerHTML = prefs.order.filter(id => editing || !prefs.hidden.has(id)).map(appHtml).join(''); };
    const setEditing = (on) => {
      editing = on;
      grid.classList.toggle('editing', on); note.hidden = !on;
      if (sh.actBtn) sh.actBtn.textContent = on ? 'Done' : 'Edit';
      render();
    };
    render();
    // press and hold an app to start editing, like the iPhone's Home Screen
    let hold = null, drag = null, held = false;
    grid.addEventListener('pointerdown', (e) => {
      const app = e.target.closest('.app');
      if (!app) return;
      held = false;
      if (!editing) { hold = setTimeout(() => { held = true; navigator.vibrate?.(10); setEditing(true); }, 520); return; }
      drag = { app, x: e.clientX, y: e.clientY, on: false, id: app.dataset.app };
    });
    const endHold = () => { clearTimeout(hold); hold = null; };
    grid.addEventListener('pointermove', (e) => {
      if (hold && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) endHold();
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on && Math.hypot(dx, dy) < 8) return;
      if (!drag.on) { drag.on = true; drag.app.classList.add('dragging'); try { grid.setPointerCapture(e.pointerId); } catch (err) { /* */ } }
      drag.app.style.translate = `${dx}px ${dy}px`;
      // swap with the app under your finger
      const over = [...grid.querySelectorAll('.app')].find(a => {
        if (a === drag.app) return false;
        const r = a.getBoundingClientRect();
        return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      });
      if (over) {
        const before = [...grid.children].indexOf(over) < [...grid.children].indexOf(drag.app);
        const r0 = drag.app.getBoundingClientRect();
        grid.insertBefore(drag.app, before ? over : over.nextSibling);
        const r1 = drag.app.getBoundingClientRect();
        drag.x += r1.left - r0.left; drag.y += r1.top - r0.top;
        drag.app.style.translate = `${e.clientX - drag.x}px ${e.clientY - drag.y}px`;
      }
    });
    const endDrag = () => {
      endHold();
      if (!drag) return;
      const was = drag.on;
      drag.app.classList.remove('dragging'); drag.app.style.translate = '';
      if (was) {
        prefs.order = [...grid.querySelectorAll('.app')].map(a => a.dataset.app).concat(prefs.order.filter(id => !grid.querySelector(`[data-app="${id}"]`)));
        this._saveAppPrefs(prefs.order, prefs.hidden);
        held = true;   // a drag isn't a tap
      }
      drag = null;
    };
    grid.addEventListener('pointerup', endDrag);
    grid.addEventListener('pointercancel', endDrag);
    grid.addEventListener('contextmenu', (e) => e.preventDefault());
    grid.addEventListener('click', (e) => {
      const app = e.target.closest('[data-app]');
      if (!app) return;
      if (held) { held = false; return; }
      const id = app.dataset.app;
      if (editing) {
        if (prefs.hidden.has(id)) prefs.hidden.delete(id);
        else if (prefs.order.filter(x => !prefs.hidden.has(x)).length > 1) prefs.hidden.add(id);
        this._saveAppPrefs(prefs.order, prefs.hidden);
        render();
        return;
      }
      if (id === 'checkin' && app.getAttribute('aria-disabled') === 'true') {
        this._toast('Check In needs a person in Home Assistant linked to your user');
        return;
      }
      sh.close();
      // the ones you type in open straight away, inside the tap, so the iPhone lets the
      // keyboard come up with the cursor in the first field (it won't from a timer)
      if (id === 'poll') { this._openPoll(tid, composer); return; }
      if (id === 'checklist') { this._openChecklist(tid, composer); return; }
      if (id === 'event') { this._openEvent(tid, composer); return; }
      if (id === 'timer') { this._openTimer(tid, composer); return; }
      if (id === 'status') { this._stageStatus(tid, composer); return; }
      if (id === 'locreq') { this._stageApp(composer, tid, 'locreq', { extra: { type: 'locreq' }, label: 'Where are you?', sub: 'Asks for their location, once' }); return; }
      setTimeout(() => {
        if (id === 'stickers') this._openStickers({ tid, composer });
        if (id === 'sketch') this._openSketch({ onDone: (file) => composer.addFiles([file]) });
        if (id === 'checkin') this._openCheckIn(tid, composer);
        if (id === 'device') this._openShareDevice(tid, composer);
        if (id === 'games') this._openGames(tid, composer);
      }, 200);
    });
  },

  // ── Home Status ──────────────────────────────────────────────────────────
  // What's unlocked, open or on right now (devices hidden with Share Device's Hide, or hidden in
  // Home Assistant, are left out)
  _homeStatus() {
    const st = this._hass?.states || {}, hid = this._s.shareHidden || new Set(), ents = this._hass?.entities || {};
    const all = Object.values(st).filter(x => !hid.has(x.entity_id) && !ents[x.entity_id]?.hidden && !['unavailable', 'unknown'].includes(x.state));
    const locks = all.filter(x => x.entity_id.startsWith('lock.'));
    const alarms = all.filter(x => x.entity_id.startsWith('alarm_control_panel.'));
    const open = all.filter(x => (x.entity_id.startsWith('binary_sensor.') && ['door', 'window', 'garage_door', 'opening'].includes(x.attributes.device_class) && x.state === 'on')
      || (x.entity_id.startsWith('cover.') && ['garage', 'gate', 'door'].includes(x.attributes.device_class) && ['open', 'opening'].includes(x.state)));
    const contacts = all.filter(x => (x.entity_id.startsWith('binary_sensor.') && ['door', 'window', 'garage_door', 'opening'].includes(x.attributes.device_class))
      || (x.entity_id.startsWith('cover.') && ['garage', 'gate', 'door'].includes(x.attributes.device_class)));
    // light groups would count their lights twice
    const lights = all.filter(x => x.entity_id.startsWith('light.') && x.state === 'on' && !Array.isArray(x.attributes.entity_id));
    return { locks, unlocked: locks.filter(l => l.state !== 'locked'), alarms, open, contacts, lights };
  },
  _statusSummary(h = this._homeStatus()) {
    const bits = [];
    if (h.locks.length) bits.push(h.unlocked.length ? `${h.unlocked.length} unlocked` : 'All locked');
    if (h.contacts.length) bits.push(h.open.length ? `${h.open.length} open` : 'All closed');
    bits.push(h.lights.length ? `${h.lights.length} light${h.lights.length === 1 ? '' : 's'} on` : 'Lights off');
    return bits.join(' · ');
  },
  _stageStatus(tid, composer) {
    this._stageApp(composer, tid, 'status', { extra: { type: 'status' }, label: 'Home Status', sub: this._statusSummary() });
  },
  _statusHtml() {
    const h = this._homeStatus(), name = (x) => x.attributes.friendly_name || x.entity_id;
    const list = (xs, n = 3) => xs.slice(0, n).map(name).join(', ') + (xs.length > n ? ` and ${xs.length - n} more` : '');
    const fmt = (x) => this._hass.formatEntityState ? this._hass.formatEntityState(x) : x.state;
    const rows = [];
    if (h.locks.length) rows.push(h.unlocked.length
      ? { cls: 'bad', icon: PICON.unlock, l: 'Locks', v: `${list(h.unlocked)} ${h.unlocked.length === 1 ? 'is' : 'are'} unlocked`, eid: h.unlocked[0].entity_id }
      : { cls: 'ok', icon: PICON.lock, l: 'Locks', v: h.locks.length === 1 ? `${name(h.locks[0])} is locked` : `All ${h.locks.length} locked`, eid: h.locks[0].entity_id });
    h.alarms.slice(0, 2).forEach(a => rows.push({ cls: a.state === 'disarmed' ? 'warn' : a.state === 'triggered' ? 'bad' : 'ok', icon: PICON.shield, l: name(a), v: fmt(a), eid: a.entity_id }));
    if (h.contacts.length) rows.push(h.open.length
      ? { cls: 'warn', icon: PICON.door, l: 'Doors & Windows', v: `${list(h.open)} ${h.open.length === 1 ? 'is' : 'are'} open`, eid: h.open[0].entity_id }
      : { cls: 'ok', icon: PICON.door, l: 'Doors & Windows', v: 'All closed', eid: h.contacts[0].entity_id });
    rows.push(h.lights.length
      ? { cls: 'info', icon: PICON.bulb, l: 'Lights', v: `${h.lights.length} on: ${list(h.lights)}`, eid: h.lights[0].entity_id }
      : { cls: 'ok', icon: PICON.bulb, l: 'Lights', v: 'All off' });
    const issues = h.unlocked.length + h.open.length + h.alarms.filter(a => a.state === 'triggered').length;
    const title = issues ? `${issues} Thing${issues === 1 ? '' : 's'} to Check` : 'All Secure';
    const btns = [h.unlocked.length ? '<button data-x="stlock">Lock All</button>' : '', h.lights.length ? '<button data-x="stlights">Lights Off</button>' : ''].join('');
    return `<div class="xcard status" data-x="status">
      <div class="xh">${PICON.status}Home Status</div>
      <div class="xt">${esc(title)}</div>
      ${rows.map(r => `<div class="st-row ${r.cls}"${r.eid ? ` data-x="strow" data-eid="${esc(r.eid)}"` : ''}><span class="sti">${r.icon}</span><div style="min-width:0"><div class="stl">${esc(r.l)}</div><div class="stv">${esc(r.v)}</div></div></div>`).join('')}
      <div class="xs" style="padding-top:6px">Live from Home Assistant</div>
      ${btns ? `<div class="xbtns">${btns}</div>` : ''}</div>`;
  },

  // ── Shared Timer ─────────────────────────────────────────────────────────
  _openTimer(tid, composer) {
    const quick = [[60, '1 min'], [300, '5 min'], [600, '10 min'], [900, '15 min'], [1200, '20 min'], [1800, '30 min'], [2700, '45 min'], [3600, '1 hour'], [0, 'Custom']];
    let secs = 600;
    const sh = this._xsheet({
      title: 'Timer', action: 'Add',
      body: `${this._fieldBox([{ cls: 'tlab', placeholder: 'What’s it for? (e.g. Pizza)', cap: true }])}
        <div class="xlabel">How Long</div>
        <div class="chipsel tq">${quick.map(([v, n]) => `<button data-s="${v}">${n}</button>`).join('')}</div>
        <div class="tm-custom" hidden><label>Hours<input type="number" inputmode="numeric" min="0" max="23" class="th" value="0"></label><label>Mins<input type="number" inputmode="numeric" min="0" max="59" class="tmn" value="10"></label></div>
        <div class="xnote">Everyone in the conversation sees it count down, and gets a notification when it’s done.</div>`,
      onAction: () => {
        let s = secs;
        if (!s) s = (parseInt(sh.el.querySelector('.th').value, 10) || 0) * 3600 + (parseInt(sh.el.querySelector('.tmn').value, 10) || 0) * 60;
        if (s < 5 || s > 86400) { this._toast('Choose a time up to 24 hours'); return false; }
        const label = sh.el.querySelector('.tlab').value.trim();
        this._stageApp(composer, tid, 'timer', { text: label, extra: { type: 'timer', timer: { seconds: s } }, label: label ? `Timer: ${label}` : 'Timer', sub: fmtSpan(s) });
      },
    });
    const mark = () => {
      sh.el.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === secs));
      sh.el.querySelector('.tm-custom').hidden = secs !== 0;
    };
    sh.el.querySelector('.tq').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { secs = +b.dataset.s; mark(); } });
    mark();
    this._focusFirst?.(sh.el.querySelector('.tlab'));
  },
  _timerHtml(m) {
    const tm = m.timer || {}, label = m.text || 'Timer', C = 2 * Math.PI * 22;
    const left = tm.status === 'running' ? Math.max(0, tm.ends - Date.now()) : 0;
    const frac = tm.status === 'running' ? left / Math.max(1, tm.seconds * 1000) : 1;
    const big = tm.status === 'running' ? fmtLeft(left) : tm.status === 'done' ? 'Done' : 'Cancelled';
    const sub = tm.status === 'running' ? `${esc(label)} · ${fmtSpan(tm.seconds)}` : `${esc(label)}${tm.done_at ? ` · ${tm.status === 'done' ? 'finished' : 'stopped'} at ${esc(fmtTime(tm.done_at, this._hass))}` : ''}`;
    return `<div class="xcard timer ${esc(tm.status || '')}" data-x="timer">
      <div class="tm-top"><svg class="tm-ring" viewBox="0 0 54 54"><circle class="bg" cx="27" cy="27" r="22"/><circle class="fg" cx="27" cy="27" r="22" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(2)}"${tm.status === 'running' ? ` data-ring="${tm.ends}" data-total="${tm.seconds}"` : ''}/></svg>
        <div style="min-width:0"><div class="tm-left"${tm.status === 'running' ? ` data-ends="${tm.ends}"` : ''}>${big}</div><div class="tm-lab">${sub}</div></div></div>
      ${tm.status === 'running' ? '<div class="xbtns"><button data-x="tmadd">+1 Min</button><button class="red" data-x="tmcancel">Cancel</button></div>' : ''}</div>`;
  },
  // one ticker for every running timer on screen
  _tickTimers() {
    if (this._tmTick) return;
    this._tmTick = setInterval(() => {
      const els = this.shadowRoot?.querySelectorAll('[data-ends], [data-ring]') || [];
      if (!els.length || !this.isConnected) { clearInterval(this._tmTick); this._tmTick = null; return; }
      const now = Date.now();
      els.forEach(e => {
        if (e.dataset.ends) { const left = +e.dataset.ends - now; e.textContent = left > 0 ? fmtLeft(left) : 'Time’s up'; }
        if (e.dataset.ring) { const C = 2 * Math.PI * 22, f = Math.max(0, +e.dataset.ring - now) / Math.max(1, +e.dataset.total * 1000); e.setAttribute('stroke-dashoffset', (C * (1 - f)).toFixed(2)); }
      });
    }, 1000);
  },

  // ── Games ────────────────────────────────────────────────────────────────
  _openGames(tid, composer) {
    const sh = this._xsheet({
      title: 'Games',
      body: `<div class="gpick">${GAMES.map(g => `<button data-g="${g.id}"><span class="gpi" style="background:${g.bg}">${PICON[g.icon || (g.id === 'ttt' ? 'x' : 'o')]}</span><span><div class="gpn">${esc(g.name)}</div><div class="gps">${esc(g.sub)}</div></span></button>`).join('')}</div>
        <div class="xnote">Home Assistant keeps the game, so you can take turns whenever you like. It lets the other person know when it’s their turn.</div>`,
    });
    sh.el.querySelector('.gpick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      const g = GAMES.find(x => x.id === b.dataset.g);
      sh.close();
      this._stageApp(composer, tid, 'games', { extra: { type: 'game', game: { kind: g.id } }, label: g.name, sub: g.sub });
    });
  },
  _gameHtml(m) {
    const g = m.game || {}, me = this._s.me;
    const nm = (u) => (u === me ? 'You' : this._nameIn(m.thread_id, u, true));
    if (g.kind === 'word') {
      return `<div class="xcard game" data-x="game"><div class="xh">${PICON.games}Word Game</div><div class="xs" style="padding-top:2px">This game is no longer available.</div></div>`;
    }
    const players = g.players || [], over = g.winner !== null && g.winner !== undefined;
    const tp = players[g.turn];
    const mine = !over && (tp === me || (tp == null && g.turn === 1 && players[0] !== me));
    const status = over ? (g.winner === 'draw' ? 'It’s a draw' : players[g.winner] === me && players[0] !== players[1] ? 'You won! 🎉' : `${esc(nm(players[g.winner]))} won${players[0] === players[1] ? '' : ' 🎉'}`)
      : mine ? 'Your turn' : tp ? `${esc(nm(tp))}’s turn` : 'Waiting for someone to play';
    const board = g.board || [], line = g.line || [];
    const who = (i) => players[i] ? esc(nm(players[i])) : 'Anyone';
    if (g.kind === 'rev' || g.kind === 'dr' || g.kind === 'sea') return this._bigGameHtml(m, g, { mine, over, status, who, nm });
    let grid, legend;
    if (g.kind === 'ttt') {
      legend = `<span><span class="gx" style="color:#FF453A">${PICON.x}</span>${who(0)}</span><span><span style="color:#0A84FF">${PICON.o}</span>${who(1)}</span>`;
      grid = `<div class="g-ttt">${board.map((v, i) => `<button class="${line.includes(i) ? 'win' : ''}${i === g.last ? ' last' : ''}" data-x="gmove" data-mv="${i}"${mine && !v ? '' : ' disabled'}>${v ? `<span class="${v === 1 ? 'gx' : 'go'}">${v === 1 ? PICON.x : PICON.o}</span>` : ''}</button>`).join('')}</div>`;
    } else {
      legend = `<span><i style="background:#E53935"></i>${who(0)}</span><span><i style="background:#FDD835"></i>${who(1)}</span>`;
      const cols = [];
      for (let c = 0; c < 7; c++) {
        const full = !!board[c];
        cols.push(`<button data-x="gmove" data-mv="${c}" aria-label="Column ${c + 1}"${mine && !full ? '' : ' disabled'}>${[0, 1, 2, 3, 4, 5].map(r => { const i = r * 7 + c, v = board[i]; return `<span class="d${v ? ` p${v}` : ''}${line.includes(i) ? ' win' : ''}${i === g.last && m.id === this._gameNew ? ' last' : ''}"></span>`; }).join('')}</button>`);
      }
      grid = `<div class="g-c4">${cols.join('')}</div>`;
    }
    return `<div class="xcard game" data-x="game"><div class="xh">${PICON.games}${esc(GAME_NAME[g.kind] || 'Game')}</div>
      <div class="xt" style="text-align:center">${status}</div>
      <div class="g-who">${legend}</div>${grid}
      ${over ? '<div class="xbtns"><button data-x="gagain">Play Again</button></div>' : ''}</div>`;
  },

  // clicks on the new cards (from _moreClick)
  async _playClick(kind, x, tid, m) {
    if (kind === 'strow') { this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: x.dataset.eid } })); return; }
    if (kind === 'stlock' || kind === 'stlights') {
      const h = this._homeStatus(), lock = kind === 'stlock', ids = (lock ? h.unlocked : h.lights).map(e => e.entity_id);
      if (!ids.length) return;
      const r = await this._alert({ title: lock ? `Lock ${ids.length === 1 ? (h.unlocked[0].attributes.friendly_name || 'it') : `All ${ids.length}`}?` : `Turn Off ${ids.length} Light${ids.length === 1 ? '' : 's'}?`,
        buttons: [{ text: lock ? 'Lock' : 'Turn Off', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
      if (!r.value) return;
      await this._hass.callService(lock ? 'lock' : 'light', lock ? 'lock' : 'turn_off', { entity_id: ids });
      this._toast(lock ? 'Locking…' : 'Turning off…');
      return;
    }
    if (kind === 'tmadd') { await this._ws('timer', { thread_id: tid, message_id: m.id, action: 'add', minutes: 1 }); return; }
    if (kind === 'tmcancel') {
      const r = await this._alert({ title: 'Cancel Timer?', message: 'It stops for everyone in the conversation.', buttons: [{ text: 'Cancel Timer', style: 'destructive', value: true }, { text: 'Keep', style: 'cancel' }] });
      if (r.value) await this._ws('timer', { thread_id: tid, message_id: m.id, action: 'cancel' });
      return;
    }
    if (kind === 'gmove') { this._gameNew = m.id; await this._ws('game/move', { thread_id: tid, message_id: m.id, move: +x.dataset.mv }); return; }
    if (kind === 'gagain') { await this._sendMessage(tid, '', [], { type: 'game', game: { kind: m.game?.kind || 'ttt' } }); }
    if (kind === 'gdr') { await this._draughtsTap(x, tid, m); return; }
    if (kind === 'gshuffle') {
      const r = await this._ws('game/shuffle', { thread_id: tid, message_id: m.id });
      this._fleets.set(`${m.id}:${r.side}`, r);
      this._refresh('messages', tid, true);
    }
  },

  // ── Reversi, Draughts and Sea Battle boards ──────────────────────────────
  _bigGameHtml(m, g, { mine, over, status, who, nm }) {
    const me = this._s.me, players = g.players || [], solo = players[0] && players[0] === players[1];
    const head = (extra = '') => `<div class="xcard game big gk-${g.kind}" data-x="game"><div class="xh">${PICON.games}${esc(GAME_NAME[g.kind])}</div>
      <div class="xt" style="text-align:center">${status}</div>${extra}`;
    const foot = `${over ? '<div class="xbtns"><button data-x="gagain">Play Again</button></div>' : ''}</div>`;
    const b = g.board || [];
    if (g.kind === 'rev') {
      const sc = g.score || [b.filter(v => v === 1).length, b.filter(v => v === 2).length];
      const note = g.passed != null && !over ? `<div class="g-note">${esc(players[g.passed] === me ? 'You' : nm(players[g.passed]) || 'They')} had no moves, so ${players[g.turn] === me ? 'you go' : `${esc(nm(players[g.turn]))} goes`} again</div>` : '';
      const legend = `<div class="g-who"><span><i class="rd d1"></i>${who(0)} ${sc[0]}</span><span><i class="rd d2"></i>${who(1)} ${sc[1]}</span></div>`;
      const fresh = m.id === this._gameNew, flipped = new Set(fresh ? g.flipped || [] : []);
      const cells = b.map((v, i) => {
        const legal = mine && !v && revFlips(b, i, g.turn + 1).length;
        return `<button data-x="gmove" data-mv="${i}"${legal ? ' class="ok"' : ' disabled'} aria-label="Square ${i + 1}">${v ? `<span class="rd d${v}${i === g.last ? ' last' : ''}${flipped.has(i) ? ' flip' : ''}"></span>` : legal ? '<span class="hint"></span>' : ''}</button>`;
      }).join('');
      return head(legend + note) + `<div class="g-rev">${cells}</div>` + foot;
    }
    if (g.kind === 'dr') {
      // you always see your own pieces at the bottom
      const flip = !solo && players[1] === me;
      const cnt = g.count || [12, 12];
      const legal = mine ? drMoves(b, g.turn) : [];
      const must = legal.some(x => x.taken.length);
      const trail = new Set(g.path || []);
      const legend = `<div class="g-who"><span><i class="pc p0"></i>${who(0)} ${cnt[0]}</span><span><i class="pc p1"></i>${who(1)} ${cnt[1]}</span></div>`;
      let cells = '';
      for (let k = 0; k < 64; k++) {
        const i = flip ? 63 - k : k, r = Math.floor(i / 8), c = i % 8, v = b[i];
        if ((r + c) % 2 === 0) { cells += '<span class="lt"></span>'; continue; }
        const can = legal.some(x => x.path[0] === i);
        cells += `<button data-x="gdr" data-sq="${i}" class="dk${trail.has(i) ? ' trail' : ''}${can ? ' can' : ''}"${mine ? '' : ' disabled'}>${v ? `<span class="pc p${drOwner(v)}${v >= 3 ? ' king' : ''}${i === g.last && m.id === this._gameNew ? ' last' : ''}">${v >= 3 ? PICON.crown : ''}</span>` : ''}</button>`;
      }
      return head(legend + (mine && must ? '<div class="g-note">You have to take a piece</div>' : '')) + `<div class="g-dr">${cells}</div>` + foot;
    }
    // Sea Battle
    // in a group, whoever fires second joins as the other player
    const side = solo ? g.turn : players[0] === me ? 0 : players[1] === me ? 1 : players[1] == null && !over ? 1 : null;
    const shots = g.shots || [[], []], sunk = g.sunk || [[], []], left = (k) => 5 - (sunk[k] || []).length;
    let fleet = null;
    if (g.reveal) fleet = null;
    else if (side != null) {
      const key = `${m.id}:${side}`, f = this._fleets.get(key);
      if (f) fleet = f.fleet;
      else if (!this._fleetAsk.has(key)) {
        this._fleetAsk.add(key);
        this._ws('game/fleet', { thread_id: m.thread_id, message_id: m.id })
          .then(r => { if (r?.fleet) { this._fleets.set(key, r); this._refresh('messages', m.thread_id, true); } })
          .catch(() => {}).finally(() => setTimeout(() => this._fleetAsk.delete(key), 5000));
      }
    }
    const grid = (k, { fire = false, small = false } = {}) => {
      const sh = shots[k] || [], wrecks = sunk[k] || [];
      const sunkCells = new Set(wrecks.flat());
      // your own ships (or everyone's once the game's over), minus any that have gone down
      const whole = (g.reveal ? g.reveal[k] : k === side ? fleet : null) || [];
      const ships = whole.map((cells, j) => [cells, SEA_SHIPS[j]?.[0]]).filter(([cells]) => !cells.every(c => sunkCells.has(c)));
      const kinds = seaKinds(wrecks);
      const art = ships.map(([cells, kind]) => seaShip(cells, kind, { ghost: !!g.reveal && k !== side })).join('')
        + wrecks.map((cells, j) => seaShip(cells, kinds[j], { wreck: true })).join('')
        + sh.map((v, i) => (v || (g.last === i && g.last_board === k) ? seaMark(i, v, g.last === i && g.last_board === k) : '')).join('');
      const cells = Array.from({ length: 64 }, (_, i) => {
        const v = sh[i] || 0, name = `${'ABCDEFGH'[i % 8]}${Math.floor(i / 8) + 1}`;
        return fire && !v ? `<button data-x="gmove" data-mv="${i}" aria-label="Fire at ${name}"${mine ? '' : ' disabled'}></button>`
          : `<span aria-label="${name}${v === 1 ? ' miss' : v === 2 ? ' hit' : v === 3 ? ' sunk' : ''}"></span>`;
      }).join('');
      return `<div class="g-sea${small ? ' small' : ''}">${cells}<svg class="sea-art" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true">${art}</svg></div>`;
    };
    // the five ships on each side, crossed out as they're sunk
    const roster = (k, label) => {
      const gone = seaKinds(sunk[k] || []);
      const marks = SEA_SHIPS.map(([nm, n]) => {
        const i = gone.indexOf(nm); if (i >= 0) gone[i] = null;
        return `<span class="sr-ship${i >= 0 ? ' sunk' : ''}" title="${nm}${i >= 0 ? ' (sunk)' : ''}"><svg viewBox="0 0 ${n} 1" style="width:${n * 11}px">${seaHull(n, nm, false)}</svg></span>`;
      }).join('');
      return `<div class="sr-row"><span class="sr-n">${label}</span><span class="sr-ships">${marks}</span></div>`;
    };
    const lastLine = (() => {
      if (g.last == null || !g.result) return '';
      const shooter = 1 - g.last_board, by = players[shooter] === me && !solo ? 'You' : esc(nm(players[shooter]) || 'They');
      const at = side != null && !solo && g.last_board === side ? 'your' : 'a';
      return `<div class="g-note">${by} ${g.result === 'miss' ? 'missed' : g.result === 'hit' ? `hit ${at} ship` : `sank ${at} ship`}${g.result === 'miss' ? '' : '!'}</div>`;
    })();
    if (side == null) {
      return head(lastLine) + `<div class="sea-two"><div><div class="sea-l">${who(0)} · ${left(0)} left</div>${grid(0, { small: true })}</div><div><div class="sea-l">${who(1)} · ${left(1)} left</div>${grid(1, { small: true })}</div></div>`
        + `<div class="sea-roster">${roster(0, who(0))}${roster(1, who(1))}</div>` + foot;
    }
    const opp = 1 - side, oppName = solo ? (side === 0 ? 'Fleet 2' : 'Fleet 1') : who(opp);
    const canShuffle = !over && !(shots[side] || []).some(Boolean);
    return head(lastLine)
      + `<div class="sea-l">${oppName}’s waters · ${left(opp)} ship${left(opp) === 1 ? '' : 's'} left</div>${grid(opp, { fire: !over })}`
      + `<div class="sea-own"><div><div class="sea-l">Your fleet · ${left(side)} left</div>${grid(side, { small: true })}</div>`
      + `${canShuffle ? '<button class="sea-move" data-x="gshuffle">Move My Ships</button>' : ''}</div>`
      + `<div class="sea-roster">${roster(opp, oppName)}${roster(side, 'You')}</div>` + foot;
  },

  // Draughts: tap one of your pieces, then where it goes (a capture takes the whole jump)
  async _draughtsTap(x, tid, m) {
    const g = m.game || {}, sq = +x.dataset.sq, card = x.closest('.xcard');
    const legal = drMoves(g.board || [], g.turn);
    const sel = this._drSel?.mid === m.id ? this._drSel.from : null;
    const clear = () => { card.querySelectorAll('.sel,.tgt').forEach(e => e.classList.remove('sel', 'tgt')); this._drSel = null; };
    if (sel != null) {
      const opts = legal.filter(mv => mv.path[0] === sel && mv.path[mv.path.length - 1] === sq).sort((a, b) => b.taken.length - a.taken.length);
      if (opts.length) {
        clear();
        this._gameNew = m.id;
        await this._ws('game/move', { thread_id: tid, message_id: m.id, move: opts[0].path });
        return;
      }
    }
    clear();
    const from = legal.filter(mv => mv.path[0] === sq);
    if (!from.length) {
      if (drOwner((g.board || [])[sq]) === g.turn) this._toast(legal.some(mv => mv.taken.length) ? 'You have to take a piece' : 'That piece can’t move');
      return;
    }
    this._drSel = { mid: m.id, from: sq };
    x.classList.add('sel');
    from.forEach(mv => card.querySelector(`[data-sq="${mv.path[mv.path.length - 1]}"]`)?.classList.add('tgt'));
  },
});

// ── WhatsApp / Messenger / Apple extras: in the conversation ─────────────────
// Location & Live Location, checklists, events, contact cards, View Once,
// forwarded & starred marks, pinned messages, nicknames, Focus, activity
// status, birthday nudges, drafts, and the pages for photos/links/files,
// starred messages and searching a conversation.
const MORE_TYPES = new Set(['location', 'checklist', 'event', 'contact', 'timer', 'game', 'status', 'locreq']);
const MUTE_OPTS = [{ m: 60, name: 'For 1 Hour' }, { m: 480, name: 'For 8 Hours' }, { m: 10080, name: 'For 1 Week' }, { m: 0, name: 'Always' }];
const QUICK_EMOJI = ['👍', '❤️', '😂', '🔥', '🙏', '🎉', '👋', '😍'];
const MICON = {
  fwd: _s('<path d="M14 5l7 7-7 7"/><path d="M21 12H9a6 6 0 00-6 6v1"/>'),
  star: _s('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>'),
  starFill: _f('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>'),
  moon: _f('<path d="M20.5 14.6A8.5 8.5 0 019.4 3.5 8.5 8.5 0 1020.5 14.6z"/>'),
  info: _s('<circle cx="12" cy="12" r="9.3"/><path d="M12 11v5.5M12 7.6h.01"/>', 'stroke-width="2.2"'),
  list: _s('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  cal: _s('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  contact: _s('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M7 17.5c1-2 2.8-3 5-3s4 1 5 3"/>'),
  camera: _s('<path d="M3 8.5A2.5 2.5 0 015.5 6H7l2-2.5h6L17 6h1.5A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z"/><circle cx="12" cy="12.5" r="3.8"/>'),
  locate: _s('<path d="M12 21.5s-7-6.3-7-12a7 7 0 1114 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  search: _s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 'stroke-width="2.3"'),
  photos: _s('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15.5l-5-5L5.5 20"/>'),
  nick: _s('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z"/>'),
  once: '<span style="font-size:13px;font-weight:800;border:2px dashed currentColor;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center">1</span>',
  privately: _s('<path d="M10 8L4 13l6 5"/><path d="M4 13h10a6 6 0 016 6v1"/><circle cx="18" cy="5" r="2.5"/>'),
};
const CALL_LABEL = { facetime: '📹 FaceTime', facetime_audio: '📞 FaceTime Audio', phone: '📞 Phone Call' };
const PIN_SVG = '<svg class="lpin" viewBox="0 0 30 38"><path d="M15 37S3 23.5 3 14a12 12 0 1124 0c0 9.5-12 23-12 23z" fill="#FF3B30" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="4.5" fill="#fff"/></svg>';

Object.assign(CrowMessengerCard.prototype, {

  // ── Names: a chat's nickname for someone, if it has one ────────────────────
  _nameIn(tid, uid, short = false) {
    const nick = this._s.threads.get(tid)?.nicknames?.[uid];
    return nick || this._userName(uid, short);
  },

  // ── New kinds of message ───────────────────────────────────────────────────
  _moreSpecialHtml(m, t) {
    if (m.type === 'location') return this._locationHtml(m);
    if (m.type === 'locreq') return this._locreqHtml(m, t);
    if (m.type === 'checklist') return this._checklistHtml(m);
    if (m.type === 'event') return this._eventHtml(m);
    if (m.type === 'contact') return this._contactCardHtml(m);
    if (m.type === 'timer') return this._timerHtml(m);
    if (m.type === 'game') return this._gameHtml(m);
    if (m.type === 'status') return this._statusHtml(m);
    return '';
  },

  // A small street map made from map tiles (Esri World Street Map, no account needed)
  _miniMap(lat, lon, live) {
    const z = 15, W = 260, H = 150, n = 2 ** z;
    const xf = (lon + 180) / 360 * n;
    const r = lat * Math.PI / 180;
    const yf = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
    const cx = xf * 256, cy = yf * 256;
    let imgs = '';
    for (let tx = Math.floor((cx - W / 2) / 256); tx <= Math.floor((cx + W / 2) / 256); tx++) {
      for (let ty = Math.floor((cy - H / 2) / 256); ty <= Math.floor((cy + H / 2) / 256); ty++) {
        imgs += `<img src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${ty}/${((tx % n) + n) % n}" style="left:${Math.round(tx * 256 - (cx - W / 2))}px;top:${Math.round(ty * 256 - (cy - H / 2))}px" alt="" draggable="false" data-no-missing loading="lazy">`;
      }
    }
    return `<div class="locmap" data-x="locopen"><div class="tiles">${imgs}</div>${live ? '<span class="ldot"></span>' : PIN_SVG}<span class="attr">Esri</span></div>`;
  },

  _locationHtml(m) {
    const l = m.location || {};
    const mine = m.sender === this._s.me;
    const now = Date.now();
    const live = l.live_until && !l.stopped && l.live_until > now;
    const wasLive = l.live_until && !live;
    const sub = live ? `Live · until ${fmtTime(l.live_until, this._hass)}`
      : wasLive ? 'Live Location ended'
      : l.source === 'phone' ? (mine ? 'From your phone' : 'From their phone') : l.source === 'ha' || l.person ? 'From Home Assistant' : `${(+l.lat).toFixed(4)}, ${(+l.lon).toFixed(4)}`;
    const title = l.label || (live || wasLive ? 'Live Location' : 'Location');
    return `<div class="xcard loc" data-x="loc">${this._miniMap(+l.lat, +l.lon, live)}
      <div class="loc-info"><div class="lt">${esc(title)}</div><div class="ls${live ? ' live' : ''}">${esc(sub)}${live && l.ts ? ` · updated ${esc(fmtTime(l.ts, this._hass))}` : ''}</div></div>
      <div class="xbtns">${live && mine ? '<button class="red" data-x="locstop">Stop Sharing</button>' : ''}<button data-x="locmaps">Open in Maps</button>${!(live && mine) && Number.isFinite(+l.lat) && Number.isFinite(+l.lon) && this._zoneCan() ? '<button data-x="loczone">Add Zone</button>' : ''}</div></div>`;
  },

  _checklistHtml(m) {
    const cl = m.checklist || { items: [] };
    const done = cl.items.filter(i => i.done).length;
    const todo = cl.todo_entity ? (this._hass?.states?.[cl.todo_entity]?.attributes?.friendly_name || cl.todo_entity) : '';
    return `<div class="xcard checklist" data-x="checklist">
      <div class="xh">${MICON.list}Checklist${todo ? ` · ${esc(todo)}` : ''}</div>
      <div class="xt">${esc(m.text)}</div>
      ${cl.items.map(i => `<div class="cli${i.done ? ' done' : ''}" data-item="${esc(i.id)}"><span class="cck" data-x="clt">${i.done ? ICON.check : ''}</span><span class="ctx" data-x="clt">${esc(i.text)}</span><button class="cx" data-x="clrm" aria-label="Remove">${ICON.x}</button></div>`).join('')}
      <div class="xs" style="padding-top:8px">${done} of ${cl.items.length} done</div>
      <div class="xbtns"><button data-x="cladd">Add Item</button></div></div>`;
  },

  _eventHtml(m) {
    const ev = m.event || {};
    const d = new Date(ev.start);
    const loc = locale(this._hass);
    const when = ev.all_day ? d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(ev.start, this._hass)}${ev.end ? ` – ${fmtTime(ev.end, this._hass)}` : ''}`;
    const r = ev.rsvp || {};
    const mine = r[this._s.me];
    const count = (a) => Object.values(r).filter(x => x === a).length;
    const going = Object.keys(r).filter(u => r[u] === 'going').map(u => u === this._s.me ? 'You' : this._nameIn(m.thread_id, u, true));
    return `<div class="xcard event" data-x="event">
      <div class="ev-top"><div class="ev-date" aria-label="${esc(d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }))}"><div class="em">${esc(d.toLocaleDateString(loc, { weekday: 'short' }).replace(/\.$/, ''))}</div><div class="ed">${d.getDate()}</div></div>
        <div style="min-width:0"><div class="et">${esc(m.text)}</div><div class="es">${esc(when)}${ev.location ? `<br>${esc(ev.location)}` : ''}</div></div></div>
      <div class="ev-rsvp">${[['going', 'Going'], ['maybe', 'Maybe'], ['no', 'Can’t Go']].map(([v, n]) => `<button class="${mine === v ? 'on' : ''}" data-x="rsvp" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="ev-count">${count('going')} going${count('maybe') ? ` · ${count('maybe')} maybe` : ''}${count('no') ? ` · ${count('no')} can’t go` : ''}${going.length ? ` — ${esc(going.slice(0, 4).join(', '))}` : ''}</div>
      ${(() => { const zb = this._eventZoneBtns(ev); return `<div class="xbtns${zb ? ' stack' : ''}">${zb}<button data-x="evcal">Add to Calendar</button></div>`; })()}</div>`;
  },

  // an event at a Home Assistant place: open it in Maps, and Check In (expected by the start)
  _eventZoneBtns(ev) {
    const z = ev.zone && this._hass?.states?.[ev.zone];
    if (!z) return '';
    const soon = ev.start > Date.now() + 60000 && ev.start < Date.now() + 2 * 86400000;
    return `${soon && this._s.features?.checkin ? '<button data-x="evcheckin">Check In</button>' : ''}<button data-x="evmaps">Open in Maps</button>`;
  },

  _contactCardHtml(m) {
    const c = m.contact || {};
    const name = [c.first, c.last].filter(Boolean).join(' ') || c.company || 'Contact';
    const sub = c.phones?.[0]?.value || c.emails?.[0]?.value || (c.first || c.last ? c.company : '') || '';
    return `<div class="xcard contactc" data-x="contactc">
      <div class="ct-top">${this._avHtml({ pic: c.photo, name, size: 44 })}<div style="min-width:0;flex:1"><div class="cn">${esc(name)}</div>${sub ? `<div class="cs">${esc(sub)}</div>` : ''}</div><span class="gch" style="width:13px;height:13px;opacity:.4">${ICON.chevR}</span></div>
      <div class="xbtns"><button data-x="ctadd">${this._sameContact(c) ? 'View Contact' : 'Add to Contacts'}</button></div></div>`;
  },

  _sameContact(c) {
    const n = [c.first, c.last].filter(Boolean).join(' ').toLowerCase();
    for (const x of this._s.contacts.values()) {
      if (c.ha_user && x.ha_user === c.ha_user) return x;
      if (n && contactName(x, 'first').toLowerCase() === n) return x;
    }
    return null;
  },

  // View Once: the photo stays hidden behind a "1" until it's opened, once
  _viewOnceHtml(m) {
    const me = this._s.me, mine = m.sender === me;
    const opened = m.view_once?.opened || [];
    const video = (m.attachments?.[0]?.mime || '').startsWith('video/');
    const what = video ? 'Video' : 'Photo';
    if (mine) return `<div class="vo" data-x="vomine"><span class="vo1">1</span>${what}${opened.length ? ` · Opened` : ''}</div>`;
    if (opened.includes(me) || m.attachments?.[0]?.removed) return `<div class="vo opened"><span class="vo1">1</span>Opened</div>`;
    return `<div class="vo" data-x="voopen"><span class="vo1">1</span>${what}</div>`;
  },

  _forwardedHtml(m) { return m.forwarded ? `<div class="fwd">${MICON.fwd}Forwarded</div>` : ''; },

  _starHtml(m, t) { return t?.starred?.includes(m.id) ? `<div class="starmk">${MICON.starFill}</div>` : ''; },

  // ── Things above the message box ───────────────────────────────────────────
  _focusUsers(tid) {
    const t = this._s.threads.get(tid);
    if (!t) return [];
    const map = this._s.focusEntities || {};
    return t.participants.filter(p => p !== this._s.me && p !== HA_ID && (map[p] || []).some(eid => {
      const st = this._hass?.states?.[eid];
      if (!st) return false;
      return eid.startsWith('binary_sensor.') ? st.state === 'on' : !['off', 'unknown', 'unavailable', ''].includes(st.state);
    }));
  },

  _birthdayFor(tid) {
    const other = this._other(tid);
    const c = other && this._contactForUser(other);
    if (!c?.birthday) return null;
    const m = /(\d{1,2})-(\d{1,2})$/.exec(String(c.birthday).replace(/^--/, '0000-'));
    if (!m) return null;
    const now = new Date();
    if (+m[1] !== now.getMonth() + 1 || +m[2] !== now.getDate()) return null;
    let key = '';
    try { key = `crowBday:${tid}:${now.toDateString()}`; if (localStorage.getItem(key)) return null; } catch (e) { /* */ }
    return { name: c.first || this._userName(other, true), key };
  },

  _presenceText(uid) {
    const p = this._s.presence?.[uid];
    if (!p) return '';
    if (p.online) return 'Active now';
    if (!p.last) return '';
    const mins = Math.round((Date.now() - p.last) / 60000);
    if (mins < 1) return 'Active just now';
    if (mins < 60) return `Active ${mins}m ago`;
    if (mins < 24 * 60) return `Active ${Math.round(mins / 60)}h ago`;
    return `Active ${fmtListDate(p.last, this._hass)}`;
  },

  // ── Calls: FaceTime, FaceTime Audio and phone calls started from the chat ───
  // The real Phone / FaceTime app does the call; the chat records that it was started.
  _callHandles(c) {
    const phones = (c.phones || []).filter(p => telValue(p.value));
    const pref = phones.find(p => /iphone/i.test(p.label || '')) || phones.find(p => /mobile|cell/i.test(p.label || '')) || phones[0];
    const emails = c.emails || [];
    const mail = emails.find(e => /icloud/i.test(e.label || '') || /@(icloud|me|mac)\.com$/i.test(e.value || '')) || emails[0];
    return { phones, ft: pref ? telValue(pref.value) : (mail?.value || '') };
  },

  async _callMenu(anchor, tid) {
    const c = this._contactForUser(this._other(tid));
    if (!c) return;
    const hd = this._callHandles(c);
    const items = [];
    if (hd.ft && isApple()) items.push({ text: 'FaceTime', value: 'facetime', icon: ICON.video }, { text: 'FaceTime Audio', value: 'facetime_audio', icon: ICON.phone });
    if (hd.phones.length) {
      if (items.length) items.push({ sep: true });
      hd.phones.forEach((p, i) => items.push({ text: `${p.label ? (p.label === p.label.toLowerCase() ? p.label.replace(/^./, x => x.toUpperCase()) : p.label) + ' ' : ''}${p.value}`, value: `tel:${i}`, icon: ICON.phone }));
    }
    if (!items.length) return;
    const v = items.filter(x => x.value).length === 1 ? items.find(x => x.value).value : await this._menu(anchor, [{ header: `Call ${contactName(c, this._config.contact_display)}` }, ...items], { align: 'right' });
    if (!v) return;
    if (v.startsWith('tel:')) this._startCall(tid, 'phone', hd.phones[+v.slice(4)].value);
    else this._startCall(tid, v);
  },

  _startCall(tid, kind, number = null) {
    const c = this._contactForUser(this._other(tid));
    const hd = c ? this._callHandles(c) : { phones: [], ft: '' };
    let url;
    if (kind === 'phone') {
      const n = telValue(number || hd.phones[0]?.value || '');
      if (!n) { this._toast('There’s no phone number on their contact card'); return; }
      url = `tel:${n}`;
    } else {
      if (!hd.ft) { this._toast('Add their iPhone number or Apple ID email to their contact card to FaceTime'); return; }
      if (!isApple()) { this._toast('FaceTime only works on Apple devices'); return; }
      url = `${kind === 'facetime_audio' ? 'facetime-audio' : 'facetime'}:${hd.ft}`;
    }
    openExternal(url);
    this._ws('send', { thread_id: tid, text: '', extra: { type: 'call', call: { kind } } }).catch(() => {});
  },

  _callHtml(m) {
    const me = this._s.me, mine = m.sender === me;
    const kind = m.call?.kind || 'phone';
    const title = { facetime: 'FaceTime', facetime_audio: 'FaceTime Audio', phone: 'Phone Call' }[kind];
    const other = mine ? this._other(m.thread_id) : m.sender;
    const who = other ? this._nameIn(m.thread_id, other, true) : '';
    const line = mine ? `You called ${who}` : `${who} called you`;
    const canBack = kind === 'phone' || isApple();
    return `<div class="mrow callwrap" data-mid="${esc(m.id)}"><div class="callrow g">
      <span class="cic ${kind === 'facetime' ? 'ft' : ''}">${kind === 'facetime' ? ICON.video : ICON.phone}</span>
      <div class="cbody"><b>${esc(title)}</b><span>${esc(line)} · ${esc(fmtTime(m.ts, this._hass))}</span></div>
      ${canBack ? `<button data-x="callback">${mine ? 'Call Again' : 'Call Back'}</button>` : ''}</div>${this._tapbacksHtml(m)}</div>`;
  },

  // ── Drafts (kept on this device, shown in the list) ────────────────────────
  _draftKey() { return `crowMessengerDrafts:${this._s.me}`; },
  _loadDrafts() {
    try {
      const d = JSON.parse(localStorage.getItem(this._draftKey()) || '{}');
      // older drafts were just the text; newer ones keep the formatting too
      Object.entries(d).forEach(([tid, v]) => {
        if (this._s.drafts.has(tid)) return;
        const text = typeof v === 'string' ? v : v?.text || '';
        if (text) this._s.drafts.set(tid, { text, staged: [], spans: typeof v === 'string' ? [] : v.spans || [] });
      });
    } catch (e) { /* private window */ }
  },
  _storeDrafts() {
    try {
      const out = {};
      this._s.drafts.forEach((v, k) => { if (v?.text?.trim()) out[k] = v.spans?.length ? { text: v.text, spans: v.spans } : v.text; });
      localStorage.setItem(this._draftKey(), JSON.stringify(out));
    } catch (e) { /* */ }
  },

  // ── Clicks on the new extras ───────────────────────────────────────────────
  async _moreClick(e, tid, page) {
    const x = e.target.closest('[data-x]');
    if (!x) return false;
    const kind = x.dataset.x;
    const known = ['callback', 'locopen', 'locmaps', 'locstop', 'loczone', 'strow', 'stlock', 'stlights', 'tmadd', 'tmcancel', 'gmove', 'gagain', 'gdr', 'gshuffle', 'remchip', 'lqshare', 'lqno', 'clt', 'clrm', 'cladd', 'rsvp', 'evcal', 'evmaps', 'evcheckin', 'ctadd', 'voopen', 'vomine', 'pinjump', 'anyway', 'bday', 'bdayx'];
    if (!known.includes(kind)) return false;
    const s = this._s;
    if (kind === 'pinjump') {
      const t = s.threads.get(tid);
      const pins = t?.pinned_messages || [];
      if (!pins.length) return true;
      page.pinIdx = ((page.pinIdx ?? -1) + 1) % pins.length;
      this._jumpTo(tid, pins[page.pinIdx].ts, pins[page.pinIdx].id);
      page.renderPins();
      return true;
    }
    if (kind === 'anyway') {
      const r = await this._alert({ title: 'Notify Anyway?', message: 'They’ll get a notification even though their phone is silenced.', buttons: [{ text: 'Notify Anyway', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
      if (r.value) { try { await this._ws('notify_anyway', { thread_id: tid }); this._toast('Notified'); } catch (err) { this._toast(err.message); } }
      return true;
    }
    if (kind === 'bday' || kind === 'bdayx') {
      const b = this._birthdayFor(tid);
      try { if (b?.key) localStorage.setItem(b.key, '1'); } catch (err) { /* */ }
      if (kind === 'bday') this._sendMessage(tid, 'Happy Birthday! 🎂🎉', [], { effect: 'balloons' });
      page.renderBars();
      return true;
    }
    const row = x.closest('.mrow');
    const m = row ? s.msgs.get(tid)?.list.find(y => y.id === row.dataset.mid) : null;
    if (!m) return true;
    if (kind === 'callback') { this._startCall(tid, m.call?.kind || 'phone'); return true; }
    if (kind === 'remchip') {
      const t = s.threads.get(tid), rem = (t?.reminders || []).find(r => r.message_id === m.id);
      const v = await this._menu(x, [...(rem ? [{ header: `Remind me ${this._remindWhen(rem.at)}` }] : []), ...this._remindItems().filter(i => !i.sep), { sep: true }, { text: 'Cancel Reminder', value: 'remind:off', icon: ICON.x, red: true }], { align: m.sender === s.me ? 'right' : 'left' });
      if (v?.startsWith?.('remind:')) this._remindChoice(tid, m, v.slice(7));
      return true;
    }
    if (kind === 'lqshare' || kind === 'lqno') {
      try { await this._ws('locreq/answer', { thread_id: tid, message_id: m.id, answer: kind === 'lqshare' ? 'share' : 'decline' }); }
      catch (err) { this._toast(err.message || 'Couldn’t share your location'); }
      return true;
    }
    if (['strow', 'stlock', 'stlights', 'tmadd', 'tmcancel', 'gmove', 'gagain', 'gdr', 'gshuffle'].includes(kind)) {
      try { await this._playClick(kind, x, tid, m); } catch (err) { this._toast(err.message || 'That didn’t work'); }
      return true;
    }
    try {
      if (kind === 'locopen' || kind === 'locmaps') {
        const l = m.location;
        if (kind === 'locopen' && l.person && l.live_until > Date.now() && !l.stopped) { this._nav('people', { focus: l.person }); return true; }
        const label = encodeURIComponent(l.label || 'Location');
        openExternal(isApple() ? `https://maps.apple.com/?ll=${l.lat},${l.lon}&q=${label}` : `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}`);
        return true;
      }
      if (kind === 'locstop') { await this._ws('location/stop', { thread_id: tid, message_id: m.id }); return true; }
      if (kind === 'loczone') {
        const l = m.location || {};
        const label = l.label && l.label !== 'Location' && !/^-?\d+(\.\d+)?,/.test(l.label) ? l.label.split(/\n|,/)[0].trim() : '';
        const who = m.sender === s.me ? 'You' : this._userName(m.sender, true);
        await this._newZone({ lat: +l.lat, lon: +l.lon, name: label, intro: `${who} shared this location${l.ts ? ' at ' + fmtTime(l.ts, this._hass) : ''}.` });
        return true;
      }
      if (kind === 'clt' || kind === 'clrm') {
        const item = x.closest('[data-item]')?.dataset.item;
        if (kind === 'clt') {
          const it = m.checklist.items.find(i => i.id === item);
          if (it) { it.done = !it.done; this._refresh('messages', tid); }
        }
        await this._ws('checklist', { thread_id: tid, message_id: m.id, op: kind === 'clt' ? 'toggle' : 'remove', item_id: item });
        return true;
      }
      if (kind === 'cladd') {
        const r = await this._alert({ title: 'Add Item', input: { placeholder: 'Item' }, buttons: [{ text: 'Add', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
        if (r.value && r.input?.trim()) await this._ws('checklist', { thread_id: tid, message_id: m.id, op: 'add', text: r.input.trim() });
        return true;
      }
      if (kind === 'rsvp') {
        const v = x.dataset.v, cur = m.event.rsvp?.[s.me];
        m.event.rsvp = { ...(m.event.rsvp || {}), [s.me]: v };
        if (cur === v) delete m.event.rsvp[s.me];
        this._refresh('messages', tid);
        await this._ws('rsvp', { thread_id: tid, message_id: m.id, answer: cur === v ? null : v });
        return true;
      }
      if (kind === 'evcal') { this._eventToCalendar(x, m); return true; }
      if (kind === 'evmaps') {
        const z = this._hass.states[m.event.zone];
        if (!z) return true;
        const label = encodeURIComponent(z.attributes.friendly_name || m.event.location || 'Place');
        const { latitude: lat, longitude: lon } = z.attributes;
        openExternal(isApple() ? `https://maps.apple.com/?ll=${lat},${lon}&q=${label}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
        return true;
      }
      if (kind === 'evcheckin') {
        // a Check In to the event's place, expected by its start, waiting in the message box
        const ev = m.event;
        if (ev.start < Date.now() + 60000) { this._toast('That event has already started'); return true; }
        const page = this._stack.find(p => p.type === 'thread' && p.data?.tid === tid);
        if (!page?.composer) return true;
        const zn = this._hass.states[ev.zone]?.attributes.friendly_name || ev.location || 'there';
        this._stageApp(page.composer, tid, 'checkin', { extra: { type: 'checkin', checkin: { zone: ev.zone, due_ts: ev.start } }, label: `Check In: ${zn}`, sub: `Expected by ${fmtTime(ev.start, this._hass)}` });
        return true;
      }
      if (kind === 'ctadd') {
        const c = m.contact, same = this._sameContact(c);
        if (same) this._nav('contact', { cid: same.id });
        else this._nav('contactEdit', { prefill: { first: c.first, last: c.last, company: c.company, phones: c.phones, emails: c.emails, photo: c.photo, ha_user: c.ha_user } });
        return true;
      }
      if (kind === 'voopen' || kind === 'vomine') {
        const a = m.attachments?.[0];
        if (!a) return true;
        await this._openViewer(a.id, tid, { once: kind === 'voopen' });
        if (kind === 'voopen') { await this._ws('view_once/opened', { thread_id: tid, message_id: m.id }); }
        return true;
      }
    } catch (err) { this._toast(err.message || 'That didn’t work'); return true; }
    return true;
  },

  async _eventToCalendar(anchor, m) {
    const cals = Object.values(this._hass.states).filter(st => st.entity_id.startsWith('calendar.'));
    if (!cals.length) { this._toast('There’s no calendar in Home Assistant to add it to'); return; }
    const eid = cals.length === 1 ? cals[0].entity_id : await this._menu(anchor, [{ header: 'Add to Calendar' }, ...cals.map(c => ({ text: c.attributes.friendly_name || c.entity_id, value: c.entity_id, icon: MICON.cal }))], { align: 'left' });
    if (!eid) return;
    const ev = m.event;
    const pad = n => String(n).padStart(2, '0');
    const iso = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; };
    const day = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const data = ev.all_day ? { start_date: day(ev.start), end_date: day(ev.start + 86400000) }
      : { start_date_time: iso(ev.start), end_date_time: iso(ev.end || ev.start + 3600000) };
    try {
      // an event at a Home Assistant place goes in with the place's town, so the calendar can find it
      let where = ev.location || '';
      if (ev.zone) {
        const z = (await this._places()).find(p => p.entity_id === ev.zone);
        if (z) where = z.town && !z.name.toLowerCase().includes(z.town.toLowerCase()) ? `${z.name}, ${z.town}` : z.name;
      }
      await this._hass.callService('calendar', 'create_event', { entity_id: eid, summary: m.text, ...(where ? { location: where } : {}), ...data });
      this._toast('Added to calendar');
    } catch (err) { this._toast(err.message || 'Couldn’t add it'); }
  },

  // Show a message, loading from that day if it isn't on screen yet
  async _jumpTo(tid, ts, mid) {
    const s = this._s;
    // go back to this conversation if it's already open underneath, otherwise open it
    if (this._stack.some(p => p.type === 'thread' && p.data.tid === tid)) {
      while (!(this._stack[this._stack.length - 1].type === 'thread' && this._stack[this._stack.length - 1].data.tid === tid)) this._back(false);
    } else this._openThread(tid, {});
    const box = s.msgs.get(tid);
    const have = box?.loaded && box.list.some(m => !m.pending && m.ts <= ts) && (!mid || box.list.some(m => m.id === mid));
    if (!have) {
      const d = new Date(ts); d.setHours(0, 0, 0, 0);
      try {
        const r = await this._ws('messages_since', { thread_id: tid, since: d.getTime() });
        const nb = s.msgs.get(tid) || { list: [] };
        nb.list = [...r.messages, ...nb.list.filter(m => m.pending)];
        nb.more = r.more; nb.loaded = true;
        s.msgs.set(tid, nb);
      } catch (err) { this._toast(err.message); return; }
    }
    const target = mid || s.msgs.get(tid).list.find(m => m.ts >= ts)?.id;
    this._flashMsg = target;
    this._refresh('messages', tid);
  },
});

// ── Sheets and pages for the WhatsApp / Messenger / Apple extras ─────────────
Object.assign(CrowMessengerCard.prototype, {

  // ── Forward ────────────────────────────────────────────────────────────────
  _openForward(tid, m) {
    const s = this._s;
    const chosen = new Set();
    const threads = [...s.threads.values()].filter(t => t.visible !== false).sort((a, b) => b.updated_at - a.updated_at);
    const sh = this._xsheet({
      title: 'Forward', action: 'Send',
      body: `<input class="xfield q" placeholder="Search" type="search" autocomplete="off"><div class="group fwlist"></div>`,
      onAction: async () => {
        if (!chosen.size) { this._toast('Choose who to send it to'); return false; }
        await this._ws('forward', { thread_id: tid, message_id: m.id, to: [...chosen] });
        this._toast(chosen.size === 1 ? 'Forwarded' : `Forwarded to ${chosen.size} conversations`);
      },
    });
    const list = sh.el.querySelector('.fwlist'), q = sh.el.querySelector('.q');
    const render = () => {
      const w = q.value.toLowerCase();
      list.innerHTML = threads.filter(t => !w || this._threadTitle(t).toLowerCase().includes(w)).map(t =>
        `<div class="pick-row${chosen.has(t.id) ? ' on' : ''}" data-t="${esc(t.id)}">${this._threadAv(t, 36)}<div class="pn">${esc(this._threadTitle(t))}</div><span class="pck2">${chosen.has(t.id) ? ICON.check : ''}</span></div>`).join('')
        || `<div class="pick-row"><div class="pn" style="color:var(--cm-text2)">No conversations</div></div>`;
    };
    q.addEventListener('input', render);
    list.addEventListener('click', (e) => { const r = e.target.closest('[data-t]'); if (!r) return; chosen.has(r.dataset.t) ? chosen.delete(r.dataset.t) : chosen.add(r.dataset.t); render(); });
    render();
  },

  // ── Message Info ───────────────────────────────────────────────────────────
  async _openInfo(tid, m) {
    let r;
    try { r = await this._ws('message_info', { thread_id: tid, message_id: m.id }); } catch (err) { this._toast(err.message); return; }
    const row = (uid, at) => `<div class="inforow">${this._userAv(uid, 32)}<div class="in">${esc(this._nameIn(tid, uid))}</div><div class="it">${at ? esc(sameDay(new Date(at), new Date()) ? fmtTime(at, this._hass) : `${fmtListDate(at, this._hass)} ${fmtTime(at, this._hass)}`) : ''}</div></div>`;
    this._xsheet({
      title: 'Message Info',
      body: `<div class="xlabel" style="margin-top:0">Read by</div><div class="group">${r.read.length ? r.read.map(x => row(x.user_id, x.at)).join('') : '<div class="inforow"><div class="in" style="color:var(--cm-text2)">No one yet</div></div>'}</div>
        ${r.delivered.length ? `<div class="xlabel">Delivered to</div><div class="group">${r.delivered.map(u => row(u)).join('')}</div>` : ''}
        <div class="xnote">Sent ${sameDay(new Date(m.ts), new Date()) ? 'today' : esc(fmtListDate(m.ts, this._hass))} at ${esc(fmtTime(m.ts, this._hass))}.</div>`,
    });
  },

  // ── Reply Privately (from a group, in your one-to-one chat with the sender) ─
  async _replyPrivately(tid, m) {
    const s = this._s;
    if (!this._contactForUser(m.sender)) {
      const r = await this._alert({ title: 'Add to Contacts?', message: `Add ${this._userName(m.sender)} to your contacts to message them.`, buttons: [{ text: 'Add to Contacts', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
      if (r.value) this._addContactFor(m.sender);
      return;
    }
    try {
      const r = await this._ws('create_thread', { participants: [m.sender] });
      this._upsertThread({ ...r.thread, visible: true });
      this._openThread(r.thread.id, {});
      const page = this._stack.find(p => p.type === 'thread' && p.data.tid === r.thread.id);
      page?.composer?.setReply({ ...m, _ext: tid, _from: s.threads.get(tid)?.name || 'the group' });
    } catch (err) { this._toast(err.message); }
  },

  // ── Mute for a while (conversation details, and the list's swipe) ──────────
  async _chooseMute(anchor, tid) {
    const t = this._s.threads.get(tid);
    const items = [{ header: 'Hide Alerts' }, ...MUTE_OPTS.map(o => ({ text: o.name, value: String(o.m) }))];
    if (t?.muted) items.push({ sep: true }, { text: 'Show Alerts', value: 'off', icon: ICON.bell });
    const v = await this._menu(anchor, items, { align: 'right' });
    if (v == null) return;
    try { await this._ws('mute', { thread_id: tid, ...(v === 'off' ? {} : { minutes: +v }) }); } catch (err) { this._toast(err.message); }
  },

  _muteLabel(t) {
    if (!t?.muted) return 'Off';
    if (!t.muted_until) return 'Always';
    return `Until ${sameDay(new Date(t.muted_until), new Date()) ? fmtTime(t.muted_until, this._hass) : `${fmtListDate(t.muted_until, this._hass)} ${fmtTime(t.muted_until, this._hass)}`}`;
  },

  async _chooseQuick(anchor, tid) {
    const cur = this._s.threads.get(tid)?.quick || '👍';
    const v = await this._menu(anchor, [{ header: 'Quick Reaction' }, ...QUICK_EMOJI.map(e => ({ text: e, value: e, checked: e === cur })), { text: 'Other…', value: '+', checked: !QUICK_EMOJI.includes(cur) }], { align: 'right' });
    if (!v) return;
    const emoji = v === '+' ? await this._pickEmoji('Quick Reaction') : v;
    if (emoji) this._ws('quick', { thread_id: tid, emoji }).catch(err => this._toast(err.message));
  },

  async _chooseNickname(anchor, tid) {
    const t = this._s.threads.get(tid);
    const people = t.participants.filter(p => p !== HA_ID);
    const uid = people.length === 1 ? people[0] : await this._menu(anchor, [{ header: 'Nicknames' }, ...people.map(p => ({ text: `${this._nameIn(tid, p)}${p === this._s.me ? ' (You)' : ''}`, value: p, icon: ICON.person }))], { align: 'left' });
    if (!uid) return;
    const r = await this._alert({
      title: `Nickname for ${uid === this._s.me ? 'You' : this._userName(uid)}`, message: 'Everyone in this conversation sees it.',
      input: { value: t.nicknames?.[uid] || '', placeholder: this._userName(uid) },
      buttons: [{ text: 'Save', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }],
    });
    if (r.value) this._ws('nickname', { thread_id: tid, user_id: uid, name: (r.input || '').trim() }).catch(err => this._toast(err.message));
  },

  // ── Checklist ──────────────────────────────────────────────────────────────
  _openChecklist(tid, composer) {
    const todos = Object.values(this._hass.states).filter(st => st.entity_id.startsWith('todo.'))
      .map(t => ({ id: t.entity_id, name: t.attributes.friendly_name || t.entity_id }));
    let todo = '';
    const sh = this._xsheet({
      title: 'New Checklist', action: 'Add',
      body: `${this._fieldBox([{ cls: 'q', placeholder: 'Title', cap: true }])}
        <div class="items"></div>
        ${todos.length ? `<div class="sgroup"><div class="gr" data-todo role="button"><div class="gl">To-do List</div><span class="gv tv">None</span><span class="gch">${ICON.chevR}</span></div></div>
        <div class="sfoot">Keep it in step with a Home Assistant to-do list: items are added there too, and ticking one off in either place ticks it off in both.</div>` : ''}
        <div class="sfoot">Everyone in the conversation can tick items off and add more.</div>`,
      onAction: async () => {
        const title = sh.el.querySelector('.q').value.trim();
        const items = list.values();
        if (!title) { this._toast('Give the checklist a title'); return false; }
        this._stageApp(composer, tid, 'checklist', { text: title, extra: { type: 'checklist', checklist: { items, ...(todo ? { todo_entity: todo } : {}) } }, label: `Checklist: ${title}`, sub: `${items.length} ${items.length === 1 ? 'item' : 'items'}` });
      },
    });
    const list = this._listRows(sh.el.querySelector('.items'), { placeholder: 'Item', addLabel: 'Add Item', max: 100 });
    sh.el.querySelector('.q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); list.focus(); } });
    // the to-do list is chosen from a menu, like an iPhone settings row
    sh.el.querySelector('[data-todo]')?.addEventListener('click', async (e) => {
      const row = e.currentTarget;
      const v = await this._menu(row, [{ text: 'None', value: '-', checked: !todo }, { sep: true }, ...todos.map(t => ({ text: t.name, value: t.id, checked: todo === t.id }))], { align: 'right' });
      if (v == null) return;
      todo = v === '-' ? '' : v;
      row.querySelector('.tv').textContent = todo ? todos.find(t => t.id === todo).name : 'None';
    });
    this._needs(sh, () => sh.el.querySelector('.q').value.trim());
    this._focusFirst(sh.el.querySelector('.q'));
  },

  // ── Event with RSVP (laid out like the iPhone's Calendar) ───────────────────
  _openEvent(tid, composer) {
    const pad = n => String(n).padStart(2, '0');
    const d = new Date(Date.now() + 86400000); d.setHours(18, 0, 0, 0);
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const sh = this._xsheet({
      title: 'New Event', action: 'Add',
      body: `${this._fieldBox([{ cls: 'q', placeholder: 'Title', cap: true }, { cls: 'loc', placeholder: 'Location' }])}
        <div class="sgroup sugg" hidden></div>
        <div class="sgroup">
          <label class="gr"><div class="gl">All-day</div><span class="tsw"><input type="checkbox" class="allday"><span></span></span></label>
          <div class="gr"><div class="gl">Date</div><input type="date" class="gpill day" value="${day}"></div>
          <div class="gr times"><div class="gl">Starts</div><input type="time" class="gpill t1" value="18:00"></div>
          <div class="gr times"><div class="gl">Ends</div><input type="time" class="gpill t2" value="20:00"></div>
        </div>
        <div class="sfoot">Everyone can answer Going, Maybe or Can’t Go, and add it to a Home Assistant calendar.</div>`,
      onAction: async () => {
        const title = sh.el.querySelector('.q').value.trim();
        const dv = sh.el.querySelector('.day').value;
        if (!title) { this._toast('Give the event a title'); sh.el.querySelector('.q').focus(); return false; }
        const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(dv || '');
        if (!dm) { this._toast('Choose a date'); return false; }
        const all = sh.el.querySelector('.allday').checked;
        // built from its parts, not parsed as text, which some Safari versions get wrong
        const at = (t) => { const [hh, mm] = (t || '00:00').split(':').map(n => parseInt(n, 10) || 0); return new Date(+dm[1], +dm[2] - 1, +dm[3], hh, mm).getTime(); };
        const start = all ? at('00:00') : at(sh.el.querySelector('.t1').value);
        let end = all ? null : at(sh.el.querySelector('.t2').value);
        if (end && end <= start) end += 86400000;
        const where = sh.el.querySelector('.loc').value.trim();
        const zone = linked(where);
        this._stageApp(composer, tid, 'event', { text: title, extra: { type: 'event', event: { start, end, all_day: all, location: where, ...(zone ? { zone } : {}) } }, label: `Event: ${title}`, sub: all ? fmtListDate(start, this._hass) : `${fmtListDate(start, this._hass)} at ${fmtTime(start, this._hass)}` });
      },
    });
    sh.el.querySelector('.allday').addEventListener('change', (e) => { sh.el.querySelectorAll('.times').forEach(r => { r.hidden = e.target.checked; }); });
    // Ends moves with Starts, keeping the same length, like Calendar
    const t1 = sh.el.querySelector('.t1'), t2 = sh.el.querySelector('.t2');
    let len = 120;
    const mins = (v) => { const [h, m] = (v || '0:0').split(':').map(Number); return h * 60 + m; };
    t1.addEventListener('change', () => { const e = (mins(t1.value) + len) % 1440; t2.value = `${pad(Math.floor(e / 60))}:${pad(e % 60)}`; });
    t2.addEventListener('change', () => { len = (mins(t2.value) - mins(t1.value) + 1440) % 1440 || 60; });
    sh.el.querySelector('.q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sh.el.querySelector('.loc').focus(); } });
    sh.el.querySelector('.loc').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    // Location suggests your Home Assistant places as you type; choosing one links the event to it
    const locIn = sh.el.querySelector('.loc'), sugg = sh.el.querySelector('.sugg');
    let places = [], picked = null;
    this._places().then(list => { places = list; });
    // the zone the location is linked to: the one chosen, or one typed out in full
    const linked = (text) => {
      if (picked && picked.name === text) return picked.entity_id;
      return places.find(z => z.name.toLowerCase() === text.toLowerCase())?.entity_id || null;
    };
    const showSugg = () => {
      const v = locIn.value.trim().toLowerCase();
      const words = v.split(/\s+/).filter(Boolean);
      const hits = !words.length ? [] : places.filter(z => words.every(w => `${z.name} ${z.town}`.toLowerCase().includes(w)))
        .sort((a, b) => (b.name.toLowerCase().startsWith(v)) - (a.name.toLowerCase().startsWith(v)) || (a.km ?? 1e9) - (b.km ?? 1e9)).slice(0, 5);
      const exact = hits.length === 1 && hits[0].name.toLowerCase() === v;
      sugg.hidden = !hits.length || exact || this.shadowRoot?.activeElement !== locIn;
      sugg.innerHTML = hits.map(z => `<div class="srow" data-z="${esc(z.entity_id)}" role="button"><span class="sav"><ha-icon icon="${esc(z.icon)}"></ha-icon></span>
        <div class="sb"><div class="sn">${esc(z.name)}</div><div class="ss">${esc([z.town, z.away].filter(Boolean).join(' · ') || 'Home Assistant zone')}</div></div></div>`).join('');
      locIn.closest('.frow').classList.toggle('zoned', !!linked(locIn.value.trim()));
    };
    locIn.addEventListener('input', () => { picked = null; showSugg(); });
    locIn.addEventListener('focus', showSugg);
    locIn.addEventListener('blur', () => setTimeout(() => { sugg.hidden = true; }, 150));
    // pointerdown, so the choice lands before the field loses focus
    sugg.addEventListener('pointerdown', (e) => {
      const r = e.target.closest('[data-z]'); if (!r) return;
      e.preventDefault();
      picked = places.find(z => z.entity_id === r.dataset.z);
      if (!picked) return;
      locIn.value = picked.name;
      sugg.hidden = true;
      locIn.closest('.frow').classList.add('zoned');
      locIn.blur();
    });
    this._needs(sh, () => sh.el.querySelector('.q').value.trim());
    this._focusFirst(sh.el.querySelector('.q'));
  },

  // ── Jump to a date ─────────────────────────────────────────────────────────
  _openJumpDate(tid) {
    const pad = n => String(n).padStart(2, '0');
    const d = new Date();
    const sh = this._xsheet({
      title: 'Jump to Date', action: 'Go',
      body: `<input type="date" class="xfield day" value="${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}">`,
      onAction: async () => {
        const v = sh.el.querySelector('.day').value;
        if (!v) return false;
        this._back(false);
        await this._jumpTo(tid, new Date(`${v}T00:00`).getTime());
      },
    });
  },

  // ── Page: Photos, Links & Files (and Starred) for one conversation ─────────
  _pg_media({ tid }) {
    const el = this._el(`<div>
      <div class="scroll"><div class="ipage"><div class="segc3">${[['photos', 'Photos'], ['links', 'Links'], ['files', 'Files'], ['starred', 'Starred']].map(([v, n]) => `<button data-tab="${v}">${n}</button>`).join('')}</div><div class="mbody"><div class="empty">Loading…</div></div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="title">${esc(this._threadTitle(this._s.threads.get(tid)))}</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    let tab = 'photos', data = null, starred = null;
    const body = el.querySelector('.mbody');
    const render = () => {
      el.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      if (!data) return;
      const when = (ts) => fmtListDate(ts, this._hass);
      if (tab === 'photos') {
        body.innerHTML = data.photos.length ? `<div class="mgrid">${data.photos.map(p => `<div class="mt" data-view="${esc(p.id)}" data-mid="${esc(p.message_id)}" data-ts="${p.ts}"><img data-att="${esc(p.id)}" data-thumb="${p.has_thumb ? 1 : 0}" alt="">${(p.mime || '').startsWith('video/') ? `<span class="vd">▶ ${fmtDur(p.duration)}</span>` : ''}</div>`).join('')}</div>` : '<div class="empty"><b>No Photos</b>Photos and videos in this conversation show here.</div>';
        this._hydrate(body);
      } else if (tab === 'links') {
        body.innerHTML = data.links.length ? `<div class="group">${data.links.map(l => `<div class="lrow" data-url="${esc(l.url)}"><div class="lth">${l.image ? `<img src="${esc(l.image)}" alt="" data-no-missing>` : ICON.link}</div><div class="lb"><div class="l1">${esc(l.title || l.url)}</div><div class="l2">${esc(l.site || l.url)}</div><div class="l3">${esc(this._nameIn(tid, l.sender))} · ${esc(when(l.ts))}</div></div></div>`).join('')}</div>` : '<div class="empty"><b>No Links</b>Links shared in this conversation show here.</div>';
      } else if (tab === 'files') {
        body.innerHTML = data.files.length ? `<div class="group">${data.files.map(f => `<div class="lrow" data-file="${esc(f.id)}" data-name="${esc(f.name)}"><div class="lth">${(f.mime || '').startsWith('audio/') ? ICON.mic : ICON.doc}</div><div class="lb"><div class="l1">${esc(f.name || 'Attachment')}</div><div class="l2">${esc(fmtBytes(f.size))}</div><div class="l3">${esc(this._nameIn(tid, f.sender))} · ${esc(when(f.ts))}</div></div></div>`).join('')}</div>` : '<div class="empty"><b>No Files</b>Documents and voice messages in this conversation show here.</div>';
      } else {
        const list = (starred || []).filter(m => m.thread_id === tid);
        body.innerHTML = list.length ? `<div class="group">${list.map(m => this._starRow(m)).join('')}</div>` : '<div class="empty"><b>No Starred Messages</b>Press and hold a message and tap Star to keep it here.</div>';
      }
    };
    const load = async () => {
      try { data = await this._ws('media', { thread_id: tid }); } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
      render();
    };
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      const t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; if (tab === 'starred' && !starred) { try { starred = (await this._ws('starred')).messages; } catch (err) { starred = []; } } render(); return; }
      const v = e.target.closest('[data-view]');
      if (v) { await this._jumpTo(tid, +v.dataset.ts, v.dataset.mid); this._openViewer(v.dataset.view, tid); return; }
      const u = e.target.closest('[data-url]'); if (u) { openExternal(u.dataset.url); return; }
      const f = e.target.closest('[data-file]'); if (f) { this._saveAttachment(f.dataset.file, f.dataset.name); return; }
      const sm = e.target.closest('[data-smid]'); if (sm) { this._jumpTo(sm.dataset.stid, +sm.dataset.ts, sm.dataset.smid); }
    });
    page.onShow = () => { if (!data) load(); };
    return page;
  },

  _starRow(m) {
    const t = this._s.threads.get(m.thread_id);
    const text = this._previewText({ last: m, is_group: false }) || '';
    return `<div class="lrow" data-smid="${esc(m.id)}" data-stid="${esc(m.thread_id)}" data-ts="${m.ts}"><div class="lth" style="border-radius:50%;background:none">${this._userAv(m.sender, 44)}</div><div class="lb"><div class="l1">${esc(m.sender === this._s.me ? 'You' : this._nameIn(m.thread_id, m.sender))}${t?.is_group ? ` <span style="font-weight:400;color:var(--cm-text2)">· ${esc(this._threadTitle(t))}</span>` : ''}</div><div class="l2" style="white-space:normal;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical">${esc(text)}</div><div class="l3">${esc(fmtListDate(m.ts, this._hass))}</div></div></div>`;
  },

  // ── Page: every starred message ────────────────────────────────────────────
  _pg_starred() {
    const el = this._el(`<div>
      <div class="scroll"><div class="large-title">Starred</div><div class="ipage" style="padding-top:6px"><div class="empty">Loading…</div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.ipage');
    page.onShow = async () => {
      try {
        const r = await this._ws('starred');
        body.innerHTML = r.messages.length ? `<div class="group">${r.messages.map(m => this._starRow(m)).join('')}</div>` : '<div class="empty"><b>No Starred Messages</b>Press and hold a message and tap Star to keep it here.</div>';
      } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      const sm = e.target.closest('[data-smid]');
      if (sm) this._jumpTo(sm.dataset.stid, +sm.dataset.ts, sm.dataset.smid);
    });
    return page;
  },

  // ── Page: search one conversation ──────────────────────────────────────────
  _pg_tsearch({ tid, ask = false }) {
    const canAsk = () => !!this._s.ai?.ask;
    const KINDS = [['', 'All'], ['photos', 'Photos'], ['links', 'Links'], ['files', 'Files'], ['locations', 'Locations']];
    const el = this._el(`<div class="tsearch">
      <div class="scroll"><div class="ipage"><input class="xfield q" type="search" autocomplete="off" enterkeyhint="search"><div class="schips"></div><div class="ask-slot"></div><div class="sres"></div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="title">Search</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    const q = el.querySelector('.q'), res = el.querySelector('.sres'), slot = el.querySelector('.ask-slot'), chips = el.querySelector('.schips');
    // Ask: the same box answers questions about this chat (when an administrator has it switched on)
    let kind = ask && canAsk() ? 'ask' : '', timer, asked = '', seq = 0;
    const looksLikeQuestion = (t) => /\?\s*$/.test(t) || /^(when|what|what's|whats|who|who's|where|where's|how|how's|which|why|did|does|do|is|are|was|were|can|could|will|has|have|had)\b/i.test(t);
    const drawChips = () => {
      // Ask sits next to All, so it's in view without scrolling the chips
      const list = canAsk() ? [KINDS[0], ['ask', 'Ask'], ...KINDS.slice(1)] : KINDS;
      if (kind === 'ask' && !canAsk()) kind = '';
      this._set(chips, list.map(([v, n]) => `<button data-k="${v}" class="${v === kind ? 'on' : ''}${v === 'ask' ? ' ask-chip' : ''}">${v === 'ask' ? `<span class="ask-sp">${ICON.askSearch}</span>` : ''}${n}</button>`).join(''));
      q.placeholder = canAsk() ? (kind === 'ask' ? 'Ask about this chat' : 'Search or ask about this chat') : 'Search this conversation';
      q.setAttribute('enterkeyhint', kind === 'ask' ? 'go' : 'search');
    };
    const quoteRows = (list) => list.map(m => this._starRow(m)).join('');
    const showAnswer = async (question) => {
      question = question.trim();
      if (!question) return;
      asked = question;
      const my = ++seq;
      slot.innerHTML = `<div class="ask-card g"><div class="cu-h"><span class="ask-sp">${ICON.askSearch}</span><b>Ask</b></div><div class="ask-q">${esc(question)}</div><div class="cu-text cu-wait">Looking through this chat…</div></div>`;
      try {
        const r = (await this._ws('ai', { action: 'ask', thread_id: tid, text: question })).result || {};
        if (my !== seq) return;
        slot.innerHTML = `<div class="ask-card g"><div class="cu-h"><span class="ask-sp">${ICON.askSearch}</span><b>Ask</b><button class="ask-copy" data-a="askcopy" aria-label="Copy answer">${ICON.copy}</button></div>
          <div class="ask-q">${esc(question)}</div><div class="cu-text ask-a${r.found === false ? ' none' : ''}">${esc(r.answer || '')}</div>
          ${(r.messages || []).length ? `<div class="ask-from">From the chat</div><div class="group ask-quotes">${quoteRows(r.messages)}</div>` : ''}
          <div class="ask-note">Answers come from this chat only, so check anything important.</div></div>`;
        slot.querySelector('.ask-card').dataset.answer = r.answer || '';
      } catch (err) {
        if (my !== seq) return;
        slot.innerHTML = `<div class="ask-card g"><div class="cu-h"><span class="ask-sp">${ICON.askSearch}</span><b>Ask</b></div><div class="cu-text">${esc(this._aiError(err, 'Couldn’t answer that just now. Try again in a moment.'))}</div></div>`;
      }
    };
    const run = async () => {
      drawChips();
      const t = q.value.trim();
      if (kind === 'ask') {
        res.innerHTML = '';
        if (!t && !asked) slot.innerHTML = `<div class="empty ask-hint"><b>Ask About This Chat</b>Try “When is the plumber coming?” or “What was the Wi-Fi password?”</div>`;
        return;
      }
      if (asked !== t) slot.innerHTML = '';
      // a question gets an Ask row at the top of the results
      const offer = canAsk() && t.length > 3 && looksLikeQuestion(t) && asked !== t;
      const offerHtml = offer ? `<button class="ask-offer g" data-a="askthis"><span class="ask-sp">${ICON.askSearch}</span><span class="ask-ot">Ask “${esc(t.length > 60 ? t.slice(0, 58) + '…' : t)}”</span>${ICON.chevR}</button>` : '';
      if (!t && !kind) { res.innerHTML = offerHtml; return; }
      try {
        const r = await this._ws('search', { query: t, thread_id: tid, ...(kind ? { kind } : {}) });
        if (q.value.trim() !== t) return;
        res.innerHTML = offerHtml + (r.messages.length ? `<div class="group">${quoteRows(r.messages)}</div>` : (offer ? '' : '<div class="empty"><b>No Results</b></div>'));
      } catch (err) { res.innerHTML = offerHtml + `<div class="empty">${esc(err.message)}</div>`; }
    };
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, kind === 'ask' ? 0 : 250); });
    q.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const t = q.value.trim();
      if (kind === 'ask' || (canAsk() && t.length > 3 && looksLikeQuestion(t))) { e.preventDefault(); res.innerHTML = ''; showAnswer(t); q.blur(); }
    });
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      if (e.target.closest('[data-a="askthis"]')) { res.innerHTML = ''; showAnswer(q.value); return; }
      if (e.target.closest('[data-a="askcopy"]')) {
        try { await navigator.clipboard.writeText(el.querySelector('.ask-card')?.dataset.answer || ''); this._toast('Copied'); } catch (err) { this._toast('Copy not available here'); }
        return;
      }
      const k = e.target.closest('[data-k]');
      if (k) {
        kind = k.dataset.k;
        if (kind === 'ask') { asked = ''; slot.innerHTML = ''; if (q.value.trim()) { drawChips(); res.innerHTML = ''; showAnswer(q.value); return; } q.focus(); }
        else if (asked) { asked = ''; slot.innerHTML = ''; }
        run(); return;
      }
      const sm = e.target.closest('[data-smid]');
      if (sm) { this._back(false); this._jumpTo(tid, +sm.dataset.ts, sm.dataset.smid); }
    });
    page.refresh = (what) => { if (what === 'all' || what === 'ai') drawChips(); };
    page.onShow = () => { run(); setTimeout(() => q.focus(), 350); };
    return page;
  },
});

// ── Contacts (private to each Home Assistant user) ───────────────────────────
const FIELD_ICON = { phones: 'phone', emails: 'mail', urls: 'link', addresses: 'pin', dates: 'cal', related: 'person', social: 'at' };
const ADD_TEXT = { phones: 'add phone', emails: 'add email', urls: 'add URL', addresses: 'add address', dates: 'add date', related: 'add related name', social: 'add social profile' };
const OPTIONAL_FIELDS = [
  ['prefix', 'Prefix'], ['middle', 'Middle Name'], ['suffix', 'Suffix'], ['nickname', 'Nickname'], ['pronouns', 'Pronouns'],
  ['phonetic_first', 'Phonetic First Name'], ['phonetic_last', 'Phonetic Last Name'], ['job_title', 'Job Title'], ['department', 'Department'],
];

Object.assign(CrowMessengerCard.prototype, {

  _sortedContacts(q = '') {
    const order = this._config.contact_sort === 'first' ? 'first' : 'last';
    const myId = this._s.profile?.my_card;
    let list = [...this._s.contacts.values()].filter(c => c.id !== myId || !this._config.show_my_card);
    q = q.trim().toLowerCase();
    if (q) {
      list = list.filter(c => [contactName(c), c.company, c.nickname, c.job_title, ...(c.phones || []).map(p => p.value), ...(c.emails || []).map(e => e.value)]
        .filter(Boolean).join(' ').toLowerCase().includes(q) || (c.phones || []).some(p => telValue(p.value).includes(telValue(q)) && telValue(q).length > 2));
    }
    list.sort((a, b) => {
      const ka = contactSortKey(a, order), kb = contactSortKey(b, order);
      const la = contactLetter(a, order), lb = contactLetter(b, order);
      if ((la === '#') !== (lb === '#')) return la === '#' ? 1 : -1;
      return ka.localeCompare(kb, undefined, { sensitivity: 'base' }) || contactName(a).localeCompare(contactName(b));
    });
    return { list, order };
  },

  // A contact's photo, or the linked Home Assistant user's picture when it has none.
  _contactPic(c) {
    if (c.photo) return c.photo;
    return c.ha_user ? this._s.users.get(c.ha_user)?.picture || null : null;
  },

  async _picToDataUrl(pic) {
    if (/^data:/.test(pic)) return pic;
    const res = /^https?:/.test(pic) ? await fetch(pic) : await this._hass.fetchWithAuth(pic);
    if (!res.ok) throw new Error(res.status);
    const url = URL.createObjectURL(await res.blob());
    try { return await srcToAvatar(url, 320); } finally { URL.revokeObjectURL(url); }
  },

  _contactSub(c) {
    const named = !!(c.first || c.last);
    if (c.company && c.job_title) return named ? `${c.job_title}, ${c.company}` : c.job_title;
    return (named ? c.company : '') || c.job_title || '';
  },

  // ── Page: contacts list ────────────────────────────────────────────────────
  _pg_contacts() {
    const el = this._el(`<div>
      <div class="scroll"><div class="ct-list"></div></div>
      <div class="edge top"></div><div class="edge bottom"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="title">Contacts</div>${this._config.show_people_map !== false ? `<div class="capsule g"><button data-a="people" aria-label="People">${FM_ICON.locate}</button><button data-a="more" aria-label="More">${ICON.more}</button></div>` : `<button class="cb g" data-a="more" aria-label="More">${ICON.more}</button>`}</div>
      <div class="az"></div>
      <div class="bottom">
        <label class="searchbar g">${ICON.search}<input type="text" placeholder="Search" autocomplete="off" enterkeyhint="search"><button class="sb-btn clr" hidden aria-label="Clear">${ICON.x}</button></label>
        <button class="cb g" data-a="add" aria-label="New Contact">${ICON.plus}</button>
      </div>
      <input type="file" class="f-vcf" accept=".vcf,text/vcard,text/x-vcard" hidden>
    </div>`);
    const page = { el };
    const s = this._s;
    const listEl = el.querySelector('.ct-list'), scroll = el.querySelector('.scroll'), az = el.querySelector('.az');
    const input = el.querySelector('.searchbar input'), clr = el.querySelector('.clr');
    input.addEventListener('input', () => { clr.hidden = !input.value; page.refresh('contacts'); });
    clr.addEventListener('click', (e) => { e.preventDefault(); input.value = ''; clr.hidden = true; page.refresh('contacts'); });

    el.querySelector('.f-vcf').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (f) this._importVCards(f);
    });

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'add') {
        const linked = new Set([...s.contacts.values()].map(c => c.ha_user).filter(Boolean));
        const avail = [...s.users.values()].filter(u => u.id !== s.me && !linked.has(u.id) && !this._contactForUser(u.id));
        if (!avail.length) { this._nav('contactEdit', { prefill: {} }); return; }
        const v = await this._menu(e.target.closest('button'), [
          { text: 'New Contact', value: '__new', icon: ICON.addPerson },
          { sep: true }, { header: 'From Home Assistant' },
          ...avail.map(u => ({ text: u.ha_name || u.name, value: u.id, icon: ICON.person })),
        ], { above: true });
        if (v === '__new') this._nav('contactEdit', { prefill: {} });
        else if (v) { const u = s.users.get(v); const [first, ...rest] = (u.ha_name || u.name || '').split(' '); this._nav('contactEdit', { prefill: { first, last: rest.join(' '), ha_user: v } }); }
        return;
      }
      if (a === 'people') { this._nav('people'); return; }
      if (a === 'more') {
        const v = await this._menu(e.target.closest('button'), [
          { text: 'Import vCard…', value: 'import', icon: ICON.download },
          { text: 'Export All Contacts', value: 'export', icon: ICON.share },
          ...(this._pdfOn('contacts') ? [{ text: 'Export All as PDF', value: 'pdf', icon: ICON.doc }] : []),
          { sep: true },
          { text: 'Choose My Card…', value: 'mycard', icon: ICON.contacts },
          { text: 'Shared Name and Photo', value: 'profile', icon: ICON.person },
        ]);
        if (v === 'import') el.querySelector('.f-vcf').click();
        if (v === 'export') this._exportContacts([...s.contacts.values()], 'Contacts.vcf');
        if (v === 'pdf') this._nav('pdf', { title: 'Contacts', filename: 'Contacts.pdf', build: (status, closed) => this._pdfAddressBook(status, closed) });
        if (v === 'profile') this._nav('profile');
        if (v === 'mycard') {
          const { list } = this._sortedContacts();
          const all = s.profile?.my_card && s.contacts.get(s.profile.my_card) ? [s.contacts.get(s.profile.my_card), ...list] : list;
          if (!all.length) { this._nav('contactEdit', { prefill: this._myPrefill(), myCard: true }); return; }
          const pick = await this._menu(e.target.closest('button'), [{ header: 'Choose My Card' }, ...all.slice(0, 80).map(c => ({ text: contactName(c, this._config.contact_display), value: c.id, checked: c.id === s.profile?.my_card }))]);
          if (pick) this._setProfile({ my_card: pick });
        }
        return;
      }
      if (a === 'hachat') {
        try {
          const r = await this._ws('create_thread', { participants: [HA_ID] });
          this._upsertThread({ ...r.thread, visible: true });
          this._openThread(r.thread.id, {});
        } catch (err) { this._toast(err.message || 'Couldn’t open the Home Assistant chat'); }
        return;
      }
      if (a === 'me') {
        const mc = s.profile?.my_card && s.contacts.get(s.profile.my_card);
        if (mc) this._nav('contact', { cid: mc.id });
        else this._nav('contactEdit', { prefill: this._myPrefill(), myCard: true });
        return;
      }
      const row = e.target.closest('.ct-row');
      if (row) this._nav('contact', { cid: row.dataset.cid });
    });

    // A–Z index: tap or drag
    const jump = (x, y) => {
      const b = this.shadowRoot.elementFromPoint(x, y);
      if (!b || b.parentElement !== az) return;
      const letters = [...listEl.querySelectorAll('.ct-sec')];
      const target = letters.find(h => h.dataset.l >= b.textContent) || letters[letters.length - 1];
      if (target) scroll.scrollTop = target.offsetTop - 60;
    };
    az.addEventListener('pointerdown', (e) => { e.preventDefault(); try { az.setPointerCapture(e.pointerId); } catch (err) { /* */ } jump(e.clientX, e.clientY); });
    az.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') jump(e.clientX, e.clientY); });

    page.refresh = (what) => {
      if (!['all', 'contacts'].includes(what)) return;
      const q = input.value;
      const { list, order } = this._sortedContacts(q);
      let html = '';
      if (this._config.show_my_card !== false && !q) {
        const mc = s.profile?.my_card && s.contacts.get(s.profile.my_card);
        const name = mc ? contactName(mc, this._config.contact_display) : (s.users.get(s.me)?.ha_name || s.users.get(s.me)?.name || 'My Card');
        const pic = mc?.photo || s.users.get(s.me)?.picture;
        html += `<div class="ct-me" data-a="me">${this._avHtml({ pic, name, size: 64 })}<div><div class="n">${esc(name)}</div><div class="s">My Card</div></div></div>`;
      }
      // Home Assistant is always there while its chat is on — built in, never saved, exported or edited
      const ql = q.trim().toLowerCase();
      const haShown = !!(s.ai?.assistant && (!ql || 'home assistant ha assist'.includes(ql) || ql.split(/\s+/).every(w => 'home assistant'.includes(w))));
      if (haShown && (!ql || 'home assistant ha assist'.includes(ql) || ql.split(/\s+/).every(w => 'home assistant'.includes(w)))) {
        html += `<div class="ct-row ct-ha" data-a="hachat">${this._avHtml({ ha: true, size: 48 })}<div style="min-width:0"><div class="n">Home Assistant</div><div class="s">Ask about or control your home</div></div></div>`;
      }
      let cur = null, n = 0;
      for (const c of list) {
        const L = contactLetter(c, order);
        if (L !== cur) { cur = L; html += `<div class="ct-sec" data-l="${L === '#' ? '~' : L}">${L}</div>`; }
        const name = contactName(c, this._config.contact_display);
        html += `<div class="ct-row" data-cid="${esc(c.id)}">${this._avHtml({ pic: this._contactPic(c), name, size: 48 })}<div style="min-width:0"><div class="n">${esc(name)}</div>${this._contactSub(c) ? `<div class="s">${esc(this._contactSub(c))}</div>` : ''}</div></div>`;
        n++;
      }
      if (!n && !(q && haShown)) html += q ? `<div class="empty"><b>No Results</b>No contacts match “${esc(q.trim())}”.</div>` : `<div class="empty"><b>No Contacts</b>Tap + to add someone, or use ••• to import a vCard exported from your iPhone or Android contacts.<br><br>Your contacts are private — no one else in your home can see them.</div>`;
      this._set(listEl, html);
      this._set(az, n > 8 ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(l => `<b>${l}</b>`).join('') : '');
    };
    return page;
  },

  _myPrefill() {
    const u = this._s.users.get(this._s.me);
    const [first, ...rest] = (u?.ha_name || u?.name || '').split(' ');
    return { first, last: rest.join(' '), ha_user: this._s.me };
  },

  async _setProfile(patch) {
    try { const r = await this._ws('profile/set', patch); this._s.profile = r.profile; this._refresh('contacts'); } catch (err) { this._toast(err.message); }
  },

  // ── Page: contact card ─────────────────────────────────────────────────────
  _pg_contact({ cid }) {
    const el = this._el(`<div class="cpage">
      <div class="cbg"><div class="ph"></div><div class="tint"></div></div>
      <div class="scroll"><div class="c-inner"></div></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><button class="pill g" data-a="edit">Edit</button></div>
    </div>`);
    const page = { el };
    const s = this._s, inner = el.querySelector('.c-inner');
    let tintFor = null;

    const applyTint = async (c, name) => {
      const blur = this._config.contact_blur !== false;
      el.classList.toggle('tinted', blur);
      el.querySelector('.cbg').style.display = blur ? '' : 'none';
      if (!blur) return;
      const key = `${c.photo ? c.photo.length + c.photo.slice(-40) : ''}|${name}|${this._isDark()}`;
      if (tintFor === key) return;
      tintFor = key;
      const dark = this._isDark();
      const ph = el.querySelector('.ph'), tint = el.querySelector('.tint');
      ph.style.backgroundImage = c.photo ? `url("${c.photo}")` : 'none';
      let rgb = c.photo ? await averageColour(c.photo) : null;
      if (!rgb) {
        const h = hashHue(name);
        tint.style.background = dark
          ? `linear-gradient(180deg, hsl(${h} 32% 34%) 0%, hsl(${h} 28% 22%) 45%, hsl(${h} 24% 14%) 100%)`
          : `linear-gradient(180deg, hsl(${h} 50% 86%) 0%, hsl(${h} 40% 90%) 45%, hsl(${h} 30% 94%) 100%)`;
        return;
      }
      const mix = (k, t) => rgb.map(v => Math.round(v * (1 - k) + t * k));
      const [a, b] = dark ? [mix(0.45, 0), mix(0.7, 0)] : [mix(0.55, 255), mix(0.75, 255)];
      tint.style.background = `linear-gradient(180deg, rgba(${a},0.62) 0%, rgba(${b},0.86) 55%, rgba(${b},0.94) 100%)`;
    };

    page.refresh = (what) => {
      if (!['all', 'contacts', 'states'].includes(what)) return;
      const c = s.contacts.get(cid);
      if (!c) { inner.innerHTML = '<div class="empty" style="padding-top:120px">This contact was deleted.</div>'; return; }
      const name = contactName(c, this._config.contact_display);
      applyTint(c, name);
      const isMe = s.profile?.my_card === cid;
      const phone = c.phones?.[0], email = c.emails?.[0];
      const canMsg = !!(c.ha_user && s.users.has(c.ha_user) && c.ha_user !== s.me) || !!phone;
      const apple = isApple();
      const field = (kind, i, label, value, icon, extra = '') => `<div class="cf" data-k="${kind}" data-i="${i}"${extra}><div class="cmain"><div class="cl">${esc(label)}</div><div class="cvv">${esc(value)}</div></div>${icon ? `<span class="ci">${ICON[icon]}</span>` : ''}</div>`;
      const grp = (rows) => rows.length ? `<div class="group">${rows.join('')}</div>` : '';
      const sub = [c.nickname && `“${c.nickname}”`, c.pronouns, this._contactSub(c), c.department].filter(Boolean).join(' · ');
      const profile = s.profile || {};
      let html = `<div class="c-hero">${this._avHtml({ pic: this._contactPic(c), name, size: 116 })}<div class="cn">${esc(name)}</div>${sub ? `<div class="cs">${esc(sub)}</div>` : ''}</div>
        <div class="c-actions">
          <button class="c-act g" data-act="message" ${canMsg && !isMe ? '' : 'disabled'}>${ICON.bubble}<span>message</span></button>
          <button class="c-act g" data-act="call" ${phone ? '' : 'disabled'}>${ICON.phone}<span>call</span></button>
          ${apple ? `<button class="c-act g" data-act="video" ${phone || email ? '' : 'disabled'}>${ICON.video}<span>video</span></button>` : ''}
          <button class="c-act g" data-act="mail" ${email ? '' : 'disabled'}>${ICON.mail}<span>mail</span></button>
        </div><div class="c-body">`;
      if (isMe) {
        const pic = profile.photo || c.photo || s.users.get(s.me)?.picture;
        html += grp([`<div class="cf shared" data-a="profile">${this._avHtml({ pic, name: profile.name || name, size: 56 })}<div class="cmain"><div class="sh1">Shared Name and Photo</div><div class="sh2">${profile.share ? 'Everyone in Home Assistant' : 'Off'}</div></div><span class="ci" style="width:16px;height:16px;opacity:.5">${ICON.chevR}</span></div>`]);
      }
      if (c.ha_user && c.ha_user !== s.me && s.users.has(c.ha_user)) {
        html += grp([`<div class="cf" data-a="hamsg"><div class="cmain"><div class="cl">Home Assistant</div><div class="cvv">${esc(s.users.get(c.ha_user).ha_name || s.users.get(c.ha_user).name)}</div></div><span class="ci">${ICON.bubble}</span></div>`]);
      }
      const person = c.ha_user && this._config.show_people_map !== false && this._people().find(p => p.uid === c.ha_user && p.has);
      if (person) html += grp([`<div class="cf" data-a="locate" data-eid="${esc(person.eid)}"><div class="cmain"><div class="cl">location</div><div class="cvv">${esc(this._placeLabel(person))} · ${esc(timeAgoShort(person.ts))}</div></div><span class="ci">${ICON.pin}</span></div>`]);
      html += grp((c.phones || []).map((p, i) => field('phones', i, p.label || 'phone', p.value, 'phone')));
      html += grp((c.emails || []).map((p, i) => field('emails', i, p.label || 'email', p.value, 'mail')));
      html += grp((c.addresses || []).map((p, i) => field('addresses', i, p.label || 'address', formatAddress(p), 'pin')));
      const dates = [];
      if (c.birthday) dates.push(field('birthday', 0, 'birthday', fmtLongDate(c.birthday, this._hass), 'cal'));
      (c.dates || []).forEach((d, i) => dates.push(field('dates', i, d.label || 'date', fmtLongDate(d.value, this._hass), 'cal')));
      html += grp(dates);
      html += grp((c.urls || []).map((p, i) => field('urls', i, p.label || 'homepage', p.value, 'link')));
      html += grp((c.social || []).map((p, i) => field('social', i, p.label || 'profile', p.value, 'at')));
      html += grp((c.related || []).map((p, i) => field('related', i, p.label || 'related', p.value, '')));
      if (c.notes) html += grp([`<div class="cf" data-k="notes" style="cursor:text"><div class="cmain"><div class="cl">notes</div><div class="cvv plain sel">${esc(c.notes)}</div></div></div>`]);
      html += grp([
        ...(c.ha_user && c.ha_user !== s.me && s.users.has(c.ha_user) ? [`<div class="gr blue" data-a="hamsg"><div class="gl">Send Message</div></div>`] : []),
        `<div class="gr blue" data-a="share"><div class="gl">Share Contact</div></div>`,
        ...(this._pdfOn('contact') ? [`<div class="gr blue" data-a="pdf"><div class="gl">Export as PDF</div></div>`] : []),
        `<div class="gr blue" data-a="fav"><div class="gl">${c.favourite ? 'Remove from Favourites' : 'Add to Favourites'}</div></div>`,
      ]);
      html += '</div>';
      this._set(inner, html);
    };

    el.addEventListener('click', async (e) => {
      const c = s.contacts.get(cid);
      if (!c) { if (e.target.closest('[data-a="back"]')) this._back(); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'edit') { this._nav('contactEdit', { cid }); return; }
      if (a === 'profile') { this._nav('profile'); return; }
      if (a === 'locate') { this._nav('people', { focus: e.target.closest('[data-eid]').dataset.eid }); return; }
      if (a === 'hamsg') { this._messageUser(c.ha_user); return; }
      if (a === 'share') { this._exportContacts([c], `${contactName(c).replace(/[\\/:*?"<>|]/g, '')}.vcf`); return; }
      if (a === 'pdf') { const nm = contactName(c).replace(/[\\/:*?"<>|]/g, '').trim() || 'Contact'; this._nav('pdf', { title: 'Contact', filename: `${nm}.pdf`, build: (status) => this._pdfContact(c, status) }); return; }
      if (a === 'fav') { this._ws('contacts/save', { contacts: [{ ...c, favourite: !c.favourite }] }).catch(err => this._toast(err.message)); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'message') {
        if (c.ha_user && s.users.has(c.ha_user) && c.ha_user !== s.me) this._messageUser(c.ha_user);
        else if (c.phones?.length) this._pickThen(e.target.closest('button'), c.phones, (p) => this._confirmContactAction('sms', p, c));
        return;
      }
      if (act === 'call') { this._pickThen(e.target.closest('button'), c.phones, (p) => this._confirmContactAction('phones', p, c)); return; }
      if (act === 'mail') { this._pickThen(e.target.closest('button'), c.emails, (p) => this._confirmContactAction('emails', p, c)); return; }
      if (act === 'video') { this._pickThen(e.target.closest('button'), [...(c.phones || []), ...(c.emails || [])], (p) => this._confirmContactAction('facetime', p, c)); return; }
      const f = e.target.closest('.cf[data-k]');
      if (f && !this._lpFired) {
        const k = f.dataset.k, i = +f.dataset.i;
        if (k === 'notes') return;
        const item = k === 'birthday' ? { label: 'birthday', value: c.birthday } : c[k]?.[i];
        if (k === 'related') {
          const match = [...s.contacts.values()].find(x => contactName(x).toLowerCase() === String(item.value).toLowerCase() || x.first?.toLowerCase() === String(item.value).toLowerCase());
          if (match) this._nav('contact', { cid: match.id });
          return;
        }
        if (item) this._confirmContactAction(k, item, c);
      }
      this._lpFired = false;
    });
    this._onLongPress(el, '.cf[data-k]', async (row) => {
      const c = s.contacts.get(cid);
      const k = row.dataset.k, i = +row.dataset.i;
      const item = k === 'notes' ? { value: c.notes } : k === 'birthday' ? { value: fmtLongDate(c.birthday, this._hass) } : c[k]?.[i];
      const value = k === 'addresses' ? formatAddress(item) : k === 'dates' ? fmtLongDate(item.value, this._hass) : item?.value;
      if (!value) return;
      this._lpFired = true;
      const v = await this._menu(row, [{ text: 'Copy', value: 'copy', icon: ICON.copy }], { align: 'left' });
      this._lpFired = false;
      if (v === 'copy') { try { await navigator.clipboard.writeText(value); this._toast('Copied'); } catch (err) { this._toast('Copy not available here'); } }
    });
    page.onShow = () => { if (!s.contacts.get(cid)) setTimeout(() => this._back(), 50); };
    return page;
  },

  _onLongPress(scope, selector, cb) {
    let timer = null, sx = 0, sy = 0;
    scope.addEventListener('pointerdown', (e) => {
      const t = e.target.closest(selector);
      if (!t) return;
      sx = e.clientX; sy = e.clientY;
      timer = setTimeout(() => { timer = null; cb(t); }, 520);
    });
    const cancel = () => { clearTimeout(timer); timer = null; };
    scope.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
    scope.addEventListener('pointerup', cancel);
    scope.addEventListener('pointercancel', cancel);
    scope.addEventListener('contextmenu', (e) => { const t = e.target.closest(selector); if (t) { e.preventDefault(); cancel(); cb(t); } });
  },

  async _pickThen(anchor, items, fn) {
    items = items || [];
    if (!items.length) return;
    if (items.length === 1) { fn(items[0]); return; }
    const v = await this._menu(anchor, items.map((p, i) => ({ text: `${p.label ? p.label + ': ' : ''}${p.value}`, value: String(i) })), { align: 'left' });
    if (v !== null && v !== undefined) fn(items[+v]);
  },

  async _messageUser(uid) {
    if (!uid) return;
    const existing = [...this._s.threads.values()].find(t => !t.is_group && t.participants.includes(uid) && t.participants.includes(this._s.me));
    if (existing) { this._nav('thread', { tid: existing.id }); return; }
    // a new conversation needs them in your contacts first
    if (uid !== HA_ID && !this._contactForUser(uid)) {
      const r = await this._alert({
        title: 'Add to Contacts?', message: `Add ${this._userName(uid)} to your contacts to message them.`,
        buttons: [{ text: 'Add to Contacts', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }],
      });
      if (r.value) this._addContactFor(uid);
      return;
    }
    try {
      const r = await this._ws('create_thread', { participants: [uid] });
      this._upsertThread({ ...r.thread, visible: true });
      this._nav('thread', { tid: r.thread.id });
    } catch (err) { this._toast(err.message); }
  },

  // The confirmation popup (glass when Popup Liquid Glass is on) before
  // handing a number / address / link to the phone's own apps.
  async _confirmContactAction(kind, item, c) {
    const name = contactName(c, this._config.contact_display);
    const v = item.value;
    let title, message = `${name}${item.label ? ` · ${item.label}` : ''}`, ok, url, after = null;
    switch (kind) {
      case 'phones': title = `Call ${v}?`; ok = 'Call'; url = `tel:${telValue(v)}`; break;
      case 'sms': title = `Send a text to ${v}?`; ok = 'Text'; url = `sms:${telValue(v)}`; break;
      case 'facetime': title = `FaceTime ${v}?`; ok = 'FaceTime'; url = `facetime:${/@/.test(v) ? v : telValue(v)}`; break;
      case 'emails': title = `Email ${v}?`; ok = 'Email'; url = `mailto:${encodeURIComponent(v).replace(/%40/g, '@')}`; break;
      case 'addresses': {
        const addr = formatAddress(item);
        title = 'Get Directions?'; message = `${addr}`; ok = isApple() ? 'Open in Maps' : isAndroid() ? 'Open in Maps' : 'Open in Google Maps';
        url = mapsUrl(addr); break;
      }
      case 'urls': {
        const href = /^[a-z][\w+.-]*:/i.test(v) ? v : `https://${v}`;
        let host = v; try { host = new URL(href).host; } catch (e) { /* */ }
        title = `Open ${host}?`; ok = 'Open'; url = href; break;
      }
      case 'social': {
        url = socialUrl(item);
        if (!url) { this._toast('No link for that profile'); return; }
        title = `Open ${item.label || 'profile'}?`; message = `${name} · ${v}`; ok = 'Open'; break;
      }
      case 'birthday': case 'dates': {
        const label = kind === 'birthday' ? 'Birthday' : (item.label || 'Date').replace(/^./, x => x.toUpperCase());
        title = `Add ${name}’s ${label} to Calendar?`; message = `${fmtLongDate(v, this._hass)} · repeats every year`; ok = 'Add to Calendar';
        const ics = icsForDate(`${name}’s ${label}`, v);
        if (!ics) return;
        after = () => {
          const blob = new Blob([ics], { type: 'text/calendar' });
          const file = new File([blob], `${name} ${label}.ics`, { type: 'text/calendar' });
          if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file] }).catch(() => {});
          else downloadBlob(blob, `${name} ${label}.ics`);
        };
        break;
      }
      default: return;
    }
    const r = await this._alert({ title, message, buttons: [{ text: ok, style: 'ok', value: true, href: after ? undefined : url, onTap: after || undefined }, { text: 'Cancel', style: 'cancel' }] });
    if (!r.value) return;
  },

  // ── Page: edit / new contact ───────────────────────────────────────────────
  _pg_contactEdit({ cid, prefill, myCard }) {
    const s = this._s;
    const orig = cid ? s.contacts.get(cid) : null;
    const w = JSON.parse(JSON.stringify(orig || prefill || {}));
    const startJson = JSON.stringify(w);
    const shown = new Set(OPTIONAL_FIELDS.map(f => f[0]).filter(k => w[k]));
    const el = this._el(`<div>
      <div class="scroll"><div class="ce"></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="pill g" data-a="cancel">Cancel</button><div class="title">${orig ? '' : myCard ? 'My Card' : 'New Contact'}</div><button class="pill g accent" data-a="done">Done</button></div>
      <input type="file" accept="image/*" class="f-photo" hidden>
    </div>`);
    const page = { el };
    const ce = el.querySelector('.ce');
    const userOpts = () => [`<option value="">None</option>`, ...[...s.users.values()].map(u => `<option value="${esc(u.id)}" ${w.ha_user === u.id ? 'selected' : ''}>${esc(u.ha_name || u.name)}${u.id === s.me ? ' (You)' : ''}</option>`)].join('');

    const render = () => {
      const name = contactName(w, this._config.contact_display);
      const text = (k, ph, type = 'text') => `<div class="fi"><input type="${type}" data-k="${k}" value="${esc(w[k] || '')}" placeholder="${esc(ph)}" autocomplete="off"></div>`;
      const haPic = !w.photo && w.photo !== '' && w.ha_user ? s.users.get(w.ha_user)?.picture : null;
      const shownPic = w.photo || haPic;
      let html = `<div class="photo-btn">${this._avHtml({ pic: shownPic, name: name === 'No Name' ? '' : name, size: 110 })}<button class="lnk" data-a="photo">${shownPic ? 'Edit' : 'Add Photo'}</button>${haPic ? '<div style="font-size:12px;color:var(--cm-text2);margin-top:-2px">Home Assistant picture</div>' : ''}</div>`;
      html += `<div class="group-h">Home Assistant</div><div class="group"><div class="fi"><span class="lab" style="color:var(--cm-text);min-width:0;max-width:none">Messages to</span><span class="vline"></span><select class="fs" data-k="ha_user">${userOpts()}</select></div></div>`;
      html += `<div style="font-size:13px;color:var(--cm-text2);margin:-8px 18px 18px;line-height:1.35">Link this contact to a Home Assistant user so “message” opens your Crow Messenger chat with them.</div>`;
      html += '<div class="group">';
      if (shown.has('prefix')) html += text('prefix', 'Prefix');
      html += text('first', 'First name');
      if (shown.has('phonetic_first')) html += text('phonetic_first', 'Phonetic first name');
      if (shown.has('middle')) html += text('middle', 'Middle name');
      html += text('last', 'Last name');
      if (shown.has('phonetic_last')) html += text('phonetic_last', 'Phonetic last name');
      if (shown.has('suffix')) html += text('suffix', 'Suffix');
      if (shown.has('nickname')) html += text('nickname', 'Nickname');
      if (shown.has('pronouns')) html += text('pronouns', 'Pronouns');
      html += text('company', 'Company');
      if (shown.has('job_title')) html += text('job_title', 'Job title');
      if (shown.has('department')) html += text('department', 'Department');
      html += '</div><div class="ha-sug" hidden></div>';

      for (const kind of ['phones', 'emails', 'urls', 'addresses']) html += listGroup(kind);
      // birthday + dates share one group, like iOS
      html += '<div class="group">';
      if (w.birthday !== undefined && w.birthday !== null) {
        html += `<div class="fi"><button class="rm" data-rm="birthday">${ICON.minusCircle}</button><span class="lab" style="color:var(--cm-text)"><span>birthday</span></span><span class="vline"></span><input type="date" data-k="birthday" value="${esc(dateInput(w.birthday))}"></div>`;
      } else html += `<div class="fi adder" data-add="birthday"><span class="ad">${ICON.plusCircle}</span><span>add birthday</span></div>`;
      html += '</div>';
      for (const kind of ['dates', 'related', 'social']) html += listGroup(kind);
      html += `<div class="group"><div class="fi"><textarea data-k="notes" placeholder="Notes">${esc(w.notes || '')}</textarea></div></div>`;
      const remaining = OPTIONAL_FIELDS.filter(f => !shown.has(f[0]));
      if (remaining.length) html += `<div class="group"><div class="fi adder" data-a="addfield"><span class="ad">${ICON.plusCircle}</span><span>add field</span></div></div>`;
      if (orig) html += `<div class="group"><button class="del-btn" data-a="delete">Delete Contact</button></div>`;
      const top = el.querySelector('.scroll').scrollTop;
      ce.innerHTML = html;
      el.querySelector('.scroll').scrollTop = top;
      suggest();
    };

    // Typing a name on a new contact suggests matching Home Assistant users; picking one fills in
    // their first and last name and links them (which also brings their Home Assistant picture)
    const haName = (u) => {
      const shared = (u.name || '').trim(), ha = (u.ha_name || '').trim();
      return shared.split(/\s+/).length > ha.split(/\s+/).length ? shared : (ha || shared);
    };
    const candidates = () => {
      if (orig || myCard || w.ha_user) return [];
      const typed = `${w.first || ''} ${w.last || ''}`.toLowerCase().split(/\s+/).filter(Boolean);
      if (!typed.length) return [];
      const linked = new Set([...s.contacts.values()].map(c => c.ha_user).filter(Boolean));
      return [...s.users.values()].filter(u => {
        if (u.id === s.me || linked.has(u.id)) return false;
        const words = `${haName(u)} ${u.ha_name || ''}`.toLowerCase().split(/\s+/).filter(Boolean);
        return typed.every(tw => words.some(x => x.startsWith(tw)));
      }).slice(0, 4);
    };
    const suggest = () => {
      const box = ce.querySelector('.ha-sug');
      if (!box) return;
      const list = candidates();
      box.hidden = !list.length;
      this._set(box, list.length ? `<div class="ha-sug-h">${ICON.ha}From Home Assistant</div><div class="ha-sug-row">${list.map(u => `<button class="g" data-sug="${esc(u.id)}">${this._avHtml({ pic: u.picture, name: haName(u), size: 28 })}<span>${esc(haName(u))}</span></button>`).join('')}</div>` : '');
    };

    const dateInput = (v) => { const m = String(v || '').match(/^(\d{4}|--)-?(\d{2})-?(\d{2})$/); return m ? `${m[1] === '--' ? new Date().getFullYear() : m[1]}-${m[2]}-${m[3]}` : ''; };
    const listGroup = (kind) => {
      const items = w[kind] || [];
      let html = '<div class="group">';
      items.forEach((it, i) => {
        const lab = `<button class="lab" data-lab="${kind}" data-i="${i}"><span>${esc(it.label || LABELS[kind][0])}</span>${ICON.chevR}</button><span class="vline"></span>`;
        const rm = `<button class="rm" data-rm="${kind}" data-i="${i}">${ICON.minusCircle}</button>`;
        if (kind === 'addresses') {
          html += `<div class="fi addr">${rm}${lab}<div class="addr-fields">${[['street', 'Street'], ['city', 'City'], ['county', 'County'], ['postcode', 'Postcode'], ['country', 'Country']].map(([f, ph]) => `<input type="text" data-list="${kind}" data-i="${i}" data-f="${f}" value="${esc(it[f] || '')}" placeholder="${ph}">`).join('')}</div></div>`;
        } else {
          const type = kind === 'phones' ? 'tel' : kind === 'emails' ? 'email' : kind === 'urls' ? 'url' : kind === 'dates' ? 'date' : 'text';
          const val = kind === 'dates' ? dateInput(it.value) : it.value || '';
          const ph = { phones: 'Phone', emails: 'Email', urls: 'URL', related: 'Name', social: 'Username' }[kind] || '';
          html += `<div class="fi">${rm}${lab}<input type="${type}" data-list="${kind}" data-i="${i}" data-f="value" value="${esc(val)}" placeholder="${ph}" ${kind === 'related' ? 'list="cm-contact-names"' : ''}></div>`;
        }
      });
      html += `<div class="fi adder" data-add="${kind}"><span class="ad">${ICON.plusCircle}</span><span>${ADD_TEXT[kind]}</span></div></div>`;
      return html;
    };

    ce.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) {
        let v = t.value;
        if (t.dataset.k === 'birthday') v = v || '';
        w[t.dataset.k] = v;
        if (['first', 'last', 'company', 'prefix', 'middle', 'suffix'].includes(t.dataset.k)) {
          const name = contactName(w, this._config.contact_display);
          const av = ce.querySelector('.photo-btn .av');
          // keep a picture (their own or their Home Assistant one); only initials follow the name
          if (av && !av.querySelector('img') && !av.classList.contains('missing')) av.textContent = initials(name === 'No Name' ? '' : name);
          if (t.dataset.k === 'first' || t.dataset.k === 'last') suggest();
        }
      } else if (t.dataset.list) {
        w[t.dataset.list][+t.dataset.i][t.dataset.f] = t.value;
      }
    });
    ce.addEventListener('change', (e) => {
      if (e.target.dataset.k === 'ha_user') {
        w.ha_user = e.target.value;
        // a newly linked person picks up their Home Assistant name and picture
        const u = s.users.get(w.ha_user);
        if (u && !w.first && !w.last && !w.company) { const [f, ...r] = (u.ha_name || u.name || '').split(' '); w.first = f; w.last = r.join(' '); }
        render();
      }
    });

    el.querySelector('.f-photo').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { w.photo = await fileToAvatar(f, 320); render(); } catch (err) { this._toast('Couldn’t use that photo'); }
    });

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'cancel') {
        if (JSON.stringify(w) !== startJson) {
          const r = await this._alert({ title: 'Discard Changes?', message: 'Your changes to this contact won’t be saved.', buttons: [{ text: 'Discard Changes', style: 'destructive', value: true }, { text: 'Keep Editing', style: 'cancel' }] });
          if (!r.value) return;
        }
        this._back();
        return;
      }
      if (a === 'done') { save(); return; }
      const sug = e.target.closest('[data-sug]')?.dataset.sug;
      if (sug) {
        const u = s.users.get(sug);
        if (!u) return;
        const [first, ...rest] = haName(u).split(/\s+/);
        Object.assign(w, { first, last: rest.join(' '), ha_user: u.id });
        render();
        return;
      }
      if (a === 'photo') {
        const linkedPic = !w.photo && w.photo !== '' && w.ha_user && s.users.get(w.ha_user)?.picture;
        if (!w.photo && !linkedPic) { el.querySelector('.f-photo').click(); return; }
        const v = await this._menu(e.target.closest('button'), [{ text: 'Choose Photo…', value: 'choose', icon: ICON.photo }, { text: 'Remove Photo', value: 'remove', icon: ICON.trash, red: true }], { align: 'left' });
        if (v === 'choose') el.querySelector('.f-photo').click();
        if (v === 'remove') { w.photo = ''; render(); }
        return;
      }
      if (a === 'addfield') {
        const remaining = OPTIONAL_FIELDS.filter(f => !shown.has(f[0]));
        const v = await this._menu(e.target.closest('.fi'), remaining.map(([k, l]) => ({ text: l, value: k })), { align: 'left', above: true });
        if (v) { shown.add(v); render(); ce.querySelector(`[data-k="${v}"]`)?.focus(); }
        return;
      }
      if (a === 'delete') {
        const r = await this._alert({ title: 'Delete Contact?', message: `${contactName(w)} will be deleted.`, buttons: [{ text: 'Delete Contact', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }] });
        if (!r.value) return;
        try { await this._ws('contacts/delete', { ids: [cid] }); s.contacts.delete(cid); } catch (err) { this._toast(err.message); return; }
        this._back(false);
        this._back();
        return;
      }
      const add = e.target.closest('[data-add]')?.dataset.add;
      if (add) {
        if (add === 'birthday') w.birthday = '';
        else {
          w[add] = w[add] || [];
          const used = new Set(w[add].map(x => x.label));
          const label = LABELS[add].find(l => !used.has(l)) || LABELS[add][0];
          w[add].push(add === 'addresses' ? { label, street: '', city: '', county: '', postcode: '', country: '' } : { label, value: '' });
        }
        render();
        const inputs = add === 'birthday' ? ce.querySelectorAll('[data-k="birthday"]') : ce.querySelectorAll(`[data-list="${add}"]`);
        const target = add === 'addresses' ? inputs[inputs.length - 5] : inputs[inputs.length - 1];
        target?.focus();
        return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const k = rm.dataset.rm;
        if (k === 'birthday') delete w.birthday;
        else w[k].splice(+rm.dataset.i, 1);
        render();
        return;
      }
      const lab = e.target.closest('[data-lab]');
      if (lab) {
        const kind = lab.dataset.lab, i = +lab.dataset.i;
        const cur = w[kind][i].label;
        const v = await this._menu(lab, [...LABELS[kind].map(l => ({ text: l, value: l, checked: l === cur })), { sep: true }, { text: 'custom', value: '__custom', checked: !LABELS[kind].includes(cur) }], { align: 'left' });
        if (v === '__custom') {
          const r = await this._alert({ title: 'Custom Label', input: { value: LABELS[kind].includes(cur) ? '' : cur, placeholder: 'Label' }, buttons: [{ text: 'Done', style: 'ok', value: true }, { text: 'Cancel', style: 'cancel' }] });
          if (r.value && r.input.trim()) w[kind][i].label = r.input.trim();
        } else if (v) w[kind][i].label = v;
        render();
      }
    });

    const save = async () => {
      const clean = { ...w };
      for (const k of ['phones', 'emails', 'urls', 'related', 'social', 'dates']) clean[k] = (clean[k] || []).filter(x => String(x.value || '').trim());
      clean.addresses = (clean.addresses || []).filter(x => ['street', 'city', 'county', 'postcode', 'country'].some(f => String(x[f] || '').trim()));
      if (!clean.birthday) delete clean.birthday;
      // keep the Home Assistant picture with the contact unless one was chosen or removed
      if (!clean.photo && clean.photo !== '' && clean.ha_user && s.users.get(clean.ha_user)?.picture) {
        try { clean.photo = await this._picToDataUrl(s.users.get(clean.ha_user).picture); } catch (err) { /* falls back to the live picture */ }
      }
      if (!clean.photo) delete clean.photo;
      const hasSomething = ['first', 'last', 'company', 'nickname'].some(k => String(clean[k] || '').trim()) || clean.phones.length || clean.emails.length;
      if (!hasSomething) { this._toast('Add a name, company, phone or email'); return; }
      const btn = el.querySelector('[data-a="done"]');
      btn.disabled = true;
      try {
        const r = await this._ws('contacts/save', { contacts: [clean] });
        const saved = r.contacts[0];
        s.contacts.set(saved.id, saved);
        if (myCard) await this._setProfile({ my_card: saved.id });
        if (orig) this._back();
        else { this._back(false); this._nav('contact', { cid: saved.id }, { anim: false }); }
        this._refresh('all');
      } catch (err) { this._toast(err.message || 'Couldn’t save'); btn.disabled = false; }
    };

    // datalist of contact names for "related"
    const dl = document.createElement('datalist');
    dl.id = 'cm-contact-names';
    dl.innerHTML = [...s.contacts.values()].map(c => `<option value="${esc(contactName(c))}">`).join('');
    el.appendChild(dl);
    page.refresh = (what) => { if (what === 'all' && !page._rendered) { page._rendered = true; render(); } };
    return page;
  },

  // ── Page: Shared Name and Photo ────────────────────────────────────────────
  _pg_profile() {
    const el = this._el(`<div>
      <div class="scroll"><div class="ipage"></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="title">Shared Name and Photo</div><div style="width:44px"></div></div>
      <input type="file" accept="image/*" class="f-photo" hidden>
    </div>`);
    const page = { el };
    const s = this._s, body = el.querySelector('.ipage');
    page.refresh = (what) => {
      if (!['all', 'contacts'].includes(what)) return;
      const p = s.profile || {};
      const me = s.users.get(s.me) || {};
      const mc = p.my_card && s.contacts.get(p.my_card);
      const name = p.name || (mc ? contactName(mc) : me.ha_name || me.name || '');
      const pic = p.photo || mc?.photo || me.picture;
      this._set(body, `
        <div class="ghead">${this._avHtml({ pic, name, size: 110 })}<div class="gtitle">${esc(name)}</div></div>
        <div class="group"><label class="gr"><div class="gl">Share Name and Photo</div><span class="tsw"><input type="checkbox" data-a="share" ${p.share ? 'checked' : ''}><span></span></span></label></div>
        <div style="font-size:13px;color:var(--cm-text2);margin:-8px 18px 18px;line-height:1.4">When this is on, everyone in your home sees this name and photo in Crow Messenger instead of your Home Assistant name and person picture.</div>
        ${p.share ? `<div class="group">
          <div class="gr" style="cursor:text"><div class="gl" style="flex:0 0 auto">Name</div><input type="text" data-a="name" value="${esc(p.name || name)}" style="flex:1;border:none;outline:none;background:transparent;font-size:17px;text-align:right;color:var(--cm-text2)"></div>
          <div class="gr blue" data-a="photo"><div class="gl">Choose Photo…</div></div>
          ${mc?.photo ? `<div class="gr blue" data-a="usemc"><div class="gl">Use My Card Photo</div></div>` : ''}
          ${p.photo ? `<div class="gr red" data-a="rmphoto"><div class="gl">Remove Photo</div></div>` : ''}
        </div>` : ''}
        <div class="group"><label class="gr"><div class="gl">Activity Status</div><span class="tsw"><input type="checkbox" data-a="activity" ${p.activity !== false ? 'checked' : ''}><span></span></span></label></div>
        <div style="font-size:13px;color:var(--cm-text2);margin:-8px 18px 18px;line-height:1.4">Lets people see when you’re using Crow Messenger (“Active now”, “Active 5m ago”). If you turn it off, you won’t see anyone else’s either.</div>`);
    };
    el.addEventListener('change', (e) => {
      const a = e.target.dataset.a;
      if (a === 'activity') { this._setProfile({ activity: e.target.checked }).then(() => this._ws('presence').then(r => { this._s.presence = r.presence || {}; this._refresh('presence'); })); return; }
      if (a === 'share') {
        const patch = { share: e.target.checked };
        if (e.target.checked && !s.profile?.name) {
          const mc = s.profile?.my_card && s.contacts.get(s.profile.my_card);
          const me = s.users.get(s.me) || {};
          patch.name = mc ? contactName(mc) : me.ha_name || me.name || '';
          if (mc?.photo && !s.profile?.photo) patch.photo = mc.photo;
        }
        this._setProfile(patch).then(() => page.refresh('all'));
      }
      if (a === 'name') this._setProfile({ name: e.target.value.trim() }).then(() => page.refresh('all'));
    });
    el.querySelector('.f-photo').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { const photo = await fileToAvatar(f, 320); await this._setProfile({ photo }); page.refresh('all'); } catch (err) { this._toast('Couldn’t use that photo'); }
    });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') this._back();
      if (a === 'photo') el.querySelector('.f-photo').click();
      if (a === 'usemc') { const mc = s.contacts.get(s.profile.my_card); await this._setProfile({ photo: mc.photo }); page.refresh('all'); }
      if (a === 'rmphoto') { await this._setProfile({ photo: null }); page.refresh('all'); }
    });
    return page;
  },

  // ── vCard import / export ──────────────────────────────────────────────────
  async _importVCards(file) {
    let text;
    try { text = await file.text(); } catch (e) { this._toast('Couldn’t read that file'); return; }
    const cards = parseVCards(text);
    if (!cards.length) { this._toast('No contacts found in that file'); return; }
    this._toast(`Importing ${cards.length} contact${cards.length > 1 ? 's' : ''}…`);
    const existing = new Set([...this._s.contacts.values()].map(c => `${contactName(c).toLowerCase()}|${telValue(c.phones?.[0]?.value)}`));
    const out = [];
    for (const c of cards) {
      const key = `${contactName(c).toLowerCase()}|${telValue(c.phones?.[0]?.value)}`;
      if (existing.has(key)) continue;
      existing.add(key);
      if (c._photoSrc) { try { c.photo = await srcToAvatar(c._photoSrc, 320); } catch (e) { /* skip photo */ } }
      delete c._photoSrc;
      out.push(c);
    }
    let saved = 0;
    for (let i = 0; i < out.length; i += 40) {
      try { const r = await this._ws('contacts/save', { contacts: out.slice(i, i + 40) }); r.contacts.forEach(c => this._s.contacts.set(c.id, c)); saved += r.contacts.length; }
      catch (err) { this._toast(err.message || 'Some contacts couldn’t be imported'); break; }
    }
    this._refresh('contacts');
    const skipped = cards.length - out.length;
    this._toast(`Imported ${saved} contact${saved === 1 ? '' : 's'}${skipped ? ` · ${skipped} already here` : ''}`);
  },

  async _exportContacts(list, filename) {
    if (!list.length) { this._toast('No contacts to export'); return; }
    const vcf = list.map(contactToVCard).join('\r\n');
    const blob = new Blob([vcf], { type: 'text/vcard' });
    const file = new File([blob], filename, { type: 'text/vcard' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (err) { if (err?.name === 'AbortError') return; }
    downloadBlob(blob, filename);
  },
});

// ── People: Find My-style map of everyone's location (from person.* entities) ─
// Map stack: MapLibre GL with OpenFreeMap vector
// tiles (dark / positron), no API key needed.
const FM_TILES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
  satellite: {
    version: 8,
    sources: { sat: { type: 'raster', tileSize: 256, attribution: 'Imagery © Esri',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] } },
    layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
  },
};
const FM_LIB = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
let _fmLibPromise = null;
function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!_fmLibPromise) {
    _fmLibPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `${FM_LIB}.js`;
      s.onload = () => res(window.maplibregl);
      s.onerror = () => { _fmLibPromise = null; rej(new Error('map library unavailable')); };
      document.head.appendChild(s);
    });
  }
  return _fmLibPromise;
}
let _fmCss = null;
async function mapLibreCss() {
  if (_fmCss !== null) return _fmCss;
  try { _fmCss = await (await fetch(`${FM_LIB}.css`)).text(); } catch (e) { _fmCss = ''; }
  return _fmCss;
}

const FM_ICON = {
  map: _f('<path d="M9 4.2L3.8 6A1.2 1.2 0 003 7.1v12.2a.8.8 0 001.1.8L9 18.4zM10.5 4.1v14.3l5 1.6V5.7zM17 5.7V20l4.2-1.5a1.2 1.2 0 00.8-1.1V5.2a.8.8 0 00-1.1-.8z"/>'),
  locate: _s('<path d="M20.5 3.5L3.8 10.6a.5.5 0 00.1.9l7 1.7 1.7 7a.5.5 0 00.9.1z"/>', 'stroke-width="2.1"'),
  locateFill: _f('<path d="M20.5 3.5L3.8 10.6a.5.5 0 00.1.9l7 1.7 1.7 7a.5.5 0 00.9.1z"/>'),
  noLoc: _s('<path d="M20.5 3.5L3.8 10.6a.5.5 0 00.1.9l7 1.7 1.7 7a.5.5 0 00.9.1zM3 3l18 18"/>', 'stroke-width="2.2"'),
  battery: _s('<rect x="2.5" y="7" width="17" height="10" rx="2.5"/><path d="M22 10.5v3"/>'),
  zone: _s('<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 2.6"/><path d="M12 8.2v7.6M8.2 12h7.6"/>', 'stroke-width="2"'),
};

// A zone's circle as a GeoJSON polygon, and the point a given distance and
// bearing away from a centre (used to place the radius handle on its edge).
function fmDest(lat, lon, bearing, metres) {
  const R = 6371000, toR = x => x * Math.PI / 180, toD = x => x * 180 / Math.PI;
  const d = metres / R, b = toR(bearing), la = toR(lat), lo = toR(lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [toD(la2), toD(lo2)];
}
function fmBearing(lat, lon, lat2, lon2) {
  const toR = x => x * Math.PI / 180;
  const y = Math.sin(toR(lon2 - lon)) * Math.cos(toR(lat2));
  const x = Math.cos(toR(lat)) * Math.sin(toR(lat2)) - Math.sin(toR(lat)) * Math.cos(toR(lat2)) * Math.cos(toR(lon2 - lon));
  return Math.atan2(y, x) * 180 / Math.PI;
}
function fmCircle(lat, lon, metres, props = {}, n = 72) {
  const ring = [];
  for (let i = 0; i < n; i++) { const [a, b] = fmDest(lat, lon, (i / n) * 360, metres); ring.push([b, a]); }
  ring.push(ring[0]);
  return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } };
}
const FM_EMPTY = { type: 'FeatureCollection', features: [] };
const FM_ZONE_MIN = 10, FM_ZONE_MAX = 2000, FM_ZONE_DEFAULT = 20;

const FM_CSS = `
.fm-map { position: absolute; inset: 0; background: var(--cm-bg2); }
.fm-map .maplibregl-ctrl-attrib { font-size: 9px; background: transparent !important; color: var(--cm-text3); }
.fm-map .maplibregl-ctrl-attrib a { color: var(--cm-text2); }
.fm-map .maplibregl-ctrl-bottom-right { bottom: auto; top: 0; }
.fm-nomap { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 120px; color: var(--cm-text2); font-size: 14px; text-align: center; }
.fm-ctrls { position: absolute; right: 14px; top: 12px; z-index: 6; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.fm-vcap { width: 48px; border-radius: 24px; display: flex; flex-direction: column; align-items: center; padding: 4px 0; }
.fm-vcap button { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
.fm-vcap button svg { width: 22px; height: 22px; }
.fm-vcap button.on { color: var(--cm-accent); }
.fm-3d { width: 48px; height: 48px; border-radius: 50%; font-size: 17px; font-weight: 600; }
.fm-3d.on { color: var(--cm-accent); }
.fm-sheet { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 8; border-radius: 38px; display: flex; flex-direction: column; overflow: hidden;
  background: var(--cm-glass); backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 0.5px solid var(--cm-glass-edge); box-shadow: inset 0 1px 0 var(--cm-glass-shine), 0 -6px 30px rgba(0,0,0,0.25);
  transition: height 0.35s cubic-bezier(.2,.9,.25,1); touch-action: none; }
:host([data-mode="dark"]) .fm-sheet { background: rgba(70,82,100,0.5); }
:host([data-bars="solid"]) .fm-sheet { background: var(--cm-sheet-solid); backdrop-filter: none; -webkit-backdrop-filter: none; }
.fm-sheet.dragging { transition: none; }
.fm-grab { width: 40px; height: 5px; border-radius: 3px; background: var(--cm-text3); margin: 8px auto 0; flex-shrink: 0; }
.fm-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px 6px 22px; flex-shrink: 0; min-height: 64px; }
.fm-head h2 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.01em; }
.fm-head .cb { width: 46px; height: 46px; }
.fm-list { flex: 1; overflow-y: auto; touch-action: pan-y; padding-bottom: 20px; scrollbar-width: none; }
.fm-row { display: flex; align-items: center; gap: 14px; padding: 10px 20px; position: relative; cursor: pointer; }
.fm-row + .fm-row::before { content: ''; position: absolute; top: 0; left: 86px; right: 20px; height: 1px; transform: scaleY(0.6); background: var(--cm-sep); }
.fm-row:active { background: var(--cm-fill2); }
.fm-row .fm-n { font-size: 17px; font-weight: 600; }
.fm-row .fm-s { font-size: 15px; color: var(--cm-text2); margin-top: 1px; }
.fm-row .fm-d { margin-left: auto; font-size: 15px; color: var(--cm-text2); align-self: flex-start; padding-top: 3px; white-space: nowrap; }
.fm-avw { position: relative; flex-shrink: 0; }
.fm-badge { position: absolute; top: -3px; right: -4px; width: 21px; height: 21px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(60,70,88,0.95); }
:host([data-mode="light"]) .fm-badge { border-color: #fff; }
.fm-badge.star { background: #FFD60A; color: #1c1c1e; }
.fm-badge.off { background: #8E8E93; color: #fff; }
.fm-badge svg { width: 11px; height: 11px; }
.fm-detail { padding: 0 20px 20px; }
.fm-detail .fm-dn { font-size: 26px; font-weight: 700; }
.fm-detail .fm-ds { font-size: 15px; color: var(--cm-text2); margin-top: 3px; }
.fm-acts { display: flex; gap: 10px; margin: 16px 0; }
.fm-acts button { flex: 1; height: 62px; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 500; color: var(--cm-accent); background: var(--cm-fill); }
.fm-acts button svg { width: 21px; height: 21px; }
.fm-acts button[disabled] { opacity: 0.4; pointer-events: none; }
.fm-info { border-radius: 20px; background: var(--cm-fill2); overflow: hidden; }
.fm-info .fi2 { display: flex; align-items: center; gap: 10px; padding: 12px 16px; font-size: 15px; }
.fm-info .fi2 + .fi2 { border-top: 1px solid var(--cm-sep); }
.fm-info .fi2 span:first-child { color: var(--cm-text2); flex: 1; }
.fm-mk { cursor: pointer; }
.fm-mk .av { border: 3px solid #fff; box-shadow: 0 3px 12px rgba(0,0,0,0.45); }
.fm-mk.stale .av { filter: grayscale(0.7); opacity: 0.85; }
.fm-mk.sel .av { border-color: var(--cm-accent); }
.fm-me { width: 22px; height: 22px; border-radius: 50%; background: #0A84FF; border: 3px solid #fff; box-shadow: 0 0 0 0 rgba(10,132,255,0.5), 0 2px 6px rgba(0,0,0,0.35); animation: fm-pulse 2.2s infinite; }
.fm-acts.four button { font-size: 11.5px; }
.fm-zwrap { position: absolute; inset: 0; z-index: 60; overflow: hidden; background: var(--cm-bg2); transform: translateY(100%); transition: transform 0.32s cubic-bezier(.2,.9,.25,1); }
.fm-zwrap.show { transform: none; }
.fm-zf { padding: 0 20px 20px; }
.fm-zf .fm-zs { font-size: 15px; color: var(--cm-text2); margin: 0 2px 14px; line-height: 1.35; }
.fm-zg { border-radius: 20px; background: var(--cm-fill2); overflow: hidden; }
.fm-zg label { display: flex; align-items: center; gap: 10px; padding: 0 16px; min-height: 50px; font-size: 16px; }
.fm-zg label + label { border-top: 1px solid var(--cm-sep); }
.fm-zg label > span:first-child { color: var(--cm-text2); flex-shrink: 0; }
.fm-zg input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--cm-text); font: inherit; font-size: 16px; text-align: right; padding: 0; -moz-appearance: textfield; }
.fm-zg input::-webkit-outer-spin-button, .fm-zg input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.fm-zg .fm-zu { color: var(--cm-text2); }
.fm-zb { width: 100%; height: 52px; margin-top: 14px; border-radius: 26px; background: var(--cm-accent) !important; color: #fff !important; font-size: 17px; font-weight: 600; }
.fm-zb[disabled] { opacity: 0.5; }
.fm-zc { width: 16px; height: 16px; border-radius: 50%; background: var(--cm-accent); border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.45); cursor: move; }
.fm-zh { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 3px solid var(--cm-accent); box-shadow: 0 1px 6px rgba(0,0,0,0.45); cursor: ew-resize; }
@keyframes fm-pulse { 0% { box-shadow: 0 0 0 0 rgba(10,132,255,0.45), 0 2px 6px rgba(0,0,0,0.35); } 70% { box-shadow: 0 0 0 18px rgba(10,132,255,0), 0 2px 6px rgba(0,0,0,0.35); } 100% { box-shadow: 0 0 0 0 rgba(10,132,255,0), 0 2px 6px rgba(0,0,0,0.35); } }
`;

function timeAgoShort(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 120) return 'Now';
  const m = Math.round(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  const d = new Date(ts), now = new Date();
  if (sameDay(d, now)) return `${h} hr ago`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  if (diff < 6 * 86400) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function haversine(a, b) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(b[0] - a[0]), dLon = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

Object.assign(CrowMessengerCard.prototype, {

  _hiddenPeople() {
    try { return new Set(JSON.parse(localStorage.getItem('crowMessengerHiddenPeople') || '[]')); } catch (e) { return new Set(); }
  },
  _setHiddenPeople(set) {
    try { localStorage.setItem('crowMessengerHiddenPeople', JSON.stringify([...set])); } catch (e) { /* private mode */ }
  },

  // Everyone with a person.* entity. Names and photos come from your own
  // contact for that Home Assistant user when you have one, like Find My.
  _people() {
    const hass = this._hass, s = this._s;
    const out = [];
    for (const [eid, st] of Object.entries(hass.states)) {
      if (!eid.startsWith('person.')) continue;
      const uid = st.attributes.user_id || null;
      const contact = uid ? this._contactForUser(uid) : null;
      const lat = parseFloat(st.attributes.latitude), lon = parseFloat(st.attributes.longitude);
      const has = Number.isFinite(lat) && Number.isFinite(lon);
      const ts = new Date(st.last_updated || st.last_changed).getTime();
      const stale = !has || ['unknown', 'unavailable'].includes(st.state) || Date.now() - ts > 6 * 3600000;
      out.push({
        eid, uid, me: uid && uid === s.me, contact,
        name: contact ? contactName(contact, this._config.contact_display) : (uid && s.users.get(uid) ? this._userName(uid) : st.attributes.friendly_name || eid),
        pic: contact?.photo || (uid && s.users.get(uid)?.picture) || st.attributes.entity_picture || null,
        lat, lon, has, ts, stale, state: st.state, source: st.attributes.source,
        fav: !!contact?.favourite,
      });
    }
    out.sort((a, b) => (b.fav - a.fav) || a.name.localeCompare(b.name));
    return out;
  },

  _placeLabel(p) {
    const st = p.state;
    if (st === 'home') return 'Home';
    if (st && !['not_home', 'unknown', 'unavailable'].includes(st)) {
      const z = Object.values(this._hass.states).find(z => z.entity_id.startsWith('zone.') && (z.attributes.friendly_name || '').toLowerCase() === st.toLowerCase());
      return z?.attributes.friendly_name || st.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
    }
    const addr = this._geocoded(p);
    if (addr) return addr.split(/\n|,/)[0].trim();
    return p.has ? 'Away' : 'No location';
  },

  // The Companion app's "Geocoded Location" sensor on the same phone gives a
  // street address without any outside lookup.
  _geocoded(p) {
    const ents = this._hass.entities || {};
    const dev = p.source && ents[p.source]?.device_id;
    if (!dev) return null;
    for (const e of Object.values(ents)) {
      if (e.device_id === dev && e.entity_id.startsWith('sensor.') && /geocoded_location$/.test(e.entity_id)) {
        const v = this._hass.states[e.entity_id]?.state;
        if (v && !['unknown', 'unavailable'].includes(v)) return v;
      }
    }
    return null;
  },
  _battery(p) {
    const tr = p.source && this._hass.states[p.source];
    const b = tr?.attributes?.battery_level ?? tr?.attributes?.battery;
    if (b != null) return Math.round(b);
    const ents = this._hass.entities || {};
    const dev = p.source && ents[p.source]?.device_id;
    if (!dev) return null;
    for (const e of Object.values(ents)) {
      if (e.device_id === dev && /battery_level$/.test(e.entity_id)) {
        const v = parseFloat(this._hass.states[e.entity_id]?.state);
        if (Number.isFinite(v)) return Math.round(v);
      }
    }
    return null;
  },
  _distance(p, me) {
    if (!p.has || !me?.has || p.me) return '';
    const m = haversine([me.lat, me.lon], [p.lat, p.lon]);
    if (m < 200 || (p.state === 'home' && me.state === 'home')) return 'Nearby';
    const miles = this._hass.config?.unit_system?.length === 'mi';
    if (miles) { const mi = m / 1609.34; return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`; }
    const km = m / 1000;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  },

  _pg_people({ focus } = {}) {
    const el = this._el(`<div>
      <style>${FM_CSS}</style>
      <div class="fm-map"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div></div></div>
      <div class="fm-ctrls">
        <div class="fm-vcap g"><button data-a="maptype" aria-label="Map style">${FM_ICON.map}</button><button data-a="locate" aria-label="Show me">${FM_ICON.locate}</button></div>
        <button class="fm-3d g" data-a="3d" aria-label="3D">3D</button>
      </div>
      <div class="fm-sheet"><div class="fm-grab"></div><div class="fm-head"><h2>People</h2><button class="cb g" data-a="add" aria-label="Choose people">${ICON.plus}</button></div><div class="fm-list"></div></div>
    </div>`);
    const page = { el };
    const s = this._s;
    const mapEl = el.querySelector('.fm-map'), sheet = el.querySelector('.fm-sheet'), list = el.querySelector('.fm-list'), head = el.querySelector('.fm-head');
    let map = null, markers = new Map(), meMarker = null, selected = focus || null, mapType = 'auto', threeD = false, fitted = false;
    // a zone being made: { lat, lon, r, bearing, name, intro, back } and its two map handles
    let draft = null;
    const canZone = () => this._zoneCan();
    try { mapType = localStorage.getItem('crowMessengerMapType') || 'auto'; } catch (e) { /* */ }

    // ── bottom sheet: collapsed / half / full ──
    // Half height shows two whole people with the third peeking out, like Find My.
    const heights = () => {
      const H = el.clientHeight || 600;
      const top = (el.querySelector('.fm-grab')?.offsetHeight || 5) + 8 + (head.offsetHeight || 64);
      const rowH = list.querySelector('.fm-row')?.offsetHeight || 72;
      const rows = list.querySelectorAll('.fm-row').length;
      const form = list.querySelector('.fm-zf');
      const half = form ? top + form.offsetHeight + 24
        : rows ? top + rowH * Math.min(rows, 2.45) + (rows <= 2 ? 16 : 0) : Math.round(H * 0.4);
      return { min: top + 8, half: Math.min(Math.round(half), H - 72), full: H - 72 };
    };
    let snap = 'half';
    const setSheet = (name) => { snap = name; sheet.style.height = `${heights()[name]}px`; };
    let drag = null;
    const onDown = (e) => {
      if (e.target.closest('button, input') || (e.target.closest('.fm-list') && list.scrollTop > 0)) return;
      if (e.target.closest('.fm-list') && snap === 'full') return;
      drag = { y: e.clientY, h: sheet.offsetHeight, moved: false };
      sheet.classList.add('dragging');
    };
    sheet.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', page._pm = (e) => {
      if (!drag) return;
      const dy = drag.y - e.clientY;
      if (Math.abs(dy) > 6) drag.moved = true;
      const hs = heights();
      sheet.style.height = `${clamp(drag.h + dy, hs.min, hs.full)}px`;
    });
    window.addEventListener('pointerup', page._pu = () => {
      if (!drag) return;
      sheet.classList.remove('dragging');
      const h = sheet.offsetHeight, hs = heights();
      const moved = drag.moved;
      drag = null;
      if (!moved) return;
      const best = Object.entries(hs).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0];
      setSheet(best);
    });
    el.querySelector('.fm-grab').addEventListener('click', () => setSheet(snap === 'half' ? 'full' : snap === 'full' ? 'min' : 'half'));

    const visible = () => { const hid = this._hiddenPeople(); return this._people().filter(p => !hid.has(p.eid)); };
    const meP = () => this._people().find(p => p.me);

    // ── list / detail ──
    const badge = (p) => p.stale ? `<span class="fm-badge off">${FM_ICON.noLoc}</span>` : p.fav ? `<span class="fm-badge star">${ICON.starFill}</span>` : '';
    const renderList = () => {
      if (draft) { renderZone(); return; }
      const me = meP();
      const ppl = visible().filter(p => !p.me);
      if (selected) {
        const p = this._people().find(x => x.eid === selected);
        if (p) { renderDetail(p, me); return; }
        selected = null;
      }
      head.querySelector('h2').textContent = 'People';
      head.querySelector('[data-a]').dataset.a = 'add';
      head.querySelector('[data-a]').innerHTML = ICON.plus;
      this._set(list, ppl.length ? ppl.map(p => `<div class="fm-row" data-eid="${esc(p.eid)}">
          <div class="fm-avw">${this._avHtml({ pic: p.pic, name: p.name, size: 52 })}${badge(p)}</div>
          <div style="min-width:0"><div class="fm-n">${esc(p.name)}</div><div class="fm-s">${esc(this._placeLabel(p))}${p.has ? ` · ${esc(timeAgoShort(p.ts))}` : ''}</div></div>
          <div class="fm-d">${esc(this._distance(p, me))}</div></div>`).join('')
        : `<div class="empty" style="padding:24px 30px">No one to show yet. People appear here when their Home Assistant person has a location — usually from the Companion app on their phone.</div>`);
    };
    const renderDetail = (p, me) => {
      head.querySelector('h2').textContent = '';
      head.querySelector('[data-a]').dataset.a = 'closedetail';
      head.querySelector('[data-a]').innerHTML = ICON.x;
      const batt = this._battery(p);
      const addr = this._geocoded(p);
      const canMsg = p.uid && !p.me && s.users.has(p.uid);
      this._set(list, `<div class="fm-detail">
        <div style="display:flex;align-items:center;gap:14px"><div class="fm-avw">${this._avHtml({ pic: p.pic, name: p.name, size: 60 })}${badge(p)}</div>
          <div style="min-width:0"><div class="fm-dn">${esc(p.name)}</div><div class="fm-ds">${esc(this._placeLabel(p))}${p.has ? ` · ${esc(timeAgoShort(p.ts))}` : ''}${this._distance(p, me) ? ` · ${esc(this._distance(p, me))}` : ''}</div></div></div>
        <div class="fm-acts${canZone() ? ' four' : ''}">
          <button data-fa="message" ${canMsg ? '' : 'disabled'}>${ICON.bubble}<span>Message</span></button>
          <button data-fa="directions" ${p.has && !p.me ? '' : 'disabled'}>${ICON.pin}<span>Directions</span></button>
          <button data-fa="contact" ${p.contact ? '' : 'disabled'}>${ICON.contacts}<span>Contact</span></button>
          ${canZone() ? `<button data-fa="zone" ${p.has ? '' : 'disabled'}>${FM_ICON.zone}<span>Add Zone</span></button>` : ''}
        </div>
        <div class="fm-info">
          ${addr ? `<div class="fi2"><span>Address</span><b style="font-weight:500;text-align:right">${esc(addr.replace(/\n/g, ', '))}</b></div>` : ''}
          <div class="fi2"><span>Updated</span><b style="font-weight:500">${p.has ? esc(new Date(p.ts).toLocaleString(locale(this._hass), { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: hour12(this._hass) })) : '—'}</b></div>
          ${batt != null ? `<div class="fi2"><span>Battery</span><b style="font-weight:500">${batt}%</b></div>` : ''}
        </div></div>`);
    };

    // ── New Zone: a name, a radius you can
    // type or drag on the map, then Create Zone adds it to Home Assistant ──
    let ed = null;   // the zone editor, once the map is up
    const renderZone = () => {
      head.querySelector('h2').textContent = 'New Zone';
      head.querySelector('[data-a]').dataset.a = 'closezone';
      head.querySelector('[data-a]').innerHTML = ICON.x;
      if (list.querySelector('.fm-zf')) return;   // keep what's being typed when people move
      this._set(list, this._zoneFormHtml(draft.intro));
      this._fillZoneForm(list, draft);
    };
    const openZone = (lat, lon, { intro, name = '', back = null } = {}) => {
      if (!this._zoneCan() || !ed) return;
      if (draft) { ed.move(lat, lon); return; }
      draft = ed.start(lat, lon, { name, back, intro: this._zoneIntro(intro) });
      renderList();
      requestAnimationFrame(() => {
        setSheet('half');
        map?.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 17.5), padding: { bottom: heights().half, top: 60 }, duration: 900 });
      });
    };
    const closeZone = () => {
      if (!draft) return;
      selected = draft.back;
      draft = null;
      ed?.stop();
      renderList();
      setSheet('half');
    };
    this._wireZoneForm(list, () => ed, () => closeZone());

    list.addEventListener('click', (e) => {
      if (e.target.closest('[data-za]')) return;
      const row = e.target.closest('.fm-row');
      if (row) { select(row.dataset.eid); return; }
      const fa = e.target.closest('[data-fa]')?.dataset.fa;
      const p = this._people().find(x => x.eid === selected);
      if (!fa || !p) return;
      if (fa === 'message') this._messageUser(p.uid);
      if (fa === 'contact' && p.contact) this._nav('contact', { cid: p.contact.id });
      if (fa === 'directions') this._confirmMapsTo(p);
      if (fa === 'zone' && p.has) {
        const zoned = !['not_home', 'unknown', 'unavailable'].includes(p.state);
        const who = p.me ? 'You’re' : `${p.name} is`;
        openZone(p.lat, p.lon, {
          back: p.eid,
          name: zoned ? '' : (this._geocoded(p) || '').split(/\n|,/)[0].trim(),
          intro: zoned ? `${who} in ${this._placeLabel(p)}. This makes another zone at this exact spot.` : `${who} here, and it isn’t a zone yet.`,
        });
      }
    });

    const select = (eid) => {
      if (draft) return;
      selected = eid;
      renderList();
      if (snap === 'min') setSheet('half');
      const p = this._people().find(x => x.eid === eid);
      markers.forEach((m, id) => m.getElement().classList.toggle('sel', id === eid));
      if (map && p?.has) map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 15.5), padding: { bottom: heights()[snap] }, duration: 900 });
    };

    // ── map ──
    const styleFor = () => {
      const t = mapType === 'auto' ? (this._isDark() ? 'dark' : 'light') : mapType;
      return FM_TILES[t] || FM_TILES.dark;
    };
    const add3D = () => {
      if (!map || !threeD || map.getLayer('fm-3d')) return;
      const src = Object.keys(map.getStyle().sources || {}).find(k => map.getSource(k)?.type === 'vector');
      if (!src) return;
      try {
        map.addLayer({ id: 'fm-3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 14,
          paint: { 'fill-extrusion-color': this._isDark() ? '#3a4150' : '#d9d9de', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.85 } });
      } catch (e) { /* style without buildings */ }
    };
    const fitAll = (animate = true) => {
      if (!map) return;
      const pts = visible().filter(p => p.has);
      if (!pts.length) return;
      const pad = { top: 90, left: 50, right: 80, bottom: heights()[snap] + 30 };
      if (pts.length === 1) { map.jumpTo({ center: [pts[0].lon, pts[0].lat], zoom: 15, padding: pad }); return; }
      const lons = pts.map(p => p.lon), lats = pts.map(p => p.lat);
      map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: pad, maxZoom: 16, duration: animate ? 800 : 0 });
    };
    const updateMarkers = () => {
      if (!map) return;
      const ppl = visible();
      const seen = new Set();
      for (const p of ppl) {
        if (!p.has) continue;
        if (p.me) {
          if (!meMarker) { const d = document.createElement('div'); d.className = 'fm-me'; meMarker = new window.maplibregl.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(map); }
          else meMarker.setLngLat([p.lon, p.lat]);
          continue;
        }
        seen.add(p.eid);
        let m = markers.get(p.eid);
        const html = this._avHtml({ pic: p.pic, name: p.name, size: 48 });
        if (!m) {
          const d = document.createElement('div');
          d.className = 'fm-mk';
          d.addEventListener('click', (ev) => { ev.stopPropagation(); select(p.eid); });
          m = new window.maplibregl.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(map);
          markers.set(p.eid, m);
        }
        const d = m.getElement();
        if (d.dataset.html !== html) { d.innerHTML = html; d.dataset.html = html; }
        d.classList.toggle('stale', p.stale);
        d.classList.toggle('sel', p.eid === selected);
        m.setLngLat([p.lon, p.lat]);
      }
      for (const [eid, m] of markers) if (!seen.has(eid)) { m.remove(); markers.delete(eid); }
      if (meMarker && !ppl.some(p => p.me && p.has)) { meMarker.remove(); meMarker = null; }
    };
    const initMap = async () => {
      try {
        const lib = await this._mapLib();
        if (!el.isConnected) return;
        const first = visible().find(p => p.has);
        map = new lib.Map({ container: mapEl, style: styleFor(), center: first ? [first.lon, first.lat] : [-0.12, 51.5], zoom: first ? 14 : 5,
          attributionControl: { compact: true }, pitchWithRotate: true, dragRotate: true });
        ed = this._zoneEditor(map, el, list);
        map.on('load', () => {
          add3D(); ed.addLayers(); updateMarkers();
          if (!fitted) { fitted = true; map.resize(); if (selected) select(selected); else fitAll(false); }
        });
        map.on('styledata', () => { add3D(); ed.addLayers(); });
        map.on('click', (e) => {
          // while making a zone, a tap moves it there
          if (draft) { ed.move(e.lngLat.lat, e.lngLat.lng); return; }
          if (selected) { selected = null; renderList(); markers.forEach(m => m.getElement().classList.remove('sel')); }
        });
        // press and hold anywhere on the map (or right-click) to make a zone there
        let lp = null;
        const lpCancel = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
        map.on('touchstart', (e) => {
          lpCancel();
          if (draft || !canZone() || e.originalEvent.touches.length !== 1) return;
          const pt = e.point, ll = e.lngLat;
          lp = { pt, t: setTimeout(() => { lp = null; try { navigator.vibrate?.(12); } catch (err) { /* */ } openZone(ll.lat, ll.lng, { back: selected }); }, 550) };
        });
        map.on('touchmove', (e) => { if (lp && (Math.abs(e.point.x - lp.pt.x) > 8 || Math.abs(e.point.y - lp.pt.y) > 8 || e.originalEvent.touches.length !== 1)) lpCancel(); });
        map.on('touchend', lpCancel);
        map.on('touchcancel', lpCancel);
        map.on('contextmenu', (e) => { if (!draft && !lp && canZone()) openZone(e.lngLat.lat, e.lngLat.lng, { back: selected }); });
        page._styleKey = JSON.stringify(styleFor()) + this._isDark();
      } catch (err) {
        mapEl.innerHTML = `<div class="fm-nomap">The map couldn’t load here.<br>People and their places are listed below.</div>`;
      }
    };

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'closedetail') { selected = null; renderList(); markers.forEach(m => m.getElement().classList.remove('sel')); return; }
      if (a === 'closezone') { closeZone(); return; }
      if (a === 'locate') {
        const me = meP();
        if (map && me?.has) map.flyTo({ center: [me.lon, me.lat], zoom: 15.5, padding: { bottom: heights()[snap] } });
        else fitAll();
        return;
      }
      if (a === '3d') {
        threeD = !threeD;
        e.target.closest('button').classList.toggle('on', threeD);
        if (!map) return;
        if (threeD) { add3D(); map.easeTo({ pitch: 60, zoom: Math.max(map.getZoom(), 16), duration: 900 }); }
        else { if (map.getLayer('fm-3d')) map.removeLayer('fm-3d'); map.easeTo({ pitch: 0, bearing: 0, duration: 700 }); }
        return;
      }
      if (a === 'maptype') {
        const v = await this._menu(e.target.closest('button'), [
          { header: 'Map' },
          { text: 'Automatic', value: 'auto', checked: mapType === 'auto' },
          { text: 'Light', value: 'light', checked: mapType === 'light' },
          { text: 'Dark', value: 'dark', checked: mapType === 'dark' },
          { text: 'Satellite', value: 'satellite', checked: mapType === 'satellite' },
        ]);
        if (v && v !== mapType) {
          mapType = v;
          try { localStorage.setItem('crowMessengerMapType', v); } catch (err) { /* */ }
          if (map) { map.setStyle(styleFor()); page._styleKey = JSON.stringify(styleFor()) + this._isDark(); }
        }
        return;
      }
      if (a === 'add') {
        const hid = this._hiddenPeople();
        const v = await this._menu(e.target.closest('button'), [{ header: 'Show on the map' }, ...this._people().filter(p => !p.me).map(p => ({ text: p.name, value: p.eid, checked: !hid.has(p.eid) }))]);
        if (v) { hid.has(v) ? hid.delete(v) : hid.add(v); this._setHiddenPeople(hid); renderList(); updateMarkers(); }
      }
    });

    let lastSig = '';
    page.refresh = (what) => {
      if (!['all', 'contacts', 'states', 'users'].includes(what)) return;
      ed?.refresh();
      const sig =this._people().map(p => `${p.eid}|${p.lat}|${p.lon}|${p.state}|${p.ts}|${p.name}|${p.fav}`).join(';');
      if (what === 'states' && sig === lastSig) return;
      lastSig = sig;
      renderList();
      updateMarkers();
      if (!drag && snap === 'half' && !selected) sheet.style.height = `${heights().half}px`;
      const key = JSON.stringify(styleFor()) + this._isDark();
      if (map && page._styleKey && key !== page._styleKey) { page._styleKey = key; map.setStyle(styleFor()); }
    };
    page.onShow = () => {
      requestAnimationFrame(() => { setSheet(snap); if (!map) initMap(); else map.resize(); });
    };
    page.destroy = () => {
      window.removeEventListener('pointermove', page._pm);
      window.removeEventListener('pointerup', page._pu);
      try { map?.remove(); } catch (e) { /* */ }
    };
    return page;
  },

  // ── Zones: made from the People map, Check In, Send Later, a shared location or
  // a Check In's last location. All of them use the editor below. ──────────────

  // Whether you may add zones. The integration lets everyone unless an admin has turned
  // "Everyone Can Add Zones" off; an older integration only lets admins.
  _zoneCan() {
    const f = this._s?.features?.zones;
    return f === undefined ? !!this._hass?.user?.is_admin : !!f;
  },

  // MapLibre, with its stylesheet in the card (once)
  async _mapLib() {
    const [lib, css] = await Promise.all([loadMapLibre(), mapLibreCss()]);
    if (css && !this.shadowRoot.getElementById('fm-maplibre-css')) {
      const st = document.createElement('style'); st.id = 'fm-maplibre-css'; st.textContent = css;
      this.shadowRoot.insertBefore(st, this.shadowRoot.firstChild);
    }
    return lib;
  },

  _zoneIntro(intro) { return `${intro ? intro + ' ' : ''}Drag the handle to resize it, or the dot to move it.`; },

  _zoneFormHtml(intro) {
    return `<div class="fm-zf">
      <div class="fm-zs">${esc(intro || '')}</div>
      <div class="fm-zg">
        <label><span>Name</span><input data-z="name" type="text" placeholder="Zone name" autocomplete="off" enterkeyhint="done"></label>
        <label><span>Radius</span><input data-z="r" type="number" inputmode="numeric" min="${FM_ZONE_MIN}" max="${FM_ZONE_MAX}" step="10"><span class="fm-zu">m</span></label>
      </div>
      <button type="button" class="fm-zb" data-za="create">Create Zone</button></div>`;
  },
  _fillZoneForm(box, d) {
    const n = box.querySelector('[data-z="name"]'), r = box.querySelector('[data-z="r"]');
    if (n) n.value = d.name || '';
    if (r) r.value = d.r;
  },

  // Draws Home Assistant's zones on a MapLibre map, and the zone being made: a circle with
  // a dot to move it and a handle on its edge to resize it, like Home Assistant's own.
  _zoneEditor(map, host, box) {
    let zC = null, zH = null, sig = '';
    const states = () => Object.values(this._hass.states).filter(z => z.entity_id.startsWith('zone.'));
    const data = () => ({ type: 'FeatureCollection', features: states()
      .filter(z => !z.attributes.passive && Number.isFinite(+z.attributes.latitude) && Number.isFinite(+z.attributes.longitude))
      .map(z => fmCircle(+z.attributes.latitude, +z.attributes.longitude, +z.attributes.radius || 100, { home: z.entity_id === 'zone.home' })) });
    const zsig = () => states().map(z => `${z.entity_id}|${z.attributes.latitude}|${z.attributes.longitude}|${z.attributes.radius}|${z.attributes.passive}`).join(';');
    const accent = () => getComputedStyle(host).getPropertyValue('--cm-accent').trim() || '#007AFF';
    const ed = {
      draft: null,
      // added again after a change of map style, which clears them
      addLayers() {
        try {
          if (!map.getSource('fm-zones')) {
            sig = zsig();
            map.addSource('fm-zones', { type: 'geojson', data: data() });
            const col = ['case', ['get', 'home'], '#34C759', '#5AC8FA'];
            map.addLayer({ id: 'fm-zones-fill', type: 'fill', source: 'fm-zones', paint: { 'fill-color': col, 'fill-opacity': 0.14 } });
            map.addLayer({ id: 'fm-zones-line', type: 'line', source: 'fm-zones', paint: { 'line-color': col, 'line-width': 1.5, 'line-opacity': 0.75 } });
          }
          if (!map.getSource('fm-draft')) {
            const ac = accent(), d = ed.draft;
            map.addSource('fm-draft', { type: 'geojson', data: d ? fmCircle(d.lat, d.lon, d.r) : FM_EMPTY });
            map.addLayer({ id: 'fm-draft-fill', type: 'fill', source: 'fm-draft', paint: { 'fill-color': ac, 'fill-opacity': 0.2 } });
            map.addLayer({ id: 'fm-draft-line', type: 'line', source: 'fm-draft', paint: { 'line-color': ac, 'line-width': 2.5 } });
          }
        } catch (e) { /* the style is still loading — styledata calls this again */ }
      },
      // a zone added or changed elsewhere
      refresh() {
        const z = zsig();
        if (z !== sig && map.getSource('fm-zones')) { sig = z; map.getSource('fm-zones').setData(data()); }
      },
      draw() {
        const d = ed.draft;
        map.getSource('fm-draft')?.setData(d ? fmCircle(d.lat, d.lon, d.r) : FM_EMPTY);
        if (!d) return;
        zC?.setLngLat([d.lon, d.lat]);
        const [hl, hn] = fmDest(d.lat, d.lon, d.bearing, d.r);
        zH?.setLngLat([hn, hl]);
      },
      start(lat, lon, extra = {}) {
        ed.draft = { lat, lon, r: FM_ZONE_DEFAULT, bearing: 90, name: '', ...extra };
        if (!zC && window.maplibregl) {
          const mk = (cls) => { const d = document.createElement('div'); d.className = cls; d.addEventListener('click', ev => ev.stopPropagation()); return d; };
          zC = new window.maplibregl.Marker({ element: mk('fm-zc'), draggable: true }).setLngLat([lon, lat]).addTo(map);
          zH = new window.maplibregl.Marker({ element: mk('fm-zh'), draggable: true }).setLngLat([lon, lat]).addTo(map);
          zC.on('drag', () => { const ll = zC.getLngLat(); ed.draft.lat = ll.lat; ed.draft.lon = ll.lng; ed.draw(); });
          zH.on('drag', () => {
            const d = ed.draft, ll = zH.getLngLat();
            d.r = clamp(Math.round(haversine([d.lat, d.lon], [ll.lat, ll.lng])), FM_ZONE_MIN, FM_ZONE_MAX);
            d.bearing = fmBearing(d.lat, d.lon, ll.lat, ll.lng);
            map.getSource('fm-draft')?.setData(fmCircle(d.lat, d.lon, d.r));
            const ri = box?.querySelector('[data-z="r"]'); if (ri) ri.value = d.r;
          });
          zH.on('dragend', () => ed.draw());   // back onto the edge if dragged past the limits
        }
        ed.addLayers();
        ed.draw();
        return ed.draft;
      },
      move(lat, lon) { if (ed.draft) { ed.draft.lat = lat; ed.draft.lon = lon; ed.draw(); } },
      setR(r) { if (ed.draft) { ed.draft.r = clamp(r, FM_ZONE_MIN, FM_ZONE_MAX); ed.draw(); } },
      // zoom so the whole circle shows above the sheet (after a radius is typed)
      fit() {
        const d = ed.draft;
        if (!d) return;
        const n = fmDest(d.lat, d.lon, 0, d.r)[0], so = fmDest(d.lat, d.lon, 180, d.r)[0];
        const e = fmDest(d.lat, d.lon, 90, d.r)[1], w = fmDest(d.lat, d.lon, 270, d.r)[1];
        const sheet = host.querySelector('.fm-sheet');
        // the padding from earlier flyTo/jumpTo calls sticks, and would be added to this
        try { map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); map.fitBounds([[w, so], [e, n]], { padding: { top: 80, left: 50, right: 50, bottom: (sheet?.offsetHeight || 0) + 30 }, maxZoom: 18.5, duration: 600 }); } catch (err) { /* too small a map */ }
      },
      stop() { ed.draft = null; zC?.remove(); zH?.remove(); zC = zH = null; ed.draw(); },
    };
    return ed;
  },

  // The Name and Radius fields and Create Zone, kept in step with the editor on the map.
  // getEd is a function, as the map (and so the editor) may arrive after the form.
  _wireZoneForm(box, getEd, onCreated) {
    const d = () => getEd()?.draft;
    box.addEventListener('input', (e) => {
      const z = e.target.dataset?.z;
      if (!d() || !z) return;
      if (z === 'name') d().name = e.target.value;
      if (z === 'r') { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) getEd().setR(v); }
    });
    box.addEventListener('change', (e) => { if (d() && e.target.dataset?.z === 'r') { e.target.value = d().r; getEd()?.fit?.(); } });
    box.addEventListener('keydown', (e) => { if (d() && e.key === 'Enter' && e.target.dataset?.z) { e.preventDefault(); e.target.blur(); } });
    box.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-za="create"]');
      if (!btn || !d() || btn.disabled) return;
      // what the fields say now (the map may have arrived after some typing)
      d().name = box.querySelector('[data-z="name"]')?.value || '';
      const rv = parseInt(box.querySelector('[data-z="r"]')?.value, 10);
      if (Number.isFinite(rv)) d().r = clamp(rv, FM_ZONE_MIN, FM_ZONE_MAX);
      const z = await this._createZone(d(), btn, box.querySelector('[data-z="name"]'));
      if (z) onCreated(z);
    });
  },

  // Adds the zone through the integration, which checks you're allowed. Answers with the
  // zone ({ entity_id, name, lat, lon }) once Home Assistant has it, or null.
  async _createZone(d, btn, nameIn) {
    const name = (d.name || '').trim();
    if (!name) { this._toast('Enter a name for the zone first'); nameIn?.focus(); return null; }
    const clash = (z) => z.entity_id.startsWith('zone.') && (z.attributes.friendly_name || '').toLowerCase() === name.toLowerCase();
    if (Object.values(this._hass.states).some(clash)) { this._toast(`There’s already a zone called “${name}”`); nameIn?.focus(); return null; }
    d.r = clamp(Math.round(d.r) || FM_ZONE_DEFAULT, FM_ZONE_MIN, FM_ZONE_MAX);
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      const r = await this._ws('zone_create', { name, latitude: +d.lat.toFixed(6), longitude: +d.lon.toFixed(6), radius: d.r });
      const zone = r.zone || { name, lat: d.lat, lon: d.lon };
      // wait (briefly) for the new zone to reach this browser, so lists and the map include it
      for (let i = 0; i < 20; i++) {
        const st = zone.entity_id ? this._hass.states[zone.entity_id] : Object.values(this._hass.states).find(clash);
        if (st) { zone.entity_id = st.entity_id; break; }
        await new Promise(res => setTimeout(res, 150));
      }
      this._toast(`Zone “${name}” created`);
      return zone;
    } catch (err) {
      console.warn('[crow-messenger] zone_create failed:', err);
      this._toast(err?.code === 'unknown_command' ? 'Update the Crow Messenger integration to add zones from here'
        : err?.message ? `Couldn’t create the zone: ${err.message}` : 'Couldn’t create the zone');
      if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'Create Zone'; }
      return null;
    }
  },

  // Where a new zone starts when nothing else says: where you are, else Home
  _zoneStart() {
    const me = this._people?.().find(p => p.me && p.has);
    if (me) return { lat: me.lat, lon: me.lon, here: true };
    const home = this._hass.states['zone.home']?.attributes;
    if (home?.latitude != null) return { lat: +home.latitude, lon: +home.longitude };
    return { lat: +this._hass.config?.latitude || 51.5, lon: +this._hass.config?.longitude || -0.12 };
  },

  // A full-screen map for making a zone from anywhere (over a sheet, if one is open).
  // Answers with the new zone, or null if it was cancelled.
  _newZone({ lat, lon, name = '', intro } = {}) {
    if (!this._zoneCan()) { this._toast('Only a Home Assistant administrator can add zones'); return Promise.resolve(null); }
    if (lat == null || lon == null) {
      const st = this._zoneStart();
      ({ lat, lon } = st);
      if (intro === undefined) intro = st.here ? 'It starts where you are now.' : '';
    }
    return new Promise((resolve) => {
      const wrap = this._el(`<div class="fm-zwrap"><style>${FM_CSS}</style>
        <div class="fm-map"></div>
        <div class="top"><button class="cb g" data-a="cancel" aria-label="Cancel">${ICON.x}</button><div></div></div>
        <div class="fm-ctrls"><div class="fm-vcap g"><button data-a="locate" aria-label="Show me">${FM_ICON.locate}</button></div></div>
        <div class="fm-sheet"><div class="fm-grab"></div><div class="fm-head"><h2>New Zone</h2></div>
          <div class="fm-list">${this._zoneFormHtml(this._zoneIntro(intro))}</div></div></div>`);
      this._root.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('show'));
      const box = wrap.querySelector('.fm-list'), sheet = wrap.querySelector('.fm-sheet'), head = wrap.querySelector('.fm-head');
      const draft = { lat, lon, r: FM_ZONE_DEFAULT, bearing: 90, name };
      this._fillZoneForm(box, draft);
      const sheetH = () => (wrap.querySelector('.fm-grab').offsetHeight + 8 + head.offsetHeight + box.querySelector('.fm-zf').offsetHeight + 24);
      requestAnimationFrame(() => { sheet.style.height = `${sheetH()}px`; });
      let map = null, ed = null, finished = false;
      const done = (z) => {
        if (finished) return;
        finished = true;
        wrap.classList.remove('show');
        setTimeout(() => { try { map?.remove(); } catch (e) { /* */ } wrap.remove(); }, 300);
        resolve(z);
      };
      this._wireZoneForm(box, () => ed, done);
      wrap.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'cancel') done(null);
        if (a === 'locate' && map) {
          const me = this._people().find(p => p.me && p.has);
          if (me) { ed?.move?.(me.lat, me.lon); map.flyTo({ center: [me.lon, me.lat], zoom: Math.max(map.getZoom(), 17), padding: { bottom: sheet.offsetHeight, top: 60 } }); }
          else this._toast('Your location isn’t known');
        }
      });
      (async () => {
        try {
          const lib = await this._mapLib();
          if (finished) return;
          let type = 'auto';
          try { type = localStorage.getItem('crowMessengerMapType') || 'auto'; } catch (e) { /* */ }
          const style = FM_TILES[type === 'auto' ? (this._isDark() ? 'dark' : 'light') : type] || FM_TILES.dark;
          map = new lib.Map({ container: wrap.querySelector('.fm-map'), style, center: [lon, lat], zoom: 17,
            attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false });
          ed = this._zoneEditor(map, wrap, box);
          ed.draft = draft;   // the fields write to it until the map is ready
          map.on('load', () => {
            map.resize();
            ed.start(ed.draft.lat, ed.draft.lon, ed.draft);
            map.jumpTo({ center: [lon, lat], zoom: 17, padding: { bottom: sheet.offsetHeight, top: 60 } });
          });
          map.on('styledata', () => ed.addLayers());
          map.on('click', (e) => ed.move(e.lngLat.lat, e.lngLat.lng));
        } catch (err) {
          wrap.querySelector('.fm-map').innerHTML = `<div class="fm-nomap">The map couldn’t load here.<br>The zone will be made at the place shown.</div>`;
          ed = { draft, setR: (r) => { draft.r = clamp(r, FM_ZONE_MIN, FM_ZONE_MAX); } };
        }
      })();
    });
  },

  async _confirmMapsTo(p) {
    const q = `${p.lat},${p.lon}`;
    const url = isApple() ? `https://maps.apple.com/?daddr=${q}` : isAndroid() ? `geo:${q}?q=${q}(${encodeURIComponent(p.name)})` : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    await this._alert({ title: `Get Directions to ${p.name}?`, message: `${this._placeLabel(p)} · ${timeAgoShort(p.ts)}`, buttons: [{ text: 'Open in Maps', style: 'ok', value: true, href: url }, { text: 'Cancel', style: 'cancel' }] });
  },
});

// ── Live Wallpaper ───────────────────────────────────────────────────────────
// Animated chat backgrounds: Rain on Glass, Ambient Aurora, Lava Lamp,
// Night Sky, Fireplace, Ocean and more. Each
// wallpaper runs inside the element it's given, and stops when that element
// leaves the page or stop() is called.
const CM_LIVE = [
  { id: 'rain',   name: 'Rain on Glass',  fn: '_saverRain',      thumb: 'radial-gradient(circle at 30% 30%,#e6a35a55,transparent 40%),radial-gradient(circle at 70% 60%,#4aa3c955,transparent 45%),#141a24' },
  { id: 'aurora', name: 'Ambient Aurora', fn: '_saverAurora',    thumb: 'linear-gradient(160deg,#0b1430,#123a3a 45%,#3a1d5c)' },
  { id: 'lava',   name: 'Lava Lamp',      fn: '_saverLava',      thumb: 'radial-gradient(circle at 40% 70%,#ff5a2a,transparent 45%),#050507' },
  { id: 'night',  name: 'Night Sky',      fn: '_saverNightSky',  thumb: 'linear-gradient(#010208,#0a1230 70%,#141d40)' },
  { id: 'fire',   name: 'Fireplace',      fn: '_saverFireplace', thumb: 'radial-gradient(ellipse at 50% 100%,#ff8a2a,#7a1e05 40%,#060302 75%)' },
  { id: 'ocean',  name: 'Ocean',          fn: '_saverOcean',     thumb: 'linear-gradient(#1b5fb8,#5a9bdc 45%,#3d86c1 55%,#08355f)' },
  { id: 'sky',     name: 'Living Sky',     fn: '_saverSky',      thumb: 'radial-gradient(circle at 30% 70%,#ffd9a0,transparent 30%),linear-gradient(#2a6fd0,#62a6e8 60%,#cfe6f7)' },
  { id: 'snowfall', name: 'Snowfall',      fn: '_saverSnowfall', thumb: 'radial-gradient(circle at 25% 30%,#fff 2px,transparent 3px),radial-gradient(circle at 70% 60%,#fff 2px,transparent 3px),radial-gradient(circle at 45% 80%,#fff 1.5px,transparent 2.5px),linear-gradient(#08142b,#2b4470)' },
  { id: 'fireflies', name: 'Fireflies',    fn: '_saverFireflies', thumb: 'radial-gradient(circle at 30% 55%,#e8ff9a 2px,#c8ff5a55 6px,transparent 9px),radial-gradient(circle at 70% 70%,#e8ff9a 2px,#c8ff5a55 6px,transparent 9px),linear-gradient(#0a1230,#1a2448 55%,#081a12)' },
  { id: 'space',   name: 'Deep Space',     fn: '_saverSpace',    thumb: 'radial-gradient(circle at 35% 40%,#7b3fe488,transparent 45%),radial-gradient(circle at 70% 65%,#1fb5c988,transparent 45%),#02020a' },
  { id: 'fairy',   name: 'Fairy Lights',   fn: '_saverFairy',    thumb: 'radial-gradient(circle at 20% 30%,#FFD9A0 2px,transparent 6px),radial-gradient(circle at 50% 38%,#FFD9A0 2px,transparent 6px),radial-gradient(circle at 80% 30%,#FFD9A0 2px,transparent 6px),linear-gradient(#0d0806,#22150d)' },
  { id: 'liquid',  name: 'Liquid Colour',  fn: '_saverLiquid',   thumb: 'radial-gradient(circle at 30% 30%,#0A84FF,transparent 55%),radial-gradient(circle at 75% 70%,#BF5AF2,transparent 55%),#101018' },
];
const cmLiveInfo = (id) => CM_LIVE.find(l => l.id === id) || null;

const CM_LIVE_CSS = `
.cm-live { overflow: hidden; background: #000; }
.cm-live > .cs-stage { position: absolute; inset: 0; }
.cm-live img { pointer-events: none; }
        .cm-live .cs-stage, .cm-live .cs-stage > * { position: absolute; inset: 0; }
        .cm-live canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .cm-live .cs-aurora { background: radial-gradient(ellipse at 50% 120%, #0b1430 0%, #04060f 70%); overflow: hidden; }
        .cm-live .cs-stars { position: absolute; inset: 0; opacity: 0.55;
          background-image: radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 33% 9%, #fff 50%, transparent 51%),
            radial-gradient(1.4px 1.4px at 58% 22%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 76% 12%, #fff 50%, transparent 51%),
            radial-gradient(1px 1px at 88% 31%, #fff 50%, transparent 51%), radial-gradient(1.2px 1.2px at 22% 40%, #fff 50%, transparent 51%),
            radial-gradient(1px 1px at 47% 36%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 67% 44%, #fff 50%, transparent 51%),
            radial-gradient(1.3px 1.3px at 8% 62%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 93% 58%, #fff 50%, transparent 51%); }
        .cm-live .cs-glow { position: absolute; width: 85%; height: 85%; border-radius: 50%; mix-blend-mode: screen; opacity: 0;
          will-change: transform, opacity; animation: cs-glowmove 26s ease-in-out infinite alternate, cs-glowfade 21s ease-in-out infinite; }
        .cm-live .cs-glow.g0 { left: -20%; top: -15%; background: radial-gradient(circle, rgba(61,255,138,0.85) 0%, transparent 62%); animation-delay: 0s, 0s; }
        .cm-live .cs-glow.g1 { right: -25%; top: -5%; background: radial-gradient(circle, rgba(0,229,192,0.8) 0%, transparent 62%); animation-delay: -6s, -3s; animation-duration: 31s, 23s; }
        .cm-live .cs-glow.g2 { left: 10%; top: 20%; background: radial-gradient(circle, rgba(34,199,255,0.8) 0%, transparent 62%); animation-delay: -11s, -6s; animation-duration: 28s, 19s; }
        .cm-live .cs-glow.g3 { right: -10%; bottom: -25%; background: radial-gradient(circle, rgba(61,107,255,0.85) 0%, transparent 62%); animation-delay: -4s, -9s; animation-duration: 34s, 25s; }
        .cm-live .cs-glow.g4 { left: -25%; bottom: -20%; background: radial-gradient(circle, rgba(155,92,255,0.85) 0%, transparent 62%); animation-delay: -15s, -12s; animation-duration: 29s, 22s; }
        .cm-live .cs-glow.g5 { left: 25%; top: -30%; background: radial-gradient(circle, rgba(255,79,216,0.75) 0%, transparent 62%); animation-delay: -9s, -15s; animation-duration: 33s, 27s; }
        .cm-live .cs-glow.g6 { right: 5%; top: 35%; background: radial-gradient(circle, rgba(255,179,71,0.65) 0%, transparent 62%); animation-delay: -19s, -18s; animation-duration: 37s, 29s; }
        @keyframes cs-glowmove {
          0% { transform: translate(0,0) scale(1); } 33% { transform: translate(18%,10%) scale(1.15); }
          66% { transform: translate(-12%,16%) scale(0.92); } 100% { transform: translate(10%,-14%) scale(1.1); } }
        @keyframes cs-glowfade { 0%, 100% { opacity: 0.08; } 30% { opacity: 0.85; } 55% { opacity: 0.35; } 75% { opacity: 0.75; } }
        .cm-live .cs-curtain { position: absolute; top: -20%; width: 38%; height: 130%; opacity: 0; mix-blend-mode: screen; will-change: transform, opacity;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 35%, #000 65%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0%, #000 35%, #000 65%, transparent 100%);
          animation: cs-sway 19s ease-in-out infinite alternate, cs-curtainfade 15s ease-in-out infinite; }
        .cm-live .cs-curtain.c0 { left: 8%; background: linear-gradient(180deg, transparent 0%, rgba(61,255,138,0.55) 38%, rgba(0,229,192,0.25) 62%, transparent 92%); }
        .cm-live .cs-curtain.c1 { left: 38%; background: linear-gradient(180deg, transparent 0%, rgba(34,199,255,0.5) 34%, rgba(155,92,255,0.28) 64%, transparent 92%); animation-delay: -7s, -5s; animation-duration: 23s, 17s; }
        .cm-live .cs-curtain.c2 { left: 62%; background: linear-gradient(180deg, transparent 0%, rgba(255,79,216,0.42) 36%, rgba(61,107,255,0.25) 64%, transparent 92%); animation-delay: -13s, -10s; animation-duration: 27s, 21s; }
        @keyframes cs-sway { 0% { transform: translateX(-14%) skewX(-16deg); } 50% { transform: translateX(10%) skewX(-6deg); } 100% { transform: translateX(22%) skewX(-20deg); } }
        @keyframes cs-curtainfade { 0%, 100% { opacity: 0; } 35% { opacity: 0.9; } 60% { opacity: 0.45; } 80% { opacity: 0.8; } }
        .cm-live .cs-vignette { background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
        .cm-live .cs-lava { background: #050507; }
        .cm-live .cs-lava canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: auto; }
        .cm-live .cs-rainbg { background: #0d1118; }
        .cm-live .cs-night { background: #02030a; }
        .cm-live .cs-firebg { background: #060302; }
        .cm-live .cs-oceanbg { background: #0c1a3c; }
        .cm-live .cs-rainbg img { position: absolute; inset: -8%; width: 116%; height: 116%; object-fit: cover; filter: blur(16px) saturate(1.1) brightness(0.62); }
@media (prefers-reduced-motion: reduce) { .cm-live .cs-glow, .cm-live .cs-curtain { opacity: 0.55; } }
`;

class CrowLiveWallpaper {
  constructor(host, kind, hass) {
    this._saverEl = host;
    this._hass = hass;
    this._config = {};          // no weather entity: the Ocean follows the sun only
    this.shadowRoot = null;     // no album artwork: the Lava Lamp cycles through colours
    host.classList.add('cm-live');
    this._stage = document.createElement('div');
    this._stage.className = 'cs-stage';
    host.appendChild(this._stage);
    const info = cmLiveInfo(kind) || CM_LIVE[1];
    try { this[info.fn](this._stage); } catch (err) { console.warn('Crow Messenger: live wallpaper', err); }
  }

  set hass(h) { this._hass = h; }

  stop() {
    const host = this._saverEl;
    this._liveOff?.forEach(f => f()); this._liveOff = null;
    this._saverEl = null;
    cancelAnimationFrame(this._saverRaf);
    this._stage?.remove();
    host?.classList.remove('cm-live');
  }

  // Rain on Glass runs down a window in front of soft, out-of-focus lights
  _saverArtList() {
    if (!CrowLiveWallpaper._rainArt) {
      const c = document.createElement('canvas'); c.width = 240; c.height = 400;
      const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, 400);
      bg.addColorStop(0, '#1a2436'); bg.addColorStop(0.55, '#24304a'); bg.addColorStop(1, '#3a2a30');
      g.fillStyle = bg; g.fillRect(0, 0, 240, 400);
      const cols = ['255,176,92', '255,214,150', '96,178,220', '255,110,90', '170,140,255', '120,220,190'];
      let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 46; i++) {
        const x = rnd() * 240, y = 120 + rnd() * 280, r = 8 + rnd() * 34, col = cols[(rnd() * cols.length) | 0];
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${col},${(0.35 + rnd() * 0.45).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      CrowLiveWallpaper._rainArt = c.toDataURL('image/jpeg', 0.85);
    }
    return [{ src: CrowLiveWallpaper._rainArt }];
  }
  _saverArtHues() { return null; }

  _saverAurora(stage) {
    const box = document.createElement('div');
    box.className = 'cs-aurora';
    box.innerHTML = '<div class="cs-stars"></div>'
      + [0, 1, 2, 3, 4, 5, 6].map(i => '<div class="cs-glow g' + i + '"></div>').join('')
      + [0, 1, 2].map(i => '<div class="cs-curtain c' + i + '"></div>').join('');
    const v = document.createElement('div'); v.className = 'cs-vignette';
    stage.appendChild(box); stage.appendChild(v);
  }

  _saverLava(stage) {
    const box = document.createElement('div');
    box.className = 'cs-lava';
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    box.appendChild(cv);
    stage.appendChild(box);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, img = null, px = null;
    // the album colours follow the cover: a skipped track's new cover is picked up and the wax
    // blends across to its colours over a couple of seconds
    let artHues = this._saverArtHues(), artSrc = this.shadowRoot?.getElementById('albumImg')?.src || '', artCheckAt = 0;
    let shown = artHues ? artHues.slice() : null;
    const towards = (from, to, k) => { const d = ((to - from + 540) % 360) - 180; return (from + d * k + 360) % 360; };
    // the blobs, in fractions of the panel: two big pools that sit at the bottom, and floating blobs
    const blobs = [
      { pool: true, x: 0.28, r: 0.17, ph: 0.4, wob: 0.05 },
      { pool: true, x: 0.72, r: 0.15, ph: 2.1, wob: 0.06 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: 0.18 + Math.random() * 0.64, r: 0.05 + Math.random() * 0.055,
        sp: 0.010 + Math.random() * 0.016, ph: Math.random() * Math.PI * 2, wob: 0.03 + Math.random() * 0.06, i,
      })),
    ];
    const hsl = (h, s, l) => {
      const a = s * Math.min(l, 1 - l);
      const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
      return [f(0) * 255, f(8) * 255, f(4) * 255];
    };
    // light from the upper left, for the glossy shading
    const Lx = -0.42, Ly = -0.52, Lz = 0.74;
    const size = () => {
      const el = this._saverEl;
      if (!el) return false;
      const cw = el.offsetWidth, ch = el.offsetHeight;
      if (!cw || !ch) return false;
      // drawn at a bit over half the panel's size and smoothed up: sharp enough, still light on the battery
      const w = Math.max(120, Math.min(el.classList.contains('cs-full') ? 360 : 280, Math.round(cw * 0.6)));
      const h = Math.max(120, Math.round(w * ch / cw));
      if (w === W && h === H) return true;
      W = w; H = h;
      cv.width = W; cv.height = H;
      img = ctx.createImageData(W, H); px = img.data;
      return true;
    };
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now() - Math.random() * 90000;
    let lastDraw = 0;
    const pos = new Float64Array(blobs.length * 4);
    // each blob adds a smooth bump to a field; the wax is wherever the field is over T. Its own reach (R) is
    // a little wider than the blob looks, so neighbours start to merge before they touch.
    const T = 0.18, REACH = 1 / Math.sqrt(1 - Math.cbrt(T));
    const frame = (now) => {
      if (!this._saverEl || !cv.isConnected) return;
      if (!still) this._saverRaf = requestAnimationFrame(frame);
      if (now - lastDraw < 33) return;   // about 30 frames a second is plenty
      lastDraw = now;
      if (!size()) return;
      const t = (now - t0) / 1000;
      // the last song's album colours, drifting gently around them (or every colour in turn, for a cover
      // with no real colour in it), always bright enough for the wax to glow
      if (now - artCheckAt > 1000) {
        artCheckAt = now;
        const im = this.shadowRoot?.getElementById('albumImg');
        if (im && im.src !== artSrc && im.complete && im.naturalWidth) {
          artSrc = im.src;
          artHues = this._saverArtHues();
          // from colour cycling to album colours (or back), start from the colour on screen now
          if (artHues && !shown) shown = [(t * 3) % 360, ((t * 3) + 28) % 360];
        }
      }
      let hue, hue2;
      if (artHues) {
        const k = 0.04;   // per frame (about 30 a second): most of the way there in two seconds
        shown[0] = towards(shown[0], artHues[0], k);
        shown[1] = towards(shown[1] ?? shown[0], artHues[1] ?? (artHues[0] + 28), k);
        const sway = Math.sin(t * 0.045);
        hue = (shown[0] + 16 * sway + 360) % 360;
        hue2 = (shown[1] + 12 * Math.sin(t * 0.037 + 1) + 360) % 360;
      } else { hue = (t * 3) % 360; hue2 = (hue + 28) % 360; shown = null; }
      // the wax is one colour family (lighter in the middle), on a plain dark background
      const rim = hsl(hue, 0.9, 0.26), mid = hsl((hue + 10) % 360, 0.9, 0.48), core = hsl((hue + 24) % 360, 0.95, 0.66);
      let rAvg = 0;
      blobs.forEach((b, k) => {
        let x, y, r;
        if (b.pool) {
          // the pools bulge and settle at the bottom, as if warmed by the bulb
          x = b.x + b.wob * Math.sin(t * 0.13 + b.ph);
          y = 1.04 - 0.05 * (0.5 + 0.5 * Math.sin(t * 0.21 + b.ph * 3));
          r = b.r * (1 + 0.08 * Math.sin(t * 0.17 + b.ph));
        } else {
          // each floating blob rises and sinks at its own slow pace, wobbling and swelling a little
          y = 0.52 - 0.5 * Math.sin(t * b.sp * 2 * Math.PI + b.ph);
          x = b.x + b.wob * Math.sin(t * 0.23 + b.ph * 2);
          r = b.r * (1 + 0.12 * Math.sin(t * 0.4 + b.i));
        }
        const M = Math.min(W, H);   // the same as W over the (square) artwork
        const R = r * M * REACH;
        pos[k * 4] = x * W; pos[k * 4 + 1] = y * H; pos[k * 4 + 2] = R * R; pos[k * 4 + 3] = 1 / (R * R);
        rAvg += r * M;
      });
      rAvg /= blobs.length;
      const dome = rAvg * 0.9;   // how tall the blobs look, for the shading
      const n = blobs.length;
      let p = 0;
      for (let y = 0; y < H; y++) {
        const fy = y / H;
        for (let x = 0; x < W; x++) {
          let f = 0, gx = 0, gy = 0;
          for (let k = 0; k < n; k++) {
            const o = k * 4;
            const dx = x - pos[o], dy = y - pos[o + 1];
            const d2 = dx * dx + dy * dy;
            if (d2 >= pos[o + 2]) continue;
            const w = 1 - d2 * pos[o + 3];
            f += w * w * w;
            const g = -6 * w * w * pos[o + 3];
            gx += g * dx; gy += g * dy;
          }
          if (f <= 0) { px[p++] = 0; px[p++] = 0; px[p++] = 0; px[p++] = 0; continue; }
          let al = 0;
          let r = mid[0], g = mid[1], b = mid[2];
          const gm = Math.sqrt(gx * gx + gy * gy);
          const e = Math.max(0.004, gm * 0.75);   // about a pixel of soft edge, so it stays clean when scaled up
          if (f > T - e) {
            const a = Math.min(1, (f - (T - e)) / (2 * e));
            const aa = a * a * (3 - 2 * a);
            // a rounded surface: flat on top, curving down to upright at the edge
            const sq = Math.sqrt(Math.max(f - T, 0.0004));
            let nx = -gx * dome / (2 * sq), ny = -gy * dome / (2 * sq);
            const il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
            nx *= il; ny *= il;
            const dif = Math.max(0, nx * Lx + ny * Ly + il * Lz);
            const lit = dif * dif;
            let wr = rim[0] + (mid[0] - rim[0]) * dif + (core[0] - mid[0]) * lit * 0.6;
            let wg = rim[1] + (mid[1] - rim[1]) * dif + (core[1] - mid[1]) * lit * 0.6;
            let wb = rim[2] + (mid[2] - rim[2]) * dif + (core[2] - mid[2]) * lit * 0.6;
            // glossy highlight, and warmth from the bulb below on the undersides
            const spec = Math.pow(dif, 36) * 0.75 * 255;
            const under = Math.max(0, ny) * fy * 0.45;
            wr += spec + core[0] * under; wg += spec + core[1] * under; wb += spec + core[2] * under;
            r += (wr - r) * aa; g += (wg - g) * aa; b += (wb - b) * aa;
            al += (1 - al) * aa;
          }
          px[p++] = r; px[p++] = g; px[p++] = b; px[p++] = al * 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    this._saverRaf = requestAnimationFrame(frame);
  }

  _saverRain(stage) {
    const box = document.createElement('div');
    box.className = 'cs-rainbg';
    const cur = this.shadowRoot?.getElementById('albumImg');
    let src = cur?.src && cur.naturalWidth && !/^data:/.test(cur.src) ? cur.src : '';
    if (!src) src = this._saverArtList()[0]?.src || '';
    let art = null;
    if (src) {
      art = document.createElement('img');
      art.alt = '';
      art.src = src;
      box.appendChild(art);
    }
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    box.appendChild(cv);
    const v = document.createElement('div'); v.className = 'cs-vignette';
    stage.appendChild(box); stage.appendChild(v);
    const ctx = cv.getContext('2d');
    const mist = document.createElement('canvas');   // the small, still droplets
    const mctx = mist.getContext('2d');
    let W = 0, H = 0, S = 1, Rs = 1, maxDrops = Infinity;
    const drops = [];
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const size = () => {
      const el = this._saverEl;
      if (!el) return false;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return false;
      if (w === W && h === H) return true;
      W = w; H = h; S = Math.min(2, window.devicePixelRatio || 1);
      if (el.classList.contains('cs-full')) {
        S = Math.max(1, Math.min(S, Math.sqrt(2.4e6 / (W * H))));   // keep a big screen light on the processor
        Rs = Math.max(1, Math.min(1.8, Math.min(W, H) / 380));        // drops in proportion to the screen
        maxDrops = 150;
      }
      cv.width = mist.width = Math.round(W * S); cv.height = mist.height = Math.round(H * S);
      mctx.setTransform(S, 0, 0, S, 0, 0);
      for (let i = 0; i < Math.min(W * H / 260, 9000); i++) dot(Math.random() * W, Math.random() * H, (0.6 + Math.random() * 1.8) * Rs);
      return true;
    };
    const dot = (x, y, r) => {
      mctx.fillStyle = 'rgba(0,0,0,0.22)';
      mctx.beginPath(); mctx.arc(x, y + r * 0.35, r, 0, Math.PI * 2); mctx.fill();
      mctx.fillStyle = 'rgba(255,255,255,0.32)';
      mctx.beginPath(); mctx.arc(x, y, r * 0.8, 0, Math.PI * 2); mctx.fill();
    };
    const spawn = (y) => drops.push({
      x: Math.random() * W, y: y ?? Math.random() * H * 0.8, r: (3 + Math.random() * 6) * Rs,
      vy: 0, hold: 40 + Math.random() * 300, lastTrail: 0, drift: (Math.random() - 0.5) * 0.3,
    });
    const drawDrop = (d) => {
      const rx = d.r, ry = d.r * (d.vy > 0.5 ? 1.25 : 1.05);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      ctx.clip();
      if (art && art.complete && art.naturalWidth && (art._lens !== null)) {
        // a water drop works like a little lens, showing the colours behind it upside down. It uses a
        // tiny, soft copy of the cover, so lettering on the artwork never shows through the drops.
        if (!art._lens) {
          try { const lc = document.createElement('canvas'); lc.width = lc.height = 24; lc.getContext('2d').drawImage(art, 0, 0, 24, 24); art._lens = lc; } catch (_) { art._lens = null; }
        }
        const src = art._lens || art;
        const nw = src.width, nh = src.height;
        const k = Math.max(nw / (W * 1.16), nh / (H * 1.16));
        const sw = rx * 5 * k, sh = ry * 5 * k;
        const sx = Math.max(0, Math.min(nw - sw, (d.x + W * 0.08) * k + (nw - W * 1.16 * k) / 2 - sw / 2));
        const sy = Math.max(0, Math.min(nh - sh, (d.y + H * 0.08) * k + (nh - H * 1.16 * k) / 2 - sh / 2));
        ctx.translate(d.x, d.y); ctx.scale(1, -1);
        ctx.imageSmoothingEnabled = true; try { ctx.drawImage(src, sx, sy, sw, sh, -rx * 1.1, -ry * 1.1, rx * 2.2, ry * 2.2); } catch (_) {}
        ctx.setTransform(S, 0, 0, S, 0, 0);
      }
      const g = ctx.createRadialGradient(d.x, d.y, rx * 0.3, d.x, d.y, rx * 1.1);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(d.x - rx * 1.2, d.y - ry * 1.2, rx * 2.4, ry * 2.4);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(d.x - rx * 0.35, d.y - ry * 0.4, Math.max(0.8, rx * 0.2), 0, Math.PI * 2); ctx.fill();
    };
    let lastT = 0;
    const frame = (now) => {
      if (!this._saverEl || !cv.isConnected) return;
      if (!still) this._saverRaf = requestAnimationFrame(frame);
      if (!size()) return;
      const dt = lastT ? Math.min(3, (now - lastT) / 16.7) : 1;
      lastT = now;
      if (!still) {
        if (drops.length < Math.min(maxDrops, Math.max(10, W * H / 3500)) && Math.random() < 0.08 * dt) spawn();
        if (Math.random() < 0.5 * dt) dot(Math.random() * W, Math.random() * H, (0.5 + Math.random() * 1.6) * Rs);
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (d.hold > 0) { d.hold -= dt; if (d.hold <= 0) d.vy = 0.4; continue; }
          // running drops speed up, pause now and then, wander a little and wipe a path through the mist
          d.vy = Math.min(d.r * 0.9, d.vy + 0.03 * d.r * dt * (Math.random() < 0.97 ? 1 : -8));
          if (d.vy < 0.2) d.vy = 0.2;
          d.y += d.vy * dt;
          d.x += d.drift * dt + (Math.random() - 0.5) * 0.4;
          mctx.save(); mctx.globalCompositeOperation = 'destination-out';
          mctx.beginPath(); mctx.ellipse(d.x, d.y, d.r * 0.9, d.r * 1.2, 0, 0, Math.PI * 2); mctx.fill(); mctx.restore();
          if (d.y - d.lastTrail > d.r * 1.6) { d.lastTrail = d.y; dot(d.x + (Math.random() - 0.5) * 2, d.y - d.r * 1.8, d.r * (0.2 + Math.random() * 0.2)); d.r *= 0.985; }
          if (d.y - d.r > H || d.r < 1.5) drops.splice(i, 1);
        }
      } else if (!drops.length) { for (let i = 0; i < 14; i++) spawn(); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(mist, 0, 0);
      ctx.setTransform(S, 0, 0, S, 0, 0);
      drops.forEach(drawDrop);
    };
    if (still) { const go = () => frame(performance.now()); if (art && !art.complete) art.onload = go; requestAnimationFrame(go); }
    else this._saverRaf = requestAnimationFrame(frame);
  }

  _saverCanvasLoop(box, frame, { scale = 2, fps = 30 } = {}) {
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    box.appendChild(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, S = 1;
    const size = () => {
      const el = this._saverEl;
      if (!el) return false;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return false;
      if (w === W && h === H) return true;
      W = w; H = h; S = Math.min(scale, window.devicePixelRatio || 1);
      // full screen on a big, high-density display is a lot of pixels: stay within a budget (Raspberry Pi heat)
      if (el.classList.contains('cs-full')) S = Math.max(1, Math.min(S, Math.sqrt(2.4e6 / (W * H))));
      cv.width = Math.round(W * S); cv.height = Math.round(H * S);
      return 'resized';
    };
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let last = 0, prev = 0;
    const step = (now) => {
      if (!this._saverEl || !cv.isConnected) return;
      if (!still) this._saverRaf = requestAnimationFrame(step);
      if (now - last < 1000 / fps - 2) return;
      last = now;
      const sz = size();
      if (!sz) return;
      const dt = prev ? Math.min(0.1, (now - prev) / 1000) : 1 / fps;
      prev = now;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frame(ctx, (now - t0) / 1000, dt, W, H, sz === 'resized', S);
    };
    this._saverRaf = requestAnimationFrame(step);
    return { cv, ctx };
  }

  _saverOff(W, H, S) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * S)); c.height = Math.max(1, Math.round(H * S));
    const g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0);
    return [c, g];
  }

  _saverGrain(ctx, W, H, alpha = 0.035) {
    if (!this._saverGrainTile) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), im = g.createImageData(128, 128), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = (Math.random() * 255) | 0; }
      g.putImageData(im, 0, 0);
      this._saverGrainTile = c;
    }
    const p = ctx.createPattern(this._saverGrainTile, 'repeat');
    if (!p) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  _saverStarSprites() {
    if (this._saverSprites) return this._saverSprites;
    const mk = (col) => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(' + col + ',0.95)');
      gr.addColorStop(0.22, 'rgba(' + col + ',0.35)'); gr.addColorStop(0.5, 'rgba(' + col + ',0.08)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return c;
    };
    return (this._saverSprites = [mk('255,255,255'), mk('255,214,170'), mk('180,205,255')]);
  }

  _saverMoon(ctx, cx, cy, r, S = 1, glow = 1) {
    const age = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588853 + 29.530588853) % 29.530588853;
    const f = age / 29.530588853, k = Math.cos(f * Math.PI * 2);
    const south = (this._hass?.config?.latitude ?? 51) < 0;
    const side = (f < 0.5 ? 1 : -1) * (south ? -1 : 1);
    const lit = (1 - k) / 2;
    const key = [Math.round(r * 10), S, Math.round(f * 2000), side].join('|');
    if (this._saverMoonC?.key !== key) {
      const pad = Math.ceil(r * 0.15), D = (r + pad) * 2;
      const [c, g] = this._saverOff(D, D, S);
      const o = r + pad;
      // the surface: limb darkening, seas and a few craters
      const base = g.createRadialGradient(o - r * 0.25, o - r * 0.3, r * 0.1, o, o, r);
      base.addColorStop(0, '#fbf8ee'); base.addColorStop(0.7, '#e6e1d2'); base.addColorStop(1, '#bfb9a8');
      g.fillStyle = base; g.beginPath(); g.arc(o, o, r, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(o, o, r, 0, Math.PI * 2); g.clip();
      const sea = (x, y, rx, ry, a) => { const gr = g.createRadialGradient(o + x * r, o + y * r, 0, o + x * r, o + y * r, Math.max(rx, ry) * r); gr.addColorStop(0, 'rgba(110,108,100,' + a + ')'); gr.addColorStop(0.7, 'rgba(110,108,100,' + a * 0.6 + ')'); gr.addColorStop(1, 'rgba(110,108,100,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(o + x * r, o + y * r, rx * r, ry * r, 0.3, 0, Math.PI * 2); g.fill(); };
      sea(-0.28, -0.28, 0.3, 0.24, 0.42); sea(-0.05, -0.05, 0.24, 0.2, 0.35); sea(0.22, -0.32, 0.18, 0.14, 0.32); sea(-0.42, 0.12, 0.2, 0.26, 0.3); sea(0.12, 0.25, 0.16, 0.12, 0.28); sea(0.36, 0.05, 0.12, 0.16, 0.25);
      let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.9, cr = r * (0.02 + rnd() * 0.06);
        const x = o + Math.cos(a) * d, y = o + Math.sin(a) * d;
        g.fillStyle = 'rgba(90,86,78,0.22)'; g.beginPath(); g.arc(x + cr * 0.15, y + cr * 0.15, cr, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,250,0.25)'; g.beginPath(); g.arc(x - cr * 0.2, y - cr * 0.2, cr * 0.7, 0, Math.PI * 2); g.fill();
      }
      // a bright rayed crater low on the face
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(o - r * 0.12, o + r * 0.6, r * 0.05, 0, Math.PI * 2); g.fill();
      g.restore();
      // the shadow: the unlit part taken away, in a few slightly different shapes for a soft terminator
      const N = 48;
      g.save(); g.globalCompositeOperation = 'destination-out';
      [[0, 1], [0.04, 0.35], [0.08, 0.25], [0.13, 0.15]].forEach(([dk, a]) => {
        const kk = Math.max(-1, Math.min(1, k + dk));
        g.globalAlpha = a; g.beginPath();
        for (let i = 0; i <= N; i++) { const t = -Math.PI / 2 + Math.PI * i / N; const x = o - side * (r + 1) * Math.cos(t), y = o + (r + 1) * Math.sin(t); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        for (let i = N; i >= 0; i--) { const t = -Math.PI / 2 + Math.PI * i / N; g.lineTo(o + side * kk * r * Math.cos(t), o + r * Math.sin(t)); }
        g.closePath(); g.fill();
      });
      g.restore();
      // earthshine behind
      g.save(); g.globalCompositeOperation = 'destination-over';
      g.fillStyle = 'rgba(120,135,170,0.16)'; g.beginPath(); g.arc(o, o, r, 0, Math.PI * 2); g.fill();
      g.restore();
      this._saverMoonC = { key, c, D };
    }
    const m = this._saverMoonC;
    if (glow > 0) {
      const gr = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 6);
      gr.addColorStop(0, 'rgba(210,222,255,' + (0.22 * (0.25 + lit) * glow).toFixed(3) + ')');
      gr.addColorStop(0.3, 'rgba(200,214,255,' + (0.07 * (0.25 + lit) * glow).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(200,214,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r * 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.drawImage(m.c, cx - m.D / 2, cy - m.D / 2, m.D, m.D);
  }

  _saverNightSky(stage) {
    const box = document.createElement('div');
    box.className = 'cs-night';
    stage.appendChild(box);
    const SPR = this._saverStarSprites();
    let B = null, shoot = null, nextShoot = 5 + Math.random() * 8;
    const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
    const build = (W, H, S) => {
      // the stars across the sky
      const stars = [];
      const n = Math.min(Math.round(W * H / 300), 2600);
      for (let i = 0; i < n; i++) {
        const r = Math.random(), tier = r < 0.035 ? 2 : r < 0.3 ? 1 : 0;
        stars.push({ x: Math.random() * W, y: Math.random() * H * 0.95, tier, size: tier === 2 ? 7 + Math.random() * 9 : tier === 1 ? 0.7 + Math.random() * 0.6 : 0.35 + Math.random() * 0.4,
          al: tier === 2 ? 0.75 + Math.random() * 0.25 : tier === 1 ? 0.5 + Math.random() * 0.35 : 0.22 + Math.random() * 0.3,
          tw: 0.5 + Math.random() * 2.5, ph: Math.random() * 6.3, spr: Math.random() < 0.2 ? 1 : Math.random() < 0.35 ? 2 : 0 });
      }
      // the Milky Way, laid out along its own length (u) and across it (v). It repeats every L, so as it
      // flows toward the top right, what leaves at the top comes back in at the bottom left without a join.
      const ang = -0.62, cx = W * 0.5, cy = H * 0.44;
      const L = Math.ceil(Math.hypot(W, H) * 1.25), BH = Math.ceil(H * 0.6);
      const dust = [];
      for (let i = 0; i < Math.min(W * 4.5, 5200); i++) {
        const u = Math.random() * L;
        dust.push({ u, v: gauss() * H * 0.07 * (1 + 0.45 * Math.sin(u / L * Math.PI * 2 * 3)), s: 0.3 + Math.random() * 0.55, al: 0.18 + Math.random() * 0.45 });
      }
      // a few brighter knots of stars in it
      for (let k = 0; k < 7; k++) {
        const u0 = Math.random() * L, v0 = gauss() * H * 0.03;
        for (let i = 0; i < 70; i++) dust.push({ u: (u0 + gauss() * W * 0.05 + L) % L, v: v0 + gauss() * H * 0.025, s: 0.3 + Math.random() * 0.5, al: 0.25 + Math.random() * 0.5 });
      }
      // its glow and dark dust lanes, drawn once at half size (they're soft), on a strip that wraps round
      const GS = 0.5, glow = document.createElement('canvas');
      glow.width = Math.ceil(L * GS); glow.height = Math.ceil(BH * GS);
      const g = glow.getContext('2d');
      g.setTransform(GS, 0, 0, GS, 0, BH * GS / 2);   // CSS pixels; v = 0 along the middle of the strip
      const blob = (u, v, rr, col) => {
        [u - L, u, u + L].forEach(x => {
          if (x + rr < 0 || x - rr > L) return;
          const gr = g.createRadialGradient(x, v, 0, x, v, rr);
          gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, v, rr, 0, Math.PI * 2); g.fill();
        });
      };
      for (let i = 0; i < 190; i++) blob(Math.random() * L, gauss() * H * 0.06, W * (0.05 + Math.random() * 0.12), Math.random() < 0.3 ? 'rgba(235,205,215,0.05)' : 'rgba(170,185,240,0.055)');
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 80; i++) blob(Math.random() * L, gauss() * H * 0.018 + H * 0.008, W * (0.015 + Math.random() * 0.04), 'rgba(0,0,0,0.35)');
      // the land: a glow along the horizon, distant hills in the haze, and a nearer ridge with trees
      const [land, l] = this._saverOff(W, H, S);
      const hg = l.createLinearGradient(0, H * 0.55, 0, H * 0.9);
      hg.addColorStop(0, 'rgba(70,90,150,0)'); hg.addColorStop(0.7, 'rgba(80,95,150,0.16)'); hg.addColorStop(0.9, 'rgba(255,170,110,0.07)'); hg.addColorStop(1, 'rgba(255,170,110,0)');
      l.fillStyle = hg; l.fillRect(0, H * 0.55, W, H * 0.35);
      const ridge = (base, amp, fr, top, bottom, trees) => {
        const p1 = Math.random() * 6, p2 = Math.random() * 6, p3 = Math.random() * 6;
        const yAt = x => H * (base - amp * (0.55 * Math.sin(x / W * Math.PI * fr + p1) + 0.3 * Math.sin(x / W * Math.PI * fr * 2.3 + p2) + 0.15 * Math.sin(x / W * Math.PI * fr * 6.1 + p3)));
        const gr = l.createLinearGradient(0, H * (base - amp), 0, H);
        gr.addColorStop(0, top); gr.addColorStop(1, bottom);
        l.fillStyle = gr; l.beginPath(); l.moveTo(0, H);
        for (let x = 0; x <= W; x += 2) l.lineTo(x, yAt(x));
        l.lineTo(W, H); l.closePath(); l.fill();
        if (!trees) return;
        l.fillStyle = bottom;
        let x = -10;
        while (x < W + 10) {
          if (Math.random() < 0.55) {
            const n = 2 + Math.floor(Math.random() * 7);
            for (let i = 0; i < n; i++) {
              const tx = x + Math.random() * 14, th = H * (0.03 + Math.random() * 0.05), tw = th * (0.28 + Math.random() * 0.12), ty = yAt(tx) + 2;
              l.beginPath(); l.moveTo(tx, ty - th);
              for (let j = 1; j <= 4; j++) { const yy = ty - th + th * j / 4; l.lineTo(tx + tw * j / 4 * 1.1, yy); l.lineTo(tx + tw * j / 4 * 0.55, yy); }
              l.lineTo(tx + tw * 0.08, ty); l.lineTo(tx - tw * 0.08, ty);
              for (let j = 4; j >= 1; j--) { const yy = ty - th + th * j / 4; l.lineTo(tx - tw * j / 4 * 0.55, yy); l.lineTo(tx - tw * j / 4 * 1.1, yy); }
              l.closePath(); l.fill();
              x += 4 + Math.random() * 7;
            }
          }
          x += 10 + Math.random() * 40;
        }
      };
      ridge(0.8, 0.05, 1.4, '#141c36', '#0b1124', false);
      ridge(0.87, 0.045, 2.2, '#080c19', '#05070f', false);
      ridge(0.93, 0.03, 3.1, '#030409', '#020306', true);
      B = { stars, dust, glow, GS, L, BH, ang, cx, cy, land };
    };
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized, S) => {
      if (resized || !B) build(W, H, S);
      const { L, BH, ang, cx, cy } = B;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#010208'); sky.addColorStop(0.45, '#040719'); sky.addColorStop(0.75, '#0a1230'); sky.addColorStop(1, '#141d40');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // the Milky Way flowing up toward the top right: across the panel in about four minutes
      const off = (t * W / 240) % L;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      for (const k of [-1, 0]) ctx.drawImage(B.glow, -L / 2 + off + k * L, -BH / 2, L, BH);
      ctx.fillStyle = '#dfe6ff';
      for (const s of B.dust) {
        const u = ((s.u + off) % L) - L / 2;
        ctx.globalAlpha = s.al; ctx.fillRect(u, s.v, s.s, s.s);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#dfe6ff';
      for (const s of B.stars) {
        const tw = 0.7 + 0.3 * Math.sin(t * s.tw + s.ph) + 0.1 * Math.sin(t * s.tw * 2.7 + s.ph);
        if (s.tier === 2) {
          const z = s.size * (0.9 + 0.1 * tw);
          ctx.globalAlpha = s.al * tw; ctx.drawImage(SPR[s.spr], s.x - z / 2, s.y - z / 2, z, z);
          if (s.size > 12) { ctx.globalAlpha = s.al * tw * 0.25; ctx.fillStyle = '#fff'; ctx.fillRect(s.x - z * 0.55, s.y - 0.25, z * 1.1, 0.5); ctx.fillRect(s.x - 0.25, s.y - z * 0.55, 0.5, z * 1.1); ctx.fillStyle = '#dfe6ff'; }
        } else {
          ctx.globalAlpha = s.al * tw; ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        }
      }
      ctx.globalAlpha = 1;
      // a shooting star now and then
      nextShoot -= dt;
      if (!shoot && nextShoot <= 0) {
        const a = 0.3 + Math.random() * 0.6;
        shoot = { x: W * (0.25 + Math.random() * 0.7), y: H * (0.04 + Math.random() * 0.3), vx: -Math.cos(a) * W * 0.8, vy: Math.sin(a) * W * 0.8, life: 0, dur: 0.6 + Math.random() * 0.6 };
        nextShoot = 15 + Math.random() * 40;
      }
      if (shoot) {
        shoot.life += dt;
        const k = shoot.life / shoot.dur;
        if (k >= 1) shoot = null;
        else {
          const hx = shoot.x + shoot.vx * shoot.life, hy = shoot.y + shoot.vy * shoot.life;
          const tl = 0.16, tx = hx - shoot.vx * tl, ty = hy - shoot.vy * tl;
          const al = Math.sin(k * Math.PI);
          const gr = ctx.createLinearGradient(hx, hy, tx, ty);
          gr.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(2) + ')'); gr.addColorStop(0.3, 'rgba(200,220,255,' + (al * 0.4).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.strokeStyle = gr; ctx.lineCap = 'round';
          ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.globalAlpha = al; ctx.drawImage(SPR[0], hx - 5, hy - 5, 10, 10); ctx.globalAlpha = 1;
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      const mr = Math.max(11, Math.min(W, H) * 0.06);
      this._saverMoon(ctx, W - mr * 2.6, mr * 2.8, mr, S);
      ctx.drawImage(B.land, 0, 0, W, H);
      this._saverGrain(ctx, W, H, 0.03);
    });
  }

  _saverFireplace(stage) {
    const box = document.createElement('div');
    box.className = 'cs-firebg';
    stage.appendChild(box);
    // the flames are hundreds of soft glowing wisps, drawn on top of each other so the fire builds up
    // white-hot at the base and cools through yellow and orange to red at the tips
    const SPR = [[255, 252, 230], [255, 236, 160], [255, 208, 100], [255, 172, 60], [252, 132, 36], [238, 96, 24], [205, 62, 14], [150, 38, 8]].map(c => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(' + c + ',0.9)'); gr.addColorStop(0.3, 'rgba(' + c + ',0.5)'); gr.addColorStop(0.65, 'rgba(' + c + ',0.12)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return cv;
    });
    let B = null, flames = [], sparks = [];
    // the fire's width (fw) and scale (M): over the square artwork these are 0.86 of the width and the height,
    // as before; full screen keeps them in proportion to each other
    const dimsOf = (W, H) => ({ fw: Math.min(W * 0.86, H * 1.3), M: Math.min(H, W * 1.15) });
    const build = (W, H, S) => {
      const { fw, M } = dimsOf(W, H);
      // where flames start: along the bottom, most in the middle
      const emit = [];
      for (let x = W / 2 - fw / 2; x <= W / 2 + fw / 2; x += 2) { const c = 1 - Math.abs(x - W / 2) / (fw / 2); if (c > 0) emit.push({ x, y: H - M * (0.015 + 0.09 * Math.pow(c, 1.4)), c: Math.min(1, c * 1.4), front: false }); }
      B = { emit, fw, M };
      flames = []; sparks = [];
    };
    const drawFlames = (ctx, front, mult = 1) => {
      for (const p of flames) {
        if (p.front !== front) continue;
        const k = p.life / p.max;
        const sz = p.s * (k < 0.15 ? 0.55 + k / 0.15 * 0.45 : 1 - (k - 0.15) * 0.85);
        const ci = Math.min(7, Math.floor(k * 7.5 + p.heat));
        const a = (k < 0.08 ? k / 0.08 : 1) * Math.pow(1 - k, 1.25) * p.a;
        if (a < 0.01 || sz < 1) continue;
        ctx.globalAlpha = a * mult;
        ctx.drawImage(SPR[ci], p.x - sz / 2, p.y - sz * 0.95, sz, sz * 1.7);
      }
      ctx.globalAlpha = 1;
    };
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized, S) => {
      if (resized || !B) build(W, H, S);
      const flick = 0.82 + 0.1 * Math.sin(t * 7.1) * Math.sin(t * 2.9) + 0.08 * Math.sin(t * 13.7 + Math.sin(t * 3));
      // new flames: more where the fire is strongest, gathering into tongues that wander along the logs
      const want = 720 * dt;
      for (let i = 0; i < Math.floor(want) + (Math.random() < want % 1 ? 1 : 0); i++) {
        const e = B.emit[(Math.random() * B.emit.length) | 0];
        if (!e) break;
        const tongue = 0.45 + 0.55 * Math.max(0, Math.sin(e.x * 0.045 + t * 1.6) * 0.6 + Math.sin(e.x * 0.11 - t * 2.3) * 0.4 + 0.3);
        if (Math.random() > e.c * tongue) continue;
        flames.push({ x: e.x + (Math.random() - 0.5) * 6, y: e.y + 3 + Math.random() * 3, vx: (Math.random() - 0.5) * 12, vy: -B.M * (0.17 + Math.random() * 0.22) * (0.7 + e.c * 0.5),
          life: 0, max: (0.45 + Math.random() * 0.75) * (0.55 + e.c * 0.6) * (0.7 + tongue * 0.5), s: B.M * (0.06 + Math.random() * 0.06) * (0.7 + e.c * 0.5),
          a: 0.38 + Math.random() * 0.3, heat: Math.random() * 0.6, ph: Math.random() * 6.3, front: e.front });
      }
      flames = flames.filter(p => {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.x += (p.vx + Math.sin(t * 4.2 + p.ph + p.y * 0.05) * B.M * 0.035) * dt;
        p.y += p.vy * dt; p.vy *= 1 + dt * 0.5;
        p.x += (W / 2 - p.x) * dt * 0.06;
        return true;
      });
      // darkness, warmed by the fire and breathing with it
      ctx.fillStyle = '#040201'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const warm = ctx.createRadialGradient(W / 2, H * 0.8, 0, W / 2, H * 0.8, Math.max(W, H) * (0.7 + 0.05 * flick));
      warm.addColorStop(0, 'rgba(150,50,10,' + (0.55 * flick).toFixed(3) + ')'); warm.addColorStop(0.45, 'rgba(70,20,5,' + (0.35 * flick).toFixed(3) + ')'); warm.addColorStop(1, 'rgba(20,5,0,0)');
      ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
      // the flames
      drawFlames(ctx, false);
      // the bright glow at the base of the fire
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createRadialGradient(W / 2, H - B.M * 0.06, 0, W / 2, H - B.M * 0.06, B.fw * 0.44);
      cg.addColorStop(0, 'rgba(255,100,20,' + (0.28 * flick).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      // sparks rising and fading
      const sk = this._saverEl?.classList.contains('cs-full') ? Math.max(1, B.M / 380) : 1;
      if (sparks.length < 30 && Math.random() < dt * 5) sparks.push({ x: W / 2 + B.fw * (Math.random() - 0.5) * 0.42, y: H - B.M * 0.28, vx: (Math.random() - 0.5) * 20 * sk, vy: -(40 + Math.random() * 70) * sk, life: 0, max: 1 + Math.random() * 2.2, r: (0.5 + Math.random() * 0.9) * sk, ph: Math.random() * 6 });
      sparks = sparks.filter(e => {
        e.life += dt;
        if (e.life > e.max) return false;
        e.x += (e.vx + Math.sin(t * 2.5 + e.ph) * 16) * dt; e.y += e.vy * dt; e.vy *= 0.993;
        const a = (1 - e.life / e.max) * (0.55 + 0.45 * Math.sin(t * 14 + e.ph));
        ctx.fillStyle = 'rgba(255,' + (160 + Math.round(70 * (1 - e.life / e.max))) + ',70,' + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        return true;
      });
      ctx.globalCompositeOperation = 'source-over';
      this._saverGrain(ctx, W, H, 0.025);
    });
  }

  _saverOcean(stage) {
    const box = document.createElement('div');
    box.className = 'cs-oceanbg';
    stage.appendChild(box);
    const SPR = this._saverStarSprites();
    // sky top, sky middle, horizon, far sea, near sea, sun, cloud lit, cloud shade
    const P = {
      night: ['#01030c', '#06102c', '#16264e', '#0c1a3a', '#01040b', '#eef2ff', '#3c4a74', '#0b1226'],
      dawn:  ['#1b2152', '#6d5c92', '#f8b8a2', '#7c6f98', '#121833', '#ffe6c8', '#ffcdb8', '#5c4c7c'],
      dusk:  ['#160f3a', '#73396c', '#ff9654', '#8b5262', '#140c1f', '#ffc06a', '#ffb877', '#5a2f52'],
      day:   ['#1b5fb8', '#5a9bdc', '#f0dcc0', '#3d86c1', '#08355f', '#ffd98e', '#fff3e2', '#b8b8c8'],
    };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, k) => a.map((v, i) => hex(v).map((c, j) => Math.round(c + (hex(b[i])[j] - c) * k)));
    const rgb = (c, a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    const sun = () => {
      const s = this._hass?.states?.['sun.sun']?.attributes;
      if (s && typeof s.elevation === 'number') return { el: s.elevation, rising: !!s.rising };
      const now = new Date(), hr = now.getHours() + now.getMinutes() / 60;
      return { el: 50 * Math.sin((hr - 6) / 12 * Math.PI), rising: hr < 12 };
    };
    const palette = () => {
      const { el, rising } = sun();
      const tw = rising ? P.dawn : P.dusk;
      let c, dark = 0;
      if (el <= -10) { c = mix(P.night, P.night, 0); dark = 1; }
      else if (el < 0) { c = mix(P.night, tw, (el + 10) / 10); dark = -el / 10; }
      else if (el < 14) c = mix(tw, P.day, el / 14);
      else c = mix(P.day, P.day, 0);
      // how cloudy: from a weather entity when one is given, otherwise a clear sky
      // (the soft grey cloud banks read as storm clouds, especially at dawn, dusk and night)
      const w = this._hass?.states?.[(this._config?.screensaver_weather || '').trim()]?.state || '';
      const cloud = ({ sunny: 0.15, 'clear-night': 0.1, partlycloudy: 0.5, cloudy: 0.85, fog: 0.9, rainy: 0.9, pouring: 1, snowy: 0.9, 'snowy-rainy': 0.9, lightning: 1, 'lightning-rainy': 1, hail: 1, windy: 0.45, 'windy-variant': 0.6 })[w] ?? 0;
      return { c, el, rising, dark, cloud };
    };
    let pal = palette(), palAt = -99, B = null;
    // the water's ripples: one tile, worked out once, that repeats seamlessly; light on the crests, shade in the troughs
    const TW = 256, TH = 128;
    const tex = (() => {
      const comps = Array.from({ length: 16 }, (_, i) => ({ kx: Math.round((Math.random() - 0.5) * (i < 4 ? 4 : i < 10 ? 10 : 18)), ky: (i < 4 ? 3 : i < 10 ? 6 : 12) + Math.floor(Math.random() * (i < 4 ? 4 : i < 10 ? 10 : 16)), a: i < 4 ? 1 : i < 10 ? 0.5 : 0.25, p: Math.random() * 6.3 }));
      const hv = new Float32Array(TW * TH);
      let mx = 0;
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
        let v = 0;
        for (const c of comps) v += c.a * Math.sin(Math.PI * 2 * (c.kx * x / TW + c.ky * y / TH) + c.p);
        hv[y * TW + x] = v; mx = Math.max(mx, Math.abs(v));
      }
      const mk = (fn) => {
        const c = document.createElement('canvas'); c.width = TW; c.height = TH;
        const g = c.getContext('2d'), im = g.createImageData(TW, TH), d = im.data;
        for (let i = 0; i < hv.length; i++) {
          // the slope toward the viewer catches the light, so take the change from the row behind
          const y = (i / TW) | 0, x = i % TW, up = hv[((y + TH - 1) % TH) * TW + x];
          const [r, gg, b, a] = fn(hv[i] / mx, (hv[i] - up) / mx * 6);
          d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = a;
        }
        g.putImageData(im, 0, 0);
        return c;
      };
      const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
      return {
        hi: mk((v, s) => [255, 255, 255, Math.round(255 * Math.min(1, ss(0.4, 1, v) * 0.55 + ss(0.3, 1, -s) * 0.8))]),
        lo: mk((v, s) => [0, 8, 24, Math.round(255 * Math.min(1, ss(0.1, 0.95, -v) * 0.7 + ss(0.2, 0.9, s) * 0.35))]),
      };
    })();
    const build = (W, H, S, hy) => {
      // rows of water from the horizon down: thin far away, thicker close up
      const rows = [];
      let y = hy;
      while (y < H) { const d = (y - hy) / (H - hy); const ny = Math.min(H, Math.round((y + 0.6 + d * 1.9) * S) / S); if (ny <= y) { y += 1 / S; continue; } rows.push([y, ny - y]); y = ny; }
      // clouds: soft banks low in the sky
      const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W * 1.4 - W * 0.2, y: hy * (0.15 + Math.random() * 0.6), w: W * (0.45 + Math.random() * 0.5),
        puffs: Array.from({ length: 10 }, () => ({ dx: (Math.random() - 0.5) * 0.9, dy: (Math.random() - 0.5) * 0.25, r: 0.22 + Math.random() * 0.24 })), sp: 1.5 + Math.random() * 3, rank: i / 9 }));
      const stars = Array.from({ length: Math.round(W * hy / 450) }, () => ({ x: Math.random() * W, y: Math.random() * hy * 0.92, s: Math.random() < 0.06 ? 5 + Math.random() * 5 : 0.4 + Math.random() * 0.7, ph: Math.random() * 6, tw: 0.6 + Math.random() * 2 }));
      B = { rows, clouds, stars, hiP: null, loP: null };
    };
    // ── Life on the ocean: one thing at a time, now and then — dolphins leaping (alone or in a pod),
    //    seabirds gliding over, or a whale far out ──
    const life = { ev: null, bird: null, next: 2 + Math.random() * 3, nextBird: 3 + Math.random() * 3, splashes: [], caps: [], force: null };
    this._saverOceanLife = life;
    const rr = (a, b) => a + Math.random() * (b - a);
    const startEvent = (W, H, hy) => {
      const pick = [['dolphins', 0.7], ['whale', 0.3]];
      let r = Math.random() * pick.reduce((s, p) => s + p[1], 0), kind = 'dolphins';
      for (const [k, w] of pick) { if ((r -= w) <= 0) { kind = k; break; } }
      if (life.force) { kind = life.force; life.force = null; }
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (kind === 'dolphins') {
        const n = Math.random() < 0.4 ? 1 : 3 + Math.floor(Math.random() * 4);
        const d = rr(0.2, 0.4), len = W * 0.05 * (d / 0.35);
        const yW = hy + (H - hy) * d, speed = len * rr(1.6, 2.2) * dir;
        const x0 = dir > 0 ? rr(-0.05, 0.3) * W : rr(0.7, 1.05) * W;
        const pod = Array.from({ length: n }, (_, i) => {
          const leaps = [];
          let tt = i * rr(0.15, 0.6);
          const k = 2 + Math.floor(Math.random() * 3);
          for (let j = 0; j < k; j++) { const ld = rr(0.85, 1.15); leaps.push([tt, ld]); tt += ld + rr(1.1, 2.2); }
          return { dx: (i ? (Math.random() - 0.5) * len * 3 : 0) - i * len * 0.4 * dir, dy: (Math.random() - 0.5) * (H - hy) * 0.03, sc: rr(0.85, 1.1), leaps, end: tt };
        });
        return { kind, d, len, yW, speed, x0, pod, t: 0, dur: Math.max(...pod.map(p => p.end)) + 1.5, dir };
      }
      if (kind === 'birds') {
        const sc = W / 400 * 1.25;   // bird size, in step with the screen
        const x0 = dir > 0 ? -70 * sc : W + 70 * sc;
        if (Math.random() < 0.3) {
          // a distant flock: lots of tiny birds moving together, the group slowly changing shape
          const n = 15 + Math.floor(Math.random() * 16), R = W * rr(0.05, 0.08);
          return { kind, style: 'flock', dir, t: 0, x: x0, y: hy * rr(0.45, 0.8), vx: W * rr(0.035, 0.05) * dir, R,
            birds: Array.from({ length: n }, () => ({ a: Math.random() * 6.3, r: Math.sqrt(Math.random()), f1: rr(0.15, 0.35), f2: rr(0.1, 0.3), p1: Math.random() * 6.3, p2: Math.random() * 6.3, flapPh: Math.random() * 6, flapSpd: rr(0.13, 0.19), size: rr(1.2, 1.6) * sc })) };
        }
        const depth = 0.75 + Math.random() * 0.5, speed = (0.7 + Math.random() * 0.55) * dir * depth * 30 * sc;
        const startY = hy * (0.42 + Math.random() * 0.42);
        const count = 1 + Math.floor(Math.random() * 10), formation = Math.floor(Math.random() * 3);
        const birds = Array.from({ length: count }, (_, i) => {
          let offX = 0, offY = 0;
          if (count > 1) {
            if (formation === 0) { const row = Math.floor((i + 1) / 2), side = i % 2 === 0 ? 1 : -1; offX = -15 * row * dir; offY = 8 * row * side; }
            else if (formation === 1) { offX = -18 * i * dir; offY = 10 * i * (Math.random() > 0.5 ? 1 : -1); }
            else { offX = (Math.random() - 0.5) * 60 * dir; offY = (Math.random() - 0.5) * 45; }
          }
          return { x: x0 + offX * depth * sc, y: startY + offY * depth * sc, vx: speed, vy: (Math.random() - 0.5) * 0.06 * 30 * sc, flapPh: i + Math.random() * 2, flapSpd: 0.13 + Math.random() * 0.06, size: (2.0 + Math.random() * 0.7) * depth * sc };
        });
        return { kind, style: 'v', dir, t: 0, birds };
      }
      return { kind: 'whale', x: rr(0.2, 0.8) * W, d: rr(0.08, 0.15), t: 0, dur: 11, dir };
    };
    const seaY = (H, hy, d) => hy + (H - hy) * d;
    // a splash: droplets thrown up and a ring of ripples spreading
    const splash = (x, y, size) => {
      const drops = Array.from({ length: 10 }, () => ({ x, y, vx: (Math.random() - 0.5) * size * 3, vy: -rr(1.5, 3.5) * size, r: rr(0.35, 0.7) * Math.max(0.45, size * 0.05) }));
      life.splashes.push({ x, y, size, t: 0, drops });
    };
    const drawSplashes = (ctx, dt, lightC) => {
      life.splashes = life.splashes.filter(s => {
        s.t += dt;
        if (s.t > 2.2) return false;
        const k = s.t / 2.2;
        ctx.strokeStyle = rgb(lightC, (0.4 * (1 - k)).toFixed(3)); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.size * (0.4 + k * 2.2), s.size * (0.08 + k * 0.35), 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = rgb(lightC, Math.max(0, 0.85 - k * 2).toFixed(3));
        for (const p of s.drops) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += s.size * 9 * dt; if (p.y < s.y) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } }
        return true;
      });
    };
    // a dolphin, side on, facing +x, nose at +len/2: a short beak and rounded melon, a long
    // tapering body, a curved-back dorsal fin, a flipper behind the head and flat tail flukes
    const dolphin = (ctx, len, light) => {
      const L = len;
      const P = (x, y) => [x * L, y * L];
      const top = [Math.round(40 * light + 8), Math.round(52 * light + 10), Math.round(64 * light + 14)];
      const belly = [Math.round(150 * light + 20), Math.round(160 * light + 22), Math.round(168 * light + 26)];
      const g = ctx.createLinearGradient(0, -L * 0.115, 0, L * 0.085);
      g.addColorStop(0, rgb(top)); g.addColorStop(0.5, rgb(top)); g.addColorStop(0.72, rgb(top.map((c, i) => Math.round(c * 0.5 + belly[i] * 0.5)))); g.addColorStop(1, rgb(belly));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(...P(0.5, 0.004));                                                   // beak tip
      ctx.bezierCurveTo(...P(0.47, -0.012), ...P(0.43, -0.02), ...P(0.395, -0.03));     // top of the beak
      ctx.bezierCurveTo(...P(0.385, -0.065), ...P(0.33, -0.09), ...P(0.26, -0.1));      // the melon (forehead)
      ctx.bezierCurveTo(...P(0.15, -0.112), ...P(0.02, -0.118), ...P(-0.1, -0.1));      // the back
      ctx.bezierCurveTo(...P(-0.24, -0.075), ...P(-0.36, -0.035), ...P(-0.44, -0.018)); // down to the tail stock
      // flukes: flat, so side on they're a thin swept blade
      ctx.bezierCurveTo(...P(-0.49, -0.022), ...P(-0.55, -0.04), ...P(-0.6, -0.052));
      ctx.quadraticCurveTo(...P(-0.565, -0.012), ...P(-0.585, 0.022));
      ctx.bezierCurveTo(...P(-0.54, 0.014), ...P(-0.49, 0.008), ...P(-0.44, 0.006));
      ctx.bezierCurveTo(...P(-0.33, 0.022), ...P(-0.2, 0.07), ...P(-0.02, 0.083));      // the belly
      ctx.bezierCurveTo(...P(0.14, 0.088), ...P(0.27, 0.068), ...P(0.36, 0.035));       // the throat
      ctx.bezierCurveTo(...P(0.41, 0.02), ...P(0.46, 0.016), ...P(0.5, 0.004));         // lower jaw
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgb(top);
      // dorsal fin: tall and curved back
      ctx.beginPath(); ctx.moveTo(...P(0.04, -0.113));
      ctx.bezierCurveTo(...P(0.0, -0.16), ...P(-0.06, -0.215), ...P(-0.15, -0.235));
      ctx.bezierCurveTo(...P(-0.11, -0.19), ...P(-0.1, -0.14), ...P(-0.13, -0.093));
      ctx.closePath(); ctx.fill();
      // flipper, angled back and down
      ctx.beginPath(); ctx.moveTo(...P(0.25, 0.055));
      ctx.bezierCurveTo(...P(0.2, 0.1), ...P(0.15, 0.13), ...P(0.1, 0.145));
      ctx.bezierCurveTo(...P(0.13, 0.11), ...P(0.16, 0.08), ...P(0.17, 0.068));
      ctx.closePath(); ctx.fill();
      if (L < 18) return;
      // a wet highlight along the back
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.32 * light).toFixed(2) + ')'; ctx.lineWidth = Math.max(0.5, L * 0.01);
      ctx.beginPath(); ctx.moveTo(...P(0.3, -0.088)); ctx.bezierCurveTo(...P(0.15, -0.105), ...P(-0.05, -0.105), ...P(-0.25, -0.06)); ctx.stroke();
      // mouth line and eye
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(0.4, L * 0.005);
      ctx.beginPath(); ctx.moveTo(...P(0.5, 0.004)); ctx.quadraticCurveTo(...P(0.43, 0.006), ...P(0.38, -0.002)); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(...P(0.335, -0.035), Math.max(0.35, L * 0.008), 0, Math.PI * 2); ctx.fill();
    };
    const lifeDraw = (ctx, t, dt, W, H, S, hy, day, sunC, hor, bx) => {
      // the main visitors (dolphins or a whale) one at a time; seabirds come and go on their own
      life.next -= dt; life.nextBird -= dt;
      if (!life.ev && life.next <= 0) life.ev = startEvent(W, H, hy);
      if (!life.bird && life.nextBird <= 0 && pal.dark < 0.6) { life.force = 'birds'; life.bird = startEvent(W, H, hy); }
      const lightC = day ? [255, 255, 255] : [200, 210, 235];
      for (const e of [life.ev, life.bird]) {
        if (!e) continue;
        e.t += dt;
        if (e.kind === 'dolphins') {
          const light = day ? 1 : 0.4;
          for (const p of e.pod) {
            const wy = e.yW + p.dy;
            for (const [st, ld] of p.leaps) {
              const lt = e.t - st;
              const x = e.x0 + p.dx + e.speed * (e.t);
              if (lt >= 0 && lt <= ld) {
                const q = lt / ld, L = e.len * p.sc;
                if (!p['s' + st]) { p['s' + st] = 1; splash(x - L * 0.3 * e.dir, wy, L * 0.35); }
                if (q > 0.88 && !p['e' + st]) { p['e' + st] = 1; splash(x + L * 0.25 * e.dir, wy, L * 0.4); }
                const hgt = Math.sin(Math.PI * q) * L * 0.75, ang = -Math.cos(Math.PI * q) * 0.75;
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, wy + 0.5); ctx.clip();
                ctx.translate(x, wy - hgt + L * 0.12); ctx.scale(e.dir, 1); ctx.rotate(ang);
                dolphin(ctx, L, light);
                ctx.restore();
              }
            }
          }
          if (e.t >= e.dur) e.done = true;
        } else if (e.kind === 'birds') {
          // the birds: two strokes meeting at the body, wings beating in bursts
          ctx.strokeStyle = day ? 'rgba(40,45,52,0.80)' : 'rgba(200,210,220,0.65)'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          const step = dt * 30;   // the birds move a little each frame, paced for 30 frames a second
          const drawBird = (x, y, b, dir) => {
            b.flapPh += b.flapSpd * step;
            const env = Math.max(0, Math.sin(b.flapPh * 0.38)), wing = Math.sin(b.flapPh) * b.size * env;
            ctx.lineWidth = Math.max(0.8, b.size * 0.45);
            ctx.beginPath(); ctx.moveTo(x - b.size * dir, y + wing - b.size / 2.2); ctx.lineTo(x, y); ctx.lineTo(x - b.size * dir, y + wing + b.size / 2.2); ctx.stroke();
          };
          if (e.style === 'flock') {
            e.x += e.vx * dt;
            for (const b of e.birds) {
              // each bird wanders around its place in the flock, so the group keeps changing shape
              const a = b.a + Math.sin(t * b.f1 + b.p1) * 0.8, r = e.R * (0.35 + b.r * 0.65) * (0.8 + 0.3 * Math.sin(t * b.f2 + b.p2));
              drawBird(e.x + Math.cos(a) * r * 1.6, e.y + Math.sin(a) * r * 0.55, b, e.dir);
            }
            if ((e.dir > 0 && e.x - e.R * 2 > W) || (e.dir < 0 && e.x + e.R * 2 < 0)) e.done = true;
          } else {
            let gone = true;
            for (const b of e.birds) {
              b.x += b.vx * dt; b.y += b.vy * dt;
              drawBird(b.x, b.y, b, e.dir);
              if (!((e.dir > 0 && b.x > W + 80) || (e.dir < 0 && b.x < -80))) gone = false;
            }
            if (gone) e.done = true;
          }
          ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        } else if (e.kind === 'whale') {
          const y = seaY(H, hy, e.d), sz = W * 0.038 * (e.d / 0.12), light = day ? 1 : 0.45;
          // first a misty spout, then the back rolling over, then the tail lifting and slipping under
          if (e.t < 3.2) {
            const k = e.t / 3.2, h = sz * 1.1 * Math.min(1, k * 3);
            const g = ctx.createRadialGradient(e.x, y - h * 0.6, 0, e.x, y - h * 0.6, sz * 0.5 * (0.6 + k));
            g.addColorStop(0, rgb(lightC, (0.55 * (1 - k)).toFixed(3))); g.addColorStop(1, rgb(lightC, 0));
            ctx.fillStyle = g; ctx.save(); ctx.translate(e.x, y - h * 0.6); ctx.scale(0.7, 1.3); ctx.translate(-e.x, -(y - h * 0.6)); ctx.beginPath(); ctx.arc(e.x, y - h * 0.6, sz * 0.5 * (0.6 + k), 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
          const col = rgb([Math.round(30 * light + 6), Math.round(36 * light + 8), Math.round(44 * light + 10)]);
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y + 0.3); ctx.clip(); ctx.fillStyle = col;
          if (e.t > 2 && e.t < 6) {
            const k = (e.t - 2) / 4, bxw = e.x + (k - 0.5) * sz * 1.2 * e.dir, hgt = Math.sin(Math.PI * k) * sz * 0.22;
            ctx.beginPath(); ctx.ellipse(bxw, y, sz * 0.8, hgt + 0.3, 0, Math.PI, 0); ctx.fill();
            if (k > 0.35 && k < 0.8) { ctx.beginPath(); ctx.moveTo(bxw - sz * 0.15 * e.dir, y - hgt); ctx.lineTo(bxw - sz * 0.25 * e.dir, y - hgt - sz * 0.1); ctx.lineTo(bxw - sz * 0.32 * e.dir, y - hgt + 1); ctx.closePath(); ctx.fill(); }
          }
          if (e.t > 6 && e.t < 10) {
            const k = (e.t - 6) / 4, lift = Math.sin(Math.PI * k) * sz * 0.75, fx = e.x + sz * 0.6 * e.dir;
            ctx.save(); ctx.translate(fx, y - lift); ctx.scale(e.dir, 1);
            ctx.beginPath(); ctx.moveTo(-sz * 0.05, sz * 0.4); ctx.lineTo(-sz * 0.04, 0); ctx.quadraticCurveTo(-sz * 0.25, -sz * 0.05, -sz * 0.45, -sz * 0.18); ctx.quadraticCurveTo(-sz * 0.2, sz * 0.02, 0, 0.02 * sz); ctx.quadraticCurveTo(sz * 0.2, sz * 0.02, sz * 0.45, -sz * 0.18); ctx.quadraticCurveTo(sz * 0.25, -sz * 0.05, sz * 0.04, 0); ctx.lineTo(sz * 0.05, sz * 0.4); ctx.closePath(); ctx.fill();
            // water streaming off it
            ctx.fillStyle = rgb(lightC, (0.5 * Math.sin(Math.PI * k)).toFixed(3));
            for (let i = 0; i < 6; i++) ctx.fillRect(-sz * 0.4 + i * sz * 0.16, -sz * 0.12 + ((t * 40 + i * 13) % (lift + 1)), 0.6, 1.2);
            ctx.restore();
            if (!e.sp1 && k > 0.85) { e.sp1 = 1; splash(fx, y, sz * 0.4); }
          }
          ctx.restore();
          if (e.t >= e.dur) e.done = true;
        }
        if (e.done) { if (e === life.bird) { life.bird = null; life.nextBird = rr(4, 12); } else { life.ev = null; life.next = rr(5, 12); } }
      }
      drawSplashes(ctx, dt, lightC);
    };
    // the state of the sea, from the weather entity's wind (and its storms)
    const seaState = () => {
      const st = this._hass?.states?.[(this._config?.screensaver_weather || '').trim()];
      const a = st?.attributes || {}, cond = st?.state || '';
      let ws = Number(a.wind_speed);
      const unit = String(a.wind_speed_unit || this._hass?.config?.unit_system?.wind_speed || 'km/h').toLowerCase();
      if (!isFinite(ws)) ws = cond === 'windy' || cond === 'windy-variant' ? 30 : 12;
      const kmh = unit.includes('mph') ? ws * 1.609 : unit.includes('m/s') ? ws * 3.6 : unit.includes('kn') ? ws * 1.852 : ws;
      let chop = Math.max(0, Math.min(1, (kmh - 5) / 45));
      if (/lightning|pouring|hail/.test(cond)) chop = Math.max(chop, 0.75);
      return { chop, rain: /rain|pouring|lightning-rainy|hail/.test(cond), storm: /lightning/.test(cond) };
    };
    let sea = seaState();
    // white caps when it's windy: small bright flecks breaking on the crests and fading
    const capsDraw = (ctx, dt, W, H, hy, lightC) => {
      const want = sea.chop > 0.4 ? (sea.chop - 0.4) * 90 : 0;
      if (life.caps.length < want && Math.random() < dt * want * 0.8) {
        const d = 0.05 + Math.pow(Math.random(), 0.7) * 0.95;
        life.caps.push({ x: Math.random() * W, d, t: 0, max: rr(1.2, 2.6), w: rr(4, 12) * (d + 0.05) * (W / 400) * (0.6 + sea.chop), sk: (Math.random() - 0.5) * 0.15 });
      }
      life.caps = life.caps.filter(c => {
        c.t += dt;
        if (c.t > c.max) return false;
        const k = c.t / c.max, y = seaY(H, hy, c.d), a = Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) * 0.55;
        ctx.fillStyle = rgb(lightC, a.toFixed(3));
        ctx.beginPath(); ctx.ellipse(c.x, y, c.w * (0.7 + k * 0.8), Math.max(0.3, c.w * 0.06), c.sk, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgb(lightC, (a * 0.35).toFixed(3)); ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.3, y + c.w * 0.08, c.w * (0.5 + k), Math.max(0.3, c.w * 0.05), c.sk, 0, Math.PI * 2); ctx.fill();
        return true;
      });
    };
    // distant weather: a grey shower hanging under a cloud far out, and silent lightning in a storm
    const wx = { x: 0.15 + Math.random() * 0.7, flash: 0, nextFlash: 6 + Math.random() * 10 };
    const weatherDraw = (ctx, t, dt, W, H, hy, day) => {
      if (sea.rain) {
        const cx = W * wx.x, cw = W * 0.28, top = hy * 0.62;
        const cc = day ? [96, 102, 116] : [22, 26, 38];
        ctx.save();
        // the cloud
        for (let i = 0; i < 7; i++) {
          const px = cx + (i - 3) * cw * 0.16, py = top + Math.sin(i * 1.7) * hy * 0.025, r = cw * (0.2 + (i % 3) * 0.05);
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, rgb(cc, 0.6)); g.addColorStop(1, rgb(cc, 0));
          ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.45); ctx.translate(-px, -py); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        // the rain falling from it to the sea: a soft grey veil, densest where it meets the sea and fading at the sides
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
        const vr = cw * 0.4;
        ctx.translate(cx, hy); ctx.scale(1, (hy - top) / vr); 
        const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, vr);
        veil.addColorStop(0, rgb(cc, 0.34)); veil.addColorStop(0.6, rgb(cc, 0.2)); veil.addColorStop(1, rgb(cc, 0));
        ctx.fillStyle = veil; ctx.beginPath(); ctx.arc(0, 0, vr, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        for (let i = 0; i < 5; i++) {
          const sx = cx - cw * 0.25 + i * cw * 0.12 + Math.sin(t * 0.25 + i * 2.1) * cw * 0.03, sw = cw * (0.04 + (i % 2) * 0.03);
          const g = ctx.createLinearGradient(sx - sw, 0, sx + sw, 0);
          g.addColorStop(0, rgb(cc, 0)); g.addColorStop(0.5, rgb(cc, 0.12)); g.addColorStop(1, rgb(cc, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - sw, top + hy * 0.03); ctx.lineTo(sx + sw, top + hy * 0.03); ctx.lineTo(sx + sw - cw * 0.06, hy); ctx.lineTo(sx - sw - cw * 0.06, hy); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      if (sea.storm) {
        wx.nextFlash -= dt;
        if (wx.nextFlash <= 0) { wx.flash = 1; wx.flash2 = Math.random() < 0.6 ? 0.25 : 0; wx.nextFlash = 8 + Math.random() * 22; wx.fx = sea.rain ? W * wx.x : W * (0.2 + Math.random() * 0.6); }
        if (wx.flash > 0 || wx.flash2 > 0) {
          if (wx.flash2 > 0 && wx.flash < 0.3) { wx.flash2 -= dt; if (wx.flash2 <= 0) wx.flash = 0.8; }
          const a = Math.max(0, wx.flash) * (day ? 0.35 : 0.7);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(wx.fx, hy * 0.6, 0, wx.fx, hy * 0.6, W * 0.6);
          g.addColorStop(0, 'rgba(200,210,255,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(200,210,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.restore();
          wx.flash -= dt * 6;
        }
      }
    };
    const water = (ctx, t, W, H, S, hy, pattern, alphaFn, speed, scale, drift) => {
      const K = (H - hy) / (0.55 * 1.6 * W / TW);
      for (const [y, st] of B.rows) {
        const d = (y + st / 2 - hy) / (H - hy);
        const a = alphaFn(d);
        if (a < 0.01) continue;
        const z = 1 / (d + 0.035);
        // ripples as deep as they are wide (a little flattened by the angle), so the water doesn't streak
        const v = (((z * K / scale + t * speed) % TH) + TH) % TH;
        const sx = (d + 0.035) * scale * W / TW * 1.6;
        const off = W / 2 - sx * (TW / 2 + t * drift);
        ctx.globalAlpha = a;
        ctx.setTransform(S * sx, 0, 0, S * st, S * off, S * (y - v * st));
        ctx.fillRect((-off) / sx - 1, v, W / sx + 2, 1);
      }
      ctx.setTransform(S, 0, 0, S, 0, 0); ctx.globalAlpha = 1;
    };
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized, S) => {
      const hy = Math.round(H * 0.55);
      if (resized || !B) build(W, H, S, hy);
      if (t - palAt > 30) { pal = palette(); sea = seaState(); palAt = t; }
      if (!B.hiP) { B.hiP = ctx.createPattern(tex.hi, 'repeat'); B.loP = ctx.createPattern(tex.lo, 'repeat'); }
      const [top, mid, hor, seaFar, seaNear, sunC, cLit, cShd] = pal.c;
      // the sky
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, rgb(top)); sky.addColorStop(0.55, rgb(mid)); sky.addColorStop(1, rgb(hor));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy + 1);
      if (pal.dark > 0.15) {
        ctx.globalCompositeOperation = 'lighter';
        for (const s of B.stars) {
          const a = (pal.dark - 0.15) * (0.6 + 0.4 * Math.sin(t * s.tw + s.ph)) * (1 - s.y / hy * 0.6);
          ctx.globalAlpha = a;
          if (s.s > 2) ctx.drawImage(SPR[0], s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
          else { ctx.fillStyle = '#e6ecff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // the sun low over the sea (rising on the left, setting on the right), or the moon at night
      const day = pal.el > -5;
      const bx = W * (pal.rising ? 0.3 : 0.7);
      const br = Math.min(W, H) * (day ? 0.045 : 0.05);
      const by = day ? hy - Math.max(-br * 1.2, Math.min(hy * 0.75, (pal.el / 35) * hy * 0.75)) : hy * 0.28;
      if (day) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        const low = Math.max(0, 1 - Math.max(0, pal.el) / 20);
        const cor = ctx.createRadialGradient(bx, by, 0, bx, by, br * 9);
        const warmC = sunC.map((c, i) => Math.round(c * [1, 0.86, 0.62][i]));   // a deeper gold for the glow, so it warms the blue rather than paling it
        cor.addColorStop(0, rgb(warmC, 0.75)); cor.addColorStop(0.12, rgb(warmC, 0.4)); cor.addColorStop(0.35, rgb(warmC, 0.12 + low * 0.08)); cor.addColorStop(1, rgb(warmC, 0));
        ctx.fillStyle = cor; ctx.fillRect(0, 0, W, hy);
        // a wide warm glow along the horizon when the sun is low
        if (low > 0) {
          const hg = ctx.createRadialGradient(bx, hy, 0, bx, hy, W * 0.8);
          hg.addColorStop(0, rgb(sunC, 0.35 * low)); hg.addColorStop(1, rgb(sunC, 0));
          ctx.save(); ctx.translate(bx, hy); ctx.scale(1, 0.35); ctx.translate(-bx, -hy); ctx.fillStyle = hg; ctx.fillRect(0, hy - hy / 0.35 - 4, W, hy / 0.35 + 8); ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        const disc = ctx.createRadialGradient(bx - br * 0.2, by - br * 0.2, 0, bx, by, br);
        disc.addColorStop(0, '#fffdf2'); disc.addColorStop(0.55, rgb(sunC.map(c => Math.round(c + (255 - c) * 0.6)))); disc.addColorStop(1, rgb(sunC));
        ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        this._saverMoon(ctx, bx, by, br, S, 1.3);
      }
      // clouds, lit from the sun's side
      const nC = Math.round(B.clouds.length * pal.cloud);
      for (let i = 0; i < nC; i++) {
        const c = B.clouds[i];
        c.x += c.sp * dt * (0.6 + c.rank);
        if (c.x - c.w > W) c.x = -c.w;
        const persp = 0.35 + 0.65 * (1 - c.y / hy);
        for (const p of c.puffs) {
          const x = c.x + p.dx * c.w, y = c.y + p.dy * c.w * 0.3 * persp, r = p.r * c.w * persp;
          const lx = (bx - x) / W * r * 0.5;
          const g = ctx.createRadialGradient(x + lx, y - r * 0.25, 0, x, y, r);
          g.addColorStop(0, rgb(cLit, 0.3 * (0.5 + pal.cloud * 0.5)));
          g.addColorStop(0.5, rgb(cShd, 0.2 * (0.5 + pal.cloud * 0.5))); g.addColorStop(1, rgb(cShd, 0));
          ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.38); ctx.translate(-x, -y);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      // the sun shining through: a bright glare over any cloud in front of it
      if (day) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        const gc = sunC.map((c, i) => Math.round(c * [1, 0.8, 0.5][i]));
        const gl = ctx.createRadialGradient(bx, by, br * 0.6, bx, by, br * 2);
        gl.addColorStop(0, rgb(gc, 0.3)); gl.addColorStop(1, rgb(gc, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, by, br * 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      weatherDraw(ctx, t, dt, W, H, hy, day);
      // the sea: the sky's colour reflected near the horizon, deepening toward you
      const sg = ctx.createLinearGradient(0, hy, 0, H);
      sg.addColorStop(0, rgb(hor)); sg.addColorStop(0.06, rgb(seaFar)); sg.addColorStop(0.45, rgb(seaFar.map((c, i) => Math.round(c * 0.6 + seaNear[i] * 0.4)))); sg.addColorStop(1, rgb(seaNear));
      ctx.fillStyle = sg; ctx.fillRect(0, hy, W, H - hy);
      // the ripples: two layers of the same water, at different sizes and speeds, so it never looks repeated
      // calmer and glassier on a still day, choppier and quicker in the wind
      const chopA = 0.55 + 0.9 * sea.chop, spA = 9 * (0.6 + sea.chop * 1.2), spB = 13 * (0.6 + sea.chop * 1.2);
      const shadeA = d => Math.min(1, d * 6) * (0.35 + 0.35 * d) * chopA;
      const lightA = d => Math.min(1, d * 5) * (0.08 + 0.22 * d) * (day ? 1 : 0.55) * chopA;
      ctx.fillStyle = B.loP; water(ctx, t, W, H, S, hy, B.loP, shadeA, spA, 1, 2.2);
      ctx.fillStyle = B.hiP; water(ctx, t, W, H, S, hy, B.hiP, lightA, spA, 1, 2.2);
      ctx.fillStyle = B.loP; water(ctx, t * 0.7 + 40, W, H, S, hy, B.loP, d => shadeA(d) * 0.5, spB, 0.55, -1.4);
      ctx.fillStyle = B.hiP; water(ctx, t * 0.7 + 40, W, H, S, hy, B.hiP, d => lightA(d) * 0.6, spB, 0.55, -1.4);
      capsDraw(ctx, dt, W, H, hy, day ? [255, 255, 255] : [190, 200, 225]);
      // the path of light: crests sparkling under the sun or moon, strongest in the middle and fading out softly to the sides
      const strength = day ? Math.max(0.3, 1 - Math.max(0, pal.el) / 50) : 0.75;
      const spread = W * (day ? 0.3 : 0.18);
      const mkey = [Math.round(bx), Math.round(br), Math.round(spread), W, H].join('|');
      if (!B.glit || B.glit.key !== mkey) {
        const [gc, gg] = this._saverOff(W, H, S), [mc, mg] = this._saverOff(W, H, S);
        for (const [y, st] of B.rows) {
          const d = (y + st / 2 - hy) / (H - hy), half = br * 0.7 + spread * d;
          const lg = mg.createLinearGradient(bx - half, 0, bx + half, 0);
          lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.3, 'rgba(0,0,0,0.35)'); lg.addColorStop(0.5, 'rgba(0,0,0,1)'); lg.addColorStop(0.7, 'rgba(0,0,0,0.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
          mg.fillStyle = lg; mg.fillRect(bx - half, y, half * 2, st);
        }
        B.glit = { key: mkey, gc, gg, mc };
      }
      {
        const { gc, gg, mc } = B.glit;
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; gg.clearRect(0, 0, gc.width, gc.height);
        gg.setTransform(S, 0, 0, S, 0, 0);
        const pc = day ? sunC : [215, 225, 255];
        gg.fillStyle = rgb(pc, 0.22 * strength); gg.fillRect(0, hy, W, H - hy);
        gg.fillStyle = B.hiP; water(gg, t, W, H, S, hy, B.hiP, d => Math.min(1, d * 14) * strength, spA, 1, 2.2);
        gg.fillStyle = B.hiP; water(gg, t * 0.7 + 40, W, H, S, hy, B.hiP, d => Math.min(1, d * 14) * strength * 0.7, spB, 0.55, -1.4);
        gg.globalCompositeOperation = 'source-in';
        gg.fillStyle = rgb(day ? pc : pc.map(c => Math.min(255, c + 30))); gg.fillRect(0, hy, W, H - hy);
        gg.globalCompositeOperation = 'destination-in';
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(gc, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      // haze along the horizon, so the far water melts into the sky
      const hz = ctx.createLinearGradient(0, hy - H * 0.04, 0, hy + H * 0.07);
      hz.addColorStop(0, rgb(hor, 0)); hz.addColorStop(0.4, rgb(hor, 0.55)); hz.addColorStop(1, rgb(hor, 0));
      ctx.fillStyle = hz; ctx.fillRect(0, hy - H * 0.04, W, H * 0.11);
      // dolphins, seabirds or a whale, now and then
      lifeDraw(ctx, t, dt, W, H, S, hy, day, sunC, hor, bx);
      // a little darker at the bottom corners
      const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.4, W / 2, H * 0.45, Math.max(W, H) * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      this._saverGrain(ctx, W, H, 0.03);
    });
  }
}

// ── Live Wallpaper & Theme pickers (conversation details) ────────────────────
// Each person picks their own, for one chat or for all their chats. Nobody
// else sees them.
Object.assign(CrowMessengerCard.prototype, {

  // The shared page: a back button and title, a This Chat / All Chats switch,
  // a grid of choices that's built once (so live previews keep running), and
  // the actions underneath.
  _pickerPage(tid, title, { grid, scopeOf, selected, actions, pick, onShow, onHide }) {
    const s = this._s;
    const el = this._el(`<div>
      <div class="scroll"><div class="ipage">
        <div class="segc" role="tablist"><button data-scope="tid" role="tab">This Chat</button><button data-scope="*" role="tab">All Chats</button></div>
        <div class="pick-grid">${grid}</div>
        <div class="pk-actions"></div>
      </div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div class="title">${esc(title)}</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    let scope = scopeOf();
    const key = () => (scope === '*' ? '*' : tid);
    page.refresh = (what) => {
      if (!['all', 'background', 'theme', 'thread'].includes(what)) return;
      if (!s.threads.has(tid) && s.ready) return;
      this._applyPageTheme(el, tid);
      el.querySelectorAll('.segc button').forEach(b => b.classList.toggle('on', (b.dataset.scope === '*') === (scope === '*')));
      const on = selected(key());
      el.querySelectorAll('.pick').forEach(p => p.classList.toggle('on', p.dataset.id === on));
      this._set(el.querySelector('.pk-actions'), actions(key()));
    };
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      const sc = e.target.closest('[data-scope]')?.dataset.scope;
      if (sc) { scope = sc; page.refresh('all'); return; }
      const p = e.target.closest('.pick');
      if (p) { pick(key(), p.dataset.id); return; }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) pick(key(), null, act);
    });
    page.onShow = () => onShow?.(el);
    page.onHide = () => onHide?.(el);
    page.destroy = () => onHide?.(el);
    return page;
  },

  _pg_live({ tid }) {
    const s = this._s;
    const previews = new Map();
    // None first, then the Live Wallpapers
    const grid = `<div class="pick" data-id="none" role="button" aria-label="None">
      <div class="tile none-tile"><span class="none-x">${ICON.x}</span><span class="ck">${ICON.check}</span></div>
      <div class="nm">None</div></div>` + CM_LIVE.map(l => `<div class="pick" data-id="${l.id}" role="button" aria-label="${esc(l.name)}">
      <div class="tile" style="background:${l.thumb}"><div class="live" data-live="${l.id}"></div><span class="ck">${ICON.check}</span></div>
      <div class="nm">${esc(l.name)}</div></div>`).join('');
    // what's showing: a Live Wallpaper's id, 'none', or '' for a photo
    const live = (v) => (!v || v === 'none' ? 'none' : v.startsWith('live:') ? v.slice(5) : '');
    return this._pickerPage(tid, 'Background', {
      grid,
      scopeOf: () => (s.backgrounds[tid] ? 'tid' : s.backgrounds['*'] ? '*' : 'tid'),
      // what this chat (or every chat) shows now
      selected: (k) => live(k === '*' ? s.backgrounds['*'] : (s.backgrounds[tid] || s.backgrounds['*'])),
      actions: (k) => {
        const mine = s.backgrounds[k];
        const rows = [];
        if (mine && k !== '*' && s.backgrounds['*']) rows.push(`<div class="gr blue" data-act="rm"><div class="gl">Use the All Chats Background</div></div>`);
        const photo = (k === '*' ? s.backgrounds['*'] : (s.backgrounds[tid] || s.backgrounds['*'])) || '';
        return `<div class="pick-note">${photo.startsWith('data:') ? 'A photo is set now. Choose None or a Live Wallpaper to replace it. ' : ''}Live Wallpapers move gently behind your messages, and pause when the chat isn’t on screen.</div>`
          + (rows.length ? `<div class="group">${rows.join('')}</div>` : '');
      },
      pick: async (k, id, act) => {
        try {
          if (act === 'rm') { await this._ws('background/set', { key: k, image: null }); return; }
          if (id === 'none') {
            // no background here: for one chat that has to override an All Chats background
            await this._ws('background/set', { key: k, image: k !== '*' && s.backgrounds['*'] ? 'none' : null });
            return;
          }
          await this._ws('background/set', { key: k, image: `live:${id}` });
          this._toast(`${cmLiveInfo(id)?.name} set for ${k === '*' ? 'all chats' : 'this chat'}`);
        } catch (err) { this._toast(err.message); }
      },
      // the previews only run while this page is showing
      onShow: (el) => {
        el.querySelectorAll('[data-live]').forEach(box => {
          if (previews.has(box)) return;
          const w = new CrowLiveWallpaper(box, box.dataset.live, this._hass);
          previews.set(box, w); this._lives.add(w);
        });
      },
      onHide: () => { previews.forEach(w => { w.stop(); this._lives.delete(w); }); previews.clear(); },
    });
  },

  _pg_theme({ tid }) {
    const s = this._s;
    const dark = this._isDark();
    const grid = COLOUR_THEMES.map(t => {
      const v = this._themeVars(t.id, dark);
      const style = Object.entries(v).map(([k, x]) => `${k}:${x}`).join(';');
      return `<div class="pick" data-id="${t.id}" role="button" aria-label="${esc(t.name)}">
        <div class="tile th" style="${style};background:var(--cm-bg)">
          <div class="b r" style="background:var(--cm-recv)"></div>
          <div class="b s" style="background:var(--cm-sent)"></div>
          <div class="b s2" style="background:var(--cm-sent)"></div>
          <span class="ck">${ICON.check}</span></div>
        <div class="nm">${esc(t.name)}</div></div>`;
    }).join('');
    return this._pickerPage(tid, 'Theme', {
      grid,
      scopeOf: () => (s.themes[tid] ? 'tid' : s.themes['*'] ? '*' : 'tid'),
      selected: (k) => (k === '*' ? s.themes['*'] : (s.themes[tid] || s.themes['*'])) || 'classic',
      actions: (k) => {
        const mine = s.themes[k];
        const rows = [];
        if (mine && k !== '*' && s.themes['*']) rows.push(`<div class="gr blue" data-act="rm"><div class="gl">Use the All Chats Theme</div></div>`);
        return `<div class="pick-note">A theme sets the bubble, accent and background colours. Classic is the standard Messages blue and grey.</div>`
          + (rows.length ? `<div class="group">${rows.join('')}</div>` : '');
      },
      pick: async (k, id, act) => {
        try {
          // Classic for every chat is the same as no theme at all
          const theme = act === 'rm' || (k === '*' && id === 'classic') ? null : id;
          await this._ws('theme/set', { key: k, theme });
        } catch (err) { this._toast(err.message); }
      },
    });
  },
});

// ── AI Features ──────────────────────────────────────────────────────────────
// Suggested replies and Writing Tools live in the composer; the rest is here:
// Catch Up, Translate, Add to Calendar / Add Reminder and photo descriptions.
// Everything goes through the integration (crow_messenger/ai), which uses the
// Home Assistant AI Task an administrator chose in the editor.
Object.assign(CrowMessengerCard.prototype, {

  // A message people can understand. Crow Messenger's own AI and speech-to-text errors are
  // already written that way; anything else (a dropped connection, a raw error from a
  // service) gets a plain one instead.
  _aiError(err, fallback = 'The AI couldn’t do that just now. Try again in a moment.') {
    const code = String(err?.code ?? '');
    if (/^(ai_|stt_)/.test(code) && err?.message) return err.message;
    const msg = String(err?.message || err || '');
    if (code === '3' || /connection|socket|network|offline|lost/i.test(msg)) return 'Couldn’t reach Home Assistant. Check the connection and try again.';
    if (code === 'not_found') return 'That message is no longer available.';
    return fallback;
  },

  async _aiCatchUp(tid, box, count) {
    box.dataset.busy = '1';
    this._set(box, `<div class="cu-card g"><div class="cu-text cu-wait">Reading ${count} messages…</div></div>`);
    try {
      const r = await this._ws('ai', { action: 'summarise', thread_id: tid, count });
      this._set(box, `<div class="cu-card g"><div class="cu-h">${ICON.bubble}<b>Catch Up</b><button class="cu-x" data-a="catchup-x" aria-label="Close">${ICON.x}</button></div><div class="cu-text sel">${esc(r.result || 'Nothing to summarise.')}</div></div>`);
    } catch (err) {
      this._toast(this._aiError(err, 'Catch Up isn’t available right now. Try again in a moment.'));
      box.hidden = true;
    }
    delete box.dataset.busy;
  },

  async _aiTranslate(tid, m) {
    this._toast('Translating…');
    try {
      // the language your phone uses, by name ("British English"), so the AI knows exactly what to aim for
      const code = navigator.language || this._hass.language || 'en';
      let language = code;
      try { language = new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code; } catch (e) { /* older browsers */ }
      const r = await this._ws('ai', { action: 'translate', thread_id: tid, message_id: m.id, language });
      this._translations.set(m.id, r.result || '');
      this._refresh('messages', tid);
    } catch (err) { this._toast(this._aiError(err, 'Couldn’t translate that just now. Try again in a moment.')); }
  },

  async _aiAddFrom(tid, m, kind) {
    this._toast(kind === 'event' ? 'Finding the event…' : 'Making a reminder…');
    try {
      const r = await this._ws('ai', { action: kind, thread_id: tid, message_id: m.id });
      this._nav('aiAdd', { kind, draft: r.result || {} });
    } catch (err) { this._toast(this._aiError(err, 'Couldn’t read that message just now. Try again in a moment.')); }
  },

  // Calendars that can take new events, and to-do lists that can take new items
  _aiTargets(kind) {
    const domain = kind === 'event' ? 'calendar.' : 'todo.';
    return Object.values(this._hass.states)
      .filter(st => st.entity_id.startsWith(domain) && ((st.attributes.supported_features || 0) & 1))
      .map(st => ({ id: st.entity_id, name: st.attributes.friendly_name || st.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  // The New Event / New Reminder page, filled in by the AI and checked by you before it's added
  _pg_aiAdd({ kind, draft }) {
    const ev = kind === 'event';
    const targets = this._aiTargets(kind);
    const key = ev ? 'crowMessengerCalendar' : 'crowMessengerTodoList';
    let last = ''; try { last = localStorage.getItem(key) || ''; } catch (e) { /* private mode */ }
    const pick = targets.find(t => t.id === last)?.id || targets[0]?.id || '';
    const hasTime = (v) => /T\d{2}:\d{2}/.test(v || '');
    const d = (v) => (v || '').slice(0, 10), dt = (v) => (v || '').slice(0, 16);
    const allDay = ev ? (draft.all_day === true || !hasTime(draft.start)) : !hasTime(draft.due);
    const el = this._el(`<div>
      <div class="scroll"><div class="ce ai-add">
        <div class="ai-add-h">${ev ? ICON.cal : ICON.todo}<span>${ev ? 'Read from the message. Check the details, then tap Add.' : 'Read from the message. Check it, then tap Add.'}</span></div>
        <div class="group">
          <div class="fi"><input type="text" data-k="title" value="${esc(draft.title || '')}" placeholder="${ev ? 'Title' : 'Reminder'}"></div>
          ${ev ? `<div class="fi"><input type="text" data-k="location" value="${esc(draft.location || '')}" placeholder="Location"></div>` : ''}
        </div>
        <div class="group">
          <label class="fi tgl"><span class="lab2">${ev ? 'All-day' : 'Remind me on a day'}</span><span class="tsw"><input type="checkbox" data-k="${ev ? 'allday' : 'hasdue'}" ${ev ? (allDay ? 'checked' : '') : (draft.due ? 'checked' : '')}><span></span></span></label>
          ${ev ? `
          <div class="fi"><span class="lab2">Starts</span><input type="date" data-k="sd" value="${esc(d(draft.start))}"><input type="time" data-k="st" value="${esc(hasTime(draft.start) ? draft.start.slice(11, 16) : '09:00')}"></div>
          <div class="fi"><span class="lab2">Ends</span><input type="date" data-k="ed" value="${esc(d(draft.end || draft.start))}"><input type="time" data-k="et" value="${esc(hasTime(draft.end) ? draft.end.slice(11, 16) : '10:00')}"></div>`
          : `<div class="fi due"><span class="lab2">Date</span><input type="date" data-k="dd" value="${esc(d(draft.due) || new Date().toISOString().slice(0, 10))}"></div>
          <label class="fi tgl due"><span class="lab2">Time</span><span class="tsw"><input type="checkbox" data-k="hastime" ${hasTime(draft.due) ? 'checked' : ''}><span></span></span></label>
          <div class="fi due tm"><span class="lab2">At</span><input type="time" data-k="dtm" value="${esc(hasTime(draft.due) ? dt(draft.due).slice(11) : '09:00')}"></div>`}
        </div>
        <div class="group">
          <div class="fi"><span class="lab2">${ev ? 'Calendar' : 'List'}</span><select class="fs" data-k="target">${targets.length ? targets.map(t => `<option value="${esc(t.id)}" ${t.id === pick ? 'selected' : ''}>${esc(t.name)}</option>`).join('') : `<option value="">No ${ev ? 'calendars' : 'to-do lists'} can be added to</option>`}</select></div>
        </div>
        ${draft.note ? `<div class="ai-note"><b>From the message</b>${esc(draft.note)}</div>` : ''}
      </div></div>
      <div class="edge top"></div>
      <div class="top"><button class="pill g" data-a="cancel">Cancel</button><div class="title">${ev ? 'New Event' : 'New Reminder'}</div><button class="pill g accent" data-a="add">Add</button></div>
    </div>`);
    const page = { el };
    const q = (k) => el.querySelector(`[data-k="${k}"]`);
    const sync = () => {
      if (ev) el.querySelectorAll('[data-k="st"],[data-k="et"]').forEach(i => { i.hidden = q('allday').checked; });
      else {
        const on = q('hasdue').checked;
        el.querySelectorAll('.due').forEach(r => { r.hidden = !on; });
        el.querySelector('.tm').hidden = !on || !q('hastime').checked;
      }
    };
    el.addEventListener('change', sync);
    sync();
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'cancel') { this._back(); return; }
      if (a !== 'add') return;
      const title = q('title').value.trim();
      const target = q('target').value;
      if (!title) { this._toast(ev ? 'Add a title' : 'Add what to be reminded about'); return; }
      if (!target) { this._toast(ev ? 'There’s no calendar in Home Assistant that can take new events' : 'There’s no to-do list in Home Assistant that can take new items'); return; }
      const btn = e.target.closest('button'); btn.disabled = true;
      try {
        if (ev) {
          const data = { summary: title };
          const loc = q('location').value.trim(); if (loc) data.location = loc;
          if (draft.note) data.description = draft.note;
          const sd = q('sd').value, ed = q('ed').value || sd;
          if (!sd) throw new Error('Choose a start date');
          if (q('allday').checked) {
            // the end date of an all-day event is the day after it finishes
            const end = new Date(`${ed}T12:00:00`); end.setDate(end.getDate() + 1);
            Object.assign(data, { start_date: sd, end_date: end.toISOString().slice(0, 10) });
          } else {
            let start = `${sd} ${q('st').value || '09:00'}:00`, end = `${ed} ${q('et').value || '10:00'}:00`;
            if (end <= start) { const x = new Date(start.replace(' ', 'T')); x.setHours(x.getHours() + 1); end = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:00`; }
            Object.assign(data, { start_date_time: start, end_date_time: end });
          }
          await this._hass.callService('calendar', 'create_event', data, { entity_id: target });
        } else {
          const data = { item: title };
          if (draft.note) data.description = draft.note;
          if (q('hasdue').checked && q('dd').value) {
            if (q('hastime').checked) data.due_datetime = `${q('dd').value} ${q('dtm').value || '09:00'}:00`;
            else data.due_date = q('dd').value;
          }
          await this._hass.callService('todo', 'add_item', data, { entity_id: target });
        }
        try { localStorage.setItem(key, target); } catch (err) { /* private mode */ }
        this._toast(ev ? 'Added to your calendar' : 'Reminder added');
        this._back();
      } catch (err) {
        btn.disabled = false;
        console.warn('Crow Messenger: adding failed', err);
        this._toast(ev ? 'Couldn’t add it to that calendar. It may not accept new events from Home Assistant.' : 'Couldn’t add it to that list. It may not accept new items from Home Assistant.');
      }
    });
    return page;
  },
});

// ── PDF exports ──────────────────────────────────────────────────────────────
// A conversation, one contact card, or the whole address book, made on the
// phone with jsPDF (loaded from cdnjs the first time) and shown in
// a preview with every page drawn by PDF.js. Nothing goes through the server.
// Text uses Noto Sans so accents and symbols come out right; emoji and scripts
// the font doesn't cover (Chinese, Arabic…) are drawn by the phone as images.
const PDF_FONT_BASE = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans@0.4.2/';
const PDF_IMG_RUN = /(\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*|[\u{1F1E6}-\u{1F1FF}]{2}|[֐-ࣿऀ-෿฀-๿ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯\u{20000}-\u{2FFFF}]+)/gu;

Object.assign(CrowMessengerCard.prototype, {

  // Polls, Check Ins, stickers, shared devices, replies and tapbacks, written out as text for the PDF
  _pdfFlat(m) {
    if (m.type === 'system') return m;
    let text = m.text || '';
    if (m.type === 'poll') {
      const votes = m.poll?.votes || {};
      text = `Poll: ${m.text}\n` + (m.poll?.options || []).map(o => {
        const n = Object.values(votes).filter(v => v.includes(o.id)).length;
        return `• ${o.text} — ${n} vote${n === 1 ? '' : 's'}`;
      }).join('\n');
    } else if (m.type === 'checkin') {
      const ci = m.checkin || {};
      text = `Check In · ${ci.zone_name || 'Home'} · ${{ active: 'expected by ' + fmtTime(ci.due_ts, this._hass), late: 'not arrived as expected', arrived: 'arrived', ended: 'ended' }[ci.status] || ''}`;
    } else if (m.type === 'sticker') text = m.sticker?.emoji || 'Sticker';
    else if (m.type === 'entity') {
      const st = this._hass?.states?.[m.entity?.entity_id];
      text = `Shared ${st?.attributes?.friendly_name || m.entity?.entity_id}${m.text ? ' — ' + m.text : ''}`;
    }
    else if (m.type === 'call') text = `${{ facetime: 'FaceTime', facetime_audio: 'FaceTime Audio' }[m.call?.kind] || 'Phone call'} · ${m.sender === this._s.me ? 'You called' : this._userName(m.sender, true) + ' called'}`;
    else if (m.type === 'location') text = `Location: ${m.location?.label ? m.location.label + ' · ' : ''}${(+m.location?.lat).toFixed(5)}, ${(+m.location?.lon).toFixed(5)}`;
    else if (m.type === 'checklist') text = `Checklist: ${m.text}\n` + (m.checklist?.items || []).map(i => `${i.done ? '☑' : '☐'} ${i.text}`).join('\n');
    else if (m.type === 'event') text = `Event: ${m.text} · ${new Date(m.event?.start).toLocaleString(locale(this._hass), { dateStyle: 'medium', timeStyle: m.event?.all_day ? undefined : 'short' })}${m.event?.location ? ' · ' + m.event.location : ''}`;
    else if (m.type === 'contact') text = `Contact: ${[m.contact?.first, m.contact?.last].filter(Boolean).join(' ') || m.contact?.company}${m.contact?.phones?.[0] ? ' · ' + m.contact.phones[0].value : ''}`;
    if (m.forwarded) text = `(Forwarded) ${text}`;
    if (m.view_once) text = '(View Once photo)';
    if (m.effect === 'invisible') text = `(Invisible Ink) ${text}`;
    if (m.reply_to && m.reply_preview && !m.reply_preview.gone) text = `↩ ${m.reply_preview.text}\n${text}`;
    if (m.edits?.length) text += ' (edited)';
    if (m.action_taken) text += `\n✓ ${m.action_taken.title} · ${m.action_taken.user === this._s.me ? 'You' : this._userName(m.action_taken.user, true)}`;
    const r = Object.entries(m.reactions || {});
    if (r.length) text += `\n${r.map(([u, e]) => `${e} ${this._userName(u, true)}`).join('  ')}`;
    if (m.view_once) return { ...m, text, attachments: [] };
    return text === m.text ? m : { ...m, text };
  },

  _pdfOn(type) {
    if (this._config.pdf_enabled === false) return false;
    return !type || this._config['pdf_' + type] !== false;
  },

// The PDF library loader, PDF.js loader and page viewer
  // Lazily loads jsPDF from a CDN the first time a PDF is exported. Cached as a promise;
  // a failed load can be retried.
  _ensureJsPDF(preview = null) {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    preview?.status?.('Loading the PDF tools\u2026');
    if (this._jsPDFLoadPromise) return this._jsPDFLoadPromise;
    this._jsPDFLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else { this._jsPDFLoadPromise = null; reject(new Error('jsPDF failed to initialise')); }
      };
      script.onerror = () => { this._jsPDFLoadPromise = null; reject(new Error('Could not load the PDF library \u2014 check your internet connection')); };
      document.head.appendChild(script);
    });
    return this._jsPDFLoadPromise;
  },

  // PDF.js (Mozilla's PDF viewer), loaded the first time a preview opens.
  _ensurePdfJs() {
    if (window.pdfjsLib?.getDocument) return Promise.resolve(window.pdfjsLib);
    if (this._pdfJsLoadPromise) return this._pdfJsLoadPromise;
    const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    this._pdfJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = BASE + 'pdf.min.js';
      const fail = (msg) => { this._pdfJsLoadPromise = null; reject(new Error(msg)); };
      const t = setTimeout(() => fail('PDF viewer took too long to load'), 15000);
      script.onload = () => {
        clearTimeout(t);
        const lib = window.pdfjsLib;
        if (!lib?.getDocument) { fail('PDF viewer failed to initialise'); return; }
        lib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js';
        resolve(lib);
      };
      script.onerror = () => { clearTimeout(t); fail('Could not load the PDF viewer'); };
      document.head.appendChild(script);
    });
    return this._pdfJsLoadPromise;
  },

  // Draws every page of the PDF into the preview as a scrolling stack, with
  // a "Page 2 of 5" counter. Pages are only drawn as they scroll near, and
  // each one is kept as an image (not a live canvas) so long PDFs don't run
  // the phone out of memory. Pinch to zoom (up to 4x) or double-tap to zoom
  // in and back out; pages are redrawn sharper once a zoom settles.
  async _renderPDFPages(frameWrap, buf, { isClosed = () => false, onCleanup = () => {} } = {}) {
    const lib = await this._ensurePdfJs();
    if (isClosed()) return;
    const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
    onCleanup(() => pdf.destroy());
    if (isClosed()) return;
    const total = pdf.numPages;
    const first = await pdf.getPage(1);
    const vp1 = first.getViewport({ scale: 1 });
    if (isClosed()) return;

    frameWrap.innerHTML = '';
    frameWrap.style.display = 'block';
    frameWrap.style.position = 'relative';
    frameWrap.style.background = '#d1d1d6';
    const scroller = document.createElement('div');
    scroller.style.cssText = 'position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:10px;box-sizing:border-box;touch-action:pan-x pan-y;';
    frameWrap.appendChild(scroller);
    // The zoomable sheet holding the pages — zoom is its width
    const sheet = document.createElement('div');
    sheet.style.cssText = 'width:100%;transform-origin:0 0;';
    scroller.appendChild(sheet);
    const counter = document.createElement('div');
    counter.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.62);color:#fff;font-size:11px;font-weight:600;padding:4px 11px;border-radius:11px;pointer-events:none;white-space:nowrap;' + (total > 1 ? '' : 'display:none;');
    frameWrap.appendChild(counter);
    const GAP = 10;

    const holders = [];
    for (let i = 1; i <= total; i++) {
      const h = document.createElement('div');
      h.dataset.page = String(i);
      h.style.cssText = 'position:relative;width:100%;aspect-ratio:' + vp1.width + ' / ' + vp1.height + ';background:#fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.18);overflow:hidden;' + (i < total ? 'margin-bottom:' + GAP + 'px;' : '');
      sheet.appendChild(h);
      holders.push(h);
    }

    const urls = new Set();
    onCleanup(() => urls.forEach(u => URL.revokeObjectURL(u)));
    const MAX_PX = 2600;            // widest a page is ever drawn (memory)
    const drawnW = new Map();       // page -> pixel width it was drawn at
    const busy = new Set();
    let chain = Promise.resolve();
    const wantPx = (holder) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      return Math.min(MAX_PX, Math.round((holder.clientWidth || scroller.clientWidth - 20 || 320) * dpr));
    };
    const renderPage = (n) => {
      const holder = holders[n - 1];
      if (!holder || busy.has(n)) return;
      const target = wantPx(holder);
      if ((drawnW.get(n) || 0) >= target * 0.9) return;   // already sharp enough
      busy.add(n);
      chain = chain.then(async () => {
        if (isClosed()) return;
        const page = n === 1 ? first : await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const px = wantPx(holder);
        const viewport = page.getViewport({ scale: px / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (n !== 1) page.cleanup();
        if (isClosed()) return;
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        canvas.width = 0; canvas.height = 0;   // free the canvas memory
        if (!blob || isClosed()) return;
        const url = URL.createObjectURL(blob);
        urls.add(url);
        const old = holder.querySelector('img');
        const img = document.createElement('img');
        img.alt = 'Page ' + n;
        img.draggable = false;
        img.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0;';
        img.onload = () => {
          if (old) { const ou = old.src; old.remove(); if (urls.has(ou)) { URL.revokeObjectURL(ou); urls.delete(ou); } }
        };
        img.src = url;
        holder.appendChild(img);
        drawnW.set(n, canvas.width || px);
      }).catch(() => {}).finally(() => { busy.delete(n); });
    };
    const visiblePages = (margin = 0) => {
      const top = scroller.scrollTop - margin, bottom = scroller.scrollTop + scroller.clientHeight + margin;
      return holders.filter(h => h.offsetTop + h.offsetHeight >= top && h.offsetTop <= bottom).map(h => Number(h.dataset.page));
    };

    // Draw pages as they come near the visible area
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) renderPage(Number(en.target.dataset.page)); });
      }, { root: scroller, rootMargin: '900px 300px' });
      holders.forEach(h => io.observe(h));
      onCleanup(() => io.disconnect());
    } else {
      for (let i = 1; i <= total; i++) renderPage(i);
    }
    renderPage(1);

    const updateCounter = () => {
      const mid = scroller.scrollTop + scroller.clientHeight / 2;
      let cur = 1;
      for (const h of holders) { if (h.offsetTop <= mid) cur = Number(h.dataset.page); else break; }
      counter.textContent = 'Page ' + cur + ' of ' + total;
    };
    scroller.addEventListener('scroll', updateCounter, { passive: true });
    updateCounter();

    // ── Zoom ──
    const MIN_Z = 1, MAX_Z = 4;
    let zoom = 1;
    let sharpenTimer = null;
    const sharpen = () => {
      clearTimeout(sharpenTimer);
      sharpenTimer = setTimeout(() => { if (!isClosed()) visiblePages(200).forEach(renderPage); }, 250);
    };
    // Set the zoom, keeping the content point under (cx, cy) — coordinates
    // relative to the scroller's visible box — where it is.
    const setZoom = (z, cx, cy) => {
      z = Math.max(MIN_Z, Math.min(MAX_Z, z));
      const pad = 10;
      const ratio = z / zoom;
      const contentX = scroller.scrollLeft + cx - pad;
      const contentY = scroller.scrollTop + cy - pad;
      // Page gaps don't scale, so vertical position is mapped page by page
      const pageIdx = Math.max(0, Math.min(total - 1, Math.floor(contentY / (holders[0].offsetHeight + GAP))));
      const gapsAbove = pageIdx * GAP;
      zoom = z;
      sheet.style.width = (z * 100) + '%';
      scroller.scrollLeft = contentX * ratio - cx + pad;
      scroller.scrollTop = (contentY - gapsAbove) * ratio + gapsAbove - cy + pad;
      updateCounter();
      sharpen();
    };

    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const rel = (x, y) => { const r = scroller.getBoundingClientRect(); return [x - r.left, y - r.top]; };
    let pinch = null;          // { d0, z0, cx, cy, scale }
    let lastTap = 0;
    const onStart = (e) => {
      if (e.touches.length === 2) {
        const [cx, cy] = rel((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
        // Live preview with a transform (smooth), committed on release
        const ox = scroller.scrollLeft + cx - 10, oy = scroller.scrollTop + cy - 10;
        sheet.style.transformOrigin = ox + 'px ' + oy + 'px';
        pinch = { d0: dist(e.touches), z0: zoom, cx, cy, scale: 1 };
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          const [cx, cy] = rel(e.touches[0].clientX, e.touches[0].clientY);
          setZoom(zoom > 1.05 ? 1 : 2.5, cx, cy);
          lastTap = 0;
          e.preventDefault();
        } else lastTap = now;
      }
    };
    const onMove = (e) => {
      if (!pinch || e.touches.length < 2) return;
      e.preventDefault();
      const z = Math.max(MIN_Z, Math.min(MAX_Z, pinch.z0 * dist(e.touches) / pinch.d0));
      pinch.scale = z / pinch.z0;
      sheet.style.transform = 'scale(' + pinch.scale + ')';
    };
    const onEnd = (e) => {
      if (!pinch || e.touches.length >= 2) return;
      const { z0, scale, cx, cy } = pinch;
      pinch = null;
      sheet.style.transform = '';
      sheet.style.transformOrigin = '0 0';
      if (Math.abs(scale - 1) > 0.01) setZoom(z0 * scale, cx, cy);
    };
    scroller.addEventListener('touchstart', onStart, { passive: false });
    scroller.addEventListener('touchmove', e => { onMove(e); e.stopPropagation(); }, { passive: false });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onEnd);
    // Safari's own page-zoom gesture would zoom the whole dashboard instead
    ['gesturestart', 'gesturechange'].forEach(ev => scroller.addEventListener(ev, e => e.preventDefault(), { passive: false }));
    // Ctrl/trackpad pinch on a computer
    scroller.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const [cx, cy] = rel(e.clientX, e.clientY);
      setZoom(zoom * Math.exp(-e.deltaY / 200), cx, cy);
    }, { passive: false });
    scroller.addEventListener('dblclick', (e) => {
      const [cx, cy] = rel(e.clientX, e.clientY);
      setZoom(zoom > 1.05 ? 1 : 2.5, cx, cy);
    });
  },

  // Noto Sans (regular and bold), fetched once and kept for the session
  async _pdfFonts() {
    if (this._pdfFontData) return this._pdfFontData;
    const get = async (path) => {
      const r = await fetch(PDF_FONT_BASE + path);
      if (!r.ok) throw new Error(r.status);
      const bytes = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    try {
      const [reg, bold] = await Promise.all([get('400Regular/NotoSans_400Regular.ttf'), get('700Bold/NotoSans_700Bold.ttf')]);
      this._pdfFontData = { reg, bold };
    } catch (e) { this._pdfFontData = null; }
    return this._pdfFontData;
  },

  // A new A4 document with the drawing helpers every export uses
  async _pdfDoc(status) {
    status('Loading the PDF tools…');
    const JsPDF = await this._ensureJsPDF();
    const fonts = await this._pdfFonts();
    const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: true });
    let face = 'helvetica';
    if (fonts) {
      doc.addFileToVFS('NotoSans-Regular.ttf', fonts.reg); doc.addFont('NotoSans-Regular.ttf', 'Noto', 'normal');
      doc.addFileToVFS('NotoSans-Bold.ttf', fonts.bold); doc.addFont('NotoSans-Bold.ttf', 'Noto', 'bold');
      face = 'Noto';
    }
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const M = 42;                      // page margin
    const k = {
      doc, W, H, M, y: M, face,
      // without Noto, keep to what the built-in font can draw
      clean: (s) => face === 'Noto' ? String(s ?? '') : String(s ?? '')
        .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ''),
      font(size, bold = false) { doc.setFont(face, bold ? 'bold' : 'normal'); doc.setFontSize(size); },
      color(c) { doc.setTextColor(c[0], c[1], c[2]); },
      fill(c) { doc.setFillColor(c[0], c[1], c[2]); },
      ensure(h) { if (k.y + h > H - M - 18) { doc.addPage(); k.y = M; return true; } return false; },
    };
    const emojiCache = new Map();
    // a run of emoji (or script the font can't draw), drawn by the phone
    const runImage = (s, size, col) => {
      const key = `${s}|${size}|${col}`;
      if (emojiCache.has(key)) return emojiCache.get(key);
      const scale = 4, px = size * scale;
      const cv = document.createElement('canvas'), g = cv.getContext('2d');
      const font = `${px}px -apple-system, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI", Roboto, "Noto Sans", sans-serif`;
      g.font = font;
      const w = Math.max(1, Math.ceil(g.measureText(s).width));
      cv.width = w + 4; cv.height = Math.ceil(px * 1.35);
      g.font = font; g.textBaseline = 'middle'; g.fillStyle = `rgb(${col.join(',')})`;
      g.fillText(s, 2, cv.height / 2);
      const out = { url: cv.toDataURL('image/png'), w: cv.width / scale, h: cv.height / scale };
      emojiCache.set(key, out);
      return out;
    };
    // split text into lines that fit maxW, as pieces of words and image runs
    k.wrap = (text, maxW, size, bold = false) => {
      k.font(size, bold);
      const lines = [];
      for (const para of k.clean(text).split('\n')) {
        const pieces = [];
        para.split(PDF_IMG_RUN).forEach((part, i) => {
          if (!part) return;
          if (i % 2 === 1) { const im = runImage(part, size, [0, 0, 0]); pieces.push({ img: part, w: im.w, word: true }); return; }
          part.split(/(\s+)/).forEach(w => { if (w) pieces.push({ t: w, w: doc.getTextWidth(w), space: /^\s+$/.test(w) }); });
        });
        let line = [], lw = 0;
        const push = () => { while (line.length && line[line.length - 1].space) { lw -= line.pop().w; } lines.push({ pieces: line, w: lw }); line = []; lw = 0; };
        for (let p of pieces) {
          if (p.space && !line.length) continue;
          if (lw + p.w > maxW && line.length) push();
          if (p.space && !line.length) continue;
          // a word longer than the line is broken up
          while (!p.img && p.w > maxW) {
            let n = p.t.length;
            while (n > 1 && doc.getTextWidth(p.t.slice(0, n)) > maxW - lw) n--;
            line.push({ t: p.t.slice(0, n), w: doc.getTextWidth(p.t.slice(0, n)) }); lw += line[line.length - 1].w; push();
            p = { t: p.t.slice(n), w: doc.getTextWidth(p.t.slice(n)) };
          }
          line.push(p); lw += p.w;
        }
        push();
      }
      return lines;
    };
    // draw wrapped lines; y is the top of the first line
    k.draw = (lines, x, y, size, col, bold = false, align = 'left', boxW = 0) => {
      k.font(size, bold); k.color(col);
      const lh = size * 1.32;
      lines.forEach((ln, i) => {
        let cx = align === 'right' ? x + boxW - ln.w : align === 'center' ? x + (boxW - ln.w) / 2 : x;
        const ty = y + i * lh;
        for (const p of ln.pieces) {
          if (p.img) { const im = runImage(p.img, size, col); doc.addImage(im.url, 'PNG', cx, ty + (lh - im.h) / 2 - size * 0.04, im.w, im.h); }
          else if (!p.space) doc.text(p.t, cx, ty + size * 0.95);
          cx += p.w;
        }
      });
      return lines.length * lh;
    };
    k.text = (text, x, size, col, { bold = false, maxW = W - 2 * M, align = 'left', boxW = maxW } = {}) => {
      const lines = k.wrap(text, maxW, size, bold);
      const h = lines.length * size * 1.32;
      k.ensure(Math.min(h, size * 1.32 * 2));
      k.draw(lines, x, k.y, size, col, bold, align, boxW);
      k.y += h;
      return h;
    };
    // a round photo, or initials on grey
    k.avatar = async (pic, name, cx, cy, r) => {
      const url = pic ? await this._pdfImage(pic, r * 4, true) : null;
      if (url) {
        doc.saveGraphicsState();
        doc.circle(cx, cy, r, null); doc.clip(); doc.discardPath();
        doc.addImage(url.data, 'JPEG', cx - r, cy - r, r * 2, r * 2);
        doc.restoreGraphicsState();
      } else {
        k.fill([160, 164, 172]); doc.circle(cx, cy, r, 'F');
        const ini = initials(name || '') || '?';
        k.font(r * 0.8, true); k.color([255, 255, 255]);
        doc.text(k.clean(ini), cx, cy + r * 0.28, { align: 'center' });
      }
    };
    return k;
  },

  // Footer on every page: what it is, and Page n of N
  _pdfFooter(k, label) {
    const { doc, W, H, M } = k;
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      k.font(8); k.color([142, 142, 147]);
      doc.text(k.clean(`Crow Messenger · ${label}`), M, H - 22);
      doc.text(`Page ${i} of ${n}`, W - M, H - 22, { align: 'right' });
    }
  },

  // A picture as a JPEG data URL (with its size), scaled down to maxPx. Square crops for avatars.
  async _pdfImage(src, maxPx, square = false) {
    try {
      let url = src;
      if (!/^(data:|blob:)/.test(src)) {
        const res = /^https?:/.test(src) ? await fetch(src) : await this._hass.fetchWithAuth(src);
        if (!res.ok) return null;
        url = URL.createObjectURL(await res.blob());
      }
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
      let w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0, sw = w, sh = h;
      if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s; w = h = s; }
      const sc = Math.min(1, maxPx / Math.max(w, h));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      if (url !== src) URL.revokeObjectURL(url);
      return { data: cv.toDataURL('image/jpeg', 0.82), w: cv.width, h: cv.height };
    } catch (e) { return null; }
  },

  // A colour from the card's theme (custom properties can be anything CSS understands)
  _pdfColour(cssVar, el, fallback) {
    try {
      const probe = document.createElement('span');
      probe.style.color = `var(${cssVar})`;
      (el || this._root).appendChild(probe);
      const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
      probe.remove();
      if (m && m.length >= 3) return m.slice(0, 3).map(Number);
    } catch (e) { /* not on screen */ }
    return fallback;
  },

  // ── The preview page: every page drawn, with Share and Download ───────────
  _pg_pdf({ title, filename, build }) {
    const el = this._el(`<div class="pdfpage">
      <div class="pdf-frame"><div class="pdf-inner"><div class="pdf-status"><div class="spin"></div><span>Getting ready…</span><div class="pdf-bar"><i></i></div></div></div></div>
      <div class="top"><button class="pill g" data-a="close">Done</button><div class="title">${esc(title)}</div><div style="width:64px"></div></div>
      <div class="pdf-actions"><button class="pill g" data-a="download" disabled>${ICON.download}<span>Download</span></button><button class="pill g accent" data-a="share" disabled>${ICON.share}<span>Share</span></button></div>
    </div>`);
    const page = { el };
    // the page viewer makes this its own (position: relative), so it sits inside a fixed frame
    const frame = el.querySelector('.pdf-inner');
    const statusText = el.querySelector('.pdf-status span'), bar = el.querySelector('.pdf-bar i');
    let closed = false, blob = null;
    const cleanups = [];
    const status = (msg, frac) => {
      if (closed || !statusText.isConnected) return;
      statusText.textContent = msg;
      bar.parentElement.style.visibility = frac == null ? 'hidden' : 'visible';
      if (frac != null) bar.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
    };
    (async () => {
      try {
        const doc = await build(status, () => closed);
        if (closed) return;
        status('Making the pages…');
        const buf = doc.output('arraybuffer');
        blob = new Blob([buf], { type: 'application/pdf' });
        el.querySelectorAll('.pdf-actions button').forEach(b => { b.disabled = false; });
        await this._renderPDFPages(frame, buf.slice(0), { isClosed: () => closed, onCleanup: fn => cleanups.push(fn) });
      } catch (err) {
        if (closed) return;
        console.warn('Crow Messenger: PDF', err);
        frame.innerHTML = `<div class="pdf-status"><b>Couldn’t make the PDF</b><span>${esc(err?.message || 'Something went wrong.')}</span></div>`;
      }
    })();
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') { this._back(); return; }
      if (!blob) return;
      if (a === 'download') { downloadBlob(blob, filename); return; }
      if (a === 'share') {
        // the phone's share sheet: Save to Files, AirDrop, Mail, Print…
        const file = new File([blob], filename, { type: 'application/pdf' });
        try {
          if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
        } catch (err) { if (err?.name === 'AbortError') return; }
        downloadBlob(blob, filename);
      }
    });
    page.pdfBlob = () => blob;
    page.destroy = () => { closed = true; cleanups.forEach(fn => { try { fn(); } catch (e) { /* gone */ } }); };
    return page;
  },

  // ── Conversation: choose what to include, then export ─────────────────────
  _pg_pdfOptions({ tid }) {
    const t = this._s.threads.get(tid);
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const el = this._el(`<div>
      <div class="scroll"><div class="ce ai-add">
        <div class="ai-add-h">${ICON.doc}<span>A PDF of this conversation, laid out like the chat. It’s made on this device from your copy of the messages.</span></div>
        <div class="group-h">Messages</div>
        <div class="group pdf-range">
          <label class="fi tgl"><span class="lab2">All Messages</span><input type="radio" name="range" value="all" checked><span class="ck">${ICON.check}</span></label>
          <label class="fi tgl"><span class="lab2">Last 30 Days</span><input type="radio" name="range" value="30"><span class="ck">${ICON.check}</span></label>
          <label class="fi tgl"><span class="lab2">Choose Dates</span><input type="radio" name="range" value="dates"><span class="ck">${ICON.check}</span></label>
          <div class="fi dates"><span class="lab2">From</span><input type="date" data-k="from" value="${monthAgo}" max="${today}"></div>
          <div class="fi dates"><span class="lab2">To</span><input type="date" data-k="to" value="${today}" max="${today}"></div>
        </div>
        <div class="group">
          <label class="fi tgl"><span class="lab2">Include Photos</span><span class="tsw"><input type="checkbox" data-k="photos" checked><span></span></span></label>
        </div>
        <div class="pick-note" style="margin-top:-6px">Videos appear as a still from the video. Audio and files are listed by name.</div>
      </div></div>
      <div class="edge top"></div>
      <div class="top"><button class="pill g" data-a="cancel">Cancel</button><div class="title">Export as PDF</div><button class="pill g accent" data-a="go">Export</button></div>
    </div>`);
    const page = { el };
    const sync = () => {
      const v = el.querySelector('input[name="range"]:checked').value;
      el.querySelectorAll('.pdf-range .fi.tgl').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
      el.querySelectorAll('.dates').forEach(d => { d.hidden = v !== 'dates'; });
    };
    el.addEventListener('change', sync); sync();
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'cancel') { this._back(); return; }
      if (a !== 'go') return;
      const v = el.querySelector('input[name="range"]:checked').value;
      let from = 0, to = Infinity;
      if (v === '30') from = Date.now() - 30 * 86400000;
      if (v === 'dates') {
        const f = el.querySelector('[data-k="from"]').value, tt = el.querySelector('[data-k="to"]').value;
        if (f) from = new Date(`${f}T00:00:00`).getTime();
        if (tt) to = new Date(`${tt}T23:59:59`).getTime();
        if (from > to) { this._toast('The From date is after the To date'); return; }
      }
      const photos = el.querySelector('[data-k="photos"]').checked;
      const name = this._threadTitle(t).replace(/[\\/:*?"<>|]/g, '').trim() || 'Conversation';
      this._back(false);
      this._nav('pdf', { title: 'Conversation', filename: `${name}.pdf`, build: (status, closed) => this._pdfConversation(tid, { from, to, photos }, status, closed) });
    });
    return page;
  },

  async _pdfConversation(tid, { from, to, photos }, status, closed) {
    const s = this._s, t = s.threads.get(tid);
    if (!t) throw new Error('That conversation isn’t available');
    // the whole history, page by page
    status('Collecting messages…', 0);
    let all = [], before = null, more = true;
    while (more && all.length < 5000) {
      const r = await this._ws('messages', { thread_id: tid, limit: 200, ...(before ? { before } : {}) });
      if (closed()) return null;
      all = [...r.messages, ...all];
      more = r.more && r.messages.length > 0;
      before = r.messages[0]?.ts;
      if (before && before < from) break;
      status(`Collecting messages… ${all.length}`, null);
    }
    const msgs = all.filter(m => m.ts >= from && m.ts <= to);
    if (!msgs.filter(m => m.type !== 'system').length) throw new Error('There are no messages in that period.');

    const k = await this._pdfDoc(status);
    const { doc, W, M } = k;
    const CW = W - 2 * M;
    const pageEl = this._stack.find(p => p.type === 'thread' && p.data.tid === tid)?.el || this._root;
    const sent = this._pdfColour('--cm-sent', pageEl, [0, 122, 255]);
    const sentText = this._pdfColour('--cm-sent-text', pageEl, [255, 255, 255]);
    const recv = [233, 233, 235], recvText = [0, 0, 0], grey = [142, 142, 147], ink = [0, 0, 0];
    const others = t.participants.filter(p => p !== s.me);

    // header
    status('Laying out the conversation…', 0);
    const hdrPic = t.photo || (t.is_group ? null : this._userPic(others[0] || s.me));
    await k.avatar(hdrPic, this._threadTitle(t), M + 26, k.y + 26, 26);
    const hx = M + 66;
    k.y += 2;
    k.text(this._threadTitle(t), hx, 20, ink, { bold: true, maxW: CW - 66 });
    const people = [...t.participants].map(p => p === s.me ? `${this._userName(p)} (you)` : this._userName(p)).join(', ');
    k.text(people, hx, 10, grey, { maxW: CW - 66 });
    const df = (ts) => new Date(ts).toLocaleDateString(locale(this._hass), { day: 'numeric', month: 'long', year: 'numeric' });
    const realCount = msgs.filter(m => m.type !== 'system').length;
    k.text(`${df(msgs[0].ts)} – ${df(msgs[msgs.length - 1].ts)} · ${realCount} message${realCount === 1 ? '' : 's'} · Exported ${df(Date.now())}`, hx, 9, grey, { maxW: CW - 66 });
    k.y = Math.max(k.y, M + 60) + 14;
    doc.setDrawColor(220, 220, 224); doc.setLineWidth(0.6); doc.line(M, k.y, W - M, k.y); k.y += 16;

    const PAD_X = 10, PAD_Y = 6, MAXW = CW * 0.7, SIZE = 10.5, LH = SIZE * 1.32;
    let lastDay = '';
    for (let i = 0; i < msgs.length; i++) {
      if (closed()) return null;
      if (i % 20 === 0) status('Laying out the conversation…', i / msgs.length);
      const m = this._pdfFlat(msgs[i]), prev = msgs[i - 1], next = msgs[i + 1];
      const day = new Date(m.ts).toLocaleDateString(locale(this._hass), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (day !== lastDay) {
        lastDay = day;
        k.ensure(40); k.y += 6;
        k.text(day, M, 8.5, grey, { bold: true, align: 'center', maxW: CW, boxW: CW });
        k.y += 6;
      }
      if (m.type === 'system') { k.text(m.text, M, 8.5, grey, { align: 'center', maxW: CW, boxW: CW }); k.y += 6; continue; }
      const mine = m.sender === s.me;
      const runStart = !prev || prev.type === 'system' || prev.sender !== m.sender || m.ts - prev.ts > 120000;
      const runEnd = !next || next.type === 'system' || next.sender !== m.sender || next.ts - m.ts > 120000;
      if (!mine && t.is_group && runStart) { k.ensure(30); k.text(this._userName(m.sender), M + 4, 8, grey); k.y += 1; }
      const bx = (w) => mine ? W - M - w : M;
      // attachments
      for (const a of m.attachments || []) {
        const mime = a.mime || '';
        const gone = a.removed || this._missing.has(a.id);
        const visual = mime.startsWith('image/') || mime.startsWith('video/');
        if (visual && photos && !gone) {
          let img = null;
          try { img = await this._pdfImage(await this._media(a.id, !!a.has_thumb), 900); } catch (e) { img = null; }
          if (img) {
            const sc = Math.min(220 / img.w, 240 / img.h, 1.2);
            const w = img.w * sc, h = img.h * sc;
            k.ensure(h + 6);
            doc.addImage(img.data, 'JPEG', bx(w), k.y, w, h);
            if (mime.startsWith('video/')) {
              k.fill([0, 0, 0]);
              if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.55 }));
              doc.circle(bx(w) + w / 2, k.y + h / 2, 16, 'F');
              if (doc.GState) doc.setGState(new doc.GState({ opacity: 1 }));
              k.fill([255, 255, 255]); doc.triangle(bx(w) + w / 2 - 5, k.y + h / 2 - 8, bx(w) + w / 2 - 5, k.y + h / 2 + 8, bx(w) + w / 2 + 9, k.y + h / 2, 'F');
            }
            k.y += h + 4;
            continue;
          }
        }
        // anything else is a small labelled box
        const label = gone ? `${mime.startsWith('image/') ? 'Photo' : mime.startsWith('video/') ? 'Video' : 'Attachment'} no longer available`
          : mime.startsWith('audio/') ? `Audio${a.duration ? ` · ${fmtDur(a.duration)}` : ''}`
            : visual ? `${mime.startsWith('video/') ? 'Video' : 'Photo'}${a.name ? ` · ${a.name}` : ''}`
              : `${a.name || 'Attachment'}${a.size ? ` · ${fmtBytes(a.size)}` : ''}`;
        const lines = k.wrap(label, MAXW - 2 * PAD_X - 18, 9.5);
        const w = Math.max(...lines.map(l => l.w)) + 2 * PAD_X + 18, h = lines.length * 9.5 * 1.32 + 2 * PAD_Y;
        k.ensure(h + 4);
        k.fill([242, 242, 247]); doc.setDrawColor(209, 209, 214); doc.roundedRect(bx(w), k.y, w, h, 9, 9, 'FD');
        k.font(11, true); k.color(grey); doc.text(gone ? '?' : mime.startsWith('audio/') ? '♪' : '▪', bx(w) + PAD_X + 2, k.y + PAD_Y + 10);
        k.draw(lines, bx(w) + PAD_X + 16, k.y + PAD_Y, 9.5, gone ? grey : ink);
        k.y += h + 4;
      }
      if (m.text) {
        const lines = k.wrap(m.text, MAXW - 2 * PAD_X, SIZE);
        const w = Math.max(28, ...lines.map(l => l.w)) + 2 * PAD_X;
        // a very long message carries on over the page
        let start = 0;
        while (start < lines.length) {
          const room = Math.max(1, Math.floor((k.H - M - 18 - k.y - 2 * PAD_Y) / LH));
          if (room < 2 && start === 0 && lines.length > 1) { k.ensure(1e6); continue; }
          const part = lines.slice(start, start + room);
          const h = part.length * LH + 2 * PAD_Y;
          k.ensure(h);
          k.fill(mine ? sent : recv);
          doc.roundedRect(bx(w), k.y, w, h, 12, 12, 'F');
          k.draw(part, bx(w) + PAD_X, k.y + PAD_Y, SIZE, mine ? sentText : recvText);
          k.y += h + 3;
          start += part.length;
          if (start < lines.length) { doc.addPage(); k.y = M; }
        }
      }
      if (runEnd) {
        k.font(7.5); k.color(grey);
        const time = fmtTime(m.ts, this._hass);
        doc.text(k.clean(time), mine ? W - M - 2 : M + 2, k.y + 7, { align: mine ? 'right' : 'left' });
        k.y += 14;
      }
    }
    this._pdfFooter(k, this._threadTitle(t));
    return doc;
  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  _pdfFieldRows(c) {
    const rows = [];
    const add = (section, items) => { if (items.length) rows.push({ section, items }); };
    add('Phone', (c.phones || []).map(p => [p.label || 'phone', p.value]));
    add('Email', (c.emails || []).map(p => [p.label || 'email', p.value]));
    add('Address', (c.addresses || []).map(p => [p.label || 'address', formatAddress(p)]));
    const dates = [];
    if (c.birthday) dates.push(['birthday', fmtLongDate(c.birthday, this._hass)]);
    (c.dates || []).forEach(d => dates.push([d.label || 'date', fmtLongDate(d.value, this._hass)]));
    add('Dates', dates);
    add('Website', (c.urls || []).map(p => [p.label || 'homepage', p.value]));
    add('Social', (c.social || []).map(p => [p.label || 'profile', p.value]));
    add('Related', (c.related || []).map(p => [p.label || 'related', p.value]));
    return rows;
  },

  async _pdfContact(c, status) {
    const k = await this._pdfDoc(status);
    const { doc, W, M } = k;
    const CW = W - 2 * M, grey = [142, 142, 147], ink = [0, 0, 0], accent = this._pdfColour('--cm-accent', null, [0, 122, 255]);
    const name = contactName(c, this._config.contact_display);
    status('Laying out the card…');
    await k.avatar(this._contactPic(c), name, W / 2, k.y + 48, 48);
    k.y += 110;
    k.text(name, M, 24, ink, { bold: true, align: 'center', maxW: CW, boxW: CW });
    const sub = [c.nickname && `“${c.nickname}”`, [c.job_title, c.department].filter(Boolean).join(', '), c.company].filter(Boolean).join(' · ');
    if (sub) k.text(sub, M, 11, grey, { align: 'center', maxW: CW, boxW: CW });
    if (c.pronouns) k.text(c.pronouns, M, 10, grey, { align: 'center', maxW: CW, boxW: CW });
    k.y += 18;
    for (const sec of this._pdfFieldRows(c)) {
      k.ensure(40);
      k.text(sec.section.toUpperCase(), M, 8.5, grey, { bold: true });
      k.y += 4;
      for (const [label, value] of sec.items) {
        const lines = k.wrap(value, CW - 120, 11);
        k.ensure(lines.length * 11 * 1.32 + 10);
        k.draw(k.wrap(label, 110, 9.5), M, k.y + 1, 9.5, grey);
        k.draw(lines, M + 120, k.y, 11, sec.section === 'Phone' || sec.section === 'Email' || sec.section === 'Website' ? accent : ink);
        k.y += lines.length * 11 * 1.32 + 8;
      }
      doc.setDrawColor(229, 229, 234); doc.setLineWidth(0.5); doc.line(M, k.y, W - M, k.y); k.y += 12;
    }
    if (c.notes) {
      k.ensure(40);
      k.text('NOTES', M, 8.5, grey, { bold: true }); k.y += 4;
      k.text(c.notes, M, 11, ink);
    }
    this._pdfFooter(k, name);
    return doc;
  },

  async _pdfAddressBook(status, closed) {
    const { list, order } = this._sortedContacts();
    if (!list.length) throw new Error('You don’t have any contacts yet.');
    const k = await this._pdfDoc(status);
    const { doc, W, M } = k;
    const CW = W - 2 * M, grey = [142, 142, 147], ink = [0, 0, 0], accent = this._pdfColour('--cm-accent', null, [0, 122, 255]);
    k.text('Contacts', M, 26, ink, { bold: true });
    k.text(`${list.length} contact${list.length === 1 ? '' : 's'} · Exported ${new Date().toLocaleDateString(locale(this._hass), { day: 'numeric', month: 'long', year: 'numeric' })}`, M, 10, grey);
    k.y += 10;
    let letter = '';
    for (let i = 0; i < list.length; i++) {
      if (closed()) return null;
      if (i % 10 === 0) status('Laying out your contacts…', i / list.length);
      const c = list[i];
      const L = contactLetter(c, order);
      if (L !== letter) {
        letter = L;
        k.ensure(60); k.y += 8;
        k.text(L, M, 14, accent, { bold: true });
        doc.setDrawColor(229, 229, 234); doc.setLineWidth(0.5); doc.line(M, k.y + 2, W - M, k.y + 2); k.y += 8;
      }
      // name, company, then phones, emails and the first address
      const details = [
        ...(c.phones || []).map(p => `${p.label || 'phone'}  ${p.value}`),
        ...(c.emails || []).map(p => `${p.label || 'email'}  ${p.value}`),
        ...(c.addresses || []).slice(0, 1).map(p => `${p.label || 'address'}  ${formatAddress(p).replace(/\n/g, ', ')}`),
      ];
      const nameLines = k.wrap(contactName(c, this._config.contact_display), CW - 46, 11.5, true);
      const sub = [c.job_title, c.company].filter(Boolean).join(' · ');
      const subLines = sub ? k.wrap(sub, CW - 46, 9) : [];
      const detLines = details.flatMap(d => k.wrap(d, CW - 46, 9));
      const h = Math.max(34, nameLines.length * 11.5 * 1.32 + (subLines.length + detLines.length) * 9 * 1.32 + 6);
      k.ensure(h + 8);
      await k.avatar(this._contactPic(c), contactName(c), M + 15, k.y + 16, 15);
      let y = k.y;
      y += k.draw(nameLines, M + 42, y, 11.5, ink, true);
      if (subLines.length) y += k.draw(subLines, M + 42, y, 9, grey);
      if (detLines.length) y += k.draw(detLines, M + 42, y, 9, [60, 60, 67]);
      k.y += h + 8;
    }
    this._pdfFooter(k, 'Contacts');
    return doc;
  },
});

// ── Visual editor ─
const ED_CHEVRON = '<path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>';
const ED_ICONS = {
  users: '<path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>',
  bell: '<path d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21"/>',
  message: '<path d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3Z"/>',
  contacts: '<path d="M20,0H4V2H20V0M4,24H20V22H4V24M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M12,6.75A2.25,2.25 0 0,1 14.25,9A2.25,2.25 0 0,1 12,11.25A2.25,2.25 0 0,1 9.75,9A2.25,2.25 0 0,1 12,6.75M17,17H7V15.5C7,13.83 10.33,13 12,13C13.67,13 17,13.83 17,15.5V17Z"/>',
  palette: '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
  storage: '<path d="M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M12,4A6,6 0 0,0 6,10C6,13.31 8.69,16 12.1,16L11.22,13.77C10.95,13.29 11.11,12.68 11.59,12.4L12.45,11.9C12.93,11.63 13.54,11.79 13.82,12.27L15.74,14.69C17.12,13.59 18,11.9 18,10A6,6 0 0,0 12,4M12,9A1,1 0 0,1 13,10A1,1 0 0,1 12,11A1,1 0 0,1 11,10A1,1 0 0,1 12,9M7,18A1,1 0 0,0 6,19A1,1 0 0,0 7,20A1,1 0 0,0 8,19A1,1 0 0,0 7,18Z"/>',
  layout: '<path d="M3,3H11V11H3V3M13,3H21V7H13V3M13,9H21V21H13V9M3,13H11V21H3V13Z"/>',
  reset: '<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>',
  pdf: '<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>',
  ai: '<path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>',
  phone: '<path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>',
};

const RETENTION = [[1, '1 Day'], [7, '1 Week'], [30, '30 Days'], [365, '1 Year'], [0, 'Forever']];
const UPLOAD_SIZES = [[25, '25 MB'], [100, '100 MB'], [300, '300 MB'], [1000, '1 GB']];
const AI_FEATURES = ['assistant', 'replies', 'writing', 'catchup', 'translate', 'actions', 'photos', 'ask'];
const STORAGE_AGES = [[30, '30 Days'], [90, '90 Days'], [365, '1 Year'], [0, 'All']];
const HEIGHTS = [[500, '500 px'], [600, '600 px'], [700, '700 px (default)'], [800, '800 px'], [900, '900 px'], [1000, '1000 px'], ['fill', 'Fill the screen']];

// Household settings changed in the editor wait in the browser until the
// dashboard's Save button is pressed. The card's config gets a short change id
// (`household_changes`) so Home Assistant sees a change and Save lights up.
// When the dashboard is saved (lovelace_updated) and the saved config holds that
// id, the waiting changes are sent. Cancel never saves the id, so nothing is sent.
const CM_HC = 'household_changes';
const CM_STAGED = new Map();   // change id -> settings patch
const CM_WATCH = { unsub: null, hass: null };
const cmMerge = (a, b) => {
  const out = { ...(a || {}) };
  Object.entries(b || {}).forEach(([k, v]) => {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? cmMerge(out[k], v) : v;
  });
  return out;
};
const cmApplySaved = async (hass, urlPath) => {
  if (!CM_STAGED.size) return;
  let cfg;
  try { cfg = await hass.callWS({ type: 'lovelace/config', url_path: urlPath ?? null }); } catch (e) { return; }
  let patch = null;
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    const id = n[CM_HC];
    if (typeof id === 'string' && CM_STAGED.has(id)) { patch = cmMerge(patch, CM_STAGED.get(id)); CM_STAGED.delete(id); }
    Object.values(n).forEach(walk);
  };
  walk(cfg);
  if (!patch) return;
  try { await hass.callWS({ type: 'crow_messenger/settings/set', settings: patch }); }
  catch (e) { console.warn('Crow Messenger: couldn’t save household settings', e); }
};
const cmWatch = (hass) => {
  CM_WATCH.hass = hass;
  if (CM_WATCH.unsub) return;
  CM_WATCH.unsub = hass.connection.subscribeEvents((ev) => cmApplySaved(CM_WATCH.hass, ev?.data?.url_path), 'lovelace_updated')
    .catch(e => { console.warn('Crow Messenger: can’t watch for Save', e); CM_WATCH.unsub = null; return null; });
};

class CrowMessengerCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
    this._ints = null;           // household settings from the integration
    this._views = new Map();     // dashboard -> [{value,label}]
    this._pathOptions = [];
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) this.render();
  }

  setConfig(config) {
    this._raw = { ...(config || {}) };
    // colours now come from each person's theme in the card
    CM_OLD_COLOURS.forEach(k => delete this._raw[k]);
    // a change id from this editing session (e.g. after Show code editor) is kept; an old one left in the dashboard is dropped
    if (CM_STAGED.has(this._raw[CM_HC])) this._rev = this._raw[CM_HC];
    else delete this._raw[CM_HC];
    this._config = { ...CM_DEFAULTS, ...this._raw };
    if (!this._initialized && this._hass) this.render();
    else if (this._initialized) this.updateUI();
  }

  _section(id, colour, icon, title, sub, body) {
    return `
        <div>
          <div class="card-block" style="padding:12px;">
            <div id="${id}Header" data-grp="${id}" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;-webkit-tap-highlight-color:transparent;padding-bottom:2px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:28px;height:28px;border-radius:8px;background:rgba(${colour},0.15);border:1px solid rgba(${colour},0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:rgba(${colour},0.9);">${icon}</svg>
                </div>
                <div>
                  <div style="font-size:14px;font-weight:600;color:var(--primary-text-color, #111);">${title}</div>
                  <div style="font-size:11px;color:#888;margin-top:1px;">${sub}</div>
                </div>
              </div>
              <svg id="${id}Chevron" viewBox="0 0 24 24" style="width:18px;height:18px;fill:var(--secondary-text-color, rgba(0,0,0,0.5));transition:transform 0.25s ease;flex-shrink:0;">${ED_CHEVRON}</svg>
            </div>
            <div id="${id}Body" class="grp-body" style="display:none;flex-direction:column;margin-top:10px;">
${body}
            </div>
          </div>
        </div>`;
  }

  _toggle(id, label, desc, extraAttr = '') {
    return `<div class="toggle-item" style="align-items:flex-start;gap:12px;padding:10px 0;" ${extraAttr}>
                  <div style="flex:1;">
                    <div class="toggle-label">${label}</div>
                    <div style="font-size:11px;color:#888;margin-top:2px;line-height:1.4;">${desc}</div>
                  </div>
                  <label class="toggle-switch" style="flex-shrink:0;margin-top:2px;"><input type="checkbox" id="${id}"><span class="toggle-track"></span></label>
                </div>`;
  }

  _segmented(id, name, title, desc, options, extraAttr = '') {
    return `<div style="padding:10px 0;border-bottom:1px solid var(--divider-color,rgba(128,128,128,0.2));" ${extraAttr}>
              <div style="font-size:13px;font-weight:500;margin-bottom:8px;">${title}</div>
              ${desc ? `<div style="font-size:11px;color:#888;margin-bottom:8px;line-height:1.4;">${desc}</div>` : ''}
              <div class="segmented" id="${id}">
                ${options.map(([v, l]) => `<input type="radio" name="${name}" id="${name}_${v}" value="${v}"><label for="${name}_${v}">${l}</label>`).join('\n                ')}
              </div>
            </div>`;
  }

  _note(id, html, colour = '255,149,0') {
    return `<div id="${id}" style="display:none;margin:10px 0 4px;padding:10px 14px;background:rgba(${colour},0.10);border:1px solid rgba(${colour},0.25);border-radius:10px;font-size:12px;color:rgba(${colour === '255,149,0' ? '255,180,50' : colour},0.95);line-height:1.5;">${html}</div>`;
  }

  render() {
    if (!this._hass || !this._config) return;
    this._initialized = true;
    const isAdmin = !!this._hass.user?.is_admin;

    const usersBody = `
<div class="grp-sub" style="margin-top:2px;">Where Notifications Open</div>
<div style="font-size:11px;color:#888;margin:4px 0 4px;line-height:1.4;">Tapping a Crow Messenger notification opens the dashboard where this card is, straight into the conversation.</div>
${this._toggle('dash_everyone', 'One Dashboard for Everyone', 'Every person’s notifications open the same dashboard, for example a dashboard called Messages. When this is on, the choices for each person below are turned off.')}
<div id="dash-everyone-row" style="padding:2px 0 10px;">
  <div style="font-size:11px;color:#888;margin-bottom:4px;">Dashboard</div>
  <div style="display:flex;gap:8px;">
    <input type="text" id="dash_path" placeholder="e.g. /messages/chat" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1;min-width:0;">
    <select id="dash_pick" style="width:44px;flex-shrink:0;padding:10px 0;background-position:center;color:transparent;" aria-label="Choose a dashboard view"><option value="">Choose…</option></select>
  </div>
  <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.4;">Type the dashboard and view (as in the address bar), tap the arrow to pick one, or use the dashboard you’re editing now.</div>
  <button id="use-here-btn" style="width:100%;padding:9px 14px;border-radius:10px;border:1px solid rgba(0,122,255,0.35);background:rgba(0,122,255,0.1);color:rgba(10,132,255,0.95);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:8px;">Use This Dashboard</button>
</div>
<div id="dash-people">
<div class="grp-sub">Each Person</div>
<div style="font-size:11px;color:#888;margin:4px 0 8px;line-height:1.4;">Choose the dashboard (and view) for each person. Automatic uses wherever they last opened the card.</div>
<div id="users-list"><div style="font-size:12px;color:#888;padding:10px 0;">Loading…</div></div>
</div>`;

    const notifBody = `
<div class="grp-sub" style="margin-top:2px;">Phone Notifications</div>
${this._toggle('n_enabled', 'Phone Notifications', 'Send a notification to each person’s phone (iPhone or Android, via the Home Assistant Companion app) when a message arrives. Not sent while they’re looking at that conversation.')}
${this._toggle('n_show_text', 'Show Message Text', 'Turn off to show just “New message” and who it’s from on the lock screen.')}
${this._toggle('n_show_attachment', 'Show Attachment Preview', 'Photos, videos and audio messages appear in the notification itself.')}
${this._toggle('n_sound', 'Sound', 'Play the notification sound. On Android this uses the “Crow Messenger” notification channel.')}
${this._toggle('n_reply_action', 'Reply from Notification', 'Adds a Reply button so people can answer without opening Home Assistant.')}
${this._toggle('n_call_alerts', 'Call Alerts', 'When someone FaceTimes or calls from a chat, the other person gets “James is FaceTiming you” — even with alerts hidden or Focus on.')}
${this._toggle('n_badge', 'App Icon Badge', 'A red number on the Home Assistant app’s icon on iPhone and iPad, showing unread messages (muted chats aren’t counted). Off until you turn it on. On Android, notifications for chats you’ve read are cleared, so the app’s dot goes away.')}
<div class="grp-sub">People &amp; Phones</div>
<div style="font-size:11px;color:#888;margin:4px 0 4px;line-height:1.4;">Phones are found automatically from the Home Assistant Companion app each person is signed in to. Turn off a person or a phone to stop notifications going there.</div>
<div id="notify-people"><div style="font-size:12px;color:#888;padding:10px 0;">Loading…</div></div>`;

    const msgsBody = `
<div class="grp-sub" style="margin-top:2px;">Keep Messages</div>
${this._segmented('retention-segmented', 'retention', 'Keep Messages', 'Messages and their attachments are deleted automatically once they’re older than this — for everyone in the home. Forever keeps everything. Starts at 30 days.', RETENTION.map(([v, l]) => [v, l]))}
<div id="retention-confirm" style="display:none;margin-top:8px;padding:10px 12px;background:rgba(255,69,58,0.1);border:1px solid rgba(255,69,58,0.3);border-radius:10px;">
  <div id="retention-confirm-text" style="font-size:12px;color:#ff453a;margin-bottom:8px;font-weight:500;"></div>
  <div style="display:flex;gap:8px;">
    <button id="retention-confirm-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(255,69,58,0.5);background:rgba(255,69,58,0.2);color:#ff453a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Delete Older Messages</button>
    <button id="retention-cancel-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(128,128,128,0.2);background:transparent;color:#888;font-size:12px;cursor:pointer;font-family:inherit;">Cancel</button>
  </div>
</div>
<div class="grp-sub">Attachments</div>
${this._segmented('upload-segmented', 'upload', 'Largest Attachment', 'Photos are resized before sending, so this mostly matters for videos and documents. Starts at 1 GB.', UPLOAD_SIZES)}
<div class="grp-sub">Links &amp; Zones</div>
<div id="feat-wrap">
${this._toggle('f_link_previews', 'Link Previews', 'Shows a card with the page’s title and picture under a link. Home Assistant fetches the page — never people’s phones — and won’t open addresses on your own network. Household setting.')}
${this._toggle('f_zones', 'Everyone Can Add Zones', 'Lets everyone add Home Assistant zones from the People map, Check In, Send Later and shared locations, not just administrators. The zones are the same as ones made in Settings → Areas, labels & zones. Household setting.')}
</div>
<div class="grp-sub">Typing</div>
${this._toggle('enter_sends', 'Return Key Sends', 'On a computer keyboard, Return sends the message and Shift+Return starts a new line. Phones and tablets always use the send button.')}`;

    const storageBody = `
<div class="grp-sub" style="margin-top:2px;">Photos &amp; Files</div>
<div id="storage-wrap">
${this._segmented('storage-segmented', 'storage_age', 'Delete Photos & Files from the Server', '<span id="storage-stats">Checking…</span><br>Deletes attachments sent in every conversation, for everyone. The messages stay, with a question mark where each one was. People can also remove one at a time in the card: open the photo and tap the bin → Remove from Server (files: press and hold).', STORAGE_AGES)}
<button id="storage-btn" style="width:100%;margin:8px 0 4px;padding:8px;border-radius:8px;border:1px solid rgba(255,69,58,0.5);background:rgba(255,69,58,0.12);color:#ff453a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Delete Attachments…</button>
<div id="storage-confirm" style="display:none;margin-top:8px;padding:10px 12px;background:rgba(255,69,58,0.1);border:1px solid rgba(255,69,58,0.3);border-radius:10px;">
  <div id="storage-confirm-text" style="font-size:12px;color:#ff453a;margin-bottom:8px;font-weight:500;"></div>
  <div style="display:flex;gap:8px;">
    <button id="storage-confirm-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(255,69,58,0.5);background:rgba(255,69,58,0.2);color:#ff453a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Delete</button>
    <button id="storage-cancel-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(128,128,128,0.2);background:transparent;color:#888;font-size:12px;cursor:pointer;font-family:inherit;">Cancel</button>
  </div>
</div>
</div>`;

    const aiBody = `
<div class="grp-sub" style="margin-top:2px;">AI Features</div>
${this._toggle('ai_enabled', 'AI Features', 'Turns on the AI features below for everyone in the home. They use the AI you’ve already set up in Home Assistant (Settings → Voice assistants, and an AI Task). When this is off, nothing is ever sent to an AI.')}
<div id="ai-wrap">
<div class="grp-sub">Home Assistant AI</div>
<div class="select-row" style="padding:10px 0;">
  <label for="ai_agent">Conversation Agent</label>
  <div class="hint">Answers messages sent to the Home Assistant chat, and can control your home like Assist.</div>
  <select id="ai_agent"><option value="">Home Assistant</option></select>
</div>
<div class="select-row" style="padding:10px 0;">
  <label for="ai_task">AI Task</label>
  <div class="hint">Does everything else. AI Tasks can’t control your devices, so a message like “turn off the heating” is only ever read, never acted on.</div>
  <select id="ai_task"><option value="">Home Assistant’s preferred AI Task</option></select>
</div>
${this._note('ai-task-warn', '<ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:15px;width:15px;height:15px;display:inline-flex;vertical-align:-3px;margin-right:4px;"></ha-icon>No AI Task is set up in Home Assistant, so only Chat with Home Assistant can work. Add an AI integration in Settings → Devices &amp; Services, or choose a preferred one under Settings → System → General → AI suggestions.')}
<div class="grp-sub">Features</div>
${this._toggle('ai_f_assistant', 'Chat with Home Assistant', 'Message “Home Assistant” to ask questions or control your home, from the card or by replying to a notification.')}
${this._toggle('ai_f_replies', 'Suggested Replies', 'Short replies to the latest message appear above the message box. Tap one to use it.')}
${this._toggle('ai_f_writing', 'Writing Tools', 'A pen button in the message box: Proofread, Make Friendlier, Shorter, More Formal or More Casual.')}
${this._toggle('ai_f_catchup', 'Catch Up', 'When you open a chat with several unread messages, Summarise gives you the gist in a sentence or two.')}
${this._toggle('ai_f_translate', 'Translate', 'Press and hold a message → Translate, into the language your phone uses.')}
${this._toggle('ai_f_actions', 'Add to Calendar & Reminders', 'Press and hold a message → Add to Calendar or Add Reminder. The details are filled in for you to check, then added to a Home Assistant calendar or to-do list.')}
${this._toggle('ai_f_ask', 'Ask This Chat', 'Search in a conversation also answers questions about it, like “When is the plumber coming?”, and shows the messages the answer came from. Type a question, or tap Ask. Press and hold ⋯ in a conversation to go straight there.')}
${this._toggle('ai_f_photos', 'Photo Descriptions', 'A button in the photo viewer describes the picture. Needs an AI Task that can read images.')}
${this._note('ai-photo-warn', 'The chosen AI Task can’t read images, so Photo Descriptions won’t appear.', '128,128,128')}
<div style="font-size:11px;color:#888;margin:10px 0 2px;line-height:1.5;">
  <ha-icon icon="mdi:shield-lock-outline" style="--mdc-icon-size:14px;width:14px;height:14px;display:inline-flex;vertical-align:-3px;margin-right:4px;"></ha-icon>Messages only go to the AI when someone uses a feature (Suggested Replies runs when a chat with a new message is opened). If your AI is a cloud service, those messages — including other people’s in a group chat — are sent to it.
</div>
</div>`;

    const pdfBody = `
<div class="grp-sub" style="margin-top:2px;">PDF Exports</div>
${this._toggle('pdf_enabled', 'PDF Exports', 'Lets people save conversations and contacts as PDFs. They’re made on the phone or computer, from what that person can already see, and nothing is sent to the server. The PDF tools are loaded from the internet the first time.')}
<div id="pdf-wrap">
${this._toggle('pdf_conversations', 'Conversations', 'Conversation details → Export as PDF: all messages, the last 30 days or chosen dates, with or without photos.')}
${this._toggle('pdf_contact', 'Contact Cards', 'A contact card → Export as PDF: one page with the photo and every detail.')}
${this._toggle('pdf_contacts', 'Address Book', 'Contacts → ⋯ → Export All as PDF: everyone A–Z, with phone numbers, emails and addresses.')}
</div>`;

    const contactsBody = `
<div class="grp-sub" style="margin-top:2px;">Contacts</div>
<div style="font-size:11px;color:#888;margin:4px 0 4px;line-height:1.4;">Each person’s contacts are private to their own Home Assistant login. These settings only change how they’re shown.</div>
${this._segmented('contact-sort-segmented', 'contact_sort', 'Sort Order', '', [['first', 'First, Last'], ['last', 'Last, First']])}
${this._segmented('contact-display-segmented', 'contact_display', 'Display Order', '', [['first', 'First, Last'], ['last', 'Last, First']])}
${this._toggle('show_my_card', 'Show My Card', 'Show your own card at the top of Contacts, where you can set the name and photo you share.')}
<div class="grp-sub">People Map</div>
${this._toggle('show_people_map', 'People Map', 'A map in Contacts showing where everyone is, from their Home Assistant person (usually the Companion app on their phone). Contact cards also show each person’s current place.')}`;

    const layoutBody = `
<div class="grp-sub" style="margin-top:2px;">Size</div>
<div class="select-row" style="padding:10px 0;">
  <label for="card_height">Card Height</label>
  <div class="hint">How tall the card is on the dashboard. Fill the screen suits a Panel view.</div>
  <select id="card_height">${HEIGHTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
</div>
<div class="grp-sub">Motion</div>
${this._toggle('animations', 'Animations', 'Slide between screens and animate sheets and popups.')}
${this._toggle('effect_words', 'Effects From Words', 'Some words send a screen effect by themselves, like iMessage: Happy Birthday (Balloons), Congratulations (Confetti), Happy New Year (Fireworks), Merry Christmas (Snow), Happy Halloween, Pew Pew (Lasers), I Love You, Good Night (Fireflies), Happy Anniversary (Celebration) and Happy Easter (Petals).')}`;

    const resetBody = `
<div style="font-size:11px;color:#888;margin:2px 0 8px;line-height:1.4;">Puts this card’s own settings (appearance, contacts, PDF exports, typing) back to how they started. Household settings and everyone’s messages aren’t touched.</div>
<div>
          <button id="editor-reset-btn" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,149,0,0.35);background:rgba(255,149,0,0.1);color:rgba(255,149,0,0.9);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:rgba(255,149,0,0.9);flex-shrink:0;"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            Reset All Settings to Defaults
          </button>
          <div id="editor-reset-confirm" style="display:none;margin-top:8px;padding:10px 12px;background:rgba(255,69,58,0.1);border:1px solid rgba(255,69,58,0.3);border-radius:10px;">
            <div style="font-size:12px;color:#ff453a;margin-bottom:8px;font-weight:500;"><ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:15px;width:15px;height:15px;display:inline-flex;vertical-align:-3px;margin-right:4px;"></ha-icon>This will clear all of this card’s customisations (household settings and messages aren’t touched). Are you sure?</div>
            <div style="display:flex;gap:8px;">
              <button id="editor-reset-confirm-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(255,69,58,0.5);background:rgba(255,69,58,0.2);color:#ff453a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Yes, Reset</button>
              <button id="editor-reset-cancel-btn" style="flex:1;padding:7px;border-radius:8px;border:1px solid rgba(128,128,128,0.2);background:transparent;color:#888;font-size:12px;cursor:pointer;font-family:inherit;">Cancel</button>
            </div>
          </div>
        </div>
<div style="font-size:11px;color:#888;margin-top:12px;text-align:center;">Crow Messenger ${CM_VERSION} · card build ${CM_BUILD}</div>`;

    const appearanceBody = `
<div class="grp-sub" style="margin-top:2px;">Theme</div>
<div id="cardGlassRow" style="padding:10px 0;border-bottom:1px solid var(--divider-color,rgba(128,128,128,0.2));">
              <div style="font-size:13px;font-weight:500;margin-bottom:8px;">Style</div>
              <div style="font-size:11px;color:#888;margin-bottom:8px;line-height:1.4;">Classic uses a solid background. Glass makes the card transparent with a frosted-glass blur over the dashboard.</div>
              <div class="segmented" id="card-style-segmented">
                <input type="radio" name="card_style" id="cs_classic" value="classic"><label for="cs_classic">Classic</label>
                <input type="radio" name="card_style" id="cs_glass" value="glass"><label for="cs_glass">Glass</label>
              </div>
            </div>
<div style="padding:10px 0;border-bottom:1px solid var(--divider-color,rgba(128,128,128,0.2));">
              <div style="font-size:13px;font-weight:500;margin-bottom:8px;">Theme</div>
              <div style="font-size:11px;color:#888;margin-bottom:8px;line-height:1.4;">Auto follows Home Assistant’s own light/dark setting, so the card changes colour with it; Light or Dark forces one look.</div>
              <div class="segmented" id="appearance-segmented">
                <input type="radio" name="appearance" id="ap_auto"  value="auto"><label for="ap_auto">Auto</label>
                <input type="radio" name="appearance" id="ap_light" value="light"><label for="ap_light">Light</label>
                <input type="radio" name="appearance" id="ap_dark"  value="dark"><label for="ap_dark">Dark</label>
              </div>
            </div>
<div class="select-row" style="padding:10px 0;border-bottom:1px solid var(--divider-color,rgba(128,128,128,0.2));">
  <label for="default_skin">Default Skin</label>
  <div class="hint">The look everyone starts with. Each person can pick their own from ⋯ → Skin in a conversation, or Filter → Skin in the chat list, and only they see it. Skins other than iPhone bring their own colours, so Style, Glass and the Home Assistant theme don’t apply to them.</div>
  <select id="default_skin">${SKINS.map(k => `<option value="${k.id === 'iphone' ? '' : k.id}">${k.group === 'retro' ? 'Old School · ' : ''}${k.name}</option>`).join('')}</select>
</div>

<div class="toggle-item" style="align-items:flex-start;gap:12px;padding:4px 0 12px;margin-bottom:12px;">
                  <div style="flex:1;">
                    <div class="toggle-label">Follow Home Assistant Theme</div>
                    <div style="font-size:11px;color:#888;margin-top:2px;line-height:1.4;">When on, the card uses your Home Assistant theme’s background and text colours. Bubble and accent colours come from each person’s own theme in the card (conversation details → Theme).</div>
                  </div>
                  <label class="toggle-switch" style="flex-shrink:0;margin-top:2px;"><input type="checkbox" id="use_ha_theme"><span class="toggle-track"></span></label>
                </div>
<div class="grp-sub">Glass</div>
${this._toggle('glass_popups', 'Popup Liquid Glass', 'Confirmation popups (Call, Email, Directions…), menus and the New Message sheet use a frosted-glass look instead of a solid background.')}
${this._toggle('glass_bars', 'Bars Liquid Glass', 'The floating buttons, search bar and message field use frosted glass instead of solid fills.')}
${this._toggle('contact_blur', 'Contact Card Blur', 'Contact cards get a blurred background tinted from the person’s photo, like iOS.')}`;


    this.shadowRoot.innerHTML = `
      <style>
        .container { display: flex; flex-direction: column; gap: 20px; padding: 12px; color: var(--primary-text-color); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; position: relative; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 2px; word-break: break-word; }
        .editor-tooltip { position:relative; display:inline-flex; align-items:center; }
        .editor-tooltip .tooltip-icon { width:14px;height:14px;border-radius:50%;background:rgba(99,179,237,0.15);border:1px solid rgba(99,179,237,0.3);color:rgba(99,179,237,0.7);font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-left:5px;user-select:none; }
        .editor-tooltip .tooltip-text { display:none;position:absolute;left:0;top:20px;z-index:100;background:rgba(28,28,30,0.97);border:1px solid rgba(99,179,237,0.2);border-radius:8px;padding:7px 10px;font-size:11px;color:#ccc;line-height:1.5;width:220px;box-shadow:0 4px 16px rgba(0,0,0,0.4); }
        .editor-tooltip .tooltip-icon:focus + .tooltip-text, .editor-tooltip:hover .tooltip-text { display:block; }
        .colour-preview-strip { display:flex;gap:4px;margin:8px 0;height:6px;border-radius:4px;overflow:hidden; }
        .card-block { background: var(--card-background-color); border: 1px solid var(--divider-color, rgba(128,128,128,0.2)); border-radius: 12px; overflow: hidden; }

        /* ── Colour pickers — leopard style ── */
        .colour-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .colour-card {
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
          position: relative;
        }
        .colour-card:hover {
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          border-color: var(--primary-color, #007AFF);
        }
        .colour-swatch {
          height: 44px; width: 100%;
          display: block; position: relative;
        }
        .colour-swatch input[type="color"] {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          opacity: 0; cursor: pointer; border: none; padding: 0;
        }
        .colour-swatch-preview { position: absolute; inset: 0; pointer-events: none; }
        .colour-swatch::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
          background-size: 8px 8px;
          background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
          opacity: 0.3; pointer-events: none;
        }
        .colour-info {
          padding: 6px 8px 7px;
          background: var(--card-background-color, #fff);
        }
        .colour-label {
          font-size: 11px; font-weight: 700;
          color: var(--primary-text-color); letter-spacing: 0.02em; margin-bottom: 1px;
        }
        .colour-desc {
          font-size: 10px; color: var(--secondary-text-color, #6b7280);
          margin-bottom: 4px; line-height: 1.3;
        }
        .colour-hex-row { display: flex; align-items: center; gap: 4px; }
        .colour-dot {
          width: 12px; height: 12px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0;
        }
        .colour-hex {
          flex: 1; font-size: 11px; font-family: monospace;
          border: none; background: none;
          color: var(--secondary-text-color, #6b7280);
          padding: 0; width: 0; min-width: 0;
        }
        .colour-hex:focus { outline: none; color: var(--primary-text-color); }
        .colour-edit-icon {
          opacity: 0; transition: opacity 0.15s;
          color: var(--secondary-text-color); font-size: 14px; line-height: 1;
        }
        .colour-card:hover .colour-edit-icon { opacity: 1; }

        /* Toggle rows */
        .toggle-list { display: flex; flex-direction: column; }
        .toggle-item { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--divider-color,rgba(128,128,128,0.2)); min-height: 52px; }
        .toggle-item:last-child { border-bottom: none; }
        /* collapsible groups: small headings between their settings, and no line under the last one */
        @keyframes ed-spin { to { transform: rotate(360deg); } }
        .grp-sub { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 2px; }
        .grp-body > .grp-sub:first-child { margin-top: 2px; }
        .grp-body > :last-child { border-bottom: none !important; }
        .toggle-label { font-size: 14px; font-weight: 500; flex: 1; padding-right: 12px; }
        /* iOS toggle switch */
        .toggle-switch { position: relative; width: 51px; height: 31px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track {
          position: absolute; inset: 0; border-radius: 31px;
          background: rgba(120,120,128,0.32); cursor: pointer;
          transition: background 0.25s ease;
        }
        .toggle-track::after {
          content: ''; position: absolute;
          width: 27px; height: 27px; border-radius: 50%;
          background: #fff; top: 2px; left: 2px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.25s ease;
        }
        .toggle-switch input:checked + .toggle-track { background: #34C759; }
        .toggle-switch input:checked + .toggle-track::after { transform: translateX(20px); }

        /* Segmented control */
        .segmented { display: flex; background: rgba(118,118,128,0.2); border-radius: 9px; padding: 2px; gap: 2px; }
        .segmented input[type="radio"] { display: none; }
        .segmented label {
          flex: 1; text-align: center; padding: 8px 4px; font-size: 13px; font-weight: 500;
          border-radius: 7px; cursor: pointer; color: var(--primary-text-color);
          transition: all 0.2s ease; white-space: nowrap;
        }
        .segmented input[type="radio"]:checked + label {
          background: #007AFF; color:var(--primary-text-color, #111)fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        /* Select dropdowns */
        .select-row { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
        .select-row label { font-size: 14px; font-weight: 500; }
        .select-row .hint { font-size: 11px; color: #888; margin-top: -2px; }
        select {
          width: 100%; background: var(--card-background-color); color: var(--primary-text-color);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
          padding: 10px 12px; font-size: 14px; cursor: pointer; -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          padding-right: 32px;
        }

        /* Entity list */
        input[type="text"] { width: 100%; box-sizing: border-box; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color, rgba(128,128,128,0.2)); border-radius: 8px; padding: 10px 12px; font-size: 14px; }
        .checklist { max-height: 300px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .check-item { display: flex; flex-wrap: wrap; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--divider-color, rgba(128,128,128,0.2)); background: var(--card-background-color); min-height: 48px; }
        .entity-ctrl-group { display: flex; align-items: center; gap: 6px; }
        .entity-ctrl-label { font-size: 11px; color: var(--primary-text-color,rgba(0,0,0,0.5)); white-space: nowrap; }
        .check-item:last-child { border-bottom: none; }
        .dragging { opacity: 0.5; background: #444 !important; }
        .drag-handle { cursor: grab; padding: 8px; color: #888; font-size: 20px; user-select: none; flex-shrink: 0; touch-action: none; }
        .check-item .toggle-switch { width: 44px; height: 26px; flex-shrink: 0; margin-left: auto; }
        .check-item .toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }
        .check-item .toggle-track::after { width: 22px; height: 22px; }
        .check-item .toggle-track { border-radius: 26px; }
        .check-item input[type="checkbox"] { display: none; }
        /* Settings page toggles (Startup Volume, Music Assistant Speaker) use a
           smaller 36x22 size that has no matching knob override, so the base
           51x31 rule's translateX(20px) was being used against a much
           narrower track — pushing the knob past the track's right edge when
           checked. Same left:2px/2px-margin pattern as the other two sizes,
           just scaled to this one: knob 18x18, translateX(14px). */
        #entitySettingsVolToggle + .toggle-track::after,
        #entitySettingsMaToggle + .toggle-track::after { width: 18px; height: 18px; }
        #entitySettingsVolToggle:checked + .toggle-track::after,
        #entitySettingsMaToggle:checked + .toggle-track::after { transform: translateX(14px); }

        .range-row { display: flex; align-items: center; gap: 10px; }
        .range-row span { font-size: 11px; color: #888; flex-shrink: 0; }
        .range-row input[type="range"] { flex: 1; accent-color: #007AFF; margin: 4px 0; }
        .user-item { padding: 12px 0; border-bottom: 1px solid var(--divider-color,rgba(128,128,128,0.2)); }
        .user-item:last-child { border-bottom: none; }
      </style>
      <div class="container">

        <!-- ── Search filter ────────────────────────────────── -->
        <div style="position:sticky;top:0;z-index:10;background:var(--ha-card-background,var(--card-background-color,#1c1c1e));padding:4px 0 10px;">
          <ha-icon icon="mdi:magnify" style="position:absolute;left:10px;top:12px;--mdc-icon-size:18px;width:18px;height:18px;display:inline-flex;color:var(--secondary-text-color,#888);pointer-events:none;z-index:1;"></ha-icon>
          <input type="text" id="editor-search" placeholder="Filter settings…" style="width:100%;box-sizing:border-box;padding:9px 12px 9px 36px;border-radius:10px;border:1px solid var(--divider-color,rgba(128,128,128,0.2));background:rgba(128,128,128,0.08);color:var(--primary-text-color,#111);font-size:13px;font-family:inherit;outline:none;">
        </div>

        <div id="admin-note" style="display:${isAdmin ? 'none' : 'block'};padding:10px 14px;background:rgba(255,149,0,0.10);border:1px solid rgba(255,149,0,0.25);border-radius:10px;font-size:12px;color:rgba(255,180,50,0.95);line-height:1.5;">
          <ha-icon icon="mdi:shield-account-outline" style="--mdc-icon-size:15px;width:15px;height:15px;display:inline-flex;vertical-align:-3px;margin-right:4px;"></ha-icon>Dashboards, Notifications, Keep Messages, Largest Attachment, Storage and AI are household settings — only a Home Assistant administrator can change them.
        </div>
        <div id="int-error" style="display:none;padding:10px 14px;background:rgba(255,69,58,0.1);border:1px solid rgba(255,69,58,0.3);border-radius:10px;font-size:12px;color:#ff453a;line-height:1.5;"></div>
${this._section('usersGrp', '48,209,88', ED_ICONS.users, 'Dashboards', 'Household · Where notifications open · One for everyone or each person', usersBody)}
${this._section('notifGrp', '255,159,10', ED_ICONS.bell, 'Notifications', 'Household · iPhone &amp; Android · Previews · Reply · Calls · People &amp; phones', notifBody)}
${this._section('msgsGrp', '90,200,250', ED_ICONS.message, 'Messages', 'Keep Messages · Largest attachment · Links · Voice · Return key', msgsBody)}
${this._section('storageGrp', '142,142,147', ED_ICONS.storage, 'Storage', 'Household · Photos &amp; files on the server', storageBody)}
${this._section('aiGrp', '255,159,10', ED_ICONS.ai, 'AI', 'Household · Home Assistant chat · Replies · Writing · Catch Up · Translate · Calendar · Photos', aiBody)}
${this._section('contactsGrp', '191,90,242', ED_ICONS.contacts, 'Contacts &amp; People', 'Sort · Display · My Card · People Map', contactsBody)}
${this._section('pdfGrp', '255,69,58', ED_ICONS.pdf, 'PDF Exports', 'Conversations · Contact cards · Address book', pdfBody)}
${this._section('colours', '99,179,237', ED_ICONS.palette, 'Appearance', 'Style · Light &amp; dark · Home Assistant theme · Glass', appearanceBody)}
${this._section('layoutGrp', '94,92,230', ED_ICONS.layout, 'Layout &amp; Motion', 'Card height · Animations', layoutBody)}
${this._section('resetGrp', '255,149,0', ED_ICONS.reset, 'Reset', 'Put this card’s settings back to how they started', resetBody)}
        <div style="text-align:center;font-size:11px;color:#888;">Crow Messenger ${CM_VERSION}</div>
      </div>`;

    this._setupListeners();
    this.updateUI();
    this._loadIntegration();
  }

  updateUI() {
    const root = this.shadowRoot;
    if (!root || !this._initialized) return;
    const c = this._config;
    const chk = (id, on) => { const el = root.getElementById(id); if (el) el.checked = on; };
    chk('cs_glass', c.card_liquid_glass !== false);
    chk('cs_classic', c.card_liquid_glass === false);
    ['auto', 'light', 'dark'].forEach(v => chk('ap_' + v, (c.appearance || 'auto') === v));
    chk('use_ha_theme', c.use_ha_theme === true);
    chk('glass_popups', c.glass_popups !== false);
    chk('glass_bars', c.glass_bars !== false);
    chk('contact_blur', c.contact_blur !== false);
    chk('animations', c.animations !== false);
    chk('effect_words', c.effect_words !== false);
    ['pdf_enabled', 'pdf_conversations', 'pdf_contact', 'pdf_contacts'].forEach(k => chk(k, c[k] !== false));
    const pw = root.getElementById('pdf-wrap'); if (pw) { pw.style.opacity = c.pdf_enabled === false ? '0.4' : '1'; pw.style.pointerEvents = c.pdf_enabled === false ? 'none' : ''; }
    chk('enter_sends', c.enter_sends !== false);
    chk('show_my_card', c.show_my_card !== false);
    chk('show_people_map', c.show_people_map !== false);
    ['first', 'last'].forEach(v => { chk('contact_sort_' + v, (c.contact_sort || 'last') === v); chk('contact_display_' + v, (c.contact_display || 'first') === v); });
    const dsk = root.getElementById('default_skin');
    if (dsk) dsk.value = SKIN_BY[c.default_skin] && c.default_skin !== 'iphone' ? c.default_skin : '';
    const h = root.getElementById('card_height');
    if (h) h.value = String(c.card_height ?? 700);
    this._updateIntegrationUI();
  }

  _updateConfigMulti(patch) {
    const cleanConfig = { ...this._raw, ...patch };
    Object.keys(CM_DEFAULTS).forEach(k => { if (cleanConfig[k] === CM_DEFAULTS[k]) delete cleanConfig[k]; });
    this._raw = cleanConfig;
    this._config = { ...CM_DEFAULTS, ...cleanConfig };
    this.updateUI();
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cleanConfig }, bubbles: true, composed: true }));
  }

  _setupListeners() {
    const root = this.shadowRoot;
    // Collapsible groups: tap the header to open or close
    root.querySelectorAll('[data-grp]').forEach(h => {
      const k = h.dataset.grp, b = root.getElementById(k + 'Body'), c = root.getElementById(k + 'Chevron');
      if (!b) return;
      h.addEventListener('click', () => {
        const open = b.style.display !== 'none';
        b.style.display = open ? 'none' : 'flex';
        b.style.flexDirection = 'column';
        if (c) c.style.transform = open ? '' : 'rotate(90deg)';
      });
    });

    // Card settings
    root.getElementById('cs_classic')?.addEventListener('change', () => { this._updateConfig('card_liquid_glass', false); this.updateUI(); });
    root.getElementById('cs_glass')?.addEventListener('change', () => { this._updateConfig('card_liquid_glass', true); this.updateUI(); });
    ['auto', 'light', 'dark'].forEach(v => root.getElementById('ap_' + v)?.addEventListener('change', () => this._updateConfig('appearance', v)));
    ['use_ha_theme', 'glass_popups', 'glass_bars', 'contact_blur', 'animations', 'effect_words', 'enter_sends', 'show_my_card', 'show_people_map',
      'pdf_enabled', 'pdf_conversations', 'pdf_contact', 'pdf_contacts'].forEach(id => {
      root.getElementById(id)?.addEventListener('change', (e) => { this._updateConfig(id, e.target.checked); if (id === 'pdf_enabled') this.updateUI(); });
    });
    ['first', 'last'].forEach(v => {
      root.getElementById('contact_sort_' + v)?.addEventListener('change', () => this._updateConfig('contact_sort', v));
      root.getElementById('contact_display_' + v)?.addEventListener('change', () => this._updateConfig('contact_display', v));
    });
    root.getElementById('default_skin')?.addEventListener('change', (e) => this._updateConfig('default_skin', e.target.value));
    root.getElementById('card_height')?.addEventListener('change', (e) => {
      const v = e.target.value;
      this._updateConfig('card_height', v === 'fill' ? 'fill' : parseInt(v, 10));
    });

    // Household settings (integration)
    ['enabled', 'show_text', 'show_attachment', 'sound', 'reply_action', 'call_alerts', 'badge'].forEach(k => {
      root.getElementById('n_' + k)?.addEventListener('change', (e) => this._saveSettings({ notifications: { [k]: e.target.checked } }));
    });
    RETENTION.forEach(([v]) => root.getElementById('retention_' + v)?.addEventListener('change', () => this._onRetention(v)));
    UPLOAD_SIZES.forEach(([v]) => root.getElementById('upload_' + v)?.addEventListener('change', () => this._saveSettings({ max_upload_mb: v })));
    STORAGE_AGES.forEach(([v]) => root.getElementById('storage_age_' + v)?.addEventListener('change', () => { this._storageAge = v; root.getElementById('storage-confirm').style.display = 'none'; }));
    ['link_previews', 'zones'].forEach(k => root.getElementById('f_' + k)?.addEventListener('change', (e) => this._saveSettings({ features: { [k]: e.target.checked } })));
    root.getElementById('ai_enabled')?.addEventListener('change', (e) => this._saveSettings({ ai: { enabled: e.target.checked } }));
    root.getElementById('ai_agent')?.addEventListener('change', (e) => this._saveSettings({ ai: { agent_id: e.target.value } }));
    root.getElementById('ai_task')?.addEventListener('change', (e) => this._saveSettings({ ai: { task_entity: e.target.value } }));
    AI_FEATURES.forEach(f => root.getElementById('ai_f_' + f)?.addEventListener('change', (e) => this._saveSettings({ ai: { features: { [f]: e.target.checked } } })));
    root.getElementById('storage-btn')?.addEventListener('click', () => {
      const age = this._storageAge ?? 90;
      const label = STORAGE_AGES.find(x => x[0] === age)[1];
      root.getElementById('storage-confirm-text').textContent = age === 0
        ? 'Every photo, video and file in every conversation will be deleted from the server for everyone. This can’t be undone.'
        : `Photos, videos and files older than ${label.toLowerCase()} will be deleted from the server for everyone. This can’t be undone.`;
      root.getElementById('storage-confirm').style.display = 'block';
    });
    root.getElementById('storage-cancel-btn')?.addEventListener('click', () => { root.getElementById('storage-confirm').style.display = 'none'; });
    root.getElementById('storage-confirm-btn')?.addEventListener('click', async () => {
      root.getElementById('storage-confirm').style.display = 'none';
      try {
        const r = await this._hass.callWS({ type: 'crow_messenger/storage/clear', older_than_days: this._storageAge ?? 90 });
        this._storage = r;
        this._renderStorage(`Deleted ${r.removed} ${r.removed === 1 ? 'attachment' : 'attachments'} (${fmtBytes(r.freed_bytes) || '0 B'}).`);
      } catch (e) {
        const err = root.getElementById('int-error');
        err.textContent = `Couldn’t delete: ${e?.message || e}`; err.style.display = 'block';
      }
    });
    root.getElementById('retention-cancel-btn')?.addEventListener('click', () => { root.getElementById('retention-confirm').style.display = 'none'; this._updateIntegrationUI(); });
    root.getElementById('retention-confirm-btn')?.addEventListener('click', () => {
      root.getElementById('retention-confirm').style.display = 'none';
      this._saveSettings({ retention_days: this._pendingRetention });
    });
    // One dashboard for everyone
    const cleanPath = (raw) => {
      let v = String(raw || '').trim();
      try { if (/^https?:/i.test(v)) v = new URL(v).pathname; } catch (err) { /* keep as typed */ }
      v = v.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
      return v ? `/${v}` : '';
    };
    root.getElementById('dash_everyone')?.addEventListener('change', (e) => this._saveSettings({ dashboard: { everyone: e.target.checked } }));
    const dashPath = root.getElementById('dash_path');
    dashPath?.addEventListener('change', () => this._saveSettings({ dashboard: { path: cleanPath(dashPath.value) } }));
    dashPath?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dashPath.blur(); } });
    root.getElementById('dash_pick')?.addEventListener('change', (e) => { if (e.target.value) this._saveSettings({ dashboard: { path: e.target.value, everyone: true } }); e.target.value = ''; });
    root.getElementById('use-here-btn')?.addEventListener('click', () => {
      const parts = window.location.pathname.split('/').filter(Boolean);
      this._saveSettings({ dashboard: { everyone: true, path: `/${parts[0] || 'lovelace'}/${parts[1] || '0'}` } });
    });

    // Search / filter
    const editorSearch = root.getElementById('editor-search');
    if (editorSearch) {
      const container = root.querySelector('.container');
      const ROW = '.toggle-item, .user-item, .select-row, .grp-body > div';
      const norm = s => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
      let empty = root.getElementById('editor-search-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.id = 'editor-search-empty';
        empty.style.cssText = 'display:none;font-size:12px;color:var(--secondary-text-color,#888);padding:8px 2px 0;';
        editorSearch.parentElement.appendChild(empty);
      }
      const restore = () => {
        container.querySelectorAll('[data-es-hidden]').forEach(el => { el.style.display = el.dataset.esPrev || ''; delete el.dataset.esHidden; delete el.dataset.esPrev; });
        container.querySelectorAll('[data-es-open]').forEach(b => {
          b.style.display = 'none';
          const c = root.getElementById(b.id.replace(/Body$/, 'Chevron'));
          if (c) c.style.transform = b.dataset.esChev || '';
          delete b.dataset.esOpen; delete b.dataset.esChev;
        });
      };
      const apply = () => {
        restore();
        const words = norm(editorSearch.value).trim().split(' ').filter(Boolean);
        empty.style.display = 'none';
        if (!words.length) return;
        const hit = t => { const n = norm(t); return words.every(w => n.includes(w)); };
        const hide = el => { if (el.dataset.esHidden) return; el.dataset.esHidden = '1'; el.dataset.esPrev = el.style.display; el.style.display = 'none'; };
        let any = false;
        container.querySelectorAll('[id$="Body"]').forEach(b => {
          const header = root.getElementById(b.id.replace(/Body$/, 'Header'));
          const title = header?.querySelector('div > div > div')?.textContent || '';
          const rows = [...b.children].filter(r => !r.classList.contains('grp-sub'));
          const titleHit = hit(title);
          const matches = rows.filter(r => hit(r.textContent));
          const sec = b.closest('.card-block').parentElement;
          if (!titleHit && !matches.length) { hide(sec); return; }
          any = true;
          const c = root.getElementById(b.id.replace(/Body$/, 'Chevron'));
          if (b.style.display === 'none') {
            b.dataset.esOpen = '1'; b.dataset.esChev = c?.style.transform || '';
            b.style.display = 'flex'; b.style.flexDirection = 'column';
            if (c) c.style.transform = 'rotate(90deg)';
          }
          if (!titleHit) [...b.children].forEach(r => { if (!matches.includes(r)) hide(r); });
        });
        if (!any) { empty.textContent = 'No settings match “' + editorSearch.value.trim() + '”.'; empty.style.display = 'block'; }
      };
      editorSearch.addEventListener('input', apply);
      editorSearch.addEventListener('keydown', e => { if (e.key === 'Escape') { editorSearch.value = ''; apply(); } });
    }

    // Reset to Defaults (this card's settings only)
    const resetBtn = root.getElementById('editor-reset-btn');
    const resetConfirm = root.getElementById('editor-reset-confirm');
    if (resetBtn && resetConfirm) {
      resetBtn.addEventListener('click', () => { resetConfirm.style.display = resetConfirm.style.display === 'none' ? 'block' : 'none'; });
      root.getElementById('editor-reset-cancel-btn')?.addEventListener('click', () => { resetConfirm.style.display = 'none'; });
      root.getElementById('editor-reset-confirm-btn')?.addEventListener('click', () => {
        // household changes waiting for Save aren't this card's settings - keep them
        this._raw = { type: this._raw?.type || 'custom:crow-messenger-card', ...(this._raw?.[CM_HC] ? { [CM_HC]: this._raw[CM_HC] } : {}) };
        this._config = { ...CM_DEFAULTS };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._raw }, bubbles: true, composed: true }));
        resetConfirm.style.display = 'none';
        this.updateUI();
      });
    }
  }

  _updateConfig(key, value) {
    if (!this._config) return;
    // Only the original config plus the new key - defaults never get written into YAML.
    const cleanConfig = { ...this._raw, [key]: value };
    Object.keys(CM_DEFAULTS).forEach(k => { if (cleanConfig[k] === CM_DEFAULTS[k]) delete cleanConfig[k]; });
    this._raw = cleanConfig;
    this._config = { ...CM_DEFAULTS, ...cleanConfig };
    if (key === 'use_ha_theme' || key === 'appearance') this.updateUI();
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cleanConfig }, bubbles: true, composed: true }));
  }

  // ── Household settings ─────────────────────────────────────────────────────
  async _loadIntegration() {
    const err = this.shadowRoot.getElementById('int-error');
    try {
      this._ints = await this._hass.callWS({ type: 'crow_messenger/settings/get' });
      if (CM_STAGED.has(this._rev)) this._ints.settings = cmMerge(this._ints.settings, CM_STAGED.get(this._rev));
      err.style.display = 'none';
    } catch (e) {
      err.textContent = e?.code === 'unknown_command'
        ? 'The Crow Messenger integration isn’t set up yet. Go to Settings → Devices & Services → Add Integration → Crow Messenger, then reopen this editor.'
        : `Couldn’t load Crow Messenger settings: ${e?.message || e}`;
      err.style.display = 'block';
      this._ints = null;
    }
    if (this._ints?.is_admin) {
      try { this._storage = await this._hass.callWS({ type: 'crow_messenger/storage/get' }); } catch (e) { this._storage = null; }
      try { this._agents = (await this._hass.callWS({ type: 'conversation/agent/list' })).agents || []; } catch (e) { this._agents = []; }
      this._renderStorage();
      try {
        const list = await this._hass.callWS({ type: 'lovelace/dashboards/list' });
        this._dashboards = [{ url_path: 'lovelace', title: 'Overview' }, ...list.filter(d => d.url_path).map(d => ({ url_path: d.url_path, title: d.title || d.url_path }))];
      } catch (e) { this._dashboards = [{ url_path: 'lovelace', title: 'Overview' }]; }
      this._pathOptions = [{ value: 'auto', label: 'Automatic' }];
      this._renderUsers();
      // every dashboard's views, for the picker next to each person's box
      const opts = [{ value: 'auto', label: 'Automatic' }];
      for (const d of this._dashboards) {
        for (const v of await this._viewsFor(d.url_path)) opts.push({ value: `/${d.url_path}/${v.value}`, label: `${d.title} › ${v.label}` });
      }
      this._pathOptions = opts;
      this._renderUsers();
    }
    this._updateIntegrationUI();
  }

  async _viewsFor(dash) {
    if (this._views.has(dash)) return this._views.get(dash);
    let views = [];
    try {
      const cfg = await this._hass.callWS({ type: 'lovelace/config', url_path: dash === 'lovelace' ? null : dash });
      views = (cfg?.views || []).map((v, i) => ({ value: v.path || String(i), label: v.title || v.path || `View ${i + 1}` }));
    } catch (e) { /* strategy dashboards */ }
    if (!views.length) views = [{ value: '0', label: 'First view' }];
    this._views.set(dash, views);
    return views;
  }

  async _renderUsers() {
    const host = this.shadowRoot.getElementById('users-list'), nhost = this.shadowRoot.getElementById('notify-people');
    if (!host || !this._ints?.is_admin) return;
    const settings = this._ints.settings || {};
    const devices = this._ints.devices || [];
    const users = this._ints.users || [];
    const esc2 = esc;
    const avatar = (u) => {
      const pic = u.picture ? (/^(data:|https?:)/.test(u.picture) ? u.picture : this._hass.hassUrl(u.picture)) : '';
      return `<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(180deg,#A5ABB9,#858994);color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;">${pic ? `<img src="${esc2(pic)}" style="width:100%;height:100%;object-fit:cover">` : esc2(initials(u.name))}</div>`;
    };
    const opts = this._pathOptions.map(o => `<option value="${esc2(o.value)}">${esc2(o.label)}</option>`).join('');
    // Dashboards: where each person's notifications open
    host.innerHTML = users.map(u => {
      const cfg = settings.users?.[u.id] || {};
      const auto = this._ints.auto_paths?.[u.id];
      const path = cfg.path || (cfg.dashboard ? `/${cfg.dashboard}/${cfg.view ?? '0'}` : '');
      const first = esc2(u.name.split(' ')[0]);
      return `<div class="user-item" data-uid="${esc2(u.id)}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">${avatar(u)}<div style="font-size:14px;font-weight:600;">${esc2(u.name)}</div></div>
        <div style="display:flex;gap:8px;">
          <input type="text" data-f="path" value="${esc2(path)}" placeholder="Automatic — e.g. /home-mobile/${first.toLowerCase()}" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1;min-width:0;">
          <select data-f="pick" style="width:44px;flex-shrink:0;padding:10px 0;background-position:center;color:transparent;" aria-label="Choose a dashboard view"><option value="">Choose…</option>${opts}</select>
        </div>
        <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.4;">${path ? `Opens <b>${esc2(path)}</b>.` : auto ? `Automatic: opens <b>${esc2(auto)}</b> — the last place ${first} opened this card.` : `Automatic: opens wherever ${first} next opens this card.`}</div>
      </div>`;
    }).join('') || '<div style="font-size:12px;color:#888;padding:10px 0;">No Home Assistant users found.</div>';
    // Notifications: each person on or off, and their phones
    if (nhost) nhost.innerHTML = users.map(u => {
      const cfg = settings.users?.[u.id] || {};
      const mine = devices.filter(d => d.user_id === u.id);
      return `<div class="user-item" data-uid="${esc2(u.id)}">
        <div class="toggle-item" style="align-items:center;gap:10px;padding:0;min-height:0;border-bottom:none;">
          ${avatar(u)}
          <div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:600;">${esc2(u.name)}</div><div style="font-size:11px;color:#888;">${mine.length ? `${mine.length} phone${mine.length > 1 ? 's' : ''} with the Companion app` : 'No Companion app signed in — no phone notifications'}</div></div>
          <label class="toggle-switch" style="flex-shrink:0;"><input type="checkbox" data-f="notify" ${cfg.notify === false ? '' : 'checked'}><span class="toggle-track"></span></label>
        </div>
        ${mine.map(d => `<div class="check-item" style="padding:6px 0 0 42px;min-height:0;border-bottom:none;background:transparent;">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#888;margin-right:8px;">${ED_ICONS.phone}</svg>
          <div style="flex:1;min-width:0;"><div style="font-size:13px;">${esc2(d.name)}</div><div style="font-size:11px;color:#888;">${d.platform === 'ios' ? 'iPhone / iPad' : 'Android'}${d.model ? ' · ' + esc2(d.model) : ''}${d.available ? '' : ' · not reachable'}</div></div>
          <label class="toggle-switch"><input type="checkbox" data-dev="${esc2(d.service)}" ${cfg.devices?.[d.service] === false ? '' : 'checked'}><span class="toggle-track"></span></label>
        </div>`).join('')}
      </div>`;
    }).join('');
    host.querySelectorAll('.user-item').forEach(item => {
      const uid = item.dataset.uid;
      const pathInput = item.querySelector('[data-f="path"]');
      const savePath = async (raw) => {
        let v = String(raw || '').trim();
        try { if (/^https?:/i.test(v)) v = new URL(v).pathname; } catch (err) { /* keep as typed */ }
        v = v.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
        const p = v ? `/${v}` : '';
        if (p === (this._ints.settings.users?.[uid]?.path || '') && !this._ints.settings.users?.[uid]?.dashboard) return;
        await this._saveSettings({ users: { [uid]: { path: p, dashboard: '', view: '' } } });
        this._renderUsers();
      };
      pathInput.addEventListener('change', () => savePath(pathInput.value));
      pathInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pathInput.blur(); } });
      item.querySelector('[data-f="pick"]').addEventListener('change', (e) => { if (e.target.value !== '') savePath(e.target.value === 'auto' ? '' : e.target.value); });
    });
    nhost?.querySelectorAll('.user-item').forEach(item => {
      const uid = item.dataset.uid;
      item.querySelector('[data-f="notify"]').addEventListener('change', (e) => this._saveSettings({ users: { [uid]: { notify: e.target.checked } } }));
      item.querySelectorAll('[data-dev]').forEach(inp => inp.addEventListener('change', (e) => {
        const cur = { ...(this._ints.settings.users?.[uid]?.devices || {}), [inp.dataset.dev]: e.target.checked };
        this._saveSettings({ users: { [uid]: { devices: cur } } });
      }));
    });
    const pick = this.shadowRoot.getElementById('dash_pick');
    if (pick) pick.innerHTML = '<option value="">Choose…</option>' + this._pathOptions.filter(o => o.value !== 'auto').map(o => `<option value="${esc2(o.value)}">${esc2(o.label)}</option>`).join('');
    this._updateDashUI();
  }

  _updateDashUI() {
    const r = this.shadowRoot;
    const d = this._ints?.settings?.dashboard || {};
    const on = d.everyone !== false;   // on unless an administrator has turned it off
    const chk = r.getElementById('dash_everyone'); if (chk) chk.checked = on;
    const inp = r.getElementById('dash_path'); if (inp && r.activeElement !== inp) inp.value = d.path || '';
    const row = r.getElementById('dash-everyone-row'); if (row) row.style.display = on ? 'block' : 'none';
    // the choices for each person are off while one dashboard is used for everyone
    const people = r.getElementById('dash-people');
    if (people) { people.style.opacity = on ? '0.35' : '1'; people.style.pointerEvents = on ? 'none' : ''; }
  }

  _updateIntegrationUI() {
    const r = this.shadowRoot;
    const st = this._ints?.settings;
    const admin = !!this._ints?.is_admin;
    ['usersGrp', 'notifGrp'].forEach(id => {
      const b = r.getElementById(id + 'Body');
      if (b) { b.style.opacity = admin ? '1' : '0.4'; b.style.pointerEvents = admin ? '' : 'none'; }
    });
    this._updateAiUI(admin);
    this._updateDashUI();
    const sw = r.getElementById('storageGrpBody');
    if (sw) { sw.style.opacity = admin ? '1' : '0.4'; sw.style.pointerEvents = admin ? '' : 'none'; }
    if (!r.querySelector('input[name="storage_age"]:checked')) { const d = r.getElementById('storage_age_' + (this._storageAge ?? 90)); if (d) d.checked = true; }
    if (!admin) this._renderStorage();
    ['retention-segmented', 'upload-segmented'].forEach(id => {
      const s = r.getElementById(id)?.parentElement;
      if (s) { s.style.opacity = admin ? '1' : '0.4'; s.style.pointerEvents = admin ? '' : 'none'; }
    });
    const n = st?.notifications || {};
    const chk = (id, on) => { const el = r.getElementById(id); if (el) el.checked = on; };
    ['enabled', 'show_text', 'show_attachment', 'sound', 'reply_action', 'call_alerts'].forEach(k => chk('n_' + k, n[k] !== false));
    chk('n_badge', n.badge === true);
    const f = st?.features || {};
    ['link_previews', 'zones'].forEach(k => chk('f_' + k, f[k] !== false));
    const fw = r.getElementById('feat-wrap');
    if (fw) { fw.style.opacity = admin ? '1' : '0.4'; fw.style.pointerEvents = admin ? '' : 'none'; }
    const ret = st?.retention_days ?? this._ints?.retention_days ?? 30;
    RETENTION.forEach(([v]) => chk('retention_' + v, ret === v));
    const up = st?.max_upload_mb ?? 300;
    UPLOAD_SIZES.forEach(([v]) => chk('upload_' + v, up === v));
    ['n_show_text', 'n_show_attachment', 'n_sound', 'n_reply_action', 'n_call_alerts', 'n_badge'].forEach(id => {
      const row = r.getElementById(id)?.closest('.toggle-item');
      if (row) row.style.opacity = n.enabled === false ? '0.4' : '1';
    });
  }

  _updateAiUI(admin) {
    const r = this.shadowRoot;
    const ai = this._ints?.settings?.ai || {};
    const caps = this._ints?.ai || {};
    const chk = (id, on) => { const el = r.getElementById(id); if (el) el.checked = on; };
    chk('ai_enabled', ai.enabled === true);
    AI_FEATURES.forEach(f => chk('ai_f_' + f, (ai.features || {})[f] !== false));
    const agentSel = r.getElementById('ai_agent'), taskSel = r.getElementById('ai_task');
    if (agentSel) {
      const agents = (this._agents || []).filter(a => a.id !== 'conversation.home_assistant' && a.id !== 'homeassistant');
      const html = `<option value="">Home Assistant (Assist)</option>` + agents.map(a => `<option value="${a.id}">${a.name || a.id}</option>`).join('');
      if (agentSel._html !== html) { agentSel.innerHTML = html; agentSel._html = html; }
      agentSel.value = ai.agent_id || '';
    }
    if (taskSel) {
      const tasks = Object.values(this._hass?.states || {}).filter(s => s.entity_id.startsWith('ai_task.'));
      const def = this._ints?.ai_task_default;
      const defName = def ? (this._hass.states[def]?.attributes?.friendly_name || def) : 'none set';
      const html = `<option value="">Home Assistant’s preferred (${defName})</option>` + tasks.map(s => `<option value="${s.entity_id}">${s.attributes.friendly_name || s.entity_id}</option>`).join('');
      if (taskSel._html !== html) { taskSel.innerHTML = html; taskSel._html = html; }
      taskSel.value = ai.task_entity || '';
      const noTask = ai.enabled === true && !(ai.task_entity || def);
      const w = r.getElementById('ai-task-warn'); if (w) w.style.display = noTask ? 'block' : 'none';
      const pw = r.getElementById('ai-photo-warn');
      if (pw) pw.style.display = ai.enabled === true && !noTask && (ai.features || {}).photos !== false && caps.photos === false ? 'block' : 'none';
    }
    const box = r.getElementById('aiGrpBody');
    if (box) { box.style.opacity = admin ? '1' : '0.4'; box.style.pointerEvents = admin ? '' : 'none'; }
    const wrap = r.getElementById('ai-wrap');
    if (wrap) wrap.style.opacity = ai.enabled === true ? '1' : '0.45';
  }

  _renderStorage(done) {
    const el = this.shadowRoot.getElementById('storage-stats');
    if (!el) return;
    const s = this._storage;
    el.textContent = !s ? 'Only an administrator can see this.'
      : (done ? done + ' ' : '') + (s.count ? `${s.count} ${s.count === 1 ? 'photo, video or file' : 'photos, videos and files'} using ${fmtBytes(s.bytes) || '0 B'}.` : 'No attachments are stored.');
  }

  _onRetention(days) {
    const cur = this._ints?.settings?.retention_days ?? 30;
    const shorter = days !== 0 && (cur === 0 || days < cur);
    if (shorter) {
      this._pendingRetention = days;
      const label = RETENTION.find(x => x[0] === days)[1].toLowerCase();
      this.shadowRoot.getElementById('retention-confirm-text').innerHTML = `<ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:15px;width:15px;height:15px;display:inline-flex;vertical-align:-3px;margin-right:4px;"></ha-icon>Messages and attachments older than ${label} will be deleted for everyone when you press Save. This can’t be undone.`;
      this.shadowRoot.getElementById('retention-confirm').style.display = 'block';
      return;
    }
    this._saveSettings({ retention_days: days });
  }

  // Household settings are only staged here; they're sent when the dashboard's Save button is pressed.
  async _saveSettings(patch) {
    if (!this._ints?.is_admin) return;
    if (!CM_STAGED.has(this._rev)) { this._rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); CM_STAGED.set(this._rev, {}); }
    CM_STAGED.set(this._rev, cmMerge(CM_STAGED.get(this._rev), patch));
    this._ints.settings = cmMerge(this._ints.settings, patch);
    this._raw = { ...this._raw, [CM_HC]: this._rev };
    cmWatch(this._hass);
    // a real change to the card's config, so Save lights up (and Cancel throws it away)
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._raw } }, bubbles: true, composed: true }));
    this._updateIntegrationUI();
  }


}

// ── Register ─────────────────────────────────────────────────────────────────
// Another copy of the card got here first (an old copy added as a dashboard resource, say):
// that copy is the one that runs, so say so where it can be found.
if (customElements.get('crow-messenger-card') && window.__crowMessengerBuild !== CM_BUILD) {
  console.warn(`Crow Messenger: an older copy of the card (${window.__crowMessengerBuild || 'unknown build'}) loaded before this one (${CM_BUILD}) and is the one running. Remove any Crow Messenger entry under Settings → Dashboards → ⋮ → Resources — the integration loads the card itself — then restart Home Assistant.`);
}
window.__crowMessengerBuild = window.__crowMessengerBuild || CM_BUILD;
// ── More Live Wallpapers ─────────────────────────────────────────────────────
// Living Sky follows Home Assistant's sun.sun; the rest are scenes. Each draws on the same canvas loop as the screensavers (30 frames a second,
// stopped when the chat isn't on screen, one still frame with Reduce Motion).
const lwMix = (a, b, k) => { const x = fxHex(a), y = fxHex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join(''); };
const LW_SKY = {
  night: ['#020611', '#0a1430', '#1a2a52'], dawn: ['#27306a', '#8a6aa0', '#ffb59a'],
  day: ['#2a6fd0', '#62a6e8', '#cfe6f7'], dusk: ['#1d1645', '#7d3c6e', '#ff9a5a'],
};
const lwSun = (hass) => {
  const s = hass?.states?.['sun.sun']?.attributes;
  if (s && typeof s.elevation === 'number') return { el: s.elevation, rising: !!s.rising };
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  return { el: 50 * Math.sin((h - 6) / 12 * Math.PI), rising: h < 12 };
};
// the sky's colours (top, middle, horizon) for where the sun is, and how much it's night
const lwSky = (hass) => {
  const { el, rising } = lwSun(hass), tw = rising ? LW_SKY.dawn : LW_SKY.dusk;
  if (el <= -8) return { c: LW_SKY.night, el, night: 1 };
  if (el < 0) { const k = (el + 8) / 8; return { c: LW_SKY.night.map((x, i) => lwMix(x, tw[i], k)), el, night: 1 - k }; }
  if (el < 12) return { c: tw.map((x, i) => lwMix(x, LW_SKY.day[i], el / 12)), el, night: 0 };
  return { c: LW_SKY.day, el, night: 0 };
};
const lwGrad = (ctx, W, H, stops) => {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};
const lwClouds = (n, W, H, top = 0.05, band = 0.45) => Array.from({ length: n }, () => ({
  x: fxRnd(-0.3, 1.1) * W, y: fxRnd(top, top + band) * H, w: fxRnd(0.35, 0.7) * Math.min(W, 520), sp: fxRnd(4, 12),
  puffs: Array.from({ length: 9 }, () => ({ dx: fxRnd(-0.45, 0.45), dy: fxRnd(-0.18, 0.12), r: fxRnd(0.3, 0.55) })),
}));
const lwDrawClouds = (ctx, clouds, dt, W, col, a) => {
  for (const c of clouds) {
    c.x += c.sp * dt;
    if (c.x - c.w > W) c.x = -c.w;
    for (const p of c.puffs) fxDraw(ctx, fxGlow(col), c.x + p.dx * c.w, c.y + p.dy * c.w, p.r * c.w, a);
  }
};
// a dandelion seed, for summer
Object.assign(CrowLiveWallpaper.prototype, {
  _lwBox(stage, bg) {
    const box = document.createElement('div');
    box.className = 'cs-lwbox'; box.style.background = bg || '#000';
    stage.appendChild(box);
    return box;
  },
  _lwOnTap(fn) {
    const host = this._saverEl?.parentElement;
    if (!host) return;
    const h = (e) => { const r = this._saverEl?.getBoundingClientRect(); if (r) fn(e.clientX - r.left, e.clientY - r.top); };
    host.addEventListener('pointerdown', h, true);
    (this._liveOff ||= []).push(() => host.removeEventListener('pointerdown', h, true));
  },

  // ── Living Sky: clouds drifting across a sky that follows the sun ──
  _saverSky(stage) {
    const box = this._lwBox(stage, '#0a1430');
    let B = null;
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      if (resized || !B) B = { clouds: lwClouds(8, W, H, 0.05, 0.75), stars: Array.from({ length: Math.round(W * H / 2500) }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H * 0.8), s: fxRnd(1.5, 4), ph: fxRnd(0, 6.3) })) };
      const sky = lwSky(this._hass);
      lwGrad(ctx, W, H, [[0, sky.c[0]], [0.6, sky.c[1]], [1, sky.c[2]]]);
      ctx.globalCompositeOperation = 'lighter';
      if (sky.night > 0.1) B.stars.forEach(s => fxDraw(ctx, fxGlow('#e6ecff', 0.2), s.x, s.y, s.s, (0.45 + 0.45 * Math.sin(t * 1.7 + s.ph)) * sky.night));
      if (sky.night < 0.7) { const sy = H * (0.86 - Math.min(45, Math.max(-4, sky.el)) / 45 * 0.62); fxDraw(ctx, fxGlow(sky.el < 10 ? '#ffc58a' : '#fff6d8', 0.12), W * 0.3, sy, Math.min(W, H) * 0.9, 0.85 * (1 - sky.night)); }
      else fxDraw(ctx, fxGlow('#dfe8ff', 0.25), W * 0.72, H * 0.18, Math.min(W, H) * 0.3, 0.75);
      ctx.globalCompositeOperation = 'source-over';
      const col = sky.night > 0.6 ? '#2a3550' : sky.el < 10 ? lwMix('#ffd2b8', '#c99ac2', sky.night) : '#ffffff';
      lwDrawClouds(ctx, B.clouds, dt, W, col, sky.night > 0.6 ? 0.22 : 0.3);
    });
  },

  // ── Snowfall ──
  _saverSnowfall(stage) {
    const box = this._lwBox(stage, '#0b1730');
    let fl = null;
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      if (resized || !fl) fl = Array.from({ length: Math.round(W * H / 1500) }, () => { const z = Math.random(); return { x: fxRnd(0, W), y: fxRnd(0, H), z, layer: z < 0.5 ? 0 : z < 0.88 ? 1 : 2, ph: fxRnd(0, 6.3), rot: fxRnd(0, 6.3) }; });
      lwGrad(ctx, W, H, [[0, '#08142b'], [0.6, '#16294b'], [1, '#2b4470']]);
      for (const f of fl) {
        const sp = [22, 48, 95][f.layer];
        f.y += sp * dt; f.x += Math.sin(t * 0.6 + f.ph) * [8, 16, 26][f.layer] * dt; f.rot += dt * 0.4;
        if (f.y > H + 30) { f.y = -30; f.x = fxRnd(0, W); }
        if (f.layer === 0) fxDraw(ctx, fxGlow('#ffffff'), f.x, f.y, 5, 0.7);
        else if (f.layer === 1) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = 0.9; ctx.drawImage(fxFlake(), -7, -7, 14, 14); ctx.restore(); }
        else fxDraw(ctx, fxGlow('#ffffff'), f.x, f.y, 34, 0.22);
        if (f.layer === 1 && Math.sin(t * 3 + f.ph * 7) > 0.995) fxDraw(ctx, fxGlint('#dff0ff'), f.x, f.y, 26, 0.9);
      }
    });
  },

  // ── Fireflies: a meadow at dusk ──
  _saverFireflies(stage) {
    const box = this._lwBox(stage, '#0b1430');
    let B = null;
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      if (resized || !B) B = {
        ff: Array.from({ length: Math.round(W * H / 9000) + 18 }, () => ({ x: fxRnd(0, W), y: fxRnd(0.25, 0.95) * H, z: fxRnd(0.4, 1.3), ax: fxRnd(0.15, 0.5), ay: fxRnd(0.15, 0.4), p1: fxRnd(0, 6.3), p2: fxRnd(0, 6.3), per: fxRnd(1.8, 3.6), off: fxRnd(0, 3), sp: fxRnd(10, 22) })),
        blades: Array.from({ length: Math.round(W / 4) }, () => ({ x: fxRnd(0, W), h: fxRnd(0.06, 0.2) * H, ph: fxRnd(0, 6.3), w: fxRnd(1.5, 3.5) })),
        stars: Array.from({ length: 40 }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H * 0.45), s: fxRnd(1.5, 3), ph: fxRnd(0, 6.3) })),
      };
      lwGrad(ctx, W, H, [[0, '#0a1230'], [0.55, '#1a2448'], [0.8, '#13302a'], [1, '#081a12']]);
      ctx.globalCompositeOperation = 'lighter';
      B.stars.forEach(s => fxDraw(ctx, fxGlow('#e6ecff', 0.2), s.x, s.y, s.s, 0.35 + 0.35 * Math.sin(t * 1.5 + s.ph)));
      fxDraw(ctx, fxGlow('#ffe9c0', 0.2), W * 0.78, H * 0.14, Math.min(W, H) * 0.25, 0.55);
      ctx.globalCompositeOperation = 'source-over';
      // long grass, swaying
      ctx.strokeStyle = '#04140c'; ctx.lineCap = 'round';
      B.blades.forEach(b => { ctx.lineWidth = b.w; ctx.beginPath(); ctx.moveTo(b.x, H + 2); ctx.quadraticCurveTo(b.x + Math.sin(t * 0.8 + b.ph) * 6, H - b.h * 0.5, b.x + Math.sin(t * 0.8 + b.ph) * 14, H - b.h); ctx.stroke(); });
      ctx.globalCompositeOperation = 'lighter';
      B.ff.forEach(f => {
        f.x += (Math.cos(t * f.ax + f.p1) * f.sp + Math.sin(t * 1.3 + f.p2) * 5) * dt;
        f.y += (Math.sin(t * f.ay + f.p2) * f.sp * 0.6 + Math.cos(t * 1.1 + f.p1) * 4) * dt;
        if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
        const ph = ((t + f.off) % f.per) / f.per, a = 0.1 + 0.9 * Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 3);
        fxDraw(ctx, fxGlow('#C8FF5A'), f.x, f.y, 42 * f.z, a * 0.5);
        fxDraw(ctx, fxGlow('#F4FFB8', 0.2), f.x, f.y, 8 * f.z, a);
      });
      ctx.globalCompositeOperation = 'source-over';
    });
  },

  // ── Deep Space: drifting through stars and nebulae ──
  _saverSpace(stage) {
    const box = this._lwBox(stage, '#02020a');
    let B = null;
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      if (resized || !B) B = {
        stars: Array.from({ length: 320 }, () => ({ x: fxRnd(-1, 1), y: fxRnd(-1, 1), z: fxRnd(0.1, 1), c: fxPick(['#ffffff', '#cfe0ff', '#ffe6c8', '#ffd0f0']) })),
        neb: [['#7b3fe4', 0.3, 0.3], ['#1fb5c9', 0.75, 0.4], ['#e04fa0', 0.4, 0.75], ['#3050ff', 0.8, 0.8], ['#8a2be2', 0.15, 0.85]].map(([c, x, y]) => ({ c, x, y, ph: fxRnd(0, 6.3) })),
      };
      ctx.fillStyle = '#02020a'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.max(W, H);
      B.neb.forEach(n => fxDraw(ctx, fxGlow(n.c), (n.x + Math.sin(t * 0.03 + n.ph) * 0.08) * W, (n.y + Math.cos(t * 0.025 + n.ph) * 0.06) * H, R * 0.9, 0.2));
      const cx = W / 2, cy = H / 2, f = R * 0.45;
      B.stars.forEach(s => {
        s.z -= 0.035 * dt;
        if (s.z <= 0.05) { s.z = 1; s.x = fxRnd(-1, 1); s.y = fxRnd(-1, 1); }
        const x = cx + s.x / s.z * f * 0.5, y = cy + s.y / s.z * f * 0.5;
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) { s.z = 1; return; }
        fxDraw(ctx, fxGlow(s.c, 0.25), x, y, Math.min(9, 1.6 / s.z), Math.min(1, (1 - s.z) * 1.6));
      });
      ctx.globalCompositeOperation = 'source-over';
    });
  },

  // ── Fairy Lights ──
  _saverFairy(stage) {
    const box = this._lwBox(stage, '#120b07');
    let B = null;
    const WARM = ['#FFD9A0', '#FFE7C2', '#FFCB80', '#FFD9A0', '#FFB870'];
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      if (resized || !B) B = {
        strings: [0.12, 0.34, 0.58, 0.8].map((y, i) => ({ y: y * H, sag: fxRnd(0.06, 0.1) * H, ph: fxRnd(0, 6.3), bulbs: Array.from({ length: Math.round(W / 30) + 2 }, () => ({ c: Math.random() < 0.15 ? fxPick(['#FF6B6B', '#6BCBFF', '#9BFF8A', '#FF9DE2']) : fxPick(WARM), ph: fxRnd(0, 6.3), sp: fxRnd(0.8, 2.2) })), back: i % 2 })),
        bokeh: Array.from({ length: 14 }, () => ({ x: fxRnd(0, W), y: fxRnd(0, H), s: fxRnd(40, 120), c: fxPick(['#FFB870', '#FFD9A0', '#FF9466']), ph: fxRnd(0, 6.3) })),
      };
      lwGrad(ctx, W, H, [[0, '#0d0806'], [1, '#22150d']]);
      ctx.globalCompositeOperation = 'lighter';
      B.bokeh.forEach(b => fxDraw(ctx, fxBokeh(b.c), b.x + Math.sin(t * 0.2 + b.ph) * 10, b.y, b.s * 0.8, 0.12 + 0.07 * Math.sin(t * 0.6 + b.ph)));
      ctx.globalCompositeOperation = 'source-over';
      B.strings.forEach(s => {
        const n = s.bulbs.length, sag = s.sag * (1 + 0.05 * Math.sin(t * 0.6 + s.ph));
        const at = (u) => [u * (W + 40) - 20, s.y + sag * (1 - Math.pow(2 * u - 1, 2))];
        ctx.globalAlpha = 0.8; ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const [x, y] = at(k / 40); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        s.bulbs.forEach((b, i) => {
          const [x, y] = at((i + 0.5) / n), tw = 0.55 + 0.45 * Math.sin(t * b.sp + b.ph);
          fxDraw(ctx, fxGlow(b.c), x, y + 5, 44, 0.5 * tw);
          fxDraw(ctx, fxGlow(b.c, 0.2), x, y + 5, 9, 0.6 + 0.4 * tw);
        });
        ctx.globalCompositeOperation = 'source-over';
      });
      ctx.globalAlpha = 1;
    });
  },

  // ── Liquid Colour: the conversation's own colours, slowly flowing into each other ──
  _saverLiquid(stage) {
    const box = this._lwBox(stage, '#111');
    let off = null, og = null, cols = null;
    const blobs = Array.from({ length: 5 }, (_, i) => ({ fx: fxRnd(0.03, 0.07), fy: fxRnd(0.03, 0.07), px: i * 1.26 + fxRnd(0, 0.6), py: i * 2.1 + fxRnd(0, 0.6), r: fxRnd(0.26, 0.4), k: i }));
    this._saverCanvasLoop(box, (ctx, t, dt, W, H, resized) => {
      const q = 6;
      if (resized || !off) { [off, og] = fxCanvas(Math.ceil(W / q), Math.ceil(H / q)); cols = null; }
      if (!cols || ((t * 10) | 0) % 50 === 0) {
        const cs = getComputedStyle(this._saverEl || document.body), v = (k, d) => (cs.getPropertyValue(k).trim() || d);
        const acc = v('--cm-accent', '#0A84FF'), sent = v('--cm-sent', acc), bg = v('--cm-bg', '#000000');
        const ok = (c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
        const a = ok(acc) ? acc : '#0A84FF', s2 = ok(sent) ? sent : a, base = ok(bg) ? bg : '#000000';
        const dark = fxHex(base).reduce((x, y) => x + y, 0) < 380;
        cols = { base: dark ? lwMix(base, a, 0.06) : lwMix(base, a, 0.05), list: [a, lwMix(s2, '#BF5AF2', 0.55), lwMix(a, '#64D2FF', 0.6), lwMix(s2, '#FF375F', 0.5), lwMix(a, '#30D158', 0.45)], dark };
      }
      const w = off.width, h = off.height;
      og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1; og.fillStyle = cols.base; og.fillRect(0, 0, w, h);
      blobs.forEach(b => {
        const x = (0.5 + 0.42 * Math.sin(t * b.fx * 6.283 + b.px)) * w, y = (0.5 + 0.42 * Math.cos(t * b.fy * 6.283 + b.py)) * h, r = b.r * Math.max(w, h);
        const g = og.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, fxRgba(cols.list[b.k], cols.dark ? 0.6 : 0.45)); g.addColorStop(0.55, fxRgba(cols.list[b.k], cols.dark ? 0.22 : 0.16)); g.addColorStop(1, fxRgba(cols.list[b.k], 0));
        og.fillStyle = g; og.fillRect(0, 0, w, h);
      });
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, w * q, h * q);
    }, { fps: 20 });
  },

});

// Home Assistant can swap in a new custom element registry while it starts up, and a card
// defined before that happens isn't found (the card picker then spins forever). So the card
// checks again over the first few seconds, and defines itself in whichever registry is current.
const defineCrowMessenger = () => {
  [['crow-messenger-card', CrowMessengerCard], ['crow-messenger-card-editor', CrowMessengerCardEditor]].forEach(([name, cls]) => {
    const reg = window.customElements;
    if (reg.get(name)) return;
    try { reg.define(name, cls); } catch (e) {
      try { reg.define(name, class extends cls {}); } catch (e2) { /* defined meanwhile */ }
    }
  });
};
defineCrowMessenger();
[0, 300, 1000, 2500, 5000, 10000].forEach(t => setTimeout(defineCrowMessenger, t));
window.addEventListener('load', defineCrowMessenger);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'crow-messenger-card')) {
  window.customCards.push({
    type: 'crow-messenger-card',
    name: 'Crow Messenger',
    description: 'Private messages, group chats, attachments and contacts between the people in your home.',
    preview: false,
    documentationURL: 'https://github.com/jamesmcginnis/crow-messenger',
  });
}
console.info(`%c CROW MESSENGER %c ${CM_VERSION} · ${CM_BUILD} `, 'color:#fff;background:#007AFF;font-weight:700;border-radius:4px 0 0 4px;padding:2px 4px', 'color:#007AFF;background:#e5f0ff;font-weight:700;border-radius:0 4px 4px 0;padding:2px 4px');
})();
