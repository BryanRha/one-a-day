// 룬 다이스 한 판 — 화면과 무관한 순수 로직 (브라우저·Node 공용, 봇 밸런싱에 사용)
// 판 3×5 (세로형 — 원작 5×3 을 세로 화면에 맞게 돌림)에 룬 주사위를 소환·합성, 판을 둘러싼 ㄷ자 길로 오는 적을 막는다. 생명 3.
export const COLS = 3, ROWS = 5, SLOTS = COLS * ROWS, MAX_PIPS = 7;

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 룬 10종: dmg(탄 1발), rate(초당 공격), 특성
export const RUNES = {
  flame: { name: '화염', dmg: 20, rate: 0.9, splash: 0.35, color: 0xFF5A3C },
  frost: { name: '서리', dmg: 14, rate: 1.0, slow: 0.25, color: 0x6FD3FF },
  storm: { name: '번개', dmg: 16, rate: 1.0, chain: 2, color: 0xFFE14D },
  venom: { name: '독', dmg: 9, rate: 1.0, poison: 34, color: 0x7CE36A },
  gale: { name: '질풍', dmg: 13, rate: 1.9, color: 0xB6F0E4 },
  iron: { name: '강철', dmg: 42, rate: 0.6, boss: 2.5, color: 0xB8C2D8 },
  light: { name: '광휘', dmg: 10, rate: 0.8, aura: 0.12, color: 0xFFF2B0 },
  echo: { name: '메아리', dmg: 12, rate: 1.0, wild: true, color: 0xC59BFF },
  fortune: { name: '행운', dmg: 10, rate: 0.8, sp: 30, color: 0xF5C451 },
  growth: { name: '성장', dmg: 12, rate: 1.0, grow: 16, color: 0x5BE39A },
};
export const RUNE_ORDER = Object.keys(RUNES);
export const POWER_COST = [100, 200, 400, 700];     // 판 안 강화 (종류별 4단계)
export const POWER_BONUS = 0.35;                    // 단계마다 피해 +35%

// 보스 5종 (웨이브 끝에 순환)
export const BOSSES = [
  { id: 'serpent', name: '심연의 뱀', hp: 12, speed: 0.6, spawnEvery: 0.18 },      // 체력이 깎일 때마다 졸개
  { id: 'knight', name: '침묵의 기사', hp: 14, speed: 0.55, silence: 6 },          // 6초마다 주사위 3개 봉인 3초
  { id: 'mage', name: '환술사', hp: 11, speed: 0.6, morph: 7 },                    // 7초마다 주사위 2개 종류 바꿈
  { id: 'warden', name: '수호자', hp: 13, speed: 0.5, shield: 8 },                 // 8초마다 2초 무적
  { id: 'rush', name: '질주자', hp: 10, speed: 0.75, dash: 5 },                    // 5초마다 순간 돌진
];

// 길: 판 밖 ㄷ자 (왼쪽 아래 → 위 → 오른쪽 → 아래). 길이는 0~1 진행도로 다룸
export const PATH_LEN = 1;
export let HP_GROW = 1.3, PIP_MULT = 1.6;
export function setPip(m) { PIP_MULT = m; }
export function setGrow(g) { HP_GROW = g; }

export class Sim {
  // deck: 룬 id 5개, tiers: { 룬id: 영구 등급 1~ } , seed
  constructor({ deck, tiers = {}, seed = 1, startWave = 1 } = {}) {
    this.R = rng(seed);
    this.deck = deck.slice(0, 5);
    this.tiers = tiers;
    this.board = new Array(SLOTS).fill(null);       // { id, type, pips, cd, silenced, age }
    this.power = Object.fromEntries(this.deck.map(t => [t, 0]));
    this.enemies = []; this.nextId = 1; this.events = [];
    this.sp = 100; this.summons = 0; this.lives = 3; this.wave = startWave; this.t = 0;
    this.phase = 'wave'; this.waveT = 0; this.spawnT = 0; this.spawned = 0; this.over = false;
    this.kills = 0; this.bossKills = 0; this.merges = 0; this.maxPips = 1;
    this.setupWave();
  }
  ev(type, d = {}) { this.events.push({ type, ...d }); }

  // ── 웨이브 ──
  waveHp(w = this.wave) { return Math.round(45 * Math.pow(HP_GROW, w - 1) + 15 * w); }
  setupWave() {
    const w = this.wave;
    this.toSpawn = 10 + Math.min(14, w);
    this.spawned = 0; this.spawnT = 0.5; this.waveT = 0; this.phase = 'wave'; this.bossOut = false;
    this.ev('wave', { wave: w });
  }
  spawnEnemy(kind) {
    const base = this.waveHp(), w = this.wave;
    const K = { normal: [1, 0.075, 10], fast: [0.55, 0.13, 10], big: [4.2, 0.052, 30] }[kind];   // 속도: 초당 길 진행 비율 (일반 ≈13초에 통과)
    const e = { id: this.nextId++, kind, hp: base * K[0], max: base * K[0], speed: K[1] * (1 + Math.min(0.5, w * 0.012)), d: 0, slow: 0, poison: 0, sp: K[2] + w * 3 };
    this.enemies.push(e); return e;
  }
  spawnBoss() {
    const B = BOSSES[(this.wave - 1) % BOSSES.length], base = this.waveHp();
    const hp = base * B.hp * (1 + this.wave * 0.04);
    const e = { id: this.nextId++, kind: 'boss', boss: B.id, name: B.name, hp, max: hp, speed: B.speed * 0.075, d: 0, slow: 0, poison: 0, sp: 100 + this.wave * 10, t: 0, shield: 0, lastSpawn: 1 };
    this.enemies.push(e); this.bossOut = true;
    this.ev('boss', { boss: B.id, name: B.name });
    return e;
  }

  // ── 소환 · 합성 · 강화 ──
  summonCost() { return 10 + this.summons * 10; }
  emptySlots() { const o = []; this.board.forEach((d, i) => { if (!d) o.push(i); }); return o; }
  newDie(type, pips) { return { id: this.nextId++, type, pips, cd: this.R() * 0.5, silenced: 0, age: 0 }; }
  randType() { return this.deck[Math.floor(this.R() * this.deck.length)]; }
  summon() {
    const empty = this.emptySlots(), cost = this.summonCost();
    if (this.over || !empty.length || this.sp < cost) return null;
    this.sp -= cost; this.summons++;
    const slot = empty[Math.floor(this.R() * empty.length)];
    const d = this.board[slot] = this.newDie(this.randType(), 1);
    this.ev('summon', { slot, die: d });
    return slot;
  }
  canMerge(a, b) {
    const A = this.board[a], B = this.board[b];
    if (!A || !B || a === b || A.pips !== B.pips || A.pips >= MAX_PIPS) return false;
    return A.type === B.type || RUNES[A.type].wild || RUNES[B.type].wild;
  }
  // a 를 b 위로 끌어 합성 → b 자리에 눈+1 새 주사위 (종류는 덱에서 무작위)
  merge(a, b) {
    if (!this.canMerge(a, b)) return null;
    const A = this.board[a], B = this.board[b], pips = B.pips + 1;
    let gainSp = 0;
    if (A.type === 'fortune' || B.type === 'fortune') gainSp = RUNES.fortune.sp * B.pips * (1 + 0.25 * (this.tiers.fortune || 1) - 0.25);
    this.board[a] = null;
    const d = this.board[b] = this.newDie(this.randType(), pips);
    this.sp += Math.round(gainSp);
    this.merges++; this.maxPips = Math.max(this.maxPips, pips);
    this.ev('merge', { from: a, to: b, die: d, sp: Math.round(gainSp) });
    return d;
  }
  powerCost(type) { const lv = this.power[type]; return lv < POWER_COST.length ? POWER_COST[lv] : null; }
  powerUp(type) {
    const c = this.powerCost(type);
    if (c == null || this.sp < c || this.over) return false;
    this.sp -= c; this.power[type]++;
    this.ev('power', { type, lv: this.power[type] });
    return true;
  }

  // ── 진행 ──
  step(dt) {
    if (this.over) return;
    this.t += dt; this.waveT += dt;
    // 소환
    if (this.phase === 'wave') {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.spawned < this.toSpawn) {
        const w = this.wave, r = this.R();
        const kind = w >= 3 && r < 0.12 + Math.min(0.12, w * 0.006) ? 'big' : w >= 2 && r < 0.38 ? 'fast' : 'normal';
        this.spawnEnemy(kind); this.spawned++;
        this.spawnT = Math.max(0.35, 0.9 - w * 0.03);
      }
      if (this.spawned >= this.toSpawn && !this.bossOut) { this.phase = 'boss'; this.spawnBoss(); }
    }
    this.stepDice(dt);
    this.stepEnemies(dt);
    // 웨이브 끝: 보스까지 다 처치
    if (this.phase === 'boss' && !this.enemies.length) {
      const bonus = 60 + this.wave * 15; this.sp += bonus;
      this.ev('waveClear', { wave: this.wave, sp: bonus });
      this.wave++; this.setupWave();
    }
  }
  dmgOf(d) {
    const R = RUNES[d.type], tier = this.tiers[d.type] || 1;
    return R.dmg * (1 + 0.15 * (tier - 1)) * (1 + POWER_BONUS * (this.power[d.type] || 0)) * Math.pow(PIP_MULT, d.pips - 1) * (d.pips >= 7 ? 1.5 : 1);   // 눈이 오를수록 한 발이 크게 강해짐 (7눈 각성 +50%)
  }
  // 광휘 옆 주사위 공격 속도 +
  auraAt(i) {
    const r = Math.floor(i / COLS), c = i % COLS; let a = 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const y = r + dr, x = c + dc; if (y < 0 || x < 0 || y >= ROWS || x >= COLS) continue;
      const n = this.board[y * COLS + x]; if (n && n.type === 'light' && !n.silenced) a += RUNES.light.aura * n.pips;
    }
    return Math.min(1.2, a);
  }
  front() { let best = null; for (const e of this.enemies) if (!best || e.d > best.d) best = e; return best; }
  stepDice(dt) {
    for (let i = 0; i < SLOTS; i++) {
      const d = this.board[i]; if (!d) continue;
      d.age += dt;
      if (d.silenced > 0) { d.silenced -= dt; continue; }
      // 성장: 일정 시간이 지나면 눈 +1
      // 성장: 눈이 높을수록 오래 걸리고 6눈까지만 (7눈은 합성으로만)
      if (d.type === 'growth' && d.pips < 6 && d.age >= RUNES.growth.grow + 8 * d.pips) { d.pips++; d.age = 0; this.maxPips = Math.max(this.maxPips, d.pips); this.ev('grow', { slot: i, die: d }); }
      d.cd -= dt * RUNES[d.type].rate * (1 + this.auraAt(i));
      if (d.cd > 0) continue;
      d.cd = 1;
      const tgt = this.front(); if (!tgt) { d.cd = 0.05; continue; }
      this.ev('shot', { slot: i, die: d, target: tgt.id, n: d.pips });
      for (let k = 0; k < d.pips; k++) this.hit(d, tgt);
    }
  }
  hit(d, e) {
    const R = RUNES[d.type];
    let dmg = this.dmgOf(d);
    if (R.boss && e.kind === 'boss') dmg *= R.boss;
    this.damage(e, dmg);
    if (R.splash) for (const o of this.enemies) if (o !== e && Math.abs(o.d - e.d) < 0.06) this.damage(o, dmg * R.splash);
    if (R.slow) e.slow = Math.max(e.slow, Math.min(0.6, R.slow + 0.03 * d.pips));
    if (R.poison) e.poison += R.poison * (1 + 0.15 * ((this.tiers[d.type] || 1) - 1)) * (1 + POWER_BONUS * this.power[d.type]) * 0.15;
    if (R.chain) { const near = this.enemies.filter(o => o !== e && o.hp > 0).sort((a, b) => Math.abs(a.d - e.d) - Math.abs(b.d - e.d)).slice(0, R.chain); for (const o of near) this.damage(o, dmg * 0.6); }
  }
  damage(e, dmg) {
    if (e.hp <= 0) return;
    if (e.shieldOn > 0) return;
    e.hp -= dmg;
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) {
    this.sp += e.sp; this.kills++;
    if (e.kind === 'boss') this.bossKills++;
    this.ev('kill', { id: e.id, kind: e.kind, sp: e.sp, d: e.d, boss: e.boss });
  }
  stepEnemies(dt) {
    const B = Object.fromEntries(BOSSES.map(b => [b.id, b]));
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.poison > 0) { const p = e.poison * dt; e.poison = Math.max(0, e.poison - p * 0.15); this.damage(e, p); if (e.hp <= 0) continue; }
      if (e.slow > 0) e.slow = Math.max(0, e.slow - dt * 0.15);
      let sp = e.speed * (1 - e.slow);
      if (e.kind === 'boss') {
        const b = B[e.boss]; e.t += dt;
        if (b.silence && e.t % b.silence < dt) this.bossSilence();
        if (b.morph && e.t % b.morph < dt) this.bossMorph();
        if (b.shield) { if (e.t % b.shield < dt) { e.shieldOn = 2; this.ev('shield', { id: e.id }); } if (e.shieldOn > 0) e.shieldOn -= dt; }
        if (b.dash && e.t % b.dash < dt) { e.d = Math.min(0.97, e.d + 0.06); this.ev('dash', { id: e.id }); }
        if (b.spawnEvery) { const lost = 1 - e.hp / e.max; if (lost >= e.lastSpawn * b.spawnEvery && e.lastSpawn < 5) { e.lastSpawn++; for (let k = 0; k < 2; k++) { const m = this.spawnEnemy('fast'); m.d = Math.max(0, e.d - 0.02 * (k + 1)); m.hp = m.max = this.waveHp() * 0.5; } this.ev('summonMinion', { id: e.id }); } }
      }
      e.d += sp * dt;
      if (e.d >= PATH_LEN) {
        e.hp = 0; const loss = e.kind === 'boss' ? 2 : 1;
        this.lives -= loss; this.ev('leak', { id: e.id, kind: e.kind, loss });
        if (this.lives <= 0) { this.lives = 0; this.over = true; this.ev('over', { wave: this.wave }); }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }
  bossSilence() {
    const live = this.board.map((d, i) => d ? i : -1).filter(i => i >= 0).sort(() => this.R() - 0.5).slice(0, 3);
    for (const i of live) this.board[i].silenced = 3;
    if (live.length) this.ev('silence', { slots: live });
  }
  bossMorph() {
    const live = this.board.map((d, i) => d ? i : -1).filter(i => i >= 0).sort(() => this.R() - 0.5).slice(0, 2);
    for (const i of live) this.board[i].type = this.randType();
    if (live.length) this.ev('morph', { slots: live });
  }
}
