// K뷰티 레시피 UI: 크림 패널 · 장미색 버튼 · 금빛 포인트 (모두 코드로 그림)
import { W, H } from './config.js?v=0.50.3';
import { audio } from './audio.js?v=0.50.3';
import { pushBack } from './oad.js?v=0.50.3';
import { load as loadSave, save as saveSave } from './save.js?v=0.50.3';

export const C = { ink: '#4A2C2A', text: '#FFFFFF', cream: '#FFF4EC', paper: '#FFFBF6', brown: '#8A5A44', sub: '#C99A86', dim: '#A08878', gold: '#E8A93A', rose: '#E86A8E', plum: '#5A3A34', red: '#D9573B', green: '#5FA65A', blue: '#4E86C6', mint: '#7CC6A8' };
export const FONT = 'Pretendard, sans-serif';

export function T(sc, x, y, s, size = 40, color = C.text, o = {}) {
  const t = sc.add.text(x, y, s, { fontFamily: FONT, fontStyle: String(o.w || 800), fontSize: `${size}px`, color, align: o.align || 'center', wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, lineSpacing: o.lh ?? 8, resolution: 2 }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.ls) t.setLetterSpacing(o.ls);
  if (o.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.45)', 8, false, true);
  return t;
}
const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function tex(sc, key, w, h, draw) { if (!sc.textures.exists(key)) { const c = sc.textures.createCanvas(key, w, h); draw(c.getContext(), w, h); c.refresh(); } return key; }

// 패널: paper(인화지 크림) · dark(짙은 나무 반투명)
export function panel(sc, x, y, w, h, o = {}) {
  const r = o.r ?? 28, tone = o.tone || 'paper', key = `pn_${w}_${h}_${r}_${tone}`;
  tex(sc, key, w + 60, h + 60, g => {
    g.translate(30, 30); g.shadowColor = 'rgba(30,15,5,0.45)'; g.shadowBlur = 24; g.shadowOffsetY = 10; rr(g, 0, 0, w, h, r);
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (tone === 'paper') { gr.addColorStop(0, '#FFFBFC'); gr.addColorStop(1, '#F8E6EC'); } else { gr.addColorStop(0, 'rgba(58,32,52,0.94)'); gr.addColorStop(1, 'rgba(36,20,34,0.96)'); }
    g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
    rr(g, 6, 6, w - 12, h - 12, r - 6); g.lineWidth = 2; g.strokeStyle = tone === 'paper' ? 'rgba(220,130,160,0.35)' : 'rgba(240,160,190,0.35)'; g.stroke();
  });
  return sc.add.image(x, y, key);
}
// 버튼
const STY = { rose: ['#FF9DB6', '#E8628A', '#9A2E52', '#FFFFFF'], gold: ['#FFD98A', '#F0A84A', '#A8641A', '#4A2808'], brown: ['#8A5A78', '#5E3456', '#2E1A2A', '#FFF2F6'], cream: ['#FFFFFF', '#F6DDE6', '#C99AAE', '#5A2E44'], green: ['#9CD382', '#5E9E48', '#2E5E22', '#FFFFFF'] };
export function btn(sc, x, y, w, h, label, onClick, o = {}) {
  const s = STY[o.style || 'rose'], key = `bt_${w}_${h}_${o.style || 'rose'}`;
  tex(sc, key, w + 30, h + 34, g => {
    g.translate(15, 12); g.shadowColor = 'rgba(30,15,5,0.4)'; g.shadowBlur = 14; g.shadowOffsetY = 8;
    rr(g, 0, 6, w, h - 6, h / 2); g.fillStyle = s[2]; g.fill(); g.shadowColor = 'transparent';
    rr(g, 0, 0, w, h - 8, h / 2); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, s[0]); gr.addColorStop(1, s[1]); g.fillStyle = gr; g.fill();
    rr(g, 8, 5, w - 16, (h - 8) * 0.42, h / 3); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
  });
  const c = sc.add.container(x, y), im = sc.add.image(0, 0, key), t = T(sc, 0, -4, label, o.size || Math.round(h * 0.34), s[3], { w: 900 });
  c.add([im, t]); c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => sc.tweens.add({ targets: c, scale: 0.95, duration: 70 }));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { sc.tweens.add({ targets: c, scale: 1, duration: 90 }); audio.play('sfx_tap', { volume: 0.6 }); onClick && onClick(); });
  c.label = t; c.setLabel = s2 => t.setText(s2);
  return c;
}
// 동그란 아이콘 버튼 (글자 아이콘)
export function iconBtn(sc, x, y, glyph, onClick, size = 96, o = {}) {
  const key = `ib_${size}_${o.dark ? 'd' : 'l'}`;
  tex(sc, key, size + 20, size + 24, g => { g.translate(10, 8); g.shadowColor = 'rgba(30,15,5,0.4)'; g.shadowBlur = 10; g.shadowOffsetY = 5; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fillStyle = o.dark ? 'rgba(46,26,42,0.85)' : '#FFFFFF'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 3; g.strokeStyle = o.dark ? 'rgba(255,170,200,0.6)' : 'rgba(232,106,142,0.45)'; g.stroke(); });
  const c = sc.add.container(x, y), col = o.dark ? '#FFB6CB' : '#E8628A', ik = `ic_${glyph}_${size}_${o.dark ? 'd' : 'l'}`;
  // 선 아이콘 (글자 대신 그림): back · hint(돋보기) · gear
  const drawn = ['back', 'hint', 'gear'].includes(glyph);
  if (drawn) tex(sc, ik, size, size, g => { const u = size / 100; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 9 * u; g.lineCap = 'round'; g.lineJoin = 'round';
    if (glyph === 'back') { g.beginPath(); g.moveTo(58 * u, 28 * u); g.lineTo(36 * u, 50 * u); g.lineTo(58 * u, 72 * u); g.stroke(); }
    if (glyph === 'hint') { g.beginPath(); g.arc(44 * u, 44 * u, 20 * u, 0, Math.PI * 2); g.stroke(); g.lineWidth = 12 * u; g.beginPath(); g.moveTo(59 * u, 59 * u); g.lineTo(74 * u, 74 * u); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(38 * u, 38 * u, 6 * u, 0, Math.PI * 2); g.fill(); }
    if (glyph === 'gear') { // 톱니바퀴: 굵은 톱니 8개가 붙은 바퀴 + 가운데 구멍
      g.beginPath(); for (let i = 0; i < 16; i++) { const a0 = i * Math.PI / 8 - Math.PI / 16, a1 = a0 + Math.PI / 8, R = i % 2 ? 23 * u : 31 * u; g.lineTo(50 * u + Math.cos(a0 + 0.06) * R, 50 * u + Math.sin(a0 + 0.06) * R); g.lineTo(50 * u + Math.cos(a1 - 0.06) * R, 50 * u + Math.sin(a1 - 0.06) * R); } g.closePath(); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(50 * u, 50 * u, 10 * u, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over'; } });
  c.add([sc.add.image(0, 0, key), drawn ? sc.add.image(0, 0, ik) : T(sc, 0, -2, glyph, size * 0.42, col, { w: 900 })]);
  c.setSize(size, size).setInteractive({ useHandCursor: true }).on('pointerup', () => { audio.play('sfx_tap', { volume: 0.6 }); onClick(); });
  return c;
}
// 별 3개 (n 개 채움)
export function stars(sc, x, y, n, size = 44, gap = 52) {
  const c = sc.add.container(x, y);
  for (let i = 0; i < 3; i++) c.add(T(sc, (i - 1) * gap, 0, '★', size, i < n ? C.gold : 'rgba(140,120,100,0.45)', { w: 900 }));
  return c;
}
// 팝업 (뒤로가기로 닫힘)
export function popup(sc, w, h, o = {}) {
  // 카메라가 스크롤된 화면(서재)에서도 보이는 자리에 뜨도록 카메라 위치에 맞춤
  const cam = sc.cameras.main, root = sc.add.container(cam.scrollX, cam.scrollY).setDepth(o.depth || 1000), dim = sc.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.6).setInteractive(); root.add(dim);
  const box = sc.add.container(W / 2, o.y || H / 2); root.add(box); box.add(panel(sc, 0, 0, w, h, { tone: o.tone }));
  const content = sc.add.container(0, 0); box.add(content);
  box.setScale(0.9).setAlpha(0); sc.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
  const close = () => { if (root.closing) return; root.closing = true; unback(); sc.tweens.add({ targets: root, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } }); };
  sc.events.once('shutdown', () => unback());   // 화면이 바뀌면 뒤로가기 목록에서도 빠짐 (남아 있으면 다음 뒤로가기가 먹힘)
  if (o.closable !== false && o.dimClose !== false) dim.on('pointerup', p => { if (Math.hypot(p.upX - p.downX, p.upY - p.downY) < 24) close(); });   // 끌다가 뗀 건 닫지 않음
  const unback = pushBack(() => { if (root.closing || !root.scene) return false; if (o.onBack) { o.onBack(); return true; } if (o.closable === false) return true; close(); return true; });
  return { root, box, content, close };
}
export function toast(sc, msg, y = H * 0.42) {
  y += sc.cameras.main.scrollY; const c = sc.add.container(W / 2, y).setDepth(2000), t = T(sc, 0, 0, msg, 34, C.text, { w: 800 }), bg = sc.add.rectangle(0, 0, t.width + 70, 84, 0x2E1A2A, 0.92).setStrokeStyle(2, 0xFF9DB6, 0.6);
  c.add([bg, t]); c.setAlpha(0); sc.tweens.add({ targets: c, alpha: 1, y: y - 20, duration: 200, hold: 1300, yoyo: true, onComplete: () => c.destroy() });
}
// 원형 글로우·반짝이 텍스처
export function makeTextures(sc) {
  tex(sc, 'glow', 128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  tex(sc, 'spark', 64, 64, g => { g.translate(32, 32); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 7 : 30; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  tex(sc, 'ring', 160, 160, g => { g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.arc(80, 80, 72, 0, Math.PI * 2); g.stroke(); });
}

// 처음 여는 기능 안내 (한 번만): firstTip(scene, 'album', '카드 앨범', ['줄1', '줄2'], 'pack_basic')
export function firstTip(sc, key, title, lines, img) {
  const d = loadSave(); d.tips = d.tips || {}; if (d.tips[key]) return false; d.tips[key] = 1; saveSave();
  const p = popup(sc, 900, 760 + lines.length * 20, { depth: 1500 }); p.content.add(T(sc, 0, -300, title, 44, C.rose, { w: 900 }));
  if (img) { const im = sc.add.image(0, -150, img); im.setScale(170 / Math.max(im.width, im.height)); p.content.add(im); }
  lines.forEach((l, i) => p.content.add(T(sc, 0, (img ? 0 : -160) + i * 62, l, 28, C.ink, { w: 800, wrap: 780 })));
  p.content.add(btn(sc, 0, 300 + lines.length * 8, 360, 100, '알겠어요', () => p.close(), { size: 32 })); return true;
}
