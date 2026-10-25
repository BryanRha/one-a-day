// K뷰티 레시피 UI: 크림 패널 · 장미색 버튼 · 금빛 포인트 (모두 코드로 그림)
import { W, H } from './config.js?v=0.54.0';
import { audio } from './audio.js?v=0.54.0';
import { pushBack } from './oad.js?v=0.54.0';
import { load as loadSave, save as saveSave } from './save.js?v=0.54.0';
import { PACKS } from './album.js?v=0.54.0';
import { SPECIAL } from './data.js?v=0.54.0';
import { decoInfo, theme } from './events.js?v=0.54.0';

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
  const c = sc.add.container(x, y), im = sc.add.image(0, 0, key), fs = o.size || Math.round(h * 0.34), t = R(sc, 0, -4, label, fs, s[3], { w: 900 });
  c.add([im, t]); if (t.width > w - 36) t.setScale((w - 36) / t.width); c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => sc.tweens.add({ targets: c, scale: 0.95, duration: 70 }));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { sc.tweens.add({ targets: c, scale: 1, duration: 90 }); audio.play('sfx_tap', { volume: 0.6 }); onClick && onClick(); });
  c.label = t; c.setLabel = s2 => { const i = c.getIndex(c.label); c.label.destroy(); c.label = R(sc, 0, -4, s2, fs, s[3], { w: 900 }); if (c.label.width > w - 36) c.label.setScale((w - 36) / c.label.width); c.addAt(c.label, i); };
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
// ── 글자 크기 단계 (1080 기준): 제목 · 소제목 · 본문 · 보조 — 가장 작은 글자도 폰에서 읽히게
export const TS = { h1: 46, h2: 38, body: 32, cap: 28, min: 24 };
// ── 재화 글자: '◆30', '●100', '⚡20', '★10' 의 기호를 위 막대와 같은 그림 아이콘으로 바꿔 그림
const GLY = { '⚡': 'energy', '●': 'coin', '◆': 'gem', '★': 'star' }, GRE = /([⚡●◆★])\s?(?=[+\d])/;
export const hasGly = s => GRE.test(String(s));
export function R(sc, x, y, s, size = TS.body, color = C.ink, o = {}) {
  if (!hasGly(s)) return T(sc, x, y, s, size, color, o);
  const c = sc.add.container(x, y), build = str => {
    c.removeAll(true); let cx = 0; const parts = String(str).split(/([⚡●◆★])\s?(?=[+\d])/);
    parts.forEach((pt, i) => { if (!pt) return;
      if (i % 2) { const im = sc.add.image(cx, 0, GLY[pt]).setOrigin(0, 0.5); im.setScale(size * 1.08 / Math.max(im.width, im.height)); c.add(im); cx += im.displayWidth + size * 0.08; }
      else { const t = T(sc, cx, 0, pt, size, color, { ...o, ox: 0, wrap: undefined }); c.add(t); cx += t.width; } });
    const ox = o.ox ?? 0.5; c.list.forEach(ch => { ch.x -= cx * ox; }); c.width = cx; c.height = size * 1.3; c.setSize(cx, size * 1.3);
  };
  build(s); c.setText = str => { build(str); return c; }; c.text = s; return c;
}
// 둥근 상자 (그림으로 만들어 크기가 잡힘 → 팝업 높이 자동 계산에 들어감)
export function rbox(sc, x, y, w, h, o = {}) {
  const r = o.r ?? 26, fill = o.fill ?? '#FFF4EC', line = o.line || null, lw = o.lw || 3, key = `rb_${w}_${h}_${r}_${fill}_${line}_${lw}`;
  tex(sc, key, w + lw * 2, h + lw * 2, g => { g.translate(lw, lw); rr(g, 0, 0, w, h, r); g.fillStyle = fill; g.fill(); if (line) { g.lineWidth = lw; g.strokeStyle = line; g.stroke(); } });
  return sc.add.image(x, y, key).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
}
// ── 팝업 (모든 창 공통 틀)
//   크기 S·M·L · 위: 분홍 리본 제목 + 오른쪽 위 ✕ · 가운데: 내용(높이는 내용에 맞춰 자동) · 아래: 버튼 자리
//   위 막대(재화)는 어둡게 덮지 않음 → 보석을 쓰는 창에서도 가진 수가 늘 보임
//   쓰는 법: const p = sheet(this, { size: 'M', title: '창고', sub: '설명' }); p.content.add(...); p.foot([{ t: '받기', fn }, { t: '닫기', style: 'cream' }]);
export const SZ = { S: 760, M: 900, L: 1000 };
export function sheet(sc, o = {}) {
  const cam = sc.cameras.main, w = SZ[o.size || 'M'] || o.size, top0 = sc.hud ? 132 : 0, dark = o.tone === 'dark';
  const root = sc.add.container(cam.scrollX, cam.scrollY).setDepth(o.depth || 1000);
  const guard = sc.add.rectangle(W / 2, top0 / 2, W, Math.max(2, top0), 0x000000, 0.001).setInteractive(), dim = sc.add.rectangle(W / 2, top0 + (H - top0) / 2, W, H - top0, 0x1A0814, 0.6).setInteractive(); root.add([guard, dim]);
  const box = sc.add.container(W / 2, 0), content = sc.add.container(0, 0); root.add(box); box.setAlpha(0);
  let btns = [], fitted = false;
  const close = () => { if (root.closing) return; root.closing = true; unback(); sc.tweens.add({ targets: root, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } }); };
  const p = { root, box, content, close, w, foot: list => { btns = list; if (fitted) layout(); return p; }, fit: () => layout() };
  const layout = () => {
    if (!root.scene) return; fitted = true; box.remove(content); box.removeAll(true); box.setScale(1);
    const b = content.list.length ? content.getBounds() : { y: 0, height: 0 }, minY = b.y - content.y, cH = b.height;
    const padT = (o.title ? 96 : 50) + (o.sub ? 52 : 0), padB = btns.length ? 176 : 56, Hp = o.h || Math.max(o.minH || 320, Math.round(padT + cH + padB));
    const by = o.y || top0 + (H - top0) / 2; box.y = by; content.y = o.h ? 0 : -Hp / 2 + padT - minY;   // 높이를 정한 창은 가운데 기준 좌표 그대로
    box.add(panel(sc, 0, 0, w, Hp, { tone: o.tone }));
    if (o.title) { const tt = T(sc, 0, -Hp / 2 + 2, o.title, TS.h1 - 4, '#FFFFFF', { w: 900, shadow: true }), bw = Math.min(w - 60, Math.max(440, tt.width + 150)); box.add([ribbon(sc, 0, -Hp / 2 + 2, bw), tt]); }
    if (o.sub) box.add(R(sc, 0, -Hp / 2 + 96, o.sub, TS.cap, dark ? '#FFE3EC' : C.dim, { w: 800 }));
    box.add(content);
    if (btns.length) { const n = btns.length, bw = n === 1 ? 460 : Math.min(380, (w - 120 - (n - 1) * 30) / n);
      btns.forEach((d, i) => box.add(btn(sc, (i - (n - 1) / 2) * (bw + 30), Hp / 2 - 96, d.w || bw, 112, d.t, () => { if (d.fn) d.fn(p); else p.close(); }, { style: d.style || (i === 0 ? 'rose' : 'cream'), size: d.size || 34 }))); }
    if (o.closable !== false && o.x !== false) { const x = closeX(sc, w / 2 - 34, -Hp / 2 + 34, dark); x.on('pointerup', close); box.add(x); }
    if (o.help) { const q = closeX(sc, -w / 2 + 34, -Hp / 2 + 34, dark, '?'); q.on('pointerup', () => o.help()); box.add(q); }
    if (o.deco) o.deco(p, Hp);
    const room = H - top0 - 40; if (Hp > room) box.setScale(room / Hp);
    p.Hp = Hp; if (!p.shown) { p.shown = true; const s1 = box.scale; box.setScale(s1 * 0.9); sc.tweens.add({ targets: box, scale: s1, alpha: 1, duration: 200, ease: 'Back.easeOut' }); } else box.setAlpha(1);
  };
  sc.events.once('postupdate', () => { if (!fitted) layout(); });   // 내용을 다 넣은 뒤 (그리기 직전) 크기 맞춤
  sc.events.once('shutdown', () => unback());
  if (o.closable !== false && o.dimClose !== false) dim.on('pointerup', pt => { if (Math.hypot(pt.upX - pt.downX, pt.upY - pt.downY) < 24) close(); });
  const unback = pushBack(() => { if (root.closing || !root.scene) return false; if (o.onBack) { o.onBack(); return true; } if (o.closable === false) return true; close(); return true; });
  return p;
}
// 예전 호출 호환: popup(sc, w, h, o) → 고정 높이 틀 (제목·버튼은 내용에 직접)
export function popup(sc, w, h, o = {}) { return sheet(sc, { ...o, size: w, h }); }
// 제목 리본 (가운데 띠 + 양 끝 꼬리)
function ribbon(sc, x, y, bw) {
  const key = `rib_${bw}`;
  tex(sc, key, bw + 80, 140, g => { const cx = 40, h = 92, ty = 18;
    g.fillStyle = '#B8436A'; for (const s of [-1, 1]) { g.beginPath(); const ex = s < 0 ? cx - 30 : cx + bw + 30, ix = s < 0 ? cx + 30 : cx + bw - 30; g.moveTo(ix, ty + 26); g.lineTo(ex, ty + 26); g.lineTo(ex + s * -22, ty + 26 + h / 2 - 4); g.lineTo(ex, ty + h + 18); g.lineTo(ix, ty + h + 18); g.closePath(); g.fill(); }
    g.shadowColor = 'rgba(120,30,60,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 6; rr(g, cx, ty, bw, h, 30); const gr = g.createLinearGradient(0, ty, 0, ty + h); gr.addColorStop(0, '#FF9DB6'); gr.addColorStop(1, '#E2557F'); g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
    rr(g, cx + 10, ty + 7, bw - 20, h * 0.38, 18); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill(); rr(g, cx + 5, ty + 5, bw - 10, h - 10, 26); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([8, 7]); g.stroke(); g.setLineDash([]); });
  return sc.add.image(x, y + 12, key);
}
// 오른쪽 위 ✕ (도움말은 '?')
function closeX(sc, x, y, dark, glyph = 'x') {
  const key = `cx_${glyph}_${dark ? 'd' : 'l'}`;
  tex(sc, key, 96, 100, g => { g.translate(48, 46); g.shadowColor = 'rgba(30,15,5,0.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.beginPath(); g.arc(0, 0, 36, 0, Math.PI * 2); g.fillStyle = '#FFFFFF'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 4; g.strokeStyle = '#F2A9BE'; g.stroke();
    g.strokeStyle = '#E2557F'; g.lineWidth = 8; g.lineCap = 'round'; if (glyph === 'x') { g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke(); } else { g.fillStyle = '#E2557F'; g.font = '900 44px Pretendard, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 2); } });
  const im = sc.add.image(x, y, key).setInteractive({ useHandCursor: true }); im.on('pointerdown', () => im.setScale(0.9)); im.on('pointerout', () => im.setScale(1)); im.on('pointerup', () => { im.setScale(1); audio.play('sfx_tap', { volume: 0.6 }); }); return im;
}
// ── 보상 그림: { energy, coins, gems, pack, joker, gift, items, deco } → [그림, 글]
export function rewardIcons(r) {
  const out = [];
  if (r.energy) out.push(['energy', `${r.energy}`]); if (r.coins) out.push(['coin', `${r.coins}`]); if (r.gems) out.push(['gem', `${r.gems}`]);
  if (r.pack) out.push([PACKS[r.pack].img, PACKS[r.pack].n]); if (r.joker) out.push(['joker', `조커${r.joker > 1 ? ` ×${r.joker}` : ''}`]); if (r.gift) out.push(['gen_gift', `선물${r.gift > 1 ? ` ×${r.gift}` : ''}`]);
  const cnt = {}; for (const k of r.items || []) cnt[k] = (cnt[k] || 0) + 1;
  for (const [k, n] of Object.entries(cnt)) out.push([k, (SPECIAL[k] ? SPECIAL[k].n.replace('화장품 ', '') : k) + (n > 1 ? ` ×${n}` : '')]);
  if (r.deco) { const di = decoInfo(r.deco.includes('_') ? r.deco : `${theme().id}_${r.deco}`); out.push([di.img, di.n]); }
  return out;
}
// 보상 칩: 그림을 가로로 · 아래 글 (bg: 바탕 상자 · done: 받음 표시)
export function chips(sc, x, y, r, o = {}) {
  const c = sc.add.container(x, y), ic = rewardIcons(r), s = o.size || 60, font = Math.max(TS.min, o.font || 24), gap = Math.max(s + 18, o.gap || 0), w0 = ic.length * gap;
  let wl = 0; ic.forEach(([img, t], i) => { const x2 = -w0 / 2 + gap / 2 + i * gap, im = sc.add.image(x2, 0, img); im.setScale(s / Math.max(im.width, im.height)); if (o.done) im.setAlpha(0.45); c.add(im); const tt = T(sc, x2, s / 2 + font * 0.6, t, font, o.done ? C.dim : o.color || C.brown, { w: 900 }); c.add(tt); wl = Math.max(wl, Math.abs(x2) * 2 + tt.width); });
  const bw = Math.round(Math.max(w0, wl) + 24); if (o.bg !== false) c.addAt(rbox(sc, 0, font / 2 + 4, bw, Math.round(s + font + 40), { fill: o.done ? '#E9F5EC' : '#FFFFFF', line: o.done ? '#7CC6A8' : '#F1D2C8', r: 18 }), 0);
  if (o.done) c.add(stamp(sc, bw / 2 - 30, -s / 2 + 6, 0.8));
  c.setSize(bw, s + font + 40); return c;
}
// '받음' 도장 (초록 동그라미 + ✓)
export function stamp(sc, x, y, k = 1) { const c = sc.add.container(x, y), g = sc.add.graphics(); g.fillStyle(0x5FA65A, 1).fillCircle(0, 0, 26).lineStyle(4, 0xFFFFFF, 1).strokeCircle(0, 0, 26); c.add([g, T(sc, 0, 0, '✓', 30, '#FFFFFF', { w: 900 })]); c.setScale(k); return c; }
export function toast(sc, msg, y = H * 0.42) {
  y += sc.cameras.main.scrollY; const c = sc.add.container(W / 2, y).setDepth(2000), t = R(sc, 0, 0, msg, 34, C.text, { w: 800 }), bg = sc.add.rectangle(0, 0, t.width + 70, 84, 0x2E1A2A, 0.92).setStrokeStyle(2, 0xFF9DB6, 0.6);
  c.add([bg, t]); c.setAlpha(0); sc.tweens.add({ targets: c, alpha: 1, y: y - 20, duration: 200, hold: 1300, yoyo: true, onComplete: () => c.destroy() });
}
// 원형 글로우·반짝이 텍스처
export function makeTextures(sc) {
  tex(sc, 'glow', 128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  tex(sc, 'spark', 64, 64, g => { g.translate(32, 32); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 7 : 30; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  tex(sc, 'star', 96, 96, g => { g.translate(48, 50); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#FFFFFF'; g.stroke(); const gr = g.createLinearGradient(0, -42, 0, 40); gr.addColorStop(0, '#FFE27A'); gr.addColorStop(1, '#F0A030'); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#C97A18'; g.stroke(); });
  tex(sc, 'ring', 160, 160, g => { g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.arc(80, 80, 72, 0, Math.PI * 2); g.stroke(); });
}

// 기능 안내: 처음 한 번 자동 · 창의 '?' 로 언제든 다시 (force)
export function firstTip(sc, key, title, lines, img, force) {
  const d = loadSave(); d.tips = d.tips || {}; if (d.tips[key] && !force) return false; d.tips[key] = 1; saveSave();
  const p = sheet(sc, { size: 'M', title, depth: 1500 }); let y = 0;
  if (img) { const im = sc.add.image(0, 90, img); im.setScale(180 / Math.max(im.width, im.height)); p.content.add(im); y = 220; }
  lines.forEach((l, i) => p.content.add(R(sc, 0, y + i * 66, l, TS.body - 2, C.ink, { w: 800, wrap: 780 })));
  p.foot([{ t: '알겠어요' }]); return true;
}
