// 모험: 던전 5종 · 결투장(10대10) · 토벌 의뢰 — 위 탭으로 바꿈
import { W, H } from '../config.js?v=0.55.1';
import { T, R, C, TS, btn, sheet, rbox, chips, toast } from '../ui.js?v=0.55.1';
import { audio } from '../audio.js?v=0.55.1';
import { load, save } from '../save.js?v=0.55.1';
import { HEROES, GRADES } from '../data.js?v=0.55.1';
import { fmt, teamPower, stageName } from '../state.js?v=0.55.1';
import { DUNGEONS, DG_TRIES, DG_TIME, dgLevel, dgHp, dgLeft, dgFight, dgSweep, teamDps, REWARD_N, daily, arenaFoes, arenaFight, arenaTier, QUESTS, disp, dispStart, dispClaim } from '../content.js?v=0.55.1';
import { panelBg } from './Hud.js?v=0.55.1';
import { TOP, NAV_H } from '../hud.js?v=0.55.1';
import { loadRegion } from './Boot.js?v=0.55.1';

export { DUNGEONS };
const TABS = [['dg', '던전'], ['arena', '결투장'], ['disp', '토벌 의뢰']];
// 보상 표시용 그림
const RW_IC = { gold: 'i_gold', gems: 'i_gem', keys: 'i_key', potion: 'shop139', token: 'shop6', food: 'shop16' };
export function rwChips(sc, x, y, r, size = 56) { const c = sc.add.container(x, y), ks = Object.keys(r), gap = size + 70;
  ks.forEach((k, i) => { const xx = (i - (ks.length - 1) / 2) * gap, im = sc.add.image(xx, 0, RW_IC[k]).setDisplaySize(size, size); c.add([im, T(sc, xx, size / 2 + 18, fmt(r[k]), 24, C.ink, { w: 900 })]); }); c.setSize(ks.length * gap, size + 40); return c; }

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }
  init(data) { this.tab = (data && data.tab) || this.tab || 'dg'; }
  create() {
    const y0 = panelBg(this, '모험', '던전 · 결투장 · 토벌 의뢰'); daily();
    TABS.forEach(([k, n], i) => { const x = 40 + i * 340, on = k === this.tab; this.add.existing(rbox(this, x, y0, 320, 80, { fill: on ? '#F2C46B' : '#1A2350', line: '#3A4A86', r: 40, ox: 0, oy: 0 }));
      T(this, x + 160, y0 + 40, n, 30, on ? '#3A2400' : C.dim, { w: 900 }); this.add.zone(x + 160, y0 + 40, 320, 80).setInteractive().on('pointerup', () => { if (k !== this.tab) { audio.play('sfx_tap'); this.scene.restart({ tab: k }); } }); });
    this.y0 = y0 + 110; this[this.tab](); window.__dg = this;
  }
  // ── 던전
  dg() { const d = load(), y0 = this.y0;
    DUNGEONS.forEach((g, i) => { const y = y0 + i * 186, open = d.maxStage >= g.open, left = dgLeft(g.k), lv = dgLevel(g.k);
      this.add.existing(rbox(this, 40, y, W - 80, 170, { fill: open ? '#1A2350' : '#10152E', line: open ? '#F2C46B' : '#2A3260', lw: open ? 3 : 2, r: 24, ox: 0, oy: 0 }));
      const ic = this.add.image(120, y + 85, g.icon); ic.setDisplaySize(116, 116); if (!open) ic.setAlpha(0.4);
      T(this, 200, y + 50, g.n, 32, open ? C.ink : C.sub, { ox: 0, w: 900 }); T(this, 200, y + 94, g.d, 22, C.dim, { ox: 0, w: 800 });
      if (open) T(this, 200, y + 134, `${lv}단계 도전 · 오늘 ${left}/${DG_TRIES}`, 24, C.gold, { ox: 0, w: 900 });
      else T(this, 200, y + 134, `스테이지 ${stageName(g.open)} 에서 열려요`, 24, C.sub, { ox: 0, w: 800 });
      if (open) btn(this, W - 150, y + 85, 190, 84, left > 0 ? '입장' : '내일 다시', () => left > 0 ? this.dgOpen(g) : toast(this, '오늘 입장 횟수를 다 썼어요'), { style: left > 0 ? 'gold' : 'dark', size: 28 }); }); }
  dgOpen(g) { const lv = dgLevel(g.k), p = sheet(this, { size: 'M', title: g.n, sub: `${lv}단계 · ${DG_TIME}초 안에 보스를 쓰러뜨려요` });
    const boss = this.add.image(0, 220, `hero_${g.boss}`).setOrigin(0.5, 1); boss.setScale(240 / boss.height).setFlipX(true); p.content.add(boss);
    const hp = dgHp(g.k, lv), my = teamDps() * DG_TIME, ok = my >= hp; p.content.add(T(this, 0, 260, `보스 체력 ${fmt(hp)} · 예상 피해 ${fmt(my)}`, 26, ok ? C.green : '#FFB089', { w: 900 }));
    p.content.add(T(this, 0, 310, '보상', 24, C.dim, { w: 800 })); p.content.add(rwChips(this, 0, 370, g.rw(lv)));
    p.foot([{ t: '도전', fn: () => { p.close(); this.fight(g); } }, ...(lv > 1 ? [{ t: `소탕 ${lv - 1}단계`, style: 'blue', fn: () => { const r = dgSweep(g.k); p.close(); if (r) { audio.play('sfx_coin', { volume: 0.5 }); this.gain('소탕 완료', r); } } }] : [])]); }
  // 던전 전투 연출: 보스 체력이 기사단 피해로 줄어드는 6초 (30초를 빠르게)
  fight(g) {
    const res = dgFight(g.k), lv = res.lv; audio.play('sfx_boss', { volume: 0.45 }); const fade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(500).setInteractive();
    const c = this.add.container(0, 0).setDepth(501), bgk = `bg_${g.bg}`;
    const go = () => { if (this.textures.exists(bgk)) { const bg = this.add.image(W / 2, H * 0.38, bgk); bg.setScale(Math.max(W / bg.width, H * 0.5 / bg.height)); c.add(bg); }
      const boss = this.add.image(W * 0.68, H * 0.56, `hero_${g.boss}`).setOrigin(0.5, 1).setFlipX(true); boss.setScale(H * 0.32 / boss.height); c.add(boss);
      const team = load().team.slice(0, 10); team.forEach((id, i) => { const im = this.add.image(120 + (i % 5) * 70, H * 0.5 + Math.floor(i / 5) * 60, `hero_${id}`).setOrigin(0.5, 1); im.setScale(H * 0.15 / im.height); c.add(im); this.tweens.add({ targets: im, x: im.x + 18, duration: 160 + i * 20, yoyo: true, repeat: -1 }); });
      const bar = this.add.graphics(); c.add(bar); const tt = T(this, W / 2, H * 0.12, '', 40, '#FFFFFF', { w: 900, shadow: true }); c.add(tt);
      const total = res.dmg, dur = 6000, t0 = this.time.now;
      const ev = this.time.addEvent({ delay: 60, loop: true, callback: () => { const k = Math.min(1, (this.time.now - t0) / dur), dealt = Math.min(res.hp, total * k);
        bar.clear().fillStyle(0x000000, 0.6).fillRoundedRect(140, H * 0.16, W - 280, 40, 20).fillStyle(0xE04848, 1).fillRoundedRect(144, H * 0.16 + 4, Math.max(20, (W - 288) * (1 - dealt / res.hp)), 32, 16);
        tt.setText(`${g.n} ${lv}단계 · ${Math.ceil(DG_TIME * (1 - k))}초`);
        if (Math.random() < 0.5) { const n = T(this, W * 0.6 + Math.random() * 200, H * 0.4 + Math.random() * 120, fmt(total / 60 * (0.6 + Math.random())), 34, '#FFF1C2', { w: 900, shadow: true }); c.add(n); this.tweens.add({ targets: n, y: n.y - 60, alpha: 0, duration: 500, onComplete: () => n.destroy() }); boss.setTintFill(0xFFFFFF); this.time.delayedCall(40, () => boss.clearTint()); audio.play('sfx_hit', { volume: 0.2, gap: 90 }); }
        if (k >= 1 || dealt >= res.hp) { ev.remove(); if (dealt >= res.hp) this.tweens.add({ targets: boss, alpha: 0, x: boss.x + 100, duration: 400 });
          this.time.delayedCall(600, () => { c.destroy(); fade.destroy(); audio.play(res.win ? 'sfx_win' : 'sfx_lose', { volume: 0.5 }); this.gain(res.win ? `${lv}단계 돌파!` : '시간 초과 · 보상은 받아요', res.r, () => this.scene.restart()); }); } } }); };
    if (this.textures.exists(bgk)) go(); else { this.load.image(bgk, `assets/bg/${g.bg}.webp`); this.load.once('complete', go); this.load.start(); }
  }
  gain(title, r, done) { const p = sheet(this, { size: 'M', title, onClose: () => (done ? done() : this.scene.restart()) }); p.content.add(rwChips(this, 0, 0, r, 90)); p.content.add(T(this, 0, 110, Object.keys(r).map(k => REWARD_N[k]).join(' · '), 24, C.dim, { w: 800 })); p.foot([{ t: '받기' }]); }
  // ── 결투장
  arena() { const d = load(), a = d.arena, [tier, col] = arenaTier(a.pts), y0 = this.y0, left = daily().arena;
    this.add.existing(rbox(this, W / 2, y0 + 90, W - 80, 170, { fill: '#1A2350', line: col, lw: 4, r: 26 }));
    T(this, 80, y0 + 50, '여명 대련장', 34, C.ink, { ox: 0, w: 900 }); T(this, 80, y0 + 100, `${tier} · ${a.pts}점 · ${a.wins}승`, 30, col, { ox: 0, w: 900 }); T(this, 80, y0 + 142, `오늘 도전권 ${left}/5 · 내 전투력 ${fmt(teamPower())}`, 24, C.dim, { ox: 0, w: 800 });
    arenaFoes().forEach((f, i) => { const y = y0 + 210 + i * 250; this.add.existing(rbox(this, 40, y, W - 80, 230, { fill: '#141B3A', line: '#3A4A86', lw: 2, r: 24, ox: 0, oy: 0 }));
      T(this, 70, y + 40, f.n, 32, C.ink, { ox: 0, w: 900 }); T(this, 70, y + 80, `전투력 ${fmt(f.power)} · 이기면 +${f.pts}점`, 24, f.power > teamPower() ? '#FFB089' : C.green, { ox: 0, w: 800 });
      f.team.forEach((id, k) => { const im = this.add.image(90 + k * 74, y + 160, `face_${id}`); im.setDisplaySize(68, 68); });
      btn(this, W - 150, y + 60, 180, 80, '도전', () => this.duel(f), { style: left > 0 ? 'gold' : 'dark', size: 28 }); }); }
  duel(f) { const res = arenaFight(f); if (!res) return toast(this, '오늘 도전권을 다 썼어요');
    const p = sheet(this, { size: 'L', title: res.win ? '승리!' : '패배', onClose: () => this.scene.restart() }), me = load().team.slice(0, 10);
    p.content.add(T(this, -250, 0, '우리 기사단', 28, C.gold, { w: 900 })); p.content.add(T(this, 250, 0, f.n, 28, '#FF8A8A', { w: 900 })); p.content.add(T(this, 0, 120, 'VS', 64, C.gold, { w: 900, shadow: true }));
    me.forEach((id, k) => { const im = this.add.image(-380 + (k % 5) * 66, 70 + Math.floor(k / 5) * 72, `face_${id}`); im.setDisplaySize(62, 62); p.content.add(im); });
    f.team.forEach((id, k) => { const im = this.add.image(120 + (k % 5) * 66, 70 + Math.floor(k / 5) * 72, `face_${id}`); im.setDisplaySize(62, 62); if (res.win) im.setTint(0x666666); p.content.add(im); });
    p.content.add(T(this, 0, 240, `${res.gain > 0 ? '+' : ''}${res.gain}점`, 44, res.win ? C.green : '#FF8A8A', { w: 900 })); p.content.add(rwChips(this, 0, 330, res.rw)); audio.play(res.win ? 'sfx_win' : 'sfx_lose', { volume: 0.5 });
    p.foot([{ t: '확인' }]); }
  // ── 토벌 의뢰
  disp() { const d = load(), y0 = this.y0, n = Object.keys(d.heroes).length;
    T(this, 60, y0 + 10, '영웅을 보내 두면 시간이 지나 보상이 와요 (전투에도 그대로 참여)', 24, C.dim, { ox: 0, w: 800 });
    QUESTS.forEach((q, i) => { const y = y0 + 50 + i * 290, t = disp()[q.k], done = t && Date.now() >= t, rw = q.rw(d.maxStage);
      this.add.existing(rbox(this, 40, y, W - 80, 270, { fill: '#1A2350', line: done ? '#6BE39B' : '#3A4A86', lw: done ? 4 : 2, r: 24, ox: 0, oy: 0 }));
      T(this, 70, y + 44, q.n, 32, C.ink, { ox: 0, w: 900 }); T(this, 70, y + 86, `${q.h}시간 · 영웅 ${q.need}명 필요`, 24, n >= q.need ? C.dim : '#FFB089', { ox: 0, w: 800 });
      this.add.existing(rwChips(this, 330, y + 170, rw, 50));
      if (!t) btn(this, W - 150, y + 70, 190, 80, '보내기', () => { if (!dispStart(q.k)) return toast(this, `영웅이 ${q.need}명 있어야 해요`); audio.play('sfx_tap'); this.scene.restart(); }, { size: 28 });
      else if (done) btn(this, W - 150, y + 70, 190, 80, '받기', () => { const r = dispClaim(q.k); if (r) { audio.play('sfx_coin'); this.gain('토벌 완료!', r); } }, { style: 'green', size: 28 });
      else { const left = T(this, W - 150, y + 70, '', 28, C.gold, { w: 900 }); const up = () => { const s = Math.max(0, Math.ceil((t - Date.now()) / 1000)); left.setText(`${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`); if (!s) this.scene.restart(); }; up(); this.time.addEvent({ delay: 1000, loop: true, callback: up }); } }); }
}
