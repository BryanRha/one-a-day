// 진행: 오늘의 사진(처음 연 날부터 하루 한 장씩 열림) · 별 · 연속 방문 · 물건 도감
import { load, save } from './save.js?v=0.19.1';
import { SCENES } from './content.js?v=0.19.1';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNum = k => Math.floor(new Date(k + 'T00:00:00').getTime() / 86400000);

// 오늘까지 열린 장면 수 (첫날 1장, 하루에 한 장씩) — 원어데이 테스트 기간엔 전부 열림(?all)
export function unlocked() {
  const d = load(), today = dayKey(); if (!d.start) { d.start = today; save(); }
  if (new URLSearchParams(location.search).has('all')) return SCENES.length;
  // 하루 한 장 + 푼 사진 수만큼 다음 손님이 바로 와요 (한 판 끝나면 이어서 계속)
  const cleared = SCENES.filter(s => d.done[s.id]).length;
  return Math.min(SCENES.length, Math.max(dayNum(today) - dayNum(d.start) + 1, cleared + 1));
}
// 지금 맞이할 손님: 열린 사진 중 아직 안 푼 첫 사진 (다 풀었으면 별이 가장 적은 사진)
export const todayScene = () => { const n = unlocked(), open = SCENES.slice(0, n), d = load(); return open.find(s => !d.done[s.id]) || [...open].sort((a, b) => d.done[a.id].stars - d.done[b.id].stars)[0]; };
export const nextScene = id => { const d = load(); return SCENES.slice(0, unlocked()).find(s => s.id !== id && !d.done[s.id]) || null; };
export const sceneById = id => SCENES.find(s => s.id === id);
export const record = id => load().done[id] || null;

export function checkIn() {
  const d = load(), t = dayKey(); if (d.streak.last === t) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  d.streak.count = d.streak.last === dayKey(y) ? d.streak.count + 1 : 1; d.streak.last = t; save();
  return d.streak.count;
}
// 판 결과 기록: 별은 최고값 유지 · 숨은물건은 찾은 물건을 도감에
export function finish(id, r) {
  const d = load(), cur = d.done[id] || { stars: 0, best: 0, plays: 0, found: {} };
  const first = !cur.plays;
  cur.plays++; const newBest = r.score > cur.best; cur.stars = Math.max(cur.stars, r.stars); cur.best = Math.max(cur.best, r.score);
  for (const n of r.found || []) cur.found[n] = 1;
  d.done[id] = cur; d.days[dayKey()] = id; save();
  return { first, newBest, rec: cur };
}
export const totalStars = () => Object.values(load().done).reduce((a, r) => a + r.stars, 0);
export const foundCount = () => Object.values(load().done).reduce((a, r) => a + Object.keys(r.found || {}).length, 0);
// 숨은물건: 이번 판에 낼 물건 10개 — 아직 덜 찾아본 물건 먼저 (다시 할수록 새 물건이 섞임)
export function pickItems(sc, n = 10) {
  const rec = record(sc.id), seen = rec ? rec.found : {}, R = Math.random;
  const fresh = sc.items.filter(i => !seen[i.n]).sort(() => R() - 0.5), old = sc.items.filter(i => seen[i.n]).sort(() => R() - 0.5);
  return [...fresh, ...old].slice(0, n);
}
// 틀린그림: 몇 번째 세트인지 (판마다 번갈아)
export const diffSet = sc => (record(sc.id)?.plays || 0) % sc.sets.length;
