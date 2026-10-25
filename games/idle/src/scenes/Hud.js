// 맨 위 장면: 위 막대 · 아래 메뉴 · 메뉴 화면 열고 닫기 (전투는 그 아래에서 계속 돎)
import { W, H } from '../config.js?v=0.55.1';
import { topBar, navBar, TOP, NAV_H } from '../hud.js?v=0.55.1';
import { load } from '../save.js?v=0.55.1';
import { quest } from '../state.js?v=0.55.1';
import { audio } from '../audio.js?v=0.55.1';
import { T, C, btn, sheet, rbox, toast } from '../ui.js?v=0.55.1';
import { save } from '../save.js?v=0.55.1';
import { CUTS, heraldCut } from '../story.js?v=0.55.1';
import { REGIONS, HEROES } from '../data.js?v=0.55.1';

export const PANELS = ['Heroes', 'Gear', 'Summon', 'Dungeon'];
export class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.top = topBar(this); this.nav = navBar(this, k => this.go(k)); this.cur = 'Battle'; this.nav.setActive('Battle');
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.dots() }); this.dots();
    const hit = this.add.zone(150, 76, 300, 140).setDepth(950).setInteractive({ useHandCursor: true }); hit.on('pointerup', () => { audio.play('sfx_tap'); this.settings(); });
    window.__hud = this;
  }
  // 설정 · 기사단 연대기(본 컷씬 다시 보기) · 기록 백업
  settings() {
    const d = load(), p = sheet(this, { size: 'M', title: '설정' }), rows = [['배경음', () => d.music !== false, () => audio.toggleMusic()], ['효과음', () => d.sfx !== false, () => audio.toggleSfx()], ['진동', () => d.haptic !== false, () => audio.toggleHaptic()]];
    rows.forEach(([n, get, flip], k) => { const y = k * 110, c = this.add.container(0, y), g = this.add.graphics(); c.add(rbox(this, 0, 0, 780, 96, { fill: '#141B3A', line: '#3A4A86', r: 22 })); c.add(g); c.add(T(this, -340, 0, n, 32, C.ink, { ox: 0, w: 900 }));
      const draw = () => { const on = get(); g.clear().fillStyle(on ? 0xF2C46B : 0x3A4A86, 1).fillRoundedRect(200, -32, 136, 64, 32).fillStyle(0xFFFFFF, 1).fillCircle(on ? 304 : 232, 0, 26); }; draw();
      const z = this.add.rectangle(268, 0, 160, 80, 0, 0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { flip(); draw(); audio.play('sfx_tap'); }); c.add(z); p.content.add(c); });
    p.content.add(T(this, 0, 360, '기사단 연대기 · 본 장면 다시 보기', 28, C.gold, { w: 900 }));
    const list = [['prologue', '프롤로그 · 해를 삼킨 날', () => CUTS.prologue]]; REGIONS.forEach((R, r) => { if (d.cuts[`h${r}`]) list.push([`h${r}`, `${R.n} · 사도 ${HEROES[R.herald].n}`, () => heraldCut(r, 'intro')]); if (d.cuts[`f${r}`]) list.push([`f${r}`, `${R.n} · 새벽`, () => heraldCut(r, 'free')]); });
    list.forEach(([k, n, f], i) => { const ok = !!d.cuts[k]; p.content.add(btn(this, 0, 440 + i * 96, 700, 80, ok ? n : '아직 보지 않은 장면', () => { if (!ok) return; p.close(); const b = this.scene.get('Battle'); b && b.playCut ? b.playCut(f(), null) : this.scene.launch('Cutscene', { cut: f() }); }, { style: ok ? 'dark' : 'dark', size: 26 })); });
    p.foot([{ t: '닫기', style: 'dark' }]);
  }
  dots() { const d = load(); this.nav.dot('Summon', d.gems >= 300 || d.freePull > 0); this.nav.dot('Battle', quest().have >= quest().need); }
  go(k) {
    if (k === this.cur && k !== 'Battle') return;
    for (const p of PANELS) if (this.scene.isActive(p)) this.scene.stop(p);
    this.cur = k; this.nav.setActive(k);
    if (k !== 'Battle') { this.scene.launch(k); this.scene.bringToTop(k); this.scene.bringToTop('Hud'); audio.music('bgm_menu'); }
    else { const b = this.scene.get('Battle'); audio.music(b && b.boss ? 'bgm_boss' : 'bgm_field'); }
  }
  // 뒤로가기: 메뉴 화면이 열려 있으면 전투로, 전투면 원어데이로
  onBack() { if (this.cur !== 'Battle') { this.go('Battle'); return true; } return false; }
}
// 메뉴 화면 공통 바탕 (위 막대 아래 ~ 아래 메뉴 위)
export function panelBg(sc, title, sub) {
  const g = sc.add.graphics(); g.fillGradientStyle(0x182256, 0x182256, 0x0B1028, 0x0B1028, 1).fillRect(0, TOP, W, H - TOP - NAV_H);
  for (let i = 0; i < 40; i++) g.fillStyle(0xFFFFFF, Math.random() * 0.5).fillCircle(Math.random() * W, TOP + Math.random() * (H - TOP - NAV_H), Math.random() * 2 + 0.5);
  sc.add.rectangle(W / 2, (H + TOP - NAV_H) / 2, W, H - TOP - NAV_H).setInteractive();   // 아래 전투를 누르지 않게
  const t = sc.add.text(40, TOP + 48, title, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '46px', color: '#F5F0E6', resolution: 2 }).setOrigin(0, 0.5);
  if (sub) sc.add.text(40, TOP + 96, sub, { fontFamily: 'Pretendard', fontStyle: '700', fontSize: '26px', color: '#9AA6CC', resolution: 2 }).setOrigin(0, 0.5);
  return sub ? TOP + 130 : TOP + 96;
}
