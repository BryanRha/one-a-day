// 서재 (Choices 식): 작품 표지 · 화 목록(진행·잠금) · 곧 공개 모드(냥카페 · 오늘의 코디) · 코인
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.21.0';
import { T, C, btn, iconBtn, panel, popup, toast } from '../ui.js?v=0.21.0';
import { audio } from '../audio.js?v=0.21.0';
import { load } from '../save.js?v=0.21.0';
import { SERIES, EPISODES } from '../episodes.js?v=0.21.0';

export class LibraryScene extends Phaser.Scene {
  constructor() { super('Library'); }
  create() {
    const d = load();
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    // 표지: 웹툰 2컷(도현) 크게 + 어둡게 + 제목
    const cov = this.add.image(W / 2, 0, 't1_2').setOrigin(0.5, 0); cov.setScale(W / cov.width * 1.25); cov.y = -60;
    const g = this.add.graphics(); for (let i = 0; i < 60; i++) g.fillStyle(0x2E1A2A, i / 60).fillRect(0, 380 + i * 10, W, 10); g.fillStyle(0x2E1A2A, 1).fillRect(0, 980, W, H);
    g.fillStyle(0x2E1A2A, 0.55).fillRect(0, 0, W, 150);
    T(this, 50, 76, `● ${d.coins}`, 34, C.gold, { ox: 0, w: 900, shadow: true });
    iconBtn(this, W - 76, 76, 'gear', () => this.settings(), 88, { dark: true });
    T(this, 60, 760, '로맨스 미스터리 · 시즌 1', 28, '#FFB6CB', { ox: 0, w: 800, shadow: true });
    T(this, 56, 840, TITLE, 104, '#FFFFFF', { ox: 0, w: 900, shadow: true });
    T(this, 62, 925, `${TITLE_EN} — 3주년 전날, 그가 거짓말을 시작했다`, 26, C.sub, { ox: 0, w: 700, shadow: true });
    // 화 목록
    let y = 1040; T(this, 60, y, '에피소드', 34, C.text, { ox: 0, w: 900 }); y += 70;
    for (let i = 0; i < Math.min(SERIES.total, 4); i++) {
      const ep = EPISODES[i], st = ep ? (d.ep[ep.id] || {}).step : null, open = !!ep, done = st === 'done';
      const card = this.add.container(W / 2, y + 70), bg = this.add.graphics();
      bg.fillStyle(open ? 0x4A2A44 : 0x3A2236, 1).fillRoundedRect(-480, -66, 960, 132, 24).lineStyle(3, done ? 0xF0B65A : open ? 0xE86A8E : 0x5A3A52, 1).strokeRoundedRect(-480, -66, 960, 132, 24);
      card.add(bg);
      if (open) { const th = this.add.image(-400, 0, ep.toon[2].img); th.setScale(140 / Math.min(th.width, th.height)); const mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRoundedRect(W / 2 - 466, y + 70 - 56, 132, 112, 18); th.setMask(mk.createGeometryMask()); card.add(th); }
      card.add(T(this, -300, -24, `${i + 1}화`, 26, open ? '#FFB6CB' : C.dim, { ox: 0, w: 900 }));
      card.add(T(this, -300, 20, open ? ep.title : '다음 주 공개', 34, open ? C.text : C.dim, { ox: 0, w: 900 }));
      card.add(T(this, 440, 0, done ? '다시 보기' : st && st !== 'intro' ? '이어 보기' : open ? '보기' : '🔒', 28, done ? C.gold : open ? '#FFB6CB' : C.dim, { ox: 1, w: 900 }));
      if (open) { card.setSize(960, 132).setInteractive({ useHandCursor: true }).on('pointerup', () => this.play(ep)); if (!st) this.tweens.add({ targets: card, scale: 1.02, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      y += 156;
    }
    // 곧 공개 모드
    y += 20; T(this, 60, y, '곧 만나요', 30, C.text, { ox: 0, w: 900 }); y += 40;
    [['냥카페', '찾은 별로 고양이 카페 꾸미기'], ['오늘의 코디', '모은 옷으로 서윤 스타일링']].forEach(([a, b], i) => {
      const x = W / 2 - 240 + i * 480; this.add.graphics().fillStyle(0x3A2236, 1).fillRoundedRect(x - 225, y, 450, 130, 22);
      T(this, x - 195, y + 42, a, 32, C.text, { ox: 0, w: 900 }); T(this, x - 195, y + 88, b, 22, C.dim, { ox: 0, w: 700 });
    });
    this.cameras.main.fadeIn(300, 30, 10, 26); window.__lib = this;
  }
  play(ep) { audio.play('sfx_page', { volume: 0.6 }); const st = (load().ep[ep.id] || {}).step; this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Story', { id: ep.id, part: st === 'mid' || st === 'evidence' ? 'mid' : st === 'after' || st === 'toon' ? 'after' : st === 'hunt' ? 'hunt' : 'intro' })); }
  settings() { const d = load(), p = popup(this, 700, 420); p.content.add(T(this, 0, -120, '설정', 44, C.ink, { w: 900 })); const b = btn(this, 0, 40, 420, 110, d.sfx ? '효과음 켜짐' : '효과음 꺼짐', () => { const on = audio.toggleSfx(); b.setLabel(on ? '효과음 켜짐' : '효과음 꺼짐'); }, { style: 'cream' }); p.content.add(b); }
}
