// K뷰티 레시피 UI: 크림 패널 · 장미색 버튼 · 금빛 포인트 (모두 코드로 그림)
import { W, H } from './config.js?v=0.50.2';
import { audio } from './audio.js?v=0.50.2';
import { pushBack } from './oad.js?v=0.50.2';
import { load as loadSave, save as saveSave } from './save.js?v=0.50.2';

export const C = { ink: '#4A2C2A', text: '#FFFFFF', cream: '#FFF4EC', paper: '#FFFBF6', brown: '#8A5A44', sub: '#C99A86', dim: '#A08878', gold: '#E8A93A', rose: '#E86A8E', plum: '#5A3A34', red: '#D9573B', green: '#5FA65A', blue: '#4E86C6', mint: '#7CC6A8' };
export const FONT = 'Pretendard, sans-serif';

// 글자 속 재화 기호는 기본 화면과 같은 그림 아이콘으로 (🪙 코인 · 💎 보석 · ⭐ 경험치 · 🧰 재료 · 🧱 자재)
export const CUR = { '🪙': 'coin', '💎': 'gem', '⭐': 'xp', '🧰': 'tools', '🔨': 'tools', '🧱': 'brick' };
const CUR_RE = /(🪙|💎|⭐|🧰|🔨|🧱)/u;
export function T(sc, x, y, s, size = 40, color = C.text, o = {}) {
  if (typeof s === 'string' && CUR_RE.test(s) && sc.textures.exists('coin')) return richT(sc, x, y, s, size, color, o);
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
  const s = STY[o.style || 'green'], key = `bt_${w}_${h}_${o.style || 'green'}`;   // 기본은 초록(행동) · 분홍(rose)은 보석 쓰기
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
// ── 창 규칙 (더팜 UI/UX 통일)
//  · 작은 창: 건물 하나 · 행동 하나 → 너비 980 고정, 높이 S/M/L 세 가지, 오른쪽 위 ✕ · 바깥 누르기 · 폰 뒤로가기
//  · 전체 화면(o.full = 제목): 목록을 둘러보는 메뉴 → 위 재화 막대 아래에 제목 막대(◀ 뒤로) + 위아래로 밀어 보기
//  · 마을(Hud) 위에서는 위 재화 막대(140px)를 가리지 않음 → 숫자가 항상 보임
//  · 내용이 창보다 길면 손가락으로 밀어 봄 (밀다가 뗀 건 누른 걸로 치지 않음)
export const TOPBAR = 140, POP_W = 980, POP_H = { S: 640, M: 980 };
const popL = () => Math.min(1560, H - TOPBAR - 220);
let gx = false;
function guardTaps() { if (gx) return; gx = true;   // 밀어 보는 중이거나 보이는 칸 밖의 버튼은 눌리지 않게
  const emit = Phaser.GameObjects.GameObject.prototype.emit;
  Phaser.GameObjects.GameObject.prototype.emit = function (ev, ...a) {
    if (ev === 'pointerup' || ev === 'pointerdown') { const sc = this.scene; if (sc && sc._scrolled && ev === 'pointerup') return false;
      if (sc && sc._clips && sc._clips.length) { const pt = a[0]; for (const cl of sc._clips) { if (!cl.content.active) continue; let o = this.parentContainer; while (o && o !== cl.content) o = o.parentContainer; if (o === cl.content && pt && (pt.y < cl.y0 || pt.y > cl.y1)) return false; } } }
    return emit.call(this, ev, ...a); }; }
function scroller(sc, content, y0, y1, extra) {   // extra = 보이는 칸보다 긴 길이
  guardTaps(); const base = content.y, mk = sc.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRect(0, y0, W, y1 - y0); content.setMask(mk.createGeometryMask());
  const clip = { content, y0, y1 }; (sc._clips = sc._clips || []).push(clip); let st = null;
  const bar = sc.add.graphics(); const drawBar = () => { bar.clear(); if (extra <= 0) return; const vh = y1 - y0, k = (base - content.y) / extra, bh = Math.max(60, vh * vh / (vh + extra)); bar.fillStyle(0x8A5A2B, 0.45).fillRoundedRect(W - 22, y0 + 8 + (vh - 16 - bh) * k, 10, bh, 5); };
  const down = p => { sc._scrolled = false; if (p.y >= y0 && p.y <= y1 && content.active) st = { y: p.y, c: content.y }; };
  const move = p => { if (!st || !p.isDown) return; const dy = p.y - st.y; if (Math.abs(dy) > 14) sc._scrolled = true; if (sc._scrolled) { content.y = Phaser.Math.Clamp(st.c + dy, base - extra, base); drawBar(); } };
  const up = () => { st = null; sc.time.delayedCall(0, () => { sc._scrolled = false; }); };
  const wheel = (p, o, dx, dy) => { if (p.y >= y0 && p.y <= y1 && content.active) { content.y = Phaser.Math.Clamp(content.y - dy, base - extra, base); drawBar(); } };
  sc.input.on('pointerdown', down); sc.input.on('pointermove', move); sc.input.on('pointerup', up); sc.input.on('wheel', wheel); drawBar();
  const off = () => { sc.input.off('pointerdown', down); sc.input.off('pointermove', move); sc.input.off('pointerup', up); sc.input.off('wheel', wheel); sc._clips = (sc._clips || []).filter(x => x !== clip); };
  return { bar, off, scrollTo: y => { content.y = Phaser.Math.Clamp(base - y, base - extra, base); drawBar(); } }; }
// 창 (뒤로가기로 닫힘) — w·h 는 내용을 그린 크기 (창 크기는 규칙대로 맞춰짐)
export function popup(sc, w, h, o = {}) {
  const cam = sc.cameras.main, onTown = sc.scene.key === 'Hud' || sc._framed, top = onTown ? TOPBAR : 0, root = sc.add.container(cam.scrollX, cam.scrollY).setDepth(o.depth || 1000);
  const dim = sc.add.rectangle(W / 2, top + (H - top) / 2, W, H - top, 0x1A0814, o.full ? 0 : 0.6).setInteractive(); root.add(dim);
  let box, content, sc2, viewY0, viewY1;
  if (o.full) {   // 전체 화면
    const bg = sc.add.rectangle(W / 2, top + (H - top) / 2, W, H - top, 0xFFF3E0); root.add(bg);
    const hd = sc.add.graphics(); hd.fillStyle(0x5A3A1E, 1).fillRect(0, top, W, 112).fillStyle(0x8A5A2B, 1).fillRect(0, top + 104, W, 8); root.add(hd);
    root.add(T(sc, W / 2, top + 54, o.full, 40, '#FFFFFF', { w: 900 }));
    viewY0 = top + 112; viewY1 = H; box = sc.add.container(W / 2, viewY0 + h / 2 + 10); root.add(box); content = sc.add.container(0, 0); box.add(content);
    const extra = Math.max(0, h + 40 - (viewY1 - viewY0)); if (extra) sc2 = scroller(sc, box, viewY0, viewY1, extra), root.add(sc2.bar);
    const addT = content.add.bind(content); let skipped = false; content.add = ch => { if (!skipped && ch && ch.type === 'Text' && ch.text === o.full) { skipped = true; ch.destroy(); return content; } if (!skipped && Array.isArray(ch)) {} return addT(ch); };   // 내용 안의 같은 제목은 위 막대와 겹치니 뺌
  } else {
    const ph = o.size ? (o.size === 'L' ? popL() : POP_H[o.size]) : h <= 700 ? POP_H.S : h <= 1060 ? POP_H.M : popL(), pw = POP_W, cy = o.y || top + (H - top) / 2;
    box = sc.add.container(W / 2, cy); root.add(box); box.add(panel(sc, 0, 0, pw, ph, { tone: o.tone }));
    content = sc.add.container(0, 0); box.add(content);
    if (h > ph) { content.y = (h - ph) / 2 + 10; viewY0 = cy - ph / 2 + 12; viewY1 = cy + ph / 2 - 12; sc2 = scroller(sc, content, viewY0, viewY1, h - ph + 20); box.add(sc2.bar); sc2.bar.setPosition(-W / 2, -cy); }
    if (!(o.instant || sc._instant)) { box.setScale(0.9).setAlpha(0); sc.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' }); }   // 내용만 바꿔 다시 열 때는 애니메이션 없이 (깜빡임 방지)
    w = pw; h = ph;
  }
  const done = () => { sc2 && sc2.off(); };
  const close = () => { if (root.closing) return; root.closing = true; unback(); done(); sc.tweens.add({ targets: root, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } }); };
  sc.events.once('shutdown', () => { unback(); done(); });   // 화면이 바뀌면 뒤로가기 목록에서도 빠짐 (남아 있으면 다음 뒤로가기가 먹힘)
  if (!o.full && o.closable !== false && o.dimClose !== false) dim.on('pointerup', p => { if (Math.hypot(p.upX - p.downX, p.upY - p.downY) < 24) close(); });   // 끌다가 뗀 건 닫지 않음
  const unback = pushBack(() => { if (root.closing || !root.scene) return false; if (o.onBack) { o.onBack(); return true; } if (o.closable === false) return true; close(); return true; });
  if (o.full) root.add(btn(sc, 100, top + 54, 150, 76, '◀', () => close(), { size: 34, style: 'cream' }));   // 전체 화면: 왼쪽 위 뒤로
  else if (o.closable !== false && !o.noX) { const x = btn(sc, w / 2 - 58, -h / 2 + 58, 84, 84, '✕', () => close(), { size: 34, style: 'cream' }); box.add(x); }   // 작은 창: 오른쪽 위 ✕
  const kill = () => { if (root.closing) return; root.closing = true; unback(); done(); root.destroy(); };   // 곧바로 없앰 (다시 그리기용)
  return { root, box, content, close, kill, scroll: sc2 };
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

// 빨간 점 (버튼 오른쪽 위에 · 살짝 콩콩)
export function redDot(sc, x, y, r = 16) { const d = sc.add.circle(x, y, r, 0xE8352E).setStrokeStyle(4, 0xFFFFFF); sc.tweens.add({ targets: d, scale: 1.18, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); return d; }

// 아이콘이 섞인 글자 (T 와 같은 쓰임새: setText · setStroke · setColor · setOrigin · text)
function richT(sc, x, y, str, size, color, o) {
  const c = sc.add.container(x, y), st = { str, color, stroke: null, ox: o.ox ?? 0.5, oy: o.oy ?? 0.5, shadow: o.shadow };
  const mk = s => { const t = sc.add.text(0, 0, s, { fontFamily: FONT, fontStyle: String(o.w || 800), fontSize: `${size}px`, color: st.color, resolution: 2 }).setOrigin(0, 0.5); if (st.stroke) t.setStroke(st.stroke[0], st.stroke[1]); if (st.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.45)', 8, false, true); return t; };
  const build = () => { c.removeAll(true); const lh = size * 1.25 + (o.lh ?? 8), isz = size * 1.12, lines = [[]], width = o.wrap || 1e9; let lw = 0;
    const put = (obj, w) => { if (lw + w > width && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push([obj, w]); lw += w; };
    for (const ln of String(st.str).split('\n')) { if (lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      for (const part of ln.split(CUR_RE)) { if (!part) continue; if (CUR[part]) { const im = sc.add.image(0, 0, CUR[part]); im.setScale(isz / Math.max(im.width, im.height)); put(im, isz + 2); continue; }
        const words = o.wrap ? part.split(/(\s+)/) : [part]; for (const wd of words) { if (!wd) continue; const t = mk(wd); put(t, t.width); } } }
    const ws = lines.map(l => l.reduce((a, [, w]) => a + w, 0)), W = Math.max(1, ...ws), Ht = lines.length * lh;
    lines.forEach((l, i) => { const al = o.align || 'center', off = al === 'left' ? 0 : al === 'right' ? W - ws[i] : (W - ws[i]) / 2; let xx = off - W * st.ox; const yy = i * lh + lh / 2 - Ht * st.oy;
      for (const [obj, w] of l) { obj.setPosition(obj.type === 'Image' ? xx + w / 2 : xx, yy); c.add(obj); xx += w; } });
    c.width = W; c.height = Ht; };
  build();
  c.setText = v => { st.str = v; build(); return c; }; c.setStroke = (col, w) => { st.stroke = [col, w]; build(); return c; }; c.setColor = col => { st.color = col; build(); return c; };
  c.setOrigin = (ox, oy = ox) => { st.ox = ox; st.oy = oy; build(); return c; }; c.setShadow = () => { st.shadow = true; build(); return c; }; c.setLetterSpacing = () => c;
  Object.defineProperty(c, 'text', { get: () => st.str }); return c;
}
