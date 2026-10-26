// 냥카페: 별로 가구를 놓아 카페를 꾸미고(June's Journey) · 좋아하는 가구를 놓으면 고양이가 찾아옴(네코아츠메)
// 자리를 비운 사이 손님이 다녀가 선물을 남기고, 매일 내 카페에서 숨은 고양이 찾기
import { W, H } from '../config.js?v=0.62.0';
import { T, C, btn, iconBtn, popup, toast, panel } from '../ui.js?v=0.62.0';
import { audio } from '../audio.js?v=0.62.0';
import { goPrev } from '../nav.js?v=0.62.0';
import { load, save } from '../save.js?v=0.62.0';
import { SLOTS, CATS, THEMES, ROOM, levelOf } from '../cafe/data.js?v=0.62.0';
import { cafeData, level, placedCount, canCome, meet, seat, awayVisits, today, slotOf } from '../cafe/state.js?v=0.62.0';
import { loadCafe, furnitureList, catItem, drawRoom } from '../cafe/room.js?v=0.62.0';
import { coordData } from '../coord/state.js?v=0.62.0';
import { buildLook } from '../coord/look.js?v=0.62.0';

const TOP = 150, BAR = 200;
export class CafeScene extends Phaser.Scene {
  constructor() { super('Cafe'); }
  preload() { this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A); }
  create() {
    this.busy = false; this.sheet = null; this.preview = null; this.room = null;
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    const wait = T(this, W / 2, H / 2, '카페 문을 여는 중…', 34, C.sub, { w: 800 });
    loadCafe(this, () => { wait.destroy(); this.build(); });
    window.__cafe = this;
  }
  build() {
    const d = cafeData();
    // 방은 아래(막대 위)에 붙이고, 좌우는 최대 10%까지만 잘림 · 위에 남는 자리는 오늘의 카페 소식
    this.s = Math.min(W * 1.1 / ROOM.w, (H - TOP - BAR) / ROOM.h); this.ox = (W - ROOM.w * this.s) / 2; this.oy = H - BAR - ROOM.h * this.s; this.lift = 0;
    const gap = this.oy - TOP; if (gap >= 70) { this.newsT = T(this, W / 2, TOP + gap / 2, '', 26, C.sub, { w: 800 }); }
    this.redraw();
    // 위 막대
    const bar = this.add.graphics().setDepth(50); bar.fillStyle(0x2E1A2A, 0.94).fillRect(0, 0, W, TOP).fillStyle(0xFF9DB6, 0.5).fillRect(0, TOP - 3, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true }).setDepth(51);
    this.titleT = T(this, W / 2, 56, '', 34, '#FFFFFF', { w: 900 }).setDepth(51);
    this.subT = T(this, W / 2, 104, '', 22, C.sub, { w: 800 }).setDepth(51);
    this.starT = T(this, W - 40, 58, '', 32, C.gold, { ox: 1, w: 900 }).setDepth(51);
    this.coinT = T(this, W - 40, 104, '', 24, C.gold, { ox: 1, w: 800 }).setDepth(51);
    // 아래 막대: 할 일 · 숨은 고양이 · 도감
    const bb = this.add.graphics().setDepth(50); bb.fillStyle(0x2E1A2A, 0.96).fillRect(0, H - BAR, W, BAR).fillStyle(0xFF9DB6, 0.5).fillRect(0, H - BAR, W, 3);
    this.taskB = btn(this, 200, H - BAR / 2, 320, 120, '할 일', () => this.tasks(), { size: 34 }).setDepth(51);
    this.huntB = btn(this, 540, H - BAR / 2, 320, 120, '숨은 고양이', () => this.goHunt(), { style: 'gold', size: 32 }).setDepth(51);
    this.dexB = btn(this, 880, H - BAR / 2, 320, 120, '도감', () => this.goDex(), { style: 'cream', size: 34 }).setDepth(51);
    this.badge = this.add.container(320, H - BAR / 2 - 50).setDepth(52); this.badge.add([this.add.circle(0, 0, 24, 0xD9573B), this.badgeT = T(this, 0, -1, '', 24, '#FFFFFF', { w: 900 })]);
    this.ui(); this.cameras.main.fadeIn(300, 30, 10, 26);
    // 처음 왔으면 안내 · 아니면 다녀간 손님
    if (!d.cafe.tut) return this.time.delayedCall(400, () => this.intro());
    const v = awayVisits(); if (v) { this.redraw(); this.ui(); this.time.delayedCall(450, () => this.visits(v)); }
  }
  ui() {
    const d = cafeData(), lv = level(), n = placedCount(), avail = this.available().filter(s => d.stars >= s.cost).length, met = Object.keys(d.cafe.met).length;
    this.titleT.setText(`서윤의 냥카페 · Lv.${lv}`); this.subT.setText(n >= SLOTS.length ? '카페 완성! 손님들이 정말 좋아해요' : `카페 완성 ${Math.round(n / SLOTS.length * 100)}% · 손님 ${met} / ${CATS.length}`);
    this.starT.setText(`★ ${d.stars}`); this.coinT.setText(`● ${d.coins}`);
    if (this.newsT) { const cf = d.cafe, left = Math.max(0, 2 * 3600e3 - (Date.now() - (cf.last || Date.now()))), mins = Math.max(1, Math.ceil(left / 60e3)), hh = Math.floor(mins / 60), mm = mins % 60;
      this.newsT.setText(cf.here.length ? `지금 손님 ${cf.here.length}마리 · 다음 손님까지 ${hh ? hh + '시간' : ''}${hh && mm ? ' ' : ''}${mm ? mm + '분' : ''}` : '가구를 놓으면 첫 손님이 찾아와요'); }
    this.badge.setVisible(avail > 0); this.badgeT.setText(String(avail));
    this.dexB.setLabel(`도감 ${met}/${CATS.length}`); this.huntB.setLabel(d.cafe.hunt.day === today() ? '숨은 고양이 ✓' : '숨은 고양이');
  }
  available() { const lv = level(), p = cafeData().cafe.placed; return SLOTS.filter(s => !p[s.id] && s.lv <= lv); }
  // 방 다시 그리기 (가구 + 머무는 고양이), over: 미리보기용 가구 바꿔치기 { slot, theme }
  redraw(over) {
    this.room?.root.destroy(); const cf = cafeData().cafe, placed = { ...cf.placed }; if (over) placed[over.slot] = over.theme;
    cf.here = cf.here.filter(id => canCome(CATS.find(c => c.id === id)));
    const cats = seat(cf.here).map(sp => catItem(sp.c, sp));
    this.room = drawRoom(this, [...furnitureList(placed), ...cats], this.s, this.ox, this.oy - this.lift);
    // 오늘 코디를 입은 서윤 (카운터 앞 · 쿠션보다 앞, 러그보다 뒤)
    const w = coordData().coord.wear, sy = this.add.container(0, 0); if (this.textures.exists(w.o)) {
      const lk = buildLook(this, w.o, w, 560); lk.setPosition(735, 915); const sh = this.add.ellipse(735, 910, 170, 30, 0x3A2010, 0.22);
      const idx = this.room.objs.findIndex(o => o.it.z > 2.8); const at = idx < 0 ? this.room.root.length : this.room.root.getIndex(this.room.objs[idx].im) - (this.room.objs[idx].it.shadow ? 1 : 0);
      this.room.root.addAt([sh, lk], at); this.tweens.add({ targets: lk, scaleY: 1.008, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      lk.setSize(240, 560).setInteractive(new Phaser.Geom.Rectangle(-120, -560, 240, 560), Phaser.Geom.Rectangle.Contains).on('pointerup', () => { if (this.busy) return; toast(this, '서윤 · "오늘 코디 어때? 옷 갈아입고 올까?"', TOP + 120); });
    }
    sy.destroy();
    for (const o of this.room.objs) {
      o.im.setInteractive({ useHandCursor: true, pixelPerfect: !o.it.cat && !o.it.flat, alphaTolerance: 40 });
      if (o.it.cat) {   // 숨쉬기 · 꼬리 대신 살짝 흔들림 · 누르면 반응
        const sleep = o.it.key.endsWith('sleep'), sy = o.im.scaleY; this.tweens.add({ targets: o.im, scaleY: sy * (sleep ? 1.025 : 1.018), duration: sleep ? 1700 : 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });
        o.im.on('pointerup', () => this.pet(o));
      } else o.im.on('pointerup', () => { if (!this.busy && !over) this.pick(slotOf(o.it.slot)); });
    }
    if (over) { const s = slotOf(over.slot), o = this.room.objs.find(o => o.it.slot === over.slot); if (o) { const r = this.add.image(0, 0, 'glow').setTint(0xFFE9A0).setBlendMode('ADD'); r.setPosition(o.im.x, o.im.y - (o.it.anchor === 'bottom' ? o.h / 2 : 0)).setDisplaySize(s.w * 1.4, o.h * 1.4).setAlpha(0.35); this.room.root.addAt(r, this.room.root.getIndex(o.im)); this.tweens.add({ targets: r, alpha: 0.12, duration: 700, yoyo: true, repeat: -1 }); } }
  }
  pet(o) {
    if (this.busy) return; const c = o.it.cat, im = o.im; audio.play('sfx_combo', { volume: 0.35 });
    this.tweens.add({ targets: im, y: im.y - 18, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    const p = this.room.root, hx = this.ox + im.x * this.s, hy = this.oy + (im.y - o.h) * this.s;
    const h = T(this, hx, hy, '♥', 54, '#FF7FA6', { w: 900, shadow: true }).setDepth(40); this.tweens.add({ targets: h, y: hy - 90, alpha: 0, duration: 900, onComplete: () => h.destroy() });
    const lines = ['골골골…', '냐아~', '(꾹꾹이 중)', '(꼬리를 살랑)', '(눈을 천천히 깜빡)'];
    toast(this, `${c.n} · ${lines[Math.floor(Math.random() * lines.length)]}`, Math.max(TOP + 80, hy - 140));
  }
  // ── 할 일 목록
  tasks() {
    if (this.busy) return; const d = cafeData(), lv = level(), p = d.cafe.placed;
    const list = SLOTS.filter(s => !p[s.id]).sort((a, b) => a.lv - b.lv || a.cost - b.cost);
    if (!list.length) return toast(this, '모든 자리를 꾸몄어요! 가구를 눌러 디자인을 바꿀 수 있어요');
    const rows = list.slice(0, 6), h = 230 + rows.length * 150, pp = popup(this, 920, h);
    pp.content.add(T(this, 0, -h / 2 + 70, '오늘의 할 일', 44, C.ink, { w: 900 }));
    pp.content.add(T(this, 0, -h / 2 + 122, `별 ★ ${d.stars} · 이야기를 보고 숨은 고양이를 찾으면 모여요`, 24, C.dim, { w: 700 }));
    rows.forEach((s, i) => {
      const y = -h / 2 + 230 + i * 150, open = s.lv <= lv, ok = open && d.stars >= s.cost, row = this.add.container(0, y);
      const g = this.add.graphics(); g.fillStyle(0xFFFFFF, open ? 1 : 0.5).fillRoundedRect(-420, -62, 840, 124, 24).lineStyle(3, ok ? 0xE8628A : 0xF0D6DF, 1).strokeRoundedRect(-420, -62, 840, 124, 24); row.add(g);
      const th = this.add.image(-350, 0, `f_${s.id}_1`); th.setScale(100 / Math.max(th.width, th.height)).setAlpha(open ? 1 : 0.4); row.add(th);
      const fans = CATS.filter(c => c.like && c.like.slot === s.id && d.cafe.met[c.id]).map(c => c.n);
      row.add(T(this, -280, -22, `${s.n} 놓기`, 32, open ? C.ink : C.dim, { ox: 0, w: 900 }));
      row.add(T(this, -280, 24, open ? (fans.length ? `${fans.slice(0, 2).join(' · ')}이(가) 좋아해요` : s.why) : `카페 Lv.${s.lv}에서 열려요`, 22, C.dim, { ox: 0, w: 700 }));
      const cb = this.add.container(330, 0), cg = this.add.graphics(); cg.fillStyle(ok ? 0xE8628A : 0xD9C2CC, 1).fillRoundedRect(-70, -32, 140, 64, 32); cb.add([cg, T(this, 0, -2, open ? `★ ${s.cost}` : '🔒', 28, '#FFFFFF', { w: 900 })]); row.add(cb);
      row.setSize(840, 124).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (!open) return toast(this, `가구를 더 놓아 카페 Lv.${s.lv}이 되면 열려요`);
        pp.close(); this.time.delayedCall(160, () => this.pick(s));
      });
      pp.content.add(row);
    });
  }
  // ── 디자인 고르기 (미리보기 → 놓기/바꾸기)
  pick(s) {
    if (this.busy) return; this.busy = true; const d = cafeData(), cur = d.cafe.placed[s.id], cost = cur ? 0 : s.cost; let sel = cur || 1;
    // 아래쪽 가구는 시트에 가리지 않게 방을 위로 올림
    const sy = this.oy + (s.hang || s.wall ? s.y : s.y - 120) * this.s; this.lift = Math.max(0, sy - (H - 560 - 140));
    this.redraw({ slot: s.id, theme: sel });
    const root = this.add.container(0, 0).setDepth(80), sh = 560, y0 = H - sh;
    const g = this.add.graphics(); g.fillStyle(0xFFF6F8, 1).fillRoundedRect(0, y0, W, sh + 40, 40); root.add(g);
    root.add(T(this, 50, y0 + 60, cur ? `${s.n} 바꾸기` : `${s.n} · 어떤 디자인으로 할까요?`, 34, C.ink, { ox: 0, w: 900 }));
    root.add(T(this, 50, y0 + 104, cur ? '바꾸는 건 무료예요' : '세 가지 모두 같은 별 · 언제든 무료로 바꿀 수 있어요', 22, C.dim, { ox: 0, w: 700 }));
    const cards = [];
    for (let t = 1; t <= 3; t++) {
      const x = W / 2 + (t - 2) * 330, cy = y0 + 270, c = this.add.container(x, cy), cg = this.add.graphics(); c.add(cg);
      const im = this.add.image(0, -20, `f_${s.id}_${t}`); im.setScale(Math.min(220 / im.width, 150 / im.height)); c.add(im);
      c.add(T(this, 0, 82, THEMES[t - 1], 26, C.ink, { w: 900 }));
      const fan = CATS.find(k => k.like && k.like.slot === s.id && k.like.theme === t);
      c.add(T(this, 0, 116, fan ? (d.cafe.met[fan.id] ? `♥ ${fan.n}` : '♥ ? 희귀 손님') : ' ', 20, '#C25A80', { w: 800 }));
      c.setSize(300, 300).setInteractive({ useHandCursor: true }).on('pointerup', () => { sel = t; audio.play('sfx_click', { volume: 0.4 }); draw(); this.redraw({ slot: s.id, theme: t }); });
      cards.push({ cg, t }); root.add(c);
    }
    const draw = () => cards.forEach(k => { k.cg.clear().fillStyle(0xFFFFFF, 1).fillRoundedRect(-150, -150, 300, 300, 26).lineStyle(k.t === sel ? 6 : 3, k.t === sel ? 0xE8628A : 0xF0D6DF, 1).strokeRoundedRect(-150, -150, 300, 300, 26); });
    draw();
    const close = (keep) => { root.destroy(); this.busy = false; this.lift = 0; if (!keep) this.redraw(); };
    root.add(btn(this, W / 2 - 220, y0 + 480, 340, 110, '취소', () => close(), { style: 'cream', size: 32 }));
    root.add(btn(this, W / 2 + 190, y0 + 480, 420, 110, cur ? '이걸로 바꾸기' : `★ ${cost}로 놓기`, () => {
      if (cur && sel === cur) return close();
      if (d.stars < cost) return toast(this, `별이 ${cost - d.stars}개 더 필요해요 · 이야기 · 숨은 고양이로 모아요`, y0 - 80);
      d.stars -= cost; const before = level(); d.cafe.placed[s.id] = sel; save(); close(true); this.placed(s, sel, before, !cur);
    }, { size: 32 }));
    root.y = sh; this.tweens.add({ targets: root, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    this.sheet = { close };
  }
  placed(s, t, before, fresh) {
    this.sheet = null; this.redraw(); this.ui(); audio.play('sfx_find', { volume: 0.7 });
    const o = this.room.objs.find(o => o.it.slot === s.id);
    if (o) { const bx = this.ox + o.im.x * this.s, by = this.oy + (o.im.y - (o.it.anchor === 'bottom' ? o.h / 2 : 0)) * this.s;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, sp = this.add.image(bx, by, 'spark').setTint(0xFFD6E4).setScale(0.5).setDepth(40); this.tweens.add({ targets: sp, x: bx + Math.cos(a) * 160, y: by + Math.sin(a) * 120, alpha: 0, scale: 0.1, duration: 650, onComplete: () => sp.destroy() }); }
      o.im.setScale(o.im.scaleX * 0.85, o.im.scaleY * 0.85); this.tweens.add({ targets: o.im, scaleX: o.im.scaleX / 0.85, scaleY: o.im.scaleY / 0.85, duration: 380, ease: 'Back.easeOut' }); }
    const after = level();
    // 이 가구를 좋아하는 고양이가 바로 찾아옴 (못 만난 고양이 먼저)
    const cf = cafeData().cafe, fans = CATS.filter(c => c.like && c.like.slot === s.id && canCome(c)).sort((a, b) => (cf.met[a.id] ? 1 : 0) - (cf.met[b.id] ? 1 : 0));
    const guest = fans.find(c => !cf.met[c.id]) || (fresh ? fans[0] : null);
    this.time.delayedCall(700, () => {
      if (after > before) { this.cameras.main.flash(250, 255, 230, 240); toast(this, `카페 Lv.${after}! 새 할 일이 열렸어요`, TOP + 120); }
      if (guest) this.time.delayedCall(after > before ? 900 : 0, () => this.newGuest(guest));
    });
  }
  newGuest(c) {
    const cf = cafeData().cafe, isNew = !cf.met[c.id]; meet(c); cf.here = [c.id, ...cf.here.filter(i => i !== c.id)].slice(0, 6); save(); this.redraw(); this.ui();
    this.busy = true; audio.play('sfx_clear', { volume: 0.5 });
    const p = popup(this, 760, 780, { onClose: () => { this.busy = false; } });
    p.content.add(T(this, 0, -320, isNew ? '새 손님이 찾아왔어요!' : `${c.n}이(가) 또 놀러 왔어요`, 40, C.ink, { w: 900 }));
    p.content.add(this.polaroid(0, -40, c, 'sit', 1.25, -3));
    p.content.add(T(this, 0, 190, `${c.n} · ${c.kind}`, 30, '#C25A80', { w: 900 }));
    p.content.add(T(this, 0, 240, c.t, 24, C.brown, { w: 700, wrap: 640 }));
    p.content.add(btn(this, 0, 330, 420, 100, '반가워!', () => p.close(), { size: 32 }));
  }
  polaroid(x, y, c, pose, k = 1, rot = 0) {
    const pc = this.add.container(x, y).setAngle(rot), w = 260 * k, h = 300 * k, g = this.add.graphics();
    g.fillStyle(0x000000, 0.18).fillRect(-w / 2 + 6, -h / 2 + 10, w, h).fillStyle(0xFFFFFF, 1).fillRect(-w / 2, -h / 2, w, h).fillStyle(0xFCEFF3, 1).fillRect(-w / 2 + 14 * k, -h / 2 + 14 * k, w - 28 * k, w - 28 * k);
    const im = this.add.image(0, -h / 2 + 14 * k + (w - 28 * k) / 2, `n${c.id}_${pose}`); im.setScale(Math.min((w - 44 * k) / im.width, (w - 44 * k) / im.height));
    pc.add([g, im]); return pc;
  }
  // 자리를 비운 사이 다녀간 손님
  visits(v) {
    this.busy = true; audio.play('sfx_page', { volume: 0.6 });
    const n = v.res.length, h = v.person ? 1020 : 820, p = popup(this, 940, h, { onClose: () => { this.busy = false; this.ui(); } });
    p.content.add(T(this, 0, -h / 2 + 80, `자리를 비운 사이\n손님 ${n}마리가 다녀갔어요`, 38, C.ink, { w: 900, lh: 10 }));
    v.res.forEach((r, i) => {
      const x = (i - (n - 1) / 2) * 280, y = -h / 2 + 330, pc = this.polaroid(x, y, r.c, r.photo || 'sit', 0.95, [-4, 3, -2][i]); p.content.add(pc);
      p.content.add(T(this, x, y + 175, r.isNew ? `NEW ${r.c.n}` : r.c.n, 26, r.isNew ? '#E8628A' : C.ink, { w: 900 }));
      p.content.add(T(this, x, y + 210, `● +${r.gift}`, 24, C.gold, { w: 900 }));
    });
    let yy = -h / 2 + 600;
    if (v.person) {
      const row = this.add.container(0, yy), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-420, -80, 840, 160, 26); row.add(g);
      const f = this.add.image(-340, 0, v.person.face); f.setScale(130 / f.width); const mk = this.make.graphics({ add: false }); row.add(f);
      row.add(T(this, -250, -30, `${v.person.who}도 들렀다 갔어요`, 26, C.ink, { ox: 0, w: 900 }));
      row.add(T(this, -250, 22, `"${v.person.line}"`, 22, C.brown, { ox: 0, w: 700, wrap: 640 }));
      p.content.add(row); yy += 190;
    }
    // 다음 고양이를 부를 힌트 (아직 못 만난 고양이 중 하나)
    const cf = cafeData().cafe, nx = CATS.find(c => c.like && !cf.met[c.id] && !canCome(c));
    if (nx) p.content.add(T(this, 0, yy, `💡 ${nx.kind} 손님은 ${slotOf(nx.like.slot).n}${nx.like.theme ? `(${THEMES[nx.like.theme - 1]})` : ''}을(를) 좋아한대요`, 22, '#C25A80', { w: 800, wrap: 820 }));
    const sum = v.res.reduce((a, r) => a + r.gift, 0);
    p.content.add(btn(this, 0, h / 2 - 90, 480, 110, `선물 받기 · ● ${sum}`, () => p.close(), { size: 32 }));
  }
  intro() {
    this.busy = true; const p = popup(this, 900, 900, { closable: false, onBack: () => this.leave() });
    p.content.add(T(this, 0, -360, '서윤의 냥카페', 48, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -300, '꽃집 옆 빈 가게에 작은 고양이 카페를 열었어요', 26, C.dim, { w: 700 }));
    [['★', '이야기 · 숨은 물건 찾기를 하면 별이 모여요'], ['🛋', '별로 가구를 놓아 카페를 꾸며요'], ['🐾', '좋아하는 가구가 있으면 고양이가 찾아와요'], ['📷', '자리를 비운 사이에도 손님이 다녀가요'], ['🔍', '매일 한 번, 내 카페에서 숨은 고양이 찾기']]
      .forEach(([ic, t], i) => { p.content.add(T(this, -360, -180 + i * 95, ic, 40, C.rose, { w: 900 })); p.content.add(T(this, -300, -180 + i * 95, t, 28, C.ink, { ox: 0, w: 800 })); });
    p.content.add(T(this, 0, 320, `지금 가진 별 ★ ${cafeData().stars}`, 30, '#C25A80', { w: 900 }));
    p.content.add(btn(this, 0, 400, 480, 110, '첫 가구 놓기', () => { const d = cafeData(); d.cafe.tut = 1; d.cafe.last = Date.now(); save(); p.close(); this.busy = false; this.time.delayedCall(200, () => this.tasks()); }, { size: 34 }));
  }
  goHunt() {
    if (this.busy) return; const d = cafeData(), hasCat = Object.keys(d.cafe.met).length;
    if (!hasCat) return toast(this, '먼저 가구를 놓아 첫 손님을 맞이해요');
    this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CatHunt'));
  }
  goDex() { if (this.busy) return; this.cameras.main.fadeOut(200, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CatDex')); }
  leave() { this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Library')); }
  onBack() { if (this.sheet) { this.sheet.close(); this.sheet = null; return true; } return goPrev(this); }
}
