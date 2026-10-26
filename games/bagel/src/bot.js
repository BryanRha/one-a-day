// 시험용 자동 플레이 (?bot=1): 굽기 → 진열 → 계산 → 돈 줍기 → 열기 칸 · 크림치즈 · 커피 · 쓰레기
import { IN } from './ui.js?v=0.59.2';
import { S } from './state.js?v=0.59.2';
export function startBot(app) {
  let goal = null, wait = 0, log = [], lastP = null, stuck = 0, side = 0;
  const go = (x, z) => { const g = app.game, p = g.pl.pos, c = g.st.counter;
    /* 계산대를 가로지르면 뒤쪽 모서리로 돌아감 */ const x0 = c.x - 190, x1 = c.x + 190, z0 = c.z - 75, z1 = c.z + 75; const seg = (ax, az, bx, bz) => { for (let i = 1; i < 20; i++) { const u = i / 20, X = ax + (bx - ax) * u, Z = az + (bz - az) * u; if (X > x0 && X < x1 && Z > z0 && Z < z1) return true; } return false; };
    if (seg(p.x, p.z, x, z)) { /* 모서리 4개로 가장 짧은 길 찾기 */ const N = [[p.x, p.z], [x0 - 40, z0 - 60], [x1 + 40, z0 - 60], [x0 - 40, z1 + 60], [x1 + 40, z1 + 60], [x, z]], D = N.map(() => 1e9), prev = N.map(() => -1), done = N.map(() => false); D[0] = 0;
      for (let k = 0; k < N.length; k++) { let u = -1; N.forEach((_, i) => { if (!done[i] && (u < 0 || D[i] < D[u])) u = i; }); done[u] = true; N.forEach((q, i) => { if (i !== u && !seg(N[u][0], N[u][1], q[0], q[1])) { const nd = D[u] + Math.hypot(q[0] - N[u][0], q[1] - N[u][1]); if (nd < D[i]) { D[i] = nd; prev[i] = u; } } }); }
      let i = 5; while (prev[i] > 0) i = prev[i]; if (prev[i] === 0) { x = N[i][0]; z = N[i][1]; } }
    if (side > 0) { side -= 0.1; const sx = (-(z - p.z) - (x - p.x)) / Math.SQRT2, sy = ((-(z - p.z)) + (x - p.x)) / Math.SQRT2, mm = Math.hypot(sx, sy) || 1; IN.x = sx / mm; IN.y = sy / mm; return false; }
    if (lastP && Math.hypot(p.x - lastP[0], p.z - lastP[1]) < 3 && Math.hypot(x - p.x, z - p.z) > 40) { if ((stuck += 0.1) > 0.8) { stuck = 0; side = 0.7; } } else stuck = 0; lastP = [p.x, p.z];
    const dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz); if (l < 30) { IN.x = IN.y = 0; return true; }
    /* 세계 방향 → 화면 방향 (RIGHT=(1,-1)/√2, DOWN=(1,1)/√2) */ const sx = (dx - dz) / Math.SQRT2, sy = (dx + dz) / Math.SQRT2, m = Math.hypot(sx, sy); IN.x = sx / m; IN.y = sy / m; return false; };
  setInterval(() => {
    const g = app.game; if (!g || !g.st) return; const pl = g.pl, c = g.st.counter, ov = g.st.oven; wait -= 0.1;
    if (document.querySelector('#modal').firstChild) { const b = document.querySelector('#modal .btn'); b && b.click(); return; }
    const pad = g.pads.find(p => S.coins >= Math.min(p.s.cost - p.paid, 30)); const pile = g.piles.find(p => p.v > 0);
    let t;
    const mx = g.st.mixer, kt = g.st.kettle;
    if (pl.kind === 'dough') t = kt && kt.inStack.length < 5 ? [kt.Z.io.x, kt.Z.io.z] : [ov.Z.out.x, ov.Z.out.z];
    else if (pl.kind === 'boiled') t = [ov.Z.out.x, ov.Z.out.z];
    else if (!pl.stack.length && kt && kt.stack.length >= 3 && ov.stack.length < 4) t = [kt.Z.io.x, kt.Z.io.z];
    else if (!pl.stack.length && mx && mx.stack.length >= 2 && ov.stack.length < 3 && (ov.feed || []).length < 4) t = [mx.Z.out.x, mx.Z.out.z];
    else if (pl.kind === 'trash') t = [g.st.bin.Z.drop.x, g.st.bin.Z.drop.z];
    else if (pl.stack.length && pl.kind && g.st.counter.shelf[pl.kind] && g.st.counter.shelf[pl.kind].length >= 12) t = pl.kind === 'bagel' && g.st.cc && g.st.cc.inStack.length < 8 ? [g.st.cc.Z.io.x, g.st.cc.Z.io.z] : [g.st.bin.Z.drop.x, g.st.bin.Z.drop.z];
    else if (pl.stack.length) t = pl.kind === 'bagel' && g.st.cc && c.shelf.cream.length < 2 && g.st.cc.inStack.length < 4 ? [g.st.cc.x, g.st.cc.z + 135] : pl.kind === 'bagel' && g.st.drive && g.st.drive.stack.length < 4 && c.shelf.bagel.length > 6 ? [g.st.drive.x - 110, g.st.drive.z] : [c.Z[pl.kind].x, c.Z[pl.kind].z];
    else if (pile && pile.v > 60 * (g.B.mult)) t = [pile.x, pile.z + 20];
    else if (pad && S.coins > 0) t = [pad.s.x, pad.s.z];
    else { const tt = Object.values(g.st).find(o => o.type === 'table' && o.trash.length >= 3); const need = g.cust.find(x => x.state === 'queue' && x.qi === 0)?.order.find(o => o.got < o.n);
      if (tt && !g.staff.some(w => w.k === 'cleaner')) t = [tt.x, tt.z + (pl.pos.z < tt.z ? -125 : 125)];
      else if (need && c.shelf[need.k].length) t = g.staff.some(w => w.k === 'cashier') ? (pile ? [pile.x, pile.z + 20] : [ov.x, ov.z + 130]) : [c.Z.cash.x, c.Z.cash.z];
      else if (need && need.k === 'cream' && g.st.cc) t = g.st.cc.stack.length ? [g.st.cc.x, g.st.cc.z + 135] : [ov.x, ov.z + 130];
      else if (need && need.k === 'coffee' && g.st.coffee) t = [g.st.coffee.x, g.st.coffee.z + 125];
      else if (pile) t = [pile.x, pile.z + 20];
      else t = [ov.x, ov.z + 130]; }
    window.botT = t; go(t[0], t[1]);
  }, 100);
  setInterval(() => { const g = app.game; log.push({ t: Math.round(performance.now() / 1000), coins: S.coins, earned: S.earned, unl: g.unl.size, sold: S.totalSold, bi: S.bi }); window.botLog = log; console.log('#bot', JSON.stringify(log[log.length - 1])); }, 10000);
}
