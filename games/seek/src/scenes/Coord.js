// 오늘의 코디: 매일 이야기 속 상황 하나(Covet · Dress to Impress) → 옷장(한 벌 + 머리 · 가방 · 손 소품, 추천 3벌) → 인생샷 → 하나 · 지아 · 어머니 심사
import { W, H } from '../config.js?v=0.45.6';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.45.6';
import { audio } from '../audio.js?v=0.45.6';
import { goPrev } from '../nav.js?v=0.45.6';
import { save } from '../save.js?v=0.45.6';
import { OUTFITS, ACCS, THEMES, SLOT_NAMES } from '../coord/data.js?v=0.45.6';
import { coordData, item, owned, lockText, buy, todayTheme, doneToday, judge, recommend } from '../coord/state.js?v=0.45.6';
import { buildLook } from '../coord/look.js?v=0.45.6';
import { today } from '../cafe/state.js?v=0.45.6';

const SHEET = 620, PER = 10;
export class CoordScene extends Phaser.Scene {
  constructor() { super('Coord'); }
  create(data) {
    this.th = todayTheme(); this.tab = 'outfit'; this.page = 0; this.busy = false; this.mode = data && data.album ? 'album' : 'brief';
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A).setDepth(-10);
    const need = [...OUTFITS.map(o => o.id), ...ACCS.map(a => a.id)].filter(k => !this.textures.exists(k));
    for (const k of need) this.load.image(k, `assets/coord/${k}.webp`);
    for (const t of new Set(THEMES.map(t => t.bg))) if (!this.textures.exists(t)) this.load.image(t, `assets/v2/${t}.webp`);
    const wait = T(this, W / 2, H / 2, '옷장 여는 중…', 34, C.sub, { w: 800 });
    this.load.once('complete', () => { wait.destroy(); this.mode === 'album' ? this.album() : this.brief(); }); this.load.start();
    window.__coord = this;
  }
  bg(key) { this.bgIm?.destroy(); this.bgIm = this.add.image(W / 2, H / 2, key).setDepth(-5); this.bgIm.setScale(Math.max(W / this.bgIm.width, H / this.bgIm.height)); }
  // ── 1. 오늘의 상황
  brief() {
    const th = this.th, d = coordData(); this.bg(th.bg); this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.35).setDepth(-4);
    this.topBar(`오늘의 코디 · ${new Date().getMonth() + 1}월 ${new Date().getDate()}일`);
    const p = popup(this, 940, 1060, { closable: false, onBack: () => goPrev(this) }); this.briefP = p;
    p.content.add(T(this, 0, -460, '오늘의 상황', 26, C.dim, { w: 800 }));
    p.content.add(T(this, 0, -405, th.t, 52, C.ink, { w: 900 }));
    const row = this.add.container(0, -260), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-420, -90, 840, 180, 26); row.add(g);
    const f = this.add.image(-340, 0, th.who); f.setScale(150 / f.width); row.add(f);
    row.add(T(this, -250, -40, th.by, 26, '#C25A80', { ox: 0, w: 900 })); row.add(T(this, -250, 18, `"${th.line}"`, 26, C.ink, { ox: 0, w: 700, wrap: 640, align: 'left' }));
    p.content.add(row);
    p.content.add(T(this, -420, -110, '오늘의 심사위원', 28, C.ink, { ox: 0, w: 900 }));
    [['c_hana', '하나', '트렌드'], ['c_jia_smile', '지아', '깐깐함'], ['c_mother', '어머니', '단정함']].forEach(([k, n, t], i) => {
      const x = (i - 1) * 280, im = this.add.image(x, 0, k); im.setScale(140 / im.width); p.content.add(im);
      p.content.add(T(this, x, 95, n, 28, C.ink, { w: 900 })); p.content.add(T(this, x, 130, t, 22, C.dim, { w: 700 }));
    });
    p.content.add(T(this, 0, 215, `힌트 · ${th.tags.join(' · ')}   +  숨은 기준 하나`, 28, '#C25A80', { w: 900 }));
    p.content.add(T(this, 0, 262, doneToday() ? '오늘의 별은 이미 받았어요 · 다시 입어 봐도 좋아요' : '별 ★ 1~3 · 코인 · 앨범 사진을 받아요', 22, C.dim, { w: 800 }));
    p.content.add(btn(this, -170, 400, 320, 110, '앨범', () => { p.close(); this.scene.restart({ album: true }); }, { style: 'cream', size: 32 }));
    p.content.add(btn(this, 170, 400, 380, 110, '옷장 열기', () => { p.close(); this.time.delayedCall(150, () => this.closet()); }, { size: 34 }));
  }
  topBar(title) {
    const bar = this.add.graphics().setDepth(50); bar.fillStyle(0x2E1A2A, 0.92).fillRect(0, 0, W, 150).fillStyle(0xFF9DB6, 0.5).fillRect(0, 147, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true }).setDepth(51);
    this.titleT = T(this, W / 2, 56, title, 34, '#FFFFFF', { w: 900 }).setDepth(51); this.subT = T(this, W / 2, 104, '', 22, C.sub, { w: 800 }).setDepth(51);
    this.coinT = T(this, W - 40, 76, `● ${coordData().coins}`, 30, C.gold, { ox: 1, w: 900 }).setDepth(51);
  }
  // ── 2. 옷장
  closet() {
    this.mode = 'closet'; const th = this.th; this.w = { ...coordData().coord.wear }; if (!owned(this.w.o)) this.w.o = 'o1';
    for (const k of ['hair', 'bag', 'prop']) if (this.w[k] && !owned(this.w[k])) this.w[k] = null;
    this.titleT.setText(th.t); this.subT.setText(`힌트 · ${th.tags.join(' · ')} · 숨은 기준 하나`);
    this.lookH = Math.min(1150, H - SHEET - 190); this.lookX = 390; this.lookY = H - SHEET - 10;
    this.add.ellipse(this.lookX, this.lookY - 6, 300, 44, 0x1A0814, 0.35).setDepth(1);
    this.drawLook();
    // 오늘의 추천 3벌
    T(this, 920, 190, '오늘의 추천', 26, '#FFFFFF', { w: 900, shadow: true }).setDepth(5);
    const cardH = Math.min(300, (H - SHEET - 260) / 3 - 14);
    recommend(th).forEach((id, i) => {
      const y = 230 + cardH / 2 + i * (cardH + 14), c = this.add.container(920, y).setDepth(5), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.95).fillRoundedRect(-95, -cardH / 2, 190, cardH, 20); c.add(g);
      const im = this.add.image(0, 0, id); im.setScale((cardH - 20) / im.height); c.add(im);
      c.setSize(190, cardH).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.wear('outfit', id); this.tab = 'outfit'; this.page = Math.floor(OUTFITS.findIndex(o => o.id === id) / PER); this.drawSheet(); });
    });
    this.drawSheet();
  }
  drawLook() {
    this.look?.destroy(); this.look = buildLook(this, this.w.o, this.w, this.lookH).setPosition(this.lookX, this.lookY).setDepth(2);
    this.look.setScale(0.97); this.tweens.add({ targets: this.look, scale: 1, duration: 200, ease: 'Back.easeOut' });
  }
  wear(slot, id) {
    if (slot === 'outfit') this.w.o = id; else this.w[slot] = this.w[slot] === id ? null : id;
    audio.play('sfx_click', { volume: 0.4 }); this.drawLook();
  }
  drawSheet() {
    this.sheet?.destroy(); const y0 = H - SHEET, s = this.sheet = this.add.container(0, 0).setDepth(20), g = this.add.graphics();
    g.fillStyle(0xFFF6F8, 1).fillRoundedRect(0, y0, W, SHEET + 40, 40); s.add(g);
    ['outfit', 'hair', 'bag', 'prop'].forEach((k, i) => {
      const x = 145 + i * 230, on = this.tab === k, tb = this.add.container(x, y0 + 60), tg = this.add.graphics();
      tg.fillStyle(on ? 0xE8628A : 0xF6E3EA, 1).fillRoundedRect(-105, -32, 210, 64, 32); tb.add([tg, T(this, 0, -2, SLOT_NAMES[k], 26, on ? '#FFFFFF' : C.ink, { w: 900 })]);
      tb.setSize(210, 64).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.tab = k; this.page = 0; audio.play('sfx_click', { volume: 0.3 }); this.drawSheet(); }); s.add(tb);
    });
    const list = this.tab === 'outfit' ? OUTFITS : ACCS.filter(a => a.slot === this.tab), pages = Math.ceil(list.length / PER); this.page = Math.min(this.page, pages - 1);
    const cw = 176, ch = 196;
    list.slice(this.page * PER, this.page * PER + PER).forEach((it, i) => {
      const x = 120 + (i % 5) * (cw + 14), y = y0 + 210 + Math.floor(i / 5) * (ch + 14), have = owned(it.id), on = this.tab === 'outfit' ? this.w.o === it.id : this.w[this.tab] === it.id;
      const c = this.add.container(x, y), cg = this.add.graphics(); cg.fillStyle(0xFFFFFF, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 20).lineStyle(on ? 6 : 2, on ? 0xE8628A : 0xF0D6DF, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 20); c.add(cg);
      const im = this.add.image(0, -10, it.id); im.setScale(Math.min((cw - 24) / im.width, (ch - 50) / im.height)); if (!have) im.setAlpha(0.35); c.add(im);
      if (!have) { const lg = this.add.graphics(); lg.fillStyle(it.get === 'shop' ? 0xF0B65A : 0x9A7A8A, 1).fillRoundedRect(-cw / 2 + 10, ch / 2 - 44, cw - 20, 36, 18); c.add([lg, T(this, 0, ch / 2 - 27, lockText(it), 18, '#FFFFFF', { w: 900 })]); }
      else if (this.tab !== 'outfit') c.add(T(this, 0, ch / 2 - 24, it.s, 18, '#C25A80', { w: 800 }));
      else c.add(T(this, 0, ch / 2 - 24, it.s.join(' · '), 17, '#C25A80', { w: 800 }));
      c.setSize(cw, ch).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (have) { this.wear(this.tab, it.id); return this.drawSheet(); }
        if (it.get !== 'shop') return toast(this, `${it.n} · ${lockText(it)} 얻어요`, y0 - 80);
        this.shop(it);
      });
      s.add(c);
    });
    if (pages > 1) {
      s.add(T(this, W / 2, y0 + 432, `${this.page + 1} / ${pages}`, 22, C.dim, { w: 800 }));
      const pv = iconBtn(this, W / 2 - 110, y0 + 432, '‹', () => { this.page = (this.page + pages - 1) % pages; this.drawSheet(); }, 64); const nx = iconBtn(this, W / 2 + 110, y0 + 432, '›', () => { this.page = (this.page + 1) % pages; this.drawSheet(); }, 64); s.add([pv, nx]);
    }
    s.add(btn(this, W / 2, y0 + 540, 560, 110, '이 코디로 촬영하기', () => this.shoot(), { size: 34 }));
  }
  shop(it) {
    const d = coordData(), p = popup(this, 760, 640);
    p.content.add(T(this, 0, -240, it.n, 38, C.ink, { w: 900 }));
    const im = this.add.image(0, -60, it.id); im.setScale(Math.min(260 / im.width, 260 / im.height)); p.content.add(im);
    p.content.add(T(this, 0, 110, `분위기 · ${[].concat(it.s).join(' · ')}`, 26, '#C25A80', { w: 800 }));
    p.content.add(T(this, 0, 155, `가진 코인 ● ${d.coins}`, 24, C.dim, { w: 800 }));
    p.content.add(btn(this, -170, 250, 300, 100, '그만두기', () => p.close(), { style: 'cream', size: 28 }));
    p.content.add(btn(this, 170, 250, 320, 100, `● ${it.price} 사기`, () => {
      if (!buy(it.id)) return toast(this, '코인이 부족해요 · 이야기와 냥카페에서 모여요');
      audio.play('sfx_clear', { volume: 0.5 }); p.close(); this.coinT.setText(`● ${coordData().coins}`); this.wear(it.slot || 'outfit', it.id); this.drawSheet(); toast(this, `${it.n}을(를) 옷장에 넣었어요`, H - SHEET - 80);
    }, { size: 28 }));
  }
  // ── 3. 인생샷
  shoot() {
    if (this.busy) return; this.busy = true; const d = coordData(); d.coord.wear = { ...this.w }; save();
    this.sheet.setVisible(false); audio.play('sfx_shutter', { volume: 0.8 }); this.cameras.main.flash(380, 255, 255, 255);
    const root = this.add.container(0, 0).setDepth(60); root.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.6).setInteractive());
    root.add(T(this, W / 2, 230, '찰칵!', 80, '#FFFFFF', { w: 900, shadow: true }));
    const pol = this.polaroid(this.th, this.w, 640); pol.setPosition(W / 2, H / 2 + 20).setAngle(-3).setScale(0.6).setAlpha(0); root.add(pol);
    this.tweens.add({ targets: pol, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut', delay: 250 });
    root.add(btn(this, W / 2, H - 170, 480, 110, '평가 보기', () => { root.destroy(); this.result(); }, { size: 34 }));
  }
  // 폴라로이드: 장소 그림(잘라서) + 코디
  polaroid(th, w, pw = 640, stamp) {
    const ph = pw * 1.2, inner = pw - 40 * pw / 640, ih = ph - 140 * pw / 640, c = this.add.container(0, 0), g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRect(-pw / 2 + 10, -ph / 2 + 14, pw, ph).fillStyle(0xFFFFFF, 1).fillRect(-pw / 2, -ph / 2, pw, ph); c.add(g);
    const m = 20 * pw / 640, bg = this.add.image(0, -ph / 2 + m + ih / 2, th.bg), k = Math.max(inner / bg.width, ih / bg.height); bg.setScale(k).setCrop((bg.width - inner / k) / 2, (bg.height - ih / k) / 2, inner / k, ih / k); c.add(bg);
    const lk = buildLook(this, w.o, w, ih * 0.92); lk.setPosition(0, -ph / 2 + m + ih - 4); c.add(lk);
    c.add(T(this, 0, ph / 2 - (ph - ih - 20) / 2, stamp || `${new Date().getMonth() + 1}.${new Date().getDate()} · ${th.t}`, Math.max(22, Math.round(pw / 22)), C.ink, { w: 800 }));
    return c;
  }
  // ── 4. 심사 결과
  result() {
    const th = this.th, r = judge(th, this.w), d = coordData(), first = !doneToday();
    if (first) { d.coord.day = today(); d.stars += r.stars; d.coins += r.stars * 10; }
    d.coord.album = [{ day: today(), t: th.i, w: { ...this.w }, st: r.stars }, ...d.coord.album.filter(a => !(a.day === today() && a.st <= r.stars))].slice(0, 60); save();
    audio.play('sfx_clear', { volume: 0.7 });
    const p = popup(this, 960, 1280, { closable: false, onBack: () => { p.close(); this.busy = false; this.sheet.setVisible(true); } });
    p.content.add(T(this, 0, -560, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), 70, C.gold, { w: 900 }));
    p.content.add(T(this, 0, -480, ['괜찮은 시작이에요!', '잘 어울려요!', `완벽한 ${th.t} 룩!`][r.stars - 1], 42, C.ink, { w: 900 }));
    r.judges.forEach(({ j, st, line }, i) => {
      const y = -340 + i * 175, row = this.add.container(0, y), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-430, -75, 860, 150, 24); row.add(g);
      const f = this.add.image(-360, 0, j.face); f.setScale(120 / f.width); row.add(f);
      row.add(T(this, -280, -32, `${j.n}  ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, 28, C.ink, { ox: 0, w: 900 }));
      row.add(T(this, -280, 22, `"${line}"`, 24, C.brown, { ox: 0, w: 700, wrap: 680, align: 'left' }));
      row.setAlpha(0); this.tweens.add({ targets: row, alpha: 1, duration: 300, delay: 300 + i * 350 }); p.content.add(row);
    });
    r.notes.forEach((n, i) => { const x = (i - (r.notes.length - 1) / 2) * 290, g = this.add.graphics(); g.fillStyle(n.ok ? 0xFCE4EC : 0xF1EAEC, 1).fillRoundedRect(x - 135, 150, 270, 60, 30); p.content.add(g); p.content.add(T(this, x, 180, `${n.t} ${n.ok ? '✓' : '·'}`, 20, n.ok ? '#B8406A' : C.dim, { w: 800 })); });
    p.content.add(T(this, 0, 260, first ? `냥카페 별 ★ +${r.stars} · 코인 ● +${r.stars * 10} · 앨범에 사진 저장` : '앨범에 사진 저장 · 별은 내일 다시', 26, C.brown, { w: 800 }));
    p.content.add(T(this, 0, 310, '오늘 입은 옷은 서재와 냥카페의 서윤에게도 보여요', 22, C.dim, { w: 800 }));
    p.content.add(btn(this, -200, 450, 340, 110, '다시 입어 보기', () => { p.close(); this.busy = false; this.sheet.setVisible(true); }, { style: 'cream', size: 30 }));
    p.content.add(btn(this, 200, 450, 360, 110, '완료', () => this.leave(), { size: 34 }));
  }
  // ── 앨범
  album() {
    this.mode = 'album'; this.topBar('코디 앨범'); const al = coordData().coord.album; this.subT.setText(`사진 ${al.length}장`);
    if (!al.length) { T(this, W / 2, H / 2, '아직 사진이 없어요\n오늘의 코디로 첫 사진을 남겨 보세요', 32, C.sub, { w: 800, lh: 14 }); return; }
    const pw = 300, cols = 3, gx = W / cols;
    al.slice(0, 12).forEach((a, i) => {
      const th = THEMES[a.t] || THEMES[0], pol = this.polaroid(th, a.w, pw, `${a.day.slice(5).replace('-', '.')} · ${'★'.repeat(a.st)}`);
      pol.setPosition(gx / 2 + (i % cols) * gx, 200 + pw * 0.6 + Math.floor(i / cols) * (pw * 1.2 + 40)).setAngle([-3, 2, -1, 3][i % 4]);
    });
  }
  leave() { this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.mode === 'album' ? 'Coord' : 'Library')); }
  onBack() { if (this.mode === 'album' || this.mode === 'closet') { this.scene.restart({}); return true; } return goPrev(this); }
}
