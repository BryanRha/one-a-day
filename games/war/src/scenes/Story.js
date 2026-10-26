// 이야기 장면: 작전 전·후 지휘관 대화 (얼굴 그림 · 이름표 · 글자 하나씩 · 누르면 다음 · 건너뛰기)
import { W, H } from '../config.js?v=0.61.0';
import { T, C, panel, btn } from '../pui.js?v=0.61.0';
import { audio } from '../audio.js?v=0.61.0';
import { pushBack } from '../oad.js?v=0.61.0';
import { COS } from '../core/data.js?v=0.61.0';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }
  // data: { lines: [[who, text]], foe, title, next: [sceneKey, data] }
  create(data) {
    Object.assign(this, { lines: data.lines || [], foe: data.foe || 'scarlet', next: data.next, i: -1, typing: null, shown: '', done: false, faces: {} });
    this.add.rectangle(W / 2, H / 2, W, H, 0x14160A);
    const bg = this.add.image(W / 2, H * 0.4, 'key_art'); bg.setScale(Math.max(W / bg.width, H * 0.9 / bg.height)).setAlpha(0.12).setTint(0x7A8060);
    this.add.image(W * 0.18, H * 0.55, 'glow').setTint(0x3A7AE0).setAlpha(0.35).setScale(9).setBlendMode('ADD');
    this.add.image(W * 0.82, H * 0.55, 'glow').setTint(0xE04A3A).setAlpha(0.3).setScale(9).setBlendMode('ADD');
    const g = this.add.graphics(); for (let k = 0; k < 30; k++) g.fillStyle(0x14160A, k / 30 * 0.8).fillRect(0, H - 760 + k * 12, W, 12);
    if (data.title) { T(this, W / 2, 120, data.title, 40, C.gold, { w: 900, ls: 4 }); this.add.rectangle(W / 2, 160, 420, 3, 0xFFD45A, 0.6); }
    // 얼굴: 아군 왼쪽 · 적 오른쪽 (말하는 쪽만 밝게)
    this.faceY = H - 300;   // 얼굴 아래쪽은 대사 상자 뒤로
    // 대사 상자
    const by = H - 300;
    this.box = this.add.existing(panel(this, W / 2, by + 30, W - 60, 320, { r: 34 }));
    this.nameBg = this.add.graphics();
    this.nameT = T(this, 90, by - 158, '', 34, '#14160A', { ox: 0, w: 900, shadow: false });
    this.textT = T(this, 80, by - 90, '', 38, C.text, { ox: 0, oy: 0, w: 900, wrap: W - 160, shadow: false, align: 'left', lh: 14 });
    this.arrow = T(this, W - 100, by + 140, '▼', 30, C.gold, { w: 900 }); this.tweens.add({ targets: this.arrow, y: by + 150, duration: 420, yoyo: true, repeat: -1 });
    btn(this, W - 160, 90, 240, 84, '건너뛰기 ▶▶', () => this.finish(), { style: 'ghost', size: 26 });
    this.unback = pushBack(() => { this.finish(); return true; });
    this.events.once('shutdown', () => this.unback && this.unback());
    this.input.on('pointerup', p => { if (p.y < 160) return; this.tap(); });
    this.cameras.main.fadeIn(260, 20, 22, 10);
    audio.music('bgm_story', this);
    this.nextLine();
    window.__story = this;
  }
  who(k) { return k === 'foe' ? this.foe : k; }
  face(co, side) {
    if (this.faces[co]) return this.faces[co];
    const x = side === 'L' ? 250 : W - 250, im = this.add.image(x + (side === 'L' ? -80 : 80), this.faceY, `co_${co}`).setOrigin(0.5, 1).setAlpha(0);
    im.setScale(860 / im.height); im.side = side; if (side === 'R') im.setFlipX(true);
    this.children.moveBelow(im, this.box);   // 대사 상자 뒤
    this.tweens.add({ targets: im, x, alpha: 1, duration: 260, ease: 'Cubic.easeOut' });
    this.faces[co] = im; return im;
  }
  nextLine() {
    this.i++;
    if (this.i >= this.lines.length) return this.finish();
    const [k, text] = this.lines[this.i], co = this.who(k), hq = k === 'hq';
    const side = hq ? null : k === 'foe' ? 'R' : 'L';   // 적 지휘관 대사는 오른쪽
    // 같은 쪽에 다른 사람이 있으면 내보냄
    for (const [c, im] of Object.entries(this.faces)) if (c !== co && side && im.side === side) { this.tweens.add({ targets: im, alpha: 0, duration: 200, onComplete: () => im.destroy() }); delete this.faces[c]; }
    if (!hq) this.face(co, side);
    for (const [c, im] of Object.entries(this.faces)) { const on = c === co; this.tweens.add({ targets: im, alpha: on ? 1 : 0.45, scale: (860 / im.height) * (on ? 1 : 0.94), duration: 180 }); im.setTint(on ? 0xFFFFFF : 0x777777); }
    // 이름표
    const name = hq ? '사령부 무전' : COS[co].name, col = hq ? 0x9AB0C0 : side === 'L' ? 0x8EC2FF : 0xFF8A70, by = H - 300;
    this.nameT.setText(name); const nw = this.nameT.width + 60;
    this.nameBg.clear().fillStyle(col, 1).fillRoundedRect(60, by - 184, nw, 54, 27);
    this.nameT.setColor('#14160A');
    // 글자 하나씩
    this.full = text; this.shown = ''; this.textT.setText(''); this.arrow.setVisible(false);
    if (this.typing) this.typing.remove();
    let n = 0;
    this.typing = this.time.addEvent({ delay: 28, repeat: text.length - 1, callback: () => { n++; this.textT.setText(text.slice(0, n)); if (n % 3 === 1) audio.play('sfx_talk', { volume: 0.18, gap: 60 }); if (n >= text.length) { this.typing = null; this.arrow.setVisible(true); } } });
  }
  tap() {
    if (this.done) return;
    if (this.typing) { this.typing.remove(); this.typing = null; this.textT.setText(this.full); this.arrow.setVisible(true); return; }
    audio.play('sfx_page', { volume: 0.35 });
    this.nextLine();
  }
  finish() {
    if (this.done) return; this.done = true;
    if (this.typing) this.typing.remove();
    this.cameras.main.fadeOut(240, 20, 22, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => { const [k, d] = this.next || ['Home']; this.scene.start(k, d); });
  }
}
