// 게임 화면 (클래식 · 어드벤처 공용): 8×8 판 + 조각 3개 끌어 놓기. 로직은 core/board.js, 여기는 그림·소리·손맛.
import { W, H } from '../config.js';
import { Board, N, COMBO_KEEP } from '../core/board.js';
import { choose } from '../core/ai.js';
import { makeLevel } from '../core/levels.js';
import { TINT, THEMES } from './Boot.js';
import { T, C, fmt, btn, iconBtn, popup, toast } from '../pui.js';
import { audio } from '../audio.js';
import { load, save } from '../save.js';
import * as M from '../meta.js';

const CELL = 116, BW = CELL * N;
const LIFT = 250;            // 끄는 동안 조각을 손가락 위로 띄우는 높이
const TRAY_K = 0.52;
// 칭찬: 2줄 Good · 3줄 Great · 4줄 Excellent · 5줄 Amazing · 큰 콤보와 겹치면 Unbelievable
const PRAISE = [null, ['Good!', '#9BE7FF'], ['Great!', '#7CFFB2'], ['Excellent!', '#FFE07A'], ['Amazing!', '#FF9BD2'], ['Unbelievable!', '#C9A6FF']];
const buzz = ms => { try { if (load().sfx && navigator.vibrate) navigator.vibrate(ms); } catch { /* */ } };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create(data = {}) {
    const d = load(), q = new URLSearchParams(location.search);
    this.bot = q.has('bot');
    this.mode = data.mode || (q.has('adv') ? 'adv' : 'classic');
    const seed = data.seed || ((Date.now() & 0xffffff) + 1);
    if (this.mode === 'adv') {
      const a = M.adv(); this.n = data.n || Math.min(96, a.cleared + 1);
      this.level = makeLevel(this.n, undefined, a.season);
      this.b = new Board({ seed, level: this.level });
      this.theme = (this.n + a.season) % THEMES.length;
    } else {
      this.b = new Board({ seed, mercy: M.wantMercy() });
      this.theme = d.theme % THEMES.length;
    }
    this.shown = 0; this.busy = false; this.paused = false; this.newBest = false; this.drag = null; this.revived = false;
    this.BX = (W - BW) / 2; this.BY = Math.round(470 + Math.max(0, (H - 470 - 1420) / 2));
    this.trayY = Math.min(H - 210, this.BY + BW + 250);

    this.bg = this.add.image(W / 2, H / 2, `bg_t${this.theme}`).setDisplaySize(W, Math.max(H, W * 1300 / 540));
    this.makeHud(d);
    this.boardG = this.add.graphics().setDepth(5);
    this.cellImgs = [];
    this.drawBoard();
    this.cells = Array.from({ length: N }, () => new Array(N).fill(null));
    this.gemS = Array.from({ length: N }, () => new Array(N).fill(null));
    this.ghosts = []; this.lineGlow = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.b.g[r][c] >= 0) this.putCell(r, c, this.b.g[r][c], this.b.gem[r][c], 0);
    this.makeTray();
    this.burst = this.add.particles(0, 0, 'spark', { lifespan: { min: 300, max: 650 }, speed: { min: 180, max: 560 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false }).setDepth(60);
    this.chips = this.add.particles(0, 0, 'blk_0', { lifespan: { min: 450, max: 800 }, speedX: { min: -320, max: 320 }, speedY: { min: -620, max: -200 }, gravityY: 1600, scale: { start: 0.3, end: 0.05 }, rotate: { min: -180, max: 180 }, emitting: false }).setDepth(59);
    this.makeInput();
    audio.music('bgm_game', this);
    this.cameras.main.fadeIn(260, 8, 10, 24);
    if (!d.tips.drag && !this.bot) this.time.delayedCall(600, () => this.dragHint());
    if (this.mode === 'adv' && !this.bot) this.time.delayedCall(300, () => this.goalIntro());
    if (this.bot) this.time.addEvent({ delay: 360, loop: true, callback: () => this.botStep() });
    window.__play = this;
  }

  // ── 위쪽 정보 ──
  makeHud(d) {
    const D = 50;
    iconBtn(this, W - 80, 92, 'i_pause', () => this.pause(), 96).setDepth(D);
    if (this.mode === 'classic') {
      this.add.image(70, 92, 'i_crown').setDisplaySize(44, 44).setTint(0xF5C451).setDepth(D);
      this.hBest = T(this, 104, 92, fmt(d.best), 38, C.gold, { ox: 0, w: 900 }).setDepth(D);
      this.hScore = T(this, W / 2, 250, '0', 132, C.text, { w: 900, ls: 1 }).setDepth(D);
    } else {
      T(this, 70, 92, `레벨 ${this.n}`, 40, C.text, { ox: 0, w: 900 }).setDepth(D);
      if (this.level.hard) T(this, 250, 92, '어려움', 26, '#FF8FA8', { ox: 0, w: 900 }).setDepth(D);
      this.hScore = T(this, W / 2, 92, '0', 40, C.sub, { w: 900 }).setDepth(D);
      this.goalViews = [];
      const gs = this.b.goals, gw = 220, x0 = W / 2 - (gs.length - 1) * gw / 2;
      gs.forEach((g, i) => {
        const x = x0 + i * gw, y = 260, c = this.add.container(x, y).setDepth(D);
        const bgc = this.add.graphics(); bgc.fillStyle(0x0E1535, 0.85).fillRoundedRect(-95, -70, 190, 140, 28).lineStyle(2, 0xFFFFFF, 0.1).strokeRoundedRect(-95, -70, 190, 140, 28);
        c.add(bgc);
        let icon;
        if (g.type === 'gem') icon = this.add.image(0, -18, `gem_${g.g}`).setDisplaySize(70, 70);
        else if (g.type === 'score') icon = T(this, 0, -22, '점수', 30, C.gold, { w: 900 });
        else icon = T(this, 0, -22, '그림 블록', 28, C.pink, { w: 900 });
        const num = T(this, 0, 38, '', 36, C.text, { w: 900 });
        const chk = this.add.image(54, -44, 'i_check').setDisplaySize(40, 40).setTint(0x5BE39A).setVisible(false);
        c.add([icon, num, chk]);
        this.goalViews.push({ g, c, num, chk, icon });
      });
      this.updateGoals();
    }
    this.hCombo = T(this, W / 2, 360, '', 40, C.gold, { w: 900, ls: 2 }).setDepth(D).setAlpha(0);
    this.comboDots = [0, 1, 2].map(i => this.add.circle(W / 2 - 24 + i * 24, 400, 7, 0xF5C451).setDepth(D).setAlpha(0));
  }
  updateGoals() {
    if (!this.goalViews) return;
    for (const v of this.goalViews) {
      const g = v.g, left = g.type === 'score' ? Math.max(0, g.target - this.b.score) : Math.max(0, g.count - g.have);
      v.num.setText(left ? fmt(left) : '');
      v.chk.setVisible(!left);
    }
  }

  drawBoard() {
    const g = this.boardG, p = 22, th = THEMES[this.theme];
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(this.BX - p, this.BY - p + 14, BW + p * 2, BW + p * 2, 34);
    g.fillStyle(th.board, 0.92).fillRoundedRect(this.BX - p, this.BY - p, BW + p * 2, BW + p * 2, 34);
    g.lineStyle(2, 0xFFFFFF, 0.12).strokeRoundedRect(this.BX - p, this.BY - p, BW + p * 2, BW + p * 2, 34);
    this.cellImgs.forEach(c => c.destroy()); this.cellImgs = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.cellImgs.push(this.add.image(this.cx(c), this.cy(r), `cell_t${this.theme}`).setDisplaySize(CELL, CELL).setDepth(6));
  }
  // 판을 다 비우면 배경 테마가 바뀜 (원작처럼)
  nextTheme() {
    this.theme = (this.theme + 1) % THEMES.length;
    if (this.mode === 'classic') { const d = load(); d.theme = this.theme; save(); }
    const nb = this.add.image(W / 2, H / 2, `bg_t${this.theme}`).setDisplaySize(W, Math.max(H, W * 1300 / 540)).setAlpha(0).setDepth(-1);
    this.tweens.add({ targets: nb, alpha: 1, duration: 700, onComplete: () => { this.bg.destroy(); this.bg = nb; } });
    this.drawBoard();
    toast(this, `테마 · ${THEMES[this.theme].name}`, C.sub, this.BY - 60);
  }
  cx(c) { return this.BX + CELL * (c + 0.5); }
  cy(r) { return this.BY + CELL * (r + 0.5); }
  putCell(r, c, col, gem, pop = 1) {
    const s = this.add.image(this.cx(c), this.cy(r), `blk_${col}`).setDisplaySize(CELL, CELL).setDepth(10); s.col = col;
    if (pop) { const k = s.scaleX; s.setScale(k * 1.15); this.tweens.add({ targets: s, scale: k, duration: 150, ease: 'Back.easeOut' }); }
    this.cells[r][c] = s;
    if (gem >= 0) {
      const gs = this.add.image(s.x, s.y, `gem_${gem}`).setDisplaySize(CELL * 0.62, CELL * 0.62).setDepth(11); gs.k = gem; this.gemS[r][c] = gs;
      this.tweens.add({ targets: gs, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // ── 조각 칸 ──
  makeTray() {
    const tg = this.add.graphics().setDepth(4);
    tg.fillStyle(0x0E1535, 0.55).fillRoundedRect(36, this.trayY - 168, W - 72, 336, 40).lineStyle(2, 0xFFFFFF, 0.08).strokeRoundedRect(36, this.trayY - 168, W - 72, 336, 40);
    this.slots = [190, 540, 890].map(x => ({ x, y: this.trayY, piece: null }));
    this.fillTray(false);
  }
  pieceContainer(t) {
    const s = t.shape, c = this.add.container(0, 0).setDepth(40);
    s.cells.forEach(([r, cc], i) => {
      const x = (cc - (s.wd - 1) / 2) * CELL, y = (r - (s.h - 1) / 2) * CELL;
      c.add(this.add.image(x, y, `blk_${t.color}`).setDisplaySize(CELL, CELL));
      if (t.gems && t.gems[i] >= 0) c.add(this.add.image(x, y, `gem_${t.gems[i]}`).setDisplaySize(CELL * 0.62, CELL * 0.62));
    });
    c.t = t;
    return c;
  }
  fillTray(anim = true) {
    this.b.tray.forEach((t, i) => {
      const sl = this.slots[i];
      if (sl.piece) sl.piece.destroy();
      const c = this.pieceContainer(t);
      c.setPosition(sl.x, sl.y).setScale(TRAY_K);
      if (anim) { c.x = sl.x + 700; this.tweens.add({ targets: c, x: sl.x, duration: 340, delay: i * 70, ease: 'Cubic.easeOut' }); }
      sl.piece = c;
    });
    this.dimUnfit();
  }
  dimUnfit() { this.slots.forEach(sl => { const p = sl.piece; if (p && p.active) p.setAlpha(this.b.anyFit(p.t.shape) ? 1 : 0.35); }); }

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
    this.input.on('pointerup', () => { if (this.drag) this.dropDrag(); });
  }
  snapOf(piece) {
    const s = piece.t.shape;
    return { r: Math.round((piece.y - (s.h * CELL) / 2 - this.BY) / CELL), c: Math.round((piece.x - (s.wd * CELL) / 2 - this.BX) / CELL) };
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
      this.ghosts.push(this.add.image(this.cx(c + dc), this.cy(r + dr), `blk_${pc.t.color}`).setDisplaySize(CELL, CELL).setAlpha(0.5).setDepth(8));
      this.ghosts.push(this.add.image(this.cx(c + dc), this.cy(r + dr), 'ghost').setDisplaySize(CELL, CELL).setAlpha(0.6).setDepth(8));
    }
    const glow = (x, y, w, h) => { const g = this.add.rectangle(x, y, w, h, 0xFFFFFF, 0.1).setDepth(9); this.lineGlow.push(g); this.tweens.add({ targets: g, alpha: 0.32, duration: 280, yoyo: true, repeat: -1 }); };
    for (const rr of pv.rows) glow(W / 2, this.cy(rr), BW, CELL - 8);
    for (const cc of pv.cols) glow(this.cx(cc), this.BY + BW / 2, CELL - 8, BW);
    // 지워질 줄의 블록이 들고 있는 조각 색으로 바뀌어 보임 (원작)
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
      this.tweens.add({ targets: piece, x: sl.x, y: sl.y, scale: TRAY_K, duration: 220, ease: 'Cubic.easeOut', onComplete: () => piece.setDepth(40) });
      return;
    }
    this.placeAt(this.b.tray.indexOf(piece.t), rc.r, rc.c, piece);
  }

  // ── 놓기 → 지우기 연출 ──
  placeAt(idx, r, c, piece) {
    const res = this.b.place(idx, r, c);
    if (!res) return;
    if (piece) piece.destroy();
    this.slots[idx].piece = null;
    audio.play('sfx_place', { volume: 0.7 });
    res.placed.forEach(([y, x], i) => this.putCell(y, x, res.color, res.gems ? res.gems[i] : -1));
    const pcx = res.placed.reduce((a, [, x]) => a + this.cx(x), 0) / res.placed.length, pcy = res.placed.reduce((a, [y]) => a + this.cy(y), 0) / res.placed.length;
    if (res.lines) this.clearFx(res, pcx, pcy);
    this.floatText(pcx, pcy - 40, `+${fmt(res.gained)}`, res.lines ? C.gold : C.text, res.lines ? 58 : 40);
    this.updateCombo(); this.updateGoals();
    if (res.lines) { M.track('lines', res.lines); if (res.lines >= 3) M.track('multi', res.lines); M.track('combo', res.combo); }
    if (res.allClear) M.track('allclear');
    if (res.dealt) this.time.delayedCall(res.lines ? 400 : 120, () => { audio.play('sfx_deal', { volume: 0.5 }); this.fillTray(true); });
    else this.dimUnfit();
    if (this.mode === 'classic' && !this.newBest && this.b.score > load().best && load().best > 0) { this.newBest = true; audio.play('sfx_best', { volume: 0.7 }); toast(this, '최고 기록 갱신!', C.gold, 430); }
    if (res.won) { this.busy = true; this.time.delayedCall(900, () => this.advWin()); }
    else if (res.over) { this.busy = true; this.time.delayedCall(res.lines ? 1000 : 550, () => this.outOfMoves()); }
  }
  clearFx(res, pcx, pcy) {
    const lines = res.lines;
    audio.play(`sfx_clear_${Math.min(4, lines)}`, { volume: 0.75 });
    if (res.combo >= 2) audio.play(`sfx_combo_${Math.min(8, res.combo - 1)}`, { volume: 0.6 });
    buzz(Math.min(80, 18 + lines * 14));
    for (const rr of res.rows) this.sweep(W / 2, this.cy(rr), BW, CELL, false, TINT[res.color]);
    for (const cc of res.cols) this.sweep(this.cx(cc), this.BY + BW / 2, CELL, BW, true, TINT[res.color]);
    let gemsGot = 0;
    for (const [y, x, col] of res.cleared) {
      const s = this.cells[y][x]; this.cells[y][x] = null;
      const gs = this.gemS[y][x]; this.gemS[y][x] = null;
      const delay = Math.hypot(this.cx(x) - pcx, this.cy(y) - pcy) * 0.3;
      if (gs) { gemsGot++; this.flyGem(gs, delay); }
      if (!s) continue;
      s.setDepth(12);
      this.tweens.add({ targets: s, scale: s.scaleX * 1.2, duration: 90, delay, ease: 'Quad.easeOut', onStart: () => s.setTint(0xFFFFFF), onComplete: () => {
        this.chips.setTexture(`blk_${col}`); this.chips.emitParticleAt(s.x, s.y, 2);
        this.burst.setParticleTint(TINT[col]); this.burst.emitParticleAt(s.x, s.y, 2);
        this.tweens.add({ targets: s, scale: 0, angle: 90, alpha: 0, duration: 200, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
      } });
    }
    if (gemsGot) M.track('gems', gemsGot);
    const big = lines >= 2 || res.combo >= 3;
    this.cameras.main.shake(big ? 220 : 110, big ? 0.004 + lines * 0.002 : 0.0025);
    if (res.praise) { audio.play(`sfx_praise_${Math.min(3, res.praise)}`, { volume: 0.6 }); const [w, col] = PRAISE[res.praise]; this.bigWord(w, col, 96 + res.praise * 10); }
    if (res.combo >= 2) this.bigWord(`COMBO ${res.combo}`, C.gold, 64 + Math.min(40, res.combo * 4), this.BY + BW * 0.62);
    if (res.allClear) {
      audio.play('sfx_allclear', { volume: 0.8 }); buzz([40, 60, 80]);
      this.time.delayedCall(350, () => { this.bigWord('ALL CLEAR', '#7CFFB2', 120, this.BY + BW / 2); this.cameras.main.flash(300, 255, 255, 255); if (this.mode === 'classic') this.nextTheme(); });
    }
  }
  // 보석이 위쪽 목표 칩으로 날아감
  flyGem(gs, delay) {
    const v = this.goalViews && this.goalViews.find(x => x.g.type === 'gem' && x.g.g === gs.k);
    gs.setDepth(65); this.tweens.killTweensOf(gs);
    if (!v) { this.tweens.add({ targets: gs, alpha: 0, scale: 0, delay, duration: 250, onComplete: () => gs.destroy() }); return; }
    this.tweens.add({ targets: gs, x: v.c.x, y: v.c.y - 18, delay: delay + 80, duration: 520, ease: 'Cubic.easeIn', onComplete: () => {
      gs.destroy(); audio.play('sfx_pick', { volume: 0.4, gap: 30 });
      this.tweens.add({ targets: v.c, scale: 1.12, duration: 80, yoyo: true });
    } });
  }
  sweep(x, y, w, h, vertical, tint) {
    const g = this.add.image(x, y, 'glow').setDepth(14).setBlendMode('ADD').setTint(tint).setAlpha(0.6);
    g.setDisplaySize(vertical ? w * 0.9 : 80, vertical ? 80 : h * 0.9);
    this.tweens.add({ targets: g, displayWidth: vertical ? w * 0.9 : w * 1.05, displayHeight: vertical ? h * 1.05 : h * 0.9, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
  }
  bigWord(str, color, size, y = this.BY + BW * 0.38) {
    const t = T(this, W / 2, y, str, size, color, { w: 900, ls: 2, stroke: '#0B1026', thick: Math.round(size * 0.1) }).setDepth(80).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, delay: 650, duration: 380, onComplete: () => t.destroy() });
  }
  floatText(x, y, str, color, size) {
    const t = T(this, x, y, str, size, color, { w: 900, stroke: '#0B1026', thick: 6 }).setDepth(75);
    this.tweens.add({ targets: t, y: y - 110, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
  updateCombo() {
    const b = this.b, on = b.combo >= 2;
    this.hCombo.setText(on ? `COMBO ×${b.combo}` : '').setAlpha(on ? 1 : 0);
    this.comboDots.forEach((dt, i) => dt.setAlpha(on ? (i < COMBO_KEEP - b.miss ? 1 : 0.2) : 0));
  }

  update() {
    if (this.shown !== this.b.score) {
      this.shown += Math.max(1, Math.ceil((this.b.score - this.shown) * 0.18));
      if (this.shown > this.b.score) this.shown = this.b.score;
      this.hScore.setText(fmt(this.shown));
      if (this.mode === 'classic' && this.b.score > load().best) this.hBest.setText(fmt(this.b.score));
      if (this.mode === 'adv') this.updateGoals();
    }
  }

  goalIntro() {
    const c = this.add.container(W / 2, this.BY + BW / 2).setDepth(90);
    const g = this.add.graphics(); g.fillStyle(0x0B1026, 0.92).fillRoundedRect(-400, -150, 800, 300, 36).lineStyle(2, 0xFFFFFF, 0.12).strokeRoundedRect(-400, -150, 800, 300, 36); c.add(g);
    c.add(T(this, 0, -90, `레벨 ${this.n}`, 56, C.text, { w: 900 }));
    let x = -((this.b.goals.length - 1) * 220) / 2;
    for (const goal of this.b.goals) {
      if (goal.type === 'gem') { c.add(this.add.image(x - 34, 34, `gem_${goal.g}`).setDisplaySize(80, 80)); c.add(T(this, x + 40, 34, `×${goal.count}`, 44, C.text, { w: 900 })); }
      else if (goal.type === 'score') c.add(T(this, x, 34, `${fmt(goal.target)}점`, 48, C.gold, { w: 900 }));
      else c.add(T(this, x, 34, '그림 블록 모두 지우기', 40, C.pink, { w: 900 }));
      x += 220;
    }
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 300, onComplete: () => c.destroy() });
  }
  dragHint() {
    const sl = this.slots.find(s => s.piece && this.b.anyFit(s.piece.t.shape)); if (!sl) return;
    const c = this.add.container(sl.x, sl.y).setDepth(90);
    c.add([this.add.circle(0, 0, 42, 0xFFFFFF, 0.3).setStrokeStyle(5, 0xFFFFFF), T(this, W / 2 - sl.x, -150, '조각을 끌어 판에 놓으세요', 40, C.text, { w: 800 })]);
    this.hint = c;
    this.tweens.add({ targets: c.list[0], x: { from: 0, to: W / 2 - sl.x }, y: { from: 0, to: this.BY + BW / 2 - sl.y }, duration: 1200, repeat: -1, repeatDelay: 300, ease: 'Sine.easeInOut' });
  }
  botStep() {
    if (this.busy || this.paused || this.b.over || this.drag) return;
    const m = choose(this.b, 0.8); if (!m) return;
    this.placeAt(m.i, m.r, m.c, this.slots[m.i].piece);
  }

  // ── 더 놓을 곳이 없을 때: 이어하기(한 판에 한 번) → 끝 ──
  outOfMoves() {
    audio.play('sfx_over', { volume: 0.6 });
    if (this.revived || this.bot) return this.endGame();
    const pop = popup(this, '놓을 곳이 없어요', 820, 640, { closable: false, depth: 2000 });
    pop.content.add(T(this, 0, -110, '가운데 4×4 칸을 비우고 이어서 할까요?', 34, C.sub, { w: 700 }));
    pop.content.add(T(this, 0, -54, '한 판에 한 번', 28, C.dim, { w: 700 }));
    pop.content.add(btn(this, 0, 70, 520, 130, '이어하기', () => { pop.close(); this.revive(); }, { style: 'gold', icon: 'i_retry', size: 42 }));
    pop.content.add(btn(this, 0, 210, 420, 100, this.mode === 'adv' ? '포기하기' : '끝내기', () => { pop.close(); this.endGame(); }, { style: 'ghost', size: 34 }));
  }
  revive() {
    this.revived = true; this.b.revive();
    for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) {
      const s = this.cells[r][c]; if (s) { this.cells[r][c] = null; this.tweens.add({ targets: s, scale: 0, alpha: 0, duration: 260, delay: (r + c) * 30, onComplete: () => s.destroy() }); }
      const gs = this.gemS[r][c]; if (gs) { this.gemS[r][c] = null; gs.destroy(); }
    }
    audio.play('sfx_allclear', { volume: 0.6 });
    this.fillTray(true); this.updateGoals();
    this.time.delayedCall(400, () => { this.busy = false; });
  }
  endGame() {
    if (this.mode === 'adv') return this.advFail();
    let i = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const s = this.cells[r][c]; if (s) this.time.delayedCall(i++ * 12, () => s.setTint(0x555A78)); }
    this.time.delayedCall(900, () => this.finishClassic());
  }
  finishClassic() {
    const b = this.b, d = load(), prev = d.best;
    d.plays++; d.lines += b.lines; d.bestCombo = Math.max(d.bestCombo, b.bestCombo);
    if (b.score > d.best) d.best = b.score;
    if (d.todayBest.date !== M.dayKey()) d.todayBest = { date: M.dayKey(), score: 0 };
    d.todayBest.score = Math.max(d.todayBest.score, b.score);
    save();
    M.track('games'); M.track('score', b.score); M.noteClassic(b.score, b.moves);
    this.leave('Result', { score: b.score, best: d.best, newBest: b.score > prev && b.score > 0, lines: b.lines, combo: b.bestCombo, moves: b.moves });
  }
  advWin() {
    audio.play('sfx_best', { volume: 0.8 }); buzz([30, 40, 60]);
    this.bigWord('LEVEL CLEAR', '#7CFFB2', 110, this.BY + BW / 2);
    const d = load(); d.plays++; d.lines += this.b.lines; save();
    M.advWin(); M.track('adv'); M.track('games');
    this.time.delayedCall(1300, () => this.leave('Adventure', { justWon: true }));
  }
  advFail() {
    M.advLose(); M.track('games');
    const pop = popup(this, `레벨 ${this.n} 실패`, 820, 600, { closable: false, depth: 2000 });
    const left = this.b.goals.map(g => g.type === 'score' ? `${fmt(Math.max(0, g.target - this.b.score))}점` : `${Math.max(0, g.count - g.have)}개`).join(' · ');
    pop.content.add(T(this, 0, -90, `남은 목표 ${left}`, 34, C.sub, { w: 700 }));
    pop.content.add(btn(this, 0, 40, 520, 130, '다시 하기', () => { pop.close(); this.scene.restart({ mode: 'adv', n: this.n }); }, { style: 'gold', icon: 'i_retry', size: 42 }));
    pop.content.add(btn(this, 0, 180, 420, 100, '그림으로', () => { pop.close(); this.leave('Adventure', {}); }, { style: 'ghost', size: 34 }));
  }
  leave(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(300, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }

  pause() {
    if (this.paused || this.b.over) return;
    this.paused = true;
    this.frozen = this.tweens.getTweens().filter(t => t.isPlaying()); this.frozen.forEach(t => t.pause());
    audio.duck(0.1);
    const pop = popup(this, '일시정지', 760, 700, { closable: false, depth: 2000 });
    const resume = () => { pop.close(); this.time.delayedCall(160, () => { this.paused = false; (this.frozen || []).forEach(t => t.resume()); this.frozen = null; audio.duck(0.34); }); };
    pop.content.add(btn(this, 0, -120, 500, 130, '계속하기', resume, { style: 'gold', icon: 'i_play', size: 42 }));
    pop.content.add(btn(this, 0, 30, 420, 100, '홈으로', () => { pop.close(); this.paused = false; this.leave('Home'); }, { style: 'ghost', icon: 'i_home', size: 34 }));
    const d = load();
    const sI = iconBtn(this, -90, 190, d.sfx ? 'i_sound' : 'i_sound_off', () => { audio.toggleSfx(); sI.icon.setTexture(load().sfx ? 'i_sound' : 'i_sound_off'); }, 110);
    const mI = iconBtn(this, 90, 190, d.music ? 'i_music' : 'i_music_off', () => { audio.toggleMusic(); mI.icon.setTexture(load().music ? 'i_music' : 'i_music_off'); if (load().music) audio.duck(0.1); }, 110);
    pop.content.add([sI, mI]);
  }
}
