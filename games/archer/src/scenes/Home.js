// 홈: 아래 탭 4개 (영웅 · 모험 · 장비 · 상점) — 모험 탭이 첫 화면 (장 고르기 · 출격 · 오늘의 던전 · 미션)
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.17.3';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.17.3';
import { audio } from '../audio.js?v=0.17.3';
import { load, save } from '../save.js?v=0.17.3';
import * as M from '../meta.js?v=0.17.3';
import { HEROES, CHAPTERS, GEAR, RAR, gearVal, gearCost, GEAR_MAXLV, BOSSES } from '../core/data.js?v=0.17.3';

const TABS = [['hero', '영웅'], ['play', '모험'], ['gear', '장비'], ['shop', '상점']];
export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create(data = {}) {
    const d = load();
    this.tab = data.tab || this.tab || 'play';
    this.chapter = data.chapter || this.chapter || Math.min(CHAPTERS.length, Object.keys(d.cleared).length + 1);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B0D1E);
    if (!this.checked) { this.checked = true; const ci = M.checkIn(); if (ci) this.time.delayedCall(500, () => toast(this, `${ci.count}일 연속 출석 · 보석 +${ci.gems}`, C.gold, 300)); }
    this.top(d);
    ({ play: () => this.play(d), hero: () => this.heroes(d), gear: () => this.gear(d), shop: () => this.shop(d) })[this.tab]();
    this.nav();
    audio.music('bgm_lobby');
    this.cameras.main.fadeIn(220, 10, 12, 30);
    window.__home = this;
  }
  re(o = {}) { this.scene.restart({ tab: this.tab, chapter: this.chapter, ...o }); }
  top(d) {
    const g = this.add.graphics().setDepth(50); g.fillStyle(0x0B0D1E, 0.85).fillRect(0, 0, W, 130);
    this.add.image(60, 66, 'i_gold').setDisplaySize(52, 52).setDepth(51); T(this, 96, 66, fmt(d.gold), 34, C.gold, { ox: 0, w: 900 }).setDepth(51);
    this.add.image(330, 66, 'i_gem').setDisplaySize(52, 52).setDepth(51); T(this, 366, 66, fmt(d.gems), 34, '#D8B0FF', { ox: 0, w: 900 }).setDepth(51);
    T(this, W - 190, 66, `전투력 ${fmt(M.power())}`, 28, C.cyan, { ox: 1, w: 900 }).setDepth(51);
    iconBtn(this, W - 70, 66, 'i_gear', () => this.settings(), 84).setDepth(51);
  }
  nav() {
    const y = H - 90, w = W / TABS.length, g = this.add.graphics().setDepth(60); g.fillStyle(0x14163A, 0.98).fillRect(0, H - 180, W, 180).lineStyle(3, 0x4A4AA0, 0.6).lineBetween(0, H - 180, W, H - 180);
    const icons = { hero: 'h_arin', play: 'i_bow3', gear: 'i_armor2', shop: 'i_chest2' };
    TABS.forEach(([k, label], i) => {
      const x = w * i + w / 2, on = this.tab === k;
      if (on) { const hl = this.add.graphics().setDepth(60); hl.fillStyle(0x5B48D8, 0.45).fillRoundedRect(x - w / 2 + 10, H - 170, w - 20, 160, 26); }
      const im = this.add.image(x, y - 22, icons[k]).setDepth(61); im.setScale((on ? 96 : 78) / Math.max(im.width, im.height)); if (!on) im.setAlpha(0.7);
      T(this, x, y + 46, label, on ? 30 : 26, on ? C.gold : C.sub, { w: 900 }).setDepth(61);
      if (k === 'gear' && M.mergeable().length) this.dot(x + 50, y - 60);
      if (k === 'play' && M.missions().some(m => m.done && !m.claimed)) this.dot(x + 50, y - 60);
      this.add.zone(x, y, w, 180).setInteractive({ useHandCursor: true }).setDepth(62).on('pointerup', () => { if (this.tab === k) return; audio.play('sfx_click', { volume: 0.4 }); this.tab = k; this.re(); });
    });
  }
  dot(x, y) { const c = this.add.circle(x, y, 14, 0xFF4A3A).setStrokeStyle(3, 0xFFFFFF).setDepth(63); this.tweens.add({ targets: c, scale: 1.2, duration: 500, yoyo: true, repeat: -1 }); }

  // ── 모험: 키 아트 · 장 카드(좌우 넘김) · 출격 · 오늘의 던전 · 미션 ──
  play(d) {
    const k = this.add.image(W / 2, 130, 'key_art').setOrigin(0.5, 0); k.setScale(W / k.width); const kb = 130 + k.displayHeight;
    const fade = this.add.graphics(); for (let i = 0; i < 40; i++) fade.fillStyle(0x0B0D1E, i / 40).fillRect(0, kb - 420 + i * 10, W, 10); fade.fillStyle(0x0B0D1E, 1).fillRect(0, kb - 20, W, H);
    T(this, W / 2, 230, TITLE, 104, '#FFFFFF', { w: 900, stroke: '#1A1838', thick: 14 }); T(this, W / 2, 318, TITLE_EN, 30, C.gold, { w: 900, ls: 14, stroke: '#1A1838', thick: 6 });
    const sp = Math.max(0, (H - 1920) / 4);
    let y = Math.max(780, Math.min(kb - 560, H - 1100)) + sp;
    // 장 카드
    const ch = CHAPTERS[this.chapter - 1], open = M.chapterOpen(this.chapter), best = d.best[this.chapter] || 0, B = BOSSES[ch.boss];
    this.add.existing(panel(this, W / 2, y + 150, 980, 340, { r: 36 }));
    const bim = this.add.image(W / 2 + 300, y + 150, B.key); bim.setScale(270 / Math.max(bim.width, bim.height)); if (!open) bim.setTint(0x22223A);
    T(this, 90, y + 40, `${ch.id}장`, 28, C.gold, { ox: 0, w: 900, ls: 2 });
    T(this, 90, y + 92, ch.name, 52, open ? C.text : C.dim, { ox: 0, w: 900 });
    T(this, 90, y + 160, open ? (d.cleared[ch.id] ? `클리어! · 최고 방 ${best}/20` : best ? `최고 기록 · 방 ${best}/20` : '아직 도전 전') : `${ch.id - 1}장 보스를 쓰러뜨리면 열려요`, 28, open ? C.sub : C.dim, { ox: 0, w: 800 });
    // 진행 막대
    const bar = this.add.graphics(); bar.fillStyle(0x000000, 0.5).fillRoundedRect(90, y + 210, 520, 22, 11).fillStyle(d.cleared[ch.id] ? 0xFFD45A : 0x6AD8FF, 1).fillRoundedRect(90, y + 210, Math.max(22, 520 * best / 20), 22, 11);
    T(this, 90, y + 268, `보스 · ${B.name}`, 24, '#FFB0A0', { ox: 0, w: 800 });
    if (!open) this.add.image(W / 2 + 300, y + 150, 'i_lock').setDisplaySize(96, 96);
    // 좌우 화살표
    if (this.chapter > 1) iconBtn(this, 46, y + 150, 'i_play', () => { this.chapter--; this.re(); }, 76).setAngle(180);
    if (this.chapter < CHAPTERS.length) iconBtn(this, W - 46, y + 150, 'i_play', () => { this.chapter++; this.re(); }, 76);
    y += 360;
    const hero = HEROES[d.hero];
    const go = btn(this, W / 2, y + 80, 700, 150, open ? '모험 시작' : '잠겨 있어요', () => { if (!open) return toast(this, '앞 장의 보스를 먼저 쓰러뜨려요', C.sub); this.go('Play', { chapter: this.chapter, hero: d.hero }); }, { style: open ? 'gold' : 'ghost', icon: 'i_play', size: 50 });
    if (open) this.tweens.add({ targets: go, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, W / 2, y + 180, `${hero.name} · ${hero.title}`, 24, C.sub, { w: 800 });
    y += 230;
    // 오늘의 던전 · 미션
    const dr = M.dailyRun();
    this.add.existing(panel(this, W / 2 - 248, y + 100, 480, 200, { tone: 'gold' }));
    T(this, W / 2 - 470, y + 40, '오늘의 던전', 32, C.text, { ox: 0, w: 900 }); T(this, W / 2 - 470, y + 84, `${dr.chapter}장 · ${HEROES[dr.hero].name} · 모두 같은 판`, 22, C.sub, { ox: 0, w: 800 });
    btn(this, W / 2 - 248, y + 150, 420, 80, dr.best ? `도전 · 최고 방 ${dr.best}` : '도전', () => this.go('Play', { daily: true }), { style: 'gold', size: 28 });
    this.add.existing(panel(this, W / 2 + 248, y + 100, 480, 200));
    const ms = M.missions(), done = ms.filter(m => m.claimed).length, ready = ms.filter(m => m.done && !m.claimed).length;
    T(this, W / 2 + 30, y + 40, '오늘의 미션', 32, C.text, { ox: 0, w: 900 }); T(this, W / 2 + 30, y + 84, `${done}/${ms.length} 완료${ready ? ` · 받을 보상 ${ready}` : ''}`, 22, ready ? C.gold : C.sub, { ox: 0, w: 800 });
    btn(this, W / 2 + 248, y + 150, 420, 80, ready ? '보상 받기' : '보기', () => this.missionPop(), { style: ready ? 'green' : 'indigo', size: 28 });
  }
  missionPop() {
    const p = popup(this, '오늘의 미션', 900, 760);
    M.missions().forEach((m, i) => {
      const y = -170 + i * 170, k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      p.content.add(T(this, -390, y - 30, m.text, 30, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      g.fillStyle(0x000000, 0.4).fillRoundedRect(-390, y + 10, 480, 16, 8).fillStyle(m.done ? 0x8AF07A : 0x6AD8FF, 1).fillRoundedRect(-390, y + 10, Math.max(16, 480 * k), 16, 8); p.content.add(g);
      p.content.add(T(this, -390, y + 50, `${Math.min(m.prog, m.goal)} / ${m.goal}`, 22, C.sub, { ox: 0, w: 800 }));
      if (m.claimed) p.content.add(T(this, 300, y, '받음', 28, C.dim, { w: 800 }));
      else p.content.add(btn(this, 300, y, 220, 84, `보석 ${m.reward}`, () => { if (M.claim(m.id)) { audio.play('sfx_coin', { volume: 0.6 }); p.close(); this.re(); } else toast(this, '아직 완료하지 않았어요', C.sub); }, { style: m.done ? 'gold' : 'ghost', size: 26 }));
    });
  }

  // ── 영웅 ──
  heroes(d) {
    T(this, W / 2, 200, '영웅', 52, C.text, { w: 900 });
    const keys = Object.keys(HEROES), cur = HEROES[this.sel || d.hero], sel = this.sel || d.hero;
    // 큰 그림
    const im = this.add.image(W / 2, 760, cur.key).setOrigin(0.5, 1); im.setScale(480 / im.height); if (!d.heroes[sel]) im.setTint(0x333344);
    this.add.image(W / 2, 560, 'glow').setScale(5).setAlpha(0.18).setTint(0x8A8AFF).setBlendMode('ADD');
    this.tweens.add({ targets: im, y: 748, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.existing(panel(this, W / 2, 970, 980, 380));
    T(this, 90, 830, `${cur.name} · ${cur.title}`, 42, C.text, { ox: 0, w: 900 });
    T(this, 90, 890, `체력 ${cur.hp} · 공격 ${cur.atk} · 공속 ${cur.aspd}`, 26, C.cyan, { ox: 0, w: 800 });
    T(this, 90, 940, cur.desc, 26, C.sub, { ox: 0, w: 800, wrap: 880 });
    T(this, 90, 1000, `특성 · ${cur.trait}`, 26, C.gold, { ox: 0, w: 800, wrap: 880 });
    const owned = d.heroes[sel];
    btn(this, W / 2, 1100, 560, 110, owned ? (d.hero === sel ? '출전 중' : '이 영웅으로 출전') : `금화 ${fmt(cur.cost)}로 영입`, () => {
      if (owned) { d.hero = sel; save(); this.re(); return; }
      if (M.buyHero(sel)) { audio.play('sfx_levelup', { volume: 0.6 }); d.hero = sel; save(); this.re(); } else toast(this, '금화가 부족해요 · 모험에서 모아요', C.sub);
    }, { style: owned ? (d.hero === sel ? 'ghost' : 'gold') : 'indigo', size: 34 });
    // 영웅 고르기 줄
    keys.forEach((k, i) => {
      const x = W / 2 + (i - 1.5) * 230, y = 1290, on = k === sel, H2 = HEROES[k];
      this.add.existing(panel(this, x, y, 200, 220, { tone: on ? 'gold' : undefined }));
      const f = this.add.image(x, y + 40, H2.key).setOrigin(0.5, 1); f.setScale(190 / f.height); if (!d.heroes[k]) f.setTint(0x333344);
      T(this, x, y + 80, d.heroes[k] ? H2.name : '잠김', 26, d.heroes[k] ? C.text : C.dim, { w: 900 });
      this.add.zone(x, y, 200, 220).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.sel = k; this.re(); });
    });
    // 재능 (금화로 영구 강화)
    T(this, 60, 1460, '재능 · 금화로 영구 강화', 30, C.text, { ox: 0, w: 900 });
    [['hp', '체력', '+30'], ['atk', '공격', '+4'], ['gold', '금화 획득', '+8%']].forEach(([k, n, v], i) => {
      const x = W / 2 + (i - 1) * 330, y = 1560;
      this.add.existing(panel(this, x, y, 310, 150));
      T(this, x, y - 40, `${n} Lv ${d.talents[k]}`, 28, C.text, { w: 900 });
      btn(this, x, y + 30, 260, 70, `${v} · ${fmt(M.talentCost(k))}`, () => { if (M.talentUp(k)) { audio.play('sfx_coin', { volume: 0.6 }); this.re(); } else toast(this, '금화가 부족해요', C.sub); }, { style: 'indigo', size: 22 });
    });
  }

  // ── 장비: 칸 3개 · 강화 · 보관함 · 합성 ──
  gear(d) {
    T(this, W / 2, 200, '장비', 52, C.text, { w: 900 });
    Object.keys(GEAR).forEach((slot, i) => {
      const G = GEAR[slot], g = d.gear[slot], y = 360 + i * 240;
      this.add.existing(panel(this, W / 2, y, 980, 210));
      const box = this.add.graphics(); box.fillStyle(g ? RAR[g.r].col : 0x333344, 0.25).fillRoundedRect(80, y - 80, 160, 160, 24).lineStyle(5, g ? RAR[g.r].col : 0x555566, 1).strokeRoundedRect(80, y - 80, 160, 160, 24);
      if (g) { const im = this.add.image(160, y, G.icons[g.r]); im.setScale(130 / Math.max(im.width, im.height)); }
      T(this, 280, y - 54, g ? `${RAR[g.r].name} ${G.name} · Lv ${g.lv}/${GEAR_MAXLV(g.r)}` : `${G.name} · 없음`, 32, g ? '#' + RAR[g.r].col.toString(16).padStart(6, '0') : C.dim, { ox: 0, w: 900 });
      T(this, 280, y - 4, g ? `${G.desc} +${gearVal(slot, g)}` : '상점의 보석 상자에서 얻어요', 26, C.sub, { ox: 0, w: 800 });
      if (g && g.lv < GEAR_MAXLV(g.r)) btn(this, W - 190, y + 40, 260, 84, `강화 ${fmt(gearCost(g))}`, () => { if (M.upgrade(slot)) { audio.play('sfx_levelup', { volume: 0.5 }); M.track('upgrade'); this.re(); } else toast(this, '금화가 부족해요', C.sub); }, { style: 'gold', size: 26 });
    });
    // 보관함 · 합성
    const y0 = 1100, mg = M.mergeable();
    T(this, 60, y0, `보관함 ${d.bag.length}개 · 같은 장비 3개 → 다음 등급`, 28, C.text, { ox: 0, w: 900 });
    mg.slice(0, 3).forEach((m, i) => btn(this, W / 2, y0 + 90 + i * 110, 760, 90, `합성: ${RAR[m.r].name} ${GEAR[m.slot].name} 3개 → ${RAR[m.r + 1].name}`, () => { if (M.merge(m.slot, m.r)) { audio.play('sfx_chest', { volume: 0.7 }); toast(this, `${RAR[m.r + 1].name} ${GEAR[m.slot].name}!`, C.gold); this.re(); } }, { style: 'green', size: 26 }));
    const by = y0 + 90 + Math.min(3, mg.length) * 110 + 30;
    d.bag.slice(0, 18).forEach((b, i) => { const x = 110 + (i % 9) * 108, yy = by + Math.floor(i / 9) * 112; const g2 = this.add.graphics(); g2.fillStyle(RAR[b.r].col, 0.25).fillRoundedRect(x - 48, yy - 48, 96, 96, 16).lineStyle(3, RAR[b.r].col, 1).strokeRoundedRect(x - 48, yy - 48, 96, 96, 16); const im = this.add.image(x, yy, GEAR[b.slot].icons[b.r]); im.setScale(76 / Math.max(im.width, im.height)); });
    if (!d.bag.length && !mg.length) T(this, W / 2, y0 + 120, '보관함이 비어 있어요', 26, C.dim, { w: 800 });
  }

  // ── 상점: 보석 상자 (확률 공개 · 천장) ──
  shop(d) {
    T(this, W / 2, 200, '상점', 52, C.text, { w: 900 });
    this.add.existing(panel(this, W / 2, 620, 980, 760, { tone: 'gold' }));
    const ch = this.add.image(W / 2, 470, 'i_chest2'); ch.setScale(300 / ch.height); this.tweens.add({ targets: ch, y: 455, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(W / 2, 470, 'rays').setTint(0xFFD45A).setAlpha(0.25).setScale(1.6).setBlendMode('ADD').setDepth(-1);
    T(this, W / 2, 680, '보석 상자', 50, C.text, { w: 900 });
    T(this, W / 2, 740, `무작위 장비 1개 · ${M.CHEST.pity}번 안에 영웅 등급 이상 확정`, 26, C.sub, { w: 800 });
    T(this, W / 2, 790, `확률 · 일반 62% · 희귀 30% · 영웅 7% · 전설 1%`, 24, C.gold, { w: 800 });
    T(this, W / 2, 836, `천장까지 ${M.CHEST.pity - d.pity}번`, 24, C.cyan, { w: 800 });
    btn(this, W / 2, 930, 560, 130, `열기 · 보석 ${M.CHEST.cost}`, () => this.openChest(), { style: 'gold', size: 40 });
    T(this, W / 2, 1060, '보석은 출석 · 미션 · 장 클리어 · 모험 진행으로 얻어요', 24, C.dim, { w: 800 });
    // 금화 → 보석 교환 (작게)
    this.add.existing(panel(this, W / 2, 1250, 980, 200));
    T(this, 90, 1210, '금화 교환', 32, C.text, { ox: 0, w: 900 }); T(this, 90, 1260, '금화 600 → 보석 10', 26, C.sub, { ox: 0, w: 800 });
    btn(this, W - 220, 1250, 300, 96, '교환', () => { if (d.gold < 600) return toast(this, '금화가 부족해요', C.sub); d.gold -= 600; d.gems += 10; save(); audio.play('sfx_coin', { volume: 0.6 }); this.re(); }, { style: 'indigo', size: 30 });
  }
  openChest() {
    const it = M.openChest(); if (!it) return toast(this, '보석이 부족해요', C.sub);
    audio.play('sfx_chest', { volume: 0.8 });
    const G = GEAR[it.slot], R = RAR[it.r], p = popup(this, it.r >= 2 ? `${R.name} 등급!` : '획득!', 820, 820);
    const ray = this.add.image(0, -120, 'rays').setTint(R.col).setScale(1.8).setAlpha(0.5).setBlendMode('ADD'); p.content.add(ray); this.tweens.add({ targets: ray, angle: 360, duration: 6000, repeat: -1 });
    const im = this.add.image(0, -120, G.icons[it.r]); im.setScale(0.1); p.content.add(im); this.tweens.add({ targets: im, scale: 240 / Math.max(im.width, im.height), duration: 420, ease: 'Back.easeOut' });
    p.content.add(T(this, 0, 80, `${R.name} ${G.name}`, 46, '#' + R.col.toString(16).padStart(6, '0'), { w: 900, stroke: '#14102A', thick: 8 }));
    p.content.add(T(this, 0, 150, it.equipped ? '더 좋아서 바로 장착했어요!' : '보관함에 넣었어요 · 3개 모으면 합성', 26, C.sub, { w: 800 }));
    p.content.add(btn(this, 0, 280, 420, 110, '확인', () => { p.close(); this.re(); }, { style: 'gold', size: 34 }));
    if (it.r >= 2) this.cameras.main.flash(300, 255, 220, 120);
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 520);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-60, '효과음', d.sfx, () => audio.toggleSfx()); row(70, '배경음악', d.music, () => audio.toggleMusic());
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 10, 12, 30); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
