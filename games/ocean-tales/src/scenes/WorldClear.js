// 월드 클리어 연출: 월드마다 다른 바다 생물 쇼 + 바다 친구 행진 + 새 바다 발견.
//  1 고래 떼 유영 · 2 바다거북 대이동 · 3 해파리 빛 축제 · 4 흰동가리 소용돌이 · 5 보물상자 폭발
//  6 복어 풍선과 눈꽃 · 7 진주 비 · 8 문어 먹물 불꽃놀이 · 9 불가사리 별자리 · 10 모든 친구 그랜드 피날레
// 보스(10번째) 레벨을 처음 깼을 때 Game → WorldClear → Map(새 월드로 카메라 이동) 순서로 나온다.
import { W, H, TXT, MAP_THEME, WORLD_COUNT, themeOf } from '../config.js?v=0.18.0';
import { t } from '../i18n.js?v=0.18.0';
import { enableGlow } from '../ui/widgets.js?v=0.18.0';
import { audio } from '../audio.js?v=0.18.0';
import { addCoins } from '../save.js?v=0.18.0';
import { asset } from '../config.js?v=0.18.0';

const BONUS = 100;
const hex = c => Phaser.Display.Color.HexStringToColor(c).color;

export class WorldClearScene extends Phaser.Scene {
  constructor() { super('WorldClear'); }

  init({ world = 1 } = {}) { this.next = Math.min(WORLD_COUNT, world + 1); }
  // 새 월드의 게임 배경을 깔아 '새 바다에 도착한' 느낌 (다른 월드 배경은 메모리에서 내림)
  preload() {
    const key = `bg_game_${themeOf(this.next)}`;
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('bg_game_') && k !== key) this.textures.remove(k);
    if (!this.textures.exists(key)) this.load.image(key, asset(`assets/img/${key}.png`));
  }

  create({ world = 1 } = {}) {
    enableGlow(this);
    const last = world >= WORLD_COUNT;
    const next = Math.min(WORLD_COUNT, world + 1);
    const [top, bottom] = MAP_THEME[(next - 1) % MAP_THEME.length];
    addCoins(BONUS);
    audio.music('bgm_title', this);

    // ── 바다 배경 (새 월드 그림) + 흔들리는 빛줄기
    this.add.graphics().fillGradientStyle(hex(top), hex(top), hex(bottom), hex(bottom), 1).fillRect(0, 0, W, H);
    const bg = this.add.image(W / 2, H / 2, `bg_game_${themeOf(next)}`);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    for (let i = 0; i < 6; i++) {
      const ray = this.add.rectangle(120 + i * 180, -100, 120, H * 1.6, 0xffffff, 0.07).setOrigin(0.5, 0).setAngle(-12 + i * 2);
      this.tweens.add({ targets: ray, angle: ray.angle + 6, alpha: 0.03, yoyo: true, repeat: -1, duration: 2200 + i * 300, ease: 'Sine.InOut' });
    }
    // 끊임없이 올라오는 물방울
    this.time.addEvent({ delay: 110, loop: true, callback: () => {
      const b = this.add.image(Phaser.Math.Between(20, W - 20), H + 30, 'ptc_bubble').setScale(0.2 + Math.random() * 0.45).setAlpha(0.8).setDepth(1);
      this.tweens.add({ targets: b, y: -40, x: b.x + Phaser.Math.Between(-60, 60), duration: 2600 + Math.random() * 2000, onComplete: () => b.destroy() });
    } });

    // ── 월드마다 다른 주인공 연출 (끝낸 월드 번호 기준)
    this.show(world);

    // ── 몽이 등장 (아래에서 헤엄쳐 올라와 가운데에서 신나게)
    const m = this.add.image(W / 2, H + 400, 'mascot_happy').setScale(0.5).setDepth(8);
    this.tweens.add({ targets: m, y: H * 0.66, duration: 1100, delay: 600, ease: 'Back.Out',
      onComplete: () => this.tweens.add({ targets: m, y: m.y - 30, angle: { from: -5, to: 5 }, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' }) });

    // ── 바다 친구 행진: 아래쪽을 따라 들어와 자리를 잡고 통통 뜀
    const crew = ['tile_red', 'tile_orange', 'tile_yellow', 'tile_green', 'tile_purple', 'item_collect_star'];
    crew.forEach((key, i) => {
      const x = W * (0.12 + i * 0.152), y = H - 230;
      const c = this.add.image(-150 - i * 140, y, key).setScale(1.05).setDepth(9);
      this.tweens.add({ targets: c, x, duration: 1500, delay: 900 + i * 120, ease: 'Cubic.Out',
        onComplete: () => this.tweens.add({ targets: c, y: y - 50, scaleY: 1.12, yoyo: true, repeat: -1, duration: 300 + (i % 2) * 80, ease: 'Quad.Out' }) });
    });

    // ── 배너: World Clear! → 새 바다 이름 → 보너스 코인
    this.time.delayedCall(1300, () => {
      audio.play('sfx_world_clear'); audio.buzz([60, 40, 120]);
      this.cameras.main.flash(300, 255, 255, 255);
      const rays = this.add.image(W / 2, H * 0.13, 'ptc_rays').setScale(2.6).setAlpha(0.5).setTint(0xFFF1A8).setDepth(10);
      this.tweens.add({ targets: rays, angle: 360, duration: 8000, repeat: -1 });
      const ban = this.add.image(W / 2, H * 0.13, 'txt_world_clear').setScale(0).setDepth(11);
      this.tweens.add({ targets: ban, scale: 0.62, duration: 450, ease: 'Back.Out' });
      this.confetti();
    });
    this.time.delayedCall(2100, () => {
      const sub = this.add.text(W / 2, H * 0.26, last ? t('allSeas') : `${t('worldNew')}\n${next}. ${t('worldName')[next - 1]}`,
        { ...TXT.big, fontSize: '66px', align: 'center', stroke: '#0B3E8A', strokeThickness: 14, lineSpacing: 12 }).setOrigin(0.5).setDepth(11).setScale(0);
      this.tweens.add({ targets: sub, scale: 1, duration: 400, ease: 'Back.Out' });
      audio.play('sfx_star_slam');
    });
    this.time.delayedCall(2800, () => {
      const coin = this.add.image(W / 2 - 110, H * 0.37, 'ico_coin').setScale(0).setDepth(11);
      const txt = this.add.text(W / 2 - 50, H * 0.37, '+0', { ...TXT.big, stroke: '#7A3F00' }).setOrigin(0, 0.5).setDepth(11);
      this.add.text(W / 2, H * 0.37 + 70, t('worldBonus'), { ...TXT.small, fontSize: '30px' }).setOrigin(0.5).setDepth(11);
      this.tweens.add({ targets: coin, scale: 0.55, duration: 300, ease: 'Back.Out' });
      this.tweens.addCounter({ from: 0, to: BONUS, duration: 700, onUpdate: tw => txt.setText(`+${Math.round(tw.getValue())}`), onComplete: () => audio.play('sfx_coin') });
    });

    // ── 터치하면 지도로 (새 월드까지 카메라가 이동)
    this.time.delayedCall(3600, () => {
      const tap = this.add.text(W / 2, H - 80, t('tapContinue'), { ...TXT.mid, fontSize: '40px' }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: tap, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
      this.input.once('pointerup', () => {
        audio.play('sfx_click');
        this.cameras.main.fadeOut(300, 189, 235, 255);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', last ? { celebrate: true } : { arrive: next }));
      });
    });
    this.cameras.main.fadeIn(400, 255, 255, 255);
  }

  // ═══ 월드별 쇼 (깊이 2~7: 몽이(8)·행진(9)·글자(11) 뒤) ═══════════════
  show(world) {
    const shows = [null, this.whales, this.turtles, this.jellies, this.clownSwirl, this.treasure, this.puffers, this.pearlRain, this.inkFireworks, this.starfish, this.finale];
    (world >= WORLD_COUNT ? this.finale : shows[themeOf(world)] || this.whales).call(this);
  }

  burst(x, y, key, n, { tints = null, dist = 260, scale = 0.5, depth = 6, dur = 900 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, d = dist * (0.7 + Math.random() * 0.5);
      const p = this.add.image(x, y, key).setScale(scale * (0.7 + Math.random() * 0.6)).setDepth(depth).setAngle(Math.random() * 360);
      if (tints) p.setTint(tints[i % tints.length]);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 60, alpha: 0, angle: p.angle + 200, duration: dur, ease: 'Cubic.Out', onComplete: () => p.destroy() });
    }
  }

  // 1. 고래 떼: 크기·깊이가 다른 아기 고래 9마리가 물을 뿜으며 유영
  whales() {
    audio.play('sfx_whale', { volume: 0.9 });
    for (let i = 0; i < 9; i++) {
      const s = 1.3 + (i % 3) * 0.6 + Math.random() * 0.3;
      const y = H * (0.47 + (i % 5) * 0.065) + Math.random() * 40;
      const wh = this.add.image(W + 200 + i * 170, y, 'tile_blue').setScale(s).setDepth(2 + s).setAlpha(0.75 + s * 0.15);
      this.tweens.add({ targets: wh, x: -260, duration: 6200 - s * 900, delay: i * 120, ease: 'Linear' });
      this.tweens.add({ targets: wh, y: y - 30, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 700 + i * 60, ease: 'Sine.InOut' });
      this.time.addEvent({ delay: 900 + i * 110, repeat: 4, callback: () => {
        for (let k = 0; k < 3; k++) {
          const d = this.add.image(wh.x - 10 * s, wh.y - 60 * s, 'ptc_drop').setScale(0.25 * s).setDepth(wh.depth);
          this.tweens.add({ targets: d, y: d.y - 90 * s - k * 20, x: d.x + (k - 1) * 30 * s, alpha: 0, duration: 520, onComplete: () => d.destroy() });
        }
      } });
    }
  }

  // 2. 바다거북 대이동: 왼쪽 아래에서 오른쪽 위로 비스듬히 헤엄치며 해초 조각을 남김
  turtles() {
    audio.play('sfx_whale', { volume: 0.6, rate: 1.3 });
    for (let i = 0; i < 8; i++) {
      const s = 1.2 + (i % 3) * 0.5;
      const sx = -200 - (i % 4) * 120, sy = H * (0.95 - (i % 4) * 0.06) + Math.floor(i / 4) * 140;
      const tu = this.add.image(sx, sy, 'tile_green').setScale(s).setDepth(2 + s).setAngle(-25);
      this.tweens.add({ targets: tu, x: W + 250, y: sy - H * 0.5, duration: 5200 - s * 500, delay: i * 260, ease: 'Sine.InOut',
        onUpdate: () => { if (Math.random() < 0.12) { const h = this.add.image(tu.x - 40 * s, tu.y + 30 * s, 'ptc_hex').setScale(0.25).setDepth(tu.depth - 0.1); this.tweens.add({ targets: h, alpha: 0, y: h.y + 60, angle: 180, duration: 800, onComplete: () => h.destroy() }); } } });
      this.tweens.add({ targets: tu, angle: -15, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
    }
  }

  // 3. 해파리 빛 축제: 화면이 살짝 어두워지고 빛나는 해파리가 둥실둥실 올라감
  jellies() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B1E5A, 0.35).setDepth(1.5);
    const tints = [0xFF9AD8, 0x9AE6FF, 0xFFE14D, 0xC9A0FF, 0x9AFFD0];
    for (let i = 0; i < 14; i++) {
      const x = 80 + (i * 137) % (W - 160), s = 0.7 + (i % 3) * 0.35;
      const glow = this.add.image(x, H + 200, 'ptc_glow').setScale(s * 1.6).setTint(tints[i % 5]).setAlpha(0.55).setDepth(2);
      const j = this.add.image(x, H + 200, 'map_deco_jellyfish').setScale(s).setTint(tints[i % 5]).setDepth(3);
      const dur = 5000 + (i % 4) * 700;
      this.tweens.add({ targets: [j, glow], y: H * 0.3 - (i % 3) * 120, duration: dur, delay: i * 180, ease: 'Sine.Out' });
      this.tweens.add({ targets: j, scaleY: s * 0.82, yoyo: true, repeat: -1, duration: 420, delay: i * 50 });
      this.tweens.add({ targets: glow, alpha: 0.25, yoyo: true, repeat: -1, duration: 600 + i * 40 });
    }
  }

  // 4. 흰동가리 소용돌이: 24마리가 몽이 주위를 빙글빙글 돌다가 한꺼번에 퍼짐
  clownSwirl() {
    const cx = W / 2, cy = H * 0.62;
    const fish = Array.from({ length: 24 }, (_, i) => this.add.image(cx, cy, 'tile_orange').setScale(0.7 + (i % 3) * 0.2).setDepth(i % 2 ? 7 : 3).setAlpha(0));
    this.tweens.addCounter({ from: 0, to: 1, duration: 3600, delay: 300, ease: 'Sine.InOut',
      onUpdate: tw => {
        const v = tw.getValue();
        fish.forEach((f, i) => {
          const a = (i / fish.length) * Math.PI * 2 + v * Math.PI * 5;
          const r = 140 + (i % 3) * 90 + Math.sin(v * Math.PI) * 120;
          f.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55).setAlpha(Math.min(1, v * 5)).setFlipX(Math.sin(a) > 0);
        });
      },
      onComplete: () => {
        audio.play('sfx_line');
        fish.forEach((f, i) => { const a = (i / fish.length) * Math.PI * 2; this.tweens.add({ targets: f, x: cx + Math.cos(a) * 900, y: cy + Math.sin(a) * 700, duration: 900, ease: 'Cubic.In', onComplete: () => f.destroy() }); });
      } });
  }

  // 5. 보물상자 폭발: 상자가 들썩이다 펑! 코인과 진주가 분수처럼
  treasure() {
    const cx = W / 2, cy = H * 0.8;
    const chest = this.add.image(cx, cy, 'map_deco_chest').setScale(1.3).setDepth(7);
    this.tweens.add({ targets: chest, angle: { from: -6, to: 6 }, yoyo: true, repeat: 5, duration: 90, delay: 600,
      onComplete: () => {
        audio.play('sfx_bomb'); this.cameras.main.shake(250, 0.01);
        this.tweens.add({ targets: chest, scale: 1.5, yoyo: true, duration: 120 });
        for (let i = 0; i < 40; i++) {
          const key = i % 4 === 0 ? 'tile_rainbow' : 'ico_coin';
          const p = this.add.image(cx, cy - 60, key).setScale(key === 'ico_coin' ? 0.35 : 0.5).setDepth(6);
          const vx = (Math.random() - 0.5) * 900, top = cy - 500 - Math.random() * 500;
          this.tweens.add({ targets: p, x: cx + vx, duration: 1400, ease: 'Linear' });
          this.tweens.add({ targets: p, y: top, duration: 650, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: p, y: H + 80, angle: 360, duration: 900, ease: 'Quad.In', onComplete: () => p.destroy() }) });
          if (i % 6 === 0) this.time.delayedCall(700 + i * 20, () => audio.play('sfx_coin', { volume: 0.4 }));
        }
      } });
  }

  // 6. 복어 풍선과 눈꽃: 복어들이 부풀어 풍선처럼 떠오르고 얼음 조각이 눈처럼 내림
  puffers() {
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * ((W - 180) / 8);
      const p = this.add.image(x, H + 120, 'tile_yellow').setScale(0.6).setDepth(3 + (i % 3));
      this.tweens.add({ targets: p, y: H * (0.47 + (i % 3) * 0.1), scale: 1.2 + (i % 3) * 0.35, duration: 2600, delay: i * 160, ease: 'Back.Out' });
      this.tweens.add({ targets: p, x: x + 30, yoyo: true, repeat: -1, duration: 900 + i * 50, ease: 'Sine.InOut' });
    }
    this.time.addEvent({ delay: 70, repeat: 70, callback: () => {
      const sh = this.add.image(Phaser.Math.Between(0, W), -30, 'ptc_shard').setScale(0.15 + Math.random() * 0.2).setTint(0xDFF6FF).setDepth(2).setAngle(Math.random() * 360);
      this.tweens.add({ targets: sh, y: H + 40, x: sh.x + Phaser.Math.Between(-80, 80), angle: sh.angle + 360, duration: 3000 + Math.random() * 1500, onComplete: () => sh.destroy() });
    } });
  }

  // 7. 진주 비: 무지갯빛 진주가 쏟아지고 바닥에서 통통 튀며 반짝
  pearlRain() {
    audio.play('sfx_rainbow');
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(60, W - 60), floor = H * (0.78 + Math.random() * 0.1);
      const p = this.add.image(x, -100 - Math.random() * 600, 'tile_rainbow').setScale(0.45 + Math.random() * 0.4).setDepth(3 + (i % 4));
      this.tweens.add({ targets: p, y: floor, duration: 1200 + Math.random() * 600, delay: i * 90, ease: 'Bounce.Out',
        onComplete: () => { this.burst(p.x, p.y, 'ptc_spark', 5, { dist: 80, scale: 0.3, tints: [0xFFFFFF, 0xFFE6FF] }); this.tweens.add({ targets: p, alpha: 0, delay: 1800, duration: 500 }); } });
    }
  }

  // 8. 문어 먹물 불꽃놀이: 문어가 솟구쳐 알록달록 먹물 불꽃으로 터짐
  inkFireworks() {
    const cols = [0xFF5C8F, 0xFFE14D, 0x7FD8FF, 0x9AFF8A, 0xC9A0FF, 0xFF9A4A];
    for (let i = 0; i < 6; i++) {
      const x = 140 + i * ((W - 280) / 5), topY = H * (0.42 + (i % 2) * 0.12);
      const o = this.add.image(x, H + 120, 'tile_purple').setScale(0.9).setDepth(4);
      this.tweens.add({ targets: o, y: topY, duration: 700, delay: 300 + i * 380, ease: 'Quad.Out',
        onComplete: () => {
          audio.play('sfx_bomb', { volume: 0.5, rate: 1.2 + i * 0.05 });
          this.burst(o.x, o.y, 'ptc_ink', 16, { tints: [cols[i], cols[(i + 2) % 6]], dist: 240, scale: 0.45 });
          this.burst(o.x, o.y, 'ptc_spark', 10, { tints: [0xFFFFFF], dist: 160, scale: 0.35 });
          this.tweens.add({ targets: o, scale: 1.3, alpha: 0, duration: 250, onComplete: () => o.destroy() });
        } });
    }
  }

  // 9. 불가사리 별자리: 불가사리들이 모여 커다란 별을 그리고 반짝
  starfish() {
    const cx = W / 2, cy = H * 0.6, pts = [];
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 150 : 360, a = -Math.PI / 2 + i * Math.PI / 5; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    const pos = [];
    for (let i = 0; i < 10; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 10]; for (let k = 0; k < 2; k++) pos.push([x1 + (x2 - x1) * k / 2, y1 + (y2 - y1) * k / 2]); }
    pos.forEach(([x, y], i) => {
      const s = this.add.image(Phaser.Math.Between(0, W), H + 100, 'item_collect_star').setScale(0.55).setDepth(3);
      this.tweens.add({ targets: s, x, y, angle: 360, duration: 1100, delay: 200 + i * 70, ease: 'Cubic.Out',
        onComplete: () => { this.tweens.add({ targets: s, scale: 0.7, yoyo: true, repeat: -1, duration: 400, delay: (i % 5) * 80 }); } });
    });
    this.time.delayedCall(1900, () => { audio.play('sfx_star_3'); this.burst(cx, cy, 'ptc_star', 20, { tints: [0xFFE14D, 0xFFFFFF], dist: 420, scale: 0.4 }); });
    for (let i = 0; i < 4; i++) {
      const hs = this.add.image(-100, H * (0.42 + i * 0.1), 'item_drop_b').setScale(0.6).setDepth(2);
      this.tweens.add({ targets: hs, x: W + 120, duration: 5000, delay: i * 400 });
      this.tweens.add({ targets: hs, y: hs.y - 40, yoyo: true, repeat: -1, duration: 500 });
    }
  }

  // 10. 그랜드 피날레: 모든 친구가 두 겹 고리로 돌고, 고래 떼와 불꽃놀이
  finale() {
    this.whales();
    const keys = ['tile_red', 'tile_orange', 'tile_yellow', 'tile_green', 'tile_blue', 'tile_purple', 'item_collect_star', 'item_drop_b'];
    const cx = W / 2, cy = H * 0.62;
    const ring = Array.from({ length: 16 }, (_, i) => this.add.image(cx, cy, keys[i % keys.length]).setScale(0.75).setDepth(i % 2 ? 7 : 3));
    this.tweens.addCounter({ from: 0, to: 1, duration: 6000, repeat: -1,
      onUpdate: tw => ring.forEach((f, i) => { const a = (i / 16) * Math.PI * 2 + tw.getValue() * Math.PI * 2 * (i % 2 ? 1 : -1); const r = i % 2 ? 300 : 200; f.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6); }) });
    const cols = [0xFF5C8F, 0xFFE14D, 0x7FD8FF, 0x9AFF8A, 0xC9A0FF];
    this.time.addEvent({ delay: 650, repeat: 7, callback: () => {
      const x = Phaser.Math.Between(150, W - 150), y = Phaser.Math.Between(H * 0.4, H * 0.55);
      audio.play('sfx_bomb', { volume: 0.4, rate: 1.4 });
      this.burst(x, y, 'ptc_star', 18, { tints: cols, dist: 260, scale: 0.4 });
    } });
  }

  confetti() {
    const colors = [0xFF4D6D, 0xFF9F1C, 0xFFD23F, 0x8CC63F, 0x3EC1F3, 0xA55CF0];
    for (let i = 0; i < 80; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), -40 - Math.random() * 400, 'ptc_confetti')
        .setTint(colors[i % 6]).setScale(0.8 + Math.random()).setAngle(Math.random() * 360).setDepth(13);
      this.tweens.add({ targets: c, y: H + 60, angle: c.angle + Phaser.Math.Between(180, 720), x: c.x + Phaser.Math.Between(-140, 140),
        duration: 2200 + Math.random() * 1600, delay: Math.random() * 600, ease: 'Sine.In', onComplete: () => c.destroy() });
    }
  }
}
