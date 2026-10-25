// 홈: 생존 원정 · 오늘의 도전 · 덱 · 미션 · 연속 출석
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.52.4';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.52.4';
import { audio } from '../audio.js?v=0.52.4';
import { load } from '../save.js?v=0.52.4';
import * as M from '../meta.js?v=0.52.4';
import { RUNES } from '../core/sim.js?v=0.52.4';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.45);
    const ci = M.checkIn(); M.checkUnlocks();
    const sp = Math.max(0, (H - 1920) / 6);
    this.add.image(70, 92, 'i_flame').setDisplaySize(48, 48).setTint(0xFF8A3D);
    T(this, 104, 92, `${d.streak.count}일 연속`, 32, C.text, { ox: 0, w: 800 });
    this.add.image(W - 420, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    iconBtn(this, W - 200, 92, 'i_land', () => this.fields(), 96);
    this.cry = T(this, W - 388, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    iconBtn(this, W - 80, 92, 'i_gear', () => this.settings(), 96);
    // 로고: 룬 주사위 3개 + 제목
    const ly = 290 + sp * 0.6;
    ['flame', 'frost', 'storm'].forEach((r, i) => { const x = W / 2 + (i - 1) * 120, im = this.add.image(x, ly - 60, `die_${r}`).setDisplaySize(110, 110).setAngle((i - 1) * 10); this.add.image(x, ly - 60, `rune_${r}`).setDisplaySize(60, 60).setAngle((i - 1) * 10); this.tweens.add({ targets: im, y: ly - 72, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
    T(this, W / 2, ly + 70, TITLE, 108, C.text, { w: 900, ls: 4 });
    T(this, W / 2, ly + 150, TITLE_EN, 28, '#B59BFF', { w: 800, ls: 14 });
    // 생존 원정
    const cy = 690 + sp * 1.5;
    this.add.existing(panel(this, W / 2, cy, 960, 280));
    T(this, 110, cy - 84, 'EXPEDITION', 24, '#B59BFF', { ox: 0, w: 900, ls: 6 });
    T(this, 110, cy - 30, '생존 원정', 58, C.text, { ox: 0, w: 900 });
    this.add.image(126, cy + 48, 'i_crown').setDisplaySize(40, 40).setTint(0xF5C451);
    T(this, 160, cy + 48, `최고 웨이브 ${d.best}`, 36, C.gold, { ox: 0, w: 800 });
    btn(this, W - 260, cy + 6, 300, 130, '출정', () => this.go('Play', { mode: 'run' }), { style: 'gold', icon: 'i_play', size: 44 });
    // 오늘의 도전
    const dc = M.dailyChallenge(), dy = cy + 320 + sp;
    // 오늘의 도전 (왼쪽) · 아케이드 (오른쪽) — 버튼이 카드 안에 들어오게 여유 있게
    const hw = 470, lx = W / 2 - hw / 2 - 10, rx = W / 2 + hw / 2 + 10, cy2 = dy + 15, chh = 310;
    this.add.existing(panel(this, lx, cy2, hw, chh, { tone: 'gold' }));
    T(this, lx - hw / 2 + 36, dy - 106, 'DAILY CHALLENGE', 20, C.gold, { ox: 0, w: 900, ls: 4 });
    T(this, lx - hw / 2 + 36, dy - 60, '오늘의 도전', 42, C.text, { ox: 0, w: 900 });
    dc.deck.forEach((r, i) => { const x = lx - hw / 2 + 70 + i * 74; this.add.image(x, dy + 6, `die_${r}`).setDisplaySize(62, 62); this.add.image(x, dy + 6, `rune_${r}`).setDisplaySize(36, 36); });
    btn(this, lx, dy + 98, hw - 80, 84, dc.tries ? `도전 · 기록 ${dc.best}` : '도전', () => this.go('Play', { mode: 'daily' }), { style: 'gold', size: 30 });
    this.add.existing(panel(this, rx, cy2, hw, chh));
    T(this, rx - hw / 2 + 36, dy - 106, 'ARCADE', 20, '#B59BFF', { ox: 0, w: 900, ls: 4 });
    T(this, rx - hw / 2 + 36, dy - 60, '아케이드', 42, C.text, { ox: 0, w: 900 });
    T(this, rx - hw / 2 + 36, dy + 6, '보스 러시 · 랜덤 아레나\n단일 룬 시련 · 심연 광산', 22, C.sub, { ox: 0, w: 800, lh: 6, align: 'left' });
    btn(this, rx, dy + 98, hw - 80, 84, '입장', () => this.go('Arcade'), { style: 'indigo', size: 32 });
    // 덱 미리보기 + 버튼
    const ky = dy + 290 + sp;
    T(this, 110, ky - 60, '내 덱', 34, C.text, { ox: 0, w: 900 });
    d.deck.forEach((r, i) => { const x = 130 + i * 116; this.add.image(x, ky + 20, `die_${r}`).setDisplaySize(100, 100); this.add.image(x, ky + 20, `rune_${r}`).setDisplaySize(56, 56); T(this, x, ky + 86, `★${d.tiers[r] || 1}`, 22, C.sub, { w: 800 }); });
    const dot = (x, y) => { const c = this.add.circle(x, y, 13, 0xFF5A7A).setStrokeStyle(3, 0x0B1026); this.tweens.add({ targets: c, scale: 1.25, duration: 500, yoyo: true, repeat: -1 }); };
    btn(this, W - 180, ky - 62, 260, 84, '룬 컬렉션', () => this.go('Deck'), { style: 'ghost', icon: 'i_grid', size: 28 });
    if (M.hasNew()) dot(W - 62, ky - 90);
    btn(this, W - 180, ky + 30, 260, 84, '룬 제단', () => this.go('Altar'), { style: 'indigo', icon: 'i_star', size: 30 });
    if (M.freeToday() || d.keys > 0 || d.legendTix > 0) dot(W - 62, ky + 2);
    btn(this, W - 180, ky + 122, 260, 84, `보상 길 ${M.road().level}`, () => this.go('Road'), { style: 'gold', icon: 'i_crown', size: 28 });
    if (M.roadUnclaimed()) dot(W - 62, ky + 94);
    // 미션
    this.my = ky + 345 + sp; this.drawMissions();
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(260, 5, 6, 26);
    if (ci) this.time.delayedCall(400, () => toast(this, `🔥 ${ci.count}일 연속 · 수정 +${ci.bonus}`, '#8FE3FF', 200 + sp));
    window.__home = this;
  }
  drawMissions() {
    if (this.mBox) this.mBox.destroy();
    const my = this.my, c = this.add.container(0, 0); this.mBox = c;
    c.add(panel(this, W / 2, my, 960, 330));
    c.add(T(this, 110, my - 120, '오늘의 미션', 34, C.text, { ox: 0, w: 900 }));
    M.missions().forEach((m, i) => {
      const y = my - 46 + i * 84, k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      c.add(T(this, 110, y - 12, m.text, 30, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      g.fillStyle(0xFFFFFF, 0.08).fillRoundedRect(110, y + 18, 520, 10, 5).fillStyle(m.done ? 0x5BE39A : 0xB59BFF, 1).fillRoundedRect(110, y + 18, Math.max(10, 520 * k), 10, 5); c.add(g);
      if (m.claimed) c.add(T(this, W - 160, y, '받음', 28, C.dim, { w: 800 }));
      else if (m.done) c.add(btn(this, W - 170, y + 4, 200, 72, `◆ ${m.reward}`, () => { const r = M.claim(m.id); if (r) { audio.play('sfx_power', { volume: 0.6 }); toast(this, `수정 +${r}`, '#8FE3FF'); this.cry.setText(fmt(load().crystals)); this.drawMissions(); } }, { style: 'gold', size: 28 }));
      else c.add(T(this, W - 160, y, `◆ ${m.reward}`, 28, '#8FE3FF', { w: 800 }));
    });
  }
  // 전장 꾸미기: 배경과 길 색 (수정으로 구매 · 영구)
  fields() {
    const d = load(), p = popup(this, '전장 꾸미기', 1020, 860), c = p.content;
    c.add(T(this, 0, -282, '배경과 길 빛깔이 바뀌어요 · 한 번 사면 영구', 26, C.sub, { w: 800 }));
    M.FIELDS.forEach((f, i) => {
      const x = (i - 2) * 190, y = 20, own = d.fields[f.id], on = d.field === f.id;
      const fr = this.add.graphics(); fr.fillStyle(0x0B1026, 1).fillRoundedRect(x - 86, y - 200, 172, 300, 18).lineStyle(on ? 6 : 3, on ? 0xF5C451 : f.accent, on ? 1 : 0.6).strokeRoundedRect(x - 86, y - 200, 172, 300, 18); c.add(fr);
      const im = this.add.image(x, y - 50, `bg_${f.id}`); im.setScale(Math.max(160 / im.width, 288 / im.height)); im.setCrop((im.width - 160 / im.scaleX) / 2, (im.height - 288 / im.scaleY) / 2, 160 / im.scaleX, 288 / im.scaleY); c.add(im);
      if (!own) c.add(this.add.image(x, y - 50, 'i_lock').setDisplaySize(44, 44).setAlpha(0.85));
      c.add(T(this, x, y + 140, f.name, 26, on ? C.gold : C.text, { w: 900 }));
      c.add(btn(this, x, y + 210, 170, 80, on ? '사용 중' : own ? '사용' : `◆${f.cost}`, () => {
        if (on) return;
        if (own) M.setField(f.id); else if (!M.buyField(f.id)) return toast(this, '수정이 부족해요', C.sub);
        audio.play(own ? 'sfx_click' : 'sfx_awaken', { volume: 0.6 }); p.close(); this.time.delayedCall(160, () => this.scene.restart());
      }, { style: on ? 'ghost' : own ? 'indigo' : 'gold', size: own ? 28 : 26 }));
    });
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 540);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-60, '효과음', d.sfx, () => audio.toggleSfx()); row(80, '배경음악', d.music, () => audio.toggleMusic());
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
