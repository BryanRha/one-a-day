// 오늘의 숨은 고양이: 내가 꾸민 카페 그대로가 맵 · 가구 뒤 · 위에 고양이 6마리가 숨음 · 하루 한 번 별
import { W, H } from '../config.js?v=0.26.2';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.26.2';
import { audio } from '../audio.js?v=0.26.2';
import { goPrev } from '../nav.js?v=0.26.2';
import { save } from '../save.js?v=0.26.2';
import { Viewer } from '../viewer.js?v=0.26.2';
import { CATS, HIDE, ROOM } from '../cafe/data.js?v=0.26.2';
import { cafeData, today } from '../cafe/state.js?v=0.26.2';
import { loadCafe, furnitureList, composeTexture } from '../cafe/room.js?v=0.26.2';

const HINT_COST = 10;
export class CatHuntScene extends Phaser.Scene {
  constructor() { super('CatHunt'); }
  create() {
    Object.assign(this, { ended: false, paused: false, hints: 0, got: 0 });
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    loadCafe(this, () => this.build()); window.__chunt = this;
  }
  build() {
    const cf = cafeData().cafe, placed = cf.placed;
    // 숨길 자리: 놓인 가구에 딸린 자리 + 빈 자리 → 6곳 무작위 · 고양이는 만난 고양이 위주
    const spots = HIDE.filter(h => !h.slot || placed[h.slot]).sort(() => Math.random() - 0.5).slice(0, 6);
    const met = CATS.filter(c => cf.met[c.id]), pool = [...met, ...CATS.filter(c => !cf.met[c.id] && !c.special)].slice(0, Math.max(6, met.length)).sort(() => Math.random() - 0.5);
    this.cats = spots.map((h, i) => ({ c: pool[i % pool.length], ...h, key: `n${pool[i % pool.length].id}_${h.pose}` }));
    const list = [...furnitureList(placed), ...this.cats.map(k => ({ key: k.key, x: k.x, y: k.y, w: k.w, anchor: 'bottom', z: k.z, shadow: false }))];
    composeTexture(this, 'cafe_hunt', list);
    // 맞힘 영역: 고양이 그림 가운데
    for (const k of this.cats) { const src = this.textures.get(k.key).getSourceImage(), h = k.w * src.height / src.width; k.cx = k.x; k.cy = k.y - h / 2; k.r = Math.max(42, Math.max(k.w, h) * 0.55); }
    const top = 150, trayH = 300;
    this.v = new Viewer(this, 'cafe_hunt', 0, top, W, H - top - trayH, { maxZoom: 4, onTap: (ip, p, later) => this.tap(ip, p, later) });
    this.v.zoom = 1.25; this.v.cy = ROOM.h * 0.55; this.v.apply();
    const bar = this.add.graphics(); bar.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, top).fillStyle(0xFF9DB6, 0.6).fillRect(0, top - 3, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 56, '오늘의 숨은 고양이', 34, '#FFFFFF', { w: 900 });
    this.progT = T(this, W / 2, 104, '', 24, C.sub, { w: 800 });
    this.coinT = T(this, W - 40, 76, '', 30, C.gold, { ox: 1, w: 900 });
    const ty = H - trayH, tg = this.add.graphics(); tg.fillStyle(0x2E1A2A, 1).fillRect(0, ty, W, trayH).fillStyle(0xFF9DB6, 0.6).fillRect(0, ty, W, 3);
    const n = this.cats.length, sw = Math.min(150, (W - 200) / n - 10);
    this.cats.forEach((k, i) => {
      const x = 60 + sw / 2 + i * (sw + 10), y = ty + 110, c = this.add.container(x, y), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-sw / 2, -sw / 2, sw, sw, 22);
      const im = this.add.image(0, 0, k.key); im.setScale((sw - 22) / Math.max(im.width, im.height)).setTint(0x3A2431).setAlpha(0.55);
      c.add([g, im]); k.slot = { c, im };
    });
    this.nameT = T(this, W / 2 - 60, ty + 232, '가구 뒤 · 위 · 그늘을 잘 살펴봐요', 24, C.sub, { w: 800 });
    iconBtn(this, W - 90, ty + 222, 'hint', () => this.hint(), 100); T(this, W - 90, ty + 280, `● ${HINT_COST}`, 20, C.gold, { w: 900 });
    this.ui(); this.cameras.main.fadeIn(300, 30, 10, 26);
    if (cafeData().cafe.hunt.day === today()) this.time.delayedCall(500, () => toast(this, '오늘의 별은 이미 받았어요 · 연습 판이에요', top + 110));
  }
  ui() { this.progT.setText(`찾은 고양이 ${this.got} / ${this.cats.length}`); this.coinT.setText(`● ${cafeData().coins}`); }
  tap(ip, p, later) {
    if (this.ended || this.paused) return;
    let hit = null, best = Infinity; for (const k of this.cats) { if (k.found) continue; const d2 = ((ip.x - k.cx) ** 2 + (ip.y - k.cy) ** 2) / k.r ** 2; if (d2 <= 1 && d2 < best) { best = d2; hit = k; } }
    if (hit) return this.found(hit);
    const miss = () => { audio.play('sfx_miss', { volume: 0.4 }); const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.5).setDepth(40); this.tweens.add({ targets: x, alpha: 0, scale: 0.15, duration: 380, onComplete: () => x.destroy() }); };
    later ? later(miss) : miss();
  }
  found(k) {
    k.found = true; this.got++; audio.play('sfx_find', { volume: 0.7 });
    const r = this.add.image(k.cx, k.cy, 'ring').setTint(0xFF7FA6); r.setScale(k.r * 2.4 / 160); this.v.layer.add(r); this.tweens.add({ targets: r, scale: k.r * 2 / 160, duration: 280, ease: 'Back.easeOut' });
    k.slot.im.clearTint().setAlpha(1); this.tweens.add({ targets: k.slot.c, scale: 1.15, duration: 140, yoyo: true });
    const sp = this.v.toScreen(k.cx, k.cy), t = T(this, sp.x, sp.y - 60, k.c.n, 32, '#FFFFFF', { w: 900, shadow: true }).setDepth(50); this.tweens.add({ targets: t, y: sp.y - 130, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    this.nameT.setText(`${k.c.n} 찾았다!`); this.ui();
    if (this.got >= this.cats.length) this.time.delayedCall(700, () => this.win());
  }
  hint() {
    if (this.ended || this.paused) return; const d = cafeData(); if (d.coins < HINT_COST) return toast(this, '코인이 부족해요');
    const k = this.cats.find(k => !k.found); if (!k) return; d.coins -= HINT_COST; save(); this.hints++; this.ui(); audio.play('sfx_hint', { volume: 0.7 });
    this.v.focus(k.cx, k.cy, 2.4); const g = this.add.image(k.cx, k.cy, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(k.r * 3 / 128); this.v.layer.add(g);
    this.tweens.add({ targets: g, alpha: 0.15, duration: 420, yoyo: true, repeat: 4, onComplete: () => g.destroy() });
  }
  win() {
    this.ended = true; const d = cafeData(), first = d.cafe.hunt.day !== today(), st = first ? Math.max(1, 3 - this.hints) : 0;
    if (first) { d.cafe.hunt = { day: today(), stars: st }; d.stars += st; } d.coins += 10; save();
    audio.play('sfx_clear', { volume: 0.7 }); this.cameras.main.flash(300, 255, 230, 240);
    const p = popup(this, 800, 640, { closable: false, onBack: () => this.leave() });
    p.content.add(T(this, 0, -220, '모두 찾았어요!', 52, C.ink, { w: 900 }));
    p.content.add(T(this, 0, -120, first ? '★'.repeat(st) + '☆'.repeat(3 - st) : '연습 판 완료', 64, C.gold, { w: 900 }));
    p.content.add(T(this, 0, -20, first ? `별 +${st} · 코인 +10` : '코인 +10 · 별은 내일 다시', 30, C.brown, { w: 800 }));
    p.content.add(T(this, 0, 50, first && st === 3 ? '힌트 없이 전부! 눈썰미가 대단해요' : '고양이들이 숨바꼭질을 좋아한대요', 24, C.dim, { w: 700 }));
    p.content.add(btn(this, 0, 190, 480, 110, '카페로 돌아가기', () => this.leave(), { size: 32 }));
  }
  leave() { goPrev(this); }
  onBack() { return goPrev(this); }
}
