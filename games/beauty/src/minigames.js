// 미니게임 3종 (원작의 빙고 · 행운 게임 · 파기 이벤트처럼 평소 플레이로 재료를 모아 즐김)
//  · 설화 빙고: 주문마다 빙고 공 1개 → 칸 하나 도장 · 줄마다 보상 · 다 채우면 큰 보상 (주마다 새 판)
//  · 행운의 룰렛: 5단계 이상 합치기 · 레벨업마다 룰렛 토큰 → 8칸 룰렛 (확률 공개)
//  · 공방 보물 찾기: 주문 3번마다 삽 1개 → 5×5 흙을 파서 열쇠 조각 3개 찾기 → 보물 · 다음 판
//  · 듀오 뷰티 배틀(2대2): 나+AI 짝꿍 대 AI 두 명, 24시간 동안 주문 점수 합
import { load, save } from './save.js?v=0.57.4';

const DAY = 864e5, dayNo = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / DAY), weekNo = () => Math.floor((dayNo() + 3) / 7);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ── 빙고 (숫자 1~25 · 공을 뽑으면 그 숫자 칸에 도장 · 가로 5 · 세로 5 · 대각선 2 줄마다 정해진 보상)
const LINES = (() => { const L = []; for (let i = 0; i < 5; i++) L.push([0, 1, 2, 3, 4].map(k => i * 5 + k)); for (let i = 0; i < 5; i++) L.push([0, 1, 2, 3, 4].map(k => k * 5 + i)); L.push([0, 6, 12, 18, 24]); L.push([4, 8, 12, 16, 20]); return L; })();
// 줄 보상: 가로 1~5 · 세로 1~5 · 대각선 ↘ · ↙
export const LINE_R = [{ gems: 5 }, { coins: 40 }, { energy: 20 }, { pack: 'basic' }, { gems: 8 }, { energy: 15 }, { coins: 50 }, { gems: 5 }, { items: ['scissors'] }, { pack: 'basic' }, { pack: 'gold' }, { items: ['ribbon'] }];
export const BINGO = { full: { pack: 'diamond', gems: 50 } };
export function bingo() {
  const d = load();
  if (!d.bingo || d.bingo.week !== weekNo() || typeof d.bingo.cells[0] !== 'number') {
    const nums = [...Array(25)].map((_, i) => i + 1).sort(() => Math.random() - 0.5);
    d.bingo = { week: weekNo(), cells: nums, marked: [12], lines: [], full: false, balls: d.bingo ? d.bingo.balls : 1 }; save();
  }
  return d.bingo;
}
export const bingoLines = () => LINES;
// 공 하나 쓰기 → { cell, num, newLines:[], full, rewards:[] }
export function bingoDraw() {
  const b = bingo(); if (!b.balls) return null; const free = [...Array(25).keys()].filter(i => !b.marked.includes(i)); if (!free.length) return null;
  b.balls--; const cell = pick(free); b.marked.push(cell); const rewards = [], newLines = [];
  LINES.forEach((L, i) => { if (!b.lines.includes(i) && L.every(c => b.marked.includes(c))) { b.lines.push(i); newLines.push(i); rewards.push(LINE_R[i]); } });
  let full = false; if (!b.full && b.marked.length === 25) { b.full = true; full = true; rewards.push(BINGO.full); }
  save(); return { cell, num: b.cells[cell], newLines, full, rewards };
}
export function bingoAdd(n = 1) { const b = bingo(); b.balls += n; save(); }

// ── 룰렛
export const WHEEL = [
  { r: { energy: 10 }, w: 24, c: 0xFFE27A }, { r: { coins: 30 }, w: 20, c: 0xFFD6E4 }, { r: { gems: 3 }, w: 15, c: 0xD6F0E4 }, { r: { pack: 'basic' }, w: 12, c: 0xE4DCF8 },
  { r: { items: ['scissors'] }, w: 9, c: 0xFFE9C9 }, { r: { items: ['ribbon'] }, w: 8, c: 0xDDEFFF }, { r: { pack: 'gold' }, w: 8, c: 0xFFF1B8 }, { r: { gems: 30, items: ['chest'] }, w: 4, c: 0xFFB8CF, jackpot: true },
];
export function spin() { const d = load(); if (!d.spin) { d.spin = { tokens: 1 }; save(); } return d.spin; }
export function spinAdd(n = 1) { spin().tokens += n; save(); }
export function spinRoll() { const s = spin(); if (!s.tokens) return null; s.tokens--; const tot = WHEEL.reduce((a, x) => a + x.w, 0); let v = Math.random() * tot, i = 0; for (; i < WHEEL.length; i++) { if (v < WHEEL[i].w) break; v -= WHEEL[i].w; } save(); return Math.min(i, WHEEL.length - 1); }

// ── 보물 찾기
export const DIG = { treasure: { gems: 40, pack: 'gold', items: ['chest', 'chest'] }, small: [{ coins: 15 }, { energy: 8 }, { gems: 2 }, { coins: 25 }, { energy: 15 }, { items: ['scissors'] }, { gems: 4 }, { items: ['pickbox'] }] };
export const ORDERS_PER_SHOVEL = 3;
function newDig(round) { const cells = Array(25).fill(null), spots = [...Array(25).keys()].sort(() => Math.random() - 0.5); ['key1', 'key2', 'key3'].forEach((k, i) => { cells[spots[i]] = { key: k }; }); DIG.small.forEach((r, i) => { cells[spots[3 + i]] = { r }; }); return { round, cells, open: [], keys: 0, done: false }; }
export function dig() { const d = load(); if (!d.dig) { d.dig = { shovels: 3, orders: 0, board: newDig(1) }; save(); } return d.dig; }
export function digAddOrder() { const g = dig(); g.orders++; if (g.orders % ORDERS_PER_SHOVEL === 0) g.shovels++; save(); }
export function digAdd(n) { dig().shovels += n; save(); }
// 칸 파기 → { got: reward|key|null, treasure }
export function digOpen(i) { const g = dig(), b = g.board; if (!g.shovels || b.open.includes(i) || b.done) return null; g.shovels--; b.open.push(i); const c = b.cells[i]; let treasure = false;
  if (c && c.key) { b.keys++; if (b.keys === 3) { b.done = true; treasure = true; } } save(); return { cell: c, treasure }; }
export function digNext() { const g = dig(); g.board = newDig(g.board.round + 1); save(); }

// ── 듀오 뷰티 배틀 (2대2)
export const DUO = { hours: 24, win: { pack: 'gold', gems: 25 }, lose: { pack: 'basic', coins: 30 } };
const MATES = [{ n: '하늘', face: 'c_haneul_smile' }, { n: '핑크리', face: 'c_pinky_wink' }, { n: '도윤', face: 'c_doyun_smile' }];
const FOES = [['글로리 뷰티 1팀', 'c_sera_smug', 'c_jiho_calm'], ['청담 뷰티 듀오', 'u8', 'u5'], ['홍대 공방 커플', 'u3', 'u9']];
export function duo() { const d = load(); if (!d.duo) { d.duo = { day: -1, cur: null }; save(); } return d.duo; }
export function duoJoin() { const u = duo(); if (u.day === dayNo()) return false; const m = pick(MATES), f = pick(FOES); u.day = dayNo();
  u.cur = { start: Date.now(), end: Date.now() + DUO.hours * 36e5, me: 0, mate: { ...m, rate: 1.4 + Math.random() * 0.6 }, foe: { n: f[0], faces: [f[1], f[2]], rate: 2.4 + Math.random() * 0.8 }, claimed: false }; save(); return true; }
export function duoState() { const u = duo(), c = u.cur; if (!c) return { joined: false, can: u.day !== dayNo() };
  const now = Date.now(), h = Math.min(DUO.hours, (now - c.start) / 36e5), mate = Math.floor(c.mate.rate * h), foe = Math.floor(c.foe.rate * h + Math.sin(h) * 2);
  return { joined: true, ended: now >= c.end, me: c.me, mate, team: c.me + mate, foe: Math.max(0, foe), left: Math.max(0, c.end - now), c, claimed: c.claimed, can: u.day !== dayNo() }; }
export function duoAdd(n) { const u = duo(), c = u.cur; if (!c || Date.now() >= c.end) return 0; c.me += n; save(); return n; }
export function duoClaim() { const s = duoState(); if (!s.joined || !s.ended || s.claimed) return null; s.c.claimed = true; save(); return s.team >= s.foe ? DUO.win : DUO.lose; }
