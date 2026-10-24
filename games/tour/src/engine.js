// 판 진행 엔진 (화면 없이도 돌아감 · 봇 시험용): 차례 → 주사위 → 이동 → 칸 처리 → 승리 판정
// 화면은 io 로 연결: io.anim(event) 를 기다림 · 사람 차례 결정은 io.ask(kind, info) 로 받음
import { TILES, N_TILES, GROUPS, SIDES, BUILD_K, TOLL_K, TOUR, START_CASH, SALARY, MAX_ROUNDS, ISLAND_TURNS, ISLAND_FEE, CHARS, AI, CHANCE, drawChance, landPrice } from './data.js?v=0.36.0';

const rnd6 = () => 1 + Math.floor(Math.random() * 6);
export class Engine {
  constructor({ players, io, fast = false }) {
    this.io = io; this.fast = fast;
    this.P = players.map((p, i) => ({ i, name: p.name, char: CHARS.find(c => c.id === p.char), ai: p.ai ? AI[p.ai] : null, aiKey: p.ai || null, cash: START_CASH, pos: 0, island: 0, ktx: false, angel: 0, out: false, laps: 0, doubles: 0 }));
    this.own = Array(N_TILES).fill(-1); this.lv = Array(N_TILES).fill(-1); this.paid = Array(N_TILES).fill(0); this.festival = -1;
    this.round = 1; this.cur = 0; this.winner = null; this.reason = ''; this.log = [];
  }
  perk(p, k, d = 1) { return p.char && p.char.perk[k] !== undefined ? p.char.perk[k] : d; }
  async a(ev) { this.log.push(ev); if (this.io && this.io.anim) await this.io.anim(ev); }
  alive() { return this.P.filter(p => !p.out); }
  assets(p) { let s = p.cash; this.own.forEach((o, i) => { if (o === p.i) s += this.paid[i]; }); return s; }
  // ── 값
  buildCost(i, from, to, p) { if (TILES[i].k === 't') return from < 0 ? TOUR.p : 0; const b = GROUPS[TILES[i].g].p; let s = 0; for (let l = from + 1; l <= to; l++) s += Math.round(b * BUILD_K[l] * (l > 0 ? this.perk(p, 'build') : 1)); return s; }
  toll(i) {
    const t = TILES[i]; if (this.own[i] < 0) return 0;
    let v = t.k === 't' ? TOUR.toll[this.own.filter((o, j) => o === this.own[i] && TILES[j].k === 't').length] : Math.round(GROUPS[t.g].p * TOLL_K[this.lv[i]]);
    if (t.k === 'c' && this.groupOwner(t.g) === this.own[i]) v = Math.round(v * 1.5);   // 같은 색 줄을 다 가지면 1.5배
    if (this.festival === i) v *= 2; return v;
  }
  takeCost(i, p) { return Math.round(this.paid[i] * 2 * this.perk(p, 'takeover')); }
  groupOwner(g) { const ids = TILES.map((t, i) => t.k === 'c' && t.g === g ? i : -1).filter(i => i >= 0), o = this.own[ids[0]]; return o >= 0 && ids.every(i => this.own[i] === o) ? o : -1; }
  // ── 한 판
  async run() {
    await this.a({ t: 'start' });
    while (!this.winner) {
      const p = this.P[this.cur];
      if (!p.out) await this.turn(p);
      if (this.winner) break;
      this.cur = (this.cur + 1) % this.P.length;
      if (this.cur === 0) { this.round++; await this.a({ t: 'round', n: this.round }); if (this.round > MAX_ROUNDS) { const best = [...this.alive()].sort((a, b) => this.assets(b) - this.assets(a))[0]; this.win(best, 'rich'); } }
    }
    await this.a({ t: 'win', p: this.winner, reason: this.reason });
    return this.winner;
  }
  win(p, reason) { if (!this.winner) { this.winner = p; this.reason = reason; } }
  async turn(p) {
    p.doubles = 0; await this.a({ t: 'turn', p });
    for (let again = true; again && !p.out && !this.winner;) {
      again = false;
      // KTX: 원하는 칸으로
      if (p.ktx) { p.ktx = false; const to = p.ai ? this.aiKtx(p) : await this.io.ask('ktx', { p }); if (to !== null && to !== undefined && to >= 0) { await this.goTo(p, to, true); await this.land(p); } continue; }
      // 무인도: 더블로 탈출 · 돈 내고 탈출 · 쉬기
      if (p.island > 0) {
        const pay = p.ai ? (p.cash > ISLAND_FEE * 4 && Math.random() < 0.5) : (p.cash >= ISLAND_FEE && await this.io.ask('island', { p, left: p.island }));
        if (pay) { p.cash -= ISLAND_FEE; p.island = 0; await this.a({ t: 'cash', p, amt: -ISLAND_FEE, why: '무인도 탈출' }); }
        else { const r = await this.roll(p); if (r.d1 === r.d2) { p.island = 0; await this.a({ t: 'escape', p }); await this.step(p, r.d1 + r.d2); await this.land(p); } else { p.island--; await this.a({ t: 'stay', p, left: p.island }); } continue; }
      }
      const r = await this.roll(p), dbl = r.d1 === r.d2;
      if (dbl) { p.doubles++; if (p.doubles >= 3) { await this.a({ t: 'triple', p }); await this.goTo(p, 6, false); p.island = ISLAND_TURNS; await this.a({ t: 'island', p }); break; } }
      await this.step(p, r.d1 + r.d2); await this.land(p);
      if (dbl && !p.out && !p.island) { again = true; await this.a({ t: 'again', p }); }
    }
  }
  async roll(p) {
    let r = p.ai ? { d1: rnd6(), d2: rnd6(), aim: false } : await this.io.ask('roll', { p });
    if (!r) r = { d1: rnd6(), d2: rnd6() };
    // 더블 노리기 성공 · 캐릭터 능력: 더블 확률 덤
    const extra = (r.aim ? 0.18 : 0) + this.perk(p, 'double', 0);
    if (r.d1 !== r.d2 && Math.random() < extra) r.d2 = r.d1;
    await this.a({ t: 'roll', p, d1: r.d1, d2: r.d2 }); return r;
  }
  async step(p, n) { const path = []; for (let k = 1; k <= n; k++) path.push((p.pos + k) % N_TILES); const passStart = p.pos + n >= N_TILES; await this.a({ t: 'move', p, path }); p.pos = path[path.length - 1]; if (passStart) await this.salary(p); }
  async goTo(p, to, salary) { const n = (to - p.pos + N_TILES) % N_TILES, path = []; for (let k = 1; k <= n; k++) path.push((p.pos + k) % N_TILES); await this.a({ t: 'move', p, path, fast: true }); const pass = salary && p.pos + n >= N_TILES && to !== 0; p.pos = to; if (pass) await this.salary(p); }
  async salary(p) { const v = Math.round(SALARY * this.perk(p, 'salary')); p.cash += v; p.laps++; await this.a({ t: 'salary', p, amt: v }); }
  // ── 칸 처리
  async land(p) {
    const i = p.pos, t = TILES[i];
    if (t.k === 'start') return;   // 출발 칸: 지나가며 이미 월급을 받음
    if (t.k === 'island') { p.island = ISLAND_TURNS; await this.a({ t: 'island', p }); return; }
    if (t.k === 'ktx') { p.ktx = true; await this.a({ t: 'ktxready', p }); return; }
    if (t.k === 'festival') { await this.hostFestival(p); return; }
    if (t.k === 'tax') { const v = Math.max(10, Math.round(this.own.reduce((s, o, j) => s + (o === p.i ? this.paid[j] : 0), 0) * 0.1)); await this.pay(p, null, v, '세금'); return; }
    if (t.k === 'ch') return this.chance(p);
    // 도시 · 관광지
    const o = this.own[i];
    if (o < 0) return this.offerBuild(p, i, -1);
    if (o === p.i) return t.k === 'c' && this.lv[i] < 4 ? this.offerBuild(p, i, this.lv[i]) : undefined;
    // 남의 땅
    const owner = this.P[o]; let v = this.toll(i);
    if (p.angel > 0) { p.angel--; await this.a({ t: 'angel', p, i }); }
    else { v = Math.round(v * this.perk(p, 'toll')); await this.pay(p, owner, v, '통행료', i); }
    if (p.out) return;
    // 인수 (랜드마크 · 관광지 제외)
    if (t.k === 'c' && this.lv[i] < 4) { const cost = this.takeCost(i, p);
      const yes = p.ai ? (p.cash - cost > 120 && Math.random() < p.ai.take) : (p.cash >= cost && await this.io.ask('take', { p, i, cost, owner }));
      if (yes && p.cash >= cost) { p.cash -= cost; owner.cash += cost; this.own[i] = p.i; this.paid[i] = this.buildCost(i, -1, this.lv[i], p); await this.a({ t: 'take', p, i, from: owner, cost }); this.check(p); if (!this.winner && this.lv[i] < 4) await this.offerBuild(p, i, this.lv[i]); } }
  }
  // 짓기: from 다음 단계부터 고를 수 있음 (랜드마크는 호텔이 있어야)
  async offerBuild(p, i, from) {
    const t = TILES[i]; let to;
    const maxTo = t.k === 't' ? 0 : from >= 3 ? 4 : 3;
    if (from >= maxTo) return;
    if (p.ai) to = this.aiBuild(p, i, from, maxTo);
    else to = await this.io.ask('build', { p, i, from, maxTo, costs: [...Array(5)].map((_, l) => l > from && l <= maxTo ? this.buildCost(i, from, l, p) : null) });
    if (to === null || to === undefined || to <= from) return;
    const cost = this.buildCost(i, from, to, p); if (cost > p.cash) return;
    p.cash -= cost; this.own[i] = p.i; this.lv[i] = t.k === 't' ? 0 : to; this.paid[i] += cost;
    await this.a({ t: 'build', p, i, from, to: this.lv[i], cost }); this.check(p);
  }
  aiBuild(p, i, from, maxTo) {
    const keep = 120 + p.ai.keep * 300; let best = from;
    for (let l = from + 1; l <= maxTo; l++) { const c = this.buildCost(i, from, l, p); if (p.cash - c < keep) break; if (l > 0 && Math.random() > (l === 4 ? Math.max(p.ai.build, 0.7) : p.ai.build)) break; best = l; }
    if (from < 0 && best < 0 && p.cash - this.buildCost(i, -1, 0, p) > 60 && Math.random() < p.ai.buy) best = 0;
    return best;
  }
  aiKtx(p) { // 빈 땅 중 비싼 곳 · 없으면 출발
    let best = -1, bv = -1; TILES.forEach((t, i) => { if ((t.k === 'c' || t.k === 't') && this.own[i] < 0 && landPrice(i) < p.cash - 100 && landPrice(i) > bv) { bv = landPrice(i); best = i; } }); return best >= 0 ? best : 0;
  }
  async hostFestival(p) {
    const mine = TILES.map((t, i) => this.own[i] === p.i && t.k === 'c' ? i : -1).filter(i => i >= 0); if (!mine.length) { await this.a({ t: 'nofest', p }); return; }
    const i = p.ai ? mine.sort((a, b) => this.toll(b) - this.toll(a))[0] : await this.io.ask('festival', { p, mine });
    if (i === null || i === undefined || i < 0) return; this.festival = i; await this.a({ t: 'festival', p, i });
  }
  async chance(p) {
    let c = drawChance(); const bad = ['fine', 'repair', 'island', 'treat', 'back3'];
    if (p.char.perk.chance && bad.includes(c.id) && !p.reroll) { p.reroll = true; await this.a({ t: 'chance', p, c, reroll: true }); c = drawChance(); } else p.reroll = false;
    await this.a({ t: 'chance', p, c });
    if (c.id === 'angel') p.angel++;
    else if (c.cash > 0) { p.cash += c.cash; await this.a({ t: 'cash', p, amt: c.cash, why: c.n }); }
    else if (c.cash < 0) await this.pay(p, null, -c.cash, c.n);
    else if (c.id === 'repair') { const n = this.lv.reduce((s, l, i) => s + (this.own[i] === p.i && l > 0 ? l : 0), 0); if (n) await this.pay(p, null, n * 10, c.n); }
    else if (c.id === 'start') { await this.goTo(p, 0, false); await this.salary(p); }
    else if (c.id === 'island') { await this.goTo(p, 6, false); p.island = ISLAND_TURNS; await this.a({ t: 'island', p }); }
    else if (c.id === 'ktx') { await this.goTo(p, 22, true); p.ktx = true; await this.a({ t: 'ktxready', p }); }
    else if (c.id === 'festival') await this.hostFestival(p);
    else if (c.id === 'back3') { const to = (p.pos - 3 + N_TILES) % N_TILES; await this.a({ t: 'move', p, path: [(p.pos + N_TILES - 1) % N_TILES, (p.pos + N_TILES - 2) % N_TILES, to], back: true }); p.pos = to; await this.land(p); }
    else if (c.id === 'gift') { for (const q of this.alive()) if (q !== p) { const v = Math.min(20, q.cash); q.cash -= v; p.cash += v; await this.a({ t: 'pay', from: q, to: p, amt: v, why: c.n }); } }
    else if (c.id === 'treat') { for (const q of this.alive()) if (q !== p) await this.pay(p, q, 20, c.n); }
    else if (c.id === 'upgrade') { const mine = TILES.map((t, i) => this.own[i] === p.i && t.k === 'c' && this.lv[i] < 3 ? i : -1).filter(i => i >= 0); if (mine.length) { const i = mine.sort((a, b) => landPrice(b) - landPrice(a))[0]; this.lv[i]++; this.paid[i] += this.buildCost(i, this.lv[i] - 1, this.lv[i], p); await this.a({ t: 'build', p, i, from: this.lv[i] - 1, to: this.lv[i], cost: 0, free: true }); this.check(p); } }
    else if (c.id === 'tour') { const tours = TILES.map((t, i) => t.k === 't' ? i : -1).filter(i => i >= 0), to = tours.map(i => ({ i, d: (i - p.pos + N_TILES) % N_TILES })).sort((a, b) => a.d - b.d)[0].i; await this.goTo(p, to, true); await this.land(p); }
  }
  // ── 돈 내기 (모자라면 건물 팔기 → 그래도 모자라면 파산)
  async pay(p, to, amt, why, i) {
    if (p.cash < amt) await this.liquidate(p, amt);
    const v = Math.min(amt, Math.max(0, p.cash)); p.cash -= v; if (to) to.cash += v;
    await this.a({ t: 'pay', from: p, to, amt: v, why, i });
    if (p.cash <= 0 && v < amt) await this.bankrupt(p, to);
  }
  async liquidate(p, need) {
    const mine = this.own.map((o, i) => o === p.i ? i : -1).filter(i => i >= 0).sort((a, b) => this.paid[a] - this.paid[b]);
    for (const i of mine) { if (p.cash >= need) break; const v = Math.round(this.paid[i] / 2); p.cash += v; this.own[i] = -1; this.lv[i] = -1; this.paid[i] = 0; if (this.festival === i) this.festival = -1; await this.a({ t: 'sell', p, i, amt: v }); }
  }
  async bankrupt(p, by) { p.out = true; p.cash = 0; this.own.forEach((o, i) => { if (o === p.i) { this.own[i] = -1; this.lv[i] = -1; this.paid[i] = 0; } }); await this.a({ t: 'bankrupt', p, by }); const a = this.alive(); if (a.length === 1) this.win(a[0], 'bankrupt'); }
  // ── 독점 승리: 한 변 전부 · 색 줄 3개 · 관광지 4곳
  check(p) {
    if (this.winner) return;
    const ownsAll = ids => ids.every(i => TILES[i].k !== 'c' && TILES[i].k !== 't' || this.own[i] === p.i);
    if (SIDES.some(ownsAll)) return this.win(p, 'line');
    if (GROUPS.filter((g, k) => this.groupOwner(k) === p.i).length >= 3) return this.win(p, 'triple');
    if (TILES.every((t, i) => t.k !== 't' || this.own[i] === p.i)) return this.win(p, 'tour');
  }
  // 위험 알림: 독점까지 한 칸 남은 상대
  threats() { const out = []; for (const p of this.alive()) { SIDES.forEach((ids, s) => { const need = ids.filter(i => (TILES[i].k === 'c' || TILES[i].k === 't') && this.own[i] !== p.i); if (need.length === 1 && this.lv[need[0]] < 4) out.push({ p, kind: 'line', i: need[0] }); });
    const tn = TILES.map((t, i) => t.k === 't' && this.own[i] !== p.i ? i : -1).filter(i => i >= 0); if (tn.length === 1) out.push({ p, kind: 'tour', i: tn[0] }); } return out; }
}
export const REASON = { bankrupt: '모두 파산!', line: '라인 독점!', triple: '트리플 독점!', tour: '관광지 독점!', rich: '자산 1위!' };
