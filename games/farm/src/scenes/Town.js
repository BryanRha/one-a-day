import { BASE } from '../base.js?v=0.53.1';
// 마을 화면 (쿼터뷰): 땅 · 밭 · 건물 · 기차역 · 강아지 · 끌어서 이동 · 두 손가락/휠 확대 · 누르기 · 건물 놓기
import { W, H } from '../config.js?v=0.53.1';
import { T, C } from '../ui.js?v=0.53.1';
import { audio } from '../audio.js?v=0.53.1';
import { BUILDS, CROPS, MAP, ZONE, RECIPES } from '../data.js?v=0.53.1';
import { load, save, open, objAt, freeRect, cropReady, tickFactory, tickAnimal, digSpot, productOf, train, trainN, trainCount, zooCoins, pop } from '../state.js?v=0.53.1';
import { TRAINS } from '../data.js?v=0.53.1';

export const TW = 180, TH = 90, OX = MAP * TW / 2 + 260, OY = 260;
export const iso = (gx, gy) => [OX + (gx - gy) * TW / 2, OY + (gx + gy) * TH / 2];
export const grid = (x, y) => { const a = (x - OX) / (TW / 2), b = (y - OY) / (TH / 2); return [Math.floor((a + b) / 2), Math.floor((b - a) / 2)]; };
const WORLD_W = MAP * TW + 1000, WORLD_H = MAP * TH + 620;
// 땅·건물 그림은 아래 꼭짓점에 맞춤 (그림 밑의 두께만큼 올림)
function place(img, gx, gy, sz, k = 0.1) { const m = BASE[img.texture.key.replace(/_b$/, '')];
  if (m) { const B0 = BUILDS[img.texture.key], deco = B0 && B0.k === 'deco' && sz === 1, f = deco ? 0.74 : 1, e = (1 - f) / 2;   // 1칸 장식은 칸 가운데에 74% 크기 → 옆 칸과 사이에 잔디가 보여 쌓여 보이지 않음
    const [x, y] = iso(gx + sz - e * sz, gy + sz - e * sz); img.setOrigin(m[0], m[1]); img.setScale(sz * f * TW / (m[2] * img.width)); img.setPosition(x, y); return img; }   // 받침 아래 꼭짓점을 칸의 아래 꼭짓점에 · 받침 너비를 칸 너비에 (평평하게)
  const [x, y] = iso(gx + sz, gy + sz); img.setOrigin(0.5, 1 - k * img.width / img.height); img.setScale(sz * TW * 1.04 / img.width); img.setPosition(x, y); return img; }

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
    if (this.dead) return; dt = Math.min(dt, 80);
    if (this.mode && this.dragAt && this.ghost) { const { x, y } = this.dragAt, e = 150, sp = 0.9 * dt / this.cameras.main.zoom, cam = this.cameras.main; let vx = 0, vy = 0; if (x < e) vx = -1; else if (x > W - e) vx = 1; if (y < 260) vy = -1; else if (y > H - 470) vy = 1; if (vx || vy) { cam.setScroll(cam.scrollX + vx * sp, cam.scrollY + vy * sp); this.ghostTo(x, y); } } this.driveTick(time, dt); if (!this.walkers.length) { if (this.cars && this.cars.length) this.layer.sort('dk'); return; } const T1 = 720;   // 한 칸 걷는 시간(ms)
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
  // 건물 위 진행 막대: 공장은 첫 작업, 동물은 가장 먼저 끝나는 칸
  prog(pb) { const o = pb.o, B = BUILDS[o.b], now = Date.now(); let end = 0, tot = 1; if (B.k === 'factory' && o.q && o.q[0]) { end = o.q[0].end; tot = RECIPES[o.q[0].it].t * 1000 * (1 - 0.12 * (o.up || 0)); } else if (B.k === 'animal' && o.s) { const e = o.s.filter(Boolean).sort((a, b) => a - b)[0]; if (e) { end = e; tot = RECIPES[productOf(o.b)].t * 1000; } }
    const left = Math.max(0, end - now), k = Math.max(0, Math.min(1, 1 - left / tot)), w = 120; pb.g.clear(); if (!end) { pb.t.setText(''); return; } pb.g.fillStyle(0x3E2A14, 0.85).fillRoundedRect(pb.x - w / 2 - 4, pb.y - 11, w + 8, 22, 11).fillStyle(0x8BE36A, 1).fillRoundedRect(pb.x - w / 2, pb.y - 7, Math.max(10, w * k), 14, 7);
    const sec = Math.ceil(left / 1000); pb.t.setText(sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor(sec % 3600 / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`); }
  bars() { if (!this.spr) return; for (const id in this.spr) { const c = this.spr[id]; if (c && c.pb && c.pb.g.active) this.prog(c.pb); } for (const o of this.d.objs) { if (o.b !== 'field' || !o.crop) continue; const c = this.spr[o.id]; if (!c || !c.bar || !c.bar.active) continue; const [x, y] = iso(o.x + 0.5, o.y + 0.5), t = Math.max(0, (o.at - Date.now()) / 1000), k = Math.min(1, Math.max(0, 1 - t / CROPS[o.crop].t));
    c.bar.clear().fillStyle(0x000000, 0.4).fillRoundedRect(x - 40, y - 20, 80, 14, 7).fillStyle(0x8BE36A, 1).fillRoundedRect(x - 40, y - 20, Math.max(8, 80 * k), 14, 7); } }
  // 일하는 공장 굴뚝 연기
  puffs() { if (this.dead || !this.spr) return; for (const o of this.d.objs) { const c = this.spr[o.id]; if (!c || !c.busy || !c.im || Math.random() < 0.45) continue; const B = BUILDS[o.b], [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), top = y - c.im.displayHeight * 0.78;
      const pf = this.add.circle(x - 30 + Math.random() * 40, top, 14 + Math.random() * 8, 0xFFFFFF, 0.75); this.fx.add(pf); this.tweens.add({ targets: pf, y: top - 90, x: pf.x + 20 + Math.random() * 30, scale: 2.2, alpha: 0, duration: 1800, ease: 'Sine.easeOut', onComplete: () => pf.destroy() }); } }
  zoom(z) { this.cameras.main.setZoom(Phaser.Math.Clamp(z, 0.5, 1.6)); }
  // ── 땅: 열린 구역은 풀 · 닫힌 구역은 숲
  drawGround() {
    this.ground.removeAll(true);
    // 열린 땅: 평평한 잔디 (칸마다 두께 없이 · 아주 옅은 바둑무늬 + 풀포기 · 꽃) — 칸이 쌓여 보이지 않게
    const g = this.add.graphics(), P = (a, b) => { const [x, y] = iso(a, b); return { x, y }; }, h = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!open(gx, gy)) continue; g.fillStyle((gx + gy) % 2 ? 0x86C94A : 0x8CCE50, 1).fillPoints([P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)], true); }
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!open(gx, gy)) continue; const r = h(gx, gy);
      for (let k = 0; k < 3; k++) { const q = P(gx + ((r >> (k * 4)) % 9 + 1) / 10, gy + ((r >> (k * 4 + 2)) % 9 + 1) / 10); g.lineStyle(3, 0x5E9E34, 0.75); g.lineBetween(q.x, q.y, q.x - 4, q.y - 9); g.lineBetween(q.x, q.y, q.x + 1, q.y - 11); g.lineBetween(q.x, q.y, q.x + 5, q.y - 8); }
      if (r % 7 === 0) { const q = P(gx + 0.5, gy + 0.5); g.fillStyle([0xFFFFFF, 0xFFE27A, 0xFFB6CB][r % 3], 1).fillCircle(q.x, q.y - 2, 4); }
      if (r % 11 === 0) { const q = P(gx + 0.3, gy + 0.6); g.fillStyle(0xC9C2B0, 1).fillEllipse(q.x, q.y, 12, 7); } }
    this.ground.add(g);
    // 닫힌 땅(숲)은 그대로 나무 그림 (숲은 원래 빽빽하게 겹쳐 보이는 게 자연스러움)
    for (let s = 0; s < MAP * 2 - 1; s++) for (let gx = 0; gx < MAP; gx++) { const gy = s - gx; if (gy < 0 || gy >= MAP || open(gx, gy)) continue;
      const im = this.add.image(0, 0, 'forest'); place(im, gx, gy, 1, 0.12); this.ground.add(im); }
    // 닫힌 구역 위 '넓히기' 팻말 (이웃한 구역만)
    const n = MAP / ZONE; for (let z = 0; z < n * n; z++) { if (this.d.zones.includes(z)) continue; const zx = z % n, zy = Math.floor(z / n); if (!this.d.zones.some(o => Math.abs(o % n - zx) + Math.abs(Math.floor(o / n) - zy) === 1)) continue;
      const [x, y] = iso(zx * ZONE + ZONE / 2, zy * ZONE + ZONE / 2), g = this.add.graphics(); g.fillStyle(0x3E2A14, 0.85).fillRoundedRect(x - 70, y - 64, 140, 56, 28); this.ground.add(g); this.ground.add(T(this, x, y - 36, '🔨 넓히기', 26, '#FFFFFF', { w: 900 })); }
  }
  // ── 건물 · 밭
  drawObjs() {
    this.cars = (this.cars || []).filter(c => c.active); for (const w of [...this.walkers, ...this.cars]) this.layer.remove(w);
    { const all = []; const walk = o => { all.push(o); if (o.list) o.list.forEach(walk); }; this.layer.list.forEach(walk); this.tweens.killTweensOf(all); }   // 지우는 그림의 반복 애니메이션도 함께 정리 (쌓이면 느려지고 멈춤)
    this.layer.removeAll(true); this.spr = {};
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
    else if (o.b === 'fence' || o.b === 'hedge') this.drawFence(c, o);
    else if (o.b === 'path') this.drawPath(c, o);
    else if (o.site) { const im = this.add.image(0, 0, 'site'); place(im, o.x, o.y, B.sz, 0.08); im.setFlipX(!!o.flip); c.add(im); c.im = im; const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), bb = this.add.container(x, y - im.displayHeight * 0.62 - 30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillCircle(0, 0, 46).lineStyle(5, 0xE89A2E, 1).strokeCircle(0, 0, 46).fillTriangle(-14, 38, 14, 38, 0, 62); const pi = this.add.image(0, 0, 'brick'); pi.setScale(60 / Math.max(pi.width, pi.height)); bb.add([g, pi]); c.add(bb); this.tweens.add({ targets: bb, y: bb.y - 14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
    else { const im = this.add.image(0, 0, o.b === 'mine' ? 'mine_b' : o.b); place(im, o.x, o.y, B.sz, 0.08); im.setFlipX(!!o.flip); c.add(im); c.im = im;
      // 다 된 물건 말풍선
      let ready = null; if (B.k === 'factory') { tickFactory(o); if (o.done.length) ready = o.done[0]; } if (B.k === 'animal') { tickAnimal(o); if (o.ready) ready = productOf(o.b); } if (B.k === 'exhibit' && zooCoins(o) >= 20) ready = 'coin';
      const busy = B.k === 'factory' && o.q && o.q.length || B.k === 'animal' && o.s && o.s.some(Boolean);
      const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), top = y - im.displayHeight * 0.62;
      if (ready) { const bb = this.add.container(x, top - 30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillCircle(0, 0, 46).lineStyle(5, 0x5AAE3C, 1).strokeCircle(0, 0, 46).fillTriangle(-14, 38, 14, 38, 0, 62); const pi = this.add.image(0, 0, ready); pi.setScale(66 / Math.max(pi.width, pi.height)); bb.add([g, pi]); { const n = B.k === 'factory' ? o.done.length : B.k === 'animal' ? o.ready : 0; if (n > 1) { const bc = this.add.circle(36, -34, 22, 0xE8352E).setStrokeStyle(4, 0xFFFFFF); bb.add([bc, T(this, 36, -35, `${n}`, 26, '#FFFFFF', { w: 900 })]); } } /* 다 된 것이 여러 개면 개수 */ c.add(bb); this.tweens.add({ targets: bb, y: top - 44, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      if (busy && B.k === 'factory') { const v = 1 + (o.id % 5), [wx2, wy2] = iso(o.x + B.sz + 0.05, o.y + B.sz * 0.55), wk = this.add.image(wx2, wy2, `w${v}_f1`).setOrigin(0.5, 0.97); wk.setScale(TH * 1.25 / wk.height).setFlipX(true); c.add(wk); let fr = 0;   /* 일하는 사람: 건물 앞에서 몸을 숙였다 폈다 */
        this.tweens.add({ targets: wk, angle: { from: -4, to: 8 }, scaleY: wk.scaleY * 0.94, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onRepeat: () => { fr = 1 - fr; wk.setTexture(`w${v}_f${fr + 1}`); } }); }
      if (busy && B.k === 'animal') { const sy0 = im.scaleY; this.tweens.add({ targets: im, scaleY: sy0 * 1.015, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      if (busy && B.k === 'factory') { const sy = im.scaleY; this.tweens.add({ targets: im, scaleY: sy * 1.025, scaleX: im.scaleX * 0.99, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); c.busy = true; }   // 일하는 공장은 살짝 들썩임
      if (ready) {} else if (busy) { const pb = this.add.graphics(), pt = T(this, x, top - 34, '', 22, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 6); c.add([pb, pt]); c.pb = { g: pb, t: pt, x, y: top - 6, o }; this.prog(c.pb); } }   // 만드는 중: 진행 막대 + 남은 시간 (열어 보지 않아도 보임)
    if (this.sel && this.sel.id === o.id && this.mode !== 'move') { const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), g = this.add.graphics(); this.diamond(g, o.x, o.y, B.sz, 0xFFE27A, 0.35); c.addAt(g, 0); }
    if (this.mode === 'move' && this.movingId === o.id) c.setAlpha(0.3);
    c.dk = o.b === 'path' || o.b === 'road' ? -1 : o.x + o.y + B.sz; this.layer.add(c); return c;
  }
  // 밭 바닥: 이웃 밭과 이어진 평평한 흙 (고랑 줄무늬 · 바깥쪽에만 얇은 두께)
  // 밭: 땅 높이에 평평하게 · 칸마다 살짝 도드라진 네모 밭 (이웃 밭과는 흙 골로 나뉨)
  drawSoil(o) { const x = o.x, y = o.y, P = (a, b) => { const [px, py] = iso(a, b); return { x: px, y: py }; }, g = this.add.graphics(), e = 0.07, th = 6;
    const T0 = P(x, y), R0 = P(x + 1, y), B0 = P(x + 1, y + 1), L0 = P(x, y + 1);
    g.fillStyle(0x6A4022, 0.55).fillPoints([T0, R0, B0, L0], true);   // 골 (칸 사이 흙길)
    const t = P(x + e, y + e), r = P(x + 1 - e, y + e), b = P(x + 1 - e, y + 1 - e), l = P(x + e, y + 1 - e), up = v => ({ x: v.x, y: v.y - th });
    g.fillStyle(0x4E2E18, 1).fillPoints([l, b, up(b), up(l)], true).fillStyle(0x3F2412, 1).fillPoints([b, r, up(r), up(b)], true);   // 도드라진 옆면
    const T1 = up(t), R1 = up(r), B1 = up(b), L1 = up(l), lerp = (a, c, k) => ({ x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k });
    g.fillStyle(0x7E4D2B, 1).fillPoints([T1, R1, B1, L1], true);
    for (let k = 1; k < 5; k++) { const q = k / 5, a = lerp(T1, L1, q), c = lerp(R1, B1, q); g.lineStyle(6, 0x5F3820, 0.85).lineBetween(a.x, a.y, c.x, c.y); g.lineStyle(2, 0x9C6842, 0.7).lineBetween(a.x, a.y - 4, c.x, c.y - 4); }
    g.lineStyle(3, 0xA87650, 0.8).strokePoints([T1, R1, B1, L1], true);
    g.dk = -0.5; this.layer.add(g); }
  // 울타리 · 산울타리: 땅 위에 평평하게 서서 이웃한 같은 울타리와 이어짐 (칸마다 받침이 생기지 않게 직접 그림)
  drawFence(c, o) { const same = (a, b) => { const q = objAt(a, b); return q && q.b === o.b; }, ctr = iso(o.x + 0.5, o.y + 0.5), g = this.add.graphics(), hedge = o.b === 'hedge';
    const segs = []; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (same(o.x + dx, o.y + dy)) { const e = iso(o.x + 0.5 + dx * 0.5, o.y + 0.5 + dy * 0.5); segs.push(e); }
    if (!segs.length) { segs.push(iso(o.x + 0.95, o.y + 0.5), iso(o.x + 0.05, o.y + 0.5)); }
    const H0 = hedge ? 46 : 52;
    for (const [ex, ey] of segs) { const [x0, y0] = ctr, len = Math.hypot(ex - x0, ey - y0), n = Math.max(2, Math.round(len / 15));
      g.lineStyle(10, 0x2A3A10, 0.18).lineBetween(x0, y0 + 4, ex, ey + 4);   // 땅 그림자
      if (hedge) { for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (ex - x0) * t, y = y0 + (ey - y0) * t; g.fillStyle(0x3F7A2A, 1).fillCircle(x, y - 22, 20).fillStyle(0x5E9E3A, 1).fillCircle(x - 4, y - 28, 15).fillStyle(0x86C04E, 1).fillCircle(x - 7, y - 33, 7); } continue; }
      for (const h of [20, 40]) { g.lineStyle(7, 0xB9B2A6, 1).lineBetween(x0, y0 - h + 2, ex, ey - h + 2); g.lineStyle(5, 0xFFFFFF, 1).lineBetween(x0, y0 - h, ex, ey - h); }
      for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (ex - x0) * t, y = y0 + (ey - y0) * t; g.fillStyle(0xB9B2A6, 1).fillRect(x - 5, y - H0, 10, H0).fillStyle(0xFFFFFF, 1).fillRect(x - 4, y - H0, 7, H0 - 2).fillTriangle(x - 5, y - H0, x + 5, y - H0, x, y - H0 - 9); } }
    if (!hedge) g.fillStyle(0xE8E2D6, 1).fillRect(ctr[0] - 7, ctr[1] - H0 - 6, 14, H0 + 6).fillStyle(0xFFFFFF, 1).fillCircle(ctr[0], ctr[1] - H0 - 8, 8);   // 가운데 기둥
    c.add(g); }
  // 돌길: 땅 높이에 평평한 돌판 (이웃 돌길과 이어짐 · 두께 없음)
  drawPath(c, o) { const x = o.x, y = o.y, P = (a, b) => { const [px, py] = iso(a, b); return { x: px, y: py }; }, g = this.add.graphics(), isP = (a, b) => { const q = objAt(a, b); return q && q.b === 'path'; };
    const ex = [isP(x - 1, y) ? 0 : 0.06, isP(x, y - 1) ? 0 : 0.06, isP(x + 1, y) ? 1 : 0.94, isP(x, y + 1) ? 1 : 0.94];
    g.fillStyle(0xB9AE98, 1).fillPoints([P(x + ex[0], y + ex[1]), P(x + ex[2], y + ex[1]), P(x + ex[2], y + ex[3]), P(x + ex[0], y + ex[3])], true);
    const rnd = (i, j) => ((x * 73 + y * 37 + i * 11 + j * 5) % 7) / 7;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const a = x + 0.08 + i * 0.44, b = y + 0.08 + j * 0.44, w = 0.38, sh = 0.03 * rnd(i, j); g.fillStyle([0xD9D2C2, 0xCFC6B2, 0xE2DCCD][(i + j + x + y) % 3], 1).fillPoints([P(a + sh, b), P(a + w, b + sh), P(a + w - sh, b + w), P(a, b + w - sh)], true).lineStyle(2, 0x9A8E78, 0.7).strokePoints([P(a + sh, b), P(a + w, b + sh), P(a + w - sh, b + w), P(a, b + w - sh)], true); }
    g.dk = -0.5; c.add(g); }
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
  // ── 기차역 · 선로 · 기차 (선로는 지도 오른쪽 가장자리를 따라 쭉 · 기관차와 화물칸은 이어 붙음)
  trackPt(gy, ti = 0) { return iso(MAP + 1.05 + ti * 2.1, gy); }   // 기차 1·2·3번 선로는 나란히
  drawStation() {
    this.stationG?.destroy(); const c = this.stationG = this.add.container(0, 0).setDepth(1), nT = trainCount(), [sx, sy] = iso(MAP + 1.05 + Math.max(1, nT) * 2.1 + 1.4, MAP / 2 + 6.4); this.trainCs = [];   /* 역은 열린 선로 바로 바깥 · 1번 기관차 옆 */
    // 선로: 침목 + 레일 두 줄
    for (let ti = 0; ti < Math.max(1, nT); ti++) { const tr = this.add.graphics(), a = this.trackPt(-3, ti), b = this.trackPt(MAP + 5, ti), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    for (let d = 0; d < L; d += 34) { const x = a[0] + ux * d, y = a[1] + uy * d; tr.lineStyle(14, 0x6B4423, 1).lineBetween(x - nx * 34, y - ny * 34 * 0.6 - 8, x + nx * 34, y + ny * 34 * 0.6 + 8); }
    for (const o of [-20, 20]) { tr.lineStyle(7, 0x5A5F66, 1).lineBetween(a[0] + nx * o, a[1] + ny * o * 0.6, b[0] + nx * o, b[1] + ny * o * 0.6); tr.lineStyle(3, 0xC9CED6, 1).lineBetween(a[0] + nx * o, a[1] + ny * o * 0.6 - 3, b[0] + nx * o, b[1] + ny * o * 0.6 - 3); }
    c.add(tr); }
    const st = this.add.image(sx, sy, 'station').setOrigin(0.5, 0.86); st.setScale(TW * 2 / st.width); c.add(st);
    this.stationXY = this.trackPt(MAP / 2 + 1, 0); this.anim = this.anim || [];
    for (let ti = 0; ti < nT; ti++) { const tc = this.add.container(0, 0); c.add(tc); this.trainCs[ti] = tc; const t = trainN(ti); if (t && !t.away && !this.anim[ti]) this.buildTrain(t, 0, ti); }
    this.trainC = this.trainCs[0];
  }
  // 기차 그리기: off = 선로를 따라 밀린 칸 수 (들어오고 나갈 때 움직임)
  buildTrain(t, off, ti = 0) { const tc = this.trainCs[ti]; if (!tc) return; tc.removeAll(true); const head = MAP / 2 + 2.3 + ti * 4.4 + off, STEP = 1.32, parts = [], bubbles = [];
    const put = (key, gy, w) => { const [x, y] = this.trackPt(gy, ti), im = this.add.image(x, y + 8, key).setOrigin(0.5, 0.78);   /* 선로 방향(오른쪽 위 ↔ 왼쪽 아래)으로 놓음 */ im.setScale(TW * w / im.width); return im; };
    const loco = put('loco', head, 1.3); parts.push([head, loco]); tc.loco = loco;
    t.cars.forEach((cr, k) => { const gy = head - STEP * (k + 1), w = put('wagon', gy, 1.12), [x, y] = this.trackPt(gy, ti), g = this.add.container(x, y - 165), d = this.d.items[cr.it] || 0, ok = d >= cr.n;
      // 이음새 (앞 칸과 연결)
      const [px, py] = this.trackPt(gy + STEP * 0.5, ti), cp = this.add.graphics(); cp.fillStyle(0x2E2A26, 1).fillCircle(px, py - 18, 8); parts.push([gy + STEP * 0.5 + 0.01, cp]);
      if (cr.done) { for (let i = 0; i < 3; i++) { const ic = this.add.image(x - 34 + i * 34, y - 52 - (i % 2) * 8, cr.it); ic.setScale(54 / Math.max(ic.width, ic.height)); parts.push([gy - 0.01, ic]); } const ck = this.add.circle(0, 0, 30, 0x5AAE3C).setStrokeStyle(5, 0xFFFFFF); g.add([ck, T(this, 0, -2, '✓', 34, '#FFFFFF', { w: 900 })]); }
      else { const bg = this.add.graphics(); bg.fillStyle(0xFFFFFF, 1).fillRoundedRect(-62, -52, 124, 104, 26).lineStyle(5, ok ? 0x5AAE3C : 0xE3D3C2, 1).strokeRoundedRect(-62, -52, 124, 104, 26).fillStyle(0xFFFFFF, 1).fillTriangle(-12, 50, 12, 50, 0, 66); const ic = this.add.image(0, -12, cr.it); ic.setScale(58 / Math.max(ic.width, ic.height));
        g.add([bg, ic, T(this, 0, 32, ok ? `${cr.n}개 ✓` : `${d}/${cr.n}`, 24, ok ? C.green : C.red, { w: 900 })]); if (ok) this.tweens.add({ targets: g, y: g.y - 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      parts.push([gy, w]); bubbles.push(g); w.car = k; g.car = k; });
    parts.sort((a, b) => a[0] - b[0]); for (const [, o] of parts) tc.add(o); for (const g of bubbles) tc.add(g);   /* 뒤 칸부터 (앞쪽이 위에) · 말풍선은 맨 위 */
    tc.parts = parts; }
  // 칸 누르기: 그 칸에 바로 싣기 (빈 곳은 기차 창)
  trainTap(wx, wy) { let best = null, bd = 1e9, bt = 0; (this.trainCs || []).forEach((tc, ti) => { const t = trainN(ti); if (!t || t.away || !tc.parts) return; for (const [, o] of tc.parts) if (o.car !== undefined && o.type === 'Image') { const dd = Math.hypot(o.x - wx, o.y - 60 - wy); if (dd < bd) { bd = dd; best = o; bt = ti; } } });
    if (best && bd < 130) { this.hud.loadCarAt(best.car, bt); return true; } return false; }
  // 출발 컷씬: 화면을 어둡게 · 기차 쪽으로 카메라 · 기적 · 연기 · 선로를 따라 떠남 · 보상 띠
  departCut(t, ti = 0) { const cam = this.cameras.main, prev = { x: cam.midPoint.x, y: cam.midPoint.y, z: cam.zoom }; this.anim[ti] = true; this.buildTrain({ ...t, cars: t.cars.map(c => ({ ...c, done: true })) }, 0, ti);
    const [hx, hy] = this.trackPt(MAP / 2 + 1, ti); cam.pan(hx, hy - 60, 600, 'Sine.easeInOut'); cam.zoomTo(Math.max(cam.zoom, 1.0), 600); this.hud && this.hud.cutBars(true, `🚂 ${ti + 1}번 기차 왕국으로 출발!`);
    this.time.delayedCall(700, () => { audio.play('sfx_whistle', { volume: 0.8 }); let off = 0; const go = this.time.addEvent({ delay: 16, loop: true, callback: () => { off += 0.004 + off * 0.03; this.buildTrain({ ...t, cars: t.cars.map(c => ({ ...c, done: true })) }, off, ti);
        const lo = this.trainCs[ti] && this.trainCs[ti].loco; if (lo && Math.random() < 0.35) { const pf = this.add.circle(lo.x + 30, lo.y - lo.displayHeight * 0.8, 16, 0xFFFFFF, 0.85).setDepth(2); this.tweens.add({ targets: pf, y: pf.y - 90, x: pf.x + 30, scale: 2.4, alpha: 0, duration: 1100, onComplete: () => pf.destroy() }); }
        if (lo) cam.centerOn(cam.midPoint.x + (lo.x - cam.midPoint.x) * 0.05, cam.midPoint.y + (lo.y - 60 - cam.midPoint.y) * 0.05);
        if (off > 14) { go.remove(); this.trainCs[ti] && this.trainCs[ti].removeAll(true); this.anim[ti] = false; this.hud && this.hud.cutBars(false); cam.pan(prev.x, prev.y, 700, 'Sine.easeInOut'); cam.zoomTo(prev.z, 700); } } }); }); }
  // 도착: 선로 위쪽에서 미끄러져 들어와 멈춤
  arriveAnim(t, ti = 0) { this.anim[ti] = true; let off = -10; const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => { off += Math.max(0.012, -off * 0.06); if (off >= 0) { off = 0; ev.remove(); this.anim[ti] = false; audio.play('sfx_whistle', { volume: 0.5 }); } this.buildTrain(t, off, ti); } }); }
  // ── 입력: 끌면 화면 이동 · 두 손가락 확대 · 짧게 누르면 선택
  down(p) {
    if (this.hud && this.hud.blocking(p)) { this.press = null; return; } this.press = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false, t: Date.now() }; this.pinch = null;
    if (this.mode && this.ghost) { const w = this.cameras.main.getWorldPoint(p.x, p.y), [gx, gy] = grid(w.x, w.y), g = this.ghost, m = 1; this.press.onGhost = gx >= g.gx - m && gx < g.gx + g.sz + m && gy >= g.gy - m && gy < g.gy + g.sz + m; }
    if (this.plantK) { const f = this.fieldAt(p); if (f && !f.crop) { this.press.plant = true; this.hud.plantOne(f, this.plantK); } }
    // 꾹 누르기 (0.5초) → 옮기기 · 돌리기 (타운십처럼 · 창에는 옮기기 버튼을 두지 않음)
    if (!this.mode && !this.press.plant) { const pr = this.press, w = this.cameras.main.getWorldPoint(p.x, p.y), hit = this.hitAt(w.x, w.y);
      if (hit) { this.lpT?.remove(); const ring = this.add.circle(w.x, w.y, 10, 0xFFFFFF, 0.5).setStrokeStyle(6, 0xFFE27A).setDepth(950); this.tweens.add({ targets: ring, radius: 60, duration: 500 }); pr.ring = ring;
        this.lpT = this.time.delayedCall(520, () => { ring.destroy(); if (this.press !== pr || pr.moved || this.mode) return; pr.long = true; audio.play('sfx_tap', { volume: 0.7 }); navigator.vibrate?.(25); this.select(null); this.hud.startMove(hit); }); } } }
  fieldAt(p) { const w = this.cameras.main.getWorldPoint(p.x, p.y), [gx, gy] = grid(w.x, w.y), o = objAt(gx, gy); return o && o.b === 'field' ? o : null; }
  move(p) {
    const a = this.input.pointer1, b = this.input.pointer2;
    if (a.isDown && b.isDown) { const dd = Math.hypot(a.x - b.x, a.y - b.y); if (!this.pinch) this.pinch = { d: dd, z: this.cameras.main.zoom }; else this.zoom(this.pinch.z * dd / this.pinch.d); if (this.press) this.press.moved = true; return; }
    const pr = this.press; if (!pr || !p.isDown) return; if (pr.plant && this.plantK) { const f = this.fieldAt(p); if (f && !f.crop) this.hud.plantOne(f, this.plantK); pr.moved = true; return; }   // 심기 모드: 문지르면 지나간 빈 밭마다 심음
    const dx = p.x - pr.x, dy = p.y - pr.y; if (Math.hypot(dx, dy) > 14) { pr.moved = true; if (pr.ring && pr.ring.active && !pr.long) pr.ring.destroy(); } if (!pr.moved) return;
    if (this.mode && (pr.onGhost || pr.long)) { this.dragAt = { x: p.x, y: p.y }; this.ghostTo(p.x, p.y); return; }   // 건물을 잡고 끌기 (가장자리에 닿으면 지도가 따라 움직임 · update)
    this.dragAt = null;
    const z = this.cameras.main.zoom; this.cameras.main.setScroll(pr.sx - dx / z, pr.sy - dy / z);
  }
  ghostTo(sx, sy) { const w = this.cameras.main.getWorldPoint(sx, sy), [gx, gy] = grid(w.x, w.y + TH * 0.3); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); }
  up(p) { this.dragAt = null; const pr = this.press; this.press = null; this.dragGhost = false; if (pr && pr.ring && pr.ring.active) { this.tweens.killTweensOf(pr.ring); pr.ring.destroy(); } if (!pr || pr.moved || pr.plant || pr.long) return; const w = this.cameras.main.getWorldPoint(p.x, p.y); this.tap(w.x, w.y); }
  // 누른 자리의 물건 (건물 지붕이 뒤 칸을 덮으므로 앞쪽 2칸 건물을 먼저)
  // 그림의 실제로 칠해진 곳을 눌렀는지 (투명한 가장자리는 아님)
  opaque(im, wx, wy) { const pc = im.parentContainer, ox = pc ? pc.x : 0, oy = pc ? pc.y : 0, lx = (wx - ox - im.x) / im.scaleX + im.width * im.originX, ly = (wy - oy - im.y) / im.scaleY + im.height * im.originY; if (lx < 0 || ly < 0 || lx >= im.width || ly >= im.height) return false;
    const fx = im.flipX ? im.width - 1 - lx : lx, a = this.textures.getPixelAlpha(Math.floor(fx), Math.floor(ly), im.texture.key); return a > 40; }
  hitAt(wx, wy) { const [gx, gy] = grid(wx, wy), FLAT = ['field', 'path', 'road', 'fence', 'hedge'];
    // 앞쪽 큰 건물(2칸)의 그림이 뒤 칸을 덮고 있으면 그 건물 (그림 안을 실제로 누른 경우만) · 밭·돌길·도로·울타리 같은 바닥은 절대 앞질러 잡지 않음
    for (let k = 3; k >= 1; k--) for (const [dx, dy] of [[k, k], [k, k - 1], [k - 1, k]]) { const o = objAt(gx + dx, gy + dy); if (!o || FLAT.includes(o.b) || BUILDS[o.b].sz < 2) continue; const c = this.spr[o.id]; if (c && c.im && this.opaque(c.im, wx, wy)) return o; }
    const here = objAt(gx, gy); if (here) return here;
    // 1칸 장식은 그림을 누른 경우 (칸 가운데 74%로 작아져서)
    for (const [dx, dy] of [[1, 1], [1, 0], [0, 1]]) { const o = objAt(gx + dx, gy + dy); if (!o || FLAT.includes(o.b)) continue; const c = this.spr[o.id]; if (c && c.im && this.opaque(c.im, wx, wy)) return o; }
    return null; }
  tap(wx, wy) {
    if (this.mode) { const [gx, gy] = grid(wx, wy); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); return; }
    if (this.plantK) { const [gx, gy] = grid(wx, wy), f0 = objAt(gx, gy), f = f0 && f0.b === 'field' ? f0 : null; if (f && !f.crop) return this.hud.plantOne(f, this.plantK); this.hud.endPlant(); }
    // 기차
    if (this.trainTap(wx, wy)) return;
    if (this.stationXY && Math.hypot(wx - this.stationXY[0], wy - this.stationXY[1]) < 420) { audio.play('sfx_tap'); return this.hud.trainPanel(); }
    // 건물은 그림 위쪽을 눌러도 잡히게: 아래에서 위로 몇 칸 훑어봄
    const [gx, gy] = grid(wx, wy), sp = this.d.dig.spot;
    // 앞쪽 건물의 지붕이 뒤 칸을 덮으므로: 앞으로 2칸까지 건물(밭 제외)을 먼저 찾고, 없으면 누른 칸
    const hit = this.hitAt(wx, wy);
    if (sp && sp[0] === gx && sp[1] === gy) return this.hud.dig();
    if (!hit) { if (!open(gx, gy) && gx >= 0 && gy >= 0 && gx < MAP && gy < MAP) return this.hud.expand(gx, gy); this.select(null); return; }
    this.select(hit); this.hud.objTap(hit);
  }
  select(o) { this.sel = o; this.drawObjs(); }
  tick() { if (this.dead) return; let ch = false; for (const o of this.d.objs) { if (o.b === 'field' && o.crop && !o.ripe && cropReady(o)) { o.ripe = true; ch = true; }  if (BUILDS[o.b].k === 'factory' && tickFactory(o)) ch = true; if (BUILDS[o.b].k === 'animal' && tickAnimal(o)) ch = true; }
    this.tAway = this.tAway || []; if (this.trainCs && this.trainCs.length !== trainCount()) this.drawStation(); for (let ti = 0; ti < trainCount(); ti++) { const t = trainN(ti); if (!t || t.away === this.tAway[ti]) continue; const leaving = t.away && this.tAway[ti] === false, arriving = !t.away && this.tAway[ti] === true; this.tAway[ti] = t.away; if (leaving) this.departCut(t, ti); else if (arriving) { this.drawStation(); this.arriveAnim(t, ti); } else this.drawStation(); }
    /* 자라는 밭은 막대만 고침 (전체를 다시 그리지 않음 · 휴대폰 멈춤 방지) */ if (ch && !this.mode) this.drawObjs(); else this.bars(); save(); this.hud && this.hud.refresh(); }
  // ── 놓기 · 옮기기
  startPlace(b, moving) {
    this.hud && this.hud.endPlant();
    const B = BUILDS[b], cam = this.cameras.main, w = cam.getWorldPoint(W / 2, H / 2), [gx, gy] = grid(w.x, w.y);
    this.ghostFlip = !!(moving && moving.flip); this.mode = moving ? 'move' : 'place';
    this.movingId = moving ? moving.id : null; if (moving && this.spr[moving.id]) this.spr[moving.id].setAlpha(0.3); /* 원래 자리는 흐리게 */ this.placing = { b, moving }; this.ghost = this.add.container(0, 0); this.ghost.sz = B.sz; this.ghost.setDepth(5); this.ghost.dk = 999;
    this.ghostIm = this.add.image(0, 0, b === 'field' ? 'soil' : b === 'mine' ? 'mine_b' : b).setAlpha(0.85); this.ghostG = this.add.graphics(); this.ghost.add([this.ghostG, this.ghostIm]);
    this.layer.add(this.ghost); this.moveGhost(moving ? moving.x : gx - 1, moving ? moving.y : gy - 1);
    this.ghostIm.setInteractive({ draggable: false }); this.input.on('gameobjectdown', (p, go) => { if (go === this.ghostIm) this.dragGhost = true; });
  }
  moveGhost(gx, gy) { const sz = this.ghost.sz; gx = Phaser.Math.Clamp(gx, 0, MAP - sz); gy = Phaser.Math.Clamp(gy, 0, MAP - sz); this.ghost.gx = gx; this.ghost.gy = gy; place(this.ghostIm, gx, gy, sz, 0.08); this.ghostOk = freeRect(gx, gy, sz, this.placing.moving); this.ghostG.clear(); this.diamond(this.ghostG, gx, gy, sz, this.ghostOk ? 0x5AE36A : 0xFF4A4A, 0.4); this.ghostIm.setFlipX(!!this.ghostFlip).setTint(this.ghostOk ? 0xFFFFFF : 0xFF5A5A).setAlpha(this.ghostOk ? 0.95 : 0.6); this.hud && this.hud.placeOk(this.ghostOk); }
  flipGhost() { if (!this.ghostIm) return; this.ghostFlip = !this.ghostFlip; this.ghostIm.setFlipX(this.ghostFlip); this.tweens.add({ targets: this.ghostIm, scaleX: { from: this.ghostIm.scaleX * 0.85, to: this.ghostIm.scaleX }, duration: 160, ease: 'Back.easeOut' }); }
  endPlace() { this.movingId = null; this.ghost?.destroy(); this.ghost = null; this.mode = null; this.placing = null; this.input.off('gameobjectdown'); this.drawObjs(); }
  // 화면 좌표 (말풍선·날아가는 아이콘용)
  screenOf(o) { const B = BUILDS[o.b], [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), cam = this.cameras.main; return [(x - cam.worldView.x) * cam.zoom, (y - cam.worldView.y) * cam.zoom - 40]; }
}
