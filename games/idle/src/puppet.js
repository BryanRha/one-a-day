// 원화 인형 움직임: 원화를 세로 척추선(Rope)으로 휘게 해서 살아 있는 듯 보이게
//   발은 땅에 붙어 있고, 위로 갈수록 크게 움직임 — 숨쉬기 · 흔들림 · 걷기 반동 · 공격(예비→휘두르기→복귀) · 사격 반동 · 스킬 · 피격 · 쓰러짐
//   const p = new Puppet(scene, 'hero_ava', 260, { face: 1 }); container.add(p.rope); 매 프레임 p.update(dt)
const N = 14;   // 척추 마디 수
const ease = t => 1 - Math.pow(1 - t, 3);
export class Puppet {
  constructor(sc, key, h, o = {}) {
    const src = sc.textures.get(key).getSourceImage(); this.sc = sc; this.H = src.height; this.face = o.face || 1; this.k = h / this.H;
    const pts = []; for (let i = 0; i <= N; i++) pts.push(new Phaser.Math.Vector2(0, -this.H + this.H * i / N));
    this.rope = sc.add.rope(0, 0, key, null, pts, false); this.rope.setScale(this.k * this.face, this.k);
    this.t = Math.random() * 10; this.ph = Math.random() * Math.PI * 2; this.sway = o.sway ?? 1; this.walking = false; this.act0 = null; this.at = 0; this.dead = 0; this.hitT = 0; this.flashT = 0; this.big = o.big || 1;
    this.dx = 0; this.alpha = 1;
  }
  get height() { return this.H * this.k; }
  act(kind) { if (this.dead) return; this.act0 = kind; this.at = 0; }
  hurt() { if (this.dead) return; this.hitT = 0.28; this.tint(0xFF7A7A); }
  flash() { this.flashT = 0.07; this.rope.tintFill = true; this.rope.setColors(0xFFFFFF); }
  tint(c) { this.rope.tintFill = false; this.rope.setColors(c); this.tintT = 0.12; }
  die() { this.dead = 0.001; }
  revive() { this.dead = 0; this.rope.setAlpha(1); }
  update(dt) {
    const H = this.H; this.t += dt; const t = this.t, ph = this.ph;
    let lean = 0, stretch = 1, bob = 0, dx = 0;
    // 걷기: 발 디딤 반동 + 앞으로 살짝 기울기
    if (this.walking) { const w = Math.abs(Math.sin(t * 8 + ph)); bob = -w * 0.035 * H; lean += 0.05 * H; stretch *= 1 - (1 - w) * 0.03; }
    // 행동
    if (this.act0) { this.at += dt; const a = this.at;
      if (this.act0 === 'attack') { const T1 = 0.13, T2 = 0.22, T3 = 0.45;
        if (a < T1) { const k = ease(a / T1); lean -= 0.12 * H * k; stretch *= 1 - 0.06 * k; }
        else if (a < T2) { const k = ease((a - T1) / (T2 - T1)); lean += (-0.12 + 0.34 * k) * H; stretch *= 0.94 + 0.12 * k; dx = 0.18 * H * k; }
        else if (a < T3) { const k = ease((a - T2) / (T3 - T2)); lean += 0.22 * H * (1 - k); stretch *= 1.06 - 0.06 * k; dx = 0.18 * H * (1 - k); }
        else this.act0 = null; }
      else if (this.act0 === 'shoot') { const T = 0.3; if (a < T) { const k = a < 0.06 ? a / 0.06 : 1 - (a - 0.06) / (T - 0.06); lean -= 0.07 * H * k; stretch *= 1 - 0.03 * k; } else this.act0 = null; }
      else if (this.act0 === 'cast') { const T = 0.6; if (a < T) { const k = Math.sin(Math.PI * a / T); stretch *= 1 + 0.1 * k; lean -= 0.05 * H * k; bob -= 0.04 * H * k; } else this.act0 = null; }
      else this.act0 = null; }
    if (this.hitT > 0) { this.hitT -= dt; const k = this.hitT / 0.28; lean -= 0.14 * H * k * k; dx -= 0.05 * H * k; }
    if (this.tintT > 0) { this.tintT -= dt; if (this.tintT <= 0) this.rope.setColors(0xFFFFFF); }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) { this.rope.tintFill = false; this.rope.setColors(0xFFFFFF); } }
    // 쓰러짐: 뒤로 크게 기울며 주저앉고 흐려짐
    let fall = 0; if (this.dead) { this.dead = Math.min(1, this.dead + dt * 2.2); fall = ease(this.dead); lean -= 0.55 * H * fall; stretch *= 1 - 0.45 * fall; this.rope.setAlpha(1 - 0.65 * fall); }
    const breathe = Math.sin(t * 2.4 + ph) * 0.012, sw = Math.sin(t * 1.6 + ph) * 0.022 * H * this.sway, fl = 0.006 * H * this.sway;
    const pts = this.rope.points;
    for (let i = 0; i <= N; i++) { const h = 1 - i / N, h2 = h * h;
      pts[i].x = dx + lean * h2 + sw * h2 + Math.sin(t * 4.2 + ph + h * 5) * fl * h * h2;
      pts[i].y = bob - H * h * stretch * (1 + breathe * h); }
    this.rope.setDirty();
  }
  // 잔상: 휘두를 때 지금 모습이 흐리게 남았다가 사라짐
  ghost(container, tintCol = 0xFFE6A0) { const g = this.sc.add.image(this.rope.x, this.rope.y, this.rope.texture.key).setOrigin(0.5, 1).setScale(this.k * this.face, this.k).setTintFill(tintCol).setAlpha(0.35).setBlendMode('ADD'); container.addAt(g, 0); this.sc.tweens.add({ targets: g, alpha: 0, x: g.x - 30 * this.face, duration: 260, onComplete: () => g.destroy() }); }
}
// 장면에 붙여 스스로 움직이는 인형 (컷씬 · 영웅 상세 · 소환 결과용): 숨쉬기 · 흔들림만
export function livePuppet(sc, key, h, o = {}) {
  const p = new Puppet(sc, key, h, o), fn = (t, d) => { if (!p.rope.scene) return sc.events.off('update', fn); p.update(Math.min(0.05, d / 1000)); };
  sc.events.on('update', fn); p.rope.once('destroy', () => sc.events.off('update', fn)); return p;
}
