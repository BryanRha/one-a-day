// 화면 고정 UI: 위 막대 · 버튼 · 건물/밭 창 · 주문 게시판 · 기차 · 헛간 · 건설 · 땅 넓히기 · 퀘스트 · 대화
import { W, H } from '../config.js?v=0.44.0';
import { T, C, btn, popup, toast } from '../ui.js?v=0.44.0';
import { audio } from '../audio.js?v=0.44.0';
import { ITEMS, CROPS, RECIPES, BUILDS, XP_NEED, BARN, CHARS, ZONE, MAP, MINIS, seedCost, VOYAGES } from '../data.js?v=0.44.0';
import { onOrder, onTrainCar, onHarvest, login, loginClaim, LOGIN, fest, raceState, album, voyage, voyageSend, voyageBack } from '../events.js?v=0.44.0';
import { trainN, trainCount, upgradeFactory, plane, loadCrate, PLANE_BONUS, zooCoins, zooCollect, matCount, payCost, missing, gemFill, matDrop, lastMats, newSite, finishSite, relic, relicClaim, market, marketBuy, speedCost, speedField, speedFactory, lab, rl, labStart, labSpeed, bonusCrop } from '../state.js?v=0.44.0';
import { RESEARCH, RES_MAX, resCost, resTime } from '../data.js?v=0.44.0';
import { taskCheck, coopBadge } from '../coop.js?v=0.44.0';
import { RELICS, RELIC_N, siteNeed } from '../data.js?v=0.44.0';
import { FUP, TRAINS } from '../data.js?v=0.44.0';
import { load, save, costOf, cropTime, joy, joyBonus, miniLeft, barnCap, barnUsed, has, add, canFit, gainXp, give, pop, popCap, countOf, canBuild, cropReady, tickFactory, queueJob, tickAnimal, feedAll, productOf, fillOrders, doOrder, dropOrder, train, loadCar, quest, questDone, questProg, claimQuest, progress, rent, payRent, digUp, zoneOf, zoneNext, zoneCost, rewardText } from '../state.js?v=0.44.0';

const fmtT = s => s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${Math.floor(s % 60)}초` : `${Math.ceil(s)}초`;
const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };

export class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.d = load(); this.town = this.scene.get('Town'); this.zones = []; this.town.plantK = null;
    // 위 막대
    const g = this.add.graphics(); g.fillStyle(0x3E2A14, 0.88).fillRoundedRect(16, 18, W - 32, 112, 30);
    this.lvBadge = this.add.circle(80, 74, 44, 0x4E9BE8).setStrokeStyle(5, 0xFFFFFF); this.lvT = T(this, 80, 72, '', 34, '#FFFFFF', { w: 900 });
    this.xpBar = this.add.graphics();
    const pill = (x, k) => { icon(this, x, 74, k, 50); return T(this, x + 34, 74, '', 30, '#FFFFFF', { ox: 0, w: 900 }); };
    this.coinT = pill(310, 'coin'); this.gemT = pill(510, 'gem'); this.toolT = pill(680, 'tools'); this.popT = pill(850, 'pop');
    this.zone(0, 0, W, 140); this.zone(640, 20, 180, 110, () => this.matsPanel());
    // 오른쪽 버튼 · 아래 막대
    this.sideBtns = [['quest', '📜', '퀘스트', () => this.questPanel()], ['orders', 'orderboard', '주문', () => this.ordersPanel()], ['train', 'loco', '기차', () => this.trainPanel()], ['rent', 'pachulo', '월세', () => this.rentPanel()], ['people', 'heart', '사람들', () => this.go('People')], ['mini', 'sparrow', '놀이', () => this.miniPanel()], ['events', 'ticket', '이벤트', () => this.go('Events')], ['coop', 'trophy', '협동', () => this.go('Coop')]].map(([id, ic, n, fn], k) => this.side(W - 80, 230 + k * 160, ic, n, fn));
    const by = H - 120, bg = this.add.graphics(); bg.fillStyle(0x3E2A14, 0.88).fillRoundedRect(16, by - 76, W - 32, 160, 40); this.zone(0, by - 80, W, 200);
    [['🏗', '건설', () => this.buildPanel()], ['barn', '헛간', () => this.barnPanel()], ['🔨', '땅', () => toast(this, '숲(넓히기 팻말)을 눌러 땅을 넓혀요', H / 2)], ['⚙', '설정', () => this.settings()]].forEach(([ic, n, fn], k) => this.bottom(150 + k * 260, by, ic, n, fn));
    this.qBanner = this.add.container(W / 2, 200); this.zone(W / 2 - 300, 160, 600, 80, () => this.questPanel());
    this.placeBar = null; this.refresh(); window.__hud = this;
    this.time.delayedCall(700, () => this.storyCheck());
    { const l = login(); if (this.d.quest >= 3 && !l.got && l.shown !== l.last) { l.shown = l.last; save(); this.time.delayedCall(1400, () => this.go('Events', { tab: 'login' })); } }   // 하루 첫 방문에만 출석 화면
  }
  zone(x, y, w, h, fn) { this.zones.push({ x, y, w, h }); if (fn) this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive().on('pointerup', fn); }
  blocking(p) { if (this.children.list.some(o => o.depth >= 1000)) return true; return this.zones.some(z => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h); }
  side(x, y, ic, n, fn) { const c = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFF6E0, 1).fillCircle(0, 0, 60).lineStyle(5, 0x8A5A2B, 1).strokeCircle(0, 0, 60); c.add(g); c.add(ic.length <= 2 ? T(this, 0, -4, ic, 52, '#000', { w: 900 }) : icon(this, 0, -4, ic, 92));
    const lg = this.add.graphics(); lg.fillStyle(0x8A5A2B, 1).fillRoundedRect(-54, 44, 108, 38, 19); c.add([lg, T(this, 0, 63, n, 22, '#FFFFFF', { w: 900 })]); c.badge = T(this, 44, -46, '', 24, '#FFFFFF', { w: 900 }); c.bg = this.add.circle(44, -46, 20, 0xE8352E).setVisible(false); c.add([c.bg, c.badge]);
    c.setSize(130, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.town.mode) return; audio.play('sfx_tap', { volume: 0.6 }); fn(); }); this.zone(x - 65, y - 75, 130, 160); return c; }
  bottom(x, y, ic, n, fn) { const c = this.add.container(x, y); c.add(ic.length <= 2 ? T(this, 0, -18, ic, 56, '#000', { w: 900 }) : icon(this, 0, -18, ic, 90)); c.add(T(this, 0, 46, n, 24, '#FFFFFF', { w: 900 }));
    c.setSize(220, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.town.mode) return; audio.play('sfx_tap', { volume: 0.6 }); fn(); }); return c; }
  refresh() {
    const d = this.d; this.lvT.setText(String(d.lv)); this.coinT.setText(String(d.coins)); this.gemT.setText(String(d.gems)); this.toolT.setText(String(matCount())); this.popT.setText(`${pop()}/${popCap()}`);
    this.xpBar.clear().fillStyle(0x1E1206, 1).fillRoundedRect(130, 100, 150, 16, 8).fillStyle(0x6FD0FF, 1).fillRoundedRect(130, 100, Math.max(16, 150 * d.xp / XP_NEED(d.lv)), 16, 8);
    { const L = lab(); if (L.done) { const R0 = RESEARCH.find(x => x.k === L.done); L.done = null; save(); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `🔬 연구 완료! ${R0.n} ${rl(R0.k)}단계 · ${R0.d(rl(R0.k))}`, H / 2); } }
    { const tc = taskCheck(); if (tc) { save(); if (tc.ok) { audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `⛵ 레가타 과제 완료! ⭐${tc.t.pts}점`, H / 2); } else toast(this, '레가타 과제 시간이 지났어요', H / 2); } }
    fillOrders(); const t = train(), q = quest(), r = rent();
    const badge = (c, v) => { c.bg.setVisible(!!v); c.badge.setText(v ? String(v) : ''); };
    badge(this.sideBtns[0], q && questDone() ? '!' : 0); badge(this.sideBtns[1], d.orders.filter(o => o.at <= Date.now() && Object.entries(o.items).every(([k, n]) => has(k, n))).length);
    badge(this.sideBtns[2], [0, 1, 2].reduce((n, i) => { const tt = trainN(i); return n + (tt && !tt.away ? tt.cars.filter(c => !c.done && has(c.it, c.n)).length : 0); }, 0)); badge(this.sideBtns[3], !r.paid && d.coins >= r.goal ? '!' : 0);
    this.sideBtns[2].setAlpha(t ? 1 : 0.45);
    { const rs = raceState(), a = album(); badge(this.sideBtns[7], coopBadge()); badge(this.sideBtns[6], (!login().got ? 1 : 0) + (a.packs || 0) + (rs && rs.ended && !rs.claimed ? 1 : 0)); }
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
    if (o.site) return this.sitePanel(o);
    if (B.k === 'field') { if (o.crop && cropReady(o)) return this.harvest(o); if (o.crop) return this.growPanel(o); return this.plantPanel(o); }
    if (B.k === 'market') return this.marketPanel(); if (B.k === 'museum') return this.museumPanel();
    if (B.lab) return this.researchPanel(o);
    if (B.k === 'factory') { tickFactory(o); if (o.done.length) return this.collect(o); return this.factoryPanel(o); }
    if (B.k === 'animal') { tickAnimal(o); if (o.ready) return this.collect(o); return this.animalPanel(o); }
    if (B.k === 'mine') return this.go('Mine'); if (B.k === 'wedding') return this.go('People'); if (B.k === 'event') return this.go('Events'); if (B.k === 'harbor') return this.harborPanel(); if (B.k === 'airport') return this.planePanel();
    if (B.k === 'exhibit') { const c = zooCollect(o); if (!countOf('zoogate')) return toast(this, '동물원 입구를 지어야 손님이 와요', H / 2); if (!c) return toast(this, '아직 손님이 적어요 · 시간이 지나면 코인이 쌓여요', H / 2); save(); audio.play('sfx_coin'); this.fly(this.town.screenOf(o), 'coin', `+${c}`); this.town.drawObjs(); return this.refresh(); }
    if (B.k === 'zoo') { const ex = this.d.objs.filter(x => BUILDS[x.b].k === 'exhibit'); let c = 0; for (const x of ex) c += zooCollect(x); save(); if (c) { audio.play('sfx_coin'); this.fly(this.town.screenOf(o), 'coin', `+${c}`); this.town.drawObjs(); this.refresh(); } return toast(this, ex.length ? `동물 ${ex.length}종 · 손님 코인 ${c ? `+${c}` : '없음'} (최대 8시간 쌓여요)` : '판다 · 기린 · 펭귄 · 코끼리 우리를 지어 동물원을 채워요', H / 2); }
    this.infoPanel(o);
  }
  // 심기 모드 (타운십처럼): 고른 작물로 누르거나 문지른 빈 밭에 한 칸씩 · '그만' 이나 다른 곳을 누르면 끝
  plantOne(f, k) { if (!f || f.b !== 'field' || f.crop) return false; const cost = seedCost(k); if (this.d.coins < cost) { toast(this, `코인이 부족해요 · 씨앗 값 🪙${cost}`, H * 0.72); this.endPlant(); return false; }
    this.d.coins -= cost; f.crop = k; f.at = Date.now() + cropTime(k) * 1000; f.ripe = false; save(); audio.play('sfx_plant', { volume: 0.55 }); this.town.drawObjs(); this.refresh(); if (this.plantBar) { if (!this.d.objs.some(x => x.b === 'field' && !x.crop)) this.endPlant(); else this.plantBarT.setText(this.plantText(k)); } return true; }
  plantText(k) { const n = this.d.objs.filter(f => f.b === 'field' && !f.crop).length, c = seedCost(k); return `🌱 ${ITEMS[k].n} 심는 중 · 빈 밭 ${n}칸${c ? ` · 한 칸 🪙${c}` : ' · 무료'}  ·  아래에서 작물을 바꿀 수 있어요`; }
  // 심기 막대: 작물 줄(눌러서 바꾸기) · 빈 밭을 누르거나 문지르면 고른 작물이 그 칸에 심김
  startPlant(k) { this.endPlant(); if (!this.d.objs.some(f => f.b === 'field' && !f.crop)) return; this.town.plantK = k;
    const crops = Object.keys(CROPS).filter(c => CROPS[c].lv <= this.d.lv), per = 7, rows = Math.ceil(crops.length / per), bh = 120 + rows * 150, y = H - 210 - bh / 2, c = this.plantBar = this.add.container(W / 2, y), g = this.add.graphics();
    g.fillStyle(0x3E2A14, 0.94).fillRoundedRect(-500, -bh / 2, 1000, bh, 40); c.add(g);
    this.plantBarT = T(this, -90, -bh / 2 + 48, this.plantText(k), 24, '#FFFFFF', { w: 900, wrap: 780 }); c.add(this.plantBarT); c.add(btn(this, 400, -bh / 2 + 48, 160, 72, '그만', () => this.endPlant(), { size: 26, style: 'cream' }));
    this.seedBtns = crops.map((ck, i) => { const x = -390 + (i % per) * 130, yy = -bh / 2 + 160 + Math.floor(i / per) * 150, b = this.add.container(x, yy), bg = this.add.graphics(), cost = seedCost(ck);
      b.add([bg, icon(this, 0, -14, ck, 84), T(this, 0, 50, cost ? `🪙${cost}` : '무료', 20, '#FFE27A', { w: 900 })]); b.bg = bg; b.k = ck;
      b.setSize(120, 140).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.town.plantK = ck; audio.play('sfx_tap', { volume: 0.6 }); this.plantBarT.setText(this.plantText(ck)); this.seedHi(); }); c.add(b); return b; });
    this.seedHi(); this.plantZone = { x: W / 2 - 500, y: y - bh / 2, w: 1000, h: bh }; this.zones.push(this.plantZone); }
  seedHi() { for (const b of this.seedBtns || []) { const on = b.k === this.town.plantK; b.bg.clear().fillStyle(on ? 0xFFE27A : 0xFFF6E0, on ? 1 : 0.9).fillRoundedRect(-60, -70, 120, 140, 22); if (on) b.bg.lineStyle(6, 0x5AAE3C, 1).strokeRoundedRect(-60, -70, 120, 140, 22); b.list[2].setColor(on ? '#3E2A14' : '#8A5A2B'); } }
  endPlant() { this.town.plantK = null; if (this.plantBar) { this.plantBar.destroy(); this.plantBar = null; this.zones = this.zones.filter(z => z !== this.plantZone); } }
  // 밭: 다 익은 같은 작물을 한 번에 거둠 (1개 심어 2개)
  harvest(o) {
    const list = this.d.objs.filter(f => f.b === 'field' && f.crop === o.crop && cropReady(f)); let n = 0, xp = 0;
    for (const f of list) { if (!canFit(2)) { toast(this, '헛간이 꽉 찼어요 · 헛간을 넓히거나 팔아요', H / 2); break; } { const b2 = bonusCrop() ? 1 : 0; add(f.crop, 2 + b2); n += 2 + b2; } xp += CROPS[f.crop].xp; f.crop = null; f.ripe = false; }
    if (!n) return; this.d.stats.harvest += n; progress('harvest', n); onHarvest(n); const ups = gainXp(xp), md = matDrop(n / 2); save();
    if (md) this.time.delayedCall(450, () => this.fly(this.town.screenOf(o), md, `+1 ${ITEMS[md].n}`)); audio.play('sfx_harvest', { volume: 0.7 }); audio.buzz(12);
    this.fly(this.town.screenOf(o), o.crop || list[0].crop || 'wheat', `+${n}`); this.town.drawObjs(); this.refresh(); this.levelUps(ups); this.fly(this.town.screenOf(o), 'xp');
  }
  plantPanel(o) {
    const crops = Object.entries(CROPS).filter(([k, c]) => c.lv <= this.d.lv), empty = this.d.objs.filter(f => f.b === 'field' && !f.crop), rows = Math.ceil(crops.length / 4), p = popup(this, 980, 500 + rows * 230);
    p.content.add(T(this, 0, -170 - rows * 115, '무엇을 심을까요?', 42, C.ink, { w: 900 })); p.content.add(T(this, 0, -115 - rows * 115, `씨앗 값을 내고 심어요 · 수확하면 2개 · 고른 뒤 다른 빈 밭을 누르거나 문질러 더 심어요`, 22, C.dim, { w: 900 }));
    crops.forEach(([k, c], i) => { const x = -345 + (i % 4) * 230, y = -40 - rows * 115 + 150 + Math.floor(i / 4) * 230, cc = this.add.container(x, y), g = this.add.graphics(), cost = seedCost(k), ok = this.d.coins >= cost;
      g.fillStyle(ok ? 0xFFF6E0 : 0xEEE6DC, 1).fillRoundedRect(-100, -100, 200, 200, 26).lineStyle(3, 0xC9A27A, 1).strokeRoundedRect(-100, -100, 200, 200, 26);
      cc.add([g, icon(this, 0, -30, k, 96), T(this, 0, 40, ITEMS[k].n, 22, C.ink, { w: 900 }), T(this, 0, 68, cost ? `🪙${cost} · ${fmtT(c.t)}` : `무료 · ${fmtT(c.t)}`, 18, ok ? C.brown : C.red, { w: 800 })]);
      cc.setSize(200, 200).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.d.coins < cost) return toast(this, `코인이 부족해요 · 씨앗 값 🪙${cost}`); p.close(); this.plantOne(o, k); this.startPlant(k); }); p.content.add(cc); });
  }
  collect(o) { const B = BUILDS[o.b]; let it, n = 0;
    if (B.k === 'factory') { while (o.done.length && canFit(1)) { it = o.done.shift(); add(it, 1); n++; progress('make', { it, n: 1 }); } }
    else { it = productOf(o.b); while (o.ready && canFit(1)) { o.ready--; add(it, 1); n++; } progress('make', { it, n }); }
    if (!n) return toast(this, '헛간이 꽉 찼어요', H / 2); const ups = gainXp(RECIPES[it].xp * n); save(); audio.play(o.b === 'cowbarn' ? 'sfx_moo' : o.b === 'coop' ? 'sfx_cluck' : 'sfx_coin', { volume: 0.6 }); this.fly(this.town.screenOf(o), it, `+${n}`); this.town.drawObjs(); this.refresh(); this.levelUps(ups); }
  factoryPanel(o) {
    const B = BUILDS[o.b], rec = Object.entries(RECIPES).filter(([k, R]) => R.b === o.b), p = popup(this, 1000, 620 + rec.length * 170); tickFactory(o);
    const top = -(310 + rec.length * 85); p.content.add(T(this, 0, top + 40, B.n, 44, C.ink, { w: 900 }));
    // 생산 줄
    const slots = B.slots + (o.extra || 0); for (let i = 0; i < slots; i++) { const x = -410 + i * 118, y = top + 190, j = o.q[i], g = this.add.graphics(); g.fillStyle(i === 0 && j ? 0xFFE9A8 : 0xF3EADF, 1).fillRoundedRect(x - 54, y - 54, 108, 108, 18); p.content.add(g); if (j) { p.content.add(icon(this, x, y - 6, j.it, 72)); if (i === 0) p.content.add(T(this, x, y + 46, fmtT((j.end - Date.now()) / 1000), 17, C.brown, { w: 900 })); } }
    // 오른쪽: 칸 늘리기 · 보석으로 바로 (생산 칸이 늘어나도 겹치지 않게 세로로 따로)
    if (o.q.length) { const c = speedCost((o.q[0].end - Date.now()) / 1000); p.content.add(btn(this, 330, top + 232, 250, 76, `💎${c} 바로 완료`, () => { const e = speedFactory(o); if (e) return toast(this, e); save(); audio.play('sfx_gen', { volume: 0.7 }); p.close(); this.town.drawObjs(); this.refresh(); this.factoryPanel(o); }, { size: 22, style: 'gold' })); }
    if ((o.extra || 0) < 3) p.content.add(btn(this, 330, top + 148, 250, 76, `+칸 늘리기 💎${6 + (o.extra || 0) * 6}`, () => { const c = 6 + (o.extra || 0) * 6; if (this.d.gems < c) return toast(this, '보석이 부족해요'); this.d.gems -= c; o.extra = (o.extra || 0) + 1; save(); audio.play('sfx_build', { volume: 0.6 }); p.close(); this.refresh(); this.factoryPanel(o); }, { size: 20, style: 'cream' })); else p.content.add(T(this, 330, top + 148, `생산 칸 ${slots}칸 (최대)`, 20, C.dim, { w: 900 }));
    rec.forEach(([k, R], i) => { const y = top + 350 + i * 170, lock = (R.lv || 1) > this.d.lv, g = this.add.graphics(), ok = !lock && Object.entries(R.in).every(([a, n]) => has(a, n)); g.fillStyle(lock ? 0xEEE6DC : 0xFFFFFF, 1).fillRoundedRect(-460, y - 74, 920, 148, 26).lineStyle(3, ok ? 0x5AAE3C : 0xE3D3C2, 1).strokeRoundedRect(-460, y - 74, 920, 148, 26); p.content.add(g);
      p.content.add(icon(this, -390, y, k, 110)); p.content.add(T(this, -320, y - 36, ITEMS[k].n, 30, lock ? C.dim : C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -320, y + 2, lock ? `레벨 ${R.lv}에 열려요` : `${fmtT(R.t)} · ⭐${R.xp}`, 20, C.dim, { ox: 0, w: 800 }));
      Object.entries(R.in).forEach(([a, n], j) => { const x = -110 + j * 120, hv = this.d.items[a] || 0; p.content.add(icon(this, x, y - 8, a, 64)); p.content.add(T(this, x, y + 44, `${hv}/${n}`, 20, hv >= n ? C.green : C.red, { w: 900 })); });
      if (!lock) p.content.add(btn(this, 360, y, 170, 90, '만들기', () => { const e = queueJob(o, k); if (e) return toast(this, e); save(); audio.play('sfx_gen', { volume: 0.6 }); p.close(); this.factoryPanel(o); this.town.drawObjs(); this.refresh(); }, { size: 26, style: ok ? 'green' : 'cream' })); });
    const ul = o.up || 0, uc = ul < FUP.max ? FUP.cost(o.b, ul) : null; p.content.add(T(this, 0, top + 92, `업그레이드 ${ul}/${FUP.max}단계 · 만드는 시간 -${ul * 15}%`, 24, C.gold, { w: 900 }));
    p.content.add(btn(this, -320, -top - 50, 260, 84, '옮기기', () => { p.close(); this.startMove(o); }, { size: 24, style: 'cream' })); p.content.add(btn(this, 0, -top - 50, 330, 84, uc ? `⬆ 업그레이드` : '최고 단계', () => { if (!uc) return; p.close(); this.costPanel(`${BUILDS[o.b].n} 업그레이드`, `만드는 시간 -${(ul + 1) * 15}%`, uc, g => upgradeFactory(o, g), () => this.factoryPanel(o)); }, { size: 26, style: uc ? 'gold' : 'cream' })); p.content.add(btn(this, 320, -top - 50, 220, 84, '닫기', () => p.close(), { size: 26, style: 'cream' }));
  }
  animalPanel(o) {
    const B = BUILDS[o.b], it = productOf(o.b), R = RECIPES[it], feed = Object.keys(R.in)[0], p = popup(this, 900, 760); tickAnimal(o);
    p.content.add(T(this, 0, -310, B.n, 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -250, `${B.animal} 3마리 · ${ITEMS[feed].n} 1개 → ${ITEMS[it].n} 1개 (${fmtT(R.t)})`, 24, C.dim, { w: 900 }));
    o.s.forEach((e, i) => { const x = (i - 1) * 250, y = -60, g = this.add.graphics(); g.fillStyle(e ? 0xFFE9A8 : 0xF3EADF, 1).fillRoundedRect(x - 105, y - 105, 210, 210, 30); p.content.add(g); p.content.add(T(this, x, y - 30, { cowbarn: '🐄', coop: '🐔', sheeppen: '🐑', pigpen: '🐖', beehive: '🐝' }[o.b], 80, '#000', { w: 900 })); p.content.add(T(this, x, y + 60, e ? fmtT((e - Date.now()) / 1000) : '배고파요', 22, e ? C.brown : C.red, { w: 900 })); });
    p.content.add(T(this, 0, 110, `${ITEMS[feed].n} ${this.d.items[feed] || 0}개 있음`, 26, C.ink, { w: 900 }));
    p.content.add(btn(this, -180, 230, 330, 100, '모두 먹이 주기', () => { const n = feedAll(o); if (!n) return toast(this, has(feed) ? '모두 배불러요' : `${ITEMS[feed].n}이 없어요 · 사료 공장에서 만들어요`); save(); audio.play(o.b === 'cowbarn' ? 'sfx_moo' : 'sfx_cluck', { volume: 0.6 }); p.close(); this.town.drawObjs(); }, { size: 26, style: 'green' }));
    p.content.add(btn(this, 180, 230, 280, 100, '옮기기', () => { p.close(); this.startMove(o); }, { size: 26, style: 'cream' }));
  }
  infoPanel(o) { const B = BUILDS[o.b], p = popup(this, 800, 560); p.content.add(T(this, 0, -200, B.n, 44, C.ink, { w: 900 })); p.content.add(icon(this, 0, -60, o.b, 200)); p.content.add(T(this, 0, 80, B.give ? `주민 ${B.give}명이 살아요` : B.cap ? `인구 상한 +${B.cap}` : '', 26, C.dim, { w: 900 }));
    p.content.add(btn(this, 0, 190, 300, 96, '옮기기', () => { p.close(); this.startMove(o); }, { size: 28, style: 'cream' })); }
  // ── 건설
  buildPanel(tab = 'make', page = 0) {
    const TABS = [['make', '생산'], ['town', '마을'], ['deco', '장식']], kinds = { make: ['field', 'factory', 'animal', 'mine', 'harbor', 'airport'], town: ['house', 'public', 'museum', 'market', 'wedding', 'event', 'zoo', 'exhibit'], deco: ['deco'] };
    const all = Object.entries(BUILDS).filter(([k, B]) => kinds[tab].includes(B.k)).sort((a, b) => a[1].lv - b[1].lv), per = 12, pages = Math.ceil(all.length / per), list = all.slice(page * per, page * per + per);
    const p = popup(this, 1020, 1640), top = -760; p.content.add(T(this, 0, top + 30, '건설', 46, C.ink, { w: 900 }));
    TABS.forEach(([t, n], k) => p.content.add(btn(this, (k - 1) * 300, top + 110, 270, 80, n, () => { if (t !== tab) { p.close(); this.buildPanel(t, 0); } }, { size: 28, style: t === tab ? 'gold' : 'cream' })));
    if (tab === 'deco') p.content.add(T(this, 0, top + 170, `매력 ${joy()} · 주문 코인 +${Math.round(joyBonus() * 100)}%`, 24, '#E8507A', { w: 900 }));
    list.forEach(([k, B], i) => { const x = -340 + (i % 3) * 340, y = top + 330 + Math.floor(i / 3) * 290, why = canBuild(k), cc = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(why ? 0xEEE6DC : 0xFFFBF2, 1).fillRoundedRect(-155, -130, 310, 260, 26).lineStyle(3, why ? 0xD8C8B8 : 0x5AAE3C, 1).strokeRoundedRect(-155, -130, 310, 260, 26);
      cc.add([g, icon(this, 0, -46, k === 'field' ? 'soil' : k === 'mine' ? 'mine_b' : k, 150), T(this, 0, 52, B.n, 24, C.ink, { w: 900 }), T(this, 0, 86, why || `🪙${costOf(k)}${B.give ? ` · 주민 +${B.give}` : B.cap ? ` · 상한 +${B.cap}` : B.joy ? ` · 매력 +${B.joy}` : ''}${siteNeed(k) ? ' · 🧱자재' : ''}`, 18, why ? C.red : C.brown, { w: 800, wrap: 290 })]); if (why) cc.list[1].setAlpha(0.5);
      cc.setSize(310, 260).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (why) return toast(this, why); p.close(); this.startBuild(k); }); p.content.add(cc); });
    if (pages > 1) { p.content.add(btn(this, -200, 720, 200, 80, '◀', () => { if (page > 0) { p.close(); this.buildPanel(tab, page - 1); } }, { size: 30, style: 'cream' })); p.content.add(T(this, 0, 720, `${page + 1} / ${pages}`, 28, C.ink, { w: 900 })); p.content.add(btn(this, 200, 720, 200, 80, '▶', () => { if (page < pages - 1) { p.close(); this.buildPanel(tab, page + 1); } }, { size: 30, style: 'cream' })); }
  }
  go(key, data) { this.scene.stop(); this.town.scene.start(key, data); }
  miniPanel() { const p = popup(this, 900, 900); p.content.add(T(this, 0, -370, '마을 놀이', 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -310, `오늘 ${miniLeft()}번 남음 · 30초 동안 많이 누를수록 보상이 커요`, 24, C.dim, { w: 900 }));
    Object.entries(MINIS).forEach(([k, M], i) => { const y = -170 + i * 200, g = this.add.graphics(); g.fillStyle(0xFFF6E0, 1).fillRoundedRect(-400, y - 85, 800, 170, 30); p.content.add(g); const f = this.add.image(-320, y, M.who); f.setScale(150 / f.height); p.content.add(f);
      p.content.add(T(this, -220, y - 30, `${M.n} · ${CHARS[M.who]}`, 32, C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -220, y + 22, M.d, 20, C.dim, { ox: 0, w: 800, wrap: 400, align: 'left' }));
      p.content.add(btn(this, 300, y, 160, 90, '하기', () => { if (miniLeft() <= 0) return toast(this, '오늘은 다 했어요'); p.close(); this.go('Mini', { k }); }, { size: 28, style: 'gold' })); });
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
    else { const why = canBuild(k); if (why) return toast(this, why); const B = BUILDS[k]; this.d.coins -= costOf(k); const o = { id: ++this.d.seq, b: k, x: gx, y: gy }; o.site = newSite(k); if (o.site) this.time.delayedCall(300, () => toast(this, '🏗 공사장이 생겼어요 · 눌러서 벽돌·유리·석판을 채우면 완성!', H / 2)); if (B.k === 'factory') { o.q = []; o.done = []; } if (B.k === 'animal') { o.s = [0, 0, 0]; o.ready = 0; } if (k === 'field') o.crop = null; this.d.objs.push(o); progress('build', k); gainXp(B.k === 'field' ? 1 : 5); audio.play('sfx_build', { volume: 0.7 }); }
    save(); t.endPlace(); this.placeBar.destroy(); this.placeBar = null; this.zones = this.zones.filter(z => z !== this.pz); this.refresh();
    if (!moving && (k === 'field' || BUILDS[k].k === 'deco') && canBuild(k) === null) this.startBuild(k);   // 밭 · 장식은 이어서 여러 개   // 밭은 이어서 여러 칸
  }
  // ── 주문 게시판
  ordersPanel() {
    fillOrders(); const p = popup(this, 1020, 1500), top = -700; p.content.add(T(this, 0, top + 30, '주문 게시판', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 84, '마을 사람들의 부탁 · 매달 7·14·21·28일엔 브룩의 큰 주문', 22, C.dim, { w: 900 }));
    this.d.orders.forEach((o, i) => { const x = -245 + (i % 2) * 490, y = top + 300 + Math.floor(i / 2) * 420, cc = this.add.container(x, y), g = this.add.graphics(), wait = o.at > Date.now(), ok = !wait && Object.entries(o.items).every(([k, n]) => has(k, n));
      g.fillStyle(o.brook ? 0xFFF1C9 : 0xFFFBF2, 1).fillRoundedRect(-225, -195, 450, 390, 30).lineStyle(o.brook ? 6 : 3, o.brook ? 0xF0B65A : ok ? 0x5AAE3C : 0xD8C8B8, 1).strokeRoundedRect(-225, -195, 450, 390, 30); cc.add(g);
      if (wait) { cc.add(T(this, 0, -20, '새 주문을 기다려요', 26, C.dim, { w: 900 })); cc.add(T(this, 0, 30, fmtT((o.at - Date.now()) / 1000), 24, C.brown, { w: 900 })); p.content.add(cc); return; }
      const f = this.add.image(-160, -130, o.face); f.setScale(110 / f.height); f.setCrop(0, 0, f.width, f.height * 0.75); cc.add(f); cc.add(T(this, -90, -150, CHARS[o.face] + (o.brook ? ' ★' : ''), 24, C.ink, { ox: 0, w: 900 }));
      Object.entries(o.items).forEach(([k, n], j, arr) => { const ix = (j - (arr.length - 1) / 2) * 130; cc.add(icon(this, ix, -20, k, 90)); const hv = this.d.items[k] || 0; cc.add(T(this, ix, 44, `${hv}/${n}`, 22, hv >= n ? C.green : C.red, { w: 900 })); });
      cc.add(T(this, 0, 100, `🪙${o.coins}  ⭐${o.xp}${o.tools ? `  🧰${o.tools}` : ''}${o.bm ? '  🧱1' : ''}`, 26, C.brown, { w: 900 }));
      cc.add(btn(this, 60, 160, 260, 70, '보내기', () => { const r = doOrder(i); if (!r) return toast(this, '물건이 모자라요'); const pk = onOrder(); if (pk) this.time.delayedCall(900, () => toast(this, '📦 스티커 팩을 받았어요! (이벤트 → 스티커)', H / 2)); save(); audio.play('sfx_order', { volume: 0.7 }); audio.buzz([20, 40, 20]); p.close(); this.fly([W / 2, H / 2], 'coin', `+${r.o.coins}${r.o.bonusC ? ` (+${r.o.bonusC} 매력)` : ''}`); this.refresh(); this.levelUps(r.ups); this.ordersPanel(); }, { size: 24, style: ok ? 'green' : 'cream' }));
      cc.add(btn(this, -160, 160, 90, 70, '🗑', () => { dropOrder(i); save(); p.close(); this.ordersPanel(); }, { size: 24, style: 'cream' })); p.content.add(cc); });
  }
  // ── 기차
  trainPanel(ti = 0) {
    const t = trainN(ti); if (!t) return toast(this, '기차는 레벨 2에 다니기 시작해요', H / 2);
    const p = popup(this, 1000, 1000); p.content.add(T(this, 0, -430, '왕국 기차', 46, C.ink, { w: 900 }));
    TRAINS.forEach((lv, k) => { const on = k === ti, lock = this.d.lv < lv; p.content.add(btn(this, (k - 1) * 290, -360, 260, 70, lock ? `🔒 레벨 ${lv}` : `${k + 1}번 기차`, () => { if (lock || on) return; p.close(); this.trainPanel(k); }, { size: 24, style: on ? 'gold' : 'cream' })); });
    if (t.away) { p.content.add(icon(this, 0, -150, 'loco', 260)); p.content.add(T(this, 0, 50, '성에 물건을 배달하는 중이에요', 30, C.ink, { w: 900 })); p.content.add(T(this, 0, 110, `돌아오기까지 ${fmtT((t.back - Date.now()) / 1000)}`, 28, C.brown, { w: 900 })); p.content.add(btn(this, 0, 300, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' })); return; }
    p.content.add(T(this, 0, -320, '칸마다 물건을 실어요 · 다 채우면 성으로 떠나요', 24, C.dim, { w: 900 }));
    t.cars.forEach((c, k) => { const x = (k - 1) * 310, y = -60, g = this.add.graphics(), hv = this.d.items[c.it] || 0, ok = !c.done && hv >= c.n; g.fillStyle(c.done ? 0xE3F5DA : 0xFFFBF2, 1).fillRoundedRect(x - 140, y - 190, 280, 380, 28).lineStyle(3, ok ? 0x5AAE3C : 0xD8C8B8, 1).strokeRoundedRect(x - 140, y - 190, 280, 380, 28); p.content.add(g);
      p.content.add(icon(this, x, y - 100, c.it, 110)); p.content.add(T(this, x, y - 20, `${ITEMS[c.it].n} ${c.n}개`, 24, C.ink, { w: 900 })); p.content.add(T(this, x, y + 16, c.done ? '실음 ✓' : `${hv}/${c.n}`, 22, c.done ? C.green : hv >= c.n ? C.green : C.red, { w: 900 })); p.content.add(T(this, x, y + 64, rewardText(c.r), 22, C.brown, { w: 800, wrap: 260 }));
      if (!c.done) p.content.add(btn(this, x, y + 140, 220, 80, '싣기', () => { const r = loadCar(k, ti); if (!r) return toast(this, '물건이 모자라요'); const bmk = Object.keys(this.d.trains ? (this.d.trains[ti].cars[k].bm || {}) : {})[0]; if (bmk) this.time.delayedCall(350, () => this.fly([W / 2, H / 2], bmk, `+1 ${ITEMS[bmk].n}`)); onTrainCar(); save(); audio.play(r.left ? 'sfx_whistle' : 'sfx_drop', { volume: 0.7 }); p.close(); this.refresh(); this.levelUps(r.ups); this.town.drawStation(); if (!r.left) this.trainPanel(ti); else toast(this, '기차가 성으로 출발했어요! 🚂', H / 2); }, { size: 26, style: ok ? 'green' : 'cream' })); });
    p.content.add(btn(this, 0, 330, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' }));
  }
  // ── 비행기 주문
  planePanel() {
    const pl = plane(), p = popup(this, 1000, 1300), top = -600; p.content.add(T(this, 0, top + 30, '공항 · 이웃 왕국 화물', 44, C.ink, { w: 900 }));
    if (pl.away) { p.content.add(icon(this, 0, top + 300, 'plane', 300)); p.content.add(T(this, 0, top + 520, '이웃 왕국으로 날아가는 중', 32, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 580, `다음 비행기까지 ${fmtT((pl.back - Date.now()) / 1000)}`, 28, C.brown, { w: 900 })); return; }
    p.content.add(T(this, 0, top + 90, `칸마다 보상 · 6칸을 다 채우면 ${rewardText(PLANE_BONUS)} 더!`, 24, C.dim, { w: 900 }));
    pl.crates.forEach((c, i) => { const x = -300 + (i % 3) * 300, y = top + 340 + Math.floor(i / 3) * 420, hv = this.d.items[c.it] || 0, ok = !c.done && hv >= c.n, g = this.add.graphics(); g.fillStyle(c.done ? 0xE3F5DA : 0xFFFBF2, 1).fillRoundedRect(x - 135, y - 180, 270, 380, 26).lineStyle(3, ok ? 0x5AAE3C : 0xD8C8B8, 1).strokeRoundedRect(x - 135, y - 180, 270, 380, 26); p.content.add(g);
      p.content.add(icon(this, x, y - 110, 'crate', 90)); p.content.add(icon(this, x, y - 40, c.it, 90)); p.content.add(T(this, x, y + 30, `${ITEMS[c.it].n} ${c.n}`, 22, C.ink, { w: 900 })); p.content.add(T(this, x, y + 64, c.done ? '실음 ✓' : `${hv}/${c.n}`, 22, c.done || hv >= c.n ? C.green : C.red, { w: 900 }));
      if (!c.done) p.content.add(btn(this, x, y + 140, 200, 76, '싣기', () => { const r = loadCrate(i); if (!r) return toast(this, '물건이 모자라요'); onTrainCar(); save(); audio.play(r.all ? 'sfx_levelup' : 'sfx_drop', { volume: 0.7 }); p.close(); this.refresh(); this.levelUps(r.ups); if (r.all) toast(this, '✈ 화물을 모두 채웠어요! 보너스를 받았어요', H / 2); else this.planePanel(); }, { size: 24, style: ok ? 'green' : 'cream' })); });
  }
  // ── 항구 무역
  harborPanel() {
    const v = voyage(), back = voyageBack(); if (back) { save(); audio.play('sfx_whistle', { volume: 0.7 }); this.refresh(); return toast(this, `배가 돌아왔어요! ${Object.entries(back).map(([k, n]) => `${ITEMS[k].n} ${n}`).join(' · ')}`, H / 2); }
    const p = popup(this, 1000, 1200), top = -560; p.content.add(T(this, 0, top + 30, '항구 무역', 46, C.ink, { w: 900 }));
    if (v) { p.content.add(icon(this, 0, top + 300, 'harbor', 320)); p.content.add(T(this, 0, top + 520, `${VOYAGES[v.i].n}에 가는 중`, 34, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 580, `돌아오기까지 ${fmtT((v.back - Date.now()) / 1000)}`, 28, C.brown, { w: 900 })); return; }
    p.content.add(T(this, 0, top + 90, '물건을 실어 보내면 먼 섬의 진귀한 물건을 가져와요', 24, C.dim, { w: 900 }));
    p.content.add(btn(this, 0, top + 1060, 460, 100, '🏝 섬 원정 가기', () => { p.close(); this.go('Island'); }, { size: 30, style: 'gold' }));
    VOYAGES.forEach((V, i) => { const y = top + 280 + i * 300, lock = this.d.lv < V.lv, g = this.add.graphics(); g.fillStyle(lock ? 0xEEE6DC : 0xFFFBF2, 1).fillRoundedRect(-460, y - 130, 920, 260, 28); p.content.add(g);
      const cargo = {}; Object.entries(this.d.items).filter(([k, n]) => n >= 3 && !ITEMS[k].rare && !['pickaxe', 'dynamite'].includes(k)).sort((a, b) => b[1] - a[1]).slice(0, V.need).forEach(([k]) => { cargo[k] = 3; });
      p.content.add(T(this, -420, y - 90, `${V.n} · ${fmtT(V.t)}`, 30, lock ? C.dim : C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -420, y - 45, lock ? `레벨 ${V.lv}에 열려요` : `가져올 것: ${V.loot.map(k => ITEMS[k].n).join(' · ')}`, 20, C.dim, { ox: 0, w: 800 }));
      V.loot.forEach((k, j) => p.content.add(icon(this, 260 + j * 80, y - 70, k, 64)));
      const ck = Object.keys(cargo), ok = !lock && ck.length >= V.need; ck.forEach((k, j) => { p.content.add(icon(this, -400 + j * 110, y + 40, k, 70)); p.content.add(T(this, -400 + j * 110, y + 90, '×3', 20, C.brown, { w: 900 })); });
      if (!lock) p.content.add(btn(this, 320, y + 50, 220, 90, ok ? '출항' : '물건 부족', () => { if (!ok) return toast(this, `물건 ${V.need}가지(3개씩)가 필요해요`); voyageSend(i, cargo); save(); audio.play('sfx_whistle', { volume: 0.7 }); p.close(); toast(this, `${V.n}로 출항했어요! ⛵`, H / 2); }, { size: 26, style: ok ? 'green' : 'cream' })); });
  }
  // ── 헛간
  barnPanel() {
    const its = Object.entries(this.d.items).filter(([, n]) => n > 0), hh = Math.max(700, 420 + Math.ceil(its.length / 5) * 200), p = popup(this, 1000, hh), top = -hh / 2 + 50, cost = BARN.matCost(this.d.barnLv);
    p.content.add(T(this, 0, top + 30, '헛간', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 86, `${barnUsed()} / ${barnCap()} · 눌러서 한 개씩 팔아요 (보물 지도는 열기)`, 24, C.dim, { w: 900 }));
    const g0 = this.add.graphics(); g0.fillStyle(0xEEE6DC, 1).fillRoundedRect(-400, top + 112, 800, 22, 11).fillStyle(barnUsed() / barnCap() > 0.9 ? 0xE8352E : 0x5AAE3C, 1).fillRoundedRect(-400, top + 112, Math.max(22, 800 * Math.min(1, barnUsed() / barnCap())), 22, 11); p.content.add(g0);
    its.forEach(([k, n], i) => { const x = -380 + (i % 5) * 190, y = top + 250 + Math.floor(i / 5) * 200, cc = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFFBF2, 1).fillRoundedRect(-85, -85, 170, 170, 22); cc.add([g, icon(this, 0, -14, k, 100), T(this, 0, 58, `${n}`, 26, C.ink, { w: 900 })]);
      cc.setSize(170, 170).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!has(k)) return; add(k, -1); if (k === 'map') { const g2 = 15 + Math.floor(Math.random() * 16); this.d.gems += g2; save(); audio.play('sfx_levelup'); toast(this, `보물 지도를 따라가 💎${g2}을 찾았어요!`, H / 2); cc.list[2].setText(`${this.d.items[k] || 0}`); this.refresh(); return; } this.d.coins += ITEMS[k].v; save(); audio.play('sfx_coin', { volume: 0.5 }); cc.list[2].setText(`${this.d.items[k] || 0}`); this.refresh(); }); p.content.add(cc); });
    p.content.add(btn(this, 0, -top - 70, 520, 100, `헛간 넓히기 +${BARN.step}`, () => { p.close(); this.costPanel('헛간 넓히기', `${barnCap()} → ${barnCap() + BARN.step}칸`, { coins: 0, mats: cost }, g => { const e = payCost({ mats: cost }, g); if (!e) this.d.barnLv++; return e; }, () => this.barnPanel()); }, { size: 28, style: 'gold' }));
  }
  // ── 땅 넓히기
  expand(gx, gy) {
    const z = zoneOf(gx, gy); if (!zoneNext(z)) return toast(this, '열린 땅 옆부터 넓힐 수 있어요', H / 2);
    const c = zoneCost(); this.costPanel('숲을 정리할까요?', '새 땅 5×5칸', c, g => { const e = payCost(c, g); if (e) return e; this.d.zones.push(z); progress('zone', 1); this.levelUps(gainXp(10)); this.town.drawGround(); this.town.drawObjs(); return null; }, null, 'forest');
  }
  matsPanel() { audio.play('sfx_tap', { volume: 0.6 }); const p = popup(this, 900, 720); p.content.add(T(this, 0, -290, '건축 재료', 44, C.ink, { w: 900 }));
    [['barn', '헛간 넓히기 · 공장 업그레이드', ['hammer', 'nails', 'paint']], ['land', '땅 넓히기', ['saw', 'planks', 'rope']]].forEach(([, n, ks], r) => { const y = -170 + r * 250; p.content.add(T(this, 0, y - 20, n, 26, C.brown, { w: 900 }));
      ks.forEach((k, j) => { const x = (j - 1) * 230; p.content.add([icon(this, x, y + 70, k, 110), T(this, x, y + 145, `${ITEMS[k].n} ${this.d.items[k] || 0}`, 26, C.ink, { w: 900 })]); }); });
    p.content.add(T(this, 0, 300, '주문 · 기차 · 수확 · 이벤트 보상으로 얻어요', 24, C.dim, { w: 900 })); }
  // ── 연구소: 영구 강화 8가지 × 5단계
  researchPanel(o) { const L = lab(), rows = RESEARCH.length, p = popup(this, 1000, 560 + rows * 170), top = -(280 + rows * 85);
    p.content.add(T(this, 0, top + 40, '연구소', 44, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 92, '한 번에 하나씩 연구해요 · 연구 재료(시약·톱니바퀴·설계도)는 연구소에서 만들어요', 22, C.dim, { w: 900, wrap: 900 }));
    RESEARCH.forEach((R0, i) => { const y = top + 200 + i * 170, lv = rl(R0.k), max = lv >= RES_MAX, cur = L.cur && L.cur.k === R0.k, g = this.add.graphics(); g.fillStyle(cur ? 0xFFF3CF : 0xFFFFFF, 1).fillRoundedRect(-460, y - 74, 920, 148, 26).lineStyle(3, cur ? 0xE8A33A : 0xE3D3C2, 1).strokeRoundedRect(-460, y - 74, 920, 148, 26); p.content.add(g);
      p.content.add(icon(this, -400, y, R0.ic, 90)); p.content.add(T(this, -340, y - 40, R0.n, 28, C.ink, { ox: 0, w: 900 })); p.content.add(T(this, -340, y - 4, lv ? `지금: ${R0.d(lv)}` : '아직 연구 안 함', 19, C.dim, { ox: 0, w: 800 }));
      for (let k = 0; k < RES_MAX; k++) p.content.add(this.add.circle(-330 + k * 30, y + 36, 10, k < lv ? 0x5AAE3C : 0xDDD3C6));
      if (max) { p.content.add(T(this, 330, y, '최고 단계 ✔', 24, C.green, { w: 900 })); return; }
      const c = resCost(lv + 1); p.content.add(T(this, 20, y - 36, `다음: ${R0.d(lv + 1)}`, 19, C.brown, { w: 800 }));
      p.content.add(T(this, 20, y + 4, `🪙${c.coins} · ${fmtT(resTime(lv + 1))}`, 19, this.d.coins >= c.coins ? C.ink : C.red, { w: 800 }));
      Object.entries(c.items).forEach(([k, n], j) => { const x = -50 + j * 80, hv = this.d.items[k] || 0; p.content.add(icon(this, x, y + 42, k, 36)); p.content.add(T(this, x + 30, y + 42, `${hv}/${n}`, 16, hv >= n ? C.green : C.red, { ox: 0, w: 900 })); });
      if (cur) { const left = Math.max(0, (L.cur.end - Date.now()) / 1000); p.content.add(T(this, 340, y - 30, `연구 중 ${fmtT(left)}`, 20, C.brown, { w: 900 })); p.content.add(btn(this, 340, y + 24, 200, 70, `💎${speedCost(left)} 바로`, () => { const e = labSpeed(); if (e) return toast(this, e); save(); p.close(); this.refresh(); this.researchPanel(o); }, { size: 22, style: 'gold' })); }
      else p.content.add(btn(this, 340, y, 180, 84, L.cur ? '대기' : '연구', () => { const e = labStart(R0.k); if (e) return toast(this, e); save(); audio.play('sfx_build', { volume: 0.7 }); p.close(); this.refresh(); this.researchPanel(o); }, { size: 26, style: L.cur ? 'cream' : 'green' })); });
    p.content.add(btn(this, -300, -top - 50, 300, 84, '🧪 재료 만들기', () => { p.close(); this.factoryPanel(o); }, { size: 24, style: 'gold' })); p.content.add(btn(this, 0, -top - 50, 220, 84, '옮기기', () => { p.close(); this.startMove(o); }, { size: 24, style: 'cream' })); p.content.add(btn(this, 300, -top - 50, 220, 84, '닫기', () => p.close(), { size: 26, style: 'cream' })); }
  // ── 공사장: 벽돌 · 유리 · 석판
  sitePanel(o) { const B = BUILDS[o.b]; this.costPanel(`${B.n} 공사 중`, `자재를 채우면 완성돼요 · ${B.give ? `주민 +${B.give}` : `인구 상한 +${B.cap}`}`, { coins: 0, mats: o.site }, g => { const e = finishSite(o, g); if (e) return e; this.levelUps(gainXp(10 + Math.round(B.lv / 2))); this.town.drawObjs(); this.time.delayedCall(200, () => { audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `🎉 ${B.n} 완성!`, H / 2); }); return null; }, null, 'site'); }
  // ── 밭 자라는 중: 보석으로 바로
  growPanel(o) { const left = Math.max(0, (o.at - Date.now()) / 1000), c = speedCost(left), p = popup(this, 760, 560); p.content.add(T(this, 0, -200, `${ITEMS[o.crop].n} 자라는 중`, 40, C.ink, { w: 900 })); p.content.add(icon(this, 0, -70, o.crop, 150)); p.content.add(T(this, 0, 50, `${fmtT(left)} 남음`, 30, C.brown, { w: 900 }));
    p.content.add(btn(this, -170, 180, 280, 96, '기다리기', () => p.close(), { size: 28, style: 'cream' })); p.content.add(btn(this, 170, 180, 300, 96, `💎${c} 바로 키우기`, () => { const e = speedField(o); if (e) return toast(this, e); save(); audio.play('sfx_gen', { volume: 0.7 }); p.close(); this.town.drawObjs(); this.refresh(); }, { size: 26, style: 'gold' })); }
  // ── 시장: 오늘의 가판 8칸
  marketPanel() { const m = market(), p = popup(this, 1000, 1200), top = -560; p.content.add(T(this, 0, top + 30, '시장', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 86, '오늘의 가판 · 매일 바뀌어요 · 모자란 재료를 코인으로 사요', 24, C.dim, { w: 900 }));
    m.st.forEach((c, i) => { const x = -360 + (i % 4) * 240, y = top + 290 + Math.floor(i / 4) * 360, g = this.add.graphics(); g.fillStyle(c.n ? 0xFFFBF2 : 0xEEE6DC, 1).fillRoundedRect(x - 110, y - 140, 220, 300, 24).lineStyle(3, 0xC9A27A, 1).strokeRoundedRect(x - 110, y - 140, 220, 300, 24); const nt = T(this, x, y + 30, `${ITEMS[c.it].n} · 남은 ${c.n}`, 20, C.ink, { w: 900, wrap: 200 });
      p.content.add([g, icon(this, x, y - 50, c.it, 110), nt, T(this, x, y + 62, `가진 것 ${this.d.items[c.it] || 0}`, 18, C.dim, { w: 800 })]);
      p.content.add(btn(this, x, y + 112, 190, 70, `🪙${c.price}`, () => { const e = marketBuy(i); if (e) return toast(this, e); save(); audio.play('sfx_coin', { volume: 0.6 }); nt.setText(`${ITEMS[c.it].n} · 남은 ${c.n}`); this.refresh(); }, { size: 24, style: 'gold' })); });
    p.content.add(btn(this, 0, -top - 70, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' })); }
  // ── 박물관: 유물 세트
  museumPanel() { const r = relic(), p = popup(this, 1000, 1500), top = -710; p.content.add(T(this, 0, top + 30, '박물관', 46, C.ink, { w: 900 })); p.content.add(T(this, 0, top + 86, '광산과 섬에서 유물을 찾아 세트를 채워요', 24, C.dim, { w: 900 }));
    RELICS.forEach((S, i) => { const y = top + 260 + i * 290, done = r.done.includes(i), full = S.s.every(k => r.have[k]), g = this.add.graphics(); g.fillStyle(done ? 0xE6F6DC : 0xFFFBF2, 1).fillRoundedRect(-460, y - 120, 920, 250, 26).lineStyle(3, full && !done ? 0x5AAE3C : 0xC9A27A, 1).strokeRoundedRect(-460, y - 120, 920, 250, 26);
      p.content.add([g, T(this, -430, y - 88, `${S.n}${done ? '  ✔ 전시 중' : ''}`, 26, C.ink, { ox: 0, w: 900 }), T(this, 430, y - 88, rewardText(S.r), 22, C.brown, { ox: 1, w: 900 })]);
      S.s.forEach((k, j) => { const x = -360 + j * 170, has = (r.have[k] || 0) > 0 || done, im = icon(this, x, y + 10, k, 100); if (!has) im.setTint(0x333333).setAlpha(0.35); p.content.add([im, T(this, x, y + 80, RELIC_N[k], 18, has ? C.ink : C.dim, { w: 800 })]); });
      if (full && !done) p.content.add(btn(this, 340, y + 20, 200, 90, '전시하기', () => { const ups = relicClaim(i); if (!ups) return; save(); audio.play('sfx_levelup'); p.close(); this.refresh(); this.levelUps(ups); this.museumPanel(); }, { size: 26, style: 'green' })); });
    p.content.add(btn(this, 0, -top - 70, 300, 96, '닫기', () => p.close(), { size: 28, style: 'cream' })); }
  // 비용 창: 코인 + 재료 3종 (가진/필요) · 모자라면 보석으로 채우기
  costPanel(title, sub, c, pay, after, art) {
    const p = popup(this, 860, 760), need = c.mats || {}, miss = missing(need), gem = gemFill(need);
    p.content.add(T(this, 0, -300, title, 42, C.ink, { w: 900 })); p.content.add(T(this, 0, -246, sub, 26, C.dim, { w: 900 })); if (art) p.content.add(icon(this, 0, -150, art, 150));
    const ks = Object.keys(need), y = art ? 0 : -110; ks.forEach((k, j) => { const x = (j - (ks.length - 1) / 2) * 230, hv = this.d.items[k] || 0, g = this.add.graphics(); g.fillStyle(0xFFFBF2, 1).fillRoundedRect(x - 95, y - 80, 190, 200, 24).lineStyle(4, hv >= need[k] ? 0x5AAE3C : 0xE8352E, 1).strokeRoundedRect(x - 95, y - 80, 190, 200, 24);
      p.content.add([g, icon(this, x, y - 10, k, 110), T(this, x, y + 70, `${hv}/${need[k]}`, 30, hv >= need[k] ? C.green : C.red, { w: 900 }), T(this, x, y + 104, ITEMS[k].n, 20, C.dim, { w: 900 })]); });
    if (c.coins) p.content.add(T(this, 0, y + 170, `🪙 ${c.coins}  (가진 것 ${this.d.coins})`, 30, this.d.coins >= c.coins ? C.brown : C.red, { w: 900 }));
    p.content.add(T(this, 0, y + 214, '재료는 주문 · 기차 · 수확 · 이벤트에서 얻어요', 22, C.dim, { w: 900 }));
    const done = g => { const e = pay(g); if (e) return toast(this, e); save(); audio.play('sfx_build', { volume: 0.8 }); p.close(); this.refresh(); after && after(); };
    if (miss) { p.content.add(btn(this, -180, 300, 320, 100, '확인', () => { p.close(); after && after(); }, { size: 28, style: 'cream' })); p.content.add(btn(this, 180, 300, 340, 100, `💎${gem}로 채우기`, () => done(true), { size: 28, style: 'gold' })); }
    else p.content.add(btn(this, 0, 300, 380, 100, '좋아요', () => done(false), { size: 32, style: 'green' }));
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
