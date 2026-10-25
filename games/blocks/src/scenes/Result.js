// 클래식 결과: 점수 · 최고 기록 · 지운 줄 · 최고 콤보 · 오늘의 미션 진행 → 다시 하기 / 홈
import { W, H } from '../config.js?v=0.57.0';
import { T, C, fmt, panel, btn, iconBtn } from '../pui.js?v=0.57.0';
import { audio } from '../audio.js?v=0.57.0';
import { load } from '../save.js?v=0.57.0';
import * as M from '../meta.js?v=0.57.0';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, `bg_t${d.theme % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    const top = 240 + Math.max(0, (H - 1920) / 3);
    if (r.newBest) { this.add.image(W / 2, top - 30, 'i_crown').setDisplaySize(90, 90).setTint(0xF5C451); }
    const title = T(this, W / 2, top + 60, r.newBest ? 'NEW BEST' : 'GAME OVER', 34, r.newBest ? C.gold : C.sub, { w: 900, ls: 10 });
    const sc = T(this, W / 2, top + 190, '0', 170, C.text, { w: 900 });
    this.tweens.addCounter({ from: 0, to: r.score, duration: 1000, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    const cy = top + 520;
    this.add.existing(panel(this, W / 2, cy, 900, 330));
    // AI 수 정확도 (바둑·체스 AI 복기처럼) — 잘한 판일수록 크게
    if (r.acc) { const ac = T(this, W / 2, top + 330, `AI 평균 수 가치 ${r.acc}%  ·  최선의 수 ${r.bestMoves}번`, 36, r.acc >= 80 ? C.green : C.cyan, { w: 900 }); if (r.acc >= 92) T(this, W / 2, top + 384, '프로 수준의 판단이에요!', 30, C.gold, { w: 800 }); }
    [['최고 기록', fmt(r.best), C.gold], ['지운 줄', `${fmt(r.lines)}`, C.text], ['최고 콤보', `×${r.combo}`, C.text]].forEach(([k, v, col], i) => {
      const y = cy - 100 + i * 100;
      T(this, 150, y, k, 36, C.sub, { ox: 0, w: 800 }); T(this, W - 150, y, v, 44, col, { ox: 1, w: 900 });
    });
    // 오늘의 미션 진행 (재방문 동기)
    const ms = M.missions(), done = ms.filter(m => m.done).length, ready = ms.filter(m => m.done && !m.claimed).length;
    T(this, W / 2, cy + 250, ready ? `🎁 받을 미션 보상 ${ready}개 — 홈에서 받으세요` : `오늘의 미션 ${done}/3 완료`, 32, ready ? C.gold : C.sub, { w: 800 });
    if (r.newBest) { audio.play('sfx_best', { volume: 0.7 }); this.time.delayedCall(200, () => this.cameras.main.flash(250, 255, 240, 200)); title.setScale(0); this.tweens.add({ targets: title, scale: 1, duration: 400, ease: 'Back.easeOut' }); }
    const by = Math.min(H - 150, cy + 420);
    btn(this, W / 2 + 90, by, 560, 140, '다시 하기', () => this.go('Play', { mode: 'classic' }), { style: 'gold', icon: 'i_retry', size: 46 });
    iconBtn(this, W / 2 - 300, by - 4, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(260, 8, 10, 24);
    window.__result = r;
  }
  go(k, data) { this.cameras.main.fadeOut(220, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
