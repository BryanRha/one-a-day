// K-다이스 투어 데이터 — 판 32칸 · 색 줄 8 · 값 · 통행료 · 찬스 카드 · 캐릭터 · AI 성격
// 돈 단위: 만원 (화면에는 '120만'처럼)

// 색 줄 (싼 곳 → 비싼 곳): 땅값 p · 건물값 = p × [0.5, 1, 1.6] · 랜드마크 p × 2.4
export const GROUPS = [   // 원작처럼 채도 높은 색 줄
  { n: '수도권', c: 0x8B5A2B, p: 40 }, { n: '강원 바다', c: 0x19A7E0, p: 60 }, { n: '내륙', c: 0xE0388C, p: 80 }, { n: '전라', c: 0xF07A12, p: 100 },
  { n: '남해', c: 0xE0262E, p: 130 }, { n: '경북', c: 0xE8B400, p: 160 }, { n: '부산', c: 0x16A34A, p: 200 }, { n: '서울', c: 0x1E4FD8, p: 250 },
];
export const BUILD_K = [1, 0.5, 1, 1.6, 2.4];        // 단계별 짓는 값 (땅 · 빌라 · 빌딩 · 호텔 · 랜드마크)
export const TOLL_K = [0.6, 1.8, 4, 7, 11];     // 단계별 통행료 (땅값 기준)
export const LEVEL_N = ['땅', '빌라', '빌딩', '호텔', '랜드마크'];
export const TOUR = { p: 140, toll: [0, 50, 110, 200, 350] };   // 관광지: 가진 개수만큼 통행료
export const START_CASH = 500, SALARY = 100, MAX_ROUNDS = 20, ISLAND_TURNS = 3, ISLAND_FEE = 60;

// 칸: c 도시(g 줄) · t 관광지 · ch 찬스 · tax 국세청 · 모서리 start/island/festival/ktx
const C = (img, n, g) => ({ k: 'c', img, n, g }), TR = (img, n) => ({ k: 't', img, n }), CH = { k: 'ch', img: 'chance', n: '찬스' };
export const TILES = [
  { k: 'start', img: 'c_start', n: '출발' },
  C('incheon', '인천', 0), C('suwon', '수원', 0), CH, C('daejeon', '대전', 0), TR('dokdo', '독도'),
  { k: 'island', img: 'c_island', n: '무인도' },
  C('gangneung', '강릉', 1), C('sokcho', '속초', 1), CH, C('pyeongchang', '평창', 2), C('gwangju', '광주', 2), TR('hangang', '한강'), C('daegu', '대구', 2), C('jeonju', '전주', 3), C('damyang', '담양', 3),
  { k: 'festival', img: 'c_festival', n: '축제' },
  C('yeosu', '여수', 4), C('tongyeong', '통영', 4), CH, C('pohang', '포항', 4), TR('seorak', '설악산'),
  { k: 'ktx', img: 'c_ktx', n: 'KTX' },
  C('gyeongju', '경주', 5), C('andong', '안동', 5), { k: 'tax', img: 'tax', n: '국세청' }, C('haeundae', '해운대', 6), C('gwangan', '광안대교', 6), TR('hallasan', '한라산'), CH, C('gyeongbok', '경복궁', 7), C('namsan', '남산타워', 7),
];
export const N_TILES = TILES.length;   // 32
// 판의 네 변 (라인 독점용): 아래 1~5 · 왼쪽 7~15 · 위 17~21 · 오른쪽 23~31
export const SIDES = [[1, 2, 3, 4, 5], [7, 8, 9, 10, 11, 12, 13, 14, 15], [17, 18, 19, 20, 21], [23, 24, 25, 26, 27, 28, 29, 30, 31]];
export const landPrice = i => TILES[i].k === 't' ? TOUR.p : GROUPS[TILES[i].g].p;

// 찬스 카드 20장
export const CHANCE = [
  { id: 'angel', n: '천사 카드', d: '다음에 내야 할 통행료 한 번 면제 (보관)', w: 3 },
  { id: 'bonus', n: '여행 장려금', d: '80만 받기', w: 2, cash: 80 }, { id: 'lotto', n: '복권 당첨', d: '150만 받기', w: 1, cash: 150 },
  { id: 'fine', n: '과속 딱지', d: '40만 내기', w: 2, cash: -40 }, { id: 'repair', n: '건물 보수', d: '내 건물 1채마다 10만', w: 1 },
  { id: 'start', n: '출발지로!', d: '출발 칸으로 가서 월급 받기', w: 2 }, { id: 'island', n: '표류', d: '무인도로 이동', w: 1 },
  { id: 'ktx', n: 'KTX 탑승권', d: 'KTX 칸으로 이동', w: 1 }, { id: 'festival', n: '축제 개최권', d: '내 땅 하나를 골라 통행료 2배', w: 2 },
  { id: 'back3', n: '길을 잃었다', d: '뒤로 3칸', w: 1 }, { id: 'gift', n: '생일 축하!', d: '모두에게 20만씩 받기', w: 1 }, { id: 'treat', n: '한턱 쏘기', d: '모두에게 20만씩 주기', w: 1 },
  { id: 'upgrade', n: '무료 리모델링', d: '내 건물 하나 한 단계 무료로', w: 1 }, { id: 'tour', n: '관광 투어', d: '가장 가까운 관광지로 이동', w: 1 },
];
export function drawChance() { const tot = CHANCE.reduce((a, c) => a + c.w, 0); let r = Math.random() * tot; for (const c of CHANCE) { if (r < c.w) return c; r -= c.w; } return CHANCE[0]; }

// 캐릭터 (말 · 초상) · 능력
export const CHARS = [
  { id: 'dawon', n: '다온', d: '여행 유튜버', img: 'p_dawon', col: 0xF27BA0, perk: { salary: 1.15 }, perkN: '월급 +15%' },
  { id: 'jun', n: '준', d: 'K-pop 연습생', img: 'p_jun', col: 0x4E8FE6, perk: { double: 0.06 }, perkN: '더블 확률 +6%' },
  { id: 'granny', n: '왕할매', d: '동네 큰손', img: 'p_granny', col: 0x9B6FD6, perk: { build: 0.9 }, perkN: '건설비 -10%' },
  { id: 'kang', n: '강회장', d: '재벌 라이벌', img: 'p_kang', col: 0x3C3C46, perk: { takeover: 0.85 }, perkN: '인수비 -15%' },
  { id: 'horang', n: '호랑', d: '백호 마스코트', img: 'p_horang', col: 0xF0A030, perk: { toll: 0.9 }, perkN: '내는 통행료 -10%' },
  { id: 'yeoreum', n: '여름', d: '여우 아가씨', img: 'p_yeoreum', col: 0x52B87A, perk: { chance: true }, perkN: '찬스에서 나쁜 카드 1번 다시 뽑기' },
];
// AI 성격: 사기 · 짓기 · 인수 · 현금 여유
export const AI = {
  attack: { n: '공격형', buy: 0.95, build: 0.75, take: 0.8, keep: 0.25 },
  saver: { n: '짠돌이', buy: 0.6, build: 0.4, take: 0.2, keep: 0.55 },
  landmark: { n: '랜드마크 집착', buy: 0.8, build: 0.95, take: 0.4, keep: 0.3 },
  gambler: { n: '도박형', buy: 0.85, build: 0.6, take: 0.6, keep: 0.15 },
};
export const fmt = n => `${Math.round(n).toLocaleString()}만`;
