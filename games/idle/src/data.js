// 여명기사단 키우기 — 데이터 (영웅 · 사도 · 지역 · 괴물 · 장비 · 소환)
// 그림 파일 이름(id)은 원본 이름 그대로, 게임에 보이는 이름은 모두 새 이름

// 등급: 일반 · 희귀 · 전설 · 레전드 · 사도(지역 보스를 해방하면 합류)
export const GRADES = [
  { n: '일반', en: 'Common', col: 0x8FA3B8, css: '#8FA3B8', m: 1 },
  { n: '희귀', en: 'Rare', col: 0x4FA3FF, css: '#4FA3FF', m: 1.45 },
  { n: '전설', en: 'Epic', col: 0xB46BFF, css: '#C48BFF', m: 2.1 },
  { n: '레전드', en: 'Legend', col: 0xFFB13B, css: '#FFC062', m: 3.0 },
  { n: '사도', en: 'Herald', col: 0xFF5A6E, css: '#FF7A8A', m: 3.4 },
];
// 역할: 기본 능력 배율 · 사거리(px) · 공격 간격(초)
export const ROLES = {
  tank: { n: '탱커', hp: 3.2, atk: 0.55, range: 130, rate: 1.3, row: 0 },
  melee: { n: '근딜', hp: 1.7, atk: 1.15, range: 150, rate: 1.0, row: 0 },
  ranged: { n: '원딜', hp: 1.0, atk: 1.25, range: 760, rate: 1.1, row: 1 },
  magic: { n: '마법', hp: 0.95, atk: 1.35, range: 700, rate: 1.4, row: 1 },
  healer: { n: '힐러', hp: 1.2, atk: 0.5, range: 640, rate: 1.5, row: 1 },
  buffer: { n: '버퍼', hp: 1.2, atk: 0.7, range: 620, rate: 1.3, row: 1 },
};
// 스킬 종류: strike(단일 큰 피해) · aoe(적 전체) · line(꿰뚫기) · heal(아군 회복) · shield(아군 보호막) · buff(공격력↑) · taunt(도발+방어↑)
export const SKILL_KIND = { strike: '단일 강타', aoe: '광역', line: '관통', heal: '회복', shield: '보호막', buff: '공격 강화', taunt: '도발' };

// [그림 id, 이름, 영문, 칭호, 역할, 등급(0~3), 스킬 이름, 스킬 종류, 스킬 설명]
const H = [
  ['cloud', '카이', 'Kai', '첫 등불의 검사', 'melee', 1, '여명 가르기', 'strike', '앞의 적을 크게 벱니다'],
  ['kenneth', '엘리시아', 'Elysia', '새벽 방패', 'tank', 1, '새벽의 방벽', 'shield', '아군 전체에게 보호막을 씌웁니다'],
  ['flora', '릴리안', 'Lilian', '꽃의 사제', 'healer', 1, '꽃비', 'heal', '아군 전체를 회복합니다'],
  ['ava', '세라 블랙휘슬', 'Sera Blackwhistle', '등대항의 사략선장', 'ranged', 2, '등대포', 'line', '줄지어 선 적을 모두 꿰뚫습니다'],
  ['ciara', '로즈 액스하트', 'Rose Axeheart', '도끼 든 말괄량이', 'tank', 1, '회오리 도끼', 'aoe', '주변 적 모두에게 피해를 줍니다'],
  ['hegadion', '알다린', 'Aldarin', '마지막 성기사', 'tank', 3, '성광의 맹세', 'taunt', '적을 끌어당기고 방어가 크게 오릅니다'],
  ['sharon', '카덴스', 'Cadence', '원정의 음유시인', 'buffer', 2, '진군의 노래', 'buff', '아군 전체 공격력이 오릅니다'],
  ['aron', '그라함 아이언월', 'Graham Ironwall', '강철벽 창기병', 'tank', 1, '강철 돌진', 'strike', '앞의 적을 들이받습니다'],
  ['asilri', '미라벨', 'Mirabelle', '곡예 검사', 'melee', 1, '칼날 곡예', 'aoe', '빙글 돌며 주변을 벱니다'],
  ['azgaro', '바르가스', 'Vargas', '큰칼 용병', 'melee', 0, '내려찍기', 'strike', '큰칼로 내려찍습니다'],
  ['bessie', '리엔', 'Rien', '쌍검 무희', 'melee', 1, '쌍검 난무', 'strike', '빠르게 여러 번 벱니다'],
  ['billyahn', '마그다 스톰레인', 'Magda Stormrein', '폭풍 갑판장', 'melee', 2, '닻 휘두르기', 'aoe', '닻을 휘둘러 적을 쓸어버립니다'],
  ['birk', '오웬 경', 'Sir Owen', '부엉이 기사', 'tank', 0, '깃털 방패', 'shield', '아군에게 보호막을 씌웁니다'],
  ['bonny', '코코', 'Coco', '토끼 정찰병', 'buffer', 0, '경계 신호', 'buff', '아군 공격력이 조금 오릅니다'],
  ['chloe', '바이올렛', 'Violet', '철퇴의 집행관', 'melee', 1, '심판의 철퇴', 'strike', '철퇴로 강하게 내려칩니다'],
  ['crocat', '바론 위스커', 'Baron Whisker', '고양이 결투가', 'melee', 0, '찌르기 삼연격', 'strike', '레이피어로 세 번 찌릅니다'],
  ['crocodile', '하쿠', 'Haku', '백발의 낭인', 'melee', 3, '일섬', 'line', '눈 깜짝할 새 적 사이를 베고 지나갑니다'],
  ['deino', '노엘', 'Noelle', '서릿빛 수정술사', 'magic', 3, '서리 폭풍', 'aoe', '얼음 폭풍이 적 전체를 덮칩니다'],
  ['ella', '실피아', 'Sylphia', '바람의 요정 기사', 'magic', 3, '하늘 창', 'line', '바람의 창이 적을 꿰뚫습니다'],
  ['gana', '카야', 'Kaya', '서리 부족 방패수', 'tank', 0, '서리 방패', 'taunt', '적을 끌어당기고 버팁니다'],
  ['gel', '에드릭', 'Edric', '그림자 단검', 'melee', 1, '그림자 습격', 'strike', '뒤로 돌아가 급소를 찌릅니다'],
  ['ging', '고르', 'Gorr', '바위망치 드워프', 'tank', 0, '대지 강타', 'aoe', '땅을 내리쳐 주변을 흔듭니다'],
  ['griffith', '아스칼', 'Ascal', '하늘 수호 그리폰', 'melee', 2, '급강하', 'strike', '하늘에서 내리꽂힙니다'],
  ['heran', '베스퍼', 'Vesper', '밤을 등진 마녀', 'magic', 3, '역광', 'aoe', '밤의 힘을 거꾸로 터뜨립니다'],
  ['hetia', '티리엘', 'Tyriel', '깃털 궁수', 'ranged', 2, '깃털 화살비', 'aoe', '화살비가 적 전체에 쏟아집니다'],
  ['isabel', '올리브', 'Olive', '호박등 마녀', 'magic', 1, '호박등 폭죽', 'aoe', '호박등이 터지며 불꽃이 퍼집니다'],
  ['karin', '네리스', 'Nerys', '고요한 낫', 'melee', 2, '고요한 수확', 'aoe', '낫을 크게 휘둘러 베어 냅니다'],
  ['kinchi', '미야', 'Mya', '발톱 도적', 'melee', 0, '할퀴기', 'strike', '날카로운 발톱으로 할큅니다'],
  ['laila', '아즈라', 'Azra', '용의 권사', 'melee', 2, '용권', 'strike', '용의 기운을 실은 주먹'],
  ['liam', '키런', 'Kieran', '심연의 마도사', 'magic', 3, '심연의 숨결', 'line', '심연의 빛줄기가 적을 꿰뚫습니다'],
  ['linda', '스칼렛', 'Scarlett', '쌍횃불 무희', 'buffer', 0, '횃불 춤', 'buff', '아군의 공격력이 오릅니다'],
  ['melissa', '레이븐', 'Raven', '칼날 암살자', 'melee', 2, '칼날 폭풍', 'strike', '수많은 칼날이 한 적에게 꽂힙니다'],
  ['nanhee', '루미', 'Lumi', '별사탕 마법사', 'magic', 1, '별사탕 유성', 'aoe', '반짝이는 유성이 떨어집니다'],
  ['noum', '쿠쿠', 'Kuku', '깃털 주술사', 'healer', 0, '깃털 치유', 'heal', '아군을 회복합니다'],
  ['patrick', '레온', 'Leon', '여명의 창기사', 'tank', 2, '여명 돌격', 'taunt', '앞장서서 적을 막아섭니다'],
  ['recter', '로크', 'Rourke', '늑대가죽 사냥꾼', 'ranged', 1, '사냥꾼의 투척', 'strike', '도끼를 던져 큰 피해'],
  ['rilsi', '리아', 'Ria', '붉은 두건 사냥꾼', 'ranged', 1, '늑대의 눈', 'line', '정확한 화살이 적을 꿰뚫습니다'],
  ['rily', '모르페', 'Morphe', '꿈의 마법사', 'buffer', 0, '단잠의 자장가', 'shield', '아군에게 꿈의 보호막'],
  ['ringring', '카스미', 'Kasumi', '그림자 닌자', 'melee', 2, '분신술', 'aoe', '분신이 적들을 동시에 벱니다'],
  ['rohan', '테오', 'Theo', '쌍검 수습기사', 'melee', 0, '쌍검 찌르기', 'strike', '두 검으로 찌릅니다'],
  ['rojarin', '로제타', 'Rosetta', '우산 마녀', 'magic', 1, '빗방울 마탄', 'aoe', '마법 빗방울이 쏟아집니다'],
  ['serien', '아델', 'Adele', '기도하는 수녀', 'healer', 2, '여명의 기도', 'heal', '아군 전체를 크게 회복합니다'],
  ['tania', '오팔', 'Opal', '보석술사', 'magic', 2, '보석 폭발', 'aoe', '보석이 터지며 적 전체에 피해'],
  ['tez', '이그나르', 'Ignar', '화염검사', 'melee', 2, '화염 베기', 'aoe', '불꽃 검기가 주변을 태웁니다'],
  ['toad', '핍', 'Pip', '골목 꼬마 권투사', 'melee', 0, '원투 펀치', 'strike', '빠른 연타'],
  ['ubanna', '자이라', 'Zaira', '뿔창 무희', 'melee', 2, '창의 춤', 'aoe', '창을 휘두르며 춤춥니다'],
  ['yubin', '하루', 'Haru', '붉은 활', 'ranged', 1, '붉은 화살', 'strike', '강한 화살 한 발'],
];
// 여덟 사도: 지역 보스 → 해방하면 합류 (등급 4)
const HER = [
  ['loki', '가르노스', 'Garnos', '뿔의 투사', 'melee', '뿔의 분노', 'aoe', '거대한 도끼창으로 휩쓸어 버립니다'],
  ['echidna', '세르펜티나', 'Serpentina', '뱀의 여왕', 'magic', '맹독의 숨', 'aoe', '독기가 적 전체를 감쌉니다'],
  ['jaden', '칼둔', 'Caldun', '진홍 깃의 흑기사', 'tank', '진홍 맹세', 'taunt', '모든 공격을 대신 받아 냅니다'],
  ['sedona', '이셀', 'Isel', '서리 정령', 'magic', '절대 영도', 'aoe', '모든 것을 얼려 버립니다'],
  ['qeen', '케라', 'Kera', '재의 하피', 'ranged', '잿빛 깃털', 'line', '불붙은 깃털이 꿰뚫습니다'],
  ['felix', '모르데카이', 'Mordecai', '피의 백작', 'magic', '진홍 연회', 'aoe', '피의 마법이 적을 덮칩니다'],
  ['sting', '오르도', 'Ordo', '침묵의 수도사', 'tank', '침묵의 서약', 'shield', '아군 전체에 두꺼운 보호막'],
  ['erega', '녹티아', 'Noctia', '밤의 여왕', 'magic', '밤의 장막', 'aoe', '밤이 내려앉아 적을 짓누릅니다'],
];
export const HEROES = {};
H.forEach(([id, n, en, t, role, g, sn, sk, sd]) => { HEROES[id] = { id, n, en, t, role, g, skill: { n: sn, kind: sk, d: sd } }; });
HER.forEach(([id, n, en, t, role, sn, sk, sd], i) => { HEROES[id] = { id, n, en, t, role, g: 4, herald: i + 1, skill: { n: sn, kind: sk, d: sd } }; });
export const SUMMONABLE = H.map(h => h[0]);
export const START_HEROES = ['cloud', 'kenneth', 'flora'];
// 이야기 합류 (스테이지를 처음 깨면): 1-3 로즈 · 1-8 카덴스 · 1-14 그라함 · 3-1 세라(등대항)
export const STORY_JOIN = { 3: 'ciara', 8: 'sharon', 14: 'aron', 41: 'ava' };

// 지역 (스테이지 20개씩 · 20번째가 사도) — 배경은 A~D 를 5스테이지씩
export const REGIONS = [
  { n: '울음바람 협곡', en: 'Howling Gorge', bg: ['r1a', 'r1b', 'r1d', 'r1a'], herald: 'loki', mobs: ['doom', 'walg'] },
  { n: '잠든 숲길', en: 'Slumberwood Trail', bg: ['r2a', 'r2b', 'r2c', 'r2d'], herald: 'echidna', mobs: ['jimber', 'wooden'] },
  { n: '등대항 벨포트', en: 'Bellport', bg: ['r3a', 'r3b', 'r3c', 'r3d'], herald: 'jaden', mobs: ['doom', 'luppine'] },
  { n: '서릿빛 황야', en: 'Rimefrost Wastes', bg: ['r4a', 'r4b', 'r4c', 'r4d'], herald: 'sedona', mobs: ['garuman', 'tron'] },
  { n: '타오르는 성소', en: 'Burning Sanctum', bg: ['r5a', 'r5b', 'r5a', 'r5b'], herald: 'qeen', mobs: ['mano', 'wooden'] },
  { n: '종소리 대성당', en: 'Cathedral of Bells', bg: ['r6a', 'r6b', 'r6c', 'r6d'], herald: 'felix', mobs: ['luppine', 'tron'] },
  { n: '망자의 사원', en: 'Temple of the Fallen', bg: ['r7a', 'r7b', 'r7c', 'r7d'], herald: 'sting', mobs: ['mano', 'garuman'] },
  { n: '황혼의 탑', en: 'Twilight Spire', bg: ['r8a', 'r8a', 'r8b', 'r8b'], herald: 'erega', mobs: ['tron', 'walg', 'jimber'] },
];
export const STAGES_PER_REGION = 20;
// 괴물 (그림 id → 이름) · 크기 배율
export const MOBS = {
  doom: { n: '뿔투구 오크', s: 1 }, walg: { n: '가시등 사냥개', s: 1.1 }, jimber: { n: '철주먹 고릴라', s: 1.1 }, wooden: { n: '엄니 트롤', s: 1.15 },
  luppine: { n: '은갈기 늑대인간', s: 1.05 }, garuman: { n: '수정 등껍질 거수', s: 1.2 }, tron: { n: '밤돌 골렘', s: 1.15 }, mano: { n: '보라뿔 마수', s: 1.1 },
};
// 펫: 하나를 데리고 다니면 기사단 전체 보너스 (base % · 레벨마다 +25%)
export const PETS = [
  { id: 'rue', n: '다니', en: 'Dawnie', d: '아기 새벽용', stat: 'atk', base: 6, cost: 0 },
  { id: 'puring', n: '몽글이', en: 'Puffle', d: '구름 털뭉치', stat: 'hp', base: 8, cost: 800 },
  { id: 'napa', n: '배추동자', en: 'Cabbie', d: '밭에서 온 꼬마', stat: 'gold', base: 10, cost: 1200 },
  { id: 'teddy', n: '판다 대장', en: 'Captain Pando', d: '든든한 판다', stat: 'crit', base: 3, cost: 2000 },
];

// 장비: 기사단 공용 6부위 · 등급 6단계(★1~★6) — 아이콘은 부위별 6단계 묶음의 첫 번호
export const SLOTS = [
  { k: 'weapon', n: '무기', stat: 'atk', sets: [21, 28, 35, 42, 49, 56, 63, 70, 77, 84] },
  { k: 'helmet', n: '투구', stat: 'hp', sets: [147, 168] },
  { k: 'armor', n: '갑옷', stat: 'hp', sets: [105, 112, 133, 140, 154, 161, 175, 182] },
  { k: 'gloves', n: '장갑', stat: 'crit', sets: [126] },
  { k: 'boots', n: '신발', stat: 'hp', sets: [217] },
  { k: 'acc', n: '장신구', stat: 'atk', sets: [189, 196, 203, 210, 224] },
];
export const EQ_GRADES = [
  { n: '일반', css: '#9FB4A0' }, { n: '고급', css: '#5FC8C0' }, { n: '희귀', css: '#5AA7FF' },
  { n: '영웅', css: '#FFAE4A' }, { n: '전설', css: '#FF6A5A' }, { n: '신화', css: '#C77DFF' },
];
// 장비 상자 등급별 장비 등급 확률(%) — 상자 레벨 1~10
export const CHEST_ODDS = [
  [70, 25, 5, 0, 0, 0], [62, 28, 9, 1, 0, 0], [54, 30, 13, 3, 0, 0], [46, 31, 17, 5, 1, 0], [38, 32, 20, 8, 2, 0],
  [30, 32, 23, 11, 3.5, 0.5], [24, 30, 25, 14, 5.5, 1.5], [18, 28, 27, 17, 7.5, 2.5], [13, 25, 28, 20, 10, 4], [9, 22, 28, 23, 13, 5],
];
export const CHEST_UP = lv => Math.round(2000 * Math.pow(3.2, lv - 1));   // 상자 레벨 올리기 골드
// 영웅 소환 확률(%): 일반 · 희귀 · 전설 · 레전드 — 소환 레벨마다 조금씩 좋아짐 · 80번째 레전드 확정
export const SUMMON = { cost1: 300, cost10: 2700, pity: 80, rates: lv => { const b = Math.min(9, lv - 1); return [58 - b * 2, 31, 9.2 + b * 1.5, 1.8 + b * 0.5]; }, lvNeed: lv => 10 * lv * (lv + 1) / 2 };
// 성급: ★1~★6 · 다음 별까지 필요한 조각 (중복 1명 = 조각 10)
export const STAR_NEED = [0, 10, 20, 40, 80, 160];
export const MAX_STAR = 6;
export const LEVEL_CAP = star => 80 + star * 60;
