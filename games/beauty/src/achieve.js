// 업적 (오래 하는 목표 · 단계마다 보석 · 칭호)
import { load, save } from './save.js?v=0.55.1';
import { ALL_CARDS } from './album.js?v=0.55.1';
import { CHAPTERS } from './data.js?v=0.55.1';

const cards = d => d.album ? ALL_CARDS.filter(c => (d.album.have[c.key] || 0) > 0).length : 0;
const topItems = d => Object.keys(d.seen || {}).filter(k => /10$/.test(k)).length;
export const ACHIEVE = [
  { id: 'orders', n: '단골이 늘어요', unit: '주문', get: d => d.stats.orders, steps: [10, 50, 200, 500, 1000] },
  { id: 'merges', n: '합치기 장인', unit: '합치기', get: d => d.stats.merges, steps: [50, 300, 1000, 3000, 8000] },
  { id: 'level', n: '설화당 성장', unit: '레벨', get: d => d.lv, steps: [5, 10, 20, 30, 40] },
  { id: 'chapter', n: '이야기 여행', unit: '장 완료', get: d => (d.ch || 0) + (CHAPTERS[d.ch || 0].tasks[d.task] ? 0 : 1), steps: [1, 2, 3, 4, 6] },
  { id: 'found', n: '도감 수집가', unit: '발견', get: d => Object.keys(d.seen || {}).length, steps: [20, 50, 80, 100, 120] },
  { id: 'top', n: '시그니처 완성', unit: '10단계 제품', get: topItems, steps: [1, 3, 6, 9, 12] },
  { id: 'cards', n: '카드 컬렉터', unit: '카드', get: cards, steps: [10, 30, 50, 70, 81] },
  { id: 'races', n: '박람회 챔피언', unit: '레이스 1등', get: d => d.stats.raceWins || 0, steps: [1, 3, 10, 25, 50] },
];
export const TITLES = ['새내기 사장', '골목 인기 가게', '명동의 별', 'K-뷰티 장인', '세계의 설화당'];
export const REWARD = [5, 10, 20, 35, 60];   // 단계별 보석
export function ach() { const d = load(); d.ach = d.ach || {}; return d.ach; }
export const tierOf = a => { const v = a.get(load()), claimed = ach()[a.id] || 0; let reach = 0; while (reach < a.steps.length && v >= a.steps[reach]) reach++; return { v, claimed, reach, next: a.steps[Math.min(claimed, a.steps.length - 1)] }; };
export const achReady = () => ACHIEVE.filter(a => { const t = tierOf(a); return t.reach > t.claimed; }).length;
export function achClaim(id) { const a = ACHIEVE.find(x => x.id === id), t = tierOf(a); if (t.reach <= t.claimed) return 0; const g = REWARD[t.claimed]; ach()[id] = t.claimed + 1; load().gems += g; save(); return g; }
export const totalTiers = () => ACHIEVE.reduce((s, a) => s + (ach()[a.id] || 0), 0);
export const title = () => TITLES[Math.min(TITLES.length - 1, Math.floor(totalTiers() / 8))];
