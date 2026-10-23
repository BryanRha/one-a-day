// 냥카페 데이터 — 방 그림(1024x1536) 좌표 기준
// 자리: x,y = 놓이는 점(바닥 물건은 아래 가운데, hang/wall 은 가운데), w = 그릴 너비, d = 겹침 순서(클수록 앞), lv = 열리는 카페 레벨, cost = 별
export const ROOM = { key: 'cafe_room', w: 1024, h: 1536 };
export const THEMES = ['벚꽃', '세이지', '크림 우드'];
export const SLOTS = [
  { id: 'flowers', n: '꽃집 진열대', x: 130, y: 960, w: 250, d: 4, lv: 1, cost: 1, why: '꽃집 옆 카페답게' },
  { id: 'bench', n: '창가 쿠션', x: 490, y: 742, w: 620, d: 2, lv: 1, cost: 2, why: '햇살 좋은 창가 자리' },
  { id: 'rug', n: '바닥 러그', x: 520, y: 1180, w: 560, d: 3, flat: true, lv: 1, cost: 2, why: '뒹굴기 좋아하는 아이들을 위해' },
  { id: 'lamp', n: '펜던트 조명', x: 205, y: 300, w: 120, d: 1, hang: true, lv: 2, cost: 1, why: '저녁에도 포근하게' },
  { id: 'table', n: '카페 테이블', x: 330, y: 1150, w: 290, d: 6, lv: 2, cost: 2, why: '손님이 앉을 자리' },
  { id: 'catbed', n: '고양이 침대', x: 760, y: 1400, w: 250, d: 8, lv: 2, cost: 2, why: '낮잠 자는 곳' },
  { id: 'frames', n: '벽 액자', x: 190, y: 480, w: 170, d: 1, wall: true, lv: 3, cost: 1, why: '허전한 벽에' },
  { id: 'tower', n: '캣타워', x: 860, y: 1060, w: 250, d: 5, lv: 3, cost: 3, why: '높은 곳을 좋아하는 아이들' },
  { id: 'plant', n: '큰 화분', x: 120, y: 1400, w: 230, d: 7, lv: 3, cost: 2, why: '초록이 있으면 마음이 놓여요' },
  { id: 'shelf', n: '벽 선반', x: 790, y: 430, w: 200, d: 1, wall: true, lv: 4, cost: 2, why: '소품을 올려 둘 곳' },
  { id: 'dessert', n: '디저트 진열장', x: 930, y: 640, w: 180, d: 2, lv: 4, cost: 3, why: '카페의 얼굴' },
  { id: 'garland', n: '창문 꽃 장식', x: 512, y: 230, w: 380, d: 1, hang: true, lv: 5, cost: 2, why: '마지막 마무리' },
];
// 카페 레벨: 놓은 자리 수 0~2 → 1, 3~4 → 2, 5~7 → 3, 8~9 → 4, 10~ → 5
export const levelOf = n => n >= 10 ? 5 : n >= 8 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : 1;

// 손님 고양이가 머무는 자리 (그 가구가 있어야). pose: sit/sleep/play, w: 그릴 너비, z: 겹침
export const SPOTS = {
  bench: { x: 400, y: 712, pose: 'sleep', w: 170, z: 2.5 },
  rug: { x: 600, y: 1130, pose: 'play', w: 150, z: 3.5 },
  tower: { x: 862, y: 790, pose: 'sit', w: 92, z: 5.5 },
  catbed: { x: 760, y: 1340, pose: 'sleep', w: 170, z: 8.5 },
  table: { x: 470, y: 1180, pose: 'sit', w: 115, z: 6.5 },
  flowers: { x: 260, y: 985, pose: 'sit', w: 110, z: 4.5 },
  plant: { x: 270, y: 1440, pose: 'sit', w: 125, z: 7.5 },
};
// 자리가 겹치면 쓰는 빈 바닥
export const FLOOR = [{ x: 620, y: 1420, pose: 'play', w: 150, z: 7.6 }, { x: 980, y: 1250, pose: 'sit', w: 110, z: 5.6 }, { x: 330, y: 1300, pose: 'sleep', w: 160, z: 6.6 }];

// 고양이 24마리 — 그림 n{id}_{sit|sleep|play}.webp
// like: 좋아하는 가구(slot) · 디자인(theme 1~3, 없으면 아무거나) / ep: 그 화를 다 보면 오는 특별 손님
export const CATS = [
  { id: 1, n: '치즈', kind: '코리안 숏헤어 · 치즈 태비', t: '넉살 좋은 단골. 처음 보는 손님한테도 먼저 다가가요.', like: { slot: 'rug' } },
  { id: 2, n: '하양이', kind: '터키시 앙고라 믹스', t: '새침한 아가씨. 분홍 리본이 자랑이에요.', like: { slot: 'bench' } },
  { id: 3, n: '깜이', kind: '봄베이', t: '말수는 적지만 높은 곳에서 모두를 지켜봐요.', like: { slot: 'tower' } },
  { id: 4, n: '삼색이', kind: '삼색 고양이', t: '꽃 냄새를 좋아해서 꽃통 옆을 떠나지 않아요.', like: { slot: 'flowers' } },
  { id: 5, n: '고등어', kind: '고등어 태비', t: '잠꾸러기. 어디서든 30초 만에 잠들어요.', like: { slot: 'catbed' } },
  { id: 6, n: '블루', kind: '러시안 블루', t: '조용한 신사. 손님 무릎을 고르는 안목이 있어요.', like: { slot: 'table' } },
  { id: 7, n: '라떼', kind: '샴', t: '수다쟁이. 대답해 줄 때까지 계속 말을 걸어요.', like: { slot: 'plant' } },
  { id: 8, n: '양말이', kind: '턱시도', t: '흰 양말을 신은 장난꾸러기.', like: { slot: 'rug' } },
  { id: 9, n: '콩떡', kind: '스코티시 폴드', t: '동그란 얼굴로 빤히 쳐다보면 아무도 못 이겨요.', like: { slot: 'bench' } },
  { id: 10, n: '호떡', kind: '먼치킨', t: '짧은 다리로 열심히 뛰어다녀요.', like: { slot: 'catbed' } },
  { id: 11, n: '구름', kind: '페르시안', t: '느긋한 공주님. 빗질해 주면 골골송을 불러요.', like: { slot: 'bench' } },
  { id: 12, n: '모래', kind: '아비시니안', t: '호기심 대장. 새 가구가 오면 제일 먼저 올라가요.', like: { slot: 'tower' } },
  { id: 13, n: '대장', kind: '메인쿤', t: '카페에서 제일 큰 덩치. 마음은 제일 여려요.', like: { slot: 'tower', theme: 3 }, rare: true },
  { id: 14, n: '솜사탕', kind: '랙돌', t: '안기면 인형처럼 축 늘어져요.', like: { slot: 'bench', theme: 1 }, rare: true },
  { id: 15, n: '점박이', kind: '벵갈', t: '정글에서 온 듯한 무늬. 초록 잎 사이를 좋아해요.', like: { slot: 'plant', theme: 2 }, rare: true },
  { id: 16, n: '숲', kind: '노르웨이 숲', t: '바람 소리를 좋아하는 시인 같은 고양이.', like: { slot: 'rug', theme: 2 }, rare: true },
  { id: 17, n: '루나', kind: '터키시 앙고라 · 오드아이', t: '한쪽은 바다, 한쪽은 달빛. 보기 드문 손님.', like: { slot: 'catbed', theme: 1 }, rare: true },
  { id: 18, n: '복숭아', kind: '스핑크스', t: '추위를 많이 타서 늘 니트를 입고 와요.', like: { slot: 'table', theme: 1 }, rare: true },
  { id: 19, n: '만두', kind: '브리티시 숏헤어', t: '통통한 볼살이 매력. 간식 시간을 정확히 알아요.', like: { slot: 'catbed', theme: 3 }, rare: true },
  { id: 20, n: '부장님', kind: '엑조틱 숏헤어', t: '늘 언짢은 표정이지만 사실 기분 최고예요.', like: { slot: 'table', theme: 3 }, rare: true },
  { id: 21, n: '신사', kind: '특별 손님 · 도현의 고양이', t: '나비넥타이를 맨 점잖은 고양이. 도현 씨를 닮았대요.', ep: 'ep10', special: true },
  { id: 22, n: '진주', kind: '특별 손님 · 지아의 고양이', t: '진주 목걸이를 한 도도한 고양이. 사실 정이 많아요.', ep: 'ep8', special: true },
  { id: 23, n: '특종', kind: '특별 손님 · 하나의 고양이', t: '데님 손수건을 두른 기자 고양이. 소식이 제일 빨라요.', ep: 'ep7', special: true },
  { id: 24, n: '옥이', kind: '특별 손님 · 어머니의 고양이', t: '옥 장식을 단 우아한 고양이. 기품이 넘쳐요.', ep: 'ep5', special: true },
];
export const POSES = ['sit', 'sleep', 'play'];
export const likeText = c => c.ep ? '이야기를 보면 찾아와요' : `${SLOTS.find(s => s.id === c.like.slot).n}${c.like.theme ? ` (${THEMES[c.like.theme - 1]})` : ''}을(를) 좋아해요`;

// 숨은 고양이 찾기: 고양이를 숨길 자리 — slot 이 있으면 그 가구가 놓였을 때만, z 로 앞 가구에 살짝 가려짐
export const HIDE = [
  { x: 150, y: 905, w: 80, z: 3.9, pose: 'sit', slot: 'flowers' },
  { x: 160, y: 1330, w: 85, z: 6.9, pose: 'sit', slot: 'plant' },
  { x: 300, y: 1085, w: 90, z: 5.9, pose: 'sleep', slot: 'table' },
  { x: 770, y: 1335, w: 120, z: 8.5, pose: 'sleep', slot: 'catbed' },
  { x: 905, y: 905, w: 62, z: 5.5, pose: 'sit', slot: 'tower' },
  { x: 795, y: 395, w: 58, z: 1.5, pose: 'sleep', slot: 'shelf' },
  { x: 950, y: 520, w: 58, z: 2.5, pose: 'sit', slot: 'dessert' },
  { x: 290, y: 685, w: 110, z: 2.5, pose: 'sleep', slot: 'bench' },
  { x: 700, y: 1150, w: 95, z: 3.5, pose: 'play', slot: 'rug' },
  { x: 60, y: 870, w: 66, z: 0.5, pose: 'sit' },
  { x: 680, y: 690, w: 80, z: 1.9, pose: 'sit' },
  { x: 960, y: 1480, w: 95, z: 8.9, pose: 'play' },
  { x: 480, y: 1470, w: 100, z: 8.9, pose: 'sleep' },
  { x: 560, y: 900, w: 80, z: 2.9, pose: 'sit' },
];

// 이야기 인물이 다녀간 흔적 (그 화를 본 뒤부터)
export const PEOPLE = [
  { face: 'c_hana', who: '하나', ep: 'ep1', t: ['사장님 어디 갔어? 라떼 두고 간다~', '여기 고양이들 기사로 써도 돼? 반응 터질 듯', '치즈가 내 가방에 들어가서 안 나와 ㅋㅋ'] },
  { face: 'c_dohyun_smile', who: '도현', ep: 'ep4', t: ['꽃 사러 왔다가 고양이만 보고 가요. 내일 또 올게.', '하양이가 무릎에서 안 내려와서 회의에 늦을 뻔했어.', '서윤아, 카페 정말 예쁘다.'] },
  { face: 'c_jia_smile', who: '지아', ep: 'ep8', t: ['…생각보다 아늑하네요. 커피 맛있었어요.', '진주가 여기 오고 싶다고 보채서요.', '창가 자리, 제 단골석으로 해도 돼요?'] },
  { face: 'c_seojin_smile', who: '서진', ep: 'ep14', t: ['지아 씨가 여기 커피가 제일 맛있대서요.', '고양이가 서류 위에서 안 비켜 줘요… 일 못 하겠네요.', '창가 쿠션, 지아 씨 자리로 맡아 둘게요.'] },
  { face: 'c_father', who: '지아 아버지', ep: 'ep19', t: ['우리 지아가 이 카페 얘기를 많이 하더구나.', '고양이들이 참 순하네. 지아 어릴 때 같아.', '꽃향기가 좋구먼. 12년 만에 맡는 봄 냄새야.'] },
  { face: 'c_mother', who: '어머니', ep: 'ep9', t: ['꽃 냄새가 참 좋구나. 우리 며느리 솜씨가 좋아.', '옥이가 여기만 오면 얌전해져요.', '다음엔 도현이 아버지도 모시고 올게요.'] },
];
