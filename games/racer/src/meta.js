// 차고: 드라이버 · 자동차 · 부품 강화 (One a Day 원칙대로 가볍게)
import { load, save } from './save.js?v=0.11.1';

export const DRIVER_INFO = {
  raccoon: { name: '구리', animal: '너구리', desc: '코인 +10%', cost: 0 },
  penguin: { name: '펭글', animal: '펭귄', desc: '연료 효율 +10%', cost: 2500 },
  bunny: { name: '토리', animal: '토끼', desc: '콤보 유지 시간 +0.5초', cost: 4000 },
  bear: { name: '곰곰', animal: '곰', desc: '점프 충전 +35%', cost: 6000 },
};
export const DRIVER_ORDER = ['raccoon', 'penguin', 'bunny', 'bear'];
export const CAR_INFO = {
  c: { name: '꼬마 해치백', key: 'car_player_c', cost: 0, bonus: 0 },
  b: { name: '스카이 쿠페', key: 'car_player_b', cost: 8000, bonus: 3 },
  a: { name: '골드 슈퍼카', key: 'car_player_a', cost: 25000, bonus: 6 },
};
export const CAR_ORDER = ['c', 'b', 'a'];
export const PARTS = {
  tank: { name: '연료통', desc: '연료 +3' },
  engine: { name: '엔진', desc: '속도 +3.5%' },
  jump: { name: '점프', desc: '점프 충전 +10%' },
};
export const PART_MAX = 10;
export const partCost = lv => Math.round(250 * Math.pow(1.38, lv) / 10) * 10;

// 경주에 넘길 차 성능 = 부품 레벨 + 차 등급 보너스
export function carStats() {
  const d = load(), b = CAR_INFO[d.car].bonus;
  return { tank: d.parts.tank + b, engine: d.parts.engine + b, jump: d.parts.jump + b * 0.5 };
}
export function pay(n) { const d = load(); if (d.coins < n) return false; d.coins -= n; save(); return true; }
export function upgradePart(k) { const d = load(), lv = d.parts[k]; if (lv >= PART_MAX || !pay(partCost(lv))) return false; d.parts[k] = lv + 1; save(); return true; }
export function buyDriver(id) { const d = load(); if (d.drivers[id]) { d.driver = id; save(); return true; } if (!pay(DRIVER_INFO[id].cost)) return false; d.drivers[id] = true; d.driver = id; save(); return true; }
export function buyCar(id) { const d = load(); if (d.cars[id]) { d.car = id; save(); return true; } if (!pay(CAR_INFO[id].cost)) return false; d.cars[id] = true; d.car = id; save(); return true; }
export function applyRun(r) {
  const d = load(), out = { newBest: r.score > d.best };
  d.coins += r.coins;
  d.best = Math.max(d.best, r.score); d.bestDist = Math.max(d.bestDist, r.dist);
  const t = d.totals; t.runs++; t.dist += r.dist; t.honks += r.honks; t.jumpshots += r.jumpshots;
  t.fevers = (t.fevers || 0) + (r.fevers || 0); t.bosses = (t.bosses || 0) + (r.bosses || 0); t.bestCombo = Math.max(t.bestCombo || 0, r.combo || 0);
  save(); return out;
}
