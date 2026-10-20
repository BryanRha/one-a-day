// 진행·재방문: 룬 해금(최고 웨이브) · 수정으로 영구 등급업(확정, 뽑기 없음) · 연속 출석 · 오늘의 미션 · 오늘의 도전
import { load, save } from './save.js';
import { RUNE_ORDER } from './core/sim.js';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// 룬 해금: 최고 웨이브 달성으로 (확정)
export const UNLOCK = { flame: 0, frost: 0, storm: 0, iron: 0, gale: 0, venom: 6, light: 9, echo: 12, fortune: 15, growth: 18 };
export const MAX_TIER = 10;
export const tierCost = t => Math.round(30 * Math.pow(t, 1.5));
export function checkUnlocks() {
  const d = load(), got = [];
  for (const r of RUNE_ORDER) if (!d.unlocked[r] && d.best >= UNLOCK[r]) { d.unlocked[r] = 1; got.push(r); }
  if (got.length) save();
  return got;
}
export function upgrade(r) {
  const d = load(), t = d.tiers[r] || 1;
  if (!d.unlocked[r] || t >= MAX_TIER || d.crystals < tierCost(t)) return false;
  d.crystals -= tierCost(t); d.tiers[r] = t + 1; save(); return true;
}
export function setDeck(deck) { const d = load(); d.deck = deck.slice(0, 5); save(); }

// ── 오늘의 미션 ──
const POOL = [
  { id: 'wave8', kind: 'wave', goal: 8, text: '웨이브 8 도달', reward: 25 },
  { id: 'wave14', kind: 'wave', goal: 14, text: '웨이브 14 도달', reward: 50 },
  { id: 'boss3', kind: 'boss', goal: 3, text: '보스 3마리 처치', reward: 30 },
  { id: 'boss8', kind: 'boss', goal: 8, text: '보스 8마리 처치', reward: 55 },
  { id: 'kills150', kind: 'kills', goal: 150, text: '적 150마리 처치', reward: 25 },
  { id: 'kills400', kind: 'kills', goal: 400, text: '적 400마리 처치', reward: 45 },
  { id: 'pip5', kind: 'pips', goal: 5, text: '5눈 주사위 만들기', reward: 30 },
  { id: 'pip7', kind: 'pips', goal: 7, text: '7눈 각성 주사위 만들기', reward: 60 },
  { id: 'merge30', kind: 'merge', goal: 30, text: '합성 30번', reward: 25 },
  { id: 'power6', kind: 'power', goal: 6, text: '판 안 강화 6번', reward: 25 },
  { id: 'daily', kind: 'daily', goal: 1, text: '오늘의 도전 참여', reward: 30 },
  { id: 'games2', kind: 'games', goal: 2, text: '2판 플레이', reward: 15 },
];
function pick(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 60; i++) { const m = POOL[(h + i * 5) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pick(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
export function track(kind, v = 1) {
  const d = load(); missions();
  for (const m of d.missions.list) { const def = POOL.find(p => p.id === m.id); if (def.kind !== kind) continue; m.prog = ['wave', 'pips'].includes(kind) ? Math.max(m.prog, v) : m.prog + v; }
  save();
}
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.crystals += def.reward; save(); return def.reward;
}

// ── 연속 출석 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 80 : 15;
  d.crystals += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 오늘의 도전: 모두 같은 시드·같은 덱·등급 1 (공정) ──
export function dailyChallenge() {
  const day = dayKey(); let h = 7; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const pool = RUNE_ORDER.slice(), deck = [];
  let x = h; while (deck.length < 5) { x = (x * 1103515245 + 12345) >>> 0; const r = pool.splice(x % pool.length, 1)[0]; deck.push(r); }
  const d = load(); if (d.daily.date !== day) { d.daily = { date: day, best: 0, tries: 0 }; save(); }
  return { day, seed: h, deck, best: d.daily.best, tries: d.daily.tries };
}

// 한 판 결과 반영 → 받은 수정 · 새 해금 · 기록 갱신 여부
export function finishRun(r, mode) {
  const d = load(), prev = d.best;
  const crystals = r.wave * 3 + r.bossKills * 6 + (mode === 'daily' ? 20 : 0);
  d.crystals += crystals; d.plays++; d.kills += r.kills; d.bossKills += r.bossKills;
  if (mode === 'daily') { d.daily.best = Math.max(d.daily.best, r.wave); d.daily.tries++; }
  else if (r.wave > d.best) d.best = r.wave;
  save();
  track('games'); track('wave', r.wave); track('kills', r.kills); track('boss', r.bossKills); track('pips', r.maxPips); track('merge', r.merges); track('power', r.powers);
  if (mode === 'daily') track('daily');
  return { crystals, newBest: mode !== 'daily' && r.wave > prev, unlocked: checkUnlocks() };
}
