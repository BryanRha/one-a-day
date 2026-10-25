// 렌더러 · 장면 · 카메라 · 루프 (멈춤 프레임(hitstop) · 느린 화면(slow) · 카메라 흔들림)
import * as THREE from 'three';

export const E = {
  renderer: null, scene: null, camera: null, W: 390, H: 844,
  time: 0, dt: 0, raw: 0, timeScale: 1, hitstop: 0, slowT: 0, slowS: 1,
  shakeA: 0, shakeT: 0, shakeD: 1, updaters: new Set(), paused: false, quality: 1,
};

export function initEngine(canvas) {
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || /Android [4-8]/.test(navigator.userAgent);
  E.quality = lowEnd ? 0 : 1;
  const r = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  E.renderer = r; E.scene = new THREE.Scene();
  E.camera = new THREE.PerspectiveCamera(46, 1, 20, 12000);
  const fit = () => { const el = canvas.parentElement, w = el.clientWidth, h = el.clientHeight; E.W = w; E.H = h; r.setSize(w, h, false); E.camera.aspect = w / h;
    E.camera.fov = w / h < 0.62 ? 50 : w / h < 1 ? 42 : 34; E.camera.updateProjectionMatrix(); };
  addEventListener('resize', fit); fit();
  const clock = new THREE.Clock(); let last = 0;
  const loop = () => {
    requestAnimationFrame(loop);
    let raw = Math.min(clock.getDelta(), 0.05); if (E.paused) raw = 0; E.raw = raw;
    let dt = raw * E.timeScale;
    if (E.slowT > 0) { E.slowT -= raw; dt *= E.slowS; }
    if (E.hitstop > 0) { E.hitstop -= raw; dt = 0; }
    E.dt = dt; E.time += dt;
    for (const f of E.updaters) f(dt, raw);
    if (E.shakeT > 0) { E.shakeT -= raw; const k = Math.max(0, E.shakeT / E.shakeD) * E.shakeA, c = E.camera; c.position.x += (Math.random() - 0.5) * k; c.position.y += (Math.random() - 0.5) * k * 0.6; c.position.z += (Math.random() - 0.5) * k; }
    r.render(E.scene, E.camera); last = performance.now();
  };
  loop();
  return E;
}
export const shake = (a, d = 0.25) => { if (a > E.shakeA * Math.max(0, E.shakeT / E.shakeD)) { E.shakeA = a; E.shakeT = d; E.shakeD = d; } };
export const hitstop = s => { E.hitstop = Math.max(E.hitstop, s); };
export const slowmo = (s, d) => { E.slowS = s; E.slowT = d; };
// 화면 좌표 (DOM 위치 맞추기)
const _v = new THREE.Vector3();
export function toScreen(p, out = {}) { _v.copy(p).project(E.camera); out.x = (_v.x + 1) / 2 * E.W; out.y = (1 - _v.y) / 2 * E.H; out.vis = _v.z < 1; return out; }
