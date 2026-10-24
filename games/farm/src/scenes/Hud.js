// 화면 고정 UI: 위 막대 · 버튼 · 건물/밭 창 · 주문 게시판 · 기차 · 헛간 · 건설 · 땅 넓히기 · 퀘스트 · 대화
import { W, H } from '../config.js?v=0.37.0';
import { T, C, btn, popup, toast } from '../ui.js?v=0.37.0';
import { audio } from '../audio.js?v=0.37.0';
import { ITEMS, CROPS, RECIPES, BUILDS, XP_NEED, BARN, CHARS, ZONE, MAP } from '../data.js?v=0.37.0';
import { load, save, barnCap, barnUsed, has, add, canFit, gainXp, give, pop, popCap, countOf, canBuild, cropReady, tickFactory, queueJob, tickAnimal, feedAll, productOf, fillOrders, doOrder, dropOrder, train, loadCar, quest, questDone, questProg, claimQuest, progress, rent, payRent, digUp, zoneOf, zoneNext, zoneCost, rewardText } from '../state.js?v=0.37.0';

const fmtT = s => s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${Math.floor(s % 60)}초` : `${Math.ceil(s)}초`;
const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };

export class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.d = load(); this.town = this.scene.get('Town'); this.zones = [];
    // 위 막대
    const g = this.add.graphics(); g.fillStyle(0x3E2A14, 0.88).fillRoundedRect(16, 18, W - 32, 112, 30);
    this.lvBadge = this.add.circle(80, 74, 44, 0x4E9BE8).setStrokeStyle(5, 0xFFFFFF); this.lvT = T(this, 80, 72, '', 34, '#FFFFFF', { w: 900 });
    this.xpBar = this.add.graphics();
    const pill = (x, k) => { icon(this, x, 74, k, 50); return T(this, x + 34, 74, '', 30, '#FFFFFF', { ox: 0, w: 900 }); };
    this.coinT = pill(310, 'coin'); this.gemT = pill(510, 'gem'); this.toolT = pill(680, 'tools'); this.popT = pill(850, 'pop');
    this.zone(0, 0, W, 140);
    // 오른쪽 버튼 · 아래 막대
    this.sideBtns = [['quest', '📜', '퀘스트', () => this.questPanel()], ['orders', 'orderboard', '주문', () => this.ordersPanel()], ['train', 'loco', '기차', () => this.trainPanel()], ['rent', 'pachulo', '월세', () => this.rentPanel()]].map(([id, ic, n, fn], k) => this.side(W - 80, 230 + k * 160, ic, n, fn));
    const by = H - 120, bg = this.add.graphics(); bg.fillStyle(0x3E2A14, 0.88).fillRoundedRect(16, by - 76, W - 32, 160, 40); this.zone(0, by - 80, W, 200);
    [['🏗', '건설', () => this.buildPanel()], ['barn', '헛간', () => this.barnPanel()], ['🔨', '땅', () => toast(this, '숲(넓히기 팻말)을 눌러 땅을 넓혀요', H / 2)], ['⚙', '설정', () => this.settings()]].forEach(([ic, n, fn], k) => this.bottom(150 + k * 260, by, ic, n, fn));
    this.qBanner = this.add.container(W / 2, 200); this.zone(W / 2 - 300, 160, 600, 80, () => this.questPanel());
    this.placeBar = null; this.refresh(); window.__hud = this;
    this.time.delayedCall(700, () => this.storyCheck());
  }
  zone(x, y, w, h, fn) { this.zones.push({ x, y, w, h }); if (fn) this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive().on('pointerup', fn); }
  blocking(p) { if (this.children.list.some(o => o.depth >= 1000)) return true; return this.zones.some(z => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h); }
  side(x, y, ic, n, fn) { const c = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFF6E0, 1).fillCircle(0, 0, 60).lineStyle(5, 0x8A5A2B, 1).strokeCircle(0, 0, 60); c.add(g); c.add(ic.length <= 2 ? T(this, 0, -4, ic, 52, '#000', { w: 900 }) : icon(this, 0, -4, ic, 92));
    const lg = this.add.graphics(); lg.fillStyle(0x8A5A2B, 1).fillRoundedRect(-54, 44, 108, 38, 19); c.add([lg, T(this, 0, 63, n, 22, '#FFFFFF', { w: 900 })]); c.badge = T(this, 44, -46, '', 24, '#FFFFFF', { w: 900 }); c.bg = this.add.circle(44, -46, 20, 0xE8352E).setVisible(false); c.add([c.bg, c.badge]);
    c.setSize(130, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.town.mode) return; audio.play('sfx_tap', { volume: 0.6 }); fn(); }); this.zone(x - 65, y - 75, 130, 160); return c; }
  bottom(x, y, ic, n, fn) { const c = this.add.container(x, y); c.add(ic.length <= 2 ? T(this, 0, -18, ic, 56, '#000', { w: 900 }) : icon(this, 0, -18, ic, 90)); c.add(T(this, 0, 46, n, 24, '#FFFFFF', { w: 900 }));
    c.setSize(220, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.town.mode) return; audio.play('sfx_tap', { volume: 0.6 }); fn(); }); return c; }
  refresh() {
    const d = this.d; this.lvT.setText(String(d.lv)); this.coinT.setText(String(d.coins)); this.gemT.setText(String(d.gems)); this.toolT.setText(String(d.tools)); this.popT.setText(`${pop()}/${popCap()}`);
    this.xpBar.clear().fillStyle(0x1E1206, 1).fillRoundedRect(130, 100, 150, 16, 8).fillStyle(0x6FD0FF, 1).fillRoundedRect(130, 100, Math.max(16, 150 * d.xp / XP_NEED(d.lv)), 16, 8);
    fillOrders(); const t = train(), q = quest(), r = rent();
    const badge = (c, v) => { c.bg.setVisible(!!v); c.badge.setText(v ? String(v) : ''); };
    badge(this.sideBtns[0], q && questDone() ? '!' : 0); badge(this.sideBtns[1], d.orders.filter(o => o.at <= Date.now() && Object.entries(o.items).every(([k, n]) => has(k, n))).length);
    badge(this.sideBtns[2], t && !t.away ? t.cars.filter(c => !c.done && has(c.it, c.n)).length : 0); badge(this.sideBtns[3], !r.paid && d.coins >= r.goal ? '!' : 0);
    this.sideBtns[2].setAlpha(t ? 1 : 0.45);
    this.qBanner.removeAll(true); if (q) { const g = this.add.graphics(), done = questDone(); g.fillStyle(done ? 0x5AAE3C : 0xFFF6E0, 0.96).fillRoundedRect(-300, -36, 600, 72, 36).lineStyle(4, 0x8A5A2B, 1).strokeRoundedRect(-300, -36, 600, 72, 36); this.qBanner.add([g, T(this, 0, 0, `📜 ${q.n}  ${done ? '완료! 눌러서 받기' : questProg()}`, 26, done ? '#FFFFFF' : '#3E2A14', { w: 900 })]); }
  }
  fly(from, key, label) { const to = key === 'coin' ? [345, 74] : key === 'xp' ? [80, 74] : key === 'gem' ? [545, 74] : key === 'tools' ? [715, 74] : [300, H - 120];
    for (let k = 0; k < 4; k++) { const im = icon(this, from[0], from[1], key, 64).setDepth(900); this.tweens.add({ targets: im, x: to[0], y: to[1], scale: im.scale * 0.6, duration: 500 + k * 70, delay: k * 50, ease: 'Cubic.easeIn', onComplete: () => im.destroy() }); }
    if (label) { const t = T(this, from[0], from[1] - 50, label, 34, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 8).setDepth(901); this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, duration: 1100, delay: 200, onComplete: () => t.destroy() }); } }
  levelUps(ups) { if (!ups || !ups.length) return; const u = ups[ups.length - 1]; audio.play('sfx_levelup', { volume: 0.8 }); audio.duck(2400); const p = popup(this, 800, 620, { depth: 1200, onClose: () => this.storyCheck() }); p.content.add(T(this, 0, -220, `레벨 ${u.lv}!`, 70, '#4E9BE8', { w: 900 })); p.content.add(T(this, 0, -120, rewardText(u), 32, C.ink, { w: 900 }));
    const nb = Object.entries(BUILDS).filter(([k, B]) => B.lv === u.lv).map(([k, B]) => B.n), nc = Object.entries(CROPS).filter(([k, c]) => c.lv === u.lv).map(([k]) => ITEMS[k].n), nr = Object.entries(RECIPES).filter(([k, R]) => R.lv === u.lv).map(([k]) => ITEMS[k].n);
    const nw = [...nb, ...nc, ...nr]; if (nw.length) p.content.add(T(this, 0, -20, `새로 열림: ${nw.join(' · ')}`, 26, C.brown, { w: 800, wrap: 700 }));
    p.content.add(btn(this, 0, 190, 360, 100, '좋아요!', () => p.close(), { size: 32 })); this.refresh(); this.storyCheck(); }
  // ── 누른 것 처리
  objTap(o) {
    const B = BUILDS[o.b];
    if (B.k === 'field') { if (o.crop && cropReady(o)) return this.harvest(o); if (o.crop) return toast(this, `${ITEMS[o.crop].n} · ${fmtT((o.at - Date.now()) / 1000)} 남음`, H * 0.7); return this.plantPanel(o); }
    if (B.k === 'factory') { tickFactory(o); if (o.done.length) return this.collect(o); return this.factoryPanel(o); }
    if (B.k === 'animal') { tickAnimal(o); if (o.ready) return this.collect(o); return this.animalPanel(o); }
    this.infoPanel(o);
  }
  // 밭: 다 익은 같은 작물을 한 번에 거둠 (1개 심어 2개)
  harvest(o) {
    const list = this.d.objs.filter(f => f.b === 'field' && f.crop === o.crop && cropReady(f)); let n = 0, xp = 0;
    for (const f of list) { if (!canFit(2)) { toast(this, '헛간이 꽉 찼어요 · 헛간을 넓히거나 팔아요', H / 2); break; } add(f.crop, 2); n += 2; xp += CROPS[f.crop].xp; f.crop = null; f.ripe = false; }
    if (!n) return; this.d.stats.harvest += n; progress('harvest', n); const ups = gainXp(xp); save(); audio.play('sfx_harvest', { volume: 0.7 }); audio.buzz(12);
    this.fly(this.town.screenOf(o), o.crop || list[0].crop || 'wheat', `+${n}`); this.town.drawObjs(); this.refresh(); this.levelUps(ups); this.fly(this.town.screenOf(o), 'xp');
  }
  plantPanel(o) {
    const crops = Object.entries(CROPS).filter(([k, c]) => c.lv <= this.d.lv), empty = this.d.objs.filter(f => f.b === 'field' && !f.crop), p = popup(this, 980, 500 + Math.ceil(crops.length / 4) * 230);
    p.content.add(T(this, 0, -170 - Math.ceil(crops.length / 4) * 115, '무엇을 심을까요?', 42, C.ink, { w: 900 })); p.content.add(T(this, 0, -115 - Math.ceil(crops.length / 4) * 115, `작물 1개를 심으면 2개 · 빈 밭 ${empty.length}칸에 한 번에 심어요`, 22, C.dim, { w: 900 }));
    crops.forEach(([k, c], i) => { const x = -345 + (i % 4) * 230, y = -40 - Math.ceil(crops.length / 4) * 115 + 150 + Math.floor(i / 4) * 230, cc = this.add.container(x, y), g = this.add.graphics(), n = this.d.items[k] || 0;
      g.fillStyle(n ? 0xFFF6E0 : 0xEEE6DC, 1).fillRoundedRect(-100, -100, 200, 200, 26).lineStyle(3, 0xC9A27A, 1).strokeRoundedRect(-100, -100, 200, 200, 26); cc.add([g, icon(this, 0, -24, k, 100), T(this, 0, 50, `${ITEMS[k].n} ${n}개`, 22, n ? C.ink : C.dim, { w: 900 }), T(this, 0, 80, fmtT(c.t), 18, C.dim, { w: 800 })]);
      cc.setSize(200, 200).setInteractive({ useHandCursor: true }).on('pointerup', () => { let m = 0; for (const f of [o, ...empty.filter(f => f !== o)]) { if (!has(k)) break; if (f.crop) continue; add(k, -1); f.crop = k; f.at = Date.now() + c.t * 1000; f.ripe = false; m++; } if (!m) return toast(this, `${ITEMS[k].n}이(가) 없어요 · 주문하거나 사 와요`); save(); audio.play('sfx_plant', { volume: 0.7 }); p.close(); this.town.drawObjs(); toast(this, `${ITEMS[k].n} ${m}칸 심었어요`, H * 0.72); }); p.content.add(cc); });
  }
  collect(o) { const B = BUILDS[o.b]; let it, n = 0;
    if (B.k === 'factory') { while (o.done.length && canFit(1)) { it = o.done.shift(); add(it, 1); n++; progress('make', { it, n: 1 }); } }
    else { it = productOf(o.b); while (o.ready && canFit(1)) { o.ready--; add(it, 1); n++; } progress('make', { it, n }); }
    if (!n) return toast(this, '헛간이 꽉 찼어요', H / 2); const ups = gainXp(RECIPES[it].xp * n); save(); audio.play(o.b === 'cowbarn' ? 'sfx_moo' : o.b === 'coop' ? 'sfx_cluck' : 'sfx_coin', { volume: 0.6 }); this.fly(this.town.screenOf(o), it, `+${n}`); this.town.drawObjs(); this.refresh(); this.levelUps(ups); }
  factoryPanel(o) {
    const B = BUILDS[o.b], rec = Object.entries(RECIPES).filter(([k, R]) => R.b === o.b), p = popup(this, 1000, 560 + rec.length * 170); tickFactory(o);
    const top = -(280 + rec.length * 85); p.content.add(T(this, 0, top + 40, B.n, 44, C.ink, { w: 900 }));
    // 생산 줄
    const slots = B.slots + (o.extra || 0); for (let i = 0; i < slots; i++) { const x = -340 + i * 140, y = top + 140, j = o.q[i], g = this.add.graphics(); g.fillStyle(i === 0 && j ? 0xFFE9A8 : 0xF3EADF, 1).fillRoundedRect(x - 60, y - 60, 120, 120, 20); p.content.add(g); if (j) { p.content.add(icon(this, x, y - 6, j.it, 80)); if (i === 0) p.content.add(T(this, x, y + 52, fmtT((j.end - Date.now()) / 1000), 18, C.brown, { w: 900 })); } }
    p.content.add(btn(this, 380, top + 140, 150, 80, `+칸 💎${6 + (o.extra || 0) * 6}`, () => { const c = 6 + (o.extra || 0) * 6; if (this.d.gems < c || (o.extra || 0) >= 3) return toast(this, (o.extra || 0) >= 3 ? '더 늘릴 수 없어요' : '보석이 부족해요'); this.d.gems -= c; o.extra = (o.extra || 0) + 1; save(); p.close(); this.factoryPanel(o); }, { size: 20, style: 'cream' }));
    rec.forEach(([k, R], i) => { const y = top + 290 + i * 170, lock = (R.lv || 1) > this.d.lv, g = this.add.graphics(), ok = !lock && Object.entries(R.in).every(([a, n]) => has(a, n)); g.fillStyle(lock ? 0xEEE6DC : 0xFFFFFF, 1).fillRoundedRect(-460, y - 74, 920, 148, 26).lineStyle(3, ok ? 0x5AAE3C : 0xE3D3C2, 1).strokeRoundedRect(-460, y - 74, 920, 148, 26); p.content.add(g);
      p.content.add(icon(this, -390, y, k, 110)); p.content.add(T(this, -320, y - 36, ITEMS[k].n, 30, lock ? C.dim : C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -320, y + 2, lock ? `레벨 ${R.lv}에 열려요` : `${fmtT(R.t)} · ⭐${R.xp}`, 20, C.dim, { ox: 0, w: 800 }));
      Object.entries(R.in).forEach(([a, n], j) => { const x = -110 + j * 120, hv = this.d.items[a] || 0; p.content.add(icon(this, x, y - 8, a, 64)); p.content.add(T(this, x, y + 44, `${hv}/${n}`, 20, hv >= n ? C.green : C.red, { w: 900 })); });
      if (!lock) p.content.add(btn(this, 360, y, 170, 90, '만들기', () => { const e = queueJob(o, k); if (e) return toast(this, e); save(); audio.play('sfx_gen', { volume: 0.6 }); p.close(); this.factoryPanel(o); this.town.drawObjs(); this.refresh(); }, { size: 26, style: ok ? 'green' : 'cream' })); });
    p.content.add(btn(this, -160, -top - 50, 280, 84, '옮기기', () => { p.close(); this.startMove(o); }, { size: 24, style: 'cream' })); p.content.add(btn(this, 160, -top - 50, 280, 84, '닫기', () => p.close(), { size: 26, style: 'cream' }));
  }
  animalPanel(o) {
    const B = BUILDS[o.b], it = productOf(o.b), R = RECIPES[it], feed = Object.keys(R.in)[0], p = popup(this, 900, 760); tickAnimal(o);
    p.content.add(T(this, 0, -310, B.n, 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -250, `${B.animal} 3마리 · ${ITEMS[feed].n} 1개 → ${ITEMS[it].n} 1개 (${fmtT(R.t)})`, 24, C.dim, { w: 900 }));
    o.s.forEach((e, i) => { const x = (i - 1) * 250, y = -60, g = this.add.graphics(); g.fillStyle(e ? 0xFFE9A8 : 0xF3EADF, 1).fillRoundedRect(x - 105, y - 105, 210, 210, 30); p.content.add(g); p.content.add(T(this, x, y - 30, { cowbarn: '🐄', coop: '🐔', sheeppen: '🐑' }[o.b], 80, '#000', { w: 900 })); p.content.add(T(this, x, y + 60, e ? fmtT((e - Date.now()) / 1000) : '배고파요', 22, e ? C.brown : C.red, { w: 900 })); });
    p.content.add(T(this, 0, 110, `${ITEMS[feed].n} ${this.d.items[feed] || 0}개 있음`, 26, C.ink, { w: 900 }));
    p.content.add(btn(this, -180, 230, 330, 100, '모두 먹이 주기', () => { const n = feedAll(o); if (!n) return toast(this, has(feed) ? '모두 배불러요' : `${ITEMS[feed].n}이 없어요 · 사료 공장에서 만들어요`); save(); audio.play(o.b === 'cowbarn' ? 'sfx_moo' : 'sfx_cluck', { volume: 0.6 }); p.close(); this.town.drawObjs(); }, { size: 26, style: 'green' }));
    p.content.add(btn(this, 180, 230, 280, 100, '옮기기', () => { p.close(); this.startMove(o); }, { size: 26, style: 'cream' }));
  }
  infoPanel(o) { const B = BUILDS[o.b], p = popup(this, 800, 560); p.content.add(T(this, 0, -200, B.n, 44, C.ink, { w: 900 })); p.content.add(icon(this, 0, -60, o.b, 200)); p.content.add(T(this, 0, 80, B.give ? `주민 ${B.give}명이 살아요` : B.cap ? `인구 상한 +${B.cap}` : '', 26, C.dim, { w: 900 }));
    p.content.add(btn(this, 0, 190, 300, 96, '옮기기', () => { p.close(); this.startMove(o); }, { size: 28, style: 'cream' })); }
  // ── 건설
  buildPanel() {
    const list = Object.entries(BUILDS), p = popup(this, 1020, 1640), top = -760; p.content.add(T(this, 0, top + 30, '건설', 46, C.ink, { w: 900 }));
    list.forEach(([k, B], i) => { const x = -340 + (i % 3) * 340, y = top + 210 + Math.floor(i / 3) * 290, why = canBuild(k), cc = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(why ? 0xEEE6DC : 0xFFFBF2, 1).fillRoundedRect(-155, -130, 310, 260, 26).lineStyle(3, why ? 0xD8C8B8 : 0x5AAE3C, 1).strokeRoundedRect(-155, -130, 310, 260, 26);
      cc.add([g, icon(this, 0, -46, k === 'field' ? 'soil' : k, 150), T(this, 0, 52, B.n, 24, C.ink, { w: 900 }), T(this, 0, 86, why || `🪙${B.cost}${B.give ? ` · 주민 +${B.give}` : B.cap ? ` · 상한 +${B.cap}` : ''}`, 18, why ? C.red : C.brown, { w: 800, wrap: 290 })]); if (why) cc.list[1].setAlpha(0.5);
      cc.setSize(310, 260).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (why) return toast(this, why); p.close(); this.startBuild(k); }); p.content.add(cc); });
  }
  startBuild(k) { this.town.startPlace(k, null); this.placeUi(k); }
  startMove(o) { this.town.startPlace(o.b, o); this.placeUi(o.b, o); }
  placeUi(k, moving) {
    this.placeBar?.destroy(); const c = this.placeBar = this.add.container(W / 2, H - 330).setDepth(500), g = this.add.graphics(); g.fillStyle(0x3E2A14, 0.9).fillRoundedRect(-420, -80, 840, 160, 40); c.add(g);
    c.add(T(this, -380, -40, moving ? '끌어서 옮겨요' : `${BUILDS[k].n} · 끌어서 자리를 골라요`, 26, '#FFFFFF', { ox: 0, w: 900 }));
    this.okB = btn(this, 230, 20, 200, 90, '✓ 확인', () => this.placeOk2(k, moving), { size: 30, style: 'green' }); c.add(this.okB); c.add(btn(this, -200, 20, 200, 90, '✗ 취소', () => { this.town.endPlace(); c.destroy(); this.placeBar = null; }, { size: 28, style: 'cream' }));
    this.zones.push(this.pz = { x: W / 2 - 420, y: H - 410, w: 840, h: 160 });
  }
  placeOk(ok) { if (this.okB) this.okB.setAlpha(ok ? 1 : 0.5); }
  placeOk2(k, moving) {
    const t = this.town; if (!t.ghostOk) return toast(this, '여기엔 놓을 수 없어요', H / 2); const gx = t.ghost.gx, gy = t.ghost.gy;
    if (moving) { moving.x = gx; moving.y = gy; }
    else { const why = canBuild(k); if (why) return toast(this, why); const B = BUILDS[k]; this.d.coins -= B.cost; const o = { id: ++this.d.seq, b: k, x: gx, y: gy }; if (B.k === 'factory') { o.q = []; o.done = []; } if (B.k === 'animal') { o.s = [0, 0, 0]; o.ready = 0; } if (k === 'field') o.crop = null; this.d.objs.push(o); progress('build', k); gainXp(B.k === 'field' ? 1 : 5); audio.play('sfx_build', { volume: 0.7 }); }
    save(); t.endPlace(); this.placeBar.destroy(); this.placeBar = null; this.zones = this.zones.filter(z => z !== this.pz); this.refresh();
    if (!moving && k === 'field' && canBuild('field') === null) this.startBuild('field');   // 밭은 이어서 여러 칸
  }
  // ── 주문 게시판
  ordersPanel() {
    fillOrders(); const p = popup(this, 1020, 1500), top = -700; p.content.add(T(this, 0, top + 30, '주문 게시판', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 84, '마을 사람들의 부탁 · 매달 7·14·21·28일엔 브룩의 큰 주문', 22, C.dim, { w: 900 }));
    this.d.orders.forEach((o, i) => { const x = -245 + (i % 2) * 490, y = top + 300 + Math.floor(i / 2) * 420, cc = this.add.container(x, y), g = this.add.graphics(), wait = o.at > Date.now(), ok = !wait && Object.entries(o.items).every(([k, n]) => has(k, n));
      g.fillStyle(o.brook ? 0xFFF1C9 : 0xFFFBF2, 1).fillRoundedRect(-225, -195, 450, 390, 30).lineStyle(o.brook ? 6 : 3, o.brook ? 0xF0B65A : ok ? 0x5AAE3C : 0xD8C8B8, 1).strokeRoundedRect(-225, -195, 450, 390, 30); cc.add(g);
      if (wait) { cc.add(T(this, 0, -20, '새 주문을 기다려요', 26, C.dim, { w: 900 })); cc.add(T(this, 0, 30, fmtT((o.at - Date.now()) / 1000), 24, C.brown, { w: 900 })); p.content.add(cc); return; }
      const f = this.add.image(-160, -130, o.face); f.setScale(110 / f.height); f.setCrop(0, 0, f.width, f.height * 0.75); cc.add(f); cc.add(T(this, -90, -150, CHARS[o.face] + (o.brook ? ' ★' : ''), 24, C.ink, { ox: 0, w: 900 }));
      Object.entries(o.items).forEach(([k, n], j, arr) => { const ix = (j - (arr.length - 1) / 2) * 130; cc.add(icon(this, ix, -20, k, 90)); const hv = this.d.items[k] || 0; cc.add(T(this, ix, 44, `${hv}/${n}`, 22, hv >= n ? C.green : C.red, { w: 900 })); });
      cc.add(T(this, 0, 100, `🪙${o.coins}  ⭐${o.xp}${o.tools ? `  🔨${o.tools}` : ''}`, 26, C.brown, { w: 900 }));
      cc.add(btn(this, 60, 160, 260, 70, '보내기', () => { const r = doOrder(i); if (!r) return toast(this, '물건이 모자라요'); save(); audio.play('sfx_order', { volume: 0.7 }); audio.buzz([20, 40, 20]); p.close(); this.fly([W / 2, H / 2], 'coin', `+${r.o.coins}`); this.refresh(); this.levelUps(r.ups); this.ordersPanel(); }, { size: 24, style: ok ? 'green' : 'cream' }));
      cc.add(btn(this, -160, 160, 90, 70, '🗑', () => { dropOrder(i); save(); p.close(); this.ordersPanel(); }, { size: 24, style: 'cream' })); p.content.add(cc); });
  }
  // ── 기차
  trainPanel() {
    const t = train(); if (!t) return toast(this, '기차는 레벨 2에 다니기 시작해요', H / 2);
    const p = popup(this, 1000, 900); p.content.add(T(this, 0, -380, '왕국 기차', 46, C.ink, { w: 900 }));
    if (t.away) { p.content.add(icon(this, 0, -150, 'loco', 260)); p.content.add(T(this, 0, 50, '성에 물건을 배달하는 중이에요', 30, C.ink, { w: 900 })); p.content.add(T(this, 0, 110, `돌아오기까지 ${fmtT((t.back - Date.now()) / 1000)}`, 28, C.brown, { w: 900 })); p.content.add(btn(this, 0, 300, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' })); return; }
    p.content.add(T(this, 0, -320, '칸마다 물건을 실어요 · 다 채우면 성으로 떠나요', 24, C.dim, { w: 900 }));
    t.cars.forEach((c, k) => { const x = (k - 1) * 310, y = -60, g = this.add.graphics(), hv = this.d.items[c.it] || 0, ok = !c.done && hv >= c.n; g.fillStyle(c.done ? 0xE3F5DA : 0xFFFBF2, 1).fillRoundedRect(x - 140, y - 190, 280, 380, 28).lineStyle(3, ok ? 0x5AAE3C : 0xD8C8B8, 1).strokeRoundedRect(x - 140, y - 190, 280, 380, 28); p.content.add(g);
      p.content.add(icon(this, x, y - 100, c.it, 110)); p.content.add(T(this, x, y - 20, `${ITEMS[c.it].n} ${c.n}개`, 24, C.ink, { w: 900 })); p.content.add(T(this, x, y + 16, c.done ? '실음 ✓' : `${hv}/${c.n}`, 22, c.done ? C.green : hv >= c.n ? C.green : C.red, { w: 900 })); p.content.add(T(this, x, y + 64, rewardText(c.r), 22, C.brown, { w: 800, wrap: 260 }));
      if (!c.done) p.content.add(btn(this, x, y + 140, 220, 80, '싣기', () => { const r = loadCar(k); if (!r) return toast(this, '물건이 모자라요'); save(); audio.play(r.left ? 'sfx_whistle' : 'sfx_drop', { volume: 0.7 }); p.close(); this.refresh(); this.levelUps(r.ups); this.town.drawStation(); if (!r.left) this.trainPanel(); else toast(this, '기차가 성으로 출발했어요! 🚂', H / 2); }, { size: 26, style: ok ? 'green' : 'cream' })); });
    p.content.add(btn(this, 0, 330, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' }));
  }
  // ── 헛간
  barnPanel() {
    const its = Object.entries(this.d.items).filter(([, n]) => n > 0), hh = Math.max(700, 420 + Math.ceil(its.length / 5) * 200), p = popup(this, 1000, hh), top = -hh / 2 + 50, cost = BARN.toolCost(this.d.barnLv);
    p.content.add(T(this, 0, top + 30, '헛간', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 86, `${barnUsed()} / ${barnCap()} · 눌러서 한 개씩 팔아요`, 24, C.dim, { w: 900 }));
    const g0 = this.add.graphics(); g0.fillStyle(0xEEE6DC, 1).fillRoundedRect(-400, top + 112, 800, 22, 11).fillStyle(barnUsed() / barnCap() > 0.9 ? 0xE8352E : 0x5AAE3C, 1).fillRoundedRect(-400, top + 112, Math.max(22, 800 * Math.min(1, barnUsed() / barnCap())), 22, 11); p.content.add(g0);
    its.forEach(([k, n], i) => { const x = -380 + (i % 5) * 190, y = top + 250 + Math.floor(i / 5) * 200, cc = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFFBF2, 1).fillRoundedRect(-85, -85, 170, 170, 22); cc.add([g, icon(this, 0, -14, k, 100), T(this, 0, 58, `${n}`, 26, C.ink, { w: 900 })]);
      cc.setSize(170, 170).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!has(k)) return; add(k, -1); this.d.coins += ITEMS[k].v; save(); audio.play('sfx_coin', { volume: 0.5 }); cc.list[2].setText(`${this.d.items[k] || 0}`); this.refresh(); }); p.content.add(cc); });
    p.content.add(btn(this, 0, -top - 70, 520, 100, `헛간 넓히기 +${BARN.step} (🔨${cost})`, () => { if (this.d.tools < cost) return toast(this, '공구가 부족해요 · 기차 · 주문 · 강아지에서 얻어요'); this.d.tools -= cost; this.d.barnLv++; save(); audio.play('sfx_build'); p.close(); this.barnPanel(); this.refresh(); }, { size: 28, style: 'gold' }));
  }
  // ── 땅 넓히기
  expand(gx, gy) {
    const z = zoneOf(gx, gy); if (!zoneNext(z)) return toast(this, '열린 땅 옆부터 넓힐 수 있어요', H / 2);
    const c = zoneCost(), p = popup(this, 800, 600); p.content.add(T(this, 0, -210, '숲을 정리할까요?', 42, C.ink, { w: 900 })); p.content.add(icon(this, 0, -70, 'forest', 200)); p.content.add(T(this, 0, 70, `🪙${c.coins}  🔨${c.tools}`, 36, C.brown, { w: 900 })); p.content.add(T(this, 0, 120, `가진 것 🪙${this.d.coins}  🔨${this.d.tools}`, 22, C.dim, { w: 900 }));
    p.content.add(btn(this, 0, 220, 360, 100, '정리하기', () => { if (this.d.coins < c.coins || this.d.tools < c.tools) return toast(this, '코인이나 공구가 부족해요'); this.d.coins -= c.coins; this.d.tools -= c.tools; this.d.zones.push(z); progress('zone', 1); const ups = gainXp(10); save(); audio.play('sfx_build', { volume: 0.8 }); p.close(); this.town.drawGround(); this.town.drawObjs(); this.refresh(); this.levelUps(ups); }, { size: 32, style: 'green' }));
  }
  dig() { const r = digUp(); if (!r) return; save(); audio.play('sfx_box', { volume: 0.7 }); const t = this.town; this.fly([W / 2, H / 2], r.coins ? 'coin' : r.gems ? 'gem' : r.tools ? 'tools' : 'wheat', `🐶 ${rewardText(r)}`); t.drawObjs(); this.refresh(); }
  // ── 퀘스트 · 이야기
  questPanel() {
    const q = quest(); if (!q) return toast(this, '1장의 이야기를 모두 끝냈어요! 2장은 곧 열려요', H / 2);
    const p = popup(this, 900, 760), done = questDone(); p.content.add(T(this, 0, -300, '퀘스트', 44, C.ink, { w: 900 }));
    const f = this.add.image(-300, -120, q.talk[0].face); f.setScale(220 / f.height); p.content.add(f);
    p.content.add(T(this, -160, -170, q.n, 36, C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -160, -110, done ? '완료!' : `진행 ${questProg()}`, 28, done ? C.green : C.brown, { ox: 0, w: 900 })); p.content.add(T(this, -160, -50, `보상 ${rewardText(q.reward)}`, 26, C.dim, { ox: 0, w: 800 }));
    p.content.add(btn(this, -190, 230, 300, 100, '대화 보기', () => { p.close(); this.talk(q.talk); }, { size: 28, style: 'cream' }));
    p.content.add(btn(this, 190, 230, 300, 100, done ? '보상 받기' : '닫기', () => { p.close(); if (!done) return; const r = claimQuest(); save(); audio.play('sfx_levelup', { volume: 0.7 }); this.fly([W / 2, H / 2], 'coin', rewardText(r.q.reward)); this.refresh(); this.levelUps(r.ups); this.storyCheck(); }, { size: 28, style: done ? 'green' : 'cream' }));
  }
  storyCheck() { if (this.children.list.some(o => o.depth >= 1000)) return this.time.delayedCall(700, () => this.storyCheck()); const q = quest(); if (q && this.d.talked !== this.d.quest) { this.d.talked = this.d.quest; save(); this.talk(q.talk); } }
  talk(lines) {
    const root = this.add.container(0, 0).setDepth(1100), dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35).setInteractive(); root.add(dim); let i = -1;
    const face = this.add.image(W / 2 - 250, H - 380, lines[0].face).setOrigin(0.5, 1), box = this.add.graphics(), name = T(this, 120, H - 400, '', 32, '#FFFFFF', { ox: 0, w: 900 }), line = T(this, 90, H - 330, '', 34, C.ink, { ox: 0, oy: 0, w: 800, wrap: W - 180, align: 'left' });
    box.fillStyle(0xFFFBF2, 0.98).fillRoundedRect(40, H - 420, W - 80, 340, 36).lineStyle(5, 0x8A5A2B, 1).strokeRoundedRect(40, H - 420, W - 80, 340, 36); const tag = this.add.graphics(); root.add([face, box, tag, name, line]);
    const next = () => { i++; if (i >= lines.length) { root.destroy(); return; } const L = lines[i]; face.setTexture(L.face); face.setScale(620 / face.height); face.setX(L.face === 'princess' || L.face === 'princess_shock' ? W / 2 - 230 : W / 2 + 230); tag.clear().fillStyle(0x8A5A2B, 1).fillRoundedRect(80, H - 452, 60 + L.who.length * 34, 64, 32); name.setText(L.who).setY(H - 420); line.setText(L.t); audio.play('sfx_blip', { volume: 0.3 }); };
    dim.on('pointerup', next); next();
  }
  // ── 월세 (이달의 목표)
  rentPanel() { const r = rent(), p = popup(this, 860, 760); p.content.add(T(this, 0, -300, '이번 주 월세', 44, C.ink, { w: 900 })); const f = this.add.image(0, -150, 'pachulo'); f.setScale(220 / f.height); p.content.add(f);
    p.content.add(T(this, 0, 20, r.paid ? '이번 주 월세는 냈어요 ✓' : `파출로: "🪙${r.goal}, 이번 주 안에 부탁하오!"`, 28, r.paid ? C.green : C.ink, { w: 800, wrap: 760 })); p.content.add(T(this, 0, 80, '내면 💎8 · 🔨2 보너스 · 못 내도 쫓겨나진 않아요', 22, C.dim, { w: 800 }));
    if (!r.paid) p.content.add(btn(this, 0, 220, 360, 100, `🪙${r.goal} 내기`, () => { const ups = payRent(); if (!ups) return toast(this, '코인이 모자라요'); save(); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.refresh(); this.levelUps(ups); toast(this, '월세 완료! 보너스를 받았어요', H / 2); }, { size: 32, style: this.d.coins >= r.goal ? 'green' : 'cream' })); }
  settings() { const p = popup(this, 760, 600); p.content.add(T(this, 0, -220, '설정', 44, C.ink, { w: 900 }));
    p.content.add(btn(this, 0, -80, 420, 96, load().music === false ? '배경음 켜기' : '배경음 끄기', () => { audio.toggleMusic(); p.close(); }, { size: 28, style: 'cream' }));
    p.content.add(btn(this, 0, 40, 420, 96, load().sfx === false ? '효과음 켜기' : '효과음 끄기', () => { audio.toggleSfx(); p.close(); }, { size: 28, style: 'cream' })); p.content.add(btn(this, 0, 180, 300, 90, '닫기', () => p.close(), { size: 28, style: 'cream' })); }
  onBack() { if (this.placeBar) { this.town.endPlace(); this.placeBar.destroy(); this.placeBar = null; return true; } return false; }
}
