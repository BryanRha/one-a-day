// 숨은 물건 맵 (Find It Out® 식): 고밀도 세로 맵 · 아래 아이콘 5칸(찾으면 다음 물건이 채워짐) · 실패·시간 제한 없음
// + 이야기 단서: 분홍 테두리 아이콘 · 찾으면 서윤 혼잣말 · 물건마다 코인 · 힌트는 코인
import { W, H } from '../config.js?v=0.55.2';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.55.2';
import { audio } from '../audio.js?v=0.55.2';
import { goPrev } from '../nav.js?v=0.55.2';
import { pushBack } from '../oad.js?v=0.55.2';
import { load, save } from '../save.js?v=0.55.2';
import { Viewer } from '../viewer.js?v=0.55.2';
import { EPISODES, epNo, hero } from '../episodes.js?v=0.55.2';
import { starOnce } from '../cafe/state.js?v=0.55.2';
import { advance, passed, stepOf, replayResult, medal, TIERS } from '../replay.js?v=0.55.2';

const SLOTS = 5, HINT_COST = 10, SPAM = { n: 3, t: 2, lock: 3 };
export class HuntScene extends Phaser.Scene {
  constructor() { super('Hunt'); }
  create(data) {
    const ep = this.ep = EPISODES.find(e => e.id === data.id), hu = ep.hunt, d = load();
    // 이미 끝낸 판이면 새 판(다시 하기): 진행 저장 없이 처음부터 · 시간 · 힌트로 등급
    // 다 본 화(done): 등급 · 기록이 붙는 다시 하기 / 진행 중인 화에서 이미 지난 판: 새 판으로 다시 (컷씬 · 흐름 그대로, 보상 없음)
    const again = passed(ep.id, 'hunt'); this.replay = again && stepOf(ep.id) === 'done'; this.fresh = again; if (!again) advance(ep.id, 'hunt');
    const prog = d.ep[ep.id] ||= { step: 'hunt' }; prog.found ||= []; save();
    Object.assign(this, { misses: [], lock: 0, t: 0, ended: false, paused: false, blur: null, got: 0, hints: 0 });
    // 순서: 일반 물건 사이사이에 단서 · 결정적 단서(last)는 맨 끝
    const normal = hu.items.filter(i => !i.clue).sort(() => Math.random() - 0.5), clues = hu.items.filter(i => i.clue && !i.last), last = hu.items.find(i => i.last);
    const q = [...normal]; clues.forEach((c, k) => q.splice(Math.min(q.length, 3 + k * 4), 0, c)); if (last) q.push(last);
    this.queue = this.fresh ? q : q.filter(i => !prog.found.includes(i.n)); this.total = hu.items.length; this.got = this.total - this.queue.length;
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    const top = 150, trayH = 300;
    this.v = new Viewer(this, hu.map, 0, top, W, H - top - trayH, { maxZoom: 4, onTap: (ip, p, later) => this.tap(ip, p, later) });
    this.v.zoom = 1.6; this.v.cy = hu.h * 0.35; this.v.apply();
    // 위: 뒤로 · 화 제목 · 진행 · 코인
    const bar = this.add.graphics(); bar.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, top); bar.fillStyle(0xFF9DB6, 0.6).fillRect(0, top - 3, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 56, `${epNo(ep)}화 · 단서 찾기${this.replay ? ' · 다시 하기' : ''}`, 34, '#FFFFFF', { w: 900 });
    this.progT = T(this, W / 2, 104, '', 24, C.sub, { w: 800 });
    this.coinT = T(this, W - 40, 76, '', 32, C.gold, { ox: 1, w: 900 });
    // 아래: 아이콘 5칸 + 힌트
    const ty = H - trayH, tg = this.add.graphics(); tg.fillStyle(0x2E1A2A, 1).fillRect(0, ty, W, trayH); tg.fillStyle(0xFF9DB6, 0.6).fillRect(0, ty, W, 3);
    this.slots = []; const sw = 168;
    for (let k = 0; k < SLOTS; k++) { const x = 40 + sw / 2 + k * (sw + 8), y = ty + 110; const c = this.add.container(x, y); this.slots.push({ c, x, y, it: null }); }
    this.nameT = T(this, W / 2 - 60, ty + 230, '', 24, C.sub, { w: 800 });
    this.hintB = iconBtn(this, W - 90, ty + 230, 'hint', () => this.hint(), 100); this.hintC = T(this, W - 90, ty + 286, `● ${HINT_COST}`, 20, C.gold, { w: 900 });
    this.fill(); this.ui(); this.cameras.main.fadeIn(300, 30, 10, 26); window.__hunt = this;
    // 다 찾은 채로 다시 들어온 경우(마지막 단서 대사 중 나갔다 옴 등) 바로 마무리
    if (this.got >= this.total) this.time.delayedCall(600, () => this.win());
    if (!prog.found.length) this.time.delayedCall(500, () => toast(this, '아래 그림과 같은 물건을 맵에서 찾아요 · 두 손가락으로 확대', top + 110));
  }
  ui() { const md = medal(this.ep.id, 'hunt'); this.progT.setText(`찾은 물건 ${this.got} / ${this.total}${this.replay ? ` · 시간 ${Math.floor(this.t / 60)}:${String(Math.floor(this.t % 60)).padStart(2, '0')}${md >= 0 ? ` · 최고 ${TIERS[md].n}` : ''}` : ''}`); this.coinT.setText(`● ${load().coins}`); }
  thumb(it) {
    if (it.clue) return it.clue;
    const key = `hm_${this.ep.id}_${it.n}`; if (!this.textures.exists(key)) { const src = this.textures.get(this.ep.hunt.map).getSourceImage(), r = it.r * 1.2, c = this.textures.createCanvas(key, 160, 160), g = c.getContext(); g.drawImage(src, it.x - r, it.y - r, r * 2, r * 2, 0, 0, 160, 160); c.refresh(); } return key;
  }
  // 빈 칸에 다음 물건 채우기
  fill() {
    for (const s of this.slots) {
      if (s.it) continue; const it = this.queue.shift(); if (!it) { s.c.removeAll(true); continue; }
      s.it = it; s.c.removeAll(true);
      const bg = this.add.graphics(); bg.fillStyle(it.clue ? 0x5A2A48 : 0xFFFFFF, 1).fillRoundedRect(-80, -80, 160, 160, 28).lineStyle(it.clue ? 6 : 3, it.clue ? 0xFF9DB6 : 0xE8C8D4, 1).strokeRoundedRect(-80, -80, 160, 160, 28);
      const im = this.add.image(0, 0, this.thumb(it)); im.setScale(130 / Math.max(im.width, im.height));
      s.c.add([bg, im]); if (it.clue) { s.c.add(T(this, 0, -94, '단서', 20, '#FFB6CB', { w: 900 })); this.tweens.add({ targets: bg, alpha: 0.7, duration: 600, yoyo: true, repeat: -1 }); }
      s.c.setScale(0); this.tweens.add({ targets: s.c, scale: 1, duration: 260, ease: 'Back.easeOut' });
      s.c.setSize(160, 160).setInteractive({ useHandCursor: true }).off('pointerup').on('pointerup', () => { this.nameT.setText(it.n); this.tweens.add({ targets: s.c, scale: 1.1, duration: 100, yoyo: true }); });
    }
  }
  update(time, delta) { if (this.ended || this.paused) return; const dt = Math.min(0.05, delta / 1000); const s0 = Math.floor(this.t); this.t += dt; if (this.replay && Math.floor(this.t) !== s0 && this.progT) this.ui(); if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0 && this.blur) { this.blur.destroy(); this.blur = null; } } }
  tap(ip, p, later) {
    if (this.ended || this.paused) return; if (this.lock > 0) { audio.play('sfx_miss', { volume: 0.3 }); return; }
    const s = this.slots.find(s => s.it && (ip.x - s.it.x) ** 2 + (ip.y - s.it.y) ** 2 <= s.it.r ** 2);
    if (s) return this.found(s);
    if (later) return later(() => this.miss(p));
    this.miss(p);
  }
  miss(p) {
    if (this.ended || this.paused) return;
    audio.play('sfx_miss', { volume: 0.45 }); audio.buzz(25);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.5).setDepth(40); this.tweens.add({ targets: x, alpha: 0, scale: 0.15, duration: 380, onComplete: () => x.destroy() });
    this.misses = this.misses.filter(t => this.t - t < SPAM.t); this.misses.push(this.t);
    if (this.misses.length >= SPAM.n) { this.misses = []; this.lock = SPAM.lock; this.blur = this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.4).setDepth(50); toast(this, '천천히 살펴봐요 · 잠깐 숨 고르기'); }
  }
  found(s) {
    const it = s.it, d = load(); s.it = null; this.got++; if (!this.fresh) { d.ep[this.ep.id].found.push(it.n); d.coins += it.clue ? 5 : 1; save(); }
    audio.play('sfx_find', { volume: 0.7 });
    const ring = this.add.image(it.x, it.y, 'ring').setTint(it.clue ? 0xFF7FA6 : 0xFFE08A); ring.setScale(it.r * 2.8 / 160); this.v.layer.add(ring); this.tweens.add({ targets: ring, scale: it.r * 2.2 / 160, duration: 280, ease: 'Back.easeOut' });
    const sp = this.v.toScreen(it.x, it.y);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, gg = this.add.image(sp.x, sp.y, 'spark').setTint(it.clue ? 0xFFB6CB : 0xFFE9A0).setScale(0.4).setDepth(40); this.tweens.add({ targets: gg, x: sp.x + Math.cos(a) * 90, y: sp.y + Math.sin(a) * 90, alpha: 0, scale: 0.1, duration: 500, onComplete: () => gg.destroy() }); }
    const fly = this.add.image(sp.x, sp.y, this.thumb(it)).setDepth(45); fly.setDisplaySize(it.r * 2 * this.v.s, it.r * 2 * this.v.s);
    this.tweens.add({ targets: fly, x: s.x, y: s.y, displayWidth: 130, displayHeight: 130, alpha: 0.2, duration: 450, ease: 'Cubic.easeIn', onComplete: () => { fly.destroy(); this.fill(); } });
    const cn = T(this, sp.x, sp.y - 40, this.fresh ? '찾았다!' : `● +${it.clue ? 5 : 1}`, 30, C.gold, { w: 900, shadow: true }).setDepth(46); this.tweens.add({ targets: cn, y: sp.y - 110, alpha: 0, duration: 800, onComplete: () => cn.destroy() });
    this.ui();
    if (it.clue) this.time.delayedCall(500, () => this.monologue(it));
    else if (this.got >= this.total) this.time.delayedCall(700, () => this.win());
  }
  // 단서를 찾으면 서윤의 혼잣말
  monologue(it) {
    this.paused = true; const root = this.add.container(0, 0).setDepth(900);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.55).setInteractive(); root.add(dim);
    const ic = this.add.image(W / 2, H * 0.3, it.clue); ic.setScale(0); root.add(ic); this.tweens.add({ targets: ic, scale: 300 / Math.max(ic.width, ic.height), duration: 380, ease: 'Back.easeOut' });
    const face = this.add.image(W / 2 - 250, H - 380, hero(this.ep).face).setOrigin(0.5, 1); face.setScale(560 / face.height); root.add(face);
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.97).fillRoundedRect(40, H - 400, W - 80, 300, 34).lineStyle(4, 0xFF9DB6, 1).strokeRoundedRect(40, H - 400, W - 80, 300, 34); root.add(g);
    root.add(T(this, 90, H - 330, `단서 발견 · ${it.n}`, 28, '#E8628A', { ox: 0, w: 900 }));
    root.add(T(this, 90, H - 280, it.line, 36, C.ink, { ox: 0, oy: 0, w: 700, wrap: W - 180, lh: 14, align: 'left' }));
    audio.play('sfx_hint', { volume: 0.6 });
    const unback = pushBack(() => { if (!root.scene) return false; done(); return true; }); this.events.once('shutdown', unback);
    const done = () => { if (!root.scene) return; unback(); root.destroy(); this.paused = false; if (this.got >= this.total) this.time.delayedCall(300, () => this.win()); };
    dim.on('pointerup', () => done());
  }
  hint() {
    if (this.ended || this.paused) return; const d = load();
    if (d.coins < HINT_COST) return toast(this, '코인이 부족해요 · 물건을 찾으면 모여요');
    const s = this.slots.find(s => s.it && !s.it.clue) || this.slots.find(s => s.it); if (!s) return;
    d.coins -= HINT_COST; this.hints++; save(); this.ui(); audio.play('sfx_hint', { volume: 0.7 });
    this.v.focus(s.it.x, s.it.y, 2.6);
    const g = this.add.image(s.it.x, s.it.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.it.r * 3.4 / 128); this.v.layer.add(g);
    this.tweens.add({ targets: g, alpha: 0.15, duration: 420, yoyo: true, repeat: 4, onComplete: () => g.destroy() });
    this.tweens.add({ targets: s.c, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
  }
  win() {
    if (this.ended) return; this.ended = true;
    if (this.replay) return this.time.delayedCall(500, () => replayResult(this, { id: this.ep.id, kind: 'hunt', n: this.total, sec: this.t, slip: this.hints, next: 'mid' })); audio.play('sfx_clear', { volume: 0.7 }); this.cameras.main.flash(300, 255, 230, 240);
    const t = T(this, W / 2, H * 0.42, '단서를 모두 찾았어요!', 60, '#FFFFFF', { w: 900, shadow: true }).setDepth(60).setAlpha(0); this.tweens.add({ targets: t, alpha: 1, y: H * 0.4, duration: 400 });
    advance(this.ep.id, 'mid');
    const got = starOnce(this.ep.id, 'h', Math.max(1, 3 - this.hints));
    if (got) { const s = T(this, W / 2, H * 0.5, '★'.repeat(got) + '  냥카페 별 +' + got, 40, C.gold, { w: 900, shadow: true }).setDepth(60).setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 400, delay: 300 }); }
    this.time.delayedCall(1600, () => { this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Story', { id: this.ep.id, part: 'mid' })); });
  }
  leave() { this.paused = true; const p = popup(this, 760, 460, { onClose: () => { this.paused = false; } }); p.content.add(T(this, 0, -120, '잠깐 쉬어 갈까요?', 40, C.ink, { w: 900 })); p.content.add(T(this, 0, -50, '찾은 물건은 저장돼요', 26, C.dim, { w: 700 })); p.content.add(btn(this, -170, 100, 300, 110, '계속 찾기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 100, 300, 110, '나가기', () => goPrev(this))); }
  onBack() { if (this.ended) return true; return goPrev(this); }
}
