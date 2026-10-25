// 상대 AI: 다음 행동 하나씩 돌려줌 (화면이 한 동작씩 보여 줄 수 있게)
// { kind: 'power' } · { kind: 'act', id, to, then: { kind: 'attack'|'capture'|'wait'|'unload', target, at } } · { kind: 'build', x, y, type } · { kind: 'end' }
import { UNITS, UNIT_ORDER, TERRAIN, COS, FOOT, base, repairsAt } from './data.js?v=0.44.3';
import { dist } from './sim.js?v=0.44.3';

const LV = { easy: { noise: 0.5, threat: 0.25, focus: 0.6 }, normal: { noise: 0.12, threat: 0.45, focus: 1.1 }, hard: { noise: 0, threat: 0.6, focus: 1.3 } };

// 적이 다음 턴에 때릴 수 있는 칸마다 위협 (유닛 종류별 계산은 나중에)
function threatMap(sim, p) {
  const m = new Map();
  for (const e of sim.units) {
    if (e.p === p || e.inside || !UNITS[e.type].range || sim.hidden(p, e)) continue;
    const r = sim.rangeOf(e), from = UNITS[e.type].indirect ? [[e.x, e.y]] : [...sim.reach(e).values()].filter(v => v.stop).map(v => [v.x, v.y]);
    const hit = new Set();
    for (const [fx, fy] of from) for (let dx = -r[1]; dx <= r[1]; dx++) for (let dy = -r[1]; dy <= r[1]; dy++) {
      const d = Math.abs(dx) + Math.abs(dy); if (d < r[0] || d > r[1]) continue;
      hit.add(`${fx + dx},${fy + dy}`);
    }
    for (const k of hit) { const a = m.get(k) || []; a.push(e); m.set(k, a); }
  }
  return m;
}


// ── 수송 판단: 땅덩어리(이동 방식별 연결 영역) · 목표(적 본부·남의 건물·적 유닛)가 없는 섬에 갇힌 유닛 ──
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const passable = (sim, i, mt) => TERRAIN[sim.tiles[i].t].cost[mt] != null;
function labels(sim, mt) {
  sim._lab ||= {}; if (sim._lab[mt]) return sim._lab[mt];
  const n = sim.w * sim.h, lab = new Int32Array(n).fill(-1); let id = 0;
  for (let i = 0; i < n; i++) {
    if (lab[i] >= 0 || !passable(sim, i, mt)) continue;
    const q = [i]; lab[i] = id;
    while (q.length) { const j = q.pop(), x = j % sim.w, y = (j / sim.w) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= sim.w || ny >= sim.h) continue; const k = ny * sim.w + nx; if (lab[k] < 0 && passable(sim, k, mt)) { lab[k] = id; q.push(k); } } }
    id++;
  }
  return (sim._lab[mt] = lab);
}
function goalComps(sim, p, mt) {
  const lab = labels(sim, mt), out = new Set();
  sim.tiles.forEach((t, i) => { if (TERRAIN[t.t].prop && t.owner !== p && lab[i] >= 0) out.add(lab[i]); });
  for (const e of sim.units) if (e.p !== p && !e.inside && !UNITS[e.type].air) { const l = lab[e.y * sim.w + e.x]; if (l >= 0) out.add(l); }
  return out;
}
export function stranded(sim, u) {
  const U = UNITS[u.type]; if (U.dom !== 'ground' || u.inside) return false;
  return !goalComps(sim, u.p, U.mt).has(labels(sim, U.mt)[u.y * sim.w + u.x]);
}
const fits = (tr, u) => { const C = UNITS[tr].carry; return !!C && (C.what === 'foot' ? FOOT.includes(u.type) : C.what === 'air' ? UNITS[u.type].dom === 'air' : UNITS[u.type].dom === 'ground'); };
const ferries = t => UNITS[t].carry && UNITS[t].dom !== 'ground' && UNITS[t].carry.what !== 'air';
// 여러 출발 칸에서 이동 비용 거리 (유닛은 무시)
function distField(sim, mt, sources, init) {
  const n = sim.w * sim.h, d = new Float64Array(n).fill(1e9), q = [];
  for (const i of sources) { const c0 = init ? init(i) : 0; if (c0 < d[i]) { d[i] = c0; q.push([c0, i]); } }
  while (q.length) {
    q.sort((a, b) => a[0] - b[0]); const [c, i] = q.shift(); if (c > d[i]) continue;
    const x = i % sim.w, y = (i / sim.w) | 0;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= sim.w || ny >= sim.h) continue; const k = ny * sim.w + nx, mc = TERRAIN[sim.tiles[k].t].cost[mt]; if (mc == null) continue; if (c + mc < d[k]) { d[k] = c + mc; q.push([c + mc, k]); } }
  }
  return d;
}

export class AI {
  constructor(level = 'normal', rng = Math.random) { this.L = LV[level] || LV.normal; this.R = rng; this.cache = null; }
  next(sim) {
    const p = sim.turn;
    if (sim.over) return { kind: 'end' };
    if (sim.powerReady(p, 3)) return { kind: 'power', lvl: 3 };
    if (sim.canSwap(p) && sim.power[p] < sim.tagPow[p] * 0.7) return { kind: 'swap' };
    if (sim.powerReady(p, 2)) return { kind: 'power', lvl: 2 };
    if (sim.powerReady(p, 1) && sim.power[p] < (COS[sim.cos[p]].sneed * 0.8)) return { kind: 'power', lvl: 1 };
    if (!this.cache || this.cache.day !== sim.day || this.cache.p !== p || this.cache.n !== sim.units.length) this.cache = { day: sim.day, p, n: sim.units.length, threat: threatMap(sim, p) };
    // 간접 유닛 먼저 (움직이기 전에 쏠 수 있게), 그다음 비싼 유닛, 마지막에 보병
    const todo = sim.mine(p).filter(u => !u.done && !u.inside).sort((a, b) => (UNITS[b.type].indirect ? 1 : 0) - (UNITS[a.type].indirect ? 1 : 0) || UNITS[b.type].cost - UNITS[a.type].cost);
    // 가장 가치 있는 공격·점령부터 (유닛 순서와 상관없이) — 없으면 원래 순서대로 이동
    if (this.L.focus >= 1.1 && todo.length > 1) {
      let top = null;
      for (const u of todo) { const pl = this.plan(sim, u); if (pl && ['attack', 'capture', 'explode', 'silo'].includes(pl.then.kind) && (!top || pl.score > top.score)) top = pl; }
      if (top) return top;
    }
    for (const u of todo) { const plan = this.plan(sim, u); if (plan) return plan; return { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'wait' } }; }
    const b = this.buildPlan(sim, p); if (b) return b;
    return { kind: 'end' };
  }
  // 한 유닛의 가장 좋은 (자리, 행동)
  plan(sim, u) {
    if (ferries(u.type)) return this.ferry(sim, u);
    const U = UNITS[u.type], val = U.cost, reach = sim.reach(u), p = u.p, threat = this.cache.threat;
    // 보급: 탄약이 바닥이거나 (하늘·바다) 연료가 돌아갈 만큼만 남았으면 아군 건물로
    const supT = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => o.t.owner === p && TERRAIN[o.t.t].prop && repairsAt(U.dom, o.t.t));
    const supD = (x, y) => supT.length ? Math.min(...supT.map(o => dist(x, y, o.x, o.y))) : 0;
    const needSup = supT.length && ((U.ammo != null && u.ammo === 0 && !U.mg) || (U.day > 0 && u.fuel <= U.day * 2 + supD(u.x, u.y) + 2));
    const needRep = !needSup && supT.length && u.hp <= 35 && val >= 6000;   // 많이 다친 비싼 유닛은 수리하러 후퇴
    const mates = sim.mine(p).filter(o => o !== u && !o.inside);
    const isStr = stranded(sim, u), boats = isStr ? sim.mine(p).filter(o => ferries(o.type) && fits(o.type, u) && o.cargo.length < UNITS[o.type].carry.n) : [];
    const enemies = sim.units.filter(e => e.p !== p && !e.inside && !sim.hidden(p, e));
    const enemyHQ = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => o.t.t === 'hq' && o.t.owner !== p);
    // 점령 목표: 다른 아군 점령병이 이미 올라가 있는 건물은 빼고 (서로 같은 곳으로 몰리지 않게)
    const props = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => TERRAIN[o.t.t].prop && o.t.owner !== p && !mates.some(m => m.x === o.x && m.y === o.y && UNITS[m.type].capture));
    const myHQ = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).find(o => o.t.t === 'hq' && o.t.owner === p);
    let best = null;
    const consider = (score, to, then) => { score += (this.R() - 0.5) * this.L.noise * 4000; if (!best || score > best.score) best = { score, to, then }; };
    for (const v of reach.values()) {
      if (!v.stop) continue;
      const moved = v.x !== u.x || v.y !== u.y;
      if (v.load) { const tr = sim.unitAt(v.x, v.y); consider(isStr && tr && ferries(tr.type) ? 20000 : -500, [v.x, v.y], { kind: 'wait' }); continue; }
      const t = sim.tile(v.x, v.y), stars = U.air ? 0 : TERRAIN[t.t].def;
      // 자리 점수: 지형 방어 · 위협 · 목표로 다가가기
      let pos = stars * 120;
      const th = threat.get(`${v.x},${v.y}`) || [];
      let risk = 0; for (const e of th) risk += base(e.type, u.type) * Math.ceil(e.hp / 10) / 10 * (1 - stars * Math.ceil(u.hp / 10) / 100);
      pos -= Math.min(100, risk) / 100 * val * this.L.threat * 0.6;
      // 목표 거리
      let goal = 0;
      if (U.capture && props.length) { const d = Math.min(...props.map(o => dist(v.x, v.y, o.x, o.y) + (o.t.t === 'hq' ? -3 : 0))); goal = -d * 260; }
      else if (enemies.length) { const near = enemies.map(e => dist(v.x, v.y, e.x, e.y) - (base(u.type, e.type) / 30)); goal = -Math.min(...near) * 160 * this.L.focus; }
      const late = sim.limit ? Math.max(0, sim.day - sim.limit * 0.55) / (sim.limit * 0.45) : 0;   // 기한이 가까우면 본부로 더 세게
      if (enemyHQ.length) goal += -dist(v.x, v.y, enemyHQ[0].x, enemyHQ[0].y) * (U.capture ? 120 : 60) * (Math.min(2, 0.5 + sim.day / 10) + late);
      if (needRep) goal = -supD(v.x, v.y) * 500 + (supD(v.x, v.y) === 0 ? 3000 : 0);
      // 함께 움직이기: 혼자 튀어나가지 않게 (원거리 유닛 제외)
      if (!U.indirect && !U.air) pos += Math.min(3, mates.filter(o => dist(o.x, o.y, v.x, v.y) <= 2).length) * 120;
      if (needSup) goal = -supD(v.x, v.y) * 700 + (supD(v.x, v.y) === 0 && !sim.unitAt(v.x, v.y) || (v.x === u.x && v.y === u.y && supD(v.x, v.y) === 0) ? 4000 : 0);
      // 섬에 갇힘: 수송 유닛 쪽으로
      if (isStr) goal = boats.length ? -Math.min(...boats.map(o => dist(v.x, v.y, o.x, o.y))) * 300 : 0;
      // 본부 지키기: 적이 우리 본부 근처면 가까이
      if (myHQ) { const intr = enemies.filter(e => UNITS[e.type].capture && dist(e.x, e.y, myHQ.x, myHQ.y) <= 4); if (intr.length) goal += -dist(v.x, v.y, myHQ.x, myHQ.y) * 300; }
      if (U.indirect) { // 간접: 적 위협 밖에서 사거리 끝에 걸치기
        const r = sim.rangeOf(u); const inRange = enemies.some(e => { const d = dist(v.x, v.y, e.x, e.y); return d >= r[0] && d <= r[1] + 2; }); if (inRange) goal += 1500;
      }
      if (U.carry) { const hurt = sim.mine(p).filter(o => o !== u && o.hp < 80 && dist(o.x, o.y, v.x, v.y) === 1).length; goal = hurt * 1200 - Math.min(...sim.mine(p).filter(o => o !== u).map(o => dist(o.x, o.y, v.x, v.y)).concat([10])) * 200; }
      // 우리 기지·비행장 위에 서 있으면 생산이 막힘
      if (TERRAIN[t.t].builds && t.owner === p) pos -= 2500;
      // 점령 못 하는 유닛이 적 본부·건물 위에 서 있으면 보병이 점령을 못 함
      if (!U.capture && TERRAIN[t.t].prop && t.owner !== p) pos -= t.t === 'hq' ? 12000 : mates.some(o => UNITS[o.type].capture && dist(o.x, o.y, v.x, v.y) <= 4) ? 7000 : 2500;
      const stay = pos + goal;
      consider(stay, [v.x, v.y], { kind: 'wait' });
      // 점령
      if (U.capture && TERRAIN[t.t].prop && t.owner !== p) {
        const done = t.cap <= Math.ceil(u.hp / 10) * (sim.cos[p] === 'jun' ? 1.5 : 1);
        consider(stay + 3000 + (t.cap < 20 ? 2000 : 0) + (done ? 2500 : 0) + (t.t === 'hq' ? 30000 : 0) + (t.owner ? 1500 : 0), [v.x, v.y], { kind: 'capture' });
      }
      // 공격
      for (const e of sim.targets(u, v.x, v.y, moved)) {
        const save = [u.x, u.y]; u.x = v.x; u.y = v.y;
        const f = sim.forecast(u, v.x, v.y, e); u.x = save[0]; u.y = save[1];
        let s = UNITS[e.type].cost * f.dmg / 100 * (f.kill ? 1.5 : 1) - val * f.counter / 100 * 1.1;
        if (f.kill) s += UNITS[e.type].cost * 0.4;                 // 마무리: 위협 하나를 아예 없앰
        s += (100 - e.hp) / 100 * UNITS[e.type].cost * 0.3;      // 약해진 적 집중
        const et = sim.tile(e.x, e.y); if (TERRAIN[et.t].prop && UNITS[e.type].capture && et.owner === p) s += 3000 + (et.t === 'hq' ? 15000 : 0);   // 우리 건물 점령 중인 적
        if (f.die) s -= val;
        consider(stay * 0.6 + s * 1.3 + 900, [v.x, v.y], { kind: 'attack', target: e.id });
      }
    }
    // 자폭 드론 · 미사일 기지: 적 가치 - 아군 가치 가 크면 터뜨림
    const blast = (x, y, r, dmg, self) => { let v = 0; for (const o of sim.siloHits(x, y, r)) { if (o === self) continue; const d = Math.min(dmg, o.hp - 1) / 100 * UNITS[o.type].cost; v += o.p !== p ? d : -d * 1.2; } return v; };
    if (u.type === 'bomb') for (const v of reach.values()) { if (!v.stop || v.load || (sim.unitAt(v.x, v.y) && sim.unitAt(v.x, v.y) !== u)) continue; const val = blast(v.x, v.y, 3, 50, u) - UNITS.bomb.cost * 0.6; if (val > 3000) consider(val * 2 + 20000, [v.x, v.y], { kind: 'explode' }); }
    if (FOOT.includes(u.type)) for (const v of reach.values()) {
      if (!v.stop || sim.tile(v.x, v.y).t !== 'silo' || (sim.unitAt(v.x, v.y) && sim.unitAt(v.x, v.y) !== u)) continue;
      let bt = null; for (let y = 0; y < sim.h; y++) for (let x = 0; x < sim.w; x++) { const val = blast(x, y, 2, 30); if (!bt || val > bt.val) bt = { val, x, y }; }
      if (bt && bt.val > 5000) consider(bt.val * 2 + 20000, [v.x, v.y], { kind: 'silo', at: [bt.x, bt.y] });
    }
    // 파이프 이음매: 할 일 없으면 부숨
    if (U.range && (!best || best.then.kind === 'wait') && !enemies.some(e => dist(e.x, e.y, u.x, u.y) <= 5)) for (const v of reach.values()) { if (!v.stop || (sim.unitAt(v.x, v.y) && sim.unitAt(v.x, v.y) !== u)) continue; const sm = sim.seamTargets(u, v.x, v.y, v.x !== u.x || v.y !== u.y); if (sm.length) consider((best ? best.score : 0) + 600, [v.x, v.y], { kind: 'seam', at: [sm[0].x, sm[0].y] }); }
    // 트럭: 실은 보병 내리기 (점령할 건물 옆이면)
    if (u.cargo.length && !best?.then?.kind?.startsWith('attack')) {
      const spots = sim.unloadSpots(u);
      for (const [x, y] of spots) { const t = sim.tile(x, y); if (TERRAIN[t.t].prop && t.owner !== p) return { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'unload', at: [x, y] } }; }
    }
    // 잠수함·스텔스기: 공격하지 않을 땐 잠수·은신 (보이지 않게)
    if (best && U.dive && !u.dive && best.then.kind === 'wait') best.then = { kind: 'dive' };
    return best ? { kind: 'act', id: u.id, to: best.to, then: best.then, score: best.score } : null;
  }

  // 상륙정 · 수송헬기: 갇힌 아군 태우러 가기 → 목표가 있는 땅 옆에 내려 주기
  ferry(sim, u) {
    const U = UNITS[u.type], p = u.p, w = sim.w, threat = this.cache.threat, wait = { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'wait' } };
    const stand = i => passable(sim, i, U.mt) && (U.dom === 'air' || ['beach', 'port'].includes(sim.tiles[i].t));
    const risk = (x, y, val) => { let r = 0; for (const e of threat.get(`${x},${y}`) || []) r += base(e.type, u.type) * Math.ceil(e.hp / 10) / 10; return Math.min(100, r) / 100 * val * this.L.threat; };
    const free = (x, y) => { const o = sim.unitAt(x, y); return !o || o === u; };
    if (u.cargo.length) {
      const c = sim.unit(u.cargo[0]), cmt = UNITS[c.type].mt, lab = labels(sim, cmt), gc = goalComps(sim, p, cmt);
      const good = ([x, y]) => gc.has(lab[y * w + x]);
      const spotsAt = (x, y) => { const sv = [u.x, u.y]; u.x = x; u.y = y; const sp = sim.unloadSpots(u).filter(good); u.x = sv[0]; u.y = sv[1]; return sp; };
      const pickSpot = sp => sp.sort((a, b) => Math.min(...sim.units.filter(e => e.p !== p).map(e => dist(a[0], a[1], e.x, e.y)).concat([99])) - Math.min(...sim.units.filter(e => e.p !== p).map(e => dist(b[0], b[1], e.x, e.y)).concat([99])))[sp.length - 1];
      if (u.moved) { const sp = spotsAt(u.x, u.y); return sp.length ? { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'unload', at: pickSpot(sp) } } : wait; }
      // 자리가 남았고 갇힌 아군이 이번 턴에 탈 수 있으면 기다림
      if (u.cargo.length < U.carry.n && (u.waited || 0) < 2 && sim.mine(p).some(o => !o.inside && fits(u.type, o) && stranded(sim, o) && dist(o.x, o.y, u.x, u.y) <= 5)) { u.waited = (u.waited || 0) + 1; return wait; }
      u.waited = 0;
      const src = []; for (let i = 0; i < w * sim.h; i++) if (stand(i)) { const x = i % w, y = (i / w) | 0; if (N4.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < sim.h && passable(sim, ny * w + nx, cmt) && good([nx, ny]); })) src.push(i); }
      if (!src.length) return wait;
      // 내릴 자리: 점령병은 적 건물(본부 우선) 가까이, 전투 유닛은 적 유닛 가까이
      const capT = sim.tiles.map((t, i) => [t, i]).filter(([t, i]) => TERRAIN[t.t].prop && t.owner !== p && gc.has(lab[i])).map(([t, i]) => [i % w, (i / w) | 0, t.t === 'hq' ? 3 : 0]);
      const foes = sim.units.filter(e => e.p !== p && !e.inside && gc.has(lab[e.y * w + e.x])).map(e => [e.x, e.y, 0]);
      const aims = UNITS[c.type].capture && capT.length ? capT : foes.length ? foes : capT;
      const init = i => { const x = i % w, y = (i / w) | 0; return aims.length ? Math.min(...aims.map(([ax, ay, b]) => dist(x, y, ax, ay) - b)) * 0.8 + 3 : 0; };
      const df = distField(sim, U.mt, src, init), val = U.cost + u.cargo.reduce((a, id) => a + UNITS[sim.unit(id).type].cost, 0);
      let best = null;
      for (const v of sim.reach(u).values()) {
        if (!v.stop || v.load || !free(v.x, v.y)) continue;
        const sp = src.includes(v.y * w + v.x) ? spotsAt(v.x, v.y) : [];
        const sc = (sp.length ? 100000 - init(v.y * w + v.x) * 2000 : -df[v.y * w + v.x] * 300) - risk(v.x, v.y, val) + (this.R() - 0.5) * this.L.noise * 600;
        if (!best || sc > best.sc) best = { sc, v, sp };
      }
      if (!best) return wait;
      return { kind: 'act', id: u.id, to: [best.v.x, best.v.y], then: best.sp.length ? { kind: 'unload', at: pickSpot(best.sp) } : { kind: 'wait' } };
    }
    // 빈 수송: 갇힌 아군이 이번·다음 턴에 올라탈 수 있는 칸으로
    const want = sim.mine(p).filter(o => !o.inside && fits(u.type, o) && stranded(sim, o));
    const src = new Set();
    for (const o of want) for (const v of sim.reach(o).values()) { const i = v.y * w + v.x; if ((v.stop || (v.x === u.x && v.y === u.y)) && stand(i)) src.add(i); }
    const myB = (x, y) => { const t = sim.tile(x, y); return TERRAIN[t.t].builds && t.owner === p; };
    if (!src.size) { if (!myB(u.x, u.y)) return wait; const v = [...sim.reach(u).values()].find(v => v.stop && !v.load && free(v.x, v.y) && !myB(v.x, v.y)); return v ? { kind: 'act', id: u.id, to: [v.x, v.y], then: { kind: 'wait' } } : wait; }
    const df = distField(sim, U.mt, src);
    let best = null;
    for (const v of sim.reach(u).values()) {
      if (!v.stop || v.load || !free(v.x, v.y)) continue;
      const sc = -df[v.y * w + v.x] * 300 - risk(v.x, v.y, U.cost) - (myB(v.x, v.y) ? 2000 : 0) + (this.R() - 0.5) * this.L.noise * 600;
      if (!best || sc > best.sc) best = { sc, v };
    }
    return best ? { kind: 'act', id: u.id, to: [best.v.x, best.v.y], then: { kind: 'wait' } } : wait;
  }
  // 생산: 상대 구성에 맞는 상성 유닛 (자금 안에서 가장 효율 좋은 것)
  buildPlan(sim, p) {
    const spots = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => o.t.owner === p && TERRAIN[o.t.t].builds && !sim.unitAt(o.x, o.y));
    if (!spots.length || (sim.noBuild || []).includes(p)) return null;
    const enemies = sim.units.filter(e => e.p !== p), mine = sim.mine(p);
    const neutral = sim.tiles.filter(t => TERRAIN[t.t].prop && t.owner === 0).length;
    const caps = mine.filter(u => UNITS[u.type].capture).length;
    const hasGround = sim.tiles.some(t => t.owner === p && TERRAIN[t.t].builds === 'ground');
    for (const o of spots) {
      const kind = TERRAIN[o.t.t].builds, funds = sim.funds[p];
      // 헬기가 많은데 대공포차가 모자라면 돈을 모아 대공포차부터
      const air = enemies.filter(e => UNITS[e.type].air).length, myAA = mine.filter(u => u.type === 'aa').length;
      if (kind === 'ground' && air >= 2 && myAA < Math.ceil(air / 2)) { if (funds >= sim.costOf('aa', p)) return { kind: 'build', x: o.x, y: o.y, type: 'aa' }; continue; }
      // 섬에 갇힌 아군이 있으면 수송 유닛 (한 종류당 최대 2척)
      const ft = UNIT_ORDER.find(t => ferries(t) && UNITS[t].dom === kind);
      if (ft) {
        const str = mine.filter(u => fits(ft, u) && stranded(sim, u)).length, have = mine.filter(u => u.type === ft).length;
        if (str && have < Math.min(3, Math.ceil(str / UNITS[ft].carry.n))) { if (funds >= sim.costOf(ft, p)) return { kind: 'build', x: o.x, y: o.y, type: ft }; if (kind === 'sea') continue; }
      }
      // 갇힌 땅의 기지: 이미 많이 쌓였으면 수송비를 모음
      let islandBase = false;
      if (kind === 'ground') { const fake = { type: 'inf', p, x: o.x, y: o.y }; islandBase = stranded(sim, fake); if (islandBase && mine.filter(u => stranded(sim, u)).length >= 4) continue; }
      const opts = UNIT_ORDER.filter(t => UNITS[t].dom === kind && sim.costOf(t, p) <= funds && UNITS[t].range && (t !== 'piper' || sim.pipeBase(o.x, o.y)) && (!islandBase || FOOT.includes(t) || t === 'ltank'));   // 섬에 갇힌 기지: 실어 나르기 좋은 유닛만
      if (!opts.length) continue;
      let pick = null, bs = -1e9;
      const needCap = (caps < Math.min(4, neutral + 2) && sim.day < 10) || caps < 2;
      const aaN = enemies.filter(e => e.type === 'aa' || e.type === 'cruiser' || e.type === 'fighter').length, myAir = mine.filter(u => UNITS[u.type].air && UNITS[u.type].range).length;
      for (const t of opts) {
        if (UNITS[t].air && UNITS[t].range && aaN >= 2 && myAir >= 2 && hasGround) continue;   // 대공이 많으면 공중 유닛은 그만 (기지가 있을 때)
        // 상성 효율 (상대 유닛 평균) + 돈을 쓰려는 성향 (비싼 유닛 선호) + 필요하면 점령병
        let eff = 0;
        for (const e of enemies) eff += base(t, e.type) * UNITS[e.type].cost / 100 - base(e.type, t) * UNITS[t].cost / 100 * 0.5;
        let s = (enemies.length ? eff / enemies.length : 0) + UNITS[t].cost * 0.35;
        if (UNITS[t].capture) s += needCap ? 6000 : -2000;
        if (t === 'aa' && enemies.some(e => UNITS[e.type].air)) s += mine.filter(u => u.type === 'aa').length >= enemies.filter(e => UNITS[e.type].air && UNITS[e.type].range).length ? -4000 : 3000;
        if (t === 'aa' && !enemies.some(e => UNITS[e.type].air)) s -= 1500;
        if (UNITS[t].air && UNITS[t].range) { const aa = enemies.filter(e => e.type === 'aa' || e.type === 'cruiser' || e.type === 'fighter').length; s -= aa * 2500; }
        { const ni = mine.filter(u => UNITS[u.type].indirect).length; if (UNITS[t].indirect && ni >= 2) s -= 3000 * (ni - 1); }
        s += (this.R() - 0.5) * this.L.noise * 3000;
        if (s > bs) { bs = s; pick = t; }
      }
      // 돈이 적게 남으면 보병으로 채움
      if (pick && sim.costOf(pick, p) <= funds) return { kind: 'build', x: o.x, y: o.y, type: pick };
    }
    return null;
  }
}
// 한 행동 실행 (화면 없이 · 봇용)
export function apply(sim, a) {
  if (a.kind === 'power') return sim.usePower(a.lvl || 1);
  if (a.kind === 'swap') return sim.swap();
  if (a.kind === 'build') return sim.build(a.x, a.y, a.type);
  if (a.kind === 'end') { sim.endTurn(); return true; }
  if (a.kind === 'act') {
    if (!sim.move(a.id, a.to[0], a.to[1])) { sim.wait(a.id); return false; }
    const u = sim.unit(a.id); if (!u || u.done) return true;
    const t = a.then;
    if (t.kind === 'attack') { if (!sim.attack(a.id, t.target)) sim.wait(a.id); }
    else if (t.kind === 'capture') { if (!sim.capture(a.id)) sim.wait(a.id); }
    else if (t.kind === 'dive') { if (!sim.dive(a.id)) sim.wait(a.id); }
    else if (t.kind === 'explode') { if (!sim.explode(a.id)) sim.wait(a.id); }
    else if (t.kind === 'silo') { if (!sim.launch(a.id, t.at[0], t.at[1])) sim.wait(a.id); }
    else if (t.kind === 'seam') { if (!sim.attackSeam(a.id, t.at[0], t.at[1])) sim.wait(a.id); }
    else if (t.kind === 'unload') { if (!sim.unload(a.id, t.at[0], t.at[1])) sim.wait(a.id); }
    else sim.wait(a.id);
    return true;
  }
}
