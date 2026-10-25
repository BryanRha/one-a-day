// 이야기 (Choices 식): 배경 · 인물 상반신(표정) · 이름표 말풍선 · 한 글자씩 · 선택지 → 다음 단계(hunt/evidence/toon)
import { W, H } from '../config.js?v=0.56.0';
import { T, C, btn, iconBtn } from '../ui.js?v=0.56.0';
import { audio } from '../audio.js?v=0.56.0';
import { goPrev } from '../nav.js?v=0.56.0';
import { load, save } from '../save.js?v=0.56.0';
import { EPISODES, epNo, hero } from '../episodes.js?v=0.56.0';
import { advance } from '../replay.js?v=0.56.0';

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }
  create(data) {
    this.ep = EPISODES.find(e => e.id === data.id);
    if (data.part === 'hunt') return this.scene.start('Hunt', { id: this.ep.id });
    this.part = data.part; this.lines = this.ep[this.part]; this.i = -1; this.typing = null; this.busy = false; this.going = false;
    advance(this.ep.id, this.part);
    this.bg = this.add.image(W / 2, H / 2, 'bg_flower'); this.fitBg();
    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.12);
    this.face = this.add.image(W / 2, H - 470, 'c_seoyun_smile').setOrigin(0.5, 1).setAlpha(0);
    // 말풍선
    const by = H - 470; this.box = this.add.container(0, 0);
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.97).fillRoundedRect(40, by, W - 80, 360, 36).lineStyle(4, 0xFF9DB6, 1).strokeRoundedRect(40, by, W - 80, 360, 36);
    this.tag = this.add.graphics(); this.who = T(this, 100, by, '', 34, '#FFFFFF', { ox: 0, w: 900 });
    this.line = T(this, 90, by + 60, '', 38, C.ink, { ox: 0, oy: 0, w: 700, wrap: W - 180, lh: 16, align: 'left' });
    this.more = T(this, W - 100, by + 315, '▼', 26, '#E8628A', { w: 900 }); this.tweens.add({ targets: this.more, y: this.more.y + 8, duration: 500, yoyo: true, repeat: -1 });
    this.box.add([g, this.tag, this.who, this.line, this.more]);
    this.choiceL = this.add.container(0, 0);
    iconBtn(this, 72, 76, 'back', () => goPrev(this), 88, { dark: true });
    T(this, W / 2, 76, `${epNo(this.ep)}화 · ${this.ep.title}`, 28, '#FFFFFF', { w: 800, shadow: true });
    this.input.on('pointerup', p => { if (p.y > 140) this.tap(); });
    this.cameras.main.fadeIn(300, 30, 10, 26); window.__story = this;
    this.next();
  }
  fitBg() { this.bg.setScale(Math.max(W / this.bg.width, H / this.bg.height)); }
  tap() { if (this.busy) return; if (this.typing) { this.typing.remove(); this.typing = null; this.line.setText(this.cur.t); this.more.setVisible(true); return; } this.next(); }
  next() {
    if (this.going) return; this.i++; const L = this.cur = this.lines[this.i]; if (!L) return;
    if (L.go) return this.go(L.go);
    if (L.bg && this.bg.texture.key !== L.bg) { const nb = this.add.image(W / 2, H / 2, L.bg).setAlpha(0).setDepth(-1); nb.setScale(Math.max(W / nb.width, H / nb.height)); this.tweens.add({ targets: nb, alpha: 1, duration: 500, onComplete: () => { this.bg.destroy(); this.bg = nb; nb.setDepth(0); } }); }
    if (L.sfx === 'buzz') { audio.play('sfx_hint', { volume: 0.6 }); audio.buzz([60, 40, 60]); this.cameras.main.shake(200, 0.004); }
    if (L.choice) return this.choice(L.choice);
    if (L.objection) return this.objection(L.objection);
    // 인물
    if (L.face && this.face.texture.key !== L.face) { this.face.setTexture(L.face); this.face.setScale(720 / this.face.height); this.face.setAlpha(0).setY(H - 450); this.tweens.add({ targets: this.face, alpha: 1, y: H - 470, duration: 260 }); }
    else if (L.face && this.face.alpha < 1) { this.face.setScale(720 / this.face.height); this.tweens.add({ targets: this.face, alpha: 1, duration: 260 }); }
    const by = H - 470, nameW = 50 + L.who.length * 38; this.tag.clear().fillStyle(0xE8628A, 1).fillRoundedRect(70, by - 36, nameW, 72, 36); this.who.setText(L.who).setY(by);
    this.type(L.t);
  }
  type(full) {
    this.more.setVisible(false); let n = 0; this.line.setText(''); this.typing?.remove();
    this.typing = this.time.addEvent({ delay: 30, repeat: full.length - 1, callback: () => { n++; this.line.setText(full.slice(0, n)); if (n >= full.length) { this.typing = null; this.more.setVisible(true); } } });
  }
  // 선택지 2개 (Choices 식): 고른 쪽 대답 한 줄 → 계속
  choice(list) {
    this.busy = true; this.box.setAlpha(0.35); const d = load();
    list.forEach((c, k) => {
      const b = btn(this, W / 2, H * 0.42 + k * 170, 860, 140, c.t, () => {
        d.choices[this.ep.id] = c.tag; save(); this.choiceL.removeAll(true); this.box.setAlpha(1); this.busy = false;
        this.cur = { t: c.r }; this.tag.clear().fillStyle(0xE8628A, 1).fillRoundedRect(70, H - 506, 50 + 2 * 38, 72, 36); this.who.setText(hero(this.ep).n); this.type(c.r);
      }, { style: k ? 'cream' : 'rose', size: 36 });
      b.setAlpha(0).y += 30; this.tweens.add({ targets: b, alpha: 1, y: b.y - 30, duration: 260, delay: k * 120 }); this.choiceL.add(b);
    });
  }
  // 이의 있음 (법정): 증거 셋 중 하나 · 틀리면 부드럽게 다시 · 맞히면 화면이 번쩍
  objection(o) {
    this.busy = true; this.box.setAlpha(0.35); this.choiceL.removeAll(true);
    const q = T(this, W / 2, H * 0.3, o.q, 36, '#FFFFFF', { w: 900, wrap: W - 140, shadow: true }); this.choiceL.add(q);
    o.opts.forEach((op, k) => {
      const b = btn(this, W / 2, H * 0.42 + k * 160, 880, 130, op.t, () => {
        const nm = hero(this.ep).n; this.tag.clear().fillStyle(0xE8628A, 1).fillRoundedRect(70, H - 506, 50 + nm.length * 38, 72, 36); this.who.setText(nm); this.box.setAlpha(1);
        if (!op.ok) { audio.play('sfx_miss', { volume: 0.5 }); this.cameras.main.shake(180, 0.006); this.cur = { t: op.r }; this.type(op.r); b.setAlpha(0.35).disableInteractive(); this.box.setAlpha(0.6); return; }
        this.choiceL.removeAll(true); this.busy = false; audio.play('sfx_clear', { volume: 0.8 }); this.cameras.main.flash(300, 255, 255, 255); this.cameras.main.shake(300, 0.01);
        const big = T(this, W / 2, H * 0.32, '이의 있음!', 110, '#FFE27A', { w: 900, shadow: true }).setDepth(80).setScale(0.3); this.tweens.add({ targets: big, scale: 1, duration: 300, ease: 'Back.easeOut', hold: 900, yoyo: false, onComplete: () => this.tweens.add({ targets: big, alpha: 0, delay: 700, duration: 400, onComplete: () => big.destroy() }) });
        this.cur = { t: op.r }; this.type(op.r);
      }, { style: 'cream', size: 30 });
      b.setAlpha(0).y += 30; this.tweens.add({ targets: b, alpha: 1, y: b.y - 30, duration: 260, delay: k * 120 }); this.choiceL.add(b);
    });
  }
  go(k) {
    this.going = true; const d = load(), map = { hunt: 'Hunt', evidence: 'Evidence', toon: 'Toon' };
    advance(this.ep.id, k);
    this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(map[k], { id: this.ep.id }));
  }
  onBack() { return goPrev(this); }
}
