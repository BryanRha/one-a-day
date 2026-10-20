// 작전 준비: 캠페인 스테이지 고르기 · 지도 미리보기 · 지휘관 고르기 · (자유 대전) 지도·난이도
import { W, H } from '../config.js?v=0.10.2';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.10.2';
import { audio } from '../audio.js?v=0.10.2';
import { load, save } from '../save.js?v=0.10.2';
import * as M from '../meta.js?v=0.10.2';
import { COS, UNITS } from '../core/data.js?v=0.10.2';
import { MAPS } from '../core/maps.js?v=0.10.2';
import { Sim } from '../core/sim.js?v=0.10.2';

const LV = { easy: '쉬움', normal: '보통', hard: '어려움' };
const TCOL = { plain: 0x8DB05A, farm: 0x9BB45A, wheat: 0xD8B85A, forest: 0x3E7A34, mountain: 0x9A8C78, road: 0xC8A878, bridge: 0xB0A090, river: 0x4A9AD8, beach: 0xE8D8A0, sea: 0x2A6AB0, trench: 0x8A7A50 };

export class BriefScene extends Phaser.Scene {
  constructor() { super('Brief'); }
  create(data = {}) {
    const d = load();
    this.mode = data.mode || 'campaign';
    if (this.mode === 'daily') this.mapId = M.dailyOp().map.id;
    else if (this.mode === 'campaign') { const i = M.STAGES.findIndex(s => !d.stars[s.id]); this.mapId = data.mapId || M.STAGES[i < 0 ? 0 : i].id; }
    else this.mapId = data.mapId || 'm1';
    this.level = data.level || d.level || 'normal';
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    iconBtn(this, 76, 80, 'i_home', () => this.go('Home'), 92);
    T(this, W / 2, 80, { campaign: '캠페인 작전', daily: '오늘의 작전', free: '자유 대전' }[this.mode], 46, C.text, { w: 900 });
    let y = 170;
    // 지도 고르기 (캠페인: 열린 스테이지 · 자유: 깬 지도)
    if (this.mode !== 'daily') {
      const list = this.mode === 'campaign' ? M.STAGES : M.STAGES.filter((s, i) => M.stageOpen(i));
      const n = list.length, w = Math.min(190, (W - 60) / n - 10);
      list.forEach((s, i) => {
        const x = 30 + w / 2 + i * (w + 10) + ((W - 60) - n * (w + 10) + 10) / 2, open = M.stageOpen(M.STAGES.indexOf(s)), on = s.id === this.mapId;
        btn(this, x, y + 50, w, 100, open ? `${s.n}` : '잠김', () => { if (!open) return toast(this, '앞 작전을 먼저 이겨요', C.sub); this.scene.restart({ ...data, mapId: s.id, level: this.level }); }, { style: on ? 'gold' : open ? 'olive' : 'ghost', size: 40 });
        T(this, x, y + 126, '★'.repeat(d.stars[s.id] || 0) + '☆'.repeat(3 - (d.stars[s.id] || 0)), 22, C.gold, { w: 900, shadow: false });
      });
      y += 170;
    }
    const map = MAPS.find(m => m.id === this.mapId), st = M.STAGES.find(s => s.id === this.mapId);
    this.ai = this.mode === 'campaign' ? st.ai : this.mode === 'daily' ? 'hard' : this.level;
    // 지도 미리보기
    this.add.existing(panel(this, W / 2, y + 330, 1000, 640, { tone: 'paper' }));
    T(this, 70, y + 50, `${st.n}. ${map.name}`, 40, '#2B2416', { ox: 0, w: 900, shadow: false });
    T(this, 70, y + 96, map.desc, 24, '#4A3E1E', { ox: 0, w: 800, shadow: false, wrap: 520 });
    T(this, 70, y + 150, `기준 ${map.par}일 · 기한 ${map.par + 8}일 · 적 ${LV[this.ai]}`, 24, '#7A5A10', { ox: 0, w: 800, shadow: false });
    if (this.mode === 'campaign') { const best = d.bestDays[map.id]; T(this, 70, y + 190, best ? `최단 승리 ${best}일` : st.unlockCo && !d.cos[st.unlockCo] ? `승리 보상 · 지휘관 ${COS[st.unlockCo].name} 합류` : '', 24, '#2F6A18', { ox: 0, w: 800, shadow: false }); }
    if (this.mode === 'daily') { const op = M.dailyOp(); T(this, 70, y + 190, op.best ? `오늘 최단 ${op.best}일 · ${op.tries}번 도전` : '모두 같은 지도 · 가장 빨리 이겨요', 24, '#2F6A18', { ox: 0, w: 800, shadow: false }); }
    this.mini(map, W - 270, y + 330, 420, 560);
    y += 680;
    // 난이도 (자유 대전)
    if (this.mode === 'free') {
      ['easy', 'normal', 'hard'].forEach((l, i) => btn(this, W / 2 + (i - 1) * 300, y + 30, 280, 90, LV[l], () => { d.level = l; save(); this.scene.restart({ ...data, mapId: this.mapId, level: l }); }, { style: this.level === l ? 'gold' : 'ghost', size: 32 }));
      y += 120;
    }
    // 지휘관
    T(this, 50, y + 20, '출전 지휘관', 32, C.text, { ox: 0, w: 900 });
    this.co = d.cos[d.co] ? d.co : 'ella';
    const keys = Object.keys(COS).filter(k => d.cos[k]);
    keys.forEach((k, i) => {
      const x = 130 + i * 230, on = k === this.co;
      const fr = this.add.image(x, y + 150, `co_${k}`); fr.setScale(170 / fr.height);
      const m = this.make.graphics(); m.fillRoundedRect(x - 90, y + 70, 180, 160, 18); fr.setMask(m.createGeometryMask());
      this.add.graphics().lineStyle(on ? 6 : 3, on ? 0xFFD45A : 0x6E7A40, 1).strokeRoundedRect(x - 90, y + 70, 180, 160, 18);
      T(this, x, y + 258, COS[k].name, 26, on ? C.gold : C.text, { w: 900 });
      this.add.zone(x, y + 150, 180, 160).setInteractive({ useHandCursor: true }).on('pointerup', () => { d.co = k; save(); this.scene.restart({ ...data, mapId: this.mapId, level: this.level }); });
    });
    T(this, 50, y + 310, `${COS[this.co].desc} · 필살기 ${COS[this.co].power}`, 24, C.sub, { ox: 0, w: 800, wrap: W - 100 });
    btn(this, W / 2, Math.min(H - 110, y + 440), 560, 140, '작전 개시', () => this.go('Play', { mode: this.mode, mapId: this.mapId, level: this.ai, co: this.co }), { style: 'gold', icon: 'i_play', size: 46 });
    this.cameras.main.fadeIn(200, 20, 22, 10);
    window.__brief = this;
  }
  // 작은 지도 그림 (지형 색 · 건물 · 시작 유닛)
  mini(map, cx, cy, mw, mh) {
    const s = new Sim(map), ts = Math.floor(Math.min(mw / s.w, mh / s.h)), x0 = cx - ts * s.w / 2, y0 = cy - ts * s.h / 2, g = this.add.graphics();
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const t = s.tile(x, y), col = TCOL[t.t] ?? 0x8DB05A;
      g.fillStyle(col, 1).fillRect(x0 + x * ts, y0 + y * ts, ts, ts);
      if (['city', 'base', 'air', 'hq'].includes(t.t)) { const im = this.add.image(x0 + x * ts + ts / 2, y0 + y * ts + ts / 2, `b_${t.t}_${t.owner === 1 ? 'b' : t.owner === 2 ? 'r' : 'n'}`); im.setScale(ts * 1.1 / Math.max(im.width, im.height)); }
    }
    for (const u of s.units) { const im = this.add.image(x0 + u.x * ts + ts / 2, y0 + u.y * ts + ts / 2, `u_${u.type}_${u.p === 1 ? 'b' : 'r'}`); im.setScale(ts * 0.9 / Math.max(im.width, im.height)); }
    g.lineStyle(4, 0x2B2416, 0.8).strokeRect(x0, y0, ts * s.w, ts * s.h);
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(200, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
