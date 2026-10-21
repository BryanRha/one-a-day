// 로딩: 장면 사진 · 사진관 배경 · 효과음 · 코드 텍스처
import { W, H, TITLE } from '../config.js?v=0.19.1';
import { SFX } from '../audio.js?v=0.19.1';
import { SCENES } from '../content.js?v=0.19.1';
import { makeTextures } from '../ui.js?v=0.19.1';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2 + 90, 480, 8, 0xFFFFFF, 0.15);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 8, 0xE9B44C).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#F6EBD6' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    this.load.image('studio', 'assets/ui/studio.webp');
    for (const s of SCENES) { this.load.image(s.img, `assets/scenes/${s.img}.webp`); if (s.sets) for (const st of s.sets) this.load.image(st.img, `assets/scenes/${st.img}.webp`); }
    for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() {
    makeTextures(this);
    // 아래 물건 목록 바탕: 인화지 띠
    const c = this.textures.createCanvas('paperstrip', 512, 128), g = c.getContext(), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#FBF4E6'); gr.addColorStop(1, '#EADBC0'); g.fillStyle = gr; g.fillRect(0, 0, 512, 128); c.refresh();
    const q = new URLSearchParams(location.search);
    if (q.get('play')) { const s = SCENES.find(x => x.id === q.get('play')); if (s) return this.scene.start(s.kind === 'ho' ? 'Hidden' : 'Diff', { id: s.id }); }
    this.scene.start('Home');
  }
}
