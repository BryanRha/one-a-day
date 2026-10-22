// 누적 기록 · 바다 친구 도감 · 업적. missions.track() 이 사건마다 여기 count() 를 부른다.
// 도감: 3등급(동·은·금), 첫 등급에서 카드가 열림. 업적: 한 번 달성. 보상은 화면에서 직접 받는다.
import { load, save, addCoins, totalStars } from './save.js?v=0.24.2';

function stats() {
  const d = load();
  d.stats = d.stats || {};
  d.stats.collect = d.stats.collect || [0, 0, 0, 0, 0, 0];
  return d.stats;
}

export function count(ev, n = 1, arg = null) {
  const s = stats();
  if (ev === 'collect') { if (arg >= 0 && arg < 6) s.collect[arg] += n; return; }
  if (ev === 'rescue') { const k = `rescue_${arg || 'a'}`; s[k] = (s[k] || 0) + n; return; }
  if (ev === 'comboLevel' || ev === 'streak') { const k = ev === 'comboLevel' ? 'maxCombo' : 'maxStreak'; s[k] = Math.max(s[k] || 0, n); return; }
  s[ev] = (s[ev] || 0) + n;
}

// 이름으로 값 읽기 (저장된 누적 + 다른 저장 항목에서 계산)
export function stat(name) {
  const d = load(), s = stats();
  switch (name) {
    case 'unlocked': return d.unlocked;
    case 'starsTotal': return totalStars();
    case 'worldsCleared': return Math.floor((d.unlocked - 1) / 10);
    case 'reefWorlds': return Object.values(d.restore || {}).filter(n => n >= 6).length;
    case 'dailyCount': return (d.daily && d.daily.count) || 0;
    default:
      if (name.startsWith('collect')) return s.collect[+name.slice(7)] || 0;
      return s[name] || 0;
  }
}

// ── 도감 ────────────────────────────────────────────────────
export const DEX = [
  { id: 'crab', key: 'tile_red', stat: 'collect0', tiers: [100, 500, 2000] },
  { id: 'clown', key: 'tile_orange', stat: 'collect1', tiers: [100, 500, 2000] },
  { id: 'puffer', key: 'tile_yellow', stat: 'collect2', tiers: [100, 500, 2000] },
  { id: 'turtle', key: 'tile_green', stat: 'collect3', tiers: [100, 500, 2000] },
  { id: 'whale', key: 'tile_blue', stat: 'collect4', tiers: [100, 500, 2000] },
  { id: 'octopus', key: 'tile_purple', stat: 'collect5', tiers: [50, 250, 1000] },
  { id: 'starfish', key: 'item_collect_star', stat: 'star', tiers: [10, 60, 200] },
  { id: 'babyfish', key: 'item_drop_a', stat: 'rescue_a', tiers: [3, 15, 50] },
  { id: 'seahorse', key: 'item_drop_b', stat: 'rescue_b', tiers: [3, 15, 50] },
  { id: 'jellyfish', key: 'map_deco_jellyfish', stat: 'worldsCleared', tiers: [3, 15, 40] },
  { id: 'coral', key: 'map_deco_coral_tree', stat: 'restore', tiers: [6, 60, 240] },
  { id: 'mongi', key: 'mascot_happy', stat: 'win', tiers: [10, 100, 500] },
];
export const DEX_COINS = [50, 100, 200];

export function dexLevel(e) { const v = stat(e.stat); return e.tiers.filter(x => v >= x).length; }
export function dexClaimed(id) { const d = load(); return (d.dexClaimed && d.dexClaimed[id]) || 0; }
export function claimDex(id) {
  const e = DEX.find(x => x.id === id); if (!e) return 0;
  const lv = dexLevel(e), got = dexClaimed(id);
  if (lv <= got) return 0;
  let coins = 0; for (let i = got; i < lv; i++) coins += DEX_COINS[i];
  const d = load(); d.dexClaimed = { ...(d.dexClaimed || {}), [id]: lv }; addCoins(coins); save();
  return coins;
}

// ── 업적 ────────────────────────────────────────────────────
export const ACH = [
  { id: 'win1', stat: 'win', n: 1, coins: 50 },
  { id: 'lv10', stat: 'unlocked', n: 11, coins: 100 },
  { id: 'lv30', stat: 'unlocked', n: 31, coins: 150 },
  { id: 'lv60', stat: 'unlocked', n: 61, coins: 200 },
  { id: 'lv100', stat: 'unlocked', n: 101, coins: 300 },
  { id: 'lv200', stat: 'unlocked', n: 201, coins: 400 },
  { id: 'lv500', stat: 'unlocked', n: 501, coins: 1000 },
  { id: 'stars50', stat: 'starsTotal', n: 50, coins: 100 },
  { id: 'stars150', stat: 'starsTotal', n: 150, coins: 200 },
  { id: 'stars300', stat: 'starsTotal', n: 300, coins: 300 },
  { id: 'stars800', stat: 'starsTotal', n: 800, coins: 500 },
  { id: 'stars1500', stat: 'starsTotal', n: 1500, coins: 1000 },
  { id: 'pearl1', stat: 'pearl', n: 1, coins: 100 },
  { id: 'bomb100', stat: 'bomb', n: 100, coins: 150 },
  { id: 'line200', stat: 'line', n: 200, coins: 150 },
  { id: 'combo6', stat: 'maxCombo', n: 6, coins: 150 },
  { id: 'streak5', stat: 'maxStreak', n: 5, coins: 150 },
  { id: 'rescue20', stat: 'rescue_a', n: 20, coins: 150 },
  { id: 'reef1', stat: 'reefWorlds', n: 1, coins: 150 },
  { id: 'reef10', stat: 'reefWorlds', n: 10, coins: 400 },
  { id: 'reef50', stat: 'reefWorlds', n: 50, coins: 1000 },
  { id: 'daily7', stat: 'dailyCount', n: 7, coins: 150 },
  { id: 'daily30', stat: 'dailyCount', n: 30, coins: 400 },
  { id: 'mission10', stat: 'missionBonus', n: 10, coins: 300 },
];

export const achDone = a => stat(a.stat) >= a.n;
export const achClaimed = id => !!(load().achClaimed || {})[id];
export function claimAch(id) {
  const a = ACH.find(x => x.id === id);
  if (!a || !achDone(a) || achClaimed(id)) return 0;
  const d = load(); d.achClaimed = { ...(d.achClaimed || {}), [id]: true }; addCoins(a.coins); save();
  return a.coins;
}

export const dexClaimable = () => DEX.filter(e => dexLevel(e) > dexClaimed(e.id)).length;
export const achClaimable = () => ACH.filter(a => achDone(a) && !achClaimed(a.id)).length;

// 새로 도달한 도감 등급 · 업적 (알림용, 한 번만)
export function newlyReached() {
  const d = load();
  d.seenDex = d.seenDex || {}; d.seenAch = d.seenAch || {};
  const out = [];
  for (const e of DEX) { const lv = dexLevel(e); if (lv > (d.seenDex[e.id] || 0)) { d.seenDex[e.id] = lv; out.push({ type: 'dex', id: e.id, key: e.key, lv }); } }
  for (const a of ACH) if (achDone(a) && !d.seenAch[a.id]) { d.seenAch[a.id] = true; out.push({ type: 'ach', id: a.id }); }
  return out;
}
