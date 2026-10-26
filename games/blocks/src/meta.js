// 진행·재방문 장치: 연속 출석 · 오늘의 미션 · 어드벤처 시즌(주간 96레벨 그림) · 블록 스킨 · 기록
import { load, save } from './save.js?v=0.59.1';
import { seasonInfo, SEASON_LEVELS } from './core/levels.js?v=0.59.1';

export const PICS = 10;   // 주간 그림 수 (assets season_0~9, 주마다 돌아감)
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 블록 스킨 (별 조각으로 해금) ──
export const SKINS = [
  { id: 'jewel', name: '주얼', cost: 0, desc: '선명한 보석 블록' },
  { id: 'glass', name: '글래스', cost: 120, desc: '투명하게 빛나는 유리' },
  { id: 'neon', name: '네온', cost: 240, desc: '어둠 속에 빛나는 선' },
  { id: 'matte', name: '매트', cost: 360, desc: '차분한 무광 세라믹' },
  { id: 'gold', name: '골드', cost: 800, desc: '모든 블록이 금빛으로' },
];

// ── 오늘의 미션 (매일 3개) ──
const POOL = [
  { id: 'lines20', kind: 'lines', goal: 20, text: '줄 20개 지우기', reward: 20 },
  { id: 'lines50', kind: 'lines', goal: 50, text: '줄 50개 지우기', reward: 40 },
  { id: 'combo5', kind: 'combo', goal: 5, text: '콤보 5 달성하기', reward: 25 },
  { id: 'combo10', kind: 'combo', goal: 10, text: '콤보 10 달성하기', reward: 45 },
  { id: 'multi3', kind: 'multi', goal: 3, text: '한 번에 3줄 지우기', reward: 30 },
  { id: 'score3k', kind: 'score', goal: 3000, text: '클래식 한 판 3,000점', reward: 25 },
  { id: 'score8k', kind: 'score', goal: 8000, text: '클래식 한 판 8,000점', reward: 45 },
  { id: 'adv3', kind: 'adv', goal: 3, text: '어드벤처 3레벨 깨기', reward: 35 },
  { id: 'adv6', kind: 'adv', goal: 6, text: '어드벤처 6레벨 깨기', reward: 60 },
  { id: 'gems30', kind: 'gems', goal: 30, text: '보석 30개 모으기', reward: 30 },
  { id: 'clear1', kind: 'allclear', goal: 1, text: '판 전체 비우기 1번', reward: 50 },
  { id: 'games3', kind: 'games', goal: 3, text: '3판 플레이하기', reward: 15 },
];
function pickMissions(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 50; i++) { const m = POOL[(h + i * 7) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pickMissions(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
// 진행 기록: 누적형(lines·adv·gems·games·allclear)은 더하고, 최고형(combo·multi·score)은 최댓값
export function track(kind, v = 1) {
  const d = load(); missions();
  let newly = 0;
  for (const m of d.missions.list) {
    const def = POOL.find(p => p.id === m.id); if (def.kind !== kind) continue;
    const before = m.prog >= def.goal;
    m.prog = ['combo', 'multi', 'score'].includes(kind) ? Math.max(m.prog, v) : m.prog + v;
    if (!before && m.prog >= def.goal) newly++;
  }
  save();
  return newly;
}
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.stars += def.reward; save(); return def.reward;
}
export const unclaimed = () => missions().some(m => m.done && !m.claimed);

// ── 연속 출석: 오늘 처음 들어오면 +1 (어제 안 했으면 1부터), 7일마다 보너스 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 70 : 10;
  d.stars += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 어드벤처 시즌: 주마다 새 그림 96칸, 레벨을 깰 때마다 한 칸씩 드러남 ──
export function adv() {
  const d = load(), si = seasonInfo();
  if (d.adv.season !== si.season) {
    // 지난 시즌 기록 보관 (그림 갤러리 · 트로피)
    if (d.adv.season >= 0 && d.adv.cleared > 0) d.gallery.push({ season: d.adv.season, cleared: d.adv.cleared, trophy: d.adv.cleared >= SEASON_LEVELS });
    d.adv = { season: si.season, cleared: 0, winStreak: 0 };
    save();
  }
  return { ...d.adv, ...si, picture: `season_${si.season % PICS}` };
}
export function advWin() { const d = load(); adv(); d.adv.cleared = Math.min(SEASON_LEVELS, d.adv.cleared + 1); d.adv.winStreak++; if (d.adv.cleared >= SEASON_LEVELS && !d.adv.trophy) { d.adv.trophy = true; d.trophies++; } save(); return d.adv; }
export function advLose() { const d = load(); adv(); d.adv.winStreak = 0; save(); }

// ── 구원 모드: 최근 두 판을 연달아 금방 졌으면 다음 판은 줄 지우기 좋은 조각 위주 ──
export function noteClassic(score, moves) {
  const d = load();
  d.recent = [...(d.recent || []), moves < 25 ? 1 : 0].slice(-2);
  save();
}
export function wantMercy() { const r = load().recent || []; return r.length === 2 && r[0] && r[1]; }
