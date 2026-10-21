// 차고: 메인 일러스트 + 드라이버 선택 · 자동차 선택 · 부품 강화 → 출발
import { W, H } from '../config.js?v=0.19.1';
import { txt, fmt, fit, button, toast, popup } from '../ui.js?v=0.19.1';
import { audio } from '../audio.js?v=0.19.1';
import { load, save } from '../save.js?v=0.19.1';
import { wind } from '../fx.js?v=0.19.1';
import * as M from '../meta.js?v=0.19.1';

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
    const logo = txt(this, W / 2, 120, '스트레스 차차차', 112, '#FFE14D', { stroke: '#1E2A52', thick: 22 });
    logo.setShadow(0, 10, '#0B1630', 0, true, true);
    this.tweens.add({ targets: logo, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 210, 'STRESS CHA-CHA-CHA', 40, '#FFFFFF', { stroke: '#1E2A52', thick: 10 });
    // 코인 · 최고 기록
    const top = artH - 20;
    this.add.rectangle(W - 200, top - 60, 330, 72, 0x1E2A52, 0.85).setStrokeStyle(4, 0xFFE14D);
    this.add.image(W - 330, top - 60, 'item_coin').setDisplaySize(56, 56);
    txt(this, W - 180, top - 60, fmt(d.coins), 42, '#FFFFFF');
    // ③ 게임 방법 (언제든 다시 보기)
    const hb = this.add.container(170, top - 60);
    hb.add([this.add.rectangle(0, 0, 280, 72, 0x1E2A52, 0.85).setStrokeStyle(4, 0xFFE14D), txt(this, 0, 0, '❓ 게임 방법', 36, '#FFFFFF')]);
    hb.setSize(280, 72).setInteractive({ useHandCursor: true }).on('pointerup', () => { audio.play('sfx_click', { volume: 0.5 }); this.helpPopup(); });
    if (!d.tips.practice) this.tweens.add({ targets: hb, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });

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
    // 내 기록 + 오늘의 팁 (빈 공간 채우기)
    const room = (H - 150 - 100) - (y + 100);
    if (room > 240) {
      const ch = 270, ry = y + 100 + ch / 2 + Math.max(0, (room - ch) / 2 - 10), t = d.totals;
      card(this, W / 2, ry, W - 80, ch);
      txt(this, 80, ry - 96, '내 기록', 36, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 6 });
      const recs = [['🏆', '최고 점수', fmt(d.best || 0)], ['🛣️', '최고 거리', `${fmt(d.bestDist || 0)}m`], ['🔥', '피버', `${fmt(t.fevers || 0)}번`], ['🚚', '보스 격파', `${fmt(t.bosses || 0)}번`]];
      recs.forEach(([ico, k, v], i) => {
        const x = 170 + i * 247;
        txt(this, x - 56, ry - 22, ico, 40, '#FFFFFF');
        txt(this, x + 14, ry - 36, k, 24, '#5A6488', { stroke: '#FFFFFF', thick: 4 });
        txt(this, x + 14, ry - 4, v, 32, '#3B5BDB', { stroke: '#FFFFFF', thick: 5 });
      });
      const TIPS = ['앞차에 바짝 붙었다가 휙! 가까울수록 PERFECT', '칼치기 7번을 끊기지 않게 이으면 피버!', '보스전: 칼치기 한 번에 별 한 발, PERFECT는 두 발', '점프로 차 위에 떨어지면 점프샷 대박 점수', '앞차 뒤에 붙어 달리면 슬립스트림 가속'];
      this.add.rectangle(W / 2, ry + 76, W - 140, 64, 0xFFF4C2).setStrokeStyle(3, 0xFFC93C);
      txt(this, W / 2, ry + 76, `💡 ${TIPS[(t.runs || 0) % TIPS.length]}`, 28, '#1E2A52', { stroke: '#FFF4C2', thick: 4 });
    }
    // 출발
    const sy = Math.max(y + 190, H - 150);
    const go = button(this, W / 2, sy, '출발!', () => this.start(), { key: 'btn_gold', w: 620, h: 180, size: 78 });
    this.tweens.add({ targets: go, scale: 1.04, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  helpPopup() {
    const pop = popup(this, '게임 방법', 1500, { depth: 2000 });
    const rows = [
      ['car_player_c', '칼치기', '앞차에 바짝 붙었다가 옆으로 휙!\n가까울수록 GOOD → GREAT → PERFECT'],
      ['ico_fever', '스트레스 차차차 피버', '칼치기를 4초 안에 계속 이어 7글자를 채우면\n6초 무적! 부딪히거나 끊기면 처음부터'],
      ['boss_truck', '보스 심술 트럭', '체크포인트 3개마다 등장 · 빨간 차로를 피해요\n칼치기 = 별 1발 · PERFECT = 2발'],
      ['item_fuel', '연료 · 점프', '연료가 바닥나면 끝 · 연료통과 체크포인트로 충전\n위로 밀면 점프 · 차를 밟으면 점프샷'],
    ];
    rows.forEach(([key, t1, t2], i) => {
      const y = -500 + i * 300;
      pop.content.add(this.add.rectangle(0, y, 840, 270, 0xFFFFFF, 0.08).setStrokeStyle(3, 0xFFFFFF, 0.25));
      if (key === 'ico_fever') pop.content.add(txt(this, -300, y, '스트\n레스', 46, '#FF6FB5', { stroke: '#22105A', thick: 10 }));
      else pop.content.add(fit(this.add.image(-300, y, key), key === 'boss_truck' ? 220 : 180).setAngle(key === 'car_player_c' ? -15 : 0));
      pop.content.add(txt(this, -170, y - 60, t1, 44, '#FFE14D', { ox: 0, stroke: '#22105A', thick: 8 }));
      pop.content.add(txt(this, -170, y + 30, t2, 30, '#FFFFFF', { ox: 0, stroke: '#22105A', thick: 6 }));
    });
    pop.content.add(button(this, 0, 650, '연습 다시 하기', () => { const d = load(); d.tips.practice = 0; save(); pop.close(); this.start(); }, { key: 'btn_purple', w: 460, h: 120, size: 40 }));
  }

  start() {
    audio.stopMusic();
    audio.play('sfx_honk_4', { volume: 0.7 });
    this.cameras.main.fadeOut(300, 20, 26, 50);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
  }
}
