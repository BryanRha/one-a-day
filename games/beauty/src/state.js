// 경제 · 진행 규칙: 에너지 회복 · 경험치/레벨 · 해금 계열 · 주문 만들기 · 하루 목표 · 월간 시즌
import { load, save } from './save.js?v=0.44.1';
import { album, addPack, PACKS } from './album.js?v=0.44.1';
import { vipWants, decoName } from './events.js?v=0.44.1';
import { ENERGY, LEVELS, levelReward, CHAINS, CUSTOMERS, CHAPTERS, STORAGE, MAX_LV } from './data.js?v=0.44.1';

export const today = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
export const seasonId = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}`; };

// 에너지: 상한 미만일 때만 시간으로 회복 (구매·보상으로는 상한을 넘을 수 있음)
export function tickEnergy() {
  const d = load(), now = Date.now();
  if (d.energy >= ENERGY.max) { d.eAt = now; return d.energy; }
  const n = Math.floor((now - d.eAt) / (ENERGY.regenSec * 1000));
  if (n > 0) { d.energy = Math.min(ENERGY.max, d.energy + n); d.eAt += n * ENERGY.regenSec * 1000; if (d.energy >= ENERGY.max) d.eAt = now; save(); }
  return d.energy;
}
export const nextEnergyIn = () => { const d = load(); return d.energy >= ENERGY.max ? 0 : Math.max(0, ENERGY.regenSec * 1000 - (Date.now() - d.eAt)); };
export function spendEnergy(n) { tickEnergy(); const d = load(); if (d.energy < n) return false; if (d.energy >= ENERGY.max) d.eAt = Date.now(); d.energy -= n; addGoal('energy', n); save(); return true; }

// 경험치 · 레벨 (레벨업 → 에너지 가득 + 보석·코인, 3레벨마다 선물 상자)
export const xpNeed = lv => LEVELS[Math.min(lv, LEVELS.length - 1)] + Math.max(0, lv - LEVELS.length + 1) * 150;
export function addXp(n) {
  const d = load(); d.xp += n; const ups = [];
  while (d.xp >= xpNeed(d.lv)) { d.xp -= xpNeed(d.lv); d.lv++; const r = levelReward(d.lv); d.gems += r.gems; d.coins += r.coins; d.energy = Math.max(d.energy, ENERGY.max); d.eAt = Date.now(); if (r.gift) d.pendingGifts = (d.pendingGifts || 0) + 1;
    if (r.pack) addPack(r.pack);
    for (const it of r.items) { if (it.t === 'g') { const ch = unlockedChains(); d.pendingItems.push({ t: 'g', g: ch[Math.floor(Math.random() * ch.length)], l: it.gl }); } else d.pendingItems.push({ ...it }); }
    ups.push({ lv: d.lv, ...r }); }
  save(); return ups;
}

// 해금 계열: 기본 동백 · 쌀, 이야기로 인삼 · 녹차
export function unlockedChains() { const d = load(), out = ['camellia', 'rice'];
  CHAPTERS.forEach((c, k) => { if (k > (d.ch || 0)) return; const n = k < (d.ch || 0) ? c.tasks.length : d.task; for (let i = 0; i < n; i++) if (c.tasks[i].unlock) out.push(c.tasks[i].unlock); }); return out; }
// 지금 장 · 할 일 (장을 다 끝내면 다음 장으로 넘어갈 수 있음)
export const chapter = () => CHAPTERS[load().ch || 0];
export const curTask = () => chapter().tasks[load().task];
export const canNextChapter = () => { const d = load(); return !curTask() && (d.ch || 0) < CHAPTERS.length - 1; };
export function nextChapter() { const d = load(); if (!canNextChapter()) return false; d.ch = (d.ch || 0) + 1; d.task = 0; save(); return true; }
export const storageSize = () => { const d = load(); return STORAGE.base + (d.storeExtra || 0) + (d.ent.storage4 ? 4 : 0); };

// 주문: 손님 1명 · 물건 1~2개 · 레벨이 오를수록 높은 단계
export function makeOrder(easy = false, board = null) {
  const d = load(), chains = unlockedChains(), lv = d.lv;
  const top = Math.min(MAX_LV - 1, 2 + Math.floor(lv / 2.5)), lo = easy ? 2 : Math.max(2, top - 2);
  const pick = () => { const c = chains[Math.floor(Math.random() * chains.length)], l = lo + Math.floor(Math.random() * (top - lo + 1)); return { c, l: easy ? Math.min(l, 3) : l }; };
  // 작업대에 이미 있는 2단계 이상 물건을 원하는 손님 (원작처럼 막힌 물건이 쌓이지 않게)
  const onBoard = (board || []).filter(c => c && c.t === 'i' && !c.b && c.l >= 2 && c.l <= top + 1 && chains.includes(c.c));
  const first = !easy && onBoard.length && Math.random() < 0.4 ? (() => { const c = onBoard[Math.floor(Math.random() * onBoard.length)]; return { c: c.c, l: c.l }; })() : pick();
  const n = lv >= 3 && Math.random() < 0.45 ? 2 : 1, items = [first]; if (n === 2) { let b = pick(), k = 0; while (b.c === items[0].c && b.l === items[0].l && k++ < 5) b = pick(); items.push(b); }
  const val = items.reduce((a, it) => a + Math.round(3 * Math.pow(1.85, it.l - 1)), 0);
  const cu = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  d.orderSeq++;
  // 원작처럼 가끔 덤 보상 (에너지 · 코인 · 보석 아이템)
  // VIP 손님: 이벤트 중이면 가끔 (한 번에 한 명) · 한 단계 높은 물건 · 코인 1.5배
  const isVip = !easy && vipWants() && !(d.orders || []).some(o => o && o.vip) && Math.random() < 0.3;
  if (isVip) items.forEach(it => { it.l = Math.min(MAX_LV - 1, it.l + 1); });
  const bonus = !easy && Math.random() < 0.12 ? ['en1', 'co1', 'ge1', 'en1', 'en2'][Math.floor(Math.random() * 5)] : null;
  // 인물 의뢰 (이야기 인물이 가끔 직접 주문 · 완료하면 한마디 + 보석)
  const CH = [['도윤', 'c_doyun_smile', '농장 일 끝나고 쓸 크림 하나만요.', '고마워요. …소윤 씨가 만든 거라 더 좋네요.'], ['하늘', 'c_haneul_smile', '정원 손님들 선물로 주고 싶어요!', '역시 설화당! 손님들이 좋아하겠어요~'], ['핑크리', 'c_pinky_wink', '라이브 협찬템 필요해요~', '꺅 대박! 오늘 라이브 터지겠다!'], ['세라', 'c_sera_smug', '시장 조사용이에요. 오해하지 마요.', '…품질은 인정할게요.'], ['지호', 'c_jiho_calm', '어머니 드릴 겁니다.', '감사합니다. 어머니가 기뻐하실 겁니다.']];
  const ci = load().ch || 0, cast = CH.filter((c, i) => i < 2 + ci), npc = !easy && !isVip && !(d.orders || []).some(o => o && o.npc) && d.task > 2 && Math.random() < 0.12 ? cast[Math.floor(Math.random() * cast.length)] : null;
  const v2 = items.reduce((a, it) => a + Math.round(3 * Math.pow(1.85, it.l - 1)), 0), coins = isVip ? Math.round(v2 * 1.5) : val;
  if (npc) return { id: d.orderSeq, face: npc[1], who: npc[0], say: npc[2], thanks: npc[3], npc: true, items, coins, xp: Math.max(1, Math.round(coins / 4)), at: 0, bonus: 'ge2' };
  return { id: d.orderSeq, face: cu.face, who: isVip ? `VIP ${cu.n}` : cu.n, say: isVip ? '특별한 날이라 최고급으로 부탁해요!' : cu.say[Math.floor(Math.random() * cu.say.length)], items, coins, xp: Math.max(1, Math.round(coins / 4)), at: 0, bonus, vip: isVip || undefined };
}
// 주문판 3장 채우기 · 대기시간(완료 후 새 손님까지) · 오래 쉬었다 오면 쉬운 주문부터
export function fillOrders() {
  const d = load(), now = Date.now(), away = now - (d.lastSeen || 0) > 15 * 60e3;
  d.orders = d.orders.filter(o => o);
  while (d.orders.length < 3) d.orders.push({ ...makeOrder(away || d.orders.length === 0 && d.stats.orders < 6, d.board), at: now + (d.orders.length && !away ? 4000 * d.orders.length : 0) });
  d.lastSeen = now; save();
}

// 하루 목표 3개 → 시즌 점수
const GOAL_POOL = [
  { k: 'orders', n: c => `주문 ${c}개 완료`, c: [5, 8, 12], pts: 10 },
  { k: 'merges', n: c => `합치기 ${c}번`, c: [30, 50, 80], pts: 10 },
  { k: 'energy', n: c => `에너지 ${c} 사용`, c: [40, 70, 100], pts: 10 },
  { k: 'lv5', n: c => `5단계 제품 ${c}개 만들기`, c: [2, 3, 5], pts: 15 },
];
export function daily() {
  const d = load();
  if (d.daily.day !== today()) { const pool = [...GOAL_POOL].sort(() => Math.random() - 0.5).slice(0, 3); d.daily = { day: today(), goals: pool.map(g => { const c = g.c[Math.min(2, Math.floor(d.lv / 4))]; return { k: g.k, n: g.n(c), need: c, have: 0, pts: g.pts }; }), done: [], bonus: false }; save(); }
  return d.daily;
}
export function addGoal(k, n = 1) { const d = load(), dl = daily(); for (const g of dl.goals) if (g.k === k && g.have < g.need) g.have = Math.min(g.need, g.have + n); save(); }
// 월간 시즌: 무료 · 프리미엄 두 줄 (프리미엄은 결제 열리면 사용)
export const SEASON = { goal: [20, 50, 90, 140, 200, 270, 350, 440],
  free: [{ energy: 30 }, { coins: 50 }, { pack: 'basic' }, { gift: 1 }, { energy: 60 }, { pack: 'basic', coins: 100 }, { gems: 25 }, { pack: 'gold', gems: 40 }],
  prem: [{ gems: 15 }, { pack: 'basic' }, { gift: 1 }, { pack: 'gold' }, { coins: 200 }, { gift: 2, pack: 'gold' }, { energy: 120 }, { pack: 'diamond', gems: 100 }] };
export function season() { const d = load(); if (d.season.id !== seasonId()) { d.season = { id: seasonId(), pts: 0, claimed: [], pclaimed: [] }; d.ent.pass = false; save(); } return d.season; }
export function claimGoal(i) { const d = load(), dl = daily(), g = dl.goals[i]; if (!g || g.have < g.need || dl.done.includes(i)) return 0; dl.done.push(i); season().pts += g.pts; save(); return g.pts; }
export function giveReward(r) { const d = load(); if (r.energy) d.energy += r.energy; if (r.coins) d.coins += r.coins; if (r.gems) d.gems += r.gems; if (r.gift) d.pendingGifts = (d.pendingGifts || 0) + r.gift;
  if (r.pack) addPack(r.pack); if (r.joker) album().jokers += r.joker; if (r.items) for (const k of r.items) d.pendingItems.push({ t: 's', k }); save(); }
const ITEM_N = { scissors: '가위', ribbon: '리본', chest: '보물 상자', pickbox: '고르기 상자', hourglass: '모래시계' };
export const rewardText = r => [r.energy && `⚡${r.energy}`, r.coins && `●${r.coins}`, r.gems && `◆${r.gems}`, r.gift && `선물상자 ${r.gift}`, r.pack && PACKS[r.pack].n, r.joker && `조커 ${r.joker}`, r.items && r.items.map(k => ITEM_N[k] || k).join('·'), r.deco && decoName(r.deco)].filter(Boolean).join(' ');

// 도감: 처음 만든 물건이면 보석 보상 (원작의 새 물건 발견 보상)
export function discover(key, l) { const d = load(); if (d.seen[key]) return 0; d.seen[key] = 1; const g = l >= 3 ? 1 + Math.floor(l / 3) : 0; d.gems += g; save(); return g || -1; }
