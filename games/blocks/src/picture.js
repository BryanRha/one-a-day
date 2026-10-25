// 어드벤처 그림: 사진을 48×32 픽셀 그림으로 줄이고, 12×8 = 96칸을 레벨을 깰 때마다 한 칸씩 드러냄
import { rng } from './core/board.js?v=0.55.0';
export const PX_W = 12, PX_H = 8;

export function pixelTexture(scene, key) {
  const pk = `${key}_px`;
  if (scene.textures.exists(pk)) return pk;
  const src = scene.textures.get(key).getSourceImage();
  const c = scene.textures.createCanvas(pk, 48, 32), g = c.getContext();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, 48, 32);
  c.refresh();
  scene.textures.get(pk).setFilter(Phaser.Textures.FilterMode.NEAREST);
  return pk;
}
// 드러나는 순서 (시즌마다 다르게, 모두에게 같게)
export function revealOrder(season) {
  const R = rng(season * 31 + 7), a = [...Array(PX_W * PX_H).keys()];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 그림 + 아직 안 열린 칸 가림막 → 컨테이너 (cover[i] 로 칸별 가림막 접근)
export function pictureView(scene, x, y, w, key, season, cleared) {
  const h = w * PX_H / PX_W, cw = w / PX_W, c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, pixelTexture(scene, key)).setDisplaySize(w, h);
  c.add(img);
  const order = revealOrder(season), shown = new Set(order.slice(0, cleared));
  c.cover = [];
  for (let i = 0; i < PX_W * PX_H; i++) {
    const cx = -w / 2 + (i % PX_W + 0.5) * cw, cy = -h / 2 + (Math.floor(i / PX_W) + 0.5) * cw;
    const r = scene.add.rectangle(cx, cy, cw + 0.5, cw + 0.5, (i + Math.floor(i / PX_W)) % 2 ? 0x1A2150 : 0x161C46);
    r.setVisible(!shown.has(i)); c.add(r); c.cover[i] = r;
  }
  const gl = scene.add.graphics(); gl.lineStyle(1, 0x0B1026, 0.5);
  for (let i = 1; i < PX_W; i++) gl.lineBetween(-w / 2 + i * cw, -h / 2, -w / 2 + i * cw, h / 2);
  for (let j = 1; j < PX_H; j++) gl.lineBetween(-w / 2, -h / 2 + j * cw, w / 2, -h / 2 + j * cw);
  c.add(gl);
  const fr = scene.add.graphics(); fr.lineStyle(3, 0xFFFFFF, 0.18).strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 14); c.add(fr);
  c.order = order; c.w = w; c.h = h;
  return c;
}
