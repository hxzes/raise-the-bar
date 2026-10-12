import { supabase } from "./supabase.js";

/* Log in / sign up / forgot password / set new password. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let mode = "login";          // login | signup | forgot | recover
let msg = { text: "", err: false };
let busy = false;
let draft = { name: "", email: "" };

const GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const BOSS = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 36L10 10l24 14zM80 36L90 10 66 24z" style="fill:var(--bubble);stroke:var(--ink)" stroke-width="4" stroke-linejoin="round"/><rect x="9" y="22" width="82" height="70" rx="31" style="fill:var(--bubble);stroke:var(--ink)" stroke-width="4.5"/><circle cx="36" cy="53" r="9.5" style="fill:#fff;stroke:var(--ink)" stroke-width="4"/><circle cx="64" cy="53" r="9.5" style="fill:#fff;stroke:var(--ink)" stroke-width="4"/><circle cx="38" cy="55" r="4.2" style="fill:var(--ink)"/><circle cx="62" cy="55" r="4.2" style="fill:var(--ink)"/><path d="M24 37l19 8M76 37l-19 8" style="stroke:var(--ink);fill:none" stroke-width="5.5" stroke-linecap="round"/><path d="M33 77l5.6-5 5.6 5 5.6-5 5.6 5 5.6-5 5.6 5" style="stroke:var(--ink);fill:none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function mountAuth() {
  $("boot").hidden = true;
  $("app").hidden = true;
  $("auth").hidden = false;
  render();
}
export function unmountAuth() {
  $("auth").hidden = true;
  $("auth").innerHTML = "";
}
export function showRecovery() {
  mode = "recover"; msg = { text: "", err: false };
  mountAuth();
}

function render() {
  const tabs = (mode === "login" || mode === "signup") ? `
    <div class="seg" role="group" aria-label="Account">
      <button type="button" data-mode="login" aria-pressed="${mode === "login"}">Log in</button>
      <button type="button" data-mode="signup" aria-pressed="${mode === "signup"}">Sign up</button>
    </div>` : "";
  const google = (mode === "login" || mode === "signup") ? `
    <button type="button" class="btn google wide" data-auth="google" ${busy ? "disabled" : ""}>${GOOGLE}Continue with Google</button>
    <div class="or">or with email</div>` : "";

  let title, fields, submit, links = "";
  if (mode === "login") {
    title = "Welcome back";
    fields = emailField() + passwordField("current-password");
    submit = "Log in";
    links = `<button type="button" class="linkbtn" data-mode="forgot">Forgot password?</button>`;
  } else if (mode === "signup") {
    title = "Create account";
    fields = `<div class="field"><label for="au-name">Name (optional)</label><input class="inp" id="au-name" autocomplete="given-name" maxlength="24" value="${esc(draft.name)}" placeholder="What should we call you?"></div>`
      + emailField() + passwordField("new-password");
    submit = "Create account";
  } else if (mode === "forgot") {
    title = "Reset password";
    fields = emailField();
    submit = "Send reset link";
    links = `<button type="button" class="linkbtn" data-mode="login">Back to log in</button>`;
  } else {
    title = "New password";
    fields = passwordField("new-password", "New password");
    submit = "Save password";
  }

  $("auth").innerHTML = `<div class="auth">
    <h1 class="logo"><small>Raise the</small>Bar</h1>
    <p class="auth-tag">Habits, but make it a game. Tick off daily bars, earn coins, beat a new boss every week.</p>
    <div class="card auth-card">
      ${tabs}
      <h2>${title}</h2>
      ${google}
      <form id="auth-form" novalidate>
        ${fields}
        <button type="submit" class="btn mint wide" ${busy ? "disabled" : ""}>${busy ? "One sec…" : submit}</button>
      </form>
      <p class="auth-msg ${msg.err ? "err" : ""}" role="status">${esc(msg.text)}</p>
      ${links ? `<div class="auth-links">${links}</div>` : ""}
    </div>
    <div class="auth-peek">${BOSS}<span>You won't.</span></div>
  </div>`;
}
function emailField() {
  return `<div class="field"><label for="au-email">Email</label><input class="inp" id="au-email" type="email" autocomplete="email" inputmode="email" value="${esc(draft.email)}" placeholder="you@example.com"></div>`;
}
function passwordField(ac, label = "Password") {
  return `<div class="field"><label for="au-pass">${label}</label><input class="inp" id="au-pass" type="password" autocomplete="${ac}" minlength="6" placeholder="At least 6 characters"></div>`;
}
function keepDraft() {
  if ($("au-email")) draft.email = $("au-email").value.trim();
  if ($("au-name")) draft.name = $("au-name").value.trim();
}
function say(text, err = false) { msg = { text, err }; busy = false; render(); }

$("auth").addEventListener("click", async ev => {
  const m = ev.target.closest("[data-mode]");
  if (m) { keepDraft(); mode = m.dataset.mode; msg = { text: "", err: false }; render(); return; }
  const g = ev.target.closest('[data-auth="google"]');
  if (g) {
    busy = true; render();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } });
    if (error) say(error.message, true);
  }
});

$("auth").addEventListener("submit", async ev => {
  ev.preventDefault();
  keepDraft();
  const email = draft.email, pass = $("au-pass") ? $("au-pass").value : "";
  if (mode !== "recover" && !/^\S+@\S+\.\S+$/.test(email)) return say("Enter a valid email.", true);
  if (mode !== "forgot" && pass.length < 6) return say("Password needs at least 6 characters.", true);
  busy = true; render();

  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) say(error.message, true);
  } else if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { name: draft.name }, emailRedirectTo: location.origin }
    });
    if (error) say(error.message, true);
    else if (!data.session) { mode = "login"; say(`Check ${email} and tap the confirmation link, then log in.`); }
  } else if (mode === "forgot") {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (error) say(error.message, true);
    else say("If that email has an account, a reset link is on its way.");
  } else {
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) say(error.message, true);
    else { say("Password saved. Loading your bars…"); setTimeout(() => location.replace("/"), 700); }
  }
});
