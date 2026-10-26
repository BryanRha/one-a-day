// 매장 (원작의 식당 꾸미기): 낡은 가게 → 할 일(코인)로 이야기 · 수리 · 디자인 3종 선택(언제든 무료 변경)
import { W, H } from '../config.js?v=0.57.1';
import { T, R, C, TS, btn, sheet, rbox, chips, stamp, rewardIcons, toast, firstTip } from '../ui.js?v=0.57.1';
import { load as loadSave } from '../save.js?v=0.57.1';
import { audio } from '../audio.js?v=0.57.1';
import { load, save } from '../save.js?v=0.57.1';
import { hud } from '../hud.js?v=0.57.1';
import { DESIGNS, ROOM, CHAPTERS } from '../data.js?v=0.57.1';
import { daily, season, chapter, curTask, canNextChapter, nextChapter, giveReward, rewardText } from '../state.js?v=0.57.1';
import { packCount, claimable, albumClaimable, loginCheck, LOGIN } from '../album.js?v=0.57.1';
import { bingo, spin, dig, DUO, duoState, duoJoin, duoClaim } from '../minigames.js?v=0.57.1';
import { RACE, raceState, raceJoin, raceClaim, LADDER, theme, decoInfo, decoName, THEMES, ladder, ladderReady, ladderClaim, ladderEndsIn, VIP, vip, vipClaim, vipEndsIn, fmtLeft } from '../events.js?v=0.57.1';

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
      T(this, 70, by + 50, `${(d.ch || 0) + 1}장 · ${chapter().n}  ${d.task + 1} / ${tl}`, 28, C.dim, { ox: 0, w: 800 }).setDepth(21);
      const pg = this.add.graphics().setDepth(21); pg.fillStyle(0xF6E2E8, 1).fillRoundedRect(70, by + 172, 560, 12, 6).fillStyle(0xE86A8E, 1).fillRoundedRect(70, by + 172, Math.max(12, 560 * d.task / tl), 12, 6);
      T(this, 70, by + 105, task.n, 40, C.ink, { ox: 0, w: 900 }).setDepth(21);
      T(this, 70, by + 155, task.story ? '이야기 · 다음 장면을 봐요' : '수리 · 디자인을 골라요', 28, C.sub, { ox: 0, w: 800 }).setDepth(21);
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
    const lbl = T(this, 0, 68, n, 24, '#FFFFFF', { w: 900 }); if (lbl.width > 80) { lg.clear().fillStyle(0xE86A8E, 1).fillRoundedRect(-lbl.width / 2 - 10, 50, lbl.width + 20, 38, 19); }
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
    root.add(T(this, 50, y0 + 100, '나중에 눌러서 언제든 무료로 바꿀 수 있어요', 28, C.dim, { ox: 0, w: 800 }));
    const cards = [];
    for (let k = 1; k <= 3; k++) {
      const x = W / 2 + (k - 2) * 330, c = this.add.container(x, y0 + 260), cg = this.add.graphics(); c.add(cg);
      const im = this.add.image(0, -20, `${sp.id}_${k}`); im.setScale(Math.min(220 / im.width, 170 / im.height)); c.add(im); c.add(T(this, 0, 104, DESIGNS[k - 1], 30, C.ink, { w: 900 }));
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
    root.add(btn(this, W - 120, y0 + 60, 160, 72, '취소', cancel, { style: 'cream', size: 28 }));
    root.y = sh; this.tweens.add({ targets: root, y: 0, duration: 260, ease: 'Cubic.easeOut' });
  }
  // 수리 완성: 가구 자리에서 반짝이 터짐 + 먼지 + 화면 살짝 밝게
  celebrate(sp) {
    const x = this.ox + sp.x * this.s, y = this.oy + (sp.hang ? sp.y : sp.y - sp.w * 0.4) * this.s; this.cameras.main.flash(300, 255, 240, 230);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, s = this.add.image(x, y, 'spark').setTint([0xFFE27A, 0xFF9DB6, 0xFFFFFF][k % 3]).setScale(0.5).setDepth(40), r = 120 + (k % 3) * 50; this.tweens.add({ targets: s, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, angle: 200, alpha: 0, scale: 0.15, duration: 700, ease: 'Cubic.easeOut', onComplete: () => s.destroy() }); }
    for (let k = 0; k < 6; k++) { const p = this.add.circle(x + (k - 2.5) * 40, y + 60, 26, 0xFFFFFF, 0.8).setDepth(39); this.tweens.add({ targets: p, y: p.y - 60, scale: 2, alpha: 0, duration: 800, delay: k * 40, onComplete: () => p.destroy() }); }
    const t = T(this, x, y - 120, '완성!', 60, C.rose, { w: 900, shadow: true }).setDepth(41).setScale(0.3); this.tweens.add({ targets: t, scale: 1, duration: 360, ease: 'Back.easeOut' });
  }
  // ── 이벤트 창 (모두 같은 틀: 리본 제목 · ✕ · '?' 다시 보는 안내 · 아래 버튼)
  raceView() {
    const tipL = ['5명이 동시에 25점을 향해 달려요', '주문 1개 = 1점 · 물건 2개짜리는 2점', '상대는 시간이 지나면 점수가 올라요 · 4시간 안에!'], tip = () => firstTip(this, 'race', '뷰티 박람회 레이스', tipL, 'ev_race', true);
    if (firstTip(this, 'race', '뷰티 박람회 레이스', tipL, 'ev_race')) return;
    const s = raceState();
    if (!s.joined || s.claimed) {
      const p = sheet(this, { size: 'L', title: '뷰티 박람회 레이스', sub: `주문으로 ${RACE.goal}점을 가장 먼저! · ${RACE.hours}시간 · 5명`, help: tip });
      const tr = this.add.image(0, 0, 'ev_race'); tr.setScale(240 / tr.height); p.content.add(tr);
      RACE.rewards.slice(0, 3).forEach((r, i) => { const y = 210 + i * 140; p.content.add(rbox(this, 0, y, 860, 124, { fill: i === 0 ? '#FFF1D6' : '#FFF4EC' }));
        const md = this.add.image(-360, y, `medal${i + 1}`); md.setScale(88 / md.height); p.content.add([md, T(this, -290, y, `${i + 1}등`, TS.h2, C.ink, { ox: 0, w: 900 }), chips(this, 170, y - 16, r, { size: 60, bg: false, gap: 130 })]); });
      p.content.add(T(this, 0, 640, `오늘 남은 참가 ${s.left}번`, TS.cap, C.dim, { w: 800 }));
      p.foot([{ t: s.left > 0 ? '참가하기' : '내일 다시', style: s.left > 0 ? 'rose' : 'cream', fn: () => { if (s.left <= 0) return p.close(); raceJoin(); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart({ view: this.view }); } }]);
      return;
    }
    const p = sheet(this, { size: 'L', title: '뷰티 박람회 레이스', sub: s.ended ? '레이스 끝!' : `남은 시간 ${fmtLeft(s.timeLeft)} · 목표 ${RACE.goal}점`, help: tip });
    // 레이스 트랙: 줄마다 얼굴이 점수만큼 앞으로 · 끝에 결승 깃발
    s.rows.forEach((r, i) => { const y = i * 150; p.content.add(rbox(this, 0, y, 900, 134, { fill: r.me ? '#FFE3EC' : '#FFF4EC', line: r.me ? '#E86A8E' : null, lw: 4 }));
      if (i < 3) { const md = this.add.image(-400, y, `medal${i + 1}`); md.setScale(72 / md.height); p.content.add(md); } else p.content.add(T(this, -400, y, `${i + 1}`, TS.h2, C.dim, { w: 900 }));
      p.content.add(T(this, -340, y - 36, r.n, TS.cap, r.me ? C.rose : C.ink, { ox: 0, w: 900 }));
      const x0 = -330, bw = 640, k = Math.min(1, r.pts / RACE.goal), bar = this.add.graphics(); bar.fillStyle(0xF1DCD3, 1).fillRoundedRect(x0, y + 22, bw, 20, 10).fillStyle(r.me ? 0xE86A8E : 0x7CC6A8, 1).fillRoundedRect(x0, y + 22, Math.max(20, bw * k), 20, 10); p.content.add(bar);
      const fx = x0 + Math.max(30, bw * k), f = this.add.image(fx, y + 32, r.face); f.setScale(60 / Math.max(f.width, f.height)); p.content.add([this.add.circle(fx, y + 32, 32, 0xFFFFFF).setStrokeStyle(3, r.me ? 0xE86A8E : 0x7CC6A8), f]);
      p.content.add(T(this, 400, y, `${r.pts}`, TS.h2, r.me ? C.rose : C.brown, { w: 900 })); });
    p.content.add(T(this, 330, -84, `🏁 ${RACE.goal}`, TS.cap, C.dim, { w: 900 }));
    if (s.ended) p.foot([{ t: s.rank <= 5 ? `${s.rank}등 보상 받기` : '닫기', fn: () => { const r = raceClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `${rewardText(r)} 받았어요!`, H / 2); } p.close(); this.time.delayedCall(700, () => this.scene.restart({ view: this.view })); } }]);
    else p.foot([{ t: '작업대로 가기', style: 'gold', fn: () => { p.close(); this.scene.start('Board'); } }]);
  }
  ladderView() {
    const th = theme(), tipL = ['주문하면 물건 단계만큼 축제 토큰이 모여요', '10단계 보상 중 3개는 가게에 놓는 장식!', '축제 테마는 매주 바뀌어요'], tip = () => firstTip(this, 'ladder', '주간 축제 꾸미기', tipL, th.icon, true);
    if (firstTip(this, 'ladder', '주간 축제 꾸미기', tipL, th.icon)) return;
    const l = ladder(), p = sheet(this, { size: 'L', title: `${th.name} 꾸미기`, sub: `주문하면 축제 토큰이 모여요 · 이번 주 남은 ${fmtLeft(ladderEndsIn())}`, help: tip });
    const pi = this.add.image(-40, 0, th.token); pi.setScale(70 / pi.height); p.content.add([pi, T(this, 10, 0, `${l.pts}`, 52, C.rose, { ox: 0, w: 900 })]);
    LADDER.tiers.forEach((need, i) => { const y = 110 + i * 116, r = LADDER.rewards[i], got = l.got.includes(i), ok = l.pts >= need;
      p.content.add(rbox(this, 0, y, 900, 104, { fill: got ? '#F3ECE8' : r.deco ? '#FFF1D6' : '#FFF4EC', line: ok && !got ? '#E86A8E' : '#F1D2C8', lw: ok && !got ? 5 : 2, r: 24 }));
      const ti = this.add.image(-400, y, th.token); ti.setScale(40 / ti.height); p.content.add([ti, T(this, -372, y, `${need}`, TS.cap, C.rose, { ox: 0, w: 900 })]);
      const ch = chips(this, -40, y - 14, r, { size: 52, bg: false, gap: 150, font: 24, done: got }); p.content.add(ch);
      if (got) p.content.add(T(this, 350, y, '받음', TS.cap, C.green, { w: 900 }));
      else if (ok) p.content.add(btn(this, 350, y, 170, 80, '받기', () => { const rr = ladderClaim(i); if (!rr) return; const { deco, ...rest } = rr; giveReward(rest); audio.play(deco ? 'sfx_repair' : 'sfx_coin', { volume: 0.7 }); p.close(); if (deco) toast(this, `「${decoName(deco)}」이 가게에 놓였어요!`, H / 2); this.time.delayedCall(deco ? 900 : 200, () => this.scene.restart({ view: this.view })); }, { size: 30 }));
      else p.content.add(T(this, 350, y, `${need - l.pts} 더`, TS.cap, C.dim, { w: 900 })); });
    p.foot([{ t: '작업대로 가기', style: 'gold', fn: () => { p.close(); this.scene.start('Board'); } }]);
  }
  duoView() {
    const tipL = ['나와 짝꿍 팀 대 상대 팀 (2대2)', '24시간 동안 주문 점수를 합쳐 겨뤄요', '이기면 골드 팩 · 져도 기본 팩'], tip = () => firstTip(this, 'duo', '듀오 뷰티 배틀', tipL, 'duo', true);
    if (firstTip(this, 'duo', '듀오 뷰티 배틀', tipL, 'duo')) return;
    const s = duoState();
    if (!s.joined || s.claimed) {
      const p = sheet(this, { size: 'L', title: '듀오 뷰티 배틀', sub: `짝꿍과 함께 ${DUO.hours}시간 동안 주문 점수를 겨뤄요`, help: tip });
      const im = this.add.image(0, 0, 'duo'); im.setScale(240 / im.height); p.content.add(im);
      [['이기면', DUO.win, '#FFF1D6'], ['져도', DUO.lose, '#FFF4EC']].forEach(([n, r, f], i) => { const y = 210 + i * 140; p.content.add([rbox(this, 0, y, 860, 124, { fill: f }), T(this, -380, y, n, TS.h2, C.ink, { ox: 0, w: 900 }), chips(this, 130, y - 16, r, { size: 60, bg: false, gap: 150 })]); });
      p.foot([{ t: s.can ? '배틀 시작' : '내일 다시', style: s.can ? 'rose' : 'cream', fn: () => { if (!s.can) return p.close(); duoJoin(); audio.play('sfx_levelup', { volume: 0.6 }); p.close(); this.scene.restart({ view: this.view }); } }]);
      return;
    }
    const p = sheet(this, { size: 'L', title: '듀오 뷰티 배틀', sub: s.ended ? (s.team >= s.foe ? '우리 팀 승리!' : '아쉽게 졌어요') : `남은 시간 ${fmtLeft(s.left)} · 주문 1개 = 1점`, help: tip });
    const c = s.c, side = (x, title, faces, names, pts, mine) => { p.content.add(rbox(this, x, 270, 420, 560, { fill: mine ? '#FFE3EC' : '#EDF4FF', r: 30 }));
      p.content.add(T(this, x, 34, title, TS.body, mine ? C.rose : C.blue, { w: 900 }));
      faces.forEach((f, k) => { const im = this.add.image(x, 160 + k * 170, f); im.setScale(130 / Math.max(im.width, im.height)); p.content.add([this.add.circle(x, 160 + k * 170, 70, 0xFFFFFF), im]); if (names[k]) p.content.add(T(this, x, 240 + k * 170, names[k], TS.cap, C.ink, { w: 900 })); });
      p.content.add(T(this, x, 500, `${pts}`, 64, mine ? C.rose : C.blue, { w: 900 })); };
    side(-230, '우리 팀', ['c_soyun_smile', c.mate.face], [`나 ${s.me}`, `${c.mate.n} ${s.mate}`], s.team, true);
    side(230, c.foe.n, c.foe.faces, ['', ''], s.foe, false);
    p.content.add(T(this, 0, 270, 'VS', 56, C.gold, { w: 900, shadow: true }));
    if (s.ended) p.foot([{ t: '보상 받기', fn: () => { const r = duoClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `${rewardText(r)} 받았어요!`, H / 2); } p.close(); this.time.delayedCall(700, () => this.scene.restart({ view: this.view })); } }]);
    else p.foot([{ t: '작업대로 가기', style: 'gold', fn: () => { p.close(); this.scene.start('Board'); } }]);
  }
  vipView() {
    const tipL = ['금테를 두른 주문이 VIP 손님이에요', '한 단계 높은 물건 · 코인 1.5배', '이틀 동안 5번 완료하면 다이아 팩!'], tip = () => firstTip(this, 'vip', 'VIP 손님', tipL, 'ev_vip', true);
    if (firstTip(this, 'vip', 'VIP 손님', tipL, 'ev_vip')) return;
    const v = vip(), p = sheet(this, { size: 'M', title: 'VIP 손님 주문', sub: `금테 두른 주문을 ${VIP.goal}번 완료해요 · 남은 ${fmtLeft(vipEndsIn())}`, help: tip });
    const cr = this.add.image(0, 0, 'ev_vip'); cr.setScale(180 / cr.height); p.content.add(cr);
    for (let i = 0; i < VIP.goal; i++) { const x = (i - 2) * 150, t = this.add.image(x, 190, 'vip_ticket'); t.setScale(110 / t.width); if (i >= v.done) t.setTintFill(0xE3D3CC).setAlpha(0.6); p.content.add(t); if (i < v.done) p.content.add(stamp(this, x + 36, 160, 0.7)); }
    p.content.add(T(this, 0, 290, `${Math.min(v.done, VIP.goal)} / ${VIP.goal}`, TS.h2, C.rose, { w: 900 }));
    p.content.add([rbox(this, 0, 420, 800, 150, { fill: '#FFF1D6' }), T(this, -360, 420, '보상', TS.body, C.brown, { ox: 0, w: 900 }), chips(this, 80, 404, VIP.reward, { size: 60, bg: false, gap: 170 })]);
    const can = v.done >= VIP.goal && !v.claimed;
    p.foot([{ t: v.claimed ? '받았어요' : can ? '보상 받기' : '작업대로 가기', style: can ? 'rose' : v.claimed ? 'cream' : 'gold', fn: () => { if (v.claimed) return p.close(); if (can) { const r = vipClaim(); if (r) { giveReward(r); audio.play('sfx_levelup', { volume: 0.7 }); } p.close(); return this.time.delayedCall(400, () => this.scene.restart({ view: this.view })); } p.close(); this.scene.start('Board'); } }]);
  }
  // 7일 출석: 날마다 보상 그림 · 지난 날은 도장 · 오늘 칸 반짝
  attend() {
    const lg = loginCheck(), p = sheet(this, { size: 'L', title: '7일 출석 선물', sub: '매일 들어오면 선물이 커져요 · 7일마다 다시' });
    LOGIN.forEach((r, i) => { const day = i + 1, big = day === 7, x = big ? 0 : (i % 3 - 1) * 296, y = big ? 520 : Math.floor(i / 3) * 250, w = big ? 872 : 276, h = big ? 220 : 230;
      const past = day < lg.day || day === lg.day && lg.claimed, now = day === lg.day && !lg.claimed;
      const bg = rbox(this, x, y, w, h, { fill: now ? '#FFE3EC' : past ? '#F3ECE8' : big ? '#FFF1D6' : '#FFF4EC', line: now ? '#E86A8E' : '#F1D2C8', lw: now ? 6 : 3 }); p.content.add(bg);
      p.content.add(T(this, big ? x - 360 : x, big ? y : y - 84, `${day}일째`, TS.cap, now ? C.rose : C.dim, { w: 900 }));
      const ch = chips(this, big ? x + 60 : x, big ? y - 18 : y + 4, r, { size: big ? 88 : 72, bg: false, gap: big ? 200 : 120, font: 24 }); if (past) ch.setAlpha(0.45); p.content.add(ch);
      if (past) p.content.add(stamp(this, x + w / 2 - 40, y - h / 2 + 40, 1.1));
      if (now) this.tweens.add({ targets: bg, alpha: 0.7, duration: 500, yoyo: true, repeat: -1 }); });
    p.foot([{ t: lg.claimed ? '내일 또 만나요' : '받기', style: lg.claimed ? 'cream' : 'rose', fn: () => { if (lg.claimed) return p.close(); const r = LOGIN[lg.day - 1]; lg.claimed = true; giveReward(r); save(); audio.play('sfx_levelup', { volume: 0.7 }); audio.duck(2400); p.close(); toast(this, `${rewardText(r)} 받았어요!`, H / 2); this.time.delayedCall(900, () => this.scene.restart({ view: this.view })); } }]);
  }
  // 설정: 배경음 · 효과음 · 진동 · 가게 장식 · 백업
  settings() {
    const p = sheet(this, { size: 'S', title: '설정' }), rows = [['배경음', () => loadSave().music !== false, () => audio.toggleMusic()], ['효과음', () => loadSave().sfx !== false, () => audio.toggleSfx()], ['진동', () => loadSave().haptic !== false, () => audio.toggleHaptic()]];
    rows.forEach(([n, get, flip], k) => {
      const y = k * 120, c = this.add.container(0, y), g = this.add.graphics(); c.add(rbox(this, 0, 0, 640, 104, { fill: '#FFF4EC' })); c.add(g); c.add(T(this, -280, 0, n, TS.h2 - 2, C.ink, { ox: 0, w: 800 }));
      const draw = () => { const on = get(); g.clear().fillStyle(on ? 0xE86A8E : 0xE3D3CC, 1).fillRoundedRect(110, -34, 140, 68, 34).fillStyle(0xFFFFFF, 1).fillCircle(on ? 216 : 144, 0, 28); };
      draw(); const hit = this.add.rectangle(180, 0, 160, 80, 0, 0).setInteractive({ useHandCursor: true }); c.add(hit);
      hit.on('pointerup', () => { flip(); draw(); audio.play('sfx_tap', { volume: 0.6 }); }); p.content.add(c);
    });
    let y = 360;
    // 가게 장식 테마 (받은 축제 장식 중에서 고르기)
    const owned = [...new Set((this.d.deco || []).map(k => decoInfo(k).theme))];
    if (owned.length) { const opts = [...owned, 'off'], nm = id => id === 'off' ? '끄기' : THEMES.find(t => t.id === id).name; p.content.add([rbox(this, 0, y, 640, 104, { fill: '#FFF4EC' }), T(this, -280, y, '가게 장식', TS.h2 - 2, C.ink, { ox: 0, w: 800 })]);
      const b = btn(this, 170, y, 260, 80, nm(this.d.decoShow || owned[0]), () => { const i = opts.indexOf(this.d.decoShow || owned[0]); this.d.decoShow = opts[(i + 1) % opts.length]; save(); b.setLabel(nm(this.d.decoShow)); this.drawRoom(); }, { style: 'cream', size: 28 }); p.content.add(b); y += 120; }
    // 저장 백업: 코드로 복사 · 붙여 넣어 불러오기 (폰을 바꾸거나 기록을 지웠을 때)
    p.content.add(T(this, 0, y + 10, '기록 백업', TS.cap, C.dim, { w: 900 }));
    p.content.add(btn(this, -160, y + 90, 300, 96, '백업 코드 복사', async () => { const code = 'KB1' + btoa(unescape(encodeURIComponent(localStorage.getItem('kbeauty_v1') || ''))); try { await navigator.clipboard.writeText(code); toast(this, '백업 코드를 복사했어요 · 메모장 등에 보관해요', H / 2); } catch { window.prompt('이 코드를 복사해 보관해요', code); } }, { style: 'cream', size: 28 }));
    p.content.add(btn(this, 160, y + 90, 300, 96, '백업 불러오기', () => { const code = (window.prompt('백업 코드를 붙여 넣어요') || '').trim(); if (!code) return; try { if (!code.startsWith('KB1')) throw 0; const js = decodeURIComponent(escape(atob(code.slice(3)))); const o = JSON.parse(js); if (!o || o.v !== 1) throw 0; localStorage.setItem('kbeauty_v1', js); location.reload(); } catch { toast(this, '코드가 올바르지 않아요', H / 2); } }, { style: 'cream', size: 28 }));
    p.foot([{ t: '닫기', style: 'cream' }]);
  }
  // 뒤로가기: 디자인 고르기 취소 → 지난 장을 보고 있으면 지금 장으로 → 첫 화면이면 원어데이로
  onBack() { if (this.picker) { this.picker.cancel(); return true; } if (this.busy) return true; if (this.view !== (this.d.ch || 0)) { this.scene.restart({ view: this.d.ch || 0 }); return true; } return false; }
}
