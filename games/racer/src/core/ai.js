// 자동 운전 판단 (봇 밸런싱 · 브라우저 자동 테스트 공용)
import { LANES, laneX, DODGE } from './race.js?v=0.55.2';

// 각 차로의 위험도: 그 차로로 계속 달리면 몇 초 뒤 앞차에 닿는지
function laneThreat(race, lane) {
  const s = race.s, p = s.p;
  let ttc = 99;
  for (const c of s.cars) {
    if (c.state !== 'drive' || c.lane !== lane) continue;
    const gap = p.y - c.y - (c.len + 180) / 2;
    if (gap < -40 || gap > 1600) continue;
    const rel = Math.max(40, s.speed - c.v);
    ttc = Math.min(ttc, Math.max(0, gap) / rel);
  }
  return ttc;
}
// 차로를 바꾸는 순간 옆에 차가 나란히 있는지
export function blockedSide(race, lane) {
  const s = race.s, p = s.p;
  return s.cars.some(c => c.state === 'drive' && c.lane === lane && Math.abs(c.y - p.y) < (c.len + 180) / 2 + 20);
}

// 반환: { dir: -1|0|1, jump: bool }
export function decide(race, skill = 0.6) {
  const s = race.s, p = s.p;
  const safe = 0.45 + 0.35 * (1 - skill);
  const score = [];
  for (let l = 0; l < LANES; l++) {
    const ttc = laneThreat(race, l);
    let v = Math.min(ttc, 3) * 10;
    if (ttc < safe) v -= 100;
    // 빵! 기회: 옆 차로에 곧 지나갈 차가 있으면 가산 (실력이 좋을수록 노림)
    for (const c of s.cars) if (c.state === 'drive' && Math.abs(c.lane - l) === 1 && c.y < p.y && p.y - c.y < 700) v += 6 * skill;
    for (const it of s.items) if (it.lane === l && it.y < p.y && p.y - it.y < 900) v += it.kind === 'fuel' ? 12 : 3;
    v -= Math.abs(l - p.lane) * 4;
    score.push(v);
  }
  let best = p.lane;
  for (let l = 0; l < LANES; l++) if (score[l] > score[best] + 2) best = l;
  let dir = Math.sign(best - p.lane);
  if (dir && blockedSide(race, p.lane + dir)) dir = 0;
  const here = laneThreat(race, p.lane);
  // 칼치기 노리기 (실력 0.8 이상): 앞차에 바짝 붙었다가 GREAT 거리에서 옆으로
  if (skill >= 0.8 && p.air <= 0) {
    let gap = 1e9;
    for (const c of s.cars) if (c.state === 'drive' && c.lane === p.lane && !c.dodged) { const g = (p.y - 90) - (c.y + c.len / 2); if (g > -20 && g < gap) gap = g; }
    const sides = [-1, 1].filter(d => p.lane + d >= 0 && p.lane + d < LANES && !blockedSide(race, p.lane + d) && laneThreat(race, p.lane + d) > 0.6);
    if (gap < DODGE[0] + 400 && sides.length) {
      const aim = DODGE[1] - (skill - 0.8) * 500;   // 실력이 높을수록 더 바짝
      if (gap > aim) return { dir: 0, jump: false };
      return { dir: sides[0], jump: false };
    }
  }
  const jump = here < 0.22 && !dir && p.jump >= 1;
  return { dir, jump };
}
