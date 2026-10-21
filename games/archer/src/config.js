// 화면 크기: 가로 1080 고정, 세로는 기기 비율에 맞춰 늘어남 (최소 1920)
export const VERSION = '0.4.0';
export const TITLE = '별빛 궁수';
export const TITLE_EN = 'STAR ARCHER';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
export const FONT = 'Pretendard, sans-serif';
