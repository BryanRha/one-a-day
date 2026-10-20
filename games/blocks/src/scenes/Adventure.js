// 어드벤처: 이번 주 그림(96칸) · 다음 레벨 목표 미리보기 · 깬 직후엔 새 칸이 열리는 연출
import { W, H } from '../config.js?v=0.10.1';
import { T, C, fmt, panel, btn, iconBtn } from '../pui.js?v=0.10.1';
import { audio } from '../audio.js?v=0.10.1';
import { load } from '../save.js?v=0.10.1';
import * as M from '../meta.js?v=0.10.1';
import { makeLevel, SEASON_LEVELS } from '../core/levels.js?v=0.10.1';
import { pictureView } from '../picture.js?v=0.10.1';

export class AdventureScene extends Phaser.Scene {
  constructor() { super('Adventure'); }
  create(data = {}) {
    const d = load(), a = M.adv();
    const bg = this.add.image(W / 2, H / 2, `bg_t${(a.season + 2) % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, `이번 주 그림`, 40, C.text, { w: 900 });
    T(this, W / 2, 146, `남은 기간 ${a.daysLeft}일 · 96칸을 모두 열면 트로피`, 26, C.sub, { w: 700 });
    const top = 220 + Math.max(0, (H - 1920) / 4);
    const pv = pictureView(this, W / 2, top + 330, 960, a.picture, a.season, data.justWon ? a.cleared - 1 : a.cleared);
    // 진행도
    const py = top + 720;
    T(this, 60, py, `${a.cleared} / ${SEASON_LEVELS}`, 44, C.cyan, { ox: 0, w: 900 });
    if (a.winStreak >= 2) T(this, W - 60, py, `🔥 ${a.winStreak}연승`, 36, '#FF9A5A', { ox: 1, w: 900 });
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.1).fillRoundedRect(60, py + 40, W - 120, 16, 8).fillStyle(0x5EE3FF).fillRoundedRect(60, py + 40, Math.max(16, (W - 120) * a.cleared / SEASON_LEVELS), 16, 8);
    // 새로 열린 칸 연출
    if (data.justWon && a.cleared > 0) {
      const idx = pv.order[a.cleared - 1], cv = pv.cover[idx];
      cv.setVisible(true);
      this.time.delayedCall(450, () => {
        audio.play('sfx_praise_2', { volume: 0.6 });
        const sp = this.add.image(pv.x + cv.x, pv.y + cv.y, 'glow').setBlendMode('ADD').setScale(0.2).setTint(0xFFF2B0);
        this.tweens.add({ targets: sp, scale: 2.2, alpha: 0, duration: 600, onComplete: () => sp.destroy() });
        this.tweens.add({ targets: cv, scale: 0, angle: 90, duration: 380, ease: 'Back.easeIn', onComplete: () => cv.setVisible(false) });
      });
      if (a.cleared >= SEASON_LEVELS) this.time.delayedCall(1200, () => { audio.play('sfx_allclear', { volume: 0.8 }); T(this, W / 2, top + 330, '그림 완성! 🏆', 100, C.gold, { w: 900 }); });
    }
    // 다음 레벨
    if (a.cleared < SEASON_LEVELS) {
      const n = a.cleared + 1, lv = makeLevel(n, undefined, a.season), ny = py + 230;
      this.add.existing(panel(this, W / 2, ny, 960, 250));
      T(this, 110, ny - 70, `레벨 ${n}`, 54, C.text, { ox: 0, w: 900 });
      if (lv.hard) T(this, 330, ny - 70, '어려움', 30, '#FF8FA8', { ox: 0, w: 900 });
      let gx = 110;
      for (const goal of lv.goals) {
        if (goal.type === 'gem') { this.add.image(gx + 30, ny + 40, `gem_${goal.g}`).setDisplaySize(64, 64); T(this, gx + 72, ny + 40, `×${Math.max(2, Math.round(goal.count))}`, 40, C.text, { ox: 0, w: 900 }); gx += 180; }
        else if (goal.type === 'score') { T(this, gx, ny + 40, `점수 ${fmt(goal.target)}`, 40, C.gold, { ox: 0, w: 900 }); gx += 320; }
        else T(this, gx, ny + 40, '그림 블록 모두 지우기', 36, C.pink, { ox: 0, w: 900 });
      }
      btn(this, W - 250, ny + 10, 320, 130, '시작', () => this.go('Play', { mode: 'adv', n }), { style: lv.hard ? 'indigo' : 'green', icon: 'i_play', size: 46 });
    }
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(240, 8, 10, 24);
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(200, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
