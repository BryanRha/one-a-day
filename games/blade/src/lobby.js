// 로비 장면: 밤의 야영지 · 모닥불 · 주인공이 서 있고 카메라가 천천히 돎 (화면마다 카메라 위치가 바뀜)
import * as THREE from 'three';
import { E } from './engine.js?v=0.62.0';
import { load } from './assets.js?v=0.62.0';
import { place, loadProp } from './props.js?v=0.62.0';
import { Actor } from './actor.js?v=0.62.0';
import { FX, initFX, clearFX, updateFX } from './fx.js?v=0.62.0';
import { skyTex, discMask } from './fxtex.js?v=0.62.0';
import { RIM } from './assets.js?v=0.62.0';
import { setVignette } from './engine.js?v=0.62.0';

export const L = { on: false, hero: null, t: 0, view: 'home', fire: new THREE.Vector3(-170, 40, -60) };
const VIEWS = { home: { r: 820, h: 330, look: [20, 130, -40], sway: 0.22, a0: 0.12 }, hero: { r: 600, h: 230, look: [100, 40, 40], sway: 0.05, a0: 0.18 }, title: { r: 1050, h: 430, look: [-20, 160, -80], sway: 0.18, a0: -0.05 } };
export async function buildLobby() {
  await load('warrior');
  const sc = E.scene; sc.clear(); initFX(sc); clearFX(); RIM.col.value.set(0x9ab0e8); RIM.k.value = 0.16; setVignette(0.5);
  sc.background = skyTex('#0a0c16', '#2a2030'); sc.fog = new THREE.Fog(0x1e1a26, 1400, 3800);
  const tl = new THREE.TextureLoader(), gt = tl.load('assets/env/L13_d.jpg'); gt.colorSpace = THREE.SRGBColorSpace; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(9, 9);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshLambertMaterial({ map: gt })); g.rotation.x = -Math.PI / 2; sc.add(g);
  const dt = tl.load('assets/env/L10_d.jpg'); dt.colorSpace = THREE.SRGBColorSpace; dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(4, 4);
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshLambertMaterial({ map: dt, alphaMap: discMask(), transparent: true, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 1; sc.add(disc);
  const P = [['bonfire', L.fire.x, L.fire.z, { s: 1.3 }], ['tent3', -560, -520, { s: 0.75, ry: 0.6 }], ['tent2', 420, -640, { s: 0.7, ry: -0.5 }], ['cart', 520, -60, { s: 1, ry: 1.2 }], ['flag', -260, -420, { s: 0.6 }],
    ['fence', -760, -120, { h: 300, ry: 1.4 }], ['fence', 760, -200, { h: 300, ry: -1.4 }], ['rock1', -700, 120, { s: 0.8 }], ['root1', 820, -380, { s: 0.6 }], ['stump5', -820, -900, { s: 0.9 }], ['tree_bb1', 300, -1500, { s: 0.6 }], ['tree_bb3', -900, -1400, { s: 0.6, ry: 0.4 }],
    ['tree_big2', 1300, -700, { s: 0.6 }], ['tree_big1', -1300, -200, { s: 0.5 }], ['bush3', -420, -300, { s: 1 }], ['grass1', 420, 160, { s: 0.5 }], ['grass4', -380, 260, { s: 0.5 }], ['pot', -330, -200, { s: 1 }]];
  await Promise.all([...new Set(P.map(p => p[0]))].map(loadProp)); for (const [id, x, z, o] of P) await place(sc, id, x, z, o);
  sc.add(new THREE.HemisphereLight(0x9ab0e0, 0x3a2418, 1.7)); const moon = new THREE.DirectionalLight(0xb8ccff, 1.9); moon.position.set(600, 900, 300); moon.castShadow = true; Object.assign(moon.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, near: 100, far: 3000 }); moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0008; sc.add(moon);
  g.receiveShadow = true; disc.receiveShadow = true;
  L.fireL = new THREE.PointLight(0xff8a3a, 9, 1500, 1.4); L.fireL.position.set(L.fire.x, 140, L.fire.z); sc.add(L.fireL);
  L.hero = new Actor('warrior', { shadow: 95 }); L.hero.pos.set(100, 0, 40); L.hero.face(0.25, true); L.hero.play('idle', { loop: true }); sc.add(L.hero.root);
  L.cam = { a: VIEWS.home.a0, p: new THREE.Vector3(), l: new THREE.Vector3(40, 120, 0) }; L.on = true; L.t = 0;
  if (!L.tick) { L.tick = (dt, raw) => { if (!L.on) return; L.t += raw; lobbyUpdate(raw); }; E.updaters.add(L.tick); }
  setView('home', true);
}
export function setView(v, now) { L.view = v; if (now) { const V = VIEWS[v]; L.cam.a = V.a0; } }
export function heroPose(clip, o = {}) { if (L.hero) L.hero.play(clip, { fade: 0.2, ...o, onEnd: () => L.hero.play('idle', { loop: true, fade: 0.3 }) }); }
function lobbyUpdate(dt) {
  const V = VIEWS[L.view] || VIEWS.home; const ta = V.a0 + Math.sin(L.t * 0.12) * V.sway; L.cam.a += (ta - L.cam.a) * Math.min(1, dt * 2);
  const want = new THREE.Vector3(V.look[0] + Math.sin(L.cam.a) * V.r, V.h, V.look[2] + Math.cos(L.cam.a) * V.r); E.camera.position.lerp(want, Math.min(1, dt * 2.5)); L.cam.l.lerp(new THREE.Vector3(...V.look), Math.min(1, dt * 3)); E.camera.lookAt(L.cam.l);
  L.hero.update(dt); L.fireL.intensity = 8 + Math.sin(L.t * 11) * 1.2 + Math.sin(L.t * 23) * 0.8;
  L._f = (L._f || 0) + dt; while (L._f > 0.04) { L._f -= 0.04; const p = L.fire;
    FX.glow.add({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + 10, z: p.z + (Math.random() - 0.5) * 50, vy: 150 + Math.random() * 130, life: 0.55 + Math.random() * 0.3, size: 90 + Math.random() * 50, size1: 12, col: Math.random() < 0.5 ? 0xff6a1a : 0xffb04a, a: 0.95 });
    if (Math.random() < 0.35) FX.ember.add({ x: p.x, y: p.y + 40, z: p.z, vx: (Math.random() - 0.5) * 80, vy: 220 + Math.random() * 200, vz: (Math.random() - 0.5) * 80, life: 1.6, size: 9, col: 0xffa040, a: 1, drag: 0.5 }); }
  updateFX(dt);
}
export function leaveLobby() { L.on = false; if (L.hero) { L.hero.dispose(); L.hero = null; } clearFX(); E.scene.clear(); }
