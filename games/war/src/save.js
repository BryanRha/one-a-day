// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'front_tactics_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, tips: {},
    xp: 0, battles: 0, wins: 0, kills: 0, captures: 0, medals: 0,
    stars: {}, bestDays: {}, cos: { ella: 1 }, coXp: {}, co: 'ella', level: 'normal',
    streak: { last: '', count: 0 }, missions: { date: '', list: [] }, daily: { date: '', best: 0, tries: 0, won: false },
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
