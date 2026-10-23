// 하루 목표 3개 → 시즌 점수 → 월간 시즌 보상 (무료 줄 · 프리미엄 줄은 결제가 열리면)
import { W, H } from '../config.js?v=0.35.0';
import { T, C, btn, iconBtn, toast, popup } from '../ui.js?v=0.35.0';
import { audio } from '../audio.js?v=0.35.0';
import { load, save } from '../save.js?v=0.35.0';
import { goPrev } from '../nav.js?v=0.35.0';
import { hud } from '../hud.js?v=0.35.0';
import { daily, season, claimGoal, giveReward, rewardText, SEASON } from '../state.js?v=0.35.0';
import { storeOpen } from '../store.js?v=0.35.0';
import { ACHIEVE, REWARD, tierOf, achClaim, achReady, title } from '../achieve.js?v=0.35.0';

export class SeasonScene extends Phaser.Scene {
  constructor() { super('Season'); }
  create() {
    audio.music('bgm_shop');
    const d = load(), dl = daily(), se = season();
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    let y = 170; T(this, 60, y, '오늘의 목표', 38, C.ink, { ox: 0, w: 900 });
    const ab = btn(this, W - 170, y, 240, 76, `🏅 업적${achReady() ? ` ${achReady()}` : ''}`, () => this.achView(), { size: 26, style: achReady() ? 'rose' : 'cream' }); y += 50;
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
  achView() {
    const p = popup(this, 1000, 1640);
    p.content.add(T(this, 0, -760, '업적', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, -705, `칭호 「${title()}」 · 단계마다 보석`, 26, C.rose, { w: 900 }));
    ACHIEVE.forEach((a, i) => { const t = tierOf(a), y = -600 + i * 165, g = this.add.graphics(), done = t.claimed >= a.steps.length, ready = t.reach > t.claimed;
      g.fillStyle(ready ? 0xFFE3EC : 0xFFF4EC, 1).fillRoundedRect(-460, y - 70, 920, 140, 28); p.content.add(g);
      p.content.add(T(this, -420, y - 32, `${a.n}  · ${t.claimed}/${a.steps.length}단계`, 28, C.ink, { ox: 0, w: 900 }));
      const goal = done ? a.steps[a.steps.length - 1] : a.steps[t.claimed], k = Math.min(1, t.v / goal); g.fillStyle(0xF1DCD3, 1).fillRoundedRect(-420, y + 14, 520, 22, 11).fillStyle(0x7CC6A8, 1).fillRoundedRect(-420, y + 14, Math.max(22, 520 * k), 22, 11);
      p.content.add(T(this, 120, y + 25, `${Math.min(t.v, goal)}/${goal} ${a.unit}`, 20, C.dim, { ox: 0, w: 800 }));
      if (done) p.content.add(T(this, 360, y, '완료 ✓', 26, C.green, { w: 900 }));
      else p.content.add(btn(this, 360, y, 170, 80, `◆${REWARD[t.claimed]}`, () => { const gg = achClaim(a.id); if (!gg) return toast(this, '아직 목표에 못 미쳐요'); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart(); this.time.delayedCall(250, () => window.__season && window.__season.achView()); }, { size: 26, style: ready ? 'rose' : 'cream' })); });
    p.content.add(btn(this, 0, 740, 300, 90, '닫기', () => p.close(), { style: 'cream', size: 28 }));
  }
  onBack() { return goPrev(this); }
}
