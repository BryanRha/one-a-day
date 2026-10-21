// 규칙 데이터: 영웅 · 능력(스킬) · 몬스터 · 장(챕터) · 장비 — 화면과 무관 (Node 봇에서도 씀)

// 영웅: 기본 체력·공격·공속 + 고유 특성
export const HEROES = {
  arin: { name: '아린', title: '별빛 궁수', hp: 600, atk: 100, aspd: 1.0, desc: '균형 잡힌 별빛 궁수', trait: '시작할 때 능력 하나를 더 골라요', key: 'h_arin', cost: 0 },
  theo: { name: '테오', title: '불꽃 궁수', hp: 560, atk: 118, aspd: 1.0, desc: '공격 +18% · 모든 화살에 불꽃', trait: '화살이 불타요 (불꽃 능력 기본 장착)', key: 'h_theo', cost: 1500 },
  mir: { name: '미르', title: '바람 레인저', hp: 540, atk: 96, aspd: 1.25, desc: '공격 속도 +25% · 이동 빠름', trait: '이동 속도 +15% · 회피 +8%', key: 'h_mir', cost: 3000 },
  yuna: { name: '유나', title: '얼음 궁수', hp: 640, atk: 104, aspd: 0.95, desc: '체력 높음 · 화살이 얼려요', trait: '화살이 적을 느리게 (냉기 능력 기본 장착)', key: 'h_yuna', cost: 5000 },
};

// 능력: 방을 깰 때·레벨 업마다 3개 중 1개 (max: 최대 중첩)
// kind: 화살 모양(shape) · 능력치(stat) · 속성(elem) · 생존(life) · 특수(spec)
export const SKILLS = {
  front:    { name: '앞쪽 화살 +1', desc: '앞으로 화살 1발 더 (화살 위력 -15%)', icon: 'sk_front', max: 3, rar: 2, kind: 'shape', w: 10 },
  diag:     { name: '대각 화살', desc: '양 대각선으로 화살 1발씩 더', icon: 'sk_diag', max: 2, rar: 3, kind: 'shape', w: 9 },
  side:     { name: '옆쪽 화살', desc: '양옆으로 화살 1발씩 더', icon: 'sk_side', max: 2, rar: 2, kind: 'shape', w: 7 },
  rear:     { name: '뒤쪽 화살', desc: '뒤로도 화살 1발', icon: 'sk_rear', max: 2, rar: 1, kind: 'shape', w: 7 },
  multi:    { name: '연속 사격', desc: '한 번 더 연달아 쏴요 (공격 간격 조금 늘어남)', icon: 'sk_multi', max: 2, rar: 4, kind: 'shape', w: 10 },
  pierce:   { name: '관통', desc: '화살이 적을 뚫고 지나가요', icon: 'sk_pierce', max: 1, rar: 2, kind: 'shape', w: 8 },
  ricochet: { name: '튕기기', desc: '맞힌 뒤 가까운 적에게 1번 더 튕겨요 (튕긴 화살 위력 60%)', icon: 'sk_ricochet', max: 3, rar: 2, kind: 'shape', w: 8 },
  wall:     { name: '벽 반사', desc: '화살이 벽에서 1번 더 튕겨요', icon: 'sk_wall', max: 3, rar: 1, kind: 'shape', w: 6 },
  atk:      { name: '공격력 강화', desc: '공격 +25%', icon: 'sk_atk', max: 9, rar: 3, kind: 'stat', w: 12 },
  aspd:     { name: '공격 속도', desc: '공격 속도 +20%', icon: 'sk_aspd', max: 9, rar: 2, kind: 'stat', w: 12 },
  crit:     { name: '치명타', desc: '치명타 확률 +10%', icon: 'sk_crit', max: 4, rar: 2, kind: 'stat', w: 9 },
  head:     { name: '일격', desc: '보스가 아닌 적을 3% 확률로 한 방에', icon: 'sk_head', max: 1, rar: 3, kind: 'stat', w: 5 },
  fire:     { name: '불꽃 화살', desc: '맞히면 공격 0.2배 + 3초 동안 화상', icon: 'sk_fire', max: 1, rar: 2, kind: 'elem', w: 8 },
  frost:    { name: '얼음 화살', desc: '맞히면 1.5초 얼리고 공격 1배 (같은 적은 10초에 한 번)', icon: 'sk_frost', max: 1, rar: 2, kind: 'elem', w: 8 },
  poison:   { name: '독 화살', desc: '맞히면 공격 0.5배 + 계속 독 피해', icon: 'sk_poison', max: 1, rar: 2, kind: 'elem', w: 8 },
  bolt:     { name: '번개 화살', desc: '맞히면 주변 적 최대 4명에게 공격 0.3배', icon: 'sk_bolt', max: 1, rar: 2, kind: 'elem', w: 8 },
  orbfire:  { name: '불꽃 구슬', desc: '몸 주위를 도는 불꽃 구슬 2개 (닿으면 공격 1.25배)', icon: 'sk_orbfire', max: 2, rar: 1, kind: 'spec', w: 6 },
  orbice:   { name: '얼음 구슬', desc: '몸 주위를 도는 얼음 구슬 2개 (느리게 만듦)', icon: 'sk_orbice', max: 2, rar: 1, kind: 'spec', w: 6 },
  hpup:     { name: '최대 체력', desc: '최대 체력 +20% (그만큼 회복)', icon: 'sk_hpup', max: 9, rar: 2, kind: 'life', w: 9 },
  heal:     { name: '회복', desc: '체력 40% 회복', icon: 'sk_heal', max: 99, rar: 1, kind: 'life', w: 7, instant: true },
  blood:    { name: '흡혈', desc: '적을 쓰러뜨리면 25% 확률로 체력 4% 회복', icon: 'sk_blood', max: 3, rar: 1, kind: 'life', w: 7 },
  dodge:    { name: '회피', desc: '공격을 12% 확률로 피해요', icon: 'sk_dodge', max: 3, rar: 2, kind: 'life', w: 7 },
  star:     { name: '천사의 보호', desc: '최대 체력 +15% · 맞으면 2초 무적', icon: 'sk_star', max: 1, rar: 2, kind: 'life', w: 5 },
  spirit:   { name: '정령 친구', desc: '함께 다니며 공격 0.5배 화살을 쏘는 정령', icon: 'sk_spirit', max: 2, rar: 3, kind: 'spec', w: 6 },
};
export const SKILL_KEYS = Object.keys(SKILLS);
// 능력 등급 (원작 2): 1 고급 · 2 희귀 · 3 영웅 · 4 전설 (나올 확률 가중치)
export const SRAR = [null, { name: '고급', col: 0x6AD86A, w: 1 }, { name: '희귀', col: 0x5AA8FF, w: 0.8 }, { name: '영웅', col: 0xB070FF, w: 0.5 }, { name: '전설', col: 0xFFB030, w: 0.2 }];

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
  skel:     { name: '해골 궁수', key: 'm_skel', hp: 240, spd: 40, dmg: 80, ai: 'shoot', r: 34, sz: 104, gold: 6 },
  wisp:     { name: '불꽃 정령', key: 'm_wisp', hp: 220, spd: 100, dmg: 90, ai: 'ring', r: 32, sz: 96, fly: true, gold: 6 },
  iceslime: { name: '얼음 슬라임', key: 'm_iceslime', hp: 420, spd: 80, dmg: 120, ai: 'hop', r: 36, sz: 100, split: 'iceling', gold: 7 },
  iceling:  { name: '얼음 조각', key: 'm_iceslime', hp: 140, spd: 120, dmg: 70, ai: 'hop', r: 22, sz: 60, gold: 2 },
  yeti:     { name: '꼬마 예티', key: 'm_yeti', hp: 600, spd: 70, dmg: 150, ai: 'dash', r: 42, sz: 120, gold: 8 },
  icemage:  { name: '얼음 마법사', key: 'm_icemage', hp: 380, spd: 30, dmg: 130, ai: 'spread', r: 36, sz: 104, gold: 8 },
  ghost:    { name: '눈보라 유령', key: 'm_ghost', hp: 320, spd: 120, dmg: 120, ai: 'fly', r: 32, sz: 100, gold: 7 },
};
// 보스: 공격 패턴 여러 개를 번갈아
export const BOSSES = {
  golem:  { name: '고목 골렘', key: 'b_golem', hp: 5200, spd: 45, dmg: 140, r: 90, sz: 300, pats: ['slam', 'spread', 'meteor', 'summon'], summon: 'slime', gold: 80 },
  sphinx: { name: '황금 스핑크스', key: 'b_sphinx', hp: 9800, spd: 60, dmg: 190, r: 100, sz: 320, pats: ['dash', 'meteor', 'ring', 'spread'], gold: 140 },
  dragon: { name: '서리 드래곤', key: 'b_dragon', hp: 15000, spd: 55, dmg: 240, r: 105, sz: 340, pats: ['breath', 'meteor', 'ring', 'dash', 'summon'], summon: 'ghost', fly: true, gold: 220 },
};

// 장: 방 20개 (5·15방 = 특수 방 · 10방 = 중간 보스 · 20방 = 보스) · tile: 바닥·장애물·구덩이 그림
export const CHAPTERS = [
  { id: 1, stage: 0, name: '속삭이는 숲', tiles: ['t_grass', 't_rock', 't_water'], mons: ['slime', 'shroom', 'wolf', 'bat'], boss: 'golem', mid: 'wolf', hpMul: 0.85, dmgMul: 1.15, bg: 0x1E3A24 },
  { id: 2, stage: 1, name: '잊힌 사막 유적', tiles: ['t_sand', 't_pillar', 't_pit'], mons: ['mummy', 'skel', 'scorp', 'wisp'], boss: 'sphinx', mid: 'mummy', hpMul: 1.75, dmgMul: 2.45, bg: 0x4A3418 },
  { id: 3, stage: 2, name: '얼어붙은 동굴', tiles: ['t_ice', 't_crystal', 't_chasm'], mons: ['iceslime', 'ghost', 'icemage', 'yeti'], boss: 'dragon', mid: 'yeti', hpMul: 2.2, dmgMul: 3.1, bg: 0x1A2E4A },
];
export const ROOMS = 20;

// ── 장비 (원작 2 구조) ──
// 6칸 · 등급 11단계 · 레벨은 "칸"에 붙음(다른 장비로 바꿔 껴도 유지) · 칸마다 강화 두루마리
// 등급 효과: 고급 = 주 능력치 +5% · 희귀 = 칸별 보조 효과 · 영웅 = 세트 효과 · 전설 = 주 능력치 +10% 더 · 신화 = 세트 효과 강화
export const SLOTS = ['weapon', 'armor', 'helm', 'boots', 'amulet', 'ring'];
export const SLOT = {
  weapon: { name: '활', stat: 'atk', base: 30, per: 4 },
  armor:  { name: '갑옷', stat: 'hp', base: 150, per: 20, sub: { k: 'projRed', v: 0.05, t: '원거리 공격 피해 -5%' } },
  helm:   { name: '투구', stat: 'hp', base: 80, per: 10, sub: { k: 'healPct', v: 0.2, t: '회복량 +20%' } },
  boots:  { name: '장화', stat: 'hp', base: 80, per: 10, sub: { k: 'dodge', v: 0.05, t: '회피 +5%' } },
  amulet: { name: '목걸이', stat: 'atk', base: 12, per: 1.6, sub: { k: 'critDmg', v: 0.12, t: '치명타 피해 +12%' } },
  ring:   { name: '반지', stat: 'atk', base: 12, per: 1.6, sub: { k: 'crit', v: 0.03, t: '치명타 확률 +3%' } },
};
// 등급 t: 0 일반 · 1 고급 · 2 희귀 · 3 영웅 · 4~5 영웅+1·+2 · 6 전설 · 7~9 전설+1~+3 · 10 신화 (max = 칸 레벨 상한)
const PUR = 0xB070FF, GLD = 0xFFB030;
export const TIERS = [
  { name: '일반', col: 0xB8B8C8, mul: 1, max: 10 },
  { name: '고급', col: 0x6AD86A, mul: 1.3, max: 20 },
  { name: '희귀', col: 0x5AA8FF, mul: 1.7, max: 30 },
  { name: '영웅', col: PUR, mul: 2.2, max: 40 },
  { name: '영웅+1', col: PUR, mul: 2.4, max: 40 },
  { name: '영웅+2', col: PUR, mul: 2.6, max: 40 },
  { name: '전설', col: GLD, mul: 3.2, max: 50 },
  { name: '전설+1', col: GLD, mul: 3.4, max: 50 },
  { name: '전설+2', col: GLD, mul: 3.6, max: 50 },
  { name: '전설+3', col: GLD, mul: 4.3, max: 50 },   // 기본 능력치 +20%
  { name: '신화', col: 0xFF4A5A, mul: 5.2, max: 60 },
];
// 합성 규칙 (원작 대장간): t → t+1 에 필요한 재료
// dup: 똑같은 장비(같은 세트·같은 칸·같은 등급) n개 · ft: 같은 칸의 해당 등급 장비 n개(세트 무관)
export const MERGE = [
  { n: 2, dup: true }, { n: 2, dup: true }, { n: 2, dup: true },   // 일반→고급→희귀→영웅
  { n: 1, ft: 3 }, { n: 2, ft: 3 },                                 // 영웅 → +1 → +2
  { n: 1, dup: true },                                              // 영웅+2 → 전설
  { n: 1, ft: 6 }, { n: 1, ft: 6 }, { n: 2, ft: 6 },               // 전설 → +1 → +2 → +3
  { n: 1, dup: true },                                              // 전설+3 → 신화
];
// 세트: 기본(효과 없음) · 성운(콤보) · 송곳니(근접) · 화염(폭발). wsub = 활의 희귀 효과, fx = 칸별 [영웅, 신화] 효과 설명
export const SETS = {
  basic: { name: '기본', desc: '세트 효과 없음', wsub: '공격 +5%' },
  neb: { name: '성운', desc: '연속으로 맞힐수록(콤보) 강해져요', wsub: '콤보가 쌓일수록 피해 증가 (최대 +10%)', fx: {
    weapon: ['콤보 5마다 치명타 확률 +2% (최대 8%)', '콤보 5마다 치명타 확률 +4% (최대 16%)'],
    armor: ['콤보 5마다 다음 공격에 대각 화살 +2', '콤보 5마다 다음 공격에 대각 화살 +4'],
    helm: ['치명타는 콤보 2배', '치명타는 콤보 3배'],
    boots: ['콤보 30 넘으면 치명타 피해 +32%', '콤보 20 넘으면 치명타 피해 +48%'],
    amulet: ['콤보 5마다 다음 피해 2배', '콤보 3마다 다음 피해 2배'],
    ring: ['콤보 5마다 공격 속도 +2% (최대 8%)', '콤보 5마다 공격 속도 +4% (최대 16%)'] } },
  fang: { name: '송곳니', desc: '가까이서 싸울수록 강해져요', wsub: '가까울수록 피해 증가 (최대 +20%)', fx: {
    weapon: ['가까울수록 치명타 확률 증가 (최대 15%)', '가까울수록 치명타 확률 증가 (최대 30%)'],
    armor: ['주변 적에게 0.3초마다 공격 0.3배 피해', '주변 적에게 0.3초마다 공격 0.6배 피해'],
    helm: ['가까울수록 치명타 피해 증가 (최대 36%)', '가까울수록 치명타 피해 증가 (최대 72%)'],
    boots: ['주변 적이 많을수록 치명타 피해 증가 (최대 36%)', '주변 적이 많을수록 치명타 피해 증가 (최대 72%)'],
    amulet: ['맞으면 주변에 공격 3배 충격파', '맞으면 주변에 공격 6배 충격파'],
    ring: ['주변 적이 많을수록 치명타 확률 증가 (최대 9%)', '주변 적이 많을수록 치명타 확률 증가 (최대 18%)'] } },
  blaze: { name: '화염', desc: '폭발로 여러 적을 한꺼번에', wsub: '맞히면 30% 확률로 작은 폭발 (공격 0.35배)', fx: {
    weapon: ['폭발 피해 +100%', '폭발 피해 +100% · 폭발 확률 45%'],
    armor: ['맞으면 불꽃 방패 (다음 공격을 막고 폭발) · 10초마다', '불꽃 방패가 있는 동안 체력 회복'],
    helm: ['적을 쓰러뜨리거나 5초마다 다음 공격이 폭발', '다음 공격 폭발이 적을 불태움'],
    boots: ['공격을 피하면 주변 폭발', '회피 +10% · 피하면 주변 폭발'],
    amulet: ['3초마다 적 2명을 폭발시킴', '3초마다 적 4명을 폭발시킴'],
    ring: ['맞힌 적 자리에 가끔 지뢰 (12%)', '맞힌 적 자리에 자주 지뢰 (24%)'] } },
};
export const itemName = it => `${it.set === 'basic' ? '' : SETS[it.set].name + ' '}${SLOT[it.slot].name}`;
export const itemIcon = it => `g_${it.set}_${it.slot}`;
// 칸 하나의 주 능력치 (장비 등급 × 기본 + 칸 레벨)
export const slotMain = (it, lv) => (it ? Math.round(SLOT[it.slot].base * TIERS[it.t].mul + SLOT[it.slot].per * (Math.min(lv, TIERS[it.t].max) - 1)) : 0);
// 장착한 장비 전체 → 전투 능력치 (Node 봇도 같은 함수 사용)
// eq: { 칸: 장비 } · lv: { 칸: 레벨 } · tal: 재능
export function gearStats(eq, lv = {}, tal = {}) {
  const o = { atk: 0, hp: 0, atkPct: 0, hpPct: 0, crit: 0, critDmg: 0, dodge: 0, projRed: 0, healPct: 0, fx: {}, wsub: null };
  for (const slot of SLOTS) {
    const it = eq[slot]; if (!it) continue; const S = SLOT[slot], pk = S.stat === 'atk' ? 'atkPct' : 'hpPct';
    o[S.stat] += slotMain(it, lv[slot] || 1);
    if (it.t >= 1) o[pk] += 0.05;
    if (it.t >= 6) o[pk] += 0.10;
    if (it.t >= 2) { if (slot === 'weapon') { o.wsub = it.set; if (it.set === 'basic') o.atkPct += 0.05; } else o[S.sub.k] += S.sub.v; }
    if (it.t >= 3 && it.set !== 'basic') o.fx[`${it.set}.${slot}`] = it.t >= 10 ? 2 : 1;
  }
  o.hp += (tal.hp || 0) * 30; o.atk += (tal.atk || 0) * 4;
  return o;
}
// 칸 강화 비용: 금화 + 그 칸 두루마리
export const upCost = lv => ({ gold: Math.round(200 * Math.pow(1.12, lv - 1)), scroll: 1 + Math.floor((lv - 1) / 5) });

// ── 밸런스 기준: 장마다 "이 정도 장비면 깰 만하다" (봇 측정 · 권장 전투력에 씀) ──
// 0 = 처음 (기본 활·갑옷) · 1 = 2장 권장 · 2 = 3장 권장 · 3 = 그 이후
export function expectedGear(stage, set = 'neb') {
  const it = (slot, t, st = 'basic') => ({ set: st, slot, t });
  const P = [
    { eq: { weapon: it('weapon', 0), armor: it('armor', 0) }, lv: {} },
    { eq: { weapon: it('weapon', 2, set), armor: it('armor', 1), helm: it('helm', 1), boots: it('boots', 1), amulet: it('amulet', 1), ring: it('ring', 1) }, lv: { weapon: 10, armor: 10, helm: 8, boots: 8, amulet: 8, ring: 8 } },
    { eq: { weapon: it('weapon', 3, set), armor: it('armor', 2), helm: it('helm', 2), boots: it('boots', 2), amulet: it('amulet', 3, set), ring: it('ring', 2) }, lv: { weapon: 20, armor: 18, helm: 18, boots: 18, amulet: 18, ring: 18 } },
    { eq: Object.fromEntries(SLOTS.map(sl => [sl, it(sl, 4, set)])), lv: Object.fromEntries(SLOTS.map(sl => [sl, 30])) },
  ][stage];
  return gearStats(P.eq, P.lv, stage ? { hp: stage * 3, atk: stage * 3 } : {});
}
export const powerOf = g => Math.round(g.atk * (1 + g.atkPct) * 10 + g.hp * (1 + g.hpPct) + (g.crit + g.critDmg / 4) * 1000 + Object.keys(g.fx).length * 150);
