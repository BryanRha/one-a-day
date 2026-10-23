// 웹툰 결말: 컷이 차례로 내려오고 말풍선이 하나씩 · 마지막 컷 반전 → "다음 화에 계속"
import { W, H } from '../config.js?v=0.34.0';
import { T, C, btn } from '../ui.js?v=0.34.0';
import { audio } from '../audio.js?v=0.34.0';
import { goPrev } from '../nav.js?v=0.34.0';
import { load, save } from '../save.js?v=0.34.0';
import { EPISODES, hero, seasonOf } from '../episodes.js?v=0.34.0';
import { starOnce } from '../cafe/state.js?v=0.34.0';

export class ToonScene extends Phaser.Scene {
  constructor() { super('Toon'); }
  create(data) {
    const ep = this.ep = EPISODES.find(e => e.id === data.id);
    this.add.rectangle(W / 2, H / 2, W, H, 0x120810);
    this.strip = this.add.container(0, 0); this.y = 60; this.k = -1; this.step = []; this.lock = false; this.over = false; this.leaving = false;
    // 순서: 컷 → 그 컷의 말풍선들 → 다음 컷
    ep.toon.forEach((p, i) => { this.step.push({ panel: i }); p.b.forEach(b => this.step.push({ panel: i, bubble: b })); });
    this.hint = T(this, W / 2, H - 70, '눌러서 넘기기 · 위아래로 끌어 지난 컷 보기', 24, '#9A7A8A', { w: 800 }).setScrollFactor(0).setDepth(10);
    // 위아래로 끌면 지난 컷을 다시 볼 수 있음 · 끌지 않고 떼면 다음 장면
    this.drag = null;
    this.input.on('pointerdown', p => { if (!this.over) this.drag = { y: p.y, sy: this.strip.y, moved: false }; });
    this.input.on('pointermove', p => { const g = this.drag; if (!g || !p.isDown) return; if (Math.abs(p.y - g.y) > 16) g.moved = true; if (g.moved) { this.tweens.killTweensOf(this.strip); this.lock = false; this.strip.y = Phaser.Math.Clamp(g.sy + p.y - g.y, Math.min(0, H - 160 - this.y), 0); } });
    const up = () => { const g = this.drag; this.drag = null; if (g && !g.moved) this.next(); };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', () => { this.drag = null; });
    this.panels = []; this.next();
    this.cameras.main.fadeIn(400, 18, 8, 16); window.__toon = this;
  }
  next() {
    if (this.lock || this.over) return;
    this.k++; const s = this.step[this.k]; if (!s) return this.finale();
    // 지난 컷을 보고 있었다면 지금 컷 자리로 돌아온 뒤 말풍선
    if (s.bubble) { if (Math.abs(this.strip.y - this.want) > 4) this.tweens.add({ targets: this.strip, y: this.want, duration: 260, ease: 'Cubic.easeOut' }); return this.bubble(this.panels[s.panel], s.bubble); }
    const P = this.ep.toon[s.panel], im = this.add.image(W / 2, this.y, P.img).setOrigin(0.5, 0); im.setScale((W - 60) / im.width);
    const fr = this.add.rectangle(W / 2, this.y, W - 60, im.displayHeight).setOrigin(0.5, 0).setStrokeStyle(4, 0x000000, 1);
    this.strip.add([im, fr]); const pan = { im, y: this.y, h: im.displayHeight }; this.panels[s.panel] = pan;
    if (P.engrave) { const e = T(this, W / 2, this.y + im.displayHeight * 0.53, P.engrave, 40, '#F6D58A', { w: 900 }).setAlpha(0).setAngle(-4); this.strip.add(e); this.time.delayedCall(700, () => { this.tweens.add({ targets: e, alpha: 1, duration: 900 }); this.cameras.main.shake(300, 0.006); audio.play('sfx_hint', { volume: 0.8 }); }); }
    im.setAlpha(0); this.tweens.add({ targets: [im, fr], alpha: 1, duration: 450 });
    this.y += im.displayHeight + 26; audio.play('sfx_page', { volume: 0.4 });
    // 새 컷이 화면 가운데쯤 오도록 위로 올림
    const want = this.want = Math.min(0, -(pan.y + pan.h / 2 - H * 0.45)); this.lock = true; this.tweens.add({ targets: this.strip, y: want, duration: 500, ease: 'Cubic.easeInOut', onComplete: () => { this.lock = false; } });
  }
  bubble(pan, b) {
    const x = W / 2 + (b.x - 0.5) * (W - 60), y = pan.y + pan.h * b.y, isCap = !b.who;
    const t = T(this, 0, 0, b.t, 32, isCap ? '#FFFFFF' : C.ink, { w: 800, wrap: 520, lh: 10 }); const bw = Math.min(600, t.width + 60), bh = t.height + 44;
    const c = this.add.container(Phaser.Math.Clamp(x, 30 + bw / 2, W - 30 - bw / 2), y), g = this.add.graphics();
    if (isCap) g.fillStyle(0x1A0814, 0.88).fillRect(-bw / 2, -bh / 2, bw, bh);
    else { g.fillStyle(0xFFFFFF, 0.97).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2).lineStyle(3, 0x3A2431, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2); }
    c.add([g, t]); if (b.who && b.who !== hero(this.ep).n) c.add(T(this, -bw / 2 + 30, -bh / 2 - 4, b.who, 22, '#E8628A', { ox: 0, w: 900 }));
    this.strip.add(c); c.setScale(0.6).setAlpha(0); this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' }); audio.play('sfx_click', { volume: 0.3 });
  }
  finale() {
    this.over = true; this.hint.setVisible(false);
    const d = load(), first = (d.ep[this.ep.id] || {}).step !== 'done'; d.ep[this.ep.id].step = 'done'; if (first) d.coins += 20; save(); const sg = starOnce(this.ep.id, 't', 1);
    const root = this.add.container(0, 0).setDepth(20), dim = this.add.rectangle(W / 2, H / 2, W, H, 0x120810, 0); root.add(dim); this.tweens.add({ targets: dim, fillAlpha: 0.95, duration: 600, delay: 400 });
    const els = [T(this, W / 2, H * 0.36, this.ep.final ? `시즌 ${seasonOf(this.ep)} 완결` : '다음 화에 계속', 72, '#FFFFFF', { w: 900, shadow: true }), T(this, W / 2, H * 0.46, this.ep.next.title, 40, '#FFB6CB', { w: 900 }), T(this, W / 2, H * 0.52, this.ep.next.t, 30, C.sub, { w: 700, wrap: W - 160 }), T(this, W / 2, H * 0.6, sg ? '● +20 코인 · ★ +1 냥카페 별' : first ? '● +20 코인' : ' ', 30, C.gold, { w: 900 })];
    els.forEach((e, i) => { e.setAlpha(0); root.add(e); this.tweens.add({ targets: e, alpha: 1, duration: 500, delay: 800 + i * 250 }); });
    // 다음 화가 있으면 바로 이어 보기 (서재를 거쳐 그림을 불러온 뒤 자동 시작)
    const nx = EPISODES[EPISODES.indexOf(this.ep) + 1], bs = nx ? [btn(this, W / 2, H * 0.72, 600, 130, '다음 화 보기', () => this.end(nx.id), { size: 40 }), btn(this, W / 2, H * 0.72 + 150, 400, 100, '서재로', () => this.end(), { style: 'cream', size: 30 })] : [btn(this, W / 2, H * 0.74, 560, 130, '서재로', () => this.end(), { size: 40 })];
    bs.forEach(b => { b.setAlpha(0); root.add(b); this.tweens.add({ targets: b, alpha: 1, duration: 400, delay: 1900 }); });
    audio.play('sfx_clear', { volume: 0.6 });
  }
  end(auto) { if (this.leaving) return; this.leaving = true; this.cameras.main.fadeOut(300, 18, 8, 16); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Library', { auto })); }
  onBack() { if (this.over) { this.end(); return true; } return goPrev(this); }
}
