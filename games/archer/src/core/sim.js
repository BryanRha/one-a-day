// 전투 규칙 (화면과 무관): 방 · 영웅 이동/자동 사격 · 화살 · 몬스터 AI · 적 탄 · 능력 · 레벨업
// 좌표는 방 안의 픽셀 (가로 AW × 세로 AH). 한 칸 = CELL.
import { HEROES, SKILLS, SKILL_KEYS, SRAR, MONS, BOSSES, CHAPTERS, ROOMS, SLOTS } from './data.js?v=0.17.11';

// 밸런스 조절값 (봇으로 찾음): 장 안에서 방마다 몬스터 체력 증가 · 9번 방 이후 공격 증가 · 보스 체력 배율
export const TUNE = { hpRamp: 0.08, dmgLate: 0.03, boss: [4, 5.4, 6.2] };
export const CELL = 120, COLS = 9, ROWS = 16, AW = CELL * COLS, AH = CELL * ROWS;   // 세로 화면에 맞춘 방 (9 × 16)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// 방 모양 (원작처럼 손으로 짠 방): # 벽(화살·이동 막음) · ~ 물/구덩이(이동만 막음, 화살은 지나감) · ^ 가시 함정(주기적으로 솟음)
// R = 원거리 몬스터 자리(물·벽 뒤) · M = 근접 몬스터 자리 · 위 가운데 = 문 · 아래 가운데 = 시작 자리 (16줄 × 9칸)
const MAPS = [
  ['.........', '.........', '..R...R..', '.........', '..#...#..', '.........', '...M.M...', '.........', '..#...#..', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '..R...R..', '.........', '~~~~.~~~~', '.........', '.M.....M.', '.........', '.........', '...^^^...', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.R.....R.', '.........', '.##...##.', '.........', '....M....', '...###...', '.........', '.M.....M.', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '.~~R.R~~.', '.~~...~~.', '.........', '.M.....M.', '.........', '##.....##', '.........', '...^.^...', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '....R....', '.........', '#.#...#.#', '.........', '..M...M..', '.........', '.^^...^^.', '.........', '#.#...#.#', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.R.....R.', '.........', '..~~~~~..', '..~...~..', '..~.M.~..', '..~...~..', '.........', '.M.....M.', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', 'R.......R', '###...###', '.........', '....M....', '...^^^...', '.........', '###...###', '.........', '.M.....M.', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '..R...R..', '.........', '.#.#.#.#.', '.........', '.M..M..M.', '.........', '.#.#.#.#.', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.R.....R.', '~~.....~~', '~~..#..~~', '~~.....~~', '~~.M.M.~~', '~~.....~~', '~~..#..~~', '~~.....~~', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '.R..#..R.', '....#....', '.^..#..^.', '.M.....M.', '.........', '..##.##..', '.........', '....M....', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '..R.R.R..', '.........', '~~~...~~~', '~~~...~~~', '.........', '.M.^.^.M.', '.........', '...#.#...', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.R.....R.', '.#.....#.', '.#..M..#.', '.#.....#.', '.###.###.', '.........', '.........', '.^^...^^.', '.........', '.M.....M.', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '..#R.R#..', '..#...#..', '..##.##..', '.........', 'M.......M', '.........', '.~~...~~.', '.~~...~~.', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', 'R.......R', '.........', '.^.^.^.^.', '.........', '..M...M..', '.........', '#..#.#..#', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '...R.R...', '.~.....~.', '.~.###.~.', '.~.....~.', '.~.M.M.~.', '.~.....~.', '.~~...~~.', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.R..R..R.', '.........', '##.....##', '...^.^...', '.M.....M.', '.........', '...#.#...', '.........', '##.....##', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '.R.....R.', '.#.....#.', '...#.#...', '.M.....M.', '...#.#...', '.#.....#.', '.........', '.^.....^.', '.........', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '..R...R..', '~~~...~~~', '.........', '.M.....M.', '.........', '~~~...~~~', '.........', '..M...M..', '.........', '.........', '.........', '.........', '.........', '.........', '.........'],
];
// 보스·우두머리 방: 넓게 · 가장자리에 가시나 기둥 몇 개
const ARENAS = [
  ['.........', '.........', '.........', '.........', '.#.....#.', '.........', '.........', '.........', '.........', '.........', '.#.....#.', '.........', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '.........', '^.......^', '.........', '.........', '.........', '^.......^', '.........', '.........', '.........', '^.......^', '.........', '.........', '.........', '.........'],
  ['.........', '.........', '.........', '.........', '..#...#..', '.........', '.........', '.........', '.........', '.........', '..#...#..', '.........', '.........', '.........', '.........', '.........'],
];
export const roomKind = n => (n === ROOMS ? 'boss' : n === 10 ? 'mid' : n === 5 || n === 15 ? 'special' : 'fight');

export class Sim {
  // run: 이번 판 상태 (장, 방 번호, 영웅 능력치 · 능력 목록 · 체력) — 방을 넘어가도 유지
  constructor(o = {}) {
    this.R = rng(o.seed || 7);
    this.ch = CHAPTERS[(o.chapter || 1) - 1];
    const H = HEROES[o.hero || 'arin'];
    // 장비 능력치 (data.gearStats 결과) · fx = 세트 효과 { '세트.칸': 1 영웅 | 2 신화 }
    const g = this.g = { atk: 0, hp: 0, atkPct: 0, hpPct: 0, crit: 0, critDmg: 0, dodge: 0, projRed: 0, healPct: 0, fx: {}, wsub: null, ...(o.gear || {}) };
    this.fx = g.fx || {};
    this.hero = o.hero || 'arin';
    this.base = { hp: Math.round((H.hp + g.hp) * (1 + g.hpPct)), atk: H.atk + g.atk, atkPct: g.atkPct, aspd: H.aspd, crit: 0.05 + g.crit, critDmg: 2 + g.critDmg, spd: 340 * (o.hero === 'mir' ? 1.15 : 1) };
    // 세트 효과 상태: 콤보 · 다음 피해 2배 · 다음 대각 화살 · 불꽃 방패 · 다음 공격 폭발 · 지뢰
    Object.assign(this, { combo: 0, comboT: 0, dbl: false, nextDiag: 0, shield: 0, shieldCd: 0, nextBoom: false, boomT: 5, amT: 2, auraT: 0, mines: [] });
    this.sk = {};   // 능력 이름 → 중첩 수
    if (o.hero === 'theo') this.sk.fire = 1;
    if (o.hero === 'yuna') this.sk.frost = 1;
    this.p = { x: AW / 2, y: AH - CELL * 1.5, r: 38, hp: this.base.hp, maxHp: this.base.hp, inv: 0, cd: 0, moving: false, face: -Math.PI / 2 };
    this.lvl = 1; this.xp = 0; this.gold = 0; this.gems = 0; this.room = 0; this.kills = 0; this.over = false; this.win = false;
    this.events = []; this.t = 0;
    this.nextRoom();
  }
  ev(type, d = {}) { this.events.push({ type, ...d }); }
  // ── 능력치 계산 ──
  // 원작 2 피해 공식: 공격력 = (영웅 + 장비) × (1 + 공격% 합) · 화살 피해 = 공격력 × 화살 배율 × 치명타
  get atk() { return this.base.atk * (1 + this.base.atkPct + 0.25 * (this.sk.atk || 0)); }
  get aspd() { const f = this.fx['neb.ring']; return this.base.aspd * (1 + 0.2 * (this.sk.aspd || 0) + (f ? Math.min(f === 2 ? 0.16 : 0.08, Math.floor(this.combo / 5) * (f === 2 ? 0.04 : 0.02)) : 0)); }
  get crit() { return this.base.crit + 0.1 * (this.sk.crit || 0); }
  get dodge() { return 1 - Math.pow(0.88, this.sk.dodge || 0) + (this.hero === 'mir' ? 0.08 : 0) + this.g.dodge + (this.fx['blaze.boots'] === 2 ? 0.1 : 0); }
  xpNeed() { return Math.round(90 + this.lvl * 75); }   // 원작처럼 한 판에 레벨 업 12~14번 정도 (능력은 레벨 업 때만)

  // ── 방 ──
  nextRoom() {
    this.room++;
    if (this.room > ROOMS) { this.over = true; this.win = true; this.ev('clear'); return; }
    const kind = roomKind(this.room), R = this.R;
    this.kind = kind; this.cleared = false; this.doorOpen = false; this.waves = 1; this.wave = 1; this.waveT = 0; this.warns = []; this.pendingSp = []; this.mons = []; this.shots = []; this.foes = []; this.drops = []; this.npc = null;
    // 지형
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));   // 0 바닥 · 1 막힘(장애물) · 2 구덩이(화살은 지나감)
    const map = kind === 'fight' ? MAPS[Math.floor(R() * MAPS.length)] : kind === 'special' ? ARENAS[0].map(r => r.replace(/[#^]/g, '.')) : ARENAS[Math.floor(R() * ARENAS.length)];
    const flip = R() < 0.5; this.spots = { R: [], M: [] }; this.spikes = [];
    map.forEach((row, y) => [...row].forEach((ch, x0) => {
      const x = flip ? COLS - 1 - x0 : x0; if (Math.abs(x - 4) <= 1 && (y <= 1 || y >= ROWS - 3)) return;   // 문 앞길 · 시작 자리는 비움
      if (ch === '#') this.grid[y][x] = 1; else if (ch === '~') this.grid[y][x] = 2; else if (ch === '^') this.spikes.push({ cx: x, cy: y }); else if (ch === 'R' || ch === 'M') this.spots[ch].push({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL });
    }));
    this.spikeT = 0; this.flowT = 0; this.flow = null;
    this.p.x = AW / 2; this.p.y = AH - CELL * 2.5; this.p.inv = this.sk.star ? 2 : 0.6;
    this.orbA = 0;
    if (kind === 'special') { this.npc = { type: this.room === 5 ? 'angel' : 'devil', x: AW / 2, y: AH * 0.4, used: false }; this.cleared = true; this.doorOpen = true; }
    else if (kind === 'boss' || kind === 'mid') this.spawnBoss(kind);
    else { this.waves = this.room < 4 ? 2 : 3; this.wave = 0; this.nextWave(); }
    this.ev('room', { n: this.room, kind });
  }
  flowMap() {
    const D = Array.from({ length: ROWS }, () => Array(COLS).fill(1e9)), sx = Math.floor(this.p.x / CELL), sy = Math.floor(this.p.y / CELL), q = [[sx, sy]];
    if (!D[sy]) return null; D[sy][sx] = 0;
    for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || this.grid[ny][nx] || D[ny][nx] <= D[y][x] + 1) continue; D[ny][nx] = D[y][x] + 1; q.push([nx, ny]); } }
    return D;
  }
  // 몬스터가 갈 방향: 영웅이 바로 보이면 곧장, 아니면 거리 지도에서 더 가까운 옆 칸 쪽으로
  toward(m) {
    const p = this.p, dx = p.x - m.x, dy = p.y - m.y, dl = Math.hypot(dx, dy) || 1, D = this.flow;
    if (!D || dl < CELL * 1.2 || this.walkLine(m, p)) return [dx / dl, dy / dl];
    const cx = Math.floor(m.x / CELL), cy = Math.floor(m.y / CELL); if (!D[cy]) return [dx / dl, dy / dl];
    let best = null, bd = D[cy][cx];
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const nx = cx + ax, ny = cy + ay; if (!D[ny] || D[ny][nx] === undefined || D[ny][nx] >= bd) continue; if (ax && ay && (this.grid[cy][nx] || this.grid[ny][cx])) continue; bd = D[ny][nx]; best = [nx, ny]; }
    if (!best) return [dx / dl, dy / dl];
    const tx = (best[0] + 0.5) * CELL - m.x, ty = (best[1] + 0.5) * CELL - m.y, tl = Math.hypot(tx, ty) || 1; return [tx / tl, ty / tl];
  }
  walkLine(a, b) { const L = Math.sqrt(d2(a, b)), n = Math.ceil(L / 40); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n, g = this.grid[Math.floor(y / CELL)]; if (g && g[Math.floor(x / CELL)]) return false; } return true; }
  free(x, y) { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && this.grid[cy][cx] === 0; }
  nextWave() { this.wave++; this.waveT = 18; this.spawnWave(); this.ev('wave', { n: this.wave, of: this.waves }); }
  spawnWave() {
    // 원작 2처럼 첫 웨이브부터 여럿이 섞여 나옴 (근접·원거리·돌진) · 뒤쪽 방은 이전과 비슷
    const n = 5 + Math.floor(this.room / 5) + Math.floor(this.R() * 2) + (this.wave > 1 ? 1 : 0), list = this.ch.mons;
    const pool = this.room < 4 ? list.slice(0, 2) : this.room < 8 ? list.slice(0, 3) : list;
    // 원작처럼 자리 배치: 원거리 몬스터는 R 자리(물·벽 뒤) · 근접은 M 자리 · 자리가 모자라면 영웅과 먼 빈 곳
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const type = this.room < 4 && i === 0 ? list[2] : pool[Math.floor(this.R() * pool.length)], rng = ['shoot', 'spread', 'ring'].includes(MONS[type].ai);
      const spots = (this.spots[rng ? 'R' : 'M'] || []).filter((_, j) => !used.has((rng ? 'R' : 'M') + j));
      let x, y;
      if (spots.length) { const j = Math.floor(this.R() * spots.length), sp = spots[j]; used.add((rng ? 'R' : 'M') + this.spots[rng ? 'R' : 'M'].indexOf(sp)); x = sp.x + (this.R() - 0.5) * 40; y = sp.y + (this.R() - 0.5) * 40; }
      else { let k = 0; do { x = CELL * (0.7 + this.R() * (COLS - 1.4)); y = CELL * (1 + this.R() * (ROWS * 0.6)); k++; } while ((!this.free(x, y) || d2({ x, y }, this.p) < 500 ** 2) && k < 40); }
      // 원작처럼 등장 자리에 빨간 표시가 먼저 뜨고 0.8초 뒤 나타남
      this.pendingSp.push({ type, x, y, t: 0.8 }); this.warns.push({ k: 'spawn', x, y, r: 60, t: 0.8, T: 0.8 });
    }
  }
  // 막힌 칸이면 가장 가까운 빈 칸 가운데로
  unstick(o) { if (this.free(o.x, o.y)) return; let best = null; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (this.grid[y][x]) continue; const c = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 }, d = d2(c, o); if (!best || d < best.d) best = { ...c, d }; } if (best) { o.x = best.x; o.y = best.y; } }
  addMon(type, x, y, hpMul = 1) {
    const M = MONS[type], scale = this.ch.hpMul * (1 + (this.room - 1) * TUNE.hpRamp);
    const m = { id: Math.random().toString(36).slice(2, 8), type, x, y, r: M.r * 1.3, hp: M.hp * scale * hpMul, maxHp: M.hp * scale * hpMul, cd: 0.8 + this.R() * 1.2, st: 0, vx: 0, vy: 0, burn: 0, slow: 0, poison: 0, boss: false };
    if (!MONS[type].fly) this.unstick(m);
    this.mons.push(m); this.ev('spawn', { id: m.id, mt: type }); return m;
  }
  spawnBoss(kind) {
    if (kind === 'mid') { const m = this.addMon(this.ch.mid, AW / 2, AH * 0.3, 6); m.r *= 1.4; m.mid = true; m.sz = 1.5; this.ev('boss', { name: `우두머리 ${MONS[this.ch.mid].name}`, mid: true }); return; }
    const B = BOSSES[this.ch.boss];
    const bh = B.hp * TUNE.boss[this.ch.id - 1], m = { id: 'boss', type: this.ch.boss, boss: true, x: AW / 2, y: AH * 0.28, r: B.r * 1.15, hp: bh, maxHp: bh, cd: 1.6, st: 0, pat: 0, vx: 0, vy: 0, burn: 0, slow: 0, poison: 0 };
    this.mons.push(m); this.ev('boss', { name: B.name });
  }
  // ── 능력 고르기 ──
  offer(n = 3) {
    const have = this.sk, pool = SKILL_KEYS.filter(k => (have[k] || 0) < SKILLS[k].max && !(k === 'heal' && this.p.hp >= this.p.maxHp * 0.9));
    const out = [];
    while (out.length < n && pool.length) {
      const wt = k => SKILLS[k].w * SRAR[SKILLS[k].rar || 1].w, tot = pool.reduce((a, k) => a + wt(k), 0); let r = this.R() * tot, i = 0;
      while ((r -= wt(pool[i])) > 0 && i < pool.length - 1) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  take(k) {
    const S = SKILLS[k]; if (!S) return;
    if (k === 'heal') { this.healBy(this.p.maxHp * 0.4); }
    else this.sk[k] = (this.sk[k] || 0) + 1;
    if (k === 'hpup' || k === 'star') { const add = Math.round(this.base.hp * (k === 'star' ? 0.15 : 0.2)); this.p.maxHp += add; this.p.hp += add; }
    this.ev('skill', { k });
  }
  healBy(v) { v *= 1 + this.g.healPct; const b = this.p.hp; this.p.hp = Math.min(this.p.maxHp, this.p.hp + v); if (this.p.hp > b) this.ev('heal', { v: Math.round(this.p.hp - b) }); }
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
    if (!p.moving && target && p.cd <= 0) { this.fire(target); p.cd = 1 / (1.2 * this.aspd) + 0.133 * (this.sk.multi || 0); }   // 연속 사격: 공격 간격 +8프레임 (원작)
    if (target && !p.moving) p.face = Math.atan2(target.y - p.y, target.x - p.x);
    // 정령 친구
    for (let i = 0; i < (this.sk.spirit || 0); i++) { const k = `sp${i}`; this[k] = (this[k] || 0) - dt; if (this[k] <= 0 && target) { this[k] = 1.1; const sx = p.x + (i ? 70 : -70), sy = p.y - 50; this.arrow(sx, sy, Math.atan2(target.y - sy, target.x - sx), 0.5, 'spirit'); } }
    // 구슬 (몸 주위를 돎)
    this.orbA += dt * 3.2;
    // 구슬: 능력 하나에 2개 (원작) · 닿으면 공격 1.25배 (같은 적은 0.5초에 한 번)
    const orbs = []; const nf = 2 * (this.sk.orbfire || 0), no = nf + 2 * (this.sk.orbice || 0);
    for (let i = 0; i < no; i++) { const a = this.orbA + i * Math.PI * 2 / no; orbs.push({ x: p.x + Math.cos(a) * 130, y: p.y + Math.sin(a) * 130, ice: i >= nf }); }
    this.orbs = orbs;
    for (const m of this.mons) m.orbCd = (m.orbCd || 0) - dt;
    for (const o of orbs) for (const m of this.mons) if (m.orbCd <= 0 && d2(o, m) < (m.r + 26) ** 2) { m.orbCd = 0.5; this.hurt(m, this.atk * 1.25, false, o.ice ? 'ice' : 'fire'); if (o.ice) m.slow = 1.2; else m.burn = Math.max(m.burn, 1.5); }
    for (const sp of this.pendingSp) if ((sp.t -= dt) <= 0) this.addMon(sp.type, sp.x, sp.y);
    this.pendingSp = this.pendingSp.filter(sp => sp.t > 0);
    this.setTick(dt);
    // 가시 함정: 3초마다 0.8초 경고 후 1초 솟음 · 솟은 가시 위에 서 있으면 피해
    if (this.spikes.length) { this.spikeT = (this.spikeT + dt) % 3; this.spikeUp = this.spikeT >= 2; this.spikeWarn = this.spikeT >= 1.2 && this.spikeT < 2;
      if (this.spikeUp) { const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL); if (this.spikes.some(k => k.cx === cx && k.cy === cy)) { this.src = 'trap'; this.hit(p.maxHp * 0.06 + 40 * this.dmgMulNow()); this.src = null; } } }
    // 길 찾기 지도: 영웅 칸에서 퍼져 나가는 거리 (근접 몬스터가 벽을 돌아서 옴)
    if ((this.flowT -= dt) <= 0) { this.flowT = 0.3; this.flow = this.flowMap(); }
    this.moveShots(dt);
    this.moveMons(dt);
    this.moveFoes(dt);
    // 줍기: 금화·보석 (가까우면 끌려옴, 방을 깨면 전부 끌려옴)
    for (const d of this.drops) { const dd = Math.sqrt(d2(d, p)); if (this.cleared || dd < 220) { const s = Math.min(1, dt * (this.cleared ? 9 : 6)); d.x += (p.x - d.x) * s; d.y += (p.y - d.y) * s; } if (dd < 40) { d.got = true; if (d.k === 'gold') this.gold += d.v; else this.addXp(d.v); this.ev('pick', { k: d.k }); } }
    this.drops = this.drops.filter(d => !d.got);
    // 방 끝
    // 웨이브: 다 쓰러뜨리거나 시간이 다 되면 다음 웨이브
    if (!this.cleared && this.kind === 'fight' && this.wave < this.waves) { this.waveT -= dt; if ((!this.mons.length && !this.pendingSp.length) || this.waveT <= 0) this.nextWave(); }
    for (const w of this.warns) w.t -= dt; this.warns = this.warns.filter(w => w.t > 0);
    if (!this.cleared && !this.mons.length && !this.pendingSp.length && this.wave >= this.waves) { this.cleared = true; this.foes = []; this.mines = [];
      const ns = this.kind === 'boss' ? 3 : this.kind === 'mid' ? 2 : this.R() < 0.35 ? 1 : 0; if (ns) this.drop({ kind: 'scroll', n: ns }, p); this.ev('cleared', { kind: this.kind }); if (this.kind === 'boss') { this.over = true; this.win = true; this.ev('clear'); } else this.doorOpen = true; }
  }
  // 겨냥: 장애물에 가리지 않은 적 중 가장 가까운 적 (없으면 그냥 가장 가까운 적)
  los(a, b) { const L = Math.sqrt(d2(a, b)), n = Math.ceil(L / 12), ox = -(b.y - a.y) / (L || 1) * 12, oy = (b.x - a.x) / (L || 1) * 12; for (let i = 1; i < n; i++) for (const k of [-1, 0, 1]) { const x = a.x + (b.x - a.x) * i / n + ox * k, y = a.y + (b.y - a.y) * i / n + oy * k, cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); if (this.grid[cy] && this.grid[cy][cx] === 1) return false; } return true; }
  nearest(p) { let b = null, bd = 1e12, v = null, vd = 1e12; for (const m of this.mons) { const d = d2(m, p); if (d < bd) { bd = d; b = m; } if (d < vd && this.los(p, m)) { vd = d; v = m; } } return v || b; }
  // 화살 쏘기: 능력에 따라 여러 방향 · 연속
  fire(t) {
    const p = this.p, a0 = Math.atan2(t.y - p.y, t.x - p.x), sk = this.sk;
    const nf = 1 + (sk.front || 0), dmgMul = Math.max(0.3, 1 - 0.15 * (nf - 1));   // 앞쪽 화살 1개마다 화살 위력 -15% (원작 2)
    const xd = this.nextDiag; this.nextDiag = 0;   // 성운 갑옷: 콤보 보너스 대각 화살
    for (let k = 0; k < xd; k++) for (const s of [-1, 1]) this.arrow(p.x, p.y, a0 + s * (Math.PI / 5 + k * 0.1), dmgMul);
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
  arrow(x, y, a, mul, kind = 'arrow') { this.shots.push({ x, y, vx: Math.cos(a) * 1500, vy: Math.sin(a) * 1500, a, mul, kind, hit: new Set(), bounce: this.sk.ricochet || 0, wall: this.sk.wall || 0, life: 1.6 }); }
  moveShots(dt) {
    for (const l of this.later.filter(l => l.at <= this.t)) l.fn(); this.later = this.later.filter(l => l.at > this.t);
    for (const s of this.shots) {
      s.life -= dt; const steps = 3;
      for (let k = 0; k < steps && s.life > 0; k++) {
        s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
        // 벽 · 장애물 (구덩이는 지나감)
        const cx = Math.floor(s.x / CELL), cy = Math.floor(s.y / CELL), out = s.x < 0 || s.y < 0 || s.x >= AW || s.y >= AH, blk = !out && this.grid[cy][cx] === 1;
        if (out || blk) {
          if (s.wall > 0) { s.wall--; if (s.x < 0 || s.x > AW || (blk && (Math.floor((s.x - s.vx * dt / steps) / CELL) !== cx))) s.vx = -s.vx; else s.vy = -s.vy; s.x = clamp(s.x, 1, AW - 1); s.y = clamp(s.y, 1, AH - 1); s.a = Math.atan2(s.vy, s.vx); }
          else { s.life = 0; break; }
        }
        for (const m of this.mons) {
          if (s.hit.has(m.id) || d2(s, m) > (m.r + 10) ** 2) continue;
          s.hit.add(m.id); this.hitBy(m, s);
          if (s.bounce > 0) { s.bounce--; s.mul *= 0.6; const nx = this.mons.filter(o => o !== m && !s.hit.has(o.id)).sort((a, b) => d2(a, m) - d2(b, m))[0]; if (nx) { const a = Math.atan2(nx.y - m.y, nx.x - m.x); s.vx = Math.cos(a) * 1500; s.vy = Math.sin(a) * 1500; s.a = a; s.x = m.x; s.y = m.y; continue; } }
          if (!this.sk.pierce || s.kind === 'spirit') { s.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
  }
  hitBy(m, s) {
    const p = this.p, fx = this.fx, sk = this.sk, main = s.kind === 'arrow';
    // 송곳니: 가까울수록 · 주변 적이 많을수록
    const cf = clamp((1200 - Math.sqrt(d2(p, m))) / 800, 0, 1);
    let near = 0; if (fx['fang.ring'] || fx['fang.boots']) for (const o of this.mons) if (d2(o, p) < 520 ** 2) near++;
    near = Math.min(3, near);
    let crit = this.crit, cd = this.base.critDmg, mul = 1;
    if (fx['neb.weapon']) crit += Math.min(fx['neb.weapon'] === 2 ? 0.16 : 0.08, Math.floor(this.combo / 5) * (fx['neb.weapon'] === 2 ? 0.04 : 0.02));
    if (fx['fang.weapon']) crit += cf * (fx['fang.weapon'] === 2 ? 0.3 : 0.15);
    if (fx['fang.ring']) crit += near * (fx['fang.ring'] === 2 ? 0.06 : 0.03);
    if (fx['neb.boots'] && this.combo > (fx['neb.boots'] === 2 ? 20 : 30)) cd += fx['neb.boots'] === 2 ? 0.48 : 0.32;
    if (fx['fang.helm']) cd += cf * (fx['fang.helm'] === 2 ? 0.72 : 0.36);
    if (fx['fang.boots']) cd += near * (fx['fang.boots'] === 2 ? 0.24 : 0.12);
    if (main && this.g.wsub === 'neb') mul *= 1 + Math.min(0.1, this.combo * 0.005);
    if (main && this.g.wsub === 'fang') mul *= 1 + 0.2 * cf;
    const isCrit = this.R() < crit;
    let dmg = this.atk * s.mul * mul * (isCrit ? cd : 1);
    if (this.dbl) { dmg *= 2; this.dbl = false; }   // 성운 목걸이
    if (sk.head && !m.boss && !m.mid && this.R() < 0.03) { dmg = m.hp + 1; this.ev('head', { x: m.x, y: m.y }); }
    this.hurt(m, dmg, isCrit);
    if (main) this.addCombo(isCrit && fx['neb.helm'] ? (fx['neb.helm'] === 2 ? 3 : 2) : 1);
    if (!m.boss && m.hp > 0) { const l = Math.hypot(s.vx, s.vy) || 1, kb = m.mid ? 6 : 16, nx = m.x + s.vx / l * kb, ny = m.y + s.vy / l * kb, mg = m.r * 0.6; if (this.free(nx - mg, ny - mg) && this.free(nx + mg, ny + mg) && this.free(nx - mg, ny + mg) && this.free(nx + mg, ny - mg)) { m.x = nx; m.y = ny; } }
    // 속성 (원작 2 수치)
    if (sk.fire) { this.hurt(m, this.atk * 0.2, false, 'fire'); m.burn = 3; }
    if (sk.poison && !(m.pcd > 0)) { m.pcd = 0.4; this.hurt(m, this.atk * 0.5, false, 'poison'); m.poison = 1; }
    if (sk.frost && !(m.frzCd > 0)) { m.frzCd = 10; m.frz = m.boss ? 0.5 : 1.5; this.hurt(m, this.atk, false, 'ice'); }
    if (sk.bolt) { let n = 0; for (const o of this.mons) { if (o === m || n >= 4 || d2(o, m) > 420 ** 2) continue; n++; this.hurt(o, this.atk * 0.3, false, 'bolt'); this.ev('bolt', { x1: m.x, y1: m.y, x2: o.x, y2: o.y }); } }
    // 화염 세트
    if (main && this.g.wsub === 'blaze' && this.R() < (fx['blaze.weapon'] === 2 ? 0.45 : 0.3)) this.blast(m.x, m.y, 120, 0.35);
    if (main && fx['blaze.ring'] && this.R() < (fx['blaze.ring'] === 2 ? 0.24 : 0.12)) this.mines.push({ x: m.x, y: m.y, t: 0.8 });
    if (main && this.nextBoom) { this.nextBoom = false; this.boomT = 5; this.blast(m.x, m.y, 170, 0.8, false, fx['blaze.helm'] === 2); }
  }
  // 폭발: 반지름 안 모든 적에게 공격 k배 (화염 활 영웅이면 +200%)
  blast(x, y, r, k, plain = false, ignite = false) {
    const dmg = this.atk * k * (!plain && this.fx['blaze.weapon'] ? 2 : 1);
    for (const o of [...this.mons]) if (d2(o, { x, y }) < (r + o.r) ** 2) { this.hurt(o, dmg, false, plain ? 'wave' : 'boom'); if (ignite) o.burn = 3; }
    this.ev('blast', { x, y, r, plain });
  }
  addCombo(n) {
    const fx = this.fx, b = this.combo; this.combo += n; this.comboT = 2.5;
    const st = fx['neb.amulet'] === 2 ? 3 : 5; if (fx['neb.amulet'] && Math.floor(b / st) < Math.floor(this.combo / st)) this.dbl = true;
    if (fx['neb.armor'] && Math.floor(b / 5) < Math.floor(this.combo / 5)) this.nextDiag = fx['neb.armor'] === 2 ? 2 : 1;
  }
  // 세트 효과 시간 처리
  setTick(dt) {
    const fx = this.fx, p = this.p;
    if ((this.comboT -= dt) <= 0) this.combo = 0;
    if (fx['blaze.helm'] && !this.nextBoom && (this.boomT -= dt) <= 0) this.nextBoom = true;
    if (fx['blaze.amulet'] && this.mons.length && (this.amT -= dt) <= 0) { this.amT = 3; const ms = [...this.mons].sort(() => this.R() - 0.5).slice(0, fx['blaze.amulet'] === 2 ? 4 : 2); for (const m of ms) this.blast(m.x, m.y, 110, 0.5); }
    for (const mi of this.mines) if ((mi.t -= dt) <= 0) this.blast(mi.x, mi.y, 150, 0.6);
    this.mines = this.mines.filter(mi => mi.t > 0);
    if (fx['fang.armor'] && (this.auraT -= dt) <= 0) { this.auraT = 0.3; for (const m of [...this.mons]) if (d2(m, p) < 480 ** 2) this.hurt(m, this.atk * (fx['fang.armor'] === 2 ? 0.6 : 0.3), false, 'aura'); }
    this.shieldCd -= dt; if (this.shield > 0) { this.shield -= dt; if (fx['blaze.armor'] === 2) this.healBy(p.maxHp * 0.01 * dt); }
  }
  hurt(m, dmg, crit = false, el = null) {
    if (m.hp <= 0) return;
    m.hp -= dmg; this.ev('dmg', { id: m.id, x: m.x, y: m.y - m.r, v: Math.round(dmg), crit, el });
    if (m.hp <= 0) this.killMon(m);
  }
  killMon(m) {
    this.mons = this.mons.filter(o => o !== m); this.kills++;
    const M = m.boss ? BOSSES[m.type] : MONS[m.type], g = Math.round((M.gold || 3) * (m.mid ? 8 : 1) * (1 + this.room * 0.05));
    // 성능: 금화는 적 하나에 1개 (많이 쌓였으면 가까운 금화에 합침) · 경험치는 바로 들어옴
    const near = this.drops.length > 40 && this.drops.find(o => Math.abs(o.x - m.x) < 160 && Math.abs(o.y - m.y) < 160);
    if (near) near.v += g; else this.drops.push({ k: 'gold', v: g, x: m.x, y: m.y });
    this.addXp(m.boss ? 400 : m.mid ? 120 : 12 + this.room); this.ev('xp', { x: m.x, y: m.y });
    // 전투 중 장비 (원작 2): 보스 = 세트 고급·희귀 · 우두머리 = 고급 · 일반 적 = 가끔 기본 장비
    const SETR = () => ['neb', 'fang', 'blaze'][Math.floor(this.R() * 3)];
    if (m.boss) this.drop({ kind: 'gear', set: SETR(), t: this.R() < 0.3 ? 2 : 1 }, m);
    else if (m.mid) this.drop({ kind: 'gear', set: this.R() < 0.5 ? 'basic' : SETR(), t: 1 }, m);
    else if (this.R() < 0.015) this.drop({ kind: 'gear', set: 'basic', t: this.R() < 0.2 ? 1 : 0 }, m);
    if (this.sk.blood && this.R() < 0.25) this.healBy(this.p.maxHp * 0.04 * this.sk.blood);
    if (this.fx['blaze.helm']) this.nextBoom = true;
    if (!m.boss && MONS[m.type].split && !m.mid) for (const s of [-1, 1]) { const c = this.addMon(MONS[m.type].split, m.x + s * 30, m.y); c.cd = 0.6; }
    this.ev('kill', { id: m.id, mt: m.type, x: m.x, y: m.y, boss: m.boss || m.mid });
  }
  drop(it, at) { it.slot = SLOTS[Math.floor(this.R() * SLOTS.length)]; (this.loot ||= []).push(it); this.ev('loot', { ...it, x: at.x, y: at.y }); }
  addXp(v) { this.xp += v; while (this.xp >= this.xpNeed()) { this.xp -= this.xpNeed(); this.lvl++; this.ev('levelup', { lvl: this.lvl }); } }
  // ── 몬스터 행동 ──
  moveMons(dt) {
    const p = this.p, dmgMul = this.dmgMulNow();   // 장 초반 방은 공격이 약하다가 9번 방부터 제 세기
    for (const m of [...this.mons]) {
      const M = m.boss ? BOSSES[m.type] : MONS[m.type], slow = m.slow > 0 ? 0.5 : 1;
      m.slow = Math.max(0, m.slow - dt); m.pcd = (m.pcd || 0) - dt; m.frzCd = (m.frzCd || 0) - dt;
      if (m.burn > 0) { m.burn -= dt; m.bt = (m.bt || 0) - dt; if (m.bt <= 0) { m.bt = 0.5; this.hurt(m, this.atk * 0.15, false, 'fire'); } }
      if (m.poison > 0) { m.pt = (m.pt || 0) - dt; if (m.pt <= 0) { m.pt = 1; this.hurt(m, this.atk * 0.25, false, 'poison'); } }
      if (m.hp <= 0) continue;
      if (m.frz > 0) { m.frz -= dt; continue; }   // 얼면 멈춤 (공격·이동 없음)
      m.cd -= dt * slow;
      const dx = p.x - m.x, dy = p.y - m.y, dl = Math.hypot(dx, dy) || 1, sp = (M.spd || 0) * slow;
      const fly = M.fly || M.ai === 'fly', mg = m.r * 0.6, fr = (x, y) => fly || (this.free(x - mg, y - mg) && this.free(x + mg, y - mg) && this.free(x - mg, y + mg) && this.free(x + mg, y + mg));
      const go = (vx, vy) => { const nx = m.x + vx * dt, ny = m.y + vy * dt; if (nx > m.r && nx < AW - m.r && fr(nx, m.y)) m.x = nx; if (ny > m.r && ny < AH - m.r && fr(m.x, ny)) m.y = ny; };
      if (!fly && !m.boss && !this.free(m.x, m.y)) this.unstick(m);
      // 서로 겹치지 않게 살짝 밀어냄
      for (const o of this.mons) { if (o === m || o.boss) continue; const ox = m.x - o.x, oy = m.y - o.y, dd = ox * ox + oy * oy, rr = (m.r + o.r) * 0.8; if (dd > 0.01 && dd < rr * rr) { const l = Math.sqrt(dd), push = (rr - l) * 0.5; if (fr(m.x + ox / l * push, m.y + oy / l * push)) { m.x += ox / l * push; m.y += oy / l * push; } } }
      if (m.boss) this.bossAct(m, M, dt, dx, dy, dl, slow);
      else switch (M.ai) {
        case 'chase': { const [ux, uy] = this.toward(m); go(ux * sp, uy * sp); } break;
        case 'fly': go(dx / dl * sp + Math.sin(this.t * 3 + m.x) * 60, dy / dl * sp); break;
        case 'hop': if (m.st > 0) { m.st -= dt; go(m.vx, m.vy); } else if (m.cd <= 0) { const [ux, uy] = this.toward(m); m.cd = 1.4; m.st = 0.45; m.vx = ux * sp * 3; m.vy = uy * sp * 3; } break;
        case 'dash': if (m.st > 0) { m.st -= dt; go(m.vx, m.vy); } else if (m.wind > 0) { m.wind -= dt; if (m.wind <= 0) { m.st = 0.5; this.ev('dash', { id: m.id }); } } else if (m.cd <= 0) { m.cd = 2.4; m.wind = 0.6; m.vx = dx / dl * sp * 5; m.vy = dy / dl * sp * 5; this.warns.push({ k: 'line', id: m.id, x1: m.x, y1: m.y, x2: m.x + dx / dl * sp * 2.5, y2: m.y + dy / dl * sp * 2.5, w: m.r * 1.6, t: 0.6, T: 0.6 }); } else { const [ux, uy] = this.toward(m); go(ux * sp * 0.5, uy * sp * 0.5); } break;
        case 'shoot': if (m.wind > 0) { m.wind -= dt; if (m.wind <= 0) this.foe(m.x, m.y, m.aim, 560, M.dmg * dmgMul); } else { if (dl > 500) go(dx / dl * sp, dy / dl * sp); if (m.cd <= 0) { m.cd = 1.7; m.wind = 0.5; m.aim = Math.atan2(dy, dx); this.warns.push({ k: 'line', id: m.id, x1: m.x, y1: m.y, x2: m.x + Math.cos(m.aim) * 1400, y2: m.y + Math.sin(m.aim) * 1400, w: 14, t: 0.55, T: 0.55 }); } } break;
        case 'spread': if (m.cd <= 0) { m.cd = 2.1; const a = Math.atan2(dy, dx); for (const o of [-0.3, 0, 0.3]) this.foe(m.x, m.y, a + o, 500, M.dmg * dmgMul); } if (sp) go(dx / dl * sp * 0.5, dy / dl * sp * 0.5); break;
        case 'ring': go(dx / dl * sp * 0.6 + Math.cos(this.t * 2 + m.y) * 80, dy / dl * sp * 0.6); if (m.cd <= 0) { m.cd = 2.5; for (let i = 0; i < 8; i++) this.foe(m.x, m.y, i * Math.PI / 4 + this.t, 420, M.dmg * dmgMul); } break;
      }
      // 몸통 부딪힘
      if (d2(m, p) < (m.r + p.r - 6) ** 2) this.hit((m.boss ? M.dmg : M.dmg) * dmgMul * (m.mid ? 1.4 : 1));
    }
  }
  dmgMulNow() { return this.ch.dmgMul * (0.45 + 0.55 * Math.min(1, (this.room - 1) / 8)) * (1 + Math.max(0, this.room - 9) * TUNE.dmgLate); }
  bossAct(m, B, dt, dx, dy, dl, slow) {
    const p = this.p, dm = B.dmg * this.dmgMulNow();
    if (m.st > 0) { m.st -= dt; const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt; if (nx > m.r && nx < AW - m.r) m.x = nx; else m.st = 0; if (ny > m.r && ny < AH - m.r) m.y = ny; else m.st = 0; return; }
    m.x += dx / dl * B.spd * slow * dt * 0.6; m.y += clamp(dy / dl * B.spd * slow * dt * 0.6, -99, m.y > AH * 0.55 ? 0 : 99);
    if (m.cd > 0) return;
    const enraged = m.hp < m.maxHp * 0.5, pat = B.pats[m.pat++ % B.pats.length];
    m.cd = (enraged ? 1.5 : 2.2);
    const a = Math.atan2(dy, dx);
    this.ev('bossatk', { pat });
    if (pat === 'spread') for (let i = -3; i <= 3; i++) this.foe(m.x, m.y, a + i * 0.18, 480, dm * 0.6);
    if (pat === 'ring') { const n = enraged ? 20 : 14; for (let i = 0; i < n; i++) this.foe(m.x, m.y, i * Math.PI * 2 / n + (m.pat % 2) * 0.2, 380, dm * 0.55); }
    if (pat === 'slam' || pat === 'meteor') { const tx = p.x, ty = p.y; this.warns.push({ k: 'circle', x: tx, y: ty, r: 190, t: 0.9, T: 0.9 }); this.later.push({ at: this.t + 0.9, fn: () => { this.ev('boom', { x: tx, y: ty, r: 190 }); if (d2(p, { x: tx, y: ty }) < 190 ** 2) this.hit(dm * 0.9); } }); }
    if (pat === 'slam') { for (let i = 0; i < 12; i++) this.foe(m.x, m.y + 40, i * Math.PI / 6, 300, dm * 0.6); for (let i = 0; i < 12; i++) this.later.push({ at: this.t + 0.4, fn: () => this.foe(m.x, m.y + 40, i * Math.PI / 6 + 0.26, 300, dm * 0.6) }); }
    if (pat === 'dash') { m.vx = dx / dl * 900; m.vy = dy / dl * 900; this.warns.push({ k: 'line', id: m.id, x1: m.x, y1: m.y, x2: m.x + dx / dl * 700, y2: m.y + dy / dl * 700, w: m.r * 1.6, t: 0.7, T: 0.7 }); this.later.push({ at: this.t + 0.7, fn: () => { m.st = 0.7; } }); }
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
      if (f.life > 0 && d2(f, p) < (f.r + p.r - 8) ** 2) { f.life = 0; this.src = 'shot'; this.hit(f.dmg); this.src = null; }
    }
    this.foes = this.foes.filter(f => f.life > 0);
  }
  hit(dmg) {
    const p = this.p, fx = this.fx; if (p.inv > 0 || this.over) return;
    if (this.R() < this.dodge) { p.inv = 0.4; this.ev('dodge'); if (fx['blaze.boots']) this.blast(p.x, p.y, 220, 1); return; }
    if (this.shield > 0) { this.shield = 0; p.inv = 0.5; this.ev('shield', { on: false }); this.blast(p.x, p.y, 220, 1); return; }   // 화염 갑옷: 불꽃 방패
    if (this.src === 'shot') dmg *= 1 - this.g.projRed;
    p.hp -= Math.round(dmg); p.inv = this.sk.star ? 2 : 0.7; this.combo = Math.floor(this.combo / 2); this.ev('hurt', { v: Math.round(dmg), src: this.src || 'body' });
    if (fx['fang.amulet']) this.blast(p.x, p.y, 480, fx['fang.amulet'] === 2 ? 6 : 3, true);
    if (fx['blaze.armor'] && this.shieldCd <= 0 && p.hp > 0) { this.shield = 10; this.shieldCd = 10; this.ev('shield', { on: true }); }
    if (p.hp <= 0) { p.hp = 0; this.over = true; this.win = false; this.ev('dead'); }
  }
  // 되살리기 (한 판에 한 번): 체력 절반, 주변 적 탄 지움
  revive() { this.over = false; this.p.hp = Math.round(this.p.maxHp * 0.5); this.p.inv = 2.5; this.foes = []; this.revived = true; this.ev('revive'); }
}
