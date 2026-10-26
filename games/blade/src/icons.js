// 아이콘을 실제 3D 모델로 찍음: 얼굴 · 공격/스킬 자세 · 장비 부위 (시작할 때 한 번)
import * as THREE from 'three';
import { load } from './assets.js?v=0.57.3';
import { Actor } from './actor.js?v=0.57.3';
import { SLOTS } from './data.js?v=0.57.3';

export const icons = {};
const SHOTS = { atk: ['a1', 0.4, '#5a3a14', 0.55], quake: ['s2', 1.92, '#5a2410', 0.3], whirl: ['s5', 1.15, '#14324a', 0.9], rush: ['s3', 0.85, '#3a1a4a', 0.2], guard: ['s4', 1.25, '#173a2a', 0.6], ult: ['s1', 2.72, '#6a1408', 0.4] };
export async function makeIcons() {
  await load('warrior');
  const S = 192, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0, 0);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff4e0, 0x403028, 2.2)); const key = new THREE.DirectionalLight(0xffe0b0, 2.6); key.position.set(1, 1.6, 2); const rim = new THREE.DirectionalLight(0x9ac8ff, 2.2); rim.position.set(-2, 1, -1.5); sc.add(key, rim);
  const a = new Actor('warrior'); a.shadow.visible = false; sc.add(a.root); const cam = new THREE.PerspectiveCamera(30, 1, 1, 5000);
  const out = document.createElement('canvas'); out.width = out.height = S; const g = out.getContext('2d');
  const box = (only) => { a.model.updateMatrixWorld(true); const b = new THREE.Box3(), v = new THREE.Vector3(); a.model.traverse(m => { if (!m.isSkinnedMesh || !m.visible || (only && m.name !== only)) return; m.skeleton.update(); const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) { m.getVertexPosition(i, v); b.expandByPoint(v.applyMatrix4(m.matrixWorld)); } }); return b; };
  const pose = (clip, t) => { a.mixer.stopAllAction(); const ac = a.mixer.clipAction(a.clips[clip]); ac.reset().play(); a.mixer.setTime(t); };
  const snap = (bg, frame) => { r.render(sc, cam); g.clearRect(0, 0, S, S); if (bg) { const rg = g.createRadialGradient(S / 2, S * 0.45, 4, S / 2, S / 2, S * 0.72); rg.addColorStop(0, lighten(bg)); rg.addColorStop(1, bg); g.fillStyle = rg; g.fillRect(0, 0, S, S); }
    g.drawImage(cv, 0, 0); if (frame) { const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, S, S); } return out.toDataURL('image/webp', 0.9); };
  const aim = (b, pad = 1.15, yaw = 0.5, up = 0.15) => { const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()), R = Math.max(s.x, s.y, s.z) * 0.5 * pad, d = R / Math.tan(15 * Math.PI / 180);
    cam.position.set(c.x + Math.sin(yaw) * d, c.y + d * up, c.z + Math.cos(yaw) * d); cam.lookAt(c); };
  // 얼굴
  pose('idle', 0); let head = null; a.model.traverse(b => { if (b.isBone && /head$/i.test(b.name) && !/nub|end/i.test(b.name)) head = head || b; }); console.log('#head', head && head.name);
  a.model.updateMatrixWorld(true); if (head) { const p = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld); cam.position.set(p.x + 45, p.y + 18, p.z + 150); cam.lookAt(p.x, p.y + 4, p.z); icons.face = snap('#3a3020', true); }
  for (const [k, [clip, t, bg, yaw]] of Object.entries(SHOTS)) { pose(clip, t); aim(box(), 0.78, yaw, 0.2); icons[k] = snap(bg, true); }
  // 장비 부위
  pose('idle', 0);
  for (const sl of SLOTS) { a.model.traverse(m => { if (m.isSkinnedMesh) m.visible = m.name === sl.mesh; }); aim(box(sl.mesh), sl.id === 'weapon' ? 0.85 : 1.05, sl.id === 'cloak' ? 2.6 : 0.6, 0.25); icons['g_' + sl.id] = snap(null, false); }
  a.model.traverse(m => { if (m.isSkinnedMesh) m.visible = true; });
  // 전신 (로비 · 결과)
  pose('idle', 0); aim(box(), 1.08, 0.45, 0.12); icons.body = snap(null, false);
  a.dispose(); r.dispose(); r.forceContextLoss();
}
function lighten(hex) { const c = new THREE.Color(hex); c.offsetHSL(0, 0.05, 0.22); return '#' + c.getHexString(); }
