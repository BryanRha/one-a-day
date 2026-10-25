// 결과: 거리 · 점수(최고 기록) · 코인 · 칼치기 기록 → 다시 달리기 / 차고
import { W, H } from '../config.js?v=0.47.3';
import { txt, fmt, fit, button, iconButton } from '../ui.js?v=0.47.3';
import { audio } from '../audio.js?v=0.47.3';
import { load } from '../save.js?v=0.47.3';
import { wind } from '../fx.js?v=0.47.3';
import { applyRun } from '../meta.js?v=0.47.3';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(r) { this.r = r; }
  create() {
    const r = this.r, out = applyRun(r), d = load();
    this.cameras.main.fadeIn(300, 20, 26, 50);
    const g = this.add.graphics();
    g.fillGradientStyle(0x2B4C9B, 0x2B4C9B, 0x7CC8FF, 0x7CC8FF, 1).fillRect(0, 0, W, H);
    audio.play(out.newBest ? 'sfx_checkpoint' : 'sfx_end', { volume: 0.7 });
    this.time.delayedCall(2200, () => audio.music('bgm_lobby', this));

    const top = Math.max(120, H / 2 - 820);
    txt(this, W / 2, top, out.newBest ? '🏆 최고 기록!' : '레이스 결과', 88, '#FFE14D', { stroke: '#1E2A52', thick: 16 });
    const dr = fit(this.add.image(W / 2, top + 290, `driver_${d.driver}`), 420);
    wind(dr, 1, 0.01);
    this.tweens.add({ targets: dr, y: dr.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 점수 카드
    const cy = top + 760;
    const card = this.add.graphics();
    card.fillStyle(0xFFFFFF, 0.96).fillRoundedRect(60, cy - 250, W - 120, 640, 36).lineStyle(6, 0x1E2A52).strokeRoundedRect(60, cy - 250, W - 120, 640, 36);
    txt(this, W / 2, cy - 190, '점수', 40, '#5A6488', { stroke: '#FFFFFF', thick: 4 });
    const sc = txt(this, W / 2, cy - 110, '0', 110, '#FF8A1F', { stroke: '#1E2A52', thick: 14 });
    this.tweens.addCounter({ from: 0, to: r.score, duration: 900, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    const rows = [['달린 거리', `${fmt(r.dist)}m`], ['체크포인트', `${r.cp}개`], ['칼치기 · PERFECT', `${fmt(r.honks)} · ${r.perfects || 0}`], ['최고 콤보 · 피버', `×${r.combo} · ${r.fevers || 0}번`], ['점프샷 · 밀어내기', `${r.jumpshots} · ${r.rams}`]];
    rows.forEach(([k, v], i) => {
      const y = cy + 10 + i * 66;
      txt(this, 120, y, k, 38, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 4 });
      txt(this, W - 120, y, v, 40, '#3B5BDB', { ox: 1, stroke: '#FFFFFF', thick: 4 });
    });
    this.add.image(W / 2 - 90, cy + 340, 'item_coin').setDisplaySize(64, 64);
    txt(this, W / 2 - 40, cy + 340, `+${fmt(r.coins)}`, 52, '#FFFFFF', { ox: 0, stroke: '#1E2A52', thick: 10 });

    const by = Math.min(H - 150, cy + 520);
    button(this, W / 2 + 150, by, '다시 달리기', () => this.go('Play'), { key: 'btn_gold', w: 540, h: 160, icon: 'ico_retry' });
    iconButton(this, W / 2 - 300, by, 'ico_home', () => this.go('Lobby'), 160);
    window.__result = r;
  }
  go(scene) { this.cameras.main.fadeOut(250, 20, 26, 50); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene)); }
}
