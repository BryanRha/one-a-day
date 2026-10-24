// 한 판: 세로형 7×11 판(32칸) · 위 4인 상태 카드 · 가운데 주사위 · AI 3명
//   카메라 두 대: 판(확대 · 말 따라가기) / 화면 고정 UI(상태 카드 · 주사위 · 창)
import { W, H } from '../config.js?v=0.36.0';
import { T, C, btn, popup, toast } from '../ui.js?v=0.36.0';
import { audio } from '../audio.js?v=0.36.0';
import { load, save } from '../save.js?v=0.36.0';
import { Engine, REASON } from '../engine.js?v=0.36.0';
import { TILES, N_TILES, GROUPS, CHARS, LEVEL_N, TOLL_K, TOUR, MAX_ROUNDS, ISLAND_FEE, fmt, landPrice } from '../data.js?v=0.36.0';
import { DIFF } from './Lobby.js?v=0.36.0';

const TOP = 236, COLS = 7, ROWS = 11;
const PCOL = [0xF27BA0, 0x4E8FE6, 0x52B87A, 0xF0A030];   // 말 · 땅 색 (나 · AI1 · AI2 · AI3)
const PCOLS = ['#E25586', '#3C7FD8', '#3E9E66', '#D9861C'];
const AI_NAMES = { attack: '공격형', saver: '짠돌이', landmark: '랜드마크파', gambler: '도박형' };

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  create() {
    this.dead = false; this.events.once('shutdown', () => { this.dead = true; });
    const d = this.d = load(); audio.music('bgm_game');
    this.tw = W / COLS; this.th = (H - TOP - 24) / ROWS;
    // 카메라: 판은 main · UI 는 uiCam (만들어지는 물체를 지금 모드 쪽 카메라에만 보이게)
    this.uiCam = this.cameras.add(0, 0, W, H); this.mode = 'board'; this.cameras.main.setBounds(0, 0, W, H);   // 확대해도 판 밖은 안 보이게
    this.events.on('addedtoscene', go => { if (this.mode === 'board') this.uiCam.ignore(go); else this.cameras.main.ignore(go); });
    this.add.rectangle(W / 2, H / 2, W, H, 0xBFE6F5);
    // 가운데 지도
    const cx0 = this.tw, cy0 = TOP + this.th, cw = this.tw * 5, ch = this.th * 9, mp = this.add.image(cx0 + cw / 2, cy0 + ch / 2, 'map'); mp.setScale(Math.max(cw / mp.width, ch / mp.height)); mp.setCrop((mp.width - cw / mp.scale) / 2, (mp.height - ch / mp.scale) / 2, cw / mp.scale, ch / mp.scale);
    this.add.rectangle(cx0 + cw / 2, cy0 + ch / 2, cw, ch, 0xFFFFFF, 0.12);
    // 칸
    this.tiles = TILES.map((t, i) => this.makeTile(i));
    // 플레이어 (나 + AI 3) · 말
    const me = CHARS.find(c => c.id === d.char) || CHARS[0], others = CHARS.filter(c => c.id !== me.id).sort(() => Math.random() - 0.5).slice(0, 3), ais = DIFF[d.diff][1];
    const players = [{ name: me.n, char: me.id }, ...others.map((c, k) => ({ name: c.n, char: c.id, ai: ais[k] }))];
    this.eng = new Engine({ players, io: this });
    this.tokens = this.eng.P.map((p, k) => { const im = this.add.image(0, 0, p.char.img).setOrigin(0.5, 0.92); im.setScale(this.th * 0.62 / im.height); const sh = this.add.ellipse(0, 0, this.tw * 0.32, this.th * 0.1, 0x000000, 0.25); const c = this.add.container(0, 0, [sh, im]); c.im = im; return c; });
    this.eng.P.forEach(p => this.placeToken(p, 0));
    this.selZones = [];
    // UI
    this.mode = 'ui';
    this.cards = this.eng.P.map((p, k) => this.makeCard(p, k)); this.refresh();
    this.roundT = T(this, W / 2, TOP + this.th * 1.45, `1 / ${MAX_ROUNDS} 바퀴`, 26, '#FFFFFF', { w: 900, shadow: true });
    this.banner = T(this, W / 2, TOP + this.th * 2.15, '', 44, '#FFFFFF', { w: 900, shadow: true }).setStroke('#2E5FB8', 10);
    this.msg = T(this, W / 2, TOP + this.th * 8.6, '', 26, '#FFFFFF', { w: 800, shadow: true, wrap: this.tw * 4.6 });
    this.warn = this.add.container(W / 2, TOP + this.th * 2.95).setVisible(false);
    this.dice = [0, 1].map(k => this.makeDie(W / 2 + (k - 0.5) * 170, TOP + this.th * 4.6));
    this.makeRoll();
    window.__game2 = this;
    this.cameras.main.fadeIn(250, 191, 230, 245);
    this.time.delayedCall(400, () => this.eng.run());
  }
  // ── 판 좌표
  rc(i) { if (i === 0) return [6, 10]; if (i <= 5) return [6 - i, 10]; if (i === 6) return [0, 10]; if (i <= 15) return [0, 10 - (i - 6)]; if (i === 16) return [0, 0]; if (i <= 21) return [i - 16, 0]; if (i === 22) return [6, 0]; return [6, i - 22]; }
  xy(i) { const [c, r] = this.rc(i); return [this.tw * (c + 0.5), TOP + this.th * (r + 0.5)]; }
  screen(x, y) { const cam = this.cameras.main; return [(x - cam.worldView.x) * cam.zoom, (y - cam.worldView.y) * cam.zoom]; }
  makeTile(i) {
    const [x, y] = this.xy(i), t = TILES[i], w = this.tw - 6, h = this.th - 6, c = this.add.container(x, y), g = this.add.graphics(); c.add(g); c.g = g; c.w = w; c.h = h;
    const corner = ['start', 'island', 'festival', 'ktx'].includes(t.k), im = this.add.image(0, -h * 0.08, t.img); im.setScale(Math.min((w - 10) / im.width, (h * (corner ? 0.74 : 0.6)) / im.height)); c.add(im); c.im = im; c.base = im.scale;
    c.name = T(this, 0, h / 2 - (corner ? 22 : 40), t.n, corner ? 22 : 19, C.ink, { w: 900 }); c.add(c.name);
    c.sub = T(this, 0, h / 2 - 17, '', 16, C.dim, { w: 800 }); c.add(c.sub);
    c.bld = this.add.container(0, 0); c.add(c.bld);
    this.drawTile(i, c); return c;
  }
  drawTile(i, c = this.tiles[i]) { const m = this.mode; this.mode = 'board'; try { this.drawTile0(i, c); } finally { this.mode = m; } }
  drawTile0(i, c) {
    const t = TILES[i], e = this.eng, w = c.w, h = c.h, g = c.g, o = e ? e.own[i] : -1, lv = e ? e.lv[i] : -1;
    const bgc = { start: 0xFFF1C9, island: 0xD6F2FF, festival: 0xFFE3EC, ktx: 0xE6E9FF, ch: 0xFFF6E0, tax: 0xF0F0F0, t: 0xFFF6D6 }[t.k] || 0xFFFFFF;
    g.clear().fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 14).fillStyle(bgc, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (t.k === 'c') g.fillStyle(GROUPS[t.g].c, 1).fillRoundedRect(-w / 2, -h / 2, w, 14, { tl: 14, tr: 14, bl: 0, br: 0 });
    if (t.k === 't') g.fillStyle(0xF0B65A, 1).fillRoundedRect(-w / 2, -h / 2, w, 14, { tl: 14, tr: 14, bl: 0, br: 0 });
    if (o >= 0) { g.lineStyle(7, PCOL[o], 1).strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 12); g.fillStyle(PCOL[o], 0.16).fillRoundedRect(-w / 2, -h / 2, w, h, 14); }
    if (e && e.festival === i) g.lineStyle(5, 0xFF5C8A, 1).strokeRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 10);
    c.bld.removeAll(true);
    if (t.k === 'c' || t.k === 't') c.sub.setText(o >= 0 ? `💸${fmt(e.toll(i))}` : fmt(landPrice(i))).setColor(o >= 0 ? PCOLS[o] : C.dim);
    if (o >= 0 && t.k === 'c') { if (lv >= 4) { c.im.setScale(c.base * 1.25); const cr = this.add.image(w / 2 - 22, -h / 2 + 26, 'crown'); cr.setScale(36 / cr.height); c.bld.add(cr); }
      else { c.im.setScale(c.base); ['villa', 'building', 'hotel'].forEach((k, j) => { if (lv > j) { const b = this.add.image(-w / 2 + 22 + j * 30, -h / 2 + 34, k).setTint(PCOL[o]); b.setScale(32 / b.height); c.bld.add(b); } }); const f = this.add.image(w / 2 - 18, -h / 2 + 30, 'flag').setTint(PCOL[o]); f.setScale(30 / f.height); c.bld.add(f); } }
    if (o >= 0 && t.k === 't') { const f = this.add.image(w / 2 - 18, -h / 2 + 30, 'flag').setTint(PCOL[o]); f.setScale(30 / f.height); c.bld.add(f); }
    if (e && e.festival === i) { const ln = this.add.image(-w / 2 + 24, -h / 2 + 34, 'lantern'); ln.setScale(38 / ln.height); c.bld.add(ln); }
  }
  placeToken(p, i, anim) { const [x, y] = this.xy(i), k = p.i, dx = [-0.2, 0.2, -0.2, 0.2][k] * this.tw, dy = [-0.02, -0.02, 0.2, 0.2][k] * this.th, tk = this.tokens[k]; if (!anim) tk.setPosition(x + dx, y + dy); tk.setDepth(10 + y / 100); return [x + dx, y + dy]; }
  // ── 위 상태 카드
  makeCard(p, k) {
    const cw = 258, x = 12 + k * 266 + cw / 2, y = 120, c = this.add.container(x, y), g = this.add.graphics(); c.add(g); c.g = g;
    const im = this.add.image(-cw / 2 + 58, 6, p.char.img); im.setScale(150 / im.height); im.setCrop(0, 0, im.width, im.height * 0.55); c.add(im); c.im = im;
    c.nm = T(this, -cw / 2 + 112, -50, k === 0 ? `나 · ${p.name}` : p.name, 24, C.ink, { ox: 0, w: 900 }); c.add(c.nm);
    c.ty = T(this, -cw / 2 + 112, -18, k === 0 ? p.char.perkN : AI_NAMES[p.aiKey], 15, C.dim, { ox: 0, w: 800, wrap: 140, align: 'left' }); c.add(c.ty);
    c.cash = T(this, -cw / 2 + 112, 22, '', 26, PCOLS[k], { ox: 0, w: 900 }); c.add(c.cash);
    c.as = T(this, -cw / 2 + 112, 54, '', 16, C.dim, { ox: 0, w: 800 }); c.add(c.as);
    c.badge = T(this, cw / 2 - 16, -62, '', 22, C.ink, { ox: 1, w: 900 }); c.add(c.badge);
    c.w = cw; return c;
  }
  drawCard(k) {
    if (!this.cards) return; const c = this.cards[k], p = this.eng.P[k], on = this.eng.cur === k && !p.out, g = c.g, cw = c.w;
    g.clear().fillStyle(0x000000, 0.15).fillRoundedRect(-cw / 2 + 3, -88, cw, 184, 26).fillStyle(p.out ? 0xD8D8D8 : 0xFFFFFF, 1).fillRoundedRect(-cw / 2, -92, cw, 184, 26).fillStyle(PCOL[k], 1).fillRoundedRect(-cw / 2, -92, cw, 16, { tl: 26, tr: 26, bl: 0, br: 0 });
    if (on) g.lineStyle(7, 0xF0B65A, 1).strokeRoundedRect(-cw / 2, -92, cw, 184, 26);
    c.cash.setText(p.out ? '파산' : fmt(p.cash)); c.as.setText(p.out ? '' : `자산 ${fmt(this.eng.assets(p))}`);
    c.badge.setText([p.angel ? `😇${p.angel}` : '', p.island ? `🏝${p.island}` : '', p.ktx ? '🚄' : ''].join(''));
    c.setAlpha(p.out ? 0.6 : 1); c.setScale(on ? 1.04 : 1); c.setDepth(on ? 5 : 1);
  }
  refresh() { this.eng.P.forEach((p, k) => this.drawCard(k)); }
  // ── 주사위
  makeDie(x, y) { const c = this.add.container(x, y), g = this.add.graphics(); c.add(g); c.g = g; this.face(c, 6); return c; }
  face(c, n) { const g = c.g, s = 130, pip = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]][n];
    g.clear().fillStyle(0x000000, 0.18).fillRoundedRect(-s / 2 + 4, -s / 2 + 8, s, s, 26).fillStyle(0xFFFFFF, 1).fillRoundedRect(-s / 2, -s / 2, s, s, 26).lineStyle(4, 0xD8E4F0, 1).strokeRoundedRect(-s / 2, -s / 2, s, s, 26);
    for (const [px, py] of pip) g.fillStyle(n === 1 ? 0xE8574F : 0x2E3448, 1).fillCircle(px * 34, py * 34, 14); }
  makeRoll() {
    const y = TOP + this.th * 6.5; this.rollB = btn(this, W / 2, y, 440, 130, '주사위 굴리기', () => this.onRoll(), { size: 40, style: 'gold' }).setVisible(false);
    // 더블 노리기 게이지: 바늘이 금색 칸에 있을 때 누르면 더블 확률 UP
    const gy = y - 120, gw = 440; this.gauge = this.add.container(W / 2, gy).setVisible(false); const gg = this.add.graphics(); gg.fillStyle(0xFFFFFF, 0.95).fillRoundedRect(-gw / 2, -18, gw, 36, 18).fillStyle(0xF0B65A, 1).fillRoundedRect(-gw * 0.12, -18, gw * 0.24, 36, 4);
    this.needle = this.add.rectangle(-gw / 2, 0, 10, 52, 0xE8574F); this.gauge.add([gg, this.needle, T(this, 0, -46, '금색에서 누르면 더블 확률 UP', 20, '#FFFFFF', { w: 900, shadow: true })]); this.gw = gw;
  }
  onRoll() { if (!this.rollWait) return; const aim = Math.abs(this.needle.x) < this.gw * 0.12; this.needleTw?.stop(); this.rollB.setVisible(false); this.gauge.setVisible(false); const r = this.rollWait; this.rollWait = null; audio.buzz(15); r({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6), aim }); if (aim) this.say('더블 노리기 성공!', 700); }
  // ── 기다리기 · 안내
  wait(ms) { if (this.dead) return new Promise(() => {}); return new Promise(r => this.time.delayedCall(ms * this.sp(), r)); }
  sp() { const p = this.eng.P[this.eng.cur]; return p && p.ai ? 0.55 : 1; }
  say(s, ms = 1200, col = '#FFFFFF') { this.banner.setText(s).setColor(col).setScale(0.6).setAlpha(1); this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: 'Back.easeOut' }); this.tweens.add({ targets: this.banner, alpha: 0, delay: ms, duration: 300 }); }
  note(s) { this.msg.setText(s); }
  float(x, y, s, col) { const t = T(this, x, y, s, 34, col, { w: 900, shadow: true }).setDepth(90); this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 1300, delay: 300, onComplete: () => t.destroy() }); }
  cardXY(p) { const c = this.cards[p.i]; return [c.x, c.y]; }
  coins(from, to, n = 6) { for (let k = 0; k < n; k++) { const s = this.add.image(from[0], from[1], 'cash').setDepth(95); s.setScale(54 / s.height); this.tweens.add({ targets: s, x: to[0] + (Math.random() - 0.5) * 40, y: to[1], duration: 500 + k * 60, ease: 'Cubic.easeIn', delay: k * 40, onComplete: () => s.destroy() }); } }
  // ── 엔진이 보내는 일들
  async anim(ev) {
    if (this.dead) return new Promise(() => {});
    const e = this.eng, p = ev.p; this.refresh();
    switch (ev.t) {
      case 'start': this.say('여행 시작!', 900); await this.wait(900); break;
      case 'turn': this.note(p.ai ? `${p.name}의 차례 · ${AI_NAMES[p.aiKey]}` : '내 차례! 주사위를 굴려요'); this.say(p.ai ? `${p.name}의 차례` : '내 차례!', 700, p.ai ? '#FFFFFF' : '#FFE27A'); this.checkThreat(); await this.wait(p.ai ? 600 : 500); break;
      case 'round': this.roundT.setText(`${Math.min(ev.n, MAX_ROUNDS)} / ${MAX_ROUNDS} 바퀴`); if (ev.n === MAX_ROUNDS) this.say('마지막 바퀴!', 1200, '#FFB4C8'); break;
      case 'roll': await this.rollAnim(ev.d1, ev.d2); break;
      case 'move': await this.moveAnim(p, ev.path, ev.fast, ev.back); break;
      case 'salary': { const [x, y] = this.cardXY(p); this.float(x, y + 60, `+${fmt(ev.amt)} 월급`, C.green); audio.play('sfx_cashin', { volume: 0.5 }); await this.wait(400); break; }
      case 'island': this.say('🏝 무인도에 갇혔어요', 1100); audio.play('sfx_lose', { volume: 0.4 }); await this.wait(900); break;
      case 'stay': this.note(`${p.name} · 무인도 ${ev.left}턴 남음`); await this.wait(600); break;
      case 'escape': this.say('더블! 무인도 탈출', 900, '#FFE27A'); await this.wait(700); break;
      case 'triple': this.say('더블 3번! 무인도로…', 1100); await this.wait(800); break;
      case 'again': this.say('더블! 한 번 더', 800, '#FFE27A'); await this.wait(600); break;
      case 'ktxready': this.say('🚄 다음 차례에 KTX로 원하는 곳까지!', 1200); audio.play('sfx_train', { volume: 0.6 }); await this.wait(900); break;
      case 'build': await this.buildAnim(ev); break;
      case 'pay': await this.payAnim(ev); break;
      case 'cash': { const [x, y] = this.cardXY(p); this.float(x, y + 60, `${ev.amt > 0 ? '+' : ''}${fmt(ev.amt)} ${ev.why}`, ev.amt > 0 ? C.green : C.red); audio.play(ev.amt > 0 ? 'sfx_cashin' : 'sfx_cashout', { volume: 0.5 }); await this.wait(600); break; }
      case 'angel': this.say('😇 천사 카드! 통행료 면제', 1100, '#FFE27A'); audio.play('sfx_levelup', { volume: 0.5 }); await this.wait(900); break;
      case 'take': { this.drawTile(ev.i); const tl = this.tiles[ev.i]; tl.scaleX = 0; this.tweens.add({ targets: tl, scaleX: 1, duration: 300 }); this.say(`${p.name}, ${TILES[ev.i].n} 인수!`, 1200, PCOLS[p.i]); audio.play('sfx_merge_big', { volume: 0.6 }); this.coins(this.cardXY(p), this.cardXY(ev.from)); await this.wait(1000); break; }
      case 'chance': await this.chanceAnim(p, ev.c, ev.reroll); break;
      case 'festival': this.drawTile(ev.i); this.say(`🏮 ${TILES[ev.i].n} 축제! 통행료 2배`, 1200, '#FFE27A'); audio.play('sfx_levelup', { volume: 0.5 }); await this.wait(900); break;
      case 'nofest': this.note('축제를 열 내 땅이 아직 없어요'); await this.wait(500); break;
      case 'sell': this.drawTile(ev.i); this.note(`${p.name} · ${TILES[ev.i].n} 매각 (+${fmt(ev.amt)})`); await this.wait(500); break;
      case 'bankrupt': TILES.forEach((t, i) => this.drawTile(i)); this.tweens.add({ targets: this.tokens[p.i], alpha: 0, duration: 600 }); this.say(`${p.name} 파산!`, 1400, '#FFB4C8'); audio.play('sfx_lose', { volume: 0.6 }); await this.wait(1300);
        if (!p.ai && !e.winner) { e.win([...e.alive()].sort((a, b) => e.assets(b) - e.assets(a))[0], 'bankrupt'); } break;
      case 'win': await this.wait(400); this.finish(); return new Promise(() => {});
    }
    this.refresh();
  }
  async rollAnim(d1, d2) {
    audio.play('sfx_dice', { volume: 0.7 }); const [a, b] = this.dice;
    for (let k = 0; k < 8; k++) { this.face(a, 1 + Math.floor(Math.random() * 6)); this.face(b, 1 + Math.floor(Math.random() * 6)); a.angle = (Math.random() - 0.5) * 50; b.angle = (Math.random() - 0.5) * 50; await this.wait(55); }
    a.angle = b.angle = 0; this.face(a, d1); this.face(b, d2); [a, b].forEach(c => { c.setScale(1.25); this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' }); });
    this.note(`${d1} + ${d2} = ${d1 + d2}${d1 === d2 ? ' · 더블!' : ''}`); await this.wait(450);
  }
  async moveAnim(p, path, fast, back) {
    const cam = this.cameras.main, tk = this.tokens[p.i], human = !p.ai;
    if (human && path.length > 1) { cam.zoomTo(1.35, 300); cam.startFollow(tk, true, 0.12, 0.12); }
    for (const i of path) { const [x, y] = this.placeToken(p, i, true), hop = fast ? 70 : 150;
      await new Promise(r => { this.tweens.add({ targets: tk, x, duration: hop, onComplete: r }); this.tweens.add({ targets: tk, y: { from: tk.y, to: y }, duration: hop, ease: 'Sine.easeInOut' }); this.tweens.add({ targets: tk.im, y: -30, duration: hop / 2, yoyo: true, ease: 'Sine.easeOut' }); });
      if (!fast) audio.play('sfx_step', { volume: 0.35, gap: 20 }); if (this.dead) return; }
    if (human && path.length > 1) { await this.wait(250); cam.stopFollow(); cam.zoomTo(1, 350); cam.pan(W / 2, H / 2, 350); await this.wait(380); }
    const tl = this.tiles[p.pos === undefined ? path[path.length - 1] : path[path.length - 1]]; this.tweens.add({ targets: tl, scale: 1.08, duration: 120, yoyo: true });
  }
  async buildAnim(ev) {
    const tl = this.tiles[ev.i]; this.drawTile(ev.i); const [sx, sy] = this.screen(tl.x, tl.y);
    tl.setScale(0.7); this.tweens.add({ targets: tl, scale: 1, duration: 360, ease: 'Back.easeOut' }); audio.play('sfx_build', { volume: 0.6 });
    if (ev.cost) this.float(sx, sy - 40, `-${fmt(ev.cost)}`, C.red);
    if (ev.to === 4) { this.say(`👑 ${TILES[ev.i].n} 랜드마크!`, 1400, '#FFE27A'); audio.play('sfx_levelup', { volume: 0.7 }); this.d.stats.landmarks++; }
    else if (ev.free) this.say('무료 리모델링!', 900, '#FFE27A');
    else this.note(`${ev.p.name} · ${TILES[ev.i].n} ${LEVEL_N[ev.to]}${ev.from < 0 ? ' 구입' : '까지 건설'}`);
    if (!ev.p.ai) this.d.stats.builds++;
    await this.wait(ev.to === 4 ? 1100 : 650); this.checkThreat();
  }
  async payAnim(ev) {
    if (!ev.amt) return; const from = this.cardXY(ev.from), to = ev.to ? this.cardXY(ev.to) : [W / 2, TOP + this.th * 5];
    this.coins(from, to, Math.min(9, 3 + Math.floor(ev.amt / 60)));
    const human = !ev.from.ai || ev.to && !ev.to.ai, big = ev.why === '통행료';
    if (big) { const t = T(this, W / 2, TOP + this.th * 3.2, `💸 통행료 ${fmt(ev.amt)}`, human ? 60 : 44, !ev.from.ai ? '#FFB4C8' : '#FFFFFF', { w: 900, shadow: true }).setStroke('#2E3448', 10).setScale(0.4); this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' }); this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() }); if (ev.to && !ev.to.ai) this.d.stats.tolls++; }
    else this.note(`${ev.from.name} → ${ev.to ? ev.to.name : '은행'} · ${ev.why} ${fmt(ev.amt)}`);
    audio.play(!ev.from.ai ? 'sfx_cashout' : ev.to && !ev.to.ai ? 'sfx_cashin' : 'sfx_coin', { volume: 0.6 }); if (!ev.from.ai && big) audio.buzz([20, 40, 20]);
    await this.wait(big ? 1100 : 600);
  }
  async chanceAnim(p, c, reroll) {
    audio.play('sfx_chance', { volume: 0.6 }); const box = this.add.container(W / 2, TOP + this.th * 4.6).setDepth(80), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-300, -220, 600, 440, 34).lineStyle(6, 0xF0B65A, 1).strokeRoundedRect(-300, -220, 600, 440, 34);
    const im = this.add.image(0, -100, c.id === 'angel' ? 'angel' : 'chance'); im.setScale(150 / im.height);
    box.add([g, im, T(this, 0, 20, reroll ? `${c.n} → 여름 능력으로 다시!` : c.n, 40, C.ink, { w: 900 }), T(this, 0, 90, c.d, 26, C.dim, { w: 800, wrap: 540 }), T(this, 0, 165, `${p.name}의 찬스`, 22, PCOLS[p.i], { w: 900 })]);
    box.scaleX = 0; await new Promise(r => this.tweens.add({ targets: box, scaleX: 1, duration: 220, onComplete: r })); await this.wait(p.ai ? 1100 : 1500);
    this.tweens.add({ targets: box, alpha: 0, duration: 200, onComplete: () => box.destroy() }); await this.wait(150);
  }
  // 독점 경고 (상대가 한 칸만 남았을 때)
  checkThreat() {
    const th = this.eng.threats().filter(x => x.p.ai), mine = this.eng.threats().filter(x => !x.p.ai); this.warn.removeAll(true);
    const x = th[0] || mine[0]; if (!x) { this.warn.setVisible(false); return; }
    const key = `${x.p.i}_${x.kind}_${x.i}`, s = x.p.ai ? `⚠ ${x.p.name} ${x.kind === 'tour' ? '관광지' : '라인'} 독점 직전! (${TILES[x.i].n})` : `✨ ${TILES[x.i].n}만 사면 ${x.kind === 'tour' ? '관광지' : '라인'} 독점!`;
    const g = this.add.graphics(); g.fillStyle(x.p.ai ? 0xE8574F : 0x3E9E66, 0.92).fillRoundedRect(-this.tw * 2.4, -30, this.tw * 4.8, 60, 30); this.warn.add([g, T(this, 0, 0, s, 22, '#FFFFFF', { w: 900 })]).setVisible(true);
    if (this.warnKey !== key) { this.warnKey = key; if (x.p.ai) audio.play('sfx_alarm', { volume: 0.5 }); this.tweens.add({ targets: this.warn, scale: { from: 1.15, to: 1 }, duration: 300 }); }
  }
  // ── 사람 차례 결정
  ask(kind, info) {
    if (this.dead) return new Promise(() => {});
    if (kind === 'roll') return new Promise(r => { this.rollWait = r; this.rollB.setVisible(true); this.gauge.setVisible(true); this.needle.x = -this.gw / 2; this.needleTw = this.tweens.add({ targets: this.needle, x: this.gw / 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
    if (kind === 'build') return this.askBuild(info);
    if (kind === 'take') return this.yesNo(`${TILES[info.i].n} 인수할까요?`, `${info.owner.name}에게 ${fmt(info.cost)}을 주고 땅과 건물을 사요\n(내 돈 ${fmt(info.p.cash)})`, '인수하기', TILES[info.i].img);
    if (kind === 'island') return this.yesNo('무인도 탈출', `${fmt(ISLAND_FEE)} 내고 바로 나갈까요?\n아니면 주사위 더블에 도전 (남은 ${info.left}턴)`, '돈 내고 탈출', 'island', '더블 도전');
    if (kind === 'ktx') return this.pickTile('🚄 KTX · 가고 싶은 칸을 눌러요', TILES.map((t, i) => i).filter(i => i !== 22), true);
    if (kind === 'festival') return this.pickTile('🏮 축제를 열 내 땅을 골라요 (통행료 2배)', info.mine, false);
  }
  yesNo(title, body, yes, img, no = '안 할래요') {
    return new Promise(r => { const p = popup(this, 860, 760, { closable: false }); p.content.add(T(this, 0, -290, title, 44, C.ink, { w: 900 }));
      if (img) { const im = this.add.image(0, -130, img); im.setScale(170 / im.height); p.content.add(im); }
      p.content.add(T(this, 0, 50, body, 28, C.dim, { w: 800, wrap: 760 }));
      p.content.add(btn(this, -190, 250, 340, 110, yes, () => { p.close(); r(true); }, { size: 32, style: 'gold' })); p.content.add(btn(this, 190, 250, 320, 110, no, () => { p.close(); r(false); }, { size: 28, style: 'cream' })); });
  }
  askBuild({ p, i, from, maxTo, costs }) {
    return new Promise(r => {
      const t = TILES[i], tour = t.k === 't', rows = [], pp = popup(this, 920, tour ? 820 : 1180, { closable: false }), top = tour ? -330 : -510;
      pp.content.add(T(this, 0, top, t.n, 50, tour ? C.gold : PCOLS[0], { w: 900 })); pp.content.add(T(this, 0, top + 56, tour ? '관광지 · 4곳 모두 가지면 승리' : `${GROUPS[t.g].n} 줄`, 24, C.dim, { w: 800 }));
      const im = this.add.image(0, top + 190, t.img); im.setScale(200 / im.height); pp.content.add(im);
      let sel = -1; for (let l = maxTo; l > from; l--) if (costs[l] !== null && costs[l] <= p.cash) { sel = l; break; }
      if (sel > 0 && from < 0 && sel === 3 && p.cash - costs[3] < 150) sel = Math.max(from + 1, 2);   // 첫 구입은 돈을 조금 남기게
      const total = T(this, 0, 0, '', 34, C.ink, { w: 900 }), go = btn(this, -200, 0, 380, 110, '', () => { pp.close(); r(sel); }, { size: 30, style: 'gold' });
      const draw = () => { rows.forEach(({ g, l, lab, cost }) => { const on = l <= sel, can = costs[l] !== null && costs[l] <= p.cash; g.clear().fillStyle(on ? 0xFFF1C9 : 0xF6F9FC, 1).fillRoundedRect(-400, -46, 800, 92, 22).lineStyle(on ? 5 : 2, on ? 0xF0B65A : 0xD8E4F0, 1).strokeRoundedRect(-400, -46, 800, 92, 22); lab.setColor(can ? C.ink : '#B8C2CC'); cost.setColor(can ? C.ink : '#B8C2CC'); });
        const c = sel > from ? costs[sel] : 0, tl = tour ? TOUR.toll[1] : Math.round(GROUPS[t.g].p * TOLL_K[Math.max(0, sel)]);
        total.setText(sel > from ? `${fmt(c)} · 통행료 ${fmt(tl)}` : '아무것도 안 지어요'); go.setLabel(sel > from ? '건설하기' : '건너뛰기'); };
      let y = top + 340; for (let l = from + 1; l <= maxTo; l++) { const ct = this.add.container(0, y), g = this.add.graphics(), ic = this.add.image(-340, 0, ['flag', 'villa', 'building', 'hotel', 'crown'][l]); ic.setScale(60 / ic.height); if (l < 4) ic.setTint(PCOL[0]);
        const lab = T(this, -290, 0, tour ? '관광지 사기' : LEVEL_N[l], 30, C.ink, { ox: 0, w: 900 }), cost = T(this, 370, 0, costs[l] === null ? '-' : fmt(costs[l] - (l > from + 1 ? costs[l - 1] : 0)), 28, C.ink, { ox: 1, w: 900 });
        ct.add([g, ic, lab, cost]); ct.setSize(800, 92).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (costs[l] === null || costs[l] > p.cash) return toast(this, '돈이 모자라요'); sel = sel === l ? l - 1 : l; audio.play('sfx_tap', { volume: 0.6 }); draw(); });
        rows.push({ g, l, lab, cost }); pp.content.add(ct); y += 110; }
      total.setY(y + 10); pp.content.add(total); pp.content.add(T(this, 0, y + 52, `내 돈 ${fmt(p.cash)}`, 22, C.dim, { w: 800 }));
      go.setY(y + 150); pp.content.add(go); pp.content.add(btn(this, 200, y + 150, 320, 110, '안 할래요', () => { pp.close(); r(-99); }, { size: 28, style: 'cream' }));
      draw();
    });
  }
  pickTile(msg, list, any) {
    return new Promise(r => {
      this.say(msg, 99999); this.note(msg); this.mode = 'board'; const zs = [];
      for (const i of list) { const tl = this.tiles[i], hl = this.add.rectangle(tl.x, tl.y, tl.w, tl.h, 0xFFE27A, 0.35).setStrokeStyle(6, 0xF0B65A).setDepth(30); this.tweens.add({ targets: hl, alpha: 0.4, duration: 450, yoyo: true, repeat: -1 });
        hl.setInteractive({ useHandCursor: true }).on('pointerup', () => { zs.forEach(z => z.destroy()); this.banner.setAlpha(0); audio.play('sfx_tap', { volume: 0.6 }); r(i); }); zs.push(hl); }
      this.mode = 'ui';
    });
  }
  finish() {
    const e = this.eng, rows = [...e.P].map(p => ({ me: !p.ai, name: p.name, img: p.char.img, assets: e.assets(p), out: p.out, win: p === e.winner })).sort((a, b) => (b.win - a.win) || (a.out - b.out) || b.assets - a.assets);
    save(); this.scene.start('Result', { rows, winner: e.winner.name, reason: e.reason });
  }
  onBack() {
    const p = popup(this, 800, 560); p.content.add(T(this, 0, -170, '여행을 그만둘까요?', 42, C.ink, { w: 900 })); p.content.add(T(this, 0, -90, '지금 그만두면 4등으로 기록돼요', 26, C.dim, { w: 800 }));
    p.content.add(btn(this, -170, 120, 300, 100, '그만두기', () => { const e = this.eng; p.close(); this.dead = true; const rows = e.P.map(q => ({ me: !q.ai, name: q.name, img: q.char.img, assets: q.ai ? e.assets(q) : 0, out: !q.ai })).sort((a, b) => a.me - b.me || b.assets - a.assets); this.scene.start('Result', { rows, winner: rows[0].name, reason: 'rich' }); }, { size: 28, style: 'cream' }));
    p.content.add(btn(this, 170, 120, 300, 100, '계속하기', () => p.close(), { size: 30, style: 'gold' })); return true;
  }
}
