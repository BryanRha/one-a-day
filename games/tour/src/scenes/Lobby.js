// 로비: 로고 · 캐릭터 고르기 · 난이도 · 랭크 · 기록 · 시작
import { W, H, TITLE_EN } from '../config.js?v=0.36.0';
import { T, C, btn, popup } from '../ui.js?v=0.36.0';
import { audio } from '../audio.js?v=0.36.0';
import { load, save } from '../save.js?v=0.36.0';
import { CHARS } from '../data.js?v=0.36.0';

export const TIERS = [[0, '브론즈', 0xC98A5A], [100, '실버', 0xA8B4C4], [250, '골드', 0xF0B65A], [450, '플래티넘', 0x6FD6C8], [700, '다이아', 0x8FA8FF]];
export const tierOf = r => { let t = TIERS[0]; for (const x of TIERS) if (r >= x[0]) t = x; return t; };
export const DIFF = [['쉬움', ['saver', 'gambler', 'saver']], ['보통', ['attack', 'saver', 'landmark']], ['어려움', ['attack', 'landmark', 'gambler']]];
export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create() {
    const d = this.d = load(); audio.music('bgm_lobby');
    const bg = this.add.image(W / 2, H / 2, 'lobby'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    // 로고
    const ly = H * 0.13; T(this, W / 2, ly, 'K-다이스 투어', 108, '#FFFFFF', { w: 900, shadow: true }).setStroke('#2E5FB8', 18);
    T(this, W / 2, ly + 92, TITLE_EN + ' · 주사위로 떠나는 팔도 여행', 30, '#2E5FB8', { w: 900 }).setStroke('#FFFFFF', 8);
    const di = this.add.image(W / 2 + 330, ly - 60, 'dice'); di.setScale(120 / di.height); this.tweens.add({ targets: di, angle: 360, duration: 6000, repeat: -1 });
    // 랭크 카드
    const tr = tierOf(d.rank), cy = H * 0.27, g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.93).fillRoundedRect(60, cy - 70, W - 120, 140, 34);
    g.fillStyle(tr[2], 1).fillCircle(140, cy, 48); T(this, 140, cy, '★', 48, '#FFFFFF', { w: 900 });
    T(this, 210, cy - 26, `${tr[1]} · ${d.rank}점`, 36, C.ink, { ox: 0, w: 900 }); T(this, 210, cy + 26, `${d.games}판 ${d.wins}승 · 이기면 +30점`, 24, C.dim, { ox: 0, w: 800 });
    const next = TIERS.find(x => x[0] > d.rank); if (next) { g.fillStyle(0xE8EEF6, 1).fillRoundedRect(650, cy - 10, 300, 20, 10).fillStyle(tr[2], 1).fillRoundedRect(650, cy - 10, Math.max(20, 300 * (d.rank - tr[0]) / (next[0] - tr[0])), 20, 10); T(this, 800, cy + 34, `${next[1]}까지 ${next[0] - d.rank}점`, 20, C.dim, { w: 800 }); }
    // 캐릭터 고르기
    const ky = H * 0.37; T(this, W / 2, ky, '함께 떠날 여행자', 34, '#FFFFFF', { w: 900, shadow: true });
    this.cards = []; CHARS.forEach((c, i) => { const x = 110 + (i % 3) * 430 - (i % 3) * 0, xx = W / 2 + (i % 3 - 1) * 320, yy = ky + 230 + Math.floor(i / 3) * 400, ct = this.add.container(xx, yy), cg = this.add.graphics(); ct.add(cg);
      const im = this.add.image(0, -20, c.img); im.setScale(250 / im.height); ct.add(im); ct.add(T(this, 0, 128, c.n, 32, C.ink, { w: 900 })); ct.add(T(this, 0, 166, c.perkN, 20, C.blue, { w: 800, wrap: 280 }));
      ct.setSize(290, 380).setInteractive({ useHandCursor: true }).on('pointerup', () => { d.char = c.id; save(); audio.play('sfx_tap', { volume: 0.6 }); this.drawCards(); this.tweens.add({ targets: im, y: -40, duration: 120, yoyo: true }); });
      this.cards.push({ cg, c, ct }); });
    this.drawCards();
    // 난이도 · 시작
    const by = Math.min(H - 150, ky + 1060);
    T(this, W / 2, by - 150, '상대 AI', 26, '#FFFFFF', { w: 900, shadow: true });
    this.dB = DIFF.map(([n], k) => btn(this, W / 2 + (k - 1) * 300, by - 80, 270, 86, n, () => { d.diff = k; save(); this.dB.forEach((b, j) => b.list[0].setTint(j === k ? 0xFFFFFF : 0xBBBBBB)); }, { style: 'cream', size: 30 }));
    this.dB.forEach((b, j) => b.list[0].setTint(j === d.diff ? 0xFFFFFF : 0xBBBBBB));
    const go = btn(this, W / 2, by + 50, 620, 140, '여행 시작!', () => this.scene.start('Game'), { size: 48, style: 'gold' }); this.tweens.add({ targets: go, scale: 1.05, duration: 700, yoyo: true, repeat: -1 });
    this.cameras.main.fadeIn(250, 191, 230, 245); window.__lobby = this;
    if (!d.tut) { d.tut = 1; save(); this.time.delayedCall(500, () => this.howTo()); }
  }
  drawCards() { this.cards.forEach(({ cg, c }) => { const on = this.d.char === c.id; cg.clear().fillStyle(on ? 0xFFF4D6 : 0xFFFFFF, 0.95).fillRoundedRect(-145, -190, 290, 380, 30).lineStyle(on ? 8 : 3, on ? 0xF0B65A : 0xD8E4F0, 1).strokeRoundedRect(-145, -190, 290, 380, 30); }); }
  howTo() {
    const p = popup(this, 940, 1180); p.content.add(T(this, 0, -520, '이렇게 놀아요', 48, C.ink, { w: 900 }));
    ['🎲 주사위를 굴려 판을 돌아요', '🏠 빈 땅은 사고, 내 땅엔 빌라 · 빌딩 · 호텔을 지어요', '👑 호텔까지 지은 땅에 다시 오면 랜드마크!', '💸 남의 땅에 서면 통행료 · 내고 나서 인수도 가능', '🏆 상대를 모두 파산시키거나, 한 줄 · 색 3개 · 관광지 4곳을 독점하면 승리', '⏰ 20바퀴가 지나면 자산 1위가 우승'].forEach((s, i) => p.content.add(T(this, -400, -400 + i * 130, s, 30, C.ink, { ox: 0, w: 800, wrap: 800, align: 'left' })));
    p.content.add(btn(this, 0, 480, 360, 100, '알겠어요', () => p.close(), { size: 34 }));
  }
}
