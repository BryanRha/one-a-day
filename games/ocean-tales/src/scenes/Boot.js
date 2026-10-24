// 로딩: manifest.json 을 읽고 모든 리소스를 불러오며 진행 막대를 보여준다.
import { W, H, TXT, setH, asset } from '../config.js?v=0.36.1';
import { t } from '../i18n.js?v=0.36.1';
import { pickTip } from '../tips.js?v=0.36.1';
import { audio } from '../audio.js?v=0.36.1';


export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('manifest', asset('assets/manifest.json'));
    this.load.image('bg_loading', asset('assets/img/bg_loading.png'));
    this.load.image('logo_game', asset('assets/img/logo_game.png'));
    this.load.image('loading_bar_bg', asset('assets/img/loading_bar_bg.png'));
    this.load.image('loading_bar_fill', asset('assets/img/loading_bar_fill.png'));
  }

  create() {
    setH(this.scale.height);
    const bg = this.add.image(W / 2, H / 2, 'bg_loading');
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    const logo = this.add.image(W / 2, H * 0.36, 'logo_game').setScale(0.95);
    this.tweens.add({ targets: logo, y: logo.y - 20, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.InOut' });
    this.add.image(W / 2, H * 0.7, 'loading_bar_bg');
    const fill = this.add.image(W / 2 - 350, H * 0.7, 'loading_bar_fill').setOrigin(0, 0.5).setCrop(0, 0, 0, 60);
    fill.x = W / 2 - fill.width / 2;
    const pct = this.add.text(W / 2, H * 0.7 + 90, '0%', TXT.mid).setOrigin(0.5);
    // 로딩 TIP (무작위) — 너무 빨리 넘어가지 않게 최소 1.6초는 보여 준다
    const tip = this.add.text(W / 2, H * 0.84, pickTip(), { ...TXT.small, fontSize: '36px', align: 'center', wordWrap: { width: W - 160, useAdvancedWrap: true }, lineSpacing: 10 }).setOrigin(0.5);
    tip.setAlpha(0); this.tweens.add({ targets: tip, alpha: 1, duration: 400 });
    const t0 = Date.now();

    const m = this.cache.json.get('manifest');
    // 월드 배경(큰 이미지)은 레벨에 들어갈 때 그 월드 것만 불러온다 (Game.preload)
    for (const k of m.images) if (!k.startsWith('bg_game_')) this.load.image(k, asset(`assets/img/${k}.png`));
    this.load.image('app_icon_small', asset('icons/icon_192.png'));   // 홈 화면 추가 안내용
    for (const [k, s] of Object.entries(m.sheets)) this.load.spritesheet(k, asset(`assets/fx/${k}.png`), { frameWidth: s.frameWidth, frameHeight: s.frameHeight, endFrame: s.frames - 1 });
    for (const k of m.fonts) this.load.bitmapFont(k, asset(`assets/fonts/${k}.png`), asset(`assets/fonts/${k}.xml`));
    // AAC 오디오. 호스팅에 따라 .m4a 대신 .mp4 확장자로 올릴 수 있어 manifest.audioExt 로 지정
    // 효과음과 타이틀 곡만 먼저 받고, 나머지 배경음은 처음 틀 때 받는다 (첫 로딩 시간 단축)
    audio.urlFor = k => asset(`assets/audio/${k}.${m.audioExt || 'm4a'}`);
    audio.audioList = m.audio;
    for (const k of m.audio) if (!k.startsWith('bgm_') || k === 'bgm_title') this.load.audio(k, [{ type: 'm4a', url: audio.urlFor(k) }]);
    this.registry.set('sheets', m.sheets);

    this.load.on('progress', p => { fill.setCrop(0, 0, fill.width * p, fill.height); pct.setText(`${Math.round(p * 100)}%`); });
    this.load.once('complete', () => {
      for (const [k, s] of Object.entries(m.sheets)) {
        this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(k, { start: 0, end: s.frames - 1 }), frameRate: s.fps, hideOnComplete: true });
      }
      pct.setText(t('tap'));
      this.time.delayedCall(Math.max(0, 1600 - (Date.now() - t0)), () => this.scene.start('Title'));
    });
    this.load.start();
  }
}
