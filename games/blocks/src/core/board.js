// 블록 퍼즐 한 판 — 화면과 무관한 순수 로직 (브라우저·Node 공용, 봇 밸런싱에 사용)
// 8×8 판에 조각 3개씩 놓기 → 꽉 찬 가로·세로 줄이 사라짐. 남은 조각이 하나도 안 들어가면 끝.
export const N = 8;
export const COLORS = 7;

// 조각 모양: [행, 열] 칸 목록. w = 기본 출현 가중치, big = 점수가 오를수록 늘어나는 정도
const RAW = {
  dot: { cells: [[0, 0]], w: 2, big: -1 },
  i2: { cells: [[0, 0], [0, 1]], w: 5, big: -1, rot: true },
  i3: { cells: [[0, 0], [0, 1], [0, 2]], w: 6, big: 0, rot: true },
  i4: { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 5, big: 1, rot: true },
  i5: { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], w: 3, big: 2, rot: true },
  o2: { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 6, big: 0 },
  o3: { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], w: 2, big: 2 },
  r23: { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], w: 3, big: 1, rot: true },
  l3: { cells: [[0, 0], [1, 0], [1, 1]], w: 6, big: -1, rot4: true },
  l4: { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], w: 4, big: 0, rot4: true, mirror: true },
  l5: { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], w: 2, big: 2, rot4: true },
  t4: { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], w: 4, big: 0, rot4: true },
  s4: { cells: [[0, 1], [0, 2], [1, 0], [1, 1]], w: 3, big: 0, rot: true, mirror: true },
};
const norm = cs => { const r0 = Math.min(...cs.map(c => c[0])), c0 = Math.min(...cs.map(c => c[1])); return cs.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
const rot = cs => norm(cs.map(([r, c]) => [c, -r]));
const flip = cs => norm(cs.map(([r, c]) => [r, -c]));
const key = cs => cs.map(c => c.join(',')).join(';');
// 회전·대칭을 펼쳐서 실제 조각 목록으로
export const SHAPES = [];
for (const [name, d] of Object.entries(RAW)) {
  const set = new Map();
  const add = cs => { const n = norm(cs); set.set(key(n), n); };
  let base = [d.cells]; if (d.mirror) base.push(flip(d.cells));
  for (const b of base) { let c = norm(b); const k = d.rot4 ? 4 : d.rot ? 2 : 1; for (let i = 0; i < k; i++) { add(c); c = rot(c); } }
  const vs = [...set.values()];
  for (const cells of vs) SHAPES.push({ name, cells, w: d.w / vs.length, big: d.big, h: Math.max(...cells.map(c => c[0])) + 1, wd: Math.max(...cells.map(c => c[1])) + 1 });
}

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 점수 규칙
export const LINE_PTS = [0, 80, 200, 360, 560, 800, 1100, 1500];
export const COMBO_KEEP = 3;      // 이만큼 연속으로 못 지우면 콤보 끊김
export const ALL_CLEAR = 300;

export class Board {
  constructor({ seed = 1 } = {}) {
    this.R = rng(seed);
    this.g = Array.from({ length: N }, () => new Array(N).fill(-1));   // -1 빈칸, 0~6 색
    this.score = 0; this.combo = 0; this.miss = 0; this.moves = 0; this.lines = 0; this.bestCombo = 0;
    this.over = false; this.tray = []; this.nextId = 1;
    this.deal();
  }

  fits(shape, r, c) {
    for (const [dr, dc] of shape.cells) { const y = r + dr, x = c + dc; if (y < 0 || x < 0 || y >= N || x >= N || this.g[y][x] >= 0) return false; }
    return true;
  }
  anyFit(shape, g = this.g) {
    for (let r = 0; r <= N - shape.h; r++) for (let c = 0; c <= N - shape.wd; c++) {
      let ok = true; for (const [dr, dc] of shape.cells) if (g[r + dr][c + dc] >= 0) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }

  // 3개 묶음 뽑기: 점수가 오를수록 큰 조각 가중치↑. 가능하면 3개가 모두 들어가는 묶음을 고름 (불공정한 즉사 방지)
  pick() {
    const lvl = Math.min(1, this.score / 12000);
    const ws = SHAPES.map(s => Math.max(0.05, s.w * (1 + s.big * 0.35 * lvl)));
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = this.R() * tot;
    for (let i = 0; i < SHAPES.length; i++) { x -= ws[i]; if (x <= 0) return SHAPES[i]; }
    return SHAPES[SHAPES.length - 1];
  }
  deal() {
    let best = null;
    for (let tries = 0; tries < 24; tries++) {
      const t = [this.pick(), this.pick(), this.pick()];
      if (this.solvable(t)) { best = t; break; }
      if (!best && t.some(s => this.anyFit(s))) best = t;
    }
    if (!best) best = [this.pick(), this.pick(), this.pick()];
    this.tray = best.map(s => ({ id: this.nextId++, shape: s, color: Math.floor(this.R() * COLORS), used: false }));
    this.checkOver();
  }
  // 묶음을 어떤 순서로든 모두 놓을 수 있는지 (줄 지우기 포함, 첫 자리 몇 개만 시험 — 빠르게)
  solvable(t, g = this.g) {
    for (const o of [[0, 1, 2], [1, 0, 2], [2, 0, 1], [0, 2, 1], [1, 2, 0], [2, 1, 0]]) if (this.solveSeq(o.map(i => t[i]), g)) return true;
    return false;
  }
  solveSeq(seq, g) {
    if (!seq.length) return true;
    const s = seq[0];
    let n = 0;
    for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) {
      let ok = true; for (const [dr, dc] of s.cells) if (g[r + dr][c + dc] >= 0) { ok = false; break; }
      if (!ok) continue;
      const g2 = g.map(row => row.slice());
      for (const [dr, dc] of s.cells) g2[r + dr][c + dc] = 0;
      Board.clearFull(g2);
      if (this.solveSeq(seq.slice(1), g2)) return true;
      if (++n >= 5) return false;     // 자리 몇 개만 시험 (속도)
    }
    return false;
  }
  static fullLines(g) {
    const rows = [], cols = [];
    for (let r = 0; r < N; r++) if (g[r].every(v => v >= 0)) rows.push(r);
    for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (g[r][c] < 0) { f = false; break; } if (f) cols.push(c); }
    return { rows, cols };
  }
  static clearFull(g) { const { rows, cols } = Board.fullLines(g); for (const r of rows) g[r].fill(-1); for (const c of cols) for (let r = 0; r < N; r++) g[r][c] = -1; return rows.length + cols.length; }

  // 놓으면 지워질 줄 미리 보기 (화면용)
  preview(idx, r, c) {
    const t = this.tray[idx]; if (!t || t.used || !this.fits(t.shape, r, c)) return null;
    const g2 = this.g.map(row => row.slice());
    for (const [dr, dc] of t.shape.cells) g2[r + dr][c + dc] = t.color;
    return Board.fullLines(g2);
  }

  // 놓기 → 결과 { placed, rows, cols, cleared:[[r,c,color]], gained, combo, lines, allClear, praise }
  place(idx, r, c) {
    const t = this.tray[idx];
    if (this.over || !t || t.used || !this.fits(t.shape, r, c)) return null;
    t.used = true; this.moves++;
    const placed = t.shape.cells.map(([dr, dc]) => [r + dr, c + dc]);
    for (const [y, x] of placed) this.g[y][x] = t.color;
    let gained = placed.length;
    const { rows, cols } = Board.fullLines(this.g);
    const lines = rows.length + cols.length;
    const cleared = [];
    if (lines) {
      const seen = new Set();
      for (const rr of rows) for (let x = 0; x < N; x++) seen.add(rr * N + x);
      for (const cc of cols) for (let y = 0; y < N; y++) seen.add(y * N + cc);
      for (const k of seen) { const y = Math.floor(k / N), x = k % N; cleared.push([y, x, this.g[y][x]]); }
      for (const k of seen) this.g[Math.floor(k / N)][k % N] = -1;
      this.combo++; this.miss = 0; this.lines += lines;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = 1 + 0.5 * (this.combo - 1);
      gained += Math.round(LINE_PTS[Math.min(lines, LINE_PTS.length - 1)] * mult);
    } else if (this.combo && ++this.miss >= COMBO_KEEP) { this.combo = 0; this.miss = 0; }
    const allClear = lines > 0 && this.g.every(row => row.every(v => v < 0));
    if (allClear) gained += ALL_CLEAR;
    this.score += gained;
    const praise = lines >= 4 ? 3 : lines === 3 ? 2 : lines === 2 ? 1 : 0;
    const res = { placed, color: t.color, rows, cols, cleared, gained, combo: this.combo, lines, allClear, praise, dealt: false };
    if (this.tray.every(x => x.used)) { this.deal(); res.dealt = true; }
    else this.checkOver();
    res.over = this.over;
    return res;
  }
  checkOver() { this.over = !this.tray.some(t => !t.used && this.anyFit(t.shape)); return this.over; }
  // 이어하기: 가운데 4×4 를 비워 줌 (광고 보상 자리)
  revive() { for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) this.g[r][c] = -1; this.over = false; this.checkOver(); if (this.over) { this.deal(); } }
}
