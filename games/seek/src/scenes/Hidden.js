// 숨은물건 찾기 (June's Journey 방식 + 사진 복원): 빛바랜 사진에서 물건을 찾을 때마다 그 둘레가 원래 색으로 돌아옴
// 실패 없음 · 별은 걸린 시간(위에서 별이 하나씩 줄어드는 게 보임) · 콤보 점수 · 30초마다 힌트 · 연타 방지
import { W, H } from '../config.js?v=0.20.0';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.20.0';
import { audio } from '../audio.js?v=0.20.0';
import { Viewer } from '../viewer.js?v=0.20.0';
import * as M from '../meta.js?v=0.20.0';

export const RULE = { per: 100, comboWin: 4, comboMax: 3, miss: 20, missSec: 3, hintEvery: 30, spamN: 3, spamT: 2, lockT: 3 };
const CHEER = ['좋아요!', '멋져요!', '대단해요!', '눈이 번쩍!', '완벽해요!'];

export class HiddenScene extends Phaser.Scene {
  constructor() { super('Hidden'); }
  create(data) {
    const sc = this.scn = M.sceneById(data.id);
    Object.assign(this, { score: 0, combo: 0, lastFind: -99, found: [], misses: [], missN: 0, lock: 0, hintT: RULE.hintEvery * 0.6, hints: 0, t: 0, ended: false, blur: null });
    this.list = M.pickItems(sc); this.tgt = M.hoTarget(this.list.length);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C);
    // 위: 뒤로 · 제목 · 별(시간) · 점수
    const top = 170, bar = this.add.graphics(); bar.fillStyle(0x2B1E14, 1).fillRect(0, 0, W, top); bar.fillStyle(0xE9B44C, 0.5).fillRect(0, top - 3, W, 3);
    iconBtn(this, 72, 82, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 62, sc.title, 38, C.cream, { w: 900 }); T(this, W / 2, 110, `${sc.guest}의 ${sc.year}년 사진 · 물건 ${this.list.length}개`, 22, C.sub, { w: 700 });
    this.starIc = [0, 1, 2].map(i => T(this, W - 168 + i * 46, 60, '★', 40, C.gold, { w: 900 }));
    this.clockT = T(this, W - 122, 108, '0:00', 24, C.sub, { w: 800 });
    this.scoreT = T(this, 150, 120, '', 0, C.gold);   // 점수는 결과에서만
    this.comboT = T(this, W / 2, top + 50, '', 38, C.gold, { w: 900, shadow: true }).setDepth(30).setAlpha(0);
    // 사진 (빛바랜 상태로 시작)
    const listH = 330, vh = H - top - listH;
    this.v = new Viewer(this, sc.img, 0, top, W, vh, { faded: true, onTap: (ip, p) => this.tap(ip, p) });
    // 아래: 물건 카드 (5개씩 2~3줄)
    const ly = top + vh, g = this.add.graphics(); g.fillStyle(0x2B1E14, 1).fillRect(0, ly, W, listH); g.fillStyle(0xE9B44C, 0.5).fillRect(0, ly, W, 3);
    const n = this.list.length, cols = n > 10 ? 6 : 5, rows = Math.ceil(n / cols), cw = (W - 190) / cols, chh = Math.min(96, (listH - 40) / rows - 10);
    this.slots = this.list.map((it, i) => {
      const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), x = 24 + (W - 190 - inRow * cw) / 2 + (i % cols) * cw + cw / 2, y = ly + 30 + chh / 2 + r * (chh + 10);
      const card = this.add.container(x, y), bg = this.add.graphics(); bg.fillStyle(0xFBF4E6, 1).fillRoundedRect(-cw / 2 + 5, -chh / 2, cw - 10, chh, 14);
      const t = T(this, 0, 0, it.n, it.n.length > 5 ? 22 : 26, C.ink, { w: 800, wrap: cw - 20 });
      card.add([bg, t]); return { it, card, t, bg, w: cw - 10, h: chh };
    });
    this.hintB = iconBtn(this, W - 92, ly + listH / 2, 'hint', () => this.hint(), 120);
    this.hintBar = this.add.graphics();
    this.hintN = T(this, W - 46, ly + listH / 2 - 52, '', 26, '#FFFFFF', { w: 900 }).setDepth(5);
    this.cameras.main.fadeIn(300, 20, 12, 6); window.__hidden = this;
    if (!M.record(sc.id)) this.time.delayedCall(500, () => toast(this, '빛바랜 사진 속 물건을 찾으면 색이 돌아와요', top + 120));
  }
  starsNow() { const t = this.t + this.missN * RULE.missSec; return t <= this.tgt.t3 ? 3 : t <= this.tgt.t2 ? 2 : 1; }
  update(time, delta) {
    if (this.ended) return; const dt = Math.min(0.05, delta / 1000); this.t += dt;
    if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0 && this.blur) { this.blur.destroy(); this.blur = null; } }
    if (this.hints < 1) { this.hintT -= dt; if (this.hintT <= 0) { this.hints = 1; this.tweens.add({ targets: this.hintB, scale: 1.15, duration: 220, yoyo: true, repeat: 1 }); } }
    const b = this.hintB, k = this.hints ? 1 : 1 - this.hintT / RULE.hintEvery; this.hintBar.clear().lineStyle(8, 0xE9B44C, 0.95).beginPath().arc(b.x, b.y, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
    b.setAlpha(this.hints ? 1 : 0.6); this.hintN.setText(this.hints ? '1' : '');
    // 별: 기준 시간이 지나면 하나씩 흐려짐
    const st = this.starsNow(); this.starIc.forEach((s, i) => { const on = i < st; if (s.on !== on) { s.on = on; s.setColor(on ? C.gold : '#5A4A3A'); if (!on) this.tweens.add({ targets: s, scale: 1.4, duration: 150, yoyo: true }); } });
    const tt = this.t + this.missN * RULE.missSec; this.clockT.setText(`${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`);
    if (this.combo && this.t - this.lastFind > RULE.comboWin) this.combo = 0;
  }
  mult() { return Math.min(RULE.comboMax, 1 + this.combo * 0.5); }
  tap(ip, p) {
    if (this.ended) return;
    if (this.lock > 0) { audio.play('sfx_miss', { volume: 0.3 }); return; }
    const hit = this.slots.find(s => !s.done && (ip.x - s.it.x) ** 2 + (ip.y - s.it.y) ** 2 <= s.it.r ** 2);
    if (hit) return this.found_(hit);
    this.score = Math.max(0, this.score - RULE.miss); this.combo = 0; this.missN++;
    audio.play('sfx_miss', { volume: 0.5 }); audio.buzz(30);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.6).setAlpha(0.8).setDepth(40); this.tweens.add({ targets: x, alpha: 0, scale: 0.2, duration: 400, onComplete: () => x.destroy() });
    const m = T(this, p.x, p.y - 40, `+${RULE.missSec}초`, 28, '#FF9A7A', { w: 900, shadow: true }).setDepth(41); this.tweens.add({ targets: m, y: p.y - 100, alpha: 0, duration: 700, onComplete: () => m.destroy() });
    this.misses = this.misses.filter(t => this.t - t < RULE.spamT); this.misses.push(this.t);
    if (this.misses.length >= RULE.spamN) { this.misses = []; this.lock = RULE.lockT; this.blur = this.add.rectangle(W / 2, H / 2, W, H, 0x1A120C, 0.4).setDepth(50); toast(this, '천천히 살펴봐요 · 잠깐 눈을 쉬어요'); }
  }
  // 물건 사진 조각 (카드에 넣을 썸네일)
  thumb(it) {
    const key = `th_${this.scn.id}_${it.n}`;
    if (!this.textures.exists(key)) { const src = this.textures.get(this.scn.img).getSourceImage(), r = it.r * 1.15, c = this.textures.createCanvas(key, 160, 160), g = c.getContext(); g.drawImage(src, it.x - r, it.y - r, r * 2, r * 2, 0, 0, 160, 160); c.refresh(); }
    return key;
  }
  found_(s) {
    s.done = true; this.found.push(s.it.n);
    this.combo = this.t - this.lastFind <= RULE.comboWin ? this.combo + 1 : 0; this.lastFind = this.t;
    this.score += Math.round(RULE.per * this.mult());
    audio.play(this.combo ? 'sfx_combo' : 'sfx_find', { volume: 0.7, rate: 1 + Math.min(4, this.combo) * 0.06 });
    // 사진 복원 + 금빛 테두리
    this.v.restore(s.it.x, s.it.y, s.it.r);
    const ring = this.add.image(s.it.x, s.it.y, 'ring').setTint(0xFFD45A).setAlpha(0.9); ring.setScale(s.it.r * 2.8 / 160); this.v.layer.add(ring);
    this.tweens.add({ targets: ring, scale: s.it.r * 2.1 / 160, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ring, alpha: 0.35, delay: 900, duration: 600 });
    // 물건 조각이 카드로 날아감
    const sp = this.v.toScreen(s.it.x, s.it.y), key = this.thumb(s.it), size = Math.min(s.h - 8, 84);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, gg = this.add.image(sp.x, sp.y, 'spark').setTint(0xFFE9A0).setScale(0.45).setDepth(40); this.tweens.add({ targets: gg, x: sp.x + Math.cos(a) * 100, y: sp.y + Math.sin(a) * 100, alpha: 0, scale: 0.1, duration: 520, onComplete: () => gg.destroy() }); }
    const fly = this.add.image(sp.x, sp.y, key).setDepth(45); fly.setDisplaySize(s.it.r * 2 * this.v.s, s.it.r * 2 * this.v.s);
    const cx = s.card.x, cy = s.card.y;
    this.tweens.add({ targets: fly, x: cx, y: cy, displayWidth: size, displayHeight: size, duration: 520, ease: 'Cubic.easeInOut', onComplete: () => {
      fly.destroy(); const th = this.add.image(0, 0, key).setDisplaySize(s.h - 10, s.h - 10); s.card.add(th);
      s.bg.clear().fillStyle(0x3A2818, 1).fillRoundedRect(-s.w / 2, -s.h / 2, s.w, s.h, 14).lineStyle(3, 0xE9B44C, 1).strokeRoundedRect(-s.w / 2, -s.h / 2, s.w, s.h, 14);
      s.t.setVisible(false); const ck = this.add.circle(s.w / 2 - 14, -s.h / 2 + 14, 15, 0xE9B44C); s.card.add([ck, T(this, s.w / 2 - 14, -s.h / 2 + 13, '✓', 20, '#3A2408', { w: 900 })]);
      this.tweens.add({ targets: s.card, scale: 1.12, duration: 130, yoyo: true });
    } });
    if (this.combo >= 1) { this.comboT.setText(`${CHEER[Math.min(CHEER.length - 1, this.combo - 1)]}  ×${this.combo + 1}`).setAlpha(1).setScale(0.6); this.tweens.killTweensOf(this.comboT); this.tweens.add({ targets: this.comboT, scale: 1, duration: 200, ease: 'Back.easeOut' }); this.tweens.add({ targets: this.comboT, alpha: 0, delay: 700, duration: 300 }); }
    if (this.slots.every(x => x.done)) { this.ended = true; this.time.delayedCall(900, () => this.win()); }
  }
  hint() {
    if (this.ended) return; if (!this.hints) { toast(this, `힌트는 ${Math.ceil(this.hintT)}초 뒤에 생겨요`); return; }
    const s = this.slots.find(x => !x.done); if (!s) return;
    this.hints = 0; this.hintT = RULE.hintEvery; audio.play('sfx_hint', { volume: 0.7 });
    this.v.focus(s.it.x, s.it.y, 1.7);
    const g = this.add.image(s.it.x, s.it.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.it.r * 3.2 / 128); this.v.layer.add(g);
    this.tweens.add({ targets: g, alpha: 0.15, duration: 420, yoyo: true, repeat: 4, onComplete: () => g.destroy() });
    this.tweens.add({ targets: s.card, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
  }
  win() {
    const stars = this.starsNow(), score = this.score + stars * 500;
    const res = M.finish(this.scn.id, { score, stars, found: this.found });
    audio.play('sfx_shutter', { volume: 0.8 }); this.v.restoreAll(); this.v.zoomTo(1, W / 2, H / 2);
    this.cameras.main.flash(300, 255, 245, 220);
    const t = T(this, W / 2, H * 0.4, '사진이 되살아났어요!', 56, C.cream, { w: 900, shadow: true }).setDepth(60).setAlpha(0); this.tweens.add({ targets: t, alpha: 1, y: H * 0.38, duration: 400 });
    this.time.delayedCall(1700, () => this.scene.start('Result', { id: this.scn.id, kind: 'ho', score, stars, time: this.t, ...res }));
  }
  leave() { const p = popup(this, 760, 460); p.content.add(T(this, 0, -120, '사진관으로 돌아갈까요?', 40, C.ink, { w: 900 })); p.content.add(T(this, 0, -50, '이번 판 기록은 저장되지 않아요', 26, C.dim, { w: 700 })); p.content.add(btn(this, -170, 100, 300, 110, '계속 찾기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 100, 300, 110, '나가기', () => this.scene.start('Home'), { style: 'brown' })); }
  onBack() { if (this.ended) return true; this.leave(); return true; }
}
