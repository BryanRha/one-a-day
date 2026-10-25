// 지도 만들기 (원작 디자인 룸): 지형 · 건물 · 유닛을 칠해서 내 지도 3칸에 저장 → 자유 대전(AI·둘이서)에서 플레이
import { W, H } from '../config.js?v=0.50.3';
import { T, C, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.50.3';
import { audio } from '../audio.js?v=0.50.3';
import { UNITS, UNIT_ORDER, TERRAIN } from '../core/data.js?v=0.50.3';
import { TCH } from '../core/sim.js?v=0.50.3';
import { customMaps } from './Brief.js?v=0.50.3';

const CH = Object.fromEntries(Object.entries(TCH).map(([c, t]) => [t, c]));
const TERR = ['plain', 'forest', 'mountain', 'road', 'river', 'bridge', 'sea', 'reef', 'beach', 'farm', 'wheat', 'trench', 'pipe', 'seam', 'silo'];
const BLDS = ['city', 'base', 'air', 'port', 'hq'];
const TKEY = t => ({ road: 't_road_h', river: 't_river_h', bridge: 't_bridge_h', reef: 't_sea', pipe: 't_pipe_h', seam: 't_seam_h' }[t] || `t_${t}`);
const KEY = 'front_tactics_maps';

export class EditorScene extends Phaser.Scene {
  constructor() { super('Editor'); }
  create(data = {}) {
    this.slot = data.slot ?? 0;
    const saved = customMaps()[this.slot] || (JSON.parse(localStorage.getItem(KEY) || '[]')[this.slot]);
    this.loadMap(saved || null, data.rows || 14);
    this.tab = data.tab || 'terrain'; this.team = data.team || 1;
    this.tool = data.tool || { kind: 'terrain', t: 'plain' };
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    iconBtn(this, 76, 76, 'i_home', () => this.go('Home'), 88);
    T(this, W / 2, 60, '지도 제작', 40, C.text, { w: 900 });
    [0, 1, 2].forEach(i => btn(this, W / 2 - 200 + i * 200, 124, 180, 64, `내 지도 ${i + 1}`, () => this.scene.restart({ slot: i }), { style: i === this.slot ? 'gold' : 'ghost', size: 24 }));
    btn(this, W - 110, 76, 170, 64, `세로 ${this.h}`, () => this.resize(), { style: 'ghost', size: 24 });
    // 지도
    const top = 170, palH = 520, avail = H - top - palH - 20;
    this.ts = Math.floor(Math.min(W / this.w, avail / this.h)); this.ox = Math.round((W - this.ts * this.w) / 2); this.oy = top + Math.round((avail - this.ts * this.h) / 2);
    this.layer = this.add.container(0, 0);
    this.draw();
    const zone = this.add.zone(this.ox, this.oy, this.ts * this.w, this.ts * this.h).setOrigin(0).setInteractive();
    const paint = p => { const x = Math.floor((p.x - this.ox) / this.ts), y = Math.floor((p.y - this.oy) / this.ts); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; if (this.last === `${x},${y}`) return; this.last = `${x},${y}`; this.apply(x, y); };
    zone.on('pointerdown', p => { this.last = null; paint(p); });
    zone.on('pointermove', p => { if (p.isDown) paint(p); });
    // 팔레트
    const py0 = H - palH;
    this.add.existing(panel(this, W / 2, py0 + palH / 2 - 10, W - 24, palH - 10, { r: 24 }));
    [['terrain', '지형'], ['bld', '건물'], ['unit', '유닛']].forEach(([k, l], i) => btn(this, 120 + i * 200, py0 + 50, 180, 70, l, () => this.restartKeep({ tab: k }), { style: this.tab === k ? 'gold' : 'ghost', size: 26 }));
    if (this.tab !== 'terrain') [1, 2].forEach((p, i) => btn(this, W - 290 + i * 170, py0 + 50, 160, 70, p === 1 ? '파랑' : '빨강', () => this.restartKeep({ team: p }), { style: this.team === p ? (p === 1 ? 'blue' : 'red') : 'ghost', size: 24 }));
    const items = this.tab === 'terrain' ? TERR.map(t => ({ kind: 'terrain', t, key: TKEY(t), label: TERRAIN[t].name }))
      : this.tab === 'bld' ? [...BLDS.map(t => ({ kind: 'bld', t, o: this.team, key: `b_${t}_${this.team === 1 ? 'b' : 'r'}`, label: TERRAIN[t].name })), ...BLDS.filter(t => t !== 'hq').map(t => ({ kind: 'bld', t, o: 0, key: `b_${t}_n`, label: `중립 ${TERRAIN[t].name}` }))]
      : [...UNIT_ORDER.map(t => ({ kind: 'unit', t, p: this.team, key: `u_${t}_${this.team === 1 ? 'b' : 'r'}`, label: UNITS[t].name })), { kind: 'erase', key: null, label: '유닛 지우기' }];
    const per = 6, iw = (W - 60) / per;
    items.forEach((it, i) => {
      const x = 30 + iw / 2 + (i % per) * iw, y = py0 + 140 + Math.floor(i / per) * 108, on = this.tool.kind === it.kind && this.tool.t === it.t && (it.o === undefined || this.tool.o === it.o) && (it.p === undefined || this.tool.p === it.p);
      const g = this.add.graphics(); g.fillStyle(0x000000, on ? 0.45 : 0.2).fillRoundedRect(x - iw / 2 + 4, y - 50, iw - 8, 100, 14); if (on) g.lineStyle(4, 0xFFD45A, 1).strokeRoundedRect(x - iw / 2 + 4, y - 50, iw - 8, 100, 14);
      if (it.key) { const im = this.add.image(x, y - 10, it.key); im.setScale(64 / Math.max(im.width, im.height)); } else T(this, x, y - 10, '✕', 44, C.pink, { w: 900 });
      T(this, x, y + 36, it.label, 17, C.sub, { w: 800 });
      this.add.zone(x, y, iw - 8, 100).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.tool = it; audio.play('sfx_click', { volume: 0.4 }); this.restartKeep({}); });
    });
    const by = H - 64;
    btn(this, 160, by, 260, 90, '저장', () => this.save(), { style: 'gold', size: 32 });
    btn(this, W / 2, by, 300, 90, '시험 플레이', () => this.test(), { style: 'olive', size: 30 });
    btn(this, W - 160, by, 260, 90, '모두 지우기', () => { this.loadMap(null, this.h); EditorScene.draft = null; this.restartKeep({}); }, { style: 'ghost', size: 26 });
    this.cameras.main.fadeIn(200, 20, 22, 10);
    window.__editor = this;
  }
  // 편집 중인 지도는 화면을 다시 그려도 유지 (팔레트 바꿀 때 restart 하므로 장면 밖에 보관)
  restartKeep(o) { EditorScene.draft = { grid: this.grid, units: this.units, w: this.w, h: this.h }; this.scene.restart({ slot: this.slot, tab: this.tab, team: this.team, tool: this.tool, keep: true, ...o }); }
  loadMap(m, rows) {
    if (this.sys.settings.data && this.sys.settings.data.keep && EditorScene.draft && !this.wipe) { Object.assign(this, JSON.parse(JSON.stringify(EditorScene.draft))); return; }
    this.w = 9; this.h = rows;
    this.grid = Array.from({ length: this.h }, () => Array.from({ length: this.w }, () => ({ t: 'plain', o: 0 })));
    this.units = [];
    if (m) {
      this.h = m.rows.length; this.grid = m.rows.map(r => r.trim().split(/\s+/).map(c => ({ t: TCH[c[0]], o: +(c[1] || 0) || 0 })));
      this.units = (m.units || []).map(u => ({ ...u }));
    } else {   // 빈 지도: 양쪽 본부 · 기지 · 보병 하나씩
      this.grid[0][4] = { t: 'hq', o: 2 }; this.grid[1][4] = { t: 'base', o: 2 };
      this.grid[this.h - 1][4] = { t: 'hq', o: 1 }; this.grid[this.h - 2][4] = { t: 'base', o: 1 };
      this.units = [{ t: 'inf', p: 2, x: 3, y: 1 }, { t: 'inf', p: 1, x: 5, y: this.h - 2 }];
    }
  }
  resize() {
    const sizes = [12, 14, 16, 18], nh = sizes[(sizes.indexOf(this.h) + 1) % sizes.length] || 14;
    const g = Array.from({ length: nh }, (_, y) => Array.from({ length: this.w }, (_, x) => (this.grid[y] && this.grid[y][x]) || { t: 'plain', o: 0 }));
    this.grid = g; this.h = nh; this.units = this.units.filter(u => u.y < nh); this.restartKeep({});
  }
  cost(u, x, y) { const t = this.grid[y][x].t; return TERRAIN[t].cost[UNITS[u.t].mt]; }
  apply(x, y) {
    const tl = this.tool;
    if (tl.kind === 'terrain') this.grid[y][x] = { t: tl.t, o: 0 };
    else if (tl.kind === 'bld') { if (tl.t === 'hq') for (const row of this.grid) for (const c of row) if (c.t === 'hq' && c.o === tl.o) { c.t = 'plain'; c.o = 0; } this.grid[y][x] = { t: tl.t, o: tl.o }; }
    else if (tl.kind === 'unit') { this.units = this.units.filter(u => !(u.x === x && u.y === y)); const u = { t: tl.t, p: tl.p, x, y }; if (this.cost(u, x, y) == null) return toast(this, `${UNITS[tl.t].name}은(는) 여기에 설 수 없어요`, C.sub, this.oy + 40); this.units.push(u); }
    else if (tl.kind === 'erase') this.units = this.units.filter(u => !(u.x === x && u.y === y));
    this.units = this.units.filter(u => this.cost(u, u.x, u.y) != null);   // 지형을 바꿔 설 수 없게 된 유닛은 지움
    this.draw();
  }
  draw() {
    this.layer.removeAll(true);
    const ts = this.ts;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.grid[y][x], px = this.ox + x * ts + ts / 2, py = this.oy + y * ts + ts / 2;
      const base = TERRAIN[c.t].prop ? (c.t === 'port' ? 't_sea' : 't_plain') : TKEY(c.t);
      let ang = 0; if (c.t === 'pipe' || c.t === 'seam') { const P = (a, b) => ['pipe', 'seam'].includes((this.grid[b] || [])[a]?.t); const L = P(x - 1, y), R = P(x + 1, y), U = P(x, y - 1), D = P(x, y + 1); if ((U || D) && !(L || R)) ang = 90; }   // 세로 파이프
      this.layer.add(this.add.image(px, py, base).setDisplaySize(ts + 1, ts + 1).setAngle(ang));
      if (c.t === 'reef') this.layer.add(this.add.circle(px, py, ts * 0.18, 0x8A8E80));
      if (TERRAIN[c.t].prop) { const im = this.add.image(px, py + ts * 0.4, `b_${c.t}_${c.o === 1 ? 'b' : c.o === 2 ? 'r' : 'n'}`).setOrigin(0.5, 1); im.setScale(ts * 0.92 / Math.max(im.width, im.height)); this.layer.add(im); }
    }
    for (const u of this.units) { const px = this.ox + u.x * ts + ts / 2, py = this.oy + u.y * ts + ts / 2; this.layer.add(this.add.ellipse(px, py + ts * 0.32, ts * 0.8, ts * 0.26, u.p === 1 ? 0x3E7FD8 : 0xD9472E, 0.9)); const im = this.add.image(px, py + ts * 0.38, `u_${u.t}_${u.p === 1 ? 'b' : 'r'}`).setOrigin(0.5, 1); im.setScale(Math.min(ts * 1.1 / im.width, ts * 0.9 / im.height)); this.layer.add(im); }
    const g = this.add.graphics(); g.lineStyle(1, 0x000000, 0.25); for (let x = 0; x <= this.w; x++) g.lineBetween(this.ox + x * ts, this.oy, this.ox + x * ts, this.oy + this.h * ts); for (let y = 0; y <= this.h; y++) g.lineBetween(this.ox, this.oy + y * ts, this.ox + this.w * ts, this.oy + y * ts); this.layer.add(g);
  }
  toMap() {
    const rows = this.grid.map(r => r.map(c => CH[c.t] + (TERRAIN[c.t].prop ? String(c.o) : '')).join(' '));
    return { name: `내 지도 ${this.slot + 1}`, custom: true, rows, units: this.units.map(u => ({ ...u })), funds: [5000, 5000], par: 15 };
  }
  check() {
    const hq = p => this.grid.flat().filter(c => c.t === 'hq' && c.o === p).length;
    if (hq(1) !== 1 || hq(2) !== 1) return '파랑·빨강 본부가 하나씩 있어야 해요';
    for (const p of [1, 2]) if (!this.units.some(u => u.p === p) && !this.grid.flat().some(c => c.o === p && TERRAIN[c.t].builds)) return `${p === 1 ? '파랑' : '빨강'}에게 유닛이나 생산 건물이 있어야 해요`;
    return null;
  }
  save() {
    const err = this.check(); if (err) return toast(this, err, C.pink, this.oy + 60);
    const all = JSON.parse(localStorage.getItem(KEY) || '[]'); all[this.slot] = this.toMap();
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* */ }
    audio.play('sfx_captured', { volume: 0.6 }); toast(this, `내 지도 ${this.slot + 1}에 저장했어요 · 자유 대전에서 골라요`, C.gold, this.oy + 60);
  }
  test() {
    const err = this.check(); if (err) return toast(this, err, C.pink, this.oy + 60);
    this.save(); this.go('Brief', { mode: 'free', custom: this.toMap() });
  }
  go(k, data) { EditorScene.draft = null; audio.stopMusic(); this.cameras.main.fadeOut(200, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
