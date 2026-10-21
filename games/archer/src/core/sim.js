// 전투 규칙 (화면과 무관): 방 · 영웅 이동/자동 사격 · 화살 · 몬스터 AI · 적 탄 · 능력 · 레벨업
// 좌표는 방 안의 픽셀 (가로 AW × 세로 AH). 한 칸 = CELL.
import { HEROES, SKILLS, SKILL_KEYS, MONS, BOSSES, CHAPTERS, ROOMS } from './data.js?v=0.17.0';

export const CELL = 120, COLS = 9, ROWS = 16, AW = CELL * COLS, AH = CELL * ROWS;   // 세로 화면에 맞춘 방 (9 × 16)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// 방 모양: 장애물(#) · 구덩이(o) 패턴 (영웅은 아래 가운데에서 시작, 문은 위 가운데)
const LAYOUTS = [
  [],
  [[2, 4], [6, 4], [2, 8], [6, 8]],
  [[1, 5], [2, 5], [6, 5], [7, 5], [4, 8]],
  [[3, 3], [5, 3], [4, 6], [3, 9], [5, 9]],
  [[2, 3], [2, 4], [6, 3], [6, 4], [2, 8], [6, 8], [4, 6, 'o']],
  [[1, 4, 'o'], [7, 4, 'o'], [4, 4], [4, 5], [2, 8], [6, 8]],
  [[3, 5], [4, 5], [5, 5], [1, 8, 'o'], [7, 8, 'o']],
  [[2, 2], [6, 2], [4, 4, 'o'], [2, 7], [6, 7], [4, 9]],
  [[0, 6], [1, 6], [7, 6], [8, 6], [4, 3], [4, 9, 'o']],
  [[3, 4, 'o'], [5, 4, 'o'], [3, 7, 'o'], [5, 7, 'o']],
  [[1, 3], [7, 3], [3, 6], [5, 6], [1, 10], [7, 10], [4, 8, 'o']],
  [[2, 5], [3, 5], [5, 5], [6, 5], [2, 10, 'o'], [6, 10, 'o'], [4, 2]],
];
export const roomKind = n => (n === ROOMS ? 'boss' : n === 10 ? 'mid' : n === 5 || n === 15 ? 'special' : 'fight');

export class Sim {
  // run: 이번 판 상태 (장, 방 번호, 영웅 능력치 · 능력 목록 · 체력) — 방을 넘어가도 유지
  constructor(o = {}) {
    this.R = rng(o.seed || 7);
    this.ch = CHAPTERS[(o.chapter || 1) - 1];
    const H = HEROES[o.hero || 'arin'], gear = o.gear || {};
    this.hero = o.hero || 'arin';
    this.base = { hp: Math.round(H.hp + (gear.hp || 0)), atk: H.atk + (gear.atk || 0), aspd: H.aspd, crit: 0.05 + (gear.crit || 0) / 100, spd: 340 * (o.hero === 'mir' ? 1.15 : 1) };
    this.sk = {};   // 능력 이름 → 중첩 수
    if (o.hero === 'theo') this.sk.fire = 1;
    if (o.hero === 'yuna') this.sk.frost = 1;
    this.p = { x: AW / 2, y: AH - CELL * 1.5, r: 30, hp: this.base.hp, maxHp: this.base.hp, inv: 0, cd: 0, moving: false, face: -Math.PI / 2 };
    this.lvl = 1; this.xp = 0; this.gold = 0; this.gems = 0; this.room = 0; this.kills = 0; this.over = false; this.win = false;
    this.events = []; this.t = 0;
    this.nextRoom();
  }
  ev(type, d = {}) { this.events.push({ type, ...d }); }
  // ── 능력치 계산 ──
  get atk() { return this.base.atk * (1 + 0.25 * (this.sk.atk || 0)) * (this.hero === 'theo' ? 1.12 : 1); }
  get aspd() { return this.base.aspd * (1 + 0.2 * (this.sk.aspd || 0)); }
  get crit() { return this.base.crit + 0.12 * (this.sk.crit || 0); }
  get dodge() { return 1 - Math.pow(0.85, this.sk.dodge || 0) + (this.hero === 'mir' ? 0.08 : 0); }
  xpNeed() { return Math.round(60 + this.lvl * 45); }

  // ── 방 ──
  nextRoom() {
    this.room++;
    if (this.room > ROOMS) { this.over = true; this.win = true; this.ev('clear'); return; }
    const kind = roomKind(this.room), R = this.R;
    this.kind = kind; this.cleared = false; this.doorOpen = false; this.mons = []; this.shots = []; this.foes = []; this.drops = []; this.npc = null;
    // 지형
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));   // 0 바닥 · 1 막힘(장애물) · 2 구덩이(화살은 지나감)
    const lay = kind === 'fight' ? LAYOUTS[1 + Math.floor(R() * (LAYOUTS.length - 1))] : kind === 'mid' ? LAYOUTS[Math.floor(R() * 3)] : [];
    const flip = R() < 0.5;
    for (const [x, y, k] of lay) { const gx = flip ? COLS - 1 - x : x; if (Math.abs(gx - 4) <= 1 && (y <= 3 || y >= ROWS - 3)) continue; this.grid[y][gx] = k === 'o' ? 2 : 1; }   // 문 앞길 · 시작 자리는 비움
    this.p.x = AW / 2; this.p.y = AH - CELL * 2.5; this.p.inv = this.sk.star ? 2 : 0.6;
    this.orbA = 0;
    if (kind === 'special') { this.npc = { type: this.room === 5 ? 'angel' : 'devil', x: AW / 2, y: AH * 0.4, used: false }; this.cleared = true; this.doorOpen = true; }
    else if (kind === 'boss' || kind === 'mid') this.spawnBoss(kind);
    else this.spawnWave();
    this.ev('room', { n: this.room, kind });
  }
  free(x, y) { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && this.grid[cy][cx] === 0; }
  spawnWave() {
    const n = 3 + Math.floor(this.room / 3) + Math.floor(this.R() * 2), list = this.ch.mons;
    const pool = this.room < 4 ? list.slice(0, 2) : this.room < 8 ? list.slice(0, 3) : list;
    for (let i = 0; i < n; i++) {
      let x, y, k = 0; do { x = CELL * (0.7 + this.R() * (COLS - 1.4)); y = CELL * (1 + this.R() * (ROWS * 0.6)); k++; } while ((!this.free(x, y) || d2({ x, y }, this.p) < 500 ** 2) && k < 40);
      this.addMon(pool[Math.floor(this.R() * pool.length)], x, y);
    }
  }
  addMon(type, x, y, hpMul = 1) {
    const M = MONS[type], scale = this.ch.hpMul * (1 + (this.room - 1) * 0.045);
    const m = { id: Math.random().toString(36).slice(2, 8), type, x, y, r: M.r, hp: M.hp * scale * hpMul, maxHp: M.hp * scale * hpMul, cd: 0.8 + this.R() * 1.2, st: 0, vx: 0, vy: 0, burn: 0, slow: 0, poison: 0, boss: false };
    this.mons.push(m); this.ev('spawn', { id: m.id, mt: type }); return m;
  }
  spawnBoss(kind) {
    if (kind === 'mid') { const m = this.addMon(this.ch.mid, AW / 2, AH * 0.3, 6); m.r *= 1.4; m.mid = true; m.sz = 1.5; this.ev('boss', { name: `우두머리 ${MONS[this.ch.mid].name}`, mid: true }); return; }
    const B = BOSSES[this.ch.boss];
    const m = { id: 'boss', type: this.ch.boss, boss: true, x: AW / 2, y: AH * 0.28, r: B.r, hp: B.hp, maxHp: B.hp, cd: 1.6, st: 0, pat: 0, vx: 0, vy: 0, burn: 0, slow: 0, poison: 0 };
    this.mons.push(m); this.ev('boss', { name: B.name });
  }
  // ── 능력 고르기 ──
  offer(n = 3) {
    const have = this.sk, pool = SKILL_KEYS.filter(k => (have[k] || 0) < SKILLS[k].max && !(k === 'heal' && this.p.hp >= this.p.maxHp * 0.9));
    const out = [];
    while (out.length < n && pool.length) {
      const tot = pool.reduce((a, k) => a + SKILLS[k].w, 0); let r = this.R() * tot, i = 0;
      while ((r -= SKILLS[pool[i]].w) > 0) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  take(k) {
    const S = SKILLS[k]; if (!S) return;
    if (k === 'heal') { this.healBy(this.p.maxHp * 0.4); }
    else this.sk[k] = (this.sk[k] || 0) + 1;
    if (k === 'hpup') { const add = Math.round(this.base.hp * 0.2); this.p.maxHp += add; this.p.hp += add; }
    this.ev('skill', { k });
  }
  healBy(v) { const b = this.p.hp; this.p.hp = Math.min(this.p.maxHp, this.p.hp + v); if (this.p.hp > b) this.ev('heal', { v: Math.round(this.p.hp - b) }); }
  // 특수 방: 천사 = 회복 또는 능력 · 악마 = 최대 체력 줄이고 좋은 능력
  useNpc(choice) {
    const n = this.npc; if (!n || n.used) return; n.used = true;
    if (n.type === 'angel') { if (choice === 'heal') this.healBy(this.p.maxHp * 0.5); else this.take(choice); }
    else if (choice !== 'no') { const loss = Math.round(this.p.maxHp * 0.2); this.p.maxHp -= loss; this.p.hp = Math.min(this.p.hp, this.p.maxHp); this.take(choice); }
    this.ev('npc', { nt: n.type, choice });
  }

  // ── 한 프레임 (dt 초 · input: { mx, my } 이동 방향, 0 이면 멈춤) ──
  step(dt, input = { mx: 0, my: 0 }) {
    if (this.over) return;
    this.t += dt; const p = this.p;
    p.inv = Math.max(0, p.inv - dt);
    // 이동 (막힌 칸·벽은 미끄러지듯)
    const ml = Math.hypot(input.mx, input.my); p.moving = ml > 0.15;
    if (p.moving) {
      const sp = this.base.spd * Math.min(1, ml), vx = input.mx / ml * sp * dt, vy = input.my / ml * sp * dt;
      const ok = (x, y) => x > p.r && x < AW - p.r && y > p.r && y < AH - p.r && [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => this.free(x + a * p.r * 0.7, y + b * p.r * 0.7));
      if (ok(p.x + vx, p.y)) p.x += vx; if (ok(p.x, p.y + vy)) p.y += vy;
      p.face = Math.atan2(input.my, input.mx);
    }
    // 문: 방을 다 깨면 위쪽 가운데 문으로 나감
    if (this.doorOpen && p.y < CELL * 0.75 && Math.abs(p.x - AW / 2) < CELL * 0.9) { this.ev('door'); this.nextRoom(); return; }
    // 자동 사격: 멈춰 있을 때만, 가장 가까운 적에게
    p.cd -= dt;
    const target = this.nearest(p);
    if (!p.moving && target && p.cd <= 0) { this.fire(target); p.cd = 1 / (1.2 * this.aspd); }
    if (target && !p.moving) p.face = Math.atan2(target.y - p.y, target.x - p.x);
    // 정령 친구
    for (let i = 0; i < (this.sk.spirit || 0); i++) { const k = `sp${i}`; this[k] = (this[k] || 0) - dt; if (this[k] <= 0 && target) { this[k] = 1.1; const sx = p.x + (i ? 70 : -70), sy = p.y - 50; this.arrow(sx, sy, Math.atan2(target.y - sy, target.x - sx), 0.45, 'spirit'); } }
    // 구슬 (몸 주위를 돎)
    this.orbA += dt * 3.2;
    const orbs = []; const no = (this.sk.orbfire || 0) + (this.sk.orbice || 0);
    for (let i = 0; i < no; i++) { const a = this.orbA + i * Math.PI * 2 / no; orbs.push({ x: p.x + Math.cos(a) * 130, y: p.y + Math.sin(a) * 130, ice: i >= (this.sk.orbfire || 0) }); }
    this.orbs = orbs;
    for (const o of orbs) for (const m of this.mons) if (d2(o, m) < (m.r + 26) ** 2) { m.orbCd = (m.orbCd || 0) - dt; if (m.orbCd <= 0) { m.orbCd = 0.35; this.hurt(m, this.atk * 0.45, false, o.ice ? 'ice' : 'fire'); if (o.ice) m.slow = 1.2; } }
    this.moveShots(dt);
    this.moveMons(dt);
    this.moveFoes(dt);
    // 줍기: 금화·보석 (가까우면 끌려옴, 방을 깨면 전부 끌려옴)
    for (const d of this.drops) { const dd = Math.sqrt(d2(d, p)); if (this.cleared || dd < 220) { const s = Math.min(1, dt * (this.cleared ? 9 : 6)); d.x += (p.x - d.x) * s; d.y += (p.y - d.y) * s; } if (dd < 40) { d.got = true; if (d.k === 'gold') this.gold += d.v; else this.addXp(d.v); this.ev('pick', { k: d.k }); } }
    this.drops = this.drops.filter(d => !d.got);
    // 방 끝
    if (!this.cleared && !this.mons.length) { this.cleared = true; this.foes = []; this.ev('cleared', { kind: this.kind }); if (this.kind === 'boss') { this.over = true; this.win = true; this.ev('clear'); } else this.doorOpen = true; }
  }
  // 겨냥: 장애물에 가리지 않은 적 중 가장 가까운 적 (없으면 그냥 가장 가까운 적)
  los(a, b) { const L = Math.sqrt(d2(a, b)), n = Math.ceil(L / 12), ox = -(b.y - a.y) / (L || 1) * 12, oy = (b.x - a.x) / (L || 1) * 12; for (let i = 1; i < n; i++) for (const k of [-1, 0, 1]) { const x = a.x + (b.x - a.x) * i / n + ox * k, y = a.y + (b.y - a.y) * i / n + oy * k, cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); if (this.grid[cy] && this.grid[cy][cx] === 1) return false; } return true; }
  nearest(p) { let b = null, bd = 1e12, v = null, vd = 1e12; for (const m of this.mons) { const d = d2(m, p); if (d < bd) { bd = d; b = m; } if (d < vd && this.los(p, m)) { vd = d; v = m; } } return v || b; }
  // 화살 쏘기: 능력에 따라 여러 방향 · 연속
  fire(t) {
    const p = this.p, a0 = Math.atan2(t.y - p.y, t.x - p.x), sk = this.sk;
    const nf = 1 + (sk.front || 0), dmgMul = (nf > 1 ? Math.pow(0.88, nf - 1) : 1) * ((sk.multi || 0) ? Math.pow(0.9, sk.multi) : 1);
    const vol = () => {
      for (let i = 0; i < nf; i++) { const off = (i - (nf - 1) / 2) * 26; this.arrow(p.x + Math.cos(a0 + Math.PI / 2) * off, p.y + Math.sin(a0 + Math.PI / 2) * off, a0, dmgMul); }
      for (let k = 0; k < (sk.diag || 0); k++) for (const s of [-1, 1]) this.arrow(p.x, p.y, a0 + s * (Math.PI / 4 + k * 0.12), dmgMul);
      for (let k = 0; k < (sk.side || 0); k++) for (const s of [-1, 1]) this.arrow(p.x, p.y, a0 + s * (Math.PI / 2 + k * 0.1), dmgMul);
      for (let k = 0; k < (sk.rear || 0); k++) this.arrow(p.x, p.y, a0 + Math.PI + (k ? 0.15 : 0), dmgMul);
    };
    vol();
    for (let k = 0; k < (sk.multi || 0); k++) this.later.push({ at: this.t + 0.11 * (k + 1), fn: vol });
    this.ev('shoot');
  }
  later = [];
  arrow(x, y, a, mul, kind = 'arrow') { this.shots.push({ x, y, vx: Math.cos(a) * 1500, vy: Math.sin(a) * 1500, a, mul, kind, hit: new Set(), bounce: 2 * (this.sk.ricochet || 0), wall: this.sk.wall ? 2 : 0, life: 1.6 }); }
  moveShots(dt) {
    for (const l of this.later.filter(l => l.at <= this.t)) l.fn(); this.later = this.later.filter(l => l.at > this.t);
    for (const s of this.shots) {
      s.life -= dt; const steps = 3;
      for (let k = 0; k < steps && s.life > 0; k++) {
        s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
        // 벽 · 장애물 (구덩이는 지나감)
        const cx = Math.floor(s.x / CELL), cy = Math.floor(s.y / CELL), out = s.x < 0 || s.y < 0 || s.x > AW || s.y > AH, blk = !out && this.grid[cy][cx] === 1;
        if (out || blk) {
          if (s.wall > 0) { s.wall--; if (s.x < 0 || s.x > AW || (blk && (Math.floor((s.x - s.vx * dt / steps) / CELL) !== cx))) s.vx = -s.vx; else s.vy = -s.vy; s.x = clamp(s.x, 1, AW - 1); s.y = clamp(s.y, 1, AH - 1); s.a = Math.atan2(s.vy, s.vx); }
          else { s.life = 0; break; }
        }
        for (const m of this.mons) {
          if (s.hit.has(m.id) || d2(s, m) > (m.r + 10) ** 2) continue;
          s.hit.add(m.id); this.hitBy(m, s);
          if (s.bounce > 0) { s.bounce--; const nx = this.mons.filter(o => o !== m && !s.hit.has(o.id)).sort((a, b) => d2(a, m) - d2(b, m))[0]; if (nx) { const a = Math.atan2(nx.y - m.y, nx.x - m.x); s.vx = Math.cos(a) * 1500; s.vy = Math.sin(a) * 1500; s.a = a; s.x = m.x; s.y = m.y; continue; } }
          if (!this.sk.pierce || s.kind === 'spirit') { s.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
  }
  hitBy(m, s) {
    let dmg = this.atk * s.mul; const crit = this.R() < this.crit;
    if (crit) dmg *= 2;
    if (this.sk.head && !m.boss && !m.mid && this.R() < 0.03) { dmg = m.hp + 1; this.ev('head', { x: m.x, y: m.y }); }
    this.hurt(m, dmg, crit);
    if (this.sk.fire) m.burn = 2;
    if (this.sk.frost) m.slow = 2;
    if (this.sk.poison) m.poison = Math.min(5, m.poison + 1);
    if (this.sk.bolt) { for (const o of this.mons.filter(o => o !== m).sort((a, b) => d2(a, m) - d2(b, m)).slice(0, 2)) { if (d2(o, m) > 420 ** 2) break; this.hurt(o, this.atk * 0.35, false, 'bolt'); this.ev('bolt', { x1: m.x, y1: m.y, x2: o.x, y2: o.y }); } }
  }
  hurt(m, dmg, crit = false, el = null) {
    if (m.hp <= 0) return;
    m.hp -= dmg; this.ev('dmg', { id: m.id, x: m.x, y: m.y - m.r, v: Math.round(dmg), crit, el });
    if (m.hp <= 0) this.killMon(m);
  }
  killMon(m) {
    this.mons = this.mons.filter(o => o !== m); this.kills++;
    const M = m.boss ? BOSSES[m.type] : MONS[m.type], g = Math.round((M.gold || 3) * (m.mid ? 8 : 1) * (1 + this.room * 0.05));
    for (let i = 0; i < Math.min(6, Math.ceil(g / 3)); i++) this.drops.push({ k: 'gold', v: Math.ceil(g / Math.min(6, Math.ceil(g / 3))), x: m.x + (this.R() - 0.5) * 60, y: m.y + (this.R() - 0.5) * 60 });
    this.drops.push({ k: 'xp', v: m.boss ? 400 : m.mid ? 120 : 12 + this.room, x: m.x, y: m.y });
    if (this.sk.blood) this.healBy(this.p.maxHp * 0.015 * this.sk.blood * (m.boss || m.mid ? 6 : 1));
    if (!m.boss && MONS[m.type].split && !m.mid) for (const s of [-1, 1]) { const c = this.addMon(MONS[m.type].split, m.x + s * 30, m.y); c.cd = 0.6; }
    this.ev('kill', { id: m.id, mt: m.type, x: m.x, y: m.y, boss: m.boss || m.mid });
  }
  addXp(v) { this.xp += v; while (this.xp >= this.xpNeed()) { this.xp -= this.xpNeed(); this.lvl++; this.ev('levelup', { lvl: this.lvl }); } }
  // ── 몬스터 행동 ──
  moveMons(dt) {
    const p = this.p, dmgMul = this.ch.dmgMul;
    for (const m of [...this.mons]) {
      const M = m.boss ? BOSSES[m.type] : MONS[m.type], slow = m.slow > 0 ? 0.5 : 1;
      m.slow = Math.max(0, m.slow - dt);
      if (m.burn > 0) { m.burn -= dt; m.bt = (m.bt || 0) - dt; if (m.bt <= 0) { m.bt = 0.5; this.hurt(m, this.atk * 0.18, false, 'fire'); } }
      if (m.poison > 0) { m.pt = (m.pt || 0) - dt; if (m.pt <= 0) { m.pt = 0.6; this.hurt(m, this.atk * 0.08 * m.poison, false, 'poison'); } }
      if (m.hp <= 0) continue;
      m.cd -= dt * slow;
      const dx = p.x - m.x, dy = p.y - m.y, dl = Math.hypot(dx, dy) || 1, sp = (M.spd || 0) * slow;
      const go = (vx, vy) => { const nx = m.x + vx * dt, ny = m.y + vy * dt, fly = M.fly || M.ai === 'fly'; if (nx > m.r && nx < AW - m.r && (fly || this.free(nx, m.y))) m.x = nx; if (ny > m.r && ny < AH - m.r && (fly || this.free(m.x, ny))) m.y = ny; };
      if (m.boss) this.bossAct(m, M, dt, dx, dy, dl, slow);
      else switch (M.ai) {
        case 'chase': go(dx / dl * sp, dy / dl * sp); break;
        case 'fly': go(dx / dl * sp + Math.sin(this.t * 3 + m.x) * 60, dy / dl * sp); break;
        case 'hop': if (m.st > 0) { m.st -= dt; go(m.vx, m.vy); } else if (m.cd <= 0) { m.cd = 1.4; m.st = 0.45; m.vx = dx / dl * sp * 3; m.vy = dy / dl * sp * 3; } break;
        case 'dash': if (m.st > 0) { m.st -= dt; go(m.vx, m.vy); } else if (m.cd <= 0) { m.cd = 2.2; m.st = 0.5; m.vx = dx / dl * sp * 5; m.vy = dy / dl * sp * 5; this.ev('dash', { id: m.id }); } else go(dx / dl * sp * 0.3, dy / dl * sp * 0.3); break;
        case 'shoot': if (dl > 500) go(dx / dl * sp, dy / dl * sp); if (m.cd <= 0) { m.cd = 2; this.foe(m.x, m.y, Math.atan2(dy, dx), 520, M.dmg * dmgMul); } break;
        case 'spread': if (m.cd <= 0) { m.cd = 2.6; const a = Math.atan2(dy, dx); for (const o of [-0.35, 0, 0.35]) this.foe(m.x, m.y, a + o, 420, M.dmg * dmgMul); } if (sp) go(dx / dl * sp * 0.5, dy / dl * sp * 0.5); break;
        case 'ring': go(dx / dl * sp * 0.6 + Math.cos(this.t * 2 + m.y) * 80, dy / dl * sp * 0.6); if (m.cd <= 0) { m.cd = 3; for (let i = 0; i < 8; i++) this.foe(m.x, m.y, i * Math.PI / 4 + this.t, 360, M.dmg * dmgMul); } break;
      }
      // 몸통 부딪힘
      if (d2(m, p) < (m.r + p.r - 6) ** 2) this.hit((m.boss ? M.dmg : M.dmg) * dmgMul * (m.mid ? 1.4 : 1));
    }
  }
  bossAct(m, B, dt, dx, dy, dl, slow) {
    const p = this.p, dm = B.dmg * (this.ch.dmgMul);
    if (m.st > 0) { m.st -= dt; const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt; if (nx > m.r && nx < AW - m.r) m.x = nx; else m.st = 0; if (ny > m.r && ny < AH - m.r) m.y = ny; else m.st = 0; return; }
    m.x += dx / dl * B.spd * slow * dt * 0.6; m.y += clamp(dy / dl * B.spd * slow * dt * 0.6, -99, m.y > AH * 0.55 ? 0 : 99);
    if (m.cd > 0) return;
    const enraged = m.hp < m.maxHp * 0.5, pat = B.pats[m.pat++ % B.pats.length];
    m.cd = (enraged ? 1.5 : 2.2);
    const a = Math.atan2(dy, dx);
    this.ev('bossatk', { pat });
    if (pat === 'spread') for (let i = -3; i <= 3; i++) this.foe(m.x, m.y, a + i * 0.18, 480, dm * 0.6);
    if (pat === 'ring') { const n = enraged ? 20 : 14; for (let i = 0; i < n; i++) this.foe(m.x, m.y, i * Math.PI * 2 / n + (m.pat % 2) * 0.2, 380, dm * 0.55); }
    if (pat === 'slam') { for (let i = 0; i < 12; i++) this.foe(m.x, m.y + 40, i * Math.PI / 6, 300, dm * 0.6); for (let i = 0; i < 12; i++) this.later.push({ at: this.t + 0.4, fn: () => this.foe(m.x, m.y + 40, i * Math.PI / 6 + 0.26, 300, dm * 0.6) }); }
    if (pat === 'dash') { m.st = 0.7; m.vx = dx / dl * 900; m.vy = dy / dl * 900; }
    if (pat === 'breath') for (let k = 0; k < 6; k++) this.later.push({ at: this.t + k * 0.12, fn: () => { const aa = Math.atan2(p.y - m.y, p.x - m.x); for (const o of [-0.25, 0, 0.25]) this.foe(m.x, m.y + 40, aa + o, 560, dm * 0.45, 'ice'); } });
    if (pat === 'summon' && this.mons.length < 6) for (const s of [-1, 1]) this.addMon(B.summon, m.x + s * 180, m.y + 80);
  }
  foe(x, y, a, sp, dmg, kind = 'orb') { this.foes.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, r: 18, kind, life: 5 }); this.ev('enemyshot'); }
  moveFoes(dt) {
    const p = this.p;
    for (const f of this.foes) {
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
      const cx = Math.floor(f.x / CELL), cy = Math.floor(f.y / CELL);
      if (f.x < 0 || f.y < 0 || f.x > AW || f.y > AH || (this.grid[cy] && this.grid[cy][cx] === 1)) f.life = 0;
      if (f.life > 0 && d2(f, p) < (f.r + p.r - 8) ** 2) { f.life = 0; this.hit(f.dmg); }
    }
    this.foes = this.foes.filter(f => f.life > 0);
  }
  hit(dmg) {
    const p = this.p; if (p.inv > 0 || this.over) return;
    if (this.R() < this.dodge) { p.inv = 0.4; this.ev('dodge'); return; }
    p.hp -= Math.round(dmg); p.inv = this.sk.star ? 1 : 0.7; this.ev('hurt', { v: Math.round(dmg) });
    if (p.hp <= 0) { p.hp = 0; this.over = true; this.win = false; this.ev('dead'); }
  }
  // 되살리기 (한 판에 한 번): 체력 절반, 주변 적 탄 지움
  revive() { this.over = false; this.p.hp = Math.round(this.p.maxHp * 0.5); this.p.inv = 2.5; this.foes = []; this.revived = true; this.ev('revive'); }
}
