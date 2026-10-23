// 매장 (원작의 식당 꾸미기): 낡은 가게 → 할 일(코인)로 이야기 · 수리 · 디자인 3종 선택(언제든 무료 변경)
import { W, H } from '../config.js?v=0.30.1';
import { T, C, btn, popup, toast } from '../ui.js?v=0.30.1';
import { load as loadSave } from '../save.js?v=0.30.1';
import { audio } from '../audio.js?v=0.30.1';
import { load, save } from '../save.js?v=0.30.1';
import { hud } from '../hud.js?v=0.30.1';
import { DESIGNS, ROOM, CHAPTERS } from '../data.js?v=0.30.1';
import { daily, season, chapter, curTask, canNextChapter, nextChapter } from '../state.js?v=0.30.1';

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
    this.side(80, top + 110, '📅', '목표', () => this.scene.start('Season'), dn);
    this.side(80, top + 260, '🛍', '상점', () => this.scene.start('Shop'), 0);
    this.side(80, top + 410, '⚙', '설정', () => this.settings(), 0);
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
    else { T(this, W / 2, by + 90, `${CHAPTERS.length}장까지 모두 완성!`, 36, C.ink, { w: 900 }).setDepth(21); T(this, W / 2, by + 145, '4장 「명동 플래그십」을 준비하고 있어요', 26, C.dim, { w: 900 }).setDepth(21); }
    btn(this, W / 2, by + 260, W - 140, 120, '작업대로 가기 · 주문 받기', () => this.scene.start('Board'), { size: 36, style: 'gold' }).setDepth(21);
    this.cameras.main.fadeIn(250, 255, 244, 236); window.__home = this; audio.music(this.C.bgm);
    if (d.task === 0 && this.view === (d.ch || 0) && curTask()) this.time.delayedCall(500, () => this.doTask());
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
    c.add([g, T(this, 0, -6, ic, 48, '#000', { w: 900 }), lg, T(this, 0, 68, n, 22, '#FFFFFF', { w: 900 })]);
    if (badge) c.add([this.add.circle(40, -40, 18, 0xD9573B), T(this, 40, -41, String(badge), 20, '#FFFFFF', { w: 900 })]);
    c.setSize(120, 120).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.busy) { audio.play('sfx_tap', { volume: 0.6 }); this.tweens.add({ targets: c, scale: 0.9, duration: 70, yoyo: true }); fn(); } });
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
  }
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
  // 설정: 배경음 · 효과음 · 진동
  settings() {
    const p = popup(this, 760, 640), rows = [['배경음', () => loadSave().music !== false, () => audio.toggleMusic()], ['효과음', () => loadSave().sfx !== false, () => audio.toggleSfx()], ['진동', () => loadSave().haptic !== false, () => audio.toggleHaptic()]];
    p.content.add(T(this, 0, -230, '설정', 44, C.ink, { w: 900 }));
    rows.forEach(([n, get, flip], k) => {
      const y = -110 + k * 120, c = this.add.container(0, y), g = this.add.graphics(); c.add(g); c.add(T(this, -250, 0, n, 36, C.ink, { ox: 0, w: 800 }));
      const draw = () => { const on = get(); g.clear().fillStyle(on ? 0xE86A8E : 0xE3D3CC, 1).fillRoundedRect(110, -34, 140, 68, 34).fillStyle(0xFFFFFF, 1).fillCircle(on ? 216 : 144, 0, 28); };
      draw(); const hit = this.add.rectangle(180, 0, 160, 80, 0, 0).setInteractive({ useHandCursor: true }); c.add(hit);
      hit.on('pointerup', () => { flip(); draw(); audio.play('sfx_tap', { volume: 0.6 }); }); p.content.add(c);
    });
    p.content.add(btn(this, 0, 240, 360, 100, '닫기', () => p.close(), { style: 'cream', size: 30 }));
  }
  // 뒤로가기: 디자인 고르기 취소 → 지난 장을 보고 있으면 지금 장으로 → 첫 화면이면 원어데이로
  onBack() { if (this.picker) { this.picker.cancel(); return true; } if (this.busy) return true; if (this.view !== (this.d.ch || 0)) { this.scene.restart({ view: this.d.ch || 0 }); return true; } return false; }
}
