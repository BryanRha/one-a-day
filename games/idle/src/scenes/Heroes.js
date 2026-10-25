// 영웅: 가진 영웅 목록(전투력 순) · 못 만난 영웅은 그림자 · 누르면 상세(레벨업 · 승급 · 팀 넣고 빼기)
import { W, H } from '../config.js?v=0.55.0';
import { T, R, C, TS, btn, sheet, rbox, toast } from '../ui.js?v=0.55.0';
import { audio } from '../audio.js?v=0.55.0';
import { load, save } from '../save.js?v=0.55.0';
import { HEROES, GRADES, ROLES, SKILL_KIND, STAR_NEED, MAX_STAR, SUMMONABLE } from '../data.js?v=0.55.0';
import { heroStats, heroPower, levelCost, levelUp, starUp, levelCap, autoTeam, fmt, potionUp, tokenShard, TOKEN_SHARD, petLv, petBonus } from '../state.js?v=0.55.0';
import { PETS } from '../data.js?v=0.55.0';
import { PET_STAT, petFood, petFeed, petBuy } from '../content.js?v=0.55.0';
import { panelBg } from './Hud.js?v=0.55.0';
import { TOP, NAV_H } from '../hud.js?v=0.55.0';
import { SKILL_ICON } from './Boot.js?v=0.55.0';
import { livePuppet } from '../puppet.js?v=0.55.0';

export class HeroesScene extends Phaser.Scene {
  constructor() { super('Heroes'); }
  init(data) { this.tab = (data && data.tab) || this.tab || 'heroes'; }
  create() {
    const d = this.d = load(), own = Object.keys(d.heroes);
    let y0 = panelBg(this, '영웅', `${own.length} / ${SUMMONABLE.length + 8} 명 · 팀 ${d.team.length}/10 · 물약 ${d.items.potion || 0} · 증표 ${d.items.token || 0}`);
    [['heroes', '영웅'], ['pets', '펫']].forEach(([k, n], i) => { const x = 40 + i * 250, on = k === this.tab; this.add.existing(rbox(this, x, y0, 230, 70, { fill: on ? '#F2C46B' : '#1A2350', line: '#3A4A86', r: 35, ox: 0, oy: 0 })); T(this, x + 115, y0 + 35, n, 28, on ? '#3A2400' : C.dim, { w: 900 }); this.add.zone(x + 115, y0 + 35, 230, 70).setInteractive().on('pointerup', () => { if (k !== this.tab) { audio.play('sfx_tap'); this.scene.restart({ tab: k }); } }); });
    y0 += 90; window.__heroes = this; if (this.tab === 'pets') return this.pets(y0);
    btn(this, W - 150, y0 - 45, 240, 70, '자동 편성', () => { autoTeam(true); audio.play('sfx_tap'); this.refreshBattle(); this.scene.restart(); }, { style: 'blue', size: 28 });
    // 목록 (스크롤)
    const list = [...own.sort((a, b) => heroPower(b) - heroPower(a)), ...Object.keys(HEROES).filter(id => !d.heroes[id]).sort((a, b) => HEROES[b].g - HEROES[a].g)];
    const cols = 4, cw = 236, ch = 300, gap = 16, x0 = (W - cols * cw - (cols - 1) * gap) / 2, top = y0 + 10, bottom = H - NAV_H - 10;
    this.listC = this.add.container(0, top); const mask = this.make.graphics().fillRect(0, top, W, bottom - top); this.listC.setMask(mask.createGeometryMask());
    list.forEach((id, i) => { const x = x0 + (i % cols) * (cw + gap), y = Math.floor(i / cols) * (ch + gap); this.listC.add(this.card(x, y, id, cw, ch)); });
    this.maxScroll = Math.max(0, Math.ceil(list.length / cols) * (ch + gap) - (bottom - top) + 20);
    let sy = 0, dragY = null, moved = 0; this.input.on('pointerdown', p => { dragY = p.y; moved = 0; });
    this.input.on('pointermove', p => { if (dragY === null || !p.isDown) return; const dy = p.y - dragY; dragY = p.y; moved += Math.abs(dy); sy = Phaser.Math.Clamp(sy + dy, -this.maxScroll, 0); this.listC.y = top + sy; });
    this.input.on('pointerup', () => { dragY = null; }); this.moved = () => moved > 14;
    window.__heroes = this;
  }
  card(x, y, id, cw, ch) {
    const H0 = HEROES[id], h = this.d.heroes[id], c = this.add.container(x, y), gr = GRADES[H0.g], inTeam = this.d.team.includes(id);
    c.add(rbox(this, 0, 0, cw, ch, { fill: h ? '#1A2350' : '#10152E', line: h ? gr.css : '#2A3260', lw: h ? 4 : 2, r: 20, ox: 0, oy: 0 }));
    const f = this.add.image(cw / 2, 108, `face_${id}`); f.setDisplaySize(cw - 24, cw - 24); if (!h) f.setTintFill(0x2A3260).setAlpha(0.8); c.add(f);
    c.add(rbox(this, 12, 12, 92, 34, { fill: gr.css, r: 10, ox: 0, oy: 0 })); c.add(T(this, 58, 29, gr.n, 20, '#14182E', { w: 900 }));
    if (h) { c.add(T(this, cw / 2, 232, '★'.repeat(h.star), 22, C.gold, { w: 900 })); c.add(T(this, cw / 2, 268, `${H0.n}  Lv.${h.lv}`, 24, C.ink, { w: 900 }));
      if (inTeam) { c.add(rbox(this, cw - 70, 12, 58, 34, { fill: '#2FA866', r: 10, ox: 0, oy: 0 })); c.add(T(this, cw - 41, 29, '팀', 20, '#FFFFFF', { w: 900 })); }
      if (h.star < MAX_STAR && h.shards >= STAR_NEED[h.star]) c.add(this.add.circle(cw - 18, ch - 18, 12, 0xFF5A5A).setStrokeStyle(3, 0xFFFFFF)); }
    else c.add(T(this, cw / 2, 254, H0.herald ? '사도 · 지역 해방' : '미획득', 22, C.sub, { w: 800 }));
    c.setSize(cw, ch).setInteractive(new Phaser.Geom.Rectangle(cw / 2, ch / 2, cw, ch), Phaser.Geom.Rectangle.Contains).on('pointerup', () => { if (this.moved()) return; audio.play('sfx_tap'); this.detail(id); });
    return c;
  }
  pets(y0) {
    const d = this.d;
    T(this, 60, y0 + 6, `데리고 다니는 펫이 기사단 전체를 도와요 · 펫 먹이 ${d.items.food || 0}`, 24, C.dim, { ox: 0, w: 800 });
    PETS.forEach((P, i) => { const y = y0 + 40 + i * 300, lv = petLv(P.id), on = d.pet === P.id;
      this.add.existing(rbox(this, 40, y, W - 80, 280, { fill: on ? '#2A2350' : '#1A2350', line: on ? '#F2C46B' : '#3A4A86', lw: on ? 4 : 2, r: 26, ox: 0, oy: 0 }));
      const im = this.add.image(170, y + 260, `hero_${P.id}`).setOrigin(0.5, 1); im.setScale(240 / im.height); if (!lv) im.setTintFill(0x2A3260);
      T(this, 320, y + 50, `${P.n}  ${lv ? `Lv.${lv}` : ''}`, 34, C.ink, { ox: 0, w: 900 }); T(this, 320, y + 92, `${P.en} · ${P.d}`, 22, C.dim, { ox: 0, w: 800 });
      T(this, 320, y + 140, `${PET_STAT[P.stat]} +${petBonus(P.id, Math.max(1, lv)).toFixed(1)}%`, 30, C.gold, { ox: 0, w: 900 });
      if (!lv) btn(this, W - 170, y + 220, 240, 80, `◆${P.cost} 데려오기`, () => { if (!petBuy(P.id)) return toast(this, '보석이 부족해요'); audio.play('sfx_epic', { volume: 0.5 }); this.scene.restart(); }, { size: 26 });
      else { btn(this, 440, y + 220, 240, 80, `먹이 ${petFood(lv)}`, () => { if (!petFeed(P.id)) return toast(this, '펫 먹이가 부족해요 · 펫 둥지 던전'); audio.play('sfx_levelup', { volume: 0.4 }); this.refreshBattle(); this.scene.restart(); }, { style: 'green', size: 26 });
        btn(this, W - 170, y + 220, 240, 80, on ? '데리고 있음' : '데려가기', () => { d.pet = P.id; save(); audio.play('sfx_tap'); this.refreshBattle(); this.scene.restart(); }, { style: on ? 'dark' : 'gold', size: 26 }); } });
  }
  refreshBattle() { const b = this.scene.get('Battle'); if (b && b.placeTeam && !b.boss) b.placeTeam(); }
  detail(id) {
    const H0 = HEROES[id], h = this.d.heroes[id], gr = GRADES[H0.g], R0 = ROLES[H0.role];
    const p = sheet(this, { size: 'L', title: H0.n, sub: `${H0.en} · ${H0.t}` });
    let art; if (h) { art = livePuppet(this, `hero_${id}`, 480).rope; art.setPosition(-210, 420); } else { art = this.add.image(-210, 420, `hero_${id}`).setOrigin(0.5, 1); art.setScale(480 / art.height).setTintFill(0x2A3260); } p.content.add(art);
    p.content.add(rbox(this, 230, 20, 160, 44, { fill: gr.css, r: 12 })); p.content.add(T(this, 230, 20, `${gr.n} · ${R0.n}`, 22, '#14182E', { w: 900 }));
    const sk = this.add.image(90, 140, `sk${SKILL_ICON[H0.skill.kind]}`).setDisplaySize(96, 96); p.content.add(sk);
    p.content.add(T(this, 150, 112, H0.skill.n, 30, C.gold, { ox: 0, w: 900 })); p.content.add(T(this, 150, 150, SKILL_KIND[H0.skill.kind], 22, C.dim, { ox: 0, w: 800 }));
    p.content.add(T(this, 40, 220, H0.skill.d, 24, C.ink, { ox: 0, w: 800, wrap: 400, align: 'left' }));
    if (!h) { p.content.add(T(this, 230, 330, H0.herald ? '지역의 사도를 물리치면 합류해요' : '영웅 소환에서 만날 수 있어요', 26, C.dim, { w: 800, wrap: 420 })); p.foot([{ t: '닫기', style: 'dark' }]); return; }
    const st = heroStats(id), cap = levelCap(id);
    const rows = [['레벨', `${h.lv} / ${cap}`], ['전투력', fmt(heroPower(id))], ['공격', fmt(st.atk)], ['체력', fmt(st.hp)], ['별', `${'★'.repeat(h.star)}  조각 ${h.shards}/${h.star < MAX_STAR ? STAR_NEED[h.star] : '-'}`]];
    rows.forEach(([k, v], i) => { p.content.add(T(this, 40, 300 + i * 46, k, 26, C.dim, { ox: 0, w: 800 })); p.content.add(T(this, 420, 300 + i * 46, v, 26, C.ink, { ox: 1, w: 900 })); });
    const inTeam = this.d.team.includes(id), it = this.d.items;
    if ((it.potion || 0) > 0) p.content.add(btn(this, 230, 560, 400, 76, `물약 사용 (${it.potion}개)`, () => { if (!potionUp(id, Math.min(10, it.potion))) return toast(this, '레벨 한계예요'); audio.play('sfx_levelup', { volume: 0.4 }); p.close(); this.refreshBattle(); this.scene.restart(); }, { style: 'green', size: 26 }));
    if ((it.token || 0) >= TOKEN_SHARD && h.star < MAX_STAR) p.content.add(btn(this, -230, 560, 400, 76, `증표 ${TOKEN_SHARD} → 조각 +10`, () => { if (tokenShard(id)) { audio.play('sfx_coin'); p.close(); this.scene.restart(); } }, { style: 'blue', size: 26 }));
    p.foot([
      { t: `레벨업 ●${fmt(levelCost(h.lv))}`, fn: () => { if (h.lv >= cap) return toast(this, '레벨 한계 · 별을 올려요'); if (!levelUp(id, 1)) return toast(this, '골드가 부족해요'); audio.play('sfx_levelup', { volume: 0.4 }); p.close(); this.refreshBattle(); this.time.delayedCall(160, () => { this.scene.restart(); this.time.delayedCall(60, () => window.__heroes && window.__heroes.detail(id)); }); } },
      { t: h.star >= MAX_STAR ? '별 최대' : `승급 ★${h.star + 1}`, style: 'blue', fn: () => { if (!starUp(id)) return toast(this, h.star >= MAX_STAR ? '이미 최고 별이에요' : '조각이 부족해요 · 같은 영웅을 소환하면 모여요'); audio.play('sfx_epic', { volume: 0.5 }); p.close(); this.refreshBattle(); this.scene.restart(); } },
      { t: inTeam ? '팀에서 빼기' : '팀에 넣기', style: 'dark', fn: () => { const d = this.d; if (inTeam) { if (d.team.length <= 1) return toast(this, '한 명은 남아야 해요'); d.team = d.team.filter(x => x !== id); } else { if (d.team.length >= 10) return toast(this, '팀은 10명까지예요 · 먼저 한 명을 빼요'); d.team.push(id); } save(); p.close(); this.refreshBattle(); this.scene.restart(); } },
    ]);
  }
}
