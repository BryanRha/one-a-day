// 이야기: 배경 · 인물 상반신 · 이름표 말풍선 · 한 글자씩 · 건너뛰기 (원작처럼 건너뛸 수 있음)
import { W, H } from '../config.js?v=0.27.1';
import { T, C, btn } from '../ui.js?v=0.27.1';
import { audio } from '../audio.js?v=0.27.1';
import { STORY } from '../data.js?v=0.27.1';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }
  create(data) {
    this.st = STORY[data.id]; this.ret = data.ret || 'Home'; this.i = -1; this.typing = null; this.going = false;
    const bg = this.add.image(W / 2, H / 2, this.st.bg); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x3A2018, 0.12);
    this.face = this.add.image(W / 2, H - 440, 'c_soyun_smile').setOrigin(0.5, 1).setAlpha(0);
    const by = H - 470, g = this.add.graphics(); g.fillStyle(0xFFFBF6, 0.97).fillRoundedRect(40, by, W - 80, 380, 40).lineStyle(5, 0xF1A9B8, 1).strokeRoundedRect(40, by, W - 80, 380, 40);
    this.tag = this.add.graphics(); this.who = T(this, 100, by, '', 34, '#FFFFFF', { ox: 0, w: 900 });
    this.line = T(this, 90, by + 70, '', 38, C.ink, { ox: 0, oy: 0, w: 700, wrap: W - 180, lh: 16, align: 'left' });
    this.more = T(this, W - 100, by + 335, '▼', 26, C.rose, { w: 900 }); this.tweens.add({ targets: this.more, y: this.more.y + 8, duration: 500, yoyo: true, repeat: -1 });
    btn(this, W - 130, 80, 200, 80, '건너뛰기', () => this.end(), { style: 'cream', size: 26 });
    this.input.on('pointerup', p => { if (p.y > 150) this.tap(); });
    this.cameras.main.fadeIn(300, 255, 244, 236); window.__story = this; this.next();
  }
  tap() { if (this.typing) { this.typing.remove(); this.typing = null; this.line.setText(this.cur.t); this.more.setVisible(true); return; } this.next(); }
  next() {
    this.i++; const L = this.cur = this.st.lines[this.i]; if (!L) return this.end();
    if (L.face && this.face.texture.key !== L.face) { this.face.setTexture(L.face).setScale(760 / this.textures.get(L.face).getSourceImage().height).setAlpha(0).setY(H - 420); this.tweens.add({ targets: this.face, alpha: 1, y: H - 440, duration: 260 }); }
    else if (!L.face) this.face.setAlpha(0);
    else if (this.face.alpha < 1) this.tweens.add({ targets: this.face, alpha: 1, duration: 200 });
    const by = H - 470; this.tag.clear(); if (L.who) this.tag.fillStyle(0xE86A8E, 1).fillRoundedRect(70, by - 36, 60 + L.who.length * 36, 72, 36); this.who.setText(L.who || '').setY(by);
    this.more.setVisible(false); let n = 0; this.line.setText(''); this.typing?.remove();
    this.typing = this.time.addEvent({ delay: 28, repeat: L.t.length - 1, callback: () => { n++; this.line.setText(L.t.slice(0, n)); if (n >= L.t.length) { this.typing = null; this.more.setVisible(true); } } });
    audio.play('sfx_page', { volume: 0.25 });
  }
  end() { if (this.going) return; this.going = true; this.cameras.main.fadeOut(250, 255, 244, 236); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.ret)); }
  onBack() { this.end(); return true; }
}
