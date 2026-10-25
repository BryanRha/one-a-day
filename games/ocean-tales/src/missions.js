// 출석 보상(7일 주기) + 일일 미션(매일 3개). 진행은 save.js 의 같은 저장소에 함께 저장한다.
// 보상은 모두 정해진 내용이고 미리 보여 준다 (무작위 뽑기 없음).
import { load, save, addCoins, addBooster } from './save.js?v=0.56.1';
import { count, newlyReached } from './progress.js?v=0.56.1';

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ── 출석 보상 ────────────────────────────────────────────────
export const DAILY_REWARDS = [
  { coins: 50 },
  { boosters: { hammer: 1 } },
  { coins: 100 },
  { boosters: { shuffle: 1 } },
  { coins: 150 },
  { boosters: { swap: 1, moves: 1 } },
  { coins: 300, boosters: { hammer: 1, shuffle: 1, swap: 1, moves: 1 } },
];

export function dailyState() {
  const d = load();
  d.daily = d.daily || { last: '', count: 0 };
  return { ...d.daily, canClaim: d.daily.last !== today(), index: d.daily.count % 7 };
}

export function claimDaily() {
  const st = dailyState();
  if (!st.canClaim) return null;
  const r = DAILY_REWARDS[st.index];
  giveReward(r);
  const d = load();
  d.daily = { last: today(), count: st.count + 1 };
  save();
  return r;
}

export function giveReward(r) {
  if (r.coins) addCoins(r.coins);
  for (const [k, n] of Object.entries(r.boosters || {})) addBooster(k, n);
}

// ── 일일 미션 ────────────────────────────────────────────────
// ev: 게임에서 보내는 사건 이름, arg: 색 번호 등 조건
const POOL = [
  { id: 'win3', ev: 'win', target: 3, coins: 60 },
  { id: 'stars6', ev: 'stars', target: 6, coins: 60 },
  { id: 'crab', ev: 'collect', arg: 0, target: 60, coins: 50 },
  { id: 'clown', ev: 'collect', arg: 1, target: 60, coins: 50 },
  { id: 'puffer', ev: 'collect', arg: 2, target: 60, coins: 50 },
  { id: 'turtle', ev: 'collect', arg: 3, target: 60, coins: 50 },
  { id: 'whale', ev: 'collect', arg: 4, target: 60, coins: 50 },
  { id: 'bomb5', ev: 'bomb', target: 5, coins: 70 },
  { id: 'line8', ev: 'line', target: 8, coins: 70 },
  { id: 'make6', ev: 'make', target: 6, coins: 60 },
  { id: 'oil30', ev: 'jelly', target: 30, coins: 60 },
  { id: 'cover15', ev: 'cover', target: 15, coins: 60 },
  { id: 'combo3', ev: 'combo', target: 3, coins: 80 },
  { id: 'restore1', ev: 'restore', target: 1, coins: 60 },
];
export const ALL_BONUS = { coins: 150, boosters: { hammer: 1 } };

// 날짜로 정해지는 3개 (같은 날엔 누구에게나 같은 미션)
function pick(date) {
  let h = 0; for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = [...POOL.keys()];
  const out = [];
  while (out.length < 3) {
    h = (h * 1103515245 + 12345) >>> 0;
    const i = idx.splice(h % idx.length, 1)[0];
    // 같은 종류(모으기)는 하루에 하나만
    if (POOL[i].ev === 'collect' && out.some(m => POOL[m].ev === 'collect')) continue;
    out.push(i);
  }
  return out.map(i => ({ id: POOL[i].id, progress: 0, claimed: false }));
}

export function missions() {
  const d = load();
  const t = today();
  if (!d.missions || d.missions.date !== t) { d.missions = { date: t, list: pick(t), bonus: false }; save(); }
  return d.missions.list.map(m => ({ ...POOL.find(p => p.id === m.id), ...m }));
}

let dirty = false;
const listeners = [];
export function onMissionDone(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }

// 사건 기록 (게임 중에는 메모리에만 쌓고 flush() 때 저장)
export function track(ev, n = 1, arg = null) {
  count(ev, n, arg);           // 누적 기록 (도감·업적)
  dirty = true;
  const d = load();
  if (!d.missions || d.missions.date !== today()) missions();
  for (const m of d.missions.list) {
    const def = POOL.find(p => p.id === m.id);
    if (!def || def.ev !== ev || (def.arg != null && def.arg !== arg) || m.progress >= def.target) continue;
    m.progress = Math.min(def.target, m.progress + n);
    dirty = true;
    if (m.progress >= def.target) listeners.forEach(fn => fn({ kind: 'mission', ...def }));
  }
}
export function flush() {
  if (!dirty) return;
  const d = load();
  // 처음 한 번은 이미 이룬 것들을 조용히 기록 (기존 플레이어에게 알림이 쏟아지지 않게)
  if (!d.progressInit) { newlyReached(); d.progressInit = true; }
  else for (const r of newlyReached()) listeners.forEach(fn => fn({ kind: r.type, ...r }));
  save(); dirty = false;
}

export function claimMission(id) {
  const d = load();
  const m = d.missions && d.missions.list.find(x => x.id === id);
  const def = POOL.find(p => p.id === id);
  if (!m || !def || m.claimed || m.progress < def.target) return false;
  m.claimed = true; addCoins(def.coins); save();
  return true;
}
export function canClaimBonus() { const d = load(); return d.missions && !d.missions.bonus && d.missions.list.every(m => m.claimed); }
export function claimBonus() { if (!canClaimBonus()) return false; load().missions.bonus = true; giveReward(ALL_BONUS); track('missionBonus'); flush(); return true; }
export function claimableCount() { return missions().filter(m => !m.claimed && m.progress >= m.target).length + (canClaimBonus() ? 1 : 0); }
