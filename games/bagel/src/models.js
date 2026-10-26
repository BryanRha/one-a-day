// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (사람 · 베이글 · 커피 · 설비 · 가게)
import * as THREE from 'three';
import { BRAND } from './data.js?v=0.59.0';

const gm = (() => { const d = new Uint8Array([95, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
export const M = c => mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
export function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; }
const G = {}; const geo = (k, f) => G[k] ||= f();
export const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, s = 16) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), M(c), x, y + h / 2, z, p);
export const sph = (r, c, x, y, z, p, ws = 14, hs = 10) => mesh(geo(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p);
// ── 물건: 베이글 · 크림치즈 베이글 · 커피 · 쓰레기
export const ITEM_H = { bagel: 15, cream: 16, coffee: 27, trash: 12, box: 30, dough: 14, boiled: 15 };
export const LOOK = { cream: 'salt', coffee: 'cup_plain' };
export function item(kind) {
  const g = new THREE.Group(), torus = () => geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2));
  const look = kind === 'cream' ? LOOK.cream : kind === 'coffee' ? LOOK.coffee : kind;
  const dots = (n, c, r = 2, y = 14) => { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + i, rr = 11 + (i % 3) * 3; sph(r, c, Math.cos(a) * rr, y, Math.sin(a) * rr, g, 5, 4); } };
  if (look === 'bagel') mesh(torus(), M(0xE2A55A), 0, 7.5, 0, g);
  else if (look === 'salt') { mesh(torus(), M(0xCF8A2E), 0, 7.5, 0, g); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; box(3, 2, 3, 0xFFFFFF, Math.cos(a) * 15, 14, Math.sin(a) * 15, g); } box(12, 3, 8, 0xFFE27A, 0, 14, 12, g); }
  else if (look === 'olive') { mesh(torus(), M(0xD9A866), 0, 7.5, 0, g); dots(7, 0x3A4A22, 2.6); dots(4, 0x1E2418, 2.2, 12); }
  else if (look === 'spinach') { mesh(torus(), M(0xE2A55A), 0, 7.5, 0, g); cyl(17, 15, 4, 0xF2A23A, 0, 11, 0, g, 14); dots(8, 0x4A8A3A, 1.8, 15.5); }
  else if (look === 'cranberry') { mesh(torus(), M(0xC0844A), 0, 7.5, 0, g); dots(8, 0xA0202A, 2.2); }
  else if (look.startsWith('cup')) { cyl(12, 10, 18, 0xEEF4F6, 0, 0, 0, g, 12); const top = { cup_plain: 0xFFFBF2, cup_blue: 0xB49AD8, cup_scallion: 0xFFF8EE, cup_fig: 0xF2E2D6 }[look] || 0xFFFBF2; if (look === 'cup_fig') dots(5, 0x7A3A2A, 2, 24);
    sph(12.5, top, 0, 19, 0, g, 12, 8).scale.set(1, 0.7, 1); if (look === 'cup_blue') dots(6, 0x3A2A6A, 1.8, 24); if (look === 'cup_scallion') { dots(5, 0x4AA04A, 1.8, 24); dots(3, 0xC04A3A, 1.6, 23); } }
  else if (kind === 'dough') { sph(14, 0xFFF4E2, 0, 9, 0, g, 12, 8).scale.set(1, 0.65, 1); }
  else if (kind === 'boiled') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xE8C08A, gradientMap: gm, emissive: 0x3A2208 }), 0, 7.5, 0, g); }
  else if (kind === 'prem') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xB86A20, gradientMap: gm, emissive: 0x3A1A00 }), 0, 7.5, 0, g); sph(3, 0xFFFFFF, 8, 15, -6, g, 6, 4); }
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
  /* 간판: 공식 로고 (assets/brand/logo.png, 흰 글씨) 를 브랜드 주황 판에 */
  const st = document.createElement('canvas'); st.width = 512; st.height = 160; const sx = st.getContext('2d'); sx.fillStyle = BRAND.accent; sx.beginPath(); sx.roundRect(4, 4, 504, 152, 40); sx.fill();
  const tx = new THREE.CanvasTexture(st); tx.colorSpace = THREE.SRGBColorSpace; const lg = new Image(); lg.onload = () => { sx.drawImage(lg, 46, 22, 420, 117); tx.needsUpdate = true; }; lg.src = 'assets/brand/logo.png';
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(380, 119), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); sign.position.set(-W / 2 + 560, 175, -D / 2 + 17); sc.add(sign);
  /* 벽 사진 액자: 공식 홈페이지 제조 과정 사진 */
  const tl = new THREE.TextureLoader(); const frame = (img, x, y, z, ry, w = 110, h = 130) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; sc.add(g);
    mesh(new THREE.BoxGeometry(w + 14, h + 14, 4), M(0x5A3A22), 0, 0, 0, g); const t = tl.load(`assets/brand/${img}.jpg`); t.colorSpace = THREE.SRGBColorSpace; const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); pic.position.z = 2.5; g.add(pic); };
  frame('dough', -W / 2 + 17, 150, -D / 2 + 520, Math.PI / 2); frame('oven', -W / 2 + 17, 150, -D / 2 + 900, Math.PI / 2); frame('sandwich', -W / 2 + 17, 150, -D / 2 + 1260, Math.PI / 2);
  frame('boil2', W / 2 - 330, 175, -D / 2 + 17, 0, 100, 100);
}
// ── 설비 (위치는 group 기준 · 받는 곳/내놓는 곳 좌표는 game.js 에서)
export const STATION = {
  oven(p) { box(200, 170, 140, 0xC0583A, 0, 0, 0, p); box(210, 16, 150, 0x8A3A26, 0, 170, 0, p); mesh(new THREE.BoxGeometry(120, 60, 4), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 90, 72, p); box(30, 80, 30, 0x8A3A26, 60, 186, -30, p); box(180, 10, 60, 0x9A643A, 0, 0, 100, p); },
  counter(p) { box(320, 100, 110, 0xF7F0E6, 0, 0, 0, p); box(330, 14, 120, 0x9A643A, 0, 100, 0, p); box(70, 50, 50, 0x4A4A55, 110, 114, -10, p); },
  ccbar(p) { box(220, 95, 110, 0xFFFFFF, 0, 0, 0, p); box(230, 12, 120, 0x9A643A, 0, 95, 0, p); [0xFFFBF2, 0xF6D6E8, 0xE6F2C8, 0xFFE9B8].forEach((c, i) => cyl(18, 18, 22, c, -75 + i * 50, 107, -20, p)); },
  coffee(p) { box(130, 150, 100, 0xF4F7F8, 0, 0, 0, p); box(140, 12, 110, 0xC8D2D8, 0, 150, 0, p); box(110, 80, 6, 0xBFE3F2, 0, 50, 50, p); for (let i = 0; i < 3; i++) cyl(10, 9, 16, 0xFFFBF2, -30 + i * 30, 70, 46, p, 10); },   /* 크림치즈 냉장고 */
  table(p) { cyl(70, 70, 10, 0xFFFFFF, 0, 78, 0, p, 24); cyl(10, 16, 78, 0x9A643A, 0, 0, 0, p, 10);
    for (const a of [0, Math.PI]) { const c = new THREE.Group(); c.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95); p.add(c); cyl(30, 30, 10, BRAND.accentHex, 0, 40, 0, c); cyl(6, 6, 40, 0x9A643A, 0, 0, 0, c, 8); } },
  bin(p) { cyl(34, 30, 80, 0x5A8A5A, 0, 0, 0, p); cyl(36, 36, 8, 0x3A6A3A, 0, 80, 0, p); },
  drive(p) { box(30, 230, 260, 0xEFD9BC, 0, 0, 0, p); box(10, 110, 150, 0xBFE3F2, 18, 80, 0, p); box(120, 14, 170, 0x9A643A, 70, 95, 0, p); box(16, 95, 16, 0x7A4A2A, 120, 0, -70, p); box(16, 95, 16, 0x7A4A2A, 120, 0, 70, p); },
  mixer(p) { box(110, 60, 90, 0x9AA4AC, 0, 0, 0, p); cyl(14, 14, 90, 0x9AA4AC, -30, 60, -20, p, 10); box(110, 26, 40, 0x9AA4AC, -10, 140, -20, p); cyl(44, 36, 54, 0xD8DEE2, 10, 60, 10, p, 18); sph(36, 0xFFF6E6, 10, 112, 10, p, 14, 10).scale.set(1, 0.55, 1); cyl(4, 4, 50, 0x7A848C, 10, 96, 10, p, 6); },   /* 반죽기 */
  kettle(p) { box(130, 80, 110, 0x6A707A, 0, 0, 0, p); cyl(52, 48, 50, 0xC8CED4, 0, 80, 0, p, 20); cyl(46, 46, 4, 0x9ACFE8, 0, 124, 0, p, 20); for (let i = 0; i < 4; i++) mesh(geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2)), M(0xE8C08A), -18 + (i % 2) * 36, 128, -14 + Math.floor(i / 2) * 28, p); },   /* 데치기 솥 */
  plant(p) { cyl(34, 26, 60, 0xE7B98A, 0, 0, 0, p, 12); sph(55, 0x7FBF6A, 0, 110, 0, p, 12, 10).scale.set(1, 1.2, 1); },
  desk(p) { box(160, 80, 80, 0x9A643A, 0, 0, 0, p); box(170, 10, 90, 0xC08A5A, 0, 80, 0, p); box(40, 30, 6, 0x4A4A55, 0, 90, -20, p); },
};
// 자동차 (드라이브스루)
export function car(col) { const g = new THREE.Group(); box(200, 60, 110, col, 0, 20, 0, g); box(120, 50, 100, col, -10, 80, 0, g); box(110, 40, 102, 0xBFE3F2, -10, 84, 0, g).scale.set(1, 1, 1.01);
  for (const [x, z] of [[60, 55], [-60, 55], [60, -55], [-60, -55]]) mesh(geo('wheel', () => new THREE.CylinderGeometry(22, 22, 16, 14).rotateX(Math.PI / 2)), M(0x2A2A30), x, 22, z, g); return g; }
