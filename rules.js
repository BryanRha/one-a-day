// 이용 규칙 + 저장. BM 이 정해지면 RULES 값만 바꾸면 되도록 분리해 둠.
import { LAUNCH, GAMES, ORDER } from './catalog.js?v=0.45.4';

export const RULES = {
  openAll: true,            // 테스트 기간: 모든 게임 자유 플레이 (BM 확정 후 false 로 바꾸면 하루 한 게임 규칙 적용)
  todayFree: true,          // 오늘의 게임은 하루 종일 무료
  adUnlock: 'day',          // 광고로 연 게임: 'day' = 그날 하루 동안 / 'once' = 한 판
  adSeconds: 5,             // 테스트용 가짜 광고 길이
  purchase: false,          // 결제(소장) 아직 미연결
};

const KEY = 'oneaday_v1';
let S = null;
function fresh() { return { v: 1, library: {}, history: {}, unlocks: {}, owned: {}, streak: { last: '', count: 0 }, dayOffset: 0, intro: false }; }
export function state() {
  if (S) return S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { S = null; }
  if (!S || S.v !== 1) S = fresh();
  for (const [k, v] of Object.entries(fresh())) if (S[k] === undefined) S[k] = v;
  return S;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state())); } catch { /* */ } }
export function resetAll() { S = fresh(); save(); }

// ── 날짜 (기기 현지 날짜 기준, 테스트용 dayOffset) ──
export function now() { return new Date(Date.now() + state().dayOffset * 864e5); }
export const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dayIndex(d = now()) {
  const [y, m, dd] = LAUNCH.split('-').map(Number);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(y, m - 1, dd)) / 864e5);
}
export function gameOn(idx) { const n = ORDER.length; return ORDER[((idx % n) + n) % n]; }
export const todayId = () => gameOn(dayIndex());
export function msToTomorrow() { const d = now(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return t - d; }

// ── 접근 권한 ──
// 'today' 오늘의 게임 · 'owned' 소장 · 'unlocked' 광고로 열림 · 'locked' 잠김
export function access(id) {
  const s = state();
  if (RULES.todayFree && id === todayId()) return 'today';
  if (RULES.openAll) return 'free';
  if (s.owned[id]) return 'owned';
  if (s.unlocks[id] === keyOf(now())) return 'unlocked';
  return 'locked';
}
export const canPlay = id => access(id) !== 'locked';

export function unlockByAd(id) { const s = state(); s.unlocks[id] = keyOf(now()); save(); }

// 플레이 기록: 라이브러리 저장 · 연속 출석(오늘의 게임을 한 날 기준)
export function recordPlay(id) {
  const s = state(), today = keyOf(now());
  const e = s.library[id] || (s.library[id] = { first: today, plays: 0, last: '' });
  e.plays++; e.last = today;
  if (id === todayId()) {
    s.history[today] = id;
    if (s.streak.last !== today) {
      const y = new Date(now()); y.setDate(y.getDate() - 1);
      s.streak.count = s.streak.last === keyOf(y) ? s.streak.count + 1 : 1;
      s.streak.last = today;
    }
  }
  if (RULES.adUnlock === 'once' && access(id) === 'unlocked') delete s.unlocks[id];
  save();
}

// 공개된 게임 = 오늘까지 한 번이라도 '오늘의 게임'이었던 것
export function released() {
  if (RULES.openAll) return ORDER.slice();
  const idx = dayIndex(), seen = new Set();
  for (let i = 0; i <= idx && seen.size < ORDER.length; i++) seen.add(gameOn(i));
  return ORDER.filter(id => seen.has(id));
}
export { GAMES, ORDER };
