// 로딩 + 코드로 그리는 그림들: 블록 스킨 5종 × 7색 · 보석 3종 · 배경 테마 · 아이콘
import { W, H, TITLE } from '../config.js?v=0.8.5';
import { SFX } from '../audio.js?v=0.8.5';
import { makeTextures } from '../fx.js?v=0.8.5';
import { makeIcons } from '../pui.js?v=0.8.5';
import { load } from '../save.js?v=0.8.5';

// 블록 색: [기본, 밝은 면, 어두운 면]
export const PALETTE = [
  ['#FF4D6A', '#FF9DAE', '#B8203F'],
  ['#FF9433', '#FFC685', '#C45E0A'],
  ['#FFCF2E', '#FFEA90', '#C99300'],
  ['#3FD37A', '#9AF2BE', '#1E8E4E'],
  ['#2FC4F0', '#9DE9FF', '#127FB0'],
  ['#4F72FF', '#A9BBFF', '#2840C0'],
  ['#A85CFF', '#D9B8FF', '#6E2BC8'],
];
export const TINT = PALETTE.map(p => parseInt(p[0].slice(1), 16));

// 배경 테마: 판을 다 비울 때마다 바뀜 (원작처럼)
export const THEMES = [
  { name: '미드나이트', top: '#0B1026', bot: '#18215A', glow: 'rgba(80,110,255,0.35)', board: 0x0E1535, cell: '#1B2350' },
  { name: '딥 퍼플', top: '#140A26', bot: '#3A1D6B', glow: 'rgba(180,90,255,0.32)', board: 0x170D33, cell: '#2A1B4F' },
  { name: '오션', top: '#05182A', bot: '#0D4566', glow: 'rgba(40,200,255,0.30)', board: 0x08203A, cell: '#143457' },
  { name: '에메랄드', top: '#04160F', bot: '#0D4535', glow: 'rgba(60,230,150,0.26)', board: 0x061F18, cell: '#123A2E' },
  { name: '선셋', top: '#1A0A16', bot: '#5A1E3A', glow: 'rgba(255,120,120,0.30)', board: 0x210B1C, cell: '#3A1530' },
];

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// 스킨별 블록 그리기
function drawBlock(g, S, [base, light, dark], skin) {
  const p = S * 0.035, s = S - p * 2, r = S * 0.14;
  g.save();
  if (skin === 'neon') {
    rr(g, p + 4, p + 4, s - 8, s - 8, r); g.fillStyle = 'rgba(8,10,30,0.92)'; g.fill();
    g.shadowColor = base; g.shadowBlur = S * 0.16; g.lineWidth = S * 0.075; g.strokeStyle = base; rr(g, p + 8, p + 8, s - 16, s - 16, r * 0.8); g.stroke();
    g.shadowBlur = 0; g.lineWidth = S * 0.025; g.strokeStyle = light; rr(g, p + 8, p + 8, s - 16, s - 16, r * 0.8); g.stroke();
    rr(g, p + s * 0.3, p + s * 0.3, s * 0.4, s * 0.4, r * 0.5); g.fillStyle = base; g.globalAlpha = 0.35; g.fill();
    g.restore(); return;
  }
  if (skin === 'glass') {
    rr(g, p, p, s, s, r); const gr = g.createLinearGradient(0, p, S, p + s); gr.addColorStop(0, light); gr.addColorStop(1, base); g.globalAlpha = 0.78; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
    rr(g, p, p, s, s, r); g.lineWidth = S * 0.045; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
    g.beginPath(); g.moveTo(p + s * 0.12, p + s * 0.62); g.lineTo(p + s * 0.62, p + s * 0.12); g.lineTo(p + s * 0.82, p + s * 0.12); g.lineTo(p + s * 0.12, p + s * 0.82); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.42)'; g.fill();
    g.restore(); return;
  }
  if (skin === 'matte') {
    rr(g, p, p, s, s, r); g.fillStyle = dark; g.fill();
    rr(g, p, p, s, s * 0.94, r); g.fillStyle = base; g.fill();
    rr(g, p + s * 0.08, p + s * 0.08, s * 0.84, s * 0.76, r * 0.7); const gi = g.createLinearGradient(0, p, 0, p + s); gi.addColorStop(0, 'rgba(255,255,255,0.16)'); gi.addColorStop(1, 'rgba(0,0,0,0.08)'); g.fillStyle = gi; g.fill();
    g.restore(); return;
  }
  if (skin === 'gold') { base = '#E8B54A'; light = '#FFF0B8'; dark = '#8A5F12'; }
  // 주얼(기본): 깎은 보석 — 가장자리 4면 경사 + 가운데 볼록 + 광택
  rr(g, p, p, s, s, r); g.fillStyle = dark; g.fill();
  const i = s * 0.16;
  g.beginPath(); g.moveTo(p, p); g.lineTo(p + s, p); g.lineTo(p + s - i, p + i); g.lineTo(p + i, p + i); g.closePath(); g.fillStyle = light; g.fill();        // 위 경사
  g.beginPath(); g.moveTo(p, p); g.lineTo(p + i, p + i); g.lineTo(p + i, p + s - i); g.lineTo(p, p + s); g.closePath(); g.fillStyle = light; g.globalAlpha = 0.75; g.fill(); g.globalAlpha = 1; // 왼 경사
  g.beginPath(); g.moveTo(p + s, p); g.lineTo(p + s, p + s); g.lineTo(p + s - i, p + s - i); g.lineTo(p + s - i, p + i); g.closePath(); g.fillStyle = base; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; // 오른 경사
  const gr = g.createLinearGradient(0, p + i, 0, p + s - i); gr.addColorStop(0, light); gr.addColorStop(0.35, base); gr.addColorStop(1, base);
  g.fillStyle = gr; g.fillRect(p + i, p + i, s - i * 2, s - i * 2);   // 윗면
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(p + i + s * 0.06, p + i + s * 0.06, s * 0.22, s * 0.06);
  g.save(); rr(g, p, p, s, s, r); g.clip(); g.restore();
  if (skin === 'gold') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(p + s * 0.2, p + s); g.lineTo(p + s * 0.55, p); g.lineTo(p + s * 0.7, p); g.lineTo(p + s * 0.35, p + s); g.closePath(); g.fill(); }
  g.restore();
}

// 보석: 사파이어(마름모) · 루비(원) · 에메랄드(팔각)
function drawGem(g, S, k) {
  const cols = [['#7FE8FF', '#1FA6E0', '#0B5A9A'], ['#FF9EC0', '#F0306A', '#8A0E35'], ['#9CFFC4', '#22C46E', '#0B6B39']][k];
  g.save(); g.translate(S / 2, S / 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = S * 0.08; g.shadowOffsetY = S * 0.04;
  const R = S * 0.36;
  g.beginPath();
  if (k === 0) { g.moveTo(0, -R); g.lineTo(R * 0.85, 0); g.lineTo(0, R); g.lineTo(-R * 0.85, 0); }
  else if (k === 1) g.arc(0, 0, R * 0.92, 0, Math.PI * 2);
  else for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); }
  g.closePath();
  const gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = S * 0.04; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
  // 면 반사
  g.beginPath(); g.moveTo(-R * 0.45, -R * 0.15); g.lineTo(0, -R * 0.6); g.lineTo(R * 0.15, -R * 0.35); g.lineTo(-R * 0.25, R * 0.05); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
  g.beginPath(); g.arc(R * 0.32, R * 0.3, S * 0.035, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function makeBlockTextures(scene, skin) {
  const T = scene.textures, S = 128;
  PALETTE.forEach((p, i) => {
    const k = `blk_${i}`;
    if (T.exists(k)) T.remove(k);
    const c = T.createCanvas(k, S, S); drawBlock(c.getContext(), S, p, skin); c.refresh();
  });
}
// 스킨 미리보기용 (컬렉션 화면)
export function makeSkinPreview(scene, skin) {
  const T = scene.textures, k = `skin_${skin}`, S = 128;
  if (T.exists(k)) return k;
  const c = T.createCanvas(k, S * 2, S * 2), g = c.getContext();
  [[0, 0, 0], [1, 0, 2], [0, 1, 4], [1, 1, 6]].forEach(([x, y, col]) => { g.save(); g.translate(x * S, y * S); drawBlock(g, S, PALETTE[col], skin); g.restore(); });
  c.refresh(); return k;
}

export function makeThemeTextures(scene) {
  const T = scene.textures;
  THEMES.forEach((th, i) => {
    const k = `bg_t${i}`; if (T.exists(k)) return;
    const w = 540, h = 1300, c = T.createCanvas(k, w, h), g = c.getContext();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.top); gr.addColorStop(1, th.bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.9); rg.addColorStop(0, th.glow); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    // 아주 옅은 대각선 결
    g.strokeStyle = 'rgba(255,255,255,0.025)'; g.lineWidth = 1;
    for (let x = -h; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); }
    // 별가루
    for (let n = 0; n < 70; n++) { g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.25})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.6 + 0.3, 0, Math.PI * 2); g.fill(); }
    c.refresh();
    // 빈 칸
    const ck = `cell_t${i}`, S = 128, cc = T.createCanvas(ck, S, S), cg = cc.getContext();
    rr(cg, 6, 6, S - 12, S - 12, S * 0.12); cg.fillStyle = th.cell; cg.fill();
    rr(cg, 6, 6, S - 12, S - 12, S * 0.12); cg.lineWidth = 2; cg.strokeStyle = 'rgba(255,255,255,0.05)'; cg.stroke();
    const ig = cg.createLinearGradient(0, 6, 0, 30); ig.addColorStop(0, 'rgba(0,0,0,0.28)'); ig.addColorStop(1, 'rgba(0,0,0,0)'); rr(cg, 6, 6, S - 12, 30, S * 0.12); cg.fillStyle = ig; cg.fill();
    cc.refresh();
  });
  for (let k = 0; k < 3; k++) { const key = `gem_${k}`; if (T.exists(key)) continue; const c = T.createCanvas(key, 96, 96); drawGem(c.getContext(), 96, k); c.refresh(); }
  if (!T.exists('ghost')) { const c = T.createCanvas('ghost', 128, 128), g = c.getContext(); rr(g, 7, 7, 114, 114, 18); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke(); c.refresh(); }
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 6, 0xF5C451).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 6, 0xFFFFFF, 0.12);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#F4F6FF' }).setOrigin(0.5).setLetterSpacing(2);
    this.load.on('progress', v => { bar.width = 480 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [key, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(key, `assets/img/${key}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    });
  }
  create() {
    makeTextures(this);
    makeIcons(this);
    makeThemeTextures(this);
    makeBlockTextures(this, load().skin);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: 0 });
    const q = new URLSearchParams(location.search);
    this.scene.start(q.has('play') ? 'Play' : q.has('adv') ? 'Adventure' : 'Home');
  }
}
