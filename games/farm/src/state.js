// 저장 · 규칙: 헛간 · 경험치 · 밭 · 동물 · 공장 줄 · 주문 게시판 · 기차 · 퀘스트 · 월세 · 강아지
import { ITEMS, CROPS, RECIPES, BUILDS, BASE_CAP, XP_NEED, LV_REWARD, BARN, MAP, ZONE, START_ZONES, ZONE_COST, QUESTS, RENT, MAX_LV, SUITORS, HEARTS, HEART_PTS, MINE } from './data.js?v=0.39.0';

const KEY = 'thefarm_v1';
let d = null;
const now = () => Date.now();
export const DAY = 864e5, dayNo = () => Math.floor((now() - new Date().getTimezoneOffset() * 6e4) / DAY), weekNo = () => Math.floor((dayNo() + 3) / 7);
function fresh() {
  const objs = [], id = () => objs.length + 1;
  // 처음 농장: 가운데에 밭 6칸(밀 익음) · 사료 공장 자리 비움 · 오두막 하나
  const c = 8;
  for (let k = 0; k < 6; k++) objs.push({ id: id(), b: 'field', x: c + (k % 3), y: c + Math.floor(k / 3), crop: 'wheat', at: 0 });
  objs.push({ id: id(), b: 'cottage', x: c + 4, y: c - 1 });
  return { v: 1, sfx: true, music: true, coins: 60, gems: 20, tools: 2, xp: 0, lv: 1, items: { wheat: 4, corn: 4 }, objs, seq: objs.length,
    zones: [...START_ZONES], barnLv: 0, orders: [], orderSeq: 0, train: null, quest: 0, qp: {}, talked: -1, rent: { week: weekNo(), paid: false }, dig: { day: -1, n: 0, spot: null }, brook: -1, stats: { harvest: 0, orders: 0, trains: 0 }, tut: 0, love: { hans: 0, sam: 0, ian: 0 }, spouse: null, proposed: null, mine: null, mini: { day: -1, n: 0 } };
}
export function load() {
  if (d) return d;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { d = null; }
  const f = fresh(); if (!d || d.v !== 1) d = f;
  for (const k of Object.keys(f)) if (d[k] === undefined) d[k] = f[k];
  return d;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
export function reset() { d = fresh(); save(); }

// ── 헛간
export const barnCap = () => BARN.base + load().barnLv * BARN.step;
export const barnUsed = () => Object.entries(load().items).reduce((s, [k, n]) => s + n, 0);
export const has = (k, n = 1) => (load().items[k] || 0) >= n;
export function add(k, n) { const it = load().items; it[k] = Math.max(0, (it[k] || 0) + n); if (!it[k]) delete it[k]; }
export const canFit = n => barnUsed() + n <= barnCap();
export const hasAll = need => Object.entries(need).every(([k, n]) => has(k, n));
export function take(need) { if (!hasAll(need)) return false; for (const [k, n] of Object.entries(need)) add(k, -n); return true; }

// ── 경험치 · 레벨 (레벨업 보상 목록 돌려줌)
export function gainXp(n) { const s = load(); s.xp += n; const ups = []; while (s.lv < MAX_LV && s.xp >= XP_NEED(s.lv)) { s.xp -= XP_NEED(s.lv); s.lv++; const r = LV_REWARD(s.lv); s.coins += r.coins; s.gems += r.gems; s.tools += r.tools; ups.push({ lv: s.lv, ...r }); } return ups; }
export function give(r) { const s = load(); if (r.coins) s.coins += r.coins; if (r.gems) s.gems += r.gems; if (r.tools) s.tools += r.tools; if (r.items) for (const [k, n] of Object.entries(r.items)) add(k, n); return r.xp ? gainXp(r.xp) : []; }

// ── 인구
export const popNow = () => load().objs.reduce((s, o) => s + (BUILDS[o.b].give || 0), 0);
export const popCap = () => BASE_CAP + load().objs.reduce((s, o) => s + (BUILDS[o.b].cap || 0), 0);
export const pop = () => Math.min(popNow(), popCap());
export const countOf = b => load().objs.filter(o => o.b === b).length;
export function canBuild(b) { const B = BUILDS[b], s = load(); if (s.lv < B.lv) return `레벨 ${B.lv}에 열려요`; if (B.k === 'deco') return s.coins < costOf(b) ? `코인 ${costOf(b)} 필요` : null; if (B.pop && pop() < B.pop) return `인구 ${B.pop}명이 필요해요`; if (B.k === 'field' && countOf('field') >= B.max(s.lv)) return `밭은 레벨 ${s.lv}에서 ${B.max(s.lv)}칸까지`; if (B.k !== 'field' && B.k !== 'house' && B.k !== 'public' && countOf(b) >= 1) return '이미 있어요'; if (s.coins < costOf(b)) return `코인 ${costOf(b)} 필요`; return null; }
// 한스와 결혼하면 건설비 10% 할인
export const costOf = b => Math.round(BUILDS[b].cost * (load().spouse === 'hans' ? 0.9 : 1));

// ── 땅 (5×5 구역)
export const zoneOf = (x, y) => Math.floor(y / ZONE) * (MAP / ZONE) + Math.floor(x / ZONE);
export const open = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && load().zones.includes(zoneOf(x, y));
export const zoneNext = z => { const n = MAP / ZONE, zx = z % n, zy = Math.floor(z / n); return load().zones.some(o => Math.abs(o % n - zx) + Math.abs(Math.floor(o / n) - zy) === 1); };
export const zoneCost = () => ZONE_COST(load().zones.length - START_ZONES.length);
export function objAt(x, y) { return load().objs.find(o => { const s = BUILDS[o.b].sz; return x >= o.x && x < o.x + s && y >= o.y && y < o.y + s; }); }
export function freeRect(x, y, sz, ignore) { for (let i = 0; i < sz; i++) for (let j = 0; j < sz; j++) { if (!open(x + i, y + j)) return false; const o = objAt(x + i, y + j); if (o && o !== ignore) return false; if (load().dig.spot && load().dig.spot[0] === x + i && load().dig.spot[1] === y + j) return false; } return true; }

// ── 밭
export const cropReady = o => o.crop && now() >= o.at;
export const cropTime = k => CROPS[k].t * (load().spouse === 'sam' ? 0.9 : 1);
// ── 공장 줄: 차례로 · 끝난 것은 done 에 (헛간에 넣을 때까지 대기)
export function tickFactory(o) { o.q = o.q || []; o.done = o.done || []; let ch = false; while (o.q.length && o.q[0].end <= now()) { o.done.push(o.q.shift().it); ch = true; } return ch; }
export function queueJob(o, it) { const R = RECIPES[it], B = BUILDS[o.b]; tickFactory(o); if (o.q.length + o.done.length >= (B.slots + (o.extra || 0))) return '줄이 꽉 찼어요'; if (!take(R.in)) return '재료가 모자라요'; const last = o.q.length ? o.q[o.q.length - 1].end : now(); o.q.push({ it, end: Math.max(last, now()) + R.t * 1000 }); return null; }
// ── 동물 우리: 3칸 동시
export function tickAnimal(o) { o.s = o.s || [0, 0, 0]; o.ready = o.ready || 0; let ch = false; o.s.forEach((e, i) => { if (e && e <= now()) { o.s[i] = 0; o.ready++; ch = true; } }); return ch; }
export const productOf = b => Object.keys(RECIPES).find(k => RECIPES[k].b === b);
export function feedAll(o) { tickAnimal(o); const it = productOf(o.b), R = RECIPES[it]; let n = 0; o.s.forEach((e, i) => { if (!e && o.ready + o.s.filter(Boolean).length < 3 && take(R.in)) { o.s[i] = now() + R.t * 1000; n++; } }); return n; }

// ── 주문 게시판 (타운십의 헬리콥터 주문): 6장 · 완료 후 60초 뒤 새 주문
const unlockedGoods = () => { const s = load(), out = Object.keys(CROPS).filter(k => CROPS[k].lv <= s.lv); for (const [k, R] of Object.entries(RECIPES)) if (countOf(R.b) && (R.lv || 1) <= s.lv) out.push(k); return out; };
function makeOrder(brook) {
  const s = load(), g = unlockedGoods(), kinds = 1 + Math.floor(Math.random() * Math.min(3, 1 + s.lv / 4)), items = {};
  for (let k = 0; k < kinds; k++) { const it = g[Math.floor(Math.random() * g.length)]; const cheap = ITEMS[it].v <= 3; items[it] = (items[it] || 0) + (cheap ? 2 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2)); }
  const val = Object.entries(items).reduce((a, [k, n]) => a + ITEMS[k].v * n, 0), faces = ['hans', 'sam', 'ian', 'brook', 'pachulo'];
  if (brook && countOf('harbor')) { const rare = ['pineapple', 'coconut', 'spice', 'coffee', 'cocoa', 'silk'].filter(k => s.lv >= 16); const it = rare[Math.floor(Math.random() * rare.length)]; if (it) items[it] = 1; }
  const val2 = Object.entries(items).reduce((a, [k, n]) => a + ITEMS[k].v * n, 0);
  return { id: ++s.orderSeq, face: brook ? 'brook' : faces[Math.floor(Math.random() * faces.length)], items, coins: Math.round(val2 * (brook ? 2.4 : 1.5) + 5), xp: Math.max(2, Math.round(val2 / 4)) * (brook ? 2 : 1), at: 0, brook: !!brook, tools: brook ? 2 : Math.random() < 0.15 ? 1 : 0 };
}
export function fillOrders() {
  const s = load(); while (s.orders.length < 6) s.orders.push({ ...makeOrder(false), at: 0 });
  // 브룩의 정기 손님 날 (매달 7·14·21·28일)
  const dd = new Date().getDate(); if ([7, 14, 21, 28].includes(dd) && s.brook !== dayNo()) { s.brook = dayNo(); s.orders[0] = makeOrder(true); }
}
export function doOrder(i) { const s = load(), o = s.orders[i]; if (!o || o.at > now() || !take(o.items)) return null; const bonus = Math.round(o.coins * (joyBonus() + (s.spouse === 'ian' ? 0.1 : 0))); s.coins += o.coins + bonus; o.bonusC = bonus; s.tools += o.tools; s.stats.orders++; progress('order', 1); const ups = gainXp(o.xp); s.orders[i] = { ...makeOrder(false), at: now() + 60000 }; return { o, ups }; }
export function dropOrder(i) { const s = load(); s.orders[i] = { ...makeOrder(false), at: now() + 30000 }; }

// ── 기차: 3칸 · 다 채우면 떠났다가 3분 뒤 새 주문으로 돌아옴
export function train() {
  const s = load(); if (s.lv < 2) return null;
  if (!s.train || (s.train.away && s.train.back <= now())) { const g = unlockedGoods(); s.train = { away: false, cars: [0, 1, 2].map(k => { const it = g[Math.floor(Math.random() * g.length)], n = ITEMS[it].v <= 3 ? 3 + Math.floor(Math.random() * 3) : ITEMS[it].v <= 12 ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2); return { it, n, done: false, r: k === 2 ? { tools: 1 + Math.floor(s.lv / 6) } : { coins: Math.round(ITEMS[it].v * n * 1.6 + 8), xp: 2 + Math.round(ITEMS[it].v * n / 6) } }; }) }; }
  return s.train;
}
export function loadCar(k) { const t = train(); if (!t || t.away) return null; const c = t.cars[k]; if (c.done || !take({ [c.it]: c.n })) return null; c.done = true; const ups = give(c.r); if (t.cars.every(x => x.done)) { t.away = true; t.back = now() + 120000; load().stats.trains++; progress('train', 1); } return { r: c.r, ups, left: t.away }; }

// ── 퀘스트 (이야기 1장)
export const quest = () => QUESTS[load().quest] || null;
export function progress(kind, v) { const s = load(), q = quest(); if (!q) return; const g = q.goal; if (kind in g || kind === 'make' && g.make) { if (kind === 'make') { s.qp.make = s.qp.make || {}; s.qp.make[v.it] = (s.qp.make[v.it] || 0) + v.n; } else s.qp[kind] = (s.qp[kind] || 0) + (typeof v === 'number' ? v : 1); } }
export function questDone() { const s = load(), q = quest(); if (!q) return false; const g = q.goal, p = s.qp;
  if (g.harvest) return (p.harvest || 0) >= g.harvest; if (g.build) return countOf(g.build) > 0; if (g.order) return (p.order || 0) >= g.order; if (g.train) return (p.train || 0) >= g.train;
  if (g.make) return Object.entries(g.make).every(([k, n]) => (p.make && p.make[k] || 0) >= n); if (g.zone) return s.zones.length - 4 >= g.zone; if (g.rent) return s.rent.paid || (p.rent || 0) >= 1; if (g.level) return s.lv >= g.level; if (g.deco) return s.objs.filter(o => BUILDS[o.b].k === 'deco').length >= g.deco; if (g.mini) return (p.mini || 0) >= g.mini; if (g.gift) return (p.gift || 0) >= g.gift; if (g.hearts) return Math.max(...Object.values(s.love)) >= HEARTS * HEART_PTS; if (g.married) return !!s.spouse; return false; }
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
export const rewardText = r => [r.coins && `🪙${r.coins}`, r.gems && `💎${r.gems}`, r.tools && `🔨${r.tools}`, r.xp && `⭐${r.xp}`, r.items && Object.entries(r.items).map(([k, n]) => `${ITEMS[k].n} ${n}`).join(' ')].filter(Boolean).join('  ');

// ── 매력(장식) → 주문 코인 보너스 (최대 +30%)
export const joy = () => load().objs.reduce((t, o) => t + (BUILDS[o.b].joy || 0), 0);
export const joyBonus = () => Math.min(0.3, joy() / 400);
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
  if (m.cells.every(c => !c)) load().mine = newMine(m.depth + 1); return out; }
// ── 미니게임: 하루 3번
export function miniLeft() { const s = load(); if (s.mini.day !== dayNo()) s.mini = { day: dayNo(), n: 0 }; return 3 - s.mini.n; }
export function miniDone(score) { const s = load(); miniLeft(); s.mini.n++; progress('mini', 1); const r = { coins: 20 + score * 6, xp: 3 + score, tools: score >= 12 ? 1 : 0 }; return { r, ups: give(r) }; }
