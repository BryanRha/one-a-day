// 손님 도착: 손님 얼굴 · 이름표 · 한 글자씩 나오는 이야기 → 빛바랜 사진을 건넴 → 게임 시작
import { W, H } from '../config.js?v=0.20.0';
import { T, C, btn, panel } from '../ui.js?v=0.20.0';
import { audio } from '../audio.js?v=0.20.0';
import * as M from '../meta.js?v=0.20.0';

export class GuestScene extends Phaser.Scene {
  constructor() { super('Guest'); }
  create(data) {
    this.going = false; this.typing = null;   // 같은 화면 객체를 다시 쓰므로 매번 초기화
    const sc = this.scn = M.sceneById(data.id), first = !M.record(sc.id);
    const bg = this.add.image(W / 2, H / 2, 'studio'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0x9A8A78);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1A0E06, 0.25);
    // 빛바랜 사진 (카운터 위)
    const pw = sc.kind === 'ho' ? 470 : 700, ph = pw * sc.h / sc.w, photo = this.add.container(W / 2 + (sc.kind === 'ho' ? 150 : 60), H * 0.30);
    photo.add([this.add.rectangle(12, 16, pw + 40, ph + 70, 0x000000, 0.35), this.add.rectangle(0, 14, pw + 40, ph + 70, 0xFFFDF6)]);
    const im = this.add.image(0, 0, sc.img); im.setScale(Math.min(pw / im.width, ph / im.height)); im.setTint(0xE8D2A8); photo.add(im);
    photo.add(this.add.rectangle(0, 0, pw, ph, 0xC8A878, 0.25));
    photo.add(T(this, 0, ph / 2 + 32, `${sc.year}년 · ${sc.title}`, 24, '#7A6450', { w: 800 }));
    photo.setAngle(5).setScale(0.6).setAlpha(0); this.tweens.add({ targets: photo, angle: 3, scale: 1, alpha: 1, duration: 550, ease: 'Back.easeOut', delay: 250 });
    // 손님 얼굴
    const face = this.add.image(-200, H - 470 + 30, `g_${sc.id}`).setOrigin(0.5, 1); face.setScale(560 / face.height);
    this.tweens.add({ targets: face, x: 250, duration: 500, ease: 'Cubic.easeOut' });
    audio.play('sfx_page', { volume: 0.6 });
    // 말풍선 + 이름표
    const by = H - 470, bw = 980, bh = 420; this.add.existing(panel(this, W / 2, by + bh / 2 - 60, bw, bh));
    const tag = this.add.graphics(); tag.fillStyle(0x5A3E2B, 1).fillRoundedRect(70, by - 100, 40 + sc.guest.length * 40, 76, 38);
    T(this, 90, by - 62, sc.guest, 38, C.cream, { ox: 0, w: 900 });
    T(this, bw / 2 + W / 2 - 90, by + 6, sc.who, 24, C.dim, { ox: 1, w: 700 });
    this.line = T(this, 90, by + 50, '', 36, C.ink, { ox: 0, oy: 0, w: 700, wrap: 900, lh: 16, align: 'left' });
    this.more = T(this, W - 90, by + bh - 130, '▼', 28, C.dim, { w: 900 }); this.tweens.add({ targets: this.more, y: this.more.y + 8, duration: 500, yoyo: true, repeat: -1 });
    this.i = 0; this.lines = sc.hello;
    this.goB = btn(this, W / 2, H - 130, 620, 136, sc.kind === 'ho' ? '사진 속 물건 찾기' : '다른 곳 찾아 고치기', () => this.start(), { style: 'gold', size: 40 }).setAlpha(0);
    this.input.on('pointerup', p => { if (p.y < H - 220) this.next(); });
    if (!first) { this.i = this.lines.length - 1; this.line.setText(this.lines.join('\n')); this.done(); }
    else this.time.delayedCall(450, () => this.type());
    this.cameras.main.fadeIn(300, 20, 12, 6);
  }
  // 한 글자씩
  type() {
    const full = this.lines.slice(0, this.i + 1).join('\n'), from = this.i ? this.lines.slice(0, this.i).join('\n') + '\n' : '';
    let n = from.length; this.typing?.remove();
    this.typing = this.time.addEvent({ delay: 34, repeat: full.length - n - 1, callback: () => { n++; this.line.setText(full.slice(0, n)); if (n >= full.length) { this.typing = null; if (this.i === this.lines.length - 1) this.done(); } } });
  }
  done() { this.more.setVisible(false); this.tweens.add({ targets: this.goB, alpha: 1, duration: 300 }); }
  next() {
    if (this.typing) { this.typing.remove(); this.typing = null; this.line.setText(this.lines.slice(0, this.i + 1).join('\n')); if (this.i === this.lines.length - 1) this.done(); return; }
    if (this.i < this.lines.length - 1) { this.i++; audio.play('sfx_click', { volume: 0.25 }); this.type(); } else this.start();
  }
  start() { if (this.going) return; this.going = true; this.cameras.main.fadeOut(220, 20, 12, 6); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.scn.kind === 'ho' ? 'Hidden' : 'Diff', { id: this.scn.id })); }
}
