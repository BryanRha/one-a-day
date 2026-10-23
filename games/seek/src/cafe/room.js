// 냥카페 그림: 불러오기 · 방에 가구/고양이 배치 (화면용 이미지 묶음 · 숨은 고양이용 한 장짜리 캔버스)
import { SLOTS, CATS, POSES, ROOM } from './data.js?v=0.28.0';
import { cafeData } from './state.js?v=0.28.0';
import { coordData } from '../coord/state.js?v=0.28.0';

export function cafeKeys() {
  const k = [ROOM.key];
  for (const s of SLOTS) for (let t = 1; t <= 3; t++) k.push(`f_${s.id}_${t}`);
  for (const c of CATS) for (const p of POSES) k.push(`n${c.id}_${p}`);
  const w = coordData().coord.wear; for (const id of [w.o, w.hair, w.bag, w.prop]) if (id) k.push(id);   // 오늘 코디를 입은 서윤
  return k;
}
export function loadCafe(scene, done) {
  const need = cafeKeys().filter(k => !scene.textures.exists(k)); if (!need.length) return done();
  for (const k of need) scene.load.image(k, /^(o\d|hair_|bag_|prop_)/.test(k) ? `assets/coord/${k}.webp` : `assets/cafe/${k === ROOM.key ? 'room' : k}.webp`);
  scene.load.once('complete', () => done()); scene.load.start();
}
// 놓인 가구 → 그릴 목록 { key, x, y, w, anchor, z, shadow, slot }
export function furnitureList(placed = cafeData().cafe.placed) {
  return SLOTS.filter(s => placed[s.id]).map(s => ({ key: `f_${s.id}_${placed[s.id]}`, x: s.x, y: s.y, w: s.w, anchor: s.hang || s.wall ? 'center' : 'bottom', z: s.d, shadow: !(s.hang || s.wall || s.flat), slot: s.id }));
}
export const catItem = (c, sp, pose = sp.pose) => ({ key: `n${c.id}_${pose}`, x: sp.x, y: sp.y, w: sp.w, anchor: 'bottom', z: sp.z, shadow: true, cat: c });

// 화면에 그리기: 방 그림 + 목록 (s = 배율, ox/oy = 방 왼쪽 위 화면 좌표). 반환: { root, objs }
export function drawRoom(scene, list, s, ox, oy) {
  const root = scene.add.container(ox, oy).setScale(s), objs = [];
  root.add(scene.add.image(0, 0, ROOM.key).setOrigin(0));
  for (const it of [...list].sort((a, b) => a.z - b.z)) {
    const tex = scene.textures.get(it.key).getSourceImage(), h = it.w * tex.height / tex.width;
    if (it.shadow) root.add(scene.add.ellipse(it.x, it.y - 4, it.w * 0.84, it.w * 0.14, 0x3A2010, 0.2));
    const im = scene.add.image(it.x, it.anchor === 'bottom' ? it.y : it.y, it.key).setOrigin(0.5, it.anchor === 'bottom' ? 1 : 0.5).setDisplaySize(it.w, h);
    root.add(im); objs.push({ it, im, h });
  }
  return { root, objs };
}
// 한 장짜리 캔버스 텍스처로 합성 (숨은 고양이 맵)
export function composeTexture(scene, key, list) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const c = scene.textures.createCanvas(key, ROOM.w, ROOM.h), g = c.getContext();
  g.drawImage(scene.textures.get(ROOM.key).getSourceImage(), 0, 0);
  for (const it of [...list].sort((a, b) => a.z - b.z)) {
    const src = scene.textures.get(it.key).getSourceImage(), h = it.w * src.height / src.width, top = it.anchor === 'bottom' ? it.y - h : it.y - h / 2;
    if (it.shadow) { g.save(); g.globalAlpha = 0.2; g.fillStyle = '#3A2010'; g.beginPath(); g.ellipse(it.x, it.y - 4, it.w * 0.42, it.w * 0.07, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.drawImage(src, it.x - it.w / 2, top, it.w, h);
  }
  c.refresh(); return key;
}
