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
  // level(어드벤처): { grid: 8줄 문자열('.'=빈칸, 0~6=색), gems: [[r,c,종류]...], goals: [{type:'gem', g, count} | {type:'score', target}], gemRate }
  // mercy: 연속으로 금방 진 뒤 '구원 모드' — 줄을 지우기 좋은 조각 위주로 (원작의 God Mode)
  constructor({ seed = 1, level = null, mercy = false } = {}) {
    this.mercy = mercy;
    this.R = rng(seed);
    this.g = Array.from({ length: N }, () => new Array(N).fill(-1));   // -1 빈칸, 0~6 색
    this.gem = Array.from({ length: N }, () => new Array(N).fill(-1)); // 블록 속 보석 (어드벤처), -1 없음
    this.score = 0; this.combo = 0; this.miss = 0; this.moves = 0; this.lines = 0; this.bestCombo = 0;
    this.over = false; this.won = false; this.tray = []; this.nextId = 1;
    this.level = level; this.goals = [];
    this.orig = Array.from({ length: N }, () => new Array(N).fill(false));   // 처음부터 놓여 있던 그림 블록
    if (level) {
      level.grid.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') { this.g[r][c] = +ch; this.orig[r][c] = true; } }));
      for (const [r, c, k] of level.gems || []) if (this.g[r][c] >= 0) this.gem[r][c] = k;
      this.goals = level.goals.map(g => ({ ...g, have: 0, count: g.type === 'clearAll' ? this.orig.flat().filter(Boolean).length : g.count }));
    }
    this.deal();
  }
  // 아직 모아야 할 보석 종류별 개수 − 판 위에 있는 개수 (조각에 보석을 실어 보낼지 판단)
  gemNeed() {
    const need = {};
    for (const g of this.goals) if (g.type === 'gem') need[g.g] = g.count - g.have;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const k = this.gem[r][c]; if (k >= 0 && need[k] !== undefined) need[k]--; }
    for (const t of this.tray) if (!t.used && t.gems) for (const k of t.gems) if (k >= 0 && need[k] !== undefined) need[k]--;
    return need;
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
  // 묶음이 줄을 얼마나 잘 지울 수 있는지 (구원 모드용 간단 점수)
  clearPotential(t) {
    let best = 0;
    for (const s of t) for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) {
      if (!this.fits(s, r, c)) continue;
      const g2 = this.g.map(row => row.slice()); for (const [dr, dc] of s.cells) g2[r + dr][c + dc] = 0;
      const { rows, cols } = Board.fullLines(g2); best = Math.max(best, rows.length + cols.length);
    }
    return best;
  }
  deal() {
    let best = null;
    // 도움 모드: 구원 모드(연속 패배 뒤)는 처음 40수까지, 그리고 누구나 첫 15수는 너그럽게 (초반 허무한 패배 방지)
    if ((this.mercy && this.moves < 40) || this.moves < 15) {
      let bv = -1;
      for (let tries = 0; tries < 30; tries++) { const t = [this.pick(), this.pick(), this.pick()]; if (!this.solvable(t)) continue; const v = this.clearPotential(t) + this.R() * 0.5; if (v > bv) { bv = v; best = t; } }
    }
    let fallback = null;
    for (let tries = 0; tries < 24 && !best; tries++) {
      const t = [this.pick(), this.pick(), this.pick()];
      if (this.solvable(t)) { best = t; break; }
      if (!fallback && t.some(s => this.anyFit(s))) fallback = t;
    }
    if (!best) best = fallback;
    if (!best) best = [this.pick(), this.pick(), this.pick()];
    this.tray = [];
    for (const s of best) {
      const t = { id: this.nextId++, shape: s, color: Math.floor(this.R() * COLORS), used: false, gems: null };
      // 어드벤처: 아직 부족한 보석은 새 조각 몇 칸에 실려서 나옴
      if (this.goals.length) {
        const need = this.gemNeed(), kinds = Object.keys(need).filter(k => need[k] > 0).map(Number);
        if (kinds.length) t.gems = s.cells.map(() => (this.R() < (this.level.gemRate || 0.14) ? kinds[Math.floor(this.R() * kinds.length)] : -1));
      }
      this.tray.push(t);
    }
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
    placed.forEach(([y, x], i) => { this.g[y][x] = t.color; this.gem[y][x] = t.gems ? t.gems[i] : -1; });
    let gained = placed.length;
    const { rows, cols } = Board.fullLines(this.g);
    const lines = rows.length + cols.length;
    const cleared = [];
    if (lines) {
      const seen = new Set();
      for (const rr of rows) for (let x = 0; x < N; x++) seen.add(rr * N + x);
      for (const cc of cols) for (let y = 0; y < N; y++) seen.add(y * N + cc);
      for (const k of seen) { const y = Math.floor(k / N), x = k % N; cleared.push([y, x, this.g[y][x], this.gem[y][x]]); }
      for (const k of seen) { const y = Math.floor(k / N), x = k % N; const gk = this.gem[y][x]; if (gk >= 0) { const goal = this.goals.find(g => g.type === 'gem' && g.g === gk); if (goal) goal.have = Math.min(goal.count, goal.have + 1); } if (this.orig[y][x]) { this.orig[y][x] = false; const ca = this.goals.find(g => g.type === 'clearAll'); if (ca) ca.have++; } this.g[y][x] = -1; this.gem[y][x] = -1; }
      this.combo++; this.miss = 0; this.lines += lines;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = 1 + 0.5 * (this.combo - 1);
      gained += Math.round(LINE_PTS[Math.min(lines, LINE_PTS.length - 1)] * mult);
    } else if (this.combo && ++this.miss >= COMBO_KEEP) { this.combo = 0; this.miss = 0; }
    const allClear = lines > 0 && this.g.every(row => row.every(v => v < 0));
    if (allClear) gained += ALL_CLEAR;
    this.score += gained;
    // 칭찬 단계: 2줄 Good · 3줄 Great · 4줄 Excellent · 5줄+ Amazing · 콤보 8+ 와 겹치면 Unbelievable
    const praise = lines >= 2 ? Math.min(5, lines - 1 + (this.combo >= 8 && lines >= 3 ? 1 : 0)) : 0;
    const res = { placed, color: t.color, gems: t.gems, rows, cols, cleared, gained, combo: this.combo, lines, allClear, praise, dealt: false };
    for (const g of this.goals) if (g.type === 'score') g.have = Math.min(g.target, this.score);
    if (this.goals.length && this.goals.every(g => (g.type === 'score' ? this.score >= g.target : g.have >= g.count))) { this.won = true; this.over = true; res.won = true; res.over = true; return res; }
    if (this.tray.every(x => x.used)) { this.deal(); res.dealt = true; }
    else this.checkOver();
    res.over = this.over;
    return res;
  }
  checkOver() { this.over = !this.tray.some(t => !t.used && this.anyFit(t.shape)); return this.over; }
  // 이어하기: 가운데 4×4 를 비워 줌 (광고 보상 자리)
  revive() { this.revived = true; for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) { if (this.orig[r][c]) { this.orig[r][c] = false; const ca = this.goals.find(g => g.type === 'clearAll'); if (ca) ca.have++; } this.g[r][c] = -1; this.gem[r][c] = -1; } this.over = false; this.checkOver(); if (this.over) this.deal(); }
}
