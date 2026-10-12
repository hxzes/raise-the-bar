import "./style.css";
import { supabase } from "./supabase.js";
import { createSync } from "./sync.js";
import { mountAuth, unmountAuth, showRecovery } from "./auth.js";
import { startApp, stopApp } from "./app.js";

const boot = document.getElementById("boot");
let currentId = null;
let recovering = /type=recovery/.test(location.hash);

function enter(user) {
  if (recovering || !user || user.id === currentId) return;
  currentId = user.id;
  boot.hidden = true;
  unmountAuth();
  startApp(user, { createSync, signOut: () => supabase.auth.signOut() });
}
function leave() {
  currentId = null;
  stopApp();
  mountAuth();
}

async function start() {
  if (!supabase) {
    // No keys in .env: run locally without accounts.
    boot.hidden = true;
    startApp({ id: "local", email: "", user_metadata: {} }, {});
    return;
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { recovering = true; currentId = null; stopApp(); showRecovery(); return; }
    if (event === "SIGNED_OUT") { leave(); return; }
    // Defer: calling Supabase inside this callback can deadlock the auth client.
    if (session && session.user) setTimeout(() => enter(session.user), 0);
  });
  const { data } = await supabase.auth.getSession();
  if (data.session) enter(data.session.user);
  else if (!recovering) mountAuth();
}

start();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
