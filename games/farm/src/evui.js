// 이벤트 화면 공통 그림 부품: 배너 · 아이콘 탭 · 보상 아이콘 묶음 · 상태 카드(받을 수 있음 · 받음 · 잠김)
import { W } from './config.js?v=0.58.0';
import { T, C, btn } from './ui.js?v=0.58.0';
import { ITEMS } from './data.js?v=0.58.0';

const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };
// 대표 그림 배너 (둥근 모서리 · 아래 어두운 띠 위에 제목 · 부제 · 오른쪽 위 남은 시간)
export function banner(sc, y, key, title, sub, badge) { const w = W - 60, h = 250, x0 = 30, im = sc.add.image(W / 2, y + h / 2, key); im.setScale(Math.max(w / im.width, h / im.height));
  const mk = sc.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRoundedRect(x0, y, w, h, 34); im.setMask(mk.createGeometryMask()); sc.events.on('postupdate', () => { mk.y = -sc.cameras.main.scrollY * 0 ; });
  const g = sc.add.graphics(); g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.62, 0.62).fillRoundedRect(x0, y + h * 0.42, w, h * 0.58, { tl: 0, tr: 0, bl: 34, br: 34 }); g.lineStyle(6, 0xE8C27A, 1).strokeRoundedRect(x0, y, w, h, 34);
  T(sc, 70, y + h - 92, title, 50, '#FFFFFF', { ox: 0, w: 900 }).setStroke('#3E2A14', 10); if (sub) T(sc, 72, y + h - 38, sub, 26, '#FFF1C9', { ox: 0, w: 800 }).setStroke('#3E2A14', 6);
  if (badge) { const bt = T(sc, W - 70, y + 40, badge, 26, '#FFFFFF', { ox: 1, w: 900 }), bw = bt.width + 40, bg = sc.add.graphics(); bg.fillStyle(0xE8507A, 1).fillRoundedRect(W - 50 - bw, y + 16, bw, 50, 25); bt.setDepth(1); }
  return y + h; }
// 아이콘 탭 (고른 탭은 떠 있는 크림 카드 · 나머지는 짙은 나무)
export function iconTabs(sc, y, tabs, cur, dots, go) { const n = tabs.length, w = (W - 40) / n;
  tabs.forEach(([k, label, ic], i) => { const x = 20 + w * i + w / 2, on = k === cur, c = sc.add.container(x, y), g = sc.add.graphics();
    if (on) g.fillStyle(0xC9A27A, 1).fillRoundedRect(-w / 2 + 6, -64, w - 12, 140, 26).fillStyle(0xFFFBF2, 1).fillRoundedRect(-w / 2 + 6, -70, w - 12, 136, 26).lineStyle(5, 0xF2B632, 1).strokeRoundedRect(-w / 2 + 6, -70, w - 12, 136, 26);
    else g.fillStyle(0x5A3A1E, 0.88).fillRoundedRect(-w / 2 + 8, -60, w - 16, 124, 24);
    c.add([g, icon(sc, 0, -14, ic, on ? 84 : 70), T(sc, 0, 46, label, 24, on ? C.ink : '#FFF1C9', { w: 900 })]); if (!on) c.list[1].setAlpha(0.8);
    c.setSize(w - 12, 136).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!on) go(k); });
    if (dots[k]) { const d = sc.add.circle(w / 2 - 22, -58, 15, 0xE8352E).setStrokeStyle(4, 0xFFFFFF); c.add(d); sc.tweens.add({ targets: d, scale: 1.2, duration: 500, yoyo: true, repeat: -1 }); } }); }
// 보상 아이콘 묶음 { coins, gems, tools, items } → 아이콘 + 숫자 (가운데 정렬)
export function rewards(sc, x, y, r, s = 56, align = 'c') { const list = []; if (r.coins) list.push(['coin', r.coins]); if (r.gems) list.push(['gem', r.gems]); if (r.tools) list.push(['tools', r.tools]); if (r.bm) list.push(['brick', r.bm]); if (r.items) for (const [k, n] of Object.entries(r.items)) list.push([k, n]);
  const c = sc.add.container(x, y), step = s * 1.75, w0 = (list.length - 1) * step; list.forEach(([k, n], i) => { const xx = (align === 'c' ? -w0 / 2 : 0) + i * step; c.add(icon(sc, xx, -8, k, s)); c.add(T(sc, xx + s * 0.34, s * 0.34, `${n}`, Math.round(s * 0.42), '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 6)); }); return c; }
// 상태 카드: 'ready'(받을 수 있음: 연두 · 빛) 'done'(받음: 초록 도장) 'lock'(아직: 흐림) 'now'(진행 중: 노랑)
export function card(sc, x, y, w, h, state) { const g = sc.add.graphics(), cols = { ready: [0xFFFBEA, 0x7FD35A], done: [0xE6F4DC, 0xA6D48A], lock: [0xF3ECE2, 0xDDD0C0], now: [0xFFF4D0, 0xF2B632] }[state] || [0xFFFFFF, 0xE0D0C0];
  g.fillStyle(0x000000, 0.08).fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 26).fillStyle(cols[0], 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 26).lineStyle(state === 'ready' || state === 'now' ? 6 : 3, cols[1], 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  if (state === 'ready') sc.tweens.add({ targets: g, alpha: 0.82, duration: 600, yoyo: true, repeat: -1 }); return g; }
export function doneStamp(sc, x, y, s = 1) { const c = sc.add.container(x, y).setAngle(-12), g = sc.add.graphics(); g.fillStyle(0x5AAE3C, 0.92).fillCircle(0, 0, 40 * s).lineStyle(5, 0xFFFFFF, 1).strokeCircle(0, 0, 40 * s); c.add([g, T(sc, 0, -2, '✓', 44 * s, '#FFFFFF', { w: 900 })]); return c; }
export function lockIc(sc, x, y) { return T(sc, x, y, '🔒', 34, '#000', { w: 900 }).setAlpha(0.7); }
// 진행 막대 (라벨 포함)
export function progressBar(sc, x, y, w, k, label, col = 0x7FD35A) { const g = sc.add.graphics(); g.fillStyle(0x3E2A14, 0.85).fillRoundedRect(x, y - 20, w, 40, 20).fillStyle(col, 1).fillRoundedRect(x + 4, y - 16, Math.max(32, (w - 8) * Math.min(1, k)), 32, 16).fillStyle(0xFFFFFF, 0.3).fillRoundedRect(x + 10, y - 13, Math.max(20, (w - 20) * Math.min(1, k)), 9, 5); if (label) T(sc, x + w / 2, y, label, 22, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 5); return g; }
