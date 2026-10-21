// 성장 · 재방문: 금화로 재능 · 보석 상자(확률 공개 · 천장) · 같은 장비 3개 합성 · 영웅 해금 · 출석 · 오늘의 미션 · 오늘의 던전
import { load, save } from './save.js?v=0.17.2';
import { GEAR, RAR, gearVal, gearCost, GEAR_MAXLV, HEROES, CHAPTERS } from './core/data.js?v=0.17.2';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 장비 능력치 합 → 전투에 넘김 ──
export function gearStats() {
  const d = load(), o = { atk: 0, hp: 0, crit: 0 };
  for (const slot of Object.keys(GEAR)) { const g = d.gear[slot]; if (g) o[GEAR[slot].stat] += gearVal(slot, g); }
  // 재능: 레벨당 체력 +30 · 공격 +4
  o.hp += d.talents.hp * 30; o.atk += d.talents.atk * 4;
  return o;
}
export const power = () => { const s = gearStats(); return Math.round(s.atk * 10 + s.hp * 0.8 + s.crit * 30); };
// 장비 강화
export function upgrade(slot) {
  const d = load(), g = d.gear[slot]; if (!g || g.lv >= GEAR_MAXLV(g.r)) return false;
  const c = gearCost(g); if (d.gold < c) return false;
  d.gold -= c; g.lv++; save(); return true;
}
// 재능: 금화로 영구 강화 (점점 비싸짐)
export const talentCost = k => Math.round(150 * Math.pow(1.28, load().talents[k]));
export function talentUp(k) { const d = load(), c = talentCost(k); if (d.gold < c) return false; d.gold -= c; d.talents[k]++; save(); return true; }

// ── 보석 상자: 확률 공개 · 10번 안에 영웅 이상 확정(천장) · 중복은 합성 재료 ──
export const CHEST = { cost: 30, odds: [0.62, 0.30, 0.07, 0.01], pity: 10 };
export function openChest(rnd = Math.random) {
  const d = load(); if (d.gems < CHEST.cost) return null;
  d.gems -= CHEST.cost; d.pity++;
  let r = 0, x = rnd(); for (let i = 3; i >= 0; i--) { const cut = CHEST.odds.slice(i).reduce((a, b) => a + b, 0); if (x < cut) { r = i; break; } }
  if (d.pity >= CHEST.pity && r < 2) r = 2;
  if (r >= 2) d.pity = 0;
  const slots = Object.keys(GEAR), slot = slots[Math.floor(rnd() * slots.length)];
  const item = { slot, r, lv: 1 };
  // 칸이 비었거나 더 좋으면 바로 장착, 아니면 보관함
  const cur = d.gear[slot];
  if (!cur || r > cur.r) { if (cur) d.bag.push({ slot, r: cur.r, lv: 1 }); d.gear[slot] = { r, lv: cur && r === cur.r ? cur.lv : 1 }; item.equipped = true; }
  else d.bag.push(item);
  save(); return item;
}
// 같은 칸·같은 등급 3개 → 다음 등급 1개 (장착 중인 것도 재료로 쓰면 등급이 오름)
export function mergeable() {
  const d = load(), out = [];
  for (const slot of Object.keys(GEAR)) for (let r = 0; r < 3; r++) {
    const n = d.bag.filter(b => b.slot === slot && b.r === r).length + (d.gear[slot] && d.gear[slot].r === r ? 1 : 0);
    if (n >= 3) out.push({ slot, r });
  }
  return out;
}
export function merge(slot, r) {
  const d = load(); let need = 3;
  const eq = d.gear[slot] && d.gear[slot].r === r;
  if (eq) need--;
  const idx = []; d.bag.forEach((b, i) => { if (idx.length < need && b.slot === slot && b.r === r) idx.push(i); });
  if (idx.length < need) return false;
  d.bag = d.bag.filter((_, i) => !idx.includes(i));
  if (eq || !d.gear[slot] || d.gear[slot].r < r + 1) { const lv = eq ? Math.min(d.gear[slot].lv, GEAR_MAXLV(r + 1)) : 1; if (!eq && d.gear[slot]) d.bag.push({ slot, r: d.gear[slot].r, lv: 1 }); d.gear[slot] = { r: r + 1, lv }; }
  else d.bag.push({ slot, r: r + 1, lv: 1 });
  save(); return true;
}
// 영웅 해금 (금화)
export function buyHero(k) { const d = load(), c = HEROES[k].cost; if (d.heroes[k] || d.gold < c) return false; d.gold -= c; d.heroes[k] = 1; save(); return true; }

// ── 장 해금: 앞 장 보스를 쓰러뜨리면 ──
export const chapterOpen = n => n === 1 || !!load().cleared[n - 1];

// ── 오늘의 던전: 모두 같은 장·같은 씨앗 · 가장 깊이 간 방 기록 ──
export function dailyRun() {
  const day = dayKey(); let h = 7; for (const c of day) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  const d = load(); if (d.daily.date !== day) { d.daily = { date: day, best: 0, tries: 0 }; save(); }
  return { day, seed: h, chapter: 1 + (h % CHAPTERS.length), hero: ['arin', 'theo', 'mir', 'yuna'][h % 4], best: d.daily.best, tries: d.daily.tries };
}

// ── 출석 · 미션 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1; d.streak.last = today;
  const gems = d.streak.count % 7 === 0 ? 60 : 15; d.gems += gems; save();
  return { count: d.streak.count, gems };
}
const POOL = [
  { id: 'room10', kind: 'room', goal: 10, text: '방 10개 지나가기', reward: 15 },
  { id: 'kill60', kind: 'kill', goal: 60, text: '몬스터 60마리 쓰러뜨리기', reward: 15 },
  { id: 'boss1', kind: 'boss', goal: 1, text: '보스 1마리 쓰러뜨리기', reward: 20 },
  { id: 'skill12', kind: 'skill', goal: 12, text: '능력 12개 고르기', reward: 10 },
  { id: 'gold500', kind: 'gold', goal: 500, text: '금화 500 모으기', reward: 10 },
  { id: 'daily', kind: 'daily', goal: 1, text: '오늘의 던전 도전', reward: 15 },
  { id: 'up2', kind: 'upgrade', goal: 2, text: '장비 2번 강화', reward: 10 },
];
function pick(day) { let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0; const out = []; for (let i = 0; out.length < 3 && i < 40; i++) { const m = POOL[(h + i * 3) % POOL.length]; if (!out.some(o => o.id === m.id)) out.push({ id: m.id, prog: 0, claimed: false }); } return out; }
export function missions() { const d = load(), day = dayKey(); if (d.missions.date !== day) { d.missions = { date: day, list: pick(day) }; save(); } return d.missions.list.map(m => ({ ...POOL.find(p => p.id === m.id), ...m, done: m.prog >= POOL.find(p => p.id === m.id).goal })); }
export function track(kind, v = 1) { const d = load(); missions(); for (const m of d.missions.list) if (POOL.find(p => p.id === m.id).kind === kind) m.prog += v; save(); }
export function claim(id) { const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id); if (!m || m.claimed || m.prog < def.goal) return 0; m.claimed = true; d.gems += def.reward; save(); return def.reward; }

// ── 판 결과 반영 ──
// r: { chapter, room, win, gold, kills, skills, daily, bosses }
export function finish(r) {
  const d = load(); d.runs++; d.kills += r.kills;
  const goldMul = 1 + d.talents.gold * 0.08, gold = Math.round(r.gold * goldMul);
  d.gold += gold;
  let gems = 0, newBest = false, unlocked = null;
  if (!r.daily) { if ((d.best[r.chapter] || 0) < r.room) { d.best[r.chapter] = r.room; newBest = true; } if (r.win && !d.cleared[r.chapter]) { d.cleared[r.chapter] = 1; gems += 50; unlocked = CHAPTERS[r.chapter] ? r.chapter + 1 : null; } }
  else { d.daily.tries++; if (r.room > d.daily.best) { d.daily.best = r.room; newBest = true; } }
  gems += Math.floor(r.room / 5) * 2; d.gems += gems;
  for (const it of r.loot || []) d.bag.push({ slot: it.slot, r: it.r, lv: 1 });
  save();
  track('room', r.room); track('kill', r.kills); track('boss', r.bosses || 0); track('skill', r.skills); track('gold', gold); if (r.daily) track('daily');
  return { gold, gems, newBest, unlocked };
}
export { RAR };
