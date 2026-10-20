// 상대 AI: 다음 행동 하나씩 돌려줌 (화면이 한 동작씩 보여 줄 수 있게)
// { kind: 'power' } · { kind: 'act', id, to, then: { kind: 'attack'|'capture'|'wait'|'unload', target, at } } · { kind: 'build', x, y, type } · { kind: 'end' }
import { UNITS, UNIT_ORDER, TERRAIN, base } from './data.js?v=0.10.1';
import { dist } from './sim.js?v=0.10.1';

const LV = { easy: { noise: 0.5, threat: 0.25, focus: 0.6 }, normal: { noise: 0.12, threat: 0.45, focus: 1.1 }, hard: { noise: 0, threat: 0.6, focus: 1.3 } };

// 적이 다음 턴에 때릴 수 있는 칸마다 위협 (유닛 종류별 계산은 나중에)
function threatMap(sim, p) {
  const m = new Map();
  for (const e of sim.units) {
    if (e.p === p || e.inside || !UNITS[e.type].range) continue;
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

export class AI {
  constructor(level = 'normal', rng = Math.random) { this.L = LV[level] || LV.normal; this.R = rng; this.cache = null; }
  next(sim) {
    const p = sim.turn;
    if (sim.over) return { kind: 'end' };
    if (sim.powerReady(p)) return { kind: 'power' };
    if (!this.cache || this.cache.day !== sim.day || this.cache.p !== p || this.cache.n !== sim.units.length) this.cache = { day: sim.day, p, n: sim.units.length, threat: threatMap(sim, p) };
    // 간접 유닛 먼저 (움직이기 전에 쏠 수 있게), 그다음 비싼 유닛, 마지막에 보병
    const todo = sim.mine(p).filter(u => !u.done && !u.inside).sort((a, b) => (UNITS[b.type].indirect ? 1 : 0) - (UNITS[a.type].indirect ? 1 : 0) || UNITS[b.type].cost - UNITS[a.type].cost);
    for (const u of todo) { const plan = this.plan(sim, u); if (plan) return plan; return { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'wait' } }; }
    const b = this.buildPlan(sim, p); if (b) return b;
    return { kind: 'end' };
  }
  // 한 유닛의 가장 좋은 (자리, 행동)
  plan(sim, u) {
    const U = UNITS[u.type], val = U.cost, reach = sim.reach(u), p = u.p, threat = this.cache.threat;
    const enemies = sim.units.filter(e => e.p !== p && !e.inside);
    const enemyHQ = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => o.t.t === 'hq' && o.t.owner !== p);
    const props = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => TERRAIN[o.t.t].prop && o.t.owner !== p);
    const myHQ = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).find(o => o.t.t === 'hq' && o.t.owner === p);
    let best = null;
    const consider = (score, to, then) => { score += (this.R() - 0.5) * this.L.noise * 4000; if (!best || score > best.score) best = { score, to, then }; };
    for (const v of reach.values()) {
      if (!v.stop) continue;
      const moved = v.x !== u.x || v.y !== u.y;
      if (v.load) { consider(-500, [v.x, v.y], { kind: 'wait' }); continue; }
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
      if (enemyHQ.length) goal += -dist(v.x, v.y, enemyHQ[0].x, enemyHQ[0].y) * (U.capture ? 120 : 60) * Math.min(2, 0.5 + sim.day / 10);
      // 본부 지키기: 적이 우리 본부 근처면 가까이
      if (myHQ) { const intr = enemies.filter(e => UNITS[e.type].capture && dist(e.x, e.y, myHQ.x, myHQ.y) <= 4); if (intr.length) goal += -dist(v.x, v.y, myHQ.x, myHQ.y) * 300; }
      if (U.indirect) { // 간접: 적 위협 밖에서 사거리 끝에 걸치기
        const r = sim.rangeOf(u); const inRange = enemies.some(e => { const d = dist(v.x, v.y, e.x, e.y); return d >= r[0] && d <= r[1] + 2; }); if (inRange) goal += 1500;
      }
      if (U.carry) { const hurt = sim.mine(p).filter(o => o !== u && o.hp < 80 && dist(o.x, o.y, v.x, v.y) === 1).length; goal = hurt * 1200 - Math.min(...sim.mine(p).filter(o => o !== u).map(o => dist(o.x, o.y, v.x, v.y)).concat([10])) * 200; }
      // 우리 기지·비행장 위에 서 있으면 생산이 막힘
      if (TERRAIN[t.t].builds && t.owner === p) pos -= 2500;
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
        const et = sim.tile(e.x, e.y); if (TERRAIN[et.t].prop && UNITS[e.type].capture && et.owner === p) s += 3000 + (et.t === 'hq' ? 15000 : 0);   // 우리 건물 점령 중인 적
        if (f.die) s -= val;
        consider(stay + s + 400, [v.x, v.y], { kind: 'attack', target: e.id });
      }
    }
    // 트럭: 실은 보병 내리기 (점령할 건물 옆이면)
    if (u.cargo && !best?.then?.kind?.startsWith('attack')) {
      const spots = sim.unloadSpots(u);
      for (const [x, y] of spots) { const t = sim.tile(x, y); if (TERRAIN[t.t].prop && t.owner !== p) return { kind: 'act', id: u.id, to: [u.x, u.y], then: { kind: 'unload', at: [x, y] } }; }
    }
    return best ? { kind: 'act', id: u.id, to: best.to, then: best.then } : null;
  }
  // 생산: 상대 구성에 맞는 상성 유닛 (자금 안에서 가장 효율 좋은 것)
  buildPlan(sim, p) {
    const spots = sim.tiles.map((t, i) => ({ t, x: i % sim.w, y: (i / sim.w) | 0 })).filter(o => o.t.owner === p && TERRAIN[o.t.t].builds && !sim.unitAt(o.x, o.y));
    if (!spots.length) return null;
    const enemies = sim.units.filter(e => e.p !== p), mine = sim.mine(p);
    const neutral = sim.tiles.filter(t => TERRAIN[t.t].prop && t.owner === 0).length;
    const caps = mine.filter(u => UNITS[u.type].capture).length;
    for (const o of spots) {
      const kind = TERRAIN[o.t.t].builds, funds = sim.funds[p];
      // 헬기가 많은데 대공포차가 모자라면 돈을 모아 대공포차부터
      const air = enemies.filter(e => UNITS[e.type].air).length, myAA = mine.filter(u => u.type === 'aa').length;
      if (kind === 'ground' && air >= 2 && myAA < Math.ceil(air / 2)) { if (funds >= UNITS.aa.cost) return { kind: 'build', x: o.x, y: o.y, type: 'aa' }; continue; }
      const opts = UNIT_ORDER.filter(t => (kind === 'air') === !!UNITS[t].air && UNITS[t].cost <= funds && t !== 'truck');
      if (!opts.length) continue;
      let pick = null, bs = -1e9;
      const needCap = caps < Math.min(4, neutral + 2) && sim.day < 10;
      for (const t of opts) {
        // 상성 효율 (상대 유닛 평균) + 돈을 쓰려는 성향 (비싼 유닛 선호) + 필요하면 점령병
        let eff = 0;
        for (const e of enemies) eff += base(t, e.type) * UNITS[e.type].cost / 100 - base(e.type, t) * UNITS[t].cost / 100 * 0.5;
        let s = (enemies.length ? eff / enemies.length : 0) + UNITS[t].cost * 0.35;
        if (UNITS[t].capture) s += needCap ? 6000 : -2000;
        if (t === 'aa' && enemies.some(e => UNITS[e.type].air)) s += 3000;
        if (t === 'aa' && !enemies.some(e => UNITS[e.type].air)) s -= 1500;
        if (UNITS[t].indirect && mine.filter(u => UNITS[u.type].indirect).length >= 2) s -= 3000;
        s += (this.R() - 0.5) * this.L.noise * 3000;
        if (s > bs) { bs = s; pick = t; }
      }
      // 돈이 적게 남으면 보병으로 채움
      if (pick && UNITS[pick].cost <= funds) return { kind: 'build', x: o.x, y: o.y, type: pick };
    }
    return null;
  }
}
// 한 행동 실행 (화면 없이 · 봇용)
export function apply(sim, a) {
  if (a.kind === 'power') return sim.usePower();
  if (a.kind === 'build') return sim.build(a.x, a.y, a.type);
  if (a.kind === 'end') { sim.endTurn(); return true; }
  if (a.kind === 'act') {
    if (!sim.move(a.id, a.to[0], a.to[1])) { sim.wait(a.id); return false; }
    const u = sim.unit(a.id); if (!u || u.done) return true;
    const t = a.then;
    if (t.kind === 'attack') { if (!sim.attack(a.id, t.target)) sim.wait(a.id); }
    else if (t.kind === 'capture') { if (!sim.capture(a.id)) sim.wait(a.id); }
    else if (t.kind === 'unload') { if (!sim.unload(a.id, t.at[0], t.at[1])) sim.wait(a.id); }
    else sim.wait(a.id);
    return true;
  }
}
