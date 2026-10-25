// 진행 단계 · 다시 하기 등급(브론즈/실버/골드) · 보상
// 단계는 앞으로만 감(다시 보기로 진행이 되돌아가지 않게) · 이미 지난 단계(숨은 물건 · 증거)는 들어갈 때마다 새 판 = 다시 하기
import { W, H } from './config.js?v=0.45.5';
import { T, C, btn, popup } from './ui.js?v=0.45.5';
import { audio } from './audio.js?v=0.45.5';
import { load, save } from './save.js?v=0.45.5';
import { goPrev } from './nav.js?v=0.45.5';

const ORDER = ['intro', 'hunt', 'mid', 'evidence', 'after', 'toon', 'done'];
export const stepOf = id => (load().ep[id] || {}).step || null;
export function advance(id, step) {
  const d = load(), e = d.ep[id] ||= { step }, cur = ORDER.indexOf(e.step);
  if (cur < 0 || ORDER.indexOf(step) > cur) e.step = step; save();
}
// 그 단계를 이미 끝냈는가 (숨은 물건: mid 이후 · 증거: after 이후)
export const passed = (id, kind) => ORDER.indexOf(stepOf(id)) >= ORDER.indexOf(kind === 'hunt' ? 'mid' : 'after');

export const TIERS = [{ n: '브론즈', c: 0xC98A55, t: '#C98A55' }, { n: '실버', c: 0xC9D2DC, t: '#C9D2DC' }, { n: '골드', c: 0xF0C048, t: '#F0C048' }];
const fmt = s => `${Math.floor(s / 60)}분 ${String(Math.round(s % 60)).padStart(2, '0')}초`;
// 기준: 숨은 물건 = 물건 수 × 초 / 증거 = 초
export function goals(kind, n) {
  return kind === 'hunt' ? { gold: n * 7, silver: n * 12, gText: `힌트 없이 ${fmt(n * 7)} 안에`, sText: `힌트 1번 이하 · ${fmt(n * 12)} 안에` }
    : { gold: 45, silver: 90, gText: '하트 · 힌트 없이 45초 안에', sText: '하트를 잃거나 힌트 쓴 게 1번 이하 · 1분 30초 안에' };
}
export function tierOf(kind, n, sec, slip) {   // slip: 힌트 수 / 잃은 하트 수
  const g = goals(kind, n); return slip === 0 && sec <= g.gold ? 2 : slip <= 1 && sec <= g.silver ? 1 : 0;
}
export const medal = (id, kind) => { const r = ((load().ep[id] || {}).rep || {})[kind]; return r ? r.tier : -1; };

// 기록 + 보상: 새로 오른 등급마다 한 번 (실버: 코인 30 · 별 1 / 골드: 별 2 · 상점 옷 하나 선물), 매 판 코인 5~12
async function reward(id, kind, tier, sec) {
  const d = load(), e = d.ep[id] ||= {}, rep = (e.rep ||= {})[kind] ||= { tier: -1, best: 0, n: 0 }, prev = rep.tier, out = [];
  rep.n++; if (!rep.best || sec < rep.best) rep.best = Math.round(sec);
  const base = [5, 8, 12][tier]; d.coins += base; out.push(`● +${base}`);
  for (let t = prev + 1; t <= tier; t++) {
    if (t === 1) { d.coins += 30; d.stars = (d.stars || 0) + 1; out.push('실버 첫 달성 · ● +30 · ★ +1'); }
    if (t === 2) {
      d.stars = (d.stars || 0) + 2; let gift = null;
      try { const { OUTFITS, ACCS } = await import('./coord/data.js?v=0.45.5'), { coordData, owned } = await import('./coord/state.js?v=0.45.5'); const c = coordData().coord; gift = [...ACCS, ...OUTFITS].find(it => it.get === 'shop' && !owned(it.id)); if (gift) c.own.push(gift.id); } catch { /* */ }
      if (gift) out.push(`골드 첫 달성 · ★ +2 · 코디 선물 「${gift.n}」`); else { d.coins += 60; out.push('골드 첫 달성 · ★ +2 · ● +60'); }
    }
  }
  rep.tier = Math.max(prev, tier); save(); return { out, best: rep.best, prev };
}
// 다시 하기 결과 창
export async function replayResult(scene, { id, kind, n, sec, slip, next }) {
  const tier = tierOf(kind, n, sec, slip), r = await reward(id, kind, tier, sec), g = goals(kind, n), tr = TIERS[tier];
  audio.play('sfx_clear', { volume: 0.7 }); scene.cameras.main.flash(250, 255, 235, 240);
  const p = popup(scene, 880, 1000, { closable: false, onBack: () => goPrev(scene) }), c = p.content;
  c.add(T(scene, 0, -420, kind === 'hunt' ? '단서 찾기 · 다시 하기' : '증거 대조 · 다시 하기', 30, C.dim, { w: 800 }));
  const m = scene.add.container(0, -270), mg = scene.add.graphics(); mg.fillStyle(0x000000, 0.12).fillCircle(4, 8, 100).fillStyle(tr.c, 1).fillCircle(0, 0, 100).lineStyle(8, 0xFFFFFF, 0.7).strokeCircle(0, 0, 84);
  m.add([mg, T(scene, 0, -6, tr.n, 40, '#3A2431', { w: 900 })]); m.setScale(0.3); scene.tweens.add({ targets: m, scale: 1, duration: 420, ease: 'Back.easeOut' }); c.add(m);
  c.add(T(scene, 0, -130, tier > r.prev ? `${tr.n} 등급 달성!` : ['잘했어요!', '훌륭해요!', '완벽해요!'][tier], 44, C.ink, { w: 900 }));
  c.add(T(scene, 0, -70, `기록 ${fmt(sec)} · ${kind === 'hunt' ? `힌트 ${slip}번` : `실수 · 힌트 ${slip}번`} · 최고 ${fmt(r.best)}`, 26, C.brown, { w: 800 }));
  r.out.forEach((t, i) => c.add(T(scene, 0, -10 + i * 42, t, 26, '#C25A80', { w: 800 })));
  const goal = tier < 2 ? `다음 목표 · ${tier < 1 ? `실버: ${g.sText}` : `골드: ${g.gText}`}` : '골드 달성! 기록을 더 줄여 보세요';
  c.add(T(scene, 0, 150, goal, 24, C.dim, { w: 800, wrap: 760 }));
  c.add(btn(scene, -190, 330, 340, 110, '한 번 더', () => scene.scene.restart({ id }), { style: 'cream', size: 32 }));
  c.add(btn(scene, 190, 330, 360, 110, next ? '다음 이야기로' : '나가기', () => next ? scene.scene.start('Story', { id, part: next }) : goPrev(scene), { size: 32 }));
}
