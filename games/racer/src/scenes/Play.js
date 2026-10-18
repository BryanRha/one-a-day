// 레이스 화면: core/race.js 시뮬레이션을 고정 간격으로 돌리고 상태·사건을 그림·소리로 옮긴다.
import { W, H } from '../config.js';
import { Race, LANES, CARS, FEVER_FULL } from '../core/race.js';
import { decide } from '../core/ai.js';
import { txt, fmt, fit, iconButton, button, popup } from '../ui.js';
import { audio } from '../audio.js';
import { load, save } from '../save.js';
import { carStats, CAR_INFO } from '../meta.js';
import { ZONES } from './Boot.js';

const DT = 1 / 60;
// 차종 → 그림 (승용차·경차는 색 여러 가지)
const CAR_KEYS = {
  sedan: ['traffic_sedan_blue', 'traffic_sedan_yellow', 'traffic_sedan_purple'],
  mini: ['traffic_mini_pink', 'traffic_mini_orange'],
  bus: ['traffic_bus'], truck: ['traffic_truck'], tanker: ['traffic_tanker'], police: ['traffic_police'],
};
const ITEM_KEY = { coin: 'item_coin', gold: 'item_gold', fuel: 'item_fuel', magnet: 'item_magnet', booster: 'item_booster', jump: 'item_jump' };
const ITEM_NAME = { fuel: '연료 +18', magnet: '자석!', booster: '부스터!', jump: '점프 충전!' };
const PL = 180;   // 내 차 길이(px)

class Pool {
  constructor(make) { this.make = make; this.live = new Map(); this.free = []; this.frame = 0; }
  begin() { this.frame++; }
  get(id) { let o = this.live.get(id); if (!o) { o = this.free.pop() || this.make(); o.setVisible(true).setActive(true); o._new = true; this.live.set(id, o); } else o._new = false; o._seen = this.frame; return o; }
  end() { for (const [id, o] of this.live) if (o._seen !== this.frame) { this.live.delete(id); o.setVisible(false).setActive(false); this.free.push(o); } }
}

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create() {
    const d = load();
    this.race = new Race({ seed: (Date.now() & 0xffffff) + 1, H, driver: d.driver, car: carStats() });
    this.s = this.race.s;
    this.acc = 0; this.over = false; this.finished = false; this.paused = false; this.zone = 0; this.endT = 0; this.lowFuelT = 0;
    this.bot = new URLSearchParams(location.search).has('bot');
    this.botT = 0;

    // 도로 (구역이 바뀌면 서서히 전환)
    this.roadA = this.add.tileSprite(W / 2, H / 2, W, H, 'road_0').setDepth(0);
    this.roadB = this.add.tileSprite(W / 2, H / 2, W, H, 'road_1').setDepth(1).setAlpha(0);
    this.L = { ground: this.add.layer().setDepth(5), cars: this.add.layer().setDepth(10), fly: this.add.layer().setDepth(30), fx: this.add.layer().setDepth(40) };
    this.speedLines = this.add.particles(0, 0, 'glow', { x: { min: 0, max: W }, y: -80, speedY: { min: 2600, max: 3400 }, lifespan: 700, scaleX: 0.05, scaleY: { min: 1.2, max: 2.2 }, alpha: { start: 0.5, end: 0 }, frequency: 22, quantity: 2, emitting: false, blendMode: 'ADD' }).setDepth(45);

    this.makePools();
    this.makePlayer();
    this.makeHud();
    this.makeInput();
    audio.music('bgm_race', this);
    this.cameras.main.fadeIn(300, 20, 26, 50);
    if (!d.tips.controls && !this.bot) this.tutorial();
    window.__play = this;
  }

  makePools() {
    const L = this.L;
    this.pCar = new Pool(() => { const c = this.add.container(0, 0); const sh = this.add.image(10, 18, 'glow').setTint(0x000000).setAlpha(0.35); const sp = this.add.image(0, 0, 'traffic_sedan_blue'); const siren = this.add.image(0, -10, 'glow').setBlendMode('ADD').setVisible(false); c.add([sh, sp, siren]); c.sh = sh; c.sp = sp; c.siren = siren; L.cars.add(c); return c; });
    this.pItem = new Pool(() => { const c = this.add.container(0, 0); const g = this.add.image(0, 0, 'glow').setBlendMode('ADD').setScale(1.3).setAlpha(0.6); const sp = this.add.image(0, 0, 'item_coin'); c.add([g, sp]); c.g = g; c.sp = sp; L.ground.add(c); return c; });
    this.pOil = new Pool(() => { const i = this.add.image(0, 0, 'prop_oil'); L.ground.add(i); return i; });
    this.fxFree = [];
    this.flyers = [];
    // 체크포인트 아치: 바둑판 띠 + 깃발 기둥 + 글자
    const cp = this.add.container(0, -999);
    const g = this.add.graphics();
    for (let x = 0; x < W; x += 54) for (let r = 0; r < 2; r++) g.fillStyle(((x / 54) + r) % 2 ? 0x1E2A52 : 0xFFFFFF).fillRect(x, r * 27, 54, 27);
    cp.add([g, this.add.rectangle(40, -40, 22, 150, 0xFF6B3D), this.add.rectangle(W - 40, -40, 22, 150, 0xFF6B3D), this.add.rectangle(W / 2, -60, 640, 90, 0x1E2A52, 0.92).setStrokeStyle(6, 0xFFE14D), txt(this, W / 2, -62, 'CHECKPOINT', 60, '#FFE14D')]);
    L.ground.add(cp);
    this.cp = cp;
  }

  makePlayer() {
    const d = load();
    this.pShadow = this.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.45);
    // 내 차 표식: 바닥에 노란 빛 (교통 차량과 구분)
    this.marker = this.add.image(0, 0, 'glow').setTint(0xFFE14D).setBlendMode('ADD').setAlpha(0.55);
    this.boostAura = this.add.sprite(0, 0, 'sheet_dash').setVisible(false).setScale(1.6, 2).setBlendMode('ADD').setTint(0xFF9A3C);
    this.exhaust = this.add.particles(0, 0, 'glow', { speedY: { min: 200, max: 360 }, speedX: { min: -40, max: 40 }, lifespan: 500, scale: { start: 0.35, end: 0.9 }, alpha: { start: 0.35, end: 0 }, tint: 0xDDDDDD, frequency: 40 });
    this.flame = this.add.particles(0, 0, 'glow', { speedY: { min: 500, max: 800 }, speedX: { min: -60, max: 60 }, lifespan: 260, scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xFFE14D, 0xFF8A1F, 0xFF4D2D], blendMode: 'ADD', frequency: 14, emitting: false });
    this.wind = this.add.particles(0, 0, 'glow', { x: { min: -90, max: 90 }, y: { min: -160, max: 60 }, speedY: { min: 900, max: 1300 }, lifespan: 260, scaleX: 0.06, scaleY: { start: 1.4, end: 0.5 }, alpha: { start: 0.6, end: 0 }, frequency: 20, emitting: false, blendMode: 'ADD' });
    this.car = this.add.image(0, 0, CAR_INFO[d.car].key);
    this.carScale = 200 / this.car.height;
    this.car.setScale(this.carScale);
    this.L.cars.add([this.marker, this.pShadow, this.boostAura, this.exhaust, this.flame, this.wind, this.car]);
    this.burst = this.add.particles(0, 0, 'spark', { lifespan: { min: 300, max: 600 }, speed: { min: 200, max: 600 }, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false }).setDepth(46);
    this.tilt = 0;
  }

  makeHud() {
    const D = 100;
    this.add.rectangle(W / 2, 0, W, 250, 0x101830, 0.55).setOrigin(0.5, 0).setDepth(D - 1);
    this.hDist = txt(this, 40, 70, '0m', 76, '#FFFFFF', { ox: 0 }).setDepth(D);
    this.hScore = txt(this, W / 2 + 30, 70, '0', 64, '#FFE14D').setDepth(D);
    this.add.image(W - 300, 150, 'item_coin').setDisplaySize(56, 56).setDepth(D);
    this.hCoin = txt(this, W - 262, 150, '0', 42, '#FFFFFF', { ox: 0 }).setDepth(D);
    iconButton(this, W - 80, 70, 'ico_pause', () => this.pause(), 110).setDepth(D);
    // 연료 게이지
    this.add.image(64, 162, 'item_fuel').setDisplaySize(64, 64).setDepth(D);
    this.add.rectangle(110, 162, 480, 40, 0x000000, 0.45).setOrigin(0, 0.5).setStrokeStyle(4, 0xFFFFFF, 0.7).setDepth(D);
    this.fuelBar = this.add.rectangle(114, 162, 472, 32, 0x6EE7C8).setOrigin(0, 0.5).setDepth(D);
    // 피버 게이지 (오른쪽 세로)
    this.add.rectangle(W - 34, H * 0.42, 30, 420, 0x000000, 0.4).setStrokeStyle(3, 0xFFFFFF, 0.6).setDepth(D);
    this.feverBar = this.add.rectangle(W - 34, H * 0.42 + 206, 22, 4, 0xFF8A1F).setOrigin(0.5, 1).setDepth(D);
    txt(this, W - 34, H * 0.42 - 240, '피버', 30, '#FFB36B').setDepth(D);
    // 콤보
    this.hCombo = txt(this, W / 2, 330, '', 96, '#FFE14D', { thick: 14 }).setDepth(D).setAlpha(0);
    this.hComboSub = txt(this, W / 2, 410, '', 38, '#FFFFFF').setDepth(D).setAlpha(0);
    // 점프 버튼
    this.jumpBtn = this.add.container(W - 130, H - 170).setDepth(D);
    this.jumpRing = this.add.graphics();
    this.jumpBtn.add([this.add.circle(0, 0, 92, 0x101830, 0.6), this.jumpRing, this.add.image(0, -4, 'item_jump').setDisplaySize(110, 110), txt(this, 0, 74, '점프', 30, '#FFFFFF')]);
    this.jumpBtn.setSize(190, 190).setInteractive().on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.jumpPressed = true; this.race.jump(); });
  }

  // 화면 왼쪽/오른쪽 탭 → 차로 이동 · 좌우 밀기도 됨 · 위로 밀기 → 점프
  makeInput() {
    this.input.on('pointerdown', p => { if (p.y < 250) return; this.down = { x: p.x, y: p.y }; });
    this.input.on('pointerup', p => {
      if (!this.down) return;
      if (this.jumpPressed) { this.jumpPressed = false; this.down = null; return; }
      const dx = p.x - this.down.x, dy = p.y - this.down.y;
      if (dy < -90 && Math.abs(dy) > Math.abs(dx)) this.race.jump();
      else if (Math.abs(dx) > 60) this.race.move(Math.sign(dx));
      else this.race.move(p.x < W / 2 ? -1 : 1);
      this.down = null;
    });
    const k = this.input.keyboard;
    if (k) { k.on('keydown-LEFT', () => this.race.move(-1)); k.on('keydown-RIGHT', () => this.race.move(1)); k.on('keydown-UP', () => this.race.jump()); k.on('keydown-SPACE', () => this.race.jump()); }
  }

  tutorial() {
    const d = load(); d.tips.controls = 1; save();
    const c = this.add.container(W / 2, H * 0.55).setDepth(98);
    const box = this.add.rectangle(0, 0, 900, 260, 0x101830, 0.85).setStrokeStyle(5, 0xFFE14D);
    c.add([box, txt(this, 0, -60, '👈 화면 왼쪽 / 오른쪽 탭 👉', 50, '#FFFFFF'), txt(this, 0, 10, '차로를 바꿔요 · 위로 밀면 점프!', 44, '#FFE8A8'), txt(this, 0, 80, '앞차에 닿기 직전에 옆으로 빠지면 "차!" 콤보', 36, '#9AE8FF')]);
    this.tweens.add({ targets: c, alpha: 0, delay: 4200, duration: 400, onComplete: () => c.destroy() });
  }

  update(time, dms) {
    if (this.paused) return;
    const dt = Math.min(0.05, dms / 1000);
    this.acc += dt;
    let n = 0;
    while (this.acc >= DT && n < 5) {
      this.acc -= DT; n++;
      if (this.bot && this.s.status === 'play') { this.botT -= DT; if (this.botT <= 0) { this.botT = 0.1; const d = decide(this.race, 0.85); if (d.dir) this.race.move(d.dir); if (d.jump) this.race.jump(); } }
      this.race.step(DT);
      for (const e of this.race.events) this.onEvent(e);
      this.race.events.length = 0;
    }
    if (this.acc > DT * 5) this.acc = 0;
    if (this.over) { this.endT += dt; this.s.speed *= Math.pow(0.25, dt); if (this.endT > 1.6) this.finish(); }
    this.draw(dt);
  }

  draw(dt) {
    const s = this.s, p = s.p, t = s.t;
    const dy = s.speed * dt;
    this.roadA.tilePositionY -= dy; this.roadB.tilePositionY -= dy;
    const boost = s.feverT > 0 || s.booster > 0;
    this.speedLines.emitting = boost || s.speed > 1350;
    // 내 차: 차로 이동 중 기울기, 점프 시 커지고 그림자는 아래로
    const vx = p.x - (this.lastX ?? p.x); this.lastX = p.x;
    this.tilt += (Phaser.Math.Clamp(vx * 1.2, -16, 16) - this.tilt) * Math.min(1, dt * 14);
    const lift = p.z, sc = this.carScale * (1 + lift * 0.32);
    const shake = p.hit > 0 ? Math.sin(t * 80) * 6 : 0;
    this.car.setPosition(p.x + shake, p.y - lift * 70).setScale(sc).setAngle(this.tilt).setAlpha(p.hit > 0 && Math.floor(t * 20) % 2 ? 0.55 : 1);
    this.pShadow.setPosition(p.x + 14 + lift * 30, p.y + 22).setScale(1.4 * (1 - lift * 0.3), 2.1 * (1 - lift * 0.3)).setAlpha(0.45 - lift * 0.2);
    this.marker.setPosition(p.x, p.y + 10).setScale(2.1 + Math.sin(t * 5) * 0.1, 2.9 + Math.sin(t * 5) * 0.1).setAlpha(this.over ? 0 : 0.5);
    this.exhaust.setPosition(p.x, p.y + 100 - lift * 70); this.exhaust.emitting = !this.over;
    this.flame.setPosition(p.x, p.y + 110 - lift * 70); this.flame.emitting = boost;
    this.boostAura.setVisible(boost).setPosition(p.x, p.y - 10 - lift * 70);
    if (boost && !this.boostAura.anims.isPlaying) this.boostAura.play('sheet_dash');
    this.wind.setPosition(p.x, p.y); this.wind.emitting = p.slipOn;

    // 차들
    this.pCar.begin();
    for (const c of s.cars) {
      const o = this.pCar.get(c.id);
      if (o._new) { const ks = CAR_KEYS[c.kind]; o.sp.setTexture(ks[c.color % ks.length]); const k = (c.len + 12) / o.sp.height; o.sp.setScale(k); o.sh.setScale(c.w / 70, c.len / 70); o.siren.setVisible(c.kind === 'police'); o.setAngle(0).setAlpha(1); o.scaleBase = 1; }
      if (c.state === 'fly') { const f = 1 - c.ft / 1.2; o.setPosition(c.x, c.y).setAngle(c.rot * 57.3).setScale(1 + Math.sin(Math.min(1, f * 1.6) * Math.PI) * 0.6).setAlpha(Math.min(1, c.ft * 2)); o.sh.setVisible(false); }
      else {
        o.setPosition(c.x, c.y).setScale(1).setAngle((c.tx - c.x) * 0.12); o.sh.setVisible(true);
        if (c.kind === 'police') o.siren.setTint(Math.floor(t * 6) % 2 ? 0xFF3B5B : 0x3B7BFF).setScale(1.6).setAlpha(0.8);
      }
    }
    this.pCar.end();
    // 아이템 · 기름
    this.pItem.begin();
    for (const it of s.items) {
      const o = this.pItem.get(it.id);
      if (o._new) { o.sp.setTexture(ITEM_KEY[it.kind]); fit(o.sp, it.kind === 'coin' ? 70 : 104); o.g.setVisible(it.kind !== 'coin').setTint(it.kind === 'fuel' ? 0xFF5A5A : it.kind === 'booster' ? 0x5AA8FF : 0xFFE14D); }
      o.setPosition(it.x, it.y + Math.sin(t * 5 + it.id) * 6);
      if (it.kind === 'coin') o.sp.scaleX = Math.abs(Math.cos(t * 5 + it.id)) * o.sp.scaleY;
    }
    this.pItem.end();
    this.pOil.begin();
    for (const ol of s.oils) { const o = this.pOil.get(ol.id); if (o._new) fit(o, 170); o.setPosition(ol.x, ol.y); }
    this.pOil.end();
    this.cp.setY(s.cpY ?? -999);

    // HUD
    this.hDist.setText(`${fmt(s.dist)}m`);
    this.scoreShown = (this.scoreShown ?? 0) + (s.score - (this.scoreShown ?? 0)) * Math.min(1, dt * 10);
    this.hScore.setText(fmt(Math.round(this.scoreShown)));
    this.hCoin.setText(fmt(s.coins));
    const f = s.fuel / s.fuelMax;
    this.fuelBar.width = 472 * f;
    this.fuelBar.fillColor = f < 0.25 ? (Math.floor(t * 6) % 2 ? 0xFF5A5A : 0xFFB0B0) : f < 0.5 ? 0xFFC93C : 0x6EE7C8;
    if (f < 0.25 && !this.over) { this.lowFuelT -= dt; if (this.lowFuelT <= 0) { this.lowFuelT = 1.2; audio.play('sfx_lowfuel', { volume: 0.45 }); } }
    this.feverBar.height = 412 * (s.feverT > 0 ? s.feverT / 4 : s.fever / FEVER_FULL);
    this.feverBar.fillColor = s.feverT > 0 ? (Math.floor(t * 10) % 2 ? 0xFFE14D : 0xFF8A1F) : 0xFF8A1F;
    this.hCombo.setAlpha(s.combo > 1 ? Math.min(1, s.comboT * 1.5) : 0);
    this.hComboSub.setAlpha(this.hCombo.alpha);
    this.jumpRing.clear().lineStyle(12, p.jump >= 1 ? 0xFFE14D : 0x8A93B0).beginPath().arc(0, 0, 88, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.jump).strokePath();
    this.jumpBtn.setAlpha(p.jump >= 1 ? 1 : 0.65).setScale(p.jump >= 1 ? 1 + Math.sin(t * 6) * 0.03 : 1);
  }

  onEvent(e) {
    const s = this.s, p = s.p;
    switch (e.type) {
      case 'honk': {
        // 칼치기 등급: 가까이서 뺄수록 크게
        const G = [null, ['차!', '#FFFFFF', 56], ['차차!', '#FFE14D', 68], ['차차차!', '#FF6FB5', 84]][e.grade];
        audio.play(`sfx_honk_${Math.min(4, e.grade - 1 + Math.floor((e.combo - 1) / 6))}`, { volume: 0.6, gap: 60 });
        this.pop(e.x, e.y + 40, G[0], G[1], G[2]);
        if (e.grade === 3) { this.cameras.main.shake(120, 0.004); this.cameras.main.flash(90, 255, 200, 230, false); }
        this.hCombo.setText(`차! ×${e.combo}`).setScale(1.35 + e.grade * 0.1);
        this.tweens.add({ targets: this.hCombo, scale: 1, duration: 160, ease: 'Back.easeOut' });
        const mult = 1 + Math.min(9, Math.floor(e.combo / 2)) * 0.5;
        this.hComboSub.setText(`점수 ×${mult.toFixed(1)}`);
        this.burst.setParticleTint(0xFFE14D); this.burst.emitParticleAt(e.x, p.y - 60, 6);
        break;
      }
      case 'comboEnd': break;
      case 'smash': {
        audio.play(e.how === 'jump' ? 'sfx_boom' : 'sfx_smash', { volume: e.how === 'jump' ? 0.7 : 0.55, gap: 50 });
        this.fx('sheet_poof', e.x, e.y, 1.6);
        if (e.how === 'jump') { this.fx('sheet_boom', e.x, e.y, 1.4); this.cameras.main.shake(250, 0.012); this.pop(e.x, e.y - 80, `점프샷! +${fmt(e.pts)}`, '#FF8A1F', 64); }
        else this.pop(e.x, e.y - 60, `+${fmt(e.pts)}`, '#FFFFFF', 44);
        this.burst.setParticleTint(0xFFB36B); this.burst.emitParticleAt(e.x, e.y, 14);
        break;
      }
      case 'boom': this.fx('sheet_boom', e.x, e.y, 3); this.fx('sheet_ring', e.x, e.y, 3); this.cameras.main.shake(400, 0.02); audio.play('sfx_boom', { volume: 0.8 }); this.flash(0xFFD27A); break;
      case 'crash': audio.play('sfx_crash', { volume: 0.7 }); audio.buzz(80); this.cameras.main.shake(220, 0.014); this.fx('sheet_hit', e.x, e.y, 1.8, 0xFFE14D); this.pop(e.x, e.y - 80, '쿵! 연료 −8', '#FF6B6B', 52); break;
      case 'jump': audio.play('sfx_jump', { volume: 0.6 }); break;
      case 'land': audio.play('sfx_land', { volume: 0.5 }); this.fx('sheet_poof', p.x, p.y + 60, 0.9); break;
      case 'pick': this.onPick(e); break;
      case 'checkpoint': {
        audio.play('sfx_checkpoint', { volume: 0.7 });
        this.banner(`체크포인트 ${e.n}`, `연료 +${Math.round(e.add)}`, 0x2E9E6A);
        const z = Math.floor(e.n / 3) % ZONES.length;
        if (z !== this.zone) this.zoneChange(z);
        break;
      }
      case 'fever': audio.play('sfx_fever', { volume: 0.8 }); this.banner('피버 타임!', '무적 질주 · 부딪히는 차를 날려요', 0xFF6B3D); this.flash(0xFFE14D); break;
      case 'booster': audio.play('sfx_fever', { volume: 0.6 }); break;
      case 'boostEnd': this.boostAura.stop(); break;
      case 'slip': audio.play('sfx_slip', { volume: 0.5 }); this.pop(p.x, p.y - 260, '슬립스트림!', '#9AE8FF', 40); break;
      case 'oil': audio.play('sfx_skid', { volume: 0.6 }); this.pop(p.x, p.y - 200, '미끌!', '#D8CCFF', 48); break;
      case 'outOfFuel': this.onEnd(); break;
    }
  }

  onPick(e) {
    if (e.kind === 'coin') audio.play('sfx_coin', { volume: 0.35, gap: 50 });
    else if (e.kind === 'gold') { audio.play('sfx_gold', { volume: 0.6 }); this.pop(e.x, e.y, '+10', '#FFE14D', 48); }
    else { audio.play(e.kind === 'fuel' ? 'sfx_fuel' : 'sfx_item', { volume: 0.6 }); this.pop(this.s.p.x, this.s.p.y - 240, ITEM_NAME[e.kind], '#FFFFFF', 56); }
    this.fx('sheet_pick', e.x, e.y, 0.9);
  }

  zoneChange(z) {
    this.zone = z;
    this.roadB.setTexture(`road_${z}`).setAlpha(0); this.roadB.tilePositionY = this.roadA.tilePositionY;
    this.tweens.add({ targets: this.roadB, alpha: 1, duration: 1500, onComplete: () => { this.roadA.setTexture(`road_${z}`); this.roadB.setAlpha(0); } });
    this.time.delayedCall(1700, () => this.banner(ZONES[z].name, '', 0x3B5BDB));
  }

  fx(key, x, y, scale = 1, tint = null) {
    let sp = this.fxFree.pop();
    if (!sp) { sp = this.add.sprite(0, 0, key).setBlendMode('ADD'); sp.on('animationcomplete', () => { sp.setVisible(false); this.fxFree.push(sp); }); this.L.fx.add(sp); }
    sp.setVisible(true).setPosition(x, y).setScale(scale);
    if (tint) sp.setTint(tint); else sp.clearTint();
    sp.play(key);
  }
  pop(x, y, str, col, size = 48) {
    const t = txt(this, x, y, str, size, col).setDepth(90).setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 110, alpha: 0, delay: 260, duration: 520, onComplete: () => t.destroy() });
  }
  banner(title, sub, color) {
    const c = this.add.container(W / 2, H * 0.3).setDepth(95);
    c.add([this.add.rectangle(0, 0, 900, sub ? 170 : 130, color, 0.92).setStrokeStyle(6, 0xFFFFFF), txt(this, 0, sub ? -26 : 0, title, 66, '#FFFFFF')]);
    if (sub) c.add(txt(this, 0, 46, sub, 38, '#FFF3C2'));
    c.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 50, delay: 1300, duration: 300, onComplete: () => c.destroy() });
  }
  flash(col) { const f = this.add.rectangle(W / 2, H / 2, W, H, col, 0.6).setDepth(97).setBlendMode('ADD'); this.tweens.add({ targets: f, alpha: 0, duration: 350, onComplete: () => f.destroy() }); }

  onEnd() {
    this.over = true;
    audio.play('sfx_end', { volume: 0.8 });
    this.banner('연료가 바닥났어요!', `${fmt(this.s.dist)}m 달렸어요`, 0x1E2A52);
  }
  finish() {
    if (this.finished) return; this.finished = true;
    const s = this.s;
    const r = { dist: Math.floor(s.dist), score: s.score, coins: Math.floor(s.coins), combo: s.bestCombo, cp: s.checkpoints, ...s.stats };
    audio.stopMusic();
    this.cameras.main.fadeOut(350, 20, 26, 50);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', r));
  }

  pause() {
    if (this.paused || this.over) return;
    this.paused = true; this.tweens.pauseAll(); this.anims.pauseAll(); audio.duck(0.1);
    const pop = popup(this, '잠시 멈춤', 700, { closable: false, depth: 2000 });
    const resume = () => { pop.close(); this.time.delayedCall(160, () => { this.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); audio.duck(0.36); }); };
    pop.content.add(button(this, 0, -90, '계속 달리기', resume, { key: 'btn_gold', w: 520, h: 150 }));
    pop.content.add(button(this, 0, 80, '차고로', () => { pop.close(); this.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); audio.stopMusic(); this.scene.start('Lobby'); }, { key: 'btn_purple', w: 440, h: 120 }));
  }
}
