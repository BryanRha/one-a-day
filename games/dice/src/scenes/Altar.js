// 룬 제단 (뽑기): 게임에서 번 수정·열쇠·매일 무료 1회로만 · 확률 공개 · 천장 · 10회 영웅 보장 · 중복은 등급업 카드
import { W, H } from '../config.js?v=0.45.2';
import { T, C, fmt, btn, iconBtn, popup, toast } from '../pui.js?v=0.45.2';
import { audio } from '../audio.js?v=0.45.2';
import { load } from '../save.js?v=0.45.2';
import * as M from '../meta.js?v=0.45.2';
import { RUNES, RUNE_ORDER, RARITY, RARITY_NAME, RARITY_COLOR } from '../core/sim.js?v=0.45.2';

const hex = n => '#' + n.toString(16).padStart(6, '0');

export class AltarScene extends Phaser.Scene {
  constructor() { super('Altar'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.55);
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '룬 제단', 44, C.text, { w: 900 });
    this.add.image(W - 230, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    this.cry = T(this, W - 198, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    T(this, W / 2, 160, `룬 ${M.ownedCount()}/${RUNE_ORDER.length} 수집`, 28, C.sub, { w: 800 });
    // 제단: 겹친 고리가 천천히 돌고 주사위들이 떠다님
    const by = H - 640, cy = Math.max(620, by - 600);
    this.cy = cy;
    const halo = this.add.image(W / 2, cy, 'glow').setTint(0x7A5CFF).setBlendMode('ADD').setScale(7).setAlpha(0.4);
    this.tweens.add({ targets: halo, alpha: 0.22, scale: 7.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    [[5.6, 0.4, 40000], [4.3, 0.35, -28000], [3, 0.6, 18000]].forEach(([sc, a, dur]) => { const r = this.add.image(W / 2, cy, 'ring').setTint(0xB59BFF).setBlendMode('ADD').setScale(sc).setAlpha(a); this.tweens.add({ targets: r, angle: dur > 0 ? 360 : -360, duration: Math.abs(dur), repeat: -1 }); });
    const showcase = ['growth', 'mirror', 'shift', 'hammer'];
    this.orb = showcase.map((r, i) => { const c = this.add.container(W / 2, cy); c.add([this.add.image(0, 0, `die_${r}`).setDisplaySize(160, 160), this.add.image(0, 0, `rune_${r}`).setDisplaySize(92, 92)]); c.a = i * Math.PI / 2; return c; });
    this.core = this.add.image(W / 2, cy, 'glow').setTint(0xFFE6A0).setBlendMode("ADD").setScale(2).setAlpha(0.8);
    this.tweens.add({ targets: this.core, scale: 2.4, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    T(this, W / 2, by - 170, `룬 ${RUNE_ORDER.length}종 · 전설 ${RUNE_ORDER.filter(r => RARITY[r] === 3).length}종`, 28, C.gold, { w: 800 });
    this.pityT = T(this, W / 2, by - 122, '', 26, C.sub, { w: 800 });
    // 버튼
    this.bFree = btn(this, W / 2, by, 760, 130, '', () => this.pull(load().legendTix > 0 ? 'legend' : M.freeToday() ? 'free' : 'key'), { style: 'green', size: 40 });
    this.b1 = btn(this, W / 2 - 200, by + 170, 360, 130, `1회  ◆${M.DRAW_COST}`, () => this.pull('one'), { style: 'indigo', size: 38 });
    this.b10 = btn(this, W / 2 + 200, by + 170, 360, 130, `10회  ◆${M.DRAW10_COST}`, () => this.pull('ten'), { style: 'gold', size: 38 });
    T(this, W / 2 + 200, by + 262, '영웅 이상 1개 보장 · 10% 할인', 22, C.gold, { w: 800 });
    btn(this, W / 2 - 170, by + 360, 300, 84, '확률 정보', () => this.odds(), { style: 'ghost', size: 26 });
    btn(this, W / 2 + 170, by + 360, 300, 84, '오늘의 상점', () => this.shop(), { style: 'ghost', size: 26 });
    this.refresh();
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(220, 5, 6, 26);
    window.__altar = this;
  }
  update(t) { if (!this.orb) return; this.orb.forEach((o, i) => { const a = o.a + t / 2600; o.x = W / 2 + Math.cos(a) * 380; o.y = this.cy + Math.sin(a) * 170; o.setScale(0.8 + 0.25 * (Math.sin(a) + 1) / 2); o.setDepth(Math.sin(a) > 0 ? 3 : 1); }); }
  refresh() {
    const d = load(), free = M.freeToday();
    this.cry.setText(fmt(d.crystals));
    this.pityT.setText(`전설 확정까지 ${M.PITY - d.pity}회`);
    if (d.legendTix > 0) this.bFree.setLabel(`전설 확정권 사용 (${d.legendTix}장)`).setEnabled(true).setVisible(true);
    else if (free) this.bFree.setLabel('오늘의 무료 뽑기').setEnabled(true).setVisible(true);
    else if (d.keys > 0) this.bFree.setLabel(`열쇠로 뽑기 (${d.keys}개)`).setEnabled(true).setVisible(true);
    else this.bFree.setLabel('내일 무료 뽑기 · 웨이브 기록으로 열쇠').setEnabled(false).setVisible(true);
    this.b1.setEnabled(d.crystals >= M.DRAW_COST); this.b10.setEnabled(d.crystals >= M.DRAW10_COST);
  }
  pull(how) {
    if (this.busy) return;
    const res = how === 'legend' ? M.drawLegend() : M.draw(how);
    if (!res) return toast(this, '수정이 부족해요 · 미션과 원정으로 모아요', C.sub);
    this.busy = true; this.refresh();
    // 제단이 빨려 들어가듯 모였다가 터짐 → 결과
    const best = Math.max(...res.map(o => o.rar));
    audio.play('sfx_power', { volume: 0.6, rate: 0.8 });
    this.tweens.add({ targets: this.core, scale: 4.5, alpha: 1, duration: 520, ease: 'Cubic.easeIn' });
    if (best >= 2) this.core.setTint(RARITY_COLOR[best]);
    this.time.delayedCall(560, () => { this.cameras.main.flash(260, ...(best === 3 ? [255, 210, 120] : [200, 190, 255])); this.core.setTint(0xFFE6A0).setScale(2); this.reveal(res); });
  }
  reveal(res) {
    const L = this.add.container(0, 0).setDepth(500);
    L.add(this.add.rectangle(W / 2, H / 2, W, H, 0x03040E, 0.95).setInteractive());
    const n = res.length, per = n === 1 ? 1 : 5, cw = n === 1 ? 380 : 188, chh = n === 1 ? 500 : 270;
    const top = H / 2 - (n === 1 ? 60 : 200);
    L.add(T(this, W / 2, top - (n === 1 ? 340 : 240), n === 1 ? '룬 획득' : '룬 10개 획득', 52, C.text, { w: 900 }));
    res.forEach((o, i) => {
      const x = W / 2 + ((i % per) - (per - 1) / 2) * (cw + 14), y = top + Math.floor(i / per) * (chh + 30);
      const c = this.add.container(x, y).setScale(0, 1); L.add(c);
      const col = RARITY_COLOR[o.rar], g = this.add.graphics();
      g.fillStyle(0x10153A, 0.96).fillRoundedRect(-cw / 2, -chh / 2, cw, chh, 22).lineStyle(o.rar >= 2 ? 5 : 3, col, 1).strokeRoundedRect(-cw / 2, -chh / 2, cw, chh, 22);
      const gl = this.add.image(0, -chh * 0.12, 'glow').setTint(col).setBlendMode('ADD').setScale(n === 1 ? 3.4 : 1.8).setAlpha(o.rar >= 2 ? 0.75 : 0.35);
      const s = n === 1 ? 230 : 120;
      c.add([gl, g, this.add.image(0, -chh * 0.12, `die_${o.r}`).setDisplaySize(s, s), this.add.image(0, -chh * 0.12, `rune_${o.r}`).setDisplaySize(s * 0.58, s * 0.58)]);
      c.add(T(this, 0, chh * 0.24, RUNES[o.r].name, n === 1 ? 52 : 28, C.text, { w: 900 }));
      c.add(T(this, 0, chh * 0.38, o.isNew ? 'NEW' : `카드 +1`, n === 1 ? 30 : 20, o.isNew ? C.gold : C.sub, { w: 900, ls: o.isNew ? 4 : 0 }));
      c.add(T(this, 0, -chh / 2 + 26, RARITY_NAME[o.rar], n === 1 ? 26 : 18, hex(col), { w: 900 }));
      if (o.rar >= 2) this.tweens.add({ targets: gl, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
      this.time.delayedCall(180 + i * 150, () => {
        this.tweens.add({ targets: c, scaleX: 1, duration: 180, ease: 'Back.easeOut' });
        audio.play(o.rar >= 2 ? 'sfx_awaken' : 'sfx_summon', { volume: o.rar >= 2 ? 0.55 : 0.4, rate: 1 + (i % 5) * 0.05 });
        if (o.rar === 3) { this.cameras.main.shake(180, 0.005); const b = this.add.image(x, y, 'ring').setTint(col).setBlendMode('ADD').setScale(0.3).setDepth(501); this.tweens.add({ targets: b, scale: 4, alpha: 0, duration: 600, onComplete: () => b.destroy() }); }
      });
    });
    const done = 180 + n * 150 + 300;
    this.time.delayedCall(done, () => {
      const best = Math.max(...res.map(o => o.rar)), nw = res.filter(o => o.isNew).length;
      const ey = top + (n === 1 ? chh / 2 + 90 : chh * 1.5 + 30 + 90);
      if (best === 3) L.add(T(this, W / 2, ey, '전설 룬!', 56, C.gold, { w: 900, ls: 4 }));
      else if (nw) L.add(T(this, W / 2, ey, `새 룬 ${nw}개!`, 48, C.gold, { w: 900 }));
      const ok = btn(this, nw ? W / 2 - 240 : W / 2, ey + 150, 440, 130, '확인', () => { L.destroy(); this.busy = false; this.refresh(); }, { style: nw ? 'ghost' : 'gold', size: 40 }); L.add(ok);
      if (nw) L.add(btn(this, W / 2 + 240, ey + 150, 440, 130, '덱에 넣으러', () => this.go('Deck'), { style: 'gold', icon: 'i_grid', size: 36 }));
    });
  }
  shop() {
    const p = popup(this, '오늘의 상점', 900, 1180), c = p.content;
    c.add(T(this, 0, -436, '매일 자정에 바뀌어요 · 가진 룬의 등급업 카드', 26, C.sub, { w: 800 }));
    M.shop().forEach((o, i) => {
      const y = -290 + i * 206;
      const g = this.add.graphics(); g.fillStyle(0x141A44, 0.9).fillRoundedRect(-400, y - 90, 800, 180, 28).lineStyle(2, o.free ? 0x5BE39A : RARITY_COLOR[RARITY[o.r]], 0.6).strokeRoundedRect(-400, y - 90, 800, 180, 28); c.add(g);
      if (o.free) { c.add(this.add.image(-300, y, 'i_star').setDisplaySize(80, 80).setTint(0x8FE3FF)); c.add(T(this, -220, y - 22, '오늘의 선물', 36, C.text, { ox: 0, w: 900 })); c.add(T(this, -220, y + 26, '수정 20 무료', 26, C.sub, { ox: 0, w: 800 })); }
      else { c.add(this.add.image(-300, y, `die_${o.r}`).setDisplaySize(120, 120)); c.add(this.add.image(-300, y, `rune_${o.r}`).setDisplaySize(68, 68)); c.add(T(this, -220, y - 22, `${RUNES[o.r].name} 카드 ×${o.qty}`, 36, C.text, { ox: 0, w: 900 })); c.add(T(this, -220, y + 26, `${RARITY_NAME[RARITY[o.r]]} · 등급업 재료`, 26, hex(RARITY_COLOR[RARITY[o.r]]), { ox: 0, w: 800 })); }
      if (o.sold) c.add(T(this, 290, y, '구매 완료', 30, C.dim, { w: 800 }));
      else c.add(btn(this, 290, y, 210, 96, o.free ? '받기' : `◆${o.price}`, () => { const r = M.buy(i); if (!r) return toast(this, '수정이 부족해요', C.sub); audio.play('sfx_power', { volume: 0.6 }); p.close(); this.refresh(); this.time.delayedCall(160, () => this.shop()); toast(this, r.free ? '수정 +20' : `${RUNES[r.r].name} 카드 +${r.qty}`, C.gold); }, { style: o.free ? 'green' : 'indigo', size: 32 }));
    });
  }
  odds() {
    const p = popup(this, '확률 정보', 900, 1100), c = p.content;
    const d = load();
    [0, 1, 2, 3].forEach(k => { const all = RUNE_ORDER.filter(r => RARITY[r] === k), own = all.filter(r => d.unlocked[r]).length; c.add(T(this, 0, -330 + k * 100, `${RARITY_NAME[k]}  ${Math.round(M.ODDS[k] * 100)}%   ·   ${all.length}종 (보유 ${own})`, 34, hex(RARITY_COLOR[k]), { w: 900 })); });
    c.add(T(this, 0, 220, `· ${M.PITY}회 안에 전설이 반드시 나와요\n· 10회 뽑기는 영웅 이상 1개 보장\n· 같은 등급 안에서는 아직 없는 룬이 더 잘 나와요\n· 이미 가진 룬은 등급업 카드가 돼요\n· 수정은 게임 안에서만 얻어요 (구매 없음)`, 28, C.sub, { w: 700, lh: 14 }));
  }
  go(k) { audio.stopMusic(); this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k)); }
}
