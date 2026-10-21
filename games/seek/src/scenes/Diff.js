// 틀린그림 찾기 (Guru 방식): 위 원본 · 아래 복원본 · 다른 곳 5개 · 제한 시간 · 빗나가면 -5초 · 힌트 충전 · 시간 다 되면 30초 한 번 더
import { W, H } from '../config.js?v=0.19.0';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.19.0';
import { audio } from '../audio.js?v=0.19.0';
import { Viewer } from '../viewer.js?v=0.19.0';
import * as M from '../meta.js?v=0.19.0';

export const RULE = { time: 120, miss: 5, hintEvery: 40, extra: 30, star3: 0.5, star2: 0.2, spamN: 3, spamT: 2, lockT: 3 };

export class DiffScene extends Phaser.Scene {
  constructor() { super('Diff'); }
  create(data) {
    const sc = this.scn = M.sceneById(data.id), set = this.set = sc.sets[data.set ?? M.diffSet(sc)];
    Object.assign(this, { left: RULE.time, found: 0, misses: [], lock: 0, hints: 1, hintT: RULE.hintEvery, ended: false, extraUsed: false, paused: false, t: 0 });
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C);
    iconBtn(this, 70, 72, '‹', () => this.leave(), 84, { dark: true });
    T(this, W / 2, 50, sc.title, 34, C.cream, { w: 900 }); T(this, W / 2, 96, `${sc.year} · ${sc.guest}의 사진`, 22, C.sub, { w: 700 });
    this.timeG = this.add.graphics(); this.timeT = T(this, W - 50, 60, '', 40, C.cream, { ox: 1, w: 900 });
    // 두 사진: 화면 높이에 맞게 (가로 꽉 · 4:3)
    const top = 150, bottom = 190, gap = 14, avail = H - top - bottom - gap, vh = Math.min(avail / 2, W * 0.75);
    const y1 = top + (avail - vh * 2) / 2, y2 = y1 + vh + gap;
    this.vA = new Viewer(this, sc.img, 0, y1, W, vh, { onTap: (ip, p) => this.tap(ip, p, this.vA) });
    this.vB = new Viewer(this, set.img, 0, y2, W, vh, { onTap: (ip, p) => this.tap(ip, p, this.vB) });
    this.vA.link(this.vB);
    T(this, 24, y1 + 26, '원본', 22, C.cream, { ox: 0, w: 800, shadow: true }); T(this, 24, y2 + 26, '복원본', 22, C.cream, { ox: 0, w: 800, shadow: true });
    // 아래: 찾은 개수 동그라미 · 힌트
    const by = H - bottom / 2; this.dots = set.spots.map((_, i) => this.add.circle(W / 2 - (set.spots.length - 1) * 38 + i * 76, by, 24, 0x000000, 0.35).setStrokeStyle(4, 0xE9B44C, 0.8));
    this.hintB = iconBtn(this, W - 100, by, '?', () => this.hint(), 104); this.hintN = T(this, W - 60, by - 44, '1', 26, C.gold, { w: 900 });
    this.cameras.main.fadeIn(300, 20, 12, 6); window.__diff = this;
  }
  update(time, delta) {
    if (this.ended || this.paused) return; const dt = Math.min(0.05, delta / 1000); this.t += dt;
    this.left = Math.max(0, this.left - dt);
    if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0 && this.blur) this.blur.destroy(); }
    this.hintT -= dt; if (this.hintT <= 0) { this.hintT = RULE.hintEvery; this.hints++; this.tweens.add({ targets: this.hintB, scale: 1.15, duration: 200, yoyo: true }); }
    this.hintN.setText(this.hints); this.hintB.setAlpha(this.hints ? 1 : 0.55);
    const k = this.left / RULE.time, x = W - 300; this.timeG.clear().fillStyle(0x000000, 0.4).fillRoundedRect(x, 104, 250, 16, 8).fillStyle(k > 0.25 ? 0xE9B44C : 0xD9573B, 1).fillRoundedRect(x, 104, Math.max(16, 250 * Math.min(1, k)), 16, 8);
    this.timeT.setText(`${Math.floor(this.left / 60)}:${String(Math.floor(this.left % 60)).padStart(2, '0')}`).setColor(k > 0.25 ? C.cream : '#FF8A6A');
    if (this.left <= 10 && Math.floor(this.left) !== this.lastTick) { this.lastTick = Math.floor(this.left); audio.play('sfx_tick', { volume: 0.4 }); }
    if (this.left <= 0) this.timeUp();
  }
  tap(ip, p, v) {
    if (this.ended || this.paused) return;
    if (this.lock > 0) { audio.play('sfx_miss', { volume: 0.3 }); return; }
    const i = this.set.spots.findIndex((s, j) => !this.dots[j].done && (ip.x - s.x) ** 2 + (ip.y - s.y) ** 2 <= s.r ** 2);
    if (i >= 0) return this.hit(i);
    this.left = Math.max(0, this.left - RULE.miss); audio.play('sfx_miss', { volume: 0.5 }); audio.buzz(30);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.6); this.tweens.add({ targets: x, alpha: 0, scale: 0.2, duration: 400, onComplete: () => x.destroy() });
    const m = T(this, p.x, p.y - 40, `-${RULE.miss}초`, 32, '#FF8A6A', { w: 900, shadow: true }); this.tweens.add({ targets: m, y: p.y - 100, alpha: 0, duration: 700, onComplete: () => m.destroy() });
    this.cameras.main.shake(120, 0.004);
    this.misses = this.misses.filter(t => this.t - t < RULE.spamT); this.misses.push(this.t);
    if (this.misses.length >= RULE.spamN) { this.misses = []; this.lock = RULE.lockT; this.blur = this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C, 0.35).setDepth(50); toast(this, '천천히 비교해 봐요 · 잠시 눈을 쉬어요'); }
  }
  hit(i) {
    const s = this.set.spots[i], d = this.dots[i]; d.done = true; this.found++;
    audio.play('sfx_find', { volume: 0.7 });
    for (const v of [this.vA, this.vB]) { const r = this.add.image(s.x, s.y, 'ring').setTint(0xFFD45A); r.setScale(s.r * 2.6 / 160); v.layer.add(r); this.tweens.add({ targets: r, scale: s.r * 2.1 / 160, duration: 280, ease: 'Back.easeOut' }); }
    d.setFillStyle(0xE9B44C, 1); this.tweens.add({ targets: d, scale: 1.3, duration: 150, yoyo: true });
    if (this.found >= this.set.spots.length) this.time.delayedCall(600, () => this.win());
  }
  hint() {
    if (this.ended || this.paused) return; if (!this.hints) { toast(this, `힌트는 ${Math.ceil(this.hintT)}초 뒤에 생겨요`); return; }
    const i = this.set.spots.findIndex((_, j) => !this.dots[j].done); if (i < 0) return;
    this.hints--; audio.play('sfx_hint', { volume: 0.7 }); const s = this.set.spots[i];
    this.vA.focus(s.x, s.y, 1.6);
    for (const v of [this.vA, this.vB]) { const g = this.add.image(s.x, s.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.r * 3 / 128); v.layer.add(g); this.tweens.add({ targets: g, alpha: 0.2, duration: 450, yoyo: true, repeat: 3, onComplete: () => g.destroy() }); }
  }
  timeUp() {
    if (this.extraUsed) return this.lose();
    this.paused = true; this.extraUsed = true;
    const p = popup(this, 800, 560, { closable: false, onBack: () => {} });
    p.content.add(T(this, 0, -170, '조금만 더 볼까요?', 44, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -100, `${this.set.spots.length - this.found}곳 남았어요`, 30, C.brown, { w: 700 }));
    p.content.add(btn(this, 0, 40, 520, 130, `+${RULE.extra}초 더 찾기`, () => { p.close(); this.left = RULE.extra; this.paused = false; }, { style: 'gold' }));
    p.content.add(btn(this, 0, 180, 400, 100, '그만하기', () => { p.close(); this.lose(); }, { style: 'cream', size: 30 }));
  }
  lose() {
    this.ended = true; this.paused = true;
    const p = popup(this, 820, 620, { closable: false, onBack: () => this.scene.start('Home') });
    p.content.add(T(this, 0, -210, '아쉬워요!', 52, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -130, `${this.found} / ${this.set.spots.length}곳을 찾았어요`, 32, C.brown, { w: 700 }));
    p.content.add(T(this, 0, -70, '다시 하면 남은 곳이 더 잘 보일 거예요', 26, C.dim, { w: 700 }));
    p.content.add(btn(this, 0, 80, 520, 130, '다시 찾기', () => this.scene.restart({ id: this.scn.id, set: this.scn.sets.indexOf(this.set) }), { style: 'gold' }));
    p.content.add(btn(this, 0, 220, 400, 100, '사진관으로', () => this.scene.start('Home'), { style: 'cream', size: 30 }));
  }
  win() {
    this.ended = true; const k = this.left / RULE.time, stars = k >= RULE.star3 ? 3 : k >= RULE.star2 ? 2 : 1, score = Math.round(1000 + this.left * 20);
    const res = M.finish(this.scn.id, { score, stars });
    audio.play('sfx_shutter', { volume: 0.8 }); this.cameras.main.flash(250, 255, 245, 220);
    this.time.delayedCall(600, () => this.scene.start('Result', { id: this.scn.id, kind: 'sd', score, stars, time: this.t, ...res }));
  }
  leave() { const was = this.paused; this.paused = true; const p = popup(this, 760, 460, { onClose: () => { this.paused = was; } }); p.content.add(T(this, 0, -120, '사진관으로 돌아갈까요?', 40, C.ink, { w: 900 })); p.content.add(btn(this, -170, 100, 300, 110, '계속 찾기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 100, 300, 110, '나가기', () => this.scene.start('Home'), { style: 'brown' })); }
  onBack() { if (this.ended) return true; this.leave(); return true; }
}
