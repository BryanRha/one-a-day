// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'rune_dice_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, tips: {},
    best: 0, plays: 0, kills: 0, bossKills: 0, crystals: 0,
    deck: ['flame', 'frost', 'storm', 'iron', 'gale'], unlocked: { flame: 1, frost: 1, storm: 1, iron: 1, gale: 1 }, tiers: {},
    cards: {}, newRunes: {}, limit: {}, field: 'altar', fields: { altar: 1 }, calib: [], lastPred: null, arcade: {}, abyss: { date: '', tries: 0 }, keys: 1, legendTix: 0, fame: 0, roadClaimed: {}, shop: { date: '', bought: [] }, pity: 0, pulls: 0, freeDraw: '', milestones: {}, decks: null, deckIdx: 0,
    streak: { last: '', count: 0 }, missions: { date: '', list: [] }, daily: { date: '', best: 0, tries: 0 },
  };
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
