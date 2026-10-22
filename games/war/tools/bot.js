// AI 대 AI 대전으로 지도 점검: node tools/bot.js [판수=10] [지도id] [파랑레벨] [빨강레벨]
import { Sim } from '../src/core/sim.js?v=0.25.0';
import { AI, apply } from '../src/core/ai.js?v=0.25.0';
import { MAPS } from '../src/core/maps.js?v=0.25.0';
import { fileURLToPath } from 'node:url';
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function battle(map, lv1 = 'normal', lv2 = 'normal', seed = 1, cos = [null, 'ella', 'scarlet'], maxDay = 40) {
  const s = new Sim(map, cos), ai = { 1: new AI(lv1, rng(seed)), 2: new AI(lv2, rng(seed + 99)) };
  let steps = 0;
  while (!s.over && s.day <= maxDay && steps++ < 20000) { const a = ai[s.turn].next(s); apply(s, a); s.events.length = 0; }
  const val = p => s.mine(p).reduce((a, u) => a + u.hp, 0) + s.props(p) * 100;
  return { winner: s.winner || (val(1) > val(2) ? 1 : 2), day: s.day, decided: s.over, steps, lost: s.stats.lost.slice(1), built: s.stats.built.slice(1), props: [s.props(1), s.props(2)] };
}
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = +(process.argv[2] || 10), only = process.argv[3], l1 = process.argv[4] || 'normal', l2 = process.argv[5] || 'normal';
  for (const m of MAPS.filter(m => !only || m.id === only)) {
    const t0 = Date.now(), rs = []; for (let i = 0; i < n; i++) rs.push(battle(m, l1, l2, i + 1));
    const w1 = rs.filter(r => r.winner === 1).length, dec = rs.filter(r => r.decided).length, days = rs.map(r => r.day).sort((a, b) => a - b);
    console.log(`${m.id} ${m.name}: 파랑 승 ${w1}/${n} · 결판 ${dec}/${n} · 일수 중앙 ${days[n >> 1]} (${days[0]}~${days[n - 1]}) · 손실 ${rs[0].lost} · 생산 ${rs[0].built} · ${((Date.now() - t0) / n) | 0}ms/판`);
  }
}
