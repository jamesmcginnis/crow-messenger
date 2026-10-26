/*
 * Crow Messenger — the Feed
 * A private social feed for the people in your home. Loaded by the Crow Messenger card the first
 * time the Feed is opened, so nobody downloads it until they use it.
 *
 * Every colour comes from the card's own theme variables (--cm-accent, --cm-bg, --cm-text …), so the
 * Feed follows whichever theme, skin, Glass setting and light or dark mode is chosen.
 * The server only ever sends this card posts the signed-in person is allowed to see.
 */
(() => {
'use strict';
const Card = window.__crowMessengerCard || customElements.get('crow-messenger-card');
if (!Card || Card.lazyReady?.feed) return;
const K = Card.kit;
const { esc, clamp, fmtDur, fmtListDate, fmtTime, locale, openExternal, HA_ID, STICKER_EMOJI } = K;

// ── Icons: Home Assistant's own Material Design Icons (mdi) ──────────────────
const mdi = (name, style = '') => `<ha-icon icon="mdi:${name}"${style ? ` style="${style}"` : ''}></ha-icon>`;
const FI = {
  everyone: mdi('home-account'),
  people: mdi('account-multiple-check-outline'),
  me: mdi('lock-outline'),
  group: mdi('account-group-outline'),
  profile: mdi('account-circle-outline'),
  like: mdi('thumb-up-outline'),
  comment: mdi('comment-outline'),
  send: mdi('send-outline'),
  more: mdi('dots-horizontal'),
  photo: mdi('image-outline'),
  video: mdi('video-outline'),
  poll: mdi('poll'),
  event: mdi('calendar-blank-outline'),
  fund: mdi('piggy-bank-outline'),
  gift: mdi('gift-outline'),
  smile: mdi('emoticon-happy-outline'),
  pin: mdi('map-marker-outline'),
  at: mdi('at'),
  album: mdi('image-album'),
  clock: mdi('clock-outline'),
  chat: mdi('chat-outline'),
  bookmark: mdi('bookmark-outline'),
  bookmarkFill: mdi('bookmark'),
  likeFill: mdi('thumb-up'),
  pinned: mdi('pin-outline'),
  edit: mdi('pencil-outline'),
  trash: mdi('trash-can-outline'),
  eyeOff: mdi('eye-off-outline'),
  copy: mdi('content-copy'),
  history: mdi('history'),
  tag: mdi('account-tag-outline'),
  plus: mdi('plus'),
  settings: mdi('cog-outline'),
  activity: mdi('timeline-text-outline'),
  sparkle: mdi('star-four-points-outline'),
  cake: mdi('cake-variant-outline'),
  globe: mdi('earth'),
  play: mdi('play'),
  chevL: mdi('chevron-left'),
  chevR: mdi('chevron-right'),
  check: mdi('check'),
  x: mdi('close'),
  sticker: mdi('sticker-emoji'),
  members: mdi('account-multiple-outline'),
  leave: mdi('logout-variant'),
  back: mdi('chevron-left'),
  share: mdi('export-variant'),
  newspaper: mdi('newspaper-variant-outline'),
  up: mdi('arrow-up'),
  bell: mdi('bell-outline'),
  // the bottom bar: outline, and filled for the tab you're on (like Facebook)
  home: mdi('home-outline'), homeFill: mdi('home'),
  videoTab: mdi('play-box-outline'), videoTabFill: mdi('play-box'),
  groupTab: mdi('account-group-outline'), groupTabFill: mdi('account-group'),
  eventTab: mdi('calendar-blank-outline'), eventTabFill: mdi('calendar-blank'),
  bellFill: mdi('bell'),
  bellOff: mdi('bell-off-outline'),
  ai: mdi('atom'),
  wave: mdi('hand-wave-outline'),
  archive: mdi('archive-arrow-down-outline'),
  unarchive: mdi('archive-arrow-up-outline'),
  shareFb: mdi('share-outline'),
  list: mdi('format-list-checks'),
  recs: mdi('lightbulb-on-outline'),
  homeCard: mdi('home-analytics'),
  highlight: mdi('star-circle-outline'),
  medal: mdi('medal-outline'),
  folder: mdi('folder-outline'),
  moon: mdi('weather-night'),
  select: mdi('checkbox-multiple-marked-outline'),
  work: mdi('briefcase-outline'),
  school: mdi('school-outline'),
  lives: mdi('home-map-marker'),
  hometown: mdi('map-marker-radius-outline'),
  team: mdi('soccer'),
  pets: mdi('paw'),
  hobbies: mdi('palette-outline'),
  thermo: mdi('thermometer'),
  chart: mdi('chart-line'),
  weather: mdi('weather-partly-cloudy'),
  cctv: mdi('cctv'),
  card: mdi('card-account-details-outline'),
  sort: mdi('sort'),
  question: mdi('comment-question-outline'),
  timer: mdi('timer-sand'),
  reply: mdi('reply-outline'),
  camera: mdi('camera'),
  move: mdi('cursor-move'),
  upload: mdi('image-plus-outline'),
  undo: mdi('undo-variant'),
  translate: mdi('translate'),
  search: mdi('magnify'),
  filter: mdi('filter-variant'),
  restore: mdi('restore'),
  menu: mdi('menu'),
  messages: mdi('message-outline'),
  photos: mdi('image-multiple-outline'),
  checkCircle: mdi('check-circle'),
  circle: mdi('checkbox-blank-circle-outline'),
};

const REACTIONS = [['love', '❤️', 'Love'], ['like', '👍', 'Like'], ['haha', '😂', 'Haha'], ['wow', '😮', 'Wow'], ['sad', '😢', 'Sad'], ['angry', '😡', 'Angry']];
const RE = Object.fromEntries(REACTIONS.map(([k, e, n]) => [k, { e, n }]));
// which Feed Settings switch each kind of bell notification falls under (the same list as the server)
const NOTIF_PREF = { reactions: 'reactions', comment_reactions: 'reactions', comments: 'comments', replies: 'comments', birthday_card: 'comments',
  claimed: 'comments', pledge: 'comments', mention: 'mentions', comment_mention: 'mentions', tagged: 'tags', page: 'page', birthday: 'birthdays', group: 'groups',
  shared: 'shares', wave: 'waves', story_reactions: 'stories', story_answers: 'stories', story_mention: 'stories' };
const PREF_NAME = { reactions: 'Reaction', comments: 'Comment', mentions: 'Mention', tags: 'Photo Tag', page: 'Page Post', birthdays: 'Birthday', groups: 'Group',
  shares: 'Share', waves: 'Wave', stories: 'Story' };
const STORY_EMOJI = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '👏'];
const ABOUT = [['work', 'Works at'], ['school', 'Studied at'], ['lives', 'Lives in'], ['hometown', 'From'], ['team', 'Supports'], ['pets', 'Pets'], ['hobbies', 'Into']];
const BACKGROUNDS = ['accent', 'sunset', 'ocean', 'forest', 'berry', 'night', 'rose', 'gold'];
const BG_MAX = 160;
const FEELINGS = [
  ['😊', 'happy'], ['🥰', 'loved'], ['😌', 'proud'], ['🤩', 'excited'], ['🙏', 'grateful'], ['😎', 'relaxed'],
  ['😴', 'tired'], ['🤒', 'poorly'], ['😢', 'sad'], ['😤', 'determined'], ['🥳', 'celebrating'], ['🤔', 'thoughtful'],
];
const ACTIVITIES = [
  ['🍳', 'cooking'], ['📺', 'watching TV'], ['🍽️', 'eating out'], ['✈️', 'travelling'], ['💼', 'working'], ['🏃', 'exercising'],
  ['🌱', 'gardening'], ['📚', 'reading'], ['🎮', 'playing games'], ['⚽', 'watching the match'], ['🎵', 'listening to music'], ['🧹', 'cleaning'],
];
const KIND_INFO = {
  post: { name: 'Post', icon: FI.edit }, poll: { name: 'Poll', icon: FI.poll }, event: { name: 'Event', icon: FI.event },
  fund: { name: 'Chip In', icon: FI.fund }, grabs: { name: 'Up for Grabs', icon: FI.gift },
  recs: { name: 'Recommendations', icon: FI.recs }, list: { name: 'List', icon: FI.list },
};
const REMIND = [[null, 'No Reminder'], [0, 'At the Start'], [15, '15 Minutes Before'], [60, '1 Hour Before'], [180, '3 Hours Before'], [1440, 'The Day Before']];
const URL_RE = /https?:\/\/[^\s<>"']+/gi;

// ── Styles (added to the card the first time the Feed opens) ─────────────────
const FEED_CSS = `
.fd { --fd-card: var(--cm-group); --fd-gap: 10px; }
.fd .scroll { padding-bottom: 30px; }
.fd .large-title { padding-bottom: 2px; }
.fd-seg { display: flex; gap: 6px; padding: 8px 14px 4px; overflow-x: auto; scrollbar-width: none; }
.fd-seg::-webkit-scrollbar { display: none; }
.fd-seg button { flex: 0 0 auto; padding: 7px 14px; border-radius: 18px; background: var(--cm-fill); font-size: 14.5px; font-weight: 600; color: var(--cm-text); }
.fd-seg button.on { background: var(--cm-accent); color: #fff; }
.fd-body { padding: 8px 10px 0; }
.fd-card { background: var(--fd-card); border-radius: 22px; margin-bottom: var(--fd-gap); overflow: hidden; }
.fd-box { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
.fd-box .fd-ph { flex: 1; min-width: 0; padding: 10px 14px; border-radius: 20px; background: var(--cm-fill); color: var(--cm-text2); font-size: 15px; }
.fd-box .fd-bi { width: 24px; height: 24px; color: var(--cm-accent); }
.fd-quick { display: flex; border-top: 0.5px solid var(--cm-sep); }
.fd-quick button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 4px; font-size: 13.5px; font-weight: 600; color: var(--cm-text2); }
.fd-quick button svg { width: 19px; height: 19px; color: var(--cm-accent); }
.fd-new { position: absolute; top: 98px; left: 50%; transform: translateX(-50%); z-index: 7; padding: 8px 16px; border-radius: 20px; background: var(--cm-accent); color: #fff; font-size: 14px; font-weight: 600; box-shadow: var(--cm-shadow); display: flex; align-items: center; gap: 6px; }
.fd-new svg { width: 15px; height: 15px; transform: rotate(90deg); }
/* stories */
.fd-stories { display: flex; gap: 12px; padding: 12px 14px; overflow-x: auto; scrollbar-width: none; }
.fd-stories::-webkit-scrollbar { display: none; }
.fd-st { flex: 0 0 auto; width: 70px; text-align: center; cursor: pointer; }
.fd-st .ring { width: 66px; height: 66px; border-radius: 50%; padding: 3px; margin: 0 auto 5px; background: conic-gradient(var(--cm-accent), color-mix(in srgb, var(--cm-accent) 40%, #ff2d55), var(--cm-accent)); }
.fd-st.seen .ring { background: var(--cm-sep); }
.fd-st .ring > .in { width: 100%; height: 100%; border-radius: 50%; padding: 2px; background: var(--fd-card); }
.fd-st .ring .av { width: 100% !important; height: 100% !important; }
.fd-st .add { position: relative; }
.fd-st .add .plus { position: absolute; right: 0; bottom: 4px; width: 22px; height: 22px; border-radius: 50%; background: var(--cm-accent); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2.5px var(--fd-card); }
.fd-st .add .plus svg { width: 13px; height: 13px; }
.fd-st .sn { font-size: 12px; color: var(--cm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* a post */
.fp { background: var(--fd-card); border-radius: 22px; margin-bottom: var(--fd-gap); overflow: hidden; }
.fp-label { display: flex; align-items: center; gap: 6px; padding: 10px 14px 0; font-size: 12.5px; font-weight: 600; color: var(--cm-text2); }
.fp-label svg { width: 15px; height: 15px; }
.fp-h { display: flex; align-items: flex-start; gap: 10px; padding: 12px 10px 6px 14px; }
.fp-h .av { cursor: pointer; }
.fp-who { flex: 1; min-width: 0; font-size: 15px; line-height: 1.3; }
.fp-who b { font-weight: 650; cursor: pointer; }
.fp-who .fp-x { color: var(--cm-text2); }
.fp-who .fp-x b { color: var(--cm-text); font-weight: 600; }
.fp-sub { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 12.5px; color: var(--cm-text2); margin-top: 2px; }
.fp-sub svg { width: 13px; height: 13px; }
.fp-sub .sch { color: var(--cm-accent); font-weight: 600; }
.fp-more { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); flex-shrink: 0; }
.fp-more svg { width: 22px; height: 22px; }
.fp-text { padding: 2px 14px 10px; font-size: 15.5px; line-height: 1.42; white-space: pre-wrap; word-break: break-word; user-select: text; -webkit-user-select: text; }
.fp-text a, .fp-text .lnk { color: var(--cm-accent); cursor: pointer; text-decoration: none; }
.fp-text .mn { color: var(--cm-accent); font-weight: 600; cursor: pointer; }
.fp-text.big { font-size: 22px; line-height: 1.3; }
.fp-text.more { display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; }
.fp-seemore { padding: 0 14px 10px; margin-top: -6px; color: var(--cm-text2); font-weight: 600; font-size: 14.5px; cursor: pointer; }
.fp-bg { margin: 0 0 10px; min-height: 200px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px 22px; font-size: 24px; font-weight: 700; line-height: 1.25; white-space: pre-wrap; word-break: break-word; color: #fff; }
.bg-accent { background: linear-gradient(135deg, var(--cm-accent), color-mix(in srgb, var(--cm-accent) 50%, #000)); }
.bg-sunset { background: linear-gradient(135deg, #ff6a5f, #ffb46b); }
.bg-ocean { background: linear-gradient(135deg, #1f8fb8, #6ad9f0); }
.bg-forest { background: linear-gradient(135deg, #0f8f7e, #48df84); }
.bg-berry { background: linear-gradient(135deg, #9a32e6, #4a12d6); }
.bg-night { background: linear-gradient(135deg, #0f2027, #2c5364); }
.bg-rose { background: linear-gradient(135deg, #f19bb0, #ffdde4); color: #5a1d2c !important; }
.bg-gold { background: linear-gradient(135deg, #f7971e, #ffd200); color: #4a2c00 !important; }
/* photos and videos */
.fp-media { display: grid; gap: 2px; margin-bottom: 6px; background: var(--cm-fill); }
.fp-media.n1 { grid-template-columns: 1fr; }
.fp-media.n2 { grid-template-columns: 1fr 1fr; }
.fp-media.n3 { grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; }
.fp-media.n3 .mi:first-child { grid-row: span 2; }
.fp-media.n4 { grid-template-columns: 1fr 1fr; }
.fp-media .mi { position: relative; overflow: hidden; cursor: pointer; aspect-ratio: 1; background: var(--cm-fill); }
.fp-media.n1 .mi { aspect-ratio: auto; max-height: 460px; }
.fp-media.n1 .mi img { width: 100%; height: auto; max-height: 460px; object-fit: cover; }
.fp-media .mi img, .fp-media .mi video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.fp-media.n1 .mi video { height: auto; max-height: 460px; min-height: 220px; background: #000; }
.fp-media .mi .vplay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; pointer-events: none; }
.fp-media .mi .vplay span { width: 54px; height: 54px; border-radius: 50%; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.fp-media .mi .vplay svg { width: 26px; height: 26px; margin-left: 3px; }
.fp-media .mi .vdur, .fd-grid .vdur { position: absolute; right: 7px; bottom: 7px; padding: 2px 7px; border-radius: 10px; background: rgba(0,0,0,0.55); color: #fff; font-size: 12px; font-weight: 600; pointer-events: none; }
.fp-media .mi .more { position: absolute; inset: 0; background: rgba(0,0,0,0.45); color: #fff; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.fp-media .mi .tg { position: absolute; left: 7px; bottom: 7px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.fp-media .mi .tg svg { width: 15px; height: 15px; }
.fp-media .mi.missing { display: flex; align-items: center; justify-content: center; color: var(--cm-text3); }
.fp-media .mi.missing svg { width: 34px; height: 34px; }
.fp-link { margin: 0 0 8px; overflow: hidden; background: var(--cm-fill); cursor: pointer; border-top: 0.5px solid var(--cm-sep); border-bottom: 0.5px solid var(--cm-sep); }
.fp-link .li { position: relative; width: 100%; aspect-ratio: 1.91; background: var(--cm-bg3, var(--cm-fill)); overflow: hidden; }
.fp-link .li img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fp-link .lb { padding: 10px 14px 12px; }
.fp-link .ls { font-size: 12.5px; color: var(--cm-text2); text-transform: uppercase; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-link .lt { margin-top: 3px; font-weight: 650; font-size: 16px; line-height: 1.28; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fp-link .ld { margin-top: 3px; font-size: 14px; color: var(--cm-text2); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.fp-link.small { display: flex; align-items: stretch; margin: 0 14px 10px; border-radius: 14px; border: none; }
.fp-link.small .li { width: 96px; flex: 0 0 96px; aspect-ratio: auto; }
.fp-link.small .lb { min-width: 0; align-self: center; }
.fp-link .lx { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; z-index: 2; }
.fp-link .lx ha-icon { --mdc-icon-size: 16px; }
.fdc-link { margin: 0 16px 10px; border-radius: 16px; overflow: hidden; position: relative; }
.fdc-link .fp-link { margin: 0; border: none; border-radius: 16px; }
.fdc-link .lload { padding: 14px; font-size: 14px; color: var(--cm-text2); background: var(--cm-fill); border-radius: 16px; }
/* reactions and buttons */
.fp-stats { display: flex; align-items: center; justify-content: space-between; padding: 4px 14px 8px; font-size: 13.5px; color: var(--cm-text2); min-height: 20px; }
.fp-stats .rx { display: flex; align-items: center; gap: 5px; cursor: pointer; }
.fp-stats .rx .em { display: flex; }
.fp-stats .rx .em span { width: 21px; height: 21px; border-radius: 50%; background: var(--fd-card); display: flex; align-items: center; justify-content: center; font-size: 13px; margin-left: -4px; box-shadow: 0 0 0 1.5px var(--fd-card); }
.fp-stats .rx .em span:first-child { margin-left: 0; }
.fp-stats .cc { cursor: pointer; }
.fp-acts { display: flex; align-items: center; gap: 2px; border-top: 0.5px solid var(--cm-sep); margin: 0 6px; padding: 4px 2px; }
.fp-acts button { display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 10px; font-size: 15px; font-weight: 500; color: var(--cm-text); border-radius: 20px; user-select: none; -webkit-user-select: none; }
.fp-acts button svg { width: 22px; height: 22px; }
.fp-acts button.on { color: var(--cm-accent); }
.fp-acts button .re { font-size: 20px; line-height: 1; }
.fp-acts button:active { background: var(--cm-fill); }
.fp-acts .fa-n { font-variant-numeric: tabular-nums; }
.fp-acts .fa-cnt { padding: 0 8px 0 0; margin-left: -6px; font-variant-numeric: tabular-nums; }
.fp-acts .fa-sp { flex: 1; }
.fp-acts .fa-rx { padding: 0 6px; gap: 0; }
.fp-acts .fa-rx span { width: 24px; height: 24px; border-radius: 50%; background: var(--fd-card); display: flex; align-items: center; justify-content: center; font-size: 15px; margin-left: -6px; box-shadow: 0 0 0 2px var(--fd-card); }
.fp-acts .fa-rx span:first-child { margin-left: 0; }
.fd-rpick { position: absolute; z-index: 45; display: flex; gap: 2px; padding: 6px 8px; border-radius: 30px; background: var(--cm-glass-strong); box-shadow: var(--cm-shadow); border: 0.5px solid var(--cm-glass-edge); animation: fd-pop .18s cubic-bezier(.3,1.4,.6,1); }
.fd-rpick button { width: 42px; height: 42px; font-size: 27px; border-radius: 50%; transition: transform .15s; }
.fd-rpick button:hover, .fd-rpick button:active { transform: scale(1.3) translateY(-4px); }
.fd-rpick button.on { background: var(--cm-fill); }
/* pressing and holding Like (and the reactions that open): no iPhone text selection or callout */
[data-fa="react"], .fd-rpick, .fd-rpick button { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
@keyframes fd-pop { from { transform: scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
/* comments */
.fp-cprev { padding: 2px 14px 12px; }
.fp-allc { font-size: 14px; color: var(--cm-text2); font-weight: 600; cursor: pointer; padding: 4px 0 6px; }
.fc { display: flex; gap: 8px; margin-top: 8px; }
.fc.reply { margin-left: 42px; }
.fc .av { flex-shrink: 0; cursor: pointer; }
.fc-main { min-width: 0; max-width: calc(100% - 42px); }
.fc-bub { display: inline-block; max-width: 100%; padding: 8px 12px; border-radius: 18px; background: var(--cm-fill); font-size: 14.5px; line-height: 1.35; position: relative; user-select: text; -webkit-user-select: text; }
.fc-bub b { display: block; font-size: 13.5px; font-weight: 650; cursor: pointer; }
.fc-bub .ft { white-space: pre-wrap; word-break: break-word; }
.fc-bub .ft .mn { color: var(--cm-accent); font-weight: 600; }
.fc-bub .crx { position: absolute; right: -6px; bottom: -10px; display: flex; align-items: center; gap: 2px; padding: 1px 6px; border-radius: 12px; background: var(--fd-card); box-shadow: 0 1px 4px rgba(0,0,0,0.18); font-size: 12px; color: var(--cm-text2); }
.fc-pic { margin-top: 6px; max-width: 200px; border-radius: 14px; overflow: hidden; cursor: pointer; }
.fc-pic img { width: 100%; display: block; }
.fc-stk { font-size: 60px; line-height: 1; margin-top: 4px; }
.fc-stk img { width: 110px; height: 110px; object-fit: contain; }
.fc-meta { display: flex; gap: 12px; padding: 4px 10px 0; font-size: 12.5px; color: var(--cm-text2); font-weight: 600; }
.fc-meta button { color: inherit; font-weight: 600; font-size: 12.5px; }
.fc-meta button.on { color: var(--cm-accent); }
.fp-full .fp-cprev { padding-bottom: 90px; }
.fd-cbar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; padding: 8px 10px 12px; background: var(--cm-glass-strong); border-top: 0.5px solid var(--cm-sep); }
.fd-cbar .rep { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--cm-text2); padding: 0 6px 6px; }
.fd-cbar .rep b { color: var(--cm-text); }
.fd-cbar .rep button { margin-left: auto; width: 22px; height: 22px; }
.fd-cbar .rep button svg { width: 16px; height: 16px; }
.fd-cbar .row { display: flex; align-items: flex-end; gap: 6px; }
.fd-cbar .cbtn { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-accent); flex-shrink: 0; }
.fd-cbar .cbtn svg { width: 22px; height: 22px; }
.fd-cbar textarea { flex: 1; min-width: 0; resize: none; border: none; outline: none; background: var(--cm-fill); color: var(--cm-text); border-radius: 19px; padding: 9px 14px; font-size: 15.5px; max-height: 120px; line-height: 1.3; font-family: inherit; }
.fd-cbar .row:has([data-c="ai"]) { gap: 2px; }
.fd-cbar .row:has([data-c="ai"]) .cbtn { width: 33px; }
.fd-cbar textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fd-cbar .go { width: 38px; height: 38px; border-radius: 50%; background: var(--cm-accent); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fd-cbar .go svg { width: 18px; height: 18px; }
.fd-cbar .go[disabled] { opacity: .4; }
.fd-cbar .att { display: flex; gap: 6px; padding: 0 0 6px 44px; }
.fd-cbar .att .th { position: relative; width: 60px; height: 60px; border-radius: 10px; overflow: hidden; background: var(--cm-fill); font-size: 40px; display: flex; align-items: center; justify-content: center; }
.fd-cbar .att .th img { width: 100%; height: 100%; object-fit: cover; }
.fd-cbar .att .th button { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: flex; align-items: center; justify-content: center; }
.fd-cbar .att .th button svg { width: 11px; height: 11px; }
/* post types */
.fk { margin: 0 14px 10px; border-radius: 16px; background: var(--cm-fill); padding: 12px; }
.fk-h { font-weight: 650; font-size: 16px; margin-bottom: 8px; }
.fk-opt { position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--fd-card); margin-bottom: 6px; cursor: pointer; overflow: hidden; }
.fk-opt .bar { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--cm-accent) 18%, transparent); transition: width .3s; }
.fk-opt > *:not(.bar) { position: relative; }
.fk-opt .ot { flex: 1; min-width: 0; font-size: 15px; }
.fk-opt .on { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--cm-text3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fk-opt.mine .on { background: var(--cm-accent); border-color: var(--cm-accent); color: #fff; }
.fk-opt .on svg { width: 13px; height: 13px; }
.fk-opt .oc { font-size: 13px; color: var(--cm-text2); font-weight: 600; }
.fk-foot { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--cm-text2); margin-top: 4px; }
.fk-foot button { color: var(--cm-accent); font-weight: 600; font-size: 13.5px; }
.fk-ev { display: flex; gap: 12px; align-items: center; }
.fk-ev .dt { width: 54px; flex-shrink: 0; text-align: center; border-radius: 12px; overflow: hidden; background: var(--fd-card); }
.fk-ev .dt .m { background: var(--cm-red); color: #fff; font-size: 11.5px; font-weight: 700; padding: 2px 0; text-transform: uppercase; }
.fk-ev .dt .d { font-size: 22px; font-weight: 700; padding: 3px 0 4px; }
.fk-ev .et { font-weight: 650; font-size: 16px; }
.fk-ev .ew { font-size: 13.5px; color: var(--cm-text2); margin-top: 2px; }
.fk-rsvp { display: flex; gap: 6px; margin-top: 10px; }
.fk-rsvp button { flex: 1; padding: 9px 4px; border-radius: 12px; background: var(--fd-card); font-size: 14px; font-weight: 600; }
.fk-rsvp button.on { background: var(--cm-accent); color: #fff; }
.fk-btns { display: flex; gap: 6px; margin-top: 8px; }
.fk-btns button { flex: 1; padding: 9px 4px; border-radius: 12px; background: var(--fd-card); font-size: 14px; font-weight: 600; color: var(--cm-accent); }
.fk-btns button.prim { background: var(--cm-accent); color: #fff; }
.fk-prog { height: 8px; border-radius: 4px; background: var(--fd-card); overflow: hidden; margin: 8px 0 6px; }
.fk-prog i { display: block; height: 100%; background: var(--cm-green); border-radius: 4px; }
.fk-big { font-size: 22px; font-weight: 700; }
.fk-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 700; }
.fk-badge.available { background: color-mix(in srgb, var(--cm-green) 22%, transparent); color: var(--cm-green); }
.fk-badge.claimed { background: color-mix(in srgb, #ff9f0a 22%, transparent); color: #ff9f0a; }
.fk-badge.gone { background: var(--cm-fill); color: var(--cm-text2); }
.fk-ban { margin: 0 14px 10px; border-radius: 18px; padding: 22px 16px; text-align: center; color: #fff; }
.fk-ban .bi { font-size: 46px; line-height: 1; }
.fk-ban .bt { font-size: 21px; font-weight: 750; margin-top: 8px; }
.fk-ban .bs { font-size: 14px; opacity: .9; margin-top: 4px; }
.fk-ban button { margin-top: 12px; padding: 9px 18px; border-radius: 18px; background: rgba(255,255,255,0.25); color: #fff; font-weight: 650; font-size: 14.5px; }
.fk-ban.birthday { background: linear-gradient(135deg, #ff5f8f, #ffb347); }
.fk-ban.milestone { background: linear-gradient(135deg, var(--cm-accent), #bf5af2); }
.fk-ban.review { background: linear-gradient(135deg, #0f2027, var(--cm-accent)); }
/* memories */
.fd-mem { padding: 12px 14px; }
.fd-mem .mh { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.fd-mem .mh svg { width: 18px; height: 18px; color: var(--cm-accent); }
.fd-mem .mr { display: flex; gap: 10px; align-items: center; padding: 8px 0; cursor: pointer; }
.fd-mem .mr + .mr { border-top: 0.5px solid var(--cm-sep); }
.fd-mem .mr .mt { width: 58px; height: 58px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: var(--cm-fill); }
.fd-mem .mr .mt img { width: 100%; height: 100%; object-fit: cover; }
.fd-mem .mr .ma { font-size: 12.5px; color: var(--cm-text2); font-weight: 600; }
.fd-mem .mr .mx { font-size: 14.5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* grids: Photos, Videos, albums */
.fd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; border-radius: 18px; overflow: hidden; }
.fd-grid .gi { position: relative; aspect-ratio: 1; background: var(--cm-fill); cursor: pointer; overflow: hidden; }
.fd-grid .gi img, .fd-grid .gi video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.fd-grid .gi .vplay { position: absolute; left: 7px; bottom: 7px; color: #fff; filter: drop-shadow(0 1px 3px rgba(0,0,0,.6)); }
.fd-grid .gi .vplay svg { width: 18px; height: 18px; }
.fd-grid .gi.missing { display: flex; align-items: center; justify-content: center; color: var(--cm-text3); }
.fd-albums { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.fd-al { cursor: pointer; }
.fd-al .ac { aspect-ratio: 1; border-radius: 18px; overflow: hidden; background: var(--cm-fill); display: flex; align-items: center; justify-content: center; color: var(--cm-text3); }
.fd-al .ac img { width: 100%; height: 100%; object-fit: cover; }
.fd-al .ac svg { width: 40px; height: 40px; }
.fd-al .an { font-weight: 650; font-size: 15px; margin-top: 6px; }
.fd-al .as { font-size: 13px; color: var(--cm-text2); display: flex; align-items: center; gap: 4px; }
.fd-al .as svg { width: 13px; height: 13px; }
.fd-al.new .ac { border: 2px dashed var(--cm-sep); background: none; color: var(--cm-accent); }
/* profile and group headers */
.fd-hero { position: relative; padding: 0 0 10px; text-align: center; }
.fd-hero .cover { height: 180px; background: linear-gradient(160deg, var(--cm-accent), color-mix(in srgb, var(--cm-accent) 30%, var(--cm-bg))); position: relative; overflow: hidden; }
.fd-hero .cover.has, .fd-hero .cover.mine { cursor: pointer; }
.fd-hero .cover img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; -webkit-user-select: none; pointer-events: none; }
.fd-hero .cvbtn { position: absolute; right: 12px; top: 14px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 18px; background: rgba(0,0,0,0.45); color: #fff; font-size: 13.5px; font-weight: 600; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.fd-hero .cvbtn svg { width: 17px; height: 17px; }
.fd-hero .hav .avbtn { position: absolute; right: 2px; bottom: 4px; width: 32px; height: 32px; border-radius: 50%; background: var(--cm-fill-solid, #3a3a3c); color: var(--cm-text); display: flex; align-items: center; justify-content: center; border: 3px solid var(--cm-bg); }
:host([data-mode="light"]) .fd-hero .hav .avbtn { background: #e4e6eb; }
.fd-hero .hav .avbtn svg { width: 17px; height: 17px; }
.fd-hero .hav { cursor: pointer; }
/* Reposition: drag the cover up or down */
.fd-hero.repos .cover { cursor: grab; touch-action: none; }
.fd-hero.repos .cover:active { cursor: grabbing; }
.fd-hero .rp-hint { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); padding: 7px 14px; border-radius: 16px; background: rgba(0,0,0,0.5); color: #fff; font-size: 13.5px; font-weight: 600; pointer-events: none; display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
.fd-hero .rp-hint svg { width: 16px; height: 16px; }
.fd-hero .rp-bar { position: absolute; right: 0; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 14px 12px; }
.fd-hero .rp-bar button { padding: 7px 16px; border-radius: 16px; background: rgba(255,255,255,0.22); color: #fff; font-weight: 650; font-size: 14px; }
.fd-hero .rp-bar button.save { background: var(--cm-accent); }
.fd-hero .hav { margin: -52px auto 0; width: 104px; height: 104px; border-radius: 50%; padding: 4px; background: var(--cm-bg); position: relative; }
.fd-hero .hav .av { width: 96px !important; height: 96px !important; font-size: 36px !important; }
.fd-hero .hn { font-size: 24px; font-weight: 750; margin-top: 6px; }
.fd-hero .hs { font-size: 14px; color: var(--cm-text2); margin-top: 2px; padding: 0 20px; }
.fd-hero .hb { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; padding: 0 14px; }
.fd-hero .hb button { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 20px; background: var(--cm-fill); font-weight: 650; font-size: 14.5px; }
.fd-hero .hb button.prim { background: var(--cm-accent); color: #fff; }
.fd-hero .hb button svg { width: 17px; height: 17px; }
.fd-hero .gicon { margin: -46px auto 0; width: 92px; height: 92px; border-radius: 26px; background: var(--cm-bg); padding: 4px; position: relative; }
.fd-hero .gicon > div { width: 100%; height: 100%; border-radius: 22px; background: var(--cm-fill); display: flex; align-items: center; justify-content: center; color: var(--cm-accent); overflow: hidden; }
.fd-hero .gicon > div svg { width: 44px; height: 44px; }
.fd-hero .gicon img { width: 100%; height: 100%; object-fit: cover; }
.fd-faces { display: flex; justify-content: center; margin-top: 10px; cursor: pointer; }
.fd-faces .av { box-shadow: 0 0 0 2px var(--cm-bg); margin-left: -8px; }
.fd-faces .av:first-child { margin-left: 0; }
.fd-tabs { display: flex; gap: 4px; padding: 6px 14px 0; border-bottom: 0.5px solid var(--cm-sep); overflow-x: auto; scrollbar-width: none; position: sticky; top: 0; }
.fd-tabs::-webkit-scrollbar { display: none; }
.fd-tabs button { flex: 0 0 auto; padding: 10px 12px; font-weight: 650; font-size: 15px; color: var(--cm-text2); border-bottom: 2.5px solid transparent; }
.fd-tabs button.on { color: var(--cm-accent); border-bottom-color: var(--cm-accent); }
/* rows (groups list, settings, activity) */
.fd-row { display: flex; align-items: center; gap: 12px; padding: 11px 16px; cursor: pointer; position: relative; }
.fd-row + .fd-row::before { content: ''; position: absolute; top: 0; left: 64px; right: 0; height: .5px; background: var(--cm-sep); }
.fd-row .ri { width: 40px; height: 40px; border-radius: 12px; background: var(--cm-fill); display: flex; align-items: center; justify-content: center; color: var(--cm-accent); flex-shrink: 0; overflow: hidden; }
.fd-row .ri svg { width: 22px; height: 22px; }
.fd-row .ri img { width: 100%; height: 100%; object-fit: cover; }
.fd-row .rb { flex: 1; min-width: 0; }
.fd-row .r1 { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fd-row .r2 { font-size: 13.5px; color: var(--cm-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fd-row .rch { width: 14px; height: 14px; color: var(--cm-text3); }
.fd-h2 { font-size: 13px; font-weight: 650; color: var(--cm-text2); text-transform: uppercase; letter-spacing: .03em; padding: 14px 18px 6px; }
/* Activity Log: your wall */
.fw .fd-hero .hs { max-width: 420px; margin-left: auto; margin-right: auto; }
.fw-counts { display: flex; justify-content: center; gap: 4px 14px; flex-wrap: wrap; margin-top: 8px; padding: 0 14px; font-size: 14px; color: var(--cm-text2); }
.fw-counts:empty { display: none; }
.fw-counts button { color: inherit; font-size: inherit; }
.fw-counts b { color: var(--cm-text); font-weight: 700; }
.fw-month { display: flex; align-items: center; gap: 10px; padding: 14px 8px 10px; font-size: 13px; font-weight: 650; color: var(--cm-text2); text-transform: uppercase; letter-spacing: .03em; }
.fw-month::before, .fw-month::after { content: ''; flex: 1; height: .5px; background: var(--cm-sep); }
.fw-s { background: var(--fd-card); border-radius: 22px; margin-bottom: var(--fd-gap); overflow: hidden; padding-bottom: 10px; }
.fw-h { display: flex; align-items: center; gap: 10px; padding: 12px 10px 8px 14px; }
.fw-i { width: 34px; height: 34px; border-radius: 50%; background: var(--cm-fill); color: var(--cm-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fw-i svg { width: 18px; height: 18px; }
.fw-l { flex: 1; min-width: 0; font-size: 15px; line-height: 1.3; }
.fw-l b { font-weight: 650; cursor: pointer; }
.fw-t { font-size: 12.5px; color: var(--cm-text2); margin-top: 1px; }
.fw-in { margin: 0 10px; border: .5px solid var(--cm-sep); border-radius: 18px; overflow: hidden; }
.fw-in .fp { margin: 0; border-radius: 0; background: transparent; }
.fw-in .fp-cprev { display: none; }
.fw-c { display: flex; gap: 8px; padding: 2px 14px 6px; cursor: pointer; }
.fw-c .fc-bub { display: inline-block; max-width: 100%; }
.fw-cm { font-size: 12px; color: var(--cm-text2); padding: 3px 12px 0; }
.fw-gone { margin: 0 14px 8px; padding: 10px 12px; border-radius: 14px; background: var(--cm-fill); font-size: 14px; color: var(--cm-text2); }
.fw-mini { display: flex; align-items: center; gap: 10px; margin: 4px 10px 0; padding: 8px 10px; border-radius: 14px; background: var(--cm-fill); cursor: pointer; font-size: 14px; }
.fw-mini img, .fw-mini .mi-i { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); background: var(--cm-sep); }
.fw-mini .mi-i svg { width: 20px; height: 20px; }
.fw-mini > div { flex: 1; min-width: 0; }
.fw-mini > div div { color: var(--cm-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fw-mini .rch { color: var(--cm-text3); display: flex; }
.fw-mini .rch svg { width: 14px; height: 14px; }
:host([data-retro]) .fw-s { border: 1px solid var(--cm-sep); }
/* the bottom bar: a floating Liquid Glass capsule (Bars Liquid Glass on), or a solid bar along the bottom */
.fd.has-nav .fd-body { padding-bottom: 100px; }
.fd-nav { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 8; display: flex; align-items: center; justify-content: space-around; height: 62px; padding: 0 6px; border-radius: 31px; }
.fd-nav button { position: relative; flex: 1; height: 50px; max-width: 76px; display: flex; align-items: center; justify-content: center; border-radius: 25px; color: var(--cm-text); transition: background .2s; }
.fd-nav button.on { background: color-mix(in srgb, var(--cm-text) 10%, transparent); }
.fd-nav .fn-o, .fd-nav .fn-f { display: flex; }
.fd-nav .fn-f { display: none; }
.fd-nav button.on .fn-o { display: none; }
.fd-nav button.on .fn-f { display: flex; }
.fd-nav button.on .fn-f, .fd-nav button.on .fn-f ha-icon { color: var(--cm-accent); }
.fd-nav ha-icon { --mdc-icon-size: 27px; display: inline-flex; }
.fd-nav svg { width: 27px; height: 27px; }
.fd-nav .fn-me { position: relative; display: flex; }
.fd-nav .fn-me .av { width: 30px !important; height: 30px !important; font-size: 13px !important; }
.fd-nav button.on .fn-me .av { box-shadow: 0 0 0 2px var(--cm-accent); }
.fd-nav .fn-mm { position: absolute; right: -5px; bottom: -4px; width: 16px; height: 16px; border-radius: 50%; background: var(--cm-fill); box-shadow: 0 0 0 1.5px var(--cm-bg); display: flex; align-items: center; justify-content: center; }
.fd-nav .fn-mm ha-icon { --mdc-icon-size: 11px; }
.fd-nav .fn-mm svg { width: 11px; height: 11px; }
.fd-nav .fn-badge { position: absolute; top: 5px; left: calc(50% + 4px); min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #ff3b30; color: #fff; font-size: 11.5px; font-weight: 700; line-height: 18px; text-align: center; box-shadow: 0 0 0 1.5px var(--cm-bg); }
.fd-nav .fn-badge[hidden] { display: none; }
:host([data-bars="solid"]) .fd-nav { left: 0; right: 0; bottom: 0; height: 64px; border-radius: 0; border-width: .5px 0 0; padding-bottom: 4px; box-shadow: none; }
:host([data-bars="solid"]) .fd.has-nav .fd-body { padding-bottom: 84px; }
:host([data-retro]) .fd-nav button { border-radius: 3px; }
/* Notifications */
.fn-list { margin: 0 -10px; }
.fn-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; }
.fn-row.new { background: color-mix(in srgb, var(--cm-accent) 12%, transparent); }
.fn-av { position: relative; flex-shrink: 0; display: flex; }
.fn-av .av { width: 56px !important; height: 56px !important; font-size: 22px !important; }
.fn-k { position: absolute; right: -3px; bottom: -3px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 0 0 2px var(--cm-bg); }
.fn-k ha-icon { --mdc-icon-size: 14px; display: inline-flex; }
.fn-k svg { width: 14px; height: 14px; }
.fn-k .em { font-size: 15px; line-height: 1; }
.fn-k.k-blue { background: #1877f2; } .fn-k.k-green { background: #34c759; } .fn-k.k-pink { background: #ff2d74; }
.fn-k.k-orange { background: #ff9500; } .fn-k.k-purple { background: #8e5cf7; } .fn-k.k-em { background: var(--cm-group); }
.fn-tx { flex: 1; min-width: 0; }
.fn-l { font-size: 15px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.fn-l b { font-weight: 650; }
.fn-t { font-size: 13px; color: var(--cm-text2); margin-top: 3px; }
.fn-row.new .fn-t { color: var(--cm-accent); font-weight: 600; }
.fn-th { width: 52px; height: 52px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--cm-fill); }
.fn-th img { width: 100%; height: 100%; object-fit: cover; }
/* Menu */
.fm-me { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; }
.fm-me .fm-n { flex: 1; min-width: 0; font-size: 17px; }
.fm-me .fm-n div { font-size: 13.5px; color: var(--cm-text2); }
.fm-me .av { flex-shrink: 0; }
.fm-me .rch { color: var(--cm-text3); display: flex; }
.fm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: var(--fd-gap); }
.fm-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 14px; border-radius: 18px; background: var(--fd-card); font-size: 15px; font-weight: 600; color: var(--cm-text); text-align: left; }
.fm-i { color: var(--cm-accent); display: flex; }
.fm-i ha-icon { --mdc-icon-size: 26px; }
.fm-i svg { width: 26px; height: 26px; }
:host([data-retro]) .fm-tile { border-radius: 3px; border: 1px solid var(--cm-sep); }
/* press and hold in a grid; Select… */
.fd-grid .gi { -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
.fd-grid.selecting .gi::after { content: ''; position: absolute; right: 6px; bottom: 6px; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #fff; background: rgba(0,0,0,.25); box-shadow: 0 1px 4px rgba(0,0,0,.4); }
.fd-grid.selecting .gi.sel::after { background: var(--cm-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E") center/16px no-repeat; }
.fd-grid.selecting .gi.sel img, .fd-grid.selecting .gi.sel video { opacity: .75; }
.fd-grid.selecting .gi .vplay, .fd-grid.selecting .gi .vdur { opacity: .5; }
.fsel-bar { position: absolute; left: 12px; right: 12px; bottom: 16px; z-index: 9; height: 56px; border-radius: 28px; display: flex; align-items: center; gap: 6px; padding: 0 8px 0 16px; }
.fsel-bar.over-nav { bottom: 86px; }
:host([data-bars="solid"]) .fsel-bar.over-nav { bottom: 74px; }
.fsel-bar [data-s="cancel"] { font-weight: 600; color: var(--cm-accent); font-size: 16px; }
.fsel-bar .n { flex: 1; text-align: center; font-weight: 650; font-size: 15.5px; }
.fsel-bar [data-s="save"], .fsel-bar [data-s="delete"] { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-accent); }
.fsel-bar .del { color: var(--cm-red, #ff3b30) !important; }
.fsel-bar button:disabled { opacity: .35; }
.fsel-bar svg { width: 22px; height: 22px; }
:host([data-retro]) .fsel-bar { border-radius: 3px; }
/* notifications: the same swipes as the chat list */
.fn-sw.row { padding: 0; gap: 0; align-items: stretch; }
.fn-sw.row::after { display: none; }
.fn-sw .row-inner.fn-row { padding: 10px 16px; }
.fn-sw .swipe-actions .more { background: #8E8E93; }
.fn-sw .swipe-actions button, .fn-sw .swipe-lead button { transition: width .15s; }
.fn-sw .swipe-actions ha-icon, .fn-sw .swipe-lead ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fn-sw.swipe-full .swipe-actions .more { width: 0 !important; overflow: hidden; padding: 0; }
.fn-filter { display: flex; align-items: center; gap: 8px; margin: 2px 6px 6px; padding: 8px 12px; border-radius: 14px; background: var(--fd-card); font-size: 14px; color: var(--cm-text2); }
.fn-filter ha-icon { --mdc-icon-size: 18px; color: var(--cm-accent); display: inline-flex; }
.fn-filter span { flex: 1; } .fn-filter b { color: var(--cm-text); font-weight: 600; }
.fn-filter button { color: var(--cm-accent); font-weight: 600; font-size: 14px; }
.fn-removed { margin: 0; } .fn-removed .fn-row { padding: 8px 4px; cursor: default; }
.fn-rs { width: 40px; height: 40px; padding: 0 !important; display: flex; align-items: center; justify-content: center; color: var(--cm-accent); flex-shrink: 0; }
.fn-rs ha-icon { --mdc-icon-size: 22px; }
.toast.fundo { display: flex; align-items: center; gap: 14px; pointer-events: auto; white-space: nowrap; width: max-content; max-width: calc(100% - 32px); }
.toast.fundo span { overflow: hidden; text-overflow: ellipsis; }
.toast.fundo button { color: var(--cm-accent); font-weight: 700; font-size: 15px; }
/* autoplay */
.fp-media .mi video[data-auto] { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.fp-media .mi.playing .vplay { opacity: 0; transition: opacity .2s; }
/* ── More like Facebook ─────────────────────────────────────────────────────── */
/* a shared post: the original inside a frame */
.fp-shared { margin: 0 14px 10px; border: 1px solid var(--cm-sep); border-radius: 16px; overflow: hidden; cursor: pointer; }
.fp-shared .fs-h { display: flex; align-items: center; gap: 8px; padding: 10px 12px 6px; font-size: 14px; }
.fp-shared .fs-h b { font-weight: 650; }
.fp-shared .fs-h .t { color: var(--cm-text2); font-size: 12.5px; }
.fp-shared .fp-text, .fp-shared .fp-bg { margin-left: 0; margin-right: 0; }
.fp-shared .fp-media, .fp-shared .fk, .fp-shared .fh-card, .fp-shared .fp-link { margin-left: 0; margin-right: 0; border-radius: 0; }
.fp-shared.na { padding: 14px; color: var(--cm-text2); font-size: 14px; cursor: default; display: flex; gap: 8px; align-items: center; }
.fp-shared.na ha-icon { --mdc-icon-size: 18px; display: inline-flex; }
/* Share from Home */
.fh-card { margin: 0 14px 10px; border-radius: 16px; padding: 14px; background: linear-gradient(150deg, color-mix(in srgb, var(--cm-accent) 22%, var(--cm-fill)), var(--cm-fill)); }
.fh-card .fh-h { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--cm-text2); font-weight: 600; }
.fh-card .fh-h ha-icon { --mdc-icon-size: 18px; display: inline-flex; color: var(--cm-accent); }
.fh-card .fh-v { font-size: 34px; font-weight: 750; margin-top: 6px; letter-spacing: -0.5px; }
.fh-card .fh-v small { font-size: 17px; font-weight: 600; color: var(--cm-text2); margin-left: 3px; }
.fh-card .fh-n { font-size: 15px; font-weight: 600; }
.fh-card .fh-s { font-size: 12.5px; color: var(--cm-text2); margin-top: 6px; }
.fh-card svg.fh-chart { display: block; width: 100%; height: 90px; margin-top: 8px; overflow: visible; }
.fh-card .fh-w { display: flex; align-items: center; gap: 14px; margin-top: 6px; }
.fh-card .fh-w .big { font-size: 44px; line-height: 1; }
.fh-card .fh-w .meta { font-size: 13.5px; color: var(--cm-text2); line-height: 1.5; }
/* a recommended contact in a comment */
.fc-contact { display: flex; align-items: center; gap: 10px; margin-top: 4px; padding: 10px 12px; border-radius: 16px; border: 1px solid var(--cm-sep); max-width: 320px; }
.fc-contact ha-icon { --mdc-icon-size: 26px; display: inline-flex; color: var(--cm-accent); }
.fc-contact .fcc-b { flex: 1; min-width: 0; font-size: 13.5px; color: var(--cm-text2); }
.fc-contact .fcc-b b { display: block; color: var(--cm-text); font-size: 14.5px; }
.fc-contact button { padding: 6px 12px; border-radius: 14px; background: var(--cm-fill); color: var(--cm-accent); font-weight: 600; font-size: 13.5px; }
.fc-sort { padding: 2px 14px 6px; }
.fc-sort button { display: inline-flex; align-items: center; gap: 5px; font-weight: 650; font-size: 14px; color: var(--cm-text2); }
.fc-sort ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
/* lists and recommendations */
.fk-list .fk-h, .fk-recs .fk-h { display: flex; align-items: center; gap: 6px; }
.fk-list .fk-h ha-icon, .fk-recs .fk-h ha-icon { --mdc-icon-size: 20px; color: var(--cm-accent); display: inline-flex; }
.fl-i { display: flex; align-items: center; gap: 10px; padding: 8px 2px; border-top: .5px solid var(--cm-sep); font-size: 15px; cursor: pointer; }
.fl-i:first-of-type { border-top: 0; }
.fl-ck { width: 22px; height: 22px; border-radius: 50%; border: 1.8px solid var(--cm-text3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
.fl-ck ha-icon { --mdc-icon-size: 15px; display: inline-flex; }
.fl-i.done .fl-ck { background: var(--cm-green); border-color: var(--cm-green); }
.fl-i.done .fl-t { text-decoration: line-through; color: var(--cm-text2); }
.fl-t { flex: 1; min-width: 0; }
.fl-by { font-size: 12px; color: var(--cm-text3); }
.fk-foot ha-icon { --mdc-icon-size: 13px; display: inline-flex; vertical-align: -2px; }
.fr-i { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: .5px solid var(--cm-sep); }
.fr-i:first-of-type { border-top: 0; }
.fr-i > ha-icon { --mdc-icon-size: 26px; color: var(--cm-accent); display: inline-flex; }
.fr-b { flex: 1; min-width: 0; font-size: 13.5px; color: var(--cm-text2); }
.fr-b b { color: var(--cm-text); font-size: 15px; }
.fr-by { font-size: 12px; color: var(--cm-text3); }
.fr-i button { padding: 6px 12px; border-radius: 14px; background: var(--cm-group, var(--cm-bg)); color: var(--cm-accent); font-weight: 600; font-size: 13.5px; }
.fk-ban.badges { background: linear-gradient(150deg, #f7b733, #fc4a1a); }
.fb-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; text-align: left; }
.fb-i { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.18); border-radius: 14px; padding: 8px 10px; cursor: pointer; font-size: 13.5px; }
.fb-i b { font-size: 14.5px; }
/* profile: intro, badges, featured, highlights */
.fp-badges { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 8px; padding: 0 14px; }
.fp-badges span { padding: 4px 10px; border-radius: 12px; background: color-mix(in srgb, #f7b733 22%, var(--cm-fill)); font-size: 12.5px; font-weight: 650; }
.fd-hero .fp-fcount button { font-size: 15px; font-weight: 650; color: var(--cm-text); margin-top: 2px; }
.fd-hero .fp-fcount:empty { display: none; }
.fp-friends { margin: 12px 10px 0; padding: 14px 14px 10px; border-radius: 22px; background: var(--fd-card); }
.fp-friends .ih { display: flex; align-items: center; justify-content: space-between; font-size: 18px; font-weight: 750; }
.fp-friends .ih button { font-size: 15px; font-weight: 500; color: var(--cm-accent); }
.fp-friends .fs { font-size: 14px; color: var(--cm-text2); margin: 2px 0 12px; }
.fp-friends .fg { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 8px; }
.fp-friends .ff { display: flex; flex-direction: column; align-items: center; gap: 7px; min-width: 0; color: var(--cm-text); }
.fp-friends .ff > :first-child { flex: none; }
.fp-friends .ff span { font-size: 14.5px; font-weight: 600; line-height: 1.22; text-align: center; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; max-width: 100%; }
.ffq { width: 100%; box-sizing: border-box; margin: 2px 0 12px; padding: 10px 14px; border-radius: 12px; border: 0; background: var(--cm-fill, rgba(127,127,127,.14)); color: var(--cm-text); font: inherit; font-size: 16px; outline: none; }
.ffl .pick-row .pn { flex: 1; min-width: 0; }
.ffmsg { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--cm-fill, rgba(127,127,127,.14)); color: var(--cm-text); flex: none; }
.ffmsg svg { width: 19px; height: 19px; }
.fp-intro { margin: 12px 10px 0; padding: 14px; border-radius: 22px; background: var(--fd-card); }
.fp-intro .ih { display: flex; align-items: center; justify-content: space-between; font-size: 18px; font-weight: 750; margin-bottom: 8px; }
.fp-intro .ih button { font-size: 14px; font-weight: 600; color: var(--cm-accent); }
.fp-intro .bio { text-align: center; font-size: 15px; padding: 2px 6px 10px; white-space: pre-wrap; }
.fp-intro .det { display: flex; align-items: center; gap: 10px; padding: 6px 2px; font-size: 15px; }
.fp-intro .det ha-icon { --mdc-icon-size: 20px; color: var(--cm-text2); display: inline-flex; }
.fp-intro .det .lock { margin-left: auto; color: var(--cm-text3); }
.fp-intro .det .lock ha-icon { --mdc-icon-size: 15px; }
.fp-intro .empty-i { color: var(--cm-text2); font-size: 14px; padding: 4px 2px; }
.fp-feat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 10px; }
.fp-feat .ft { aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--cm-fill); cursor: pointer; }
.fp-feat .ft img { width: 100%; height: 100%; object-fit: cover; display: block; }
.xsheet.hlp .xbody { padding-bottom: 24px; }
.hlp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin: 0 -4px; }
.hlp-t { position: relative; aspect-ratio: 9 / 16; border-radius: 10px; overflow: hidden; background: var(--cm-fill); padding: 0; display: block; }
.hlp-t > img, .hlp-t > .tx { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hlp-t > .tx { display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; color: #fff; font-size: 13px; font-weight: 700; text-align: center; line-height: 1.25; overflow: hidden; }
.hlp-t::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.28), transparent 30%, transparent 70%, rgba(0,0,0,.45)); pointer-events: none; }
.hlp-t .d { position: absolute; left: 7px; bottom: 6px; z-index: 1; color: #fff; font-size: 12px; font-weight: 650; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.hlp-t .lv { position: absolute; left: 6px; top: 6px; z-index: 1; padding: 2px 7px; border-radius: 9px; background: var(--cm-accent); color: #fff; font-size: 10.5px; font-weight: 700; }
.hlp-t .lv.hl { background: rgba(0,0,0,.5); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.hlp-t .n { position: absolute; right: 6px; top: 6px; z-index: 1; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #fff; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 750; color: #fff; background: rgba(0,0,0,.18); }
.hlp-t.on .n { background: var(--cm-accent); border-color: var(--cm-accent); }
.hlp-t.on { outline: 3px solid var(--cm-accent); outline-offset: -3px; }
.hlp-t.off { opacity: .45; }
.hlp-t .n.in { background: rgba(255,255,255,.9); color: #000; border-color: transparent; }
.hlp-covers { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding: 4px 2px 8px; }
.hlp-cv { flex: none; padding: 0; }
.hlp-cv .c { width: 70px; height: 70px; border-radius: 50%; padding: 3px; border: 3px solid transparent; box-sizing: border-box; }
.hlp-cv.on .c { border-color: var(--cm-accent); }
.hlp-cv .c > * { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700; overflow: hidden; text-align: center; }
.xsheet [data-xs="act"].dim { opacity: .45; }
.fp-hls { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; padding: 12px 14px 2px; }
.fp-hls::-webkit-scrollbar { display: none; }
.fp-hl { flex: 0 0 auto; width: 66px; text-align: center; font-size: 12.5px; cursor: pointer; }
.fp-hl .c { width: 62px; height: 62px; border-radius: 50%; margin: 0 auto 5px; padding: 2px; border: 2px solid var(--cm-sep); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--cm-fill); }
.fp-hl .c > * { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; overflow: hidden; }
.fp-hl .c ha-icon { --mdc-icon-size: 26px; color: var(--cm-accent); }
.fp-hl .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fd-hero .hb button.waved { color: var(--cm-text2); }
/* Manage Posts: select several */
.fd-body.selecting .fp { position: relative; cursor: pointer; }
.fd-body.selecting .fp::after { content: ''; position: absolute; top: 14px; right: 14px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--cm-text3); background: var(--fd-card); z-index: 2; }
.fd-body.selecting .fp.sel::after { background: var(--cm-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E") center/18px no-repeat; border-color: var(--cm-accent); }
.fd-body.selecting .fp > * { pointer-events: none; }
.fm-selbar { position: absolute; left: 10px; right: 10px; bottom: 12px; z-index: 8; display: flex; gap: 6px; align-items: center; padding: 8px; border-radius: 22px; background: var(--cm-glass-strong); box-shadow: 0 6px 24px rgba(0,0,0,.25); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.fm-selbar .n { flex: 1; font-weight: 650; padding-left: 8px; font-size: 14.5px; }
.fm-selbar button { padding: 8px 12px; border-radius: 16px; background: var(--cm-fill); font-weight: 600; font-size: 13.5px; }
.fm-selbar button.red { color: var(--cm-red); }
/* Saved collections */
.fd-cols { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 0 2px 10px; }
.fd-cols::-webkit-scrollbar { display: none; }
.fd-cols button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 18px; background: var(--cm-fill); font-weight: 600; font-size: 14px; }
.fd-cols button.on { background: var(--cm-accent); color: #fff; }
.fd-cols ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
/* stories: stickers, reactions, highlights */
.fds .stk { position: absolute; transform: translate(-50%, -50%); z-index: 4; color: #111; text-align: center; max-width: 78%; }
.fds .stk-card { background: #fff; border-radius: 16px; padding: 10px 12px; box-shadow: 0 6px 20px rgba(0,0,0,.3); min-width: 180px; }
.fds .stk-card .q { font-weight: 750; font-size: 16px; margin-bottom: 8px; }
.fds .stk-poll button { display: block; width: 100%; position: relative; overflow: hidden; margin-top: 6px; padding: 9px 10px; border-radius: 12px; background: #eee; color: #111; font-weight: 650; font-size: 15px; text-align: left; }
.fds .stk-poll button i { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--cm-accent) 35%, transparent); }
.fds .stk-poll button span { position: relative; display: flex; justify-content: space-between; gap: 8px; }
.fds .stk-poll button.mine { outline: 2px solid var(--cm-accent); }
.fds .stk-q .a { padding: 9px 10px; border-radius: 12px; background: #eee; color: #666; font-size: 14px; cursor: text; }
.fds .stk-cd .t { font-size: 13px; font-weight: 650; color: #555; }
.fds .stk-cd .v { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.fds .stk-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 14px; background: #fff; font-weight: 750; font-size: 16px; box-shadow: 0 6px 20px rgba(0,0,0,.3); cursor: pointer; }
.fds .stk-chip ha-icon { --mdc-icon-size: 18px; display: inline-flex; }
.fds .sfoot .emo { display: flex; gap: 2px; }
.fds .sfoot .emo button { padding: 6px 3px; background: none; font-size: 21px; }
.fds .sfoot .emo button.on { background: rgba(255,255,255,0.25); }
.fds .shl { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; z-index: 3; }
.fds .shl span { padding: 6px 12px; border-radius: 14px; background: rgba(0,0,0,.45); font-size: 13px; font-weight: 600; }
.st-stks { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 0 10px; }
.st-stks .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 14px; background: var(--cm-fill); font-size: 13.5px; font-weight: 600; }
.st-stks .chip button { color: var(--cm-text2); }
.fd-viewers .vr { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-bottom: .5px solid var(--cm-sep); }
.fd-viewers .vr .pn { flex: 1; }
.fd-viewers .vr .em { font-size: 20px; }
.fd-viewers .vr .rp { color: var(--cm-text2); display: inline-flex; }
.fd-viewers .vr .rp ha-icon { --mdc-icon-size: 18px; }
/* who voted in a poll */
.fk-faces { display: inline-flex; align-items: center; position: relative; margin-right: 6px; flex-shrink: 0; }
.fk-faces .ff { display: inline-flex; margin-left: -6px; cursor: pointer; }
.fk-faces .ff:first-child { margin-left: 0; }
.fk-faces .av { border: 1.5px solid var(--cm-fill); }
.fk-faces .fm { font-size: 11.5px; font-weight: 650; color: var(--cm-text2); margin-left: 3px; cursor: pointer; }
.fk-faces .ff.new { animation: cm-poll-pop 0.45s cubic-bezier(.2,.9,.3,1.4); }
@keyframes cm-poll-pop { from { transform: scale(0.2); opacity: 0; } 60% { transform: scale(1.18); opacity: 1; } }
/* AI in the Feed */
.fai-busy { display: flex; align-items: center; gap: 8px; }
.fai-busy ha-icon { --mdc-icon-size: 18px; color: var(--cm-accent); animation: fai-spin 1.6s linear infinite; display: inline-flex; }
@keyframes fai-spin { to { transform: rotate(360deg); } }
.fdc-smart { display: flex; align-items: stretch; gap: 6px; margin: 6px 16px 2px; }
.fdc-smart button[data-a="smart"] { flex: 1; display: flex; align-items: center; gap: 8px; text-align: left; padding: 9px 12px; border-radius: 14px; background: color-mix(in srgb, var(--cm-accent) 14%, transparent); color: var(--cm-text); font-size: 14px; }
.fdc-smart button ha-icon { --mdc-icon-size: 18px; color: var(--cm-accent); display: inline-flex; flex-shrink: 0; }
.fdc-smart .x { width: 38px; border-radius: 14px; background: var(--cm-fill); display: flex; align-items: center; justify-content: center; }
.fai-miss { display: flex; align-items: center; gap: 6px; padding: 6px; }
/* Make an Album */
.fai-alb { padding: 12px 14px; }
.fai-alb .fa-h { display: flex; align-items: flex-start; gap: 10px; }
.fai-alb .fa-h > ha-icon, .fai-alb .fa-h > svg { --mdc-icon-size: 24px; width: 24px; height: 24px; color: var(--cm-accent); display: inline-flex; flex-shrink: 0; margin-top: 2px; }
.fai-alb .fa-h > div { flex: 1; min-width: 0; }
.fai-alb .fa-h b { display: block; font-size: 15.5px; font-weight: 650; }
.fai-alb .fa-h span { display: block; font-size: 13.5px; color: var(--cm-text2); margin-top: 2px; line-height: 1.35; }
.fai-alb .x { width: 32px; height: 32px; margin: -4px -6px 0 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); flex-shrink: 0; }
.fai-alb .fa-cov { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin: 12px 0 10px; border-radius: 12px; overflow: hidden; }
.fai-alb .fa-cov div { aspect-ratio: 1; background: var(--cm-fill); }
.fai-alb .fa-cov img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fai-alb .fa-n { display: flex; flex-wrap: wrap; gap: 6px; }
.fai-alb .fa-n button { padding: 6px 12px; border-radius: 16px; background: var(--cm-fill); color: var(--cm-text); font-size: 13.5px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fai-alb .fa-n button.on { background: color-mix(in srgb, var(--cm-accent) 18%, transparent); color: var(--cm-accent); font-weight: 600; }
.fai-alb .fa-b { display: flex; gap: 8px; margin-top: 12px; }
.fai-alb .fa-b button { flex: 1; padding: 9px 12px; border-radius: 12px; background: var(--cm-fill); color: var(--cm-text); font-size: 14.5px; font-weight: 600; }
.fai-alb .fa-b button.go { background: var(--cm-accent); color: #fff; }
.fai-alb .fa-note { font-size: 12px; color: var(--cm-text2); margin-top: 8px; line-height: 1.35; }
.fai-miss > button[data-a="missed"] { flex: 1; display: flex; align-items: center; gap: 12px; text-align: left; padding: 8px 10px; font-size: 14px; color: var(--cm-text2); }
.fai-miss > button[data-a="missed"] b { color: var(--cm-text); font-size: 15.5px; }
.fai-miss ha-icon { --mdc-icon-size: 24px; color: var(--cm-accent); display: inline-flex; flex-shrink: 0; }
.fai-miss .x { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-text2); }
.fai-miss.done { display: block; padding: 12px 14px; }
.fai-miss .fm-h { display: flex; align-items: center; gap: 8px; font-weight: 650; font-size: 15px; }
.fai-miss .fm-h .x { margin-left: auto; }
.fai-miss .fm-h ha-icon { --mdc-icon-size: 20px; }
.fai-miss .fm-t { font-size: 15px; line-height: 1.4; margin: 6px 0 8px; }
.fm-p { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-top: .5px solid var(--cm-sep); cursor: pointer; font-size: 14px; }
.fm-p span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm-p ha-icon { --mdc-icon-size: 16px; color: var(--cm-text3); display: inline-flex; }
.fm-p .av { width: 26px !important; height: 26px !important; font-size: 11px !important; flex-shrink: 0; }
.fd-mem .mcap { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-accent); flex-shrink: 0; }
.fd-mem .mcap ha-icon { --mdc-icon-size: 18px; }
.fai-search { display: flex; align-items: center; gap: 8px; margin: 0 4px 10px; padding: 9px 12px; border-radius: 14px; background: var(--fd-card); }
.fai-search ha-icon { --mdc-icon-size: 18px; color: var(--cm-text2); display: inline-flex; }
.fai-search input { flex: 1; border: 0; background: none; color: var(--cm-text); font: inherit; font-size: 15px; outline: none; min-width: 0; }
.fai-chips { display: flex; gap: 6px; padding: 0 0 8px; overflow-x: auto; scrollbar-width: none; }
.fai-chips[hidden] { display: none; }
.fai-chips button { flex: 0 0 auto; padding: 7px 12px; border-radius: 16px; background: color-mix(in srgb, var(--cm-accent) 14%, transparent); color: var(--cm-text); font-size: 14px; }
.fai-catch { display: flex; align-items: center; gap: 8px; margin: 4px 14px 8px; padding: 8px 12px; border-radius: 14px; background: color-mix(in srgb, var(--cm-accent) 12%, transparent); color: var(--cm-accent); font-weight: 600; font-size: 14px; }
.fai-catch ha-icon, .fai-thread ha-icon, .fai-a ha-icon, .fdv-desc ha-icon, .fai-name ha-icon { --mdc-icon-size: 18px; display: inline-flex; flex-shrink: 0; color: var(--cm-accent); }
.fai-thread, .fai-a { display: flex; gap: 8px; margin: 4px 14px 8px; padding: 10px 12px; border-radius: 14px; background: var(--cm-fill); font-size: 14.5px; line-height: 1.4; }
.fai-a { margin: 10px 0 6px; }
.fdv-desc { position: absolute; left: 12px; right: 12px; bottom: 76px; z-index: 3; display: flex; gap: 8px; padding: 10px 12px; border-radius: 14px; background: rgba(20,20,22,.78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: #fff; font-size: 14.5px; line-height: 1.4; }
.fai-ask { display: flex; gap: 8px; align-items: flex-end; }
.fai-ask .pill { flex-shrink: 0; }
.fai-lbl { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--cm-text2); }
.fai-lbl svg, .fai-lbl ha-icon { width: 14px; height: 14px; --mdc-icon-size: 14px; color: var(--cm-accent); display: inline-flex; }
.fai-ask textarea { flex: 1; min-width: 0; resize: none; border: 0; border-radius: 14px; padding: 10px 12px; background: var(--cm-fill); color: var(--cm-text); font: inherit; font-size: 15px; outline: none; }
.fai-name { display: flex; align-items: center; gap: 6px; margin: 4px 2px 10px; color: var(--cm-accent); font-weight: 600; font-size: 14.5px; }
.fd-more { display: block; margin: 6px auto 16px; padding: 10px 18px; border-radius: 18px; background: var(--cm-fill); font-weight: 600; font-size: 14.5px; color: var(--cm-accent); }
.fd-loading { text-align: center; color: var(--cm-text2); padding: 30px; font-size: 14px; }
/* composer */
.fdc .scroll { padding: 70px 0 120px; }
.fdc-who { display: flex; align-items: center; gap: 10px; padding: 6px 16px 4px; }
.fdc-who .nm { font-weight: 650; font-size: 16px; }
.fdc-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.fdc-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; background: var(--cm-fill); font-size: 13px; font-weight: 600; color: var(--cm-text); }
.fdc-chip svg { width: 14px; height: 14px; }
.fdc-chip.acc { background: color-mix(in srgb, var(--cm-accent) 18%, transparent); color: var(--cm-accent); }
.fdc-kinds { display: flex; gap: 6px; padding: 10px 16px 2px; overflow-x: auto; scrollbar-width: none; }
.fdc-kinds::-webkit-scrollbar { display: none; }
.fdc-kinds button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 16px; background: var(--cm-fill); font-size: 14px; font-weight: 600; }
.fdc-kinds button svg { width: 16px; height: 16px; }
.fdc-kinds button.on { background: var(--cm-accent); color: #fff; }
.fdc-text { width: 100%; min-height: 110px; border: none; outline: none; resize: none; color: var(--cm-text); font-size: 19px; line-height: 1.4; padding: 12px 16px; font-family: inherit; }
.fdc-text:not(.bgd) { background: none; }
.fdc-text.bgd { min-height: 220px; margin: 0; text-align: center; font-size: 24px; font-weight: 700; color: #fff; padding: 40px 22px; display: block; }
.fdc-text.bgd::placeholder { color: rgba(255,255,255,0.75); }
.fdc-line { padding: 0 16px 8px; font-size: 14.5px; color: var(--cm-text2); }
.fdc-line b { color: var(--cm-text); }
.fdc-line button { color: var(--cm-accent); font-weight: 600; margin-left: 6px; }
.fdc-bgs { display: flex; gap: 8px; padding: 6px 16px 10px; overflow-x: auto; scrollbar-width: none; }
.fdc-bgs::-webkit-scrollbar { display: none; }
.fdc-bgs button { width: 34px; height: 34px; flex: 0 0 auto; border-radius: 10px; border: 2px solid transparent; }
.fdc-bgs button.on { border-color: var(--cm-text); }
.fdc-bgs button.none { background: var(--cm-fill); display: flex; align-items: center; justify-content: center; color: var(--cm-text2); }
.fdc-bgs button.none svg { width: 16px; height: 16px; }
.fdc-media { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 4px 16px 10px; }
.fdc-media .th { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--cm-fill); }
.fdc-media .th img { width: 100%; height: 100%; object-fit: cover; }
.fdc-media .th .x { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; }
.fdc-media .th .x svg { width: 12px; height: 12px; }
.fdc-media .th .tg { position: absolute; left: 4px; bottom: 4px; display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 11px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11.5px; font-weight: 600; }
.fdc-media .th .tg svg { width: 12px; height: 12px; }
.fdc-media .th .pr { position: absolute; left: 0; bottom: 0; height: 4px; background: var(--cm-accent); }
.fdc-media .th .vp { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; pointer-events: none; }
.fdc-media .th .vp svg { width: 26px; height: 26px; filter: drop-shadow(0 1px 3px rgba(0,0,0,.6)); }
.fdc-sec { margin: 4px 16px 12px; }
.fdc-tools { position: absolute; left: 0; right: 0; bottom: 0; z-index: 6; display: flex; justify-content: space-around; padding: 10px 8px 16px; background: var(--cm-glass-strong); border-top: 0.5px solid var(--cm-sep); }
.fdc-tools button { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cm-accent); }
.fdc-tools button svg { width: 24px; height: 24px; }
.fdc-tools button.on { background: color-mix(in srgb, var(--cm-accent) 18%, transparent); }
/* sheets */
.fd-feel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.fd-feel button { padding: 10px 4px; border-radius: 14px; background: var(--cm-fill); font-size: 13.5px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.fd-feel button .fe { font-size: 26px; }
.fd-feel button.on { background: var(--cm-accent); color: #fff; }
.fd-ppl .pick-row .pn { font-size: 16px; }
/* the photo viewer, the tag editor and stories */
.fdv { position: absolute; inset: 0; z-index: 42; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; touch-action: pan-y; }
.fdv .stage { position: relative; max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; }
.fdv img, .fdv video { max-width: 100%; max-height: calc(var(--cm-height, 700px) - 20px); object-fit: contain; display: block; }
.fdv .top { color: #fff; }
.fdv .top .g { color: #fff; }
.fdv .nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; color: #fff; z-index: 3; }
.fdv .nav.l { left: 10px; } .fdv .nav.r { right: 10px; }
.fdv .nav svg { width: 22px; height: 22px; }
.fdv .vbar { position: absolute; left: 12px; right: 12px; bottom: 14px; display: flex; gap: 8px; justify-content: center; z-index: 3; }
.fdv .vbar button { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 20px; background: rgba(255,255,255,0.16); color: #fff; font-weight: 600; font-size: 14px; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.fdv .vbar button svg { width: 17px; height: 17px; }
.fdv .count { font-size: 13px; opacity: .75; }
.fdv .tdot { position: absolute; transform: translate(-50%, -50%); padding: 4px 10px; border-radius: 12px; background: rgba(0,0,0,0.7); color: #fff; font-size: 13px; font-weight: 600; white-space: nowrap; pointer-events: auto; }
.fdv .tdot::before { content: ''; position: absolute; top: -5px; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top: 0; border-bottom-color: rgba(0,0,0,0.7); }
.fdv .hint { position: absolute; top: 72px; left: 50%; transform: translateX(-50%); padding: 6px 12px; border-radius: 14px; background: rgba(255,255,255,0.16); font-size: 13.5px; z-index: 3; white-space: nowrap; }
.fds { position: absolute; inset: 0; z-index: 43; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; }
.fds .bars { position: absolute; top: 12px; left: 10px; right: 10px; display: flex; gap: 4px; z-index: 3; }
.fds .bars i { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.35); overflow: hidden; }
.fds .bars i b { display: block; height: 100%; width: 0; background: #fff; }
.fds .shd { position: absolute; top: 24px; left: 12px; right: 12px; display: flex; align-items: center; gap: 8px; z-index: 3; font-weight: 650; font-size: 14.5px; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
.fds .shd .t { font-weight: 500; opacity: .8; font-size: 13px; }
.fds .shd .sp { flex: 1; }
.fds .shd button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; }
.fds .shd button svg { width: 22px; height: 22px; }
.fds .sbody { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.fds .sbody img, .fds .sbody video { max-width: 100%; max-height: 100%; object-fit: contain; }
.fds .stext { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px; font-size: 28px; font-weight: 750; line-height: 1.25; white-space: pre-wrap; word-break: break-word; }
.fds .sover { position: absolute; left: 0; right: 0; bottom: 80px; text-align: center; padding: 0 24px; font-size: 20px; font-weight: 700; text-shadow: 0 1px 6px rgba(0,0,0,.6); white-space: pre-wrap; }
.fds .sfoot { position: absolute; left: 10px; right: 10px; bottom: 14px; display: flex; gap: 8px; align-items: center; z-index: 3; }
.fds .sfoot input { flex: 1; min-width: 0; border: 1.5px solid rgba(255,255,255,0.6); background: rgba(0,0,0,0.3); color: #fff; border-radius: 22px; padding: 10px 14px; font-size: 15px; outline: none; }
.fds .sfoot input::placeholder { color: rgba(255,255,255,0.7); }
.fds .sfoot button { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 20px; background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; font-size: 14px; }
.fds .sfoot button svg { width: 17px; height: 17px; }
.fds .tap { position: absolute; top: 70px; bottom: 70px; width: 35%; z-index: 2; }
.fds .tap.l { left: 0; } .fds .tap.r { right: 0; }
/* the wall tablet slideshow */
.fd-slide { position: absolute; inset: 0; background: #000; overflow: hidden; }
.fd-slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1.2s ease; }
.fd-slide img.fit { object-fit: contain; }
.fd-slide img.on { opacity: 1; }
.fd-slide .cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 50px 22px 20px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: #fff; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; transition: opacity .6s; }
.fd-slide .cap .t { font-weight: 500; opacity: .8; font-size: 14px; }
.fd-slide .paused { position: absolute; top: 16px; right: 16px; padding: 6px 12px; border-radius: 14px; background: rgba(0,0,0,0.5); color: #fff; font-size: 13px; font-weight: 600; }
.fd-slide .empty { color: rgba(255,255,255,0.8); position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; }
.fd-slide .empty b { color: #fff; }
/* old-school skins: square corners and flat buttons, like the chats */
:host([data-retro]) .fp, :host([data-retro]) .fd-card, :host([data-retro]) .fk, :host([data-retro]) .fc-bub, :host([data-retro]) .fd-grid, :host([data-retro]) .fd-al .ac, :host([data-retro]) .fp-link, :host([data-retro]) .fk-ban { border-radius: 2px; }
:host([data-retro]) .fp, :host([data-retro]) .fd-card { border: 1px solid var(--cm-sep); }
:host([data-retro]) .fd-seg button, :host([data-retro]) .fdc-kinds button, :host([data-retro]) .fk-rsvp button, :host([data-retro]) .fk-btns button, :host([data-retro]) .fd-hero .hb button { border-radius: 3px; }
:host([data-retro]) .fd-st .ring { border-radius: 4px; }
:host([data-retro]) .fd-st .ring > .in, :host([data-retro]) .fd-st .ring .av { border-radius: 3px; }
:host([data-log]) .fp { border-radius: 0; border-left: 3px solid var(--cm-accent); }
/* Home Assistant icons (mdi), sized like the drawn ones */
.fd-quick button ha-icon { --mdc-icon-size: 19px; display: inline-flex; color: var(--cm-accent); }
.fd-new ha-icon { --mdc-icon-size: 15px; display: inline-flex; transform: rotate(90deg); }
.fd-st .add .plus ha-icon { --mdc-icon-size: 13px; display: inline-flex; }
.fp-label ha-icon { --mdc-icon-size: 15px; display: inline-flex; }
.fp-sub ha-icon { --mdc-icon-size: 13px; display: inline-flex; }
.fp-more ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fp-media .mi .vplay ha-icon { --mdc-icon-size: 26px; display: inline-flex; margin-left: 3px; }
.fp-media .mi .tg ha-icon { --mdc-icon-size: 15px; display: inline-flex; }
.fp-media .mi.missing ha-icon { --mdc-icon-size: 34px; display: inline-flex; }
.fp-acts button ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fd-cbar .rep button ha-icon { --mdc-icon-size: 16px; display: inline-flex; }
.fd-cbar .cbtn ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fd-cbar .go ha-icon { --mdc-icon-size: 18px; display: inline-flex; }
.fd-cbar .att .th button ha-icon { --mdc-icon-size: 11px; display: inline-flex; }
.fk-opt .on ha-icon { --mdc-icon-size: 13px; display: inline-flex; }
.fd-mem .mh ha-icon { --mdc-icon-size: 18px; display: inline-flex; color: var(--cm-accent); }
.fd-grid .gi .vplay ha-icon { --mdc-icon-size: 18px; display: inline-flex; }
.fd-al .ac ha-icon { --mdc-icon-size: 40px; display: inline-flex; }
.fd-al .as ha-icon { --mdc-icon-size: 13px; display: inline-flex; }
.fd-hero .cvbtn ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
.fd-hero .hav .avbtn ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
.fd-hero .rp-hint ha-icon { --mdc-icon-size: 16px; display: inline-flex; }
.fd-hero .hb button ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
.fd-hero .gicon > div ha-icon { --mdc-icon-size: 44px; display: inline-flex; }
.fd-row .ri ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fw-i ha-icon { --mdc-icon-size: 18px; display: inline-flex; }
.fw-mini .mi-i ha-icon { --mdc-icon-size: 20px; display: inline-flex; }
.fw-mini .rch ha-icon { --mdc-icon-size: 14px; display: inline-flex; }
.fd-nav ha-icon { --mdc-icon-size: 27px; display: inline-flex; }
.fd-nav .fn-mm ha-icon { --mdc-icon-size: 11px; display: inline-flex; }
.fn-k ha-icon { --mdc-icon-size: 14px; display: inline-flex; }
.fm-i ha-icon { --mdc-icon-size: 26px; display: inline-flex; }
.fsel-bar ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fh-card ha-icon.fh-chart { display: inline-flex; display: block; width: 100%; margin-top: 8px; overflow: visible; }
.ffmsg ha-icon { --mdc-icon-size: 19px; display: inline-flex; }
.fdc-chip ha-icon { --mdc-icon-size: 14px; display: inline-flex; }
.fdc-kinds button ha-icon { --mdc-icon-size: 16px; display: inline-flex; }
.fdc-bgs button.none ha-icon { --mdc-icon-size: 16px; display: inline-flex; }
.fdc-media .th .x ha-icon { --mdc-icon-size: 12px; display: inline-flex; }
.fdc-media .th .tg ha-icon { --mdc-icon-size: 12px; display: inline-flex; }
.fdc-media .th .vp ha-icon { --mdc-icon-size: 26px; display: inline-flex; filter: drop-shadow(0 1px 3px rgba(0,0,0,.6)); }
.fdc-tools button ha-icon { --mdc-icon-size: 24px; display: inline-flex; }
.fdv .nav ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fdv .vbar button ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
.fds .shd button ha-icon { --mdc-icon-size: 22px; display: inline-flex; }
.fds .sfoot button ha-icon { --mdc-icon-size: 17px; display: inline-flex; }
.sgroup .gr .gck { margin-left: auto; color: var(--cm-accent); display: flex; }
.sgroup .gr .gck svg { width: 18px; height: 18px; }
.fd-row .rch, .gr .gch { display: flex; align-items: center; }
.fd-row .rch ha-icon, .gr .gch ha-icon { --mdc-icon-size: 18px; }
.fdc-chip ha-icon, .fp-sub ha-icon { --mdc-icon-size: 14px; display: inline-flex; }
.fp-who ha-icon { --mdc-icon-size: 14px; }
.fd-st .add .plus ha-icon { --mdc-icon-size: 15px; }
`;

// ── Little helpers ───────────────────────────────────────────────────────────
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
// 7, 950, 1.1K, 12K, 1.2M
const fdCount = (n) => n < 1000 ? String(n) : n < 10000 ? `${(Math.floor(n / 100) / 10).toString()}K` : n < 1e6 ? `${Math.floor(n / 1000)}K` : `${(Math.floor(n / 1e5) / 10).toString()}M`;
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const draftKey = (me) => `crowFeedDraft:${me || ''}`;

Object.assign(Card.prototype, {

  // ── Setup and live updates ──────────────────────────────────────────────────
  _feedSetup() {
    if (!this.shadowRoot.querySelector('style[data-feed]')) {
      const st = document.createElement('style');
      st.dataset.feed = '1';
      st.textContent = FEED_CSS;
      this.shadowRoot.appendChild(st);
    }
    if (!this._fd) this._fd = { posts: new Map(), stories: [], pinned: [], memories: [], newer: 0 };
    if (this._fcsort === undefined) { try { this._fcsort = localStorage.getItem('crow_fcsort') || 'all'; } catch (e) { this._fcsort = 'all'; } }
    // press and hold Like for the other reactions, on any page
    this._fwireReactHold(this._root);
    // press and hold a photo or video in any grid for its menu
    this._fwireMediaHold(this._root);
  },

  _feedEvent(ev) {
    this._feedSetup();
    const fd = this._fd;
    if (ev.type === 'feed') {
      const had = fd.posts.has(ev.post.id);
      fd.posts.set(ev.post.id, ev.post);
      fd.pinned = fd.pinned.filter(p => p.id !== ev.post.id);
      if (ev.post.pinned) fd.pinned.unshift(ev.post);
      if (!had) fd.newer = (fd.newer || 0) + (ev.post.author === this._s.me ? 0 : 1);
      this._refresh('fpost', ev.post.id);
      if (!had) this._refresh('fnew', ev.post.id);
    } else if (ev.type === 'feed_removed') {
      fd.posts.delete(ev.post_id);
      fd.pinned = fd.pinned.filter(p => p.id !== ev.post_id);
      this._refresh('fgone', ev.post_id);
    } else if (ev.type === 'story') {
      fd.stories = fd.stories.filter(x => x.id !== ev.story.id).concat([ev.story]).sort((a, b) => a.ts - b.ts);
      this._refresh('fstories');
    } else if (ev.type === 'story_removed') {
      fd.stories = fd.stories.filter(x => x.id !== ev.story_id);
      this._refresh('fstories');
    } else if (ev.type === 'feed_groups' || ev.type === 'feed_albums' || ev.type === 'feed_milestones') {
      this._refresh('fmeta');
    }
  },

  // a video plays from a short-lived streaming link, so it starts straight away instead of
  // downloading the whole file first; a video without a still shows its first frame the same way
  _fstream(aid) {
    this._fstreams = this._fstreams || new Map();
    const got = this._fstreams.get(aid);
    if (got && Date.now() - got.at < 4 * 3600000) return got.p;
    const p = this._ws('media_url', { attachment_id: aid }).then(r => (this._hass?.hassUrl ? this._hass.hassUrl(r.url) : r.url));
    p.catch(() => this._fstreams.delete(aid));
    this._fstreams.set(aid, { at: Date.now(), p });
    return p;
  },

  _fhy(scope) {
    this._hydrate(scope);
    scope.querySelectorAll('video[data-stream]:not([src]):not([data-auto])').forEach(v => {
      this._fstream(v.dataset.stream).then(u => { v.src = `${u}#t=0.1`; }).catch(() => { v.closest('.mi, .gi')?.classList.add('missing'); });
    });
    // autoplay: play while mostly on screen, pause when scrolled away (fetched only when first seen)
    const autos = scope.querySelectorAll('video[data-auto]');
    if (autos.length) {
      this._fio = this._fio || new IntersectionObserver((entries) => entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          const go = () => v.play().then(() => v.closest('.mi')?.classList.add('playing')).catch(() => {});
          if (!v.src) this._fstream(v.dataset.stream).then(u => { v.src = u; go(); }).catch(() => {}); else go();
        } else if (!v.paused) v.pause();
      }), { threshold: [0, 0.6] });
      autos.forEach(v => this._fio.observe(v));
    }
  },

  _fpost(pid) { return this._fd?.posts.get(pid); },
  // the household's Feed settings (editor → Household → Feed)
  _fopt() {
    const o = this._s.feed?.options || {};
    return { page_posts: o.page_posts !== false, default_audience: o.default_audience || 'everyone', stories: o.stories !== false,
      birthdays: o.birthdays !== false, review: o.review !== false, kinds: { poll: true, event: true, fund: true, grabs: true, ...(o.kinds || {}) } };
  },
  // AI in the Feed (switched on by an administrator, feature by feature)
  _faiOn(k) { return !!this._s.ai?.[`feed_${k}`]; },
  async _fai(action, payload = {}) { const r = await this._ws('feed_ai', { action, ...payload }); return r.result; },
  // the gentle check before posting: true to go ahead (it never blocks if the AI is slow or fails)
  async _fkindOk(text) {
    if (!this._faiOn('kindness') || (text || '').trim().length < 8) return true;
    let k = null;
    try { k = await Promise.race([this._fai('kindness', { text }), new Promise(r => setTimeout(() => r(null), 6000))]); } catch (e) { k = null; }
    if (!k?.unkind) return true;
    const r = await this._alert({ title: 'Post This?', message: `${k.why ? k.why + ' ' : ''}It might come across as harsh.`, buttons: [{ text: 'Edit', style: 'cancel' }, { text: 'Post Anyway', value: true }] });
    return !!r.value;
  },
  _fwritingItems(prefix = 'w') {
    return [['proofread', 'Proofread'], ['friendly', 'Make Friendlier'], ['shorter', 'Make Shorter'], ['formal', 'More Formal'], ['casual', 'More Casual']].map(([v, t]) => ({ text: t, value: `${prefix}:${v}` }));
  },
  async _fbusy(label, work) {
    const t = this._el(`<div class="toast g fai-busy">${FI.ai}<span>${esc(label)}</span></div>`);
    this._root.querySelector('.toast')?.remove();
    this._root.appendChild(t);
    try { return await work(); } catch (err) { this._toast(err.message || 'The AI couldn’t do that just now'); return null; } finally { t.remove(); }
  },
  _fkindOn(k) { return k === 'post' || this._fopt().kinds[k] !== false; },
  // the household's switches for the Facebook extras (Household → Feed)
  _fon(k) { return this._s.feed?.options?.[k] !== false; },
  _fstoriesOn() { return this._fopt().stories && this._config.show_stories !== false; },
  _fdefaultAudience() { return { type: this._fopt().default_audience === 'me' ? 'me' : 'everyone' }; },
  _fkeep(list) { (list || []).forEach(p => this._fd.posts.set(p.id, p)); return list || []; },

  // ── Words ─────────────────────────────────────────────────────────────────
  _fname(uid, short = false) { return uid === HA_ID ? 'Home Assistant' : this._userName(uid, short); },

  _fwhen(ts) {
    const d = Date.now() - ts;
    if (d < 0) return `${fmtListDate(ts, this._hass)} at ${fmtTime(ts, this._hass)}`;
    if (d < 60000) return 'Just now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
    if (d < 7 * 86400000) return `${Math.floor(d / 86400000)}d`;
    return fmtListDate(ts, this._hass);
  },

  _fago(ts) {
    const years = new Date().getFullYear() - new Date(ts).getFullYear();
    return years === 1 ? '1 year ago' : `${years} years ago`;
  },

  _faudIcon(a) { return FI[a?.type] || FI.everyone; },
  _faudText(a, full = false) {
    if (!a) return 'Everyone at home';
    if (a.type === 'everyone') return 'Everyone at home';
    if (a.type === 'me') return 'Only me';
    if (a.type === 'group') return (this._s.feed?.groups || []).find(g => g.id === a.group)?.name || 'Group';
    if (a.type === 'people') {
      if (!full || !a.people) return 'Chosen people';
      const n = a.people.map(u => this._fname(u, true));
      return n.length <= 3 ? n.join(', ') : `${n.slice(0, 2).join(', ')} & ${n.length - 2} more`;
    }
    return 'Everyone at home';
  },

  // the post's words: links, @mentions and line breaks
  _ftext(text, mentions = []) {
    let html = esc(text || '');
    html = html.replace(URL_RE, (u) => { const clean = u.replace(/[).,!?;:]+$/, ''); return `<span class="lnk" data-url="${clean}">${clean}</span>${u.slice(clean.length)}`; });
    const names = [...new Set(mentions)].map(uid => [uid, esc(this._fname(uid))]).sort((a, b) => b[1].length - a[1].length);
    for (const [uid, n] of names) html = html.split(`@${n}`).join(`<span class="mn" data-prof="${esc(uid)}">@${n}</span>`);
    return html;
  },

  _fsummary(p) {
    if (p.text) return p.text;
    if (p.kind === 'event') return `📅 ${p.event?.title || 'Event'}`;
    if (p.kind === 'fund') return `💰 ${p.fund?.title || 'Chip In'}`;
    if (p.kind === 'list') return '📝 A list';
    if (p.shared_post) return 'Shared a post';
    if (p.home) return `🏠 ${p.home.name || 'From home'}`;
    if (p.media?.length) return p.media.length === 1 ? ((p.media[0].mime || '').startsWith('video/') ? 'A video' : 'A photo') : `${p.media.length} photos and videos`;
    return 'A post';
  },

  // ── A post ────────────────────────────────────────────────────────────────
  _fpostHtml(p, { full = false, pinnedLabel = false } = {}) {
    const me = this._s.me;
    const name = this._fname(p.author);
    const bits = [];
    // a post on someone's page: "person1 ▸ person2"
    if (p.page && p.page !== p.author) bits.push(` <span style="opacity:.6">▸</span> <b data-prof="${esc(p.page)}">${esc(this._fname(p.page))}</b>`);
    if (p.feeling?.text) bits.push(` is ${p.feeling.activity ? '' : 'feeling '}${esc(p.feeling.emoji || '')} <b>${esc(p.feeling.text)}</b>`);
    if (p.place?.name) bits.push(` at <b>${esc(p.place.name)}</b>`);
    if (p.audience?.type === 'group') bits.push(` <span style="opacity:.6">▸</span> <b data-fgo="group" data-id="${esc(p.audience.group)}">${esc(this._faudText(p.audience))}</b>`);
    if (p.album) {
      const al = (this._s.feed?.albums || []).find(a => a.id === p.album);
      if (al) bits.push(` added to <b data-fgo="album" data-id="${esc(al.id)}">${esc(al.name)}</b>`);
    }
    if (p.kind === 'grabs') bits.push(' is giving something away');
    if (p.kind === 'fund') bits.push(' started a Chip In');
    if (p.kind === 'event') bits.push(' created an event');
    if (p.kind === 'poll') bits.push(' asked');
    if (p.kind === 'recs') bits.push(' is asking for recommendations');
    if (p.kind === 'list') bits.push(' made a list');
    if (p.shared_post && !p.shared_post.unavailable) bits.push(` shared <b data-prof="${esc(p.shared_post.author)}">${esc(p.shared_post.author === p.author ? 'their own' : this._fname(p.shared_post.author, true) + '’s')}</b> post`);
    if (p.home) bits.push(' shared from home');
    const sub = [];
    if (p.scheduled_at) sub.push(`<span class="sch">${FI.clock} Scheduled for ${esc(fmtListDate(p.scheduled_at, this._hass))} at ${esc(fmtTime(p.scheduled_at, this._hass))}</span>`);
    else sub.push(esc(this._fwhen(p.ts)));
    sub.push(`<span title="${esc(this._faudText(p.audience, true))}">${this._faudIcon(p.audience)}</span>`);
    if (p.edited) sub.push('· Edited');
    const label = p.archived ? `<div class="fp-label">${FI.archive}Archived · only you can see this</div>` : pinnedLabel || p.pinned ? `<div class="fp-label">${FI.pinned}Pinned</div>` : '';
    const auto = ['birthday', 'milestone', 'review', 'badges'].includes(p.kind);
    let body = '';
    // with a preview showing, a link at the end of the words isn't repeated (like Facebook)
    let words = p.text || '';
    if (p.link?.url && !p.media?.length) {
      const t = words.trimEnd();
      if (t.endsWith(p.link.url)) words = t.slice(0, -p.link.url.length).trimEnd();
    }
    if (p.bg && p.text) body = `<div class="fp-bg bg-${esc(p.bg)}">${this._ftext(p.text, p.mentions)}</div>`;
    else if (words && !auto && p.kind !== 'list') {
      const long = !full && words.length > 420;
      const big = !p.media?.length && !p.link && p.kind === 'post' && words.length < 90 && !/\n/.test(words);
      body = `<div class="fp-text${long ? ' more' : ''}${big ? ' big' : ''}">${this._ftext(words, p.mentions)}</div>${long ? '<div class="fp-seemore" data-fa="open">See more</div>' : ''}`;
    }
    body += this._fkindHtml(p, full);
    body += this._fmediaHtml(p);
    if (p.home) body += this._fhomeHtml(p.home);
    if (p.shared_post) body += this._fsharedHtml(p.shared_post);
    if (p.link && !p.media?.length) body += this._flinkHtml(p.link);
    body += this._lsafeHtml(p.link_safety);
    return `<article class="fp${full ? ' fp-full' : ''}" data-pid="${esc(p.id)}">${label}
      <div class="fp-h"><span data-prof="${esc(p.author)}">${this._userAv(p.author, 42)}</span>
        <div class="fp-who"><b data-prof="${esc(p.author)}">${esc(name)}</b><span class="fp-x">${bits.join('')}</span><div class="fp-sub">${sub.join(' ')}</div></div>
        <button class="fp-more" data-fa="more" aria-label="More">${FI.more}</button></div>
      ${body}
      ${this._factsHtml(p)}
      ${this._fcommentsHtml(p, full)}
    </article>`;
  },

  // a link's preview, the way Facebook shows it: the picture across the post, then the site, title and description
  _flinkHtml(l, { remove = false } = {}) {
    let host = '';
    try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (e) { /* */ }
    const site = l.site && l.site.toLowerCase() !== host ? `${host} · ${l.site}` : (host || l.site || '');
    const x = remove ? `<button class="lx" data-a="unlink" aria-label="Remove preview">${FI.x}</button>` : '';
    return `<div class="fp-link${l.image ? '' : ' small'}" data-url="${esc(l.url)}">${l.image ? `<div class="li"><img src="${esc(l.image)}" alt="" data-no-missing>${x}</div>` : ''}
      <div class="lb"><div class="ls">${esc(site)}</div><div class="lt">${esc(l.title || l.url)}</div>${l.desc ? `<div class="ld">${esc(l.desc)}</div>` : ''}</div>${l.image ? '' : x}</div>`;
  },

  _fstatsHtml(p) {
    const rx = Object.values(p.reactions || {});
    const counts = {};
    rx.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => RE[k]?.e || '👍');
    const mine = p.reactions?.[this._s.me];
    let who = '';
    if (rx.length) {
      const others = Object.keys(p.reactions).filter(u => u !== this._s.me);
      who = mine ? (others.length ? `You and ${plural(others.length, 'other')}` : 'You') : (others.length === 1 ? this._fname(others[0], true) : `${rx.length}`);
    }
    const nc = (p.comments || []).length, ns = p.shares || 0;
    if (!rx.length && !nc && !ns) return '';
    return `<div class="fp-stats">${rx.length ? `<span class="rx" data-fa="who"><span class="em">${top.map(e => `<span>${e}</span>`).join('')}</span>${esc(who)}</span>` : '<span></span>'}
      <span>${nc ? `<span class="cc" data-fa="open">${plural(nc, 'comment')}</span>` : ''}${nc && ns ? ' · ' : ''}${ns ? `<span class="cc">${plural(ns, 'share')}</span>` : ''}</span></div>`;
  },

  // Under a post, in one row: Like, Comment, Share (each with how many) and Save on the left, the
  // reactions on the right (tap them, or the Like count, to see who reacted). Press and hold Like for
  // the other reactions.
  _factsHtml(p) {
    const me = this._s.me, mine = p.reactions?.[me];
    const r = mine ? RE[mine] : null;
    const rx = Object.values(p.reactions || {});
    const counts = {};
    rx.forEach(k => { counts[k] = (counts[k] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => RE[k]?.e || '👍');
    const nc = (p.comments || []).length, ns = p.shares || 0;
    const n = (v) => v ? `<span class="fa-n">${fdCount(v)}</span>` : '';
    const likeIcon = !mine ? FI.like : mine === 'like' ? FI.likeFill : `<span class="re">${r?.e || '👍'}</span>`;
    const likeLabel = mine ? (r?.n || 'Like') : 'Like';
    const canShare = this._fon('shares') && !p.archived && !p.scheduled_at;
    return `<div class="fp-acts">
      <button data-fa="react" class="${mine ? 'on' : ''}" aria-label="${esc(likeLabel)}" title="${esc(likeLabel)}">${likeIcon}</button>${rx.length ? `<button class="fa-cnt" data-fa="who" aria-label="Who reacted">${fdCount(rx.length)}</button>` : ''}
      ${p.can_comment === false ? '' : `<button data-fa="comment" aria-label="Comment" title="Comment">${FI.comment}${n(nc)}</button>`}
      ${canShare ? `<button data-fa="share" aria-label="Share" title="Share">${FI.shareFb}${n(ns)}</button>` : `<button data-fa="send" aria-label="Send" title="Send">${FI.send}</button>`}
      <button data-fa="save" class="${p.saved ? 'on' : ''}" aria-label="${p.saved ? 'Saved' : 'Save'}" title="${p.saved ? 'Saved' : 'Save'}" aria-pressed="${p.saved ? 'true' : 'false'}">${p.saved ? FI.bookmarkFill : FI.bookmark}</button>
      <span class="fa-sp"></span>
      ${rx.length ? `<button class="fa-rx" data-fa="who" aria-label="Who reacted">${top.map(e => `<span>${e}</span>`).join('')}</button>` : ''}
    </div>`;
  },

  _fmediaHtml(p) {
    const media = (p.media || []).filter(m => (m.mime || '').startsWith('image/') || (m.mime || '').startsWith('video/') || m.removed);
    const refs = p.kind === 'review' ? (p.refs || []) : [];
    const list = media.length ? media : refs;
    if (!list.length) return '';
    const n = list.length;
    const show = list.slice(0, 4);
    const cls = n === 1 ? 'n1' : n === 2 ? 'n2' : n === 3 ? 'n3' : 'n4';
    return `<div class="fp-media ${cls}">${show.map((m, i) => {
      if (m.removed || this._missing.has(m.id)) return `<div class="mi missing">${K.MISSING_Q}</div>`;
      const video = (m.mime || '').startsWith('video/');
      const thumb = m.has_thumb ? 1 : 0;
      const tagged = (p.tags?.[m.id] || []).length;
      const known = this._blobReady.get(`${m.id}:${thumb}`) || '';
      const auto = video && this._config.feed_autoplay === true;
      const pic = auto ? `${m.has_thumb ? `<img data-att="${esc(m.id)}" data-thumb="1" alt="" draggable="false">` : ''}<video data-stream="${esc(m.id)}" data-auto="1" muted playsinline loop preload="none"></video>`
        : video && !m.has_thumb ? `<video data-stream="${esc(m.id)}" muted playsinline preload="metadata"></video>`
        : `<img data-att="${esc(m.id)}" data-thumb="${thumb}"${known ? ` src="${esc(known)}"` : ''} alt="" draggable="false">`;
      return `<div class="mi" data-fview="${esc(m.id)}" data-i="${i}">${pic}
        ${video ? `<div class="vplay"><span>${FI.play}</span></div>${m.duration ? `<span class="vdur">${fmtDur(m.duration)}</span>` : ''}` : ''}
        ${tagged ? `<span class="tg">${FI.tag}</span>` : ''}
        ${i === 3 && n > 4 ? `<div class="more">+${n - 4}</div>` : ''}</div>`;
    }).join('')}</div>`;
  },

  _fcommentsHtml(p, full) {
    const all = p.comments || [];
    if (!full) {
      if (!all.length) return '';
      const top = all.filter(c => !c.reply_to);
      const last = top.slice(-2);
      return `<div class="fp-cprev">${all.length > last.length ? `<div class="fp-allc" data-fa="open">View all ${plural(all.length, 'comment')}</div>` : ''}${last.map(c => this._fcommentHtml(p, c, false)).join('')}</div>`;
    }
    let top = all.filter(c => !c.reply_to);
    // Most Relevant (reactions and replies first), Newest, or All Comments (oldest first)
    const sort = this._fcsort || 'all';
    if (sort === 'newest') top = [...top].reverse();
    else if (sort === 'relevant') {
      const score = (c) => Object.keys(c.reactions || {}).length * 2 + all.filter(r => r.reply_to === c.id).length * 3;
      top = [...top].sort((a, b) => score(b) - score(a) || b.ts - a.ts);
    }
    const sorter = top.length > 1 ? `<div class="fc-sort"><button data-csort="1">${FI.sort}${{ relevant: 'Most Relevant', newest: 'Newest', all: 'All Comments' }[sort]} ▾</button></div>` : '';
    return `${sorter}<div class="fp-cprev">${top.map(c => this._fcommentHtml(p, c, true) + all.filter(r => r.reply_to === c.id).map(r => this._fcommentHtml(p, r, true, true)).join('')).join('') || '<div class="fd-loading" style="padding:16px">No comments yet. Be the first.</div>'}</div>`;
  },

  _fcommentHtml(p, c, full, reply = false) {
    const rx = Object.values(c.reactions || {});
    const mine = c.reactions?.[this._s.me];
    const top = [...new Set(rx)].slice(0, 2).map(k => RE[k]?.e || '👍').join('');
    let extra = '';
    if (c.sticker?.emoji) extra += `<div class="fc-stk">${esc(c.sticker.emoji)}</div>`;
    else if (c.sticker?.image) { const src = this._stickerSrc(c.sticker.image); extra += `<div class="fc-stk">${src ? `<img src="${esc(src)}" alt="Sticker" data-no-missing>` : ''}</div>`; }
    (c.media || []).forEach(aid => { extra += `<div class="fc-pic" data-fview="${esc(aid)}" data-comment="${esc(c.id)}"><img data-att="${esc(aid)}" data-thumb="1" alt=""></div>`; });
    if (c.contact) extra += this._fcontactHtml(c.contact, c.id);
    const bubble = c.text ? `<div class="fc-bub"><b data-prof="${esc(c.author)}">${esc(this._fname(c.author))}</b><div class="ft">${this._ftext(c.text, c.mentions)}</div>${rx.length ? `<span class="crx">${top}${rx.length > 1 ? ` ${rx.length}` : ''}</span>` : ''}</div>`
      : `<div class="fc-bub" style="background:none;padding:0 4px"><b data-prof="${esc(c.author)}">${esc(this._fname(c.author))}</b></div>`;
    const canEdit = c.author === this._s.me;
    const canDel = canEdit || p.author === this._s.me || this._s.isAdmin;
    return `<div class="fc${reply ? ' reply' : ''}" data-cid="${esc(c.id)}"><span data-prof="${esc(c.author)}">${this._userAv(c.author, reply ? 28 : 34)}</span>
      <div class="fc-main">${bubble}${extra}
        <div class="fc-meta"><span>${esc(this._fwhen(c.ts))}${c.edited ? ' · Edited' : ''}</span>
          <button data-ca="react" class="${mine ? 'on' : ''}">${mine ? esc(RE[mine]?.n || 'Like') : 'Like'}</button>
          ${p.can_comment === false ? '' : `<button data-ca="reply">Reply</button>`}
          ${canEdit || canDel ? `<button data-ca="more">•••</button>` : ''}</div></div></div>`;
  },

  // ── Post types ────────────────────────────────────────────────────────────
  _fkindHtml(p, full) {
    const me = this._s.me;
    if (p.kind === 'poll' && p.poll) {
      const votes = p.poll.votes || {}, anon = !!p.poll.anonymous;
      const total = anon ? (p.poll.total || 0) : Object.keys(votes).length;
      const mine = new Set(votes[me] || []);
      const who = (id) => Object.keys(votes).filter(u => votes[u].includes(id)).sort((a, b) => (b === me) - (a === me));
      const count = (id) => anon ? (p.poll.counts?.[id] || 0) : who(id).length;
      // who chose each one: small photos (yours first); tap one for their profile, +N for everyone
      const faces = (id) => {
        if (anon) return '';
        const list = who(id);
        if (!list.length) return '';
        const seen = this._fpollSeen = this._fpollSeen || new Map();
        const key = `${p.id}:${id}`, before = seen.get(key);
        seen.set(key, new Set(list));
        return `<span class="fk-faces">${list.slice(0, 3).map(u => `<span class="ff${before && !before.has(u) ? ' new' : ''}" data-prof="${esc(u)}" role="button" aria-label="${esc(this._fname(u))}">${this._userAv(u, 20)}</span>`).join('')}${list.length > 3 ? `<span class="fm" data-fa="voters">+${list.length - 3}</span>` : ''}</span>`;
      };
      return `<div class="fk"><div class="fk-h">${esc(p.text)}</div>${p.poll.options.map(o => {
        const c = count(o.id), pct = total ? Math.round(c / total * 100) : 0;
        return `<div class="fk-opt${mine.has(o.id) ? ' mine' : ''}" data-fa="vote" data-opt="${esc(o.id)}"><span class="bar" style="width:${pct}%"></span><span class="on">${mine.has(o.id) ? FI.check : ''}</span><span class="ot">${esc(o.text)}</span>${faces(o.id)}<span class="oc">${c ? pct + '%' : ''}</span></div>`;
      }).join('')}
      <div class="fk-foot"><span${anon ? '' : ' data-fa="voters" style="cursor:pointer"'}>${plural(total, 'vote')}${p.poll.multi ? ' · choose any' : ''}${anon ? ' · anonymous' : ''}</span>${p.poll.add || p.author === me ? '<button data-fa="addopt">Add a Choice</button>' : ''}</div></div>`;
    }
    if (p.kind === 'event' && p.event) {
      const ev = p.event, d = new Date(ev.start);
      const rsvp = ev.rsvp || {};
      const n = (a) => Object.values(rsvp).filter(x => x === a).length;
      const mine = rsvp[me];
      const when = ev.all_day ? fmtListDate(ev.start, this._hass) : `${fmtListDate(ev.start, this._hass)} at ${fmtTime(ev.start, this._hass)}${ev.end ? ` – ${fmtTime(ev.end, this._hass)}` : ''}`;
      const remind = REMIND.find(r => r[0] === ev.remind && r[0] !== null);
      return `<div class="fk"><div class="fk-ev"><div class="dt"><div class="m">${esc(d.toLocaleDateString(locale(this._hass), { month: 'short' }))}</div><div class="d">${d.getDate()}</div></div>
        <div style="min-width:0"><div class="et">${esc(ev.title)}</div><div class="ew">${esc(when)}</div>${ev.location ? `<div class="ew">${mdi('map-marker-outline', '--mdc-icon-size:13px;vertical-align:-2px')} ${esc(ev.location)}</div>` : ''}${remind ? `<div class="ew">⏰ ${esc(remind[1])}</div>` : ''}</div></div>
        <div class="fk-rsvp">${[['going', 'Going'], ['maybe', 'Maybe'], ['no', 'Can’t Go']].map(([k, t]) => `<button data-fa="rsvp" data-ans="${k}" class="${mine === k ? 'on' : ''}">${t}${n(k) ? ` · ${n(k)}` : ''}</button>`).join('')}</div>
        <div class="fk-foot" style="margin-top:8px"><span data-fa="rsvps" style="cursor:pointer">${plural(n('going'), 'person', 'people')} going</span><button data-fa="evcal">Add to Calendar</button></div></div>`;
    }
    if (p.kind === 'fund' && p.fund) {
      const f = p.fund, cur = f.currency || '£';
      const pct = f.target ? clamp(Math.round(f.total / f.target * 100), 0, 100) : null;
      return `<div class="fk"><div class="fk-h">💰 ${esc(f.title)}</div>${f.note ? `<div style="font-size:14px;margin:-4px 0 6px">${esc(f.note)}</div>` : ''}
        <div><span class="fk-big">${esc(cur)}${esc(this._fmoney(f.total))}</span>${f.target ? ` <span style="color:var(--cm-text2)">of ${esc(cur)}${esc(this._fmoney(f.target))}</span>` : ''}</div>
        ${pct !== null ? `<div class="fk-prog"><i style="width:${pct}%"></i></div>` : ''}
        <div class="fk-foot"><span>${plural(f.count || 0, 'person', 'people')} chipped in${f.mine ? ` · you: ${esc(cur)}${esc(this._fmoney(f.mine.amount))}${f.mine.paid ? ' ✓ paid' : ''}` : ''}</span>${p.author === me ? '<button data-fa="pledges">Who’s Paid</button>' : ''}</div>
        <div class="fk-btns"><button class="prim" data-fa="pledge">${f.mine ? 'Change Amount' : 'Chip In'}</button></div></div>`;
    }
    if (p.kind === 'grabs' && p.grabs) {
      const g = p.grabs;
      const badge = g.status === 'available' ? 'Available' : g.status === 'claimed' ? `Claimed by ${this._fname(g.claimed_by, true)}` : 'Gone';
      let btns = '';
      if (p.author === me) btns = g.status === 'gone' ? '<button data-fa="grabs" data-act="available">Mark as Available</button>' : `${g.status === 'claimed' ? '<button data-fa="grabs" data-act="release">Unclaim</button>' : ''}<button data-fa="grabs" data-act="gone">Mark as Gone</button>`;
      else if (g.status === 'available') btns = '<button class="prim" data-fa="grabs" data-act="claim">Claim It</button>';
      else if (g.status === 'claimed' && g.claimed_by === me) btns = '<button data-fa="grabs" data-act="release">Let It Go</button>';
      return `<div class="fk"><span class="fk-badge ${esc(g.status)}">🎁 ${esc(badge)}</span>${btns ? `<div class="fk-btns">${btns}</div>` : ''}</div>`;
    }
    if (p.kind === 'list' && p.list) {
      const items = p.list.items || [], done = items.filter(i => i.done).length;
      const canEdit = p.can_comment !== false;
      return `<div class="fk fk-list"><div class="fk-h">${FI.list} ${esc(p.text)}</div>${items.map(i => `<div class="fl-i${i.done ? ' done' : ''}"${canEdit ? ` data-fa="litem" data-item="${esc(i.id)}" role="button"` : ''}><span class="fl-ck">${i.done ? FI.check : ''}</span><span class="fl-t">${esc(i.text)}</span>${i.done && i.done_by ? `<span class="fl-by">${esc(this._fname(i.done_by, true))}</span>` : ''}</div>`).join('')}
        <div class="fk-foot"><span>${done} of ${items.length} done${p.list.todo ? ` · ${FI.list} kept in step with Home Assistant` : ''}</span>${canEdit ? '<button data-fa="ladd">Add an Item</button>' : ''}</div></div>`;
    }
    if (p.kind === 'recs') {
      const recs = p.recs || [];
      return `<div class="fk fk-recs"><div class="fk-h">${FI.recs} ${recs.length ? `${plural(recs.length, 'recommendation')}` : 'Asking for recommendations'}</div>${recs.slice(0, full ? 50 : 3).map(r => `<div class="fr-i">${FI.card}<div class="fr-b"><b>${esc(r.contact.name)}</b>${r.contact.company && r.contact.company !== r.contact.name ? `<div>${esc(r.contact.company)}</div>` : ''}<div class="fr-by">Recommended by ${esc(r.by.map(u => this._fname(u, true)).join(', '))}</div></div><button data-fa="recsave" data-cid="${esc(r.comment_id)}">Save</button></div>`).join('')}
        ${recs.length ? '' : '<div class="fk-foot" style="margin-top:0"><span>People can recommend someone from their Contacts in the comments.</span></div>'}${p.can_comment !== false ? '<div class="fk-btns"><button class="prim" data-fa="recommend">Recommend Someone</button></div>' : ''}</div>`;
    }
    if (p.kind === 'badges' && p.badges) {
      const B = { photographer: ['📸', 'Top Photographer'], starter: ['💬', 'Conversation Starter'], supporter: ['❤️', 'Biggest Supporter'], helpful: ['🤝', 'Most Helpful'], early: ['🌅', 'Early Bird'], night: ['🦉', 'Night Owl'], planner: ['📅', 'Event Planner'] };
      return `<div class="fk-ban badges"><div class="bi">🏅</div><div class="bt">This Week’s Badges</div><div class="fb-list">${(p.badges.awards || []).map(a => `<div class="fb-i" data-prof="${esc(a.uid)}">${this._userAv(a.uid, 34)}<div><b>${esc((B[a.badge] || ['🏅'])[0])} ${esc((B[a.badge] || ['', 'Badge'])[1])}</b><div>${esc(this._fname(a.uid))}</div></div></div>`).join('')}</div></div>`;
    }
    if (p.kind === 'birthday' && p.birthday) {
      const b = p.birthday, who = this._fname(b.for, true);
      const mineBday = b.for === me;
      return `<div class="fk-ban birthday"><div class="bi">🎂</div><div class="bt">${mineBday ? 'Happy birthday!' : `It’s ${esc(who)}’s birthday`}</div>
        <div class="bs">${b.age ? `${esc(who)} is ${b.age} today. ` : ''}${plural((p.comments || []).length, 'message')} on the card</div>
        <button data-fa="open">${mineBday ? 'Read Your Card' : 'Write on the Card'}</button></div>`;
    }
    if (p.kind === 'milestone' && p.milestone) {
      const m = p.milestone;
      return `<div class="fk-ban milestone"><div class="bi">✨</div><div class="bt">${esc(m.title)}</div><div class="bs">${m.years ? `${plural(m.years, 'year')} today` : 'Today'}</div></div>`;
    }
    if (p.kind === 'review' && p.review) {
      const r = p.review;
      return `<div class="fk-ban review"><div class="bi">🗓</div><div class="bt">Our ${esc(r.year)} in the Feed</div>
        <div class="bs">${plural(r.posts || 0, 'post')} · ${plural(r.photos || 0, 'photo')} · ${plural(r.reactions || 0, 'reaction')} · ${plural(r.comments || 0, 'comment')}</div></div>`;
    }
    return '';
  },

  _fmoney(n) {
    const v = Number(n) || 0;
    return v.toLocaleString(locale(this._hass), { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  },
});

Object.assign(Card.prototype, {

  // ── Page: the Feed ──────────────────────────────────────────────────────────
  // Feed (posts), Photos and Videos (everything shared with you), with stories, a box to post,
  // pinned posts and On This Day at the top.
  _pg_feed({ root = false, view = null } = {}) {
    this._feedSetup();
    // which tab the Feed opens on (this card's setting)
    view = view || (['feed', 'videos', 'groups', 'events'].includes(this._config.feed_start_tab) ? this._config.feed_start_tab : 'feed');
    // the bottom bar, like Facebook's: Home, Videos, Groups, Events, Notifications and Menu.
    // It's frosted glass with Bars Liquid Glass on, and a solid bar along the bottom with it off (or a skin)
    const NAV = this._config.feed_nav !== false;
    const TABS = [['feed', 'home', 'Home'], ['videos', 'videoTab', 'Videos'], ['groups', 'groupTab', 'Groups'], ['events', 'eventTab', 'Events'], ['alerts', 'bell', 'Notifications'], ['menu', '', 'Menu']];
    const TITLES = { feed: 'Feed', photos: 'Photos', videos: 'Videos', groups: 'Groups', albums: 'Albums', events: 'Events', alerts: 'Notifications', menu: 'Menu' };
    const navHtml = () => `<nav class="fd-nav g" aria-label="Feed">${TABS.map(([v, ic, n]) => `<button data-tab="${v}" aria-label="${n}" title="${n}">${v === 'menu'
      ? `<span class="fn-me">${this._userAv(this._s.me, 28)}</span>`
      : `<span class="fn-o">${FI[ic]}</span><span class="fn-f">${FI[ic === 'bell' ? 'bellFill' : ic + 'Fill']}</span>`}${v === 'alerts' ? '<span class="fn-badge" hidden></span>' : ''}</button>`).join('')}</nav>`;
    const el = this._el(`<div class="fd${NAV ? ' has-nav' : ''}">
      <div class="scroll"><div class="large-title">Feed</div>
        <div class="fd-seg"${NAV ? ' hidden' : ''}>${[['feed', 'Feed'], ['photos', 'Photos'], ['videos', 'Videos'], ['groups', 'Groups'], ['albums', 'Albums'], ['events', 'Events']].map(([v, n]) => `<button data-view="${v}">${n}</button>`).join('')}</div>
        <div class="fd-body"><div class="fd-loading">Loading…</div></div></div>
      <div class="edge top"></div>
      <div class="top">${this._appBarHtml('feed')}
        <div class="title" style="opacity:0">Feed</div>
        <div class="capsule g" style="margin-left:auto"><button data-a="new" aria-label="New Post">${FI.edit}</button><button data-a="menu" aria-label="More">${FI.more}</button></div></div>
      <button class="fd-new" hidden>${FI.chevL}New Posts</button>
      ${NAV ? navHtml() : ''}
    </div>`);
    const page = { el };
    const s = this._s, fd = this._fd;
    let notifs = null, notifsLoading = false, nfilter = 'all', nLocalAt = 0;
    // What did I miss? (when several posts came in while you were away), and Search Photos
    let missSince = null, missed = null, photoQ = '', photoHits = null, photoTimer = null;
    // Make an Album (an AI feature): an offer at the top of the Feed, and albums others made with your photos in
    let albumSug = null, albumAsked = false, albumPick = 0, albumOwn = '';
    const memCaps = this._fmemcap = this._fmemcap || {};
    const body = el.querySelector('.fd-body'), scroll = el.querySelector('.scroll'), small = el.querySelector('.top .title'), newBtn = el.querySelector('.fd-new');
    let order = [], more = false, loading = false, media = null;
    scroll.addEventListener('scroll', () => {
      small.style.opacity = scroll.scrollTop > 44 ? '1' : '0';
      if (view === 'feed' && more && !loading && scroll.scrollTop + scroll.clientHeight > scroll.scrollHeight - 700) loadMore();
    }, { passive: true });

    const storiesHtml = () => {
      if (!this._fstoriesOn()) return '';
      const by = new Map();
      fd.stories.forEach(st => { if (!by.has(st.author)) by.set(st.author, []); by.get(st.author).push(st); });
      const mine = by.get(s.me) || [];
      by.delete(s.me);
      const others = [...by.entries()].sort((a, b) => (a[1].every(x => x.seen) - b[1].every(x => x.seen)) || (b[1][b[1].length - 1].ts - a[1][a[1].length - 1].ts));
      return `<div class="fd-card"><div class="fd-stories">
        <div class="fd-st${mine.length ? '' : ' seen'}" data-story="${mine.length ? esc(s.me) : '+'}"><div class="ring add"><div class="in">${this._userAv(s.me, 56)}</div>${mine.length ? '' : `<span class="plus">${FI.plus}</span>`}</div><div class="sn">${mine.length ? 'Your Story' : 'Add Story'}</div></div>
        ${others.map(([uid, list]) => `<div class="fd-st${list.every(x => x.seen) ? ' seen' : ''}" data-story="${esc(uid)}"><div class="ring"><div class="in">${this._userAv(uid, 56)}</div></div><div class="sn">${esc(this._fname(uid, true))}</div></div>`).join('')}
      </div></div>`;
    };
    const boxHtml = () => `<div class="fd-card"><div class="fd-box" data-a="new">${this._userAv(s.me, 40)}<div class="fd-ph">What’s happening at home?</div><span class="fd-bi" data-a="newphoto">${FI.photo}</span></div>
      <div class="fd-quick"><button data-a="newphoto">${FI.photo}Photo</button>${this._fkindOn('poll') ? `<button data-a="newkind" data-kind="poll">${FI.poll}Poll</button>` : ''}${this._fkindOn('event') ? `<button data-a="newkind" data-kind="event">${FI.event}Event</button>` : ''}${this._fkindOn('fund') || this._fkindOn('grabs') || this._fstoriesOn() ? `<button data-a="newmore">${FI.more}More</button>` : ''}</div></div>`;
    const missHtml = () => {
      if (!missSince || !this._faiOn('catchup')) return '';
      if (!missed) return `<div class="fd-card fai-miss"><button data-a="missed">${FI.ai}<span><b>What did I miss?</b><br>A quick catch-up on the posts since you last looked</span></button><button class="x" data-a="nomiss" aria-label="No thanks">${FI.x}</button></div>`;
      return `<div class="fd-card fai-miss done"><div class="fm-h">${FI.ai}What you missed<button class="x" data-a="nomiss" aria-label="Close">${FI.x}</button></div><div class="fm-t">${esc(missed.summary)}</div>${(missed.posts || []).map(id => fd.posts.get(id)).filter(Boolean).map(p => `<div class="fm-p" data-open="${esc(p.id)}">${this._userAv(p.author, 26)}<span>${esc(this._fsummary(p).slice(0, 90))}</span>${FI.chevR}</div>`).join('')}</div>`;
    };
    const albumHtml = () => {
      if (!albumSug || !this._faiOn('make_album')) return '';
      const names = (uids) => {
        const n = uids.map(u => u === s.me ? 'you' : this._fname(u, true));
        return n.length > 2 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n.join(' and ');
      };
      const day = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      let html = (albumSug.invites || []).map(inv => `<div class="fd-card fai-alb inv"><div class="fa-h">${FI.album}<div><b>${esc(this._fname(inv.by, true))} made an album</b><span>“${esc(inv.name)}”. Add your ${inv.count} photo${inv.count === 1 ? '' : 's'} from those days?</span></div></div>
        <div class="fa-b"><button class="go" data-a="albjoin" data-id="${esc(inv.album_id)}">Add My Photos</button><button data-a="albno" data-id="${esc(inv.album_id)}">No Thanks</button></div></div>`).join('');
      const o = albumSug.offer;
      if (o) {
        const when = day(o.start) === day(o.end) ? day(o.start) : `${day(o.start)} – ${day(o.end)}`;
        const chosen = albumOwn || o.names[albumPick] || o.names[0];
        html += `<div class="fd-card fai-alb"><div class="fa-h">${FI.ai}<div><b>Make an Album?</b><span>${o.count} photos from ${esc(when)}, by ${esc(names(o.people))}</span></div><button class="x" data-a="albskip" aria-label="Not now">${FI.x}</button></div>
          <div class="fa-cov">${o.cover.map(c => `<div><img data-att="${esc(c.id)}" data-thumb="1" alt=""></div>`).join('')}</div>
          <div class="fa-n">${o.names.map((n, i) => `<button class="${!albumOwn && i === albumPick ? 'on' : ''}" data-a="albname" data-i="${i}">${esc(n)}</button>`).join('')}<button class="${albumOwn ? 'on' : ''}" data-a="albown">${albumOwn ? esc(albumOwn) : 'Your Own Name…'}</button></div>
          <div class="fa-b"><button class="go" data-a="albmake">Make “${esc(chosen)}”</button></div>
          <div class="fa-note">Your photos go in now. ${o.people.some(u => u !== s.me) ? 'Everyone else is asked whether to add theirs. ' : ''}Shared with everyone, like the photos.</div></div>`;
      }
      return html;
    };
    const memoriesHtml = () => {
      if (!fd.memories.length || this._config.show_memories === false) return '';
      return `<div class="fd-card fd-mem"><div class="mh">${FI.history}On This Day</div>${fd.memories.map(p => {
        const m = (p.media || [])[0];
        const vid = m && (m.mime || '').startsWith('video/') && !m.has_thumb;
        return `<div class="mr" data-open="${esc(p.id)}">${m && !m.removed ? `<div class="mt">${vid ? `<video data-stream="${esc(m.id)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>` : `<img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt="">`}</div>` : ''}<div style="min-width:0;flex:1"><div class="ma">${esc(this._fago(p.ts))} · ${esc(this._fname(p.author, true))}</div><div class="mx">${esc(memCaps[p.id] || this._fsummary(p))}</div></div>${this._faiOn('memories') && !memCaps[p.id] ? `<button class="mcap" data-mcap="${esc(p.id)}" aria-label="A caption for this memory">${FI.ai}</button>` : ''}</div>`;
      }).join('')}</div>`;
    };
    const badge = () => {
      const b = el.querySelector('.fn-badge');
      if (!b) return;
      const n = s.feed?.notif_unread || 0;
      b.hidden = !n || view === 'alerts' || this._fquietDots();
      b.textContent = n > 99 ? '99+' : String(n);
    };
    const render = () => {
      el.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === view));
      el.querySelectorAll('.fd-nav [data-tab]').forEach(b => { const on = b.dataset.tab === view || (b.dataset.tab === 'menu' && ['photos', 'albums'].includes(view)); b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
      el.querySelector('.large-title').textContent = TITLES[view] || 'Feed';
      small.textContent = TITLES[view] || 'Feed';
      badge();
      if (view === 'alerts') { body.innerHTML = this._fnotifsHtml(notifs, nfilter); this._fhy(body); return; }
      if (view === 'menu') { body.innerHTML = this._fmenuHtml(root); this._fhy(body); return; }
      if (view === 'feed') {
        const pinnedIds = new Set(fd.pinned.map(p => p.id));
        const posts = order.map(id => fd.posts.get(id)).filter(p => p && !pinnedIds.has(p.id));
        body.innerHTML = storiesHtml() + boxHtml() + missHtml() + albumHtml() + fd.pinned.map(p => this._fpostHtml(p, { pinnedLabel: true })).join('') + memoriesHtml()
          + (posts.length ? posts.map(p => this._fpostHtml(p)).join('') : (loading ? '<div class="fd-loading">Loading…</div>' : `<div class="empty"><b>Nothing here yet</b>Posts shared with you appear here. Share something with the household to get it started.</div>`))
          + (more ? '<div class="fd-loading">Loading more…</div>' : '');
      } else if (view === 'photos' && this._faiOn('search')) {
        // Search Photos: by what's in them
        if (!body.querySelector('.fai-search')) body.innerHTML = `<label class="fai-search">${FI.search}<input type="search" placeholder="Search photos — “beach”, “cake”, “the dog”" enterkeyhint="search"></label><div class="fai-grid"></div>`;
        const inp = body.querySelector('.fai-search input');
        if (inp.value !== photoQ && document.activeElement !== inp) inp.value = photoQ;
        const g = body.querySelector('.fai-grid');
        g.innerHTML = photoQ ? (photoHits ? (photoHits.length ? this._fgridHtml(photoHits, 'photos') : `<div class="empty"><b>No Matches</b>No photos shared with you match “${esc(photoQ)}”. Photos are searchable from when Photo Search was switched on.</div>`) : '<div class="fd-loading">Searching…</div>')
          : media ? this._fgridHtml(media.items, view) : '<div class="fd-loading">Loading…</div>';
      } else if (view === 'photos' || view === 'videos') {
        body.innerHTML = media ? this._fgridHtml(media.items, view) : '<div class="fd-loading">Loading…</div>';
      } else if (view === 'groups') body.innerHTML = this._fgroupsHtml();
      else if (view === 'albums') body.innerHTML = this._falbumsHtml();
      else if (view === 'events') body.innerHTML = media ? this._feventsHtml(media) : '<div class="fd-loading">Loading…</div>';
      this._fhy(body);
    };
    const load = async () => {
      loading = true; render();
      try {
        const r = await this._ws('feed/list', {});
        order = this._fkeep(r.posts).map(p => p.id);
        more = r.more;
        fd.pinned = this._fkeep(r.pinned);
        fd.stories = r.stories || [];
        fd.memories = this._fkeep(r.memories);
        fd.newer = 0; newBtn.hidden = true;
      } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; loading = false; return; }
      loading = false; render();
      if (!albumAsked && this._faiOn('make_album')) {
        albumAsked = true;
        this._fai('album_suggest').then(r => { albumSug = r; albumPick = 0; albumOwn = ''; if (view === 'feed') render(); }).catch(() => {});
      }
    };
    const loadMore = async () => {
      if (loading || !order.length) return;
      loading = true;
      try {
        const last = fd.posts.get(order[order.length - 1]);
        const r = await this._ws('feed/list', { before: last.ts });
        order = order.concat(this._fkeep(r.posts).map(p => p.id).filter(id => !order.includes(id)));
        more = r.more;
      } catch (err) { more = false; }
      loading = false; render();
    };
    const loadMedia = async () => {
      media = null; render();
      try {
        if (view === 'events') {
          const r = await this._ws('feed/list', { kind: 'events', limit: 50 });
          media = this._fkeep(r.posts);
        } else media = await this._ws('feed/media', { kind: view });
      } catch (err) { media = view === 'events' ? [] : { items: [] }; }
      if (el.isConnected) render();
    };
    const loadNotifs = async () => {
      if (notifsLoading) return;
      notifsLoading = true;
      if (!notifs) render();
      try {
        const r = await this._ws('feed/notifications', nfilter !== 'all' ? { filter: nfilter } : {});
        this._fkeep(r.posts);
        notifs = r;
        // only tell the server when there was something new: its answer (the count going to 0)
        // comes back to this page, and mustn't start another load
        if (r.unread > 0 || s.feed.notif_unread > 0) this._ws('feed/notifications/seen').catch(() => {});
        s.feed.notif_unread = 0;
      } catch (err) { notifs = notifs || { items: [], error: err.message }; }
      notifsLoading = false;
      if (el.isConnected && view === 'alerts') render();
    };
    // ── a notification's swipes, press and hold, and the ••• menu on the Notifications screen ──
    const nlocal = () => { nLocalAt = Date.now(); };
    const nws = async (type, payload = {}) => { nlocal(); try { return await this._ws(type, payload); } catch (err) { this._toast(err.message); return null; } };
    const removeNotif = async (it) => {
      notifs.items = notifs.items.filter(x => x !== it);
      render();
      if (await nws('feed/notifications/remove', { key: it.key }) === null) { loadNotifs(); return; }
      this._fundo('Notification removed', async () => { await nws('feed/notifications/restore', { key: it.key }); loadNotifs(); });
    };
    const toggleRead = async (it) => {
      const read = it.unread;
      it.unread = !it.unread;
      render();
      await nws('feed/notifications/read', { keys: [it.key], read });
    };
    const notifMenu = async (anchor, it) => {
      const pref = NOTIF_PREF[it.kind] || 'comments';
      const who = it.users?.[0];
      const items = [
        { text: it.unread ? 'Mark as Read' : 'Mark as Unread', value: 'toggle', icon: it.unread ? FI.check : FI.bell },
        { sep: true },
        ...(it.post_id ? [{ text: 'Turn Off Notifications for This Post', value: 'mute', icon: FI.bellOff }] : []),
        { text: `Turn Off ${PREF_NAME[pref] || 'These'} Notifications`, value: 'kind', icon: FI.bellOff },
        ...(who && who !== s.me && who !== HA_ID && it.kind !== 'birthday' ? [{ text: `Hide ${this._fname(who, true)} for 30 Days`, value: 'snooze', icon: FI.eyeOff }] : []),
        { sep: true },
        { text: 'Remove', value: 'remove', icon: FI.trash, red: true },
      ];
      const v = await this._menu(anchor, items, { align: 'right' });
      this._closeSwipes(body);
      if (v === 'toggle') toggleRead(it);
      else if (v === 'remove') removeNotif(it);
      else if (v === 'mute') {
        notifs.items = notifs.items.filter(x => x.post_id !== it.post_id);
        render();
        if (await nws('feed/notifications/mute', { post_id: it.post_id, on: true }) === null) { loadNotifs(); return; }
        notifs.muted = (notifs.muted || 0) + 1;
        this._fundo('You won’t be notified about this post', async () => { await nws('feed/notifications/mute', { post_id: it.post_id, on: false }); loadNotifs(); });
      } else if (v === 'kind') {
        const r = await nws('feed/prefs', { notify: { [pref]: false } });
        if (r?.prefs) s.feed.prefs = r.prefs;
        loadNotifs();
        this._fundo(`${PREF_NAME[pref] || 'These'} notifications turned off`, async () => { const x = await nws('feed/prefs', { notify: { [pref]: true } }); if (x?.prefs) s.feed.prefs = x.prefs; loadNotifs(); });
      } else if (v === 'snooze') {
        const r = await nws('feed/snooze', { user_id: who, days: 30 });
        if (r?.prefs) { s.feed.prefs = r.prefs; this._toast(`You won’t see ${this._fname(who, true)}’s posts in the Feed for 30 days`); }
      }
    };
    const notifMainMenu = async (anchor) => {
      const FILTERS = [['all', 'All'], ['unread', 'Unread'], ['reactions', 'Reactions'], ['comments', 'Comments and Replies'], ['mentions', 'Mentions and Tags'], ['page', 'Posts on Your Page'], ['more', 'Birthdays, Groups and More']];
      const v = await this._menu(anchor, [
        { text: 'Mark All as Read', value: 'readall', icon: FI.checkCircle },
        { text: 'Show', icon: FI.filter, sub: FILTERS.map(([k, n]) => ({ text: n, value: `f:${k}`, checked: nfilter === k })) },
        { text: `Turned Off Posts${notifs?.muted ? ` (${notifs.muted})` : ''}`, value: 'muted', icon: FI.bellOff },
        { text: 'Recently Removed', value: 'removed', icon: FI.history },
        { text: 'Notification Settings', value: 'settings', icon: FI.settings },
        { sep: true },
        { text: 'Clear All', value: 'clear', icon: FI.trash, red: true },
        { sep: true },
        { text: 'Your Profile', value: 'me', icon: FI.profile },
        { text: 'Activity Log', value: 'activity', icon: FI.activity },
      ], { align: 'right' });
      if (!v) return;
      if (v === 'readall') { if (notifs) notifs.items.forEach(x => { x.unread = false; }); render(); await nws('feed/notifications/read_all'); if (nfilter === 'unread') loadNotifs(); }
      else if (v.startsWith('f:')) { nfilter = v.slice(2); scroll.scrollTo({ top: 0 }); notifs = null; loadNotifs(); }
      else if (v === 'muted') this._fmutedSheet(() => loadNotifs());
      else if (v === 'removed') this._fremovedSheet(() => loadNotifs());
      else if (v === 'settings') this._nav('fsettings', {});
      else if (v === 'me') this._nav('fprofile', { uid: s.me });
      else if (v === 'activity') this._nav('factivity', {});
      else if (v === 'clear') {
        const r = await this._alert({ title: 'Clear All Notifications?', message: 'They’re removed from this list on all your devices. New ones will still appear, and you can bring these back from Recently Removed for 30 days.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', value: true }] });
        if (!r.value) return;
        if (notifs) notifs.items = [];
        render();
        await nws('feed/notifications/clear');
        this._toast('Notifications cleared');
      }
    };
    this._wireSwipe(body);
    body.addEventListener('input', (e) => {
      if (!e.target.closest('.fai-search')) return;
      photoQ = e.target.value.trim();
      photoHits = null;
      clearTimeout(photoTimer);
      photoTimer = setTimeout(async () => {
        const q = photoQ;
        if (!q) { render(); return; }
        render();
        try { const r = await this._fai('search', { text: q }); if (q === photoQ) { photoHits = this._fkeep ? r.items : r.items; render(); } } catch (err) { photoHits = []; render(); }
      }, 450);
    });
    this._fwireNotifHold(body, (row) => { const it = notifs?.items[+row.dataset.notif]; if (it) notifMenu(row, it); });

    const setView = (v) => {
      view = v;
      if (['photos', 'videos', 'events'].includes(v)) loadMedia();
      else if (v === 'alerts') { render(); loadNotifs(); }
      else render();
    };

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'new') { this._nav('fcompose', {}); return; }
      if (a === 'newphoto') { e.stopPropagation(); this._nav('fcompose', { pickMedia: true }); return; }
      if (a === 'newkind') { this._nav('fcompose', { preset: { kind: e.target.closest('[data-kind]').dataset.kind } }); return; }
      if (a === 'newmore') {
        const k = await this._menu(e.target.closest('button'), [
          ...(this._fkindOn('fund') ? [{ text: 'Chip In', value: 'fund', icon: FI.fund }] : []),
          ...(this._fkindOn('grabs') ? [{ text: 'Up for Grabs', value: 'grabs', icon: FI.gift }] : []),
          ...(this._fstoriesOn() ? [{ text: 'Add to Your Story', value: 'story', icon: FI.plus }] : []),
        ], { align: 'right' });
        if (k === 'story') this._fnewStory(); else if (k) this._nav('fcompose', { preset: { kind: k } });
        return;
      }
      if (a === 'menu') { if (view === 'alerts') notifMainMenu(e.target.closest('button')); else this._fmainMenu(e.target.closest('button')); return; }
      if (a === 'newgroup') { const g = await this._fgroupSheet(null); if (g) this._nav('fgroup', { gid: g.id }); return; }
      if (a === 'newalbum') { const al = await this._falbumSheet(null); if (al) this._nav('falbum', { aid: al.id }); return; }
      const v = e.target.closest('[data-view]');
      if (v) { setView(v.dataset.view); return; }
      const tab = e.target.closest('.fd-nav [data-tab]');
      if (tab) {
        // the tab you're on again: back to the top (and Home looks for new posts)
        if (tab.dataset.tab === view) { scroll.scrollTo({ top: 0, behavior: 'smooth' }); if (view === 'feed' && scroll.scrollTop < 50) load(); else if (view === 'alerts') loadNotifs(); return; }
        scroll.scrollTo({ top: 0 });
        setView(tab.dataset.tab);
        return;
      }
      if (view === 'alerts' && notifs) {
        const act = e.target.closest('[data-nact]');
        if (act) {
          const it = notifs.items[+act.closest('[data-notif]').dataset.notif];
          if (!it) return;
          if (act.dataset.nact === 'remove') removeNotif(it);
          else if (act.dataset.nact === 'toggle') { this._closeSwipes(body); toggleRead(it); }
          else if (act.dataset.nact === 'more') notifMenu(act, it);
          return;
        }
        if (e.target.closest('[data-nfilter-clear]')) { nfilter = 'all'; notifs = null; loadNotifs(); return; }
        // a swiped row: a tap anywhere puts it back first
        if (body.querySelector('.row.swiped, .row.swiped-l') && body.contains(e.target)) { this._closeSwipes(body); return; }
      }
      const nr = e.target.closest('[data-notif]');
      if (nr && notifs) {
        const it = notifs.items[+nr.dataset.notif];
        if (!it || (nr._heldAt && Date.now() - nr._heldAt < 900)) return;
        if (it.unread) { it.unread = false; nr.querySelector('.fn-row')?.classList.remove('new'); nws('feed/notifications/read', { keys: [it.key] }); }
        if (it.group_id) this._nav('fgroup', { gid: it.group_id });
        else if (it.post_id) this._nav('fpost', { pid: it.post_id, cid: it.comment_id || null });
        else if (it.profile) this._nav('fprofile', { uid: it.profile });
        else if (it.story_id) this._fopenStory(it.story_id);
        return;
      }
      const mi = e.target.closest('[data-menu]');
      if (mi) {
        const m = mi.dataset.menu;
        if (m === 'me') this._nav('fprofile', { uid: s.me });
        else if (m === 'photos' || m === 'albums') { scroll.scrollTo({ top: 0 }); setView(m); }
        else if (m === 'activity') this._nav('factivity', {});
        else if (m === 'saved') this._nav('flist', { kind: 'saved' });
        else if (m === 'archive') this._nav('flist', { kind: 'archive' });
        else if (m === 'story') this._fnewStory();
        else if (m === 'new') this._nav('fcompose', {});
        else if (m === 'settings') this._nav('fsettings', {});
        else if (m === 'messages') this._back();
        return;
      }
      if (e.target.closest('.fd-new')) { scroll.scrollTo({ top: 0, behavior: 'smooth' }); load(); return; }
      const st = e.target.closest('[data-story]');
      if (st) { st.dataset.story === '+' ? this._fnewStory() : this._fplayStories(st.dataset.story); return; }
      const mc = e.target.closest('[data-mcap]');
      if (mc) { const t = await this._fbusy('Writing a caption…', () => this._fai('memory', { post_id: mc.dataset.mcap })); if (t) { memCaps[mc.dataset.mcap] = t; render(); } return; }
      const op = e.target.closest('[data-open]');
      if (op) { this._nav('fpost', { pid: op.dataset.open }); return; }
      if (a === 'missed') {
        const r = await this._fbusy('Catching up…', () => this._fai('catchup', { since: missSince }));
        if (r) { missed = r; render(); }
        return;
      }
      if (a === 'nomiss') { missSince = null; missed = null; render(); return; }
      if (a === 'albname') { albumPick = +e.target.closest('[data-i]').dataset.i || 0; albumOwn = ''; render(); return; }
      if (a === 'albown') {
        const r = await this._alert({ title: 'Album Name', input: { value: albumOwn || albumSug?.offer?.names?.[albumPick] || '', placeholder: 'Album Name' },
          buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', value: 'ok', style: 'ok' }] });
        if (r.value === 'ok' && (r.input || '').trim()) { albumOwn = r.input.trim().slice(0, 80); render(); }
        return;
      }
      if (a === 'albskip') { const o = albumSug?.offer; if (o) { albumSug.offer = null; render(); this._fai('album_skip', { key: o.key }).catch(() => {}); } return; }
      if (a === 'albmake') {
        const o = albumSug?.offer;
        if (!o) return;
        const name = albumOwn || o.names[albumPick] || o.names[0];
        const r = await this._fbusy('Making the album…', () => this._fai('album_make', { key: o.key, text: name }));
        if (r) {
          albumSug.offer = null; render();
          this._toast(r.asked ? `Album made. ${r.asked === 1 ? 'The other person has' : 'The others have'} been asked to add their photos.` : 'Album made');
          this._nav('falbum', { aid: r.album.id });
        }
        return;
      }
      if (a === 'albjoin' || a === 'albno') {
        const id = e.target.closest('[data-id]').dataset.id;
        albumSug.invites = (albumSug.invites || []).filter(x => x.album_id !== id);
        if (a === 'albno') { render(); this._fai('album_join', { album_id: id, add: false }).catch(() => {}); return; }
        const r = await this._fbusy('Adding your photos…', () => this._fai('album_join', { album_id: id, add: true }));
        render();
        if (r) { this._toast(`Added ${r.added} photo${r.added === 1 ? '' : 's'}`); this._nav('falbum', { aid: id }); }
        return;
      }
      const gi = e.target.closest('[data-gview]');
      if (gi && photoQ && photoHits) { this._fviewGrid(photoHits, gi.dataset.gview); return; }
      if (gi && media?.items) { this._fviewGrid(media.items, gi.dataset.gview); return; }
      const go = e.target.closest('[data-fgo]');
      if (go) { this._fgo(go.dataset.fgo, go.dataset.id); return; }
      if (await this._fpostClick(e)) return;
    });
    page.refresh = (what, id) => {
      // someone's name or photo changed: show the new one
      if (what === 'fusers') { if (view !== 'alerts') render(); else if (notifs) render(); return; }
      if (what === 'fpost' || what === 'fgone') {
        if (what === 'fgone') order = order.filter(x => x !== id);
        if (view !== 'feed') return;
        const card = body.querySelector(`.fp[data-pid="${CSS.escape(id)}"]`);
        const p = fd.posts.get(id);
        if (card && p && what === 'fpost') { card.outerHTML = this._fpostHtml(p, { pinnedLabel: p.pinned }); this._fhy(body); }
        else if (card && what === 'fgone') card.remove();
        else if (p?.pinned || what === 'fgone') render();
      } else if (what === 'fnew') {
        const p = fd.posts.get(id);
        if (!p) return;
        if (p.author === s.me && view === 'feed') { if (!order.includes(id)) order.unshift(id); render(); return; }
        if (fd.newer > 0) newBtn.hidden = false;
      } else if (what === 'fstories' && view === 'feed') {
        const box = body.querySelector('.fd-stories')?.closest('.fd-card');
        if (box) { box.outerHTML = storiesHtml(); this._fhy(body); }
      } else if (what === 'fmeta' && ['groups', 'albums', 'feed'].includes(view)) render();
      else if (what === 'messages' && view === 'feed') render();
      else if (what === 'feedcount' || what === 'all') this._appBarSync(el);
      else if (what === 'fmedia_gone' && media?.items) { media.items = media.items.filter(x => x.id !== id); if (['photos', 'videos'].includes(view)) render(); }
      // something new while the bell is open: load the list again (a count of 0 is just "seen")
      else if (what === 'feednotif') {
        // something new, or a change made on another device (not one this page just made)
        const elsewhere = s.feed?.notif_changed && Date.now() - nLocalAt > 2000;
        if (view === 'alerts' && (s.feed?.notif_unread > 0 || elsewhere)) loadNotifs(); else badge();
      }
    };
    page.onShow = () => {
      this._appBarSync(el);
      // several new posts since you last looked: offer a catch-up (once)
      if (!page.loaded && (s.feed?.unseen || 0) >= 3 && s.feed?.seen) missSince = s.feed.seen;
      if (s.feed) s.feed.seen = Date.now();
      if (!page.loaded) { page.loaded = true; load(); }
      s.feed.unseen = 0; this._refresh('feedcount');
      this._ws('feed/seen').catch(() => {});
    };
    page.resumeData = () => ({ view });   // coming back reopens the same tab
    if (view !== 'feed') setTimeout(() => setView(view), 0);
    return page;
  },

  async _fmainMenu(anchor) {
    const v = await this._menu(anchor, [
      { text: 'New Post', value: 'new', icon: FI.edit },
      ...(this._fstoriesOn() ? [{ text: 'Add to Your Story', value: 'story', icon: FI.plus }] : []),
      { sep: true },
      { text: 'Your Profile', value: 'me', icon: FI.profile },
      { text: 'Saved', value: 'saved', icon: FI.bookmark },
      { text: 'Activity Log', value: 'activity', icon: FI.activity },
      { text: 'Archive', value: 'archive', icon: FI.archive },
      ...(this._faiOn('ask') ? [{ text: 'Ask the Feed', value: 'ask', icon: FI.ai }] : []),
      { sep: true },
      { text: 'Feed Settings', value: 'settings', icon: FI.settings },
    ], { align: 'right' });
    if (v === 'ask') { this._faskSheet(); return; }
    if (v === 'new') this._nav('fcompose', {});
    else if (v === 'story') this._fnewStory();
    else if (v === 'me') this._nav('fprofile', { uid: this._s.me });
    else if (v === 'saved') this._nav('flist', { kind: 'saved' });
    else if (v === 'archive') this._nav('flist', { kind: 'archive' });
    else if (v === 'activity') this._nav('factivity', {});
    else if (v === 'settings') this._nav('fsettings', {});
  },

  _fgo(kind, id) {
    if (kind === 'group') this._nav('fgroup', { gid: id });
    else if (kind === 'album') this._nav('falbum', { aid: id });
  },

  // ── Page: one post and all its comments ────────────────────────────────────
  _pg_fpost({ pid, cid = null, focus = false, media = null }) {
    this._feedSetup();
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="fd-body" style="padding-top:72px"><div class="fd-loading">Loading…</div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="title">Post</div><div style="width:44px"></div></div>
      <div class="fd-cbar" hidden>
        <div class="rep" hidden></div><div class="att" hidden></div>
        <div class="fai-chips" hidden></div>
        <div class="row">${this._faiOn('comments') || this._faiOn('writing') ? `<button class="cbtn" data-c="ai" aria-label="AI">${FI.ai}</button>` : ''}<button class="cbtn" data-c="photo" aria-label="Add a Photo">${FI.photo}</button><button class="cbtn" data-c="sticker" aria-label="Sticker">${FI.sticker}</button>
          <textarea rows="1" placeholder="Write a comment…" enterkeyhint="send"></textarea><button class="cbtn" data-c="at" aria-label="Mention someone">${FI.at}</button><button class="go" data-c="send" aria-label="Send" disabled>${FI.send}</button></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.fd-body'), bar = el.querySelector('.fd-cbar'), input = bar.querySelector('textarea');
    const repEl = bar.querySelector('.rep'), attEl = bar.querySelector('.att'), go = bar.querySelector('.go');
    let replyTo = null, mentions = [], photo = null, sticker = null, sending = false;
    const render = () => {
      const p = this._fpost(pid);
      if (!p) return;
      body.innerHTML = this._fpostHtml(p, { full: true });
      // a lot of comments: Catch Up
      const nC = (p.comments || []).filter(c => c.text).length;
      if (this._faiOn('threads') && nC >= 6) {
        const at = body.querySelector('.fp-cprev');
        if (at) at.insertAdjacentHTML('beforebegin', page._thread ? `<div class="fai-thread">${FI.ai}<span>${esc(page._thread)}</span></div>` : `<button class="fai-catch" data-c="thread">${FI.ai}Catch Up on ${nC} Comments</button>`);
      }
      this._fhy(body);
      bar.hidden = p.can_comment === false;
    };
    const canSend = () => { go.disabled = sending || (!input.value.trim() && !(photo?.status === 'done') && !sticker); };
    const showAtt = () => {
      attEl.hidden = !photo && !sticker;
      attEl.innerHTML = photo ? `<div class="th">${photo.preview ? `<img src="${esc(photo.preview)}" alt="">` : ''}<button data-c="unatt">${FI.x}</button></div>`
        : sticker ? `<div class="th">${sticker.emoji ? esc(sticker.emoji) : `<img src="${esc(this._stickerSrc(sticker.image))}" alt="">`}<button data-c="unatt">${FI.x}</button></div>` : '';
      canSend();
    };
    const setReply = (c) => {
      replyTo = c?.id || null;
      repEl.hidden = !c;
      repEl.innerHTML = c ? `Replying to <b>${esc(this._fname(c.author, true))}</b><button data-c="unreply" aria-label="Cancel">${FI.x}</button>` : '';
      if (c) input.focus();
    };
    const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; canSend(); };
    input.addEventListener('input', grow);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && this._config.enter_sends !== false && !('ontouchstart' in window)) { e.preventDefault(); send(); } });
    const send = async () => {
      if (go.disabled) return;
      sending = true; canSend();
      const text = input.value.trim();
      if (!(await this._fkindOk(text))) { sending = false; canSend(); return; }
      try {
        const r = await this._ws('feed/comment', { post_id: pid, text, ...(replyTo ? { reply_to: replyTo } : {}),
          ...(photo?.id ? { media: [photo.id] } : {}), ...(sticker ? { sticker } : {}),
          mentions: mentions.filter(m => text.includes(`@${this._fname(m)}`)) });
        this._fd.posts.set(pid, r.post);
        input.value = ''; mentions = []; photo = null; sticker = null; setReply(null); showAtt(); grow();
        render();
        const sc = el.querySelector('.scroll'); sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
      } catch (err) { this._toast(err.message); }
      sending = false; canSend();
    };
    const chips = bar.querySelector('.fai-chips');
    chips.addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) { input.value = b.dataset.chip; chips.hidden = true; grow(); input.focus(); } });
    body.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-c="thread"]')) return;
      const t = await this._fbusy('Reading the comments…', () => this._fai('thread', { post_id: pid }));
      if (t) { page._thread = t; render(); }
    });
    bar.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-c]')?.dataset.c;
      if (c === 'ai') {
        const v = await this._menu(e.target.closest('button'), [
          ...(this._faiOn('comments') ? [{ text: 'Suggest Comments', value: 'suggest', icon: FI.ai }] : []),
          ...(this._faiOn('writing') && input.value.trim() ? [{ header: 'Writing Tools' }, ...this._fwritingItems()] : []),
        ], { align: 'left', above: true });
        if (v === 'suggest') {
          const list = await this._fbusy('Thinking of something to say…', () => this._fai('comments', { post_id: pid }));
          if (list?.length) { chips.innerHTML = list.map(x => `<button data-chip="${esc(x)}">${esc(x)}</button>`).join(''); chips.hidden = false; }
        } else if (v?.startsWith('w:')) {
          const before = input.value;
          const out = await this._fbusy('Rewriting…', () => this._fai('rewrite', { text: input.value, style: v.slice(2) }));
          if (out) { input.value = out; grow(); this._fundo('Rewritten', () => { input.value = before; grow(); }); }
        }
        return;
      }
      if (c === 'send') send();
      else if (c === 'unreply') setReply(null);
      else if (c === 'unatt') { photo = null; sticker = null; showAtt(); }
      else if (c === 'at') {
        const uid = await this._fpickPerson(e.target.closest('button'), 'Mention');
        if (uid) { this._finsert(input, `@${this._fname(uid)} `); mentions.push(uid); grow(); }
      } else if (c === 'photo') {
        const files = await this._fpickFiles('image/*', false);
        if (!files.length) return;
        photo = { status: 'uploading', name: files[0].name };
        showAtt();
        try { await this._prepareAndUpload(files[0], photo, null, () => showAtt()); } catch (err) { photo = null; }
        showAtt();
      } else if (c === 'sticker') {
        const st = await this._fpickSticker();
        if (st) { sticker = st; photo = null; showAtt(); }
      }
    });
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      const go2 = e.target.closest('[data-fgo]');
      if (go2) { this._fgo(go2.dataset.fgo, go2.dataset.id); return; }
      const ca = e.target.closest('[data-ca]');
      if (ca) {
        const p = this._fpost(pid);
        const cm = p?.comments.find(x => x.id === ca.closest('[data-cid]').dataset.cid);
        if (!cm) return;
        const act = ca.dataset.ca;
        if (act === 'reply') setReply(cm.reply_to ? p.comments.find(x => x.id === cm.reply_to) || cm : cm);
        else if (act === 'react') {
          const mine = cm.reactions?.[this._s.me];
          const pick = await this._freactPicker(ca, mine);
          if (pick === undefined) return;
          try { const r = await this._ws('feed/comment/react', { post_id: pid, comment_id: cm.id, reaction: pick }); this._fd.posts.set(pid, r.post); render(); } catch (err) { this._toast(err.message); }
        } else if (act === 'more') this._fcommentMenu(ca, p, cm, render);
        return;
      }
      if (e.target.closest('[data-fa="comment"]')) { input.focus(); return; }
      const cs = e.target.closest('[data-csort]');
      if (cs) {
        const v = await this._menu(cs, [['relevant', 'Most Relevant', 'Comments with the most reactions and replies first'], ['newest', 'Newest', 'The newest comments first'], ['all', 'All Comments', 'Every comment, oldest first']].map(([k, t]) => ({ text: t, value: k, checked: (this._fcsort || 'all') === k })), { align: 'left' });
        if (v) { this._fcsort = v; try { localStorage.setItem('crow_fcsort', v); } catch (x) { /* */ } render(); }
        return;
      }
      if (e.target.closest('[data-fa="open"]') && !e.target.closest('.fk-ban')) return;
      await this._fpostClick(e, { inPost: true, focus: () => input.focus() });
    });
    page.refresh = (what, id) => {
      if ((what === 'fpost' && id === pid) || what === 'messages' || what === 'fusers') render();
      if (what === 'fgone' && id === pid) { body.innerHTML = '<div class="empty"><b>This post has gone</b>It was deleted, or it’s no longer shared with you.</div>'; bar.hidden = true; }
    };
    page.onShow = async () => {
      if (page.loaded) return;
      page.loaded = true;
      try {
        const r = await this._ws('feed/get', { post_id: pid });
        this._fd.posts.set(pid, r.post);
      } catch (err) { body.innerHTML = `<div class="empty"><b>This post isn’t available</b>${esc(err.message)}</div>`; return; }
      render();
      if (media) {
        const p = this._fpost(pid);
        const list = (p?.media || []).filter(m => !m.removed).map(m => ({ ...m, post_id: pid, author: p.author, ts: p.ts }));
        const i = list.findIndex(m => m.id === media);
        if (i >= 0) this._fview(list, i, { post: p }); else this._toast('That photo or video has been deleted');
      }
      if (cid) {
        const c = body.querySelector(`[data-cid="${CSS.escape(cid)}"]`);
        if (c) { c.scrollIntoView({ block: 'center' }); c.querySelector('.fc-bub')?.animate([{ background: 'color-mix(in srgb, var(--cm-accent) 30%, transparent)' }, { background: 'var(--cm-fill)' }], { duration: 1600 }); }
      } else if (focus) setTimeout(() => input.focus(), 300);
    };
    return page;
  },

  // ── What tapping things on a post does (shared by every page that shows posts) ──
  async _fpostClick(e, { inPost = false, focus = null } = {}) {
    const card = e.target.closest('.fp[data-pid]');
    const prof = e.target.closest('[data-prof]');
    if (prof) { if (prof.dataset.prof !== HA_ID) this._nav('fprofile', { uid: prof.dataset.prof }); return true; }
    const ls = card ? this._fpost(card.dataset.pid)?.link_safety : null;
    const risky = ls && (ls.risk === 'caution' || ls.risk === 'danger');
    if (e.target.closest('[data-lsafe]') && ls) { this._lsafeInfo(ls); return true; }
    // a link in the post's words, when Link Safety has warned about it: ask first
    const anchor = risky ? e.target.closest('.fp-text a[href]') : null;
    if (anchor) { e.preventDefault(); if (await this._lsafeOk(ls)) openExternal(anchor.href); return true; }
    const url = e.target.closest('[data-url]');
    if (url) { if (!risky || await this._lsafeOk(ls)) openExternal(url.dataset.url); return true; }
    if (!card) return false;
    const pid = card.dataset.pid;
    const p = this._fpost(pid);
    if (!p) return true;
    // a shared post: the original opens
    const orig = e.target.closest('.fp-shared[data-orig]');
    if (orig) { if (orig.dataset.orig !== pid) this._nav('fpost', { pid: orig.dataset.orig }); return true; }
    const view = e.target.closest('[data-fview]');
    if (view) {
      if (view.dataset.comment) { this._fview([{ id: view.dataset.fview, mime: 'image/jpeg', post_id: pid }], 0); return true; }
      const list = (p.media?.length ? p.media : p.refs || []).filter(m => !m.removed).map(m => ({ ...m, post_id: pid, author: p.author, ts: p.ts }));
      this._fview(list, Math.max(0, list.findIndex(m => m.id === view.dataset.fview)), { post: p });
      return true;
    }
    const fa = e.target.closest('[data-fa]')?.dataset.fa;
    if (!fa) return false;
    const btn = e.target.closest('[data-fa]');
    const call = async (type, payload) => {
      try { const r = await this._ws(type, { post_id: pid, ...payload }); if (r?.post) { this._fd.posts.set(pid, r.post); this._refresh('fpost', pid); } return r; }
      catch (err) { this._toast(err.message); return null; }
    };
    switch (fa) {
      case 'open': if (!inPost) this._nav('fpost', { pid }); return true;
      case 'comment': if (inPost) focus?.(); else this._nav('fpost', { pid, focus: true }); return true;
      case 'react': {
        if (btn._longPressed) { btn._longPressed = false; return true; }
        const mine = p.reactions?.[this._s.me];
        await call('feed/react', { reaction: mine ? null : 'like' });
        return true;
      }
      case 'who': this._fwhoReacted(p); return true;
      case 'save': {
        const on = !p.saved;
        if (await call('feed/save', { on })) this._toast(on ? 'Saved' : 'Removed from Saved');
        return true;
      }
      case 'more': this._fpostMenu(btn, p); return true;
      case 'send': this._fsendToChat(p); return true;
      case 'share': this._fshareMenu(btn, p); return true;
      case 'litem': await this._flistItem(p, 'toggle', btn.dataset.item); return true;
      case 'ladd': await this._flistItem(p, 'add'); return true;
      case 'recommend': await this._frecommend(p); return true;
      case 'recsave': {
        const c = (p.comments || []).find(x => x.id === btn.dataset.cid);
        if (c?.contact) await this._fsaveContact(c.contact);
        return true;
      }
      case 'vote': {
        const opt = btn.dataset.opt, votes = new Set(p.poll.votes?.[this._s.me] || []);
        if (p.poll.multi) { votes.has(opt) ? votes.delete(opt) : votes.add(opt); } else { const had = votes.has(opt); votes.clear(); if (!had) votes.add(opt); }
        await call('feed/vote', { options: [...votes] });
        return true;
      }
      case 'addopt': {
        const r = await this._alert({ title: 'Add a Choice', input: { placeholder: 'Choice' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', value: true }] });
        if (r.value && r.input?.trim()) await call('feed/poll/add', { text: r.input.trim() });
        return true;
      }
      case 'voters': if (p.poll?.anonymous) return true; this._fpeopleSheet('Votes', p.poll.options.map(o => ({ header: o.text, people: Object.entries(p.poll.votes || {}).filter(([, v]) => v.includes(o.id)).map(([u]) => u) }))); return true;
      case 'rsvp': {
        const ans = btn.dataset.ans;
        await call('feed/rsvp', { answer: p.event.rsvp?.[this._s.me] === ans ? null : ans });
        return true;
      }
      case 'rsvps': {
        const r = p.event.rsvp || {};
        this._fpeopleSheet('Who’s Going', [['going', 'Going'], ['maybe', 'Maybe'], ['no', 'Can’t Go']].map(([k, n]) => ({ header: n, people: Object.keys(r).filter(u => r[u] === k) })));
        return true;
      }
      case 'evcal': this._eventToCalendar(btn, { text: p.event.title, event: p.event }); return true;
      case 'pledge': {
        const f = p.fund;
        const r = await this._alert({ title: f.title, message: `How much would you like to chip in? (${f.currency || '£'})`, input: { value: f.mine ? String(f.mine.amount) : '', placeholder: '10' },
          buttons: [...(f.mine ? [{ text: 'Remove Mine', style: 'destructive', value: 'remove' }] : []), { text: 'Cancel', style: 'cancel' }, { text: 'Chip In', value: 'ok' }] });
        if (r.value === 'remove') await call('feed/pledge', { amount: null });
        else if (r.value === 'ok') {
          const amount = parseFloat(String(r.input || '').replace(/[^0-9.]/g, ''));
          if (!(amount > 0)) { this._toast('Enter an amount'); return true; }
          await call('feed/pledge', { amount });
        }
        return true;
      }
      case 'pledges': this._fpledgesSheet(p); return true;
      case 'grabs': await call('feed/grabs', { action: btn.dataset.act }); return true;
      default: return false;
    }
  },

  // press and hold Like for the other reactions
  _fwireReactHold(scope) {
    if (scope._fHold) return;
    scope._fHold = true;
    let timer = null;
    scope.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('[data-fa="react"]');
      if (!btn) return;
      timer = setTimeout(async () => {
        btn._longPressed = true;
        const card = btn.closest('.fp[data-pid]');
        const p = this._fpost(card?.dataset.pid);
        if (!p) return;
        const pick = await this._freactPicker(btn, p.reactions?.[this._s.me], { hold: true });
        // the tap from lifting the finger may never reach Like: don't let it swallow your next tap
        setTimeout(() => { btn._longPressed = false; }, 0);
        if (pick === undefined) return;
        try { const r = await this._ws('feed/react', { post_id: p.id, reaction: pick }); this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); } catch (err) { this._toast(err.message); }
      }, 500);
    });
    const stop = () => clearTimeout(timer);
    scope.addEventListener('pointerup', stop);
    scope.addEventListener('pointercancel', stop);
    scope.addEventListener('pointerleave', stop);
    scope.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-fa="react"]')) e.preventDefault(); });
  },

  // the six reactions in a row; resolves with the one picked, null to take yours off, undefined if closed.
  // hold: opened by pressing and holding Like. Lifting your finger then leaves it open to choose from
  // (or picks the reaction you slid onto), rather than the release closing it straight away.
  _freactPicker(anchor, current, { hold = false } = {}) {
    return new Promise((resolve) => {
      const wrap = this._el(`<div class="menu-wrap"><div class="fd-rpick">${REACTIONS.map(([k, e, n]) => `<button data-r="${k}" class="${current === k ? 'on' : ''}" aria-label="${n}" title="${n}">${e}</button>`).join('')}</div></div>`);
      this._root.appendChild(wrap);
      const pick = wrap.querySelector('.fd-rpick');
      const rr = this._root.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      const w = pick.offsetWidth, h = pick.offsetHeight;
      pick.style.left = `${clamp(ar.left - rr.left + ar.width / 2 - w / 2, 8, rr.width - w - 8)}px`;
      pick.style.top = `${Math.max(8, ar.top - rr.top - h - 8)}px`;
      let done = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        window.removeEventListener('pointerup', onRelease, true);
        window.removeEventListener('pointercancel', onRelease, true);
        wrap.remove();
        resolve(r ? (r === current ? null : r) : undefined);
      };
      // Only a new touch, started after the reactions opened, can choose one or close them. The finger still
      // down from pressing and holding Like (and any tap the phone makes when it lifts) is ignored, unless it
      // lifts on top of a reaction, which picks it (press, slide and let go).
      let fresh = !hold;
      const opened = Date.now();
      const onRelease = (e) => {
        window.removeEventListener('pointerup', onRelease, true);
        window.removeEventListener('pointercancel', onRelease, true);
        const under = e.type === 'pointerup' ? this.shadowRoot?.elementFromPoint?.(e.clientX, e.clientY) : null;
        const r = under && wrap.contains(under) ? under.closest('[data-r]')?.dataset.r : null;
        if (r) finish(r);
      };
      if (hold) { window.addEventListener('pointerup', onRelease, true); window.addEventListener('pointercancel', onRelease, true); }
      wrap.addEventListener('pointerdown', () => { if (Date.now() - opened > 150) fresh = true; }, true);
      wrap.addEventListener('contextmenu', (e) => e.preventDefault());
      wrap.addEventListener('click', (e) => {
        if (!fresh || Date.now() - opened < 250) return;
        finish(e.target.closest('[data-r]')?.dataset.r);
      });
    });
  },

  _fwhoReacted(p) {
    const groups = REACTIONS.map(([k, e, n]) => ({ header: `${e} ${n}`, people: Object.keys(p.reactions || {}).filter(u => p.reactions[u] === k) }));
    this._fpeopleSheet('Reactions', groups);
  },

  // a sheet of people under headings ("Going", "❤️ Love" …)
  _fpeopleSheet(title, groups) {
    const any = groups.some(g => g.people.length);
    const sh = this._xsheet({ title, body: any ? groups.filter(g => g.people.length).map(g => `<div class="fd-h2" style="padding-left:4px">${esc(g.header)} · ${g.people.length}</div><div class="group fd-ppl">${g.people.map(u => `<div class="pick-row" data-prof="${esc(u)}">${this._userAv(u, 36)}<div class="pn">${esc(u === this._s.me ? 'You' : this._fname(u))}</div></div>`).join('')}</div>`).join('') : '<div class="empty" style="padding:30px">No one yet.</div>' });
    sh.el.addEventListener('click', (e) => { const r = e.target.closest('[data-prof]'); if (r && r.dataset.prof !== HA_ID) { sh.close(); this._nav('fprofile', { uid: r.dataset.prof }); } });
  },

  _fpledgesSheet(p) {
    const f = p.fund, cur = f.currency || '£';
    const render = () => Object.keys(f.pledges || {}).length
      ? `<div class="group">${Object.entries(f.pledges).sort((a, b) => b[1].amount - a[1].amount).map(([u, pl]) => `<label class="gr">${this._userAv(u, 32)}<div class="gl">${esc(this._fname(u))}<div style="font-size:13px;color:var(--cm-text2)">${esc(cur)}${esc(this._fmoney(pl.amount))}</div></div><span style="font-size:13px;color:var(--cm-text2)">Paid</span><span class="tsw"><input type="checkbox" data-u="${esc(u)}"${pl.paid ? ' checked' : ''}><span></span></span></label>`).join('')}</div>
         <div class="sfoot">Only you can see who chipped in what. Everyone else sees the total.</div>`
      : '<div class="empty" style="padding:30px">No one has chipped in yet.</div>';
    const sh = this._xsheet({ title: 'Who’s Paid', body: render() });
    sh.el.addEventListener('change', async (e) => {
      const inp = e.target.closest('[data-u]'); if (!inp) return;
      try { const r = await this._ws('feed/pledge/paid', { post_id: p.id, user_id: inp.dataset.u, paid: inp.checked }); this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); } catch (err) { this._toast(err.message); inp.checked = !inp.checked; }
    });
  },

  // ── The ••• menu on a post ─────────────────────────────────────────────────
  async _fpostMenu(anchor, p) {
    const me = this._s.me, mine = p.author === me, admin = this._s.isAdmin, onMyPage = p.page === me && !mine;
    const tagged = Object.entries(p.tags || {}).filter(([, l]) => l.some(t => t.uid === me)).map(([aid]) => aid);
    const items = [
      { text: p.saved ? 'Unsave' : 'Save Post', value: 'save', icon: p.saved ? FI.bookmarkFill : FI.bookmark },
      ...(this._fon('collections') && !p.archived ? [{ text: 'Save to Collection…', value: 'collect', icon: FI.folder }] : []),
      ...(mine || admin ? [{ text: p.pinned ? 'Unpin' : 'Pin to the Top', value: 'pin', icon: FI.pinned }] : []),
      { text: 'Send to a Chat', value: 'send', icon: FI.send },
      ...(p.text ? [{ text: 'Copy Text', value: 'copy', icon: FI.copy }] : []),
      ...(p.text && this._faiOn('translate') ? [{ text: 'Translate', value: 'translate', icon: FI.translate }] : []),
      ...(p.edits ? [{ text: 'Edit History', value: 'history', icon: FI.history }] : []),
    ];
    if (mine) {
      items.push({ sep: true },
        ...(p.author !== HA_ID ? [{ text: 'Edit Post', value: 'edit', icon: FI.edit }] : []),
        ...(p.album ? [] : [{ text: 'Who Can See This', value: 'aud', icon: this._faudIcon(p.audience) }]),
        { text: 'Who Can Comment', value: 'cmt', icon: FI.comment },
        ...(p.author !== HA_ID && !p.scheduled_at ? [{ text: p.archived ? 'Restore From Archive' : 'Move to Archive', value: 'archive', icon: p.archived ? FI.unarchive : FI.archive }] : []));
    }
    if (tagged.length) items.push({ text: 'Remove Tag of Me', value: 'untag', icon: FI.tag });
    if (onMyPage) items.push({ sep: true }, { text: p.page_hidden ? 'Show on My Page' : 'Hide From My Page', value: 'pagehide', icon: FI.eyeOff });
    if (!mine && p.author !== HA_ID) items.push({ sep: true }, { text: `Hide ${this._fname(p.author, true)} for 30 Days`, value: 'snooze', icon: FI.eyeOff });
    if (mine || admin || onMyPage) items.push({ sep: true }, { text: 'Delete Post', value: 'delete', icon: FI.trash, red: true });
    const v = await this._menu(anchor, items, { align: 'right' });
    if (!v) return;
    const call = async (type, payload = {}) => {
      try { const r = await this._ws(type, { post_id: p.id, ...payload }); if (r?.post) { this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); } return r; }
      catch (err) { this._toast(err.message); return null; }
    };
    if (v === 'save') { if (await call('feed/save', { on: !p.saved })) this._toast(p.saved ? 'Removed from Saved' : 'Saved'); }
    else if (v === 'collect') this._fcollectionMenu(anchor, p);
    else if (v === 'archive') {
      const r = await call('feed/archive', { on: !p.archived });
      if (r) {
        if (!p.archived) { this._refresh('fgone', p.id); this._fundo('Moved to your Archive. Only you can see it.', () => call('feed/archive', { on: false }).then(() => this._refresh('fnew', p.id))); }
        else { this._refresh('fgone', p.id); this._toast('Restored. It’s back for the people it was shared with.'); }
      }
    }
    else if (v === 'pin') await call('feed/pin', { on: !p.pinned });
    else if (v === 'send') this._fsendToChat(p);
    else if (v === 'copy') { try { await navigator.clipboard.writeText(p.text); this._toast('Copied'); } catch (e) { this._toast('Copy isn’t available here'); } }
    else if (v === 'translate') this._ftranslate(p.id, null, p.text);
    else if (v === 'history') {
      try {
        const r = await this._ws('feed/edits', { post_id: p.id });
        this._xsheet({ title: 'Edit History', body: `<div class="group"><div class="gr" style="display:block;cursor:default"><div style="font-size:12.5px;color:var(--cm-text2)">Now</div><div style="white-space:pre-wrap">${esc(p.text)}</div></div>${r.edits.map(x => `<div class="gr" style="display:block;cursor:default"><div style="font-size:12.5px;color:var(--cm-text2)">${esc(fmtListDate(x.ts, this._hass))} at ${esc(fmtTime(x.ts, this._hass))}</div><div style="white-space:pre-wrap">${esc(x.text) || '<i>No words</i>'}</div></div>`).join('')}</div>` });
      } catch (err) { this._toast(err.message); }
    } else if (v === 'edit') this._nav('fcompose', { edit: p.id });
    else if (v === 'aud') {
      const aud = await this._faudienceSheet(p.audience);
      if (aud) { await call('feed/edit', { audience: aud }); this._toast(`Now shared with ${this._faudText(aud, true)}`); }
    } else if (v === 'cmt') {
      const r = await this._fcommentersSheet(p.comment_audience, p.commenters || []);
      if (r) await call('feed/edit', r);
    } else if (v === 'pagehide') { if (await call('feed/page/hide', { hidden: !p.page_hidden })) this._toast(p.page_hidden ? 'Shown on your page again' : 'Hidden from your page. It’s still in the Feed for the people it’s shared with.'); }
    else if (v === 'untag') { for (const aid of tagged) await call('feed/untag', { media_id: aid }); this._toast('Tag removed'); }
    else if (v === 'snooze') {
      try { const r = await this._ws('feed/snooze', { user_id: p.author, days: 30 }); this._s.feed.prefs = r.prefs; this._toast(`You won’t see ${this._fname(p.author, true)}’s posts in the Feed for 30 days`); this._refresh('fgone', p.id); }
      catch (err) { this._toast(err.message); }
    } else if (v === 'delete') {
      const r = await this._alert({ title: 'Delete Post?', message: 'It’s deleted for everyone, with its photos, videos and comments.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
      if (!r.value) return;
      try { await this._ws('feed/delete', { post_id: p.id }); this._fd.posts.delete(p.id); this._refresh('fgone', p.id); const top = this._stack[this._stack.length - 1]; if (top?.type === 'fpost' && top.data.pid === p.id) this._back(); this._toast('Post deleted'); }
      catch (err) { this._toast(err.message); }
    }
  },

  async _fcommentMenu(anchor, p, c, after) {
    const mine = c.author === this._s.me;
    const v = await this._menu(anchor, [
      ...(c.text ? [{ text: 'Copy', value: 'copy', icon: FI.copy }] : []),
      ...(c.text && this._faiOn('translate') ? [{ text: 'Translate', value: 'translate', icon: FI.translate }] : []),
      ...(mine && c.text ? [{ text: 'Edit', value: 'edit', icon: FI.edit }] : []),
      { text: 'Delete', value: 'delete', icon: FI.trash, red: true },
    ], { align: 'left' });
    if (v === 'copy') { try { await navigator.clipboard.writeText(c.text); this._toast('Copied'); } catch (e) { /* */ } }
    else if (v === 'translate') this._ftranslate(p.id, c.id, c.text);
    else if (v === 'edit') {
      const r = await this._alert({ title: 'Edit Comment', input: { value: c.text }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', value: true }] });
      if (!r.value) return;
      try { const x = await this._ws('feed/comment/edit', { post_id: p.id, comment_id: c.id, text: r.input || '' }); this._fd.posts.set(p.id, x.post); after(); } catch (err) { this._toast(err.message); }
    } else if (v === 'delete') {
      const r = await this._alert({ title: 'Delete Comment?', message: c.reply_to ? '' : 'Replies to it are deleted too.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
      if (!r.value) return;
      try { const x = await this._ws('feed/comment/delete', { post_id: p.id, comment_id: c.id }); this._fd.posts.set(p.id, x.post); after(); } catch (err) { this._toast(err.message); }
    }
  },

  // Send to a chat: as a card in the conversation. Only works for chats where everyone can already see the post.
  _fsendToChat(p) {
    const s = this._s;
    const chosen = new Set();
    const favs = this._favUids();
    const threads = [...s.threads.values()].filter(t => t.visible !== false).sort((a, b) => (this._threadFav(b, favs) - this._threadFav(a, favs)) || (b.updated_at - a.updated_at));
    const sh = this._xsheet({
      title: 'Send to a Chat', action: 'Send',
      body: `<div class="xnote" style="margin-top:0">Everyone in the chat has to be able to see this post already${p.audience?.type === 'everyone' ? '' : ` (it’s shared with ${esc(this._faudText(p.audience, true))})`}.</div>
        <input class="xfield q" placeholder="Search" type="search" autocomplete="off"><div class="group fwlist"></div>`,
      onAction: async () => {
        if (!chosen.size) { this._toast('Choose a chat'); return false; }
        let ok = 0; const failed = [];
        for (const tid of chosen) {
          try { await this._ws('send', { thread_id: tid, text: '', extra: { type: 'post', post: { post_id: p.id } } }); ok++; }
          catch (err) { failed.push(this._threadTitle(s.threads.get(tid))); }
        }
        if (failed.length) this._toast(`Not everyone in ${failed.join(', ')} can see this post`);
        else this._toast(ok === 1 ? 'Sent' : `Sent to ${ok} chats`);
      },
    });
    const list = sh.el.querySelector('.fwlist'), q = sh.el.querySelector('.q');
    const render = () => {
      const w = q.value.toLowerCase();
      list.innerHTML = threads.filter(t => !w || this._threadTitle(t).toLowerCase().includes(w)).map(t =>
        `<div class="pick-row${chosen.has(t.id) ? ' on' : ''}" data-t="${esc(t.id)}">${this._threadAv(t, 36)}<div class="pn">${esc(this._threadTitle(t))}</div><span class="pck2">${chosen.has(t.id) ? FI.check : ''}</span></div>`).join('')
        || '<div class="pick-row"><div class="pn" style="color:var(--cm-text2)">No conversations</div></div>';
    };
    q.addEventListener('input', render);
    list.addEventListener('click', (e) => { const r = e.target.closest('[data-t]'); if (!r) return; chosen.has(r.dataset.t) ? chosen.delete(r.dataset.t) : chosen.add(r.dataset.t); render(); });
    render();
  },

  // ── Who can see it, who can comment, and choosing people ───────────────────
  _faudienceSheet(current, { groups = true, me = true } = {}) {
    return new Promise((resolve) => {
      let pick = current ? { ...current, people: [...(current.people || [])] } : { type: 'everyone' };
      let done = false;
      const myGroups = groups ? (this._s.feed?.groups || []) : [];
      const row = (type, icon, title, sub, extra = '') => `<div class="gr" role="button" data-aud="${type}"${extra}><span class="gi">${icon}</span><div class="gl">${title}${sub ? `<div style="font-size:13px;color:var(--cm-text2)">${sub}</div>` : ''}</div><span class="gck">${FI.check}</span></div>`;
      const sh = this._xsheet({
        title: 'Who Can See It', action: 'Done',
        body: `<div class="sgroup aud">
          ${row('everyone', FI.everyone, 'Everyone at home', 'Everyone who uses Crow Messenger')}
          ${row('people', FI.people, 'Chosen people', '', ' data-sub="1"')}
          ${me ? row('me', FI.me, 'Only me', 'A private note to yourself') : ''}</div>
          ${myGroups.length ? `<div class="fd-h2" style="padding-left:4px">Groups</div><div class="sgroup">${myGroups.map(g => `<div class="gr" role="button" data-aud="group" data-g="${esc(g.id)}"><span class="gi">${FI.group}</span><div class="gl">${esc(g.name)}<div style="font-size:13px;color:var(--cm-text2)">${plural(g.members.length, 'member')}</div></div><span class="gck">${FI.check}</span></div>`).join('')}</div>` : ''}
          <div class="sfoot">Only the people you choose see the post, its photos, its comments and who reacted. Nobody else is told about it.</div>`,
        onAction: () => {
          if (pick.type === 'people' && !pick.people.length) { this._toast('Choose at least one person'); return false; }
          done = true; resolve(pick);
        },
      });
      const paint = () => {
        sh.el.querySelectorAll('[data-aud]').forEach(r => {
          const on = r.dataset.aud === pick.type && (pick.type !== 'group' || r.dataset.g === pick.group);
          r.querySelector('.gck').style.visibility = on ? 'visible' : 'hidden';
          if (r.dataset.sub) r.querySelector('.gl').innerHTML = `Chosen people<div style="font-size:13px;color:var(--cm-text2)">${pick.type === 'people' && pick.people.length ? esc(this._faudText(pick, true)) : 'Choose who'}</div>`;
        });
      };
      sh.el.addEventListener('click', async (e) => {
        const r = e.target.closest('[data-aud]'); if (!r) return;
        if (r.dataset.aud === 'people') {
          const ppl = await this._fpickPeople('Chosen People', pick.type === 'people' ? pick.people : []);
          if (ppl) pick = { type: 'people', people: ppl };
        } else if (r.dataset.aud === 'group') pick = { type: 'group', group: r.dataset.g };
        else pick = { type: r.dataset.aud };
        paint();
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      paint();
    });
  },

  _fcommentersSheet(current, people) {
    return new Promise((resolve) => {
      let mode = current || 'all', list = [...people], done = false;
      const sh = this._xsheet({
        title: 'Who Can Comment', action: 'Done',
        body: `<div class="sgroup"><div class="gr" role="button" data-m="all"><div class="gl">Everyone who can see it</div><span class="gck">${FI.check}</span></div>
          <div class="gr" role="button" data-m="people"><div class="gl">Chosen people<div class="sub" style="font-size:13px;color:var(--cm-text2)"></div></div><span class="gck">${FI.check}</span></div></div>`,
        onAction: () => { if (mode === 'people' && !list.length) { this._toast('Choose at least one person'); return false; } done = true; resolve({ comment_audience: mode, commenters: list }); },
      });
      const paint = () => {
        sh.el.querySelectorAll('[data-m]').forEach(r => { r.querySelector('.gck').style.visibility = r.dataset.m === mode ? 'visible' : 'hidden'; });
        sh.el.querySelector('.sub').textContent = list.length ? list.map(u => this._fname(u, true)).join(', ') : 'Choose who';
      };
      sh.el.addEventListener('click', async (e) => {
        const r = e.target.closest('[data-m]'); if (!r) return;
        if (r.dataset.m === 'people') { const ppl = await this._fpickPeople('Who Can Comment', list); if (ppl) { list = ppl; mode = 'people'; } }
        else mode = 'all';
        paint();
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      paint();
    });
  },

  // tick people from the household (everyone but you)
  _fpickPeople(title, selected = [], { include = null } = {}) {
    return new Promise((resolve) => {
      const chosen = new Set(selected);
      let done = false;
      const people = (include || [...this._s.users.keys()]).filter(u => u !== this._s.me && u !== HA_ID)
        .sort((a, b) => this._fname(a).localeCompare(this._fname(b)));
      const sh = this._xsheet({
        title, action: 'Done',
        body: `<input class="xfield q" placeholder="Search" type="search" autocomplete="off"><div class="group fd-ppl fwlist"></div>`,
        onAction: () => { done = true; resolve([...chosen]); },
      });
      const list = sh.el.querySelector('.fwlist'), q = sh.el.querySelector('.q');
      const render = () => {
        const w = q.value.toLowerCase();
        list.innerHTML = people.filter(u => !w || this._fname(u).toLowerCase().includes(w)).map(u =>
          `<div class="pick-row${chosen.has(u) ? ' on' : ''}" data-u="${esc(u)}">${this._userAv(u, 36)}<div class="pn">${esc(this._fname(u))}</div><span class="pck2">${chosen.has(u) ? FI.check : ''}</span></div>`).join('')
          || '<div class="pick-row"><div class="pn" style="color:var(--cm-text2)">No one found</div></div>';
      };
      q.addEventListener('input', render);
      list.addEventListener('click', (e) => { const r = e.target.closest('[data-u]'); if (!r) return; chosen.has(r.dataset.u) ? chosen.delete(r.dataset.u) : chosen.add(r.dataset.u); render(); });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      render();
    });
  },

  // one person, from a menu (for @mentions and tags)
  async _fpickPerson(anchor, header, { include = null } = {}) {
    const people = (include || [...this._s.users.keys()]).filter(u => u !== HA_ID).sort((a, b) => this._fname(a).localeCompare(this._fname(b)));
    if (!people.length) { this._toast('There’s no one else here yet'); return null; }
    return this._menu(anchor, [{ header }, ...people.map(u => ({ text: u === this._s.me ? `${this._fname(u)} (You)` : this._fname(u), value: u }))], { align: 'right', above: true });
  },

  _finsert(input, text) {
    const st = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, st);
    const lead = before && !/\s$/.test(before) ? ' ' : '';
    input.value = before + lead + text + input.value.slice(en);
    const at = (before + lead + text).length;
    input.focus();
    try { input.setSelectionRange(at, at); } catch (e) { /* */ }
    input.dispatchEvent(new Event('input'));
  },

  _fpickFiles(accept, multiple = true, capture = null) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
      if (capture) inp.setAttribute('capture', capture);
      inp.style.display = 'none';
      this._root.appendChild(inp);
      inp.addEventListener('change', () => { resolve([...(inp.files || [])]); inp.remove(); });
      inp.addEventListener('cancel', () => { resolve([]); inp.remove(); });
      inp.click();
    });
  },

  _fpickSticker() {
    return new Promise((resolve) => {
      const mine = this._s.stickers || [];
      let tab = mine.length ? 'mine' : 'emoji', done = false;
      const sh = this._xsheet({ title: 'Stickers', body: '<div class="stk-body"></div>' });
      const bodyEl = sh.el.querySelector('.stk-body');
      const render = () => {
        bodyEl.innerHTML = `<div class="segc2"><button data-tab="mine" class="${tab === 'mine' ? 'on' : ''}">My Stickers</button><button data-tab="emoji" class="${tab === 'emoji' ? 'on' : ''}">Emoji</button></div>`
          + (tab === 'emoji' ? `<div class="egrid">${STICKER_EMOJI.map(e => `<button data-emoji="${esc(e)}">${esc(e)}</button>`).join('')}</div>`
            : mine.length ? `<div class="sgrid">${mine.map(id => { const src = this._stickerSrc(id); return `<div class="stile" data-img="${esc(id)}" role="button">${src ? `<img src="${esc(src)}" alt="" data-no-missing>` : ''}</div>`; }).join('')}</div>`
              : '<div class="xnote">Make stickers from your photos in any chat (+ → Stickers), then use them here too.</div>');
      };
      this._stickerViews = this._stickerViews || new Set();
      this._stickerViews.add(render);
      const close = sh.close; sh.close = () => { this._stickerViews.delete(render); close(); if (!done) resolve(null); };
      bodyEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); return; }
        const em = e.target.closest('[data-emoji]'); if (em) { done = true; sh.close(); resolve({ emoji: em.dataset.emoji }); return; }
        const im = e.target.closest('[data-img]'); if (im) { done = true; sh.close(); resolve({ image: im.dataset.img }); }
      });
      render();
    });
  },
});

Object.assign(Card.prototype, {

  // ── Page: New Post (and Edit Post) ──────────────────────────────────────────
  // preset: { text, kind, audience, album } · edit: a post id · pickMedia: open the photo picker first
  // onPosted: called after posting (Share to Crow Messenger uses it to tidy up)
  // share: a link shared from a phone (Post on a Page) · comment: words typed with it
  _pg_fcompose({ preset = null, edit = null, pickMedia = false, onPosted = null, share = null, comment = '' } = {}) {
    this._feedSetup();
    const s = this._s, me = s.me;
    const editing = edit ? this._fpost(edit) : null;
    let sharedView = null;
    const st = {
      kind: 'post', text: '', bg: null, feeling: null, place: null, audience: this._fdefaultAudience(), page: null,
      link: null, linkUrl: null, noLink: null,
      comment_audience: 'all', commenters: [], album: null, scheduled_at: null, tags: {}, mentions: [], media: [],
      poll: { options: ['', ''], multi: true, add: true },
      event: { title: '', day: '', start: '18:00', end: '20:00', all_day: false, location: '', remind: 60 },
      fund: { title: '', target: '', note: '' },
      list: { items: ['', ''], todo: '' }, shared: null, home: null,
    };
    const d0 = new Date(Date.now() + 86400000);
    st.event.day = isoDay(d0);
    if (editing) {
      Object.assign(st, {
        kind: editing.kind, text: editing.text || '', bg: editing.bg || null, feeling: editing.feeling || null,
        place: editing.place || null, audience: editing.audience, page: editing.page || null,
        link: editing.link || null, linkUrl: editing.link?.url || null, noLink: null, comment_audience: editing.comment_audience || 'all',
        commenters: editing.commenters || [], album: editing.album || null, scheduled_at: editing.scheduled_at || null,
        tags: JSON.parse(JSON.stringify(editing.tags || {})), mentions: [...(editing.mentions || [])],
        media: (editing.media || []).map(m => ({ ...m, status: 'done', existing: true })),
      });
      if (editing.event) {
        const ev = editing.event, sd = new Date(ev.start);
        st.event = { title: ev.title, day: isoDay(sd), start: isoTime(sd), end: ev.end ? isoTime(new Date(ev.end)) : '', all_day: ev.all_day, location: ev.location || '', remind: ev.remind ?? null };
      }
    } else {
      // a draft left from last time (not when something's been handed over to post)
      if (!preset && !share) {
        try { const dr = JSON.parse(localStorage.getItem(draftKey(me)) || 'null'); if (dr && Date.now() - (dr.at || 0) < 14 * 86400000) Object.assign(st, dr.st || {}); } catch (e) { /* */ }
        st.media = []; st.tags = {};
      }
      if (preset) {
        if (preset.text) st.text = preset.text;
        if (preset.kind) st.kind = preset.kind;
        if (preset.audience) st.audience = preset.audience;
        if (preset.album) { st.album = preset.album; }
        if (preset.page && preset.page !== me) st.page = preset.page;
        if (preset.shared) { st.shared = preset.shared; sharedView = preset.sharedView || null; }
        if (preset.home) st.home = preset.home;
        // from Email: an appointment it found, as an event (title, day, times and place)
        if (preset.event) Object.assign(st.event, Object.fromEntries(Object.entries(preset.event).filter(([, v]) => v !== undefined && v !== null)));
      }
    }
    const el = this._el(`<div class="fd fdc">
      <div class="scroll"><div class="fdc-in"></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="pill g" data-a="cancel">Cancel</button><div class="title">${editing ? 'Edit Post' : 'New Post'}</div><button class="pill g accent" data-a="post">${editing ? 'Save' : 'Post'}</button></div>
      <div class="fdc-tools">
        <button data-t="media" aria-label="Photo or Video">${FI.photo}</button>
        <button data-t="tag" aria-label="Tag People">${FI.tag}</button>
        <button data-t="feeling" aria-label="Feeling or Activity">${FI.smile}</button>
        <button data-t="place" aria-label="Check In">${FI.pin}</button>
        <button data-t="at" aria-label="Mention Someone">${FI.at}</button>
        <button data-t="album" aria-label="Album">${FI.album}</button>
        <button data-t="schedule" aria-label="Schedule">${FI.clock}</button>
        ${this._fon('home_cards') ? `<button data-t="home" aria-label="Share from Home">${FI.homeCard}</button>` : ''}
        ${this._faiOn('writing') || this._faiOn('captions') ? `<button data-t="ai" aria-label="AI">${FI.ai}</button>` : ''}
      </div>
    </div>`);
    const page = { el };
    const inner = el.querySelector('.fdc-in');
    const postBtn = el.querySelector('[data-a="post"]');
    let posting = false;
    const saveDraft = () => {
      if (editing || preset || share) return;
      const keep = { ...st, media: [], tags: {} };
      const empty = !st.text.trim() && st.kind === 'post' && !st.feeling && !st.place;
      try { if (empty) localStorage.removeItem(draftKey(me)); else localStorage.setItem(draftKey(me), JSON.stringify({ at: Date.now(), st: keep })); } catch (e) { /* */ }
    };
    // the first link in the words: its preview appears underneath while writing (X takes it off)
    const firstUrl = () => { const m = /https?:\/\/[^\s<>"']+/i.exec(st.text || ''); return m ? m[0].replace(/[).,!?;:]+$/, '') : null; };
    // a coloured background is for words only, not a post with a link preview (like Facebook)
    const bgOk = () => st.kind === 'post' && !st.shared && !st.home && !st.media.length && st.text.length <= BG_MAX && !st.link && !(firstUrl() && firstUrl() !== st.noLink);
    let linkTimer = null, linkLoading = null;
    const linkHtml = () => {
      if (st.kind !== 'post' || st.media.length) return '';
      if (linkLoading) return `<div class="fdc-link"><div class="lload">Getting a preview of ${esc(linkLoading.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}…</div></div>`;
      return st.link ? `<div class="fdc-link">${this._flinkHtml(st.link, { remove: true })}</div>` : '';
    };
    const paintLink = () => { const box = inner.querySelector('.fdc-linkbox'); if (box) box.innerHTML = linkHtml(); };
    const checkLink = () => {
      clearTimeout(linkTimer);
      const url = firstUrl();
      if (!url) { if (st.link || linkLoading) { st.link = null; st.linkUrl = null; linkLoading = null; render(); } return; }
      if (url === st.linkUrl || url === st.noLink) return;
      linkTimer = setTimeout(async () => {
        linkLoading = url; st.link = null; st.linkUrl = url; paintLink();
        let preview = null;
        try { preview = (await this._ws('feed/link_preview', { url })).preview; } catch (e) { /* none */ }
        if (st.linkUrl !== url) return;
        linkLoading = null; st.link = preview;
        if (preview && st.bg) st.bg = null;
        render();
      }, 600);
    };
    const pageName = () => st.page ? `${this._fname(st.page, true)}’s page` : 'Your page';
    const chips = () => {
      const c = [];
      if (!st.album) c.push(`<button class="fdc-chip${st.page ? ' acc' : ''}" data-a="page"${editing ? ' disabled' : ''}>${FI.profile}${esc(pageName())}${editing ? '' : ' ▾'}</button>`);
      c.push(`<button class="fdc-chip acc" data-a="aud">${this._faudIcon(st.audience)}${esc(st.album ? 'Album audience' : this._faudText(st.audience, true))} ▾</button>`);
      if (st.album) { const al = (s.feed?.albums || []).find(a => a.id === st.album); c.push(`<button class="fdc-chip" data-t="album">${FI.album}${esc(al?.name || 'Album')}</button>`); }
      if (st.scheduled_at) c.push(`<button class="fdc-chip" data-t="schedule">${FI.clock}${esc(fmtListDate(st.scheduled_at, this._hass))} ${esc(fmtTime(st.scheduled_at, this._hass))}</button>`);
      c.push(`<button class="fdc-chip" data-a="cmt">${FI.comment}${st.comment_audience === 'people' ? 'Chosen people can comment' : 'Anyone can comment'}</button>`);
      return c.join('');
    };
    const linesHtml = () => {
      const bits = [];
      if (st.feeling) bits.push(`${st.feeling.activity ? '' : 'Feeling '}${esc(st.feeling.emoji)} <b>${esc(st.feeling.text)}</b><button data-x="feeling">Remove</button>`);
      if (st.place) bits.push(`At <b>${esc(st.place.name)}</b><button data-x="place">Remove</button>`);
      const tagged = [...new Set(Object.values(st.tags).flat().map(t => t.uid))];
      if (tagged.length) bits.push(`With <b>${esc(tagged.map(u => this._fname(u, true)).join(', '))}</b>`);
      return bits.map(b => `<div class="fdc-line">${b}</div>`).join('');
    };
    const mediaHtml = () => st.media.length ? `<div class="fdc-media">${st.media.map((m, i) => {
      const n = (st.tags[m.id] || []).length;
      const src = m.preview || this._blobReady.get(`${m.id}:${m.has_thumb ? 1 : 0}`) || '';
      const vid = (m.mime || '').startsWith('video/');
      return `<div class="th" data-mi="${i}">${src ? `<img src="${esc(src)}" alt="">` : m.id && vid && !m.has_thumb ? `<video data-stream="${esc(m.id)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>` : m.id ? `<img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt="">` : ''}
        ${(m.mime || '').startsWith('video/') ? `<span class="vp">${FI.play}</span>` : ''}
        ${m.status === 'uploading' ? `<span class="pr" style="width:${Math.round((m.progress || 0) * 100)}%"></span>` : ''}
        ${editing ? '' : `<button class="x" data-rm="${i}" aria-label="Remove">${FI.x}</button>`}
        ${m.status === 'done' && (m.mime || '').startsWith('image/') ? `<span class="tg" data-tagm="${i}">${FI.tag}${n ? n : 'Tag'}</span>` : ''}</div>`;
    }).join('')}</div>` : '';
    const kindHtml = () => {
      if (st.kind === 'poll') return `<div class="fdc-sec"><div class="opts"></div>
        <div class="sgroup"><label class="gr"><div class="gl">Allow More Than One Choice</div><span class="tsw"><input type="checkbox" data-k="multi"${st.poll.multi ? ' checked' : ''}><span></span></span></label>
        <label class="gr"><div class="gl">Anyone Can Add Choices</div><span class="tsw"><input type="checkbox" data-k="add"${st.poll.add ? ' checked' : ''}><span></span></span></label>
        <label class="gr"><div class="gl">Anonymous Poll<div style="font-size:13px;color:var(--cm-text2)">Only the totals show — nobody, not even you, sees who chose what</div></div><span class="tsw"><input type="checkbox" data-k="anon"${st.poll.anonymous ? ' checked' : ''}><span></span></span></label></div></div>`;
      if (st.kind === 'event') return `<div class="fdc-sec"><div class="sgroup fbox"><label class="gr frow"><input class="gin-text" data-k="evtitle" placeholder="Event name" maxlength="120" value="${esc(st.event.title)}"></label><label class="gr frow"><input class="gin-text" data-k="evloc" placeholder="Location" maxlength="200" value="${esc(st.event.location)}"></label></div>
        <div class="sgroup"><label class="gr"><div class="gl">All-day</div><span class="tsw"><input type="checkbox" data-k="allday"${st.event.all_day ? ' checked' : ''}><span></span></span></label>
          <div class="gr"><div class="gl">Date</div><input type="date" class="gpill" data-k="evday" value="${esc(st.event.day)}"></div>
          <div class="gr"${st.event.all_day ? ' hidden' : ''}><div class="gl">Starts</div><input type="time" class="gpill" data-k="evstart" value="${esc(st.event.start)}"></div>
          <div class="gr"${st.event.all_day ? ' hidden' : ''}><div class="gl">Ends</div><input type="time" class="gpill" data-k="evend" value="${esc(st.event.end)}"></div>
          <div class="gr" role="button" data-a="remind"><div class="gl">Reminder</div><div class="gv">${esc((REMIND.find(r => r[0] === st.event.remind) || REMIND[0])[1])}</div></div></div>
        <div class="sfoot">People can answer Going, Maybe or Can’t Go. Those going (or maybe) get the reminder.</div></div>`;
      if (st.kind === 'fund') return `<div class="fdc-sec"><div class="sgroup fbox"><label class="gr frow"><input class="gin-text" data-k="ftitle" placeholder="What’s it for? (e.g. Mum’s present)" maxlength="120" value="${esc(st.fund.title)}"></label>
          <label class="gr frow"><input class="gin-text" data-k="ftarget" inputmode="decimal" placeholder="Target amount (optional)" value="${esc(st.fund.target)}"></label>
          <label class="gr frow"><input class="gin-text" data-k="fnote" placeholder="How to pay (optional)" maxlength="300" value="${esc(st.fund.note)}"></label></div>
        <div class="sfoot">Everyone sees the total. Only you see who chipped in what, and you can tick off who’s paid. No money changes hands in Crow Messenger.</div></div>`;
      if (st.kind === 'grabs') return '<div class="fdc-sec"><div class="sfoot" style="margin:0">Add a photo and say what it is. People can tap Claim It — first come, first served.</div></div>';
      if (st.kind === 'recs') return '<div class="fdc-sec"><div class="sfoot" style="margin:0">People can reply with someone from their Contacts. Everything recommended is gathered on the post, and anyone can save it to their own Contacts.</div></div>';
      if (st.kind === 'list') {
        const todos = Object.values(this._hass?.states || {}).filter(x => x.entity_id.startsWith('todo.'));
        return `<div class="fdc-sec"><div class="lopts"></div>${todos.length ? `<div class="sgroup"><div class="gr" role="button" data-a="todo"><span class="gi">${FI.list}</span><div class="gl">Keep in Step With</div><div class="gv">${esc(st.list.todo ? (this._hass.states[st.list.todo]?.attributes?.friendly_name || st.list.todo) : 'No To-do List')}</div></div></div>` : ''}
          <div class="sfoot">Anyone who can comment can tick things off and add to it.${todos.length ? ' Choose a Home Assistant to-do list and ticks go both ways.' : ''}</div></div>`;
      }
      return '';
    };
    const extrasHtml = () => {
      let h = '';
      if (st.shared) { const sp = sharedView || this._fpost(st.shared); h += sp ? this._fsharedHtml(sp).replace('data-fa="openorig"', '') : `<div class="fp-shared na">${FI.shareFb}<span>Sharing a post</span></div>`; }
      if (st.home) h += `<div style="position:relative">${this._fhomeHtml({ ...st.home, ts: Date.now() })}<button class="x" data-x="home" aria-label="Remove" style="position:absolute;top:8px;right:22px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;display:flex;align-items:center;justify-content:center">${FI.x}</button></div>`;
      return h;
    };
    const placeholder = () => (st.shared ? 'Say something about this…' : { post: 'What’s happening at home?', poll: 'Ask a question…', event: 'Tell people about it (optional)', fund: 'Say a bit more (optional)', grabs: 'What are you giving away?', recs: 'What would you like recommended? (e.g. a good plumber)', list: 'Name the list (e.g. BBQ shopping)' }[st.kind]);
    // Make It an Event / Make It a Poll: asked only when what's written looks like one
    let smart = null, smartFor = '', smartTimer = null, smartNo = '';
    const LOOKS = /\b(mon|tues?|wed|thur?s?|fri|sat|sun)(day)?\b|\btomorrow\b|\btonight\b|\bnext week\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\b\d{1,2}(st|nd|rd|th)\b|\?.*\bor\b|\bor\b.*\?/i;
    const smartHtml = () => {
      if (!smart || st.kind !== 'post') return '';
      const s2 = smart.kind === 'event' ? `📅 Make It an Event: <b>${esc(smart.event.title || 'Event')}</b>` : `📊 Make It a Poll: <b>${esc(smart.poll.options.slice(0, 3).join(' / '))}</b>`;
      return `<div class="fdc-smart"><button data-a="smart">${FI.ai}<span>${s2}</span></button><button class="x" data-a="nosmart" aria-label="No thanks">${FI.x}</button></div>`;
    };
    const askSmart = () => {
      clearTimeout(smartTimer);
      if (editing || st.kind !== 'post' || !this._faiOn('smart')) return;
      const t = st.text.trim();
      if (t.length < 10 || !LOOKS.test(t) || t === smartFor || t === smartNo) return;
      smartTimer = setTimeout(async () => {
        smartFor = t;
        let r = null;
        try { r = await this._fai('detect', { text: t }); } catch (e) { r = null; }
        if (st.text.trim() !== t) return;
        const had = !!smart;
        smart = r?.kind ? r : null;
        if (had || smart) { const pos = inner.querySelector('.fdc-text')?.selectionStart; render(); const t2 = inner.querySelector('.fdc-text'); if (t2 && pos != null) { t2.focus(); try { t2.setSelectionRange(pos, pos); } catch (e) { /* */ } } }
      }, 1600);
    };
    const applySmart = () => {
      if (!smart) return;
      if (smart.kind === 'event') {
        const e = smart.event, [day, time] = String(e.start).split('T');
        st.kind = 'event';
        st.event.title = e.title || st.text.slice(0, 80);
        if (/^\d{4}-\d{2}-\d{2}$/.test(day)) st.event.day = day;
        st.event.all_day = !!e.all_day || !time;
        if (time) { st.event.start = time.slice(0, 5); const [h, mi] = time.split(':').map(Number); st.event.end = `${String(Math.min(23, h + 2)).padStart(2, '0')}:${String(mi || 0).padStart(2, '0')}`; }
        if (e.end && String(e.end).includes('T')) st.event.end = String(e.end).split('T')[1].slice(0, 5);
        if (e.location) st.event.location = e.location;
      } else {
        st.kind = 'poll';
        st.text = smart.poll.question || st.text;
        st.poll.options = smart.poll.options.slice(0, 12);
      }
      smart = null;
      saveDraft(); render();
    };
    const render = () => {
      const bg = bgOk() && st.bg;
      inner.innerHTML = `${share ? `<div class="fdc-line" style="padding-top:2px">Shared from your phone<button data-a="tochat">Send in a Chat instead</button></div>` : ''}
        <div class="fdc-who">${this._userAv(me, 44)}<div><div class="nm">${esc(this._fname(me))}${st.page ? ` <span style="opacity:.6">▸</span> ${esc(this._fname(st.page))}` : ''}</div><div class="fdc-chips">${chips()}</div></div></div>
        ${editing || st.shared ? '' : `<div class="fdc-kinds">${Object.entries(KIND_INFO).filter(([k]) => this._fkindOn(k)).map(([k, v]) => `<button data-kind="${k}" class="${st.kind === k ? 'on' : ''}">${v.icon}${v.name}</button>`).join('')}</div>`}
        <textarea class="fdc-text${bg ? ` bgd bg-${esc(st.bg)}` : ''}" placeholder="${esc(placeholder())}" maxlength="10000"></textarea>
        ${bgOk() && st.text.length <= BG_MAX ? `<div class="fdc-bgs"><button class="none${st.bg ? '' : ' on'}" data-bg="" aria-label="No background">${FI.x}</button>${BACKGROUNDS.map(b => `<button class="bg-${b}${st.bg === b ? ' on' : ''}" data-bg="${b}" aria-label="${b}"></button>`).join('')}</div>` : ''}
        ${smartHtml()}<div class="fdc-linkbox">${linkHtml()}</div>${linesHtml()}${mediaHtml()}${extrasHtml()}${kindHtml()}`;
      const ta = inner.querySelector('.fdc-text');
      ta.value = st.text;
      ta.addEventListener('input', () => {
        const was = bgOk();
        st.text = ta.value;
        checkLink();
        askSmart();
        if (was !== bgOk() || (st.bg && st.text.length > BG_MAX)) { if (st.text.length > BG_MAX) st.bg = null; const pos = ta.selectionStart; render(); const t2 = inner.querySelector('.fdc-text'); t2.focus(); try { t2.setSelectionRange(pos, pos); } catch (e) { /* */ } }
        saveDraft(); check();
      });
      if (st.kind === 'poll') {
        const vals = st.poll.options.filter(Boolean);
        const list = this._listRows(inner.querySelector('.opts'), { placeholder: 'Choice', addLabel: 'Add Choice', max: 12, values: vals.length >= 2 ? vals : vals.concat(Array(2 - vals.length).fill('')) });
        page._poll = list;
        inner.querySelector('.opts').addEventListener('input', () => { st.poll.options = list.values(); saveDraft(); check(); });
      }
      if (st.kind === 'list' && inner.querySelector('.lopts')) {
        const vals = st.list.items.filter(Boolean);
        const list = this._listRows(inner.querySelector('.lopts'), { placeholder: 'Item', addLabel: 'Add Item', max: 100, values: vals.length ? vals.concat(['']) : ['', ''] });
        page._list = list;
        inner.querySelector('.lopts').addEventListener('input', () => { st.list.items = list.values(); saveDraft(); check(); });
      }
      this._fhy(inner);
      el.querySelectorAll('.fdc-tools [data-t]').forEach(b => {
        const t = b.dataset.t;
        b.classList.toggle('on', (t === 'feeling' && !!st.feeling) || (t === 'place' && !!st.place) || (t === 'album' && !!st.album) || (t === 'schedule' && !!st.scheduled_at) || (t === 'tag' && Object.keys(st.tags).length > 0));
        b.hidden = (st.shared && ['media', 'album', 'tag', 'home'].includes(t)) || (t === 'home' && (editing || st.kind !== 'post')) || (t === 'album' && !!st.page) || (editing && ['media', 'album'].includes(t)) || (t === 'schedule' && editing && !editing.scheduled_at) || (t === 'tag' && !st.media.some(m => (m.mime || '').startsWith('image/')));
      });
      check();
    };
    const ready = () => {
      if (st.media.some(m => m.status === 'uploading')) return false;
      if (st.kind === 'post') return !!st.text.trim() || st.media.length > 0 || !!st.shared || (!!st.home && st.home.type !== 'camera');
      if (st.kind === 'recs') return !!st.text.trim();
      if (st.kind === 'list') return !!st.text.trim();
      if (st.kind === 'poll') return !!st.text.trim() && (page._poll ? page._poll.values() : st.poll.options.filter(Boolean)).length >= 2;
      if (st.kind === 'event') return !!st.event.title.trim() && !!st.event.day;
      if (st.kind === 'fund') return !!st.fund.title.trim();
      if (st.kind === 'grabs') return !!st.text.trim() || st.media.length > 0;
      return true;
    };
    const check = () => { postBtn.disabled = posting || !ready(); };
    const addFiles = async (files) => {
      const room = 20 - st.media.length;
      for (const f of files.slice(0, room)) {
        const item = { name: f.name, mime: f.type, status: 'uploading', progress: 0 };
        st.media.push(item);
        render();
        this._prepareAndUpload(f, item, null, () => {
          const box = inner.querySelector(`[data-mi="${st.media.indexOf(item)}"] .pr`);
          if (box) box.style.width = `${Math.round((item.progress || 0) * 100)}%`;
        }).then(() => { item.has_thumb = !!item.preview; render(); }).catch(() => { st.media = st.media.filter(x => x !== item); render(); });
      }
      if (files.length > room) this._toast('Up to 20 photos and videos in a post');
    };
    const build = () => {
      const out = { text: st.text.trim() };
      if (!editing) {
        out.kind = st.kind;
        out.media = st.media.filter(m => m.id).map(m => m.id);
        if (st.album) out.album = st.album;
        if (st.page) out.page = st.page;
        if (st.scheduled_at) out.scheduled_at = st.scheduled_at;
      } else if (editing.scheduled_at) out.scheduled_at = st.scheduled_at;
      if (!st.album) out.audience = st.audience;
      out.bg = bgOk() ? st.bg : null;
      out.feeling = st.feeling;
      out.place = st.place ? { zone: st.place.zone } : null;
      if (st.noLink && st.noLink === firstUrl()) out.no_link = true;
      else if (editing && editing.link && !st.link && !firstUrl()) out.no_link = false;
      out.comment_audience = st.comment_audience;
      out.commenters = st.commenters;
      out.tags = st.tags;
      out.mentions = st.mentions.filter(u => out.text.includes(`@${this._fname(u)}`));
      if (st.kind === 'poll' && !editing) out.poll = { options: page._poll ? page._poll.values() : st.poll.options.filter(Boolean), multi: st.poll.multi, add: st.poll.add, ...(st.poll.anonymous ? { anonymous: true } : {}) };
      if (st.kind === 'event') {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(st.event.day || '');
        const at = (t) => { const [hh, mm] = (t || '00:00').split(':').map(n => parseInt(n, 10) || 0); return new Date(+m[1], +m[2] - 1, +m[3], hh, mm).getTime(); };
        const start = st.event.all_day ? at('00:00') : at(st.event.start);
        let end = st.event.all_day || !st.event.end ? null : at(st.event.end);
        if (end && end <= start) end += 86400000;
        out.event = { title: st.event.title.trim(), start, end, all_day: st.event.all_day, location: st.event.location.trim(), remind: st.event.remind };
      }
      if (st.kind === 'fund' && !editing) out.fund = { title: st.fund.title.trim(), target: st.fund.target ? parseFloat(String(st.fund.target).replace(/[^0-9.]/g, '')) || null : null, note: st.fund.note.trim() };
      if (st.kind === 'list' && !editing) out.list = { items: (page._list ? page._list.values() : st.list.items).filter(Boolean), ...(st.list.todo ? { todo: st.list.todo } : {}) };
      if (st.shared && !editing) { out.shared = st.shared; delete out.bg; }
      if (st.home && !editing && st.kind === 'post') out.home = st.home;
      return out;
    };
    const submit = async () => {
      if (!ready() || posting) return;
      posting = true; check();
      if (!(await this._fkindOk(st.text))) { posting = false; check(); return; }
      try {
        const payload = build();
        const r = editing ? await this._ws('feed/edit', { post_id: editing.id, ...payload }) : await this._ws('feed/post', payload);
        this._fd.posts.set(r.post.id, r.post);
        if (!editing) { try { localStorage.removeItem(draftKey(me)); } catch (e) { /* */ } }
        onPosted?.(r.post);
        page.leaving = true;
        this._back();
        this._refresh(editing ? 'fpost' : 'fnew', r.post.id);
        this._toast(editing ? 'Saved' : r.post.scheduled_at ? `Scheduled for ${fmtListDate(r.post.scheduled_at, this._hass)} at ${fmtTime(r.post.scheduled_at, this._hass)}` : 'Posted');
      } catch (err) { this._toast(err.message); posting = false; check(); }
    };

    el.addEventListener('input', (e) => {
      const k = e.target.dataset?.k;
      if (!k) return;
      const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (k === 'multi') st.poll.multi = v; else if (k === 'add') st.poll.add = v; else if (k === 'anon') st.poll.anonymous = v;
      else if (k === 'evtitle') st.event.title = v; else if (k === 'evloc') st.event.location = v;
      else if (k === 'evday') st.event.day = v; else if (k === 'evstart') st.event.start = v; else if (k === 'evend') st.event.end = v;
      else if (k === 'allday') { st.event.all_day = v; render(); }
      else if (k === 'ftitle') st.fund.title = v; else if (k === 'ftarget') st.fund.target = v; else if (k === 'fnote') st.fund.note = v;
      saveDraft(); check();
    });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      const t = e.target.closest('[data-t]')?.dataset.t;
      if (a === 'cancel') {
        const dirty = st.text.trim() || st.media.length;
        if (dirty && (editing || preset)) {
          const r = await this._alert({ title: editing ? 'Discard Changes?' : 'Discard Post?', buttons: [{ text: 'Keep Editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', value: true }] });
          if (!r.value) return;
        } else if (dirty && !editing) this._toast('Kept as a draft');
        st.media.filter(m => m.id && !m.existing).forEach(m => { if (!dirty || editing || preset) this._ws('discard_upload', { attachment_id: m.id }).catch(() => {}); });
        this._back(); return;
      }
      if (a === 'post') { submit(); return; }
      if (a === 'smart') { applySmart(); return; }
      if (a === 'nosmart') { smartNo = st.text.trim(); smart = null; render(); return; }
      if (a === 'unlink') { e.stopPropagation(); st.noLink = st.linkUrl; st.link = null; render(); return; }
      if (a === 'tochat') { page.leaving = true; this._back(); this._openShare(share); return; }
      if (a === 'page') {
        if (editing) return;
        const people = [...s.users.keys()].filter(u => u !== me && u !== HA_ID).sort((x, y) => this._fname(x).localeCompare(this._fname(y)));
        const v = await this._menu(e.target.closest('button'), [{ header: 'Whose Page' }, { text: 'Your Page', value: '__me__', checked: !st.page },
          ...people.map(u => ({ text: `${this._fname(u)}’s Page`, value: u, checked: st.page === u }))], { align: 'left' });
        if (!v) return;
        st.page = v === '__me__' ? null : v;
        // a post on their page is always shared with them
        if (st.page && st.audience.type === 'me') st.audience = { type: 'people', people: [st.page] };
        if (st.page && st.audience.type === 'people' && !st.audience.people.includes(st.page)) st.audience = { ...st.audience, people: [...st.audience.people, st.page] };
        if (st.page && st.audience.type === 'group') {
          const g = (s.feed?.groups || []).find(x => x.id === st.audience.group);
          if (g && !g.members.includes(st.page)) st.audience = { type: 'people', people: [st.page] };
        }
        render(); return;
      }
      if (a === 'aud') {
        if (st.album) { this._toast('Photos in an album are seen by the album’s audience'); return; }
        let aud = await this._faudienceSheet(st.audience, { me: !st.page });
        if (aud && st.page) {
          if (aud.type === 'people' && !aud.people.includes(st.page)) { aud = { ...aud, people: [...aud.people, st.page] }; this._toast(`${this._fname(st.page, true)} can always see posts on their page`); }
          if (aud.type === 'group' && !((s.feed?.groups || []).find(x => x.id === aud.group)?.members || []).includes(st.page)) { this._toast(`${this._fname(st.page, true)} isn’t in that group`); return; }
        }
        if (aud) { st.audience = aud; saveDraft(); render(); }
        return;
      }
      if (a === 'cmt') { const r = await this._fcommentersSheet(st.comment_audience, st.commenters); if (r) { st.comment_audience = r.comment_audience; st.commenters = r.commenters; saveDraft(); render(); } return; }
      if (a === 'remind') {
        const v = await this._menu(e.target.closest('[data-a]'), REMIND.map(([m, n]) => ({ text: n, value: String(m), checked: st.event.remind === m })), { align: 'right' });
        if (v !== null && v !== undefined) { st.event.remind = v === 'null' ? null : Number(v); render(); }
        return;
      }
      const kb = e.target.closest('[data-kind]');
      if (kb) { st.kind = kb.dataset.kind; if (st.kind !== 'post') st.bg = null; render(); saveDraft(); return; }
      const bgb = e.target.closest('[data-bg]');
      if (bgb) { st.bg = bgb.dataset.bg || null; render(); saveDraft(); return; }
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const m = st.media.splice(+rm.dataset.rm, 1)[0];
        if (m?.xhr && m.status === 'uploading') m.xhr.abort();
        if (m?.id) { delete st.tags[m.id]; this._ws('discard_upload', { attachment_id: m.id }).catch(() => {}); }
        render(); return;
      }
      const tg = e.target.closest('[data-tagm]');
      if (tg) { const m = st.media[+tg.dataset.tagm]; if (m?.id) { st.tags[m.id] = await this._ftagEditor(m, st.tags[m.id] || []); if (!st.tags[m.id].length) delete st.tags[m.id]; render(); } return; }
      const x = e.target.closest('[data-x]')?.dataset.x;
      if (x === 'feeling') { st.feeling = null; render(); saveDraft(); return; }
      if (x === 'home') { st.home = null; render(); return; }
      if (a === 'todo') {
        const todos = Object.values(this._hass?.states || {}).filter(x2 => x2.entity_id.startsWith('todo.'));
        const v = await this._menu(e.target.closest('[data-a]'), [{ text: 'No To-do List', value: '__none__', checked: !st.list.todo }, ...todos.map(x2 => ({ text: x2.attributes?.friendly_name || x2.entity_id, value: x2.entity_id, checked: st.list.todo === x2.entity_id }))], { align: 'right' });
        if (v) { st.list.todo = v === '__none__' ? '' : v; render(); }
        return;
      }
      if (t === 'home') {
        const got = await this._fhomeSheet(e.target.closest('button'));
        if (!got) return;
        st.home = got.home;
        if (got.file) addFiles([got.file]);
        render(); return;
      }
      if (x === 'place') { st.place = null; render(); saveDraft(); return; }
      if (t === 'media') { const files = await this._fpickFiles('image/*,video/*', true); if (files.length) addFiles(files); return; }
      if (t === 'ai') {
        const photos = st.media.filter(m => m.id && (m.mime || '').startsWith('image/') && !m.existing);
        const v = await this._menu(e.target.closest('button'), [
          ...(this._faiOn('captions') && photos.length ? [{ text: 'Suggest a Caption', value: 'caption', icon: FI.photo }] : []),
          ...(this._faiOn('writing') && st.text.trim() ? [{ header: 'Writing Tools' }, ...this._fwritingItems()] : []),
          ...(!(this._faiOn('captions') && photos.length) && !(this._faiOn('writing') && st.text.trim()) ? [{ header: this._faiOn('captions') ? 'Add a photo or write something first' : 'Write something first' }] : []),
        ], { align: 'left', above: true });
        if (!v) return;
        if (v === 'caption') {
          const caps = await this._fbusy('Looking at your photos…', () => this._fai('caption', { media: photos.map(m => m.id), text: st.text }));
          if (!caps?.length) return;
          const pick = await this._menu(e.target.closest('button'), caps.map((c, i) => ({ text: c, value: String(i) })), { align: 'left', above: true });
          if (pick == null) return;
          st.text = caps[+pick]; saveDraft(); render();
        } else if (v.startsWith('w:')) {
          const before = st.text;
          const out = await this._fbusy('Rewriting…', () => this._fai('rewrite', { text: st.text, style: v.slice(2) }));
          if (!out) return;
          st.text = out; saveDraft(); render();
          this._fundo('Rewritten', () => { st.text = before; saveDraft(); render(); });
        }
        return;
      }
      if (t === 'tag') {
        const imgs = st.media.filter(m => m.id && (m.mime || '').startsWith('image/'));
        if (!imgs.length) { this._toast('Add a photo to tag people in it'); return; }
        const m = imgs[0];
        st.tags[m.id] = await this._ftagEditor(m, st.tags[m.id] || []);
        if (!st.tags[m.id].length) delete st.tags[m.id];
        render(); return;
      }
      if (t === 'feeling') { const f = await this._ffeelingSheet(st.feeling); if (f !== undefined) { st.feeling = f; render(); saveDraft(); } return; }
      if (t === 'place') {
        const places = await this._places();
        if (!places.length) { this._toast('There are no zones in Home Assistant yet'); return; }
        const z = await this._choosePlace(e.target.closest('button'), places, st.place?.zone);
        if (z && z !== '__new__') { const p = places.find(x2 => x2.entity_id === z); st.place = { zone: z, name: p?.name || z }; render(); saveDraft(); }
        return;
      }
      if (t === 'at') {
        const uid = await this._fpickPerson(e.target.closest('button'), 'Mention');
        if (uid) { const ta = inner.querySelector('.fdc-text'); this._finsert(ta, `@${this._fname(uid)} `); if (!st.mentions.includes(uid)) st.mentions.push(uid); }
        return;
      }
      if (t === 'album') {
        const mine = (s.feed?.albums || []).filter(al => al.can_add);
        const v = await this._menu(e.target.closest('button'), [
          { header: 'Add to an Album' }, { text: 'No Album', value: '__none__', checked: !st.album },
          ...mine.map(al => ({ text: al.name, value: al.id, checked: st.album === al.id })),
          { sep: true }, { text: 'New Album…', value: '__new__', icon: FI.plus }], { align: 'right', above: true });
        if (!v) return;
        if (v === '__none__') st.album = null;
        else if (v === '__new__') { const al = await this._falbumSheet(null); if (al) st.album = al.id; }
        else st.album = v;
        render(); return;
      }
      if (t === 'schedule') { const when = await this._fscheduleSheet(st.scheduled_at); if (when !== undefined) { st.scheduled_at = when; render(); } }
    });
    page.onShow = async () => {
      if (page.shown) return;
      page.shown = true;
      if (share) {
        // the shared link (and anything typed with it) starts the post
        try {
          const item = (await this._ws('share/get', { share_id: share })).share;
          st.text = [comment || item.comment, item.url || item.text].filter(Boolean).join('\n');
          if (item.preview && item.url) { st.link = item.preview; st.linkUrl = item.url; }
          const prev = onPosted;
          onPosted = (post) => { this._ws('share/done', { share_id: share }).catch(() => {}); prev?.(post); };
        } catch (err) { this._toast(err.message || 'That shared link has expired'); }
      }
      render();
      checkLink();
      if (pickMedia) setTimeout(async () => { const files = await this._fpickFiles('image/*,video/*', true); if (files.length) addFiles(files); }, 50);
      else setTimeout(() => { const ta = inner.querySelector('.fdc-text'); if (ta && st.kind !== 'event' && st.kind !== 'fund') { try { ta.focus({ preventScroll: true }); } catch (e) { /* */ } } }, 350);
      // from Email: its photos, uploaded like ones chosen here
      if (preset?.files?.length) setTimeout(() => addFiles(preset.files), 50);
    };
    page.refresh = (what) => { if (what === 'fmeta') render(); };
    return page;
  },

  _ffeelingSheet(current) {
    return new Promise((resolve) => {
      let done = false;
      const grid = (list, activity) => `<div class="fd-feel">${list.map(([e, t]) => `<button data-e="${esc(e)}" data-t="${esc(t)}" data-act="${activity ? 1 : 0}" class="${current?.text === t ? 'on' : ''}"><span class="fe">${e}</span>${esc(t)}</button>`).join('')}</div>`;
      const sh = this._xsheet({ title: 'Feeling or Activity', body: `<div class="fd-h2" style="padding-left:4px">Feeling</div>${grid(FEELINGS, false)}<div class="fd-h2" style="padding-left:4px">Doing</div>${grid(ACTIVITIES, true)}${current ? '<button class="fd-more" data-clear>Remove</button>' : ''}` });
      sh.el.addEventListener('click', (e) => {
        if (e.target.closest('[data-clear]')) { done = true; sh.close(); resolve(null); return; }
        const b = e.target.closest('[data-e]'); if (!b) return;
        done = true; sh.close(); resolve({ emoji: b.dataset.e, text: b.dataset.t, activity: b.dataset.act === '1' });
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(undefined); };
    });
  },

  _fscheduleSheet(current) {
    return new Promise((resolve) => {
      let done = false;
      const d = current ? new Date(current) : new Date(Date.now() + 3600000);
      const sh = this._xsheet({
        title: 'Schedule Post', action: 'Done',
        body: `<div class="sgroup"><div class="gr"><div class="gl">Date</div><input type="date" class="gpill day" value="${isoDay(d)}" min="${isoDay(new Date())}"></div>
          <div class="gr"><div class="gl">Time</div><input type="time" class="gpill tm" value="${isoTime(d)}"></div></div>
          <div class="sfoot">The post appears in the Feed (and people are told about it) at this time. Until then only you can see it.</div>
          ${current ? '<button class="fd-more" data-now>Post Straight Away Instead</button>' : ''}`,
        onAction: () => {
          const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(sh.el.querySelector('.day').value || '');
          const [hh, mm] = (sh.el.querySelector('.tm').value || '09:00').split(':').map(Number);
          if (!m) { this._toast('Choose a date'); return false; }
          const at = new Date(+m[1], +m[2] - 1, +m[3], hh, mm).getTime();
          if (at < Date.now() + 60000) { this._toast('Choose a time in the future'); return false; }
          done = true; resolve(at);
        },
      });
      sh.el.addEventListener('click', (e) => { if (e.target.closest('[data-now]')) { done = true; sh.close(); resolve(null); } });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(undefined); };
    });
  },

  // Tag people: tap a photo where someone is, then choose who it is; tap a name to take it off
  _ftagEditor(m, tags) {
    return new Promise((resolve) => {
      let list = tags.map(t => ({ ...t }));
      const v = this._el(`<div class="fdv"><div class="top"><button class="pill g" data-a="done">Done</button><div class="title" style="color:#fff">Tag People</div><div style="width:70px"></div></div>
        <div class="hint">Tap someone in the photo</div><div class="stage"><img alt=""></div></div>`);
      this._root.appendChild(v);
      const img = v.querySelector('img'), stage = v.querySelector('.stage');
      const src = m.fullUrl || m.preview;
      if (src) img.src = src; else this._media(m.id, false).then(u => { img.src = u; }).catch(() => {});
      const paint = () => {
        stage.querySelectorAll('.tdot').forEach(x => x.remove());
        list.forEach((t, i) => { const dEl = this._el(`<span class="tdot" data-i="${i}">${esc(this._fname(t.uid, true))} ✕</span>`); dEl.style.left = `${t.x * 100}%`; dEl.style.top = `${t.y * 100}%`; stage.appendChild(dEl); });
      };
      v.addEventListener('click', async (e) => {
        if (e.target.closest('[data-a="done"]')) { v.remove(); resolve(list); return; }
        const dot = e.target.closest('.tdot');
        if (dot) { list.splice(+dot.dataset.i, 1); paint(); return; }
        if (e.target !== img) return;
        const r = img.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const uid = await this._fpickPerson(img, 'Who’s this?');
        if (!uid) return;
        list = list.filter(t => t.uid !== uid);
        list.push({ uid, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
        paint();
      });
      img.addEventListener('load', paint);
    });
  },

  // ── Photos and videos, full screen ──────────────────────────────────────────
  // items: [{ id, mime, post_id, author, ts }] · swipe or use the arrows · Tags shows who's tagged
  _fview(items, index = 0, { post = null } = {}) {
    if (!items.length) return;
    let i = clamp(index, 0, items.length - 1), showTags = false;
    const v = this._el(`<div class="fdv"><div class="top"><button class="cb g" data-a="close" aria-label="Close">${FI.x}</button><div class="title" style="color:#fff;font-size:15px"></div><div style="width:44px"></div></div>
      <div class="stage"></div>
      ${items.length > 1 ? `<button class="nav l" data-a="prev" aria-label="Previous">${FI.chevL}</button><button class="nav r" data-a="next" aria-label="Next">${FI.chevR}</button>` : ''}
      <div class="vbar"></div></div>`);
    this._root.appendChild(v);
    const stage = v.querySelector('.stage'), title = v.querySelector('.title'), vbar = v.querySelector('.vbar');
    const show = () => {
      const m = items[i];
      const p = this._fpost(m.post_id) || post;
      const video = (m.mime || '').startsWith('video/');
      title.innerHTML = `${esc(this._fname(m.author || p?.author || ''))}<div style="font-size:12px;font-weight:400;opacity:.7">${esc(m.label || fmtListDate(m.ts || p?.ts || Date.now(), this._hass))}${items.length > 1 ? ` · ${i + 1} of ${items.length}` : ''}</div>`;
      stage.innerHTML = video ? '<video controls playsinline autoplay preload="auto"></video>' : '<img alt="">';
      const media = stage.firstElementChild;
      (m.src ? Promise.resolve(this._picUrl(m.src)) : video ? this._fstream(m.id) : this._media(m.id, false)).then(u => { media.src = u; }).catch(() => { stage.innerHTML = `<div class="missing-img viewer-missing">${K.MISSING_Q}<span>No longer available</span></div>`; });
      // views (shown in Details): once per person, never the person who posted it
      const count = () => {
        this._fviewed = this._fviewed || new Set();
        const key = `${m.post_id}:${m.id}`;
        if (!m.post_id || this._fviewed.has(key) || (m.author || p?.author) === this._s.me) return;
        this._fviewed.add(key);
        this._ws('feed/media/view', { post_id: m.post_id, media_id: m.id }).catch(() => {});
      };
      if (video) media.addEventListener('play', count, { once: true }); else media.addEventListener('load', count, { once: true });
      const tags = p?.tags?.[m.id] || [];
      vbar.innerHTML = `<button data-a="save">${FI.share}Save</button>${!video && m.post_id && this._faiOn('photos') ? `<button data-a="describe">${FI.ai}Describe</button>` : ''}${tags.length && !video ? `<button data-a="tags">${FI.tag}${showTags ? 'Hide Tags' : `Tags (${tags.length})`}</button>` : ''}${m.post_id && this._stack[this._stack.length - 1]?.data?.pid !== m.post_id ? `<button data-a="post">${FI.comment}View Post</button>` : ''}`;
      if (showTags && !video) {
        const paint = () => { stage.querySelectorAll('.tdot').forEach(x => x.remove()); tags.forEach(t => { const d = this._el(`<span class="tdot" data-prof="${esc(t.uid)}">${esc(this._fname(t.uid, true))}</span>`); d.style.left = `${t.x * 100}%`; d.style.top = `${t.y * 100}%`; stage.appendChild(d); }); };
        media.addEventListener('load', paint);
        if (media.complete) paint();
      }
    };
    const go = (d) => { i = (i + d + items.length) % items.length; show(); };
    v.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close' || e.target === v) { v.querySelector('video')?.pause(); v.remove(); return; }
      if (a === 'prev') go(-1); else if (a === 'next') go(1);
      else if (a === 'save') { if (items[i].src) this._fsavePic(items[i].src, items[i].name); else this._saveAttachment(items[i].id, items[i].name || 'photo'); }
      else if (a === 'tags') { showTags = !showTags; show(); }
      else if (a === 'describe') {
        const m = items[i];
        v.querySelector('.fdv-desc')?.remove();
        this._fbusy('Looking at the photo…', () => this._fai('describe', { post_id: m.post_id, media_id: m.id })).then(t => {
          if (!t || !v.isConnected) return;
          const d = this._el(`<div class="fdv-desc">${FI.ai}<span>${esc(t)}</span></div>`);
          v.appendChild(d);
        });
      }
      else if (a === 'post') { v.querySelector('video')?.pause(); v.remove(); this._nav('fpost', { pid: items[i].post_id }); }
      const pr = e.target.closest('.tdot[data-prof]');
      if (pr) { v.remove(); this._nav('fprofile', { uid: pr.dataset.prof }); }
    });
    let sx = null;
    v.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', (e) => { if (sx === null || items.length < 2) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
    show();
  },

  // ── Press and hold a photo or video in a grid (Photos, Videos, a profile, an album) ──
  _fwireMediaHold(scope) {
    if (scope._fMediaHold) return;
    scope._fMediaHold = true;
    let timer = null, at = null;
    const target = (e) => { const gi = e.target.closest('.fd-grid .gi[data-gview]'); return gi && !gi.closest('.fd-grid.selecting') ? gi : null; };
    const fire = (gi) => { gi._heldAt = Date.now(); this._fmediaMenu(gi); };
    scope.addEventListener('pointerdown', (e) => {
      const gi = target(e);
      if (!gi || e.button > 0) return;
      at = { x: e.clientX, y: e.clientY };
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; gi.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 220 }); fire(gi); }, 460);
    });
    // scrolling is not a press and hold
    scope.addEventListener('pointermove', (e) => { if (timer && at && Math.hypot(e.clientX - at.x, e.clientY - at.y) > 8) { clearTimeout(timer); timer = null; } });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => scope.addEventListener(ev, () => { clearTimeout(timer); timer = null; }));
    scope.addEventListener('contextmenu', (e) => { const gi = target(e); if (gi) { e.preventDefault(); clearTimeout(timer); timer = null; fire(gi); } });
    // the tap that ends a press and hold doesn't also open the photo
    scope.addEventListener('click', (e) => { const gi = e.target.closest('.gi[data-gview]'); if (gi?._heldAt && Date.now() - gi._heldAt < 900) { e.stopPropagation(); e.preventDefault(); gi._heldAt = 0; } }, true);
    scope.addEventListener('dragstart', (e) => { if (target(e)) e.preventDefault(); });
  },

  _fcanDeleteMedia(author) { return author === this._s.me || !!this._s.isAdmin; },

  async _fmediaMenu(gi) {
    const aid = gi.dataset.gview, pid = gi.dataset.pid;
    if (!pid) return;
    const video = (gi.dataset.mime || '').startsWith('video/');
    const noun = video ? 'Video' : 'Photo';
    let p = this._fpost(pid);
    if (!p) { try { p = (await this._ws('feed/get', { post_id: pid })).post; this._fd.posts.set(pid, p); } catch (err) { this._toast(err.message); return; } }
    const me = this._s.me, mine = p.author === me;
    const tagged = (p.tags?.[aid] || []).some(t => t.uid === me);
    const albums = (this._s.feed?.albums || []).filter(a => a.can_add && a.id !== p.album);
    const myAlbum = p.album && (this._s.feed?.albums || []).find(a => a.id === p.album && a.owner === me);
    const items = [
      { text: 'Go to Post', value: 'post', icon: FI.comment },
      { text: `Save ${noun}`, value: 'download', icon: FI.share },
      { text: 'Send in a Chat', value: 'send', icon: FI.send },
      { text: p.saved ? 'Remove from Saved' : 'Save for Later', value: 'save', icon: p.saved ? FI.bookmarkFill : FI.bookmark },
      { text: 'Copy Link', value: 'link', icon: FI.copy },
      { sep: true },
      ...(mine && albums.length ? [{ text: 'Add to Album', icon: FI.album, sub: albums.map(a => ({ text: a.name, value: `album:${a.id}`, icon: FI.album })) }] : []),
      ...(myAlbum ? [{ text: `Make Album Cover`, value: 'cover', icon: FI.sparkle }] : []),
      { text: 'Who Can See This', value: 'aud', icon: this._faudIcon(p.audience) },
      ...(tagged ? [{ text: 'Remove Tag of Me', value: 'untag', icon: FI.tag }] : []),
      { text: 'Details', value: 'details', icon: FI.history },
      { text: 'Select…', value: 'select', icon: FI.checkCircle },
      ...(this._fcanDeleteMedia(p.author) ? [{ sep: true }, { text: `Delete ${noun}`, value: 'delete', icon: FI.trash, red: true }] : []),
    ];
    const preview = video ? '<video muted playsinline autoplay loop preload="auto"></video>' : '<img alt="">';
    const v = await this._menu(gi, items, {
      align: 'left', preview,
      onOpen: (wrap) => {
        const m = wrap.querySelector('.menu-pv video, .menu-pv img');
        if (!m) return;
        (video ? this._fstream(aid) : this._media(aid, false)).then(u => { m.src = u; }).catch(() => { m.closest('.menu-pv')?.remove(); });
      },
    });
    if (!v) return;
    const call = async (type, payload = {}) => {
      try { const r = await this._ws(type, { post_id: pid, ...payload }); if (r?.post) { this._fd.posts.set(pid, r.post); this._refresh('fpost', pid); } return r || {}; }
      catch (err) { this._toast(err.message); return null; }
    };
    if (v === 'post') this._nav('fpost', { pid, media: null });
    else if (v === 'download') this._saveAttachment(aid, video ? 'video' : 'photo');
    else if (v === 'send') this._fsendToChat(p);
    else if (v === 'save') { if (await call('feed/save', { on: !p.saved })) this._toast(p.saved ? 'Removed from Saved' : 'Saved for later'); }
    else if (v === 'link') {
      const url = `${window.location.origin}${window.location.pathname}?crow_post=${encodeURIComponent(pid)}&crow_media=${encodeURIComponent(aid)}`;
      try { await K.copyText(url); this._toast('Link copied. It opens for people this post is shared with.'); } catch (e) { this._toast('Copy isn’t available here'); }
    } else if (v.startsWith('album:')) {
      const al = albums.find(a => a.id === v.slice(6));
      const r = await call('feed/media/album', { media_id: aid, album_id: v.slice(6) });
      if (r?.post) { this._fd.posts.set(r.post.id, r.post); this._refresh('fnew', r.post.id); this._toast(`Added to ${al?.name || 'the album'}`); }
    } else if (v === 'cover') {
      try { await this._ws('feed/album/cover', { album_id: p.album, media_id: aid }); this._toast('Album cover changed'); } catch (err) { this._toast(err.message); }
    } else if (v === 'aud') {
      if (mine && !p.album) {
        const aud = await this._faudienceSheet(p.audience);
        if (aud) { await call('feed/edit', { audience: aud }); this._toast(`Now shared with ${this._faudText(aud, true)}`); }
      } else {
        const al = p.album && (this._s.feed?.albums || []).find(a => a.id === p.album);
        await this._alert({ title: 'Who Can See This', message: `${this._faudText(p.audience, true)}${al ? ` — it’s in the album “${al.name}”, so the album decides` : ''}.${mine ? '' : ` Only ${this._fname(p.author, true)} can change it.`}`, buttons: [{ text: 'OK', value: true }] });
      }
    } else if (v === 'untag') { if (await call('feed/untag', { media_id: aid })) this._toast('Tag removed'); }
    else if (v === 'details') this._fmediaDetails(pid, aid);
    else if (v === 'select') this._fselectGrid(gi);
    else if (v === 'delete') this._fdeleteMedia([{ aid, pid, author: p.author, video }]);
  },

  async _fmediaDetails(pid, aid) {
    let d;
    try { d = await this._ws('feed/media/details', { post_id: pid, media_id: aid }); } catch (err) { this._toast(err.message); return; }
    const video = (d.mime || '').startsWith('video/');
    const al = d.album && (this._s.feed?.albums || []).find(a => a.id === d.album);
    const row = (k, val) => val ? `<div class="gr" style="cursor:default"><div class="gl">${esc(k)}</div><div style="color:var(--cm-text2);text-align:right">${val}</div></div>` : '';
    const body = `<div class="group">
        <div class="gr" data-prof="${esc(d.author)}">${this._userAv(d.author, 32)}<div class="gl">${esc(this._fname(d.author))}<div style="font-size:13px;color:var(--cm-text2)">Posted ${esc(new Date(d.ts).toDateString() === new Date().toDateString() ? 'today' : fmtListDate(d.ts, this._hass))} at ${esc(fmtTime(d.ts, this._hass))}</div></div></div>
        ${row('Length', video && d.duration ? esc(fmtDur(d.duration)) : '')}
        ${row('Size', esc(K.fmtBytes(d.size) || ''))}
        ${row('Dimensions', d.width && d.height ? `${d.width} × ${d.height}` : '')}
        ${row('Shared With', `${this._faudIcon(d.audience)} ${esc(this._faudText(d.audience, true))}`)}
        ${row('Album', al ? esc(al.name) : '')}
        ${row(video ? 'Views' : 'Seen By', esc(String(d.views || 0)))}
      </div>
      ${d.viewers ? `<div class="fd-h2" style="padding-left:4px">${video ? 'Watched By' : 'Seen By'}</div>${d.viewers.length ? `<div class="group fd-ppl">${d.viewers.map(u => `<div class="pick-row" data-prof="${esc(u)}">${this._userAv(u, 36)}<div class="pn">${esc(this._fname(u))}</div></div>`).join('')}</div>` : '<div class="sfoot">No one yet.</div>'}<div class="sfoot">Only you can see who watched it.</div>` : ''}`;
    const sh = this._xsheet({ title: 'Details', body });
    sh.el.addEventListener('click', (e) => { const r = e.target.closest('[data-prof]'); if (r && r.dataset.prof !== HA_ID) { sh.close(); this._nav('fprofile', { uid: r.dataset.prof }); } });
  },

  // delete photos and videos: list of { aid, pid, author, video }
  async _fdeleteMedia(list) {
    list = list.filter(x => this._fcanDeleteMedia(x.author));
    if (!list.length) return false;
    const one = list.length === 1 ? list[0] : null;
    const noun = one ? (one.video ? 'Video' : 'Photo') : `${list.length} Items`;
    // a photo or video that is the whole post: ask about the post
    const p1 = one && this._fpost(one.pid);
    const onlyItem = p1 && (p1.kind || 'post') === 'post' && !(p1.text || '').trim() && !p1.link && (p1.media || []).filter(m => m.id !== one.aid && !m.removed).length === 0;
    const r = await this._alert({
      title: onlyItem ? 'Delete Post?' : `Delete ${noun}?`,
      message: onlyItem ? `This ${one.video ? 'video' : 'photo'} is all the post has, so the post is deleted too — for everyone, with its comments. It’s removed from Home Assistant and can’t be undone.`
        : one ? `It’s deleted for everyone and removed from Home Assistant. This can’t be undone.`
          : 'They’re deleted for everyone and removed from Home Assistant. A post with nothing else in it is deleted too. This can’t be undone.',
      buttons: [{ text: 'Cancel', style: 'cancel' }, { text: onlyItem ? 'Delete Post' : 'Delete', style: 'destructive', value: true }],
    });
    if (!r.value) return false;
    let done = 0;
    for (const x of list) {
      try {
        const res = await this._ws('feed/media/delete', { post_id: x.pid, media_id: x.aid, whole: true });
        if (res.deleted) { this._fd.posts.delete(x.pid); this._refresh('fgone', x.pid); }
        else if (res.post) { this._fd.posts.set(x.pid, res.post); this._refresh('fpost', x.pid); }
        this._refresh('fmedia_gone', x.aid);
        done++;
      } catch (err) { this._toast(err.message); }
    }
    if (done) this._toast(one ? `${one.video ? 'Video' : 'Photo'} deleted` : `${done} deleted`);
    return true;
  },

  // Select…: tick several photos and videos, then save or delete them together
  _fselectGrid(firstGi) {
    const grid = firstGi.closest('.fd-grid'), pageEl = firstGi.closest('.page');
    if (!grid || !pageEl || grid.classList.contains('selecting')) return;
    const sel = new Set([firstGi.dataset.gview]);
    grid.classList.add('selecting');
    const bar = this._el(`<div class="fsel-bar g${pageEl.querySelector('.fd-nav') ? ' over-nav' : ''}"><button data-s="cancel">Cancel</button><span class="n"></span><button data-s="save" aria-label="Save">${FI.share}</button><button data-s="delete" class="del" aria-label="Delete">${FI.trash}</button></div>`);
    pageEl.appendChild(bar);
    const cells = () => [...grid.querySelectorAll('.gi[data-gview]')];
    const picked = () => cells().filter(c => sel.has(c.dataset.gview));
    const paint = () => {
      cells().forEach(c => c.classList.toggle('sel', sel.has(c.dataset.gview)));
      bar.querySelector('.n').textContent = sel.size ? `${sel.size} Selected` : 'Select Items';
      bar.querySelector('[data-s="save"]').disabled = !sel.size;
      bar.querySelector('[data-s="delete"]').disabled = !picked().some(c => this._fcanDeleteMedia(c.dataset.author));
    };
    const pick = (e) => {
      const c = e.target.closest('.gi[data-gview]');
      if (!c || !grid.contains(c)) return;
      e.stopPropagation(); e.preventDefault();
      const id = c.dataset.gview;
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      paint();
    };
    const end = () => { grid.removeEventListener('click', pick, true); grid.classList.remove('selecting'); cells().forEach(c => c.classList.remove('sel')); bar.remove(); };
    grid.addEventListener('click', pick, true);
    bar.addEventListener('click', async (e) => {
      const s = e.target.closest('[data-s]')?.dataset.s;
      if (s === 'cancel') end();
      else if (s === 'save') { for (const c of picked()) await this._saveAttachment(c.dataset.gview, (c.dataset.mime || '').startsWith('video/') ? 'video' : 'photo'); end(); }
      else if (s === 'delete') {
        const list = picked().map(c => ({ aid: c.dataset.gview, pid: c.dataset.pid, author: c.dataset.author, video: (c.dataset.mime || '').startsWith('video/') }));
        const skipped = list.filter(x => !this._fcanDeleteMedia(x.author)).length;
        if (await this._fdeleteMedia(list)) { if (skipped) this._toast(`${skipped} not deleted — only the person who posted them can`); end(); }
      }
    });
    paint();
  },

  _fviewGrid(items, aid) {
    const i = items.findIndex(x => x.id === aid);
    this._fview(items.map(x => ({ ...x })), Math.max(0, i));
  },

  _fgridHtml(items, view) {
    if (!items?.length) return `<div class="empty"><b>No ${view === 'videos' ? 'Videos' : 'Photos'} Yet</b>${view === 'videos' ? 'Videos' : 'Photos'} in posts shared with you appear here.</div>`;
    return `<div class="fd-grid">${items.map(m => {
      if (this._missing.has(m.id)) return `<div class="gi missing">${K.MISSING_Q}</div>`;
      const video = (m.mime || '').startsWith('video/');
      const pic = video && !m.has_thumb ? `<video data-stream="${esc(m.id)}" muted playsinline preload="metadata"></video>` : `<img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt="" draggable="false">`;
      return `<div class="gi" data-gview="${esc(m.id)}" data-pid="${esc(m.post_id || '')}" data-author="${esc(m.author || '')}" data-mime="${esc(m.mime || '')}">${pic}${video ? `<span class="vplay">${FI.play}</span>${m.duration ? `<span class="vdur">${fmtDur(m.duration)}</span>` : ''}` : ''}</div>`;
    }).join('')}</div>`;
  },

  // ── Stories ─────────────────────────────────────────────────────────────────
  async _fnewStory() {
    let audience = this._fdefaultAudience(), bg = 'accent', mode = 'text', file = null, preview = null, done = false;
    const stickers = [];
    const sh = this._xsheet({
      title: 'Add to Your Story', action: 'Share',
      body: `<div class="segc2"><button data-m="text" class="on">Words</button><button data-m="media">Photo or Video</button></div>
        <div class="st-text"><textarea class="xfield st-t" rows="4" maxlength="300" placeholder="Say something…" style="resize:none;font-family:inherit"></textarea>
          <div class="fdc-bgs" style="padding:0 0 10px">${BACKGROUNDS.map(b => `<button class="bg-${b}${b === bg ? ' on' : ''}" data-bg="${b}"></button>`).join('')}</div></div>
        <div class="st-media" hidden><div class="st-prev" style="border-radius:16px;overflow:hidden;background:var(--cm-fill);min-height:160px;display:flex;align-items:center;justify-content:center;color:var(--cm-text2);margin-bottom:10px;cursor:pointer">Tap to choose a photo or video</div>
          <input class="xfield st-c" maxlength="300" placeholder="Add a caption (optional)"></div>
        ${this._fon('story_stickers') ? `<div class="st-stks"></div><button class="fd-more" data-a="stk" style="margin-bottom:12px">${FI.sticker} Add a Sticker</button>` : ''}
        <div class="sgroup"><div class="gr" role="button" data-aud><span class="gi aud-i">${FI.everyone}</span><div class="gl">Who can see it</div><div class="gv aud-t">Everyone at home</div></div></div>
        <div class="sfoot">Stories disappear after 24 hours. You can see who’s seen yours${this._fon('highlights') ? ', and keep the best in Highlights on your profile' : ''}.</div>`,
      onAction: async () => {
        const stk = stickers.map(({ label, ...k }) => k);
        try {
          if (mode === 'text') {
            const text = sh.el.querySelector('.st-t').value.trim();
            if (!text) { this._toast('Write something first'); return false; }
            await this._ws('feed/story/add', { text, bg, audience, ...(stk.length ? { stickers: stk } : {}) });
          } else {
            if (!file) { this._toast('Choose a photo or video'); return false; }
            const item = { name: file.name, mime: file.type };
            this._toast('Uploading…');
            await this._prepareAndUpload(file, item, null, () => {});
            await this._ws('feed/story/add', { media: item.id, text: sh.el.querySelector('.st-c').value.trim(), audience, ...(stk.length ? { stickers: stk } : {}) });
          }
          done = true;
          this._toast('Added to your story');
        } catch (err) { this._toast(err.message || 'Couldn’t add that'); return false; }
      },
    });
    const paintStk = () => { const box = sh.el.querySelector('.st-stks'); if (box) box.innerHTML = stickers.map((k, i) => `<span class="chip">${esc(k.label)}<button data-rmstk="${i}" aria-label="Remove">${FI.x}</button></span>`).join(''); };
    const pick = async () => {
      const files = await this._fpickFiles('image/*,video/*', false);
      if (!files.length) return;
      file = files[0];
      if (preview) URL.revokeObjectURL(preview);
      preview = URL.createObjectURL(file);
      sh.el.querySelector('.st-prev').innerHTML = file.type.startsWith('video/') ? `<video src="${preview}" muted playsinline style="width:100%;max-height:260px;object-fit:cover"></video>` : `<img src="${preview}" style="width:100%;max-height:260px;object-fit:cover" alt="">`;
    };
    sh.el.addEventListener('click', async (e) => {
      const m = e.target.closest('[data-m]');
      if (m) { mode = m.dataset.m; sh.el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b === m)); sh.el.querySelector('.st-text').hidden = mode !== 'text'; sh.el.querySelector('.st-media').hidden = mode === 'text'; if (mode === 'media' && !file) pick(); return; }
      const b = e.target.closest('[data-bg]');
      if (b) { bg = b.dataset.bg; sh.el.querySelectorAll('[data-bg]').forEach(x => x.classList.toggle('on', x === b)); return; }
      if (e.target.closest('.st-prev')) { pick(); return; }
      const rm = e.target.closest('[data-rmstk]');
      if (rm) { stickers.splice(+rm.dataset.rmstk, 1); paintStk(); return; }
      if (e.target.closest('[data-a="stk"]')) {
        if (stickers.length >= 3) { this._toast('Up to 3 stickers on a story'); return; }
        const k = await this._fstickerPick(e.target.closest('button'), audience);
        if (k) { k.y = clamp(k.y + stickers.length * 0.14, 0.12, 0.85); stickers.push(k); paintStk(); }
        return;
      }
      if (e.target.closest('[data-aud]')) {
        const aud = await this._faudienceSheet(audience, { me: false });
        if (aud) { audience = aud; sh.el.querySelector('.aud-i').innerHTML = this._faudIcon(aud); sh.el.querySelector('.aud-t').textContent = this._faudText(aud, true); }
      }
    });
    void done;
  },

  // play one person's stories, then carry on to the next person's.
  // highlight: { owner, h } plays a highlight from someone's profile instead
  _fplayStories(startUid, { startId = null, highlight = null } = {}) {
    const fd = this._fd, me = this._s.me;
    const by = new Map();
    if (highlight) by.set(highlight.owner, highlight.h.items.map(x => ({ ...x, author: highlight.owner, seen: true, hl: true })));
    else fd.stories.forEach(st => { if (!by.has(st.author)) by.set(st.author, []); by.get(st.author).push(st); });
    const order = [...by.keys()].sort((a, b) => (a === me ? -1 : b === me ? 1 : 0) || (by.get(a).every(x => x.seen) - by.get(b).every(x => x.seen)));
    let ui = order.indexOf(startUid), si = 0, timer = null, started = 0, dur = 5000, paused = false, left = 0;
    if (ui < 0) return;
    const firstUnseen = by.get(startUid).findIndex(x => !x.seen);
    si = startId ? Math.max(0, by.get(startUid).findIndex(x => x.id === startId)) : firstUnseen > 0 ? firstUnseen : 0;
    const v = this._el(`<div class="fds"><div class="bars"></div><div class="shd"></div><div class="sbody"></div><div class="tap l"></div><div class="tap r"></div><div class="sfoot"></div></div>`);
    this._root.appendChild(v);
    const bars = v.querySelector('.bars'), head = v.querySelector('.shd'), sbody = v.querySelector('.sbody'), foot = v.querySelector('.sfoot');
    const close = () => { clearTimeout(timer); cancelAnimationFrame(raf); clearInterval(cdTimer); v.querySelector('video')?.pause(); v.remove(); this._refresh('fstories'); };
    let raf = 0;
    const cdTimer = setInterval(() => v.querySelectorAll('[data-cd]').forEach(x => { x.textContent = this._fcountdown(+x.dataset.cd); }), 1000);
    const tick = () => {
      const bar = bars.children[si]?.firstElementChild;
      if (bar && !paused) bar.style.width = `${clamp((Date.now() - started) / dur * 100, 0, 100)}%`;
      raf = requestAnimationFrame(tick);
    };
    const next = () => {
      const list = by.get(order[ui]);
      if (si < list.length - 1) { si++; show(); }
      else if (ui < order.length - 1) { ui++; si = 0; show(); }
      else close();
    };
    const prev = () => {
      if (si > 0) { si--; show(); }
      else if (ui > 0) { ui--; si = by.get(order[ui]).length - 1; show(); }
      else show();
    };
    const arm = (ms) => { clearTimeout(timer); dur = ms; started = Date.now(); timer = setTimeout(next, ms); };
    const cur = () => by.get(order[ui])[si];
    const live = (st) => fd.stories.find(x => x.id === st.id) || st;
    const paintFoot = () => {
      const uid = order[ui], st = live(cur());
      if (highlight) { foot.innerHTML = uid === me ? `<button data-s="hlrm">${FI.trash}Remove From Highlight</button>` : ''; return; }
      if (uid === me) {
        const nV = Object.keys(st.views || {}).length, nR = Object.keys(st.reactions || {}).length;
        foot.innerHTML = `<button data-s="viewers">${FI.members}Seen by ${nV}${nR ? ` · ${nR} ${Object.values(st.reactions)[0]}` : ''}</button>${this._fon('highlights') ? `<button data-s="highlight">${FI.highlight}${st.highlighted ? 'In a Highlight' : 'Highlight'}</button>` : ''}`;
      } else if (this._fon('story_replies')) {
        foot.innerHTML = `<input placeholder="Reply to ${esc(this._fname(uid, true))}…" enterkeyhint="send"><div class="emo">${STORY_EMOJI.slice(0, 4).map(e => `<button data-emo="${e}" class="${st.my_reaction === e ? 'on' : ''}">${e}</button>`).join('')}<button data-s="moreemo" aria-label="More reactions">${FI.plus}</button></div>`;
      } else foot.innerHTML = '';
    };
    const show = () => {
      const uid = order[ui], list = by.get(uid), st = live(list[si]);
      bars.innerHTML = list.map((x, k) => `<i><b style="width:${k < si ? 100 : 0}%"></b></i>`).join('');
      head.innerHTML = `${this._userAv(uid, 34)}<span>${esc(highlight ? highlight.h.name : uid === me ? 'Your Story' : this._fname(uid, true))}</span><span class="t">${esc(highlight ? fmtListDate(st.ts, this._hass) : this._fwhen(st.ts))}</span><span class="sp"></span>
        ${uid === me && !highlight ? `<button data-s="del" aria-label="Delete">${FI.trash}</button>` : ''}<button data-s="close" aria-label="Close">${FI.x}</button>`;
      if (st.media && !st.media.removed) {
        const video = (st.media.mime || '').startsWith('video/');
        sbody.innerHTML = `${video ? '<video playsinline autoplay></video>' : '<img alt="">'}${st.text ? `<div class="sover">${esc(st.text)}</div>` : ''}`;
        const media = sbody.querySelector('img,video');
        (video ? this._fstream(st.media.id) : this._media(st.media.id, false)).then(u => { media.src = u; }).catch(() => {});
        if (video) { media.addEventListener('loadedmetadata', () => arm(Math.min(60, media.duration || 15) * 1000)); arm(15000); } else arm(6000);
      } else {
        sbody.innerHTML = `<div class="stext bg-${esc(st.bg || 'accent')}">${esc(st.text)}</div>`;
        arm(Math.max(5000, Math.min(12000, (st.text || '').length * 90)));
      }
      if (!highlight) sbody.insertAdjacentHTML('beforeend', this._fstickersHtml(st));
      if ((st.stickers || []).some(k => k.type === 'poll' || k.type === 'question')) arm(Math.max(dur, 9000));
      paintFoot();
      if (!highlight && !st.seen && uid !== me) { st.seen = true; this._ws('feed/story/seen', { story_id: st.id }).catch(() => {}); }
    };
    const pause = (on) => {
      if (on === paused) return;
      paused = on;
      const video = v.querySelector('video');
      if (on) { left = Math.max(0, dur - (Date.now() - started)); clearTimeout(timer); video?.pause(); }
      else { started = Date.now() - (dur - left); timer = setTimeout(next, left); video?.play().catch(() => {}); }
    };
    const update = (story) => { fd.stories = fd.stories.map(x => (x.id === story.id ? story : x)); const list = by.get(order[ui]); list[si] = story; };
    const reply = async (text) => {
      const st = cur();
      if (!text.trim()) return;
      try { await this._ws('feed/story/reply', { story_id: st.id, text: text.trim() }); this._toast('Sent in Messages'); }
      catch (err) { this._toast(err.message); }
    };
    const react = async (emoji) => {
      const st = live(cur());
      try { const r = await this._ws('feed/story/react', { story_id: st.id, emoji: st.my_reaction === emoji ? null : emoji }); update(r.story); paintFoot(); if (r.story.my_reaction) { const f = this._el(`<div style="position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);font-size:90px;z-index:9;pointer-events:none">${emoji}</div>`); v.appendChild(f); f.animate([{ opacity: 0, transform: 'translate(-50%,-30%) scale(.5)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.15)' }, { opacity: 0, transform: 'translate(-50%,-90%) scale(1)' }], { duration: 1100 }).onfinish = () => f.remove(); } }
      catch (err) { this._toast(err.message); }
    };
    v.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-s]')?.dataset.s;
      if (a === 'close') { close(); return; }
      const prof = e.target.closest('.stk [data-prof]');
      if (prof) { close(); this._nav('fprofile', { uid: prof.dataset.prof }); return; }
      const vote = e.target.closest('[data-vote]');
      if (vote) {
        const st = live(cur());
        try { const r = await this._ws('feed/story/sticker', { story_id: st.id, sticker_id: vote.dataset.stk, vote: +vote.dataset.vote }); update(r.story); show(); } catch (err) { this._toast(err.message); }
        return;
      }
      const ask = e.target.closest('[data-ask]');
      if (ask) {
        pause(true);
        const r = await this._alert({ title: 'Answer', input: { placeholder: 'Type your answer' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', value: true }] });
        if (r.value && r.input?.trim()) { try { const x = await this._ws('feed/story/sticker', { story_id: cur().id, sticker_id: ask.dataset.stk, answer: r.input.trim() }); update(x.story); show(); this._toast('Sent'); } catch (err) { this._toast(err.message); } }
        pause(false);
        return;
      }
      const ans = e.target.closest('[data-stkans]');
      if (ans) {
        pause(true);
        const k = (live(cur()).stickers || []).find(x => x.id === ans.dataset.stkans);
        this._xsheet({ title: 'Answers', body: (k?.answers || []).length ? `<div class="group fd-viewers">${k.answers.map(x => `<div class="vr">${this._userAv(x.uid, 32)}<div class="pn"><b>${esc(this._fname(x.uid, true))}</b><div>${esc(x.text)}</div></div></div>`).join('')}</div><div class="sfoot">Only you can see these answers.</div>` : '<div class="empty" style="padding:30px">No answers yet.</div>' });
        return;
      }
      const emo = e.target.closest('[data-emo]');
      if (emo) { react(emo.dataset.emo); return; }
      if (a === 'moreemo') {
        const pick = await this._menu(e.target.closest('button'), STORY_EMOJI.map(x => ({ text: x, value: x })), { align: 'right', above: true });
        if (pick) react(pick);
        return;
      }
      if (a === 'del') {
        pause(true);
        const st = cur();
        const r = await this._alert({ title: 'Delete This Story?', message: st.highlighted ? 'It stays in your highlight.' : '', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
        if (r.value) { try { await this._ws('feed/story/delete', { story_id: st.id }); } catch (err) { this._toast(err.message); } close(); }
        else pause(false);
        return;
      }
      if (a === 'highlight') {
        pause(true);
        if (await this._fhighlightAdd(e.target.closest('button'), cur())) { const st = live(cur()); st.highlighted = true; paintFoot(); }
        pause(false);
        return;
      }
      if (a === 'hlrm') {
        pause(true);
        const it = cur();
        const r = await this._alert({ title: 'Remove From Highlight?', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', value: true }] });
        if (r.value) { try { await this._ws('feed/highlight', { highlight_id: highlight.h.id, remove_item: it.id }); this._refresh('fhighlights'); close(); } catch (err) { this._toast(err.message); } }
        else pause(false);
        return;
      }
      if (a === 'viewers') {
        pause(true);
        const st = live(cur());
        const views = st.views || {}, rx = st.reactions || {}, rp = st.replies || {};
        const who = [...new Set([...Object.keys(views), ...Object.keys(rx), ...Object.keys(rp)])].sort((x, y) => (views[y] || 0) - (views[x] || 0));
        const sh = this._xsheet({ title: `Seen by ${Object.keys(views).length}`, body: who.length ? `<div class="group fd-viewers">${who.map(u => `<div class="vr" data-prof="${esc(u)}">${this._userAv(u, 36)}<div class="pn">${esc(this._fname(u))}</div>${rx[u] ? `<span class="em">${esc(rx[u])}</span>` : ''}${rp[u] ? `<span class="rp" title="Replied">${FI.reply}</span>` : ''}</div>`).join('')}</div><div class="sfoot">Replies arrive in Messages.</div>` : '<div class="empty" style="padding:30px">No one yet.</div>' });
        sh.el.addEventListener('click', (ev) => { const r = ev.target.closest('[data-prof]'); if (r) { sh.close(); close(); this._nav('fprofile', { uid: r.dataset.prof }); } });
        return;
      }
      if (e.target.closest('.tap.l')) { prev(); return; }
      if (e.target.closest('.tap.r')) { next(); }
    });
    v.addEventListener('focusin', (e) => { if (e.target.tagName === 'INPUT') pause(true); });
    v.addEventListener('focusout', (e) => { if (e.target.tagName === 'INPUT') pause(false); });
    v.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' && e.key === 'Enter') { reply(e.target.value); e.target.value = ''; e.target.blur(); } });
    v.addEventListener('pointerdown', (e) => { if (e.target.closest('.sbody') && !e.target.closest('.stk')) pause(true); });
    v.addEventListener('pointerup', (e) => { if (e.target.closest('.sbody') && !e.target.closest('.stk')) pause(false); });
    show();
    tick();
  },
});

Object.assign(Card.prototype, {

  // ── Groups, albums and events in the Feed's tabs ───────────────────────────
  _fgroupsHtml() {
    const groups = this._s.feed?.groups || [];
    return `<div class="fd-card">${groups.map(g => `<div class="fd-row" data-fgo="group" data-id="${esc(g.id)}"><span class="ri">${g.photo ? `<img src="${esc(g.photo)}" alt="">` : FI.group}</span>
        <div class="rb"><div class="r1">${esc(g.name)}</div><div class="r2">${plural(g.members.length, 'member')}${g.about ? ` · ${esc(g.about)}` : ''}</div></div><span class="rch">${FI.chevR}</span></div>`).join('')}
      <div class="fd-row" data-a="newgroup"><span class="ri">${FI.plus}</span><div class="rb"><div class="r1" style="color:var(--cm-accent)">New Group</div><div class="r2">A smaller space for some of the household</div></div></div></div>
      ${groups.length ? '' : '<div class="xnote" style="text-align:center">Groups are for posts just between some of you — “Parents”, “The kids”, “Garden”. Only members see them.</div>'}`;
  },

  _falbumsHtml() {
    const albums = this._s.feed?.albums || [];
    const cover = (c) => !c || c.removed ? FI.album : (c.mime || '').startsWith('video/') && !c.has_thumb ? `<video data-stream="${esc(c.id)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>` : `<img data-att="${esc(c.id)}" data-thumb="${c.has_thumb ? 1 : 0}" alt="">`;
    return `<div class="fd-albums">${albums.map(a => `<div class="fd-al" data-fgo="album" data-id="${esc(a.id)}"><div class="ac">${cover(a.cover)}</div>
        <div class="an">${esc(a.name)}</div><div class="as">${this._faudIcon(a.audience)}${plural(a.count, 'item')}</div></div>`).join('')}
      <div class="fd-al new" data-a="newalbum"><div class="ac">${FI.plus}</div><div class="an">New Album</div><div class="as">Several people can add to it</div></div></div>`;
  },

  _feventsHtml(posts) {
    const now = Date.now() - 3 * 3600000;
    const evs = (posts || []).filter(p => p.event);
    const up = evs.filter(p => (p.event.end || p.event.start) >= now).sort((a, b) => a.event.start - b.event.start);
    const past = evs.filter(p => (p.event.end || p.event.start) < now).sort((a, b) => b.event.start - a.event.start);
    if (!evs.length) return '<div class="empty"><b>No Events</b>Events shared with you appear here. Tap New Post → Event to make one.</div>';
    return `${up.length ? `<div class="fd-h2">Coming Up</div>${up.map(p => this._fpostHtml(p)).join('')}` : ''}${past.length ? `<div class="fd-h2">Past</div>${past.map(p => this._fpostHtml(p)).join('')}` : ''}`;
  },

  // ── Page: someone's profile ────────────────────────────────────────────────
  // Friends on a profile: everyone else in the household (yours: favourites first, then by name)
  _ffriends(uid) {
    const s = this._s, favs = uid === s.me && this._favUids ? this._favUids() : new Set();
    return [...s.users.keys()].filter(u => u !== uid && u !== HA_ID && !s.users.get(u)?.hidden)
      .sort((x, y) => (favs.has(y) - favs.has(x)) || (x === s.me ? -1 : y === s.me ? 1 : 0) || this._fname(x).localeCompare(this._fname(y)));
  },
  _ffriendsHtml(uid, list) {
    const me = this._s.me;
    return `<div class="fp-friends"><div class="ih"><span>Friends</span>${list.length > 0 ? '<button data-a="friends">See All</button>' : ''}</div>
      <div class="fs">${plural(list.length, 'friend')}</div>
      <div class="fg">${list.slice(0, 8).map(u => `<button class="ff" data-prof="${esc(u)}">${this._userAv(u, 78)}<span>${esc(u === me ? 'You' : this._fname(u))}</span></button>`).join('')}</div></div>`;
  },
  _ffriendsSheet(uid) {
    const s = this._s, list = this._ffriends(uid), me = s.me;
    const row = (u) => `<div class="pick-row" data-prof="${esc(u)}">${this._userAv(u, 40)}<div class="pn">${esc(u === me ? 'You' : this._fname(u))}${this._presenceText?.(u) ? `<div style="font-size:13px;color:var(--cm-text2);font-weight:400">${esc(this._presenceText(u))}</div>` : ''}</div>${u !== me ? `<button class="ffmsg" data-msg="${esc(u)}" aria-label="Message">${FI.chat}</button>` : ''}</div>`;
    const sh = this._xsheet({ title: uid === me ? 'Your Friends' : `${this._fname(uid, true)}’s Friends`,
      body: `<input class="ffq" type="search" placeholder="Search Friends" autocomplete="off"><div class="fd-h2" style="padding-left:4px">${plural(list.length, 'friend')}</div><div class="group fd-ppl ffl">${list.map(row).join('')}</div>` });
    this._fhy(sh.el);
    const q = sh.el.querySelector('.ffq');
    q?.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); sh.el.querySelectorAll('.ffl [data-prof]').forEach(r => { r.hidden = !!t && !this._fname(r.dataset.prof).toLowerCase().includes(t); }); });
    sh.el.addEventListener('click', (e) => {
      const m = e.target.closest('[data-msg]');
      if (m) { e.stopPropagation(); sh.close(); this._messageUser(m.dataset.msg); return; }
      const r = e.target.closest('[data-prof]');
      if (r) { sh.close(); if (r.dataset.prof !== uid) this._nav('fprofile', { uid: r.dataset.prof }); }
    });
  },

  _pg_fprofile({ uid, tab = 'posts' }) {
    this._feedSetup();
    const s = this._s, me = uid === s.me;
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="fd-hero"><div class="cover"></div><div class="hav"></div><div class="hn">${esc(this._fname(uid))}</div><div class="fp-fcount"></div><div class="fp-badges"></div><div class="hs"></div><div class="hb"></div></div>
        <div class="fp-hlbox"></div><div class="fp-introbox"></div><div class="fp-friendsbox"></div>
        <div class="fd-tabs">${[['posts', 'Posts'], ['photos', 'Photos'], ['videos', 'Videos'], ['albums', 'Albums'], ['events', 'Events']].map(([v, n]) => `<button data-tab="${v}">${n}</button>`).join('')}</div>
        <div class="fd-body"><div class="fd-loading">Loading…</div></div></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.fd-body');
    let order = [], more = false, media = null, loading = false, info = null;
    const snoozed = () => { const h = s.feed?.prefs?.hidden || {}; return uid in h; };
    // Intro, Featured photos, Highlights and badges (each only as this person may see them)
    const extras = () => {
      el.querySelector('.fp-introbox').innerHTML = this._fintroHtml(info, me);
      el.querySelector('.fp-hlbox').innerHTML = this._fhighlightsHtml(info, me);
      el.querySelector('.fp-badges').innerHTML = (info?.badges || []).map(b => `<span title="This week">${esc(b.emoji)} ${esc(b.name)}</span>`).join('');
      this._fhy(el.querySelector('.fp-introbox')); this._fhy(el.querySelector('.fp-hlbox'));
      friends();
      head();
    };
    // Friends, like Facebook: everyone else at home, with a count under the name
    const friends = () => {
      const list = this._ffriends(uid);
      const on = this._fon('friends') && list.length;
      el.querySelector('.fp-fcount').innerHTML = on ? `<button data-a="friends">${plural(list.length, 'friend')}</button>` : '';
      el.querySelector('.fp-friendsbox').innerHTML = on ? this._ffriendsHtml(uid, list) : '';
    };
    const loadInfo = async () => { try { info = await this._ws('feed/profile', { user_id: uid }); } catch (err) { info = null; } if (el.isConnected) extras(); };
    // the cover photo and the profile photo (yours: a camera on each, like Facebook)
    let repos = null;
    const coverOf = () => { const c = s.users.get(uid)?.cover; return c && this._coversOn() ? c : null; };
    const top = () => {
      const c = coverOf(), hero = el.querySelector('.fd-hero');
      if (repos) return;
      hero.classList.remove('repos');
      const cv = el.querySelector('.cover');
      cv.className = `cover${c ? ' has' : ''}${me && this._coversOn() ? ' mine' : ''}`;
      cv.innerHTML = `${c ? `<img data-att="${esc(c.id)}" alt="" style="object-position:50% ${+c.y || 50}%">` : ''}${me && this._coversOn() ? `<button class="cvbtn" data-a="cover" aria-label="Cover photo">${FI.camera}${c ? 'Edit' : 'Add Cover Photo'}</button>` : ''}`;
      el.querySelector('.hav').innerHTML = `${this._userAv(uid, 96)}${me ? `<button class="avbtn" data-a="avatar" aria-label="Profile photo">${FI.camera}</button>` : ''}`;
      el.querySelector('.hn').textContent = this._fname(uid);
      this._fhy(cv);
    };
    const coverMenu = async (anchor) => {
      const c = coverOf();
      const v = await this._menu(anchor, [
        { text: c ? 'Upload a New Photo' : 'Upload Photo', value: 'up', icon: FI.upload },
        ...(c ? [{ text: 'Reposition', value: 'move', icon: FI.move }, { text: 'View Photo', value: 'view', icon: FI.photo }, { sep: true }, { text: 'Remove Cover Photo', value: 'rm', icon: FI.trash, style: 'destructive' }] : []),
      ], { align: 'right' });
      if (v === 'up') {
        const [f] = await this._fpickFiles('image/*', false);
        // a new cover is only a preview until Save: Cancel puts the old one back and deletes the upload
        if (f) this._fsetCover(f, { onPreview: (fresh) => startRepos(fresh) });
      } else if (v === 'move') startRepos();
      else if (v === 'view') this._fview([{ id: c.id, mime: 'image/jpeg', author: uid, name: 'cover.jpg', label: 'Cover Photo' }], 0);
      else if (v === 'rm') {
        const r = await this._alert({ title: 'Remove Your Cover Photo?', message: 'It’s deleted from the server, and your profile goes back to the plain banner.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', value: true }] });
        if (!r.value) return;
        try { await this._ws('profile/set', { cover: null }); const u = s.users.get(uid); if (u) u.cover = null; top(); this._toast('Cover photo removed'); } catch (err) { this._toast(err.message); }
      }
    };
    // drag the cover up or down, then Save (fresh: a new upload, not used until Save)
    const startRepos = (fresh = null) => {
      const c = coverOf();
      if (!c && !fresh) return;
      const hero = el.querySelector('.fd-hero'), cv = el.querySelector('.cover');
      if (fresh) {
        cv.querySelector('img')?.remove();
        cv.insertAdjacentHTML('afterbegin', `<img alt="" src="${esc(fresh.url)}" style="object-position:50% 50%">`);
        cv.classList.add('has');
      }
      const img = cv.querySelector('img');
      if (!img) return;
      const y0 = fresh ? 50 : (+c.y || 50);
      repos = { y: y0, start: y0, fresh };
      hero.classList.add('repos');
      cv.querySelector('.cvbtn')?.remove();
      cv.insertAdjacentHTML('beforeend', `<div class="rp-hint">${FI.move}Drag to Reposition</div><div class="rp-bar"><button data-a="rpcancel">Cancel</button><button class="save" data-a="rpsave">Save</button></div>`);
      let at = null;
      const range = () => Math.max(1, img.naturalWidth && img.naturalHeight ? cv.clientWidth / img.naturalWidth * img.naturalHeight - cv.clientHeight : cv.clientHeight);
      const down = (e) => { if (e.target.closest('button')) return; at = { y: e.clientY, from: repos.y }; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ } cv.querySelector('.rp-hint')?.remove(); };
      const move = (e) => { if (!at || (!e.buttons && e.pointerType === 'mouse')) return; repos.y = clamp(at.from - (e.clientY - at.y) / range() * 100, 0, 100); img.style.objectPosition = `50% ${repos.y}%`; };
      const up = () => { at = null; };
      cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      repos.off = () => { cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
    };
    const endRepos = async (save) => {
      if (!repos) return;
      const r = repos; r.off(); repos = null;
      if (r.fresh) {
        const { id, url, blob } = r.fresh;
        if (!save) {
          // Cancel: the old cover stays, the upload is deleted
          this._ws('discard_upload', { attachment_id: id }).catch(() => {});
          URL.revokeObjectURL(url);
          top();
          return;
        }
        const y = Math.round(r.y * 10) / 10;
        try {
          await this._ws('profile/set', { cover: { id, y } });
          const u = s.users.get(uid); if (u) u.cover = { id, y };
        } catch (err) { this._toast(err.message); this._ws('discard_upload', { attachment_id: id }).catch(() => {}); top(); return; }
        // keep showing the picture already here while the saved one loads
        top();
        const im = el.querySelector('.cover img'); if (im) { im.src = url; setTimeout(() => URL.revokeObjectURL(url), 60000); }
        if (s.feed?.enabled) {
          const share = await this._alert({ title: 'Share to Feed?', message: 'Post your new cover photo in the Feed too, for everyone at home.', buttons: [{ text: 'Not Now', style: 'cancel' }, { text: 'Share', value: true }] });
          if (share.value) this._fshareProfilePic(blob, 'Updated my cover photo');
        }
        return;
      }
      if (save && Math.abs(r.y - r.start) > 0.2) {
        const y = Math.round(r.y * 10) / 10, c = s.users.get(uid)?.cover;
        if (c) c.y = y;
        try { await this._ws('profile/set', { cover_y: y }); } catch (err) { this._toast(err.message); }
      }
      top();
    };
    const viewPhoto = () => { const pic = this._userPic(uid); if (pic) this._fview([{ src: pic, mime: 'image/jpeg', author: uid, name: 'profile.jpg', label: 'Profile Photo' }], 0); };
    const avatarMenu = async (anchor) => {
      const p = s.profile || {}, pic = this._userPic(uid);
      const v = await this._menu(anchor, [
        { text: 'Choose Photo…', value: 'pick', icon: FI.photo },
        { text: 'Take Photo…', value: 'camera', icon: FI.camera },
        ...(p.photo ? [{ text: 'Use My Home Assistant Picture', value: 'ha', icon: FI.undo }] : []),
        ...(pic ? [{ text: 'View Photo', value: 'view', icon: FI.profile }] : []),
      ], { align: 'left' });
      if (v === 'pick' || v === 'camera') {
        const [f] = await this._fpickFiles('image/*', false, v === 'camera' ? 'user' : null);
        if (f) this._fsetPhoto(f);
      } else if (v === 'ha') {
        try { await this._setMyPhoto(null); this._toast('Back to your Home Assistant picture'); } catch (err) { this._toast(err.message); }
      } else if (v === 'view') viewPhoto();
    };
    this._fprofileTop = top;
    const head = () => {
      top();
      const pres = me ? 'This is how your posts look to others. Each one only shows to the people you shared it with.' : (this._presenceText?.(uid) || '');
      el.querySelector('.hs').textContent = pres;
      el.querySelector('.hb').innerHTML = me
        ? `<button class="prim" data-a="new">${FI.edit}New Post</button><button data-a="settings">${FI.settings}Feed Settings</button>`
        : `${this._fopt().page_posts ? `<button class="prim" data-a="onpage">${FI.edit}Post on Their Page</button>` : ''}<button data-a="msg">${FI.chat}Message</button><button data-a="follow" aria-label="Get Notified">${info?.following ? FI.bellFill : FI.bell}${info?.following ? 'Notified' : 'Get Notified'}</button>${this._fon('waves') ? (info?.waved && Date.now() - info.waved < 3600000 ? `<button class="waved" data-a="wave">👋 Waved</button>` : `<button data-a="wave">👋 Wave</button>`) : ''}<button data-a="snooze">${FI.eyeOff}${snoozed() ? 'Show Their Posts' : 'Hide for 30 Days'}</button>`;
    };
    const render = () => {
      el.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      if (tab === 'posts') {
        const posts = order.map(id => this._fpost(id)).filter(Boolean);
        body.innerHTML = posts.length ? (me ? `<button class="fd-more" data-a="manage" style="margin-bottom:10px">${FI.select} Manage Posts</button>` : '') + posts.map(p => this._fpostHtml(p)).join('') + (more ? '<button class="fd-more" data-a="more">Show More</button>' : '')
          : loading ? '<div class="fd-loading">Loading…</div>' : `<div class="empty"><b>No Posts</b>${me ? 'Your posts, and posts people put on your page, appear here.' : `Posts by ${esc(this._fname(uid, true))}, and posts on their page, that are shared with you appear here.`}</div>`;
      } else if (tab === 'photos' || tab === 'videos') body.innerHTML = media ? this._fgridHtml(media.items, tab) : '<div class="fd-loading">Loading…</div>';
      else if (tab === 'albums') {
        const albums = (s.feed?.albums || []).filter(a => a.owner === uid || (a.contributors || []).includes(uid));
        body.innerHTML = albums.length ? `<div class="fd-albums">${albums.map(a => `<div class="fd-al" data-fgo="album" data-id="${esc(a.id)}"><div class="ac">${a.cover && !a.cover.removed ? `<img data-att="${esc(a.cover.id)}" data-thumb="${a.cover.has_thumb ? 1 : 0}" alt="">` : FI.album}</div><div class="an">${esc(a.name)}</div><div class="as">${plural(a.count, 'item')}</div></div>`).join('')}</div>` : '<div class="empty"><b>No Albums</b></div>';
      } else if (tab === 'events') body.innerHTML = media ? this._feventsHtml(media) : '<div class="fd-loading">Loading…</div>';
      this._fhy(body);
    };
    const load = async (before) => {
      loading = true; if (!before) render();
      try {
        const r = await this._ws('feed/list', { author: uid, ...(before ? { before } : {}) });
        const ids = this._fkeep(r.posts).map(p => p.id);
        order = before ? order.concat(ids) : ids;
        more = r.more;
      } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
      loading = false; render();
    };
    const loadTab = async () => {
      media = null; render();
      try {
        if (tab === 'events') media = this._fkeep((await this._ws('feed/list', { author: uid, kind: 'events', limit: 50 })).posts);
        else media = await this._ws('feed/media', { kind: tab, author: uid });
      } catch (err) { media = tab === 'events' ? [] : { items: [] }; }
      if (el.isConnected) render();
    };
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'rpsave' || a === 'rpcancel') { endRepos(a === 'rpsave'); return; }
      if (repos && e.target.closest('.cover')) return;
      if (a === 'cover') { coverMenu(e.target.closest('button')); return; }
      if (a === 'avatar') { avatarMenu(e.target.closest('button')); return; }
      if (e.target.closest('.hav')) { if (me) avatarMenu(el.querySelector('.avbtn')); else viewPhoto(); return; }
      if (e.target.closest('.cover')) { const c = coverOf(); if (me && this._coversOn()) coverMenu(el.querySelector('.cvbtn')); else if (c) this._fview([{ id: c.id, mime: 'image/jpeg', author: uid, name: 'cover.jpg', label: 'Cover Photo' }], 0); return; }
      if (a === 'new') { this._nav('fcompose', {}); return; }
      if (a === 'settings') { this._nav('fsettings', {}); return; }
      if (a === 'msg') { this._messageUser(uid); return; }
      if (a === 'wave') {
        if (info?.waved && Date.now() - info.waved < 3600000) { this._toast('You waved a moment ago'); return; }
        try { const r = await this._ws('feed/wave', { user_id: uid }); info = { ...(info || {}), waved: r.waved }; head(); this._toast(r.back ? `You waved back at ${this._fname(uid, true)} 👋` : `You waved at ${this._fname(uid, true)} 👋`); } catch (err) { this._toast(err.message); }
        return;
      }
      if (a === 'manage') { this._fmanagePosts(body, null, () => load()); return; }
      if (a === 'follow') {
        const cur = info?.following || null, name = this._fname(uid, true);
        const v = await this._menu(e.target.closest('button'), [{ header: `Get Notified About ${name}` },
          { text: 'Off', value: 'off', checked: !cur }, { text: 'Their Posts', value: 'posts', checked: cur === 'posts' },
          ...(this._fstoriesOn() ? [{ text: 'Their Posts and Stories', value: 'stories', checked: cur === 'stories' }] : [])], { align: 'left' });
        if (!v) return;
        try { const r = await this._ws('feed/follow', { user_id: uid, level: v === 'off' ? null : v }); info = { ...(info || {}), following: r.following }; head(); this._toast(r.following ? `You’ll be told when ${name} posts${r.following === 'stories' ? ' or adds to their story' : ''}` : `Notifications about ${name} are off`); }
        catch (err) { this._toast(err.message); }
        return;
      }
      if (a === 'intro') { const r = await this._fintroSheet(info); if (r) { info = r; extras(); } return; }
      if (a === 'featured') { const r = await this._ffeaturedSheet(info); if (r) { info = r; extras(); } return; }
      if (a === 'newhl') { this._fhighlightPicker({ onDone: loadInfo }); return; }
      const ft = e.target.closest('[data-feat]');
      if (ft && info?.featured) { const list = info.featured.map(m => ({ ...m, mime: m.mime || 'image/jpeg' })); this._fview(list, +ft.dataset.feat); return; }
      const hl = e.target.closest('[data-hl]');
      if (hl && info?.highlights) {
        const h = info.highlights.find(x => x.id === hl.dataset.hl);
        if (!h) return;
        if (me && hl._held) { hl._held = false; return; }
        this._fplayStories(uid, { highlight: { owner: uid, h } });
        return;
      }
      if (a === 'onpage') { this._nav('fcompose', { preset: { page: uid } }); return; }
      if (a === 'more') { const last = this._fpost(order[order.length - 1]); if (last) load(last.ts); return; }
      if (a === 'snooze') {
        try { const r = await this._ws('feed/snooze', { user_id: uid, days: snoozed() ? null : 30 }); s.feed.prefs = r.prefs; head(); this._toast(snoozed() ? `Hidden from your Feed for 30 days` : 'Their posts show in your Feed again'); } catch (err) { this._toast(err.message); }
        return;
      }
      const t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; if (['photos', 'videos', 'events'].includes(tab)) loadTab(); else render(); return; }
      const gi = e.target.closest('[data-gview]');
      if (gi && media?.items) { this._fviewGrid(media.items, gi.dataset.gview); return; }
      const go = e.target.closest('[data-fgo]');
      if (go) { this._fgo(go.dataset.fgo, go.dataset.id); return; }
      if (a === 'friends') { this._ffriendsSheet(uid); return; }
      const prof = e.target.closest('[data-prof]');
      if (prof && prof.dataset.prof === uid) return;
      await this._fpostClick(e);
    });
    page.refresh = (what, id) => {
      if ((what === 'fpost' || what === 'fnew') && tab === 'posts') {
        const card = body.querySelector(`.fp[data-pid="${CSS.escape(id)}"]`);
        const p = this._fpost(id);
        if (card && p) { card.outerHTML = this._fpostHtml(p); this._fhy(body); }
        else if (p && (p.author === uid || (p.page === uid && !p.page_hidden)) && !order.includes(id)) { order.unshift(id); render(); }
      } else if (what === 'fgone') { order = order.filter(x => x !== id); if (tab === 'posts') render(); }
      else if (what === 'fmedia_gone' && media?.items) { media.items = media.items.filter(x => x.id !== id); if (['photos', 'videos'].includes(tab)) render(); }
      else if (what === 'fmeta') render();
      else if (what === 'all' || what === 'contacts') top();
      else if (what === 'fusers') { top(); render(); }
      else if (what === 'fhighlights') loadInfo();
    };
    page.onHide = () => { if (repos) endRepos(false); };
    page.resumeData = () => ({ tab });
    page.onShow = () => { head(); if (!page.loaded) { page.loaded = true; load(); loadInfo(); if (tab !== 'posts') loadTab(); } };
    // press and hold your highlight: Rename or Delete
    el.addEventListener('contextmenu', async (e) => {
      const hl = e.target.closest('[data-hl]');
      if (!hl || !me) return;
      e.preventDefault();
      const h = info?.highlights?.find(x => x.id === hl.dataset.hl);
      if (!h) return;
      const v = await this._menu(hl, [{ text: 'Add Stories', value: 'add', icon: FI.plus }, { text: 'Rename', value: 'rename', icon: FI.edit }, { text: 'Delete Highlight', value: 'del', icon: FI.trash, red: true }], { align: 'left' });
      if (v === 'add') { this._fhighlightPicker({ highlight: { id: h.id, name: h.name, items: (h.items || []).map(i => ({ story: i.story })) }, onDone: loadInfo }); return; }
      try {
        if (v === 'rename') { const r = await this._alert({ title: 'Rename Highlight', input: { value: h.name }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', value: true }] }); if (r.value && r.input?.trim()) { await this._ws('feed/highlight', { highlight_id: h.id, name: r.input.trim() }); loadInfo(); } }
        else if (v === 'del') { const r = await this._alert({ title: `Delete “${h.name}”?`, message: 'The stories in it are deleted from your profile.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] }); if (r.value) { await this._ws('feed/highlight', { highlight_id: h.id, delete: true }); loadInfo(); } }
      } catch (err) { this._toast(err.message); }
    });
    return page;
  },

  // ── Your cover photo and profile photo ──────────────────────────────────────
  // a new cover photo: made a sensible size (about 1600px wide) and uploaded, then shown to move into place.
  // It only becomes your cover when you tap Save (Cancel deletes the upload).
  async _fsetCover(file, { onPreview } = {}) {
    let blob;
    try { blob = (await K.resizeToBlob(file, 1600, 0.85)).blob; } catch (e) { this._toast('Couldn’t open that photo'); return; }
    const t = this._el(`<div class="toast g fai-busy">${FI.upload}<span>Uploading your cover photo…</span></div>`);
    this._root.querySelector('.toast')?.remove(); this._root.appendChild(t);
    try {
      const id = await this._uploadPicture(blob, 'cover.jpg');
      t.remove();
      onPreview?.({ id, blob, url: URL.createObjectURL(blob) });
    } catch (err) { this._toast(err.message || 'Couldn’t upload that photo'); } finally { t.remove(); }
  },

  // a new profile photo: Move and Scale, then everywhere (chats, contacts, the Feed, notifications)
  async _fsetPhoto(file) {
    const r = await this._cropPhoto(file, { feedShare: !!this._s.feed?.enabled });
    if (!r) return;
    try {
      await this._setMyPhoto(r.photo);
      this._fprofileTop?.();
      if (r.share) await this._fshareProfilePic(r.photo, 'Updated my profile picture');
      this._toast('Profile photo updated');
    } catch (err) { this._toast(err.message || 'Couldn’t use that photo'); }
  },

  async _fshareProfilePic(pic, text) {
    try {
      const id = await this._uploadPicture(pic, 'photo.jpg');
      const r = await this._ws('feed/post', { text, media: [id], audience: { type: this._fopt().default_audience === 'me' ? 'me' : 'everyone' }, profile_update: /cover/i.test(text) ? 'cover' : 'photo' });
      if (r?.post) { this._fkeep([r.post]); this._refresh('fnew', r.post.id); }
    } catch (err) { this._toast(err.message || 'Couldn’t post it in the Feed'); }
  },

  _fsavePic(src, name = 'photo.jpg') {
    const a = document.createElement('a');
    a.href = this._picUrl(src); a.download = name; a.target = '_blank'; a.rel = 'noopener';
    this._root.appendChild(a); a.click(); a.remove();
  },

  // ── Page: a group ───────────────────────────────────────────────────────────
  _pg_fgroup({ gid }) {
    this._feedSetup();
    const s = this._s;
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="fd-hero"><div class="cover"></div><div class="gicon"><div></div></div><div class="hn"></div><div class="hs"></div><div class="fd-faces" data-a="members"></div><div class="hb"></div></div>
        <div class="fd-body"><div class="fd-loading">Loading…</div></div></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="capsule g"><button data-a="menu" aria-label="More">${FI.more}</button></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.fd-body');
    let order = [], more = false;
    const group = () => (s.feed?.groups || []).find(g => g.id === gid);
    const head = () => {
      const g = group();
      if (!g) { el.querySelector('.hn').textContent = 'Group'; el.querySelector('.hs').textContent = 'You’re not in this group any more.'; el.querySelector('.hb').innerHTML = ''; return; }
      el.querySelector('.gicon > div').innerHTML = g.photo ? `<img src="${esc(g.photo)}" alt="">` : FI.group;
      el.querySelector('.hn').textContent = g.name;
      el.querySelector('.hs').textContent = `${plural(g.members.length, 'member')}${g.about ? ` · ${g.about}` : ''} · only members see posts here`;
      el.querySelector('.fd-faces').innerHTML = g.members.slice(0, 8).map(u => this._userAv(u, 34)).join('');
      el.querySelector('.hb').innerHTML = `<button class="prim" data-a="post">${FI.edit}Post in ${esc(g.name)}</button>`;
    };
    const render = () => {
      const posts = order.map(id => this._fpost(id)).filter(Boolean);
      body.innerHTML = posts.length ? posts.map(p => this._fpostHtml(p)).join('') + (more ? '<button class="fd-more" data-a="more">Show More</button>' : '')
        : '<div class="empty"><b>No Posts Yet</b>Posts in this group appear here. Only members can see them.</div>';
      this._fhy(body);
    };
    const load = async (before) => {
      if (!group()) { body.innerHTML = ''; return; }
      try {
        const r = await this._ws('feed/list', { group: gid, ...(before ? { before } : {}) });
        const ids = this._fkeep(r.posts).map(p => p.id);
        order = before ? order.concat(ids) : ids; more = r.more;
      } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
      render();
    };
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      const g = group();
      if (a === 'back') { this._back(); return; }
      if (a === 'post' && g) { this._nav('fcompose', { preset: { audience: { type: 'group', group: gid } } }); return; }
      if (a === 'more') { const last = this._fpost(order[order.length - 1]); if (last) load(last.ts); return; }
      if (a === 'members' && g) { this._fpeopleSheet(g.name, [{ header: 'Members', people: g.members }]); return; }
      if (a === 'menu' && g) {
        const v = await this._menu(e.target.closest('button'), [
          { text: 'Members', value: 'members', icon: FI.members },
          ...(g.admin ? [{ text: 'Edit Group', value: 'edit', icon: FI.edit }] : [{ text: 'Leave Group', value: 'leave', icon: FI.leave, red: true }]),
          ...(g.admin || s.isAdmin ? [{ sep: true }, { text: 'Delete Group', value: 'delete', icon: FI.trash, red: true }] : []),
        ], { align: 'right' });
        if (v === 'members') this._fpeopleSheet(g.name, [{ header: 'Members', people: g.members }]);
        else if (v === 'edit') { await this._fgroupSheet(g); head(); }
        else if (v === 'leave') {
          const r = await this._alert({ title: `Leave ${g.name}?`, message: 'You won’t see its posts any more.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive', value: true }] });
          if (r.value) { try { await this._ws('feed/group/leave', { group_id: gid }); this._back(); } catch (err) { this._toast(err.message); } }
        } else if (v === 'delete') {
          const r = await this._alert({ title: `Delete ${g.name}?`, message: 'The group and every post in it are deleted for everyone.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
          if (r.value) { try { await this._ws('feed/group/delete', { group_id: gid }); this._back(); this._toast('Group deleted'); } catch (err) { this._toast(err.message); } }
        }
        return;
      }
      await this._fpostClick(e);
    });
    page.refresh = (what, id) => {
      if (what === 'fmeta') { head(); if (!group()) render(); }
      else if (what === 'fpost') {
        const p = this._fpost(id);
        if (p?.audience?.group === gid && !order.includes(id)) order.unshift(id);
        if (p) render();
      } else if (what === 'fnew') { const p = this._fpost(id); if (p?.audience?.group === gid && !order.includes(id)) { order.unshift(id); render(); } }
      else if (what === 'fgone') { order = order.filter(x => x !== id); render(); }
    };
    page.onShow = () => { head(); if (!page.loaded) { page.loaded = true; load(); } };
    return page;
  },

  _fgroupSheet(g) {
    return new Promise((resolve) => {
      let members = g ? g.members.filter(u => u !== this._s.me) : [], photo = g?.photo || null, done = false;
      const sh = this._xsheet({
        title: g ? 'Edit Group' : 'New Group', action: g ? 'Save' : 'Create',
        body: `${this._fieldBox([{ cls: 'gname', placeholder: 'Group name', cap: true }, { cls: 'gabout', placeholder: 'What’s it for? (optional)' }])}
          <div class="sgroup"><div class="gr" role="button" data-a="members"><span class="gi">${FI.members}</span><div class="gl">Members</div><div class="gv mcount"></div></div>
          <div class="gr" role="button" data-a="photo"><span class="gi">${FI.photo}</span><div class="gl">Group Photo</div><div class="gv ph"></div></div></div>
          <div class="sfoot">Only members see the group and its posts. You can change who’s in it at any time.</div>`,
        onAction: async () => {
          const name = sh.el.querySelector('.gname').value.trim();
          if (!name) { this._toast('Give the group a name'); return false; }
          try {
            const r = await this._ws('feed/group/save', { ...(g ? { group_id: g.id } : {}), name, about: sh.el.querySelector('.gabout').value.trim(), members, photo });
            done = true; resolve(r.group);
            this._toast(g ? 'Saved' : `${name} created`);
          } catch (err) { this._toast(err.message); return false; }
        },
      });
      sh.el.querySelector('.gname').value = g?.name || '';
      sh.el.querySelector('.gabout').value = g?.about || '';
      const paint = () => { sh.el.querySelector('.mcount').textContent = members.length ? members.map(u => this._fname(u, true)).join(', ') : 'Just you'; sh.el.querySelector('.ph').textContent = photo ? 'Change' : 'Add'; };
      sh.el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'members') { const ppl = await this._fpickPeople('Members', members); if (ppl) { members = ppl; paint(); } }
        if (a === 'photo') { const files = await this._fpickFiles('image/*', false); if (files[0]) { try { photo = await this._picToDataUrl(files[0]); paint(); } catch (err) { this._toast('Couldn’t use that photo'); } } }
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      paint();
      this._focusFirst(sh.el.querySelector('.gname'));
    });
  },

  // ── Page: an album ──────────────────────────────────────────────────────────
  _pg_falbum({ aid }) {
    this._feedSetup();
    const s = this._s;
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="large-title"></div><div class="fd-body" style="padding-top:0"><div class="hs xnote" style="margin:0 6px 10px"></div><div class="grid"><div class="fd-loading">Loading…</div></div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="title" style="opacity:0"></div><div class="capsule g"><button data-a="add" aria-label="Add Photos">${FI.plus}</button><button data-a="menu" aria-label="More">${FI.more}</button></div></div>
    </div>`);
    const page = { el };
    const grid = el.querySelector('.grid');
    let items = [];
    const album = () => (s.feed?.albums || []).find(a => a.id === aid);
    const head = () => {
      const a = album();
      el.querySelector('.large-title').textContent = a?.name || 'Album';
      el.querySelector('.top .title').textContent = a?.name || 'Album';
      el.querySelector('[data-a="add"]').hidden = !a?.can_add;
      if (a) {
        const who = [a.owner, ...(a.contributors || [])].map(u => u === s.me ? 'you' : this._fname(u, true));
        el.querySelector('.hs').innerHTML = `${this._faudIcon(a.audience)} Shared with ${esc(this._faudText(a.audience, true))} · added to by ${esc(who.join(', '))}`;
      }
    };
    const load = async () => {
      try {
        const r = await this._ws('feed/list', { album: aid, limit: 50 });
        const posts = this._fkeep(r.posts);
        items = posts.flatMap(p => (p.media || []).filter(m => !m.removed).map(m => ({ ...m, post_id: p.id, author: p.author, ts: p.ts })));
      } catch (err) { grid.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
      grid.innerHTML = items.length ? this._fgridHtml(items, 'photos') : `<div class="empty"><b>Empty Album</b>${album()?.can_add ? 'Tap + to add photos and videos.' : 'Photos and videos added to it appear here.'}</div>`;
      this._fhy(grid);
    };
    const scroll = el.querySelector('.scroll');
    scroll.addEventListener('scroll', () => { el.querySelector('.top .title').style.opacity = scroll.scrollTop > 44 ? '1' : '0'; }, { passive: true });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'add') { this._nav('fcompose', { preset: { album: aid }, pickMedia: true }); return; }
      if (a === 'menu') {
        const al = album();
        if (!al) return;
        const v = await this._menu(e.target.closest('button'), [
          ...(al.can_add ? [{ text: 'Add Photos', value: 'add', icon: FI.photo }] : []),
          ...(al.owner === s.me ? [{ text: 'Edit Album', value: 'edit', icon: FI.edit }, { sep: true }, { text: 'Delete Album', value: 'delete', icon: FI.trash, red: true }] : []),
        ], { align: 'right' });
        if (v === 'add') this._nav('fcompose', { preset: { album: aid }, pickMedia: true });
        else if (v === 'edit') { await this._falbumSheet(al); head(); }
        else if (v === 'delete') {
          const r = await this._alert({ title: `Delete ${al.name}?`, message: 'Keep the posts in the Feed, or delete them with the album?', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Keep the Posts', value: 'keep' }, { text: 'Delete Everything', style: 'destructive', value: 'all' }] });
          if (!r.value) return;
          try { await this._ws('feed/album/delete', { album_id: aid, keep_posts: r.value === 'keep' }); this._back(); this._toast('Album deleted'); } catch (err) { this._toast(err.message); }
        }
        return;
      }
      const gi = e.target.closest('[data-gview]');
      if (gi) this._fviewGrid(items, gi.dataset.gview);
    });
    page.refresh = (what, id) => {
      if (what === 'fmeta') head();
      if ((what === 'fnew' || what === 'fpost' || what === 'fgone') && (this._fpost(id)?.album === aid || what === 'fgone')) load();
      else if (what === 'fmedia_gone' && items.some(x => x.id === id)) load();
    };
    page.onShow = () => { head(); if (!page.loaded) { page.loaded = true; load(); } };
    return page;
  },

  _falbumSheet(al) {
    return new Promise((resolve) => {
      let contributors = al ? [...(al.contributors || [])] : [], audience = al ? { ...al.audience } : { type: 'everyone' }, done = false;
      const sh = this._xsheet({
        title: al ? 'Edit Album' : 'New Album', action: al ? 'Save' : 'Create',
        body: `${this._fieldBox([{ cls: 'aname', placeholder: 'Album name (e.g. Summer holiday 2026)', cap: true }])}${al && this._faiOn('albums') && al.count ? `<button class="fai-name" data-a="ainame">${FI.ai}Suggest a Name</button>` : ''}
          <div class="sgroup"><div class="gr" role="button" data-a="aud"><span class="gi aud-i">${this._faudIcon(audience)}</span><div class="gl">Who can see it</div><div class="gv aud-t"></div></div>
          <div class="gr" role="button" data-a="contrib"><span class="gi">${FI.members}</span><div class="gl">Who can add to it</div><div class="gv ct"></div></div></div>
          <div class="sfoot">Everything in the album is seen by the people you choose here, whoever added it.</div>`,
        onAction: async () => {
          const name = sh.el.querySelector('.aname').value.trim();
          if (!name) { this._toast('Give the album a name'); return false; }
          try {
            const r = await this._ws('feed/album/save', { ...(al ? { album_id: al.id } : {}), name, contributors, audience });
            done = true; resolve(r.album);
            this._toast(al ? 'Saved' : `${name} created`);
          } catch (err) { this._toast(err.message); return false; }
        },
      });
      sh.el.querySelector('.aname').value = al?.name || '';
      const paint = () => {
        sh.el.querySelector('.aud-i').innerHTML = this._faudIcon(audience);
        sh.el.querySelector('.aud-t').textContent = this._faudText(audience, true);
        sh.el.querySelector('.ct').textContent = contributors.length ? `You, ${contributors.map(u => this._fname(u, true)).join(', ')}` : 'Just you';
      };
      sh.el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'aud') { const x = await this._faudienceSheet(audience); if (x) { audience = x; paint(); } }
        if (a === 'contrib') { const ppl = await this._fpickPeople('Who Can Add to It', contributors); if (ppl) { contributors = ppl; paint(); } }
        if (a === 'ainame') {
          const names = await this._fbusy('Looking at the album…', () => this._fai('album_name', { album_id: al.id }));
          if (!names?.length) return;
          const pick = await this._menu(e.target.closest('button'), names.map((n, i) => ({ text: n, value: String(i) })), { align: 'left' });
          if (pick != null) sh.el.querySelector('.aname').value = names[+pick];
        }
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      paint();
      this._focusFirst(sh.el.querySelector('.aname'));
    });
  },

  // ── Page: a list of posts (Saved) ──────────────────────────────────────────
  _pg_flist({ kind = 'saved' }) {
    this._feedSetup();
    const title = { saved: 'Saved', archive: 'Archive' }[kind] || 'Posts';
    let col = null;
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="large-title">${esc(title)}</div><div class="fd-body"><div class="fd-loading">Loading…</div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="title" style="opacity:0">${esc(title)}</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.fd-body');
    let order = [];
    const render = () => {
      const posts = order.map(id => this._fpost(id)).filter(p => p && (kind !== 'saved' || p.saved) && (kind !== 'archive' || p.archived));
      const cols = kind === 'saved' && this._fon('collections') ? (s.feed?.collections || []) : [];
      const chips = kind === 'saved' && this._fon('collections') ? `<div class="fd-cols"><button data-col="" class="${col ? '' : 'on'}">${FI.bookmark}All</button>${cols.map(c => `<button data-col="${esc(c.id)}" class="${col === c.id ? 'on' : ''}">${FI.folder}${esc(c.name)} · ${c.count}</button>`).join('')}<button data-col="__new__">${FI.plus}New Collection</button></div>` : '';
      const empty = kind === 'archive' ? '<div class="empty"><b>Nothing Archived</b>Tap ••• on one of your posts and choose Move to Archive to hide it without deleting it. Only you can see your Archive.</div>'
        : col ? '<div class="empty"><b>Nothing Here Yet</b>Tap ••• on a post and choose Save to Collection.</div>' : '<div class="empty"><b>Nothing Saved</b>Tap ••• on a post and choose Save Post to keep it here. Only you can see what you’ve saved.</div>';
      const tools = kind === 'archive' && posts.length ? `<button class="fd-more" data-a="manage" style="margin-bottom:10px">${FI.select} Select Posts</button>` : col ? `<button class="fd-more" data-a="colmenu" style="margin-bottom:10px">${FI.folder} Rename or Delete This Collection</button>` : '';
      body.innerHTML = chips + tools + (posts.length ? posts.map(p => this._fpostHtml(p)).join('') : empty);
      this._fhy(body);
    };
    const scroll = el.querySelector('.scroll');
    scroll.addEventListener('scroll', () => { el.querySelector('.top .title').style.opacity = scroll.scrollTop > 44 ? '1' : '0'; }, { passive: true });
    const s = this._s;
    const load = async () => {
      try { order = this._fkeep((await this._ws('feed/list', col ? { collection: col, limit: 50 } : { kind, limit: 50 })).posts).map(p => p.id); } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
      render();
    };
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-a="back"]')) { this._back(); return; }
      if (e.target.closest('[data-a="manage"]')) {
        // the Archive: Restore or Delete several at once
        this._fmanagePosts(body, null, () => load());
        const bar = el.querySelector('.fm-selbar [data-sb="archive"]'); if (bar) { bar.dataset.sb = 'unarchive'; bar.innerHTML = FI.unarchive; }
        return;
      }
      if (e.target.closest('[data-a="colmenu"]')) {
        const c = (s.feed?.collections || []).find(x => x.id === col); if (!c) return;
        const v = await this._menu(e.target.closest('button'), [{ text: 'Rename', value: 'rename', icon: FI.edit }, { text: 'Delete Collection', value: 'del', icon: FI.trash, red: true }], { align: 'left' });
        try {
          if (v === 'rename') { const r = await this._alert({ title: 'Rename Collection', input: { value: c.name }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', value: true }] }); if (r.value && r.input?.trim()) { s.feed.collections = (await this._ws('feed/collection', { collection_id: c.id, name: r.input.trim() })).collections; render(); } }
          else if (v === 'del') { const r = await this._alert({ title: `Delete “${c.name}”?`, message: 'The posts stay in Saved.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] }); if (r.value) { s.feed.collections = (await this._ws('feed/collection', { collection_id: c.id, delete: true })).collections; col = null; load(); } }
        } catch (err) { this._toast(err.message); }
        return;
      }
      const cb = e.target.closest('[data-col]');
      if (cb) {
        if (cb.dataset.col === '__new__') {
          const r = await this._alert({ title: 'New Collection', input: { placeholder: 'Name (e.g. Recipes)' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Create', value: true }] });
          if (!r.value || !r.input?.trim()) return;
          try { const x = await this._ws('feed/collection', { name: r.input.trim() }); s.feed.collections = x.collections; render(); } catch (err) { this._toast(err.message); }
          return;
        }
        col = cb.dataset.col || null; load(); return;
      }
      await this._fpostClick(e);
    });
    page.refresh = (what) => { if (['fpost', 'fgone'].includes(what)) render(); };
    page.onShow = async () => {
      if (page.loaded) return; page.loaded = true;
      load();
    };
    return page;
  },

  // ── Page: Activity Log (your posts, comments and reactions) ────────────────
  _pg_factivity() {
    // Your wall, like Facebook: everything you've done in the Feed, and what others did with you,
    // as a timeline of real posts you can react to and comment on. Only you see this page.
    this._feedSetup();
    const s = this._s;
    const FILTERS = [['', 'All'], ['posts', 'Your Posts'], ['comments', 'Comments'], ['reactions', 'Reactions'], ['tagged', 'Photos of You'], ['mentions', 'Mentions'], ['page', 'On Your Page']];
    const el = this._el(`<div class="fd fw">
      <div class="scroll"><div class="fd-hero"><div class="cover"></div><div class="hav">${this._userAv(s.me, 96)}</div><div class="hn">${esc(this._fname(s.me))}</div>
          <div class="hs">Your wall: your posts, comments and reactions, and posts you’re tagged or mentioned in. Only you can see this page.</div>
          <div class="fw-counts"></div>
          <div class="hb"><button class="prim" data-a="new">${FI.edit}New Post</button><button data-a="profile">${FI.profile}Your Profile</button></div></div>
        <div class="fd-seg">${FILTERS.map(([v, n]) => `<button data-kind="${v}">${n}</button>`).join('')}</div>
        <div class="fd-body"><div class="fd-loading">Loading…</div></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="title" style="opacity:0">Activity Log</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.fd-body'), scroll = el.querySelector('.scroll'), small = el.querySelector('.top .title');
    let kind = '', items = [], more = false, loading = false, counts = null;
    scroll.addEventListener('scroll', () => {
      small.style.opacity = scroll.scrollTop > 200 ? '1' : '0';
      if (more && !loading && scroll.scrollTop + scroll.clientHeight > scroll.scrollHeight - 700) load(true);
    }, { passive: true });

    const who = (uid) => uid === s.me ? 'you' : `<b data-prof="${esc(uid)}">${esc(this._fname(uid, true))}</b>`;
    const whose = (uid) => uid === s.me ? 'your' : `${who(uid)}’s`;
    const comment = (p, cid) => (p.comments || []).find(c => c.id === cid);
    // a comment on its own, as the story (yours, or one you reacted to or were mentioned in)
    const bubble = (p, c) => {
      if (!c) return '<div class="fw-gone">That comment has been deleted.</div>';
      let extra = '';
      if (c.sticker?.emoji) extra += `<div class="fc-stk">${esc(c.sticker.emoji)}</div>`;
      else if (c.sticker?.image) { const src = this._stickerSrc(c.sticker.image); extra += src ? `<div class="fc-stk"><img src="${esc(src)}" alt="Sticker" data-no-missing></div>` : ''; }
      (c.media || []).forEach(aid => { extra += `<div class="fc-pic" data-fview="${esc(aid)}" data-comment="${esc(c.id)}"><img data-att="${esc(aid)}" data-thumb="1" alt=""></div>`; });
      const rx = Object.values(c.reactions || {});
      const top = [...new Set(rx)].slice(0, 2).map(k => RE[k]?.e || '👍').join('');
      return `<div class="fw-c" data-open="${esc(p.id)}" data-cid="${esc(c.id)}"><span data-prof="${esc(c.author)}">${this._userAv(c.author, 32)}</span><div style="min-width:0">
        ${c.text ? `<div class="fc-bub"><b>${esc(this._fname(c.author))}</b><div class="ft">${this._ftext(c.text, c.mentions)}</div>${rx.length ? `<span class="crx">${top}${rx.length > 1 ? ` ${rx.length}` : ''}</span>` : ''}</div>` : ''}${extra}
        ${c.edited ? '<div class="fw-cm">Edited</div>' : ''}</div></div>`;
    };
    // the post a comment belongs to, as a small line under it
    const mini = (p) => {
      const m = (p.media || []).find(x => !x.removed && (x.mime || '').startsWith('image/'));
      return `<div class="fw-mini" data-open="${esc(p.id)}">${m ? `<img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt="">` : `<span class="mi-i">${FI.comment}</span>`}<div><b>${esc(this._fname(p.author, true))}</b><div>${esc(this._fsummary(p))}</div></div><span class="rch">${FI.chevR}</span></div>`;
    };
    const head = (icon, line, it) => `<div class="fw-h"><span class="fw-i">${icon}</span><div class="fw-l">${line}<div class="fw-t">${esc(this._fwhen(it.ts))}</div></div>
      <button class="fp-more" data-wmenu="${items.indexOf(it)}" aria-label="More">${FI.more}</button></div>`;
    const reIcon = (r) => `<span style="font-size:19px;line-height:1">${RE[r]?.e || '👍'}</span>`;
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

    const storyHtml = (it) => {
      const p = this._fpost(it.post_id);
      if (!p) return '';
      const card = () => `<div class="fw-in">${this._fpostHtml(p)}</div>`;
      switch (it.kind) {
        // your own posts, and posts on your page, are the wall itself
        case 'post': case 'page': return this._fpostHtml(p);
        case 'tagged': return `<div class="fw-s">${head(FI.tag, `${who(it.by)} tagged you in a photo`, it)}${card()}</div>`;
        case 'mention': return `<div class="fw-s">${head(FI.at, `${who(it.by)} mentioned you in a post`, it)}${card()}</div>`;
        case 'reaction': return `<div class="fw-s">${head(reIcon(it.reaction), `You reacted to ${whose(it.on)} post`, it)}${card()}</div>`;
        case 'comment': {
          const line = it.reply_to && it.reply_to !== s.me ? `You replied to ${whose(it.reply_to)} comment on ${whose(it.on)} post` : `You commented on ${whose(it.on)} post`;
          return `<div class="fw-s">${head(FI.comment, line, it)}${bubble(p, comment(p, it.comment_id))}${mini(p)}</div>`;
        }
        case 'comment_mention': return `<div class="fw-s">${head(FI.at, cap(`${who(it.by)} mentioned you in a comment on ${whose(it.on)} post`), it)}${bubble(p, comment(p, it.comment_id))}${mini(p)}</div>`;
        case 'comment_reaction': return `<div class="fw-s">${head(reIcon(it.reaction), `You reacted to ${whose(it.on)} comment`, it)}${bubble(p, comment(p, it.comment_id))}${mini(p)}</div>`;
      }
      return '';
    };
    const countsHtml = () => {
      if (!counts) return '';
      return [['posts', 'post', 'posts'], ['comments', 'comment', 'comments'], ['reactions', 'reaction', 'reactions'], ['tagged', 'photo of you', 'photos of you']]
        .filter(([k]) => counts[k]).map(([k, one, many]) => `<button data-kind="${k}"><b>${counts[k]}</b> ${counts[k] === 1 ? one : many}</button>`).join('');
    };
    const render = () => {
      el.querySelectorAll('.fd-seg [data-kind]').forEach(b => b.classList.toggle('on', b.dataset.kind === kind));
      el.querySelector('.fw-counts').innerHTML = countsHtml();
      if (!items.length) {
        body.innerHTML = loading ? '<div class="fd-loading">Loading…</div>' : `<div class="empty"><b>Nothing Yet</b>${kind ? 'Nothing here yet.' : 'Your posts, comments and reactions appear here, with posts you’re tagged or mentioned in, so you can find them, change them or delete them.'}</div>`;
        return;
      }
      let month = '';
      const lang = this._hass?.locale?.language || undefined;
      body.innerHTML = items.map(it => {
        const m = new Date(it.ts).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
        const sep = m !== month ? `<div class="fw-month"><span>${esc(m)}</span></div>` : '';
        month = m;
        return sep + storyHtml(it);
      }).join('') + (more ? '<div class="fd-loading">Loading more…</div>' : '');
      this._fhy(body);
    };
    const load = async (next = false) => {
      if (loading) return;
      loading = true;
      if (!next) { items = []; render(); }
      try {
        const r = await this._ws('feed/activity', { ...(kind ? { kind } : {}), ...(next && items.length ? { before: items[items.length - 1].ts } : {}) });
        this._fkeep(r.posts);
        items = next ? items.concat(r.items) : r.items;
        more = r.more;
        if (r.counts) counts = r.counts;
      } catch (err) { loading = false; if (!next) body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
      loading = false; render();
    };

    const drop = (it) => { items = items.filter(x => x !== it); render(); };
    const storyMenu = async (btn, it) => {
      const p = this._fpost(it.post_id);
      if (!p) return;
      const call = async (type, payload) => {
        try { const r = await this._ws(type, { post_id: p.id, ...payload }); if (r?.post) { this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); } return true; }
        catch (err) { this._toast(err.message); return false; }
      };
      const opts = [{ text: it.comment_id ? 'Go to Comment' : 'Go to Post', value: 'open', icon: it.comment_id ? FI.comment : FI.chevR }];
      if (it.kind === 'comment') opts.push({ text: 'Delete Comment', value: 'delc', icon: FI.trash, destructive: true });
      if (it.kind === 'reaction' || it.kind === 'comment_reaction') opts.push({ text: 'Remove Reaction', value: 'unreact', icon: FI.like });
      if (it.kind === 'tagged') opts.push({ text: 'Remove Tag', value: 'untag', icon: FI.tag });
      const v = await this._menu(btn, opts, { align: 'right' });
      if (v === 'open') this._nav('fpost', { pid: p.id, cid: it.comment_id || null });
      else if (v === 'delc') {
        const ok = await this._alert({ title: 'Delete Comment?', message: 'It’s removed from the post for everyone.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
        if (ok && await call('feed/comment/delete', { comment_id: it.comment_id })) { this._toast('Comment deleted'); drop(it); }
      } else if (v === 'unreact') {
        const ok = it.kind === 'reaction' ? await call('feed/react', { reaction: null }) : await call('feed/comment/react', { comment_id: it.comment_id, reaction: null });
        if (ok) { this._toast('Reaction removed'); drop(it); }
      } else if (v === 'untag') {
        let ok = true;
        for (const [aid, tags] of Object.entries(p.tags || {})) if ((tags || []).some(t => t.uid === s.me)) ok = (await call('feed/untag', { media_id: aid })) && ok;
        if (ok) { this._toast('Tag removed'); drop(it); }
      }
    };

    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'new') { this._nav('fcompose', {}); return; }
      if (a === 'profile') { this._nav('fprofile', { uid: s.me }); return; }
      const k = e.target.closest('[data-kind]');
      if (k) { if (k.dataset.kind !== kind) { kind = k.dataset.kind; scroll.scrollTo({ top: Math.min(scroll.scrollTop, el.querySelector('.fd-seg').offsetTop - 60) }); load(); } return; }
      const wm = e.target.closest('[data-wmenu]');
      if (wm) { const it = items[+wm.dataset.wmenu]; if (it) storyMenu(wm, it); return; }
      if (await this._fpostClick(e)) return;
      const op = e.target.closest('[data-open]');
      if (op) this._nav('fpost', { pid: op.dataset.open, cid: op.dataset.cid || null });
    });
    page.refresh = (what, id) => {
      if (what === 'fpost') {
        if (!items.some(it => it.post_id === id)) return;
        const top = scroll.scrollTop;
        render();
        scroll.scrollTop = top;
      } else if (what === 'fgone') {
        if (items.some(it => it.post_id === id)) { items = items.filter(it => it.post_id !== id); render(); }
      } else if (what === 'fnew') {
        const p = this._fpost(id);
        if (p && p.author === s.me && (!kind || kind === 'posts') && !items.some(it => it.post_id === id && it.kind === 'post')) {
          items.unshift({ kind: 'post', ts: p.ts, post_id: id });
          if (counts) counts.posts = (counts.posts || 0) + 1;
          render();
        }
      }
    };
    page.onShow = () => { if (!page.loaded) { page.loaded = true; load(); } };
    return page;
  },

  // ── The bell: Notifications, like Facebook's ───────────────────────────────
  // what one notification says, and its badge and picture
  _fnotifBits(it) {
    const names = (users) => {
      const b = (u) => `<b>${esc(this._fname(u, true))}</b>`;
      if (users.length === 1) return b(users[0]);
      if (users.length === 2) return `${b(users[0])} and ${b(users[1])}`;
      return `${b(users[0])} and ${users.length - 1} others`;
    };
    const q = (t) => t ? `: “${esc(t)}”` : '';
    const p = it.post_id ? this._fpost(it.post_id) : null;
    const sum = p ? this._fsummary(p) : '';
    const short = sum.length > 80 ? sum.slice(0, 79) + '…' : sum;
    const who = names(it.users);
    let line = '', badge = FI.bell, cls = 'k-blue';
    switch (it.kind) {
      case 'page': line = `${who} posted on your page${q(short)}`; badge = FI.edit; break;
      case 'tagged': line = `${who} tagged you in a photo.`; badge = FI.tag; break;
      case 'mention': line = `${who} mentioned you in a post${q(short)}`; badge = FI.at; break;
      case 'birthday': line = `It’s ${who}’s birthday today. Write on their card 🎂`; badge = FI.cake; cls = 'k-pink'; break;
      case 'reactions': line = `${who} reacted to your post${q(short)}`; badge = `<span class="em">${RE[it.reaction]?.e || '👍'}</span>`; cls = 'k-em'; break;
      case 'comment_reactions': line = `${who} reacted to your comment${q(it.text)}`; badge = `<span class="em">${RE[it.reaction]?.e || '👍'}</span>`; cls = 'k-em'; break;
      case 'comments': line = `${who} commented on your post${q(it.text)}`; badge = FI.comment; cls = 'k-green'; break;
      case 'replies': line = `${who} replied to your comment${q(it.text)}`; badge = FI.comment; cls = 'k-green'; break;
      case 'birthday_card': line = `${who} wrote on your birthday card${q(it.text)}`; badge = FI.cake; cls = 'k-pink'; break;
      case 'comment_mention': line = `${who} mentioned you in a comment${q(it.text)}`; badge = FI.at; break;
      case 'claimed': line = `${who} claimed${q(short)}`; badge = FI.gift; cls = 'k-orange'; break;
      case 'pledge': line = `${who} chipped in to <b>${esc(it.title || 'your Chip In')}</b>`; badge = FI.fund; cls = 'k-orange'; break;
      case 'group': line = `${who} added you to <b>${esc(it.group || 'a group')}</b>.`; badge = FI.group; cls = 'k-purple'; break;
      case 'shared': line = `${who} shared your post${q(short)}`; badge = FI.shareFb; cls = 'k-green'; break;
      case 'wave': line = it.back ? `${who} waved back 👋` : `${who} waved at you 👋`; badge = FI.wave; cls = 'k-orange'; break;
      case 'story_reactions': line = `${who} reacted to your story`; badge = `<span class="em">${esc(it.reaction || '❤️')}</span>`; cls = 'k-em'; break;
      case 'story_answers': line = `${who} answered your question${q(it.text)}`; badge = FI.question; cls = 'k-purple'; break;
      case 'story_mention': line = `${who} mentioned you in their story`; badge = FI.at; cls = 'k-purple'; break;
      default: line = who;
    }
    const m = p ? (p.media || []).find(x => !x.removed && ((x.mime || '').startsWith('image/') || x.has_thumb)) : null;
    const thumb = m ? `<span class="fn-th"><img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt=""></span>` : '';
    return { line, badge, cls, thumb };
  },

  _fnotifInner(it, extra = '') {
    const b = this._fnotifBits(it);
    return `<span class="fn-av">${this._userAv(it.users[0], 56)}<span class="fn-k ${b.cls}">${b.badge}</span></span>
      <div class="fn-tx"><div class="fn-l">${b.line}</div><div class="fn-t">${esc(this._fwhen(it.ts))}</div></div>${b.thumb}${extra}`;
  },

  _fnotifsHtml(n, filter = 'all') {
    const NAMES = { unread: 'Unread', reactions: 'Reactions', comments: 'Comments and Replies', mentions: 'Mentions and Tags', page: 'Posts on Your Page', more: 'Birthdays, Groups and More' };
    const chip = filter !== 'all' ? `<div class="fn-filter">${FI.filter}<span>Showing: <b>${esc(NAMES[filter] || '')}</b></span><button data-nfilter-clear>Show All</button></div>` : '';
    if (!n) return chip + '<div class="fd-loading">Loading…</div>';
    if (n.error) return `<div class="empty">${esc(n.error)}</div>`;
    if (!n.items.length) return chip + (filter !== 'all' ? '<div class="empty"><b>Nothing Here</b>No notifications like this right now.</div>'
      : '<div class="empty"><b>No Notifications</b>When someone reacts to or comments on your posts, tags you, mentions you or posts on your page, it shows here.</div>');
    // swipe right: Mark as Read / Unread; swipe left: More and Remove (a long swipe removes it)
    const row = (it, i) => `<div class="row fn-sw" data-notif="${i}" data-sw="144" data-sl="80" data-full="1">
        <div class="row-inner fn-row${it.unread ? ' new' : ''}" role="button">${this._fnotifInner(it)}</div>
        <div class="swipe-lead"><button class="unr" data-nact="toggle">${it.unread ? FI.check : FI.bell}<span>${it.unread ? 'Read' : 'Unread'}</span></button></div>
        <div class="swipe-actions"><button class="more" data-nact="more">${FI.more}<span>More</span></button><button class="del" data-nact="remove">${FI.trash}<span>Remove</span></button></div>
      </div>`;
    const fresh = n.items.map((it, i) => [it, i]).filter(([it]) => it.unread);
    const older = n.items.map((it, i) => [it, i]).filter(([it]) => !it.unread);
    return `${chip}<div class="fn-list">${fresh.length ? `<div class="fd-h2">New</div>${fresh.map(([it, i]) => row(it, i)).join('')}` : ''}
      ${older.length ? `<div class="fd-h2">${fresh.length ? 'Earlier' : 'Recent'}</div>${older.map(([it, i]) => row(it, i)).join('')}` : ''}</div>`;
  },

  // press and hold a notification: the same choices as swiping, as a menu
  _fwireNotifHold(scope, fn) {
    if (scope._fNotifHold) return;
    scope._fNotifHold = true;
    let timer = null, at = null;
    scope.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.fn-sw');
      if (!row || e.button > 0 || e.target.closest('.swipe-actions, .swipe-lead') || row.classList.contains('swiped') || row.classList.contains('swiped-l')) return;
      at = { x: e.clientX, y: e.clientY };
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; if (row.classList.contains('swiping')) return; row._heldAt = Date.now(); fn(row); }, 480);
    });
    scope.addEventListener('pointermove', (e) => { if (timer && at && Math.hypot(e.clientX - at.x, e.clientY - at.y) > 8) { clearTimeout(timer); timer = null; } });
    ['pointerup', 'pointercancel'].forEach(ev => scope.addEventListener(ev, () => { clearTimeout(timer); timer = null; }));
    scope.addEventListener('contextmenu', (e) => { const row = e.target.closest('.fn-sw'); if (row) { e.preventDefault(); clearTimeout(timer); timer = null; row._heldAt = Date.now(); fn(row); } });
  },

  // a message at the bottom with Undo
  _fundo(text, onUndo) {
    this._root.querySelector('.toast')?.remove();
    const t = this._el(`<div class="toast g fundo"><span>${esc(text)}</span><button>Undo</button></div>`);
    this._root.appendChild(t);
    const timer = setTimeout(() => t.remove(), 5000);
    t.querySelector('button').addEventListener('click', () => { clearTimeout(timer); t.remove(); onUndo?.(); });
  },

  // Turned Off Posts: posts you silenced, to turn back on
  async _fmutedSheet(after) {
    let r;
    try { r = await this._ws('feed/notifications/muted'); } catch (err) { this._toast(err.message); return; }
    const rows = () => r.posts.length ? `<div class="group">${r.posts.map(p => `<div class="gr" style="cursor:default" data-mp="${esc(p.id)}">${this._userAv(p.author, 36)}<div class="gl" data-open="${esc(p.id)}" style="cursor:pointer">${esc(this._fname(p.author, true))}<div style="font-size:13px;color:var(--cm-text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(this._fsummary(p))}</div></div><button class="pill" style="height:34px;font-size:15px;color:var(--cm-accent)" data-unmute="${esc(p.id)}">Turn On</button></div>`).join('')}</div><div class="sfoot">You aren’t told about anything on these posts — in the bell or on your phone.</div>`
      : '<div class="empty" style="padding:30px"><b>No Turned Off Posts</b>Swipe a notification, tap More, then Turn Off Notifications for This Post.</div>';
    const sh = this._xsheet({ title: 'Turned Off Posts', body: rows() });
    sh.el.addEventListener('click', async (e) => {
      const u = e.target.closest('[data-unmute]');
      if (u) {
        try { await this._ws('feed/notifications/mute', { post_id: u.dataset.unmute, on: false }); r.posts = r.posts.filter(p => p.id !== u.dataset.unmute); sh.el.innerHTML = rows(); this._toast('Notifications turned on'); after?.(); } catch (err) { this._toast(err.message); }
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) { sh.close(); this._nav('fpost', { pid: o.dataset.open }); }
    });
  },

  // Recently Removed: removed or cleared in the last 30 days, to put back
  async _fremovedSheet(after) {
    let r;
    try { r = await this._ws('feed/notifications/removed'); } catch (err) { this._toast(err.message); return; }
    this._fkeep(r.posts);
    const rows = () => r.items.length ? `<div class="fn-list fn-removed">${r.items.map((it, i) => `<div class="fn-row" data-ri="${i}">${this._fnotifInner(it, `<button class="pill fn-rs" data-restore="${i}" aria-label="Restore">${FI.restore}</button>`)}</div>`).join('')}</div><div class="sfoot">Kept here for 30 days after you remove or clear them.</div>`
      : '<div class="empty" style="padding:30px"><b>Nothing Removed</b>Notifications you remove or clear show here for 30 days, so you can put them back.</div>';
    const sh = this._xsheet({ title: 'Recently Removed', body: rows() });
    this._fhy(sh.el);
    sh.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-restore]');
      if (!b) return;
      const it = r.items[+b.dataset.restore];
      try { await this._ws('feed/notifications/restore', { key: it.key }); r.items = r.items.filter(x => x !== it); sh.el.innerHTML = rows(); this._fhy(sh.el); this._toast('Put back'); after?.(); } catch (err) { this._toast(err.message); }
    });
  },

  // ── AI: Ask the Feed, Translate ─────────────────────────────────────────────
  _faskSheet() {
    const sh = this._xsheet({ title: 'Ask the Feed', body: `<div class="fai-ask"><textarea rows="2" placeholder="When is the BBQ? Who’s coming on Saturday?" enterkeyhint="send"></textarea><button class="pill g accent" data-a="ask">Ask</button></div><div class="fai-ans"></div><div class="sfoot">Only posts shared with you are looked at.</div>` });
    const ta = sh.el.querySelector('textarea'), out = sh.el.querySelector('.fai-ans');
    const go = async () => {
      const q = ta.value.trim();
      if (!q) return;
      out.innerHTML = '<div class="fd-loading">Looking through the Feed…</div>';
      try {
        const r = await this._fai('ask', { text: q });
        this._fkeep(r.posts);
        out.innerHTML = `<div class="fai-a">${FI.ai}<span>${esc(r.answer)}</span></div>${(r.posts || []).map(p => `<div class="fm-p" data-open="${esc(p.id)}">${this._userAv(p.author, 26)}<span>${esc(this._fsummary(p).slice(0, 90))}</span>${FI.chevR}</div>`).join('')}`;
      } catch (err) { out.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
    };
    sh.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-a="ask"]')) { go(); return; }
      const o = e.target.closest('[data-open]');
      if (o) { sh.close(); this._nav('fpost', { pid: o.dataset.open }); }
    });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    setTimeout(() => ta.focus(), 300);
  },

  async _ftranslate(pid, cid, original) {
    const lang = this._hass?.locale?.language || this._hass?.language || navigator.language || 'en';
    const t = await this._fbusy('Translating…', () => this._fai('translate', { post_id: pid, comment_id: cid, language: lang }));
    if (!t) return;
    this._xsheet({ title: 'Translation', body: `<div class="group"><div class="gr" style="display:block;cursor:default"><div class="fai-lbl">Original</div><div style="white-space:pre-wrap">${esc(original)}</div></div><div class="gr" style="display:block;cursor:default"><div class="fai-lbl">${FI.ai}Translated</div><div style="white-space:pre-wrap">${esc(t)}</div></div></div>` });
  },

  // ── Menu: your profile, then shortcuts (Facebook's ☰) ─────────────────────
  _fmenuHtml(root) {
    const s = this._s;
    const tiles = [['activity', FI.activity, 'Activity Log'], ['saved', FI.bookmark, 'Saved'], ['photos', FI.photos, 'Photos'],
      ['albums', FI.album, 'Albums'], ['archive', FI.archive, 'Archive'], ...(this._fstoriesOn() ? [['story', FI.plus, 'Add to Story']] : []), ['new', FI.edit, 'New Post']];
    return `<div class="fd-card fm-me" data-menu="me" role="button">${this._userAv(s.me, 44)}<div class="fm-n"><b>${esc(this._fname(s.me))}</b><div>See your profile</div></div><span class="rch">${FI.chevR}</span></div>
      <div class="fd-h2">Shortcuts</div>
      <div class="fm-grid">${tiles.map(([k, ic, n]) => `<button class="fm-tile" data-menu="${k}"><span class="fm-i">${ic}</span>${esc(n)}</button>`).join('')}</div>
      <div class="fd-card fm-rows">
        <div class="fd-row" data-menu="settings"><span class="ri">${FI.settings}</span><div class="rb"><div class="r1">Feed Settings</div><div class="r2">Notifications, your birthday and milestones</div></div><span class="rch">${FI.chevR}</span></div>
      </div>`;
  },

  // ── Page: Feed Settings ────────────────────────────────────────────────────
  _pg_fsettings() {
    this._feedSetup();
    const s = this._s;
    const el = this._el(`<div class="fd">
      <div class="scroll"><div class="large-title">Feed Settings</div><div class="ipage" style="padding-top:8px"></div></div>
      <div class="edge top"></div>
      <div class="top"><button class="cb g" data-a="back" aria-label="Back">${FI.back}</button><div class="title" style="opacity:0">Feed Settings</div><div style="width:44px"></div></div>
    </div>`);
    const page = { el };
    const body = el.querySelector('.ipage');
    const NOTE = [['page', 'Posts on Your Page', 'When someone posts on your page'], ['comments', 'Comments and Replies', 'On your posts, and replies to your comments'], ['reactions', 'Reactions', 'To your posts and comments'],
      ['mentions', '@Mentions', 'When someone mentions you'], ['tags', 'Photo Tags', 'When someone tags you in a photo'],
      ['groups', 'Groups', 'New posts in your groups, and being added to one'], ['events', 'Events', 'Reminders, and people answering yours'],
      ['birthdays', 'Birthdays', 'When it’s someone’s birthday'],
      ...(this._fon('shares') ? [['shares', 'Shares', 'When someone shares your post']] : []),
      ...(this._fon('waves') ? [['waves', 'Waves', 'When someone waves at you']] : []),
      ...(this._fon('story_replies') || this._fon('story_stickers') ? [['stories', 'Stories', 'Reactions to your stories, answers to your questions and story mentions']] : []),
      ['important', 'Important Posts', 'Events, polls, Up for Grabs, Chip In and lists — things that ask something of you'],
      ['favourites', 'Posts From Your Favourites', 'Everyday posts from people in your Favourites'],
      ['following', 'People You Get Notified About', 'Their posts (and stories, if you chose it) — tap the bell on someone’s profile'],
      ['new_posts', 'Every New Post', 'Everything shared with you (can be a lot)']];
    const quietHtml = () => {
      if (!this._fon('quiet')) return '';
      const q = s.feed?.quiet || {}, on = this._fquietOn();
      const until = q.until && q.until > Date.now() ? q.until : null;
      return `<div class="fd-h2">Quiet Mode</div><div class="group">
        <div class="gr" role="button" data-a="quiet"><span class="gi">${FI.moon}</span><div class="gl">Pause Notifications<div style="font-size:13px;color:var(--cm-text2)">${until ? `On until ${esc(fmtTime(until, this._hass))}${new Date(until).toDateString() !== new Date().toDateString() ? ` ${esc(fmtListDate(until, this._hass))}` : ''}` : on ? 'On (scheduled)' : 'Off'}</div></div><div class="gv">${until ? 'Turn Off' : 'Choose'}</div></div>
        <label class="gr"><div class="gl">Every Night<div style="font-size:13px;color:var(--cm-text2)">Quiet at the same time each day</div></div><span class="tsw"><input type="checkbox" class="qsched"${q.schedule ? ' checked' : ''}><span></span></span></label>
        ${q.schedule ? `<div class="gr" style="cursor:default"><div class="gl">From</div><input type="time" class="gpill qfrom" value="${esc(q.from || '22:00')}"></div><div class="gr" style="cursor:default"><div class="gl">Until</div><input type="time" class="gpill qto" value="${esc(q.to || '07:00')}"></div>` : ''}
        <label class="gr"><div class="gl">Hide Red Dots Too<div style="font-size:13px;color:var(--cm-text2)">No red dots or counts for the Feed while it’s quiet</div></div><span class="tsw"><input type="checkbox" class="qdots"${q.dots ? ' checked' : ''}><span></span></span></label></div>
        <div class="xnote">While Quiet Mode is on, Feed notifications don’t go to your phone. They’re still in the bell when you look. Messages aren’t affected.</div>`;
    };
    const render = () => {
      const pr = s.feed?.prefs || { notify: {}, hidden: {} };
      const hidden = Object.entries(pr.hidden || {});
      const ms = s.feed?.milestones || [];
      const bday = pr.birthday || '';
      const bdayDate = /^\d{4}-\d{2}-\d{2}$/.test(bday) ? bday : '';
      body.innerHTML = `<div class="fd-h2">Notifications</div><div class="group">${NOTE.map(([k, n, d]) => `<label class="gr"><div class="gl">${esc(n)}<div style="font-size:13px;color:var(--cm-text2)">${esc(d)}</div></div><span class="tsw"><input type="checkbox" data-n="${k}"${pr.notify?.[k] !== false && (k !== 'new_posts' || pr.notify?.[k]) ? ' checked' : ''}><span></span></span></label>`).join('')}</div>
        <div class="xnote">You’re only ever told about posts that are shared with you.</div>
        ${quietHtml()}
        <div class="fd-h2">Your Birthday</div><div class="group">
          <div class="gr" style="cursor:default"><div class="gl">Birthday</div><input type="date" class="gpill bday" value="${esc(bdayDate)}"></div>
          <label class="gr"><div class="gl">Share With the Household<div style="font-size:13px;color:var(--cm-text2)">A birthday card post appears on the day for everyone to write on</div></div><span class="tsw"><input type="checkbox" class="sbday"${pr.share_birthday ? ' checked' : ''}><span></span></span></label></div>
        <div class="fd-h2">Milestones and Anniversaries</div><div class="group">${ms.map(m => `<div class="gr" role="button" data-ms="${esc(m.id)}"><span class="gi">${FI.sparkle}</span><div class="gl">${esc(m.title)}<div style="font-size:13px;color:var(--cm-text2)">${esc(m.date)}${m.yearly ? ' · every year' : ''} · ${esc(this._faudText(m.audience, true))}</div></div><span class="gch">${FI.chevR}</span></div>`).join('')}
          <div class="gr" role="button" data-a="addms"><span class="gi">${FI.plus}</span><div class="gl" style="color:var(--cm-accent)">Add a Milestone</div></div></div>
        <div class="xnote">On the day, a post marks it for the people you choose — “Moved into the house”, “Our wedding anniversary”.</div>
        ${hidden.length ? `<div class="fd-h2">Hidden From Your Feed</div><div class="group">${hidden.map(([u, until]) => `<div class="gr" style="cursor:default">${this._userAv(u, 32)}<div class="gl">${esc(this._fname(u))}<div style="font-size:13px;color:var(--cm-text2)">${until ? `Until ${esc(fmtListDate(until, this._hass))}` : 'Hidden'}</div></div><button class="pill" style="height:34px;font-size:15px;color:var(--cm-accent)" data-unsnooze="${esc(u)}">Show</button></div>`).join('')}</div><div class="xnote">They don’t know you’ve hidden them. Their posts still show on their profile.</div>` : ''}
        ${s.isAdmin ? `<div class="fd-h2">Administrator</div><div class="group"><div class="gr" role="button" data-a="review"><span class="gi">${FI.history}</span><div class="gl">Make This Year’s Review Now<div style="font-size:13px;color:var(--cm-text2)">It’s made by itself on 31 December. Only photos from posts shared with everyone are used.</div></div></div>${this._fon('badges') ? `<div class="gr" role="button" data-a="badges"><span class="gi">${FI.medal}</span><div class="gl">Hand Out This Week’s Badges Now<div style="font-size:13px;color:var(--cm-text2)">They’re handed out by themselves on Sunday evenings.</div></div></div>` : ''}</div>` : ''}
        <div class="xnote">Posts follow Keep Messages: they’re deleted, with their photos, videos and comments, after the same time as messages. Stories always go after 24 hours.</div>`;
    };
    const save = async (patch) => { try { const r = await this._ws('feed/prefs', patch); s.feed.prefs = r.prefs; } catch (err) { this._toast(err.message); render(); } };
    const quiet = async (patch) => { try { const r = await this._ws('feed/quiet', patch); s.feed.quiet = r.quiet; this._refresh('feedcount'); this._refresh('feednotif'); render(); } catch (err) { this._toast(err.message); render(); } };
    body.addEventListener('change', (e) => {
      if (e.target.classList.contains('qsched')) { quiet({ schedule: e.target.checked }); return; }
      if (e.target.classList.contains('qdots')) { quiet({ dots: e.target.checked }); return; }
      if (e.target.classList.contains('qfrom')) { quiet({ from: e.target.value }); return; }
      if (e.target.classList.contains('qto')) { quiet({ to: e.target.value }); return; }
      const n = e.target.dataset?.n;
      if (n) { save({ notify: { [n]: e.target.checked } }); return; }
      if (e.target.classList.contains('bday')) save({ birthday: e.target.value || '' });
      if (e.target.classList.contains('sbday')) {
        if (e.target.checked && !body.querySelector('.bday').value) { this._toast('Add your birthday first'); e.target.checked = false; return; }
        save({ share_birthday: e.target.checked });
      }
    });
    const scroll = el.querySelector('.scroll');
    scroll.addEventListener('scroll', () => { el.querySelector('.top .title').style.opacity = scroll.scrollTop > 44 ? '1' : '0'; }, { passive: true });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { this._back(); return; }
      if (a === 'addms') { await this._fmilestoneSheet(null); render(); return; }
      if (a === 'quiet') {
        const q = s.feed?.quiet || {};
        if (q.until && q.until > Date.now()) { quiet({ until: null }); this._toast('Quiet Mode is off'); return; }
        const tom = new Date(); tom.setDate(tom.getDate() + 1); tom.setHours(8, 0, 0, 0);
        const v = await this._menu(e.target.closest('[data-a]'), [{ header: 'Pause Feed Notifications' }, { text: 'For 1 Hour', value: String(Date.now() + 3600000) }, { text: 'For 4 Hours', value: String(Date.now() + 4 * 3600000) }, { text: 'Until 8am Tomorrow', value: String(tom.getTime()) }, { text: 'For a Week', value: String(Date.now() + 7 * 86400000) }], { align: 'right' });
        if (v) { quiet({ until: +v }); this._toast('Quiet Mode is on'); }
        return;
      }
      const ms = e.target.closest('[data-ms]');
      if (ms) { await this._fmilestoneSheet((s.feed?.milestones || []).find(m => m.id === ms.dataset.ms)); render(); return; }
      const un = e.target.closest('[data-unsnooze]');
      if (un) { try { const r = await this._ws('feed/snooze', { user_id: un.dataset.unsnooze, days: null }); s.feed.prefs = r.prefs; render(); } catch (err) { this._toast(err.message); } return; }
      if (a === 'badges') {
        try { const r = await this._ws('feed/badges/now', {}); if (r.post) { this._fd.posts.set(r.post.id, r.post); this._toast('Badges posted'); this._nav('fpost', { pid: r.post.id }); } else this._toast('No badges this week yet — not enough has been shared with everyone'); } catch (err) { this._toast(err.message); }
        return;
      }
      if (a === 'review') {
        try { const r = await this._ws('feed/review', {}); this._fd.posts.set(r.post.id, r.post); this._toast('Year in Review posted'); this._nav('fpost', { pid: r.post.id }); } catch (err) { this._toast(err.message); }
      }
    });
    page.refresh = (what) => { if (what === 'fmeta') render(); };
    page.onShow = render;
    return page;
  },

  _fmilestoneSheet(ms) {
    return new Promise((resolve) => {
      let audience = ms ? { ...ms.audience } : { type: 'everyone' }, done = false;
      const sh = this._xsheet({
        title: ms ? 'Milestone' : 'New Milestone', action: 'Save',
        body: `${this._fieldBox([{ cls: 'mt', placeholder: 'What is it? (e.g. Moved into the house)', cap: true }])}
          <div class="sgroup"><div class="gr"><div class="gl">Date</div><input type="date" class="gpill md" value="${esc(ms?.date || '')}"></div>
          <label class="gr"><div class="gl">Every Year</div><span class="tsw"><input type="checkbox" class="my"${!ms || ms.yearly ? ' checked' : ''}><span></span></span></label>
          <div class="gr" role="button" data-a="aud"><span class="gi aud-i">${this._faudIcon(audience)}</span><div class="gl">Who sees it</div><div class="gv aud-t">${esc(this._faudText(audience, true))}</div></div></div>
          ${ms ? '<button class="fd-more" data-a="del" style="color:var(--cm-red)">Delete Milestone</button>' : ''}`,
        onAction: async () => {
          const title = sh.el.querySelector('.mt').value.trim(), date = sh.el.querySelector('.md').value;
          if (!title || !date) { this._toast('Add a name and a date'); return false; }
          try { await this._ws('feed/milestone/save', { ...(ms ? { milestone_id: ms.id } : {}), title, date, yearly: sh.el.querySelector('.my').checked, audience }); done = true; resolve(true); }
          catch (err) { this._toast(err.message); return false; }
        },
      });
      sh.el.querySelector('.mt').value = ms?.title || '';
      sh.el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'aud') { const x = await this._faudienceSheet(audience, { groups: false }); if (x) { audience = x; sh.el.querySelector('.aud-i').innerHTML = this._faudIcon(x); sh.el.querySelector('.aud-t').textContent = this._faudText(x, true); } }
        if (a === 'del') { try { await this._ws('feed/milestone/delete', { milestone_id: ms.id }); done = true; sh.close(); resolve(true); } catch (err) { this._toast(err.message); } }
      });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(false); };
    });
  },

  // ── The wall tablet slideshow (the Feed card in slideshow mode) ─────────────
  // Recent photos shared with whoever is signed in on the tablet, one after another. Tap to pause.
  _pg_fslide() {
    this._feedSetup();
    const el = this._el(`<div class="fd"><div class="fd-slide"><div class="empty"><b>Feed Slideshow</b>Loading photos…</div></div></div>`);
    const page = { el };
    const box = el.querySelector('.fd-slide');
    const interval = Math.max(3, Number(this._config.interval) || 8) * 1000;
    const days = this._config.slideshow_days ?? 30;
    let items = [], i = -1, timer = null, refresh = null, paused = false, cur = null;
    const caption = this._el('<div class="cap"></div>');
    const load = async () => {
      try {
        const r = await this._ws('feed/media', { kind: 'photos' });
        const cutoff = days ? Date.now() - days * 86400000 : 0;
        items = r.items.filter(x => x.ts >= cutoff);
      } catch (err) { items = []; }
      if (!items.length) { box.innerHTML = `<div class="empty"><b>No Photos Yet</b>Photos in posts shared with ${esc(this._fname(this._s.me, true))}${days ? ` from the last ${days} days` : ''} appear here.</div>`; cur = null; return; }
      if (!cur) next();
    };
    const next = async () => {
      clearTimeout(timer);
      if (!items.length) return;
      i = (i + 1) % items.length;
      const m = items[i];
      try {
        const url = await this._media(m.id, false);
        const img = document.createElement('img');
        img.alt = '';
        if ((m.width || 1) < (m.height || 1)) img.classList.add('fit');
        img.src = url;
        await img.decode().catch(() => {});
        box.querySelector('.empty')?.remove();
        box.appendChild(img);
        requestAnimationFrame(() => img.classList.add('on'));
        const old = cur; cur = img;
        if (old) setTimeout(() => old.remove(), 1400);
        caption.innerHTML = `${this._userAv(m.author, 36)}<div>${esc(this._fname(m.author))}<div class="t">${esc(fmtListDate(m.ts, this._hass))}</div></div>`;
        box.appendChild(caption);
      } catch (err) { /* skip it */ }
      if (!paused) timer = setTimeout(next, interval);
    };
    box.addEventListener('click', () => {
      paused = !paused;
      box.querySelector('.paused')?.remove();
      if (paused) { clearTimeout(timer); box.appendChild(this._el('<div class="paused">Paused</div>')); }
      else next();
    });
    page.onShow = () => { if (!page.started) { page.started = true; load(); refresh = setInterval(load, 10 * 60000); } };
    page.destroy = () => { clearTimeout(timer); clearInterval(refresh); };
    page.refresh = (what) => { if (what === 'fnew') load(); };
    return page;
  },
});


// ── More like Facebook: sharing, recommendations, Share from Home, profiles, stories, Quiet Mode ──
Object.assign(Card.prototype, {

  // ── A shared post: the original, framed (a tap opens it) ────────────────────
  _fsharedHtml(sp) {
    if (!sp || sp.unavailable) return `<div class="fp-shared na">${FI.eyeOff}<span>This post isn’t available. It may have been deleted or archived, or it isn’t shared with you.</span></div>`;
    let body = '';
    if (sp.bg && sp.text) body = `<div class="fp-bg bg-${esc(sp.bg)}">${esc(sp.text)}</div>`;
    else if (sp.text) body = `<div class="fp-text${sp.text.length > 300 ? ' more' : ''}">${this._ftext(sp.text)}</div>`;
    if (sp.kind === 'poll' && sp.poll) body += `<div class="fk"><div class="fk-h">📊 ${esc(sp.poll.options.map(o => o.text).slice(0, 4).join(' · '))}</div></div>`;
    if (sp.kind === 'event' && sp.event) body += `<div class="fk"><div class="fk-h">📅 ${esc(sp.event.title)}</div><div style="font-size:14px;color:var(--cm-text2)">${esc(fmtListDate(sp.event.start, this._hass))}</div></div>`;
    if (sp.kind === 'list' && sp.list) body += `<div class="fk"><div class="fk-h">📝 ${esc(sp.text || 'List')}</div><div style="font-size:14px;color:var(--cm-text2)">${plural(sp.list.items.length, 'item')}</div></div>`;
    body += this._fmediaHtml({ ...sp, tags: {} }).replace(/data-fview="[^"]*"/g, '');
    if (sp.home) body += this._fhomeHtml(sp.home);
    if (sp.link && !sp.media?.length) body += this._flinkHtml(sp.link).replace(/data-url="[^"]*"/, '');
    return `<div class="fp-shared" data-fa="openorig" data-orig="${esc(sp.id)}"><div class="fs-h">${this._userAv(sp.author, 28)}<div><b>${esc(this._fname(sp.author))}</b><div class="t">${esc(this._fwhen(sp.ts))} · ${esc(this._faudText(sp.audience))}</div></div></div>${body}</div>`;
  },

  // ── Share from Home: a snapshot card ────────────────────────────────────────
  _fhomeHtml(h) {
    const when = `As it was ${fmtListDate(h.ts, this._hass)} at ${fmtTime(h.ts, this._hass)}`;
    if (h.type === 'camera') return `<div class="fh-card" style="padding:10px 14px"><div class="fh-h">${FI.cctv}${esc(h.name)} · camera snapshot</div></div>`;
    if (h.type === 'weather') {
      const w = h.weather || {};
      const EMO = { sunny: '☀️', 'clear-night': '🌙', cloudy: '☁️', partlycloudy: '⛅', rainy: '🌧️', pouring: '🌧️', snowy: '❄️', 'snowy-rainy': '🌨️', fog: '🌫️', windy: '💨', 'windy-variant': '💨', lightning: '🌩️', 'lightning-rainy': '⛈️', hail: '🌨️', exceptional: '⚠️' };
      const NAMES = { partlycloudy: 'partly cloudy', 'clear-night': 'clear', 'snowy-rainy': 'sleet', 'lightning-rainy': 'thunderstorms', lightning: 'lightning', 'windy-variant': 'windy and cloudy', exceptional: 'unusual weather' };
      const cond = NAMES[w.condition || h.state] || (w.condition || h.state || '').replace(/-/g, ' ');
      return `<div class="fh-card"><div class="fh-h">${FI.weather}${esc(h.name)}</div><div class="fh-w"><span class="big">${EMO[w.condition || h.state] || '🌡️'}</span><div><div class="fh-v" style="margin:0">${esc(w.temperature || '')}<small>${esc(w.temp_unit || '')}</small></div><div class="meta">${esc(cond.charAt(0).toUpperCase() + cond.slice(1))}${w.high ? ` · H ${esc(w.high)}° L ${esc(w.low || '')}°` : ''}${w.humidity ? ` · ${esc(w.humidity)}% humidity` : ''}${w.wind ? ` · wind ${esc(w.wind)} ${esc(w.wind_unit || '')}` : ''}</div></div></div><div class="fh-s">${esc(when)}</div></div>`;
    }
    if (h.type === 'chart' && h.points?.length > 1) {
      const pts = h.points, vals = pts.map(p => p[1]);
      const min = Math.min(...vals), max = Math.max(...vals), t0 = pts[0][0], t1 = pts[pts.length - 1][0];
      const W = 300, H = 90, sx = (t) => (t1 === t0 ? 0 : (t - t0) / (t1 - t0) * W), sy = (v) => (max === min ? H / 2 : H - (v - min) / (max - min) * (H - 6) - 3);
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
      const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
      return `<div class="fh-card"><div class="fh-h">${FI.chart}${esc(h.name)}</div><div class="fh-v">${esc(fmt(vals[vals.length - 1]))}<small>${esc(h.unit || '')}</small></div>
        <svg class="fh-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${line} L${W},${H} L0,${H} Z" fill="var(--cm-accent)" opacity=".15"/><path d="${line}" fill="none" stroke="var(--cm-accent)" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>
        <div class="fh-s">Last ${h.hours >= 48 ? `${Math.round(h.hours / 24)} days` : `${h.hours || 24} hours`} · low ${esc(fmt(min))}${esc(h.unit || '')}, high ${esc(fmt(max))}${esc(h.unit || '')} · ${esc(fmtListDate(h.ts, this._hass))}</div></div>`;
    }
    return `<div class="fh-card"><div class="fh-h">${FI.thermo}${esc(h.name)}</div><div class="fh-v">${esc(h.state)}<small>${esc(h.unit || '')}</small></div><div class="fh-s">${esc(when)}</div></div>`;
  },

  // a snapshot to post: a camera picture, a sensor, a chart of its last day, or the weather
  async _fhomeSheet(anchor) {
    const kind = await this._menu(anchor, [{ header: 'Share from Home' },
      { text: 'Camera Snapshot', value: 'camera', icon: FI.cctv }, { text: 'Sensor', value: 'sensor', icon: FI.thermo },
      { text: 'Chart of the Last Day', value: 'chart', icon: FI.chart }, { text: 'Weather', value: 'weather', icon: FI.weather }], { align: 'left', above: true });
    if (!kind) return null;
    const states = Object.values(this._hass?.states || {});
    const name = (st) => st.attributes?.friendly_name || st.entity_id;
    const pickable = states.filter(st => {
      const d = st.entity_id.split('.')[0];
      if (kind === 'camera') return d === 'camera';
      if (kind === 'weather') return d === 'weather';
      if (kind === 'chart') return d === 'sensor' && Number.isFinite(parseFloat(st.state));
      return ['sensor', 'binary_sensor', 'climate', 'lock', 'cover', 'light', 'switch', 'input_number', 'input_boolean', 'person', 'device_tracker', 'media_player', 'vacuum'].includes(d) && !['unavailable', 'unknown'].includes(st.state);
    }).sort((a, b) => name(a).localeCompare(name(b)));
    if (!pickable.length) { this._toast(kind === 'camera' ? 'There are no cameras in Home Assistant' : kind === 'weather' ? 'There’s no weather in Home Assistant' : 'Nothing to show yet'); return null; }
    const eid = await new Promise((resolve) => {
      let done = false;
      const sh = this._xsheet({ title: { camera: 'Choose a Camera', sensor: 'Choose a Sensor', chart: 'Choose a Sensor', weather: 'Choose the Weather' }[kind],
        body: `<input class="xfield q" placeholder="Search" type="search" autocomplete="off"><div class="group fwlist"></div>` });
      const list = sh.el.querySelector('.fwlist'), q = sh.el.querySelector('.q');
      const paint = () => {
        const w = q.value.toLowerCase();
        list.innerHTML = pickable.filter(st => !w || name(st).toLowerCase().includes(w) || st.entity_id.includes(w)).slice(0, 150).map(st => `<div class="pick-row" data-e="${esc(st.entity_id)}"><div class="pn">${esc(name(st))}<div style="font-size:12.5px;color:var(--cm-text2)">${esc(this._hass.formatEntityState?.(st) || st.state)}</div></div></div>`).join('') || '<div class="pick-row"><div class="pn" style="color:var(--cm-text2)">Nothing matches</div></div>';
      };
      q.addEventListener('input', paint);
      list.addEventListener('click', (e) => { const r = e.target.closest('[data-e]'); if (r) { done = true; sh.close(); resolve(r.dataset.e); } });
      paint();
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
    });
    if (!eid) return null;
    const st = this._hass.states[eid];
    const base = { type: kind, entity: eid, name: name(st), state: String(this._hass.formatEntityState?.(st) || st.state).replace(/\s*[^\s\d.,-]+$/, (m) => (st.attributes?.unit_of_measurement && m.trim() === st.attributes.unit_of_measurement ? '' : m)), unit: st.attributes?.unit_of_measurement || '', icon: st.attributes?.icon || '' };
    try {
      if (kind === 'camera') {
        const r = await this._hass.fetchWithAuth(`/api/camera_proxy/${encodeURIComponent(eid)}`);
        if (!r.ok) throw new Error('The camera didn’t send a picture');
        const blob = await r.blob();
        return { home: base, file: new File([blob], `${eid.split('.')[1]}.jpg`, { type: blob.type || 'image/jpeg' }) };
      }
      if (kind === 'chart') {
        const start = new Date(Date.now() - 24 * 3600000).toISOString();
        const res = await this._hass.callWS({ type: 'history/history_during_period', start_time: start, entity_ids: [eid], minimal_response: true, no_attributes: true });
        let pts = (res?.[eid] || []).map(x => [Math.round((x.lu || x.lc || 0) * 1000), parseFloat(x.s)]).filter(p => Number.isFinite(p[1]) && p[0]);
        pts.push([Date.now(), parseFloat(st.state)]);
        if (pts.length > 120) { const step = pts.length / 120; pts = Array.from({ length: 120 }, (_, i) => pts[Math.floor(i * step)]).concat([pts[pts.length - 1]]); }
        if (pts.length < 2) { this._toast('There isn’t enough history to draw a chart'); return null; }
        return { home: { ...base, points: pts, hours: 24 } };
      }
      if (kind === 'weather') {
        const a = st.attributes || {}, f = (a.forecast || [])[0] || {};
        return { home: { ...base, state: st.state, weather: { condition: st.state, temperature: a.temperature != null ? String(Math.round(a.temperature)) : '', temp_unit: a.temperature_unit || '°', humidity: a.humidity != null ? String(Math.round(a.humidity)) : '', wind: a.wind_speed != null ? String(Math.round(a.wind_speed)) : '', wind_unit: a.wind_speed_unit || '', high: f.temperature != null ? String(Math.round(f.temperature)) : '', low: f.templow != null ? String(Math.round(f.templow)) : '' } } };
      }
      return { home: base };
    } catch (err) { this._toast(err.message || 'Couldn’t get that from Home Assistant'); return null; }
  },

  // ── Share a post ────────────────────────────────────────────────────────────
  async _fshareMenu(anchor, p) {
    const orig = p.shared_post && !p.shared_post.unavailable ? p.shared_post : p;
    const v = await this._menu(anchor, [
      { text: 'Share Now', value: 'now', icon: FI.shareFb },
      { text: 'Write Post', value: 'write', icon: FI.edit },
      { sep: true },
      { text: 'Send in a Chat', value: 'chat', icon: FI.send },
    ], { align: 'right', above: true });
    if (v === 'now') {
      try { const r = await this._ws('feed/post', { text: '', shared: orig.id, audience: this._fdefaultAudience() }); this._fkeep([r.post]); this._refresh('fnew', r.post.id); this._toast(`Shared with ${this._faudText(r.post.audience, true)}`); }
      catch (err) { this._toast(err.message); }
    } else if (v === 'write') this._nav('fcompose', { preset: { shared: orig.id, sharedView: orig } });
    else if (v === 'chat') this._fsendToChat(p);
  },

  // ── Ask for Recommendations: a contact card in a comment ───────────────────
  _fcontactHtml(ct, cid) {
    const sub = [ct.company !== ct.name ? ct.company : '', ct.job_title, ct.phones?.[0]?.value].filter(Boolean).join(' · ');
    return `<div class="fc-contact">${FI.card}<div class="fcc-b"><b>${esc(ct.name)}</b>${esc(sub)}</div><button data-fa="recsave" data-cid="${esc(cid)}">Save</button></div>`;
  },

  async _frecommend(p, after) {
    const list = [...this._s.contacts.values()].filter(c => !c.ha_user).sort((a, b) => this._cname(a).localeCompare(this._cname(b)));
    if (!list.length) { this._toast('Add someone to your Contacts first'); return; }
    const cid = await new Promise((resolve) => {
      let done = false;
      const sh = this._xsheet({ title: 'Recommend Someone', body: `<div class="xnote" style="margin-top:0">Their name, company, phone, email and website go in a comment for everyone who can see this post. Nothing else from the contact is shared.</div><input class="xfield q" placeholder="Search Contacts" type="search" autocomplete="off"><div class="group fwlist"></div>` });
      const box = sh.el.querySelector('.fwlist'), q = sh.el.querySelector('.q');
      const paint = () => {
        const w = q.value.toLowerCase();
        box.innerHTML = list.filter(c => !w || this._cname(c).toLowerCase().includes(w) || (c.company || '').toLowerCase().includes(w)).map(c => `<div class="pick-row" data-c="${esc(c.id)}"><div class="pn">${esc(this._cname(c))}${c.company ? `<div style="font-size:12.5px;color:var(--cm-text2)">${esc(c.company)}</div>` : ''}</div></div>`).join('') || '<div class="pick-row"><div class="pn" style="color:var(--cm-text2)">No matches</div></div>';
      };
      q.addEventListener('input', paint);
      box.addEventListener('click', (e) => { const r = e.target.closest('[data-c]'); if (r) { done = true; sh.close(); resolve(r.dataset.c); } });
      paint();
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
    });
    if (!cid) return;
    try { const r = await this._ws('feed/comment', { post_id: p.id, contact_id: cid }); this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); after?.(); this._toast('Recommended'); }
    catch (err) { this._toast(err.message); }
  },
  _cname(c) { return [c.first, c.last].filter(Boolean).join(' ') || c.company || c.nickname || 'Contact'; },

  async _fsaveContact(ct) {
    const [first, ...rest] = String(ct.name || '').split(' ');
    const c = { first: ct.company === ct.name ? '' : first, last: ct.company === ct.name ? '' : rest.join(' '), company: ct.company || '', job_title: ct.job_title || '',
      phones: ct.phones || [], emails: ct.emails || [], urls: ct.urls || [] };
    try { const r = await this._ws('contacts/save', { contacts: [c] }); r.contacts?.forEach(x => this._s.contacts.set(x.id, x)); this._refresh('contacts'); this._toast(`${ct.name} saved to Contacts`); }
    catch (err) { this._toast(err.message); }
  },

  // ── Lists ───────────────────────────────────────────────────────────────────
  async _flistItem(p, action, itemId = null) {
    let text = null;
    if (action === 'add') {
      const r = await this._alert({ title: 'Add an Item', input: { placeholder: 'Item' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', value: true }] });
      if (!r.value || !r.input?.trim()) return;
      text = r.input.trim();
    }
    try { const r = await this._ws('feed/list_item', { post_id: p.id, action, ...(itemId ? { item_id: itemId } : {}), ...(text ? { text } : {}) }); this._fd.posts.set(p.id, r.post); this._refresh('fpost', p.id); }
    catch (err) { this._toast(err.message); }
  },

  // ── Saved collections ───────────────────────────────────────────────────────
  async _fcollectionMenu(anchor, p) {
    const cols = this._s.feed?.collections || [];
    const v = await this._menu(anchor, [{ header: 'Save to a Collection' },
      ...cols.map(c => ({ text: c.name, value: c.id, checked: (c.posts || []).includes(p.id), icon: FI.folder })),
      { sep: true }, { text: 'New Collection…', value: '__new__', icon: FI.plus }], { align: 'right' });
    if (!v) return;
    let cid = v, on = true;
    try {
      if (v === '__new__') {
        const r = await this._alert({ title: 'New Collection', input: { placeholder: 'Name (e.g. Recipes)' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Create', value: true }] });
        if (!r.value || !r.input?.trim()) return;
        const x = await this._ws('feed/collection', { name: r.input.trim() });
        this._s.feed.collections = x.collections; cid = x.collection_id;
      } else on = !(cols.find(c => c.id === v)?.posts || []).includes(p.id);
      const x = await this._ws('feed/collection/post', { collection_id: cid, post_id: p.id, on });
      this._s.feed.collections = x.collections;
      if (on) { p.saved = true; this._refresh('fpost', p.id); }
      this._toast(on ? `Saved to ${x.collections.find(c => c.id === cid)?.name || 'collection'}` : 'Removed from the collection');
    } catch (err) { this._toast(err.message); }
  },

  // ── Quiet Mode ──────────────────────────────────────────────────────────────
  _fquietOn() {
    const q = this._s.feed?.quiet;
    if (!q || !this._fon('quiet')) return false;
    if (q.until && q.until > Date.now()) return true;
    if (q.schedule) {
      const d = new Date(), now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const a = q.from || '22:00', b = q.to || '07:00';
      return a <= b ? (now >= a && now < b) : (now >= a || now < b);
    }
    return false;
  },
  _fquietDots() { return this._fquietOn() && !!this._s.feed?.quiet?.dots; },

  // ── Stories: opened from a notification ─────────────────────────────────────
  async _fopenStory(sid) {
    this._feedSetup();
    let st = this._fd.stories.find(x => x.id === sid);
    if (!st) {
      try { const r = await this._ws('feed/list', {}); this._fkeep(r.posts); this._fd.stories = r.stories || []; } catch (err) { /* */ }
      st = this._fd.stories.find(x => x.id === sid);
    }
    if (!st) { this._toast('That story has ended'); return; }
    this._fplayStories(st.author, { startId: sid });
  },

  // stickers on a story (poll, question, countdown, mention, place, weather, time)
  _fstickersHtml(st) {
    return (st.stickers || []).map(k => {
      const pos = `left:${(k.x * 100).toFixed(1)}%;top:${(k.y * 100).toFixed(1)}%`;
      if (k.type === 'poll') {
        const total = (k.counts || []).reduce((a, b) => a + b, 0), show = k.mine != null || st.author === this._s.me;
        return `<div class="stk" style="${pos}"><div class="stk-card stk-poll">${k.question ? `<div class="q">${esc(k.question)}</div>` : ''}${k.options.map((o, i) => `<button data-stk="${esc(k.id)}" data-vote="${i}" class="${k.mine === i ? 'mine' : ''}">${show ? `<i style="width:${total ? Math.round(k.counts[i] / total * 100) : 0}%"></i>` : ''}<span><span>${esc(o)}</span>${show ? `<span>${total ? Math.round(k.counts[i] / total * 100) : 0}%</span>` : ''}</span></button>`).join('')}</div></div>`;
      }
      if (k.type === 'question') return `<div class="stk" style="${pos}"><div class="stk-card stk-q"><div class="q">${esc(k.prompt)}</div>${st.author === this._s.me ? `<button class="a" data-stkans="${esc(k.id)}" style="width:100%">${plural((k.answers || []).length, 'answer')} — see them</button>` : `<div class="a" data-stk="${esc(k.id)}" data-ask="1" role="button">${k.answered ? 'You answered ✓ (tap to change)' : 'Type something…'}</div>`}</div></div>`;
      if (k.type === 'countdown') return `<div class="stk" style="${pos}"><div class="stk-card stk-cd"><div class="t">${esc(k.title)}</div><div class="v" data-cd="${k.at}">${esc(this._fcountdown(k.at))}</div></div></div>`;
      if (k.type === 'mention') return `<div class="stk" style="${pos}"><span class="stk-chip" data-prof="${esc(k.uid)}">@${esc(this._fname(k.uid))}</span></div>`;
      if (k.type === 'place') return `<div class="stk" style="${pos}"><span class="stk-chip">${FI.pin}${esc(k.name)}</span></div>`;
      if (k.type === 'weather') return `<div class="stk" style="${pos}"><span class="stk-chip">${FI.weather}${esc(k.temperature)} ${esc(String(k.condition || '').replace(/-/g, ' '))}</span></div>`;
      if (k.type === 'time') return `<div class="stk" style="${pos}"><span class="stk-chip">${FI.clock}${esc(fmtTime(st.ts, this._hass))}</span></div>`;
      return '';
    }).join('');
  },
  _fcountdown(at) {
    let s = Math.max(0, Math.round((at - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60);
    return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s % 60}s`;
  },

  // add a sticker while making a story: resolves the sticker, or null
  async _fstickerPick(anchor, audience) {
    const v = await this._menu(anchor, [{ header: 'Add a Sticker' },
      { text: 'Poll', value: 'poll', icon: FI.poll }, { text: 'Question', value: 'question', icon: FI.question },
      { text: 'Countdown', value: 'countdown', icon: FI.timer }, { text: 'Mention', value: 'mention', icon: FI.at },
      { text: 'Place', value: 'place', icon: FI.pin }, { text: 'Weather', value: 'weather', icon: FI.weather }, { text: 'Time', value: 'time', icon: FI.clock }], { align: 'left' });
    if (!v) return null;
    if (v === 'time') return { type: 'time', x: 0.5, y: 0.2, label: 'Time' };
    if (v === 'question') {
      const r = await this._alert({ title: 'Question Sticker', input: { placeholder: 'Ask me anything' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', value: true }] });
      return r.value ? { type: 'question', prompt: r.input?.trim() || 'Ask me anything', x: 0.5, y: 0.68, label: 'Question' } : null;
    }
    if (v === 'poll') {
      const vals = await this._fform('Poll Sticker', [{ k: 'q', ph: 'Question (optional)' }, { k: 'a', ph: 'Answer 1', value: 'Yes' }, { k: 'b', ph: 'Answer 2', value: 'No' }]);
      if (!vals || !vals.a || !vals.b) return null;
      return { type: 'poll', question: vals.q, options: [vals.a, vals.b], x: 0.5, y: 0.68, label: `Poll: ${vals.q || `${vals.a} / ${vals.b}`}` };
    }
    if (v === 'countdown') {
      const vals = await this._fform('Countdown Sticker', [{ k: 't', ph: 'What for? (e.g. BBQ)' }, { k: 'at', type: 'datetime-local' }]);
      const at = vals?.at ? new Date(vals.at).getTime() : 0;
      if (!at || at <= Date.now()) { if (vals) this._toast('Choose a time in the future'); return null; }
      return { type: 'countdown', title: vals.t || 'Countdown', at, x: 0.5, y: 0.25, label: `Countdown: ${vals.t || ''}` };
    }
    if (v === 'mention') {
      const uid = await this._fpickPerson(anchor, 'Mention');
      if (!uid) return null;
      if (audience?.type === 'people' && !audience.people.includes(uid)) { this._toast('Mention someone the story is shared with'); return null; }
      return { type: 'mention', uid, x: 0.5, y: 0.3, label: `@${this._fname(uid, true)}` };
    }
    if (v === 'place') {
      const places = await this._places();
      if (!places.length) { this._toast('There are no zones in Home Assistant yet'); return null; }
      const z = await this._choosePlace(anchor, places, null);
      if (!z || z === '__new__') return null;
      return { type: 'place', zone: z, x: 0.5, y: 0.3, label: places.find(p => p.entity_id === z)?.name || z };
    }
    if (v === 'weather') {
      const ws = Object.keys(this._hass?.states || {}).filter(e => e.startsWith('weather.'));
      if (!ws.length) { this._toast('There’s no weather in Home Assistant'); return null; }
      const e = ws.length === 1 ? ws[0] : await this._menu(anchor, ws.map(x => ({ text: this._hass.states[x].attributes?.friendly_name || x, value: x })), { align: 'left' });
      return e ? { type: 'weather', entity: e, x: 0.5, y: 0.2, label: 'Weather' } : null;
    }
    return null;
  },

  // a small form in a sheet: resolves { key: value } or null
  _fform(title, fields) {
    return new Promise((resolve) => {
      let done = false;
      const sh = this._xsheet({ title, action: 'Add', body: `<div class="group">${fields.map(f => `<div class="gr" style="cursor:text"><input class="gin-text" data-f="${f.k}" type="${f.type || 'text'}" placeholder="${esc(f.ph || '')}" value="${esc(f.value || '')}" maxlength="80" style="flex:1;border:0;background:none;color:var(--cm-text);font:inherit;font-size:16px;outline:none"></div>`).join('')}</div>`,
        onAction: () => { done = true; const out = {}; sh.el.querySelectorAll('[data-f]').forEach(i => { out[i.dataset.f] = i.value.trim(); }); resolve(out); } });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
      setTimeout(() => sh.el.querySelector('[data-f]')?.focus(), 300);
    });
  },

  // ── Your profile: Intro, Featured photos, Highlights ────────────────────────
  _fintroHtml(info, me) {
    if (!info?.about) return '';
    const ab = info.about, feat = info.featured || [];
    const dets = ab.details.map(d => `<div class="det">${FI[d.key] || FI.profile}<span>${esc((ABOUT.find(a => a[0] === d.key) || ['', ''])[1])} <b>${esc(d.value)}</b></span>${d.aud === 'me' ? `<span class="lock" title="Only you">${FI.me}</span>` : ''}</div>`).join('');
    if (!me && !ab.bio && !ab.details.length && !feat.length) return '';
    return `<div class="fp-intro"><div class="ih">Intro${me ? '<button data-a="intro">Edit</button>' : ''}</div>
      ${ab.bio ? `<div class="bio">${esc(ab.bio)}</div>` : me ? '<div class="empty-i">Add a short bio and a few details, like where you work or your pets.</div>' : ''}${dets}
      ${feat.length ? `<div class="fp-feat">${feat.map((m, i) => `<div class="ft" data-feat="${i}"><img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt=""></div>`).join('')}</div>` : ''}
      ${me ? `<button class="fd-more" data-a="featured" style="margin-top:10px">${feat.length ? 'Edit Featured Photos' : 'Add Featured Photos'}</button>` : ''}</div>`;
  },

  _fhighlightsHtml(info, me) {
    const hls = info?.highlights;
    if (!hls || (!hls.length && (!me || !info.can_highlight))) return '';   // yours: once you've posted a story
    const circle = (it) => it.media && !it.media.removed ? `<img data-att="${esc(it.media.id)}" data-thumb="${it.media.has_thumb ? 1 : 0}" alt="">` : `<div class="bg-${esc(it.bg || 'accent')}">${esc((it.text || '').slice(0, 12))}</div>`;
    return `<div class="fp-hls">${me ? `<div class="fp-hl" data-a="newhl"><div class="c">${FI.plus}</div><div class="n">New</div></div>` : ''}${hls.map(h => `<div class="fp-hl" data-hl="${esc(h.id)}"><div class="c">${circle(h.cover)}</div><div class="n">${esc(h.name)}</div></div>`).join('')}</div>`;
  },

  // ── New Highlight: pick from your stories (the ones up now and your private Story Archive),
  // then name it and choose its cover. With a highlight given, adds more stories to it.
  async _fhighlightPicker({ highlight = null, onDone } = {}) {
    let data;
    try { data = await this._ws('feed/story/archive'); } catch (err) { this._toast(err.message); return; }
    const all = data.stories || [];
    const inThis = new Set((highlight?.items || []).map(i => i.story).filter(Boolean));
    const picked = [];
    let step = 1, cover = null, name = '';
    const day = (ts) => { const d = new Date(ts), now = new Date(); return d.toLocaleDateString(undefined, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }); };
    const face = (it) => it.media && !it.media.removed ? `<img data-att="${esc(it.media.id)}" data-thumb="${it.media.has_thumb ? 1 : 0}" alt="">` : `<div class="tx bg-${esc(it.bg || 'accent')}">${esc((it.text || '').slice(0, 60))}</div>`;
    const byId = (id) => all.find(x => x.id === id);
    const grid = () => all.length ? `<div class="hlp-grid">${all.map(it => {
        const n = picked.indexOf(it.id), off = inThis.has(it.id);
        return `<button class="hlp-t${n >= 0 ? ' on' : ''}${off ? ' off' : ''}" data-st="${esc(it.id)}"${off ? ' disabled' : ''}>${face(it)}
          <span class="d">${esc(day(it.ts))}</span>${it.live ? '<span class="lv">Live</span>' : it.in_highlight && !off ? '<span class="lv hl">In a Highlight</span>' : ''}
          ${off ? '<span class="n in">✓</span>' : `<span class="n">${n >= 0 ? n + 1 : ''}</span>`}</button>`;
      }).join('')}</div>${data.archive ? '<div class="sfoot">Your stories stay here after their 24 hours. Only you can see them, until you add them to a highlight, which shows each one to the people its story was for.</div>' : '<div class="sfoot">Only stories that are still up can be added, because the Story Archive is switched off for the household.</div>'}`
      : `<div class="empty" style="padding:34px 20px"><b>No Stories Yet</b>${data.archive ? 'Post a story, and it’s kept here privately after its 24 hours so you can add it to a highlight.' : 'Post a story, then add it here while it’s up.'}</div>`;
    const step2 = () => `<input class="ffq hlp-name" maxlength="30" placeholder="Highlight name" value="${esc(name)}" autocomplete="off" autocapitalize="words">
      <div class="fd-h2" style="padding-left:4px">Choose a Cover</div>
      <div class="hlp-covers">${picked.map(id => `<button class="hlp-cv${id === cover ? ' on' : ''}" data-cv="${esc(id)}"><div class="c">${face(byId(id))}</div></button>`).join('')}</div>
      <div class="sfoot">${plural(picked.length, 'story', 'stories')} · tap one to use it as the cover</div>`;
    const sh = this._xsheet({
      title: highlight ? `Add to “${highlight.name}”` : 'New Highlight', action: highlight ? 'Add' : 'Next', body: grid(),
      onAction: async () => {
        if (!picked.length) { this._toast('Choose at least one story'); return false; }
        if (!highlight && step === 1) { step = 2; cover = cover && picked.includes(cover) ? cover : picked[0]; draw(); setTimeout(() => sh.el.querySelector('.hlp-name')?.focus(), 350); return false; }
        if (!highlight) name = sh.el.querySelector('.hlp-name')?.value.trim() || '';
        if (!highlight && !name) { this._toast('Give your highlight a name'); sh.el.querySelector('.hlp-name')?.focus(); return false; }
        const payload = highlight ? { highlight_id: highlight.id, add_stories: picked } : { name, add_stories: picked, cover_story: cover };
        await this._ws('feed/highlight', payload);
        this._toast(highlight ? `Added ${plural(picked.length, 'story', 'stories')}` : `“${name}” is on your profile`);
        this._refresh('fhighlights'); onDone?.();
        return true;
      },
    });
    sh.wrap.querySelector('.xsheet')?.classList.add('hlp');
    const draw = () => {
      sh.el.innerHTML = step === 1 ? grid() : step2();
      if (sh.actBtn) { sh.actBtn.textContent = highlight ? 'Add' : step === 1 ? 'Next' : 'Add'; sh.actBtn.classList.toggle('dim', !picked.length); }
      this._fhy(sh.el);
    };
    sh.el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-st]');
      if (t && !t.disabled) {
        const i = picked.indexOf(t.dataset.st);
        if (i >= 0) picked.splice(i, 1); else picked.push(t.dataset.st);
        // just renumber, so the grid doesn't jump
        sh.el.querySelectorAll('[data-st]').forEach(b => { const n = picked.indexOf(b.dataset.st); if (!b.disabled) { b.classList.toggle('on', n >= 0); b.querySelector('.n').textContent = n >= 0 ? n + 1 : ''; } });
        sh.actBtn?.classList.toggle('dim', !picked.length);
        return;
      }
      const c = e.target.closest('[data-cv]');
      if (c) { name = sh.el.querySelector('.hlp-name')?.value || name; cover = c.dataset.cv; sh.el.querySelectorAll('[data-cv]').forEach(b => b.classList.toggle('on', b.dataset.cv === cover)); }
    });
    draw();
  },

  async _fintroSheet(info) {
    const ab = info?.about || { bio: '', details: [] };
    const cur = Object.fromEntries((ab.details || []).map(d => [d.key, d]));
    const zones = Object.values(this._hass?.states || {}).filter(x => x.entity_id.startsWith('zone.')).map(x => x.attributes?.friendly_name || x.entity_id);
    return new Promise((resolve) => {
      let done = false;
      const sh = this._xsheet({ title: 'Edit Intro', action: 'Save',
        body: `<div class="group"><div class="gr" style="cursor:text;display:block"><textarea class="bio" maxlength="160" rows="3" placeholder="Describe who you are" style="width:100%;border:0;background:none;color:var(--cm-text);font:inherit;font-size:16px;outline:none;resize:none"></textarea></div></div>
          <div class="xnote">Your bio shows to everyone at home.</div>
          <div class="fd-h2" style="padding-left:4px">Details</div><div class="group">${ABOUT.map(([k, label]) => `<div class="gr" style="cursor:text"><span class="gi">${FI[k]}</span><input class="gin-text" data-d="${k}" placeholder="${esc(label)}" maxlength="80" ${k === 'lives' ? 'list="crow-zones"' : ''} style="flex:1;border:0;background:none;color:var(--cm-text);font:inherit;font-size:16px;outline:none;min-width:0"><button class="pill" data-aud="${k}" style="height:30px;font-size:13px;padding:0 10px">${(cur[k]?.aud || 'everyone') === 'me' ? 'Only Me' : 'Everyone'}</button></div>`).join('')}</div>
          <datalist id="crow-zones">${zones.map(z => `<option value="${esc(z)}">`).join('')}</datalist>
          <div class="xnote">Tap Everyone or Only Me beside a detail to choose who sees it.</div>`,
        onAction: async () => {
          const details = {};
          sh.el.querySelectorAll('[data-d]').forEach(i => { details[i.dataset.d] = { value: i.value.trim(), aud: sh.el.querySelector(`[data-aud="${i.dataset.d}"]`).textContent === 'Only Me' ? 'me' : 'everyone' }; });
          try { const r = await this._ws('feed/about', { bio: sh.el.querySelector('.bio').value.trim(), details }); done = true; resolve(r); }
          catch (err) { this._toast(err.message); return false; }
        } });
      sh.el.querySelector('.bio').value = ab.bio || '';
      sh.el.querySelectorAll('[data-d]').forEach(i => { i.value = cur[i.dataset.d]?.value || ''; });
      sh.el.addEventListener('click', (e) => { const b = e.target.closest('[data-aud]'); if (b) b.textContent = b.textContent === 'Only Me' ? 'Everyone' : 'Only Me'; });
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
    });
  },

  async _ffeaturedSheet(info) {
    let items = [];
    try { items = (await this._ws('feed/media', { kind: 'photos', author: this._s.me })).items.filter(m => m.author === this._s.me || m.tagged); } catch (err) { this._toast(err.message); return null; }
    if (!items.length) { this._toast('Post some photos first'); return null; }
    const chosen = (info?.featured || []).map(m => m.id).filter(id => items.some(m => m.id === id));
    return new Promise((resolve) => {
      let done = false;
      const sh = this._xsheet({ title: 'Featured Photos', action: 'Save', body: `<div class="xnote" style="margin-top:0">Choose up to 9. Each one only shows to people who can see the post it’s from.</div><div class="fd-grid fsel"></div>`,
        onAction: async () => { try { const r = await this._ws('feed/featured', { media: chosen }); done = true; resolve(r); } catch (err) { this._toast(err.message); return false; } } });
      const grid = sh.el.querySelector('.fsel');
      const paint = () => {
        grid.innerHTML = items.map(m => `<div class="gi${chosen.includes(m.id) ? ' sel' : ''}" data-m="${esc(m.id)}"><img data-att="${esc(m.id)}" data-thumb="${m.has_thumb ? 1 : 0}" alt="">${chosen.includes(m.id) ? `<span class="gsel" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:var(--cm-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${chosen.indexOf(m.id) + 1}</span>` : ''}</div>`).join('');
        this._fhy(grid);
      };
      grid.addEventListener('click', (e) => {
        const g = e.target.closest('[data-m]'); if (!g) return;
        const id = g.dataset.m;
        if (chosen.includes(id)) chosen.splice(chosen.indexOf(id), 1);
        else if (chosen.length >= 9) { this._toast('Up to 9 featured photos'); return; } else chosen.push(id);
        paint();
      });
      paint();
      const close = sh.close; sh.close = () => { close(); if (!done) resolve(null); };
    });
  },

  // add your story to a highlight (an existing one, or a new one)
  async _fhighlightAdd(anchor, story) {
    let info;
    try { info = await this._ws('feed/profile', { user_id: this._s.me }); } catch (err) { this._toast(err.message); return false; }
    const hls = info.highlights || [];
    const v = await this._menu(anchor, [{ header: 'Add to Highlight' }, ...hls.map(h => ({ text: h.name, value: h.id, icon: FI.highlight })), { sep: true }, { text: 'New Highlight…', value: '__new__', icon: FI.plus }], { align: 'right', above: true });
    if (!v) return false;
    const payload = { add_story: story.id };
    if (v === '__new__') {
      const r = await this._alert({ title: 'New Highlight', input: { placeholder: 'Name (e.g. Holiday)' }, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', value: true }] });
      if (!r.value) return false;
      payload.name = r.input?.trim() || 'Highlights';
    } else payload.highlight_id = v;
    try { await this._ws('feed/highlight', payload); this._toast('Added to your highlight. It stays on your profile after the story ends.'); this._refresh('fhighlights'); return true; }
    catch (err) { this._toast(err.message); return false; }
  },

  // ── Manage Posts: select several of your posts, then Archive, Delete or Change Audience ──
  _fmanagePosts(body, getIds, after) {
    if (body.classList.contains('selecting')) return;
    const chosen = new Set();
    body.classList.add('selecting');
    const bar = this._el(`<div class="fm-selbar"><span class="n">Select posts</span><button data-sb="aud">Audience</button><button data-sb="archive">${FI.archive}</button><button class="red" data-sb="delete">${FI.trash}</button><button data-sb="done">Done</button></div>`);
    body.closest('.fd').appendChild(bar);
    const paint = () => {
      body.querySelectorAll('.fp[data-pid]').forEach(c => c.classList.toggle('sel', chosen.has(c.dataset.pid)));
      bar.querySelector('.n').textContent = chosen.size ? `${chosen.size} selected` : 'Select posts';
    };
    const pick = (e) => {
      const c = e.target.closest('.fp[data-pid]');
      if (!c) return;
      e.stopPropagation(); e.preventDefault();
      const p = this._fpost(c.dataset.pid);
      if (!p || p.author !== this._s.me) { this._toast('Only your own posts can be changed here'); return; }
      chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id);
      paint();
    };
    body.addEventListener('click', pick, true);
    const stop = () => { body.classList.remove('selecting'); body.removeEventListener('click', pick, true); bar.remove(); body.querySelectorAll('.fp.sel').forEach(c => c.classList.remove('sel')); };
    bar.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-sb]')?.dataset.sb;
      if (a === 'done') { stop(); return; }
      if (!a || !chosen.size) { if (a) this._toast('Select some posts first'); return; }
      const ids = [...chosen];
      let payload = { post_ids: ids, action: a };
      if (a === 'delete') {
        const r = await this._alert({ title: `Delete ${plural(ids.length, 'Post')}?`, message: 'They’re deleted for everyone, with their photos, videos and comments.', buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', value: true }] });
        if (!r.value) return;
      } else if (a === 'aud') {
        const aud = await this._faudienceSheet({ type: 'everyone' });
        if (!aud) return;
        payload = { post_ids: ids, action: 'audience', audience: aud };
      }
      try {
        const r = await this._ws('feed/bulk', payload);
        this._toast(`${a === 'delete' ? 'Deleted' : a === 'archive' ? 'Archived' : 'Changed'} ${plural(r.done, 'post')}${r.failed ? ` · ${r.failed} couldn’t be` : ''}`);
        if (a === 'delete' || a === 'archive') ids.forEach(id => { this._fd.posts.delete(id); this._refresh('fgone', id); });
        stop(); after?.();
      } catch (err) { this._toast(err.message); }
    });
    void getIds;
    paint();
  },
});

Card.feedReady = true;
(Card.lazyReady = Card.lazyReady || {}).feed = true;
})();
