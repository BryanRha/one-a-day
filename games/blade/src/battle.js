// 전투: 주인공(조작·자동) · 몬스터 AI · 타격 판정 · 웨이브 · 보스 · 보상 줍기 · 카메라
import * as THREE from 'three';
import { E, shake, hitstop, slowmo, pulse, setVignette } from './engine.js?v=0.63.0';
import { RIM } from './assets.js?v=0.63.0';
import { load } from './assets.js?v=0.63.0';
import { loadProp } from './props.js?v=0.63.0';
import { Actor } from './actor.js?v=0.63.0';
import { FX, initFX, clearFX, updateFX, burst, slashMark, dust, ring, flashLight, decal, Trail } from './fx.js?v=0.63.0';
import { buildWorld, ambient, HALF } from './world.js?v=0.63.0';
import { COMBO, SKILLS, SKILL_SLOTS, EVADE, MOBS, stageScale } from './data.js?v=0.63.0';
import { IN, keyAxis, resetInput } from './input.js?v=0.63.0';
import { buildHud, hideHud, hudPlayer, hudInfo, hudBoss, hudCombo, hudMsg, hudGo, hudAuto, dmgNum, updateNums } from './hud.js?v=0.63.0';
import { sfx, music } from './audio.js?v=0.63.0';

/* 달리기: 발 속도(317/초) × 재생 1.5배 = 이동 480 → 발이 미끄러지지 않음 */
const RUN = 480, RUN_ANIM = RUN / 317;
const V3 = THREE.Vector3, PR = 60, rnd = (a, b) => a + Math.random() * (b - a);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// 범위 안인가: 원/부채꼴 (r · arc 도) 또는 직선 (line 길이 · w 폭)
function inHit(src, ang, tp, tr, h) {
  const dx = tp.x - src.x, dz = tp.z - src.z;
  if (h.line) { const f = dx * Math.sin(ang) + dz * Math.cos(ang), s = dx * Math.cos(ang) - dz * Math.sin(ang); return f > (h.back ? -160 : -40) - tr && f < h.line + tr && Math.abs(s) < h.w / 2 + tr; }
  const d = Math.hypot(dx, dz); if (d > h.r + tr) return false; if ((h.arc ?? 360) >= 360 || d < tr) return true; return angDiff(Math.atan2(dx, dz), ang) <= (h.arc * Math.PI / 360);
}

class Player {
  constructor(B, st) {
    this.B = B; this.a = new Actor('warrior', { shadow: 95, turn: 18 }); this.pos = this.a.pos; this.st = 'idle'; this.stT = 0; this.combo = 0; this.comboT = 0; this.buf = false; this.cd = {}; this.evCd = 0;
    this.maxHp = st.hp; this.hp = st.hp; this.atk = st.atk; this.def = st.def; this.crit = st.crit; this.cdmg = st.cdmg; this.slv = st.skillLv || {}; this.rage = 0; this.inv = 0; this.sa = false; this.hurtN = 0;
    this.trail = new Trail(0xffb04a, 0xfff0c8); B.scene.add(this.trail.mesh); this.ta = new V3(); this.tb = new V3(); this.kbV = new V3();
    this.a.play('idle', { loop: true });
  }
  busy() { return ['atk', 'skill', 'evade', 'hit', 'down', 'dead', 'intro'].includes(this.st); }
  moveDir() { if (this.B.auto && !IN.active && !keyAxis()) return null; const k = keyAxis(); if (k) return k; if (Math.hypot(IN.x, IN.y) > 0.15) return [IN.x, IN.y]; return null; }
  nearest(maxD = 700, from = this.pos) { let best = null, bd = maxD; for (const e of this.B.enemies) { if (!e.alive || e.st === 'appear') continue; const d = from.distanceTo(e.pos) - e.def.r * e.sc; if (d < bd) { bd = d; best = e; } } return best; }
  update(dt) {
    const B = this.B; this.stT += dt; for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt); this.evCd = Math.max(0, this.evCd - dt); this.inv = Math.max(0, this.inv - dt); this.comboT -= dt;
    if (this.st === 'dead' || this.st === 'intro') { this.a.update(dt); return; }
    let md = this.moveDir();
    // 입력 → 행동
    if (IN.evade > 0) { IN.evade = 0; if (this.evCd <= 0 && !['dead', 'down', 'skill'].includes(this.st)) this.evade(md); }
    for (let i = 0; i < 4; i++) if (IN.skill[i] > 0) { IN.skill[i] = 0; this.skill(SKILL_SLOTS[i]); }
    if (IN.ult > 0) { IN.ult = 0; if (this.rage >= 100) this.skill('ult'); }
    if (IN.atkTap > 0 || IN.atk) { IN.atkTap = 0; this.attack(); }
    if (B.auto) { const am = this.autoPlay(dt, md); if (!md && am) md = am; }
    // 상태별
    if (this.st === 'idle' || this.st === 'run') {
      if (md) { const k = Math.min(1, Math.hypot(md[0], md[1]) * 1.15), sp = RUN * k; this.pos.x += md[0] / Math.max(1e-3, Math.hypot(md[0], md[1])) * sp * dt; this.pos.z += md[1] / Math.max(1e-3, Math.hypot(md[0], md[1])) * sp * dt; this.a.face(Math.atan2(md[0], md[1])); if (this.st !== 'run') { this.st = 'run'; this.a.play('run', { loop: true, fade: 0.12, speed: RUN_ANIM }); } this.a.setSpeed(RUN_ANIM * Math.max(0.55, k)); }
      else if (this.st !== 'idle') { this.st = 'idle'; this.a.play('idle', { loop: true, fade: 0.2 }); }
      if (this.comboT <= 0) this.combo = 0;
    } else if (this.st === 'atk' && this.lunge) { const l = this.lunge; const k = Math.min(1, dt / l.t); this.pos.x += l.dx * k; this.pos.z += l.dz * k; l.t -= dt; l.dx -= l.dx * k; l.dz -= l.dz * k; if (l.t <= 0) this.lunge = null; }
    else if (this.st === 'evade') { const u = Math.min(1, this.stT / 0.45), e = 1 - Math.pow(1 - u, 2.2), step = (e - this.evE) * EVADE.dist; this.evE = e; this.pos.x += this.evD[0] * step; this.pos.z += this.evD[1] * step; if (this.stT < 0.4 && Math.random() < 0.5) dust(this.pos, { n: 1, size: 60, speed: 80 }); }
    else if (this.st === 'skill') { const S = this.sk;
      if (S.dash && this.a.t >= S.dash[0] && this.a.t <= S.dash[1]) { const v = S.dash[2] / (S.dash[1] - S.dash[0]) * dt; this.pos.x += this.a.dirX() * v; this.pos.z += this.a.dirZ() * v; dust(this.pos, { n: 1, size: 70, speed: 60 }); }
      if (S.move && md) { this.pos.x += md[0] * S.move * dt; this.pos.z += md[1] * S.move * dt; }
      if (S.inv && this.a.t >= S.inv[0] && this.a.t <= S.inv[1]) this.inv = Math.max(this.inv, 0.05); }
    if (this.kbV.lengthSq() > 1) { this.pos.addScaledVector(this.kbV, dt); this.kbV.multiplyScalar(Math.exp(-dt * 9)); }
    this.a.update(dt); this.clamp();
    // 무기 궤적
    this.trail.on = this.st === 'atk' || this.st === 'skill'; if (this.a.weapon) { this.a.blade(this.ta, this.tb); this.trail.push(this.ta, this.tb, B.t); }
  }
  clamp() { const B = this.B; this.pos.x = Math.max(-HALF, Math.min(HALF, this.pos.x)); if (B.bossArena) { const c = B.bossC, d = Math.hypot(this.pos.x - c.x, this.pos.z - c.z); if (d > 760) { this.pos.x = c.x + (this.pos.x - c.x) * 760 / d; this.pos.z = c.z + (this.pos.z - c.z) * 760 / d; } }
    this.pos.z = Math.min(B.zMax, Math.max(B.zMin, this.pos.z)); }
  attack() {
    if (this.st === 'atk') { if (this.a.t >= COMBO[this.combo].cancel - 0.25) this.buf = true; return; }
    if (this.busy()) return; this.startCombo(this.comboT > 0 ? this.combo : 0);
  }
  startCombo(i) {
    const c = COMBO[i]; this.st = 'atk'; this.stT = 0; this.combo = i; this.buf = false; const tg = this.nearest(620);
    if (tg) { this.a.faceTo(tg.pos, true); const d = this.pos.distanceTo(tg.pos) - tg.def.r * tg.sc - 150, l = Math.max(0, Math.min(c.lunge * 2.2, d)); if (l > 0) { const a = angTo(this.pos, tg.pos); this.lunge = { dx: Math.sin(a) * l, dz: Math.cos(a) * l, t: 0.14 }; } }
    else { const md = this.moveDir(); if (md) this.a.face(Math.atan2(md[0], md[1]), true); this.lunge = { dx: this.a.dirX() * c.lunge * 0.6, dz: this.a.dirZ() * c.lunge * 0.6, t: 0.14 }; }
    this.trail.color(0xffb04a, 0xfff0c8);
    sfx('swing', { vol: 0.5, rate: 0.9 + i * 0.08 });
    this.a.play(c.clip, { from: c.from, to: c.to, fade: i ? 0.06 : 0.1, events: [...c.hits.map(h => ({ t: h.t, fn: () => this.B.playerHit(h, 1, 'atk') })), { t: c.cancel, fn: () => { if (this.buf || IN.atk) this.next(); } }],
      onEnd: () => { this.st = 'idle'; this.stT = 0; this.comboT = 0.45; this.combo = (i + 1) % COMBO.length; this.a.play('idle', { loop: true, fade: 0.25 }); } });
  }
  next() { if (this.st !== 'atk') return; const n = this.combo + 1; if (n < COMBO.length) this.startCombo(n); else this.buf = false; }
  evade(md) {
    const d = md || [-this.a.dirX(), -this.a.dirZ()]; this.evD = d; this.evE = 0; this.a.face(Math.atan2(d[0], d[1]), true); this.st = 'evade'; this.stT = 0; this.inv = EVADE.inv; this.evCd = EVADE.cd; this.sa = false; this.lunge = null;
    this.trail.on = false; sfx('evade', { vol: 0.5 }); dust(this.pos, { n: 6, size: 70 });
    this.a.play(EVADE.clip, { from: EVADE.from, to: EVADE.to, fade: 0.05, speed: 1.15, onEnd: () => { this.st = 'idle'; this.a.play('idle', { loop: true, fade: 0.15 }); } });
  }
  skill(k) {
    const S = SKILLS[k]; if (!S || (this.cd[k] || 0) > 0 || ['dead', 'down', 'skill'].includes(this.st)) return false; if (k === 'ult' && this.rage < 100) return false;
    if (this.st === 'hit') return false;
    this.cd[k] = S.cd; this.B.stats.skills = (this.B.stats.skills || 0) + 1; if (k === 'ult') { this.rage = 0; slowmo(0.3, 0.35); this.B.camPunch = 1; sfx('ult', { vol: 0.8 }); hudMsg('<b class="ult">분노 해방</b>', 'big', 1100); flashLight(this.pos, 0xff6020, 10); }
    else sfx('skill', { vol: 0.6 });
    const tg = this.nearest(900); if (tg) this.a.faceTo(tg.pos, true); else { const md = this.moveDir(); if (md) this.a.face(Math.atan2(md[0], md[1]), true); }
    this.st = 'skill'; this.stT = 0; this.sk = S; this.sa = true; this.lunge = null; const lvm = 1 + (S.lv[1] || 0.1) * ((this.slv[k] || 1) - 1);
    this.trail.color(k === 'whirl' ? 0x6ab8ff : k === 'ult' ? 0xff5020 : k === 'guard' ? 0x7affc8 : 0xffa030, 0xffffff);
    ring(this.pos, { col: k === 'ult' ? 0xff5020 : 0xffd08a, r1: 260, life: 0.35, a: 0.8 });
    this.a.play(S.clip, { from: S.from, to: S.to, fade: 0.08, events: S.hits.map(h => ({ t: h.t, fn: () => this.B.playerHit(h, lvm, k) })),
      onEnd: () => { this.st = 'idle'; this.sa = false; this.a.play('idle', { loop: true, fade: 0.25 }); } });
    return true;
  }
  hurt(dmg, from, h) {
    if (this.st === 'dead') return false;
    if (this.inv > 0) { if (this.st === 'evade' && this.stT < 0.3 && !this.B.perfectT) this.B.perfect(); return false; }
    const d = Math.max(1, Math.round(dmg * 100 / (100 + this.def) * rnd(0.92, 1.08))); this.hp -= d; this.hurtN++; this.B.stats.hurt += d;
    dmgNum(new V3(this.pos.x, 190, this.pos.z), d, 'hurt'); this.a.flash(0xff4030); this.rage = Math.min(100, this.rage + 6); shake(h.kd ? 16 : 8, 0.2); sfx('hurt', { vol: 0.55 });
    burst(new V3(this.pos.x, 120, this.pos.z), { col: 0xff5a3a, n: 6, size: 90 });
    if (this.hp <= 0) { this.hp = 0; this.die(); return true; }
    if (this.sa) return true;
    const a = angTo(from, this.pos); this.kbV.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(h.kd ? 900 : 420); this.lunge = null; this.trail.on = false;
    if (h.kd) { this.st = 'down'; this.stT = 0; this.a.face(a + Math.PI, true); this.a.play('kd', { from: 0, to: 2.0, fade: 0.05, speed: 1.25, onEnd: () => { this.st = 'idle'; this.inv = 0.8; this.a.play('idle', { loop: true, fade: 0.2 }); } }); }
    else { this.st = 'hit'; this.stT = 0; this.a.play('hit', { from: 0, to: 0.5, fade: 0.04, onEnd: () => { this.st = 'idle'; this.a.play('idle', { loop: true, fade: 0.15 }); } }); }
    return true;
  }
  die() { this.st = 'dead'; this.trail.on = false; this.a.play('death', { from: 0, fade: 0.1 }); sfx('death', { vol: 0.7 }); slowmo(0.3, 1.2); setTimeout(() => this.B.lose(), 1600); }
  revive() { this.hp = this.maxHp; this.st = 'idle'; this.inv = 2.5; this.rage = 100; this.a.play('idle', { loop: true, fade: 0.2 }); ring(this.pos, { col: 0xffe08a, r1: 700, life: 0.6 }); burst(new V3(this.pos.x, 100, this.pos.z), { col: 0xffe08a, n: 20, size: 260 });
    for (const e of this.B.enemies) if (e.alive && this.pos.distanceTo(e.pos) < 700) e.hurt(1, this.pos, { kd: true, kb: 300 }); }
  // 자동 전투
  autoPlay(dt, md) {
    if (md) return; const B = this.B; const tg = this.nearest(2600);
    if (!tg) { if (!this.busy() && B.waveClear && B.nextZ != null && !B.ended) { const dz = B.nextZ - 320 - this.pos.z, dx = -this.pos.x * 0.3; if (Math.abs(dz) > 60) { const l = Math.hypot(dx, dz); return [dx / l, dz / l]; } } return null; }
    const d = this.pos.distanceTo(tg.pos) - tg.def.r * tg.sc;
    // 위험하면 피함
    if (this.evCd <= 0 && this.st !== 'skill' && Math.random() < 0.6) for (const e of B.enemies) if (e.alive && e.st === 'atk' && e.tele && e.tele.u > 0.55 && inHit(e.pos, e.a.ang, this.pos, PR, e.atkDef)) { this.evade([-Math.sin(angTo(this.pos, e.pos)), -Math.cos(angTo(this.pos, e.pos))]); return; }
    if (this.busy() && this.st !== 'atk') return;
    if (this.rage >= 100 && (d < 300)) { this.skill('ult'); return; }
    const near = B.enemies.filter(e => e.alive && e.pos.distanceTo(this.pos) < 520).length;
    if (d < 360 && (near >= 2 || tg.def.boss || tg.def.elite)) for (const k of SKILL_SLOTS) if ((this.cd[k] || 0) <= 0 && Math.random() < 0.08) { if (this.skill(k)) return; }
    if (d > 230 && this.st !== 'atk') { const a = angTo(this.pos, tg.pos); this.pos.x += Math.sin(a) * RUN * dt; this.pos.z += Math.cos(a) * RUN * dt; this.a.face(a); if (this.st !== 'run') { this.st = 'run'; this.a.play('run', { loop: true, fade: 0.12, speed: RUN_ANIM }); } }
    else this.attack();
  }
}

class Enemy {
  constructor(B, id, x, z, lvl, o = {}) {
    const def = MOBS[id]; this.B = B; this.def = def; this.id = id; this.elite = !!o.elite || def.elite; this.sc = def.scale * (o.elite && !def.elite ? 1.25 : 1);
    const hide = []; if (def.vary) for (const [pre, n] of Object.entries(def.vary)) { const keep = 1 + Math.floor(Math.random() * n); for (let i = 1; i <= n; i++) if (i !== keep) hide.push(pre + i); }
    this.a = new Actor(id, { scale: this.sc, shadow: def.shadow, hide, turn: def.boss ? 5 : 8 }); this.pos = this.a.pos; this.pos.set(x, 0, z);
    const m = stageScale(lvl) * (o.elite && !def.elite ? 2.5 : 1); this.maxHp = Math.round(def.hp * m); this.hp = this.maxHp; this.atk = def.atk * m * (o.elite ? 1.2 : 1);
    this.stagMax = (def.stagger || 1) * this.maxHp / def.hp; this.st = 'appear'; this.stT = 0; this.alive = true; this.atkCd = rnd(0.6, 1.6); this.cds = {}; this.kbV = new V3(); this.stag = 0; this.enraged = false; this.strafe = Math.random() < 0.5 ? 1 : -1;
    if (this.elite && !def.boss) this.a.mats.forEach(mm => mm.color.setRGB(1.15, 0.9, 0.85));
    this.a.faceTo(B.player.pos, true);
    const ap = def.appear && this.a.has(def.appear) ? def.appear : def.idle; dust(this.pos, { n: 10, size: 110 * this.sc });
    this.a.play(ap, { fade: 0, onEnd: () => { this.st = 'idle'; this.a.play(def.idle, { loop: true, fade: 0.2 }); } });
    if (ap === def.idle) this.stT = -0.6;
  }
  get boss() { return this.def.boss; }
  update(dt) {
    const B = this.B, P = B.player, def = this.def; this.stT += dt; this.atkCd -= dt; for (const k in this.cds) this.cds[k] -= dt;
    if (this.kbV.lengthSq() > 1) { this.pos.addScaledVector(this.kbV, dt); this.kbV.multiplyScalar(Math.exp(-dt * 10)); }
    if (this.st === 'appear' && this.stT > 0 && this.a.seg?.name === def.idle) { this.st = 'idle'; }
    if (this.st === 'dead') { this.a.update(dt); if (this.stT > (this.boss ? 4 : 1.9)) { const f = Math.max(0, 1 - (this.stT - (this.boss ? 4 : 1.9)) / 0.6); this.a.fade(f); if (f <= 0) this.remove = true; } return; }
    if (this.tele) { this.tele.u = Math.min(1, (this.a.t - this.tele.t0) / Math.max(0.05, this.tele.t1 - this.tele.t0)); this.tele.d.set(this.tele.u); }
    if (this.st === 'idle' || this.st === 'chase') {
      if (P.st === 'dead') { if (this.st !== 'idle') { this.st = 'idle'; this.a.play(def.idle, { loop: true, fade: 0.2 }); } }
      else { const d = this.pos.distanceTo(P.pos) - PR, a = angTo(this.pos, P.pos); this.a.face(a);
        const pick = this.pickAttack(d); const tok = this.boss || B.attackers() < 2 + (B.auto ? 0 : 0);
        if (pick && this.atkCd <= 0 && tok) this.startAttack(pick);
        else if (d > (pick ? pick.r * 0.75 : 240) || !tok) { const want = tok ? 1 : (d > 420 ? 1 : 0); const sp = def.speed * (this.enraged ? 1.25 : 1);
          if (want) { this.pos.x += Math.sin(a) * sp * dt; this.pos.z += Math.cos(a) * sp * dt; const as = def.foot ? Math.max(0.5, Math.min(1.8, sp / (def.foot * this.sc))) : 1; if (this.st !== 'chase') { this.st = 'chase'; this.a.play(def.move, { loop: true, fade: 0.2, speed: as }); } else this.a.setSpeed(as); }
          else { const s = a + Math.PI / 2 * this.strafe; this.pos.x += Math.sin(s) * sp * 0.35 * dt; this.pos.z += Math.cos(s) * sp * 0.35 * dt; if (this.st !== 'chase') { this.st = 'chase'; this.a.play(def.move, { loop: true, fade: 0.2 }); } if (def.foot) this.a.setSpeed(Math.max(0.4, sp * 0.35 / (def.foot * this.sc))); } }
        else if (this.st !== 'idle') { this.st = 'idle'; this.a.play(def.idle, { loop: true, fade: 0.2 }); } }
    } else if (this.st === 'atk' && this.atkDef.move) { const a = angTo(this.pos, P.pos); this.a.face(a); this.pos.x += Math.sin(a) * this.atkDef.move * dt; this.pos.z += Math.cos(a) * this.atkDef.move * dt; }
    else if (this.st === 'atk' && this.tele && this.tele.u < 0.6) this.a.face(angTo(this.pos, P.pos));
    this.a.update(dt);
  }
  pickAttack(d) { const L = this.def.attacks.filter(x => !(this.cds[x.clip] > 0)); if (!L.length) return null; const near = L.filter(x => d < x.r * 0.95); const pool = near.length ? near : L; const w = pool.map(x => x.w ?? 1); let s = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < pool.length; i++) { s -= w[i]; if (s <= 0) return pool[i]; } return pool[0]; }
  startAttack(x) {
    this.st = 'atk'; this.stT = 0; this.atkDef = x; if (x.cd) this.cds[x.clip] = x.cd; this.a.faceTo(this.B.player.pos);
    const hits = x.hits || [x.hit]; const sp = this.enraged ? 1.15 : 1;
    this.tele = { d: decal(this.pos, this.a.ang, x.r * (x.arc >= 360 ? 1 : 1), (x.arc ?? 360) * Math.PI / 180, x.kd ? 0xff2a10 : 0xff5a2a), t0: x.from, t1: hits[0], u: 0 };
    this.tele.d.g.position.copy(this.pos); this.tele.d.g.rotation.y = this.a.angT;
    if (this.boss && x.cd) sfx('roar', { vol: 0.5, rate: this.id === 'spider' ? 1.3 : 0.9 });
    this.a.play(x.clip, { from: x.from, to: x.to, fade: 0.12, speed: sp, events: hits.map((t, i) => ({ t, fn: () => this.doHit(x, i === hits.length - 1) })), onEnd: () => this.endAttack() });
  }
  doHit(x, last) {
    const P = this.B.player; if (this.tele) { this.tele.d.g.position.copy(this.pos); this.tele.d.g.rotation.y = this.a.ang; }
    if (x.fx === 'nova') { ring(this.pos, { col: 0xff7040, r1: x.r * 1.1, life: 0.4 }); dust(this.pos, { n: 14, size: 140, speed: 500 }); shake(12, 0.3); pulse(0.45); }
    else if (x.fx === 'quake') { ring(this.pos, { col: 0xffa060, r1: x.r, life: 0.35 }); dust(this.pos, { n: 8, size: 120, speed: 400 }); shake(10, 0.25); }
    if (P.st !== 'dead' && inHit(this.pos, this.a.ang, P.pos, PR, x)) P.hurt(this.atk * x.m, this.pos, x);
    sfx(this.boss ? 'heavy' : 'eswing', { vol: 0.35 });
    if (last && this.tele) { this.tele.d.kill(); this.tele = null; }
  }
  endAttack() { if (this.tele) { this.tele.d.kill(); this.tele = null; } this.st = 'idle'; this.atkCd = (this.boss ? rnd(0.5, 1.2) : rnd(1.2, 2.4)) * (this.enraged ? 0.6 : 1); this.a.play(this.def.idle, { loop: true, fade: 0.2 }); }
  hurt(dmg, from, h) {
    if (!this.alive || this.st === 'appear') return false;
    this.hp -= dmg; this.a.flash(0xffffff); const a = angTo(from, this.pos);
    if (this.hp <= 0) { this.die(a); return true; }
    if (this.boss) { this.stag += dmg; if (this.st !== 'stun' && this.stag >= this.stagMax) this.stun(); if (!this.enraged && this.hp < this.maxHp * 0.5) this.enrage(); return true; }
    const kb = (h.kb || 30) * (this.elite ? 0.3 : 1) * 7; this.kbV.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(kb);
    if (h.pull) { const P = this.B.player.pos, d = this.pos.distanceTo(P); if (d > 150) this.kbV.set(P.x - this.pos.x, 0, P.z - this.pos.z).normalize().multiplyScalar(260); }
    if (this.def.sa && !h.kd) return true;
    if (this.tele) { this.tele.d.kill(); this.tele = null; }
    if (h.kd && this.st !== 'down') { this.st = 'down'; this.stT = 0; this.a.face(a + Math.PI); this.a.play(this.def.kd, { from: 0, fade: 0.05, onEnd: () => { if (this.alive) { this.st = 'idle'; this.atkCd = rnd(0.3, 0.8); this.a.play(this.def.idle, { loop: true, fade: 0.2 }); } } }); }
    else if (this.st !== 'down') { this.st = 'hit'; this.stT = 0; this.a.play(this.def.hit, { from: 0, to: Math.min(0.45, this.a.clips[this.def.hit]?.duration || 0.45), fade: 0.03, onEnd: () => { if (this.alive && this.st === 'hit') { this.st = 'idle'; this.atkCd = Math.max(this.atkCd, rnd(0.2, 0.6)); this.a.play(this.def.idle, { loop: true, fade: 0.15 }); } } }); }
    return true;
  }
  stun() { if (this.tele) { this.tele.d.kill(); this.tele = null; } this.st = 'stun'; this.stag = 0; hudMsg('<b>그로기!</b>', 'gold', 1200); sfx('stun', { vol: 0.7 }); ring(this.pos, { col: 0xffe060, r1: 500 });
    this.a.play(this.def.stun && this.a.has(this.def.stun) ? this.def.stun : this.def.hit, { loop: true, fade: 0.1 }); setTimeout(() => { if (this.alive && this.st === 'stun') { this.st = 'idle'; this.a.play(this.def.idle, { loop: true, fade: 0.2 }); } }, 3500); }
  enrage() { this.enraged = true; hudMsg(`<b>${this.def.name}</b>이(가) 분노했다!`, 'red', 1600); if (this.a.has(this.def.provoke)) { if (this.tele) { this.tele.d.kill(); this.tele = null; } this.st = 'atk'; this.atkDef = { r: 0 }; this.a.play(this.def.provoke, { fade: 0.15, onEnd: () => this.endAttack() }); }
    sfx('roar', { vol: 0.8, rate: 0.8 }); shake(14, 0.6); this.a.mats.forEach(m => m.color.setRGB(1.25, 0.85, 0.8)); }
  die(a) {
    this.alive = false; this.st = 'dead'; this.stT = 0; if (this.tele) { this.tele.d.kill(); this.tele = null; } this.a.face(a + Math.PI); this.a.play(this.def.death, { from: 0, fade: 0.06 });
    this.kbV.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(this.boss ? 0 : 520); this.B.onKill(this);
  }
}

export class Battle {
  constructor(stage, ps, cb) { this.stage = stage; this.ps = ps; this.cb = cb; this.enemies = []; this.coins = []; this.t = 0; this.auto = !!cb.auto; this.stats = { kills: 0, hurt: 0, gold: 0, maxCombo: 0, perfect: 0 }; this.combo = 0; this.comboT = 0; }
  async start(progress) {
    const S = this.stage, ids = new Set(['warrior']); S.waves.flat().forEach(([id]) => ids.add(id)); let n = 0; const all = [...ids];
    await Promise.all([...all.map(id => load(id).then(() => progress && progress(++n / (all.length + 2)))), loadProp('coin')]);
    this.world = await buildWorld(S); progress && progress(1);
    const sc = E.scene; sc.clear(); this.scene = sc; RIM.col.value.set(this.world.th.rim || 0x9ac0ff); RIM.k.value = 0.28; setVignette(0.45); sc.add(this.world.group); sc.fog = this.world.fog; sc.background = this.world.sky; initFX(sc); clearFX();
    this.player = new Player(this, this.ps); sc.add(this.player.a.root); this.player.pos.set(0, 0, 200);
    this.zMax = 600; this.zMin = this.world.areaZ(0) - 650; this.wave = -1; this.waveClear = true; this.nextZ = this.world.areaZ(0) + 650; this.bossArena = false;
    this.cam = { p: new V3(0, 1300, 1300), l: new V3() }; this.camPunch = 0; this.updateCam(1);
    buildHud({ pause: () => this.cb.pause(this), auto: () => { this.auto = !this.auto; hudAuto(this.auto); this.cb.setAuto && this.cb.setAuto(this.auto); } }); hudAuto(this.auto);
    resetInput(); this.tick = (dt, raw) => this.update(dt, raw); E.updaters.add(this.tick);
    music(S.boss ? 'battle' : 'battle'); hudMsg(`<small>${S.chapterName || ''}</small><b>${S.name}</b>`, 'title', 2000);
    this.player.st = 'intro'; this.player.a.play('lobby', { from: 0.4, to: 1.6, fade: 0, onEnd: () => { this.player.st = 'idle'; this.player.a.play('idle', { loop: true, fade: 0.2 }); } });
    dust(this.player.pos, { n: 10, size: 100 }); this.ended = false; this.coinTmpl = (await loadProp('coin')).scene;
  }
  attackers() { return this.enemies.filter(e => e.alive && e.st === 'atk').length; }
  spawnWave(k) {
    const W = this.stage.waves[k], zc = this.world.areaZ(k), lv = this.stage.lv; this.wave = k; this.waveClear = false; hudGo(false);
    const list = []; for (const [id, n, el] of W) for (let i = 0; i < n; i++) list.push([id, el]);
    const boss = list.find(([id]) => MOBS[id].boss);
    if (boss) { this.bossArena = true; this.bossC = new V3(0, 0, this.world.bossZ); this.zMin = this.world.bossZ - 760; this.zMax = this.world.bossZ + 760; this.bossIntro(boss[0]); return; }
    this.zMin = zc - 650; this.zMax = zc + 650;
    list.forEach(([id, el], i) => { const a = (i / list.length) * Math.PI * 2 + Math.random() * 0.5, r = rnd(280, 480); const x = Math.max(-HALF + 60, Math.min(HALF - 60, Math.sin(a) * r)), z = zc - 120 + Math.cos(a) * r * 0.8;
      setTimeout(() => { if (this.ended) return; const e = new Enemy(this, id, x, z, lv, { elite: el }); this.enemies.push(e); this.scene.add(e.a.root); if (e.elite) hudMsg(`<b>정예</b> ${e.def.name}`, 'red', 1300); }, i * 140); });
    sfx('spawn', { vol: 0.5 }); if (k > 0) hudMsg(`<b>WAVE ${k + 1}</b>`, 'wave', 1100);
  }
  bossIntro(id) {
    const def = MOBS[id], c = this.bossC, P = this.player; this.introT = 3.4; P.st = 'intro'; P.a.play('idle', { loop: true, fade: 0.2 });
    const e = new Enemy(this, id, 0, c.z - 320, this.stage.lv, {}); e.maxHp = Math.round(e.maxHp * (this.stage.tower ? 0.8 : 1)); e.hp = e.maxHp; this.enemies.push(e); this.scene.add(e.a.root); this.boss = e;
    e.a.faceTo(P.pos, true); e.st = 'appear'; e.a.play(def.appear && e.a.has(def.appear) ? def.appear : def.idle, { fade: 0, onEnd: () => e.a.play(def.provoke, { fade: 0.15, onEnd: () => { e.st = 'idle'; e.a.play(def.idle, { loop: true, fade: 0.2 }); } }) });
    music('boss'); sfx('roar', { vol: 0.9, rate: id === 'spider' ? 1.2 : 0.85 }); shake(10, 1.2); document.body.classList.add('letterbox');
    hudMsg(`<small>BOSS</small><b>${def.name}</b><em>${def.en}</em>`, 'boss', 2800);
    setTimeout(() => { document.body.classList.remove('letterbox'); this.introT = 0; if (P.st === 'intro') { P.st = 'idle'; } }, 3300);
  }
  playerHit(h, lvm, kind) {
    const P = this.player, src = P.pos, ang = P.a.ang; let n = 0, heavy = false; const isSkill = kind !== 'atk';
    if (h.fx === 'quake') { const d = 120; for (let i = 0; i < 6; i++) { const p = new V3(src.x + Math.sin(ang) * d * i, 0, src.z + Math.cos(ang) * d * i); setTimeout(() => { dust(p, { n: 4, size: 130, speed: 300 }); FX.glow.add({ x: p.x, y: 30, z: p.z, life: 0.35, size: 220, size1: 60, col: 0xff8a3a, a: 0.9 }); }, i * 30); }
      ring(new V3(src.x + Math.sin(ang) * 200, 0, src.z + Math.cos(ang) * 200), { col: 0xffa050, r1: 360, life: 0.4 }); shake(18, 0.35); flashLight(src, 0xff8030, 8); sfx('quake', { vol: 0.8 }); }
    if (h.fx === 'nova') { ring(src, { col: 0xff6020, r1: 900, life: 0.55 }); ring(src, { col: 0xffd080, r1: 600, life: 0.35 }); dust(src, { n: 22, size: 160, speed: 700 }); shake(26, 0.6); flashLight(src, 0xff5010, 14); sfx('quake', { vol: 1 }); slowmo(0.25, 0.5); pulse(0.85); }
    for (const e of this.enemies) {
      if (!e.alive || e.st === 'appear') continue; const er = e.def.r * e.sc; if (!inHit(src, ang, e.pos, er, h)) continue;
      const crit = Math.random() < P.crit; let d = P.atk * h.m * lvm * rnd(0.92, 1.08) * (crit ? P.cdmg : 1); if (e.st === 'stun') d *= 1.5; d = Math.round(d);
      e.hurt(d, src, h); n++; this.stats.dealt = (this.stats.dealt || 0) + d;
      const hp = new V3(e.pos.x, 60 + 120 * e.sc * (e.def.boss ? 1.4 : 1), e.pos.z), ha = Math.random() * 3.14;
      burst(hp, { col: crit ? 0xff9a2a : 0xffc46a, n: crit ? 12 : 7, size: (h.heavy ? 200 : 140) * (crit ? 1.25 : 1) }); slashMark(hp, ha, { cross: crit || h.heavy, size: h.heavy ? 380 : 260 });
      dmgNum(hp, d, crit ? 'crit' : isSkill ? 'skill' : ''); if (h.heavy || crit) heavy = true;
    }
    if (n) { this.combo += n; this.comboT = 2.2; this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo); hudCombo(this.combo); P.rage = Math.min(100, P.rage + n * (isSkill ? 1.2 : 2.5));
      hitstop(h.heavy ? 0.1 : heavy ? 0.06 : 0.035); if (h.heavy) pulse(0.38); else if (heavy) pulse(0.15); shake(h.heavy ? 14 : heavy ? 7 : 4, h.heavy ? 0.28 : 0.12); sfx(h.heavy ? 'heavy' : 'hit', { vol: h.heavy ? 0.8 : 0.55, rate: rnd(0.9, 1.1) }); }
  }
  perfect() { pulse(0.7); this.perfectT = 1.2; this.stats.perfect++; slowmo(0.25, 0.9); hudMsg('<b>완벽한 회피!</b>', 'blue', 1000); this.player.rage = Math.min(100, this.player.rage + 15); sfx('perfect', { vol: 0.7 }); ring(this.player.pos, { col: 0x8ad0ff, r1: 380, life: 0.5 }); }
  onKill(e) {
    this.stats.kills++; const m = stageScale(this.stage.lv); const g = Math.round(e.def.gold * (0.8 + Math.random() * 0.4) * Math.sqrt(m)); this.dropCoins(e.pos, g, e.boss ? 24 : e.elite ? 8 : 3);
    sfx(e.boss ? 'bossdie' : 'die', { vol: 0.6 }); if (e.boss) { slowmo(0.2, 2.2); shake(22, 1); flashLight(e.pos, 0xffd080, 14); hudMsg('<b>격파!</b>', 'gold big', 1800); hudBoss(null); }
    burst(new V3(e.pos.x, 100, e.pos.z), { col: 0xffd06a, n: 10, size: 200 });
    if (this.enemies.every(x => !x.alive) && this.wave >= 0) this.clearWave();
  }
  dropCoins(p, total, n) {
    const each = Math.max(1, Math.round(total / n)); for (let i = 0; i < n; i++) { const c = this.coinTmpl.clone(); c.scale.setScalar(0.7); c.position.set(p.x, 80, p.z); this.scene.add(c);
      const a = Math.random() * 6.28, v = rnd(200, 420); this.coins.push({ m: c, v: new V3(Math.sin(a) * v, rnd(500, 800), Math.cos(a) * v), t: 0, g: each }); }
  }
  clearWave() {
    this.waveClear = true; const k = this.wave, last = k >= this.stage.waves.length - 1; this.combo = 0;
    if (last) { this.win(); return; }
    this.nextZ = this.world.areaZ(k + 1) + 650; this.zMin = this.world.areaZ(k + 1) - 650 + 400; hudGo(true); hudMsg('<b>CLEAR</b>', 'clear', 900); sfx('clear', { vol: 0.6 });
  }
  win() { if (this.ended) return; this.ended = true; this.player.st = 'intro'; this.player.trail.on = false; slowmo(0.3, 1.0); setTimeout(() => { hudMsg('<b>STAGE CLEAR</b>', 'gold big', 2200); sfx('win', { vol: 0.8 }); this.player.a.play('idle', { loop: true, fade: 0.2 }); }, 700);
    setTimeout(() => this.finish(true), 2600); }
  lose() { if (this.ended) return; this.cb.died(this); }
  finish(win) { this.ended = true; const t = this.t, S = this.stage, hpR = this.player.hp / this.player.maxHp; const stars = win ? 1 + (t <= S.time ? 1 : 0) + (hpR >= 0.5 ? 1 : 0) : 0;
    for (const c of this.coins) this.stats.gold += c.g; this.cb.end(this, { win, stars, time: t, hpR, ...this.stats }); }
  updateCam(k) {
    const P = this.player.pos, c = this.cam; const tgt = new V3(P.x * 0.6, 0, P.z); if (this.boss && this.boss.alive) { tgt.lerp(this.boss.pos, 0.22); }
    const pitch = 0.95, dist = 1850 - this.camPunch * 280; const want = new V3(tgt.x, Math.sin(pitch) * dist, tgt.z + Math.cos(pitch) * dist);
    c.p.lerp(want, k); c.l.lerp(new V3(tgt.x, 90, tgt.z - 140), k); E.camera.position.copy(c.p); E.camera.lookAt(c.l); this.camPunch *= 0.92;
  }
  update(dt, raw) {
    if (this.paused) return; this.t += dt; const P = this.player;
    if (!this.ended && this.wave < 0 && P.st !== 'intro') this.spawnWave(0);
    if (!this.ended && this.waveClear && this.wave >= 0 && this.wave < this.stage.waves.length - 1 && P.pos.z < this.nextZ - 200) this.spawnWave(this.wave + 1);
    P.update(dt); for (const e of this.enemies) e.update(dt);
    // 서로 밀어냄
    const all = [P, ...this.enemies.filter(e => e.alive)];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const A = all[i], B = all[j], ra = A === P ? PR : A.def.r * A.sc, rb = B === P ? PR : B.def.r * B.sc; const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z, d = Math.hypot(dx, dz), m = ra + rb;
      if (d < m && d > 0.01) { const push = (m - d) / d * 0.5; const wa = A === P ? 0.15 : B === P ? 0.85 : 0.5; A.pos.x -= dx * push * 2 * (1 - (A === P ? 0.85 : wa)); A.pos.z -= dz * push * 2 * (1 - (A === P ? 0.85 : wa)); B.pos.x += dx * push * 2 * (B === P ? 0.15 : wa); B.pos.z += dz * push * 2 * (B === P ? 0.15 : wa); } }
    for (const e of this.enemies) if (e.alive) { e.pos.x = Math.max(-HALF - 80, Math.min(HALF + 80, e.pos.x)); }
    P.clamp();
    this.enemies = this.enemies.filter(e => { if (e.remove) { e.a.dispose(); return false; } return true; });
    // 동전
    for (let i = this.coins.length - 1; i >= 0; i--) { const c = this.coins[i]; c.t += dt; c.m.rotation.y += dt * 8;
      if (c.t < 0.7) { c.v.y -= 2200 * dt; c.m.position.addScaledVector(c.v, dt); if (c.m.position.y < 20) { c.m.position.y = 20; c.v.y *= -0.4; c.v.x *= 0.6; c.v.z *= 0.6; } }
      else { const to = new V3(P.pos.x, 110, P.pos.z), d = c.m.position.distanceTo(to), sp = 900 + (c.t - 0.7) * 3000; c.m.position.lerp(to, Math.min(1, sp * dt / Math.max(1, d)));
        if (d < 60) { this.stats.gold += c.g; this.scene.remove(c.m); this.coins.splice(i, 1); sfx('coin', { vol: 0.25, rate: rnd(0.95, 1.15) }); FX.glow.add({ x: to.x, y: to.y, z: to.z, life: 0.2, size: 80, size1: 140, col: 0xffd060, a: 0.8 }); } } }
    // 콤보 · 화면
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; hudCombo(0); } }
    if (this.perfectT) this.perfectT = Math.max(0, this.perfectT - raw);
    this.updateCam(Math.min(1, raw * 6)); { const sn = this.world.sun; sn.target.position.set(P.pos.x, 0, P.pos.z - 200); sn.position.set(P.pos.x - 700, 1500, P.pos.z + 400); } ambient(this.world, P.pos, dt); updateFX(dt); updateNums(raw);
    hudPlayer(P); if (this.boss) hudBoss(this.boss.alive ? this.boss : null);
    const W = this.stage.waves.length, wv = Math.max(0, this.wave) + 1, tl = Math.max(0, this.t); hudInfo(this.stage.name, this.boss ? 'BOSS' : `웨이브 ${wv} / ${W}`, `${Math.floor(tl / 60)}:${String(Math.floor(tl % 60)).padStart(2, '0')}`, this.ps.lv, this.ps.cp);
    if (this.waveClear && !this.ended) hudGo(this.wave >= 0 && P.pos.z > this.nextZ - 400);
  }
  dispose() { E.updaters.delete(this.tick); for (const e of this.enemies) e.a.dispose(); this.enemies = []; for (const c of this.coins) this.scene.remove(c.m); this.player.a.dispose(); this.player.trail.mesh.removeFromParent();
    clearFX(); this.scene.clear(); hideHud(); document.body.classList.remove('letterbox'); }
}
