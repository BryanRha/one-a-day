// 결과: 승리/도전 · 도달 방 · 얻은 금화·보석 · 고른 능력 · 다시/홈
import { W, H } from '../config.js?v=0.17.5';
import { T, C, fmt, panel, btn, iconBtn } from '../pui.js?v=0.17.5';
import { audio } from '../audio.js?v=0.17.5';
import { CHAPTERS, SKILLS, ROOMS } from '../core/data.js?v=0.17.5';
import { itemBox } from '../gearui.js?v=0.17.5';

const PRAISE = ['대단해요!', '완벽한 모험!', '별빛이 함께했어요!'];
export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B0D1E);
    const top = 240 + Math.max(0, (H - 1920) / 4), win = r.win, ch = CHAPTERS[r.chapter - 1];
    if (win) { const ry = this.add.image(W / 2, top + 140, 'rays').setTint(0xFFD45A).setAlpha(0.35).setScale(2.4).setBlendMode('ADD'); this.tweens.add({ targets: ry, angle: 360, duration: 20000, repeat: -1 }); }
    T(this, W / 2, top, win ? 'CLEAR' : r.daily ? 'DAILY DUNGEON' : 'GOOD TRY', 30, win ? C.gold : C.cyan, { w: 900, ls: 10 });
    T(this, W / 2, top + 100, win ? `${ch.name} 클리어!` : `방 ${r.room}까지 도착!`, 84, C.text, { w: 900, stroke: '#14102A', thick: 10 });
    T(this, W / 2, top + 190, win ? PRAISE[r.room % 3] : r.newBest ? '새 최고 기록이에요!' : '장비를 강화하면 더 멀리 갈 수 있어요', 32, win || r.newBest ? C.green : C.sub, { w: 900 });
    // 진행 막대
    const by = top + 270, g = this.add.graphics(), bar = { k: 0 };
    this.tweens.add({ targets: bar, k: r.room / ROOMS, duration: 900, delay: 300, ease: 'Cubic.easeOut', onUpdate: () => g.clear().fillStyle(0x000000, 0.5).fillRoundedRect(140, by, W - 280, 30, 15).fillStyle(win ? 0xFFD45A : 0x6AD8FF, 1).fillRoundedRect(140, by, Math.max(30, (W - 280) * bar.k), 30, 15) });
    T(this, W / 2, by + 60, `방 ${r.room} / ${ROOMS} · Lv ${r.lvl} · 처치 ${r.kills}`, 26, C.sub, { w: 800 });
    // 보상
    const py = by + 220;
    this.add.existing(panel(this, W / 2, py + 60, 900, 340));
    this.add.image(W / 2 - 230, py - 50, 'i_gold').setDisplaySize(72, 72); T(this, W / 2 - 230, py + 10, `+${fmt(r.gold)}`, 40, C.gold, { w: 900 });
    this.add.image(W / 2 + 230, py - 50, 'i_gem').setDisplaySize(72, 72); T(this, W / 2 + 230, py + 10, `+${r.gems}`, 40, '#D8B0FF', { w: 900 });
    // 얻은 장비 · 두루마리 · 열쇠
    const got = r.got || { items: [], scroll: {}, keys: {} }, nsc = Object.values(got.scroll).reduce((x, y) => x + y, 0), extra = [];
    if (nsc) extra.push(['i_scroll', `+${nsc}`]); if (got.keys.silver) extra.push(['i_key_silver', `+${got.keys.silver}`]); if (got.keys.obs) extra.push(['i_key_obs', `+${got.keys.obs}`]);
    const cells = got.items.length + extra.length;
    got.items.slice(0, 6).forEach((it, i) => { const x = W / 2 + (i - (Math.min(cells, 8) - 1) / 2) * 120; itemBox(this, x, py + 120, it, 104); });
    extra.forEach(([ic, t], j) => { const x = W / 2 + (Math.min(got.items.length, 6) + j - (Math.min(cells, 8) - 1) / 2) * 120; this.add.image(x, py + 110, ic).setDisplaySize(84, 84); T(this, x, py + 170, t, 26, C.text, { w: 900, stroke: '#14102A', thick: 5 }); });
    if (r.unlocked) T(this, W / 2, py + 260, `${r.unlocked}장이 열렸어요!`, 36, C.gold, { w: 900 });
    // 고른 능력
    const ks = Object.keys(r.sk || {}).filter(k => SKILLS[k]);
    const sy = py + 330; T(this, W / 2, sy, '이번 판 능력', 28, C.text, { w: 900 });
    ks.slice(0, 16).forEach((k, i) => { const x = W / 2 + ((i % 8) - 3.5) * 104, y = sy + 90 + Math.floor(i / 8) * 104; const im = this.add.image(x, y, SKILLS[k].icon).setDisplaySize(92, 92); im.setScale(0); this.tweens.add({ targets: im, displayWidth: 92, displayHeight: 92, duration: 200, delay: 600 + i * 50 }); });
    const bt = Math.min(H - 140, sy + 340);
    btn(this, W / 2 + 90, bt, 560, 140, r.daily ? '다시 도전' : win && CHAPTERS[r.chapter] ? '다음 장' : '다시 모험', () => this.go('Play', r.daily ? { daily: true } : { chapter: win && CHAPTERS[r.chapter] ? r.chapter + 1 : r.chapter, hero: r.hero }), { style: 'gold', icon: 'i_play', size: 42 });
    iconBtn(this, W / 2 - 300, bt, 'i_home', () => this.go('Home', { tab: 'play', chapter: r.chapter }), 130);
    this.cameras.main.fadeIn(300, 10, 12, 30);
    window.__result = r;
  }
  go(k, data) { this.cameras.main.fadeOut(220, 10, 12, 30); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
