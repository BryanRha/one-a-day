// 이벤트 묶음 (타운십 · K뷰티 레시피 틀): 7일 출석 · 주간 축제(티켓 사다리) · 이웃 농장 레이스(AI) · 스티커 앨범 · 시즌 패스 · 항구 무역
import { load, give, dayNo, weekNo, has, take, add, countOf } from './state.js?v=0.50.2';
import { VOYAGES } from './data.js?v=0.50.2';

const now = () => Date.now();
function ev() { const d = load(); if (!d.ev) d.ev = {}; return d.ev; }

// ── 7일 출석
export const LOGIN = [{ coins: 50 }, { tools: 2 }, { gems: 5 }, { coins: 120, tools: 2 }, { items: { pickaxe: 3 } }, { gems: 10 }, { gems: 25, tools: 5 }];
export function login() { const e = ev(); if (!e.login) e.login = { last: -1, day: 0, got: true }; if (e.login.last !== dayNo()) { e.login.last = dayNo(); e.login.day = e.login.day % 7 + 1; e.login.got = false; } return e.login; }
export function loginClaim() { const l = login(); if (l.got) return null; l.got = true; return give(LOGIN[l.day - 1]) || []; }

// ── 주간 축제: 수확 · 주문 · 기차로 티켓 → 10단계 보상 (테마는 주마다)
export const FESTS = [{ n: '봄꽃 축제', c: 0xFF9DC0 }, { n: '여름 수박 축제', c: 0x7CD0FF }, { n: '가을 수확 축제', c: 0xF0A040 }, { n: '겨울 눈꽃 축제', c: 0xC0E4FF }];
export const FEST_TIERS = [10, 25, 45, 70, 100, 140, 190, 250, 320, 400];
export const FEST_R = [{ coins: 60 }, { tools: 2 }, { gems: 5 }, { coins: 150 }, { items: { dynamite: 2 } }, { gems: 10 }, { tools: 5 }, { coins: 400 }, { gems: 20 }, { gems: 40, tools: 10 }];
export const fest = () => { const e = ev(); if (!e.fest || e.fest.week !== weekNo()) e.fest = { week: weekNo(), pts: 0, got: [] }; return { ...e.fest, theme: FESTS[weekNo() % FESTS.length] }; };
export function festAdd(n) { fest(); ev().fest.pts += n; }
export function festClaim(i) { const f = fest(), e = ev().fest; if (f.pts < FEST_TIERS[i] || e.got.includes(i)) return null; e.got.push(i); return give(FEST_R[i]) || []; }

// ── 이웃 농장 레이스: 24시간 · 주문 = 2점 · 기차 칸 = 3점 · 목표 60점 · AI 4곳
export const RACE = { goal: 60, hours: 24, rewards: [{ gems: 30, tools: 5 }, { gems: 15, tools: 3 }, { gems: 8, coins: 150 }, { coins: 100 }, { coins: 50 }] };
const RIVALS = ['한스네 목공소', '브룩 상회', '샘의 밭', '파출로 부동산', '이웃 왕국 농장', '바닷가 목장', '산골 과수원'];
export function race() { const e = ev(); return e.race || null; }
export function raceJoin() { const e = ev(); if (e.race && !e.race.claimed && now() < e.race.end) return false; if (e.raceDay === dayNo()) return false; e.raceDay = dayNo();
  const names = [...RIVALS].sort(() => Math.random() - 0.5).slice(0, 4), rates = [4.2, 3.2, 2.6, 1.8].map(r => r * (0.85 + Math.random() * 0.3)).sort(() => Math.random() - 0.5);
  e.race = { start: now(), end: now() + RACE.hours * 36e5, pts: 0, rivals: names.map((n, i) => ({ n, rate: rates[i], seed: Math.random() * 6 })), claimed: false }; return true; }
export function raceAdd(n) { const r = race(); if (!r || r.claimed || now() >= r.end || r.done) return; r.pts = Math.min(RACE.goal, r.pts + n); if (r.pts >= RACE.goal) r.done = now(); }
export function raceState() { const r = race(); if (!r) return null; const t = r.done || Math.min(now(), r.end), h = (t - r.start) / 36e5;
  const rows = [{ me: true, n: '라벤더 농장', pts: r.pts, at: r.done || 9e15 }, ...r.rivals.map(v => { const p = Math.min(RACE.goal, Math.max(0, Math.floor(v.rate * h + Math.sin(h + v.seed) * 2))); return { n: v.n, pts: p, at: p >= RACE.goal ? r.start + RACE.goal / v.rate * 36e5 : 9e15 }; })].sort((a, b) => b.pts - a.pts || a.at - b.at);
  return { rows, rank: rows.findIndex(x => x.me) + 1, ended: !!r.done || now() >= r.end, left: Math.max(0, r.end - now()), claimed: r.claimed }; }
export function raceClaim() { const s = raceState(); if (!s || !s.ended || s.claimed) return null; ev().race.claimed = true; return { rank: s.rank, r: RACE.rewards[s.rank - 1], ups: give(RACE.rewards[s.rank - 1]) || [] }; }

// ── 스티커 앨범: 주문 4번마다 스티커 팩(3장) · 4세트 × 6장 · 세트 · 전체 보상
export const STICKERS = [
  { n: '들판의 작물', r: { gems: 10 }, s: ['wheat', 'corn', 'carrot', 'strawberry', 'pumpkin', 'cabbage'] },
  { n: '농장 동물', r: { tools: 6 }, s: ['milk', 'egg', 'wool', 'bacon', 'honeycomb', 'cheese'] },
  { n: '빵집의 맛', r: { coins: 400 }, s: ['bread', 'cookies', 'pie', 'creamcake', 'muffin', 'honeycake'] },
  { n: '마을의 보물', r: { gems: 25 }, s: ['teddy', 'perfume', 'dress', 'vase', 'goldbar', 'pearl'] },
];
export const ALBUM_R = { gems: 60, tools: 10 };
export const album = () => { const e = ev(); if (!e.album) e.album = { have: {}, packs: 1, orders: 0, done: [], all: false }; return e.album; };
export function albumOrder() { const a = album(); a.orders++; if (a.orders % 4 === 0) { a.packs++; return true; } return false; }
export function openPack() { const a = album(); if (!a.packs) return null; a.packs--; const all = STICKERS.flatMap(s => s.s), out = []; for (let k = 0; k < 3; k++) { const it = all[Math.floor(Math.random() * all.length)]; out.push({ it, isNew: !a.have[it] }); a.have[it] = (a.have[it] || 0) + 1; } return out; }
export function albumClaim(i) { const a = album(), S = STICKERS[i]; if (a.done.includes(i) || !S.s.every(k => a.have[k])) return null; a.done.push(i); return give(S.r) || []; }
export function albumAll() { const a = album(); if (a.all || a.done.length < STICKERS.length) return null; a.all = true; return give(ALBUM_R) || []; }

// ── 시즌 패스 (한 달): 모든 활동으로 패스 점수 · 무료 줄 10칸 (프리미엄 줄은 결제가 열리면)
export const PASS_TIERS = [20, 50, 90, 140, 200, 270, 350, 440, 540, 650];
export const PASS_FREE = [{ coins: 80 }, { tools: 3 }, { gems: 5 }, { items: { pickaxe: 5 } }, { coins: 250 }, { gems: 10 }, { items: { dynamite: 3 } }, { tools: 8 }, { gems: 20 }, { gems: 50, coins: 500 }];
export const PASS_PREM = [{ gems: 10 }, { gems: 10 }, { tools: 5 }, { gems: 15 }, { coins: 500 }, { gems: 20 }, { tools: 10 }, { gems: 30 }, { gems: 40 }, { gems: 100 }];
const monthId = () => { const t = new Date(); return t.getFullYear() * 12 + t.getMonth(); };
export const pass = () => { const e = ev(); if (!e.pass || e.pass.m !== monthId()) e.pass = { m: monthId(), pts: 0, got: [] }; return e.pass; };
export function passAdd(n) { pass().pts += n; }
export function passClaim(i) { const p = pass(); if (p.pts < PASS_TIERS[i] || p.got.includes(i)) return null; p.got.push(i); return give(PASS_FREE[i]) || []; }

// 활동 한 번 → 축제 · 레이스 · 패스 점수
export function onOrder() { festAdd(3); raceAdd(2); passAdd(3); return albumOrder(); }
export function onTrainCar() { load().stats.cars = (load().stats.cars || 0) + 1; festAdd(4); raceAdd(3); passAdd(4); }
export function onHarvest(n) { festAdd(Math.floor(n / 4)); passAdd(Math.floor(n / 6)); }

// ── 항구 무역
export function voyage() { const e = ev(); return e.voyage || null; }
export function voyageNeed(i) { const v = VOYAGES[i], d = load(), pool = Object.keys(d.items).filter(k => d.items[k] >= 2 && !['pickaxe', 'dynamite', 'map'].includes(k)); return v; }
export function voyageSend(i, cargo) { const e = ev(), v = VOYAGES[i]; if (e.voyage || load().lv < v.lv) return false; if (!take(cargo)) return false; e.voyage = { i, back: now() + v.t * 1000 }; return true; }
export function voyageBack() { const e = ev(), v = e.voyage; if (!v || v.back > now()) return null; const V = VOYAGES[v.i], items = {}; for (let k = 0; k < 3 + v.i; k++) { const it = V.loot[Math.floor(Math.random() * V.loot.length)]; items[it] = (items[it] || 0) + 1; } e.voyage = null; give({ items }); return items; }

// ── 빨간 점: 탭마다 지금 받을 것 · 새로 할 것이 있는지
export function evDots() { const e = ev(), l = login(), f = fest(), a = album(), ps = pass(), rs = raceState();
  const canJoin = !(e.race && !e.race.claimed && now() < e.race.end) && e.raceDay !== dayNo();
  return { login: !l.got, fest: FEST_TIERS.some((t, i) => f.pts >= t && !f.got.includes(i)), race: canJoin || !!(rs && rs.ended && !rs.claimed),
    album: a.packs > 0 || STICKERS.some((S, i) => !a.done.includes(i) && S.s.every(k => a.have[k])) || (!a.all && a.done.length >= STICKERS.length), pass: PASS_TIERS.some((t, i) => ps.pts >= t && !ps.got.includes(i)) }; }
export const evBadge = () => Object.values(evDots()).filter(Boolean).length;
