// 작업대 (원작의 주방 보드): 7×9 머지-2 · 생산기 · 잠긴 상자 · 비눗방울 · 창고 · 주문 3장 · 팔기
import { W, H } from '../config.js?v=0.50.0';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.50.0';
import { audio } from '../audio.js?v=0.50.0';
import { load, save } from '../save.js?v=0.50.0';
import { goPrev } from '../nav.js?v=0.50.0';
import { hud } from '../hud.js?v=0.50.0';
import { CHAINS, GENS, GEN_MAX, MAX_LV, SPECIAL, specialNext, itemKey, itemName, genImg, genName, ENERGY, STORAGE } from '../data.js?v=0.50.0';
import { spendEnergy, tickEnergy, addXp, unlockedChains, storageSize, makeOrder, fillOrders, addGoal, discover, giveReward } from '../state.js?v=0.50.0';
import { adsOpen, rewardAd } from '../store.js?v=0.50.0';
import { album, addPack, ORDERS_PER_PACK, piggyAdd } from '../album.js?v=0.50.0';
import { raceAdd, ladderAdd, vipAdd, VIP, theme } from '../events.js?v=0.50.0';
import { bingoAdd, digAddOrder, digAdd, spinAdd, duoAdd } from '../minigames.js?v=0.50.0';

const COLS = 7, ROWS = 9, CS = 142, X0 = (1080 - COLS * CS) / 2, Y0 = 440;
const idx = (c, r) => r * COLS + c, colOf = i => i % COLS, rowOf = i => Math.floor(i / COLS);
const cx = i => X0 + colOf(i) * CS + CS / 2, cy = i => Y0 + rowOf(i) * CS + CS / 2;

// 처음 작업대: 생산기 3 · 재료 몇 개 · 위쪽 두 줄과 가장자리는 잠긴 상자
export function newBoard() {
  const b = Array(COLS * ROWS).fill(null), rnd = () => ({ c: ['camellia', 'rice'][Math.floor(Math.random() * 2)], l: 1 + Math.floor(Math.random() * 3) });
  for (let i = 0; i < 14; i++) b[i] = { t: 'x', in: rnd() };
  for (const i of [idx(0, 2), idx(6, 2), idx(0, 8), idx(6, 8), idx(0, 5), idx(6, 5)]) b[i] = { t: 'x', in: rnd() };
  b[idx(1, 4)] = { t: 'g', g: 'camellia', l: 1 };
  b[idx(5, 4)] = { t: 'g', g: 'rice', l: 1 };
  b[idx(3, 7)] = { t: 'g', g: 'dew', l: 1, ch: GENS.dew.charges[1] };
  b[idx(2, 5)] = { t: 'i', c: 'camellia', l: 1 }; b[idx(4, 5)] = { t: 'i', c: 'rice', l: 1 };
  return b;
}

export class BoardScene extends Phaser.Scene {
  constructor() { super('Board'); }
  create() {
    const d = load(); if (!d.board) { d.board = newBoard(); save(); }
    this.d = d; this.drag = null; this.sel = -1; this.sprites = []; this.busy = false;
    if (!d.seenInit) { d.board.forEach(c => { if (c && c.t === 'i') d.seen[itemKey(c.c, c.l)] = 1; if (c && c.t === 'x') d.seen[itemKey(c.in.c, c.in.l)] = 1; }); d.seenInit = 1; }
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
    this.sellB = btn(this, 680, by + 85, 150, 90, '팔기', () => this.sell(), { style: 'cream', size: 26 }).setVisible(false);
    this.bookB = btn(this, 530, by + 85, 130, 90, '도감', () => this.book(), { style: 'cream', size: 26 }).setVisible(false);
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
      if (cell.t === 's') { const im = this.add.image(0, 0, cell.k); im.setScale((CS - (SPECIAL[cell.k].chain ? 40 - SPECIAL[cell.k].l * 6 : 26)) / Math.max(im.width, im.height)); ct.add(im);
        if (SPECIAL[cell.k].tool || ['pickbox', 'chest', 'hourglass'].includes(cell.k)) this.tweens.add({ targets: im, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      else if (cell.t === 'x') { const im = this.add.image(0, 0, 'box'); im.setScale((CS - 20) / Math.max(im.width, im.height)); const peek = this.add.image(0, -6, itemKey(cell.in.c, cell.in.l)); peek.setScale(70 / Math.max(peek.width, peek.height)).setAlpha(0.35); ct.add([im, peek]); }
      else {
        const key = cell.t === 'g' ? genImg(cell.g, cell.l) : itemKey(cell.c, cell.l), im = this.add.image(0, 0, key); im.setScale((CS - 22) / Math.max(im.width, im.height)); ct.add(im);
        if (cell.t === 'g') { const unl = !!GENS[cell.g].cost, ready = unl || cell.g === 'gift' || cell.ch > 0; const lbl = cell.g === 'gift' ? `${cell.u}` : unl ? `${cell.l}` : cell.ch > 0 ? `${cell.ch}` : '⏳'; const bgc = this.add.circle(44, 44, 20, ready ? (unl ? 0xF0B65A : 0x7CC6A8) : 0xC9AFA0).setStrokeStyle(3, 0xFFFFFF); ct.add([bgc, T(this, 44, 43, lbl, 20, '#FFFFFF', { w: 900 })]); if (ready) this.tweens.add({ targets: im, scale: im.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
        if (cell.b) { const bu = this.add.image(0, 0, 'bubble'); bu.setScale((CS - 6) / bu.width).setAlpha(0.75); ct.add(bu); const left = Math.max(0, Math.ceil((cell.b - now) / 1000)); ct.add(T(this, 0, 50, `${left}초`, 20, C.brown, { w: 900 })); }
        if (cell.t === 'i' && cell.l >= MAX_LV - 1) ct.add(this.add.image(46, -46, 'spark').setTint(0xFFD45A).setScale(cell.l === MAX_LV ? 0.5 : 0.35));
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
    if (a.t === 's' && SPECIAL[a.k].tool && b && this.useTool(from, to)) return;
    if (this.canMerge(a, b)) return this.merge(from, to);
    if (b.t === 'x' || b.b) { audio.play('sfx_drop', { volume: 0.4 }); return this.redraw(); }
    this.d.board[to] = a; this.d.board[from] = b; this.sel = to; save(); audio.play('sfx_drop', { volume: 0.5 }); this.redraw(); this.info(to);
  }
  canMerge(a, b) { if (!a || !b || a.b || b.b) return false; if (a.t === 'i' && b.t === 'i') return a.c === b.c && a.l === b.l && a.l < MAX_LV; if (a.t === 'g' && b.t === 'g') return a.g === b.g && a.l === b.l && a.l < GEN_MAX && !!GENS[a.g].cost; if (a.t === 's' && b.t === 's') return a.k === b.k && !!specialNext(a.k);
    if (a.t === 's' && SPECIAL[a.k].tool && b.t === 'i') return a.k === 'ribbon' ? b.l < MAX_LV : b.l > 1; return false; }
  // 도구: 가위(한 단계 낮은 두 개로) · 만능 리본(한 단계 위로)
  useTool(from, to) {
    const t = this.d.board[from], b = this.d.board[to]; if (!b || b.t !== 'i' || b.b) return false;
    if (t.k === 'scissors') { if (b.l < 2) { toast(this, '1단계는 더 나눌 수 없어요', cy(to) - 120); return false; } this.d.board[from] = null; const e = this.nearestEmpty(to); if (e < 0) { this.d.board[from] = t; toast(this, '나눌 빈 칸이 필요해요', cy(to) - 120); return false; }
      this.d.board[to] = { t: 'i', c: b.c, l: b.l - 1 }; this.d.board[e] = { t: 'i', c: b.c, l: b.l - 1 }; this.sel = to; save(); audio.play('sfx_merge', { volume: 0.5, rate: 0.8 }); this.redraw(); this.fx(to, 0xFFFFFF); this.fx(e, 0xFFFFFF); this.info(to); return true; }
    if (t.k === 'ribbon') { if (b.l >= MAX_LV) { toast(this, '이미 최고 단계예요', cy(to) - 120); return false; } this.d.board[from] = null; const nb = { t: 'i', c: b.c, l: b.l + 1 }; this.d.board[to] = nb; this.sel = to; addGoal('merges'); if (nb.l === 5) addGoal('lv5'); save();
      audio.play('sfx_merge_big', { volume: 0.6 }); this.redraw(); this.fx(to, 0xFFE27A, 14); this.ring(to); this.found(to); this.info(to); return true; }
    return false;
  }
  // 처음 만든 물건 → 도감에 기록 + 보석
  found(i) { const c = this.d.board[i]; if (!c || c.t !== 'i') return; const g = discover(itemKey(c.c, c.l), c.l); if (g) { this.time.delayedCall(350, () => this.floatText(i, g > 0 ? `새 물건 발견! ◆${g}` : '새 물건 발견!', C.rose)); if (g > 0) { this.hud.update(); audio.play('sfx_coin', { volume: 0.4, rate: 1.3 }); } } }
  merge(from, to) {
    const a = this.d.board[from], nb = a.t === 'i' ? { t: 'i', c: a.c, l: a.l + 1 } : a.t === 's' ? { t: 's', k: specialNext(a.k) } : { t: 'g', g: a.g, l: a.l + 1 };
    this.d.board[to] = nb; this.d.board[from] = null; this.sel = to; this.d.stats.merges++; addGoal('merges'); if (nb.t === 'i' && nb.l === 5) addGoal('lv5');
    if (nb.t === 'i' && nb.l >= 5) spinAdd(1);   // 룰렛 토큰
    // 원작처럼 5단계 이상 합치면 가끔 재화 아이템이 튀어나옴
    if (nb.t === 'i' && nb.l >= 5 && Math.random() < 0.06) { const e = this.nearestEmpty(to); if (e >= 0) { this.d.board[e] = { t: 's', k: ['en1', 'co1', 'ge1'][Math.floor(Math.random() * 3)] }; this.time.delayedCall(200, () => this.fx(e, 0xFFE27A)); } }
    // 옆 칸 잠긴 상자 열기
    let opened = []; for (const n of this.neighbors(to)) { const c = this.d.board[n]; if (c && c.t === 'x') { this.d.board[n] = { t: 'i', ...c.in }; opened.push(n); } }
    // 원작의 비눗방울: 3단계 이상 합치면 가끔 같은 물건이 비눗방울에 갇혀 나옴 (60초 안에 보석으로 가지기)
    if (nb.t === 'i' && nb.l >= 3 && nb.l < MAX_LV && Math.random() < 0.06) { const e = this.nearestEmpty(to); if (e >= 0) this.d.board[e] = { t: 'i', c: nb.c, l: nb.l, b: Date.now() + 60000 }; }
    save(); this.redraw();
    // 합치기 소리: 단계가 오를수록 음이 높아짐 · 5단계 이상은 반짝이는 큰 소리 + 빛 원
    const big = nb.t === 'g' || nb.l >= 5;
    audio.play(big ? 'sfx_merge_big' : 'sfx_merge', { volume: big ? 0.6 : 0.55, rate: big ? 1 : 0.92 + (nb.l || 2) * 0.05 }); audio.buzz(big ? [12, 30, 18] : 12);
    this.fx(to, nb.l >= 5 ? 0xFFE27A : 0xFFFFFF, big ? 14 : 8); if (big) this.ring(to);
    const sp = this.sprites[to]; if (sp) { sp.setScale(0.55); this.tweens.add({ targets: sp, scale: 1, duration: 320, ease: 'Back.easeOut', easeParams: [3] }); }
    if (nb.t === 'i' && nb.l === MAX_LV) this.floatText(to, '최고 단계 완성!', C.gold); else if (nb.t === 'g') this.floatText(to, '생산기 업그레이드!', C.rose);
    if (opened.length) { this.time.delayedCall(140, () => audio.play('sfx_box', { volume: 0.55 })); opened.forEach(n => { this.fx(n, 0xFFE9A0); const s2 = this.sprites[n]; if (s2) { s2.setScale(0.4); this.tweens.add({ targets: s2, scale: 1, duration: 360, delay: 120, ease: 'Back.easeOut' }); } }); }
    this.found(to); opened.forEach(n => this.found(n)); this.info(to); if (this.d.tut === 1) this.tutorial();
  }
  // 생산기에서 빈 칸으로 포물선을 그리며 날아감 (위치를 한 트윈에서만 바꿔 끝 위치가 항상 정확함)
  arcTo(sp, x0, y0, x1, y1, ms) { sp.setPosition(x0, y0).setScale(0.3); const o = { t: 0 }, h = 60 + Math.hypot(x1 - x0, y1 - y0) * 0.15;
    this.tweens.add({ targets: o, t: 1, duration: ms, ease: 'Sine.easeOut', onUpdate: () => { if (!sp.scene) return; const t = o.t; sp.setPosition(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * h).setScale(0.3 + 0.7 * Math.min(1, t * 1.15)); }, onComplete: () => { if (sp.scene) sp.setPosition(x1, y1).setScale(1); } }); }
  shake(i) { const s = this.sprites[i]; if (s) this.tweens.add({ targets: s, x: cx(i) + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => s.setX(cx(i)) }); }
  neighbors(i) { const c = colOf(i), r = rowOf(i), out = []; if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1); if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS); return out; }
  nearestEmpty(i) { let best = -1, bd = 1e9; this.d.board.forEach((c, j) => { if (c) return; const dd = Math.abs(colOf(j) - colOf(i)) + Math.abs(rowOf(j) - rowOf(i)) * 1.01; if (dd < bd) { bd = dd; best = j; } }); return best; }
  ring(i) { const r = this.add.circle(cx(i), cy(i), 30).setStrokeStyle(8, 0xFFE27A).setDepth(39); this.tweens.add({ targets: r, scale: 3, alpha: 0, duration: 480, ease: 'Cubic.easeOut', onComplete: () => r.destroy() }); }
  floatText(i, s, col) { const now = this.time.now; this.ftAt = (this.ftAt || []).filter(a => now - a < 900); const t = T(this, cx(i), cy(i) - 70 - this.ftAt.length * 44, s, 32, col, { w: 900, shadow: true }).setDepth(45); this.ftAt.push(now); this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1100, delay: 300, onComplete: () => t.destroy() }); }
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
    if (cell.t === 's') return this.useSpecial(i);
    audio.play('sfx_tap', { volume: 0.5 }); this.redraw(); this.info(i);
  }
  // 특별 물건 누르기: 재화 받기 · 모래시계 · 고르기 상자 · 보물 상자 · 도구 설명
  useSpecial(i) {
    const c = this.d.board[i], S = SPECIAL[c.k];
    if (S.give) { if (this.sel !== i) { this.sel = i; this.redraw(); return this.info(i); } this.d.board[i] = null; this.sel = -1; giveReward(S.give); save(); this.redraw(); this.info(-1);
      if (S.give.coins) this.flyCoins(cx(i), cy(i), S.give.coins, true); else this.flyIcon(cx(i), cy(i), S.give.energy ? 'energy' : 'gem', S.give.energy ? this.hud.energyAt : this.hud.gemAt, `+${S.give.energy || S.give.gems}`);
      audio.play(S.give.energy ? 'sfx_gen' : 'sfx_coin', { volume: 0.6, rate: 1.1 }); audio.buzz(10); return; }
    if (S.tool) { this.sel = i; this.redraw(); this.info(i); return toast(this, S.help, cy(i) - 120); }
    if (c.k === 'hourglass') { this.d.board[i] = null; this.d.orders.forEach(o => { if (o.at > Date.now()) o.at = Date.now(); }); this.d.board.forEach(g => { if (g && g.t === 'g' && g.g === 'dew') { g.ch = GENS.dew.charges[1]; g.at = 0; } }); save(); audio.play('sfx_repair', { volume: 0.5, rate: 1.3 }); this.fx(i, 0xFFE9A0, 12); this.redraw(); this.drawOrders(); return; }
    if (c.k === 'chest') { const out = this.chestLoot(), cells = [];
      // 상자 칸은 비워 두고 주변 빈 칸부터 채움 (자리가 모자랄 때만 상자 칸 사용) → 나온 물건이 상자와 겹치지 않음
      for (const it of out) { const e = this.nearestEmpty(i); if (e < 0) { this.d.pendingItems.push(it); continue; } this.d.board[e] = it; cells.push(e); }
      this.d.board[i] = null; const left = this.d.pendingItems.length && this.d.pendingItems.at(-1) && out.includes(this.d.pendingItems.at(-1)); if (left) { this.d.board[i] = this.d.pendingItems.pop(); cells.push(i); }
      save(); audio.play('sfx_box', { volume: 0.7 }); audio.buzz([15, 30, 15]); this.redraw(); this.ring(i);
      // 상자가 부풀었다 사라지는 연출 (판 그림과 따로)
      const ghost = this.add.image(cx(i), cy(i), 'chest').setDepth(35); ghost.setScale((CS - 26) / Math.max(ghost.width, ghost.height)); this.tweens.add({ targets: ghost, scale: ghost.scale * 1.35, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => { ghost.destroy(); this.fx(i, 0xFFE27A, 14); } });
      cells.forEach((e, k) => { const sp = this.sprites[e]; if (sp) { sp.setPosition(cx(i), cy(i)).setScale(0.2).setVisible(false); this.tweens.add({ targets: sp, x: cx(e), y: cy(e), scale: 1, duration: 380, delay: 200 + k * 90, ease: 'Back.easeOut', onStart: () => sp.setVisible(true) }); } this.found(e); });
      if (cells.length < out.length) toast(this, '자리가 없어 남은 선물은 나중에 나와요', cy(i) - 120); return; }
    if (c.k === 'pickbox') return this.pickBox(i);
  }
  chestLoot() { const ch = unlockedChains(), r = a => a[Math.floor(Math.random() * a.length)], out = [];
    for (let k = 0; k < 3; k++) out.push({ t: 'i', c: r(ch), l: 2 + Math.floor(Math.random() * 3) });
    out.push({ t: 's', k: r(['en1', 'en2', 'co2', 'ge1']) }); if (Math.random() < 0.5) out.push({ t: 's', k: r(['scissors', 'ribbon', 'hourglass']) }); return out; }
  pickBox(i) {
    const ch = unlockedChains(), lv = Math.min(6, 3 + Math.floor(this.d.lv / 8)), opts = [...ch].sort(() => Math.random() - 0.5).slice(0, 3).map(c => ({ c, l: lv }));
    audio.play('sfx_bubble', { volume: 0.5 }); const p = popup(this, 900, 540);
    p.content.add(T(this, 0, -200, '고르기 상자', 42, C.ink, { w: 900 })); p.content.add(T(this, 0, -145, '필요한 재료 하나를 골라요', 26, C.dim, { w: 800 }));
    opts.forEach((o, k) => { const x = (k - 1) * 270, cc = this.add.container(x, 60), g = this.add.graphics(); g.fillStyle(0xFFF4EC, 1).fillRoundedRect(-120, -140, 240, 280, 30).lineStyle(4, 0xF1C6CF, 1).strokeRoundedRect(-120, -140, 240, 280, 30);
      const im = this.add.image(0, -30, itemKey(o.c, o.l)); im.setScale(150 / Math.max(im.width, im.height)); cc.add([g, im, T(this, 0, 90, itemName(o.c, o.l), 22, C.ink, { w: 800, wrap: 220 })]);
      cc.setSize(240, 280).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.d.board[i]?.k !== 'pickbox') return p.close(); this.d.board[i] = { t: 'i', c: o.c, l: o.l }; this.sel = i; save(); p.close(); audio.play('sfx_merge', { volume: 0.6 }); this.redraw(); this.fx(i, 0xFFE27A, 12); this.found(i); this.info(i); }); p.content.add(cc); });
  }
  flyIcon(x, y, key, t, label) { for (let k = 0; k < 3; k++) { const s = this.add.image(x, y, key).setDepth(60); s.setScale(50 / Math.max(s.width, s.height)); this.tweens.add({ targets: s, x: t.x, y: t.y, duration: 450 + k * 80, delay: k * 40, ease: 'Cubic.easeIn', onComplete: () => { s.destroy(); if (k === 2) this.hud.update(); } }); }
    const tx = T(this, x, y - 40, label, 32, C.gold, { w: 900, shadow: true }).setDepth(60); this.tweens.add({ targets: tx, y: tx.y - 60, alpha: 0, duration: 900, delay: 300, onComplete: () => tx.destroy() }); }
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
    this.newAt = e;
    if (cell.g === 'gift') { cell.u--; if (cell.u <= 0) this.d.board[i] = null; } else if (!G.cost) { cell.ch--; if (cell.ch <= 0) cell.at = Date.now(); }
    save(); audio.play('sfx_gen', { volume: 0.55, rate: 0.95 + Math.random() * 0.12 }); audio.buzz(6);
    this.redraw(); this.hud.update();
    const sp = this.sprites[e]; if (sp) this.arcTo(sp, cx(i), cy(i), cx(e), cy(e), 320);
    const gs = this.sprites[i]; if (gs) this.tweens.add({ targets: gs, scaleX: 1.12, scaleY: 0.9, duration: 70, yoyo: true });
    this.found(e); this.info(i); if (this.d.tut === 0 && this.d.board.filter(c => c && c.t === 'i' && c.c === 'camellia' && c.l === 1).length >= 2) { this.d.tut = 1; save(); this.tutorial(); }
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
  ensureGens() { const has = g => this.d.board.some(c => c && c.t === 'g' && c.g === g); for (const g of unlockedChains()) if (!has(g)) { const e = this.nearestEmpty(idx(3, 4)); if (e >= 0) this.d.board[e] = { t: 'g', g, l: 1 }; } save(); }
  placeGifts() { while (this.d.pendingItems.length) { const e = this.nearestEmpty(idx(3, 6)); if (e < 0) break; this.d.board[e] = this.d.pendingItems.shift(); }
    while ((this.d.pendingGifts || 0) > 0) { const e = this.nearestEmpty(idx(3, 6)); if (e < 0) break; this.d.board[e] = { t: 'g', g: 'gift', l: 1, u: GENS.gift.uses }; this.d.pendingGifts--; } save(); }
  // ── 설명 줄 · 팔기
  info(i) { this.info0(i); const lim = this.sellB.visible || this.bookB.visible ? 380 : 640; for (const t of [this.infoT, this.infoS]) t.setScale(Math.min(1, lim / Math.max(1, t.width))); }
  info0(i) {
    const c = i >= 0 ? this.d.board[i] : null; this.sellB.setVisible(false); this.bookB.setVisible(!!c && (c.t === 'i' || c.t === 'g' && !!GENS[c.g].chain));
    if (!c) { this.infoT.setText('같은 물건 두 개를 끌어다 겹치면 합쳐져요'); this.infoS.setText('생산기를 누르면 재료가 나와요 · 에너지 1'); return; }
    if (c.t === 's') { const S = SPECIAL[c.k]; this.infoT.setText(S.n + (S.chain ? ` · ${S.l}단계` : '')); this.infoS.setText(S.give ? `한 번 더 누르면 받아요${specialNext(c.k) ? ' · 같은 것끼리 합치면 커져요' : ''}` : S.help); return; }
    if (c.t === 'g') { const G = GENS[c.g]; this.infoT.setText(`${genName(c.g, c.l)}${c.g === 'gift' || c.g === 'dew' ? '' : ` · ${c.l}단계`}`); this.infoS.setText(c.g === 'gift' ? `남은 횟수 ${c.u} · 무료로 2~3단계 재료` : c.g === 'dew' ? `무료 · 남은 ${c.ch}번 · 다 쓰면 ${G.recharge / 60}분 뒤 충전` : `누르면 ${CHAINS[G.chain].n} 재료 · 에너지 ${G.cost}${c.l < GEN_MAX ? ' · 같은 생산기끼리 합치면 업그레이드' : ' · 최고 단계'}`); return; }
    if (c.t === 'i') { this.infoT.setText(`${itemName(c.c, c.l)} · ${c.l}단계`); this.infoS.setText(c.l < MAX_LV ? `다음: ${itemName(c.c, c.l + 1)}` : '최고 단계 완성품!'); this.sellB.setVisible(!c.b); this.sellB.setLabel(`팔기 ●${c.l}`); }
  }
  // 도감: 계열 전체 단계 (아직 못 만든 건 실루엣) · 원작의 물건 정보 창
  book() {
    const c = this.d.board[this.sel]; if (!c) return; const chain = c.t === 'i' ? c.c : GENS[c.g].chain, n = MAX_LV;
    const p = popup(this, 980, 900); p.content.add(T(this, 0, -390, `${CHAINS[chain].n} 계열`, 44, C.ink, { w: 900 }));
    const seen = Object.keys(this.d.seen).filter(k => k.startsWith(chain)).length; p.content.add(T(this, 0, -335, `발견 ${seen} / ${n} · 처음 만들면 보석을 받아요`, 24, C.dim, { w: 800 }));
    for (let l = 1; l <= n; l++) { const k = l - 1, x = -360 + (k % 5) * 180, y = -200 + Math.floor(k / 5) * 260, key = itemKey(chain, l), on = !!this.d.seen[key], g = this.add.graphics();
      g.fillStyle(c.t === 'i' && c.l === l ? 0xFFE3EC : 0xFFF4EC, 1).fillRoundedRect(x - 80, y - 90, 160, 180, 24); p.content.add(g);
      const im = this.add.image(x, y - 14, key); im.setScale(120 / Math.max(im.width, im.height)); if (!on) im.setTintFill(0xC9AFA0).setAlpha(0.55); p.content.add(im);
      p.content.add(T(this, x, y + 64, `${l}`, 22, C.rose, { w: 900 })); p.content.add(T(this, x, y + 112, on ? itemName(chain, l) : '???', 19, on ? C.ink : C.dim, { w: 700, wrap: 170 })); }
    p.content.add(T(this, 0, 330, `생산기: ${GENS[chain].names.slice(1).join(' → ')}`, 20, C.brown, { w: 700, wrap: 880 }));
    p.content.add(btn(this, 0, 400, 300, 84, '닫기', () => p.close(), { style: 'cream', size: 28 }));
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
      if (o.npc) { const fm = this.add.graphics(); fm.fillStyle(0xFFF1D6, 1).fillRoundedRect(8, 14, 108, 112, 24); c.add(fm); const tx = this.textures.get(o.face).getSourceImage(), cw = tx.width, f = this.add.image(62, 70, o.face); f.setCrop(cw * 0.12, 0, cw * 0.76, cw * 0.8).setOrigin(0.5, 0.4 * cw / tx.height); f.setScale(104 / (cw * 0.76)); c.add(f); g.lineStyle(5, 0xE86A8E, 1).strokeRoundedRect(0, 0, 330, 278, 28); }
      else { const f = this.add.image(62, 70, o.face); f.setScale(104 / f.width); c.add([this.add.circle(62, 70, 54, 0xFCE4EC), f]); }
      c.add(T(this, 128, 40, o.who, 20, C.brown, { ox: 0, w: 800 })); c.add(T(this, 128, 82, `"${o.say}"`, 17, C.dim, { ox: 0, w: 700, wrap: 190, align: 'left' }));
      o.items.forEach((it, j) => { const ix = o.items.length === 1 ? 165 : 100 + j * 130, im = this.add.image(ix, 176, itemKey(it.c, it.l)); im.setScale(96 / Math.max(im.width, im.height)); c.add(im); it.ok = this.has(it); c.add(this.add.circle(ix + 40, 206, 18, it.ok ? 0x5FA65A : 0xD9C2CC).setStrokeStyle(3, 0xFFFFFF)); c.add(T(this, ix + 40, 205, it.ok ? '✓' : '', 20, '#FFFFFF', { w: 900 })); });
      if (o.vip) { g.lineStyle(6, 0xF0B65A, 1).strokeRoundedRect(0, 0, 330, 278, 28); const cr = this.add.image(30, 26, 'ev_vip'); cr.setScale(56 / cr.height); c.add(cr); }
      if (o.bonus) { const bi = this.add.image(300, 30, o.bonus); bi.setScale(46 / Math.max(bi.width, bi.height)); c.add([this.add.circle(300, 30, 28, 0xFFF1B8).setStrokeStyle(3, 0xF0B65A), bi]); }
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
    this.d.coins += o.coins; this.d.stats.orders++; addGoal('orders'); piggyAdd();
    // 이벤트 점수: 레이스 +1(두 개짜리 +2) · 꽃잎 = 물건 단계 합 · VIP
    bingoAdd(1); digAddOrder(); duoAdd(o.items.length);
    { const rp = raceAdd(o.items.length), lp = ladderAdd(o.items.reduce((a, it) => a + it.l, 0)); let vp = 0; if (o.vip) vp = vipAdd();
      this.time.delayedCall(450, () => { const t = T(this, 30 + k * 345 + 165, 460, [rp && `🏆+${rp}`, `${theme().emoji}+${lp}`, o.vip && `👑 ${vp}/${VIP.goal}`].filter(Boolean).join('  '), 28, '#C2408A', { w: 900, shadow: true }).setDepth(61); this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1300, delay: 400, onComplete: () => t.destroy() }); }); }
    { const a = album(); a.orders++; if (a.orders % ORDERS_PER_PACK === 0) { addPack('basic'); this.time.delayedCall(900, () => this.packFly()); } }
    if (o.bonus) { const e = this.nearestEmpty(used[0]); if (e >= 0) this.d.board[e] = { t: 's', k: o.bonus }; else this.d.pendingItems.push({ t: 's', k: o.bonus }); }
    this.d.orders[k] = { ...makeOrder(false, this.d.board), at: Date.now() + 6000 }; save();
    audio.play('sfx_order', { volume: 0.7 }); audio.buzz([20, 40, 20]);
    if (o.npc) this.time.delayedCall(700, () => { const bx = this.add.container(W / 2, 520).setDepth(65), tt = T(this, 40, 0, `${o.who}: ${o.thanks}`, 28, C.ink, { w: 800, wrap: 760, align: 'left', ox: 0.5 }), bg = this.add.graphics(); bg.fillStyle(0xFFFFFF, 0.97).fillRoundedRect(-460, -60, 920, 120, 40).lineStyle(4, 0xE86A8E, 1).strokeRoundedRect(-460, -60, 920, 120, 40); const pf = this.add.image(-390, 0, o.face); pf.setScale(110 / pf.width).setCrop(0, 0, pf.width, pf.width); bx.add([bg, pf, tt]); bx.setAlpha(0); this.tweens.add({ targets: bx, alpha: 1, y: 500, duration: 250, hold: 2200, yoyo: true, onComplete: () => bx.destroy() }); });
    const ups = addXp(o.xp); if (ups.length) { spinAdd(ups.length); digAdd(ups.length * 2); } this.time.delayedCall(300, () => this.flyCoins(ox, 400, o.coins));
    this.redraw(); this.hud.update();
    if (ups.length) this.time.delayedCall(600, () => this.levelUp(ups.reduce((a, u) => ({ ...u, gems: a.gems + u.gems, coins: a.coins + u.coins, gift: a.gift || u.gift, items: [...a.items, ...u.items], pack: u.pack === 'diamond' || a.pack === 'diamond' ? 'diamond' : u.pack === 'gold' || a.pack === 'gold' ? 'gold' : u.pack || a.pack }), { gems: 0, coins: 0, gift: false, items: [], pack: null })));
    if (this.d.tut === 2) { this.d.tut = 3; save(); this.tutorial(); }
  }
  // 코인이 흩어졌다가 위 막대로 날아가고, 닿을 때마다 짤랑 (원작의 보상 연출)
  flyCoins(x, y, n, small) { const t = this.hud.coinAt, m = small ? 2 : Math.min(9, 3 + Math.floor(n / 8));
    for (let k = 0; k < m; k++) { const s = this.add.image(x, y, 'coin').setDepth(60); s.setScale(46 / s.width); const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 50;
      this.tweens.chain({ targets: s, tweens: [{ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, duration: 220, ease: 'Cubic.easeOut' }, { x: t.x, y: t.y, scale: s.scale * 0.8, duration: 420 + k * 50, ease: 'Cubic.easeIn', onComplete: () => { s.destroy(); if (k % 2 === 0) audio.play('sfx_coin', { volume: 0.35, rate: 1 + k * 0.03, gap: 30 }); if (k === m - 1) this.hud.update(); } }] }); }
    const tx = T(this, x, y - 40, `+${n}`, small ? 30 : 40, C.gold, { w: 900, shadow: true }).setDepth(60); this.tweens.add({ targets: tx, y: tx.y - 60, alpha: 0, duration: 900, delay: 400, onComplete: () => tx.destroy() }); }
  // 주문 5번마다 카드 팩: 팩이 떠올랐다가 날아감
  packFly() { const im = this.add.image(W / 2, H / 2, 'pack_basic').setDepth(70); im.setScale(0.1); audio.play('sfx_box', { volume: 0.5, rate: 1.2 });
    const t = T(this, W / 2, H / 2 + 170, '카드 팩을 받았어요! 앨범에서 열어요', 30, '#FFFFFF', { w: 900, shadow: true }).setDepth(70);
    this.tweens.add({ targets: im, scale: 220 / im.height, angle: 360, duration: 500, ease: 'Back.easeOut', onComplete: () => this.tweens.add({ targets: im, x: this.homeB.x, y: this.homeB.y, scale: 0.05, duration: 600, delay: 700, ease: 'Cubic.easeIn', onComplete: () => im.destroy() }) });
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() }); }
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
    const its = [...(u.pack ? [{ t: 'p', k: u.pack }] : []), ...(u.items || [])].map(it => it.t === 'p' ? { key: `pack_${it.k}`, n: { basic: '기본 팩', gold: '골드 팩', diamond: '다이아 팩' }[it.k] } : it.t === 'g' ? { key: genImg(unlockedChains()[0], it.gl), n: `생산기 ${it.gl}단계` } : { key: it.k, n: SPECIAL[it.k].n });
    its.forEach((it, k) => { const x = (k - (its.length - 1) / 2) * 150, im = this.add.image(x, 50, it.key); im.setScale(90 / Math.max(im.width, im.height)); p.content.add([im, T(this, x, 108, it.n, 20, C.dim, { w: 800 })]); });
    p.content.add(btn(this, 0, 205, 400, 100, '좋아요!', () => { p.close(); this.placeGifts(); this.redraw(); }, { size: 34 }));
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
