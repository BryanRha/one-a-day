// 보드 모양 라이브러리 — 꽉 찬 사각형 레벨에 다양한 모양을 입힌다 (캔디크러쉬처럼 레벨마다 다른 판).
// 모양은 (r, c, w, h) → 칸이 있으면 true 인 함수. 모두 좌우 대칭이라 보기 좋고 공정하다.
// 적용 규칙 (shapeLevel):
//  - 1~10레벨(튜토리얼)과 이미 모양이 있는 레벨은 그대로
//  - 레벨에 놓인 젤리·덮개·장애물·재료 칸을 95% 이상 살리는 모양만 고름 (목표가 사라지지 않게)
//  - 칸 수 60% 이상, 모든 열에 3칸 이상 (생성·낙하가 막히지 않게)
const cx = (c, w) => c - (w - 1) / 2, cy = (r, h) => r - (h - 1) / 2;

export const SHAPES = {
  diamond: (r, c, w, h) => Math.abs(cx(c, w)) / (w / 2) + Math.abs(cy(r, h)) / (h / 2) <= 1.32,
  circle: (r, c, w, h) => (cx(c, w) / (w / 2)) ** 2 + (cy(r, h) / (h / 2)) ** 2 <= 1.12,
  hourglass: (r, c, w, h) => Math.abs(cx(c, w)) <= Math.abs(cy(r, h)) + w * 0.2,
  ring: (r, c, w, h) => !(Math.abs(cx(c, w)) <= 0.6 && Math.abs(cy(r, h)) <= 0.6) && !((r === 0 || r === h - 1) && (c === 0 || c === w - 1)),
  twinTowers: (r, c, w, h) => !(Math.abs(cx(c, w)) <= 0.6 && r <= h * 0.45),
  arch: (r, c, w, h) => !(Math.abs(cx(c, w)) <= 1.1 && r >= h - 3) && !(r === 0 && Math.abs(cx(c, w)) >= w / 2 - 1),
  pyramid: (r, c, w, h) => Math.abs(cx(c, w)) <= (r + 2.2) * (w / 2) / h * 1.15,
  bowl: (r, c, w, h) => Math.abs(cx(c, w)) <= (h - r + 1.2) * (w / 2) / h * 1.15,
  notched: (r, c, w, h) => !((r === 0 || r === h - 1) && (c % 3 === 1 || c === 0 || c === w - 1)) && !((c === 0 || c === w - 1) && r % 3 === 1),
  steps: (r, c, w, h) => { const k = Math.abs(cx(c, w)); return r >= Math.max(0, Math.floor(k) - 1) && r <= h - 1 - Math.max(0, Math.floor(k) - 1); },
  shield: (r, c, w, h) => r < h * 0.55 || Math.abs(cx(c, w)) <= (h - r + 0.8) * (w / 2) / (h * 0.45),
  wave: (r, c, w, h) => { const off = Math.round(Math.sin(c * 1.1) * 1.2); return r >= 1 + off && r <= h - 2 + off || (r > 0 && r < h - 1 && Math.abs(cx(c, w)) <= 0.6); },
  crown: (r, c, w, h) => (r >= 2 || (r === 0 && c % 2 === 0 && Math.abs(cx(c, w)) !== 0.5 && c % (w - 1) !== 0) || (r === 1 && (c % 2 === 0 || Math.abs(cx(c, w)) <= 0.6))) && !(r === h - 1 && (c === 0 || c === w - 1)),
  islands: (r, c, w, h) => !(Math.abs(cy(r, h)) <= 0.6 && Math.abs(cx(c, w)) >= 0.6 && Math.abs(cx(c, w)) <= w / 2 - 1.4) && !((r === 0 || r === h - 1) && (c === 0 || c === w - 1)),
  window: (r, c, w, h) => !((r === 2 || r === h - 3) && (c === 2 || c === w - 3)) && !((r === 0 || r === h - 1) && (c === 0 || c === w - 1)),
  fish: (r, c, w, h) => { const x = cx(c, w), y = cy(r, h); return (x + 0.8) ** 2 / (w * 0.42) ** 2 + y * y / (h * 0.5) ** 2 <= 1.15 || (x >= w * 0.25 && Math.abs(y) <= (x - w * 0.15) * 0.9 + 0.4); },
};
// 손으로 그린 9×9 견본 (8칸 판에는 비율대로 줄여서 씀). '.' = 칸, '#' = 구멍
const TEMPLATES = {
  heart: ['.##...##.', '.........', '.........', '.........', '.........', '#.......#', '##.....##', '###...###', '####.####'],
  bigPlus: ['##.....##', '##.....##', '.........', '.........', '.........', '.........', '.........', '##.....##', '##.....##'],
  butterfly: ['..#####..', '...###...', '.........', '.........', '###...###', '.........', '.........', '...###...', '..#####..'],
  turtle: ['###...###', '#.......#', '.........', '.........', '.........', '.........', '.........', '.........', '.##...##.'],
  anchor: ['###...###', '###...###', '.........', '.........', '##.....##', '#.......#', '.........', '.........', '#.##.##.#'],
  columns: ['.........', '.........', '.##.#.##.', '.##.#.##.', '.........', '.........', '.##.#.##.', '.........', '.........'],
  lantern: ['####.####', '##.....##', '#.......#', '.........', '.........', '.........', '#.......#', '##.....##', '###...###'],
};
// 9칸보다 작은 판: 행은 옆 행과 똑같은 행부터(가운데에 가까운 순) 빼고, 열은 가운데 열을 양쪽에 합친다 (좌우 대칭 유지)
function shrinkRows(t, h) {
  let rows = t.slice();
  while (rows.length > h) {
    const mid = (rows.length - 1) / 2;
    const dup = rows.map((_, i) => i).filter(i => (i > 0 && rows[i] === rows[i - 1]) || (i < rows.length - 1 && rows[i] === rows[i + 1]));
    const pick = (dup.length ? dup : [Math.floor(mid)]).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    rows.splice(pick, 1);
  }
  return rows;
}
function shrinkCols(row, w) {
  let cs = [...row];
  while (cs.length > w) {
    const m = Math.floor(cs.length / 2);
    if (cs.length % 2) { const keep = cs[m] === '.'; cs.splice(m, 1); if (keep) { cs[m - 1] = '.'; cs[m] = '.'; } }
    else { const keep = cs[m - 1] === '.' || cs[m] === '.'; cs.splice(m, 1); cs[m - 1] = keep ? '.' : cs[m - 1]; }
  }
  return cs.join('');
}
const shrunk = {};
function fitTemplate(k, w, h) {
  const key = `${k}${w}x${h}`;
  return shrunk[key] || (shrunk[key] = shrinkRows(TEMPLATES[k], h).map(row => shrinkCols(row, w)));
}
for (const k of Object.keys(TEMPLATES)) SHAPES[k] = (r, c, w, h) => (w > 9 || h > 9) ? true : fitTemplate(k, w, h)[r][c] === '.';
const ORDER = Object.keys(SHAPES);
const GENTLE = ['notched', 'ring', 'window', 'columns', 'turtle', 'bigPlus', 'lantern', 'circle', 'twinTowers', 'islands'];
// 넓은 모양으로도 이동 32회 안에 못 맞춘 레벨은 사각형 그대로 둔다
export const NO_SHAPE = new Set([44,52,60,82,84,98,138,159,192,237,239,257,287,355,396,398,399,429,434,435,447]);
export const GENTLE_ONLY = new Set([29,33,43,44,52,53,57,60,77,82,84,95,98,99,138,159,192,202,203,214,232,237,239,257,283,287,313,355,371,390,396,398,399,429,433,434,435,447]);

function mask(name, w, h) {
  const f = SHAPES[name], out = [];
  for (let r = 0; r < h; r++) { let row = ''; for (let c = 0; c < w; c++) row += f(r, c, w, h) ? '.' : '#'; out.push(row); }
  return out;
}
const runAt = (m, w, h, r, c, dr, dc) => {
  const at = (y, x) => y >= 0 && y < h && x >= 0 && x < w && m[y][x] === '.';
  let a = 0, b = 0; while (at(r - dr * (a + 1), c - dc * (a + 1))) a++; while (at(r + dr * (b + 1), c + dc * (b + 1))) b++;
  return a + b + 1;
};
// 목표가 놓인 칸은 가로·세로 모두 3줄을 만들 수 있어야 함 (한쪽으로만 맞출 수 있는 구석 칸은 봇 기준 클리어율이 1/3 로 떨어짐)
const strong = (m, w, h, r, c) => runAt(m, w, h, r, c, 0, 1) >= 3 && runAt(m, w, h, r, c, 1, 0) >= 3;
function valid(m, w, h) {
  let n = 0; const col = new Array(w).fill(0);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (m[r][c] === '.') { n++; col[c]++; }
  if (!(n >= Math.max(40, w * h * 0.6) && col.every(k => k >= 3))) return false;
  // 모든 칸이 가로나 세로로 3칸 줄 안에 들어가야 함 (외톨이 칸이면 그 위의 젤리·장애물을 영영 못 깸)
  const at = (r, c) => r >= 0 && r < h && c >= 0 && c < w && m[r][c] === '.';
  const inLine = (r, c, dr, dc) => { let a = 0, b = 0; while (at(r - dr * (a + 1), c - dc * (a + 1))) a++; while (at(r + dr * (b + 1), c + dc * (b + 1))) b++; return a + b + 1 >= 3; };
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (m[r][c] === '.' && !inLine(r, c, 0, 1) && !inLine(r, c, 1, 0)) return false;
  return true;
}
// 레벨에 깔린 특별한 칸 (젤리·덮개·조각·고정색)
function specialCells(l, w, h) {
  const cells = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const j = l.jelly && l.jelly[r] && l.jelly[r][c] && l.jelly[r][c] !== '0';
    const cv = l.cover && l.cover[r] && l.cover[r][c] && l.cover[r][c] !== '.';
    const pc = l.pieces && l.pieces[r] && l.pieces[r][c] && l.pieces[r][c] !== '.';
    if (j || cv || pc) cells.push([r, c]);
  }
  return cells;
}
const cut = (grid, m, empty) => grid && grid.map((row, r) => [...row].map((ch, c) => (m[r][c] === '#' ? empty : ch)).join(''));

export function shapeLevel(l) {
  if (l.id <= 10 || l.keepShape || NO_SHAPE.has(l.id)) return l;
  const h = l.layout.length, w = l.layout[0].length;
  if (l.layout.some(row => row.includes('#'))) return l;       // 이미 모양이 있는 레벨
  const special = specialCells(l, w, h);
  // 레벨 번호로 정해지는 순서 (같은 월드 안에서 모양이 겹치지 않게 이동)
  // 좁은 길이 생기는 모양으로 너무 어려워진 레벨(튜닝 결과 이동 32회 초과)은 길이 넓은 모양만 쓴다
  const order = GENTLE_ONLY.has(l.id) ? GENTLE : ORDER;
  const start = (l.id * 7 + Math.floor(l.id / 10) * 3) % order.length;
  for (let k = 0; k < order.length; k++) {
    const name = order[(start + k) % order.length], m = mask(name, w, h);
    if (!valid(m, w, h)) continue;
    const kept = special.filter(([r, c]) => m[r][c] === '.');
    if (special.length && kept.length < special.length * 0.95) continue;
    if (!kept.every(([r, c]) => strong(m, w, h, r, c))) continue;
    return { ...l, shape: name, layout: m, jelly: cut(l.jelly, m, '0'), cover: cut(l.cover, m, '.'), pieces: cut(l.pieces, m, '.') };
  }
  return l;
}
