import { SPOTS2, SPOTS3, TASKS2, TASKS3, STORY23 } from './chapters.js?v=0.57.4';
import { SPOTS4, SPOTS5, SPOTS6, TASKS4, TASKS5, TASKS6, STORY456 } from './chapters2.js?v=0.57.4';
// 게임 데이터 — 재료 계열 · 생산기 · 레벨 · 주문 손님 · 매장 자리 · 1장 이야기
// 원작(Gossip Harbor) 구조: 계열별 단계 머지 · 생산기(에너지) · 무료/임시 생산기 · 주문 · 코인=이야기·수리 · 레벨업=에너지 가득

export const CHAINS = {
  camellia: { n: '동백', color: 0xE8505B, items: ['동백 잎', '동백 꽃봉오리', '동백꽃', '동백 꽃다발', '동백 오일', '동백 세럼', '동백 크림', '동백 선물 세트', '동백 스파 트레이', '설화당 동백 시그니처'] },
  rice: { n: '쌀', color: 0xF2E6CF, items: ['쌀알', '쌀밥 한 그릇', '쌀뜨물', '쌀 폼클렌저', '쌀 토너', '진주 크림', '쌀 스킨케어 듀오', '진주 쌀 컬렉션', '진주 화장대 세트', '설화당 진주 시그니처'] },
  ginseng: { n: '인삼', color: 0xE0B055, items: ['인삼 새싹', '인삼 뿌리', '인삼 묶음', '인삼 진액', '골드 앰플', '인삼 에센스', '인삼 골드 크림', '인삼 명품 세트', '궁중 약재함', '설화당 인삼 시그니처'] },
  mugwort: { n: '쑥', color: 0x8FAE84, items: ['쑥 잎', '쑥 한 줌', '쑥 다발', '말린 쑥', '쑥 찜질 주머니', '쑥 에센스', '쑥 진정 크림', '쑥 힐링 키트', '쑥 스파 바구니', '설화당 쑥 시그니처'] },
  heartleaf: { n: '어성초', color: 0x4FB8A0, items: ['어성초 새싹', '하트 잎', '어성초 다발', '어성초 즙', '어성초 토너', '어성초 진정 패드', '어성초 앰플', '어성초 클렌징 오일', '트러블 케어 세트', '설화당 어성초 시그니처'] },
  cica: { n: '병풀', color: 0x6CCB8A, items: ['병풀 잎', '병풀 포기', '병풀 화분', '병풀 추출액', '시카 크림', '시카 밤', '시카 세럼', '시카 마스크팩', '시카 리페어 키트', '설화당 시카 시그니처'] },
  yuja: { n: '유자', color: 0xF2C230, items: ['유자꽃', '풋유자', '유자', '유자 바구니', '유자청', '유자 비타 토너', '유자 브라이트닝 세럼', '유자 수면팩', '유자 비타 선물 세트', '설화당 유자 시그니처'] },
  snail: { n: '달팽이', color: 0xB9A6E0, items: ['꼬마 달팽이', '달팽이 친구들', '이끼 위 달팽이', '달팽이 점액', '스네일 에센스', '스네일 크림', '스네일 앰플', '스네일 마스크팩', '스네일 리페어 세트', '설화당 스네일 시그니처'] },
  propolis: { n: '프로폴리스', color: 0xE8A93A, items: ['꿀벌', '벌집 조각', '꿀단지', '프로폴리스 원액', '허니 토너', '프로폴리스 앰플', '허니 크림', '허니 립밤 세트', '꿀벌 정원 바구니', '설화당 허니 시그니처'] },
  volcanic: { n: '화산송이', color: 0x4A4A50, items: ['화산석 조각', '화산송이 한 줌', '현무암 돌', '화산 클레이 가루', '화산송이 클렌징폼', '화산 클레이 마스크', '블랙 필링젤', '모공 케어 세트', '한라산 스파 세트', '설화당 화산 시그니처'] },
  seaweed: { n: '해초', color: 0x3E9CC8, items: ['미역 줄기', '다시마', '해초 다발', '해초 추출액', '바다 미네랄 토너', '해초 젤 크림', '바다 미스트', '해초 시트팩 세트', '제주 바다 스파 바구니', '설화당 바다 시그니처'] },
  tea: { n: '녹차', color: 0x7CC67A, items: ['찻씨', '찻잎', '찻잎 다발', '말차 한 잔', '녹차 마스크팩', '녹차 토너', '녹차 클레이 팩', '녹차 스파 바구니', '녹차 다실 세트', '설화당 녹차 시그니처'] },
};
export const MAX_LV = 10;
export const itemKey = (c, l) => `${c}${l}`;
export const itemName = (c, l) => CHAINS[c].items[l - 1];

// 생산기: 누르면 에너지 1 · 충전 횟수 다 쓰면 시간 지나 다시 · 같은 생산기끼리 합치면 2단계
// 생산기 단계별 나오는 재료 단계 확률 (1단계, 2단계, 3단계, 4단계) — 원작처럼 높은 생산기일수록 높은 재료
const DROPS = [[0], [0.86, 0.14], [0.6, 0.34, 0.06], [0.42, 0.4, 0.15, 0.03], [0.28, 0.42, 0.22, 0.08], [0.18, 0.38, 0.3, 0.14]];
export const GEN_MAX = 5;
export const genName = (g, l) => GENS[g].names ? GENS[g].names[l] : GENS[g].n;
export const GENS = {
  camellia: { n: '동백', names: ['', '동백 바구니', '동백 꽃수레', '동백 화단', '동백 온실', '황금 동백 정원'], chain: 'camellia', cost: 1, drops: DROPS },
  rice: { n: '쌀', names: ['', '쌀독', '꽃 장식 쌀독', '쌀 궤짝', '물레방아', '황금 곳간'], chain: 'rice', cost: 1, drops: DROPS },
  ginseng: { n: '인삼', names: ['', '약재 서랍', '약재 장', '약재 궤', '약방 계산대', '궁중 약장'], chain: 'ginseng', cost: 1, drops: DROPS, rare: 0.1 },
  tea: { n: '녹차', names: ['', '찻잎 바구니', '찻잎 받침대', '찻잎 채반', '덖음 가마솥', '황금 다실'], chain: 'tea', cost: 1, drops: DROPS },
  mugwort: { n: '쑥', names: ['', '쑥 소쿠리', '쑥 수레', '쑥 건조대', '쑥 찜질 가마', '황금 쑥 정자'], chain: 'mugwort', cost: 1, drops: DROPS },
  heartleaf: { n: '어성초', names: ['', '어성초 화분', '어성초 화단', '어성초 물통', '어성초 연못', '황금 하트 분수'], chain: 'heartleaf', cost: 1, drops: DROPS },
  cica: { n: '병풀', names: ['', '병풀 화분', '병풀 유리 돔', '병풀 재배대', '병풀 추출기', '황금 식물 연구소'], chain: 'cica', cost: 1, drops: DROPS, rare: 0.08 },
  yuja: { n: '유자', names: ['', '유자 묘목', '유자 바구니', '유자나무 화분', '큰 유자나무', '황금 유자 정자'], chain: 'yuja', cost: 1, drops: DROPS },
  snail: { n: '달팽이', names: ['', '이끼 화분', '달팽이 테라리움', '달팽이 정원 상자', '달팽이 온실', '황금 달팽이 정원'], chain: 'snail', cost: 1, drops: DROPS },
  propolis: { n: '프로폴리스', names: ['', '작은 벌통', '꽃 벌통', '양봉 상자 탑', '꿀벌 정원', '황금 벌집 정자'], chain: 'propolis', cost: 1, drops: DROPS },
  volcanic: { n: '화산송이', names: ['', '화산석 바구니', '돌 수레', '현무암 돌담', '화산석 동굴', '황금 한라산'], chain: 'volcanic', cost: 1, drops: DROPS },
  seaweed: { n: '해초', names: ['', '해초 바구니', '해녀 망사리', '해초 건조대', '해녀 불턱', '황금 바다 정자'], chain: 'seaweed', cost: 1, drops: DROPS },
  dew: { n: '이슬 항아리', free: true, charges: [0, 6], recharge: 300 },        // 무료: 에너지 없이 아무 계열 1~2단계
  gift: { n: '선물 상자', temp: true, uses: 5 },                                   // 임시: 2~3단계, 5번 쓰면 사라짐
};
// 특별 물건 (원작의 에너지·코인·보석 아이템 · 도구 · 상자): 재화는 같은 것끼리 합치면 커지고 누르면 받음
export const SPECIAL = {
  en1: { n: '에너지 약병', chain: 'en', l: 1, give: { energy: 3 } }, en2: { n: '에너지 물약', chain: 'en', l: 2, give: { energy: 10 } }, en3: { n: '에너지 크리스털 병', chain: 'en', l: 3, give: { energy: 25 } },
  co1: { n: '코인 더미', chain: 'co', l: 1, give: { coins: 5 } }, co2: { n: '코인 주머니', chain: 'co', l: 2, give: { coins: 15 } }, co3: { n: '코인 상자', chain: 'co', l: 3, give: { coins: 40 } },
  ge1: { n: '보석 한 알', chain: 'ge', l: 1, give: { gems: 1 } }, ge2: { n: '보석 세 알', chain: 'ge', l: 2, give: { gems: 3 } }, ge3: { n: '보석함', chain: 'ge', l: 3, give: { gems: 8 } },
  scissors: { n: '황금 가위', tool: true, help: '물건 위에 끌어 놓으면 한 단계 낮은 물건 두 개로 나눠요' },
  ribbon: { n: '만능 리본', tool: true, help: '물건 위에 끌어 놓으면 바로 한 단계 올라가요' },
  hourglass: { n: '모래시계', help: '누르면 기다리는 손님이 바로 오고 이슬 항아리가 다시 차요' },
  pickbox: { n: '고르기 상자', help: '누르면 재료 세 가지 중 하나를 골라 가져요' },
  chest: { n: '화장품 보물 상자', help: '누르면 재료 · 재화 · 도구가 쏟아져 나와요' },
};
export const specialNext = k => { const s = SPECIAL[k]; return s && s.chain && s.l < 3 ? `${s.chain}${s.l + 1}` : null; };
export const genImg = (g, l) => g === 'dew' ? 'gen_dew' : g === 'gift' ? 'gen_gift' : `gen_${g}${l}`;

// 레벨: 필요 경험치 · 레벨업 보상
export const LEVELS = [0, 15, 40, 80, 130, 190, 260, 340, 430, 530, 640, 760, 890, 1030, 1180, 1340];
export const levelReward = lv => {
  const r = { gems: 3 + Math.floor(lv / 2), coins: 10 + lv * 5, gift: lv % 3 === 0, items: [], pack: lv % 10 === 0 ? 'diamond' : lv % 5 === 0 ? 'gold' : 'basic' };   // 레벨업마다 카드 팩
  if (lv % 2 === 0) r.items.push({ t: 'g', gl: lv < 10 ? 1 : lv < 20 ? 2 : 3 });   // 짝수 레벨: 생산기 하나 (같은 것끼리 합쳐 업그레이드)
  if (lv % 4 === 0) r.items.push({ t: 's', k: 'scissors' });
  if (lv % 5 === 0) r.items.push({ t: 's', k: 'ribbon' });
  if (lv % 3 === 1 && lv > 1) r.items.push({ t: 's', k: 'pickbox' });
  if (lv % 6 === 0) r.items.push({ t: 's', k: 'chest' });
  return r;
};

// 에너지
export const ENERGY = { max: 100, regenSec: 120, gemPack: { gems: 10, amount: 50 } };
export const STORAGE = { base: 4, max: 10, cost: n => 15 + n * 10 };

// 주문 손님 (10명) · 대사
export const CUSTOMERS = [
  { face: 'u1', n: '회사원 지민', say: ['야근 때문에 피부가 엉망이에요…', '내일 중요한 발표가 있어요!'] },
  { face: 'u2', n: '예비 신부 수아', say: ['결혼식이 한 달 남았어요!', '웨딩 촬영 전에 꼭 필요해요'] },
  { face: 'u3', n: '여고생 하린', say: ['용돈 모아서 왔어요 헤헤', '친구들이 여기 추천했어요!'] },
  { face: 'u4', n: '동네 할머니', say: ['네 할머니 단골이었단다', '옛날 그 맛 그대로 부탁해'] },
  { face: 'u5', n: '대학생 준호', say: ['여자친구 선물 사러 왔어요', '남자도 피부 관리 해야죠!'] },
  { face: 'u6', n: '여행객 에밀리', say: ['K-뷰티 너무 좋아요!', 'Korean skincare, the best!'] },
  { face: 'u7', n: '워킹맘 은정', say: ['애 재우고 겨우 나왔어요', '저를 위한 작은 선물이에요'] },
  { face: 'u8', n: '모델 마야', say: ['촬영 전에 피부가 촉촉해야 해요', '친구가 인스타에서 봤대요'] },
  { face: 'u9', n: '연습생 태오', say: ['데뷔 무대가 다음 주예요!', '조명 아래서 빛나야 해요'] },
  { face: 'u10', n: '일본 손님 유이', say: ['서울 오면 꼭 오고 싶었어요', '언니 선물도 살 거예요'] },
];

// 매장 자리 (방 그림 1024x1536 기준) · 0번 = 낡은 상태, 1~3 = 디자인
export const ROOM = { w: 1024, h: 1536 };
export const DESIGNS = ['벚꽃 핑크', '민트 우드', '크림 마블'];
export const SPOTS = [
  { id: 'counter', n: '계산대', x: 640, y: 980, w: 400, d: 3 },
  { id: 'shelf', n: '진열장', x: 195, y: 900, w: 260, d: 2 },
  { id: 'lamp', n: '조명', x: 470, y: 250, w: 200, d: 1, hang: true },
  { id: 'table', n: '진열 테이블', x: 480, y: 1250, w: 320, d: 6 },
  { id: 'mirror', n: '거울 화장대', x: 840, y: 1080, w: 250, d: 4 },
  { id: 'plant', n: '화분', x: 175, y: 1420, w: 240, d: 7 },
  { id: 'rug', n: '러그', x: 500, y: 1340, w: 600, d: 5, flat: true },
  { id: 'bench', n: '손님 소파', x: 790, y: 1470, w: 340, d: 8 },
];

// 1장 「할머니의 레시피」 — 할 일 순서 (코인 · 이야기 장면 / 수리 자리 · 해금)
export const TASKS = [
  { story: 's1', cost: 0, n: '할머니의 가게' },
  { repair: 'counter', cost: 60, n: '계산대 고치기' },
  { story: 's2', cost: 50, n: '첫 손님' },
  { repair: 'shelf', cost: 100, n: '진열장 고치기' },
  { story: 's3', cost: 90, n: '레시피 노트' },
  { repair: 'lamp', cost: 120, n: '조명 달기' },
  { story: 's4', cost: 120, n: '수상한 방문자' },
  { repair: 'table', cost: 160, n: '진열 테이블 놓기' },
  { story: 's5', cost: 140, n: '동백 농장의 청년', unlock: 'ginseng' },
  { repair: 'mirror', cost: 200, n: '거울 화장대 놓기' },
  { story: 's6', cost: 180, n: '첫 제품, 동백 세럼' },
  { repair: 'plant', cost: 220, n: '화분 들이기' },
  { story: 's7', cost: 220, n: '인플루언서의 방문', unlock: 'tea' },
  { repair: 'rug', cost: 260, n: '러그 깔기' },
  { story: 's8', cost: 260, n: '가짜 리뷰' },
  { repair: 'bench', cost: 300, n: '손님 소파 놓기' },
  { story: 's9', cost: 300, n: '단골들의 목소리' },
  { story: 's10', cost: 0, n: '재개업 파티' },
];

const S = (face, t) => ({ who: '소윤', face: `c_soyun_${face}`, t });
const G = t => ({ who: '할머니', face: 'c_grandma', t });
const D = (face, t) => ({ who: '도윤', face: `c_doyun_${face}`, t });
const R = (face, t) => ({ who: '세라', face: `c_sera_${face}`, t });
const P = (face, t) => ({ who: '핑크리', face: `c_pinky_${face}`, t });
export const STORY = {
  s1: { bg: 'bg_alley', lines: [S('shock', '여기가… 할머니 가게 「설화당」. 먼지가 이렇게 쌓였을 줄이야.'), G('소윤아, 좋은 화장품은 좋은 마음에서 나온단다. — 할머니가 남긴 편지'), S('smile', '회사도 그만뒀겠다, 내가 다시 살려 볼게요. 할머니.'), S('fight', '우선 작업대부터 정리하자. 동백이랑 쌀은 아직 남아 있네!')] },
  s2: { bg: 'room', lines: [S('shock', '어? 문 열렸어요! 첫 손님이다!'), { who: '동네 할머니', face: 'u4', t: '아이고, 설화당이 다시 문을 여는구먼. 네 할머니 동백 크림을 30년 썼단다.' }, S('smile', '할머니 레시피 그대로 만들어 드릴게요!')] },
  s3: { bg: 'room', lines: [S('shock', '계산대 밑에서 낡은 노트가… 「설화당 비밀 레시피」?'), G('동백은 마음을 지키고, 쌀은 맑음을 지키고, 인삼은 힘을 지킨단다.'), S('smile', '할머니 글씨다… 이걸로 다시 시작할 수 있어.')] },
  s4: { bg: 'room', lines: [R('smug', '여기가 그 유명한 설화당? 생각보다 초라하네요.'), R('smug', '유세라, 「글로리 뷰티」 대표예요. 이 가게, 제가 살게요. 레시피까지 전부.'), S('fight', '죄송하지만 팔 생각 없어요. 할머니 가게니까요.'), R('angry', '…후회할 거예요.')] },
  s5: { bg: 'bg_farm', lines: [S('smile', '할머니 노트에 적힌 원료 농장… 여기구나.'), D('shy', '아, 설화당 손녀분이세요? 할머니께 동백이랑 인삼을 납품했어요.'), D('smile', '강도윤입니다. 할머니가 늘 손녀 자랑을 하셨거든요.'), S('shock', '저, 저를요…?'), D('smile', '앞으로 인삼도 보내 드릴게요. 할머니와의 약속이라서요.')] },
  s6: { bg: 'room', lines: [S('fight', '드디어 완성! 설화당 첫 제품, 「동백 세럼」!'), G('처음 만든 건 꼭 고마운 사람에게 선물하렴.'), S('smile', '도윤 씨한테 제일 먼저 드려야겠다.')] },
  s7: { bg: 'room', lines: [P('wow', '꺅! 여기 진짜 있었네! 「할머니 동백 세럼」 맞죠?!'), P('wink', '저 핑크리예요~ 구독자 80만! 리뷰해도 돼요?'), S('shock', '네? 네! 물론이죠!'), P('wow', '녹차 라인도 만들어 주세요! 제 팬들이 녹차 덕후거든요~')] },
  s8: { bg: 'bg_office', lines: [R('smug', '「설화당 세럼 쓰고 피부 뒤집어졌어요」… 리뷰 100개면 충분하겠죠.'), S('shock', '가게 리뷰가 하룻밤 새 별 하나로… 이게 무슨 일이야.'), D('smile', '소윤 씨, 같은 시간에 같은 말투로 올라왔어요. 누가 일부러 쓴 거예요.'), S('fight', '진짜 손님들 이야기를 들려줄 거예요.')] },
  s9: { bg: 'room', lines: [{ who: '동네 할머니', face: 'u4', t: '30년을 썼는데 무슨 소리야! 내가 증인이다!' }, P('wink', '제 라이브에서 직접 써 볼게요. 거짓말은 화면이 다 알아요~'), { who: '여행객 에밀리', face: 'u6', t: 'I came all the way from London for this!' }, S('smile', '다들… 고마워요.')] },
  s10: { bg: 'room', lines: [S('smile', '설화당, 다시 문을 엽니다! 와 주셔서 감사해요!'), D('shy', '…축하해요. 오늘 정말 예뻐요. 아니, 가게가요.'), R('angry', '이번엔 운이 좋았네요. 하지만 할머니 노트, 마지막 장이 없죠?'), S('shock', '…마지막 장이 찢겨 있어. 할머니는 거기에 뭘 적으셨던 걸까?'), { who: '', face: null, t: '1장 완료 · 2장 「골목 정원」이 열렸어요' }] },
};
Object.assign(STORY, STORY23, STORY456);

// 장(지역): 방 그림 · 고칠 자리 · 할 일 · 배경음 — 원작의 지역 확장처럼 장을 끝내면 다음 장이 열림
export const CHAPTERS = [
  { n: '할머니의 레시피', room: 'room', spots: SPOTS, tasks: TASKS, bgm: 'bgm_shop' },
  { n: '골목 정원', room: 'room2', spots: SPOTS2, tasks: TASKS2, bgm: 'bgm_garden' },
  { n: '2층 공방', room: 'room3', spots: SPOTS3, tasks: TASKS3, bgm: 'bgm_workshop' },
  { n: '명동 플래그십', room: 'room4', spots: SPOTS4, tasks: TASKS4, bgm: 'bgm_flagship' },
  { n: '제주 원료 농장', room: 'room5', spots: SPOTS5, tasks: TASKS5, bgm: 'bgm_jeju' },
  { n: '글로벌 런칭', room: 'room6', spots: SPOTS6, tasks: TASKS6, bgm: 'bgm_paris' },
];
export const ALL_SPOTS = CHAPTERS.flatMap(c => c.spots);
