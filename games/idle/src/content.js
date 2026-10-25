// 던전 · 결투장 · 펫 · 토벌 의뢰 — 수치와 규칙 (화면과 분리)
import { load, save } from './save.js?v=0.54.1';
import { HEROES, GRADES, PETS } from './data.js?v=0.54.1';
export { PETS };
import { heroStats, mobHp, goldPerMob, teamPower, fmt, questAdd, petLv, petBonus } from './state.js?v=0.54.1';
export { petLv, petBonus };

export const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
export function daily() { const d = load(); if (!d.day || d.day.date !== today()) { d.day = { date: today(), dg: {}, arena: 5, missions: {}, claimed: [] }; save(); } return d.day; }
// 팀 초당 피해 (스킬 · 치명 포함 근사)
export const teamDps = () => load().team.filter(id => load().heroes[id]).reduce((a, id) => { const s = heroStats(id); return a + s.atk / s.rate * (1 + s.crit) * 1.35; }, 0);

// ── 던전 5종: 단계마다 보스 체력이 커지고, 30초 안에 쓰러뜨리면 다음 단계 · 하루 입장 3번(소탕 포함)
export const DUNGEONS = [
  { k: 'gold', n: '여명석 광맥', d: '골드를 잔뜩 캐요', bg: 'dg1', boss: 'garuman', open: 21, icon: 'shop41', rw: lv => ({ gold: Math.round(goldPerMob(lv * 4 + 10) * 120) }) },
  { k: 'exp', n: '수련장', d: '레벨업 물약 · 물약 1개 = 레벨 1', bg: 'dg2', boss: 'tron', open: 31, icon: 'shop139', rw: lv => ({ potion: 3 + Math.floor(lv / 2) }) },
  { k: 'token', n: '기사단 증표 시련', d: '증표로 원하는 영웅의 조각을 사요', bg: 'dg1', boss: 'mano', open: 41, icon: 'shop6', rw: lv => ({ token: 10 + lv * 2 }) },
  { k: 'relic', n: '유물 발굴지', d: '장비 상자 열쇠와 보석', bg: 'dg2', boss: 'jimber', open: 61, icon: 'shop378', rw: lv => ({ keys: 8 + lv, gems: 10 + lv * 2 }) },
  { k: 'pet', n: '펫 둥지', d: '펫 먹이로 펫을 키워요', bg: 'dg1', boss: 'walg', open: 81, icon: 'shop16', rw: lv => ({ food: 5 + lv * 2 }) },
];
export const DG_TRIES = 3, DG_TIME = 30;
export const dgLevel = k => (load().dg || {})[k] || 1;   // 도전할 단계 (깬 단계 + 1)
export const dgHp = (k, lv) => mobHp(lv * 4 + 6) * 26;
export const dgLeft = k => DG_TRIES - (daily().dg[k] || 0);
export function dgUse(k) { const dy = daily(); dy.dg[k] = (dy.dg[k] || 0) + 1; save(); }
export function giveReward(r) { const d = load(); for (const [k, v] of Object.entries(r)) { if (k === 'gold') d.gold += v; else if (k === 'gems') d.gems += v; else if (k === 'keys') d.keys += v; else d.items[k] = (d.items[k] || 0) + v; } save(); }
// 도전: 30초 동안 준 피해 → 이기면 단계 +1, 보상은 깬 단계 기준
export function dgFight(k) {
  const d = load(), lv = dgLevel(k), hp = dgHp(k, lv), dmg = teamDps() * DG_TIME * (0.92 + Math.random() * 0.16), win = dmg >= hp;
  dgUse(k); const r = DUNGEONS.find(g => g.k === k).rw(win ? lv : Math.max(1, lv - 1));
  if (win) { d.dg = d.dg || {}; d.dg[k] = lv + 1; } giveReward(r); questAdd('dungeon', 1); save(); return { win, dmg, hp, lv, r };
}
export function dgSweep(k) { const lv = dgLevel(k) - 1; if (lv < 1) return null; dgUse(k); const r = DUNGEONS.find(g => g.k === k).rw(lv); giveReward(r); questAdd('dungeon', 1); return r; }
export const REWARD_N = { gold: '골드', gems: '보석', keys: '열쇠', potion: '레벨업 물약', token: '기사단 증표', food: '펫 먹이' };

// ── 결투장 (10대10 비동기): 하루 도전권 5 · 이기면 점수 · 상대는 내 전투력 근처의 기사단
const NAMES = ['새벽의 검', '은빛 망토단', '북부 수비대', '등대지기들', '서리늑대', '황금 방패', '잿빛 깃털', '종소리 기사단', '협곡 사냥꾼', '별바다 원정대', '붉은 노을', '새싹 기사단', '첫서리', '안개 파수꾼', '강철 맹세'];
export function arenaFoes() {
  const d = load(), p = Math.max(1, teamPower()), pool = Object.keys(HEROES); let seed = (d.arena?.seed || 1);
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return [0.75, 0.95, 1.15].map((k, i) => { const team = Array.from({ length: 10 }, () => pool[Math.floor(r() * pool.length)]); return { n: NAMES[Math.floor(r() * NAMES.length)], power: Math.round(p * k * (0.95 + r() * 0.1)), team, pts: 10 + i * 8 }; });
}
export function arenaFight(foe) {
  const d = load(), dy = daily(); if (dy.arena <= 0) return null; dy.arena--; d.arena = d.arena || { pts: 1000, seed: 7, wins: 0 };
  const ratio = teamPower() / foe.power, chance = Math.max(0.05, Math.min(0.95, 0.5 + (ratio - 1) * 1.6)), win = Math.random() < chance;
  const gain = win ? foe.pts : -Math.round(foe.pts / 2); d.arena.pts = Math.max(0, d.arena.pts + gain); if (win) d.arena.wins++; d.arena.seed = (d.arena.seed * 48271) % 2147483647 || 7;
  const rw = win ? { gems: 15 + foe.pts, gold: Math.round(goldPerMob(d.maxStage) * 30) } : { gold: Math.round(goldPerMob(d.maxStage) * 8) }; giveReward(rw); questAdd('arena', 1); save();
  return { win, gain, rw, chance };
}
export const arenaTier = pts => pts >= 2000 ? ['전설 기사', '#FFC062'] : pts >= 1600 ? ['다이아 기사', '#7FDCFF'] : pts >= 1300 ? ['황금 기사', '#F2C46B'] : pts >= 1100 ? ['은 기사', '#C8D0E0'] : ['동 기사', '#C98A5E'];

// ── 펫: 하나를 데리고 다니면 기사단 전체 보너스 · 먹이로 레벨업
export const PET_STAT = { atk: '공격력', hp: '체력', gold: '골드 획득', crit: '치명타' };
export const petFood = lv => 5 + lv * 3;
export function petFeed(id) { const d = load(), lv = petLv(id), need = petFood(lv); if (!lv || (d.items.food || 0) < need) return false; d.items.food -= need; d.pets[id]++; save(); return true; }
export function petBuy(id) { const d = load(), P = PETS.find(p => p.id === id); if (petLv(id) || d.gems < P.cost) return false; d.gems -= P.cost; d.pets = d.pets || {}; d.pets[id] = 1; if (!d.pet) d.pet = id; save(); return true; }
export const activePet = () => { const d = load(); return d.pet && petLv(d.pet) ? d.pet : null; };

// ── 토벌 의뢰: 영웅을 보내 놓으면 시간이 지나 보상 (3칸 · 전투에는 그대로 참여)
export const QUESTS = [
  { k: 'q1', n: '협곡 순찰', h: 1, need: 3, rw: s => ({ gold: goldPerMob(s) * 200, keys: 3 }) },
  { k: 'q2', n: '숲길 괴물 토벌', h: 4, need: 5, rw: s => ({ gold: goldPerMob(s) * 700, keys: 10, gems: 20 }) },
  { k: 'q3', n: '사도의 흔적 추적', h: 8, need: 8, rw: s => ({ gold: goldPerMob(s) * 1500, keys: 20, gems: 50, potion: 5 }) },
];
export const disp = () => { const d = load(); d.disp = d.disp || {}; return d.disp; };
export function dispStart(k) { const q = QUESTS.find(x => x.k === k), d = load(); if (disp()[k] || Object.keys(d.heroes).length < q.need) return false; disp()[k] = Date.now() + q.h * 3600e3; save(); return true; }
export function dispClaim(k) { const t = disp()[k], q = QUESTS.find(x => x.k === k); if (!t || Date.now() < t) return null; delete disp()[k]; const r = q.rw(load().maxStage); giveReward(r); questAdd('dispatch', 1); save(); return r; }
