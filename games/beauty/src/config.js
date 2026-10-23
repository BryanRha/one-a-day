// 화면: 가로 1080 고정, 세로는 기기 비율대로 (최소 1920)
export const VERSION = '0.5.0';
export const TITLE = 'K뷰티 레시피';
export const TITLE_EN = 'K-BEAUTY RECIPE';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
