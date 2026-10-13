import { TEMPLATES, TPL, MINUTES } from "./content.js";
import { ALL, WEEKDAYS, DAY_ORDER, rid, shuffle, clamp, todayKey } from "./util.js";

/*
  Turns onboarding answers into a first-week plan.
  answers: { goals:[area], specific:{area:key}, level:0|1|2, blocker, difficulty, minutes, days:[0-6], times:[slot] }
*/
const TIER_OF = { easy: 0, normal: 1, hard: 2 };
const COUNT_FOR = { 5: 5, 15: 6, 30: 7, 60: 8 };

export function targetTier(a) {
  return clamp((TIER_OF[a.difficulty] ?? 1) + (Number(a.level) - 1 || 0), 0, 2);
}
/* Week one starts one step easier than the target, so the first wins come quickly. */
export function startTier(a) { return Math.max(0, targetTier(a) - 1); }

export function tierInfo(tpl, tier) {
  const t = tpl.tiers[clamp(tier, 0, 2)];
  return { name: t[0], mini: t[1], min: t[2], xp: t[3] };
}

function orderedDays(days) {
  const d = days && days.length ? days : ALL;
  return DAY_ORDER.filter(x => d.includes(x));
}
export function pickDays(freq, userDays) {
  const ud = orderedDays(userDays);
  if (freq === "daily") return ud.slice();
  if (freq === "weekdays") { const w = ud.filter(d => WEEKDAYS.includes(d)); return w.length ? w : ud.slice(); }
  if (freq === "3x") return ud.length <= 3 ? ud.slice() : [...new Set([ud[0], ud[Math.floor(ud.length / 2)], ud[ud.length - 1]])];
  const want = { sat: 6, sun: 0, mon: 1 }[freq];
  if (ud.includes(want)) return [want];
  return [freq === "mon" ? ud[0] : ud[ud.length - 1]];
}
export function pickSlot(tpl, times) {
  if (!tpl.flex) return tpl.slot;
  if (tpl.slot === "any") return "any";
  const prefs = ["morning", "after", "evening"].filter(s => (times || []).includes(s));
  if (!prefs.length || prefs.includes(tpl.slot)) return tpl.slot;
  return prefs[prefs.length - 1];
}

export function taskFrom(tpl, tier, target, a) {
  const i = tierInfo(tpl, tier);
  return {
    id: rid(tpl.id + "-"), name: i.name, mini: i.mini, cat: tpl.cat, slot: pickSlot(tpl, a.times), time: "",
    days: pickDays(tpl.freq, a.days), xp: i.xp, min: i.min, tpl: tpl.id, tier, target, unit: tpl.unit, since: todayKey()
  };
}
export const dailyMinutes = t => (t.min > 1 ? t.min : 0) * t.days.length / 7;

function score(tpl, a) {
  const specs = Object.values(a.specific || {});
  let s = Math.random() * 1.5;
  if (tpl.serves.some(x => specs.includes(x))) s += 3;
  if (a.goals.includes(tpl.area)) s += 1;
  const minT0 = tpl.tiers[0][2];
  if (a.blocker === "phone" && (tpl.tags.includes("phone") || tpl.serves.includes("screen"))) s += 2;
  if (a.blocker === "time" && minT0 <= 5) s += 1;
  if (a.blocker === "forget" && (tpl.slot === "morning" || tpl.slot === "evening") && !tpl.flex) s += 1;
  if (a.blocker === "motivation" && minT0 <= 5) s += 1;
  return s;
}

export function generatePlan(a, keep = []) {
  const count = COUNT_FOR[a.minutes] || 6;
  const budget = (MINUTES.includes(a.minutes) ? a.minutes : 15) * 1.15;
  const t0 = startTier(a), tgt = targetTier(a);
  const plan = keep.slice();
  const used = new Set(plan.map(t => t.tpl));
  let mins = plan.reduce((s, t) => s + dailyMinutes(t), 0);

  const tryAdd = tpl => {
    if (used.has(tpl.id) || plan.length >= count) return false;
    for (const tier of [t0, 0]) {
      const task = taskFrom(tpl, tier, tgt, a);
      const m = dailyMinutes(task);
      if (mins + m <= budget || m === 0) { plan.push(task); used.add(tpl.id); mins += m; return true; }
      if (tier === 0) break;
    }
    return false;
  };

  const pools = a.goals.map(area =>
    TEMPLATES.filter(t => t.area === area && !t.u).map(t => ({ t, s: score(t, a) })).sort((x, y) => y.s - x.s).map(x => x.t));
  let progress = true;
  while (plan.length < count && progress) {
    progress = false;
    for (const pool of pools) {
      while (pool.length) { const t = pool.shift(); if (tryAdd(t)) { progress = true; break; } }
      if (plan.length >= count) break;
    }
  }
  // Optional universal habits when there's room.
  for (const t of shuffle(TEMPLATES.filter(t => t.u))) { if (plan.length >= count) break; tryAdd(t); }
  // Never fewer than five: fill with the cheapest quests from any chosen area.
  if (plan.length < 5) {
    const cheap = TEMPLATES.filter(t => !used.has(t.id) && (a.goals.includes(t.area) || t.u)).sort((x, y) => x.tiers[0][2] - y.tiers[0][2]);
    for (const t of cheap) { if (plan.length >= 5) break; plan.push(taskFrom(t, 0, tgt, a)); used.add(t.id); }
  }
  return plan;
}

/* Replace one quest with another fitting template (same area first). */
export function swapTask(task, plan, a, avoid = []) {
  const used = new Set(plan.map(t => t.tpl).concat(avoid, task.tpl || []));
  const area = task.tpl && TPL[task.tpl] ? TPL[task.tpl].area : (a.goals[0] || "fit");
  const specs = Object.values(a.specific || {});
  const budget = (MINUTES.includes(a.minutes) ? a.minutes : 15) * 1.15;
  const room = budget - plan.filter(t => t.id !== task.id).reduce((s, t) => s + dailyMinutes(t), 0);
  const tier = task.tier ?? startTier(a);
  const fits = t => { const m = tierInfo(t, tier).min; return (m > 1 ? m : 0) * pickDays(t.freq, a.days).length / 7 <= Math.max(room, 0); };
  const rank = t => (t.area === area ? 3 : 0) + (t.serves.some(s => specs.includes(s)) ? 2 : 0) + (fits(t) ? 4 : 0);
  const options = shuffle(TEMPLATES.filter(t => !used.has(t.id) && (t.area === area || t.u))).sort((x, y) => rank(y) - rank(x));
  const tpl = options[0] || shuffle(TEMPLATES.filter(t => !used.has(t.id) && a.goals.includes(t.area)))[0];
  if (!tpl) return null;
  return taskFrom(tpl, task.tier ?? startTier(a), task.target ?? targetTier(a), a);
}

/* Apply a new tier to an existing template task, keeping its id, days and slot. */
export function retier(task, tier) {
  const tpl = TPL[task.tpl]; if (!tpl) return task;
  const i = tierInfo(tpl, tier);
  return { ...task, name: i.name, mini: i.mini, min: i.min, xp: i.xp, tier };
}
