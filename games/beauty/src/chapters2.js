// 4장 「명동 플래그십」 · 5장 「제주 원료 농장」 · 6장 「글로벌 런칭」 — 매장 자리 · 할 일 · 이야기
const S = (face, t) => ({ who: '소윤', face: `c_soyun_${face}`, t });
const G = t => ({ who: '할머니', face: 'c_grandma', t });
const D = (face, t) => ({ who: '도윤', face: `c_doyun_${face}`, t });
const R = (face, t) => ({ who: '세라', face: `c_sera_${face}`, t });
const P = (face, t) => ({ who: '핑크리', face: `c_pinky_${face}`, t });
const N = (face, t) => ({ who: '하늘', face: `c_haneul_${face}`, t });
const J = (face, t) => ({ who: '지호', face: `c_jiho_${face}`, t });
const X = (who, face, t) => ({ who, face, t });
const END = t => ({ who: '', face: null, t });

export const SPOTS4 = [
  { id: 'crystal', n: '샹들리에', x: 512, y: 190, w: 260, d: 0, hang: true },
  { id: 'sign', n: '브랜드 간판', x: 200, y: 330, w: 230, d: 1, hang: true },
  { id: 'testbar', n: '테스트 바', x: 512, y: 900, w: 420, d: 2 },
  { id: 'wall', n: '진열 벽', x: 150, y: 970, w: 250, d: 3 },
  { id: 'makeup', n: '메이크업 존', x: 870, y: 990, w: 290, d: 4 },
  { id: 'pyramid', n: '제품 탑 테이블', x: 512, y: 1230, w: 300, d: 5 },
  { id: 'cashier', n: '계산대', x: 200, y: 1420, w: 320, d: 6 },
  { id: 'lounge', n: '라운지 소파', x: 820, y: 1460, w: 360, d: 7 },
];
export const SPOTS5 = [
  { id: 'hareubang', n: '돌하르방', x: 512, y: 830, w: 170, d: 1 },
  { id: 'stoneshed', n: '돌창고', x: 180, y: 870, w: 300, d: 2 },
  { id: 'orangery', n: '귤 온실', x: 850, y: 890, w: 280, d: 3 },
  { id: 'well', n: '돌 우물', x: 200, y: 1160, w: 240, d: 4 },
  { id: 'washer', n: '원료 세척대', x: 830, y: 1180, w: 280, d: 5 },
  { id: 'picnic', n: '피크닉 테이블', x: 512, y: 1310, w: 340, d: 6 },
  { id: 'cart', n: '귤 수레', x: 180, y: 1490, w: 300, d: 7 },
  { id: 'hammock', n: '해먹', x: 830, y: 1500, w: 340, d: 8 },
];
export const SPOTS6 = [
  { id: 'goldlamp', n: '크리스털 조명', x: 512, y: 160, w: 240, d: 0, hang: true },
  { id: 'photowall', n: '포토 월', x: 170, y: 950, w: 260, d: 1 },
  { id: 'booth', n: '팝업 부스', x: 850, y: 970, w: 320, d: 2 },
  { id: 'runway', n: '런웨이', x: 512, y: 1080, w: 380, d: 3 },
  { id: 'tower', n: '제품 타워', x: 160, y: 1270, w: 190, d: 4 },
  { id: 'press', n: '기자 데스크', x: 860, y: 1270, w: 300, d: 5 },
  { id: 'teabar', n: '티 바', x: 300, y: 1500, w: 360, d: 6 },
  { id: 'velvet', n: '벨벳 소파', x: 800, y: 1510, w: 340, d: 7 },
];

const mk = (list, base, step) => list.map((t, i) => ({ ...t, cost: t.cost === 0 ? 0 : Math.round((base + i * step) / 10) * 10 }));
export const TASKS4 = mk([
  { story: 's35', cost: 0, n: '박람회 대성공', unlock: 'snail' }, { repair: 'testbar', n: '테스트 바 놓기' }, { story: 's36', n: '도윤의 고백' }, { repair: 'wall', n: '진열 벽 세우기' },
  { story: 's37', n: '텅 빈 매장' }, { repair: 'crystal', n: '샹들리에 달기' }, { story: 's38', n: '달팽이 연구원' }, { repair: 'cashier', n: '계산대 놓기' },
  { story: 's39', n: '할머니의 벌통', unlock: 'propolis' }, { repair: 'makeup', n: '메이크업 존 꾸미기' }, { story: 's40', n: '루나 그룹' }, { repair: 'sign', n: '브랜드 간판 걸기' },
  { story: 's41', n: '오픈 준비' }, { repair: 'pyramid', n: '제품 탑 쌓기' }, { story: 's42', n: '가짜와 진짜' }, { repair: 'lounge', n: '라운지 소파 들이기' },
  { story: 's43', n: '세라의 결심' }, { story: 's44', n: '오픈 전야' }, { story: 's45', n: '그랜드 오픈' }, { story: 's46', cost: 0, n: '할머니의 편지' },
], 300, 7);
export const TASKS5 = mk([
  { story: 's47', cost: 0, n: '제주 도착', unlock: 'volcanic' }, { repair: 'stoneshed', n: '돌창고 고치기' }, { story: 's48', n: '돌담 아래' }, { repair: 'well', n: '돌 우물 살리기' },
  { story: 's49', n: '해녀 이모' }, { repair: 'hareubang', n: '돌하르방 닦기' }, { story: 's50', n: '할머니의 젊은 날' }, { repair: 'washer', n: '원료 세척대 만들기' },
  { story: 's51', n: '바다의 선물', unlock: 'seaweed' }, { repair: 'orangery', n: '귤 온실 세우기' }, { story: 's52', n: '태풍' }, { repair: 'picnic', n: '피크닉 테이블 놓기' },
  { story: 's53', n: '태풍이 지나고' }, { repair: 'cart', n: '귤 수레 꾸미기' }, { story: 's54', n: '지호의 휴가' }, { repair: 'hammock', n: '해먹 걸기' },
  { story: 's55', n: '세라와 바다' }, { story: 's56', n: '첫 수확' }, { story: 's57', n: '첫 밭의 크림' }, { story: 's58', cost: 0, n: '파리에서 온 편지' },
], 340, 8);
export const TASKS6 = mk([
  { story: 's59', cost: 0, n: '파리 도착' }, { repair: 'booth', n: '팝업 부스 세우기' }, { story: 's60', n: '프랑스 바이어' }, { repair: 'photowall', n: '포토 월 꾸미기' },
  { story: 's61', n: '언어의 벽' }, { repair: 'goldlamp', n: '크리스털 조명 달기' }, { story: 's62', n: '하늘의 꽃' }, { repair: 'tower', n: '제품 타워 쌓기' },
  { story: 's63', n: '런웨이' }, { repair: 'runway', n: '런웨이 만들기' }, { story: 's64', n: '루나의 반격' }, { repair: 'press', n: '기자 데스크 놓기' },
  { story: 's65', n: '기자 회견' }, { repair: 'teabar', n: '티 바 열기' }, { story: 's66', n: '세라의 진심' }, { repair: 'velvet', n: '벨벳 소파 들이기' },
  { story: 's67', n: '동백 반지' }, { story: 's68', n: '할머니의 마지막 편지' }, { story: 's69', n: '글로벌 런칭' }, { story: 's70', cost: 0, n: '설화의 봄' },
], 380, 9);

const U = (n, f) => t => X(n, f, t);
const JIMIN = U('연구원 지민', 'u1'), EMILY = U('여행객 에밀리', 'u6'), GRAN = U('동네 할머니', 'u4'), HAENYEO = U('해녀 순자 이모', 'u7'), MAYA = U('바이어 마야', 'u8'), PRESS = U('파리 기자', 'u10');
export const STORY456 = {
  // ── 4장 명동 플래그십
  s35: { bg: 'bg_alley', lines: [P('wow', '박람회 1등! 설화 크림 품절이에요!'), S('shock', '주문이 만 개가 넘었어… 골목 가게로는 감당이 안 돼.'), R('smug', '그래서 내가 왔죠. 명동에 빈 매장이 하나 있어요.'), S('smile', '세라 씨… 같이 하자는 거예요?'), R('smug', '동업이에요. 착각하지 마요.')] },
  s36: { bg: 'room2', lines: [D('shy', '박람회 끝나면 하려던 말… 지금 할게요.'), D('smile', '좋아해요, 소윤 씨. 설화당 문을 다시 열던 날부터요.'), S('smile', '…저도요. 동백 세럼을 제일 먼저 드린 이유요.'), N('smile', '(덤불 뒤에서) 오빠 드디어!!')] },
  s37: { bg: 'room4', lines: [S('shock', '명동 한복판… 유리창 너머로 사람들이 쏟아져.'), J('calm', '공사는 제가 맡겠습니다. 대표님께 허락받았습니다.'), S('fight', '할머니, 설화당이 명동까지 왔어요.')] },
  s38: { bg: 'room4', lines: [JIMIN('설화당 팬이에요! 저 사실 달팽이 점액 연구원이에요.'), S('shock', '달팽이요?'), JIMIN('상처 회복엔 이만한 게 없어요. 같이 만들어 봐요!'), S('smile', '설화당 스네일 라인, 시작해 볼까요?')] },
  s39: { bg: 'bg_farm', lines: [D('smile', '농장 뒷산에 할머니가 맡겨 두신 벌통이 있어요.'), G('꿀은 마음을 달래고, 프로폴리스는 피부를 지킨단다.'), S('smile', '할머니는 정말 모르는 게 없으셨구나.')] },
  s40: { bg: 'bg_office', lines: [R('angry', '큰일이에요. 루나 그룹이 설화 크림을 그대로 베낀 제품을 냈어요.'), J('calm', '이름은 「설하 크림」. 포장까지 비슷합니다.'), S('shock', '이건… 할머니 레시피를 흉내 낸 거야.'), R('smug', '법보다 빠른 건 실력이죠. 진짜를 보여 줘요.')] },
  s41: { bg: 'room4', lines: [N('smile', '명동 매장에도 꽃이 필요하죠! 제가 맡을게요.'), P('wink', '오픈 라이브는 제가! 해외 팬들도 기다려요~'), S('smile', '다들 고마워요. 우리 진짜 팀이 됐네.')] },
  s42: { bg: 'room4', lines: [EMILY('Is this the real Seolhwa? The other one made my skin red!'), S('shock', '루나 크림을 쓰고 피부가 뒤집혔대…'), S('fight', '무료로 진정 케어 해 드릴게요. 진짜는 사람을 지켜요.')] },
  s43: { bg: 'bg_office', lines: [R('angry', '루나 회장… 제가 예전에 일하던 곳이에요.'), R('smug', '그 사람 약점, 제가 다 알아요. 이번엔 제가 막을게요.'), J('guilty', '대표님, 무리하지 마세요.'), R('smug', '백 비서, 걱정해 주는 거예요? 별일이네.')] },
  s44: { bg: 'room4', lines: [S('smile', '내일이면 명동 설화당이 문을 열어.'), D('smile', '긴장돼요? 손 잡아 줄게요.'), S('smile', '…응. 이제 좀 괜찮아.')] },
  s45: { bg: 'room4', lines: [P('wow', '오픈 한 시간 만에 줄이 명동역까지!'), R('smug', '루나 그룹이 리콜을 발표했어요. 성분 표시가 거짓이었대요.'), S('fight', '진짜는 결국 알아봐 주는구나.')] },
  s46: { bg: 'room4', lines: [GRAN('소윤아, 네 할머니가 남긴 편지가 하나 더 있단다.'), G('제주에 가 보렴. 우리 설화당의 첫 밭이 거기 있단다.'), S('shock', '제주…? 할머니의 첫 밭?'), END('4장 완료 · 5장 「제주 원료 농장」이 열렸어요')] },
  // ── 5장 제주 원료 농장
  s47: { bg: 'room5', lines: [S('smile', '바람이 다르다… 이게 제주구나.'), D('smile', '할머니 첫 밭은 저 돌담 안쪽이래요. 화산송이 땅이요.'), G('검은 돌은 숨을 쉰단다. 피부도 숨을 쉬어야지.'), S('fight', '화산송이 라인, 여기서 시작이다!')] },
  s48: { bg: 'room5', lines: [N('worry', '밭이 다 망가졌어요… 몇 년은 비어 있었나 봐요.'), S('fight', '다시 일구면 돼. 정원도 그렇게 살렸잖아.'), N('smile', '그쵸! 저는 귤나무 손볼게요!')] },
  s49: { bg: 'room5', lines: [HAENYEO('네가 설화 할망 손녀구나. 많이 닮았네.'), S('shock', '저희 할머니를 아세요?'), HAENYEO('그럼. 같이 물질하던 사이였지. 바다 해초로 크림을 만들던 분이야.')] },
  s50: { bg: 'room5', lines: [HAENYEO('설화 할망은 원래 해녀였어. 서울로 간 건 사랑 때문이었지.'), S('shock', '할머니가… 해녀였다고요?'), G('바다는 다 주지 않는단다. 필요한 만큼만 받으렴.')] },
  s51: { bg: 'room5', lines: [HAENYEO('자, 오늘 딴 해초다. 할망 레시피대로 써 보렴.'), S('smile', '바다 미네랄 라인! 이모, 같이 만들어요.'), HAENYEO('허허, 이 나이에 화장품 동업이라니.')] },
  s52: { bg: 'room5', lines: [N('worry', '태풍이 온대요! 비닐하우스가 위험해요!'), D('smile', '밧줄 가져와요. 다 같이 묶으면 돼요.'), S('fight', '할머니 밭, 이번엔 지킬 거야.')] },
  s53: { bg: 'room5', lines: [S('shock', '다 쓰러졌는데… 돌담 안 귤나무만 멀쩡해.'), HAENYEO('제주 돌담은 바람을 막지 않고 흘려보낸단다. 그래서 안 무너져.'), S('smile', '막지 말고 흘려보내기… 할머니가 하고 싶던 말이었나 봐.')] },
  s54: { bg: 'room5', lines: [J('calm', '휴가를 냈습니다. …도우러 왔습니다.'), R('smug', '나도 왔어요. 동업자니까.'), S('smile', '다들… 정말 고마워요.')] },
  s55: { bg: 'room5', lines: [R('angry', '선생님이 해녀였다니. 나한텐 한 번도 말 안 해 주셨어.'), S('smile', '세라 씨한테도 보여 주고 싶으셨을 거예요. 그래서 우리가 여기 온 거고요.'), R('smug', '…흥. 바다 냄새, 나쁘지 않네요.')] },
  s56: { bg: 'room5', lines: [N('smile', '귤 첫 수확이에요! 해초도 화산송이도 가득!'), S('fight', '제주 원료로 만든 첫 설화 크림, 시작!')] },
  s57: { bg: 'room5', lines: [HAENYEO('이 냄새… 설화 할망이 만들던 그 크림이다.'), S('smile', '이모, 첫 병은 이모 거예요.'), HAENYEO('고맙다, 아가.')] },
  s58: { bg: 'room5', lines: [P('wow', '언니! 파리 뷰티 위크에서 초대장이 왔어요! 팝업 스토어를 열어 달래요!'), S('shock', '파리…? 설화당이 파리에?'), R('smug', '글로벌 런칭이네요. 이번엔 내가 통역 담당이에요.'), END('5장 완료 · 6장 「글로벌 런칭」이 열렸어요')] },
  // ── 6장 글로벌 런칭
  s59: { bg: 'room6', lines: [S('shock', '에펠탑이 창밖에… 꿈 같아.'), P('wink', '팝업 장소 대박이죠? 제 팬이 소개해 줬어요~'), S('fight', '할머니, 설화당이 세계로 가요.')] },
  s60: { bg: 'room6', lines: [MAYA('Your story is beautiful. But Paris is tough.'), R('smug', '걱정 마요. 이 언니가 다 통역해 줄게.'), S('smile', '진짜 이야기는 어디서든 통할 거예요.')] },
  s61: { bg: 'room6', lines: [S('shock', '설명서가 전부 한국어야! 내일 오픈인데!'), J('calm', '밤새 번역하겠습니다. 프랑스어, 조금 합니다.'), R('smug', '백 비서, 그런 재주가 있었어요?')] },
  s62: { bg: 'room6', lines: [N('smile', '파리 꽃시장에서 동백을 찾았어요! 팝업에 설화당 꽃길을 만들게요!'), S('smile', '하늘 씨 덕분에 여기도 설화당 같아.')] },
  s63: { bg: 'room6', lines: [P('wow', '뷰티 위크 런웨이에 설화 메이크업이 올라가요!'), S('shock', '모델들이 우리 크림을…?'), R('smug', '말했잖아요. 실력이 제일 빠르다고.')] },
  s64: { bg: 'bg_office', lines: [R('angry', '루나 회장이 파리에 왔대요. 우리 팝업 바로 옆에 매장을 냈어요.'), S('fight', '또야? 이번엔 피하지 않을 거예요.'), J('calm', '기자 회견을 여는 건 어떨까요. 진짜 이야기를요.')] },
  s65: { bg: 'room6', lines: [S('smile', '설화당은 할머니의 동백 한 송이에서 시작했어요.'), S('fight', '베낄 수 있는 건 성분이지, 마음은 아니에요.'), PRESS('Bravo! Magnifique!')] },
  s66: { bg: 'room6', lines: [R('angry', '기자들 앞에서 그런 말… 반칙이에요. 눈물 날 뻔했잖아요.'), R('smug', '고마워요, 소윤 씨. 선생님 이야기를 끝까지 지켜 줘서.'), S('smile', '세라 씨도 설화당 사람이에요.')] },
  s67: { bg: 'room6', lines: [D('shy', '에펠탑 앞에서… 이거 받아 줄래요? 동백 모양 반지예요.'), S('shock', '도윤 씨…!'), S('smile', '…네. 좋아요.'), N('smile', '꺄아아! 우리 오빠 장가간다!!')] },
  s68: { bg: 'room6', lines: [G('소윤아, 이 편지를 읽는다면 넌 멀리까지 왔겠구나.'), G('설화당은 가게가 아니라 마음이란다. 네가 가는 곳마다 설화당이야.'), S('smile', '할머니… 고마워요.')] },
  s69: { bg: 'room6', lines: [P('wow', '전 세계 주문 10만 개! 설화당 글로벌 1위예요!'), R('smug', '루나 그룹은 철수했대요. 깔끔하네요.'), J('calm', '다음 목적지는 뉴욕입니다, 사장님.')] },
  s70: { bg: 'room', lines: [S('smile', '다시 서울, 할머니 가게. 처음 이곳에 섰던 날이 생각나.'), D('smile', '이제 우리 가게네요.'), S('fight', '설화당의 이야기는 계속돼요!'), END('6장 완료 · 다음 이야기를 준비하고 있어요')] },
};
// 균형 (110일 봇: 5장 35일 · 6장 50일 걸려 너무 느림 → 줄임. 목표 6장까지 약 3개월)
for (const [list, k] of [[TASKS5, 0.75], [TASKS6, 0.6]]) for (const t of list) t.cost = Math.round(t.cost * k / 10) * 10;
