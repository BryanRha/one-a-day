// 하루 목표 3개 → 시즌 점수 → 월간 시즌 보상 (무료 줄 · 프리미엄 줄은 결제가 열리면)
import { W, H } from '../config.js?v=0.33.0';
import { T, C, btn, iconBtn, toast } from '../ui.js?v=0.33.0';
import { audio } from '../audio.js?v=0.33.0';
import { load, save } from '../save.js?v=0.33.0';
import { goPrev } from '../nav.js?v=0.33.0';
import { hud } from '../hud.js?v=0.33.0';
import { daily, season, claimGoal, giveReward, rewardText, SEASON } from '../state.js?v=0.33.0';
import { storeOpen } from '../store.js?v=0.33.0';

export class SeasonScene extends Phaser.Scene {
  constructor() { super('Season'); }
  create() {
    audio.music('bgm_shop');
    const d = load(), dl = daily(), se = season();
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    let y = 170; T(this, 60, y, '오늘의 목표', 38, C.ink, { ox: 0, w: 900 }); y += 50;
    dl.goals.forEach((g, i) => {
      const ok = g.have >= g.need, done = dl.done.includes(i), gg = this.add.graphics(); gg.fillStyle(0xFFFFFF, 1).fillRoundedRect(40, y, W - 80, 110, 26).lineStyle(3, ok && !done ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(40, y, W - 80, 110, 26);
      T(this, 80, y + 38, g.n, 30, C.ink, { ox: 0, w: 900 });
      gg.fillStyle(0xF1DCD3, 1).fillRoundedRect(80, y + 70, 460, 20, 10).fillStyle(0x7CC6A8, 1).fillRoundedRect(80, y + 70, Math.max(20, 460 * g.have / g.need), 20, 10);
      T(this, 560, y + 80, `${g.have}/${g.need}`, 22, C.dim, { ox: 0, w: 800 });
      if (done) T(this, W - 160, y + 55, '받음 ✓', 28, C.green, { w: 900 });
      else btn(this, W - 160, y + 55, 220, 80, `★${g.pts}`, () => { if (!ok) return toast(this, '아직 목표를 채우지 못했어요'); claimGoal(i); audio.play('sfx_coin', { volume: 0.6 }); this.scene.restart(); }, { style: ok ? 'rose' : 'cream', size: 28 });
      y += 130;
    });
    // 시즌 길
    y += 20; const mo = new Date().getMonth() + 1; T(this, 60, y, `${mo}월 시즌 · 벚꽃 레시피`, 38, C.ink, { ox: 0, w: 900 }); T(this, W - 60, y, `★ ${se.pts}`, 34, C.gold, { ox: 1, w: 900 }); y += 60;
    T(this, 300, y, '무료', 26, C.brown, { w: 900 }); T(this, 780, y, d.ent.pass ? '프리미엄' : '프리미엄 · 곧 열려요', 26, '#C2408A', { w: 900 }); y += 40;
    const rowH = Math.min(120, (H - y - 40) / SEASON.goal.length);
    SEASON.goal.forEach((need, k) => {
      const yy = y + k * rowH, reach = se.pts >= need, g = this.add.graphics();
      g.fillStyle(reach ? 0xE86A8E : 0xE6D3CC, 1).fillCircle(540, yy + rowH / 2, 30); T(this, 540, yy + rowH / 2, `${need}`, 20, '#FFFFFF', { w: 900 });
      const cell = (x, r, list, prem) => {
        const got = list.includes(k), can = reach && !got && (!prem || d.ent.pass);
        g.fillStyle(prem && !d.ent.pass ? 0xF3E3EC : 0xFFFFFF, 1).fillRoundedRect(x - 200, yy + 8, 400, rowH - 16, 22).lineStyle(3, can ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(x - 200, yy + 8, 400, rowH - 16, 22);
        const t = T(this, x, yy + rowH / 2, got ? '받음 ✓' : rewardText(r), 26, got ? C.green : prem && !d.ent.pass ? '#C9A2B8' : C.ink, { w: 900 });
        const z = this.add.zone(x, yy + rowH / 2, 400, rowH - 16).setInteractive({ useHandCursor: true }); z.on('pointerup', () => {
          if (prem && !d.ent.pass) return toast(this, storeOpen() ? '상점에서 프리미엄 패스를 열 수 있어요' : '프리미엄 패스는 곧 열려요');
          if (!can) return toast(this, got ? '이미 받았어요' : `시즌 점수 ★${need}에 받아요`);
          list.push(k); giveReward(r); save(); audio.play('sfx_order', { volume: 0.6 }); this.scene.restart(); });
      };
      cell(300, SEASON.free[k], se.claimed, false); cell(780, SEASON.prem[k], se.pclaimed, true);
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__season = this;
  }
  onBack() { return goPrev(this); }
}
