// 첫 화면: 로고 · 판다 · 최고 기록 · 시작
import { W, H, TITLE, TITLE_EN } from '../config.js';
import { PALETTE } from './Boot.js';
import { txt, fmt, button } from '../ui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, 'bg_main'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    // 로고: 글자마다 블록 색 (통통 튀는 등장)
    const chars = [...TITLE], size = 190, gap = size * 0.92, y = H * 0.17;
    const x0 = W / 2 - (chars.length - 1) * gap / 2;
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      const col = PALETTE[[0, 2, 4, 3, 6, 1][i % 6]];
      const t = txt(this, x0 + i * gap, y, ch, size, col[0], { stroke: '#2B1E5A', thick: 30 });
      t.setShadow(0, 12, '#1A1040', 0, true, true).setAngle((i % 2 ? 4 : -4)).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 420, delay: 120 + i * 90, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: y - 14, duration: 900 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 600 + i * 90 });
    });
    txt(this, W / 2, y + 150, TITLE_EN.toUpperCase(), 48, '#FFFFFF', { stroke: '#2B1E5A', thick: 10 });
    // 판다
    const pd = this.add.image(W / 2, H * 0.62, 'panda_cheer'); const k = Math.min(760 / pd.height, 1.2); pd.setScale(k);
    this.tweens.add({ targets: pd, y: pd.y - 26, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 최고 기록
    const by = H * 0.62 + 420;
    this.add.rectangle(W / 2, by, 560, 96, 0x221A5C, 0.85).setStrokeStyle(5, 0x9C8BFF);
    this.add.image(W / 2 - 220, by, 'star_on').setDisplaySize(64, 64);
    txt(this, W / 2 + 20, by, d.best ? `최고 ${fmt(d.best)}점` : '첫 기록에 도전!', 46, '#FFE14D', { stroke: '#2B1E5A', thick: 8 });
    const go = button(this, W / 2, Math.min(H - 170, by + 190), '시작!', () => this.start(), { key: 'btn_gold', w: 620, h: 180, size: 80 });
    this.tweens.add({ targets: go, scale: 1.04, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(300, 20, 14, 50);
    window.__lobby = this;
  }
  start() {
    audio.stopMusic(); audio.play('sfx_click', { volume: 0.6 });
    this.cameras.main.fadeOut(260, 20, 14, 50);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
  }
}
