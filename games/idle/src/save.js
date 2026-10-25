// 저장 (localStorage) — 영웅 · 팀 · 장비 · 진행 · 재화 한 덩어리
const KEY = 'dawn_v1';
let data = null;
export const fresh = () => ({ v: 1, sfx: true, music: true, gold: 0, gems: 300, keys: 10,
  heroes: { cloud: { lv: 1, star: 1, shards: 0 }, kenneth: { lv: 1, star: 1, shards: 0 }, flora: { lv: 1, star: 1, shards: 0 } }, team: ['cloud', 'kenneth', 'flora'], freePull: 1, stage: 1, maxStage: 1, gauge: 0, autoBoss: false, autoChest: false,
  gear: {}, chestLv: 1, summon: { lv: 1, count: 0, pity: 0 }, quest: { i: 0, prog: 0, base: 3 }, seen: Date.now(),
  stats: { kills: 0, chests: 0, summons: 0, lvups: 0, bosses: 0 }, cuts: {}, freed: [], tut: 0, items: {}, pets: { rue: 1 }, pet: 'rue', dg: {}, arena: { pts: 1000, seed: 7, wins: 0 }, disp: {} });
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh(); if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
export function reset() { data = fresh(); save(); }
