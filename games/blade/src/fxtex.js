// 효과용 텍스처를 캔버스로 그림 (불꽃 · 빛 · 고리 · 연기 · 바닥 경고 · 길 가장자리)
import * as THREE from 'three';

const cache = {};
function make(key, w, h, draw) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (cache[key] = t);
}
export const glowTex = () => make('glow', 128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.75)'); r.addColorStop(0.6, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
export const sparkTex = () => make('spark', 128, 32, (g, w, h) => { const r = g.createLinearGradient(0, 0, w, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r;
  g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w * 0.7, 0, w, h / 2); g.quadraticCurveTo(w * 0.7, h, 0, h / 2); g.fill(); });
export const ringTex = () => make('ring', 256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.35)'); r.addColorStop(0.9, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
export const smokeTex = () => make('smoke', 128, 128, (g, w) => { for (let i = 0; i < 18; i++) { const x = w / 2 + (Math.random() - 0.5) * w * 0.45, y = w / 2 + (Math.random() - 0.5) * w * 0.45, rr = w * (0.16 + Math.random() * 0.18), r = g.createRadialGradient(x, y, 0, x, y, rr);
  r.addColorStop(0, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); } });
export const slashTex = () => make('slash', 256, 32, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,0.55)'); r.addColorStop(0.85, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0.2)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
// 바닥 경고: 가장자리가 밝은 원 (부채꼴은 도형으로 자름)
export const decalTex = () => make('decal', 256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0.18)'); r.addColorStop(0.82, 'rgba(255,255,255,0.4)'); r.addColorStop(0.95, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
export const shadowTex = () => make('shadow', 128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,0.62)'); r.addColorStop(0.55, 'rgba(0,0,0,0.38)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
// 길 가장자리 (가로로 부드럽게 사라지는 알파 · 들쭉날쭉)
export const pathMask = () => { const t = make('pathmask', 256, 512, (g, w, h) => { const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) { const wob = Math.sin(y * 0.05) * 14 + Math.sin(y * 0.13 + 1) * 8 + Math.sin(y * 0.31) * 4; for (let x = 0; x < w; x++) { const d = Math.abs(x - w / 2) + wob * (x < w / 2 ? 1 : -1) * 0.6; let a = 1 - Math.max(0, (d - w * 0.28) / (w * 0.2)); a = Math.max(0, Math.min(1, a + (Math.random() - 0.5) * 0.25));
    const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a * 255; img.data[i + 3] = 255; } }
  g.putImageData(img, 0, 0); }); t.colorSpace = THREE.NoColorSpace; t.wrapT = THREE.RepeatWrapping; return t; };
// 원형 바닥(보스 터) 마스크
export const discMask = () => { const t = make('discmask', 256, 256, (g, w) => { const img = g.createImageData(w, w); for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const a0 = Math.atan2(y - w / 2, x - w / 2), wob = Math.sin(a0 * 7) * 5 + Math.sin(a0 * 13 + 2) * 3;
  const d = Math.hypot(x - w / 2, y - w / 2) + wob; let a = 1 - Math.max(0, (d - w * 0.34) / (w * 0.14)); a = Math.max(0, Math.min(1, a + (Math.random() - 0.5) * 0.2)); const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a * 255; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); });
  t.colorSpace = THREE.NoColorSpace; return t; };
// 하늘 (위아래 그라데이션)
export const skyTex = (top, bot) => make('sky' + top + bot, 4, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, top); r.addColorStop(1, bot); g.fillStyle = r; g.fillRect(0, 0, w, h); });
