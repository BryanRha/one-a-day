// 가게 놀이: 끌어서 이동 · 굽기/바르기/내리기 · 진열 · 손님 줄 · 계산 · 돈 줍기 · 열기 칸 · 직원 · 테이블 치우기 · 드라이브스루
import * as THREE from 'three';
import { BRANCHES, MENU, PLAYER, STAFF, CUST_COLORS, BRAND } from './data.js?v=0.57.2';
import { M, box, cyl, item, person, shopShell, STATION, car, ITEM_H } from './models.js?v=0.57.2';
import { S, save, addSold, mission } from './state.js?v=0.57.2';
import { sfx } from './audio.js?v=0.57.2';

const V = THREE.Vector3, R = 85, rnd = (a, b) => a + Math.random() * (b - a);
const RIGHT = new V(1, 0, -1).normalize(), DOWN = new V(1, 0, 1).normalize();
const SHELF = { bagel: -115, cream: -40, coffee: 35 };

export class Game {
  constructor(sc, cam, ui) { this.sc = sc; this.cam = cam; this.ui = ui; this.t = 0; this.fly = []; this.fx = []; }
  build(bi) {
    const sc = this.sc; sc.clear(); this.B = BRANCHES[bi]; const B = this.B; this.bi = bi;
    sc.background = new THREE.Color(BRAND.cream);
    sc.add(new THREE.HemisphereLight(0xFFF6EA, 0xC9A882, 1.6)); const sun = new THREE.DirectionalLight(0xFFF1DC, 2.2); sun.position.set(-500, 1200, 700); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 10, far: 3200 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; sc.add(sun, sun.target); this.sun = sun;
    shopShell(sc, B.W, B.D, B.theme);
    this.st = {}; this.zones = []; this.pads = []; this.cust = []; this.cars = []; this.staff = []; this.piles = [];
    this.unl = new Set(S.branch[bi]?.unl || []); B.slots.forEach(s => { if (s.free) this.unl.add(s.id); });
    for (const s of B.slots) if (this.unl.has(s.id)) this.place(s, false);
    this.refreshPads();
    const P = person({ body: BRAND.accentHex, apron: true, cap: 0xFFFFFF }); P.g.position.set(150, 0, -150); sc.add(P.g);
    this.pl = { P, pos: P.g.position, stack: [], kind: null, cap: S.up.carry ? PLAYER.carryUp : PLAYER.carry, tick: 0, isPlayer: true };
    for (const k of ['cashier', 'baker', 'cleaner']) if (S.branch[bi]?.staff?.includes(k)) this.hire(k, true);
    this.spawnT = 1; this.carT = 4; this.camT = this.pl.pos.clone();
    /* 안내 화살표 (처음 몇 단계) */ this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(26, 50, 4), M(0xFF6A3A)); cone.rotation.x = Math.PI; this.arrow.add(cone); sc.add(this.arrow);
  }
  // ── 설비 놓기
  place(s, anim) {
    if (s.type === 'hire' || s.type === 'up' || s.type === 'next') return;
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); this.sc.add(g); STATION[s.type](g);
    const o = { s, g, type: s.type, x: s.x, z: s.z, stack: [], in: 0, inStack: [], t: 0 };
    if (s.type === 'table') { o.seats = [-95, 95].map(dx => ({ x: s.x + dx, z: s.z, who: null })); o.trash = []; }
    if (s.type === 'counter') { o.shelf = { bagel: [], cream: [], coffee: [] }; o.cash = this.pile(s.x + 230, s.z + 10); }
    if (s.type === 'drive') o.cash = this.pile(s.x - 140, s.z + 170);
    this.st[s.id] = o; o.Z = {}; for (const [k, dx, dz, w, d, col] of ZONES[s.type] || []) o.Z[k] = this.zone(s.x + dx, s.z + dz, w, d, col); this.zoneVis();
    if (anim) { g.scale.setScalar(0.01); this.fx.push({ t: 0, d: 0.5, f: u => g.scale.setScalar(u < 0.7 ? u / 0.7 * 1.15 : 1.15 - (u - 0.7) / 0.3 * 0.15) }); this.confetti(s.x, 120, s.z); }
  }
  // 동작 칸: 바닥에 그린 칸 = 실제로 동작하는 범위 (들어서면 밝아짐)
  zone(x, z, w, d, col) { const g = new THREE.Group(); g.position.set(x, 0, z); this.sc.add(g);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); edge.position.y = 1.5; g.add(edge);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(w - 14, 4, d - 14), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })); inner.position.y = 2; g.add(inner);
    const Z = { x, z, w, d, g, inner, col: new THREE.Color(col) }; (this.zones ||= []).push(Z); return Z; }
  in(w, Z) { return !!Z && Z.g.visible && Math.abs(w.pos.x - Z.x) < Z.w / 2 && Math.abs(w.pos.z - Z.z) < Z.d / 2; }
  zoneVis() { const c = this.st.counter; if (!c || !c.Z.cream) return; c.Z.cream.g.visible = !!this.st.cc; c.Z.coffee.g.visible = !!this.st.coffee; }
  pile(x, z) { const p = { x, z, v: 0, meshes: [] }; this.piles.push(p); return p; }
  addCash(p, v) { p.v += v; const n = Math.min(36, Math.ceil(p.v / Math.max(1, 6 * this.B.mult))); while (p.meshes.length < n) { const i = p.meshes.length, m = box(40, 10, 24, 0x6FCB7A, p.x + (i % 3) * 44 - 44, Math.floor(i / 6) * 11, p.z + (Math.floor(i / 3) % 2) * 28, this.sc); p.meshes.push(m); } }
  // ── 열기 칸: 열리지 않은 것 중 앞의 2개
  refreshPads() {
    for (const p of this.pads) { this.sc.remove(p.g); p.tag.remove(); } this.pads = [];
    const next = this.B.slots.filter(s => !s.free && !this.unl.has(s.id)).slice(0, 2);
    for (const s of next) { const g = new THREE.Group(); g.position.set(s.x, 0, s.z + (s.type === 'counter' ? 0 : 0)); this.sc.add(g);
      const base = new THREE.Mesh(new THREE.BoxGeometry(200, 4, 200), new THREE.MeshToonMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 })); base.position.y = 2; g.add(base);
      const fill = new THREE.Mesh(new THREE.BoxGeometry(176, 6, 176), M(0xFFD782)); fill.position.y = 3; fill.scale.z = 0.001; g.add(fill);
      const paid = S.branch[this.bi]?.paid?.[s.id] || 0; const tag = this.ui.tag(); this.pads.push({ s, g, fill, paid, tag }); this.updPad(this.pads[this.pads.length - 1]); }
  }
  updPad(p) { const u = Math.min(1, p.paid / p.s.cost); p.fill.scale.z = Math.max(0.001, u); p.fill.position.z = -88 + 88 * u; p.tag.innerHTML = `<i class="c"></i>${fmt(p.s.cost - p.paid)}<small>${p.s.label || NAMES[p.s.type] || ''}</small>`; }
  unlock(p) {
    const s = p.s; this.unl.add(s.id); const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.unl = [...this.unl]; delete br.paid[s.id];
    sfx('unlock', { vol: 0.8 }); mission('unlock');
    if (s.type === 'hire') this.hire(s.staff); else if (s.type === 'up') { S.up[s.up] = 1; if (s.up === 'carry') this.pl.cap = PLAYER.carryUp; this.ui.toast(s.up === 'carry' ? '한 번에 10개까지 들 수 있어요!' : '더 빨리 걸어요!'); this.confetti(s.x, 80, s.z); }
    else if (s.type === 'next') { save(); this.ui.nextBranch(this.bi + 1); return; }
    else this.place(s, true);
    save(); this.refreshPads(); this.ui.progress();
  }
  hire(k, silent) {
    const d = STAFF[k], P = person({ body: d.body, apron: true, cap: 0xFFFFFF, hair: 0x2A1A10 }); const c = this.st.counter;
    const pos = k === 'cashier' ? [c.Z.cash.x, c.Z.cash.z] : [c.x - 200, c.z - 200]; P.g.position.set(pos[0], 0, pos[1]); this.sc.add(P.g);
    const w = { k, P, pos: P.g.position, stack: [], kind: null, cap: d.carry || 4, state: 'idle', tick: 0 }; this.staff.push(w);
    if (!silent) { const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); if (!br.staff.includes(k)) br.staff.push(k); this.confetti(pos[0], 160, pos[1]); this.ui.toast({ cashier: '계산원이 계산을 맡아요!', baker: '제빵사가 베이글을 날라요!', cleaner: '청소 직원이 테이블을 치워요!' }[k]); }
  }
  // ── 매 프레임
  update(dt, input) {
    this.t += dt; const pl = this.pl; const mult = this.B.mult * (this.ui.boost() ? 2 : 1);
    // 이동
    const mv = new V().addScaledVector(RIGHT, input.x).addScaledVector(DOWN, input.y); const ml = Math.min(1, mv.length());
    if (ml > 0.08) { mv.normalize(); const sp = PLAYER.speed * (S.up.speed ? PLAYER.speedUp : 1) * ml; pl.pos.addScaledVector(mv, sp * dt); pl.P.g.rotation.y = Math.atan2(mv.x, mv.z); }
    this.collide(pl.pos, 34); pl.P.carry = pl.stack.length > 0; pl.P.anim(dt, ml > 0.08);
    this.interact(pl, dt);
    // 직원
    for (const w of this.staff) this.staffAI(w, dt);
    // 오븐 · 크림치즈 · 커피 생산
    const ov = this.st.oven; ov.t += dt; if (ov.t > 1.1 && ov.stack.length < 10) { ov.t = 0; this.put(ov.stack, item('bagel'), ov.x - 60 + (ov.stack.length % 5) * 30, 12 + Math.floor(ov.stack.length / 5) * 16, ov.z + 100, 'bagel'); }
    const cc = this.st.cc; if (cc) { cc.t += dt; if (cc.inStack.length && cc.t > 0.9 && cc.stack.length < 8) { cc.t = 0; const m = cc.inStack.pop(); this.sc.remove(m.m); this.put(cc.stack, item('cream'), cc.x + 40 + (cc.stack.length % 2) * 36, 107 + Math.floor(cc.stack.length / 2) * 18, cc.z + 30, 'cream'); } }
    const cf = this.st.coffee; if (cf) { cf.t += dt; if (cf.t > 1.6 && cf.stack.length < 8) { cf.t = 0; this.put(cf.stack, item('coffee'), cf.x - 30 + (cf.stack.length % 3) * 30, 164 + Math.floor(cf.stack.length / 3) * 30, cf.z + 10, 'coffee'); } }
    // 손님
    this.spawnT -= dt; const qMax = 6; const inQ = this.cust.filter(c => c.state === 'queue' || c.state === 'walkQ').length;
    if (this.spawnT <= 0 && inQ < qMax) { this.spawnT = Math.max(1.6, 5 - this.unl.size * 0.22) * rnd(0.8, 1.2); this.spawnCustomer(); }
    this.serve(dt, mult); for (const c of this.cust) this.custAI(c, dt);
    this.cust = this.cust.filter(c => { if (c.gone) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); return false; } return true; });
    // 드라이브스루
    if (this.st.drive) this.driveUpdate(dt, mult);
    // 날아가는 물건 · 연출
    for (let i = this.fly.length - 1; i >= 0; i--) { const f = this.fly[i]; f.t += dt / f.d; const u = Math.min(1, f.t); const to = typeof f.to === 'function' ? f.to() : f.to;
      f.m.position.lerpVectors(f.from, to, u); f.m.position.y += Math.sin(u * Math.PI) * 70; if (u >= 1) { this.fly.splice(i, 1); f.done && f.done(); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt / f.d; f.f(Math.min(1, f.t)); if (f.t >= 1) this.fx.splice(i, 1); }
    for (const Z of this.zones) { const on = this.in(pl, Z); Z.inner.material.color.copy(on ? Z.col : WHITE); Z.inner.material.opacity = on ? 0.85 : 0.55; }
    // 안내: 다음에 할 일 (설비 3개 열 때까지)
    const gd = this.guide(); this.arrow.visible = !!gd; if (gd) { this.arrow.position.set(gd[0], 150 + Math.sin(this.t * 6) * 14, gd[1]); this.arrow.rotation.y += dt * 2; } this.ui.hint(gd && gd[2]);
    // 카메라 · 그림자 따라감
    this.camT.lerp(pl.pos, Math.min(1, dt * 5)); this.cam.position.set(this.camT.x + 900, 1150, this.camT.z + 900); this.cam.lookAt(this.camT.x, 0, this.camT.z);
    this.sun.position.set(this.camT.x - 500, 1200, this.camT.z + 700); this.sun.target.position.copy(this.camT);
    this.ui.frame(this);
  }
  collide(p, r) {
    const B = this.B; p.x = Math.max(-B.W / 2 + 40 + r, Math.min(B.W / 2 - 20 - r, p.x)); p.z = Math.max(-B.D / 2 + 40 + r, Math.min(B.D / 2 - 20, p.z));
    for (const o of Object.values(this.st)) { const [hw, hd] = SIZE[o.type] || [0, 0]; if (!hw) continue;
      if (o.type === 'table' || o.type === 'bin' || o.type === 'plant') { const d = Math.hypot(p.x - o.x, p.z - o.z), m = hw + r; if (d < m && d > 0.1) { p.x = o.x + (p.x - o.x) / d * m; p.z = o.z + (p.z - o.z) / d * m; } continue; }
      const dx = p.x - o.x, dz = p.z - o.z, ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx) * ox; else p.z += Math.sign(dz) * oz; } }
  }
  near(w, x, z, r = R) { return Math.hypot(w.pos.x - x, w.pos.z - z) < r; }
  // 물건 쌓기 (보관 장소) · 사람 손으로 옮기기
  put(arr, m, x, y, z, kind) { m.position.set(x, y, z); this.sc.add(m); arr.push({ m, kind }); }
  take(from, w) { const it = from.pop(); if (!it) return false; w.kind = it.kind; const m = it.m, start = m.position.clone(); this.sc.remove(m); w.P.hand.add(m); m.position.set(0, w.stack.length * ITEM_H[it.kind] + 6, 0);
    w.stack.push(it); w.P.hand.updateWorldMatrix(true, true); return true; }
  give(w, arr, pos, cb) { const it = w.stack.pop(); if (!it) return null; if (!w.stack.length) w.kind = null; const m = it.m, wp = new V(); m.getWorldPosition(wp); w.P.hand.remove(m); this.sc.add(m); m.position.copy(wp);
    const target = new V(...pos); this.fly.push({ m, from: wp, to: target, t: 0, d: 0.18, done: () => cb && cb(it) }); arr.push(it); return it; }
  interact(w, dt) {
    w.tick -= dt; if (w.tick > 0) return; const step = () => { w.tick = 0.07; };
    const full = w.stack.length >= w.cap;
    // 집기: 오븐 · 크림치즈 · 커피 · 쓰레기
    const ov = this.st.oven; if (!full && (!w.kind || w.kind === 'bagel') && this.in(w, ov.Z.out) && ov.stack.length) { this.take(ov.stack, w); sfx('pick', { vol: 0.25, rate: 1 + w.stack.length * 0.05 }); return step(); }
    const cc = this.st.cc; if (cc && this.in(w, cc.Z.io)) {
      if (w.kind === 'bagel' && cc.inStack.length < 8) { const i = cc.inStack.length; this.give(w, cc.inStack, [cc.x - 70 + (i % 2) * 34, 107 + Math.floor(i / 2) * 16, cc.z + 30]); sfx('drop', { vol: 0.2 }); return step(); }
      if (!full && (!w.kind || w.kind === 'cream') && cc.stack.length) { this.take(cc.stack, w); sfx('pick', { vol: 0.25 }); return step(); } }
    const cf = this.st.coffee; if (cf && !full && (!w.kind || w.kind === 'coffee') && this.in(w, cf.Z.out) && cf.stack.length) { this.take(cf.stack, w); sfx('pick', { vol: 0.25 }); return step(); }
    // 내려놓기: 계산대 진열
    const c = this.st.counter; if (w.kind && SHELF[w.kind] != null && this.in(w, c.Z[w.kind])) { const sh = c.shelf[w.kind]; if (sh.length < 12) { const i = sh.length;
      this.give(w, sh, [c.x + SHELF[w.kind] + (i % 2) * 26 - 13, 114 + Math.floor(i / 2) * ITEM_H[w.kind], c.z + 18]); sfx('drop', { vol: 0.2, rate: 1 + i * 0.03 }); return step(); } }
    // 드라이브스루 진열
    const dv = this.st.drive; if (dv && w.kind === 'bagel' && this.in(w, dv.Z.drop) && dv.stack.length < 12) { const i = dv.stack.length; this.give(w, dv.stack, [dv.x + 50 + (i % 2) * 30, 109 + Math.floor(i / 2) * 15, dv.z - 30 + Math.floor(i / 6) * 40]); sfx('drop', { vol: 0.2 }); return step(); }
    // 쓰레기: 테이블에서 줍기 → 통에 버리기
    if (!full && (!w.kind || w.kind === 'trash')) for (const t of Object.values(this.st)) if (t.type === 'table' && t.trash.length && this.in(w, t.Z.trash)) { this.take(t.trash, w); sfx('pick', { vol: 0.2 }); return step(); }
    const bin = this.st.bin; if (w.kind === 'trash' && this.in(w, bin.Z.drop)) { const it = w.stack.pop(); w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; sfx('drop', { vol: 0.2 }); mission('clean'); return step(); }
    if (!w.isPlayer) return;
    // 돈 줍기
    for (const p of this.piles) if (p.v > 0 && this.near(w, p.x, p.z + 20, 110)) { const v = Math.round(p.v); S.coins += v; S.earned += v; mission('coins', v); p.v = 0; const ms = p.meshes; p.meshes = [];
      ms.forEach((m, i) => { const from = m.position.clone(); setTimeout(() => this.fly.push({ m, from, to: () => w.pos.clone().setY(120), t: 0, d: 0.25, done: () => this.sc.remove(m) }), i * 18); });
      sfx('coin', { vol: 0.5 }); this.ui.float('+' + fmt(v), w.pos, 'cash'); save(); return step(); }
    // 열기 칸에 돈 붓기
    for (const p of this.pads) if (Math.abs(w.pos.x - p.s.x) < 100 && Math.abs(w.pos.z - p.s.z) < 100 && S.coins > 0) { const need = p.s.cost - p.paid, pay = Math.min(need, S.coins, Math.max(1, Math.ceil(p.s.cost / 30))); S.coins -= pay; p.paid += pay;
      const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.paid[p.s.id] = p.paid; this.updPad(p); sfx('coin', { vol: 0.15, rate: 1.4 });
      const m = cyl(10, 10, 4, 0xF2B533, 0, 0, 0, this.sc, 10); m.position.copy(w.pos).setY(120); this.fly.push({ m, from: m.position.clone(), to: new V(p.s.x, 10, p.s.z), t: 0, d: 0.2, done: () => this.sc.remove(m) });
      if (p.paid >= p.s.cost) { this.unlock(p); } w.tick = 0.03; return; }
  }
  // ── 계산: 계산원(또는 주인공)이 계산대 뒤에 있으면 맨 앞 손님 주문을 진열대에서 채워 줌
  serve(dt, mult) {
    const c = this.st.counter; c.t -= dt; if (c.t > 0) return; const behind = this.in(this.pl, c.Z.cash);
    const cashier = this.staff.find(w => w.k === 'cashier') || (behind ? this.pl : null);
    const f = this.cust.find(x => x.state === 'queue' && x.qi === 0); if (!f || !cashier) return;
    const need = f.order.find(o => o.got < o.n); if (!need) return;
    const sh = c.shelf[need.k]; if (!sh.length) return;
    c.t = cashier.isPlayer ? 0.32 : STAFF.cashier.serve; const it = sh.pop(); const wp = it.m.position.clone();
    this.fly.push({ m: it.m, from: wp, to: () => f.pos.clone().setY(100), t: 0, d: 0.2, done: () => { this.sc.remove(it.m); } }); need.got++; sfx('blip', { vol: 0.3, rate: 1.2 });
    if (f.order.every(o => o.got >= o.n)) { const v = Math.round(f.order.reduce((a, o) => a + MENU[o.k].price * o.n, 0) * mult); this.addCash(c.cash, v); this.ui.float('+' + fmt(v), new V(c.x + 110, 120, c.z), 'pay'); sfx('order', { vol: 0.4 });
      addSold(f.order.reduce((a, o) => a + o.n, 0)); mission('serve'); this.ui.progress(); this.checkout(f); }
  }
  checkout(f) {
    f.tag && (f.tag.remove(), f.tag = null); for (const o of f.order) for (let i = 0; i < o.n && i < 3; i++) { const m = item(o.k); m.scale.setScalar(0.8); f.P.hand.add(m); m.position.y = i * 14; } f.P.carry = true;
    const seat = Math.random() < 0.6 && this.freeSeat(); this.cust.forEach(x => { if (x.state === 'queue' && x.qi > 0) x.qi--; });
    if (seat) { seat.s.who = f; f.seat = seat; f.state = 'toSeat'; f.target = new V(seat.s.x, 0, seat.s.z); } else { f.state = 'leave'; f.target = new V(...this.B.door); } this.reQ();
  }
  freeSeat() { for (const t of Object.values(this.st)) if (t.type === 'table' && !t.trash.length) for (const s of t.seats) if (!s.who) return { t, s }; return null; }
  spawnCustomer() {
    const P = person({ body: CUST_COLORS[Math.floor(Math.random() * CUST_COLORS.length)], hair: [0x3A2A1A, 0x8A5A2A, 0x1A1A1A, 0x6A3A1A, 0xC08A4A][Math.floor(Math.random() * 5)], pants: [0x4A5A7A, 0x6A4A3A, 0x3A3A4A][Math.floor(Math.random() * 3)], bubble: true });
    const [dx, dz] = this.B.door; P.g.position.set(dx + rnd(-60, 60), 0, dz); this.sc.add(P.g);
    const ks = ['bagel', 'bagel']; if (this.st.cc) ks.push('cream'); if (this.st.coffee) ks.push('coffee'); const n = 1 + Math.floor(Math.random() * Math.min(3, 1 + this.unl.size / 4)); const order = [{ k: ks[Math.floor(Math.random() * ks.length)], n, got: 0 }];   /* 한 손님 = 한 가지 메뉴 */
    const c = { P, pos: P.g.position, state: 'walkQ', order, qi: this.cust.filter(x => x.state === 'queue' || x.state === 'walkQ').length, bubble: true };
    P.bubble.visible = false; c.tag = this.ui.bubble(); this.cust.push(c); this.reQ();
  }
  reQ() { const [q, gap] = this.B.queue, c = this.st.counter; let i = 0; for (const x of this.cust) if (x.state === 'queue' || x.state === 'walkQ') { x.qi = i++; x.target = new V(c.x + 110, 0, c.z + 170 + x.qi * gap); } }
  custAI(c, dt) {
    const moveTo = (sp = 230) => { const d = new V().subVectors(c.target, c.pos); d.y = 0; const l = d.length(); if (l < 6) return true; d.normalize();
      /* 테이블 피하기: 가는 길에 테이블이 있으면 옆으로 돌아감 (앉을 테이블은 제외) */ const own = (c.seat && c.seat.t) || (c.state === 'leave' && c.leftT && Math.hypot(c.pos.x - c.leftT.x, c.pos.z - c.leftT.z) < 130 ? c.leftT : null);
      for (const t of Object.values(this.st)) { if (t.type !== 'table' || t === own) continue; const tx = t.x - c.pos.x, tz = t.z - c.pos.z, dist = Math.hypot(tx, tz); if (dist > 260) continue;
        const ahead = tx * d.x + tz * d.z; if (ahead <= 0) continue; const side = tx * d.z - tz * d.x; if (Math.abs(side) < 150) { const k = (150 - Math.abs(side)) / 150 * 1.4, sg = side > 0 ? -1 : 1, px = d.z, pz = -d.x; d.x += px * sg * k; d.z += pz * sg * k; d.normalize(); } }   /* 테이블 반대쪽으로 비켜감 */
      c.pos.addScaledVector(d, Math.min(l, sp * dt));
      for (const t of Object.values(this.st)) { if (t.type !== 'table' || t === own) continue; const dx = c.pos.x - t.x, dz = c.pos.z - t.z, dd = Math.hypot(dx, dz); if (dd < 125 && dd > 0.1) { c.pos.x = t.x + dx / dd * 125; c.pos.z = t.z + dz / dd * 125; } }
      c.P.g.rotation.y = Math.atan2(d.x, d.z); c.P.anim(dt, true); return false; };
    if (c.state === 'walkQ') { if (moveTo()) c.state = 'queue'; }
    else if (c.state === 'queue') { if (!moveTo(180)) {} else { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; } }
    else if (c.state === 'toSeat') { if (moveTo()) { c.state = 'eat'; c.t = rnd(5, 8); c.P.g.rotation.y = c.seat.s.x < c.seat.t.x ? Math.PI / 2 : -Math.PI / 2; c.P.carry = false; while (c.P.hand.children.length) c.P.hand.remove(c.P.hand.children[0]); c.pos.y = 12; } }
    else if (c.state === 'eat') { c.P.anim(dt, false); c.t -= dt; if (c.t <= 0) { const t = c.seat.t; for (let i = 0; i < c.order.reduce((a, o) => a + o.n, 0) && t.trash.length < 6; i++) this.put(t.trash, item('trash'), t.x + rnd(-30, 30), 88 + t.trash.length * 6, t.z + rnd(-25, 25), 'trash');
      c.seat.s.who = null; c.leftT = c.seat.t; c.seat = null; c.pos.y = 0; c.state = 'leave'; c.target = new V(...this.B.door); } }
    else if (c.state === 'leave') { if (moveTo(260)) c.gone = true; }
  }
  // ── 직원 AI
  staffAI(w, dt) {
    const mv = (x, z, sp) => { const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 12) { w.P.anim(dt, false); return true; } d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false; };
    w.P.carry = w.stack.length > 0;
    if (w.k === 'cashier') { const c = this.st.counter; mv(c.Z.cash.x, c.Z.cash.z, 200); w.P.g.rotation.y = 0; return; }
    if (w.k === 'baker') { const c = this.st.counter, cc = this.st.cc, cf = this.st.coffee, dv = this.st.drive, sp = STAFF.baker.speed * (S.up.speed ? 1.2 : 1);
      if (!w.stack.length) { if (!w.src) { const pick = []; if (cc && cc.stack.length >= 1 && c.shelf.cream.length < 8) pick.push('cc'); if (cf && cf.stack.length >= 1 && c.shelf.coffee.length < 6) pick.push('cf'); pick.push('ov'); w.src = pick[0]; }
        const zc = Z => [Z.x, Z.z]; const s = w.src === 'cc' ? zc(cc.Z.io) : w.src === 'cf' ? zc(cf.Z.out) : zc(this.st.oven.Z.out); if (mv(s[0], s[1], sp)) { this.interact(w, dt); if (w.stack.length >= w.cap || (w.stack.length && this.srcEmpty(w.src))) w.src = null; } }
      else { w.src = null; let dst; if (w.kind === 'bagel') { dst = cc && cc.inStack.length < 6 && c.shelf.cream.length + cc.stack.length < 6 && c.shelf.bagel.length >= 3 ? [cc.Z.io.x, cc.Z.io.z] : dv && dv.stack.length < 6 && c.shelf.bagel.length > 6 ? [dv.Z.drop.x, dv.Z.drop.z] : [c.Z.bagel.x, c.Z.bagel.z]; } else dst = [c.Z[w.kind].x, c.Z[w.kind].z];
        if (mv(dst[0], dst[1], sp)) { const n = w.stack.length; this.interact(w, dt); if (w.stack.length === n && w.tick <= 0) { w.idle = (w.idle || 0) + dt; if (w.idle > 2) { w.stack.forEach(it => w.P.hand.remove(it.m)); w.stack = []; w.kind = null; w.idle = 0; } } } }
      this.collide(w.pos, 30); return; }
    if (w.k === 'cleaner') { const sp = STAFF.cleaner.speed; if (w.kind === 'trash' && (w.stack.length >= w.cap || !Object.values(this.st).some(t => t.type === 'table' && t.trash.length))) { const b = this.st.bin; if (mv(b.Z.drop.x, b.Z.drop.z, sp)) this.interact(w, dt); }
      else { const t = Object.values(this.st).find(t => t.type === 'table' && t.trash.length); if (t) { if (mv(t.Z.trash.x, t.Z.trash.z, sp)) this.interact(w, dt); } else mv(-300, 100, sp * 0.5); } this.collide(w.pos, 30); }
  }
  guide() {
    const pl = this.pl, c = this.st.counter, ov = this.st.oven, pile = this.piles.find(p => p.v > 0), pad = this.pads[0];
    /* 맨 앞 손님이 없는 메뉴를 기다리면 그 메뉴 만드는 곳을 가리킴 */ const f = this.cust.find(x => x.state === 'queue' && x.qi === 0), need = f && f.order.find(o => o.got < o.n);
    if (need && !c.shelf[need.k].length) { this.blockT = (this.blockT || 0) + 1 / 60; if (this.blockT > 2.5) { const nm = MENU[need.k].name;
      if (pl.kind === need.k) return [c.Z[need.k].x, c.Z[need.k].z, `${nm}을(를) 같은 색 칸에 내려놔요`];
      if (need.k === 'cream') return pl.kind === 'bagel' ? [this.st.cc.Z.io.x, this.st.cc.Z.io.z, '크림치즈 바에 베이글을 넣어요'] : this.st.cc.stack.length ? [this.st.cc.Z.io.x, this.st.cc.Z.io.z, '크림치즈 베이글을 집어요'] : [ov.Z.out.x, ov.Z.out.z, '손님이 크림치즈 베이글을 기다려요 · 먼저 베이글을 집어요'];
      if (need.k === 'coffee') return [this.st.coffee.Z.out.x, this.st.coffee.Z.out.z, '손님이 커피를 기다려요 · 커피를 집어요'];
      return [ov.Z.out.x, ov.Z.out.z, '손님이 베이글을 기다려요 · 오븐에서 집어요']; } } else this.blockT = 0;
    if (this.unl.size > 9) return null;
    if (pad && S.coins >= pad.s.cost - pad.paid) return [pad.s.x, pad.s.z, '돈을 들고 바닥 칸에 서 있으면 열려요'];
    if (pile && pile.v >= 10 && !pl.stack.length) return [pile.x, pile.z, '돈을 주워요'];
    if (pl.kind === 'bagel') return [c.Z.bagel.x, c.Z.bagel.z, '계산대 뒤 베이글 칸에 서면 내려놔요'];
    if (pl.kind && SHELF[pl.kind] != null) return [c.Z[pl.kind].x, c.Z[pl.kind].z, '같은 색 칸에 서면 내려놔요'];
    if (c.shelf.bagel.length >= 2 && this.cust.some(x => x.state === 'queue') && !this.staff.some(w => w.k === 'cashier')) return [c.Z.cash.x, c.Z.cash.z, '초록 칸에 서 있으면 손님을 받아요'];
    return [ov.Z.out.x, ov.Z.out.z, '오븐 앞 칸에 서면 베이글을 집어요'];
  }
  srcEmpty(s) { return s === 'cc' ? !this.st.cc.stack.length : s === 'cf' ? !this.st.coffee.stack.length : !this.st.oven.stack.length; }
  // ── 드라이브스루: 차가 와서 베이글 여러 개를 사 감 (창구 진열대에서 자동)
  driveUpdate(dt, mult) {
    const dv = this.st.drive; this.carT -= dt; if (this.carT <= 0 && this.cars.length < 3) { this.carT = rnd(8, 12); const g = car([0xE86A6A, 0x6A9AE8, 0xF2C14E, 0x9ACF6A][Math.floor(Math.random() * 4)]); g.position.set(dv.x + 330, 0, dv.z + 1200); g.rotation.y = Math.PI / 2; this.sc.add(g); this.cars.push({ g, want: 2 + Math.floor(Math.random() * 4), got: 0, state: 'in' }); }
    this.cars.forEach((cr, i) => { const tz = dv.z + i * 260; if (cr.state === 'in') { cr.g.position.z = Math.max(tz, cr.g.position.z - 300 * dt); if (i === 0 && Math.abs(cr.g.position.z - tz) < 2) cr.state = 'wait'; }
      else if (cr.state === 'wait') { dv.t -= dt; if (dv.t <= 0 && dv.stack.length && cr.got < cr.want) { dv.t = 0.45; const it = dv.stack.pop(); this.fly.push({ m: it.m, from: it.m.position.clone(), to: cr.g.position.clone().setY(90), t: 0, d: 0.25, done: () => this.sc.remove(it.m) }); cr.got++; sfx('blip', { vol: 0.25 }); }
        if (cr.got >= cr.want) { const v = Math.round(cr.want * MENU.bagel.price * 1.5 * mult); this.addCash(dv.cash, v); this.ui.float('+' + fmt(v), new V(dv.x, 140, dv.z), 'pay'); addSold(cr.want); sfx('order', { vol: 0.4 }); cr.state = 'out'; } }
      else { cr.g.position.z -= 320 * dt; } });
    this.cars = this.cars.filter(cr => { if (cr.g.position.z < dv.z - 1600) { this.sc.remove(cr.g); return false; } return true; });
  }
  confetti(x, y, z) { for (let i = 0; i < 26; i++) { const m = box(12, 12, 4, [0xF28C38, 0xFFD24A, 0x6FCB7A, 0x6A9AE8, 0xE86A8A][i % 5], x, y, z, this.sc); const v = new V(rnd(-1, 1), rnd(1.2, 2.2), rnd(-1, 1)).multiplyScalar(260), r0 = new V(rnd(0, 6), rnd(0, 6), 0);
    this.fx.push({ t: 0, d: 1.1, f: u => { m.position.set(x + v.x * u, y + v.y * u - 400 * u * u, z + v.z * u); m.rotation.set(r0.x + u * 8, r0.y + u * 6, 0); if (u >= 1) this.sc.remove(m); } }); } }
  // 화면 위 표시용 위치
  padList() { return this.pads; }
}
/* 동작 칸: [이름, 설비 기준 x, z, 가로, 세로, 색] */
const ZONES = {
  oven: [['out', 0, 135, 180, 100, 0xF2A23A]], ccbar: [['io', 0, 140, 180, 100, 0xF6D6A0]], coffee: [['out', 0, 130, 140, 100, 0x9A643A]],
  counter: [['bagel', -115, -118, 70, 96, 0xD98A3A], ['cream', -40, -118, 70, 96, 0xF2D2A0], ['coffee', 35, -118, 70, 96, 0x9A643A], ['cash', 140, -118, 120, 96, 0x4FBF6A]],
  bin: [['drop', 0, 95, 120, 80, 0x5A8A5A]], table: [['trash', 0, 178, 170, 70, 0xB8B0A8]], drive: [['drop', -105, 0, 90, 200, 0xD98A3A]],
};
const WHITE = new THREE.Color(0xFFFFFF);
const SIZE = { oven: [105, 80], counter: [168, 62], ccbar: [118, 62], coffee: [72, 58], table: [125], bin: [40], plant: [40], drive: [20, 135] };
const NAMES = { table: '테이블', ccbar: '크림치즈 바', coffee: '커피 머신', drive: '드라이브스루' };
export const fmt = n => Math.round(n).toLocaleString('en-US');
