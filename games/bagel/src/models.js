// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (사람 · 베이글 · 커피 · 설비 · 가게)
import * as THREE from 'three';
import { BRAND } from './data.js?v=0.57.3';

const gm = (() => { const d = new Uint8Array([95, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
export const M = c => mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
export function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; }
const G = {}; const geo = (k, f) => G[k] ||= f();
export const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, s = 16) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), M(c), x, y + h / 2, z, p);
export const sph = (r, c, x, y, z, p, ws = 14, hs = 10) => mesh(geo(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p);
// ── 물건: 베이글 · 크림치즈 베이글 · 커피 · 쓰레기
export const ITEM_H = { bagel: 15, cream: 18, coffee: 30, trash: 12, box: 30 };
export function item(kind) {
  const g = new THREE.Group();
  if (kind === 'bagel' || kind === 'cream' || kind === 'blue' || kind === 'onion') {
    const col = { bagel: 0xD98A3A, cream: 0xD98A3A, blue: 0x8A5A9A, onion: 0xC8742A }[kind];
    mesh(geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2)), M(col), 0, 7.5, 0, g);
    if (kind === 'bagel') for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; sph(1.8, 0xFFF6E0, Math.cos(a) * 15, 14, Math.sin(a) * 15, g, 4, 3); }
    if (kind === 'cream') cyl(16, 16, 4, 0xFFFBF2, 0, 13, 0, g);
  } else if (kind === 'coffee') { cyl(11, 8, 24, 0xFFFFFF, 0, 0, 0, g, 12); cyl(11.5, 11.5, 6, 0x9A643A, 0, 14, 0, g, 12); cyl(12, 12, 3, 0xFFFFFF, 0, 24, 0, g, 12); }
  else if (kind === 'trash') { cyl(14, 14, 3, 0xFFFFFF, 0, 0, 0, g, 12); box(14, 8, 10, 0xD8C8B0, 0, 3, 0, g); }
  return g;
}
// ── 사람: 동그란 몸 · 머리 · 모자 · 팔다리 (걸을 때 흔듦)
export function person(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mesh(geo('pbody', () => new THREE.CapsuleGeometry(30, 34, 6, 12)), M(o.body || 0xF28C38), 0, 62, 0, body);
  if (o.apron) mesh(geo('papron', () => new THREE.CapsuleGeometry(31, 20, 6, 12)), M(0xFFFFFF), 0, 54, 4, body).scale.set(0.96, 1, 0.92);
  sph(32, 0xFFDDBF, 0, 128, 0, body, 18, 14);
  mesh(geo('phair', () => new THREE.SphereGeometry(33, 18, 14, 0, 6.28, 0, 1.4)), M(o.hair || 0x5A3A22), 0, 132, -2, body);
  if (o.cap) { cyl(30, 32, 22, o.cap, 0, 150, 0, body); cyl(22, 22, 4, o.cap, 0, 150, 24, body); }
  for (const s of [-1, 1]) { sph(4, 0x2A1A10, s * 11, 130, 29, body, 8, 6); sph(5, 0xFFB3A0, s * 20, 120, 24, body, 8, 6); }
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(s * 14, 26, 0); g.add(L); mesh(geo('pleg', () => new THREE.CapsuleGeometry(10, 12, 4, 8)), M(o.pants || 0x6A4A3A), 0, -12, 0, L); return L; });
  const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * 31, 88, 0); body.add(A); mesh(geo('parm', () => new THREE.CapsuleGeometry(8, 20, 4, 8)), M(o.body || 0xF28C38), 0, -16, 0, A); return A; });
  const hand = new THREE.Group(); hand.position.set(0, 74, 34); body.add(hand);   /* 들고 있는 물건이 쌓이는 곳 */
  const P = { g, body, legs, arms, hand, t: Math.random() * 6, carry: false };
  P.anim = (dt, moving) => { P.t += dt * (moving ? 12 : 2); const s = moving ? Math.sin(P.t) : 0;
    legs[0].rotation.x = s * 0.7; legs[1].rotation.x = -s * 0.7; body.position.y = moving ? Math.abs(Math.cos(P.t)) * 4 : Math.sin(P.t) * 1.2;
    for (let i = 0; i < 2; i++) arms[i].rotation.x = P.carry ? -1.25 : (i ? s : -s) * 0.6; };
  if (o.bubble) { const b = new THREE.Group(); b.position.set(0, 210, 0); g.add(b); mesh(geo('bub', () => new THREE.SphereGeometry(28, 16, 12)), M(0xFFFFFF), 0, 0, 0, b).scale.set(1.25, 1, 0.5); P.bubble = b; }
  return P;
}
// ── 가게 바닥 · 벽 · 창 · 간판
export function shopShell(sc, W, D, theme) {
  const ft = document.createElement('canvas'); ft.width = ft.height = 128; const fx = ft.getContext('2d'); fx.fillStyle = theme.floorA; fx.fillRect(0, 0, 128, 128); fx.fillStyle = theme.floorB; fx.fillRect(0, 0, 64, 64); fx.fillRect(64, 64, 64, 64);
  const t = new THREE.CanvasTexture(ft); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 140, D / 140); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const f = mesh(new THREE.BoxGeometry(W, 20, D), new THREE.MeshToonMaterial({ map: t, gradientMap: gm }), 0, -10, 0, sc); f.castShadow = false;
  const out = mesh(new THREE.BoxGeometry(W + 3000, 10, D + 3000), M(theme.outside), 0, -16, 0, sc); out.castShadow = false;
  box(W, 230, 30, theme.wallA, 0, 0, -D / 2, sc); box(30, 230, D, theme.wallB, -W / 2, 0, 0, sc); box(W + 4, 24, 36, theme.trim, 0, 230, -D / 2, sc); box(36, 24, D + 4, theme.trim, -W / 2, 230, 0, sc);
  for (let x = -W / 2 + 260; x < W / 2 - 150; x += 380) { box(220, 120, 8, 0xBFE3F2, x, 70, -D / 2 + 16, sc); box(230, 10, 14, 0xFFFFFF, x, 60, -D / 2 + 18, sc); }
  for (let z = -D / 2 + 300; z < D / 2 - 200; z += 420) { box(8, 120, 200, 0xBFE3F2, -W / 2 + 16, 70, z, sc); }
  const st = document.createElement('canvas'); st.width = 512; st.height = 128; const sx = st.getContext('2d'); sx.fillStyle = BRAND.dark; sx.beginPath(); sx.roundRect(4, 4, 504, 120, 50); sx.fill(); sx.fillStyle = '#FFF3E2'; sx.font = '900 58px P'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText(BRAND.sign, 256, 68);
  const tx = new THREE.CanvasTexture(st); tx.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(360, 90), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); sign.position.set(-W / 2 + 520, 190, -D / 2 + 17); sc.add(sign);
}
// ── 설비 (위치는 group 기준 · 받는 곳/내놓는 곳 좌표는 game.js 에서)
export const STATION = {
  oven(p) { box(200, 170, 140, 0xC0583A, 0, 0, 0, p); box(210, 16, 150, 0x8A3A26, 0, 170, 0, p); mesh(new THREE.BoxGeometry(120, 60, 4), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 90, 72, p); box(30, 80, 30, 0x8A3A26, 60, 186, -30, p); box(180, 10, 60, 0x9A643A, 0, 0, 100, p); },
  counter(p) { box(320, 100, 110, 0xF7F0E6, 0, 0, 0, p); box(330, 14, 120, 0x9A643A, 0, 100, 0, p); box(70, 50, 50, 0x4A4A55, 110, 114, -10, p); },
  ccbar(p) { box(220, 95, 110, 0xFFFFFF, 0, 0, 0, p); box(230, 12, 120, 0x9A643A, 0, 95, 0, p); [0xFFFBF2, 0xF6D6E8, 0xE6F2C8, 0xFFE9B8].forEach((c, i) => cyl(18, 18, 22, c, -75 + i * 50, 107, -20, p)); },
  coffee(p) { box(130, 150, 100, 0xB8C0C8, 0, 0, 0, p); box(140, 14, 110, 0x5A606A, 0, 150, 0, p); box(60, 30, 20, 0x2A2A30, 0, 100, 52, p); },
  table(p) { cyl(70, 70, 10, 0xFFFFFF, 0, 78, 0, p, 24); cyl(10, 16, 78, 0x9A643A, 0, 0, 0, p, 10);
    for (const a of [0, Math.PI]) { const c = new THREE.Group(); c.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95); p.add(c); cyl(30, 30, 10, BRAND.accentHex, 0, 40, 0, c); cyl(6, 6, 40, 0x9A643A, 0, 0, 0, c, 8); } },
  bin(p) { cyl(34, 30, 80, 0x5A8A5A, 0, 0, 0, p); cyl(36, 36, 8, 0x3A6A3A, 0, 80, 0, p); },
  drive(p) { box(30, 230, 260, 0xEFD9BC, 0, 0, 0, p); box(10, 110, 150, 0xBFE3F2, 18, 80, 0, p); box(120, 14, 170, 0x9A643A, 70, 95, 0, p); box(16, 95, 16, 0x7A4A2A, 120, 0, -70, p); box(16, 95, 16, 0x7A4A2A, 120, 0, 70, p); },
  plant(p) { cyl(34, 26, 60, 0xE7B98A, 0, 0, 0, p, 12); sph(55, 0x7FBF6A, 0, 110, 0, p, 12, 10).scale.set(1, 1.2, 1); },
  desk(p) { box(160, 80, 80, 0x9A643A, 0, 0, 0, p); box(170, 10, 90, 0xC08A5A, 0, 80, 0, p); box(40, 30, 6, 0x4A4A55, 0, 90, -20, p); },
};
// 자동차 (드라이브스루)
export function car(col) { const g = new THREE.Group(); box(200, 60, 110, col, 0, 20, 0, g); box(120, 50, 100, col, -10, 80, 0, g); box(110, 40, 102, 0xBFE3F2, -10, 84, 0, g).scale.set(1, 1, 1.01);
  for (const [x, z] of [[60, 55], [-60, 55], [60, -55], [-60, -55]]) mesh(geo('wheel', () => new THREE.CylinderGeometry(22, 22, 16, 14).rotateX(Math.PI / 2)), M(0x2A2A30), x, 22, z, g); return g; }
