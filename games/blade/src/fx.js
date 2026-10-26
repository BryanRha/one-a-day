// 효과: 입자(한 번에 그리는 사각형 묶음) · 무기 궤적 · 충격파 고리 · 바닥 경고 · 번쩍이는 빛
import * as THREE from 'three';
import { E } from './engine.js?v=0.61.1';
import { glowTex, sparkTex, ringTex, smokeTex, slashTex, decalTex } from './fxtex.js?v=0.61.1';

const VS = `attribute vec3 iOff; attribute vec2 iScale; attribute float iRot; attribute vec4 iCol; varying vec2 vUv; varying vec4 vCol;
void main(){ vUv = uv; vCol = iCol; vec4 mv = modelViewMatrix * vec4(iOff, 1.0); float c = cos(iRot), s = sin(iRot); vec2 p = position.xy * iScale; mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y); gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol; void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vCol.rgb * t.rgb, vCol.a * t.a); }`;

class Particles {
  constructor(tex, max, additive) {
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    this.off = new Float32Array(max * 3); this.sc = new Float32Array(max * 2); this.rot = new Float32Array(max); this.col = new Float32Array(max * 4);
    g.setAttribute('iOff', new THREE.InstancedBufferAttribute(this.off, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('iScale', new THREE.InstancedBufferAttribute(this.sc, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iRot', new THREE.InstancedBufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0; this.g = g; this.max = max; this.ps = [];
    const m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 20 : 10;
  }
  // o: x,y,z vx,vy,vz life size size1 col(THREE.Color|hex) a grav drag rot rv stretch(빠를수록 길게)
  add(o) { if (this.ps.length >= this.max) this.ps.shift(); const c = new THREE.Color(o.col ?? 0xffffff);
    this.ps.push({ x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, t: 0, life: o.life || 0.5, s0: o.size || 40, s1: o.size1 ?? (o.size || 40), r: c.r, g: c.g, b: c.b, a: o.a ?? 1,
      grav: o.grav || 0, drag: o.drag ?? 0, rot: o.rot ?? Math.random() * 6.28, rv: o.rv || 0, st: o.stretch || 0, fade: o.fade ?? 1 }); }
  update(dt) {
    const V = E.camera.matrixWorldInverse.elements; let n = 0; const ps = this.ps;
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.t += dt; if (p.t >= p.life) { ps.splice(i, 1); continue; } }
    for (const p of ps) {
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.rv * dt;
      const u = p.t / p.life, s = p.s0 + (p.s1 - p.s0) * u, a = p.a * (p.fade ? (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) : 1);
      let sx = s, sy = s, rot = p.rot;
      if (p.st) { const vx = V[0] * p.vx + V[4] * p.vy + V[8] * p.vz, vy = V[1] * p.vx + V[5] * p.vy + V[9] * p.vz; rot = Math.atan2(vy, vx); sx = s * (1 + Math.hypot(vx, vy) * p.st); sy = s * 0.28; }
      this.off[n * 3] = p.x; this.off[n * 3 + 1] = p.y; this.off[n * 3 + 2] = p.z; this.sc[n * 2] = sx; this.sc[n * 2 + 1] = sy; this.rot[n] = rot;
      this.col[n * 4] = p.r; this.col[n * 4 + 1] = p.g; this.col[n * 4 + 2] = p.b; this.col[n * 4 + 3] = Math.max(0, a); n++; }
    this.g.instanceCount = n; for (const k of ['iOff', 'iScale', 'iRot', 'iCol']) this.g.attributes[k].needsUpdate = true;
  }
}

// 무기 궤적: 칼 밑동~끝 두 점을 매 프레임 기록 → 부드러운 띠 (최근일수록 진함)
const TVS = `attribute float aA; varying float vA; varying vec2 vUv; void main(){ vA = aA; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TFS = `uniform sampler2D map; uniform vec3 col; uniform vec3 core; varying float vA; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vec2(vUv.x, vUv.y)); vec3 c = mix(col, core, smoothstep(0.75, 1.0, vUv.y)); gl_FragColor = vec4(c * t.a * vA * 1.6, t.a * vA); }`;
export class Trail {
  constructor(col = 0xffc46a, core = 0xffffff, seg = 28) {
    this.seg = seg; this.raw = []; const n = seg + 1; this.pos = new Float32Array(n * 2 * 3); this.al = new Float32Array(n * 2); const uv = new Float32Array(n * 4), idx = [];
    for (let i = 0; i < n; i++) { uv[i * 4] = i / seg; uv[i * 4 + 1] = 0; uv[i * 4 + 2] = i / seg; uv[i * 4 + 3] = 1; if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aA', new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: slashTex() }, col: { value: new THREE.Color(col) }, core: { value: new THREE.Color(core) } }, vertexShader: TVS, fragmentShader: TFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 25; this.g = g; this.on = false; this.keep = 0.16;
  }
  color(c, k = 0xffffff) { this.mat.uniforms.col.value.set(c); this.mat.uniforms.core.value.set(k); }
  push(a, b, t) { if (this.on) this.raw.push({ a: a.clone(), b: b.clone(), t }); while (this.raw.length && t - this.raw[0].t > this.keep) this.raw.shift(); while (this.raw.length > 14) this.raw.shift(); this.build(t); }
  build(t) {
    const R = this.raw, n = this.seg + 1; if (R.length < 2) { this.al.fill(0); this.g.attributes.aA.needsUpdate = true; return; }
    const cr = (p0, p1, p2, p3, u, o) => { const u2 = u * u, u3 = u2 * u; o.x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      o.y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3); o.z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * u + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3); return o; };
    const A = new THREE.Vector3(), B = new THREE.Vector3(), L = R.length - 1;
    for (let i = 0; i < n; i++) { const f = i / this.seg * L, k = Math.min(L - 1, Math.floor(f)), u = f - k, g = j => R[Math.max(0, Math.min(L, j))];
      cr(g(k - 1).a, g(k).a, g(k + 1).a, g(k + 2).a, u, A); cr(g(k - 1).b, g(k).b, g(k + 1).b, g(k + 2).b, u, B);
      this.pos.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6); const age = t - (R[k].t + (R[Math.min(L, k + 1)].t - R[k].t) * u), al = Math.max(0, 1 - age / this.keep) * (i / this.seg); this.al[i * 2] = al; this.al[i * 2 + 1] = al; }
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aA.needsUpdate = true;
  }
}

export const FX = { root: null, glow: null, spark: null, smoke: null, rings: [], decals: [], light: null, lightT: 0 };
export function initFX(scene) {
  FX.root = new THREE.Group(); scene.add(FX.root);
  FX.glow = new Particles(glowTex(), 400, true); FX.spark = new Particles(sparkTex(), 400, true); FX.smoke = new Particles(smokeTex(), 220, false); FX.ember = new Particles(glowTex(), 300, true);
  for (const p of [FX.smoke, FX.glow, FX.spark, FX.ember]) FX.root.add(p.mesh);
  FX.light = new THREE.PointLight(0xffb060, 0, 900, 1.6); FX.root.add(FX.light);
  return FX;
}
export function clearFX() { for (const p of [FX.glow, FX.spark, FX.smoke, FX.ember]) p.ps.length = 0; for (const r of FX.rings) FX.root.remove(r.m); FX.rings.length = 0; for (const d of FX.decals) FX.root.remove(d.g); FX.decals.length = 0; }
export function updateFX(dt) {
  if (!FX.root) return; FX.glow.update(dt); FX.spark.update(dt); FX.smoke.update(dt); FX.ember.update(dt);
  for (let i = FX.rings.length - 1; i >= 0; i--) { const r = FX.rings[i]; r.t += dt; const u = r.t / r.life; if (u >= 1) { FX.root.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); FX.rings.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - u, 2.4), s = r.r0 + (r.r1 - r.r0) * e; r.m.scale.set(s, s, s); r.m.material.opacity = r.a * (1 - u); }
  if (FX.lightT > 0) { FX.lightT -= dt; FX.light.intensity = Math.max(0, FX.lightT / 0.18) * FX.lightI; } else FX.light.intensity = 0;
}
// 터짐: 맞은 자리 불꽃 + 섬광
export function burst(p, o = {}) {
  const col = o.col ?? 0xffc46a, n = o.n ?? 10, sp = o.speed ?? 900;
  FX.glow.add({ x: p.x, y: p.y, z: p.z, life: 0.14, size: (o.size ?? 150) * 1.1, size1: (o.size ?? 150) * 1.7, col: o.core ?? 0xfff2d0, a: 0.75 });
  FX.glow.add({ x: p.x, y: p.y, z: p.z, life: 0.26, size: (o.size ?? 150) * 0.85, size1: (o.size ?? 150) * 1.4, col, a: 0.6 });
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, e = (Math.random() - 0.3) * 1.4, v = sp * (0.4 + Math.random() * 0.8);
    FX.spark.add({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * v, vy: Math.sin(e) * v * 0.8 + 200, vz: Math.sin(a) * v, life: 0.22 + Math.random() * 0.25, size: 26 + Math.random() * 22, size1: 6, col, grav: 1800, drag: 3, stretch: 0.012 }); }
}
// 베기 섬광 (X 자 칼자국)
export function slashMark(p, ang, o = {}) {
  const col = o.col ?? 0xffe0a0, s = o.size ?? 260;
  FX.spark.add({ x: p.x, y: p.y, z: p.z, life: 0.14, size: s, size1: s * 1.3, col, rot: ang, a: 1, fade: 0 });
  if (o.cross) FX.spark.add({ x: p.x, y: p.y, z: p.z, life: 0.14, size: s * 0.8, size1: s, col, rot: ang + 1.4, a: 0.9, fade: 0 });
}
export function dust(p, o = {}) {
  const n = o.n ?? 8, col = o.col ?? 0xb8a88c;
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (o.speed ?? 260) * (0.4 + Math.random() * 0.8);
    FX.smoke.add({ x: p.x + Math.cos(a) * 20, y: (p.y || 0) + 20 + Math.random() * 30, z: p.z + Math.sin(a) * 20, vx: Math.cos(a) * v, vy: 40 + Math.random() * 90, vz: Math.sin(a) * v, life: 0.7 + Math.random() * 0.6, size: (o.size ?? 90), size1: (o.size ?? 90) * 2.4, col, a: o.a ?? 0.55, drag: 3.2 }); }
}
// 바닥 충격파 고리
export function ring(p, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ringTex(), color: o.col ?? 0xffd08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o.a ?? 1 }));
  m.rotation.x = -Math.PI / 2; m.position.set(p.x, (p.y || 0) + 4, p.z); m.renderOrder = 15; FX.root.add(m);
  FX.rings.push({ m, t: 0, life: o.life ?? 0.45, r0: o.r0 ?? 30, r1: o.r1 ?? 420, a: o.a ?? 1 });
}
export function flashLight(p, col = 0xffb060, i = 6) { FX.light.position.set(p.x, (p.y || 0) + 160, p.z); FX.light.color.set(col); FX.lightI = i; FX.lightT = 0.18; }
// 바닥 경고: 원/부채꼴 (안쪽이 점점 차오름) — 돌려준 객체의 set(u) 로 진행, kill() 로 지움
export function decal(p, ang, r, arc = Math.PI * 2, col = 0xff3b2a) {
  const g = new THREE.Group(); g.position.set(p.x, 3, p.z); g.rotation.y = ang;
  const geo = new THREE.CircleGeometry(1, 40, -Math.PI / 2 - arc / 2, arc); geo.rotateX(-Math.PI / 2);
  const mk = a => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: decalTex(), color: col, transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending }));
  const out = mk(0.55), fill = mk(0.5); out.scale.setScalar(r); fill.scale.setScalar(0.01); g.add(out, fill); g.renderOrder = 5; FX.root.add(g);
  const d = { g, set: u => { const s = Math.max(0.01, r * Math.min(1, u)); fill.scale.set(s, 1, s); }, kill: () => { FX.root.remove(g); geo.dispose(); const i = FX.decals.indexOf(d); if (i >= 0) FX.decals.splice(i, 1); } };
  FX.decals.push(d); return d;
}
