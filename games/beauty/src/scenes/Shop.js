// 상점: 하루 무료 선물 + 유료 상품(지금은 '곧 열려요') — 결제가 열리면 store.js 만 켜면 됨
import { W, H } from '../config.js?v=0.59.1';
import { T, R, C, TS, btn, toast, rbox } from '../ui.js?v=0.59.1';
import { audio } from '../audio.js?v=0.59.1';
import { load, save } from '../save.js?v=0.59.1';
import { goPrev } from '../nav.js?v=0.59.1';
import { screen } from '../hud.js?v=0.59.1';
import { PRODUCTS, won, storeOpen, purchase } from '../store.js?v=0.59.1';
import { today } from '../state.js?v=0.59.1';
import { PIGGY } from '../album.js?v=0.59.1';

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    audio.music('bgm_shop');
    const d = load(); let y = screen(this, '상점');
    // 하루 무료 선물
    const free = d.freeGift !== today(); rbox(this, 40, y, W - 80, 150, { fill: '#FFFFFF', line: free ? '#E86A8E' : '#F1D2C8', lw: free ? 5 : 3, ox: 0, oy: 0, r: 28 });
    const gi = this.add.image(120, y + 75, 'gen_gift'); gi.setScale(110 / gi.width);
    T(this, 200, y + 50, '오늘의 무료 선물', TS.body + 2, C.ink, { ox: 0, w: 900 }); R(this, 200, y + 104, '◆5 · ⚡10 · 매일 다시 받아요', TS.cap, C.dim, { ox: 0, w: 800 });
    btn(this, W - 170, y + 75, 220, 92, free ? '받기' : '내일 또', () => { if (!free) return; d.freeGift = today(); d.gems += 5; d.energy += 10; save(); audio.play('sfx_order', { volume: 0.6 }); this.scene.restart(); }, { style: free ? 'rose' : 'cream', size: 32 });
    y += 175;
    // 보석 저금통: 주문마다 ◆2씩 쌓임 · 결제가 열리면 깰 수 있음
    { const pv = d.piggy || 0; rbox(this, 40, y, W - 80, 150, { fill: '#FFFFFF', line: '#F1D2C8', ox: 0, oy: 0, r: 28 });
      const pi = this.add.image(120, y + 75, 'piggy'); pi.setScale(110 / pi.height); R(this, 200, y + 44, `보석 저금통 ◆${pv}`, TS.body, C.ink, { ox: 0, w: 900 }); R(this, 200, y + 92, `주문마다 ◆${PIGGY.perOrder}씩 · 최대 ◆${PIGGY.max}`, TS.min + 2, C.dim, { ox: 0, w: 800 });
      const g1 = this.add.graphics(); g1.fillStyle(0xF1DCD3, 1).fillRoundedRect(200, y + 122, 500, 14, 7).fillStyle(0xE86A8E, 1).fillRoundedRect(200, y + 122, Math.max(14, 500 * pv / PIGGY.max), 14, 7);
      btn(this, W - 170, y + 75, 220, 92, storeOpen() ? '깨기' : '곧 열려요', async () => { if (!storeOpen()) return toast(this, '저금통은 결제가 열리면 깰 수 있어요'); if (!pv) return toast(this, '아직 비어 있어요'); try { await purchase('piggy'); audio.play('sfx_levelup', { volume: 0.7 }); this.scene.restart(); } catch { toast(this, '구매하지 못했어요'); } }, { style: storeOpen() ? 'gold' : 'cream', size: 30 }); }
    y += 190;
    T(this, 50, y, storeOpen() ? '상품' : '상품 · 곧 열려요', TS.h2, C.brown, { ox: 0, w: 900 }); y += 50;
    const list = PRODUCTS.filter(p => !p.piggy), cols = 2, cw = (W - 100) / cols, rows = Math.ceil(list.length / cols), ch = Math.max(250, Math.min(340, (H - y - 30) / rows - 20));
    list.forEach((p, k) => {
      const x = 40 + (k % cols) * (cw + 20), yy = y + Math.floor(k / cols) * (ch + 20);
      const owned = p.once && d.purchases.some(r => r.id === p.id) || p.ent && d.ent[p.ent];
      rbox(this, x, yy, Math.round(cw), Math.round(ch), { fill: '#FFFFFF', line: '#F1D2C8', ox: 0, oy: 0, r: 28 });
      const icon = p.packs ? 'pack_gold' : p.gems && !p.energy ? 'gem' : p.energy && !p.gems ? 'energy' : p.ent === 'pass' ? 'gen_camellia2' : 'gen_gift', im = this.add.image(x + 90, yy + (ch - 90) / 2 + 10, icon); im.setScale(Math.min(140, ch - 130) / Math.max(im.width, im.height));
      const nt = T(this, x + 175, yy + 56, p.n, TS.body - 2, C.ink, { ox: 0, w: 900 }); if (nt.width > cw - 190) nt.setScale((cw - 190) / nt.width);
      const desc = [p.gems && `◆${p.gems}`, p.energy && `⚡${p.energy}`, p.gift && `선물 상자 ${p.gift}`, p.ent === 'pass' && '시즌 보상 두 배', p.ent === 'storage4' && '창고 4칸 영구', p.packs && '골드 팩 3 · 다이아 팩 1'].filter(Boolean), lines = desc.length > 2 ? [desc.slice(0, 2).join(' · '), desc.slice(2).join(' · ')] : desc;
      lines.forEach((t, i) => { const dt = R(this, x + 175, yy + 104 + i * 40, t, TS.min, C.dim, { ox: 0, w: 800 }); if (dt.width > cw - 190) dt.setScale((cw - 190) / dt.width); });
      if (p.tag) { const tg = this.add.graphics(); tg.fillStyle(0xE86A8E, 1).fillRoundedRect(x + 14, yy + 14, 130, 44, 22); T(this, x + 79, yy + 36, p.tag, 24, '#FFFFFF', { w: 900 }); }
      btn(this, x + cw / 2, yy + ch - 54, cw - 50, 84, owned ? '보유 중' : storeOpen() ? won(p.price) : `${won(p.price)} · 준비 중`, async () => {
        if (owned) return; if (!storeOpen()) return toast(this, '결제는 곧 열려요 · 지금은 무료 선물과 시즌 보상을 받아요');
        try { await purchase(p.id); audio.play('sfx_levelup', { volume: 0.7 }); this.scene.restart(); } catch (e) { toast(this, '구매하지 못했어요'); }
      }, { style: storeOpen() && !owned ? 'gold' : 'cream', size: 28 });
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__shop = this;
  }
  onBack() { return goPrev(this); }
}
