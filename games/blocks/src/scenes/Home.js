// 홈: 클래식 · 어드벤처 두 모드 + 연속 출석 · 별 조각 · 오늘의 미션 · 컬렉션
import { W, H, TITLE, TITLE_EN } from '../config.js';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js';
import { audio } from '../audio.js';
import { load, save } from '../save.js';
import * as M from '../meta.js';
import { makeLevel, SEASON_LEVELS } from '../core/levels.js';
import { pictureView } from '../picture.js';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, `bg_t${d.theme % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    const ci = M.checkIn();
    const sp = Math.max(0, (H - 1920) / 6);     // 화면이 길면 칸 사이를 넓힘
    // ── 위: 연속 출석 · 별 조각 · 설정 ──
    this.add.image(70, 92, 'i_flame').setDisplaySize(50, 50).setTint(0xFF8A3D);
    T(this, 106, 92, `${d.streak.count}일 연속`, 34, C.text, { ox: 0, w: 800 });
    const sx = W - 300;
    this.add.image(sx, 92, 'i_star').setDisplaySize(46, 46).setTint(0xF5C451);
    this.starTxt = T(this, sx + 34, 92, fmt(d.stars), 36, C.gold, { ox: 0, w: 900 });
    iconBtn(this, W - 80, 92, 'i_gear', () => this.settings(), 96);
    // ── 로고 ──
    const ly = 250 + sp * 0.5;
    const mos = this.add.container(W / 2, ly - 4);
    const tt = T(this, W / 2 + 50, ly, TITLE, 104, C.text, { w: 900, ls: 2 });
    [[0, 0, 0], [1, 0, 2], [0, 1, 4], [1, 1, 6]].forEach(([x, y, k]) => mos.add(this.add.image(-tt.width / 2 + 50 - 120 + x * 46, -23 + y * 46, `blk_${k}`).setDisplaySize(44, 44)));
    T(this, W / 2, ly + 86, TITLE_EN, 28, C.sub, { w: 800, ls: 12 });
    // ── 클래식 카드 ──
    const cy = 560 + sp * 1.4;
    this.add.existing(panel(this, W / 2, cy, 960, 300));
    T(this, 110, cy - 90, 'CLASSIC', 24, C.gold, { ox: 0, w: 900, ls: 6 });
    T(this, 110, cy - 38, '클래식', 62, C.text, { ox: 0, w: 900 });
    this.add.image(126, cy + 50, 'i_crown').setDisplaySize(40, 40).setTint(0xF5C451);
    T(this, 160, cy + 50, `최고 ${fmt(d.best)}`, 38, C.gold, { ox: 0, w: 800 });
    const today = d.todayBest.date === M.dayKey() ? d.todayBest.score : 0;
    T(this, 110, cy + 104, `오늘 최고 ${fmt(today)}`, 30, C.sub, { ox: 0, w: 700 });
    btn(this, W - 260, cy + 20, 300, 132, '플레이', () => this.go('Play', { mode: 'classic' }), { style: 'gold', icon: 'i_play', size: 44 });
    // ── 어드벤처 카드 ──
    const a = M.adv(), ay = cy + 430 + sp;
    this.add.existing(panel(this, W / 2, ay, 960, 400));
    const pv = pictureView(this, 270, ay + 10, 330, a.picture, a.season, a.cleared);
    this.tweens.add({ targets: pv, scale: 1.02, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, 480, ay - 140, 'ADVENTURE', 24, C.cyan, { ox: 0, w: 900, ls: 6 });
    T(this, 480, ay - 88, '어드벤처', 62, C.text, { ox: 0, w: 900 });
    T(this, 480, ay - 20, `${a.cleared} / ${SEASON_LEVELS} 그림 조각`, 32, C.sub, { ox: 0, w: 700 });
    const bar = this.add.graphics(); bar.fillStyle(0xFFFFFF, 0.1).fillRoundedRect(480, ay + 22, 420, 16, 8).fillStyle(0x5EE3FF, 1).fillRoundedRect(480, ay + 22, Math.max(16, 420 * a.cleared / SEASON_LEVELS), 16, 8);
    T(this, 480, ay + 64, `이번 주 남은 기간 ${a.daysLeft}일${a.winStreak >= 2 ? `  ·  🔥 ${a.winStreak}연승` : ''}`, 26, C.dim, { ox: 0, w: 700 });
    const lvN = Math.min(SEASON_LEVELS, a.cleared + 1), lv = makeLevel(lvN, undefined, a.season);
    if (a.cleared >= SEASON_LEVELS) T(this, 690, ay + 140, '이번 주 그림 완성! 🏆', 36, C.gold, { w: 900 });
    else btn(this, 690, ay + 148, 420, 100, `레벨 ${lvN}${lv.hard ? '  ·  어려움' : ''}`, () => this.go('Adventure'), { style: lv.hard ? 'indigo' : 'green', size: 38 });
    // ── 오늘의 미션 ──
    const my = ay + 470 + sp;
    this.missionY = my;
    this.drawMissions();
    // ── 컬렉션 ──
    btn(this, W / 2, Math.min(H - 90, my + 300), 460, 104, '컬렉션', () => this.go('Collection'), { style: 'ghost', icon: 'i_grid', size: 36 });
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(260, 8, 10, 24);
    if (ci) this.time.delayedCall(400, () => toast(this, ci.count > 1 ? `🔥 ${ci.count}일 연속 출석! 별 +${ci.bonus}` : `오늘도 반가워요! 별 +${ci.bonus}`, C.gold, 180 + sp));
    window.__home = this;
  }
  drawMissions() {
    if (this.mBox) this.mBox.destroy();
    const my = this.missionY, c = this.add.container(0, 0); this.mBox = c;
    c.add(panel(this, W / 2, my, 960, 380));
    c.add(T(this, 110, my - 140, '오늘의 미션', 38, C.text, { ox: 0, w: 900 }));
    c.add(T(this, W - 110, my - 140, '자정에 새로 바뀌어요', 24, C.dim, { ox: 1, w: 700 }));
    M.missions().forEach((m, i) => {
      const y = my - 56 + i * 96;
      c.add(T(this, 110, y - 14, m.text, 32, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      const k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      g.fillStyle(0xFFFFFF, 0.08).fillRoundedRect(110, y + 18, 520, 12, 6).fillStyle(m.done ? 0x5BE39A : 0xF5C451, 1).fillRoundedRect(110, y + 18, Math.max(12, 520 * k), 12, 6);
      c.add(g);
      c.add(T(this, 646, y + 24, `${fmt(Math.min(m.prog, m.goal))}/${fmt(m.goal)}`, 22, C.dim, { ox: 0, w: 700 }));
      if (m.claimed) c.add(T(this, W - 160, y, '받음', 30, C.dim, { w: 800 }));
      else if (m.done) c.add(btn(this, W - 170, y + 4, 200, 76, `★ ${m.reward}`, () => { const r = M.claim(m.id); if (r) { audio.play('sfx_best', { volume: 0.6 }); toast(this, `별 +${r}`, C.gold); this.starTxt.setText(fmt(load().stars)); this.drawMissions(); } }, { style: 'gold', size: 30 }));
      else c.add(T(this, W - 160, y, `★ ${m.reward}`, 30, C.gold, { w: 800 }));
    });
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 560);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-70, '효과음', d.sfx, () => audio.toggleSfx());
    row(70, '배경음악', d.music, () => audio.toggleMusic());
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
