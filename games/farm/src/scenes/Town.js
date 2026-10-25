// 마을 화면 (쿼터뷰): 땅 · 밭 · 건물 · 기차역 · 강아지 · 끌어서 이동 · 두 손가락/휠 확대 · 누르기 · 건물 놓기
import { W, H } from '../config.js?v=0.44.4';
import { T, C } from '../ui.js?v=0.44.4';
import { audio } from '../audio.js?v=0.44.4';
import { BUILDS, CROPS, MAP, ZONE, RECIPES } from '../data.js?v=0.44.4';
import { load, save, open, objAt, freeRect, cropReady, tickFactory, tickAnimal, digSpot, productOf, train, zooCoins, pop } from '../state.js?v=0.44.4';

export const TW = 180, TH = 90, OX = MAP * TW / 2 + 260, OY = 260;
export const iso = (gx, gy) => [OX + (gx - gy) * TW / 2, OY + (gx + gy) * TH / 2];
export const grid = (x, y) => { const a = (x - OX) / (TW / 2), b = (y - OY) / (TH / 2); return [Math.floor((a + b) / 2), Math.floor((b - a) / 2)]; };
const WORLD_W = MAP * TW + 1000, WORLD_H = MAP * TH + 620;
// 땅·건물 그림은 아래 꼭짓점에 맞춤 (그림 밑의 두께만큼 올림)
function place(img, gx, gy, sz, k = 0.1) { const [x, y] = iso(gx + sz, gy + sz); img.setOrigin(0.5, 1 - k * img.width / img.height); img.setScale(sz * TW * 1.04 / img.width); img.setPosition(x, y); return img; }

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }
  create() {
    this.d = load(); this.mode = null; this.sel = null; this.dead = false; this.events.once('shutdown', () => { this.dead = true; });
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W * 3, WORLD_H * 3, 0x7CC26A);
    this.ground = this.add.container(0, 0); this.layer = this.add.container(0, 0); this.fx = null; this.walkers = [];   // 주민은 건물과 같은 층(layer)에서 앞뒤로 가려짐 · 건물을 다시 그려도 살아 있음
    this.drawGround(); this.drawObjs(); this.drawStation();
    const cam = this.cameras.main; cam.setBounds(0, 0, WORLD_W, WORLD_H); cam.setZoom(1.05); const [cx, cy] = iso(MAP / 2, MAP / 2); cam.centerOn(cx, cy);
    this.input.addPointer(1);
    this.input.on('pointerdown', p => this.down(p)); this.input.on('pointermove', p => this.move(p)); this.input.on('pointerup', p => this.up(p));
    this.input.on('wheel', (p, o, dx, dy) => this.zoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.scene.launch('Hud'); this.hud = this.scene.get('Hud'); window.__town = this;
    this.fx = this.add.container(0, 0); this.time.addEvent({ delay: 1800, loop: true, callback: () => this.walk() }); this.time.addEvent({ delay: 700, loop: true, callback: () => this.puffs() }); this.time.delayedCall(300, () => { this.walk(); this.walk(); });
    // 밤낮: 실제 시각에 따라 마을 색 (저녁 노을 · 밤 푸른빛)
    this.sky = this.add.rectangle(W / 2, H / 2, W * 4, H * 4, 0x000000, 0).setScrollFactor(0).setDepth(900); const tint = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; let c = 0x000000, a = 0; if (h >= 17 && h < 19.5) { c = 0xFF8A3C; a = 0.12 * (h - 17) / 2.5; } else if (h >= 19.5 || h < 5) { c = 0x1A2A6C; a = 0.28; } else if (h < 7) { c = 0xFFB070; a = 0.12 * (7 - h) / 2; } this.sky.setFillStyle(c, a); }; tint(); this.time.addEvent({ delay: 60000, loop: true, callback: tint });
    audio.music('bgm_farm');
  }
  // ── 마을 주민: 칸을 따라 길을 찾아 걸음 (돌길 우선 · 건물·밭은 돌아감) · 4방향 걷기 그림 2장 · 그림자 · 건물 앞뒤 가림 · 가게 앞에서 쉬었다 감
  walkGrid() { const g = new Uint8Array(MAP * MAP); for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) g[y * MAP + x] = open(x, y) ? 1 : 0;
    for (const o of this.d.objs) { const sz = BUILDS[o.b].sz; for (let i = 0; i < sz; i++) for (let j = 0; j < sz; j++) { const k = (o.y + j) * MAP + o.x + i; if (k >= 0 && k < g.length) g[k] = o.b === 'path' || o.b === 'road' ? 2 : 0; } } return g; }   // 0 막힘 · 1 풀밭 · 2 돌길
  findPath(g, a, b) { const N = MAP * MAP, dist = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), si = a[1] * MAP + a[0], ti = b[1] * MAP + b[0], hp = [[0, si]]; dist[si] = 0;   // 힙 다익스트라
    const push = e => { hp.push(e); let k = hp.length - 1; while (k) { const q = (k - 1) >> 1; if (hp[q][0] <= hp[k][0]) break; [hp[q], hp[k]] = [hp[k], hp[q]]; k = q; } };
    const pop = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === k) break; [hp[m], hp[k]] = [hp[k], hp[m]]; k = m; } } return top; };
    while (hp.length) { const [du, u] = pop(); if (du > dist[u]) continue; if (u === ti) break; const ux = u % MAP, uy = (u / MAP) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = ux + dx, ny = uy + dy; if (nx < 0 || ny < 0 || nx >= MAP || ny >= MAP) continue; const v = ny * MAP + nx; if (!g[v]) continue; const w = du + (g[v] === 2 ? 1 : 2.4); if (w < dist[v]) { dist[v] = w; prev[v] = u; push([w, v]); } } }
    if (dist[ti] >= 1e9) return null; const out = []; for (let k = ti; k !== -1; k = prev[k]) out.push([k % MAP, (k / MAP) | 0]); return out.reverse(); }
  // 갈 곳: 건물 앞(화면 아래쪽 두 면) · 장식 옆 · 없으면 아무 풀밭
  spots(g, kinds) { const out = []; for (const o of this.d.objs) { const B = BUILDS[o.b]; if (o.b === 'field' || o.b === 'path' || (kinds && !kinds.includes(B.k))) continue; const sz = B.sz;
      for (let i = 0; i < sz; i++) for (const [x, y] of [[o.x + sz, o.y + i], [o.x + i, o.y + sz]]) if (x < MAP && y < MAP && g[y * MAP + x]) out.push([x, y]); }
    if (!out.length) for (let k = 0; k < 60; k++) { const x = Math.floor(Math.random() * MAP), y = Math.floor(Math.random() * MAP); if (g[y * MAP + x]) { out.push([x, y]); break; } } return out; }
  // ── 차: 도로 칸만 따라 달림 (도로 6칸 이상 · 8칸마다 1대 · 최대 4대)
  drive() {
    if (this.dead) return; this.cars = (this.cars || []).filter(c => c.active); const roads = this.d.objs.filter(o => o.b === 'road'); if (this.cars.length >= Math.min(4, Math.floor(roads.length / 8)) || roads.length < 6) return;
    const g = new Uint8Array(MAP * MAP); for (const o of roads) g[o.y * MAP + o.x] = 2; const a = roads[Math.floor(Math.random() * roads.length)], b = roads[Math.floor(Math.random() * roads.length)], path = this.findPath(g, [a.x, a.y], [b.x, b.y]); if (!path || path.length < 4) return;
    const v = 1 + Math.floor(Math.random() * 4), c = this.add.container(0, 0), sh = this.add.ellipse(0, 4, 120, 40, 0x1A2210, 0.3), sp = this.add.image(0, 0, `car${v}_f`).setOrigin(0.5, 0.82); sp.setScale(TW * 0.62 / sp.width); c.add([sh, sp]); c.sp = sp; c.v = v; c.path = path; c.i = 0; c.p = 0; c.gx = a.x; c.gy = a.y; c.ph = Math.random() * 6;
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 400 }); this.layer.add(c); this.cars.push(c); this.placeWalker(c); }
  driveTick(time, dt) { for (const c of this.cars || []) { if (!c.active || c.leaving) continue; c.p += dt / 420; while (c.p >= 1) { c.p -= 1; c.i++; if (c.i >= c.path.length - 1) break; const n = c.path[c.i + 1], o = objAt(n[0], n[1]); if (!o || o.b !== 'road') { c.i = c.path.length; break; } }
      if (c.i >= c.path.length - 1) { this.leave(c); continue; } const a = c.path[c.i], b = c.path[c.i + 1], dx = b[0] - a[0], dy = b[1] - a[1]; c.gx = a[0] + dx * c.p; c.gy = a[1] + dy * c.p; this.placeWalker(c);
      const f = dx > 0 ? ['f', true] : dy > 0 ? ['f', false] : dx < 0 ? ['b', true] : ['b', false]; c.sp.setTexture(`car${c.v}_${f[0]}`).setFlipX(f[1]); c.sp.y = Math.sin(time / 70 + c.ph) * 1.2; } }
  walk() {
    this.drive();
    if (this.dead) return; this.walkers = this.walkers.filter(w => w.active); const want = Math.min(8, 1 + Math.floor(pop() / 18)); if (this.walkers.length >= want) return;
    const g = this.walkGrid(), homes = this.spots(g, ['house']), st = (homes.length ? homes : this.spots(g))[Math.floor(Math.random() * Math.max(1, homes.length || 1))]; if (!st) return;
    const v = 1 + Math.floor(Math.random() * 5), c = this.add.container(0, 0), sh = this.add.ellipse(0, 0, 64, 24, 0x2A3A10, 0.28), sp = this.add.image(0, 0, `w${v}_f1`).setOrigin(0.5, 0.97);
    sp.setScale(TH * 1.4 / sp.height); c.add([sh, sp]); c.sp = sp; c.sh = sh; c.v = v; c.gx = st[0]; c.gy = st[1]; c.legs = 2 + Math.floor(Math.random() * 3); c.wait = 400 + Math.random() * 800; c.path = null; c.face = ['f', false]; c.ph = Math.random() * 10;
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 500 }); this.layer.add(c); this.walkers.push(c); this.placeWalker(c);
  }
  plan(c) { const g = this.walkGrid(), from = [Math.round(c.gx), Math.round(c.gy)]; if (!g[from[1] * MAP + from[0]]) { this.leave(c); return; }
    const home = c.legs <= 0, list = this.spots(g, home ? ['house'] : ['factory', 'animal', 'public', 'deco', 'event', 'zoo', 'exhibit', 'wedding', 'harbor', 'airport', 'mine']).filter(([x, y]) => Math.abs(x - from[0]) + Math.abs(y - from[1]) > 2);
    const to = list[Math.floor(Math.random() * list.length)], path = to && this.findPath(g, from, to); if (!path || path.length < 2) { if (home) return this.leave(c); c.legs--; c.wait = 1500; return; }
    c.path = path; c.i = 0; c.p = 0; }
  leave(c) { if (c.leaving) return; c.leaving = true; this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() }); }
  placeWalker(c) { const [x, y] = iso(c.gx + 0.5, c.gy + 0.5); c.setPosition(x, y); c.dk = c.gx + c.gy + 1.001; }
  emote(c) { const e = ['💬', '❤️', '🎵', '😊', '☕', '🌼', '👋'][Math.floor(Math.random() * 7)], b = this.add.container(0, -c.sp.displayHeight - 16), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.95).fillRoundedRect(-30, -28, 60, 52, 20).fillTriangle(-8, 22, 8, 22, 0, 34); b.add([g, T(this, 0, -2, e, 30, '#000', { w: 900 })]); b.setScale(0); c.add(b);
    this.tweens.add({ targets: b, scale: 1, duration: 220, ease: 'Back.easeOut' }); this.tweens.add({ targets: b, alpha: 0, delay: 1500, duration: 300, onComplete: () => b.destroy() }); }
  update(time, dt) {
    if (this.dead) return; dt = Math.min(dt, 80); this.driveTick(time, dt); if (!this.walkers.length) { if (this.cars && this.cars.length) this.layer.sort('dk'); return; } const T1 = 720;   // 한 칸 걷는 시간(ms)
    for (const c of this.walkers) { if (!c.active || c.leaving) continue; const sp = c.sp;
      if (c.wait > 0) { c.wait -= dt; sp.y = 0; sp.setTexture(`w${c.v}_${c.face[0]}1`).setFlipX(c.face[1]); sp.scaleY = sp.scaleX * (1 + Math.sin(time / 380 + c.ph) * 0.012);
        if (c.wait <= 0) this.plan(c); continue; }
      if (!c.path) { this.plan(c); continue; }
      c.p += dt / T1; while (c.p >= 1) { c.p -= 1; c.i++; if (c.i >= c.path.length - 1) break;
        const nx = c.path[c.i + 1]; if (!open(nx[0], nx[1]) || (objAt(nx[0], nx[1]) && !['path', 'road'].includes(objAt(nx[0], nx[1]).b))) { c.path = null; break; } }   // 길이 막히면 다시 찾음
      if (!c.path) { c.gx = Math.round(c.gx); c.gy = Math.round(c.gy); continue; }
      if (c.i >= c.path.length - 1) { const e = c.path[c.path.length - 1]; c.gx = e[0]; c.gy = e[1]; c.path = null; c.legs--; c.wait = c.legs < 0 ? 300 : 1400 + Math.random() * 2600; if (c.legs < 0) { this.leave(c); continue; } if (Math.random() < 0.4) this.emote(c); this.placeWalker(c); continue; }
      const a = c.path[c.i], b = c.path[c.i + 1], dx = b[0] - a[0], dy = b[1] - a[1]; c.gx = a[0] + dx * c.p; c.gy = a[1] + dy * c.p; this.placeWalker(c);
      // 방향: +x 오른쪽 아래(앞·뒤집음) · +y 왼쪽 아래(앞) · -x 왼쪽 위(뒤·뒤집음) · -y 오른쪽 위(뒤)
      c.face = dx > 0 ? ['f', true] : dy > 0 ? ['f', false] : dx < 0 ? ['b', true] : ['b', false];
      const st = Math.floor(time / 180 + c.ph) % 2; sp.setTexture(`w${c.v}_${c.face[0]}${st + 1}`).setFlipX(c.face[1]); sp.scaleY = sp.scaleX; sp.y = -Math.abs(Math.sin((time / 180 + c.ph) * Math.PI)) * 5; c.sh.scaleX = 1 - Math.abs(sp.y) / 40; }
    this.layer.sort('dk');
  }
  // 일하는 공장 굴뚝 연기
  puffs() { if (this.dead || !this.spr) return; for (const o of this.d.objs) { const c = this.spr[o.id]; if (!c || !c.busy || !c.im || Math.random() < 0.45) continue; const B = BUILDS[o.b], [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), top = y - c.im.displayHeight * 0.78;
      const pf = this.add.circle(x - 30 + Math.random() * 40, top, 14 + Math.random() * 8, 0xFFFFFF, 0.75); this.fx.add(pf); this.tweens.add({ targets: pf, y: top - 90, x: pf.x + 20 + Math.random() * 30, scale: 2.2, alpha: 0, duration: 1800, ease: 'Sine.easeOut', onComplete: () => pf.destroy() }); } }
  zoom(z) { this.cameras.main.setZoom(Phaser.Math.Clamp(z, 0.5, 1.6)); }
  // ── 땅: 열린 구역은 풀 · 닫힌 구역은 숲
  drawGround() {
    this.ground.removeAll(true);
    for (let s = 0; s < MAP * 2 - 1; s++) for (let gx = 0; gx < MAP; gx++) { const gy = s - gx; if (gy < 0 || gy >= MAP) continue;
      const im = this.add.image(0, 0, open(gx, gy) ? 'grass' : 'forest'); place(im, gx, gy, 1, open(gx, gy) ? 0.1 : 0.12); this.ground.add(im); }
    // 닫힌 구역 위 '넓히기' 팻말 (이웃한 구역만)
    const n = MAP / ZONE; for (let z = 0; z < n * n; z++) { if (this.d.zones.includes(z)) continue; const zx = z % n, zy = Math.floor(z / n); if (!this.d.zones.some(o => Math.abs(o % n - zx) + Math.abs(Math.floor(o / n) - zy) === 1)) continue;
      const [x, y] = iso(zx * ZONE + ZONE / 2, zy * ZONE + ZONE / 2), g = this.add.graphics(); g.fillStyle(0x3E2A14, 0.85).fillRoundedRect(x - 70, y - 64, 140, 56, 28); this.ground.add(g); this.ground.add(T(this, x, y - 36, '🔨 넓히기', 26, '#FFFFFF', { w: 900 })); }
  }
  // ── 건물 · 밭
  drawObjs() {
    this.cars = (this.cars || []).filter(c => c.active); for (const w of [...this.walkers, ...this.cars]) this.layer.remove(w); this.layer.removeAll(true); this.spr = {};
    const list = [...this.d.objs].sort((a, b) => (a.x + a.y + BUILDS[a.b].sz) - (b.x + b.y + BUILDS[b.b].sz));
    for (const o of list) this.spr[o.id] = this.drawObj(o);
    const sp = digSpot(); if (sp) { const im = this.add.image(0, 0, 'digspot'); place(im, sp[0], sp[1], 1, 0.12); im.setScale(im.scale * 0.85); this.layer.add(im); this.tweens.add({ targets: im, scale: im.scale * 1.12, duration: 600, yoyo: true, repeat: -1 }); this.digIm = im; im.dk = -1; }
    if (this.mode && this.ghost) this.layer.add(this.ghost);
    this.walkers = this.walkers.filter(w => w.active); for (const w of [...this.walkers, ...this.cars]) this.layer.add(w); this.layer.sort('dk');
  }
  drawObj(o) {
    const B = BUILDS[o.b], c = this.add.container(0, 0); c.o = o;
    if (o.b === 'field') { const ripe = cropReady(o); this.drawSoil(o);   // 밭 바닥은 땅 높이에 평평하게 · 작물만 그 위에
      if (o.crop) { const im = this.add.image(0, 0, ripe ? `crop_${o.crop}` : 'crop_sprouts'), [bx, by] = iso(o.x + 1, o.y + 1); im.setOrigin(0.5, 1).setScale(TW * (ripe ? 0.94 : 0.8) / im.width).setPosition(bx, by - TH * (ripe ? 0.04 : 0.1)); c.add(im); c.im = im; }
      if (o.crop && !ripe) { const [x, y] = iso(o.x + 0.5, o.y + 0.5), t = Math.max(0, (o.at - Date.now()) / 1000), k = 1 - t / CROPS[o.crop].t, g = this.add.graphics(); g.fillStyle(0x000000, 0.4).fillRoundedRect(x - 40, y - 20, 80, 14, 7).fillStyle(0x8BE36A, 1).fillRoundedRect(x - 40, y - 20, Math.max(8, 80 * k), 14, 7); c.add(g); c.bar = g; } }
    else if (o.b === 'road') this.drawRoad(c, o);
    else if (o.site) { const im = this.add.image(0, 0, 'site'); place(im, o.x, o.y, B.sz, 0.08); im.setFlipX(!!o.flip); c.add(im); c.im = im; const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), bb = this.add.container(x, y - im.displayHeight * 0.62 - 30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillCircle(0, 0, 46).lineStyle(5, 0xE89A2E, 1).strokeCircle(0, 0, 46).fillTriangle(-14, 38, 14, 38, 0, 62); const pi = this.add.image(0, 0, 'brick'); pi.setScale(60 / Math.max(pi.width, pi.height)); bb.add([g, pi]); c.add(bb); this.tweens.add({ targets: bb, y: bb.y - 14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    else { const im = this.add.image(0, 0, o.b === 'mine' ? 'mine_b' : o.b); place(im, o.x, o.y, B.sz, 0.08); im.setFlipX(!!o.flip); c.add(im); c.im = im;
      // 다 된 물건 말풍선
      let ready = null; if (B.k === 'factory') { tickFactory(o); if (o.done.length) ready = o.done[0]; } if (B.k === 'animal') { tickAnimal(o); if (o.ready) ready = productOf(o.b); } if (B.k === 'exhibit' && zooCoins(o) >= 20) ready = 'coin';
      const busy = B.k === 'factory' && o.q && o.q.length || B.k === 'animal' && o.s && o.s.some(Boolean);
      const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), top = y - im.displayHeight * 0.62;
      if (ready) { const bb = this.add.container(x, top - 30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillCircle(0, 0, 46).lineStyle(5, 0x5AAE3C, 1).strokeCircle(0, 0, 46).fillTriangle(-14, 38, 14, 38, 0, 62); const pi = this.add.image(0, 0, ready); pi.setScale(66 / Math.max(pi.width, pi.height)); bb.add([g, pi]); c.add(bb); this.tweens.add({ targets: bb, y: top - 44, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      if (busy && B.k === 'factory') { const sy = im.scaleY; this.tweens.add({ targets: im, scaleY: sy * 1.025, scaleX: im.scaleX * 0.99, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); c.busy = true; }   // 일하는 공장은 살짝 들썩임
      if (ready) {} else if (busy) { const z = T(this, x, top - 10, B.k === 'animal' ? '💤' : '⚙️', 40, '#FFFFFF', { w: 900 }); c.add(z); this.tweens.add({ targets: z, angle: B.k === 'animal' ? 0 : 360, alpha: B.k === 'animal' ? 0.5 : 1, duration: B.k === 'animal' ? 900 : 3000, yoyo: B.k === 'animal', repeat: -1 }); } }
    if (this.sel && this.sel.id === o.id && this.mode !== 'move') { const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), g = this.add.graphics(); this.diamond(g, o.x, o.y, B.sz, 0xFFE27A, 0.35); c.addAt(g, 0); }
    c.dk = o.b === 'path' || o.b === 'road' ? -1 : o.x + o.y + B.sz; this.layer.add(c); return c;
  }
  // 밭 바닥: 이웃 밭과 이어진 평평한 흙 (고랑 줄무늬 · 바깥쪽에만 얇은 두께)
  drawSoil(o) { const x = o.x, y = o.y, isF = (a, b) => { const q = objAt(a, b); return q && q.b === 'field'; }, P = (a, b) => { const [px, py] = iso(a, b); return { x: px, y: py }; };
    const T0 = P(x, y), R0 = P(x + 1, y), B0 = P(x + 1, y + 1), L0 = P(x, y + 1), g = this.add.graphics(), th = 9, lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    if (!isF(x, y + 1)) g.fillStyle(0x4E2E18, 1).fillPoints([L0, B0, { x: B0.x, y: B0.y + th }, { x: L0.x, y: L0.y + th }], true);
    if (!isF(x + 1, y)) g.fillStyle(0x3F2412, 1).fillPoints([B0, R0, { x: R0.x, y: R0.y + th }, { x: B0.x, y: B0.y + th }], true);
    g.fillStyle(0x7B4B2A, 1).fillPoints([T0, R0, B0, L0], true);
    for (let k = 1; k < 5; k++) { const t = k / 5, a = lerp(T0, L0, t), b = lerp(R0, B0, t); g.lineStyle(7, 0x5F3820, 0.9).lineBetween(a.x, a.y, b.x, b.y); g.lineStyle(3, 0x9A6640, 0.7).lineBetween(a.x, a.y - 5, b.x, b.y - 5); }
    const edge = (a, b) => g.lineStyle(4, 0x5A3A1E, 0.9).lineBetween(a.x, a.y, b.x, b.y); if (!isF(x, y - 1)) edge(T0, R0); if (!isF(x + 1, y)) edge(R0, B0); if (!isF(x, y + 1)) edge(B0, L0); if (!isF(x - 1, y)) edge(L0, T0);
    g.dk = -0.5; this.layer.add(g); }
  // 도로: 이웃 도로와 이어지게 직접 그림 (끊긴 쪽에만 연석 · 곧은 길엔 가운데 점선)
  drawRoad(c, o) { const x = o.x, y = o.y, isR = (a, b) => { const q = objAt(a, b); return q && q.b === 'road'; }, nx = [isR(x - 1, y), isR(x + 1, y)], ny = [isR(x, y - 1), isR(x, y + 1)];
    const P = (a, b) => { const [px, py] = iso(a, b); return { x: px, y: py }; }, T0 = P(x, y), R0 = P(x + 1, y), B0 = P(x + 1, y + 1), L0 = P(x, y + 1), g = this.add.graphics(), th = 10;
    g.fillStyle(0x3E4148, 1).fillPoints([L0, B0, { x: B0.x, y: B0.y + th }, { x: L0.x, y: L0.y + th }], true).fillStyle(0x34373D, 1).fillPoints([B0, R0, { x: R0.x, y: R0.y + th }, { x: B0.x, y: B0.y + th }], true);
    g.fillStyle(0x5C6068, 1).fillPoints([T0, R0, B0, L0], true);
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), curb = (a, b) => g.lineStyle(7, 0xD9D6CC, 1).lineBetween(a.x, a.y, b.x, b.y);
    if (!ny[0]) curb(T0, R0); if (!nx[1]) curb(R0, B0); if (!ny[1]) curb(B0, L0); if (!nx[0]) curb(L0, T0);
    const dash = (a, b) => { g.lineStyle(5, 0xF4F1E6, 0.95); for (const t of [0.12, 0.62]) { const p0 = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, p1 = { x: a.x + (b.x - a.x) * (t + 0.26), y: a.y + (b.y - a.y) * (t + 0.26) }; g.lineBetween(p0.x, p0.y, p1.x, p1.y); } };
    const hx = nx[0] || nx[1], hy = ny[0] || ny[1]; if (hx && !hy) dash(mid(L0, T0), mid(R0, B0)); else if (hy && !hx) dash(mid(T0, R0), mid(B0, L0)); else if (!hx && !hy) dash(mid(L0, T0), mid(R0, B0));
    c.add(g); }
  diamond(g, gx, gy, sz, col, a) { const p = [iso(gx, gy), iso(gx + sz, gy), iso(gx + sz, gy + sz), iso(gx, gy + sz)]; g.fillStyle(col, a).fillPoints(p.map(([x, y]) => ({ x, y })), true).lineStyle(4, col, 1).strokePoints(p.map(([x, y]) => ({ x, y })), true); }
  // ── 기차역: 지도 오른쪽 끝 (항상 있음 · 레벨 2부터 운행)
  drawStation() {
    this.stationG?.destroy(); const c = this.stationG = this.add.container(0, 0).setDepth(1), [x, y] = iso(MAP + 1.6, MAP / 2 + 1), st = this.add.image(x - 40, y - 60, 'station'); st.setScale(TW * 2 / st.width); c.add(st);   // 지도 오른쪽 바깥 · 선로는 가장자리를 따라
    const t = train(), away = !t || t.away; this.trainC = this.add.container(x + 60, y + 120); c.add(this.trainC);
    if (!away) { const lo = this.add.image(0, 0, 'loco').setFlipX(true); lo.setScale(TW * 1.3 / lo.width); this.trainC.add(lo); t.cars.forEach((cr, k) => { const w = this.add.image((k + 1) * 150, -(k + 1) * 75, 'wagon').setFlipX(true); w.setScale(TW * 1.15 / w.width); const ic = this.add.image((k + 1) * 150, -(k + 1) * 75 - 70, cr.it); ic.setScale(60 / ic.height); if (cr.done) ic.setAlpha(0.35); this.trainC.add([w, ic]); }); this.trainC.list.reverse(); }
    this.stationXY = [x, y];
  }
  // ── 입력: 끌면 화면 이동 · 두 손가락 확대 · 짧게 누르면 선택
  down(p) { if (this.hud && this.hud.blocking(p)) { this.press = null; return; } this.press = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false, t: Date.now() }; this.pinch = null;
    if (this.plantK) { const f = this.fieldAt(p); if (f && !f.crop) { this.press.plant = true; this.hud.plantOne(f, this.plantK); } } }
  fieldAt(p) { const w = this.cameras.main.getWorldPoint(p.x, p.y), [gx, gy] = grid(w.x, w.y), o = objAt(gx, gy); return o && o.b === 'field' ? o : null; }
  move(p) {
    const a = this.input.pointer1, b = this.input.pointer2;
    if (a.isDown && b.isDown) { const dd = Math.hypot(a.x - b.x, a.y - b.y); if (!this.pinch) this.pinch = { d: dd, z: this.cameras.main.zoom }; else this.zoom(this.pinch.z * dd / this.pinch.d); if (this.press) this.press.moved = true; return; }
    const pr = this.press; if (!pr || !p.isDown) return; if (pr.plant && this.plantK) { const f = this.fieldAt(p); if (f && !f.crop) this.hud.plantOne(f, this.plantK); pr.moved = true; return; }   // 심기 모드: 문지르면 지나간 빈 밭마다 심음
    const dx = p.x - pr.x, dy = p.y - pr.y; if (Math.hypot(dx, dy) > 14) pr.moved = true; if (!pr.moved) return;
    if (this.mode) { const w = this.cameras.main.getWorldPoint(p.x, p.y), [gx, gy] = grid(w.x, w.y); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); return; }
    const z = this.cameras.main.zoom; this.cameras.main.setScroll(pr.sx - dx / z, pr.sy - dy / z);
  }
  up(p) { const pr = this.press; this.press = null; this.dragGhost = false; if (!pr || pr.moved || pr.plant) return; const w = this.cameras.main.getWorldPoint(p.x, p.y); this.tap(w.x, w.y); }
  tap(wx, wy) {
    if (this.mode) { const [gx, gy] = grid(wx, wy); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); return; }
    if (this.plantK) { const [gx, gy] = grid(wx, wy), f0 = objAt(gx, gy), f = f0 && f0.b === 'field' ? f0 : null; if (f && !f.crop) return this.hud.plantOne(f, this.plantK); this.hud.endPlant(); }
    // 기차
    if (this.stationXY && Math.hypot(wx - this.stationXY[0] - 200, wy - this.stationXY[1]) < 300) { audio.play('sfx_tap'); return this.hud.trainPanel(); }
    // 건물은 그림 위쪽을 눌러도 잡히게: 아래에서 위로 몇 칸 훑어봄
    const [gx, gy] = grid(wx, wy), sp = this.d.dig.spot;
    // 앞쪽 건물의 지붕이 뒤 칸을 덮으므로: 앞으로 2칸까지 건물(밭 제외)을 먼저 찾고, 없으면 누른 칸
    let hit = null; for (let k = 2; k >= 1 && !hit; k--) { const o = objAt(gx + k, gy + k); if (o && o.b !== 'field') hit = o; } if (!hit) hit = objAt(gx, gy);
    if (sp && sp[0] === gx && sp[1] === gy) return this.hud.dig();
    if (!hit) { if (!open(gx, gy) && gx >= 0 && gy >= 0 && gx < MAP && gy < MAP) return this.hud.expand(gx, gy); this.select(null); return; }
    this.select(hit); this.hud.objTap(hit);
  }
  select(o) { this.sel = o; this.drawObjs(); }
  tick() { if (this.dead) return; let ch = false; for (const o of this.d.objs) { if (o.b === 'field' && o.crop && !o.ripe && cropReady(o)) { o.ripe = true; ch = true; } if (o.b === 'field' && o.crop && !cropReady(o)) ch = true; if (BUILDS[o.b].k === 'factory' && tickFactory(o)) ch = true; if (BUILDS[o.b].k === 'animal' && tickAnimal(o)) ch = true; }
    const t = train(); if (t && t.away !== this.trainAway) { const leaving = t.away && this.trainAway === false && this.trainC; this.trainAway = t.away; if (leaving) { const tc = this.trainC; this.tweens.add({ targets: tc, x: tc.x - 1400, y: tc.y + 700, duration: 2200, ease: 'Cubic.easeIn', onComplete: () => this.drawStation() }); } else this.drawStation(); if (!t.away) audio.play('sfx_whistle', { volume: 0.5 }); }
    if (ch && !this.mode) this.drawObjs(); save(); this.hud && this.hud.refresh(); }
  // ── 놓기 · 옮기기
  startPlace(b, moving) {
    this.hud && this.hud.endPlant();
    const B = BUILDS[b], cam = this.cameras.main, w = cam.getWorldPoint(W / 2, H / 2), [gx, gy] = grid(w.x, w.y);
    this.ghostFlip = !!(moving && moving.flip); this.mode = moving ? 'move' : 'place'; this.placing = { b, moving }; this.ghost = this.add.container(0, 0); this.ghost.sz = B.sz; this.ghost.setDepth(5); this.ghost.dk = 999;
    this.ghostIm = this.add.image(0, 0, b === 'field' ? 'soil' : b === 'mine' ? 'mine_b' : b).setAlpha(0.85); this.ghostG = this.add.graphics(); this.ghost.add([this.ghostG, this.ghostIm]);
    this.layer.add(this.ghost); this.moveGhost(moving ? moving.x : gx - 1, moving ? moving.y : gy - 1);
    this.ghostIm.setInteractive({ draggable: false }); this.input.on('gameobjectdown', (p, go) => { if (go === this.ghostIm) this.dragGhost = true; });
  }
  moveGhost(gx, gy) { const sz = this.ghost.sz; gx = Phaser.Math.Clamp(gx, 0, MAP - sz); gy = Phaser.Math.Clamp(gy, 0, MAP - sz); this.ghost.gx = gx; this.ghost.gy = gy; place(this.ghostIm, gx, gy, sz, 0.08); this.ghostOk = freeRect(gx, gy, sz, this.placing.moving); this.ghostG.clear(); this.diamond(this.ghostG, gx, gy, sz, this.ghostOk ? 0x5AE36A : 0xFF4A4A, 0.4); this.ghostIm.setFlipX(!!this.ghostFlip).setTint(this.ghostOk ? 0xFFFFFF : 0xFF5A5A).setAlpha(this.ghostOk ? 0.95 : 0.6); this.hud && this.hud.placeOk(this.ghostOk); }
  flipGhost() { if (!this.ghostIm) return; this.ghostFlip = !this.ghostFlip; this.ghostIm.setFlipX(this.ghostFlip); this.tweens.add({ targets: this.ghostIm, scaleX: { from: this.ghostIm.scaleX * 0.85, to: this.ghostIm.scaleX }, duration: 160, ease: 'Back.easeOut' }); }
  endPlace() { this.ghost?.destroy(); this.ghost = null; this.mode = null; this.placing = null; this.input.off('gameobjectdown'); this.drawObjs(); }
  // 화면 좌표 (말풍선·날아가는 아이콘용)
  screenOf(o) { const B = BUILDS[o.b], [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), cam = this.cameras.main; return [(x - cam.worldView.x) * cam.zoom, (y - cam.worldView.y) * cam.zoom - 40]; }
}
