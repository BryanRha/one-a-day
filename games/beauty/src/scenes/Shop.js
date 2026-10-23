// 상점: 하루 무료 선물 + 유료 상품(지금은 '곧 열려요') — 결제가 열리면 store.js 만 켜면 됨
import { W, H } from '../config.js?v=0.29.2';
import { T, C, btn, iconBtn, toast } from '../ui.js?v=0.29.2';
import { audio } from '../audio.js?v=0.29.2';
import { load, save } from '../save.js?v=0.29.2';
import { goPrev } from '../nav.js?v=0.29.2';
import { hud } from '../hud.js?v=0.29.2';
import { PRODUCTS, won, storeOpen, purchase } from '../store.js?v=0.29.2';
import { today } from '../state.js?v=0.29.2';

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    audio.music('bgm_shop');
    const d = load(); this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.hud = hud(this); iconBtn(this, 60, 66, 'back', () => goPrev(this), 76).setDepth(51);
    let y = 170; T(this, 60, y, '상점', 40, C.ink, { ox: 0, w: 900 }); y += 60;
    // 하루 무료 선물
    const free = d.freeGift !== today(), g0 = this.add.graphics(); g0.fillStyle(0xFFFFFF, 1).fillRoundedRect(40, y, W - 80, 130, 28).lineStyle(4, free ? 0xE86A8E : 0xF1D2C8, 1).strokeRoundedRect(40, y, W - 80, 130, 28);
    const gi = this.add.image(120, y + 65, 'gen_gift'); gi.setScale(100 / gi.width);
    T(this, 200, y + 45, '오늘의 무료 선물', 32, C.ink, { ox: 0, w: 900 }); T(this, 200, y + 92, '◆5 · ⚡10 · 매일 다시 받아요', 24, C.dim, { ox: 0, w: 800 });
    btn(this, W - 170, y + 65, 220, 86, free ? '받기' : '내일 또', () => { if (!free) return; d.freeGift = today(); d.gems += 5; d.energy += 10; save(); audio.play('sfx_order', { volume: 0.6 }); this.scene.restart(); }, { style: free ? 'rose' : 'cream', size: 28 });
    y += 170;
    T(this, 60, y, storeOpen() ? '상품' : '상품 · 곧 열려요', 30, C.brown, { ox: 0, w: 900 }); y += 50;
    const cols = 2, cw = (W - 100) / cols, ch = 250;
    PRODUCTS.forEach((p, k) => {
      const x = 40 + (k % cols) * (cw + 20), yy = y + Math.floor(k / cols) * (ch + 20), g = this.add.graphics();
      const owned = p.once && d.purchases.some(r => r.id === p.id) || p.ent && d.ent[p.ent];
      g.fillStyle(0xFFFFFF, 1).fillRoundedRect(x, yy, cw, ch, 28).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(x, yy, cw, ch, 28);
      const icon = p.gems && !p.energy ? 'gem' : p.energy && !p.gems ? 'energy' : p.ent === 'pass' ? 'gen_camellia2' : p.ent ? 'gen_gift' : 'gen_gift', im = this.add.image(x + 90, yy + 100, icon); im.setScale(110 / Math.max(im.width, im.height));
      T(this, x + 170, yy + 60, p.n, 28, C.ink, { ox: 0, w: 900 });
      T(this, x + 170, yy + 105, [p.gems && `◆${p.gems}`, p.energy && `⚡${p.energy}`, p.gift && `선물 상자 ${p.gift}`, p.ent === 'pass' && '시즌 보상 두 배', p.ent === 'storage4' && '창고 4칸 영구'].filter(Boolean).join(' · '), 22, C.dim, { ox: 0, w: 700, wrap: cw - 190, align: 'left' });
      if (p.tag) { const tg = this.add.graphics(); tg.fillStyle(0xE86A8E, 1).fillRoundedRect(x + 16, yy + 14, 120, 40, 20); T(this, x + 76, yy + 34, p.tag, 18, '#FFFFFF', { w: 900 }); }
      btn(this, x + cw / 2, yy + ch - 50, cw - 60, 76, owned ? '보유 중' : storeOpen() ? won(p.price) : `${won(p.price)} · 준비 중`, async () => {
        if (owned) return; if (!storeOpen()) return toast(this, '결제는 곧 열려요 · 지금은 무료 선물과 시즌 보상을 받아요');
        try { await purchase(p.id); audio.play('sfx_levelup', { volume: 0.7 }); this.scene.restart(); } catch (e) { toast(this, '구매하지 못했어요'); }
      }, { style: storeOpen() && !owned ? 'gold' : 'cream', size: 24 });
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__shop = this;
  }
  onBack() { return goPrev(this); }
}
