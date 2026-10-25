// 컷씬: 그림 위로 카메라가 천천히 움직이고(줌 · 이동), 인물이 미끄러져 들어오고, 대사가 한 글자씩
//   누르면 다음 대사 · 위 '건너뛰기' · 끝나면 done() 호출. 모든 장면 위에 뜸.
import { W, H } from '../config.js?v=0.54.0';
import { T, C, btn } from '../ui.js?v=0.54.0';
import { audio } from '../audio.js?v=0.54.0';
import { pushBack } from '../oad.js?v=0.54.0';

export class CutsceneScene extends Phaser.Scene {
  constructor() { super('Cutscene'); }
  init(data) { this.cut = data.cut; this.done = data.done; this.si = -1; this.li = -1; this.typing = null; this.ending = false; }
  create() {
    this.scene.bringToTop(); this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setInteractive();
    this.bgL = this.add.container(0, 0); this.charL = this.add.container(0, 0); this.fxL = this.add.container(0, 0);
    const bar = Math.round(H * 0.07); this.add.rectangle(W / 2, bar / 2, W, bar, 0x000000); this.add.rectangle(W / 2, H - bar / 2, W, bar, 0x000000);
    // 대사 상자
    const by = H - bar - 330; this.box = this.add.container(0, by); const g = this.add.graphics();
    g.fillGradientStyle(0x0B1028, 0x0B1028, 0x0B1028, 0x0B1028, 0, 0, 0.92, 0.92).fillRect(0, -80, W, 80).fillStyle(0x0B1028, 0.92).fillRect(0, 0, W, 330).fillStyle(0xF2C46B, 0.7).fillRect(60, 0, W - 120, 2);
    this.who = T(this, 70, 50, '', 36, C.gold, { ox: 0, w: 900 }); this.line = T(this, 70, 100, '', 40, C.ink, { ox: 0, oy: 0, w: 800, wrap: W - 140, lh: 18, align: 'left' });
    this.more = T(this, W - 80, 290, '▼', 28, C.gold, { w: 900 }); this.tweens.add({ targets: this.more, y: 300, duration: 500, yoyo: true, repeat: -1 });
    this.box.add([g, this.who, this.line, this.more]);
    btn(this, W - 140, bar + 60, 200, 74, '건너뛰기', () => this.end(), { style: 'dark', size: 26 });
    this.input.on('pointerup', p => { if (p.y > bar + 110) this.tap(); });
    this.unback = pushBack(() => { this.end(); return true; });
    if (this.cut.music) audio.music(this.cut.music);
    this.cameras.main.fadeIn(500, 0, 0, 0); this.nextShot();
  }
  nextShot() {
    this.si++; const sh = this.cut.shots[this.si]; if (!sh) return this.end(); this.li = -1; this.shot = sh;
    // 그림: 화면을 덮게 · cam 으로 줌과 세로 이동
    const old = this.bgL.list.slice(); const im = this.add.image(W / 2, H / 2, sh.bg); const base = Math.max(W / im.width, H / im.height);
    const [z0, z1, y0, y1] = sh.cam || [1, 1.08, 0.5, 0.5], yy = (z, f) => H / 2 + (0.5 - f) * Math.max(0, im.height * base * z - H);
    im.setScale(base * z0).setY(yy(z0, y0)).setAlpha(0); this.bgL.add(im);
    this.tweens.add({ targets: im, alpha: 1, duration: 500, onComplete: () => old.forEach(o => o.destroy()) });
    this.tweens.add({ targets: im, scale: base * z1, y: yy(z1, y1), duration: 9000, ease: 'Sine.easeInOut' });
    // 인물: 옆에서 미끄러져 들어옴
    this.charL.list.slice().forEach(c => this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() }));
    if (sh.who && this.textures.exists(`hero_${sh.who}`)) { const l = sh.side === 'l', c = this.add.image(l ? 300 : W - 300, H - Math.round(H * 0.07) - 250, `hero_${sh.who}`).setOrigin(0.5, 1); c.setScale(Math.min(1.3, (H * 0.62) / c.height)).setAlpha(0); if (!l) c.setFlipX(false);
      c.x += l ? -200 : 200; this.charL.add(c); this.tweens.add({ targets: c, x: l ? 300 : W - 300, alpha: 1, duration: 420, ease: 'Cubic.easeOut' }); }
    this.fx(sh.fx); this.nextLine();
  }
  fx(k) {
    this.fxL.removeAll(true); const cam = this.cameras.main;
    if (k === 'flash') cam.flash(400, 255, 240, 200);
    if (k === 'shake') cam.shake(500, 0.01);
    if (k === 'dark') { const d = this.add.rectangle(W / 2, H / 2, W, H, 0x050816, 0.0); this.fxL.add(d); this.tweens.add({ targets: d, fillAlpha: 0.35, duration: 3000 }); }
    if (k === 'red') { const d = this.add.rectangle(W / 2, H / 2, W, H, 0x6A0A2A, 0).setBlendMode('MULTIPLY'); this.fxL.add(d); this.tweens.add({ targets: d, fillAlpha: 0.5, duration: 600, yoyo: true, repeat: -1 }); cam.shake(400, 0.006); audio.play('sfx_boss', { volume: 0.4 }); }
    if (k === 'embers' || k === 'dawn') { const col = k === 'dawn' ? [0xFFE27A, 0xFFFFFF, 0xFFC062] : [0xFFB45E, 0xFFE27A, 0xFF8A3A];
      if (k === 'dawn') { const glow = this.add.image(W / 2, H * 0.3, 'glow').setTint(0xFFE9A8).setBlendMode('ADD').setScale(2).setAlpha(0); this.fxL.add(glow); this.tweens.add({ targets: glow, scale: 14, alpha: 0.8, duration: 1800, ease: 'Cubic.easeOut' }); cam.flash(700, 255, 236, 180); audio.play('sfx_win', { volume: 0.5 }); }
      this.time.addEvent({ delay: 120, repeat: 40, callback: () => { const s = this.add.image(Math.random() * W, H * (0.5 + Math.random() * 0.4), 'spark').setTint(col[Math.floor(Math.random() * 3)]).setScale(0.15 + Math.random() * 0.25).setBlendMode('ADD'); this.fxL.add(s);
        this.tweens.add({ targets: s, y: s.y - 300 - Math.random() * 300, x: s.x + (Math.random() - 0.5) * 120, alpha: 0, angle: 180, duration: 2200 + Math.random() * 1200, onComplete: () => s.destroy() }); } }); }
  }
  nextLine() {
    this.li++; const L = this.shot.lines[this.li]; if (!L) return this.nextShot();
    this.who.setText(L.who || ''); this.line.setText(''); this.more.setVisible(false); this.typing?.remove(); let n = 0;
    this.typing = this.time.addEvent({ delay: 32, repeat: L.t.length - 1, callback: () => { n++; this.line.setText(L.t.slice(0, n)); if (n >= L.t.length) { this.typing = null; this.more.setVisible(true); } } });
  }
  tap() { if (this.ending) return; if (this.typing) { this.typing.remove(); this.typing = null; this.line.setText(this.shot.lines[this.li].t); this.more.setVisible(true); return; } audio.play('sfx_tap', { volume: 0.4 }); this.nextLine(); }
  end() { if (this.ending) return; this.ending = true; this.unback && this.unback(); this.cameras.main.fadeOut(400, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => { const d = this.done; this.scene.stop(); d && d(); }); }
}
