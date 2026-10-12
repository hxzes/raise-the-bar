import { supabase } from "./supabase.js";

/*
  One row per user in public.saves: { user_id, data (the whole game state), updated_at }.
  Writes are debounced; other devices get changes through Realtime and on tab focus.
  Conflicts resolve by data.updatedAt (newest wins), checked in app.js.
*/
export function createSync({ userId, getState, onStatus, onRemote }) {
  let saving = false, dirty = false, timer = 0, retries = 0, channel = null;

  async function pull() {
    const { data, error } = await supabase
      .from("saves")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }

  async function flush() {
    if (saving || !dirty) return;
    saving = true; dirty = false; onStatus("syncing");
    const state = getState();
    const { error } = await supabase.from("saves").upsert({
      user_id: userId,
      data: state,
      updated_at: new Date(state.updatedAt || Date.now()).toISOString()
    });
    saving = false;
    if (error) {
      dirty = true;
      onStatus("error");
      if (retries++ < 3) schedule(3000 * retries);
      return;
    }
    retries = 0;
    if (dirty) schedule(700); else onStatus("synced");
  }

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }
  function push() { dirty = true; retries = 0; schedule(700); }

  function listen() {
    channel = supabase
      .channel("save-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "saves", filter: `user_id=eq.${userId}` }, payload => {
        const d = payload.new && payload.new.data;
        if (d) onRemote(d);
      })
      .subscribe();
  }

  function stop() {
    clearTimeout(timer);
    if (dirty) flush();
    if (channel) supabase.removeChannel(channel);
    channel = null;
  }

  addEventListener("pagehide", () => { if (dirty) flush(); });

  return { pull, push, listen, stop };
}
