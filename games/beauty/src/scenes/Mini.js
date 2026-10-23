// 미니게임 화면: 빙고 · 룰렛 · 보물 찾기 (위 탭으로 바꿈)
import { W, H } from '../config.js?v=0.35.1';
import { T, C, btn, iconBtn, popup, toast, firstTip } from '../ui.js?v=0.35.1';
import { audio } from '../audio.js?v=0.35.1';
import { goPrev } from '../nav.js?v=0.35.1';
import { hud } from '../hud.js?v=0.35.1';
import { giveReward, rewardText } from '../state.js?v=0.35.1';
import { BINGO, bingo, bingoDraw, bingoLines, WHEEL, spin, spinRoll, DIG, dig, digOpen, digNext, ORDERS_PER_SHOVEL } from '../minigames.js?v=0.35.1';

const TABS = [['bingo', '설화 빙고', 'bingo_ball'], ['wheel', '행운 룰렛', 'roulette'], ['dig', '보물 찾기', 'shovel']];
export class MiniScene extends Phaser.Scene {
  constructor() { super('Mini'); }
  create(data) {
    audio.music('bgm_board'); this.tab = (data && data.tab) || 'bingo'; this.busy = false;
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    TABS.forEach(([k, n, ic], i) => { const x = 190 + i * 350, on = k === this.tab, g = this.add.graphics(); g.fillStyle(on ? 0xE86A8E : 0xFFFFFF, 1).fillRoundedRect(x - 160, 160, 320, 100, 50).lineStyle(3, 0xF1C6CF, 1).strokeRoundedRect(x - 160, 160, 320, 100, 50);
      const im = this.add.image(x - 100, 210, ic); im.setScale(64 / im.height); T(this, x + 30, 210, n, 28, on ? '#FFFFFF' : C.ink, { w: 900 });
      this.add.zone(x, 210, 320, 100).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.busy && k !== this.tab) { audio.play('sfx_tap', { volume: 0.6 }); this.scene.restart({ tab: k }); } }); });
    this.root = this.add.container(0, 0); this[this.tab]();
    const TIP = { bingo: ['설화 빙고', ['주문을 하나 완료할 때마다 빙고 공 1개', '공을 뽑으면 칸에 도장 · 한 줄마다 보상', '매주 새 판이 열려요'], 'bingo_ball'], wheel: ['행운 룰렛', ['5단계 이상을 만들거나 레벨업하면 토큰', '칸마다 확률이 적혀 있어요', '보물 상자 대박을 노려 봐요!'], 'roulette'], dig: ['공방 보물 찾기', ['주문 3번마다 삽 1개 · 레벨업하면 삽 2개', '흙을 파서 열쇠 조각 3개를 찾으면 보물', '보물을 열면 다음 마당이 열려요'], 'shovel'] }[this.tab];
    firstTip(this, `mini_${this.tab}`, TIP[0], TIP[1], TIP[2]);
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__mini = this;
  }
  reward(r, x, y) { giveReward(r); this.hud.update(); const t = T(this, x, y, `${rewardText(r)}!`, 34, C.rose, { w: 900, shadow: true }).setDepth(60); this.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1600, delay: 500, onComplete: () => t.destroy() }); }
  // ── 빙고: 5×5 카드 · 공을 뽑으면 칸이 도장으로 찍힘
  bingo() {
    const b = bingo(), y0 = 330, cs = 168, x0 = (W - cs * 5) / 2;
    T(this, W / 2, y0 - 20, `주문마다 빙고 공 1개 · 줄마다 보상 · 다 채우면 ${rewardText(BINGO.full)}`, 22, C.dim, { w: 800 });
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(x0 - 16, y0 + 10, cs * 5 + 32, cs * 5 + 32, 30).lineStyle(4, 0xF1C6CF, 1).strokeRoundedRect(x0 - 16, y0 + 10, cs * 5 + 32, cs * 5 + 32, 30);
    this.marks = [];
    b.cells.forEach((key, i) => { const x = x0 + (i % 5) * cs + cs / 2, y = y0 + 26 + Math.floor(i / 5) * cs + cs / 2, on = b.marked.includes(i);
      const cg = this.add.graphics(); cg.fillStyle(on ? 0xFFE3EC : 0xFFF8F2, 1).fillRoundedRect(x - cs / 2 + 6, y - cs / 2 + 6, cs - 12, cs - 12, 22);
      if (i === 12) T(this, x, y, '설화', 32, C.rose, { w: 900 }); else { const im = this.add.image(x, y, key); im.setScale((cs - 50) / Math.max(im.width, im.height)); if (on) im.setAlpha(0.45); }
      const st = this.add.image(x, y, 'bingo_ball').setVisible(on); st.setScale(on ? 70 / st.height : 0.01); this.marks[i] = st; });
    b.lines.forEach(li => this.lineFx(bingoLines()[li], x0, y0 + 26, cs, false));
    const by = y0 + cs * 5 + 110, ball = this.add.image(W / 2 - 230, by, 'bingo_ball'); ball.setScale(110 / ball.height);
    T(this, W / 2 - 150, by, `× ${b.balls}`, 44, C.rose, { ox: 0, w: 900 });
    btn(this, W / 2 + 200, by, 360, 120, b.full ? '완성!' : '공 뽑기', () => this.drawBall(x0, y0 + 26, cs), { size: 36, style: b.balls && !b.full ? 'rose' : 'cream' });
    T(this, W / 2, by + 110, `완성한 줄 ${b.lines.length}개 · 매주 월요일 새 판`, 24, C.dim, { w: 800 });
  }
  lineFx(L, x0, y0, cs, anim) { const g = this.add.graphics().setDepth(5); g.lineStyle(14, 0xE86A8E, 0.55); const p = i => [x0 + (i % 5) * cs + cs / 2, y0 + Math.floor(i / 5) * cs + cs / 2], a = p(L[0]), z = p(L[4]); g.lineBetween(a[0], a[1], z[0], z[1]); if (anim) { g.setAlpha(0); this.tweens.add({ targets: g, alpha: 1, duration: 300 }); } }
  drawBall(x0, y0, cs) {
    if (this.busy) return; const b = bingo(); if (b.full) return toast(this, '이번 주 빙고를 다 채웠어요!'); if (!b.balls) return toast(this, '빙고 공이 없어요 · 주문을 완료하면 받아요');
    const res = bingoDraw(); if (!res) return; this.busy = true; audio.play('sfx_bubble', { volume: 0.6 });
    // 칸들이 차례로 반짝이다가 뽑힌 칸에 도장
    const free = [...Array(25).keys()].filter(i => i !== res.cell && !b.marked.includes(i) || i === res.cell), seq = [...Array(8)].map(() => free[Math.floor(Math.random() * free.length)]).concat([res.cell]);
    const hl = this.add.rectangle(0, 0, cs - 12, cs - 12).setStrokeStyle(8, 0xF0B65A).setDepth(6);
    seq.forEach((c, k) => this.time.delayedCall(k * 90, () => { hl.setPosition(x0 + (c % 5) * cs + cs / 2, y0 + Math.floor(c / 5) * cs + cs / 2); audio.play('sfx_tap', { volume: 0.4, gap: 20 }); }));
    this.time.delayedCall(seq.length * 90 + 100, () => { hl.destroy(); const st = this.marks[res.cell]; st.setVisible(true); this.tweens.add({ targets: st, scale: 70 / st.height, duration: 260, ease: 'Back.easeOut' }); audio.play('sfx_merge', { volume: 0.6 }); audio.buzz(15);
      res.newLines.forEach(li => this.lineFx(bingoLines()[li], x0, y0, cs, true));
      res.rewards.forEach((r, k) => this.time.delayedCall(400 + k * 500, () => { audio.play(res.full ? 'sfx_levelup' : 'sfx_order', { volume: 0.7 }); this.reward(r, W / 2, H / 2 - 100 + k * 80); }));
      this.time.delayedCall(500 + res.rewards.length * 500, () => { this.busy = false; this.scene.restart({ tab: 'bingo' }); }); });
  }
  // ── 룰렛: 8칸 · 돌아가다 멈춤
  wheel() {
    const s = spin(), cx = W / 2, cy = 820, R = 380, tot = WHEEL.reduce((a, x) => a + x.w, 0);
    T(this, W / 2, 320, '5단계 이상 합치기 · 레벨업마다 토큰 1개', 24, C.dim, { w: 800 });
    const wheel = this.add.container(cx, cy), g = this.add.graphics(); wheel.add(g); const n = WHEEL.length, seg = Math.PI * 2 / n;
    WHEEL.forEach((w, i) => { const a0 = -Math.PI / 2 + i * seg; g.fillStyle(w.c, 1).slice(0, 0, R, a0, a0 + seg).fillPath(); g.lineStyle(4, 0xFFFFFF, 1).beginPath().moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).strokePath();
      const am = a0 + seg / 2, tx = Math.cos(am) * R * 0.66, ty = Math.sin(am) * R * 0.66, t = T(this, tx, ty, rewardText(w.r).replace(' ', '\n'), 24, w.jackpot ? C.rose : C.ink, { w: 900 }); t.setRotation(am + Math.PI / 2); wheel.add(t);
      wheel.add(T(this, Math.cos(am) * R * 0.88, Math.sin(am) * R * 0.88, `${Math.round(w.w / tot * 100)}%`, 18, C.dim, { w: 800 }).setRotation(am + Math.PI / 2)); });
    g.lineStyle(14, 0xF0B65A, 1).strokeCircle(0, 0, R); wheel.add(this.add.circle(0, 0, 60, 0xE86A8E).setStrokeStyle(8, 0xFFFFFF)); wheel.add(T(this, 0, 0, '★', 48, '#FFFFFF', { w: 900 }));
    const ptr = this.add.triangle(cx, cy - R - 20, -36, -40, 36, -40, 0, 30, 0xE86A8E).setStrokeStyle(5, 0xFFFFFF); ptr.setDepth(3);
    this.wheelC = wheel; const tk = this.add.image(W / 2 - 230, cy + R + 140, 'roulette'); tk.setScale(100 / tk.height); T(this, W / 2 - 160, cy + R + 140, `× ${s.tokens}`, 44, C.rose, { ox: 0, w: 900 });
    btn(this, W / 2 + 200, cy + R + 140, 340, 120, '돌리기', () => this.roll(), { size: 38, style: s.tokens ? 'rose' : 'cream' });
  }
  roll() {
    if (this.busy) return; if (!spin().tokens) return toast(this, '룰렛 토큰이 없어요 · 5단계 이상을 만들어 보세요');
    const i = spinRoll(); if (i === null) return; this.busy = true; const n = WHEEL.length, seg = 360 / n, target = 360 * 6 + (360 - (i * seg + seg / 2));
    audio.play('sfx_gen', { volume: 0.5 }); let last = 0;
    this.tweens.add({ targets: this.wheelC, angle: target, duration: 3600, ease: 'Cubic.easeOut', onUpdate: () => { const a = Math.floor(this.wheelC.angle / seg); if (a !== last) { last = a; audio.play('sfx_tap', { volume: 0.35, gap: 30 }); } },
      onComplete: () => { const w = WHEEL[i]; audio.play(w.jackpot ? 'sfx_levelup' : 'sfx_order', { volume: 0.7 }); audio.buzz(w.jackpot ? [30, 50, 30, 50, 60] : 20); this.reward(w.r, W / 2, 820); this.time.delayedCall(1400, () => { this.busy = false; this.scene.restart({ tab: 'wheel' }); }); } });
  }
  // ── 보물 찾기: 5×5 흙 · 삽으로 파기 · 열쇠 조각 3개
  dig() {
    const g0 = dig(), b = g0.board, y0 = 360, cs = 168, x0 = (W - cs * 5) / 2;
    T(this, W / 2, 310, `주문 ${ORDERS_PER_SHOVEL}번마다 삽 1개 · 열쇠 조각 3개를 찾으면 보물!`, 24, C.dim, { w: 800 });
    T(this, W / 2, y0, `${b.round}번째 공방 마당`, 30, C.brown, { w: 900 });
    for (let k = 0; k < 3; k++) { const im = this.add.image(W / 2 - 160 + k * 160, y0 + 70, `key${k + 1}`); im.setScale(90 / im.width); if (k >= b.keys) im.setTintFill(0xD9C9C2).setAlpha(0.6); }
    const gy = y0 + 140, g = this.add.graphics(); g.fillStyle(0x8BC07A, 1).fillRoundedRect(x0 - 16, gy - 16, cs * 5 + 32, cs * 5 + 32, 30);
    b.cells.forEach((c, i) => { const x = x0 + (i % 5) * cs + cs / 2, y = gy + Math.floor(i / 5) * cs + cs / 2, open = b.open.includes(i);
      if (open) { g.fillStyle(0xE8D2B8, 1).fillRoundedRect(x - cs / 2 + 6, y - cs / 2 + 6, cs - 12, cs - 12, 20); if (c) { const im = this.add.image(x, y, c.key || (c.r.items ? c.r.items[0] : c.r.gems ? 'gem' : c.r.energy ? 'energy' : 'coin')); im.setScale((cs - 60) / Math.max(im.width, im.height)); } }
      else { const im = this.add.image(x, y + 6, 'dirt'); im.setScale((cs - 14) / im.width); this.add.zone(x, y, cs, cs).setInteractive({ useHandCursor: true }).on('pointerup', () => this.dig1(i, x, y, im)); } });
    const by = gy + cs * 5 + 90, sh = this.add.image(W / 2 - 230, by, 'shovel'); sh.setScale(100 / sh.height); T(this, W / 2 - 160, by, `× ${g0.shovels}`, 44, C.rose, { ox: 0, w: 900 });
    if (b.done) btn(this, W / 2 + 200, by, 360, 110, '다음 마당', () => { digNext(); this.scene.restart({ tab: 'dig' }); }, { size: 32 });
    else T(this, W / 2 + 200, by, `보물: ${rewardText(DIG.treasure)}`, 22, C.brown, { w: 800, wrap: 400 });
  }
  dig1(i, x, y, im) {
    if (this.busy) return; if (!dig().shovels) return toast(this, '삽이 없어요 · 주문을 완료하면 받아요'); const res = digOpen(i); if (!res) return; this.busy = true;
    audio.play('sfx_drop', { volume: 0.7, rate: 0.8 }); audio.buzz(12);
    this.tweens.add({ targets: im, y: y - 20, scale: im.scale * 1.15, duration: 120, yoyo: true, repeat: 1, onComplete: () => { im.destroy();
      for (let k = 0; k < 8; k++) { const p = this.add.circle(x, y, 10, 0x8A5A44); const a = Math.random() * Math.PI * 2; this.tweens.add({ targets: p, x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 90, alpha: 0, duration: 400, onComplete: () => p.destroy() }); }
      const c = res.cell; if (c && c.r) { audio.play('sfx_coin', { volume: 0.6 }); this.reward(c.r, x, y - 40); } else if (c && c.key) { audio.play('sfx_merge_big', { volume: 0.7 }); T(this, x, y - 60, '열쇠 조각!', 30, C.gold, { w: 900, shadow: true }).setDepth(60); }
      this.time.delayedCall(900, () => { if (res.treasure) { const p = popup(this, 800, 700); p.content.add(T(this, 0, -260, '보물 상자를 열었어요!', 44, C.rose, { w: 900 })); const ch = this.add.image(0, -60, 'chest'); ch.setScale(240 / ch.height); p.content.add(ch); p.content.add(T(this, 0, 120, rewardText(DIG.treasure), 32, C.brown, { w: 900 }));
        audio.play('sfx_levelup', { volume: 0.8 }); audio.duck(2400); p.content.add(btn(this, 0, 240, 360, 100, '받기', () => { giveReward(DIG.treasure); p.close(); this.busy = false; this.scene.restart({ tab: 'dig' }); }, { size: 32 })); }
        else { this.busy = false; this.scene.restart({ tab: 'dig' }); } }); } });
  }
  onBack() { return goPrev(this); }
}
