// 더팜 데이터 — 작물 · 동물 · 공장 · 제품 · 건물 · 레벨 · 이야기 (타운십 구조)
// 시간은 초 · 원어데이 세션에 맞게 원작보다 짧게

// 물건 (헛간에 쌓이는 것): 이름 · 그림 · 팔 때 값
export const ITEMS = {
  wheat: { n: '밀', v: 1 }, corn: { n: '옥수수', v: 2 }, carrot: { n: '당근', v: 3 }, strawberry: { n: '딸기', v: 5 }, cabbage: { n: '배추', v: 6 }, sugarcane: { n: '사탕수수', v: 6 }, cotton: { n: '목화', v: 8 }, pumpkin: { n: '호박', v: 10 },
  cowfeed: { n: '젖소 사료', v: 3 }, chickfeed: { n: '닭 모이', v: 3 }, sheepfeed: { n: '양 사료', v: 5 },
  milk: { n: '우유', v: 8 }, egg: { n: '달걀', v: 7 }, wool: { n: '양털', v: 12 },
  bread: { n: '빵', v: 6 }, cookies: { n: '쿠키', v: 20 }, pie: { n: '딸기 파이', v: 30 }, carrotcake: { n: '당근 케이크', v: 34 }, creamcake: { n: '크림 케이크', v: 48 },
  cheese: { n: '치즈', v: 20 }, butter: { n: '버터', v: 28 }, sugar: { n: '설탕', v: 14 }, popcorn: { n: '팝콘', v: 18 },
  fabric: { n: '천', v: 22 }, sweater: { n: '스웨터', v: 36 }, jam: { n: '딸기잼', v: 30 },
  tomato: { n: '토마토', v: 9 }, potato: { n: '감자', v: 11 }, onion: { n: '양파', v: 13 }, grape: { n: '포도', v: 15 }, apple: { n: '사과', v: 17 }, blueberry: { n: '블루베리', v: 20 },
  icecream: { n: '아이스크림', v: 40 }, sundae: { n: '선데이', v: 70 }, pumpkinsoup: { n: '호박 수프', v: 48 }, stew: { n: '배추 스튜', v: 52 }, onionsoup: { n: '양파 수프', v: 58 },
  candy: { n: '사탕', v: 34 }, lollipop: { n: '막대사탕', v: 46 }, dress: { n: '드레스', v: 90 }, hat: { n: '밀짚모자', v: 60 },
  pizza: { n: '피자', v: 70 }, fries: { n: '감자튀김', v: 40 }, bakedpotato: { n: '구운 감자', v: 46 }, tomatosauce: { n: '토마토소스', v: 34 },
  applejuice: { n: '사과 주스', v: 44 }, grapejuice: { n: '포도 주스', v: 40 }, muffin: { n: '블루베리 머핀', v: 64 }, applepie: { n: '사과 파이', v: 72 }, bluejam: { n: '블루베리잼', v: 60 },
  ironore: { n: '철광석', v: 15 }, goldore: { n: '금광석', v: 35 }, ironbar: { n: '철 막대', v: 40 }, goldbar: { n: '금 막대', v: 90 }, pickaxe: { n: '곡괭이', v: 10 }, dynamite: { n: '다이너마이트', v: 25 },
};
// 씨앗 값 (타운십처럼 심을 때 코인을 냄 · 밀은 무료) — 가진 작물이 없어도 언제든 심을 수 있음
export const seedCost = k => k === 'wheat' ? 0 : Math.max(1, Math.round(ITEMS[k].v * 0.6));
export const CROPS = {   // 밭: 씨앗 값을 내고 심어 2개 수확
  wheat: { t: 30, lv: 1, xp: 1 }, corn: { t: 90, lv: 1, xp: 1 }, carrot: { t: 180, lv: 3, xp: 2 }, strawberry: { t: 300, lv: 5, xp: 2 },
  sugarcane: { t: 420, lv: 7, xp: 3 }, cabbage: { t: 600, lv: 9, xp: 3 }, cotton: { t: 900, lv: 11, xp: 4 }, pumpkin: { t: 1500, lv: 14, xp: 5 },
  tomato: { t: 1200, lv: 15, xp: 5 }, potato: { t: 1500, lv: 17, xp: 5 }, onion: { t: 1800, lv: 19, xp: 6 }, grape: { t: 2100, lv: 21, xp: 6 }, apple: { t: 2400, lv: 23, xp: 7 }, blueberry: { t: 2700, lv: 25, xp: 7 },
};
// 생산 건물: 동물 우리(3칸 동시) · 공장(차례로, 줄 칸 수)
export const RECIPES = {
  cowfeed: { b: 'feedmill', in: { wheat: 2, corn: 1 }, t: 40, xp: 1 }, chickfeed: { b: 'feedmill', in: { wheat: 1, corn: 2 }, t: 40, xp: 1 }, sheepfeed: { b: 'feedmill', in: { wheat: 2, carrot: 2 }, t: 80, xp: 2, lv: 8 },
  milk: { b: 'cowbarn', in: { cowfeed: 1 }, t: 120, xp: 2 }, egg: { b: 'coop', in: { chickfeed: 1 }, t: 90, xp: 2 }, wool: { b: 'sheeppen', in: { sheepfeed: 1 }, t: 240, xp: 3 },
  bread: { b: 'bakery', in: { wheat: 3 }, t: 60, xp: 2 }, cookies: { b: 'bakery', in: { wheat: 2, egg: 1, sugar: 1 }, t: 240, xp: 4, lv: 7 }, pie: { b: 'bakery', in: { wheat: 2, strawberry: 2, egg: 1 }, t: 360, xp: 5, lv: 6 },
  carrotcake: { b: 'bakery', in: { wheat: 2, carrot: 2, egg: 2 }, t: 480, xp: 6, lv: 10 }, creamcake: { b: 'bakery', in: { wheat: 2, milk: 2, strawberry: 2, sugar: 1 }, t: 720, xp: 8, lv: 13 },
  cheese: { b: 'dairy', in: { milk: 2 }, t: 150, xp: 3 }, butter: { b: 'dairy', in: { milk: 3 }, t: 300, xp: 4, lv: 6 },
  sugar: { b: 'sugarmill', in: { sugarcane: 2 }, t: 180, xp: 3 }, popcorn: { b: 'sugarmill', in: { corn: 2, sugar: 1 }, t: 240, xp: 4, lv: 9 },
  fabric: { b: 'textile', in: { cotton: 2 }, t: 300, xp: 4 }, sweater: { b: 'textile', in: { wool: 2 }, t: 480, xp: 6 },
  jam: { b: 'jamkitchen', in: { strawberry: 3, sugar: 1 }, t: 360, xp: 5 }, bluejam: { b: 'jamkitchen', in: { blueberry: 2, sugar: 1 }, t: 600, xp: 8, lv: 25 },
  icecream: { b: 'icecreamshop', in: { milk: 1, sugar: 1, strawberry: 1 }, t: 300, xp: 5 }, sundae: { b: 'icecreamshop', in: { milk: 2, sugar: 1, cookies: 1 }, t: 600, xp: 9, lv: 18 },
  pumpkinsoup: { b: 'soupkitchen', in: { pumpkin: 1, milk: 1 }, t: 420, xp: 6 }, stew: { b: 'soupkitchen', in: { cabbage: 2, carrot: 2, potato: 1 }, t: 540, xp: 7, lv: 17 }, onionsoup: { b: 'soupkitchen', in: { onion: 2, cheese: 1 }, t: 600, xp: 8, lv: 19 },
  candy: { b: 'candyshop', in: { sugar: 2, strawberry: 1 }, t: 300, xp: 5 }, lollipop: { b: 'candyshop', in: { sugar: 3, grape: 1 }, t: 480, xp: 7, lv: 21 },
  dress: { b: 'tailor', in: { fabric: 2, wool: 1 }, t: 900, xp: 11 }, hat: { b: 'tailor', in: { wheat: 6, fabric: 1 }, t: 600, xp: 8 },
  pizza: { b: 'pizzeria', in: { wheat: 3, tomatosauce: 1, cheese: 1 }, t: 600, xp: 9 }, tomatosauce: { b: 'pizzeria', in: { tomato: 3 }, t: 300, xp: 4 }, fries: { b: 'pizzeria', in: { potato: 2, butter: 1 }, t: 360, xp: 5, lv: 17 }, bakedpotato: { b: 'pizzeria', in: { potato: 2, cheese: 1 }, t: 420, xp: 6, lv: 18 },
  applejuice: { b: 'juicebar', in: { apple: 3 }, t: 420, xp: 6 }, grapejuice: { b: 'juicebar', in: { grape: 3 }, t: 420, xp: 6 }, muffin: { b: 'bakery', in: { wheat: 2, blueberry: 2, egg: 1 }, t: 600, xp: 9, lv: 25 }, applepie: { b: 'bakery', in: { wheat: 2, apple: 2, sugar: 1 }, t: 660, xp: 10, lv: 23 },
  ironbar: { b: 'forge', in: { ironore: 3 }, t: 420, xp: 6 }, goldbar: { b: 'forge', in: { goldore: 3 }, t: 600, xp: 9 }, pickaxe: { b: 'forge', in: { ironbar: 1, wheat: 2 }, t: 300, xp: 4 }, dynamite: { b: 'forge', in: { ironbar: 1, sugarcane: 2 }, t: 360, xp: 5 },
};
// 건물: 종류 · 크기(칸) · 값 · 필요 레벨 · 필요 인구 · 주는 인구 / 인구 상한
export const BUILDS = {
  field: { n: '밭', k: 'field', sz: 1, cost: 5, lv: 1, img: 'soil', max: lv => 6 + lv * 2 },
  feedmill: { n: '사료 공장', k: 'factory', sz: 2, cost: 30, lv: 1, pop: 0, slots: 2 },
  cowbarn: { n: '젖소 우리', k: 'animal', sz: 2, cost: 50, lv: 2, pop: 10, animal: '젖소' },
  coop: { n: '닭장', k: 'animal', sz: 2, cost: 60, lv: 3, pop: 15, animal: '닭' },
  bakery: { n: '빵집', k: 'factory', sz: 2, cost: 120, lv: 4, pop: 25, slots: 2 },
  dairy: { n: '낙농 공방', k: 'factory', sz: 2, cost: 200, lv: 5, pop: 35, slots: 2 },
  sugarmill: { n: '설탕 공장', k: 'factory', sz: 2, cost: 320, lv: 7, pop: 50, slots: 2 },
  sheeppen: { n: '양 우리', k: 'animal', sz: 2, cost: 400, lv: 8, pop: 60, animal: '양' },
  jamkitchen: { n: '잼 공방', k: 'factory', sz: 2, cost: 600, lv: 10, pop: 80, slots: 2 },
  textile: { n: '직물 공장', k: 'factory', sz: 2, cost: 900, lv: 12, pop: 100, slots: 2 },
  icecreamshop: { n: '아이스크림 가게', k: 'factory', sz: 2, cost: 1200, lv: 13, pop: 120, slots: 2 },
  soupkitchen: { n: '수프 가게', k: 'factory', sz: 2, cost: 1500, lv: 14, pop: 140, slots: 2 },
  candyshop: { n: '사탕 가게', k: 'factory', sz: 2, cost: 1800, lv: 15, pop: 160, slots: 2 },
  tailor: { n: '양장점', k: 'factory', sz: 2, cost: 2200, lv: 16, pop: 180, slots: 2 },
  pizzeria: { n: '피자 가게', k: 'factory', sz: 2, cost: 2600, lv: 16, pop: 200, slots: 2 },
  forge: { n: '대장간', k: 'factory', sz: 2, cost: 2000, lv: 12, pop: 110, slots: 2 },
  juicebar: { n: '주스 가게', k: 'factory', sz: 2, cost: 3200, lv: 22, pop: 260, slots: 2 },
  mine: { n: '뒷산 광산', k: 'mine', sz: 2, cost: 1000, lv: 12, pop: 100 },
  wedding: { n: '결혼식장', k: 'wedding', sz: 2, cost: 3000, lv: 15, pop: 150 },
  cottage: { n: '오두막', k: 'house', sz: 2, cost: 40, lv: 1, give: 10 },
  manor: { n: '저택', k: 'house', sz: 2, cost: 900, lv: 14, give: 60 },
  house2: { n: '이층집', k: 'house', sz: 2, cost: 150, lv: 5, give: 25 },
  well: { n: '우물', k: 'public', sz: 2, cost: 60, lv: 2, cap: 30 },
  chapel: { n: '마을 성당', k: 'public', sz: 2, cost: 300, lv: 6, cap: 70 },
  townhall: { n: '마을 회관', k: 'public', sz: 2, cost: 800, lv: 10, cap: 140 },
  school: { n: '마을 학교', k: 'public', sz: 2, cost: 1600, lv: 15, cap: 220 },
  park: { n: '꽃 공원', k: 'public', sz: 2, cost: 2800, lv: 20, cap: 320 },
  // 장식: 1칸 · 개수 제한 없음 · 매력 점수(주민 행복 → 주문 코인 보너스)
  path: { n: '돌길', k: 'deco', sz: 1, cost: 2, lv: 2, joy: 0, img: 'path' }, flowerbed: { n: '튤립 화단', k: 'deco', sz: 1, cost: 20, lv: 3, joy: 2 }, bench: { n: '벤치', k: 'deco', sz: 1, cost: 30, lv: 4, joy: 2 },
  lamp: { n: '가로등', k: 'deco', sz: 1, cost: 40, lv: 5, joy: 2 }, oak: { n: '참나무', k: 'deco', sz: 1, cost: 25, lv: 3, joy: 2 }, fountain: { n: '분수', k: 'deco', sz: 1, cost: 300, lv: 9, joy: 8 },
  scarecrow: { n: '허수아비', k: 'deco', sz: 1, cost: 35, lv: 4, joy: 3 }, haybale: { n: '건초 더미', k: 'deco', sz: 1, cost: 20, lv: 2, joy: 1 }, fence: { n: '울타리', k: 'deco', sz: 1, cost: 8, lv: 2, joy: 1 },
  kingstatue: { n: '배추왕 동상', k: 'deco', sz: 1, cost: 800, lv: 12, joy: 15 }, gazebo: { n: '정자', k: 'deco', sz: 1, cost: 500, lv: 10, joy: 10 }, windmill: { n: '풍차', k: 'deco', sz: 1, cost: 400, lv: 8, joy: 8 },
};
export const BASE_CAP = 20;
// 레벨: 필요 경험치 · 레벨업 보상
export const XP_NEED = lv => Math.round(12 + lv * lv * 6);
export const MAX_LV = 30;
export const LV_REWARD = lv => ({ coins: 20 + lv * 10, gems: lv % 2 ? 2 : 4, tools: lv >= 3 ? 1 : 0 });
// 헛간 · 땅
export const BARN = { base: 60, step: 25, toolCost: lv => 2 + lv };
export const MAP = 20, ZONE = 5;    // 20×20 칸, 5×5 구역 16개 · 가운데 4개로 시작
export const START_ZONES = [5, 6, 9, 10];
export const ZONE_COST = n => ({ coins: 80 + n * 60, tools: 2 + n });

// 인물
export const CHARS = { princess: '라벤더 공주', hans: '한스', sam: '샘', ian: '이안', pachulo: '파출로', brook: '브룩', king: '배추왕' };
// 이야기 1장 · 퀘스트 (원작: 배추왕국 공주가 시골 농장을 맡음)
const L = (who, face, t) => ({ who, face, t });
export const QUESTS = [
  { id: 'q1', n: '밀 수확하기', goal: { harvest: 6 }, reward: { coins: 20, xp: 5 }, talk: [L('라벤더 공주', 'princess', '여기가 제가 맡게 된 농장이에요? 밭이… 밀로 가득해요!'), L('한스', 'hans', '공주님, 다 익은 밀은 눌러서 거두면 돼요. 하나 심으면 두 개가 나와요.')] },
  { id: 'q2', n: '사료 공장 짓기', goal: { build: 'feedmill' }, reward: { coins: 30, xp: 8 }, talk: [L('샘', 'sam', '밀이랑 옥수수로 사료를 만들면 동물을 키울 수 있어요! 건설에서 사료 공장을 골라 봐요.')] },
  { id: 'q3', n: '오두막 짓기', goal: { build: 'cottage' }, reward: { coins: 20, xp: 6 }, talk: [L('라벤더 공주', 'princess', '마을에 사람이 늘어야 큰 건물을 지을 수 있대요. 집부터 지어 볼까요?')] },
  { id: 'q4', n: '주문 게시판 주문 2개', goal: { order: 2 }, reward: { coins: 40, xp: 10, tools: 2 }, talk: [L('브룩', 'brook', '어머, 새 농장 주인이 공주님이라고? 게시판에 마을 사람들 주문이 있으니 들어줘요~')] },
  { id: 'q5', n: '젖소 우리 짓기', goal: { build: 'cowbarn' }, reward: { coins: 40, xp: 10 }, talk: [L('한스', 'hans', '젖소가 있으면 우유를 얻을 수 있어요. 제가 우리를 지어 드릴게요.')] },
  { id: 'q6', n: '우유 3병 얻기', goal: { make: { milk: 3 } }, reward: { coins: 50, xp: 12 }, talk: [L('라벤더 공주', 'princess', '젖소에게 사료를 주면 우유가 나온대요. 처음 짜 보는 우유라니!')] },
  { id: 'q7', n: '기차 한 번 보내기', goal: { train: 1 }, reward: { coins: 60, xp: 15, tools: 2 }, talk: [L('배추왕', 'king', '라벤더야, 농장 물건을 기차로 성에 보내 다오. 왕국 사람들이 기다리고 있단다.'), L('라벤더 공주', 'princess', '아버지…! 꼭 제 힘으로 해낼게요.')] },
  { id: 'q8', n: '빵집 짓기', goal: { build: 'bakery' }, reward: { coins: 60, xp: 15 }, talk: [L('이안', 'ian', '공주님, 기사단도 빵이 필요합니다. 빵집이 생기면 제가 단골이 되겠습니다.')] },
  { id: 'q9', n: '빵 5개 굽기', goal: { make: { bread: 5 } }, reward: { coins: 70, xp: 18 }, talk: [L('라벤더 공주', 'princess', '갓 구운 빵 냄새… 마을이 조금씩 살아나는 것 같아요!')] },
  { id: 'q10', n: '닭장 짓기', goal: { build: 'coop' }, reward: { coins: 60, xp: 15 }, talk: [L('샘', 'sam', '달걀이 있어야 쿠키랑 파이를 만들죠! 닭은 제가 잘 돌볼게요.')] },
  { id: 'q11', n: '땅 넓히기', goal: { zone: 1 }, reward: { coins: 100, xp: 20, gems: 5 }, talk: [L('파출로', 'pachulo', '흠흠, 농장을 넓히고 싶으면 숲을 정리해야지. 공구가 필요할 거요. 월세도 잊지 마시고!')] },
  { id: 'q12', n: '이달의 월세 내기', goal: { rent: 1 }, reward: { coins: 80, xp: 25, gems: 5 }, talk: [L('파출로', 'pachulo', '공주님이라도 월세는 월세요! 이번 달 목표 금액을 채워 주시오.'), L('라벤더 공주', 'princess', '걱정 마세요. 농장 주인답게 낼게요!')] },
  { id: 'q13', n: '낙농 공방 짓기', goal: { build: 'dairy' }, reward: { coins: 100, xp: 25 }, talk: [L('브룩', 'brook', '치즈랑 버터는 성 사람들이 제일 좋아하는 거예요~ 비싸게 쳐줄게요!')] },
  { id: 'q14', n: '레벨 8 달성', goal: { level: 8 }, reward: { coins: 150, xp: 0, gems: 10 }, talk: [L('라벤더 공주', 'princess', '처음 왔을 땐 밀밭뿐이었는데, 이제 진짜 마을이 됐어요!'), L('한스', 'hans', '…공주님 덕분이에요. 다음엔 수확 축제를 열어요.')] },
  // ── 2장 「수확 축제와 세 사람」
  { id: 'q15', n: '장식 5개 놓기', goal: { deco: 5 }, reward: { coins: 120, xp: 25 }, talk: [L('브룩', 'brook', '수확 축제엔 마을이 예뻐야지! 화단이랑 벤치로 꾸며 봐요~ 사람들이 기분 좋으면 돈도 잘 쓴다니까!')] },
  { id: 'q16', n: '미니게임 한 번', goal: { mini: 1 }, reward: { coins: 100, xp: 20, gems: 5 }, talk: [L('샘', 'sam', '공주님! 참새 떼가 또 밭에 내려앉았어요! 같이 쫓아 줘요!')] },
  { id: 'q17', n: '선물 3번 주기', goal: { gift: 3 }, reward: { coins: 150, xp: 30 }, talk: [L('라벤더 공주', 'princess', '한스, 샘, 이안… 다들 날 많이 도와줬지. 좋아하는 걸 선물해 볼까?')] },
  { id: 'q18', n: '레벨 12 달성', goal: { level: 12 }, reward: { coins: 200, xp: 0, gems: 10 }, talk: [L('파출로', 'pachulo', '흠, 공주님 마을이 커지니 뒷산 광산 얘기를 안 할 수 없군. 철과 금이 묻혀 있다오.')] },
  { id: 'q19', n: '광산 짓기', goal: { build: 'mine' }, reward: { coins: 200, xp: 40, items: { pickaxe: 5 } }, talk: [L('이안', 'ian', '광산은 위험합니다. 곡괭이로 하나씩 깨세요. 대장간에서 곡괭이를 만들 수 있습니다.')] },
  { id: 'q20', n: '철광석 5개 캐기', goal: { make: { ironore: 5 } }, reward: { coins: 200, xp: 40 }, talk: [L('라벤더 공주', 'princess', '반짝이는 돌 속에 철이 있어! 대장간에 가져가면 철 막대가 돼.')] },
  { id: 'q21', n: '수확 축제 준비 — 아이스크림 가게', goal: { build: 'icecreamshop' }, reward: { coins: 250, xp: 50 }, talk: [L('배추왕', 'king', '라벤더야, 수확 축제에 왕국 사람들이 온단다. 시원한 아이스크림이 있으면 좋겠구나.')] },
  { id: 'q22', n: '하트 5개 모으기', goal: { hearts: 5 }, reward: { gems: 20, xp: 50 }, talk: [L('라벤더 공주', 'princess', '이상하게 그 사람 생각만 하면 가슴이 두근거려…')] },
  { id: 'q23', n: '결혼식장 짓기', goal: { build: 'wedding' }, reward: { coins: 300, xp: 60 }, talk: [L('브룩', 'brook', '어머머, 공주님 얼굴이 빨개! 결혼식장부터 지어야겠네~')] },
  { id: 'q24', n: '결혼하기', goal: { married: 1 }, reward: { gems: 50, xp: 100 }, talk: [L('배추왕', 'king', '내 딸이 고른 사람이라면 믿는다. 행복하거라, 라벤더.')] },
];
// 결혼 (원작 더팜3: 호감도 미션 → 결혼) — 선물(제품)로 호감도, 하트 5개면 프러포즈 → 결혼식장에서 결혼
export const SUITORS = {
  hans: { n: '한스', job: '목수', likes: ['bread', 'pie', 'applepie', 'cheese'], gift: { tools: 3 }, perk: '건설비 10% 할인', line: ['공주님 덕분에 마을이 살아났어요.', '…이 망치로 공주님의 집을 평생 지어 드리고 싶어요.'] },
  sam: { n: '샘', job: '일꾼', likes: ['milk', 'icecream', 'candy', 'fries'], gift: { gems: 5 }, perk: '작물 자라는 시간 10% 단축', line: ['참새 쫓는 건 자신 있어요! 공주님 밭은 제가 지킬게요.', '저랑… 평생 같이 밭을 갈아요!'] },
  ian: { n: '이안', job: '기사', likes: ['sweater', 'dress', 'pizza', 'goldbar'], gift: { coins: 200 }, perk: '주문 코인 10% 증가', line: ['기사로서가 아니라, 한 사람으로서 공주님을 지키고 싶습니다.', '라벤더, 저와 결혼해 주시겠습니까?'] },
};
export const HEARTS = 5, HEART_PTS = 100;
// 광산: 6×8 바위 · 곡괭이 1 = 1칸 · 다이너마이트 = 3×3
export const MINE = { cols: 6, rows: 8, rocks: [['rock', 0.55], ['rock_iron', 0.22], ['rock_gold', 0.1], ['rock_gem', 0.05], ['chest', 0.03], ['dirt', 0.05]] };
// 미니게임 (원작: 한스의 댐 수리 · 샘의 참새 쫓기 · 이안의 불량배 쫓기)
export const MINIS = { dam: { n: '댐 수리', who: 'hans', d: '물이 새는 곳을 빨리 눌러 막아요!' }, sparrow: { n: '참새 쫓기', who: 'sam', d: '밭에 내려앉는 참새를 눌러 쫓아요!' }, bully: { n: '불량배 쫓기', who: 'ian', d: '숨어 있다 튀어나오는 불량배를 잡아요!' } };
export const RENT = { goal: w => 150 + w * 80, reward: { gems: 8, tools: 2 } };   // 이달(게임 속 한 주)의 월세 목표
