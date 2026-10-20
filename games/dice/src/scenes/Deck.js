// 룬 도감: 덱 5종 고르기 · 수정으로 영구 등급업 (확정) · 해금 조건
import { W, H } from '../config.js';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import * as M from '../meta.js';
import { RUNES, RUNE_ORDER } from '../core/sim.js';

const DESC = { flame: '주변 적까지 불태움', frost: '맞은 적을 느리게', storm: '근처 적 2마리에 연쇄', venom: '독으로 계속 피해', gale: '아주 빠른 공격', iron: '보스에게 2.5배', light: '옆 주사위 공격 속도 ↑', echo: '아무 주사위와 합성', fortune: '합성하면 SP 획득', growth: '시간이 지나면 눈 +1' };
export class DeckScene extends Phaser.Scene {
  constructor() { super('Deck'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, 'bg_altar'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.6);
    iconBtn(this, 80, 92, 'i_home', () => this.go(), 96);
    T(this, W / 2, 92, '룬 도감', 44, C.text, { w: 900 });
    this.add.image(W - 230, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    T(this, W - 198, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    T(this, W / 2, 170, `덱 ${d.deck.length}/5 — 눌러서 넣고 빼기`, 28, C.sub, { w: 800 });
    RUNE_ORDER.forEach((r, i) => {
      const x = i % 2 ? W / 2 + 240 : W / 2 - 240, y = 330 + Math.floor(i / 2) * 290, own = d.unlocked[r], inDeck = d.deck.includes(r), t = d.tiers[r] || 1;
      this.add.existing(panel(this, x, y, 460, 266, { tone: inDeck ? 'gold' : undefined }));
      const ic = this.add.image(x - 150, y - 34, `die_${r}`).setDisplaySize(110, 110); this.add.image(x - 150, y - 34, `rune_${r}`).setDisplaySize(64, 64);
      if (!own) { ic.setAlpha(0.35); this.add.image(x - 150, y - 34, 'i_lock').setDisplaySize(44, 44); }
      T(this, x - 70, y - 70, RUNES[r].name, 38, own ? C.text : C.dim, { ox: 0, w: 900 });
      T(this, x - 70, y - 26, own ? `등급 ★${t}` : `웨이브 ${M.UNLOCK[r]} 달성 시 해금`, 24, own ? C.gold : C.dim, { ox: 0, w: 800 });
      T(this, x - 70, y + 12, DESC[r], 22, C.sub, { ox: 0, w: 800 });
      if (!own) return;
      const zone = this.add.zone(x - 70, y - 30, 440, 150).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        let deck = d.deck.slice();
        if (inDeck) { if (deck.length <= 5) { deck = deck.filter(q => q !== r); } }
        else { if (deck.length >= 5) deck.shift(); deck.push(r); }
        if (deck.length === 5 || !inDeck) { M.setDeck(deck.length === 5 ? deck : d.deck); }
        if (deck.length < 5) { d.deck = deck; toast(this, '덱은 5개가 필요해요 — 다른 룬을 넣어요', C.sub); return this.scene.restart(); }
        audio.play('sfx_click'); this.scene.restart();
      });
      const cost = M.tierCost(t);
      if (t < M.MAX_TIER) btn(this, x + 70, y + 84, 280, 76, `등급업 ◆${cost}`, () => { if (M.upgrade(r)) { audio.play('sfx_power', { volume: 0.7 }); this.scene.restart(); } else toast(this, '수정이 부족해요', C.sub); }, { style: d.crystals >= cost ? 'indigo' : 'ghost', size: 26 });
      else T(this, x + 70, y + 84, 'MAX', 30, C.gold, { w: 900 });
    });
    this.cameras.main.fadeIn(200, 5, 6, 26);
  }
  go() { const d = load(); if (d.deck.length < 5) { d.deck = ['flame', 'frost', 'storm', 'iron', 'gale']; M.setDeck(d.deck); } this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home')); }
}
