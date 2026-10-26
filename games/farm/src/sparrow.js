// 샘의 참새 쫓기 — 시안 그대로: 마을 풍경 한가운데 잘 익은 밭 3×4칸 · 참새 떼 · 샘 · '보호된 밭' 나무판
//  마을 화면(Hud) 위에 바로 띄움 (장면 전환 · 로딩 없음)
//  · 30초 · 참새를 눌러서, 여러 마리는 문질러서 쫓음 · 3.5초 동안 쪼면 그 밭은 망침
//  · 허수아비 초록 원 안의 밭엔 참새가 못 옴 · 지킨 밭만큼 밀·옥수수를 거둠
import { W, H } from './config.js?v=0.58.0';
import { T, C, btn } from './ui.js?v=0.58.0';
import { audio } from './audio.js?v=0.58.0';

export const SP = { secs: 30, peck: 3500, maxBirds: 9 };
// 배경 그림(1024×1536) 속 밭 13칸의 가운데 (w: 밀 · c: 옥수수)
const PLOTS = [[230, 461, 'w'], [474, 365, 'c'], [653, 454, 'w'], [410, 589, 'w'], [192, 691, 'c'], [755, 627, 'c'], [550, 755, 'c'], [294, 858, 'w'], [819, 819, 'w'], [602, 973, 'w'], [397, 1062, 'c'], [614, 1165, 'c'], [883, 998, 'c']];
const CROW = 7;   // 허수아비가 선 밭
export function spOpen(sc, onEnd) {
  const root = sc.add.container(0, 0).setDepth(1500), k = Math.min(Math.max(W / 1024, (H - 120) / 1536), 1.38), map = (x, y) => [W / 2 + (x - 537) * k, y * k];   // 밭 묶음 가운데(537)를 화면 가운데로
  root.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x76B843));
  const bg = sc.add.image(W / 2 - (537 - 512) * k, 0, 'sparrow_bg').setOrigin(0.5, 0); bg.setScale(k); root.add(bg);
  const blocker = sc.add.zone(W / 2, H / 2, W, H).setInteractive(); root.add(blocker);
  const [cx0, cy0] = map(PLOTS[CROW][0], PLOTS[CROW][1]);
  const tiles = PLOTS.map(([x, y, w], i) => { const [sx, sy] = map(x, y); return { x: sx, y: sy, w, r: w === 'w' ? 0 : 2, id: i, safe: Math.hypot(sx - cx0, (sy - cy0) * 1.6) < 300 * k, lost: false, hit: false, mark: null }; });
  // 허수아비 + 초록 보호 원 (시안처럼)
  const ring = sc.add.ellipse(cx0, cy0 + 20 * k, 330 * k, 175 * k, 0x9BF06A, 0.2).setStrokeStyle(8, 0xB6FF7A, 0.95); root.add(ring); sc.tweens.add({ targets: ring, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
  const scare = sc.add.image(cx0, cy0 + 30 * k, 'scarecrow').setOrigin(0.5, 0.92); scare.setScale(210 * k / scare.height); root.add(scare); sc.tweens.add({ targets: scare, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1 });
  const birdsL = sc.add.container(0, 0); root.add(birdsL); const trail = sc.add.graphics(); root.add(trail);
  // 위: 시간 · 쫓은 수 알약
  const pill = (x, w, k) => { const g = sc.add.graphics(); g.fillStyle(0x4A2E14, 0.94).fillRoundedRect(x - w / 2, 40, w, 108, 54).lineStyle(6, 0xE8C27A, 1).strokeRoundedRect(x - w / 2, 40, w, 108, 54); root.add(g); const ic = k === 'clock' ? T(sc, x - w / 2 + 52, 92, '⏱', 52, '#FFE27A', { w: 900 }) : sc.add.image(x - w / 2 + 52, 92, k); if (ic.setScale && k !== 'clock') ic.setScale(64 / Math.max(ic.width, ic.height)); root.add(ic); const t = T(sc, x + 24, 94, '', 50, '#FFFFFF', { w: 900 }); root.add(t); return t; };
  const tT = pill(W / 2 - 180, 280, 'clock'), sT = pill(W / 2 + 130, 240, 'wheat');
  root.add(btn(sc, W - 90, 92, 92, 92, '✕', () => { st.end = 0; }, { size: 36, style: 'cream' }));
  // 아래: 샘 · 말풍선 · 보호된 밭 나무판
  const pb = sc.add.graphics(); pb.fillStyle(0x6A4626, 0.97).fillRoundedRect(250, H - 196, W - 280, 160, 34).lineStyle(6, 0xC9A27A, 1).strokeRoundedRect(250, H - 196, W - 280, 160, 34); root.add(pb);
  root.add(T(sc, 300, H - 160, '보호한 밭', 32, '#FFE27A', { ox: 0, w: 900 })); const bar = sc.add.graphics(); root.add(bar);
  const bdg = sc.add.graphics(); bdg.fillStyle(0xF2B632, 1).fillRoundedRect(W - 160, H - 178, 120, 120, 28).lineStyle(5, 0xFFE27A, 1).strokeRoundedRect(W - 160, H - 178, 120, 120, 28); root.add(bdg); const badge = sc.add.image(W - 100, H - 118, 'scarecrow'); badge.setScale(100 / badge.height); root.add(badge);
  const bub = sc.add.graphics(); bub.fillStyle(0xFFFBF2, 0.98).fillRoundedRect(270, H - 430, 620, 170, 44).lineStyle(5, 0xE8C27A, 1).strokeRoundedRect(270, H - 430, 620, 170, 44).fillStyle(0xFFFBF2, 0.98).fillTriangle(250, H - 330, 290, H - 370, 290, H - 300); root.add(bub);
  const tip = T(sc, 580, H - 345, '참새를 눌러서 쫓아요!\n여러 마리는 문질러서 한꺼번에!', 36, C.ink, { w: 900 }); root.add(tip);
  const sam = sc.add.image(130, H, 'sam').setOrigin(0.5, 1); sam.setScale(520 / sam.height); root.add(sam);
  sc.time.delayedCall(5000, () => tip.active && tip.setText('허수아비가 지키는 밭은\n안심이에요!'));
  const st = { end: Date.now() + SP.secs * 1000 + 700, next: Date.now() + 800, birds: [], chased: 0, tiles, pts: [], done: false };
  const sprouts = []; const draw = () => { const n = tiles.length, w = (W - 490) / n; bar.clear(); tiles.forEach((t, i) => { const x = 300 + i * w; bar.fillStyle(t.lost ? 0x4A2E14 : 0x6CC33A, 1).fillRoundedRect(x, H - 122, w - 6, 56, 10).lineStyle(3, t.lost ? 0x2E1C0C : 0xB6F07A, 0.9).strokeRoundedRect(x, H - 122, w - 6, 56, 10); if (!sprouts[i]) { sprouts[i] = T(sc, x + (w - 6) / 2, H - 94, '🌱', 26, '#000', { w: 900 }); root.add(sprouts[i]); } sprouts[i].setAlpha(t.lost ? 0.15 : 1); }); };
  const spawn = () => { const free = tiles.filter(t => !t.safe && !t.lost && !st.birds.some(b => b.t === t && b.state !== 'flee')); if (!free.length) return; const t = free[Math.floor(Math.random() * free.length)], fx = t.x + (Math.random() < 0.5 ? -1 : 1) * (500 + Math.random() * 300), fy = t.y - 700;
    const im = sc.add.image(fx, fy, 'sparrow').setDisplaySize(118 * k, 102 * k).setFlipX(fx > t.x); birdsL.add(im); const b = { im, t, state: 'fly' }; st.birds.push(b); t.hit = true; birdsL.sort('y');
    b.flap = sc.tweens.add({ targets: im, scaleY: im.scaleY * 0.75, duration: 100, yoyo: true, repeat: 8 });
    sc.tweens.add({ targets: im, x: t.x + (Math.random() - 0.5) * 110 * k, y: t.y - 20 * k + (Math.random() - 0.5) * 50 * k, duration: 800, ease: 'Sine.easeOut', onComplete: () => { if (b.state !== 'fly') return; b.state = 'peck'; b.at = Date.now() + SP.peck; b.bob = sc.tweens.add({ targets: im, angle: { from: -6, to: 16 }, duration: 170, yoyo: true, repeat: -1 }); } }); };
  const flee = (b, by) => { if (b.state === 'flee') return; b.state = 'flee'; b.bob && b.bob.stop(); b.flap && b.flap.stop(); if (by) { st.chased++; audio.play('sfx_bubble', { volume: 0.5 }); audio.buzz(8); const puff = sc.add.circle(b.im.x, b.im.y, 26, 0xFFFFFF, 0.85); root.add(puff); sc.tweens.add({ targets: puff, scale: 3, alpha: 0, duration: 320, onComplete: () => puff.destroy() }); }
    const d = Math.random() < 0.5 ? -1 : 1; b.im.setFlipX(d < 0); sc.tweens.add({ targets: b.im, x: b.im.x + d * 700, y: b.im.y - 900, angle: d * 20, duration: 700, ease: 'Sine.easeIn', onComplete: () => b.im.destroy() }); };
  const point = (x, y) => { st.pts.push({ x, y, at: Date.now() }); for (const b of st.birds) if (b.state !== 'flee' && Math.hypot(b.im.x - x, b.im.y - y) < 100) flee(b, true); };
  blocker.on('pointerdown', p => point(p.x, p.y)); blocker.on('pointermove', p => { if (p.isDown) point(p.x, p.y); });
  const tick = () => { if (st.done) return; const now = Date.now();
    if (now >= st.next && now < st.end - 1200 && st.birds.filter(b => b.state !== 'flee').length < SP.maxBirds) { spawn(); const k = 1 - (st.end - now) / (SP.secs * 1000); st.next = now + 900 - k * 520; if (k > 0.4 && Math.random() < 0.4) spawn(); }
    for (const b of st.birds) if (b.state === 'peck' && now >= b.at) { b.t.lost = true; { const m2 = sc.add.ellipse(b.t.x, b.t.y, 220 * k, 110 * k, 0x5A3A1E, 0.55); root.addAt(m2, 3); } flee(b, false); const m = T(sc, b.t.x, b.t.y - 60, '😢', 54, '#000', { w: 900 }); root.add(m); sc.tweens.add({ targets: m, y: m.y - 90, alpha: 0, duration: 900, onComplete: () => m.destroy() }); audio.play('sfx_error', { volume: 0.4 }); }
    st.birds = st.birds.filter(b => b.im.active);
    st.pts = st.pts.filter(p => now - p.at < 260); trail.clear(); for (let i = 1; i < st.pts.length; i++) { const a = st.pts[i - 1], c = st.pts[i], k = 1 - (now - c.at) / 260; trail.lineStyle(34 * k + 6, 0xFFFFFF, 0.6 * k).lineBetween(a.x, a.y, c.x, c.y); }
    const left = Math.max(0, Math.ceil((st.end - now) / 1000)); tT.setText(`0:${String(Math.min(SP.secs, left)).padStart(2, '0')}`).setColor(left <= 5 ? '#FF8A7A' : '#FFFFFF'); sT.setText(`${st.chased}`); draw();
    if (now >= st.end) { st.done = true; for (const b of st.birds) flee(b, false); const kept = tiles.filter(t => !t.lost); sc.time.delayedCall(500, () => { root.destroy(); onEnd({ chased: st.chased, lost: tiles.length - kept.length, kept: kept.length, total: tiles.length, wheat: kept.filter(t => t.w === 'w').length, corn: kept.filter(t => t.w === 'c').length }); }); } };
  sc.events.on('update', tick); root.once('destroy', () => sc.events.off('update', tick));
  draw(); sc.time.delayedCall(250, spawn); sc.time.delayedCall(450, spawn); sc.time.delayedCall(650, spawn); return st; }
