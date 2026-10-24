// 냥카페 · 별 저장 상태 (save.js 의 같은 저장 묶음 안 d.stars · d.cafe)
import { load, save } from '../save.js?v=0.44.1';
import { SLOTS, CATS, SPOTS, FLOOR, POSES, PEOPLE, levelOf } from './data.js?v=0.44.1';

const HOUR = 3600e3, VISIT_EVERY = 2 * HOUR;
// 처음 쓰는 순간: 이미 본 화만큼 별을 소급 지급 (화당 4) + 시작 선물 3
export function cafeData() {
  const d = load();
  if (d.stars === undefined) { d.stars = 3; for (const e of Object.values(d.ep)) if (e.step === 'done') { e.sg = { h: 2, e: 1, t: 1 }; d.stars += 4; } }
  d.cafe ||= { placed: {}, met: {}, here: [], last: 0, hunt: { day: '', stars: 0 }, tut: 0 };
  return d;
}
export const stars = () => cafeData().stars;
export function addStars(n) { const d = cafeData(); d.stars += n; save(); return d.stars; }
// 한 번만 주는 별 (화별 숨은 물건 · 증거 · 결말)
export function starOnce(epId, key, n) { const d = cafeData(), e = d.ep[epId] ||= {}; e.sg ||= {}; if (e.sg[key]) return 0; e.sg[key] = n; d.stars += n; save(); return n; }

export const placedCount = () => Object.keys(cafeData().cafe.placed).length;
export const level = () => levelOf(placedCount());
export const epDone = id => (load().ep[id] || {}).step === 'done';
// 지금 올 수 있는 고양이: 좋아하는 가구(디자인)가 놓였거나, 특별 손님은 그 화를 봤으면
export function canCome(c) {
  const p = cafeData().cafe.placed;
  if (c.ep) return epDone(c.ep);
  return p[c.like.slot] && (!c.like.theme || p[c.like.slot] === c.like.theme);
}
export const eligible = () => CATS.filter(canCome);
// 만남 기록: 사진(자세)을 하나씩 모음
export function meet(c) {
  const m = cafeData().cafe.met, r = m[c.id] ||= { photos: [], n: 0 }; r.n++;
  const nx = POSES.find(p => !r.photos.includes(p)); if (nx) r.photos.push(nx); save(); return nx;
}
// 카페에 머무는 고양이 자리 정하기: 좋아하는 가구 자리 → 겹치면 빈 바닥
export function seat(ids) {
  const used = new Set(), out = []; let f = 0;
  for (const id of ids) {
    const c = CATS.find(k => k.id === id); if (!c) continue;
    const want = c.like ? c.like.slot : ['bench', 'rug', 'catbed', 'tower'].find(s => cafeData().cafe.placed[s] && !used.has(s));
    let sp = want && cafeData().cafe.placed[want] && !used.has(want) ? SPOTS[want] : null;
    if (sp) used.add(want); else if (f < FLOOR.length) sp = FLOOR[f++]; else continue;
    out.push({ c, ...sp });
  }
  return out;
}
// 자리 비운 사이 다녀간 손님 계산 (2시간마다 1마리 · 최대 3) — 처음 들어오면 시간만 기록
export function awayVisits(now = Date.now()) {
  const d = cafeData(), cf = d.cafe;
  if (!cf.last) { cf.last = now; save(); return null; }
  const n = Math.min(3, Math.floor((now - cf.last) / VISIT_EVERY)); if (n < 1) return null;
  const pool = eligible(); if (!pool.length) { cf.last = now; save(); return null; }
  // 아직 못 만난 고양이를 먼저 · 희귀는 덜 자주
  const pick = [], left = [...pool];
  for (let i = 0; i < n && left.length; i++) {
    const wts = left.map(c => (cf.met[c.id] ? 1 : 3) * (c.rare ? 0.6 : 1)), sum = wts.reduce((a, b) => a + b, 0); let r = Math.random() * sum, k = 0;
    while (r > wts[k]) r -= wts[k++]; pick.push(left.splice(Math.min(k, left.length - 1), 1)[0]);
  }
  const res = pick.map(c => { const isNew = !cf.met[c.id], photo = meet(c), gift = c.special ? 20 : c.rare ? 15 : 5 + Math.floor(Math.random() * 6); return { c, isNew, photo, gift }; });
  d.coins += res.reduce((a, r) => a + r.gift, 0);
  // 다녀간 고양이가 지금 카페에 머묾 (최대 6)
  cf.here = [...new Set([...res.map(r => r.c.id), ...cf.here])].filter(id => canCome(CATS.find(c => c.id === id))).slice(0, 6);
  // 이야기 인물 한 명 (그 화를 본 뒤부터, 40%)
  const ppl = PEOPLE.filter(p => epDone(p.ep)); let person = null;
  if (ppl.length && Math.random() < 0.4) { const p = ppl[Math.floor(Math.random() * ppl.length)]; person = { ...p, line: p.t[Math.floor(Math.random() * p.t.length)] }; }
  cf.last = now; save();
  return { res, person };
}
export const today = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
export const slotOf = id => SLOTS.find(s => s.id === id);
