/*
 * Crow Messenger — Export as PDF
 * Part of the Crow Messenger card, in a file of its own so it's only downloaded when it's first used.
 * Loaded by the card (crow-messenger-card.js); not a dashboard resource.
 */
(() => {
'use strict';
const CrowMessengerCard = window.__crowMessengerCard;
if (!CrowMessengerCard || CrowMessengerCard.lazyReady?.pdf) return;
const { ICON, PDF_FONT_BASE, PDF_IMG_RUN, contactLetter, contactName, downloadBlob, esc, fmtBytes, fmtDur, fmtLongDate, fmtTime, formatAddress, initials, locale } = CrowMessengerCard.kit;



Object.assign(CrowMessengerCard.prototype, {
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

  _pg_pdf({ title, filename, build }) {
    const el = this._el(`<div class="pdfpage">
      <div class="pdf-frame"><div class="pdf-inner"><div class="pdf-status"><div class="spin"></div><span>Getting ready…</span><div class="pdf-bar"><i></i></div></div></div></div>
      <div class="top"><button class="pill g" data-a="close">Done</button><div class="title">${esc(title)}</div><div style="width:64px"></div></div>
      <div class="pdf-actions"><button class="pill g" data-a="download" disabled>${ICON.download}<span>Download</span></button><button class="pill g accent" data-a="chat" disabled>${ICON.bubble}<span>Send in a Chat</span></button></div>
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
      if (a === 'chat') this._sendFileToChats(new File([blob], filename, { type: 'application/pdf' }));
    });
    page.pdfBlob = () => blob;
    page.destroy = () => { closed = true; cleanups.forEach(fn => { try { fn(); } catch (e) { /* gone */ } }); };
    return page;
  },

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
  }
});

CrowMessengerCard.lazyReady.pdf = true;
})();
