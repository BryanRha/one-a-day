// 위 막대: 레벨(경험치) · 에너지(다음 회복까지) · 코인 · 보석 — 모든 화면 공용
import { W } from './config.js?v=0.63.1';
import { T, R, C, TS, iconBtn } from './ui.js?v=0.63.1';
import { goPrev } from './nav.js?v=0.63.1';
import { load } from './save.js?v=0.63.1';
import { tickEnergy, nextEnergyIn, xpNeed } from './state.js?v=0.63.1';
import { ENERGY } from './data.js?v=0.63.1';

export function hud(sc, o = {}) {
  const c = sc.add.container(0, 0).setDepth(50), g = sc.add.graphics();
  g.fillStyle(0xFFF4EC, 0.94).fillRect(0, 0, W, 130).fillStyle(0xE8A0A8, 0.6).fillRect(0, 127, W, 3); c.add(g);
  const x0 = o.left ?? 130;
  // 레벨 배지 + 경험치 막대
  const lvBg = sc.add.circle(x0, 66, 42, 0xE86A8E).setStrokeStyle(5, 0xFFFFFF), lvT = T(sc, x0, 64, '', 34, '#FFFFFF', { w: 900 });
  const xpBg = sc.add.graphics(); xpBg.fillStyle(0xF1DCD3, 1).fillRoundedRect(x0 + 30, 52, 150, 28, 14); const xpFill = sc.add.graphics();
  c.add([xpBg, xpFill, lvBg, lvT]);
  const pill = (x, icon, col) => { const pg = sc.add.graphics(); pg.fillStyle(0xFFFFFF, 1).fillRoundedRect(x, 34, 190, 64, 32).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(x, 34, 190, 64, 32); const ic = sc.add.image(x + 30, 66, icon); ic.setScale(54 / Math.max(ic.width, ic.height)); const t = T(sc, x + 116, icon === 'energy' ? 58 : 64, '', 30, col, { w: 900 }); c.add([pg, ic, t]); return t; };
  const eT = pill(x0 + 200, 'energy', '#C77A10'), cT = pill(x0 + 400, 'coin', '#B9821A'), gT = pill(x0 + 600, 'gem', '#C2408A');
  const eSub = T(sc, x0 + 295, 114, '', 22, C.dim, { w: 800 }); c.add(eSub);
  // 에너지 게이지: 알약 안쪽 아래에 채워지는 막대 (상한 넘으면 금색 가득)
  const eBar = sc.add.graphics(); c.addAt(eBar, c.list.indexOf(eT));
  const upd = () => {
    const d = load(); tickEnergy();
    lvT.setText(String(d.lv)); xpFill.clear().fillStyle(0x7CC6A8, 1).fillRoundedRect(x0 + 30, 52, Math.max(28, 150 * Math.min(1, d.xp / xpNeed(d.lv))), 28, 14);
    eT.setText(String(d.energy)); { const bx = x0 + 262, bw = 112, k = Math.min(1, d.energy / ENERGY.max); eBar.clear().fillStyle(0xF6E7D2, 1).fillRoundedRect(bx, 80, bw, 10, 5).fillStyle(d.energy >= ENERGY.max ? 0xF0B65A : 0xF5C542, 1).fillRoundedRect(bx, 80, Math.max(10, bw * k), 10, 5); } cT.setText(String(d.coins)); gT.setText(String(d.gems));
    const ms = nextEnergyIn(); eSub.setText(d.energy < ENERGY.max && ms ? `+1까지 ${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}` : '');
  };
  upd(); const ev = sc.time.addEvent({ delay: 1000, loop: true, callback: upd });
  c.update = upd; c.energyAt = { x: x0 + 230, y: 66 }; c.coinAt = { x: x0 + 430, y: 66 }; c.gemAt = { x: x0 + 630, y: 66 };
  return c;
}

// 전체 화면 공통 틀: 바탕 · 위 막대 · 뒤로 · 화면 제목(왼쪽) + 오른쪽 정보 → 내용이 시작할 y
export function screen(sc, title, o = {}) {
  sc.add.rectangle(W / 2, 1500, W, 4000, 0xFBEFE8);
  sc.hud = hud(sc); iconBtn(sc, 60, 66, 'back', () => goPrev(sc), 76).setDepth(51);
  if (!title) return 160;
  T(sc, 50, 190, title, TS.h1, C.ink, { ox: 0, w: 900 });
  if (o.right) R(sc, W - 50, 190, o.right, TS.h2, o.rightColor || C.rose, { ox: 1, w: 900 });
  if (o.sub) T(sc, 50, 246, o.sub, TS.min + 2, C.dim, { ox: 0, w: 800 });
  return o.sub ? 290 : 250;
}
