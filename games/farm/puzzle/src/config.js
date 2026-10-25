// 화면·게임 공통 상수
// 화면 아래에 표시되는 버전 (배포할 때마다 올림)
export const VERSION = '1.0.0';
export const W = 1080;
export const BASE_H = 1920;
// 실제 세로 길이 (세로로 긴 폰에서는 1920 보다 커짐). ES 모듈 live binding 이라 import 한 곳에서도 갱신된 값이 보인다.
export let H = BASE_H;
export const setH = h => { H = Math.max(BASE_H, Math.round(h)); };
export const CELL = 112;
export const FONT = 'Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
export const INK = '#3E2A14';   // 더팜 짙은 나무색
export const COLOR_HEX = [0xFF4D6D, 0xFF9F1C, 0xFFD23F, 0x8CC63F, 0x3EC1F3, 0xA55CF0];
export const COLOR_NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
export const BOOSTER_PRICE = { hammer: 100, shuffle: 80, swap: 120, moves: 90 };
export const WORLD_COUNT = 50;
// 월드 → 그림 테마 (배경·지도색·복원·클리어 연출은 10가지 테마를 돌려 씀)
export const themeOf = w => ((w - 1) % 10) + 1;
// 리소스 경로 (단일 파일 배포본은 window.__ASSETS 에 { 경로: data URI } 를 넣어 둔다)
// 큰 AI 원화(배경·마스코트)는 WebP 로 내려보냄 (tools/sync.js 가 변환)
const WEBP = /^assets\/img\/(bg_game_\d+|bg_title|mascot_\w+)\.png$/;
export const asset = path => { const p = WEBP.test(path) ? path.replace(/\.png$/, '.webp') : path; return (typeof window !== 'undefined' && window.__ASSETS && window.__ASSETS[p]) || p; };
// 지도 배경색 (월드별 위·아래·무늬) — 이미지 대신 색으로 그려서 폰 메모리를 아낀다
export const MAP_THEME = [   // 더팜 계절 밭 (위 · 아래 · 무늬)
  ['#D9F2A8', '#A6D86A', '#FFF6C8'], ['#E2F5C0', '#9FD070', '#FFE2C0'], ['#FFE2B0', '#F2B66A', '#FFF0D0'],
  ['#EEF6FF', '#C8DDF0', '#FFFFFF'], ['#F0D8F6', '#C9A6E0', '#FFE6F0'], ['#D6F0C0', '#8CC66A', '#F6FFE0'],
  ['#FFF0C0', '#E8C870', '#FFF8E0'], ['#FFD8C0', '#E89A6A', '#FFF0E0'], ['#E8F4D0', '#A8CF82', '#FFFFF0'],
  ['#FFE6C8', '#E0B27A', '#FFF6E8'],
];
export const LEVELS_PER_WORLD = 10;

// 텍스트 스타일 프리셋
const SHADOW = { offsetX: 0, offsetY: 5, color: 'rgba(40,22,8,0.45)', blur: 10, stroke: true, fill: true };
export const TXT = {
  title: { fontFamily: FONT, fontSize: '84px', color: '#ffffff', stroke: INK, strokeThickness: 14, shadow: SHADOW },
  big: { fontFamily: FONT, fontSize: '64px', color: '#ffffff', stroke: INK, strokeThickness: 12, shadow: SHADOW },
  mid: { fontFamily: FONT, fontSize: '48px', color: '#ffffff', stroke: INK, strokeThickness: 10, shadow: { ...SHADOW, offsetY: 4, blur: 8 } },
  small: { fontFamily: FONT, fontSize: '36px', color: '#ffffff', stroke: INK, strokeThickness: 8 },
  body: { fontFamily: FONT, fontSize: '40px', color: INK, align: 'center', wordWrap: { width: 700, useAdvancedWrap: true } },
  dark: { fontFamily: FONT, fontSize: '44px', color: INK },
};
