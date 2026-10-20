// 로딩 + 코드로 그리는 주사위 판 텍스처 (룬마다 어두운 유리 주사위 + 원소색 빛 테두리)
import { W, H, TITLE } from '../config.js?v=0.9.0';
import { SFX } from '../audio.js?v=0.9.0';
import { makeTextures } from '../fx.js?v=0.9.0';
import { makeIcons } from '../pui.js?v=0.9.0';
import { RUNES } from '../core/sim.js?v=0.9.0';

const hex = n => '#' + n.toString(16).padStart(6, '0');
function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export function makeDiceTextures(scene) {
  const T = scene.textures, S = 160;
  for (const [id, R] of Object.entries(RUNES)) {
    const k = `die_${id}`; if (T.exists(k)) continue;
    const c = T.createCanvas(k, S, S), g = c.getContext(), col = hex(R.color);
    // 바깥 빛
    g.shadowColor = col; g.shadowBlur = 18;
    rr(g, 10, 10, S - 20, S - 20, 30); g.fillStyle = '#0D1230'; g.fill();
    g.shadowBlur = 0;
    // 유리 몸통
    const gr = g.createLinearGradient(0, 10, 0, S - 10); gr.addColorStop(0, '#2A3366'); gr.addColorStop(0.5, '#151B44'); gr.addColorStop(1, '#0B0F2A');
    rr(g, 12, 12, S - 24, S - 24, 28); g.fillStyle = gr; g.fill();
    // 원소색 안쪽 빛
    const ig = g.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.55); ig.addColorStop(0, col + '55'); ig.addColorStop(1, col + '00');
    rr(g, 12, 12, S - 24, S - 24, 28); g.fillStyle = ig; g.fill();
    // 테두리
    rr(g, 12, 12, S - 24, S - 24, 28); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
    rr(g, 18, 18, S - 36, S - 36, 22); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.stroke();
    // 위쪽 광택
    rr(g, 24, 20, S - 48, 22, 11); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    c.refresh();
  }
  // 빈 칸
  if (!T.exists('slot')) { const c = T.createCanvas('slot', S, S), g = c.getContext(); rr(g, 12, 12, S - 24, S - 24, 28); g.fillStyle = 'rgba(10,14,40,0.55)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(160,180,255,0.14)'; g.setLineDash([10, 8]); g.stroke(); c.refresh(); }
  if (!T.exists('pip')) { const c = T.createCanvas('pip', 32, 32), g = c.getContext(); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); c.refresh(); }
  if (!T.exists('ring')) { const c = T.createCanvas('ring', 128, 128), g = c.getContext(); g.lineWidth = 10; g.strokeStyle = '#FFFFFF'; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.globalAlpha = 0.5; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); c.refresh(); }
  if (!T.exists('bolt')) { const c = T.createCanvas('bolt', 48, 48), g = c.getContext(); const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); c.refresh(); }
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 6, 0xB59BFF).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 6, 0xFFFFFF, 0.12);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#F4F6FF' }).setOrigin(0.5).setLetterSpacing(4);
    this.load.on('progress', v => { bar.width = 480 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [key, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(key, `assets/img/${key}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    });
  }
  create() {
    makeTextures(this); makeIcons(this); makeDiceTextures(this);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: 0 });
    const q = new URLSearchParams(location.search);
    this.scene.start(q.has('play') ? 'Play' : 'Home');
  }
}
