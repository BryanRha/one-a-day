// 진행 · 재방문: 계급(경험치) · 캠페인 별 · 지휘관 해금 · 연속 출석 · 오늘의 미션 · 오늘의 작전
import { load, save } from './save.js?v=0.10.0';
import { MAPS } from './core/maps.js?v=0.10.0';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 계급 (워스토리처럼 이병부터 대장까지) ──
export const RANKS = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '소위', '중위', '대위', '소령', '중령', '대령', '준장', '소장', '중장', '대장'];
export const rankNeed = k => Math.round(60 * Math.pow(k, 1.45));    // k → k+1 에 필요한 경험치
export function rank() {
  const d = load(); let k = 0, rest = d.xp;
  while (k < RANKS.length - 1 && rest >= rankNeed(k + 1)) { rest -= rankNeed(k + 1); k++; }
  return { k, name: RANKS[k], into: rest, need: k < RANKS.length - 1 ? rankNeed(k + 1) : 1 };
}
export function addXp(n) { const before = rank().k; load().xp += n; save(); const after = rank().k; return after > before ? RANKS[after] : null; }

// ── 캠페인 ──
export const STAGES = MAPS.map((m, i) => ({ ...m, n: i + 1, ai: ['easy', 'easy', 'normal', 'normal', 'hard'][i] || 'hard', unlockCo: { m2: 'viktor', m3: 'jun', m5: 'scarlet' }[m.id] }));
export const stageOpen = i => i === 0 || (load().stars[STAGES[i - 1].id] || 0) > 0;
export const totalStars = () => Object.values(load().stars).reduce((a, b) => a + b, 0);
// 별: 승리 1 · 기준 일수 안 1 · 잃은 유닛 2기 이하 1
export function starsOf(r, par) { if (!r.win) return 0; return 1 + (r.day <= par ? 1 : 0) + (r.lost <= 2 ? 1 : 0); }

// ── 오늘의 작전: 모두 같은 지도 · 어려움 AI · 가장 빨리 이긴 날 기록 ──
export function dailyOp() {
  const day = dayKey(); let h = 11; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const d = load(); if (d.daily.date !== day) { d.daily = { date: day, best: 0, tries: 0, won: false }; save(); }
  return { day, map: MAPS[h % MAPS.length], best: d.daily.best, tries: d.daily.tries, won: d.daily.won };
}

// ── 연속 출석 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 3 : 1;
  d.medals += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 오늘의 미션 ──
const POOL = [
  { id: 'win1', kind: 'win', goal: 1, text: '전투 1번 승리', reward: 2 },
  { id: 'win2', kind: 'win', goal: 2, text: '전투 2번 승리', reward: 3 },
  { id: 'cap5', kind: 'capture', goal: 5, text: '건물 5곳 점령', reward: 2 },
  { id: 'cap10', kind: 'capture', goal: 10, text: '건물 10곳 점령', reward: 3 },
  { id: 'kill8', kind: 'kill', goal: 8, text: '적 유닛 8기 격파', reward: 2 },
  { id: 'kill20', kind: 'kill', goal: 20, text: '적 유닛 20기 격파', reward: 3 },
  { id: 'build6', kind: 'build', goal: 6, text: '유닛 6기 생산', reward: 2 },
  { id: 'power1', kind: 'power', goal: 1, text: '지휘관 필살기 1번', reward: 2 },
  { id: 'star3', kind: 'stars3', goal: 1, text: '별 3개로 승리', reward: 3 },
  { id: 'daily', kind: 'daily', goal: 1, text: '오늘의 작전 참여', reward: 2 },
];
function pick(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 60; i++) { const m = POOL[(h + i * 7) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pick(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
export function track(kind, v = 1) {
  const d = load(); missions();
  for (const m of d.missions.list) { const def = POOL.find(p => p.id === m.id); if (def.kind === kind) m.prog += v; }
  save();
}
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.medals += def.reward; d.xp += 20; save(); return def.reward;
}
export const unclaimed = () => missions().some(m => m.done && !m.claimed);

// ── 전투 결과 반영 ──
// r: { mode, mapId, win, day, lost, kills, captures, built, powers, co }
export function finish(r) {
  const d = load(), st = STAGES.find(s => s.id === r.mapId);
  d.battles++; if (r.win) d.wins++; d.kills += r.kills; d.captures += r.captures;
  let stars = 0, newStars = 0, unlocked = null;
  if (r.mode === 'campaign' && st) {
    stars = starsOf(r, st.par); const prev = d.stars[st.id] || 0;
    if (stars > prev) { newStars = stars - prev; d.stars[st.id] = stars; }
    if (r.win && st.unlockCo && !d.cos[st.unlockCo]) { d.cos[st.unlockCo] = 1; unlocked = st.unlockCo; }
    if (r.win && (!d.bestDays[st.id] || r.day < d.bestDays[st.id])) d.bestDays[st.id] = r.day;
  }
  if (r.mode === 'daily') { d.daily.tries++; if (r.win && (!d.daily.best || r.day < d.daily.best)) d.daily.best = r.day; if (r.win) d.daily.won = true; }
  d.coXp[r.co] = (d.coXp[r.co] || 0) + (r.win ? 30 : 10);
  const xp = 20 + (r.win ? 50 : 0) + newStars * 30 + r.kills * 3 + r.captures * 2;
  save();
  const up = addXp(xp);
  track('win', r.win ? 1 : 0); track('capture', r.captures); track('kill', r.kills); track('build', r.built); track('power', r.powers);
  if (stars === 3) track('stars3'); if (r.mode === 'daily') track('daily');
  return { stars, newStars, unlocked, xp, rankUp: up };
}
export const coLevel = co => 1 + Math.floor(Math.sqrt((load().coXp[co] || 0) / 40));
