(()=>{"use strict";const t=window.__crowMessengerCard;if(!t||t.lazyReady?.games)return;const{GAME_NAME:e,PICON:a,esc:n}=t.kit,s=[{id:"ttt",name:"Noughts and Crosses",sub:"Three in a row wins",bg:"linear-gradient(160deg,#FF6482,#E0245E)"},{id:"c4",name:"Connect Four",sub:"Drop counters, line up four",bg:"linear-gradient(160deg,#FFD60A,#FF9F0A)"},{id:"rev",name:"Reversi",sub:"Turn over your opponent’s discs",bg:"linear-gradient(160deg,#30D158,#1E7A3C)",icon:"disc"},{id:"dr",name:"Draughts",sub:"Jump and take, crown your kings",bg:"linear-gradient(160deg,#C0392B,#7B1E14)",icon:"crown"},{id:"sea",name:"Sea Battle",sub:"Find and sink the hidden fleet",bg:"linear-gradient(160deg,#0A84FF,#0B3E8A)",icon:"anchor"},{id:"hang",name:"Hangman",sub:"Guess the hidden word, letter by letter",bg:"linear-gradient(160deg,#8E8E93,#3A3A3C)",emoji:"🔤",setup:1},{id:"rps",name:"Rock Paper Scissors",sub:"Pick in secret, then reveal together",bg:"linear-gradient(160deg,#FF9F0A,#C25E00)",emoji:"✌️",setup:1},{id:"hol",name:"Higher or Lower",sub:"Build the longest streak of cards",bg:"linear-gradient(160deg,#FF453A,#9E1C14)",emoji:"🃏"},{id:"dots",name:"Dots and Boxes",sub:"Close boxes to score and go again",bg:"linear-gradient(160deg,#64D2FF,#0A6EA8)",emoji:"🔲"},{id:"chess",name:"Chess",sub:"The classic, with every rule",bg:"linear-gradient(160deg,#6D4C41,#2E1F1A)",emoji:"♞"},{id:"bg",name:"Backgammon",sub:"Roll, race and bear off",bg:"linear-gradient(160deg,#A1887F,#4E342E)",emoji:"🎲"}],i=[["Battleship",4],["Cruiser",3],["Submarine",3],["Destroyer",2],["Patrol Boat",2]],seaKinds=t=>{const e=new Set;return t.map((t=>{const a=i.findIndex((([a,n],s)=>n===t.length&&!e.has(s)));return e.add(a),i[a]?.[0]||"Ship"}))},seaN=t=>+t.toFixed(3),seaShip=(t,e,{wreck:a=!1,ghost:n=!1}={})=>{const s=[...t].sort(((t,e)=>t-e)),i=s.length,r=Math.floor(s[0]/8),o=s[0]%8;return`<g transform="${i<2||s[1]-s[0]==1?`translate(${o},${r})`:`translate(${o+1},${r}) rotate(90)`}"${n?' opacity="0.55"':""}>${seaHull(i,e,a)}</g>`},seaHull=(t,e,a)=>{const h=t=>seaN(t);if("Submarine"===e&&!a)return`<path d="M0.32,0.3 L${h(t-.4)},0.3 Q${h(t-.08)},0.32 ${h(t-.08)},0.5 Q${h(t-.08)},0.68 ${h(t-.4)},0.7 L0.32,0.7 Q0.1,0.7 0.1,0.5 Q0.1,0.3 0.32,0.3Z" fill="#4f5b66" stroke="#222a31" stroke-width="0.05"/>\n      <rect x="${h(.45*t-.2)}" y="0.36" width="0.5" height="0.28" rx="0.12" fill="#8b98a5"/><circle cx="${h(.45*t+.05)}" cy="0.5" r="0.07" fill="#222a31"/>`;const n=`M0.3,0.2 L${h(t-.5)},0.2 Q${h(t-.12)},0.24 ${h(t-.05)},0.5 Q${h(t-.12)},0.76 ${h(t-.5)},0.8 L0.3,0.8 Q0.1,0.8 0.1,0.5 Q0.1,0.2 0.3,0.2Z`;if(a){const e=t/2;return`<path d="${n}" fill="#4a3027" stroke="#1a0e0a" stroke-width="0.05"/>\n      <path d="M${h(e-.15)},0.2 L${h(e+.05)},0.42 L${h(e-.1)},0.55 L${h(e+.1)},0.8" fill="none" stroke="#1a0e0a" stroke-width="0.08" stroke-linejoin="round"/>\n      <path d="M0.45,0.38 L${h(t-.8)},0.38" stroke="#6b463a" stroke-width="0.06" stroke-dasharray="0.18 0.12"/>`}const s=[.6,...t>=3?[t-.9]:[]].map((t=>`<circle cx="${h(t)}" cy="0.5" r="0.11" fill="#39424c"/><rect x="${h(t)}" y="0.47" width="0.28" height="0.06" fill="#39424c"/>`)).join("");return`<path d="${n}" fill="#6b7783" stroke="#2b333c" stroke-width="0.05"/>\n    <rect x="0.34" y="0.34" width="${h(t-.95)}" height="0.32" rx="0.12" fill="#8794a1"/>\n    <rect x="${h(.45*t-.22)}" y="0.29" width="0.46" height="0.42" rx="0.07" fill="#c7d0d8" stroke="#2b333c" stroke-width="0.03"/>\n    ${t>=3?`<circle cx="${h(.45*t+.42)}" cy="0.5" r="0.09" fill="#2b333c"/>`:""}${s}`},drCrowns=(t,e)=>1===t&&e<8||2===t&&e>=56,drDirs=t=>t>=3?[[-1,-1],[-1,1],[1,-1],[1,1]]:1===t?[[-1,-1],[-1,1]]:[[1,-1],[1,1]],drMoves=(t,e)=>{const a=[],n=[];return t.forEach(((s,i)=>{if(drOwner(s)!==e)return;if(drJumps(t,i,s,i,[]).forEach((([t,e])=>a.push({path:[i,...t],taken:e}))),a.length)return;const r=Math.floor(i/8),o=i%8;for(const[e,a]of drDirs(s)){const s=r+e,d=o+a;g8ok(s,d)&&!t[8*s+d]&&n.push({path:[i,8*s+d],taken:[]})}})),a.length?a:n},drOwner=t=>1===t||3===t?0:2===t||4===t?1:null,drJumps=(t,e,a,n,s)=>{const i=[],r=Math.floor(n/8),o=n%8,d=drOwner(a);for(const[n,l]of drDirs(a)){const p=r+2*n,c=o+2*l;if(!g8ok(p,c))continue;const g=8*(r+n)+o+l,u=8*p+c;if(s.includes(g)||drOwner(t[g])!==1-d||t[u]&&u!==e)continue;const x=[...s,g];if(drCrowns(a,u)){i.push([[u],x]);continue}const m=drJumps(t,e,a,u,x);m.length?m.forEach((([t,e])=>i.push([[u,...t],e]))):i.push([[u],x])}return i},g8ok=(t,e)=>t>=0&&t<8&&e>=0&&e<8,r=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];Object.assign(t.prototype,{_openGames(t,e){const i=this._xsheet({title:"Games",body:`<div class="gpick">${s.map((t=>`<button data-g="${t.id}"><span class="gpi" style="background:${t.bg}">${t.emoji||a[t.icon||("ttt"===t.id?"x":"o")]}</span><span><div class="gpn">${n(t.name)}</div><div class="gps">${n(t.sub)}</div></span></button>`)).join("")}</div>\n        <div class="xnote">Home Assistant keeps the game, so you can take turns whenever you like. It lets the other person know when it’s their turn.</div>`});i.el.querySelector(".gpick").addEventListener("click",(a=>{const n=a.target.closest("[data-g]");if(!n)return;const r=s.find((t=>t.id===n.dataset.g));i.close(),r.setup?this._gameSetup(r,t,e):this._stageApp(e,t,"games",{extra:{type:"game",game:{kind:r.id}},label:r.name,sub:r.sub})}))},_gameHtml(t){const s=t.game||{},i=this._s.me,nm=e=>e===i?"You":this._nameIn(t.thread_id,e,!0);if("word"===s.kind)return`<div class="xcard game" data-x="game"><div class="xh">${a.games}Word Game</div><div class="xs" style="padding-top:2px">This game is no longer available.</div></div>`;const r=s.players||[],o=null!==s.winner&&void 0!==s.winner,d=r[s.turn],l=!o&&(d===i||null==d&&1===s.turn&&r[0]!==i),p=o?"draw"===s.winner?"It’s a draw":r[s.winner]===i&&r[0]!==r[1]?"You won! 🎉":`${n(nm(r[s.winner]))} won${r[0]===r[1]?"":" 🎉"}`:l?"Your turn":d?`${n(nm(d))}’s turn`:"Waiting for someone to play",c=s.board||[],g=s.line||[],who=t=>r[t]?n(nm(r[t])):"Anyone";if("rev"===s.kind||"dr"===s.kind||"sea"===s.kind)return this._bigGameHtml(t,s,{mine:l,over:o,status:p,who,nm});if(["hang","rps","hol","dots","chess","bg"].includes(s.kind))return this._newGameHtml(t,s,{mine:l,over:o,status:p,who,nm});let u,x;if("ttt"===s.kind)x=`<span><span class="gx" style="color:#FF453A">${a.x}</span>${who(0)}</span><span><span style="color:#0A84FF">${a.o}</span>${who(1)}</span>`,u=`<div class="g-ttt">${c.map(((t,e)=>`<button class="${g.includes(e)?"win":""}${e===s.last?" last":""}" data-x="gmove" data-mv="${e}"${l&&!t?"":" disabled"}>${t?`<span class="${1===t?"gx":"go"}">${1===t?a.x:a.o}</span>`:""}</button>`)).join("")}</div>`;else{x=`<span><i style="background:#E53935"></i>${who(0)}</span><span><i style="background:#FDD835"></i>${who(1)}</span>`;const e=[];for(let a=0;a<7;a++){const n=!!c[a];e.push(`<button data-x="gmove" data-mv="${a}" aria-label="Column ${a+1}"${l&&!n?"":" disabled"}>${[0,1,2,3,4,5].map((e=>{const n=7*e+a,i=c[n];return`<span class="d${i?` p${i}`:""}${g.includes(n)?" win":""}${n===s.last&&t.id===this._gameNew?" last":""}"></span>`})).join("")}</button>`)}u=`<div class="g-c4">${e.join("")}</div>`}return`<div class="xcard game" data-x="game"><div class="xh">${a.games}${n(e[s.kind]||"Game")}</div>\n      <div class="xt" style="text-align:center">${p}</div>\n      <div class="g-who">${x}</div>${u}\n      ${o?'<div class="xbtns"><button data-x="gagain">Play Again</button></div>':""}</div>`},async _playClick(t,e,a,n){if("strow"!==t){if("stlock"===t||"stlights"===t){const e=this._homeStatus(),a="stlock"===t,n=(a?e.unlocked:e.lights).map((t=>t.entity_id));if(!n.length)return;if(!(await this._alert({title:a?`Lock ${1===n.length?e.unlocked[0].attributes.friendly_name||"it":`All ${n.length}`}?`:`Turn Off ${n.length} Light${1===n.length?"":"s"}?`,buttons:[{text:a?"Lock":"Turn Off",style:"ok",value:!0},{text:"Cancel",style:"cancel"}]})).value)return;return await this._hass.callService(a?"lock":"light",a?"lock":"turn_off",{entity_id:n}),void this._toast(a?"Locking…":"Turning off…")}if("tmadd"!==t)if("tmcancel"!==t){if("gx"===t||"gtext"===t||"gsq"===t)return this._newGameClick(t,e,a,n);if("gmove"===t)return this._gameNew=n.id,void await this._ws("game/move",{thread_id:a,message_id:n.id,move:+e.dataset.mv});if("gagain"===t&&await this._sendMessage(a,"",[],{type:"game",game:{kind:n.game?.kind||"ttt"}}),"gdr"!==t){if("gshuffle"===t){const t=await this._ws("game/shuffle",{thread_id:a,message_id:n.id});this._fleets.set(`${n.id}:${t.side}`,t),this._refresh("messages",a,!0)}}else await this._draughtsTap(e,a,n)}else{(await this._alert({title:"Cancel Timer?",message:"It stops for everyone in the conversation.",buttons:[{text:"Cancel Timer",style:"destructive",value:!0},{text:"Keep",style:"cancel"}]})).value&&await this._ws("timer",{thread_id:a,message_id:n.id,action:"cancel"})}else await this._ws("timer",{thread_id:a,message_id:n.id,action:"add",minutes:1})}else this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:e.dataset.eid}}))},_bigGameHtml(t,s,{mine:o,over:d,status:l,who:p,nm:c}){const g=this._s.me,u=s.players||[],x=u[0]&&u[0]===u[1],head=(t="")=>`<div class="xcard game big gk-${s.kind}" data-x="game"><div class="xh">${a.games}${n(e[s.kind])}</div>\n      <div class="xt" style="text-align:center">${l}</div>${t}`,m=(d?'<div class="xbtns"><button data-x="gagain">Play Again</button></div>':"")+"</div>",b=s.board||[];if("rev"===s.kind){const e=s.score||[b.filter((t=>1===t)).length,b.filter((t=>2===t)).length],a=null==s.passed||d?"":`<div class="g-note">${n(u[s.passed]===g?"You":c(u[s.passed])||"They")} had no moves, so ${u[s.turn]===g?"you go":`${n(c(u[s.turn]))} goes`} again</div>`,i=`<div class="g-who"><span><i class="rd d1"></i>${p(0)} ${e[0]}</span><span><i class="rd d2"></i>${p(1)} ${e[1]}</span></div>`,l=t.id===this._gameNew,x=new Set(l&&s.flipped||[]),$=b.map(((t,e)=>{const a=o&&!t&&((t,e,a)=>{if(t[e])return[];const n=3-a,s=Math.floor(e/8),i=e%8,o=[];for(const[e,d]of r){const r=[];let l=s+e,p=i+d;for(;g8ok(l,p)&&t[8*l+p]===n;)r.push(8*l+p),l+=e,p+=d;r.length&&g8ok(l,p)&&t[8*l+p]===a&&o.push(...r)}return o})(b,e,s.turn+1).length;return`<button data-x="gmove" data-mv="${e}"${a?' class="ok"':" disabled"} aria-label="Square ${e+1}">${t?`<span class="rd d${t}${e===s.last?" last":""}${x.has(e)?" flip":""}"></span>`:a?'<span class="hint"></span>':""}</button>`})).join("");return head(i+a)+`<div class="g-rev">${$}</div>`+m}if("dr"===s.kind){const e=!x&&u[1]===g,n=s.count||[12,12],i=o?drMoves(b,s.turn):[],r=i.some((t=>t.taken.length)),d=new Set(s.path||[]),l=`<div class="g-who"><span><i class="pc p0"></i>${p(0)} ${n[0]}</span><span><i class="pc p1"></i>${p(1)} ${n[1]}</span></div>`;let c="";for(let n=0;n<64;n++){const r=e?63-n:n,l=Math.floor(r/8),p=r%8,g=b[r];if((l+p)%2==0){c+='<span class="lt"></span>';continue}const u=i.some((t=>t.path[0]===r));c+=`<button data-x="gdr" data-sq="${r}" class="dk${d.has(r)?" trail":""}${u?" can":""}"${o?"":" disabled"}>${g?`<span class="pc p${drOwner(g)}${g>=3?" king":""}${r===s.last&&t.id===this._gameNew?" last":""}">${g>=3?a.crown:""}</span>`:""}</button>`}return head(l+(o&&r?'<div class="g-note">You have to take a piece</div>':""))+`<div class="g-dr">${c}</div>`+m}const $=x?s.turn:u[0]===g?0:u[1]===g?1:null!=u[1]||d?null:1,v=s.shots||[[],[]],w=s.sunk||[[],[]],left=t=>5-(w[t]||[]).length;let k=null;if(s.reveal)k=null;else if(null!=$){const e=`${t.id}:${$}`,a=this._fleets.get(e);a?k=a.fleet:this._fleetAsk.has(e)||(this._fleetAsk.add(e),this._ws("game/fleet",{thread_id:t.thread_id,message_id:t.id}).then((a=>{a?.fleet&&(this._fleets.set(e,a),this._refresh("messages",t.thread_id,!0))})).catch((()=>{})).finally((()=>setTimeout((()=>this._fleetAsk.delete(e)),5e3))))}const grid=(t,{fire:e=!1,small:a=!1}={})=>{const n=v[t]||[],r=w[t]||[],d=new Set(r.flat()),l=((s.reveal?s.reveal[t]:t===$?k:null)||[]).map(((t,e)=>[t,i[e]?.[0]])).filter((([t])=>!t.every((t=>d.has(t))))),p=seaKinds(r),c=l.map((([e,a])=>seaShip(e,a,{ghost:!!s.reveal&&t!==$}))).join("")+r.map(((t,e)=>seaShip(t,p[e],{wreck:!0}))).join("")+n.map(((e,a)=>e||s.last===a&&s.last_board===t?((t,e,a)=>{const n=t%8+.5,s=Math.floor(t/8)+.5;let i="";if(1===e)i+=`<circle cx="${n}" cy="${s}" r="0.3" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.05"/><circle cx="${n}" cy="${s}" r="0.18" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="0.06"/><circle cx="${n}" cy="${s}" r="0.06" fill="#fff"/>`;else if(e>=2){const t=3===e?.6:1,f=(e,a)=>`${seaN(n+e*t)},${seaN(s+a*t)}`;i+=`${2===e?`<circle cx="${seaN(n+.12)}" cy="${seaN(s-.3)}" r="0.16" fill="rgba(60,60,60,0.45)"/>`:""}\n      <path d="M${f(0,-.34)} C${f(.25,-.1)} ${f(.24,.26)} ${f(0,.3)} C${f(-.24,.26)} ${f(-.25,-.1)} ${f(0,-.34)}Z" fill="#ff6d00"/>\n      <path d="M${f(0,-.12)} C${f(.13,.02)} ${f(.12,.22)} ${f(0,.24)} C${f(-.12,.22)} ${f(-.13,.02)} ${f(0,-.12)}Z" fill="#ffd54f"/>`}return a&&(i+=`<rect x="${seaN(n-.46)}" y="${seaN(s-.46)}" width="0.92" height="0.92" rx="0.14" fill="none" stroke="#ffd60a" stroke-width="0.08" class="sea-last"/>`),i})(a,e,s.last===a&&s.last_board===t):"")).join("");return`<div class="g-sea${a?" small":""}">${Array.from({length:64},((t,a)=>{const s=n[a]||0,i=`${"ABCDEFGH"[a%8]}${Math.floor(a/8)+1}`;return e&&!s?`<button data-x="gmove" data-mv="${a}" aria-label="Fire at ${i}"${o?"":" disabled"}></button>`:`<span aria-label="${i}${1===s?" miss":2===s?" hit":3===s?" sunk":""}"></span>`})).join("")}<svg class="sea-art" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true">${c}</svg></div>`},roster=(t,e)=>{const a=seaKinds(w[t]||[]),n=i.map((([t,e])=>{const n=a.indexOf(t);return n>=0&&(a[n]=null),`<span class="sr-ship${n>=0?" sunk":""}" title="${t}${n>=0?" (sunk)":""}"><svg viewBox="0 0 ${e} 1" style="width:${11*e}px">${seaHull(e,t,!1)}</svg></span>`})).join("");return`<div class="sr-row"><span class="sr-n">${e}</span><span class="sr-ships">${n}</span></div>`},y=(()=>{if(null==s.last||!s.result)return"";const t=1-s.last_board,e=u[t]!==g||x?n(c(u[t])||"They"):"You",a=null==$||x||s.last_board!==$?"a":"your";return`<div class="g-note">${e} ${"miss"===s.result?"missed":"hit"===s.result?`hit ${a} ship`:`sank ${a} ship`}${"miss"===s.result?"":"!"}</div>`})();if(null==$)return head(y)+`<div class="sea-two"><div><div class="sea-l">${p(0)} · ${left(0)} left</div>${grid(0,{small:!0})}</div><div><div class="sea-l">${p(1)} · ${left(1)} left</div>${grid(1,{small:!0})}</div></div>`+`<div class="sea-roster">${roster(0,p(0))}${roster(1,p(1))}</div>`+m;const _=1-$,F=x?0===$?"Fleet 2":"Fleet 1":p(_),A=!d&&!(v[$]||[]).some(Boolean);return head(y)+`<div class="sea-l">${F}’s waters · ${left(_)} ship${1===left(_)?"":"s"} left</div>${grid(_,{fire:!d})}`+`<div class="sea-own"><div><div class="sea-l">Your fleet · ${left($)} left</div>${grid($,{small:!0})}</div>`+(A?'<button class="sea-move" data-x="gshuffle">Move My Ships</button>':"")+"</div>"+`<div class="sea-roster">${roster(_,F)}${roster($,"You")}</div>`+m},async _draughtsTap(t,e,a){const n=a.game||{},s=+t.dataset.sq,i=t.closest(".xcard"),r=drMoves(n.board||[],n.turn),o=this._drSel?.mid===a.id?this._drSel.from:null,clear=()=>{i.querySelectorAll(".sel,.tgt").forEach((t=>t.classList.remove("sel","tgt"))),this._drSel=null};if(null!=o){const t=r.filter((t=>t.path[0]===o&&t.path[t.path.length-1]===s)).sort(((t,e)=>e.taken.length-t.taken.length));if(t.length)return clear(),this._gameNew=a.id,void await this._ws("game/move",{thread_id:e,message_id:a.id,move:t[0].path})}clear();const d=r.filter((t=>t.path[0]===s));d.length?(this._drSel={mid:a.id,from:s},t.classList.add("sel"),d.forEach((t=>i.querySelector(`[data-sq="${t.path[t.path.length-1]}"]`)?.classList.add("tgt")))):drOwner((n.board||[])[s])===n.turn&&this._toast(r.some((t=>t.taken.length))?"You have to take a piece":"That piece can’t move")}}),t.lazyCss.games="\n/* the Add to Message drawer, while you're editing it */\n.apps.editing .app { animation: cm-jiggle 0.32s ease-in-out infinite alternate; touch-action: none; }\n.apps.editing .app:nth-child(2n) { animation-delay: -0.16s; }\n@keyframes cm-jiggle { from { transform: rotate(-1.6deg); } to { transform: rotate(1.6deg); } }\n.app { position: relative; }\n.app.hid { opacity: 0.38; }\n.app .abadge { display: none; position: absolute; top: -4px; left: calc(50% - 36px); width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 18px; font-weight: 700; line-height: 22px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.3); z-index: 2; }\n.apps.editing .app .abadge { display: block; background: #8E8E93; }\n.apps.editing .app.hid .abadge { background: #34C759; }\n.app.dragging { z-index: 5; animation: none !important; transform: scale(1.12); opacity: 0.9; }\n.apps-note { font-size: 13px; color: var(--cm-text2); text-align: center; margin: 2px 12px 8px; line-height: 1.4; }\n.apps-note[hidden] { display: none; }\n\n/* Games */\n.xcard.game { width: 268px; }\n.g-who { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px; opacity: 0.8; padding: 0 13px 6px; }\n.g-who span { display: inline-flex; align-items: center; gap: 5px; }\n.g-who i { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }\n.g-who svg { width: 13px; height: 13px; }\n.g-ttt { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 4px 22px 12px; }\n.g-ttt button { aspect-ratio: 1; border-radius: 12px; background: color-mix(in srgb, currentColor 10%, transparent); display: flex; align-items: center; justify-content: center; }\n.g-ttt button svg { width: 62%; height: 62%; }\n.g-ttt button .gx { color: #FF453A; } .g-ttt button .go { color: #0A84FF; }\n.g-ttt button.win { background: color-mix(in srgb, #34C759 30%, transparent); }\n.g-ttt button.last span { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }\n.g-ttt span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }\n@keyframes g-pop { from { transform: scale(0.2); opacity: 0; } to { transform: none; opacity: 1; } }\n.g-c4 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin: 4px 12px 12px; padding: 6px; border-radius: 12px; background: #1E5BD6; }\n.g-c4 button { display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; padding: 0; border-radius: 8px; }\n.g-c4 button:not([disabled]):active { background: rgba(255,255,255,0.12); }\n.g-c4 .d { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.35); box-shadow: inset 0 2px 3px rgba(0,0,0,0.35); }\n.g-c4 .d.p1 { background: radial-gradient(circle at 35% 30%, #FF8A80, #E53935 60%, #B71C1C); box-shadow: none; }\n.g-c4 .d.p2 { background: radial-gradient(circle at 35% 30%, #FFF59D, #FDD835 60%, #F9A825); box-shadow: none; }\n.g-c4 .d.win { outline: 2.5px solid #fff; outline-offset: -2px; }\n.g-c4 .d.last { animation: g-drop 0.45s cubic-bezier(.4,0,.7,1.4); }\n@keyframes g-drop { from { transform: translateY(-160px); } to { transform: none; } }\n.gpick { display: flex; flex-direction: column; gap: 10px; }\n.gpick button { width: 100%; display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 16px; background: var(--cm-fill); text-align: left; color: var(--cm-text); }\n.gpick .gpi { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; }\n.gpick .gpi svg { width: 26px; height: 26px; }\n.gpick .gpn { font-size: 16px; font-weight: 600; } .gpick .gps { font-size: 13px; color: var(--cm-text2); margin-top: 2px; }\n\n/* ── Reversi, Draughts and Sea Battle ── */\n.xcard.game.big { width: 276px; }\n.g-note { text-align: center; font-size: 12.5px; opacity: 0.75; padding: 0 12px 6px; margin-top: -2px; }\n.g-who .rd, .g-who .pc { width: 12px; height: 12px; }\n.g-rev { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; margin: 4px 10px 12px; padding: 4px; border-radius: 10px; background: #145a32; box-shadow: inset 0 0 0 2px #0d3d22; }\n.g-rev button { aspect-ratio: 1; padding: 0; border-radius: 3px; background: #1e8a4c; display: flex; align-items: center; justify-content: center; }\n.g-rev button.ok:active { background: #27a85d; }\n.rd { display: block; width: 84%; height: 84%; border-radius: 50%; }\n.rd.d1 { background: radial-gradient(circle at 35% 30%, #5a5a5e, #111 70%); box-shadow: 0 1px 2px rgba(0,0,0,0.5); }\n.rd.d2 { background: radial-gradient(circle at 35% 30%, #fff, #d9d9de 70%); box-shadow: 0 1px 2px rgba(0,0,0,0.45); }\n.g-rev .hint { width: 26%; height: 26%; border-radius: 50%; background: rgba(0,0,0,0.28); }\n.g-rev .rd.last { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }\n.g-rev .rd.flip { animation: g-flip 0.5s ease; }\n@keyframes g-flip { 0% { transform: scaleX(1); } 50% { transform: scaleX(0.05); } 100% { transform: scaleX(1); } }\n.g-dr { display: grid; grid-template-columns: repeat(8, 1fr); margin: 4px 10px 12px; border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 3px #5b3a1e; }\n.g-dr > * { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }\n.g-dr .lt { background: #f0d9b5; }\n.g-dr .dk { padding: 0; border-radius: 0; background: #8b5a2b; }\n.g-dr .dk.trail { background: #a8743e; }\n.g-dr .dk.sel { background: #c9a227; }\n.g-dr .dk.tgt { background: #6f9a3a; }\n.g-dr .dk.tgt::after { content: ''; width: 30%; height: 30%; border-radius: 50%; background: rgba(255,255,255,0.55); }\n.pc { display: flex; align-items: center; justify-content: center; width: 70%; height: 70%; border-radius: 50%; }\n.pc.p0 { background: radial-gradient(circle at 35% 30%, #ff7a6b, #c0392b 60%, #7b1e14); box-shadow: 0 2px 2px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.18); }\n.pc.p1 { background: radial-gradient(circle at 35% 30%, #fffdf4, #e8dcc0 60%, #b5a37a); box-shadow: 0 2px 2px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(0,0,0,0.08); }\n.pc svg { width: 58%; height: 58%; }\n.pc.p0 svg { color: #ffd76a; } .pc.p1 svg { color: #9a6b10; }\n.g-dr .dk.can .pc { box-shadow: 0 0 0 2px #ffd60a, 0 2px 2px rgba(0,0,0,0.45); }\n.g-dr .pc.last { animation: g-pop 0.35s cubic-bezier(.2,1.6,.4,1); }\n.g-who .pc { display: inline-block; }\n.sea-l { font-size: 12px; font-weight: 600; opacity: 0.75; padding: 2px 12px 4px; }\n.g-sea { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; margin: 0 10px 10px; padding: 3px; border-radius: 8px; background: #0b3e8a; position: relative; }\n.g-sea > button, .g-sea > span { aspect-ratio: 1; padding: 0; border-radius: 3px; background: #1565c0; }\n.g-sea button:not([disabled]):active { background: #1e88e5; }\n.g-sea .sea-art { position: absolute; inset: 3px; width: calc(100% - 6px); height: calc(100% - 6px); pointer-events: none; overflow: visible; }\n.g-sea .sea-last { animation: g-fade 1.2s ease-out both; }\n@keyframes g-fade { from { opacity: 0; } 30% { opacity: 1; } }\n.g-sea.small { gap: 1px; padding: 2px; border-radius: 6px; margin: 0; width: 132px; }\n.g-sea.small > button, .g-sea.small > span { border-radius: 2px; }\n.g-sea.small .sea-art { inset: 2px; width: calc(100% - 4px); height: calc(100% - 4px); }\n.sea-roster { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 6px; }\n.sr-row { display: flex; align-items: center; gap: 8px; }\n.sr-n { width: 64px; flex-shrink: 0; font-size: 12px; font-weight: 600; opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sr-ships { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }\n.sr-ship { position: relative; display: inline-flex; }\n.sr-ship svg { height: 11px; display: block; }\n.sr-ship.sunk { opacity: 0.35; }\n.sr-ship.sunk::after { content: ''; position: absolute; left: -2px; right: -2px; top: 50%; height: 1.5px; background: #ff453a; transform: rotate(-12deg); }\n.sea-own { display: flex; align-items: flex-end; gap: 10px; padding: 0 10px 10px; }\n.sea-own .sea-l { padding: 2px 0 4px; }\n.sea-move { flex: 1; padding: 9px 8px; border-radius: 12px; font-size: 13.5px; font-weight: 600; color: var(--cm-accent); background: color-mix(in srgb, currentColor 10%, transparent); }\n.sea-two { display: flex; gap: 8px; padding: 0 10px 10px; justify-content: center; }\n.sea-two .g-sea.small { width: 124px; }\n.sea-two .sea-l { padding: 2px 0 4px; }\n\n",((T,ICON,ESC)=>{
const NAMES={hang:"Hangman",rps:"Rock Paper Scissors",hol:"Higher or Lower",dots:"Dots and Boxes",chess:"Chess",bg:"Backgammon"};
const SETTERS=["hang"];
const RPS=["✊","✋","✌️"],RPSN=["Rock","Paper","Scissors"];
const RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],SUITS=["♠","♥","♦","♣"];
const GL={1:"♟",2:"♞",3:"♝",4:"♜",5:"♛",6:"♚"};
const END={checkmate:"Checkmate",stalemate:"Stalemate",repetition:"Draw by repetition",fifty:"Draw: fifty moves with no capture",material:"Draw: not enough pieces left"};
const DIE=["⚀","⚁","⚂","⚃","⚄","⚅"];
const ME_COL=["#E53935","#0A84FF"];

const gallows=n=>`<svg viewBox="0 0 100 90" class="hg-art"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M10 84H60M25 84V8H65V20" opacity=".7"/>${n>0?'<circle cx="65" cy="28" r="8"/>':""}${n>1?'<path d="M65 36V60"/>':""}${n>2?'<path d="M65 42L54 52"/>':""}${n>3?'<path d="M65 42L76 52"/>':""}${n>4?'<path d="M65 60L55 74"/>':""}${n>5?'<path d="M65 60L75 74"/>':""}${n>6?'<path d="M61 26l3 3M64 26l-3 3M66 26l3 3M69 26l-3 3" stroke-width="1.5" stroke="#FF453A"/>':""}</g></svg>`;
const cardHtml=(c,sm)=>{if(c==null)return"";const su=Math.floor(c/13);return`<div class="hl-c${sm?" sm":""}${su===1||su===2?" red":""}"><span>${RANKS[c%13]}</span><span class="s">${SUITS[su]}</span></div>`};

Object.assign(T.prototype,{
_newGameHtml(msg,g,c){
  const me=this._s.me,r=g.players||[],k=g.kind,solo=!!r[0]&&r[0]===r[1],over=c.over;
  const head=(extra,status)=>`<div class="xcard game big gk-${k}" data-x="game"><div class="xh">${ICON.games}${NAMES[k]}</div><div class="xt" style="text-align:center">${status==null?c.status:status}</div>${extra}`;
  const foot=(over?'<div class="xbtns"><button data-x="gagain">Play Again</button></div>':"")+"</div>";
  const dot=i=>`<i style="background:${ME_COL[i]}"></i>`;
  // the person who set the word, and the person guessing it
  let setSt=null,secret=null;
  if(SETTERS.includes(k)){
    const gn=r[1]?(r[1]===me?"You":c.nm(r[1])):null;
    if(over)setSt=g.winner===1?(solo||r[1]===me?"You got it! 🎉":`${ESC(gn||"They")} got it! 🎉`):(r[0]===me&&!solo?`${ESC(gn||"They")} didn’t get it`:"Not this time");
    else if(c.mine)setSt="Your turn to guess";
    else if(!r[1])setSt="Waiting for someone to guess";
    else setSt=`${ESC(gn)} is guessing`;
    if(r[0]===me&&!solo&&!over)secret=this._gSecret(msg);
  }
  const mine=c.mine&&!over;
  const input=(ph,max)=>mine?`<div class="g-in"><input maxlength="${max}" placeholder="${ph}" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false"><button data-x="gtext">Guess</button></div>`:"";
  const chip=secret?`<div class="g-note">Your word: <b>${ESC(secret.toUpperCase())}</b></div>`:"";

  if(k==="hang"){
    const pat=g.pattern||[],right=new Set(pat.filter(x=>x&&x!==" ")),gs=g.guessed||[];
    const slots=pat.map(ch=>ch===" "?'<i class="hg-gap"></i>':`<b class="hg-ch">${ch?ESC(ch):""}</b>`).join("");
    const kb="abcdefghijklmnopqrstuvwxyz".split("").map(ch=>{const used=gs.includes(ch);return`<button data-x="gx" data-mv="${ch}" class="${used?(right.has(ch)?"right":"wrong"):""}"${mine&&!used?"":" disabled"}>${ch}</button>`}).join("");
    const lost=over&&g.winner===0&&g.answer?`<div class="g-note">The word was <b>${ESC(g.answer.toUpperCase())}</b></div>`:"";
    return head(`${chip}${gallows(g.wrong||0)}<div class="g-note">${(g.wrong||0)} of 7 wrong</div><div class="hg-word">${slots}</div>${lost}<div class="hg-kb">${kb}</div>${input("Guess the whole word",30)}`,setSt)+foot;
  }
  if(k==="rps"){
    const a0=!solo&&r[1]===me?1:0,b0=1-a0,sc=g.scores||[0,0],h=g.history||[],last=h[h.length-1];
    const lastRes=last?(last[a0]===last[b0]?"Draw, go again":(((last[a0]-last[b0]+3)%3===1)?`${ESC(c.nm(r[a0])==="You"?"You win":c.nm(r[a0])+" wins")} that round`:`${ESC(c.nm(r[b0])==="You"?"You win":c.nm(r[b0])+" wins")} that round`)):"";
    const hist=h.slice(0,-1).map(x=>`<span>${RPS[x[a0]]}${RPS[x[b0]]}</span>`).join("");
    const btns=mine?`<div class="rp-btns">${[0,1,2].map(i=>`<button data-x="gx" data-mv="${i}"><span class="e">${RPS[i]}</span>${RPSN[i]}</button>`).join("")}</div>`:"";
    const pk=g.picked||[],waiting=!over&&!mine&&pk[g.turn]===false&&pk[1-g.turn]?"":"";
    return head(`<div class="g-who"><span>${dot(a0)}${c.who(a0)} ${sc[a0]}</span><span>${dot(b0)}${c.who(b0)} ${sc[b0]}</span></div><div class="g-note">First to ${g.need} win${g.need>1?"s":""}</div>${last?`<div class="rp-last"><span>${RPS[last[a0]]}</span><small>vs</small><span>${RPS[last[b0]]}</span></div><div class="g-note">${lastRes}</div>`:""}${hist?`<div class="rp-hist">${hist}</div>`:""}${btns}${waiting}`)+foot;
  }
  if(k==="hol"){
    const bests=g.best||[null,null];
    const row=i=>`<span>${dot(i)}${c.who(i)}: <b>${bests[i]!=null?bests[i]:(g.turn===i&&!over?g.streak+" now":"–")}</b></span>`;
    const res=g.ok===true?"Correct! 🎉":g.ok===false?"Wrong, streak over":g.prev!=null&&g.ok===null?"Same rank, go again":"";
    const btns=mine?`<div class="rp-btns"><button data-x="gx" data-mv="1"><span class="e">▲</span>Higher</button><button data-x="gx" data-mv="0"><span class="e">▼</span>Lower</button></div>`:"";
    return head(`<div class="g-who">${row(0)}${row(1)}</div><div class="hl-row">${cardHtml(g.prev,!0)}${g.prev!=null?"<small>→</small>":""}${cardHtml(g.card)}</div><div class="g-note">${res}${res?" · ":""}${g.left} card${g.left===1?"":"s"} left · same rank is a push</div>${btns}`)+foot;
  }
  if(k==="dots"){
    const S=40,P=10,e=g.edges||[],bx=g.boxes||[];let sv="";
    for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(bx[i*5+j])sv+=`<rect x="${P+j*S}" y="${P+i*S}" width="${S}" height="${S}" fill="${ME_COL[bx[i*5+j]-1]}" opacity=".28"/>`;
    const line=(x1,y1,x2,y2,id)=>{const o=e[id];return`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o?ME_COL[o-1]:"currentColor"}" stroke-opacity="${o?1:.16}" stroke-width="${o?5:3}" stroke-linecap="round"${id===g.last?' class="last"':""}/>`+(!o&&mine?`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="20" stroke-linecap="round" data-x="gx" data-mv="${id}" class="hit"/>`:"")};
    for(let i=0;i<6;i++)for(let j=0;j<5;j++)sv+=line(P+j*S,P+i*S,P+(j+1)*S,P+i*S,i*5+j);
    for(let i=0;i<5;i++)for(let j=0;j<6;j++)sv+=line(P+j*S,P+i*S,P+j*S,P+(i+1)*S,30+i*6+j);
    for(let i=0;i<6;i++)for(let j=0;j<6;j++)sv+=`<circle cx="${P+j*S}" cy="${P+i*S}" r="4" fill="currentColor"/>`;
    const sc=g.score||[0,0],more=!over&&g.got&&c.mine?'<div class="g-note">You completed a box, so go again</div>':"";
    return head(`<div class="g-who"><span>${dot(0)}${c.who(0)} ${sc[0]}</span><span>${dot(1)}${c.who(1)} ${sc[1]}</span></div>${more}<svg class="db-art" viewBox="0 0 ${P*2+S*5} ${P*2+S*5}">${sv}</svg>`)+foot;
  }
  if(k==="chess"){
    const flip=!solo&&r[1]===me,b=g.board||[],legal=g.legal||[],from=new Set(mine?legal.map(m=>m[0]):[]);
    const chk=g.check&&!over?b.indexOf(g.turn===0?6:-6):-1,last=g.last||[],sel=this._sqSel?.mid===msg.id?this._sqSel.from:null;
    let sq="";
    for(let n=0;n<64;n++){const i=flip?63-n:n,rr=i>>3,cc=i&7,v=b[i];
      sq+=`<button data-x="gsq" data-sq="${i}" class="cs ${(rr+cc)%2===0?"l":"d"}${last.includes(i)?" last":""}${i===chk?" chk":""}${i===sel?" sel":""}"${mine?"":" disabled"}>${v?`<span class="cp ${v>0?"w":"b"}">${GL[Math.abs(v)]}︎</span>`:""}</button>`}
    const cap=i=>(g.cap?.[i]||[]).map(p=>GL[p]+"︎").join("");
    const note=over?`<div class="g-note">${END[g.end]||""}</div>`:g.check?'<div class="g-note">Check!</div>':"";
    return head(`<div class="g-who"><span><i class="ch-w"></i>${c.who(0)}</span><span><i class="ch-b"></i>${c.who(1)}</span></div>${note}<div class="g-ch">${sq}</div>${cap(0)||cap(1)?`<div class="ch-cap"><span class="b">${cap(0)}</span><span class="w">${cap(1)}</span></div>`:""}`)+foot;
  }
  if(k==="bg"){
    const flip=!solo&&r[1]===me,pts=g.pts||[],bar=g.bar||[0,0],off=g.off||[0,0],legal=g.legal||[],dice=g.dice||[];
    const froms=new Set(mine?legal.map(m=>m[0]):[]),W=17,X0=6,BAR=14;
    const colX=col=>X0+col*W+(col>=6?BAR:0),bottomSide=flip?1:0;
    let sv='<rect x="0" y="0" width="230" height="176" rx="8" fill="#5b3a1e"/><rect x="108" y="6" width="14" height="164" fill="#3b2412"/>';
    const chk=(cx,cy,side)=>`<circle cx="${cx}" cy="${cy}" r="7.2" fill="${side===0?"#E53935":"#FFF3D6"}" stroke="${side===0?"#8e1b17":"#a89870"}" stroke-width="1"/>`;
    for(let p=1;p<=24;p++){
      const q=flip?25-p:p,top=q>=13,col=top?q-13:12-q,x=colX(col),n=Math.abs(pts[p]||0),side=(pts[p]||0)>0?0:1;
      const base=top?6:170,tip=top?70:106,dir=top?1:-1,fill=((top?col:11-col)%2===0)?"#c9a56b":"#8b5a2b";
      let inner=`<path class="pt" d="M${x} ${base}L${x+W} ${base}L${x+W/2} ${tip}Z" fill="${fill}"/><rect x="${x}" y="${top?6:106}" width="${W}" height="64" fill="transparent"/>`;
      for(let i=0;i<Math.min(n,5);i++)inner+=chk(x+W/2,base+dir*(7.5+i*14.6),side);
      if(n>5)inner+=`<text x="${x+W/2}" y="${base+dir*(7.5+4*14.6)+3.5}" font-size="10" font-weight="700" text-anchor="middle" fill="${side===0?"#fff":"#222"}">${n}</text>`;
      sv+=`<g${mine?` data-x="gsq" data-sq="${p}"`:""} class="${froms.has(p)?"can":""}">${inner}</g>`;
    }
    let bi="";
    for(const s of[0,1])for(let i=0;i<Math.min(bar[s],4);i++)bi+=chk(115,s===bottomSide?112+i*14:64-i*14,s);
    sv+=`<g${mine?' data-x="gsq" data-sq="0"':""} class="${froms.has(0)?"can":""}"><rect class="pt" x="108" y="6" width="14" height="164" fill="transparent"/>${bi}</g>`;
    const offBtn=mine&&legal.some(m=>m[1]===0||m[1]===25)?'<button data-x="gsq" data-sq="off" class="bg-off">Bear off</button>':"";
    const dv=dice.map(d=>`<span>${DIE[d-1]}</span>`).join("");
    const rollBtn=mine&&!dice.length?'<button data-x="gx" data-mv="roll" class="bg-roll">🎲 Roll</button>':"";
    const lastRoll=!dice.length&&g.roll&&!rollBtn?`<span class="bg-last">${DIE[g.roll[0]-1]} ${DIE[g.roll[1]-1]}</span>`:"";
    const note=g.note==="no moves"?'<div class="g-note">No legal moves, so the turn passed</div>':"";
    return head(`<div class="g-who"><span>${dot(0)}${c.who(0)} · off ${off[0]}</span><span><i style="background:#FFF3D6;border:1px solid #a89870"></i>${c.who(1)} · off ${off[1]}</span></div><svg class="bg-art" viewBox="0 0 230 176">${sv}</svg><div class="bg-dice">${dv}${rollBtn}${lastRoll}</div>${offBtn?`<div class="bg-offrow">${offBtn}</div>`:""}${note}`)+foot;
  }
  return head("")+foot;
},

_gSecret(msg){
  if(!this._gsec)this._gsec=new Map;if(!this._gsecAsk)this._gsecAsk=new Set;
  const key=msg.id,v=this._gsec.get(key);if(v!==undefined)return v;
  if(!this._gsecAsk.has(key)){this._gsecAsk.add(key);
    this._ws("game/secret",{thread_id:msg.thread_id,message_id:msg.id}).then(x=>{if(x&&x.secret){this._gsec.set(key,x.secret);this._refresh("messages",msg.thread_id,!0)}}).catch(()=>{}).finally(()=>setTimeout(()=>this._gsecAsk.delete(key),5000))}
  return null;
},

async _newGameClick(action,el,tid,msg){
  if(action==="gx"){let v=el.dataset.mv;if(/^-?\d+$/.test(v))v=+v;this._gameNew=msg.id;return void await this._ws("game/move",{thread_id:tid,message_id:msg.id,move:v})}
  if(action==="gtext"){const inp=el.closest(".xcard")?.querySelector(".g-in input"),v=(inp?.value||"").trim();if(!v)return void this._toast("Type your guess first");
    this._gameNew=msg.id;await this._ws("game/move",{thread_id:tid,message_id:msg.id,move:v});if(inp)inp.value="";return}
  if(msg.game?.kind==="chess")return this._chessTap(el,tid,msg);
  return this._bgTap(el,tid,msg);
},

async _chessTap(el,tid,msg){
  const g=msg.game||{},sq=+el.dataset.sq,card=el.closest(".xcard"),legal=g.legal||[],b=g.board||[];
  const clear=()=>{card.querySelectorAll(".cs.sel,.cs.tgt").forEach(x=>x.classList.remove("sel","tgt"));this._sqSel=null};
  const from=this._sqSel?.mid===msg.id?this._sqSel.from:null;
  if(from!=null&&legal.some(m=>m[0]===from&&m[1]===sq)){
    const pawn=Math.abs(b[from])===1&&(sq>>3===0||sq>>3===7);let promo=0;
    if(pawn){const a=await this._alert({title:"Promote To",buttons:[{text:"Queen",value:5},{text:"Rook",value:4},{text:"Bishop",value:3},{text:"Knight",value:2},{text:"Cancel",style:"cancel"}]});if(!a||!a.value)return clear();promo=a.value}
    clear();this._gameNew=msg.id;return void await this._ws("game/move",{thread_id:tid,message_id:msg.id,move:promo?[from,sq,promo]:[from,sq]});
  }
  clear();
  const tos=legal.filter(m=>m[0]===sq);
  if(tos.length){this._sqSel={mid:msg.id,from:sq};el.classList.add("sel");tos.forEach(m=>card.querySelector(`.cs[data-sq="${m[1]}"]`)?.classList.add("tgt"))}
},

async _bgTap(el,tid,msg){
  const g=msg.game||{},raw=el.dataset.sq,card=el.closest(".xcard"),legal=g.legal||[];
  const clear=()=>{card.querySelectorAll(".tgt").forEach(x=>x.classList.remove("tgt"));this._bgSel=null};
  const from=this._bgSel?.mid===msg.id?this._bgSel.from:null;
  const isOff=m=>m[1]===0||m[1]===25;
  if(from!=null){
    const to=raw==="off"?legal.find(m=>m[0]===from&&isOff(m))?.[1]:+raw,ok=to!=null&&legal.some(m=>m[0]===from&&m[1]===to);
    if(ok){clear();this._gameNew=msg.id;return void await this._ws("game/move",{thread_id:tid,message_id:msg.id,move:[from,to]})}
  }
  clear();
  if(raw==="off")return;
  const f=+raw,tos=legal.filter(m=>m[0]===f);
  if(tos.length){this._bgSel={mid:msg.id,from:f};tos.forEach(m=>{const sel=isOff(m)?'[data-sq="off"]':`[data-sq="${m[1]}"]`;card.querySelectorAll(sel).forEach(x=>x.classList.add("tgt"))})}
},

_gameSetup(def,thread,target){
  const stage=game=>this._stageApp(target,thread,"games",{extra:{type:"game",game},label:def.name,sub:def.sub});
  const k=def.id;
  if(k==="rps"){
    const x=this._xsheet({title:def.name,body:`<div class="gsetup"><div class="gs-t">How many rounds?</div><div class="gs-row">${[[1,"Just one"],[3,"Best of 3"],[5,"Best of 5"]].map(([n,l])=>`<button data-r="${n}">${l}</button>`).join("")}</div></div>`});
    x.el.querySelector(".gsetup").addEventListener("click",ev=>{const b=ev.target.closest("[data-r]");if(!b)return;x.close();stage({kind:"rps",rounds:+b.dataset.r})});
    return;
  }
  if(k==="hang"){
    const five=!1,x=this._xsheet({title:def.name,body:`<div class="gsetup"><div class="gs-t">${five?"Choose a five-letter word for them to guess, or let Home Assistant pick one.":"Choose a word or phrase for them to guess, or let Home Assistant pick one."}</div><input class="gs-w" maxlength="${five?5:30}" placeholder="${five?"Five-letter word":"Word or phrase"}" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false"><div class="gs-row"><button class="gs-go">Use This Word</button><button class="gs-rand">Pick One for Me</button></div><div class="xnote">Only you can see the word until the game ends.</div></div>`});
    const inp=x.el.querySelector(".gs-w");
    x.el.querySelector(".gs-go").addEventListener("click",()=>{const w=inp.value.trim();
      if(five?!/^[a-z]{5}$/i.test(w):!/^[a-z][a-z '\-]{1,29}$/i.test(w))return void this._toast(five?"Use exactly five letters":"Use letters and spaces only");
      x.close();stage({kind:k,word:w})});
    x.el.querySelector(".gs-rand").addEventListener("click",()=>{x.close();stage({kind:k})});
    return;
  }
}
});

T.lazyCss.games+=`
/* ── Hangman, Rock Paper Scissors, Higher or Lower, Dots and Boxes, Chess, Backgammon ── */
.g-in { display: flex; gap: 6px; padding: 0 10px 10px; }
.g-in input { flex: 1; min-width: 0; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--cm-sep); background: var(--cm-fill); color: inherit; font-size: 16px; }
.g-in button { padding: 8px 12px; border-radius: 10px; font-weight: 600; color: var(--cm-accent); background: color-mix(in srgb, currentColor 12%, transparent); }
.hg-art { display: block; width: 150px; height: auto; margin: 0 auto; }
.hg-word { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; padding: 4px 12px 8px; }
.hg-ch { min-width: 18px; height: 26px; border-bottom: 2.5px solid currentColor; text-align: center; font-size: 18px; font-weight: 700; text-transform: uppercase; line-height: 26px; }
.hg-gap { width: 12px; }
.hg-kb { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; padding: 0 10px 10px; }
.hg-kb button { padding: 6px 0; border-radius: 7px; font-weight: 600; font-size: 13px; text-transform: uppercase; background: color-mix(in srgb, currentColor 10%, transparent); }
.hg-kb button.right { background: #34C759; color: #fff; opacity: 1; }
.hg-kb button.wrong { background: #FF453A; color: #fff; opacity: 0.85; }
.rp-btns { display: flex; gap: 8px; padding: 4px 10px 12px; }
.rp-btns button { flex: 1; padding: 10px 0; border-radius: 14px; background: var(--cm-fill); color: var(--cm-text); display: flex; flex-direction: column; align-items: center; font-size: 12px; gap: 2px; }
.rp-btns .e { font-size: 30px; line-height: 1.1; }
.rp-last { display: flex; justify-content: center; align-items: center; gap: 14px; font-size: 38px; padding: 6px 0 2px; }
.rp-last small { font-size: 13px; opacity: 0.6; }
.rp-hist { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; padding: 0 10px 8px; font-size: 14px; opacity: 0.8; }
.hl-row { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 4px 0 8px; }
.hl-c { width: 64px; height: 90px; border-radius: 9px; background: #fff; color: #1c1c1e; box-shadow: 0 1px 4px rgba(0,0,0,0.35); display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; font-size: 26px; line-height: 1.05; }
.hl-c.red { color: #D32F2F; } .hl-c .s { font-size: 22px; }
.hl-c.sm { width: 44px; height: 62px; font-size: 18px; opacity: 0.55; } .hl-c.sm .s { font-size: 16px; }
.db-art { display: block; width: calc(100% - 20px); margin: 2px 10px 10px; }
.db-art .hit { cursor: pointer; }
.db-art .last { animation: g-fade 1.2s ease-out both; }
.g-who .ch-w, .g-who .ch-b { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px solid rgba(128,128,128,0.6); }
.ch-w { background: #fff; } .ch-b { background: #1a1a1a; }
.g-ch { display: grid; grid-template-columns: repeat(8, 1fr); margin: 4px 10px 8px; border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 3px #3b2a1a; }
.cs { aspect-ratio: 1; padding: 0; border-radius: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.cs.l { background: #f0d9b5; } .cs.d { background: #b58863; }
.cs.last { box-shadow: inset 0 0 0 100px rgba(255,214,10,0.38); }
.cs.chk { box-shadow: inset 0 0 0 100px rgba(255,69,58,0.55); }
.cs.sel { box-shadow: inset 0 0 0 100px rgba(48,209,88,0.5); }
.cs.tgt::after { content: ''; position: absolute; width: 30%; height: 30%; border-radius: 50%; background: rgba(0,0,0,0.3); }
.cp { font-size: 25px; line-height: 1; font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif; }
.cp.w { color: #fff; text-shadow: 0 0 1.5px #000, 0 0 1.5px #000, 0 0 1px #000; }
.cp.b { color: #1a1a1a; text-shadow: 0 0 1px rgba(255,255,255,0.45); }
.ch-cap { display: flex; justify-content: space-between; gap: 8px; padding: 0 12px 10px; font-size: 15px; min-height: 18px; }
.ch-cap .w { color: #fff; text-shadow: 0 0 1px #000, 0 0 1px #000; } .ch-cap .b { color: #1a1a1a; }
.bg-art { display: block; width: calc(100% - 20px); margin: 2px 10px 6px; }
.bg-art .pt { stroke: none; }
.bg-art .can .pt { stroke: #ffd60a; stroke-width: 1.6; }
.bg-art .tgt .pt { stroke: #30D158; stroke-width: 2.4; }
.bg-art g[data-x] { cursor: pointer; }
.bg-dice { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 34px; line-height: 1; padding: 0 10px 6px; min-height: 42px; }
.bg-last { font-size: 26px; opacity: 0.55; }
.bg-roll, .bg-off { padding: 9px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; color: var(--cm-accent); background: color-mix(in srgb, currentColor 12%, transparent); }
.bg-off.tgt { outline: 2px solid #30D158; }
.bg-offrow { display: flex; justify-content: center; padding: 0 10px 8px; }
.gsetup { display: flex; flex-direction: column; gap: 12px; }
.gs-t { font-size: 14px; color: var(--cm-text2); line-height: 1.4; }
.gs-w { padding: 11px 12px; border-radius: 12px; border: 1px solid var(--cm-sep); background: var(--cm-fill); color: inherit; font-size: 16px; }
.gs-row { display: flex; gap: 8px; }
.gs-row button { flex: 1; padding: 12px 8px; border-radius: 12px; font-size: 15px; font-weight: 600; color: var(--cm-accent); background: var(--cm-fill); }
`;
})(t,a,n),t.lazyReady.games=!0})();
