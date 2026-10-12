import { AREAS, CATS, LEVELS_START, BLOCKERS, DIFFICULTY, MINUTES, TIMES } from "./content.js";
import { generatePlan, swapTask, dailyMinutes } from "./plan.js";
import { ALL, DAY_ORDER, DAY_SHORT, esc, daysLabel } from "./util.js";

/*
  Six short screens: name → goals → specific goals → starting point → difficulty & time → first-week plan.
  openOnboarding({ nick, prev, canCancel, onDone(answers, plan), onCancel(), onSkip() })
*/
const $ = id => document.getElementById(id);
const STEPS = 6;
let step = 0, A = null, plan = [], opts = {}, shownStep = -1, picked = "";

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SLOT_LABEL = { morning: "Morning", after: "Afternoon", evening: "Evening", any: "Anytime" };

export function openOnboarding(o) {
  opts = o;
  const p = o.prev || {};
  A = {
    nick: o.nick || "",
    goals: (p.goals || []).slice(),
    specific: { ...(p.specific || {}) },
    level: p.level ?? null,
    blocker: p.blocker || null,
    difficulty: p.difficulty || null,
    minutes: p.minutes || 15,
    days: (p.days && p.days.length ? p.days : ALL).slice(),
    times: (p.times && p.times.length ? p.times : ["after", "evening"]).slice()
  };
  step = 0; plan = []; shownStep = -1;
  $("onboard").hidden = false;
  render();
  window.scrollTo(0, 0);
}
export function closeOnboarding() { $("onboard").hidden = true; $("onboard").innerHTML = ""; }

function tile(kind, v, title, sub, color, on, extra = "") {
  return `<button type="button" class="ob-tile ${picked === kind + ":" + v ? "picked" : ""}" style="--c:${color}" data-k="${kind}" data-v="${esc(v)}" aria-pressed="${on}">
    <span class="ob-blob" aria-hidden="true"></span><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}${extra}
    <i class="ob-tick" aria-hidden="true">${CHECK}</i></button>`;
}
function chip(kind, v, label, on) {
  return `<button type="button" class="ob-chip ${picked === kind + ":" + v ? "picked" : ""}" data-k="${kind}" data-v="${esc(v)}" aria-pressed="${on}">${label}</button>`;
}

function render() {
  let title = "", sub = "", body = "", next = "Next", canNext = true;
  if (step === 0) {
    title = "Hey! What should we call you?";
    sub = "This name shows up in your greeting.";
    body = `<div class="card ob-card"><label class="ob-label" for="ob-nick">Your name</label>
      <input class="inp" id="ob-nick" maxlength="24" autocomplete="given-name" value="${esc(A.nick)}" placeholder="Your name"></div>`;
  } else if (step === 1) {
    title = "What do you want to level up?";
    sub = "Pick up to 3.";
    body = `<div class="ob-tiles">${AREAS.map(a => tile("goal", a.k, a.label, a.sub, CATS[a.cat].c, A.goals.includes(a.k))).join("")}</div>`;
    canNext = A.goals.length > 0;
  } else if (step === 2) {
    title = "Get specific";
    sub = "One pick per area.";
    body = A.goals.map(k => {
      const a = AREAS.find(x => x.k === k);
      return `<div class="card ob-card ob-group" style="--c:${CATS[a.cat].c}"><h3>${a.q}</h3>
        <div class="ob-chips">${a.specifics.map(([v, l]) => chip("spec-" + k, v, l, A.specific[k] === v)).join("")}</div></div>`;
    }).join("");
    canNext = A.goals.every(k => A.specific[k]);
  } else if (step === 3) {
    title = "Where are you starting from?";
    sub = "So the first quests aren't too easy or too hard.";
    body = `<div class="ob-tiles one">${LEVELS_START.map(([v, t, s]) => tile("level", v, t, s, "var(--sky)", String(A.level) === v)).join("")}</div>
      <div class="card ob-card"><h3>What usually stops you? <small>(optional)</small></h3>
      <div class="ob-chips">${BLOCKERS.map(([v, l]) => chip("blocker", v, l, A.blocker === v)).join("")}</div></div>`;
    canNext = A.level !== null;
  } else if (step === 4) {
    title = "How hard, and how much time?";
    body = `<div class="ob-tiles three">${DIFFICULTY.map(([v, t, s, c]) => tile("diff", v, t, s, c, A.difficulty === v)).join("")}</div>
      <div class="card ob-card"><h3>Time per day</h3><div class="ob-chips">${MINUTES.map(m => chip("min", m, m + " min", A.minutes === m)).join("")}</div></div>
      <div class="card ob-card"><h3>Which days?</h3><div class="ob-chips">${DAY_ORDER.map(d => chip("day", d, DAY_SHORT[d], A.days.includes(d))).join("")}</div></div>
      <div class="card ob-card"><h3>When do you have time?</h3><div class="ob-chips">${TIMES.map(([v, l]) => chip("time", v, l, A.times.includes(v))).join("")}</div></div>`;
    canNext = !!A.difficulty && A.days.length > 0 && A.times.length > 0;
    next = "Build my quests";
  } else {
    const perDay = Math.round(plan.reduce((s, t) => s + dailyMinutes(t), 0));
    title = "Your first week";
    sub = `${plan.length} quests · about ${Math.max(perDay, 2)} min a day. Week one starts easy, then levels up with you.`;
    body = `<div class="ob-plan">${plan.map(t => `
      <div class="ob-row" style="--c:${(CATS[t.cat] || CATS.mind).c}">
        <i class="ob-stripe" aria-hidden="true"></i>
        <div class="ob-row-body"><b>${esc(t.name)}</b>
          <span>${daysLabel(t.days)} · ${SLOT_LABEL[t.slot] || "Anytime"} · ~${Math.max(1, t.min)} min</span>
          <span class="ob-rew">+${t.xp} XP · +${t.xp} coins${t.mini ? ` · lazy: ${esc(t.mini)}` : ""}</span></div>
        <div class="ob-row-btns">
          <button type="button" class="iconbtn" data-k="swap" data-v="${esc(t.id)}" aria-label="Replace ${esc(t.name)}">${SWAP}</button>
          <button type="button" class="iconbtn" data-k="drop" data-v="${esc(t.id)}" aria-label="Remove ${esc(t.name)}">${X}</button>
        </div></div>`).join("") || `<div class="card ob-card">All removed. Shuffle for a new set.</div>`}</div>
      <button type="button" class="btn white" data-k="shuffle">${SWAP}Shuffle all</button>`;
    canNext = plan.length > 0;
    next = "Start week 1";
  }

  const pct = Math.round((step + 1) / STEPS * 100);
  const showBack = step > 0 || opts.canCancel;
  const enter = shownStep !== step; shownStep = step;
  $("onboard").innerHTML = `<div class="ob ${enter ? "enter" : ""}">
    <div class="ob-top">
      ${showBack ? `<button type="button" class="iconbtn" data-k="back" aria-label="Back">${BACK}</button>` : `<span class="ob-logo">Raise the Bar</span>`}
      <div class="ob-prog" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      <span class="ob-step">${step + 1}/${STEPS}</span>
    </div>
    <h1 class="ob-title">${title}</h1>${sub ? `<p class="ob-sub">${sub}</p>` : ""}
    ${body}
    <button type="button" class="btn mint wide" data-k="next" ${canNext ? "" : "disabled"}>${next}</button>
    ${step === 0 && opts.onSkip ? `<button type="button" class="linkbtn on-blue-link" data-k="skip">Skip setup, give me starter quests</button>` : ""}
  </div>`;
  if (enter) [...$("onboard").firstElementChild.children].forEach((c, i) => c.style.setProperty("--d", i));
  picked = "";
  if (step === 0) { const i = $("ob-nick"); if (i && !A.nick) i.focus(); }
}

function flip(arr, v) { return arr.includes(v) ? arr.filter(x => x !== v) : arr.concat(v); }

document.addEventListener("click", ev => {
  if ($("onboard").hidden) return;
  const b = ev.target.closest("#onboard [data-k]"); if (!b) return;
  const k = b.dataset.k, v = b.dataset.v;
  picked = k + ":" + v;
  if (step === 0 && $("ob-nick")) A.nick = $("ob-nick").value.trim().slice(0, 24);

  if (k === "goal") {
    if (!A.goals.includes(v) && A.goals.length >= 3) { b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); return; }
    A.goals = flip(A.goals, v);
    if (!A.goals.includes(v)) delete A.specific[v];
  } else if (k.startsWith("spec-")) A.specific[k.slice(5)] = v;
  else if (k === "level") A.level = Number(v);
  else if (k === "blocker") A.blocker = A.blocker === v ? null : v;
  else if (k === "diff") A.difficulty = v;
  else if (k === "min") A.minutes = Number(v);
  else if (k === "day") A.days = flip(A.days, Number(v));
  else if (k === "time") A.times = flip(A.times, v);
  else if (k === "swap") { const i = plan.findIndex(t => t.id === v); if (i >= 0) { const n = swapTask(plan[i], plan, A); if (n) plan[i] = n; } }
  else if (k === "drop") plan = plan.filter(t => t.id !== v);
  else if (k === "shuffle") plan = generatePlan(A);
  else if (k === "skip") { closeOnboarding(); opts.onSkip && opts.onSkip(A.nick); return; }
  else if (k === "back") {
    if (step === 0) { closeOnboarding(); opts.onCancel && opts.onCancel(); return; }
    step--; render(); window.scrollTo(0, 0); return;
  } else if (k === "next") {
    if (step === 4) plan = generatePlan(A);
    if (step === 5) { closeOnboarding(); opts.onDone(answers(), plan.map(t => ({ ...t }))); return; }
    step++; render(); window.scrollTo(0, 0); return;
  }
  render();
});
document.addEventListener("keydown", ev => {
  if ($("onboard").hidden || ev.key !== "Enter" || ev.target.id !== "ob-nick") return;
  ev.preventDefault(); A.nick = ev.target.value.trim().slice(0, 24); step = 1; render();
});

function answers() {
  return { v: 2, done: true, goals: A.goals, specific: A.specific, level: A.level, blocker: A.blocker,
    difficulty: A.difficulty, minutes: A.minutes, days: A.days, times: A.times, nick: A.nick, at: Date.now() };
}
