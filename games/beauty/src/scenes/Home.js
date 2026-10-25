// 매장 (원작의 식당 꾸미기): 낡은 가게 → 할 일(코인)로 이야기 · 수리 · 디자인 3종 선택(언제든 무료 변경)
import { W, H } from '../config.js?v=0.48.1';
import { T, C, btn, popup, toast, firstTip } from '../ui.js?v=0.48.1';
import { load as loadSave } from '../save.js?v=0.48.1';
import { audio } from '../audio.js?v=0.48.1';
import { load, save } from '../save.js?v=0.48.1';
import { hud } from '../hud.js?v=0.48.1';
import { DESIGNS, ROOM, CHAPTERS } from '../data.js?v=0.48.1';
import { daily, season, chapter, curTask, canNextChapter, nextChapter, giveReward, rewardText } from '../state.js?v=0.48.1';
import { packCount, claimable, albumClaimable, loginCheck, LOGIN } from '../album.js?v=0.48.1';
import { bingo, spin, dig, DUO, duoState, duoJoin, duoClaim } from '../minigames.js?v=0.48.1';
import { RACE, raceState, raceJoin, raceClaim, LADDER, theme, decoInfo, decoName, THEMES, ladder, ladderReady, ladderClaim, ladderEndsIn, VIP, vip, vipClaim, vipEndsIn, fmtLeft } from '../events.js?v=0.48.1';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create(data) {
    const d = this.d = load(); this.busy = false; this.picker = null; this.view = data && data.view !== undefined ? data.view : (d.ch || 0);
    this.C = CHAPTERS[this.view];
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    const top = 130, bot = 380; // 방은 위 막대 밑부터 할 일 카드까지 꽉 채움 (긴 화면은 양옆이 조금 잘림)
    this.s = (H - bot + 30 - (top - 40)) / ROOM.h; this.ox = (W - ROOM.w * this.s) / 2; this.oy = top - 40;
    this.drawRoom();
    this.hud = hud(this, { left: 80 });
    // 지역 바꾸기 (원작처럼 지난 장소도 다시 볼 수 있음)
    const ay = top + 56, lt = T(this, W / 2, ay, `${this.view + 1}장 · ${this.C.n}`, 28, C.ink, { w: 900 }).setDepth(31), lg = this.add.graphics().setDepth(30); lg.fillStyle(0xFFFFFF, 0.9).fillRoundedRect(W / 2 - lt.width / 2 - 34, ay - 30, lt.width + 68, 60, 30).lineStyle(3, 0xF1C6CF, 1).strokeRoundedRect(W / 2 - lt.width / 2 - 34, ay - 30, lt.width + 68, 60, 30);
    if (this.view > 0) this.arrow(W / 2 - lt.width / 2 - 90, ay, -1); if (this.view < (d.ch || 0)) this.arrow(W / 2 + lt.width / 2 + 90, ay, 1);
    // 왼쪽 아이콘: 하루 목표 · 시즌 · 상점
    const dl = daily(), dn = dl.goals.filter((g, i) => g.have >= g.need && !dl.done.includes(i)).length;
    const login = loginCheck();
    this.side(80, top + 110, '📅', '목표', () => this.scene.start('Season'), dn);
    this.side(80, top + 250, 'img:album', '앨범', () => this.scene.start('Album'), packCount() + claimable().length + (albumClaimable() ? 1 : 0));
    this.side(80, top + 390, 'img:calendar', '출석', () => this.attend(), login.claimed ? 0 : 1);
    this.side(80, top + 530, '🛍', '상점', () => this.scene.start('Shop'), 0);
    this.side(80, top + 670, '⚙', '설정', () => this.settings(), 0);
    // 오른쪽: 동시에 열리는 이벤트 (레이스 · 꾸미기 사다리 · VIP)
    const rs = raceState(), vp = vip();
    this.evRace = this.side(W - 80, top + 110, 'img:ev_race', rs.joined && !rs.ended ? `${rs.rank}등` : '레이스', () => this.raceView(), rs.joined ? (rs.ended && !rs.claimed ? 1 : 0) : rs.left > 0 ? '!' : 0);
    this.side(W - 80, top + 250, `img:${theme().icon}`, '축제', () => this.ladderView(), ladderReady());
    this.side(W - 80, top + 390, 'img:ev_vip', `VIP ${vp.done}/${VIP.goal}`, () => this.vipView(), vp.done >= VIP.goal && !vp.claimed ? 1 : 0);
    const mg = bingo().balls + spin().tokens + dig().shovels, du = duoState();
    this.side(W - 80, top + 530, 'img:roulette', '놀이', () => this.scene.start('Mini'), mg > 0 ? mg : 0);
    this.side(W - 80, top + 670, 'img:duo', '듀오', () => this.duoView(), du.joined ? (du.ended && !du.claimed ? 1 : 0) : du.can ? '!' : 0);
    this.time.addEvent({ delay: 5000, loop: true, callback: () => { const s = raceState(); if (s.joined && !s.ended && this.evRace) this.evRace.lbl.setText(`${s.rank}등`); } });
    // 아래: 다음 할 일 카드 + 작업대 버튼
    const by = H - bot, g = this.add.graphics().setDepth(20); g.fillStyle(0xFFFFFF, 0.96).fillRoundedRect(30, by, W - 60, bot - 30, 36).lineStyle(4, 0xF1C6CF, 1).strokeRoundedRect(30, by, W - 60, bot - 30, 36);
    const task = this.view === (d.ch || 0) ? curTask() : null, tl = chapter().tasks.length;
    if (this.view !== (d.ch || 0)) { T(this, 70, by + 60, `${this.view + 1}장 · ${this.C.n} · 완성!`, 26, C.dim, { ox: 0, w: 800 }).setDepth(21); T(this, 70, by + 115, '가구를 누르면 디자인을 바꿀 수 있어요', 30, C.ink, { ox: 0, w: 800 }).setDepth(21);
      btn(this, 830, by + 95, 300, 100, '지금 장으로', () => this.scene.restart({ view: d.ch || 0 }), { size: 28, style: 'cream' }).setDepth(21); }
    else if (task) {
      T(this, 70, by + 50, `${(d.ch || 0) + 1}장 · ${chapter().n}  ${d.task + 1} / ${tl}`, 24, C.dim, { ox: 0, w: 800 }).setDepth(21);
      const pg = this.add.graphics().setDepth(21); pg.fillStyle(0xF6E2E8, 1).fillRoundedRect(70, by + 172, 560, 12, 6).fillStyle(0xE86A8E, 1).fillRoundedRect(70, by + 172, Math.max(12, 560 * d.task / tl), 12, 6);
      T(this, 70, by + 105, task.n, 40, C.ink, { ox: 0, w: 900 }).setDepth(21);
      T(this, 70, by + 155, task.story ? '이야기 · 다음 장면을 봐요' : '수리 · 디자인을 골라요', 24, C.sub, { ox: 0, w: 800 }).setDepth(21);
      this.taskB = btn(this, 830, by + 105, 300, 110, task.cost ? `●${task.cost}` : '무료', () => this.doTask(), { size: 34, style: d.coins >= task.cost ? 'rose' : 'cream' }).setDepth(21);
      if (d.coins >= task.cost) this.tweens.add({ targets: this.taskB, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });
    } else if (canNextChapter()) { const nx = CHAPTERS[(d.ch || 0) + 1]; T(this, 70, by + 60, `${(d.ch || 0) + 1}장 완성!`, 26, C.dim, { ox: 0, w: 800 }).setDepth(21); T(this, 70, by + 115, `다음: ${(d.ch || 0) + 2}장 「${nx.n}」`, 36, C.ink, { ox: 0, w: 800 }).setDepth(21);
      const nb = btn(this, 830, by + 95, 300, 110, '열기!', () => this.goNext(), { size: 36, style: 'rose' }).setDepth(21); this.tweens.add({ targets: nb, scale: 1.07, duration: 600, yoyo: true, repeat: -1 }); }
    else { T(this, W / 2, by + 90, `${CHAPTERS.length}장까지 모두 완성!`, 36, C.ink, { w: 900 }).setDepth(21); T(this, W / 2, by + 145, '다음 이야기를 준비하고 있어요', 26, C.dim, { w: 900 }).setDepth(21); }
    btn(this, W / 2, by + 260, W - 140, 120, '작업대로 가기 · 주문 받기', () => this.scene.start('Board'), { size: 36, style: 'gold' }).setDepth(21);
    this.cameras.main.fadeIn(250, 255, 244, 236); window.__home = this; audio.music(this.C.bgm);
    if (d.task === 0 && this.view === (d.ch || 0) && curTask()) this.time.delayedCall(500, () => this.doTask());
    else if (!login.claimed && d.tut >= 3) this.time.delayedCall(600, () => this.attend());   // 하루 첫 방문: 출석 보상
  }
  arrow(x, y, dir) { const c = this.add.container(x, y).setDepth(30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.92).fillCircle(0, 0, 32).lineStyle(3, 0xF1C6CF, 1).strokeCircle(0, 0, 32); c.add([g, T(this, dir * 2, -2, dir < 0 ? '◀' : '▶', 24, C.rose, { w: 900 })]);
    c.setSize(90, 90).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.busy) return; audio.play('sfx_tap', { volume: 0.6 }); this.scene.restart({ view: this.view + dir }); }); }
  // 다음 장 열기: 장 완료 연출 → 새 지역
  goNext() {
    if (this.busy) return; this.busy = true; audio.play('sfx_levelup', { volume: 0.8 }); audio.duck(2600); audio.buzz([30, 60, 30, 60, 80]);
    const k = (this.d.ch || 0) + 1, nx = CHAPTERS[k], dim = this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A, 0).setDepth(80); this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 500 });
    const t1 = T(this, W / 2, H / 2 - 120, `${k + 1}장`, 60, '#FFD98A', { w: 900, shadow: true }).setDepth(81).setAlpha(0), t2 = T(this, W / 2, H / 2 - 20, `「${nx.n}」`, 80, '#FFFFFF', { w: 900, shadow: true }).setDepth(81).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: t1, alpha: 1, duration: 400, delay: 300 }); this.tweens.add({ targets: t2, alpha: 1, scale: 1, duration: 500, delay: 500, ease: 'Back.easeOut' });
    for (let i = 0; i < 30; i++) { const s = this.add.image(W / 2, H / 2 - 40, 'spark').setTint([0xFFE27A, 0xFF9DB6, 0xFFFFFF][i % 3]).setDepth(82).setScale(0.5); const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 300; this.tweens.add({ targets: s, x: W / 2 + Math.cos(a) * r, y: H / 2 - 40 + Math.sin(a) * r, alpha: 0, angle: 360, duration: 1200, delay: 500 + Math.random() * 300, onComplete: () => s.destroy() }); }
    nextChapter(); this.time.delayedCall(2300, () => this.scene.restart({ view: k }));
  }
  side(x, y, ic, n, fn, badge) {
    const c = this.add.container(x, y).setDepth(30), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.95).fillCircle(0, 0, 56).lineStyle(4, 0xF1C6CF, 1).strokeCircle(0, 0, 56);
    const lg = this.add.graphics(); lg.fillStyle(0xE86A8E, 1).fillRoundedRect(-44, 50, 88, 38, 19);
    let icon; if (ic.startsWith('img:')) { icon = this.add.image(0, -4, ic.slice(4)); icon.setScale(78 / Math.max(icon.width, icon.height)); } else icon = T(this, 0, -6, ic, 48, '#000', { w: 900 });
    const lbl = T(this, 0, 68, n, 22, '#FFFFFF', { w: 900 }); if (lbl.width > 80) { lg.clear().fillStyle(0xE86A8E, 1).fillRoundedRect(-lbl.width / 2 - 10, 50, lbl.width + 20, 38, 19); }
    c.add([g, icon, lg, lbl]); c.lbl = lbl;
    if (badge) c.add([this.add.circle(40, -40, 18, 0xD9573B), T(this, 40, -41, String(badge), 20, '#FFFFFF', { w: 900 })]);
    c.setSize(120, 120).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.busy) { audio.play('sfx_tap', { volume: 0.6 }); this.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); fn(); } });
    return c;
  }
  drawRoom() {
    this.room?.destroy(); const r = this.room = this.add.container(this.ox, this.oy).setScale(this.s);
    r.add(this.add.image(0, 0, this.C.room).setOrigin(0));
    for (const sp of [...this.C.spots].sort((a, b) => a.d - b.d)) {
      const v = this.d.spots[sp.id] || 0, key = `${sp.id}_${v}`, tex = this.textures.get(key).getSourceImage(), h = sp.w * tex.height / tex.width;
      if (!sp.hang && !sp.flat) r.add(this.add.ellipse(sp.x, sp.y - 4, sp.w * 0.8, sp.w * 0.12, 0x5A3020, 0.18));
      const im = this.add.image(sp.x, sp.y, key).setOrigin(0.5, sp.hang ? 0.5 : 1).setDisplaySize(sp.w, h); r.add(im);
      im.setInteractive({ useHandCursor: true, pixelPerfect: !sp.flat, alphaTolerance: 40 }).on('pointerup', () => { if (this.busy) return; if (v) this.pickDesign(sp, false); else toast(this, `${sp.n}은(는) 할 일 순서가 오면 고칠 수 있어요`, 260); });
      const nxt = this.view === (this.d.ch || 0) ? curTask() : null; if (nxt && nxt.repair === sp.id) { const gl = this.add.image(sp.x, sp.hang ? sp.y : sp.y - h / 2, 'glow').setTint(0xFFE27A).setBlendMode('ADD').setDisplaySize(sp.w * 1.3, h * 1.3); r.addAt(gl, r.getIndex(im)); this.tweens.add({ targets: gl, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 }); }
    }
    this.drawDeco();
  }
  // 축제 장식 (꾸미기 사다리 보상): 어느 방에서나 같은 자리
  drawDeco() { const r = this.room, show = this.d.decoShow || 'spring', pos = { garland: [512, 330, 560, true], tree: [925, 1180, 190], booth: [110, 1260, 210] };
    if (show === 'off') return; const dc = (this.d.deco || []).map(decoInfo).filter(x => x.theme === show);
    for (const di of dc) { const [x, y, w, hang] = pos[di.slot], im = this.add.image(x, y, di.img).setOrigin(0.5, hang ? 0.5 : 1); im.setScale(w / im.width); if (hang) r.add(im); else r.addAt(im, 1); } }   // 바닥 장식은 가구 뒤 · 등불은 맨 위
  doTask() {
    const t = curTask(); if (!t || this.busy || this.view !== (this.d.ch || 0)) return;
    if (this.d.coins < t.cost) return toast(this, `코인이 ${t.cost - this.d.coins} 부족해요 · 작업대에서 주문을 받아요`, H - 470);
    this.d.coins -= t.cost; save(); audio.play('sfx_coin', { volume: 0.6 });
    if (t.story) { this.d.task++; save(); return this.scene.start('Story', { id: t.story, ret: 'Home' }); }
    const sp = this.C.spots.find(s => s.id === t.repair); this.pickDesign(sp, true);
  }
  // 디자인 3종 고르기 (수리 · 다시 바꾸기 모두 무료로)
  pickDesign(sp, fresh) {
    this.busy = true; let sel = this.d.spots[sp.id] || 1;
    const show = () => { this.d.spots[sp.id] = sel; this.drawRoom(); };
    const prev = this.d.spots[sp.id] || 0; show();
    const root = this.add.container(0, 0).setDepth(60), sh = 520, y0 = H - sh, g = this.add.graphics(); g.fillStyle(0xFFFBF6, 1).fillRoundedRect(0, y0, W, sh + 40, 40).lineStyle(4, 0xF1C6CF, 1).strokeRoundedRect(0, y0, W, sh + 40, 40); root.add(g);
    root.add(T(this, 50, y0 + 56, `${sp.n} · 디자인을 골라요`, 36, C.ink, { ox: 0, w: 900 }));
    root.add(T(this, 50, y0 + 100, '나중에 눌러서 언제든 무료로 바꿀 수 있어요', 22, C.dim, { ox: 0, w: 800 }));
    const cards = [];
    for (let k = 1; k <= 3; k++) {
      const x = W / 2 + (k - 2) * 330, c = this.add.container(x, y0 + 260), cg = this.add.graphics(); c.add(cg);
      const im = this.add.image(0, -20, `${sp.id}_${k}`); im.setScale(Math.min(220 / im.width, 170 / im.height)); c.add(im); c.add(T(this, 0, 104, DESIGNS[k - 1], 26, C.ink, { w: 900 }));
      c.setSize(300, 280).setInteractive({ useHandCursor: true }).on('pointerup', () => { sel = k; audio.play('sfx_tap', { volume: 0.6 }); draw(); show(); });
      cards.push({ cg, k }); root.add(c);
    }
    const draw = () => cards.forEach(c => c.cg.clear().fillStyle(0xFFFFFF, 1).fillRoundedRect(-150, -140, 300, 280, 26).lineStyle(c.k === sel ? 6 : 3, c.k === sel ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(-150, -140, 300, 280, 26)); draw();
    root.add(btn(this, W / 2, y0 + 450, 480, 100, fresh ? '이걸로 완성!' : '이걸로 할게요', () => {
      root.destroy(); this.busy = false; this.picker = null; save();
      if (fresh) { this.d.task++; save(); this.busy = true; audio.play('sfx_repair', { volume: 0.7 }); audio.duck(2000); audio.buzz([20, 40, 30]); this.celebrate(sp); this.time.delayedCall(1300, () => this.scene.restart({ view: this.view })); } else this.scene.restart({ view: this.view });
    }, { size: 32 }));
    // 취소 (뒤로가기도 같음): 새로 고치던 중이면 코인 돌려줌
    const cancel = () => { if (fresh) { delete this.d.spots[sp.id]; this.d.coins += curTask().cost; } else this.d.spots[sp.id] = prev; save(); root.destroy(); this.busy = false; this.picker = null; this.drawRoom(); this.hud.update(); };
    this.picker = { cancel };
    root.add(btn(this, W - 120, y0 + 60, 160, 72, '취소', cancel, { style: 'cream', size: 24 }));
    root.y = sh; this.tweens.add({ targets: root, y: 0, duration: 260, ease: 'Cubic.easeOut' });
  }
  // 수리 완성: 가구 자리에서 반짝이 터짐 + 먼지 + 화면 살짝 밝게
  celebrate(sp) {
    const x = this.ox + sp.x * this.s, y = this.oy + (sp.hang ? sp.y : sp.y - sp.w * 0.4) * this.s; this.cameras.main.flash(300, 255, 240, 230);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, s = this.add.image(x, y, 'spark').setTint([0xFFE27A, 0xFF9DB6, 0xFFFFFF][k % 3]).setScale(0.5).setDepth(40), r = 120 + (k % 3) * 50; this.tweens.add({ targets: s, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, angle: 200, alpha: 0, scale: 0.15, duration: 700, ease: 'Cubic.easeOut', onComplete: () => s.destroy() }); }
    for (let k = 0; k < 6; k++) { const p = this.add.circle(x + (k - 2.5) * 40, y + 60, 26, 0xFFFFFF, 0.8).setDepth(39); this.tweens.add({ targets: p, y: p.y - 60, scale: 2, alpha: 0, duration: 800, delay: k * 40, onComplete: () => p.destroy() }); }
    const t = T(this, x, y - 120, '완성!', 60, C.rose, { w: 900, shadow: true }).setDepth(41).setScale(0.3); this.tweens.add({ targets: t, scale: 1, duration: 360, ease: 'Back.easeOut' });
  }
  // ── 이벤트 창
  raceView() {
    if (firstTip(this, 'race', '뷰티 박람회 레이스', ['5명이 동시에 25점을 향해 달려요', '주문 1개 = 1점 · 물건 2개짜리는 2점', '상대는 시간이 지나면 점수가 올라요 · 4시간 안에!'], 'ev_race')) return;
    const s = raceState(), p = popup(this, 980, 1240);
    p.content.add(T(this, 0, -560, '뷰티 박람회 레이스', 44, C.ink, { w: 900 }));
    if (!s.joined || s.claimed) {
      p.content.add(T(this, 0, -490, `주문을 완료해 ${RACE.goal}점을 가장 먼저! · ${RACE.hours}시간 · 5명`, 26, C.dim, { w: 900 }));
      const tr = this.add.image(0, -240, 'ev_race'); tr.setScale(300 / tr.height); p.content.add(tr);
      ['medal1', 'medal2', 'medal3'].forEach((m, i) => { const y = 0 + i * 110, im = this.add.image(-300, y, m); im.setScale(90 / im.height); p.content.add([im, T(this, -220, y, `${i + 1}등 · ${rewardText(RACE.rewards[i])}`, 28, C.ink, { ox: 0, w: 900 })]); });
      p.content.add(T(this, 0, 360, `오늘 남은 참가 ${s.left}번 · 주문 1개 = 1점 (물건 2개면 2점)`, 24, C.dim, { w: 900 }));
      p.content.add(btn(this, 0, 480, 420, 110, s.left > 0 ? '참가하기' : '내일 다시', () => { if (s.left <= 0) return p.close(); raceJoin(); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart({ view: this.view }); }, { size: 34, style: s.left > 0 ? 'rose' : 'cream' }));
      return;
    }
    p.content.add(T(this, 0, -490, s.ended ? '레이스 끝!' : `남은 시간 ${fmtLeft(s.timeLeft)} · 목표 ${RACE.goal}점`, 28, s.ended ? C.rose : C.dim, { w: 900 }));
    s.rows.forEach((r, i) => { const y = -360 + i * 150, g = this.add.graphics(); g.fillStyle(r.me ? 0xFFE3EC : 0xFFF4EC, 1).fillRoundedRect(-440, y - 62, 880, 124, 26); p.content.add(g);
      if (i < 3) { const md = this.add.image(-390, y, `medal${i + 1}`); md.setScale(70 / md.height); p.content.add(md); } else p.content.add(T(this, -390, y, `${i + 1}`, 32, C.dim, { w: 900 }));
      const f = this.add.image(-300, y, r.face); f.setScale(96 / Math.max(f.width, f.height)); p.content.add([this.add.circle(-300, y, 48, 0xFCE4EC), f]);
      p.content.add(T(this, -230, y - 26, r.n, 24, C.ink, { ox: 0, w: 900 }));
      const bar = this.add.graphics(); bar.fillStyle(0xF1DCD3, 1).fillRoundedRect(-230, y + 8, 520, 22, 11).fillStyle(r.me ? 0xE86A8E : 0x7CC6A8, 1).fillRoundedRect(-230, y + 8, Math.max(22, 520 * r.pts / RACE.goal), 22, 11); p.content.add(bar);
      p.content.add(T(this, 400, y, `${r.pts}`, 30, r.me ? C.rose : C.brown, { w: 900 })); });
    if (s.ended) p.content.add(btn(this, 0, 480, 460, 110, s.rank <= 5 ? `${s.rank}등 보상 받기` : '닫기', () => { const r = raceClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `${rewardText(r)} 받았어요!`, H / 2); } p.close(); this.time.delayedCall(700, () => this.scene.restart({ view: this.view })); }, { size: 32 }));
    else p.content.add(btn(this, 0, 480, 420, 110, '작업대로 가기', () => { p.close(); this.scene.start('Board'); }, { size: 32, style: 'gold' }));
  }
  ladderView() {
    if (firstTip(this, 'ladder', '주간 축제 꾸미기', ['주문하면 물건 단계만큼 축제 토큰이 모여요', '10단계 보상 중 3개는 가게에 놓는 장식!', '축제 테마는 매주 바뀌어요'], theme().icon)) return;
    const l = ladder(), p = popup(this, 980, 1560);
    const th = theme(); p.content.add(T(this, 0, -720, `${th.name} 꾸미기`, 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -665, `주문하면 ${th.emoji}이 모여요 (물건 단계만큼) · 이번 주 남은 ${fmtLeft(ladderEndsIn())}`, 24, C.dim, { w: 900 }));
    const pi = this.add.image(-90, -605, th.token); pi.setScale(56 / pi.height); p.content.add([pi, T(this, -50, -605, `${l.pts}`, 36, C.rose, { ox: 0, w: 900 })]);
    LADDER.tiers.forEach((need, i) => { const y = -510 + i * 112, r = LADDER.rewards[i], got = l.got.includes(i), ok = l.pts >= need, g = this.add.graphics();
      g.fillStyle(got ? 0xF3ECE8 : r.deco ? 0xFFF1D6 : 0xFFF4EC, 1).fillRoundedRect(-440, y - 48, 880, 96, 24).lineStyle(ok && !got ? 5 : 2, ok && !got ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(-440, y - 48, 880, 96, 24); p.content.add(g);
      p.content.add(T(this, -400, y, `${th.emoji}${need}`, 26, C.rose, { ox: 0, w: 900 }));
      if (r.deco) { const di = this.add.image(-200, y, th.img[r.deco]); di.setScale(80 / Math.max(di.width, di.height)); p.content.add(di); }
      p.content.add(T(this, r.deco ? -140 : -230, y, rewardText(r), 26, C.ink, { ox: 0, w: 900 }));
      if (got) p.content.add(T(this, 360, y, '받음 ✓', 26, C.green, { w: 900 }));
      else p.content.add(btn(this, 360, y, 150, 72, '받기', () => { if (!ok) return toast(this, `${th.emoji} ${need - l.pts}개 더 모아요`); const rr = ladderClaim(i); if (!rr) return; const { deco, ...rest } = rr; giveReward(rest); audio.play(deco ? 'sfx_repair' : 'sfx_coin', { volume: 0.7 }); p.close(); if (deco) toast(this, `「${decoName(deco)}」이 가게에 놓였어요!`, H / 2); this.time.delayedCall(deco ? 900 : 200, () => this.scene.restart({ view: this.view })); }, { size: 24, style: ok ? 'rose' : 'cream' })); });
  }
  duoView() {
    if (firstTip(this, 'duo', '듀오 뷰티 배틀', ['나와 짝꿍 팀 대 상대 팀 (2대2)', '24시간 동안 주문 점수를 합쳐 겨뤄요', '이기면 골드 팩 · 져도 기본 팩'], 'duo')) return;
    const s = duoState(), p = popup(this, 980, 1060);
    p.content.add(T(this, 0, -470, '듀오 뷰티 배틀 (2대2)', 44, C.ink, { w: 900 }));
    if (!s.joined || s.claimed) {
      p.content.add(T(this, 0, -405, `짝꿍과 함께 ${DUO.hours}시간 동안 주문 점수를 겨뤄요`, 26, C.dim, { w: 900 }));
      const im = this.add.image(0, -170, 'duo'); im.setScale(300 / im.height); p.content.add(im);
      p.content.add(T(this, 0, 60, `이기면 ${rewardText(DUO.win)}`, 30, C.brown, { w: 900 })); p.content.add(T(this, 0, 110, `져도 ${rewardText(DUO.lose)}`, 26, C.dim, { w: 900 }));
      p.content.add(btn(this, 0, 380, 420, 110, s.can ? '배틀 시작' : '내일 다시', () => { if (!s.can) return p.close(); duoJoin(); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart({ view: this.view }); }, { size: 34, style: s.can ? 'rose' : 'cream' }));
      return;
    }
    const c = s.c, side = (x, title, faces, names, pts, mine) => { const g = this.add.graphics(); g.fillStyle(mine ? 0xFFE3EC : 0xEDF4FF, 1).fillRoundedRect(x - 210, -380, 420, 560, 30); p.content.add(g);
      p.content.add(T(this, x, -340, title, 28, mine ? C.rose : C.blue, { w: 900 }));
      faces.forEach((f, k) => { const im = this.add.image(x, -200 + k * 170, f); im.setScale(130 / Math.max(im.width, im.height)); p.content.add([this.add.circle(x, -200 + k * 170, 70, 0xFFFFFF), im, T(this, x, -120 + k * 170, names[k], 22, C.ink, { w: 900 })]); });
      p.content.add(T(this, x, 140, `${pts}`, 60, mine ? C.rose : C.blue, { w: 900 })); };
    side(-230, '우리 팀', ['c_soyun_smile', c.mate.face], [`나 ${s.me}`, `${c.mate.n} ${s.mate}`], s.team, true);
    side(230, c.foe.n, c.foe.faces, ['', ''], s.foe, false);
    p.content.add(T(this, 0, 240, s.ended ? (s.team >= s.foe ? '우리 팀 승리!' : '아쉽게 졌어요') : `남은 시간 ${fmtLeft(s.left)} · 주문 1개 = 1점`, 30, s.ended ? C.rose : C.dim, { w: 900 }));
    if (s.ended) p.content.add(btn(this, 0, 380, 420, 110, '보상 받기', () => { const r = duoClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `${rewardText(r)} 받았어요!`, H / 2); } p.close(); this.time.delayedCall(700, () => this.scene.restart({ view: this.view })); }, { size: 32 }));
    else p.content.add(btn(this, 0, 380, 420, 110, '작업대로 가기', () => { p.close(); this.scene.start('Board'); }, { size: 32, style: 'gold' }));
  }
  vipView() {
    if (firstTip(this, 'vip', 'VIP 손님', ['금테를 두른 주문이 VIP 손님이에요', '한 단계 높은 물건 · 코인 1.5배', '이틀 동안 5번 완료하면 다이아 팩!'], 'ev_vip')) return;
    const v = vip(), p = popup(this, 900, 900);
    p.content.add(T(this, 0, -380, 'VIP 손님 주문', 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -325, `금테 두른 VIP 주문을 ${VIP.goal}번 완료해요 · 남은 ${fmtLeft(vipEndsIn())}`, 24, C.dim, { w: 900 }));
    const cr = this.add.image(0, -170, 'ev_vip'); cr.setScale(200 / cr.height); p.content.add(cr);
    for (let i = 0; i < VIP.goal; i++) { const x = (i - 2) * 140, t = this.add.image(x, 30, 'vip_ticket'); t.setScale(100 / t.width); if (i >= v.done) t.setTintFill(0xE3D3CC).setAlpha(0.6); p.content.add(t); }
    p.content.add(T(this, 0, 150, `보상 · ${rewardText(VIP.reward)}`, 30, C.brown, { w: 900 }));
    p.content.add(btn(this, 0, 300, 420, 110, v.claimed ? '받음 ✓' : v.done >= VIP.goal ? '보상 받기' : '작업대로 가기', () => { if (v.claimed) return p.close(); if (v.done >= VIP.goal) { const r = vipClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); } p.close(); return this.time.delayedCall(400, () => this.scene.restart({ view: this.view })); } p.close(); this.scene.start('Board'); }, { size: 32, style: v.done >= VIP.goal && !v.claimed ? 'rose' : 'gold' }));
  }
  // 7일 출석: 오늘 칸 강조 · 받기
  attend() {
    const lg = loginCheck(), p = popup(this, 980, 900);
    p.content.add(T(this, 0, -380, '7일 출석 선물', 44, C.ink, { w: 900 })); p.content.add(T(this, 0, -325, '매일 들어오면 선물이 커져요 · 7일마다 다시', 24, C.dim, { w: 800 }));
    LOGIN.forEach((r, i) => { const day = i + 1, big = day === 7, x = big ? 0 : (i % 3 - 1) * 290, y = big ? 230 : -190 + Math.floor(i / 3) * 190, w = big ? 860 : 260, h = 160;
      const past = day < lg.day || day === lg.day && lg.claimed, now = day === lg.day && !lg.claimed, g = this.add.graphics();
      g.fillStyle(now ? 0xFFE3EC : past ? 0xF3ECE8 : 0xFFF4EC, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 26).lineStyle(now ? 6 : 3, now ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26); p.content.add(g);
      p.content.add(T(this, x, y - 48, `${day}일째`, 24, now ? C.rose : C.dim, { w: 900 }));
      p.content.add(T(this, x, y + 10, past ? '받음 ✓' : rewardText(r), big ? 32 : 24, past ? C.green : C.ink, { w: 900, wrap: w - 30 }));
      if (now) this.tweens.add({ targets: g, alpha: 0.75, duration: 500, yoyo: true, repeat: -1 }); });
    p.content.add(btn(this, 0, 380, 420, 100, lg.claimed ? '내일 또 만나요' : '받기', () => { if (lg.claimed) return p.close(); const r = LOGIN[lg.day - 1]; lg.claimed = true; giveReward(r); save(); audio.play('sfx_levelup', { volume: 0.7 }); audio.duck(2400); p.close(); toast(this, `${rewardText(r)} 받았어요!`, H / 2); this.time.delayedCall(900, () => this.scene.restart({ view: this.view })); }, { size: 32, style: lg.claimed ? 'cream' : 'rose' }));
  }
  // 설정: 배경음 · 효과음 · 진동
  settings() {
    const p = popup(this, 760, 1100), rows = [['배경음', () => loadSave().music !== false, () => audio.toggleMusic()], ['효과음', () => loadSave().sfx !== false, () => audio.toggleSfx()], ['진동', () => loadSave().haptic !== false, () => audio.toggleHaptic()]];
    p.content.add(T(this, 0, -400, '설정', 44, C.ink, { w: 900 }));
    rows.forEach(([n, get, flip], k) => {
      const y = -260 + k * 120, c = this.add.container(0, y), g = this.add.graphics(); c.add(g); c.add(T(this, -250, 0, n, 36, C.ink, { ox: 0, w: 800 }));
      const draw = () => { const on = get(); g.clear().fillStyle(on ? 0xE86A8E : 0xE3D3CC, 1).fillRoundedRect(110, -34, 140, 68, 34).fillStyle(0xFFFFFF, 1).fillCircle(on ? 216 : 144, 0, 28); };
      draw(); const hit = this.add.rectangle(180, 0, 160, 80, 0, 0).setInteractive({ useHandCursor: true }); c.add(hit);
      hit.on('pointerup', () => { flip(); draw(); audio.play('sfx_tap', { volume: 0.6 }); }); p.content.add(c);
    });
    // 가게 장식 테마 (받은 축제 장식 중에서 고르기)
    const owned = [...new Set((this.d.deco || []).map(k => decoInfo(k).theme))];
    if (owned.length) { const opts = [...owned, 'off'], nm = id => id === 'off' ? '끄기' : THEMES.find(t => t.id === id).name; const lab = T(this, -250, 220, '가게 장식', 36, C.ink, { ox: 0, w: 800 }); p.content.add(lab);
      const b = btn(this, 180, 220, 300, 80, nm(this.d.decoShow || owned[0]), () => { const i = opts.indexOf(this.d.decoShow || owned[0]); this.d.decoShow = opts[(i + 1) % opts.length]; save(); b.setLabel(nm(this.d.decoShow)); this.drawRoom(); }, { style: 'cream', size: 24 }); p.content.add(b); }
    // 저장 백업: 코드로 복사 · 붙여 넣어 불러오기 (폰을 바꾸거나 기록을 지웠을 때)
    p.content.add(btn(this, -170, 360, 300, 84, '백업 코드 복사', async () => { const code = 'KB1' + btoa(unescape(encodeURIComponent(localStorage.getItem('kbeauty_v1') || ''))); try { await navigator.clipboard.writeText(code); toast(this, '백업 코드를 복사했어요 · 메모장 등에 보관해요', H / 2); } catch { window.prompt('이 코드를 복사해 보관해요', code); } }, { style: 'cream', size: 24 }));
    p.content.add(btn(this, 170, 360, 300, 84, '백업 불러오기', () => { const code = (window.prompt('백업 코드를 붙여 넣어요') || '').trim(); if (!code) return; try { if (!code.startsWith('KB1')) throw 0; const js = decodeURIComponent(escape(atob(code.slice(3)))); const o = JSON.parse(js); if (!o || o.v !== 1) throw 0; localStorage.setItem('kbeauty_v1', js); location.reload(); } catch { toast(this, '코드가 올바르지 않아요', H / 2); } }, { style: 'cream', size: 24 }));
    p.content.add(btn(this, 0, 470, 360, 96, '닫기', () => p.close(), { style: 'cream', size: 30 }));
  }
  // 뒤로가기: 디자인 고르기 취소 → 지난 장을 보고 있으면 지금 장으로 → 첫 화면이면 원어데이로
  onBack() { if (this.picker) { this.picker.cancel(); return true; } if (this.busy) return true; if (this.view !== (this.d.ch || 0)) { this.scene.restart({ view: this.d.ch || 0 }); return true; } return false; }
}
