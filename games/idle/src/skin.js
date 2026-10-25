// Spine 식 원화 애니메이션: 원화 한 장에 메시(삼각형 그물)를 씌우고, 뼈대를 심고, 꼭짓점마다 뼈의 영향(가중치)을 섞어 휘게 함
//   - 뼈: 발(root) → 골반(hip) → 가슴(chest) → 머리(head) · 팔(armF/armB) · 다리(legF/legB) · 무기(gun) · 구슬(orb) · 머리카락/망토(부드러운 사슬, 스프링으로 늦게 따라옴)
//   - 가중치: 꼭짓점과 뼈 선분 사이 거리로 자동 계산 → 격자에서 몇 번 다듬어 관절이 부드럽게
//   - 동작: idle(숨쉬기·흔들림) · walk · attack(예비→휘두르기→복귀) · shoot(반동) · cast(시전) · hurt · die
//   좌표는 원화 기준 0~1 (x 오른쪽, y 아래). rig.flip = 원화가 왼쪽을 보고 있어 뒤집어야 함
import { RIGS } from './rigs.js?v=0.55.0';

const NX = 14, NY = 24, ease = t => 1 - Math.pow(1 - t, 3), sm = t => t * t * (3 - 2 * t);
const alphaCache = {};
function alphaMap(sc, key) {   // 원화의 투명도(작게) — 빈 칸 삼각형은 빼기 위해
  if (alphaCache[key]) return alphaCache[key];
  const src = sc.textures.get(key).getSourceImage(), w = 64, h = Math.round(64 * src.height / src.width), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, a = (x, y) => d[(Math.min(h - 1, Math.max(0, Math.floor(y * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(x * w)))) * 4 + 3];
  return (alphaCache[key] = { a, w, h });
}
const segDist = (px, py, ax, ay, bx, by, asp) => { const dx = (bx - ax) * asp, dy = by - ay, qx = (px - ax) * asp, qy = py - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, (qx * dx + qy * dy) / L)) : 0; return Math.hypot(qx - dx * t, qy - dy * t); };

export const hasRig = id => !!RIGS[id];
export class Skin {
  constructor(sc, id, h, o = {}) {
    const key = `hero_${id}`, rig = RIGS[id], src = sc.textures.get(key).getSourceImage(); this.sc = sc; this.rig = rig; this.id = id;
    this.W = src.width; this.Hs = src.height; this.k = h / this.Hs; this.face = (o.face || 1) * (rig.flip ? -1 : 1); this.asp = this.W / this.Hs;
    this.t = Math.random() * 10; this.ph = Math.random() * 6; this.walking = false; this.act0 = null; this.at = 0; this.hitT = 0; this.dead = 0; this.tintT = 0; this.alpha = 1;
    // 뼈 (부모가 먼저 오게 정의) — p: 관절 · e: 끝 · soft: 스프링 사슬
    this.bones = rig.bones.map(b => ({ ...b, a: 0, tx: 0, ty: 0, s: 1, va: 0, sa: 0 }));
    this.byName = {}; this.bones.forEach((b, i) => { this.byName[b.n] = i; b.pi = b.parent ? this.byName[b.parent] : -1; });
    // 메시: 원화 위 격자 (빈 칸 빼기) — 꼭짓점은 원화 좌표(0~1)
    const am = alphaMap(sc, key), verts = [], uvs = [], idx = [], P = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY; P.push([u, v]); uvs.push(u, v); verts.push(0, 0); }
    const id0 = (i, j) => j * (NX + 1) + i, filled = (i, j) => { for (let yy = 0; yy <= 2; yy++) for (let xx = 0; xx <= 2; xx++) if (am.a((i + xx / 2) / NX, (j + yy / 2) / NY) > 8) return true; return false; };
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (filled(i, j)) { const a = id0(i, j), b = a + 1, c = id0(i, j + 1), d = c + 1; idx.push(a, c, b, b, c, d); }
    this.P = P; this.idx = idx; this.X = new Float32Array(P.length); this.Y = new Float32Array(P.length);
    this.mesh = sc.add.mesh(0, 0, key); this.mesh.addVertices(verts, uvs, idx); this.mesh.hideCCW = false; this.mesh.ignoreDirtyCache = true; this.mesh.setOrtho(sc.scale.width, sc.scale.height);
    this.onResize = gs => this.mesh.setOrtho(gs.width, gs.height); sc.scale.on('resize', this.onResize); this.mesh.once('destroy', () => sc.scale.off('resize', this.onResize));
    // 가중치: 뼈 선분까지 거리 → 가까운 3개 · 격자 다듬기
    const nb = this.bones.length, W0 = P.map(([u, v]) => { const ws = this.bones.map(b => { const d = segDist(u, v, b.p[0], b.p[1], b.e[0], b.e[1], this.asp) / (b.r || 1); return 1 / Math.pow(d + 0.012, 4); }); const s = ws.reduce((x, y) => x + y, 0); return ws.map(w => w / s); });
    let Wm = W0; for (let pass = 0; pass < 2; pass++) Wm = Wm.map((w, k) => { const i = k % (NX + 1), j = Math.floor(k / (NX + 1)), out = w.map(x => x * 2); let n = 2; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii > NX || jj > NY) continue; const ww = Wm[jj * (NX + 1) + ii]; for (let q = 0; q < nb; q++) out[q] += ww[q]; n++; } return out.map(x => x / n); });
    this.Wt = Wm.map(w => { const top = w.map((x, q) => [x, q]).sort((a, b) => b[0] - a[0]).slice(0, 3), s = top.reduce((a, b) => a + b[0], 0); return top.map(([x, q]) => [q, x / s]); });
    this.M = this.bones.map(() => [1, 0, 0, 1, 0, 0]);
  }
  get height() { return this.Hs * this.k; }
  get x() { return this.mesh.x; } get y() { return this.mesh.y; }
  setPos(x, y) { this.mesh.x = x; this.mesh.y = y; return this; }
  act(kind) { if (this.dead) return; this.act0 = kind; this.at = 0; }
  hurt() { if (this.dead) return; this.hitT = 0.3; this.tint(0xFF8A8A); }
  flash() { this.tint(0xFFF6D8, 0.06); }
  tint(c, t = 0.12) { this.tintT = t; for (const v of this.mesh.vertices) v.color = c; }
  die() { this.dead = 0.001; }
  revive() { this.dead = 0; this.mesh.setAlpha(1); }
  ghost() {}
  setDepth(d) { this.mesh.setDepth(d); return this; }
  destroy() { this.mesh.destroy(); }
  // 동작 → 뼈 각도(도) · 이동(원화 높이 비율)
  pose(dt) {
    const t = this.t, ph = this.ph, B = this.bones, by = n => B[this.byName[n]], set = (n, a, tx = 0, ty = 0, s = 1) => { const b = by(n); if (b) { b.a += a; b.tx += tx; b.ty += ty; b.s *= s; } };
    B.forEach(b => { b.a = 0; b.tx = 0; b.ty = 0; b.s = 1; });
    const role = this.rig.kind || 'melee', br = Math.sin(t * 2.3 + ph);
    // 숨쉬기 · 기본 흔들림
    set('chest', br * 1.6, 0, br * -0.004); set('head', -br * 2.2 + Math.sin(t * 1.1 + ph) * 1.5); set('hip', Math.sin(t * 1.2 + ph) * 0.8);
    set('armF', Math.sin(t * 2.3 + ph + 0.6) * 3); set('armB', Math.sin(t * 2.3 + ph + 1.2) * -3); set('gun', br * 1.5); set('orb', 0, Math.sin(t * 2.6) * 0.004, Math.sin(t * 1.9 + ph) * 0.012);
    if (this.rig.float) set('root', 0, 0, Math.sin(t * 2 + ph) * 0.01);
    // 걷기: 다리 교차 · 골반 반동 · 팔 흔들기
    if (this.walking) { const w = Math.sin(t * 9 + ph), bob = Math.abs(Math.cos(t * 9 + ph)); set('legF', w * 18); set('legB', -w * 18); set('root', 0, 0, -bob * 0.018); set('hip', w * 2); set('armF', -w * 12); set('armB', w * 12); set('chest', 3); }
    // 행동
    if (this.act0) { this.at += dt; const a = this.at;
      if (this.act0 === 'attack') { const T1 = 0.14, T2 = 0.24, T3 = 0.48; let k1 = 0, k2 = 0;
        if (a < T1) k1 = ease(a / T1); else if (a < T2) { k1 = 1 - ease((a - T1) / (T2 - T1)); k2 = ease((a - T1) / (T2 - T1)); } else if (a < T3) k2 = 1 - sm((a - T2) / (T3 - T2)); else this.act0 = null;
        const sw = this.rig.swing || 1; set('armF', (-55 * k1 + 85 * k2) * sw); set('armB', (-20 * k1 + 30 * k2) * sw); set('chest', -8 * k1 + 12 * k2); set('hip', -4 * k1 + 6 * k2); set('head', 4 * k1 - 4 * k2); set('root', 0, 0.12 * k2, 0); set('gun', -25 * k1 + 40 * k2); }
      else if (this.act0 === 'shoot') { const T = 0.32; if (a < T) { const k = a < 0.05 ? a / 0.05 : 1 - sm((a - 0.05) / (T - 0.05)); set('gun', -9 * k, -0.02 * k, 0); set('armF', -9 * k); set('armB', -9 * k); set('chest', -4 * k); set('head', -3 * k); } else this.act0 = null; }
      else if (this.act0 === 'cast') { const T = 0.7; if (a < T) { const k = Math.sin(Math.PI * a / T); set('armF', -40 * k); set('armB', 30 * k); set('chest', -5 * k); set('head', -6 * k); set('root', 0, 0, -0.03 * k); set('orb', 0, 0.03 * k, -0.06 * k); } else this.act0 = null; }
      else this.act0 = null; }
    if (this.hitT > 0) { this.hitT -= dt; const k = sm(this.hitT / 0.3); set('chest', -10 * k); set('head', -10 * k); set('root', 0, -0.04 * k, 0); }
    if (this.dead) { this.dead = Math.min(1, this.dead + dt * 2); const k = ease(this.dead); set('root', -70 * k, -0.1 * k, 0); set('head', -15 * k); this.mesh.setAlpha(1 - 0.65 * k); }
    // 부드러운 사슬(머리카락 · 망토 · 깃털): 부모가 움직인 만큼 늦게 따라오며 출렁임
    for (const b of B) if (b.soft) { const par = B[b.pi], target = -(par ? par.a : 0) * 0.8 + Math.sin(t * 3 + ph + b.p[1] * 6) * (b.soft * 3) + (this.walking ? -6 : 0) * b.soft;
      b.va += (target - b.sa) * 40 * dt; b.va *= Math.pow(0.02, dt); b.sa += b.va * dt; b.a += b.sa; }
  }
  update(dt) {
    this.t += dt; this.pose(dt); const B = this.bones, M = this.M, Hs = this.Hs, Wd = this.W;
    if (this.tintT > 0) { this.tintT -= dt; if (this.tintT <= 0) for (const v of this.mesh.vertices) v.color = 0xFFFFFF; }
    // 뼈 행렬: 부모 · 관절 둘레 회전 · 크기 · 이동 (원화 픽셀 좌표)
    for (let i = 0; i < B.length; i++) { const b = B[i], px = b.p[0] * Wd, py = b.p[1] * Hs, r = b.a * Math.PI / 180, c = Math.cos(r) * b.s, s = Math.sin(r) * b.s;
      const L = [c, s, -s, c, px - c * px + s * py + b.tx * Hs, py - s * px - c * py + b.ty * Hs], P = b.pi >= 0 ? M[b.pi] : [1, 0, 0, 1, 0, 0];
      M[i] = [P[0] * L[0] + P[2] * L[1], P[1] * L[0] + P[3] * L[1], P[0] * L[2] + P[2] * L[3], P[1] * L[2] + P[3] * L[3], P[0] * L[4] + P[2] * L[5] + P[4], P[1] * L[4] + P[3] * L[5] + P[5]]; }
    // 꼭짓점: 가중치로 섞기 → 화면(발이 원점, 위가 +y)
    const vs = this.mesh.vertices, k = this.k, f = this.face, ax = this.rig.root[0] * Wd, ay = this.rig.root[1] * Hs;
    const X = this.X, Y = this.Y;
    for (let n = 0; n < this.P.length; n++) { const x0 = this.P[n][0] * Wd, y0 = this.P[n][1] * Hs; let x = 0, y = 0;
      for (const [q, w] of this.Wt[n]) { const m = M[q]; x += w * (m[0] * x0 + m[2] * y0 + m[4]); y += w * (m[1] * x0 + m[3] * y0 + m[5]); }
      X[n] = (x - ax) * k * f; Y[n] = -(y - ay) * k; }
    const ix = this.idx; for (let i = 0; i < vs.length; i++) { const n = ix[i]; vs[i].x = X[n]; vs[i].y = Y[n]; }
  }
}
