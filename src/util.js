/* Small shared helpers: dates (local YYYY-MM-DD keys), escaping, randomness. */
export const ALL = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = n => String(n).padStart(2, "0");
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const todayKey = () => keyOf(new Date());
export const dow = k => parseKey(k).getDay();
export const mondayOf = k => addDays(k, -((dow(k) + 6) % 7));
export const dayIndex = k => { const [y, m, d] = k.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const fmtDay = k => parseKey(k).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const firstName = n => (n || "").trim().split(/\s+/)[0] || "";

export function daysLabel(d) {
  const s = d.slice().sort().join("");
  if (s === "0123456") return "Every day";
  if (s === "12345") return "Mon–Fri";
  if (s === "06") return "Weekends";
  if (!d.length) return "No days";
  return DAY_ORDER.filter(x => d.includes(x)).map(x => DAY_SHORT[x]).join(", ");
}
export const plural = (n, unit) => { const [one, many] = unit.split("|"); return n === 1 ? one : (many || one); };
