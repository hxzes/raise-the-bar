/* Raise the Bar: game state, rules and UI. main.js calls startApp() once a user is signed in. */
import { CATS, AREAS, TPL, BORED, BORED_XP, LEVELS, BOSSES, HYPE, MINI_HYPE } from "./content.js";
import { generatePlan, swapTask, retier, tierInfo, pickDays } from "./plan.js";
import { openOnboarding, closeOnboarding } from "./onboarding.js";
import { initFx, banner, levelUp, bossDefeat, bossHit, countUp } from "./fx.js";
import {
  ALL, WEEKDAYS, DAY_ORDER, DAY_SHORT, todayKey, addDays, dow, mondayOf, dayIndex, fmtDay,
  esc, pick, rid, clamp, firstName, daysLabel, plural
} from "./util.js";

/* ---------- rules ---------- */
const SLOTS = [["morning", "Morning"], ["after", "Afternoon"], ["evening", "Evening"], ["any", "Anytime"]];
const XP_CHOICES = [10, 15, 20, 25, 30, 40, 50];
const LEGACY_HP = 700, BOSS_COINS = 100, BOSS_XP = 50, HEAL_SHARE = 0.08;
const FIRST_WIN_COINS = 50, SHOP_AT = 150;
const XP_PER_EUR = 10, COOL_MS = 72 * 3600 * 1000, SKIP_BONUS = 100;
const LEGACY_UNITS = {
  room: "room reset|room resets", walk: "walk|walks", reach: "outreach day|outreach days", gym: "workout|workouts",
  cards: "listing day|listing days", food: "no-delivery day|no-delivery days", spend: "on-budget day|on-budget days",
  review: "weekly review|weekly reviews", phone: "phone-free night|phone-free nights", focus: "focus session|focus sessions",
  water: "hydrated day|hydrated days", face: "face routine|face routines"
};

function defaultTasks() { return [
  { id: "room",   name: "Desk + room reset",          mini: "Just make the bed",         cat: "home",  slot: "morning", time: "",      days: ALL.slice(),      xp: 20, min: 10 },
  { id: "walk",   name: "20-min walk",                mini: "10 min outside",            cat: "body",  slot: "after",   time: "",      days: ALL.slice(),      xp: 25, min: 20 },
  { id: "gym",    name: "12-min home workout",        mini: "10 push-ups + 15 squats",   cat: "body",  slot: "after",   time: "",      days: [1, 3, 5],        xp: 30, min: 12 },
  { id: "focus",  name: "45 min on your main goal",   mini: "15 min on it",              cat: "biz",   slot: "after",   time: "",      days: WEEKDAYS.slice(), xp: 35, min: 45 },
  { id: "water",  name: "Drink 2 litres of water",    mini: "Drink 1 litre",             cat: "food",  slot: "any",     time: "",      days: ALL.slice(),      xp: 15, min: 1 },
  { id: "food",   name: "No impulse food orders",     mini: "",                          cat: "food",  slot: "evening", time: "",      days: ALL.slice(),      xp: 20, min: 1 },
  { id: "review", name: "Sunday review",              mini: "Write 1 thing that worked", cat: "mind",  slot: "evening", time: "",      days: [0],              xp: 40, min: 15 },
  { id: "phone",  name: "Phone off the bed by 22:30", mini: "Lights off by 23:30",       cat: "sleep", slot: "evening", time: "22:30", days: ALL.slice(),      xp: 20, min: 1 }
]; }
function defaultTreats() { return [
  { id: "movie", name: "Movie night", cost: 100 }, { id: "sleep", name: "Sleep in on Saturday", cost: 120 },
  { id: "game", name: "Gaming night, zero guilt", cost: 150 }, { id: "deliv", name: "One planned takeaway", cost: 300 }
]; }

/* ---------- state ---------- */
let LS_KEY = "rtb-save:local";
const LS_SOUND = "rtb-sound";
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const clone = o => JSON.parse(JSON.stringify(o));

function defaultState() {
  return { v: 2, updatedAt: 0, startDate: todayKey(), mainQuest: "", nick: "", onboard: null,
    tasks: defaultTasks(), treats: defaultTreats(), log: {}, banked: { xp: 0, boss: 0 }, spent: 0, buys: [], wish: [],
    bonus: 0, xpBonus: 0, skipWeeks: [], bossHP: {}, bossWins: {}, checkins: {}, flags: {}, ban: [] };
}
const obj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
function normalize(r) {
  if (!r || typeof r !== "object") return null;
  const d = defaultState();
  const okSlot = s => SLOTS.some(x => x[0] === s);
  const out = {
    v: 2,
    updatedAt: Number(r.updatedAt) || 0,
    startDate: /^\d{4}-\d\d-\d\d$/.test(r.startDate) ? r.startDate : d.startDate,
    mainQuest: typeof r.mainQuest === "string" ? r.mainQuest.slice(0, 90) : "",
    nick: typeof r.nick === "string" ? r.nick.slice(0, 24) : "",
    onboard: r.onboard && r.onboard.v === 2 ? r.onboard : null,
    tasks: Array.isArray(r.tasks) ? r.tasks.filter(t => t && t.id && t.name).map(t => ({
      id: String(t.id), name: (t.tpl === "screentime" ? String(t.name).replace(/^Screen time/, "Phone screen time") : String(t.name)).slice(0, 60), mini: String(t.mini || "").slice(0, 60),
      cat: CATS[t.cat] ? t.cat : "mind", slot: okSlot(t.slot) ? t.slot : "any", time: String(t.time || "").slice(0, 10),
      days: Array.isArray(t.days) ? t.days.map(Number).filter(n => n >= 0 && n <= 6) : ALL.slice(),
      xp: clamp(Number(t.xp) || 20, 5, 100), min: Number(t.min) || 0,
      tpl: t.tpl && TPL[t.tpl] ? t.tpl : null, tier: clamp(Number(t.tier) || 0, 0, 2), target: clamp(Number(t.target ?? 1), 0, 2),
      unit: typeof t.unit === "string" ? t.unit : (LEGACY_UNITS[t.id] || ""), since: /^\d{4}-\d\d-\d\d$/.test(t.since) ? t.since : null
    })) : d.tasks,
    treats: Array.isArray(r.treats) ? r.treats.filter(t => t && t.id && t.name).map(t => ({ id: String(t.id), name: String(t.name).slice(0, 60), cost: Math.max(1, Number(t.cost) || 100) })) : d.treats,
    log: obj(r.log),
    banked: { xp: Number(r.banked && r.banked.xp) || 0, boss: Number(r.banked && r.banked.boss) || 0 },
    spent: Number(r.spent) || 0,
    buys: Array.isArray(r.buys) ? r.buys.slice(-20) : [],
    wish: Array.isArray(r.wish) ? r.wish.filter(w => w && w.id && w.name).map(w => ({
      id: String(w.id), name: String(w.name).slice(0, 60), price: Math.max(1, Number(w.price) || 1), need: Math.max(10, Number(w.need) || 10),
      added: Number(w.added) || Date.now(), ok: !!w.ok
    })) : [],
    bonus: Number(r.bonus) || 0,
    xpBonus: Number(r.xpBonus) || 0,
    skipWeeks: Array.isArray(r.skipWeeks) ? r.skipWeeks.filter(x => typeof x === "string").slice(-12) : [],
    bossHP: obj(r.bossHP),
    bossWins: obj(r.bossWins),
    checkins: obj(r.checkins),
    flags: obj(r.flags),
    ban: Array.isArray(r.ban) ? r.ban.filter(x => TPL[x]).slice(-40) : []
  };
  if (!r.bossWins) {   // saves from before boss v2: past weeks counted at the old fixed HP
    const w = {};
    for (const k in out.log) { const m = mondayOf(k); w[m] = (w[m] || 0) + xpOfEntry(out.log[k]); }
    for (const m in w) if (w[m] >= LEGACY_HP) out.bossWins[m] = { n: bossFor(m).n };
  }
  if (Object.keys(out.log).length) out.flags.firstWin = true;
  return out;
}
let S = defaultState();
let soundOn = lsGet(LS_SOUND) !== "off";
let motionOn = lsGet("rtb-motion") !== "off";
document.documentElement.classList.toggle("motion-off", !motionOn);
/* Meters animate from their last width to the new one. */
const lastPct = {};
function mi(key, pct) {
  const from = lastPct[key];
  lastPct[key] = pct;
  return `<i class="${from != null && from !== pct && motionOn ? "grow" : ""}" style="width:${pct}%;--from:${from ?? pct}%"></i>`;
}
let lastCoins = null, lastNextId = null;

/* ---------- derived ---------- */
const entry = k => S.log[k] || { t: {}, b: 0 };
const half = xp => Math.ceil(xp / 2);
function xpOfEntry(e) {
  if (!e) return 0;
  let x = e.bx != null ? Number(e.bx) || 0 : (e.b || 0) * 15;
  for (const id in (e.t || {})) x += Number(e.t[id].xp) || 0;
  return x;
}
const dayXP = k => xpOfEntry(S.log[k]);
const sched = k => S.tasks.filter(t => t.days.includes(dow(k)));
const dayCount = k => { const e = entry(k); return Object.keys(e.t).length + (e.b || 0); };
const needFor = k => Math.min(3, Math.max(1, sched(k).length));
const secured = k => dayCount(k) >= needFor(k);
const weekXP = mon => { let x = 0; for (let i = 0; i < 7; i++) x += dayXP(addDays(mon, i)); return x; };
const dayNo = () => dayIndex(todayKey()) - dayIndex(S.startDate) + 1;
function shieldDay(mon) {
  const today = todayKey(); let found = null;
  for (let i = 0; i < 7; i++) { const k = addDays(mon, i); if (k >= today || k < S.startDate) continue; if (!secured(k)) found = k; }
  return found;
}
function streak() {
  const today = todayKey(); let s = secured(today) ? 1 : 0, k = addDays(today, -1);
  while (k >= S.startDate) { if (secured(k)) s++; else if (shieldDay(mondayOf(k)) !== k) break; k = addDays(k, -1); }
  return s;
}
function logXP() { let x = S.banked.xp; for (const k in S.log) x += dayXP(k); return x; }
const totalXP = () => logXP() + S.xpBonus;
const bossesBeaten = () => Object.keys(S.bossWins).length + S.banked.boss;
const coins = () => logXP() + S.bonus + BOSS_COINS * bossesBeaten() - S.spent;
function levelInfo(xp) {
  let L = 1, base = 0, need = 150;
  while (xp >= base + need) { base += need; L++; need = 150 + 75 * (L - 1); }
  return { L, into: xp - base, need, name: LEVELS[Math.min(L, LEVELS.length) - 1] };
}
function bossFor(mon) { return BOSSES[((Math.floor(dayIndex(mon) / 7) % BOSSES.length) + BOSSES.length) % BOSSES.length]; }
function potentialXP(mon) { let p = 0; for (let i = 0; i < 7; i++) for (const t of sched(addDays(mon, i))) p += t.xp; return p; }
function hpFor(mon) {
  if (S.bossHP[mon]) return S.bossHP[mon];
  if (mon < mondayOf(todayKey())) return LEGACY_HP;
  const p = potentialXP(mon);
  return p ? clamp(Math.round(p * 0.6 / 10) * 10, 150, 2500) : 300;
}
function bossState(mon) {
  const hp = hpFor(mon), today = todayKey(), sh = shieldDay(mon);
  let missed = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(mon, i);
    if (k >= today || k < S.startDate || secured(k) || k === sh) continue;
    missed.push(k);
  }
  const heal = missed.length * Math.round(hp * HEAL_SHARE);
  const dmg = weekXP(mon), won = !!S.bossWins[mon];
  return { hp, heal, dmg, missed, won, left: won ? 0 : Math.max(0, hp + heal - dmg), boss: bossFor(mon) };
}
const hasSecuredDay = () => Object.keys(S.log).some(k => secured(k));
const bossUnlocked = () => !!S.flags.bossIntro || hasSecuredDay() || dayNo() >= 3;
const shopUnlocked = () => !!S.flags.shopIntro || coins() >= SHOP_AT || dayNo() >= 3 || S.spent > 0;
function earnRate() {
  const t = todayKey(); let sum = 0, n = 0;
  for (let i = 1; i <= 7; i++) { const k = addDays(t, -i); if (k < S.startDate) break; sum += dayXP(k); n++; }
  if (n >= 2) return Math.max(10, Math.round(sum / n));
  return Math.max(10, Math.round(potentialXP(mondayOf(t)) / 7 * 0.6));
}
const toMin = t => { const m = /^(\d{1,2})[:.](\d{2})$/.exec((t || "").trim()); return m ? (+m[1]) * 60 + (+m[2]) : 9999; };
function unitOf(t) { return t.unit || (t.tpl && TPL[t.tpl] ? TPL[t.tpl].unit : "") || LEGACY_UNITS[t.id] || ""; }
function prune() {
  const cutoff = mondayOf(addDays(todayKey(), -371)); let changed = false;
  for (const k of Object.keys(S.log)) if (k < cutoff) { S.banked.xp += dayXP(k); delete S.log[k]; changed = true; }
  for (const m of Object.keys(S.bossWins)) if (m < cutoff) { S.banked.boss++; delete S.bossWins[m]; changed = true; }
  for (const m of Object.keys(S.bossHP)) if (m < cutoff) { delete S.bossHP[m]; changed = true; }
  return changed;
}
/* Fix this week's boss HP the first time the week is seen. */
function ensureWeek() {
  const mon = mondayOf(todayKey());
  if (S.bossHP[mon]) return false;
  S.bossHP[mon] = hpFor(mon);
  return true;
}

/* ---------- icons ---------- */
const I = {
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.3.1 1.8.9 2.9 2.1 3.3-.7-3.1.2-6.3.8-9z" style="fill:var(--tang);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 2.8v6.1c0 4.6-3.2 8.3-7.5 10.1-4.3-1.8-7.5-5.5-7.5-10.1V5.3z" style="fill:var(--grape);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  shieldOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 2.8v6.1c0 4.6-3.2 8.3-7.5 10.1-4.3-1.8-7.5-5.5-7.5-10.1V5.3z" style="fill:var(--paper);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-dasharray="3 2.5"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2.2"/><circle cx="12" cy="12" r="5.2" style="fill:none;stroke:var(--ink)" stroke-width="2"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  miniCheck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mini-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  miniX: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mini-check" d="M7 7l10 10M17 7L7 17"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5l3.4 3.4L8.6 18.8z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" style="stroke:var(--ink);fill:none" stroke-width="3" stroke-linecap="round"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2L4.5 13.5h6.5L10 22l9-11.5h-6.5z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M12 12v4M8 21h8l-1-5H9z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" style="fill:var(--paper-2);stroke:var(--ink)" stroke-width="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" style="fill:none;stroke:var(--ink)" stroke-width="2.2"/></svg>'
};
function bossSVG(color, dead, hidden) {
  const eyes = dead
    ? '<path d="M29 46l13 13M42 46L29 59M58 46l13 13M71 46L58 59" style="stroke:var(--ink);fill:none" stroke-width="5" stroke-linecap="round"/>'
    : hidden
      ? '<path d="M44 44q6-10 12 0t-6 12v6M50 70v2" style="stroke:var(--ink);fill:none" stroke-width="5" stroke-linecap="round"/>'
      : '<circle cx="36" cy="53" r="9.5" style="fill:var(--paper);stroke:var(--ink)" stroke-width="4"/><circle cx="64" cy="53" r="9.5" style="fill:var(--paper);stroke:var(--ink)" stroke-width="4"/>'
        + '<circle cx="38" cy="55" r="4.2" style="fill:var(--ink)"/><circle cx="62" cy="55" r="4.2" style="fill:var(--ink)"/>'
        + '<path d="M24 37l19 8M76 37l-19 8" style="stroke:var(--ink);fill:none" stroke-width="5.5" stroke-linecap="round"/>';
  const mouth = hidden ? "" : dead
    ? '<path d="M37 79q6.5-6 13 0t13 0" style="stroke:var(--ink);fill:none" stroke-width="4.5" stroke-linecap="round"/>'
    : '<path d="M33 77l5.6-5 5.6 5 5.6-5 5.6 5 5.6-5 5.6 5" style="stroke:var(--ink);fill:none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M20 36L10 10l24 14zM80 36L90 10 66 24z" style="fill:${color};stroke:var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <rect x="9" y="22" width="82" height="70" rx="31" style="fill:${color};stroke:var(--ink)" stroke-width="4.5"/>${eyes}${mouth}</svg>`;
}

/* ---------- ui state ---------- */
let viewDay = 0, editMode = false, boredOpen = false, boredIdx = -1, boredMin = 5, boredLow = false, mqEditing = false;
let confirmBuy = null, confirmReset = false, editingId = null, confirmDel = false, confirmWish = null, confirmUndo = false, confirmSwap = null;
let shopTab = "treats", nextSkip = new Set(), ciOff = new Set();
let sync = "local", lastToday = todayKey();
const $ = id => document.getElementById(id);
const viewKey = () => viewDay === 0 ? todayKey() : addDays(todayKey(), -1);

/* ---------- render ---------- */
function render() {
  if (!started || !$("onboard").hidden) return;
  const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
  renderTop(); renderNotice(); renderHero(); renderNext(); renderBored(); renderQuests();
  renderBoss(); renderTrophies(); renderShop(); renderStats(); renderMiles(); renderHistory(); renderSettings(); renderIsland();
  if (fk) { const el = document.querySelector(`[data-key="${CSS.escape(fk)}"]`); if (el) el.focus({ preventScroll: true }); }
}
function displayName() {
  const meta = (user && user.user_metadata) || {};
  return S.nick || firstName(meta.name || meta.full_name || "");
}
function renderTop() {
  const cn = coins();
  $("coins").innerHTML = `${I.coin}<span>${lastCoins ?? cn}</span>`; $("coins").setAttribute("aria-label", cn + " coins");
  if (lastCoins != null && lastCoins !== cn) {
    countUp($("coins").querySelector("span"), lastCoins, cn);
    const pill = $("coins"); pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump");
  }
  lastCoins = cn;
  const t = todayKey(), left = needFor(t) - dayCount(t), name = displayName();
  $("hello").innerHTML = `<b>YO${name ? " " + esc(name.toUpperCase()) : ""}.</b> `
    + (left <= 0 ? "Day secured. Everything else is bonus." : `${left} more bar${left === 1 ? "" : "s"} to secure today.`);
}

/* Weekly check-in (adaptive difficulty) or the setup nudge. */
function checkinData() {
  const t = todayKey(), mon = mondayOf(t);
  if (S.checkins[mon] || dayIndex(t) - dayIndex(S.startDate) < 7) return null;
  let doneAll = 0, schedAll = 0;
  const items = [];
  for (const task of S.tasks) {
    const since = task.since && task.since > S.startDate ? task.since : S.startDate;
    let n = 0, d = 0;
    for (let i = 1; i <= 7; i++) {
      const k = addDays(t, -i);
      if (k < since || !task.days.includes(dow(k))) continue;
      n++; const m = entry(k).t[task.id] && entry(k).t[task.id].m;
      d += m === "f" ? 1 : m === "m" ? 0.5 : 0;
    }
    schedAll += n; doneAll += d;
    if (n < 2) continue;
    const rate = d / n, tpl = task.tpl && TPL[task.tpl], why = `${+d.toFixed(1)}/${n} last week`;
    if (rate >= 0.8 && tpl && task.tier < 2) items.push({ kind: "up", id: task.id, from: task.name, to: tierInfo(tpl, task.tier + 1).name, why, r: rate });
    else if (rate <= 0.35) {
      if (tpl && task.tier > 0) items.push({ kind: "down", id: task.id, from: task.name, to: tierInfo(tpl, task.tier - 1).name, why, r: 1 - rate });
      else if (task.days.length >= 5) items.push({ kind: "fewer", id: task.id, from: task.name, to: "3× a week instead of " + daysLabel(task.days).toLowerCase(), why, r: 1 - rate });
      else if (tpl) items.push({ kind: "swap", id: task.id, from: task.name, to: "a different quest", why, r: 1 - rate });
    }
  }
  if (!schedAll) return null;
  items.sort((a, b) => b.r - a.r);
  return { mon, week: Math.floor((dayIndex(t) - dayIndex(S.startDate)) / 7) + 1, items: items.slice(0, 4), done: +doneAll.toFixed(1), sched: schedAll };
}
function renderNotice() {
  const box = $("notice");
  const ci = checkinData();
  if (ci) {
    const tag = { up: "Level up", down: "Make it easier", fewer: "Fewer days", swap: "Swap it" };
    const rows = ci.items.map(it => `<label class="ci-row">
        <input type="checkbox" data-act="ci-toggle" data-id="${esc(it.id)}" ${ciOff.has(it.id) ? "" : "checked"}>
        <span class="ci-tag ${it.kind}">${tag[it.kind]}</span>
        <span class="ci-text"><b>${esc(it.from)}</b> → ${esc(it.to)}<small>${esc(it.why)}</small></span></label>`).join("");
    box.innerHTML = `<div class="card checkin">
      <span class="eyebrow">Week ${ci.week} check-in</span>
      <h2 class="h3">${ci.items.length ? "Let's tune your quests" : "Solid week. Keep it rolling."}</h2>
      <p class="ci-sum">Last 7 days: ${ci.done} of ${ci.sched} bars done.${ci.items.length ? " Quests you crush get harder, ones you skip get easier." : ""}</p>
      ${rows ? `<div class="ci-list">${rows}</div>` : ""}
      <div class="ci-actions">${ci.items.length ? `<button class="btn mint" data-act="ci-apply" data-key="ci-apply">Apply changes</button><button class="btn white" data-act="ci-skip" data-key="ci-skip">Not now</button>`
        : `<button class="btn mint" data-act="ci-skip" data-key="ci-skip">Nice</button>`}</div>
    </div>`;
    return;
  }
  if (!S.onboard && !S.flags.noSetup) {
    box.innerHTML = `<div class="card nudge">
      <div><span class="eyebrow">2-minute setup</span><h2 class="h3">Get quests picked for you</h2>
      <p>Tell it your goals and time. Your XP, coins and streak stay.</p></div>
      <div class="ci-actions"><button class="btn mint" data-act="setup" data-key="setup">Start setup</button><button class="btn white" data-act="setup-no" data-key="setup-no">Not now</button></div></div>`;
    return;
  }
  box.innerHTML = "";
}

function renderHero() {
  const xp = totalXP(), lv = levelInfo(xp), t = todayKey();
  const cnt = dayCount(t), need = needFor(t), ok = cnt >= need;
  const shieldFree = shieldDay(mondayOf(t)) === null, st = streak();
  const pct = Math.max(4, Math.min(100, Math.round(lv.into / lv.need * 100)));
  let pips = ""; for (let i = 0; i < need; i++) pips += `<i class="${i < cnt ? "on" : ""}"></i>`;
  const mq = mqEditing
    ? `<form id="mq-form"><input class="inp" id="mq-input" maxlength="90" value="${esc(S.mainQuest)}" placeholder="One big goal" aria-label="Main quest"><button class="btn mint" type="submit">Save</button></form>`
    : `<div class="mq-body"><span class="eyebrow">Main quest</span><span class="mq-text">${esc(S.mainQuest || "Set one big goal")}</span></div>
       <button class="iconbtn" data-act="mq-edit" data-key="mq-edit" aria-label="Edit main quest">${I.pencil}</button>`;
  $("hero").innerHTML = `
    <div class="xs">
      <div class="lvl-badge sm" aria-label="Level ${lv.L}"><small>LVL</small><b>${lv.L}</b></div>
      <div class="xs-main">
        <div class="xs-top"><span class="xs-rank">${lv.name}</span><span class="num">${lv.into} / ${lv.need} XP</span></div>
        <div class="meter xp" id="xpbar" role="progressbar" aria-label="XP to next level" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}">${mi("xp", pct)}</div>
        <div class="xs-stats">
          <span class="xs-stat">${I.flame}<b>${st}</b>day streak</span>
          <span class="xs-stat">${shieldFree ? I.shield : I.shieldOff}${shieldFree ? "Shield ready" : "Shield used"}</span>
          <span class="xs-stat ${ok ? "ok" : ""}"><span class="pips">${pips}</span>${ok ? "Day secured" : `${Math.min(cnt, need)}/${need} to secure`}</span>
        </div>
      </div>
    </div>
    <div class="mq">${mq}</div>`;
}

/* The single most useful thing to do right now. */
function nextQuest() {
  const k = todayKey(), e = entry(k), h = new Date().getHours();
  const order = { morning: 0, after: 1, any: 1.5, evening: 2 };
  const cur = h < 12 ? 0 : h < 18 ? 1 : 2;
  let open = sched(k).filter(t => !e.t[t.id]);
  if (!open.length) return null;
  if (open.every(t => nextSkip.has(t.id))) nextSkip.clear();
  open = open.filter(t => !nextSkip.has(t.id));
  const score = t => (order[t.slot] <= cur + 0.5 ? 0 : 100) + Math.abs(order[t.slot] - cur) * 10 + toMin(t.time) / 2000 - t.xp / 1000;
  return open.sort((a, b) => score(a) - score(b))[0];
}
function renderNext() {
  const box = $("next");
  if (viewDay !== 0 || editMode) { box.innerHTML = ""; return; }
  const t = nextQuest();
  if (!t) {
    const any = sched(todayKey()).length;
    box.innerHTML = `<div class="card nextup done"><span class="eyebrow">Next up</span>
      <h2 class="nu-title">${any ? "All bars done today." : "Nothing on today."}</h2>
      <p class="nu-meta">${any ? "Bonus round? Hit I'm bored below." : "Rest, or hit I'm bored for a quick quest."}</p></div>`;
    return;
  }
  const c = CATS[t.cat] || CATS.mind, slot = (SLOTS.find(s => s[0] === t.slot) || SLOTS[3])[1];
  const swap = lastNextId !== null && lastNextId !== t.id; lastNextId = t.id;
  box.innerHTML = `<div class="card nextup ${swap ? "swapin" : ""}" style="--c:${c.c}">
    <span class="eyebrow">Next up · ${slot}${t.time ? " · " + esc(t.time) : ""}</span>
    <h2 class="nu-title">${esc(t.name)}</h2>
    <p class="nu-meta">${t.min > 1 ? `~${t.min} min · ` : ""}+${t.xp} XP · +${t.xp} coins</p>
    <div class="nu-actions">
      <button class="btn mint" data-act="full" data-id="${esc(t.id)}" data-key="nu-done">${I.check}Done</button>
      ${t.mini ? `<button class="btn white" data-act="mini" data-id="${esc(t.id)}" data-key="nu-mini">Lazy: ${esc(t.mini)} · +${half(t.xp)}</button>` : ""}
      <button class="linkbtn" data-act="next-skip" data-id="${esc(t.id)}" data-key="nu-skip">Later</button>
      <button class="linkbtn" data-act="swap" data-id="${esc(t.id)}" data-key="nu-swap">${confirmSwap === t.id ? "Tap again: swap it" : "Swap"}</button>
    </div></div>`;
}

/* I'm bored: quick quest sized by time and energy, tilted toward the user's goals. */
function rollBored() {
  const h = new Date().getHours(), late = h >= 21 || h < 7;
  const goals = (S.onboard && S.onboard.goals) || [];
  const ok = q => q.min === boredMin && !(boredLow && q.energy === "high") && !(late && (q.tags.includes("outside") || q.tags.includes("call")));
  const idx = BORED.map((q, i) => i).filter(i => ok(BORED[i]) && i !== boredIdx);
  const mine = idx.filter(i => goals.includes(BORED[i].area));
  boredIdx = (mine.length && Math.random() < 0.7) ? pick(mine) : (idx.length ? pick(idx) : boredIdx);
}
function renderBored() {
  const n = entry(todayKey()).b || 0, q = BORED[boredIdx];
  const btn = `<button class="bored" data-act="bored" data-key="bored" aria-expanded="${boredOpen}">
      <div><b>I'm bored</b><span>${n ? `${n} done today · ` : ""}Quick quest in 2, 5 or 15 min</span></div>
      <div class="orb">${I.bolt}</div></button>`;
  const area = q ? (AREAS.find(a => a.k === q.area) || { label: q.area === "people" ? "People" : "Fun" }).label : "";
  const panel = boredOpen && q ? `
    <div class="card bq">
      <div class="bq-head">
        <div class="bq-chips" role="group" aria-label="Time">${[2, 5, 15].map(m => `<button class="chip-btn" data-act="bmin" data-v="${m}" data-key="bmin${m}" aria-pressed="${boredMin === m}">${m} min</button>`).join("")}
          <button class="chip-btn" data-act="blow" data-key="blow" aria-pressed="${boredLow}">Low energy</button></div>
        <button class="iconbtn" data-act="bored-close" data-key="bored-close" aria-label="Close quest">${I.x}</button>
      </div>
      <p class="bq-text">${esc(q.text)}</p>
      <p class="bq-meta">+${BORED_XP[q.min]} XP · +${BORED_XP[q.min]} coins · ${esc(area)}</p>
      <div class="bq-actions">
        <button class="btn mint" data-act="bored-done" data-key="bored-done">Did it · +${BORED_XP[q.min]}</button>
        <button class="btn white" data-act="reroll" data-key="reroll">Another one</button>
      </div>
    </div>` : "";
  $("bored").innerHTML = btn + panel;
}

let barIdx = 0;
function barHTML(t, m) {
  const c = CATS[t.cat] || CATS.mind;
  const cls = m === "f" ? "is-done" : m === "m" ? "is-mini" : "";
  const top = `<span class="tag">${c.label}</span>${t.time ? `<span>${esc(t.time)}</span>` : ""}${t.min > 1 ? `<span>~${t.min} min</span>` : ""}${editMode ? `<span>${daysLabel(t.days)}</span>` : ""}<span class="stamp">${m === "m" ? "MINI" : "ATE"}</span>`;
  const lazy = (!editMode && t.mini) ? `<button class="lazy" data-act="mini" data-id="${esc(t.id)}" data-key="m-${esc(t.id)}" aria-pressed="${m === "m"}">Lazy: ${esc(t.mini)} · +${half(t.xp)}</button>` : "";
  const side = editMode
    ? `<button class="check edit" data-act="edit" data-id="${esc(t.id)}" data-key="e-${esc(t.id)}" aria-label="Edit ${esc(t.name)}">${I.pencil}</button><span class="xp">+${t.xp}</span>`
    : `<button class="check" data-act="full" data-id="${esc(t.id)}" data-key="f-${esc(t.id)}" aria-pressed="${m === "f"}" aria-label="Done: ${esc(t.name)}">${I.check}</button><span class="xp">+${t.xp}</span>`;
  return `<div class="bar-wrap" data-bar="${esc(t.id)}" style="--i:${barIdx++}"><article class="bar ${cls}" style="--c:${c.c}">
    <div class="bar-body"><div class="bar-top">${top}</div><h3 class="bar-title">${esc(t.name)}</h3>${lazy}</div>
    <div class="bar-side">${side}</div></article></div>`;
}
function renderQuests() {
  const k = viewKey(), e = entry(k);
  const list = editMode ? S.tasks : sched(k);
  let body = ""; barIdx = 0;
  for (const [slot, label] of SLOTS) {
    const ts = list.filter(t => t.slot === slot).sort((a, b) => toMin(a.time) - toMin(b.time) || a.name.localeCompare(b.name));
    if (!ts.length) continue;
    body += `<div class="slot">${label}</div><div class="bars">${ts.map(t => barHTML(t, e.t[t.id] && e.t[t.id].m)).join("")}</div>`;
  }
  if (!body) body = `<div class="card empty" style="margin-top:16px">${editMode ? "No bars yet. Add your first one." : `Nothing on for ${viewDay ? "yesterday" : "today"}. Hit I'm bored, or add a bar.`}</div>`;
  if (editMode) body += `<button class="add" data-act="new" data-key="new">+ Add a bar</button>`;
  const done = Object.keys(e.t).filter(id => list.some(t => t.id === id)).length;
  const tabs = editMode ? "" : `<div class="seg" role="group" aria-label="Day">
      <button data-act="tab" data-v="0" data-key="tab0" aria-pressed="${viewDay === 0}">Today</button>
      <button data-act="tab" data-v="1" data-key="tab1" aria-pressed="${viewDay === 1}">Yesterday</button></div>`;
  $("quests").innerHTML = `
    <div class="sec-head"><h2>${editMode ? "Edit bars" : viewDay ? "Yesterday" : "Today's bars"}</h2>${tabs}
      <button class="btn ${editMode ? "mint" : "white"}" data-act="editmode" data-key="editmode">${editMode ? "Done" : I.pencil + "Edit"}</button></div>
    <p class="dayline">${editMode ? "Tap the pencil to change a bar. Your progress stays." : `${fmtDay(k)} · ${done}/${list.length} done · ${dayXP(k)} XP`}</p>
    ${body}`;
}

function renderBoss() {
  const box = $("boss");
  if (!bossUnlocked()) {
    box.innerHTML = `<div class="row-between"><h2 class="h3">Weekly boss</h2><span class="chip-s">Locked</span></div>
      <div class="boss-main"><div class="boss-art dim">${bossSVG("var(--paper-2)", false, true)}</div>
      <div class="boss-meta"><div class="boss-name">???</div><p class="lock-text">Secure your first day (3 bars) and this week's boss shows up.</p></div></div>`;
    return;
  }
  const t = todayKey(), mon = mondayOf(t), st = bossState(mon), b = st.boss;
  const daysLeft = 7 - ((dow(t) + 6) % 7), sh = shieldDay(mon);
  const low = !st.won && st.left <= (st.hp + st.heal) * 0.25;
  const taunt = st.won ? "Okay okay, you win this week." : low ? b.low : b.t[dayIndex(t) % b.t.length];
  let week = "";
  for (let i = 0; i < 7; i++) {
    const k = addDays(mon, i); let cls, ic = "";
    if (k > t) cls = "future";
    else if (k === t) { cls = secured(k) ? "ok today" : "today"; if (secured(k)) ic = I.miniCheck; }
    else if (k < S.startDate) cls = "pre";
    else if (secured(k)) { cls = "ok"; ic = I.miniCheck; }
    else if (sh === k) { cls = "sh"; ic = I.shield; }
    else { cls = "miss"; ic = I.miniX; }
    week += `<div class="wd ${cls}"><span>${DAY_SHORT[DAY_ORDER[i]].slice(0, 2).toUpperCase()}</span><i>${ic}</i></div>`;
  }
  const total = st.hp + st.heal;
  box.innerHTML = `
    <div class="row-between"><h2 class="h3">Weekly boss</h2>
      <span class="chip-s ${st.won ? "win" : ""}">${st.won ? "Beaten" : daysLeft === 1 ? "Last day" : `${daysLeft} days left`}</span></div>
    <div class="boss-main">
      <div class="boss-art" id="boss-art">${bossSVG(b.c, st.won)}</div>
      <div class="boss-meta">
        <div class="boss-name">${b.n}</div>
        <p class="taunt">“${esc(taunt)}”</p>
      </div>
    </div>
    ${st.won ? `<p class="num">Down for the week. You got +${BOSS_COINS} coins, +${BOSS_XP} XP and a trophy.</p>` : `
    <div class="meter hp" role="progressbar" aria-label="Boss HP" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${st.left}">${mi("boss", Math.max(3, Math.round(st.left / total * 100)))}</div>
    <div class="num">HP ${st.left} / ${total} · every XP you earn hits</div>
    ${st.heal ? `<p class="heal">Healed +${st.heal} from ${st.missed.length} missed day${st.missed.length === 1 ? "" : "s"}. Your weekly shield blocks one.</p>` : ""}
    <p class="reward">${I.trophy}Win: +${BOSS_COINS} coins · +${BOSS_XP} XP · trophy</p>`}
    <div class="week">${week}</div>`;
}

/* Real-world milestones from the log. */
function countDone(id, from, to) {
  let n = 0;
  for (let k = from; k <= to; k = addDays(k, 1)) if (S.log[k] && S.log[k].t[id]) n++;
  return n;
}
function renderMiles() {
  const t = todayKey(), mon = mondayOf(t), lastMon = addDays(mon, -7), monthStart = t.slice(0, 8) + "01";
  const rows = [];
  for (const task of S.tasks) {
    const wk = countDone(task.id, mon, t), lw = countDone(task.id, lastMon, addDays(mon, -1)), mo = countDone(task.id, monthStart, t);
    const unit = unitOf(task);
    if (wk >= 1) rows.push({ n: wk, text: unit ? `${plural(wk, unit)} this week` : `× “${task.name}” this week`, delta: lastMon >= S.startDate || lw ? wk - lw : null, s: wk * 2 + (wk - lw) });
    else if (mo >= 3) rows.push({ n: mo, text: unit ? `${plural(mo, unit)} this month` : `× “${task.name}” this month`, delta: null, s: mo });
  }
  rows.sort((a, b) => b.s - a.s);
  let secM = 0, daysM = 0;
  for (let k = monthStart > S.startDate ? monthStart : S.startDate; k <= t; k = addDays(k, 1)) { daysM++; if (secured(k)) secM++; }
  const list = rows.slice(0, 4).map(r => `<li><b>${r.n}</b><span>${esc(r.text)}</span>${r.delta ? `<em class="${r.delta > 0 ? "up" : "down"}">${r.delta > 0 ? "+" : ""}${r.delta} vs last week</em>` : ""}</li>`).join("");
  $("miles").innerHTML = `<div class="row-between"><h2 class="h3">Real-life wins</h2></div>
    ${list ? `<ul class="miles">${list}</ul>` : `<p class="lock-text">Your real wins show up here as you tick bars: walks, workouts, focus sessions, on-budget days.</p>`}
    <p class="last">${secM} of ${daysM} day${daysM === 1 ? "" : "s"} secured this month.</p>`;
}

function fmtLeft(ms) {
  const h = Math.ceil(ms / 3600000);
  if (h >= 24) { const d = Math.floor(h / 24), r = h % 24; return r ? `${d}d ${r}h` : `${d}d`; }
  if (h > 1) return `${h}h`;
  return `${Math.max(1, Math.ceil(ms / 60000))} min`;
}
function daysOf(cost, rate) { const d = cost / rate; return d < 1 ? "< 1 day" : `≈ ${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}`; }
function renderShop() {
  const box = $("shop"), c = coins();
  const keepName = $("wi-name") ? $("wi-name").value : "", keepPrice = $("wi-price") ? $("wi-price").value : "";
  const keepT = $("tr-name") ? $("tr-name").value : "", keepTc = $("tr-cost") ? $("tr-cost").value : "";
  if (!shopUnlocked()) {
    box.innerHTML = `<div class="row-between"><h2 class="h3">Shop</h2><span class="chip-s">Locked</span></div>
      <p class="lock-text">${I.lock}The shop opens at ${SHOP_AT} coins. You have ${c}.</p>
      <div class="meter wish">${mi("shoplock", Math.max(3, Math.min(100, Math.round(c / SHOP_AT * 100))))}</div>`;
    return;
  }
  const rate = earnRate();
  let content;
  if (shopTab === "treats") {
    const rows = S.treats.map((tr, ti) => {
      const sure = confirmBuy === tr.id;
      const action = editMode
        ? `<button class="iconbtn" data-act="treat-del" data-id="${esc(tr.id)}" data-key="td-${esc(tr.id)}" aria-label="Remove ${esc(tr.name)}">${I.x}</button>`
        : `<button class="btn ${sure ? "mint" : ""}" data-act="buy" data-id="${esc(tr.id)}" data-key="b-${esc(tr.id)}" ${c < tr.cost ? "disabled" : ""}>${sure ? "Sure?" : "Get"}</button>`;
      return `<div class="treat" style="--i:${ti}"><span class="treat-name">${esc(tr.name)}<small>${daysOf(tr.cost, rate)} of quests</small></span><span class="cost">${I.coin}${tr.cost}</span>${action}</div>`;
    }).join("") || `<p class="last">No treats yet. Tap Edit to add one.</p>`;
    const form = editMode ? `<form class="tr-form" id="tr-form">
        <input class="inp" id="tr-name" maxlength="60" placeholder="New treat" aria-label="Treat name" autocomplete="off" value="${esc(keepT)}">
        <input class="inp cost-in" id="tr-cost" inputmode="numeric" maxlength="5" placeholder="Coins" aria-label="Cost in coins" autocomplete="off" value="${esc(keepTc)}">
        <button class="btn" type="submit">Add</button></form>` : "";
    const last = S.buys.length ? S.buys[S.buys.length - 1] : null;
    const canUndo = last && (last.d === todayKey() || last.d === addDays(todayKey(), -1));
    content = `<div class="treats">${rows}</div>${form}${last ? `<p class="last">Last: ${esc(last.n)} · ${fmtDay(last.d)}${canUndo ? ` <button class="linkbtn undo-buy" data-act="buy-undo" data-key="buy-undo">${confirmUndo ? `Tap again: refund ${last.c} coins` : "Undo"}</button>` : ""}</p>` : ""}`;
  } else {
    const now = Date.now(), bonusFree = !S.skipWeeks.includes(mondayOf(todayKey()));
    const items = S.wish.map((w, wi) => {
      const pct = Math.min(100, Math.round(c / w.need * 100));
      const left = w.added + COOL_MS - now, cooled = left <= 0, earned = c >= w.need, ready = cooled && w.ok && earned;
      const li = (ok, text) => `<li class="${ok ? "ok" : ""}"><i>${ok ? I.miniCheck : ""}</i>${text}</li>`;
      let action = "";
      if (cooled && !w.ok) action = `<div class="wish-actions"><span class="ask">Still want it?</span>
          <button class="btn mint" data-act="wish-yes" data-id="${esc(w.id)}" data-key="wy-${esc(w.id)}">Yes</button>
          <button class="btn white" data-act="wish-no" data-id="${esc(w.id)}" data-key="wn-${esc(w.id)}">Nah${bonusFree ? ` · +${SKIP_BONUS}` : ""}</button></div>`;
      else if (ready) action = `<div class="wish-actions"><button class="btn mint" data-act="wish-buy" data-id="${esc(w.id)}" data-key="wb-${esc(w.id)}">${confirmWish === w.id ? `Tap again: pay ${w.need} coins` : "Unlocked · Buy it"}</button></div>`;
      return `<div class="wish-item ${ready ? "ready" : ""}" style="--i:${wi}">
        <div class="wish-head"><span class="wish-name">${esc(w.name)}</span><span class="price">${w.price} €</span>
          <button class="iconbtn" data-act="wish-del" data-id="${esc(w.id)}" data-key="wd-${esc(w.id)}" aria-label="Remove ${esc(w.name)}">${I.x}</button></div>
        <div class="meter wish" role="progressbar" aria-label="Coins toward ${esc(w.name)}" aria-valuemin="0" aria-valuemax="${w.need}" aria-valuenow="${Math.min(c, w.need)}">${mi("w-" + w.id, Math.max(3, pct))}</div>
        <ul class="checks">
          ${li(earned, `${Math.min(c, w.need)} / ${w.need} coins${earned ? "" : ` · ${daysOf(w.need - c, rate)} to go`}`)}
          ${li(cooled, cooled ? "72 h cooldown done" : `72 h cooldown · ${fmtLeft(left)} left`)}
          ${li(w.ok, w.ok ? "Still want it: yes" : cooled ? "Still want it? Decide below" : "Still want it? Asked after cooldown")}
        </ul>${action}</div>`;
    }).join("");
    content = `${items ? `<div class="wish-list">${items}</div>` : `<p class="last">Want something real, 50 € or more? Add it with its price. 1 € = ${XP_PER_EUR} coins, plus a 72 h wait.</p>`}
      <form class="tr-form" id="wi-form">
        <input class="inp" id="wi-name" maxlength="60" placeholder="What do you want?" aria-label="Wishlist item" autocomplete="off" value="${esc(keepName)}">
        <input class="inp cost-in" id="wi-price" inputmode="decimal" maxlength="7" placeholder="€" aria-label="Price in euros" autocomplete="off" value="${esc(keepPrice)}">
        <button class="btn" type="submit">Add</button></form>
      <p class="last">Skip something after the wait: +${SKIP_BONUS} coins (once a week).</p>`;
  }
  box.innerHTML = `<div class="row-between"><h2 class="h3">Shop</h2><span class="cost">${I.coin}${c}</span></div>
    <div class="seg small" role="group" aria-label="Shop">
      <button data-act="shoptab" data-v="treats" data-key="st-t" aria-pressed="${shopTab === "treats"}">Treats</button>
      <button data-act="shoptab" data-v="wish" data-key="st-w" aria-pressed="${shopTab === "wish"}">Wishlist</button></div>
    <p class="rate">You earn about <b>${rate}</b> coins a day.</p>
    ${content}
    <details class="how"><summary>How coins work</summary><ul>
      <li>Every quest pays coins equal to its XP. Lazy versions pay half.</li>
      <li>Beating the weekly boss pays +${BOSS_COINS} coins.</li>
      <li>Spending coins never lowers your level or XP.</li>
      <li>Wishlist uses real prices: 1 € = ${XP_PER_EUR} coins, then a 72 h wait.</li>
    </ul></details>`;
}

function renderHistory() {
  const t = todayKey(), start = addDays(mondayOf(t), -28);
  let cells = DAY_ORDER.map(d => `<span class="dl">${DAY_SHORT[d][0]}</span>`).join("");
  for (let i = 0; i < 35; i++) {
    const k = addDays(start, i); let cls = "hc";
    if (k > t) cls += " fut";
    else if (k < S.startDate) cls += " pre";
    else { const s = sched(k), e = entry(k), all = s.length > 0 && s.every(x => e.t[x.id]); cls += all ? " l3" : secured(k) ? " l2" : dayCount(k) > 0 ? " l1" : ""; }
    if (k === t) cls += " now";
    cells += `<span class="${cls}" style="--i:${i}" title="${fmtDay(k)}${k > t ? "" : ": " + dayCount(k) + " done"}"></span>`;
  }
  $("history").innerHTML = `
    <div class="row-between"><h2 class="h3">Last 5 weeks</h2></div>
    <div class="heat">${cells}</div>
    <div class="legend"><span><i style="background:var(--paper-2)"></i>Nothing</span><span><i style="background:var(--paper-2);background:color-mix(in srgb,var(--mint) 38%,var(--paper))"></i>Some</span><span><i style="background:var(--mint)"></i>Secured</span><span><i style="background:var(--sun)"></i>Every bar</span></div>`;
}
function renderSettings() {
  const box = $("settings"); if (!box) return;
  const txt = { synced: "Saved to your account", syncing: "Saving…", local: "Local only, not synced", error: "Couldn't sync. Saved on this device." }[sync];
  const imp = pendingImport ? `<div class="set-confirm"><p>Replace your progress with “${esc(pendingImport.name)}”?</p>
      <div class="ci-actions"><button class="btn red" data-act="import-yes" data-key="import-yes">Replace</button>
      <button class="btn white" data-act="import-no" data-key="import-no">Cancel</button></div></div>` : "";
  box.innerHTML = `
    <div class="card set-card">
      <h2 class="h3">Account</h2>
      <div class="set-row"><span class="sync ${sync === "synced" ? "ok" : sync === "error" ? "err" : ""}"><i></i>${txt}</span></div>
      ${user && user.email ? `<div class="set-row"><span class="set-label">Signed in as</span><b>${esc(user.email)}</b></div>` : ""}
      <div class="set-row"><span class="set-label">Name</span><b>${esc(displayName() || "Not set")}</b></div>
      ${opts.signOut ? `<button class="btn white" data-act="signout" data-key="signout">Sign out</button>` : ""}
    </div>
    <div class="card set-card">
      <h2 class="h3">Quests</h2>
      <p class="set-text">${S.onboard ? "Redo the 2-minute setup to get a fresh set of quests. Your XP, coins and streak stay." : "Run the 2-minute setup to get quests picked for your goals. Your XP, coins and streak stay."}</p>
      <button class="btn mint" data-act="setup" data-key="f-setup">${S.onboard ? "Redo setup" : "Start setup"}</button>
    </div>
    <div class="card set-card">
      <h2 class="h3">Your data</h2>
      <p class="set-text">Download your progress as a file, or load one in.</p>
      <div class="ci-actions"><button class="btn white" data-act="export" data-key="export">Export</button><button class="btn white" data-act="import" data-key="import">Import</button></div>
      ${imp}
    </div>
    <div class="card set-card">
      <h2 class="h3">App</h2>
      <div class="ci-actions">
        <button class="btn white" data-act="sound" data-key="sound" aria-pressed="${soundOn}">Sound ${soundOn ? "on" : "off"}</button>
        <button class="btn white" data-act="motion" data-key="motion" aria-pressed="${motionOn}">Animations ${motionOn ? "on" : "off"}</button>
        <button class="btn ${confirmReset ? "red" : "white"}" data-act="reset" data-key="reset">${confirmReset ? "Tap again: wipe progress" : "Reset progress"}</button>
      </div>
    </div>`;
}

/* Trophy cabinet: every boss you've beaten. */
function renderTrophies() {
  const box = $("trophies"); if (!box) return;
  const wins = Object.entries(S.bossWins).sort((a, b) => a[0] < b[0] ? 1 : -1);
  const cur = bossFor(mondayOf(todayKey())), next = bossFor(addDays(mondayOf(todayKey()), 7));
  const color = n => (BOSSES.find(b => b.n === n) || cur).c;
  const rows = wins.map(([m, w], i) => { const n = w.n || bossFor(m).n; return `<div class="tro-row" style="--i:${i}">
      <div class="tro-art">${bossSVG(color(n), true)}</div>
      <div class="tro-meta"><b>${esc(n)}</b><span>Week of ${fmtDay(m)}</span></div>
      <span class="tro-rew">${I.trophy}+${BOSS_COINS}</span></div>`; }).join("");
  box.innerHTML = `<div class="row-between"><h2 class="h3">Trophy cabinet</h2><span class="chip-s ${bossesBeaten() ? "win" : ""}">${bossesBeaten()} beaten</span></div>
    ${rows ? `<div class="tro-list">${rows}</div>` : `<p class="lock-text">${I.trophy}No trophies yet. Take down ${esc(cur.n)} this week and it lands here.</p>`}
    ${S.banked.boss ? `<p class="last">+ ${S.banked.boss} older boss${S.banked.boss === 1 ? "" : "es"} from over a year ago.</p>` : ""}
    <p class="last">Next week: ${esc(next.n)}.</p>`;
}

/* Stats: all-time numbers. */
function renderStats() {
  const box = $("stats"); if (!box) return;
  const lv = levelInfo(totalXP());
  let secDays = 0, bars = 0;
  for (const k in S.log) { if (secured(k)) secDays++; bars += Object.keys(S.log[k].t || {}).length + (S.log[k].b || 0); }
  const cell = (n, l) => `<div class="stat-cell"><b>${n}</b><span>${l}</span></div>`;
  box.innerHTML = `<div class="row-between"><h2 class="h3">Your stats</h2><span class="chip-s">Lvl ${lv.L} · ${lv.name}</span></div>
    <div class="stat-grid">${cell(totalXP(), "total XP")}${cell(streak(), "day streak")}${cell(secDays, "days secured")}${cell(bars, "bars done")}${cell(bossesBeaten(), "bosses beaten")}${cell(coins(), "coins now")}</div>
    <p class="last">Playing since ${fmtDay(S.startDate)}.</p>`;
}

/* Floating island navigation. */
const VIEWS = [
  ["today", "Today", '<path d="M3.5 11L12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>'],
  ["boss", "Boss", '<path d="M5 3.5l2.6 5M19 3.5l-2.6 5"/><circle cx="12" cy="14" r="7"/><path d="M9.3 13h.01M14.7 13h.01M9.5 17.3l1.25-1 1.25 1 1.25-1 1.25 1"/>'],
  ["shop", "Shop", '<path d="M5 8.5h14l-1.2 11.5H6.2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>'],
  ["stats", "Stats", '<path d="M5 20v-6M12 20V5M19 20v-10M3 20.5h18"/>'],
  ["more", "More", '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>']
];
let view = "today";
function badgeFor(v) {
  if (v === "today") { const k = todayKey(), e = entry(k); const n = sched(k).filter(t => !e.t[t.id]).length; return n ? String(n) : ""; }
  if (v === "boss") return S.flags.bossIntro && !S.flags.bossSeen ? "!" : "";
  if (v === "shop") return S.flags.shopIntro && !S.flags.shopSeen ? "!" : "";
  return "";
}
function renderIsland() {
  const nav = $("island"); if (!nav) return;
  if (!nav.querySelector(".ind")) nav.innerHTML = `<span class="ind" aria-hidden="true"></span><div class="isl-btns"></div>`;
  nav.querySelector(".isl-btns").innerHTML = VIEWS.map(([v, label, icon]) => {
    const b = badgeFor(v);
    return `<button data-act="nav" data-v="${v}" data-key="nav-${v}" aria-label="${label}" ${view === v ? 'aria-current="page"' : ""}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span class="lbl">${label}</span>${b ? `<span class="dot ${b === "!" ? "new" : ""}">${b}</span>` : ""}</button>`;
  }).join("");
  placeInd();
}
/* The yellow pill slides between tabs. */
function placeInd(instant) {
  const nav = $("island"); if (!nav) return;
  const ind = nav.querySelector(".ind"), act = nav.querySelector("[aria-current]");
  if (!ind || !act) return;
  if (instant || !ind.dataset.placed) { ind.classList.add("noanim"); requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.remove("noanim"))); }
  ind.dataset.placed = "1";
  ind.style.width = act.offsetWidth + "px";
  ind.style.transform = `translateX(${act.offsetLeft}px)`;
}
addEventListener("resize", () => placeInd(true));
function setView(v, fromHash) {
  if (!VIEWS.some(x => x[0] === v)) v = "today";
  const prev = view, changed = v !== prev;
  const dir = VIEWS.findIndex(x => x[0] === v) - VIEWS.findIndex(x => x[0] === prev);
  view = v;
  endLeave();
  const old = changed && motionOn ? document.querySelector(`#app .view[data-view="${prev}"]`) : null;
  const keep = old && !old.hidden ? old : null;
  if (keep) startLeave(keep, dir, window.scrollY);
  document.querySelectorAll("#app .view").forEach(el => { if (el !== keep) el.hidden = el.dataset.view !== v; });
  if (!fromHash && location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
  let seen = false;
  if (v === "boss" && S.flags.bossIntro && !S.flags.bossSeen) { S.flags.bossSeen = true; seen = true; }
  if (v === "shop" && S.flags.shopIntro && !S.flags.shopSeen) { S.flags.shopSeen = true; seen = true; }
  if (seen) commit(); else renderIsland();
  if (changed) { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); playEnter(v, dir); }
}
/* Old tab slides + fades out on top of the new one while the new one slides in. */
let leaving = null;
function startLeave(el, dir, y) {
  const box = el.parentElement;
  box.style.minHeight = Math.max(0, el.offsetHeight - y) + "px";
  box.classList.add("swapping");
  el.classList.remove("enter", "from-r", "from-l");
  el.style.top = -y + "px";
  el.inert = true; el.setAttribute("aria-hidden", "true");
  el.classList.add("leaving", dir < 0 ? "to-r" : "to-l");
  leaving = el;
  el._lt = setTimeout(endLeave, 240);
}
function endLeave() {
  if (!leaving) return;
  const el = leaving; leaving = null;
  clearTimeout(el._lt);
  el.classList.remove("leaving", "to-l", "to-r");
  el.style.top = ""; el.inert = false; el.removeAttribute("aria-hidden");
  el.hidden = el.dataset.view !== view;
  const box = el.parentElement; box.classList.remove("swapping"); box.style.minHeight = "";
}
function playEnter(v, dir = 0) {
  const el = document.querySelector(`#app .view[data-view="${v}"]`); if (!el || !motionOn) return;
  [...el.children].forEach((c, i) => c.style.setProperty("--d", i));
  el.classList.remove("enter", "from-r", "from-l"); void el.offsetWidth;
  el.classList.add("enter"); if (dir) el.classList.add(dir > 0 ? "from-r" : "from-l");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("enter", "from-r", "from-l"), 1400);
  const act = document.querySelector("#island [aria-current]"); if (act) { act.classList.remove("just"); void act.offsetWidth; act.classList.add("just"); }
  if (v === "stats") el.querySelectorAll(".stat-cell b").forEach(b => countUp(b, 0, Number(b.textContent) || 0, 800));
}
function setViewQuiet(v) {
  endLeave();
  view = VIEWS.some(x => x[0] === v) ? v : "today";
  document.querySelectorAll("#app .view").forEach(el => { el.hidden = el.dataset.view !== view; });
}
addEventListener("hashchange", () => { if (started) setView(location.hash.slice(1), true); });

/* ---------- feedback ---------- */
let toastTimer = 0, toastQueue = [];
function toast(msg) {
  const el = $("toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove("show"); const n = toastQueue.shift(); if (n) setTimeout(() => toast(n), 250); }, 1900);
}
const toastLater = msg => { if ($("toast").classList.contains("show")) toastQueue.push(msg); else toast(msg); };
let actx = null;
function sfx(type) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime, seq = { pop: [740, 1110], undo: [420, 300], secure: [660, 880, 1100], big: [523, 659, 784, 1047, 1319],
      hit: [190, 120], crit: [260, 160, 90], poof: [420, 300, 210, 140] }[type] || [740];
    const wave = (type === "hit" || type === "crit") ? "square" : type === "poof" ? "sawtooth" : "triangle";
    seq.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = t0 + i * 0.075;
      o.type = wave; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.19);
    });
  } catch {}
}
const fx = $("fx"), cx = fx.getContext("2d"); let parts = [], raf = 0, palette = null;
function sizeFx() { const r = window.devicePixelRatio || 1; fx.width = innerWidth * r; fx.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
function burst(x, y, n, power) {
  if (!motionOn) return;
  if (!palette) { const cs = getComputedStyle(document.documentElement); palette = ["--sun", "--tang", "--bubble", "--mint", "--grape", "--sky", "--paper"].map(v => cs.getPropertyValue(v).trim()); }
  if (!raf) sizeFx();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 7) * (power || 1);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5 * (power || 1), w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: palette[i % palette.length], life: 60 + Math.random() * 40 });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.strokeStyle = "#0E1240"; cx.lineWidth = 1.5;
    cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, innerWidth, innerHeight), 0);
}
function bigBurst() { burst(innerWidth * 0.25, innerHeight * 0.35, 46, 1.3); burst(innerWidth * 0.75, innerHeight * 0.35, 46, 1.3); }
function floatXP(el, text, cls = "float-xp") {
  if (!el || !motionOn) return;
  const r = el.getBoundingClientRect(), s = document.createElement("span");
  s.className = cls; s.textContent = text;
  s.style.left = (r.left + r.width / 2) + "px"; s.style.top = (r.top - 6) + "px";
  document.body.appendChild(s); setTimeout(() => s.remove(), 950);
  const bar = $("xpbar"); if (bar) { bar.classList.remove("pulse"); void bar.offsetWidth; bar.classList.add("pulse"); }
}

/* ---------- actions ---------- */
function commit() { S.updatedAt = Date.now(); lsSet(LS_KEY, JSON.stringify(S)); if (store) store.push(); render(); }
function cleanDay(k) { const e = S.log[k]; if (e && !Object.keys(e.t).length && !(e.b > 0)) delete S.log[k]; }
function metrics(k) {
  const m = { lvl: levelInfo(totalXP()).L, sec: secured(k), bl: null, bt: null };
  const mon = mondayOf(todayKey());
  if (bossUnlocked() && !S.bossWins[mon]) { const st = bossState(mon); m.bl = st.left; m.bt = st.hp + st.heal; }
  return m;
}
/* Boss win + unlocks, applied to S before saving. Returns messages to show. */
function sideEffects() {
  const msgs = [];
  const mon = mondayOf(todayKey());
  if (bossUnlocked() && !S.bossWins[mon]) {
    const st = bossState(mon);
    if (st.dmg >= st.hp + st.heal) { S.bossWins[mon] = { n: st.boss.n }; S.xpBonus += BOSS_XP; msgs.push({ big: true, boss: st.boss, text: `${st.boss.n} is down! +${BOSS_COINS} coins, +${BOSS_XP} XP` }); }
  }
  if (!S.flags.bossIntro && bossUnlocked()) { S.flags.bossIntro = true; msgs.push({ text: "New: a weekly boss appeared" }); }
  if (!S.flags.shopIntro && shopUnlocked()) { S.flags.shopIntro = true; msgs.push({ text: "New: the shop is open" }); }
  return msgs;
}
function celebrate(before, after, k, o, msgs) {
  if (!o.added) { sfx("undo"); toast(pick(["Undone.", "Took it back."])); msgs.forEach(m => toastLater(m.text)); return; }
  if (o.el) { o.el.classList.remove("pop"); void o.el.offsetWidth; o.el.classList.add("pop"); }
  floatXP(o.btn, `+${o.xp} XP`);
  const bossWin = msgs.find(m => m.boss);
  let big = false;

  // The boss takes the hit: in place on the Boss tab, otherwise a small HUD.
  if (before.bl != null && !bossWin) {
    const left = after.bl != null ? after.bl : 0, total = after.bt || before.bt;
    if (left < before.bl) {
      const b = bossFor(mondayOf(todayKey()));
      if (view === "boss") {
        const art = $("boss-art");
        if (art) { art.classList.remove("hit"); void art.offsetWidth; art.classList.add("hit"); floatXP(art, `-${before.bl - left}`, "float-dmg"); }
      } else {
        bossHit({ svg: bossSVG(b.c, false), name: b.n, fromPct: Math.round(before.bl / total * 100), toPct: Math.round(left / total * 100), left, total, dmg: before.bl - left });
      }
    }
  }
  if (o.firstWin) { big = true; sfx("big"); bigBurst(); banner("First W!", `+${FIRST_WIN_COINS} bonus coins`, "var(--mint)"); }
  if (after.sec && !before.sec) { big = true; if (!o.firstWin) sfx("secure"); bigBurst(); banner(k === todayKey() ? "Day secured" : "Yesterday secured", `Streak ${streak()}`, "var(--sun)"); }
  if (bossWin) {
    big = true;
    const b = bossWin.boss;
    bossDefeat({ name: b.n, line: b.low, svgAlive: bossSVG(b.c, false), svgDead: bossSVG(b.c, true),
      fromPct: before.bt ? Math.max(8, Math.round(before.bl / before.bt * 100)) : 30, coins: BOSS_COINS, xp: BOSS_XP });
  }
  if (after.lvl > before.lvl) { big = true; levelUp(after.lvl, levelInfo(totalXP()).name); }
  if (!big) {
    sfx("pop");
    const r = (o.el || o.btn || document.body).getBoundingClientRect();
    burst(Math.min(innerWidth - 40, r.right - 60), r.top + r.height / 2, 24, 0.85);
    toast(o.bored ? `+${o.xp} · Boredom: defeated.` : o.mini ? pick(MINI_HYPE) : `+${o.xp} · ${pick(HYPE)}`);
  }
  msgs.filter(m => !m.boss).forEach(m => toastLater(m.text));
}
function toggle(id, mode, btn) {
  const k = viewKey(), t = S.tasks.find(x => x.id === id); if (!t) return;
  const before = metrics(k), e = S.log[k] || (S.log[k] = { t: {}, b: 0 });
  const cur = e.t[id] && e.t[id].m; let added = false, xp = 0, firstWin = false;
  if (mode === "f") { if (cur === "f") delete e.t[id]; else { xp = t.xp; e.t[id] = { m: "f", xp }; added = true; } }
  else { if (cur === "m") delete e.t[id]; else { xp = half(t.xp); e.t[id] = { m: "m", xp }; added = true; } }
  if (added && !S.flags.firstWin) { S.flags.firstWin = true; S.bonus += FIRST_WIN_COINS; firstWin = true; }
  if (added) nextSkip.delete(id);
  cleanDay(k);
  const msgs = sideEffects();
  const rect = btn ? btn.getBoundingClientRect() : null;
  commit();
  const anchor = rect ? { getBoundingClientRect: () => rect } : null;
  celebrate(before, metrics(k), k, { added, mini: mode === "m", xp, firstWin, btn: anchor, el: document.querySelector(`[data-bar="${CSS.escape(id)}"]`) }, msgs);
}
function doBored(btn) {
  const q = BORED[boredIdx]; if (!q) return;
  const k = todayKey(), before = metrics(k), e = S.log[k] || (S.log[k] = { t: {}, b: 0 });
  const xp = BORED_XP[q.min] || 15;
  if (e.bx == null) e.bx = (e.b || 0) * 15;
  e.b = (e.b || 0) + 1; e.bx += xp;
  let firstWin = false;
  if (!S.flags.firstWin) { S.flags.firstWin = true; S.bonus += FIRST_WIN_COINS; firstWin = true; }
  boredOpen = false;
  const msgs = sideEffects();
  const rect = btn ? btn.getBoundingClientRect() : null;
  commit();
  const anchor = rect ? { getBoundingClientRect: () => rect } : null;
  celebrate(before, metrics(k), k, { added: true, xp, firstWin, bored: true, btn: anchor, el: null }, msgs);
}
function buy(id) {
  const tr = S.treats.find(x => x.id === id); if (!tr) return;
  if (confirmBuy !== id) { confirmBuy = id; render(); return; }
  confirmBuy = null;
  if (coins() < tr.cost) { render(); return; }
  S.spent += tr.cost; S.buys.push({ n: tr.name, c: tr.cost, d: todayKey() }); S.buys = S.buys.slice(-20);
  commit(); sfx("secure"); bigBurst(); banner("Treat unlocked", tr.name, "var(--bubble)");
}
/* Swap a quest for a different one from the library. The old one won't be offered again. */
const LEGACY_TPL = { reach: "outreach" };
function tplGuess(t) {
  if (t.tpl) return t.tpl;
  if (LEGACY_TPL[t.id] && TPL[LEGACY_TPL[t.id]]) return LEGACY_TPL[t.id];
  const w = t.name.toLowerCase().split(/\s+/)[0];
  const hit = Object.values(TPL).find(x => x.cat === t.cat && x.tiers.some(r => r[0].toLowerCase().split(/\s+/)[0] === w));
  return hit ? hit.id : null;
}
function swapQuest(id) {
  const i = S.tasks.findIndex(t => t.id === id); if (i < 0) return;
  const old = S.tasks[i], gone = tplGuess(old);
  if (gone && !S.ban.includes(gone)) S.ban = S.ban.concat(gone).slice(-40);
  const have = S.tasks.filter(t => t.id !== id).map(tplGuess).filter(Boolean);
  const n = swapTask({ ...old, tpl: gone }, S.tasks, setupAnswers(), S.ban.concat(have));
  if (!n) { toast("No other quest fits right now. Edit it instead."); return; }
  S.tasks[i] = n; nextSkip.delete(id);
  commit(); sfx("pop"); toast(`Swapped for: ${n.name}`);
}
function setupAnswers() {
  return S.onboard || { goals: ["fit", "mind"], specific: {}, level: 1, difficulty: "normal", minutes: 15, days: ALL.slice(), times: ["after", "evening"] };
}
function applyCheckin() {
  const ci = checkinData(); if (!ci) return;
  const a = setupAnswers(); let changed = 0;
  for (const it of ci.items) {
    if (ciOff.has(it.id)) continue;
    const i = S.tasks.findIndex(t => t.id === it.id); if (i < 0) continue;
    const t = S.tasks[i];
    if (it.kind === "up") S.tasks[i] = retier(t, t.tier + 1);
    else if (it.kind === "down") S.tasks[i] = retier(t, t.tier - 1);
    else if (it.kind === "fewer") S.tasks[i] = { ...t, days: pickDays("3x", t.days) };
    else if (it.kind === "swap") { const n = swapTask(t, S.tasks, a, S.ban); if (n) S.tasks[i] = n; }
    changed++;
  }
  S.checkins[ci.mon] = "done"; ciOff = new Set();
  commit(); sfx("secure"); toast(changed ? `Quests tuned. ${changed} change${changed === 1 ? "" : "s"}.` : "Saved.");
}

/* ---------- onboarding ---------- */
const isFresh = () => !Object.keys(S.log).length && !S.buys.length && !S.spent && !S.onboard;
function startSetup(first) {
  $("app").hidden = true;
  openOnboarding({
    nick: displayName(), prev: S.onboard, canCancel: !first,
    onDone: (ans, plan) => {
      const { nick, ...rest } = ans;
      const fresh = isFresh();
      S.onboard = rest; if (nick) S.nick = nick;
      S.tasks = plan;
      if (fresh) { S.startDate = todayKey(); S.bossHP = {}; }
      S.checkins[mondayOf(todayKey())] = "done";
      S.flags.noSetup = false; viewDay = 0; editMode = false; nextSkip.clear(); setViewQuiet("today"); history.replaceState(null, "", "#today");
      $("app").hidden = false; ensureWeek(); commit(); window.scrollTo(0, 0); playEnter("today");
      sfx("big"); bigBurst(); toast(`Let's go${S.nick ? ", " + S.nick : ""}. Week 1 starts now.`);
    },
    onCancel: () => { $("app").hidden = false; render(); },
    onSkip: first ? nick => { if (nick) S.nick = nick; S.flags.noSetup = true; $("app").hidden = false; commit(); } : null
  });
}

/* ---------- editor ---------- */
const ed = $("editor");
function buildEditor() {
  $("ed-cat").innerHTML = Object.entries(CATS).filter(([k]) => k !== "fun").map(([k, v]) => `<label class="chip"><input type="radio" name="ed-cat" value="${k}" id="ed-cat-${k}"><span><i style="background:${v.c}"></i>${v.label}</span></label>`).join("");
  $("ed-slot").innerHTML = SLOTS.map(([k, v]) => `<label class="chip"><input type="radio" name="ed-slot" value="${k}" id="ed-slot-${k}"><span>${v}</span></label>`).join("");
  $("ed-days").innerHTML = DAY_ORDER.map(d => `<label class="chip"><input type="checkbox" name="ed-days" value="${d}" id="ed-day-${d}"><span>${DAY_SHORT[d]}</span></label>`).join("");
  $("ed-xp").innerHTML = XP_CHOICES.map(x => `<label class="chip"><input type="radio" name="ed-xp" value="${x}" id="ed-xp-${x}"><span>+${x}</span></label>`).join("");
  ed.querySelector('[data-act="ed-close"]').innerHTML = I.x;
}
function openEditor(id) {
  const t = id ? S.tasks.find(x => x.id === id) : { name: "", mini: "", cat: "body", slot: "after", time: "", days: ALL.slice(), xp: 20 };
  if (!t) return;
  editingId = id; confirmDel = false;
  $("ed-title").textContent = id ? "Edit bar" : "New bar";
  $("ed-name").value = t.name; $("ed-mini").value = t.mini; $("ed-time").value = t.time;
  ed.querySelectorAll('[name="ed-cat"]').forEach(i => i.checked = i.value === t.cat);
  ed.querySelectorAll('[name="ed-slot"]').forEach(i => i.checked = i.value === t.slot);
  ed.querySelectorAll('[name="ed-days"]').forEach(i => i.checked = t.days.includes(Number(i.value)));
  const xpPick = XP_CHOICES.reduce((a, b) => Math.abs(b - t.xp) < Math.abs(a - t.xp) ? b : a);
  ed.querySelectorAll('[name="ed-xp"]').forEach(i => i.checked = Number(i.value) === xpPick);
  $("ed-del").hidden = !id; $("ed-del").textContent = "Delete"; $("ed-err").hidden = true; $("ed-swap").hidden = !id;
  if (typeof ed.showModal === "function") { try { ed.showModal(); } catch { ed.setAttribute("open", ""); } } else ed.setAttribute("open", "");
  setTimeout(() => $("ed-name").focus(), 30);
}
function closeEditor() { if (typeof ed.close === "function") ed.close(); else ed.removeAttribute("open"); }
function saveEditor() {
  const name = $("ed-name").value.trim();
  if (!name) { $("ed-err").hidden = false; $("ed-name").focus(); return; }
  const val = n => { const i = ed.querySelector(`[name="${n}"]:checked`); return i ? i.value : null; };
  const data = { name, mini: $("ed-mini").value.trim(), time: $("ed-time").value.trim(), cat: val("ed-cat") || "body", slot: val("ed-slot") || "any",
    xp: Number(val("ed-xp")) || 20, days: [...ed.querySelectorAll('[name="ed-days"]:checked')].map(i => Number(i.value)) };
  if (editingId) {
    const t = S.tasks.find(x => x.id === editingId);
    if (t) { if (t.tpl && t.name !== name) { t.tpl = null; } Object.assign(t, data); }
  } else S.tasks.push({ id: rid("t"), ...data, min: 0, tpl: null, tier: 0, target: 1, unit: "", since: todayKey() });
  const was = !!editingId;
  closeEditor(); commit(); toast(was ? "Bar updated." : "New bar added.");
}

/* ---------- events ---------- */
document.addEventListener("click", ev => {
  const b = ev.target.closest("#app [data-act], #editor [data-act]"); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act !== "buy" && confirmBuy) confirmBuy = null;
  if (act !== "reset" && confirmReset) confirmReset = false;
  if (act !== "wish-buy") confirmWish = null;
  if (act !== "buy-undo") confirmUndo = false;
  if (act !== "swap") confirmSwap = null;
  switch (act) {
    case "full": toggle(id, "f", b); break;
    case "mini": toggle(id, "m", b); break;
    case "next-skip": nextSkip.add(id); renderNext(); break;
    case "swap": if (confirmSwap !== id) { confirmSwap = id; renderNext(); return; } confirmSwap = null; swapQuest(id); break;
    case "ed-swap": { const sid = editingId; closeEditor(); swapQuest(sid); } break;
    case "tab": viewDay = Number(b.dataset.v) || 0; render(); break;
    case "editmode": editMode = !editMode; render(); break;
    case "edit": openEditor(id); break;
    case "new": openEditor(null); break;
    case "ed-close": closeEditor(); break;
    case "ed-del":
      if (!confirmDel) { confirmDel = true; b.textContent = "Tap again to delete"; return; }
      S.tasks = S.tasks.filter(t => t.id !== editingId); closeEditor(); commit(); toast("Bar deleted."); break;
    case "bored": boredOpen = !boredOpen; if (boredOpen) rollBored(); render(); break;
    case "bmin": boredMin = Number(b.dataset.v) || 5; rollBored(); render(); break;
    case "blow": boredLow = !boredLow; rollBored(); render(); break;
    case "reroll": rollBored(); render(); break;
    case "bored-done": doBored(b); break;
    case "bored-close": boredOpen = false; render(); break;
    case "shoptab": shopTab = b.dataset.v === "wish" ? "wish" : "treats"; render(); break;
    case "buy": buy(id); break;
    case "buy-undo": {
      if (!confirmUndo) { confirmUndo = true; render(); return; }
      confirmUndo = false;
      const l = S.buys.pop(); if (!l) { render(); break; }
      S.spent = Math.max(0, S.spent - (Number(l.c) || 0));
      if (l.w && !S.wish.some(x => x.id === l.w.id)) S.wish.push(l.w);
      commit(); sfx("undo"); toast(`Refunded ${l.c} coins.`);
    } break;
    case "treat-del": S.treats = S.treats.filter(t => t.id !== id); commit(); break;
    case "wish-yes": { const w = S.wish.find(x => x.id === id); if (w) { w.ok = true; commit(); toast("Locked in. Keep doing bars."); } } break;
    case "wish-no": {
      const w = S.wish.find(x => x.id === id); if (!w) break;
      S.wish = S.wish.filter(x => x.id !== id);
      const mon = mondayOf(todayKey());
      if (!S.skipWeeks.includes(mon)) { S.bonus += SKIP_BONUS; S.skipWeeks = S.skipWeeks.concat(mon).slice(-12); commit(); sfx("secure"); toast(`Skipped it. +${SKIP_BONUS} coins for not buying.`); }
      else { commit(); toast("Skipped it. Money stays put."); }
    } break;
    case "wish-buy": {
      const w = S.wish.find(x => x.id === id); if (!w) break;
      if (confirmWish !== id) { confirmWish = id; render(); return; }
      confirmWish = null;
      if (coins() < w.need) { render(); toast("Not enough coins yet."); return; }
      S.wish = S.wish.filter(x => x.id !== id); S.spent += w.need;
      S.buys.push({ n: `${w.name} (${w.price} €)`, c: w.need, d: todayKey(), w: { ...w } }); S.buys = S.buys.slice(-20);
      commit(); sfx("big"); bigBurst(); banner("You earned it", w.name, "var(--mint)");
    } break;
    case "wish-del": S.wish = S.wish.filter(x => x.id !== id); commit(); break;
    case "ci-toggle": if (b.checked) ciOff.delete(id); else ciOff.add(id); return;
    case "ci-apply": applyCheckin(); break;
    case "ci-skip": { const ci = checkinData(); if (ci) { S.checkins[ci.mon] = "skipped"; commit(); } } break;
    case "setup": startSetup(false); break;
    case "setup-no": S.flags.noSetup = true; commit(); break;
    case "mq-edit": mqEditing = true; render(); { const i = $("mq-input"); if (i) { i.focus(); i.select(); } } break;
    case "motion": motionOn = !motionOn; lsSet("rtb-motion", motionOn ? "on" : "off"); document.documentElement.classList.toggle("motion-off", !motionOn); render(); toast(motionOn ? "Animations on." : "Animations off."); break;
    case "sound": soundOn = !soundOn; lsSet(LS_SOUND, soundOn ? "on" : "off"); render(); if (soundOn) sfx("pop"); break;
    case "nav": setView(b.dataset.v); break;
    case "export": exportSave(); break;
    case "import": $("import-file").value = ""; $("import-file").click(); break;
    case "import-yes": if (pendingImport) { S = pendingImport.data; pendingImport = null; prune(); ensureWeek(); commit(); toast("Progress imported."); } break;
    case "import-no": pendingImport = null; renderSettings(); break;
    case "signout": if (opts.signOut) opts.signOut(); break;
    case "reset":
      if (!confirmReset) { confirmReset = true; render(); return; }
      confirmReset = false;
      Object.assign(S, { log: {}, banked: { xp: 0, boss: 0 }, spent: 0, buys: [], bonus: 0, xpBonus: 0, skipWeeks: [], bossHP: {}, bossWins: {}, checkins: {},
        startDate: todayKey(), flags: { noSetup: S.flags.noSetup } });
      ensureWeek(); commit(); toast("Fresh start. Level 1."); break;
  }
});
ed.addEventListener("click", ev => { if (ev.target === ed) closeEditor(); });
document.addEventListener("submit", ev => {
  const f = ev.target;
  if (!f.closest("#app") && !f.closest("#editor")) return;
  ev.preventDefault();
  if (f.id === "ed-form") saveEditor();
  else if (f.id === "mq-form") { S.mainQuest = $("mq-input").value.trim().slice(0, 90); mqEditing = false; commit(); }
  else if (f.id === "wi-form") {
    const n = $("wi-name").value.trim(), pr = Math.round(parseFloat(String($("wi-price").value).replace(",", ".")));
    if (!n || !(pr > 0)) { toast("Name + price in €, please."); return; }
    const price = Math.min(100000, pr);
    S.wish.push({ id: rid("w"), name: n.slice(0, 60), price, need: price * XP_PER_EUR, added: Date.now(), ok: false });
    $("wi-name").value = ""; $("wi-price").value = "";
    commit(); toast(`Added. ${price * XP_PER_EUR} coins + 72 h wait.`);
  } else if (f.id === "tr-form") {
    const n = $("tr-name").value.trim(), c = parseInt($("tr-cost").value, 10);
    if (!n || !(c > 0)) { toast("Name + coin cost, please."); return; }
    S.treats.push({ id: rid("r"), name: n.slice(0, 60), cost: Math.min(99999, c) });
    $("tr-name").value = ""; $("tr-cost").value = ""; commit(); toast("Treat added.");
  }
});
function checkDay() {
  const t = todayKey();
  if (t !== lastToday) { lastToday = t; boredOpen = false; nextSkip.clear(); if (started && ensureWeek()) commit(); else render(); }
}
setInterval(checkDay, 30000);
setInterval(() => { if (started && S.wish.length && !document.hidden && shopTab === "wish") renderShop(); }, 60000);
addEventListener("resize", () => { if (raf) sizeFx(); });

/* ---------- export / import ---------- */
function exportSave() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `raise-the-bar-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("import-file").addEventListener("change", async ev => {
  const file = ev.target.files && ev.target.files[0]; if (!file) return;
  try {
    const r = normalize(JSON.parse(await file.text()));
    if (!r) throw new Error("bad file");
    pendingImport = { name: file.name, data: r }; setView("more"); renderSettings();
  } catch { toast("That file isn't a Raise the Bar save."); }
});

/* ---------- account + sync ---------- */
let started = false, user = null, store = null, opts = {}, pendingImport = null;
function setSync(s) { if (sync !== s) { sync = s; if (started && $("onboard").hidden) renderSettings(); } }
function adopt(r) { S = r; prune(); ensureWeek(); lsSet(LS_KEY, JSON.stringify(S)); render(); }
async function pullRemote() {
  if (!store) return;
  try { const d = await store.pull(); const r = d ? normalize(d) : null; if (r && r.updatedAt > S.updatedAt) { adopt(r); setSync("synced"); } } catch {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { pullRemote(); checkDay(); } });

export async function startApp(u, options = {}) {
  user = u; opts = options; pendingImport = null; nextSkip = new Set();
  LS_KEY = "rtb-save:" + u.id;
  let local = null; try { local = normalize(JSON.parse(lsGet(LS_KEY))); } catch {}
  S = local || defaultState();
  sync = options.createSync ? "syncing" : "local";

  let pulled = null;
  if (options.createSync) {
    store = options.createSync({
      userId: u.id, getState: () => S, onStatus: setSync,
      onRemote: d => { const r = normalize(d); if (r && r.updatedAt > S.updatedAt) adopt(r); }
    });
    pulled = store.pull().then(d => ({ d }), () => ({ err: true }));
    if (!local) {
      // New device: wait for the account's save before deciding whether to show setup.
      const res = await Promise.race([pulled, new Promise(r => setTimeout(() => r({ timeout: true }), 6000))]);
      if (res.d) { const r = normalize(res.d); if (r) S = r; }
    }
  }
  if (!S.nick) { const meta = u.user_metadata || {}; const n = firstName(meta.name || meta.full_name || ""); if (n) S.nick = n; }
  prune();
  const weekChanged = ensureWeek();
  lsSet(LS_KEY, JSON.stringify(S));
  started = true;
  $("boot").hidden = true;

  view = "";
  setViewQuiet(location.hash.slice(1));
  if (isFresh() && !S.flags.noSetup) startSetup(true);
  else { $("app").hidden = false; render(); playEnter(view); }

  if (store) {
    store.listen();
    // Reconcile: newer side wins. Only push when this device holds the newer state.
    pulled.then(res => {
      if (res.err) { setSync("error"); return; }
      const r = res.d ? normalize(res.d) : null;
      if (r && r.updatedAt > S.updatedAt) { adopt(r); setSync("synced"); }
      else if (!r || S.updatedAt > r.updatedAt || weekChanged) { if (!S.updatedAt || weekChanged) S.updatedAt = Date.now(); lsSet(LS_KEY, JSON.stringify(S)); store.push(); }
      else setSync("synced");
    });
  }
}
export function stopApp() {
  if (store) store.stop();
  store = null; started = false; user = null; boredOpen = false; editMode = false;
  closeOnboarding();
  $("app").hidden = true;
}

buildEditor();
initFx({ sfx, burst, motion: () => motionOn });
