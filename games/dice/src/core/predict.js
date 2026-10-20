// AI 예측: 실제 게임 규칙(Sim)을 봇으로 여러 판 빠르게 돌려 "기록 경신 확률"을 계산 · 보유 룬으로 덱 추천
import { Sim, RUNES, RUNE_ORDER, RARITY, synergiesOf } from './sim.js?v=0.8.7';
import { act } from './ai.js?v=0.8.7';
import { RATING } from './rating.js?v=0.8.7';

// 한 판 빠르게 (시간 간격을 키워 계산량을 줄임 · 결과는 일반 판과 거의 같음)
export function quickRun(deck, tiers, critBonus, seed, skill = 0.6) {
  const s = new Sim({ deck, tiers, seed, critBonus }), dt = 1 / 12;
  let think = 0, g = 0;
  while (!s.over && g++ < 12 * 60 * 15) { think -= dt; if (think <= 0) { think = 0.45 - 0.3 * skill; for (let k = 0; k < 3; k++) if (!act(s, skill)) break; } s.step(dt); s.events.length = 0; }
  return s.wave;
}
// 덱 하나의 예상 (n판): 목표 웨이브 이상 도달 확률 · 중앙값
export function evalDeck(deck, tiers, critBonus, n, target, seed0 = 1) {
  const ws = []; for (let i = 0; i < n; i++) ws.push(quickRun(deck, tiers, critBonus, seed0 + i * 7919));
  ws.sort((a, b) => a - b);
  return { p: ws.filter(w => w >= target).length / n, median: ws[Math.floor(n / 2)], mean: ws.reduce((a, b) => a + b, 0) / n, ws };
}
// 룬 점수 = 기본 성능(봇 측정) + 영구 등급
const score = (r, tiers) => (RATING[r] || 15) + 0.45 * ((tiers[r] || 1) - 1);
// 후보 덱 만들기: 점수 순 · 조합 우선 · 보스 대응 포함
export function candidates(owned, tiers) {
  const sorted = owned.slice().sort((a, b) => score(b, tiers) - score(a, tiers));
  const out = [], key = d => d.slice().sort().join(',');
  const add = d => { if (d.length === 5 && !out.some(o => key(o) === key(d))) out.push(d); };
  add(sorted.slice(0, 5));
  // 조합 쌍을 넣은 덱
  const pairs = [];
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) { const sy = synergiesOf([sorted[i], sorted[j]]); if (sy.length) pairs.push([sorted[i], sorted[j], score(sorted[i], tiers) + score(sorted[j], tiers)]); }
  pairs.sort((a, b) => b[2] - a[2]);
  for (const [a, b] of pairs.slice(0, 3)) add([a, b, ...sorted.filter(x => x !== a && x !== b).slice(0, 3)]);
  // 보스 대응 룬을 하나 꼭 넣은 덱
  const boss = sorted.find(r => RUNES[r].boss || RUNES[r].hammer || RUNES[r].strongest);
  if (boss) add([boss, ...sorted.filter(x => x !== boss).slice(0, 4)]);
  add(sorted.slice(1, 6));
  return out.slice(0, 5);
}
// 비동기로 나눠 계산 (화면이 멈추지 않게) — onStep(done, total, deck)
// 목표: 지금 덱 예상보다 3웨이브 더 (이미 기록 경신이 쉬우면 더 높은 목표로 비교해야 의미가 있음)
export async function recommend(owned, tiers, critBonus, best, current, onStep, adj = 0) {
  const cands = candidates(owned, tiers);
  const N1 = 8, N2 = 16, total = N2 + cands.length * N1 + N2;
  let done = 0; const tick = () => new Promise(r => setTimeout(r, 0));
  const runs = async (deck, n, seed0) => { const ws = []; for (let i = 0; i < n; i++) { ws.push(quickRun(deck, tiers, critBonus, seed0 + i * 7919)); done++; onStep && onStep(done, total, deck); await tick(); } return ws.sort((a, b) => a - b); };
  const sum = (ws, target) => ({ p: ws.filter(w => w + adj >= target).length / ws.length, median: Math.round(ws[Math.floor(ws.length / 2)] + adj), mean: ws.reduce((a, b) => a + b, 0) / ws.length + adj });
  const curWs = await runs(current, N2, 101), curMean = curWs.reduce((a, b) => a + b, 0) / N2;
  const target = Math.max(best + 1, Math.round(curMean + adj) + 3, 10);
  let top = null;
  for (const c of cands) { const ws = await runs(c, N1, 11), m = ws.reduce((a, b) => a + b, 0) / N1; if (!top || m > top.m) top = { deck: c, m }; }
  const finWs = await runs(top.deck, N2, 101);
  return { deck: top.deck, target, ...sum(finWs, target), current: sum(curWs, target), tested: cands.length, sims: total };
}
export async function predictAsync(deck, tiers, critBonus, target, n, onStep, adj = 0) {
  const ws = []; const tick = () => new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < n; i++) { ws.push(quickRun(deck, tiers, critBonus, 101 + i * 7919)); onStep && onStep(i + 1, n, ws); await tick(); }
  ws.sort((a, b) => a - b);
  const raw = ws[Math.floor(n / 2)];
  return { p: ws.filter(w => w + adj >= target).length / n, median: Math.round(raw + adj), raw };
}
export { RUNE_ORDER, RARITY };
