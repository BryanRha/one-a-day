// 판 가치 함수 (알파고의 '가치망'처럼 수백 판의 봇 대국으로 학습): 판 모양 특징 → 앞으로 살아남을 확률
import { N, SHAPES, Board } from './board.js?v=0.30.0';
import { WEIGHTS } from './value_weights.js?v=0.30.0';

const PROBES = ['o3', 'i5', 'l5', 'r23', 'i4', 'o2', 't4', 'l4', 'i3'].map(n => SHAPES.filter(s => s.name === n));
function fitCount(g, s) { let n = 0; for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) { let ok = true; for (const [dr, dc] of s.cells) if (g[r + dr][c + dc] >= 0) { ok = false; break; } if (ok) n++; } return n; }
// 특징: 빈칸 비율 · 큰 조각들이 들어갈 자리 수 · 외톨이 빈칸 · 거의 찬 줄 · 남은 조각을 모두 놓을 수 있는가
export function features(g, rest = []) {
  let empty = 0, iso = 0, near = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] < 0) {
    empty++;
    let open = 0; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const y = r + dr, x = c + dc; if (y >= 0 && x >= 0 && y < N && x < N && g[y][x] < 0) open++; }
    if (open === 0) iso++;
  }
  for (let r = 0; r < N; r++) { const f = g[r].filter(v => v >= 0).length; if (f >= 6 && f < 8) near++; }
  for (let c = 0; c < N; c++) { let f = 0; for (let r = 0; r < N; r++) if (g[r][c] >= 0) f++; if (f >= 6 && f < 8) near++; }
  const fits = PROBES.map(vs => Math.min(1, vs.reduce((a, s) => a + fitCount(g, s), 0) / 12));
  let restOk = 1;
  if (rest.length) { const b = Object.create(Board.prototype); restOk = b.solveSeq(rest, g) || b.solveSeq(rest.slice().reverse(), g) ? 1 : 0; }
  return [1, empty / 64, ...fits, iso / 6, near / 8, restOk];
}
// 생존 확률: (남은 조각을 모두 놓을 수 있는가) × (다음에 무작위 조각 3개가 와도 다 들어갈 확률)
// 무작위 묶음은 고정된 표본(SAMPLE)을 써서 자리끼리 공정하게 비교하고, 화면이 매번 흔들리지 않게 한다.
const R0 = (() => { let a = 12345; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
const TOT = SHAPES.reduce((x, s) => x + s.w, 0);
const pickS = () => { let x = R0() * TOT; for (const s of SHAPES) { x -= s.w; if (x <= 0) return s; } return SHAPES[0]; };
const SAMPLE = Array.from({ length: 40 }, () => [pickS(), pickS(), pickS()]);
const probe = Object.create(Board.prototype);
export function value(g, rest = [], K = 24) {
  if (rest.length && !(probe.solveSeq(rest, g) || probe.solveSeq(rest.slice().reverse(), g))) return 0.02;
  let after = g;
  if (rest.length) {   // 남은 조각은 봇처럼 가장 나은 자리에 놓았다고 보고 그 뒤 판으로 평가 (간단히: 첫 가능 순서)
    after = g.map(r => r.slice());
    for (const s of rest) { let done = false; for (let r = 0; r <= N - s.h && !done; r++) for (let c = 0; c <= N - s.wd && !done; c++) { let ok = true; for (const [dr, dc] of s.cells) if (after[r + dr][c + dc] >= 0) { ok = false; break; } if (ok) { for (const [dr, dc] of s.cells) after[r + dr][c + dc] = 0; Board.clearFull(after); done = true; } } }
  }
  let ok = 0;
  for (let k = 0; k < K; k++) if (probe.solvable(SAMPLE[k], after)) ok++;
  const p = (ok + 0.5) / (K + 1);
  // 판의 여유(큰 조각 자리) 조금 더해 같은 확률끼리도 순서가 생기게
  const f = features(after);
  return Math.max(0.01, Math.min(0.99, p * 0.9 + (f[2] + f[3]) * 0.05));
}
// 지금 조각들로 둘 수 있는 모든 자리의 가치 (놓고 → 지워진 판 기준, 남은 조각을 다 놓을 수 있는지 포함)
export function evaluateMoves(b) {
  const out = [];
  b.tray.forEach((t, i) => {
    if (t.used) return;
    const rest = b.tray.filter((x, j) => j !== i && !x.used).map(x => x.shape);
    for (let r = 0; r <= N - t.shape.h; r++) for (let c = 0; c <= N - t.shape.wd; c++) {
      if (!b.fits(t.shape, r, c)) continue;
      const g = b.g.map(row => row.slice());
      for (const [dr, dc] of t.shape.cells) g[r + dr][c + dc] = 0;
      Board.clearFull(g);
      out.push({ i, r, c, wr: Math.pow(value(g, rest), 3) });   // 앞으로 세 묶음 더 버틸 확률로 표시 (변화가 잘 보이게)
    }
  });
  out.sort((x, y) => y.wr - x.wr);
  return { moves: out, best: out.length ? out[0].wr : 0 };
}
// 수 평가 — 너그럽게 (사람은 잘한다고 느낄 때 몰입): 최선 대비 손실로 판정
export function rateMove(an, i, r, c) {
  const m = an.moves.find(x => x.i === i && x.r === r && x.c === c);
  if (!m) return null;
  const loss = an.best - m.wr, rank = an.moves.indexOf(m) / Math.max(1, an.moves.length - 1);
  const grade = loss <= 0.04 || rank <= 0.1 ? 'best' : loss <= 0.14 ? 'good' : loss <= 0.32 ? 'inacc' : 'miss';
  // 수의 가치(%): 최선의 수 대비 생존 확률 — 최선 100%, 상위 10% 안이면 97% 이상으로 너그럽게
  // 손실(생존 확률 차)과 순위를 함께 반영해 차이가 보이게, 최선 근처는 너그럽게 97~100
  let q = Math.round(100 - loss * 320 - rank * 60);
  if (grade === 'best') q = Math.max(q, 97 + Math.round(Math.max(0, 1 - rank * 10) * 3));
  q = Math.max(15, Math.min(100, q));
  return { grade, q, wr: m.wr, loss, best: an.best };
}
