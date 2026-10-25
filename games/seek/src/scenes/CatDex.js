// 고양이 도감 24마리: 만난 고양이는 사진 · 못 만난 고양이는 실루엣 + 좋아하는 것 힌트
import { goPrev } from '../nav.js?v=0.45.4';
import { W, H } from '../config.js?v=0.45.4';
import { T, C, btn, iconBtn, popup } from '../ui.js?v=0.45.4';
import { CATS, POSES, likeText } from '../cafe/data.js?v=0.45.4';
import { cafeData } from '../cafe/state.js?v=0.45.4';
import { loadCafe } from '../cafe/room.js?v=0.45.4';

export class CatDexScene extends Phaser.Scene {
  constructor() { super('CatDex'); }
  create() { this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A); loadCafe(this, () => this.build()); window.__dex = this; }
  build() {
    const met = cafeData().cafe.met, n = Object.keys(met).length;
    const bar = this.add.graphics(); bar.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, 150).fillStyle(0xFF9DB6, 0.6).fillRect(0, 147, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 56, '고양이 도감', 36, '#FFFFFF', { w: 900 }); T(this, W / 2, 104, `만난 손님 ${n} / ${CATS.length} · 사진 ${Object.values(met).reduce((a, m) => a + m.photos.length, 0)} / ${CATS.length * 3}`, 24, C.sub, { w: 800 });
    const cols = 4, cw = 236, chh = Math.min(300, (H - 200) / 6), x0 = (W - cols * cw) / 2 + cw / 2;
    CATS.forEach((c, i) => {
      const x = x0 + (i % cols) * cw, y = 190 + chh / 2 + Math.floor(i / cols) * chh, m = met[c.id], cell = this.add.container(x, y), g = this.add.graphics();
      g.fillStyle(m ? 0x4A2A44 : 0x3A2236, 1).fillRoundedRect(-cw / 2 + 8, -chh / 2 + 8, cw - 16, chh - 16, 22);
      if (c.special) g.lineStyle(3, 0xF0B65A, 0.8).strokeRoundedRect(-cw / 2 + 8, -chh / 2 + 8, cw - 16, chh - 16, 22); else if (c.rare) g.lineStyle(3, 0xFF9DB6, 0.6).strokeRoundedRect(-cw / 2 + 8, -chh / 2 + 8, cw - 16, chh - 16, 22);
      const im = this.add.image(0, -18, `n${c.id}_sit`); im.setScale(Math.min((cw - 60) / im.width, (chh - 80) / im.height)); if (!m) im.setTint(0x140A12).setAlpha(0.7);
      cell.add([g, im, T(this, 0, chh / 2 - 34, m ? c.n : c.special ? '특별 손님' : c.rare ? '희귀 손님' : '?', 24, m ? '#FFFFFF' : C.dim, { w: 900 })]);
      cell.setSize(cw - 16, chh - 16).setInteractive({ useHandCursor: true }).on('pointerup', () => this.detail(c));
    });
    this.cameras.main.fadeIn(250, 30, 10, 26);
  }
  detail(c) {
    const m = cafeData().cafe.met[c.id], p = popup(this, 920, 900);
    p.content.add(T(this, 0, -370, m ? c.n : '아직 만나지 못했어요', 46, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -315, m ? c.kind : c.special ? '특별 손님' : c.rare ? '희귀 손님' : '손님', 26, '#C25A80', { w: 800 }));
    POSES.forEach((pose, i) => {
      const x = (i - 1) * 280, has = m && m.photos.includes(pose), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRect(x - 120, -260, 240, 280).fillStyle(0xFCEFF3, 1).fillRect(x - 108, -248, 216, 216); p.content.add(g);
      const im = this.add.image(x, -140, `n${c.id}_${pose}`); im.setScale(Math.min(196 / im.width, 196 / im.height)); if (!has) im.setTint(0x2A1A24).setAlpha(0.35); p.content.add(im);
      p.content.add(T(this, x, -10, has ? ['앉아 있는 모습', '낮잠', '놀이 시간'][i] : '?', 20, C.dim, { w: 800 }));
    });
    p.content.add(T(this, 0, 100, m ? c.t : '어떤 손님일까요?', 28, C.brown, { w: 700, wrap: 800 }));
    p.content.add(T(this, 0, 190, `💡 ${likeText(c)}`, 26, '#C25A80', { w: 800, wrap: 820 }));
    if (m) p.content.add(T(this, 0, 250, `방문 ${m.n}번 · 사진 ${m.photos.length} / 3 (다시 찾아오면 새 사진)`, 22, C.dim, { w: 700 }));
    p.content.add(btn(this, 0, 350, 360, 100, '닫기', () => p.close(), { style: 'cream', size: 30 }));
  }
  leave() { goPrev(this); }
  onBack() { return goPrev(this); }
}
