// 이안의 마을 순찰 — 시안 ③: 마을 그림 속 숨은 불량배 3명 + 잃어버린 물건 2개 찾기 (90초 · 힌트 · 틀리게 누르면 5초 깎임)
import { W, H } from './config.js?v=0.59.2';
import { T, C, btn } from './ui.js?v=0.59.2';
import { audio } from './audio.js?v=0.59.2';

// 숨을 자리 (배경 1024×1536 기준): [x, y, 크기, 아래를 가리는 정도(0~1)]
const SPOTS = [[350, 300, 120, 0.45], [560, 330, 110, 0.4], [300, 520, 110, 0.5], [740, 460, 105, 0.35], [430, 800, 110, 0.45], [610, 570, 100, 0.5], [180, 420, 100, 0.4], [720, 1250, 110, 0.45], [520, 1100, 100, 0.4], [900, 1310, 110, 0.4], [130, 1020, 100, 0.3], [820, 240, 110, 0.4]];
const ITEMS = [[260, 690, 80], [870, 760, 80], [600, 1370, 80], [420, 1430, 80], [100, 760, 80], [940, 1110, 80], [330, 1230, 80], [700, 980, 80]];
const LOST = ['lost_coins', 'lost_ribbon', 'lost_key', 'lost_duck', 'lost_hat'], NM = { bully1: '불량배', bully2: '불량배', bully3: '불량배', lost_coins: '코인 자루', lost_ribbon: '빨간 리본', lost_key: '옛 열쇠', lost_duck: '고무 오리', lost_hat: '밀짚모자' };
export function ptOpen(sc, onEnd) {
  const root = sc.add.container(0, 0).setDepth(1500), k = Math.max(W / 1024, (H - 330) / 1536), top = 160, mx = x => W / 2 + (x - 512) * k, my = y => top + y * k;
  root.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x76B843)); const bg = sc.add.image(W / 2, top, 'patrol_bg').setOrigin(0.5, 0); bg.setScale(k); root.add(bg);
  const tap = sc.add.zone(W / 2, H / 2, W, H).setInteractive(); root.add(tap);
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const sp = shuffle(SPOTS).slice(0, 3), it = shuffle(ITEMS).slice(0, 2), lost = shuffle(LOST).slice(0, 2);
  const targets = [...sp.map((s, i) => ({ key: 'bully' + (i + 1), x: mx(s[0]), y: my(s[1]), size: s[2] * k, cut: s[3] })), ...it.map((s, i) => ({ key: lost[i], x: mx(s[0]), y: my(s[1]), size: s[2] * k, cut: 0 }))];
  for (const t of targets) { const im = sc.add.image(t.x, t.y, t.key); im.setScale(t.size / Math.max(im.width, im.height)); if (t.cut) im.setCrop(0, 0, im.width, im.height * (1 - t.cut)); if (t.key.startsWith('bully')) { im.setAlpha(0.96); sc.tweens.add({ targets: im, y: t.y - 6, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } else im.setAngle(Math.random() * 40 - 20); root.add(im); t.im = im; }
  // 위: 시간 · 제목 · 찾은 수
  const hd = sc.add.graphics(); hd.fillStyle(0x4A2E14, 0.95).fillRoundedRect(20, 30, W - 40, 120, 40).lineStyle(6, 0xE8C27A, 1).strokeRoundedRect(20, 30, W - 40, 120, 40); root.add(hd);
  const tT = T(sc, 130, 90, '', 42, '#FFFFFF', { w: 900 }); root.add([T(sc, 60, 90, '⏱', 36, '#FFE27A', { w: 900 }), tT, T(sc, W / 2, 72, '이안의 마을 순찰', 36, '#FFFFFF', { w: 900 }), T(sc, W / 2, 114, '불량배와 잃어버린 물건을 찾아요', 22, '#FFE27A', { w: 900 })]);
  const fT = T(sc, W - 110, 90, '', 44, '#FFFFFF', { w: 900 }); root.add(fT);
  // 아래: 이안 · 말풍선 · 찾을 목록 · 힌트
  const pb = sc.add.graphics(); pb.fillStyle(0xFFF6E0, 0.97).fillRoundedRect(20, H - 190, W - 40, 170, 34).lineStyle(6, 0xC9A27A, 1).strokeRoundedRect(20, H - 190, W - 40, 170, 34); root.add(pb);
  const slots = targets.map((t, i) => { const x = 330 + i * 140, y = H - 105, g = sc.add.graphics(); g.fillStyle(0xFFFFFF, 1).fillRoundedRect(x - 62, y - 62, 124, 124, 24).lineStyle(4, 0xD8C8B0, 1).strokeRoundedRect(x - 62, y - 62, 124, 124, 24); const im = sc.add.image(x, y, t.key); im.setScale(100 / Math.max(im.width, im.height)).setTintFill(0x9A8A78); root.add([g, im]); return { g, im, x, y }; });
  const ian = sc.add.image(130, H - 20, 'ian').setOrigin(0.5, 1); ian.setScale(380 / ian.height); root.add(ian);
  const bub = sc.add.graphics(); bub.fillStyle(0xFFFBF2, 0.98).fillRoundedRect(230, H - 330, 480, 116, 36).lineStyle(4, 0xE8C27A, 1).strokeRoundedRect(230, H - 330, 480, 116, 36).fillTriangle(240, H - 240, 280, H - 250, 236, H - 205); root.add(bub);
  const tip = T(sc, 470, H - 272, '잘 살펴보세요!\n숨은 곳에서 엿보고 있어요', 30, C.ink, { w: 900 }); root.add(tip);
  const st = { end: Date.now() + 90000, found: 0, hints: 2, done: false };
  const hb = btn(sc, W - 150, H - 280, 250, 104, `🔍 힌트 ${st.hints}`, () => { if (st.done || !st.hints) return; const t = targets.find(t => !t.ok); if (!t) return; st.hints--; hb.setLabel(`🔍 힌트 ${st.hints}`); const r = sc.add.circle(t.x, t.y, 260, 0xFFE27A, 0).setStrokeStyle(10, 0xFFE27A, 0.9); root.add(r); sc.tweens.add({ targets: r, radius: 90, alpha: 0.2, duration: 1400, onComplete: () => r.destroy() }); audio.play('sfx_merge', { volume: 0.5 }); }, { size: 32, style: 'green' }); root.add(hb);
  root.add(btn(sc, W - 70, 220, 84, 84, '✕', () => finish(false), { size: 32, style: 'cream' }));
  const found = t => { t.ok = true; st.found++; audio.play('sfx_coin', { volume: 0.7 }); audio.buzz(15); const ring = sc.add.circle(t.x, t.y, t.size * 0.75, 0xFFE27A, 0).setStrokeStyle(9, 0xFFD23A, 1); root.add(ring); sc.tweens.add({ targets: ring, scale: { from: 1.6, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    for (let i = 0; i < 8; i++) { const sp2 = T(sc, t.x, t.y, '✨', 30, '#000', { w: 900 }); root.add(sp2); const a = i * Math.PI / 4; sc.tweens.add({ targets: sp2, x: t.x + Math.cos(a) * 110, y: t.y + Math.sin(a) * 110, alpha: 0, duration: 600, onComplete: () => sp2.destroy() }); }
    const s = slots[targets.indexOf(t)]; s.im.clearTint(); s.g.clear().fillStyle(0xE6F4DC, 1).fillRoundedRect(s.x - 62, s.y - 62, 124, 124, 24).lineStyle(5, 0x5AAE3C, 1).strokeRoundedRect(s.x - 62, s.y - 62, 124, 124, 24); { const ck = sc.add.circle(s.x, s.y + 50, 22, 0x5AAE3C).setStrokeStyle(4, 0xFFFFFF); root.add([ck, T(sc, s.x, s.y + 48, '✓', 28, '#FFFFFF', { w: 900 })]); }
    tip.setText(t.key.startsWith('bully') ? '찾았다! 거기 숨어 있었군!' : `${NM[t.key]}를 찾았어요!`); if (st.found === targets.length) finish(true); };
  tap.on('pointerup', p => { if (st.done) return; const t = targets.find(t => !t.ok && Math.hypot(p.x - t.x, p.y - t.y) < Math.max(70, t.size * 0.65)); if (t) return found(t);
    st.end -= 5000; audio.play('sfx_error', { volume: 0.4 }); const x = T(sc, p.x, p.y, '✗ -5초', 34, '#E8352E', { w: 900 }).setStroke('#FFFFFF', 6); root.add(x); sc.tweens.add({ targets: x, y: p.y - 70, alpha: 0, duration: 700, onComplete: () => x.destroy() }); });
  const finish = win => { if (st.done) return; st.done = true; const left = Math.max(0, st.end - Date.now()), stars = !win ? 0 : left > 45000 ? 3 : left > 20000 ? 2 : 1; sc.time.delayedCall(win ? 900 : 200, () => { root.destroy(); onEnd({ win, stars, found: st.found, total: targets.length, lost: targets.filter(t => t.ok && !t.key.startsWith('bully')).map(t => t.key) }); }); };
  const tick = () => { if (st.done) return; const s = Math.max(0, Math.ceil((st.end - Date.now()) / 1000)); tT.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).setColor(s <= 15 ? '#FF8A7A' : '#FFFFFF'); fT.setText(`${st.found}/${targets.length}`); if (s <= 0) finish(false); };
  sc.events.on('update', tick); root.once('destroy', () => sc.events.off('update', tick)); window.__pt = { targets, st }; return st; }
