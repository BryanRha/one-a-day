// 로딩: 재료 · 생산기 · 인물 · 매장 · 배경 · 효과음
import { W, H, TITLE } from '../config.js?v=0.53.2';
import { SFX, BGM, audio } from '../audio.js?v=0.53.2';
import { makeTextures } from '../ui.js?v=0.53.2';
import { CHAINS, MAX_LV, ALL_SPOTS } from '../data.js?v=0.53.2';
import { ALL_CARDS } from '../album.js?v=0.53.2';

const ITEMS = ['gen_dew', 'gen_gift', 'box', 'bubble', 'coin', 'gem', 'energy', 'en1', 'en2', 'en3', 'co1', 'co2', 'co3', 'ge1', 'ge2', 'ge3', 'scissors', 'ribbon', 'hourglass', 'pickbox', 'chest', 'cardpack', 'pack_basic', 'pack_gold', 'pack_diamond', 'joker', 'piggy', 'vault', 'calendar', 'album', 'ev_race', 'ev_ladder', 'ev_vip', 'petal', 'medal1', 'medal2', 'medal3', 'vip_ticket', 'deco_tree', 'deco_booth', 'deco_garland', 'bingo_ball', 'roulette', 'shovel', 'dirt', 'key1', 'key2', 'key3', 'duo', ...['summer', 'autumn', 'winter'].flatMap(t => [`deco_${t}_tree`, `deco_${t}_booth`, `deco_${t}_garland`, `ev_ladder_${t}`, `petal_${t}`])];
for (const g of Object.keys(CHAINS)) for (let l = 1; l <= 5; l++) ITEMS.push(`gen_${g}${l}`);
for (const c of Object.keys(CHAINS)) for (let l = 1; l <= MAX_LV; l++) ITEMS.push(`${c}${l}`);
const CHARS = ['c_soyun_smile', 'c_soyun_shock', 'c_soyun_fight', 'c_grandma', 'c_doyun_smile', 'c_doyun_shy', 'c_sera_smug', 'c_sera_angry', 'c_pinky_wink', 'c_pinky_wow', 'c_haneul_smile', 'c_haneul_worry', 'c_jiho_calm', 'c_jiho_guilty', ...Array.from({ length: 10 }, (_, i) => `u${i + 1}`)];
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0xFBEFE8);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 10, 0xE86A8E, 0.2);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 10, 0xE86A8E).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '96px', color: '#E86A8E' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const k of ITEMS) this.load.image(k, `assets/items/${k}.webp`);
    for (const k of CHARS) this.load.image(k, `assets/chars/${k}.webp`);
    for (const c of ALL_CARDS) this.load.image(c.key, `assets/cards/${c.key}.webp`);
    for (const s of ALL_SPOTS) for (let v = 0; v < 4; v++) this.load.image(`${s.id}_${v}`, `assets/furn/${s.id}_${v}.webp`);
    for (const b of ['room', 'room2', 'room3', 'room4', 'room5', 'room6', 'bg_alley', 'bg_farm', 'bg_office']) this.load.image(b, `assets/bg/${b}.webp`);
    for (const n of [...SFX, ...BGM]) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); audio.normalize && audio.normalize(); this.scene.start('Home'); }
}
