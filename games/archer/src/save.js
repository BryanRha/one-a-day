// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'star_archer_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, tips: {},
    gold: 0, gems: 30, hero: 'arin', heroes: { arin: 1 },
    best: {}, cleared: {}, runs: 0, kills: 0,
    // 장비 (원작 2 구조): items = 가진 장비 전부 { id, set, slot, t 등급 } · eq = 칸마다 장착한 장비 id · lv = 칸 레벨 · scroll = 칸별 강화 두루마리
    v2: true, items: [{ id: 1, set: 'basic', slot: 'weapon', t: 0 }, { id: 2, set: 'basic', slot: 'armor', t: 0 }], nextId: 3,
    eq: { weapon: 1, armor: 2 }, lv: { weapon: 1, armor: 1, helm: 1, boots: 1, amulet: 1, ring: 1 },
    scroll: { weapon: 0, armor: 0, helm: 0, boots: 0, amulet: 0, ring: 0 }, keys: { silver: 3, obs: 1 }, pityObs: 0, milestones: {},
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
  // 예전 장비(활·갑옷·반지 3칸 · 등급 4단계) → 새 구조로 옮김: 등급 일반→일반, 희귀→희귀, 영웅→영웅, 전설→전설 · 레벨은 칸 레벨로
  if (!data.v2) {
    const TM = [0, 2, 3, 6], SL = { bow: 'weapon', armor: 'armor', ring: 'ring' }, items = [], eq = {}, lv = {}; let id = 1;
    for (const [o, n] of Object.entries(SL)) { const g = data.gear && data.gear[o]; if (g) { items.push({ id, set: 'basic', slot: n, t: TM[g.r] || 0 }); eq[n] = id++; lv[n] = g.lv || 1; } }
    for (const b of data.bag || []) if (SL[b.slot]) items.push({ id: id++, set: 'basic', slot: SL[b.slot], t: TM[b.r] || 0 });
    Object.assign(data, { v2: true, items, nextId: id, eq, lv: { ...f.lv, ...lv } });
    delete data.gear; delete data.bag;
  }
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
