// 게임 데이터: 주인공 공격·스킬 · 몬스터 · 스테이지 · 장비 · 성장 수치
//   애니메이션 시각(초)은 tools/timing.mjs 로 무기 끝 속도를 재서 맞춤

// 기본 공격 4연타 (원본 a1~a4 가 한 동작을 나눠 놓은 것 · 앞 구간의 정지 시간은 건너뜀)
//   hits: t(초) · m(배율) · r(사거리) · arc(각도, 도) · kd(넘어뜨림) · kb(밀어냄)
export const COMBO = [
  { clip: 'a1', from: 0.0, to: 0.82, cancel: 0.52, lunge: 70, hits: [{ t: 0.36, m: 1.0, r: 290, arc: 200, kb: 40 }] },
  { clip: 'a2', from: 0.9, to: 1.55, cancel: 1.28, lunge: 70, hits: [{ t: 1.08, m: 1.1, r: 300, arc: 170, kb: 50 }] },
  { clip: 'a3', from: 1.42, to: 2.3, cancel: 2.0, lunge: 80, hits: [{ t: 1.5, m: 0.7, r: 290, arc: 180, kb: 20 }, { t: 1.85, m: 1.2, r: 310, arc: 200, kb: 60 }] },
  { clip: 'a4', from: 2.45, to: 3.72, cancel: 3.5, lunge: 90, hits: [{ t: 2.56, m: 0.7, r: 300, arc: 220, kb: 20 }, { t: 2.86, m: 0.8, r: 300, arc: 220, kb: 20 }, { t: 3.3, m: 2.2, r: 360, arc: 240, kd: true, kb: 140, heavy: true }] },
];
// 스킬 4 + 궁극기 (분노 게이지 100 일 때)
export const SKILLS = {
  quake: { name: '대지 가르기', en: 'Earth Splitter', icon: 's2', clip: 's2', from: 0.85, to: 2.62, cd: 8, sa: true, desc: '대검을 내리찍어 앞쪽 일직선의 적을 모두 쓰러뜨려요.',
    hits: [{ t: 1.95, m: 4.2, line: 620, w: 200, kd: true, kb: 160, heavy: true, fx: 'quake' }], lv: [1, 0.12] },
  whirl: { name: '회오리 베기', en: 'Whirlwind', icon: 's5', clip: 's5', from: 0.1, to: 2.45, cd: 12, sa: true, move: 260, desc: '몸을 돌려 주변의 적을 연속으로 베어요. 도는 동안 움직일 수 있어요.',
    hits: [0.8, 0.92, 1.04, 1.16, 1.28, 1.4, 1.52, 1.64, 1.76, 1.88].map(t => ({ t, m: 0.55, r: 310, arc: 360, kb: 12, pull: true })), lv: [1, 0.12] },
  rush: { name: '돌진 베기', en: 'Charge Slash', icon: 's3', clip: 's3', from: 0.25, to: 2.0, cd: 7, sa: true, dash: [0.55, 0.92, 520], desc: '앞으로 돌진하며 길을 막는 적을 베고, 내려찍어 마무리해요.',
    hits: [{ t: 0.9, m: 2.0, line: 560, w: 180, back: true, kb: 90 }, { t: 1.5, m: 1.8, r: 300, arc: 360, kd: true, kb: 80, heavy: true }], lv: [1, 0.12] },
  guard: { name: '반격의 일섬', en: 'Counter Edge', icon: 's4', clip: 's4', from: 0.85, to: 1.95, cd: 10, sa: true, inv: [0.85, 1.3], desc: '잠깐 모든 공격을 흘려 보내고 앞을 크게 베어요. 쓰는 동안 무적이에요.',
    hits: [{ t: 1.25, m: 2.6, r: 340, arc: 200, kb: 110 }, { t: 1.6, m: 1.6, r: 340, arc: 200, kb: 60 }], lv: [1, 0.12] },
  ult: { name: '분노 해방', en: 'Ashen Fury', icon: 's1', clip: 's1', from: 0.0, to: 3.6, cd: 0, rage: 100, sa: true, inv: [0, 3.2], desc: '분노를 터뜨려 회오리처럼 돌다가, 땅을 쪼개는 일격으로 끝내요.',
    hits: [...[0.68, 0.78, 0.88, 0.98, 1.08, 1.18].map(t => ({ t, m: 0.6, r: 340, arc: 360, kb: 10, pull: true })), { t: 2.74, m: 7, r: 480, arc: 360, kd: true, kb: 200, heavy: true, fx: 'nova' }], lv: [1, 0.1] },
};
export const SKILL_SLOTS = ['quake', 'whirl', 'rush', 'guard'];
export const EVADE = { clip: 'evade', from: 0.0, to: 0.62, dist: 420, inv: 0.45, cd: 0.9 };

// 몬스터 · attacks: clip 구간 · hit(초) 또는 hits[] · r 사거리 · arc 각도 · m 배율 · kd 넘어뜨림 · tele 경고 표시(초 전부터)
export const MOBS = {
  pig: { name: '멧돼지 전사', en: 'Boar Warrior', scale: 1, r: 72, speed: 175, foot: 96, hp: 620, atk: 70, exp: 6, gold: 9, shadow: 110,
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kd', death: 'death', appear: 'appear', provoke: 'provoke',
    attacks: [{ clip: 'atk2', from: 0, to: 1.75, hit: 0.65, r: 230, arc: 110, m: 1 }, { clip: 'skill', from: 1.15, to: 3.3, hit: 2.1, r: 270, arc: 130, m: 1.5, kd: true, w: 0.4 }] },
  bogs: { name: '늪 도마뱀', en: 'Bog Lizard', scale: 1.4, r: 58, speed: 245, foot: 124, hp: 430, atk: 56, exp: 5, gold: 8, shadow: 60, vary: { Lizardman_Weapon_0: 3, Lizardman_Helmet_0: 3, Lizardman_Armor_0: 2 },
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kd', death: 'death', appear: 'appear', provoke: 'provoke',
    attacks: [{ clip: 'atk', from: 0.25, to: 1.45, hit: 0.9, r: 210, arc: 90, m: 1 }] },
  spirit: { name: '오염된 나무 정령', en: 'Blighted Treant', scale: 0.86, r: 86, speed: 150, foot: 123, hp: 980, atk: 94, exp: 9, gold: 13, shadow: 120,
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kd', death: 'death', appear: 'appear', provoke: 'provoke',
    attacks: [{ clip: 'atk2', from: 0.35, to: 2.0, hit: 1.05, r: 260, arc: 120, m: 1 }, { clip: 'atk', from: 0.55, to: 2.55, hit: 1.35, r: 300, arc: 170, m: 1.4, kd: true, w: 0.5 }] },
  chort: { name: '뿔 달린 학살자', en: 'Horned Butcher', scale: 1.3, r: 96, speed: 250, foot: 302, hp: 3400, atk: 132, exp: 30, gold: 45, shadow: 120, sa: true, elite: true, vary: { Chort_Weapon_0: 2, Chort_Armor_0: 2 },
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kd', death: 'death', appear: 'appear', provoke: 'provoke', stun: 'stun',
    attacks: [{ clip: 'atk', from: 0.2, to: 1.4, hit: 0.8, r: 280, arc: 130, m: 1 }, { clip: 'atk2', from: 0.05, to: 1.15, hit: 0.5, r: 260, arc: 120, m: 0.9 },
      { clip: 'sk3', from: 0.2, to: 4.1, hits: [0.8, 3.7], r: 330, arc: 360, m: 1.4, kd: true, w: 0.6, cd: 6 }] },
  spider: { name: '가시 어미 베노마', en: 'Venoma, Thorn Mother', scale: 0.82, r: 230, speed: 240, hp: 15000, atk: 130, exp: 200, gold: 600, shadow: 330, sa: true, boss: true, stagger: 2200,
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kd', death: 'death', appear: 'appear', provoke: 'provoke', stun: 'stun',
    attacks: [{ clip: 'atk', from: 0.15, to: 1.75, hits: [0.72, 0.82], r: 430, arc: 100, m: 1 }, { clip: 'atk2', from: 0.15, to: 1.5, hit: 0.75, r: 420, arc: 120, m: 1.1 },
      { clip: 'atk4', from: 0.1, to: 1.3, hit: 0.7, r: 400, arc: 140, m: 1.0 }, { clip: 'skill', from: 0.3, to: 2.3, hit: 1.45, r: 520, arc: 360, m: 1.7, kd: true, cd: 7, w: 0.6, fx: 'nova' },
      { clip: 'skill3', from: 0.3, to: 3.4, hits: [0.8, 1.05, 1.3, 1.6, 2.4], r: 450, arc: 160, m: 0.8, cd: 9, w: 0.5 }] },
  abaris: { name: '코볼트 족장 아바리스', en: 'Chieftain Abaris', scale: 1.65, r: 120, speed: 230, foot: 142, hp: 22000, atk: 150, exp: 400, gold: 1200, shadow: 120, sa: true, boss: true, stagger: 3000,
    idle: 'idle', move: 'move', hit: 'hit', kd: 'kb', death: 'death', appear: 'appear', provoke: 'provoke', stun: 'stun',
    attacks: [{ clip: 'atk', from: 0.2, to: 1.8, hit: 0.7, r: 330, arc: 130, m: 1 }, { clip: 'atk2', from: 0.1, to: 1.65, hit: 0.5, r: 320, arc: 130, m: 1 },
      { clip: 'atk3', from: 0.3, to: 2.5, hit: 1.25, r: 380, arc: 140, m: 1.5, kd: true, w: 0.6 }, { clip: 'skill', from: 0.4, to: 3.3, hits: [0.75, 0.9, 1.1, 1.3, 1.55], r: 360, arc: 360, m: 0.7, cd: 8, w: 0.5, move: 220 },
      { clip: 'skill2', from: 1.9, to: 4.0, hits: [2.65, 2.95, 3.25], r: 420, arc: 120, m: 1.1, kd: true, cd: 10, w: 0.4, fx: 'quake' }] },
};

// 스테이지 · waves: 순서대로 (앞으로 걸어가면 다음 무리) · e: [몬스터, 수, 정예]
export const CHAPTERS = [
  { id: 1, name: '잿빛 숲길', en: 'Ashen Woods', desc: '재의 저주가 내려앉은 숲. 코볼트 무리가 마을로 가는 길을 막았다.' },
];
export const STAGES = [
  { id: '1-1', name: '숲 어귀', theme: 'forest', lv: 1, waves: [[['pig', 3]], [['pig', 4]]], time: 90, tut: true },
  { id: '1-2', name: '부러진 이정표', theme: 'forest', lv: 2, waves: [[['pig', 3]], [['bogs', 4]], [['pig', 2], ['bogs', 3]]], time: 120 },
  { id: '1-3', name: '덩굴 우거진 골짜기', theme: 'forest', lv: 3, waves: [[['bogs', 5]], [['spirit', 2], ['bogs', 2]], [['spirit', 3], ['pig', 2]]], time: 130 },
  { id: '1-4', name: '썩은 고목 아래', theme: 'forest', lv: 4, waves: [[['pig', 4], ['bogs', 2]], [['spirit', 3]], [['chort', 1, 1], ['bogs', 3]]], time: 150 },
  { id: '1-5', name: '가시 둥지', theme: 'nest', lv: 5, waves: [[['bogs', 4], ['pig', 2]], [['spider', 1]]], time: 200, boss: 'spider' },
  { id: '1-6', name: '코볼트 진영 입구', theme: 'camp', lv: 6, waves: [[['pig', 5]], [['bogs', 4], ['pig', 2]], [['spirit', 2], ['bogs', 3]]], time: 150 },
  { id: '1-7', name: '불타는 망루', theme: 'camp', lv: 7, waves: [[['bogs', 6]], [['chort', 1, 1], ['pig', 3]], [['spirit', 3], ['bogs', 3]]], time: 160 },
  { id: '1-8', name: '포로 수용소', theme: 'camp', lv: 8, waves: [[['pig', 4], ['spirit', 2]], [['bogs', 6]], [['chort', 2, 1]]], time: 170 },
  { id: '1-9', name: '족장의 앞마당', theme: 'camp', lv: 9, waves: [[['bogs', 5], ['pig', 3]], [['spirit', 3], ['chort', 1, 1]], [['chort', 2, 1], ['bogs', 3]]], time: 190 },
  { id: '1-10', name: '족장의 천막', theme: 'chief', lv: 10, waves: [[['pig', 4], ['bogs', 3]], [['abaris', 1]]], time: 240, boss: 'abaris' },
];
export const stageScale = lv => Math.pow(1.085, lv - 1);

// 장비 6부위 · 등급 5 (일반·고급·희귀·영웅·전설)
export const SLOTS = [
  { id: 'weapon', name: '무기', mesh: 'Warrior_04_Weapon', main: 'atk', base: 30 },
  { id: 'helmet', name: '투구', mesh: 'Warrior_04_Helmet', main: 'hp', base: 160, sub: 'def', subBase: 6 },
  { id: 'armor', name: '갑옷', mesh: 'Warrior_04_Body', main: 'hp', base: 260, sub: 'def', subBase: 10 },
  { id: 'gloves', name: '장갑', mesh: 'Warrior_04_Glove', main: 'atk', base: 14, sub: 'crit', subBase: 0.02 },
  { id: 'shoes', name: '신발', mesh: 'Warrior_04_Shoes', main: 'hp', base: 120, sub: 'def', subBase: 5 },
  { id: 'cloak', name: '망토', mesh: 'Warrior_04_Cloak', main: 'hp', base: 140, sub: 'cdmg', subBase: 0.06 },
];
export const RARITY = [
  { name: '일반', col: '#B7BCC6', mult: 1 }, { name: '고급', col: '#6ED08A', mult: 1.4 }, { name: '희귀', col: '#5AA9FF', mult: 1.9 },
  { name: '영웅', col: '#B57BFF', mult: 2.6 }, { name: '전설', col: '#FFB347', mult: 3.5 },
];
export const ITEM_NAMES = {
  weapon: ['녹슨 대검', '용병의 대검', '잿빛 참수검', '여명의 대검', '애쉬 블레이드'], helmet: ['가죽 두건', '용병 투구', '뿔 장식 투구', '여명 기사 투구', '재의 왕관'],
  armor: ['누빈 조끼', '용병 갑옷', '잿빛 판금', '여명 기사 갑옷', '불사의 흉갑'], gloves: ['가죽 장갑', '용병 건틀릿', '가시 건틀릿', '여명 건틀릿', '파쇄의 손'],
  shoes: ['낡은 장화', '용병 장화', '질주의 장화', '여명 기사 장화', '재의 발걸음'], cloak: ['헤진 망토', '용병 망토', '잿빛 망토', '여명의 망토', '불꽃 깃 망토'],
};
export const STAT_NAME = { atk: '공격력', hp: '체력', def: '방어력', crit: '치명타 확률', cdmg: '치명타 피해' };
export const MAX_ENH = 15;
export const enhCost = it => Math.round(120 * Math.pow(1.28, it.lv) * (1 + it.r * 0.6));
export const enhRate = it => Math.max(0.35, 1 - it.lv * 0.045);
// 주인공 성장
export const HERO = { hp: 1200, atk: 100, def: 20, crit: 0.1, cdmg: 1.6, grow: 1.07 };
export const expNeed = lv => Math.round(40 * Math.pow(lv, 1.55));
export const MAX_LV = 60;
// 스킬 강화
export const skillCost = lv => ({ gold: Math.round(300 * Math.pow(1.32, lv - 1)), book: Math.ceil(lv / 2) });
export const MAX_SKILL = 20;
// 행동력
export const STAMINA = { max: 60, regenMin: 4, cost: 5 };
// 무한의 탑 (층마다 강해짐 · 5층마다 정예 · 10층마다 보스)
export function towerFloor(f) {
  const lv = 3 + f * 1.15, mobs = ['pig', 'bogs', 'spirit']; const w = [];
  if (f % 10 === 0) w.push([[f % 20 === 0 ? 'abaris' : 'spider', 1]]);
  else { w.push([[mobs[f % 3], 3 + (f % 4)], [mobs[(f + 1) % 3], 2]]); if (f % 5 === 0) w.push([['chort', 1 + Math.floor(f / 15), 1]]); else w.push([[mobs[(f + 2) % 3], 3 + (f % 3)]]); }
  return { id: 'T' + f, name: `무한의 탑 ${f}층`, theme: f % 10 === 0 ? 'tower' : 'tower', lv, waves: w, time: 120 + (f % 10 === 0 ? 80 : 0), boss: f % 10 === 0 ? w[0][0][0] : null, tower: f };
}
// 일일 던전: 황금 동굴 (난이도 5단계)
export const DAILY = [
  { id: 'D1', name: '황금 동굴 · 쉬움', lv: 3, gold: 3000 }, { id: 'D2', name: '황금 동굴 · 보통', lv: 8, gold: 7000 }, { id: 'D3', name: '황금 동굴 · 어려움', lv: 14, gold: 15000 },
  { id: 'D4', name: '황금 동굴 · 매우 어려움', lv: 20, gold: 30000 }, { id: 'D5', name: '황금 동굴 · 지옥', lv: 28, gold: 60000 },
];
export const dailyStage = d => ({ id: d.id, name: d.name, theme: 'cave', lv: d.lv, waves: [[['pig', 5]], [['bogs', 6]], [['pig', 4], ['bogs', 4]], [['chort', 1, 1], ['pig', 3]]], time: 120, daily: d });
