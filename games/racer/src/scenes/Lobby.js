// 차고: 메인 일러스트 + 드라이버 선택 · 자동차 선택 · 부품 강화 → 출발
import { W, H } from '../config.js';
import { txt, fmt, fit, button, toast } from '../ui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import { wind } from '../fx.js';
import * as M from '../meta.js';

// 밝은 카드 (흰 바탕 + 남색 테두리)
function card(scene, x, y, w, h, on = false) {
  const g = scene.add.graphics();
  g.fillStyle(0x0B1630, 0.25).fillRoundedRect(x - w / 2 + 6, y - h / 2 + 10, w, h, 26);
  g.fillStyle(on ? 0xFFF3C2 : 0xFFFFFF, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  g.lineStyle(on ? 8 : 5, on ? 0xFF8A1F : 0x1E2A52, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 26);
  return g;
}

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create() {
    this.cameras.main.setBackgroundColor('#BFE6FF');
    this.cameras.main.fadeIn(250, 20, 26, 50);
    audio.music('bgm_lobby', this);
    this.build();
    window.__lobby = this;
  }

  build() {
    this.children.removeAll(true);
    const d = load();
    // 하늘 그라데이션 + 메인 일러스트
    const g = this.add.graphics();
    g.fillGradientStyle(0x7CC8FF, 0x7CC8FF, 0xE8F6FF, 0xE8F6FF, 1).fillRect(0, 0, W, H);
    const art = this.add.image(W / 2, 0, 'key_art').setOrigin(0.5, 0);
    art.setScale(W / art.width);
    const artH = art.displayHeight;
    this.add.graphics().fillGradientStyle(0xE8F6FF, 0xE8F6FF, 0xE8F6FF, 0xE8F6FF, 0, 0, 1, 1).fillRect(0, artH - 160, W, 160);
    // 로고 (일러스트 위 빈 하늘)
    const logo = txt(this, W / 2, 120, '빵빵 질주', 128, '#FFE14D', { stroke: '#1E2A52', thick: 22 });
    logo.setShadow(0, 10, '#0B1630', 0, true, true);
    this.tweens.add({ targets: logo, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 210, 'HONK RUSH', 40, '#FFFFFF', { stroke: '#1E2A52', thick: 10 });
    // 코인 · 최고 기록
    const top = artH - 20;
    this.add.rectangle(W - 200, top - 60, 330, 72, 0x1E2A52, 0.85).setStrokeStyle(4, 0xFFE14D);
    this.add.image(W - 330, top - 60, 'item_coin').setDisplaySize(56, 56);
    txt(this, W - 180, top - 60, fmt(d.coins), 42, '#FFFFFF');
    if (d.best) txt(this, 40, top - 60, `최고 ${fmt(d.best)}점 · ${fmt(d.bestDist)}m`, 36, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 8 });

    let y = top + 40;
    // 드라이버
    txt(this, 40, y, '드라이버', 46, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 8 });
    y += 170;
    M.DRIVER_ORDER.forEach((id, i) => {
      const x = 140 + i * 267, info = M.DRIVER_INFO[id], own = d.drivers[id], on = d.driver === id;
      card(this, x, y, 240, 290, on);
      const pt = fit(this.add.image(x, y - 34, `driver_${id}`), 200);
      if (!own) pt.setTint(0x55607A);
      if (on) wind(pt, 1, 0.01);
      txt(this, x, y + 86, info.name, 38, '#1E2A52', { stroke: '#FFFFFF', thick: 6 });
      txt(this, x, y + 124, own ? info.desc : `🪙 ${fmt(info.cost)}`, 24, own ? '#3B5BDB' : '#C2410C', { stroke: '#FFFFFF', thick: 4 });
      const z = this.add.zone(x, y, 240, 290).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => { if (M.buyDriver(id)) { audio.play('sfx_honk_2', { volume: 0.6 }); this.build(); } else toast(this, '코인이 부족해요'); });
    });
    y += 210;
    // 자동차
    txt(this, 40, y, '자동차', 46, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 8 });
    y += 150;
    M.CAR_ORDER.forEach((id, i) => {
      const x = 190 + i * 350, info = M.CAR_INFO[id], own = d.cars[id], on = d.car === id;
      card(this, x, y, 320, 250, on);
      const c = fit(this.add.image(x - 80, y, info.key), 210).setAngle(-12);
      if (!own) c.setTint(0x55607A);
      txt(this, x + 60, y - 50, info.name, 30, '#1E2A52', { stroke: '#FFFFFF', thick: 5 });
      txt(this, x + 60, y + 4, own ? (info.bonus ? `성능 +${info.bonus}단계` : '기본 차') : `🪙 ${fmt(info.cost)}`, 26, own ? '#3B5BDB' : '#C2410C', { stroke: '#FFFFFF', thick: 4 });
      if (on) txt(this, x + 60, y + 56, '탑승 중', 28, '#FF8A1F', { stroke: '#FFFFFF', thick: 5 });
      const z = this.add.zone(x, y, 320, 250).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => { if (M.buyCar(id)) { audio.play('sfx_honk_3', { volume: 0.6 }); this.build(); } else toast(this, '코인이 부족해요'); });
    });
    y += 190;
    // 부품 강화
    txt(this, 40, y, '부품 강화', 46, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 8 });
    y += 120;
    Object.entries(M.PARTS).forEach(([k, info], i) => {
      const x = 190 + i * 350, lv = d.parts[k];
      card(this, x, y, 320, 190);
      txt(this, x, y - 56, `${info.name} Lv.${lv}`, 34, '#1E2A52', { stroke: '#FFFFFF', thick: 5 });
      for (let j = 0; j < M.PART_MAX; j++) this.add.rectangle(x - 126 + j * 28, y - 12, 22, 18, j < lv ? 0xFF8A1F : 0xD8DEEA);
      const max = lv >= M.PART_MAX;
      const b = button(this, x, y + 46, max ? '최대' : `🪙 ${fmt(M.partCost(lv))}`, () => { if (M.upgradePart(k)) { audio.play('sfx_item', { volume: 0.6 }); this.build(); } else toast(this, '코인이 부족해요'); }, { key: 'btn_purple', w: 250, h: 80, size: 30 });
      b.setEnabled(!max && d.coins >= M.partCost(lv));
    });
    // 출발
    const sy = Math.max(y + 190, H - 150);
    const go = button(this, W / 2, sy, '출발!', () => this.start(), { key: 'btn_gold', w: 620, h: 180, size: 78 });
    this.tweens.add({ targets: go, scale: 1.04, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  start() {
    audio.stopMusic();
    audio.play('sfx_honk_4', { volume: 0.7 });
    this.cameras.main.fadeOut(300, 20, 26, 50);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
  }
}
