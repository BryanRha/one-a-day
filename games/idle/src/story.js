// 컷씬 대본 — 장면(shot)마다: 그림 · 카메라(줌/이동) · 등장 인물 · 효과 · 대사
//   bg: 'cut_xxx'(컷씬 그림) 또는 'bg_xxx'(지역 배경) · cam: [시작 배율, 끝 배율, 시작 y(0~1), 끝 y] · who: 인물 id(원화) · side: 'l'|'r'
//   fx: 'flash' 번쩍 · 'shake' 흔들림 · 'embers' 불씨 · 'dark' 어둠 · 'dawn' 새벽빛 번짐 · 'red' 붉은 기운
import { HEROES, REGIONS } from './data.js?v=0.55.1';

export const CUTS = {
  prologue: { music: 'bgm_story', shots: [
    { bg: 'cut_cs_sun', cam: [1.25, 1.05, 0.25, 0.55], fx: 'dark', lines: [{ t: '백 년 전, 하늘에서 해가 사라졌다.' }, { t: '황혼의 왕 녹스가 해를 삼킨 그날부터,\n대륙 에오스는 끝나지 않는 밤에 잠겼다.' }] },
    { bg: 'cut_cs_nox', cam: [1.05, 1.22, 0.7, 0.3], fx: 'red', lines: [{ who: '녹스', t: '빛의 시대는 끝났다.' }, { who: '녹스', t: '여덟 사도여, 남은 여명석을 모두 봉인하라.\n이 땅에 다시는 아침이 오지 않도록.' }] },
    { bg: 'cut_cs_lantern', cam: [1.2, 1.0, 0.6, 0.45], fx: 'embers', lines: [{ t: '…그리고 지금. 무너진 여명기사단의 성채.' }, { t: '꺼진 줄 알았던 첫 등불이, 다시 타오르기 시작했다.' }] },
    { bg: 'cut_cs_lantern', cam: [1.0, 1.08, 0.45, 0.5], who: 'cloud', side: 'l', lines: [{ who: '카이', t: '등불이 켜졌어…? 이 빛을 따라왔더니,\n당신이 켠 거야?' }] },
    { bg: 'cut_cs_lantern', cam: [1.08, 1.12, 0.5, 0.5], who: 'kenneth', side: 'r', lines: [{ who: '엘리시아', t: '백 년 동안 이 성채를 지켜 온 보람이 있네요.\n등불을 켠 사람이 기사단의 새 단장이에요.' }, { who: '엘리시아', t: '단장님, 명령을. 울음바람 협곡에\n첫 번째 여명석이 잠들어 있습니다.' }] },
    { bg: 'cut_cs_lantern', cam: [1.12, 1.2, 0.5, 0.42], who: 'flora', side: 'l', fx: 'flash', lines: [{ who: '릴리안', t: '다치면 제가 고쳐 드릴게요.\n가요, 새벽을 데리러!' }] },
  ] },
};
// 사도 등장 · 해방 (지역마다)
const HERALD_LINES = [
  ['울음바람이 멎으면 너희 비명만 남겠지. 이 도끼창 앞에서!', '…바람 소리가 다시 들리는군. 내가 무슨 짓을. 이 창, 이제 너희를 위해 쓰겠다.'],
  ['쉿… 숲은 잠들어야 해. 영원히, 달콤하게.', '눈부셔… 숲이 깨어나는 소리, 얼마 만인지. 독은 이제 적에게만 쓸게.'],
  ['벨포트의 등대는 내가 껐다. 다시 켜려면 날 넘어야 할 것이다.', '진홍 깃은 원래 등대지기의 표식이었지. 다시 불을 지키겠다, 단장.'],
  ['차가워야 아프지 않아. 모두 얼려 줄게.', '따뜻해… 녹는 게 무섭지 않아. 너희와 함께라면.'],
  ['이 불길이 진짜 새벽이야. 타 버려, 전부!', '거짓 새벽이었어… 진짜 해는 이렇게 다정하구나.'],
  ['종은 울리지 않는다. 기도는 내 연회의 노래일 뿐.', '종소리… 이토록 맑았던가. 이 몸의 피, 이제 기사단을 위해 흘리지.'],
  ['……(침묵)', '말을 잃은 건 빛을 잃어서였다. 이제 다시 말하겠다. 함께 가자.'],
  ['녹스 님의 밤을 어지럽히는 등불이 너희였구나. 꺼 주마.', '여왕이었던 적은 없었어. 나도 새벽을 기다리던 아이였지. 녹스에게 데려가 줄게.'],
];
export function heraldCut(r, phase) {
  const R = REGIONS[r], id = R.herald, H = HEROES[id], [intro, free] = HERALD_LINES[r], bg = `bg_${R.bg[3]}`;
  if (phase === 'intro') return { music: 'bgm_boss', shots: [
    { bg, cam: [1.1, 1.3, 0.5, 0.45], fx: 'dark', lines: [{ t: `${R.n}의 끝. 봉인된 여명석 앞을\n사도가 지키고 있다.` }] },
    { bg, cam: [1.3, 1.4, 0.45, 0.4], who: id, side: 'r', fx: 'red', lines: [{ who: `사도 ${H.n}`, t: intro }] },
    { bg, cam: [1.4, 1.45, 0.4, 0.4], who: 'kenneth', side: 'l', lines: [{ who: '엘리시아', t: '저 기운… 원래는 이름 높은 영웅이었을 거예요.\n쓰러뜨리면 여명석이 깨어납니다!' }] },
  ] };
  return { music: 'bgm_story', shots: [
    { bg: 'cut_cs_dawn', cam: [1.3, 1.0, 0.25, 0.5], fx: 'dawn', lines: [{ t: `여명석이 깨어났다.\n${R.n}에 백 년 만의 새벽이 번진다.` }] },
    { bg: 'cut_cs_dawn', cam: [1.0, 1.1, 0.5, 0.55], who: id, side: 'r', fx: 'flash', lines: [{ who: H.n, t: free }] },
    { bg: 'cut_cs_dawn', cam: [1.1, 1.15, 0.55, 0.55], who: 'sharon', side: 'l', lines: [{ who: '카덴스', t: `노래로 남겨 둘게요. 「${H.t} ${H.n}, 새벽을 되찾다」!` }] },
  ] };
}
