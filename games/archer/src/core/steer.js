// 자동 조종 (봇·브라우저 자동 시험 공용)
import { AW, AH, CELL } from './sim.js?v=0.17.8';
// 칸 단위 길찾기 (BFS) → 다음 칸 중심 방향
export function pathTo(s, p, tx, ty) {
  const C0 = [Math.floor(p.x / CELL), Math.floor(p.y / CELL)], W = s.grid[0].length, H = s.grid.length, prev = new Map(), q = [[tx, ty]], key = (x, y) => x + ',' + y;
  prev.set(key(tx, ty), null);
  while (q.length) { const [x, y] = q.shift(); if (x === C0[0] && y === C0[1]) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || s.grid[ny][nx] || prev.has(key(nx, ny))) continue; prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); } }
  const nx = prev.get(key(...C0)); if (!nx) return [(tx * CELL + CELL / 2 - p.x) / 200, (ty * CELL + CELL / 2 - p.y) / 200];
  const gx = nx[0] * CELL + CELL / 2, gy = nx[1] * CELL + CELL / 2; return [(gx - p.x) / 60, (gy - p.y) / 60];
}
export function steer(s, SKILL = 0.55) {
  let mx = 0, my = 0; const p = s.p;
      if (s.doorOpen) { if (s.npc && !s.npc.used) { if (s.auto !== false) s.useNpc(s.npc.type === 'angel' ? 'heal' : 'no'); else return [(s.npc.x - p.x) / 100, (s.npc.y - p.y) / 100]; } [mx, my] = pathTo(s, p, 4, 0); }
      else {
        if (Math.random() < SKILL) for (const f of s.foes) { const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy); if (d < 260) { const dot = (f.vx * dx + f.vy * dy) / (Math.hypot(f.vx, f.vy) * d); if (dot > 0.6) { mx += -f.vy / 300 * Math.sign(f.vx * dy - f.vy * dx); my += f.vx / 300 * Math.sign(f.vx * dy - f.vy * dx); } } }
        for (const m of s.mons) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + 170) { mx += dx / d; my += dy / d; } }
        // 경고(빨간 선·원) 피하기 · 가시 함정 피하기 (실력만큼)
        if (Math.random() < SKILL) for (const w of s.warns || []) { if (w.k === 'circle') { const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy) || 1; if (d < w.r + 40) { mx += dx / d * 2; my += dy / d * 2; } } else { const lx = w.x2 - w.x1, ly = w.y2 - w.y1, L = Math.hypot(lx, ly) || 1, t = ((p.x - w.x1) * lx + (p.y - w.y1) * ly) / (L * L); if (t > 0 && t < 1) { const px = w.x1 + lx * t, py = w.y1 + ly * t, dd = Math.hypot(p.x - px, p.y - py); if (dd < w.w / 2 + 50) { mx += (p.x - px) / (dd || 1) * 2; my += (p.y - py) / (dd || 1) * 2; } } } }
        if ((s.spikeWarn || s.spikeUp) && Math.random() < SKILL) { const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL); if ((s.spikes || []).some(k => k.cx === cx && k.cy === cy)) { const sp = s.spikes.find(k => k.cx === cx && k.cy === cy); mx += (p.x - (cx + 0.5) * CELL) / 40 || 1; my += 1.5; } }
        if (Math.hypot(mx, my) > 0.3) { mx += (AW / 2 - p.x) / AW * 1.6; my += (AH * 0.6 - p.y) / AH * 1.6; }   // 구석으로 몰리지 않게
        const tg = s.nearest(p);
        if (Math.hypot(mx, my) < 0.3) {
          if (tg && !s.los(p, tg)) {   // 보이는 칸으로: 가까운 빈 칸 중 적이 보이는 곳
            let best = null; for (let y = 0; y < s.grid.length; y++) for (let x = 0; x < s.grid[0].length; x++) { if (s.grid[y][x]) continue; const c = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 }; if (!s.los(c, tg)) continue; const d = Math.hypot(c.x - p.x, c.y - p.y) + Math.hypot(c.x - tg.x, c.y - tg.y) * 0.2; if (!best || d < best.d) best = { d, x, y }; }
            if (best) [mx, my] = pathTo(s, p, best.x, best.y); else { mx = 0; my = 0; }
          } else { mx = 0; my = 0; }
        }
      }
  return [mx, my];
}
