// 로딩: 그림 · 효과 시트 · 효과음, 코드로 그리는 텍스처
import { W, H, TITLE } from '../config.js?v=0.63.1';
import { SFX } from '../audio.js?v=0.63.1';
import { makeTextures } from '../fx.js?v=0.63.1';
import { makeIcons } from '../pui.js?v=0.63.1';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2 + 90, 480, 8, 0xFFFFFF, 0.15);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 8, 0xFFD45A).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#FFF8E6' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [key, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(key, `assets/img/${key}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    });
    this.load.on('loaderror', () => {});   // 아직 없는 효과음은 건너뜀
  }
  create() {
    makeTextures(this); makeIcons(this);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: 0 });
    const q = new URLSearchParams(location.search);
    this.scene.start(q.has('play') ? 'Play' : 'Home', q.has('play') ? { mode: 'free', mapId: q.get('play') || 'm1' } : undefined);
  }
}
