// 렌더러 · 장면 · 카메라 · 루프 (멈춤 프레임(hitstop) · 느린 화면(slow) · 카메라 흔들림)
import * as THREE from 'three';
import { EffectComposer } from '../lib/jsm/postprocessing/EffectComposer.js?v=0.61.1';
import { RenderPass } from '../lib/jsm/postprocessing/RenderPass.js?v=0.61.1';
import { UnrealBloomPass } from '../lib/jsm/postprocessing/UnrealBloomPass.js?v=0.61.1';
import { ShaderPass } from '../lib/jsm/postprocessing/ShaderPass.js?v=0.61.1';
import { OutputPass } from '../lib/jsm/postprocessing/OutputPass.js?v=0.61.1';
import { RoomEnvironment } from '../lib/jsm/environments/RoomEnvironment.js?v=0.61.1';
// 마지막 화면 효과: 강한 타격 때 색 번짐 + 방사형 흐림 · 가장자리 어둡게
const FinalShader = { uniforms: { tDiffuse: { value: null }, amt: { value: 0 }, vig: { value: 0.4 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amt; uniform float vig; varying vec2 vUv;
  void main(){ vec2 c = vUv - 0.5; float d = length(c); vec2 off = c * amt * 0.018; vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
    if (amt > 0.02) { vec3 acc = col; for (int i = 1; i < 6; i++) acc += texture2D(tDiffuse, vUv - c * amt * 0.014 * float(i)).rgb; col = mix(col, acc / 6.0, min(1.0, amt)); }
    col *= mix(1.0, smoothstep(0.95, 0.28, d), vig); gl_FragColor = vec4(col, 1.0); }` };

export const E = {
  renderer: null, scene: null, camera: null, W: 390, H: 844,
  time: 0, dt: 0, raw: 0, timeScale: 1, hitstop: 0, slowT: 0, slowS: 1,
  shakeA: 0, shakeT: 0, shakeD: 1, updaters: new Set(), paused: false, quality: 1, composer: null, bloom: null, final: null, pulse: 0,
};

export function initEngine(canvas) {
  const lowEnd = /Android [4-8]\b/.test(navigator.userAgent); const saved = (() => { try { return localStorage.getItem('ashblade_gfx'); } catch { return null; } })();
  E.quality = saved != null ? +saved : lowEnd ? 0 : 1; E.autoQ = saved == null; const qp = new URLSearchParams(location.search).get('gfx'); if (qp != null) { E.quality = +qp; E.autoQ = false; }
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, E.quality ? 2 : 1.25));
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = E.quality > 0; r.shadowMap.type = THREE.PCFSoftShadowMap;
  E.renderer = r; E.scene = new THREE.Scene();
  // 금속 반사용 환경광 (방 모양 빛을 미리 구움)
  const pm = new THREE.PMREMGenerator(r); E.envMap = pm.fromScene(new RoomEnvironment(r), 0.04).texture; pm.dispose(); E.scene.environment = E.envMap;
  E.camera = new THREE.PerspectiveCamera(46, 1, 20, 12000);
  setupPost();
  const fit = () => { const el = canvas.parentElement, w = el.clientWidth, h = el.clientHeight; E.W = w; E.H = h; r.setSize(w, h, false); E.camera.aspect = w / h; if (E.composer) { E.composer.setSize(w, h); E.bloom.resolution.set(w / 2, h / 2); }
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
    /* 느린 폰: 3초 평균이 40fps 아래면 품질 자동 낮춤 (한 번) */
    if (E.autoQ && E.quality > 0 && raw > 0) { E._ft = (E._ft || 0) + raw; E._fn = (E._fn || 0) + 1; if (E._ft > 3) { if (E._ft / E._fn > 0.025) { setQuality(0); E.autoQ = false; } E._ft = 0; E._fn = 0; } }
    E.pulse = Math.max(0, E.pulse - raw * 2.6); if (E.final) E.final.uniforms.amt.value = E.pulse;
    if (E.composer && E.quality > 0) E.composer.render(); else r.render(E.scene, E.camera); last = performance.now();
  };
  loop();
  return E;
}
// 그래픽 품질: 0 낮음(후처리·실시간 그림자 끔) · 1 높음
function setupPost() {
  const r = E.renderer, c = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })); c.addPass(new RenderPass(E.scene, E.camera));
  E.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.35, 0.92); c.addPass(E.bloom); E.final = new ShaderPass(FinalShader); c.addPass(E.final); c.addPass(new OutputPass()); E.composer = c;
}
export function setQuality(q, keep) { E.quality = q; if (keep) { E.autoQ = false; try { localStorage.setItem('ashblade_gfx', q); } catch { /* */ } } E.renderer.shadowMap.enabled = q > 0; E.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q > 0 ? 2 : 1.25)); dispatchEvent(new Event('resize'));
  E.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); }); }
export const pulse = a => { E.pulse = Math.max(E.pulse, a); };
export const setVignette = v => { if (E.final) E.final.uniforms.vig.value = v; };
export const shake = (a, d = 0.25) => { if (a > E.shakeA * Math.max(0, E.shakeT / E.shakeD)) { E.shakeA = a; E.shakeT = d; E.shakeD = d; } };
export const hitstop = s => { E.hitstop = Math.max(E.hitstop, s); };
export const slowmo = (s, d) => { E.slowS = s; E.slowT = d; };
// 화면 좌표 (DOM 위치 맞추기)
const _v = new THREE.Vector3();
export function toScreen(p, out = {}) { _v.copy(p).project(E.camera); out.x = (_v.x + 1) / 2 * E.W; out.y = (1 - _v.y) / 2 * E.H; out.vis = _v.z < 1; return out; }
