// 홈: 계급 · 캠페인 · 오늘의 작전 · 자유 대전 · 지휘관 · 오늘의 미션 · 연속 출석
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.55.1';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.55.1';
import { audio } from '../audio.js?v=0.55.1';
import { load } from '../save.js?v=0.55.1';
import * as M from '../meta.js?v=0.55.1';
import { COS } from '../core/data.js?v=0.55.1';
import { rankOn } from '../rank.js?v=0.55.1';
import { rankPopup } from '../rankui.js?v=0.55.1';

// 계급장: 이병~병장 갈매기 · 부사관 · 장교 다이아 · 장성 별
export function insignia(scene, x, y, k, s = 1) {
  const g = scene.add.graphics(); g.setPosition(x, y);
  g.fillStyle(0x2B2416, 1).fillRoundedRect(-34 * s, -34 * s, 68 * s, 68 * s, 12 * s).lineStyle(3 * s, 0xFFD45A, 0.9).strokeRoundedRect(-34 * s, -34 * s, 68 * s, 68 * s, 12 * s);
  const col = 0xFFD45A;
  if (k < 4) for (let i = 0; i <= k; i++) { const yy = (-12 + i * 10 - k * 4) * s; g.lineStyle(5 * s, col, 1).beginPath().moveTo(-18 * s, yy + 8 * s).lineTo(0, yy - 4 * s).lineTo(18 * s, yy + 8 * s).strokePath(); }
  else if (k < 7) { const n = k - 3; for (let i = 0; i < n; i++) g.fillStyle(col, 1).fillRect(-18 * s, (-14 + i * 11) * s, 36 * s, 6 * s); }
  else if (k < 13) { const n = ((k - 7) % 3) + 1, flower = k >= 10; for (let i = 0; i < n; i++) { const xx = (i - (n - 1) / 2) * 20 * s; if (flower) g.fillStyle(0xC9D2D8, 1).fillCircle(xx, 0, 8 * s); else g.fillStyle(col, 1).fillTriangle(xx, -10 * s, xx + 8 * s, 0, xx, 10 * s).fillTriangle(xx, -10 * s, xx - 8 * s, 0, xx, 10 * s); } }
  else { const n = k - 12; for (let i = 0; i < n; i++) { const xx = (i - (n - 1) / 2) * 16 * s; star(g, xx, 0, 9 * s, 0xE8EEF2); } }
  return g;
}
function star(g, x, y, r, col) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr }); } g.fillStyle(col, 1).fillPoints(pts, true); }

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    const d = load(), ci = M.checkIn(), sp = Math.max(0, (H - 1920) / 6); this.mBox = null;
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    // 키 아트 + 아래로 배경색에 스며들게 + 제목
    const k = this.add.image(W / 2, 150, 'key_art').setOrigin(0.5, 0); k.setScale(W / k.width);
    const fade = this.add.graphics(); const kb = 150 + k.displayHeight;
    for (let i = 0; i < 40; i++) fade.fillStyle(0x262A14, i / 40).fillRect(0, kb - 200 + i * 5, W, 5);
    fade.fillStyle(0x262A14, 1).fillRect(0, kb, W, H);
    T(this, W / 2, 230, TITLE, 96, C.text, { w: 900, stroke: '#2B2416', thick: 12 });
    T(this, W / 2, 312, TITLE_EN, 28, C.gold, { w: 900, ls: 12, stroke: '#2B2416', thick: 6 });
    // 위: 계급 · 훈장 · 출석
    const r = M.rank();
    this.add.existing(panel(this, W / 2, 84, W - 24, 140, { r: 24 }));
    insignia(this, 80, 84, r.k, 1);
    T(this, 134, 62, r.name, 36, C.gold, { ox: 0, w: 900 });
    const g = this.add.graphics(); g.fillStyle(0x000000, 0.5).fillRoundedRect(134, 94, 260, 16, 8).fillStyle(0xA6E07A, 1).fillRoundedRect(134, 94, Math.max(16, 260 * r.into / r.need), 16, 8);
    T(this, 410, 102, `${r.into}/${r.need}`, 20, C.sub, { ox: 0, w: 800 });
    T(this, W - 330, 62, `훈장 ${d.medals}`, 30, C.gold, { ox: 0, w: 900 });
    T(this, W - 330, 106, `${d.streak.count}일 연속 출석`, 22, C.sub, { ox: 0, w: 800 });
    iconBtn(this, W - 76, 84, 'i_gear', () => this.settings(), 92);
    // 캠페인
    const done = M.STAGES.findIndex(s => !d.stars[s.id]), next = done < 0 ? M.STAGES.length - 1 : done;
    let y = Math.max(610, 150 + k.displayHeight - 40) + sp;
    { const n = Object.keys(COS).length, extra = n > 12 ? 146 : 0; y = Math.max(520, Math.min(y, H - 1085 - extra - 3 * sp)); }   // 짧은 화면: 그림을 덜 보이고 아래 내용이 다 들어가게
    this.add.existing(panel(this, W / 2, y, 1000, 270, { tone: 'paper' }));
    T(this, 76, y - 92, 'CAMPAIGN', 22, '#6B5A2A', { ox: 0, w: 900, ls: 6, shadow: false });
    T(this, 76, y - 44, '캠페인 작전', 52, '#2B2416', { ox: 0, w: 900, shadow: false });
    T(this, 76, y + 22, `다음: ${M.STAGES[next].n}. ${M.STAGES[next].name}`, 28, '#4A3E1E', { ox: 0, w: 800, shadow: false });
    T(this, 76, y + 70, `★ ${M.totalStars()} / ${M.STAGES.length * 3}`, 30, '#9A6A10', { ox: 0, w: 900, shadow: false });
    btn(this, W - 230, y - 34, 320, 120, '출격', () => this.go('Brief', { mode: 'campaign' }), { style: 'gold', icon: 'i_play', size: 44 });
    const wr = Object.values(d.war || {}), wS = wr.filter(o => o.rank === 'S').length;
    btn(this, W - 230, y + 80, 320, 78, wr.length ? `전쟁실 · S ${wS}/${M.WAR.length}` : '전쟁실 · 점수 도전', () => this.go('Brief', { mode: 'war' }), { style: 'olive', size: 26 });
    // 이어하기 (앱을 나가도 그 턴부터)
    let rs = null; try { rs = JSON.parse(localStorage.getItem('front_tactics_resume') || 'null'); } catch { /* */ }
    if (rs) {
      const mp = M.STAGES.find(x => x.id === rs.mapId) || M.WAR.find(x => x.id === rs.mapId);
      const rb = btn(this, W / 2, y - 175, 720, 96, `이어하기 · ${mp ? mp.name : ''} DAY ${rs.sim.day}`, () => this.go('Play', { mode: rs.mode, mapId: rs.mapId, level: rs.level, co: rs.co, enemyCo: rs.enemyCo, tag: rs.tag, resume: rs }), { style: 'blue', icon: 'i_play', size: 30 });
      this.tweens.add({ targets: rb, scale: 1.04, duration: 600, yoyo: true, repeat: -1 });
    }
    // 오늘의 작전 · 자유 대전
    y += 300 + sp;
    const op = M.dailyOp(), hw = 488;
    this.add.existing(panel(this, W / 2 - hw / 2 - 6, y, hw, 270, { tone: 'gold' }));
    T(this, 60, y - 96, 'DAILY OPERATION', 20, C.gold, { ox: 0, w: 900, ls: 3 });
    T(this, 60, y - 52, '오늘의 작전', 40, C.text, { ox: 0, w: 900 });
    T(this, 60, y - 4, `${op.map.name} · 어려움`, 24, C.sub, { ox: 0, w: 800 });
    btn(this, W / 2 - hw / 2 - 6 - (rankOn() ? 60 : 0), y + 80, hw - 70 - (rankOn() ? 120 : 0), 90, op.best ? `도전 · 최단 ${op.best}일` : '도전', () => this.go('Brief', { mode: 'daily' }), { style: 'gold', size: 30 });
    if (rankOn()) btn(this, W / 2 - 6 - 80, y + 80, 110, 90, '순위', () => rankPopup(this, `daily:${M.dayKey()}`, '오늘의 작전 순위', x => `${x.extra.day}일 · 손실 ${x.extra.lost}`), { style: 'ghost', size: 24 });
    this.add.existing(panel(this, W / 2 + hw / 2 + 6, y, hw, 270));
    T(this, W / 2 + 36, y - 96, 'SKIRMISH', 20, C.green, { ox: 0, w: 900, ls: 3 });
    T(this, W / 2 + 36, y - 52, '자유 대전', 40, C.text, { ox: 0, w: 900 });
    T(this, W / 2 + 36, y - 4, 'AI 대전 · 둘이서 · 내 지도', 24, C.sub, { ox: 0, w: 800 });
    btn(this, W / 2 + hw / 2 + 6 - 108, y + 80, 200, 90, '시작', () => this.go('Brief', { mode: 'free' }), { style: 'olive', size: 30 });
    btn(this, W / 2 + hw / 2 + 6 + 108, y + 80, 200, 90, '지도 제작', () => this.go('Editor'), { style: 'ghost', size: 26 });
    // 지휘관
    y += 290 + sp;
    this.coY = y; this.sp0 = sp;
    T(this, 50, y - 110, `지휘관 ${Object.keys(COS).filter(k => d.cos[k]).length}/${Object.keys(COS).length}`, 34, C.text, { ox: 0, w: 900 });
    Object.keys(COS).forEach((k, i) => {
      const n = Object.keys(COS).length, per = n > 12 ? Math.ceil(n / 2) : n, step = Math.min(124, (W - 80) / per), sz = this.coSz(step, n), x = 40 + step / 2 + (i % per) * step, cy = y - 10 + Math.floor(i / per) * (sz + 50), own = d.cos[k];   // 많으면 두 줄
      const fr = this.add.image(x, cy, `co_${k}`); fr.setScale((sz + 30) / fr.height); if (!own) fr.setTint(0x333333);
      const m = this.make.graphics(); m.fillRoundedRect(x - sz / 2, cy - sz / 2, sz, sz, 16); fr.setMask(m.createGeometryMask());
      this.add.graphics().lineStyle(3, own ? COS[k].color : 0x555544, 1).strokeRoundedRect(x - sz / 2, cy - sz / 2, sz, sz, 16);
      T(this, x, cy + sz / 2 + 20, own ? COS[k].name : '잠김', sz < 100 ? 19 : 22, own ? C.text : C.dim, { w: 900 });
      const z = this.add.zone(x, cy, sz, sz).setInteractive({ useHandCursor: true }); z.on('pointerup', () => this.coInfo(k));
    });
    // 미션
    { const n = Object.keys(COS).length; if (n > 12) y += this.coSz(Math.min(124, (W - 80) / Math.ceil(n / 2)), n) + 50; }
    this.my = y + 290 + sp; this.drawMissions();
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(260, 20, 22, 10);
    if (ci) this.time.delayedCall(400, () => toast(this, `${ci.count}일 연속 출석 · 훈장 +${ci.bonus}`, C.gold, 260));
    window.__home = this;
  }
  titleArt(sp) {
    const y = 300 + sp * 0.6;
    ['u_htank_b', 'u_inf_b', 'u_heli_b'].forEach((k, i) => { const im = this.add.image(W / 2 + (i - 1) * 300, y - 20 + (i === 1 ? 20 : 0), k); im.setScale((i === 1 ? 180 : 200) / Math.max(im.width, im.height)); this.tweens.add({ targets: im, y: im.y - 10, duration: 1300 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
    T(this, W / 2, y + 120, TITLE, 92, C.text, { w: 900, stroke: '#2B2416', thick: 10 });
    T(this, W / 2, y + 190, TITLE_EN, 28, C.gold, { w: 900, ls: 12 });
  }
  coInfo(k) {
    const d = load(), co = COS[k], own = d.cos[k];
    const p = popup(this, `${co.name} · ${co.title}`, 920, 880);
    const im = this.add.image(-230, -60, `co_${k}`); im.setScale(420 / im.height); if (!own) im.setTint(0x333333); p.content.add(im);
    p.content.add(T(this, 40, -230, '특성', 26, C.gold, { ox: 0, w: 900 }));
    p.content.add(T(this, 40, -190, co.desc, 28, C.text, { ox: 0, w: 800, wrap: 380 }));
    p.content.add(T(this, 40, -100, `필살기 · ${co.power}`, 26, C.gold, { ox: 0, w: 900 }));
    p.content.add(T(this, 40, -64, co.pdesc, 22, C.text, { ox: 0, w: 800, wrap: 380 }));
    p.content.add(T(this, 40, 0, `초필살기 · ${co.superp}`, 26, '#FF8A6A', { ox: 0, w: 900 }));
    p.content.add(T(this, 40, 36, co.sdesc, 22, C.text, { ox: 0, w: 800, wrap: 380 }));
    const st = M.STAGES.find(s => s.unlockCo === k);
    if (!own) p.content.add(T(this, 40, 130, st ? `캠페인 ${st.n}. ${st.name} 승리로 합류` : '', 26, C.sub, { ox: 0, w: 800, wrap: 380 }));
    else p.content.add(btn(this, 0, 320, 440, 110, d.co === k ? '출전 중' : '이 지휘관으로 출전', () => { d.co = k; import('../save.js?v=0.55.1').then(m => m.save()); p.close(); this.scene.restart(); }, { style: d.co === k ? 'ghost' : 'gold', size: 32 }));
  }
  drawMissions() {
    if (this.mBox) this.mBox.destroy();
    const my = this.my, c = this.add.container(0, 0); this.mBox = c;
    c.add(panel(this, W / 2, my, 1000, 330));
    c.add(T(this, 76, my - 120, '오늘의 미션', 34, C.text, { ox: 0, w: 900 }));
    M.missions().forEach((m, i) => {
      const y = my - 46 + i * 84, k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      c.add(T(this, 76, y - 12, m.text, 30, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      g.fillStyle(0x000000, 0.35).fillRoundedRect(76, y + 18, 520, 10, 5).fillStyle(m.done ? 0xA6E07A : 0xFFD45A, 1).fillRoundedRect(76, y + 18, Math.max(10, 520 * k), 10, 5); c.add(g);
      if (m.claimed) c.add(T(this, W - 160, y, '받음', 28, C.dim, { w: 800 }));
      else if (m.done) c.add(btn(this, W - 170, y + 4, 200, 72, `훈장 ${m.reward}`, () => { if (M.claim(m.id)) { audio.play('sfx_captured', { volume: 0.6 }); this.scene.restart(); } }, { style: 'gold', size: 26 }));
      else c.add(T(this, W - 160, y, `훈장 ${m.reward}`, 26, C.gold, { w: 800 }));
    });
  }
  // 지휘관 얼굴 크기: 두 줄이면 화면 아래 미션이 잘리지 않게 남은 높이에 맞춤
  coSz(step, n) { if (n <= 12) return step - 10; const room = H - 190 - (this.coY + 290 + this.sp0); return Math.max(64, Math.min(step - 10, room - 50)); }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 900);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-90, '효과음', d.sfx, () => audio.toggleSfx()); row(30, '배경음악', d.music, () => audio.toggleMusic()); row(150, '전투 장면', d.cutscene !== false, () => { d.cutscene = d.cutscene === false; import('../save.js?v=0.55.1').then(m => m.save()); }); row(270, '지휘관 테마곡', d.coTheme !== false, () => { d.coTheme = d.coTheme === false; import('../save.js?v=0.55.1').then(m => m.save()); }); row(390, '전투 대사', d.talk !== false, () => { d.talk = d.talk === false; import('../save.js?v=0.55.1').then(m => m.save()); });
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
