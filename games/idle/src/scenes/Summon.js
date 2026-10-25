// 영웅 소환: 등불의 빛을 보고 영웅이 찾아온다 (확률 공개 · 80회째 레전드 확정 · 소환 레벨)
import { W, H } from '../config.js?v=0.54.0';
import { T, R, C, TS, btn, sheet, rbox, toast } from '../ui.js?v=0.54.0';
import { audio } from '../audio.js?v=0.54.0';
import { load } from '../save.js?v=0.54.0';
import { HEROES, GRADES, SUMMON } from '../data.js?v=0.54.0';
import { summon, fmt } from '../state.js?v=0.54.0';
import { panelBg } from './Hud.js?v=0.54.0';
import { TOP, NAV_H } from '../hud.js?v=0.54.0';

export class SummonScene extends Phaser.Scene {
  constructor() { super('Summon'); }
  create() {
    const d = load(), s = d.summon, y0 = panelBg(this, '영웅 소환', '등불이 밝을수록 이름난 영웅이 찾아와요'), bottom = H - NAV_H;
    // 배너: 레전드 영웅 원화 + 등불 빛
    const glow = this.add.image(W / 2, y0 + 360, 'glow').setTint(0xF2C46B).setScale(9).setAlpha(0.35).setBlendMode('ADD');
    this.tweens.add({ targets: glow, alpha: 0.18, duration: 1500, yoyo: true, repeat: -1 });
    const pick = ['deino', 'heran', 'liam', 'ella', 'crocodile', 'hegadion'][Math.floor(Date.now() / 864e5) % 6], art = this.add.image(W / 2, y0 + 720, `hero_${pick}`).setOrigin(0.5, 1); art.setScale(680 / art.height);
    T(this, W / 2, y0 + 760, `이번 주 등불 영웅 · ${HEROES[pick].n}`, 32, GRADES[3].css, { w: 900, shadow: true });
    // 등불 레벨 · 확정까지
    const r = SUMMON.rates(s.lv), ny = y0 + 830; this.add.existing(rbox(this, W / 2, ny + 70, W - 80, 150, { fill: '#141B3A', line: '#3A4A86', lw: 2, r: 22 }));
    T(this, 70, ny + 34, `등불 Lv.${s.lv}`, 30, C.gold, { ox: 0, w: 900 }); T(this, W - 70, ny + 34, `레전드 확정까지 ${SUMMON.pity - s.pity}회`, 26, C.ink, { ox: 1, w: 900 });
    const g = this.add.graphics(); g.fillStyle(0x000000, 0.5).fillRoundedRect(70, ny + 62, W - 140, 16, 8).fillStyle(0xFF9E5E, 1).fillRoundedRect(70, ny + 62, Math.max(16, (W - 140) * s.pity / SUMMON.pity), 16, 8);
    T(this, W / 2, ny + 112, `일반 ${r[0].toFixed(1)}% · 희귀 ${r[1].toFixed(1)}% · 전설 ${r[2].toFixed(1)}% · 레전드 ${r[3].toFixed(1)}%`, 24, C.dim, { w: 800 });
    const by = Math.min(bottom - 90, ny + 240);
    btn(this, W / 2 - 240, by, 400, 120, `1회 ◆${SUMMON.cost1}`, () => this.go(1), { style: 'dark', size: 32 });
    btn(this, W / 2 + 230, by, 440, 120, d.freePull > 0 ? '10회 무료!' : `10회 ◆${fmt(SUMMON.cost10)}`, () => this.go(10), { size: 34 });
    T(this, W / 2 + 230, by + 74, '희귀 이상 1명 확정', 22, C.gold, { w: 800 });
  }
  go(n) {
    const out = summon(n); if (!out) return toast(this, '보석이 부족해요 · 퀘스트와 보스에서 모아요'); audio.play('sfx_summon', { volume: 0.6 });
    const b = this.scene.get('Battle'); if (b && b.placeTeam && !b.boss) b.placeTeam();
    const best = out.reduce((a, o) => (HEROES[o.id].g > HEROES[a.id].g ? o : a), out[0]);
    const p = sheet(this, { size: 'L', title: n >= 10 ? '10회 소환' : '영웅 소환', onClose: () => this.scene.restart() });
    if (HEROES[best.id].g >= 2) { const art = this.add.image(0, 330, `hero_${best.id}`).setOrigin(0.5, 1); art.setScale(380 / art.height); p.content.add(art); p.content.add(T(this, 0, 370, `${GRADES[HEROES[best.id].g].n} · ${HEROES[best.id].n}${best.isNew ? '  NEW' : ''}`, 34, GRADES[HEROES[best.id].g].css, { w: 900, shadow: true })); }
    const y0 = HEROES[best.id].g >= 2 ? 440 : 0, cols = Math.min(5, out.length);
    out.forEach((o, i) => { const H0 = HEROES[o.id], x = (i % cols - (cols - 1) / 2) * 170, y = y0 + Math.floor(i / cols) * 210;
      const fr = rbox(this, x, y, 150, 150, { fill: '#1A2350', line: GRADES[H0.g].css, lw: 5, r: 18 }), f = this.add.image(x, y, `face_${o.id}`); f.setDisplaySize(138, 138);
      const nm = T(this, x, y + 94, H0.n, 22, GRADES[H0.g].css, { w: 900 }); if (nm.width > 160) nm.setScale(160 / nm.width);
      const tag = T(this, x, y - 86, o.isNew ? 'NEW' : '조각 +10', 22, o.isNew ? '#FFB45E' : C.moon, { w: 900, shadow: true });
      [fr, f, nm, tag].forEach((ob, k) => { ob.setAlpha(0); this.tweens.add({ targets: ob, alpha: 1, duration: 200, delay: 120 + i * 90 }); }); p.content.add([fr, f, nm, tag]);
      if (H0.g >= 3) this.time.delayedCall(120 + i * 90, () => audio.play('sfx_epic', { volume: 0.5 })); });
    p.foot([{ t: '확인' }, { t: n >= 10 ? `다시 10회 ◆${fmt(SUMMON.cost10)}` : `다시 1회 ◆${SUMMON.cost1}`, style: 'blue', fn: () => { p.close(); this.time.delayedCall(200, () => this.go(n)); } }]);
  }
}
