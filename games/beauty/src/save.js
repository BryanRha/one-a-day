// 저장 (localStorage) — 판 · 경제 · 이야기 · 매장 · 시즌 · 구매 기록 모두 한 덩어리
const KEY = 'kbeauty_v1';
let data = null;
export const fresh = () => ({ v: 1, sfx: true, coins: 30, gems: 20, energy: 100, eAt: Date.now(), xp: 0, lv: 1,
  board: null, store: [null, null, null, null], orders: [], orderSeq: 0, ch: 0, task: 0, spots: {}, gens: {}, tut: 0,
  daily: { day: '', goals: [], done: [] }, season: { id: '', pts: 0, claimed: [], pclaimed: [] }, ent: {}, purchases: [], stats: { merges: 0, orders: 0 }, pendingItems: [], seen: {} });
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh(); if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
export function reset() { data = fresh(); save(); }
