// 배경 소품: assets/props/<id>.glb + props.json(재질 → 텍스처) · 같은 소품은 모양·재질을 함께 씀
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.57.3';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.57.3';

const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), tl = new THREE.TextureLoader();
const ALPHA = /grass|bush|creeper|BB_|flower|shrub|vine|leaf|ivy|net|Root|Tree_add_Bao_001A|StumpAL|20100819/i;
let metaP = null; const cache = {}, mats = {};
export const propMeta = () => metaP ||= fetch('assets/props/props.json').then(r => r.json());
function mat(file, tint) {
  const k = file + (tint || ''); if (mats[k]) return mats[k];
  const a = file && ALPHA.test(file), m = new THREE.MeshLambertMaterial({ color: tint || 0xffffff, alphaTest: a ? 0.42 : 0, side: a ? THREE.DoubleSide : THREE.FrontSide });
  if (file) { const t = tl.load('assets/props/tex/' + file); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; m.map = t; }
  return (mats[k] = m);
}
// 소품 원본 (한 번만 불러옴)
export function loadProp(id) {
  return cache[id] ||= (async () => {
    const [meta, g] = await Promise.all([propMeta(), gl.loadAsync(`assets/props/${id}.glb`)]); const M = meta[id] || { tex: {} };
    g.scene.traverse(o => { if (!o.isMesh) return; const one = x => { const f = M.tex[x.name] ?? M.tex[x.name === 'none' ? '' : x.name] ?? null; return mat(f, f == null ? 0x8a8478 : 0); }; o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
    const bb = new THREE.Box3().setFromObject(g.scene); return { scene: g.scene, box: bb, size: bb.getSize(new THREE.Vector3()) };
  })();
}
// 놓기: h = 원하는 높이(없으면 원래 크기 × s)
export async function place(parent, id, x, z, o = {}) {
  const P = await loadProp(id), c = P.scene.clone(); const s = o.h ? o.h / P.size.y : (o.s || 1);
  c.scale.setScalar(s); c.position.set(x, (o.y || 0) - P.box.min.y * s, z); c.rotation.y = o.ry || 0; c.traverse(m => { if (m.isMesh) { m.castShadow = !!o.shadow; m.receiveShadow = true; } });
  parent.add(c); return c;
}
