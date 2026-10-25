// 진행 상황 저장 (localStorage — 실패해도 게임은 메모리 상태로 계속 동작)
const KEY = 'thefarm_puzzle_v1';
// 더팜 저장(코인 · 재료 · 자재)과 이어 씀
const FARM = 'thefarm_v1';
export function farm(fn) { try { const f = JSON.parse(localStorage.getItem(FARM) || 'null'); if (!f) return null; const r = fn(f); localStorage.setItem(FARM, JSON.stringify(f)); return r; } catch { return null; } }
const farmCoins = () => { try { const f = JSON.parse(localStorage.getItem(FARM) || 'null'); return f ? f.coins : null; } catch { return null; } };
const DEFAULT = {
  unlocked: 1, stars: {}, best: {}, coins: 300,
  boosters: { hammer: 3, shuffle: 2, swap: 2, moves: 1 },
  sfx: true, music: true, seenTut: {},
  streak: 0,            // 연승 (실패하거나 도중에 포기하면 0)
  restore: {},          // 월드 → 완료한 바다 복원 과제 수
  starsSpent: 0,        // 바다 복원에 쓴 별
};

let data = null;

export function load() {
  if (data) return data;
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? { ...structuredClone(DEFAULT), ...JSON.parse(raw) } : structuredClone(DEFAULT);
    data.boosters = { ...DEFAULT.boosters, ...data.boosters };
  } catch { data = structuredClone(DEFAULT); }
  { const fc = farmCoins(); if (fc !== null) data.coins = fc; }
  return data;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 사생활 보호 모드 등 */ }
  farm(f => { f.coins = data.coins; });
}

export function recordWin(levelId, stars, score, maxLevel) {
  const d = load();
  d.stars[levelId] = Math.max(d.stars[levelId] || 0, stars);
  d.best[levelId] = Math.max(d.best[levelId] || 0, score);
  d.unlocked = Math.min(maxLevel, Math.max(d.unlocked, levelId + 1));
  save();
}

export function addCoins(n) { const d = load(); d.coins = Math.max(0, d.coins + n); save(); return d.coins; }
export function spendCoins(n) { const d = load(); if (d.coins < n) return false; d.coins -= n; save(); return true; }
export function useBooster(k) { const d = load(); if ((d.boosters[k] || 0) <= 0) return false; d.boosters[k]--; save(); return true; }
export function addBooster(k, n = 1) { const d = load(); d.boosters[k] = (d.boosters[k] || 0) + n; save(); }
export function totalStars() { return Object.values(load().stars).reduce((a, b) => a + b, 0); }
// 별은 '모은 총량'과 '쓸 수 있는 양'을 따로 본다 (바다 복원에 쓰면 쓸 수 있는 양만 줄어듦)
export function availableStars() { return Math.max(0, totalStars() - (load().starsSpent || 0)); }
export function spendStars(n) { const d = load(); if (availableStars() < n) return false; d.starsSpent = (d.starsSpent || 0) + n; save(); return true; }
export function addStreak() { const d = load(); d.streak = (d.streak || 0) + 1; save(); return d.streak; }
export function breakStreak() { const d = load(); const had = d.streak || 0; d.streak = 0; save(); return had; }
