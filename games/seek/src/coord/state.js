// 오늘의 코디 저장 · 판정 (d.coord)
import { save } from '../save.js?v=0.44.2';
import { cafeData, level, epDone, today } from '../cafe/state.js?v=0.44.2';
import { OUTFITS, ACCS, THEMES, JUDGES } from './data.js?v=0.44.2';

export function coordData() {
  const d = cafeData();
  d.coord ||= { own: [], wear: { o: 'o27', hair: null, bag: null, prop: null }, day: '', album: [], seen: 0 };
  return d;
}
export const item = id => OUTFITS.find(o => o.id === id) || ACCS.find(a => a.id === id);
// 가진 옷: 처음부터 · 이야기 화 · 카페 레벨 · 상점에서 산 것
export function owned(id) {
  const it = item(id), c = coordData().coord; if (!it) return false;
  return it.get === 'start' || c.own.includes(id) || (it.get === 'ep' && epDone(it.ep)) || (it.get === 'lv' && level() >= it.lv);
}
export const lockText = it => it.get === 'ep' ? `이야기 ${it.ep.slice(2)}화를 보면` : it.get === 'lv' ? `냥카페 Lv.${it.lv}에서` : `● ${it.price}`;
export function buy(id) { const d = coordData(), it = item(id); if (!it || it.get !== 'shop' || owned(id) || d.coins < it.price) return false; d.coins -= it.price; d.coord.own.push(id); save(); return true; }
// 오늘의 주제: 날짜마다 하나 (30일 순환)
export function todayTheme() { const t = new Date(), n = Math.floor(new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() / 864e5); return { i: n % THEMES.length, ...THEMES[n % THEMES.length] }; }
export const doneToday = () => coordData().coord.day === today();

// 판정: 힌트 분위기(옷 분위기 겹침 0~2) + 숨은 기준 1 + 소품 분위기 1 → 별 1~3 (너그럽게)
export function judge(th, w) {
  const o = item(w.o), accs = ['hair', 'bag', 'prop'].map(k => w[k]).filter(Boolean).map(item);
  const tagHit = th.tags.filter(t => o.s.includes(t)).length, tagMax = th.tags.length;
  const h = th.hid, hid = h.se ? o.se.includes(h.se) : h.c ? o.c === h.c : h.notC ? o.c !== h.notC : h.acc ? accs.some(a => a.id === h.acc) : h.slot ? !!w[h.slot] : false;
  const accHit = accs.some(a => th.tags.includes(a.s));
  const score = tagHit / tagMax * 2 + (hid ? 1 : 0) + (accHit ? 1 : 0);
  const stars = score >= 2.9 ? 3 : score >= 1.9 ? 2 : 1;
  const judges = JUDGES.map(j => {
    const fav = o.s.some(s => j.fav.includes(s)) || accs.some(a => j.fav.includes(a.s));
    let st = stars - (fav ? 0 : 1); if (j.strict && score < 3.9) st -= 1; if (!j.strict && fav && stars >= 2) st = Math.max(st, 3);
    st = Math.max(1, Math.min(3, st)); const lines = j.say[st - 1];
    return { j, st, line: lines[Math.floor(Math.random() * lines.length)] };
  });
  const notes = [...th.tags.map(t => ({ t, ok: o.s.includes(t) })), { t: `숨은 기준 · ${th.hidN}`, ok: hid }];
  return { score, stars, judges, notes, accHit };
}
// 추천 3벌: 가진 옷 중 힌트 분위기에 잘 맞는 순 (숨은 기준은 알려 주지 않음)
export function recommend(th) {
  return OUTFITS.filter(o => owned(o.id)).map(o => ({ o, k: th.tags.filter(t => o.s.includes(t)).length + Math.random() * 0.5 })).sort((a, b) => b.k - a.k).slice(0, 3).map(x => x.o.id);
}
