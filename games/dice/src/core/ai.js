// 자동 운영 (봇 밸런싱 · 브라우저 자동 테스트 공용)
import { SLOTS, MAX_PIPS, RUNES } from './sim.js?v=0.46.0';

// 한 번 판단: 소환 → (판이 차면) 합성 → 남는 SP 로 강화
export function act(s, skill = 0.6, R = Math.random) {
  if (s.over) return null;
  const empty = s.emptySlots().length, cost = s.summonCost();
  // 강화: 가장 많이 깔린 종류부터, SP 여유가 있을 때 (실력이 높을수록 적극적)
  const count = {}; for (const d of s.board) if (d) count[d.type] = (count[d.type] || 0) + d.pips;
  const types = Object.keys(count).sort((a, b) => count[b] - count[a]);
  // 서툰 사람은 강화를 거의 안 씀
  if (R() < skill * skill) for (const t of types) { const c = s.powerCost(t); if (c != null && s.sp >= c + (empty ? cost : 0) && count[t] >= 4) { s.powerUp(t); return 'power'; } }
  if (empty && s.sp >= cost) { s.summon(); return 'summon'; }
  // 합성: 판이 꽉 찼거나(실력 높으면) 낮은 눈끼리 정리
  if (!empty || (skill > 0.5 && R() < skill * 0.3)) {
    let best = null;
    for (let a = 0; a < SLOTS; a++) for (let b = 0; b < SLOTS; b++) {
      if (!s.canMerge(a, b)) continue;
      const A = s.board[a], B = s.board[b];
      let v = -A.pips * 10;                                  // 낮은 눈부터
      if (A.type === 'fortune' || B.type === 'fortune') v += 15 * skill;
      if (A.type === 'growth' && A.pips < MAX_PIPS) v -= 6 * skill; // 성장은 기다리면 커짐
      if (RUNES[A.type].wild && A.type !== B.type) v -= 3;
      v += (R() - 0.5) * 60 * (1 - skill);   // 서툴수록 아무 쌍이나
      if (!best || v > best.v) best = { v, a, b };
    }
    if (best && (!empty || best.v > -25)) { s.merge(best.a, best.b); return 'merge'; }
  }
  return null;
}
