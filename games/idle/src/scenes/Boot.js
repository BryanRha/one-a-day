// 로딩: 영웅 원화 · 얼굴 · 지금 지역 배경 · 아이콘 · 이펙트 · 소리
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.55.2';
import { SFX, BGM, audio } from '../audio.js?v=0.55.2';
import { makeTextures } from '../ui.js?v=0.55.2';
import { HEROES, SLOTS, REGIONS, PETS } from '../data.js?v=0.55.2';
import { load } from '../save.js?v=0.55.2';
import { regionOf } from '../state.js?v=0.55.2';
import { PARTS } from '../parts.js?v=0.55.2';

export const SKILL_ICON = { strike: 31, aoe: 25, line: 2, heal: 104, shield: 13, buff: 20, taunt: 103 };
export const SHOP_ICONS = [3, 4, 5, 6, 7, 16, 29, 30, 31, 38, 39, 40, 41, 114, 139, 278, 378, 379, 380, 381, 383, 384, 389];
export const MOB_IDS = ['doom', 'walg', 'jimber', 'wooden', 'luppine', 'garuman', 'tron', 'mano'];
// 지역 배경을 필요할 때 불러오기 (처음엔 지금 지역만)
export function loadRegion(sc, r, done) {
  const keys = [...new Set(REGIONS[r].bg)].filter(k => !sc.textures.exists(`bg_${k}`));
  if (!keys.length) return done && done();
  keys.forEach(k => sc.load.image(`bg_${k}`, `assets/bg/${k}.webp`)); sc.load.once('complete', () => done && done()); sc.load.start();
}
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B1028);
    this.add.text(W / 2, H / 2 - 60, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#F2C46B' }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 20, TITLE_EN, { fontFamily: 'Pretendard', fontStyle: '700', fontSize: '34px', color: '#9AA6CC' }).setOrigin(0.5);
    this.add.rectangle(W / 2, H / 2 + 110, 520, 10, 0xF2C46B, 0.2); const bar = this.add.rectangle(W / 2 - 260, H / 2 + 110, 4, 10, 0xF2C46B).setOrigin(0, 0.5);
    this.load.on('progress', v => { bar.width = 520 * v; });
    for (const id of [...Object.keys(HEROES), ...MOB_IDS, ...PETS.map(p => p.id)]) { this.load.image(`hero_${id}`, `assets/hero/${id}.webp`); this.load.image(`face_${id}`, `assets/face/${id}.webp`); }
    for (const sl of SLOTS) for (const s of sl.sets) for (let g = 0; g < 6; g++) this.load.image(`eq${s + g}`, `assets/eq/${s + g}.webp`);
    for (const n of new Set(Object.values(SKILL_ICON))) this.load.image(`sk${n}`, `assets/sk/${n}.webp`);
    for (const n of SHOP_ICONS) this.load.image(`shop${n}`, `assets/shop/${n}.webp`);
    this.load.image('i_gold', 'assets/shop/4.webp'); this.load.image('i_gem', 'assets/shop/5.webp'); this.load.image('i_key', 'assets/shop/3.webp');
    for (const f of ['aaaaa', 'ava_texture_02', 'carson_skill_01', 'deino_at_hit', 'fergus_skill01']) this.load.image(`fx_${f}`, `assets/fx/${f}.webp`);
    for (const k of new Set(REGIONS[regionOf(load().stage)].bg)) this.load.image(`bg_${k}`, `assets/bg/${k}.webp`);
    for (const [id, P] of Object.entries(PARTS)) for (const n of Object.keys(P.parts)) this.load.image(`part_${id}_${n}`, `assets/parts/${id}_${n}.webp`);
    for (const k of ['cs_sun', 'cs_nox', 'cs_lantern', 'cs_dawn']) this.load.image(`cut_${k}`, `assets/cut/${k}.webp`);
    for (const n of [...SFX, ...BGM]) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() {
    makeTextures(this);
    // 이펙트 시트를 칸으로 나눠 쓰기 (2×2 · 4×4)
    const cut = (key, n) => { const t = this.textures.get(key); if (!t || t.key === '__MISSING') return; const src = t.getSourceImage(), w = src.width / n, h = src.height / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) t.add(y * n + x, 0, x * w, y * h, w, h); };
    cut('fx_carson_skill_01', 2); cut('fx_fergus_skill01', 2); cut('fx_deino_at_hit', 2); cut('fx_ava_texture_02', 2); cut('fx_aaaaa', 4);
    audio.normalize && audio.normalize();
    this.scene.start('Battle'); this.scene.launch('Hud');
  }
}
