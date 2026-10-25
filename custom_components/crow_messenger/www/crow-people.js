/*
 * Crow Messenger — People Map
 * Part of the Crow Messenger card, in a file of its own so it's only downloaded when it's first used.
 * Loaded by the card (crow-messenger-card.js); not a dashboard resource.
 */
(() => {
'use strict';
const CrowMessengerCard = window.__crowMessengerCard;
if (!CrowMessengerCard || CrowMessengerCard.lazyReady?.people) return;
const { FM_ICON, FM_NEARBY, FM_NEAR_KEY, ICON, clamp, copyText, esc, haversine, hour12, isAndroid, isApple, locale, telValue, timeAgoShort } = CrowMessengerCard.kit;

const FM_WX = { 0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Freezing Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle', 56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 66: 'Freezing Rain', 67: 'Freezing Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains', 80: 'Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
  85: 'Snow Showers', 86: 'Heavy Snow Showers', 95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Thunderstorm with Hail' };

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
.fm-head .cb.sm { width: 32px; height: 32px; background: var(--cm-fill); color: var(--cm-text2); box-shadow: none; border: 0; }
.fm-head h2:empty + .cb.sm { margin-top: 6px; align-self: flex-start; }
.fm-head .cb.sm svg { width: 15px; height: 15px; }
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
.fm-detail .fm-dn.pl { font-size: 21px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fm-detail .fm-ds { font-size: 15px; color: var(--cm-text2); margin-top: 3px; }
.fm-acts { display: flex; gap: 10px; margin: 16px 0; }
.fm-acts button { flex: 1; height: 62px; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 500; color: var(--cm-accent); background: var(--cm-fill); }
.fm-acts button svg { width: 21px; height: 21px; }
.fm-acts button[disabled] { opacity: 0.4; pointer-events: none; }
.fm-info { border-radius: 20px; background: var(--cm-fill2); overflow: hidden; }
.fm-more { margin-top: 12px; }
.fm-more .fi2 { cursor: pointer; }
.fm-more .fi2 span:first-child { color: var(--cm-accent); }
.fm-more .fi2 svg { width: 16px; height: 16px; color: var(--cm-text3); }
.fm-nsub { font-size: 13px; color: var(--cm-text2); padding: 0 18px 6px; }
.fm-nrow { display: flex; align-items: center; gap: 12px; padding: 9px 16px; cursor: pointer; border-radius: 14px; }
.fm-nrow.sel, .fm-nrow:active { background: var(--cm-fill2); }
.fm-nic { width: 40px; height: 40px; border-radius: 50%; background: var(--cm-fill2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.fm-ndir { width: 36px; height: 36px; border-radius: 50%; background: var(--cm-fill2); color: var(--cm-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fm-ndir svg { width: 18px; height: 18px; }
.fm-emo { line-height: 1; width: 1.2em; height: 1.2em; text-align: center; display: flex; align-items: center; justify-content: center; font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.fm-poi.saved { width: 22px; height: 22px; border-width: 1.5px; }
.fm-poi.saved .fm-emo { font-size: 11px !important; }
.fm-poi .fm-emo { font-size: 13px !important; }
.fm-poi { width: 26px; height: 26px; border-radius: 50%; background: rgba(28,28,30,0.85); color: #fff; border: 2px solid #fff; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform .2s; }
.fm-nic { color: #fff; background: rgba(28,28,30,0.85); border: 2px solid #fff; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.fm-link { color: var(--cm-accent); }
/* on the glass sheet the blue is lightened (dark) or deepened (light), and buttons are a little more solid, so they stand out */
:host([data-bars="glass"][data-mode="dark"]) .fm-sheet :is(.fm-acts button, .fm-ndir, .fm-link) { color: color-mix(in srgb, var(--cm-accent) 45%, #fff); }
:host([data-bars="glass"][data-mode="dark"]) .fm-sheet :is(.fm-acts button, .fm-ndir) { background: rgba(255,255,255,0.16); font-weight: 600; }
:host([data-bars="glass"]:not([data-mode="dark"])) .fm-sheet :is(.fm-acts button, .fm-ndir, .fm-link) { color: color-mix(in srgb, var(--cm-accent) 75%, #000); }
:host([data-bars="glass"]:not([data-mode="dark"])) .fm-sheet :is(.fm-acts button, .fm-ndir) { background: rgba(255,255,255,0.6); font-weight: 600; }
.fm-nic.big { width: 60px; height: 60px; }
.fm-busy { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 20px; color: var(--cm-text2); font-size: 15px; }
.fm-spin { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--cm-fill2); border-top-color: var(--cm-accent); animation: cm-spin 0.9s linear infinite; }
.fm-info a.fi2 { color: inherit; text-decoration: none; }
.fm-info a.fi2 b { color: var(--cm-accent); }
.fm-src { font-size: 11px; color: var(--cm-text3); text-align: center; padding: 10px 0 4px; }
.fm-poi.sel { transform: scale(1.35); box-shadow: 0 0 0 3px var(--cm-accent), 0 2px 10px rgba(0,0,0,0.4); }
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

const FM_EMPTY = { type: 'FeatureCollection', features: [] };

const FM_OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

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

const FM_ZONE_MIN = 10, FM_ZONE_MAX = 2000, FM_ZONE_DEFAULT = 20;

const fmAddr = (it) => {
  if (Array.isArray(it.addrLines)) return it.addrLines.filter(Boolean).join('\n');
  const parts = String(it.address || '').split(/\s*,\s*/).filter(Boolean);
  const out = [];
  for (const x of parts) {
    const m = x.match(/^(.*?)\s*\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i);
    if (m && m[1]) out.push(m[1], m[2].toUpperCase()); else out.push(x);
  }
  return out.join('\n');
};

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

function fmDest(lat, lon, bearing, metres) {
  const R = 6371000, toR = x => x * Math.PI / 180, toD = x => x * 180 / Math.PI;
  const d = metres / R, b = toR(bearing), la = toR(lat), lo = toR(lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [toD(la2), toD(lo2)];
}

const fmHours = (h) => {
  if (!h) return '';
  if (h.trim() === '24/7') return 'Open 24 Hours';
  const days = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun', PH: 'Bank Holidays' };
  return h.split(/\s*;\s*/).filter(Boolean).map(part => part
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => days[d])
    .replace(/(\d\d:\d\d)-(\d\d:\d\d)/g, '$1–$2').replace(/([A-Za-z])-([A-Za-z])/g, '$1–$2')
    .replace(/\boff\b|\bclosed\b/gi, 'Closed').replace(/,/g, ', ')).join('\n');
};

const fmIco = (cat, size = 20) => `<span class="fm-emo" style="font-size:${Math.round(size * 0.9)}px">${cat.emoji}</span>`;

const fmSleep = (ms) => new Promise(r => setTimeout(r, ms));

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

async function mapLibreCss() {
  if (_fmCss !== null) return _fmCss;
  try { _fmCss = await (await fetch(`${FM_LIB}.css`)).text(); } catch (e) { _fmCss = ''; }
  return _fmCss;
}

const FM_LIB = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';

let _fmCss = null;

let _fmLibPromise = null;

Object.assign(CrowMessengerCard.prototype, {
  _devState(p, re) {
    const ents = this._hass.entities || {};
    const dev = p.source && ents[p.source]?.device_id;
    if (!dev) return null;
    for (const e of Object.values(ents)) {
      if (e.device_id === dev && re.test(e.entity_id)) {
        const st = this._hass.states[e.entity_id];
        if (st && !['unknown', 'unavailable'].includes(st.state)) return st;
      }
    }
    return null;
  },

  _charging(p) {
    const st = this._devState(p, /^sensor\..*_battery_state$/);
    const v = String(st?.state || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (v === 'charging') return 'Charging';
    if (v === 'full') return 'Full';
    if (this._devState(p, /^binary_sensor\..*_is_charging$/)?.state === 'on') return 'Charging';
    return '';
  },

  _activity(p) {
    const st = this._devState(p, /^sensor\..*_(activity|detected_activity)$/);
    const v = String(st?.state || '').toLowerCase();
    return { stationary: 'Still', still: 'Still', walking: 'Walking', on_foot: 'Walking', running: 'Running', automotive: 'Driving',
      in_vehicle: 'Driving', cycling: 'Cycling', on_bicycle: 'Cycling' }[v] || '';
  },

  _focusOn(p) {
    if (this._devState(p, /^binary_sensor\..*_focus$/)?.state === 'on') return 'Focus';
    const dnd = String(this._devState(p, /^sensor\..*_do_not_disturb(_sensor)?$/)?.state || '').toLowerCase();
    return dnd && dnd !== 'off' ? 'Do Not Disturb' : '';
  },

  _wifi(p) {
    const st = this._devState(p, /^sensor\..*_(ssid|wifi_connection)$/);
    if (!st) return null;
    const v = String(st.state || '').trim();
    return !v || /not connected|<not connected>/i.test(v) ? 'Not Connected' : v;
  },

  _hereSince(p) {
    const st = this._hass.states[p.eid];
    if (!st?.last_changed || !p.has) return null;
    const ts = new Date(st.last_changed).getTime();
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    const dur = mins < 1 ? 'just now' : mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ''}` : `${Math.floor(mins / 1440)} day${mins >= 2880 ? 's' : ''}`;
    const sameDayTs = new Date(ts).toDateString() === new Date().toDateString();
    const when = new Date(ts).toLocaleString(locale(this._hass), sameDayTs ? { hour: 'numeric', minute: '2-digit', hour12: hour12(this._hass) }
      : { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: hour12(this._hass) });
    return { label: st.state === 'not_home' ? 'Away Since' : 'Here Since', value: `${when} · ${dur}` };
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

  _wxKey(lat, lon) { return `${(+lat).toFixed(2)},${(+lon).toFixed(2)},${this._hass?.config?.unit_system?.temperature === '°F'}`; },

  async _weatherAt(lat, lon) {
    const f = this._hass?.config?.unit_system?.temperature === '°F';
    const key = this._wxKey(lat, lon);
    this._wxCache = this._wxCache || new Map();
    const hit = this._wxCache.get(key);
    if (hit && Date.now() - hit.at < 15 * 60000) return hit.v;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${(+lat).toFixed(4)}&longitude=${(+lon).toFixed(4)}&current=temperature_2m,weather_code&temperature_unit=${f ? 'fahrenheit' : 'celsius'}`);
    if (!r.ok) throw new Error('weather');
    const c = (await r.json()).current || {};
    if (c.temperature_2m == null) throw new Error('weather');
    const v = `${Math.round(c.temperature_2m)}° · ${FM_WX[c.weather_code] || 'Unknown'}`;
    this._wxCache.set(key, { at: Date.now(), v });
    return v;
  },

  async _nearby(cat, lat, lon, radius = 1500, signal = null) {
    const stopped = () => { if (signal?.aborted) throw new DOMException('stopped', 'AbortError'); };
    const keepH = [168, 336, 720].includes(+this._config.people_nearby_keep) ? +this._config.people_nearby_keep : 168;
    const key = `${FM_NEAR_KEY}${cat.id}:${(+lat).toFixed(3)},${(+lon).toFixed(3)}`;
    // anything already found for this kind of place within a few hundred metres is used again
    // rather than asking OpenStreetMap a second time (distances are worked out from where you asked)
    try {
      const pre = `${FM_NEAR_KEY}${cat.id}:`;
      let best = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(pre)) continue;
        const hit = JSON.parse(localStorage.getItem(k) || 'null');
        if (!hit || !Array.isArray(hit.items) || Date.now() - hit.at >= keepH * 3600000) continue;
        const [hl, ho] = hit.lat != null ? [hit.lat, hit.lon] : k.slice(pre.length).split(',').map(Number);
        const d = haversine([lat, lon], [hl, ho]);
        if (d <= 400 && (!best || d < best.d)) best = { d, hit };
      }
      if (best) {
        return best.hit.items.map(it => ({ ...it, dist: haversine([lat, lon], [it.lat, it.lon]) }))
          .filter(it => it.dist <= radius * 1.2).sort((x, y) => x.dist - y.dist);
      }
    } catch (e) { /* nothing kept */ }
    const parts = cat.tags.map(t => { const [k, v] = t.split('='); return `nwr["${k}"="${v}"](around:${radius},${lat},${lon});`; }).join('');
    const q = `[out:json][timeout:20];(${parts});out center 80;`;
    let els = null;
    for (const [n, url] of FM_OVERPASS.entries()) {
      stopped();
      if (n) await fmSleep(600);
      stopped();
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
      const onStop = () => ctl.abort();
      signal?.addEventListener('abort', onStop, { once: true });
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctl.signal });
        clearTimeout(tm);
        if (!r.ok) { console.warn('[Crow Messenger] Find Nearby:', url, r.status); continue; }
        const j = await r.json();
        if (Array.isArray(j.elements)) { els = j.elements; break; }
      } catch (err) { clearTimeout(tm); stopped(); console.warn('[Crow Messenger] Find Nearby:', url, err?.message || err); }
      finally { signal?.removeEventListener('abort', onStop); }
    }
    stopped();
    const out = [], seen = new Set();
    const main = cat.tags.filter(t => !t.endsWith('=yes')).map(t => t.split('='));
    const add = (d) => {
      const k = `${String(d.name).toLowerCase()}|${(+d.lat).toFixed(4)}|${(+d.lon).toFixed(4)}`;
      if (seen.has(k)) return;
      seen.add(k);
      const dist = haversine([lat, lon], [+d.lat, +d.lon]);
      if (dist <= radius * 1.2) out.push({ ...d, lat: +d.lat, lon: +d.lon, dist });
    };
    const fromTags = (t) => {
      const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
      const town = [t['addr:city'] || t['addr:town'] || t['addr:village'], t['addr:postcode']].filter(Boolean).join(' ');
      // a cash machine or toilets inside a shop, bank or station
      const inside = !main.some(([k, v]) => t[k] === v);
      return {
        sub: street || town || '', address: [street, town].filter(Boolean).join(', ') || t['addr:full'] || '',
        addrLines: street || t['addr:city'] || t['addr:town'] || t['addr:village'] || t['addr:postcode']
          ? [street, t['addr:city'] || t['addr:town'] || t['addr:village'], t['addr:postcode']] : null,
        kind: inside ? `${cat.one} Inside` : '', hours: t.opening_hours || '', phone: t.phone || t['contact:phone'] || '',
        web: t.website || t['contact:website'] || t.url || '', wheelchair: t.wheelchair || '',
        operator: t.brand || t.operator || '', fee: t.fee || '', charge: t.charge || '',
      };
    };
    if (els) {
      for (const e of els) {
        const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
        if (la == null || lo == null) continue;
        const t = e.tags || {};
        add({ name: t.name || t.brand || t.operator || cat.one, lat: la, lon: lo, ...fromTags(t) });
      }
    } else {
      // OpenStreetMap's search, inside a box around the point
      const dLat = radius / 111000, dLon = radius / (111000 * Math.cos(lat * Math.PI / 180));
      const box = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`;
      let any = false, first = true;
      for (const [k, v] of main) {
        if (!first) await fmSleep(1100);
        first = false;
        stopped();
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ format: 'jsonv2', [k]: v, bounded: '1', viewbox: box, limit: '40', addressdetails: '1', extratags: '1' })}`, { signal });
          if (!r.ok) continue;
          any = true;
          for (const pl of await r.json()) {
            const a = pl.address || {}, x = pl.extratags || {};
            const street = [a.house_number, a.road].filter(Boolean).join(' ');
            // an unnamed place is called by its brand or what it is, not by the road it's on
            add({ name: pl.name || x.brand || x.operator || cat.one, lat: pl.lat, lon: pl.lon, sub: street,
              address: [street, [a.town || a.city || a.village, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
              addrLines: [street, a.town || a.city || a.village, a.postcode],
              kind: '', hours: x.opening_hours || '', phone: x.phone || x['contact:phone'] || '', web: x.website || x['contact:website'] || '',
              wheelchair: x.wheelchair || '', operator: x.brand || x.operator || '', fee: x.fee || '', charge: x.charge || '' });
          }
        } catch (err) { stopped(); console.warn('[Crow Messenger] Find Nearby (search):', err?.message || err); }
      }
      stopped();
      if (!any) throw new Error('nearby');
    }
    const items = out.sort((x, y) => x.dist - y.dist).slice(0, 25);
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), lat: +lat, lon: +lon, items })); } catch (e) { /* storage full or blocked */ }
    return items;
  },

  _forgetPlace(cat, it) {
    const k = (x) => `${String(x.name).toLowerCase()}|${(+x.lat).toFixed(4)}|${(+x.lon).toFixed(4)}`;
    const want = k(it);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${FM_NEAR_KEY}${cat.id}:`)) continue;
        const hit = JSON.parse(localStorage.getItem(key) || 'null');
        if (!hit || !Array.isArray(hit.items)) continue;
        const items = hit.items.filter(x => k(x) !== want);
        if (items.length !== hit.items.length) localStorage.setItem(key, JSON.stringify({ ...hit, items }));
      }
    } catch (e) { /* */ }
  },

  _mapsUrl(lat, lon, name) {
    const q = `${lat},${lon}`;
    return isApple() ? `https://maps.apple.com/?daddr=${q}` : isAndroid() ? `geo:${q}?q=${q}(${encodeURIComponent(name || '')})` : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  },

  _pg_people({ focus } = {}) {
    const el = this._el(`<div>
      <style>${FM_CSS}</style>
      <div class="fm-map"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${ICON.back}</button><div></div></div>
      <div class="fm-ctrls">
        <div class="fm-vcap g"><button data-a="maptype" aria-label="Map style">${FM_ICON.map}</button><button data-a="locate" aria-label="Show me">${FM_ICON.locate}</button>${this._config.people_nearby === true ? `<button data-a="nearbyhere" aria-label="Find nearby">${ICON.search}</button>` : ''}</div>
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
    // Find Nearby: { cat, lat, lon, label, items, busy, err, back } and the places' pins on the map
    let nearbyRes = null, poiMarkers = [];
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
      if (nearbyRes) { renderNearby(); return; }
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
      head.querySelector('[data-a]').classList.remove('sm');
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
      head.querySelector('[data-a]').classList.add('sm');
      const batt = this._battery(p);
      const addr = this._geocoded(p);
      const cfg = this._config;
      const on = (k) => cfg[k] !== false;
      const since = on('people_here_since') ? this._hereSince(p) : null;
      const act = on('people_activity') && p.has ? this._activity(p) : '';
      const focus = on('people_focus') ? this._focusOn(p) : '';
      const charging = on('people_charging') ? this._charging(p) : '';
      const wifi = on('people_wifi') ? this._wifi(p) : null;
      const wxOn = on('people_weather') && p.has;
      const row = (k, v) => `<div class="fi2"><span>${esc(k)}</span><b style="font-weight:500;text-align:right">${esc(v)}</b></div>`;
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
          ${since ? row(since.label, since.value) : ''}
          ${wxOn ? `<div class="fi2" data-wx="1"><span>Weather</span><b style="font-weight:500;text-align:right">${esc(this._wxCache?.get(this._wxKey(p.lat, p.lon))?.v || '…')}</b></div>` : ''}
          ${act ? row('Activity', act) : ''}
          ${focus ? row(focus, 'On') : ''}
          ${batt != null ? row('Battery', `${batt}%${charging ? ` · ${charging}` : ''}`) : ''}
          ${wifi ? row('Wi-Fi', wifi) : ''}
          <div class="fi2"><span>Updated</span><b style="font-weight:500">${p.has ? esc(new Date(p.ts).toLocaleString(locale(this._hass), { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: hour12(this._hass) })) : '—'}</b></div>
        </div>
        ${cfg.people_nearby === true && p.has ? `<div class="fm-info fm-more"><div class="fi2" role="button" data-fa="nearby"><span>Find Nearby</span>${ICON.chevR}</div></div>` : ''}
        </div>`);
      if (wxOn) {
        this._weatherAt(p.lat, p.lon).then(v => {
          const b = list.querySelector('[data-wx] b');
          if (b && selected === p.eid) b.textContent = v;
        }).catch(() => { list.querySelector('[data-wx]')?.remove(); });
      }
    };

    // ── New Zone: a name, a radius you can
    // type or drag on the map, then Create Zone adds it to Home Assistant ──
    let ed = null;   // the zone editor, once the map is up
    const clearPois = () => { poiMarkers.forEach(m => m.remove()); poiMarkers = []; };
    const setHead = (title, action) => {
      head.querySelector('h2').textContent = title;
      head.querySelector('[data-a]').dataset.a = action;
      head.querySelector('[data-a]').innerHTML = ICON.x;
      head.querySelector('[data-a]').classList.add('sm');
      head.querySelector('[data-a]').setAttribute('aria-label', action === 'nearbyback' ? 'Back to the list' : 'Close');
    };
    // distances are from the person you're looking at (as they move), otherwise from where you searched
    const fromWho = () => {
      const eid = nearbyRes?.back || nearbyRes?.from;
      const p = eid ? this._people().find(x => x.eid === eid) : null;
      return p?.has ? { lat: p.lat, lon: p.lon, label: p.me ? 'you' : p.name } : null;
    };
    const distOf = (it) => { const w = fromWho(); return w ? haversine([w.lat, w.lon], [it.lat, it.lon]) : it.dist; };
    const distFrom = () => fromWho()?.label || nearbyRes.label;
    const renderNearby = () => {
      const r = nearbyRes;
      if (r.detail != null && r.items[r.detail]) { renderPlace(r.items[r.detail]); return; }
      setHead(`${r.cat.name} Nearby`, 'closenearby');
      const body = r.busy ? `<div class="fm-busy"><span class="fm-spin"></span><span>Looking for ${esc(r.cat.name.toLowerCase())}…</span></div>`
        : r.err ? `<div class="empty" style="padding:24px 30px">${esc(r.err)}</div>`
        : !r.items.length ? `<div class="empty" style="padding:24px 30px">No ${esc(r.cat.name.toLowerCase())} found within ${esc(this._fmtDist(1500, true))} of ${esc(r.label)}.</div>`
        : `<div class="fm-nsub">Near ${esc(r.label)}</div>` + r.items.map((it, i) => `<div class="fm-nrow" data-ni="${i}">
            <div class="fm-nic">${fmIco(r.cat, 22)}</div>
            <div style="min-width:0;flex:1"><div class="fm-n">${esc(it.name)}</div><div class="fm-s">${esc([this._fmtDist(distOf(it)), it.kind || it.sub].filter(Boolean).join(' · '))}</div></div>
            <button class="fm-ndir" data-nd="${i}" aria-label="Directions">${ICON.pin}</button></div>`).join('');
      this._set(list, body);
    };
    // one place: its address, opening hours, phone, website and access, with Directions
    const renderPlace = (it) => {
      setHead('', 'nearbyback');
      const yesNo = (v) => ({ yes: 'Yes', no: 'No', limited: 'Limited', designated: 'Yes' }[String(v).toLowerCase()] || v);
      const rows = [
        ['Type', it.kind || nearbyRes.cat.one],
        ['Distance', `${this._fmtDist(distOf(it))} from ${distFrom()}`],
        ['Address', fmAddr(it)],
        ...(it.phone ? [['Phone', it.phone, 'np']] : []),
        ...(it.web ? [['Website', it.web.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), 'nw']] : []),
        ['Opening Hours', fmHours(it.hours)],
        ['Run By', it.operator && it.operator !== it.name ? it.operator : ''],
        ['Charge', it.charge || (it.fee ? (String(it.fee).toLowerCase() === 'no' ? 'Free' : yesNo(it.fee) === 'Yes' ? 'Paid' : it.fee) : '')],
        ['Wheelchair Access', it.wheelchair ? yesNo(it.wheelchair) : ''],
      ].filter(([, v]) => v);
      const zone = canZone();
      const rowHtml = ([k, v, link]) => link
        ? `<div class="fi2" role="button" data-${link}="${nearbyRes.detail}"><span>${esc(k)}</span><b class="fm-link" style="font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%">${esc(v)}</b></div>`
        : `<div class="fi2"><span>${esc(k)}</span><b style="font-weight:500;text-align:right;white-space:pre-line">${esc(v)}</b></div>`;
      this._set(list, `<div class="fm-detail">
        <div style="display:flex;align-items:center;gap:14px"><div class="fm-nic big">${fmIco(nearbyRes.cat, 30)}</div>
          <div style="min-width:0"><div class="fm-dn pl">${esc(it.name)}</div><div class="fm-ds">${esc([it.kind || nearbyRes.cat.one, this._fmtDist(distOf(it))].join(' · '))}</div></div></div>
        <div class="fm-acts"><button data-nd="${nearbyRes.detail}">${ICON.pin}<span>Directions</span></button>
          <button data-nsh="${nearbyRes.detail}">${ICON.share}<span>Share</span></button>
          ${zone ? `<button data-nz="${nearbyRes.detail}">${FM_ICON.zone}<span>Add Zone</span></button>` : ''}</div>
        <div class="fm-info">${rows.map(rowHtml).join('')}</div>
        <div class="fm-src">From OpenStreetMap</div></div>`);
    };
    const showPois = (stay = false) => {
      clearPois();
      if (!map || !nearbyRes?.items?.length) return;
      nearbyRes.items.forEach((it, i) => {
        const d = document.createElement('div');
        d.className = 'fm-poi'; d.innerHTML = fmIco(nearbyRes.cat, 18);
        d.addEventListener('click', (ev) => { ev.stopPropagation(); openPlace(i); });
        pinHold(d, () => it, nearbyRes.cat);
        poiMarkers.push(new window.maplibregl.Marker({ element: d }).setLngLat([it.lon, it.lat]).addTo(map));
      });
      // the map stays at the same zoom: it only moves if none of the places are in view
      const b = map.getBounds();
      if (!stay && !nearbyRes.items.some(it => b.contains([it.lon, it.lat]))) {
        const it = nearbyRes.items[0];
        map.easeTo({ center: [it.lon, it.lat], padding: { bottom: heights()[snap], top: 60 }, duration: 700 });
      }
    };
    // places found before stay on the map (smaller) so they don't have to be looked up again
    let savedMarkers = [];
    const savedOn = () => { try { return localStorage.getItem('crowMessengerShowSaved') !== 'off'; } catch (e) { return true; } };
    // press and hold a place's pin: Share, Directions, or Remove from Map
    const pinHold = (d, getIt, cat) => {
      let t = null, held = false;
      const go = async () => {
        held = true;
        try { navigator.vibrate?.(10); } catch (err) { /* */ }
        const it = getIt();
        if (!it) return;
        const v = await this._menu(d, [{ header: it.name }, { text: 'Directions', value: 'dir', icon: ICON.pin }, { text: 'Share', value: 'share', icon: ICON.share },
          { sep: true }, { text: 'Remove from Map', value: 'rm', icon: ICON.trash, red: true }]);
        if (v === 'dir') this._alert({ title: `Get Directions to ${it.name}?`, message: nearbyRes ? `${this._fmtDist(distOf(it))} from ${distFrom()}` : '', buttons: [{ text: 'Open in Maps', style: 'ok', value: true, href: this._mapsUrl(it.lat, it.lon, it.name) }, { text: 'Cancel', style: 'cancel' }] });
        if (v === 'share') sharePlace(d, it);
        if (v === 'rm') {
          this._forgetPlace(cat, it);
          if (nearbyRes?.cat.id === cat.id) {
            const k = (x) => `${String(x.name).toLowerCase()}|${(+x.lat).toFixed(4)}|${(+x.lon).toFixed(4)}`;
            const was = nearbyRes.items[nearbyRes.detail];
            nearbyRes.items = nearbyRes.items.filter(x => k(x) !== k(it));
            if (was && k(was) === k(it)) nearbyRes.detail = null;
            else if (was) nearbyRes.detail = nearbyRes.items.indexOf(was);
            renderList(); showPois(true);
          }
          showSaved();
        }
      };
      d.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); held = false; clearTimeout(t); t = setTimeout(go, 500); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => d.addEventListener(n, () => clearTimeout(t)));
      d.addEventListener('contextmenu', (ev) => { ev.preventDefault(); clearTimeout(t); go(); });
      // a hold doesn't also count as a tap
      d.addEventListener('click', (ev) => { if (held) { ev.stopPropagation(); ev.stopImmediatePropagation(); held = false; } }, true);
    };
    const showSaved = () => {
      savedMarkers.forEach(m => m.remove()); savedMarkers = [];
      if (!map || this._config.people_nearby !== true || !savedOn()) return;
      const live = new Set((nearbyRes?.items || []).map(it => `${nearbyRes.cat.id}|${String(it.name).toLowerCase()}|${(+it.lat).toFixed(4)}|${(+it.lon).toFixed(4)}`));
      for (const sp of this._savedNearby()) {
        if (live.has(sp.id)) continue;
        const d = document.createElement('div');
        d.className = 'fm-poi saved'; d.innerHTML = fmIco(sp.cat, 14);
        d.title = sp.it.name;
        d.addEventListener('click', (ev) => { ev.stopPropagation(); openSaved(sp); });
        pinHold(d, () => sp.it, sp.cat);
        savedMarkers.push(new window.maplibregl.Marker({ element: d }).setLngLat([+sp.it.lon, +sp.it.lat]).addTo(map));
      }
    };
    // a saved place tapped on the map: its details, with the others of that kind around it
    const openSaved = (sp) => {
      if (draft) return;
      const me = meP();
      const group = this._savedNearby().filter(x => x.cat.id === sp.cat.id && haversine([+sp.it.lat, +sp.it.lon], [+x.it.lat, +x.it.lon]) <= 1500)
        .map(x => ({ ...x.it, lat: +x.it.lat, lon: +x.it.lon, dist: me?.has ? haversine([me.lat, me.lon], [+x.it.lat, +x.it.lon]) : 0 }));
      nearbyRes = { cat: sp.cat, lat: +sp.it.lat, lon: +sp.it.lon, label: me?.has ? 'you' : sp.it.name, items: group, busy: false,
        back: nearbyRes ? nearbyRes.back : selected, from: me?.eid || null, detail: null };
      nearbyRes.items.sort((x, y) => distOf(x) - distOf(y));
      const i = nearbyRes.items.findIndex(x => Math.abs(x.lat - sp.it.lat) < 1e-6 && Math.abs(x.lon - sp.it.lon) < 1e-6);
      showPois(); showSaved();
      if (snap === 'min') setSheet('half');
      openPlace(Math.max(0, i));
    };
    const markPoi = (i) => {
      poiMarkers.forEach((m, j) => m.getElement().classList.toggle('sel', j === i));
      list.querySelectorAll('.fm-nrow').forEach(r => r.classList.toggle('sel', +r.dataset.ni === i));
    };
    const openPlace = (i) => {
      const it = nearbyRes?.items?.[i];
      if (!it) return;
      nearbyRes.detail = i;
      renderList(); markPoi(i);
      // moves to the place without zooming out
      map?.easeTo({ center: [it.lon, it.lat], zoom: Math.max(map.getZoom(), 16), padding: { bottom: heights()[snap], top: 60 }, duration: 700 });
    };
    const openNearby = async (anchor, lat, lon, label) => {
      const v = await this._menu(anchor, [{ header: 'Find Nearby' }, ...FM_NEARBY.map(c => ({ text: c.name, value: c.id, icon: fmIco(c, 20) }))], { align: 'left' });
      const cat = FM_NEARBY.find(c => c.id === v);
      if (!cat) return;
      clearPois();
      nearbyRes?.ctl?.abort();   // a search still running stops
      nearbyRes = { cat, lat, lon, label, items: [], busy: true, back: nearbyRes ? nearbyRes.back : selected, from: nearbyRes?.from || null, detail: null, ctl: new AbortController() };
      renderList(); setSheet('half');
      const mine = nearbyRes;
      try { mine.items = (await this._nearby(cat, lat, lon, 1500, mine.ctl.signal)).sort((x, y) => distOf(x) - distOf(y)); }
      catch (err) { if (err?.name === 'AbortError') return; mine.err = 'OpenStreetMap didn’t answer just now, so nearby places couldn’t be looked up. Please try again in a moment.'; }
      mine.busy = false;
      if (nearbyRes !== mine) return;
      renderList(); showPois(); showSaved();
    };
    // Share: as a location in one or more chats, or with the phone's own share sheet
    const sharePlace = async (anchor, it) => {
      if (!it) return;
      const label = [it.name, (fmAddr(it).split('\n')[0] || '')].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
      const url = isApple() ? `https://maps.apple.com/?ll=${it.lat},${it.lon}&q=${encodeURIComponent(it.name)}` : `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lon}`;
      const items = [{ text: 'Send in a Chat', value: 'chat', icon: ICON.bubble }];
      items.push(navigator.share ? { text: 'Share…', value: 'os', icon: ICON.share } : { text: 'Copy Link', value: 'copy', icon: ICON.share });
      const v = await this._menu(anchor, items);
      if (v === 'chat') this._sendPlace({ lat: it.lat, lon: it.lon, label });
      else if (v === 'os') { try { await navigator.share({ title: it.name, text: [it.name, fmAddr(it).replace(/\n/g, ', ')].filter(Boolean).join('\n'), url }); } catch (err) { /* cancelled */ } }
      else if (v === 'copy') { this._toast((await copyText(`${it.name}\n${url}`)) ? 'Copied' : 'Copy not available here'); }
    };
    const closeNearby = () => {
      if (!nearbyRes) return;
      // closing while it's still looking stops the search
      nearbyRes.ctl?.abort();
      selected = nearbyRes.back;
      nearbyRes = null;
      clearPois();
      renderList();
      showSaved();
    };
    const renderZone = () => {
      head.querySelector('h2').textContent = 'New Zone';
      head.querySelector('[data-a]').dataset.a = 'closezone';
      head.querySelector('[data-a]').innerHTML = ICON.x;
      head.querySelector('[data-a]').classList.add('sm');
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

    list.addEventListener('click', async (e) => {
      if (e.target.closest('[data-za]')) return;
      const nd = e.target.closest('[data-nd]');
      if (nd && nearbyRes) {
        const it = nearbyRes.items[+nd.dataset.nd];
        if (it) await this._alert({ title: `Get Directions to ${it.name}?`, message: `${this._fmtDist(distOf(it))} from ${distFrom()}`, buttons: [{ text: 'Open in Maps', style: 'ok', value: true, href: this._mapsUrl(it.lat, it.lon, it.name) }, { text: 'Cancel', style: 'cancel' }] });
        return;
      }
      const np = e.target.closest('[data-np]');
      if (np && nearbyRes) {
        const it = nearbyRes.items[+np.dataset.np];
        if (it?.phone) await this._alert({ title: `Call ${it.phone}?`, message: it.name, buttons: [{ text: 'Call', style: 'ok', value: true, href: `tel:${telValue(it.phone)}` }, { text: 'Cancel', style: 'cancel' }] });
        return;
      }
      const nw = e.target.closest('[data-nw]');
      if (nw && nearbyRes) {
        const it = nearbyRes.items[+nw.dataset.nw];
        if (!it?.web) return;
        const href = /^https?:/i.test(it.web) ? it.web : `https://${it.web}`;
        let host = it.web; try { host = new URL(href).host.replace(/^www\./, ''); } catch (err) { /* */ }
        await this._alert({ title: `Open ${host}?`, message: it.name, buttons: [{ text: 'Open', style: 'ok', value: true, href }, { text: 'Cancel', style: 'cancel' }] });
        return;
      }
      const nsh = e.target.closest('[data-nsh]');
      if (nsh && nearbyRes) { sharePlace(nsh, nearbyRes.items[+nsh.dataset.nsh]); return; }
      const nz = e.target.closest('[data-nz]');
      if (nz && nearbyRes) {
        const it = nearbyRes.items[+nz.dataset.nz];
        if (it) openZone(it.lat, it.lon, { back: selected, name: it.name, intro: `This makes a zone at ${it.name}.` });
        return;
      }
      const nr = e.target.closest('[data-ni]');
      if (nr && nearbyRes) { openPlace(+nr.dataset.ni); return; }
      const row = e.target.closest('.fm-row');
      if (row) { select(row.dataset.eid); return; }
      const fa = e.target.closest('[data-fa]')?.dataset.fa;
      const p = this._people().find(x => x.eid === selected);
      if (!fa || !p) return;
      if (fa === 'message') this._messageUser(p.uid);
      if (fa === 'contact' && p.contact) this._nav('contact', { cid: p.contact.id });
      if (fa === 'directions') this._confirmMapsTo(p);
      if (fa === 'nearby' && p.has) openNearby(e.target.closest('[data-fa]'), p.lat, p.lon, p.me ? 'you' : p.name);
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
      sideBySide();
    };
    // people in (almost) the same spot sit side by side instead of on top of each other
    const sideBySide = () => {
      if (!map) return;
      const all = [...markers.entries()].map(([eid, m]) => ({ eid, m, pt: map.project(m.getLngLat()) }))
        .sort((a, b) => a.eid.localeCompare(b.eid));
      const groups = [];
      for (const it of all) {
        const g = groups.find(gr => gr.some(o => Math.hypot(o.pt.x - it.pt.x, o.pt.y - it.pt.y) < 46));
        if (g) g.push(it); else groups.push([it]);
      }
      for (const g of groups) g.forEach((it, i) => it.m.setOffset([(i - (g.length - 1) / 2) * 46, 0]));
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
          add3D(); ed.addLayers(); updateMarkers(); showSaved();
          if (!fitted) { fitted = true; map.resize(); if (selected) select(selected); else fitAll(false); }
        });
        map.on('styledata', () => { add3D(); ed.addLayers(); });
        ['zoomend', 'rotateend', 'pitchend'].forEach(ev => map.on(ev, sideBySide));
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
      if (a === 'closenearby') { closeNearby(); return; }
      if (a === 'nearbyback') { if (nearbyRes) { nearbyRes.detail = null; markPoi(-1); renderList(); } return; }
      if (a === 'nearbyhere') {
        if (!map) return;
        const c = map.getCenter();
        openNearby(e.target.closest('button'), c.lat, c.lng, 'the middle of the map');
        return;
      }
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
          ...(this._config.people_nearby === true ? [{ sep: true }, { header: 'Places' },
            { text: 'Show Saved Places', value: 'saved', checked: savedOn() },
            { text: 'Clear Saved Places', value: 'clearsaved', icon: ICON.trash, red: true }] : []),
        ]);
        if (v === 'saved') {
          try { localStorage.setItem('crowMessengerShowSaved', savedOn() ? 'off' : 'on'); } catch (err) { /* */ }
          showSaved();
          this._toast(savedOn() ? 'Saved places shown' : 'Saved places hidden');
          return;
        }
        if (v === 'clearsaved') {
          const r = await this._alert({ title: 'Clear Saved Places?', message: 'Places Find Nearby has found are forgotten on this device and taken off the map. They’re looked up again next time you search.', buttons: [{ text: 'Clear', style: 'destructive', value: true }, { text: 'Cancel', style: 'cancel' }] });
          if (r.value) { const n = this._clearNearby(); showSaved(); this._toast(n ? 'Saved places cleared' : 'No saved places'); }
          return;
        }
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
      clearPois();
      try { map?.remove(); } catch (e) { /* */ }
    };
    return page;
  },

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
        <label><span>Radius</span><input data-z="r" type="number" inputmode="numeric" min="${Math.round(this._units().toSmall(FM_ZONE_MIN))}" max="${Math.round(this._units().toSmall(FM_ZONE_MAX))}" step="${this._units().small === 'ft' ? 25 : 10}"><span class="fm-zu">${this._units().small}</span></label>
      </div>
      <button type="button" class="fm-zb" data-za="create">Create Zone</button></div>`;
  },

  _fillZoneForm(box, d) {
    const n = box.querySelector('[data-z="name"]'), r = box.querySelector('[data-z="r"]');
    if (n) n.value = d.name || '';
    if (r) r.value = Math.round(this._units().toSmall(d.r));
  },

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
            const ri = box?.querySelector('[data-z="r"]'); if (ri) ri.value = Math.round(this._units().toSmall(d.r));
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

  _wireZoneForm(box, getEd, onCreated) {
    const d = () => getEd()?.draft;
    box.addEventListener('input', (e) => {
      const z = e.target.dataset?.z;
      if (!d() || !z) return;
      if (z === 'name') d().name = e.target.value;
      if (z === 'r') { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) getEd().setR(Math.round(this._units().fromSmall(v))); }
    });
    box.addEventListener('change', (e) => { if (d() && e.target.dataset?.z === 'r') { e.target.value = Math.round(this._units().toSmall(d().r)); getEd()?.fit?.(); } });
    box.addEventListener('keydown', (e) => { if (d() && e.key === 'Enter' && e.target.dataset?.z) { e.preventDefault(); e.target.blur(); } });
    box.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-za="create"]');
      if (!btn || !d() || btn.disabled) return;
      // what the fields say now (the map may have arrived after some typing)
      d().name = box.querySelector('[data-z="name"]')?.value || '';
      const rv = parseInt(box.querySelector('[data-z="r"]')?.value, 10);
      if (Number.isFinite(rv)) d().r = clamp(Math.round(this._units().fromSmall(rv)), FM_ZONE_MIN, FM_ZONE_MAX);
      const z = await this._createZone(d(), btn, box.querySelector('[data-z="name"]'));
      if (z) onCreated(z);
    });
  },

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

  _zoneStart() {
    const me = this._people?.().find(p => p.me && p.has);
    if (me) return { lat: me.lat, lon: me.lon, here: true };
    const home = this._hass.states['zone.home']?.attributes;
    if (home?.latitude != null) return { lat: +home.latitude, lon: +home.longitude };
    return { lat: +this._hass.config?.latitude || 51.5, lon: +this._hass.config?.longitude || -0.12 };
  },

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
  }
});

CrowMessengerCard.lazyReady.people = true;
})();
