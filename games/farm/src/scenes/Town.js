// 마을 화면 (쿼터뷰): 땅 · 밭 · 건물 · 기차역 · 강아지 · 끌어서 이동 · 두 손가락/휠 확대 · 누르기 · 건물 놓기
import { W, H } from '../config.js?v=0.40.0';
import { T, C } from '../ui.js?v=0.40.0';
import { audio } from '../audio.js?v=0.40.0';
import { BUILDS, CROPS, MAP, ZONE, RECIPES } from '../data.js?v=0.40.0';
import { load, save, open, objAt, freeRect, cropReady, tickFactory, tickAnimal, digSpot, productOf, train, zooCoins } from '../state.js?v=0.40.0';

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
    this.ground = this.add.container(0, 0); this.layer = this.add.container(0, 0); this.walkLayer = this.add.container(0, 0);   // 주민은 건물을 다시 그려도 지워지지 않게 따로
    this.drawGround(); this.drawObjs(); this.drawStation();
    const cam = this.cameras.main; cam.setBounds(0, 0, WORLD_W, WORLD_H); cam.setZoom(1.05); const [cx, cy] = iso(10, 10); cam.centerOn(cx, cy);
    this.input.addPointer(1);
    this.input.on('pointerdown', p => this.down(p)); this.input.on('pointermove', p => this.move(p)); this.input.on('pointerup', p => this.up(p));
    this.input.on('wheel', (p, o, dx, dy) => this.zoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.scene.launch('Hud'); this.hud = this.scene.get('Hud'); window.__town = this;
    this.walkers = []; this.time.addEvent({ delay: 2500, loop: true, callback: () => this.walk() });
    // 밤낮: 실제 시각에 따라 마을 색 (저녁 노을 · 밤 푸른빛)
    this.sky = this.add.rectangle(W / 2, H / 2, W * 4, H * 4, 0x000000, 0).setScrollFactor(0).setDepth(900); const tint = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; let c = 0x000000, a = 0; if (h >= 17 && h < 19.5) { c = 0xFF8A3C; a = 0.12 * (h - 17) / 2.5; } else if (h >= 19.5 || h < 5) { c = 0x1A2A6C; a = 0.28; } else if (h < 7) { c = 0xFFB070; a = 0.12 * (7 - h) / 2; } this.sky.setFillStyle(c, a); }; tint(); this.time.addEvent({ delay: 60000, loop: true, callback: tint });
    audio.music('bgm_farm');
  }
  // 마을 주민이 길을 걸어 다님 (주민 10명당 1명 · 최대 6명)
  walk() {
    if (this.dead || this.mode) return; const want = Math.min(6, Math.floor(this.d.objs.filter(o => BUILDS[o.b].give).length * 1.5)); this.walkers = this.walkers.filter(w => w.active);
    if (this.walkers.length >= want) return; const pick = () => { for (let k = 0; k < 40; k++) { const x = Math.floor(Math.random() * MAP), y = Math.floor(Math.random() * MAP); if (open(x, y) && !objAt(x, y)) return [x, y]; } return null; };
    const a = pick(), b = pick(); if (!a || !b) return; const [x0, y0] = iso(a[0] + 0.5, a[1] + 0.5), [x1, y1] = iso(b[0] + 0.5, b[1] + 0.5), im = this.add.image(x0, y0, `v${1 + Math.floor(Math.random() * 6)}`).setOrigin(0.5, 0.95);
    im.setScale(TH * 1.15 / im.height).setFlipX(x1 > x0).setAlpha(0); this.walkLayer.add(im); this.walkers.push(im); const dur = Math.hypot(x1 - x0, y1 - y0) * 14;
    this.tweens.add({ targets: im, alpha: 1, duration: 300 }); this.tweens.add({ targets: im, x: x1, y: y1, duration: dur, onComplete: () => this.tweens.add({ targets: im, alpha: 0, duration: 300, onComplete: () => im.destroy() }) });
    this.tweens.add({ targets: im, angle: { from: -4, to: 4 }, duration: 260, yoyo: true, repeat: Math.floor(dur / 520) });
  }
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
    this.layer.removeAll(true); this.spr = {};
    const list = [...this.d.objs].sort((a, b) => (a.x + a.y + BUILDS[a.b].sz) - (b.x + b.y + BUILDS[b.b].sz));
    for (const o of list) this.spr[o.id] = this.drawObj(o);
    const sp = digSpot(); if (sp) { const im = this.add.image(0, 0, 'digspot'); place(im, sp[0], sp[1], 1, 0.12); im.setScale(im.scale * 0.85); this.layer.add(im); this.tweens.add({ targets: im, scale: im.scale * 1.12, duration: 600, yoyo: true, repeat: -1 }); this.digIm = im; }
    if (this.mode && this.ghost) this.layer.add(this.ghost);
  }
  drawObj(o) {
    const B = BUILDS[o.b], c = this.add.container(0, 0); c.o = o;
    if (o.b === 'field') { const ripe = cropReady(o), img = !o.crop ? 'soil' : ripe ? `ripe_${o.crop}` : 'sprouts', im = this.add.image(0, 0, img); place(im, o.x, o.y, 1, img === 'soil' || img === 'sprouts' ? 0.1 : 0.12); c.add(im);
      if (o.crop && !ripe) { const [x, y] = iso(o.x + 0.5, o.y + 0.5), t = Math.max(0, (o.at - Date.now()) / 1000), k = 1 - t / CROPS[o.crop].t, g = this.add.graphics(); g.fillStyle(0x000000, 0.4).fillRoundedRect(x - 40, y - 20, 80, 14, 7).fillStyle(0x8BE36A, 1).fillRoundedRect(x - 40, y - 20, Math.max(8, 80 * k), 14, 7); c.add(g); c.bar = g; } }
    else { const im = this.add.image(0, 0, o.b === 'mine' ? 'mine_b' : o.b); place(im, o.x, o.y, B.sz, 0.08); c.add(im); c.im = im;
      // 다 된 물건 말풍선
      let ready = null; if (B.k === 'factory') { tickFactory(o); if (o.done.length) ready = o.done[0]; } if (B.k === 'animal') { tickAnimal(o); if (o.ready) ready = productOf(o.b); } if (B.k === 'exhibit' && zooCoins(o) >= 20) ready = 'coin';
      const busy = B.k === 'factory' && o.q && o.q.length || B.k === 'animal' && o.s && o.s.some(Boolean);
      const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), top = y - im.displayHeight * 0.62;
      if (ready) { const bb = this.add.container(x, top - 30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillCircle(0, 0, 46).lineStyle(5, 0x5AAE3C, 1).strokeCircle(0, 0, 46).fillTriangle(-14, 38, 14, 38, 0, 62); const pi = this.add.image(0, 0, ready); pi.setScale(66 / Math.max(pi.width, pi.height)); bb.add([g, pi]); c.add(bb); this.tweens.add({ targets: bb, y: top - 44, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      else if (busy) { const z = T(this, x, top - 10, B.k === 'animal' ? '💤' : '⚙️', 40, '#FFFFFF', { w: 900 }); c.add(z); this.tweens.add({ targets: z, angle: B.k === 'animal' ? 0 : 360, alpha: B.k === 'animal' ? 0.5 : 1, duration: B.k === 'animal' ? 900 : 3000, yoyo: B.k === 'animal', repeat: -1 }); } }
    if (this.sel && this.sel.id === o.id && this.mode !== 'move') { const [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), g = this.add.graphics(); this.diamond(g, o.x, o.y, B.sz, 0xFFE27A, 0.35); c.addAt(g, 0); }
    this.layer.add(c); return c;
  }
  diamond(g, gx, gy, sz, col, a) { const p = [iso(gx, gy), iso(gx + sz, gy), iso(gx + sz, gy + sz), iso(gx, gy + sz)]; g.fillStyle(col, a).fillPoints(p.map(([x, y]) => ({ x, y })), true).lineStyle(4, col, 1).strokePoints(p.map(([x, y]) => ({ x, y })), true); }
  // ── 기차역: 지도 오른쪽 끝 (항상 있음 · 레벨 2부터 운행)
  drawStation() {
    this.stationG?.destroy(); const c = this.stationG = this.add.container(0, 0).setDepth(1), [x, y] = iso(MAP + 1.6, 11), st = this.add.image(x - 40, y - 60, 'station'); st.setScale(TW * 2 / st.width); c.add(st);   // 지도 오른쪽 바깥 · 선로는 가장자리를 따라
    const t = train(), away = !t || t.away; this.trainC = this.add.container(x + 60, y + 120); c.add(this.trainC);
    if (!away) { const lo = this.add.image(0, 0, 'loco').setFlipX(true); lo.setScale(TW * 1.3 / lo.width); this.trainC.add(lo); t.cars.forEach((cr, k) => { const w = this.add.image((k + 1) * 150, -(k + 1) * 75, 'wagon').setFlipX(true); w.setScale(TW * 1.15 / w.width); const ic = this.add.image((k + 1) * 150, -(k + 1) * 75 - 70, cr.it); ic.setScale(60 / ic.height); if (cr.done) ic.setAlpha(0.35); this.trainC.add([w, ic]); }); this.trainC.list.reverse(); }
    this.stationXY = [x, y];
  }
  // ── 입력: 끌면 화면 이동 · 두 손가락 확대 · 짧게 누르면 선택
  down(p) { if (this.hud && this.hud.blocking(p)) { this.press = null; return; } this.press = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false, t: Date.now() }; this.pinch = null; }
  move(p) {
    const a = this.input.pointer1, b = this.input.pointer2;
    if (a.isDown && b.isDown) { const dd = Math.hypot(a.x - b.x, a.y - b.y); if (!this.pinch) this.pinch = { d: dd, z: this.cameras.main.zoom }; else this.zoom(this.pinch.z * dd / this.pinch.d); if (this.press) this.press.moved = true; return; }
    const pr = this.press; if (!pr || !p.isDown) return; const dx = p.x - pr.x, dy = p.y - pr.y; if (Math.hypot(dx, dy) > 14) pr.moved = true; if (!pr.moved) return;
    if (this.mode) { const w = this.cameras.main.getWorldPoint(p.x, p.y), [gx, gy] = grid(w.x, w.y); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); return; }
    const z = this.cameras.main.zoom; this.cameras.main.setScroll(pr.sx - dx / z, pr.sy - dy / z);
  }
  up(p) { const pr = this.press; this.press = null; this.dragGhost = false; if (!pr || pr.moved) return; const w = this.cameras.main.getWorldPoint(p.x, p.y); this.tap(w.x, w.y); }
  tap(wx, wy) {
    if (this.mode) { const [gx, gy] = grid(wx, wy); this.moveGhost(gx - Math.floor(this.ghost.sz / 2), gy - Math.floor(this.ghost.sz / 2)); return; }
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
    const B = BUILDS[b], cam = this.cameras.main, w = cam.getWorldPoint(W / 2, H / 2), [gx, gy] = grid(w.x, w.y);
    this.mode = moving ? 'move' : 'place'; this.placing = { b, moving }; this.ghost = this.add.container(0, 0); this.ghost.sz = B.sz; this.ghost.setDepth(5);
    this.ghostIm = this.add.image(0, 0, b === 'field' ? 'soil' : b === 'mine' ? 'mine_b' : b).setAlpha(0.85); this.ghostG = this.add.graphics(); this.ghost.add([this.ghostG, this.ghostIm]);
    this.layer.add(this.ghost); this.moveGhost(moving ? moving.x : gx - 1, moving ? moving.y : gy - 1);
    this.ghostIm.setInteractive({ draggable: false }); this.input.on('gameobjectdown', (p, go) => { if (go === this.ghostIm) this.dragGhost = true; });
  }
  moveGhost(gx, gy) { const sz = this.ghost.sz; gx = Phaser.Math.Clamp(gx, 0, MAP - sz); gy = Phaser.Math.Clamp(gy, 0, MAP - sz); this.ghost.gx = gx; this.ghost.gy = gy; place(this.ghostIm, gx, gy, sz, 0.08); this.ghostOk = freeRect(gx, gy, sz, this.placing.moving); this.ghostG.clear(); this.diamond(this.ghostG, gx, gy, sz, this.ghostOk ? 0x5AE36A : 0xFF4A4A, 0.4); this.ghostIm.setTint(this.ghostOk ? 0xFFFFFF : 0xFF5A5A).setAlpha(this.ghostOk ? 0.95 : 0.6); this.hud && this.hud.placeOk(this.ghostOk); }
  endPlace() { this.ghost?.destroy(); this.ghost = null; this.mode = null; this.placing = null; this.input.off('gameobjectdown'); this.drawObjs(); }
  // 화면 좌표 (말풍선·날아가는 아이콘용)
  screenOf(o) { const B = BUILDS[o.b], [x, y] = iso(o.x + B.sz / 2, o.y + B.sz / 2), cam = this.cameras.main; return [(x - cam.worldView.x) * cam.zoom, (y - cam.worldView.y) * cam.zoom - 40]; }
}
