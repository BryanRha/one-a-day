// 전투 규칙 (화면과 무관): 지도 · 이동 · 공격(운 없음 — 미리 정확히 계산) · 점령 · 생산 · 수송 · 안개 전장 · 턴
import { UNITS, TERRAIN, INCOME, CAPTURE, FOOT, base, coAtk, coDef, coMove, coRange, coCapture, coVision, coReveal, coStars, coCost, coInstant, coCounter, coIncome, coFlat, weatherProof, repairsAt, COS, HUNT, SEAM_HP, SILO_DMG, BOMB_DMG } from './data.js?v=0.27.0';
export const TUNE = { dmg: 1.1 };   // 전체 피해 배율 (한 판을 짧게)

// 지도 칸 글자: 앞 글자 = 지형, 뒤 글자 = 주인(0 중립 · 1 파랑 · 2 빨강)
export const TCH = { '.': 'plain', f: 'forest', m: 'mountain', r: 'road', '~': 'river', '=': 'bridge', b: 'beach', s: 'sea', x: 'reef', p: 'farm', w: 'wheat', t: 'trench', q: 'pipe', j: 'seam', M: 'silo', C: 'city', B: 'base', A: 'air', P: 'port', H: 'hq' };
export const dist = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
export const hpOf = u => Math.ceil(u.hp / 10);   // 화면에 보이는 체력 1~10
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Sim {
  // map: { rows: ['.. f C1 ...'], units: [{ t, p, x, y }], funds: [f1, f2], fog }, cos: [_, co1, co2]
  constructor(map, cos = [null, 'ella', 'scarlet'], opts = {}) {
    const rows = map.rows.map(r => r.trim().split(/\s+/));
    this.h = rows.length; this.w = rows[0].length;
    this.tiles = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = rows[y][x]; const t = TCH[c[0]]; if (!t) throw new Error(`지도 글자 ${c} (${x},${y})`);
      this.tiles.push({ t, owner: TERRAIN[t].prop ? +(c[1] || 0) || 0 : 0, cap: CAPTURE, ...(TERRAIN[t].seam ? { hp: SEAM_HP } : {}) });
    }
    this.nextId = 1; this.units = [];
    for (const u of map.units || []) this.spawn(u.t, u.p, u.x, u.y, u.hp ?? 100, true);
    this.cos = cos; this.power = [0, 0, 0]; this.powerOn = [0, 0, 0];
    this.tag = (opts.tag || [null, null, null]).slice(); this.tagPow = [0, 0, 0]; this.tagOn = [false, false, false];   // 지휘관 교대 · 합동 필살기
    this.swapped = [false, false, false]; this.acted = [false, false, false];
    this.funds = [0, ...(map.funds || [0, 0]).slice(-2)];
    this.limit = opts.limit ?? map.limit ?? 20;
    this.noBuild = opts.noBuild ?? map.noBuild ?? [];          // 생산 못 하는 쪽 (원작 초반 작전처럼 적은 배치된 부대만)
    this.incomeMul = opts.incomeMul ?? map.incomeMul ?? [1, 1, 1];   // 판마다 수입 배율 (캠페인 난이도 조절)
    this.fogBase = !!(opts.fog ?? map.fog);                      // 안개 전장 (비 오는 날에도 안개)
    this.wPlan = opts.weather ?? map.weather ?? 'clear';          // 날씨: 고정 또는 날짜별 순환
    this.wForce = null;                                          // 유키 필살기: { w, left 남은 턴 }
    this.turn = 1; this.day = 1; this.over = false; this.winner = 0; this.events = [];
    this.stats = { lost: [0, 0, 0], built: [0, 0, 0], kills: [0, 0, 0], dealt: [0, 0, 0] };
    this.income(1, true);
  }
  ev(type, d = {}) { this.events.push({ type, ...d }); }
  // 저장 · 이어하기: 판 상태만 (지도 모양은 지도로 다시 만듦)
  snapshot() { return { tiles: this.tiles.map(t => [t.owner, t.cap]), units: this.units.map(u => ({ ...u, cargo: [...u.cargo] })), nextId: this.nextId, power: this.power, powerOn: this.powerOn, funds: this.funds, turn: this.turn, day: this.day, limit: this.limit, stats: this.stats, wForce: this.wForce, tiles2: this.tiles.map(t => [t.t, t.hp ?? null]), tag: this.tag, tagPow: this.tagPow, tagOn: this.tagOn, swapped: this.swapped, acted: this.acted, cos: this.cos }; }
  restore(o) {
    o.tiles.forEach(([ow, cap], i) => { this.tiles[i].owner = ow; this.tiles[i].cap = cap; });
    if (o.tiles2) o.tiles2.forEach(([t, hp], i) => { this.tiles[i].t = t; if (hp != null) this.tiles[i].hp = hp; else delete this.tiles[i].hp; });
    for (const k of ['tag', 'tagPow', 'tagOn', 'swapped', 'acted', 'cos']) if (o[k]) this[k] = o[k].slice();
    this.units = o.units.map(u => ({ fuel: UNITS[u.type].fuel, ammo: UNITS[u.type].ammo, ...u, cargo: Array.isArray(u.cargo) ? [...u.cargo] : u.cargo ? [u.cargo] : [] }));
    Object.assign(this, { nextId: o.nextId, power: o.power, powerOn: (o.powerOn || [0, 0, 0]).map(v => +v || 0), funds: o.funds, turn: o.turn, day: o.day, limit: o.limit, stats: o.stats, wForce: o.wForce || null });
    this.events = []; this._vis = null; return this;
  }
  tile(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.tiles[y * this.w + x]; }
  unitAt(x, y) { return this.units.find(u => u.x === x && u.y === y && !u.inside); }
  unit(id) { return this.units.find(u => u.id === id); }
  spawn(type, p, x, y, hp = 100, ready = false) {
    const u = { id: this.nextId++, type, p, x, y, hp, done: !ready, cargo: [], fuel: UNITS[type].fuel, ammo: UNITS[type].ammo };
    this.units.push(u); return u;
  }
  mine(p = this.turn) { return this.units.filter(u => u.p === p && u.hp > 0); }
  props(p) { return this.tiles.filter(t => TERRAIN[t.t].prop && t.owner === p).length; }
  lv(p) { return this.powerOn[p] || 0; }
  // ── 지휘관 효과: 출전 지휘관 + (합동 필살기 중이면) 교대 지휘관의 초필살기 ──
  pc(p) { return this.tagOn[p] && this.tag[p] ? this.tag[p] : null; }
  fAtk(p, type, st = 0) { const c2 = this.pc(p); return coAtk(this.cos[p], type, this.lv(p), st) + (c2 ? coAtk(c2, type, 2, st) - 1 : 0); }
  fFlat(p) { const c2 = this.pc(p); return coFlat(this.cos[p], this.lv(p)) || !!(c2 && coFlat(c2, 2)); }
  fDef(p, type) { const c2 = this.pc(p); return coDef(this.cos[p], type, this.lv(p)) + (c2 ? coDef(c2, type, 2) - 1 : 0); }
  fMove(p, type) { const c2 = this.pc(p); return coMove(this.cos[p], type, this.lv(p)) + (c2 ? coMove(c2, type, 2) : 0); }
  fRange(p, type) { const c2 = this.pc(p); return coRange(this.cos[p], type, this.lv(p)) + (c2 ? coRange(c2, type, 2) : 0); }
  fCap(p) { const c2 = this.pc(p); return Math.max(coCapture(this.cos[p], this.lv(p)), c2 ? coCapture(c2, 2) : 1); }
  fVision(p) { const c2 = this.pc(p); return coVision(this.cos[p]) + (c2 ? coVision(c2) : 0); }
  fReveal(p) { const c2 = this.pc(p); return coReveal(this.cos[p], this.lv(p)) || !!(c2 && coReveal(c2, 2)); }
  fStars(p) { const c2 = this.pc(p); return coStars(this.cos[p], this.lv(p)) + (c2 ? coStars(c2, 2) : 0); }
  fCost(p) { const c2 = this.pc(p), a = coCost(this.cos[p], this.lv(p)); return c2 ? Math.min(a, coCost(c2, 2)) : a; }   // 타이탄 +20% 도 살아 있게
  fInstant(p) { const c2 = this.pc(p); return coInstant(this.cos[p], this.lv(p)) || !!(c2 && coInstant(c2, 2)); }
  fCounter(p) { const c2 = this.pc(p); return Math.max(coCounter(this.cos[p], this.lv(p)), c2 ? coCounter(c2, 2) : 1); }
  proof(p) { const c2 = this.pc(p); return weatherProof(this.cos[p]) || !!(c2 && weatherProof(c2)); }
  // ── 날씨 ──
  get weather() { if (this.wForce) return this.wForce.w; const w = this.wPlan; return Array.isArray(w) ? w[(this.day - 1) % w.length] : w || 'clear'; }
  get fog() { return this.fogBase || this.weather === 'rain'; }
  set fog(v) { this.fogBase = !!v; }
  wx(p) { return this.proof(p) ? 'clear' : this.weather; }   // p 쪽이 받는 날씨
  // 잠수·은신: 옆 칸에 상대 유닛이 있어야 보임
  hidden(p, u) { return !!u.dive && u.p !== p && !this.units.some(o => o.p === p && !o.inside && dist(o.x, o.y, u.x, u.y) === 1); }
  canHit(a, d) { return base(a.type, d.type) > 0 && (!d.dive || (HUNT[d.type] || []).includes(a.type)); }
  costOf(type, p = this.turn) { return Math.round(UNITS[type].cost * this.fCost(p) / 100) * 100; }
  // 탄약: 주무기가 떨어지면 기관총이 있는 유닛만 보병 공격
  hasAmmo(u, e) { const A = UNITS[u.type].ammo; return A == null || u.ammo > 0 || (UNITS[u.type].mg && FOOT.includes(e.type)); }
  useAmmo(u) { if (UNITS[u.type].ammo != null && u.ammo > 0) u.ammo--; }

  // ── 안개 전장: p 가 볼 수 있는 칸 ──
  visible(p) {
    const key = `${p}|${this.weather}|${this.units.map(u => `${u.id}:${u.x},${u.y},${u.p},${u.inside ? 1 : 0}`).join(';')}|${this.tiles.map(t => t.owner).join('')}|${this.powerOn.join()}`;
    if (this._vis && this._vis.key === key) return this._vis.set;
    const set = new Set(), all = !this.fog || this.fReveal(p);
    if (all) { for (let i = 0; i < this.tiles.length; i++) set.add(i); this._vis = { key, set }; return set; }
    this.tiles.forEach((t, i) => { if (TERRAIN[t.t].prop && t.owner === p) set.add(i); });
    for (const u of this.units) {
      if (u.p !== p || u.inside) continue;
      let v = UNITS[u.type].vis + this.fVision(p) - (this.wx(p) === 'rain' ? 1 : 0);
      if (FOOT.includes(u.type) && this.tile(u.x, u.y).t === 'mountain') v += 3;
      v = Math.max(1, v);
      for (let dy = -v; dy <= v; dy++) for (let dx = -v; dx <= v; dx++) {
        const d = Math.abs(dx) + Math.abs(dy), x = u.x + dx, y = u.y + dy, t = this.tile(x, y); if (!t || d > v) continue;
        if (TERRAIN[t.t].hide && d > 1) continue;   // 숲·암초 속은 바로 옆에서만 보임
        set.add(y * this.w + x);
      }
    }
    this._vis = { key, set }; return set;
  }
  seen(p, x, y) { return this.visible(p).has(y * this.w + x); }
  canSee(p, u) { return u.p === p || (!u.inside && this.seen(p, u.x, u.y) && !this.hidden(p, u)); }

  // ── 이동 ──
  moveCost(u, x, y) {
    const t = this.tile(x, y); if (!t) return null;
    const c = TERRAIN[t.t].cost[UNITS[u.type].mt]; if (c == null) return null;
    if (UNITS[u.type].dom === 'ground' && this.fFlat(u.p)) return 1;   // 테라 필살기
    // 눈: 길·다리·건물이 아닌 땅, 하늘은 1 더 (바다는 그대로)
    if (this.wx(u.p) === 'snow' && UNITS[u.type].dom !== 'sea' && !(['road', 'bridge'].includes(t.t) || TERRAIN[t.t].prop)) return c + 1;
    return c;
  }
  moveOf(u) { return Math.max(0, Math.min(UNITS[u.type].move + this.fMove(u.p, u.type) - (u.dive ? 1 : 0), u.fuel ?? 99)); }   // 연료보다 멀리는 못 감
  // 갈 수 있는 칸: Map 'x,y' → { c 비용, prev } — 아군은 지나갈 수 있고, (보이는) 적은 막힘. 끝 칸은 비어 있어야 함(탑승은 됨)
  reach(u) {
    const mv = this.moveOf(u), out = new Map(), k = (x, y) => `${x},${y}`;
    const blocks = o => o.p !== u.p && this.canSee(u.p, o);   // 안개 속·잠수한 적은 모르고 지나가려다 막힘(매복)
    out.set(k(u.x, u.y), { c: 0, prev: null, x: u.x, y: u.y });
    const q = [[0, u.x, u.y]];
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]); const [c, x, y] = q.shift();
      if (c > (out.get(k(x, y)) || { c: 1e9 }).c) continue;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, mc = this.moveCost(u, nx, ny); if (mc == null) continue;
        const o = this.unitAt(nx, ny); if (o && blocks(o)) continue;
        const nc = c + mc; if (nc > mv) continue;
        const prev = out.get(k(nx, ny)); if (prev && prev.c <= nc) continue;
        out.set(k(nx, ny), { c: nc, prev: k(x, y), x: nx, y: ny }); q.push([nc, nx, ny]);
      }
    }
    for (const v of out.values()) { const o = this.unitAt(v.x, v.y); v.stop = !o || o === u || this.canLoad(u, o) || o.p !== u.p; v.load = !!(o && o !== u && this.canLoad(u, o)); }
    return out;
  }
  canLoad(u, t) {
    const C = UNITS[t.type].carry; if (!C || t.p !== u.p || t === u || t.cargo.length >= C.n) return false;
    return C.what === 'foot' ? FOOT.includes(u.type) : C.what === 'air' ? UNITS[u.type].dom === 'air' && !UNITS[u.type].carry : UNITS[u.type].dom === 'ground';
  }
  path(reach, x, y) { const out = []; let k = `${x},${y}`; while (k) { const v = reach.get(k); if (!v) return null; out.unshift([v.x, v.y]); k = v.prev; } return out; }

  // ── 공격 ──
  rangeOf(u) { const r = UNITS[u.type].range; if (!r) return null; const mx = r[1] + this.fRange(u.p, u.type) - (UNITS[u.type].indirect && this.wx(u.p) === 'sand' ? 1 : 0); return [r[0], Math.max(r[0], mx)]; }
  // fx,fy 에서 공격할 수 있는 적 (moved: 간접 유닛은 움직였으면 못 쏨 · 안개: 보이는 적만, 바로 옆은 보임)
  targets(u, fx, fy, moved) {
    const r = this.rangeOf(u); if (!r) return [];
    if (UNITS[u.type].indirect && moved) return [];
    return this.units.filter(e => {
      if (e.p === u.p || e.hp <= 0 || e.inside || !this.canHit(u, e) || !this.hasAmmo(u, e)) return false;
      const d = dist(fx, fy, e.x, e.y); if (d < r[0] || d > r[1]) return false;
      if (e.dive) return d === 1 || this.canSee(u.p, e);
      return !this.fog || d === 1 || this.canSee(u.p, e);
    });
  }
  // 피해(내부 체력 0~100 기준): 기본 상성 × 지휘관 × 공격 체력 비율 × (1 − 지형★ × 방어 체력/100) ÷ 방어 지휘관
  calc(aType, aP, aHp, dType, dHp, dx, dy, dP, ax, ay) {
    const b = base(aType, dType); if (!b) return 0;
    const dp = dP ?? (aP === 1 ? 2 : 1);
    const stars = UNITS[dType].dom === 'air' ? 0 : TERRAIN[this.tile(dx, dy).t].def + (dp ? this.fStars(dp) : 0);
    const aSt = ax == null || UNITS[aType].dom === 'air' ? 0 : TERRAIN[this.tile(ax, ay).t].def;
    const v = TUNE.dmg * b * this.fAtk(aP, aType, aSt) * (Math.ceil(aHp / 10) / 10) * (1 - stars * Math.ceil(dHp / 10) / 100) / (dp ? this.fDef(dp, dType) : 1);
    return Math.max(0, Math.floor(v));
  }
  // 예상: 내가 줄 피해 · 반격 피해 (반격: 살아남은 적이 인접해 있고 간접 유닛이 아니면)
  forecast(u, fx, fy, e) {
    const dmg = Math.min(e.hp, this.calc(u.type, u.p, u.hp, e.type, e.hp, e.x, e.y, e.p, fx, fy));
    const left = e.hp - dmg; let counter = 0;
    if (left > 0 && dist(fx, fy, e.x, e.y) === 1 && !UNITS[e.type].indirect && UNITS[e.type].range && !UNITS[u.type].indirect && this.canHit(e, u) && this.hasAmmo(e, u))
      counter = Math.min(u.hp, Math.floor(this.calc(e.type, e.p, left, u.type, u.hp, fx, fy, u.p, e.x, e.y) * this.fCounter(e.p)));
    return { dmg, counter, kill: left <= 0, die: counter >= u.hp };
  }

  // ── 행동 (화면·AI 공용) ──
  // 이동: 안개 속에 숨은 적에 막히면 그 앞에서 멈추고 행동 끝 (매복)
  move(id, x, y) {
    const u = this.unit(id); if (!u || u.done || this.over) return false;
    const r = this.reach(u), v = r.get(`${x},${y}`); if (!v || !v.stop) return false;
    let path = this.path(r, x, y), trapped = null;
    {   // 안개·잠수: 길 위에 몰랐던 적이 있으면 그 앞에서 멈춤
      for (let i = 1; i < path.length; i++) {
        const o = this.unitAt(...path[i]);
        if (o && o.p !== u.p) { trapped = o; let j = i - 1; while (j > 0 && this.unitAt(...path[j]) && this.unitAt(...path[j]) !== u) j--; path = path.slice(0, j + 1); break; }
      }
      [x, y] = path[path.length - 1];
    }
    if (x !== u.x || y !== u.y) { const t = this.tile(u.x, u.y); if (TERRAIN[t.t].prop) t.cap = CAPTURE; }   // 점령 중 자리를 뜨면 초기화
    if (u.fuel != null) u.fuel = Math.max(0, u.fuel - ((r.get(`${x},${y}`) || { c: 0 }).c)); this.acted[u.p] = true;
    u.moved = x !== u.x || y !== u.y; u.fromX = u.x; u.fromY = u.y; u.x = x; u.y = y;
    this.ev('move', { id, path });
    if (trapped) { u.done = true; this.ev('trap', { id, x, y, by: trapped.id }); return true; }
    const o = this.units.find(t => t !== u && t.x === x && t.y === y && !t.inside);
    if (o && this.canLoad(u, o)) { o.cargo.push(u.id); u.inside = o.id; u.done = true; this.ev('load', { id, into: o.id }); }
    return true;
  }
  attack(id, tid) {
    const u = this.unit(id), e = this.unit(tid); if (!u || !e) return false;
    if (!this.targets(u, u.x, u.y, u.moved).includes(e)) return false;
    const f = this.forecast(u, u.x, u.y, e);
    e.hp -= f.dmg; this.charge(u, e, f.dmg); this.useAmmo(u); if (f.counter) this.useAmmo(e);
    this.stats.dealt[u.p] += UNITS[e.type].cost * f.dmg / 100;
    this.ev('attack', { a: id, d: tid, dmg: f.dmg, counter: 0, aType: u.type, dType: e.type, aHp: u.hp, dHp: e.hp + f.dmg, ap: u.p });
    if (e.hp <= 0) this.kill(e, u.p);
    else if (f.counter) { u.hp -= f.counter; this.charge(e, u, f.counter); this.ev('counter', { a: tid, d: id, dmg: f.counter }); if (u.hp <= 0) this.kill(u, e.p); }
    this.finish(u); return true;
  }
  charge(att, def, dmg) {   // 필살기 게이지: 준 피해 가치 + 받은 피해 가치 절반 (초필살기 게이지까지 쌓임)
    const v = UNITS[def.type].cost * dmg / 100;
    const add = (p, k) => { if (this.powerOn[p] || !this.cos[p]) return; this.power[p] = Math.min(COS[this.cos[p]].sneed, this.power[p] + k); if (this.tag[p]) this.tagPow[p] = Math.min(COS[this.tag[p]].sneed, this.tagPow[p] + k); };
    add(att.p, v); add(def.p, v * 0.5);
  }
  kill(u, by) {
    u.hp = 0; this.stats.lost[u.p]++; this.stats.kills[by]++;
    for (const cid of u.cargo) { const c = this.unit(cid); if (c) { c.hp = 0; this.stats.lost[c.p]++; } }
    this.units = this.units.filter(o => o.hp > 0);
    this.ev('kill', { id: u.id, ut: u.type, p: u.p, x: u.x, y: u.y });
    this.checkWin();
  }
  canCapture(u) { const t = this.tile(u.x, u.y); return UNITS[u.type].capture && TERRAIN[t.t].prop && t.owner !== u.p; }
  capture(id) {
    const u = this.unit(id); if (!u || !this.canCapture(u)) return false;
    const t = this.tile(u.x, u.y), amt = Math.floor(hpOf(u) * this.fCap(u.p));
    t.cap -= amt;
    if (t.cap <= 0) {
      const was = t.owner; t.owner = u.p; t.cap = CAPTURE;
      this.ev('capture', { id, x: u.x, y: u.y, done: true, t: t.t, from: was });
      if (t.t === 'hq') { this.over = true; this.winner = u.p; this.ev('win', { p: u.p, why: 'hq' }); }
    } else this.ev('capture', { id, x: u.x, y: u.y, done: false, left: t.cap });
    this.finish(u); return true;
  }
  // 수송 유닛에서 내리기 (첫 번째로 실은 유닛부터, 옆 빈 칸 중 그 유닛이 설 수 있는 곳)
  unloadSpots(tr) {
    if (!tr.cargo.length) return [];
    const c = this.unit(tr.cargo[0]), out = [];
    if (!c) return [];
    if (UNITS[tr.type].carry.what === 'ground' && UNITS[tr.type].dom === 'sea' && !['beach', 'port'].includes(this.tile(tr.x, tr.y).t)) return [];   // 상륙정은 해안·항구에서만
    for (const [dx, dy] of N4) { const x = tr.x + dx, y = tr.y + dy; if (this.moveCost(c, x, y) != null && !this.unitAt(x, y)) out.push([x, y]); }
    return out;
  }
  unload(id, x, y) {
    const tr = this.unit(id); if (!tr || !this.unloadSpots(tr).some(([a, b]) => a === x && b === y)) return false;
    const c = this.unit(tr.cargo.shift()); c.inside = null; c.x = x; c.y = y; c.done = true;
    this.ev('unload', { id: c.id, from: id, x, y });
    if (!tr.cargo.length || !this.unloadSpots(tr).length) this.finish(tr);
    return true;
  }
  // 잠수(잠수함) · 은신(스텔스기) 켜고 끄기 — 대기 대신 하는 행동
  dive(id) { const u = this.unit(id); if (!u || !UNITS[u.type].dive || u.done) return false; u.dive = !u.dive; this.finish(u); this.ev('dive', { id, on: u.dive }); return true; }
  wait(id) { const u = this.unit(id); if (!u) return false; this.finish(u); this.ev('wait', { id }); return true; }
  finish(u) { u.done = true; u.moved = false; }
  // 생산 (기지: 지상 · 비행장: 공중 · 항구: 해상) — 만든 유닛은 다음 턴부터
  pipeBase(x, y) { return N4.some(([dx, dy]) => (this.tile(x + dx, y + dy) || {}).t === 'pipe'); }
  canBuild(x, y, type, p = this.turn) {
    const t = this.tile(x, y); if (!t || t.owner !== p || this.unitAt(x, y) || this.noBuild.includes(p)) return false;
    const b = TERRAIN[t.t].builds; if (!b || b !== UNITS[type].dom) return false;
    if (type === 'piper' && !this.pipeBase(x, y)) return false;   // 파이프 열차: 파이프와 이어진 기지에서만
    return this.funds[p] >= this.costOf(type, p);
  }
  build(x, y, type) {
    if (!this.canBuild(x, y, type)) return false;
    const p = this.turn; this.funds[p] -= this.costOf(type, p); this.stats.built[p]++; this.acted[p] = true;
    const u = this.spawn(type, p, x, y, 100, this.fInstant(p)); this.ev('build', { id: u.id, ut: type, x, y }); return true;
  }
  // 필살기: 1 = 필살기 · 2 = 초필살기
  powerReady(p = this.turn, lvl = 1) {
    const co = this.cos[p]; if (!co || this.powerOn[p]) return false;
    if (lvl === 3) return !!this.tag[p] && this.power[p] >= COS[co].sneed && this.tagPow[p] >= COS[this.tag[p]].sneed;   // 합동 필살기: 두 지휘관 모두 초필살기까지
    return this.power[p] >= (lvl === 2 ? COS[co].sneed : COS[co].need);
  }
  usePower(lvl = 1) {
    const p = this.turn, co = this.cos[p]; if (!this.powerReady(p, lvl)) return false;
    this.acted[p] = true;
    if (lvl === 3) { this.power[p] = 0; this.tagPow[p] = 0; this.powerOn[p] = 2; this.tagOn[p] = true; this.burst(p, co, 2); this.burst(p, this.tag[p], 2); this._vis = null; this.ev('power', { p, co, lvl: 2, tag: this.tag[p] }); return true; }
    this.power[p] = Math.max(0, this.power[p] - (lvl === 2 ? COS[co].sneed : COS[co].need)); this.powerOn[p] = lvl;
    this.burst(p, co, lvl); this._vis = null;
    this.ev('power', { p, co, lvl }); return true;
  }
  // 필살기 순간 효과 (체력 · 날씨)
  burst(p, co, lvl) {
    if (co === 'scarlet') for (const e of this.units) if (e.p !== p) e.hp = Math.max(1, e.hp - (lvl === 2 ? 20 : 10));
    if (co === 'doo') for (const u of this.mine(p)) u.hp = Math.min(100, u.hp + (lvl === 2 ? 30 : 10));
    if (co === 'yuki') { this.wForce = { w: 'snow', left: 2 }; if (lvl === 2) for (const e of this.units) if (e.p !== p) e.hp = Math.max(1, e.hp - 10); this.ev('weather', { w: 'snow', by: p }); }
    if (co === 'sera') { const q = p === 1 ? 2 : 1; if (lvl === 2) { this.funds[q] = Math.floor(this.funds[q] / 2 / 100) * 100; this.power[q] = Math.floor(this.power[q] / 2); this.tagPow[q] = Math.floor(this.tagPow[q] / 2); } else this.funds[p] += this.props(p) * 1000; }
    if (co === 'hana' && lvl === 2) for (const u of this.mine(p)) u.hp = Math.min(100, u.hp + 10);
    if (co === 'marin' && lvl === 2) for (const u of this.mine(p)) if (UNITS[u.type].dom === 'sea') u.hp = Math.min(100, u.hp + 20);
  }
  // 턴 끝 → 상대 턴 시작: 수입 · 수리 · 행동 초기화
  endTurn() {
    if (this.over) return;
    for (const u of this.mine()) { u.done = false; u.moved = false; }
    this.powerOn[this.turn] = 0; this.tagOn[this.turn] = false;
    const w0 = this.weather;
    if (this.wForce && --this.wForce.left <= 0) this.wForce = null;
    this.turn = this.turn === 1 ? 2 : 1; if (this.turn === 1) this.day++;
    this.swapped[this.turn] = false; this.acted[this.turn] = false;
    if (this.weather !== w0) { this._vis = null; this.ev('weather', { w: this.weather }); }
    // 작전 기한: 마지막 날이 끝나면 전력(건물 + 유닛 가치)으로 판정
    if (this.turn === 1 && this.limit && this.day > this.limit) { const v = p => this.props(p) * 4000 + this.mine(p).reduce((a, u) => a + UNITS[u.type].cost * u.hp / 100, 0); this.over = true; this.winner = v(1) >= v(2) ? 1 : 2; this.ev('win', { p: this.winner, why: 'time' }); return; }
    this.income(this.turn);
    this.ev('turn', { p: this.turn, day: this.day });
    if (!this.mine().length) { this.over = true; this.winner = this.turn === 1 ? 2 : 1; this.ev('win', { p: this.winner, why: 'rout' }); }
  }
  income(p, first = false) {
    this.funds[p] += Math.round(this.props(p) * INCOME * (this.incomeMul[p] ?? 1) * coIncome(this.cos[p]) / 500) * 500;
    for (const u of this.mine(p)) {
      u.done = false; u.moved = false;
      const U = UNITS[u.type], t = this.tile(u.x, u.y), host = u.inside ? this.unit(u.inside) : null;
      const ok = !u.inside && TERRAIN[t.t].prop && t.owner === p && repairsAt(U.dom, t.t);
      if (ok && u.hp < 100) { u.hp = Math.min(100, u.hp + 20); this.ev('repair', { id: u.id }); }
      if (host && host.type === 'carrier' && u.hp < 100) { u.hp = Math.min(100, u.hp + 20); this.ev('repair', { id: u.id }); }
      if (u.type === 'truck' && !u.inside) for (const o of this.mine(p)) if (o !== u && !o.inside && dist(o.x, o.y, u.x, u.y) === 1 && o.hp < 100) { o.hp = Math.min(100, o.hp + 10); this.ev('repair', { id: o.id }); }
    }
    // 보급: 아군 건물(수리되는 곳) · 트럭 옆 · 수송 유닛 안 → 연료·탄약 가득 / 아니면 하늘·바다는 매일 연료가 줄고 0 이면 추락·침몰
    const trucks = this.mine(p).filter(o => o.type === 'truck' && !o.inside);
    for (const u of this.mine(p)) {
      const U = UNITS[u.type], t = this.tile(u.x, u.y);
      const sup = !!u.inside || (TERRAIN[t.t].prop && t.owner === p && repairsAt(U.dom, t.t)) || trucks.some(o => o !== u && dist(o.x, o.y, u.x, u.y) === 1);
      if (sup) { if ((U.fuel != null && u.fuel < U.fuel) || (U.ammo != null && u.ammo < U.ammo)) { u.fuel = U.fuel; u.ammo = U.ammo; this.ev('supply', { id: u.id }); } continue; }
      if (first || !U.day) continue;
      u.fuel -= U.day + (u.dive ? (u.type === 'sub' ? 4 : 3) : 0);
      if (u.fuel <= 0) {
        u.fuel = 0; u.hp = 0; this.stats.lost[p]++;
        for (const cid of u.cargo) { const c = this.unit(cid); if (c) { c.hp = 0; this.stats.lost[p]++; } }
        this.units = this.units.filter(o => o.hp > 0);
        this.ev('crash', { id: u.id, ut: u.type, p, x: u.x, y: u.y });
      } else if (u.fuel <= U.day * 2) this.ev('lowfuel', { id: u.id });
    }
  }
  // ── 특수 지형 · 특수 유닛 ──
  // 파이프 이음매: 부수면 길이 열림 (중전차를 때리듯 피해 · 반격 없음)
  seamTargets(u, fx, fy, moved) {
    const r = this.rangeOf(u); if (!r || (UNITS[u.type].indirect && moved) || u.type === 'carrier' || base(u.type, 'htank') <= 0) return [];
    if (UNITS[u.type].ammo != null && !(u.ammo > 0)) return [];
    const out = [];
    this.tiles.forEach((t, i) => { if (t.t !== 'seam') return; const x = i % this.w, y = (i / this.w) | 0, d = dist(fx, fy, x, y); if (d >= r[0] && d <= r[1]) out.push({ seam: true, id: `s${i}`, x, y, hp: t.hp, type: 'seam', p: 0 }); });
    return out;
  }
  seamDmg(u, x, y) { return Math.max(1, this.calc(u.type, u.p, u.hp, 'htank', this.tile(x, y).hp, x, y, 0, u.x, u.y)); }
  attackSeam(id, x, y) {
    const u = this.unit(id), t = this.tile(x, y); if (!u || !t || t.t !== 'seam') return false;
    if (!this.seamTargets(u, u.x, u.y, u.moved).some(o => o.x === x && o.y === y)) return false;
    const dmg = this.seamDmg(u, x, y); t.hp -= dmg; this.useAmmo(u);
    const broken = t.hp <= 0; if (broken) { t.t = 'plain'; delete t.hp; this._lab = null; }
    this.ev('seam', { a: id, x, y, dmg, broken }); this.finish(u); return true;
  }
  // 미사일 기지: 보병이 올라서면 한 번 발사 — 지도 어디든 반경 2칸 체력 -3 (아군도)
  canSilo(u) { const t = this.tile(u.x, u.y); return !!u && FOOT.includes(u.type) && !u.done && t.t === 'silo'; }
  siloHits(x, y, r = 2) { return this.units.filter(o => !o.inside && dist(o.x, o.y, x, y) <= r); }
  launch(id, x, y) {
    const u = this.unit(id); if (!u || !this.canSilo(u) || !this.tile(x, y)) return false;
    for (const o of this.siloHits(x, y)) { const d = Math.min(SILO_DMG, o.hp - 1); o.hp -= d; if (o.p !== u.p) this.charge(u, o, d); }
    this.tile(u.x, u.y).t = 'silo_e'; this.acted[u.p] = true;
    this.ev('silo', { id, x, y, fx: u.x, fy: u.y }); this.finish(u); return true;
  }
  // 자폭 드론: 그 자리에서 터져 반경 3칸 체력 -5 (아군도)
  explode(id) {
    const u = this.unit(id); if (!u || u.type !== 'bomb' || u.done) return false;
    for (const o of this.siloHits(u.x, u.y, 3)) { if (o === u) continue; const d = Math.min(BOMB_DMG, o.hp - 1); o.hp -= d; if (o.p !== u.p) this.charge(u, o, d); }
    u.hp = 0; this.stats.lost[u.p]++; this.units = this.units.filter(o => o.hp > 0); this.acted[u.p] = true;
    this.ev('explode', { id, x: u.x, y: u.y }); this.ev('kill', { id: u.id, ut: u.type, p: u.p, x: u.x, y: u.y }); this.checkWin(); return true;
  }
  // ── 지휘관 교대: 이번 턴에 아직 아무것도 안 했을 때 한 번 ──
  canSwap(p = this.turn) { return !!this.tag[p] && !this.swapped[p] && !this.acted[p] && !this.powerOn[p] && !this.over; }
  swap() {
    const p = this.turn; if (!this.canSwap(p)) return false;
    [this.cos[p], this.tag[p]] = [this.tag[p], this.cos[p]]; [this.power[p], this.tagPow[p]] = [this.tagPow[p], this.power[p]];
    this.swapped[p] = true; this._vis = null; this.ev('swap', { p, co: this.cos[p] }); return true;
  }
  checkWin() {
    for (const p of [1, 2]) {
      if (this.over) return;
      if (!this.mine(p).length) { this.over = true; this.winner = p === 1 ? 2 : 1; this.ev('win', { p: this.winner, why: 'rout' }); }   // 원작 규칙: 유닛이 전멸하면 패배
    }
  }
}
