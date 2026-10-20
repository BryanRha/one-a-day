// 전투 화면: 지도 · 유닛 선택 → 이동(파란 칸) → 행동(공격 · 점령 · 하차 · 대기) · 기지 생산 · 지휘관 필살기 · 상대 AI 턴
import { W, H } from '../config.js?v=0.11.2';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.11.2';
import { audio } from '../audio.js?v=0.11.2';
import { load, save } from '../save.js?v=0.11.2';
import * as M from '../meta.js?v=0.11.2';
import { inOAD, exitToOAD } from '../oad.js?v=0.11.2';
import { Sim, dist, hpOf } from '../core/sim.js?v=0.11.2';
import { AI, apply } from '../core/ai.js?v=0.11.2';
import { UNITS, UNIT_ORDER, TERRAIN, COS, FOOT, base } from '../core/data.js?v=0.11.2';
import { MAPS, campaignMap } from '../core/maps.js?v=0.11.2';

const TOP = 196, BOTTOM = 360;
const TEAM = { 1: 0x3E7FD8, 2: 0xD9472E }, TEAMS = { 1: 'b', 2: 'r' };
const BLD = { city: 'city', base: 'base', air: 'air', hq: 'hq', port: 'port' };
const sleep = (sc, ms) => new Promise(r => sc.time.delayedCall(ms, r));
const SND = { inf: 'sfx_rifle', bazooka: 'sfx_bazooka', recon: 'sfx_mg', ltank: 'sfx_cannon', htank: 'sfx_cannon', arty: 'sfx_cannon', rocket: 'sfx_rocket', aa: 'sfx_mg', heli: 'sfx_mg', truck: 'sfx_mg' };
const MOVE_SND = { foot: 'sfx_move_foot', mech: 'sfx_move_foot', tire: 'sfx_move_car', tread: 'sfx_move_tank', air: 'sfx_move_heli' };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  create(data = {}) {
    const d = load();
    // 판마다 새로 시작 (Phaser 는 같은 화면 객체를 다시 쓰므로 지난 판 값이 남으면 끝나지 않거나 멈춤)
    Object.assign(this, { fogG: null, pendingEvs: null, unloadList: [], ended: false, paused: false, winWhy: null, enemySum: null, holdFast: false, dragFrom: null, dragged: false, nextIdx: -1, ghost: null, pending: null, tgts: [], spots: null, spotsCache: null, reach: null, autoAi: null, powers0: 0, captures: 0, hinted: false, powerHintObj: null, frozen: null, pw: null, danger: false });
    this.mode = data.mode || 'free';
    this.map = data.custom || MAPS.find(m => m.id === data.mapId) || MAPS[0];
    this.simMap = this.mode === 'campaign' || this.mode === 'daily' ? campaignMap(this.map) : this.map;
    this.level = data.level || 'normal';
    this.co = data.co || d.co || 'ella';
    this.enemyCo = data.enemyCo || this.map.enemyCo || 'scarlet';
    this.s = new Sim(this.simMap, [null, this.co, this.enemyCo], { limit: data.limit || this.map.par + 8 });
    this.resumed = !!data.resume;
    if (data.resume) { this.s.restore(data.resume.sim); this.captures = data.resume.captures || 0; this.powers0 = data.resume.powers || 0; }
    this.ai = new AI(this.level);
    this.auto = new URLSearchParams(location.search).has('auto');   // 테스트: 아군도 AI
    this.state = 'idle'; this.sel = null; this.busy = false; this.speed = 1; this.powers = this.powers0 || 0; this.captures = this.captures || 0; this.danger = false;
    // 지도 크기: 위 정보 · 아래 패널 사이에 맞춤
    const availH = H - TOP - BOTTOM - 20;
    this.ts = Math.floor(W / this.s.w);                     // 가로를 꽉 채움 (칸이 커짐)
    this.ox = Math.round((W - this.ts * this.s.w) / 2);
    const mapH = this.ts * this.s.h;
    this.oy = mapH <= availH ? Math.round(TOP + 10 + (availH - mapH) / 2) : TOP + 10;
    this.maxScroll = Math.max(0, mapH - availH);            // 넘치는 만큼 위아래로 끌어서 봄
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    this.drawMap();
    this.hl = this.add.layer().setDepth(20);       // 이동·공격 범위 칸
    this.views = new Map();
    for (const u of this.s.units) this.makeUnit(u);
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x262A14).setDepth(48);
    this.add.rectangle(W / 2, H - BOTTOM / 2 + 4, W, BOTTOM + 8, 0x262A14).setDepth(48);
    this.makeHud(); this.makePanel();
    this.input.on('pointerup', p => { if (this.holdFast) { this.holdFast = false; if (this.s.turn === 2 && this.speed < 14) this.speed = 2; } this.tap(p); });
    this.input.on('pointerdown', p => { if (this.s.turn === 2 && this.busy && this.speed < 14) { this.holdFast = true; this.speed = 5; } this.dragFrom = this.maxScroll && p.y > TOP && p.y < H - BOTTOM ? { y: p.y, s: this.cameras.main.scrollY } : null; this.dragged = false; });
    this.input.on('pointermove', p => { if (!this.dragFrom || !p.isDown) return; const dy = p.y - this.dragFrom.y; if (Math.abs(dy) > 14) this.dragged = true; if (this.dragged) this.cameras.main.scrollY = Phaser.Math.Clamp(this.dragFrom.s - dy, 0, this.maxScroll); });
    audio.music('bgm_battle', this);
    this.cameras.main.fadeIn(300, 20, 22, 10);
    window.__play = this;
    const hq = this.s.tiles.findIndex(t => t.t === 'hq' && t.owner === 1); if (hq >= 0) this.follow(hq % this.s.w, (hq / this.s.w) | 0, true);
    this.time.delayedCall(350, () => this.startTurn());
  }

  // 사람이 조작하는 쪽: 2인 대전이면 지금 차례 · 아니면 파랑(1)
  get me() { return this.mode === 'versus' ? this.s.turn : 1; }
  get foe() { return this.me === 1 ? 2 : 1; }
  human(p) { return this.mode === 'versus' || p === 1; }
  // 안개 속에서 보이는지 (보는 쪽 = me)
  vis(u) { return !!u && (u.p === this.me || !this.s.fog || this.s.canSee(this.me, u)); }
  unitSeen(x, y) { const u = this.s.unitAt(x, y); return this.vis(u) ? u : null; }
  // 화면 고정: 위·아래 정보칸과 팝업은 지도를 끌어도 그대로
  // 묶음(container) 안의 버튼도 고정해야 터치 위치가 맞음 (Phaser 는 터치 판정에 자식의 값을 씀) — 버튼이 나중에 추가되므로 매 프레임 확인
  update() {
    const fix = o => { if (o.scrollFactorX !== 0) o.setScrollFactor(0); if (o.list) for (const c of o.list) fix(c); };
    for (const o of this.children.list) if (o.scrollFactorX === 0 || (o.depth >= 48 && o.depth <= 50) || o.depth >= 800) fix(o);
  }
  // 칸이 화면 밖이면 그 칸이 보이게 지도를 옮김
  follow(x, y, now) {
    if (!this.maxScroll) return;
    const cam = this.cameras.main, [, py] = this.xy(x, y), top = cam.scrollY + TOP + this.ts * 0.6, bot = cam.scrollY + H - BOTTOM - this.ts * 0.6;
    if (py >= top && py <= bot) return;
    const to = Phaser.Math.Clamp(py - (TOP + (H - BOTTOM)) / 2, 0, this.maxScroll);
    if (now) cam.scrollY = to; else this.tweens.add({ targets: cam, scrollY: to, duration: 220 / this.speed, ease: 'Sine.easeInOut' });
  }

  // ── 지도 ──
  xy(x, y) { return [this.ox + x * this.ts + this.ts / 2, this.oy + y * this.ts + this.ts / 2]; }
  cell(px, py) { const x = Math.floor((px - this.ox) / this.ts), y = Math.floor((py - this.oy) / this.ts); return this.s.tile(x, y) ? [x, y] : null; }
  drawMap() {
    const s = this.s, ts = this.ts;
    const kind = (x, y) => (s.tile(x, y) || {}).t;
    const roadish = t => ['road', 'bridge', 'city', 'base', 'air', 'hq'].includes(t);
    this.bld = new Map();
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = s.tile(x, y), [px, py] = this.xy(x, y);
      let key = `t_${t.t}`, ang = 0;
      if (t.t === 'road') {
        const h = roadish(kind(x - 1, y)) || roadish(kind(x + 1, y)), v = roadish(kind(x, y - 1)) || roadish(kind(x, y + 1));
        key = h && v ? 't_road_x' : 't_road_h'; if (!h && v) ang = 90;
      } else if (t.t === 'river') { key = 't_river_h'; const h = ['river', 'bridge'].includes(kind(x - 1, y)) || ['river', 'bridge'].includes(kind(x + 1, y)); if (!h) ang = 90; }
      else if (t.t === 'bridge') { key = 't_bridge_h'; if (kind(x - 1, y) === 'river' || kind(x + 1, y) === 'river') ang = 90; }
      else if (t.t === 'reef') key = 't_sea';
      else if (BLD[t.t]) key = t.t === 'port' ? 't_sea' : 't_plain';
      const im = this.add.image(px, py, key).setDisplaySize(ts + 1, ts + 1).setAngle(ang).setDepth(1);
      if (['plain', 'forest', 'farm', 'wheat', 'sea'].includes(t.t) && (x * 7 + y * 13) % 2) im.setFlipX(true);
      if (t.t === 'reef') { const g = this.add.graphics().setDepth(1.2); for (const [rx, ry, rr] of [[-0.22, -0.12, 0.13], [0.18, 0.05, 0.16], [-0.05, 0.22, 0.1], [0.25, -0.24, 0.08]]) { g.fillStyle(0x6E7468, 1).fillEllipse(px + rx * ts, py + ry * ts, rr * ts * 2.2, rr * ts * 1.5).fillStyle(0xA9AE9C, 1).fillEllipse(px + rx * ts - 3, py + ry * ts - 4, rr * ts * 1.4, rr * ts * 0.8).lineStyle(3, 0xD8F2FF, 0.6).strokeEllipse(px + rx * ts, py + ry * ts + 4, rr * ts * 2.6, rr * ts * 1.6); } }
      if (BLD[t.t]) this.drawBld(x, y);
    }
    // 지형 톤 낮추기 (유닛·건물이 앞으로 나와 보이게)
    this.add.rectangle(this.ox + s.w * ts / 2, this.oy + s.h * ts / 2, s.w * ts, s.h * ts, 0x2A2A18, 0.22).setDepth(1.5);
    // 칸 선
    const g = this.add.graphics().setDepth(2); g.lineStyle(2, 0x1A1C0C, 0.22);
    for (let x = 0; x <= s.w; x++) g.lineBetween(this.ox + x * ts, this.oy, this.ox + x * ts, this.oy + s.h * ts);
    for (let y = 0; y <= s.h; y++) g.lineBetween(this.ox, this.oy + y * ts, this.ox + s.w * ts, this.oy + y * ts);
    g.lineStyle(6, 0x14160A, 0.8).strokeRect(this.ox - 3, this.oy - 3, s.w * ts + 6, s.h * ts + 6);
  }
  drawBld(x, y) {
    const t = this.s.tile(x, y), [px, py] = this.xy(x, y), ts = this.ts;
    const key = `b_${BLD[t.t]}_${t.owner === 1 ? 'b' : t.owner === 2 ? 'r' : 'n'}`;
    let v = this.bld.get(`${x},${y}`);
    if (!v) { v = this.add.container(px, py).setDepth(4 + y * 0.01); v.plate = this.add.graphics(); v.img = this.add.image(0, ts * 0.4, key).setOrigin(0.5, 1); v.bar = this.add.graphics().setPosition(px, py).setDepth(30); v.add([v.plate, v.img]); this.bld.set(`${x},${y}`, v); }
    v.img.setTexture(key); const sc = ts * 0.92 / Math.max(v.img.width, v.img.height * 0.95); v.img.setScale(sc);
    const pc = t.owner === 1 ? TEAM[1] : t.owner === 2 ? TEAM[2] : 0x8C8C78;
    v.plate.clear().fillStyle(pc, t.owner ? 0.55 : 0.35).fillRoundedRect(-ts * 0.46, -ts * 0.46, ts * 0.92, ts * 0.92, ts * 0.14).lineStyle(4, pc, t.owner ? 0.95 : 0.5).strokeRoundedRect(-ts * 0.46, -ts * 0.46, ts * 0.92, ts * 0.92, ts * 0.14);
    v.bar.clear();
    if (t.cap < 20) { const w = ts * 0.8; v.bar.fillStyle(0x000000, 0.6).fillRoundedRect(-w / 2, -ts * 0.48, w, 12, 6).fillStyle(0xFFD45A, 1).fillRoundedRect(-w / 2, -ts * 0.48, w * (1 - t.cap / 20), 12, 6); }
  }

  // ── 유닛 ──
  // 유닛: 칸보다 크게 서 있는 말 + 흰 외곽선 + 팀 색 원판 + 큰 체력 배지 + 행동 상태(✓ · 발밑 빛)
  makeUnit(u) {
    const [px, py] = this.xy(u.x, u.y), ts = this.ts, c = this.add.container(px, py).setDepth(10 + u.y * 0.01);
    const key = `u_${u.type}_${TEAMS[u.p]}`, foot = ts * 0.4;
    const glow = this.add.ellipse(0, foot - ts * 0.04, ts * 0.98, ts * 0.36, 0xFFF2A0, 0).setBlendMode('ADD');
    const ring = this.add.ellipse(0, foot - ts * 0.04, ts * 0.86, ts * 0.3, TEAM[u.p], 0.9).setStrokeStyle(3, 0xFFFFFF, 0.9);
    const probe = this.textures.get(key).getSourceImage();
    const k = Math.min(ts * 1.25 / probe.width, ts * 0.98 / probe.height);
    // 흰 외곽선: 같은 그림을 흰색으로 칠해 네 방향으로 살짝 밀어 깔기
    const outline = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5]].map(([dx, dy]) => this.add.image(dx * 1.4, foot + dy * 1.4, key).setOrigin(0.5, 1).setScale(k).setTintFill(0xFFFFFF));
    const img = this.add.image(0, foot, key).setOrigin(0.5, 1).setScale(k); img.base = k;
    if (UNITS[u.type].dom === 'air') { const lift = ts * 0.2; [img, ...outline].forEach(o => { o.y -= lift; this.tweens.add({ targets: o, y: o.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }); }
    const hp = this.add.container(ts * 0.3, -ts * 0.28);
    const hpBg = this.add.circle(0, 0, ts * 0.18, 0x111111, 0.95).setStrokeStyle(4, 0xFFFFFF);
    const hpT = T(this, 0, 1, '', Math.round(ts * 0.25), '#FFFFFF', { w: 900, shadow: false });
    hp.add([hpBg, hpT]);
    const done = T(this, -ts * 0.32, -ts * 0.28, '✓', Math.round(ts * 0.3), '#FFFFFF', { w: 900, stroke: '#14160A', thick: 6 }).setVisible(false);
    const cargo = this.add.image(-ts * 0.32, -ts * 0.3, 'u_inf_' + TEAMS[u.p]).setScale(k * 0.5).setVisible(false);
    c.add([glow, ring, ...outline, img, hp, done, cargo]);
    Object.assign(c, { img, outline, ring, glow, hp, hpBg, hpT, doneT: done, cargo, uid: u.id });
    this.views.set(u.id, c); this.syncUnit(u);
    return c;
  }
  face(c, u, dx) { if (!dx) return; const right = dx > 0, f = u.p === 1 ? !right : right; c.img.setFlipX(f); c.outline.forEach(o => o.setFlipX(f)); }
  syncUnit(u) {
    const c = this.views.get(u.id); if (!c) return;
    c.setVisible(!u.inside && this.vis(u));
    const n = hpOf(u); c.hp.setVisible(n < 10); c.hpT.setText(n);
    c.hpBg.setFillStyle(n <= 3 ? 0xD9301E : n <= 6 ? 0xE8A21C : 0x111111, 0.95);
    c.cargo.setVisible(u.cargo.length > 0);
    const myTurn = this.human(this.s.turn) && u.p === this.s.turn, dim = u.done && myTurn, ready = !u.done && myTurn && !this.s.over;
    c.img.setTint(dim ? 0x808080 : 0xFFFFFF); c.outline.forEach(o => o.setAlpha(dim ? 0.35 : 0.95));
    c.ring.setAlpha(dim ? 0.35 : 0.9); c.doneT.setVisible(dim);
    // 행동할 수 있는 아군: 발밑이 은은하게 숨 쉼
    if (ready && !c.pulse) { c.glow.setAlpha(0.15); c.pulse = this.tweens.add({ targets: c.glow, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    if (!ready && c.pulse) { c.pulse.stop(); c.pulse = null; c.glow.setAlpha(0); }
  }
  syncAll() { for (const u of this.s.units) { if (!this.views.has(u.id)) this.makeUnit(u); this.syncUnit(u); } for (const [id, c] of this.views) if (!this.s.unit(id)) { c.destroy(); this.views.delete(id); } this.drawFog(); this.updateHud(); }
  // 안개: 보이지 않는 칸을 어둡게
  drawFog() {
    if (!this.s.fog) return;
    if (!this.fogG) this.fogG = this.add.graphics().setDepth(9);
    const g = this.fogG.clear(), ts = this.ts, v = this.s.visible(this.me);
    g.fillStyle(0x0A0E08, 0.55);
    for (let y = 0; y < this.s.h; y++) for (let x = 0; x < this.s.w; x++) if (!v.has(y * this.s.w + x)) g.fillRect(this.ox + x * ts, this.oy + y * ts, ts, ts);
  }

  // ── 위 정보 ──
  makeHud() {
    const D = 50, d = load();
    this.add.existing(panel(this, W / 2, 96, W - 24, 176, { r: 26 })).setDepth(D - 1);
    const face = this.add.image(96, 96, `co_${this.co}`).setDepth(D); face.setScale(130 / Math.max(face.width, face.height));
    const fm = this.make.graphics().setScrollFactor(0); fm.fillCircle(96, 96, 62); face.setMask(fm.createGeometryMask());
    this.coRing = this.add.circle(96, 96, 64).setStrokeStyle(5, TEAM[1]).setDepth(D);
    this.coFace = face; this.coName = T(this, 176, 58, COS[this.co].name, 32, C.text, { ox: 0, w: 900 }).setDepth(D);
    this.pwBarBg = this.add.graphics().setDepth(D); this.pwBar = this.add.graphics().setDepth(D);
    this.pwT = T(this, 176, 132, '', 24, C.sub, { ox: 0, w: 800 }).setDepth(D);
    this.pwBtn = btn(this, 330, 132, 170, 64, '필살기', () => this.usePower(), { style: 'gold', size: 24 }).setDepth(D).setVisible(false);
    this.dayT = T(this, W / 2 + 70, 60, '', 40, C.text, { w: 900, ls: 1 }).setDepth(D);
    this.turnT = T(this, W / 2 + 70, 112, '', 26, C.gold, { w: 900 }).setDepth(D);
    this.fundT = T(this, W - 140, 60, '', 34, C.gold, { ox: 1, w: 900 }).setDepth(D);
    this.add.image(W - 290, 60, 'i_star').setDisplaySize(34, 34).setTint(0xFFD45A).setDepth(D).setVisible(false);
    this.enT = T(this, W - 140, 112, '', 24, C.sub, { ox: 1, w: 800 }).setDepth(D);
    iconBtn(this, W - 72, 96, 'i_pause', () => this.pause(), 92).setDepth(D);
  }
  updateHud() {
    const s = this.s, me = this.me, foe = this.foe, coK = s.cos[me], co = COS[coK], k = Math.min(1, s.power[me] / co.sneed), kn = co.need / co.sneed;
    if (this.coFace.texture.key !== `co_${coK}`) { this.coFace.setTexture(`co_${coK}`); this.coFace.setScale(130 / Math.max(this.coFace.width, this.coFace.height)); this.coName.setText(co.name); }
    this.coRing.setStrokeStyle(5, TEAM[me]);
    this.dayT.setText(`DAY ${s.day} / ${s.limit}`);
    const vs = this.mode === 'versus';
    this.turnT.setText(vs ? (s.turn === 1 ? '파랑 차례' : '빨강 차례') : s.turn === 1 ? '아군 턴' : '적군 턴').setColor(s.turn === 1 ? C.blue : C.red);
    this.fundT.setText(`자금 ${fmt(s.funds[me])}`);
    this.enT.setText(`${vs ? '상대' : '적'} 자금 ${s.fog ? '?' : fmt(s.funds[foe])} · 건물 ${s.props(me)}:${s.props(foe)}`);
    // 게이지: 필살기 칸 · 초필살기 칸 (눈금)
    this.pwBarBg.clear().fillStyle(0x000000, 0.5).fillRoundedRect(176, 92, 230, 16, 8).fillStyle(0xFFFFFF, 0.8).fillRect(176 + 230 * kn - 1, 88, 3, 24);
    this.pwBar.clear().fillStyle(s.powerOn[me] ? 0xFF8A3D : k >= 1 ? 0xFF6A3D : k >= kn ? 0xFFD45A : 0x8EC2FF, 1).fillRoundedRect(176, 92, Math.max(16, 230 * k), 16, 8);
    const ready = this.human(s.turn) && s.powerReady(me, 1) && !this.busy, sup = ready && s.powerReady(me, 2);
    this.pwBtn.setVisible(ready).setLabel(sup ? '초필살기' : '필살기'); this.pwT.setVisible(!ready).setText(s.powerOn[me] ? `${s.powerOn[me] === 2 ? co.superp : co.power} 발동 중!` : `필살기 ${Math.floor(Math.min(1, k / kn) * 100)}%`);
    if (this.endBtn) this.endBtn.setEnabled(this.human(s.turn) && !this.busy);
    this.updateIdle();
  }

  // ── 아래 패널: 지형 · 유닛 정보 · 행동 버튼 ──
  makePanel() {
    const y0 = H - BOTTOM / 2 - 6, D = 50;
    this.add.existing(panel(this, W / 2, y0, W - 24, BOTTOM - 16, { r: 26 })).setDepth(D - 1);
    this.info = this.add.container(0, 0).setDepth(D);
    this.acts = this.add.container(0, 0).setDepth(D);
    this.endBtn = btn(this, W - 150, H - 82, 250, 104, '턴 종료', () => this.askEnd(), { style: 'red', size: 34 }).setDepth(D);
    this.nextBtn = btn(this, 170, H - 82, 290, 104, '다음 유닛', () => this.nextUnit(), { style: 'olive', size: 30 }).setDepth(D);
    this.dangerBtn = btn(this, 470, H - 82, 270, 104, '위험 지역', () => this.toggleDanger(), { style: 'ghost', size: 30 }).setDepth(D);
    this.skipBtn = btn(this, W / 2, H - 82, 420, 104, '적 턴 건너뛰기 ▶▶', () => { this.speed = 14; this.skipBtn.setVisible(false); }, { style: 'ghost', size: 30 }).setDepth(D).setVisible(false);
    this.dangerLayer = this.add.layer().setDepth(19);
    this.showInfo(null);
  }
  showInfo(x, y) {
    this.info.removeAll(true);
    const y0 = H - BOTTOM + 34, ix = 48;
    if (x == null) {
      this.info.add(T(this, ix, y0 + 40, this.human(this.s.turn) ? '유닛을 눌러 이동하세요 · 기지·비행장·항구를 누르면 생산' : '적군이 움직이는 중…', 28, C.sub, { ox: 0, w: 800 }));
      return;
    }
    const t = this.s.tile(x, y), tr = TERRAIN[t.t], u = this.unitSeen(x, y);
    // 지형
    const tk = BLD[t.t] ? `b_${BLD[t.t]}_${t.owner === 1 ? 'b' : t.owner === 2 ? 'r' : 'n'}` : `t_${t.t === 'road' ? 'road_h' : t.t === 'river' ? 'river_h' : t.t === 'bridge' ? 'bridge_h' : t.t === 'reef' ? 'sea' : t.t}`;
    const ti = this.add.image(ix + 56, y0 + 56, tk); ti.setScale(104 / Math.max(ti.width, ti.height)); this.info.add(ti);
    this.info.add(T(this, ix + 124, y0 + 22, tr.name, 30, C.text, { ox: 0, w: 900 }));
    for (let k = 0; k < 4; k++) this.info.add(T(this, ix + 124 + k * 30, y0 + 62, '★', 28, k < tr.def ? C.gold : '#4A4A30', { ox: 0, w: 900, shadow: false }));
    this.info.add(T(this, ix + 250, y0 + 62, `방어 ${tr.def}`, 24, C.sub, { ox: 0, w: 800 }));
    if (tr.prop) this.info.add(T(this, ix + 124, y0 + 98, `${t.owner === this.me ? '아군' : t.owner ? '적군' : '중립'}${t.cap < 20 ? ` · 점령 ${20 - t.cap}/20` : ''}`, 24, t.owner === 1 ? C.blue : t.owner === 2 ? C.red : C.sub, { ox: 0, w: 800 }));
    // 유닛
    if (u) {
      const U = UNITS[u.type], ux = 400;
      const ui = this.add.image(ux + 60, y0 + 60, `u_${u.type}_${TEAMS[u.p]}`); ui.setScale(124 / Math.max(ui.width, ui.height)); this.info.add(ui);
      this.info.add(T(this, ux + 132, y0 + 20, `${U.name}`, 32, u.p === 1 ? C.blue : C.red, { ox: 0, w: 900 }));
      const n = hpOf(u), hb = this.add.graphics(); hb.fillStyle(0x000000, 0.5).fillRoundedRect(ux + 132, y0 + 46, 260, 18, 9).fillStyle(n <= 3 ? 0xD9301E : n <= 6 ? 0xE8A21C : 0x6FCB4A, 1).fillRoundedRect(ux + 132, y0 + 46, Math.max(18, 26 * n), 18, 9); this.info.add(hb);
      this.info.add(T(this, ux + 402, y0 + 55, `${n}/10`, 24, C.text, { ox: 0, w: 900 }));
      this.info.add(T(this, ux + 132, y0 + 92, `이동 ${this.s.moveOf(u)}${U.range ? ` · 사거리 ${this.s.rangeOf(u).join('~')}` : ` · 수송 ${u.cargo.length}/${U.carry.n}`}`, 24, C.text, { ox: 0, w: 800 }));
      // 상성: 강한 상대 · 조심할 상대 (각 2종)
      const others = UNIT_ORDER.filter(t => UNITS[t].range);
      const strong = others.slice().sort((a, b) => base(u.type, b) - base(u.type, a)).slice(0, 2).filter(t => base(u.type, t) >= 55);
      const weak = others.slice().sort((a, b) => base(b, u.type) - base(a, u.type)).slice(0, 2).filter(t => base(t, u.type) >= 55);
      let cx = 48;
      const chip = (label, list, col) => { if (!list.length) return; this.info.add(T(this, cx, y0 + 140, label, 22, col, { ox: 0, w: 900 })); cx += 88; for (const t of list) { const im = this.add.image(cx + 26, y0 + 138, `u_${t}_${u.p === 1 ? 'r' : 'b'}`); im.setScale(52 / Math.max(im.width, im.height)); this.info.add(im); this.info.add(T(this, cx + 58, y0 + 140, UNITS[t].name, 22, C.text, { ox: 0, w: 800 })); cx += 70 + UNITS[t].name.length * 22; } cx += 20; };
      chip('강함 ▲', strong, '#9BE07A'); chip('조심 ▼', weak, '#FF8A7A');
    }
  }
  setActs(list) {
    this.acts.removeAll(true);
    [this.endBtn, this.nextBtn, this.dangerBtn].forEach(b => b.setVisible(!list));
    if (!list) { this.updateIdle(); return; }
    const n = list.length, w = Math.min(240, (W - 80 - (n - 1) * 16) / n), y = H - 82;
    list.forEach(([label, fn, style], i) => this.acts.add(btn(this, 40 + w / 2 + i * (w + 16), y, w, 100, label, fn, { style: style || 'olive', size: 32 })));
  }

  // 다음 유닛 · 위험 지역
  updateIdle() {
    if (!this.nextBtn) return;
    const left = this.s.mine(this.me).filter(u => !u.done && !u.inside).length, h = this.human(this.s.turn);
    this.nextBtn.setLabel(left ? `다음 유닛 ${left}` : '모두 완료').setEnabled(left > 0 && h && !this.busy);
    this.dangerBtn.setEnabled(h && !this.busy);
  }
  nextUnit() {
    if (this.busy || !this.human(this.s.turn)) return;
    const list = this.s.mine(this.me).filter(u => !u.done && !u.inside).sort((a, b) => a.y - b.y || a.x - b.x);
    if (!list.length) return;
    this.nextIdx = ((this.nextIdx ?? -1) + 1) % list.length;
    const u = list[this.nextIdx]; this.follow(u.x, u.y); this.showInfo(u.x, u.y); this.select(u);
    const c = this.views.get(u.id); if (c) this.tweens.add({ targets: c, scale: 1.18, duration: 120, yoyo: true });
  }
  toggleDanger() { this.danger = !this.danger; this.dangerBtn.setLabel(this.danger ? '위험 지역 끄기' : '위험 지역'); this.drawDanger(); }
  // 적 전부의 다음 턴 공격 범위 (빨간 그물)
  drawDanger() {
    this.dangerLayer.removeAll(true);
    if (!this.danger || !this.human(this.s.turn)) return;
    const set = new Set();
    for (const e of this.s.units) {
      if (e.p === this.me || e.inside || !this.vis(e)) continue; const r = this.s.rangeOf(e); if (!r) continue;
      const from = UNITS[e.type].indirect ? [[e.x, e.y]] : [...this.s.reach(e).values()].filter(v => v.stop).map(v => [v.x, v.y]);
      for (const [fx, fy] of from) for (let dx = -r[1]; dx <= r[1]; dx++) for (let dy = -r[1]; dy <= r[1]; dy++) { const dd = Math.abs(dx) + Math.abs(dy); if (dd >= r[0] && dd <= r[1] && this.s.tile(fx + dx, fy + dy)) set.add(`${fx + dx},${fy + dy}`); }
    }
    for (const k of set) {
      const [x, y] = k.split(',').map(Number), [px, py] = this.xy(x, y), ts = this.ts;
      const g = this.add.graphics(); g.fillStyle(0xFF2A10, 0.16).fillRect(px - ts / 2, py - ts / 2, ts, ts); g.lineStyle(2, 0xFF5030, 0.45);
      const x0 = px - ts / 2, y0 = py - ts / 2; for (let k = 18; k < ts * 2; k += 18) g.lineBetween(x0 + Math.min(k, ts), y0 + Math.max(0, k - ts), x0 + Math.max(0, k - ts), y0 + Math.min(k, ts));
      this.dangerLayer.add(g);
    }
  }
  // 이어하기 저장 (아군 턴 시작마다)
  autosave() {
    if (this.auto || this.mode === 'versus' || this.map.custom) return;
    try { localStorage.setItem('front_tactics_resume', JSON.stringify({ mode: this.mode, mapId: this.map.id, level: this.level, co: this.co, enemyCo: this.enemyCo, captures: this.captures, powers: this.powers, sim: this.s.snapshot(), at: Date.now() })); } catch { /* */ }
  }

  // ── 범위 칸 ──
  clearHl() { this.hl.removeAll(true); }
  mark(x, y, col, a = 0.42, line = false) {
    const [px, py] = this.xy(x, y), r = this.add.rectangle(px, py, this.ts - 4, this.ts - 4, col, line ? 0 : a);
    if (line) r.setStrokeStyle(5, col, 0.95); this.hl.add(r); return r;
  }

  // ── 턴 ──
  async startTurn() {
    const s = this.s; this.syncAll();
    if (s.turn === 1 && this.enemySum) { const m = this.enemySum; this.enemySum = null; this.time.delayedCall(900, () => toast(this, m, m.includes('없음') ? C.green : C.pink, TOP + 60)); }
    if (this.resumed) { this.resumed = false; toast(this, `이어하기 · DAY ${s.day}`, C.gold, TOP + 60); }
    if (this.mode === 'versus') { await this.handoff(); this.syncAll(); }
    else await this.banner(s.turn === 1 ? `DAY ${s.day}` : '적군 턴', s.turn === 1 ? '아군 턴 · 작전을 시작하세요' : COS[this.enemyCo].name + ' 장군이 움직여요', s.turn === 1 ? C.blue : C.red);
    if (!this.human(s.turn)) { audio.music('bgm_enemy', this); this.speed = 2; this.setActs(null); [this.endBtn, this.nextBtn, this.dangerBtn].forEach(b => b.setVisible(false)); this.skipBtn.setVisible(true); await this.enemyTurn(); }
    else { audio.music('bgm_battle', this); this.speed = 1; this.skipBtn.setVisible(false); this.setActs(null); this.autosave(); this.drawDanger(); if (this.auto) return this.enemyTurn(1); if (!load().tips.war) this.tutorial(); }
  }
  banner(title, sub, col) {
    audio.play('sfx_turn', { volume: 0.6 });
    const c = this.add.container(W / 2, H / 2).setDepth(900).setAlpha(0);
    const bg = this.add.rectangle(0, 0, W, 210, 0x14160A, 0.85); const ln = this.add.rectangle(0, -105, W, 6, Phaser.Display.Color.HexStringToColor(col).color); const ln2 = this.add.rectangle(0, 105, W, 6, Phaser.Display.Color.HexStringToColor(col).color);
    c.add([bg, ln, ln2, T(this, 0, -24, title, 76, C.text, { w: 900, ls: 3 }), T(this, 0, 52, sub, 30, col, { w: 800 })]);
    return new Promise(r => { this.tweens.add({ targets: c, alpha: 1, duration: 200, hold: 700 / this.speed, yoyo: true, onComplete: () => { c.destroy(); r(); } }); });
  }
  // 2인 대전: 차례가 바뀌면 화면을 가리고 넘겨받은 사람이 눌러야 시작 (상대 진영을 못 보게)
  handoff() {
    const s = this.s, p = s.turn, col = p === 1 ? 0x1E4C94 : 0x8E2414;
    audio.play('sfx_turn', { volume: 0.6 });
    const c = this.add.container(0, 0).setDepth(990);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, col, 1).setInteractive());
    const face = this.add.image(W / 2, H / 2 - 260, `co_${s.cos[p]}`); face.setScale(360 / face.height); c.add(face);
    c.add(T(this, W / 2, H / 2 + 20, `${p === 1 ? '파랑' : '빨강'} 차례 · DAY ${s.day}`, 64, C.text, { w: 900 }));
    c.add(T(this, W / 2, H / 2 + 100, `${COS[s.cos[p]].name} 지휘관에게 폰을 넘겨주세요`, 32, '#FFE9B0', { w: 800 }));
    c.add(T(this, W / 2, H / 2 + 220, '화면을 누르면 시작', 34, C.gold, { w: 900 }));
    return new Promise(r => c.list[0].once('pointerup', () => { c.destroy(); r(); }));
  }
  askEnd() {
    if (this.busy || !this.human(this.s.turn)) return;
    const left = this.s.mine(this.me).filter(u => !u.done && !u.inside).length;
    if (!left) return this.endTurn();
    const p = popup(this, '턴 종료', 760, 520);
    p.content.add(T(this, 0, -60, `아직 움직이지 않은 유닛이 ${left}기 있어요`, 30, C.sub, { w: 800 }));
    p.content.add(btn(this, -170, 110, 300, 110, '계속 지휘', () => p.close(), { style: 'olive', size: 32 }));
    p.content.add(btn(this, 170, 110, 300, 110, '턴 종료', () => { p.close(); this.endTurn(); }, { style: 'red', size: 32 }));
  }
  async endTurn() {
    this.cancelSel(); this.busy = true; this.setActs(null); this.updateHud();
    this.s.endTurn(); await this.drain();
    if (this.s.over) return this.finish();
    this.busy = false; this.startTurn();
  }
  async enemyTurn(p = 2) {
    this.busy = true; this.updateHud(); this.showInfo(null);
    const before = { lost: this.s.stats.lost[1], props: this.s.props(1) };
    const ai = p === 2 ? this.ai : (this.autoAi ||= new AI('hard'));
    let guard = 0;
    while (this.s.turn === p && !this.s.over && guard++ < 400) {
      let a = { kind: 'end' };
      try { a = ai.next(this.s); apply(this.s, a); await this.drain(a); }
      catch (err) { console.warn('적 턴 오류 — 턴을 넘김', err); this.s.events.length = 0; if (this.s.turn === p) this.s.endTurn(); this.s.events.length = 0; break; }
      if (a.kind === 'end') break;
      await sleep(this, 90 / this.speed);
    }
    if (this.s.over) return this.finish();
    if (p === 2 && this.mode !== 'versus') { const lost = this.s.stats.lost[1] - before.lost, pl = before.props - this.s.props(1); const msg = [lost ? `아군 ${lost}기 손실` : '', pl > 0 ? `건물 ${pl}곳 빼앗김` : ''].filter(Boolean).join(' · '); this.enemySum = msg || '적 턴 동안 피해 없음!'; }
    this.busy = false; this.showInfo(null); this.startTurn();
  }

  // ── 사건 재생 (이동 · 공격 · 점령 · 생산 · 필살기) ──
  async drain() {
    const evs = this.s.events.splice(0); this.pendingEvs = evs;
    while (evs.length) await this.playEv(evs.shift());
    this.syncAll();
  }
  async playEv(e) {
    const sp = this.speed;
    if (e.type === 'move') {
      const c = this.views.get(e.id), u = this.s.unit(e.id); if (!c || !u || e.path.length < 2) return;
      // 안개: 보이는 칸을 지나지 않는 적의 이동은 보여 주지 않음
      const seenAny = u.p === this.me || !this.s.fog || e.path.some(([x, y]) => this.s.seen(this.me, x, y));
      if (!seenAny) { const [px, py] = this.xy(u.x, u.y); c.setPosition(px, py); return; }
      if (!this.human(u.p)) { this.follow(...e.path[e.path.length - 1]); await sleep(this, 120 / this.speed); }
      c.setVisible(!u.inside);
      audio.play(MOVE_SND[UNITS[u.type].mt], { volume: 0.45, gap: 200 });
      for (let i = 1; i < e.path.length; i++) {
        const [x, y] = e.path[i], [px, py] = this.xy(x, y); this.face(c, u, x - e.path[i - 1][0]);
        await new Promise(r => this.tweens.add({ targets: c, x: px, y: py, duration: 85 / sp, onComplete: r }));
        c.setDepth(10 + y * 0.01);
      }
    } else if (e.type === 'attack' || e.type === 'counter') {
      if (e.type === 'attack' && this.cutsceneOn()) { const nx = this.pendingEvs && this.pendingEvs[0]; const ctr = nx && nx.type === 'counter' && nx.a === e.d ? this.pendingEvs.shift() : null; await this.cutscene(e, ctr); }
      else await this.fight(e.a, e.d, e.dmg, e.type === 'counter');
    } else if (e.type === 'trap') {
      const [px, py] = this.xy(e.x, e.y); audio.play('sfx_cancel', { volume: 0.8 }); this.cameras.main.shake(160, 0.006);
      this.float(px, py - this.ts * 0.6, '매복! 적과 마주쳤어요', C.pink, 34);
      const ex = this.views.get(e.by); if (ex) { ex.setVisible(true); this.tweens.add({ targets: ex, scale: 1.15, duration: 160, yoyo: true }); }
      await sleep(this, 600 / sp);
    } else if (e.type === 'kill') {
      const c = this.views.get(e.id); this.boom(...this.xy(e.x, e.y), 1.4); audio.play('sfx_explode', { volume: 0.7 });
      if (c) { this.views.delete(e.id); this.tweens.add({ targets: c, alpha: 0, scale: 0.6, duration: 300, onComplete: () => c.destroy() }); }
      await sleep(this, 260 / sp);
    } else if (e.type === 'capture') {
      const [px, py] = this.xy(e.x, e.y);
      audio.play(e.done ? 'sfx_captured' : 'sfx_capture', { volume: 0.7 });
      this.drawBld(e.x, e.y);
      if (e.done) { const ow = this.s.tile(e.x, e.y).owner; this.float(px, py - this.ts * 0.6, e.t === 'hq' ? '본부 점령!' : '점령 완료!', ow === 1 ? C.gold : C.red, 36); if (ow === 1) this.captures++; this.flash(px, py, 0xFFD45A); }
      else this.float(px, py - this.ts * 0.6, `점령 ${20 - e.left}/20`, C.text, 28);
      await sleep(this, 420 / sp);
    } else if (e.type === 'build') {
      const u = this.s.unit(e.id); const c = this.makeUnit(u); c.setScale(0.3); audio.play('sfx_build', { volume: 0.6 });
      await new Promise(r => this.tweens.add({ targets: c, scale: 1, duration: 260 / sp, ease: 'Back.easeOut', onComplete: r }));
    } else if (e.type === 'power') await this.powerFx(e.p, e.lvl);
    else if (e.type === 'load') { const c = this.views.get(e.id); if (c) c.setVisible(false); }
    else if (e.type === 'unload') { const c = this.views.get(e.id), [px, py] = this.xy(e.x, e.y); if (c) { c.setVisible(true); const [fx, fy] = this.xy(...[this.s.unit(e.from).x, this.s.unit(e.from).y]); c.setPosition(fx, fy); await new Promise(r => this.tweens.add({ targets: c, x: px, y: py, duration: 160 / sp, onComplete: r })); } }
    else if (e.type === 'repair') { const c = this.views.get(e.id); if (c && c.visible) this.float(c.x, c.y - this.ts * 0.4, '+수리', C.green, 24); }
    this.syncAll();
  }
  async fight(aid, did, dmg, counter) {
    const a = this.views.get(aid), d = this.views.get(did), au = this.s.unit(aid) || { type: 'inf', p: 1 }, du = this.s.unit(did);
    if (!a || !d) return;
    if (du) this.follow(du.x, du.y);
    const sp = this.speed, U = UNITS[au.type];
    this.face(a, au, d.x - a.x);
    audio.play(SND[au.type], { volume: 0.6 });
    if (U.indirect) {   // 포탄이 포물선으로
      const sh = this.add.image(a.x, a.y - 20, 'glow').setTint(0xFFE0A0).setScale(0.35).setBlendMode('ADD').setDepth(60);
      const mx = (a.x + d.x) / 2, my = Math.min(a.y, d.y) - 220;
      await new Promise(r => this.tweens.addCounter({ from: 0, to: 1, duration: 420 / sp, onUpdate: tw => { const k = tw.getValue(); sh.setPosition((1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * mx + k * k * d.x, (1 - k) * (1 - k) * (a.y - 20) + 2 * (1 - k) * k * my + k * k * d.y); }, onComplete: () => { sh.destroy(); r(); } }));
    } else {           // 앞으로 살짝 돌진 + 총구 섬광 + 탄
      const dx = Math.sign(d.x - a.x) * 18, dy = Math.sign(d.y - a.y) * 18;
      this.tweens.add({ targets: a, x: a.x + dx, y: a.y + dy, duration: 80 / sp, yoyo: true });
      for (let k = 0; k < (['inf', 'recon', 'aa', 'heli'].includes(au.type) ? 3 : 1); k++) {
        const b = this.add.image(a.x, a.y - 10, 'glow').setTint(0xFFF0A0).setScale(0.18).setBlendMode('ADD').setDepth(60);
        this.tweens.add({ targets: b, x: d.x + (Math.random() - 0.5) * 20, y: d.y - 10 + (Math.random() - 0.5) * 20, duration: 140 / sp, delay: k * 60 / sp, onComplete: () => b.destroy() });
      }
      await sleep(this, 200 / sp);
    }
    this.boom(d.x, d.y, dmg > 40 ? 1.1 : 0.7); audio.play(dmg > 40 ? 'sfx_explode' : 'sfx_mg', { volume: 0.5, gap: 60 });
    this.tweens.add({ targets: d, x: d.x + 8, duration: 40, yoyo: true, repeat: 3 });
    this.float(d.x, d.y - this.ts * 0.45, `-${Math.ceil(dmg / 10) || 0}`, counter ? C.pink : '#FFE27A', 40);
    if (du) this.syncUnit(du);
    await sleep(this, 360 / sp);
  }
  boom(x, y, s = 1) {
    if (this.anims.exists('sheet_boom')) { const b = this.add.sprite(x, y, 'sheet_boom').setScale(s * this.ts / 140).setDepth(70); b.play('sheet_boom'); b.once('animationcomplete', () => b.destroy()); }
    const f = this.add.image(x, y, 'glow').setTint(0xFFB050).setBlendMode('ADD').setScale(0.3 * s).setDepth(69);
    this.tweens.add({ targets: f, scale: 1.4 * s, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    for (let k = 0; k < 6; k++) { const p = this.add.image(x, y, 'spark').setTint(0xFFD080).setBlendMode('ADD').setScale(0.3).setDepth(70); const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 50; this.tweens.add({ targets: p, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, alpha: 0, duration: 380, onComplete: () => p.destroy() }); }
  }
  flash(x, y, col) { const r = this.add.image(x, y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.2).setDepth(65); this.tweens.add({ targets: r, scale: 1.2, alpha: 0, duration: 500, onComplete: () => r.destroy() }); }
  float(x, y, s, col, size = 34) { const t = T(this, x, y, s, size, col, { w: 900, stroke: '#14160A', thick: 6 }).setDepth(80); this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 350, duration: 650, onComplete: () => t.destroy() }); }
  async powerFx(p, lvl = 1) {
    const co = this.s.cos[p], c = this.add.container(0, H / 2).setDepth(950);
    audio.play('sfx_power', { volume: 0.8 }); this.cameras.main.flash(250, 255, 220, 140);
    const bg = this.add.rectangle(W / 2, 0, W, 300, p === 1 ? 0x1E4C94 : 0x8E2414, 0.92);
    const face = this.add.image(-200, 0, `co_${co}`); face.setScale(300 / face.height);
    c.add([bg, face, T(this, W / 2 + 120, -40, lvl === 2 ? COS[co].superp : COS[co].power, 70, C.gold, { w: 900, stroke: '#14160A', thick: 8 }), T(this, W / 2 + 120, 50, lvl === 2 ? COS[co].sdesc : COS[co].pdesc, 28, C.text, { w: 800, wrap: 640 })]);
    if (lvl === 2) c.add(T(this, W / 2 + 120, -110, '초필살기', 34, '#FF8A6A', { w: 900, ls: 6 }));
    this.tweens.add({ targets: face, x: 200, duration: 300, ease: 'Back.easeOut' });
    await sleep(this, 1500 / this.speed);
    await new Promise(r => this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => { c.destroy(); r(); } }));
    if (p === 1) this.powers++;
    this.drawFog();
  }

  // ── 플레이어 입력 ──
  tap(p) {
    if (this.busy || !this.human(this.s.turn) || this.s.over || this.paused) return;
    if (p.y < TOP || p.y > H - BOTTOM) return;
    if (this.dragged) { this.dragged = false; return; }
    const c = this.cell(p.worldX, p.worldY); if (!c) return;
    const [x, y] = c, s = this.s;
    audio.play('sfx_click', { volume: 0.35 });
    if (this.state === 'idle') {
      const u = this.unitSeen(x, y), me = this.me;
      this.showInfo(x, y);
      if (u && u.p === me && !u.done) return this.select(u);
      if (u && u.p !== me) return this.showEnemyRange(u);
      const t = s.tile(x, y);
      if (!u && !s.unitAt(x, y) && t.owner === me && TERRAIN[t.t].builds) return this.buildMenu(x, y);
      this.clearHl(); return;
    }
    if (this.state === 'move') {
      const v = this.reach.get(`${x},${y}`);
      if (v && v.stop) return this.moveTo(x, y);
      this.cancelSel(); return this.tap(p);
    }
    if (this.state === 'target') {
      const e = this.unitSeen(x, y);
      if (e && this.tgts.includes(e)) { if (this.pending === e) return this.doAttack(e); return this.preview(e); }
      this.toAct(); return;
    }
    if (this.state === 'unload') { if (this.spots.some(([a, b]) => a === x && b === y)) return this.doUnload(x, y); this.toAct(); }
  }
  select(u) {
    this.sel = u; this.state = 'move'; this.clearHl();
    this.reach = this.s.reach(u);
    audio.play('sfx_select', { volume: 0.5 });
    // 이동 가능 칸(파랑) · 공격 가능 칸(빨강 테두리)
    const atk = new Set();
    for (const v of this.reach.values()) {
      if (!v.stop) continue;
      this.mark(v.x, v.y, 0x5AA8FF, 0.4);
      const r = this.s.rangeOf(u); if (!r) continue;
      if (UNITS[u.type].indirect && (v.x !== u.x || v.y !== u.y)) continue;
      for (let dx = -r[1]; dx <= r[1]; dx++) for (let dy = -r[1]; dy <= r[1]; dy++) { const dd = Math.abs(dx) + Math.abs(dy); if (dd >= r[0] && dd <= r[1]) atk.add(`${v.x + dx},${v.y + dy}`); }
    }
    for (const k of atk) { const [x, y] = k.split(',').map(Number); if (!this.s.tile(x, y)) continue; const e = this.s.unitAt(x, y); if (e && e.p !== u.p) this.mark(x, y, 0xFF5040, 0.5, true); else if (UNITS[u.type].indirect) { const r = this.mark(x, y, 0xFF5040, 0, true); r.setStrokeStyle(3, 0xFF5040, 0.6); } }
    const sel = this.mark(u.x, u.y, 0xFFE27A, 0, true); this.tweens.add({ targets: sel, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
    // 제자리에서 바로 쏠 수 있으면 [공격] 버튼 (원거리 무기는 움직이지 않아야 쏠 수 있음)
    const here = this.s.targets(u, u.x, u.y, false), list = [];
    const R0 = this.s.rangeOf(u);
    if (here.length) list.push(['공격', () => { this.ghost = [u.x, u.y]; this.toAct(); this.toTarget(); }, 'red']);
    else if (UNITS[u.type].indirect) list.push(['공격', () => toast(this, `사거리 ${R0[0]}~${R0[1]}칸 안에 적이 없어요 · 빨간 테두리 칸에 적이 오면 쏠 수 있어요`, C.sub, TOP + 60), 'ghost']);
    list.push(['취소', () => this.cancelSel(), 'ghost']);
    this.setActs(list);
    if (UNITS[u.type].indirect) toast(this, here.length ? '[공격]을 누르면 바로 포격해요' : '빨간 테두리 = 사거리 · 움직이면 이번 턴엔 못 쏴요', C.sub, TOP + 60);
  }
  showEnemyRange(u) {
    this.clearHl(); const r = this.s.rangeOf(u); if (!r) return;
    const from = UNITS[u.type].indirect ? [[u.x, u.y]] : [...this.s.reach(u).values()].filter(v => v.stop).map(v => [v.x, v.y]);
    const set = new Set(); for (const [fx, fy] of from) for (let dx = -r[1]; dx <= r[1]; dx++) for (let dy = -r[1]; dy <= r[1]; dy++) { const dd = Math.abs(dx) + Math.abs(dy); if (dd >= r[0] && dd <= r[1] && this.s.tile(fx + dx, fy + dy)) set.add(`${fx + dx},${fy + dy}`); }
    for (const k of set) { const [x, y] = k.split(',').map(Number); this.mark(x, y, 0xFF5040, 0.3); }
  }
  cancelSel() {
    if (this.sel && this.ghost) { const c = this.views.get(this.sel.id), [px, py] = this.xy(this.sel.x, this.sel.y); c.setPosition(px, py).setDepth(10 + this.sel.y * 0.01); }
    this.sel = null; this.ghost = null; this.state = 'idle'; this.pending = null; this.clearHl(); this.setActs(null); this.showInfo(null);
  }
  async moveTo(x, y) {
    const u = this.sel, c = this.views.get(u.id), path = this.s.path(this.reach, x, y);
    // 안개: 길 위에 숨은 적이 있으면 바로 확정 (매복 처리)
    if (this.s.fog && path.slice(1).some(([px, py]) => { const o = this.s.unitAt(px, py); return o && o.p !== u.p; })) { this.ghost = [x, y]; return this.commit(() => {}); }
    this.clearHl(); this.busy = true;
    if (path.length > 1) { audio.play(MOVE_SND[UNITS[u.type].mt], { volume: 0.45 }); for (let i = 1; i < path.length; i++) { const [px, py] = this.xy(...path[i]); this.face(c, u, path[i][0] - path[i - 1][0]); await new Promise(r => this.tweens.add({ targets: c, x: px, y: py, duration: 70, onComplete: r })); } }
    c.setDepth(10 + y * 0.01);
    this.busy = false; this.ghost = [x, y];
    // 빈 트럭에 올라타기
    const o = this.s.unitAt(x, y);
    if (o && o !== u && this.s.canLoad(u, o)) { this.commit(() => this.s.wait(u.id)); return; }
    this.toAct();
  }
  // 이동한 자리에서 할 수 있는 행동
  toAct() {
    const u = this.sel, [x, y] = this.ghost, s = this.s, moved = x !== u.x || y !== u.y;
    this.state = 'act'; this.clearHl(); this.pending = null;
    this.mark(x, y, 0xFFE27A, 0, true);
    this.tgts = s.targets(u, x, y, moved);
    const t = s.tile(x, y), list = [];
    if (this.tgts.length) list.push(['공격', () => this.toTarget(), 'red']);
    if (UNITS[u.type].capture && TERRAIN[t.t].prop && t.owner !== u.p) list.push(['점령', () => this.commit(() => s.capture(u.id)), 'gold']);
    if (u.cargo.length) { const sv = [u.x, u.y]; u.x = x; u.y = y; this.spotsCache = s.unloadSpots(u); u.x = sv[0]; u.y = sv[1]; if (this.spotsCache.length) list.push(['하차', () => this.toUnload(), 'blue']); }
    list.push(['대기', () => this.commit(() => s.wait(u.id)), 'olive']);
    list.push(['취소', () => this.cancelSel(), 'ghost']);
    this.setActs(list); this.showInfo(x, y);
    if (UNITS[u.type].indirect && moved && s.rangeOf(u)) toast(this, '원거리 무기는 이동한 턴에 쏠 수 없어요', C.sub, TOP + 60);
    if (u.cargo.length && !this.spotsCache.length && UNITS[u.type].dom === 'sea') toast(this, '상륙정은 모래사장·항구에서 내릴 수 있어요', C.sub, TOP + 60);
  }
  toTarget() {
    this.state = 'target'; this.clearHl();
    for (const e of this.tgts) { const r = this.mark(e.x, e.y, 0xFF5040, 0.45); this.tweens.add({ targets: r, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 }); }
    this.setActs([['뒤로', () => this.toAct(), 'ghost']]);
    this.info.removeAll(true); this.info.add(T(this, 48, H - BOTTOM + 70, '공격할 적을 누르세요 · 예상 피해가 보여요', 28, C.sub, { ox: 0, w: 800 }));
    if (this.tgts.length === 1) this.preview(this.tgts[0]);
  }
  // 공격 예상: 정확한 피해 · 반격 (운 없음)
  preview(e) {
    const u = this.sel, [x, y] = this.ghost, f = this.s.forecast(u, x, y, e);
    this.pending = e;
    this.info.removeAll(true);
    const y0 = H - BOTTOM + 40;
    const box = (bx, key, label, val, col) => {
      const im = this.add.image(bx + 60, y0 + 56, key); im.setScale(100 / Math.max(im.width, im.height)); this.info.add(im);
      this.info.add(T(this, bx + 124, y0 + 26, label, 24, C.sub, { ox: 0, w: 800 }));
      this.info.add(T(this, bx + 124, y0 + 76, val, 40, col, { ox: 0, w: 900 }));
    };
    const eAfter = Math.max(0, Math.ceil((e.hp - f.dmg) / 10)), uAfter = Math.max(0, Math.ceil((u.hp - f.counter) / 10));
    box(30, `u_${e.type}_${TEAMS[e.p]}`, `${UNITS[e.type].name} 피해`, f.kill ? '격파!' : `${hpOf(e)} → ${eAfter}`, f.kill ? C.gold : '#FFE27A');
    box(530, `u_${u.type}_${TEAMS[u.p]}`, '반격', f.counter ? `${hpOf(u)} → ${uAfter}` : '없음', f.counter ? C.pink : C.green);
    this.setActs([['공격!', () => this.doAttack(e), 'red'], ['뒤로', () => this.toAct(), 'ghost']]);
    this.clearHl(); for (const t of this.tgts) this.mark(t.x, t.y, 0xFF5040, t === e ? 0.6 : 0.2, t !== e);
  }
  doAttack(e) { const id = this.sel.id; this.commit(() => this.s.attack(id, e.id)); }
  toUnload() { this.unloadList = []; this.nextUnloadSpot(); }
  nextUnloadSpot() {
    const u = this.sel, taken = this.unloadList;
    this.state = 'unload'; this.clearHl();
    this.spots = this.spotsCache.filter(([a, b]) => !taken.some(([c, d]) => a === c && b === d));
    for (const [x, y] of this.spots) this.mark(x, y, 0x5AFFA0, 0.45);
    for (const [x, y] of taken) this.mark(x, y, 0xFFE27A, 0.5);
    const more = taken.length > 0;
    this.setActs(more ? [['여기까지', () => this.doUnloadAll(), 'gold'], ['뒤로', () => this.toAct(), 'ghost']] : [['뒤로', () => this.toAct(), 'ghost']]);
    toast(this, `${taken.length + 1}번째로 내릴 자리를 누르세요`, C.sub, TOP + 60);
  }
  doUnload(x, y) {
    this.unloadList.push([x, y]);
    const u = this.sel; if (this.unloadList.length < u.cargo.length && this.spots.length > 1) return this.nextUnloadSpot();
    this.doUnloadAll();
  }
  doUnloadAll() { const id = this.sel.id, list = this.unloadList.slice(); this.commit(() => { for (const [x, y] of list) this.s.unload(id, x, y); const t = this.s.unit(id); if (t && !t.done) this.s.wait(id); }); }
  // 이동 확정 + 행동
  async commit(act) {
    const u = this.sel, [x, y] = this.ghost;
    this.busy = true; this.clearHl(); this.setActs(null);
    const c = this.views.get(u.id), [ox, oy] = this.xy(u.x, u.y); c.setPosition(ox, oy);   // 이동은 이미 보여 줬으므로 기록만
    try {
    this.s.move(u.id, x, y); this.s.events = this.s.events.filter(e => e.type !== 'move');
    const [px, py] = this.xy(u.x, u.y); c.setPosition(px, py);
    if (this.s.unit(u.id) && !this.s.unit(u.id).done) act();
    this.sel = null; this.ghost = null; this.state = 'idle';
    await this.drain();
    } catch (err) { console.warn('행동 처리 오류', err); this.s.events.length = 0; this.syncAll(); }
    this.sel = null; this.ghost = null; this.state = 'idle'; this.busy = false; this.showInfo(null); this.updateHud(); this.updateIdle(); this.drawDanger();
    if (this.s.over) return this.finish();
    // 모두 움직였으면 턴 종료 버튼 반짝
    if (!this.s.mine(this.me).some(u2 => !u2.done && !u2.inside)) this.tweens.add({ targets: this.endBtn, scale: 1.08, duration: 260, yoyo: true, repeat: 3 });
  }
  buildMenu(x, y) {
    const kind = TERRAIN[this.s.tile(x, y).t].builds, list = UNIT_ORDER.filter(t => UNITS[t].dom === kind), me = this.me;
    const rows = Math.ceil(list.length / 2), ph = 260 + rows * 170;
    const p = popup(this, { ground: '기지 생산', air: '비행장 생산', sea: '항구 생산' }[kind], 980, ph);
    p.content.add(T(this, 0, -ph / 2 + 140, `자금 ${fmt(this.s.funds[me])} · 만든 유닛은 다음 턴부터 움직여요`, 26, C.sub, { w: 800 }));
    list.forEach((t, i) => {
      const U = UNITS[t], bx = (i % 2 ? 1 : -1) * 232, by = -ph / 2 + 260 + Math.floor(i / 2) * 170, ok = this.s.funds[me] >= U.cost;
      const g = this.add.graphics(); g.fillStyle(0x000000, ok ? 0.28 : 0.12).fillRoundedRect(bx - 222, by - 76, 444, 152, 20).lineStyle(2, ok ? 0xFFD45A : 0x666655, 0.6).strokeRoundedRect(bx - 222, by - 76, 444, 152, 20); p.content.add(g);
      const im = this.add.image(bx - 150, by, `u_${t}_${TEAMS[me]}`).setAlpha(ok ? 1 : 0.4); im.setScale(130 / Math.max(im.width, im.height)); p.content.add(im);
      p.content.add(T(this, bx - 70, by - 36, U.name, 30, ok ? C.text : C.dim, { ox: 0, w: 900 }));
      p.content.add(T(this, bx - 70, by + 6, fmt(U.cost), 28, ok ? C.gold : C.dim, { ox: 0, w: 900 }));
      p.content.add(T(this, bx - 70, by + 44, U.desc, 18, C.sub, { ox: 0, w: 700, wrap: 280 }));
      const z = this.add.zone(bx, by, 444, 152).setInteractive({ useHandCursor: true }); p.content.add(z);
      z.on('pointerup', () => { if (!ok) return toast(this, '자금이 부족해요', C.sub); p.close(); this.s.build(x, y, t); this.drain().then(() => this.updateHud()); });
    });
  }
  usePower() {
    const me = this.me, co = COS[this.s.cos[me]];
    if (this.busy || !this.s.powerReady(me, 1)) return;
    if (!this.s.powerReady(me, 2)) return this.firePower(1);
    const p = popup(this, '필살기 선택', 900, 700);
    p.content.add(btn(this, 0, -120, 700, 150, `필살기 · ${co.power}`, () => { p.close(); this.firePower(1); }, { style: 'olive', size: 34 }));
    p.content.add(T(this, 0, -30, co.pdesc, 24, C.sub, { w: 800 }));
    p.content.add(btn(this, 0, 110, 700, 150, `초필살기 · ${co.superp}`, () => { p.close(); this.firePower(2); }, { style: 'red', size: 34 }));
    p.content.add(T(this, 0, 200, co.sdesc, 24, C.sub, { w: 800 }));
  }
  async firePower(lvl) { this.busy = true; this.s.usePower(lvl); await this.drain(); this.busy = false; this.updateHud(); }
  tutorial() {
    const d = load(); d.tips.war = 1; save();
    const p = popup(this, '작전 안내', 940, 900);
    const lines = ['① 아군 유닛을 누르면 갈 수 있는 칸이 파랗게', '② 칸을 누르면 이동 → 공격 · 점령 · 대기', '③ 공격 전에 정확한 피해와 반격이 보여요', '④ 야포·로켓포: 움직이지 않고 [공격] (사거리 빨간 칸)', '⑤ 보병으로 도시 점령 → 매일 자금 · 기지에서 생산', '적 본부를 점령하거나 적을 모두 무찌르면 승리!'];
    lines.forEach((s, i) => p.content.add(T(this, -390, -250 + i * 78, s, 30, i === 5 ? C.gold : C.text, { ox: 0, w: 800 })));
    if (this.map.tip) p.content.add(T(this, 0, 240, `팁 · ${this.map.tip}`, 26, C.green, { w: 800, wrap: 820 }));
    p.content.add(btn(this, 0, 350, 420, 110, '작전 시작', () => p.close(), { style: 'gold', size: 36 }));
  }

  // ── 일시정지 ──
  onBack() { if (!this.paused && !this.s.over) this.pause(); return true; }
  pause() {
    if (this.paused) return; this.paused = true;
    const resume = () => { p.close(); this.time.delayedCall(150, () => { this.paused = false; }); };
    const p = popup(this, '작전 일시정지', 820, 900, { closable: false, onBack: () => resume() });
    p.content.add(btn(this, 0, -230, 520, 130, '계속하기', resume, { style: 'gold', icon: 'i_play', size: 40 }));
    p.content.add(btn(this, 0, -80, 520, 100, `속도 ${this.speed === 1 ? '보통' : '빠르게'}`, () => { this.speed = this.speed === 1 ? 2 : 1; resume(); toast(this, this.speed === 2 ? '적 턴을 빠르게 보여 줘요' : '보통 속도', C.sub); }, { style: 'olive', size: 32 }));
    const d = load(), cut = btn(this, 0, 50, 520, 100, `전투 장면 ${d.cutscene === false ? '끔' : '켬'}`, () => { d.cutscene = d.cutscene === false; save(); cut.setLabel(`전투 장면 ${d.cutscene === false ? '끔' : '켬'}`); }, { style: 'olive', size: 32 }); p.content.add(cut);
    p.content.add(btn(this, 0, 180, 420, 96, '항복하고 나가기', () => { p.close(); this.paused = false; this.s.over = true; this.s.winner = this.foe; this.finish(true); }, { style: 'red', size: 30 }));
  }

  // ── 전투 장면 (원작처럼 양쪽 부대가 마주 보고 싸우는 컷신) ──
  cutsceneOn() { return load().cutscene !== false && this.speed <= 2; }
  async cutscene(e, ctr) {
    const s = this.s, ap = e.ap, A = { type: e.aType, p: ap, hp: e.aHp }, D = { type: e.dType, p: ap === 1 ? 2 : 1, hp: e.dHp };
    const au = s.unit(e.a), du = s.unit(e.d);
    const tileOf = u => (u ? s.tile(u.x, u.y).t : 'plain');
    const L = ap === 1 ? A : D, Rr = ap === 1 ? D : A;   // 파랑은 왼쪽 · 빨강은 오른쪽
    L.t = L === A ? tileOf(au) : tileOf(du); Rr.t = Rr === A ? tileOf(au) : tileOf(du);
    const c = this.add.container(0, 0).setDepth(960).setScrollFactor(0), cy = H / 2, bh = 560;
    let skip = false;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0A0C06, 0.75).setInteractive(); dim.on('pointerup', () => { skip = true; }); c.add(dim);
    const side = (S, x0) => {
      const key = { road: 't_road_h', river: 't_river_h', bridge: 't_bridge_h', city: 't_plain', base: 't_plain', air: 't_plain', port: 't_sea', hq: 't_plain' }[S.t] || `t_${S.t}`;
      const bg = this.add.image(x0 + W / 4, cy, this.textures.exists(key) ? key : 't_plain').setDisplaySize(W / 2, bh); c.add(bg);
      c.add(this.add.rectangle(x0 + W / 4, cy - bh / 2 + 70, W / 2, 140, 0x000000, 0.25));
      c.add(this.add.rectangle(x0 + W / 4, cy, W / 2 - 6, bh, 0, 0).setStrokeStyle(6, S.p === 1 ? 0x3E7FD8 : 0xD9472E));
      S.x0 = x0; S.sprites = [];
      const foot = FOOT.includes(S.type), n = foot ? Math.max(1, Math.ceil(S.hp / 20)) : 1, key2 = `u_${S.type}_${TEAMS[S.p]}`;
      const slots = foot ? [[0.3, 0.38], [0.65, 0.3], [0.45, 0.55], [0.75, 0.6], [0.25, 0.72]] : [[0.5, 0.52]];
      for (let i = 0; i < n; i++) { const [fx, fy] = slots[i]; const im = this.add.image(x0 + (S.p === 1 ? fx : 1 - fx) * W / 2, cy - bh / 2 + fy * bh + 60, key2); im.setScale((foot ? 190 : 360) / Math.max(im.width, im.height)); if (UNITS[S.type].dom === 'air') im.y -= 60; c.add(im); S.sprites.push(im); }
      S.hpT = T(this, x0 + W / 4, cy - bh / 2 + 50, '', 46, C.text, { w: 900, stroke: '#14160A', thick: 8 }); c.add(S.hpT); S.hpT.setText(`${UNITS[S.type].name}  ${Math.ceil(S.hp / 10)}`);
    };
    side(L, 0); side(Rr, W / 2);
    c.add(this.add.rectangle(W / 2, cy, 8, bh, 0x14160A));
    c.setAlpha(0); await new Promise(r => this.tweens.add({ targets: c, alpha: 1, duration: 160, onComplete: r }));
    const wait = ms => skip ? Promise.resolve() : sleep(this, ms);
    const strike = async (Atk, Def, dmg) => {
      if (!Atk.sprites.length) return;
      audio.play(SND[Atk.type], { volume: 0.7 });
      for (const im of Atk.sprites) { const dx = Atk.p === 1 ? 24 : -24; this.tweens.add({ targets: im, x: im.x + dx, duration: 90, yoyo: true }); }
      const shots = UNITS[Atk.type].indirect ? 2 : FOOT.includes(Atk.type) ? Atk.sprites.length * 2 : 4;
      for (let k = 0; k < shots; k++) {
        const from = Atk.sprites[k % Atk.sprites.length], to = Def.sprites[k % Math.max(1, Def.sprites.length)] || { x: Def.x0 + W / 4, y: cy };
        const b = this.add.image(from.x + (Atk.p === 1 ? 60 : -60), from.y - 20, 'glow').setTint(0xFFF0A0).setBlendMode('ADD').setScale(0.25); c.add(b);
        const mz = this.add.image(b.x, b.y, 'glow').setTint(0xFFD060).setBlendMode('ADD').setScale(0.5); c.add(mz); this.tweens.add({ targets: mz, alpha: 0, scale: 0.9, duration: 120, onComplete: () => mz.destroy() });
        this.tweens.add({ targets: b, x: to.x, y: to.y - 10, duration: 220, delay: k * 70, onComplete: () => { b.destroy(); const f = this.add.image(to.x, to.y, 'glow').setTint(0xFFB050).setBlendMode('ADD').setScale(0.3); c.add(f); this.tweens.add({ targets: f, scale: 1.3, alpha: 0, duration: 260, onComplete: () => f.destroy() }); } });
      }
      await wait(260 + shots * 70);
      if (dmg > 0) { audio.play(dmg > 40 ? 'sfx_explode' : 'sfx_mg', { volume: 0.6 }); this.cameras.main.shake(120, 0.005); }
      for (const im of Def.sprites) this.tweens.add({ targets: im, x: im.x + 10, duration: 40, yoyo: true, repeat: 3 });
      const before = Def.hp; Def.hp = Math.max(0, Def.hp - dmg);
      this.tweens.addCounter({ from: Math.ceil(before / 10), to: Math.ceil(Def.hp / 10), duration: 400, onUpdate: tw => Def.hpT.setText(`${UNITS[Def.type].name}  ${Math.round(tw.getValue())}`) });
      const keep = FOOT.includes(Def.type) ? Math.ceil(Def.hp / 20) : Def.hp > 0 ? 1 : 0;
      while (Def.sprites.length > keep) { const im = Def.sprites.pop(); this.tweens.add({ targets: im, alpha: 0, y: im.y + 30, angle: Def.p === 1 ? -25 : 25, duration: 360, onComplete: () => im.destroy() }); }
      await wait(520);
    };
    await strike(A, D, e.dmg);
    if (ctr && D.hp > 0) await strike(D, A, ctr.dmg);
    await wait(250);
    await new Promise(r => this.tweens.add({ targets: c, alpha: 0, duration: 160, onComplete: () => { c.destroy(); r(); } }));
  }

  // ── 끝 ──
  finish(surrender) {
    if (this.ended) return; this.ended = true; this.busy = true;
    const s = this.s, win = s.winner === 1;
    audio.stopMusic(); audio.play(win || this.mode === 'versus' ? 'sfx_win' : 'sfx_lose', { volume: 0.8 });
    try { localStorage.removeItem('front_tactics_resume'); } catch { /* */ }
    if (this.mode === 'versus') {   // 2인 대전: 기록·경험치 없이 승자만
      const r = { mode: 'versus', winner: s.winner, day: s.day, cos: s.cos.slice(), kills: s.stats.kills.slice(), lost: s.stats.lost.slice(), mapId: this.map.id, custom: this.map.custom ? this.map : null, why: surrender ? 'surrender' : this.winWhy };
      this.time.delayedCall(surrender ? 100 : 900, () => { this.cameras.main.fadeOut(500, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', r)); });
      return;
    }
    const r = { mode: this.mode, mapId: this.map.id, win, day: s.day, lost: s.stats.lost[1], kills: s.stats.kills[1], captures: this.captures, built: s.stats.built[1], powers: this.powers, co: this.co, why: surrender ? 'surrender' : this.winWhy };
    const res = M.finish(r);
    this.time.delayedCall(surrender ? 100 : 900, () => { this.cameras.main.fadeOut(500, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', { ...r, ...res, level: this.level, enemyCo: this.enemyCo })); });
  }
}
