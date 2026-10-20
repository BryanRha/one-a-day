// 룬 컬렉션: 덱 3개(프리셋) · 칸 골라 룬 넣기 · 덱 조합 보너스 · 24룬 (희귀도) · 카드+수정으로 등급업
import { W, H } from '../config.js';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import * as M from '../meta.js';
import { RUNES, RUNE_ORDER, RARITY, RARITY_NAME, RARITY_COLOR, SYNERGY, synergiesOf } from '../core/sim.js';

export const DESC = {
  flame: '맞은 적 주변까지 불태워요', frost: '맞은 적을 느리게 해요', storm: '근처 적 둘에게 번개가 이어져요', venom: '독이 쌓여 계속 피해를 줘요',
  gale: '아주 빠르게 공격해요', iron: '보스에게 2.5배 피해', light: '상하좌우 주사위의 공격 속도를 올려요', mana: '눈마다 초당 SP 를 만들어요',
  echo: '눈만 같으면 아무 주사위와 합성돼요', fortune: '합성하면 SP 를 얻어요', sniper: '체력이 가장 많은 적을 노려요', curse: '맞은 적이 받는 피해가 늘어요',
  pierce: '맨 앞 적 뒤로 줄지은 적까지 꿰뚫어요', time: '맞은 적을 길 뒤로 되돌려요', mine: '길 위에 지뢰를 깔아요', crit: '모든 주사위의 치명타 확률을 올려요',
  summoner: '합성하면 주사위가 하나 더 생겨요', freeze: '확률로 적을 얼려 멈춰요', sacrifice: '합성 재료가 되면 옆 주사위들이 이번 판 내내 강해져요', alchemy: '이번 판 합성할수록 강해져요 (최대 4배)',
  growth: '시간이 지나면 눈이 늘어요 (6눈까지)', mirror: '옆에서 가장 센 주사위의 능력을 따라 해요', shift: '합성 결과가 덱에서 가장 높은 등급 룬이 돼요', hammer: '보스 최대 체력에 비례한 피해',
};
const hex = n => '#' + n.toString(16).padStart(6, '0');

export class DeckScene extends Phaser.Scene {
  constructor() { super('Deck'); }
  create(data = {}) {
    const d = load(); M.decks();
    this.slot = data.slot ?? this.slot ?? 0;
    const bg = this.add.image(W / 2, H / 2, 'bg_altar'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.62);
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '룬 컬렉션', 44, C.text, { w: 900 });
    this.add.image(W - 230, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    T(this, W - 198, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    // 덱 1·2·3
    [0, 1, 2].forEach(i => btn(this, W / 2 - 290 + i * 200, 196, 180, 72, `덱 ${i + 1}`, () => { M.selectDeck(i); this.scene.restart({ slot: this.slot }); }, { style: d.deckIdx === i ? 'gold' : 'ghost', size: 28 }));
    btn(this, W - 150, 196, 200, 72, '조합표', () => this.synergyList(), { style: 'ghost', size: 26 });
    // 덱 5칸: 눌러서 바꿀 자리 고르기
    const dy = 330;
    d.deck.forEach((r, i) => {
      const x = W / 2 + (i - 2) * 186, sel = i === this.slot;
      if (sel) { const g = this.add.image(x, dy, 'glow').setTint(0xF5C451).setBlendMode('ADD').setScale(2.2).setAlpha(0.5); this.tweens.add({ targets: g, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
      const im = this.add.image(x, dy, `die_${r}`).setDisplaySize(sel ? 160 : 140, sel ? 160 : 140).setInteractive({ useHandCursor: true });
      this.add.image(x, dy, `rune_${r}`).setDisplaySize(sel ? 88 : 76, sel ? 88 : 76);
      T(this, x, dy + 96, `★${d.tiers[r] || 1}`, 24, sel ? C.gold : C.sub, { w: 900 });
      im.on('pointerup', () => { this.slot = i; audio.play('sfx_click', { volume: 0.5 }); this.scene.restart({ slot: i }); });
    });
    // 발동 중인 조합
    const sy = synergiesOf(d.deck);
    T(this, W / 2, 470, sy.length ? `조합 발동  ${sy.map(x => x.name).join(' · ')}` : `${this.slot + 1}번 칸을 골랐어요 · 아래 룬을 누르면 그 자리에 넣어요`, 26, sy.length ? C.gold : C.sub, { w: 900 });
    // 24룬 격자 (희귀도 → 보유 순)
    const order = RUNE_ORDER.slice().sort((a, b) => RARITY[a] - RARITY[b]);
    const cols = 4, gap = 12, cw = (W - 60 - gap * (cols - 1)) / cols, top = 530, rows = Math.ceil(order.length / cols);
    const ch = Math.max(180, Math.min(250, (H - top - 30) / rows - gap));
    order.forEach((r, i) => {
      const x = 30 + cw / 2 + (i % cols) * (cw + gap), y = top + ch / 2 + Math.floor(i / cols) * (ch + gap);
      this.card(r, x, y, cw, ch);
    });
    this.cameras.main.fadeIn(200, 5, 6, 26);
    window.__deck = this;
  }
  card(r, x, y, cw, ch) {
    const d = load(), own = d.unlocked[r], inDeck = d.deck.includes(r), t = d.tiers[r] || 1, rar = RARITY[r], col = RARITY_COLOR[rar];
    this.add.existing(panel(this, x, y, Math.round(cw), Math.round(ch), { tone: inDeck ? 'gold' : undefined, r: 22 }));
    const g = this.add.graphics(); g.fillStyle(col, own ? 0.9 : 0.3).fillRoundedRect(x - cw / 2 + 18, y - ch / 2 + 8, cw - 36, 6, 3);
    const s = Math.min(112, ch * 0.5), iy = y - ch * 0.14;
    const ic = this.add.image(x, iy, `die_${r}`).setDisplaySize(s, s), rn = this.add.image(x, iy, `rune_${r}`).setDisplaySize(s * 0.58, s * 0.58);
    if (!own) { ic.setAlpha(0.25); rn.setAlpha(0.25).setTint(0x8890B0); this.add.image(x, iy, 'i_lock').setDisplaySize(34, 34).setAlpha(0.8); }
    T(this, x, y + ch * 0.2, RUNES[r].name, 28, own ? C.text : C.dim, { w: 900 });
    if (own) {
      const have = d.cards[r] || 0, need = M.cardsNeed(r, t), k = Math.min(1, have / need), ready = t < M.MAX_TIER && have >= need;
      const bx = x - cw / 2 + 24, bw = cw - 48, by = y + ch * 0.38;
      g.fillStyle(0xFFFFFF, 0.1).fillRoundedRect(bx, by - 7, bw, 14, 7).fillStyle(ready ? 0x5BE39A : col, 1).fillRoundedRect(bx, by - 7, Math.max(14, bw * k), 14, 7);
      T(this, x - cw / 2 + 16, y - ch / 2 + 32, `★${t}`, 22, inDeck ? C.gold : C.sub, { ox: 0, w: 900 });
      if (ready) { const up = T(this, x + cw / 2 - 18, y - ch / 2 + 32, '▲', 24, C.green, { ox: 1, w: 900 }); this.tweens.add({ targets: up, y: up.y - 6, duration: 500, yoyo: true, repeat: -1 }); }
    } else T(this, x, y + ch * 0.38, RARITY_NAME[rar], 20, hex(col), { w: 800 });
    const z = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { audio.play('sfx_click', { volume: 0.5 }); this.detail(r); });
  }
  detail(r) {
    const d = load(), own = d.unlocked[r], t = d.tiers[r] || 1, rar = RARITY[r], col = RARITY_COLOR[rar];
    const p = popup(this, null, 860, 980), c = p.content;
    const glow = this.add.image(0, -300, 'glow').setTint(RUNES[r].color).setBlendMode('ADD').setScale(3).setAlpha(0.45); c.add(glow);
    c.add(this.add.image(0, -300, `die_${r}`).setDisplaySize(220, 220).setAlpha(own ? 1 : 0.4));
    c.add(this.add.image(0, -300, `rune_${r}`).setDisplaySize(128, 128).setAlpha(own ? 1 : 0.4));
    c.add(T(this, 0, -150, RARITY_NAME[rar].toUpperCase(), 26, hex(col), { w: 900, ls: 6 }));
    c.add(T(this, 0, -96, RUNES[r].name, 60, C.text, { w: 900 }));
    c.add(T(this, 0, -20, DESC[r], 30, C.sub, { w: 700, wrap: 700 }));
    const R = RUNES[r]; c.add(T(this, 0, 44, `피해 ${R.dmg} · 초당 ${R.rate}회`, 26, C.dim, { w: 800 }));
    const partners = SYNERGY.filter(s => s.runes.includes(r));
    if (partners.length) c.add(T(this, 0, 98, partners.map(s => `${s.name} (${s.runes.map(q => RUNES[q].name).join(' + ')}) ${s.desc}`).join('\n'), 24, C.gold, { w: 800, wrap: 760 }));
    if (!own) {
      c.add(T(this, 0, 220, '룬 제단에서 얻을 수 있어요', 32, C.text, { w: 800 }));
      c.add(btn(this, 0, 340, 460, 120, '룬 제단으로', () => { p.close(); this.go('Altar'); }, { style: 'gold', size: 38 }));
      return;
    }
    const have = d.cards[r] || 0, need = M.cardsNeed(r, t), cost = M.tierCost(t);
    c.add(T(this, 0, 196, t >= M.MAX_TIER ? `★${t} 최고 등급` : `★${t} → ★${t + 1}   카드 ${have}/${need} · ◆${cost}`, 28, C.text, { w: 800 }));
    c.add(btn(this, -200, 330, 360, 120, `${this.slot + 1}번 칸에 넣기`, () => { M.setSlot(this.slot, r); audio.play('sfx_summon', { volume: 0.5 }); p.close(); this.scene.restart({ slot: this.slot }); }, { style: d.deck[this.slot] === r ? 'ghost' : 'gold', size: 32 }));
    const ok = t < M.MAX_TIER && have >= need && d.crystals >= cost;
    const ub = btn(this, 200, 330, 360, 120, '등급업', () => {
      if (!M.upgrade(r)) return toast(this, have < need ? '카드가 부족해요 · 제단에서 같은 룬을 모아요' : '수정이 부족해요', C.sub);
      audio.play('sfx_awaken', { volume: 0.6 }); this.cameras.main.flash(200, 255, 230, 160); p.close(); this.scene.restart({ slot: this.slot }); toast(this, `${R.name} ★${t + 1}!`, C.gold);
    }, { style: ok ? 'indigo' : 'ghost', size: 34 }); c.add(ub);
  }
  synergyList() {
    const d = load(), p = popup(this, '덱 조합', 920, 1240), c = p.content;
    c.add(T(this, 0, -462, '두 룬을 같은 덱에 넣으면 보너스가 생겨요', 28, C.sub, { w: 800 }));
    SYNERGY.forEach((s, i) => {
      const y = -360 + i * 108, on = s.runes.every(r => d.deck.includes(r)), own = s.runes.every(r => d.unlocked[r]);
      s.runes.forEach((r, k) => { const x = -370 + k * 84; c.add(this.add.image(x, y, `die_${r}`).setDisplaySize(76, 76).setAlpha(d.unlocked[r] ? 1 : 0.3)); c.add(this.add.image(x, y, `rune_${r}`).setDisplaySize(44, 44).setAlpha(d.unlocked[r] ? 1 : 0.3)); });
      c.add(T(this, -200, y - 20, s.name, 32, on ? C.gold : own ? C.text : C.dim, { ox: 0, w: 900 }));
      c.add(T(this, -200, y + 22, s.desc, 24, on ? '#FFE3A0' : C.sub, { ox: 0, w: 700 }));
      if (on) c.add(T(this, 390, y, '발동', 26, C.gold, { ox: 1, w: 900 }));
    });
  }
  go(k) {
    this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k));
  }
}
