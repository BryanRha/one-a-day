// 오늘의 운세: 내 사주(만세력 엔진 saju.min.js) × 오늘의 일진 → 분야별 점수 · 풀이 · 행운 아이템
//   계산(8글자)은 엔진이 정확히 하고, 풀이는 명리학 규칙(십성 · 합충 · 도화 · 오행 균형) 기반 문장
//   엔진 원본: ~/004. SN/001. saju/src/lib/saju (테스트 25개) → oneaday/tools/fortune_entry.ts 로 묶음
import { calculateSaju, tenGod, isClash, isCombine, isPeachBlossom, STEM_ELEMENT, BRANCH_ELEMENT, ELEMENT_KO, BRANCH_MAIN_STEM } from './saju.min.js';

const KEY = 'oad_fortune_me';
export const loadMe = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
export const saveMe = me => localStorage.setItem(KEY, JSON.stringify(me));
export const clearMe = () => localStorage.removeItem(KEY);

// 결정적 난수 (같은 날 · 같은 사람 = 같은 운세)
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, seed) => arr[seed % arr.length];

// 십성별 오늘의 기운: 분야 가감 [총운, 금전, 연애, 일·공부, 건강] · 한 줄 · 분야별 문장
const TG = {
  비견: { d: [4, -2, 0, 4, 3], key: '나다움', line: ['내 뜻대로 밀고 나가기 좋은 날이에요.', '혼자 해도 충분히 잘 해내는 날이에요.', '자신감이 차오르는 하루예요.'],
    money: '지출이 새기 쉬우니 함께 쓰는 돈은 미리 정해 두세요.', love: '친구 같은 편안한 인연이 가까이 있어요.', work: '맡은 일을 끝까지 해내는 힘이 있어요.' },
  겁재: { d: [-2, -6, 2, 2, 0], key: '경쟁', line: ['경쟁심이 올라오는 날, 서두르지만 않으면 이겨요.', '사람이 많을수록 내 몫을 잘 챙겨야 해요.', '욕심을 조금 덜면 오히려 많이 얻어요.'],
    money: '충동구매·빌려주는 돈은 오늘만은 참으세요.', love: '질투가 생길 수 있으니 말 한마디를 부드럽게.', work: '라이벌이 자극이 돼서 실력이 올라가요.' },
  식신: { d: [8, 3, 5, 3, 6], key: '여유', line: ['먹고 즐기는 복이 있는 편안한 날이에요.', '마음이 넉넉해지고 웃을 일이 생겨요.', '좋아하는 걸 하면 운이 따라오는 날이에요.'],
    money: '작은 즐거움에 쓰는 돈이 오히려 기운을 살려요.', love: '맛있는 걸 함께 먹으면 사이가 깊어져요.', work: '아이디어가 술술 나오는 날이에요.' },
  상관: { d: [2, 2, 6, -3, -1], key: '표현', line: ['말솜씨가 빛나지만 말실수도 조심해야 하는 날.', '튀는 매력이 사람들 눈에 띄어요.', '하고 싶은 말은 부드럽게 한 번 걸러서!'],
    money: '부업·재능으로 들어오는 돈 기운이 있어요.', love: '매력 지수 상승, 먼저 연락해 보세요.', work: '윗사람과 의견 충돌을 조심하세요.' },
  편재: { d: [5, 8, 4, 2, 0], key: '기회', line: ['뜻밖의 기회가 굴러오는 날이에요.', '움직일수록 돈과 사람이 따라와요.', '발이 넓어지는 하루, 약속을 잡아 보세요.'],
    money: '생각지 못한 수입이나 할인 운이 있어요.', love: '새로운 만남의 기운이 강해요.', work: '큰 그림을 그리기 좋은 날이에요.' },
  정재: { d: [5, 7, 2, 4, 2], key: '안정', line: ['차곡차곡 쌓이는 안정적인 날이에요.', '성실함이 보답받는 하루예요.', '계획한 대로 착착 흘러가요.'],
    money: '저축·정리하기 좋은 날, 가계부를 써 보세요.', love: '믿음직한 모습이 상대 마음을 움직여요.', work: '꼼꼼함이 인정받아요.' },
  편관: { d: [-3, -1, 1, 5, -4], key: '도전', line: ['부담이 크지만 이겨 내면 한 단계 올라가요.', '압박 속에서 진짜 실력이 드러나는 날.', '무리하지 말고 하나씩 처리하세요.'],
    money: '급하게 나갈 돈이 생길 수 있어요.', love: '강하게 끌리는 사람이 나타날 수 있어요.', work: '어려운 일을 맡지만 해내면 크게 인정받아요.' },
  정관: { d: [6, 2, 4, 7, 1], key: '인정', line: ['반듯한 모습이 인정받는 날이에요.', '규칙을 지키면 좋은 결과가 와요.', '주변의 신뢰를 얻는 하루예요.'],
    money: '정해진 수입이 든든하게 들어와요.', love: '진지한 인연, 소개팅 운이 좋아요.', work: '승진·합격처럼 공식적인 좋은 소식 기운.' },
  편인: { d: [1, -1, -2, 4, 2], key: '생각', line: ['혼자만의 시간이 답을 주는 날이에요.', '직감이 날카로워지는 하루예요.', '새로운 걸 배우면 머리에 쏙쏙 들어와요.'],
    money: '큰 결정은 하루 미뤄도 괜찮아요.', love: '생각이 많아질 수 있으니 솔직하게 물어보세요.', work: '연구·기획처럼 깊이 파는 일에 좋아요.' },
  정인: { d: [7, 1, 3, 5, 5], key: '도움', line: ['누군가의 도움이 들어오는 따뜻한 날이에요.', '마음이 편안해지고 컨디션이 좋아요.', '배움과 문서에 좋은 기운이 있어요.'],
    money: '부모님·윗사람에게서 도움받을 운.', love: '다정한 말 한마디에 마음이 녹아요.', work: '자격증·시험 공부에 집중이 잘 돼요.' },
};
const COLORS = { wood: ['초록', '#4CB86A'], fire: ['빨강', '#E8503A'], earth: ['노랑', '#E8B04A'], metal: ['흰색', '#E8E8F0'], water: ['남색', '#3A5AB8'] };
const NUMS = { wood: [3, 8], fire: [2, 7], earth: [5, 10], metal: [4, 9], water: [1, 6] };
const DIRS = { wood: '동쪽', fire: '남쪽', earth: '가운데', metal: '서쪽', water: '북쪽' };
const FEEDS = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };

export function myChart(me) {
  return calculateSaju({ year: me.y, month: me.m, day: me.d, hour: me.h ?? undefined, minute: me.mi ?? 0, calendar: me.cal || 'solar', isLeapMonth: !!me.leap, longitude: me.lon || undefined });
}
export function todayPillar(date) { return calculateSaju({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), calendar: 'solar' }).day; }

export function fortune(me, date) {
  const S = myChart(me), T = todayPillar(date), dm = S.dayMaster.stem, key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}|${me.name}|${me.y}${me.m}${me.d}`;
  const g1 = tenGod(dm, T.stem), g2 = tenGod(dm, BRANCH_MAIN_STEM[T.branch]);   /* 오늘 천간·지지를 '내 일간' 기준 십성으로 */ const a = TG[g1], b = TG[g2];
  const sc = [70, 70, 70, 70, 70]; for (let i = 0; i < 5; i++) sc[i] += a.d[i] * 2 + b.d[i];
  const notes = [];
  if (isCombine(T.branch, S.day.branch)) { sc[0] += 6; sc[2] += 9; notes.push('오늘의 기운이 내 일지와 합(合)을 이뤄 사람과 잘 어울려요.'); }
  if (isClash(T.branch, S.day.branch)) { sc[0] -= 8; sc[4] -= 5; sc[2] -= 4; notes.push('일지와 충(沖)이 들어 변화가 많은 날 — 이동·약속 시간에 여유를 두세요.'); }
  if (isClash(T.branch, S.year.branch)) { sc[3] -= 3; notes.push('바깥일이 갑자기 바뀔 수 있어요.'); }
  if (isPeachBlossom(T.branch)) { sc[2] += 5; notes.push('도화(桃花)의 날, 매력이 눈에 띄어요.'); }
  // 오행 균형: 내 사주에 부족한 오행을 오늘이 채워 주면 +
  const cnt = S.elementCount, weak = Object.keys(cnt).sort((x, y) => cnt[x] - cnt[y] || (x === FEEDS[S.dayMaster.element] ? -1 : 1))[0];
  if (STEM_ELEMENT[T.stem] === weak || BRANCH_ELEMENT[T.branch] === weak) { sc[0] += 6; sc[4] += 4; notes.push(`내 사주에 적은 ${ELEMENT_KO[weak]}(${weak === 'wood' ? '木' : weak === 'fire' ? '火' : weak === 'earth' ? '土' : weak === 'metal' ? '金' : '水'}) 기운이 들어오는 날이에요.`); }
  const r = hash(key); for (let i = 0; i < 5; i++) sc[i] = Math.max(35, Math.min(99, sc[i] + ((r >> (i * 3)) & 7) - 3));
  const total = Math.round(sc[0] * 0.4 + (sc[1] + sc[2] + sc[3] + sc[4]) * 0.15);
  const lucky = weak; const [cName, cHex] = COLORS[lucky];
  return {
    chart: S, today: T, tenGod: [g1, g2], key: a.key, total, scores: { 총운: sc[0], 금전: sc[1], 연애: sc[2], '일·공부': sc[3], 건강: sc[4] },
    line: pick(a.line, r), notes, money: a.money, love: sc[2] >= 78 ? b.love : a.love, work: a.work,
    color: { name: cName, hex: cHex }, numbers: NUMS[lucky], dir: DIRS[lucky], weak, seed: r,
  };
}
export const ELEMENT_NAME = ELEMENT_KO;
