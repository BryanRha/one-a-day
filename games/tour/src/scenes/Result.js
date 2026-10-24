// 결과: 순위 · 자산 · 랭크 점수 변화
import { W, H } from '../config.js?v=0.36.1';
import { T, C, btn } from '../ui.js?v=0.36.1';
import { audio } from '../audio.js?v=0.36.1';
import { load, save } from '../save.js?v=0.36.1';
import { tierOf } from './Lobby.js?v=0.36.1';
import { REASON } from '../engine.js?v=0.36.1';
import { fmt } from '../data.js?v=0.36.1';

const PTS = [30, 10, -5, -10];
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    const d = load(), me = r.rows.findIndex(x => x.me), win = me === 0, gain = PTS[me];
    if (!r.counted) { d.games++; if (win) d.wins++; d.rank = Math.max(0, d.rank + gain); d.best = Math.max(d.best, r.rows[me].assets); save(); r.counted = true; }
    audio.music(null); audio.play(win ? 'sfx_win' : 'sfx_lose', { volume: 0.8 });
    { const bg = this.add.graphics(); bg.fillGradientStyle(0x1B2E57, 0x1B2E57, 0x0C1630, 0x0C1630, 1).fillRect(0, 0, W, H); }
    for (let k = 0; win && k < 40; k++) { const s = this.add.image(Math.random() * W, -40, 'spark').setTint([0xFFE27A, 0xFF9DB6, 0x8FD6FF][k % 3]).setScale(0.4 + Math.random() * 0.4); this.tweens.add({ targets: s, y: H + 40, angle: 720, duration: 2500 + Math.random() * 2500, delay: Math.random() * 1500, repeat: -1 }); }
    const tp = this.add.image(W / 2, H * 0.15, win ? 'trophy' : 'bankrupt'); tp.setScale(240 / tp.height);
    T(this, W / 2, H * 0.27, win ? '우승!' : `${me + 1}등`, 100, win ? '#FFE27A' : '#FFFFFF', { w: 900 }).setStroke('#0B1428', 14);
    T(this, W / 2, H * 0.33, `${r.winner} · ${REASON[r.reason]}`, 36, '#FFFFFF', { w: 900 });
    r.rows.forEach((x, i) => { const y = H * 0.4 + i * 170, g = this.add.graphics(); g.fillStyle(x.me ? 0xFFFFFF : 0xF6F9FC, 1).fillRoundedRect(60, y - 70, W - 120, 140, 30).lineStyle(x.me ? 6 : 2, x.me ? 0xF0B65A : 0xD8E4F0, 1).strokeRoundedRect(60, y - 70, W - 120, 140, 30);
      T(this, 120, y, `${i + 1}`, 48, i === 0 ? C.gold : C.dim, { w: 900 }); const im = this.add.image(230, y, x.img); im.setScale(120 / im.height);
      T(this, 310, y - 22, x.name, 32, C.ink, { ox: 0, w: 900 }); T(this, 310, y + 24, x.out ? '파산' : `자산 ${fmt(x.assets)}`, 24, x.out ? C.red : C.dim, { ox: 0, w: 800 }); });
    const tr = tierOf(d.rank); T(this, W / 2, H * 0.4 + 4 * 170 + 30, `랭크 ${gain >= 0 ? '+' : ''}${gain}점 → ${tr[1]} ${d.rank}점`, 36, gain >= 0 ? '#5BFF8A' : '#FF7A7A', { w: 900 });
    btn(this, W / 2 - 220, H - 200, 400, 120, '한 판 더', () => this.scene.start('Game'), { size: 38, style: 'gold' });
    btn(this, W / 2 + 220, H - 200, 360, 120, '로비로', () => this.scene.start('Lobby'), { size: 34, style: 'cream' });
    window.__result = this;
  }
}
