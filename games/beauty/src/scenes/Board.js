// 작업대 (원작의 주방 보드): 7×9 머지-2 · 생산기 · 잠긴 상자 · 비눗방울 · 창고 · 주문 3장 · 팔기
import { W, H } from '../config.js?v=0.28.0';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.28.0';
import { audio } from '../audio.js?v=0.28.0';
import { load, save } from '../save.js?v=0.28.0';
import { goPrev } from '../nav.js?v=0.28.0';
import { hud } from '../hud.js?v=0.28.0';
import { CHAINS, GENS, MAX_LV, itemKey, itemName, genImg, ENERGY, STORAGE } from '../data.js?v=0.28.0';
import { spendEnergy, tickEnergy, addXp, unlockedChains, storageSize, makeOrder, fillOrders, addGoal } from '../state.js?v=0.28.0';
import { adsOpen, rewardAd } from '../store.js?v=0.28.0';

const COLS = 7, ROWS = 9, CS = 142, X0 = (1080 - COLS * CS) / 2, Y0 = 440;
const idx = (c, r) => r * COLS + c, colOf = i => i % COLS, rowOf = i => Math.floor(i / COLS);
const cx = i => X0 + colOf(i) * CS + CS / 2, cy = i => Y0 + rowOf(i) * CS + CS / 2;

// 처음 작업대: 생산기 3 · 재료 몇 개 · 위쪽 두 줄과 가장자리는 잠긴 상자
export function newBoard() {
  const b = Array(COLS * ROWS).fill(null), rnd = () => ({ c: ['camellia', 'rice'][Math.floor(Math.random() * 2)], l: 1 + Math.floor(Math.random() * 3) });
  for (let i = 0; i < 14; i++) b[i] = { t: 'x', in: rnd() };
  for (const i of [idx(0, 2), idx(6, 2), idx(0, 8), idx(6, 8), idx(0, 5), idx(6, 5)]) b[i] = { t: 'x', in: rnd() };
  b[idx(1, 4)] = { t: 'g', g: 'camellia', l: 1, ch: GENS.camellia.charges[1] };
  b[idx(5, 4)] = { t: 'g', g: 'rice', l: 1, ch: GENS.rice.charges[1] };
  b[idx(3, 7)] = { t: 'g', g: 'dew', l: 1, ch: GENS.dew.charges[1] };
  b[idx(2, 5)] = { t: 'i', c: 'camellia', l: 1 }; b[idx(4, 5)] = { t: 'i', c: 'rice', l: 1 };
  return b;
}

export class BoardScene extends Phaser.Scene {
  constructor() { super('Board'); }
  create() {
    const d = load(); if (!d.board) { d.board = newBoard(); save(); }
    this.d = d; this.drag = null; this.sel = -1; this.sprites = []; this.busy = false;
    this.ensureGens(); this.placeGifts(); fillOrders();
    // 배경: 매장 방 그림을 흐리게 + 나무 작업대
    const bg = this.add.image(W / 2, H / 2, 'room'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setAlpha(0.55);
    this.add.rectangle(W / 2, H / 2, W, H, 0xFFF4EC, 0.35);
    const g = this.add.graphics(); g.fillStyle(0x8A5A44, 0.25).fillRoundedRect(X0 - 16, Y0 - 12, COLS * CS + 32, ROWS * CS + 28, 34).fillStyle(0xF6E2C8, 1).fillRoundedRect(X0 - 12, Y0 - 12, COLS * CS + 24, ROWS * CS + 24, 30);
    for (let i = 0; i < COLS * ROWS; i++) g.fillStyle((colOf(i) + rowOf(i)) % 2 ? 0xF9EBD8 : 0xFFF5E8, 1).fillRoundedRect(cx(i) - CS / 2 + 4, cy(i) - CS / 2 + 4, CS - 8, CS - 8, 18);
    this.layer = this.add.container(0, 0);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    // 주문 카드 자리
    this.orderL = this.add.container(0, 0).setDepth(10);
    // 아래: 설명 · 팔기 · 창고 · 매장
    const by = Math.max(Y0 + ROWS * CS + 26, H - 200);
    const bb = this.add.graphics(); bb.fillStyle(0xFFFFFF, 0.92).fillRoundedRect(30, by, W - 60, 170, 30).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(30, by, W - 60, 170, 30);
    this.infoT = T(this, 70, by + 56, '', 30, C.ink, { ox: 0, w: 900 }); this.infoS = T(this, 70, by + 112, '', 24, C.dim, { ox: 0, w: 700 });
    this.sellB = btn(this, 640, by + 85, 170, 90, '팔기', () => this.sell(), { style: 'cream', size: 26 }).setVisible(false);
    this.storeB = this.add.container(820, by + 85); const sg = this.add.graphics(); sg.fillStyle(0xFCE4EC, 1).fillRoundedRect(-70, -60, 140, 120, 26); const si = T(this, 0, -12, '🗄', 50, '#000', { w: 900 }); this.storeN = T(this, 0, 38, '', 22, C.brown, { w: 900 }); this.storeB.add([sg, si, this.storeN]);
    this.storeB.setSize(140, 120).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.drag) this.openStorage(); });
    this.homeB = this.add.container(980, by + 85); const hg = this.add.graphics(); hg.fillStyle(0xE86A8E, 1).fillRoundedRect(-70, -60, 140, 120, 26); this.homeB.add([hg, T(this, 0, -14, '🏠', 50, '#000', { w: 900 }), T(this, 0, 36, '매장', 22, '#FFFFFF', { w: 900 })]);
    this.homeB.setSize(140, 120).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Home'));
    this.storeY = by + 85; this.redraw(); this.drawOrders(); this.info(-1);
    // 입력: 칸 위에서 누르기 · 끌기 · 놓기
    this.input.on('pointerdown', p => this.down(p)); this.input.on('pointermove', p => this.move(p)); this.input.on('pointerup', p => this.up(p)); this.input.on('pointerupoutside', p => this.up(p));
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    audio.music('bgm_board'); this.idleAt = Date.now(); this.hintTw = null;
    this.cameras.main.fadeIn(250, 255, 244, 236); window.__board = this;
    if (d.tut < 3) this.time.delayedCall(400, () => this.tutorial());
  }
  // ── 그리기
  redraw() {
    this.dragSp?.destroy(); this.dragSp = null; this.clearTargets(); this.hintTw = null;   // 끌던 그림은 작업대 밖으로 꺼내 두었으므로 따로 지움
    this.layer.removeAll(true); this.sprites = []; const now = Date.now();
    this.d.board.forEach((cell, i) => {
      if (!cell) return; const x = cx(i), y = cy(i), ct = this.add.container(x, y);
      if (cell.t === 'x') { const im = this.add.image(0, 0, 'box'); im.setScale((CS - 20) / Math.max(im.width, im.height)); const peek = this.add.image(0, -6, itemKey(cell.in.c, cell.in.l)); peek.setScale(70 / Math.max(peek.width, peek.height)).setAlpha(0.35); ct.add([im, peek]); }
      else {
        const key = cell.t === 'g' ? genImg(cell.g, cell.l) : itemKey(cell.c, cell.l), im = this.add.image(0, 0, key); im.setScale((CS - 22) / Math.max(im.width, im.height)); ct.add(im);
        if (cell.t === 'g') { const unl = !!GENS[cell.g].cost, ready = unl || cell.g === 'gift' || cell.ch > 0; const lbl = cell.g === 'gift' ? `${cell.u}` : unl ? '⚡' : cell.ch > 0 ? `${cell.ch}` : '⏳'; const bgc = this.add.circle(44, 44, 20, ready ? (unl ? 0xF0B65A : 0x7CC6A8) : 0xC9AFA0).setStrokeStyle(3, 0xFFFFFF); ct.add([bgc, T(this, 44, 43, lbl, 20, '#FFFFFF', { w: 900 })]); if (ready) this.tweens.add({ targets: im, scale: im.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
        if (cell.b) { const bu = this.add.image(0, 0, 'bubble'); bu.setScale((CS - 6) / bu.width).setAlpha(0.75); ct.add(bu); const left = Math.max(0, Math.ceil((cell.b - now) / 1000)); ct.add(T(this, 0, 50, `${left}초`, 20, C.brown, { w: 900 })); }
        if (cell.t === 'i' && cell.l === MAX_LV) ct.add(this.add.image(46, -46, 'spark').setTint(0xFFD45A).setScale(0.45));
      }
      if (i === this.sel) ct.addAt(this.add.rectangle(0, 0, CS - 8, CS - 8).setStrokeStyle(6, 0xE86A8E), 0);
      this.layer.add(ct); this.sprites[i] = ct;
    });
    this.storeN.setText(`${this.d.store.filter(Boolean).length}/${storageSize()}`);
    this.markOrders();
  }
  cellAt(x, y) { const c = Math.floor((x - X0) / CS), r = Math.floor((y - Y0) / CS); return c < 0 || r < 0 || c >= COLS || r >= ROWS ? -1 : idx(c, r); }
  // ── 입력
  down(p) {
    this.idleAt = Date.now(); this.stopHint();
    if (this.busy) return; const i = this.cellAt(p.x, p.y); if (i < 0) return; const cell = this.d.board[i]; if (!cell || cell.t === 'x' || cell.b) { this.press = { i, x: p.x, y: p.y }; return; }
    this.press = { i, x: p.x, y: p.y }; this.drag = { i, moved: false };
  }
  move(p) {
    const g = this.drag; if (!g || !p.isDown) return;
    if (!g.moved && Math.hypot(p.x - this.press.x, p.y - this.press.y) > 16) { g.moved = true; const sp = this.sprites[g.i]; if (sp) { this.layer.remove(sp); this.add.existing(sp); sp.setDepth(30).setScale(1.12); this.dragSp = sp; audio.play('sfx_pick', { volume: 0.5 }); audio.buzz(8); this.showTargets(g.i); } }
    if (g.moved) { const sp = this.sprites[g.i]; if (sp) sp.setPosition(p.x, p.y - 30); }
  }
  up(p) {
    const pr = this.press; this.press = null; const g = this.drag; this.drag = null; if (!pr) return;
    if (!g || !g.moved) return this.tap(pr.i);
    const from = g.i, to = this.cellAt(p.x, p.y - 30);
    // 창고에 넣기
    if (Math.hypot(p.x - this.storeB.x, p.y - this.storeY) < 90) return this.toStorage(from);
    if (to < 0 || to === from) return this.redraw();
    const a = this.d.board[from], b = this.d.board[to];
    if (!b) { this.d.board[to] = a; this.d.board[from] = null; this.sel = to; save(); audio.play('sfx_drop', { volume: 0.5 }); this.redraw(); return this.info(to); }
    if (this.canMerge(a, b)) return this.merge(from, to);
    if (b.t === 'x' || b.b) { audio.play('sfx_drop', { volume: 0.4 }); return this.redraw(); }
    this.d.board[to] = a; this.d.board[from] = b; this.sel = to; save(); audio.play('sfx_drop', { volume: 0.5 }); this.redraw(); this.info(to);
  }
  canMerge(a, b) { if (!a || !b || a.b || b.b) return false; if (a.t === 'i' && b.t === 'i') return a.c === b.c && a.l === b.l && a.l < MAX_LV; if (a.t === 'g' && b.t === 'g') return a.g === b.g && a.l === b.l && a.l < 2 && GENS[a.g].charges[2] !== undefined && !GENS[a.g].free && !GENS[a.g].temp; return false; }
  merge(from, to) {
    const a = this.d.board[from], nb = a.t === 'i' ? { t: 'i', c: a.c, l: a.l + 1 } : { t: 'g', g: a.g, l: 2, ch: GENS[a.g].charges[2] };
    this.d.board[to] = nb; this.d.board[from] = null; this.sel = to; this.d.stats.merges++; addGoal('merges'); if (nb.t === 'i' && nb.l === 5) addGoal('lv5');
    // 옆 칸 잠긴 상자 열기
    let opened = []; for (const n of this.neighbors(to)) { const c = this.d.board[n]; if (c && c.t === 'x') { this.d.board[n] = { t: 'i', ...c.in }; opened.push(n); } }
    // 원작의 비눗방울: 3단계 이상 합치면 가끔 같은 물건이 비눗방울에 갇혀 나옴 (60초 안에 보석으로 가지기)
    if (nb.t === 'i' && nb.l >= 3 && nb.l < MAX_LV && Math.random() < 0.06) { const e = this.nearestEmpty(to); if (e >= 0) this.d.board[e] = { t: 'i', c: nb.c, l: nb.l, b: Date.now() + 60000 }; }
    save(); this.redraw();
    // 합치기 소리: 단계가 오를수록 음이 높아짐 · 5단계 이상은 반짝이는 큰 소리 + 빛 원
    const big = nb.t === 'g' || nb.l >= 5;
    audio.play(big ? 'sfx_merge_big' : 'sfx_merge', { volume: big ? 0.6 : 0.55, rate: big ? 1 : 0.92 + nb.l * 0.05 }); audio.buzz(big ? [12, 30, 18] : 12);
    this.fx(to, nb.l >= 5 ? 0xFFE27A : 0xFFFFFF, big ? 14 : 8); if (big) this.ring(to);
    const sp = this.sprites[to]; if (sp) { sp.setScale(0.55); this.tweens.add({ targets: sp, scale: 1, duration: 320, ease: 'Back.easeOut', easeParams: [3] }); }
    if (nb.t === 'i' && nb.l === MAX_LV) this.floatText(to, '최고 단계 완성!', C.gold); else if (nb.t === 'g') this.floatText(to, '생산기 업그레이드!', C.rose);
    if (opened.length) { this.time.delayedCall(140, () => audio.play('sfx_box', { volume: 0.55 })); opened.forEach(n => { this.fx(n, 0xFFE9A0); const s2 = this.sprites[n]; if (s2) { s2.setScale(0.4); this.tweens.add({ targets: s2, scale: 1, duration: 360, delay: 120, ease: 'Back.easeOut' }); } }); }
    this.info(to); if (this.d.tut === 1) this.tutorial();
  }
  shake(i) { const s = this.sprites[i]; if (s) this.tweens.add({ targets: s, x: cx(i) + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => s.setX(cx(i)) }); }
  neighbors(i) { const c = colOf(i), r = rowOf(i), out = []; if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1); if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS); return out; }
  nearestEmpty(i) { let best = -1, bd = 1e9; this.d.board.forEach((c, j) => { if (c) return; const dd = Math.abs(colOf(j) - colOf(i)) + Math.abs(rowOf(j) - rowOf(i)) * 1.01; if (dd < bd) { bd = dd; best = j; } }); return best; }
  ring(i) { const r = this.add.circle(cx(i), cy(i), 30).setStrokeStyle(8, 0xFFE27A).setDepth(39); this.tweens.add({ targets: r, scale: 3, alpha: 0, duration: 480, ease: 'Cubic.easeOut', onComplete: () => r.destroy() }); }
  floatText(i, s, col) { const t = T(this, cx(i), cy(i) - 70, s, 32, col, { w: 900, shadow: true }).setDepth(45); this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1100, delay: 300, onComplete: () => t.destroy() }); }
  // 끄는 동안 합칠 수 있는 칸을 빛나게 (원작처럼 어디 놓을지 바로 보임)
  showTargets(from) { this.clearTargets(); const a = this.d.board[from]; this.tg = [];
    this.d.board.forEach((c, j) => { if (j !== from && this.canMerge(a, c)) { const r = this.add.rectangle(cx(j), cy(j), CS - 10, CS - 10, 0xFFE27A, 0.28).setStrokeStyle(5, 0xF0B65A).setDepth(5); this.tweens.add({ targets: r, alpha: 0.5, duration: 400, yoyo: true, repeat: -1 }); this.tg.push(r); } }); }
  clearTargets() { (this.tg || []).forEach(r => r.destroy()); this.tg = []; }
  // 8초 동안 아무것도 안 하면 합칠 수 있는 두 물건을 살짝 흔들어 알려 줌
  idleHint() {
    if (this.hintTw || this.busy || this.d.tut < 3 || Date.now() - this.idleAt < 8000) return;
    const bd = this.d.board; for (let i = 0; i < bd.length; i++) { const a = bd[i]; if (!a || a.t !== 'i' || a.b) continue; for (let j = i + 1; j < bd.length; j++) if (this.canMerge(a, bd[j])) {
      const ts = [this.sprites[i], this.sprites[j]].filter(Boolean); this.hintTw = this.tweens.add({ targets: ts, angle: { from: -7, to: 7 }, duration: 110, yoyo: true, repeat: 3, repeatDelay: 0, onComplete: () => { ts.forEach(t => t.setAngle(0)); this.hintTw = null; this.idleAt = Date.now() - 4000; } }); return; } }
  }
  stopHint() { if (this.hintTw) { this.hintTw.stop(); this.hintTw = null; this.sprites.forEach(t => t && t.setAngle(0)); } }
  fx(i, tint, n = 8) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, s = this.add.image(cx(i), cy(i), 'spark').setTint(tint).setScale(0.4).setDepth(40); const dist = 70 + (k % 2) * 30; this.tweens.add({ targets: s, x: cx(i) + Math.cos(a) * dist, y: cy(i) + Math.sin(a) * dist, alpha: 0, scale: 0.1, angle: 180, duration: 460, ease: 'Cubic.easeOut', onComplete: () => s.destroy() }); } }
  // ── 누르기
  tap(i) {
    const cell = this.d.board[i]; this.sel = cell ? i : -1;
    if (!cell) { this.redraw(); return this.info(-1); }
    if (cell.t === 'x') { toast(this, '옆에서 합치면 상자가 열려요', cy(i) - 120); return; }
    if (cell.b) return this.popBubble(i);
    if (cell.t === 'g') return this.produce(i);
    audio.play('sfx_tap', { volume: 0.5 }); this.redraw(); this.info(i);
  }
  produce(i) {
    const cell = this.d.board[i], G = GENS[cell.g];
    if (!G.cost && cell.g !== 'gift' && cell.ch <= 0) { this.info(i); audio.play('sfx_error', { volume: 0.4 }); this.shake(i); return toast(this, '충전 중이에요 · 다른 생산기를 써 볼까요?', cy(i) - 120); }
    const e = this.nearestEmpty(i); if (e < 0) { audio.play('sfx_error', { volume: 0.5 }); this.shake(i); return toast(this, '작업대가 꽉 찼어요 · 합치거나 창고에 넣어요', cy(i) - 120); }
    if (!G.free && !G.temp && !spendEnergy(G.cost)) return this.noEnergy();
    let it;
    if (cell.g === 'dew') { const ch = unlockedChains(); it = { c: ch[Math.floor(Math.random() * ch.length)], l: Math.random() < 0.7 ? 1 : 2 }; }
    else if (cell.g === 'gift') { const ch = unlockedChains(); it = { c: ch[Math.floor(Math.random() * ch.length)], l: Math.random() < 0.6 ? 2 : 3 }; }
    else { const dr = G.drops[cell.l]; let r = Math.random(), l = 1; for (let k = 0; k < dr.length; k++) { if (r < dr[k]) { l = k + 1; break; } r -= dr[k]; } if (G.rare && Math.random() < G.rare) l = Math.min(l + 1, 3); it = { c: G.chain, l }; }
    this.d.board[e] = { t: 'i', ...it };
    if (cell.g === 'gift') { cell.u--; if (cell.u <= 0) this.d.board[i] = null; } else if (!G.cost) { cell.ch--; if (cell.ch <= 0) cell.at = Date.now(); }
    save(); audio.play('sfx_gen', { volume: 0.55, rate: 0.95 + Math.random() * 0.12 }); audio.buzz(6);
    this.redraw(); this.hud.update();
    const sp = this.sprites[e]; if (sp) { sp.setPosition(cx(i), cy(i)).setScale(0.3); this.tweens.add({ targets: sp, x: cx(e), y: cy(e), scale: 1, duration: 300, ease: 'Back.easeOut' }); this.tweens.add({ targets: sp, y: { from: cy(i), to: Math.min(cy(i), cy(e)) - 50 }, duration: 150, yoyo: true, ease: 'Sine.easeOut' }); }
    const gs = this.sprites[i]; if (gs) this.tweens.add({ targets: gs, scaleX: 1.12, scaleY: 0.9, duration: 70, yoyo: true });
    this.info(i); if (this.d.tut === 0 && this.d.board.filter(c => c && c.t === 'i' && c.c === 'camellia' && c.l === 1).length >= 2) { this.d.tut = 1; save(); this.tutorial(); }
  }
  tick() {
    const now = Date.now(); let ch = false;
    this.d.board.forEach((c, i) => {
      if (!c) return;
      if (c.t === 'g' && c.g !== 'gift' && c.ch <= 0 && c.at && now - c.at >= GENS[c.g].recharge * 1000) { c.ch = GENS[c.g].charges[c.l]; c.at = 0; ch = true; }
      if (c.b && now > c.b) { this.d.board[i] = null; ch = true; }
      if (c.b) ch = true;
    });
    if (this.d.orders.some(o => o.at && o.at <= now && !o.shown)) ch = true;
    if (ch && !this.drag) { save(); this.redraw(); this.drawOrders(); }
    if (!this.drag) this.idleHint();
  }
  ensureGens() { const has = g => this.d.board.some(c => c && c.t === 'g' && c.g === g); for (const g of unlockedChains()) if (!has(g)) { const e = this.nearestEmpty(idx(3, 4)); if (e >= 0) this.d.board[e] = { t: 'g', g, l: 1, ch: GENS[g].charges[1] }; } save(); }
  placeGifts() { while ((this.d.pendingGifts || 0) > 0) { const e = this.nearestEmpty(idx(3, 6)); if (e < 0) break; this.d.board[e] = { t: 'g', g: 'gift', l: 1, u: GENS.gift.uses }; this.d.pendingGifts--; } save(); }
  // ── 설명 줄 · 팔기
  info(i) {
    const c = i >= 0 ? this.d.board[i] : null; this.sellB.setVisible(false);
    if (!c) { this.infoT.setText('같은 물건 두 개를 끌어다 겹치면 합쳐져요'); this.infoS.setText('생산기를 누르면 재료가 나와요 · 에너지 1'); return; }
    if (c.t === 'g') { const G = GENS[c.g]; this.infoT.setText(`${G.n}${c.g === 'gift' || c.g === 'dew' ? '' : ` ${c.l}단계`}`); this.infoS.setText(c.g === 'gift' ? `남은 횟수 ${c.u} · 무료로 2~3단계 재료` : c.g === 'dew' ? `무료 · 남은 ${c.ch}번 · 다 쓰면 ${G.recharge / 60}분 뒤 충전` : `누르면 ${CHAINS[G.chain].n} 재료 · 에너지 ${G.cost}${c.l < 2 ? ' · 같은 생산기끼리 합치면 업그레이드' : ''}`); return; }
    if (c.t === 'i') { this.infoT.setText(`${itemName(c.c, c.l)} · ${c.l}단계`); this.infoS.setText(c.l < MAX_LV ? `다음: ${itemName(c.c, c.l + 1)}` : '최고 단계 완성품!'); this.sellB.setVisible(!c.b); this.sellB.setLabel(`팔기 ●${c.l}`); }
  }
  sell() { const c = this.d.board[this.sel]; if (!c || c.t !== 'i' || c.b) return; const at = this.sel; this.d.coins += c.l; this.d.board[this.sel] = null; this.sel = -1; save(); audio.play('sfx_coin', { volume: 0.6 }); this.flyCoins(cx(at), cy(at), c.l, true); this.redraw(); this.hud.update(); this.info(-1); }
  // ── 비눗방울
  popBubble(i) {
    const c = this.d.board[i]; audio.play('sfx_bubble', { volume: 0.5 }); const p = popup(this, 760, 640); const cost = 3 + c.l * 2;
    p.content.add(T(this, 0, -230, '비눗방울에 갇힌 선물', 40, C.ink, { w: 900 }));
    const im = this.add.image(0, -70, itemKey(c.c, c.l)); im.setScale(180 / Math.max(im.width, im.height)); p.content.add(im);
    p.content.add(T(this, 0, 60, `${itemName(c.c, c.l)} · 시간이 지나면 사라져요`, 26, C.dim, { w: 800 }));
    p.content.add(btn(this, adsOpen() ? -170 : 0, 190, 320, 110, `◆ ${cost} 로 갖기`, () => { if (this.d.gems < cost) return toast(this, '보석이 부족해요'); this.d.gems -= cost; delete c.b; save(); p.close(); audio.play('sfx_bubble', { volume: 0.7, rate: 1.15 }); this.redraw(); this.hud.update(); this.fx(i, 0xFFD6E4); }, { size: 30 }));
    if (adsOpen()) p.content.add(btn(this, 170, 190, 300, 110, '광고 보고 갖기', async () => { try { await rewardAd('bubble'); delete c.b; save(); p.close(); this.redraw(); } catch { toast(this, '지금은 광고를 볼 수 없어요'); } }, { style: 'cream', size: 28 }));
  }
  // ── 에너지 부족
  noEnergy() {
    audio.play('sfx_error', { volume: 0.5 }); const p = popup(this, 800, 640);
    p.content.add(T(this, 0, -220, '에너지가 부족해요', 42, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -150, '시간이 지나면 다시 차요 · 레벨이 오르면 가득 차요', 24, C.dim, { w: 800 }));
    const pk = ENERGY.gemPack;
    p.content.add(btn(this, 0, -10, 520, 110, `◆ ${pk.gems} 로 ⚡${pk.amount} 충전`, () => { if (this.d.gems < pk.gems) return toast(this, '보석이 부족해요'); this.d.gems -= pk.gems; this.d.energy += pk.amount; save(); this.hud.update(); p.close(); }, { size: 30 }));
    if (adsOpen()) p.content.add(btn(this, 0, 120, 520, 100, '광고 보고 ⚡20', async () => { try { await rewardAd('energy'); this.d.energy += 20; save(); this.hud.update(); p.close(); } catch { toast(this, '지금은 광고를 볼 수 없어요'); } }, { style: 'cream', size: 28 }));
    p.content.add(btn(this, 0, adsOpen() ? 240 : 140, 360, 96, '기다릴게요', () => p.close(), { style: 'cream', size: 28 }));
  }
  // ── 창고 (원작의 인벤토리)
  toStorage(from) {
    const c = this.d.board[from], n = storageSize(); if (!c || c.t !== 'i' || c.b) return this.redraw();
    const slot = this.d.store.slice(0, n).findIndex(s => !s); if (slot < 0) { toast(this, '창고가 꽉 찼어요', this.storeY - 140); return this.redraw(); }
    while (this.d.store.length < n) this.d.store.push(null);
    this.d.store[slot] = { c: c.c, l: c.l }; this.d.board[from] = null; this.sel = -1; save(); audio.play('sfx_drop', { volume: 0.55, rate: 0.9 }); this.redraw(); this.info(-1); this.tweens.add({ targets: this.storeB, scale: 1.15, duration: 90, yoyo: true });
  }
  openStorage() {
    const n = storageSize(); while (this.d.store.length < n) this.d.store.push(null);
    const rows = Math.ceil((n + 1) / 4), p = popup(this, 900, 360 + rows * 190);
    p.content.add(T(this, 0, -(150 + rows * 95) + 60, '화장대 서랍 (창고)', 40, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -(150 + rows * 95) + 112, '물건을 서랍 버튼으로 끌어 넣고, 눌러서 꺼내요', 22, C.dim, { w: 800 }));
    const y0 = -(150 + rows * 95) + 240;
    for (let k = 0; k <= n; k++) {
      const x = -300 + (k % 4) * 200, y = y0 + Math.floor(k / 4) * 190, cc = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(k < n ? 0xFFF4EC : 0xF3E3DC, 1).fillRoundedRect(-85, -85, 170, 170, 26).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(-85, -85, 170, 170, 26); cc.add(g);
      if (k < n) { const it = this.d.store[k]; if (it) { const im = this.add.image(0, 0, itemKey(it.c, it.l)); im.setScale(130 / Math.max(im.width, im.height)); cc.add(im); }
        cc.setSize(170, 170).setInteractive({ useHandCursor: true }).on('pointerup', () => { const it2 = this.d.store[k]; if (!it2) return; const e = this.nearestEmpty(idx(3, 4)); if (e < 0) return toast(this, '작업대에 빈 칸이 없어요'); this.d.board[e] = { t: 'i', ...it2 }; this.d.store[k] = null; save(); p.close(); this.redraw(); this.fx(e, 0xFFFFFF); }); }
      else if (n < STORAGE.max) { const cost = STORAGE.cost(this.d.storeExtra || 0); cc.add(T(this, 0, -10, '+', 60, C.rose, { w: 900 })); cc.add(T(this, 0, 50, `◆${cost}`, 24, '#C2408A', { w: 900 }));
        cc.setSize(170, 170).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.d.gems < cost) return toast(this, '보석이 부족해요'); this.d.gems -= cost; this.d.storeExtra = (this.d.storeExtra || 0) + 1; save(); p.close(); this.hud.update(); this.redraw(); this.openStorage(); }); }
      p.content.add(cc);
    }
  }
  // ── 주문
  drawOrders() {
    this.orderL.removeAll(true); fillOrders(); const now = Date.now();
    this.d.orders.forEach((o, k) => {
      const x = 30 + k * 345, y = 146, c = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.96).fillRoundedRect(0, 0, 330, 278, 28).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(0, 0, 330, 278, 28); c.add(g);
      if (o.at > now) { o.shown = false; c.add(T(this, 165, 120, '손님 오는 중…', 26, C.dim, { w: 800 })); c.add(T(this, 165, 168, `${Math.ceil((o.at - now) / 1000)}초`, 24, C.sub, { w: 800 })); this.orderL.add(c); return; }
      o.shown = true;
      const f = this.add.image(62, 70, o.face); f.setScale(104 / f.width); c.add([this.add.circle(62, 70, 54, 0xFCE4EC), f]);
      c.add(T(this, 128, 40, o.who, 20, C.brown, { ox: 0, w: 800 })); c.add(T(this, 128, 82, `"${o.say}"`, 17, C.dim, { ox: 0, w: 700, wrap: 190, align: 'left' }));
      o.items.forEach((it, j) => { const ix = o.items.length === 1 ? 165 : 100 + j * 130, im = this.add.image(ix, 176, itemKey(it.c, it.l)); im.setScale(96 / Math.max(im.width, im.height)); c.add(im); it.ok = this.has(it); c.add(this.add.circle(ix + 40, 206, 18, it.ok ? 0x5FA65A : 0xD9C2CC).setStrokeStyle(3, 0xFFFFFF)); c.add(T(this, ix + 40, 205, it.ok ? '✓' : '', 20, '#FFFFFF', { w: 900 })); });
      const all = o.items.every(it => this.has(it)), bt = btn(this, 165, 250, 260, 64, all ? `완료 ●${o.coins}` : `●${o.coins} · ★${o.xp}`, () => all && this.complete(k), { style: all ? 'green' : 'cream', size: 24 });
      if (all) this.tweens.add({ targets: bt, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
      c.add(bt); this.orderL.add(c);
    });
  }
  has(it, used = []) { return this.d.board.findIndex((c, i) => c && c.t === 'i' && !c.b && c.c === it.c && c.l === it.l && !used.includes(i)) >= 0; }
  markOrders() { if (this.orderL) this.drawOrders(); }
  complete(k) {
    const o = this.d.orders[k]; const used = [];
    for (const it of o.items) { const i = this.d.board.findIndex((c, j) => c && c.t === 'i' && !c.b && c.c === it.c && c.l === it.l && !used.includes(j)); if (i < 0) return; used.push(i); }
    const ox = 30 + k * 345 + 165, oy = 146 + 170;
    used.forEach(i => { const cell = this.d.board[i], im = this.add.image(cx(i), cy(i), itemKey(cell.c, cell.l)).setDepth(55); im.setScale((CS - 22) / Math.max(im.width, im.height)); this.tweens.add({ targets: im, x: ox, y: oy, scale: im.scale * 0.6, duration: 380, ease: 'Cubic.easeIn', onComplete: () => { im.destroy(); } }); this.fx(i, 0xFFD6E4); this.d.board[i] = null; });
    this.d.coins += o.coins; this.d.stats.orders++; addGoal('orders');
    this.d.orders[k] = { ...makeOrder(false, this.d.board), at: Date.now() + 6000 }; save();
    audio.play('sfx_order', { volume: 0.7 }); audio.buzz([20, 40, 20]);
    const ups = addXp(o.xp); this.time.delayedCall(300, () => this.flyCoins(ox, 400, o.coins));
    this.redraw(); this.hud.update();
    if (ups.length) this.time.delayedCall(600, () => this.levelUp(ups[ups.length - 1]));
    if (this.d.tut === 2) { this.d.tut = 3; save(); this.tutorial(); }
  }
  // 코인이 흩어졌다가 위 막대로 날아가고, 닿을 때마다 짤랑 (원작의 보상 연출)
  flyCoins(x, y, n, small) { const t = this.hud.coinAt, m = small ? 2 : Math.min(9, 3 + Math.floor(n / 8));
    for (let k = 0; k < m; k++) { const s = this.add.image(x, y, 'coin').setDepth(60); s.setScale(46 / s.width); const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 50;
      this.tweens.chain({ targets: s, tweens: [{ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, duration: 220, ease: 'Cubic.easeOut' }, { x: t.x, y: t.y, scale: s.scale * 0.8, duration: 420 + k * 50, ease: 'Cubic.easeIn', onComplete: () => { s.destroy(); if (k % 2 === 0) audio.play('sfx_coin', { volume: 0.35, rate: 1 + k * 0.03, gap: 30 }); if (k === m - 1) this.hud.update(); } }] }); }
    const tx = T(this, x, y - 40, `+${n}`, small ? 30 : 40, C.gold, { w: 900, shadow: true }).setDepth(60); this.tweens.add({ targets: tx, y: tx.y - 60, alpha: 0, duration: 900, delay: 400, onComplete: () => tx.destroy() }); }
  levelUp(u) {
    audio.play('sfx_levelup', { volume: 0.75 }); audio.duck(2600); audio.buzz([30, 50, 30, 50, 60]); this.cameras.main.flash(250, 255, 240, 230); this.ensureGens(); this.placeGifts(); this.redraw();
    const p = popup(this, 760, 640);
    // 뒤에서 도는 빛줄기 + 흩날리는 반짝이
    const rays = this.add.graphics(); rays.fillStyle(0xFFF1B8, 0.16); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; rays.slice(0, 0, 560, a, a + 0.12); rays.fillPath(); }
    const glow = this.add.image(0, -40, 'glow').setTint(0xFFE27A).setScale(7).setAlpha(0.55); rays.setPosition(0, -40); p.box.addAt(rays, 0); p.box.addAt(glow, 0); this.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1 });
    for (let k = 0; k < 18; k++) { const s = this.add.image(-340 + Math.random() * 680, -320, 'spark').setTint([0xFFE27A, 0xFF9DB6, 0xFFFFFF][k % 3]).setScale(0.3 + Math.random() * 0.3); p.content.add(s); this.tweens.add({ targets: s, y: 320, angle: 360, alpha: 0, duration: 1600 + Math.random() * 1200, delay: Math.random() * 600, onComplete: () => s.destroy() }); }
    p.content.add(T(this, 0, -220, `레벨 ${u.lv}!`, 64, C.rose, { w: 900 }));
    p.content.add(T(this, 0, -120, '에너지가 가득 찼어요', 32, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -40, `◆ ${u.gems}   ● ${u.coins}${u.gift ? '   선물 상자 1' : ''}`, 34, C.brown, { w: 900 }));
    p.content.add(btn(this, 0, 160, 400, 110, '좋아요!', () => p.close(), { size: 34 }));
  }
  // ── 처음 안내 (손가락 대신 말풍선)
  tutorial() {
    this.tipC?.destroy(); const d = this.d; if (d.tut >= 3) return;
    const steps = [
      { i: this.d.board.findIndex(c => c && c.t === 'g' && c.g === 'camellia'), t: '동백 바구니를 눌러 재료를 꺼내요 (2번)' },
      { i: -1, t: '같은 동백 잎 두 개를 끌어다 겹쳐요!' },
      { i: -1, t: '주문 카드의 물건이 모이면 완료를 눌러요', top: true },
    ], s = steps[d.tut]; const y = s.top ? 470 : s.i >= 0 ? cy(s.i) - 140 : Y0 + 30;
    this.tipC = this.add.container(W / 2, y).setDepth(70); const tt = T(this, 0, 0, s.t, 30, '#FFFFFF', { w: 900 }), bg = this.add.graphics(); bg.fillStyle(0xE86A8E, 0.95).fillRoundedRect(-tt.width / 2 - 30, -36, tt.width + 60, 72, 36); this.tipC.add([bg, tt]);
    this.tweens.add({ targets: this.tipC, y: y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (d.tut === 1) { const n = this.d.board.filter(c => c && c.t === 'i' && c.c === 'camellia' && c.l === 2).length; if (n >= 1 && this.d.stats.merges > 0) { d.tut = 2; save(); return this.tutorial(); } }
  }
  onBack() { return goPrev(this); }
}
