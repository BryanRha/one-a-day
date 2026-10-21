// 숨은물건 찾기 (June's Journey 방식): 목록 10개 · 시간 제한 없음 · 콤보 점수 · 30초마다 무료 힌트 · 연타 방지
import { W, H } from '../config.js?v=0.19.1';
import { T, C, btn, iconBtn, panel, popup, toast } from '../ui.js?v=0.19.1';
import { audio } from '../audio.js?v=0.19.1';
import { Viewer } from '../viewer.js?v=0.19.1';
import * as M from '../meta.js?v=0.19.1';

export const RULE = { per: 100, comboWin: 4, comboMax: 3, miss: 20, hintEvery: 30, star3: 1800, star2: 1200, spamN: 3, spamT: 2, lockT: 3 };

export class HiddenScene extends Phaser.Scene {
  constructor() { super('Hidden'); }
  create(data) {
    const sc = this.scn = M.sceneById(data.id);
    Object.assign(this, { score: 0, combo: 0, lastFind: -99, found: [], misses: [], lock: 0, hintT: RULE.hintEvery * 0.5, hints: 0, t: 0, ended: false });
    this.list = M.pickItems(sc, 10);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C);
    // 위: 제목 · 점수 · 콤보 막대
    const top = 150;
    iconBtn(this, 70, 72, '‹', () => this.leave(), 84, { dark: true });
    T(this, W / 2, 50, sc.title, 34, C.cream, { w: 900 }); T(this, W / 2, 96, `${sc.year} · ${sc.guest}의 사진`, 22, C.sub, { w: 700 });
    this.scoreT = T(this, W - 50, 60, '0', 40, C.gold, { ox: 1, w: 900 });
    this.comboG = this.add.graphics(); this.comboT = T(this, W - 50, 112, '', 22, C.gold, { ox: 1, w: 800 });
    // 사진 (아래 목록 칸을 뺀 나머지)
    const listH = 300, vh = H - top - listH;
    this.v = new Viewer(this, sc.img, 0, top, W, vh, { onTap: (ip, p) => this.tap(ip, p) });
    this.add.rectangle(W / 2, top + vh, W, 6, 0x000000, 0.4);
    // 아래: 물건 목록 (2줄 × 5) + 힌트
    const ly = top + vh; this.add.rectangle(W / 2, ly + listH / 2, W, listH, 0x2B1E14);
    this.add.image(W / 2, ly + listH / 2, 'paperstrip').setDisplaySize(W - 30, listH - 40);
    this.slots = this.list.map((it, i) => { const x = 110 + (i % 4) * 215, y = ly + 62 + Math.floor(i / 4) * 64; const t = T(this, x, y, it.n, 30, C.ink, { w: 800 }); return { it, t }; });
    // 10개를 4·4·2 로: 마지막 줄 2개는 가운데
    this.slots.slice(8).forEach((s, j) => s.t.setX(W / 2 - 110 + j * 220 - 0));
    this.hintB = iconBtn(this, W - 100, ly + listH - 70, '?', () => this.hint(), 104);
    this.hintBar = this.add.graphics();
    this.cameras.main.fadeIn(300, 20, 12, 6);
    this.drawCombo(); window.__hidden = this;
  }
  update(time, delta) {
    if (this.ended) return; const dt = Math.min(0.05, delta / 1000); this.t += dt;
    if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0) this.blur && this.blur.destroy(); }
    if (this.hints < 1) { this.hintT -= dt; if (this.hintT <= 0) { this.hints = 1; this.tweens.add({ targets: this.hintB, scale: 1.15, duration: 220, yoyo: true, repeat: 1 }); } }
    const k = this.hints ? 1 : 1 - this.hintT / RULE.hintEvery, b = this.hintB; this.hintBar.clear().lineStyle(8, 0xE9B44C, 0.9).beginPath().arc(b.x, b.y, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
    this.hintB.setAlpha(this.hints ? 1 : 0.55);
    if (this.combo && this.t - this.lastFind > RULE.comboWin) { this.combo = 0; this.drawCombo(); }
    else if (this.combo) this.drawCombo();
  }
  mult() { return Math.min(RULE.comboMax, 1 + this.combo * 0.5); }
  drawCombo() {
    const k = this.combo ? Math.max(0, 1 - (this.t - this.lastFind) / RULE.comboWin) : 0, x = W - 290, y = 112;
    this.comboG.clear().fillStyle(0x000000, 0.4).fillRoundedRect(x, y - 8, 120, 16, 8);
    if (k) this.comboG.fillStyle(0xE9B44C, 1).fillRoundedRect(x, y - 8, Math.max(16, 120 * k), 16, 8);
    this.comboT.setText(this.combo ? `콤보 ×${this.mult()}` : '');
  }
  tap(ip, p) {
    if (this.ended) return;
    if (this.lock > 0) { audio.play('sfx_miss', { volume: 0.3 }); return; }
    const hit = this.slots.find(s => !s.done && (ip.x - s.it.x) ** 2 + (ip.y - s.it.y) ** 2 <= s.it.r ** 2);
    if (hit) return this.found_(hit);
    // 빗나감: 감점 · 콤보 끊김 · 2초 안에 3번이면 3초 잠금
    this.score = Math.max(0, this.score - RULE.miss); this.scoreT.setText(this.score); this.combo = 0; this.drawCombo();
    audio.play('sfx_miss', { volume: 0.5 }); audio.buzz(30);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.6).setAlpha(0.8); this.tweens.add({ targets: x, alpha: 0, scale: 0.2, duration: 400, onComplete: () => x.destroy() });
    this.misses = this.misses.filter(t => this.t - t < RULE.spamT); this.misses.push(this.t);
    if (this.misses.length >= RULE.spamN) { this.misses = []; this.lock = RULE.lockT; this.blur = this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C, 0.35).setDepth(50); toast(this, '천천히 살펴봐요 · 잠시 눈을 쉬어요'); }
  }
  found_(s) {
    s.done = true; this.found.push(s.it.n);
    this.combo = this.t - this.lastFind <= RULE.comboWin ? this.combo + 1 : 0; this.lastFind = this.t;
    const pts = Math.round(RULE.per * this.mult()); this.score += pts; this.scoreT.setText(this.score); this.drawCombo();
    audio.play(this.combo ? 'sfx_combo' : 'sfx_find', { volume: 0.7 });
    // 사진 위 표시: 금빛 원 + 반짝 · 목록 글자는 줄 긋고 흐리게
    const ring = this.add.image(s.it.x, s.it.y, 'ring').setTint(0xFFD45A); ring.setScale(s.it.r * 2.6 / 160); this.v.layer.add(ring);
    this.tweens.add({ targets: ring, scale: s.it.r * 2.1 / 160, duration: 280, ease: 'Back.easeOut' });
    const sp = this.v.toScreen(s.it.x, s.it.y);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, g = this.add.image(sp.x, sp.y, 'spark').setTint(0xFFE9A0).setScale(0.45).setDepth(40); this.tweens.add({ targets: g, x: sp.x + Math.cos(a) * 90, y: sp.y + Math.sin(a) * 90, alpha: 0, scale: 0.1, duration: 500, onComplete: () => g.destroy() }); }
    const fl = T(this, sp.x, sp.y - 50, `+${pts}`, 40, C.gold, { w: 900, shadow: true }).setDepth(41); this.tweens.add({ targets: fl, y: sp.y - 120, alpha: 0, duration: 800, onComplete: () => fl.destroy() });
    this.tweens.add({ targets: s.t, alpha: 0.35, duration: 300 }); const st = this.add.rectangle(s.t.x, s.t.y + 2, s.t.width + 10, 4, 0x8A5A12).setScale(0, 1); this.tweens.add({ targets: st, scaleX: 1, duration: 250 });
    if (this.slots.every(x => x.done)) this.time.delayedCall(700, () => this.win());
  }
  hint() {
    if (this.ended || !this.hints) { if (!this.hints) toast(this, `힌트는 ${Math.ceil(this.hintT)}초 뒤에 생겨요`); return; }
    const s = this.slots.find(x => !x.done); if (!s) return;
    this.hints = 0; this.hintT = RULE.hintEvery; audio.play('sfx_hint', { volume: 0.7 });
    this.v.focus(s.it.x, s.it.y, 1.6);
    const g = this.add.image(s.it.x, s.it.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.it.r * 3 / 128); this.v.layer.add(g);
    this.tweens.add({ targets: g, alpha: 0.2, duration: 450, yoyo: true, repeat: 3, onComplete: () => g.destroy() });
    this.tweens.add({ targets: s.t, scale: 1.25, duration: 200, yoyo: true, repeat: 2 });
  }
  win() {
    this.ended = true; const stars = this.score >= RULE.star3 ? 3 : this.score >= RULE.star2 ? 2 : 1;
    const res = M.finish(this.scn.id, { score: this.score, stars, found: this.found });
    audio.play('sfx_shutter', { volume: 0.8 });
    this.cameras.main.flash(250, 255, 245, 220);
    this.time.delayedCall(600, () => this.scene.start('Result', { id: this.scn.id, kind: 'ho', score: this.score, stars, time: this.t, ...res }));
  }
  leave() { const p = popup(this, 760, 460); p.content.add(T(this, 0, -120, '사진관으로 돌아갈까요?', 40, C.ink, { w: 900 })); p.content.add(T(this, 0, -50, '찾은 물건은 저장되지 않아요', 26, C.dim, { w: 700 })); p.content.add(btn(this, -170, 100, 300, 110, '계속 찾기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 100, 300, 110, '나가기', () => this.scene.start('Home'), { style: 'brown' })); }
  onBack() { if (this.ended) return true; this.leave(); return true; }
}
