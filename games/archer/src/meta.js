// 성장 · 재방문: 장비(6칸 · 등급 11 · 칸 강화 · 대장간 합성) · 은/흑요석 상자(확률 공개 · 천장) · 재능 · 영웅 해금 · 출석 · 오늘의 미션 · 오늘의 던전
import { load, save } from './save.js?v=0.17.11';
import { SLOTS, TIERS, MERGE, gearStats as gearStats0, expectedGear, powerOf, upCost, HEROES, CHAPTERS } from './core/data.js?v=0.17.11';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 장비 (원작 2 구조) ──
const byId = id => load().items.find(it => it.id === id);
export const equipped = () => { const d = load(), o = {}; for (const sl of SLOTS) { const it = d.eq[sl] && byId(d.eq[sl]); if (it) o[sl] = it; } return o; };
export const isEquipped = it => load().eq[it.slot] === it.id;
export function gearStats() { const d = load(); return gearStats0(equipped(), d.lv, d.talents); }
export const power = () => powerOf(gearStats());
// 권장 전투력: 그 장을 깰 만한 장비 (밸런스 기준과 같음)
export const recommended = ch => powerOf(expectedGear(CHAPTERS[ch - 1].stage));
export function equip(id) { const d = load(), it = byId(id); if (!it) return false; d.eq[it.slot] = id; save(); return true; }
// 칸 강화: 금화 + 그 칸 두루마리 · 레벨 상한 = 장착한 장비 등급
export const slotMax = sl => { const it = equipped()[sl]; return it ? TIERS[it.t].max : 10; };
export function upgrade(sl) {
  const d = load(), lv = d.lv[sl] || 1, c = upCost(lv);
  if (lv >= slotMax(sl)) return 'max';
  if (d.gold < c.gold) return 'gold';
  if ((d.scroll[sl] || 0) < c.scroll) return 'scroll';
  d.gold -= c.gold; d.scroll[sl] -= c.scroll; d.lv[sl] = lv + 1; save(); return 'ok';
}
// ── 대장간 합성 (원작 규칙: MERGE) ──
// 재료 후보: 장착하지 않은 장비 중 규칙에 맞는 것 (낮은 id 먼저)
export function fodder(it) {
  const d = load(), R = MERGE[it.t]; if (!R) return { need: 0, list: [], max: true };
  const list = d.items.filter(o => o.id !== it.id && !isEquipped(o) && o.slot === it.slot && (R.dup ? o.set === it.set && o.t === it.t : o.t === R.ft));
  return { need: R.n, list: list.slice(0, R.n), ok: list.length >= R.n, rule: R };
}
export function merge(id) {
  const d = load(), it = byId(id); if (!it) return false; const f = fodder(it); if (!f.ok) return false;
  const ids = f.list.map(o => o.id); d.items = d.items.filter(o => !ids.includes(o.id)); it.t++; save(); return true;
}
// 모두 합성: 똑같은 장비끼리 (일반→고급→희귀→영웅) 만 자동으로 · 장착한 것을 먼저 올림
export function autoMerge() {
  const d = load(); let n = 0, again = true;
  while (again) { again = false; const list = [...d.items].sort((a, b) => (isEquipped(b) - isEquipped(a)) || b.t - a.t || a.id - b.id); for (const it of list) if (it.t < 3 && d.items.includes(it) && fodder(it).ok) { merge(it.id); n++; again = true; break; } }
  return n;
}
export const mergeable = () => load().items.some(it => it.t < 3 && fodder(it).ok);
// 더 좋은 장비가 있으면 빈 칸에 자동 장착
function autoEquip(it) { const d = load(), cur = equipped()[it.slot]; if (!cur || it.t > cur.t) { d.eq[it.slot] = it.id; return true; } return false; }
export function addItem(set, slot, t) { const d = load(), it = { id: d.nextId++, set, slot, t }; d.items.push(it); it.equipped = autoEquip(it); return it; }

// ── 상자 (원작 확률) ──
// 은 상자: 일반 66.67% · 고급 33.33% (기본 장비) · 흑요석 상자: 고급 56% · 희귀 40% · 영웅 4% (세트 장비) · 30번 안에 영웅 확정
export const CHESTS = {
  silver: { name: '은 상자', key: 'silver', gold: 300, odds: [[0, 0.6667], [1, 0.3333]], sets: ['basic'], icon: 'i_chest_silver', keyIcon: 'i_key_silver' },
  obs: { name: '흑요석 상자', key: 'obs', gems: 60, odds: [[1, 0.56], [2, 0.40], [3, 0.04]], sets: ['neb', 'fang', 'blaze'], pity: 30, icon: 'i_chest_obs', keyIcon: 'i_key_obs' },
};
// n번 열기: 열쇠가 있으면 열쇠, 없으면 금화(은)/보석(흑요석) · 10번은 보석 10% 할인
export function chestPrice(k, n) { const C = CHESTS[k], d = load(), keys = Math.min(n, d.keys[k] || 0), rest = n - keys; return { keys, gold: C.gold ? rest * C.gold : 0, gems: C.gems ? Math.round(rest * C.gems * (n >= 10 ? 0.9 : 1)) : 0 }; }
export function openChest(k, n = 1, rnd = Math.random) {
  const C = CHESTS[k], d = load(), pr = chestPrice(k, n);
  if (d.gold < pr.gold || d.gems < pr.gems) return null;
  d.keys[k] -= pr.keys; d.gold -= pr.gold; d.gems -= pr.gems;
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = rnd(), t = C.odds[0][0]; for (const [tt, p] of C.odds) { if (x < p) { t = tt; break; } x -= p; }
    if (C.pity) { d.pityObs++; if (d.pityObs >= C.pity && t < 3) t = 3; if (t >= 3) d.pityObs = 0; }
    out.push(addItem(C.sets[Math.floor(rnd() * C.sets.length)], SLOTS[Math.floor(rnd() * SLOTS.length)], t));
  }
  save(); return out;
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
  { id: 'chest3', kind: 'chest', goal: 3, text: '상자 3번 열기', reward: 10 },
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
  // 전투에서 얻은 장비·두루마리 · 처음 도달 보상(원작 진행 보상): 방 10 = 흑요석 열쇠 1 · 클리어 = 흑요석 열쇠 2 · 방 5 이상 = 은 열쇠 1
  const got = { items: [], scroll: {}, keys: { silver: 0, obs: 0 } };
  for (const it of r.loot || []) { if (it.kind === 'scroll') { const sl = SLOTS[Math.floor(Math.random() * SLOTS.length)]; for (let i = 0; i < it.n; i++) { const s2 = SLOTS[(SLOTS.indexOf(sl) + i) % 6]; d.scroll[s2]++; got.scroll[s2] = (got.scroll[s2] || 0) + 1; } } else got.items.push(addItem(it.set, it.slot, it.t)); }
  if (!r.daily) { const ms = d.milestones[r.chapter] ||= {}; if (r.room >= 10 && !ms.r10) { ms.r10 = 1; got.keys.obs += 1; } if (r.win && !ms.clear) { ms.clear = 1; got.keys.obs += 2; } }
  if (r.room >= 5) got.keys.silver += r.daily ? 2 : 1;
  d.keys.silver += got.keys.silver; d.keys.obs += got.keys.obs;
  save();
  track('room', r.room); track('kill', r.kills); track('boss', r.bosses || 0); track('skill', r.skills); track('gold', gold); if (r.daily) track('daily');
  return { gold, gems, newBest, unlocked, got };
}
