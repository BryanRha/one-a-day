// 코디 합성 규칙 (화면 · 미리보기 공용): 한 벌 그림 + 머리 장식 · 가방 · 손 소품을 머리/손 위치에 맞춰 얹음
import { ANCHORS } from './anchors.js?v=0.40.0';
// 소품 종류별 놓는 자리 (머리 폭 hw 기준 크기) — 반환: 그림 픽셀 좌표 { x, y, w, ox, oy, rot }
export function placeAcc(oid, kind, iw, ih) {
  const a = ANCHORS[oid];
  if (kind === 'hair') { const w = a.h * 0.062; return { x: a.hx + a.h * 0.04, y: a.top + a.h * 0.04, w, ox: 0.5, oy: 0.5, rot: 18, front: true }; }
  if (kind === 'bag') { const w = a.h * 0.115; return { x: a.handX - a.h * 0.012, y: a.handY - a.h * 0.02, w, ox: 0.5, oy: 0.08, rot: 0, front: true }; }
  // 손 소품: 손에 쥔 듯 (손 위치가 물건 아래쪽 1/3)
  const w = a.h * (kind === 'prop_umbrella' ? 0.05 : 0.1); return { x: a.handX - a.h * 0.01, y: a.handY + a.h * 0.012, w, ox: 0.5, oy: kind === 'prop_umbrella' ? 0.35 : 0.62, rot: kind === 'prop_umbrella' ? -8 : 0, front: true };
}
// Phaser 컨테이너로 코디 만들기: 키 h 에 맞춤, (0,0) = 발밑 가운데
export function buildLook(sc, oid, acc = {}, h = 1000) {
  const c = sc.add.container(0, 0), body = sc.add.image(0, 0, oid).setOrigin(0.5, 1), a = ANCHORS[oid], k = h / a.h; body.setScale(k); c.add(body);
  for (const slot of ['hair', 'bag', 'prop']) {
    const id = acc[slot]; if (!id) continue; const kind = slot === 'prop' ? id : slot, src = sc.textures.get(id).getSourceImage(), pl = placeAcc(oid, kind, src.width, src.height);
    const im = sc.add.image((pl.x - a.w / 2) * k, (pl.y - a.h) * k, id).setOrigin(pl.ox, pl.oy).setAngle(pl.rot); im.setScale(pl.w * k / src.width); c.add(im);
  }
  return c;
}
