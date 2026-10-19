// 결과: 점수(최고 기록) · 지운 줄 · 최고 콤보 → 다시 하기 / 처음으로
import { W, H } from '../config.js';
import { txt, fmt, button, iconButton } from '../ui.js';
import { audio } from '../audio.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    const bg = this.add.image(W / 2, H / 2, 'bg_main'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A1040, 0.35);
    const top = Math.max(160, (H - 1700) / 2);
    const title = txt(this, W / 2, top + 60, r.newBest ? '최고 기록!' : '게임 끝', 100, r.newBest ? '#FFE14D' : '#FFFFFF', { stroke: '#2B1E5A', thick: 16 });
    title.setScale(0); this.tweens.add({ targets: title, scale: 1, duration: 420, ease: 'Back.easeOut' });
    const pd = this.add.image(W / 2, top + 420, r.newBest ? 'panda_wow' : 'panda_idle'); pd.setScale(480 / pd.height);
    this.tweens.add({ targets: pd, y: pd.y - 16, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const cy = top + 900;
    const card = this.add.graphics();
    card.fillStyle(0x221A5C, 0.94).fillRoundedRect(80, cy - 200, W - 160, 470, 40).lineStyle(6, 0x9C8BFF).strokeRoundedRect(80, cy - 200, W - 160, 470, 40);
    txt(this, W / 2, cy - 140, '점수', 40, '#C9BFFF');
    const sc = txt(this, W / 2, cy - 50, '0', 120, '#FFFFFF', { stroke: '#2B1E5A', thick: 16 });
    this.tweens.addCounter({ from: 0, to: r.score, duration: 900, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    [['최고 기록', fmt(r.best)], ['지운 줄', `${fmt(r.lines)}줄`], ['최고 콤보', `×${r.combo}`]].forEach(([k, v], i) => {
      const y = cy + 70 + i * 62;
      txt(this, 140, y, k, 38, '#C9BFFF', { ox: 0 }); txt(this, W - 140, y, v, 40, '#FFE14D', { ox: 1 });
    });
    if (r.newBest) { audio.play('sfx_best', { volume: 0.7 }); this.time.delayedCall(200, () => this.cameras.main.flash(250, 255, 240, 200)); }
    const by = Math.min(H - 150, cy + 420);
    button(this, W / 2 + 120, by, '다시 하기', () => this.go('Play'), { key: 'btn_gold', w: 560, h: 160, icon: 'ico_retry' });
    iconButton(this, W / 2 - 300, by, 'ico_home', () => this.go('Lobby'), 160);
    window.__result = r;
  }
  go(k) { audio.play('sfx_click', { volume: 0.6 }); this.cameras.main.fadeOut(250, 20, 14, 50); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k)); }
}
