// 장비 그림 칸 · 등급 효과 설명 (홈 · 결과 화면이 같이 씀)
import { T } from './pui.js?v=0.17.8';
import { SLOT, SETS, TIERS, MERGE, itemName, itemIcon, slotMain } from './core/data.js?v=0.17.8';

export const hex = c => '#' + c.toString(16).padStart(6, '0');
// 등급 색 테두리 + 그림 + (+1 같은 단계 표시)
export function itemBox(sc, x, y, it, size = 150, opt = {}) {
  const c = sc.add.container(x, y), col = TIERS[it.t].col, g = sc.add.graphics(), r = size * 0.16;
  g.fillStyle(0x0E1030, 0.9).fillRoundedRect(-size / 2, -size / 2, size, size, r).fillStyle(col, 0.28).fillRoundedRect(-size / 2, -size / 2, size, size, r).lineStyle(Math.max(3, size / 30), col, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, r);
  const im = sc.add.image(0, 0, itemIcon(it)); im.setScale(size * 0.78 / Math.max(im.width, im.height));
  c.add([g, im]);
  const plus = TIERS[it.t].name.match(/\+\d/); if (plus) c.add(T(sc, size / 2 - 8, -size / 2 + 18, plus[0], size * 0.16, '#FFFFFF', { ox: 1, w: 900, stroke: '#14102A', thick: 5 }));
  if (opt.eq) c.add(T(sc, -size / 2 + 10, -size / 2 + 18, 'E', size * 0.15, '#8AF07A', { ox: 0, w: 900, stroke: '#14102A', thick: 5 }));
  if (opt.lv) c.add(T(sc, 0, size / 2 - 16, `Lv ${opt.lv}`, size * 0.15, '#FFFFFF', { w: 900, stroke: '#14102A', thick: 5 }));
  return c;
}
// 등급마다 열리는 효과: [등급 이름, 설명, 열렸나]
export function effLines(it) {
  const S = SLOT[it.slot], ST = SETS[it.set], main = S.stat === 'atk' ? '공격' : '체력';
  const sub = it.slot === 'weapon' ? ST.wsub : S.sub.t, fx = ST.fx ? ST.fx[it.slot] : ['세트 효과 없음', '세트 효과 없음'];
  return [[1, `${main} +5%`], [2, sub], [3, fx[0]], [6, `${main} +10%`], [9, '기본 능력치 +20%'], [10, fx[1]]].map(([t, txt]) => [TIERS[t].name, txt, it.t >= t]);
}
export const mainText = (it, lv) => `${SLOT[it.slot].stat === 'atk' ? '공격' : '체력'} +${slotMain(it, lv)}`;
export function ruleText(it) {
  const R = MERGE[it.t]; if (!R) return '최고 등급이에요';
  return R.dup ? `똑같은 ${itemName(it)} (${TIERS[it.t].name}) ${R.n}개 → ${TIERS[it.t + 1].name}` : `${SLOT[it.slot].name} ${TIERS[R.ft].name} ${R.n}개 (세트 상관없음) → ${TIERS[it.t + 1].name}`;
}
export { itemName, TIERS, SETS, SLOT };
