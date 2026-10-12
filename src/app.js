/* Raise the Bar: game logic and UI. Started by main.js once a user is signed in. */


/* ---------- content ---------- */
const CATS = {
  body:{label:"Body", c:"var(--tang)"}, biz:{label:"Biz", c:"var(--sun)"}, money:{label:"Money", c:"var(--mint)"},
  home:{label:"Home", c:"var(--bubble)"}, sleep:{label:"Sleep", c:"var(--grape)"}, mind:{label:"Mind", c:"var(--sky)"},
  food:{label:"Food", c:"var(--lime)"}, fun:{label:"Fun", c:"var(--aqua)"}, people:{label:"People", c:"var(--red)"}
};
const SLOTS = [["morning","Morning"],["after","After work"],["evening","Evening"],["any","Anytime"]];
const ALL = [0,1,2,3,4,5,6], WEEKDAYS = [1,2,3,4,5];
const DAY_ORDER = [1,2,3,4,5,6,0];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const XP_CHOICES = [10,20,30,40,50];
const HP = 700, BOSS_COINS = 100, BORED_XP = 15;
const XP_PER_EUR = 10, COOL_MS = 72*3600*1000, SKIP_BONUS = 100;

const LEVELS = ["Couch Potato","Snack Goblin","Nap Specialist","Side Quest Enjoyer","Lowkey Locked In","Certified Grinder","Habit Machine","Main Character","Menace to Laziness","Final Boss","Legend","Mythic"];
const BOSSES = [
  {n:"The Couch", c:"var(--bubble)"}, {n:"Doomscroll Dragon", c:"var(--mint)"}, {n:"Snooze Lord", c:"var(--grape)"},
  {n:"Mount Laundry", c:"var(--sky)"}, {n:"Captain Later", c:"var(--tang)"}, {n:"The Takeout Troll", c:"var(--sun)"}
];
const BORED = [
  "Walk to the shop and back","10 push-ups. Right now.","Text someone you haven't seen in ages","Clear out one drawer",
  "Delete 30 screenshots","Unsubscribe from 5 newsletters","Stretch for 5 minutes","Make a snack instead of ordering",
  "Draft one outreach message","Photograph one thing you could sell","Take the trash out","Hold a plank for 45 seconds",
  "Clear your desk completely","Drink a full glass of water","10 minutes outside, phone stays home","Write tomorrow's 3 priorities",
  "Fold the clothes on the chair","Wipe your monitor and keyboard",
  "20 squats, slow ones","Wall sit for 45 seconds","Walk around the block once","Dance to one full song",
  "Make your bed properly","Empty the dishwasher or wash 5 dishes","Throw out 5 things you don't need","Clean your phone screen and case",
  "Open a window, 5 min of fresh air","Water a plant or wipe one shelf","Take out anything that belongs in the kitchen",
  "Screenshot 1 bad local website for outreach","Write 3 business names to contact tomorrow","Update one line on your portfolio",
  "Ask an old client for a review","Check sold prices of something you could sell","Sort one shelf or collection",
  "Check this week's spending in your bank app","Cancel or check one subscription","Plan tomorrow's meals, no delivery",
  "Clear 20 emails from your inbox","Close every browser tab you don't need","Delete 3 apps you never open",
  "Read 5 pages of anything","Learn one new keyboard shortcut","Cold water on your face, 30 seconds",
  "Message someone you love something nice","Call a family member for 5 min","Lay out tomorrow's clothes"
];
const HYPE = ["W.","Ate.","Easy.","Locked in.","Lazy who?","Too easy.","Cooking.","Another one.","Clean."];
const MINI_HYPE = ["Mini still counts.","Small W.","Beats zero.","Counts. Next."];
const MARQUEE = "Do the bars + Stack the coins + Beat the boss + Lazy but locked in + ";

function defaultTasks(){ return [
  {id:"room",   name:"Desk + room reset",          mini:"Just make the bed",         cat:"home",  slot:"morning", time:"",      days:ALL.slice(),      xp:20},
  {id:"walk",   name:"20-min walk",                mini:"10 min outside",            cat:"body",  slot:"after",   time:"",      days:ALL.slice(),      xp:30},
  {id:"gym",    name:"12-min home workout",        mini:"10 push-ups + 15 squats",   cat:"body",  slot:"after",   time:"",      days:[1,3,5],          xp:40},
  {id:"focus",  name:"45 min on your main goal",   mini:"15 min on it",              cat:"biz",   slot:"after",   time:"",      days:WEEKDAYS.slice(), xp:40},
  {id:"water",  name:"Drink 2 litres of water",    mini:"Drink 1 litre",             cat:"food",  slot:"any",     time:"",      days:ALL.slice(),      xp:15},
  {id:"food",   name:"No impulse food orders",    mini:"",                          cat:"food",  slot:"evening", time:"",      days:ALL.slice(),      xp:20},
  {id:"review", name:"Sunday review",              mini:"Write 1 thing that worked", cat:"mind",  slot:"evening", time:"",      days:[0],              xp:50},
  {id:"phone",  name:"Phone off the bed by 22:30", mini:"Lights off by 23:30",       cat:"sleep", slot:"evening", time:"22:30", days:ALL.slice(),      xp:20}
];}
function defaultTreats(){ return [
  {id:"movie", name:"Movie night", cost:100},
  {id:"sleep", name:"Sleep in on Saturday", cost:120},
  {id:"game",  name:"Gaming night, zero guilt", cost:150},
  {id:"deliv", name:"One planned takeaway", cost:300}
];}

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2,"0");
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); };
const addDays = (k,n) => { const d = parseKey(k); d.setDate(d.getDate()+n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const dow = k => parseKey(k).getDay();
const mondayOf = k => addDays(k, -((dow(k)+6)%7));
const dayIndex = k => { const [y,m,d] = k.split("-").map(Number); return Math.round(Date.UTC(y,m-1,d)/864e5); };
const fmtDay = k => parseKey(k).toLocaleDateString("en-GB",{weekday:"short", day:"numeric", month:"short"});

/* ---------- state ---------- */
let LS_KEY = "rtb-save:local"; const LS_SOUND = "rtb-sound";
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
const clone = o => JSON.parse(JSON.stringify(o));

function defaultState(){
  return { v:1, updatedAt:0, startDate:todayKey(), mainQuest:"", nick:"",
    tasks:defaultTasks(), treats:defaultTreats(), log:{}, banked:{xp:0, boss:0}, spent:0, buys:[], wish:[], bonus:0, skipWeeks:[] };
}
function normalize(r){
  if(!r || typeof r !== "object") return null;
  const d = defaultState();
  const okSlot = s => SLOTS.some(x => x[0] === s);
  return {
    v:1,
    updatedAt: Number(r.updatedAt) || 0,
    startDate: /^\d{4}-\d\d-\d\d$/.test(r.startDate) ? r.startDate : d.startDate,
    mainQuest: typeof r.mainQuest === "string" ? r.mainQuest.slice(0,90) : "",
    tasks: Array.isArray(r.tasks) ? r.tasks.filter(t => t && t.id && t.name).map(t => ({
      id:String(t.id), name:String(t.name).slice(0,60), mini:String(t.mini||"").slice(0,60),
      cat: CATS[t.cat] ? t.cat : "mind", slot: okSlot(t.slot) ? t.slot : "any", time:String(t.time||"").slice(0,10),
      days: Array.isArray(t.days) ? t.days.map(Number).filter(n => n>=0 && n<=6) : ALL.slice(),
      xp: Math.max(5, Math.min(100, Number(t.xp) || 20))
    })) : d.tasks,
    treats: Array.isArray(r.treats) ? r.treats.filter(t => t && t.id && t.name).map(t => ({id:String(t.id), name:String(t.name).slice(0,60), cost:Math.max(1, Number(t.cost)||100)})) : d.treats,
    log: r.log && typeof r.log === "object" ? r.log : {},
    banked: {xp:Number(r.banked && r.banked.xp)||0, boss:Number(r.banked && r.banked.boss)||0},
    spent: Number(r.spent) || 0,
    buys: Array.isArray(r.buys) ? r.buys.slice(-20) : [],
    profile: r.profile && typeof r.profile === "object" ? r.profile : null,
    nick: typeof r.nick === "string" ? r.nick.slice(0,24) : "",
    wish: Array.isArray(r.wish) ? r.wish.filter(w => w && w.id && w.name).map(w => ({
      id:String(w.id), name:String(w.name).slice(0,60), price:Math.max(1, Number(w.price)||1), need:Math.max(10, Number(w.need)||10),
      added:Number(w.added)||Date.now(), addedXP:Number(w.addedXP)||0, ok:!!w.ok
    })) : [],
    bonus: Number(r.bonus) || 0,
    skipWeeks: Array.isArray(r.skipWeeks) ? r.skipWeeks.filter(x => typeof x === "string").slice(-12) : []
  };
}
let S = defaultState();
let soundOn = lsGet(LS_SOUND) !== "off";

/* ---------- derived ---------- */
const entry = k => S.log[k] || {t:{}, b:0};
const half = xp => Math.ceil(xp/2);
const sched = k => S.tasks.filter(t => t.days.includes(dow(k)));
const dayXP = k => { const e = entry(k); let x = (e.b||0) * BORED_XP; for(const id in e.t) x += Number(e.t[id].xp)||0; return x; };
const dayCount = k => { const e = entry(k); return Object.keys(e.t).length + (e.b||0); };
const needFor = k => Math.min(3, Math.max(1, sched(k).length));
const secured = k => dayCount(k) >= needFor(k);
const weekXP = mon => { let x = 0; for(let i=0;i<7;i++) x += dayXP(addDays(mon,i)); return x; };
function shieldDay(mon){
  const today = todayKey(); let pick = null;
  for(let i=0;i<7;i++){ const k = addDays(mon,i); if(k >= today || k < S.startDate) continue; if(!secured(k)) pick = k; }
  return pick;
}
function streak(){
  const today = todayKey(); let s = secured(today) ? 1 : 0; let k = addDays(today,-1);
  while(k >= S.startDate){
    if(secured(k)) s++;
    else if(shieldDay(mondayOf(k)) !== k) break;
    k = addDays(k,-1);
  }
  return s;
}
function totalXP(){ let x = S.banked.xp; for(const k in S.log) x += dayXP(k); return x; }
function bossesBeaten(){
  const w = {}; for(const k in S.log){ const m = mondayOf(k); w[m] = (w[m]||0) + dayXP(k); }
  let n = S.banked.boss; for(const m in w) if(w[m] >= HP) n++; return n;
}
const coins = () => totalXP() + BOSS_COINS*bossesBeaten() + S.bonus - S.spent;
function levelInfo(xp){
  let L = 1, base = 0, need = 150;
  while(xp >= base + need){ base += need; L++; need = 150 + 75*(L-1); }
  return {L, into:xp-base, need, name:LEVELS[Math.min(L, LEVELS.length)-1]};
}
const bossFor = mon => BOSSES[((Math.floor(dayIndex(mon)/7) % BOSSES.length) + BOSSES.length) % BOSSES.length];
function daysLabel(d){
  const s = d.slice().sort().join("");
  if(s === "0123456") return "Every day"; if(s === "12345") return "Mon–Fri"; if(s === "06") return "Weekends";
  if(!d.length) return "No days";
  return DAY_ORDER.filter(x => d.includes(x)).map(x => DAY_SHORT[x]).join(", ");
}
const toMin = t => { const m = /^(\d{1,2})[:.](\d{2})$/.exec((t||"").trim()); return m ? (+m[1])*60 + (+m[2]) : 9999; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pick = a => a[Math.floor(Math.random()*a.length)];

function prune(){
  const cutoff = mondayOf(addDays(todayKey(), -371)); const weeks = {}; let changed = false;
  for(const k of Object.keys(S.log)){
    if(k < cutoff){ const x = dayXP(k); S.banked.xp += x; const m = mondayOf(k); weeks[m] = (weeks[m]||0) + x; delete S.log[k]; changed = true; }
  }
  for(const m in weeks) if(weeks[m] >= HP) S.banked.boss++;
  return changed;
}

/* ---------- icons ---------- */
const I = {
  flame:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.3.1 1.8.9 2.9 2.1 3.3-.7-3.1.2-6.3.8-9z" style="fill:var(--tang);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 2.8v6.1c0 4.6-3.2 8.3-7.5 10.1-4.3-1.8-7.5-5.5-7.5-10.1V5.3z" style="fill:var(--grape);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  shieldOff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 2.8v6.1c0 4.6-3.2 8.3-7.5 10.1-4.3-1.8-7.5-5.5-7.5-10.1V5.3z" style="fill:var(--paper);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-dasharray="3 2.5"/></svg>',
  coin:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2.2"/><circle cx="12" cy="12" r="5.2" style="fill:none;stroke:var(--ink)" stroke-width="2"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  miniCheck:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mini-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  miniX:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mini-check" d="M7 7l10 10M17 7L7 17"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5l3.4 3.4L8.6 18.8z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" style="stroke:var(--ink);fill:none" stroke-width="3" stroke-linecap="round"/></svg>',
  dice:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2L4.5 13.5h6.5L10 22l9-11.5h-6.5z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>'
};
function bossSVG(color, dead){
  const eyes = dead
    ? '<path d="M29 46l13 13M42 46L29 59M58 46l13 13M71 46L58 59" style="stroke:var(--ink);fill:none" stroke-width="5" stroke-linecap="round"/>'
    : '<circle cx="36" cy="53" r="9.5" style="fill:var(--paper);stroke:var(--ink)" stroke-width="4"/><circle cx="64" cy="53" r="9.5" style="fill:var(--paper);stroke:var(--ink)" stroke-width="4"/>'
      + '<circle cx="38" cy="55" r="4.2" style="fill:var(--ink)"/><circle cx="62" cy="55" r="4.2" style="fill:var(--ink)"/>'
      + '<path d="M24 37l19 8M76 37l-19 8" style="stroke:var(--ink);fill:none" stroke-width="5.5" stroke-linecap="round"/>';
  const mouth = dead
    ? '<path d="M37 79q6.5-6 13 0t13 0" style="stroke:var(--ink);fill:none" stroke-width="4.5" stroke-linecap="round"/>'
    : '<path d="M33 77l5.6-5 5.6 5 5.6-5 5.6 5 5.6-5 5.6 5" style="stroke:var(--ink);fill:none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M20 36L10 10l24 14zM80 36L90 10 66 24z" style="fill:${color};stroke:var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <rect x="9" y="22" width="82" height="70" rx="31" style="fill:${color};stroke:var(--ink)" stroke-width="4.5"/>
    ${eyes}${mouth}</svg>`;
}

/* ---------- ui state ---------- */
let viewDay = 0, editMode = false, boredOpen = false, boredIdx = -1, mqEditing = false;
let confirmBuy = null, confirmReset = false, editingId = null, confirmDel = false, confirmWish = null;
let sync = "local", lastToday = todayKey();
const $ = id => document.getElementById(id);
const viewKey = () => viewDay === 0 ? todayKey() : addDays(todayKey(), -1);

/* ---------- render ---------- */
function render(){
  if(!started) return;
  const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
  renderTop(); renderHero(); renderBored(); renderQuests(); renderBoss(); renderWish(); renderHistory(); renderTreats(); renderFoot();
  if(fk){ const el = document.querySelector(`[data-key="${CSS.escape(fk)}"]`); if(el) el.focus({preventScroll:true}); }
}
function renderTop(){
  const cn = coins(); $("coins").innerHTML = `${I.coin}<span>${cn}</span>`; $("coins").setAttribute("aria-label", cn + " coins");
  const t = todayKey(), left = needFor(t) - dayCount(t);
  $("hello").innerHTML = `<b>YO${displayName() ? " " + esc(displayName().toUpperCase()) : ""}.</b> ` + (left <= 0 ? "Day secured. Everything else is bonus." : `${left} more bar${left === 1 ? "" : "s"} to secure today.`);
}
function renderHero(){
  const xp = totalXP(), lv = levelInfo(xp), t = todayKey();
  const cnt = dayCount(t), need = needFor(t), ok = cnt >= need;
  const shieldFree = shieldDay(mondayOf(t)) === null, st = streak();
  const pct = Math.max(4, Math.min(100, Math.round(lv.into/lv.need*100)));
  let pips = ""; for(let i=0;i<need;i++) pips += `<i class="${i < cnt ? "on" : ""}"></i>`;
  const mq = mqEditing
    ? `<form id="mq-form"><input class="inp" id="mq-input" maxlength="90" value="${esc(S.mainQuest)}" aria-label="Main quest"><button class="btn mint" type="submit">Save</button></form>`
    : `<div class="mq-body"><span class="eyebrow">Main quest</span><span class="mq-text">${esc(S.mainQuest || "Set one big goal")}</span></div>
       <button class="iconbtn" data-act="mq-edit" data-key="mq-edit" aria-label="Edit main quest">${I.pencil}</button>`;
  $("hero").innerHTML = `
    <div class="lvl-row">
      <div class="lvl-badge" aria-label="Level ${lv.L}"><small>LVL</small><b>${lv.L}</b></div>
      <div class="lvl-meta">
        <span class="eyebrow">Rank</span>
        <div class="lvl-name">${lv.name}</div>
        <div class="meter xp" role="progressbar" aria-label="XP to next level" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i style="width:${pct}%"></i></div>
        <div class="num">${lv.into} / ${lv.need} XP to Lvl ${lv.L+1} · ${xp} total</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat">${I.flame}<b>${st}</b><span>day streak</span></div>
      <div class="stat">${shieldFree ? I.shield : I.shieldOff}<b>${shieldFree ? 1 : 0}</b><span>${shieldFree ? "shield left this week" : "shield used this week"}</span></div>
      <div class="stat ${ok ? "ok" : ""}"><div class="pips">${pips}</div><b>${Math.min(cnt,need)}/${need}</b><span>${ok ? "today secured" : "to secure today"}</span></div>
    </div>
    <div class="mq">${mq}</div>`;
}
function renderBored(){
  const n = entry(todayKey()).b || 0;
  const btn = `<button class="bored" data-act="bored" data-key="bored" aria-expanded="${boredOpen}">
      <div><b>I'm bored</b><span>${n ? `Get a 5-min quest · ${n} done today` : "Get a 5-min quest · +" + BORED_XP + " XP"}</span></div>
      <div class="orb">${I.dice}</div></button>`;
  const panel = boredOpen ? `
    <div class="card bq" style="margin-top:16px">
      <div class="bq-head"><span class="eyebrow">5-minute quest</span><button class="iconbtn" data-act="bored-close" data-key="bored-close" aria-label="Close quest">${I.x}</button></div>
      <p class="bq-text">${esc(BORED[boredIdx])}</p>
      <div class="bq-actions">
        <button class="btn mint" data-act="bored-done" data-key="bored-done">Did it · +${BORED_XP}</button>
        <button class="btn white" data-act="reroll" data-key="reroll">Another one</button>
      </div>
    </div>` : "";
  $("bored").innerHTML = btn + panel;
}
function barHTML(t, m){
  const c = CATS[t.cat] || CATS.mind;
  const cls = m === "f" ? "is-done" : m === "m" ? "is-mini" : "";
  const top = `<span class="tag">${c.label}</span>${t.time ? `<span>${esc(t.time)}</span>` : ""}${editMode ? `<span>${daysLabel(t.days)}</span>` : ""}<span class="stamp">${m === "m" ? "MINI" : "ATE"}</span>`;
  const lazy = (!editMode && t.mini) ? `<button class="lazy" data-act="mini" data-id="${esc(t.id)}" data-key="m-${esc(t.id)}" aria-pressed="${m === "m"}">Lazy: ${esc(t.mini)} · +${half(t.xp)}</button>` : "";
  const side = editMode
    ? `<button class="check edit" data-act="edit" data-id="${esc(t.id)}" data-key="e-${esc(t.id)}" aria-label="Edit ${esc(t.name)}">${I.pencil}</button><span class="xp">+${t.xp}</span>`
    : `<button class="check" data-act="full" data-id="${esc(t.id)}" data-key="f-${esc(t.id)}" aria-pressed="${m === "f"}" aria-label="Done: ${esc(t.name)}">${I.check}</button><span class="xp">+${t.xp}</span>`;
  return `<div class="bar-wrap" data-bar="${esc(t.id)}"><article class="bar ${cls}" style="--c:${c.c}">
    <div class="bar-body"><div class="bar-top">${top}</div><h3 class="bar-title">${esc(t.name)}</h3>${lazy}</div>
    <div class="bar-side">${side}</div></article></div>`;
}
function renderQuests(){
  const k = viewKey(), e = entry(k);
  const list = editMode ? S.tasks : sched(k);
  let body = "";
  for(const [slot, label] of SLOTS){
    const ts = list.filter(t => t.slot === slot).sort((a,b) => toMin(a.time) - toMin(b.time) || a.name.localeCompare(b.name));
    if(!ts.length) continue;
    body += `<div class="slot">${label}</div><div class="bars">${ts.map(t => barHTML(t, e.t[t.id] && e.t[t.id].m)).join("")}</div>`;
  }
  if(!body) body = `<div class="card empty" style="margin-top:16px">${editMode ? "No bars yet. Add your first one." : `Nothing on for ${viewDay ? "yesterday" : "today"}. Hit I'm bored, or add a bar.`}</div>`;
  if(editMode) body += `<button class="add" data-act="new" data-key="new">+ Add a bar</button>`;
  const done = Object.keys(e.t).filter(id => list.some(t => t.id === id)).length;
  const tabs = editMode ? "" : `<div class="seg" role="group" aria-label="Day">
      <button data-act="tab" data-v="0" data-key="tab0" aria-pressed="${viewDay === 0}">Today</button>
      <button data-act="tab" data-v="1" data-key="tab1" aria-pressed="${viewDay === 1}">Yesterday</button></div>`;
  $("quests").innerHTML = `
    <div class="sec-head"><h2>${editMode ? "Edit bars" : viewDay ? "Yesterday" : "Today's bars"}</h2>${tabs}
      <button class="btn ${editMode ? "mint" : "white"}" data-act="editmode" data-key="editmode">${editMode ? "Done" : I.pencil + "Edit"}</button></div>
    <p class="dayline">${editMode ? "Tap the pencil to change a bar. Progress stays." : `${fmtDay(k)} · ${done}/${list.length} done · ${dayXP(k)} XP`}</p>
    ${body}`;
}
function renderBoss(){
  const t = todayKey(), mon = mondayOf(t), wxp = weekXP(mon), b = bossFor(mon);
  const left = Math.max(0, HP - wxp), dead = left === 0;
  const daysLeft = 7 - ((dow(t)+6)%7);
  const sh = shieldDay(mon);
  let week = "";
  for(let i=0;i<7;i++){
    const k = addDays(mon,i); let cls, ic = "";
    if(k > t) cls = "future";
    else if(k === t){ cls = secured(k) ? "ok today" : "today"; if(secured(k)) ic = I.miniCheck; }
    else if(k < S.startDate) cls = "pre";
    else if(secured(k)){ cls = "ok"; ic = I.miniCheck; }
    else if(sh === k){ cls = "sh"; ic = I.shield; }
    else { cls = "miss"; ic = I.miniX; }
    week += `<div class="wd ${cls}"><span>${DAY_SHORT[DAY_ORDER[i]].slice(0,2).toUpperCase()}</span><i>${ic}</i></div>`;
  }
  $("boss").innerHTML = `
    <div class="row-between"><h2 class="h3">Weekly boss</h2>
      <span class="chip-s ${dead ? "win" : ""}">${dead ? `Beaten · +${BOSS_COINS} coins` : daysLeft === 1 ? "Last day" : `${daysLeft} days left`}</span></div>
    <div class="boss-main">
      <div class="boss-art" id="boss-art">${bossSVG(b.c, dead)}</div>
      <div class="boss-meta">
        <div class="boss-name">${b.n}</div>
        <div class="meter hp" role="progressbar" aria-label="Boss HP" aria-valuemin="0" aria-valuemax="${HP}" aria-valuenow="${left}"><i style="width:${Math.round(left/HP*100)}%;${dead ? "display:none" : ""}"></i></div>
        <div class="num">${dead ? "Down for the week." : `HP ${left} / ${HP} · every XP hits`}</div>
      </div>
    </div>
    <div class="week">${week}</div>`;
}
function fmtLeft(ms){
  const h = Math.ceil(ms/3600000);
  if(h >= 24){ const d = Math.floor(h/24), r = h % 24; return r ? `${d}d ${r}h` : `${d}d`; }
  if(h > 1) return `${h}h`;
  return `${Math.max(1, Math.ceil(ms/60000))} min`;
}
function renderWish(){
  const box = $("wish"); if(!box) return;
  const keepName = $("wi-name") ? $("wi-name").value : "", keepPrice = $("wi-price") ? $("wi-price").value : "";
  const hadFocus = document.activeElement && ["wi-name","wi-price"].includes(document.activeElement.id) ? document.activeElement.id : null;
  const have = coins(), now = Date.now(), bonusFree = !S.skipWeeks.includes(mondayOf(todayKey()));
  const items = S.wish.map(w => {
    const prog = Math.max(0, have), pct = Math.min(100, Math.round(prog / w.need * 100));
    const left = w.added + COOL_MS - now, cooled = left <= 0, earned = prog >= w.need, ready = cooled && w.ok && earned;
    const li = (ok, text) => `<li class="${ok ? "ok" : ""}"><i>${ok ? I.miniCheck : ""}</i>${text}</li>`;
    let action = "";
    if(cooled && !w.ok) action = `<div class="wish-actions"><span class="ask">Still want it?</span>
        <button class="btn mint" data-act="wish-yes" data-id="${esc(w.id)}" data-key="wy-${esc(w.id)}">Yes</button>
        <button class="btn white" data-act="wish-no" data-id="${esc(w.id)}" data-key="wn-${esc(w.id)}">Nah${bonusFree ? ` · +${SKIP_BONUS}` : ""}</button></div>`;
    else if(ready) action = `<div class="wish-actions"><button class="btn mint" data-act="wish-buy" data-id="${esc(w.id)}" data-key="wb-${esc(w.id)}">${confirmWish === w.id ? `Tap again: pay ${w.need} coins` : "Unlocked · Buy it"}</button></div>`;
    return `<div class="wish-item ${ready ? "ready" : ""}">
      <div class="wish-head"><span class="wish-name">${esc(w.name)}</span><span class="price">${w.price} €</span>
        <button class="iconbtn" data-act="wish-del" data-id="${esc(w.id)}" data-key="wd-${esc(w.id)}" aria-label="Remove ${esc(w.name)}">${I.x}</button></div>
      <div class="meter wish" role="progressbar" aria-label="Coins toward ${esc(w.name)}" aria-valuemin="0" aria-valuemax="${w.need}" aria-valuenow="${Math.min(prog, w.need)}"><i style="width:${Math.max(3, pct)}%"></i></div>
      <ul class="checks">
        ${li(earned, `${Math.min(prog, w.need)} / ${w.need} coins`)}
        ${li(cooled, cooled ? "72 h cooldown done" : `72 h cooldown · ${fmtLeft(left)} left`)}
        ${li(w.ok, w.ok ? "Still want it: yes" : cooled ? "Still want it? Decide below" : "Still want it? Asked after cooldown")}
      </ul>${action}</div>`;
  }).join("");
  box.innerHTML = `
    <div class="row-between"><h2 class="h3">Wishlist</h2><span class="chip-s">1 € = ${XP_PER_EUR} coins</span></div>
    ${items ? `<div class="wish-list">${items}</div>` : `<p class="wish-empty">Want something 50 € or more? Add it here. Pay with your coins after a 72 h wait.</p>`}
    <form class="tr-form" id="wi-form">
      <input class="inp" id="wi-name" maxlength="60" placeholder="What do you want?" aria-label="Wishlist item" autocomplete="off" value="${esc(keepName)}">
      <input class="inp cost-in" id="wi-price" inputmode="decimal" maxlength="7" placeholder="€" aria-label="Price in euros" autocomplete="off" value="${esc(keepPrice)}">
      <button class="btn" type="submit">Add</button>
    </form>
    <p class="last">Skip something after the wait and get +${SKIP_BONUS} coins (once a week).</p>`;
  if(hadFocus){ const el = $(hadFocus); if(el){ el.focus({preventScroll:true}); const v = el.value; el.setSelectionRange && el.setSelectionRange(v.length, v.length); } }
}
function renderHistory(){
  const t = todayKey(), start = addDays(mondayOf(t), -28);
  let cells = DAY_ORDER.map(d => `<span class="dl">${DAY_SHORT[d][0]}</span>`).join("");
  for(let i=0;i<35;i++){
    const k = addDays(start,i); let cls = "hc";
    if(k > t) cls += " fut";
    else if(k < S.startDate) cls += " pre";
    else {
      const s = sched(k), e = entry(k), all = s.length > 0 && s.every(x => e.t[x.id]);
      cls += all ? " l3" : secured(k) ? " l2" : dayCount(k) > 0 ? " l1" : "";
    }
    if(k === t) cls += " now";
    cells += `<span class="${cls}" title="${fmtDay(k)}: ${k > t ? "" : dayCount(k) + " done"}"></span>`;
  }
  $("history").innerHTML = `
    <div class="row-between"><h2 class="h3">Last 5 weeks</h2><span class="chip-s">${bossesBeaten()} bosses beaten</span></div>
    <div class="heat">${cells}</div>
    <div class="legend"><span><i style="background:var(--paper-2)"></i>Nothing</span><span><i style="background:var(--paper-2);background:color-mix(in srgb,var(--mint) 38%,var(--paper))"></i>Some</span><span><i style="background:var(--mint)"></i>Secured</span><span><i style="background:var(--sun)"></i>Every bar</span></div>`;
}
function renderTreats(){
  const c = coins();
  const rows = S.treats.map(tr => {
    const sure = confirmBuy === tr.id;
    const action = editMode
      ? `<button class="iconbtn" data-act="treat-del" data-id="${esc(tr.id)}" data-key="td-${esc(tr.id)}" aria-label="Remove ${esc(tr.name)}">${I.x}</button>`
      : `<button class="btn ${sure ? "mint" : ""}" data-act="buy" data-id="${esc(tr.id)}" data-key="b-${esc(tr.id)}" ${c < tr.cost ? "disabled" : ""}>${sure ? "Sure?" : "Get"}</button>`;
    return `<div class="treat"><span class="treat-name">${esc(tr.name)}</span><span class="cost">${I.coin}${tr.cost}</span>${action}</div>`;
  }).join("") || `<p class="last">No treats yet. Tap Edit above to add one.</p>`;
  const last = S.buys.length ? S.buys[S.buys.length-1] : null;
  const form = editMode ? `<form class="tr-form" id="tr-form">
      <input class="inp" id="tr-name" maxlength="60" placeholder="New treat" aria-label="Treat name" autocomplete="off">
      <input class="inp cost-in" id="tr-cost" inputmode="numeric" maxlength="5" placeholder="Coins" aria-label="Cost in coins" autocomplete="off">
      <button class="btn" type="submit">Add</button></form>` : "";
  $("treats").innerHTML = `
    <div class="row-between"><h2 class="h3">Treats</h2><span class="cost">${I.coin}${c}</span></div>
    <div class="treats">${rows}</div>${form}
    ${last ? `<p class="last">Last treat: ${esc(last.n)} · ${fmtDay(last.d)}</p>` : `<p class="last">Earn coins with bars. Spend them here, guilt-free.</p>`}`;
}
function renderFoot(){
  if(pendingImport){
    $("foot").innerHTML = `<span class="sync"><i></i>Replace your progress with “${esc(pendingImport.name)}”?</span>
      <div class="foot-btns">
        <button class="ghost warn" data-act="import-yes" data-key="import-yes">Replace</button>
        <button class="ghost" data-act="import-no" data-key="import-no">Cancel</button>
      </div>`;
    return;
  }
  const txt = {synced:"Saved to your account", syncing:"Saving…", local:"Local only, not synced", error:"Couldn't sync. Saved on this device."}[sync];
  const who = user && user.email ? ` · ${esc(user.email)}` : "";
  $("foot").innerHTML = `<span class="sync ${sync === "synced" ? "ok" : sync === "error" ? "err" : ""}"><i></i>${txt}${who}</span>
    <div class="foot-btns">
      <button class="ghost" data-act="export" data-key="export">Export</button>
      <button class="ghost" data-act="import" data-key="import">Import</button>
      <button class="ghost" data-act="sound" data-key="sound" aria-pressed="${soundOn}">Sound ${soundOn ? "on" : "off"}</button>
      <button class="ghost ${confirmReset ? "warn" : ""}" data-act="reset" data-key="reset">${confirmReset ? "Tap again: wipe progress" : "Reset progress"}</button>
      ${opts.signOut ? `<button class="ghost" data-act="signout" data-key="signout">Sign out</button>` : ""}
    </div>`;
}

/* ---------- feedback ---------- */
let toastTimer = 0;
function toast(msg){ const el = $("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 1900); }

let actx = null;
function sfx(type){
  if(!soundOn) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    const seq = {pop:[740,1110], undo:[420,300], secure:[660,880,1100], big:[523,659,784,1047,1319]}[type] || [740];
    seq.forEach((f,i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = t0 + i*0.075;
      o.type = "triangle"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t+0.012); g.gain.exponentialRampToValueAtTime(0.0001, t+0.17);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+0.19);
    });
  }catch{}
}

const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fx = $("fx"), cx = fx.getContext("2d"); let parts = [], raf = 0, palette = null;
function sizeFx(){ const r = window.devicePixelRatio || 1; fx.width = innerWidth*r; fx.height = innerHeight*r; cx.setTransform(r,0,0,r,0,0); }
function burst(x, y, n, power){
  if(reduced) return;
  if(!palette){ const cs = getComputedStyle(document.documentElement); palette = ["--sun","--tang","--bubble","--mint","--grape","--sky","--paper"].map(v => cs.getPropertyValue(v).trim()); }
  if(!raf) sizeFx();
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, sp = (2 + Math.random()*7) * (power||1);
    parts.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 5*(power||1), w:6+Math.random()*7, h:4+Math.random()*5, r:Math.random()*6, vr:(Math.random()-.5)*.35, c:palette[i % palette.length], life:60+Math.random()*40});
  }
  if(!raf) raf = requestAnimationFrame(tick);
}
function tick(){
  cx.clearRect(0,0,innerWidth,innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for(const p of parts){
    p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.strokeStyle = "#0E1240"; cx.lineWidth = 1.5;
    cx.fillRect(-p.w/2,-p.h/2,p.w,p.h); cx.strokeRect(-p.w/2,-p.h/2,p.w,p.h); cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0,0,innerWidth,innerHeight), 0);
}
function bigBurst(){ burst(innerWidth*0.25, innerHeight*0.35, 50, 1.3); burst(innerWidth*0.75, innerHeight*0.35, 50, 1.3); }

function metrics(k){ return {lvl:levelInfo(totalXP()).L, sec:secured(k), beat:weekXP(mondayOf(todayKey())) >= HP}; }
function celebrate(before, after, k, opts){
  if(!opts.added){ sfx("undo"); toast(pick(["Undone.","Took it back."])); return; }
  const el = opts.el;
  if(el){ el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  const art = $("boss-art"); if(art){ art.classList.remove("hit"); void art.offsetWidth; art.classList.add("hit"); }
  if(after.lvl > before.lvl){ sfx("big"); bigBurst(); toast(`Level up! Lvl ${after.lvl}: ${levelInfo(totalXP()).name}`); }
  else if(after.beat && !before.beat){ sfx("big"); bigBurst(); toast(`${bossFor(mondayOf(todayKey())).n} is down. +${BOSS_COINS} coins`); }
  else if(after.sec && !before.sec){ sfx("secure"); bigBurst(); toast(k === todayKey() ? `Day secured. Streak ${streak()}.` : "Yesterday secured."); }
  else {
    sfx("pop");
    const r = (el || document.body).getBoundingClientRect();
    burst(Math.min(innerWidth-40, r.right - 60), r.top + r.height/2, 24, 0.8);
    toast(opts.mini ? pick(MINI_HYPE) : `+${opts.xp} · ${pick(HYPE)}`);
  }
}

/* ---------- actions ---------- */
function commit(){ S.updatedAt = Date.now(); lsSet(LS_KEY, JSON.stringify(S)); if(store) store.push(); render(); }
function cleanDay(k){ const e = S.log[k]; if(e && !Object.keys(e.t).length && !(e.b > 0)) delete S.log[k]; }

function toggle(id, mode){
  const k = viewKey(), t = S.tasks.find(x => x.id === id); if(!t) return;
  const before = metrics(k);
  const e = S.log[k] || (S.log[k] = {t:{}, b:0});
  const cur = e.t[id] && e.t[id].m; let added = false, xp = 0;
  if(mode === "f"){ if(cur === "f") delete e.t[id]; else { xp = t.xp; e.t[id] = {m:"f", xp}; added = true; } }
  else { if(cur === "m") delete e.t[id]; else { xp = half(t.xp); e.t[id] = {m:"m", xp}; added = true; } }
  cleanDay(k); commit();
  celebrate(before, metrics(k), k, {added, mini:mode === "m", xp, el:document.querySelector(`[data-bar="${CSS.escape(id)}"]`)});
}
function rollBored(){ let i; do { i = Math.floor(Math.random()*BORED.length); } while(BORED.length > 1 && i === boredIdx); boredIdx = i; }
function doBored(){
  const k = todayKey(), before = metrics(k);
  const e = S.log[k] || (S.log[k] = {t:{}, b:0}); e.b = (e.b||0) + 1;
  boredOpen = false; commit();
  const after = metrics(k);
  if(after.lvl > before.lvl || (after.sec && !before.sec) || (after.beat && !before.beat)) celebrate(before, after, k, {added:true, xp:BORED_XP});
  else { sfx("pop"); const r = $("bored").getBoundingClientRect(); burst(r.left + r.width/2, r.top + 40, 34, 1); toast(`+${BORED_XP} · Boredom: defeated.`); }
}
function buy(id){
  const tr = S.treats.find(x => x.id === id); if(!tr) return;
  if(confirmBuy !== id){ confirmBuy = id; render(); return; }
  confirmBuy = null;
  if(coins() < tr.cost){ render(); return; }
  S.spent += tr.cost; S.buys.push({n:tr.name, c:tr.cost, d:todayKey()}); S.buys = S.buys.slice(-20);
  commit(); sfx("secure"); bigBurst(); toast("Enjoy it. You earned it.");
}

/* editor */
const ed = $("editor");
function buildEditor(){
  $("ed-cat").innerHTML = Object.entries(CATS).map(([k,v]) => `<label class="chip"><input type="radio" name="ed-cat" value="${k}" id="ed-cat-${k}"><span><i style="background:${v.c}"></i>${v.label}</span></label>`).join("");
  $("ed-slot").innerHTML = SLOTS.map(([k,v]) => `<label class="chip"><input type="radio" name="ed-slot" value="${k}" id="ed-slot-${k}"><span>${v}</span></label>`).join("");
  $("ed-days").innerHTML = DAY_ORDER.map(d => `<label class="chip"><input type="checkbox" name="ed-days" value="${d}" id="ed-day-${d}"><span>${DAY_SHORT[d]}</span></label>`).join("");
  $("ed-xp").innerHTML = XP_CHOICES.map(x => `<label class="chip"><input type="radio" name="ed-xp" value="${x}" id="ed-xp-${x}"><span>+${x}</span></label>`).join("");
  ed.querySelector('[data-act="ed-close"]').innerHTML = I.x;
}
function openEditor(id){
  const t = id ? S.tasks.find(x => x.id === id) : {name:"", mini:"", cat:"body", slot:"after", time:"", days:ALL.slice(), xp:20};
  if(!t) return;
  editingId = id; confirmDel = false;
  $("ed-title").textContent = id ? "Edit bar" : "New bar";
  $("ed-name").value = t.name; $("ed-mini").value = t.mini; $("ed-time").value = t.time;
  ed.querySelectorAll('[name="ed-cat"]').forEach(i => i.checked = i.value === t.cat);
  ed.querySelectorAll('[name="ed-slot"]').forEach(i => i.checked = i.value === t.slot);
  ed.querySelectorAll('[name="ed-days"]').forEach(i => i.checked = t.days.includes(Number(i.value)));
  const xpPick = XP_CHOICES.includes(t.xp) ? t.xp : XP_CHOICES.reduce((a,b) => Math.abs(b-t.xp) < Math.abs(a-t.xp) ? b : a);
  ed.querySelectorAll('[name="ed-xp"]').forEach(i => i.checked = Number(i.value) === xpPick);
  $("ed-del").hidden = !id; $("ed-del").textContent = "Delete"; $("ed-err").hidden = true;
  if(typeof ed.showModal === "function"){ try { ed.showModal(); } catch { ed.setAttribute("open",""); } } else ed.setAttribute("open","");
  setTimeout(() => $("ed-name").focus(), 30);
}
function closeEditor(){ if(typeof ed.close === "function") ed.close(); else ed.removeAttribute("open"); }
function saveEditor(){
  const name = $("ed-name").value.trim();
  if(!name){ $("ed-err").hidden = false; $("ed-name").focus(); return; }
  const val = n => { const i = ed.querySelector(`[name="${n}"]:checked`); return i ? i.value : null; };
  const data = {
    name, mini:$("ed-mini").value.trim(), time:$("ed-time").value.trim(),
    cat: val("ed-cat") || "body", slot: val("ed-slot") || "any", xp: Number(val("ed-xp")) || 20,
    days: [...ed.querySelectorAll('[name="ed-days"]:checked')].map(i => Number(i.value))
  };
  if(editingId){ const t = S.tasks.find(x => x.id === editingId); if(t) Object.assign(t, data); }
  else S.tasks.push({id:"t" + Date.now().toString(36), ...data});
  closeEditor(); commit(); toast(editingId ? "Bar updated." : "New bar added.");
}

/* events */
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-act]"); if(!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if(act !== "buy" && confirmBuy){ confirmBuy = null; }
  if(act !== "reset" && confirmReset){ confirmReset = false; }
  if(act !== "wish-buy") confirmWish = null;
  switch(act){
    case "full": toggle(id, "f"); break;
    case "mini": toggle(id, "m"); break;
    case "tab": viewDay = Number(b.dataset.v) || 0; render(); break;
    case "editmode": editMode = !editMode; render(); break;
    case "edit": openEditor(id); break;
    case "new": openEditor(null); break;
    case "ed-close": closeEditor(); break;
    case "ed-del":
      if(!confirmDel){ confirmDel = true; b.textContent = "Tap again to delete"; return; }
      S.tasks = S.tasks.filter(t => t.id !== editingId); closeEditor(); commit(); toast("Bar deleted."); break;
    case "bored": boredOpen = !boredOpen; if(boredOpen) rollBored(); render(); break;
    case "reroll": rollBored(); render(); break;
    case "bored-done": doBored(); break;
    case "bored-close": boredOpen = false; render(); break;
    case "buy": buy(id); break;
    case "treat-del": S.treats = S.treats.filter(t => t.id !== id); commit(); break;
    case "wish-yes": { const w = S.wish.find(x => x.id === id); if(w){ w.ok = true; commit(); toast("Locked in. Keep doing bars."); } } break;
    case "wish-no": {
      const w = S.wish.find(x => x.id === id); if(!w) break;
      S.wish = S.wish.filter(x => x.id !== id);
      const mon = mondayOf(todayKey());
      if(!S.skipWeeks.includes(mon)){ S.bonus += SKIP_BONUS; S.skipWeeks = S.skipWeeks.concat(mon).slice(-12); commit(); sfx("secure"); toast(`Skipped it. +${SKIP_BONUS} coins for not buying.`); }
      else { commit(); toast("Skipped it. Money stays put."); }
    } break;
    case "wish-buy": {
      const w = S.wish.find(x => x.id === id); if(!w) break;
      if(confirmWish !== id){ confirmWish = id; render(); return; }
      confirmWish = null;
      if(coins() < w.need){ render(); toast("Not enough coins yet."); return; }
      S.wish = S.wish.filter(x => x.id !== id); S.spent += w.need;
      S.buys.push({n:`${w.name} (${w.price} €)`, c:w.need, d:todayKey()}); S.buys = S.buys.slice(-20);
      commit(); sfx("big"); bigBurst(); toast("Earned it. Go get it.");
    } break;
    case "wish-del": S.wish = S.wish.filter(x => x.id !== id); commit(); break;
    case "export": exportSave(); break;
    case "import": $("import-file").value = ""; $("import-file").click(); break;
    case "import-yes": if(pendingImport){ S = pendingImport.data; pendingImport = null; prune(); commit(); toast("Progress imported."); } break;
    case "import-no": pendingImport = null; renderFoot(); break;
    case "signout": if(opts.signOut) opts.signOut(); break;
    case "mq-edit": mqEditing = true; render(); { const i = $("mq-input"); if(i){ i.focus(); i.select(); } } break;
    case "sound": soundOn = !soundOn; lsSet(LS_SOUND, soundOn ? "on" : "off"); render(); if(soundOn) sfx("pop"); break;
    case "reset":
      if(!confirmReset){ confirmReset = true; render(); return; }
      confirmReset = false; S.log = {}; S.banked = {xp:0, boss:0}; S.spent = 0; S.buys = []; S.startDate = todayKey(); S.bonus = 0; S.skipWeeks = []; S.wish.forEach(w => { w.addedXP = 0; });
      commit(); toast("Fresh start. Level 1."); break;
  }
});
ed.addEventListener("click", ev => { if(ev.target === ed) closeEditor(); });
document.addEventListener("submit", ev => {
  ev.preventDefault();
  const f = ev.target;
  if(f.id === "ed-form") saveEditor();
  else if(f.id === "mq-form"){ S.mainQuest = $("mq-input").value.trim().slice(0,90); mqEditing = false; commit(); }
  else if(f.id === "wi-form"){
    const n = $("wi-name").value.trim(), pr = Math.round(parseFloat(String($("wi-price").value).replace(",", ".")));
    if(!n || !(pr > 0)){ toast("Name + price in €, please."); return; }
    const price = Math.min(100000, pr);
    S.wish.push({id:"w" + Date.now().toString(36), name:n.slice(0,60), price, need:price*XP_PER_EUR, added:Date.now(), addedXP:totalXP(), ok:false});
    $("wi-name").value = ""; $("wi-price").value = "";
    commit(); toast(`Added. ${price*XP_PER_EUR} coins + 72 h wait.`);
  }
  else if(f.id === "tr-form"){
    const n = $("tr-name").value.trim(), c = parseInt($("tr-cost").value, 10);
    if(!n || !(c > 0)){ toast("Name + coin cost, please."); return; }
    S.treats.push({id:"r" + Date.now().toString(36), name:n.slice(0,60), cost:Math.min(99999, c)}); commit(); toast("Treat added.");
  }
});
function checkDay(){ const t = todayKey(); if(t !== lastToday){ lastToday = t; boredOpen = false; render(); } }
function refreshWish(){ if(started && S.wish.length && !document.hidden) renderWish(); }
setInterval(checkDay, 30000);
setInterval(refreshWish, 60000);
document.addEventListener("visibilitychange", () => { if(!document.hidden) checkDay(); });
addEventListener("resize", () => { if(raf) sizeFx(); });

/* ---------- export / import ---------- */
function exportSave(){
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `raise-the-bar-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("import-file").addEventListener("change", async ev => {
  const file = ev.target.files && ev.target.files[0]; if(!file) return;
  try {
    const r = normalize(JSON.parse(await file.text()));
    if(!r) throw new Error("bad file");
    pendingImport = {name:file.name, data:r}; renderFoot();
  } catch { toast("That file isn't a Raise the Bar save."); }
});

/* ---------- account + sync ---------- */
let started = false, user = null, store = null, opts = {}, pendingImport = null;
const firstName = n => (n || "").trim().split(/\s+/)[0] || "";
function setSync(s){ if(sync !== s){ sync = s; if(started) renderFoot(); } }
function displayName(){
  const meta = (user && user.user_metadata) || {};
  return S.nick || firstName(meta.name || meta.full_name || "") || "";
}
function adopt(r){ S = r; prune(); lsSet(LS_KEY, JSON.stringify(S)); render(); }
async function pullRemote(){
  if(!store) return;
  try { const d = await store.pull(); const r = d ? normalize(d) : null; if(r && r.updatedAt > S.updatedAt){ adopt(r); setSync("synced"); } } catch {}
}
document.addEventListener("visibilitychange", () => { if(!document.hidden) pullRemote(); });

export async function startApp(u, options = {}){
  user = u; opts = options; started = true; pendingImport = null;
  LS_KEY = "rtb-save:" + u.id;
  let local = null; try { local = normalize(JSON.parse(lsGet(LS_KEY))); } catch {}
  S = local || defaultState();
  if(!S.nick){ const meta = u.user_metadata || {}; const n = firstName(meta.name || meta.full_name || ""); if(n) S.nick = n; }
  if(prune()){ S.updatedAt = Date.now(); lsSet(LS_KEY, JSON.stringify(S)); }
  $("app").hidden = false;
  sync = options.createSync ? "syncing" : "local";
  render();
  if(!options.createSync) return;
  store = options.createSync({
    userId: u.id,
    getState: () => S,
    onStatus: setSync,
    onRemote: d => { const r = normalize(d); if(r && r.updatedAt > S.updatedAt) adopt(r); }
  });
  try {
    const d = await store.pull();
    const r = d ? normalize(d) : null;
    if(r && r.updatedAt > S.updatedAt) adopt(r);
    if(r && r.updatedAt >= S.updatedAt) setSync("synced");
    else { if(!S.updatedAt) S.updatedAt = Date.now(); lsSet(LS_KEY, JSON.stringify(S)); store.push(); }
  } catch { setSync("error"); }
  store.listen();
}
export function stopApp(){
  if(store) store.stop();
  store = null; started = false; user = null; boredOpen = false; editMode = false;
  $("app").hidden = true;
}

/* ---------- boot ---------- */
$("band").innerHTML = `<span>${MARQUEE.repeat(4)}</span><span>${MARQUEE.repeat(4)}</span>`;
buildEditor();
