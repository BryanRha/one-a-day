// 데이터: 브랜드(받은 자료로 교체) · 메뉴 · 지점 배치 · 열기 순서 · 직원 · 쿠폰
//   ※ 메뉴 이름 · 지점 이름 · 색은 임시 — 트렌차이즈 자료 받으면 여기만 바꾸면 됨
export const BRAND = { name: '마루미 베이글', sign: 'MARUMI BAGEL', dark: '#7A4A2A', accent: '#F28C38', accentHex: 0xF28C38, cream: '#F3E3CC' };
export const GAME = { title: '마루미 베이글 하우스', en: 'Marumi Bagel House' };
// 물건 → 메뉴 (가격은 지점 배수 곱함)
export const MENU = {
  bagel: { name: '플레인 베이글', price: 5 }, cream: { name: '크림치즈 베이글', price: 9 }, coffee: { name: '아메리카노', price: 6 },
};
// 지점: 가게 크기 · 테마 · 배수 · 설비 자리 (order = 열리는 순서 · cost = 열기 비용)
//   type: oven·counter·ccbar·coffee·table·bin·drive·hire(staff)·up(upgrade)·plant·next
const B1 = {
  W: 1500, D: 1500, mult: 1,
  theme: { floorA: '#FBF1E3', floorB: '#F0DCC2', wallA: 0xF7E6CF, wallB: 0xEFD9BC, trim: 0x9A643A, outside: 0xE8D2B4 },
  door: [380, 920], queue: [[260, 250], 110],
  slots: [
    { id: 'oven', type: 'oven', x: -500, z: -580, free: true },
    { id: 'counter', type: 'counter', x: 150, z: 80, free: true },
    { id: 'bin', type: 'bin', x: -660, z: -120, free: true },
    { id: 'plant1', type: 'plant', x: -660, z: 640, free: true }, { id: 'plant2', type: 'plant', x: 640, z: -640, free: true },
    { id: 't1', type: 'table', x: -460, z: 280, cost: 30 },
    { id: 'cc', type: 'ccbar', x: 120, z: -580, cost: 120 },
    { id: 't2', type: 'table', x: -220, z: 470, cost: 160 },
    { id: 'cashier', type: 'hire', staff: 'cashier', x: 470, z: -120, cost: 260, label: '계산원 뽑기' },
    { id: 'coffee', type: 'coffee', x: 440, z: -580, cost: 420 },
    { id: 't3', type: 'table', x: -520, z: 620, cost: 380 },
    { id: 'baker', type: 'hire', staff: 'baker', x: 470, z: 40, cost: 650, label: '제빵사 뽑기' },
    { id: 'carry', type: 'up', up: 'carry', x: 470, z: 200, cost: 520, label: '더 많이 들기' },
    { id: 't4', type: 'table', x: -140, z: 690, cost: 640 },
    { id: 'cleaner', type: 'hire', staff: 'cleaner', x: 470, z: 360, cost: 860, label: '청소 직원 뽑기' },
    { id: 'drive', type: 'drive', x: 740, z: -200, cost: 1500, label: '드라이브스루' },
    { id: 'speed', type: 'up', up: 'speed', x: 470, z: 520, cost: 1100, label: '빨리 걷기' },
    { id: 'next', type: 'next', x: 150, z: 600, cost: 3000, label: '2호점 열기' },
  ],
};
const scale = (b, k, theme, name) => ({ ...b, name, mult: k, theme: { ...b.theme, ...theme }, slots: b.slots.map(s => ({ ...s, cost: s.cost && Math.round(s.cost * k * 1.6 / 10) * 10, label: s.id === 'next' ? s.labelNext || s.label : s.label })) });
export const BRANCHES = [
  { ...B1, name: '1호점 · 성수점' },
  scale(B1, 4, { floorA: '#F4F1EC', floorB: '#DCD3C8', wallA: 0xEDE6DC, wallB: 0xE2D8CA, trim: 0x5A4A3A, outside: 0xD9CDBC }, '2호점 · 홍대점'),
  scale(B1, 14, { floorA: '#FFF4E8', floorB: '#F7D9C4', wallA: 0xFBE3D3, wallB: 0xF1D2BE, trim: 0xB0603A, outside: 0xEBCDB6 }, '3호점 · 강남점'),
];
BRANCHES[1].slots.find(s => s.id === 'next').label = '3호점 열기'; BRANCHES[2].slots = BRANCHES[2].slots.filter(s => s.id !== 'next');
// 사람 · 직원 · 손님 · 쿠폰
export const PLAYER = { speed: 430, carry: 6, carryUp: 10, speedUp: 1.3 };
export const STAFF = { cashier: { body: 0x5A8AE0, serve: 0.55 }, baker: { body: 0x7A4A2A, speed: 300, carry: 4 }, cleaner: { body: 0x6AB07A, speed: 320 } };
export const CUST_COLORS = [0x6A9AE8, 0xE86A8A, 0x9ACF6A, 0xF2C14E, 0xC08AE0, 0x5AC0B0, 0xE8A06A, 0x8AA0B8];
export const COUPON = { goal: 100, text: '아메리카노 1잔 무료 (베이글 구매 시) · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };   /* 쿠폰 내용은 트렌차이즈와 정함 */
