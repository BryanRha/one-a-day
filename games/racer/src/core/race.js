// 빵빵 질주 한 판 시뮬레이션 — 화면과 무관한 순수 로직 (브라우저·Node 공용, 봇 밸런싱에 사용)
// 좌표: 가로 1080, 세로 H. 내 차는 화면 아래쪽 고정 높이(y)에서 차로만 바꾼다.
// 다른 차·아이템은 (내 속도 − 그 차 속도) 만큼 아래로 흘러온다.
export const W = 1080;
export const LANES = 5;
// 칼치기 거리 기준 (앞차 뒤범퍼까지 px): 이 안에서 빠지면 GOOD · GREAT · PERFECT
export const DODGE = [300, 170, 80];
// 칼치기를 끊기지 않고 7번 이으면 "스·트·레·스·차·차·차" 완성 → 피버
export const CHANT = ['스', '트', '레', '스', '차', '차', '차'];
export const FEVER_FULL = CHANT.length;
export const FEVER_TIME = 6;
// 보스: 체크포인트 3개마다 등장. 칼치기 한 번 = 별 1발(PERFECT 2발)
export const BOSS_EVERY = 3, BOSS_TIME = 30, BOSS_Y = 620;
export const ROAD_X = 80;   // 양쪽 길가(풍경) 폭
export const LANE_W = (W - ROAD_X * 2) / LANES;
export const PX_PER_M = 20;
export const laneX = l => ROAD_X + LANE_W * (l + 0.5);

// 차종: 길이·폭(px), 속도 범위(px/s), 점수 배수
export const CARS = {
  sedan: { len: 190, w: 120, v: [260, 420], pts: 1 },
  mini: { len: 170, w: 112, v: [300, 460], pts: 1 },
  bus: { len: 300, w: 140, v: [200, 300], pts: 2 },
  truck: { len: 400, w: 150, v: [180, 280], pts: 3 },
  tanker: { len: 360, w: 150, v: [190, 290], pts: 4, boom: true },
  // 보스가 떨어뜨리는 장애물 (도로에 멈춰 있음 → 내 속도로 다가옴)
  crate: { len: 130, w: 130, v: [0, 0], pts: 2, drop: true },
  barrel: { len: 120, w: 120, v: [0, 0], pts: 2, drop: true },
  police: { len: 190, w: 120, v: [300, 400], pts: 2, weave: true },
};
export const ITEMS = ['coin', 'gold', 'fuel', 'magnet', 'booster', 'jump'];
// 드라이버 능력
export const DRIVERS = {
  raccoon: { fuel: 1.0, coin: 1.1, combo: 4.0, jump: 1 },   // 코인 +10%
  penguin: { fuel: 0.9, coin: 1.0, combo: 4.0, jump: 1 },   // 연료 효율 +10%
  bunny: { fuel: 1.0, coin: 1.0, combo: 4.8, jump: 1 },     // 콤보 유지 +20%
  bear: { fuel: 1.0, coin: 1.0, combo: 4.0, jump: 1.35 },   // 점프 충전 빠름
};

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class Race {
  // opts: { seed, H, driver, car: { tank, engine, jump } (부품 레벨 0~10) }
  constructor(opts = {}) {
    this.R = rng(opts.seed ?? 1);
    const H = opts.H || 1920, up = opts.car || {}, d = DRIVERS[opts.driver || 'raccoon'];
    this.d = d;
    this.s = {
      H, t: 0, dist: 0, score: 0, coins: 0, status: 'play', nextId: 1,
      speed: 700, fuel: 100, fuelMax: 100 + (up.tank || 0) * 3,
      engine: 1 + (up.engine || 0) * 0.035,
      jumpRate: (0.11 + (up.jump || 0) * 0.012) * d.jump,
      p: { lane: 2, x: laneX(2), y: H - 520, z: 0, air: 0, jump: 1, hit: 0, slip: 0, slipOn: false, moving: 0 },
      combo: 0, comboT: 0, bestCombo: 0, fever: 0, feverT: 0, boss: null, bossN: 0, booster: 0, magnet: 0,
      cars: [], items: [], oils: [], checkpoints: 0, nextCp: 500, cpY: null,
      spawnY: 0, nextWave: 0, stats: { honks: 0, perfects: 0, fevers: 0, bosses: 0, crashes: 0, rams: 0, jumpshots: 0, items: 0 },
    };
    this.s.fuel = this.s.fuelMax;
    this.events = [];
  }
  ev(type, data) { this.events.push({ type, ...data }); }
  id() { return this.s.nextId++; }

  // ── 입력 ──
  move(dir) {
    const p = this.s.p; if (this.s.status !== 'play') return;
    const l = Math.max(0, Math.min(LANES - 1, p.lane + dir));
    if (l === p.lane) return;
    // 칼치기 판정: 같은 차로 바로 앞차에 닿기 직전에 옆으로 빠지면 "차!" — 가까울수록 높은 등급
    if (p.air <= 0) for (const c of this.s.cars) {
      if (c.state !== 'drive' || c.lane !== p.lane || c.dodged) continue;
      const gap = (p.y - 90) - (c.y + c.len / 2);
      if (gap < -30 || gap > DODGE[0]) continue;
      c.dodged = true;
      this.dodge(c, gap <= DODGE[2] ? 3 : gap <= DODGE[1] ? 2 : 1);
      break;
    }
    p.lane = l; p.moving = dir; this.ev('lane', { dir });
  }
  jump() { const p = this.s.p; if (this.s.status !== 'play' || p.air > 0 || p.jump < 1) return false; p.jump -= 1; p.air = 0.72; this.ev('jump', {}); return true; }

  base() { return 760 + 760 * (1 - Math.exp(-this.s.dist / 6000)); }   // 거리에 따라 빨라짐

  step(dt) {
    const s = this.s, p = s.p;
    if (s.status !== 'play') return;
    if (this.events.length > 200) this.events.length = 0;   // 화면이 읽고 비움 (입력 사이에 생긴 사건도 남도록) · 봇은 쌓이지 않게만
    s.t += dt;
    // 속도: 목표 속도로 가속 (슬립스트림 +20%, 피버·부스터 +40%)
    const boost = s.feverT > 0 || s.booster > 0;
    const target = this.base() * s.engine * (p.slipOn ? 1.2 : 1) * (boost ? 1.4 : 1);
    s.speed += (target - s.speed) * Math.min(1, dt * (s.speed < target ? 0.9 : 2));
    const dy = s.speed * dt;
    s.dist += dy / PX_PER_M;
    // 연료: 달린 거리만큼 + 시간 조금 (엔진을 강화해도 연료 경제가 무너지지 않게 거리 기준)
    if (!boost && !s.practice) s.fuel -= (dy / PX_PER_M * 0.09 + dt * 0.8) * this.d.fuel;   // 첫 판 연습 중에는 연료가 줄지 않음
    if (s.fuel <= 0) { s.fuel = 0; s.status = 'over'; this.ev('outOfFuel', {}); return; }
    // 내 차: 옆 차로로 부드럽게 이동, 점프 체공
    const tx = laneX(p.lane);
    p.x += (tx - p.x) * Math.min(1, dt * 16);
    if (Math.abs(tx - p.x) < 4) p.moving = 0;
    if (p.air > 0) { p.air -= dt; p.z = Math.sin(Math.PI * (1 - Math.max(0, p.air) / 0.72)) * 1; if (p.air <= 0) { p.air = 0; p.z = 0; this.land(); } }
    p.jump = Math.min(1, p.jump + s.jumpRate * dt);
    if (p.hit > 0) p.hit -= dt;
    for (const k of ['feverT', 'booster', 'magnet', 'comboT']) if (s[k] > 0) { s[k] -= dt; if (s[k] <= 0) { s[k] = 0; if (k === 'comboT' && s.combo) { s.combo = 0; this.breakChain(); this.ev('comboEnd', {}); } if (k === 'feverT' || k === 'booster') this.ev('boostEnd', {}); } }

    this.spawn(dy);
    this.bossStep(dt);
    this.moveAll(dt, dy);
    this.collide();
    this.checkpoint();
  }

  // ── 생성: 교통 물결 · 아이템 · 기름 웅덩이 ──
  spawn(dy) {
    const s = this.s, R = this.R;
    s.spawnY += dy;
    const d = s.dist;
    const gap = Math.max(300, 560 - d / 40);                      // 물결 간격 (뒤로 갈수록 촘촘)
    if (s.spawnY < gap) return;
    s.spawnY = 0;
    if (s.boss && R() < 0.55) return;   // 보스전에는 교통을 줄임
    if (s.practice && s.practice < 2 && R() < 0.45) return;   // 연습 1단계: 한산하게
    // 한 물결에 1~3대, 최소 2개 차로는 비워 둠
    const n = Math.min(3, 1 + Math.floor(R() * (1.4 + d / 2500)));
    const lanes = [0, 1, 2, 3, 4].sort(() => R() - 0.5).slice(0, n);
    for (const l of lanes) {
      const kinds = ['sedan', 'sedan', 'mini', 'sedan', 'mini'];
      if (d > 600) kinds.push('bus');
      if (d > 1200) kinds.push('truck');
      if (d > 1500 && R() < 0.35) kinds.push('police');      // 경찰차는 드물게
      if (d > 2000) kinds.push('tanker');
      const kind = kinds[Math.floor(R() * kinds.length)], C = CARS[kind];
      const y = -C.len - R() * 260;
      if (s.cars.some(c => c.lane === l && Math.abs(c.y - y) < (c.len + C.len) / 2 + 120)) continue;
      s.cars.push({ id: this.id(), kind, lane: l, x: laneX(l), y, len: C.len, w: C.w, v: C.v[0] + R() * (C.v[1] - C.v[0]), passed: false, state: 'drive', tx: laneX(l), weaveT: 1 + R() * 2, color: Math.floor(R() * 6) });
    }
    // 빈 차로에 아이템
    const free = [0, 1, 2, 3, 4].filter(l => !lanes.includes(l));
    if (R() < 0.55) {
      const l = free[Math.floor(R() * free.length)];
      const r = R();
      const kind = r < 0.62 ? 'coin' : r < 0.72 ? 'gold' : r < 0.84 ? 'fuel' : r < 0.9 ? 'jump' : r < 0.96 ? 'magnet' : 'booster';
      if (kind === 'coin') for (let i = 0; i < 5; i++) s.items.push({ id: this.id(), kind, lane: l, x: laneX(l), y: -120 - i * 110 });
      else s.items.push({ id: this.id(), kind, lane: l, x: laneX(l), y: -150 });
    }
    // 기름 웅덩이 (체크포인트 5번째부터)
    if (s.checkpoints >= 5 && R() < 0.12) { const l = free[Math.floor(R() * free.length)]; s.oils.push({ id: this.id(), lane: l, x: laneX(l), y: -260 }); }
  }

  moveAll(dt, dy) {
    const s = this.s, H = s.H, p = s.p;
    for (const c of s.cars) {
      if (c.state === 'fly') { c.y += c.vy * dt; c.x += c.vx * dt; c.rot += c.vr * dt; c.ft -= dt; continue; }
      c.y += dy - c.v * dt;
      // 경찰차: 가끔 차로를 바꿈
      if (CARS[c.kind].weave && c.y > -200 && c.y < p.y - 500) { c.weaveT -= dt; if (c.weaveT <= 0) { c.weaveT = 1.5 + this.R() * 2; const nl = Math.max(0, Math.min(LANES - 1, c.lane + (this.R() < 0.5 ? -1 : 1))); if (!s.cars.some(o => o !== c && o.lane === nl && Math.abs(o.y - c.y) < 300)) { c.lane = nl; c.tx = laneX(nl); } } }
      c.x += (c.tx - c.x) * Math.min(1, dt * 4);
      // 앞차가 막혀 있으면 속도를 맞춤 (서로 겹치지 않게)
      for (const o of s.cars) if (o !== c && o.lane === c.lane && o.state === 'drive' && o.y < c.y && c.y - o.y < (c.len + o.len) / 2 + 30) c.v = Math.min(c.v, o.v);
    }
    s.cars = s.cars.filter(c => c.y < H + 500 && c.y > -1500 && (c.state !== 'fly' || c.ft > 0));
    for (const it of s.items) {
      it.y += dy;
      if (s.magnet > 0 || s.feverT > 0) { const ddx = p.x - it.x, ddy = p.y - it.y, dd = Math.hypot(ddx, ddy); if (dd < 700) { it.x += ddx / dd * Math.min(dd, 1800 * dt); it.y += ddy / dd * Math.min(dd, 1800 * dt); } }
    }
    s.items = s.items.filter(it => it.y < H + 100 && !it.got);
    for (const o of s.oils) o.y += dy;
    s.oils = s.oils.filter(o => o.y < H + 200);
    if (s.cpY !== null) { s.cpY += dy; if (s.cpY > H + 100) s.cpY = null; }
  }

  // ── 충돌 · 빵! · 슬립스트림 ──
  collide() {
    const s = this.s, p = s.p, PL = 180, PW = 116;
    const boost = s.feverT > 0 || s.booster > 0;
    let slip = false;
    for (const c of s.cars) {
      if (c.state !== 'drive') continue;
      const dx = Math.abs(c.x - p.x), dyc = c.y - p.y;
      // 슬립스트림: 같은 차로, 앞차 뒤 320px 안
      if (c.lane === p.lane && dyc < 0 && -dyc < (c.len + PL) / 2 + 320 && dx < 60) slip = true;
      if (p.air > 0) continue;   // 공중에선 부딪히지 않음
      const ox = (c.w + PW) / 2 - 18, oy = (c.len + PL) / 2 - 20;
      if (dx < ox && Math.abs(dyc) < oy) {
        if (boost) { this.smash(c, 'boost'); continue; }
        // 옆에서 들이받기: 차로를 바꾸는 중이고 차가 옆에 나란히 있음
        if (p.moving && Math.abs(dyc) < c.len * 0.45) { this.smash(c, 'ram'); s.speed *= 0.92; continue; }
        if (dyc < 0 && p.hit <= 0) this.crash(c);
      }
    }
    // 슬립스트림 0.8초 유지 시 가속
    if (slip) { p.slip += 1 / 60; if (p.slip > 0.8 && !p.slipOn) { p.slipOn = true; this.ev('slip', {}); } } else { p.slip = 0; p.slipOn = false; }
    // 아이템
    for (const it of s.items) {
      if (Math.abs(it.x - p.x) < 100 && Math.abs(it.y - p.y) < 130 && p.z < 0.6) { it.got = true; this.pick(it); }
    }
    // 기름 웅덩이: 옆 차로로 미끄러짐
    for (const o of s.oils) {
      if (!o.hit && Math.abs(o.x - p.x) < 80 && Math.abs(o.y - p.y) < 90 && p.air <= 0 && !boost) { o.hit = true; this.move(this.R() < 0.5 ? -1 : 1); s.speed *= 0.85; this.ev('oil', { x: o.x, y: o.y }); }
    }
  }

  // grade 1 GOOD("차!") · 2 GREAT("차차!") · 3 PERFECT("차차차!")
  dodge(c, grade) {
    const s = this.s;
    s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.comboT = this.d.combo + (grade === 3 ? 0.5 : 0);
    s.stats.honks++; if (grade === 3) s.stats.perfects++;
    const mult = 1 + Math.min(9, Math.floor(s.combo / 2)) * 0.5;
    const pts = Math.round(120 * grade * mult * (s.speed / 700));
    s.score += pts;
    if (s.boss && s.boss.phase === 'fight') this.hitBoss(grade === 3 ? 2 : 1);
    const chain = s.feverT > 0 ? 0 : ++s.fever;
    this.ev('honk', { x: c.x, y: c.y, combo: s.combo, pts, grade, chain, side: Math.sign(c.x - s.p.x) });
    if (chain >= FEVER_FULL) { s.fever = 0; s.feverT = FEVER_TIME; s.stats.fevers++; this.ev('fever', {}); }
  }

  // 차 날려 보내기 (부스터·옆 들이받기·점프샷)
  smash(c, how) {
    const s = this.s, R = this.R;
    c.state = 'fly'; c.ft = 1.2; c.rot = 0;
    const side = c.x < s.p.x ? -1 : 1;
    c.vx = (how === 'ram' ? side * 1400 : (R() - 0.5) * 1400); c.vy = -300 - R() * 400; c.vr = (R() - 0.5) * 14;
    const pts = Math.round((how === 'jump' ? 1500 : how === 'ram' ? 300 : 150) * CARS[c.kind].pts * (s.speed / 700));
    s.score += pts;
    if (how === 'ram') s.stats.rams++;
    if (how === 'jump') s.stats.jumpshots++;
    this.ev('smash', { x: c.x, y: c.y, how, kind: c.kind, pts });
    // 유조차는 폭발하며 주변 차까지 날림
    if (CARS[c.kind].boom) { this.ev('boom', { x: c.x, y: c.y }); for (const o of s.cars) if (o.state === 'drive' && Math.hypot(o.x - c.x, o.y - c.y) < 420) this.smash(o, 'boost'); }
  }

  // 콤보가 끊기면(시간 초과·충돌) 글자도 처음부터
  breakChain() { if (this.s.fever > 0) { this.s.fever = 0; this.ev('chainBreak', { left: 0 }); } }

  crash(c) {
    const s = this.s, p = s.p;
    p.hit = 0.6;
    s.speed *= 0.55;
    s.fuel = Math.max(0, s.fuel - 8);
    s.stats.crashes++;
    if (s.combo) { s.combo = 0; s.comboT = 0; this.ev('comboEnd', {}); }
    this.breakChain();
    c.y -= 50; c.v += 160;
    this.ev('crash', { x: p.x, y: p.y - 90 });
  }

  land() {
    const s = this.s, p = s.p;
    for (const c of s.cars) if (c.state === 'drive' && Math.abs(c.x - p.x) < (c.w + 116) / 2 - 10 && Math.abs(c.y - p.y) < (c.len + 180) / 2 - 10) { this.smash(c, 'jump'); s.speed *= 1.05; break; }
    this.ev('land', {});
  }

  pick(it) {
    const s = this.s;
    s.stats.items++;
    if (it.kind === 'coin') { s.coins += this.d.coin; s.score += 10; }
    else if (it.kind === 'gold') { s.coins += 10 * this.d.coin; s.score += 100; }
    else if (it.kind === 'fuel') s.fuel = Math.min(s.fuelMax, s.fuel + 18);
    else if (it.kind === 'magnet') s.magnet = 8;
    else if (it.kind === 'booster') { s.booster = 4; this.ev('booster', {}); }
    else if (it.kind === 'jump') s.p.jump = 1;
    this.ev('pick', { kind: it.kind, x: it.x, y: it.y });
  }

  // 체크포인트: 500m 마다 연료 충전 (충전량은 점점 줄고 간격은 늘어남)
  // ── 보스: 위쪽에서 차로를 옮겨 다니며 상자를 떨어뜨림 ──
  startBoss() {
    const s = this.s; s.bossN++;
    const hp = 6 + s.bossN * 2;
    s.boss = { phase: 'enter', hp, max: hp, lane: 2, x: laneX(2), y: -400, t: 0, moveT: 1.5, dropT: 1.6, warn: null };
    this.ev('bossStart', { n: s.bossN });
  }
  bossStep(dt) {
    const s = this.s, b = s.boss, R = this.R;
    if (!b) return;
    b.t += dt;
    if (b.phase === 'enter') { b.y += (BOSS_Y - b.y) * Math.min(1, dt * 2.5); if (BOSS_Y - b.y < 6) b.phase = 'fight'; return; }
    if (b.phase === 'leave') { b.y -= 900 * dt; b.x += (b.dir || 0) * 400 * dt; if (b.y < -600) s.boss = null; return; }
    b.x += (laneX(b.lane) - b.x) * Math.min(1, dt * 3);
    if (b.t > BOSS_TIME) { b.phase = 'leave'; this.ev('bossEscape', {}); return; }
    // 차로 옮기기 (경고 중에는 그 차로에 머묾)
    if (!b.warn) { b.moveT -= dt; if (b.moveT <= 0) { b.moveT = 1.2 + R() * 1.2; const near = R() < 0.55 ? s.p.lane : Math.floor(R() * LANES); b.lane = Math.max(0, Math.min(LANES - 1, near)); } }
    // 떨어뜨리기: 경고 0.8초 → 상자/통 (체력이 적을수록 빨라짐)
    b.dropT -= dt;
    if (b.dropT <= 0 && !b.warn && Math.abs(b.x - laneX(b.lane)) < 20) { b.warn = { lane: b.lane, t: 0.8 }; this.ev('bossWarn', { lane: b.lane }); }
    if (b.warn) {
      b.warn.t -= dt;
      if (b.warn.t <= 0) {
        const kind = R() < 0.5 ? 'crate' : 'barrel', C = CARS[kind], l = b.warn.lane;
        s.cars.push({ id: this.id(), kind, lane: l, x: laneX(l), y: b.y + 330, len: C.len, w: C.w, v: 0, passed: false, state: 'drive', tx: laneX(l), weaveT: 99, color: 0 });
        this.ev('bossDrop', { lane: l, x: laneX(l), y: b.y + 330 });
        b.warn = null; b.dropT = 0.9 + 1.1 * (b.hp / b.max);
      }
    }
  }
  hitBoss(dmg) {
    const s = this.s, b = s.boss;
    b.hp = Math.max(0, b.hp - dmg);
    this.ev('bossHit', { dmg, x: s.p.x, y: s.p.y, hp: b.hp, max: b.max });
    if (b.hp <= 0) {
      b.phase = 'leave'; b.dir = s.p.x < W / 2 ? 1 : -1; b.warn = null;
      const coins = 120 + s.bossN * 30, pts = Math.round(6000 * s.bossN * (s.speed / 700));
      s.coins += coins * this.d.coin; s.score += pts; s.fuel = Math.min(s.fuelMax, s.fuel + 30); s.stats.bosses = (s.stats.bosses || 0) + 1;
      // 남은 장애물은 날려 버림
      for (const c of s.cars) if (CARS[c.kind].drop && c.state === 'drive') { c.state = 'fly'; c.ft = 1.2; c.rot = 0; c.vx = (this.R() - 0.5) * 1400; c.vy = -500; c.vr = (this.R() - 0.5) * 14; }
      this.ev('bossDown', { x: b.x, y: b.y, coins, pts });
    }
  }

  checkpoint() {
    const s = this.s;
    if (s.cpY === null && s.dist > s.nextCp - (s.p.y + 200) / PX_PER_M) s.cpY = -200;
    if (s.dist >= s.nextCp) {
      s.checkpoints++;
      const add = Math.max(28, 62 - s.checkpoints * 2.4);
      s.fuel = Math.min(s.fuelMax, s.fuel + add);
      s.score += 500 * s.checkpoints;
      s.nextCp += 500 + s.checkpoints * 40;
      this.ev('checkpoint', { n: s.checkpoints, add });
      if (s.checkpoints % BOSS_EVERY === 0 && !s.boss && !s.practice) this.startBoss();
    }
  }
}
