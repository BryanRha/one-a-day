// 로딩: 건물 · 물건 · 땅 · 인물 · 소리
import { W, H, TITLE } from '../config.js?v=0.52.0';
import { SFX, BGM, audio } from '../audio.js?v=0.52.0';
import { makeTextures } from '../ui.js?v=0.52.0';
import { ITEMS, BUILDS, CROPS } from '../data.js?v=0.52.0';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x7CC26A);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 12, 0xFFFFFF, 0.3);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 12, 0xFFE27A).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 20, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '140px', color: '#FFFFFF', stroke: '#3E2A14', strokeThickness: 18 }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const [k, B] of Object.entries(BUILDS)) if (k !== 'field') this.load.image(k, `assets/${B.k === 'deco' ? 'd' : 'b'}/${k}.webp`);
    for (let v = 1; v <= 4; v++) for (const f of ['f', 'b']) this.load.image(`car${v}_${f}`, `assets/s/car${v}_${f}.webp`);
    this.load.image('site', 'assets/b/site.webp');
    for (const k of ['hourglass', 'marketbasket', 'art_crown', 'art_seal', 'art_coin', 'art_scepter', 'art_conch', 'art_compass', 'art_bell', 'art_comb', 'art_ammonite', 'art_tooth', 'art_amber', 'art_leaf', 'art_sickle', 'art_lantern', 'art_clog']) this.load.image(k, `assets/i/${k}.webp`);
    for (let v = 1; v <= 5; v++) for (const f of ['f1', 'f2', 'b1', 'b2']) this.load.image(`w${v}_${f}`, `assets/s/w${v}_${f}.webp`);
    for (const k of ['sparrow', 'bully', 'leak', 'plank', 'heart', 'gift', 'rock', 'rock_iron', 'rock_gold', 'rock_gem', 'dirt', 'chest', 'bush', 'sand', 'stump', 'boulder', 'vines', 'treasure']) this.load.image(k, `assets/s/${k}.webp`);
    this.load.image('island_bg', 'assets/bg/island.webp');
    this.load.image('mine_bg', 'assets/bg/mine.webp'); this.load.image('sparrow_bg', 'assets/bg/sparrow.webp'); this.load.image('water_bg', 'assets/bg/water.webp'); this.load.image('patrol_bg', 'assets/bg/patrol.webp'); for (const k of ['bully1', 'bully2', 'bully3', 'lost_coins', 'lost_ribbon', 'lost_key', 'lost_duck', 'lost_hat']) this.load.image(k, 'assets/s/' + k + '.webp'); for (const k of ['login', 'fest', 'race', 'album', 'pass']) this.load.image('ev_' + k, 'assets/bg/ev_' + k + '.webp'); for (const k of ['pipe_s', 'pipe_c', 'pipe_t', 'pipe_x']) { this.load.image(k, `assets/s/${k}.webp`); this.load.image(k + '_w', `assets/s/${k}_w.webp`); }
    this.load.image('barn', 'assets/b/barn.webp'); this.load.image('mine_b', 'assets/b/mine.webp'); this.load.image('orderboard', 'assets/b/orderboard.webp');
    for (const k of [...Object.keys(ITEMS), 'coin', 'gem', 'xp', 'pop', 'tools', 'seedbag', 'sickle', 'ticket', 'trophy', 'cardpack', 'calendar', 'passmedal', 'firework', 'compass', 'upstar', 'plane', 'crate']) this.load.image(k, `assets/i/${k}.webp`);
    for (const k of Object.keys(CROPS)) this.load.image(`ripe_${k}`, `assets/t/ripe_${k}.webp`);
    for (const k of [...Object.keys(CROPS), 'sprouts']) this.load.image(`crop_${k}`, `assets/t/crop_${k}.webp`);
    for (const k of ['grass', 'soil', 'sprouts', 'forest', 'loco', 'wagon', 'station', 'dog', 'digspot']) this.load.image(k, `assets/t/${k}.webp`);
    for (const k of ['princess', 'princess_shock', 'hans', 'sam', 'ian', 'pachulo', 'brook', 'king']) this.load.image(k, `assets/c/${k}.webp`);
    for (const n of [...SFX, ...BGM]) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); audio.normalize(); this.scene.start('Town'); }
}
