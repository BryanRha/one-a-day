// 화면 크기: 가로 1080 고정, 세로는 기기 비율에 맞춰 늘어남 (최소 1920)
export const VERSION = '0.1.0';
export const TITLE = '판다 블록';       // 가제 — 이름이 정해지면 여기와 index.html·로고만 바꾸면 됨
export const TITLE_EN = 'Panda Blocks';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
export const FONT = 'Jua, sans-serif';
export const INK = '#2A1650';
