// 스테이지 배경 만들기: 바닥 · 길 · 소품(같은 재질끼리 합쳐 한 번에 그림) · 빛 · 안개 · 떠다니는 재
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js?v=0.57.0';
import { loadProp, propMeta } from './props.js?v=0.57.0';
import { pathMask, discMask, skyTex } from './fxtex.js?v=0.57.0';
import { FX } from './fx.js?v=0.57.0';

export const AREA = 1500, HALF = 380;   // 무리 한 구역 길이 · 걸을 수 있는 반폭
const THEMES = {
  forest: { rim: 0xc0d0e8, ground: 'L04_d', path: 'L10_d', fog: 0x6c7a70, sky: ['#4f5d56', '#97a08a'], hemi: [0xdfe6d6, 0x3a3226, 1.25], sun: [0xffdcaa, 2.9], ash: 0xd8d2c4,
    edge: ['bush1', 'bush3', 'bush4', 'root1', 'creeper1', 'rock1', 'rock3', 'grass1', 'vine1'], mid: ['tree_big1', 'stump3', 'stump5', 'tree_big2', 'stump2'], far: ['tree_bb1', 'tree_bb3', 'tree_bb4'], inner: ['grass4', 'grass1', 'mush3', 'grass2', 'grass4', 'flower1'] },
  nest: { rim: 0xb0ff9a, ground: 'L15_d', path: 'L10_d', fog: 0x4c4f43, sky: ['#2c312b', '#6e6a58'], hemi: [0xc8d0c0, 0x2a2420, 1.5], sun: [0xd8e0a0, 1.8], ash: 0xb8c0a0,
    edge: ['root1', 'vine1', 'vine2', 'rock1', 'rock2', 'creeper1', 'stump1'], mid: ['stump5', 'stump3', 'tree_big1', 'root1'], far: ['tree_bb1', 'tree_bb4'], inner: ['mush2', 'grass4', 'mush3', 'grass2'] },
  camp: { rim: 0xffb070, ground: 'sand_01_d', path: 'L03_d', fog: 0x7a5a48, sky: ['#3a2a2a', '#c08a60'], hemi: [0xffd8b8, 0x3a2418, 1.3], sun: [0xffb070, 2.0], ash: 0xffb070,
    edge: ['fence', 'fence', 'rock2', 'cart', 'bush4', 'bonfire'], mid: ['tent1', 'tent2', 'tent3', 'post1', 'flag', 'bonfire2'], far: ['tree_bb1', 'tree_bb3', 'tree_big2'], inner: ['grass2', 'bonfire', 'rock3'], gate: 'gate2' },
  chief: { rim: 0xff8050, ground: 'L14_d', path: 'L03_d', fog: 0x5a3028, sky: ['#2a1414', '#a0502c'], hemi: [0xffc0a0, 0x301810, 1.4], sun: [0xff9050, 2.5], ash: 0xff9a50,
    edge: ['fence', 'ivory1', 'ivory2', 'brazier', 'rock2', 'cloth1'], mid: ['tent2', 'tent3', 'flag', 'post1', 'ivory1'], far: ['tree_bb3', 'tree_big1', 'tree_bb4'], inner: ['bonfire', 'grass2'], gate: 'gate2', boss: 'chief1' },
  tower: { rim: 0x8aa8ff, ground: 'floors_01_d', path: 'L16_d', fog: 0x283040, sky: ['#141a28', '#3a4660'], hemi: [0xc0d0ff, 0x201820, 1.4], sun: [0xa8c0ff, 2.0], ash: 0x9ab8ff,
    edge: ['statue1', 'barricade', 'brazier', 'rock2', 'statue2'], mid: ['post2', 'brazier', 'statue1'], far: [], inner: [] },
  cave: { rim: 0xffd070, ground: 'L15_d', path: 'L09_d', fog: 0x3a3020, sky: ['#1a1408', '#6a5a30'], hemi: [0xffe8b0, 0x302010, 1.5], sun: [0xffd070, 2.0], ash: 0xffd070,
    edge: ['rock1', 'rock2', 'rock3', 'pot', 'cart', 'root1'], mid: ['rock1', 'stump5', 'root1'], far: ['tree_bb4'], inner: ['rock3'] },
};
const texL = new THREE.TextureLoader();
function gtex(n, rep) { const x = texL.load(`assets/env/${n}.jpg`); x.colorSpace = THREE.SRGBColorSpace; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; x.repeat.set(rep[0], rep[1]); return x; }
// 씨앗 난수 (스테이지마다 같은 배치)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export async function buildWorld(stage) {
  const th = THEMES[stage.theme] || THEMES.forest, g = new THREE.Group(), R = rng([...stage.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const nA = stage.waves.length, boss = !!stage.boss, len = nA * AREA + (boss ? 900 : 0) + 1200, zEnd = -nA * AREA - (boss ? 600 : 0);
  // 바닥 · 길
  const W = 7000, L = len + 5000; const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshLambertMaterial({ map: gtex(th.ground, [W / 520, L / 520]) }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -len / 2 + 1500); ground.receiveShadow = true; g.add(ground);
  const pathT = gtex(th.path, [3, (len + 2400) / 420]); const pmask = pathMask(); pmask.repeat.set(1, (len + 2400) / 1500);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 80, len + 2400), new THREE.MeshLambertMaterial({ map: pathT, alphaMap: pmask, transparent: true, depthWrite: false }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 1.5, -len / 2 + 600); path.renderOrder = 1; path.receiveShadow = true; g.add(path);
  if (boss) { const disc = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ map: gtex(th.path, [5, 5]), alphaMap: discMask(), transparent: true, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(0, 2, zEnd - 200); disc.renderOrder = 1; disc.receiveShadow = true; g.add(disc); }
  // 소품 놓기 (나중에 합침)
  const PM = await propMeta(); const items = []; const put = (id, x, z, o = {}) => items.push({ id, x, z, ...o });
  /* 길 옆에 놓기: 소품 크기만큼 바깥으로 (큰 나무가 길을 덮지 않게) */
  const side = (id, sd, gap, z, o = {}) => { const m = PM[id]; if (!m) return; const s = o.h ? o.h / m.size[1] : (o.s || 1), ext = Math.max(m.size[0], m.size[2]) * 0.5 * s; put(id, sd * (HALF + gap + ext), z, { ...o, s: o.h ? undefined : s }); };
  const pick = a => a[Math.floor(R() * a.length)];
  const z0 = 900, z1 = zEnd - (boss ? 1100 : 700);
  for (let z = z0; z > z1; z -= 150 + R() * 120) for (const sd of [-1, 1]) {
    if (th.edge.length) { const id = pick(th.edge); if (id === 'fence') put(id, sd * (HALF + 230 + R() * 30), z, { ry: Math.PI / 2 + (R() - 0.5) * 0.2, h: 300 }); else side(id, sd, 10 + R() * 90, z + R() * 60, { ry: R() * 6.28, s: 0.8 + R() * 0.6 }); }
    if (R() < 0.8 && th.mid.length) side(pick(th.mid), sd, 60 + R() * 220, z, { ry: R() * 6.28, s: 0.55 + R() * 0.35 });
    if (R() < 0.45 && th.far.length) side(pick(th.far), sd, 520 + R() * 500, z - R() * 200, { ry: (R() - 0.5) * 0.6 + Math.PI / 2, s: 0.5 + R() * 0.3 });
  }
  for (let i = 0; i < len / 90 && th.inner.length; i++) { const id = pick(th.inner), x = (R() * 2 - 1) * (HALF + 60), z = z0 - R() * (z0 - z1); if (/bonfire|rock/.test(id) && Math.abs(x) < HALF - 80) continue; put(id, x, z, { ry: R() * 6.28, s: 0.45 + R() * 0.45 }); }
  // 구역 사이 문 (진영)
  if (th.gate) for (let k = 1; k < nA; k++) put(th.gate, 0, -k * AREA + 120, { h: 900 });
  if (th.boss) { put(th.boss, 0, zEnd - 1500, { h: 1500, ry: 0 }); for (const sd of [-1, 1]) { put('brazier', sd * 520, zEnd - 900, { h: 420 }); put('ivory1', sd * 760, zEnd - 1100, { h: 700, ry: sd > 0 ? Math.PI : 0 }); } }
  if (stage.theme === 'tower') for (let z = 600; z > zEnd - 800; z -= 520) for (const sd of [-1, 1]) put('statue1', sd * (HALF + 160), z, { h: 420, ry: sd > 0 ? -Math.PI / 2 : Math.PI / 2 });
  // 불 (모닥불 · 화로) 위치 기억 → 불꽃 입자
  const fires = [];
  await Promise.all([...new Set(items.map(i => i.id))].map(loadProp));
  const byMat = new Map(); const tmp = new THREE.Object3D();
  for (const it of items) {
    const P = await loadProp(it.id); const s = it.h ? it.h / P.size.y : (it.s || 1);
    tmp.position.set(it.x, -P.box.min.y * s, it.z); tmp.rotation.set(0, it.ry || 0, 0); tmp.scale.setScalar(s); tmp.updateMatrixWorld(true);
    if (/bonfire|brazier/.test(it.id)) fires.push(new THREE.Vector3(it.x, (it.id === 'brazier' ? P.size.y * s * 0.95 : 40), it.z));
    P.scene.updateMatrixWorld(true);
    P.scene.traverse(m => { if (!m.isMesh) return; const M = new THREE.Matrix4().multiplyMatrices(tmp.matrixWorld, m.matrixWorld); const mats = Array.isArray(m.material) ? m.material : [m.material];
      const groups = m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count), materialIndex: 0 }];
      for (const gr of groups) { const mt = mats[gr.materialIndex] || mats[0]; const geo = plain(m.geometry, gr, M); if (!geo) continue; if (!byMat.has(mt)) byMat.set(mt, []); byMat.get(mt).push(geo); } });
  }
  for (const [mt, list] of byMat) { const mg = mergeGeometries(list, false); if (!mg) continue; const mesh = new THREE.Mesh(mg, mt); mesh.matrixAutoUpdate = false; mesh.receiveShadow = true; g.add(mesh); list.forEach(x => x.dispose()); }
  // 빛 · 안개 · 하늘
  const hemi = new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]); const sun = new THREE.DirectionalLight(th.sun[0], th.sun[1] * 1.15); sun.position.set(-600, 1400, 500); g.add(hemi, sun, sun.target);
  sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 200, far: 4200 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 2; sun.shadow.radius = 3;
  hemi.intensity *= 0.85; const back = new THREE.DirectionalLight(th.rim || 0x9ab8ff, 0.4); back.position.set(400, 700, -1400); g.add(back);
  const fog = new THREE.Fog(th.fog, 1900, 5200); const sky = skyTex(th.sky[0], th.sky[1]);
  return { group: g, fog, sky, th, sun, zEnd, len, fires, boss, nA, areaZ: k => -k * AREA - 650, bossZ: zEnd - 200 };
}
// 소품 모양을 일반 실수 좌표로 풀어 (압축 좌표 · 그룹 잘라내기) 세계 좌표로 옮김
function plain(geo, gr, M) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index; if (!pos) return null;
  const ids = []; if (idx) for (let i = gr.start; i < gr.start + gr.count; i++) ids.push(idx.getX(i)); else for (let i = gr.start; i < gr.start + gr.count; i++) ids.push(i);
  const n = ids.length, P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(M);
  for (let k = 0; k < n; k++) { const i = ids[k]; v.fromBufferAttribute(pos, i).applyMatrix4(M); P.set([v.x, v.y, v.z], k * 3);
    if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.set([v.x, v.y, v.z], k * 3); } else N.set([0, 1, 0], k * 3);
    if (uv) { U[k * 2] = uv.getX(i); U[k * 2 + 1] = uv.getY(i); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return g;
}
// 배경 효과: 떠다니는 재 · 불꽃
export function ambient(world, center, dt) {
  const th = world.th; world._a = (world._a || 0) + dt; world._f = (world._f || 0) + dt;
  while (world._a > 0.06) { world._a -= 0.06; FX.ember.add({ x: center.x + (Math.random() - 0.5) * 1600, y: 60 + Math.random() * 700, z: center.z + (Math.random() - 0.5) * 1800 - 300, vx: 30 + Math.random() * 40, vy: -20 + Math.random() * 40, vz: (Math.random() - 0.5) * 30, life: 3 + Math.random() * 2, size: 6 + Math.random() * 7, col: th.ash, a: 0.6 }); }
  while (world._f > 0.045) { world._f -= 0.045; for (const p of world.fires) { if (Math.abs(p.z - center.z) > 2600) continue;
    FX.glow.add({ x: p.x + (Math.random() - 0.5) * 40, y: p.y + 10, z: p.z + (Math.random() - 0.5) * 40, vy: 140 + Math.random() * 120, life: 0.5 + Math.random() * 0.3, size: 70 + Math.random() * 40, size1: 10, col: Math.random() < 0.5 ? 0xff7a2a : 0xffb44a, a: 0.9 });
    if (Math.random() < 0.3) FX.ember.add({ x: p.x, y: p.y + 30, z: p.z, vx: (Math.random() - 0.5) * 60, vy: 200 + Math.random() * 160, vz: (Math.random() - 0.5) * 60, life: 1.2, size: 8, col: 0xffa040, a: 1, drag: 0.6 }); } }
}
