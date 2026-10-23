// 증거 대조 (Easybrain Differences 식): 위아래 두 사진 · 다른 곳 찾기 · 하트 3 · 시간 제한 없음
// 찾을 때마다 서윤의 한 줄 추리가 뜸 · 하트를 다 잃으면 부드럽게 다시
import { W, H } from '../config.js?v=0.26.2';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.26.2';
import { audio } from '../audio.js?v=0.26.2';
import { goPrev } from '../nav.js?v=0.26.2';
import { load, save } from '../save.js?v=0.26.2';
import { Viewer } from '../viewer.js?v=0.26.2';
import { EPISODES, epNo } from '../episodes.js?v=0.26.2';
import { starOnce } from '../cafe/state.js?v=0.26.2';
import { advance, passed, stepOf, replayResult } from '../replay.js?v=0.26.2';

const HINT_COST = 10;
export class EvidenceScene extends Phaser.Scene {
  constructor() { super('Evidence'); }
  create(data) {
    const ep = this.ep = EPISODES.find(e => e.id === data.id), ev = this.ev = ep.evidence;
    Object.assign(this, { hearts: ev.hearts, found: 0, done: new Set(), ended: false, paused: false, hints: 0, replay: passed(ep.id, 'evidence') && stepOf(ep.id) === 'done', t0: Date.now() });
    advance(ep.id, 'evidence');
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    const top = 150, bottom = 260, gap = 70, avail = H - top - bottom - gap * 2, vh = Math.min(avail / 2, W * 0.75);
    const y1 = top + gap, y2 = y1 + vh + gap;
    this.vA = new Viewer(this, ev.a, 0, y1, W, vh, { fit: true, onTap: (ip, p, later) => this.tap(ip, p, later) });
    this.vB = new Viewer(this, ev.b, 0, y2, W, vh, { fit: true, onTap: (ip, p, later) => this.tap(ip, p, later) }); this.vA.link(this.vB);
    T(this, 40, y1 - 34, ev.la, 26, '#FFB6CB', { ox: 0, w: 900 }); T(this, 40, y2 - 34, ev.lb, 26, '#FFB6CB', { ox: 0, w: 900 });
    const bar = this.add.graphics(); bar.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, top); bar.fillStyle(0xFF9DB6, 0.6).fillRect(0, top - 3, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 56, `${epNo(ep)}화 · 증거 대조${this.replay ? ' · 다시 하기' : ''}`, 34, '#FFFFFF', { w: 900 }); T(this, W / 2, 104, `다른 곳 ${ev.spots.length}개를 찾아 거짓말을 밝혀요`, 22, C.sub, { w: 800 });
    this.heartT = [0, 1, 2].map(i => T(this, W - 150 + i * 50, 76, '♥', 44, '#FF6A8E', { w: 900 }));
    const by = H - bottom / 2 - 20; this.dots = ev.spots.map((_, i) => this.add.circle(W / 2 - (ev.spots.length - 1) * 42 + i * 84, by - 40, 26, 0x000000, 0.3).setStrokeStyle(4, 0xFF9DB6, 0.9));
    this.capT = T(this, W / 2, by + 50, '', 30, '#FFFFFF', { w: 800, wrap: W - 120 });
    // 힌트 (숨은 물건과 같은 돋보기 · 코인): 못 찾은 곳 하나로 확대 + 반짝임
    iconBtn(this, W - 80, by - 40, 'hint', () => this.hint(), 96); this.hintT = T(this, W - 80, by + 24, `● ${HINT_COST}`, 22, C.gold, { w: 900 });
    this.coinT = T(this, 80, by + 24, `● ${load().coins}`, 22, C.gold, { w: 900 });
    this.cameras.main.fadeIn(300, 30, 10, 26); window.__ev = this;
    this.time.delayedCall(400, () => toast(this, '두 사진에서 다른 곳을 눌러요 · 틀리면 하트가 줄어요', y2 - 60));
  }
  tap(ip, p, later) {
    if (this.ended || this.paused) return;
    // 원 안에 든 남은 정답 중 가장 가까운 것 (가까이 붙은 두 정답을 헷갈리지 않게)
    let i = -1, best = Infinity; this.ev.spots.forEach((s, j) => { const d2 = (ip.x - s.x) ** 2 + (ip.y - s.y) ** 2; if (!this.done.has(j) && d2 <= s.r ** 2 && d2 / s.r ** 2 < best) { best = d2 / s.r ** 2; i = j; } });
    if (i >= 0) return this.hit(i);
    if (later) return later(() => this.miss(p));
    this.miss(p);
  }
  miss(p) {
    if (this.ended || this.paused) return;
    this.hearts--; this.heartT[this.hearts]?.setColor('#5A3A52'); audio.play('sfx_miss', { volume: 0.5 }); audio.buzz(40); this.cameras.main.shake(140, 0.005);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.55); this.tweens.add({ targets: x, alpha: 0, scale: 0.15, duration: 400, onComplete: () => x.destroy() });
    if (this.hearts <= 0) this.lose();
  }
  hit(i) {
    const s = this.ev.spots[i]; this.done.add(i); this.found++; audio.play('sfx_find', { volume: 0.7 });
    for (const v of [this.vA, this.vB]) { const r = this.add.image(s.x, s.y, 'ring').setTint(0xFF7FA6); r.setScale(s.r * 2.6 / 160); v.layer.add(r); this.tweens.add({ targets: r, scale: s.r * 2.1 / 160, duration: 280, ease: 'Back.easeOut' }); }
    this.dots[i].setFillStyle(0xFF6A8E, 1); this.tweens.add({ targets: this.dots[i], scale: 1.3, duration: 150, yoyo: true });
    this.capT.setText(`"${s.cap}"`).setAlpha(0); this.tweens.add({ targets: this.capT, alpha: 1, duration: 250 });
    if (this.found >= this.ev.spots.length) { this.ended = true; this.time.delayedCall(1300, () => this.win()); }
  }
  hint() {
    if (this.ended || this.paused) return; const d = load();
    if (d.coins < HINT_COST) return toast(this, '코인이 부족해요 · 단서를 찾으면 모여요', this.vB.y - 60);
    const i = this.ev.spots.findIndex((_, j) => !this.done.has(j)); if (i < 0) return; const s = this.ev.spots[i];
    d.coins -= HINT_COST; save(); this.hints++; this.coinT.setText(`● ${d.coins}`); audio.play('sfx_hint', { volume: 0.7 });
    this.vA.focus(s.x, s.y, 2);
    for (const v of [this.vA, this.vB]) { const g = this.add.image(s.x, s.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.r * 3 / 128); v.layer.add(g); this.tweens.add({ targets: g, alpha: 0.15, duration: 420, yoyo: true, repeat: 4, onComplete: () => g.destroy() }); }
  }
  lose() {
    this.ended = true; const p = popup(this, 820, 560, { closable: false, onBack: () => goPrev(this) });
    p.content.add(T(this, 0, -180, '조금 더 꼼꼼히 볼까요?', 44, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -110, `${this.found} / ${this.ev.spots.length}곳을 찾았어요`, 30, C.brown, { w: 700 }));
    p.content.add(btn(this, 0, 50, 520, 130, '다시 대조하기', () => this.scene.restart({ id: this.ep.id }), { size: 38 }));
    p.content.add(btn(this, 0, 190, 400, 100, '서재로', () => this.scene.start('Library'), { style: 'cream', size: 30 }));
  }
  win() {
    if (this.replay) return replayResult(this, { id: this.ep.id, kind: 'evidence', n: this.ev.spots.length, sec: (Date.now() - this.t0) / 1000, slip: this.ev.hearts - this.hearts + this.hints, next: 'after' });
    const d = load(); d.coins += 10; advance(this.ep.id, 'after'); const got = starOnce(this.ep.id, 'e', this.hearts >= 3 && !this.hints ? 2 : 1);
    audio.play('sfx_clear', { volume: 0.7 }); this.cameras.main.flash(300, 255, 230, 240);
    const t = T(this, W / 2, H / 2, '거짓말을 밝혀냈어요!', 60, '#FFFFFF', { w: 900, shadow: true }).setDepth(60);
    if (got) T(this, W / 2, H / 2 + 80, '★'.repeat(got) + '  냥카페 별 +' + got, 38, C.gold, { w: 900, shadow: true }).setDepth(60);
    this.time.delayedCall(1500, () => { this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Story', { id: this.ep.id, part: 'after' })); });
  }
  leave() { this.paused = true; const p = popup(this, 760, 420, { onClose: () => { this.paused = false; } }); p.content.add(T(this, 0, -100, '서재로 돌아갈까요?', 40, C.ink, { w: 900 })); p.content.add(btn(this, -170, 80, 300, 110, '계속하기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 80, 300, 110, '나가기', () => goPrev(this))); }
  onBack() { if (this.ended) return true; return goPrev(this); }
}
