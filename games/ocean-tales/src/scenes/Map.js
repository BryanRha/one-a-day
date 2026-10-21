// 월드맵: 월드(10레벨씩)를 세로로 이어 붙이고, 레벨 노드를 구불구불한 길로 연결한다. 화면 근처 월드만 그린다.
import { W, H, TXT, INK, WORLD_COUNT, MAP_THEME } from '../config.js?v=0.16.2';
import { t } from '../i18n.js?v=0.16.2';
import { audio } from '../audio.js?v=0.16.2';
import { load, save, availableStars } from '../save.js?v=0.16.2';
import { RESTORE_TASKS, taskCost } from '../restore.js?v=0.16.2';
import { dailyPopup, missionPopup } from '../ui/meta.js?v=0.16.2';
import { dailyState, claimableCount } from '../missions.js?v=0.16.2';
import { dexPopup, achPopup } from '../ui/collection.js?v=0.16.2';
import { dexClaimable, achClaimable } from '../progress.js?v=0.16.2';
import { LEVELS } from '../core/levels.js?v=0.16.2';
import { popup, button, iconButton, toast, enableGlow } from '../ui/widgets.js?v=0.16.2';

const WORLD_H = 3840;
const WORLDS = WORLD_COUNT;
const TOTAL_H = WORLD_H * WORLDS;
const DOCK_PAD = 220;   // 아래 고정 바 높이만큼 더 내려갈 수 있게
const DECOS = ['bubbles', 'jellyfish', 'coral_tree', 'coral_fan', 'kelp', 'shell', 'anchor', 'chest', 'rock', 'urchin'];

export function nodePos(id) {
  const w = Math.ceil(id / 10), k = (id - 1) % 10;
  const yLocal = WORLD_H - 380 - k * ((WORLD_H - 760) / 9);
  return { x: W / 2 + 270 * Math.sin(k * 0.95 + w * 1.3), y: (WORLDS - w) * WORLD_H + yLocal };
}

export function settingsPopup(scene) {
  const d = load();
  const p = popup(scene, { title: t('settings'), width: 820, height: 760 });
  const row = (y, label, getOn, toggle, iconOn, iconOff) => {
    const txt = scene.add.text(-300, y, label, TXT.dark).setOrigin(0, 0.5);
    const btn = iconButton(scene, 230, y, getOn() ? iconOn : iconOff, () => { const on = toggle(); btn.icon.setTexture(on ? iconOn : iconOff); });
    p.box.add([txt, btn]);
  };
  row(-150, t('sound'), () => d.sfx, () => audio.toggleSfx(), 'ico_sound_on', 'ico_sound_off');
  row(10, t('music'), () => d.music, () => audio.toggleMusic(), 'ico_music_on', 'ico_music_off');
  const reset = button(scene, 0, 210, t('reset'), () => {
    p.close(true);
    const q = popup(scene, { title: t('reset'), width: 820, height: 620 });
    q.box.add(scene.add.text(0, -60, t('resetAsk'), TXT.body).setOrigin(0.5));
    q.box.add(button(scene, -180, 140, t('cancel'), () => q.close(), { kind: 'secondary', width: 320, height: 130, size: 44 }));
    q.box.add(button(scene, 180, 140, t('ok'), () => {
      try { localStorage.removeItem('dessertpop_save_v1'); } catch { /* */ }
      location.reload();
    }, { width: 320, height: 130, size: 44 }));
  }, { kind: 'secondary', width: 460, height: 130, size: 42 });
  p.box.add(reset);
  return p;
}

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create(data = {}) {
    enableGlow(this);
    const d = load();
    this.cameras.main.setBounds(0, 0, W, TOTAL_H + DOCK_PAD);
    // 월드는 화면 근처 것만 그린다 (500레벨 · 50월드를 한꺼번에 만들면 폰에서 무거움) → syncWorlds()
    this.built = new Map();
    this.mapData = data;
    // 고정 UI
    const top = this.add.image(W / 2, 0, 'hud_topbar').setOrigin(0.5, 0).setScrollFactor(0).setScale(1, 0.62);
    iconButton(this, 90, 85, 'ico_home', () => this.scene.start('Title'), { size: 120 }).setScrollFactor(0);
    iconButton(this, W - 90, 85, 'ico_settings', () => settingsPopup(this), { size: 120 }).setScrollFactor(0);
    const coin = this.add.image(W / 2 - 180, 80, 'ico_coin').setScale(0.42).setScrollFactor(0);
    this.coinText = this.add.text(coin.x + 50, 80, `${d.coins}`, TXT.mid).setOrigin(0, 0.5).setScrollFactor(0);
    const star = this.add.image(W / 2 + 110, 80, 'star_small_on').setScale(1.1).setScrollFactor(0);
    this.add.text(star.x + 46, 80, `${availableStars()}`, TXT.mid).setOrigin(0, 0.5).setScrollFactor(0);
    // ── 아래 고정 바: 미션 · 도감 · 업적 · 바다 복원 (받을 보상·할 일이 있으면 빨간 알림)
    const dockBg = this.add.image(W / 2, H, 'hud_topbar').setOrigin(0.5, 0).setFlipY(true).setDisplaySize(W, 270).setScrollFactor(0).setDepth(29);
    dockBg.setOrigin(0.5, 1);
    const goReef = () => {
      this.cameras.main.fadeOut(220, 189, 235, 255);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Reef'));
    };
    const reefCount = () => {
      const maxW = Math.min(WORLDS, Math.ceil(Math.min(d.unlocked, LEVELS.length) / 10));
      for (let w = 1; w <= maxW; w++) { const n = d.restore[w] || 0; if (n < RESTORE_TASKS && availableStars() >= taskCost(w, n)) return 1; }
      return 0;
    };
    const items = [
      ['ico_mission', t('missionBtn'), () => missionPopup(this, () => this.refreshDock()), claimableCount],
      ['ico_book', t('dexBtn'), () => dexPopup(this, () => this.refreshDock()), dexClaimable],
      ['ico_trophy', t('achBtn'), () => achPopup(this, () => this.refreshDock()), achClaimable],
      ['ico_reef', t('restoreTitle'), goReef, reefCount],
    ];
    this.dock = items.map(([icon, label, open, countFn], i) => {
      const x = W * (0.125 + i * 0.25), y = H - 150;
      const btn = iconButton(this, x, y, icon, open, { size: 132 }).setScrollFactor(0).setDepth(30);
      this.add.text(x, H - 58, label, { ...TXT.small, fontSize: '26px', strokeThickness: 7 }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
      const dot = this.add.circle(x + 52, y - 52, 22, 0xFF3B4A).setStrokeStyle(5, 0xffffff).setScrollFactor(0).setDepth(31);
      const txt = this.add.text(dot.x, dot.y - 2, '', { ...TXT.small, fontSize: '26px', strokeThickness: 0 }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
      this.tweens.add({ targets: [dot, txt], scale: 1.18, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      return { btn, dot, txt, countFn, bang: icon === 'ico_reef' };
    });
    this.refreshDock();
    // 오늘 첫 방문이면 출석 보상 (새 월드로 이동하는 연출이 끝난 뒤)
    if (dailyState().canClaim) this.time.delayedCall(data.arrive ? 3600 : 650, () => dailyPopup(this));

    // 스크롤
    const focus = nodePos(Math.min(d.unlocked, LEVELS.length));
    const clampY = y => Phaser.Math.Clamp(y - H * 0.6, 0, TOTAL_H + DOCK_PAD - H);
    this.cameras.main.scrollY = clampY(focus.y);
    if (data.arrive) {
      // 월드 클리어 직후: 지난 월드 보스 노드에서 새 월드 첫 노드까지 카메라가 헤엄쳐 올라감
      const from = nodePos(Math.max(1, (data.arrive - 1) * 10));
      this.cameras.main.scrollY = clampY(from.y);
      this.tweens.add({ targets: this.cameras.main, scrollY: clampY(focus.y), delay: 500, duration: 1500, ease: 'Sine.InOut' });
    }
    this.syncWorlds();
    this.dragDist = 0; this.vel = 0;
    this.input.on('pointerdown', p => { this.dragDist = 0; this.lastY = p.y; this.vel = 0; });
    this.input.on('pointermove', p => {
      if (!p.isDown) return;
      const dy = p.y - this.lastY; this.lastY = p.y;
      this.dragDist += Math.abs(dy);
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY - dy, 0, TOTAL_H + DOCK_PAD - H);
      this.vel = -dy;
    });
    this.input.on('wheel', (p, o, dx, dy) => { this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + dy, 0, TOTAL_H + DOCK_PAD - H); });

    audio.music('bgm_map', this);
    this.cameras.main.fadeIn(250, 189, 235, 255);
    if (data.celebrate && d.unlocked > LEVELS.length) toast(this, t('allClear'));
  }

  // 카메라 근처(위아래 한 월드 여유) 월드만 만들고, 멀어진 월드는 지움
  syncWorlds() {
    const cam = this.cameras.main;
    const top = cam.scrollY - WORLD_H * 0.6, bottom = cam.scrollY + H + WORLD_H * 0.6;
    const want = new Set();
    for (let w = 1; w <= WORLDS; w++) { const y0 = (WORLDS - w) * WORLD_H; if (y0 < bottom && y0 + WORLD_H > top) want.add(w); }
    for (const [w, c] of this.built) if (!want.has(w)) { this.tweens.killTweensOf(c.list); c.destroy(); this.built.delete(w); }
    for (const w of want) if (!this.built.has(w)) this.built.set(w, this.buildWorld(w));
  }

  buildWorld(w) {
    const d = load(), data = this.mapData || {};
    const c = this.add.container(0, 0);
    const add = o => { c.add(o); return o; };
    add(this.drawWorld(w));
    const first = (w - 1) * 10 + 1, last = Math.min(LEVELS.length, w * 10);
    // 길: 이 월드 레벨들 + 다음 월드 첫 레벨로 이어지는 구간
    const path = [];
    for (let id = first; id <= last && id < LEVELS.length; id++) {
      const a = nodePos(id), b = nodePos(id + 1);
      const n = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 62);
      const cx = (a.x + b.x) / 2 + (a.x < b.x ? -60 : 60), cy = (a.y + b.y) / 2;
      for (let i = 1; i < n; i++) {
        const tt = i / n;
        path.push({ id, x: (1 - tt) ** 2 * a.x + 2 * (1 - tt) * tt * cx + tt * tt * b.x, y: (1 - tt) ** 2 * a.y + 2 * (1 - tt) * tt * cy + tt * tt * b.y });
      }
    }
    const nodes = []; for (let id = Math.max(1, first - 1); id <= Math.min(LEVELS.length, last + 1); id++) nodes.push(nodePos(id));
    const bannerY = (WORLDS - w + 1) * WORLD_H - 120;
    const nearNode = (x, y, pad = 0) => nodes.some(n => Math.abs(x - n.x) < 100 + pad && y > n.y - 110 - pad && y < n.y + 135 + pad);
    const nearBanner = (x, y, pad = 0) => [bannerY, bannerY - WORLD_H].some(by => Math.abs(y - by) < 100 + pad && Math.abs(x - W / 2) < 420 + pad);
    // 장식 (월드마다 같은 배치가 나오게 월드 번호로 씨앗)
    const rnd = new Phaser.Math.RandomDataGenerator([`ocean-map-${w}`]);
    let placed = 0;
    for (let tries = 0; tries < 200 && placed < 14; tries++) {
      const y = (WORLDS - w) * WORLD_H + 260 + rnd.frac() * (WORLD_H - 520);
      const x = 90 + rnd.frac() * (W - 180);
      if (nearNode(x, y, 90) || nearBanner(x, y, 60) || path.some(pt => Math.hypot(pt.x - x, pt.y - y) < 150)) continue;
      const key = `map_deco_${rnd.pick(DECOS)}`;
      const sp = add(this.add.image(x, y, key).setScale(0.45 + rnd.frac() * 0.3).setAlpha(0.95));
      if (key.includes('bubbles') || key.includes('jellyfish')) { sp.setAlpha(0.8); this.tweens.add({ targets: sp, x: x + 30, yoyo: true, repeat: -1, duration: 4000 + rnd.frac() * 3000, ease: 'Sine.InOut' }); }
      placed++;
    }
    for (const pt of path) {
      if (nearNode(pt.x, pt.y) || nearBanner(pt.x, pt.y)) continue;
      add(this.add.image(pt.x, pt.y, 'map_path_dot').setAlpha(pt.id < d.unlocked ? 1 : 0.55));
    }
    // 노드
    for (let id = first; id <= last; id++) {
      const lv = LEVELS[id - 1];
      const { x, y } = nodePos(id);
      const unlocked = id <= d.unlocked, current = id === d.unlocked;
      const key = !unlocked ? 'map_node_locked' : current ? 'map_node_current' : lv.boss ? 'map_node_boss' : 'map_node_open';
      const node = add(this.add.image(x, y, key).setScale(current || lv.boss ? 0.95 : 0.9));
      if (unlocked) {
        // 번호는 비트맵 글꼴 (글자 객체 500개를 만들지 않도록)
        add(this.add.bitmapText(x, y - 8, 'font_num_white', `${id}`, id >= 100 ? 50 : 62).setOrigin(0.5));
        const st = d.stars[id] || 0;
        for (let i = 0; i < 3; i++) add(this.add.image(x + (i - 1) * 46, y + 80 + (i === 1 ? 8 : 0), i < st ? 'star_small_on' : 'star_small_off'));
        node.setInteractive({ useHandCursor: true });
        node.on('pointerup', () => { if (this.dragDist < 20) { audio.play('sfx_click'); this.openLevel(id); } });
      }
      if (current && (d.seenUnlocked || 1) < id) {
        // 새로 열린 레벨: 노드가 튀어나오는 연출
        const base = node.scale; node.setScale(0);
        const popDelay = data.arrive ? 2100 : 450;
        this.tweens.add({ targets: node, scale: base, delay: popDelay, duration: 450, ease: 'Back.Out', onStart: () => audio.play('sfx_special_create') });
        for (let i = 0; i < 10; i++) {
          const p = add(this.add.image(x, y, 'ptc_star').setScale(0.4).setTint(0xFFD23F).setAlpha(0));
          const a = (i / 10) * Math.PI * 2;
          this.tweens.add({ targets: p, x: x + Math.cos(a) * 180, y: y + Math.sin(a) * 180, alpha: { from: 1, to: 0 }, delay: popDelay + 50, duration: 700, onComplete: () => p.destroy() });
        }
        d.seenUnlocked = id; save();
      }
      if (current) {
        this.tweens.add({ targets: node, scale: 1.02, yoyo: true, repeat: -1, duration: 600, delay: 1000 });
        const mk = add(this.add.image(x, y - 150, 'map_player_marker').setScale(0.85));
        this.tweens.add({ targets: mk, y: mk.y - 26, yoyo: true, repeat: -1, duration: 550, ease: 'Sine.InOut' });
      }
    }
    // 월드 이름 배너
    add(this.add.image(W / 2, bannerY, 'popup_ribbon').setDisplaySize(760, 170));
    add(this.add.text(W / 2, bannerY - 8, `${w}. ${t('worldName')[w - 1]}`, { ...TXT.mid, stroke: '#0B3E8A' }).setOrigin(0.5));
    return c;
  }

  // 월드 한 칸 배경: 위→아래 그라데이션 + 모래·물빛 무늬 + 물결 + 물방울 (화면 밖 월드는 update 에서 숨김)
  drawWorld(w) {
    const [top, bottom, patch] = MAP_THEME[(w - 1) % MAP_THEME.length].map(c => Phaser.Display.Color.HexStringToColor(c).color);
    const y0 = (WORLDS - w) * WORLD_H;
    const g = this.add.graphics();
    g.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, y0, W, WORLD_H);
    const rnd = new Phaser.Math.RandomDataGenerator([`world-${w}`]);
    g.fillStyle(patch, 0.45);
    for (let i = 0; i < 12; i++) {
      const rx = 120 + rnd.frac() * 160;
      g.fillEllipse(rnd.pick([rnd.frac() * 200 - 40, W - rnd.frac() * 200 + 40]), y0 + 200 + rnd.frac() * (WORLD_H - 400), rx * 2, rx * 1.1);
    }
    g.lineStyle(6, 0xffffff, 0.3);
    for (let i = 0; i < 26; i++) {
      const x = 40 + rnd.frac() * (W - 200), y = y0 + 80 + rnd.frac() * (WORLD_H - 160);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 1; k <= 8; k++) g.lineTo(x + k * 20, y + Math.sin(k * Math.PI / 4) * 10);
      g.strokePath();
    }
    for (let i = 0; i < 40; i++) {
      const x = 40 + rnd.frac() * (W - 80), y = y0 + 60 + rnd.frac() * (WORLD_H - 120), r = 6 + rnd.frac() * 16;
      g.lineStyle(3, 0xffffff, 0.6).strokeCircle(x, y, r);
      g.fillStyle(0xffffff, 0.6).fillCircle(x - r * 0.35, y - r * 0.35, r * 0.22);
    }
    g.y0 = y0;
    return g;
  }

  refreshDock() {
    for (const b of this.dock || []) {
      const n = b.countFn();
      b.dot.setVisible(n > 0); b.txt.setVisible(n > 0).setText(b.bang ? '!' : `${n}`);
    }
  }

  update() {
    this.syncWorlds();
    if (!this.input.activePointer.isDown && Math.abs(this.vel) > 0.5) {
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + this.vel, 0, TOTAL_H + DOCK_PAD - H);
      this.vel *= 0.92;
    }
  }

  openLevel(id) {
    this.cameras.main.fadeOut(220, 189, 235, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { levelId: id }));
  }
}

export { INK };
