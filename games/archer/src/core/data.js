// 규칙 데이터: 영웅 · 능력(스킬) · 몬스터 · 장(챕터) · 장비 — 화면과 무관 (Node 봇에서도 씀)

// 영웅: 기본 체력·공격·공속 + 고유 특성
export const HEROES = {
  arin: { name: '아린', title: '별빛 궁수', hp: 600, atk: 100, aspd: 1.0, desc: '균형 잡힌 별빛 궁수', trait: '시작할 때 능력 하나를 더 골라요', key: 'h_arin', cost: 0 },
  theo: { name: '테오', title: '불꽃 궁수', hp: 560, atk: 112, aspd: 1.0, desc: '공격 +12% · 모든 화살에 불꽃', trait: '화살이 불타요 (불꽃 능력 기본 장착)', key: 'h_theo', cost: 1500 },
  mir: { name: '미르', title: '바람 레인저', hp: 540, atk: 96, aspd: 1.25, desc: '공격 속도 +25% · 이동 빠름', trait: '이동 속도 +15% · 회피 +8%', key: 'h_mir', cost: 3000 },
  yuna: { name: '유나', title: '얼음 궁수', hp: 640, atk: 104, aspd: 0.95, desc: '체력 높음 · 화살이 얼려요', trait: '화살이 적을 느리게 (냉기 능력 기본 장착)', key: 'h_yuna', cost: 5000 },
};

// 능력: 방을 깰 때·레벨 업마다 3개 중 1개 (max: 최대 중첩)
// kind: 화살 모양(shape) · 능력치(stat) · 속성(elem) · 생존(life) · 특수(spec)
export const SKILLS = {
  front:    { name: '앞쪽 화살 +1', desc: '앞으로 나란히 화살 1발 더 (위력 조금 줄어요)', icon: 'sk_front', max: 3, kind: 'shape', w: 10 },
  diag:     { name: '대각 화살', desc: '양 대각선으로 화살 1발씩 더', icon: 'sk_diag', max: 2, kind: 'shape', w: 9 },
  side:     { name: '옆쪽 화살', desc: '양옆으로 화살 1발씩 더', icon: 'sk_side', max: 2, kind: 'shape', w: 7 },
  rear:     { name: '뒤쪽 화살', desc: '뒤로도 화살 1발', icon: 'sk_rear', max: 2, kind: 'shape', w: 6 },
  multi:    { name: '연속 사격', desc: '한 번에 화살을 연달아 1발 더 (위력 조금 줄어요)', icon: 'sk_multi', max: 3, kind: 'shape', w: 10 },
  pierce:   { name: '관통', desc: '화살이 적을 뚫고 지나가요', icon: 'sk_pierce', max: 1, kind: 'shape', w: 8 },
  ricochet: { name: '튕기기', desc: '맞힌 뒤 가까운 적에게 2번 튕겨요', icon: 'sk_ricochet', max: 2, kind: 'shape', w: 8 },
  wall:     { name: '벽 반사', desc: '화살이 벽에서 2번 튕겨요', icon: 'sk_wall', max: 1, kind: 'shape', w: 6 },
  atk:      { name: '공격력 강화', desc: '공격 +25%', icon: 'sk_atk', max: 9, kind: 'stat', w: 12 },
  aspd:     { name: '공격 속도', desc: '공격 속도 +20%', icon: 'sk_aspd', max: 9, kind: 'stat', w: 12 },
  crit:     { name: '치명타', desc: '치명타 확률 +12% · 치명타는 2배', icon: 'sk_crit', max: 4, kind: 'stat', w: 9 },
  head:     { name: '일격', desc: '보스가 아닌 적을 3% 확률로 한 방에', icon: 'sk_head', max: 1, kind: 'stat', w: 5 },
  fire:     { name: '불꽃 화살', desc: '맞으면 불타서 2초 동안 피해', icon: 'sk_fire', max: 1, kind: 'elem', w: 8 },
  frost:    { name: '냉기 화살', desc: '맞으면 2초 동안 느려져요', icon: 'sk_frost', max: 1, kind: 'elem', w: 8 },
  poison:   { name: '독 화살', desc: '맞으면 계속 독 피해 (쌓여요)', icon: 'sk_poison', max: 1, kind: 'elem', w: 8 },
  bolt:     { name: '번개 화살', desc: '맞으면 주변 적 2명에게 번개', icon: 'sk_bolt', max: 1, kind: 'elem', w: 8 },
  orbfire:  { name: '불꽃 구슬', desc: '몸 주위를 도는 불꽃 구슬', icon: 'sk_orbfire', max: 2, kind: 'spec', w: 6 },
  orbice:   { name: '얼음 구슬', desc: '몸 주위를 도는 얼음 구슬 (느리게)', icon: 'sk_orbice', max: 2, kind: 'spec', w: 6 },
  hpup:     { name: '최대 체력', desc: '최대 체력 +20% (그만큼 회복)', icon: 'sk_hpup', max: 9, kind: 'life', w: 9 },
  heal:     { name: '회복', desc: '체력 40% 회복', icon: 'sk_heal', max: 99, kind: 'life', w: 7, instant: true },
  blood:    { name: '흡혈', desc: '적을 쓰러뜨리면 체력 조금 회복', icon: 'sk_blood', max: 3, kind: 'life', w: 7 },
  dodge:    { name: '회피', desc: '공격을 15% 확률로 피해요', icon: 'sk_dodge', max: 3, kind: 'life', w: 7 },
  star:     { name: '별의 보호', desc: '방에 들어갈 때 2초 무적 · 맞으면 1초 무적', icon: 'sk_star', max: 1, kind: 'life', w: 5 },
  spirit:   { name: '정령 친구', desc: '함께 다니며 화살을 쏘는 정령', icon: 'sk_spirit', max: 2, kind: 'spec', w: 6 },
};
export const SKILL_KEYS = Object.keys(SKILLS);

// 몬스터: hp(기본 체력 · 장 배율 곱) · spd 이동 · dmg 몸통/탄 피해 · ai 행동 · r 판정 반지름(px) · sz 그림 크기
// ai: chase 쫓아감 · hop 뛰어서 다가옴 · dash 멈췄다 돌진 · shoot 멀리서 쏨 · spread 부채꼴 탄 · fly 벽 무시 날기 · ring 둥근 탄
export const MONS = {
  slime:    { name: '숲 슬라임', key: 'm_slime', hp: 160, spd: 70, dmg: 60, ai: 'hop', r: 34, sz: 96, split: 'mini', gold: 4 },
  mini:     { name: '꼬마 슬라임', key: 'm_slime', hp: 60, spd: 110, dmg: 35, ai: 'hop', r: 22, sz: 60, gold: 1 },
  shroom:   { name: '버섯돌이', key: 'm_shroom', hp: 220, spd: 0, dmg: 70, ai: 'spread', r: 36, sz: 100, gold: 5 },
  wolf:     { name: '숲 늑대', key: 'm_wolf', hp: 200, spd: 90, dmg: 90, ai: 'dash', r: 38, sz: 110, gold: 5 },
  bat:      { name: '보라 박쥐', key: 'm_bat', hp: 110, spd: 140, dmg: 50, ai: 'fly', r: 30, sz: 96, gold: 3 },
  scorp:    { name: '모래 전갈', key: 'm_scorp', hp: 300, spd: 80, dmg: 100, ai: 'dash', r: 38, sz: 112, gold: 6 },
  mummy:    { name: '꼬마 미라', key: 'm_mummy', hp: 380, spd: 60, dmg: 110, ai: 'chase', r: 36, sz: 104, gold: 6 },
  skel:     { name: '해골 궁수', key: 'm_skel', hp: 240, spd: 40, dmg: 100, ai: 'shoot', r: 34, sz: 104, gold: 6 },
  wisp:     { name: '불꽃 정령', key: 'm_wisp', hp: 220, spd: 100, dmg: 90, ai: 'ring', r: 32, sz: 96, fly: true, gold: 6 },
  iceslime: { name: '얼음 슬라임', key: 'm_iceslime', hp: 420, spd: 80, dmg: 120, ai: 'hop', r: 36, sz: 100, split: 'iceling', gold: 7 },
  iceling:  { name: '얼음 조각', key: 'm_iceslime', hp: 140, spd: 120, dmg: 70, ai: 'hop', r: 22, sz: 60, gold: 2 },
  yeti:     { name: '꼬마 예티', key: 'm_yeti', hp: 600, spd: 70, dmg: 150, ai: 'dash', r: 42, sz: 120, gold: 8 },
  icemage:  { name: '얼음 마법사', key: 'm_icemage', hp: 380, spd: 30, dmg: 130, ai: 'spread', r: 36, sz: 104, gold: 8 },
  ghost:    { name: '눈보라 유령', key: 'm_ghost', hp: 320, spd: 120, dmg: 120, ai: 'fly', r: 32, sz: 100, gold: 7 },
};
// 보스: 공격 패턴 여러 개를 번갈아
export const BOSSES = {
  golem:  { name: '고목 골렘', key: 'b_golem', hp: 5200, spd: 45, dmg: 140, r: 90, sz: 300, pats: ['slam', 'spread', 'summon'], summon: 'slime', gold: 80 },
  sphinx: { name: '황금 스핑크스', key: 'b_sphinx', hp: 9800, spd: 60, dmg: 190, r: 100, sz: 320, pats: ['dash', 'ring', 'spread'], gold: 140 },
  dragon: { name: '서리 드래곤', key: 'b_dragon', hp: 15000, spd: 55, dmg: 240, r: 105, sz: 340, pats: ['breath', 'ring', 'dash', 'summon'], summon: 'ghost', fly: true, gold: 220 },
};

// 장: 방 20개 (5·15방 = 특수 방 · 10방 = 중간 보스 · 20방 = 보스) · tile: 바닥·장애물·구덩이 그림
export const CHAPTERS = [
  { id: 1, name: '속삭이는 숲', tiles: ['t_grass', 't_rock', 't_water'], mons: ['slime', 'shroom', 'wolf', 'bat'], boss: 'golem', mid: 'wolf', hpMul: 1, dmgMul: 1, bg: 0x1E3A24 },
  { id: 2, name: '잊힌 사막 유적', tiles: ['t_sand', 't_pillar', 't_pit'], mons: ['mummy', 'skel', 'scorp', 'wisp'], boss: 'sphinx', mid: 'mummy', hpMul: 1.7, dmgMul: 1.35, bg: 0x4A3418 },
  { id: 3, name: '얼어붙은 동굴', tiles: ['t_ice', 't_crystal', 't_chasm'], mons: ['iceslime', 'ghost', 'icemage', 'yeti'], boss: 'dragon', mid: 'yeti', hpMul: 2.4, dmgMul: 1.7, bg: 0x1A2E4A },
];
export const ROOMS = 20;

// 장비: 무기(공격) · 갑옷(체력) · 반지(치명/공속) — 등급 4단계, 같은 장비 3개 = 다음 등급
export const RAR = [
  { name: '일반', col: 0xB8B8C8, mul: 1 },
  { name: '희귀', col: 0x5AA8FF, mul: 1.6 },
  { name: '영웅', col: 0xB070FF, mul: 2.5 },
  { name: '전설', col: 0xFFB030, mul: 4 },
];
export const GEAR = {
  bow:   { name: '활', icons: ['i_bow1', 'i_bow2', 'i_bow3', 'i_bow4'], stat: 'atk', base: 20, per: 4, desc: '공격' },
  armor: { name: '갑옷', icons: ['i_armor1', 'i_armor1', 'i_armor2', 'i_armor2'], stat: 'hp', base: 120, per: 25, desc: '체력' },
  ring:  { name: '반지', icons: ['i_ring1', 'i_ring1', 'i_ring2', 'i_ring2'], stat: 'crit', base: 3, per: 0.5, desc: '치명타 %' },
};
// 장비 효과 = (기본 + 레벨당) × 등급 배율
export const gearVal = (slot, g) => (g ? Math.round((GEAR[slot].base + GEAR[slot].per * (g.lv - 1)) * RAR[g.r].mul * 10) / 10 : 0);
export const gearCost = g => Math.round(80 * Math.pow(1.35, g.lv - 1) * (1 + g.r * 0.5));   // 다음 레벨 금화
export const GEAR_MAXLV = r => 10 + r * 10;
