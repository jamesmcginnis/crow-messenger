/*
 * Crow Messenger — Games
 * Part of the Crow Messenger card, in a file of its own so it's only downloaded when it's first used.
 * Loaded by the card (crow-messenger-card.js); not a dashboard resource.
 */
(() => {
'use strict';
const CrowMessengerCard = window.__crowMessengerCard;
if (!CrowMessengerCard || CrowMessengerCard.lazyReady?.games) return;
const { GAME_NAME, PICON, esc } = CrowMessengerCard.kit;

const GAMES = [
  { id: 'ttt', name: 'Noughts and Crosses', sub: 'Three in a row wins', bg: 'linear-gradient(160deg,#FF6482,#E0245E)' },
  { id: 'c4', name: 'Connect Four', sub: 'Drop counters, line up four', bg: 'linear-gradient(160deg,#FFD60A,#FF9F0A)' },
  { id: 'rev', name: 'Reversi', sub: 'Turn over your opponent’s discs', bg: 'linear-gradient(160deg,#30D158,#1E7A3C)', icon: 'disc' },
  { id: 'dr', name: 'Draughts', sub: 'Jump and take, crown your kings', bg: 'linear-gradient(160deg,#C0392B,#7B1E14)', icon: 'crown' },
  { id: 'sea', name: 'Sea Battle', sub: 'Find and sink the hidden fleet', bg: 'linear-gradient(160deg,#0A84FF,#0B3E8A)', icon: 'anchor' },
];

const SEA_SHIPS = [['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2], ['Patrol Boat', 2]];

const seaKinds = (lists) => {
  const used = new Set();
  return lists.map(cells => { const k = SEA_SHIPS.findIndex(([nm, n], j) => n === cells.length && !used.has(j)); used.add(k); return SEA_SHIPS[k]?.[0] || 'Ship'; });
};

const seaN = (v) => +v.toFixed(3);

const seaShip = (cells, kind, { wreck = false, ghost = false } = {}) => {
  const c = [...cells].sort((a, b) => a - b), n = c.length, r0 = Math.floor(c[0] / 8), c0 = c[0] % 8;
  const across = n < 2 || c[1] - c[0] === 1;
  const tf = across ? `translate(${c0},${r0})` : `translate(${c0 + 1},${r0}) rotate(90)`;
  return `<g transform="${tf}"${ghost ? ' opacity="0.55"' : ''}>${seaHull(n, kind, wreck)}</g>`;
};

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

const drCrowns = (v, i) => (v === 1 && i < 8) || (v === 2 && i >= 56);

const drDirs = (v) => (v >= 3 ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : v === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

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

const drOwner = (v) => (v === 1 || v === 3 ? 0 : v === 2 || v === 4 ? 1 : null);

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
.xcard.ringcard { width: 260px; }
.xcard.ringcard .xh svg { color: #F0480F; }
.xcard.ringcard.on .xh svg { animation: cm-ring-shake 1s ease-in-out infinite; transform-origin: 50% 50%; }
@keyframes cm-ring-shake { 0%, 50%, 100% { transform: rotate(0); } 10%, 30% { transform: rotate(-14deg); } 20%, 40% { transform: rotate(14deg); } }
@media (prefers-reduced-motion: reduce) { .xcard.ringcard.on .xh svg { animation: none; } }
.xcard.lqcard .xh svg { color: #FF453A; }
.xbtns button.bold { font-weight: 700; }
`;

const G8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

Object.assign(CrowMessengerCard.prototype, {
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
  }
});

CrowMessengerCard.lazyCss.games = PLAY_CSS;
CrowMessengerCard.lazyReady.games = true;
})();
