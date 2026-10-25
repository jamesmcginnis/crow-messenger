/*
 * Crow Messenger — Live Wallpapers
 * Part of the Crow Messenger card, in a file of its own so it's only downloaded when it's first used.
 * Loaded by the card (crow-messenger-card.js); not a dashboard resource.
 */
(() => {
'use strict';
const CrowMessengerCard = window.__crowMessengerCard;
if (!CrowMessengerCard || CrowMessengerCard.lazyReady?.live) return;
const { CM_LIVE, cmLiveInfo, fxBokeh, fxCanvas, fxDraw, fxFlake, fxGlint, fxGlow, fxHex, fxPick, fxRgba, fxRnd } = CrowMessengerCard.kit;

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

const lwGrad = (ctx, W, H, stops) => {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};

const lwSky = (hass) => {
  const { el, rising } = lwSun(hass), tw = rising ? LW_SKY.dawn : LW_SKY.dusk;
  if (el <= -8) return { c: LW_SKY.night, el, night: 1 };
  if (el < 0) { const k = (el + 8) / 8; return { c: LW_SKY.night.map((x, i) => lwMix(x, tw[i], k)), el, night: 1 - k }; }
  if (el < 12) return { c: tw.map((x, i) => lwMix(x, LW_SKY.day[i], el / 12)), el, night: 0 };
  return { c: LW_SKY.day, el, night: 0 };
};

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
  }
});

CrowMessengerCard.lazyCss.live = CM_LIVE_CSS;
CrowMessengerCard.CrowLiveWallpaper = CrowLiveWallpaper;
CrowMessengerCard.lazyReady.live = true;
})();
