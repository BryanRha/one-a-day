// 컬렉션: 블록 스킨(별 조각으로 해금) · 지난 주 그림 갤러리 · 기록
import { W, H } from '../config.js?v=0.48.2';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.48.2';
import { audio } from '../audio.js?v=0.48.2';
import { load, save } from '../save.js?v=0.48.2';
import { SKINS } from '../meta.js?v=0.48.2';
import { makeSkinPreview, makeBlockTextures } from './Boot.js?v=0.48.2';

export class CollectionScene extends Phaser.Scene {
  constructor() { super('Collection'); }
  create(data = {}) {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, `bg_t${d.theme % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '컬렉션', 44, C.text, { w: 900 });
    this.add.image(W - 220, 92, 'i_star').setDisplaySize(44, 44).setTint(0xF5C451);
    this.starTxt = T(this, W - 188, 92, fmt(d.stars), 36, C.gold, { ox: 0, w: 900 });
    this.tab = data.tab || 'skin';
    ['skin', 'record'].forEach((k, i) => btn(this, W / 2 - 170 + i * 340, 210, 300, 88, k === 'skin' ? '블록 스킨' : '기록 · 갤러리', () => this.scene.restart({ tab: k }), { style: this.tab === k ? 'indigo' : 'ghost', size: 32 }));
    if (this.tab === 'skin') this.skins(); else this.records();
    this.cameras.main.fadeIn(200, 8, 10, 24);
  }
  skins() {
    const d = load();
    SKINS.forEach((s, i) => {
      const x = i % 2 ? W / 2 + 235 : W / 2 - 235, y = 470 + Math.floor(i / 2) * 420;
      this.add.existing(panel(this, x, y, 450, 390, { tone: d.skin === s.id ? 'gold' : undefined }));
      this.add.image(x, y - 82, makeSkinPreview(this, s.id)).setDisplaySize(170, 170);
      T(this, x, y + 34, s.name, 40, C.text, { w: 900 });
      T(this, x, y + 76, s.desc, 24, C.sub, { w: 700 });
      const own = d.skins[s.id];
      const label = d.skin === s.id ? '사용 중' : own ? '사용하기' : `★ ${s.cost}`;
      const b = btn(this, x, y + 148, 300, 80, label, () => {
        if (d.skin === s.id) return;
        if (!own) { if (d.stars < s.cost) return toast(this, '별 조각이 부족해요 — 오늘의 미션으로 모아요', C.sub); d.stars -= s.cost; d.skins[s.id] = true; audio.play('sfx_best', { volume: 0.6 }); }
        d.skin = s.id; save(); makeBlockTextures(this, s.id); this.scene.restart({ tab: 'skin' });
      }, { style: d.skin === s.id ? 'ghost' : own ? 'indigo' : 'gold', size: 30 });
      if (d.skin === s.id) b.setEnabled(false).setAlpha(0.8);
    });
  }
  records() {
    const d = load(), rows = [['클래식 최고 점수', fmt(d.best)], ['최고 콤보', `×${d.bestCombo}`], ['지운 줄 (누적)', fmt(d.lines)], ['플레이한 판', fmt(d.plays)], ['연속 출석', `${d.streak.count}일`], ['어드벤처 트로피', `${d.trophies}개`]];
    this.add.existing(panel(this, W / 2, 620, 960, 560));
    rows.forEach(([k, v], i) => { T(this, 110, 400 + i * 84, k, 36, C.sub, { ox: 0, w: 800 }); T(this, W - 110, 400 + i * 84, v, 40, C.text, { ox: 1, w: 900 }); });
    T(this, W / 2, 990, '지난 주 그림', 38, C.text, { w: 900 });
    if (!d.gallery.length) T(this, W / 2, 1080, '이번 주 그림을 완성하면 여기에 걸려요', 30, C.dim, { w: 700 });
    d.gallery.slice(-6).forEach((gi, i) => {
      const x = W / 2 - 320 + (i % 3) * 320, y = 1160 + Math.floor(i / 3) * 260;
      const im = this.add.image(x, y, `season_${gi.season % 10}`).setDisplaySize(288, 192);
      if (!gi.trophy) im.setAlpha(0.45);
      T(this, x, y + 120, gi.trophy ? `🏆 ${gi.cleared}/96` : `${gi.cleared}/96`, 26, gi.trophy ? C.gold : C.sub, { w: 800 });
    });
  }
  go(k) { this.cameras.main.fadeOut(200, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k)); }
}
