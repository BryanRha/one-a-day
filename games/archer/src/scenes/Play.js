// 전투 화면: 방(바닥·장애물) · 영웅(어디든 눌러 끄는 가상 조이스틱, 멈추면 자동 사격) · 몬스터 · 화살 · 능력 고르기 · 일시정지 · 보스
import { W, H } from '../config.js?v=0.17.9';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.17.9';
import { audio } from '../audio.js?v=0.17.9';
import { load, save } from '../save.js?v=0.17.9';
import { pushBack } from '../oad.js?v=0.17.9';
import * as M from '../meta.js?v=0.17.9';
import { Sim, AW, AH, CELL, COLS, ROWS } from '../core/sim.js?v=0.17.9';
import { HEROES, SKILLS, SRAR, MONS, BOSSES, CHAPTERS, ROOMS, TIERS, itemName } from '../core/data.js?v=0.17.9';

const TOP = 170, BOT = 0;
const sleep = (sc, ms) => new Promise(r => sc.time.delayedCall(ms, r));
const ELC = { fire: 0xFF8A3A, ice: 0x9AE8FF, poison: 0x8CE05A, bolt: 0xFFE14D, boom: 0xFFA040, wave: 0x9AE8FF };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  create(data = {}) {
    const d = load();
    // 판마다 새로 시작 (Phaser 는 같은 화면 객체를 다시 씀)
    Object.assign(this, { cine: 0, heroV: null, arrowL: null, dropL: null, floorRT: null, fxN: 0, zapN: 0, warnG: null, nums: null, npcV: null, skSig: null, scrollY: null, paused: false, picking: false, ended: false, joy: null, views: new Map(), arrows: [], foeV: [], dropV: [], orbV: [], spV: [], pending: [], ui: {}, hitStop: 0, shake: 0 });
    this.daily = !!data.daily;
    const dr = this.daily ? M.dailyRun() : null;
    this.chapter = dr ? dr.chapter : data.chapter || 1;
    this.heroK = dr ? dr.hero : data.hero || d.hero || 'arin';
    this.s = new Sim({ seed: dr ? dr.seed : (Date.now() & 0xffffff) + 1, chapter: this.chapter, hero: this.heroK, gear: dr ? { atk: 20, hp: 120, crit: 0 } : M.gearStats() });
    this.ch = CHAPTERS[this.chapter - 1];
    // 방 크기를 화면 너비에 맞춤 (세로가 넘치면 카메라가 영웅을 따라감)
    // 원작 비율: 경기장 = 화면 폭의 88% (양옆 벽이 보임) · 한 화면에 다 들어옴
    this.k = W * 0.96 / AW; this.ox = Math.round((W - AW * this.k) / 2); this.oy = TOP + 20;   // 원작 1처럼 가깝게: 경기장이 화면 폭을 거의 채우고 세로는 영웅을 따라 움직임
    this.heroH = W * 0.14;   // 영웅 키 = 화면 폭의 14% (원작 1 비율)
    this.add.rectangle(W / 2, H / 2, W, H * 3, 0x0B0D1E).setScrollFactor(0).setDepth(-10);
    // 경기장 밖 풍경: 같은 바닥을 어둡게 깔아 빈 곳이 없게 (원작은 벽 너머 정원·문이 보임)
    this.add.tileSprite(W / 2, H / 2, W, H * 3, this.ch.tiles[0]).setTileScale(CELL * 0.88 * 1.1 / 256).setTint(0x4A4A5E).setScrollFactor(0).setDepth(-9);
    this.world = this.add.container(this.ox, this.oy);
    this.floorL = this.add.container(0, 0); this.world.add(this.floorL);
    this.fxL = this.add.container(0, 0);
    this.makeHud();
    this.input.addPointer(1);
    this.input.on('pointerdown', p => this.joyDown(p));
    this.input.on('pointermove', p => this.joyMove(p));
    this.input.on('pointerup', p => this.joyUp(p));
    this.input.on('pointerupoutside', p => this.joyUp(p));
    this.game.events.on('blur', this.onBlur = () => { this.joyUp(); if (!this.ended && !this.picking) this.pause(); });
    this.events.once('shutdown', () => { this.game.events.off('blur', this.onBlur); });
    this.drawRoom();
    audio.music(['bgm_forest', 'bgm_desert', 'bgm_ice'][this.chapter - 1] || 'bgm_forest');
    this.cameras.main.fadeIn(300, 10, 12, 30);
    window.__play = this;
    // 아린: 시작할 때 능력 하나 더
    this.time.delayedCall(500, () => { if (this.heroK === 'arin') this.pickSkill('시작 능력'); else if (!d.tips.move) this.tip(); });
  }
  tip() { const d = load(); d.tips.move = 1; save(); toast(this, '화면 어디든 눌러 끌면 이동 · 손을 떼면 자동으로 쏴요', C.gold, H * 0.62); }

  // ── 가상 조이스틱 (화면 어디든) ──
  joyDown(p) {
    if (this.paused || this.picking || this.ended || p.y < TOP) return;
    if (this.joy) return;
    this.joy = { id: p.id, x: p.x, y: p.y, dx: 0, dy: 0 };
    this.ui.jb.setPosition(p.x, p.y).setVisible(true); this.ui.jk.setPosition(p.x, p.y).setVisible(true); this.ui.jIdle.setVisible(false);
  }
  joyMove(p) {
    const j = this.joy; if (!j || p.id !== j.id) return;
    let dx = p.x - j.x, dy = p.y - j.y; const l = Math.hypot(dx, dy), R = 170;
    if (l > R) { j.x += dx * (1 - R / l); j.y += dy * (1 - R / l); dx = p.x - j.x; dy = p.y - j.y; this.ui.jb.setPosition(j.x, j.y); }   // 손가락을 따라 받침도 움직임
    j.dx = dx / R; j.dy = dy / R; this.ui.jk.setPosition(j.x + dx, j.y + dy);
  }
  joyUp(p) { if (this.joy && (!p || p.id === this.joy.id)) { this.joy = null; this.ui.jb.setVisible(false); this.ui.jk.setVisible(false); this.ui.jIdle.setVisible(true); } }

  // ── 위 정보 ──
  makeHud() {
    const D = 500, u = this.ui, s = this.s;
    const bg = this.add.graphics().setDepth(D - 1).setScrollFactor(0); bg.fillStyle(0x0B0D1E, 0.92).fillRect(0, 0, W, TOP); for (let i = 0; i < 12; i++) bg.fillStyle(0x0B0D1E, 0.92 * (1 - i / 12)).fillRect(0, TOP + i * 3, W, 3);
    u.room = T(this, 40, 54, '', 34, C.text, { ox: 0, w: 900 }).setDepth(D).setScrollFactor(0);
    u.wave = T(this, W / 2, 62, '', 28, '#FFB0A0', { w: 900 }).setDepth(D).setScrollFactor(0);
    u.combo = T(this, W - 40, 112, '', 26, C.gold, { ox: 1, w: 900 }).setDepth(D).setScrollFactor(0);
    u.chap = T(this, 40, 98, this.daily ? '오늘의 던전' : `${this.chapter}장 · ${this.ch.name}`, 24, C.sub, { ox: 0, w: 800 }).setDepth(D).setScrollFactor(0);
    u.gold = T(this, W - 150, 54, '', 32, C.gold, { ox: 1, w: 900 }).setDepth(D).setScrollFactor(0);
    this.add.image(W - 150 - 10, 54, 'i_gold').setDisplaySize(44, 44).setOrigin(1.2, 0.5).setDepth(D).setScrollFactor(0);
    u.pause = iconBtn(this, W - 70, 70, 'i_pause', () => this.pause(), 88).setDepth(D).setScrollFactor(0);
    // 경험치 막대 · 레벨
    u.xpG = this.add.graphics().setDepth(D).setScrollFactor(0);
    u.lvl = T(this, W / 2, 134, '', 24, C.cyan, { w: 900 }).setDepth(D + 1).setScrollFactor(0);
    // 능력 아이콘 줄
    u.skills = this.add.container(0, 0).setDepth(D).setScrollFactor(0);
    // 보스 체력
    u.boss = this.add.container(W / 2, TOP + 40).setDepth(D).setScrollFactor(0).setVisible(false);
    u.bossG = this.add.graphics(); u.bossT = T(this, 0, -26, '', 28, '#FFB0A0', { w: 900 }); u.boss.add([u.bossG, u.bossT]);
    // 조이스틱
    u.jb = this.add.circle(0, 0, 190, 0xFFFFFF, 0.08).setStrokeStyle(4, 0xFFFFFF, 0.35).setDepth(D + 5).setScrollFactor(0).setVisible(false);
    u.jIdle = this.add.container(W / 2, H - 260).setDepth(D + 4).setScrollFactor(0); u.jIdle.add([this.add.circle(0, 0, 170, 0x3A6AFF, 0.1).setStrokeStyle(4, 0x8AB0FF, 0.3), this.add.circle(0, 0, 66, 0x4A7AFF, 0.35).setStrokeStyle(4, 0xBFD4FF, 0.5)]);
    u.jk = this.add.circle(0, 0, 70, 0xFFFFFF, 0.35).setStrokeStyle(4, 0xFFFFFF, 0.7).setDepth(D + 6).setScrollFactor(0).setVisible(false);
    // 위험(체력 낮음) 가장자리
    u.danger = this.add.graphics().setDepth(D - 2).setScrollFactor(0).setAlpha(0);
    for (let i = 0; i < 30; i++) { u.danger.lineStyle(10, 0xFF2A2A, (1 - i / 30) * 0.35); u.danger.strokeRect(i * 5, i * 5, W - i * 10, H - i * 10); }
    this.updateHud();
  }
  updateHud() {
    const s = this.s, u = this.ui, k = s.xp / s.xpNeed();
    const xsig = `${s.lvl}:${Math.round(k * 200)}:${s.gold}:${s.room}`; if (u.xsig !== xsig) { u.xsig = xsig; u.xpG.clear().fillStyle(0x000000, 0.5).fillRoundedRect(40, 124, W - 80, 20, 10).fillStyle(0x6AD8FF, 1).fillRoundedRect(40, 124, Math.max(20, (W - 80) * k), 20, 10);
    u.lvl.setText(`Lv ${s.lvl}`); u.room.setText(`방 ${Math.min(s.room, ROOMS)} / ${ROOMS}`); u.gold.setText(fmt(s.gold)); }
    const ctxt = Object.keys(s.fx).some(f => f.startsWith('neb')) && s.combo ? `콤보 ${s.combo}` : ''; if (u.combo.text !== ctxt) u.combo.setText(ctxt);
    const wtxt = s.kind === 'fight' && !s.cleared ? `웨이브 ${s.wave}/${s.waves}${s.wave < s.waves ? ` · ${Math.max(0, Math.ceil(s.waveT))}초` : ''}` : ''; if (u.wave.text !== wtxt) u.wave.setText(wtxt);
    const ks = Object.keys(s.sk).filter(k2 => SKILLS[k2] && s.sk[k2] > 0);
    if (ks.join() + ks.map(k2 => s.sk[k2]).join() !== this.skSig) {
      this.skSig = ks.join() + ks.map(k2 => s.sk[k2]).join(); u.skills.removeAll(true);
      ks.forEach((k2, i) => { const x = 40 + 30 + (i % 12) * 66, y = H - 60 - Math.floor(i / 12) * 66; const im = this.add.image(x, y, SKILLS[k2].icon).setDisplaySize(58, 58).setAlpha(0.85); u.skills.add(im); if (s.sk[k2] > 1) u.skills.add(T(this, x + 22, y + 20, `${s.sk[k2]}`, 20, C.text, { w: 900, stroke: '#000000', thick: 5 })); });
    }
    const b = s.mons.find(m => m.boss || m.mid);
    u.boss.setVisible(!!b);
    if (b && u.bsig !== Math.round(b.hp / b.maxHp * 300)) { u.bsig = Math.round(b.hp / b.maxHp * 300); const bw = W - 200; u.bossG.clear().fillStyle(0x000000, 0.6).fillRoundedRect(-bw / 2, -6, bw, 28, 14).fillStyle(0xE8402A, 1).fillRoundedRect(-bw / 2, -6, Math.max(28, bw * b.hp / b.maxHp), 28, 14); u.bossT.setText(b.boss ? BOSSES[b.type].name : `우두머리 ${MONS[b.type].name}`); }
    u.danger.setAlpha(s.p.hp < s.p.maxHp * 0.3 ? 0.6 + Math.sin(this.time.now / 180) * 0.3 : 0);
  }

  // ── 방 그리기 ──
  xy(x, y) { return [x * this.k, y * this.k]; }
  drawRoom() {
    const s = this.s, k = this.k, cs = CELL * k, [tf, tb, tp] = this.ch.tiles;
    this.floorL.removeAll(true);
    for (const v of this.views.values()) { this.tweens.killTweensOf(v.im); this.tweens.killTweensOf(v); v.destroy(); } this.views.clear();
    for (const a of [...this.arrows, ...this.foeV, ...this.dropV]) a.destroy(); this.arrows = []; this.foeV = []; this.dropV = [];
    // 바닥 (타일 · 살짝 어둡게) + 테두리 벽
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const h = (x * 73 + y * 151) % 4, im = this.add.image(x * cs + cs / 2, y * cs + cs / 2, tf).setDisplaySize(cs + 1, cs + 1); if (h & 1) im.setFlipX(true); if (h & 2) im.setFlipY(true); this.floorL.add(im);
      const g = s.grid[y][x]; if (g) { if (g === 1) this.floorL.add(this.add.rectangle(x * cs + cs / 2 + 8, y * cs + cs / 2 + 12, cs, cs, 0x000000, 0.35)); const o = this.add.image(x * cs + cs / 2, y * cs + cs / 2, g === 1 ? tb : tp).setDisplaySize(cs + 1, cs + 1); this.floorL.add(o); }
    }
    // 가장자리 어둡게 (빛이 가운데로 모이게) + 벽 테두리
    if (!this.textures.exists('vign')) { const c = this.textures.createCanvas('vign', 256, 256), g = c.getContext(), gr = g.createRadialGradient(128, 128, 60, 128, 128, 182); gr.addColorStop(0, 'rgba(5,6,15,0)'); gr.addColorStop(1, 'rgba(5,6,15,0.35)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); c.refresh(); }
    this.floorL.add(this.add.image(AW * k / 2, AH * k / 2, 'vign').setDisplaySize(AW * k, AH * k));
    const shade = this.add.graphics();
    shade.lineStyle(10, 0x000000, 0.35).strokeRect(-5, -5, AW * k + 10, AH * k + 10); this.floorL.add(shade);
    // 둘레 벽 (원작처럼 양옆·위·아래 두꺼운 벽 · 위 가운데는 문 자리)
    const wt = this.ox, aw = AW * k, ah = AH * k, n = Math.ceil(ah / wt), m = Math.ceil(aw / wt) + 2;
    for (let i = 0; i < n; i++) for (const x of [-wt / 2, aw + wt / 2]) this.floorL.add(this.add.image(x, i * wt + wt / 2, tb).setDisplaySize(wt + 1, wt + 1));
    for (let i = 0; i < m; i++) { const x = -wt / 2 + i * wt; for (const y of [-wt / 2, ah + wt / 2]) { if (y < 0 && Math.abs(x - aw / 2) < cs * 0.9) continue; this.floorL.add(this.add.image(x, y, tb).setDisplaySize(wt + 1, wt + 1)); } }
    // 성능: 움직이지 않는 바닥·장애물·테두리(약 170개)를 한 장으로 구워서 매 프레임 1번만 그림
    { const pad = Math.ceil(this.ox) + 4, list = [...this.floorL.list]; if (this.floorRT) this.floorRT.destroy(); const rt = this.add.renderTexture(-pad, -pad, Math.ceil(AW * k) + pad * 2, Math.ceil(AH * k) + pad * 2).setOrigin(0, 0); this.floorL.remove(list); this.world.remove(list); for (const o of list) { rt.draw(o, o.x + pad, o.y + pad); o.destroy(); } this.floorRT = rt; this.floorL.add(rt); }
    // 가시 함정: 판(숨음) → 빨갛게 깜빡(경고) → 가시 솟음
    if (!this.textures.exists('spk0')) for (const st of [0, 1, 2]) { const c = this.textures.createCanvas('spk' + st, 120, 120), g = c.getContext(); g.fillStyle = '#2A2A36'; g.fillRect(8, 8, 104, 104); g.strokeStyle = st === 1 ? '#FF4A3A' : '#5A5A6E'; g.lineWidth = 6; g.strokeRect(8, 8, 104, 104); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = 30 + i * 30, y = 30 + j * 30; if (st === 2) { g.fillStyle = '#E8E8F4'; g.beginPath(); g.moveTo(x - 10, y + 10); g.lineTo(x, y - 16); g.lineTo(x + 10, y + 10); g.closePath(); g.fill(); g.fillStyle = '#9A9AB0'; g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 10, y + 10); g.lineTo(x, y + 10); g.closePath(); g.fill(); } else { g.fillStyle = st === 1 ? '#FF6A4A' : '#14141C'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); } } c.refresh(); }
    this.spikeV = (s.spikes || []).map(sp => { const im = this.add.image((sp.cx + 0.5) * cs, (sp.cy + 0.5) * cs, 'spk0').setDisplaySize(cs, cs); this.floorL.add(im); return im; });
    // 떠다니는 빛가루 (분위기)
    for (let i = 0; i < 14; i++) { const m = this.add.image(Math.random() * AW * k, Math.random() * AH * k, 'glow').setScale(0.15 + Math.random() * 0.2).setAlpha(0.25).setTint(this.chapter === 3 ? 0xBFE8FF : this.chapter === 2 ? 0xFFD88A : 0xC8FF9A).setBlendMode('ADD'); this.floorL.add(m); this.tweens.add({ targets: m, y: m.y - 60 - Math.random() * 80, alpha: 0, duration: 3000 + Math.random() * 3000, repeat: -1, delay: Math.random() * 3000 }); }
    // 문 (위 가운데)
    this.door = this.add.container(AW * k / 2, 0); const dg = this.add.graphics(); dg.fillStyle(0x0B0D1E, 1).fillRoundedRect(-cs * 0.8, -6, cs * 1.6, 34, 10); this.door.add(dg);
    this.doorGlow = this.add.image(0, 20, 'glow').setTint(0x8AE8FF).setScale(2.2, 1).setBlendMode('ADD').setAlpha(0); this.door.add(this.doorGlow); this.floorL.add(this.door);
    this.doorArrow = T(this, 0, 80, '▲', 46, '#BFF4FF', { w: 900 }).setAlpha(0); this.door.add(this.doorArrow);
    // 특수 방 NPC
    if (s.npc) { const n = s.npc, im = this.add.image(n.x * k, n.y * k, n.type === 'angel' ? 'n_angel' : 'n_devil'); im.setScale(220 / im.height); this.floorL.add(im); this.tweens.add({ targets: im, y: im.y - 16, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); this.npcV = im; this.npcTalked = false; }
    else this.npcV = null;
    // 영웅
    if (!this.heroV) {
      const hv = this.add.container(0, 0); const sh = this.add.ellipse(0, 6, 68, 22, 0x000000, 0.35); const im = this.add.image(0, -18, `hd_${this.heroK}_4`).setOrigin(0.5, 0.5); im.setScale(this.heroH / im.height); im.base = im.scale;
      const ring = this.add.ellipse(0, 6, 80, 28, 0x6AD8FF, 0).setStrokeStyle(4, 0x8AE8FF, 0.8);
      const hpB = this.add.rectangle(-60, -this.heroH * 0.9, 120, 14, 0x000000, 0.6).setOrigin(0, 0.5), hp = this.add.rectangle(-60, -this.heroH * 0.9, 120, 14, 0x5AE06A).setOrigin(0, 0.5); const hpT = T(this, 0, -this.heroH * 0.9 - 24, '', 22, '#FFFFFF', { w: 900, stroke: '#14102A', thick: 5, shadow: false }); const aura = this.add.circle(0, 6, 480 * this.k, 0x8AF07A, 0.05).setStrokeStyle(3, 0x8AF07A, 0.25).setVisible(!!s.fx['fang.armor']); const shd = this.add.circle(0, -18, 78, 0xFF8A3A, 0.18).setStrokeStyle(5, 0xFFB050, 0.8).setVisible(false); hv.add([aura, sh, ring, im, shd, hpB, hp, hpT]); Object.assign(hv, { im, hp, ring, hpT, shd }); this.heroV = hv;
    }
    if (!this.dropL || !this.dropL.active) this.dropL = this.add.container(0, 0); this.world.add(this.dropL); this.world.add(this.heroV); if (!this.arrowL || !this.arrowL.active) this.arrowL = this.add.container(0, 0); this.world.add(this.arrowL); this.world.bringToTop(this.arrowL); this.world.add(this.fxL); this.world.bringToTop(this.fxL);
    for (const m of s.mons) this.monView(m);
    this.syncCam(true);
  }
  monView(m) {
    const B = m.boss ? BOSSES[m.type] : MONS[m.type], v = this.add.container(m.x * this.k, m.y * this.k);
    const sz = (m.boss ? B.sz * 1.15 : B.sz * (m.sz || 1) * 1.25) * this.k;   // 원작 1 비율: 일반 몬스터 ≈ 화면 폭 11~13%   // 원작 비율: 일반 몬스터 ≈ 영웅 크기 · 보스 ≈ 영웅 3배
    const sh = this.add.ellipse(0, sz * 0.36, sz * 0.7, sz * 0.2, 0x000000, 0.35);
    const im = this.add.image(0, 0, m.boss ? B.key.replace('b_', 'bt_') : B.key); im.setScale(sz / Math.max(im.width, im.height));
    const w0 = sz * 0.7, hp = this.add.container(-w0 / 2, -sz * 0.6).setVisible(false); hp.add([this.add.rectangle(0, 0, w0, 10, 0x000000, 0.6).setOrigin(0, 0.5), this.add.rectangle(0, 0, w0, 10, 0xFF5A4A).setOrigin(0, 0.5)]); hp.w0 = w0;
    v.add([sh, im, hp]); Object.assign(v, { im, hp, sz, base: im.scale }); this.world.add(v); this.views.set(m.id, v);
    if (m.boss || m.mid) { im.setTint(m.mid ? 0xFFC8C8 : 0xFFFFFF); }
    v.setScale(0.2).setAlpha(0); this.tweens.add({ targets: v, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    // 둥실 · 꿈틀
    this.tweens.add({ targets: im, scaleY: im.scale * 1.07, scaleX: im.scale * 0.95, duration: 380 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return v;
  }
  syncCam(now) {
    const k = this.k, hy = this.s.p.y * k, viewH = H - TOP - BOT, roomH = AH * k;
    const maxOff = Math.max(0, roomH - viewH), want = Phaser.Math.Clamp(hy - viewH * 0.6, 0, maxOff);
    this.scrollY = now || this.scrollY == null ? want : this.scrollY + (want - this.scrollY) * 0.15;
    this.world.y = TOP + 10 + Math.max(0, (viewH - 20 - roomH) / 2) - this.scrollY;
  }

  // ── 매 프레임 ──
  update(time, delta) {
    if (this.paused || this.picking || this.ended) return;
    let dt = Math.min(0.05, delta / 1000);
    if (this.cine > 0) { this.cine -= dt; return; }   // 보스 등장 연출 중엔 멈춤
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.15; }
    const s = this.s, j = this.joy;
    s.step(dt, j ? { mx: j.dx, my: j.dy } : { mx: 0, my: 0 });
    this.handleEvents();
    this.render(dt);
    this.updateHud();
  }
  render(dt) {
    const s = this.s, k = this.k, p = s.p, hv = this.heroV;
    hv.setPosition(p.x * k, p.y * k); hv.setDepth(p.y);
    // 8방향 돌아보기: 보는 각도를 부드럽게 돌리고(짧은 쪽으로) 그 각도에 맞는 그림(앞·앞대각·옆·뒤대각·뒤, 왼쪽은 좌우 반전)
    hv.ang ??= p.face; const da = Phaser.Math.Angle.Wrap(p.face - hv.ang); hv.ang += Phaser.Math.Clamp(da, -dt * 11, dt * 11);
    const fx = Math.cos(hv.ang), fy = Math.sin(hv.ang), th = Math.atan2(fy, Math.abs(fx)), raw = (Math.PI / 2 - th) / (Math.PI / 4);
    let di = hv.di ?? 0; if (Math.abs(raw - di) > 0.62) di = Math.round(raw);   // 경계에서 깜빡이지 않게 여유
    const flip = di === 0 || di === 4 ? hv.im.flipX : fx < 0;
    // 움직이면 그 방향 달리기 6장(초당 12장) · 멈추면 겨누는 그림
    hv.di = di; const run = p.moving, key = run ? `hr_${this.heroK}_${di}_${Math.floor(this.time.now / 83) % 6}` : `hd_${this.heroK}_${di}`;
    if (hv.im.texture.key !== key) { hv.im.setTexture(key); hv.im.base = this.heroH * (run ? 1.05 : 1) / hv.im.height; }
    if (flip !== hv.im.flipX) hv.im.setFlipX(flip);
    hv.im.setAlpha(p.inv > 0 && Math.floor(this.time.now / 80) % 2 ? 0.45 : 1);
    // 걷기: 통통 튀지 않게 — 아주 작은 상하(1.5px)와 좌우 흔들림만 · 쏠 때 반동
    hv.walk = Phaser.Math.Linear(hv.walk || 0, p.moving ? 1 : 0, Math.min(1, dt * 10)); const ph = this.time.now / 110;
    hv.im.y = -18; hv.im.rotation = 0;
    hv.im.scaleX = hv.im.base * (1 - (hv.recoil || 0) * 0.06); hv.im.scaleY = hv.im.base * (1 + (hv.recoil || 0) * 0.04);
    hv.recoil = Math.max(0, (hv.recoil || 0) - dt * 8);
    if (p.moving && (this.dustT = (this.dustT || 0) - dt) <= 0) { this.dustT = 0.12; const d = this.add.image(p.x * k, p.y * k + 18, 'glow').setTint(0xC8C0A8).setAlpha(0.35).setScale(0.25).setDepth(p.y - 2); this.world.add(d); this.tweens.add({ targets: d, alpha: 0, scale: 0.5, duration: 380, onComplete: () => d.destroy() }); }
    if (this.spikeV && this.spikeV.length) { const key = s.spikeUp ? 'spk2' : s.spikeWarn && Math.floor(this.time.now / 120) % 2 ? 'spk1' : 'spk0'; if (this.spikeV[0].texture.key !== key) this.spikeV.forEach(im => im.setTexture(key)); }
    hv.ring.setStrokeStyle(4, s.mons.length ? 0xFF8A70 : 0x8AE8FF, 0.8); hv.shd.setVisible(s.shield > 0);
    if (hv.lastHp !== p.hp) { hv.lastHp = p.hp; hv.hpT.setText(`${Math.ceil(p.hp)}`); }
    hv.hp.width = Math.max(2, 120 * p.hp / p.maxHp); hv.hp.fillColor = p.hp < p.maxHp * 0.3 ? 0xFF4A3A : 0x5AE06A;
    // 몬스터
    for (const m of s.mons) {
      let v = this.views.get(m.id); if (!v) v = this.monView(m);
      const vx = m.x - (v.px ?? m.x); v.px = m.x;
      v.setPosition(m.x * k, m.y * k); v.setDepth(m.y);
      v.im.setFlipX(p.x < m.x);
      const hopY = MONS[m.type] && MONS[m.type].ai === 'hop' && m.st > 0 ? -Math.sin((1 - m.st / 0.45) * Math.PI) * 34 : 0;
      v.im.y = hopY + (m.boss ? Math.sin(this.time.now / 400) * 6 : 0); v.list[0].setScale(1 + hopY / 120);
      v.im.angle = Phaser.Math.Clamp(vx * 1.6, -14, 14) + (m.wind > 0 ? Math.sin(this.time.now / 25) * 5 : 0);
      if (m.wind > 0 && !v.windG) { v.windG = this.add.image(0, 0, 'glow').setTint(0xFF4A3A).setBlendMode('ADD').setScale(v.sz / 90); v.addAt(v.windG, 1); }
      if (v.windG) { v.windG.setVisible(m.wind > 0).setAlpha(0.4 + Math.sin(this.time.now / 40) * 0.25); }
      if (v.flashT > 0) v.flashT -= dt; if (v.flashCd > 0) v.flashCd -= dt; const fl = v.flashT > 0;
      const tint = m.slow > 0 ? 0xA8E8FF : m.burn > 0 ? 0xFFB080 : m.poison > 0 ? 0xB8F08A : null, tk = fl ? 'f' : tint || (m.mid ? 'm' : 0);
      if (v.tk !== tk) { v.tk = tk; if (fl) v.im.setTintFill(0xFFFFFF); else if (tint) v.im.setTint(tint); else if (m.mid) v.im.setTint(0xFFC8C8); else v.im.clearTint(); }
      if (v.alpha >= 1) v.setScale(fl ? 0.93 : 1);
      if (!m.boss && !m.mid && v.lastHp !== m.hp) { v.lastHp = m.hp; v.hp.setVisible(m.hp < m.maxHp); v.hp.list[1].width = Math.max(2, v.hp.w0 * m.hp / m.maxHp); }
    }
    // 경고 표시
    const wg = this.warnG ||= (() => { const g = this.add.graphics().setDepth(2); this.world.add(g); return g; })(); wg.clear();
    for (const w of s.warns || []) {
      const f = 1 - w.t / w.T;
      if (w.k === 'line') { const a = Math.atan2(w.y2 - w.y1, w.x2 - w.x1), L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), m = s.mons.find(o => o.id === w.id); const x1 = (m ? m.x : w.x1) * k, y1 = (m ? m.y : w.y1) * k; wg.fillStyle(0xFF2A2A, 0.18 + f * 0.25); wg.lineStyle(3, 0xFF4A3A, 0.8); const hw = w.w * k / 2, c = Math.cos(a), sn = Math.sin(a), pts = [[x1 - sn * hw, y1 + c * hw], [x1 + c * L * k - sn * hw, y1 + sn * L * k + c * hw], [x1 + c * L * k + sn * hw, y1 + sn * L * k - c * hw], [x1 + sn * hw, y1 - c * hw]]; wg.fillPoints(pts.map(([x, y]) => ({ x, y })), true); wg.lineBetween(x1, y1, x1 + c * L * k, y1 + sn * L * k); }
      else if (w.k === 'spawn') { const x = w.x * k, y = w.y * k, r = w.r * k * (0.7 + 0.3 * Math.sin(f * Math.PI * 4)); wg.fillStyle(0xFF2A2A, 0.25 + f * 0.3).fillCircle(x, y, r).lineStyle(4, 0xFF5A3A, 0.9).strokeCircle(x, y, w.r * k); wg.fillStyle(0xFFFFFF, 0.9).fillCircle(x, y - 4, r * 0.42).fillRect(x - r * 0.22, y + r * 0.1, r * 0.44, r * 0.26).fillStyle(0x6A0A0A, 1).fillCircle(x - r * 0.16, y - 6, r * 0.11).fillCircle(x + r * 0.16, y - 6, r * 0.11); }   // 해골 표시
      else { wg.fillStyle(0xFF2A2A, 0.15).fillCircle(w.x * k, w.y * k, w.r * k).fillStyle(0xFF3A2A, 0.35).fillCircle(w.x * k, w.y * k, w.r * k * f).lineStyle(4, 0xFF5A3A, 0.9).strokeCircle(w.x * k, w.y * k, w.r * k); }
    }
    // 화살 (풀링)
    const sh = s.shots;
    // 성능: 화살 하나 = 그림 하나 (빛 꼬리까지 미리 그려 둠 → 화살이 많아도 한 번에 그려짐)
    while (this.arrows.length < sh.length) { const g = this.add.image(0, 0, this.arrowTex(0xBFE8FF)).setOrigin(60 / 110, 0.5); this.arrowL.add(g); this.arrows.push(g); }
    const elc = s.sk.fire ? 0xFF8A3A : s.sk.frost ? 0x9AE8FF : s.sk.poison ? 0x8CE05A : s.sk.bolt ? 0xFFE14D : 0xBFE8FF;
    this.arrows.forEach((g, i) => { const a = sh[i]; g.setVisible(!!a); if (!a) return; g.setPosition(a.x * k, a.y * k).setRotation(a.a); const key = this.arrowTex(a.kind === 'spirit' ? 0xE8C0FF : elc); if (g.texture.key !== key) g.setTexture(key); });
    // 적 탄
    const fs = s.foes;
    while (this.foeV.length < fs.length) { const c = this.add.image(0, 0, this.foeTex(false)); this.arrowL.add(c); this.foeV.push(c); }
    this.foeV.forEach((c, i) => { const f = fs[i]; c.setVisible(!!f); if (f) { c.setPosition(f.x * k, f.y * k); const key = this.foeTex(f.kind === 'ice'); if (c.texture.key !== key) c.setTexture(key); } });
    // 떨어진 금화·경험치
    const ds = s.drops;
    while (this.dropV.length < ds.length) { const im = this.add.image(0, 0, 'i_gold').setDisplaySize(44, 44); this.dropL.add(im); this.dropV.push(im); }
    this.dropV.forEach((im, i) => { const d = ds[i]; im.setVisible(!!d); if (d) im.setPosition(d.x * k, d.y * k); });
    // 구슬 · 정령
    const os = s.orbs || [];
    while (this.orbV.length < os.length) { const im = this.add.image(0, 0, 'glow').setScale(0.75).setBlendMode('ADD'); this.world.add(im); this.orbV.push(im); }
    this.orbV.forEach((im, i) => { const o = os[i]; im.setVisible(!!o); if (o) im.setPosition(o.x * k, o.y * k).setTint(o.ice ? 0x9AE8FF : 0xFF8A3A).setDepth(3050); });
    const ns = s.sk.spirit || 0;
    while (this.spV.length < ns) { const im = this.add.image(0, 0, 'sk_spirit').setDisplaySize(56, 56); this.world.add(im); this.spV.push(im); }
    this.spV.forEach((im, i) => im.setPosition((p.x + (i ? 70 : -70)) * k, (p.y - 60) * k + Math.sin(this.time.now / 300 + i) * 8).setDepth(p.y + 1));
    // 문
    if (s.doorOpen && this.doorGlow.alpha === 0) { this.tweens.add({ targets: this.doorGlow, alpha: 1, duration: 400 }); this.tweens.add({ targets: this.doorArrow, alpha: 1, y: 60, duration: 500, yoyo: true, repeat: -1 }); audio.play('sfx_door', { volume: 0.5 }); }
    // 특수 방: NPC 에 다가가면 대화
    if (this.npcV && s.npc && !s.npc.used && !this.npcTalked && Math.hypot(p.x - s.npc.x, p.y - s.npc.y) < 220) { this.npcTalked = true; this.joyUp(); this.npcChoice(); }
    this.syncCam(false);
  }
  // ── 사건 → 효과 ──
  handleEvents() {
    const s = this.s, k = this.k;
    for (const e of s.events.splice(0)) {
      if (e.type === 'dmg') {
        const v = this.views.get(e.id); if (v && !(v.flashCd > 0)) { v.flashT = 0.05; v.flashCd = 0.18; }   // 계속 맞아도 하얗게 굳지 않게 번쩍임 간격 둠
        if (e.el !== 'aura') this.num(e.x * k, e.y * k, e.v, e.crit, e.el);
        audio.play(e.crit ? 'sfx_crit' : 'sfx_hit', { volume: e.el ? 0.2 : 0.35, gap: 60 });
        if (e.crit) this.hitStop = Math.max(this.hitStop, 0.04);
      } else if (e.type === 'kill') {
        const v = this.views.get(e.id); this.views.delete(e.id);
        if (v) { this.tweens.killTweensOf(v.im); this.tweens.killTweensOf(v); this.tweens.add({ targets: v, scale: 1.3, alpha: 0, duration: 220, onComplete: () => v.destroy() }); }   // 꿈틀 반복 애니메이션도 같이 끔 (안 끄면 계속 쌓임)
        this.burst(e.x * k, e.y * k, e.boss ? 40 : 14, 0xFFE8A0);
        audio.play('sfx_kill', { volume: 0.5, gap: 50 });
        if (e.boss) { this.cameras.main.shake(400, 0.012); this.cameras.main.flash(200, 255, 240, 200); this.hitStop = 0.4; }
      } else if (e.type === 'shoot') { audio.play('sfx_shoot', { volume: 0.32, gap: 90, detune: (Math.random() - 0.5) * 240 }); this.heroV.recoil = 1; }
      else if (e.type === 'boom') { audio.play('sfx_fire', { volume: 0.6 }); this.cameras.main.shake(180, 0.01); this.burst(e.x * k, e.y * k, 26, 0xFF8A3A); const r = this.add.circle(e.x * k, e.y * k, e.r * k, 0xFFB050, 0.5).setDepth(3800); this.world.add(r); this.tweens.add({ targets: r, alpha: 0, scale: 1.2, duration: 300, onComplete: () => r.destroy() }); }
      else if (e.type === 'loot') { audio.play('sfx_chest', { volume: 0.5 }); const sc = e.kind === 'scroll', col = sc ? 0x8AE8FF : TIERS[e.t].col, lb = T(this, e.x * k, e.y * k - 80, sc ? `강화 두루마리 +${e.n}` : `${TIERS[e.t].name} · ${itemName(e)}`, 28, '#' + col.toString(16).padStart(6, '0'), { w: 900, stroke: '#14102A', thick: 6 }).setDepth(4100); this.world.add(lb); this.tweens.add({ targets: lb, y: lb.y - 50, alpha: 0, delay: 900, duration: 700, onComplete: () => lb.destroy() }); }
      else if (e.type === 'blast') { if ((this.fxN || 0) < 60) { const r = this.add.circle(e.x * k, e.y * k, e.r * k, e.plain ? 0x9AE8FF : 0xFFA040, 0.28).setStrokeStyle(5, e.plain ? 0xCFF4FF : 0xFFD080, 0.9); this.fxL.add(r); r.setScale(0.4); this.tweens.add({ targets: r, scale: 1, alpha: 0, duration: 260, onComplete: () => r.destroy() }); this.burst(e.x * k, e.y * k, 6, e.plain ? 0x9AE8FF : 0xFF8A3A); } audio.play('sfx_fire', { volume: 0.25, gap: 90 }); }
      else if (e.type === 'shield') { if (!e.on) this.cameras.main.shake(120, 0.006); }
      else if (e.type === 'wave' && e.n > 1) this.banner(`웨이브 ${e.n} / ${e.of}`, '', '#FFB0A0', 400);
      else if (e.type === 'enemyshot') audio.play('sfx_enemyshot', { volume: 0.18, gap: 120 });
      else if (e.type === 'hurt') { audio.play('sfx_hurt', { volume: 0.6 }); this.cameras.main.shake(140, 0.008); this.num(s.p.x * k, (s.p.y - 120) * k, e.v, false, 'hurt'); this.cameras.main.flash(80, 255, 60, 60); }
      else if (e.type === 'dodge') this.float(s.p.x * k, (s.p.y - 140) * k, '회피!', '#BFF4FF');
      else if (e.type === 'heal') { audio.play('sfx_heal', { volume: 0.5 }); this.float(s.p.x * k, (s.p.y - 140) * k, `+${e.v}`, '#8AF07A'); }
      else if (e.type === 'pick') audio.play('sfx_coin', { volume: 0.2, gap: 60 });
      else if (e.type === 'bolt') this.zap(e.x1 * k, e.y1 * k, e.x2 * k, e.y2 * k);
      else if (e.type === 'head') this.float(e.x * k, e.y * k - 80, '일격!', '#FFD45A');
      else if (e.type === 'levelup') { this.pending.push(['levelup', e.lvl]); }
      else if (e.type === 'cleared') { /* 원작 2: 능력은 레벨 업 때만 (방을 깰 때는 없음) */ }
      else if (e.type === 'room') this.onRoom(e);
      else if (e.type === 'boss') { audio.play('sfx_boss', { volume: 0.8 }); if (!e.mid) { audio.music('bgm_boss'); this.bossIntro(e.name); } else this.banner('우두머리 등장', e.name, '#FF8A70'); }
      else if (e.type === 'bossatk') { const b = s.mons.find(m => m.boss); const v = b && this.views.get(b.id); if (v) this.tweens.add({ targets: v.im, scale: v.im.scale * 1.12, duration: 120, yoyo: true }); if (e.pat === 'slam') this.cameras.main.shake(200, 0.01); }
      else if (e.type === 'dead') this.onDead();
      else if (e.type === 'clear') this.onClear();
    }
    // 레벨업·방 정리 능력 고르기는 한 번에 하나씩
    if (this.pending.length && !this.picking && !this.ended) { const [kind] = this.pending.shift(); audio.play(kind === 'levelup' ? 'sfx_levelup' : 'sfx_pick', { volume: 0.6 }); this.pickSkill(kind === 'levelup' ? `레벨 업! Lv ${this.s.lvl}` : '방 정리 완료!'); }
  }
  onRoom(e) {
    this.cameras.main.fadeOut(120, 10, 12, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.drawRoom(); this.cameras.main.fadeIn(220, 10, 12, 30);
      const s = this.s, special = e.kind === 'special';
      this.banner(e.kind === 'boss' ? `${this.ch.name}의 끝` : special ? (s.npc.type === 'angel' ? '천사의 방' : '악마의 방') : `방 ${e.n}`, e.kind === 'mid' ? '강한 적이 기다려요' : special ? '다가가서 말을 걸어요' : '', '#BFF4FF', 700);
      if (e.kind !== 'boss') audio.music(['bgm_forest', 'bgm_desert', 'bgm_ice'][this.chapter - 1] || 'bgm_forest');
    });
  }
  // 화살 그림 (색마다 한 번만 만듦): 빛 꼬리 + 몸통 + 촉
  arrowTex(col) {
    const key = 'arw_' + col.toString(16); if (this.textures.exists(key)) return key;
    const c = this.textures.createCanvas(key, 110, 28), g = c.getContext(), hex = '#' + col.toString(16).padStart(6, '0');
    const gr = g.createLinearGradient(0, 0, 60, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, hex); g.globalAlpha = 0.75; g.fillStyle = gr; g.beginPath(); g.ellipse(36, 14, 34, 5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#FFFFFF'; g.strokeStyle = '#6AC8FF'; g.lineWidth = 2; g.fillRect(38, 11, 44, 6); g.strokeRect(38, 11, 44, 6);
    g.fillStyle = '#FFF6C0'; g.beginPath(); g.moveTo(84, 5); g.lineTo(84, 23); g.lineTo(102, 14); g.closePath(); g.fill(); c.refresh(); return key;
  }
  foeTex(ice) {
    const key = ice ? 'foe_ice' : 'foe_red'; if (this.textures.exists(key)) return key;
    const c = this.textures.createCanvas(key, 64, 64), g = c.getContext(), gr = g.createRadialGradient(32, 32, 8, 32, 32, 32);
    gr.addColorStop(0, ice ? 'rgba(122,216,255,0.9)' : 'rgba(255,90,138,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.fillStyle = ice ? '#E0F6FF' : '#FFE0F0'; g.strokeStyle = ice ? '#4AB8FF' : '#FF3A6A'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 13, 0, Math.PI * 2); g.fill(); g.stroke(); c.refresh(); return key;
  }
  digits() {
    if (this.textures.exists('dg_0')) return;
    for (const ch of '0123456789-!') { const c = this.textures.createCanvas('dg_' + ch, 30, 44), g = c.getContext(); g.font = '900 38px Pretendard, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#14102A'; g.lineJoin = 'round'; g.strokeText(ch, 15, 23); g.fillStyle = '#FFFFFF'; g.fillText(ch, 15, 23); c.refresh(); }
  }
  num(x, y, v, crit, el) {
    this.digits(); this.nums ||= [];
    let c = this.nums.find(n => !n.visible);
    if (!c) { if (this.nums.length >= 40) return; c = this.add.container(0, 0).setDepth(4000); for (let i = 0; i < 7; i++) c.add(this.add.image(0, 0, 'dg_0')); this.world.add(c); this.nums.push(c); }
    const str = `${el === 'hurt' ? '-' : ''}${v}${crit ? '!' : ''}`.slice(0, 7), col = el === 'hurt' ? 0xFF6A5A : crit ? 0xFFD45A : el ? (ELC[el] || 0xFFFFFF) : 0xFFFFFF, sz = crit ? 1.25 : el ? 0.7 : 0.9;
    c.list.forEach((im, i) => { const ch = str[i]; im.setVisible(!!ch); if (ch) im.setTexture('dg_' + ch).setTint(col).setPosition((i - (str.length - 1) / 2) * 24, 0); });
    this.tweens.killTweensOf(c);
    c.setVisible(true).setAlpha(1).setPosition(x + (Math.random() - 0.5) * 30, y).setScale(sz * (crit ? 1.4 : 1));
    this.tweens.add({ targets: c, y: y - 70, scale: sz, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => c.setVisible(false) });
  }
  float(x, y, s, col) { const t = T(this, x, y, s, 34, col, { w: 900, stroke: '#14102A', thick: 6 }).setDepth(4000); this.world.add(t); this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() }); }
  burst(x, y, n, col) { this.fxN ||= 0; n = Math.min(n, Math.max(0, 70 - this.fxN)); if (n > 16) n = 16 + Math.floor((n - 16) / 2); for (let i = 0; i < n; i++) { this.fxN++; const p = this.add.image(x, y, i % 2 ? 'spark' : 'glow').setTint(col).setBlendMode('ADD').setScale(0.3 + Math.random() * 0.3).setDepth(3900); this.fxL.add(p); const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90; this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0, duration: 350 + Math.random() * 250, onComplete: () => { p.destroy(); this.fxN--; } }); } }
  zap(x1, y1, x2, y2) { this.zapN ||= 0; if (this.zapN >= 4) return; this.zapN++; audio.play('sfx_zap', { volume: 0.3, gap: 80 }); const g = this.add.graphics().setDepth(3950); this.fxL.add(g); g.lineStyle(5, 0xFFF06A, 1).beginPath(); g.moveTo(x1, y1); for (let i = 1; i < 6; i++) g.lineTo(x1 + (x2 - x1) * i / 6 + (Math.random() - 0.5) * 30, y1 + (y2 - y1) * i / 6 + (Math.random() - 0.5) * 30); g.lineTo(x2, y2); g.strokePath(); this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => { g.destroy(); this.zapN--; } }); }
  // 보스 등장: 어둡게 · 위아래 빨간 WARNING 띠가 흐름 · 보스 그림과 이름이 들어옴 (2초, 그동안 전투 멈춤)
  bossIntro(name) {
    this.cine = 2.1; this.joyUp(); const B = BOSSES[this.ch.boss], root = this.add.container(0, 0).setDepth(940).setScrollFactor(0);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05040C, 0.7); root.add(dim);
    for (const [y, dir] of [[H * 0.22, 1], [H * 0.66, -1]]) { const band = this.add.container(0, y); band.add(this.add.rectangle(W / 2, 0, W * 3, 90, 0xC81E1E, 0.92)); for (let i = -6; i < 12; i++) band.add(T(this, i * 330, 0, 'WARNING', 44, '#FFE0D0', { w: 900, ls: 8 })); root.add(band); this.tweens.add({ targets: band, x: dir * 330, duration: 2100 }); }
    const im = this.add.image(W + 400, H * 0.44, B.key); im.setScale(Math.min(620 / im.width, 620 / im.height)); root.add(im);
    this.tweens.add({ targets: im, x: W / 2, duration: 420, ease: 'Back.easeOut' });
    const tag = T(this, W / 2, H * 0.6 - 30, 'BOSS', 34, '#FF8A70', { w: 900, ls: 14 }), nm = T(this, W / 2, H * 0.6 + 30, name, 68, '#FFFFFF', { w: 900, stroke: '#3A0A0A', thick: 12 });
    root.add([tag, nm]); tag.setAlpha(0); nm.setAlpha(0).setScale(1.4); this.tweens.add({ targets: [tag, nm], alpha: 1, scale: 1, duration: 300, delay: 300 });
    this.cameras.main.shake(300, 0.006);
    this.time.delayedCall(1750, () => this.tweens.add({ targets: root, alpha: 0, duration: 350, onComplete: () => root.destroy() }));
  }
  banner(title, sub, col, hold = 900) {
    const c = this.add.container(W / 2, H * 0.4).setDepth(900).setScrollFactor(0).setAlpha(0);
    c.add([this.add.rectangle(0, 0, W, 170, 0x0B0D1E, 0.75), T(this, 0, -16, title, 62, C.text, { w: 900, ls: 2, stroke: '#14102A', thick: 8 }), T(this, 0, 50, sub, 28, col, { w: 800 })]);
    this.tweens.add({ targets: c, alpha: 1, duration: 200, hold, yoyo: true, onComplete: () => c.destroy() });
  }

  // ── 능력 고르기: 카드 3장 ──
  pickSkill(title) {
    const s = this.s, opts = s.offer(3); if (!opts.length) return;
    this.picking = true; this.joyUp();
    const root = this.add.container(0, 0).setDepth(950).setScrollFactor(0);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05060F, 0.78).setInteractive(); root.add(dim);
    const ray = this.add.image(W / 2, H * 0.3, 'rays').setTint(0x8AE8FF).setAlpha(0.25).setScale(2.4).setBlendMode('ADD'); root.add(ray); this.tweens.add({ targets: ray, angle: 360, duration: 16000, repeat: -1 });
    root.add(T(this, W / 2, H * 0.24, title, 56, C.gold, { w: 900, stroke: '#14102A', thick: 8 }));
    root.add(T(this, W / 2, H * 0.24 + 66, '능력을 하나 골라요', 30, C.sub, { w: 800 }));
    const cw = 300, gap = 30, x0 = W / 2 - cw - gap;
    opts.forEach((key, i) => {
      const S = SKILLS[key], x = x0 + i * (cw + gap), y = H * 0.5, c = this.add.container(x, y + 60).setAlpha(0); root.add(c);
      const has = s.sk[key] || 0, R = SRAR[S.rar || 1], kc = R.col;
      c.add(this.add.existing(panel(this, 0, 0, cw, 460, { r: 30 })));
      const g = this.add.graphics(); g.lineStyle(6, kc, 1).strokeRoundedRect(-cw / 2 + 4, -226, cw - 8, 452, 28); c.add(g);
      const glow = this.add.image(0, -100, 'glow').setTint(kc).setScale(2.2).setBlendMode('ADD').setAlpha(0.5); c.add(glow);
      c.add(this.add.image(0, -100, S.icon).setDisplaySize(170, 170));
      c.add(T(this, 0, 30, S.name, 32, C.text, { w: 900, wrap: cw - 30 }));
      c.add(T(this, 0, 110, S.desc, 23, C.sub, { w: 800, wrap: cw - 40 }));
      const rb = this.add.graphics(); rb.fillStyle(kc, 1).fillRoundedRect(-70, -246, 140, 40, 20); c.add(rb); c.add(T(this, 0, -226, R.name, 22, '#FFFFFF', { w: 900, shadow: false }));
      if (S.rar === 4) { const sh = this.add.image(0, -100, 'rays').setTint(0xFFD45A).setScale(0.9).setAlpha(0.5).setBlendMode('ADD'); c.addAt(sh, 2); this.tweens.add({ targets: sh, angle: 360, duration: 5000, repeat: -1 }); }
      if (has) c.add(T(this, 0, 196, `보유 ${has}`, 22, '#9AD0FF', { w: 800 }));
      this.tweens.add({ targets: c, alpha: 1, y, duration: 260, delay: 120 + i * 90, ease: 'Back.easeOut' });
      const z = this.add.zone(0, 0, cw, 460).setInteractive({ useHandCursor: true }); c.add(z);
      z.on('pointerup', () => {
        if (root.done) return; root.done = true;
        audio.play('sfx_pick', { volume: 0.7 }); s.take(key); M.track('skill');
        this.tweens.add({ targets: c, scale: 1.12, duration: 160, yoyo: true });
        this.tweens.add({ targets: root, alpha: 0, duration: 240, delay: 220, onComplete: () => { root.destroy(); this.picking = false; this.updateHud(); s.events.length = 0; } });
      });
    });
    const unback = pushBack(() => true); root.once('destroy', unback);   // 고르는 중엔 뒤로가기 무시
  }
  // ── 특수 방: 천사 · 악마 ──
  npcChoice() {
    const s = this.s, n = s.npc, angel = n.type === 'angel'; this.picking = true;
    const p = popup(this, angel ? '천사의 선물' : '악마의 거래', 900, angel ? 820 : 900, { closable: false, depth: 960 });
    p.setScrollFactor(0);
    const im = this.add.image(0, -230, angel ? 'n_angel' : 'n_devil'); im.setScale(220 / im.height); p.content.add(im);
    p.content.add(T(this, 0, -80, angel ? '지친 궁수여, 하나를 고르렴' : '최대 체력 20%를 주면… 강한 힘을 주지', 28, C.sub, { w: 800, wrap: 780 }));
    const done = c => { s.useNpc(c); p.close(); this.picking = false; if (this.npcV) this.tweens.add({ targets: this.npcV, alpha: 0, y: this.npcV.y - 80, duration: 500 }); this.updateHud(); };
    if (angel) {
      p.content.add(btn(this, 0, 40, 640, 120, '체력 50% 회복', () => done('heal'), { style: 'green', size: 34 }));
      const k = s.offer(1)[0]; if (k) p.content.add(btn(this, 0, 190, 640, 120, `능력: ${SKILLS[k].name}`, () => done(k), { style: 'indigo', size: 30 }));
    } else {
      const strong = ['multi', 'front', 'ricochet', 'pierce', 'bolt', 'crit', 'atk', 'aspd'].filter(k => (s.sk[k] || 0) < SKILLS[k].max);
      const k = strong[Math.floor(Math.random() * strong.length)] || 'atk';
      p.content.add(T(this, 0, 10, `${SKILLS[k].name} · ${SKILLS[k].desc}`, 26, C.gold, { w: 800, wrap: 760 }));
      p.content.add(btn(this, 0, 140, 640, 120, '거래한다 (최대 체력 -20%)', () => done(k), { style: 'red', size: 30 }));
      p.content.add(btn(this, 0, 290, 640, 110, '그냥 지나간다', () => done('no'), { style: 'ghost', size: 30 }));
    }
  }

  // ── 일시정지 · 뒤로가기 ──
  onBack() { if (!this.paused && !this.ended && !this.picking) this.pause(); return true; }
  pause() {
    if (this.paused || this.ended) return; this.paused = true; this.joyUp();
    const resume = () => { p.close(); this.time.delayedCall(120, () => { this.paused = false; }); };
    const p = popup(this, '일시정지', 820, 900, { closable: false, onBack: resume });
    p.setScrollFactor(0);
    const s = this.s;
    p.content.add(T(this, 0, -260, `${this.daily ? '오늘의 던전' : `${this.chapter}장`} · 방 ${s.room} · Lv ${s.lvl}`, 30, C.sub, { w: 800 }));
    const ks = Object.keys(s.sk).filter(k => SKILLS[k]); ks.slice(0, 16).forEach((k, i) => p.content.add(this.add.image(-330 + (i % 8) * 94, -180 + Math.floor(i / 8) * 94, SKILLS[k].icon).setDisplaySize(82, 82)));
    p.content.add(btn(this, 0, 40, 520, 130, '계속하기', resume, { style: 'gold', icon: 'i_play', size: 40 }));
    const d = load(); const snd = btn(this, 0, 190, 520, 100, `효과음 ${d.sfx ? '켬' : '끔'}`, () => { audio.toggleSfx(); snd.setLabel(`효과음 ${load().sfx ? '켬' : '끔'}`); }, { style: 'indigo', size: 30 }); p.content.add(snd);
    p.content.add(btn(this, 0, 320, 420, 96, '포기하고 나가기', () => { p.close(); this.paused = false; this.s.over = true; this.onDead(true); }, { style: 'red', size: 30 }));
  }

  // ── 끝 ──
  onDead(giveUp) {
    if (this.ended) return;
    const s = this.s;
    // 되살리기 한 번 (보석 20 또는 무료 1회 — 광고 대신)
    if (!giveUp && !s.revived) {
      this.ended = true; this.joyUp();
      const d = load(), p = popup(this, '쓰러졌어요…', 820, 760, { closable: false, depth: 970 }); p.setScrollFactor(0);
      p.content.add(T(this, 0, -170, `방 ${s.room}까지 왔어요! 한 번 더 일어날까요?`, 30, C.sub, { w: 800, wrap: 740 }));
      p.content.add(btn(this, 0, 0, 600, 130, '되살아나기 (무료 1회)', () => { p.close(); this.ended = false; s.revive(); s.events.length = 0; audio.play('sfx_heal', { volume: 0.7 }); this.burst(s.p.x * this.k, s.p.y * this.k, 30, 0x8AF07A); }, { style: 'green', size: 32 }));
      p.content.add(btn(this, 0, 170, 500, 100, '그만하기', () => { p.close(); this.ended = false; this.onDead(true); }, { style: 'ghost', size: 30 }));
      return;
    }
    this.ended = true; audio.play('sfx_lose', { volume: 0.7 }); this.finish(false);
  }
  onClear() { if (this.ended) return; this.ended = true; audio.play('sfx_win', { volume: 0.8 }); this.time.delayedCall(800, () => this.finish(true)); }
  finish(win) {
    const s = this.s, r = { chapter: this.chapter, room: Math.min(s.room, ROOMS), win, gold: s.gold, kills: s.kills, skills: Object.values(s.sk).reduce((a, b) => a + b, 0), daily: this.daily, bosses: win ? 1 : 0, hero: this.heroK, lvl: s.lvl, sk: { ...s.sk }, loot: s.loot || [] };
    const res = M.finish(r);
    this.time.delayedCall(500, () => { this.cameras.main.fadeOut(400, 10, 12, 30); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', { ...r, ...res })); });
  }
}
