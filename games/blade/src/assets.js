// 캐릭터 불러오기: assets/chars/<id>.glb(뼈대·애니메이션) + <id>.json(클립 길이·루트 이동) + tex/<id>/*.jpg
//   load(id) 한 번 → spawn(id) 로 몇 개든 복제 (뼈대 복제 · 재질은 개체마다 따로: 맞을 때 번쩍임)
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.57.2';
import { clone } from '../lib/SkeletonUtils.js?v=0.57.2';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.57.2';

const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), tl = new THREE.TextureLoader(), cache = {}, ready = {};
export function load(id, alt) {
  return cache[id] ||= (async () => {
    const [g, meta] = await Promise.all([gl.loadAsync(`assets/chars/${id}.glb`), fetch(`assets/chars/${id}.json`).then(r => r.json())]);
    const tex = {}, nrm = {}, msk = {}; const get = async (f, srgb) => { const t = await tl.loadAsync(`assets/tex/${id}/${f}`); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    await Promise.all([...new Set([...Object.values(meta.tex), ...(meta.alt || [])])].map(async f => { tex[f] = await get(f, true); }));
    await Promise.all(Object.entries(meta.nrm || {}).map(async ([d, f]) => { nrm[d] = await get(f); }));
    await Promise.all(Object.entries(meta.msk || {}).map(async ([d, f]) => { msk[d] = await get(f); }));
    const clips = {}; g.animations.forEach(c => { clips[c.name] = c; });
    g.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    return (ready[id] = { id, scene: g.scene, clips, meta, tex, nrm, msk });
  })();
}
export const loaded = id => ready[id];
// 복제 · opt.tex: 바꿔 낄 텍스처(색 변형) · opt.hide: 숨길 메시 이름(장비 변형)
export function spawn(id, opt = {}) {
  const T = ready[id]; if (!T) throw new Error('not loaded ' + id);
  const root = clone(T.scene), mats = [];
  root.traverse(o => { if (!o.isMesh) return; const f = opt.tex && T.meta.tex[o.name] === T.meta.tex[T.meta.meshes.find(m => T.meta.tex[m])] ? opt.tex : T.meta.tex[o.name];
    const m = charMat(T.tex[f], T.nrm[T.meta.tex[o.name]], id === 'warrior' ? T.msk[T.meta.tex[o.name]] : null); o.material = m; mats.push(m); o.castShadow = true;
    if (opt.hide && opt.hide.some(h => o.name === h)) o.visible = false; });
  return { root, mats, clips: T.clips, meta: T.meta };
}

// 캐릭터 재질: 노멀맵(굴곡) · 마스크 초록 = 금속(반짝임) · 가장자리 빛(림 라이트) — 림 색은 장면마다 RIM 으로 바꿈
export const RIM = { col: { value: new THREE.Color(0x7a9cff) }, k: { value: 0.3 } };
function charMat(map, nrm, msk) {
  const m = new THREE.MeshStandardMaterial({ map: map || null, normalMap: nrm || null, roughness: 0.82, metalness: msk ? 0.6 : 0, envMapIntensity: msk ? 0.35 : 0.06, alphaTest: 0.5, side: THREE.DoubleSide });
  if (msk) { m.roughnessMap = msk; m.metalnessMap = msk; }
  m.onBeforeCompile = sh => { sh.uniforms.rimCol = RIM.col; sh.uniforms.rimK = RIM.k;
    sh.fragmentShader = 'uniform vec3 rimCol; uniform float rimK;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_ROUGHNESSMAP\n roughnessFactor = mix(0.88, 0.42, texture2D(roughnessMap, vRoughnessMapUv).g);\n#endif')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n metalnessFactor *= smoothstep(0.25, 0.7, texture2D(metalnessMap, vMetalnessMapUv).g);\n#endif')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.6); totalEmissiveRadiance += rimCol * rimF * rimK;'); };
  m.customProgramCacheKey = () => 'char' + (msk ? 1 : 0) + (nrm ? 1 : 0);
  return m;
}
