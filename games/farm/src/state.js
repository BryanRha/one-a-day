// 저장 · 규칙: 헛간 · 경험치 · 밭 · 동물 · 공장 줄 · 주문 게시판 · 기차 · 퀘스트 · 월세 · 강아지
import { FUP, TRAINS, ZOO_CAP_H, ISLE, MATS, ALL_MATS, BMATS, siteNeed, RELICS, RESEARCH, RES_MAX, resCost, resTime } from './data.js?v=0.57.2';
import { ITEMS, CROPS, RECIPES, BUILDS, BASE_CAP, XP_NEED, LV_REWARD, BARN, MAP, ZONE, START_ZONES, ZONE_COST, QUESTS, RENT, MAX_LV, SUITORS, HEARTS, HEART_PTS, MINE } from './data.js?v=0.57.2';

const KEY = 'thefarm_v1';
let d = null;
const now = () => Date.now();
export const DAY = 864e5, dayNo = () => Math.floor((now() - new Date().getTimezoneOffset() * 6e4) / DAY), weekNo = () => Math.floor((dayNo() + 3) / 7);
function fresh() {
  const objs = [], id = () => objs.length + 1;
  // 처음 농장: 가운데에 밭 6칸(밀 익음) · 사료 공장 자리 비움 · 오두막 하나
  const c = 13;
  for (let k = 0; k < 6; k++) objs.push({ id: id(), b: 'field', x: c + (k % 3), y: c + Math.floor(k / 3), crop: 'wheat', at: 0 });
  objs.push({ id: id(), b: 'cottage', x: c + 4, y: c - 1 });
  return { v: 1, sfx: true, music: true, coins: 60, gems: 20, tools: 0, xp: 0, lv: 1, items: { wheat: 4, corn: 4 }, objs, seq: objs.length,
    zones: [...START_ZONES], barnLv: 0, orders: [], orderSeq: 0, train: null, quest: 0, qp: {}, talked: -1, rent: { week: weekNo(), paid: false }, dig: { day: -1, n: 0, spot: null }, brook: -1, stats: { harvest: 0, orders: 0, trains: 0 }, tut: 0, love: { hans: 0, sam: 0, ian: 0 }, spouse: null, proposed: null, mine: null, mini: { day: -1, n: 0 }, map6: true };
}
export function load() {
  if (d) return d;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { d = null; }
  const f = fresh(); if (!d || d.v !== 1) d = f;
  const oldMap = d !== f && !d.map6;   // 합치기 전에 판별 (fresh 의 map6 이 덮이기 전)
  for (const k of Object.keys(f)) if (d[k] === undefined) d[k] = f[k];
  // v0.6: 지도 20×20(구역 4×4) → 30×30(6×6) · 예전 마을을 가운데로 한 구역씩 옮김
  if (oldMap) { d.map6 = true; d.zones = d.zones.map(z => (Math.floor(z / 4) + 1) * 6 + z % 4 + 1); for (const o of d.objs) { o.x += 5; o.y += 5; } if (d.dig && d.dig.spot) d.dig.spot = null; }
  // v0.9: 공사 중이던 집은 바로 완성 (집은 공사장이 필요 없게 바뀜)
  for (const o of d.objs) if (o.site && BUILDS[o.b] && BUILDS[o.b].k === 'house') o.site = null;
  // v0.9.5: 예전 규칙에서 상한보다 많이 지은 집 → 상한을 지금 주민 수까지 올려 줌 (60/20 같은 표시가 안 나오게)
  if (!d.capFix) { d.capFix = true; const pn = d.objs.reduce((a, o) => a + (BUILDS[o.b] && !o.site ? BUILDS[o.b].give || 0 : 0), 0), pc = BASE_CAP + d.objs.reduce((a, o) => a + (BUILDS[o.b] && !o.site ? BUILDS[o.b].cap || 0 : 0), 0); if (pn > pc) d.capBonus = pn - pc; }
  // v0.5: 공구(하나로 묶인 재화) → 건축 재료 6종으로 나눠 줌
  if (d.tools > 0) { const n = d.tools; d.tools = 0; giveMats(n); }
  return d;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
export function reset() { d = fresh(); save(); }

// ── 헛간
export const barnCap = () => BARN.base + load().barnLv * BARN.step + 20 * rl('barn');
export const barnUsed = () => Object.entries(load().items).reduce((s, [k, n]) => s + n, 0);
export const has = (k, n = 1) => (load().items[k] || 0) >= n;
export function add(k, n) { const it = load().items; it[k] = Math.max(0, (it[k] || 0) + n); if (!it[k]) delete it[k]; }
export const canFit = n => barnUsed() + n <= barnCap();
export const hasAll = need => Object.entries(need).every(([k, n]) => has(k, n));
export function take(need) { if (!hasAll(need)) return false; for (const [k, n] of Object.entries(need)) add(k, -n); return true; }

// ── 경험치 · 레벨 (레벨업 보상 목록 돌려줌)
export function gainXp(n) { const s = load(); s.xp += n; const ups = []; while (s.lv < MAX_LV && s.xp >= XP_NEED(s.lv)) { s.xp -= XP_NEED(s.lv); s.lv++; const r = LV_REWARD(s.lv); s.coins += r.coins; s.gems += r.gems; giveMats(r.tools); if (s.lv >= 4) r.bm = giveBm(2); ups.push({ lv: s.lv, ...r }); } return ups; }
export function give(r) { const s = load(); if (r.bm && typeof r.bm === 'number') giveBm(r.bm); if (r.coins) s.coins += r.coins; if (r.gems) s.gems += r.gems; if (r.tools) giveMats(r.tools); if (r.items) for (const [k, n] of Object.entries(r.items)) add(k, n); return r.xp ? gainXp(r.xp) : []; }

// ── 건축 재료: 헛간용(망치·못·페인트) · 땅용(톱·널빤지·밧줄) · 보상의 tools n = 재료 n개를 고르게 섞어서
export let lastMats = {};
export function giveMats(n) { lastMats = {}; if (!n) return lastMats; const it = load().items;
  for (let k = 0; k < n; k++) { const pool = ALL_MATS.map(m => [m, 1 / (1 + (it[m] || 0))]), tot = pool.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot, pick = pool[0][0]; for (const [m, w] of pool) { if (r < w) { pick = m; break; } r -= w; } add(pick, 1); lastMats[pick] = (lastMats[pick] || 0) + 1; }   // 적게 가진 재료가 잘 나옴
  return lastMats; }
export const matCount = () => ALL_MATS.reduce((a, m) => a + (load().items[m] || 0), 0);
export const missing = need => Object.entries(need).reduce((a, [k, n]) => a + Math.max(0, n - (load().items[k] || 0)), 0);
export const gemFill = need => missing(need) * 4;   // 모자란 재료 1개 = 보석 4
// 코인 + 재료 지불 · useGems 면 모자란 재료를 보석으로 채움
export function payCost(c, useGems) { const s = load(), need = c.mats || {}, g = useGems ? gemFill(need) : 0; if (s.coins < (c.coins || 0)) return '코인이 모자라요'; if (!useGems && missing(need)) return '재료가 모자라요'; if (s.gems < g) return '보석이 모자라요';
  s.coins -= c.coins || 0; s.gems -= g; for (const [k, n] of Object.entries(need)) add(k, -Math.min(n, s.items[k] || 0)); return null; }
// 수확할 때 가끔 건축 재료가 떨어짐 (타운십처럼)
export function matDrop(fields) { let out = null; for (let k = 0; k < fields; k++) if (Math.random() < 0.05) { const m = giveMats(1); out = Object.keys(m)[0]; } return out; }

// ── 인구
export const popNow = () => load().objs.reduce((s, o) => s + (o.site ? 0 : BUILDS[o.b].give || 0), 0);
export const popCap = () => BASE_CAP + (load().capBonus || 0) + load().objs.reduce((s, o) => s + (o.site ? 0 : BUILDS[o.b].cap || 0), 0);
export const pop = () => popNow();   // 타운십처럼: 상한은 '집을 더 짓는 것'만 막고, 이미 사는 주민은 모두 인구로 셈
export const countOf = b => load().objs.filter(o => o.b === b && !o.site).length;   // 공사 중인 건물은 빼고
export function canBuild(b) { const B = BUILDS[b], s = load(); if (B.lim) return s.lim && s.lim[b] > 0 ? null : '계절 한정 · 이벤트의 계절 상점에서 받아요'; if (s.lv < B.lv) return `레벨 ${B.lv}에 열려요`; if (B.k === 'deco') return s.coins < costOf(b) ? `코인 ${costOf(b)} 필요` : null; if (B.pop && pop() < B.pop) return `인구 ${B.pop}명 필요 (지금 ${pop()}명) · 집을 더 지어요`; if (B.k === 'house' && popNow() + B.give > popCap()) return `인구 상한 ${popCap()}명 · 우물·성당 같은 공공건물로 상한을 늘려요`; if (B.k === 'field' && countOf('field') >= B.max(s.lv)) return `밭은 레벨 ${s.lv}에서 ${B.max(s.lv)}칸까지`; if (B.k !== 'field' && B.k !== 'house' && B.k !== 'public' && B.k !== 'deco' && load().objs.some(o => o.b === b)) return '이미 있어요'; if (s.coins < costOf(b)) return `코인 ${costOf(b)} 필요`; return null; }
// 한스와 결혼하면 건설비 10% 할인
export const costOf = b => BUILDS[b].lim ? 0 : Math.round(BUILDS[b].cost * (load().spouse === 'hans' ? 0.9 : 1));

// ── 땅 (5×5 구역)
export const zoneOf = (x, y) => Math.floor(y / ZONE) * (MAP / ZONE) + Math.floor(x / ZONE);
export const open = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && load().zones.includes(zoneOf(x, y));
export const zoneNext = z => { const n = MAP / ZONE, zx = z % n, zy = Math.floor(z / n); return load().zones.some(o => Math.abs(o % n - zx) + Math.abs(Math.floor(o / n) - zy) === 1); };
export const zoneCost = () => ZONE_COST(load().zones.length - START_ZONES.length);
export function objAt(x, y) { return load().objs.find(o => { const s = BUILDS[o.b].sz; return x >= o.x && x < o.x + s && y >= o.y && y < o.y + s; }); }
export function freeRect(x, y, sz, ignore) { for (let i = 0; i < sz; i++) for (let j = 0; j < sz; j++) { if (!open(x + i, y + j)) return false; const o = objAt(x + i, y + j); if (o && o !== ignore) return false; if (load().dig.spot && load().dig.spot[0] === x + i && load().dig.spot[1] === y + j) return false; } return true; }

// ── 밭
export const cropReady = o => o.crop && now() >= o.at;
export const cropTime = k => CROPS[k].t * (load().spouse === 'sam' ? 0.9 : 1) * (1 - 0.05 * rl('crop'));
// ── 공장 줄: 차례로 · 끝난 것은 done 에 (헛간에 넣을 때까지 대기)
export function tickFactory(o) { o.q = o.q || []; o.done = o.done || []; let ch = false; while (o.q.length && o.q[0].end <= now()) { o.done.push(o.q.shift().it); ch = true; } return ch; }
export function queueJob(o, it) { const R = RECIPES[it], B = BUILDS[o.b]; tickFactory(o); if (o.q.length + o.done.length >= (B.slots + (o.extra || 0))) return o.done.length ? '다 된 물건을 먼저 거둬요 (초록 칸을 눌러요)' : '생산 칸이 꽉 찼어요'; if (!take(R.in)) return '재료가 모자라요'; const last = o.q.length ? o.q[o.q.length - 1].end : now(); o.q.push({ it, end: Math.max(last, now()) + R.t * 1000 * FUP.k(o.up || 0) * (1 - 0.04 * rl('fac')) }); return null; }
// ── 동물 우리: 3칸 동시
export function tickAnimal(o) { o.s = o.s || [0, 0, 0]; o.ready = o.ready || 0; let ch = false; o.s.forEach((e, i) => { if (e && e <= now()) { o.s[i] = 0; o.ready++; ch = true; } }); return ch; }
export const productOf = b => Object.keys(RECIPES).find(k => RECIPES[k].b === b);
// 한 마리씩 먹이 주기 (타운십처럼)
export function feedOne(o, i) { tickAnimal(o); const it = productOf(o.b), R = RECIPES[it]; if (o.s[i]) return '아직 먹는 중이에요'; if (o.ready + o.s.filter(Boolean).length >= 3) return '다 된 것부터 거둬요'; if (!take(R.in)) return `${iga(ITEMS[Object.keys(R.in)[0]].n)} 없어요 · 사료 공장에서 만들어요`; o.s[i] = now() + R.t * 1000 * (1 - 0.05 * rl('anim')); return null; }
export function feedAll(o) { tickAnimal(o); const it = productOf(o.b), R = RECIPES[it]; let n = 0; o.s.forEach((e, i) => { if (!e && o.ready + o.s.filter(Boolean).length < 3 && take(R.in)) { o.s[i] = now() + R.t * 1000 * (1 - 0.05 * rl('anim')); n++; } }); return n; }

// ── 주문 게시판 (타운십의 헬리콥터 주문): 6장 · 완료 후 60초 뒤 새 주문
// 광산에서 캐야 하는 것(광석·점토)이나 도구가 들어가는 물건은 주문·기차·비행기에 내지 않음 (계획해서 만들 수 없음)
const MINE_IN = new Set(['ironore', 'goldore', 'clay']), TOOLS = new Set(['pickaxe', 'dynamite', 'axe', 'shovel']), mineMemo = {};
const needsMine = it => { if (it in mineMemo) return mineMemo[it]; mineMemo[it] = false; const R = RECIPES[it]; const v = MINE_IN.has(it) || TOOLS.has(it) || !!ITEMS[it].rare || !!(R && Object.keys(R.in).some(needsMine));   /* 희귀 재료(항구·섬)도 */ return (mineMemo[it] = v); };
const unlockedGoods = () => (unlockedAll()).filter(k => !needsMine(k) && !ITEMS[k].rare && !ITEMS[k].mat && !ITEMS[k].bm && !BUILDS[(RECIPES[k] || {}).b || 'field']?.lab);
const unlockedAll = () => { const s = load(), out = Object.keys(CROPS).filter(k => CROPS[k].lv <= (s.lv || 1)); if (!out.includes('wheat')) out.push('wheat'); for (const [k, R] of Object.entries(RECIPES)) if (countOf(R.b) && (R.lv || 1) <= s.lv) out.push(k); return out; };
function makeOrder(brook) {
  const s = load(), g = unlockedGoods(), kinds = 1 + Math.floor(Math.random() * Math.min(3, 1 + s.lv / 4)), items = {};
  for (let k = 0; k < kinds; k++) { const it = g[Math.floor(Math.random() * g.length)]; const cheap = ITEMS[it].v <= 3; items[it] = (items[it] || 0) + (cheap ? 2 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2)); }
  const val = Object.entries(items).reduce((a, [k, n]) => a + ITEMS[k].v * n, 0), faces = ['hans', 'sam', 'ian', 'brook', 'pachulo'];
  if (brook && countOf('harbor')) { const rare = ['pineapple', 'coconut', 'spice', 'coffee', 'cocoa', 'silk'].filter(k => s.lv >= 16); const it = rare[Math.floor(Math.random() * rare.length)]; if (it) items[it] = 1; }
  const val2 = Object.entries(items).reduce((a, [k, n]) => a + ITEMS[k].v * n, 0);
  return { id: ++s.orderSeq, face: brook ? 'brook' : faces[Math.floor(Math.random() * faces.length)], items, coins: Math.round(val2 * (brook ? 2.4 : 1.5) + 5), xp: Math.max(2, Math.round(val2 / 4)) * (brook ? 2 : 1), at: 0, bm: s.lv >= 4 && Math.random() < 0.35 ? 1 : 0, brook: !!brook, tools: brook ? 2 : Math.random() < 0.15 ? 1 : 0 };
}
export function fillOrders() {
  const s = load(); while (s.orders.length < 6) s.orders.push({ ...makeOrder(false), at: 0 });
  // 브룩의 정기 손님 날 (매달 7·14·21·28일)
  const dd = new Date().getDate(); if ([7, 14, 21, 28].includes(dd) && s.brook !== dayNo()) { s.brook = dayNo(); s.orders[0] = makeOrder(true); }
}
export function doOrder(i) { const s = load(), o = s.orders[i]; if (!o || o.at > now() || !take(o.items)) return null; const bonus = Math.round(o.coins * (joyBonus() + (s.spouse === 'ian' ? 0.1 : 0) + 0.04 * rl('order'))); s.coins += o.coins + bonus; o.bonusC = bonus; giveMats(o.tools); if (o.bm) giveBm(o.bm); s.stats.orders++; progress('order', 1); const ups = gainXp(o.xp); s.orders[i] = { ...makeOrder(false), at: now() + 60000 }; return { o, ups }; }
export function dropOrder(i) { const s = load(); s.orders[i] = { ...makeOrder(false), at: now() + 30000 }; }

// ── 기차: 3칸 · 다 채우면 떠났다가 3분 뒤 새 주문으로 돌아옴
// 기차 여러 대 (레벨 2 · 12 · 22): trainN(i) · 예전 train() 은 첫 기차
function newTrain() { const s = load(), g = unlockedGoods(); return { away: false, cars: [0, 1, 2].map(k => { const it = g[Math.floor(Math.random() * g.length)], n = ITEMS[it].v <= 3 ? 3 + Math.floor(Math.random() * 3) : ITEMS[it].v <= 12 ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2); return { it, n, done: false, r: k === 2 ? { tools: 1 + Math.floor(s.lv / 6) } : { coins: Math.round((ITEMS[it].v * n * 1.6 + 8) * (1 + 0.1 * rl('train'))), xp: Math.round((2 + Math.round(ITEMS[it].v * n / 6)) * (1 + 0.1 * rl('train'))) } }; }) }; }
export function trainN(ti) { const s = load(); if (s.lv < TRAINS[ti]) return null; if (!s.trains) s.trains = [s.train || null, null, null]; let t = s.trains[ti]; if (!t || (t.away && t.back <= now())) t = s.trains[ti] = newTrain(); return t; }
export const train = () => trainN(0);
export const trainCount = () => TRAINS.filter(l => load().lv >= l).length;
// 모자란 만큼 보석으로 채워 싣기 (모자란 물건 1개 = 💎 값/15, 최소 1)
export const carGem = (k, ti = 0) => { const t = trainN(ti), c = t && t.cars[k]; if (!c) return 0; const lack = Math.max(0, c.n - (load().items[c.it] || 0)); return lack ? Math.max(1, Math.ceil(lack * ITEMS[c.it].v / 15)) : 0; };
export function loadCar(k, ti = 0, gems = false) { const t = trainN(ti); if (!t || t.away) return null; const c = t.cars[k]; if (c.done) return null;
  if (gems) { const g = carGem(k, ti), s0 = load(); if (s0.gems < g) return null; s0.gems -= g; add(c.it, Math.max(0, c.n - (s0.items[c.it] || 0))); }
  if (!take({ [c.it]: c.n })) return null; c.done = true; const ups = give(c.r); c.bm = giveBm(1); if (t.cars.every(x => x.done)) { t.away = true; t.back = now() + 120000 * (ti + 1); load().stats.trains++; progress('train', 1); } return { r: c.r, ups, left: t.away }; }

// ── 퀘스트 (이야기 1장)
export const quest = () => QUESTS[load().quest] || null;
export function progress(kind, v) { const s = load(), q = quest(); if (kind === 'make') { s.stats.mk = s.stats.mk || {}; s.stats.mk[v.it] = (s.stats.mk[v.it] || 0) + v.n; } if (kind === 'isle') s.stats.isle = (s.stats.isle || 0) + 1; if (!q) return; const g = q.goal; if (kind in g || kind === 'make' && g.make) { if (kind === 'make') { s.qp.make = s.qp.make || {}; s.qp.make[v.it] = (s.qp.make[v.it] || 0) + v.n; } else s.qp[kind] = (s.qp[kind] || 0) + (typeof v === 'number' ? v : 1); } }
export function questDone() { const s = load(), q = quest(); if (!q) return false; const g = q.goal, p = s.qp;
  if (g.site) return (p.site || 0) >= g.site; if (g.road) return s.objs.filter(o => o.b === 'road').length >= g.road; if (g.relic) return relic().done.length >= g.relic;
  if (g.harvest) return (p.harvest || 0) >= g.harvest; if (g.build) return countOf(g.build) > 0; if (g.order) return (p.order || 0) >= g.order; if (g.train) return (p.train || 0) >= g.train;
  if (g.make) return Object.entries(g.make).every(([k, n]) => (p.make && p.make[k] || 0) >= n); if (g.zone) return s.zones.length - 4 >= g.zone; if (g.rent) return s.rent.paid || (p.rent || 0) >= 1; if (g.level) return s.lv >= g.level; if (g.deco) return s.objs.filter(o => BUILDS[o.b].k === 'deco').length >= g.deco; if (g.mini) return (p.mini || 0) >= g.mini; if (g.gift) return (p.gift || 0) >= g.gift; if (g.hearts) return Math.max(...Object.values(s.love)) >= HEARTS * HEART_PTS; if (g.married) return !!s.spouse; if (g.plane) return (p.plane || 0) >= g.plane; if (g.isle) return (p.isle || 0) >= g.isle; if (g.boss) return (p.boss || 0) >= g.boss; return false; }
export const questProg = () => { const s = load(), q = quest(); if (!q) return ''; const g = q.goal, p = s.qp; if (g.harvest) return `${Math.min(p.harvest || 0, g.harvest)}/${g.harvest}`; if (g.order) return `${Math.min(p.order || 0, g.order)}/${g.order}`; if (g.make) { const [k, n] = Object.entries(g.make)[0]; return `${Math.min(p.make && p.make[k] || 0, n)}/${n}`; } if (g.level) return `${s.lv}/${g.level}`; return questDone() ? '완료' : ''; };
export function claimQuest() { const s = load(), q = quest(); if (!q || !questDone()) return null; s.quest++; s.qp = {}; return { q, ups: give(q.reward) }; }

// ── 월세 (원작: 매달 30일 월세 → 여기선 이번 주 목표 · 못 내도 게임 오버 없음)
export function rent() { const s = load(); if (s.rent.week !== weekNo()) s.rent = { week: weekNo(), paid: false }; return { ...s.rent, goal: RENT.goal(Math.min(10, Math.floor(s.lv / 2))) }; }
export function payRent() { const s = load(), r = rent(); if (r.paid || s.coins < r.goal) return null; s.coins -= r.goal; s.rent.paid = true; progress('rent', 1); return give(RENT.reward); }

// ── 강아지 땅파기: 하루 3번 · 빈 풀밭에 반짝이 자리
export function digSpot() {
  const s = load(); if (s.dig.day !== dayNo()) s.dig = { day: dayNo(), n: 0, spot: null };
  if (!s.dig.spot && s.dig.n < 3 && s.lv >= 2) { for (let k = 0; k < 60; k++) { const x = Math.floor(Math.random() * MAP), y = Math.floor(Math.random() * MAP); if (open(x, y) && !objAt(x, y)) { s.dig.spot = [x, y]; break; } } }
  return s.dig.spot;
}
export function digUp() { const s = load(); if (!s.dig.spot) return null; s.dig.spot = null; s.dig.n++; const opts = [{ coins: 20 + s.lv * 5 }, { tools: 1 }, { gems: 2 }, { items: { corn: 3 } }, { items: { wheat: 5 } }, { coins: 40 }]; const r = opts[Math.floor(Math.random() * opts.length)]; give(r); return r; }
export const rewardText = r => [r.coins && `🪙${r.coins}`, r.gems && `💎${r.gems}`, r.tools && `🧰재료 ${r.tools}`, r.bm && `🧱자재 ${typeof r.bm === 'number' ? r.bm : Object.values(r.bm).reduce((a, b) => a + b, 0)}`, r.xp && `⭐${r.xp}`, r.items && Object.entries(r.items).map(([k, n]) => `${ITEMS[k].n} ${n}`).join(' ')].filter(Boolean).join('  ');

// ── 매력(장식) → 주문 코인 보너스 (최대 +30%)
export const joy = () => load().objs.reduce((t, o) => t + (BUILDS[o.b].joy || 0), 0);
export const joyBonus = () => Math.min(0.5, joy() / 400);   // 최대 +50%
// ── 호감도 · 결혼
export function giftTo(who, it) { const s = load(); if (s.spouse || !has(it)) return null; add(it, -1); const liked = SUITORS[who].likes.includes(it), pts = liked ? 25 + Math.round(ITEMS[it].v / 3) : 8; s.love[who] = Math.min(HEARTS * HEART_PTS, s.love[who] + pts); progress('gift', 1); return { pts, liked }; }
export const hearts = who => Math.floor(load().love[who] / HEART_PTS);
export function marry(who) { const s = load(); if (s.spouse || hearts(who) < HEARTS || !countOf('wedding')) return false; s.spouse = who; give(SUITORS[who].gift); return true; }
// ── 광산: 바위 판 (곡괭이 1개 = 1칸 · 다이너마이트 = 3×3) · 다 캐면 새 층
function newMine(depth) { const cells = []; for (let i = 0; i < MINE.cols * MINE.rows; i++) { let r = Math.random(), k = 'rock'; for (const [kk, w] of MINE.rocks) { if (r < w) { k = kk; break; } r -= w; } cells.push(k); } return { depth, cells }; }
export function mine() { const s = load(); if (!s.mine) s.mine = newMine(1); return s.mine; }
const LOOT = { rock: null, rock_iron: { items: { ironore: 1 } }, rock_gold: { items: { goldore: 1 } }, rock_gem: { gems: 2 }, chest: { coins: 80, tools: 1 }, dirt: { items: { clay: 2 } } };
export function mineHit(i, boom) { const m = mine(), out = []; const hit = j => { if (j < 0 || j >= m.cells.length || !m.cells[j]) return; const r = LOOT[m.cells[j]]; m.cells[j] = null; if (r) { give(r); if (r.items) for (const [k, n] of Object.entries(r.items)) progress('make', { it: k, n }); out.push({ j, r }); } else out.push({ j, r: null }); };
  if (boom) { if (!take({ dynamite: 1 })) return null; const c = i % MINE.cols, r = Math.floor(i / MINE.cols); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (c + dx >= 0 && c + dx < MINE.cols) hit(i + dy * MINE.cols + dx); }
  else { if (!m.cells[i] || !take({ pickaxe: 1 })) return null; hit(i); }
  if (m.cells.every(c => !c)) load().mine = newMine(m.depth + 1); out.relic = relicDrop(0.07 * out.length); return out; }
// ── 미니게임: 하루 3번
export function miniLeft() { const s = load(); if (s.mini.day !== dayNo()) s.mini = { day: dayNo(), n: 0 }; return 3 - s.mini.n; }
export function miniDone(score) { const s = load(); miniLeft(); s.mini.n++; progress('mini', 1); const r = { coins: 20 + score * 6, xp: 3 + score, tools: score >= 12 ? 1 : 0 }; return { r, ups: give(r) }; }

// ── 공장 업그레이드
export function upgradeFactory(o, useGems) { const lv = o.up || 0; if (lv >= FUP.max) return '최고 단계예요'; const e = payCost(FUP.cost(o.b, lv), useGems); if (e) return e; o.up = lv + 1; return null; }
// ── 비행기 주문 (공항): 화물 6칸 · 칸마다 보상 · 다 채우면 큰 보상 · 1시간 뒤 다음 비행기
export function plane() { const s = load(); if (!countOf('airport')) return null; let p = s.plane; if (!p || (p.away && p.back <= now())) { const g = unlockedGoods(); p = s.plane = { away: false, crates: [0, 1, 2, 3, 4, 5].map(() => { const it = g[Math.floor(Math.random() * g.length)], n = ITEMS[it].v <= 6 ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2); return { it, n, done: false, r: { coins: Math.round(ITEMS[it].v * n * 1.8 + 10), xp: 3 + Math.round(ITEMS[it].v * n / 5) } }; }) }; } return p; }
export const PLANE_BONUS = { gems: 6, tools: 3 };
export function loadCrate(i) { const p = plane(); if (!p || p.away) return null; const c = p.crates[i]; if (c.done || !take({ [c.it]: c.n })) return null; c.done = true; let ups = give(c.r), all = false; if (p.crates.every(x => x.done)) { all = true; p.away = true; p.back = now() + 3600000; ups = ups.concat(give(PLANE_BONUS)); giveBm(3); progress('plane', 1); } return { r: c.r, ups, all }; }
// ── 동물원: 동물 우리마다 방문객 코인이 쌓임
export function zooCoins(o) { if (!countOf('zoogate')) return 0; o.at = o.at || now(); const h = Math.min(ZOO_CAP_H, (now() - o.at) / 36e5); return Math.floor(h * BUILDS[o.b].rate * (1 + 0.1 * rl('zoo'))); }
export function zooCollect(o) { const c = zooCoins(o); if (c < 1) return 0; load().coins += c; o.at = now(); gainXp(Math.ceil(c / 40)); return c; }
// ── 섬 원정: 섬마다 테마 · 가운데 2×2 보스 보물 (정해진 도구로 hp 번 두드림)
export const isleTheme = n => ISLE.themes[n % ISLE.themes.length];
const BOSS_CELLS = [2 + 3 * ISLE.cols, 3 + 3 * ISLE.cols, 2 + 4 * ISLE.cols, 3 + 4 * ISLE.cols];
function newIsle(n) { const th = isleTheme(n), ws = Object.entries(th.w), cells = []; for (let i = 0; i < ISLE.cols * ISLE.rows; i++) { if (BOSS_CELLS.includes(i)) { cells.push('boss'); continue; } let r = Math.random(), t = ws[0][0]; for (const [k, w] of ws) { if (r < w) { t = k; break; } r -= w; } cells.push(t); } return { n, cells, hp: th.boss.hp }; }
export function isle() { const s = load(); if (!s.isle) s.isle = newIsle(0); if (s.isle.hp === undefined) s.isle = newIsle(s.isle.n || 0); return s.isle; }
export const isleTool = t => t === 'boss' ? isleTheme(isle().n).boss.tool : (ISLE.tiles.find(x => x[0] === t) || [])[1];
export const BOSS = BOSS_CELLS;
export function isleHit(i) { const m = isle(), t = m.cells[i]; if (!t) return null; const tool = isleTool(t); if (!take({ [tool]: 1 })) return { need: tool };
  let r = null, boss = null;
  if (t === 'boss') { m.hp--; if (m.hp > 0) return { r: null, bossHit: m.hp }; for (const j of BOSS_CELLS) m.cells[j] = null; boss = isleTheme(m.n).boss; r = boss.r; giveBm(4); progress('boss', 1); progress('isle', 1); }
  else { m.cells[i] = null; progress('isle', 1);
    if (t === 'treasure') { const rare = ['pineapple', 'coconut', 'coffee', 'cocoa', 'spice', 'silk', 'pearl']; const it = rare[Math.floor(Math.random() * rare.length)]; r = { items: { [it]: 1 + Math.floor(Math.random() * 2) }, gems: 3 }; } else if (Math.random() < 0.25) r = [{ coins: 30 + load().lv * 3 }, { tools: 1 }][Math.floor(Math.random() * 2)]; }
  const rel = relicDrop(0.05); if (r) give(r); let done = false; if (m.cells.every(c => !c)) { done = true; give({ gems: 25, tools: 5, coins: 500 }); load().isle = newIsle(m.n + 1); } return { r, done, boss, relic: rel }; }

// ── 건설 자재 (벽돌 · 유리 · 석판): 적게 가진 것이 잘 나옴
export function giveBm(n) { const it = load().items, got = {}; for (let k = 0; k < n; k++) { const m = [...BMATS].sort((a, b) => (it[a] || 0) - (it[b] || 0) + Math.random() * 1.5 - 0.75)[0]; add(m, 1); got[m] = (got[m] || 0) + 1; } return got; }
// ── 공사장: 짓기 → 자재를 채우면 완성
export function newSite(b) { const n = siteNeed(b); return n ? { ...n } : null; }
export function finishSite(o, useGems) { if (!o.site) return null; const e = payCost({ mats: o.site }, useGems); if (e) return e; o.site = null; progress('site', 1); return null; }
// ── 박물관 유물
export const relic = () => { const s = load(); if (!s.relic) s.relic = { have: {}, done: [] }; return s.relic; };
export function relicDrop(ch) { if (Math.random() >= ch) return null; const all = [...new Set(RELICS.flatMap(r => r.s))], it = all[Math.floor(Math.random() * all.length)], r = relic(); r.have[it] = (r.have[it] || 0) + 1; return it; }
export function relicClaim(i) { const r = relic(), S = RELICS[i]; if (r.done.includes(i) || !S.s.every(k => r.have[k])) return null; for (const k of S.s) r.have[k]--; r.done.push(i); return give(S.r) || []; }
// ── 시장: 하루에 한 번 바뀌는 가판 8칸 (코인으로 사기 · 칸마다 5개)
export function market() { const s = load(); if (!s.market || s.market.day !== dayNo()) { const g = unlockedGoods().filter(k => !ITEMS[k].rare), st = []; for (let k = 0; k < 8 && g.length; k++) { const it = g.splice(Math.floor(Math.random() * g.length), 1)[0]; st.push({ it, n: 5, price: Math.max(3, Math.round(ITEMS[it].v * 2.2)) }); } s.market = { day: dayNo(), st }; } return s.market; }
export function marketBuy(i) { const s = load(), c = market().st[i]; if (!c || !c.n) return '다 팔렸어요'; if (s.coins < c.price) return '코인이 모자라요'; if (!canFit(1)) return '헛간이 꽉 찼어요'; s.coins -= c.price; c.n--; add(c.it, 1); return null; }
// ── 보석으로 시간 줄이기: 남은 5분마다 보석 1 (최소 1)
export const speedCost = sec => Math.max(1, Math.ceil(sec / 300));
export function speedField(o) { const s = load(); if (!o.crop || cropReady(o)) return null; const c = speedCost((o.at - now()) / 1000); if (s.gems < c) return '보석이 모자라요'; s.gems -= c; o.at = now(); return null; }
export function speedFactory(o) { const s = load(); tickFactory(o); if (!o.q.length) return null; const j = o.q[0], c = speedCost((j.end - now()) / 1000); if (s.gems < c) return '보석이 모자라요'; s.gems -= c; const cut = j.end - now(); for (const x of o.q) x.end -= cut; tickFactory(o); return null; }

// ── 연구소: 한 번에 하나 · 단계마다 코인 + 시약·톱니바퀴·설계도 + 시간
export const lab = () => { const s = load(); if (!s.lab) s.lab = { lv: {}, cur: null }; const L = s.lab; if (L.cur && L.cur.end <= now()) { L.lv[L.cur.k] = (L.lv[L.cur.k] || 0) + 1; L.done = L.cur.k; L.cur = null; } return L; };
export function rl(k) { const s = load(); return s.lab ? s.lab.lv[k] || 0 : 0; }
export function labStart(k) { const L = lab(), s = load(), lv = (L.lv[k] || 0) + 1; if (L.cur) return '이미 연구 중이에요'; if (lv > RES_MAX) return '최고 단계예요'; if (!countOf('lab')) return '연구소를 지어야 해요'; const c = resCost(lv); if (s.coins < c.coins) return '코인이 모자라요'; if (!hasAll(c.items)) return '연구 재료가 모자라요 · 연구소에서 만들어요';
  s.coins -= c.coins; take(c.items); L.cur = { k, end: now() + resTime(lv) * 1000 }; return null; }
export function labSpeed() { const L = lab(), s = load(); if (!L.cur) return null; const c = speedCost((L.cur.end - now()) / 1000); if (s.gems < c) return '보석이 모자라요'; s.gems -= c; L.cur.end = now(); lab(); return null; }
// 수확 덤 (풍년의 비결)
export const bonusCrop = () => Math.random() < 0.05 * rl('harvest');

// 받침에 맞는 조사 (사료가 · 우유가 · 당근이)
export const iga = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? '이' : '가'); };
