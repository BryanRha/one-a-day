// 위 막대(전투력 · 골드 · 보석 · 열쇠)와 아래 메뉴 — Hud 장면(항상 맨 위)에서 그림
import { W, H } from './config.js?v=0.55.0';
import { T, R, C, TS } from './ui.js?v=0.55.0';
import { load } from './save.js?v=0.55.0';
import { fmt, teamPower, stageName } from './state.js?v=0.55.0';
import { audio } from './audio.js?v=0.55.0';

export const TOP = 150, NAV_H = 176;
export function topBar(sc) {
  const c = sc.add.container(0, 0).setDepth(900), g = sc.add.graphics();
  g.fillGradientStyle(0x0B1028, 0x0B1028, 0x121933, 0x121933, 0.98).fillRect(0, 0, W, TOP).fillStyle(0xF2C46B, 0.5).fillRect(0, TOP - 3, W, 3); c.add(g);
  const face = sc.add.image(80, 76, 'face_cloud'); face.setDisplaySize(96, 96); const ring = sc.add.circle(80, 76, 50).setStrokeStyle(5, 0xF2C46B); const mask = sc.make.graphics().fillCircle(80, 76, 47); face.setMask(mask.createGeometryMask());
  const pw = sc.add.image(160, 58, 'eq28').setDisplaySize(34, 34), pT = T(sc, 184, 58, '', 34, C.gold, { ox: 0, w: 900 }), stT = T(sc, 150, 104, '', 24, C.dim, { ox: 0, w: 800 });
  c.add([face, ring, pw, pT, stT]);
  const pill = (x, icon) => { const pg = sc.add.graphics(); pg.fillStyle(0x000000, 0.45).fillRoundedRect(x, 50, 196, 56, 28).lineStyle(2, 0x3A4A86, 1).strokeRoundedRect(x, 50, 196, 56, 28); const ic = sc.add.image(x + 30, 78, icon); ic.setDisplaySize(52, 52); const t = T(sc, x + 116, 78, '', 30, C.ink, { w: 900 }); c.add([pg, ic, t]); return t; };
  const gT = pill(458, 'i_gold'), mT = pill(664, 'i_gem'), kT = pill(870, 'i_key');
  const upd = () => { const d = load(); pT.setText(fmt(teamPower())); stT.setText(`스테이지 ${stageName(d.stage)}`); gT.setText(fmt(d.gold)); mT.setText(fmt(d.gems)); kT.setText(fmt(d.keys));
    const lead = d.team[0]; if (lead && face.texture.key !== `face_${lead}`) face.setTexture(`face_${lead}`).setDisplaySize(96, 96); };
  upd(); sc.time.addEvent({ delay: 500, loop: true, callback: upd }); c.update = upd;
  c.goldAt = { x: 488, y: 78 }; c.gemAt = { x: 694, y: 78 }; c.keyAt = { x: 900, y: 78 };
  return c;
}
export const TABS = [['Heroes', '영웅', 'face_kenneth'], ['Gear', '장비', 'eq26'], ['Battle', '전투', 'shop7'], ['Summon', '소환', 'shop383'], ['Dungeon', '모험', 'shop379']];
export function navBar(sc, onTab) {
  const y0 = H - NAV_H, c = sc.add.container(0, y0).setDepth(900), g = sc.add.graphics(); c.add(g);
  g.fillGradientStyle(0x18204A, 0x18204A, 0x0B1028, 0x0B1028, 1).fillRect(0, 0, W, NAV_H).fillStyle(0xF2C46B, 0.45).fillRect(0, 0, W, 3);
  const items = TABS.map(([k, n, ic], i) => { const x = W / 5 * (i + 0.5), it = sc.add.container(x, 0), bar = sc.add.rectangle(0, 4, 130, 6, 0xF2C46B).setVisible(false), im = sc.add.image(0, 66, ic); im.setDisplaySize(86, 86);
    const t = T(sc, 0, 132, n, 28, C.dim, { w: 900 }), dot = sc.add.circle(44, 28, 12, 0xFF5A5A).setStrokeStyle(3, 0xFFFFFF).setVisible(false); it.add([bar, im, t, dot]); it.k = k; it.bar = bar; it.t = t; it.im = im; it.dot = dot;
    it.setSize(W / 5, NAV_H).setInteractive({ useHandCursor: true }).on('pointerup', () => { audio.play('sfx_tap', { volume: 0.6 }); onTab(k); }); c.add(it); return it; });
  c.setActive = k => items.forEach(it => { const on = it.k === k; it.bar.setVisible(on); it.t.setColor(on ? C.gold : C.dim); it.im.setScale(it.im.scaleX / (it.big || 1) * (on ? 1.08 : 1)); it.big = on ? 1.08 : 1; });
  c.dot = (k, on) => { const it = items.find(i => i.k === k); if (it) it.dot.setVisible(!!on); };
  return c;
}
