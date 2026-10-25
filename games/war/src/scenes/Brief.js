// 작전 준비: 세로로 넘기는 작전 카드 목록 (다음 작전은 펼쳐서 · 잠긴 작전은 어둡게) → [출격] → 아래에서 올라오는 출격 준비(지휘관·난이도)
import { W, H } from '../config.js?v=0.55.1';
import { T, C, panel, btn, iconBtn, toast } from '../pui.js?v=0.55.1';
import { audio } from '../audio.js?v=0.55.1';
import { load, save } from '../save.js?v=0.55.1';
import { pushBack } from '../oad.js?v=0.55.1';
import * as M from '../meta.js?v=0.55.1';
import { COS, WEATHER } from '../core/data.js?v=0.55.1';
import { MAPS, WAR, campaignMap } from '../core/maps.js?v=0.55.1';
import { STORY } from '../story.js?v=0.55.1';
import { rankOn } from '../rank.js?v=0.55.1';
import { rankPopup } from '../rankui.js?v=0.55.1';
import { Sim } from '../core/sim.js?v=0.55.1';

const LV = { easy: '쉬움', normal: '보통', hard: '어려움' };
const TCOL = { pipe: 0x8A8F96, seam: 0xC8A040, silo: 0x5A5048, silo_e: 0x6A6A5A, plain: 0x8DB05A, farm: 0x9BB45A, wheat: 0xD8B85A, forest: 0x3E7A34, mountain: 0x9A8C78, road: 0xC8A878, bridge: 0xB0A090, river: 0x4A9AD8, beach: 0xE8D8A0, sea: 0x2A6AB0, reef: 0x3A7A90, trench: 0x8A7A50 };
const RCOL = { S: '#FFD45A', A: '#9BE07A', B: '#8EC2FF', C: '#D8C8A0', D: '#B0A890' };
const TOPH = 200, CW = 1000, CX = (W - CW) / 2, SMALL = 200, BIG = 660;
export const customMaps = () => { try { return JSON.parse(localStorage.getItem('front_tactics_maps') || '[]').filter(Boolean); } catch { return []; } };

export class BriefScene extends Phaser.Scene {
  constructor() { super('Brief'); }
  create(data = {}) {
    const d = load();
    Object.assign(this, { data0: data, mode: data.mode || 'campaign', custom: data.custom || null, sheet: null, sheetIn: false, listC: null, vy: 0, dragFrom: null, dragged: false, mapId: null, unback: null });
    this.versus = this.mode === 'free' && !!data.versus;
    this.level = data.level || d.level || 'normal';
    this.co = data.co1 && (this.versus || d.cos[data.co1]) ? data.co1 : d.cos[d.co] ? d.co : 'ella';
    this.co2 = data.co2 || 'scarlet';
    this.tag = data.tag !== undefined ? data.tag : d.tag && d.tag !== this.co && d.cos[d.tag] ? d.tag : null;
    this.items = this.buildItems(d);
    // 고른 작전: 넘겨받은 것 · 아니면 다음에 할 작전
    const want = this.custom ? this.items.find(it => it.custom && it.custom.name === this.custom.name) : this.items.find(it => it.id === data.mapId);
    this.sel = want || this.items.find(it => it.next) || this.items.find(it => it.open) || this.items[0];
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14).setScrollFactor(0);
    this.drawList(true);
    this.header(d);
    // 끌어서 넘기기 (관성) — 끈 뒤 손을 떼면 카드가 눌리지 않게
    this.input.on('pointerdown', p => { if (this.sheet) return; this.dragFrom = { y: p.y, s: this.cameras.main.scrollY }; this.dragged = false; this.vy = 0; });
    this.input.on('pointermove', p => { if (!this.dragFrom || !p.isDown) return; const dy = p.y - this.dragFrom.y; if (Math.abs(dy) > 14) this.dragged = true; if (this.dragged) { const cam = this.cameras.main, ny = Phaser.Math.Clamp(this.dragFrom.s - dy, 0, this.maxScroll); this.vy = cam.scrollY - ny; cam.scrollY = ny; } });
    this.input.on('pointerup', () => { this.dragFrom = null; this.time.delayedCall(30, () => { this.dragged = false; }); });
    this.cameras.main.fadeIn(200, 20, 22, 10);
    audio.music(this.mode === 'war' ? 'bgm_warroom' : 'bgm_lobby', this);
    window.__brief = this;
    if (this.mode === 'daily') this.time.delayedCall(250, () => this.openSheet());
  }
  // 화면 고정(위 머리 · 출격 준비 시트)은 묶음의 자식까지 scrollFactor 0 이어야 터치가 맞음
  update() {
    if (!this.dragFrom && Math.abs(this.vy) > 0.5 && !this.sheet) { const cam = this.cameras.main; cam.scrollY = Phaser.Math.Clamp(cam.scrollY - this.vy, 0, this.maxScroll); this.vy *= 0.92; }
    const fix = o => { if (o.scrollFactorX !== 0) o.setScrollFactor(0); if (o.list) for (const c of o.list) fix(c); };
    for (const o of this.children.list) if (o.scrollFactorX === 0 || o.depth >= 100) fix(o);
  }
  tapOk() { return !this.dragged && !this.sheet; }

  // ── 목록 만들기 ──
  buildItems(d) {
    if (this.mode === 'daily') { const op = M.dailyOp(); return [{ id: op.map.id, map: op.map, open: true, next: true, daily: op }]; }
    if (this.mode === 'war') return WAR.map((m, i) => ({ id: m.id, map: m, n: i + 1, open: true, best: d.war[m.id] || null, next: !d.war[m.id] && WAR.slice(0, i).every(w => d.war[w.id]) }));
    if (this.mode === 'free') return [...M.STAGES.filter((s, i) => M.stageOpen(i)).map(s => ({ id: s.id, map: MAPS.find(m => m.id === s.id), n: s.n, open: true })), ...customMaps().map((m, i) => ({ id: `c${i}`, map: m, custom: m, n: `내${i + 1}`, open: true }))];
    let first = true;
    return M.STAGES.map((s, i) => { const open = M.stageOpen(i), stars = d.stars[s.id] || 0, next = open && !stars && first; if (next) first = false; return { id: s.id, map: MAPS.find(m => m.id === s.id), st: s, n: s.n, open, stars, next }; });
  }
  header(d) {
    const g = this.add.graphics().setDepth(100).setScrollFactor(0);
    g.fillStyle(0x262A14, 1).fillRect(0, 0, W, TOPH - 30); for (let k = 0; k < 15; k++) g.fillStyle(0x262A14, 1 - k / 15).fillRect(0, TOPH - 30 + k * 4, W, 4);
    iconBtn(this, 76, 80, 'i_home', () => this.go('Home'), 92).setDepth(101);
    T(this, W / 2, 66, { campaign: '캠페인 작전', daily: '오늘의 작전', free: '자유 대전', war: '전쟁실' }[this.mode], 46, C.text, { w: 900 }).setDepth(101).setScrollFactor(0);
    const sub = this.mode === 'campaign' ? `★ ${M.totalStars()} / ${M.STAGES.length * 3} · ${this.items.filter(i => i.stars).length}/${M.STAGES.length} 작전 완료`
      : this.mode === 'war' ? `S 등급 ${Object.values(d.war).filter(o => o.rank === 'S').length} / ${WAR.length} · 이기면 속도·전력·기술 점수`
        : this.mode === 'free' ? '열린 지도와 내 지도 · AI 대전 또는 둘이서' : '모두 같은 지도 · 가장 빨리 이겨요';
    T(this, W / 2, 124, sub, 24, C.gold, { w: 800 }).setDepth(101).setScrollFactor(0);
  }
  drawList(first) {
    if (this.listC) this.listC.destroy();
    const c = this.listC = this.add.container(0, 0); let y = TOPH + 10, selY = 0;
    const part = it => (this.mode === 'campaign' ? (it.n === 1 ? '1부 · 붉은 군단의 침공' : it.n === 16 ? '2부 · 설원과 사막의 전선' : null) : null);
    for (const it of this.items) {
      const ph = part(it); if (ph) { c.add(T(this, CX + 6, y + 30, ph, 30, C.gold, { ox: 0, w: 900, ls: 1 })); c.add(this.add.rectangle(CX + CW / 2 + 180, y + 30, CW - 400, 2, 0xFFD45A, 0.35)); y += 70; }
      const big = it === this.sel, h = big ? BIG : SMALL;
      if (big) selY = y;
      this.card(c, it, y, h, big); y += h + 22;
    }
    this.contentH = y + 120;
    this.maxScroll = Math.max(0, this.contentH - H);
    const cam = this.cameras.main, to = Phaser.Math.Clamp(selY - TOPH - 30, 0, this.maxScroll);
    if (first) cam.scrollY = to;
    else if (selY - cam.scrollY < TOPH || selY + BIG - cam.scrollY > H) this.tweens.add({ targets: cam, scrollY: to, duration: 260, ease: 'Cubic.easeOut' });
  }
  chip(c, x, y, s, col = '#FFF4D8', bg = 0x14160A) { const t = T(this, x + 16, y, s, 22, col, { ox: 0, w: 800, shadow: false }), w = t.width + 32, g = this.add.graphics(); g.fillStyle(bg, 0.55).fillRoundedRect(x, y - 19, w, 38, 19); c.add([g, t]); return w + 10; }
  face(c, co, x, y, sz, dark) {
    const im = this.add.image(x, y, `co_${co}`), fw = im.width; im.setCrop(0, 0, fw, fw * 0.92).setOrigin(0.5, (fw * 0.46) / im.height).setScale(sz / fw);
    if (dark) im.setTint(0x4A4A3C).setAlpha(0.7); c.add(im);
    const g = this.add.graphics(); g.lineStyle(5, dark ? 0x555544 : 0xFF6A55, 1).strokeRoundedRect(x - sz / 2 - 2, y - sz / 2 - 2, sz + 4, sz + 4, 20); c.add(g);
  }
  card(c, it, y, h, big) {
    const d = load(), map = it.map, locked = !it.open, eco = map.enemyCo || 'scarlet';
    const bg = this.add.graphics(); c.add(bg);
    if (big) bg.fillStyle(0xF3E6C0, 1).fillRoundedRect(CX, y, CW, h, 30).lineStyle(6, 0xFFD45A, 1).strokeRoundedRect(CX, y, CW, h, 30);
    else bg.fillStyle(locked ? 0x1C2010 : 0x3B4220, 1).fillRoundedRect(CX, y, CW, h, 26).lineStyle(3, it.next ? 0xFFD45A : 0x5A6436, 1).strokeRoundedRect(CX, y, CW, h, 26);
    const ink = big ? '#2B2416' : C.text;
    // 왼쪽: 적 지휘관 얼굴 (번호표)
    const fx = CX + 100, fy = y + 100; this.face(c, eco, fx, fy, 150, locked);
    const nb = this.add.graphics(); nb.fillStyle(locked ? 0x333328 : 0xFFD45A, 1).fillRoundedRect(CX + 14, y + 14, 76, 44, 22); c.add(nb);
    c.add(T(this, CX + 52, y + 36, it.daily ? '오늘' : `${it.n}`, 26, locked ? '#888870' : '#2B2416', { w: 900, shadow: false }));
    if (locked) c.add(this.add.image(fx, fy, 'i_lock').setDisplaySize(64, 64).setTint(0xC8C0A0));
    // 제목 · 태그
    const tx = CX + 200;
    c.add(T(this, tx, y + 44, this.mode === 'war' ? `전쟁실 ${it.n}` : it.custom ? '내 지도' : it.daily ? '오늘의 작전' : `작전 ${it.n}`, 22, big ? '#9A6A10' : C.gold, { ox: 0, w: 900, shadow: false, ls: 1 }));
    c.add(T(this, tx, y + 88, map.name, 40, locked ? '#77775F' : ink, { ox: 0, w: 900, shadow: !big }));
    if (locked) c.add(T(this, tx, y + 146, `작전 ${it.n - 1} 승리 시 개방`, 24, '#99997A', { ox: 0, w: 800, shadow: false }));
    else {
      let cx2 = tx; const tags = [];
      if (!it.custom) tags.push([`적 ${COS[eco].name}`, '#FFB0A0']);
      if (map.fog) tags.push(['안개', '#D8C0FF']);
      const wp = map.weather; if (wp) for (const w of [...new Set([].concat(wp))].filter(w => w !== 'clear')) tags.push([WEATHER[w].name, '#BFE6FF']);
      if (map.rows && /(^|\s)s(\s|$)/.test(map.rows.join(' '))) tags.push(['해전', '#9AD0FF']);
      if (it.st && it.st.unlockCo && !d.cos[it.st.unlockCo]) tags.push([`합류 ${COS[it.st.unlockCo].name}`, '#9BE07A']);
      for (const [s, col] of tags.slice(0, 4)) { if (cx2 > CX + CW - 260) break; cx2 += this.chip(c, cx2, y + 146, s, col, big ? 0x2B2416 : 0x14160A); }
    }
    // 오른쪽: 별 · 등급 · 새 작전
    const rx = CX + CW - 40;
    if (this.mode === 'campaign' && !locked) c.add(T(this, rx, y + 60, '★'.repeat(it.stars) + '☆'.repeat(3 - it.stars), 40, big ? '#C89010' : C.gold, { ox: 1, w: 900, shadow: false }));
    if (this.mode === 'war') { if (it.best) { c.add(T(this, rx - 20, y + 70, it.best.rank, 72, RCOL[it.best.rank], { ox: 1, w: 900, stroke: '#2B2416', thick: 6 })); c.add(T(this, rx - 20, y + 128, `${it.best.total}점`, 22, big ? '#5A4A22' : C.sub, { ox: 1, w: 800, shadow: false })); } else c.add(T(this, rx, y + 60, '도전 전', 24, big ? '#8A7A50' : C.dim, { ox: 1, w: 800, shadow: false })); }
    if (it.next && !big) { const nw = this.add.container(rx - 50, y + 150); const g = this.add.graphics(); g.fillStyle(0xFF6A3D, 1).fillRoundedRect(-50, -20, 100, 40, 20); nw.add([g, T(this, 0, 0, 'NEW', 22, '#FFFFFF', { w: 900, shadow: false })]); c.add(nw); this.tweens.add({ targets: nw, scale: 1.08, duration: 600, yoyo: true, repeat: -1 }); }
    if (locked) { const sh = this.add.graphics(); sh.fillStyle(0x000000, 0.35).fillRoundedRect(CX, y, CW, h, 26); c.add(sh); }
    // 누르면 펼침
    const z = this.add.zone(CX + CW / 2, y + (big ? 100 : h / 2), CW, big ? 200 : h).setInteractive({ useHandCursor: true }); c.add(z);
    z.on('pointerup', () => { if (!this.tapOk()) return; if (locked) return toast(this, `작전 ${it.n - 1}을(를) 먼저 이기면 열려요`, C.sub, TOPH + 60); if (this.sel === it) return; audio.play('sfx_click', { volume: 0.4 }); this.sel = it; this.drawList(false); });
    if (big) this.detail(c, it, y, h);
  }
  // 펼친 카드: 설명 · 별 조건 · 작은 지도 · 팁 · [이야기] [출격]
  detail(c, it, y, h) {
    const d = load(), map = it.map, x0 = CX + 40, wTxt = 560, lines = [];
    lines.push([it.custom ? '직접 만든 지도' : map.desc, '#4A3E1E', 26]);
    if (this.mode === 'campaign') { lines.push([`별 ★ 승리 · ★ ${map.par}일 안 · ★ 잃은 유닛 ${M.lossCap(map.par)}기 이하`, '#7A5A10', 23]); const best = d.bestDays[map.id]; if (best) lines.push([`최단 승리 ${best}일`, '#2F6A18', 23]); }
    if (this.mode === 'war') { lines.push([`점수 = 속도 + 전력 + 기술 (각 100) · 기준 ${map.par}일`, '#7A5A10', 23]); lines.push([it.best ? `최고 ${it.best.total}점 · ${it.best.rank} 등급 (${it.best.day}일)` : '아직 기록 없음 · S 등급은 270점 이상', '#2F6A18', 23]); }
    if (it.daily) lines.push([it.daily.best ? `오늘 최단 ${it.daily.best}일 · ${it.daily.tries}번 도전` : '오늘 처음 도전 · 어려움', '#2F6A18', 23]);
    const E = COS[map.enemyCo || 'scarlet'];
    if (!it.custom) lines.push([`적 ${E.name} · ${E.desc}`, '#8E2414', 22]);
    let ly = y + 220; for (const [s, col, sz] of lines) { const t = T(this, x0, ly, s, sz, col, { ox: 0, oy: 0, w: 800, shadow: false, wrap: wTxt, align: 'left' }); c.add(t); ly += t.height + 14; }
    if (map.tip) c.add(T(this, x0, ly + 6, `팁 · ${map.tip}`, 21, '#6B5A2A', { ox: 0, oy: 0, w: 700, shadow: false, wrap: wTxt, align: 'left' }));
    this.mini(c, it.custom || this.mode === 'free' ? map : campaignMap(map), CX + CW - 200, y + 372, 300, 290);
    const by = y + h - 70;
    if (this.mode === 'campaign' && STORY[map.id]) c.add(btn(this, x0 + 150, by, 300, 96, '이야기', () => { if (this.tapOk()) { this.mapId = map.id; this.story(STORY[map.id].pre, ['Brief', { ...this.data0, mapId: map.id, tag: this.tag ?? null }]); } }, { style: 'ghost', size: 28 }));
    if (this.mode === 'war' && rankOn()) c.add(btn(this, x0 + 150, by, 300, 96, '순위표', () => { if (this.tapOk()) rankPopup(this, `war:${map.id}`, `${map.name} 순위`, x => `${x.score}점 ${x.extra && x.extra.rank ? x.extra.rank : ''}`); }, { style: 'ghost', size: 28 }));
    const go = btn(this, CX + CW - 250, by, 420, 110, '출격', () => { if (this.tapOk()) this.openSheet(); }, { style: 'gold', icon: 'i_play', size: 40 }); c.add(go);
    this.tweens.add({ targets: go, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ── 출격 준비 시트 (아래에서 올라옴) ──
  openSheet() {
    if (this.sheet) this.sheet.destroy();
    const d = load(), it = this.sel, map = it.map;
    this.custom = it.custom || null; this.mapId = it.custom ? null : it.id;
    this.ai = this.mode === 'campaign' ? it.st.ai : this.mode === 'daily' || this.mode === 'war' ? 'hard' : this.level;
    const root = this.add.container(0, 0).setDepth(900).setScrollFactor(0); this.sheet = root;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0A0C06, 0.7).setInteractive(); root.add(dim);
    const box = this.add.container(0, 0); root.add(box);
    const owned = k => this.versus || d.cos[k], keys = Object.keys(COS).filter(owned);
    const rowsOf = n => Math.ceil(n / (n > 8 ? Math.ceil(n / 2) : 8)), rowH = n => 70 + (rowsOf(n) - 1) * 112 + 150;
    const sh = 150 + rowH(keys.length) + (this.versus ? rowH(16) : keys.length > 1 ? rowH(keys.length) : 0) + (this.mode === 'free' ? (this.versus ? 130 : 230) : 0) + 190;
    const top = H - sh;
    box.add(this.add.existing(panel(this, W / 2, top + sh / 2 + 20, W - 20, sh + 40, { r: 40 })));
    box.add(this.add.rectangle(W / 2, top + 26, 120, 10, 0xFFFFFF, 0.25));
    box.add(T(this, 60, top + 82, '출격 준비', 40, C.text, { ox: 0, w: 900 }));
    box.add(T(this, W - 60, top + 82, `${it.daily ? '오늘의 작전' : this.mode === 'war' ? `전쟁실 ${it.n}` : it.custom ? '내 지도' : `작전 ${it.n}`} · ${map.name}`, 26, C.gold, { ox: 1, w: 800 }));
    let y = top + 150;
    if (this.mode === 'free') {
      box.add(btn(this, W / 2 - 250, y + 30, 460, 84, 'AI 상대', () => { this.versus = false; this.openSheet(); }, { style: this.versus ? 'ghost' : 'gold', size: 30 }));
      box.add(btn(this, W / 2 + 250, y + 30, 460, 84, '둘이서 (한 폰)', () => { this.versus = true; this.openSheet(); }, { style: this.versus ? 'gold' : 'ghost', size: 30 }));
      if (!this.versus) ['easy', 'normal', 'hard'].forEach((l, i) => box.add(btn(this, W / 2 + (i - 1) * 320, y + 130, 300, 76, LV[l], () => { d.level = l; save(); this.level = l; this.openSheet(); }, { style: this.level === l ? 'olive' : 'ghost', size: 28 })));
      y += this.versus ? 130 : 230;
    }
    const row = (label, cur, pool, pick, col) => {
      box.add(T(this, 60, y, label, 28, C.text, { ox: 0, w: 900 }));
      const ks = Object.keys(COS).filter(pool), pr = ks.length > 8 ? Math.ceil(ks.length / 2) : 8, step = Math.min(124, (W - 120) / pr), sz = step - 12;
      ks.forEach((k, i) => {
        const x = 60 + step / 2 + (i % pr) * step, cy = y + 82 + Math.floor(i / pr) * (sz + 16), on = k === cur;
        const im = this.add.image(x, cy, `co_${k}`), fw = im.width; im.setCrop(0, 0, fw, fw * 0.92).setOrigin(0.5, (fw * 0.46) / im.height).setScale(sz / fw); box.add(im);
        const g = this.add.graphics(); g.lineStyle(on ? 6 : 2, on ? col : 0x6E7A40, 1).strokeRoundedRect(x - sz / 2 - 2, cy - sz / 2 - 2, sz + 4, sz + 4, 16); box.add(g);
        const z = this.add.zone(x, cy, sz, sz).setInteractive({ useHandCursor: true }); z.on('pointerup', () => pick(k)); box.add(z);
      });
      const lastY = y + 82 + (Math.ceil(ks.length / pr) - 1) * (sz + 16) + sz / 2;
      const C1 = COS[cur]; box.add(T(this, 60, lastY + 34, C1 ? `${C1.name} · ${C1.desc}` : '고르면 전투 중 얼굴을 눌러 교대 · 두 게이지가 다 차면 합동 필살기', 22, C.sub, { ox: 0, w: 800, wrap: W - 120 }));
      y = lastY + 100;
    };
    row(this.versus ? '파랑 지휘관' : '출전 지휘관', this.co, owned, k => { this.co = k; if (!this.versus) { d.co = k; save(); } if (this.tag === k) this.tag = null; this.openSheet(); }, 0xFFD45A);
    if (this.versus) row('빨강 지휘관', this.co2, () => true, k => { this.co2 = k; this.openSheet(); }, 0xFF6A55);
    else if (keys.length > 1) row('교대 지휘관 (선택 · 다시 누르면 해제)', this.tag, owned, k => { if (k === this.co) return toast(this, '출전 지휘관과 다른 지휘관을 골라요', C.sub); this.tag = this.tag === k ? null : k; d.tag = this.tag; save(); this.openSheet(); }, 0x9BE07A);
    box.add(btn(this, W / 2, H - 100, 600, 130, '작전 개시', () => this.start(), { style: 'gold', icon: 'i_play', size: 44 }));
    if (!this.sheetIn) { box.y = sh; this.tweens.add({ targets: box, y: 0, duration: 260, ease: 'Cubic.easeOut' }); }
    this.sheetIn = true;
    const close = () => { if (!this.sheet) return; if (this.mode === 'daily') return this.go('Home'); const s = this.sheet; this.sheet = null; this.sheetIn = false; this.tweens.add({ targets: box, y: sh, duration: 200, ease: 'Cubic.easeIn', onComplete: () => s.destroy() }); };
    dim.on('pointerup', () => { if (this.mode !== 'daily') close(); });
    if (this.unback) this.unback();
    this.unback = pushBack(() => { if (!this.sheet) return false; close(); return true; });
    root.once('destroy', () => { if (this.unback && this.sheet !== root) { /* 새 시트가 이어받음 */ } });
    this.events.once('shutdown', () => { if (this.unback) { this.unback(); this.unback = null; } });
  }
  restart(o) { this.scene.restart({ ...this.data0, mapId: this.mapId || (this.sel && this.sel.id), custom: this.custom, level: this.level, versus: this.versus, co1: this.co, co2: this.co2, tag: this.tag ?? null, ...o }); }
  start() {
    if (!this.mapId && !this.custom) { const it = this.sel; this.custom = it.custom || null; this.mapId = it.custom ? null : it.id; this.ai = this.mode === 'campaign' ? it.st.ai : this.mode === 'daily' || this.mode === 'war' ? 'hard' : this.level; }
    const mode = this.versus ? 'versus' : this.mode, d = load();
    const play = { mode, mapId: this.custom ? null : this.mapId, custom: this.custom, level: this.ai, co: this.co, enemyCo: this.versus ? this.co2 : undefined, tag: this.versus || this.tag === this.co ? null : this.tag };
    const st = mode === 'campaign' && STORY[this.mapId];
    if (st && st.pre && !(d.seen || {})[this.mapId]) { (d.seen ||= {})[this.mapId] = 1; save(); return this.story(st.pre, ['Play', play]); }
    this.go('Play', play);
  }
  story(lines, next) {
    const id = this.mapId || (this.sel && this.sel.id), map = MAPS.find(m => m.id === id), stg = M.STAGES.find(s => s.id === id);
    this.go('Story', { lines, foe: map.enemyCo || 'scarlet', title: stg ? `작전 ${stg.n} · ${map.name}` : map.name, next });
  }
  // 작은 지도 그림 (지형 색 · 건물 · 시작 유닛)
  mini(c, map, cx, cy, mw, mh) {
    const s = new Sim(map), ts = Math.floor(Math.min(mw / s.w, mh / s.h)), x0 = cx - ts * s.w / 2, y0 = cy - ts * s.h / 2, g = this.add.graphics(); c.add(g);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = s.tile(x, y), col = TCOL[t.t] ?? 0x8DB05A;
      g.fillStyle(t.t === 'port' ? 0x2A6AB0 : col, 1).fillRect(x0 + x * ts, y0 + y * ts, ts, ts);
      if (['city', 'base', 'air', 'hq', 'port'].includes(t.t)) { const im = this.add.image(x0 + x * ts + ts / 2, y0 + y * ts + ts / 2, `b_${t.t}_${t.owner === 1 ? 'b' : t.owner === 2 ? 'r' : 'n'}`); im.setScale(ts * 1.1 / Math.max(im.width, im.height)); c.add(im); }
    }
    for (const u of s.units) { const im = this.add.image(x0 + u.x * ts + ts / 2, y0 + u.y * ts + ts / 2, `u_${u.type}_${u.p === 1 ? 'b' : 'r'}`); im.setScale(ts * 0.9 / Math.max(im.width, im.height)); c.add(im); }
    const f = this.add.graphics(); f.lineStyle(4, 0x2B2416, 0.8).strokeRoundedRect(x0 - 2, y0 - 2, ts * s.w + 4, ts * s.h + 4, 6); c.add(f);
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(200, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
