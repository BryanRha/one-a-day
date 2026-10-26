import { frame } from '../frame.js?v=0.59.0';
import { banner, iconTabs, rewards, card, doneStamp, lockIc, progressBar } from '../evui.js?v=0.59.0';
// 따로 여는 화면: 뒷산 광산 · 미니게임 3종(댐 수리 · 참새 쫓기 · 불량배 쫓기) · 마을 사람들(호감도 · 선물 · 결혼)
import { W, H } from '../config.js?v=0.59.0';
import { T, C, btn, popup, toast, redDot } from '../ui.js?v=0.59.0';
import { audio } from '../audio.js?v=0.59.0';
import { goPrev } from '../nav.js?v=0.59.0';
import { ITEMS, MINE, MINIS, SUITORS, HEARTS, HEART_PTS, CHARS, RELIC_N, BUILDS } from '../data.js?v=0.59.0';
import { load, save, has, mine, mineHit, miniLeft, miniDone, giftTo, hearts, marry, countOf, rewardText, progress } from '../state.js?v=0.59.0';

const icon = (sc, x, y, k, s) => { const im = sc.add.image(x, y, k); im.setScale(s / Math.max(im.width, im.height)); return im; };
// 모든 전체 화면 공통 틀 (frame.js): 위 재화 막대 + 제목 막대 ◀ · 손가락으로 위아래 밀기
function top(sc, title) { frame(sc, title, () => goPrev(sc)); }

// ── 광산
export class MineScene extends Phaser.Scene {
  constructor() { super('Mine'); }
  init() { this.noScroll = true; }
  create() {
    const bg = this.add.image(W / 2, H / 2, 'mine_bg'); bg.setScale(Math.max(W / bg.width, H / bg.height)); top(this, '뒷산 광산');
    const m = mine(), d = load(), cs = 150, x0 = (W - cs * MINE.cols) / 2, y0 = 300;
    T(this, W / 2, 190, `${m.depth}층 · 곡괭이로 한 칸 · 다이너마이트로 3×3`, 26, '#FFFFFF', { w: 900, shadow: true });
    this.cells = m.cells.map((k, i) => { const x = x0 + (i % MINE.cols) * cs + cs / 2, y = y0 + Math.floor(i / MINE.cols) * cs + cs / 2; if (!k) return null; const im = icon(this, x, y, k, cs - 6); im.setInteractive({ useHandCursor: true }).on('pointerup', () => this.hit(i)); return im; });
    const by = y0 + MINE.rows * cs + 80; this.tool = 'pickaxe';
    this.pB = btn(this, W / 2 - 220, by, 400, 110, '', () => { this.tool = 'pickaxe'; this.lab(); }, { size: 28, style: 'gold' });
    this.dB = btn(this, W / 2 + 220, by, 400, 110, '', () => { this.tool = 'dynamite'; this.lab(); }, { size: 28, style: 'cream' });
    T(this, W / 2, by + 90, '곡괭이 · 다이너마이트는 대장간에서 만들어요', 22, '#FFFFFF', { w: 900, shadow: true }); this.lab(); window.__mine = this;
  }
  lab() { const d = load(); this.pB.setLabel(`⛏ 곡괭이 ${d.items.pickaxe || 0}${this.tool === 'pickaxe' ? ' ✓' : ''}`); this.dB.setLabel(`🧨 다이너마이트 ${d.items.dynamite || 0}${this.tool === 'dynamite' ? ' ✓' : ''}`); }
  hit(i) {
    const boom = this.tool === 'dynamite', out = mineHit(i, boom); if (!out) return toast(this, boom ? '다이너마이트가 없어요' : '곡괭이가 없어요 · 대장간에서 만들어요', H / 2);
    if (out.relic) { this.time.delayedCall(300, () => { audio.play('sfx_levelup', { volume: 0.6 }); const im = icon(this, W / 2, H / 2 - 40, out.relic, 180).setDepth(50); toast(this, `🏛 유물 발견! ${RELIC_N[out.relic]} · 박물관에 모여요`, H / 2 + 90); this.tweens.add({ targets: im, y: im.y - 60, alpha: 0, delay: 900, duration: 700, onComplete: () => im.destroy() }); }); }
    save(); audio.play(boom ? 'sfx_box' : 'sfx_drop', { volume: 0.8, rate: boom ? 0.7 : 1 }); audio.buzz(boom ? [30, 40, 30] : 15); if (boom) this.cameras.main.shake(250, 0.01);
    for (const { j, r } of out) { const im = this.cells[j]; if (!im) continue; this.cells[j] = null; this.tweens.add({ targets: im, scale: im.scale * 1.3, alpha: 0, angle: 20, duration: 250, onComplete: () => im.destroy() }); if (r) { const t = T(this, im.x, im.y, rewardText(r), 28, '#FFE27A', { w: 900 }).setStroke('#3E2A14', 6); this.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 1200, delay: 200, onComplete: () => t.destroy() }); } }
    this.lab(); if (load().mine.depth !== mine().depth || mine().cells.every(c => c)) this.time.delayedCall(600, () => { toast(this, '새 층이 열렸어요!', H / 2); this.scene.restart(); });
  }
  onBack() { return goPrev(this); }
}

// ── 미니게임: 30초 · 나타나는 것을 눌러요
export class MiniScene extends Phaser.Scene {
  constructor() { super('Mini'); }
  init() { this.noScroll = true; }
  create(data) {
    const k = this.k = data.k || 'sparrow', M = MINIS[k]; this.score = 0; this.left = 30; this.on = false;
    this.add.rectangle(W / 2, H / 2, W, H, k === 'dam' ? 0x5BB6E0 : k === 'bully' ? 0xD9C9A8 : 0x8BC07A); top(this, M.n);
    const f = this.add.image(W / 2, 420, M.who); f.setScale(300 / f.height);
    T(this, W / 2, 640, M.d, 32, '#3E2A14', { w: 900, wrap: 900 });
    T(this, 200, 160, '점수', 24, '#3E2A14', { w: 900 }); T(this, W - 200, 160, '남은 시간', 24, '#3E2A14', { w: 900 }); this.scoreT = T(this, 200, 205, '0', 48, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 8); this.timeT = T(this, W - 200, 205, '30', 48, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 8);
    this.field = { x: 80, y: 760, w: W - 160, h: H - 960 }; const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.25).fillRoundedRect(this.field.x, this.field.y, this.field.w, this.field.h, 40);
    if (k === 'sparrow') for (let i = 0; i < 20; i++) icon(this, this.field.x + 60 + (i % 5) * (this.field.w - 120) / 4, this.field.y + 80 + Math.floor(i / 5) * (this.field.h - 160) / 3, 'ripe_wheat', 160).setAlpha(0.8);
    if (k === 'dam') { const dg = this.add.graphics(); dg.fillStyle(0x8A5A2B, 1).fillRect(this.field.x, this.field.y + this.field.h / 2 - 160, this.field.w, 320); }
    this.go = btn(this, W / 2, H / 2 + 200, 420, 130, `시작! (오늘 ${miniLeft()}번 남음)`, () => this.start(), { size: 34, style: 'green' }); window.__mini = this;
  }
  start() { if (miniLeft() <= 0) return toast(this, '오늘은 다 했어요 · 내일 다시 와요', H / 2); this.go.destroy(); this.on = true; audio.music('bgm_story');
    this.timer = this.time.addEvent({ delay: 1000, repeat: 29, callback: () => { this.left--; this.timeT.setText(String(this.left)); if (this.left <= 0) this.end(); } });
    this.spawnE = this.time.addEvent({ delay: this.k === 'bully' ? 900 : 650, loop: true, callback: () => this.spawn() }); }
  spawn() { if (!this.on) return; const F = this.field, x = F.x + 80 + Math.random() * (F.w - 160), y = this.k === 'dam' ? F.y + F.h / 2 + (Math.random() - 0.5) * 220 : F.y + 80 + Math.random() * (F.h - 160);
    const key = { dam: 'leak', sparrow: 'sparrow', bully: 'bully' }[this.k], im = icon(this, x, y, key, 170); im.setScale(0.01); const sc = 170 / Math.max(im.width, im.height);
    this.tweens.add({ targets: im, scale: sc, duration: 180, ease: 'Back.easeOut' });
    if (this.k === 'sparrow') this.tweens.add({ targets: im, x: x + (Math.random() - 0.5) * 300, duration: 1400, yoyo: true });
    im.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.on || im.hit) return; im.hit = true; this.score++; this.scoreT.setText(String(this.score)); audio.play(this.k === 'dam' ? 'sfx_drop' : 'sfx_tap', { volume: 0.7 }); audio.buzz(10);
      if (this.k === 'dam') { const pl = icon(this, x, y, 'plank', 150); this.tweens.add({ targets: pl, alpha: 0, delay: 600, duration: 300, onComplete: () => pl.destroy() }); }
      this.tweens.add({ targets: im, scale: 0, angle: 180, duration: 200, onComplete: () => im.destroy() }); });
    this.time.delayedCall(this.k === 'bully' ? 1100 : 1700, () => { if (im.active && !im.hit) this.tweens.add({ targets: im, alpha: 0, duration: 200, onComplete: () => im.destroy() }); }); }
  end() { if (!this.on) return; this.on = false; this.spawnE.remove(); const { r } = miniDone(this.score); save(); audio.play('sfx_levelup', { volume: 0.7 });
    const p = popup(this, 800, 620); p.content.add(T(this, 0, -220, `${this.score}개 성공!`, 60, '#5AAE3C', { w: 900 })); p.content.add(T(this, 0, -100, rewardText(r), 34, C.ink, { w: 900 }));
    p.content.add(btn(this, 0, 180, 360, 100, '마을로', () => { p.close(); goPrev(this); }, { size: 32 })); }
  onBack() { if (this.on) return true; return goPrev(this); }
}

// ── 마을 사람들: 호감도 · 선물 · 프러포즈 · 결혼
export class PeopleScene extends Phaser.Scene {
  constructor() { super('People'); }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0xFFF3E0); top(this, '마을 사람들'); const d = load();
    if (d.spouse) { const S = SUITORS[d.spouse], f = this.add.image(W / 2 - 180, 620, 'princess'), f2 = this.add.image(W / 2 + 180, 620, d.spouse); f.setScale(480 / f.height); f2.setScale(480 / f2.height);
      icon(this, W / 2, 470, 'heart', 120); T(this, W / 2, 940, `${S.n}와(과) 결혼했어요`, 48, '#E8507A', { w: 900 }); T(this, W / 2, 1010, `부부 효과: ${S.perk}`, 30, C.brown, { w: 900 }); T(this, W / 2, 1100, `"${S.line[0]}"`, 28, C.dim, { w: 800, wrap: 860 }); return; }
    T(this, W / 2, 180, '좋아하는 제품을 선물하면 하트가 빨리 차요 · 하트 5개면 프러포즈!', 24, C.dim, { w: 900 });
    Object.entries(SUITORS).forEach(([k, S], i) => { const y = 440 + i * 470, g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(40, y - 200, W - 80, 420, 36).lineStyle(4, 0xE8A0B4, 1).strokeRoundedRect(40, y - 200, W - 80, 420, 36);
      const f = this.add.image(190, y + 20, k); f.setScale(380 / f.height); { const mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRoundedRect(44, y - 196, W - 88, 412, 32); f.setMask(mk.createGeometryMask()); }   // 카드 밖으로 나가지 않게 T(this, 360, y - 150, `${S.n} · ${S.job}`, 40, C.ink, { ox: 0, w: 900 });
      const hv = d.love[k] / HEART_PTS; for (let h = 0; h < HEARTS; h++) { const hi = icon(this, 380 + h * 70, y - 80, 'heart', 56); if (h + 1 > hv) { hi.setTintFill(0xD8CCCC).setAlpha(0.55); if (hv > h) { const part = icon(this, 380 + h * 70, y - 80, 'heart', 56); part.setCrop(0, 0, part.width * (hv - h), part.height); } } }
      T(this, 360, y - 20, '좋아하는 것', 22, C.dim, { ox: 0, w: 800 }); S.likes.forEach((it, j) => { icon(this, 400 + j * 100, y + 40, it, 76); T(this, 400 + j * 100, y + 92, `${d.items[it] || 0}`, 20, has(it) ? C.green : C.dim, { w: 900 }); });
      T(this, 360, y + 140, `결혼 효과: ${S.perk}`, 22, C.brown, { ox: 0, w: 800 });
      if (hearts(k) >= HEARTS) btn(this, W - 190, y + 140, 240, 84, '💍 프러포즈', () => this.propose(k), { size: 26, style: 'green' });
      else btn(this, W - 190, y + 140, 220, 84, '🎁 선물', () => this.gift(k), { size: 26, style: 'green' }); });
    window.__people = this;
  }
  gift(k) { const S = SUITORS[k], d = load(), list = Object.keys(d.items).filter(it => d.items[it] > 0 && ITEMS[it] && !['pickaxe', 'dynamite'].includes(it)).sort((a, b) => S.likes.includes(b) - S.likes.includes(a) || ITEMS[b].v - ITEMS[a].v).slice(0, 12);
    if (!list.length) return toast(this, '줄 물건이 없어요', H / 2); const p = popup(this, 980, 300 + Math.ceil(list.length / 4) * 210); p.content.add(T(this, 0, -60 - Math.ceil(list.length / 4) * 105, `${S.n}에게 무엇을 줄까요?`, 40, C.ink, { w: 900 }));
    list.forEach((it, i) => { const x = -345 + (i % 4) * 230, y = 40 - Math.ceil(list.length / 4) * 105 + Math.floor(i / 4) * 210, c = this.add.container(x, y), g = this.add.graphics(), like = S.likes.includes(it); g.fillStyle(like ? 0xFFE3EC : 0xFFF6E0, 1).fillRoundedRect(-100, -95, 200, 190, 24); c.add([g, icon(this, 0, -20, it, 100), T(this, 0, 60, `${ITEMS[it].n} ${d.items[it]}${like ? ' ♥' : ''}`, 20, C.ink, { w: 900 })]);
      c.setSize(200, 190).setInteractive({ useHandCursor: true }).on('pointerup', () => { const r = giftTo(k, it); if (!r) return; save(); audio.play(r.liked ? 'sfx_levelup' : 'sfx_coin', { volume: 0.6 }); p.close(); toast(this, r.liked ? `${S.n}: "제가 제일 좋아하는 거예요!" ♥+${r.pts}` : `${S.n}: "고마워요." ♥+${r.pts}`, H / 2); this.time.delayedCall(900, () => this.scene.restart()); }); p.content.add(c); }); }
  propose(k) { const S = SUITORS[k]; if (!countOf('wedding')) return toast(this, '먼저 결혼식장을 지어요 (건설 → 마을)', H / 2);
    const p = popup(this, 900, 900, { closable: false }), f = this.add.image(0, -150, k); f.setScale(420 / f.height); p.content.add(f); p.content.add(T(this, 0, 120, `"${S.line[1]}"`, 30, C.ink, { w: 800, wrap: 760 }));
    p.content.add(btn(this, -180, 320, 320, 100, '네, 좋아요!', () => { marry(k); progress('married', 1); save(); audio.play('sfx_levelup', { volume: 0.9 }); audio.duck(3000); p.close(); this.cameras.main.flash(500, 255, 220, 230); this.time.delayedCall(600, () => this.scene.restart()); }, { size: 30, style: 'green' }));
    p.content.add(btn(this, 180, 320, 300, 100, '조금만 더…', () => p.close(), { size: 28, style: 'cream' })); }
  onBack() { return goPrev(this); }
}

// ── 이벤트 화면: 출석 · 축제 · 레이스 · 스티커 · 패스 (위 탭)
import { season, seasonBuy, evDots, LOGIN, login, loginClaim, FEST_TIERS, FEST_R, fest, festClaim, RACE, race, raceJoin, raceState, raceClaim, STICKERS, ALBUM_R, album, openPack, albumClaim, albumAll, PASS_TIERS, PASS_FREE, PASS_PREM, pass, passClaim } from '../events.js?v=0.59.0';
const fmtL = ms => { const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h ? `${h}시간 ${m}분` : `${m}분`; };
export class EventsScene extends Phaser.Scene {
  constructor() { super('Events'); }
  create(data) {
    this.tab = (data && data.tab) || 'season'; this.add.rectangle(W / 2, H / 2, W, H, 0xFFF3E0); top(this, '이벤트');
    const TABS = [['season', '계절', 'gift'], ['login', '출석', 'calendar'], ['fest', '축제', 'ticket'], ['race', '레이스', 'trophy'], ['album', '스티커', 'cardpack'], ['pass', '패스', 'passmedal']];
    iconTabs(this, 230, TABS, this.tab, evDots(), k => this.scene.restart({ tab: k })); this.y0 = 330;
    this[this.tab](); window.__events = this;
  }
  done(ups, msg) { save(); audio.play('sfx_levelup', { volume: 0.7 }); if (msg) toast(this, msg, H / 2); this.time.delayedCall(700, () => this.scene.restart({ tab: this.tab })); }
  // 계절 한정: 토큰으로 한정 장식 교환 · 계절이 끝나면 다시 오지 않아요
  season() { const se = season(), left = Math.max(0, se.end - Date.now()), dd = Math.floor(left / 864e5); let y = banner(this, this.y0, 'ev_fest', `${se.S.ic} ${se.S.n}`, '주문 · 기차 · 수확으로 계절 토큰을 모아 한정 장식과 바꿔요', `${dd}일 남음`) + 50;
    const tg = this.add.graphics(); tg.fillStyle(0x4A2E14, 0.92).fillRoundedRect(W / 2 - 220, y - 40, 440, 80, 40); T(this, W / 2, y, `${se.S.ic} 토큰 ${se.tok}개`, 36, '#FFE27A', { w: 900 }); y += 90;
    se.S.items.forEach(([k, price], i) => { const yy = y + 90 + i * 210, B = BUILDS[k], ok = se.tok >= price, own = (load().lim || {})[k] || 0; card(this, W / 2, yy, W - 80, 190, ok ? 'ready' : 'lock');
      const im = this.add.image(170, yy + 10, k); im.setScale(160 / Math.max(im.width, im.height)); const tag = this.add.graphics(); tag.fillStyle(0xE8507A, 1).fillRoundedRect(70, yy - 92, 110, 40, 20); T(this, 125, yy - 72, '한정', 22, '#FFFFFF', { w: 900 });
      T(this, 290, yy - 40, B.n, 32, C.ink, { ox: 0, w: 900 }); T(this, 290, yy + 4, `매력 +${B.joy}${own ? ` · 보관 ${own}개` : ''}`, 22, C.dim, { ox: 0, w: 800 }); T(this, 290, yy + 50, `${se.S.ic} ${price}`, 30, ok ? C.brown : C.dim, { ox: 0, w: 900 });
      btn(this, W - 170, yy, 220, 90, own ? '놓으러 가기' : '교환', () => { if (!own) { const e = seasonBuy(k); if (e) return toast(this, e, H / 2); save(); audio.play('sfx_levelup', { volume: 0.7 }); } window.__placeNext = k; goPrev(this); }, { size: 28, style: own || ok ? 'green' : 'cream' }); }); }
  // 7일 출석: 날마다 선물 상자 카드 · 오늘은 빛남 · 지난 날은 도장 · 7일째는 큰 보물상자
  login() { const l = login(); let y = banner(this, this.y0, 'ev_login', '7일 출석 선물', '매일 들어오면 선물이 점점 커져요', `${l.day}일째`) + 40;
    LOGIN.forEach((r, i) => { const d = i + 1, big = d === 7, x = big ? W / 2 : 200 + (i % 3) * 340, yy = big ? y + 760 : y + 120 + Math.floor(i / 3) * 290, past = d < l.day || d === l.day && l.got, now = d === l.day && !l.got, w = big ? W - 100 : 310, h = big ? 250 : 260;
      card(this, x, yy, w, h, past ? 'done' : now ? 'ready' : 'lock'); const rb = this.add.graphics(); rb.fillStyle(now ? 0xE8507A : past ? 0x5AAE3C : 0xB89878, 1).fillRoundedRect(x - 80, yy - h / 2 - 18, 160, 46, 23); T(this, x, yy - h / 2 + 5, now ? '오늘' : `${d}일째`, 26, '#FFFFFF', { w: 900 });
      if (big) { const ch = this.add.image(x - 260, yy + 10, 'chest'); ch.setScale(180 / ch.height); rewards(this, x + 110, yy + 10, r, 74); } else { const gi = this.add.image(x, yy - 30, 'gift'); gi.setScale(100 / gi.height); if (!past && !now) gi.setAlpha(0.75); rewards(this, x, yy + 70, r, 52); }
      if (past) doneStamp(this, x + w / 2 - 50, yy - h / 2 + 50); });
    btn(this, W / 2, y + 1000, 480, 120, l.got ? '내일 또 만나요' : '🎁 오늘 선물 받기', () => { const u = loginClaim(); if (u) this.done(u, '선물을 받았어요!'); }, { size: 34, style: l.got ? 'cream' : 'green' }); }
  // 주간 축제: 티켓 진행 막대 + 단계 카드 (받을 수 있음 · 받음 · 남은 티켓)
  fest() { const f = fest(), nxt = FEST_TIERS.find(t => f.pts < t) || FEST_TIERS[FEST_TIERS.length - 1], prv = [...FEST_TIERS].reverse().find(t => f.pts >= t) || 0; let y = banner(this, this.y0, 'ev_fest', f.theme.n, '수확 · 주문 · 기차로 티켓을 모아요 · 주마다 새 축제', `🎟 ${f.pts}`) + 50;
    progressBar(this, 60, y, W - 120, (f.pts - prv) / Math.max(1, nxt - prv), `다음 보상까지 티켓 ${Math.max(0, nxt - f.pts)}장`, 0xF2B632); y += 60;
    FEST_TIERS.forEach((need, i) => { const yy = y + 70 + i * 140, ok = f.pts >= need, got = f.got.includes(i); card(this, W / 2, yy, W - 80, 124, got ? 'done' : ok ? 'ready' : 'lock');
      const tk = this.add.image(110, yy, 'ticket'); tk.setScale(70 / tk.height); T(this, 110, yy + 38, `${need}`, 26, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 6); rewards(this, 300, yy, FEST_R[i], 58, 'l');
      if (got) doneStamp(this, W - 130, yy, 0.8); else if (ok) btn(this, W - 150, yy, 200, 84, '받기', () => { const u = festClaim(i); if (u) this.done(u); }, { size: 30, style: 'green' }); else { lockIc(this, W - 190, yy); T(this, W - 120, yy, `${need - f.pts}장`, 24, C.dim, { w: 900 }); } }); }
  // 이웃 농장 레이스: 참가 전 = 1~3등 시상대 · 참가 중 = 순위판(아바타 · 진행 막대)
  race() { const s = raceState(); let y = banner(this, this.y0, 'ev_race', '이웃 농장 레이스', `24시간 안에 ${RACE.goal}점 먼저! · 주문 2점 · 기차 칸 3점`, s && !s.claimed ? (s.ended ? '끝!' : fmtL(s.left)) : null) + 50;
    if (!s || s.claimed) { [[1, W / 2, 0], [2, W / 2 - 330, 60], [3, W / 2 + 330, 100]].forEach(([n, x, dy]) => { card(this, x, y + 230 + dy, 300, 400 - dy, n === 1 ? 'now' : 'lock'); T(this, x, y + 70 + dy, `${n}등`, 44, n === 1 ? C.gold : C.brown, { w: 900 }).setStroke('#FFFFFF', 6); const tr = this.add.image(x, y + 190 + dy, 'trophy'); tr.setScale((n === 1 ? 150 : 110) / tr.height); if (n > 1) tr.setTint(n === 2 ? 0xD8D8E8 : 0xE8B080); rewards(this, x, y + 330 + dy * 0.5, RACE.rewards[n - 1], 50); });
      btn(this, W / 2, y + 560, 480, 120, '🏁 레이스 참가', () => { if (!raceJoin()) return toast(this, '오늘 레이스는 이미 했어요 · 내일 다시'); save(); this.scene.restart({ tab: 'race' }); }, { size: 34, style: 'green' }); return; }
    s.rows.forEach((r, i) => { const yy = y + 80 + i * 170; card(this, W / 2, yy, W - 80, 150, r.me ? 'now' : 'lock'); T(this, 100, yy, `${i + 1}`, 54, i === 0 ? C.gold : C.brown, { w: 900 }).setStroke('#FFFFFF', 6);
      const av = this.add.image(200, yy + 6, r.me ? 'princess' : `w${1 + (i % 5)}_f1`); av.setScale(120 / av.height); T(this, 270, yy - 34, r.n, 30, C.ink, { ox: 0, w: 900 }); progressBar(this, 270, yy + 24, 560, r.pts / RACE.goal, `${r.pts}/${RACE.goal}`, r.me ? 0xE8507A : 0x7FD35A); });
    if (s.ended) btn(this, W / 2, y + 80 + s.rows.length * 170 + 40, 480, 120, `🏆 ${s.rank}등 보상 받기`, () => { const r = raceClaim(); if (r) this.done(r.ups, '레이스 보상을 받았어요!'); }, { size: 34, style: 'green' }); }
  // 스티커 앨범: 팩 열기 + 세트마다 스티커 판
  album() { const a = album(); let y = banner(this, this.y0, 'ev_album', '스티커 앨범', '주문 4번마다 팩 1개 · 세트를 채우면 보상', a.packs ? `📦 ${a.packs}` : null) + 40;
    const pk = this.add.image(220, y + 80, 'cardpack'); pk.setScale(140 / pk.height); if (a.packs) this.tweens.add({ targets: pk, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: -1 }); T(this, 340, y + 50, `가진 팩 ${a.packs}개`, 32, C.ink, { ox: 0, w: 900 }); T(this, 340, y + 100, '팩마다 스티커 3장', 22, C.dim, { ox: 0, w: 800 });
    btn(this, W - 200, y + 80, 280, 100, '팩 열기', () => this.openP(), { size: 32, style: a.packs ? 'green' : 'cream' }); y += 200;
    STICKERS.forEach((S, i) => { const yy = y + 150 + i * 320, have = S.s.filter(k => a.have[k]).length, full = have === 6, got = a.done.includes(i); card(this, W / 2, yy, W - 80, 290, got ? 'done' : full ? 'ready' : 'lock');
      T(this, 80, yy - 110, S.n, 32, C.ink, { ox: 0, w: 900 }); progressBar(this, 330, yy - 110, 260, have / 6, `${have}/6`); rewards(this, W - 150, yy - 110, S.r, 48);
      S.s.forEach((k, j) => { const x = 140 + j * 160, sg = this.add.graphics(); sg.fillStyle(0xFFFFFF, 1).fillRoundedRect(x - 66, yy - 46, 132, 132, 22).lineStyle(3, a.have[k] ? 0xF2B632 : 0xDDD0C0, 1).strokeRoundedRect(x - 66, yy - 46, 132, 132, 22); const im = icon(this, x, yy + 20, k, 100); if (!a.have[k]) im.setTintFill(0xD8CCC0).setAlpha(0.5); });
      if (got) doneStamp(this, W - 110, yy + 30); else if (full) btn(this, W / 2, yy + 120, 280, 76, '세트 보상 받기', () => { const u = albumClaim(i); if (u) this.done(u, `${S.n} 완성!`); }, { size: 26, style: 'green' }); });
    if (a.done.length === STICKERS.length && !a.all) btn(this, W / 2, y + 150 + STICKERS.length * 320, 560, 110, '📖 앨범 완성 보상', () => { const u = albumAll(); if (u) this.done(u); }, { size: 30, style: 'green' }); }
  openP() { const out = openPack(); if (!out) return toast(this, '팩이 없어요 · 주문을 끝내면 받아요', H / 2); save(); audio.play('sfx_box', { volume: 0.7 }); const p = popup(this, 900, 620, { closable: false }); p.content.add(T(this, 0, -230, '스티커 팩', 44, C.ink, { w: 900 }));
    out.forEach((o, i) => { const x = (i - 1) * 260, c = this.add.container(x, -20), g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-110, -130, 220, 260, 24).lineStyle(5, o.isNew ? 0xF0B65A : 0xE0D0C0, 1).strokeRoundedRect(-110, -130, 220, 260, 24); c.add([g, icon(this, 0, -20, o.it, 140), T(this, 0, 96, o.isNew ? 'NEW!' : '중복', 26, o.isNew ? '#E8507A' : C.dim, { w: 900 })]); c.scaleX = 0; p.content.add(c); this.tweens.add({ targets: c, scaleX: 1, duration: 200, delay: 200 + i * 220, onStart: () => audio.play('sfx_pick', { volume: 0.6 }) }); });
    p.content.add(btn(this, 0, 220, 320, 96, '좋아요', () => { p.close(); this.scene.restart({ tab: 'album' }); }, { size: 30 })); }
  // 시즌 패스: 가운데 진행 줄 · 왼쪽 무료 · 오른쪽 프리미엄(잠김)
  pass() { const ps = pass(); let y = banner(this, this.y0, 'ev_pass', '이달의 시즌 패스', '모든 활동으로 패스 점수를 모아요', `⭐ ${ps.pts}`) + 50;
    T(this, 270, y, '무료', 30, C.brown, { w: 900 }); T(this, 810, y, '프리미엄 · 곧 열려요', 26, '#B0607A', { w: 900 }); y += 40;
    const line = this.add.graphics(), last = PASS_TIERS.length - 1; line.fillStyle(0xDDD0C0, 1).fillRoundedRect(W / 2 - 8, y + 70, 16, last * 150, 8); const reach = PASS_TIERS.filter(t => ps.pts >= t).length; if (reach) line.fillStyle(0xF2B632, 1).fillRoundedRect(W / 2 - 8, y + 70, 16, Math.max(0, reach - 1) * 150 + 20, 8);
    PASS_TIERS.forEach((need, i) => { const yy = y + 70 + i * 150, ok = ps.pts >= need, got = ps.got.includes(i); const nd = this.add.graphics(); nd.fillStyle(ok ? 0xF2B632 : 0xC9B8A6, 1).fillCircle(W / 2, yy, 40).lineStyle(5, 0xFFFFFF, 1).strokeCircle(W / 2, yy, 40); T(this, W / 2, yy, `${need}`, 24, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 5);
      card(this, 270, yy, 400, 130, got ? 'done' : ok ? 'ready' : 'lock'); rewards(this, 230, yy, PASS_FREE[i], 54);
      if (got) doneStamp(this, 420, yy - 20, 0.7); else if (ok) { const z = this.add.zone(270, yy, 400, 130).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { const u = passClaim(i); if (u) this.done(u); }); T(this, 420, yy + 40, '받기', 24, C.green, { w: 900 }); }
      card(this, 810, yy, 400, 130, 'lock'); const pr = rewards(this, 780, yy, PASS_PREM[i], 54); pr.setAlpha(0.45); lockIc(this, 960, yy - 34); }); }
  onBack() { return goPrev(this); }
}

// ── 섬 원정: 덤불·덩굴·그루터기=도끼 · 모래·보물=삽 · 바위=곡괭이 → 칸을 열어 보물 찾기
import { isle, isleHit, isleTool, isleTheme, BOSS } from '../state.js?v=0.59.0';
import { ISLE } from '../data.js?v=0.59.0';
export class IslandScene extends Phaser.Scene {
  constructor() { super('Island'); }
  init() { this.noScroll = true; }
  create() {
    const m = isle(), th = isleTheme(m.n), B = th.boss, bg = this.add.image(W / 2, H / 2, 'island_bg'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(th.tint); top(this, `섬 원정 · ${th.n}`);
    const cs = 150, x0 = (W - cs * ISLE.cols) / 2, y0 = Math.max(320, (H - cs * ISLE.rows) / 2 - 40); this.cs = cs;
    T(this, W / 2, 190, `남은 칸 ${m.cells.filter(Boolean).length} · 가운데 보스 보물: ${B.n}`, 26, '#FFFFFF', { w: 900 }).setStroke('#1E4A6A', 7);
    T(this, W / 2, 232, `보스 보상 ${rewardText(B.r)}  ·  섬 완료 💎25 🧰5 🪙500`, 22, '#FFE27A', { w: 900 }).setStroke('#1E4A6A', 6);
    m.cells.forEach((t, i) => { if (!t || t === 'boss') return; const x = x0 + (i % ISLE.cols) * cs + cs / 2, y = y0 + Math.floor(i / ISLE.cols) * cs + cs / 2, im = icon(this, x, y, t, cs - 4); im.setInteractive({ useHandCursor: true }).on('pointerup', () => this.hit(i, im)); const tl = icon(this, x + 46, y + 46, isleTool(t), 40); tl.setAlpha(0.85); im.tl = tl; });
    // 보스 보물: 2×2 · 빛나는 큰 상자 · 남은 두드림 표시
    if (m.cells[BOSS[0]]) { const bx = x0 + 3 * cs, by = y0 + 4 * cs, glow = this.add.circle(bx, by, cs * 0.95, 0xFFE27A, 0.35); this.tweens.add({ targets: glow, scale: 1.12, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });
      const im = icon(this, bx, by, 'chest', cs * 1.75); im.setTint(th.tint === 0xFFFFFF ? 0xFFFFFF : th.tint); im.setInteractive({ useHandCursor: true }).on('pointerup', () => this.hit(BOSS[0], im)); this.boss = im; this.bossGlow = glow;
      icon(this, bx + cs * 0.7, by + cs * 0.7, B.tool, 64); this.hpG = this.add.graphics(); this.hpT = T(this, bx, by - cs * 0.98, '', 26, '#FFFFFF', { w: 900 }).setStroke('#3E2A14', 7); this.drawHp(); }
    const d = load(), by = Math.min(H - 110, y0 + ISLE.rows * cs + 80); this.toolT = T(this, W / 2, by, '', 32, '#FFFFFF', { w: 900 }).setStroke('#1E4A6A', 8); this.lab();
    T(this, W / 2, by + 56, '도끼 · 삽 · 곡괭이는 대장간에서 만들어요', 22, '#FFFFFF', { w: 900 }).setStroke('#1E4A6A', 6); window.__isle = this;
  }
  drawHp() { const m = isle(), B = isleTheme(m.n).boss, bx = this.boss.x, by = this.boss.y - this.cs * 0.8, w = 34; this.hpG.clear(); for (let k = 0; k < B.hp; k++) { const x = bx + (k - (B.hp - 1) / 2) * (w + 8); this.hpG.fillStyle(0x3E2A14, 0.8).fillRoundedRect(x - w / 2 - 3, by - 13, w + 6, 26, 8).fillStyle(k < m.hp ? 0xFF5A4A : 0x777777, 1).fillRoundedRect(x - w / 2, by - 10, w, 20, 6); } this.hpT.setText(`${B.n} · ${m.hp}/${B.hp}`); }
  lab() { const d = load(); this.toolT.setText(`🪓 도끼 ${d.items.axe || 0}   ⛏ 곡괭이 ${d.items.pickaxe || 0}   🪣 삽 ${d.items.shovel || 0}`); }
  hit(i, im) { const r = isleHit(i); if (!r) return; if (r.need) return toast(this, `${ITEMS[r.need].n}이(가) 필요해요 · 대장간에서 만들어요`, H / 2);
    save(); audio.buzz(12); this.lab();
    if (r.relic) this.time.delayedCall(300, () => toast(this, `🏛 유물 발견! ${RELIC_N[r.relic]} · 박물관에 모여요`, H / 2 + 90));
    if (r.bossHit !== undefined) { audio.play('sfx_drop', { volume: 0.9 }); this.cameras.main.shake(120, 0.006); this.tweens.add({ targets: im, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => im.setAngle(0) }); this.drawHp(); return; }
    audio.play('sfx_drop', { volume: 0.8 }); if (im.tl) im.tl.destroy();
    if (r.boss) { this.hpG.clear(); this.hpT.destroy(); this.bossGlow.destroy(); audio.play('sfx_levelup', { volume: 0.9 }); this.cameras.main.flash(300, 255, 240, 180); this.tweens.add({ targets: im, scale: im.scale * 1.4, alpha: 0, duration: 600, onComplete: () => im.destroy() });
      const p = popup(this, 820, 560); p.content.add(T(this, 0, -190, `${r.boss.n} 열기 성공!`, 38, C.ink, { w: 900 })); p.content.add(icon(this, 0, -60, 'chest', 170)); p.content.add(T(this, 0, 70, rewardText(r.r), 32, C.brown, { w: 900 })); p.content.add(btn(this, 0, 190, 320, 96, '좋아요!', () => p.close(), { size: 30 })); }
    else { this.tweens.add({ targets: im, scale: 0, angle: 30, duration: 250, onComplete: () => im.destroy() });
      if (r.r) { const t = T(this, im.x, im.y, rewardText(r.r), 28, '#FFE27A', { w: 900 }).setStroke('#3E2A14', 6); this.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 1300, delay: 200, onComplete: () => t.destroy() }); audio.play('sfx_coin', { volume: 0.6 }); } }
    if (r.done) { audio.play('sfx_levelup', { volume: 0.8 }); toast(this, '섬을 모두 탐험했어요! 다음 섬으로 ⛵', H / 2); this.time.delayedCall(1600, () => this.scene.restart()); } }
  onBack() { return goPrev(this); }
}

// ── 협동조합: 레가타(주간 팀 경주) · 도움 요청
import { coopDots, coop, standings, weekLeft, takeTask, taskProg, dropTask, tierClaim, prevClaim, helpSend, COOP_TIERS, TIER_R, RANK_R, TASKS_DAY, COOP_LV } from '../coop.js?v=0.59.0';
const fmtH = ms => { const m = Math.floor(ms / 6e4); return m >= 1440 ? `${Math.floor(m / 1440)}일 ${Math.floor(m % 1440 / 60)}시간` : m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
export class CoopScene extends Phaser.Scene {
  constructor() { super('Coop'); }
  create(data) {
    this.tab = (data && data.tab) || 'race'; this.add.rectangle(W / 2, H / 2, W, H, 0xE6F2FA); top(this, '협동조합'); window.__coop = this;
    const cd = coopDots(); [['race', '⛵ 레가타'], ['help', '🤝 도움 요청']].forEach(([k, n], i) => { btn(this, W / 2 - 220 + i * 440, 190, 400, 84, n, () => { if (k !== this.tab) this.scene.restart({ tab: k }); }, { size: 28, style: k === this.tab ? 'gold' : 'cream' }); if (cd[k]) redDot(this, W / 2 - 220 + i * 440 + 186, 156).setDepth(5); });
    if (load().lv < COOP_LV) { T(this, W / 2, H / 2, `레벨 ${COOP_LV}부터 협동조합에 들어갈 수 있어요`, 34, C.ink, { w: 900 }); return; }
    this[this.tab]();
    const pv = load().coopPrev; if (pv) this.time.delayedCall(300, () => { const p = popup(this, 820, 620); p.content.add(T(this, 0, -230, '지난주 레가타 결과', 40, C.ink, { w: 900 })); p.content.add(T(this, 0, -130, `${pv.rank}위 · 내 점수 ${pv.pts}`, 46, pv.rank <= 3 ? '#E8A33A' : C.brown, { w: 900 })); p.content.add(icon(this, 0, 0, 'trophy', 150)); p.content.add(T(this, 0, 110, rewardText(RANK_R[pv.rank - 1]), 30, C.brown, { w: 900 }));
      p.content.add(btn(this, 0, 220, 320, 96, '받기', () => { prevClaim(); save(); audio.play('sfx_levelup'); p.close(); this.scene.restart({ tab: this.tab }); }, { size: 30, style: 'green' })); });
  }
  race() {
    const c = coop(), st = standings(c); let y = 290;
    T(this, W / 2, y, `이번 주 남은 시간 ${fmtH(weekLeft())} · 우리 조합 ${st.rank}위`, 28, C.ink, { w: 900 }); y += 50;
    const maxP = Math.max(1, ...st.rows.map(r => r.pts));
    st.rows.forEach((r, i) => { const yy = y + 40 + i * 78, g = this.add.graphics(); g.fillStyle(r.me ? 0xFFF1C9 : 0xFFFFFF, 1).fillRoundedRect(60, yy - 32, W - 120, 64, 20).lineStyle(r.me ? 4 : 2, r.me ? 0xF0B65A : 0xD0DDE6, 1).strokeRoundedRect(60, yy - 32, W - 120, 64, 20);
      g.fillStyle(r.me ? 0xF0B65A : 0x7FB8DA, 0.35).fillRoundedRect(64, yy - 28, Math.max(20, (W - 128) * r.pts / maxP), 56, 18);
      T(this, 110, yy, `${i + 1}`, 30, i < 3 ? '#E8A33A' : C.dim, { w: 900 }); T(this, 160, yy, r.n, 26, C.ink, { ox: 0, w: 900 }); T(this, W - 90, yy, `${r.pts}`, 28, C.brown, { ox: 1, w: 900 }); });
    y += 40 + st.rows.length * 78 + 10;
    T(this, W / 2, y, `팀원 ${c.mates.map(m => m.n).join(' · ')} · 팀원 점수 ${st.mates}`, 20, C.dim, { w: 900, wrap: 960 }); y += 60;
    // 지금 과제
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(50, y, W - 100, 170, 26).lineStyle(3, 0x7FB8DA, 1).strokeRoundedRect(50, y, W - 100, 170, 26);
    if (c.cur) { const pr = taskProg(); icon(this, 130, y + 85, c.cur.ic, 100); T(this, 200, y + 45, `지금 과제: ${c.cur.d}`, 28, C.ink, { ox: 0, w: 900 }); T(this, 200, y + 88, `⭐ ${c.cur.pts}점 · 남은 시간 ${fmtH(c.cur.end - Date.now())}`, 22, C.dim, { ox: 0, w: 800 });
      const bg = this.add.graphics(); bg.fillStyle(0xE2E8EE, 1).fillRoundedRect(200, y + 118, 560, 26, 13).fillStyle(0x5AAE3C, 1).fillRoundedRect(200, y + 118, Math.max(26, 560 * pr / c.cur.n), 26, 13); T(this, 790, y + 131, `${pr}/${c.cur.n}`, 22, C.ink, { ox: 0, w: 900 });
      btn(this, W - 140, y + 60, 140, 70, '포기', () => { dropTask(); save(); this.scene.restart({ tab: 'race' }); }, { size: 22, style: 'cream' }); }
    else T(this, W / 2, y + 85, `아래에서 과제를 하나 골라요 · 오늘 ${c.dn}/${TASKS_DAY}개`, 28, C.brown, { w: 900 });
    y += 210;
    // 과제 카드 6장
    c.tasks.forEach((t, i) => { const x = 200 + (i % 3) * 340, yy = y + 150 + Math.floor(i / 3) * 320, cg = this.add.graphics(); cg.fillStyle(0xFFFFFF, 1).fillRoundedRect(x - 155, yy - 145, 310, 290, 24).lineStyle(2, 0xD0DDE6, 1).strokeRoundedRect(x - 155, yy - 145, 310, 290, 24);
      icon(this, x, yy - 65, t.ic, 100); T(this, x, yy + 20, t.d, 22, C.ink, { w: 900, wrap: 280 }); T(this, x, yy + 62, `⭐${t.pts} · ${Math.round(t.t / 36e5)}시간`, 20, C.dim, { w: 800 });
      btn(this, x, yy + 110, 200, 64, '받기', () => { const e = takeTask(i); if (e) return toast(this, e, H / 2); save(); audio.play('sfx_tap'); this.scene.restart({ tab: 'race' }); }, { size: 24, style: c.cur ? 'cream' : 'green' }); });
    y += 680;
    // 개인 보상 단계
    T(this, W / 2, y, `내 점수 ${c.myPts} · 점수가 쌓이면 상자를 열어요`, 26, C.ink, { w: 900 }); y += 110;
    COOP_TIERS.forEach((tp, i) => { const x = 140 + i * 200, got = c.got.includes(i), ok = c.myPts >= tp, cg = this.add.graphics(); cg.fillStyle(got ? 0xE3F5DA : ok ? 0xFFF1C9 : 0xFFFFFF, 1).fillRoundedRect(x - 85, y - 70, 170, 190, 22).lineStyle(ok && !got ? 5 : 2, ok && !got ? 0xF0B65A : 0xD0DDE6, 1).strokeRoundedRect(x - 85, y - 70, 170, 190, 22);
      const im = icon(this, x, y - 10, 'chest', 90); if (!ok) im.setAlpha(0.45); T(this, x, y + 62, got ? '받음 ✓' : `⭐${tp}`, 22, got ? C.green : C.brown, { w: 900 }); T(this, x, y + 96, rewardText(TIER_R[i]), 14, C.dim, { w: 800, wrap: 160 });
      if (ok && !got) { const z = this.add.zone(x, y + 25, 170, 190).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { tierClaim(i); save(); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, `🎁 ${rewardText(TIER_R[i])}`, H / 2); this.time.delayedCall(600, () => this.scene.restart({ tab: 'race' })); }); } });
  }
  help() {
    const c = coop(); T(this, W / 2, 300, '조합 팀원들이 물건을 부탁해요 · 매일 새로 와요', 28, C.ink, { w: 900 });
    c.reqs.forEach((q, i) => { const y = 520 + i * 360, m = c.mates[q.who], g = this.add.graphics(), hv = load().items[q.it] || 0; g.fillStyle(q.done ? 0xE3F5DA : 0xFFFFFF, 1).fillRoundedRect(60, y - 150, W - 120, 300, 28).lineStyle(2, 0xD0DDE6, 1).strokeRoundedRect(60, y - 150, W - 120, 300, 28);
      const av = this.add.image(170, y + 40, `w${m.v}_f1`); av.setScale(200 / av.height); T(this, 170, y - 120, m.n, 22, C.brown, { w: 900 });
      T(this, 300, y - 80, `"${ITEMS[q.it].n} ${q.n}개만 보내 줄래요?"`, 28, C.ink, { ox: 0, w: 900 }); icon(this, 360, y + 30, q.it, 110); T(this, 430, y + 30, `${hv}/${q.n}`, 30, hv >= q.n ? C.green : C.red, { ox: 0, w: 900 });
      T(this, 300, y + 110, `보내면 🪙${Math.round(ITEMS[q.it].v * q.n * 1.8 + 20)} · 조합 점수 ⭐8`, 22, C.dim, { ox: 0, w: 800 });
      if (q.done) T(this, W - 190, y + 30, '보냄 ✓', 30, C.green, { w: 900 });
      else btn(this, W - 190, y + 30, 220, 90, '보내기', () => { const r = helpSend(i); if (typeof r === 'string') return toast(this, r, H / 2); save(); audio.play('sfx_coin'); toast(this, `${m.n}: 고마워요! ${rewardText(r.r)}`, H / 2); this.time.delayedCall(700, () => this.scene.restart({ tab: 'help' })); }, { size: 28, style: hv >= q.n ? 'green' : 'cream' }); });
  }
  onBack() { return goPrev(this); }
}
