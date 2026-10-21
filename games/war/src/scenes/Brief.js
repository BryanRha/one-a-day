// 작전 준비: 캠페인 작전 고르기 · 지도 미리보기 · 지휘관 고르기 · (자유 대전) 지도·난이도·AI/2인 대전·내 지도
import { W, H } from '../config.js?v=0.14.2';
import { T, C, panel, btn, iconBtn, toast } from '../pui.js?v=0.14.2';
import { audio } from '../audio.js?v=0.14.2';
import { load, save } from '../save.js?v=0.14.2';
import * as M from '../meta.js?v=0.14.2';
import { COS, WEATHER } from '../core/data.js?v=0.14.2';
import { MAPS, WAR, campaignMap } from '../core/maps.js?v=0.14.2';
import { STORY } from '../story.js?v=0.14.2';
import { rankOn } from '../rank.js?v=0.14.2';
import { rankPopup } from '../rankui.js?v=0.14.2';
import { Sim } from '../core/sim.js?v=0.14.2';

const LV = { easy: '쉬움', normal: '보통', hard: '어려움' };
const TCOL = { pipe: 0x8A8F96, seam: 0xC8A040, silo: 0x5A5048, silo_e: 0x6A6A5A, plain: 0x8DB05A, farm: 0x9BB45A, wheat: 0xD8B85A, forest: 0x3E7A34, mountain: 0x9A8C78, road: 0xC8A878, bridge: 0xB0A090, river: 0x4A9AD8, beach: 0xE8D8A0, sea: 0x2A6AB0, reef: 0x3A7A90, trench: 0x8A7A50 };
export const customMaps = () => { try { return JSON.parse(localStorage.getItem('front_tactics_maps') || '[]').filter(Boolean); } catch { return []; } };

export class BriefScene extends Phaser.Scene {
  constructor() { super('Brief'); }
  create(data = {}) {
    const d = load();
    this.data0 = data;
    this.mode = data.mode || 'campaign';
    this.versus = this.mode === 'free' && !!data.versus;
    this.custom = data.custom || null;
    if (this.mode === 'daily') this.mapId = M.dailyOp().map.id;
    else if (this.mode === 'campaign') { const i = M.STAGES.findIndex(s => !d.stars[s.id]); this.mapId = data.mapId || M.STAGES[i < 0 ? 0 : i].id; }
    else if (this.mode === 'war') this.mapId = data.mapId || WAR[0].id;
    else this.mapId = data.mapId || 'm1';
    this.level = data.level || d.level || 'normal';
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    iconBtn(this, 76, 80, 'i_home', () => this.go('Home'), 92);
    T(this, W / 2, 80, { campaign: '캠페인 작전', daily: '오늘의 작전', free: '자유 대전', war: '전쟁실 · 점수 도전' }[this.mode], 46, C.text, { w: 900 });
    let y = 150;
    // 지도 고르기 (8개씩 두 줄)
    if (this.mode !== 'daily') {
      const list = this.mode === 'war' ? WAR.map((w, i) => ({ id: w.id, label: `${i + 1}`, open: true, rank: (d.war[w.id] || {}).rank || '' })) : this.mode === 'campaign' ? M.STAGES.map(s => ({ id: s.id, label: `${s.n}`, open: M.stageOpen(M.STAGES.indexOf(s)), stars: d.stars[s.id] || 0 }))
        : [...M.STAGES.filter((s, i) => M.stageOpen(i)).map(s => ({ id: s.id, label: `${s.n}`, open: true })), ...customMaps().map((m, i) => ({ id: `c${i}`, custom: m, label: `내${i + 1}`, open: true }))];
      const per = list.length > 16 ? 9 : 8, w = (W - 60 - (per - 1) * 10) / per, rh = list.length > 16 ? 100 : 112;
      list.forEach((it, i) => {
        const x = 30 + w / 2 + (i % per) * (w + 10), yy = y + 46 + Math.floor(i / per) * rh;
        const on = it.custom ? !!this.custom && this.custom.name === it.custom.name : !this.custom && it.id === this.mapId;
        const lb = btn(this, x, yy, w, rh - 28, it.label, () => { if (!it.open) return toast(this, '앞 작전을 먼저 이겨요', C.sub); this.restart(it.custom ? { mapId: null, custom: it.custom } : { mapId: it.id, custom: null }); }, { style: on ? 'gold' : it.open ? 'olive' : 'ghost', size: it.label.length > 2 ? 26 : 34 }); if (!it.open) { lb.label.setAlpha(0.35); lb.add(this.add.image(w / 2 - 20, -(rh - 28) / 2 + 18, 'i_lock').setDisplaySize(26, 26).setTint(0xC8C0A0)); }
        if (this.mode === 'war') T(this, x, yy + rh / 2 - 6, it.rank ? `${it.rank} 등급` : '—', 18, it.rank === 'S' ? C.gold : C.sub, { w: 900, shadow: false });
        if (this.mode === 'campaign' && it.open) T(this, x, yy + rh / 2 - 6, '★'.repeat(it.stars) + '☆'.repeat(3 - it.stars), 18, C.gold, { w: 900, shadow: false });
      });
      y += 46 + Math.ceil(list.length / per) * rh + 6;
    }
    const map = this.custom || MAPS.find(m => m.id === this.mapId) || WAR.find(m => m.id === this.mapId), st = this.custom ? null : M.STAGES.find(s => s.id === this.mapId);
    this.ai = this.mode === 'campaign' ? st.ai : this.mode === 'daily' || this.mode === 'war' ? 'hard' : this.level;
    // 지도 미리보기
    const ph = 520, py = y + ph / 2;
    this.add.existing(panel(this, W / 2, py, 1000, ph, { tone: 'paper' }));
    T(this, 70, y + 50, this.custom ? `내 지도 · ${map.name}` : this.mode === 'war' ? `전쟁실 ${WAR.indexOf(map) + 1}. ${map.name}` : `${st.n}. ${map.name}`, 38, '#2B2416', { ox: 0, w: 900, shadow: false });
    T(this, 70, y + 96, this.custom ? '직접 만든 지도' : map.desc, 23, '#4A3E1E', { ox: 0, w: 800, shadow: false, wrap: 520 });
    const wPlan = map.weather, wName = !wPlan ? '' : Array.isArray(wPlan) ? '날씨 ' + [...new Set(wPlan)].map(w => WEATHER[w].name).join('·') : '날씨 ' + WEATHER[wPlan].name;
    const tags = [map.fog ? '안개 전장' : '', wName, this.mode !== 'free' && map.camp && map.camp.noBuild ? '적은 생산 못 함' : '', this.versus ? '2인 대전' : `적 ${LV[this.ai]}`].filter(Boolean).join(' · ');
    if (this.mode === 'war' && rankOn()) btn(this, 230, y + 330, 320, 72, '순위표', () => rankPopup(this, `war:${map.id}`, `${map.name} 순위`, x => `${x.score}점 ${x.extra && x.extra.rank ? x.extra.rank : ''}`), { style: 'ghost', size: 24 });
    if (this.mode === 'war') { const b = d.war[map.id]; T(this, 70, y + 150, `점수 = 속도 + 전력 + 기술 (각 100) · 기준 ${map.par}일`, 23, '#7A5A10', { ox: 0, w: 800, shadow: false, wrap: 540 }); T(this, 70, y + 240, b ? `최고 ${b.total}점 · ${b.rank} 등급 (${b.day}일)` : '아직 기록 없음 · S 등급은 270점 이상', 23, '#2F6A18', { ox: 0, w: 800, shadow: false }); }
    else if (this.mode !== 'free') T(this, 70, y + 150, `별 ★ 승리 · ★ ${map.par}일 안 · ★ 손실 ${M.lossCap(map.par)}기 이하`, 23, '#7A5A10', { ox: 0, w: 800, shadow: false, wrap: 540 });
    T(this, 70, y + 196, tags, 23, map.fog ? '#5A3A8A' : '#6B5A2A', { ox: 0, w: 800, shadow: false });
    if (this.mode === 'campaign') { const best = d.bestDays[map.id]; T(this, 70, y + 240, best ? `최단 승리 ${best}일` : st.unlockCo && !d.cos[st.unlockCo] ? `승리 보상 · 지휘관 ${COS[st.unlockCo].name} 합류` : '', 23, '#2F6A18', { ox: 0, w: 800, shadow: false }); }
    if (this.mode === 'daily') { const op = M.dailyOp(); T(this, 70, y + 240, op.best ? `오늘 최단 ${op.best}일 · ${op.tries}번 도전` : '모두 같은 지도 · 가장 빨리 이겨요', 23, '#2F6A18', { ox: 0, w: 800, shadow: false }); }
    if (this.mode === 'campaign' && STORY[map.id]) btn(this, 230, y + 330, 320, 72, '이야기 보기', () => this.story(STORY[map.id].pre, ['Brief', { ...this.data0, mapId: this.mapId, tag: this.tag ?? null }]), { style: 'ghost', size: 24 });
    if (map.tip) T(this, 70, y + ph - 60, `팁 · ${map.tip}`, 21, '#4A3E1E', { ox: 0, w: 800, shadow: false, wrap: 520 });
    this.mini(this.mode !== 'free' ? campaignMap(map) : map, W - 250, py, 400, ph - 40);
    y += ph + 20;
    // 자유 대전: AI 상대 / 둘이서 · 난이도
    if (this.mode === 'free') {
      btn(this, W / 2 - 250, y + 40, 460, 84, 'AI 상대', () => this.restart({ versus: false }), { style: this.versus ? 'ghost' : 'gold', size: 30 });
      btn(this, W / 2 + 250, y + 40, 460, 84, '둘이서 (한 폰)', () => this.restart({ versus: true }), { style: this.versus ? 'gold' : 'ghost', size: 30 });
      y += 100;
      if (!this.versus) { ['easy', 'normal', 'hard'].forEach((l, i) => btn(this, W / 2 + (i - 1) * 320, y + 34, 300, 76, LV[l], () => { d.level = l; save(); this.restart({ level: l }); }, { style: this.level === l ? 'olive' : 'ghost', size: 28 })); y += 92; }
    }
    // 지휘관 (한 줄 · 많으면 작게)
    this.co = this.versus && data.co1 ? data.co1 : d.cos[d.co] ? d.co : 'ella';
    this.co2 = data.co2 || 'scarlet';
    const row = (yy, label, cur, all, pick, col) => {
      T(this, 40, yy, label, 28, C.text, { ox: 0, w: 900 });
      const keys = Object.keys(COS).filter(k => all || d.cos[k]), per = keys.length > 9 ? Math.ceil(keys.length / 2) : Math.max(8, keys.length), step = Math.min(124, (W - 80) / per), sz = step - 10;
      this.rowExtra = keys.length > per ? sz + 14 : 0;
      keys.forEach((k, i) => {
        const x = 40 + step / 2 + (i % per) * step, cy = yy + 92 + Math.floor(i / per) * (sz + 14), on = k === cur;
        const fr = this.add.image(x, cy, `co_${k}`); fr.setScale((sz + 30) / fr.height);
        const m = this.make.graphics(); m.fillRoundedRect(x - sz / 2, cy - sz / 2, sz, sz, 16); fr.setMask(m.createGeometryMask());
        this.add.graphics().lineStyle(on ? 6 : 2, on ? col : 0x6E7A40, 1).strokeRoundedRect(x - sz / 2, cy - sz / 2, sz, sz, 16);
        this.add.zone(x, cy, sz, sz).setInteractive({ useHandCursor: true }).on('pointerup', () => pick(k));
      });
      const c = COS[cur]; T(this, 40, yy + 172 + this.rowExtra, c ? `${c.name} · ${c.desc} · ${c.power}/${c.superp}` : '고르면 전투 중 얼굴을 눌러 [교대] · 두 게이지가 차면 합동 필살기 (다시 누르면 해제)', 21, C.sub, { ox: 0, w: 800, wrap: W - 80 });
    };
    row(y + 10, this.versus ? '파랑 지휘관' : '출전 지휘관', this.co, this.versus, k => { if (!this.versus) { d.co = k; save(); } this.restart({ co1: k }); }, 0xFFD45A);
    y += 220 + this.rowExtra;
    if (this.versus) { row(y + 10, '빨강 지휘관', this.co2, true, k => this.restart({ co2: k }), 0xFF6A55); y += 220 + this.rowExtra; }
    else if (Object.keys(d.cos).length > 1) {
      this.tag = data.tag !== undefined ? data.tag : d.tag && d.tag !== this.co && d.cos[d.tag] ? d.tag : null;
      row(y + 10, '교대 지휘관 (선택)', this.tag, false, k => { if (k === this.co) return toast(this, '출전 지휘관과 다른 지휘관을 골라요', C.sub); const t = this.tag === k ? null : k; d.tag = t; save(); this.restart({ tag: t }); }, 0x9BE07A); y += 220 + this.rowExtra;
    }
    // 적 지휘관 카드 (빈 자리에): 얼굴 · 특성 · 필살기
    const eco = this.versus ? null : this.mode === 'free' ? (map.enemyCo || 'scarlet') : (map.enemyCo || 'scarlet'), by = Math.min(H - 100, Math.max(y + 90, H - 160));
    if (eco && by - y > 380) {
      const cy = y + 40 + (by - 110 - y - 40) / 2, E = COS[eco];
      this.add.existing(panel(this, W / 2, cy, 1000, 250));
      const im = this.add.image(150, cy, `co_${eco}`), fw = im.width; im.setCrop(0, 0, fw, fw * 0.92).setOrigin(0.5, (fw * 0.46) / im.height).setScale(190 / fw);
      this.add.graphics().lineStyle(5, 0xFF6A55, 1).strokeRoundedRect(150 - 97, cy - 97, 194, 194, 22);
      T(this, 280, cy - 80, '적 지휘관', 22, '#FF8A70', { ox: 0, w: 900, ls: 2 });
      T(this, 280, cy - 40, `${E.name} · ${E.title}`, 36, C.text, { ox: 0, w: 900 });
      T(this, 280, cy + 10, E.desc, 22, C.sub, { ox: 0, w: 800, wrap: 680 });
      T(this, 280, cy + 64, `필살기 ${E.power} · 초필살기 ${E.superp}`, 22, C.gold, { ox: 0, w: 800, wrap: 680 });
    }
    btn(this, W / 2, by, 560, 130, '작전 개시', () => this.start(), { style: 'gold', icon: 'i_play', size: 44 });
    this.cameras.main.fadeIn(200, 20, 22, 10);
    audio.music(this.mode === 'war' ? 'bgm_warroom' : 'bgm_lobby', this);
    window.__brief = this;
  }
  restart(o) { this.scene.restart({ ...this.data0, mapId: this.mapId, custom: this.custom, level: this.level, versus: this.versus, co1: this.co, co2: this.co2, tag: this.tag ?? null, ...o }); }
  start() {
    const mode = this.versus ? 'versus' : this.mode, d = load();
    const play = { mode, mapId: this.custom ? null : this.mapId, custom: this.custom, level: this.ai, co: this.co, enemyCo: this.versus ? this.co2 : undefined, tag: this.versus || this.tag === this.co ? null : this.tag };
    const st = mode === 'campaign' && STORY[this.mapId];
    if (st && st.pre && !(d.seen || {})[this.mapId]) { (d.seen ||= {})[this.mapId] = 1; save(); return this.story(st.pre, ['Play', play]); }
    this.go('Play', play);
  }
  story(lines, next) {
    const map = MAPS.find(m => m.id === this.mapId), stg = M.STAGES.find(s => s.id === this.mapId);
    this.go('Story', { lines, foe: map.enemyCo || 'scarlet', title: stg ? `작전 ${stg.n} · ${map.name}` : map.name, next });
  }
  // 작은 지도 그림 (지형 색 · 건물 · 시작 유닛)
  mini(map, cx, cy, mw, mh) {
    const s = new Sim(map), ts = Math.floor(Math.min(mw / s.w, mh / s.h)), x0 = cx - ts * s.w / 2, y0 = cy - ts * s.h / 2, g = this.add.graphics();
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = s.tile(x, y), col = TCOL[t.t] ?? 0x8DB05A;
      g.fillStyle(t.t === 'port' ? 0x2A6AB0 : col, 1).fillRect(x0 + x * ts, y0 + y * ts, ts, ts);
      if (['city', 'base', 'air', 'hq', 'port'].includes(t.t)) { const im = this.add.image(x0 + x * ts + ts / 2, y0 + y * ts + ts / 2, `b_${t.t}_${t.owner === 1 ? 'b' : t.owner === 2 ? 'r' : 'n'}`); im.setScale(ts * 1.1 / Math.max(im.width, im.height)); }
    }
    for (const u of s.units) { const im = this.add.image(x0 + u.x * ts + ts / 2, y0 + u.y * ts + ts / 2, `u_${u.type}_${u.p === 1 ? 'b' : 'r'}`); im.setScale(ts * 0.9 / Math.max(im.width, im.height)); }
    g.lineStyle(4, 0x2B2416, 0.8).strokeRect(x0, y0, ts * s.w, ts * s.h);
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(200, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
