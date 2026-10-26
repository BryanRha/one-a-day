// 데이터: 브랜드(받은 자료로 교체) · 메뉴 · 지점 배치 · 열기 순서 · 직원 · 쿠폰
//   ※ 메뉴 이름 · 지점 이름 · 색은 임시 — 트렌차이즈 자료 받으면 여기만 바꾸면 됨
export const BRAND = { name: '마루미베이글', sign: 'marumi', sub: 'TOKYO BAGEL', dark: '#5A3A22', brown: '#A98259', accent: '#FF6720', accentHex: 0xFF6720, cream: '#F3E7D6',
  slogan: '일상의 쉼표가 되는 곳, 마루미베이글에서 즐기는 갓 구운 행복', story: '도쿄 요요기에서 이어지는 정신 · 매일 새벽 직접 반죽하고 굽는 수제 베이글', insta: 'https://www.instagram.com/marumi.bagel_official/' };   /* 공식 홈페이지 marumibagel.com */
export const GAME = { title: '마루미 베이글 하우스', en: 'Marumi Bagel House' };
// 물건 → 메뉴 (가격은 지점 배수 곱함)
//   실제 메뉴 (잠실리센츠점 · 2026-10-26 사용자 제공): 플레인 1,900 · 솔트버터 3,500 · 올리브치즈 2,900 · 치즈시금치 3,500 · 크랜베리호두 3,500 · 크림치즈 컵 각 2,000
//   게임 가격 = 실제 가격 비율 (플레인 1,900원 → 5)
//   물건 칸 이름은 그대로 두고(bagel·cream·coffee) 지점마다 무엇인지 바꿈: bagel=오븐 플레인 · cream=토핑 바 특별 베이글 · coffee=크림치즈 냉장고 컵
export const MENU = { bagel: { name: '플레인 베이글', short: '플레인', price: 5, icon: '🥯' }, cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, icon: '🥯', look: 'salt' }, coffee: { name: '플레인 크림치즈', short: '크림치즈', price: 5, icon: '🥣', look: 'cup_plain' } };
export const BRANCH_MENU = [
  { cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, look: 'salt', bar: '솔트버터 바' }, coffee: { name: '플레인 크림치즈', short: '플레인 크림', price: 5, look: 'cup_plain' } },
  { cream: { name: '올리브치즈 베이글', short: '올리브치즈', price: 8, look: 'olive', bar: '올리브치즈 바' }, coffee: { name: '블루베리 크림치즈', short: '블루베리 크림', price: 5, look: 'cup_blue' } },
  { cream: { name: '치즈시금치 베이글', short: '치즈시금치', price: 9, look: 'spinach', bar: '치즈시금치 바' }, coffee: { name: '대파베이컨 크림치즈', short: '대파베이컨 크림', price: 5, look: 'cup_scallion' } },
  { cream: { name: '크랜베리호두 베이글', short: '크랜베리호두', price: 9, look: 'cranberry', bar: '크랜베리호두 바' }, coffee: { name: '무화과호두 크림치즈', short: '무화과 크림', price: 5, look: 'cup_fig' } },
];
export function setBranchMenu(i) { const m = BRANCH_MENU[i] || BRANCH_MENU[0]; Object.assign(MENU.cream, m.cream); Object.assign(MENU.coffee, m.coffee); }
// 지점: 가게 크기 · 테마 · 배수 · 설비 자리 (order = 열리는 순서 · cost = 열기 비용)
//   type: oven·counter·ccbar·coffee·table·bin·drive·hire(staff)·up(upgrade)·plant·next
const B1 = {
  W: 1500, D: 1500, mult: 1,
  theme: { floorA: '#FBF1E3', floorB: '#F0DCC2', wallA: 0xF7E6CF, wallB: 0xEFD9BC, trim: 0x9A643A, outside: 0xE8D2B4 },
  door: [380, 920], queue: [[260, 250], 110],
  slots: [
    { id: 'oven', type: 'oven', x: -500, z: -580, free: true },
    { id: 'counter', type: 'counter', x: 150, z: 80, free: true },
    { id: 'bin', type: 'bin', x: -600, z: -110, free: true },
    { id: 'plant2', type: 'plant', x: 640, z: -640, free: true },
    { id: 't1', type: 'table', x: -440, z: 340, cost: 30 },
    { id: 'cc', type: 'ccbar', x: 120, z: -580, cost: 120, label: '토핑 바' },
    { id: 'mixer', type: 'mixer', x: -210, z: -600, cost: 220, label: '반죽기 · 오븐 2배' },
    { id: 't2', type: 'table', x: -40, z: 340, cost: 160 },
    { id: 'cashier', type: 'hire', staff: 'cashier', x: 470, z: -120, cost: 260, label: '계산원 뽑기' },
    { id: 'coffee', type: 'coffee', x: 440, z: -580, cost: 420, label: '크림치즈 냉장고' },
    { id: 't3', type: 'table', x: -440, z: 640, cost: 380 },
    { id: 'baker', type: 'hire', staff: 'baker', x: 470, z: 40, cost: 650, label: '제빵사 뽑기' },
    { id: 'carry', type: 'up', up: 'carry', x: 470, z: 200, cost: 520, label: '더 많이 들기' },
    { id: 'kettle', type: 'kettle', x: -640, z: -330, cost: 760, label: '데치기 솥 · 값 +20%' },
    { id: 't4', type: 'table', x: -40, z: 640, cost: 640 },
    { id: 'cleaner', type: 'hire', staff: 'cleaner', x: 470, z: 360, cost: 860, label: '청소 직원 뽑기' },
    { id: 'drive', type: 'drive', x: 740, z: -200, cost: 1500, label: '드라이브스루' },
    { id: 'speed', type: 'up', up: 'speed', x: 470, z: 520, cost: 1100, label: '빨리 걷기' },
    { id: 'next', type: 'next', x: 150, z: 600, cost: 3000, label: '2호점 열기' },
  ],
};
const scale = (b, k, theme, name) => ({ ...b, name, mult: k, theme: { ...b.theme, ...theme }, slots: b.slots.map(s => ({ ...s, cost: s.cost && Math.round(s.cost * k * 1.6 / 10) * 10, label: s.id === 'next' ? s.labelNext || s.label : s.label })) });
export const BRANCHES = [
  { ...B1, name: '1호점 · 잠실리센츠점', photo: 'store1' },
  { ...scale(B1, 4, { floorA: '#F4F1EC', floorB: '#DCD3C8', wallA: 0xEDE6DC, wallB: 0xE2D8CA, trim: 0x5A4A3A, outside: 0xD9CDBC }, '2호점 · 석촌본점'), photo: 'store2' },
  { ...scale(B1, 14, { floorA: '#FFF4E8', floorB: '#F7D9C4', wallA: 0xFBE3D3, wallB: 0xF1D2BE, trim: 0xB0603A, outside: 0xEBCDB6 }, '3호점 · 헬리오시티점'), photo: 'store3' },
  { ...scale(B1, 45, { floorA: '#F0EEE8', floorB: '#D2CCC0', wallA: 0xE8E2D8, wallB: 0xDAD2C4, trim: 0x3A3A3A, outside: 0xCFC6B6 }, '4호점 · 파크포레온점'), photo: 'store4' },
];
BRANCHES.forEach((b, i) => { const n = b.slots.find(s => s.id === 'next'); if (n) n.label = `${i + 2}호점 열기`; }); BRANCHES[3].slots = BRANCHES[3].slots.filter(s => s.id !== 'next');
export const BRANCH_INFO = ['서울 송파구 올림픽로 145 리센츠상가 1층', '서울 송파구 삼학사로 42-1 1~2층', '서울 송파구 송파대로 345 헬리오시티 B1', '서울 강동구 양재대로 1360 포레온스테이션5 B1'];
// 업그레이드 (지점마다 · 1~10단계): 효과는 game.js 에서 L(이름)으로 읽음
export const UPGRADES = [
  { id: 'oven', name: '오븐 성능', desc: '베이글이 더 빨리 구워져요', icon: '🔥', base: 80, need: 'oven' },
  { id: 'ovenCap', name: '오븐 판 늘리기', desc: '오븐에 더 많이 쌓여요', icon: '🧺', base: 120, need: 'oven' },
  { id: 'bar', name: '토핑 바 손 빠르게', desc: '특별 베이글이 빨리 만들어져요', icon: '🧂', base: 150, need: 'cc' },
  { id: 'fridge', name: '크림치즈 냉장고 확장', desc: '크림치즈가 더 빨리 채워져요', icon: '🥣', base: 200, need: 'coffee' },
  { id: 'price', name: '메뉴 가격 올리기', desc: '모든 메뉴 +8%', icon: '💰', base: 180 },
  { id: 'ads', name: 'SNS 홍보', desc: '손님이 더 자주 와요', icon: '📣', base: 160 },
  { id: 'staff', name: '직원 교육', desc: '직원이 더 빨리 일해요', icon: '🧑‍🍳', base: 260, need: 'baker' },
  { id: 'tip', name: '친절 서비스', desc: '손님이 팁을 줄 때가 있어요', icon: '😊', base: 220 },
];
export const UP_MAX = 10;
export const upCost = (u, lv, mult) => Math.round(u.base * Math.pow(1.55, lv) * mult / 5) * 5;
export const FINISHED_RATE = 0.9;   /* 다 연 지점 자동 수익 (초당, × 지점 배수 × (1 + 가격 단계/10)) */
// 사람 · 직원 · 손님 · 쿠폰
export const PLAYER = { speed: 430, carry: 6, carryUp: 10, speedUp: 1.3 };
export const STAFF = { cashier: { body: 0x5A8AE0, serve: 0.55 }, baker: { body: 0x7A4A2A, speed: 300, carry: 4 }, cleaner: { body: 0x6AB07A, speed: 320 } };
export const CUST_COLORS = [0x6A9AE8, 0xE86A8A, 0x9ACF6A, 0xF2C14E, 0xC08AE0, 0x5AC0B0, 0xE8A06A, 0x8AA0B8];
export const COUPON = { goal: 100, text: '크림치즈 1개 무료 (베이글 구매 시) · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };   /* 쿠폰 내용은 트렌차이즈와 정함 */
