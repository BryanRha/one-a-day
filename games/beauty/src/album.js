// 카드 앨범 (원작의 카드 수집): 9세트 × 9장 · 별 1~5 · 카드 팩 3종 · 중복 카드 → 별 금고 · 조커 카드 · 세트 완성 보상
//   + 7일 출석 · 저금통(결제가 열리면 깰 수 있음)
import { load, save } from './save.js?v=0.44.4';
import { today } from './state.js?v=0.44.4';

const RARITY = [1, 1, 1, 2, 2, 3, 3, 4, 5];   // 세트 안 카드 순서별 별 (마지막 카드가 가장 귀함)
const def = (id, n, names, reward) => ({ id, n, reward, cards: names.map((cn, i) => ({ key: `${id}${i + 1}`, n: cn, r: RARITY[i] })) });
export const SETS = [
  def('recipe', '할머니의 레시피', ['레시피 노트', '놋쇠 저울', '쌀 빻는 절구', '옛 화장품 병', '낮잠 자는 고양이', '설화당 간판', '약초 달이는 솥', '할머니의 선물 포장', '황금 레시피'], { gems: 10, energy: 30 }),
  def('alley', '서울 골목', ['벚꽃 골목', '떡볶이 포장마차', '골목 카페', '꽃 계단', '빨간 우체통', '남산 노을', '비 오는 골목', '지붕 위 고양이', '반딧불 골목'], { gems: 12, coins: 100 }),
  def('routine', 'K-뷰티 루틴', ['폼 클렌저', '토너', '시트 마스크', '세럼', '아이 크림', '수분 크림', '선크림', '립밤과 롤러', '완벽한 루틴'], { gems: 15, energy: 50 }),
  def('farm', '약초 농장', ['녹차 밭', '동백나무', '인삼 밭', '황금 논', '쑥 바구니', '어성초 냇가', '유자나무', '병풀 온실', '황금 약초원'], { gems: 18, items: ['chest'] }),
  def('cafe', '정원 카페', ['정원의 녹차', '딸기 케이크', '그네 의자', '연꽃 물확', '정원 등불', '온실 선반', '벚꽃 아치', '피크닉 바구니', '밤의 정원 파티'], { gems: 20, energy: 80 }),
  def('workshop', '2층 공방', ['달 창문', '구리 증류기', '연구 노트', '약재 서랍장', '색색의 비커', '오래된 사진', '안락의자와 차', '반짝이는 크림', '전설의 설화 크림'], { gems: 22, coins: 200 }),
  def('seasons', '서울의 사계절', ['봄 소풍', '꽃 시장', '여름 수박', '한강 불꽃놀이', '단풍 궁궐', '곶감 처마', '눈 덮인 지붕', '유자차 한 잔', '새해 풍등'], { gems: 25, items: ['chest', 'ribbon'] }),
  def('products', '설화당 대표 제품', ['동백 세럼', '진주 쌀 크림', '인삼 골드 앰플', '녹차 클레이 팩', '쑥 에센스', '어성초 토너', '시카 크림', '유자 비타 세럼', '설화 크림'], { gems: 30, energy: 100 }),
  def('moments', '설화당의 순간들', ['아침 문 열기', '할머니와 손녀', '동백 배달', '여행객 셀카', '친구들의 거울', '수줍은 꽃다발', '라이브 방송', '재개업 파티', '달밤의 설화당'], { gems: 40, pack: 'diamond' }),
];
export const ALBUM_DONE = { gems: 300, items: ['chest', 'chest'], energy: 200 };   // 앨범 완성
export const ALL_CARDS = SETS.flatMap(s => s.cards.map(c => ({ ...c, set: s.id })));
const byKey = Object.fromEntries(ALL_CARDS.map(c => [c.key, c]));
export const cardOf = k => byKey[k];

// 카드 팩: 장수 · 별 확률 · 보장 (원작처럼 확률 공개)
export const PACKS = {
  basic: { n: '기본 팩', img: 'pack_basic', count: 3, odds: [55, 30, 12, 2.5, 0.5], min: 1 },
  gold: { n: '골드 팩', img: 'pack_gold', count: 4, odds: [40, 32, 20, 6, 2], min: 3 },
  diamond: { n: '다이아 팩', img: 'pack_diamond', count: 5, odds: [25, 30, 28, 12, 5], min: 4 },
};
// 별 금고: 겹친 카드의 별을 모아 교환
export const VAULT = [{ cost: 40, pack: 'basic' }, { cost: 100, pack: 'gold' }, { cost: 220, joker: 1 }];
export const ORDERS_PER_PACK = 5;   // 주문 5번마다 기본 팩

// 앨범 시즌 (원작처럼 약 40일마다 새 시즌): 모은 카드·세트는 새로 · 팩·별·조커는 그대로 · 시즌이 오를수록 보상 1.2배씩
export const SEASON_DAYS = 40;
const seasonNo = () => Math.floor((Date.now() / 864e5 - 20745) / SEASON_DAYS) + 1;   // 2026-10-19 시즌 1
export function album() { const d = load(); if (!d.album) { d.album = { have: {}, stars: 0, jokers: 0, packs: { basic: 1, gold: 0, diamond: 0 }, done: [], all: false, orders: 0, season: seasonNo() }; save(); }
  const a = d.album; if (!a.season) a.season = seasonNo();
  if (a.season !== seasonNo()) { d.albumHist = d.albumHist || []; d.albumHist.push({ season: a.season, count: ALL_CARDS.filter(c => (a.have[c.key] || 0) > 0).length, sets: a.done.length }); a.have = {}; a.done = []; a.all = false; a.season = seasonNo(); a.packs.basic += 2; save(); }
  return a; }
export const seasonLeft = () => { const s = album().season; return Math.max(0, ((s - 1) * SEASON_DAYS + 20745 + SEASON_DAYS) * 864e5 - Date.now()); };
export const seasonMul = () => 1 + 0.2 * Math.max(0, album().season - 1);
export const scaled = r => { const m = seasonMul(), o = { ...r }; for (const k of ['gems', 'coins', 'energy']) if (o[k]) o[k] = Math.round(o[k] * m); return o; };
export const owned = k => (album().have[k] || 0) > 0;
export const setCount = s => s.cards.filter(c => owned(c.key)).length;
export const totalCount = () => ALL_CARDS.filter(c => owned(c.key)).length;
export const packCount = () => { const a = album(); return a.packs.basic + a.packs.gold + a.packs.diamond; };
export function addPack(type, n = 1) { const a = album(); a.packs[type] = (a.packs[type] || 0) + n; save(); }

const rollRarity = (odds, min = 1) => { const tot = odds.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < 5; i++) { if (r < odds[i]) return Math.max(i + 1, 0); r -= odds[i]; } return 1; };
// 팩 열기 → [{ key, r, isNew, stars }] (중복은 별로)
export function openPack(type) {
  const a = album(), P = PACKS[type]; if (!a.packs[type]) return null; a.packs[type]--;
  const out = [];
  for (let i = 0; i < P.count; i++) {
    let r = rollRarity(P.odds); if (i === P.count - 1 && !out.some(c => c.r >= P.min)) r = Math.max(r, P.min);   // 마지막 장은 보장 별 이상
    const pool = ALL_CARDS.filter(c => c.r === r), c = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !owned(c.key) && !out.some(o => o.key === c.key); a.have[c.key] = (a.have[c.key] || 0) + 1;
    const stars = isNew ? 0 : c.r; a.stars += stars; out.push({ key: c.key, r: c.r, isNew, stars });
  }
  save(); return out;
}
export function useJoker(key) { const a = album(); if (!a.jokers || owned(key)) return false; a.jokers--; a.have[key] = 1; save(); return true; }
export function vaultBuy(i) { const a = album(), v = VAULT[i]; if (!v || a.stars < v.cost) return false; a.stars -= v.cost; if (v.pack) a.packs[v.pack]++; if (v.joker) a.jokers += v.joker; save(); return true; }
// 완성했지만 아직 안 받은 세트 보상
export const claimable = () => SETS.filter(s => setCount(s) === 9 && !album().done.includes(s.id));
export const albumClaimable = () => { const a = album(); return !a.all && SETS.every(s => a.done.includes(s.id)); };

// 7일 출석 (하루 한 번 · 7일마다 다시)
export const LOGIN = [{ energy: 30 }, { coins: 100 }, { pack: 'basic' }, { gems: 10 }, { items: ['scissors', 'ribbon'] }, { pack: 'gold' }, { joker: 1, gems: 30 }];
export function loginCheck() { const d = load(); if (!d.login) d.login = { last: '', day: 0, claimed: true }; if (d.login.last !== today()) { d.login.last = today(); d.login.day = d.login.day % 7 + 1; d.login.claimed = false; save(); } return d.login; }
// 저금통: 주문마다 보석이 쌓임 (결제가 열리면 깰 수 있음)
export const PIGGY = { perOrder: 2, max: 400 };
export function piggyAdd() { const d = load(); d.piggy = Math.min(PIGGY.max, (d.piggy || 0) + PIGGY.perOrder); }
