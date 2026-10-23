// 서재 (Choices 식): 작품 표지 · 화 목록(진행·잠금) · 곧 공개 모드(냥카페 · 오늘의 코디) · 코인
import { W, H, TITLE, TITLE_EN, VERSION } from '../config.js?v=0.25.1';
import { T, C, btn, iconBtn, panel, popup, toast } from '../ui.js?v=0.25.1';
import { audio } from '../audio.js?v=0.25.1';
import { load } from '../save.js?v=0.25.1';
import { SERIES, EPISODES } from '../episodes.js?v=0.25.1';
import { loadEp } from './Boot.js?v=0.25.1';
import { medal, TIERS } from '../replay.js?v=0.25.1';
import { cafeData } from '../cafe/state.js?v=0.25.1';
import { coordData, todayTheme, doneToday } from '../coord/state.js?v=0.25.1';
import { buildLook } from '../coord/look.js?v=0.25.1';

export class LibraryScene extends Phaser.Scene {
  constructor() { super('Library'); }
  create(data) {
    // 새 버전이 배포됐으면 다시 불러옴 (열어 둔 채로 배포되면 옛 정답 데이터 + 새 그림이 섞여 정답이 안 맞음)
    fetch(`src/config.js?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.text()).then(t => { const m = t.match(/VERSION = '([^']+)'/); if (m && m[1] !== VERSION && this.scene.isActive()) location.reload(); }).catch(() => {});   // 게임 중에는 새로고침하지 않음 (서재에 있을 때만)
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
      if (done) { const ms = ['hunt', 'evidence'].map(k => medal(ep.id, k)); ms.forEach((m, k) => { if (m >= 0) card.add(this.add.circle(300 + k * 34, 36, 13, TIERS[m].c)); }); }
      card.add(T(this, 440, done ? -14 : 0, done ? '다시 보기' : st && st !== 'intro' ? '이어 보기' : open ? '보기' : '🔒', 28, done ? C.gold : open ? '#FFB6CB' : C.dim, { ox: 1, w: 900 }));
      if (open) { card.setSize(960, 132).setInteractive({ useHandCursor: true }).on('pointerup', p => { if (!this.dragged) this.play(ep); }); if (i === nextUp) this.tweens.add({ targets: card, scale: 1.02, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
      this.cards.push(card); y += 156;
    }
    // 곧 공개 모드
    // 나만의 공간: 냥카페 (+ 오늘의 코디 준비 중)
    y += 30; T(this, 60, y, '나만의 공간', 34, C.text, { ox: 0, w: 900 }); y += 50;
    const st = cafeData(), cafeC = this.add.container(W / 2, y + 140), cg = this.add.graphics();
    cg.fillStyle(0x4A2A44, 1).fillRoundedRect(-480, -140, 960, 280, 28).lineStyle(3, 0xF0B65A, 1).strokeRoundedRect(-480, -140, 960, 280, 28);
    cafeC.add([cg, this.add.image(-290, 0, this.cafeThumb())]);
    cafeC.add(T(this, -60, -70, '서윤의 냥카페', 40, C.text, { ox: 0, w: 900 }));
    cafeC.add(T(this, -60, -16, '별로 꾸미고, 고양이 손님을 맞이해요', 24, C.sub, { ox: 0, w: 700 }));
    cafeC.add(T(this, -60, 46, `★ ${st.stars}   ·   손님 ${Object.keys(st.cafe.met).length} / 24`, 28, C.gold, { ox: 0, w: 900 }));
    cafeC.add(T(this, 440, 100, '들어가기 ›', 26, '#FFB6CB', { ox: 1, w: 900 }));
    cafeC.setSize(960, 280).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.dragged) return; audio.play('sfx_page', { volume: 0.6 }); this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Cafe')); });
    y += 300;
    // 오늘의 코디 카드: 오늘 입은 서윤 + 오늘의 상황
    const cd = coordData(), th = todayTheme(), done = doneToday(), coC = this.add.container(W / 2, y + 150), og = this.add.graphics();
    og.fillStyle(0x4A2A44, 1).fillRoundedRect(-480, -150, 960, 300, 28).lineStyle(3, done ? 0xF0B65A : 0xE86A8E, 1).strokeRoundedRect(-480, -150, 960, 300, 28); coC.add(og);
    coC.add(T(this, -160, -82, '오늘의 코디', 40, C.text, { ox: 0, w: 900 }));
    coC.add(T(this, -160, -26, `오늘의 상황 · ${th.t}`, 26, '#FFB6CB', { ox: 0, w: 800 }));
    coC.add(T(this, -160, 26, `${th.by}: "${th.line}"`, 22, C.sub, { ox: 0, w: 700, wrap: 600, align: 'left' }));
    coC.add(T(this, 440, 112, done ? '오늘 완료 ✓' : '코디하러 가기 ›', 26, done ? C.gold : '#FFB6CB', { ox: 1, w: 900 }));
    if (!done) this.tweens.add({ targets: coC, scale: 1.015, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const w = cd.coord.wear, ids = [w.o, w.hair, w.bag, w.prop].filter(Boolean), put = () => { const lk = buildLook(this, w.o, w, 270); lk.setPosition(-330, 140); coC.add(lk); };
    const need = ids.filter(k => !this.textures.exists(k)); if (need.length) { need.forEach(k => this.load.image(k, `assets/coord/${k}.webp`)); this.load.once('complete', put); this.load.start(); } else put();
    coC.setSize(960, 300).setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.dragged) return; audio.play('sfx_page', { volume: 0.6 }); this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Coord')); });
    y += 330;
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
  // 냥카페 썸네일: 카페 방 그림 창가 쪽을 둥글게
  cafeThumb() {
    const key = 'th_cafe'; if (this.textures.exists(key)) return key; const src = this.textures.get('cafe_room').getSourceImage(), w = 340, h = 240, c = this.textures.createCanvas(key, w, h), g = c.getContext();
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, w, h, 22); else g.rect(0, 0, w, h); g.clip(); g.drawImage(src, 180, 180, 680, 480, 0, 0, w, h); c.refresh(); return key;
  }
  // 서재 썸네일: 웹툰 3컷을 132x112 둥근 사각형으로 잘라 텍스처로 한 번 만들어 둠
  thumb(ep) {
    const key = `th_${ep.id}`; if (this.textures.exists(key)) return key;
    const src = this.textures.get(ep.toon[2].img).getSourceImage(), w = 132, h = 112, c = this.textures.createCanvas(key, w, h), g = c.getContext();
    const k = Math.max(w / src.width, h / src.height), sw = w / k, sh = h / k;
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, w, h, 18); else g.rect(0, 0, w, h); g.clip();
    g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h); c.refresh(); return key;
  }
  // 다 본 화: 원하는 단계만 골라 다시 (숨은 물건 · 증거는 다시 하기 등급)
  replayMenu(ep) {
    const p = popup(this, 900, 1000), c = p.content, go = (key, data) => { p.close(); this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => loadEp(this, ep, () => this.scene.start(key, data))); };
    c.add(T(this, 0, -410, `${ep.no}화 · ${ep.title}`, 40, C.ink, { w: 900 }));
    c.add(T(this, 0, -355, '보고 싶은 단계를 골라요', 24, C.dim, { w: 800 }));
    [['이야기 처음부터', null, () => go('Story', { id: ep.id, part: 'intro' })], ['단서 찾기 · 다시 하기', 'hunt', () => go('Hunt', { id: ep.id })], ['증거 대조 · 다시 하기', 'evidence', () => go('Evidence', { id: ep.id })], ['웹툰 결말 다시 보기', null, () => go('Toon', { id: ep.id })]].forEach(([t, kind, fn], i) => {
      const y = -230 + i * 150, row = this.add.container(0, y), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-400, -60, 800, 120, 24).lineStyle(3, 0xF0D6DF, 1).strokeRoundedRect(-400, -60, 800, 120, 24); row.add(g);
      row.add(T(this, -360, 0, t, 32, C.ink, { ox: 0, w: 900 }));
      if (kind) { const m = medal(ep.id, kind), mg = this.add.graphics(); mg.fillStyle(m >= 0 ? TIERS[m].c : 0xE6DCE0, 1).fillCircle(320, 0, 40); row.add([mg, T(this, 320, 0, m >= 0 ? TIERS[m].n : '-', 20, '#3A2431', { w: 900 })]); }
      row.setSize(800, 120).setInteractive({ useHandCursor: true }).on('pointerup', () => { audio.play('sfx_click', { volume: 0.4 }); fn(); }); c.add(row);
    });
    c.add(T(this, 0, 380, '다시 하기 등급: 브론즈 → 실버(● 30 · ★ 1) → 골드(★ 2 · 코디 선물)', 22, '#C25A80', { w: 800, wrap: 800 }));
  }
  play(ep) { if ((load().ep[ep.id] || {}).step === 'done') { audio.play('sfx_page', { volume: 0.6 }); return this.replayMenu(ep); } audio.play('sfx_page', { volume: 0.6 }); const st = (load().ep[ep.id] || {}).step; this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => loadEp(this, ep, () => st === 'hunt' ? this.scene.start('Hunt', { id: ep.id }) : this.scene.start('Story', { id: ep.id, part: st === 'mid' || st === 'evidence' ? 'mid' : st === 'after' || st === 'toon' ? 'after' : st === 'hunt' ? 'hunt' : 'intro' }))); }
  settings() { this.modal = true; const d = load(), p = popup(this, 700, 420, { onClose: () => { this.modal = false; } }); p.content.add(T(this, 0, -120, '설정', 44, C.ink, { w: 900 })); const b = btn(this, 0, 40, 420, 110, d.sfx ? '효과음 켜짐' : '효과음 꺼짐', () => { const on = audio.toggleSfx(); b.setLabel(on ? '효과음 켜짐' : '효과음 꺼짐'); }, { style: 'cream' }); p.content.add(b); }
}
