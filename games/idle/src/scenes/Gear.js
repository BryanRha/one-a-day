// 장비: 기사단 공용 6부위 · 지금 효과 합계 · 상자 등급
import { W, H } from '../config.js?v=0.55.2';
import { T, R, C, btn, rbox, toast } from '../ui.js?v=0.55.2';
import { load } from '../save.js?v=0.55.2';
import { SLOTS, EQ_GRADES, CHEST_ODDS } from '../data.js?v=0.55.2';
import { itemIcon, itemName, itemDesc, gearBonus, fmt } from '../state.js?v=0.55.2';
import { panelBg } from './Hud.js?v=0.55.2';

export class GearScene extends Phaser.Scene {
  constructor() { super('Gear'); }
  create() {
    const d = load(), y0 = panelBg(this, '기사단 장비', '모든 영웅에게 함께 적용돼요 · 장비 상자에서 얻어요');
    const b = gearBonus(); this.add.existing(rbox(this, W / 2, y0 + 70, W - 80, 120, { fill: '#141B3A', line: '#F2C46B', lw: 3, r: 24 }));
    [['공격력', `+${(b.atk * 100).toFixed(1)}%`], ['체력', `+${(b.hp * 100).toFixed(1)}%`], ['치명타', `+${(b.crit * 100).toFixed(1)}%`]].forEach(([k, v], i) => { const x = 220 + i * 320; T(this, x, y0 + 46, k, 24, C.dim, { w: 800 }); T(this, x, y0 + 92, v, 36, C.gold, { w: 900 }); });
    SLOTS.forEach((sl, i) => {
      const x = 40 + (i % 2) * 510, y = y0 + 160 + Math.floor(i / 2) * 250, it = d.gear[sl.k];
      this.add.existing(rbox(this, x, y, 490, 230, { fill: '#1A2350', line: it ? EQ_GRADES[it.g].css : '#3A4A86', lw: it ? 4 : 2, r: 24, ox: 0, oy: 0 }));
      T(this, x + 24, y + 34, sl.n, 28, C.dim, { ox: 0, w: 900 });
      if (!it) { T(this, x + 245, y + 130, '비어 있음', 28, C.sub, { w: 800 }); return; }
      const ic = this.add.image(x + 110, y + 135, itemIcon(it)); ic.setDisplaySize(150, 150);
      T(this, x + 200, y + 92, itemName(it), 28, EQ_GRADES[it.g].css, { ox: 0, w: 900 }); T(this, x + 200, y + 134, `${EQ_GRADES[it.g].n} · Lv.${it.lv}`, 24, C.dim, { ox: 0, w: 800 });
      const dt = T(this, x + 200, y + 178, itemDesc(it), 24, C.ink, { ox: 0, w: 800 }); if (dt.width > 280) dt.setScale(280 / dt.width);
    });
    const oy = y0 + 160 + 3 * 250 + 10, odds = CHEST_ODDS[d.chestLv - 1];
    T(this, 40, oy + 20, `장비 상자 Lv.${d.chestLv} 등급 확률`, 28, C.ink, { ox: 0, w: 900 });
    EQ_GRADES.forEach((g, i) => { const x = 40 + i * 168; this.add.existing(rbox(this, x, oy + 50, 156, 80, { fill: '#141B3A', line: g.css, lw: 2, r: 14, ox: 0, oy: 0 })); T(this, x + 78, oy + 74, g.n, 22, g.css, { w: 900 }); T(this, x + 78, oy + 108, `${odds[i]}%`, 24, C.ink, { w: 900 }); });
  }
}
