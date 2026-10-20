import { Sim } from './src/core/sim.js';
import { AI, apply } from './src/core/ai.js';
import { MAPS, campaignMap } from './src/core/maps.js';
import { STAGES, lossCap } from './src/meta.js';
import { rng } from './tools/bot.js';
const only = process.argv[2] ? process.argv[2].split(',') : null, N = +(process.argv[3] || 6);
for (const st of STAGES.filter(s => !only || only.includes(s.id))) {
  const m = MAPS.find(x => x.id === st.id), rs = []; const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const s = new Sim(campaignMap(m), [null, 'ella', m.enemyCo || 'scarlet'], { limit: m.par + 8 }), ai = { 1: new AI('hard', rng(k + 1)), 2: new AI(process.env.AI || st.ai, rng(k + 50)) };
    let n = 0, why = 'time'; while (!s.over && n++ < 20000) { const a = ai[s.turn].next(s); apply(s, a); for (const e of s.events) if (e.type === 'win') why = e.why; s.events.length = 0; }
    rs.push({ win: s.winner === 1, day: s.day, why, lost: s.stats.lost[1], b: s.stats.built.slice(1).join('/') });
  }
  const w = rs.filter(r => r.win).length, days = rs.map(r => r.day).sort((a, b) => a - b);
  console.log(`${m.id} ${m.name} (${st.ai}, 기준 ${m.par}): 승 ${w}/${N} · 결판 ${rs.filter(r => r.why !== 'time').length}/${N} · 일수 ${days[N >> 1]} · 기준안 ${rs.filter(r => r.win && r.day <= m.par).length} · 별3 ${rs.filter(r => r.win && r.day <= m.par && r.lost <= lossCap(m.par)).length} · 손실 ${(rs.reduce((a, r) => a + r.lost, 0) / N).toFixed(1)} · 생산 ${rs[0].b} · ${((Date.now() - t0) / N) | 0}ms`);
}
