import { W, H, TXT, VERSION } from '../config.js?v=0.59.1';
import { t } from '../i18n.js?v=0.59.1';
import { audio } from '../audio.js?v=0.59.1';
import { load } from '../save.js?v=0.59.1';
import { button, iconButton, popup, toast, enableGlow } from '../ui/widgets.js?v=0.59.1';
import { settingsPopup } from './Map.js?v=0.59.1';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    enableGlow(this);
    const bg = this.add.image(W / 2, H / 2, 'bg_title');
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    const logo = this.add.image(W / 2, H * 0.2, 'logo_game').setScale(1.05);
    this.tweens.add({ targets: logo, scale: 1.1, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut' });

    // 메인 일러스트(AI)에 고래와 바다 친구들이 이미 있음 → 천천히 다가오는 연출 + 떠오르는 물방울만
    const cover = bg.scale;
    this.tweens.add({ targets: bg, scale: cover * 1.05, yoyo: true, repeat: -1, duration: 12000, ease: 'Sine.InOut' });
    for (let i = 0; i < 14; i++) {
      const b = this.add.circle(Phaser.Math.Between(40, W - 40), H + 40, Phaser.Math.Between(6, 18), 0xFFFFFF, 0.35).setStrokeStyle(3, 0xFFFFFF, 0.7);
      this.tweens.add({ targets: b, y: -40, x: b.x + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(5000, 9000), repeat: -1, delay: Phaser.Math.Between(0, 6000) });
    }

    const play = button(this, W / 2, H * 0.36, t('play'), () => this.go(), { width: 600, height: 180, size: 72 });
    this.tweens.add({ targets: play, scale: 1.05, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.InOut' });
    iconButton(this, W - 100, 110, 'ico_settings', () => settingsPopup(this), { size: 130 });
    // 홈 화면에 추가 (이미 앱으로 실행 중이면 숨김)
    const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
    if (!standalone && !window.__installed) {
      iconButton(this, 100, 110, 'ico_install', () => this.install(), { size: 130 });
      this.add.text(100, 205, t('install'), { ...TXT.small, fontSize: '28px', strokeThickness: 7 }).setOrigin(0.5);
    }
    this.add.text(W / 2, H - 50, `v${VERSION}`, { ...TXT.small, fontSize: '28px', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0.7);

    // 브라우저 자동재생 정책: 첫 터치 이후에 음악 시작
    if (this.sound.locked) this.sound.once('unlocked', () => audio.music('bgm_title'));
    else audio.music('bgm_title');
    this.cameras.main.fadeIn(300, 189, 235, 255);
    load();
  }

  async install() {
    const ua = navigator.userAgent;
    if (window.__installPrompt) {   // 안드로이드 크롬·삼성 인터넷: 바로 설치 창
      const ev = window.__installPrompt; window.__installPrompt = null;
      ev.prompt();
      try { const r = await ev.userChoice; if (r.outcome === 'accepted') toast(this, t('installDone')); } catch { /* */ }
      return;
    }
    const inApp = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua);
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const msg = inApp ? t('installInApp') : ios ? t('installIos') : t('installMenu');
    const p = popup(this, { title: t('install'), width: 860, height: 640 });
    p.box.add(this.add.image(0, -150, 'app_icon_small').setDisplaySize(150, 150));
    p.box.add(this.add.text(0, 40, msg, { ...TXT.body, fontSize: '38px', lineSpacing: 12 }).setOrigin(0.5));
    p.box.add(button(this, 0, 220, t('ok'), () => p.close(), { width: 360, height: 130, size: 46 }));
  }

  go() {
    this.cameras.main.fadeOut(250, 189, 235, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }
}
