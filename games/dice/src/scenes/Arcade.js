// 아케이드: 보스 러시 · 랜덤 아레나 · 단일 룬 시련 · 심연 광산 (원작 아케이드 모드를 혼자 하는 버전으로)
import { W, H } from '../config.js?v=0.33.0';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.33.0';
import { audio } from '../audio.js?v=0.33.0';
import { load, save } from '../save.js?v=0.33.0';
import * as M from '../meta.js?v=0.33.0';
import { RUNES, RARITY, RARITY_NAME, RARITY_COLOR } from '../core/sim.js?v=0.33.0';
import { DESC } from './Deck.js?v=0.33.0';

const hex = n => '#' + n.toString(16).padStart(6, '0');
const LOOK = { rush: ['boss_serpent', 0xFF5A7A], arena: ['die_echo', 0xB59BFF], mono: ['die_flame', 0xFF8A3D], abyss: ['boss_statue', 0x5EE3FF] };

export class ArcadeScene extends Phaser.Scene {
  constructor() { super('Arcade'); }
  create() {
    const d = load();
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.6);
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '아케이드', 44, C.text, { w: 900 });
    T(this, W / 2, 160, '원정과 다른 규칙으로 즐기는 도전 · 수정과 명성을 받아요', 26, C.sub, { w: 800 });
    const keys = Object.keys(M.ARCADE), top = 250, ch = Math.min(400, (H - top - 40) / keys.length - 24);
    keys.forEach((k, i) => {
      const A = M.ARCADE[k], y = top + ch / 2 + i * (ch + 24), [img, col] = LOOK[k];
      this.add.existing(panel(this, W / 2, y, 980, Math.round(ch), { r: 34 }));
      const g = this.add.graphics(); g.fillStyle(col, 0.9).fillRoundedRect(W / 2 - 470, y - ch / 2 + 14, 8, ch - 28, 4);
      const glow = this.add.image(190, y, 'glow').setTint(col).setBlendMode('ADD').setScale(2.6).setAlpha(0.35);
      const im = this.add.image(190, y, img); im.setScale(Math.min(ch * 0.62, 220) / Math.max(im.width, im.height));
      if (k === 'mono' || k === 'arena') this.add.image(190, y, k === 'mono' ? 'rune_flame' : 'rune_echo').setDisplaySize(Math.min(ch * 0.36, 120), Math.min(ch * 0.36, 120));
      T(this, 330, y - ch / 2 + 50, A.en, 22, hex(col), { ox: 0, w: 900, ls: 5 });
      T(this, 330, y - ch / 2 + 98, A.name, 46, C.text, { ox: 0, w: 900 });
      T(this, 330, y + 6, A.desc, 24, C.sub, { ox: 0, w: 700, wrap: 420, align: 'left' });
      const best = d.arcade[k] || 0;
      T(this, 330, y + ch / 2 - 46, best ? `최고 ${A.unit} ${best}` : '아직 기록 없음', 28, best ? C.gold : C.dim, { ox: 0, w: 800 });
      const left = k === 'abyss' ? M.abyssLeft() : null;
      const b = btn(this, W - 170, y + 10, 230, 110, '도전', () => this.start(k), { style: k === 'rush' ? 'gold' : 'indigo', size: 38 });
      if (left != null) { T(this, W - 170, y + 90, `오늘 ${left}/${M.ABYSS_TRIES}번`, 24, left ? C.sub : C.pink, { w: 800 }); if (!left) b.setEnabled(false); }
    });
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(220, 5, 6, 26);
    window.__arcade = this;
  }
  start(k) {
    if (k === 'abyss') { if (!M.useAbyss()) return toast(this, '오늘은 모두 도전했어요 · 내일 다시', C.sub); return this.go('Play', { mode: k }); }
    if (k === 'rush') return this.go('Play', { mode: k });
    this.pick(k);
  }
  // 시작 룬 고르기 (셋 중 하나 · 아직 없는 룬도 나와요)
  pick(k) {
    const d = load(), opts = M.pickChoices(3);
    const p = popup(this, k === 'mono' ? '시련의 룬을 골라요' : '첫 룬을 골라요', 980, 900), c = p.content;
    c.add(T(this, 0, -290, k === 'mono' ? '이 룬 하나만으로 끝까지 버텨요' : '3웨이브마다 룬을 하나씩 더 골라요 (최대 5개)', 26, C.sub, { w: 800 }));
    opts.forEach((r, i) => {
      const x = (i - 1) * 300, y = 30, col = RARITY_COLOR[RARITY[r]];
      const g = this.add.graphics(); g.fillStyle(0x10153A, 0.95).fillRoundedRect(x - 135, y - 230, 270, 460, 26).lineStyle(4, col, 0.9).strokeRoundedRect(x - 135, y - 230, 270, 460, 26); c.add(g);
      c.add(this.add.image(x, y - 110, `die_${r}`).setDisplaySize(150, 150)); c.add(this.add.image(x, y - 110, `rune_${r}`).setDisplaySize(86, 86));
      c.add(T(this, x, y, RUNES[r].name, 38, C.text, { w: 900 }));
      c.add(T(this, x, y + 48, d.unlocked[r] ? `${RARITY_NAME[RARITY[r]]} · ★${d.tiers[r] || 1}` : `${RARITY_NAME[RARITY[r]]} · 미보유 체험`, 22, hex(col), { w: 800 }));
      c.add(T(this, x, y + 130, DESC[r], 22, C.sub, { w: 700, wrap: 240 }));
      const z = this.add.zone(x, y, 270, 460).setInteractive({ useHandCursor: true }); c.add(z);
      z.on('pointerup', () => { audio.play('sfx_summon', { volume: 0.6 }); p.close(); this.go('Play', { mode: k, rune: r }); });
    });
    c.add(btn(this, 0, 360, 300, 90, '다시 섞기 ◆10', () => { const dd = load(); if (dd.crystals < 10) return toast(this, '수정이 부족해요', C.sub); dd.crystals -= 10; save(); p.close(); this.time.delayedCall(160, () => this.pick(k)); }, { style: 'ghost', size: 28 }));
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
