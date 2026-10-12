/* Big moments: boss defeat cutscene, level up, banners, boss hit HUD, number count-ups. */
let ctx = { sfx: () => {}, burst: () => {}, motion: () => true };
export function initFx(c) { ctx = { ...ctx, ...c }; }

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2.2"/><circle cx="12" cy="12" r="5.2" style="fill:none;stroke:var(--ink)" stroke-width="2"/></svg>';
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M12 12v4M8 21h8l-1-5H9z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>';
const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2L4.5 13.5h6.5L10 22l9-11.5h-6.5z" style="fill:var(--sun);stroke:var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>';

/* One big moment at a time. */
const queue = []; let busy = false;
function enqueue(fn) { queue.push(fn); if (!busy) next(); }
function next() { const fn = queue.shift(); if (!fn) { busy = false; return; } busy = true; fn(() => setTimeout(next, 120)); }
export const fxBusy = () => busy;

/* Stamp band across the screen: "DAY SECURED", "FIRST W!" */
export function banner(title, sub, color = "var(--sun)") {
  enqueue(done => {
    const root = document.createElement("div");
    root.className = "bn"; root.setAttribute("aria-hidden", "true");
    root.innerHTML = `<div class="bn-band" style="--c:${color}"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
    document.body.appendChild(root);
    const t = ctx.motion() ? 1700 : 1200;
    setTimeout(() => { root.remove(); done(); }, t);
  });
}

/* Full-screen level up. */
export function levelUp(level, rank) {
  enqueue(done => {
    const root = document.createElement("div");
    root.className = "lu"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", `Level ${level}`);
    root.innerHTML = `<div class="fx-rays"></div><div class="lu-card">
      <div class="lu-badge"><small>LVL</small><b>${level}</b></div>
      <h2 class="lu-title">Level up!</h2><p class="lu-rank">${esc(rank)}</p>
      <button class="btn mint wide lu-ok">Let's go</button></div>`;
    document.body.appendChild(root);
    ctx.sfx("big");
    setTimeout(() => ctx.burst(innerWidth / 2, innerHeight * 0.4, 70, 1.4), 250);
    let closed = false;
    const close = () => { if (closed) return; closed = true; root.classList.add("out"); setTimeout(() => { root.remove(); done(); }, 280); };
    root.querySelector(".lu-ok").onclick = close;
    root.addEventListener("click", e => { if (e.target === root) close(); });
    setTimeout(() => root.querySelector(".lu-ok").focus(), 60);
    setTimeout(close, 4200);
  });
}

/*
  Boss defeat cutscene: boss drops in and talks, takes three hits, goes KO,
  spins away in a poof, then the rewards card slams in. Tap Skip to jump to rewards.
*/
export function bossDefeat(o) {
  enqueue(done => {
    const root = document.createElement("div");
    root.className = "cs"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", `${o.name} defeated`);
    root.innerHTML = `<div class="fx-rays"></div><div class="cs-flash"></div>
      <div class="cs-stage">
        <div class="cs-bubble">“${esc(o.line)}”</div>
        <div class="cs-boss">${o.svgAlive}</div>
        <div class="cs-name">${esc(o.name)}</div>
        <div class="cs-hp"><i style="width:${o.fromPct}%"></i></div>
      </div>
      <div class="cs-result">
        <span class="cs-eyebrow">Weekly boss</span>
        <h2 class="cs-title">Boss defeated!</h2>
        <p class="cs-sub">${esc(o.name)} is down for the week.</p>
        <div class="cs-rewards">
          <span class="r" style="--i:0">${COIN}+${o.coins} coins</span>
          <span class="r" style="--i:1">${BOLT}+${o.xp} XP</span>
          <span class="r" style="--i:2">${TROPHY}Trophy</span>
        </div>
        <button class="btn mint wide cs-collect">Collect</button>
      </div>
      <button class="cs-skip">Skip</button>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    const timers = []; const at = (ms, f) => timers.push(setTimeout(f, ms));
    let shown = false, closed = false;

    const showResult = () => {
      if (shown) return; shown = true;
      timers.forEach(clearTimeout);
      q(".cs-boss").innerHTML = o.svgDead; q(".cs-hp i").style.width = "0%";
      root.classList.add("in", "won");
      ctx.sfx("big");
      ctx.burst(innerWidth / 2, innerHeight * 0.42, 90, 1.5);
      setTimeout(() => q(".cs-collect").focus(), 60);
    };
    const close = () => {
      if (closed) return; closed = true;
      timers.forEach(clearTimeout);
      root.classList.add("out");
      setTimeout(() => { root.remove(); done(); }, 300);
    };
    q(".cs-skip").onclick = showResult;
    q(".cs-collect").onclick = close;
    if (!ctx.motion()) { showResult(); return; }

    const dmg = big => {
      const s = document.createElement("span");
      s.className = "cs-dmg" + (big ? " big" : "");
      s.textContent = big ? "K.O.!" : "-" + (12 + Math.floor(Math.random() * 40));
      s.style.left = (30 + Math.random() * 40) + "%";
      q(".cs-stage").appendChild(s); setTimeout(() => s.remove(), 1000);
    };
    const hit = (pct, big) => {
      const b = q(".cs-boss");
      b.classList.remove("hurt"); void b.offsetWidth; b.classList.add("hurt");
      root.classList.remove("flash"); void root.offsetWidth; root.classList.add("flash");
      q(".cs-hp i").style.width = pct + "%";
      dmg(big); ctx.sfx(big ? "crit" : "hit");
    };
    requestAnimationFrame(() => root.classList.add("in"));
    at(650, () => { root.classList.add("talk"); ctx.sfx("pop"); });
    at(1700, () => { root.classList.remove("talk"); hit(o.fromPct * 0.55); });
    at(2100, () => hit(o.fromPct * 0.22));
    at(2550, () => { hit(0, true); q(".cs-boss").innerHTML = o.svgDead; root.classList.add("ko"); });
    at(3250, () => { root.classList.add("die"); ctx.sfx("poof"); ctx.burst(innerWidth / 2, innerHeight * 0.38, 60, 1.2); });
    at(4000, showResult);
  });
}

/* Small boss HUD that pops up when a quest hits the boss. */
let hud = null, hudTimer = 0;
export function bossHit(o) {
  if (!hud) {
    hud = document.createElement("div");
    hud.className = "hud"; hud.setAttribute("aria-hidden", "true");
    document.body.appendChild(hud);
  }
  hud.innerHTML = `<div class="hud-art">${o.svg}</div>
    <div class="hud-meta"><b>${esc(o.name)}</b><div class="meter hp"><i style="width:${o.fromPct}%"></i></div><small>HP ${o.left} / ${o.total}</small></div>
    <span class="hud-dmg">-${o.dmg}</span>`;
  hud.classList.remove("show", "hit"); void hud.offsetWidth; hud.classList.add("show", "hit");
  requestAnimationFrame(() => requestAnimationFrame(() => { const i = hud.querySelector(".meter i"); if (i) i.style.width = Math.max(2, o.toPct) + "%"; }));
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => hud && hud.classList.remove("show"), 1700);
}

/* Animate a number inside an element. */
export function countUp(el, from, to, ms = 650) {
  if (!el) return;
  if (!ctx.motion() || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
