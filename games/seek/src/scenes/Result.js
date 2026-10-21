// 결과: 사진이 액자에 담김 · 별 · 점수 · 손님 인사 · 다시/사진관
import { W, H } from '../config.js?v=0.19.0';
import { T, C, btn, panel, stars } from '../ui.js?v=0.19.0';
import { audio } from '../audio.js?v=0.19.0';
import * as M from '../meta.js?v=0.19.0';

const PRAISE = ['완벽해요!', '눈썰미가 대단해요!', '멋지게 찾아냈어요!'];
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    const sc = M.sceneById(r.id);
    const bg = this.add.image(W / 2, H / 2, 'studio'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0x7A6A5A);
    const rays = this.add.image(W / 2, H * 0.3, 'glow').setScale(9).setAlpha(0.25).setTint(0xFFE2A0).setBlendMode('ADD');
    T(this, W / 2, 150, r.stars === 3 ? PRAISE[Math.floor(Math.random() * 3)] : r.stars === 2 ? '잘 찾았어요!' : '다 찾았어요!', 64, C.cream, { w: 900, shadow: true });
    // 액자
    const pw = sc.kind === 'ho' ? 480 : 760, ph = pw * sc.h / sc.w, fr = this.add.container(W / 2, H * 0.4);
    fr.add([this.add.rectangle(12, 16, pw + 70, ph + 70, 0x000000, 0.4), this.add.rectangle(0, 0, pw + 70, ph + 70, 0x6A4428).setStrokeStyle(6, 0xE9B44C), this.add.rectangle(0, 0, pw + 20, ph + 20, 0xFFFDF6)]);
    const im = this.add.image(0, 0, sc.img); im.setScale(Math.min(pw / im.width, ph / im.height)); fr.add(im);
    fr.setScale(0.5).setAlpha(0); this.tweens.add({ targets: fr, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    audio.play('sfx_clear', { volume: 0.7 });
    const st = stars(this, W / 2, H * 0.4 + ph / 2 + 100, 0, 80, 96); st.list.forEach((s, i) => { s.setScale(0); this.time.delayedCall(500 + i * 220, () => { if (i < r.stars) { s.setColor(C.gold); audio.play('sfx_find', { volume: 0.5, rate: 1 + i * 0.12, gap: 0 }); } this.tweens.add({ targets: s, scale: 1, duration: 260, ease: 'Back.easeOut' }); }); });
    const py = H * 0.4 + ph / 2 + 190;
    T(this, W / 2, py, `점수 ${r.score.toLocaleString()}${r.newBest && !r.first ? '  · 최고 기록!' : ''}  ·  ${Math.floor(r.time / 60)}분 ${Math.floor(r.time % 60)}초`, 30, C.cream, { w: 800, shadow: true });
    this.add.existing(panel(this, W / 2, py + 170, 940, 200));
    T(this, 110, py + 110, sc.guest, 30, C.brown, { ox: 0, w: 900 });
    T(this, 110, py + 160, sc.bye, 28, C.ink, { ox: 0, oy: 0, w: 700, wrap: 840 });
    const by = Math.min(H - 130, py + 370);
    btn(this, W / 2 + 160, by, 560, 130, '사진관으로', () => this.go('Home'), { style: 'gold', size: 40 });
    btn(this, W / 2 - 300, by, 220, 130, '다시', () => this.go(sc.kind === 'ho' ? 'Hidden' : 'Diff', { id: sc.id }), { style: 'cream', size: 36 });
    this.cameras.main.fadeIn(300, 20, 12, 6); window.__result = r;
  }
  go(k, d) { this.cameras.main.fadeOut(220, 20, 12, 6); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, d)); }
}
