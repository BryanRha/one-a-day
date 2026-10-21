// 규칙 데이터: 유닛 · 지형 · 상성 · 지휘관 (화면과 무관 — Node 봇에서도 씀)

// dom: 지상 ground · 공중 air · 해상 sea / mt 이동 방식: foot 도보 · mech 기계화 · tire 바퀴 · tread 궤도 · air 공중 · sea 함선 · lander 상륙정
// vis: 안개 전장 시야 · carry: { n 몇 기, what: foot 보병만 | ground 지상 유닛 }
export const UNITS = {
  inf:        { name: '소총병',   cost: 1000,  move: 3, mt: 'foot',  dom: 'ground', vis: 2, range: [1, 1], capture: true, desc: '싸고 점령할 수 있어요' },
  bazooka:    { name: '바주카병', cost: 3000,  move: 2, mt: 'mech',  dom: 'ground', vis: 2, range: [1, 1], capture: true, desc: '전차를 잡는 보병 · 점령 가능' },
  recon:      { name: '정찰차',   cost: 4000,  move: 8, mt: 'tire',  dom: 'ground', vis: 5, range: [1, 1], desc: '아주 빠르고 멀리 봐요' },
  ltank:      { name: '경전차',   cost: 7000,  move: 6, mt: 'tread', dom: 'ground', vis: 3, range: [1, 1], desc: '쓸모 많은 주력 전차' },
  htank:      { name: '중전차',   cost: 16000, move: 5, mt: 'tread', dom: 'ground', vis: 1, range: [1, 1], desc: '단단하고 강한 전차' },
  arty:       { name: '야포',     cost: 6000,  move: 5, mt: 'tread', dom: 'ground', vis: 1, range: [2, 3], indirect: true, desc: '멀리서 포격 · 이동한 턴엔 못 쏴요' },
  rocket:     { name: '로켓포',   cost: 15000, move: 5, mt: 'tire',  dom: 'ground', vis: 1, range: [3, 5], indirect: true, desc: '아주 멀리 · 이동한 턴엔 못 쏴요' },
  aa:         { name: '대공포차', cost: 8000,  move: 6, mt: 'tread', dom: 'ground', vis: 2, range: [1, 1], desc: '헬기·비행기 잡는 차량' },
  heli:       { name: '공격헬기', cost: 9000,  move: 6, mt: 'air',   dom: 'air',    vis: 3, range: [1, 1], air: true, desc: '지형을 무시하고 날아요' },
  truck:      { name: '보급트럭', cost: 5000,  move: 6, mt: 'tire',  dom: 'ground', vis: 1, range: null, carry: { n: 1, what: 'foot' }, desc: '보병 1명 수송 · 옆 아군 매 턴 수리' },
  fighter:    { name: '전투기',   cost: 20000, move: 9, mt: 'air',   dom: 'air',    vis: 2, range: [1, 1], air: true, desc: '하늘의 왕 · 공중 유닛만 공격' },
  bomber:     { name: '폭격기',   cost: 22000, move: 7, mt: 'air',   dom: 'air',    vis: 2, range: [1, 1], air: true, desc: '지상·해상에 강력한 폭격' },
  stealth:    { name: '스텔스기', cost: 24000, move: 6, mt: 'air',   dom: 'air',    vis: 4, range: [1, 1], air: true, dive: true, desc: '무엇이든 공격 · 은신하면 옆 칸에서만 보여요' },
  mega:       { name: '거대전차', cost: 28000, move: 4, mt: 'tread', dom: 'ground', vis: 1, range: [1, 1], desc: '가장 강한 전차 · 주포 3발' },
  carrier:    { name: '항공모함', cost: 30000, move: 5, mt: 'sea',   dom: 'sea',    vis: 4, range: [3, 7], indirect: true, carry: { n: 2, what: 'air' }, desc: '하늘만 멀리 쏴요 · 비행기 2대를 싣고 보급' },
  piper:      { name: '파이프 열차', cost: 20000, move: 9, mt: 'pipe', dom: 'ground', vis: 4, range: [2, 5], indirect: true, desc: '파이프 위로만 달리는 열차포 · 땅·하늘·바다 모두' },
  bomb:       { name: '자폭 드론', cost: 25000, move: 6, mt: 'air',  dom: 'air',    vis: 1, range: null, air: true, desc: '[자폭]하면 반경 3칸 모두 체력 -5 (아군도!)' },
  tcopter:    { name: '수송헬기', cost: 5000,  move: 6, mt: 'air',   dom: 'air',    vis: 2, range: null, air: true, carry: { n: 1, what: 'foot' }, desc: '보병 1명을 태우고 날아요' },
  battleship: { name: '전함',     cost: 28000, move: 5, mt: 'sea',   dom: 'sea',    vis: 2, range: [2, 6], indirect: true, desc: '바다의 대포 · 이동한 턴엔 못 쏴요' },
  cruiser:    { name: '순양함',   cost: 18000, move: 6, mt: 'sea',   dom: 'sea',    vis: 3, range: [1, 1], desc: '항공기와 잠수함 사냥' },
  lander:     { name: '상륙정',   cost: 12000, move: 6, mt: 'lander', dom: 'sea',   vis: 1, range: null, carry: { n: 2, what: 'ground' }, desc: '지상 유닛 2기 수송 · 해안에 상륙' },
  sub:        { name: '잠수함',   cost: 20000, move: 5, mt: 'sea',   dom: 'sea',    vis: 5, range: [1, 1], dive: true, desc: '함선 사냥꾼 · 잠수하면 옆 칸에서만 보여요' },
};
// 연료 · 매일 줄어드는 연료(day) · 주무기 탄약 (없으면 무한) · mg: 탄약이 떨어져도 기관총으로 보병은 공격
const SUP = {
  inf: [99, 0], bazooka: [70, 0, 3, 1], recon: [80, 0], ltank: [70, 0, 9, 1], htank: [50, 0, 9, 1], arty: [50, 0, 9], rocket: [50, 0, 6], aa: [60, 0, 9],
  heli: [99, 2, 6, 1], truck: [70, 0], fighter: [99, 5, 9], bomber: [99, 5, 9], tcopter: [99, 2], battleship: [99, 1, 9], cruiser: [99, 1, 9], lander: [99, 1],
  sub: [60, 1, 6], stealth: [60, 5, 6], mega: [50, 0, 3, 1], carrier: [99, 1, 9], piper: [99, 0, 9], bomb: [45, 5],
};
for (const [k, [fuel, day, ammo, mg]] of Object.entries(SUP)) Object.assign(UNITS[k], { fuel: UNITS[k].dom === 'ground' ? null : fuel, day, ammo: ammo ?? null, mg: !!mg });   // 지상 유닛은 연료 걱정 없음 (하늘·바다만)
export const UNIT_ORDER = Object.keys(UNITS);
export const GROUND = UNIT_ORDER.filter(u => UNITS[u].dom === 'ground');
export const FOOT = ['inf', 'bazooka'];

// 기본 피해(%) — 공격자 → 방어자 (원작 상성 구조를 단순화)
const T = ['inf', 'bazooka', 'recon', 'ltank', 'htank', 'arty', 'rocket', 'aa', 'heli', 'truck', 'fighter', 'bomber', 'tcopter', 'battleship', 'cruiser', 'lander', 'sub', 'stealth', 'mega', 'carrier', 'piper', 'bomb'];
const TABLE = {
  //          inf  baz  rec  ltk  htk  art  rkt  aa   heli trk  ftr  bmb  tcp  bshp crs  lnd  sub  stl  mega crr pip bmb
  inf:        [55,  45,  12,  5,   1,   15,  25,  5,   7,   14,  0,   0,   30,  0,   0,   0,   0,  0,  1,  0,  5,  0],
  bazooka:    [65,  55,  85,  55,  15,  70,  85,  65,  9,   75,  0,   0,   12,  0,   0,   0,   0,  0,  15,  0,  55,  0],
  recon:      [70,  65,  35,  6,   1,   45,  55,  4,   10,  45,  0,   0,   35,  0,   0,   0,   0,  0,  1,  0,  6,  0],
  ltank:      [75,  70,  85,  55,  15,  70,  85,  65,  10,  75,  0,   0,   40,  1,   5,   10,  1,  0,  15,  0,  55,  0],
  htank:      [105, 95,  105, 85,  55,  105, 105, 105, 12,  105, 0,   0,   45,  10,  30,  35,  10,  0,  35,  0,  85,  0],
  arty:       [90,  85,  80,  70,  45,  75,  80,  75,  0,   70,  0,   0,   0,   40,  50,  55,  60,  0,  45,  45,  70,  0],
  rocket:     [95,  90,  90,  80,  55,  80,  85,  85,  0,   80,  0,   0,   0,   55,  60,  60,  85,  0,  55,  55,  80,  0],
  aa:         [105, 105, 60,  25,  10,  50,  55,  45,  120, 50,  65,  75,  120, 0,   0,   0,   0,  60,  10,  0,  25,  120],
  heli:       [75,  65,  55,  55,  25,  65,  65,  25,  65,  60,  0,   0,   95,  25,  55,  25,  25,  0,  15,  25,  65,  0],
  fighter:    [0,   0,   0,   0,   0,   0,   0,   0,   100, 0,   55,  100, 100, 0,   0,   0,   0,  85,  0,  0,  0,  120],
  bomber:     [110, 110, 105, 105, 95,  105, 105, 95,  0,   105, 0,   0,   0,   75,  85,  95,  95,  0,  35,  85,  105,  0],
  battleship: [95,  90,  90,  85,  55,  80,  85,  85,  0,   80,  0,   0,   0,   50,  95,  95,  95,  0,  45,  60,  80,  0],
  cruiser:    [0,   0,   0,   0,   0,   0,   0,   0,   115, 0,   55,  65,  115, 5,   25,  25,  90,  45,  0,  5,  0,  120],
  sub:        [0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   55,  25,  95,  55,  0,  0,  75,  0,  0],
  stealth:    [90,  85,  85,  75,  70,  85,  85,  50,  85,  85,  45,  70,  95,  45,  35,  65,  55,  55,  15,  45,  70,  120],
  mega:       [125, 115, 180, 160, 115, 180, 180, 180, 22,  180, 0,   0,   22,  45,  65,  75,  45,  0,   65,  45,  105, 0],
  carrier:    [0,   0,   0,   0,   0,   0,   0,   0,   115, 0,   100, 100, 115, 0,   0,   0,   0,   100, 0,   0,   0,   120],
  piper:      [95,  90,  90,  80,  55,  80,  85,  85,  105, 80,  65,  75,  105, 55,  60,  60,  85,  75,  25,  60,  80,  120],
};
export const base = (a, d) => (TABLE[a] ? TABLE[a][T.indexOf(d)] : 0) || 0;

// 지형: def 방어 별 · cost 이동 비용 (null 못 감) · prop 건물(점령 가능) · hide 안개 속 숨는 곳(숲·암초)
const C = (foot, mech, tire, tread, extra = {}) => ({ foot, mech, tire, tread, air: 1, sea: null, lander: null, pipe: null, ...extra });
const WALL = { foot: null, mech: null, tire: null, tread: null, air: null, sea: null, lander: null };
export const TERRAIN = {
  plain:    { name: '평지', def: 1, cost: C(1, 1, 2, 1) },
  farm:     { name: '밭',   def: 1, cost: C(1, 1, 2, 1) },
  wheat:    { name: '밀밭', def: 1, cost: C(1, 1, 2, 1) },
  forest:   { name: '숲',   def: 2, cost: C(1, 1, 3, 2), hide: true },
  mountain: { name: '산',   def: 4, cost: C(2, 1, null, null) },
  road:     { name: '길',   def: 0, cost: C(1, 1, 1, 1) },
  bridge:   { name: '다리', def: 0, cost: C(1, 1, 1, 1) },
  river:    { name: '강',   def: 0, cost: C(2, 1, null, null) },
  beach:    { name: '모래사장', def: 0, cost: C(1, 1, 2, 1, { lander: 1 }) },
  sea:      { name: '바다', def: 0, cost: { foot: null, mech: null, tire: null, tread: null, air: 1, sea: 1, lander: 1 } },
  reef:     { name: '암초', def: 1, cost: { foot: null, mech: null, tire: null, tread: null, air: 1, sea: 2, lander: 2 }, hide: true },
  trench:   { name: '참호', def: 3, cost: C(1, 1, 2, 2) },
  city:     { name: '도시',   def: 3, cost: C(1, 1, 1, 1), prop: true },
  base:     { name: '기지',   def: 3, cost: C(1, 1, 1, 1, { pipe: 1 }), prop: true, builds: 'ground' },
  air:      { name: '비행장', def: 3, cost: C(1, 1, 1, 1), prop: true, builds: 'air' },
  port:     { name: '항구',   def: 3, cost: C(1, 1, 1, 1, { sea: 1, lander: 1 }), prop: true, builds: 'sea' },
  pipe:     { name: '파이프', def: 0, cost: { ...WALL, pipe: 1 } },
  seam:     { name: '파이프 이음매', def: 0, cost: { ...WALL }, seam: true },
  silo:     { name: '미사일 기지', def: 1, cost: C(1, 1, 1, 1), silo: true },
  silo_e:   { name: '빈 미사일 기지', def: 1, cost: C(1, 1, 1, 1) },
  hq:       { name: '본부',   def: 4, cost: C(1, 1, 1, 1), prop: true },
};
export const INCOME = 1000, CAPTURE = 20, SEAM_HP = 99, SILO_DMG = 30, BOMB_DMG = 50;
// 수리되는 건물: 지상 = 도시·기지·본부 · 공중 = 비행장 · 해상 = 항구
export const repairsAt = (dom, t) => (dom === 'air' ? t === 'air' : dom === 'sea' ? t === 'port' : ['city', 'base', 'hq'].includes(t));

// 지휘관 16명: 특성 + 필살기(1단계) + 초필살기(2단계, 게이지가 더 차야 함)
export const COS = {
  ella:    { name: '엘라',   title: '전차대장',   color: 0x4F8BFF, desc: '전차·정찰차·대공 공격 +15%', power: '강철 돌격', pdesc: '차량 이동 +1 · 공격 +20%', superp: '전차 군단', sdesc: '차량 이동 +2 · 공격 +40% · 방어 +10%', need: 27000, sneed: 50000 },
  viktor:  { name: '빅터',   title: '포병 참모',  color: 0x6AA0E8, desc: '야포·로켓포·전함 사거리 +1', power: '일제 포격', pdesc: '원거리 공격 +30% · 사거리 +1 더', superp: '포격 지옥', sdesc: '원거리 공격 +50% · 사거리 +2 더', need: 27000, sneed: 50000 },
  jun:     { name: '준',     title: '돌격 정찰병', color: 0x5FB0FF, desc: '보병 공격 +20% · 점령 1.5배', power: '돌격 명령', pdesc: '보병 이동 +1 · 공격 +25%', superp: '총공격', sdesc: '보병 이동 +2 · 공격 +45% · 점령 2배', need: 20000, sneed: 40000 },
  marin:   { name: '마린',   title: '함대 제독',  color: 0x3E8FD8, desc: '함선 공격 +20%', power: '함대 전진', pdesc: '함선 이동 +1 · 공격 +25%', superp: '대양 함대', sdesc: '함선 이동 +2 · 공격 +45% · 함선 체력 +2', need: 27000, sneed: 50000 },
  sora:    { name: '소라',   title: '에이스 조종사', color: 0x7FB8FF, desc: '공중 유닛 공격 +15%', power: '편대 비행', pdesc: '공중 이동 +1 · 공격 +25%', superp: '하늘의 지배자', sdesc: '공중 이동 +2 · 공격 +45%', need: 27000, sneed: 50000 },
  doo:     { name: '두',     title: '철벽 방어대장', color: 0x5A9AD8, desc: '모든 유닛 방어 +15%', power: '방어 진지', pdesc: '방어 +30% · 아군 체력 +1', superp: '불굴의 요새', sdesc: '방어 +50% · 아군 체력 +3', need: 24000, sneed: 45000 },
  iris:    { name: '아이리스', title: '정보 장교', color: 0x8FC8FF, desc: '안개 전장 시야 +1 · 공격 +5%', power: '정찰 위성', pdesc: '1턴 동안 지도 전체가 보임 · 공격 +15%', superp: '전장 장악', sdesc: '지도 전체가 보임 · 공격 +25% · 이동 +1', need: 22000, sneed: 42000 },
  yuki:    { name: '유키',   title: '기상 장교',  color: 0xA8D8FF, desc: '날씨 영향을 받지 않아요', power: '눈보라', pdesc: '상대 턴까지 눈이 내림 · 공격 +10%', superp: '혹한', sdesc: '상대 턴까지 눈 · 상대 체력 -1 · 공격 +20%', need: 24000, sneed: 46000 },
  hana:    { name: '하나',   title: '보급 장교',  color: 0x6FC0A0, desc: '유닛 생산비 -10%', power: '긴급 동원', pdesc: '생산비 -40% · 만든 유닛 바로 행동', superp: '총동원', sdesc: '생산비 -50% · 바로 행동 · 아군 체력 +1', need: 22000, sneed: 44000 },
  leon:    { name: '레온',   title: '기동 사령관', color: 0x58A8F0, desc: '바퀴 유닛(정찰차·로켓포·트럭) 이동 +1', power: '전격전', pdesc: '지상 유닛 이동 +1', superp: '번개 작전', sdesc: '지상 유닛 이동 +2 · 공격 +20%', need: 24000, sneed: 46000 },
  kai:     { name: '카이',   title: '공병 대장',  color: 0x7A9AB8, desc: '지형 방어 별 +1 (공중 제외)', power: '참호 구축', pdesc: '지형 별 +1 더 · 방어 +10%', superp: '철옹성', sdesc: '지형 별 +2 더 · 방어 +20% · 반격 +30%', need: 26000, sneed: 48000 },
  bas:     { name: '바스',   title: '강습 대장',  color: 0xE07A3C, desc: '직접 공격 +20% · 약점: 원거리 공격 -20%·사거리 -1', power: '돌격 명령', pdesc: '직접 공격 유닛 이동 +1 · 공격 +20%', superp: '전면 돌격', sdesc: '직접 공격 유닛 이동 +2 · 공격 +40%', need: 24000, sneed: 46000 },
  sera:    { name: '세라',   title: '재무관',     color: 0xD8B04A, desc: '수입 +20% · 약점: 모든 유닛 공격 -10%', power: '전시 채권', pdesc: '건물 1곳당 자금 +1,000 바로', superp: '경제 봉쇄', sdesc: '상대 자금 절반 · 상대 필살기 게이지 절반', need: 22000, sneed: 44000 },
  titan:   { name: '타이탄', title: '정예 사령관', color: 0x8A9AB0, desc: '공격·방어 +20% · 약점: 생산비 +20%', power: '정예 방진', pdesc: '방어 +20% 더', superp: '불패 군단', sdesc: '공격 +30% · 방어 +30% 더 · 반격 1.5배', need: 30000, sneed: 56000 },
  terra:   { name: '테라',   title: '지형 레인저', color: 0x6AB06A, desc: '서 있는 칸 방어 별 1개당 공격 +8% · 약점: 공중 유닛 공격 -10%', power: '지형 장악', pdesc: '지상 유닛 모든 지형 이동 비용 1', superp: '대지의 분노', sdesc: '이동 비용 1 · 별당 공격 +16%', need: 24000, sneed: 46000 },
  scarlet: { name: '스칼렛', title: '붉은 장군',  color: 0xE0453C, desc: '모든 유닛 공격 +10%', power: '붉은 폭풍', pdesc: '상대 유닛 체력 -1 · 공격 +15%', superp: '붉은 해일', sdesc: '상대 유닛 체력 -2 · 공격 +30%', need: 32000, sneed: 60000 },
};
const VEH = ['recon', 'ltank', 'htank', 'aa'];
const isVeh = t => UNITS[t].dom === 'ground' && !FOOT.includes(t);
// 공격 배율 (lv: 0 평소 · 1 필살기 · 2 초필살기)
export function coAtk(co, type, lv = 0, stars = 0) {   // stars: 공격하는 유닛이 선 칸의 방어 별 (테라)
  const U = UNITS[type]; let m = 1;
  if (co === 'bas') m += U.indirect ? -0.2 : 0.2 + (lv === 2 ? 0.4 : lv ? 0.2 : 0);
  if (co === 'sera') m -= 0.1;
  if (co === 'titan') m += 0.2 + (lv === 2 ? 0.3 : 0);
  if (co === 'terra') m += stars * (lv === 2 ? 0.16 : 0.08) - (U.dom === 'air' ? 0.1 : 0);
  if (co === 'ella') { if (VEH.includes(type)) m += 0.15; if (lv && isVeh(type)) m += lv === 2 ? 0.4 : 0.2; }
  if (co === 'viktor') { if (lv && U.indirect) m += lv === 2 ? 0.5 : 0.3; }
  if (co === 'jun') { if (FOOT.includes(type)) m += 0.2 + (lv === 2 ? 0.45 : lv ? 0.25 : 0); }
  if (co === 'marin') { if (U.dom === 'sea') m += 0.2 + (lv === 2 ? 0.45 : lv ? 0.25 : 0); }
  if (co === 'sora') { if (U.dom === 'air') m += 0.15 + (lv === 2 ? 0.45 : lv ? 0.25 : 0); }
  if (co === 'iris') { m += 0.05 + (lv === 2 ? 0.25 : lv ? 0.15 : 0); }
  if (co === 'scarlet') { m += 0.1 + (lv === 2 ? 0.3 : lv ? 0.15 : 0); }
  if (co === 'yuki') m += lv === 2 ? 0.2 : lv ? 0.1 : 0;
  if (co === 'leon' && lv === 2 && UNITS[type].dom === 'ground') m += 0.2;
  return m;
}
// 방어 배율 (피해를 이 값으로 나눔)
export function coDef(co, type, lv = 0) {
  let m = 1;
  if (co === 'doo') m += 0.15 + (lv === 2 ? 0.5 : lv ? 0.3 : 0);
  if (co === 'ella' && lv === 2 && isVeh(type)) m += 0.1;
  if (co === 'kai') m += lv === 2 ? 0.2 : lv ? 0.1 : 0;
  if (co === 'titan') m += 0.2 + (lv === 2 ? 0.3 : lv ? 0.2 : 0);
  return m;
}
export function coMove(co, type, lv = 0) {
  if (co === 'leon') { const g = UNITS[type].dom === 'ground'; return (['recon', 'rocket', 'truck'].includes(type) ? 1 : 0) + (g && lv ? (lv === 2 ? 2 : 1) : 0); }
  if (co === 'bas' && lv && UNITS[type].range && !UNITS[type].indirect) return lv === 2 ? 2 : 1;
  if (!lv) return 0; const U = UNITS[type], k = lv === 2 ? 2 : 1;
  if (co === 'ella' && isVeh(type)) return k;
  if (co === 'jun' && FOOT.includes(type)) return k;
  if (co === 'marin' && U.dom === 'sea') return k;
  if (co === 'sora' && U.dom === 'air') return k;
  if (co === 'iris' && lv === 2) return 1;
  return 0;
}
export function coRange(co, type, lv = 0) { if (!UNITS[type].indirect) return 0; if (co === 'bas') return -1; if (co !== 'viktor') return 0; return 1 + (lv === 2 ? 2 : lv ? 1 : 0); }
export const coCapture = (co, lv = 0) => (co === 'jun' ? (lv === 2 ? 2 : 1.5) : 1);
export const coVision = (co) => (co === 'iris' ? 1 : 0);
export const coReveal = (co, lv) => co === 'iris' && lv > 0;

// 새 지휘관 특성
export const coStars = (co, lv = 0) => (co === 'kai' ? 1 + (lv === 2 ? 2 : lv ? 1 : 0) : 0);        // 지형 방어 별 더
export const coCost = (co, lv = 0) => (co === 'hana' ? (lv === 2 ? 0.5 : lv ? 0.6 : 0.9) : co === 'titan' ? 1.2 : 1);        // 생산비 배율
export const coInstant = (co, lv = 0) => co === 'hana' && lv > 0;                                    // 만든 유닛 바로 행동
export const coCounter = (co, lv = 0) => (co === 'kai' && lv === 2 ? 1.3 : co === 'titan' && lv === 2 ? 1.5 : 1);                       // 반격 피해 배율
export const coIncome = co => (co === 'sera' ? 1.2 : 1);                                               // 수입 배율
export const coFlat = (co, lv = 0) => co === 'terra' && lv > 0;                                       // 지상 이동 비용 모두 1
export const weatherProof = co => co === 'yuki';

// 날씨: 지도마다 고정 또는 날짜별 순환 (map.weather: 'snow' | ['clear', 'rain', ...])
export const WEATHER = {
  clear: { name: '맑음', desc: '' },
  rain:  { name: '비',   desc: '안개 전장이 돼요 · 시야 -1' },
  snow:  { name: '눈',   desc: '지상 이동 비용 +1 (길·다리·건물 제외) · 공중 이동 비용 +1' },
  sand:  { name: '모래폭풍', desc: '원거리 사거리 -1' },
};
// 잠수함(잠수) · 스텔스기(은신) 을 때릴 수 있는 유닛
export const HUNT = { sub: ['sub', 'cruiser'], stealth: ['fighter', 'stealth'] };
