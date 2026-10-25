// 전체 화면 장면(사람들 · 이벤트 · 협동 · 광산 · 섬) 공통 틀: 위 재화 막대(마을과 같음) + 제목 막대(◀ 뒤로) + 위아래로 밀어 보기
import { W, H } from './config.js?v=0.49.2';
import { T, btn, TOPBAR } from './ui.js?v=0.49.2';
import { load, matCount, popNow, popCap } from './state.js?v=0.49.2';
import { XP_NEED } from './data.js?v=0.49.2';

const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };
export const HEAD = 112, SHIFT = TOPBAR + HEAD - 140 + 44;   // 탭 줄이 제목 막대에 붙지 않게 여백 44   // 예전 화면은 y≈150부터 그렸음 → 그만큼 아래로 내림

// 위 재화 막대 (마을 Hud 와 같은 모양 · 같은 자리)
export function topBar(sc) { const d = load(), c = sc.add.container(0, 0).setScrollFactor(0).setDepth(950), g = sc.add.graphics(); g.fillStyle(0x3E2A14, 0.95).fillRoundedRect(16, 18, W - 32, 112, 30); c.add(g);
  c.add(sc.add.circle(80, 74, 44, 0x4E9BE8).setStrokeStyle(5, 0xFFFFFF)); c.add(T(sc, 80, 72, String(d.lv), 34, '#FFFFFF', { w: 900 }));
  const xb = sc.add.graphics(); xb.fillStyle(0x1E1206, 1).fillRoundedRect(130, 100, 150, 16, 8).fillStyle(0x6FD0FF, 1).fillRoundedRect(130, 100, Math.max(16, 150 * d.xp / XP_NEED(d.lv)), 16, 8); c.add(xb);
  const texts = {}; for (const [x, k, v] of [[310, 'coin', d.coins], [510, 'gem', d.gems], [680, 'tools', matCount()], [850, 'pop', `${popNow()}/${popCap()}`]]) { c.add(icon(sc, x, 74, k, 50)); texts[k] = T(sc, x + 34, 74, String(v), 30, '#FFFFFF', { ox: 0, w: 900 }); c.add(texts[k]); }
  for (const o of c.list) o.setScrollFactor && o.setScrollFactor(0); return texts; }
// 제목 막대 + 아래로 밀기
export function frame(sc, title, onBack) {
  sc._framed = true; topBar(sc); const h = sc.add.container(0, 0).setScrollFactor(0).setDepth(950), g = sc.add.graphics(); g.fillStyle(0x5A3A1E, 1).fillRect(0, TOPBAR, W, HEAD).fillStyle(0x8A5A2B, 1).fillRect(0, TOPBAR + HEAD - 8, W, 8); h.add(g);
  h.add(T(sc, W / 2, TOPBAR + 54, title, 40, '#FFFFFF', { w: 900 })); h.add(btn(sc, 100, TOPBAR + 54, 150, 76, '◀', onBack, { size: 34, style: 'cream' })); for (const o of h.list) o.setScrollFactor && o.setScrollFactor(0);
  const cam = sc.cameras.main; cam.scrollY = -SHIFT;
  // 배경(화면 꽉 찬 사각형 · 배경 그림)은 내린 만큼 위아래로 넉넉하게 · 고정
  for (const o of sc.children.list) { if (o.type === 'Rectangle' && o.width === W && o.height === H) { o.setScrollFactor(0).setPosition(W / 2, H / 2); } if (o.type === 'Image' && /_bg$/.test(o.texture.key)) { o.setScrollFactor(0).setPosition(W / 2, H / 2); o.setScale(Math.max(W / o.width, H / o.height)); } }
  // 내용이 화면보다 길면 손가락으로 밀어 봄 (위 두 막대는 그대로)
  let st = null; const maxY = () => { let m = 0; for (const o of sc.children.list) { if (o.scrollFactorY === 0 || !o.visible || !o.getBounds) continue; try { const b = o.getBounds(); if (b.bottom > m && b.bottom < 1e5) m = b.bottom; } catch { /* */ } } return Math.max(-SHIFT, m + 40 - H); };
  sc.input.on('pointerdown', p => { sc._scrolled = false; st = p.y > TOPBAR + HEAD ? { y: p.y, s: cam.scrollY, m: maxY() } : null; });
  sc.input.on('pointermove', p => { if (!st || !p.isDown || sc.noScroll) return; const dy = p.y - st.y; if (Math.abs(dy) > 14) sc._scrolled = true; if (sc._scrolled) cam.scrollY = Phaser.Math.Clamp(st.s - dy, -SHIFT, st.m); });
  sc.input.on('pointerup', () => { st = null; sc.time.delayedCall(0, () => { sc._scrolled = false; }); });
  sc.input.on('wheel', (p, o, dx, dy) => { if (!sc.noScroll) cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, -SHIFT, maxY()); });
}
