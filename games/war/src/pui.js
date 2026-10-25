// 군용 UI 키트 (워스토리풍): 올리브 철판 패널 · 리벳 · 카키 버튼 · 선 아이콘 (모두 코드로 그림)
import { W, H, FONT } from './config.js?v=0.55.2';
import { audio } from './audio.js?v=0.55.2';
import { pushBack } from './oad.js?v=0.55.2';

export const C = {
  ink: '#2B2416', text: '#FFF8E6', sub: '#D8CFA8', dim: '#9A9272', gold: '#FFD45A', cyan: '#8FE3FF', pink: '#FF8A7A', green: '#A6E07A', red: '#FF6A55', blue: '#7FB2FF',
};
export const fmt = n => Math.floor(n).toLocaleString('en-US');

// 글자: 굵기(700/800/900) · 자간 · 은은한 그림자 (굵은 외곽선 없이)
export function T(scene, x, y, s, size = 44, color = C.text, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT, fontStyle: String(o.w || 800), fontSize: `${size}px`, color, align: o.align || 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, lineSpacing: o.lh ?? 6, resolution: 2,
    stroke: o.stroke || '#000000', strokeThickness: o.stroke ? (o.thick || 6) : 0,
  }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.ls) t.setLetterSpacing(o.ls);
  if (o.shadow !== false) t.setShadow(0, Math.max(2, size * 0.06), 'rgba(0,0,0,0.45)', Math.max(4, size * 0.12), false, true);
  return t;
}

// 둥근 사각형 — 모서리 반지름이 높이·너비의 절반을 넘으면 arcTo 가 바깥으로 뾰족하게 튀므로(뿔 모양 자국) 반드시 줄임
const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function canvasTex(scene, key, w, h, draw) { if (scene.textures.exists(key)) return key; const c = scene.textures.createCanvas(key, w, h); draw(c.getContext(), w, h); c.refresh(); return key; }

// 철판 패널: 올리브 드랩 그라데이션 + 어두운 안쪽 테두리 + 네 귀퉁이 리벳 (tone: paper 는 작전 문서 같은 카키 종이)
export function panel(scene, x, y, w, h, o = {}) {
  const r = o.r ?? 26, key = `mpnl_${w}_${h}_${r}_${o.tone || 'n'}`;
  canvasTex(scene, key, w + 96, h + 96, (g) => {
    g.translate(48, 48);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 22; g.shadowOffsetY = 10;
    rr(g, 0, 0, w, h, r);
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (o.tone === 'paper') { gr.addColorStop(0, '#EFE2B6'); gr.addColorStop(1, '#D3C08A'); }
    else if (o.tone === 'gold') { gr.addColorStop(0, 'rgba(112,88,34,0.96)'); gr.addColorStop(1, 'rgba(70,52,20,0.96)'); }
    else if (o.tone === 'red') { gr.addColorStop(0, 'rgba(112,44,34,0.96)'); gr.addColorStop(1, 'rgba(68,24,18,0.96)'); }
    else { gr.addColorStop(0, 'rgba(92,100,58,0.96)'); gr.addColorStop(1, 'rgba(56,62,34,0.97)'); }
    g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
    rr(g, 2, 2, w - 4, h - 4, r - 2); g.lineWidth = 4; g.strokeStyle = o.tone === 'paper' ? 'rgba(110,86,40,0.55)' : o.tone === 'gold' ? 'rgba(255,212,90,0.7)' : 'rgba(20,22,10,0.55)'; g.stroke();
    rr(g, 9, 9, w - 18, h - 18, Math.max(4, r - 9)); g.lineWidth = 2; g.strokeStyle = o.tone === 'paper' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.10)'; g.stroke();
    const hl = g.createLinearGradient(0, 0, 0, Math.min(90, h * 0.35)); hl.addColorStop(0, 'rgba(255,255,255,0.10)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    rr(g, 4, 4, w - 8, Math.min(90, h * 0.35), r - 4); g.fillStyle = hl; g.fill();
    if (w > 160 && h > 120) for (const [rx, ry] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) {   // 리벳
      const rg = g.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, 7); rg.addColorStop(0, o.tone === 'paper' ? '#FFF7DA' : '#C9CDA8'); rg.addColorStop(1, o.tone === 'paper' ? '#8E7A48' : '#2C3018');
      g.beginPath(); g.arc(rx, ry, 6.5, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
    }
  });
  return scene.add.image(x, y, key);
}

// 버튼: gold(주 버튼) · indigo(보조) · ghost(테두리만)
const STY = {
  gold: { a: '#FFE27A', b: '#F0A92A', c: '#A86A10', text: '#3A2400' },
  indigo: { a: '#A3B868', b: '#6E8338', c: '#3F4E1C', text: '#FFFFFF' },
  olive: { a: '#A3B868', b: '#6E8338', c: '#3F4E1C', text: '#FFFFFF' },
  red: { a: '#FF8F6E', b: '#D9472E', c: '#8E2414', text: '#FFFFFF' },
  blue: { a: '#8EC2FF', b: '#3E7FD8', c: '#1E4C94', text: '#FFFFFF' },
  green: { a: '#B6EE8A', b: '#5FB43A', c: '#2F7418', text: '#14300A' },
  ghost: { a: 'rgba(40,44,22,0.75)', b: 'rgba(30,32,16,0.75)', c: 'rgba(200,190,140,0.45)', text: '#FFF8E6' },
};
// 연타 막기: 닫히는 중인 팝업 안의 버튼 · 방금(0.35초 안) 눌린 버튼은 무시
export function dead(c) {
  if (c.lastFire != null && c.scene && c.scene.time.now - c.lastFire < 350) return true;
  for (let o = c; o; o = o.parentContainer) if (o.closing || !o.active) return true;
  return false;
}
export function btn(scene, x, y, w, h, label, onClick, o = {}) {
  const st = STY[o.style || 'gold'], r = o.r ?? h / 2, key = `btn2_${o.style || 'gold'}_${w}_${h}`;
  // 그림자(번짐 18 · 아래 10)가 잘려 모서리에 각진 자국이 남지 않게 여백을 넉넉히 — 버튼 중심은 예전과 같게
  canvasTex(scene, key, w + 80, h + 80, (g) => {
    g.translate(40, 34);
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 18; g.shadowOffsetY = 10;
    rr(g, 0, 6, w, h - 6, r); g.fillStyle = st.c; g.fill(); g.shadowColor = 'transparent';
    rr(g, 0, 0, w, h - 8, r); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, st.a); gr.addColorStop(1, st.b); g.fillStyle = gr; g.fill();
    rr(g, 6, 5, w - 12, (h - 8) * 0.45, r * 0.8); const hl = g.createLinearGradient(0, 0, 0, h * 0.45); hl.addColorStop(0, 'rgba(255,255,255,0.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fill();
    if (o.style === 'ghost') { rr(g, 1, 1, w - 2, h - 10, r); g.lineWidth = 3; g.strokeStyle = st.c; g.stroke(); }
  });
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, key);
  c.add(img);
  let tx = 0;
  if (o.icon) { const ic = scene.add.image(-w / 2 + h * 0.55, -4, o.icon).setDisplaySize(h * 0.42, h * 0.42).setTint(Phaser.Display.Color.HexStringToColor(st.text).color); c.add(ic); tx = h * 0.18; }
  const t = T(scene, tx, -4, label, o.size || Math.round(h * 0.34), st.text, { w: 900, shadow: false, ls: o.ls ?? 1 });
  c.add(t); c.label = t;
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  let down = false;
  c.on('pointerdown', () => { if (c.disabled) return; down = true; c.setScale(0.96); });
  const up = fire => { if (!down) return; down = false; c.setScale(1); if (fire && !c.disabled && !dead(c)) { c.lastFire = scene.time.now; audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); } };
  c.on('pointerup', () => up(true)); c.on('pointerout', () => up(false));
  c.setEnabled = on => { c.disabled = !on; c.setAlpha(on ? 1 : 0.45); return c; };
  c.setLabel = s => { t.setText(s); return c; };
  return c;
}

// 동그란 유리 아이콘 버튼
export function iconBtn(scene, x, y, icon, onClick, size = 104) {
  const key = `ib_${size}`;
  canvasTex(scene, key, size + 20, size + 20, g => {
    g.translate(10, 10); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    const gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, 'rgba(110,120,66,0.95)'); gr.addColorStop(1, 'rgba(56,62,30,0.95)'); g.fillStyle = gr; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke();
  });
  const c = scene.add.container(x, y);
  const ic = scene.add.image(0, 0, icon).setDisplaySize(size * 0.46, size * 0.46);
  c.add([scene.add.image(0, 0, key), ic]); c.icon = ic;
  c.setSize(size, size).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.92));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); if (dead(c)) return; c.lastFire = scene.time.now; audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); });
  return c;
}

// 선 아이콘 (흰색, 틴트로 색 변경)
export function makeIcons(scene) {
  const S = 96, L = 8;
  const ic = (k, f) => canvasTex(scene, k, S, S, g => { g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = L; g.lineCap = 'round'; g.lineJoin = 'round'; f(g); });
  ic('i_pause', g => { g.fillRect(28, 22, 13, 52); g.fillRect(55, 22, 13, 52); });
  ic('i_play', g => { g.beginPath(); g.moveTo(32, 20); g.lineTo(76, 48); g.lineTo(32, 76); g.closePath(); g.fill(); });
  ic('i_home', g => { g.beginPath(); g.moveTo(18, 46); g.lineTo(48, 20); g.lineTo(78, 46); g.stroke(); g.beginPath(); g.moveTo(28, 40); g.lineTo(28, 76); g.lineTo(68, 76); g.lineTo(68, 40); g.stroke(); });
  ic('i_retry', g => { g.beginPath(); g.arc(48, 50, 26, -Math.PI * 0.9, Math.PI * 0.6); g.stroke(); g.beginPath(); g.moveTo(18, 22); g.lineTo(22, 42); g.lineTo(40, 36); g.stroke(); });
  ic('i_sound', g => { g.beginPath(); g.moveTo(18, 38); g.lineTo(32, 38); g.lineTo(50, 22); g.lineTo(50, 74); g.lineTo(32, 58); g.lineTo(18, 58); g.closePath(); g.fill(); g.beginPath(); g.arc(52, 48, 18, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(52, 48, 32, -0.8, 0.8); g.stroke(); });
  ic('i_sound_off', g => { g.beginPath(); g.moveTo(18, 38); g.lineTo(32, 38); g.lineTo(50, 22); g.lineTo(50, 74); g.lineTo(32, 58); g.lineTo(18, 58); g.closePath(); g.fill(); g.beginPath(); g.moveTo(62, 36); g.lineTo(84, 60); g.moveTo(84, 36); g.lineTo(62, 60); g.stroke(); });
  ic('i_music', g => { g.beginPath(); g.moveTo(38, 66); g.lineTo(38, 22); g.lineTo(74, 16); g.lineTo(74, 58); g.stroke(); g.beginPath(); g.arc(30, 68, 10, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(66, 60, 10, 0, Math.PI * 2); g.fill(); });
  ic('i_music_off', g => { g.globalAlpha = 0.5; g.beginPath(); g.moveTo(38, 66); g.lineTo(38, 22); g.lineTo(74, 16); g.lineTo(74, 58); g.stroke(); g.globalAlpha = 1; g.beginPath(); g.moveTo(20, 20); g.lineTo(80, 80); g.stroke(); });
  ic('i_crown', g => { g.beginPath(); g.moveTo(16, 70); g.lineTo(12, 30); g.lineTo(32, 48); g.lineTo(48, 20); g.lineTo(64, 48); g.lineTo(84, 30); g.lineTo(80, 70); g.closePath(); g.fill(); });
  ic('i_flame', g => { g.beginPath(); g.moveTo(48, 12); g.bezierCurveTo(70, 34, 80, 52, 70, 70); g.bezierCurveTo(62, 86, 34, 86, 26, 70); g.bezierCurveTo(18, 54, 30, 44, 34, 30); g.bezierCurveTo(40, 42, 44, 44, 48, 40); g.bezierCurveTo(52, 30, 50, 22, 48, 12); g.fill(); });
  ic('i_trophy', g => { g.beginPath(); g.moveTo(28, 16); g.lineTo(68, 16); g.lineTo(66, 44); g.bezierCurveTo(62, 58, 34, 58, 30, 44); g.closePath(); g.fill(); g.fillRect(43, 56, 10, 14); g.fillRect(30, 70, 36, 10); g.beginPath(); g.arc(24, 30, 10, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(72, 30, 10, -Math.PI * 0.5, Math.PI * 0.5); g.stroke(); });
  ic('i_star', g => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 17 : 38; g.lineTo(48 + Math.cos(a) * rr2, 50 + Math.sin(a) * rr2); } g.closePath(); g.fill(); });
  ic('i_gear', g => { g.lineWidth = 9; g.beginPath(); g.arc(48, 48, 16, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26); g.lineTo(48 + Math.cos(a) * 36, 48 + Math.sin(a) * 36); g.stroke(); } });
  ic('i_close', g => { g.beginPath(); g.moveTo(26, 26); g.lineTo(70, 70); g.moveTo(70, 26); g.lineTo(26, 70); g.stroke(); });
  ic('i_lock', g => { g.fillRect(24, 44, 48, 36); g.beginPath(); g.arc(48, 42, 16, Math.PI, 0); g.stroke(); });
  ic('i_check', g => { g.lineWidth = 11; g.beginPath(); g.moveTo(20, 50); g.lineTo(40, 70); g.lineTo(78, 28); g.stroke(); });
  ic('i_grid', g => { for (const [x, y] of [[18, 18], [52, 18], [18, 52], [52, 52]]) g.fillRect(x, y, 26, 26); });
  ic('i_land', g => { g.lineWidth = 7; g.strokeRect(14, 18, 68, 60); g.beginPath(); g.moveTo(18, 72); g.lineTo(40, 44); g.lineTo(54, 60); g.lineTo(64, 50); g.lineTo(78, 72); g.closePath(); g.fill(); g.beginPath(); g.arc(64, 34, 7, 0, Math.PI * 2); g.fill(); });
  ic('i_film', g => { g.lineWidth = 7; g.strokeRect(16, 24, 64, 48); g.beginPath(); g.moveTo(42, 38); g.lineTo(58, 48); g.lineTo(42, 58); g.closePath(); g.fill(); });
}

// 팝업: 어두운 막 + 유리 패널 + 제목
export function popup(scene, title, w = 900, h = 900, o = {}) {
  const root = scene.add.container(0, 0).setDepth(o.depth || 1000);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x0E0C06, 0.7).setInteractive();
  root.add(dim);
  const box = scene.add.container(W / 2, o.y || H / 2);
  root.add(box);
  box.add(panel(scene, 0, 0, w, h, { r: 44 }));
  if (title) box.add(T(scene, 0, -h / 2 + 80, title, 56, C.text, { w: 900, ls: 1 }));
  const content = scene.add.container(0, 0); box.add(content);
  const close = () => { if (root.closing) return; root.closing = true; scene.tweens.add({ targets: box, scale: 0.92, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } }); scene.tweens.add({ targets: dim, alpha: 0, duration: 140 }); };
  if (o.closable !== false) { box.add(iconBtn(scene, w / 2 - 70, -h / 2 + 70, 'i_close', close, 88)); if (o.dimClose !== false) dim.on('pointerup', close); }
  // 뒤로가기 (One a Day): 맨 위 팝업부터 — 닫을 수 있으면 닫고, 닫기 없는 창은 onBack 이 있으면 그것(예: 일시정지 → 계속하기), 없으면 그대로 둠
  const unback = pushBack(() => { if (root.closing) return false; if (o.onBack) { o.onBack(); return true; } if (o.closable === false) return true; close(); return true; });
  root.once('destroy', unback);
  box.setScale(0.92); box.alpha = 0;
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });
  Object.assign(root, { box, content, close, w, h });
  return root;
}

// 알림: 어두운 알약 배경 위 글자 (어느 배경에서도 읽히게)
export function toast(scene, msg, color = C.text, y = H * 0.4) {
  const c = scene.add.container(W / 2, y).setDepth(3000).setAlpha(0);
  const t = T(scene, 0, 0, msg, 38, color, { w: 800, wrap: W - 160 });
  const bw = Math.min(W - 60, t.width + 80), bh = t.height + 34;
  const bg = scene.add.graphics(); bg.fillStyle(0x1C1A0E, 0.9).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, Math.min(40, bh / 2)).lineStyle(2, 0xFFFFFF, 0.12).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, Math.min(40, bh / 2));
  c.add([bg, t]);
  scene.tweens.add({ targets: c, alpha: 1, y: y - 20, duration: 180, yoyo: true, hold: 1100, onComplete: () => c.destroy() });
}
