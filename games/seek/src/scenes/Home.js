// 사진관: 오늘의 손님(오늘의 사진) · 사진 벽(앨범) · 연속 방문 · 별 · 물건 도감
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.19.1';
import { T, C, btn, iconBtn, panel, popup, stars, toast } from '../ui.js?v=0.19.1';
import { audio } from '../audio.js?v=0.19.1';
import { load, save } from '../save.js?v=0.19.1';
import { SCENES } from '../content.js?v=0.19.1';
import * as M from '../meta.js?v=0.19.1';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    const d = load(), n = M.unlocked(), today = M.todayScene(), rec = M.record(today.id);
    const bg = this.add.image(W / 2, H / 2, 'studio'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A0E06, 0.35);
    const fade = this.add.graphics(); for (let i = 0; i < 30; i++) fade.fillStyle(0x1A0E06, 0.8 * (1 - i / 30)).fillRect(0, i * 10, W, 10);
    if (!this.checked) { this.checked = true; const s = M.checkIn(); if (s && s > 1) this.time.delayedCall(500, () => toast(this, `${s}일 연속 방문 · 반가워요!`, 360)); }
    // 위: 제목 · 별 · 연속
    T(this, W / 2, 120, TITLE, 92, C.cream, { w: 900, shadow: true }); T(this, W / 2, 196, TITLE_EN, 26, C.gold, { w: 800, ls: 12 });
    T(this, 60, 270, `★ ${M.totalStars()}`, 32, C.gold, { ox: 0, w: 900, shadow: true }); T(this, W - 60, 270, `${d.streak.count || 1}일째 방문`, 28, C.cream, { ox: 1, w: 800, shadow: true });
    iconBtn(this, W - 70, 70, '⚙', () => this.settings(), 84, { dark: true });
    // 오늘의 손님 카드
    const cy = H * 0.5 + 40, ch = 700;
    this.add.existing(panel(this, W / 2, cy, 940, ch));
    T(this, W / 2, cy - ch / 2 + 60, rec ? '다시 보고 싶은 사진' : '기다리는 손님', 28, C.dim, { w: 800, ls: 4 });
    // 사진 미리보기 (액자)
    const pw = today.kind === 'ho' ? 300 : 420, ph = pw * today.h / today.w, px = W / 2 - 230, py = cy - 40;
    this.add.rectangle(px, py, pw + 24, ph + 24, 0xFFFFFF).setStrokeStyle(2, 0xB39A78);
    const im = this.add.image(px, py, today.img); im.setScale(Math.min(pw / im.width, ph / im.height)); if (rec) {} else im.setTint(0xD9C8A8);
    this.add.rectangle(px, py, pw, ph).setStrokeStyle(1, 0x000000, 0.2);
    const tx = W / 2 - 230 + pw / 2 + 50;
    T(this, tx, cy - 200, today.guest, 48, C.ink, { ox: 0, w: 900 });
    T(this, tx, cy - 145, today.who, 24, C.dim, { ox: 0, w: 700, wrap: 420 });
    T(this, tx, cy - 80, `「${today.title}」`, 32, C.brown, { ox: 0, w: 800 }); T(this, tx, cy - 35, `${today.year}년`, 26, C.dim, { ox: 0, w: 700 });
    T(this, tx, cy + 30, today.kind === 'ho' ? '숨은 물건 찾기' : '틀린 그림 찾기', 30, today.kind === 'ho' ? '#7A4E1E' : '#2E5E8A', { ox: 0, w: 900 });
    if (rec) this.add.existing(stars(this, tx + 90, cy + 100, rec.stars, 46, 56));
    const go = btn(this, W / 2, cy + ch / 2 - 100, 640, 140, rec ? '다시 보기' : '사진 받기', () => this.open(today), { style: 'gold', size: 46 });
    if (!rec) this.tweens.add({ targets: go, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 아래: 사진 벽 · 물건 도감
    const by = H - 150;
    btn(this, W / 2 - 230, by, 420, 120, `사진 벽 ${Object.keys(d.done).length}/${SCENES.length}`, () => this.wall(), { style: 'brown', size: 34 });
    btn(this, W / 2 + 230, by, 420, 120, `물건 도감 ${M.foundCount()}`, () => this.dex(), { style: 'brown', size: 34 });
    T(this, W / 2, by - 110, n < SCENES.length ? `사진을 풀면 다음 손님이 바로 와요 · 지금까지 ${n}장` : '모든 손님을 만났어요 · 별을 모아보세요', 24, C.cream, { w: 700, shadow: true });
    this.cameras.main.fadeIn(300, 20, 12, 6); window.__home = this;
  }
  open(sc) { audio.play('sfx_page', { volume: 0.6 }); this.cameras.main.fadeOut(220, 20, 12, 6); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Guest', { id: sc.id })); }
  // 사진 벽: 열린 사진은 액자 · 별 / 아직은 빈 액자
  wall() {
    const n = M.unlocked(), p = popup(this, 1000, Math.min(H - 160, 1600)), cols = 3, cw = 300, chh = 330, ph = Math.min(H - 160, 1600);
    p.content.add(T(this, 0, -ph / 2 + 70, '사진 벽', 48, C.ink, { w: 900 }));
    SCENES.forEach((sc, i) => {
      const x = (i % cols - 1) * cw, y = -ph / 2 + 260 + Math.floor(i / cols) * chh; if (y > ph / 2 - 120) return;
      const open = i < n, rec = M.record(sc.id), fw = 240, fh = 190;
      p.content.add(this.add.rectangle(x, y, fw + 16, fh + 16, open ? 0xFFFFFF : 0xE8DCC6).setStrokeStyle(2, 0xB39A78));
      if (open) { const im = this.add.image(x, y, sc.img); im.setScale(Math.max(fw / im.width, fh / im.height)); const mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRect(W / 2 + x - fw / 2, p.box.y + y - fh / 2, fw, fh); im.setMask(mk.createGeometryMask()); if (!rec) im.setTint(0xC8B898); p.content.add(im); }
      else p.content.add(T(this, x, y, '?', 70, '#C8B898', { w: 900 }));
      p.content.add(T(this, x, y + fh / 2 + 34, open ? sc.title : '곧 만나요', 24, open ? C.brown : C.dim, { w: 800 }));
      if (rec) p.content.add(stars(this, x, y + fh / 2 + 70, rec.stars, 26, 30));
      if (open) { const z = this.add.zone(x, y, fw + 16, fh + 16).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { p.close(); this.open(sc); }); p.content.add(z); }
    });
  }
  // 물건 도감: 숨은물건에서 찾은 물건 이름
  dex() {
    const d = load(), list = SCENES.filter(s => s.kind === 'ho'), p = popup(this, 960, Math.min(H - 200, 1500)), ph = Math.min(H - 200, 1500);
    p.content.add(T(this, 0, -ph / 2 + 70, '추억 물건 도감', 46, C.ink, { w: 900 }));
    let y = -ph / 2 + 160;
    for (const sc of list) {
      if (y > ph / 2 - 80) break; const f = (d.done[sc.id] || {}).found || {}, got = sc.items.filter(i => f[i.n]).length;
      p.content.add(T(this, -420, y, `${sc.title}  ${got}/${sc.items.length}`, 28, C.brown, { ox: 0, w: 900 }));
      p.content.add(T(this, -420, y + 40, sc.items.map(i => f[i.n] ? i.n : '???').join(' · '), 22, C.dim, { ox: 0, oy: 0, w: 700, wrap: 840 }));
      y += 190;
    }
  }
  settings() { const d = load(), p = popup(this, 700, 420); p.content.add(T(this, 0, -120, '설정', 44, C.ink, { w: 900 })); const b = btn(this, 0, 40, 420, 110, d.sfx ? '효과음 켜짐' : '효과음 꺼짐', () => { const on = audio.toggleSfx(); b.setLabel(on ? '효과음 켜짐' : '효과음 꺼짐'); }, { style: 'cream' }); p.content.add(b); }
}
