// 저장 · 성장 · 재화 · 장비 · 행동력 · 일일 미션 · 출석 (localStorage 'ashblade_v1')
import { HERO, SLOTS, RARITY, ITEM_NAMES, STAGES, expNeed, MAX_LV, STAMINA, enhCost, enhRate, MAX_ENH, skillCost, MAX_SKILL, SKILL_SLOTS } from './data.js?v=0.57.0';

const KEY = 'ashblade_v1';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
let uid = 1;
export function newItem(slot, r, lv = 0) { return { u: Date.now().toString(36) + (uid++), slot, r, lv }; }
function fresh() {
  const gear = {}; for (const s of SLOTS) gear[s.id] = newItem(s.id, 0);
  return { v: 1, lv: 1, exp: 0, gold: 800, gems: 120, books: 2, stamina: STAMINA.max, stT: Date.now(), clear: {}, gear, inv: [], skillLv: { quake: 1, whirl: 1, rush: 1, guard: 1, ult: 1 },
    tower: { best: 0 }, day: '', daily: {}, miss: {}, missDone: {}, attend: { n: 0, last: '' }, set: { sfx: true, bgm: true }, auto: false, seen: {}, total: { kills: 0, clears: 0 }, created: Date.now() };
}
export let G = fresh();
export function loadSave() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) G = Object.assign(fresh(), s); } catch { /* */ } tick(); return G; }
let saveT = null;
export function save(now) { clearTimeout(saveT); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch { /* */ } }; if (now) f(); else saveT = setTimeout(f, 300); }
export function resetSave() { G = fresh(); save(true); }
// 날짜 · 행동력
export function tick() {
  const n = Date.now(), per = STAMINA.regenMin * 60000; if (G.stamina < STAMINA.max) { const k = Math.floor((n - G.stT) / per); if (k > 0) { G.stamina = Math.min(STAMINA.max, G.stamina + k); G.stT += k * per; } } else G.stT = n;
  if (G.day !== today()) { G.day = today(); G.daily = {}; G.miss = {}; G.missDone = {}; }
}
export const staminaNext = () => G.stamina >= STAMINA.max ? 0 : Math.max(0, STAMINA.regenMin * 60000 - (Date.now() - G.stT));
export function useStamina(n) { tick(); if (G.stamina < n) return false; if (G.stamina >= STAMINA.max) G.stT = Date.now(); G.stamina -= n; save(); return true; }
// 장비 수치
export function itemStat(it) { const S = SLOTS.find(s => s.id === it.slot), m = RARITY[it.r].mult * (1 + 0.1 * it.lv); const o = { [S.main]: S.base * m }; if (S.sub) o[S.sub] = S.subBase * RARITY[it.r].mult * (1 + 0.05 * it.lv); return o; }
export const itemName = it => ITEM_NAMES[it.slot][it.r] + (it.lv ? ` +${it.lv}` : '');
export function heroStats() {
  const g = Math.pow(HERO.grow, G.lv - 1); const s = { hp: HERO.hp * g, atk: HERO.atk * g, def: HERO.def * Math.pow(1.04, G.lv - 1), crit: HERO.crit, cdmg: HERO.cdmg };
  for (const sl of SLOTS) { const it = G.gear[sl.id]; if (!it) continue; const st = itemStat(it); for (const k in st) s[k] = (s[k] || 0) + st[k]; }
  s.hp = Math.round(s.hp); s.atk = Math.round(s.atk); s.def = Math.round(s.def); s.crit = Math.min(0.6, s.crit); s.lv = G.lv; s.skillLv = G.skillLv; s.cp = power(s); return s;
}
export const power = s => Math.round(s.atk * 4 * (1 + s.crit * (s.cdmg - 1)) + s.hp * 0.35 + s.def * 6 + Object.values(G.skillLv).reduce((a, b) => a + b, 0) * 40);
// 경험치
export function addExp(n) { G.exp += n; let up = 0; while (G.lv < MAX_LV && G.exp >= expNeed(G.lv)) { G.exp -= expNeed(G.lv); G.lv++; up++; } if (G.lv >= MAX_LV) G.exp = 0; save(); return up; }
// 장비 상자 · 강화 · 분해
export function rollItem(lv, minR = 0) {
  const w = [60, 28, 9 + lv * 0.25, 2 + lv * 0.12, 0.3 + lv * 0.05]; let s = Math.random() * w.reduce((a, b) => a + b, 0), r = 0; for (; r < 4; r++) { s -= w[r]; if (s <= 0) break; }
  r = Math.max(minR, Math.min(4, r)); const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)].id; return newItem(slot, r);
}
export function addItem(it) { G.inv.push(it); if (G.inv.length > 60) { G.inv.sort((a, b) => a.r - b.r || a.lv - b.lv); const x = G.inv.shift(); G.gold += salvage(x); } save(); }
export const salvage = it => Math.round(80 * Math.pow(2.2, it.r) * (1 + it.lv * 0.3));
export function equip(it) { const old = G.gear[it.slot]; G.inv = G.inv.filter(x => x.u !== it.u); if (old) G.inv.push(old); G.gear[it.slot] = it; save(); }
export function sell(it) { G.inv = G.inv.filter(x => x.u !== it.u); const g = salvage(it); G.gold += g; save(); return g; }
export function enhance(it) { if (it.lv >= MAX_ENH) return { err: '최대 강화' }; const c = enhCost(it); if (G.gold < c) return { err: '골드가 부족해요' }; G.gold -= c; const ok = Math.random() < enhRate(it); if (ok) it.lv++; mission('enh'); save(); return { ok, cost: c }; }
export const itemScore = it => { const st = itemStat(it); return Math.round((st.atk || 0) * 4 + (st.hp || 0) * 0.35 + (st.def || 0) * 6 + (st.crit || 0) * 900 + (st.cdmg || 0) * 300); };
// 스킬
export function skillUp(k) { const lv = G.skillLv[k] || 1; if (lv >= MAX_SKILL) return { err: '최대 레벨' }; if (lv >= G.lv + 2) return { err: `영웅 레벨 ${lv - 1} 이상 필요` }; const c = skillCost(lv); if (G.gold < c.gold) return { err: '골드가 부족해요' }; if (G.books < c.book) return { err: '스킬서가 부족해요' };
  G.gold -= c.gold; G.books -= c.book; G.skillLv[k] = lv + 1; save(); return { ok: true }; }
// 스테이지 진행
export const stageOpen = id => { const i = STAGES.findIndex(s => s.id === id); return i <= 0 || (G.clear[STAGES[i - 1].id] || 0) > 0; };
export const totalStars = () => Object.values(G.clear).reduce((a, b) => a + b, 0);
// 일일 미션
export const MISSIONS = [
  { id: 'clear', name: '스테이지 3번 깨기', goal: 3, gems: 20 }, { id: 'kill', name: '몬스터 150마리 쓰러뜨리기', goal: 150, gems: 20 }, { id: 'skill', name: '스킬 30번 쓰기', goal: 30, gold: 3000 },
  { id: 'enh', name: '장비 강화 3번', goal: 3, books: 2 }, { id: 'tower', name: '무한의 탑 1번 도전', goal: 1, gems: 15 }, { id: 'daily', name: '황금 동굴 1번 도전', goal: 1, gold: 5000 },
];
export function mission(id, n = 1) { tick(); G.miss[id] = (G.miss[id] || 0) + n; save(); }
export const missionReady = () => MISSIONS.some(m => (G.miss[m.id] || 0) >= m.goal && !G.missDone[m.id]) || (MISSIONS.every(m => G.missDone[m.id]) && !G.missDone.all);
export function claimMission(id) { const m = MISSIONS.find(x => x.id === id); if (id === 'all') { if (G.missDone.all || !MISSIONS.every(x => G.missDone[x.id])) return null; G.missDone.all = 1; G.gems += 50; save(); return { gems: 50 }; }
  if (!m || G.missDone[id] || (G.miss[id] || 0) < m.goal) return null; G.missDone[id] = 1; const r = {}; for (const k of ['gems', 'gold', 'books']) if (m[k]) { G[k] += m[k]; r[k] = m[k]; } save(); return r; }
// 출석 (7일 반복)
export const ATTEND = [{ gold: 2000 }, { gems: 30 }, { books: 3 }, { gold: 5000 }, { gems: 50 }, { box: 2 }, { gems: 100, box: 3 }];
export const attendReady = () => G.attend.last !== today();
export function claimAttend() { if (!attendReady()) return null; const i = G.attend.n % 7, r = ATTEND[i]; G.attend.n++; G.attend.last = today(); const got = { ...r }; if (r.gold) G.gold += r.gold; if (r.gems) G.gems += r.gems; if (r.books) G.books += r.books; if (r.box) { got.item = rollItem(10, r.box); addItem(got.item); } save(); return { day: i + 1, ...got }; }
