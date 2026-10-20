// 룬 도감: 덱 5종 고르기 · 수정으로 영구 등급업 (확정) · 해금 조건
import { W, H } from '../config.js';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import * as M from '../meta.js';
import { RUNES, RUNE_ORDER } from '../core/sim.js';

const DESC = { flame: '주변 적까지 불태움', frost: '맞은 적을 느리게', storm: '근처 적에 연쇄', venom: '독으로 계속 피해', gale: '아주 빠른 공격', iron: '보스에게 2.5배', light: '옆 주사위 공속 ↑', echo: '아무 주사위와 합성', fortune: '합성하면 SP', growth: '시간 지나면 눈 +1', sniper: '가장 센 적을 저격', curse: '받는 피해 증가', mine: '길에 지뢰 설치', crit: '모두의 치명타 ↑', summoner: '합성 시 하나 더', mana: '초당 SP 생성' };
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
    T(this, W / 2, 170, `룬 ${Object.keys(d.unlocked).length}/16 · 눌러서 덱에 넣기 (맨 앞 룬과 교체)`, 26, C.sub, { w: 800 });
    d.deck.forEach((r, i) => { const x = W / 2 + (i - 2) * 110; this.add.image(x, 238, `die_${r}`).setDisplaySize(84, 84); this.add.image(x, 238, `rune_${r}`).setDisplaySize(48, 48); });
    const order = RUNE_ORDER.slice().sort((a, b) => M.UNLOCK[a] - M.UNLOCK[b]);
    const cw = 330, chh = 262, top = 330 + Math.max(0, (H - 1920) / 3);
    order.forEach((r, i) => {
      const x = W / 2 + (i % 3 - 1) * (cw + 14), y = top + Math.floor(i / 3) * (chh + 12), own = d.unlocked[r], inDeck = d.deck.includes(r), t = d.tiers[r] || 1;
      this.add.existing(panel(this, x, y, cw, chh, { tone: inDeck ? 'gold' : undefined, r: 26 }));
      const ic = this.add.image(x - 96, y - 58, `die_${r}`).setDisplaySize(96, 96); const rn = this.add.image(x - 96, y - 58, `rune_${r}`).setDisplaySize(56, 56);
      if (!own) { ic.setAlpha(0.3); rn.setAlpha(0.3); this.add.image(x - 96, y - 58, 'i_lock').setDisplaySize(36, 36); }
      T(this, x - 34, y - 80, RUNES[r].name, 32, own ? C.text : C.dim, { ox: 0, w: 900 });
      T(this, x - 34, y - 40, own ? `★${t}${inDeck ? ' · 장착' : ''}` : `웨이브 ${M.UNLOCK[r]}`, 22, own ? (inDeck ? C.gold : C.sub) : C.dim, { ox: 0, w: 800 });
      T(this, x - cw / 2 + 24, y + 22, DESC[r], 22, own ? C.sub : C.dim, { ox: 0, w: 700 });
      if (!own) return;
      const zone = this.add.zone(x, y - 30, cw, 150).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        let deck = d.deck.slice();
        if (inDeck) return toast(this, '다른 룬을 누르면 바꿔 넣어요 (덱은 5개)', C.sub);
        deck.shift(); deck.push(r); M.setDeck(deck); audio.play('sfx_click'); this.scene.restart();
      });
      const cost = M.tierCost(t);
      if (t < M.MAX_TIER) btn(this, x, y + 86, cw - 50, 70, `등급업 ◆${cost}`, () => { if (M.upgrade(r)) { audio.play('sfx_power', { volume: 0.7 }); this.scene.restart(); } else toast(this, '수정이 부족해요', C.sub); }, { style: d.crystals >= cost ? 'indigo' : 'ghost', size: 24 });
      else T(this, x, y + 86, 'MAX', 28, C.gold, { w: 900 });
    });
    this.cameras.main.fadeIn(200, 5, 6, 26);
  }
  go() { const d = load(); if (d.deck.length < 5) { d.deck = ['flame', 'frost', 'storm', 'iron', 'gale']; M.setDeck(d.deck); } this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home')); }
}
