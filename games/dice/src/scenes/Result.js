// 결과: 도달 웨이브 · 처치 · 보스 · 최고 눈 · 받은 수정 · 새 해금
import { W, H } from '../config.js';
import { T, C, fmt, panel, btn, iconBtn } from '../pui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import { RUNES } from '../core/sim.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    const bg = this.add.image(W / 2, H / 2, 'bg_altar'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.6);
    const top = 260 + Math.max(0, (H - 1920) / 3);
    T(this, W / 2, top, r.mode === 'daily' ? 'DAILY CHALLENGE' : r.newBest ? 'NEW RECORD' : 'EXPEDITION OVER', 32, r.newBest ? C.gold : C.sub, { w: 900, ls: 8 });
    T(this, W / 2, top + 120, `WAVE ${r.wave}`, 150, C.text, { w: 900, ls: 2 });
    if (r.newBest) { audio.play('sfx_wave', { volume: 0.8 }); this.time.delayedCall(200, () => this.cameras.main.flash(260, 255, 230, 200)); }
    const cy = top + 470;
    this.add.existing(panel(this, W / 2, cy, 900, 380));
    [['처치한 적', fmt(r.kills)], ['보스 처치', `${r.bossKills}`], ['최고 주사위', `${r.maxPips}눈${r.maxPips >= 7 ? ' · 각성' : ''}`], ['얻은 수정', `◆ ${r.crystals}`]].forEach(([k, v], i) => {
      const y = cy - 130 + i * 86; T(this, 150, y, k, 36, C.sub, { ox: 0, w: 800 }); T(this, W - 150, y, v, 42, i === 3 ? '#8FE3FF' : C.text, { ox: 1, w: 900 });
    });
    if (r.unlocked && r.unlocked.length) {
      const uy = cy + 280; T(this, W / 2, uy - 40, '새 룬 해금!', 40, C.gold, { w: 900 });
      r.unlocked.forEach((u, i) => { const x = W / 2 + (i - (r.unlocked.length - 1) / 2) * 140; this.add.image(x, uy + 50, `die_${u}`).setDisplaySize(110, 110); this.add.image(x, uy + 50, `rune_${u}`).setDisplaySize(62, 62); T(this, x, uy + 122, RUNES[u].name, 26, C.text, { w: 800 }); });
      audio.play('sfx_awaken', { volume: 0.7 });
    }
    const by = Math.min(H - 150, cy + 560);
    btn(this, W / 2 + 90, by, 560, 140, '다시 출정', () => this.go('Play', { mode: r.mode === 'daily' ? 'run' : r.mode }), { style: 'gold', icon: 'i_retry', size: 44 });
    iconBtn(this, W / 2 - 300, by - 4, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(300, 5, 6, 26);
    window.__result = r;
  }
  go(k, data) { this.cameras.main.fadeOut(220, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
