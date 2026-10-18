// 매치3 규칙 엔진 — 화면과 무관한 순수 로직 (브라우저·Node 공용).
// 모든 상태는 this.s (JSON 직렬화 가능)에 있고, 행동 메서드는 애니메이션용 "steps"를 반환한다.
// step = { type, ... } — 렌더러는 steps를 순서대로 재생한다.

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const MOVABLE = new Set(['tile', 'drop', 'star', 'timer']);
const BLOCKERS = new Set(['stone', 'crate', 'slime']);
const SCORE = { tile: 60, special: 120, jelly: 100, blocker: 80, cover: 60, drop: 1000, star: 500, bonus: 300 };

// ── 레벨 문자 정의 ────────────────────────────────────────────
// layout:  '#' 구멍, 그 외 칸
// pieces:  '.' 랜덤 블록, '1'~'3' 브라우니(hp), 'b'/'B' 비스킷(hp1/2), 'm' 녹은 초콜릿,
//          'T' 시한폭탄, 'A'/'Z' 재료(체리/밤), '*' 별 코인, 'r','o','y','g','u','p' 고정 색 블록
// jelly:   '0' '1' '2'
// cover:   '.' 없음, 'i'/'I'/'J' 얼음 1/2/3, 'k' 사슬, 'q' 거품
const PIECE_CHARS = {
  '1': { k: 'stone', hp: 1 }, '2': { k: 'stone', hp: 2 }, '3': { k: 'stone', hp: 3 },
  'b': { k: 'crate', hp: 1 }, 'B': { k: 'crate', hp: 2 }, 'm': { k: 'slime', hp: 1 },
  'T': { k: 'timer' }, 'A': { k: 'drop', v: 'a' }, 'Z': { k: 'drop', v: 'b' }, '*': { k: 'star' },
};
const FIXED_COLOR = { r: 0, o: 1, y: 2, g: 3, u: 4, p: 5 };
const COVER_CHARS = { i: ['ice', 1], I: ['ice', 2], J: ['ice', 3], k: ['chain', 1], q: ['bubble', 1] };

export class Engine {
  constructor(level, seed = 1) {
    if (level) this.init(level, seed);
  }

  // ── 초기화 ────────────────────────────────────────────────
  init(level, seed) {
    const layout = level.layout;
    const h = layout.length, w = layout[0].length;
    const s = this.s = {
      w, h, levelId: level.id, moves: level.moves, score: 0, nextId: 1, rng: seed >>> 0,
      nColors: level.colors || 5, status: 'play', turn: 0,
      stars: level.stars || [1000, 2000, 3000],
      dropSpawn: level.dropSpawn || { chance: 0.12, maxOnBoard: 1 },
      timerMoves: level.timerMoves || 10,
      timerSpawn: level.timerSpawn || 0,
      goals: (level.goals || [{ type: 'score' }]).map(g => ({ ...g, progress: 0 })),
      dropsSpawned: 0, dropsCollected: 0,
      cells: [], exits: {}, spawners: {},
    };
    const grid = (key, r, c, dflt) => (level[key] && level[key][r] && level[key][r][c]) || dflt;
    for (let r = 0; r < h; r++) {
      const row = [];
      for (let c = 0; c < w; c++) {
        const exists = layout[r][c] !== '#';
        const cell = { e: exists, jelly: 0, cover: null, p: null };
        if (exists) {
          cell.jelly = +grid('jelly', r, c, '0') || 0;
          const pc = grid('pieces', r, c, '.');
          if (PIECE_CHARS[pc]) {
            cell.p = this.newPiece(PIECE_CHARS[pc].k, PIECE_CHARS[pc]);
            if (cell.p.k === 'drop') s.dropsSpawned++;
          } else if (pc in FIXED_COLOR) {
            cell.p = this.newPiece('tile', { c: FIXED_COLOR[pc] });
          }
          const cv = grid('cover', r, c, '.');
          if (COVER_CHARS[cv]) cell.cover = { t: COVER_CHARS[cv][0], hp: COVER_CHARS[cv][1] };
        }
        row.push(cell);
      }
      s.cells.push(row);
    }
    // 재료 배출구: 지정이 없으면 각 열의 맨 아래 칸
    for (let c = 0; c < w; c++) {
      const col = this.column(c);
      if (!col.length) continue;
      const exitCols = level.exits || null;
      if (!exitCols || exitCols.includes(c)) s.exits[`${col[col.length - 1]},${c}`] = true;
      const noSpawn = level.noSpawn || [];
      if (!noSpawn.includes(c)) s.spawners[c] = col[0];
    }
    // 목표 총량 계산 (jelly / clear 계열은 레벨 시작 시점 기준)
    for (const g of s.goals) {
      if (g.type === 'jelly') g.target = this.countWhere(cell => cell.jelly > 0, cell => cell.jelly);
      // 장애물·덮개·별 코인은 항상 "보드 위 전부"를 개수로 센다 (일부만 깨도 클리어되는 혼란 방지)
      if (g.type === 'clear') g.target = this.countWhere(cell => cell.p && cell.p.k === g.what);
      if (g.type === 'cover') g.target = this.countWhere(cell => cell.cover);
      if (g.type === 'star') g.target = this.countWhere(cell => cell.p && cell.p.k === 'star');
      if (g.type === 'drop' || g.type === 'collect') g.target = g.count;
      if (g.type === 'score') g.target = s.stars[0];
    }
    this.fillInitial();
    this.ensurePlayable();
  }

  newPiece(k, props = {}) {
    const p = { id: this.s.nextId++, k };
    if (k === 'tile') { p.c = props.c ?? 0; p.sp = props.sp || null; }
    if (k === 'stone' || k === 'crate' || k === 'slime') p.hp = props.hp || 1;
    if (k === 'timer') p.t = props.t || this.s.timerMoves;
    if (k === 'drop') p.v = props.v || 'a';
    return p;
  }

  // ── 유틸 ──────────────────────────────────────────────────
  // 각 step 에 그 시점의 점수·이동·목표 진행도를 함께 기록 (렌더러가 HUD 를 단계별로 갱신)
  push(steps, st) {
    if (!steps) return;
    st.score = this.s.score; st.moves = this.s.moves; st.goals = this.s.goals.map(g => g.progress);
    steps.push(st);
  }
  rand() { // mulberry32 (상태를 s.rng 에 보관 → 복제 가능)
    let a = this.s.rng = (this.s.rng + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  randInt(n) { return Math.floor(this.rand() * n); }
  cell(r, c) { const s = this.s; return r >= 0 && r < s.h && c >= 0 && c < s.w && s.cells[r][c].e ? s.cells[r][c] : null; }
  column(c) { const out = []; for (let r = 0; r < this.s.h; r++) if (this.s.cells[r][c].e) out.push(r); return out; }
  each(fn) { for (let r = 0; r < this.s.h; r++) for (let c = 0; c < this.s.w; c++) if (this.s.cells[r][c].e) fn(this.s.cells[r][c], r, c); }
  countWhere(pred, weight = () => 1) { let n = 0; this.each(cell => { if (pred(cell)) n += weight(cell); }); return n; }
  clone() { const e = new Engine(); e.s = JSON.parse(JSON.stringify(this.s)); return e; }
  isTile(p) { return p && p.k === 'tile'; }
  matchable(cell) { return cell && cell.p && cell.p.k === 'tile' && cell.p.sp !== 'rainbow'; }
  canMove(cell) { return !!(cell && cell.p && MOVABLE.has(cell.p.k)); }          // 낙하 가능 (덮개는 블록과 함께 떨어짐)
  isBarrier(cell) { return !!(cell && cell.p && !MOVABLE.has(cell.p.k)); }        // 칸 점유 장애물
  neighbors(r, c) { return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => this.cell(y, x)); }
  goal(type) { return this.s.goals.find(g => g.type === type); }
  addGoal(type, amount = 1, pred = () => true) {
    for (const g of this.s.goals) if (g.type === type && pred(g)) g.progress = Math.min(g.target, g.progress + amount);
  }

  // ── 초기 채우기: 시작부터 매치가 생기지 않게 ────────────────
  fillInitial() {
    this.each((cell, r, c) => { if (!cell.p) cell.p = this.newPiece('tile', { c: this.safeColor(r, c) }); });
  }
  safeColor(r, c) {
    const bad = new Set();
    const col = (y, x) => { const cl = this.cell(y, x); return this.matchable(cl) ? cl.p.c : -1; };
    if (col(r, c - 1) >= 0 && col(r, c - 1) === col(r, c - 2)) bad.add(col(r, c - 1));
    if (col(r, c + 1) >= 0 && col(r, c + 1) === col(r, c + 2)) bad.add(col(r, c + 1));
    if (col(r - 1, c) >= 0 && col(r - 1, c) === col(r - 2, c)) bad.add(col(r - 1, c));
    if (col(r + 1, c) >= 0 && col(r + 1, c) === col(r + 2, c)) bad.add(col(r + 1, c));
    const options = [];
    for (let i = 0; i < this.s.nColors; i++) if (!bad.has(i)) options.push(i);
    return options.length ? options[this.randInt(options.length)] : this.randInt(this.s.nColors);
  }
  spawnPiece() {
    const s = this.s;
    const g = this.goal('drop');
    if (g) {
      const onBoard = this.countWhere(cell => cell.p && cell.p.k === 'drop');
      const remaining = g.target - s.dropsCollected - onBoard;
      // 보드에 재료가 없으면 바로 다음 재료를 내려보낸다 (운에 따라 몇 턴씩 기다리지 않게)
      if (remaining > 0 && onBoard < s.dropSpawn.maxOnBoard && (onBoard === 0 || this.rand() < s.dropSpawn.chance)) {
        s.dropsSpawned++;
        return this.newPiece('drop', { v: s.dropsSpawned % 2 ? 'a' : 'b' });
      }
    }
    if (s.timerSpawn && this.rand() < s.timerSpawn && this.countWhere(cell => cell.p && cell.p.k === 'timer') < 2)
      return this.newPiece('timer');
    return this.newPiece('tile', { c: this.randInt(s.nColors) });
  }

  // ── 매치 찾기 ─────────────────────────────────────────────
  findMatches() {
    const { w, h } = this.s;
    const runs = [];
    for (let r = 0; r < h; r++) {
      let c = 0;
      while (c < w) {
        const cl = this.cell(r, c);
        if (!this.matchable(cl)) { c++; continue; }
        let e = c + 1;
        while (e < w && this.matchable(this.cell(r, e)) && this.cell(r, e).p.c === cl.p.c) e++;
        if (e - c >= 3) runs.push({ dir: 'h', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) });
        c = e;
      }
    }
    for (let c = 0; c < w; c++) {
      let r = 0;
      while (r < h) {
        const cl = this.cell(r, c);
        if (!this.matchable(cl)) { r++; continue; }
        let e = r + 1;
        while (e < h && this.matchable(this.cell(e, c)) && this.cell(e, c).p.c === cl.p.c) e++;
        if (e - r >= 3) runs.push({ dir: 'v', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) });
        r = e;
      }
    }
    // 교차하는 run 을 하나의 그룹으로 합침
    const groups = [];
    const owner = new Map();
    for (const run of runs) {
      const hit = new Set(run.cells.map(([r, c]) => owner.get(`${r},${c}`)).filter(x => x !== undefined));
      let g;
      if (hit.size === 0) { g = { runs: [], cells: new Map() }; groups.push(g); }
      else {
        const list = [...hit].map(i => groups[i]);
        g = list[0];
        for (const other of list.slice(1)) { other.runs.forEach(x => g.runs.push(x)); other.cells.forEach((v, k) => g.cells.set(k, v)); other.dead = true; }
      }
      g.runs.push(run);
      run.cells.forEach(([r, c]) => g.cells.set(`${r},${c}`, [r, c]));
      const gi = groups.indexOf(g);
      g.cells.forEach((_, k) => owner.set(k, gi));
    }
    return groups.filter(g => !g.dead).map(g => {
      const longest = Math.max(...g.runs.map(x => x.cells.length));
      const hasH = g.runs.some(x => x.dir === 'h'), hasV = g.runs.some(x => x.dir === 'v');
      let special = null;
      if (longest >= 5) special = 'rainbow';
      else if (hasH && hasV) special = 'bomb';
      else if (longest === 4) special = g.runs[0].dir === 'h' ? 'lineV' : 'lineH';
      // 교차 칸 (폭탄 위치 후보)
      let cross = null;
      if (hasH && hasV) {
        const hs = new Set(g.runs.filter(x => x.dir === 'h').flatMap(x => x.cells.map(([r, c]) => `${r},${c}`)));
        const v = g.runs.filter(x => x.dir === 'v').flatMap(x => x.cells).find(([r, c]) => hs.has(`${r},${c}`));
        cross = v || null;
      }
      const main = g.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      return { cells: [...g.cells.values()], special, cross, mid: main.cells[Math.floor(main.cells.length / 2)], color: this.cell(...main.cells[0]).p.c };
    });
  }

  // ── 가능한 수 찾기 ────────────────────────────────────────
  possibleMoves(limit = Infinity) {
    const out = [];
    const { w, h } = this.s;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const a = [r, c], b = [r + dr, c + dc];
        if (this.swapKind(a, b)) { out.push([a, b]); if (out.length >= limit) return out; }
      }
    }
    return out;
  }
  canSwap(cell) { return this.canMove(cell) && !cell.cover; }
  // 'combo' | 'match' | null
  swapKind(a, b) {
    const A = this.cell(...a), B = this.cell(...b);
    if (!this.canSwap(A) || !this.canSwap(B)) return null;
    const pa = A.p, pb = B.p;
    const sa = pa.k === 'tile' && pa.sp, sb = pb.k === 'tile' && pb.sp;
    if (sa === 'rainbow' && pb.k === 'tile') return 'combo';
    if (sb === 'rainbow' && pa.k === 'tile') return 'combo';
    if (sa && sb) return 'combo';
    A.p = pb; B.p = pa;
    const ok = this.matchAt(...a) || this.matchAt(...b);
    A.p = pa; B.p = pb;
    return ok ? 'match' : null;
  }
  matchAt(r, c) {
    const cl = this.cell(r, c);
    if (!this.matchable(cl)) return false;
    const same = (y, x) => { const o = this.cell(y, x); return this.matchable(o) && o.p.c === cl.p.c; };
    let n = 1; for (let x = c - 1; same(r, x); x--) n++; for (let x = c + 1; same(r, x); x++) n++;
    if (n >= 3) return true;
    n = 1; for (let y = r - 1; same(y, c); y--) n++; for (let y = r + 1; same(y, c); y++) n++;
    return n >= 3;
  }

  // ── 플레이어 행동 ─────────────────────────────────────────
  swap(a, b, { free = false } = {}) {
    const s = this.s;
    const steps = [];
    if (s.status !== 'play') return { ok: false, steps };
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return { ok: false, steps };
    const A = this.cell(...a), B = this.cell(...b);
    if (!this.canSwap(A) || !this.canSwap(B)) return { ok: false, steps: [{ type: 'swapFail', a, b }] };
    const kind = this.swapKind(a, b);
    if (!kind && !free) return { ok: false, steps: [{ type: 'swapFail', a, b }] };
    [A.p, B.p] = [B.p, A.p];
    s.turn++;
    if (!free) s.moves--;
    this.push(steps, { type: 'swap', a, b, ids: [B.p.id, A.p.id] });
    this.turnState = { slimeHit: false };
    if (kind === 'combo') this.comboAt(b, a, steps);   // b 위치에 a 에서 온 조각, a 위치에 b 에서 온 조각
    this.cascade(steps, [a, b]);
    this.endTurn(steps, !free);
    return { ok: true, steps };
  }

  useHammer(r, c) {
    const steps = [];
    if (this.s.status !== 'play' || !this.cell(r, c)) return { ok: false, steps };
    this.turnState = { slimeHit: false };
    this.push(steps, { type: 'booster', kind: 'hammer', at: [r, c] });
    this.blastWaves([{ cells: [[r, c]], fx: 'hammer', at: [r, c] }], steps);
    this.cascade(steps, []);
    this.endTurn(steps, false);
    return { ok: true, steps };
  }
  useShuffle() {
    const steps = [];
    if (this.s.status !== 'play') return { ok: false, steps };
    this.shuffle(steps);
    return { ok: true, steps };
  }
  addMoves(n) { this.s.moves += n; if (this.s.status === 'lose') this.s.status = 'play'; }

  // ── 특수 블록 조합 (스왑으로 두 특수 / 무지개+블록) ──────────
  comboAt(at, other, steps) {
    const P = this.cell(...at).p, Q = this.cell(...other).p;
    const sp = [P.sp, Q.sp];
    const [r, c] = at;
    const waves = [];
    const clearPieces = [[...at], [...other]];
    const has = x => sp.includes(x);
    if (sp[0] === 'rainbow' && sp[1] === 'rainbow') {
      const all = []; this.each((cl, y, x) => all.push([y, x]));
      // 진주 + 진주: 보드 전체를 두 번 타격 → 덮개 속 블록·2단 기름띠까지 모두 터짐 (장애물은 2번 맞음)
      waves.push({ cells: all, fx: 'rainbowAll', at, skip: clearPieces, double: true });
    } else if (has('rainbow')) {
      const rb = sp[0] === 'rainbow' ? P : Q, ot = rb === P ? Q : P;
      const color = ot.c;
      if (ot.sp) { // 같은 색 모두 특수로 변신 후 발동
        const targets = [];
        this.each((cl, y, x) => { if (this.matchable(cl) && cl.p.c === color && cl.p.id !== ot.id) targets.push([y, x]); });
        const conv = [];
        for (const [y, x] of targets) {
          const p = this.cell(y, x).p;
          p.sp = ot.sp === 'bomb' ? 'bomb' : (this.rand() < 0.5 ? 'lineH' : 'lineV');
          conv.push({ at: [y, x], id: p.id, sp: p.sp });
        }
        this.push(steps, { type: 'convert', from: at, items: conv });
        waves.push({ cells: targets, fx: 'rainbow', at: rb === P ? at : other, color, skip: [rb === P ? at : other] });
      } else {
        const targets = [];
        this.each((cl, y, x) => { if (this.matchable(cl) && cl.p.c === color) targets.push([y, x]); });
        waves.push({ cells: targets, fx: 'rainbow', at: rb === P ? at : other, color, skip: [rb === P ? at : other] });
      }
    } else if (has('bomb') && (has('lineH') || has('lineV'))) {
      const cells = [];
      for (let d = -1; d <= 1; d++) { cells.push(...this.rowCells(r + d), ...this.colCells(c + d)); }
      waves.push({ cells, fx: 'bigCross', at, skip: clearPieces });
    } else if (sp[0] === 'bomb' && sp[1] === 'bomb') {
      waves.push({ cells: this.square(r, c, 2), fx: 'bigBomb', at, skip: clearPieces });
    } else { // line + line
      waves.push({ cells: [...this.rowCells(r), ...this.colCells(c)], fx: 'cross', at, skip: clearPieces });
    }
    // 조합에 쓰인 두 조각은 제거 (발동 완료 처리)
    for (const pos of clearPieces) {
      const cl = this.cell(...pos);
      if (cl && cl.p && (cl.p.id === P.id || cl.p.id === Q.id)) cl.p.used = true;
    }
    this.blastWaves(waves, steps, new Set([P.id, Q.id]));
  }
  rowCells(r) { const o = []; for (let c = 0; c < this.s.w; c++) if (this.cell(r, c)) o.push([r, c]); return o; }
  colCells(c) { const o = []; for (let r = 0; r < this.s.h; r++) if (this.cell(r, c)) o.push([r, c]); return o; }
  square(r, c, rad) { const o = []; for (let y = r - rad; y <= r + rad; y++) for (let x = c - rad; x <= c + rad; x++) if (this.cell(y, x)) o.push([y, x]); return o; }

  activationFor(p, r, c) {
    if (p.sp === 'lineH') return { cells: this.rowCells(r), fx: 'lineH', at: [r, c] };
    if (p.sp === 'lineV') return { cells: this.colCells(c), fx: 'lineV', at: [r, c] };
    if (p.sp === 'bomb') return { cells: this.square(r, c, 1), fx: 'bomb', at: [r, c] };
    if (p.sp === 'rainbow') { // 폭발로 맞으면 가장 많은 색 제거
      const count = new Array(6).fill(0);
      this.each(cl => { if (this.matchable(cl)) count[cl.p.c]++; });
      const color = count.indexOf(Math.max(...count));
      const cells = []; this.each((cl, y, x) => { if (this.matchable(cl) && cl.p.c === color) cells.push([y, x]); });
      cells.push([r, c]);
      return { cells, fx: 'rainbow', at: [r, c], color };
    }
    return null;
  }

  // ── 폭발 연쇄 처리 ────────────────────────────────────────
  // waves: [{cells, fx, at, skip?}] — 각 웨이브에서 맞은 특수 블록은 다음 웨이브로 발동
  blastWaves(waves, steps, activated = new Set()) {
    let queue = waves;
    let guard = 0;
    while (queue.length && guard++ < 60) {
      const hits = []; const next = [];
      const seen = new Set();
      for (const wv of queue) {
        const skip = new Set((wv.skip || []).map(x => `${x[0]},${x[1]}`));
        for (const [r, c] of wv.cells) {
          const key = `${r},${c}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const cl = this.cell(r, c);
          if (!cl) continue;
          const p = cl.p;
          if (p && p.k === 'tile' && p.sp && !activated.has(p.id) && !p.used && !skip.has(key) && !cl.cover) {
            activated.add(p.id);
            const act = this.activationFor(p, r, c);
            if (act) next.push(act);
          }
          hits.push(this.hitCell(r, c, 'blast'));
          if (wv.double) {
            // 두 번째 타격: 첫 타격에 덮개만 깨졌거나 기름띠가 남은 칸 (방금 발동한 특수 블록 칸은 제외)
            const c2 = this.cell(r, c);
            if (c2 && (c2.cover || c2.jelly > 0 || (c2.p && c2.p.k !== 'drop' && !(c2.p.k === 'tile' && c2.p.sp && activated.has(c2.p.id)))))
              hits.push(this.hitCell(r, c, 'blast'));
          }
        }
      }
      // 조합에 쓰인 조각(used) 제거
      this.each((cl, r, c) => { if (cl.p && cl.p.used) { hits.push({ at: [r, c], removed: cl.p.id, kind: 'tile', color: cl.p.c, sp: cl.p.sp }); this.scoreAdd(SCORE.special); this.collectColor(cl.p); cl.p = null; } });
      this.push(steps, { type: 'blast', fx: queue.map(q => ({ fx: q.fx, at: q.at, color: q.color, cells: q.cells })), hits: hits.filter(Boolean) });
      queue = next;
    }
  }

  // 한 칸에 대한 타격. 반환: 렌더러용 hit 기록
  hitCell(r, c, src) {
    const cl = this.cell(r, c);
    if (!cl) return null;
    const rec = { at: [r, c], pid: cl.p ? cl.p.id : null };
    if (cl.jelly > 0 && (cl.p ? cl.p.k !== 'stone' && cl.p.k !== 'crate' : true)) {
      cl.jelly--; rec.jelly = cl.jelly; this.addGoal('jelly'); this.scoreAdd(SCORE.jelly);
    }
    if (cl.cover) {
      cl.cover.hp--; rec.cover = { t: cl.cover.t, hp: cl.cover.hp };
      if (cl.cover.hp <= 0) { cl.cover = null; this.addGoal('cover'); }   // 완전히 깨졌을 때 1개
      this.scoreAdd(SCORE.cover);
      return rec;
    }
    const p = cl.p;
    if (!p) return rec;
    if (p.k === 'tile') {
      rec.removed = p.id; rec.kind = 'tile'; rec.color = p.c; rec.sp = p.sp;
      this.collectColor(p);
      this.scoreAdd(p.sp ? SCORE.special : SCORE.tile * (this.cascadeLevel || 1));
      cl.p = null;
    } else if (p.k === 'stone' || p.k === 'crate') {
      p.hp--; rec.damaged = p.id; rec.kind = p.k; rec.hp = p.hp;
      this.scoreAdd(SCORE.blocker);
      if (p.hp <= 0) {
        rec.removed = p.id; cl.p = null; this.addGoal('clear', 1, g => g.what === p.k);   // 완전히 부서졌을 때 1개
        if (cl.jelly > 0) { cl.jelly--; rec.jelly = cl.jelly; this.addGoal('jelly'); this.scoreAdd(SCORE.jelly); } // 깔려 있던 젤리도 함께
      }
    } else if (p.k === 'slime') {
      rec.removed = p.id; rec.kind = 'slime'; cl.p = null; this.turnState.slimeHit = true;
      this.addGoal('clear', 1, g => g.what === 'slime'); this.scoreAdd(SCORE.blocker);
    } else if (p.k === 'timer') {
      rec.removed = p.id; rec.kind = 'timer'; cl.p = null; this.scoreAdd(SCORE.blocker);
    } else if (p.k === 'star') {
      rec.removed = p.id; rec.kind = 'star'; cl.p = null; this.addGoal('star'); this.scoreAdd(SCORE.star);
    } else if (p.k === 'drop') {
      return rec; // 재료는 파괴 불가
    }
    return rec;
  }
  collectColor(p) { if (p.k === 'tile' && p.sp !== 'rainbow') this.addGoal('collect', 1, g => COLORS.indexOf(g.color) === p.c); }
  scoreAdd(n) { this.s.score += n; }

  // ── 연쇄: 매치 → 제거/특수 생성 → 낙하 → 반복 ──────────────
  cascade(steps, swapCells) {
    let level = 1;
    let prefer = swapCells.map(([r, c]) => `${r},${c}`);
    this.settle(steps);
    for (let guard = 0; guard < 50; guard++) {
      const groups = this.findMatches();
      if (!groups.length) break;
      this.cascadeLevel = level;
      const hits = []; const created = []; const toActivate = [];
      const hitKeys = new Set(); const adj = new Map();
      const keepCells = new Set();
      for (const g of groups) {
        let pos = null;
        if (g.special) {
          const pref = g.cells.find(([r, c]) => prefer.includes(`${r},${c}`) && !this.cell(r, c).p.sp);
          pos = pref || (g.special === 'bomb' && g.cross) || g.mid;
          const pc = this.cell(...pos).p;
          if (pc.sp) pos = g.cells.find(([r, c]) => !this.cell(r, c).p.sp) || null;
          if (pos) keepCells.add(`${pos[0]},${pos[1]}`);
        }
        for (const [r, c] of g.cells) {
          const key = `${r},${c}`;
          for (const [y, x] of this.neighbors(r, c)) adj.set(`${y},${x}`, [y, x]);
          if (hitKeys.has(key)) continue;
          hitKeys.add(key);
          if (keepCells.has(key)) { // 특수 블록이 생길 칸: 바닥만 타격
            const cl = this.cell(r, c);
            if (cl.cover) { hits.push(this.hitCell(r, c, 'match')); continue; }
            if (cl.jelly > 0) { cl.jelly--; this.addGoal('jelly'); this.scoreAdd(SCORE.jelly); hits.push({ at: [r, c], jelly: cl.jelly }); }
            this.collectColor(cl.p);
            continue;
          }
          const cl = this.cell(r, c);
          if (cl.p && cl.p.sp && !cl.cover) { toActivate.push([r, c]); continue; }
          hits.push(this.hitCell(r, c, 'match'));
        }
        if (pos && g.special) {
          const cl = this.cell(...pos);
          if (!cl.cover) { cl.p.sp = g.special; created.push({ at: pos, id: cl.p.id, sp: g.special, color: cl.p.c }); this.scoreAdd(SCORE.special * 2); }
        }
      }
      // 매치 옆 장애물 타격
      for (const [key, [y, x]] of adj) {
        if (hitKeys.has(key)) continue;
        const cl = this.cell(y, x);
        if (cl && cl.p && !cl.cover && (BLOCKERS.has(cl.p.k) || cl.p.k === 'timer' || cl.p.k === 'star')) hits.push(this.hitCell(y, x, 'adjacent'));
        else if (cl && cl.cover && cl.cover.t === 'bubble') hits.push(this.hitCell(y, x, 'adjacent'));
      }
      this.push(steps, { type: 'match', level, groups: groups.map(g => ({ cells: g.cells, color: g.color })), hits: hits.filter(Boolean), created });
      if (toActivate.length) {
        const acts = []; const activated = new Set();
        for (const [r, c] of toActivate) { const p = this.cell(r, c).p; activated.add(p.id); acts.push(this.activationFor(p, r, c)); }
        this.blastWaves(acts, steps, activated);
      }
      this.settle(steps);
      prefer = [];
      level++;
    }
    this.cascadeLevel = 1;
  }

  // ── 낙하 + 생성 + 재료 배출 ───────────────────────────────
  settle(steps) {
    for (let round = 0; round < 20; round++) {
      const moves = this.gravity();
      const exits = this.collectDrops();
      if (moves.falls.length || moves.spawns.length) this.push(steps, { type: 'fall', ...moves });
      if (exits.length) this.push(steps, { type: 'exit', items: exits });
      if (!exits.length) break;
    }
  }

  gravity() {
    const { w, h } = this.s;
    const paths = new Map(); // id → {path:[[r,c]...], spawned}
    const spawns = [];
    const track = (p, from, to) => {
      if (!paths.has(p.id)) paths.set(p.id, { id: p.id, path: [from] });
      paths.get(p.id).path.push(to);
    };
    let changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      // 1) 수직 낙하 (아래에서 위로)
      for (let c = 0; c < w; c++) {
        const col = this.column(c);
        for (let i = col.length - 1; i >= 0; i--) {
          const r = col[i]; const cl = this.s.cells[r][c];
          if (cl.p) continue;
          if (i > 0) {
            const above = this.s.cells[col[i - 1]][c];
            if (this.canMove(above)) { cl.p = above.p; cl.cover = above.cover; above.p = null; above.cover = null; track(cl.p, [col[i - 1], c], [r, c]); changed = true; }
          } else if (this.s.spawners[c] === r) {
            const p = this.spawnPiece(); cl.p = p;
            const n = spawns.filter(sp => sp.c === c).length;
            spawns.push({ id: p.id, c, piece: { ...p }, offset: n + 1 });
            paths.set(p.id, { id: p.id, path: [[r - 1 - n, c], [r, c]], spawn: true });
            changed = true;
          }
        }
      }
      if (changed) continue;
      // 2) 대각선 미끄러짐: 위가 막힌 빈칸을 옆 위에서 채움
      for (let r = h - 1; r >= 0 && !changed; r--) for (let c = 0; c < w && !changed; c++) {
        const cl = this.cell(r, c);
        if (!cl || cl.p) continue;
        if (this.canBeFilledFromAbove(r, c)) continue;
        for (const dc of [-1, 1]) {
          const src = this.cell(r - 1, c + dc);
          if (!this.canMove(src)) continue;
          const below = this.cell(r, c + dc);
          if (below && !below.p) continue; // 그 조각은 곧장 아래로 떨어질 수 있음
          cl.p = src.p; cl.cover = src.cover; src.p = null; src.cover = null; track(cl.p, [r - 1, c + dc], [r, c]); changed = true; break;
        }
      }
    }
    const falls = [...paths.values()].filter(x => !x.spawn);
    const sp = [...paths.values()].filter(x => x.spawn).map(x => ({ ...x, piece: spawns.find(s => s.id === x.id).piece }));
    // 생성된 조각도 이후 이동 경로가 합쳐져 있음
    return { falls, spawns: sp };
  }
  canBeFilledFromAbove(r, c) {
    // 위쪽으로 같은 열을 따라가며 움직일 수 있는 조각 또는 생성기가 있으면 true
    const col = this.column(c);
    const i = col.indexOf(r);
    for (let j = i - 1; j >= 0; j--) {
      const cl = this.s.cells[col[j]][c];
      if (this.isBarrier(cl)) return false;
      if (cl.p) return true;
    }
    return this.s.spawners[c] !== undefined && !this.isBarrier(this.s.cells[col[0]][c]);
  }
  collectDrops() {
    const out = [];
    this.each((cl, r, c) => {
      if (cl.p && cl.p.k === 'drop' && this.s.exits[`${r},${c}`]) {
        out.push({ at: [r, c], id: cl.p.id, v: cl.p.v });
        cl.p = null; this.s.dropsCollected++; this.addGoal('drop'); this.scoreAdd(SCORE.drop);
      }
    });
    return out;
  }

  // ── 턴 종료 ───────────────────────────────────────────────
  endTurn(steps, consumedMove) {
    const s = this.s;
    if (consumedMove) {
      // 녹은 초콜릿 번짐: 이번 턴에 하나도 안 없앴으면 인접 블록 하나를 덮음
      const slimes = []; this.each((cl, r, c) => { if (cl.p && cl.p.k === 'slime') slimes.push([r, c]); });
      // 2턴 연속으로 하나도 못 없앴을 때만 번진다 (매 턴 번지면 구석의 초콜릿이 지나치게 가혹함)
      s.slimeIdle = this.turnState.slimeHit ? 0 : (s.slimeIdle || 0) + 1;
      if (slimes.length && s.slimeIdle >= 2) {
        s.slimeIdle = 0;
        const cand = [];
        for (const [r, c] of slimes) for (const [y, x] of this.neighbors(r, c)) {
          const cl = this.cell(y, x); if (cl.p && cl.p.k === 'tile' && !cl.p.sp && !cl.cover) cand.push([[r, c], [y, x]]);
        }
        if (cand.length) {
          const [from, to] = cand[this.randInt(cand.length)];
          const cl = this.cell(...to);
          const old = cl.p.id; cl.p = this.newPiece('slime');
          this.push(steps, { type: 'slimeSpread', from, to, removed: old, piece: { ...cl.p } });
          const g = this.s.goals.find(g => g.type === 'clear' && g.what === 'slime'); if (g) g.target++;
        }
      }
      // 시한폭탄 카운트다운
      const ticks = [];
      this.each((cl, r, c) => { if (cl.p && cl.p.k === 'timer') { cl.p.t--; ticks.push({ at: [r, c], id: cl.p.id, t: cl.p.t }); } });
      if (ticks.length) this.push(steps, { type: 'timerTick', items: ticks });
      if (ticks.some(x => x.t <= 0)) { s.status = 'lose'; s.loseReason = 'timer'; this.push(steps, { type: 'timerBoom', items: ticks.filter(x => x.t <= 0) }); return; }
    }
    // 목표(점수 레벨은 1별 점수)를 달성하면 즉시 클리어 → 남은 이동은 보너스 타임으로 자동 전환
    if (this.goalsMet()) { s.status = 'win'; this.push(steps, { type: 'win' }); return; }
    if (s.moves <= 0) { s.status = 'lose'; s.loseReason = 'moves'; this.push(steps, { type: 'lose', reason: 'moves' }); return; }
    this.ensurePlayable(steps);
  }
  goalsMet() {
    return this.s.goals.every(g => g.type === 'score' ? this.s.score >= g.target : g.progress >= g.target);
  }
  starsEarned() { const sc = this.s.score; return this.s.stars.filter(t => sc >= t).length; }

  ensurePlayable(steps) {
    if (this.possibleMoves(1).length) return;
    this.shuffle(steps);
  }
  shuffle(steps) {
    const pos = []; const pieces = [];
    this.each((cl, r, c) => { if (this.canSwap(cl) && cl.p.k === 'tile') { pos.push([r, c]); pieces.push(cl.p); } });
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = pieces.length - 1; i > 0; i--) { const j = this.randInt(i + 1); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
      pos.forEach(([r, c], i) => { this.s.cells[r][c].p = pieces[i]; });
      if (!this.findMatches().length && this.possibleMoves(1).length) break;
      if (attempt > 60) { // 색을 다시 뽑아서라도 해결
        pos.forEach(([r, c]) => { const p = this.s.cells[r][c].p; if (!p.sp) p.c = this.safeColor(r, c); });
        this.fixMatches(pos);
        if (!this.findMatches().length && this.possibleMoves(1).length) break;
      }
    }
    this.fixMatches(pos);
    if (steps) this.push(steps, { type: 'shuffle', items: pos.map(([r, c]) => ({ at: [r, c], id: this.s.cells[r][c].p.id, c: this.s.cells[r][c].p.c, sp: this.s.cells[r][c].p.sp })) });
  }

  // 셔플 뒤 남은 매치 정리: 움직일 수 있는 칸의 색만 바꿔서, 고정된 블록(어망 등)과 이어진 줄까지 없앤다
  matchAt(r, c) {
    const p = this.cell(r, c).p;
    const same = (rr, cc) => { const cl = this.cell(rr, cc); return cl && this.matchable(cl) && cl.p.c === p.c; };
    let h = 1, v = 1;
    for (let x = c - 1; same(r, x); x--) h++;
    for (let x = c + 1; same(r, x); x++) h++;
    for (let y = r - 1; same(y, c); y--) v++;
    for (let y = r + 1; same(y, c); y++) v++;
    return h >= 3 || v >= 3;
  }
  fixMatches(pos) {
    const free = new Set(pos.map(([r, c]) => `${r},${c}`));
    for (let k = 0; k < 40; k++) {
      const ms = this.findMatches();
      if (!ms.length) return;
      for (const m of ms) {
        const cell = m.cells.find(([r, c]) => free.has(`${r},${c}`) && !this.s.cells[r][c].p.sp);
        if (!cell) continue;
        const [r, c] = cell, p = this.s.cells[r][c].p;
        for (let t = 0; t < this.s.nColors; t++) { p.c = (p.c + 1) % this.s.nColors; if (!this.matchAt(r, c)) break; }
      }
    }
  }

  // ── 클리어 보너스: 남은 이동 수만큼 줄무늬 블록 → 전부 발동 ──
  bonusRound() {
    const steps = [];
    this.turnState = { slimeHit: true };
    const conv = [];
    const n = Math.min(this.s.moves, 15);
    for (let i = 0; i < n; i++) {
      const cand = [];
      this.each((cl, r, c) => { if (this.matchable(cl) && !cl.p.sp && !cl.cover) cand.push([r, c]); });
      if (!cand.length) break;
      const [r, c] = cand[this.randInt(cand.length)];
      const p = this.cell(r, c).p; p.sp = this.rand() < 0.5 ? 'lineH' : 'lineV';
      conv.push({ at: [r, c], id: p.id, sp: p.sp });
      this.s.moves--; this.scoreAdd(SCORE.bonus);
    }
    if (conv.length) this.push(steps, { type: 'bonusConvert', items: conv });
    for (let round = 0; round < 12; round++) {
      const found = [];
      this.each((cl, r, c) => { if (cl.p && cl.p.k === 'tile' && cl.p.sp && !cl.cover) found.push([r, c]); });
      if (!found.length) break;
      const batch = found.slice(0, 4);
      const activated = new Set(batch.map(([r, c]) => this.cell(r, c).p.id));
      this.blastWaves(batch.map(([r, c]) => this.activationFor(this.cell(r, c).p, r, c)), steps, activated);
      this.cascade(steps, []);
    }
    this.s.moves = 0;
    return steps;
  }
}
