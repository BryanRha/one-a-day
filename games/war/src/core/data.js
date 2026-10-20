// 규칙 데이터: 유닛 · 지형 · 상성 · 지휘관 (화면과 무관 — Node 봇에서도 씀)

// 이동 방식: foot 도보 · mech 기계화(산·강 잘 감) · tire 바퀴 · tread 궤도 · air 공중
export const UNITS = {
  inf:     { name: '소총병',   cost: 1000,  move: 3, mt: 'foot',  range: [1, 1], capture: true, desc: '싸고 점령할 수 있어요' },
  bazooka: { name: '바주카병', cost: 3000,  move: 2, mt: 'mech',  range: [1, 1], capture: true, desc: '전차를 잡는 보병 · 점령 가능' },
  recon:   { name: '정찰차',   cost: 4000,  move: 8, mt: 'tire',  range: [1, 1], desc: '아주 빠르고 보병에 강해요' },
  ltank:   { name: '경전차',   cost: 7000,  move: 6, mt: 'tread', range: [1, 1], desc: '쓸모 많은 주력 전차' },
  htank:   { name: '중전차',   cost: 16000, move: 5, mt: 'tread', range: [1, 1], desc: '단단하고 강한 전차' },
  arty:    { name: '야포',     cost: 6000,  move: 5, mt: 'tread', range: [2, 3], indirect: true, desc: '멀리서 포격 · 이동한 턴엔 못 쏴요' },
  rocket:  { name: '로켓포',   cost: 15000, move: 5, mt: 'tire',  range: [3, 5], indirect: true, desc: '아주 멀리 · 이동한 턴엔 못 쏴요' },
  aa:      { name: '대공포차', cost: 8000,  move: 6, mt: 'tread', range: [1, 1], desc: '헬기 잡는 차량 · 보병에도 강해요' },
  heli:    { name: '공격헬기', cost: 9000,  move: 6, mt: 'air',   range: [1, 1], air: true, desc: '지형을 무시하고 날아요' },
  truck:   { name: '보급트럭', cost: 5000,  move: 6, mt: 'tire',  range: null, carry: 1, desc: '보병 1명 수송 · 옆 아군 매 턴 수리' },
};
export const UNIT_ORDER = Object.keys(UNITS);
export const GROUND = UNIT_ORDER.filter(u => !UNITS[u].air);

// 기본 피해(%) — 공격자 → 방어자 (원작 상성 구조를 단순화)
const T = ['inf', 'bazooka', 'recon', 'ltank', 'htank', 'arty', 'rocket', 'aa', 'heli', 'truck'];
const TABLE = {
  inf:     [55, 45, 12, 5, 1, 15, 25, 5, 7, 14],
  bazooka: [65, 55, 85, 55, 15, 70, 85, 65, 9, 75],
  recon:   [70, 65, 35, 6, 1, 45, 55, 4, 10, 45],
  ltank:   [75, 70, 85, 55, 15, 70, 85, 65, 10, 75],
  htank:   [105, 95, 105, 85, 55, 105, 105, 105, 12, 105],
  arty:    [90, 85, 80, 70, 45, 75, 80, 75, 0, 70],
  rocket:  [95, 90, 90, 80, 55, 80, 85, 85, 0, 80],
  aa:      [105, 105, 60, 25, 10, 50, 55, 45, 120, 50],
  heli:    [75, 65, 55, 55, 25, 65, 65, 25, 65, 60],
};
export const base = (a, d) => (TABLE[a] ? TABLE[a][T.indexOf(d)] : 0) || 0;

// 지형: def 방어 별 · cost 이동 비용 (null 못 감) · prop 건물(점령 가능)
const C = (foot, mech, tire, tread) => ({ foot, mech, tire, tread, air: 1 });
export const TERRAIN = {
  plain:    { name: '평지', def: 1, cost: C(1, 1, 2, 1) },
  farm:     { name: '밭',   def: 1, cost: C(1, 1, 2, 1) },
  wheat:    { name: '밀밭', def: 1, cost: C(1, 1, 2, 1) },
  forest:   { name: '숲',   def: 2, cost: C(1, 1, 3, 2) },
  mountain: { name: '산',   def: 4, cost: C(2, 1, null, null) },
  road:     { name: '길',   def: 0, cost: C(1, 1, 1, 1) },
  bridge:   { name: '다리', def: 0, cost: C(1, 1, 1, 1) },
  river:    { name: '강',   def: 0, cost: C(2, 1, null, null) },
  beach:    { name: '모래사장', def: 0, cost: C(1, 1, 2, 1) },
  sea:      { name: '바다', def: 0, cost: { foot: null, mech: null, tire: null, tread: null, air: 1 } },
  trench:   { name: '참호', def: 3, cost: C(1, 1, 2, 2) },
  city:     { name: '도시',   def: 3, cost: C(1, 1, 1, 1), prop: true },
  base:     { name: '기지',   def: 3, cost: C(1, 1, 1, 1), prop: true, builds: 'ground' },
  air:      { name: '비행장', def: 3, cost: C(1, 1, 1, 1), prop: true, builds: 'air' },
  hq:       { name: '본부',   def: 4, cost: C(1, 1, 1, 1), prop: true },
};
export const INCOME = 1000, CAPTURE = 20;

// 지휘관: 패시브 + 필살기 (게이지 = 준·받은 피해 가치)
export const COS = {
  ella:    { name: '엘라',   title: '전차대장',   color: 0x4F8BFF, desc: '전차·정찰차 공격 +15%', power: '강철 돌격', pdesc: '1턴 동안 차량 이동 +1 · 공격 +25%', need: 30000 },
  viktor:  { name: '빅터',   title: '포병 참모',  color: 0x6AA0E8, desc: '야포·로켓포 사거리 +1', power: '일제 포격', pdesc: '1턴 동안 간접공격 +35% · 사거리 +1 더', need: 30000 },
  jun:     { name: '준',     title: '돌격 정찰병', color: 0x5FB0FF, desc: '보병 공격 +20% · 점령 1.5배', power: '돌격 명령', pdesc: '1턴 동안 보병 이동 +2 · 공격 +30%', need: 24000 },
  scarlet: { name: '스칼렛', title: '붉은 장군',  color: 0xE0453C, desc: '모든 유닛 공격 +10%', power: '붉은 폭풍', pdesc: '상대 유닛 전원 HP -1 · 1턴 공격 +20%', need: 36000 },
};
const VEH = ['recon', 'ltank', 'htank', 'aa'], FOOT = ['inf', 'bazooka'];
// 공격 배율 (지휘관 · 필살기)
export function coAtk(co, type, power) {
  let m = 1;
  if (co === 'ella') { if (VEH.includes(type)) m += 0.15; if (power && VEH.concat(['arty', 'rocket', 'truck']).includes(type)) m += 0.25; }
  if (co === 'viktor') { if (power && UNITS[type].indirect) m += 0.35; }
  if (co === 'jun') { if (FOOT.includes(type)) m += 0.2; if (power && FOOT.includes(type)) m += 0.3; }
  if (co === 'scarlet') { m += 0.1; if (power) m += 0.2; }
  return m;
}
export function coMove(co, type, power) {
  if (!power) return 0;
  if (co === 'ella' && !FOOT.includes(type) && !UNITS[type].air) return 1;
  if (co === 'jun' && FOOT.includes(type)) return 2;
  return 0;
}
export function coRange(co, type, power) { if (co !== 'viktor' || !UNITS[type].indirect) return 0; return power ? 2 : 1; }
export const coCapture = co => (co === 'jun' ? 1.5 : 1);
