// 이벤트 (원작처럼 여러 개가 동시에 · 평소처럼 주문만 해도 점수가 쌓임)
//  · 뷰티 박람회 레이스: 5명 중 먼저 목표 점수 (상대는 AI — 나중에 서버를 붙이면 rivals 만 바꾸면 됨)
//  · 벚꽃 축제 꾸미기 사다리: 주문으로 꽃잎 모으기 → 10단계 보상 · 축제 장식
//  · VIP 손님: 이틀마다 VIP 주문 5개 → 큰 보상
import { load, save } from './save.js?v=0.59.2';
import { CUSTOMERS } from './data.js?v=0.59.2';

const DAY = 864e5, dayNo = (t = Date.now()) => Math.floor((t - new Date().getTimezoneOffset() * 6e4) / DAY);

// ── 레이스
export const RACE = { goal: 25, hours: 4, perDay: 3, rewards: [{ pack: 'gold', gems: 20 }, { pack: 'basic', gems: 10 }, { energy: 30, coins: 30 }, { coins: 20 }, { coins: 10 }] };
const RIVAL_N = ['뷰티 유튜버 다은', '화장품 회사 막내 민재', '제주 화장품 가게 수진', '부산 공방 지훈', '성수동 편집숍 하나', '대학가 뷰티숍 예린', '한방 카페 태호', '남대문 화장품 할매'];
export function race() { const d = load(); if (!d.race) { d.race = { day: dayNo(), n: 0, cur: null }; save(); } if (d.race.day !== dayNo()) { d.race.day = dayNo(); d.race.n = 0; save(); } return d.race; }
export function raceJoin() {
  const r = race(); if (r.cur && !r.cur.claimed) return false; if (r.n >= RACE.perDay) return false;
  const pool = [...RIVAL_N].sort(() => Math.random() - 0.5).slice(0, 4), faces = [...CUSTOMERS].sort(() => Math.random() - 0.5);
  // 상대 속도(시간당 점수): 한 명은 빠르고 한 명은 느림 → 열심히 하면 1등 가능
  const rates = [9 + Math.random() * 3, 6.5 + Math.random() * 2, 5 + Math.random() * 1.5, 3 + Math.random() * 1.5].sort(() => Math.random() - 0.5);
  r.cur = { start: Date.now(), end: Date.now() + RACE.hours * 36e5, pts: 0, at: null, rivals: pool.map((n, i) => ({ n, face: faces[i].face, rate: rates[i], seed: Math.random() * 10 })), claimed: false };
  r.n++; save(); return true;
}
// 상대 점수: 시간에 따라 (조금씩 들쭉날쭉) · 목표 넘지 않음
const rivalPts = (rv, cur, t) => { const h = Math.max(0, (Math.min(t, cur.end) - cur.start) / 36e5); return Math.min(RACE.goal, Math.max(0, Math.floor(rv.rate * h + Math.sin(h * 3 + rv.seed) * 1.2))); };
const rivalAt = (rv, cur) => { const h = RACE.goal / rv.rate; return cur.start + h * 36e5; };   // 목표에 닿는 대략의 시각
export function raceState() {
  const r = race(), c = r.cur; if (!c) return { joined: false, left: RACE.perDay - r.n };
  const now = Date.now(), t = c.at || now, ended = !!c.at || now >= c.end;
  const rows = [{ me: true, n: '나 (설화당)', face: 'c_soyun_smile', pts: c.pts, at: c.at }, ...c.rivals.map(rv => ({ n: rv.n, face: rv.face, pts: rivalPts(rv, c, t), at: rivalAt(rv, c) <= c.end ? rivalAt(rv, c) : null }))];
  rows.sort((a, b) => b.pts - a.pts || (a.at || 9e15) - (b.at || 9e15));
  const rank = rows.findIndex(x => x.me) + 1;
  return { joined: true, ended, rows, rank, left: RACE.perDay - r.n, timeLeft: Math.max(0, c.end - now), claimed: c.claimed };
}
export function raceAdd(n) { const r = race(), c = r.cur; if (!c || c.at || Date.now() >= c.end) return 0; c.pts = Math.min(RACE.goal, c.pts + n); if (c.pts >= RACE.goal) c.at = Date.now(); save(); return n; }
export function raceClaim() { const r = race(), s = raceState(); if (!s.joined || !s.ended || s.claimed) return null; r.cur.claimed = true; if (s.rank === 1) { const d = load(); d.stats.raceWins = (d.stats.raceWins || 0) + 1; } save(); return RACE.rewards[s.rank - 1]; }

// ── 꾸미기 사다리 (주마다 새로)
// 주마다 바뀌는 축제 테마 (원작처럼 매주 새 테마 · 테마마다 장식 3종)
export const THEMES = [
  { id: 'spring', name: '벚꽃 축제', token: 'petal', icon: 'ev_ladder', emoji: '🌸', names: { tree: '벚꽃 소원 나무', booth: '벚꽃 포토 부스', garland: '축제 등불 장식' }, img: { tree: 'deco_tree', booth: 'deco_booth', garland: 'deco_garland' } },
  { id: 'summer', name: '여름 바다 축제', token: 'petal_summer', icon: 'ev_ladder_summer', emoji: '🐚', names: { tree: '야자수 화분', booth: '바다 포토 부스', garland: '조개 가랜드' }, img: { tree: 'deco_summer_tree', booth: 'deco_summer_booth', garland: 'deco_summer_garland' } },
  { id: 'autumn', name: '단풍 달맞이 축제', token: 'petal_autumn', icon: 'ev_ladder_autumn', emoji: '🍁', names: { tree: '감나무 화분', booth: '보름달 포토 부스', garland: '단풍 가랜드' }, img: { tree: 'deco_autumn_tree', booth: 'deco_autumn_booth', garland: 'deco_autumn_garland' } },
  { id: 'winter', name: '눈꽃 연말 축제', token: 'petal_winter', icon: 'ev_ladder_winter', emoji: '❄️', names: { tree: '눈꽃 트리', booth: '스노볼 포토 부스', garland: '눈꽃 가랜드' }, img: { tree: 'deco_winter_tree', booth: 'deco_winter_booth', garland: 'deco_winter_garland' } },
];
export const theme = () => THEMES[weekNoE() % THEMES.length];
const weekNoE = () => Math.floor((dayNo() + 3) / 7);
// 장식 키: '테마_자리' (예전 저장의 'tree' 는 벚꽃)
export const decoInfo = key => { const [t, slot] = key.includes('_') ? key.split('_') : ['spring', key], th = THEMES.find(x => x.id === t) || THEMES[0]; return { n: th.names[slot], img: th.img[slot], slot, theme: th.id }; };
export const LADDER = { tiers: [20, 50, 90, 140, 200, 270, 350, 440, 540, 650],
  rewards: [{ energy: 20 }, { pack: 'basic' }, { deco: 'tree' }, { gems: 10 }, { items: ['chest'] }, { deco: 'booth' }, { pack: 'gold' }, { gems: 25, energy: 40 }, { pack: 'diamond' }, { deco: 'garland', gems: 30 }] };
export const decoName = slot => theme().names[slot];
const weekNo = () => Math.floor((dayNo() + 3) / 7);
export function ladder() { const d = load(); if (!d.ladder || d.ladder.week !== weekNo()) { d.ladder = { week: weekNo(), pts: 0, got: [] }; save(); } return d.ladder; }
export function ladderAdd(n) { const l = ladder(); l.pts += n; save(); return n; }
export const ladderReady = () => { const l = ladder(); return LADDER.tiers.filter((t, i) => l.pts >= t && !l.got.includes(i)).length; };
export const ladderEndsIn = () => (weekNo() + 1) * 7 * DAY - 3 * DAY - (Date.now() - new Date().getTimezoneOffset() * 6e4);
export function ladderClaim(i) { const l = ladder(), d = load(); if (l.pts < LADDER.tiers[i] || l.got.includes(i)) return null; l.got.push(i); const r = LADDER.rewards[i]; if (r.deco) { const key = `${theme().id}_${r.deco}`; d.deco = d.deco || []; if (!d.deco.includes(key)) d.deco.push(key); d.decoShow = theme().id; } save(); return r; }

// ── VIP 손님 (이틀마다 5주문)
export const VIP = { goal: 5, reward: { pack: 'diamond', gems: 30, items: ['chest'] } };
const vipCycle = () => Math.floor(dayNo() / 2);
export function vip() { const d = load(); if (!d.vip || d.vip.cycle !== vipCycle()) { d.vip = { cycle: vipCycle(), done: 0, claimed: false }; save(); } return d.vip; }
export const vipWants = () => { const v = vip(); return v.done < VIP.goal; };
export function vipAdd() { const v = vip(); if (v.done < VIP.goal) v.done++; save(); return v.done; }
export function vipClaim() { const v = vip(); if (v.done < VIP.goal || v.claimed) return null; v.claimed = true; save(); return VIP.reward; }
export const vipEndsIn = () => (vipCycle() + 1) * 2 * DAY - (Date.now() - new Date().getTimezoneOffset() * 6e4);

export const fmtLeft = ms => { const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : h ? `${h}시간 ${m}분` : `${m}분`; };
