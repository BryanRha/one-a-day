// 자동 배치 판단 (봇 밸런싱 · 브라우저 자동 테스트 공용)
import { Board, SHAPES, N } from './board.js?v=0.48.0';

const PROBE = ['o3', 'i5', 'l5', 'o2', 'i4', 'r23'].map(n => SHAPES.filter(s => s.name === n)).flat();
function fitCount(g, s) { let n = 0; for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) { let ok = true; for (const [dr, dc] of s.cells) if (g[r + dr][c + dc] >= 0) { ok = false; break; } if (ok) n++; } return n; }
function evalGrid(g) {
  // 큰 조각이 들어갈 자리 수 + 외톨이 빈칸 벌점
  let v = 0;
  for (const s of PROBE) v += Math.min(6, fitCount(g, s)) * (s.cells.length / 3);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] < 0) {
    let open = 0; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const y = r + dr, x = c + dc; if (y >= 0 && x >= 0 && y < N && x < N && g[y][x] < 0) open++; }
    if (open === 0) v -= 6; else if (open === 1) v -= 1.5;
  }
  return v;
}
export function choose(b, skill = 0.7, R = Math.random) {
  let best = null;
  for (let i = 0; i < 3; i++) {
    const t = b.tray[i]; if (!t || t.used) continue;
    for (let r = 0; r <= N - t.shape.h; r++) for (let c = 0; c <= N - t.shape.wd; c++) {
      if (!b.fits(t.shape, r, c)) continue;
      const g = b.g.map(row => row.slice());
      for (const [dr, dc] of t.shape.cells) g[r + dr][c + dc] = t.color;
      // 어드벤처: 보석이 든 줄을 지우면 가산
      let gemV = 0;
      if (b.goals.length) {
        const { rows, cols } = Board.fullLines(g);
        for (const rr of rows) for (let x = 0; x < N; x++) if (b.gem[rr][x] >= 0) gemV += 25;
        for (const cc of cols) for (let y = 0; y < N; y++) if (b.gem[y][cc] >= 0) gemV += 25;
      }
      const lines = Board.clearFull(g);
      const v = lines * 30 + gemV * skill + evalGrid(g) * skill + (R() - 0.5) * 40 * (1 - skill);
      if (!best || v > best.v) best = { v, i, r, c };
    }
  }
  return best;
}
