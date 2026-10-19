// 게임 화면: 8×8 판 + 조각 3개 끌어 놓기. 로직은 core/board.js, 여기는 그림·소리·손맛.
import { W, H } from '../config.js';
import { Board, N, COMBO_KEEP } from '../core/board.js';
import { choose } from '../core/ai.js';
import { TINT } from './Boot.js';
import { txt, fmt, iconButton, button, popup } from '../ui.js';
import { audio } from '../audio.js';
import { load, save } from '../save.js';

const CELL = 116, BW = CELL * N;
const LIFT = 250;            // 끄는 동안 조각을 손가락 위로 띄우는 높이 (손가락에 가리지 않게)
const TRAY_K = 0.5;          // 아래 칸에 쉬고 있는 조각 크기
const PRAISE = [null, ['좋아요!', '#FFE14D'], ['멋져요!', '#7CF2FF'], ['대단해요!', '#FF8BD8']];

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create(data = {}) {
    const d = load();
    this.bot = new URLSearchParams(location.search).has('bot');
    this.b = new Board({ seed: data.seed || ((Date.now() & 0xffffff) + 1) });
    this.shown = 0; this.busy = false; this.paused = false; this.newBest = false; this.drag = null;
    this.BX = (W - BW) / 2; this.BY = Math.round(440 + Math.max(0, (H - 440 - 1420) / 2));   // 판+조각 칸을 세로 가운데에
    this.trayY = Math.min(H - 220, this.BY + BW + 250);

    // 배경
    const bg = this.add.image(W / 2, H / 2, 'bg_main'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A1040, 0.18);
    this.makeHud(d);
    this.makeBoard();
    this.cells = Array.from({ length: N }, () => new Array(N).fill(null));
    this.ghosts = []; this.lineGlow = [];
    this.makeTray();
    this.burst = this.add.particles(0, 0, 'spark', { lifespan: { min: 300, max: 650 }, speed: { min: 180, max: 560 }, scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false }).setDepth(60);
    this.chips = this.add.particles(0, 0, 'blk_0', { lifespan: { min: 450, max: 800 }, speedX: { min: -320, max: 320 }, speedY: { min: -620, max: -200 }, gravityY: 1600, scale: { start: 0.32, end: 0.05 }, rotate: { min: -180, max: 180 }, emitting: false }).setDepth(59);
    this.makeInput();
    audio.music('bgm_game', this);
    this.cameras.main.fadeIn(300, 20, 14, 50);
    if (!d.tips.drag && !this.bot) this.time.delayedCall(600, () => this.dragHint());
    if (this.bot) this.time.addEvent({ delay: 380, loop: true, callback: () => this.botStep() });
    window.__play = this;
  }

  // ── 위쪽: 최고 기록 · 점수 · 콤보 · 판다 · 일시정지 ──
  makeHud(d) {
    const D = 50;
    this.add.image(78, 92, 'star_on').setDisplaySize(64, 64).setDepth(D);
    this.hBest = txt(this, 120, 92, fmt(d.best), 44, '#FFE14D', { ox: 0, stroke: '#2B1E5A', thick: 10 }).setDepth(D);
    iconButton(this, W - 80, 86, 'ico_pause', () => this.pause(), 112).setDepth(D);
    this.hScore = txt(this, W / 2, 230, '0', 120, '#FFFFFF', { stroke: '#2B1E5A', thick: 18 }).setDepth(D);
    this.hCombo = txt(this, W / 2, 338, '', 48, '#FFE14D', { stroke: '#2B1E5A', thick: 10 }).setDepth(D).setAlpha(0);
    this.comboDots = [0, 1, 2].map(i => this.add.circle(W / 2 - 30 + i * 30, 380, 9, 0xFFE14D).setDepth(D).setAlpha(0));
    this.panda = this.add.image(140, this.BY - 112, 'panda_idle').setDepth(D + 1);
    this.pandaK = 230 / this.panda.height; this.panda.setScale(this.pandaK).setOrigin(0.5, 1).setPosition(150, this.BY + 22);
    this.tweens.add({ targets: this.panda, scaleY: this.pandaK * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  pandaPose(key, ms = 1300) {
    this.panda.setTexture(key);
    this.tweens.add({ targets: this.panda, y: this.panda.y - 30, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    if (this.poseT) this.poseT.remove();
    this.poseT = this.time.delayedCall(ms, () => this.panda.setTexture('panda_idle'));
  }

  makeBoard() {
    const g = this.add.graphics().setDepth(5), p = 26;
    g.fillStyle(0x000000, 0.25).fillRoundedRect(this.BX - p + 8, this.BY - p + 14, BW + p * 2, BW + p * 2, 40);
    g.fillStyle(0x221A5C, 0.94).fillRoundedRect(this.BX - p, this.BY - p, BW + p * 2, BW + p * 2, 40);
    g.lineStyle(6, 0x9C8BFF, 0.9).strokeRoundedRect(this.BX - p, this.BY - p, BW + p * 2, BW + p * 2, 40);
    g.lineStyle(3, 0xFFFFFF, 0.18).strokeRoundedRect(this.BX - p + 9, this.BY - p + 9, BW + p * 2 - 18, BW + p * 2 - 18, 32);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.add.image(this.cx(c), this.cy(r), 'cell').setDisplaySize(CELL, CELL).setDepth(6);
  }
  cx(c) { return this.BX + CELL * (c + 0.5); }
  cy(r) { return this.BY + CELL * (r + 0.5); }

  // ── 아래 칸: 조각 3개 ──
  makeTray() {
    const tg = this.add.graphics().setDepth(4);
    tg.fillStyle(0x221A5C, 0.55).fillRoundedRect(40, this.trayY - 170, W - 80, 340, 44).lineStyle(4, 0x9C8BFF, 0.5).strokeRoundedRect(40, this.trayY - 170, W - 80, 340, 44);
    this.slots = [190, 540, 890].map(x => ({ x, y: this.trayY, piece: null }));
    this.fillTray(false);
  }
  pieceContainer(t) {
    const s = t.shape, c = this.add.container(0, 0).setDepth(40);
    for (const [r, cc] of s.cells) c.add(this.add.image((cc - (s.wd - 1) / 2) * CELL, (r - (s.h - 1) / 2) * CELL, `blk_${t.color}`).setDisplaySize(CELL, CELL));
    c.t = t;
    return c;
  }
  fillTray(anim = true) {
    this.b.tray.forEach((t, i) => {
      const sl = this.slots[i];
      if (sl.piece) sl.piece.destroy();
      const c = this.pieceContainer(t);
      c.setPosition(sl.x, sl.y).setScale(TRAY_K);
      if (anim) { c.x = sl.x + 700; this.tweens.add({ targets: c, x: sl.x, duration: 360, delay: i * 70, ease: 'Back.easeOut' }); }
      sl.piece = c;
    });
    this.dimUnfit();
  }
  // 들어갈 곳이 없는 조각은 흐리게
  dimUnfit() { this.slots.forEach(sl => { const p = sl.piece; if (p && p.active) p.setAlpha(this.b.anyFit(p.t.shape) ? 1 : 0.4); }); }

  // ── 끌어 놓기 ──
  makeInput() {
    this.input.on('pointerdown', p => {
      if (this.busy || this.paused || this.b.over || this.bot) return;
      const sl = this.slots.find(s => s.piece && s.piece.active && !s.piece.t.used && Math.abs(p.x - s.x) < 175 && Math.abs(p.y - s.y) < 190);
      if (!sl) return;
      this.drag = { sl, piece: sl.piece };
      audio.play('sfx_pick', { volume: 0.5 });
      this.tweens.killTweensOf(sl.piece);
      this.tweens.add({ targets: sl.piece, scale: 1, duration: 110, ease: 'Quad.easeOut' });
      sl.piece.setDepth(70);
      this.moveDrag(p);
      if (this.hint) { this.hint.destroy(); this.hint = null; const d = load(); d.tips.drag = 1; save(); }
    });
    this.input.on('pointermove', p => { if (this.drag) this.moveDrag(p); });
    this.input.on('pointerup', p => { if (this.drag) this.dropDrag(p); });
  }
  snapOf(piece) {
    const s = piece.t.shape;
    const x0 = piece.x - (s.wd * CELL) / 2, y0 = piece.y - (s.h * CELL) / 2;
    return { r: Math.round((y0 - this.BY) / CELL), c: Math.round((x0 - this.BX) / CELL) };
  }
  moveDrag(p) {
    const pc = this.drag.piece;
    pc.setPosition(p.x, p.y - LIFT);
    const { r, c } = this.snapOf(pc), idx = this.b.tray.indexOf(pc.t);
    const pv = this.b.preview(idx, r, c);
    const key = pv ? `${r},${c}` : null;
    if (key === this.drag.key) return;
    this.drag.key = key; this.drag.rc = pv ? { r, c } : null;
    this.clearPreview();
    if (!pv) return;
    for (const [dr, dc] of pc.t.shape.cells) {
      this.ghosts.push(this.add.image(this.cx(c + dc), this.cy(r + dr), `blk_${pc.t.color}`).setDisplaySize(CELL, CELL).setAlpha(0.55).setDepth(8));
      this.ghosts.push(this.add.image(this.cx(c + dc), this.cy(r + dr), 'ghost').setDisplaySize(CELL, CELL).setAlpha(0.7).setDepth(8));
    }
    // 지워질 줄: 그 줄의 블록이 조각 색으로 반짝
    const glow = (x, y, w, h) => { const g = this.add.rectangle(x, y, w, h, 0xFFFFFF, 0.16).setDepth(9).setStrokeStyle(4, 0xFFFFFF, 0.6); this.lineGlow.push(g); this.tweens.add({ targets: g, alpha: 0.5, duration: 260, yoyo: true, repeat: -1 }); };
    for (const rr of pv.rows) glow(W / 2, this.cy(rr), BW, CELL - 6);
    for (const cc of pv.cols) glow(this.cx(cc), this.BY + BW / 2, CELL - 6, BW);
    // 원작처럼 지워질 줄의 블록이 들고 있는 조각 색으로 바뀌어 보임
    const tex = `blk_${pc.t.color}`;
    for (const rr of pv.rows) for (let x = 0; x < N; x++) { const s = this.cells[rr][x]; if (s) s.setTexture(tex); }
    for (const cc of pv.cols) for (let y = 0; y < N; y++) { const s = this.cells[y][cc]; if (s) s.setTexture(tex); }
  }
  clearPreview() {
    this.ghosts.forEach(g => g.destroy()); this.ghosts = [];
    this.lineGlow.forEach(g => { this.tweens.killTweensOf(g); g.destroy(); }); this.lineGlow = [];
    for (const row of this.cells) for (const s of row) if (s && s.texture.key !== `blk_${s.col}`) s.setTexture(`blk_${s.col}`);
  }
  dropDrag() {
    const { sl, piece, rc } = this.drag; this.drag = null;
    this.clearPreview();
    if (!rc) {
      audio.play('sfx_invalid', { volume: 0.45 });
      this.tweens.add({ targets: piece, x: sl.x, y: sl.y, scale: TRAY_K, duration: 220, ease: 'Back.easeOut', onComplete: () => piece.setDepth(40) });
      return;
    }
    this.placeAt(this.b.tray.indexOf(piece.t), rc.r, rc.c, piece);
  }

  // ── 놓기 → 지우기 연출 ──
  placeAt(idx, r, c, piece) {
    const res = this.b.place(idx, r, c);
    if (!res) return;
    if (piece) piece.destroy();
    const sl = this.slots[idx]; sl.piece = null;
    audio.play('sfx_place', { volume: 0.7 });
    for (const [y, x] of res.placed) {
      const s = this.add.image(this.cx(x), this.cy(y), `blk_${res.color}`).setDisplaySize(CELL, CELL).setDepth(10); s.col = res.color;
      const k = s.scaleX; s.setScale(k * 1.18); this.tweens.add({ targets: s, scale: k, duration: 160, ease: 'Back.easeOut' });
      this.cells[y][x] = s;
    }
    const pcx = res.placed.reduce((a, [, x]) => a + this.cx(x), 0) / res.placed.length, pcy = res.placed.reduce((a, [y]) => a + this.cy(y), 0) / res.placed.length;
    if (res.lines) this.clearFx(res, pcx, pcy);
    this.floatText(pcx, pcy - 40, `+${fmt(res.gained)}`, res.lines ? '#FFE14D' : '#FFFFFF', res.lines ? 64 : 44);
    this.updateCombo();
    if (res.dealt) this.time.delayedCall(res.lines ? 420 : 120, () => { audio.play('sfx_deal', { volume: 0.5 }); this.fillTray(true); });
    else this.dimUnfit();
    if (!this.newBest && this.b.score > load().best && load().best > 0) { this.newBest = true; audio.play('sfx_best', { volume: 0.7 }); this.toast('최고 기록 갱신!', '#FFE14D'); }
    if (res.over) { this.busy = true; this.time.delayedCall(res.lines ? 1100 : 600, () => this.gameOver()); }
  }
  clearFx(res, pcx, pcy) {
    const lines = res.lines;
    audio.play(`sfx_clear_${Math.min(4, lines)}`, { volume: 0.75 });
    if (res.combo >= 2) audio.play(`sfx_combo_${Math.min(8, res.combo - 1)}`, { volume: 0.6 });
    // 줄 빛 띠
    for (const rr of res.rows) this.sweep(W / 2, this.cy(rr), BW, CELL, false, TINT[res.color]);
    for (const cc of res.cols) this.sweep(this.cx(cc), this.BY + BW / 2, CELL, BW, true, TINT[res.color]);
    // 놓은 곳에서 가까운 칸부터 물결처럼 터짐
    for (const [y, x, col] of res.cleared) {
      const s = this.cells[y][x]; this.cells[y][x] = null;
      if (!s) continue;
      const dist = Math.hypot(this.cx(x) - pcx, this.cy(y) - pcy), delay = dist * 0.32;
      s.setDepth(12);
      this.tweens.add({ targets: s, scale: s.scaleX * 1.25, duration: 90, delay, ease: 'Quad.easeOut', onStart: () => s.setTint(0xFFFFFF).setAlpha(0.95), onComplete: () => {
        this.chips.setTexture(`blk_${col}`); this.chips.emitParticleAt(s.x, s.y, 2);
        this.burst.setParticleTint(TINT[col]); this.burst.emitParticleAt(s.x, s.y, 2);
        this.tweens.add({ targets: s, scale: 0, angle: 90, alpha: 0, duration: 200, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
      } });
    }
    const big = lines >= 2 || res.combo >= 3;
    this.cameras.main.shake(big ? 220 : 120, big ? 0.006 + lines * 0.002 : 0.003);
    if (res.praise) {
      const [word, color] = PRAISE[res.praise];
      audio.play(`sfx_praise_${res.praise}`, { volume: 0.6 });
      this.bigWord(word, color, 92 + res.praise * 14);
      this.pandaPose(res.praise >= 2 ? 'panda_wow' : 'panda_cheer');
    } else if (res.combo >= 3) this.pandaPose('panda_cheer', 900);
    if (res.combo >= 2) this.bigWord(`콤보 ${res.combo}`, '#FFE14D', 70 + Math.min(40, res.combo * 4), this.BY + BW * 0.62);
    if (res.allClear) {
      audio.play('sfx_allclear', { volume: 0.8 }); this.pandaPose('panda_wow', 2000);
      this.time.delayedCall(350, () => { this.bigWord('올 클리어!', '#7CFFB2', 120, this.BY + BW / 2); this.cameras.main.flash(300, 255, 255, 255); });
    }
  }
  // 줄이 지워질 때: 가운데에서 양끝으로 퍼지는 부드러운 빛 (불투명한 흰 막대처럼 보이지 않게 얇고 옅게)
  sweep(x, y, w, h, vertical, tint = 0xFFF2B0) {
    const g = this.add.image(x, y, 'glow').setDepth(14).setBlendMode('ADD').setTint(tint).setAlpha(0.55);
    g.setDisplaySize(vertical ? w * 0.9 : 80, vertical ? 80 : h * 0.9);
    this.tweens.add({ targets: g, displayWidth: vertical ? w * 0.9 : w * 1.05, displayHeight: vertical ? h * 1.05 : h * 0.9, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
  }
  bigWord(str, color, size, y = this.BY + BW * 0.4) {
    const t = txt(this, W / 2, y, str, size, color, { stroke: '#2B1E5A', thick: Math.round(size * 0.16) }).setDepth(80).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 90, alpha: 0, delay: 650, duration: 380, onComplete: () => t.destroy() });
  }
  floatText(x, y, str, color, size) {
    const t = txt(this, x, y, str, size, color, { stroke: '#2B1E5A', thick: 8 }).setDepth(75);
    this.tweens.add({ targets: t, y: y - 120, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
  toast(str, color) {
    const t = txt(this, W / 2, 400, str, 46, color, { stroke: '#2B1E5A', thick: 10 }).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 380, duration: 200, yoyo: true, hold: 1200, onComplete: () => t.destroy() });
  }
  updateCombo() {
    const b = this.b, on = b.combo >= 2;
    this.hCombo.setText(on ? `콤보 ×${b.combo}` : '').setAlpha(on ? 1 : 0);
    // 콤보가 끊기기까지 남은 수 (점 3개)
    this.comboDots.forEach((dt, i) => dt.setAlpha(on ? (i < COMBO_KEEP - b.miss ? 1 : 0.2) : 0));
  }

  update(time, dms) {
    // 점수 숫자는 빠르게 따라 올라감
    if (this.shown !== this.b.score) {
      this.shown += Math.max(1, Math.ceil((this.b.score - this.shown) * 0.18));
      if (this.shown > this.b.score) this.shown = this.b.score;
      this.hScore.setText(fmt(this.shown));
      if (this.b.score > load().best) this.hBest.setText(fmt(this.b.score));
    }
  }

  // 처음 한 번: 손가락이 조각을 판으로 끌어 보이는 안내
  dragHint() {
    const sl = this.slots.find(s => s.piece && this.b.anyFit(s.piece.t.shape)); if (!sl) return;
    const c = this.add.container(sl.x, sl.y).setDepth(90);
    c.add([this.add.circle(0, 0, 46, 0xFFFFFF, 0.35).setStrokeStyle(6, 0xFFFFFF), txt(this, 0, -150, '끌어서 판에 놓아요!', 46, '#FFFFFF', { stroke: '#2B1E5A', thick: 10 })]);
    this.hint = c;
    this.tweens.add({ targets: c.list[0], x: { from: 0, to: W / 2 - sl.x }, y: { from: 0, to: this.BY + BW / 2 - sl.y }, duration: 1200, repeat: -1, repeatDelay: 300, ease: 'Sine.easeInOut' });
  }

  botStep() {
    if (this.busy || this.paused || this.b.over || this.drag) return;
    const m = choose(this.b, 0.8); if (!m) return;
    this.placeAt(m.i, m.r, m.c, this.slots[m.i].piece);
  }

  gameOver() {
    audio.play('sfx_over', { volume: 0.7 });
    // 남은 블록이 하나씩 회색으로
    let i = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const s = this.cells[r][c]; if (s) this.time.delayedCall(i++ * 14, () => s.setTint(0x6E6A88)); }
    const msg = txt(this, W / 2, this.BY + BW / 2, '더 놓을 곳이 없어요', 70, '#FFFFFF', { stroke: '#2B1E5A', thick: 12 }).setDepth(90).setAlpha(0);
    this.tweens.add({ targets: msg, alpha: 1, duration: 300 });
    this.time.delayedCall(1700, () => this.finish());
  }
  finish() {
    const b = this.b, d = load();
    const prev = d.best;
    d.plays++; d.lines += b.lines; d.bestCombo = Math.max(d.bestCombo, b.bestCombo);
    if (b.score > d.best) d.best = b.score;
    save();
    audio.stopMusic();
    this.cameras.main.fadeOut(350, 20, 14, 50);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', { score: b.score, best: d.best, newBest: b.score > prev && b.score > 0, lines: b.lines, combo: b.bestCombo, moves: b.moves }));
  }

  pause() {
    if (this.paused || this.b.over) return;
    this.paused = true;
    this.frozen = this.tweens.getTweens().filter(t => t.isPlaying()); this.frozen.forEach(t => t.pause());
    audio.duck(0.1);
    const pop = popup(this, '잠시 멈춤', 760, { closable: false, depth: 2000 });
    const resume = () => { pop.close(); this.time.delayedCall(160, () => { this.paused = false; (this.frozen || []).forEach(t => t.resume()); this.frozen = null; audio.duck(0.34); }); };
    pop.content.add(button(this, 0, -110, '계속하기', resume, { key: 'btn_gold', w: 520, h: 150 }));
    pop.content.add(button(this, 0, 60, '처음으로', () => { pop.close(); this.paused = false; audio.stopMusic(); this.scene.start('Lobby'); }, { key: 'btn_purple', w: 440, h: 120 }));
    const d = load();
    const ic = (x, on, a, b2, fn) => { const bt = button(this, x, 220, '', fn, { key: 'btn_icon', w: 140, h: 140 }); const im = this.add.image(x, 214, on ? a : b2).setDisplaySize(90, 90); pop.content.add([bt, im]); return im; };
    const sI = ic(-110, d.sfx, 'ico_sound', 'ico_sound_off', () => { audio.toggleSfx(); sI.setTexture(load().sfx ? 'ico_sound' : 'ico_sound_off'); });
    const mI = ic(110, d.music, 'ico_music', 'ico_music_off', () => { audio.toggleMusic(); mI.setTexture(load().music ? 'ico_music' : 'ico_music_off'); if (load().music) audio.duck(0.1); });
  }
}
