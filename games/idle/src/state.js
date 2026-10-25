// 경제 · 성장 · 전투 수치 (화면과 분리 — 밸런스 봇도 이 파일을 그대로 씀)
import { load, save } from './save.js?v=0.55.2';
import { HEROES, GRADES, ROLES, SLOTS, EQ_GRADES, CHEST_ODDS, SUMMON, SUMMONABLE, STAR_NEED, MAX_STAR, LEVEL_CAP, STAGES_PER_REGION, REGIONS, PETS } from './data.js?v=0.55.2';
// 펫 보너스(%)
export const petLv = id => ((load().pets || {})[id] || 0);
export const petBonus = (id, lv = petLv(id)) => { const P = PETS.find(p => p.id === id); return P && lv ? P.base * (1 + 0.25 * (lv - 1)) : 0; };
export const petStat = k => { const d = load(), P = PETS.find(p => p.id === d.pet); return P && P.stat === k ? petBonus(P.id) / 100 : 0; };
export const goldMul = () => 1 + petStat('gold');

export const fmt = n => { n = Math.floor(n); if (n < 1e4) return String(n); const u = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad']; let i = 0; let v = n; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; } return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$/, '') + u[i]; };
const rnd = a => a[Math.floor(Math.random() * a.length)];

// ── 스테이지: 1부터 · 20개마다 지역이 바뀌고 20번째는 사도
export const regionOf = s => Math.min(REGIONS.length - 1, Math.floor((s - 1) / STAGES_PER_REGION));
export const stageNo = s => (s - 1) % STAGES_PER_REGION + 1;
export const stageName = s => `${regionOf(s) + 1}-${stageNo(s)}`;
export const isHeraldStage = s => stageNo(s) === STAGES_PER_REGION;
export const bgOf = s => REGIONS[regionOf(s)].bg[Math.min(3, Math.floor((stageNo(s) - 1) / 5))];
// 적 능력 (스테이지가 오를수록 지수로 강해짐)
export const G = { hp: 1.16, atk: 1.125, gold: 1.12, cost: 1.13, lv: 1.1, hp0: 60, gold0: 1.2 };   // 성장률 (밸런스 봇으로 맞춤)
export const mobHp = s => Math.round(G.hp0 * Math.pow(G.hp, s - 1));
export const mobAtk = s => Math.round(5 * Math.pow(G.atk, s - 1));
export const bossHp = s => mobHp(s) * (isHeraldStage(s) ? 34 : 16);
export const bossAtk = s => mobAtk(s) * (isHeraldStage(s) ? 3.2 : 2.4);
export const goldPerMob = s => Math.max(1, Math.round(G.gold0 * Math.pow(G.gold, s - 1)));
export const BOSS_TIME = 40;   // 보스 제한 시간(초)
export const GAUGE_PER_MOB = 6;   // 보스 게이지 (100 이면 보스)

// ── 영웅 능력
export const heroLv = id => (load().heroes[id] || {}).lv || 1;
export const heroStar = id => (load().heroes[id] || {}).star || 1;
export function heroStats(id, lv = heroLv(id), star = heroStar(id)) {
  const H = HEROES[id], R = ROLES[H.role], g = GRADES[H.g].m, lvk = Math.pow(G.lv, lv - 1), sk = 1 + 0.32 * (star - 1), gb = gearBonus();
  return { atk: 10 * R.atk * g * lvk * sk * (1 + gb.atk + petStat('atk')), hp: 120 * R.hp * g * lvk * sk * (1 + gb.hp + petStat('hp')), crit: 0.08 + gb.crit + petStat('crit'), rate: R.rate, range: R.range };
}
export const levelCost = lv => Math.round(10 * Math.pow(G.cost, lv - 1));
export const levelCap = id => LEVEL_CAP(heroStar(id));
export function levelUp(id, n = 1) {
  const d = load(), h = d.heroes[id]; if (!h) return 0; let done = 0;
  for (let k = 0; k < n; k++) { if (h.lv >= LEVEL_CAP(h.star)) break; const c = levelCost(h.lv); if (d.gold < c) break; d.gold -= c; h.lv++; done++; }
  if (done) { d.stats.lvups += done; questAdd('lvup', done); save(); } return done;
}
export function potionUp(id, n = 1) { const d = load(), h = d.heroes[id]; let k = 0; while (k < n && h && (d.items.potion || 0) > 0 && h.lv < LEVEL_CAP(h.star)) { d.items.potion--; h.lv++; k++; } if (k) { questAdd('lvup', k); save(); } return k; }
export const TOKEN_SHARD = 30;   // 증표 30 → 조각 10
export function tokenShard(id) { const d = load(), h = d.heroes[id]; if (!h || (d.items.token || 0) < TOKEN_SHARD) return false; d.items.token -= TOKEN_SHARD; h.shards += 10; save(); return true; }
export function starUp(id) {
  const d = load(), h = d.heroes[id]; if (!h || h.star >= MAX_STAR) return false; const need = STAR_NEED[h.star];
  if (h.shards < need) return false; h.shards -= need; h.star++; questAdd('star', 1); save(); return true;
}
// 전투력: 팀 전체 (공격 x6 + 체력)
export const heroPower = id => { const s = heroStats(id); return Math.round(s.atk * 6 + s.hp * 0.6); };
export const teamPower = () => load().team.filter(Boolean).reduce((a, id) => a + heroPower(id), 0);

// ── 장비 (기사단 공용 6부위)
export const EQ_BASE = [3, 6, 10, 16, 25, 40];   // 등급별 기본 % 보너스
export const itemPower = it => it ? EQ_BASE[it.g] * (1 + 0.045 * (it.lv - 1)) : 0;
export const itemIcon = it => `eq${SLOTS.find(s => s.k === it.slot).sets[it.set] + it.g}`;
export function gearBonus() {
  const d = load(), b = { atk: 0, hp: 0, crit: 0 }; if (!d.gear) return b;
  for (const sl of SLOTS) { const it = d.gear[sl.k]; if (!it) continue; const p = itemPower(it) / 100; if (sl.stat === 'atk') b.atk += p; else if (sl.stat === 'hp') b.hp += p; else { b.crit += p * 0.25; b.atk += p * 0.5; } }
  return b;
}
export const itemDesc = it => { const sl = SLOTS.find(s => s.k === it.slot), p = itemPower(it); return sl.stat === 'atk' ? `공격력 +${p.toFixed(1)}%` : sl.stat === 'hp' ? `체력 +${p.toFixed(1)}%` : `치명타 +${(p * 0.25).toFixed(1)}% · 공격 +${(p * 0.5).toFixed(1)}%`; };
export const ITEM_NAMES = { weapon: ['검', '장검', '단검', '창', '전투 망치', '전투 도끼', '장궁', '석궁', '마법총', '지팡이'], helmet: ['투구', '전투 투구'], armor: ['천 갑옷', '로브', '가죽 갑옷', '튜닉', '판금 갑옷', '기사 갑옷', '중갑', '성기사 갑옷'], gloves: ['장갑'], boots: ['장화'], acc: ['반지', '팔찌', '목걸이', '허리띠', '귀걸이'] };
const PREFIX = ['낡은', '단단한', '빛나는', '여명의', '새벽 군주의', '태양의'];
export const itemName = it => `${PREFIX[it.g]} ${ITEM_NAMES[it.slot][it.set]}`;
export function rollItem(chestLv, maxStage) {
  const odds = CHEST_ODDS[Math.min(9, chestLv - 1)], tot = odds.reduce((a, b) => a + b, 0); let r = Math.random() * tot, g = 0;
  for (let i = 0; i < 6; i++) { if (r < odds[i]) { g = i; break; } r -= odds[i]; }
  const sl = rnd(SLOTS), set = Math.floor(Math.random() * sl.sets.length), lv = Math.max(1, Math.floor(maxStage / 2) + Math.floor(Math.random() * 3));
  return { slot: sl.k, set, g, lv };
}
export const sellValue = it => Math.round(goldPerMob(Math.max(1, it.lv * 2)) * (2 + it.g * 3));
// 장비 상자 열기 (열쇠 1) → 새 장비 (장착은 따로)
export function openChest() { const d = load(); if (d.keys < 1) return null; d.keys--; d.stats.chests++; questAdd('chest', 1); const it = rollItem(d.chestLv, d.maxStage); save(); return it; }
export function equip(it) { const d = load(), old = d.gear[it.slot]; d.gear[it.slot] = it; if (old) d.gold += sellValue(old); save(); return old; }
export function sell(it) { const d = load(); d.gold += sellValue(it); save(); }
export const better = it => { const cur = load().gear[it.slot]; return itemPower(it) > itemPower(cur); };

// ── 영웅 소환
export function summon(n) {
  const d = load(), free = n >= 10 && d.freePull > 0, cost = free ? 0 : n >= 10 ? SUMMON.cost10 : SUMMON.cost1 * n; if (d.gems < cost) return null; d.gems -= cost; if (free) d.freePull--;
  const s = d.summon, out = [];
  for (let k = 0; k < n; k++) {
    s.count++; s.pity++; let g;
    if (s.pity >= SUMMON.pity) g = 3;
    else { const r = SUMMON.rates(s.lv), tot = r.reduce((a, b) => a + b, 0); let x = Math.random() * tot; g = 0; for (let i = 0; i < 4; i++) { if (x < r[i]) { g = i; break; } x -= r[i]; } }
    if (n >= 10 && k === n - 1 && !out.some(o => HEROES[o.id].g >= 1) && g < 1) g = 1;   // 10회: 희귀 이상 1명 확정
    if (g === 3) s.pity = 0;
    const pool = SUMMONABLE.filter(id => HEROES[id].g === g), id = rnd(pool), had = !!d.heroes[id];
    if (had) d.heroes[id].shards += 10; else d.heroes[id] = { lv: 1, star: 1, shards: 0 };
    out.push({ id, isNew: !had });
    while (s.count >= SUMMON.lvNeed(s.lv) && s.lv < 10) s.lv++;
  }
  d.stats.summons += n; questAdd('summon', n); autoTeam(); save(); return out;
}
// 팀: 비어 있는 자리를 강한 영웅으로 채움 (최대 10)
export function autoTeam(force) {
  const d = load(); const own = Object.keys(d.heroes).sort((a, b) => heroPower(b) - heroPower(a));
  if (force) d.team = own.slice(0, 10); else { d.team = d.team.filter(id => d.heroes[id]); for (const id of own) if (d.team.length < 10 && !d.team.includes(id)) d.team.push(id); }
  save();
}
export function addHero(id) { const d = load(); if (d.heroes[id]) { d.heroes[id].shards += 10; save(); return false; } d.heroes[id] = { lv: Math.max(1, Math.floor(avgLv() * 0.8)), star: 1, shards: 0 }; autoTeam(); save(); return true; }
export const avgLv = () => { const t = load().team.filter(Boolean); return t.length ? t.reduce((a, id) => a + heroLv(id), 0) / t.length : 1; };

// ── 방치 보상: 지금 스테이지에서 1분에 잡는 몬스터 수를 어림 (최대 12시간)
export const OFFLINE_CAP = 12 * 3600;
export function offlineReward(sec) {
  const d = load(), s = Math.max(1, d.stage), t = Math.min(OFFLINE_CAP, Math.max(0, sec)), kills = t / 60 * 10;
  return { sec: t, gold: Math.round(kills * goldPerMob(s) * goldMul()), keys: Math.floor(t / 60 * 0.5), kills: Math.floor(kills) };
}

// ── 가이드 퀘스트 (끝없이 이어짐)
const QT = [
  { k: 'kill', n: '몬스터 처치', base: 30, step: 30 }, { k: 'lvup', n: '영웅 레벨업', base: 5, step: 5 }, { k: 'chest', n: '장비 상자 열기', base: 5, step: 5 },
  { k: 'stage', n: '스테이지 돌파', base: 2, step: 0 }, { k: 'kill', n: '몬스터 처치', base: 50, step: 40 }, { k: 'summon', n: '영웅 소환', base: 1, step: 2 }, { k: 'boss', n: '보스 처치', base: 1, step: 1 },
];
export function quest() { const d = load(), i = d.quest.i, t = QT[i % QT.length], round = Math.floor(i / QT.length);
  const need = t.k === 'stage' ? d.quest.base : t.base + t.step * round; return { ...t, need, have: t.k === 'stage' ? Math.min(d.maxStage - 1, need) : d.quest.prog, reward: { gems: 30 + round * 5, keys: 3 + round } }; }
export function questAdd(k, n = 1) { const d = load(); if (!d.quest) return; const t = QT[d.quest.i % QT.length]; if (t.k === k) d.quest.prog += n; }
export function questClaim() { const d = load(), q = quest(); if (q.have < q.need) return null; d.gems += q.reward.gems; d.keys += q.reward.keys; d.quest.i++; d.quest.prog = 0; const t = QT[d.quest.i % QT.length]; if (t.k === 'stage') d.quest.base = d.maxStage + 1; /* 지금 깬 곳 + 2 */ save(); return q.reward; }
