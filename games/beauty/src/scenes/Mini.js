// 놀이: 설화 빙고 · 행운 룰렛 · 공방 보물 찾기
//   화면마다 같은 틀 — 위: 하는 법 + 내 재료(몇 개 · 어디서 얻나) / 가운데: 판(보상이 그림으로 보임) / 아래: 큰 버튼
import { W, H } from '../config.js?v=0.44.4';
import { T, C, btn, iconBtn, popup, toast, firstTip } from '../ui.js?v=0.44.4';
import { audio } from '../audio.js?v=0.44.4';
import { goPrev } from '../nav.js?v=0.44.4';
import { hud } from '../hud.js?v=0.44.4';
import { giveReward } from '../state.js?v=0.44.4';
import { PACKS } from '../album.js?v=0.44.4';
import { SPECIAL } from '../data.js?v=0.44.4';
import { LINE_R, BINGO, bingo, bingoDraw, bingoLines, WHEEL, spin, spinRoll, DIG, dig, digOpen, digNext, ORDERS_PER_SHOVEL } from '../minigames.js?v=0.44.4';

// 보상 → 그림 + 짧은 글 목록
export function rewardIcons(r) {
  const out = [];
  if (r.energy) out.push(['energy', `${r.energy}`]); if (r.coins) out.push(['coin', `${r.coins}`]); if (r.gems) out.push(['gem', `${r.gems}`]);
  if (r.pack) out.push([PACKS[r.pack].img, PACKS[r.pack].n]); if (r.joker) out.push(['joker', '조커']); if (r.gift) out.push(['gen_gift', '선물']);
  const cnt = {}; for (const k of r.items || []) cnt[k] = (cnt[k] || 0) + 1;
  for (const [k, n] of Object.entries(cnt)) out.push([k, (SPECIAL[k] ? SPECIAL[k].n.replace('화장품 ', '') : k) + (n > 1 ? ` ×${n}` : '')]);
  return out;
}
// 보상 칩: 그림을 가로로 · 아래 글
function chip(sc, x, y, r, o = {}) {
  const c = sc.add.container(x, y), ic = rewardIcons(r), s = o.size || 60, gap = s + 14, w0 = ic.length * gap;
  if (o.bg !== false) { const g = sc.add.graphics(); g.fillStyle(o.done ? 0xE9F5EC : 0xFFFFFF, 1).fillRoundedRect(-w0 / 2 - 12, -s / 2 - 12, w0 + 24, s + 52, 18).lineStyle(3, o.done ? 0x7CC6A8 : 0xF1D2C8, 1).strokeRoundedRect(-w0 / 2 - 12, -s / 2 - 12, w0 + 24, s + 52, 18); c.add(g); }
  ic.forEach(([img, t], i) => { const x2 = -w0 / 2 + gap / 2 + i * gap, im = sc.add.image(x2, 0, img); im.setScale(s / Math.max(im.width, im.height)); if (o.done) im.setAlpha(0.45); c.add(im); c.add(T(sc, x2, s / 2 + 18, t, o.font || 18, o.done ? C.dim : C.brown, { w: 900 })); });
  if (o.done) c.add(T(sc, w0 / 2 + 2, -s / 2 + 2, '✓', 30, C.green, { w: 900 }));
  return c;
}
// 받은 보상 창 (그림으로 크게)
function gain(sc, list, title, done) {
  audio.play(list.length > 1 || title.includes('!') ? 'sfx_levelup' : 'sfx_order', { volume: 0.7 }); audio.duck(2000);
  const p = popup(sc, 900, 420 + list.length * 170, { closable: false }); p.content.add(T(sc, 0, -(110 + list.length * 85), title, 44, C.rose, { w: 900 }));
  list.forEach((r, i) => p.content.add(chip(sc, 0, -(list.length * 85) + 40 + i * 170, r, { size: 96, font: 24 })));
  p.content.add(btn(sc, 0, 120 + list.length * 85, 360, 100, '받기', () => { list.forEach(r => giveReward(r)); sc.hud.update(); p.close(); done && done(); }, { size: 34 }));
}

const TABS = [['bingo', '설화 빙고', 'bingo_ball'], ['wheel', '행운 룰렛', 'roulette'], ['dig', '보물 찾기', 'shovel']];
export class MiniScene extends Phaser.Scene {
  constructor() { super('Mini'); }
  create(data) {
    audio.music('bgm_board'); this.tab = (data && data.tab) || 'bingo'; this.busy = false;
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    const have = { bingo: bingo().balls, wheel: spin().tokens, dig: dig().shovels };
    TABS.forEach(([k, n, ic], i) => { const x = 190 + i * 350, on = k === this.tab, g = this.add.graphics(); g.fillStyle(on ? 0xE86A8E : 0xFFFFFF, 1).fillRoundedRect(x - 160, 160, 320, 96, 48).lineStyle(3, 0xF1C6CF, 1).strokeRoundedRect(x - 160, 160, 320, 96, 48);
      const im = this.add.image(x - 105, 208, ic); im.setScale(60 / im.height); T(this, x + 25, 208, n, 28, on ? '#FFFFFF' : C.ink, { w: 900 });
      if (have[k] > 0) { this.add.circle(x + 140, 172, 22, 0xD9573B).setStrokeStyle(3, 0xFFFFFF); T(this, x + 140, 171, `${have[k]}`, 20, '#FFFFFF', { w: 900 }); }
      this.add.zone(x, 208, 320, 96).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.busy && k !== this.tab) { audio.play('sfx_tap', { volume: 0.6 }); this.scene.restart({ tab: k }); } }); });
    this[this.tab]();
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__mini = this;
    const TIP = { bingo: ['설화 빙고', ['주문을 1개 끝낼 때마다 빙고 공 1개', '공을 뽑으면 그 숫자 칸에 도장이 찍혀요', '줄이 완성되면 옆에 그려진 보상을 받아요'], 'bingo_ball'],
      wheel: ['행운 룰렛', ['5단계 이상 물건을 만들거나 레벨업하면 토큰', '돌리면 멈춘 칸의 보상을 받아요', '칸마다 나올 확률이 아래에 적혀 있어요'], 'roulette'],
      dig: ['공방 보물 찾기', ['주문 3번마다 삽 1개 · 레벨업하면 삽 2개', '흙을 하나씩 파서 열쇠 조각 3개를 찾아요', '다 모으면 보물 상자! 다음 마당이 열려요'], 'shovel'] }[this.tab];
    firstTip(this, `mini2_${this.tab}`, TIP[0], TIP[1], TIP[2]);
  }
  // 위 안내 카드: 하는 법 두 줄 + 내 재료
  header(img, title, how, res, n, where) {
    const y = 290, g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(30, y, W - 60, 230, 30).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(30, y, W - 60, 230, 30);
    T(this, 70, y + 48, title, 36, C.ink, { ox: 0, w: 900 }); how.forEach((h, i) => T(this, 70, y + 105 + i * 44, `· ${h}`, 24, C.brown, { ox: 0, w: 800 }));
    g.fillStyle(0xFFF1F5, 1).fillRoundedRect(W - 330, y + 22, 270, 186, 26);
    const im = this.add.image(W - 255, y + 95, img); im.setScale(90 / im.height); T(this, W - 190, y + 95, `× ${n}`, 46, n ? C.rose : C.dim, { ox: 0, w: 900 });
    T(this, W - 195, y + 160, `${res} · ${where}`, 18, C.dim, { w: 800, wrap: 250 });
  }
  // ── 빙고
  bingo() {
    const b = bingo(), cs = 156, x0 = 50, L = bingoLines(), spare = Math.max(0, H - 2000), gy = 650 + spare * 0.25;
    this.header('bingo_ball', '설화 빙고', ['공을 뽑으면 그 숫자 칸에 도장', '줄이 다 차면 줄 끝에 있는 보상을 받아요'], '빙고 공', b.balls, '주문 1개 = 1개');
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(x0 - 14, gy - 14, cs * 5 + 28, cs * 5 + 28, 28).lineStyle(4, 0xF1C6CF, 1).strokeRoundedRect(x0 - 14, gy - 14, cs * 5 + 28, cs * 5 + 28, 28);
    this.cellAt = i => [x0 + (i % 5) * cs + cs / 2, gy + Math.floor(i / 5) * cs + cs / 2];
    this.stamps = [];
    b.cells.forEach((num, i) => { const [x, y] = this.cellAt(i), on = b.marked.includes(i); g.fillStyle(on ? 0xFFE3EC : (Math.floor(i / 5) + i) % 2 ? 0xFFF8F2 : 0xFFF1E6, 1).fillRoundedRect(x - cs / 2 + 5, y - cs / 2 + 5, cs - 10, cs - 10, 20);
      if (i === 12) { const im = this.add.image(x, y, 'camellia3'); im.setScale(90 / im.height); T(this, x, y + 46, 'FREE', 18, C.rose, { w: 900 }); }
      else T(this, x, y, `${num}`, 48, on ? '#E8B4C4' : C.ink, { w: 900 });
      const st = this.add.container(x, y).setVisible(on && i !== 12), sb = this.add.image(0, 0, 'bingo_ball'); sb.setScale(96 / sb.height); st.add([sb, T(this, 0, 2, `${num}`, 30, '#FFFFFF', { w: 900, shadow: true })]); this.stamps[i] = st; });
    b.lines.forEach(li => this.lineFx(L[li]));
    // 줄 보상: 가로(오른쪽) · 세로(아래) · 대각선(오른쪽 위 ↙ · 오른쪽 아래 ↘)
    const rx = x0 + cs * 5 + 95, by = gy + cs * 5 + 78, cz = 54;
    for (let i = 0; i < 5; i++) { chip(this, rx, gy + i * cs + cs / 2 - 14, LINE_R[i], { size: cz, done: b.lines.includes(i), font: 17 }); chip(this, x0 + i * cs + cs / 2, by, LINE_R[5 + i], { size: cz, done: b.lines.includes(5 + i), font: 17 }); }
    chip(this, rx, by, LINE_R[10], { size: cz, done: b.lines.includes(10), font: 17 }); T(this, rx - 62, by - 56, '↘', 30, C.rose, { w: 900 });
    chip(this, rx, gy - 66, LINE_R[11], { size: cz, done: b.lines.includes(11), font: 17 }); T(this, rx - 62, gy - 118, '↙', 30, C.rose, { w: 900 });
    // 다 채우면
    const fy = by + 160 + spare * 0.2, fg = this.add.graphics(); fg.fillStyle(b.full ? 0xE9F5EC : 0xFFF1D6, 1).fillRoundedRect(40, fy - 70, W - 80, 140, 28);
    T(this, 80, fy, b.full ? '25칸 모두 채움 ✓' : `25칸 모두 채우면 (${b.marked.length}/25)`, 28, C.ink, { ox: 0, w: 900 }); chip(this, W - 260, fy - 14, BINGO.full, { size: 64, bg: false, done: b.full });
    btn(this, W / 2, Math.min(H - 110, fy + 190 + spare * 0.2), 600, 130, b.full ? '이번 주 완성! 월요일 새 판' : b.balls ? `공 뽑기 (남은 공 ${b.balls})` : '공이 없어요 · 주문하고 와요', () => this.drawBall(), { size: 34, style: b.balls && !b.full ? 'rose' : 'cream' });
  }
  lineFx(Ln, anim) { const g = this.add.graphics().setDepth(5), a = this.cellAt(Ln[0]), z = this.cellAt(Ln[4]); g.lineStyle(16, 0xE86A8E, 0.5); g.lineBetween(a[0], a[1], z[0], z[1]); if (anim) { g.setAlpha(0); this.tweens.add({ targets: g, alpha: 1, duration: 300, repeat: 2, yoyo: true }); } }
  drawBall() {
    if (this.busy) return; const b = bingo(); if (b.full) return toast(this, '이번 주 빙고를 다 채웠어요!'); if (!b.balls) return toast(this, '빙고 공이 없어요 · 작업대에서 주문을 끝내면 받아요');
    const res = bingoDraw(); if (!res) return; this.busy = true; audio.play('sfx_bubble', { volume: 0.6 });
    // 큰 공이 굴러 나와 숫자를 보여 준 뒤, 그 칸으로 날아가 도장
    const ball = this.add.container(W / 2, H / 2).setDepth(80), bi = this.add.image(0, 0, 'bingo_ball'); bi.setScale(240 / bi.height); ball.add([bi, T(this, 0, 4, `${res.num}`, 90, '#FFFFFF', { w: 900, shadow: true })]); ball.setScale(0.2);
    this.tweens.add({ targets: ball, scale: 1, angle: 360, duration: 500, ease: 'Back.easeOut', onComplete: () => {
      const [cx, cy] = this.cellAt(res.cell); this.time.delayedCall(450, () => this.tweens.add({ targets: ball, x: cx, y: cy, scale: 0.35, duration: 380, ease: 'Cubic.easeIn', onComplete: () => {
        ball.destroy(); const st = this.stamps[res.cell]; st.setVisible(true).setScale(0.01); this.tweens.add({ targets: st, scale: 1, duration: 220, ease: 'Back.easeOut' }); audio.play('sfx_merge', { volume: 0.6 }); audio.buzz(15);
        res.newLines.forEach(li => this.lineFx(bingoLines()[li], true));
        if (res.rewards.length) this.time.delayedCall(700, () => gain(this, res.rewards, res.full ? '빙고 완성!' : res.newLines.length > 1 ? `${res.newLines.length}줄 빙고!` : '빙고!', () => this.scene.restart({ tab: 'bingo' })));
        else this.time.delayedCall(500, () => this.scene.restart({ tab: 'bingo' })); } })); } });
  }
  // ── 룰렛: 칸마다 보상 그림 · 아래 확률표
  wheel() {
    const s = spin(), spare = Math.max(0, H - 2000), cx = W / 2, cy = 930 + spare * 0.25, R = 350, tot = WHEEL.reduce((a, x) => a + x.w, 0), n = WHEEL.length, seg = Math.PI * 2 / n;
    this.header('roulette', '행운 룰렛', ['토큰 1개로 한 번 돌려요', '멈춘 칸의 보상을 받아요 · 확률은 아래 표'], '토큰', s.tokens, '5단계 이상 만들기 · 레벨업');
    const wheel = this.add.container(cx, cy), g = this.add.graphics(); wheel.add(g);
    WHEEL.forEach((w, i) => { const a0 = -Math.PI / 2 + i * seg; g.fillStyle(w.c, 1).slice(0, 0, R, a0, a0 + seg).fillPath(); g.lineStyle(5, 0xFFFFFF, 1).beginPath().moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).strokePath();
      const am = a0 + seg / 2, ic = rewardIcons(w.r);
      ic.slice(0, 2).forEach(([img, t], k) => { const rr = R * (ic.length > 1 ? 0.74 - k * 0.24 : 0.64), im = this.add.image(Math.cos(am) * rr, Math.sin(am) * rr, img); im.setScale((ic.length > 1 ? 60 : 84) / Math.max(im.width, im.height)).setRotation(am + Math.PI / 2); wheel.add(im); });
      if (w.jackpot) { const st = T(this, Math.cos(am) * R * 0.32, Math.sin(am) * R * 0.32, '대박', 22, C.rose, { w: 900 }); st.setRotation(am + Math.PI / 2); wheel.add(st); } });
    g.lineStyle(16, 0xF0B65A, 1).strokeCircle(0, 0, R); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; wheel.add(this.add.circle(Math.cos(a) * (R + 1), Math.sin(a) * (R + 1), 6, 0xFFF1B8)); }
    wheel.add(this.add.circle(0, 0, 58, 0xE86A8E).setStrokeStyle(8, 0xFFFFFF)); wheel.add(T(this, 0, 0, '★', 46, '#FFFFFF', { w: 900 }));
    this.add.triangle(cx, cy - R - 16, -34, -44, 34, -44, 0, 24, 0xE86A8E).setStrokeStyle(5, 0xFFFFFF).setDepth(3);
    this.wheelC = wheel;
    // 확률표 (2줄 × 4)
    const ty = cy + R + 70 + spare * 0.15; WHEEL.forEach((w, i) => { const x = 60 + (i % 2) * 490, y = ty + Math.floor(i / 2) * 86, gg = this.add.graphics(); gg.fillStyle(w.c, 0.55).fillRoundedRect(x, y, 470, 74, 20);
      rewardIcons(w.r).forEach(([img, t], k) => { const im = this.add.image(x + 44 + k * 120, y + 37, img); im.setScale(52 / Math.max(im.width, im.height)); T(this, x + 76 + k * 120, y + 37, t, 20, C.ink, { ox: 0, w: 900 }); });
      T(this, x + 450, y + 37, `${Math.round(w.w / tot * 100)}%`, 24, w.jackpot ? C.rose : C.brown, { ox: 1, w: 900 }); });
    btn(this, W / 2, Math.min(H - 110, ty + 4 * 86 + 100 + spare * 0.2), 600, 130, s.tokens ? `돌리기 (남은 토큰 ${s.tokens})` : '토큰이 없어요 · 5단계를 만들어요', () => this.roll(), { size: 34, style: s.tokens ? 'rose' : 'cream' });
  }
  roll() {
    if (this.busy) return; if (!spin().tokens) return toast(this, '룰렛 토큰이 없어요 · 작업대에서 5단계 이상을 만들어 보세요');
    const i = spinRoll(); if (i === null) return; this.busy = true; const n = WHEEL.length, seg = 360 / n, target = 360 * 6 + (360 - (i * seg + seg / 2)) + (Math.random() - 0.5) * seg * 0.6;
    audio.play('sfx_gen', { volume: 0.5 }); let last = 0;
    this.tweens.add({ targets: this.wheelC, angle: target, duration: 3800, ease: 'Cubic.easeOut', onUpdate: () => { const a = Math.floor(this.wheelC.angle / seg); if (a !== last) { last = a; audio.play('sfx_tap', { volume: 0.35, gap: 30 }); } },
      onComplete: () => { const w = WHEEL[i]; audio.buzz(w.jackpot ? [30, 50, 30, 50, 60] : 20); this.time.delayedCall(300, () => gain(this, [w.r], w.jackpot ? '대박!' : '당첨!', () => this.scene.restart({ tab: 'wheel' }))); } });
  }
  // ── 보물 찾기
  dig() {
    const g0 = dig(), b = g0.board, spare = Math.max(0, H - 2000), cs = 160, x0 = (W - cs * 5) / 2, left = 25 - b.open.length, smallLeft = b.cells.filter((c, i) => c && c.r && !b.open.includes(i)).length;
    this.header('shovel', `보물 찾기 · ${b.round}번째 마당`, ['삽 1개로 흙 한 칸을 파요', '열쇠 조각 3개를 찾으면 아래 보물 상자!'], '삽', g0.shovels, `주문 ${ORDERS_PER_SHOVEL}번 = 1개`);
    // 보물 상자 + 열쇠 칸
    const ty = 560, tg = this.add.graphics(); tg.fillStyle(0xFFF1D6, 1).fillRoundedRect(30, ty, W - 60, 190, 30).lineStyle(4, 0xF0B65A, 1).strokeRoundedRect(30, ty, W - 60, 190, 30);
    const ch = this.add.image(120, ty + 95, 'chest'); ch.setScale(130 / ch.height); if (!b.done) this.tweens.add({ targets: ch, angle: { from: -3, to: 3 }, duration: 800, yoyo: true, repeat: -1 });
    T(this, 210, ty + 42, '보물 상자 안에', 24, C.brown, { ox: 0, w: 900 }); chip(this, 400, ty + 110, DIG.treasure, { size: 56, bg: false, font: 16 });
    this.keySlots = [0, 1, 2].map(k => { const x = 720 + k * 115, sg = this.add.graphics(); sg.fillStyle(0xFFFFFF, 1).fillRoundedRect(x - 50, ty + 45, 100, 100, 20).lineStyle(3, 0xF0B65A, 1).strokeRoundedRect(x - 50, ty + 45, 100, 100, 20);
      const im = this.add.image(x, ty + 95, `key${k + 1}`); im.setScale(80 / im.width); if (k >= b.keys) im.setTintFill(0xE3D3CC).setAlpha(0.7); return { x, y: ty + 95 }; });
    T(this, 835, ty + 28, `열쇠 ${b.keys}/3`, 22, C.rose, { w: 900 });
    T(this, W / 2, ty + 230, `흙 아래: 열쇠 조각 3 · 작은 선물 8 · 빈칸 14  ·  남은 흙 ${left}칸 (선물 ${smallLeft} 남음)`, 21, C.dim, { w: 800 });
    // 마당
    const gy = ty + 290 + spare * 0.2, g = this.add.graphics(); g.fillStyle(0x8BC07A, 1).fillRoundedRect(x0 - 16, gy - 16, cs * 5 + 32, cs * 5 + 32, 30);
    this.digCell = i => [x0 + (i % 5) * cs + cs / 2, gy + Math.floor(i / 5) * cs + cs / 2];
    b.cells.forEach((c, i) => { const [x, y] = this.digCell(i), open = b.open.includes(i);
      if (open) { g.fillStyle(0xE8D2B8, 1).fillRoundedRect(x - cs / 2 + 6, y - cs / 2 + 6, cs - 12, cs - 12, 20); if (c) { const img = c.key || rewardIcons(c.r)[0][0], im = this.add.image(x, y - 8, img); im.setScale((cs - 60) / Math.max(im.width, im.height)); if (!c.key) T(this, x, y + 46, rewardIcons(c.r)[0][1], 18, C.brown, { w: 900 }); } else T(this, x, y, '·', 40, '#C9B49C', { w: 900 }); }
      else { const im = this.add.image(x, y + 6, 'dirt'); im.setScale((cs - 14) / im.width); this.add.zone(x, y, cs, cs).setInteractive({ useHandCursor: true }).on('pointerup', () => this.dig1(i, im)); } });
    const by = Math.min(H - 110, gy + cs * 5 + 110 + spare * 0.2);
    if (b.done) btn(this, W / 2, by, 600, 130, '다음 마당으로', () => { digNext(); this.scene.restart({ tab: 'dig' }); }, { size: 34 });
    else T(this, W / 2, by, g0.shovels ? '흙을 눌러 파 보세요!' : '삽이 없어요 · 작업대에서 주문을 끝내면 받아요', 28, g0.shovels ? C.rose : C.dim, { w: 900 });
  }
  dig1(i, im) {
    if (this.busy) return; if (!dig().shovels) return toast(this, '삽이 없어요 · 작업대에서 주문 3번마다 1개'); const res = digOpen(i); if (!res) return; this.busy = true;
    const [x, y] = this.digCell(i); audio.play('sfx_drop', { volume: 0.7, rate: 0.8 }); audio.buzz(12);
    const sh = this.add.image(x + 40, y - 60, 'shovel').setDepth(20); sh.setScale(90 / sh.height);
    this.tweens.add({ targets: sh, angle: -40, y: y - 20, duration: 140, yoyo: true, repeat: 1, onComplete: () => { sh.destroy(); im.destroy();
      for (let k = 0; k < 10; k++) { const p = this.add.circle(x, y, 9 + Math.random() * 6, 0x8A5A44).setDepth(19), a = Math.random() * Math.PI * 2; this.tweens.add({ targets: p, x: x + Math.cos(a) * 100, y: y + Math.sin(a) * 100 - 30, alpha: 0, duration: 450, onComplete: () => p.destroy() }); }
      const c = res.cell;
      if (c && c.key) { const ki = this.add.image(x, y, c.key).setDepth(30); ki.setScale(100 / ki.width); audio.play('sfx_merge_big', { volume: 0.7 }); T(this, x, y - 70, '열쇠 조각!', 30, C.gold, { w: 900, shadow: true }).setDepth(31);
        const slot = this.keySlots[dig().board.keys - 1]; this.tweens.add({ targets: ki, y: y - 60, duration: 300, yoyo: false, onComplete: () => this.tweens.add({ targets: ki, x: slot.x, y: slot.y, scale: 80 / ki.width, duration: 500, ease: 'Cubic.easeIn', onComplete: () => this.after(res) }) }); }
      else if (c && c.r) { giveReward(c.r); this.hud.update(); audio.play('sfx_coin', { volume: 0.7 }); const ch = chip(this, x, y - 30, c.r, { size: 70 }).setDepth(30); ch.setScale(0.3); this.tweens.add({ targets: ch, scale: 1, y: y - 90, duration: 300, ease: 'Back.easeOut', onComplete: () => this.time.delayedCall(700, () => this.after(res)) }); }
      else { T(this, x, y, '꽝', 34, C.dim, { w: 900 }).setDepth(30); this.time.delayedCall(500, () => this.after(res)); } } });
  }
  after(res) { if (res.treasure) { const ch = this.add.image(W / 2, H / 2, 'chest').setDepth(70); ch.setScale(0.1); this.tweens.add({ targets: ch, scale: 300 / ch.height, angle: { from: -10, to: 0 }, duration: 500, ease: 'Back.easeOut', onComplete: () => this.time.delayedCall(400, () => { ch.destroy(); gain(this, [DIG.treasure], '보물 상자를 열었어요!', () => this.scene.restart({ tab: 'dig' })); }) }); } else this.scene.restart({ tab: 'dig' }); }
  onBack() { return goPrev(this); }
}
