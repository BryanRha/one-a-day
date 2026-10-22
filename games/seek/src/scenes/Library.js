// 서재 (Choices 식): 작품 표지 · 화 목록(진행·잠금) · 곧 공개 모드(냥카페 · 오늘의 코디) · 코인
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.22.2';
import { T, C, btn, iconBtn, panel, popup, toast } from '../ui.js?v=0.22.2';
import { audio } from '../audio.js?v=0.22.2';
import { load } from '../save.js?v=0.22.2';
import { SERIES, EPISODES } from '../episodes.js?v=0.22.2';
import { loadEp } from './Boot.js?v=0.22.2';

export class LibraryScene extends Phaser.Scene {
  constructor() { super('Library'); }
  create(data) {
    const d = load();
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    // 표지: 웹툰 2컷(도현) 크게 + 어둡게 + 제목
    const cov = this.add.image(W / 2, 0, 't1_2').setOrigin(0.5, 0); cov.setScale(W / cov.width * 1.25); cov.y = -60;
    const g = this.add.graphics(); for (let i = 0; i < 60; i++) g.fillStyle(0x2E1A2A, i / 60).fillRect(0, 380 + i * 10, W, 10); g.fillStyle(0x2E1A2A, 1).fillRect(0, 980, W, H);
    // 위 막대(코인 · 설정): 스크롤해도 화면 위에 고정 (tick 에서 카메라 위치를 따라감)
    const head = this.head = this.add.container(0, 0).setDepth(20), hbg = this.add.graphics(); hbg.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, 150).fillStyle(0xFF9DB6, 0.35).fillRect(0, 147, W, 3); hbg.setAlpha(0.55);
    head.add([hbg, T(this, 50, 76, `● ${d.coins}`, 34, C.gold, { ox: 0, w: 900, shadow: true }), iconBtn(this, W - 76, 76, 'gear', () => this.settings(), 88, { dark: true })]);
    this.cameras.main.setBackgroundColor(0x2E1A2A); this.modal = false;
    T(this, 60, 760, '로맨스 미스터리 · 시즌 1', 28, '#FFB6CB', { ox: 0, w: 800, shadow: true });
    T(this, 56, 840, TITLE, 104, '#FFFFFF', { ox: 0, w: 900, shadow: true });
    T(this, 62, 925, `${TITLE_EN} — 3주년 전날, 그가 거짓말을 시작했다`, 26, C.sub, { ox: 0, w: 700, shadow: true });
    // 화 목록 (10화 · 위아래로 끌어서 스크롤)
    let y = 1040; T(this, 60, y, `에피소드 · ${SERIES.total}화 완결`, 34, C.text, { ox: 0, w: 900 }); y += 70;
    const nextUp = EPISODES.findIndex(e => (d.ep[e.id] || {}).step !== 'done');
    this.cards = [];
    for (let i = 0; i < SERIES.total; i++) {
      const ep = EPISODES[i], st = ep ? (d.ep[ep.id] || {}).step : null, open = !!ep, done = st === 'done';
      const card = this.add.container(W / 2, y + 70), bg = this.add.graphics();
      bg.fillStyle(open ? 0x4A2A44 : 0x3A2236, 1).fillRoundedRect(-480, -66, 960, 132, 24).lineStyle(3, done ? 0xF0B65A : open ? 0xE86A8E : 0x5A3A52, 1).strokeRoundedRect(-480, -66, 960, 132, 24);
      card.add(bg);
      if (open) card.add(this.add.image(-400, 0, this.thumb(ep)));   // 마스크 없이 미리 둥글게 잘라 둔 그림 (스크롤해도 안 깨짐)
      card.add(T(this, -300, -24, `${i + 1}화${open ? ' · ' + ep.teaser : ''}`, 24, open ? '#FFB6CB' : C.dim, { ox: 0, w: 700 }));
      card.add(T(this, -300, 22, open ? ep.title : '다음 주 공개', 36, open ? C.text : C.dim, { ox: 0, w: 900 }));
      card.add(T(this, 440, 0, done ? '다시 보기' : st && st !== 'intro' ? '이어 보기' : open ? '보기' : '🔒', 28, done ? C.gold : open ? '#FFB6CB' : C.dim, { ox: 1, w: 900 }));
      if (open) { card.setSize(960, 132).setInteractive({ useHandCursor: true }).on('pointerup', p => { if (!this.dragged) this.play(ep); }); if (i === nextUp) this.tweens.add({ targets: card, scale: 1.02, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      this.cards.push(card); y += 156;
    }
    // 곧 공개 모드
    y += 20; T(this, 60, y, '곧 만나요', 30, C.text, { ox: 0, w: 900 }); y += 40;
    [['냥카페', '찾은 별로 고양이 카페 꾸미기'], ['오늘의 코디', '모은 옷으로 서윤 스타일링']].forEach(([a, b], i) => {
      const x = W / 2 - 240 + i * 480; this.add.graphics().fillStyle(0x3A2236, 1).fillRoundedRect(x - 225, y, 450, 130, 22);
      T(this, x - 195, y + 42, a, 32, C.text, { ox: 0, w: 900 }); T(this, x - 195, y + 88, b, 22, C.dim, { ox: 0, w: 700 });
    });
    y += 190;
    // 스크롤: 카메라를 위아래로 · 끌었으면 카드 탭 무시 · 마스크(썸네일)는 카메라와 함께 움직이도록 따로 옮김
    const cam = this.cameras.main; cam.setBounds(0, 0, W, Math.max(H, y)); this.dragged = false;
    this.input.on('pointerdown', p => { this.dragY = p.y; this.dragS = cam.scrollY; this.dragged = false; this.vel = 0; });
    this.input.on('pointermove', p => { if (!p.isDown || this.dragY == null || this.modal) return; const dy = p.y - this.dragY; if (Math.abs(dy) > 14) this.dragged = true; if (this.dragged) { const ns = Phaser.Math.Clamp(this.dragS - dy, 0, Math.max(0, y - H)); this.vel = ns - cam.scrollY; cam.scrollY = ns; } });
    this.input.on('pointerup', () => { this.dragY = null; }); this.input.on('pointerupoutside', () => { this.dragY = null; });
    const tick = () => { if (this.dragY == null && Math.abs(this.vel) > 0.5) { this.vel *= 0.92; cam.scrollY = Phaser.Math.Clamp(cam.scrollY + this.vel, 0, Math.max(0, y - H)); } head.y = cam.scrollY; hbg.setAlpha(Math.min(1, 0.55 + cam.scrollY / 400)); };
    this.events.on('update', tick); this.events.once('shutdown', () => this.events.off('update', tick));
    // 이어 볼 화가 화면 아래에 있으면 거기까지 내려 줌
    if (nextUp > 2) cam.scrollY = Phaser.Math.Clamp(1110 + nextUp * 156 - H * 0.55, 0, Math.max(0, y - H));
    this.input.on('wheel', (p, o, dx, dy) => { if (this.modal) return; cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, 0, Math.max(0, y - H)); });
    this.cameras.main.fadeIn(300, 30, 10, 26); window.__lib = this;
    const auto = data && data.auto && EPISODES.find(e => e.id === data.auto); if (auto) this.time.delayedCall(350, () => this.play(auto));
  }
  // 서재 썸네일: 웹툰 3컷을 132x112 둥근 사각형으로 잘라 텍스처로 한 번 만들어 둠
  thumb(ep) {
    const key = `th_${ep.id}`; if (this.textures.exists(key)) return key;
    const src = this.textures.get(ep.toon[2].img).getSourceImage(), w = 132, h = 112, c = this.textures.createCanvas(key, w, h), g = c.getContext();
    const k = Math.max(w / src.width, h / src.height), sw = w / k, sh = h / k;
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, w, h, 18); else g.rect(0, 0, w, h); g.clip();
    g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h); c.refresh(); return key;
  }
  play(ep) { audio.play('sfx_page', { volume: 0.6 }); const st = (load().ep[ep.id] || {}).step; this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => loadEp(this, ep, () => this.scene.start('Story', { id: ep.id, part: st === 'mid' || st === 'evidence' ? 'mid' : st === 'after' || st === 'toon' ? 'after' : st === 'hunt' ? 'hunt' : 'intro' }))); }
  settings() { this.modal = true; const d = load(), p = popup(this, 700, 420, { onClose: () => { this.modal = false; } }); p.content.add(T(this, 0, -120, '설정', 44, C.ink, { w: 900 })); const b = btn(this, 0, 40, 420, 110, d.sfx ? '효과음 켜짐' : '효과음 꺼짐', () => { const on = audio.toggleSfx(); b.setLabel(on ? '효과음 켜짐' : '효과음 꺼짐'); }, { style: 'cream' }); p.content.add(b); }
}
