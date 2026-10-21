// 손님 도착: 사진을 건네며 짧은 이야기 (탭하면 다음 줄) → 게임 시작
import { W, H } from '../config.js?v=0.19.1';
import { T, C, btn, panel } from '../ui.js?v=0.19.1';
import { audio } from '../audio.js?v=0.19.1';
import * as M from '../meta.js?v=0.19.1';

export class GuestScene extends Phaser.Scene {
  constructor() { super('Guest'); }
  create(data) {
    this.going = false;   // 같은 화면 객체를 다시 쓰므로 매번 초기화
    const sc = this.scn = M.sceneById(data.id), first = !M.record(sc.id);
    const bg = this.add.image(W / 2, H / 2, 'studio'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0x8A7A6A);
    // 사진이 카운터 위에 놓임
    const pw = sc.kind === 'ho' ? 560 : 820, ph = pw * sc.h / sc.w, photo = this.add.container(W / 2, H * 0.36);
    photo.add([this.add.rectangle(10, 14, pw + 40, ph + 40, 0x000000, 0.35), this.add.rectangle(0, 0, pw + 40, ph + 40, 0xFFFDF6)]);
    const im = this.add.image(0, 0, sc.img); im.setScale(Math.min(pw / im.width, ph / im.height)); photo.add(im);
    photo.add(T(this, pw / 2 - 10, ph / 2 + 4, `${sc.year}`, 22, '#8A7966', { ox: 1, w: 700 }));
    photo.setAngle(-4).setScale(0.6).setAlpha(0); this.tweens.add({ targets: photo, angle: -2, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });
    audio.play('sfx_page', { volume: 0.7 });
    // 말풍선
    const by = H - 420; this.add.existing(panel(this, W / 2, by, 960, 380));
    T(this, 100, by - 135, sc.guest, 38, C.brown, { ox: 0, w: 900 }); T(this, 100 + 20 + sc.guest.length * 38, by - 132, sc.who, 22, C.dim, { ox: 0, w: 700 });
    this.line = T(this, 100, by - 70, '', 34, C.ink, { ox: 0, oy: 0, w: 700, wrap: 860, lh: 12 });
    this.i = 0; this.lines = sc.hello; this.show();
    this.goB = btn(this, W / 2, H - 140, 560, 130, sc.kind === 'ho' ? '물건 찾기 시작' : '다른 곳 찾기 시작', () => this.start(), { style: 'gold', size: 40 }).setAlpha(first ? 0 : 1);
    this.input.on('pointerup', p => { if (p.y < H - 220) this.next(); });
    if (!first) { this.i = this.lines.length - 1; this.show(); }
    this.cameras.main.fadeIn(300, 20, 12, 6);
  }
  show() { this.line.setText(this.lines.slice(0, this.i + 1).join('\n')); }
  next() { if (this.i < this.lines.length - 1) { this.i++; this.show(); audio.play('sfx_click', { volume: 0.3 }); if (this.i === this.lines.length - 1) this.tweens.add({ targets: this.goB, alpha: 1, duration: 300 }); } else this.start(); }
  start() { if (this.going) return; this.going = true; this.cameras.main.fadeOut(220, 20, 12, 6); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.scn.kind === 'ho' ? 'Hidden' : 'Diff', { id: this.scn.id })); }
}
