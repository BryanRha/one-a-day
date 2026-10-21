// 룬 컬렉션: 덱 3개(프리셋) · 칸 골라 룬 넣기 · 덱 조합 보너스 · 24룬 (희귀도) · 카드+수정으로 등급업
import { W, H } from '../config.js?v=0.18.0';
import { T, C, fmt, panel, btn, iconBtn, popup, toast } from '../pui.js?v=0.18.0';
import { audio } from '../audio.js?v=0.18.0';
import { load } from '../save.js?v=0.18.0';
import * as M from '../meta.js?v=0.18.0';
import { RUNES, RUNE_ORDER, RARITY, RARITY_NAME, RARITY_COLOR, SYNERGY, synergiesOf } from '../core/sim.js?v=0.18.0';
import * as P from '../core/predict.js?v=0.18.0';

export const DESC = {
  flame: '맞은 적 주변까지 불태워요', frost: '맞은 적을 느리게 해요', storm: '근처 적 둘에게 번개가 이어져요', venom: '독이 쌓여 계속 피해를 줘요',
  gale: '아주 빠르게 공격해요', iron: '보스에게 2.5배 피해', light: '상하좌우 주사위의 공격 속도를 올려요', mana: '눈마다 초당 SP 를 만들어요',
  echo: '눈만 같으면 아무 주사위와 합성돼요', fortune: '합성하면 SP 를 얻어요', sniper: '체력이 가장 많은 적을 노려요', curse: '맞은 적이 받는 피해가 늘어요',
  pierce: '맨 앞 적 뒤로 줄지은 적까지 꿰뚫어요', time: '맞은 적을 길 뒤로 되돌려요', mine: '길 위에 지뢰를 깔아요', crit: '모든 주사위의 치명타 확률을 올려요',
  summoner: '합성하면 주사위가 하나 더 생겨요', freeze: '확률로 적을 얼려 멈춰요', sacrifice: '합성 재료가 되면 옆 주사위들이 이번 판 내내 강해져요', alchemy: '이번 판 합성할수록 강해져요 (최대 4배)',
  arrow: '빠르고 곧은 한 발', quake: '길 위 모든 적에게 피해', shackle: '보스를 크게 느리게 묶어요', bounty: '맞은 적을 잡으면 SP 를 더 줘요',
  ward: '새어 나가는 적을 한 번 막아요 (다시 쓰기까지 대기)', twin: '맨 앞 두 적을 동시에 공격', nova: '8번 쏠 때마다 모든 적에게 대폭발', dragon: '웨이브 안에서 쏠수록 뜨거워져요 (최대 4배)',
  spark: '작은 불꽃이 주변까지 튀어요', stone: '묵직한 한 방', water: '느리게 하고 주변까지 적셔요', needle: '아주 빠른 연속 찌르기', spear: '맨 앞 적 뒤까지 살짝 꿰뚫어요', bow: '맨 뒤에 오는 적을 노려요', axe: '가까운 적까지 함께 베어요', coin: '합성하면 SP 를 얻어요',
  thunder: '번개가 넷에게 이어져요', acid: '독 + 받는 피해 증가', moon: '빠른 적에게 2.2배', giant: '큰 적에게 2.2배 · 보스 1.3배', rage: '생명이 줄수록 강해져요', lance: '보스에게 강하고 살짝 꿰뚫어요', shuriken: '무작위 셋을 동시에 맞혀요', boomerang: '맨 앞과 맨 뒤를 함께 맞혀요',
  lava: '강한 화상 + 주변 피해', frostbite: '크게 느리게 + 받는 피해 증가', thornvine: '느리게 + 독', quicksand: '모든 적을 조금씩 느리게', banner: '옆 주사위의 피해를 올려요', lens: '자기 치명타 확률 +30%', cauldron: '맞힐 때마다 SP 가 조금씩', totem: '옆 주사위 공격 속도 +',
  magnet: '적을 끌어당겨 뒤로 + 느리게', hex: '받는 피해를 크게 올려요', wisp: '가장 센 적을 빠르게 쏘아요',
  blizzard: '모든 적에게 피해 + 느리게', meteor: '넓은 범위 대폭발', reaper: '체력 12% 아래 적은 즉시 처형', prism: '셋을 동시에 + 약화', ballista: '아주 강한 관통 화살', glacier: '얼리고 느리게 + 주변 피해', tempest: '번개가 이어지며 밀어내요', plague: '독이 옆 적에게 번져요',
  earthspike: '모든 적 피해 · 큰 적 2배', drum: '모든 주사위 공격 속도 +', bell: '합성하면 모두 즉시 발사 · 봉인 풀림', battery: '10초마다 SP 묶음', blueprint: '소환 비용이 싸져요', forge: '합성 때 30% 확률로 눈 +1 더', hourglass: '보스가 나오면 잠시 멈춰요', guardian: '자기와 옆 주사위는 봉인·변신 면역',
  bomb: '2초 뒤 터지는 폭탄을 붙여요', chakram: '둘을 동시에 + 관통', siren: '모든 적 피해 · 가끔 멈춤', titan: '아주 무거운 일격 · 보스 1.5배',
  king: '모든 주사위 피해 +', phoenix: '한 번 패배를 막고 부활', void: '방패·사라짐을 무시 · 보스 1.5배', sun: '판의 룬 종류가 많을수록 강해져요', starfall: '다섯 곳에 별이 떨어져요', aurora: '모든 적 피해 + 약화 + 느리게', assassin: '가장 센 적을 노리는 치명 특화', clone: '합성하면 같은 룬 하나 더',
  angel: '3웨이브마다 생명 +1', oracle: '보스 기술을 막아요 (대기 시간)', genesis: '합성 때 다른 주사위 눈 +1 (50%)', eclipse: '보스·빠른 적 1.8배', chaos: '쏠 때마다 덱의 다른 룬 능력', thunderGod: '번개가 여섯에게 줄지 않고 이어져요', abyssEye: '모든 적이 받는 피해 +', tree: '시간마다 옆 주사위 눈 +1',
  blackhole: '모든 적을 뒤로 끌어당겨요', judgement: '10번째 공격마다 가장 센 적에게 심판', timeLord: '주기적으로 모든 적을 멈춰요', midas: '잡은 적 SP 2배 · 합성 SP', archmage: '범위 + 느리게 + 독',
  growth: '시간이 지나면 눈이 늘어요 (6눈까지)', mirror: '옆에서 가장 센 주사위의 능력을 따라 해요', shift: '합성 결과가 덱에서 가장 높은 등급 룬이 돼요', hammer: '보스 최대 체력에 비례한 피해',
};
const hex = n => '#' + n.toString(16).padStart(6, '0');
// 받침 있으면 '을', 없으면 '를'
const josa = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; };

export class DeckScene extends Phaser.Scene {
  constructor() { super('Deck'); }
  create(data = {}) {
    const d = load(); M.decks();
    this.slot = data.slot ?? this.slot ?? 0;
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.62);
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '룬 컬렉션', 44, C.text, { w: 900 });
    this.add.image(W - 230, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    T(this, W - 198, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    // 덱 1·2·3
    [0, 1, 2].forEach(i => btn(this, W / 2 - 290 + i * 200, 196, 180, 72, `덱 ${i + 1}`, () => { M.selectDeck(i); this.scene.restart({ slot: this.slot, filter: this.filter, y: this.grid ? this.grid.y : 0 }); }, { style: d.deckIdx === i ? 'gold' : 'ghost', size: 28 }));
    btn(this, W - 150, 196, 200, 72, '조합표', () => this.synergyList(), { style: 'ghost', size: 26 });
    // 덱 5칸: 눌러서 바꿀 자리 고르기
    const dy = 318;
    d.deck.forEach((r, i) => {
      const x = W / 2 + (i - 2) * 186, sel = i === this.slot;
      if (sel) { const g = this.add.image(x, dy, 'glow').setTint(0xF5C451).setBlendMode('ADD').setScale(2.2).setAlpha(0.5); this.tweens.add({ targets: g, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 }); }
      const im = this.add.image(x, dy, `die_${r}`).setDisplaySize(sel ? 160 : 140, sel ? 160 : 140).setInteractive({ useHandCursor: true });
      this.add.image(x, dy, `rune_${r}`).setDisplaySize(sel ? 88 : 76, sel ? 88 : 76);
      T(this, x, dy + 90, `★${d.tiers[r] || 1}`, 22, sel ? C.gold : C.sub, { w: 900 });
      im.on('pointerup', () => { this.slot = i; audio.play('sfx_click', { volume: 0.5 }); this.scene.restart({ slot: i, filter: this.filter, y: this.grid ? this.grid.y : 0 }); });
    });
    // 발동 중인 조합 · 수집 보너스
    const sy = synergiesOf(d.deck);
    T(this, W / 2, 452, sy.length ? `조합 발동  ${sy.map(x => x.name).join(' · ')}` : `수집 보너스 · 모든 주사위 치명타 피해 ${M.critPct()}%`, 24, sy.length ? C.gold : '#FF8FCB', { w: 900 });
    // AI 예측 · 추천
    this.add.existing(panel(this, W / 2, 530, 1010, 104, { r: 30 }));
    this.add.image(78, 530, 'i_star').setDisplaySize(40, 40).setTint(0x8FE3FF);
    this.aiT = T(this, 110, 512, 'AI 예측 계산 중…', 28, C.text, { ox: 0, w: 900 });
    this.aiS = T(this, 110, 552, `목표: 웨이브 ${this.target()} (최고 기록 경신)`, 22, C.sub, { ox: 0, w: 800 });
    btn(this, W - 150, 530, 230, 80, 'AI 추천 덱', () => this.recommendPop(), { style: 'gold', size: 28 });
    this.time.delayedCall(250, () => this.predict());
    // 희귀도 필터
    this.filter = data.filter ?? this.filter ?? -1;
    const tabs = [[-1, '전체'], [0, '일반'], [1, '희귀'], [2, '영웅'], [3, '전설']];
    tabs.forEach(([k, label], i) => { const own = RUNE_ORDER.filter(r => (k < 0 || RARITY[r] === k) && d.unlocked[r]).length, tot = RUNE_ORDER.filter(r => k < 0 || RARITY[r] === k).length; btn(this, 118 + i * 211, 628, 196, 70, `${label} ${own}/${tot}`, () => { this.filter = k; this.scene.restart({ slot: this.slot, filter: k }); }, { style: this.filter === k ? 'indigo' : 'ghost', size: 22 }); });
    // 룬 격자 (끌어서 위아래) — 희귀도 → 보유 먼저
    const order = RUNE_ORDER.filter(r => this.filter < 0 || RARITY[r] === this.filter).sort((a, b) => RARITY[a] - RARITY[b] || (d.unlocked[b] ? 1 : 0) - (d.unlocked[a] ? 1 : 0));
    const cols = 5, gap = 10, cw = (W - 60 - gap * (cols - 1)) / cols, top = 686, ch = 210, rows = Math.ceil(order.length / cols);
    const view = H - top - 16;
    this.grid = this.add.container(0, 0);
    const mg = this.make.graphics(); mg.fillRect(0, top - 6, W, view + 6); this.grid.setMask(mg.createGeometryMask());
    const before = new Set(this.children.list);
    order.forEach((r, i) => this.card(r, 30 + cw / 2 + (i % cols) * (cw + gap), top + ch / 2 + Math.floor(i / cols) * (ch + gap), cw, ch));
    for (const o of this.children.list.slice()) if (!before.has(o) && o !== this.grid) this.grid.add(o);
    const total = rows * (ch + gap);
    this.minY = Math.min(0, view - total); this.grid.y = Phaser.Math.Clamp(data.y ?? 0, this.minY, 0);
    let drag = null;
    this.input.on('pointerdown', p => { if (p.y > top) drag = { y: p.y, start: this.grid.y }; this.dragMoved = false; });
    this.input.on('pointermove', p => { if (!drag || !p.isDown) return; const dy = p.y - drag.y; if (Math.abs(dy) > 10) this.dragMoved = true; this.grid.y = Phaser.Math.Clamp(drag.start + dy, this.minY, 0); });
    this.input.on('pointerup', () => { drag = null; });
    this.input.on('wheel', (p, o, dx, dy) => { this.grid.y = Phaser.Math.Clamp(this.grid.y - dy, this.minY, 0); });
    this.cameras.main.fadeIn(200, 5, 6, 26);
    window.__deck = this;
  }
  target() { return Math.max(10, load().best + 1); }
  // 지금 덱의 기록 경신 확률 (봇으로 20판) — 숫자가 바뀌며 올라가는 연출
  async predict() {
    const d = load(), n = 20, tgt = this.target(), id = (this.predId = (this.predId || 0) + 1), adj = M.skillAdj();
    const res = await P.predictAsync(d.deck, M.effTiers(), M.critBonus(), tgt, n, (k, N, ws) => {
      if (this.predId !== id || !this.aiT.active) return;
      const p = P.smooth(ws.filter(w => w + adj >= tgt).length, ws.length);
      this.aiT.setText(`AI 예측 · 기록 경신 ${Math.round(p * 100)}%  (${k}/${N}판)`);
    }, adj);
    if (this.predId !== id || !this.aiT.active) return;
    M.notePred(d.deck, res.raw);
    this.aiT.setText(`AI 예측 · 기록 경신 ${Math.round(res.p * 100)}%${res.p < 0.1 ? ' · 도전!' : ''}`).setColor(res.p >= 0.5 ? '#7CFFB2' : C.gold);
    const c = (d.calib || []).length;
    this.aiS.setText(`목표 ${tgt} · 예상 웨이브 ${res.median} · ${c ? `내 실력 보정 ${adj >= 0 ? '+' : ''}${adj} (${c}판)` : '원정을 하면 내 실력에 맞춰져요'}`);
    this.tweens.add({ targets: this.aiT, scale: 1.06, duration: 120, yoyo: true });
  }
  // AI 추천: 보유 룬으로 후보 덱들을 만들고 실제로 돌려 보고 가장 좋은 덱을 고름
  async recommendPop() {
    const d = load(), owned = RUNE_ORDER.filter(r => d.unlocked[r]);
    if (owned.length < 5) return toast(this, '룬이 5개 이상 있어야 해요', C.sub);
    this.predId = (this.predId || 0) + 1;
    const p = popup(this, 'AI 덱 추천', 940, 1080, { closable: false }), c = p.content;
    const sub = T(this, 0, -398, `보유 룬 ${owned.length}개로 덱을 조합해 봐요`, 28, C.sub, { w: 800 }); c.add(sub);
    const cap = T(this, 0, -322, '예상 웨이브', 26, C.sub, { w: 800 }); c.add(cap);
    const big = T(this, 0, -235, '–', 130, C.text, { w: 900 }); c.add(big);
    const msg = T(this, 0, -130, 'AI 가 덱을 조합해 시뮬레이션하는 중…', 28, C.sub, { w: 800 }); c.add(msg);
    const bar = this.add.graphics(); c.add(bar);
    const icons = this.add.container(0, -10); c.add(icons);
    const showDeck = deck => { icons.removeAll(true); deck.forEach((r, i) => { const x = (i - 2) * 160; icons.add(this.add.image(x, 0, `die_${r}`).setDisplaySize(124, 124)); icons.add(this.add.image(x, 0, `rune_${r}`).setDisplaySize(70, 70)); }); };
    let shown = '';
    const res = await P.recommend(owned, M.effTiers(), M.critBonus(), d.best, d.deck, (k, N, deck) => {
      if (!big.active) return;
      big.setText(`${10 + Math.floor(Math.random() * 15)}`);   // 계산 중: 숫자가 흔들리며 바뀜
      msg.setText(`시뮬레이션 ${k} / ${N}판`);
      bar.clear().fillStyle(0xFFFFFF, 0.1).fillRoundedRect(-360, -96, 720, 14, 7).fillStyle(0x8FE3FF, 1).fillRoundedRect(-360, -96, Math.max(14, 720 * k / N), 14, 7);
      const key = deck.join(); if (key !== shown) { shown = key; showDeck(deck); }
    }, M.skillAdj());
    if (!big.active) return;
    showDeck(res.deck); bar.clear();
    const med = P.median(res.ws), curMed = P.median(res.curWs), gain = med - curMed;
    this.tweens.addCounter({ from: Math.max(1, med - 8), to: med, duration: 700, onUpdate: tw => big.setText(`${Math.round(tw.getValue())}`) });
    big.setColor(gain > 0 ? '#7CFFB2' : C.text);
    msg.setText(res.same ? `지금 덱이 가장 좋아요 · 예상 웨이브 ${curMed}` : `지금 덱 ${curMed} → 추천 덱 ${med}  (+${gain})`);
    if (!res.same) msg.setColor('#7CFFB2');
    // 목표 두 개: 무난한 목표 · 도전 목표(기록 경신) — 확률은 0%·100% 로 잘리지 않게 보정
    const easy = Math.max(5, med - 2), hard = Math.max(med + 1, d.best + 1);
    const chip = (x, label, pct, col) => { const g = this.add.graphics(); g.fillStyle(0x0B1026, 0.9).fillRoundedRect(x - 200, 104, 400, 112, 24).lineStyle(2, col, 0.7).strokeRoundedRect(x - 200, 104, 400, 112, 24); c.add(g); c.add(T(this, x, 136, label, 22, C.sub, { w: 800 })); c.add(T(this, x, 180, pct, 40, hex(col), { w: 900 })); };
    const pE = Math.round(P.chance(res.ws, easy) * 100), pH = Math.round(P.chance(res.ws, hard) * 100);
    chip(-210, `웨이브 ${easy} 도달`, `${pE}%`, 0x7CFFB2);
    chip(210, hard === d.best + 1 ? `기록 경신 (웨이브 ${hard})` : `웨이브 ${hard} 도달`, pH < 10 ? `${pH}% · 도전!` : `${pH}%`, pH < 10 ? 0xFFB86A : 0xF5C451);
    const sy = synergiesOf(res.deck);
    c.add(T(this, 0, 262, `${sy.length ? `조합 발동 · ${sy.map(x => x.name).join(' · ')}  ·  ` : ''}후보 ${res.tested}개 · 봇 ${res.sims}판`, 22, sy.length ? C.gold : C.dim, { w: 800 }));
    if (pH < 10) c.add(T(this, 0, 300, '등급업 · 한계 돌파로 덱이 강해지면 확률이 올라가요', 22, C.sub, { w: 800 }));
    audio.play('sfx_awaken', { volume: 0.5 });
    c.add(btn(this, -200, 410, 340, 110, '닫기', () => { p.close(); this.time.delayedCall(160, () => this.scene.restart({ slot: this.slot, filter: this.filter })); }, { style: 'ghost', size: 34 }));
    c.add(btn(this, 200, 410, 340, 110, res.same ? '지금 덱 유지' : '이 덱 쓰기', () => { if (!res.same) { M.setDeck(res.deck); audio.play('sfx_power', { volume: 0.7 }); } p.close(); this.time.delayedCall(160, () => this.scene.restart({ slot: this.slot, filter: this.filter })); }, { style: res.same ? 'ghost' : 'gold', size: 32 }));
  }
  card(r, x, y, cw, ch) {
    const d = load(), own = d.unlocked[r], inDeck = d.deck.includes(r), t = d.tiers[r] || 1, rar = RARITY[r], col = RARITY_COLOR[rar];
    this.add.existing(panel(this, x, y, Math.round(cw), Math.round(ch), { tone: inDeck ? 'gold' : undefined, r: 22 }));
    const g = this.add.graphics(); g.fillStyle(col, own ? 0.9 : 0.3).fillRoundedRect(x - cw / 2 + 18, y - ch / 2 + 8, cw - 36, 6, 3);
    const s = Math.min(96, ch * 0.46), iy = y - ch * 0.12;
    const ic = this.add.image(x, iy, `die_${r}`).setDisplaySize(s, s), rn = this.add.image(x, iy, `rune_${r}`).setDisplaySize(s * 0.58, s * 0.58);
    if (!own) { ic.setAlpha(0.25); rn.setAlpha(0.25).setTint(0x8890B0); this.add.image(x, iy, 'i_lock').setDisplaySize(34, 34).setAlpha(0.8); }
    T(this, x, y + ch * 0.2, RUNES[r].name, 26, own ? C.text : C.dim, { w: 900 });
    if (own) {
      const have = d.cards[r] || 0, need = t < M.MAX_TIER ? M.cardsNeed(r, t) : M.limitCost((d.limit || {})[r] || 0).cards, k = Math.min(1, have / need), ready = (t < M.MAX_TIER || ((d.limit || {})[r] || 0) < M.LIMIT_MAX) && have >= need;
      const bx = x - cw / 2 + 22, bw = cw - 70, by = y + ch * 0.38;
      g.fillStyle(0xFFFFFF, 0.1).fillRoundedRect(bx, by - 7, bw, 14, 7).fillStyle(ready ? 0x5BE39A : col, 1).fillRoundedRect(bx, by - 7, Math.max(14, bw * k), 14, 7);
      const lk = (d.limit || {})[r] || 0;
      T(this, x - cw / 2 + 14, y - ch / 2 + 30, `★${t}`, 20, inDeck || lk ? C.gold : C.sub, { ox: 0, w: 900 });
      if (lk && !d.newRunes[r]) T(this, x + cw / 2 - 14, y - ch / 2 + 30, `✦${lk}`, 20, C.gold, { ox: 1, w: 900 });
      if (ready) { const up = T(this, x + cw / 2 - 16, y + ch * 0.38, '▲', 22, C.green, { ox: 1, w: 900 }); this.tweens.add({ targets: up, y: up.y - 6, duration: 500, yoyo: true, repeat: -1 }); }
    } else T(this, x, y + ch * 0.38, RARITY_NAME[rar], 20, hex(col), { w: 800 });
    if (d.newRunes[r]) { const tg = this.add.graphics(); tg.fillStyle(0xFF5A9A, 1).fillRoundedRect(x + cw / 2 - 76, y - ch / 2 + 16, 64, 30, 15); const nt = T(this, x + cw / 2 - 44, y - ch / 2 + 31, 'NEW', 18, '#FFFFFF', { w: 900, shadow: false }); this.tweens.add({ targets: [tg, nt], alpha: 0.55, duration: 600, yoyo: true, repeat: -1 }); }
    const z = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { if (this.dragMoved) return; audio.play('sfx_click', { volume: 0.5 }); this.detail(r); });
  }
  detail(r) {
    const wasNew = !!load().newRunes[r]; M.seen(r);
    const d = load(), own = d.unlocked[r], t = d.tiers[r] || 1, rar = RARITY[r], col = RARITY_COLOR[rar];
    const partners = SYNERGY.filter(s => s.runes.includes(r));
    const ph = 980 + Math.max(0, partners.length - 1) * 70;   // 조합 줄이 많으면 창을 늘림
    const p = popup(this, null, 880, ph, wasNew ? { onClose: () => this.scene.restart({ slot: this.slot, filter: this.filter, y: this.grid ? this.grid.y : 0 }) } : {}), c = p.content;
    const top = -ph / 2;
    const glow = this.add.image(0, top + 190, 'glow').setTint(RUNES[r].color).setBlendMode('ADD').setScale(3).setAlpha(0.45); c.add(glow);
    c.add(this.add.image(0, top + 190, `die_${r}`).setDisplaySize(220, 220).setAlpha(own ? 1 : 0.4));
    c.add(this.add.image(0, top + 190, `rune_${r}`).setDisplaySize(128, 128).setAlpha(own ? 1 : 0.4));
    // 아래로 차례로 쌓음 (글줄 수에 따라 자동으로 밀림 — 겹치지 않게)
    let y = top + 330;
    const put = (str, size, color, o = {}) => { const tx = T(this, 0, y, str, size, color, { w: 800, oy: 0, wrap: 760, ...o }); c.add(tx); y += tx.height + (o.gap ?? 12); return tx; };
    put(RARITY_NAME[rar], 26, hex(col), { w: 900, ls: 6, gap: 4 });
    put(RUNES[r].name, 60, C.text, { w: 900, gap: 14 });
    put(DESC[r], 30, C.sub, { w: 700, gap: 10 });
    const R = RUNES[r]; put(`피해 ${R.dmg} · 초당 ${R.rate}회`, 24, C.dim, { gap: 22 });
    for (const s of partners) put(`${s.name} · ${s.runes.map(q => RUNES[q].name).join(' + ')}\n${s.desc}`, 22, C.gold, { gap: 12, lh: 4 });
    const by = ph / 2 - 110;
    if (!own) {
      c.add(T(this, 0, by - 120, '룬 제단에서 얻을 수 있어요', 30, C.text, { w: 800 }));
      c.add(btn(this, 0, by, 460, 120, '룬 제단으로', () => { p.close(); this.go('Altar'); }, { style: 'gold', size: 38 }));
      return;
    }
    const have = d.cards[r] || 0, need = M.cardsNeed(r, t), cost = M.tierCost(t);
    const lk = (d.limit || {})[r] || 0, lc = M.limitCost(lk), maxed = t >= M.MAX_TIER;
    c.add(T(this, 0, by - 120, !maxed ? `★${t} → ★${t + 1}   카드 ${have}/${need} · ◆${cost}` : lk >= M.LIMIT_MAX ? `★${t} · 한계 돌파 완료 ✦${lk}` : `한계 돌파 ✦${lk} → ✦${lk + 1}   카드 ${have}/${lc.cards} · ◆${lc.crystals}`, 28, maxed ? C.gold : C.text, { w: 800 }));
    const inDeck = d.deck.includes(r);
    c.add(btn(this, -200, by, 360, 120, inDeck ? '덱에 있어요' : '덱에 넣기', () => { if (inDeck) return toast(this, '이미 덱에 있어요', C.sub); this.swapPick(r); }, { style: inDeck ? 'ghost' : 'gold', size: 32 }));
    if (maxed) {
      const okL = lk < M.LIMIT_MAX && have >= lc.cards && d.crystals >= lc.crystals;
      c.add(btn(this, 200, by, 360, 120, lk >= M.LIMIT_MAX ? '완료' : '한계 돌파', () => {
        if (lk >= M.LIMIT_MAX) return;
        if (!M.limitBreak(r)) return toast(this, have < lc.cards ? '카드가 부족해요' : '수정이 부족해요', C.sub);
        audio.play('sfx_awaken', { volume: 0.8 }); this.cameras.main.flash(300, 255, 210, 120); p.close(); toast(this, `${R.name} 한계 돌파 ✦${lk + 1}!`, C.gold);
        this.time.delayedCall(160, () => this.scene.restart({ slot: this.slot, filter: this.filter, y: this.grid ? this.grid.y : 0 }));
      }, { style: okL ? 'gold' : 'ghost', size: 32 }));
      return;
    }
    const ok = t < M.MAX_TIER && have >= need && d.crystals >= cost;
    const ub = btn(this, 200, by, 360, 120, '등급업', () => {
      if (!M.upgrade(r)) return toast(this, have < need ? '카드가 부족해요 · 제단에서 같은 룬을 모아요' : '수정이 부족해요', C.sub);
      audio.play('sfx_awaken', { volume: 0.6 }); this.cameras.main.flash(200, 255, 230, 160); p.close(); this.scene.restart({ slot: this.slot, filter: this.filter, y: this.grid ? this.grid.y : 0 }); toast(this, `${R.name} ★${t + 1}!`, C.gold);
    }, { style: ok ? 'indigo' : 'ghost', size: 34 }); c.add(ub);
  }
  // 덱에 넣기: 바꿀 룬을 직접 고름 (덱 5칸 중 하나)
  swapPick(r) {
    const d = load(), p = popup(this, '어느 룬과 바꿀까요?', 1000, 680), c = p.content;
    c.add(this.add.image(0, -120, `die_${r}`).setDisplaySize(100, 100)); c.add(this.add.image(0, -120, `rune_${r}`).setDisplaySize(56, 56));
    c.add(T(this, 0, -46, `${RUNES[r].name}${josa(RUNES[r].name)} 넣을 자리를 눌러요`, 26, C.sub, { w: 800 }));
    d.deck.forEach((q, i) => {
      const x = (i - 2) * 180, y = 110;
      const im = this.add.image(x, y, `die_${q}`).setDisplaySize(140, 140).setInteractive({ useHandCursor: true }); c.add(im); c.add(this.add.image(x, y, `rune_${q}`).setDisplaySize(80, 80));
      c.add(T(this, x, y + 100, RUNES[q].name, 24, C.text, { w: 800 }));
      c.add(T(this, x, y + 134, `★${d.tiers[q] || 1}`, 20, C.sub, { w: 800 }));
      im.on('pointerup', () => { M.setSlot(i, r); this.slot = i; audio.play('sfx_summon', { volume: 0.6 }); p.close(); toast(this, `${RUNES[q].name} → ${RUNES[r].name}`, C.gold); this.time.delayedCall(160, () => this.scene.restart({ slot: i, filter: this.filter, y: this.grid ? this.grid.y : 0 })); });
    });
  }
  synergyList() {
    const d = load(), rows = Math.ceil(SYNERGY.length / 2), ph = Math.min(H - 120, 260 + rows * 112), p = popup(this, `덱 조합 ${SYNERGY.length}종`, 1040, ph), c = p.content;
    c.add(T(this, 0, -ph / 2 + 140, '두 룬을 같은 덱에 넣으면 보너스가 생겨요', 26, C.sub, { w: 800 }));
    const rh = Math.min(112, (ph - 230) / rows);
    SYNERGY.forEach((s, i) => {
      const x0 = i % 2 ? 20 : -490, y = -ph / 2 + 210 + Math.floor(i / 2) * rh, on = s.runes.every(r => d.deck.includes(r)), own = s.runes.every(r => d.unlocked[r]);
      s.runes.forEach((r, k) => { const x = x0 + 34 + k * 62; c.add(this.add.image(x, y, `die_${r}`).setDisplaySize(58, 58).setAlpha(d.unlocked[r] ? 1 : 0.3)); c.add(this.add.image(x, y, `rune_${r}`).setDisplaySize(34, 34).setAlpha(d.unlocked[r] ? 1 : 0.3)); });
      c.add(T(this, x0 + 140, y - 18, s.name + (on ? ' · 발동' : ''), 26, on ? C.gold : own ? C.text : C.dim, { ox: 0, w: 900 }));
      c.add(T(this, x0 + 140, y + 18, s.desc, 19, on ? '#FFE3A0' : C.sub, { ox: 0, w: 700 }));
    });
  }
  go(k) {
    this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k));
  }
}
