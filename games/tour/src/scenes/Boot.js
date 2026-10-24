// 로딩: 명소 칸 · 캐릭터 · 아이콘 · 배경 · 소리
import { W, H, TITLE } from '../config.js?v=0.36.0';
import { SFX, BGM, audio } from '../audio.js?v=0.36.0';
import { makeTextures } from '../ui.js?v=0.36.0';
import { TILES, CHARS } from '../data.js?v=0.36.0';

const ITEMS = ['flag', 'villa', 'building', 'hotel', 'crown', 'chance', 'angel', 'cash', 'tax', 'trophy', 'dice', 'bankrupt', 'lantern', 'ktx', 'island'];
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0xBFE6F5);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 10, 0x3C7FD8, 0.2);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 10, 0x3C7FD8).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '96px', color: '#2E5FB8' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const t of new Set(TILES.map(t => t.img))) if (!ITEMS.includes(t)) this.load.image(t, `assets/tiles/${t}.webp`);
    for (const k of ITEMS) this.load.image(k, `assets/items/${k}.webp`);
    for (const c of CHARS) this.load.image(c.img, `assets/chars/${c.img}.webp`);
    for (const b of ['map', 'lobby']) this.load.image(b, `assets/bg/${b}.webp`);
    for (const n of [...SFX, ...BGM]) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); audio.normalize(); this.scene.start('Lobby'); }
}
