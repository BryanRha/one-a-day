// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'panda_blocks_v1';
let data = null;
function fresh() {
  return {
    v: 1, best: 0, plays: 0, lines: 0, bestCombo: 0, tips: {}, sfx: true, music: true,
    stars: 0, skin: 'jewel', skins: { jewel: true }, streak: { last: '', count: 0 }, missions: { date: '', list: [] },
    adv: { season: -1, cleared: 0, winStreak: 0 }, gallery: [], trophies: 0, theme: 0, recent: [], todayBest: { date: '', score: 0 },
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
