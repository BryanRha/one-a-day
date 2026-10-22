// 로딩: 1화 그림 · 인물 · 단서 · 효과음 · 코드 텍스처
import { W, H, TITLE } from '../config.js?v=0.21.0';
import { SFX } from '../audio.js?v=0.21.0';
import { makeTextures } from '../ui.js?v=0.21.0';

const WEBP = ['map1', 'ev1_a', 'ev1_b', 'bg_flower', 'bg_office', 't1_1', 't1_2', 't1_3', 't1_4'];
const PNG = ['c_seoyun_smile', 'c_seoyun_doubt', 'c_seoyun_shock', 'c_dohyun_smile', 'c_dohyun_nervous', 'c_jia', 'k_idcard', 'k_order', 'k_ring', 'k_card', 'k_key', 'k_note'];
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 8, 0xFFFFFF, 0.15);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 8, 0xFF9DB6).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#FFF6F8' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const k of WEBP) this.load.image(k, `assets/v2/${k}.webp`);
    for (const k of PNG) this.load.image(k, `assets/v2/${k}.png`);
    for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); this.scene.start('Library'); }
}
