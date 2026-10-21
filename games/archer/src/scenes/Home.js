// 홈: 아래 탭 4개 (영웅 · 모험 · 장비 · 상점) — 모험 탭이 첫 화면 (장 고르기 · 출격 · 오늘의 던전 · 미션)
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.17.6';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.17.6';
import { audio } from '../audio.js?v=0.17.6';
import { load, save } from '../save.js?v=0.17.6';
import * as M from '../meta.js?v=0.17.6';
import { HEROES, CHAPTERS, BOSSES, SLOTS, SLOT, TIERS, SETS, upCost, itemName } from '../core/data.js?v=0.17.6';
import { itemBox, effLines, mainText, ruleText, hex } from '../gearui.js?v=0.17.6';

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
    const icons = { hero: 'h_arin', play: 'i_bow3', gear: 'g_neb_armor', shop: 'i_chest_obs' };
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
    const rec = M.recommended(ch.id), pw = M.power();
    T(this, 90, y + 268, `보스 · ${B.name}   ·   권장 전투력 ${fmt(rec)}`, 24, pw >= rec ? '#FFB0A0' : '#FF7A6A', { ox: 0, w: 800 });
    if (open && pw < rec * 0.75) T(this, 90, y + 306, '장비를 강화하면 훨씬 수월해요', 22, C.gold, { ox: 0, w: 800 });
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

  // ── 장비 (원작 2): 영웅 둘레 6칸 · 칸 강화(금화+두루마리) · 보관함 · 대장간 합성 ──
  gear(d) {
    T(this, W / 2, 200, '장비', 52, C.text, { w: 900 });
    const mg = M.mergeable(), fb = btn(this, W - 170, 200, 250, 84, '모두 합성', () => { const n = M.autoMerge(); if (n) { audio.play('sfx_chest', { volume: 0.7 }); toast(this, `${n}번 합성했어요!`, C.gold); this.re(); } else toast(this, '똑같은 장비가 3개 모이면 합성할 수 있어요', C.sub); }, { style: mg ? 'green' : 'ghost', size: 26 });
    if (mg) this.dot(W - 60, 165);
    const eq = M.equipped(), hero = HEROES[d.hero];
    // 영웅 + 6칸
    this.add.image(W / 2, 560, 'glow').setScale(5).setAlpha(0.15).setTint(0x8A8AFF).setBlendMode('ADD');
    const him = this.add.image(W / 2, 860, hero.key).setOrigin(0.5, 1); him.setScale(520 / him.height);
    const pos = { weapon: [150, 360], armor: [150, 580], helm: [150, 800], amulet: [W - 150, 360], ring: [W - 150, 580], boots: [W - 150, 800] };
    for (const sl of SLOTS) {
      const [x, y] = pos[sl], it = eq[sl], lv = d.lv[sl] || 1;
      let box;
      if (it) box = itemBox(this, x, y, it, 180, { lv });
      else { box = this.add.container(x, y); const g = this.add.graphics(); g.fillStyle(0x14163A, 0.9).fillRoundedRect(-90, -90, 180, 180, 28).lineStyle(4, 0x3A3A70, 1).strokeRoundedRect(-90, -90, 180, 180, 28); box.add([g, T(this, 0, 0, SLOT[sl].name, 30, C.dim, { w: 900 }), T(this, 0, 56, `Lv ${lv}`, 22, C.dim, { w: 900 })]); }
      const up = upCost(lv); if (it && lv < M.slotMax(sl) && d.gold >= up.gold && d.scroll[sl] >= up.scroll) this.dot(x + 78, y - 78);
      box.setSize(180, 180).setInteractive({ useHandCursor: true }).on('pointerup', () => this.slotPop(sl));
    }
    // 능력치 · 세트
    const gs = M.gearStats(), atk = Math.round((hero.atk + gs.atk) * (1 + gs.atkPct)), hp = Math.round((hero.hp + gs.hp) * (1 + gs.hpPct));
    this.add.existing(panel(this, W / 2, 950, 980, 120));
    T(this, W / 2, 925, `공격 ${fmt(atk)}  ·  체력 ${fmt(hp)}  ·  치명타 ${Math.round((0.05 + gs.crit) * 100)}%`, 30, C.text, { w: 900 });
    const fx = Object.keys(gs.fx); T(this, W / 2, 972, fx.length ? `세트 효과 ${fx.length}개 켜짐 · ${[...new Set(fx.map(f => SETS[f.split('.')[0]].name))].join(' · ')}` : '영웅 등급 세트 장비를 끼면 세트 효과가 켜져요', 22, fx.length ? C.gold : C.sub, { w: 900 });
    // 두루마리
    SLOTS.forEach((sl, i) => { const x = 110 + i * 172, y = 1060; this.add.image(x - 34, y, 'i_scroll').setDisplaySize(50, 50); T(this, x - 2, y, `${SLOT[sl].name} ${d.scroll[sl]}`, 22, C.sub, { ox: 0, w: 800 }); });
    // 보관함 (장착 안 한 것 · 등급 높은 순) · 칸 거르기
    const flt = this.flt, list = d.items.filter(it => !M.isEquipped(it) && (!flt || it.slot === flt)).sort((a, b) => b.t - a.t || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.set.localeCompare(b.set));
    T(this, 60, 1140, `보관함 ${list.length}개${flt ? ` · ${SLOT[flt].name}만` : ''}`, 28, C.text, { ox: 0, w: 900 });
    if (flt) btn(this, W - 150, 1140, 220, 66, '전체 보기', () => { this.flt = null; this.page = 0; this.re(); }, { style: 'ghost', size: 22 });
    const rows = Math.max(2, Math.floor((H - 200 - 1200) / 160)), per = rows * 6, pages = Math.max(1, Math.ceil(list.length / per)); this.page = Math.min(this.page || 0, pages - 1);
    list.slice(this.page * per, this.page * per + per).forEach((it, i) => { const b = itemBox(this, 115 + (i % 6) * 170, 1270 + Math.floor(i / 6) * 160, it, 146); if (M.fodder(it).ok) this.dot(115 + (i % 6) * 170 + 62, 1270 + Math.floor(i / 6) * 160 - 62); b.setSize(146, 146).setInteractive({ useHandCursor: true }).on('pointerup', () => this.itemPop(it)); });
    if (!list.length) T(this, W / 2, 1300, '상점의 상자에서 장비를 얻어요', 26, C.dim, { w: 800 });
    if (pages > 1) { const y = 1270 + rows * 160 - 70; T(this, W / 2, y, `${this.page + 1} / ${pages}`, 24, C.sub, { w: 800 }); if (this.page > 0) btn(this, W / 2 - 200, y, 140, 60, '이전', () => { this.page--; this.re(); }, { style: 'ghost', size: 22 }); if (this.page < pages - 1) btn(this, W / 2 + 200, y, 140, 60, '다음', () => { this.page++; this.re(); }, { style: 'ghost', size: 22 }); }
  }
  // 칸 누르면: 장착 장비 정보 · 칸 강화 · 이 칸 장비만 보기
  slotPop(sl) {
    const d = load(), it = M.equipped()[sl], lv = d.lv[sl] || 1, mx = M.slotMax(sl), c = upCost(lv), p = popup(this, `${SLOT[sl].name} 칸`, 900, 1180);
    if (it) { p.content.add(itemBox(this, -280, -330, it, 200)); p.content.add(T(this, -150, -390, itemName(it), 40, hex(TIERS[it.t].col), { ox: 0, w: 900 })); p.content.add(T(this, -150, -335, `${TIERS[it.t].name} · ${SETS[it.set].name} 세트`, 26, C.sub, { ox: 0, w: 800 })); p.content.add(T(this, -150, -285, `${mainText(it, lv)}  (칸 Lv ${lv}/${mx})`, 28, C.text, { ox: 0, w: 800 })); this.effList(p, it, -170); }
    else p.content.add(T(this, 0, -300, '비어 있어요 · 상자에서 얻은 장비를 껴요', 30, C.sub, { w: 800 }));
    p.content.add(T(this, 0, 280, '칸 레벨은 장비를 바꿔 껴도 그대로 남아요', 22, C.dim, { w: 800 }));
    const okUp = it && lv < mx;
    p.content.add(btn(this, -200, 380, 400, 110, okUp ? `강화 · 금화 ${fmt(c.gold)} · 두루마리 ${c.scroll}` : lv >= mx ? '최고 레벨 (등급을 올려요)' : '장비가 없어요', () => {
      const r = M.upgrade(sl); if (r === 'ok') { audio.play('sfx_levelup', { volume: 0.5 }); M.track('upgrade'); p.close(); this.re(); this.time.delayedCall(250, () => this.slotPop(sl)); }
      else toast(this, r === 'gold' ? '금화가 부족해요' : r === 'scroll' ? `${SLOT[sl].name} 두루마리가 부족해요 · 모험에서 모아요` : '등급을 올리면 더 강화할 수 있어요', C.sub);
    }, { style: okUp ? 'gold' : 'ghost', size: 24 }));
    p.content.add(T(this, -200, 450, `가진 두루마리 ${d.scroll[sl]} · 금화 ${fmt(d.gold)}`, 20, C.sub, { w: 800 }));
    p.content.add(btn(this, 230, 380, 330, 110, '장비 바꾸기', () => { this.flt = sl; this.page = 0; p.close(); this.re(); }, { style: 'indigo', size: 28 }));
  }
  effList(p, it, y0) {
    effLines(it).forEach(([tn, txt, on], i) => { const y = y0 + i * 66; p.content.add(T(this, -380, y, tn, 24, on ? hex(TIERS[TIERS.findIndex(t => t.name === tn)].col) : C.dim, { ox: 0, w: 900 })); p.content.add(T(this, -230, y, on ? txt : `${txt} (잠김)`, 23, on ? C.text : C.dim, { ox: 0, w: 800, wrap: 620 })); });
  }
  // 보관함 장비: 정보 · 장착 · 합성
  itemPop(it) {
    const d = load(), cur = M.equipped()[it.slot], lv = d.lv[it.slot] || 1, f = M.fodder(it), p = popup(this, '장비', 900, 1240);
    p.content.add(itemBox(this, -280, -380, it, 200));
    p.content.add(T(this, -150, -440, itemName(it), 40, hex(TIERS[it.t].col), { ox: 0, w: 900 }));
    p.content.add(T(this, -150, -385, `${TIERS[it.t].name} · ${SETS[it.set].name} 세트`, 26, C.sub, { ox: 0, w: 800 }));
    p.content.add(T(this, -150, -335, `${mainText(it, lv)}${cur ? `  (지금 ${mainText(cur, lv).split('+')[1]})` : ''}`, 28, C.text, { ox: 0, w: 800 }));
    this.effList(p, it, -220);
    p.content.add(T(this, 0, 220, `합성: ${ruleText(it)}`, 24, C.cyan, { w: 800, wrap: 800 }));
    p.content.add(T(this, 0, 270, f.need ? `재료 ${Math.min(f.list.length, f.need)} / ${f.need}${f.ok ? ' · 합성할 수 있어요!' : ''}` : '', 24, f.ok ? C.green : C.sub, { w: 800 }));
    p.content.add(btn(this, -210, 400, 360, 120, '장착', () => { M.equip(it.id); audio.play('sfx_click', { volume: 0.5 }); p.close(); this.re(); }, { style: 'gold', size: 34 }));
    p.content.add(btn(this, 210, 400, 360, 120, '합성', () => { if (M.merge(it.id)) { audio.play('sfx_chest', { volume: 0.8 }); this.cameras.main.flash(250, 255, 230, 160); toast(this, `${TIERS[it.t].name} ${itemName(it)}!`, C.gold); p.close(); this.re(); } else toast(this, '재료가 부족해요', C.sub); }, { style: f.ok ? 'green' : 'ghost', size: 34 }));
  }

  // ── 상점: 은 상자 · 흑요석 상자 (원작 확률 공개 · 천장) ──
  shop(d) {
    T(this, W / 2, 200, '상점', 52, C.text, { w: 900 });
    const sp = Math.max(0, (H - 1920) / 3);
    [['silver', 300 + sp * 0.3, '일반 66.67% · 고급 33.33% · 기본 장비'], ['obs', 830 + sp * 0.6, '고급 56% · 희귀 40% · 영웅 4% · 세트 장비']].forEach(([k, y, odds]) => {
      const C2 = M.CHESTS[k];
      this.add.existing(panel(this, W / 2, y + 200, 980, 480, { tone: k === 'obs' ? 'gold' : undefined }));
      const ch = this.add.image(220, y + 150, C2.icon); ch.setScale(240 / Math.max(ch.width, ch.height)); this.tweens.add({ targets: ch, y: y + 140, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      T(this, 380, y + 60, C2.name, 44, C.text, { ox: 0, w: 900 });
      T(this, 380, y + 112, odds, 22, C.gold, { ox: 0, w: 800, wrap: 560 });
      this.add.image(400, y + 175, C2.keyIcon).setDisplaySize(56, 56); T(this, 440, y + 175, `열쇠 ${d.keys[k]}개`, 28, C.text, { ox: 0, w: 800 });
      if (C2.pity) T(this, 380, y + 230, `영웅 확정까지 ${C2.pity - d.pityObs}번`, 24, C.cyan, { ox: 0, w: 800 });
      [1, 10].forEach((n, i) => { const pr = M.chestPrice(k, n), lab = pr.keys === n ? `${n}번 · 열쇠 ${n}` : `${n}번 · ${pr.keys ? `열쇠 ${pr.keys} + ` : ''}${pr.gold ? `금화 ${fmt(pr.gold)}` : `보석 ${fmt(pr.gems)}`}`; btn(this, W / 2 + (i ? 240 : -240), y + 340, 440, 110, lab, () => this.openChest(k, n), { style: i ? 'gold' : 'indigo', size: 26 }); });
    });
    T(this, W / 2, 1400 + sp, '열쇠는 모험(방 5 이상) · 처음 방 10 도달 · 장 클리어 · 오늘의 던전에서 얻어요', 22, C.dim, { w: 900, wrap: 900 });
    this.add.existing(panel(this, W / 2, 1530 + sp, 980, 150));
    T(this, 90, 1505 + sp, '금화 교환', 30, C.text, { ox: 0, w: 900 }); T(this, 90, 1550 + sp, '금화 600 → 보석 10', 24, C.sub, { ox: 0, w: 800 });
    btn(this, W - 220, 1530 + sp, 300, 90, '교환', () => { if (d.gold < 600) return toast(this, '금화가 부족해요', C.sub); d.gold -= 600; d.gems += 10; save(); audio.play('sfx_coin', { volume: 0.6 }); this.re(); }, { style: 'indigo', size: 28 });
  }
  openChest(k, n) {
    const out = M.openChest(k, n); if (!out) return toast(this, k === 'obs' ? '보석이 부족해요' : '금화가 부족해요', C.sub);
    M.track('chest', n); audio.play('sfx_chest', { volume: 0.8 });
    const best = Math.max(...out.map(o => o.t)), p = popup(this, best >= 3 ? `${TIERS[best].name} 등급!` : '획득!', 940, n > 1 ? 1000 : 820);
    const ray = this.add.image(0, -120, 'rays').setTint(TIERS[best].col).setScale(1.8).setAlpha(0.4).setBlendMode('ADD'); p.content.add(ray); this.tweens.add({ targets: ray, angle: 360, duration: 6000, repeat: -1 });
    out.forEach((it, i) => {
      const one = n === 1, x = one ? 0 : ((i % 5) - 2) * 170, y = one ? -130 : -250 + Math.floor(i / 5) * 250, b = itemBox(this, x, y, it, one ? 240 : 150);
      b.setScale(0); p.content.add(b); this.tweens.add({ targets: b, scale: 1, duration: 300, delay: i * 70, ease: 'Back.easeOut' });
      p.content.add(T(this, x, y + (one ? 160 : 100), one ? `${TIERS[it.t].name} ${itemName(it)}` : itemName(it), one ? 40 : 20, hex(TIERS[it.t].col), { w: 900, stroke: '#14102A', thick: 6 }));
    });
    if (n === 1) p.content.add(T(this, 0, 110, out[0].equipped ? '더 좋아서 바로 장착했어요!' : '보관함에 넣었어요 · 똑같은 장비 3개면 합성', 24, C.sub, { w: 800 }));
    p.content.add(btn(this, 0, n > 1 ? 380 : 290, 420, 110, '확인', () => { p.close(); this.re(); }, { style: 'gold', size: 34 }));
    if (best >= 3) this.cameras.main.flash(300, 255, 220, 120);
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 520);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-60, '효과음', d.sfx, () => audio.toggleSfx()); row(70, '배경음악', d.music, () => audio.toggleMusic());
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 10, 12, 30); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
