// 유료화 준비 — 상품 목록 · 구매 · 광고 보상의 '창구' 하나
// 지금: 결제 · 광고 모두 꺼짐(enabled=false) → 화면에는 '곧 열려요'.
// 나중에 결제를 켤 때: PROVIDER 를 실제 결제 연결(원어데이 앱 postMessage 등)로 바꾸고 enabled=true 만 하면
//   상품 지급(grant) · 화면 · 저장 기록은 그대로 동작하도록 만들어 둠.
import { load, save } from './save.js?v=0.47.3';

export const PRODUCTS = [
  { id: 'gems_s', n: '보석 한 줌', price: 1200, gems: 80, tag: '' },
  { id: 'gems_m', n: '보석 주머니', price: 5900, gems: 450, tag: '인기' },
  { id: 'gems_l', n: '보석 상자', price: 12000, gems: 1000, tag: '+20%' },
  { id: 'energy', n: '에너지 충전 팩', price: 2500, energy: 200, tag: '' },
  { id: 'starter', n: '스타터 패키지', price: 3300, gems: 150, energy: 100, gift: 2, once: true, tag: '1회 한정' },
  { id: 'pass', n: '프리미엄 시즌 패스', price: 9900, ent: 'pass', tag: '이번 시즌' },
  { id: 'storage', n: '창고 +4칸', price: 2500, ent: 'storage4', once: true, tag: '' },
  { id: 'piggy', n: '보석 저금통 깨기', price: 4900, piggy: true, tag: '모은 만큼' },
  { id: 'cards', n: '카드 팩 묶음', price: 3900, packs: { gold: 3, diamond: 1 }, tag: '앨범' },
];
export const won = p => `₩${p.toLocaleString()}`;

// 결제 · 광고 연결 (지금은 꺼 둠)
const PROVIDER = {
  enabled: false,
  async buy(/* product */) { throw new Error('disabled'); },
  adsEnabled: false,
  async showAd(/* placement */) { throw new Error('disabled'); },
};
export const storeOpen = () => PROVIDER.enabled;
export const adsOpen = () => PROVIDER.adsEnabled;

// 구매: 결제 성공 → 지급 → 기록 (영수증 id 로 중복 지급 방지)
export async function purchase(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) throw new Error('unknown');
  const d = load(); if (p.once && d.purchases.some(r => r.id === id)) throw new Error('owned');
  const receipt = await PROVIDER.buy(p);
  if (receipt && d.purchases.some(r => r.rid === receipt.rid)) return p;
  grant(p); d.purchases.push({ id, rid: receipt && receipt.rid, at: Date.now() }); save(); return p;
}
export function grant(p) {
  const d = load();
  if (p.gems) d.gems += p.gems;
  if (p.energy) d.energy += p.energy;
  if (p.gift) d.pendingGifts = (d.pendingGifts || 0) + p.gift;
  if (p.piggy) { d.gems += d.piggy || 0; d.piggy = 0; }
  if (p.packs) { d.album = d.album || { have: {}, stars: 0, jokers: 0, packs: { basic: 0, gold: 0, diamond: 0 }, done: [], all: false, orders: 0 }; for (const [k, n] of Object.entries(p.packs)) d.album.packs[k] = (d.album.packs[k] || 0) + n; }
  if (p.ent) d.ent[p.ent] = true;
  save();
}
// 광고 보상 (자리: energy · bubble · dailyBonus)
export async function rewardAd(placement) { await PROVIDER.showAd(placement); return true; }
