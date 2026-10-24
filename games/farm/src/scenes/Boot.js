// 로딩: 건물 · 물건 · 땅 · 인물 · 소리
import { W, H, TITLE } from '../config.js?v=0.37.0';
import { SFX, BGM, audio } from '../audio.js?v=0.37.0';
import { makeTextures } from '../ui.js?v=0.37.0';
import { ITEMS, BUILDS, CROPS } from '../data.js?v=0.37.0';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x7CC26A);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 12, 0xFFFFFF, 0.3);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 12, 0xFFE27A).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 20, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '140px', color: '#FFFFFF', stroke: '#3E2A14', strokeThickness: 18 }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const k of Object.keys(BUILDS)) if (k !== 'field') this.load.image(k, `assets/b/${k}.webp`);
    this.load.image('barn', 'assets/b/barn.webp'); this.load.image('orderboard', 'assets/b/orderboard.webp');
    for (const k of [...Object.keys(ITEMS), 'coin', 'gem', 'xp', 'pop', 'tools', 'seedbag', 'sickle']) this.load.image(k, `assets/i/${k}.webp`);
    for (const k of Object.keys(CROPS)) this.load.image(`ripe_${k}`, `assets/t/ripe_${k}.webp`);
    for (const k of ['grass', 'soil', 'sprouts', 'forest', 'loco', 'wagon', 'station', 'dog', 'digspot']) this.load.image(k, `assets/t/${k}.webp`);
    for (const k of ['princess', 'princess_shock', 'hans', 'sam', 'ian', 'pachulo', 'brook', 'king']) this.load.image(k, `assets/c/${k}.webp`);
    for (const n of [...SFX, ...BGM]) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); audio.normalize(); this.scene.start('Town'); }
}
