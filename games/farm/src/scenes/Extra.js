// 따로 여는 화면: 뒷산 광산 · 미니게임 3종(댐 수리 · 참새 쫓기 · 불량배 쫓기) · 마을 사람들(호감도 · 선물 · 결혼)
import { W, H } from '../config.js?v=0.38.1';
import { T, C, btn, popup, toast } from '../ui.js?v=0.38.1';
import { audio } from '../audio.js?v=0.38.1';
import { goPrev } from '../nav.js?v=0.38.1';
import { ITEMS, MINE, MINIS, SUITORS, HEARTS, HEART_PTS, CHARS } from '../data.js?v=0.38.1';
import { load, save, has, mine, mineHit, miniLeft, miniDone, giftTo, hearts, marry, countOf, rewardText, progress } from '../state.js?v=0.38.1';

const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };
function top(sc, title) { const g = sc.add.graphics(); g.fillStyle(0x3E2A14, 0.92).fillRoundedRect(16, 18, W - 32, 112, 30); T(sc, W / 2, 74, title, 40, '#FFFFFF', { w: 900 }); btn(sc, 110, 74, 160, 80, '◀ 마을', () => goPrev(sc), { size: 26, style: 'cream' }); }

// ── 광산
export class MineScene extends Phaser.Scene {
  constructor() { super('Mine'); }
  create() {
    const bg = this.add.image(W / 2, H / 2, 'mine_bg'); bg.setScale(Math.max(W / bg.width, H / bg.height)); top(this, '뒷산 광산');
    const m = mine(), d = load(), cs = 150, x0 = (W - cs * MINE.cols) / 2, y0 = 300;
    T(this, W / 2, 190, `${m.depth}층 · 곡괭이로 한 칸 · 다이너마이트로 3×3`, 26, '#FFFFFF', { w: 900, shadow: true });
    this.cells = m.cells.map((k, i) => { const x = x0 + (i % MINE.cols) * cs + cs / 2, y = y0 + Math.floor(i / MINE.cols) * cs + cs / 2; if (!k) return null; const im = icon(this, x, y, k, cs - 6); im.setInteractive({ useHandCursor: true }).on('pointerup', () => this.hit(i)); return im; });
    const by = y0 + MINE.rows * cs + 80; this.tool = 'pickaxe';
    this.pB = btn(this, W / 2 - 220, by, 400, 110, '', () => { this.tool = 'pickaxe'; this.lab(); }, { size: 28, style: 'gold' });
    this.dB = btn(this, W / 2 + 220, by, 400, 110, '', () => { this.tool = 'dynamite'; this.lab(); }, { size: 28, style: 'cream' });
    T(this, W / 2, by + 90, '곡괭이 · 다이너마이트는 대장간에서 만들어요', 22, '#FFFFFF', { w: 900, shadow: true }); this.lab(); window.__mine = this;
  }
  lab() { const d = load(); this.pB.setLabel(`⛏ 곡괭이 ${d.items.pickaxe || 0}${this.tool === 'pickaxe' ? ' ✓' : ''}`); this.dB.setLabel(`🧨 다이너마이트 ${d.items.dynamite || 0}${this.tool === 'dynamite' ? ' ✓' : ''}`); }
  hit(i) {
    const boom = this.tool === 'dynamite', out = mineHit(i, boom); if (!out) return toast(this, boom ? '다이너마이트가 없어요' : '곡괭이가 없어요 · 대장간에서 만들어요', H / 2);
    save(); audio.play(boom ? 'sfx_box' : 'sfx_drop', { volume: 0.8, rate: boom ? 0.7 : 1 }); audio.buzz(boom ? [30, 40, 30] : 15); if (boom) this.cameras.main.shake(250, 0.01);
    for (const { j, r } of out) { const im = this.cells[j]; if (!im) continue; this.cells[j] = null; this.tweens.add({ targets: im, scale: im.scale * 1.3, alpha: 0, angle: 20, duration: 250, onComplete: () => im.destroy() }); if (r) { const t = T(this, im.x, im.y, rewardText(r), 28, '#FFE27A', { w: 900 }).setStroke('#3E2A14', 6); this.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 1200, delay: 200, onComplete: () => t.destroy() }); } }
    this.lab(); if (load().mine.depth !== mine().depth || mine().cells.every(c => c)) this.time.delayedCall(600, () => { toast(this, '새 층이 열렸어요!', H / 2); this.scene.restart(); });
  }
  onBack() { return goPrev(this); }
}

// ── 미니게임: 30초 · 나타나는 것을 눌러요
export class MiniScene extends Phaser.Scene {
  constructor() { super('Mini'); }
  create(data) {
    const k = this.k = data.k || 'sparrow', M = MINIS[k]; this.score = 0; this.left = 30; this.on = false;
    this.add.rectangle(W / 2, H / 2, W, H, k === 'dam' ? 0x5BB6E0 : k === 'bully' ? 0xD9C9A8 : 0x8BC07A); top(this, M.n);
    const f = this.add.image(W / 2, 420, M.who); f.setScale(300 / f.height);
    T(this, W / 2, 640, M.d, 32, '#3E2A14', { w: 900, wrap: 900 });
    T(this, 200, 160, '점수', 24, '#3E2A14', { w: 900 }); T(this, W - 200, 160, '남은 시간', 24, '#3E2A14', { w: 900 }); this.scoreT = T(this, 200, 205, '0', 48, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 8); this.timeT = T(this, W - 200, 205, '30', 48, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 8);
    this.field = { x: 80, y: 760, w: W - 160, h: H - 960 }; const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.25).fillRoundedRect(this.field.x, this.field.y, this.field.w, this.field.h, 40);
    if (k === 'sparrow') for (let i = 0; i < 20; i++) icon(this, this.field.x + 60 + (i % 5) * (this.field.w - 120) / 4, this.field.y + 80 + Math.floor(i / 5) * (this.field.h - 160) / 3, 'ripe_wheat', 160).setAlpha(0.8);
    if (k === 'dam') { const dg = this.add.graphics(); dg.fillStyle(0x8A5A2B, 1).fillRect(this.field.x, this.field.y + this.field.h / 2 - 160, this.field.w, 320); }
    this.go = btn(this, W / 2, H / 2 + 200, 420, 130, `시작! (오늘 ${miniLeft()}번 남음)`, () => this.start(), { size: 34, style: 'gold' }); window.__mini = this;
  }
  start() { if (miniLeft() <= 0) return toast(this, '오늘은 다 했어요 · 내일 다시 와요', H / 2); this.go.destroy(); this.on = true; audio.music('bgm_story');
    this.timer = this.time.addEvent({ delay: 1000, repeat: 29, callback: () => { this.left--; this.timeT.setText(String(this.left)); if (this.left <= 0) this.end(); } });
    this.spawnE = this.time.addEvent({ delay: this.k === 'bully' ? 900 : 650, loop: true, callback: () => this.spawn() }); }
  spawn() { if (!this.on) return; const F = this.field, x = F.x + 80 + Math.random() * (F.w - 160), y = this.k === 'dam' ? F.y + F.h / 2 + (Math.random() - 0.5) * 220 : F.y + 80 + Math.random() * (F.h - 160);
    const key = { dam: 'leak', sparrow: 'sparrow', bully: 'bully' }[this.k], im = icon(this, x, y, key, 170); im.setScale(0.01); const sc = 170 / Math.max(im.width, im.height);
    this.tweens.add({ targets: im, scale: sc, duration: 180, ease: 'Back.easeOut' });
    if (this.k === 'sparrow') this.tweens.add({ targets: im, x: x + (Math.random() - 0.5) * 300, duration: 1400, yoyo: true });
    im.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.on || im.hit) return; im.hit = true; this.score++; this.scoreT.setText(String(this.score)); audio.play(this.k === 'dam' ? 'sfx_drop' : 'sfx_tap', { volume: 0.7 }); audio.buzz(10);
      if (this.k === 'dam') { const pl = icon(this, x, y, 'plank', 150); this.tweens.add({ targets: pl, alpha: 0, delay: 600, duration: 300, onComplete: () => pl.destroy() }); }
      this.tweens.add({ targets: im, scale: 0, angle: 180, duration: 200, onComplete: () => im.destroy() }); });
    this.time.delayedCall(this.k === 'bully' ? 1100 : 1700, () => { if (im.active && !im.hit) this.tweens.add({ targets: im, alpha: 0, duration: 200, onComplete: () => im.destroy() }); }); }
  end() { if (!this.on) return; this.on = false; this.spawnE.remove(); const { r } = miniDone(this.score); save(); audio.play('sfx_levelup', { volume: 0.7 });
    const p = popup(this, 800, 620); p.content.add(T(this, 0, -220, `${this.score}개 성공!`, 60, '#5AAE3C', { w: 900 })); p.content.add(T(this, 0, -100, rewardText(r), 34, C.ink, { w: 900 }));
    p.content.add(btn(this, 0, 180, 360, 100, '마을로', () => { p.close(); goPrev(this); }, { size: 32 })); }
  onBack() { if (this.on) return true; return goPrev(this); }
}

// ── 마을 사람들: 호감도 · 선물 · 프러포즈 · 결혼
export class PeopleScene extends Phaser.Scene {
  constructor() { super('People'); }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0xFFF3E0); top(this, '마을 사람들'); const d = load();
    if (d.spouse) { const S = SUITORS[d.spouse], f = this.add.image(W / 2 - 180, 620, 'princess'), f2 = this.add.image(W / 2 + 180, 620, d.spouse); f.setScale(480 / f.height); f2.setScale(480 / f2.height);
      icon(this, W / 2, 470, 'heart', 120); T(this, W / 2, 940, `${S.n}와(과) 결혼했어요`, 48, '#E8507A', { w: 900 }); T(this, W / 2, 1010, `부부 효과: ${S.perk}`, 30, C.brown, { w: 900 }); T(this, W / 2, 1100, `"${S.line[0]}"`, 28, C.dim, { w: 800, wrap: 860 }); return; }
    T(this, W / 2, 180, '좋아하는 제품을 선물하면 하트가 빨리 차요 · 하트 5개면 프러포즈!', 24, C.dim, { w: 900 });
    Object.entries(SUITORS).forEach(([k, S], i) => { const y = 440 + i * 470, g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(40, y - 200, W - 80, 420, 36).lineStyle(4, 0xE8A0B4, 1).strokeRoundedRect(40, y - 200, W - 80, 420, 36);
      const f = this.add.image(190, y + 10, k); f.setScale(360 / f.height); T(this, 360, y - 150, `${S.n} · ${S.job}`, 40, C.ink, { ox: 0, w: 900 });
      const hv = d.love[k] / HEART_PTS; for (let h = 0; h < HEARTS; h++) { const hi = icon(this, 380 + h * 70, y - 80, 'heart', 56); if (h + 1 > hv) { hi.setTintFill(0xD8CCCC).setAlpha(0.55); if (hv > h) { const part = icon(this, 380 + h * 70, y - 80, 'heart', 56); part.setCrop(0, 0, part.width * (hv - h), part.height); } } }
      T(this, 360, y - 20, '좋아하는 것', 22, C.dim, { ox: 0, w: 800 }); S.likes.forEach((it, j) => { icon(this, 400 + j * 100, y + 40, it, 76); T(this, 400 + j * 100, y + 92, `${d.items[it] || 0}`, 20, has(it) ? C.green : C.dim, { w: 900 }); });
      T(this, 360, y + 140, `결혼 효과: ${S.perk}`, 22, C.brown, { ox: 0, w: 800 });
      if (hearts(k) >= HEARTS) btn(this, W - 190, y + 140, 240, 84, '💍 프러포즈', () => this.propose(k), { size: 26, style: 'rose' });
      else btn(this, W - 190, y + 140, 220, 84, '🎁 선물', () => this.gift(k), { size: 26, style: 'gold' }); });
    window.__people = this;
  }
  gift(k) { const S = SUITORS[k], d = load(), list = Object.keys(d.items).filter(it => d.items[it] > 0 && ITEMS[it] && !['pickaxe', 'dynamite'].includes(it)).sort((a, b) => S.likes.includes(b) - S.likes.includes(a) || ITEMS[b].v - ITEMS[a].v).slice(0, 12);
    if (!list.length) return toast(this, '줄 물건이 없어요', H / 2); const p = popup(this, 980, 300 + Math.ceil(list.length / 4) * 210); p.content.add(T(this, 0, -60 - Math.ceil(list.length / 4) * 105, `${S.n}에게 무엇을 줄까요?`, 40, C.ink, { w: 900 }));
    list.forEach((it, i) => { const x = -345 + (i % 4) * 230, y = 40 - Math.ceil(list.length / 4) * 105 + Math.floor(i / 4) * 210, c = this.add.container(x, y), g = this.add.graphics(), like = S.likes.includes(it); g.fillStyle(like ? 0xFFE3EC : 0xFFF6E0, 1).fillRoundedRect(-100, -95, 200, 190, 24); c.add([g, icon(this, 0, -20, it, 100), T(this, 0, 60, `${ITEMS[it].n} ${d.items[it]}${like ? ' ♥' : ''}`, 20, C.ink, { w: 900 })]);
      c.setSize(200, 190).setInteractive({ useHandCursor: true }).on('pointerup', () => { const r = giftTo(k, it); if (!r) return; save(); audio.play(r.liked ? 'sfx_levelup' : 'sfx_coin', { volume: 0.6 }); p.close(); toast(this, r.liked ? `${S.n}: "제가 제일 좋아하는 거예요!" ♥+${r.pts}` : `${S.n}: "고마워요." ♥+${r.pts}`, H / 2); this.time.delayedCall(900, () => this.scene.restart()); }); p.content.add(c); }); }
  propose(k) { const S = SUITORS[k]; if (!countOf('wedding')) return toast(this, '먼저 결혼식장을 지어요 (건설 → 마을)', H / 2);
    const p = popup(this, 900, 900, { closable: false }), f = this.add.image(0, -150, k); f.setScale(420 / f.height); p.content.add(f); p.content.add(T(this, 0, 120, `"${S.line[1]}"`, 30, C.ink, { w: 800, wrap: 760 }));
    p.content.add(btn(this, -180, 320, 320, 100, '네, 좋아요!', () => { marry(k); progress('married', 1); save(); audio.play('sfx_levelup', { volume: 0.9 }); audio.duck(3000); p.close(); this.cameras.main.flash(500, 255, 220, 230); this.time.delayedCall(600, () => this.scene.restart()); }, { size: 30, style: 'rose' }));
    p.content.add(btn(this, 180, 320, 300, 100, '조금만 더…', () => p.close(), { size: 28, style: 'cream' })); }
  onBack() { return goPrev(this); }
}
