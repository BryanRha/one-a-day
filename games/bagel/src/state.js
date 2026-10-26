// 저장 (localStorage 'marumi_v1'): 돈 · 지점별 열린 것/직원/칸에 부은 돈 · 강화 · 오늘 판 개수(쿠폰) · 미션 · 출석
import { COUPON } from './data.js?v=0.59.1';
const KEY = 'marumi_v1';
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fresh = () => ({ v: 1, coins: 0, earned: 0, bi: 0, branch: {}, up: {}, day: '', sold: 0, totalSold: 0, coupon: null, miss: {}, missDone: {}, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), seen: {} });
export let S = fresh();
export function loadSave() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) S = Object.assign(fresh(), s); } catch { /* */ } dayTick(); return S; }
let tm = null;
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }; if (now) f(); else tm = setTimeout(f, 400); }
export function dayTick() { if (S.day !== today()) { S.day = today(); S.sold = 0; S.coupon = null; S.miss = {}; S.missDone = {}; } }
export function addSold(n) { dayTick(); S.sold += n; S.totalSold += n; mission('sell', n); save(); }
export const couponReady = () => S.sold >= COUPON.goal && !S.coupon;
// 쿠폰 번호: 날짜 + 기기 → 매장에서 확인 (형식은 트렌차이즈와 정함)
export function claimCoupon() { if (!couponReady()) return null; let h = 0; for (const c of S.id + S.day) h = (h * 31 + c.charCodeAt(0)) >>> 0; S.coupon = { code: 'MRM-' + S.day.slice(5).replace('-', '') + '-' + (h % 100000).toString().padStart(5, '0'), at: Date.now() }; save(true); return S.coupon; }
export const MISSIONS = [
  { id: 'sell', name: '베이글 50개 팔기', goal: 50, coins: 300 }, { id: 'serve', name: '손님 20명 받기', goal: 20, coins: 250 }, { id: 'clean', name: '쓰레기 15개 치우기', goal: 15, coins: 200 },
  { id: 'unlock', name: '새로운 것 2개 열기', goal: 2, coins: 400 }, { id: 'dough', name: '반죽 10개 오븐에 넣기', goal: 10, coins: 350 }, { id: 'coins', name: '돈 3,000 모으기', goal: 3000, coins: 500 },
];
export function mission(id, n = 1) { dayTick(); S.miss[id] = (S.miss[id] || 0) + n; }
export const missionReady = () => MISSIONS.some(m => (S.miss[m.id] || 0) >= m.goal && !S.missDone[m.id]);
export function claimMission(id) { const m = MISSIONS.find(x => x.id === id); if (!m || S.missDone[id] || (S.miss[id] || 0) < m.goal) return 0; S.missDone[id] = 1; const v = m.coins * mult(); S.coins += v; save(); return v; }
export const mult = () => [1, 4, 14][S.bi] || 1;
