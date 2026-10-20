// 룬 다이스 한 판 — 화면과 무관한 순수 로직 (브라우저·Node 공용, 봇 밸런싱에 사용)
// 판 3×5 (세로형 — 원작 5×3 을 세로 화면에 맞게 돌림)에 룬 주사위를 소환·합성, 판을 둘러싼 ㄷ자 길로 오는 적을 막는다. 생명 3.
export const COLS = 3, ROWS = 5, SLOTS = COLS * ROWS, MAX_PIPS = 7;

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 룬 10종: dmg(탄 1발), rate(초당 공격), 특성
export const RUNES = {
  flame: { name: '화염', dmg: 20, rate: 0.9, splash: 0.35, color: 0xFF5A3C },
  frost: { name: '서리', dmg: 14, rate: 1.0, slow: 0.25, color: 0x6FD3FF },
  storm: { name: '번개', dmg: 16, rate: 1.0, chain: 2, color: 0xFFE14D },
  venom: { name: '독', dmg: 9, rate: 1.0, poison: 34, color: 0x7CE36A },
  gale: { name: '질풍', dmg: 13, rate: 1.9, color: 0xB6F0E4 },
  iron: { name: '강철', dmg: 42, rate: 0.6, boss: 2.5, color: 0xB8C2D8 },
  light: { name: '광휘', dmg: 10, rate: 0.8, aura: 0.12, color: 0xFFF2B0 },
  echo: { name: '메아리', dmg: 12, rate: 1.0, wild: true, color: 0xC59BFF },
  fortune: { name: '행운', dmg: 10, rate: 0.8, sp: 30, color: 0xF5C451 },
  growth: { name: '성장', dmg: 12, rate: 1.0, grow: 28, color: 0x5BE39A },
  sniper: { name: '저격', dmg: 58, rate: 0.5, strongest: true, color: 0xFF5A6A },     // 체력이 가장 많은 적을 노림
  curse: { name: '저주', dmg: 9, rate: 1.0, vuln: 0.14, color: 0xD25AFF },            // 맞은 적이 받는 피해 증가
  mine: { name: '지뢰', dmg: 30, rate: 0.45, mine: true, color: 0xFFA43A },           // 길에 지뢰 설치 → 밟으면 폭발
  crit: { name: '치명', dmg: 11, rate: 1.0, critBuff: 0.03, color: 0xFF6FB5 },        // 모든 주사위 치명타 확률 +3%/눈
  summoner: { name: '소환사', dmg: 11, rate: 0.9, summon: true, color: 0x6F7CFF },     // 합성하면 주사위 하나 더 소환
  mana: { name: '마나', dmg: 8, rate: 0.8, spGen: 2.2, color: 0x5EE3FF },              // 눈마다 초당 SP 생성
  mirror: { name: '거울', dmg: 10, rate: 1.0, mirror: true, color: 0xE6ECFF },          // 옆 주사위 중 가장 센 것의 능력을 따라 함
  time: { name: '시간', dmg: 10, rate: 0.55, push: 0.012, color: 0x4FE0C8 },           // 맞은 적을 길 뒤로 되돌림
  freeze: { name: '빙결', dmg: 12, rate: 0.8, stun: 0.08, color: 0xBFE9FF },           // 확률로 적을 완전히 멈춤
  sacrifice: { name: '희생', dmg: 10, rate: 0.9, sacrifice: 0.12, color: 0xE0303C },    // 합성되면 옆 주사위들이 이번 판 내내 강해짐
  alchemy: { name: '연성', dmg: 9, rate: 1.0, alchemy: 0.05, color: 0xFFA640 },         // 이번 판 합성 횟수만큼 강해짐
  shift: { name: '변이', dmg: 14, rate: 1.0, shift: true, color: 0xA8F04A },            // 합성 결과가 덱에서 가장 높은 등급 룬으로
  pierce: { name: '관통', dmg: 22, rate: 0.75, pierce: 0.16, color: 0xFFF0B8 },         // 맨 앞 적 뒤로 줄지은 적을 모두 꿰뚫음
  hammer: { name: '망치', dmg: 15, rate: 0.5, hammer: 0.007, color: 0xD08A4A },         // 보스 최대 체력 비례 피해
  arrow: { name: '화살', dmg: 18, rate: 1.25, color: 0xF4EEDC },                        // 단순하고 빠른 단일 공격
  quake: { name: '지진', dmg: 7, rate: 0.45, all: true, color: 0xD9853B },              // 길 위 모든 적에게 피해
  shackle: { name: '사슬', dmg: 12, rate: 0.9, shackle: 0.3, color: 0x8FA8C8 },         // 보스를 크게 느리게
  bounty: { name: '현상금', dmg: 12, rate: 1.0, bounty: 1.35, color: 0xFFD54A },          // 맞은 적을 잡으면 SP 더
  ward: { name: '결계', dmg: 8, rate: 0.6, ward: 45, color: 0x7FE8E0 },                 // 새는 적을 한 번 막음 (재사용 대기)
  twin: { name: '쌍검', dmg: 13, rate: 1.0, twin: true, color: 0xE08AD8 },              // 맨 앞 두 적을 동시에
  nova: { name: '초신성', dmg: 10, rate: 0.9, nova: 8, color: 0xFF9CF0 },               // 8번 쏠 때마다 전체 대폭발
  dragon: { name: '용', dmg: 12, rate: 1.0, dragon: 0.04, color: 0xFF6A3A },            // 웨이브 안에서 쏠수록 뜨거워짐 (최대 4배)
  // ── 4차 (100종) ──
  spark: { name: '불씨', dmg: 9, rate: 1.4, splash: 0.2, color: 0xFFA05A },
  stone: { name: '바위', dmg: 30, rate: 0.7, color: 0xB0A898 },
  water: { name: '물결', dmg: 12, rate: 1.0, slow: 0.12, splash: 0.15, color: 0x3FA8FF },
  needle: { name: '바늘', dmg: 6, rate: 2.4, color: 0xD8DEE8 },
  spear: { name: '창', dmg: 21, rate: 0.9, pierce: 0.08, color: 0x7FA6D8 },
  bow: { name: '장궁', dmg: 20, rate: 0.9, last: true, color: 0x5FBF6A },                // 맨 뒤 적을 노림
  axe: { name: '도끼', dmg: 26, rate: 0.8, splash: 0.25, splashR: 0.04, color: 0xC8783A },
  coin: { name: '금화', dmg: 9, rate: 0.9, sp: 18, color: 0xF0C040 },                    // 합성하면 SP
  thunder: { name: '뇌우', dmg: 11, rate: 0.8, chain: 4, color: 0x9A7BFF },
  acid: { name: '산성', dmg: 9, rate: 1.0, poison: 20, vuln: 0.08, color: 0xC8E83A },
  moon: { name: '달빛', dmg: 14, rate: 1.0, fastX: 2.2, color: 0xC8C0F0 },               // 빠른 적에게 2.2배
  giant: { name: '거인 사냥', dmg: 15, rate: 0.9, bigX: 2.2, boss: 1.3, color: 0xC0503A },  // 큰 적 2.2배
  rage: { name: '분노', dmg: 14, rate: 1.0, rage: 0.45, color: 0xFF6A3A },               // 생명이 줄수록 강해짐
  lance: { name: '기사창', dmg: 34, rate: 0.6, boss: 1.6, pierce: 0.1, color: 0x4F7FE8 },
  shuriken: { name: '표창', dmg: 9, rate: 1.1, multi: 3, color: 0x5FE0F0 },              // 무작위 셋을 동시에
  boomerang: { name: '부메랑', dmg: 14, rate: 1.0, ends: true, color: 0xE8A050 },        // 맨 앞과 맨 뒤를 함께
  lava: { name: '용암', dmg: 10, rate: 0.9, poison: 40, splash: 0.2, color: 0xE8481E },
  frostbite: { name: '동상', dmg: 11, rate: 1.0, slow: 0.3, vuln: 0.06, color: 0x6FE0E0 },
  thornvine: { name: '가시덩굴', dmg: 10, rate: 1.0, slow: 0.2, poison: 15, color: 0x3F9F4A },
  quicksand: { name: '늪', dmg: 5, rate: 0.5, all: true, slow: 0.08, color: 0xD8C090 },
  banner: { name: '깃발', dmg: 10, rate: 0.9, dmgAura: 0.08, color: 0xE0303A },          // 옆 주사위 피해 +
  lens: { name: '렌즈', dmg: 14, rate: 1.0, critSelf: 0.3, color: 0x8FF0F0 },            // 자기 치명타 확률 +30%
  cauldron: { name: '가마솥', dmg: 10, rate: 1.0, spHit: 0.5, color: 0x9FB83A },          // 맞힐 때마다 SP
  totem: { name: '토템', dmg: 12, rate: 0.9, aura: 0.06, color: 0xC8803A },              // 옆 주사위 공격 속도 +
  magnet: { name: '자석', dmg: 11, rate: 0.9, push: 0.008, slow: 0.1, color: 0xE05A6A },
  hex: { name: '저주인', dmg: 8, rate: 1.0, vuln: 0.2, color: 0xD04AE8 },
  wisp: { name: '도깨비불', dmg: 9, rate: 1.6, strongest: true, color: 0x7FE8F8 },
  blizzard: { name: '눈보라', dmg: 6, rate: 0.5, all: true, slow: 0.15, color: 0xE0F4FF },
  meteor: { name: '별똥별', dmg: 40, rate: 0.4, splash: 0.8, splashR: 0.1, color: 0xFF7A3A },
  reaper: { name: '사신', dmg: 14, rate: 0.9, execute: 0.12, color: 0x3FB8A0 },          // 체력 낮은 적 처형
  prism: { name: '프리즘', dmg: 12, rate: 0.9, multi: 3, vuln: 0.05, color: 0xF0B0FF },
  ballista: { name: '쇠뇌', dmg: 70, rate: 0.35, pierce: 0.2, color: 0xC09050 },
  glacier: { name: '빙하', dmg: 14, rate: 0.7, stun: 0.12, slow: 0.2, splash: 0.2, color: 0x7FC8F8 },
  tempest: { name: '폭풍', dmg: 13, rate: 0.9, chain: 3, push: 0.006, color: 0xA090C8 },
  plague: { name: '역병', dmg: 8, rate: 0.9, poison: 50, poisonSplash: true, color: 0x7FD84A },  // 독이 옆 적에게 번짐
  earthspike: { name: '대지 가시', dmg: 8, rate: 0.45, all: true, bigX: 2, color: 0xA87A4A },
  drum: { name: '전쟁 북', dmg: 10, rate: 0.8, drum: 0.03, color: 0xB8502A },            // 모든 주사위 공격 속도 +
  bell: { name: '종', dmg: 12, rate: 0.9, bell: true, color: 0xF8D050 },                 // 합성하면 모두 즉시 발사 · 봉인 풀림
  battery: { name: '축전지', dmg: 10, rate: 0.9, battery: 15, color: 0x6AF06A },          // 10초마다 SP 묶음
  blueprint: { name: '설계도', dmg: 10, rate: 0.9, blueprint: 0.03, color: 0x6AB8F8 },     // 소환 비용 -
  forge: { name: '대장장이', dmg: 13, rate: 0.9, forge: 0.3, color: 0xFF9A40 },           // 합성 때 30% 확률로 눈 +1 더
  hourglass: { name: '모래시계', dmg: 12, rate: 0.9, bossStun: 1.5, color: 0xF0B050 },     // 보스가 나오면 잠시 멈춤
  guardian: { name: '수호석', dmg: 12, rate: 0.9, guardian: true, color: 0x5FD8A0 },      // 자기와 옆 주사위는 봉인·변신 면역
  bomb: { name: '시한폭탄', dmg: 10, rate: 0.6, bomb: 2.5, color: 0xE85040 },             // 2초 뒤 폭발
  chakram: { name: '차크람', dmg: 14, rate: 1.0, multi: 2, pierce: 0.08, color: 0x40D0C0 },
  siren: { name: '세이렌', dmg: 6, rate: 0.5, all: true, stun: 0.03, color: 0x60E8D0 },
  titan: { name: '타이탄', dmg: 52, rate: 0.35, boss: 1.5, color: 0xC8B080 },
  king: { name: '왕관', dmg: 12, rate: 0.9, kingAura: 0.04, color: 0xFFD040 },           // 모든 주사위 피해 +
  phoenix: { name: '불사조', dmg: 22, rate: 0.9, phoenix: true, splash: 0.2, color: 0xFF8A2A },  // 한 번 패배를 막고 부활
  void: { name: '공허', dmg: 20, rate: 0.8, void: true, boss: 1.5, color: 0x8A40E0 },     // 방패·사라짐 무시
  sun: { name: '태양', dmg: 14, rate: 0.9, sun: 0.16, color: 0xFFE860 },                 // 판의 룬 종류가 많을수록 강함
  starfall: { name: '유성우', dmg: 22, rate: 0.5, multi: 5, splash: 0.3, color: 0x8080FF },
  aurora: { name: '오로라', dmg: 7, rate: 0.5, all: true, vuln: 0.1, slow: 0.1, color: 0x80F0B0 },
  assassin: { name: '암살자', dmg: 38, rate: 0.8, strongest: true, critSelf: 0.25, critX: 1.5, color: 0xB02040 },
  clone: { name: '복제', dmg: 12, rate: 0.9, clone: true, color: 0xB070FF },             // 합성하면 같은 룬 하나 더
  angel: { name: '천사', dmg: 12, rate: 0.9, heal: 3, color: 0xFFF4D0 },                 // 3웨이브마다 생명 +1
  oracle: { name: '예언자', dmg: 16, rate: 0.9, oracle: 12, color: 0xF0E090 },            // 보스 기술을 막음
  genesis: { name: '창세', dmg: 13, rate: 0.9, genesis: 0.5, color: 0xB0F060 },           // 합성 때 다른 주사위 눈 +1
  eclipse: { name: '일식', dmg: 18, rate: 0.9, boss: 1.8, fastX: 1.8, color: 0xE0B040 },
  chaos: { name: '혼돈', dmg: 14, rate: 1.0, chaos: true, color: 0xE04080 },              // 쏠 때마다 덱의 다른 룬 능력
  thunderGod: { name: '뇌신', dmg: 18, rate: 0.8, chain: 6, chainX: 1, color: 0xFFF040 },
  abyssEye: { name: '심연의 눈', dmg: 10, rate: 0.9, eye: 0.1, color: 0x40B0E0 },          // 모든 적이 받는 피해 +
  tree: { name: '세계수', dmg: 11, rate: 0.9, tree: 55, color: 0x40D070 },                // 30초마다 옆 주사위 눈 +1
  blackhole: { name: '블랙홀', dmg: 6, rate: 0.5, all: true, push: 0.004, color: 0xA060D0 },
  judgement: { name: '심판', dmg: 14, rate: 0.9, judge: 10, color: 0xFFF0C0 },           // 10번째 공격마다 가장 센 적에게 큰 일격
  timeLord: { name: '시간 지배자', dmg: 12, rate: 0.9, timeLord: 20, color: 0x60D0C8 },    // 20초마다 모든 적 멈춤
  midas: { name: '미다스', dmg: 12, rate: 0.9, bounty: 2, sp: 20, color: 0xFFC830 },
  archmage: { name: '대마법사', dmg: 18, rate: 0.9, splash: 0.3, slow: 0.12, poison: 15, color: 0xA060FF },
};
// 희귀도: 0 일반 · 1 희귀 · 2 영웅 · 3 전설 (뽑기 확률·등급업 재료 수에 쓰임)
export const RARITY = { flame: 0, frost: 0, storm: 0, venom: 0, gale: 0, iron: 0, light: 0, mana: 0, arrow: 0, echo: 1, fortune: 1, sniper: 1, curse: 1, pierce: 1, time: 1, quake: 1, shackle: 1, bounty: 1, mine: 2, crit: 2, summoner: 2, freeze: 2, sacrifice: 2, alchemy: 2, ward: 2, twin: 2, growth: 3, mirror: 3, shift: 3, hammer: 3, nova: 3, dragon: 3 };
for (const r of ['spark', 'stone', 'water', 'needle', 'spear', 'bow', 'axe', 'coin']) RARITY[r] = 0;
for (const r of ['thunder', 'acid', 'moon', 'giant', 'rage', 'lance', 'shuriken', 'boomerang', 'lava', 'frostbite', 'thornvine', 'quicksand', 'banner', 'lens', 'cauldron', 'totem', 'magnet', 'hex', 'wisp']) RARITY[r] = 1;
for (const r of ['blizzard', 'meteor', 'reaper', 'prism', 'ballista', 'glacier', 'tempest', 'plague', 'earthspike', 'drum', 'bell', 'battery', 'blueprint', 'forge', 'hourglass', 'guardian', 'bomb', 'chakram', 'siren', 'titan']) RARITY[r] = 2;
for (const r of ['king', 'phoenix', 'void', 'sun', 'starfall', 'aurora', 'assassin', 'clone', 'angel', 'oracle', 'genesis', 'eclipse', 'chaos', 'thunderGod', 'abyssEye', 'tree', 'blackhole', 'judgement', 'timeLord', 'midas', 'archmage']) RARITY[r] = 3;
export const RARITY_NAME = ['일반', '희귀', '영웅', '전설'], RARITY_COLOR = [0xB8C2D8, 0x6FB8FF, 0xC07BFF, 0xFFC94D];
// 덱 조합: 두 룬을 함께 넣으면 보너스
export const SYNERGY = [
  { id: 'burn', name: '연소', runes: ['flame', 'venom'], desc: '화염 범위 · 독 피해 +30%' },
  { id: 'super', name: '초전도', runes: ['frost', 'storm'], desc: '느려진 적에게 번개 +50%' },
  { id: 'forge', name: '대장간', runes: ['iron', 'hammer'], desc: '모든 보스 피해 +20%' },
  { id: 'vital', name: '급소', runes: ['crit', 'sniper'], desc: '치명타 피해 2.5배 → 3배' },
  { id: 'rich', name: '풍요', runes: ['fortune', 'mana'], desc: '처치 SP +20%' },
  { id: 'flash', name: '섬광', runes: ['light', 'gale'], desc: '광휘 공속 효과 +50%' },
  { id: 'plague', name: '역병', runes: ['curse', 'venom'], desc: '저주 받는 피해 +10%p' },
  { id: 'stasis', name: '정지장', runes: ['time', 'freeze'], desc: '되돌림 · 멈춤 +50%' },
  { id: 'life', name: '생명 연성', runes: ['growth', 'alchemy'], desc: '성장 속도 +30%' },
  { id: 'volley', name: '연사', runes: ['arrow', 'twin'], desc: '화살 · 쌍검 공격 속도 +20%' },
  { id: 'cata', name: '대격변', runes: ['quake', 'nova'], desc: '지진 · 초신성 피해 +30%' },
  { id: 'jackpot', name: '대박', runes: ['bounty', 'fortune'], desc: '현상금 SP 1.35배 → 1.85배' },
  { id: 'bulwark', name: '철벽', runes: ['ward', 'shackle'], desc: '결계 대기 시간 -30%' },
  { id: 'inferno', name: '화룡', runes: ['dragon', 'flame'], desc: '용의 열기가 2배 빨리 오름' },
  { id: 'sunmoon', name: '일월', runes: ['sun', 'moon'], desc: '태양 · 달빛 피해 +25%' },
  { id: 'deepfreeze', name: '혹한', runes: ['blizzard', 'frost'], desc: '느리게 하는 한도 60% → 75%' },
  { id: 'doom', name: '사형 선고', runes: ['reaper', 'curse'], desc: '처형 기준 +6%p' },
  { id: 'royal', name: '왕의 광휘', runes: ['king', 'light'], desc: '왕관 효과 1.5배' },
  { id: 'cataclysm', name: '천지개벽', runes: ['meteor', 'quake'], desc: '별똥별 · 지진 피해 +30%' },
  { id: 'immortal', name: '불멸', runes: ['phoenix', 'flame'], desc: '불사조 부활 시 생명 2' },
];
export const synergiesOf = deck => SYNERGY.filter(s => s.runes.every(r => deck.includes(r)));
export const RUNE_ORDER = Object.keys(RUNES);
export const POWER_COST = [100, 200, 400, 700];     // 판 안 강화 (종류별 4단계)
export const POWER_BONUS = 0.35;                    // 단계마다 피해 +35%

// 보스 5종 (웨이브 끝에 순환)
export const BOSSES = [
  { id: 'serpent', name: '심연의 뱀', hp: 12, speed: 0.6, spawnEvery: 0.18 },      // 체력이 깎일 때마다 졸개
  { id: 'knight', name: '침묵의 기사', hp: 14, speed: 0.55, silence: 6 },          // 6초마다 주사위 3개 봉인 3초
  { id: 'mage', name: '환술사', hp: 11, speed: 0.6, morph: 7 },                    // 7초마다 주사위 2개 종류 바꿈
  { id: 'warden', name: '수호자', hp: 13, speed: 0.5, shield: 8 },                 // 8초마다 2초 무적
  { id: 'rush', name: '질주자', hp: 10, speed: 0.75, dash: 5 },                    // 5초마다 순간 돌진
  { id: 'statue', name: '석상 군주', hp: 16, speed: 0.45, regen: 0.025 },           // 1.5초 안 맞으면 체력 회복
  { id: 'phantom', name: '그림자 망령', hp: 11, speed: 0.6, blink: 7 },             // 7초마다 2초간 사라짐 (공격 안 받음)
  { id: 'hydra', name: '히드라', hp: 11, speed: 0.55, split: 3 },                  // 쓰러지면 큰 적 3마리로 갈라짐
  { id: 'thief', name: '금화 도둑', hp: 11, speed: 0.65, steal: 6 },               // 6초마다 SP 를 훔침
  { id: 'frost', name: '서리 군주', hp: 13, speed: 0.5, chill: 8 },                // 8초마다 모든 주사위 공격 속도 -40% (3초)
];

// 길: 판 밖 ㄷ자 (왼쪽 아래 → 위 → 오른쪽 → 아래). 길이는 0~1 진행도로 다룸
export const PATH_LEN = 1;
export let HP_GROW = 1.3, PIP_MULT = 1.6;
export function setPip(m) { PIP_MULT = m; }
export function setGrow(g) { HP_GROW = g; }

export class Sim {
  // deck: 룬 id 5개, tiers: { 룬id: 영구 등급 1~ } , seed
  // mode: run(생존) · daily · rush(보스만) · mono(한 룬) · arena(웨이브마다 룬 추가) · abyss(웨이브 10부터)
  constructor({ deck, tiers = {}, seed = 1, startWave = 1, critBonus = 0, mode = 'run' } = {}) {
    this.mode = mode;
    this.critBonus = critBonus;   // 수집 보너스: 영구 치명타 피해 +
    this.R = rng(seed);
    this.deck = deck.slice(0, 5);
    this.tiers = tiers;
    this.board = new Array(SLOTS).fill(null);       // { id, type, pips, cd, silenced, age }
    this.power = Object.fromEntries(this.deck.map(t => [t, 0]));
    this.enemies = []; this.nextId = 1; this.events = [];
    this.sp = mode === 'rush' ? 300 : mode === 'abyss' ? 1200 : 100; this.summons = 0; this.lives = 3; this.wave = startWave; this.t = 0;
    this.phase = 'wave'; this.waveT = 0; this.spawnT = 0; this.spawned = 0; this.over = false;
    this.kills = 0; this.bossKills = 0; this.merges = 0; this.maxPips = 1; this.mines = []; this.crits = 0; this.chillT = 0; this.wards = 0;
    this.syn = Object.fromEntries(synergiesOf(this.deck).map(x => [x.id, true]));
    // 심연 광산: 웨이브 10부터 → 그 정도까지 키운 판을 미리 깔아 줌 (눈 2~3 주사위 12개)
    if (mode === 'abyss') { for (let i = 0; i < 12; i++) this.board[i] = this.newDie(this.randType(), 2 + (i % 3 === 0 ? 1 : 0)); this.summons = 12; this.sp = 500; this.maxPips = 3; }
    this.setupWave();
  }
  ev(type, d = {}) { this.events.push({ type, ...d }); }
  // 랜덤 아레나: 판 중간에 덱에 룬 추가
  addRune(r) { if (this.deck.includes(r) || this.deck.length >= 5) return false; this.deck.push(r); this.power[r] = 0; this.syn = Object.fromEntries(synergiesOf(this.deck).map(x => [x.id, true])); return true; }

  // ── 웨이브 ──
  waveHp(w = this.wave) { return Math.round(45 * Math.pow(HP_GROW, w - 1) + 15 * w); }
  setupWave() {
    const w = this.wave;
    this.toSpawn = this.mode === 'rush' ? 0 : 10 + Math.min(14, w);
    this.spawned = 0; this.spawnT = 0.5; this.waveT = 0; this.phase = 'wave'; this.bossOut = false;
    this.ev('wave', { wave: w });
  }
  spawnEnemy(kind) {
    const base = this.waveHp(), w = this.wave;
    const K = { normal: [1, 0.075, 10], fast: [0.55, 0.13, 10], big: [4.2, 0.052, 30] }[kind];   // 속도: 초당 길 진행 비율 (일반 ≈13초에 통과)
    const e = { id: this.nextId++, kind, hp: base * K[0], max: base * K[0], speed: K[1] * (1 + Math.min(0.5, w * 0.012)), d: 0, slow: 0, poison: 0, sp: K[2] + w * 3 };
    this.enemies.push(e); return e;
  }
  spawnBoss() {
    const B = BOSSES[(this.wave - 1) % BOSSES.length], base = this.waveHp();
    const hp = base * B.hp * (1 + this.wave * 0.04) * (this.mode === 'rush' ? 0.55 : 1);
    const e = { id: this.nextId++, kind: 'boss', boss: B.id, name: B.name, hp, max: hp, speed: B.speed * 0.075, d: 0, slow: 0, poison: 0, sp: 100 + this.wave * 10, t: 0, shield: 0, lastSpawn: 1 };
    this.enemies.push(e); this.bossOut = true;
    let hg = 0; for (const d of this.board) if (d && d.type === 'hourglass') hg = Math.max(hg, RUNES.hourglass.bossStun + 0.3 * d.pips); if (hg) e.stun = hg;
    this.ev('boss', { boss: B.id, name: B.name });
    return e;
  }

  // ── 소환 · 합성 · 강화 ──
  summonCost() { return Math.round((10 + this.summons * 10) * (1 - (this.bpB || 0))); }
  emptySlots() { const o = []; this.board.forEach((d, i) => { if (!d) o.push(i); }); return o; }
  newDie(type, pips) { return { id: this.nextId++, type, pips, cd: this.R() * 0.5, silenced: 0, age: 0 }; }
  randType() { return this.deck[Math.floor(this.R() * this.deck.length)]; }
  summon() {
    const empty = this.emptySlots(), cost = this.summonCost();
    if (this.over || !empty.length || this.sp < cost) return null;
    this.sp -= cost; this.summons++;
    const slot = empty[Math.floor(this.R() * empty.length)];
    const d = this.board[slot] = this.newDie(this.randType(), 1);
    this.ev('summon', { slot, die: d });
    return slot;
  }
  canMerge(a, b) {
    const A = this.board[a], B = this.board[b];
    if (!A || !B || a === b || A.pips !== B.pips || A.pips >= MAX_PIPS) return false;
    return A.type === B.type || RUNES[A.type].wild || RUNES[B.type].wild;
  }
  // a 를 b 위로 끌어 합성 → b 자리에 눈+1 새 주사위 (종류는 덱에서 무작위)
  merge(a, b) {
    if (!this.canMerge(a, b)) return null;
    const A = this.board[a], B = this.board[b], pips = B.pips + 1;
    let gainSp = 0;
    for (const X of [A, B]) if (RUNES[X.type].sp) gainSp = Math.max(gainSp, RUNES[X.type].sp * B.pips * (1 + 0.25 * (this.tiers[X.type] || 1) - 0.25));
    const has = t => A.type === t || B.type === t;
    this.board[a] = null;
    // 변이: 결과가 덱에서 영구 등급이 가장 높은 룬
    const best = () => { const c = this.deck.filter(x => x !== 'shift'); return c.length ? c.sort((x, y) => (this.tiers[y] || 1) - (this.tiers[x] || 1) || RUNES[y].dmg * RUNES[y].rate - RUNES[x].dmg * RUNES[x].rate)[0] : 'shift'; };
    let np = pips; if (has('forge') && np < MAX_PIPS && this.R() < RUNES.forge.forge) { np++; this.ev('forge', { slot: b }); }
    const d = this.board[b] = this.newDie(has('shift') ? best() : this.randType(), np);
    if (has('bell')) { for (const o of this.board) if (o) { o.cd = 0; o.silenced = 0; } this.ev('bell', { slot: b }); }
    if (has('clone')) { const em = this.emptySlots(); if (em.length) { const sl = em[Math.floor(this.R() * em.length)]; this.board[sl] = this.newDie(d.type, Math.max(1, np - 2)); this.ev('summon', { slot: sl, die: this.board[sl], free: true }); } }
    if (has('genesis') && this.R() < RUNES.genesis.genesis) { const cand = this.board.map((o, i) => o && i !== b && o.pips < 6 ? i : -1).filter(i => i >= 0); if (cand.length) { const gi = cand[Math.floor(this.R() * cand.length)]; const o = this.board[gi]; this.board[gi] = this.newDie(o.type, o.pips + 1); this.ev('grow', { slot: gi, die: this.board[gi] }); } }
    // 희생: 옆 주사위들이 이번 판 내내 강해짐 (중첩, 최대 +120%)
    if (A.type === 'sacrifice' || B.type === 'sacrifice') { const n = this.neighbors(b).concat(this.neighbors(a)); const got = []; for (const i of n) { const o = this.board[i]; if (o && i !== b) { o.buff = Math.min(1.2, (o.buff || 0) + RUNES.sacrifice.sacrifice * B.pips); got.push(i); } } if (got.length) this.ev('sacrifice', { slots: got, from: b }); }
    this.sp += Math.round(gainSp);
    this.merges++; this.maxPips = Math.max(this.maxPips, pips);
    this.ev('merge', { from: a, to: b, die: d, sp: Math.round(gainSp) });
    // 소환사: 합성하면 빈 칸에 주사위 하나 더 (눈 = 합성 전 눈)
    if (A.type === 'summoner' || B.type === 'summoner') { const empty = this.emptySlots(); if (empty.length) { const slot = empty[Math.floor(this.R() * empty.length)]; const n = this.board[slot] = this.newDie(this.randType(), Math.max(1, B.pips)); this.ev('summon', { slot, die: n, free: true }); } }
    return d;
  }
  powerCost(type) { const lv = this.power[type]; return lv < POWER_COST.length ? POWER_COST[lv] : null; }
  powerUp(type) {
    const c = this.powerCost(type);
    if (c == null || this.sp < c || this.over) return false;
    this.sp -= c; this.power[type]++;
    this.ev('power', { type, lv: this.power[type] });
    return true;
  }

  // ── 진행 ──
  step(dt) {
    if (this.over) return;
    this.t += dt; this.waveT += dt;
    // 소환
    if (this.phase === 'wave') {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.spawned < this.toSpawn) {
        const w = this.wave, r = this.R();
        const kind = w >= 3 && r < 0.12 + Math.min(0.12, w * 0.006) ? 'big' : w >= 2 && r < 0.38 ? 'fast' : 'normal';
        this.spawnEnemy(kind); this.spawned++;
        this.spawnT = Math.max(0.35, 0.9 - w * 0.03);
      }
      if (this.spawned >= this.toSpawn && !this.bossOut) { this.phase = 'boss'; this.spawnBoss(); }
    }
    this.stepDice(dt);
    this.stepEnemies(dt);
    // 웨이브 끝: 보스까지 다 처치
    if (this.phase === 'boss' && !this.enemies.length) {
      const bonus = 60 + this.wave * 15; this.sp += bonus;
      this.ev('waveClear', { wave: this.wave, sp: bonus });
      for (const d of this.board) if (d) d.heat = 0;   // 용: 웨이브마다 식음
      this.clears = (this.clears || 0) + 1;
      if (this.clears % 3 === 0 && this.lives < 3 && this.board.some(d => d && d.type === 'angel' && !(d.silenced > 0))) { this.lives++; this.ev('heal', {}); }
      this.wave++; this.setupWave();
    }
  }
  dmgOf(d) {
    const R = RUNES[d.type], tier = this.tiers[d.type] || 1;
    const sunB = R.sun ? 1 + R.sun * new Set(this.board.filter(Boolean).map(o => o.type)).size * (this.syn.sunmoon ? 1.25 : 1) : 1;
    return R.dmg * sunB * (R.rage ? 1 + R.rage * (3 - this.lives) : 1) * (1 + (this.kingB || 0)) * (1 + (d.auraDmg || 0)) * (R.fastX && this.syn.sunmoon && d.type === 'moon' ? 1.25 : 1) * (R.splashR && this.syn.cataclysm ? 1.3 : 1) * (1 + (d.heat || 0)) * (R.all || R.nova ? (this.syn.cata ? 1.3 : 1) : 1) * (1 + 0.15 * (tier - 1)) * (1 + (d.buff || 0)) * (R.alchemy ? Math.min(4, 1 + R.alchemy * this.merges) : 1) * (1 + POWER_BONUS * (this.power[d.type] || 0)) * Math.pow(PIP_MULT, d.pips - 1) * (d.pips >= 7 ? 1.5 : 1);   // 눈이 오를수록 한 발이 크게 강해짐 (7눈 각성 +50%)
  }
  neighbors(i) { const r = Math.floor(i / COLS), c = i % COLS, o = []; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const y = r + dr, x = c + dc; if (y >= 0 && x >= 0 && y < ROWS && x < COLS) o.push(y * COLS + x); } return o; }
  // 광휘 옆 주사위 공격 속도 +
  auraAt(i) {
    const r = Math.floor(i / COLS), c = i % COLS; let a = 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const y = r + dr, x = c + dc; if (y < 0 || x < 0 || y >= ROWS || x >= COLS) continue;
      const n = this.board[y * COLS + x]; if (n && RUNES[n.type].aura && !(n.silenced > 0)) a += RUNES[n.type].aura * n.pips * (this.syn.flash && n.type === 'light' ? 1.5 : 1);
    }
    return Math.min(1.2, a);
  }
  rear() { let best = null; for (const e of this.enemies) if (!(e.hidden > 0) && e.hp > 0 && (!best || e.d < best.d)) best = e; return best; }
  randomTargets(n) { const a = this.enemies.filter(e => e.hp > 0 && !(e.hidden > 0)); const o = []; while (o.length < n && a.length) o.push(a.splice(Math.floor(this.R() * a.length), 1)[0]); return o; }
  // 판 전체에 걸리는 효과 (매 프레임): 왕관 피해 · 북 공속 · 설계도 소환비 · 심연의 눈
  globals() {
    let k = 0, dr = 0, bp = 0, eye = 0;
    for (const d of this.board) { if (!d || d.silenced > 0) continue; const R = RUNES[d.type]; if (R.kingAura) k += R.kingAura * d.pips; if (R.drum) dr += R.drum * d.pips; if (R.blueprint) bp += R.blueprint * d.pips; if (R.eye) eye += R.eye + 0.01 * d.pips; }
    this.kingB = Math.min(0.8, k * (this.syn.royal ? 1.5 : 1)); this.drumB = Math.min(0.45, dr); this.bpB = Math.min(0.45, bp); this.eyeB = Math.min(0.35, eye);
  }
  dmgAuraAt(i) { let a = 0; for (const j of this.neighbors(i)) { const n = this.board[j]; if (n && RUNES[n.type].dmgAura && !(n.silenced > 0)) a += RUNES[n.type].dmgAura * n.pips; } return Math.min(1, a); }
  // 예언자: 보스 기술을 막음 (대기 시간)
  oracleBlock() { const o = this.board.find(d => d && d.type === 'oracle' && !(d.oracleCd > 0) && !(d.silenced > 0)); if (!o) return false; o.oracleCd = Math.max(5, RUNES.oracle.oracle - o.pips); this.ev('oracle', {}); return true; }
  guarded(i) { const g = j => { const d = this.board[j]; return d && d.type === 'guardian'; }; return g(i) || this.neighbors(i).some(g); }
  front() { let best = null; for (const e of this.enemies) if (!(e.hidden > 0) && e.hp > 0 && (!best || e.d > best.d)) best = e; return best; }
  front2(x) { let best = null; for (const e of this.enemies) if (e !== x && !(e.hidden > 0) && e.hp > 0 && (!best || e.d > best.d)) best = e; return best; }
  critChance() { let c = 0.05; for (const d of this.board) if (d && d.type === 'crit' && !(d.silenced > 0)) c += RUNES.crit.critBuff * d.pips; return Math.min(0.6, c); }
  strongest() { let best = null; for (const e of this.enemies) if (e.hp > 0 && !(e.hidden > 0) && (!best || e.hp > best.hp)) best = e; return best; }
  stepDice(dt) {
    this.crit = this.critChance(); this.globals();
    if (this.chillT > 0) this.chillT -= dt;
    for (let i = 0; i < SLOTS; i++) {
      const d = this.board[i]; if (!d) continue;
      d.age += dt;
      if (d.silenced > 0) { d.silenced -= dt; continue; }
      if (d.type === 'mana') this.sp += RUNES.mana.spGen * d.pips * dt * (1 + 0.1 * ((this.tiers.mana || 1) - 1));
      // 성장: 일정 시간이 지나면 눈 +1
      // 성장: 눈이 높을수록 오래 걸리고 6눈까지만 (7눈은 합성으로만)
      if (d.type === 'growth' && d.pips < 6 && d.age * (this.syn.life ? 1.3 : 1) >= RUNES.growth.grow + 8 * d.pips) { d.pips++; d.age = 0; this.maxPips = Math.max(this.maxPips, d.pips); this.ev('grow', { slot: i, die: d }); }
      if (d.wardCd > 0) d.wardCd -= dt;
      if (d.oracleCd > 0) d.oracleCd -= dt;
      d.auraDmg = this.dmgAuraAt(i);
      const RD = RUNES[d.type];
      if (RD.battery && (d.batT = (d.batT || 0) + dt) >= 10) { d.batT = 0; const g = Math.round(RD.battery * d.pips); this.sp += g; this.ev('battery', { slot: i, sp: g }); }
      if (RD.tree && (d.treeT = (d.treeT || 0) + dt) >= RD.tree) { d.treeT = 0; const nb = this.neighbors(i).filter(j => this.board[j] && this.board[j].pips < 6); if (nb.length) { const j = nb[Math.floor(this.R() * nb.length)], o = this.board[j]; o.pips++; this.ev('grow', { slot: j, die: o }); } }
      if (RD.timeLord && (d.tlT = (d.tlT || 0) + dt) >= RD.timeLord - d.pips) { d.tlT = 0; for (const e of this.enemies) e.stun = Math.max(e.stun || 0, e.kind === 'boss' ? 0.6 : 1.5); this.ev('timeStop', { slot: i }); }
      d.cd -= dt * RUNES[d.type].rate * (1 + this.auraAt(i) + (this.drumB || 0)) * (this.chillT > 0 ? 0.6 : 1) * (this.syn.volley && (d.type === 'arrow' || d.type === 'twin') ? 1.2 : 1);
      if (d.cd > 0) continue;
      d.cd = 1;
      const tgt = RD.strongest ? this.strongest() : RD.last ? this.rear() : this.front(); if (!tgt) { d.cd = 0.05; continue; }
      if (RUNES[d.type].mine) {   // 지뢰: 맨 앞 적보다 조금 앞에 설치 (최대 6개)
        const at = Math.min(0.97, tgt.d + 0.05 + this.R() * 0.06);
        if (this.mines.length < 6) { this.mines.push({ id: this.nextId++, d: at, dmg: this.dmgOf(d) * d.pips * 1.6 }); this.ev('mine', { slot: i, d: at }); }
        continue;
      }
      // 거울: 옆에서 가장 센 주사위의 종류로 쏨 (눈·강화는 자기 것)
      let as = d;
      if (d.type === 'mirror') { let bn = null; for (const j of this.neighbors(i)) { const o = this.board[j]; if (o && o.type !== 'mirror' && !RUNES[o.type].mine && (!bn || this.dmgOf(o) > this.dmgOf(bn))) bn = o; } if (bn) as = { ...d, type: bn.type, mirrored: 'mirror' }; }
      if (RD.chaos) { const c = this.deck.filter(t => t !== 'chaos' && !RUNES[t].mine && !RUNES[t].chaos); if (c.length) as = { ...d, type: c[Math.floor(this.R() * c.length)], mirrored: 'chaos' }; }
      if (RD.judge && (d.jc = (d.jc || 0) + 1) >= RD.judge) { d.jc = 0; const s2 = this.strongest(); if (s2) { this.damage(s2, this.dmgOf(d) * d.pips * 25); this.ev('judge', { id: s2.id, slot: i }); } }
      const RR = RUNES[as.type];
      if (RR.all) { this.ev('quake', { slot: i, type: as.type }); const dm = this.dmgOf(as) * d.pips; for (const e of this.enemies) { this.damage(e, dm * (RR.bigX && e.kind === 'big' ? RR.bigX : 1)); this.fx(RR, d, e); } continue; }
      if (RR.nova) { d.charge = (d.charge || 0) + 1; if (d.charge >= RR.nova) { d.charge = 0; this.ev('nova', { slot: i }); const dm = this.dmgOf(as) * d.pips * 3.6; for (const e of this.enemies) this.damage(e, dm); continue; } }
      if (RR.dragon) d.heat = Math.min(3, (d.heat || 0) + RR.dragon * (this.syn.inferno ? 2 : 1));
      this.ev('shot', { slot: i, die: as, target: tgt.id, n: d.pips });
      for (let k = 0; k < d.pips; k++) this.hit(as, tgt);
      if (RR.multi) { for (const t3 of this.randomTargets(RR.multi - 1)) { if (t3 === tgt) continue; this.ev('shot', { slot: i, die: as, target: t3.id, n: d.pips }); for (let k = 0; k < d.pips; k++) this.hit(as, t3); } }
      if (RR.ends) { const t4 = this.rear(); if (t4 && t4 !== tgt) { this.ev('shot', { slot: i, die: as, target: t4.id, n: d.pips }); for (let k = 0; k < d.pips; k++) this.hit(as, t4); } }
      if (RR.twin) { const t2 = this.front2(tgt); if (t2) { this.ev('shot', { slot: i, die: as, target: t2.id, n: d.pips }); for (let k = 0; k < d.pips; k++) this.hit(as, t2); } }
      if (RUNES[d.type].hammer && tgt.kind === 'boss') this.damage(tgt, tgt.max * RUNES.hammer.hammer * d.pips * (1 + 0.1 * ((this.tiers.hammer || 1) - 1)));
    }
  }
  hit(d, e) {
    const R = RUNES[d.type];
    let dmg = this.dmgOf(d);
    if (d.mirrored) dmg = this.dmgOf(d) * RUNES[d.type].dmg / RUNES[d.mirrored].dmg * 0.8;
    if (R.fastX && e.kind === 'fast') dmg *= R.fastX;
    if (R.bigX && e.kind === 'big') dmg *= R.bigX;
    if (R.spHit) this.sp += R.spHit * d.pips * 0.2;
    if (R.boss && e.kind === 'boss') dmg *= R.boss;
    if (this.syn.forge && e.kind === 'boss') dmg *= 1.2;
    if (this.syn.super && R.chain && e.slow > 0.05) dmg *= 1.5;
    if (R.shackle && e.kind === 'boss') e.slow = Math.max(e.slow, Math.min(0.55, R.shackle + 0.03 * d.pips));
    if (R.bounty) e.bounty = R.bounty * (this.syn.jackpot ? 1.375 : 1);
    if (this.R() < this.crit + (R.critSelf || 0)) { dmg *= (this.syn.vital ? 3 : 2.5) + this.critBonus + (R.critX || 0); this.crits++; e.critT = 0.3; }
    this.fx(R, d, e);
    if (R.pierce) for (const o of this.enemies) if (o !== e && o.hp > 0 && o.d < e.d && e.d - o.d < R.pierce) this.damage(o, dmg * 0.55);
    this.damage(e, dmg, R.void);
    if (R.execute && e.kind !== 'boss' && e.hp > 0 && e.hp / e.max < R.execute + 0.01 * d.pips + (this.syn.doom ? 0.06 : 0)) { this.damage(e, e.hp + 1, true); this.ev('execute', { id: e.id, d: e.d }); }
    if (R.bomb && !(e.bombT > 0) && e.hp > 0) { e.bombT = 2; e.bombDmg = dmg * R.bomb * d.pips; }
    if (R.splash) for (const o of this.enemies) if (o !== e && Math.abs(o.d - e.d) < (R.splashR || 0.06)) this.damage(o, dmg * R.splash * (this.syn.burn ? 1.3 : 1));
    if (R.poison) { const pz = R.poison * (this.syn.burn ? 1.3 : 1) * (1 + 0.15 * ((this.tiers[d.type] || 1) - 1)) * (1 + POWER_BONUS * (this.power[d.type] || 0)) * 0.15; e.poison += pz; if (R.poisonSplash) for (const o of this.enemies) if (o !== e && o.hp > 0 && Math.abs(o.d - e.d) < 0.06) o.poison += pz * 0.5; }
    if (R.chain) { const near = this.enemies.filter(o => o !== e && o.hp > 0).sort((a, b) => Math.abs(a.d - e.d) - Math.abs(b.d - e.d)).slice(0, R.chain); for (const o of near) this.damage(o, dmg * (R.chainX || 0.6)); }
  }
  // 맞은 적에게 붙는 효과 (느림·약화·밀기·멈춤) — 한 발이든 전체 공격이든 같이 씀
  fx(R, d, e) {
    if (R.vuln) { e.vuln = Math.max(e.vuln || 0, R.vuln + 0.03 * d.pips + (this.syn.plague ? 0.1 : 0)); e.vulnT = 3; }
    if (R.slow) e.slow = Math.max(e.slow, Math.min(this.syn.deepfreeze ? 0.75 : 0.6, R.slow + 0.03 * d.pips));
    const st = this.syn.stasis ? 1.5 : 1;
    if (R.push) { const amt = R.push * st * (e.kind === 'boss' ? 0.35 : 1); if ((e.pushed || 0) < 0.12) { e.d = Math.max(0, e.d - amt); e.pushed = (e.pushed || 0) + amt; } }
    if (R.stun && !(e.stun > 0) && this.R() < R.stun + 0.02 * d.pips) { e.stun = (e.kind === 'boss' ? 0.4 : 1.1) * st; this.ev('stun', { id: e.id }); }
  }
  damage(e, dmg, pierceShield = false) {
    if (e.hp <= 0) return;
    if (!pierceShield && (e.shieldOn > 0 || e.hidden > 0)) return;
    e.lastHit = this.t;
    e.hp -= dmg * (1 + (e.vulnT > 0 ? e.vuln : 0) + (this.eyeB || 0));
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) {
    const gain = Math.round(e.sp * (this.syn.rich ? 1.2 : 1) * (e.bounty || 1)); this.sp += gain; this.kills++;
    if (e.kind === 'boss') this.bossKills++;
    this.ev('kill', { id: e.id, kind: e.kind, sp: gain, d: e.d, boss: e.boss, bounty: !!e.bounty });
    // 히드라: 쓰러지면 큰 적으로 갈라짐
    if (e.kind === 'boss' && e.boss === 'hydra') { for (let k = 0; k < 3; k++) { const m = this.spawnEnemy('big'); m.d = Math.max(0, e.d - 0.015 * k); m.hp = m.max = this.waveHp() * 2.2; } this.ev('split', { id: e.id, d: e.d }); }
  }
  stepEnemies(dt) {
    const B = Object.fromEntries(BOSSES.map(b => [b.id, b]));
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.poison > 0) { const p = e.poison * dt; e.poison = Math.max(0, e.poison - p * 0.15); this.damage(e, p); if (e.hp <= 0) continue; }
      if (e.slow > 0) e.slow = Math.max(0, e.slow - dt * 0.15);
      if (e.vulnT > 0) e.vulnT -= dt;
      if (e.bombT > 0 && (e.bombT -= dt) <= 0) { for (const o of this.enemies) if (o.hp > 0 && Math.abs(o.d - e.d) < 0.05) this.damage(o, e.bombDmg * (o === e ? 1 : 0.6)); this.ev('boom', { id: e.id, d: e.d }); if (e.hp <= 0) continue; }
      let sp = e.speed * (1 - e.slow);
      if (e.stun > 0) { e.stun -= dt; sp = 0; }
      if (e.kind === 'boss') {
        const b = B[e.boss]; e.t += dt;
        // 예고: 기술 1.2초 전에 경고 이벤트 (화면이 미리 알려 줌)
        for (const [k, period] of [['silence', b.silence], ['morph', b.morph], ['dash', b.dash], ['shield', b.shield], ['blink', b.blink], ['steal', b.steal], ['chill', b.chill]]) if (period && (e.t + 1.2) % period < dt) this.ev('telegraph', { id: e.id, skill: k });
        if (b.silence && e.t % b.silence < dt && !this.oracleBlock()) this.bossSilence();
        if (b.morph && e.t % b.morph < dt && !this.oracleBlock()) this.bossMorph();
        if (b.shield) { if (e.t % b.shield < dt) { e.shieldOn = 2; this.ev('shield', { id: e.id }); } if (e.shieldOn > 0) e.shieldOn -= dt; }
        if (b.dash && e.t % b.dash < dt) { e.d = Math.min(0.97, e.d + 0.06); this.ev('dash', { id: e.id }); }
        if (b.regen && this.t - (e.lastHit || 0) > 1.5 && e.hp < e.max) { e.hp = Math.min(e.max, e.hp + e.max * b.regen * dt); e.regenOn = true; } else e.regenOn = false;
        if (b.blink) { if (e.t % b.blink < dt) { e.hidden = 2; this.ev('blink', { id: e.id }); } if (e.hidden > 0) e.hidden -= dt; }
        if (b.steal && e.t % b.steal < dt && !this.oracleBlock()) { const amt = Math.round(Math.min(this.sp * 0.15, 150)); if (amt > 0) { this.sp -= amt; this.ev('steal', { id: e.id, amt }); } }
        if (b.chill && e.t % b.chill < dt && !this.oracleBlock()) { this.chillT = 3; this.ev('chill', { id: e.id }); }
        if (b.spawnEvery) { const lost = 1 - e.hp / e.max; if (lost >= e.lastSpawn * b.spawnEvery && e.lastSpawn < 5) { e.lastSpawn++; for (let k = 0; k < 2; k++) { const m = this.spawnEnemy('fast'); m.d = Math.max(0, e.d - 0.02 * (k + 1)); m.hp = m.max = this.waveHp() * 0.5; } this.ev('summonMinion', { id: e.id }); } }
      }
      e.d += sp * dt;
      if (e.d >= PATH_LEN) {
        // 결계: 대기 시간이 끝난 결계 주사위가 있으면 막음
        const wi = this.board.findIndex(w => w && w.type === 'ward' && !(w.wardCd > 0) && !(w.silenced > 0));
        if (wi >= 0) { const w = this.board[wi]; w.wardCd = (RUNES.ward.ward - 4 * w.pips) * (this.syn.bulwark ? 0.7 : 1); e.hp = 0; this.wards++; this.ev('ward', { slot: wi, id: e.id, kind: e.kind }); if (e.kind === 'boss') this.bossKills++; continue; }
        e.hp = 0; const loss = e.kind === 'boss' ? 2 : 1;
        this.lives -= loss; this.ev('leak', { id: e.id, kind: e.kind, loss });
        if (this.lives <= 0 && !this.phoenixUsed && this.board.some(x => x && x.type === 'phoenix')) { this.phoenixUsed = true; this.lives = this.syn.immortal ? 2 : 1; for (const o of this.enemies) if (o.kind !== 'boss') this.damage(o, o.max * 0.5, true); this.ev('phoenix', {}); }
        if (this.lives <= 0) { this.lives = 0; this.over = true; this.ev('over', { wave: this.wave }); }
      }
    }
    // 지뢰: 적이 지나가면 폭발 (근처 적에게도 피해)
    if (this.mines.length) {
      for (const m of this.mines) {
        const hit = this.enemies.find(e => e.hp > 0 && Math.abs(e.d - m.d) < 0.012);
        if (hit) { m.done = true; for (const e of this.enemies) if (e.hp > 0 && Math.abs(e.d - m.d) < 0.04) this.damage(e, m.dmg * (e === hit ? 1 : 0.5)); this.ev('boom', { id: m.id, d: m.d }); }
      }
      this.mines = this.mines.filter(m => !m.done);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }
  bossSilence() {
    const live = this.board.map((d, i) => d && !this.guarded(i) ? i : -1).filter(i => i >= 0).sort(() => this.R() - 0.5).slice(0, 3);
    for (const i of live) this.board[i].silenced = 3;
    if (live.length) this.ev('silence', { slots: live });
  }
  bossMorph() {
    const live = this.board.map((d, i) => d && !this.guarded(i) ? i : -1).filter(i => i >= 0).sort(() => this.R() - 0.5).slice(0, 2);
    for (const i of live) this.board[i].type = this.randType();
    if (live.length) this.ev('morph', { slots: live });
  }
}
