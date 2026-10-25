// 샘의 참새 쫓기 — 마을 화면 위에서 바로 하는 놀이 (장면 전환 없음)
//  · 30초 동안 내 밭에 참새가 내려앉음 · 눌러서 쫓거나 문질러서 한꺼번에 쫓음
//  · 참새가 3.5초 동안 쪼면 그 밭은 망침 · 허수아비(장식) 2칸 안의 밭엔 오지 않음
//  · 끝나면 지킨 밭은 다음 수확 때 1개 더 (f.bonus)
import { BUILDS } from './data.js?v=0.48.1';
import { iso, TW, TH } from './scenes/Town.js?v=0.48.1';
import { audio } from './audio.js?v=0.48.1';

export const SP = { secs: 30, peck: 3500, maxBirds: 9 };
export function spStart(t) {
  const d = t.d, crows = d.objs.filter(o => o.b === 'scarecrow'), allF = d.objs.filter(o => o.b === 'field'); if (!allF.length) return '밭이 있어야 해요';
  // 붙어 있는 밭 묶음 중 가장 큰 것 (최대 12칸) → 그 묶음을 화면 가득 크게
  const seen = new Set(), groups = []; for (const f of allF) { if (seen.has(f.id)) continue; const g = [], q = [f]; seen.add(f.id); while (q.length) { const a = q.pop(); g.push(a); for (const b of allF) if (!seen.has(b.id) && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1) { seen.add(b.id); q.push(b); } } groups.push(g); }
  groups.sort((a, b) => b.length - a.length); const fields = groups[0].slice(0, 12);
  const safe = f => crows.some(c => Math.max(Math.abs(c.x - f.x), Math.abs(c.y - f.y)) <= 2);
  const targets = fields.filter(f => !safe(f));
  // 밭이 다 보이게 카메라 맞춤
  const pts = fields.map(f => iso(f.x + 0.5, f.y + 0.5)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cam = t.cameras.main;
  const w = Math.max(...xs) - Math.min(...xs) + TW * 2, h = Math.max(...ys) - Math.min(...ys) + TH * 4; t.spPrev = { z: cam.zoom, x: cam.midPoint.x, y: cam.midPoint.y };
  const z = Phaser.Math.Clamp(Math.min(1000 / w, (t.scale.height - 760) / h), 1.05, 1.8); cam.zoomTo(z, 400); cam.pan((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2 + 40, 400, 'Sine.easeInOut');
  t.select(null); t.sp = { end: Date.now() + SP.secs * 1000 + 600, birds: [], next: Date.now() + 900, chased: 0, lost: new Set(), hit: new Set(), targets, safe: fields.filter(safe), all: fields };
  for (const c of crows) { if (!fields.some(f => Math.max(Math.abs(c.x - f.x), Math.abs(c.y - f.y)) <= 2)) continue; const [x, y] = iso(c.x + 0.5, c.y + 0.5), g = t.add.ellipse(x, y, TW * 5, TH * 5, 0x8BE36A, 0.16).setStrokeStyle(6, 0x8BE36A, 0.75); g.dk = -0.4; t.layer.add(g); t.tweens.add({ targets: g, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 }); (t.sp.rings = t.sp.rings || []).push(g); }
  t.sp.trail = t.add.graphics(); t.sp.trail.dk = 999999; t.layer.add(t.sp.trail); t.sp.pts = [];
  return null; }
function spawn(t) { const s = t.sp, free = s.targets.filter(f => !s.lost.has(f.id) && !s.birds.some(b => b.f === f && b.state !== 'flee')); if (!free.length) return;
  const f = free[Math.floor(Math.random() * free.length)], [x, y] = iso(f.x + 0.5, f.y + 0.5), from = [x + (Math.random() < 0.5 ? -1 : 1) * 700, y - 700];
  const im = t.add.image(from[0], from[1], 'sparrow').setDisplaySize(100, 87).setFlipX(from[0] > x); im.dk = 99999; t.layer.add(im);
  const b = { im, f, state: 'fly', x, y: y - 6 }; s.birds.push(b); s.hit.add(f.id);
  t.tweens.add({ targets: im, x, y: b.y, duration: 850, ease: 'Sine.easeOut', onComplete: () => { if (b.state !== 'fly') return; b.state = 'peck'; b.t = Date.now() + SP.peck; b.bob = t.tweens.add({ targets: im, angle: { from: -8, to: 14 }, duration: 180, yoyo: true, repeat: -1 }); audio.play('sfx_tap', { volume: 0.25 }); } });
  b.flap = t.tweens.add({ targets: im, scaleY: im.scaleY * 0.8, duration: 110, yoyo: true, repeat: 7 }); }
function flee(t, b, by) { if (b.state === 'flee') return; const was = b.state; b.state = 'flee'; b.bob && b.bob.stop(); b.flap && b.flap.stop(); if (by) { t.sp.chased++; audio.play('sfx_bubble', { volume: 0.5 }); audio.buzz(8);
    const puff = t.add.circle(b.im.x, b.im.y, 20, 0xFFFFFF, 0.8); puff.dk = 99999; t.layer.add(puff); t.tweens.add({ targets: puff, scale: 3, alpha: 0, duration: 300, onComplete: () => puff.destroy() }); }
  const dir = Math.random() < 0.5 ? -1 : 1; b.im.setFlipX(dir < 0); t.tweens.add({ targets: b.im, x: b.im.x + dir * 800, y: b.im.y - 900, angle: dir * 20, duration: 700, ease: 'Sine.easeIn', onComplete: () => b.im.destroy() }); }
// 누르기 · 문지르기: 손가락 근처의 참새를 쫓음
export function spPoint(t, sx, sy) { const w0 = t.cameras.main.getWorldPoint(sx, sy); t.sp.pts.push({ x: w0.x, y: w0.y, at: Date.now() }); const w = w0, r = 70 / t.cameras.main.zoom + 30; let n = 0; for (const b of t.sp.birds) if (b.state !== 'flee' && Math.hypot(b.im.x - w.x, b.im.y - 20 - w.y) < r) { flee(t, b, true); n++; } return n; }
export function spTick(t) { const s = t.sp, now = Date.now();
  if (now >= s.next && now < s.end - 1200 && s.birds.filter(b => b.state !== 'flee').length < SP.maxBirds) { spawn(t); const k = 1 - (s.end - now) / (SP.secs * 1000); s.next = now + 950 - k * 550; if (k > 0.5 && Math.random() < 0.35) spawn(t); }
  for (const b of s.birds) if (b.state === 'peck' && now >= b.t) { s.lost.add(b.f.id); flee(t, b, false); const [x, y] = iso(b.f.x + 0.5, b.f.y + 0.5), m = t.add.text(x, y - 40, '😢', { fontSize: '44px' }).setOrigin(0.5); m.dk = 99999; t.layer.add(m); t.tweens.add({ targets: m, y: y - 110, alpha: 0, duration: 900, onComplete: () => m.destroy() }); }
  s.birds = s.birds.filter(b => b.im.active); t.layer.sort('dk');
  s.pts = s.pts.filter(p => now - p.at < 260); const tr = s.trail; tr.clear(); for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i], k = 1 - (now - b.at) / 260; tr.lineStyle(26 * k + 4, 0xFFFFFF, 0.55 * k).lineBetween(a.x, a.y, b.x, b.y); }
  return now >= s.end ? 'done' : null; }
export function spFinish(t) { const s = t.sp; for (const b of s.birds) flee(t, b, false); for (const g of s.rings || []) g.destroy(); s.trail.destroy();
  const kept = s.all.filter(f => !s.lost.has(f.id)); for (const f of kept) if (s.hit.has(f.id) || s.safe.includes(f)) f.bonus = 1;
  const res = { chased: s.chased, lost: s.lost.size, kept: kept.length, total: s.all.length }; t.sp = null; const pv = t.spPrev; if (pv) { t.cameras.main.zoomTo(pv.z, 400); t.cameras.main.pan(pv.x, pv.y, 400); } t.drawObjs(); return res; }
