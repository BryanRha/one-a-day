// 작전 결과: 승패 · 별 · 전과 · 경험치 · 계급 · 새 지휘관
import { W, H } from '../config.js?v=0.38.1';
import { T, C, fmt, panel, btn, iconBtn } from '../pui.js?v=0.38.1';
import { audio } from '../audio.js?v=0.38.1';
import { load } from '../save.js?v=0.38.1';
import * as M from '../meta.js?v=0.38.1';
import { COS } from '../core/data.js?v=0.38.1';
import { MAPS } from '../core/maps.js?v=0.38.1';
import { insignia } from './Home.js?v=0.38.1';
import { rankOn } from '../rank.js?v=0.38.1';
import { rankPopup, postScore } from '../rankui.js?v=0.38.1';

const PRAISE = ['완벽한 작전!', '훌륭한 지휘였어요!', '전선이 무너졌어요, 대승!', '역시 명지휘관!'];
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x262A14);
    if (r.mode === 'versus') return this.versus(r);
    if (r.mode === 'war') return this.warRoom(r);
    const win = r.win, top = 230 + Math.max(0, (H - 1920) / 4), map = MAPS.find(m => m.id === r.mapId);
    if (win) { const ry = this.add.image(W / 2, top + 120, 'rays').setTint(0xFFD45A).setAlpha(0.35).setScale(2.2).setBlendMode('ADD'); this.tweens.add({ targets: ry, angle: 360, duration: 20000, repeat: -1 }); }
    T(this, W / 2, top, win ? 'VICTORY' : 'DEFEAT', 30, win ? C.gold : C.red, { w: 900, ls: 10 });
    T(this, W / 2, top + 110, win ? '작전 성공' : r.why === 'time' ? '작전 기한 종료' : '작전 실패', 110, C.text, { w: 900, stroke: '#2B2416', thick: 10 });
    T(this, W / 2, top + 200, win ? (r.stars === 3 ? PRAISE[0] : PRAISE[1 + (r.day % 3)]) : '전력을 정비하고 다시 도전해요', 32, win ? C.green : C.sub, { w: 900 });
    // 별
    if (r.mode === 'campaign') for (let i = 0; i < 3; i++) {
      const on = i < r.stars, sx = W / 2 + (i - 1) * 140, st = T(this, sx, top + 320, '★', 120, on ? C.gold : '#4A4A30', { w: 900, shadow: on });
      if (on) { st.setScale(0); this.tweens.add({ targets: st, scale: 1, delay: 300 + i * 250, duration: 300, ease: 'Back.easeOut', onStart: () => audio.play('sfx_captured', { volume: 0.5, rate: 1 + i * 0.12 }) }); }
    }
    const cy = top + (r.mode === 'campaign' ? 640 : 520);
    this.add.existing(panel(this, W / 2, cy, 920, 400, { tone: 'paper' }));
    const rows = [['작전 일수', `${r.day}일${map ? ` (기준 ${map.par}일)` : ''}`], ['격파한 적', `${r.kills}기`], ['점령한 건물', `${r.captures}곳`], ['잃은 아군', `${r.lost}기`], ['경험치', `+${r.xp}`]];
    rows.forEach(([k, v], i) => { const y = cy - 150 + i * 74; T(this, 120, y, k, 32, '#4A3E1E', { ox: 0, w: 800, shadow: false }); T(this, W - 120, y, v, 36, i === 4 ? '#2F6A18' : '#2B2416', { ox: 1, w: 900, shadow: false }); });
    let y = cy + 260;
    if (r.rankUp) { const rk = M.rank(); insignia(this, W / 2 - 200, y, rk.k, 1.1); T(this, W / 2 - 140, y, `진급! ${r.rankUp}`, 44, C.gold, { ox: 0, w: 900 }); audio.play('sfx_power', { volume: 0.6 }); y += 110; }
    if (r.unlocked) { const im = this.add.image(W / 2 - 220, y + 20, `co_${r.unlocked}`); im.setScale(140 / im.height); T(this, W / 2 - 120, y + 20, `지휘관 ${COS[r.unlocked].name} 합류!`, 40, C.gold, { ox: 0, w: 900 }); y += 160; }
    const by = Math.min(H - 130, y + 90);
    const next = win && r.mode === 'campaign' ? M.STAGES[M.STAGES.findIndex(s => s.id === r.mapId) + 1] : null;
    if (rankOn() && r.mode === 'daily') { const board = `daily:${M.dayKey()}`; if (win) postScore(board, -(r.day * 100 + r.lost), { day: r.day, lost: r.lost, co: r.co }); btn(this, W / 2, Math.min(H - 70, by + 150), 420, 96, '오늘의 순위', () => rankPopup(this, board, '오늘의 작전 순위', x => `${x.extra.day}일 · 손실 ${x.extra.lost}`), { style: 'blue', size: 30 }); }
    btn(this, W / 2 + 90, by, 560, 140, next ? '다음 작전' : '다시 도전', () => this.go('Brief', { mode: r.mode, mapId: next ? next.id : r.mapId }), { style: 'gold', icon: 'i_play', size: 42 });
    iconBtn(this, W / 2 - 300, by, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(300, 20, 22, 10);
    window.__result = r;
  }
  // 2인 대전 결과: 승자 지휘관 · 전과
  versus(r) {
    const top = 260 + Math.max(0, (H - 1920) / 4), win = r.winner, col = win === 1 ? C.blue : C.red;
    const ry = this.add.image(W / 2, top + 260, 'rays').setTint(win === 1 ? 0x7FB2FF : 0xFF7A60).setAlpha(0.35).setScale(2.2).setBlendMode('ADD'); this.tweens.add({ targets: ry, angle: 360, duration: 20000, repeat: -1 });
    T(this, W / 2, top, 'VICTORY', 30, col, { w: 900, ls: 10 });
    T(this, W / 2, top + 90, `${win === 1 ? '파랑' : '빨강'} 승리!`, 100, C.text, { w: 900, stroke: '#2B2416', thick: 10 });
    const face = this.add.image(W / 2, top + 380, `co_${r.cos[win]}`); face.setScale(320 / face.height);
    T(this, W / 2, top + 560, `${COS[r.cos[win]].name} 지휘관 · ${r.day}일 만에 ${r.why === 'hq' ? '본부 점령' : r.why === 'surrender' ? '상대 항복' : r.why === 'time' ? '기한 판정' : '적 전멸'}`, 30, C.gold, { w: 900 });
    this.add.existing(panel(this, W / 2, top + 760, 900, 220, { tone: 'paper' }));
    [1, 2].forEach((p, i) => { const y = top + 710 + i * 90; T(this, 120, y, p === 1 ? '파랑' : '빨강', 34, p === 1 ? '#1E4C94' : '#8E2414', { ox: 0, w: 900, shadow: false }); T(this, W - 120, y, `격파 ${r.kills[p]} · 손실 ${r.lost[p]}`, 32, '#2B2416', { ox: 1, w: 900, shadow: false }); });
    const by = Math.min(H - 130, top + 990);
    btn(this, W / 2 + 90, by, 560, 140, '다시 대전', () => this.go('Brief', { mode: 'free', versus: true, mapId: r.mapId, custom: r.custom }), { style: 'gold', icon: 'i_play', size: 42 });
    iconBtn(this, W / 2 - 300, by, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(300, 20, 22, 10);
    window.__result = r;
  }
  // 전쟁실 결과: 속도 · 전력 · 기술 막대 + 등급
  warRoom(r) {
    const top = 220 + Math.max(0, (H - 1920) / 4), m = M.WAR.find(x => x.id === r.mapId), w = r.war;
    T(this, W / 2, top, 'WAR ROOM', 30, C.gold, { w: 900, ls: 10 });
    T(this, W / 2, top + 100, r.win ? `${m.name} 돌파!` : '작전 실패', 84, C.text, { w: 900, stroke: '#2B2416', thick: 10 });
    if (!r.win) T(this, W / 2, top + 190, '이겨야 점수가 남아요 · 전력을 정비해 다시 도전', 30, C.sub, { w: 900 });
    let y = top + 260;
    if (w) {
      const RC = { S: '#FFD45A', A: '#9BE07A', B: '#8EC2FF', C: '#D8C8A0', D: '#B0A890' };
      const rk = T(this, W / 2, y + 120, w.rank, 220, RC[w.rank], { w: 900, stroke: '#2B2416', thick: 14 }); rk.setScale(0); this.tweens.add({ targets: rk, scale: 1, duration: 420, delay: 1500, ease: 'Back.easeOut', onStart: () => audio.play(w.rank === 'S' || w.rank === 'A' ? 'sfx_rank' : 'sfx_power', { volume: 0.7 }) });
      y += 300;
      this.add.existing(panel(this, W / 2, y + 170, 920, 400, { tone: 'paper' }));
      [['속도', w.speed, `${r.day}일 (기준 ${m.par}일)`], ['전력', w.power, `격파 ${r.kills}기`], ['기술', w.tech, `잃은 유닛 ${r.lost}기`]].forEach(([k, v, sub], i) => {
        const yy = y + 50 + i * 100, g = this.add.graphics();
        T(this, 110, yy, k, 34, '#2B2416', { ox: 0, w: 900, shadow: false }); T(this, 110, yy + 38, sub, 22, '#6B5A2A', { ox: 0, w: 800, shadow: false });
        g.fillStyle(0x000000, 0.15).fillRoundedRect(300, yy - 14, 480, 28, 14);
        const bar = { k: 0 }; this.tweens.add({ targets: bar, k: v / 100, duration: 600, delay: 300 + i * 350, onUpdate: () => g.clear().fillStyle(0x000000, 0.15).fillRoundedRect(300, yy - 14, 480, 28, 14).fillStyle(v >= 90 ? 0xE8B020 : 0x6FAE3A, 1).fillRoundedRect(300, yy - 14, Math.max(28, 480 * bar.k), 28, 14) });
        T(this, W - 110, yy, `${v}`, 40, '#2B2416', { ox: 1, w: 900, shadow: false });
      });
      T(this, W / 2, y + 340, `합계 ${w.total} / 300${r.warPrev && r.warPrev.total >= w.total ? ` · 최고 ${r.warPrev.total} (${r.warPrev.rank})` : ' · 새 최고 기록!'}`, 32, r.warPrev && r.warPrev.total >= w.total ? '#4A3E1E' : '#2F6A18', { w: 900, shadow: false });
      y += 400;
    }
    const by = Math.min(H - 290, y + 120);
    btn(this, W / 2 + 90, by, 560, 140, '다시 도전', () => this.go('Brief', { mode: 'war', mapId: r.mapId }), { style: 'gold', icon: 'i_play', size: 42 });
    if (rankOn()) { const board = `war:${r.mapId}`, see = () => rankPopup(this, board, `${m.name} 순위`, x => `${x.score}점 ${x.extra && x.extra.rank ? x.extra.rank : ''}`); btn(this, W / 2, by + 150, 420, 96, '순위표 보기', see, { style: 'blue', size: 30 }); if (w) postScore(board, w.total, { rank: w.rank, day: r.day, co: r.co }); }
    iconBtn(this, W / 2 - 300, by, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(300, 20, 22, 10);
    window.__result = r;
  }
  go(k, data) { this.cameras.main.fadeOut(220, 20, 22, 10); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
