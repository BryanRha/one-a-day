// 로딩: manifest 의 그림·이펙트·효과음 + 도로 텍스처(구역별)를 코드로 생성
import { W, H } from '../config.js?v=0.20.0';
import { SFX } from '../audio.js?v=0.20.0';
import { makeTextures } from '../fx.js?v=0.20.0';
import { ROAD_X } from '../core/race.js?v=0.20.0';

// 구역: 아스팔트 색 · 갓길 색 · 연석 무늬 두 색
export const ZONES = [
  // ground: 길가 바닥 · side: 길가 장식 그림
  { name: '햇살 시내', road: [62, 66, 82], edge: 0xE8E2D6, curb: [0xE84A5F, 0xFFFFFF], ground: 'tiles', base: '#C9CED8', side: ['side_tree', 'side_lamp', 'side_tree', 'side_planter', 'side_hydrant', 'side_lamp'] },
  { name: '바닷가 도로', road: [58, 70, 90], edge: 0xF4D9A0, curb: [0x3FA9F5, 0xFFFFFF], ground: 'sand', base: '#F2D8A0', side: ['side_palm', 'side_umbrella', 'side_palm', 'side_shells', 'side_sandcastle'] },
  { name: '숲속 길', road: [60, 64, 70], edge: 0x6FBF5A, curb: [0xFFC93C, 0x3A2A1A], ground: 'grass', base: '#5DAF4E', side: ['side_pine', 'side_tree', 'side_pine', 'side_mushroom', 'side_pine'] },
  { name: '노을 사막', road: [86, 70, 66], edge: 0xF2A65A, curb: [0xFF6B3D, 0xFFE7C2], ground: 'sand', base: '#E9B37A', side: ['side_cactus', 'side_rock', 'side_cactus', 'side_rock'] },
];

function makeRoad(scene, i) {
  const z = ZONES[i], T = 640, key = `road_${i}`;
  if (scene.textures.exists(key)) return;
  const c = scene.textures.createCanvas(key, W, T), g = c.getContext();
  const [r, gg, b] = z.road, X0 = ROAD_X, X1 = W - ROAD_X, LW = (X1 - X0) / 5;
  // 길가 바닥
  g.fillStyle = z.base; g.fillRect(0, 0, W, T);
  if (z.ground === 'tiles') { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; for (let y = 0; y < T; y += 64) for (const x0 of [0, X1]) { g.strokeRect(x0 + 2, y + 2, 38, 60); g.strokeRect(x0 + 42, y + 2, 38, 60); } }
  else { for (let k = 0; k < 220; k++) { const x = Math.random() < 0.5 ? Math.random() * X0 : X1 + Math.random() * X0, y = Math.random() * T; g.fillStyle = z.ground === 'grass' ? `rgba(30,90,30,${0.15 + Math.random() * 0.2})` : `rgba(160,110,60,${0.12 + Math.random() * 0.15})`; g.beginPath(); g.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2); g.fill(); } }
  // 도로
  g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(X0, 0, X1 - X0, T);
  // 아스팔트 결 (점 노이즈)
  const img = g.getImageData(0, 0, W, T), d = img.data;
  for (let k = 0; k < d.length; k += 4) { const x = (k / 4) % W; if (x < X0 || x >= X1) continue; const n = (Math.random() - 0.5) * 18; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
  g.putImageData(img, 0, 0);
  // 바퀴 자국 (차로마다 두 줄, 살짝 어둡게)
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let l = 0; l < 5; l++) { const cx = X0 + LW * (l + 0.5); g.fillRect(cx - 42, 0, 20, T); g.fillRect(cx + 22, 0, 20, T); }
  // 갓길 + 연석
  const hex = v => '#' + v.toString(16).padStart(6, '0');
  g.fillStyle = hex(z.edge); g.fillRect(X0 - 6, 0, 6, T); g.fillRect(X1, 0, 6, T);
  for (let y = 0; y < T; y += 80) { g.fillStyle = hex(z.curb[(y / 80) % 2]); g.fillRect(X0, y, 16, 80); g.fillRect(X1 - 16, y, 16, 80); }
  // 차선 점선 (주기 160 → 640 에 딱 맞음)
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let l = 1; l < 5; l++) for (let y = 0; y < T; y += 160) g.fillRect(X0 + LW * l - 6, y, 12, 90);
  // 가장자리 실선
  g.fillStyle = 'rgba(255,214,90,0.9)'; g.fillRect(X0 + 22, 0, 8, T); g.fillRect(X1 - 30, 0, 8, T);
  c.refresh();
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 300, H / 2 + 120, 4, 26, 0xFFC93C).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 120, 608, 34).setStrokeStyle(4, 0xFFFFFF);
    this.add.text(W / 2, H / 2, '스트레스 차차차', { fontFamily: 'Jua', fontSize: '96px', color: '#FFE14D', stroke: '#1E2A52', strokeThickness: 14 }).setOrigin(0.5);
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
    ZONES.forEach((z, i) => makeRoad(this, i));
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: n === 'sheet_dash' ? -1 : 0 });
    this.scene.start(new URLSearchParams(location.search).has('play') ? 'Play' : 'Lobby');
  }
}
