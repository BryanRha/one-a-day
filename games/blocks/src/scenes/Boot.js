// 로딩: manifest 의 그림·이펙트·효과음 + 블록 텍스처(7색)를 코드로 생성
import { W, H, TITLE } from '../config.js';
import { SFX } from '../audio.js';
import { makeTextures } from '../fx.js';

// 블록 색: [기본, 밝은 면, 어두운 면]
export const PALETTE = [
  ['#FF5C6C', '#FFA3AC', '#C42C45'],
  ['#FF9A3C', '#FFC889', '#D2620E'],
  ['#FFD43B', '#FFEC94', '#D19A00'],
  ['#4CD964', '#9EF2AE', '#26963F'],
  ['#3EC9F5', '#A2E9FF', '#1A88BA'],
  ['#5B7CFF', '#AFC0FF', '#3049C4'],
  ['#B26BFF', '#DDBDFF', '#7838CC'],
];
export const TINT = PALETTE.map(p => parseInt(p[0].slice(1), 16));

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// 말랑한 보석 블록: 둥근 네모 + 위 밝음/아래 어둠 + 안쪽 테두리 + 광택
function drawBlock(g, S, [base, light, dark]) {
  const p = S * 0.03, s = S - p * 2, r = S * 0.17;
  g.save();
  rr(g, p, p, s, s, r); g.fillStyle = dark; g.fill();                       // 바닥 그림자 테두리
  const gr = g.createLinearGradient(0, p, 0, p + s * 0.92);
  gr.addColorStop(0, light); gr.addColorStop(0.45, base); gr.addColorStop(1, base);
  rr(g, p, p, s, s * 0.92, r); g.fillStyle = gr; g.fill();                 // 윗면
  rr(g, p + s * 0.12, p + s * 0.1, s * 0.76, s * 0.66, r * 0.7);           // 가운데 살짝 볼록
  const gi = g.createLinearGradient(0, p + s * 0.1, 0, p + s * 0.76); gi.addColorStop(0, 'rgba(255,255,255,0.28)'); gi.addColorStop(1, 'rgba(255,255,255,0.02)');
  g.fillStyle = gi; g.fill();
  rr(g, p + s * 0.14, p + s * 0.08, s * 0.5, s * 0.14, s * 0.07); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();   // 광택 띠
  g.beginPath(); g.arc(p + s * 0.8, p + s * 0.18, s * 0.05, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
  rr(g, p + 1.5, p + 1.5, s - 3, s - 3, r); g.lineWidth = S * 0.025; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.stroke();
  g.restore();
}

export function makeBlockTextures(scene) {
  const T = scene.textures, S = 128;
  PALETTE.forEach((p, i) => {
    const k = `blk_${i}`; if (T.exists(k)) return;
    const c = T.createCanvas(k, S, S); drawBlock(c.getContext(), S, p); c.refresh();
  });
  // 빈 칸: 살짝 들어간 어두운 홈
  if (!T.exists('cell')) {
    const c = T.createCanvas('cell', S, S), g = c.getContext();
    rr(g, 5, 5, S - 10, S - 10, S * 0.14); g.fillStyle = 'rgba(14,10,46,0.55)'; g.fill();
    rr(g, 5, 5, S - 10, S - 10, S * 0.14); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.06)'; g.stroke();
    c.refresh();
  }
  // 놓일 자리 미리보기(흰 테두리)
  if (!T.exists('ghost')) {
    const c = T.createCanvas('ghost', S, S), g = c.getContext();
    rr(g, 6, 6, S - 12, S - 12, S * 0.15); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
    c.refresh();
  }
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 300, H / 2 + 120, 4, 26, 0xFFD43B).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 120, 608, 34).setStrokeStyle(4, 0xFFFFFF);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Jua', fontSize: '110px', color: '#FFFFFF', stroke: '#2B1E5A', strokeThickness: 14 }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 600 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [key, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(key, `assets/img/${key}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    });
  }
  create() {
    makeTextures(this);
    makeBlockTextures(this);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: 0 });
    this.scene.start(new URLSearchParams(location.search).has('play') ? 'Play' : 'Lobby');
  }
}
