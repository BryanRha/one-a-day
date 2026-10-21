// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'star_archer_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, tips: {},
    gold: 0, gems: 30, hero: 'arin', heroes: { arin: 1 },
    best: {}, cleared: {}, runs: 0, kills: 0,
    // 장비: 칸마다 장착 중인 것 { r 등급, lv 레벨 } · 보관함 (합성 재료)
    gear: { bow: { r: 0, lv: 1 }, armor: { r: 0, lv: 1 }, ring: null }, bag: [],
    talents: { hp: 0, atk: 0, gold: 0 },
    energy: 5, energyAt: 0,
    streak: { last: '', count: 0 }, missions: { date: '', list: [] }, daily: { date: '', best: 0, tries: 0 }, pity: 0,
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
