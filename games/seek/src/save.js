// 저장 (localStorage). load() 는 같은 객체를 돌려주고 save() 로 기록
const KEY = 'memory_studio_v1';
let data = null;
const fresh = () => ({
  v: 1, sfx: true, tips: {},
  done: {},        // 장면 id → { stars, best, plays, found: {물건이름:1} }
  streak: { last: '', count: 0 }, days: {},   // 날짜 → 푼 장면 id
  start: '',       // 처음 연 날 (오늘의 사진 순서 기준)
});
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh(); if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
