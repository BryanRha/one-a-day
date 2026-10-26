// 어드벤처 레벨: 미리 놓인 블록 그림(8×8) + 그 속에 박힌 보석 → 보석을 모으거나 점수 목표 달성
// 레벨 번호만으로 늘 같은 판이 나오도록 결정적으로 만든다 (모든 유저가 같은 레벨).
import { N, rng } from './board.js?v=0.57.5';
import { TUNE } from './levels_tuning.js?v=0.57.5';

// 블록 그림: 숫자 = 색(0빨 1주 2노 3초 4하늘 5파 6보라), '.' = 빈칸
export const PATTERNS = {
  heart: ['........', '.00..00.', '00000000', '00000000', '.000000.', '..0000..', '...00...', '........'],
  smile: ['..2222..', '.222222.', '22.22.22', '22222222', '2.2222.2', '22....22', '.222222.', '..2222..'],
  house: ['...00...', '..0000..', '.000000.', '00000000', '.111111.', '.11..11.', '.11..11.', '.111111.'],
  tree: ['...33...', '..3333..', '.333333.', '33333333', '..3333..', '...11...', '...11...', '..1111..'],
  fish: ['........', '..444...', '.44444.4', '4.444444', '4444444.', '.44444.4', '..444...', '........'],
  star: ['...22...', '...22...', '22222222', '.222222.', '..2222..', '.222222.', '.22..22.', '22....22'],
  mushroom: ['..0000..', '.00..00.', '00000000', '0.0000.0', '..1111..', '..1111..', '..1..1..', '........'],
  ghost: ['..6666..', '.666666.', '66.66.66', '66666666', '66666666', '66666666', '6.6..6.6', '........'],
  flower: ['.6....6.', '666..666', '.6.22.6.', '...22...', '...33...', '.3333...', '...333..', '...33...'],
  cup: ['........', '55555555', '5.5555.5', '5.5555.5', '.555555.', '..5555..', '...55...', '.555555.'],
  crown: ['........', '2..2..2.', '22.22.22', '22222222', '22222222', '24242422', '22222222', '........'],
  rocket: ['...00...', '..0440..', '..0440..', '..0000..', '..0000..', '.000000.', '00.11.00', '...11...'],
  duck: ['...22...', '..2222..', '..2.2211', '..2222..', '22222222', '22222222', '.222222.', '........'],
  cat: ['1......1', '11....11', '11111111', '1.1111.1', '11111111', '111..111', '.111111.', '........'],
  diamond: ['...44...', '..4444..', '.444444.', '44444444', '.444444.', '..4444..', '...44...', '........'],
  gift: ['..0..0..', '...00...', '55500555', '55500555', '55500555', '55500555', '55500555', '........'],
  umbrella: ['...66...', '.666666.', '66666666', '6.6.6.6.', '...1....', '...1....', '...1.1..', '....1...'],
  apple: ['....3...', '...3....', '.00.00..', '0000000.', '0000000.', '0000000.', '.00000..', '..0.0...'],
  bunny: ['.6...6..', '.66.66..', '..666...', '.66666..', '66.6.66.', '6666666.', '.66666..', '..6.6...'],
  sailboat: ['....2...', '...22...', '..222...', '.2222...', '22222...', '....1...', '55555555', '.555555.'],
};
const NAMES = Object.keys(PATTERNS);
export const CHAPTER = 12;            // 12레벨 = 그림 한 줄 (96 = 12×8 픽셀 그림)
export const SEASON_LEVELS = 96;      // 원작처럼 7일 동안 96레벨 → 픽셀 그림 완성

// 그림을 판에 맞게: 꽉 찬 줄은 한 칸씩 비워 시작부터 지워지지 않게, 레벨이 낮을수록 블록을 조금 덜어냄
// minFill: 그림이 알아볼 수 있게 남겨 둘 최소 블록 수 (너무 비면 지루하고 그림이 안 보임)
function shapeGrid(pat, R, thin, minFill = 16) {
  const g = pat.map(row => [...row]);
  const total = pat.join('').replace(/\./g, '').length, keepMin = Math.min(total, minFill);
  const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] !== '.') cells.push([r, c]);
  let left = total;
  for (const [r, c] of cells.sort(() => R() - 0.5)) if (left > keepMin && R() < thin) { g[r][c] = '.'; left--; }
  for (let pass = 0; pass < 3; pass++) {
    for (let r = 0; r < N; r++) if (g[r].every(ch => ch !== '.')) g[r][Math.floor(R() * N)] = '.';
    for (let c = 0; c < N; c++) { let full = true; for (let r = 0; r < N; r++) if (g[r][c] === '.') { full = false; break; } if (full) g[Math.floor(R() * N)][c] = '.'; }
  }
  return g.map(row => row.join(''));
}

// n = 1부터. 목표: 보석 모으기(대부분) · 5레벨마다 점수 목표
// season: 주차 번호 — 주마다 판 배치가 바뀜 (난이도 배율은 레벨 번호 기준으로 공통)
export function makeLevel(n, scaleOverride, season = 0) {
  const R = rng(n * 7919 + 13 + season * 104729);
  const scale = scaleOverride ?? (TUNE[n] || 1);              // tools/tune.js 가 정한 목표량 배율
  const name = NAMES[(n - 1 + season * 7) % NAMES.length];
  const ch = Math.floor((n - 1) / CHAPTER), p = (n - 1) % CHAPTER;
  // 판 밀도: 초반엔 덜 빽빽 + 쉬운 레벨일수록(배율<1) 그림 블록을 더 덜어냄
  const thin = Math.min(0.75, Math.max(0, 0.35 - n * 0.012) + Math.max(0, 1 - scale) * 0.55);
  const grid = shapeGrid(PATTERNS[name], R, thin);
  const filled = []; grid.forEach((row, r) => [...row].forEach((v, c) => { if (v !== '.') filled.push([r, c]); }));
  const kinds = n < 4 ? 1 : n < 12 ? (p % 3 === 2 ? 2 : 1) : n < 30 ? (p % 2 ? 2 : 1 + (p % 4 === 0 ? 2 : 0)) : 2 + (p % 3 === 0 ? 1 : 0);
  const kindsAdj = scale < 0.3 ? Math.max(1, kinds - 1) : kinds;   // 많이 쉬워야 하는 레벨은 보석 종류도 줄임
  const hard = p === CHAPTER - 1 ? 1.3 : p === 5 ? 1.15 : 1;      // 줄의 마지막·중간은 고비 (어려움 표시)
  // 그림 블록 모두 지우기 (가끔)
  if (p === 7 && n > 6) {
    const g2 = shapeGrid(PATTERNS[name], R, Math.min(0.8, Math.max(0.35, thin + 0.25)));
    return { n, name, chapter: ch, grid: g2, gems: [], goals: [{ type: 'clearAll' }], gemRate: 0, hard: hard > 1 };
  }
  if (p === 4 && n > 5) {
    // 점수 목표 레벨
    const target = Math.max(300, Math.round((1500 + n * 120) * hard * scale / 100) * 100);
    return { n, name, chapter: ch, grid, gems: [], goals: [{ type: 'score', target }], gemRate: 0, hard: hard > 1 };
  }
  const per = Math.max(3, Math.round((5 + Math.min(14, n * 0.45)) * hard * scale / kindsAdj));
  const goals = [], gems = [];
  const pool = filled.slice().sort(() => R() - 0.5);
  for (let k = 0; k < Math.min(3, kindsAdj); k++) {
    goals.push({ type: 'gem', g: k, count: per });
    const onBoard = Math.min(pool.length, Math.ceil(per * 0.55));      // 절반쯤은 판에 박혀 있고 나머지는 새 조각에 실려 옴
    for (let i = 0; i < onBoard && pool.length; i++) { const [r, c] = pool.pop(); gems.push([r, c, k]); }
  }
  return { n, name, chapter: ch, grid, gems, goals, gemRate: 0.1 + 0.02 * kindsAdj, hard: hard > 1 };
}
export const LEVEL_COUNT = SEASON_LEVELS;
// 주차 (월요일 시작): 시즌 번호 · 남은 시간
export function seasonInfo(now = new Date()) {
  const base = Date.UTC(2026, 0, 5);   // 월요일
  const day = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - base) / 864e5);
  const season = Math.floor(day / 7);
  const end = new Date(base + (season + 1) * 7 * 864e5); end.setMinutes(end.getMinutes() + now.getTimezoneOffset());
  return { season, daysLeft: 7 - (day % 7), end };
}
