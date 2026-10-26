// 카드 앨범 화면 (원작의 카드 앨범): 팩 열기 · 세트 9개 · 세트 보기(조커로 채우기) · 별 금고 · 세트/앨범 완성 보상
import { W, H } from '../config.js?v=0.62.0';
import { T, R, C, TS, btn, sheet, rbox, chips, toast, firstTip } from '../ui.js?v=0.62.0';
import { audio } from '../audio.js?v=0.62.0';
import { save } from '../save.js?v=0.62.0';
import { goPrev } from '../nav.js?v=0.62.0';
import { screen } from '../hud.js?v=0.62.0';
import { giveReward } from '../state.js?v=0.62.0';
import { SETS, PACKS, VAULT, ALBUM_DONE, album, seasonLeft, scaled, owned, setCount, totalCount, openPack, useJoker, vaultBuy, claimable, albumClaimable, cardOf } from '../album.js?v=0.62.0';

const RCOL = [0, 0xC9B8B0, 0x7CC6A8, 0x6FA8E8, 0xB57BE0, 0xF0B65A];   // 별 수별 테두리 색

// 카드 한 장 그리기 (가진 카드는 그림 · 없는 카드는 흐린 실루엣)
export function card(sc, x, y, key, w, o = {}) {
  const c = cardOf(key), have = o.have ?? owned(key), h = w * 1.32, ct = sc.add.container(x, y), g = sc.add.graphics();
  g.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, w * 0.1);
  g.fillStyle(have ? 0xFFFBF6 : 0xEFE4E0, 1).fillRoundedRect(-w / 2, -h / 2, w, h, w * 0.1).lineStyle(Math.max(3, w * 0.035), have ? RCOL[c.r] : 0xD9C9C2, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, w * 0.1);
  ct.add(g);
  const im = sc.add.image(0, -h * 0.1, key); im.setScale((w * 0.86) / im.width); if (!have) im.setTintFill(0xD9C9C2).setAlpha(0.6); ct.add(im);
  ct.add(T(sc, 0, h * 0.3, have ? c.n : '???', Math.max(14, w * 0.1), have ? C.ink : C.dim, { w: 800, wrap: w * 0.92 }));
  ct.add(T(sc, 0, h * 0.42, '★'.repeat(c.r), Math.max(12, w * 0.085), have ? '#E8A93A' : '#CDBDB6', { w: 900 }));
  if (o.count > 1) { ct.add(sc.add.circle(w / 2 - 14, -h / 2 + 14, 18, 0xE86A8E)); ct.add(T(sc, w / 2 - 14, -h / 2 + 13, `${o.count}`, 18, '#FFFFFF', { w: 900 })); }
  ct.setSize(w, h); return ct;
}

export class AlbumScene extends Phaser.Scene {
  constructor() { super('Album'); }
  create(data) {
    audio.music('bgm_shop'); const a = this.a = album();
    let y = screen(this, '카드 앨범', { right: `${totalCount()} / 81`, sub: `시즌 ${a.season} · 남은 ${Math.ceil(seasonLeft() / 864e5)}일 · 주문 5번마다 카드 팩` });
    const pg = this.add.graphics(); pg.fillStyle(0xF1DCD3, 1).fillRoundedRect(50, y - 6, W - 100, 16, 8).fillStyle(0xE86A8E, 1).fillRoundedRect(50, y - 6, Math.max(16, (W - 100) * totalCount() / 81), 16, 8);
    // 팩 · 별 금고 · 조커
    y += 30; const bar = this.add.graphics(); bar.fillStyle(0xFFFFFF, 1).fillRoundedRect(30, y, W - 60, 190, 30).lineStyle(3, 0xF1D2C8, 1).strokeRoundedRect(30, y, W - 60, 190, 30);
    Object.entries(PACKS).forEach(([k, P], i) => {
      const x = 130 + i * 190, n = a.packs[k] || 0, im = this.add.image(x, y + 82, P.img); im.setScale(110 / im.height); if (!n) im.setAlpha(0.35);
      if (n) this.tweens.add({ targets: im, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1 });
      T(this, x, y + 160, `${P.n} ${n}`, TS.min, n ? C.ink : C.dim, { w: 800 });
      this.add.zone(x, y + 90, 170, 180).setInteractive({ useHandCursor: true }).on('pointerup', () => n ? this.open(k) : toast(this, `${P.n}이 없어요 · 주문을 완료하면 받아요`));
    });
    const vx = 760, vi = this.add.image(vx, y + 80, 'vault'); vi.setScale(100 / vi.height); R(this, vx, y + 160, `별 ★${a.stars}`, TS.min, C.gold, { w: 900 });
    this.add.zone(vx, y + 90, 150, 180).setInteractive({ useHandCursor: true }).on('pointerup', () => this.vault());
    const jx = 935, ji = this.add.image(jx, y + 80, 'joker'); ji.setScale(100 / ji.height); if (!a.jokers) ji.setAlpha(0.35); T(this, jx, y + 160, `조커 ${a.jokers}`, TS.min, a.jokers ? C.rose : C.dim, { w: 900 });
    this.add.zone(jx, y + 90, 150, 180).setInteractive({ useHandCursor: true }).on('pointerup', () => toast(this, a.jokers ? '세트를 열고 없는 카드를 누르면 조커로 채워요' : '조커는 별 금고 · 출석 7일째에 받아요'));
    // 세트 9개
    y += 220; const cw = (W - 100) / 3, chh = Math.min(380, (H - y - 40) / 3 - 10);
    SETS.forEach((s, i) => {
      const x = 40 + (i % 3) * (cw + 10) + cw / 2, yy = y + Math.floor(i / 3) * (chh + 10), n = setCount(s), done = a.done.includes(s.id), ready = n === 9 && !done;
      const g = this.add.graphics(); g.fillStyle(done ? 0xFFF4D6 : 0xFFFFFF, 1).fillRoundedRect(x - cw / 2, yy, cw, chh, 26).lineStyle(ready ? 6 : 3, ready ? 0xE86A8E : done ? 0xF0B65A : 0xF1D2C8, 1).strokeRoundedRect(x - cw / 2, yy, cw, chh, 26);
      const show = s.cards.find(c => owned(c.key)) || s.cards[0], im = this.add.image(x, yy + chh * 0.4, show.key); im.setScale(Math.min(cw - 50, chh * 0.6) / im.width); if (!owned(show.key)) im.setTintFill(0xD9C9C2).setAlpha(0.6);
      T(this, x, yy + chh * 0.78, s.n, TS.min + 2, C.ink, { w: 900 });
      const bg2 = this.add.graphics(); bg2.fillStyle(0xF1DCD3, 1).fillRoundedRect(x - cw / 2 + 30, yy + chh * 0.88, cw - 60, 14, 7).fillStyle(done ? 0xF0B65A : 0x7CC6A8, 1).fillRoundedRect(x - cw / 2 + 30, yy + chh * 0.88, Math.max(14, (cw - 60) * n / 9), 14, 7);
      T(this, x + cw / 2 - 20, yy + 26, done ? '완성 ✓' : `${n}/9`, TS.min, done ? C.gold : C.dim, { ox: 1, w: 900 });
      if (ready) { const b = T(this, x - cw / 2 + 20, yy + 26, '보상!', TS.min, C.rose, { ox: 0, w: 900 }); this.tweens.add({ targets: b, scale: 1.15, duration: 500, yoyo: true, repeat: -1 }); }
      this.add.zone(x, yy + chh / 2, cw, chh).setInteractive({ useHandCursor: true }).on('pointerup', () => this.showSet(s));
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__album = this;
    firstTip(this, 'album', '카드 앨범', ['주문 5번 · 레벨업 · 출석 · 이벤트에서 카드 팩을 받아요', '9장을 모으면 세트 보상, 81장을 다 모으면 큰 보상!', '겹친 카드는 별이 되어 별 금고에서 팩·조커로 바꿔요', `${40}일마다 새 시즌 · 시즌마다 보상이 커져요`], 'album');
    if (albumClaimable()) this.time.delayedCall(400, () => this.albumDone());
    else if (data && data.set) this.time.delayedCall(250, () => this.showSet(SETS.find(s => s.id === data.set)));
  }
  // 세트 보기: 9장 · 없는 카드는 조커로 · 다 모으면 보상 받기
  showSet(s) {
    const a = this.a, n = setCount(s), done = a.done.includes(s.id), p = sheet(this, { size: 'L', title: s.n, sub: `${n} / 9 · 다 모으면 보상` });
    s.cards.forEach((c, i) => { const cv = card(this, (i % 3 - 1) * 300, Math.floor(i / 3) * 370, c.key, 264, { count: a.have[c.key] || 0 }); p.content.add(cv);
      cv.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (owned(c.key)) return this.zoom(c.key); if (!a.jokers) return toast(this, '아직 없는 카드예요 · 카드 팩에서 나와요'); p.close(); this.joker(c.key, s); }); });
    p.content.add(chips(this, 0, 1000, scaled(s.reward), { size: 64, gap: 150, done }));
    if (n === 9 && !done) p.foot([{ t: '보상 받기', fn: () => { a.done.push(s.id); giveReward(scaled(s.reward)); save(); audio.play('sfx_levelup', { volume: 0.7 }); audio.duck(2400); p.close(); this.scene.restart(); } }]);
    else p.foot([{ t: '닫기', style: 'cream' }]);
  }
  zoom(key) { const p = sheet(this, { size: 'S', tone: 'dark', sub: `가진 수 ${this.a.have[key]}장 · 겹친 카드는 별 금고로` }); p.content.add(card(this, 0, 0, key, 560, { count: this.a.have[key] })); audio.play('sfx_tap', { volume: 0.6 }); }
  joker(key, s) {
    const p = sheet(this, { size: 'S', title: '조커 카드 쓰기', sub: '없는 카드를 조커로 채워요' }); p.content.add(card(this, 0, 0, key, 280, { have: true }));
    p.foot([{ t: '쓸게요', fn: () => { if (useJoker(key)) { audio.play('sfx_merge_big', { volume: 0.7 }); p.close(); this.scene.restart({ set: s.id }); } } }, { t: '나중에', style: 'cream' }]);
  }
  // 팩 열기: 뒷면 카드가 차례로 뒤집힘 · 새 카드는 NEW · 겹친 카드는 별
  open(type) {
    const out = openPack(type); if (!out) return; const P = PACKS[type];
    audio.play('sfx_box', { volume: 0.7 }); audio.buzz([20, 40, 20]);
    const p = sheet(this, { size: 1040, h: 1180, tone: 'dark', closable: false, title: P.n }), n = out.length, cw = n > 3 ? 220 : 280;
    const pack = this.add.image(0, -40, P.img); pack.setScale(380 / pack.height); p.content.add(pack);
    this.tweens.add({ targets: pack, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 5, onComplete: () => {
      this.tweens.add({ targets: pack, scale: pack.scale * 1.4, alpha: 0, duration: 300 });
      out.forEach((c, i) => {
        const cols = n > 3 ? 3 : n, row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), x = (i % cols - (inRow - 1) / 2) * (cw + 30), y = n > 3 ? -230 + row * (cw * 1.32 + 40) : -60;
        const back = this.add.graphics().setPosition(x, y); back.fillStyle(0xE86A8E, 1).fillRoundedRect(-cw / 2, -cw * 0.66, cw, cw * 1.32, 22).lineStyle(6, 0xFFE3EC, 1).strokeRoundedRect(-cw / 2, -cw * 0.66, cw, cw * 1.32, 22); back.setScale(0); p.content.add(back);
        const front = card(this, x, y, c.key, cw, { have: true }); front.scaleX = 0; p.content.add(front);
        this.tweens.add({ targets: back, scale: 1, duration: 260, delay: 200 + i * 120, ease: 'Back.easeOut' });
        this.tweens.add({ targets: back, scaleX: 0, duration: 140, delay: 800 + i * 260, onComplete: () => {
          this.tweens.add({ targets: front, scaleX: 1, duration: 160 }); audio.play(c.r >= 4 ? 'sfx_merge_big' : 'sfx_pick', { volume: c.r >= 4 ? 0.7 : 0.6, gap: 10 });
          const tag = c.isNew ? T(this, x, y - cw * 0.66 - 6, 'NEW!', 30, '#FFE27A', { w: 900, shadow: true }) : T(this, x, y - cw * 0.66 - 6, `+★${c.stars}`, 28, '#FFD98A', { w: 900, shadow: true }); p.content.add(tag);
          if (c.r >= 4) { const gl = this.add.image(x, y, 'glow').setTint(RCOL[c.r]).setBlendMode('ADD').setScale(4); p.content.addAt(gl, 1); this.tweens.add({ targets: gl, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 }); }
        } });
      });
      this.time.delayedCall(1000 + n * 260, () => {
        const nw = out.filter(c => c.isNew).length, st = out.reduce((s2, c) => s2 + c.stars, 0);
        p.content.add(R(this, 0, 380, `새 카드 ${nw}장${st ? ` · 별 ★${st}` : ''}`, TS.body, '#FFFFFF', { w: 900 }));
        p.foot([{ t: '좋아요', fn: () => { p.close(); this.scene.restart(); } }]);
      });
    } });
  }
  vault() {
    const a = this.a, p = sheet(this, { size: 'M', title: '별 금고', sub: `겹친 카드의 별로 바꿔요 · 지금 ★${a.stars}` });
    VAULT.forEach((v, i) => { const y = i * 170; p.content.add(rbox(this, 0, y, 800, 150, { fill: '#FFF4EC', r: 26 }));
      const im = this.add.image(-320, y, v.pack ? PACKS[v.pack].img : 'joker'); im.setScale(116 / im.height); p.content.add(im);
      p.content.add(T(this, -240, y, v.pack ? PACKS[v.pack].n : '조커 카드', TS.body, C.ink, { ox: 0, w: 900 }));
      p.content.add(btn(this, 240, y, 240, 96, `★${v.cost}`, () => { if (!vaultBuy(i)) return toast(this, '별이 부족해요'); audio.play('sfx_coin', { volume: 0.7 }); p.close(); this.scene.restart(); }, { style: a.stars >= v.cost ? 'gold' : 'cream', size: 32 })); });
    p.foot([{ t: '닫기', style: 'cream' }]);
  }
  albumDone() {
    const a = this.a, p = sheet(this, { size: 'M', title: '앨범 완성!', sub: '81장을 모두 모았어요', closable: false });
    const al = this.add.image(0, 0, 'album'); al.setScale(200 / al.height); p.content.add(al);
    p.content.add(chips(this, 0, 200, scaled(ALBUM_DONE), { size: 80, gap: 170, font: 28 }));
    p.foot([{ t: '받기', fn: () => { a.all = true; giveReward(scaled(ALBUM_DONE)); save(); audio.play('sfx_levelup', { volume: 0.8 }); p.close(); this.scene.restart(); } }]);
  }
  onBack() { return goPrev(this); }
}
