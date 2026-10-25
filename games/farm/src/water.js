// 한스의 물길 잇기 — 시안 ②: 위 왼쪽 물레방아 댐 → 물길 조각을 눌러 돌려서 → 아래 마른 밭까지 물을 이음
//  마을 화면(Hud) 위에 바로 띄움 · 단계가 오를수록 밭이 1 → 2 → 3칸 · 판이 넓어짐
import { W, H } from './config.js?v=0.50.1';
import { T, C, btn } from './ui.js?v=0.50.1';
import { audio } from './audio.js?v=0.50.1';

const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // 위 · 오른쪽 · 아래 · 왼쪽
const BASE = { s: [0, 2], c: [0, 1], t: [0, 1, 2], x: [0, 1, 2, 3] };
const opens = (k, r) => BASE[k].map(d => (d + r) % 4);
// 배경(1024×1536) 기준: 판 5×5칸 · 칸 150 · 밭 3칸은 0 · 2 · 4번 줄 아래
const G = { x0: 99, y0: 330, cell: 165, cols: 5, rows: 4, fieldY: 1205, fieldX: [223, 513, 803], srcY: 250 };
function shapeOf(set) { const a = [...set].sort(); if (a.length >= 4) return ['x', 0]; if (a.length === 3) { for (let r = 0; r < 4; r++) if (opens('t', r).sort().join() === a.join()) return ['t', r]; }
  if (a.length === 2) { for (let r = 0; r < 4; r++) { if (opens('s', r).sort().join() === a.join()) return ['s', r]; if (opens('c', r).sort().join() === a.join()) return ['c', r]; } } return ['s', 0]; }
// 풀 수 있는 판 만들기: 물 입구(0,0 위) → 목표 칸(맨 아래 줄 · 아래로 나감)까지 무작위 길 → 길이 지나간 칸의 모양 → 모두 돌려 섞음
function makeBoard(targets) { const { cols, rows } = G, need = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Set()));
  need[0][0].add(0); for (const tc of targets) { need[rows - 1][tc].add(2);
    let x = 0, y = 0; const seen = new Set(['0,0']), path = [[0, 0]];
    while (!(x === tc && y === rows - 1)) { const opts = DIR.map((d, i) => [x + d[0], y + d[1], i]).filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(a + ',' + b)); if (!opts.length) { x = 0; y = 0; seen.clear(); seen.add('0,0'); path.length = 1; continue; }
      const toward = opts.filter(([a, b]) => Math.abs(a - tc) + Math.abs(b - (rows - 1)) < Math.abs(x - tc) + Math.abs(y - (rows - 1))); const pool = toward.length && Math.random() < 0.85 ? toward : opts, pick = pool[Math.floor(Math.random() * pool.length)];
      const [a, b, i] = pick; need[y][x].add(i); need[b][a].add((i + 2) % 4); x = a; y = b; seen.add(a + ',' + b); path.push([a, b]); } }
  const cells = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const set = need[y][x]; let k, r; if (set.size >= 2) [k, r] = shapeOf(set); else { k = Math.random() < 0.55 ? 's' : 'c'; r = Math.floor(Math.random() * 4); }
    const sol = r, on = set.size >= 2, rr = k === 'x' ? 0 : on ? (r + 1 + Math.floor(Math.random() * 3)) % 4 : Math.floor(Math.random() * 4); cells.push({ x, y, k, r: rr, sol, on }); }
  const turns = cells.filter(c => c.on && c.k !== 'x').reduce((a, c) => a + ((c.k === 's' ? (c.sol - c.r + 4) % 2 : (c.sol - c.r + 4) % 4)), 0); return { cells, turns }; }
export function wtOpen(sc, level, onEnd) {
  const targets = level <= 2 ? [2] : level <= 4 ? [0, 4] : [0, 2, 4], { cells, turns } = makeBoard(targets), moves0 = turns + 4 + targets.length;
  const k = Math.min(Math.max(W / 1024, (H - 120) / 1536), 1.3), mx = x => W / 2 + (x - 512) * k, my = y => y * k;
  const root = sc.add.container(0, 0).setDepth(1500); root.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x76B843)); const bg = sc.add.image(W / 2, 0, 'water_bg').setOrigin(0.5, 0); bg.setScale(k); root.add(bg); root.add(sc.add.zone(W / 2, H / 2, W, H).setInteractive());
  const cs = G.cell * k, cx = i => mx(G.x0 + G.cell * (i + 0.5)), cy = j => my(G.y0 + G.cell * (j + 0.5));
  const frame = sc.add.graphics(); frame.fillStyle(0x3E6A22, 0.22).fillRoundedRect(mx(G.x0) - 10, my(G.y0) - 10, G.cols * cs + 20, G.rows * cs + 20, 30); root.add(frame);
  // 댐에서 판까지 · 판에서 밭까지 물길 (물이 닿으면 파랗게)
  const links = sc.add.graphics(); root.add(links);
  const tiles = cells.map(c => { const im = sc.add.image(cx(c.x), cy(c.y), 'pipe_' + c.k).setAngle(c.r * 90); im.setDisplaySize(cs * 0.93, cs * 0.93); im.setInteractive({ useHandCursor: true }); root.add(im); c.im = im; return c; });
  const st = { moves: moves0, done: false, wet: new Set(), hint: 1 };
  const at = (x, y) => tiles[y * G.cols + x];
  const flow = () => { const wet = new Set(), q = []; const s0 = at(0, 0); if (opens(s0.k, s0.r).includes(0)) { wet.add('0,0'); q.push(s0); }
    while (q.length) { const c = q.shift(); for (const d of opens(c.k, c.r)) { const n = at(c.x + DIR[d][0], c.y + DIR[d][1]); if (!n || wet.has(n.x + ',' + n.y)) continue; if (opens(n.k, n.r).includes((d + 2) % 4)) { wet.add(n.x + ',' + n.y); q.push(n); } } }
    for (const c of tiles) { const w = wet.has(c.x + ',' + c.y); c.im.setTexture('pipe_' + c.k + (w ? '_w' : '')); c.im.setDisplaySize(cs * 0.93, cs * 0.93); }
    st.wet = wet; const reached = targets.filter(tc => { const c = at(tc, G.rows - 1); return wet.has(tc + ',' + (G.rows - 1)) && opens(c.k, c.r).includes(2); });
    links.clear(); const blue = 0x4FC3F7, dry = 0x9C6B3E; links.lineStyle(cs * 0.24, wet.size ? blue : dry, 1).lineBetween(cx(0), my(G.srcY), cx(0), my(G.y0));
    for (const tc of [0, 2, 4]) { if (!targets.includes(tc)) continue; const on = reached.includes(tc), fx = mx(G.fieldX[[0, 2, 4].indexOf(tc)]); links.lineStyle(cs * 0.24, on ? blue : dry, 1).lineBetween(cx(tc), my(G.y0 + G.cell * G.rows), cx(tc), my(G.fieldY - 70)).lineBetween(cx(tc), my(G.fieldY - 70), fx, my(G.fieldY - 70)); }
    return reached; };
  // 밭 표시: 목표가 아닌 밭은 흐리게 · 물이 닿으면 새싹이 살아남
  const fieldMarks = [0, 2, 4].map((tc, i) => { const t = T(sc, mx(G.fieldX[i]), my(G.fieldY), targets.includes(tc) ? '💧' : '', 54, '#000', { w: 900 }); root.add(t); if (!targets.includes(tc)) { const g = sc.add.rectangle(mx(G.fieldX[i]), my(G.fieldY), 270 * k, 170 * k, 0x000000, 0.25); root.add(g); } return t; });
  // 위: 이동 · 별 3개 · ✕ / 아래: 한스 · 말풍선 · 힌트
  const pill = (x, w) => { const g = sc.add.graphics(); g.fillStyle(0x4A2E14, 0.94).fillRoundedRect(x - w / 2, 40, w, 108, 54).lineStyle(6, 0xE8C27A, 1).strokeRoundedRect(x - w / 2, 40, w, 108, 54); root.add(g); };
  pill(200, 300); root.add(T(sc, 120, 94, '이동', 34, '#FFE27A', { w: 900 })); const mT = T(sc, 240, 94, '', 54, '#FFFFFF', { w: 900 }); root.add(mT);
  pill(W / 2 + 130, 330); const stars = [0, 1, 2].map(i => { const t = T(sc, W / 2 + 30 + i * 100, 92, '★', 64, C.gold, { w: 900 }); root.add(t); return t; });
  root.add(btn(sc, W - 80, 94, 92, 92, '✕', () => end(false), { size: 36, style: 'cream' }));
  const bub = sc.add.graphics(); bub.fillStyle(0xFFFBF2, 0.98).fillRoundedRect(290, H - 300, 560, 150, 44).lineStyle(5, 0xE8C27A, 1).strokeRoundedRect(290, H - 300, 560, 150, 44).fillTriangle(270, H - 210, 310, H - 250, 310, H - 180); root.add(bub);
  const tip = T(sc, 570, H - 225, targets.length > 1 ? `밭 ${targets.length}곳 모두에\n물을 이어 보자!` : '조각을 눌러 돌려서\n밭까지 물을 이어 보자!', 36, C.ink, { w: 900 }); root.add(tip);
  const hans = sc.add.image(140, H, 'hans').setOrigin(0.5, 1); hans.setScale(520 / hans.height); root.add(hans);
  const hbg = sc.add.graphics(); hbg.fillStyle(0x2E6A1E, 1).fillRoundedRect(W - 200, H - 236, 170, 178, 40).fillStyle(0x6CC33A, 1).fillRoundedRect(W - 200, H - 244, 170, 170, 40).lineStyle(6, 0xFFF6C8, 1).strokeRoundedRect(W - 200, H - 244, 170, 170, 40); root.add(hbg); const hb = sc.add.zone(W - 115, H - 158, 170, 170); root.add(hb); root.add(T(sc, W - 115, H - 168, '💡', 86, '#000', { w: 900 })); const hT = T(sc, W - 115, H - 40, '힌트 1', 26, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 6); root.add(hT);
  hb.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (st.done) return; if (!st.hint) { tip.setText('힌트는 한 판에 한 번!'); return; } const c = tiles.find(c => c.on && c.k !== 'x' && (c.k === 's' ? c.r % 2 !== c.sol % 2 : c.r !== c.sol)); if (!c) return; st.hint--; hT.setText('힌트 0'); c.r = c.sol; c.im.setAngle(c.r * 90); sc.tweens.add({ targets: c.im, scale: c.im.scale * 1.15, duration: 160, yoyo: true }); audio.play('sfx_merge', { volume: 0.6 }); check(); });
  const starsNow = () => { const used = moves0 - st.moves, n = used <= turns + 1 ? 3 : used <= turns + 5 ? 2 : 1; stars.forEach((t, i) => t.setColor(i < n ? C.gold : '#7A6A58')); return n; };
  const ui = () => { mT.setText(String(st.moves)).setColor(st.moves <= 3 ? '#FF8A7A' : '#FFFFFF'); starsNow(); };
  const end = win => { if (st.done) return; st.done = true; const n = win ? starsNow() : 0; sc.time.delayedCall(win ? 1300 : 300, () => { root.destroy(); onEnd({ win, stars: n, fields: win ? targets.length : 0, level }); }); };
  const check = () => { const r = flow(); r.forEach(tc => { const i = [0, 2, 4].indexOf(tc); if (fieldMarks[i].text !== '🌱') { fieldMarks[i].setText('🌱'); sc.tweens.add({ targets: fieldMarks[i], scale: { from: 0.3, to: 1 }, duration: 400, ease: 'Back.easeOut' }); audio.play('sfx_coin', { volume: 0.5 }); } });
    if (r.length === targets.length) { audio.play('sfx_levelup', { volume: 0.8 }); tip.setText('좋아요! 밭이 촉촉해졌어요!'); for (const c of tiles) if (st.wet.has(c.x + ',' + c.y)) sc.tweens.add({ targets: c.im, alpha: { from: 1, to: 0.7 }, duration: 200, yoyo: true, repeat: 2 }); end(true); }
    else if (st.moves <= 0) { tip.setText('이동을 다 썼어요… 다음엔 꼭!'); end(false); } ui(); };
  for (const c of tiles) c.im.on('pointerup', () => { if (st.done || c.k === 'x') return; c.r = (c.r + 1) % 4; st.moves--; audio.play('sfx_tap', { volume: 0.5 }); sc.tweens.add({ targets: c.im, angle: c.r * 90 === 0 ? 360 : c.r * 90, duration: 140, onComplete: () => c.im.setAngle(c.r * 90) }); check(); });
  check(); window.__wt = { tiles, st }; return st; }
