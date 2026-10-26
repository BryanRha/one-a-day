// 움직이는 인물(주인공 · 몬스터) 공통: 모델 · 애니메이션 구간 재생 · 방향 · 맞을 때 번쩍 · 그림자 · 무기 끝 위치
import * as THREE from 'three';
import { spawn } from './assets.js?v=0.57.5';
import { shadowTex } from './fxtex.js?v=0.57.5';

const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
let shadowGeo = null, shadowMat = null;
export class Actor {
  constructor(id, o = {}) {
    const c = spawn(id, o); this.id = id; this.model = c.root; this.clips = c.clips; this.meta = c.meta; this.mats = c.mats;
    this.root = new THREE.Group(); this.root.add(this.model); this.scale = o.scale || 1; this.model.scale.setScalar(this.scale);
    this.mixer = new THREE.AnimationMixer(this.model); this.act = null; this.seg = null; this.ang = 0; this.angT = 0; this.turn = o.turn ?? 14;
    this.pos = this.root.position; this.vel = new THREE.Vector3(); this.flashT = 0; this.flashCol = new THREE.Color(1, 1, 1); this.alpha = 1;
    shadowGeo ||= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); shadowMat ||= new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.6 });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat); this.shadow.renderOrder = 2; const r = (o.shadow ?? 120) * this.scale; this.shadow.scale.set(r * 2, 1, r * 2); this.shadow.position.y = 2;
    this.root.add(this.shadow);
    this.mats.forEach(m => { m.emissive = new THREE.Color(0); });
    this.weapon = null; this.model.traverse(m => { if (!this.weapon && m.isSkinnedMesh && /weapon|Sphere03/i.test(m.name) && m.visible) this.weapon = m; });
    if (this.weapon) this.initBlade();
  }
  // 칼 밑동·끝 (뼈 기준 좌표) — 궤적용
  initBlade() {
    const w = this.weapon, pos = w.geometry.attributes.position, si = w.geometry.attributes.skinIndex, bi = si.getX(0); this.bladeBone = w.skeleton.bones[bi];
    const inv = w.skeleton.boneInverses[bi], bm = w.bindMatrix, pts = []; for (let i = 0; i < pos.count; i += 2) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(bm).applyMatrix4(inv));
    let far = pts[0]; for (const p of pts) if (p.length() > far.length()) far = p;
    let near = pts[0]; for (const p of pts) if (p.distanceTo(far) > near.distanceTo(far)) near = p;
    this.bladeTip = far; this.bladeMid = near.clone().lerp(far, 0.35);
  }
  blade(a, b) { this.bladeBone.updateWorldMatrix(true, false); a.copy(this.bladeMid).applyMatrix4(this.bladeBone.matrixWorld); b.copy(this.bladeTip).applyMatrix4(this.bladeBone.matrixWorld); }
  has(n) { return !!this.clips[n]; }
  // 구간 재생: from~to 초 · loop · fade(섞는 시간) · speed · onEnd
  play(name, o = {}) {
    const clip = this.clips[name]; if (!clip) { o.onEnd && o.onEnd(); return; }
    const a = this.mixer.clipAction(clip); const prev = this.act; const fade = o.fade ?? 0.12;
    if (prev === a && o.restart === false) { this.seg = { ...this.seg, ...o, name }; return; }
    a.reset(); a.setLoop(o.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true; a.timeScale = o.speed ?? 1; a.time = o.from || 0; a.enabled = true; a.setEffectiveWeight(1);
    if (prev && prev !== a && fade > 0) { a.play(); a.crossFadeFrom(prev, fade, false); } else { if (prev && prev !== a) prev.stop(); a.play(); }
    this.act = a; this.seg = { name, from: o.from || 0, to: o.to ?? clip.duration, loop: !!o.loop, onEnd: o.onEnd, events: (o.events || []).map(e => ({ ...e, done: false })), dur: clip.duration };
  }
  get t() { return this.act ? this.act.time : 0; }
  setSpeed(s) { if (this.act) this.act.timeScale = s; }
  update(dt) {
    this.mixer.update(dt);
    const s = this.seg; if (s && this.act) {
      const t = this.act.time;
      for (const e of s.events) if (!e.done && t >= e.t) { e.done = true; e.fn(); if (this.seg !== s) return; }
      if (t >= s.to - 1e-4) { if (s.loop) { this.act.time = s.from + (t - s.to); s.events.forEach(e => { e.done = false; }); } else if (!s.ended) { s.ended = true; const f = s.onEnd; f && f(); } }
    }
    // 방향 (부드럽게 돌기)
    let d = this.angT - this.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); this.ang += d * Math.min(1, dt * this.turn); this.root.rotation.y = this.ang;
    if (this.flashT > 0) { this.flashT -= dt; const k = Math.max(0, this.flashT / 0.12); for (const m of this.mats) m.emissive.copy(this.flashCol).multiplyScalar(k * 0.9); }
  }
  face(a, now) { this.angT = a; if (now) this.ang = a; }
  faceTo(p, now) { this.face(Math.atan2(p.x - this.pos.x, p.z - this.pos.z), now); }
  dirX() { return Math.sin(this.ang); }
  dirZ() { return Math.cos(this.ang); }
  flash(col = 0xffffff) { this.flashCol.set(col); this.flashT = 0.12; }
  fade(a) { this.alpha = a; for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a > 0.5; } this.shadow.material = shadowMat; this.shadow.visible = a > 0.2; }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model); this.root.removeFromParent(); for (const m of this.mats) m.dispose(); }
}
