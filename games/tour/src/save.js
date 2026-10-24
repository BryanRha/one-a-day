// 저장 (localStorage) — 기록 · 랭크 · 설정 · 고른 캐릭터
const KEY = 'kdice_v1';
let data = null;
export const fresh = () => ({ v: 1, sfx: true, char: 'dawon', diff: 1, rank: 0, games: 0, wins: 0, best: 0, tut: 0, tips: {}, stats: { builds: 0, landmarks: 0, takes: 0, tolls: 0 } });
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh(); if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
