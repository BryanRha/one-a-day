// 전투(메인): 기사단 10명이 지역을 행군하며 자동 사냥 → 보스 게이지 → 보스(20번째는 사도)
//   아래: 영웅 줄(체력 · 스킬) · 퀘스트 · 장비 상자. 다른 메뉴는 이 장면 위에 덮어 열리고 전투는 계속 돈다.
import { W, H } from '../config.js?v=0.55.2';
import { T, R, C, TS, btn, sheet, rbox, chips, toast } from '../ui.js?v=0.55.2';
import { audio } from '../audio.js?v=0.55.2';
import { load, save } from '../save.js?v=0.55.2';
import { HEROES, ROLES, REGIONS, MOBS, STORY_JOIN, GRADES, SKILL_KIND } from '../data.js?v=0.55.2';
import { heroStats, mobHp, mobAtk, bossHp, bossAtk, goldPerMob, GAUGE_PER_MOB, BOSS_TIME, stageName, regionOf, stageNo, isHeraldStage, bgOf, openChest, equip, sell, better, itemPower, itemIcon, itemName, itemDesc, sellValue, quest, questAdd, questClaim, offlineReward, addHero, fmt, teamPower, goldMul } from '../state.js?v=0.55.2';
import { TOP, NAV_H } from '../hud.js?v=0.55.2';
import { loadRegion, SKILL_ICON } from './Boot.js?v=0.55.2';
import { EQ_GRADES, SLOTS, CHEST_UP } from '../data.js?v=0.55.2';
import { CUTS, heraldCut } from '../story.js?v=0.55.2';
import { Puppet } from '../puppet.js?v=0.55.2';
import { Skin, hasRig } from '../skin.js?v=0.55.2';

const FIELD_TOP = TOP;
export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  create() {
    const d = this.d = load(); this.t0 = 0; this.units = []; this.mobs = []; this.boss = null; this.walk = 0; this.cutAt = 0; this.paused = false; this.lastStage = 0;
    this.fieldH = Phaser.Math.Clamp(H - FIELD_TOP - 1020, 800, 1000); this.fieldB = FIELD_TOP + this.fieldH; this.ground = FIELD_TOP + this.fieldH * 0.86;   /* 앞줄 발 위치 · 뒷줄은 그보다 위 */
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B1028);
    // 배경 (두 장을 이어 붙여 왼쪽으로 흐름 · 두 번째는 좌우 반전)
    this.bgC = this.add.container(0, FIELD_TOP); this.makeBg();
    const vg = this.add.graphics(); vg.fillGradientStyle(0x0B1028, 0x0B1028, 0x0B1028, 0x0B1028, 0.55, 0.55, 0, 0).fillRect(0, FIELD_TOP, W, 140).fillGradientStyle(0x0B1028, 0x0B1028, 0x0B1028, 0x0B1028, 0, 0, 0.95, 0.95).fillRect(0, this.fieldB - 160, W, 160);
    this.night = this.add.rectangle(W / 2, FIELD_TOP + this.fieldH / 2, W, this.fieldH, 0x101A50, 0.28).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.layer = this.add.container(0, 0); this.fxL = this.add.container(0, 0).setDepth(20);
    // 위 줄: 스테이지 · 보스 게이지 · 보스 버튼
    this.stT = T(this, 40, FIELD_TOP + 44, '', 36, C.ink, { ox: 0, w: 900, shadow: true }); this.rgT = T(this, 40, FIELD_TOP + 86, '', 24, C.moon, { ox: 0, w: 800, shadow: true });
    this.gBg = this.add.graphics(); this.gFill = this.add.graphics(); this.gT = T(this, 0, 0, '', 22, '#FFFFFF', { w: 900, shadow: true });
    this.bossB = btn(this, W - 150, FIELD_TOP + 62, 230, 84, '보스 도전', () => this.callBoss(), { size: 30 }).setDepth(30);
    this.autoB = this.add.container(W - 150, FIELD_TOP + 136).setDepth(30); this.drawAuto();
    this.timerT = T(this, W / 2, FIELD_TOP + 150, '', 40, '#FFD6D6', { w: 900, shadow: true }).setDepth(30).setVisible(false);
    this.bossBar = this.add.container(W / 2, FIELD_TOP + 200).setDepth(30).setVisible(false);
    // 아래 패널
    this.makeParty(); this.makeQuest(); this.makeChest();
    this.cameras.main.fadeIn(300, 11, 16, 40);
    audio.music('bgm_field');
    this.setStage(d.stage, true);
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick(0.1) });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.d.seen = Date.now(); save(); this.refreshQuest(); } });
    window.__battle = this;
    // 돌아왔을 때: 방치 보상
    if (!d.cuts.prologue) this.time.delayedCall(200, () => this.playCut(CUTS.prologue, 'prologue'));
    const gap = (Date.now() - (d.idleAt || d.seen || Date.now())) / 1000; if (gap > 600 && d.cuts.prologue) this.time.delayedCall(500, () => this.offline(gap));
  }
  // 몸: 뼈대가 있으면 Spine 식 메시(Skin), 없으면 척추 휘기(Puppet)
  body(id, h, face, c, x, y) { if (hasRig(id)) { const sk = new Skin(this, id, h, { face }).setPos(x, y).setDepth(10 + y / 2000); return sk; } const p = new Puppet(this, `hero_${id}`, h, { face }); c.add(p.rope); return p; }
  killC(m) { m.c.destroy(); if (m.im.mesh) m.im.destroy(); }
  // ── 컷씬: 전투를 멈추고 위에 띄움 → 끝나면 이어서
  playCut(cut, key, done) { this.paused = true; this.scene.launch('Cutscene', { cut, done: () => { if (key) { this.d.cuts[key] = 1; save(); } this.paused = false; audio.music(this.boss ? 'bgm_boss' : 'bgm_field'); done && done(); } }); }
  update(time, delta) { const dt = Math.min(0.05, delta / 1000); for (const u of this.units) { if (u.im.mesh) u.im.setPos(u.c.x, u.c.y); u.im.update(dt); } for (const m of [...this.mobs, ...(this.boss ? [this.boss] : [])]) { if (m.im.mesh && m.c.scene) m.im.setPos(m.c.x, m.c.y); m.im.update(dt); } if (this.petP) { if (this.petP.mesh && this.petSp) this.petP.setPos(this.petSp.x, this.petSp.y); this.petP.update(dt); } }
  // ── 배경
  makeBg() { this.bgC.removeAll(true); const key = `bg_${bgOf(this.d.stage)}`; if (!this.textures.exists(key)) return;
    const src = this.textures.get(key).getSourceImage(), k = this.fieldH / src.height; this.bgW = src.width * k;
    for (let i = 0; i < 3; i++) { const im = this.add.image(i * this.bgW, 0, key).setOrigin(0).setScale(k); if (i % 2) im.setFlipX(true); this.bgC.add(im); } this.bgX = 0; }
  scrollBg(dx) { this.bgX -= dx; if (this.bgX <= -this.bgW * 2) this.bgX += this.bgW * 2; this.bgC.x = this.bgX; }
  // ── 스테이지 설정: 팀 배치 · 게이지 · 위 글자
  setStage(s, first) {
    const d = this.d; d.stage = s; save();
    const r = regionOf(s); if (!this.textures.exists(`bg_${bgOf(s)}`)) loadRegion(this, r, () => this.makeBg()); else if (first || this.curBg !== bgOf(s)) this.makeBg(); this.curBg = bgOf(s);
    this.stT.setText(`${REGIONS[r].n}  ${stageName(s)}`); this.rgT.setText(isHeraldStage(s) ? `사도 「${HEROES[REGIONS[r].herald].n}」 이 기다린다` : `여명석까지 ${20 - stageNo(s)}스테이지`);
    // 해방한 지역은 새벽빛 (밤 장막 걷힘)
    this.night.setAlpha(d.freed.includes(r) ? 0 : 1);
    this.clearField(); this.placeTeam(); this.drawGauge();
  }
  clearField() { this.mobs.forEach(m => this.killC(m)); this.mobs = []; if (this.boss) { this.killC(this.boss); this.boss = null; } this.bossBar.setVisible(false); this.timerT.setVisible(false); this.fighting = false; }
  // ── 팀 배치: 앞줄(탱커 · 근딜) / 뒷줄(원딜 · 마법 · 힐러 · 버퍼), 줄당 5명
  placeTeam() {
    this.units.forEach(u => { u.c.destroy(); if (u.im.mesh) u.im.destroy(); }); this.units = [];
    const team = this.d.team.filter(id => this.d.heroes[id]).slice(0, 10), front = [], back = [];
    team.forEach(id => (ROLES[HEROES[id].role].row === 0 ? front : back).push(id));
    while (front.length > 5) back.push(front.pop()); while (back.length > 5) front.push(back.pop());
    const put = (list, row) => list.forEach((id, i) => {
      const x = (row === 0 ? 740 : 660) - i * 124, y = this.ground - (row === 0 ? 0 : this.fieldH * 0.2) + (i % 2) * 26, st = heroStats(id), hh = this.fieldH * 0.27;
      const c = this.add.container(x, y), sh = this.add.ellipse(0, 0, 96, 22, 0x000000, 0.45), sz = row === 0 ? hh : hh * 0.86; c.add(sh); const im = this.body(id, sz, 1, c, x, y); c.setDepth(10 + y / 100); this.layer.add(c);
      const u = { id, c, im, x, y, hp: st.hp, max: st.hp, st, cd: Math.random() * st.rate, skill: 6 + Math.random() * 5, skillMax: 9 + (HEROES[id].g >= 3 ? 1 : 2) + Math.random() * 3, dead: false, shield: 0, buff: 0, taunt: 0 };
      this.units.push(u);
    });
    put(front, 0); put(back, 1);
    // 데리고 다니는 펫: 기사단 맨 뒤에서 따라다님
    const pet = this.d.pet && (this.d.pets || {})[this.d.pet] ? this.d.pet : null; this.petSp?.destroy(); this.petSp = null;
    if (pet) { const y = this.ground - this.fieldH * 0.06, c = this.add.container(70, y), sh = this.add.ellipse(0, 0, 70, 16, 0x000000, 0.4); c.add(sh); c.setDepth(10 + y / 100); this.layer.add(c); this.petP?.mesh && this.petP.destroy(); const im = this.body(pet, this.fieldH * 0.13, 1, c, 70, y); this.petSp = c; this.petP = im; if (!im.mesh) this.tweens.add({ targets: im.rope, y: -18, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    this.layer.sort('depth'); this.drawParty();
  }
  // ── 웨이브: 적 3~5마리가 오른쪽에서 걸어 들어옴
  spawnWave() {
    const s = this.d.stage, r = REGIONS[regionOf(s)], n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const id = r.mobs[Math.floor(Math.random() * r.mobs.length)]; this.spawnMob(id, W + 120 + i * 120, this.ground - (i % 3) * this.fieldH * 0.1 + Math.random() * 10, mobHp(s), mobAtk(s), (MOBS[id] || { s: 1 }).s * this.fieldH * 0.23); }
  }
  spawnMob(id, x, y, hp, atk, h, boss) {
    const c = this.add.container(x, y), sh = this.add.ellipse(0, 0, h * 0.5, 22, 0x000000, 0.45); c.add(sh); const im = this.body(id, h, -1, c, x, y);
    const bar = this.add.graphics().setDepth(30); if (im.mesh) { bar.setPosition(x, y); this.barL = this.barL || []; } c.add(bar); im.walking = true; c.setDepth(10 + y / 100); this.layer.add(c); this.layer.sort('depth');
    const fx = Math.max(...this.units.map(u => u.x), 300), m = { id, c, im, bar, x, y, hp, max: hp, atk, h, cd: 1 + Math.random(), boss: !!boss, stopX: Math.min(W - 60, fx + (boss ? 200 : 130 + this.mobs.length * 50 + Math.random() * 30)) };
    if (!boss) this.mobs.push(m); this.drawBar(m); return m;
  }
  drawBar(m) { if (m.boss) return; m.bar.clear().fillStyle(0x000000, 0.6).fillRoundedRect(-50, -m.h - 22, 100, 12, 6).fillStyle(0xE85050, 1).fillRoundedRect(-50, -m.h - 22, Math.max(6, 100 * m.hp / m.max), 12, 6); }
  // ── 매 0.1초: 이동 · 공격 · 스킬
  tick(dt) {
    if (this.paused) return; const d = this.d, alive = this.units.filter(u => !u.dead), foes = this.boss ? [this.boss] : this.mobs;
    if (!alive.length) return this.retreat();
    // 적이 없으면 행군 (배경 흐름 + 걸음 흔들림) 후 다음 웨이브
    if (!foes.length) { this.walk += dt; this.scrollBg(260 * dt); this.units.forEach(u => { u.im.walking = !u.dead; });
      if (this.walk > 1.2) { this.walk = 0; if (d.gauge >= 100 && d.autoBoss) this.callBoss(); else this.spawnWave(); } return; }
    this.units.forEach(u => { u.im.walking = false; });
    // 적 이동
    for (const m of foes) { if (m.x > m.stopX) { m.x -= (m.boss ? 160 : 230) * dt; m.c.x = m.x; m.im.walking = true; } else m.im.walking = false; }
    const front = Math.max(...alive.map(u => u.x));
    // 영웅 공격
    for (const u of alive) {
      u.cd -= dt; u.skill -= dt; if (u.buff > 0) u.buff -= dt; if (u.taunt > 0) u.taunt -= dt;
      const tgt = foes.filter(m => m.hp > 0 && m.x - u.x <= u.st.range + 40 && m.x <= W + 20).sort((a, b) => a.x - b.x)[0];
      if (u.skill <= 0 && (tgt || HEROES[u.id].skill.kind === 'heal' && alive.some(a => a.hp < a.max * 0.8))) { this.cast(u, foes, alive); u.skill = u.skillMax; continue; }
      if (!tgt || u.cd > 0) continue; u.cd = u.st.rate;
      const crit = Math.random() < u.st.crit, dmg = u.st.atk * (crit ? 2 : 1) * (u.buff > 0 ? 1.3 : 1) * (0.9 + Math.random() * 0.2);
      if (ROLES[HEROES[u.id].role].range > 300) { u.im.act(HEROES[u.id].role === 'ranged' ? 'shoot' : 'cast'); this.shoot(u, tgt, dmg, crit); } else { this.lunge(u, tgt); this.time.delayedCall(150, () => this.hit(tgt, dmg, crit)); }
    }
    // 적 공격: 도발한 영웅 → 가장 앞 영웅
    for (const m of foes) { if (m.x > m.stopX + 10) continue; m.cd -= dt; if (m.cd > 0) continue; m.cd = m.boss ? 1.1 : 1.4;
      const t = alive.find(u => u.taunt > 0) || alive.reduce((a, b) => (b.x > a.x ? b : a));
      m.im.act('attack'); this.time.delayedCall(170, () => { if (!t.dead) this.slash(t.x, t.y - t.im.height * 0.5, -1, 0xFF8A8A); this.hurt(t, m.atk * (0.85 + Math.random() * 0.3)); }); }
    if (this.boss) { this.bossT -= dt; this.timerT.setText(`${Math.max(0, Math.ceil(this.bossT))}초`); if (this.bossT <= 0) this.bossFail(); }
    this.drawParty();
  }
  lunge(u, tgt) { u.im.act('attack'); this.time.delayedCall(150, () => { u.im.ghost(u.c); if (tgt && tgt.hp > 0) this.slash(tgt.x, tgt.y - tgt.h * 0.55, 1); }); audio.play('sfx_hit', { volume: 0.25, gap: 70 }); }
  // 검기: 초승달 모양 빛이 휙 지나감
  slash(x, y, dir, col = 0xFFF2C0) { const s = this.add.image(x, y, 'slash').setTint(col).setBlendMode('ADD').setDepth(22).setScale(0.6 * dir, 0.6).setAngle(-25 * dir).setAlpha(0.95); this.fxL.add(s); this.tweens.add({ targets: s, angle: 35 * dir, scaleX: 1.1 * dir, scaleY: 1.1, alpha: 0, duration: 220, ease: 'Cubic.easeOut', onComplete: () => s.destroy() }); }
  shoot(u, tgt, dmg, crit) {
    const col = { ranged: 0xFFE6A0, magic: 0xB9A0FF, healer: 0x9FFFD0, buffer: 0xFFC0E0 }[HEROES[u.id].role] || 0xFFFFFF, p = this.add.image(u.x + 30, u.y - 110, 'glow').setTint(col).setScale(0.32).setBlendMode('ADD').setDepth(19);
    this.fxL.add(p); audio.play('sfx_shot', { volume: 0.18, gap: 90 });
    this.tweens.add({ targets: p, x: tgt.x, y: tgt.y - tgt.h * 0.5, duration: 200, onComplete: () => { p.destroy(); if (tgt.hp > 0) this.hit(tgt, dmg, crit); } });
  }
  hit(m, dmg, crit) {
    if (m.hp <= 0) return; m.hp -= dmg; this.dmgText(m.x + (Math.random() - 0.5) * 50, m.y - m.h * 0.8, dmg, crit);
    if (crit) { audio.play('sfx_crit', { volume: 0.3, gap: 120 }); m.im.freeze && m.im.freeze(0.08); this.cameras.main.shake(70, 0.0025); }
    m.im.flash(); if (crit) m.im.hurt(); this.drawBar(m);
    if (m.boss) this.drawBossBar();
    if (m.hp <= 0) this.kill(m);
  }
  dmgText(x, y, v, crit) { const t = T(this, x, y, fmt(v), crit ? 46 : 32, crit ? '#FFB45E' : '#FFF1C2', { w: 900, shadow: true }).setDepth(40); if (crit) t.setFontStyle('italic 900');
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() }); }
  kill(m) {
    const d = this.d; audio.play('sfx_die', { volume: 0.25, gap: 80 });
    m.im.die(); this.tweens.add({ targets: m.c, alpha: 0, x: m.x + 50, duration: 420, delay: 120, onComplete: () => this.killC(m) });
    if (m.boss) return this.bossWin();
    this.mobs = this.mobs.filter(x => x !== m); d.stats.kills++; questAdd('kill', 1);
    const g = Math.round(goldPerMob(d.stage) * goldMul()); d.gold += g; this.coin(m.x, m.y - m.h * 0.5, g);
    if (d.gauge < 100) { d.gauge = Math.min(100, d.gauge + GAUGE_PER_MOB); this.drawGauge(); }
    if (!this.mobs.length && Math.random() < 0.35) { d.keys++; this.flyIcon(m.x, m.y - 80, 'i_key', 'keyAt'); }
    if (!this.mobs.length) this.units.forEach(u => { if (u.dead) this.revive(u); });
  }
  coin(x, y, g) { for (let k = 0; k < 3; k++) { const c = this.add.image(x, y, 'i_gold').setDisplaySize(40, 40).setDepth(41); const a = Math.random() * Math.PI * 2;
    this.tweens.chain({ targets: c, tweens: [{ x: x + Math.cos(a) * 50, y: y + Math.sin(a) * 30, duration: 180 }, { x: 488, y: 78, scale: 0.4, duration: 520 + k * 60, ease: 'Cubic.easeIn', onComplete: () => c.destroy() }] }); }
    audio.play('sfx_coin', { volume: 0.12, gap: 160 }); }
  flyIcon(x, y, key, to) { const c = this.add.image(x, y, key).setDisplaySize(60, 60).setDepth(41), at = { keyAt: [900, 78], gemAt: [694, 78] }[to]; this.tweens.add({ targets: c, x: at[0], y: at[1], duration: 700, ease: 'Cubic.easeIn', onComplete: () => c.destroy() }); }
  hurt(u, dmg) {
    if (u.dead) return; if (u.shield > 0) { const a = Math.min(u.shield, dmg); u.shield -= a; dmg -= a; } if (u.taunt > 0) dmg *= 0.5;
    u.hp -= dmg; u.im.hurt();
    if (u.hp <= 0) { u.dead = true; u.hp = 0; u.im.die(); }
  }
  revive(u) { u.dead = false; u.hp = u.max * 0.6; u.im.revive(); }
  // ── 스킬: 종류별 효과 + 이펙트 · 레전드 이상은 컷인
  cast(u, foes, alive) {
    const H0 = HEROES[u.id], k = H0.skill.kind, a = u.st.atk; audio.play(k === 'heal' ? 'sfx_heal' : 'sfx_skill', { volume: 0.35, gap: 300 });
    u.im.act('cast');
    const ring = this.add.image(u.x, u.y - 90, 'ring').setTint(GRADES[H0.g].col).setBlendMode('ADD').setScale(0.4).setDepth(19); this.fxL.add(ring); this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    const live = foes.filter(m => m.hp > 0);
    if (k === 'strike' && live[0]) { const t = live.sort((p, q) => p.x - q.x)[0]; this.burst(t, 'fx_carson_skill_01', 2); this.hit(t, a * 5.5, true); }
    else if (k === 'aoe') live.forEach(t => { this.burst(t, 'fx_carson_skill_01', 1); this.hit(t, a * 2.4, false); });
    else if (k === 'line') { const ln = this.add.rectangle(u.x + 400, u.y - 100, 900, 26, 0xFFF2B0, 0.9).setBlendMode('ADD').setDepth(19); this.fxL.add(ln); this.tweens.add({ targets: ln, scaleY: 0.1, alpha: 0, duration: 380, onComplete: () => ln.destroy() }); live.forEach(t => this.hit(t, a * 3.2, Math.random() < 0.4)); }
    else if (k === 'heal') alive.forEach(t => { t.hp = Math.min(t.max, t.hp + u.st.atk * 3.5 + t.max * 0.12); this.sparkle(t, 0x9FFFD0); });
    else if (k === 'shield') alive.forEach(t => { t.shield = t.max * 0.25; this.sparkle(t, 0x9FD0FF); });
    else if (k === 'buff') alive.forEach(t => { t.buff = 8; this.sparkle(t, 0xFFC0E0); });
    else if (k === 'taunt') { u.taunt = 6; u.shield = u.max * 0.3; this.sparkle(u, 0xFFE27A); }
    if (H0.g >= 3 && this.time.now - this.cutAt > 7000 && !this.paused) { this.cutAt = this.time.now; this.cutIn(u.id); }
  }
  burst(t, key, frame) { const b = this.add.image(t.x, t.y - t.h * 0.5, key, frame).setBlendMode('ADD').setScale(0.7).setDepth(21); this.fxL.add(b); this.tweens.add({ targets: b, scale: 1.2, alpha: 0, duration: 420, onComplete: () => b.destroy() }); }
  sparkle(u, col) { for (let i = 0; i < 4; i++) { const s = this.add.image(u.x + (Math.random() - 0.5) * 60, u.y - 40 - Math.random() * 120, 'spark').setTint(col).setScale(0.3).setDepth(21).setBlendMode('ADD'); this.fxL.add(s); this.tweens.add({ targets: s, y: s.y - 50, alpha: 0, duration: 600, onComplete: () => s.destroy() }); } }
  // 스킬 컷인: 원화가 비스듬한 띠와 함께 지나감
  cutIn(id) {
    const y = FIELD_TOP + 230, c = this.add.container(0, y).setDepth(60), band = this.add.graphics(); band.fillStyle(0xC8324F, 0.92).fillRect(-100, -60, W + 200, 120).fillStyle(0xF2C46B, 1).fillRect(-100, 56, W + 200, 6); band.setAngle(-4);
    const im = this.add.image(170, 40, `hero_${id}`).setOrigin(0.5, 0.25); im.setScale(520 / im.height); const msk = this.make.graphics().fillRect(0, y - 64, W, 128); im.setMask(msk.createGeometryMask());
    const t1 = T(this, 330, -12, `${HEROES[id].skill.n}!`, 52, '#FFFFFF', { ox: 0, w: 900, shadow: true }).setFontStyle('italic 900'), t2 = T(this, 334, 34, HEROES[id].n, 26, '#FFE3EC', { ox: 0, w: 800 });
    c.add([band, im, t1, t2]); c.x = -W; this.tweens.add({ targets: c, x: 0, duration: 220, ease: 'Cubic.easeOut', hold: 650, yoyo: true, onComplete: () => { c.destroy(); msk.destroy(); } });
  }
  // ── 보스
  drawGauge() { const x = 40, y = FIELD_TOP + 124, w = 420, v = this.d.gauge; this.gBg.clear().fillStyle(0x000000, 0.55).fillRoundedRect(x, y, w, 26, 13).lineStyle(2, 0xF2C46B, 0.6).strokeRoundedRect(x, y, w, 26, 13);
    this.gFill.clear().fillStyle(v >= 100 ? 0xFF6B6B : 0xF2C46B, 1).fillRoundedRect(x + 3, y + 3, Math.max(20, (w - 6) * v / 100), 20, 10); this.gT.setPosition(x + w / 2, y + 13).setText(v >= 100 ? '보스 소환 가능!' : `보스 게이지 ${v}%`);
    this.bossB.setAlpha(v >= 100 && !this.boss ? 1 : 0.45); }
  drawAuto() { this.autoB.removeAll(true); const on = this.d.autoBoss, g = this.add.graphics(); g.fillStyle(0x000000, 0.5).fillRoundedRect(-115, -24, 230, 48, 24); this.autoB.add([g, T(this, 0, 0, `자동 보스 ${on ? 'ON' : 'OFF'}`, 24, on ? C.green : C.dim, { w: 900 })]);
    this.autoB.setSize(230, 48).setInteractive({ useHandCursor: true }).off('pointerup').on('pointerup', () => { this.d.autoBoss = !this.d.autoBoss; save(); this.drawAuto(); audio.play('sfx_tap'); }); }
  callBoss() {
    const d = this.d; if (this.boss) return; if (d.gauge < 100) return toast(this, '몬스터를 더 물리쳐 보스 게이지를 채워요', FIELD_TOP + 300);
    const s0 = d.stage, rr = regionOf(s0); if (isHeraldStage(s0) && !d.cuts[`h${rr}`] && !this.introing) { this.introing = true; return this.playCut(heraldCut(rr, 'intro'), `h${rr}`, () => { this.introing = false; this.callBoss(); }); }
    this.mobs.forEach(m => this.killC(m)); this.mobs = []; const s = d.stage, herald = isHeraldStage(s), r = REGIONS[regionOf(s)];
    const id = herald ? r.herald : r.mobs[0]; audio.play('sfx_boss', { volume: 0.6 }); audio.music('bgm_boss'); this.cameras.main.shake(300, 0.006);
    this.boss = this.spawnMob(id, W + 200, this.ground + 10, bossHp(s), bossAtk(s), this.fieldH * (herald ? 0.5 : 0.4), true); this.boss.c.setDepth(18);
    this.bossT = BOSS_TIME; this.timerT.setVisible(true); this.drawBossBar(); this.bossBar.setVisible(true); this.drawGauge();
    const name = herald ? `사도 ${HEROES[id].n}` : `${(MOBS[id] || {}).n || '보스'} 우두머리`, bt = T(this, W / 2, FIELD_TOP + 330, name, 64, '#FF8A8A', { w: 900, shadow: true }).setDepth(61).setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: bt, scale: 1, alpha: 1, duration: 260, hold: 900, yoyo: true, onComplete: () => bt.destroy() });
  }
  drawBossBar() { const b = this.boss; if (!b) return; this.bossBar.removeAll(true); const g = this.add.graphics(), w = 760; g.fillStyle(0x000000, 0.65).fillRoundedRect(-w / 2, -18, w, 36, 18).fillStyle(0xE04848, 1).fillRoundedRect(-w / 2 + 4, -14, Math.max(20, (w - 8) * b.hp / b.max), 28, 14).lineStyle(3, 0xF2C46B, 0.9).strokeRoundedRect(-w / 2, -18, w, 36, 18);
    this.bossBar.add([g, T(this, 0, 0, `${fmt(Math.max(0, b.hp))} / ${fmt(b.max)}`, 22, '#FFFFFF', { w: 900, shadow: true })]); }
  bossWin() {
    const d = this.d, s = d.stage, herald = isHeraldStage(s), r = regionOf(s); this.boss = null; this.bossBar.setVisible(false); this.timerT.setVisible(false);
    audio.play('sfx_win', { volume: 0.6 }); audio.music('bgm_field'); d.stats.bosses++; questAdd('boss', 1); d.gauge = 0;
    const first = s === d.maxStage; let rw = { gold: goldPerMob(s) * (herald ? 60 : 20), keys: herald ? 12 : 4, gems: first ? (herald ? 150 : 20) : 0 };
    d.gold += rw.gold; d.keys += rw.keys; d.gems += rw.gems;
    if (first) { d.maxStage = s + 1; questAdd('stage', 1); }
    if (herald && !d.freed.includes(r)) { d.freed.push(r); addHero(REGIONS[r].herald); }
    save(); const join = first ? STORY_JOIN[s] : null; if (join) addHero(join);
    const show = () => this.result(true, rw, herald && first ? REGIONS[r].herald : join);
    if (herald && first) this.time.delayedCall(600, () => this.playCut(heraldCut(r, 'free'), `f${r}`, () => { this.night.setAlpha(0); show(); })); else this.time.delayedCall(700, show);
  }
  bossFail() { const b = this.boss; if (b) this.killC(b); this.boss = null; this.bossBar.setVisible(false); this.timerT.setVisible(false); this.d.gauge = 60; save(); this.drawGauge(); audio.play('sfx_lose', { volume: 0.5 }); audio.music('bgm_field'); this.d.autoBoss = false; this.drawAuto(); this.result(false); }
  retreat() { if (this.boss) return this.bossFail(); this.mobs.forEach(m => this.killC(m)); this.mobs = []; this.d.gauge = Math.max(0, this.d.gauge - 30); this.drawGauge(); this.units.forEach(u => this.revive(u)); this.units.forEach(u => { u.hp = u.max; }); toast(this, '기사단이 물러났어요 · 영웅을 키워 다시 도전해요', FIELD_TOP + 300); }
  // 결과 창: 승리(보상 · 합류 영웅) / 실패(무엇을 올리면 되는지)
  result(win, rw, joined) {
    this.paused = true; const p = sheet(this, { size: 'M', title: win ? '보스 처치!' : '아쉽게 실패', closable: true, onClose: () => { this.paused = false; this.afterResult(win); } });
    if (win) { p.content.add(chips(this, 0, 0, rw, { size: 88, gap: 190, font: 28 }));
      if (joined) { const H0 = HEROES[joined], im = this.add.image(0, 330, `hero_${joined}`).setOrigin(0.5, 1); im.setScale(300 / im.height); p.content.add([im, T(this, 0, 370, `${H0.n} 합류!`, TS.h2, GRADES[H0.g].css, { w: 900 }), T(this, 0, 416, H0.herald ? '여명석이 빛나자 사도가 본래 모습으로 돌아왔어요' : H0.t, TS.cap, C.dim, { w: 800 })]); } }
    else { p.content.add(T(this, 0, 0, '조금만 더 강해지면 이길 수 있어요', TS.body, C.ink, { w: 900 })); p.content.add(T(this, 0, 60, '영웅 레벨업 · 장비 상자 · 소환으로 전투력을 올려요', TS.cap, C.dim, { w: 800 })); }
    p.foot([{ t: win ? '계속 원정' : '확인', fn: () => p.close() }]);
  }
  afterResult(win) { const d = this.d; if (win) this.setStage(Math.min(d.maxStage, d.stage + 1)); else this.setStage(d.stage); }
  // ── 아래: 영웅 줄 (10칸 · 체력 · 스킬 게이지)
  makeParty() { this.partyY = this.fieldB + 10; this.partyC = this.add.container(0, this.partyY); this.partyG = this.add.graphics(); this.partyC.add(this.partyG); this.partyFaces = []; }
  drawParty() {
    const g = this.partyG.clear(), us = this.units, cw = 100, x0 = (W - cw * 10 - 4 * 9) / 2;
    if (this.partyFaces.length !== us.length || this.partyFaces.some((f, i) => f.id !== us[i].id)) { this.partyFaces.forEach(f => f.destroy()); this.partyFaces = us.map((u, i) => { const f = this.add.image(x0 + i * (cw + 4) + cw / 2, 50, `face_${u.id}`).setDisplaySize(cw - 8, cw - 8); f.id = u.id; this.partyC.add(f); return f; }); }
    us.forEach((u, i) => { const x = x0 + i * (cw + 4), gr = GRADES[HEROES[u.id].g].col; g.lineStyle(4, u.skill <= 0.5 ? 0xF2C46B : gr, 1).strokeRoundedRect(x, 0, cw, cw, 12);
      g.fillStyle(0x000000, 0.6).fillRect(x, cw + 6, cw, 10).fillStyle(u.dead ? 0x555555 : 0x6BE39B, 1).fillRect(x, cw + 6, cw * Math.max(0, u.hp / u.max), 10);
      g.fillStyle(0x000000, 0.6).fillRect(x, cw + 20, cw, 8).fillStyle(0x7FA8FF, 1).fillRect(x, cw + 20, cw * Math.max(0, 1 - u.skill / u.skillMax), 8);
      if (this.partyFaces[i]) this.partyFaces[i].setAlpha(u.dead ? 0.35 : 1); });
  }
  // ── 퀘스트 줄
  makeQuest() { const y = this.partyY + 150; this.qC = this.add.container(30, y); this.refreshQuest(); this.makeIdle(y + 116); }
  // 원정 보상 막대: 접속 중에도 시간에 따라 쌓이고 언제든 받기 (최대 12시간)
  makeIdle(y) { this.idleY = y; this.idleC = this.add.container(30, y); this.drawIdle(); this.time.addEvent({ delay: 1000, loop: true, callback: () => this.drawIdle() }); }
  drawIdle() {
    const d = this.d; if (!d.idleAt) { d.idleAt = Date.now(); save(); } const r = offlineReward((Date.now() - d.idleAt) / 1000), h = Math.floor(r.sec / 3600), m = Math.floor(r.sec % 3600 / 60), full = r.sec >= 12 * 3600 - 1;
    this.idleC.removeAll(true); this.idleC.add(rbox(this, 0, 0, W - 60, 96, { fill: '#2A2414', line: full ? '#FF8A5E' : '#C98A2E', lw: 3, r: 22, ox: 0, oy: 0 }));
    const ic = this.add.image(58, 48, 'shop41').setDisplaySize(84, 84); this.idleC.add(ic);
    this.idleC.add(T(this, 112, 30, full ? '원정 보상이 가득 찼어요!' : '원정 보상 쌓이는 중', 24, full ? '#FFB089' : C.gold, { ox: 0, w: 900 }));
    this.idleC.add(R(this, 112, 66, `${h}시간 ${m}분 · ●${fmt(r.gold)} · ¤${r.keys}`, 26, C.ink, { ox: 0, w: 800 }));
    this.idleC.add(btn(this, W - 160, 48, 170, 72, '받기', () => this.claimIdle(), { style: r.gold > 0 ? 'gold' : 'dark', size: 28 })); }
  claimIdle() { const d = this.d, r = offlineReward((Date.now() - (d.idleAt || Date.now())) / 1000); if (r.gold <= 0 && r.keys <= 0) return toast(this, '조금 더 기다리면 보상이 쌓여요', this.idleY - 60);
    d.gold += r.gold; d.keys += r.keys; d.idleAt = Date.now(); save(); audio.play('sfx_coin', { volume: 0.6 }); this.coin(170, this.idleY + 48, r.gold); this.drawIdle(); this.drawChest(); }
  refreshQuest() {
    if (!this.qC) return; const q = quest(), ok = q.have >= q.need; this.qC.removeAll(true);
    this.qC.add(rbox(this, 0, 0, W - 60, 96, { fill: ok ? '#3A3216' : '#141B3A', line: ok ? '#F2C46B' : '#3A4A86', lw: ok ? 4 : 2, r: 22, ox: 0, oy: 0 }));
    this.qC.add(T(this, 28, 30, `퀘스트 ${this.d.quest.i + 1}`, 22, C.gold, { ox: 0, w: 900 })); this.qC.add(T(this, 28, 66, `${q.n} ${Math.min(q.have, q.need)} / ${q.need}`, 30, C.ink, { ox: 0, w: 900 }));
    this.qC.add(chips(this, 640, 34, q.reward, { size: 40, bg: false, gap: 90, font: 22 }));
    const b = btn(this, W - 160, 48, 170, 72, ok ? '받기' : '진행 중', () => { const r = questClaim(); if (!r) return; audio.play('sfx_coin', { volume: 0.5 }); toast(this, `◆${r.gems} · ¤${r.keys} 받았어요!`, this.partyY + 100); this.refreshQuest(); }, { style: ok ? 'gold' : 'dark', size: 26 });
    this.qC.add(b); if (ok) this.tweens.add({ targets: b, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
  }
  // ── 장비 상자 (가운데 큰 버튼)
  makeChest() {
    const y = Math.round((this.partyY + 370 + H - 176) / 2) + 10; this.chestY = y; this.chestC = this.add.container(W / 2, y);
    const glow = this.add.image(0, 0, 'glow').setTint(0xF2C46B).setScale(3.2).setAlpha(0.45).setBlendMode('ADD'), im = this.add.image(0, -10, 'shop380'); im.setDisplaySize(230, 230);
    const ki = this.add.image(-34, 140, 'i_key').setDisplaySize(44, 44); this.keyT = T(this, -8, 140, '', 32, C.gold, { ox: 0, w: 900 }); this.chestC.add([glow, im, T(this, 0, 96, '장비 상자', 36, C.ink, { w: 900, shadow: true }), ki, this.keyT]);
    this.chestC.setSize(260, 280).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openChest());
    this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1 });
    // 왼쪽: 상자 레벨 · 오른쪽: 자동 열기
    const lvB = this.add.container(170, y), ag = this.add.graphics(); ag.fillStyle(0x000000, 0.45).fillRoundedRect(-80, -80, 160, 160, 30).lineStyle(2, 0x3A4A86, 1).strokeRoundedRect(-80, -80, 160, 160, 30); this.lvT = T(this, 0, -16, '', 40, C.gold, { w: 900 });
    lvB.add([ag, this.lvT, T(this, 0, 40, '상자 등급', 24, C.dim, { w: 800 })]); lvB.setSize(160, 160).setInteractive({ useHandCursor: true }).on('pointerup', () => this.chestLvUp());
    const auB = this.add.container(W - 170, y), bg2 = this.add.graphics(); bg2.fillStyle(0x000000, 0.45).fillRoundedRect(-80, -80, 160, 160, 30).lineStyle(2, 0x3A4A86, 1).strokeRoundedRect(-80, -80, 160, 160, 30); this.autoChestT = T(this, 0, 40, '', 24, C.dim, { w: 800 });
    const ri = this.add.image(0, -18, 'shop114'); ri.setDisplaySize(84, 84); auB.add([bg2, ri, this.autoChestT]); auB.setSize(160, 160).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.d.autoChest = !this.d.autoChest; save(); this.drawChest(); audio.play('sfx_tap'); if (this.d.autoChest) this.openChest(); });
    this.drawChest(); this.time.addEvent({ delay: 600, loop: true, callback: () => this.drawChest() });
  }
  drawChest() { this.keyT.setText(`× ${this.d.keys}`); this.lvT.setText(`Lv.${this.d.chestLv}`); this.autoChestT.setText(this.d.autoChest ? '자동 열기 ON' : '자동 열기').setColor(this.d.autoChest ? C.green : C.dim); }
  chestLvUp() {
    const d = this.d, cost = CHEST_UP(d.chestLv); if (d.chestLv >= 10) return toast(this, '상자 등급이 최고예요');
    const p = sheet(this, { size: 'S', title: '상자 등급 올리기', sub: `Lv.${d.chestLv} → Lv.${d.chestLv + 1} · 좋은 장비가 더 자주 나와요` });
    p.content.add(R(this, 0, 0, `●${fmt(cost)}`, 44, C.gold, { w: 900 }));
    p.foot([{ t: '올리기', fn: () => { if (d.gold < cost) return toast(this, '골드가 부족해요'); d.gold -= cost; d.chestLv++; save(); audio.play('sfx_levelup', { volume: 0.5 }); p.close(); this.drawChest(); } }, { t: '닫기', style: 'dark' }]);
  }
  openChest() {
    if (this.chestOpen) return; const it = openChest(); if (!it) { this.d.autoChest = false; this.drawChest(); return toast(this, '열쇠가 없어요 · 몬스터를 잡으면 모여요', this.partyY + 300); }
    this.drawChest(); audio.play(it.g >= 4 ? 'sfx_epic' : 'sfx_chest', { volume: 0.45 });
    const cur = this.d.gear[it.slot], up = itemPower(it) > itemPower(cur);
    // 자동 열기: 더 좋으면 바로 장착, 아니면 분해
    if (this.d.autoChest && (!cur || !up || it.g < 3)) { if (up) equip(it); else sell(it); this.flyItem(it, up); this.time.delayedCall(450, () => this.d.autoChest && this.openChest()); return; }
    this.chestOpen = true;
    const p = sheet(this, { size: 'L', title: up ? '더 강해요!' : '장비 상자', onClose: () => { this.chestOpen = false; if (this.d.autoChest) this.time.delayedCall(300, () => this.openChest()); } });
    const card = (x, item, label, hl) => { p.content.add(rbox(this, x, 150, 420, 400, { fill: hl ? '#2A2350' : '#161D40', line: item ? EQ_GRADES[item.g].css : '#3A4A86', lw: hl ? 5 : 3, r: 26 }));
      p.content.add(T(this, x, -20, label, 26, hl ? C.gold : C.dim, { w: 900 }));
      if (!item) return p.content.add(T(this, x, 150, '비어 있음', 30, C.dim, { w: 800 }));
      const ic = this.add.image(x, 90, itemIcon(item)); ic.setDisplaySize(170, 170); p.content.add(ic);
      p.content.add(T(this, x, 200, itemName(item), 28, EQ_GRADES[item.g].css, { w: 900 })); p.content.add(T(this, x, 240, `${EQ_GRADES[item.g].n} · Lv.${item.lv}`, 24, C.dim, { w: 800 }));
      p.content.add(T(this, x, 290, itemDesc(item), 26, C.ink, { w: 800 })); };
    card(-230, cur, `지금 ${SLOTS.find(s => s.k === it.slot).n}`, false); card(230, it, '새 장비', true);
    const p0 = teamPower(); p.content.add(T(this, 0, 400, up ? `전투력 크게 상승!` : '지금 장비가 더 좋아요', 34, up ? C.green : C.dim, { w: 900 }));
    p.foot([{ t: `분해 ●${fmt(sellValue(it))}`, style: 'dark', fn: () => { sell(it); audio.play('sfx_coin', { volume: 0.4 }); p.close(); } }, { t: '장착하기', style: up ? 'gold' : 'blue', fn: () => { equip(it); audio.play('sfx_levelup', { volume: 0.4 }); p.close(); this.placeTeam(); toast(this, `전투력 ${fmt(p0)} → ${fmt(teamPower())}`, this.partyY - 60); } }]);
  }
  flyItem(it, up) { const im = this.add.image(W / 2, this.chestY - 20, itemIcon(it)).setDisplaySize(110, 110).setDepth(50); this.tweens.add({ targets: im, y: im.y - 160, alpha: 0, duration: 700, onComplete: () => im.destroy() });
    const t = T(this, W / 2, this.chestY - 140, up ? '장착!' : '분해', 30, up ? C.green : C.dim, { w: 900, shadow: true }).setDepth(51); this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() }); if (up) this.placeTeam(); }
  // ── 방치 보상
  offline(gap) {
    const r = offlineReward(gap); if (r.gold <= 0 && r.keys <= 0) return; const d = this.d, h = Math.floor(r.sec / 3600), m = Math.floor(r.sec % 3600 / 60);
    this.paused = true; const p = sheet(this, { size: 'M', title: '원정 보상', sub: '자리를 비운 동안 기사단이 순찰을 돌았어요', onClose: () => { this.paused = false; } });
    const im = this.add.image(0, 120, `hero_${d.team[0]}`).setOrigin(0.5, 1); im.setScale(240 / im.height); p.content.add(im);
    p.content.add(T(this, 0, 170, `${h ? `${h}시간 ` : ''}${m}분 · 몬스터 ${fmt(r.kills)}마리`, 36, C.ink, { w: 900 }));
    p.content.add(chips(this, 0, 260, { gold: r.gold, keys: r.keys }, { size: 90, gap: 220, font: 30 }));
    p.foot([{ t: '받기', fn: () => { p.close(); this.claimIdle(); } }]);
  }
  onBack() { return false; }
}
