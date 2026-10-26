// 하루 목표 3개 → 시즌 점수 → 월간 시즌 보상 (무료 줄 · 프리미엄 줄은 결제가 열리면)
import { W, H } from '../config.js?v=0.62.0';
import { T, R, C, TS, btn, toast, sheet, rbox, chips, stamp } from '../ui.js?v=0.62.0';
import { audio } from '../audio.js?v=0.62.0';
import { load, save } from '../save.js?v=0.62.0';
import { goPrev } from '../nav.js?v=0.62.0';
import { screen } from '../hud.js?v=0.62.0';
import { daily, season, claimGoal, giveReward, SEASON } from '../state.js?v=0.62.0';
import { storeOpen } from '../store.js?v=0.62.0';
import { ACHIEVE, REWARD, tierOf, achClaim, achReady, title } from '../achieve.js?v=0.62.0';

export class SeasonScene extends Phaser.Scene {
  constructor() { super('Season'); }
  create() {
    audio.music('bgm_shop');
    const d = load(), dl = daily(), se = season();
    let y = screen(this, '오늘의 목표');
    btn(this, W - 170, 190, 250, 84, `🏅 업적${achReady() ? ` ${achReady()}` : ''}`, () => this.achView(), { size: 30, style: achReady() ? 'rose' : 'cream' });
    dl.goals.forEach((g, i) => {
      const ok = g.have >= g.need, done = dl.done.includes(i);
      rbox(this, 40, y, W - 80, 124, { fill: '#FFFFFF', line: ok && !done ? '#E86A8E' : '#F1D2C8', lw: ok && !done ? 5 : 3, ox: 0, oy: 0 });
      T(this, 80, y + 40, g.n, TS.body, C.ink, { ox: 0, w: 900 });
      const gg = this.add.graphics(); gg.fillStyle(0xF1DCD3, 1).fillRoundedRect(80, y + 78, 440, 22, 11).fillStyle(0x7CC6A8, 1).fillRoundedRect(80, y + 78, Math.max(22, 440 * Math.min(1, g.have / g.need)), 22, 11);
      T(this, 540, y + 89, `${Math.min(g.have, g.need)}/${g.need}`, TS.min + 2, C.dim, { ox: 0, w: 800 });
      if (done) { stamp(this, W - 160, y + 62, 1.1); }
      else btn(this, W - 160, y + 62, 220, 86, `★${g.pts}`, () => { if (!ok) return toast(this, '아직 목표를 채우지 못했어요'); claimGoal(i); audio.play('sfx_coin', { volume: 0.6 }); this.scene.restart(); }, { style: ok ? 'rose' : 'cream', size: 32 });
      y += 140;
    });
    // 시즌 길: 왼쪽 무료 · 가운데 점수 · 오른쪽 프리미엄 (보상은 그림으로)
    y += 30; const mo = new Date().getMonth() + 1; T(this, 50, y, `${mo}월 시즌 · 벚꽃 레시피`, TS.h2, C.ink, { ox: 0, w: 900 }); R(this, W - 50, y, `★${se.pts}`, TS.h2, C.gold, { ox: 1, w: 900 }); y += 62;
    T(this, 300, y, '무료', TS.cap, C.brown, { w: 900 }); T(this, 780, y, d.ent.pass ? '프리미엄' : '프리미엄 · 곧 열려요', TS.cap, '#C2408A', { w: 900 }); y += 36;
    const rowH = Math.max(110, Math.min(170, (H - y - 30) / SEASON.goal.length)), line = this.add.graphics(); line.fillStyle(0xE6D3CC, 1).fillRect(536, y + rowH / 2, 8, rowH * (SEASON.goal.length - 1));
    SEASON.goal.forEach((need, k) => {
      const yy = y + k * rowH, reach = se.pts >= need, g = this.add.graphics();
      if (reach && k > 0) line.fillStyle(0xE86A8E, 1).fillRect(536, yy - rowH / 2, 8, rowH);
      g.fillStyle(reach ? 0xE86A8E : 0xE6D3CC, 1).fillCircle(540, yy + rowH / 2, 36).lineStyle(4, 0xFFFFFF, 1).strokeCircle(540, yy + rowH / 2, 36); T(this, 540, yy + rowH / 2, `${need}`, TS.min, '#FFFFFF', { w: 900 });
      const cell = (x, r, list, prem) => {
        const got = list.includes(k), can = reach && !got && (!prem || d.ent.pass), lock = prem && !d.ent.pass;
        rbox(this, x, yy + rowH / 2, 400, rowH - 16, { fill: lock ? '#F6EAF0' : can ? '#FFE3EC' : '#FFFFFF', line: can ? '#E86A8E' : '#F1D2C8', lw: can ? 5 : 3, r: 24 });
        const ch = chips(this, x, yy + rowH / 2 - 14, r, { size: Math.min(64, rowH * 0.46), bg: false, gap: 130, font: 24, done: got }); if (lock) ch.setAlpha(0.5);
        if (lock) T(this, x + 170, yy + 30, '🔒', 26, '#000', { w: 900 });
        const z = this.add.zone(x, yy + rowH / 2, 400, rowH - 16).setInteractive({ useHandCursor: true }); z.on('pointerup', () => {
          if (lock) return toast(this, storeOpen() ? '상점에서 프리미엄 패스를 열 수 있어요' : '프리미엄 패스는 곧 열려요');
          if (!can) return toast(this, got ? '이미 받았어요' : `시즌 점수 ★${need}에 받아요`);
          list.push(k); giveReward(r); save(); audio.play('sfx_order', { volume: 0.6 }); this.scene.restart(); });
      };
      cell(280, SEASON.free[k], se.claimed, false); cell(800, SEASON.prem[k], se.pclaimed, true);
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__season = this;
  }
  achView() {
    const p = sheet(this, { size: 'L', title: '업적', sub: `칭호 「${title()}」 · 단계마다 보석` });
    ACHIEVE.forEach((a, i) => { const t = tierOf(a), y = i * 150, done = t.claimed >= a.steps.length, ready = t.reach > t.claimed;
      p.content.add(rbox(this, 0, y, 900, 136, { fill: ready ? '#FFE3EC' : '#FFF4EC', line: ready ? '#E86A8E' : null, lw: 4, r: 28 }));
      p.content.add(T(this, -410, y - 32, a.n, TS.body - 2, C.ink, { ox: 0, w: 900 })); p.content.add(T(this, 120, y - 32, `${t.claimed}/${a.steps.length}단계`, TS.min, C.dim, { ox: 1, w: 800 }));
      const goal = done ? a.steps[a.steps.length - 1] : a.steps[t.claimed], k = Math.min(1, t.v / goal), g = this.add.graphics(); g.fillStyle(0xF1DCD3, 1).fillRoundedRect(-410, y + 12, 530, 22, 11).fillStyle(0x7CC6A8, 1).fillRoundedRect(-410, y + 12, Math.max(22, 530 * k), 22, 11); p.content.add(g);
      p.content.add(T(this, -410, y + 52, `${Math.min(t.v, goal)}/${goal} ${a.unit}`, TS.min, C.dim, { ox: 0, w: 800 }));
      if (done) p.content.add(stamp(this, 330, y, 1.1));
      else p.content.add(btn(this, 330, y, 190, 86, `◆${REWARD[t.claimed]}`, () => { const gg = achClaim(a.id); if (!gg) return toast(this, '아직 목표에 못 미쳐요'); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart(); this.time.delayedCall(250, () => window.__season && window.__season.achView()); }, { size: 30, style: ready ? 'rose' : 'cream' })); });
    p.foot([{ t: '닫기', style: 'cream' }]);
  }
  onBack() { return goPrev(this); }
}
