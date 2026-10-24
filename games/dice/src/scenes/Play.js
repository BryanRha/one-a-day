// 전투 화면: 판 5×3 + 둘레 길. 소환(탭) · 합성(끌어 놓기) · 판 안 강화. 로직은 core/sim.js
import { W, H } from '../config.js?v=0.44.1';
import { Sim, RUNES, COLS, ROWS, SLOTS, MAX_PIPS, BOSSES, RARITY, RARITY_NAME, RARITY_COLOR, synergiesOf } from '../core/sim.js?v=0.44.1';
import { DESC } from './Deck.js?v=0.44.1';
import { act } from '../core/ai.js?v=0.44.1';
import { T, C, fmt, btn, iconBtn, popup, toast } from '../pui.js?v=0.44.1';
import { audio } from '../audio.js?v=0.44.1';
import { load, save } from '../save.js?v=0.44.1';
import * as M from '../meta.js?v=0.44.1';
import { inOAD, exitToOAD } from '../oad.js?v=0.44.1';

// 판 크기: 양옆 길 위 몬스터(보스 포함)가 화면 밖으로 잘리지 않게 여백 확보
const CS = 188, GAP = 14, BW = COLS * CS + (COLS - 1) * GAP, BH = ROWS * CS + (ROWS - 1) * GAP;
const DT = 1 / 30;
const VO = { wave: 2, boss: 2, bossdown: 2, awaken: 2, merge: 2, perfect: 1, record: 1, danger: 1, over: 1 };
const EN_KEY = { normal: 'en_wisp', fast: 'en_imp', big: 'en_golem' };
const EN_SIZE = { normal: 88, fast: 92, big: 124, boss: 160 };
// 주사위 눈 위치 (칸 중심 기준, -1~1)
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]], 7: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1], [0, 0]],
};
const buzz = ms => { try { if (load().sfx && navigator.vibrate) navigator.vibrate(ms); } catch { /* */ } };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create(data = {}) {
    const d = load(), q = new URLSearchParams(location.search);
    this.bot = q.has('bot');
    this.mode = data.mode || 'run';
    const seed = (Date.now() & 0xffffff) + 1, base = { tiers: M.effTiers(), seed, critBonus: M.critBonus(), mode: this.mode };
    if (this.mode === 'daily') { const dc = M.dailyChallenge(); this.s = new Sim({ deck: dc.deck, seed: dc.seed, mode: 'daily' }); }
    else if (this.mode === 'mono') this.s = new Sim({ ...base, deck: Array(5).fill(data.rune) });
    else if (this.mode === 'arena') this.s = new Sim({ ...base, deck: [data.rune] });
    else if (this.mode === 'abyss') this.s = new Sim({ ...base, deck: d.deck, startWave: 10 });
    else this.s = new Sim({ ...base, deck: d.deck });
    this.powers = 0; this.acc = 0; this.paused = false; this.ended = false; this.awakened = false; this.leakedWave = false; this.voT = 0;

    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.35);
    // 배치: 판은 가운데 아래쪽, 길은 판 둘레 ㄷ자
    // 조작부는 화면 아래에 붙이고, 판(+둘레 길)은 위 정보와 조작부 사이 가운데에
    this.ctrlBase = H - 120;
    this.pathBottom = this.ctrlBase - 130;
    this.BX = (W - BW) / 2; this.BY = Math.round(Math.max(410, Math.min(520, 410 + (H - 1920) * 0.3)));
    const m = 82, top = this.BY - m, left = this.BX - m, right = this.BX + BW + m, bottom = this.pathBottom;   // 길은 조작부 바로 위까지 (화면이 길면 길도 길어짐 · 진행 속도는 비율이라 난이도 같음)
    this.pathPts = [[left, bottom], [left, top], [right, top], [right, bottom]];
    const seg = []; let L = 0; for (let i = 1; i < 4; i++) { const [x0, y0] = this.pathPts[i - 1], [x1, y1] = this.pathPts[i]; const l = Math.hypot(x1 - x0, y1 - y0); seg.push([x0, y0, x1, y1, L, l]); L += l; }
    this.seg = seg; this.pathL = L;
    this.drawPath();
    this.makeBoard();
    this.makeHud();
    this.pw = null; this.makeControls();
    this.ePool = new Map(); this.bolts = [];
    this.spark = this.add.particles(0, 0, 'spark', { lifespan: { min: 250, max: 500 }, speed: { min: 120, max: 380 }, scale: { start: 0.45, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(40);
    this.makeInput();
    audio.music('bgm_game', this);
    this.cameras.main.fadeIn(300, 5, 6, 26);
    if (!d.tips.dice && !this.bot) this.time.delayedCall(500, () => this.tutorial());
    else { const sy = synergiesOf(this.s.deck); if (sy.length) this.time.delayedCall(700, () => this.banner('덱 조합 발동', sy.map(x => `${x.name} · ${x.desc}`).join('\n'), '#F5C451')); }
    if (this.bot) this.time.addEvent({ delay: 220, loop: true, callback: () => { if (!this.paused) for (let k = 0; k < 3; k++) if (!act(this.s, 0.8)) break; this.render(); } });
    window.__play = this;
  }

  // ── 길 ──
  pathXY(dd) {
    let L = dd * this.pathL;
    for (const [x0, y0, x1, y1, s0, l] of this.seg) if (L <= s0 + l) { const k = (L - s0) / l; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; }
    const z = this.seg[this.seg.length - 1]; return [z[2], z[3]];
  }
  drawPath() {
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(108, 0x0A0D24, 0.72); g.beginPath(); g.moveTo(...this.pathPts[0]); for (const p of this.pathPts.slice(1)) g.lineTo(...p); g.strokePath();
    const edge = this.add.graphics().setDepth(2);
    edge.lineStyle(2, M.field().accent, 0.28); edge.beginPath(); edge.moveTo(...this.pathPts[0]); for (const p of this.pathPts.slice(1)) edge.lineTo(...p); edge.strokePath();
    // 흐르는 룬 점 (방향 표시)
    this.flowDots = [];
    for (let i = 0; i < 26; i++) { const dt = this.add.image(0, 0, 'pip').setDepth(3).setTint(M.field().accent).setAlpha(0.35).setScale(0.45); dt.k = i / 26; this.flowDots.push(dt); }
    // 시작·끝 표시
    const [sx, sy] = this.pathPts[0], [ex, ey] = this.pathPts[3];
    this.add.image(sx, sy + 34, 'glow').setTint(0x6E4BFF).setAlpha(0.6).setScale(1.4).setDepth(2).setBlendMode('ADD');
    this.goal = this.add.image(ex, ey + 30, 'glow').setTint(0xFF5A7A).setAlpha(0.7).setScale(1.6).setDepth(2).setBlendMode('ADD');
    this.tweens.add({ targets: this.goal, alpha: 0.35, scale: 1.9, duration: 900, yoyo: true, repeat: -1 });
    // 길 시작 · 끝 이름표 (적이 '제단'에 닿으면 생명이 줄어요)
    const tag = (x, y, str, col) => { const t = T(this, x, y, str, 22, '#FFFFFF', { w: 900, shadow: false }); const g = this.add.graphics(); g.fillStyle(col, 0.92).fillRoundedRect(x - t.width / 2 - 14, y - 18, t.width + 28, 36, 18); g.setDepth(19); t.setDepth(20); return t; };
    tag(sx, sy - 40, '입구', 0x5A3FD8);
    this.goalTag = tag(ex, ey - 40, '제단 ▼', 0xD8405A);
  }

  // ── 판 ──
  slotXY(i) { const r = Math.floor(i / COLS), c = i % COLS; return [this.BX + c * (CS + GAP) + CS / 2, this.BY + r * (CS + GAP) + CS / 2]; }
  makeBoard() {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x070A1E, 0.75).fillRoundedRect(this.BX - 22, this.BY - 22, BW + 44, BH + 44, 34).lineStyle(2, M.field().accent, 0.25).strokeRoundedRect(this.BX - 22, this.BY - 22, BW + 44, BH + 44, 34);
    for (let i = 0; i < SLOTS; i++) { const [x, y] = this.slotXY(i); this.add.image(x, y, 'slot').setDisplaySize(CS, CS).setDepth(5); }
    this.dieViews = new Array(SLOTS).fill(null);
  }
  makeDieView(i, d) {
    const [x, y] = this.slotXY(i), c = this.add.container(x, y).setDepth(10);
    const body = this.add.image(0, 0, `die_${d.type}`).setDisplaySize(CS, CS);
    const rune = this.add.image(0, 0, `rune_${d.type}`).setDisplaySize(CS * 0.62, CS * 0.62).setAlpha(0.22);
    c.add([body, rune]);
    const col = RUNES[d.type].color;
    for (const [px, py] of PIPS[d.pips]) { const x = px * CS * 0.25, y = py * CS * 0.25; c.add(this.add.image(x, y, 'pip').setDisplaySize(46, 46).setTint(col).setBlendMode('ADD')); c.add(this.add.circle(x, y, 10, 0xFFFFFF)); }
    // 등급 장식: 희귀 은은한 빛 · 영웅 도는 마법진 · 전설 회전 빛줄기 + 맴도는 별빛
    const rar = RARITY[d.type] || 0;
    if (rar >= 1) { const gl = this.add.image(0, 0, 'glow').setTint(col).setBlendMode('ADD').setScale(1.5 + rar * 0.15).setAlpha(0.18 + rar * 0.08); c.addAt(gl, 0); this.tweens.add({ targets: gl, alpha: gl.alpha * 0.5, duration: 1100 + rar * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    if (rar >= 2) { const rg = this.add.image(0, 0, 'ring').setTint(col).setBlendMode('ADD').setScale(CS / 128 * 1.02).setAlpha(rar === 3 ? 0.5 : 0.35); c.addAt(rg, 0); this.tweens.add({ targets: rg, angle: 360, duration: 6000, repeat: -1 }); }
    if (rar === 3) {
      const ry = this.add.image(0, 0, 'rays').setTint(col).setBlendMode('ADD').setScale(CS / 512 * 2.1).setAlpha(0.42); c.addAt(ry, 0); this.tweens.add({ targets: ry, angle: -360, duration: 9000, repeat: -1 });
      const orb = this.add.container(0, 0); for (let q = 0; q < 3; q++) { const a = q * Math.PI * 2 / 3; orb.add(this.add.image(Math.cos(a) * CS * 0.56, Math.sin(a) * CS * 0.56, 'pip').setTint(q ? col : 0xFFFFFF).setBlendMode('ADD').setScale(0.7)); }
      c.add(orb); this.tweens.add({ targets: orb, angle: 360, duration: 3200, repeat: -1 });
    }
    if (d.pips >= MAX_PIPS) { const aw = this.add.image(0, 0, 'glow').setTint(col).setBlendMode('ADD').setScale(1.9).setAlpha(0.55); c.addAt(aw, 0); this.tweens.add({ targets: aw, alpha: 0.2, scale: 2.2, duration: 700, yoyo: true, repeat: -1 }); }
    if (d.buff > 0) { const bf = this.add.image(0, 0, 'glow').setTint(0xFF3848).setBlendMode('ADD').setScale(1.3 + d.buff * 0.5).setAlpha(0.35 + d.buff * 0.2); c.addAt(bf, 0); c.add(T(this, CS * 0.32, -CS * 0.36, `+${Math.round(d.buff * 100)}%`, 22, '#FF8A94', { w: 900 })); }
    c.die = d; c.key = `${d.id}_${d.type}_${d.pips}_${Math.round((d.buff || 0) * 10)}`; c.body = body;
    c.setSize(CS, CS);
    return c;
  }
  syncBoard() {
    const s = this.s;
    for (let i = 0; i < SLOTS; i++) {
      const d = s.board[i], v = this.dieViews[i];
      const key = d ? `${d.id}_${d.type}_${d.pips}_${Math.round((d.buff || 0) * 10)}` : null;
      if (v && (!d || v.key !== key)) { if (this.drag && this.drag.v === v) this.drag = null; v.destroy(); this.dieViews[i] = null; }
      if (d && !this.dieViews[i]) { const nv = this.makeDieView(i, d); this.dieViews[i] = nv; nv.setScale(0.5); this.tweens.add({ targets: nv, scale: 1, duration: 200, ease: 'Back.easeOut' }); }
      const cv = this.dieViews[i];
      // 끌고 있지 않은 주사위는 항상 제자리 (움직이는 연출 중이 아니면)
      if (cv && (!this.drag || this.drag.v !== cv) && !this.tweens.isTweening(cv)) { const [sx, sy] = this.slotXY(i); if (cv.x !== sx || cv.y !== sy) cv.setPosition(sx, sy).setDepth(10); }
      if (cv) cv.setAlpha(d.silenced > 0 ? 0.35 : this.drag && i !== this.drag.i && !(this.targets || []).includes(i) ? 0.3 : 1);
    }
  }

  // ── 위쪽 정보 ──
  makeHud() {
    const D = 50;
    iconBtn(this, W - 80, 92, 'i_pause', () => this.pause(), 96).setDepth(D);
    this.hWave = T(this, W / 2, 92, '', 54, C.text, { w: 900, ls: 2 }).setDepth(D);
    this.hSub = T(this, W / 2, 148, '', 26, C.sub, { w: 800 }).setDepth(D);
    this.hearts = [0, 1, 2].map(i => this.add.image(70 + i * 58, 92, 'i_flame').setDisplaySize(46, 46).setTint(0xFF5A7A).setDepth(D));
    this.livesT = T(this, 44, 132, '생명 3', 22, '#FF9BB0', { ox: 0, w: 900 }).setDepth(D);
    const tag = M.ARCADE[this.mode] ? M.ARCADE[this.mode].name : this.mode === 'daily' ? '오늘의 도전' : null;
    if (tag) T(this, 44, 166, tag, 22, C.gold, { ox: 0, w: 900 }).setDepth(D);
    this.hBoss = this.add.container(W / 2, 250).setDepth(D).setVisible(false);
    const bb = this.add.graphics(); bb.fillStyle(0x000000, 0.5).fillRoundedRect(-300, -16, 600, 32, 16);
    this.hBossFill = this.add.graphics(); this.hBossName = T(this, 0, -44, '', 30, '#FF9BB0', { w: 900 });
    this.hBoss.add([bb, this.hBossFill, this.hBossName]);
  }
  makeControls() {
    const D = 50, y0 = this.ctrlBase - 50;
    this.ctrlY = y0;
    // 길 안쪽 (판 아래): SP · 소환 → 다음 보스 예고
    const iy = this.BY + BH + 120, ix0 = this.BX - 10, ix1 = this.BX + BW + 10;
    const sg = this.add.graphics().setDepth(D - 1); sg.fillStyle(0x070A1E, 0.72).fillRoundedRect(ix0, iy - 84, ix1 - ix0, 168, 30).lineStyle(2, 0xB59BFF, 0.22).strokeRoundedRect(ix0, iy - 84, ix1 - ix0, 168, 30);
    this.add.image(ix0 + 50, iy - 6, 'i_star').setDisplaySize(40, 40).setTint(0xB59BFF).setDepth(D);
    T(this, ix0 + 30, iy + 44, 'SP', 22, C.dim, { ox: 0, w: 800, ls: 3 }).setDepth(D);
    this.hSp = T(this, ix0 + 80, iy - 6, '0', 48, C.text, { ox: 0, w: 900 }).setDepth(D);
    this.sumBtn = btn(this, ix1 - 170, iy - 12, 300, 118, '소환', () => this.doSummon(), { style: 'indigo', size: 42 }).setDepth(D);
    this.sumCost = T(this, ix1 - 170, iy + 62, '', 24, C.sub, { w: 800 }).setDepth(D);
    this.makeBossPreview(iy + 100, this.pathBottom - 60, ix0, ix1);
    // 덱 강화 버튼 5개
    this.makePower();
  }
  // 덱 강화 버튼 (덱 종류 수만큼 · 아레나에서 룬이 늘면 다시 그림)
  makePower() {
    const D = 50, y0 = this.ctrlY;
    if (this.pw) this.pw.forEach(p => p.c.destroy());
    const types = [...new Set(this.s.deck)];
    // 버튼처럼 보이게: 도톰한 몸통 + 아래 그림자 + "▲ 강화 · 가격" 알약 (강화할 수 있으면 금색으로 빛남)
    this.pw = types.map((t, i) => {
      const x = W / 2 + (i - (types.length - 1) / 2) * 196, c = this.add.container(x, y0).setDepth(D), col = RUNES[t].color;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.45).fillRoundedRect(-84, -60, 168, 146, 24);                       // 아래 그림자 (눌리는 버튼 느낌)
      g.fillStyle(0x1A2150, 1).fillRoundedRect(-86, -70, 172, 146, 24);
      g.fillStyle(0xFFFFFF, 0.07).fillRoundedRect(-80, -64, 160, 40, 18);                         // 위쪽 광택
      g.lineStyle(3, col, 0.85).strokeRoundedRect(-86, -70, 172, 146, 24);
      const glow = this.add.image(0, 0, 'glow').setTint(0xF5C451).setBlendMode('ADD').setScale(2.6, 2.2).setAlpha(0);
      const ic = this.add.image(-42, -26, `rune_${t}`).setDisplaySize(58, 58);
      const lv = T(this, 30, -40, 'Lv1', 26, C.text, { w: 900 });
      const nm = T(this, 30, -10, RUNES[t].name, 19, C.sub, { w: 800 });
      const pill = this.add.graphics();
      const cost = T(this, 0, 42, '', 24, C.text, { w: 900, shadow: false });
      c.add([glow, g, ic, lv, nm, pill, cost]); c.setSize(172, 150).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => c.setScale(0.94));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerup', () => { c.setScale(1); this.doPower(t); });
      return { t, c, lv, cost, pill, glow, state: '' };
    });
  }
  // 강화 버튼 상태 그리기 (상태가 바뀔 때만)
  drawPower(p, state, c) {
    if (p.state === state && p.cv === c) return;
    const first = p.state !== state; p.state = state; p.cv = c;
    p.pill.clear();
    if (state === 'max') { p.pill.fillStyle(0x2A3060, 1).fillRoundedRect(-74, 24, 148, 38, 19); p.cost.setText('MAX').setColor(C.gold); }
    else if (state === 'ok') { p.pill.fillStyle(0xC98612, 1).fillRoundedRect(-74, 28, 148, 38, 19).fillStyle(0xF5C451, 1).fillRoundedRect(-74, 23, 148, 38, 19); p.cost.setText(`▲ 강화 ${fmt(c)}`).setColor('#2A1A00'); }
    else { p.pill.fillStyle(0x2A3060, 1).fillRoundedRect(-74, 24, 148, 38, 19); p.cost.setText(`▲ ${fmt(c)}`).setColor(C.sub); }
    if (first) {
      if (p.pulse) { p.pulse.stop(); p.pulse = null; p.glow.setAlpha(0); }
      if (state === 'ok') p.pulse = this.tweens.add({ targets: p.glow, alpha: { from: 0.15, to: 0.45 }, duration: 600, yoyo: true, repeat: -1 });
    }
  }
  // 처음으로 강화할 수 있을 때 한 번 알려 줌
  powerHint(p) {
    const d = load(); if (d.tips.power || this.hinted || this.bot) return; this.hinted = true;
    const h = this.add.container(p.c.x, p.c.y - 120).setDepth(60);
    const bg = this.add.graphics(); bg.fillStyle(0xF5C451, 1).fillRoundedRect(-110, -30, 220, 56, 28).fillTriangle(-12, 24, 12, 24, 0, 40);
    h.add([bg, T(this, 0, -2, '눌러서 강화!', 26, '#2A1A00', { w: 900, shadow: false })]);
    this.tweens.add({ targets: h, y: h.y - 12, duration: 450, yoyo: true, repeat: 9, onComplete: () => h.destroy() });
    this.powerHintObj = h;
  }
  // 다음 보스 예고: 남은 공간에 보스 초상 · 이름 · 특징 · 웨이브 진행도
  makeBossPreview(y0, y1, x0, x1) {
    const h = Math.min(420, y1 - y0); if (h < 180) return;
    const cy = y0 + h / 2 + 10, D = 49;
    const g = this.add.graphics().setDepth(D); g.fillStyle(0x070A1E, 0.6).fillRoundedRect(x0, cy - h / 2, x1 - x0, h, 30).lineStyle(2, 0xFF9BB0, 0.18).strokeRoundedRect(x0, cy - h / 2, x1 - x0, h, 30);
    const ps = Math.min(h - 50, 300);
    this.bpImg = this.add.image(x0 + 30 + ps / 2, cy, 'boss_serpent').setDepth(D);
    this.bpGlow = this.add.image(x0 + 30 + ps / 2, cy, 'glow').setTint(0xFF5A7A).setBlendMode('ADD').setAlpha(0.35).setScale(ps / 60).setDepth(D);
    this.bpImg.setDepth(D + 1); this.bpSize = ps;
    const tx = x0 + 60 + ps;
    this.bpTag = T(this, tx, cy - h / 2 + 46, 'NEXT BOSS', 22, '#FF9BB0', { ox: 0, w: 900, ls: 5 }).setDepth(D);
    this.bpName = T(this, tx, cy - 40, '', 44, C.text, { ox: 0, w: 900 }).setDepth(D);
    this.bpTip = T(this, tx, cy + 14, '', 26, C.sub, { ox: 0, w: 800, wrap: x1 - tx - 30 }).setDepth(D);
    this.bpBar = this.add.graphics().setDepth(D); this.bpBarX = tx; this.bpBarW = x1 - tx - 40; this.bpBarY = cy + h / 2 - 50;
    this.bpWhen = T(this, tx, this.bpBarY - 30, '', 22, C.dim, { ox: 0, w: 800 }).setDepth(D);
    this.tweens.add({ targets: this.bpGlow, alpha: 0.15, duration: 1200, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.bpImg, y: cy - 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  updateBossPreview() {
    if (!this.bpImg) return;
    const s = this.s, B = BOSSES[(s.wave - 1) % BOSSES.length];
    if (this.bpId !== B.id) { this.bpId = B.id; this.bpImg.setTexture(`boss_${B.id}`); this.bpImg.setScale(this.bpSize / Math.max(this.bpImg.width, this.bpImg.height)); this.bpName.setText(B.name); this.bpTip.setText(this.bossTip(B.id)); }
    const k = s.phase === 'boss' ? 1 : Math.min(1, s.spawned / s.toSpawn);
    this.bpTag.setText(s.phase === 'boss' ? 'BOSS FIGHT' : 'NEXT BOSS');
    this.bpWhen.setText(s.phase === 'boss' ? '지금 싸우는 중!' : `등장까지 적 ${s.toSpawn - s.spawned}마리`);
    this.bpBar.clear().fillStyle(0xFFFFFF, 0.1).fillRoundedRect(this.bpBarX, this.bpBarY, this.bpBarW, 14, 7).fillStyle(0xFF5A7A, 1).fillRoundedRect(this.bpBarX, this.bpBarY, Math.max(14, this.bpBarW * k), 14, 7);
    this.bpImg.setAlpha(s.phase === 'boss' ? 0.45 : 1);
  }
  doSummon() { if (this.paused || this.s.over) return; const slot = this.s.summon(); if (slot == null) { audio.play('sfx_click', { volume: 0.3 }); return; } this.render(); }
  doPower(t) {
    if (this.paused || this.s.over) return;
    if (this.s.powerUp(t)) { this.powers++; const d = load(); if (!d.tips.power) { d.tips.power = 1; save(); } if (this.powerHintObj && this.powerHintObj.active) this.powerHintObj.destroy(); this.render(); }
    else { audio.play('sfx_click', { volume: 0.3 }); const c = this.s.powerCost(t); if (c != null) toast(this, `SP 가 ${fmt(c - this.s.sp)} 더 필요해요`, C.sub, this.ctrlY - 160); }
  }

  // ── 끌어서 합성 ──
  makeInput() {
    this.input.on('pointerdown', p => {
      if (this.paused || this.s.over || this.bot) return;
      const i = this.slotAt(p.x, p.y); if (i < 0 || !this.s.board[i]) return;
      const v = this.dieViews[i]; if (!v) return;
      this.drag = { i, v, ox: v.x, oy: v.y, moved: false };
      v.setDepth(30);
      // 합칠 수 있는 칸 표시
      this.hints = []; this.targets = [];
      const col = RUNES[this.s.board[i].type].color;
      for (let j = 0; j < SLOTS; j++) if (this.s.canMerge(i, j)) {
        const [x, y] = this.slotXY(j); this.targets.push(j);
        const ring = this.add.graphics().setDepth(29); ring.lineStyle(8, col, 1).strokeRoundedRect(x - CS / 2 + 4, y - CS / 2 + 4, CS - 8, CS - 8, 30);
        const h = this.add.image(x, y, 'glow').setTint(col).setBlendMode('ADD').setScale(2.1).setAlpha(0.7).setDepth(8);
        this.tweens.add({ targets: [h, ring], alpha: 0.35, duration: 360, yoyo: true, repeat: -1 }); this.hints.push(h, ring);
      }
      // 다른 주사위는 흐리게 (합칠 수 있는 것만 또렷)
      this.dieViews.forEach((dv, j) => { if (dv && j !== i && !this.targets.includes(j)) dv.setAlpha(0.35); });
      if (!this.targets.length) this.mergeHelp(i);
    });
    this.input.on('pointermove', p => { if (!this.drag || !p.isDown) return; this.drag.moved = this.drag0moved = true; this.drag.v.setPosition(p.x, p.y - 30); });
    const drop = p => {
      if (!this.drag) return;
      const { i, v, ox, oy } = this.drag; this.drag = null; this.drag0moved = this.drag0moved && v.active;
      (this.hints || []).forEach(h => h.destroy()); this.hints = [];
      // 끌어 놓은 위치에서 가장 가까운 합성 가능 칸 (칸 크기만큼 너그럽게)
      let j = -1, bd = CS * 0.95;
      for (const t of this.targets || []) { const [x, y] = this.slotXY(t), dd = Math.hypot(x - v.x, y - v.y); if (dd < bd) { bd = dd; j = t; } }
      this.targets = [];
      if (j >= 0) { this.s.merge(i, j); this.render(); }
      else if (v.active) {
        v.setDepth(10); this.tweens.add({ targets: v, x: ox, y: oy, duration: 150, ease: 'Cubic.easeOut' });
        const k = this.slotAt(v.x, v.y);
        if (this.drag0moved && k >= 0 && k !== i && this.s.board[k]) this.mergeHelp(i, k);
      }
    };
    this.input.on('pointerup', drop);
    // 손가락이 화면 밖에서 떨어져도 놓은 것으로 (안 그러면 주사위 그림이 엉뚱한 곳에 남아 칸이 비어 보임)
    this.input.on('pointerupoutside', drop);
    this.input.on('gameout', () => { if (this.drag && !this.input.activePointer.isDown) drop(this.input.activePointer); });
    this.game.events.on('blur', this.cancelDrag, this);
    this.game.events.on('hidden', this.cancelDrag, this);
    this.events.once('shutdown', () => { this.game.events.off('blur', this.cancelDrag, this); this.game.events.off('hidden', this.cancelDrag, this); });
  }
  // 끌던 것 취소: 표시 지우고 주사위는 제자리로
  cancelDrag() {
    if (!this.drag) return;
    const { v, ox, oy } = this.drag; this.drag = null; this.targets = [];
    (this.hints || []).forEach(h => h.destroy()); this.hints = [];
    if (v && v.active) { v.setDepth(10).setPosition(ox, oy); }
  }
  // 왜 안 되는지 알려줌
  mergeHelp(i, k) {
    const A = this.s.board[i], B = k != null ? this.s.board[k] : null, [x, y] = this.slotXY(k ?? i);
    let msg = '같은 룬 · 같은 눈끼리 겹치면 합성돼요';
    if (A && A.pips >= MAX_PIPS) msg = '7눈은 최대예요';
    else if (A && B && A.type !== B.type) msg = `${RUNES[A.type].name}은(는) ${RUNES[A.type].name}끼리만 합성돼요`;
    else if (A && B && A.pips !== B.pips) msg = '눈 수가 같아야 합성돼요';
    else if (A && k == null) msg = `짝이 없어요 — ${RUNES[A.type].name} ${A.pips}눈을 하나 더 만드세요`;
    audio.play('sfx_click', { volume: 0.4 });
    if (k != null) { const dv = this.dieViews[k]; if (dv) this.tweens.add({ targets: dv, x: dv.x + 10, duration: 50, yoyo: true, repeat: 2 }); }
    toast(this, msg, '#FFB0A0', this.BY - 120);
  }
  slotAt(x, y) {
    for (let i = 0; i < SLOTS; i++) { const [sx, sy] = this.slotXY(i); if (Math.abs(x - sx) < CS / 2 + 6 && Math.abs(y - sy) < CS / 2 + 6) return i; }
    return -1;
  }

  // ── 진행 ──
  update(time, dms) {
    if (this.paused || this.ended) return;
    this.acc += Math.min(0.1, dms / 1000);
    let n = 0;
    while (this.acc >= DT && n++ < 6) { this.acc -= DT; this.s.step(DT); for (const e of this.s.events) this.onEvent(e); this.s.events.length = 0; if (this.s.over) break; }
    this.render(); this.drawEnemies(); this.flow(time);
    if ((this.manaT = (this.manaT || 0) - dms) <= 0) { this.manaT = 1800; for (let i = 0; i < SLOTS; i++) { const d = this.s.board[i]; if (d && d.type === 'mana' && !(d.silenced > 0)) { const [x, y] = this.slotXY(i); this.float(x, y - 60, `+${Math.round(RUNES.mana.spGen * d.pips * 1.8)} SP`, '#8FE3FF', 26); } } }
    if (this.s.over && !this.ended) this.gameOver();
  }
  flow(t) { for (const dt of this.flowDots) { const k = (dt.k + t / 14000) % 1; const [x, y] = this.pathXY(k); dt.setPosition(x, y); } }
  render() {
    const s = this.s;
    this.syncBoard();
    this.hWave.setText(this.mode === "rush" ? `BOSS ${s.wave}` : `WAVE ${s.wave}`);
    this.hSub.setText(s.phase === 'boss' ? '보스전' : `남은 적 ${Math.max(0, s.toSpawn - s.spawned) + s.enemies.filter(e => e.kind !== 'boss').length}`);
    this.hSp.setText(s.sp >= 100000 ? `${Math.floor(s.sp / 1000)}k` : fmt(s.sp));
    const cost = s.summonCost(), full = !s.emptySlots().length;
    this.sumBtn.setEnabled(!full && s.sp >= cost); this.sumCost.setText(full ? '판이 가득 찼어요 · 끌어서 합성' : `${fmt(cost)} SP`);
    this.hearts.forEach((h, i) => h.setAlpha(i < s.lives ? 1 : 0.15)); this.livesT.setText(`생명 ${s.lives}`);
    this.updateBossPreview();
    for (const p of this.pw) { const lv = s.power[p.t], c = s.powerCost(p.t), st = c == null ? 'max' : s.sp >= c ? 'ok' : 'no'; p.lv.setText(`Lv${lv + 1}`); this.drawPower(p, st, c); if (st === 'ok' && s.wave >= 2) this.powerHint(p); }
  }
  // 적 그리기 + 움직임: 정령은 둥실 · 임프는 뛰어다님 · 골렘은 쿵쿵 · 보스는 숨쉬며 흔들림. 진행 방향을 바라봄
  drawEnemies() {
    const s = this.s, seen = new Set(), t = this.time.now / 1000;
    let boss = null;
    for (const e of s.enemies) {
      seen.add(e.id);
      let v = this.ePool.get(e.id);
      if (!v) {
        const key = e.kind === 'boss' ? `boss_${e.boss}` : EN_KEY[e.kind], c = this.add.container(0, 0).setDepth(e.kind === 'boss' ? 22 : 20);
        const sh = this.add.image(0, EN_SIZE[e.kind] * 0.38, 'glow').setTint(0x000000).setAlpha(0.5).setScale(e.kind === 'boss' ? 2.2 : 1.1, e.kind === 'boss' ? 0.7 : 0.4);
        const aura = this.add.image(0, 0, 'glow').setTint(e.kind === 'boss' ? 0xFF4A6A : e.kind === 'normal' ? 0xB890FF : e.kind === 'fast' ? 0xFF6A4A : 0x40D8FF).setBlendMode('ADD').setAlpha(0.5).setScale(EN_SIZE[e.kind] / 60);
        const img = this.add.image(0, 0, key); img.setScale(EN_SIZE[e.kind] / Math.max(img.width, img.height));
        const hb = this.add.graphics();
        // 어두운 그림은 배경에 묻히지 않게 같은 그림을 더하기 혼합으로 한 겹 더 (밝기 ↑)
        const lit = this.add.image(0, 0, key).setScale(img.scaleX).setBlendMode('ADD').setAlpha(e.kind === 'normal' ? 0.75 : e.kind === 'fast' ? 0.55 : 0.2);
        c.add([sh, aura, img, lit, hb]); Object.assign(c, { img, lit, hb, sh, aura, k: img.scaleX, kind: e.kind, ph: Math.random() * 6, kick: 0, flashT: 0 });
        v = c; this.ePool.set(e.id, c);
        // 등장: 바닥에서 솟아오름
        c.setAlpha(0); img.setScale(c.k * 0.3); this.tweens.add({ targets: c, alpha: 1, duration: 220 }); this.tweens.add({ targets: img, scaleX: c.k, scaleY: c.k, duration: 260, ease: 'Back.easeOut' });
      }
      const [x, y] = this.pathXY(e.d), [x2, y2] = this.pathXY(Math.min(1, e.d + 0.003));
      const dx = x2 - x, ph = t * (e.kind === 'fast' ? 13 : e.kind === 'big' ? 4 : 6) * (1 - e.slow * 0.6) + v.ph;
      let oy = 0, sx = 1, sy = 1, rot = 0;
      if (e.kind === 'normal') { oy = Math.sin(ph) * 8 - 6; sx = 1 + Math.sin(ph * 2) * 0.04; sy = 1 - Math.sin(ph * 2) * 0.04; rot = Math.sin(ph * 0.7) * 0.12; v.aura.setAlpha(0.45 + Math.sin(ph * 2) * 0.15); }
      else if (e.kind === 'fast') { const hop = Math.abs(Math.sin(ph)); oy = -hop * 14; sx = 1 + (1 - hop) * 0.1; sy = 1 - (1 - hop) * 0.1; rot = (dx >= 0 ? 1 : -1) * 0.15; }
      else if (e.kind === 'big') { const st = Math.max(0, Math.sin(ph)); oy = -st * 6; sy = 1 - (1 - st) * 0.06; sx = 1 + (1 - st) * 0.05; rot = Math.sin(ph * 0.5) * 0.05; if (Math.sin(ph) > 0.98 && !v.stepped) { v.stepped = true; this.dust(x, y + EN_SIZE.big * 0.35); } if (Math.sin(ph) < 0) v.stepped = false; }
      else { const br = Math.sin(t * 2.4 + v.ph); sx = 1 + br * 0.03; sy = 1 + br * 0.04; rot = Math.sin(t * 1.3) * 0.05; oy = br * 4; }
      // 맞으면 살짝 뒤로
      v.kick *= 0.82; const kb = v.kick * 10;
      v.setPosition(x - (dx >= 0 ? kb : -kb) * 0.3, y);
      v.img.setPosition(0, oy).setScale(v.k * sx * (dx < -0.5 ? -1 : 1), v.k * sy).setRotation(rot);
      v.lit.setPosition(0, oy).setScale(v.img.scaleX, v.img.scaleY).setRotation(rot).setVisible(!(v.flashT > this.time.now));
      v.sh.setScale((e.kind === 'boss' ? 2.2 : 1.1) * (1 + oy / 60), (e.kind === 'boss' ? 0.7 : 0.4) * (1 + oy / 60));
      if (!(v.flashT > this.time.now)) v.img.setTint(e.stun > 0 ? 0x9FDFFF : e.shieldOn > 0 ? 0xFFE08A : e.vulnT > 0 ? 0xF0A8FF : e.slow > 0.05 ? 0xA8E6FF : e.poison > 1 ? 0xB8FFA8 : 0xFFFFFF);
      v.img.setAlpha(e.hidden > 0 ? 0.22 : 1); if (e.hidden > 0) v.lit.setVisible(false);
      if (e.regenOn && Math.random() < 0.06) this.float(x + (Math.random() - 0.5) * 60, y - 40, '+', '#7CFFB2', 30);
      if (e.critT > 0) { e.critT = 0; if (Math.random() < 0.5) this.float(x + (Math.random() - 0.5) * 40, y - EN_SIZE[e.kind] / 2 - 20, '치명!', '#FF8FCB', 30); }
      if (e.kind !== 'boss') { const w = 70, k = Math.max(0, e.hp / e.max), hy = -EN_SIZE[e.kind] / 2 - 14 + oy; v.hb.clear(); if (k < 1) v.hb.fillStyle(0x000000, 0.6).fillRoundedRect(-w / 2, hy, w, 8, 4).fillStyle(0xFF5A7A).fillRoundedRect(-w / 2, hy, w * k, 8, 4); }
      else boss = e;
      if (e.kind === 'boss' && e.shieldOn > 0) v.aura.setTint(0xFFE08A).setAlpha(0.7); else if (e.kind === 'boss') v.aura.setTint(0xFF4A6A).setAlpha(0.3 + Math.sin(t * 3) * 0.1);
    }
    for (const [id, v] of this.ePool) if (!seen.has(id)) {
      this.ePool.delete(id);
      // 사라짐: 하얗게 → 찌그러지며 터짐
      v.img.setTintFill(0xFFFFFF); v.lit.setVisible(false);
      this.tweens.add({ targets: v.img, scaleY: v.img.scaleY * 0.2, scaleX: v.img.scaleX * 1.5, duration: 120, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: v, alpha: 0, duration: 160, delay: 80, onComplete: () => v.destroy() });
      this.spark.setParticleTint(v.kind === 'boss' ? 0xFFD27A : 0xC9A6FF); this.spark.emitParticleAt(v.x, v.y, v.kind === 'big' ? 12 : 7);
    }
    // 서리 군주 냉기: 판 위에 푸른 서리막
    if (!this.chillFx) { this.chillFx = this.add.rectangle(this.BX + BW / 2, this.BY + BH / 2, BW + 44, BH + 44, 0x8FD8FF, 0).setDepth(12).setBlendMode('ADD'); }
    this.chillFx.setFillStyle(0x8FD8FF, s.chillT > 0 ? 0.12 + 0.05 * Math.sin(t * 8) : 0);
    // 지뢰
    this.minePool ||= new Map(); const ms = new Set();
    for (const m of s.mines) { ms.add(m.id); let o = this.minePool.get(m.id); if (!o) { const [mx, my] = this.pathXY(m.d); o = this.add.image(mx, my, 'rune_mine').setDisplaySize(68, 68).setDepth(15); o.setScale(0.01); this.tweens.add({ targets: o, scale: 68 / o.width, duration: 220, ease: 'Back.easeOut' }); this.minePool.set(m.id, o); } o.setAngle(t * 60); }
    for (const [id, o] of this.minePool) if (!ms.has(id)) { this.minePool.delete(id); o.destroy(); }
    this.hBoss.setVisible(!!boss);
    if (boss) { this.hBossName.setText(boss.name + (boss.shieldOn > 0 ? '  · 방패' : '')); this.hBossFill.clear().fillStyle(0xFF5A7A).fillRoundedRect(-296, -12, 592 * Math.max(0, boss.hp / boss.max), 24, 12); }
  }
  dust(x, y) { for (let k = 0; k < 3; k++) { const d = this.add.image(x + (k - 1) * 22, y, 'glow').setTint(0x8A8070).setAlpha(0.4).setScale(0.3).setDepth(19); this.tweens.add({ targets: d, scale: 0.7, y: y - 10, alpha: 0, duration: 400, onComplete: () => d.destroy() }); } }
  voice() { /* 원작처럼 성우 대사 없음 — 효과음으로만 */ }
  // 탄: 원소색 빛구슬 + 꼬리, 명중하면 원소별 효과
  shotFx(slot, target, n, type) {
    const [x0, y0] = this.slotXY(slot), v = this.ePool.get(target); if (!v) return;
    const col = RUNES[type].color, cnt = Math.min(n, 3);
    const dv = this.dieViews[slot]; if (dv && !this.drag) { dv.setScale(1.08); this.tweens.add({ targets: dv, scale: 1, duration: 120, ease: 'Quad.easeOut' }); }
    if (this.bolts.length > 45) { this.impact(type, v.x, v.y, target); return; }
    // 등급이 높을수록 탄이 크고 꼬리가 길고 빛가루를 흘림 (전설은 혜성처럼)
    const rar = RARITY[type] || 0, busy = this.bolts.length > 30, fx = busy ? Math.min(rar, 1) : rar;
    for (let k = 0; k < cnt; k++) {
      const b = this.add.image(x0, y0, 'bolt').setTint(col).setBlendMode('ADD').setScale(0.5 + n * 0.04 + fx * 0.12).setDepth(35);
      const tails = [];
      for (let q = 0; q < 1 + fx; q++) tails.push(this.add.image(x0, y0, 'bolt').setTint(q === 2 ? 0xFFFFFF : col).setBlendMode('ADD').setScale(0.3 + fx * 0.06 - q * 0.05).setAlpha(0.5 - q * 0.1).setDepth(34));
      this.bolts.push(b);
      const tx = v.x + (k - 1) * 10, ty = v.y + (k - 1) * 6, dur = 150 + k * 35;
      tails.forEach((tail, q) => this.tweens.add({ targets: tail, x: tx, y: ty, duration: dur + 40 + q * 35, ease: 'Quad.easeIn', onComplete: () => tail.destroy() }));
      let f = 0;
      this.tweens.add({ targets: b, x: tx, y: ty, duration: dur, ease: 'Quad.easeIn', onUpdate: () => { if (fx >= 2 && (f++ % (fx === 3 ? 2 : 3)) === 0) { this.spark.setParticleTint(f % 4 ? col : 0xFFFFFF); this.spark.emitParticleAt(b.x, b.y, 1); } }, onComplete: () => {
        b.destroy(); this.bolts.splice(this.bolts.indexOf(b), 1);
        if (k === 0) this.impact(type, tx, ty, target);
      } });
    }
  }
  // 명중 효과: 고유 연출이 있는 룬은 그대로, 나머지는 능력 유형(연쇄·독·감속·범위·관통·무거운 일격·속사)에 맞춰 룬 색으로
  impact(type, x, y, target) {
    const col = RUNES[type].color, v = this.ePool.get(target), R0 = RUNES[type], rar = RARITY[type] || 0;
    if (v) this.hitFlash(v);
    const OWN = ['flame', 'frost', 'storm', 'venom', 'gale', 'iron', 'pierce', 'time', 'hammer'];
    const kind = OWN.includes(type) ? type : R0.chain ? 'storm' : R0.poison ? 'venom' : (R0.slow || R0.stun) ? 'frost' : R0.splash ? 'flame' : R0.pierce ? 'pierce' : (R0.boss || R0.bigX || R0.dmg >= 30) ? 'iron' : R0.rate >= 1.3 ? 'gale' : (R0.push ? 'time' : 'default');
    const own = kind === type, tc = fixed => own ? fixed : col;
    // 등급 연출: 영웅은 불꽃이 더 튀고, 전설은 충격파 + 섬광 (너무 잦지 않게)
    if (rar >= 2 && this.time.now - (this.rarFxT || 0) > (rar === 3 ? 70 : 110)) {
      this.rarFxT = this.time.now;
      this.spark.setParticleTint(col); this.spark.emitParticleAt(x, y, rar === 3 ? 8 : 4);
      if (rar === 3) {
        const sw = this.add.image(x, y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.2).setAlpha(1).setDepth(37); this.tweens.add({ targets: sw, scale: 1.5, alpha: 0, duration: 340, ease: 'Cubic.easeOut', onComplete: () => sw.destroy() });
        const fl = this.add.image(x, y, 'glow').setTint(tc(0xFFFFFF)).setBlendMode('ADD').setScale(0.6).setAlpha(0.9).setDepth(37); this.tweens.add({ targets: fl, scale: 1.4, alpha: 0, duration: 200, onComplete: () => fl.destroy() });
      }
    }
    const ring = (sc, a, d) => { const r = this.add.image(x, y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.15).setAlpha(a).setDepth(36); this.tweens.add({ targets: r, scale: sc, alpha: 0, duration: d, onComplete: () => r.destroy() }); };
    switch (kind) {
      case 'flame': {   // 작은 폭발 + 불꽃 (광역)
        audio.play('sfx_fire', { volume: 0.3, gap: 90 });
        const f = this.add.image(x, y, 'glow').setTint(tc(0xFF7A2E)).setBlendMode('ADD').setScale(0.3).setDepth(36);
        this.tweens.add({ targets: f, scale: 1.6, alpha: 0, duration: 260, onComplete: () => f.destroy() });
        ring(0.55, 0.8, 260); this.spark.setParticleTint(tc(0xFFB24A)); this.spark.emitParticleAt(x, y, 5); break;
      }
      case 'frost': {   // 서리 결정이 퍼지고 적이 파래짐
        audio.play('sfx_ice', { volume: 0.28, gap: 100 });
        for (let k = 0; k < 4; k++) { const sh = this.add.image(x, y, 'flake').setTint(tc(0xBFEFFF)).setBlendMode('ADD').setScale(0.35).setDepth(36); const a = k * Math.PI / 2 + Math.random(); this.tweens.add({ targets: sh, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, angle: 120, alpha: 0, duration: 320, onComplete: () => sh.destroy() }); }
        ring(0.4, 0.7, 220); break;
      }
      case 'storm': {   // 근처 적으로 번개 줄기
        audio.play('sfx_zap', { volume: 0.28, gap: 90 });
        const near = [...this.ePool.entries()].filter(([id]) => id !== target).map(([, o]) => o).sort((a, b) => Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y)).slice(0, 2);
        const g = this.add.graphics().setDepth(37).setBlendMode('ADD');
        const bolt = (x1, y1, x2, y2) => { g.lineStyle(4, tc(0xFFF4A0), 1); g.beginPath(); g.moveTo(x1, y1); const n = 5; for (let i = 1; i < n; i++) g.lineTo(x1 + (x2 - x1) * i / n + (Math.random() - 0.5) * 26, y1 + (y2 - y1) * i / n + (Math.random() - 0.5) * 26); g.lineTo(x2, y2); g.strokePath(); };
        let px = x, py = y; for (const o of near) { bolt(px, py, o.x, o.y); this.hitFlash(o); px = o.x; py = o.y; }
        this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
        ring(0.35, 0.9, 160); break;
      }
      case 'venom': {   // 독 구름
        audio.play('sfx_poison', { volume: 0.25, gap: 110 });
        for (let k = 0; k < 3; k++) { const c = this.add.image(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, 'glow').setTint(tc(0x7CE36A)).setAlpha(0.55).setScale(0.35).setDepth(36); this.tweens.add({ targets: c, scale: 0.8, y: c.y - 30, alpha: 0, duration: 600, delay: k * 60, onComplete: () => c.destroy() }); }
        break;
      }
      case 'gale': {    // 빠른 바람 베기
        audio.play('sfx_hit', { volume: 0.25, gap: 50, rate: 1.4 });
        const sl = this.add.rectangle(x, y, 70, 5, tc(0xD8FFF6), 0.9).setAngle(-30 + Math.random() * 60).setBlendMode('ADD').setDepth(37);
        this.tweens.add({ targets: sl, scaleX: 1.6, alpha: 0, duration: 140, onComplete: () => sl.destroy() }); break;
      }
      case 'iron': {    // 묵직한 타격 · 쇳조각 불꽃
        audio.play('sfx_clank', { volume: 0.35, gap: 90 });
        ring(0.6, 1, 200); this.spark.setParticleTint(tc(0xFFFFFF)); this.spark.emitParticleAt(x, y, 7);
        if (v && v.kind === 'boss') this.cameras.main.shake(70, 0.002); break;
      }
      case 'pierce': {  // 길을 따라 꿰뚫는 빛줄기
        audio.play('sfx_hit', { volume: 0.28, gap: 60, rate: 1.2 });
        const behind = this.s.enemies.filter(o => o.id !== target && o.hp > 0 && o.d < (this.s.enemies.find(q => q.id === target) || { d: 0 }).d && (this.s.enemies.find(q => q.id === target).d - o.d) < (R0.pierce || 0.1)).map(o => this.ePool.get(o.id)).filter(Boolean);
        const g = this.add.graphics().setDepth(37).setBlendMode('ADD'); let px = x, py = y;
        for (const o of behind) { g.lineStyle(6, tc(0xFFF0B8), 0.9).lineBetween(px, py, o.x, o.y); this.hitFlash(o); px = o.x; py = o.y; }
        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() }); ring(0.4, 0.9, 180); break;
      }
      case 'time': {    // 시계 고리가 퍼지며 뒤로 밀어냄
        audio.play('sfx_ice', { volume: 0.22, gap: 120, rate: 0.7 });
        ring(0.8, 0.9, 380); ring(0.5, 0.6, 300); break;
      }
      case 'hammer': {  // 무거운 내려찍기
        audio.play('sfx_clank', { volume: 0.4, gap: 120, rate: 0.75 });
        ring(0.9, 1, 260); this.spark.setParticleTint(tc(0xFFC27A)); this.spark.emitParticleAt(x, y, 9);
        if (v && v.kind === 'boss') this.cameras.main.shake(90, 0.003); break;
      }
      default: { audio.play('sfx_hit', { volume: 0.25, gap: 50 }); ring(0.35, 0.8, 200); this.spark.setParticleTint(col); this.spark.emitParticleAt(x, y, 3); }
    }
  }
  // 영웅·전설 주사위가 나타날 때 연출
  rarityPop(x, y, type) {
    const rar = RARITY[type] || 0, col = RUNES[type].color; if (rar < 2) return;
    const ry = this.add.image(x, y, 'rays').setTint(col).setBlendMode('ADD').setScale(0.15).setAlpha(rar === 3 ? 0.9 : 0.6).setDepth(37);
    this.tweens.add({ targets: ry, scale: rar === 3 ? 0.9 : 0.6, angle: 90, alpha: 0, duration: rar === 3 ? 700 : 450, onComplete: () => ry.destroy() });
    this.spark.setParticleTint(col); this.spark.emitParticleAt(x, y, rar === 3 ? 16 : 8);
    if (rar === 3 && this.time.now - (this.popT || 0) > 1500) { this.popT = this.time.now; audio.play('sfx_awaken', { volume: 0.4, rate: 1.4, gap: 300 }); this.float(x, y - 80, `전설 · ${RUNES[type].name}`, '#FFD86A', 28); }
  }
  // 맞은 적: 하얗게 번쩍 + 살짝 뒤로 밀림
  hitFlash(v) {
    if (!v.img || v.flashT > this.time.now) return;
    v.flashT = this.time.now + 70;
    v.img.setTintFill(0xFFFFFF); v.kick = 1;
    this.time.delayedCall(55, () => { if (v.img && v.img.active) v.img.clearTint(); });
  }
  onEvent(e) {
    switch (e.type) {
      case 'summon': audio.play('sfx_summon', { volume: 0.55, gap: 40 }); { const [sx2, sy2] = this.slotXY(e.slot); this.rarityPop(sx2, sy2, e.die.type); } if (e.free) { const [x, y] = this.slotXY(e.slot); this.float(x, y - 70, '소환사!', '#9AA6FF'); this.spark.setParticleTint(0x6F7CFF); this.spark.emitParticleAt(x, y, 10); } break;
      case 'shot': audio.play('sfx_pew', { volume: 0.22, gap: 55, rate: 0.85 + e.die.pips * 0.06 + Math.random() * 0.1 }); this.shotFx(e.slot, e.target, e.n, e.die.type); break;
      case 'merge': {
        const [x, y] = this.slotXY(e.to), col = RUNES[e.die.type].color;
        audio.play('sfx_merge', { volume: 0.7 }); buzz(20);
        this.spark.setParticleTint(col); this.spark.emitParticleAt(x, y, 14);
        const ring = this.add.image(x, y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.4).setDepth(36); this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
        if (e.sp) this.float(x, y - 60, `+${fmt(e.sp)} SP`, C.gold);
        if (e.die.pips >= MAX_PIPS) this.awaken(x, y, col);
        else { if (e.die.pips >= 5) this.voice('merge', 1); this.rarityPop(x, y, e.die.type); }
        break;
      }
      case 'grow': { const [x, y] = this.slotXY(e.slot); this.float(x, y - 60, '성장!', C.green); if (e.die.pips >= MAX_PIPS) this.awaken(x, y, RUNES.growth.color); break; }
      case 'power': { audio.play('sfx_power', { volume: 0.6 }); const p = this.pw.find(q => q.t === e.type); if (p) { this.tweens.add({ targets: p.c, scale: 1.12, duration: 90, yoyo: true }); } for (let i = 0; i < SLOTS; i++) { const d = this.s.board[i]; if (d && d.type === e.type) { const [x, y] = this.slotXY(i); this.spark.setParticleTint(RUNES[d.type].color); this.spark.emitParticleAt(x, y, 4); } } break; }
      case 'kill': { audio.play('sfx_pop', { volume: 0.45, gap: 40, rate: 0.9 + Math.random() * 0.25 }); const [x, y] = this.pathXY(e.d); if (e.bounty && e.kind !== 'boss') this.float(x, y - 50, `+${e.sp}`, '#FFD54A', 26); if (e.kind === 'boss') this.bossDown(x, y); else if (e.kind === 'big') this.float(x, y - 50, `+${e.sp}`, C.sub); break; }
      case 'leak': {
        audio.play('sfx_leak', { volume: 0.7 }); buzz(60); this.cameras.main.shake(200, 0.008); this.cameras.main.flash(160, 120, 0, 30); this.leakedWave = true; if (this.s.lives === 1) this.voice('danger', 3);
        const [gx, gy] = this.pathXY(0.99);
        this.float(gx - 60, gy - 110, `${e.kind === 'boss' ? '보스가 ' : ''}제단에 닿았어요! 생명 -${e.loss}`, '#FF7A8A', 30);
        if (this.s.lives > 0) toast(this, this.s.lives === 1 ? '마지막 생명! 적이 제단에 닿으면 끝나요' : `남은 생명 ${this.s.lives}`, '#FF9BB0', this.BY - 90);
        for (let k = Math.max(0, this.s.lives); k < Math.min(3, this.s.lives + e.loss); k++) { const h = this.hearts[k], s0 = 46 / h.width; this.tweens.add({ targets: h, scale: s0 * 1.8, duration: 200, yoyo: true, onComplete: () => h.setScale(s0) }); }
        if (this.s.lives === 1 && !this.danger) {   // 마지막 생명: 화면 가장자리가 붉게 숨 쉼
          const v = this.add.graphics().setDepth(90); for (let k = 0; k < 6; k++) v.lineStyle(30, 0xFF2040, 0.12 - k * 0.018).strokeRect(k * 26, k * 26, W - k * 52, H - k * 52);
          this.danger = v; this.tweens.add({ targets: v, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
        }
        break;
      }
      case 'wave': if (e.wave > 1) audio.music('bgm_game', this); break;
      case 'boss': audio.play('sfx_boss', { volume: 0.8 }); this.voice('boss', 3); audio.music('bgm_boss', this); this.banner(e.name, BOSSES.find(b => b.id === e.boss) ? this.bossTip(e.boss) : '', '#FF9BB0'); this.cameras.main.shake(300, 0.006); break;
      case 'waveClear': {
        audio.play('sfx_wave', { volume: 0.7 });
        if (!this.leakedWave && e.wave % 5 === 0) { this.voice('perfect', 2); this.banner('PERFECT DEFENSE', `웨이브 ${e.wave} 무피해 · +${e.sp} SP`, '#7CFFB2'); }
        else { this.voice('wave', 2); this.banner(`WAVE ${e.wave} CLEAR`, `+${e.sp} SP`, '#FFE07A'); }
        this.leakedWave = false;
        if (this.mode === 'arena' && e.wave % 3 === 0 && this.s.deck.length < 5) this.time.delayedCall(900, () => this.arenaPick());
        if (e.wave + 1 > load().best && load().best > 0 && !this.recordSaid && this.mode !== 'daily') { this.recordSaid = true; this.time.delayedCall(1400, () => { this.voice('record', 3); toast(this, '최고 기록 갱신!', C.gold, 300); }); }
        break;
      }
      case 'silence': audio.play('sfx_silence', { volume: 0.6 }); for (const i of e.slots) { const [x, y] = this.slotXY(i); this.float(x, y, '봉인', '#C9A6FF'); } break;
      case 'morph': audio.play('sfx_silence', { volume: 0.5, rate: 1.25 }); for (const i of e.slots) { const [x, y] = this.slotXY(i); this.float(x, y, '변신!', '#C9A6FF'); } break;
      case 'shield': audio.play('sfx_power', { volume: 0.4, rate: 0.7 }); break;
      case 'dash': this.cameras.main.shake(120, 0.004); break;
      case 'mine': { const [x0, y0] = this.slotXY(e.slot), [x1, y1] = this.pathXY(e.d); const b = this.add.image(x0, y0, 'bolt').setTint(0xFFA43A).setBlendMode('ADD').setScale(0.6).setDepth(35); this.tweens.add({ targets: b, x: x1, y: y1, duration: 260, ease: 'Quad.easeOut', onComplete: () => b.destroy() }); break; }
      case 'boom': { const [x, y] = this.pathXY(e.d); audio.play('sfx_fire', { volume: 0.5, gap: 60, rate: 0.8 }); const f = this.add.image(x, y, 'glow').setTint(0xFF8A2E).setBlendMode('ADD').setScale(0.4).setDepth(36); this.tweens.add({ targets: f, scale: 2.2, alpha: 0, duration: 340, onComplete: () => f.destroy() }); const r = this.add.image(x, y, 'ring').setTint(0xFFB24A).setBlendMode('ADD').setScale(0.2).setDepth(36); this.tweens.add({ targets: r, scale: 1.2, alpha: 0, duration: 320, onComplete: () => r.destroy() }); this.spark.setParticleTint(0xFFB24A); this.spark.emitParticleAt(x, y, 10); this.cameras.main.shake(80, 0.003); break; }
      case 'telegraph': this.telegraph(e); break;
      case 'quake': {   // 전체 공격: 지진류는 흔들림+먼지, 나머지는 룬 색 물결
        const ty = e.type || 'quake', col = RUNES[ty].color, earthy = ty === 'quake' || ty === 'earthspike';
        if (earthy) { audio.play('sfx_clank', { volume: 0.4, gap: 200, rate: 0.55 }); this.cameras.main.shake(140, 0.004); }
        else audio.play(ty === 'blizzard' ? 'sfx_ice' : 'sfx_zap', { volume: 0.3, gap: 220, rate: 0.7 });
        for (const en of this.s.enemies) { const v = this.ePool.get(en.id); if (!v) continue; this.hitFlash(v); if (earthy) this.dust(v.x, v.y + 30); else { const r = this.add.image(v.x, v.y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.2).setDepth(36); this.tweens.add({ targets: r, scale: 0.9, alpha: 0, duration: 320, onComplete: () => r.destroy() }); } }
        break;
      }
      case 'forge': { const [x, y] = this.slotXY(e.slot); this.float(x, y - 80, '단조 +1!', '#FFB060'); this.spark.setParticleTint(0xFFA040); this.spark.emitParticleAt(x, y, 12); break; }
      case 'bell': { audio.play('sfx_power', { volume: 0.6, rate: 1.5 }); const [x, y] = this.slotXY(e.slot); const r = this.add.image(x, y, 'ring').setTint(0xF8D050).setBlendMode('ADD').setScale(0.3).setDepth(38); this.tweens.add({ targets: r, scale: 6, alpha: 0, duration: 500, onComplete: () => r.destroy() }); this.float(x, y - 80, '일제 사격!', '#F8D050'); break; }
      case 'battery': { const [x, y] = this.slotXY(e.slot); this.float(x, y - 60, `+${e.sp} SP`, '#6AF06A', 28); break; }
      case 'execute': { const [x, y] = this.pathXY(e.d); if (Math.random() < 0.5) this.float(x, y - 60, '처형!', '#3FD8B0', 28); break; }
      case 'judge': { const v = this.ePool.get(e.id); audio.play('sfx_clank', { volume: 0.5, rate: 1.3 }); if (v) { const b = this.add.rectangle(v.x, v.y - 400, 26, 800, 0xFFF0C0, 0.9).setBlendMode('ADD').setDepth(38); this.tweens.add({ targets: b, alpha: 0, scaleX: 3, duration: 380, onComplete: () => b.destroy() }); this.float(v.x, v.y - 100, '심판!', '#FFF0C0', 36); } break; }
      case 'timeStop': { audio.play('sfx_silence', { volume: 0.5, rate: 0.7 }); this.cameras.main.flash(160, 120, 220, 210); this.float(W / 2, this.BY - 60, '시간 정지!', '#60D0C8', 40); break; }
      case 'heal': audio.play('sfx_awaken', { volume: 0.6, rate: 1.2 }); this.banner('천사의 축복', '생명 +1', '#FFF4D0'); break;
      case 'phoenix': audio.play('sfx_awaken', { volume: 0.9, rate: 0.8 }); this.cameras.main.flash(400, 255, 160, 60); this.cameras.main.shake(300, 0.008); this.banner('불사조 부활!', '패배를 한 번 막았어요', '#FF8A2A'); break;
      case 'oracle': audio.play('sfx_power', { volume: 0.5, rate: 1.6 }); this.float(W / 2, this.BY - 60, '예언자가 막았어요!', '#F0E090', 36); break;
      case 'nova': { audio.play('sfx_awaken', { volume: 0.5, gap: 200, rate: 1.3 }); const [x0, y0] = this.slotXY(e.slot); const r = this.add.image(x0, y0, 'ring').setTint(0xFF9CF0).setBlendMode('ADD').setScale(0.3).setDepth(38); this.tweens.add({ targets: r, scale: 9, alpha: 0, duration: 520, onComplete: () => r.destroy() }); this.cameras.main.flash(120, 255, 180, 240); for (const en of this.s.enemies) { const v = this.ePool.get(en.id); if (v) { this.hitFlash(v); this.spark.setParticleTint(0xFF9CF0); this.spark.emitParticleAt(v.x, v.y, 5); } } this.float(x0, y0 - 70, '초신성!', '#FF9CF0'); break; }
      case 'split': { const [x, y] = this.pathXY(e.d); this.float(x, y - 80, '갈라졌다!', '#FF9BB0', 34); this.cameras.main.shake(160, 0.005); break; }
      case 'steal': { audio.play('sfx_leak', { volume: 0.4, rate: 1.4 }); this.float(this.hSp.x + 60, this.hSp.y - 50, `-${e.amt} SP`, '#FF7A8A', 34); this.tweens.add({ targets: this.hSp, scale: 0.85, duration: 90, yoyo: true }); break; }
      case 'chill': audio.play('sfx_ice', { volume: 0.6, rate: 0.6 }); for (let i = 0; i < SLOTS; i++) if (this.s.board[i]) { const [x, y] = this.slotXY(i); const f = this.add.image(x, y, 'flake').setTint(0xCFF2FF).setBlendMode('ADD').setScale(0.3).setDepth(36); this.tweens.add({ targets: f, scale: 1.2, alpha: 0, angle: 90, duration: 500, onComplete: () => f.destroy() }); } break;
      case 'blink': audio.play('sfx_silence', { volume: 0.4, rate: 1.5 }); break;
      case 'ward': { audio.play('sfx_power', { volume: 0.7, rate: 1.2 }); const [x0, y0] = this.slotXY(e.slot), [gx, gy] = this.pathXY(0.99); const h = this.add.image(gx, gy, 'ring').setTint(0x7FE8E0).setBlendMode('ADD').setScale(0.4).setDepth(38); this.tweens.add({ targets: h, scale: 2.4, alpha: 0, duration: 480, onComplete: () => h.destroy() }); this.float(gx, gy - 80, '결계!', '#7FE8E0', 40); this.float(x0, y0 - 60, '막았다!', '#7FE8E0'); break; }
      case 'stun': { const v = this.ePool.get(e.id); if (v) { audio.play('sfx_ice', { volume: 0.35, gap: 120, rate: 1.3 }); const c = this.add.image(v.x, v.y, 'flake').setTint(0xDFF6FF).setBlendMode('ADD').setScale(0.2).setDepth(37); this.tweens.add({ targets: c, scale: 1.1, angle: 90, alpha: 0, duration: 420, onComplete: () => c.destroy() }); if (Math.random() < 0.4) this.float(v.x, v.y - 70, '얼음!', '#BFE9FF', 26); } break; }
      case 'sacrifice': { audio.play('sfx_power', { volume: 0.5, rate: 0.8 }); const [x0, y0] = this.slotXY(e.from); this.float(x0, y0 - 70, '희생!', '#FF6A75'); for (const i of e.slots) { const [x, y] = this.slotXY(i); const b = this.add.image(x0, y0, 'bolt').setTint(0xFF4050).setBlendMode('ADD').setScale(0.7).setDepth(35); this.tweens.add({ targets: b, x, y, duration: 300, ease: 'Quad.easeOut', onComplete: () => { b.destroy(); this.spark.setParticleTint(0xFF5060); this.spark.emitParticleAt(x, y, 6); } }); } break; }
      case 'summonMinion': audio.play('sfx_summon', { volume: 0.4, rate: 0.6 }); break;
    }
  }
  // 보스 기술 예고 (1.2초 전): 보스 위 느낌표 + 대상 쪽 경고
  telegraph(e) {
    const v = this.ePool.get(e.id); if (!v) return;
    audio.play('sfx_silence', { volume: 0.35, rate: 1.6 });
    const ex = T(this, 0, -EN_SIZE.boss / 2 - 40, '!', 72, '#FF5A7A', { w: 900, stroke: '#05061A', thick: 8 }); v.add(ex);
    this.tweens.add({ targets: ex, scale: 1.3, duration: 150, yoyo: true, repeat: 3, onComplete: () => ex.destroy() });
    const label = { silence: '봉인 준비!', morph: '변신술 준비!', dash: '돌진 준비!', shield: '방패 준비!', blink: '사라지기 직전!', steal: '도둑질 준비!', chill: '냉기 준비!' }[e.skill];
    this.float(v.x, v.y - EN_SIZE.boss / 2 - 90, label, '#FF9BB0', 34);
    if (e.skill === 'silence' || e.skill === 'morph' || e.skill === 'chill') {   // 판 테두리가 붉게 깜빡
      const g = this.add.graphics().setDepth(9); g.lineStyle(8, e.skill === 'silence' ? 0xFF5A7A : e.skill === 'chill' ? 0x8FD8FF : 0xC59BFF, 1).strokeRoundedRect(this.BX - 22, this.BY - 22, BW + 44, BH + 44, 34);
      this.tweens.add({ targets: g, alpha: 0, duration: 300, yoyo: true, repeat: 1, onComplete: () => g.destroy() });
    }
  }
  bossTip(id) { return { serpent: '맞을수록 졸개를 불러요', knight: '주사위를 잠시 봉인해요', mage: '주사위 종류를 바꿔요', warden: '주기적으로 무적 방패', rush: '갑자기 돌진해요', statue: '안 맞으면 체력을 회복해요', phantom: '잠시 사라져 공격을 피해요', hydra: '쓰러지면 셋으로 갈라져요', thief: 'SP 를 훔쳐가요', frost: '주사위를 얼려 느리게 해요' }[id]; }
  awaken(x, y, col) {
    audio.play('sfx_awaken', { volume: 0.8 }); buzz([40, 30, 80]);
    if (!this.awakened) { this.awakened = true; this.voice('awaken', 4); }
    const rays = this.add.image(x, y, 'rays').setTint(col).setBlendMode('ADD').setScale(0.2).setDepth(37);
    this.tweens.add({ targets: rays, scale: 1.6, angle: 90, alpha: 0, duration: 900, onComplete: () => rays.destroy() });
    this.float(x, y - 90, '각성!', '#FFFFFF', 46);
    this.cameras.main.flash(150, 255, 255, 255);
  }
  bossDown(x, y) {
    audio.play('sfx_bossdie', { volume: 0.9 }); this.voice('bossdown', 4); buzz([60, 40, 120]);
    this.cameras.main.shake(450, 0.014); this.cameras.main.flash(250, 255, 230, 200);
    const rays = this.add.image(x, y, 'rays').setTint(0xFFD27A).setBlendMode('ADD').setScale(0.3).setDepth(38);
    this.tweens.add({ targets: rays, scale: 3, angle: 120, alpha: 0, duration: 1300, onComplete: () => rays.destroy() });
    this.spark.setParticleTint(0xFFD27A); this.spark.emitParticleAt(x, y, 40);
    this.banner('BOSS DOWN', '', '#FFD27A');
  }
  banner(title, sub, color) {
    const y = this.BY - 210, c = this.add.container(W / 2, y).setDepth(80);
    const g = this.add.graphics(); g.fillStyle(0x05061A, 0.82).fillRoundedRect(-420, -60, 840, sub ? 120 : 96, 30);
    c.add([g, T(this, 0, sub ? -18 : -12, title, 52, color, { w: 900, ls: 3 })]); if (sub) c.add(T(this, 0, 34, sub, 28, C.sub, { w: 800 }));
    c.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: 1500, duration: 300, onComplete: () => c.destroy() });
  }
  float(x, y, str, col, size = 34) { const t = T(this, x, y, str, size, col, { w: 900, stroke: '#05061A', thick: 6 }).setDepth(70); this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, onComplete: () => t.destroy() }); }

  tutorial() {
    const c = this.add.container(W / 2, this.BY + BH / 2).setDepth(95);
    const g = this.add.graphics(); g.fillStyle(0x05061A, 0.92).fillRoundedRect(-460, -180, 920, 440, 34); c.add(g);
    c.add(T(this, 0, -110, '룬 주사위로 제단을 지키세요', 40, C.text, { w: 900 }));
    c.add(T(this, 0, -30, '① 소환 — SP 로 무작위 룬 주사위를 불러요', 30, C.sub, { w: 800 }));
    c.add(T(this, 0, 20, '② 합성 — 같은 종류·같은 눈끼리 끌어 겹치면 눈+1', 30, C.sub, { w: 800 }));
    c.add(T(this, 0, 70, '③ 강화 — 아래 룬 버튼으로 그 종류 전체 강화', 30, C.sub, { w: 800 }));
    c.add(T(this, 0, 130, '적이 길 끝 [제단]에 닿으면 생명 -1 (보스 -2)\n생명 3개를 모두 잃으면 끝나요', 28, '#FF9BB0', { w: 800, lh: 8 }));
    c.add(T(this, 0, 214, '화면을 누르면 시작', 26, C.gold, { w: 800 }));
    this.paused = true;
    const z = this.add.zone(W / 2, H / 2, W, H).setInteractive().setDepth(96);
    z.once('pointerup', () => { c.destroy(); z.destroy(); this.paused = false; const d = load(); d.tips.dice = 1; import('../save.js?v=0.44.1').then(m => m.save()); });
  }

  gameOver() {
    this.ended = true;
    audio.stopMusic(); this.voice('over', 5);
    const s = this.s, r = { wave: s.wave, kills: s.kills, bossKills: s.bossKills, maxPips: s.maxPips, merges: s.merges, powers: this.powers, deck: s.deck.slice() };
    const res = M.finishRun(r, this.mode);
    this.cameras.main.fadeOut(1400, 5, 6, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', { ...r, ...res, mode: this.mode }));
  }
  // 랜덤 아레나: 셋 중 하나를 골라 덱에 추가 (그동안 멈춤)
  arenaPick() {
    if (this.ended || this.s.over) return;
    this.paused = true;
    const opts = M.pickChoices(3, this.s.deck), d = load();
    const pop = popup(this, '룬 하나를 골라요', 960, 820, { closable: false, depth: 2000 });
    pop.content.add(T(this, 0, -250, `덱 ${this.s.deck.length}/5 · 고른 룬은 바로 소환·합성에 섞여요`, 26, C.sub, { w: 800 }));
    opts.forEach((r, i) => {
      const x = (i - 1) * 300, y = 70, col = RARITY_COLOR[RARITY[r]];
      const g = this.add.graphics(); g.fillStyle(0x10153A, 0.95).fillRoundedRect(x - 135, y - 220, 270, 440, 26).lineStyle(4, col, 0.9).strokeRoundedRect(x - 135, y - 220, 270, 440, 26); pop.content.add(g);
      pop.content.add(this.add.image(x, y - 100, `die_${r}`).setDisplaySize(150, 150)); pop.content.add(this.add.image(x, y - 100, `rune_${r}`).setDisplaySize(86, 86));
      pop.content.add(T(this, x, y + 10, RUNES[r].name, 38, C.text, { w: 900 }));
      pop.content.add(T(this, x, y + 58, `${RARITY_NAME[RARITY[r]]}${d.unlocked[r] ? ` · ★${d.tiers[r] || 1}` : ''}`, 22, '#' + col.toString(16).padStart(6, '0'), { w: 800 }));
      pop.content.add(T(this, x, y + 130, DESC[r], 22, C.sub, { w: 700, wrap: 240 }));
      const z = this.add.zone(x, y, 270, 440).setInteractive({ useHandCursor: true }); pop.content.add(z);
      z.on('pointerup', () => { if (pop.closing) return; this.s.addRune(r); this.makePower(); audio.play('sfx_awaken', { volume: 0.6 }); pop.close(); this.time.delayedCall(160, () => { this.paused = false; const sy = synergiesOf(this.s.deck); this.banner(`${RUNES[r].name} 합류!`, sy.length ? `조합 발동 · ${sy.map(x => x.name).join(' · ')}` : '', '#F5C451'); }); });
    });
  }
  // 뒤로가기 (One a Day): 게임 중이면 일시정지 창
  onBack() { if (!this.ended && !this.paused) this.pause(); return true; }
  pause() {
    this.cancelDrag();
    if (this.paused || this.ended) return;
    this.paused = true; this.tweens.getTweens().filter(t => t.isPlaying()).forEach(t => { t.pause(); (this.frozen ||= []).push(t); });
    audio.duck(0.1);
    const resume = () => { pop.close(); this.time.delayedCall(150, () => { this.paused = false; (this.frozen || []).forEach(t => t.resume()); this.frozen = []; audio.duck(0.32); }); };
    const pop = popup(this, '일시정지', 820, 760, { closable: false, depth: 2000, onBack: () => resume() });
    pop.content.add(T(this, 0, 220, '적이 길 끝 [제단]에 닿으면 생명 -1 · 보스 -2\n생명 3개를 모두 잃으면 끝나요', 26, C.sub, { w: 800, lh: 8 }));
    pop.content.add(btn(this, 0, -110, 500, 130, '계속하기', resume, { style: 'gold', icon: 'i_play', size: 42 }));
    pop.content.add(btn(this, 0, 45, 420, 100, '포기하고 나가기', () => { pop.close(); this.paused = false; this.s.over = true; }, { style: 'ghost', size: 32 }));
  }
}
