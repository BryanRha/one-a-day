// 캐릭터 불러오기: assets/chars/<id>.glb(뼈대·애니메이션) + <id>.json(클립 길이·루트 이동) + tex/<id>/*.jpg
//   load(id) 한 번 → spawn(id) 로 몇 개든 복제 (뼈대 복제 · 재질은 개체마다 따로: 맞을 때 번쩍임)
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.56.0';
import { clone } from '../lib/SkeletonUtils.js?v=0.56.0';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.56.0';

const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), tl = new THREE.TextureLoader(), cache = {}, ready = {};
export function load(id, alt) {
  return cache[id] ||= (async () => {
    const [g, meta] = await Promise.all([gl.loadAsync(`assets/chars/${id}.glb`), fetch(`assets/chars/${id}.json`).then(r => r.json())]);
    const tex = {}; await Promise.all([...new Set([...Object.values(meta.tex), ...(meta.alt || [])])].map(async f => { const t = await tl.loadAsync(`assets/tex/${id}/${f}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex[f] = t; }));
    const clips = {}; g.animations.forEach(c => { clips[c.name] = c; });
    g.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    return (ready[id] = { id, scene: g.scene, clips, meta, tex });
  })();
}
export const loaded = id => ready[id];
// 복제 · opt.tex: 바꿔 낄 텍스처(색 변형) · opt.hide: 숨길 메시 이름(장비 변형)
export function spawn(id, opt = {}) {
  const T = ready[id]; if (!T) throw new Error('not loaded ' + id);
  const root = clone(T.scene), mats = [];
  root.traverse(o => { if (!o.isMesh) return; const f = opt.tex && T.meta.tex[o.name] === T.meta.tex[T.meta.meshes.find(m => T.meta.tex[m])] ? opt.tex : T.meta.tex[o.name];
    const m = new THREE.MeshLambertMaterial({ map: T.tex[f] || null, alphaTest: 0.5, side: THREE.DoubleSide }); o.material = m; mats.push(m); o.castShadow = true;
    if (opt.hide && opt.hide.some(h => o.name === h)) o.visible = false; });
  return { root, mats, clips: T.clips, meta: T.meta };
}
