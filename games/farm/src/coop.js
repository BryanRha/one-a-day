// 협동조합 (타운십의 협동조합 · 레가타를 AI 팀원/AI 팀으로): 주간 팀 경주 과제 · 개인 보상 단계 · 팀원 도움 요청
import { load, give, has, take, dayNo, weekNo, countOf } from './state.js?v=0.47.3';
import { ITEMS, CROPS, RECIPES, BUILDS } from './data.js?v=0.47.3';

const now = () => Date.now();
export const COOP_LV = 10, TASKS_DAY = 5, COOP_TIERS = [80, 200, 400, 700, 1100];
export const TIER_R = [{ coins: 300, tools: 2 }, { gems: 8, bm: 2 }, { coins: 1200, tools: 4 }, { gems: 15, bm: 4 }, { gems: 30, tools: 8, coins: 3000 }];
export const RANK_R = [{ gems: 40, tools: 8, bm: 6 }, { gems: 25, tools: 6, bm: 4 }, { gems: 15, tools: 4, bm: 3 }, { gems: 8, tools: 3 }, { gems: 5, tools: 2 }];
const MATES = ['농부 톰', '꽃집 릴리', '제빵사 보리', '할머니 순자', '꼬마 준이'];
const TEAMS = ['해바라기 조합', '푸른 언덕 조합', '바닷가 목장 조합', '산골 과수원 조합', '은하수 농장 조합', '배추밭 연합'];
const rnd = a => a[Math.floor(Math.random() * a.length)];

// 통계 (과제 진행은 과제를 받을 때의 값과 비교)
export function stat(kind, it) { const s = load().stats; if (kind === 'harvest') return s.harvest || 0; if (kind === 'order') return s.orders || 0; if (kind === 'cars') return s.cars || 0; if (kind === 'isle') return s.isle || 0; if (kind === 'make') return (s.mk && s.mk[it]) || 0; return 0; }
const goods = () => { const lv = load().lv, out = []; for (const [k, R] of Object.entries(RECIPES)) if (countOf(R.b) && (R.lv || 1) <= lv && !BUILDS[R.b].lab) out.push(k); return out; };
function newTask() { const s = load(), kinds = ['harvest', 'make', 'make', 'order']; if (s.lv >= 2) kinds.push('cars'); if (countOf('harbor')) kinds.push('isle');
  const k = rnd(kinds), lv = s.lv;
  if (k === 'harvest') { const n = 30 + 10 * Math.floor(Math.random() * (3 + lv / 10)); return { k, n, pts: Math.round(n * 0.6), t: 6 * 36e5, d: `작물 ${n}개 수확`, ic: 'sickle' }; }
  if (k === 'order') { const n = 3 + Math.floor(Math.random() * 4); return { k, n, pts: n * 10, t: 8 * 36e5, d: `주문 ${n}개 들어주기`, ic: 'orderboard' }; }
  if (k === 'cars') { const n = 3 + Math.floor(Math.random() * 5); return { k, n, pts: n * 11, t: 10 * 36e5, d: `기차 칸 ${n}개 채우기`, ic: 'loco' }; }
  if (k === 'isle') { const n = 6 + Math.floor(Math.random() * 7); return { k, n, pts: n * 5, t: 8 * 36e5, d: `섬 칸 ${n}개 열기`, ic: 'compass' }; }
  const g = goods(); if (!g.length) return { k: 'harvest', n: 30, pts: 18, t: 6 * 36e5, d: '작물 30개 수확', ic: 'sickle' };
  const it = rnd(g), R = RECIPES[it], n = Math.max(2, Math.min(10, Math.round(3600 / R.t * 2))); return { k, it, n, pts: Math.max(20, Math.round(n * R.t / 60 / 3)), t: 8 * 36e5, d: `${ITEMS[it].n} ${n}개 만들기`, ic: it };
}
// 이번 주 조합 (월요일마다 새 경주 · 지난주 결과는 받을 때까지 보관)
export function coop() { const s = load(); let c = s.coop;
  if (!c || c.week !== weekNo()) { if (c && !c.claimed && c.myPts > 0) s.coopPrev = { rank: standings(c).rank, pts: c.myPts }; const tm = [...TEAMS].sort(() => Math.random() - 0.5).slice(0, 4);
    c = s.coop = { week: weekNo(), start: weekStart(), mates: MATES.slice(0, 4).map((n, i) => ({ n, v: i + 1, rate: 2 + Math.random() * 2 })), rivals: tm.map((n, i) => ({ n, rate: [14, 19, 24, 30][i] * (0.8 + Math.random() * 0.4) })), tasks: [], cur: null, day: -1, dn: 0, myPts: 0, got: [], reqDay: -1, reqs: [], claimed: false }; }
  while (c.tasks.length < 6) c.tasks.push(newTask()); if (c.day !== dayNo()) { c.day = dayNo(); c.dn = 0; }
  if (c.reqDay !== dayNo()) { c.reqDay = dayNo(); const g = [...Object.keys(CROPS).filter(k => CROPS[k].lv <= s.lv), ...goods()]; c.reqs = [0, 1, 2].map(i => { const it = rnd(g), cheap = ITEMS[it].v <= 6; return { who: (i + dayNo()) % 4, it, n: cheap ? 4 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 3), done: false }; }); }
  return c; }
const hrs = c => (now() - c.start) / 36e5;
// 이번 주 월요일 0시 (AI 팀은 주가 시작된 때부터 점수를 모음)
function weekStart() { const d = new Date(), day = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime(); }
export function standings(c = coop()) { const h = Math.min(168, hrs(c)), mates = c.mates.reduce((a, m) => a + Math.floor(m.rate * h), 0), mine = { n: '라벤더 농장 조합', me: true, pts: c.myPts + mates };
  const rows = [mine, ...c.rivals.map(r => ({ n: r.n, pts: Math.floor(r.rate * h) }))].sort((a, b) => b.pts - a.pts); return { rows, rank: rows.findIndex(r => r.me) + 1, mates }; }
export const weekLeft = () => { const d = new Date(), day = (d.getDay() + 6) % 7; const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 7).getTime(); return Math.max(0, end - now()); };
export function takeTask(i) { const c = coop(); if (load().lv < COOP_LV) return `레벨 ${COOP_LV}부터 참여해요`; if (c.cur) return '지금 과제를 먼저 끝내요'; if (c.dn >= TASKS_DAY) return `오늘 과제는 ${TASKS_DAY}개까지예요 · 내일 또 와요`; const t = c.tasks.splice(i, 1)[0]; c.cur = { ...t, base: stat(t.k, t.it), end: now() + t.t }; c.dn++; c.tasks.push(newTask()); return null; }
export const taskProg = () => { const c = coop(); return c.cur ? Math.min(c.cur.n, stat(c.cur.k, c.cur.it) - c.cur.base) : 0; };
// 과제 확인: 다 하면 점수 · 시간이 지나면 실패
export function taskCheck() { const c = load().coop; if (!c || !c.cur) return null; const p = taskProg(); if (p >= c.cur.n) { const t = c.cur; c.myPts += t.pts; c.cur = null; return { ok: true, t }; } if (now() > c.cur.end) { const t = c.cur; c.cur = null; return { ok: false, t }; } return null; }
export function dropTask() { const c = coop(); c.cur = null; }
export function tierClaim(i) { const c = coop(); if (c.got.includes(i) || c.myPts < COOP_TIERS[i]) return null; c.got.push(i); return give(TIER_R[i]) || []; }
export function prevClaim() { const s = load(), p = s.coopPrev; if (!p) return null; s.coopPrev = null; const r = RANK_R[p.rank - 1]; give(r); return { ...p, r }; }
export function helpSend(i) { const c = coop(), q = c.reqs[i]; if (!q || q.done) return null; if (!has(q.it, q.n)) return '물건이 모자라요'; take({ [q.it]: q.n }); q.done = true; c.myPts += 8; const r = { coins: Math.round(ITEMS[q.it].v * q.n * 1.8 + 20), xp: 3 + Math.round(ITEMS[q.it].v * q.n / 8) }; give(r); return { r }; }
export const coopBadge = () => { const s = load(); if (s.lv < COOP_LV) return 0; const c = coop(); return (s.coopPrev ? 1 : 0) + c.reqs.filter(q => !q.done && has(q.it, q.n)).length + COOP_TIERS.filter((t, i) => c.myPts >= t && !c.got.includes(i)).length + (!c.cur && c.dn < TASKS_DAY ? 1 : 0); };
export { MATES };
export function coopDots() { const s = load(); if (s.lv < COOP_LV) return { race: false, help: false }; const c = coop(); return { race: !!s.coopPrev || COOP_TIERS.some((t, i) => c.myPts >= t && !c.got.includes(i)) || (!c.cur && c.dn < TASKS_DAY), help: c.reqs.some(q => !q.done && has(q.it, q.n)) }; }
