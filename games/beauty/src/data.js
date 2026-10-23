// 게임 데이터 — 재료 계열 · 생산기 · 레벨 · 주문 손님 · 매장 자리 · 1장 이야기
// 원작(Gossip Harbor) 구조: 계열별 단계 머지 · 생산기(에너지) · 무료/임시 생산기 · 주문 · 코인=이야기·수리 · 레벨업=에너지 가득

export const CHAINS = {
  camellia: { n: '동백', color: 0xE8505B, items: ['동백 잎', '동백 꽃봉오리', '동백꽃', '동백 꽃다발', '동백 오일', '동백 세럼', '동백 크림', '동백 선물 세트'] },
  rice: { n: '쌀', color: 0xF2E6CF, items: ['쌀알', '쌀밥 한 그릇', '쌀뜨물', '쌀 폼클렌저', '쌀 토너', '진주 크림', '쌀 스킨케어 듀오', '진주 쌀 컬렉션'] },
  ginseng: { n: '인삼', color: 0xE0B055, items: ['인삼 새싹', '인삼 뿌리', '인삼 묶음', '인삼 진액', '골드 앰플', '인삼 에센스', '인삼 골드 크림', '인삼 명품 세트'] },
  tea: { n: '녹차', color: 0x7CC67A, items: ['찻씨', '찻잎', '찻잎 다발', '말차 한 잔', '녹차 마스크팩', '녹차 토너', '녹차 클레이 팩', '녹차 스파 바구니'] },
};
export const MAX_LV = 8;
export const itemKey = (c, l) => `${c}${l}`;
export const itemName = (c, l) => CHAINS[c].items[l - 1];

// 생산기: 누르면 에너지 1 · 충전 횟수 다 쓰면 시간 지나 다시 · 같은 생산기끼리 합치면 2단계
export const GENS = {
  camellia: { n: '동백 바구니', chain: 'camellia', cost: 1, charges: [0, 40, 60], recharge: 180, drops: [[0], [0.86, 0.14], [0.6, 0.34, 0.06]] },
  rice: { n: '쌀독', chain: 'rice', cost: 1, charges: [0, 40, 60], recharge: 180, drops: [[0], [0.86, 0.14], [0.6, 0.34, 0.06]] },
  ginseng: { n: '약재 서랍', chain: 'ginseng', cost: 1, charges: [0, 36, 55], recharge: 200, drops: [[0], [0.88, 0.12], [0.62, 0.32, 0.06]], rare: 0.1 },
  tea: { n: '찻잎 바구니', chain: 'tea', cost: 1, charges: [0, 40, 60], recharge: 180, drops: [[0], [0.86, 0.14], [0.6, 0.34, 0.06]] },
  dew: { n: '이슬 항아리', free: true, charges: [0, 6], recharge: 300 },        // 무료: 에너지 없이 아무 계열 1~2단계
  gift: { n: '선물 상자', temp: true, uses: 5 },                                   // 임시: 2~3단계, 5번 쓰면 사라짐
};
export const genImg = (g, l) => g === 'dew' ? 'gen_dew' : g === 'gift' ? 'gen_gift' : `gen_${g}${l}`;

// 레벨: 필요 경험치 · 레벨업 보상
export const LEVELS = [0, 15, 40, 80, 130, 190, 260, 340, 430, 530, 640, 760, 890, 1030, 1180, 1340];
export const levelReward = lv => ({ gems: 3 + Math.floor(lv / 2), coins: 10 + lv * 5, gift: lv % 3 === 0 });

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
  s10: { bg: 'room', lines: [S('smile', '설화당, 다시 문을 엽니다! 와 주셔서 감사해요!'), D('shy', '…축하해요. 오늘 정말 예뻐요. 아니, 가게가요.'), R('angry', '이번엔 운이 좋았네요. 하지만 할머니 노트, 마지막 장이 없죠?'), S('shock', '…마지막 장이 찢겨 있어. 할머니는 거기에 뭘 적으셨던 걸까?'), { who: '', face: null, t: '1장 완료 · 2장 「찢겨 나간 마지막 장」 곧 공개' }] },
};
