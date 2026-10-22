// 사진 보기 창: 두 손가락 확대·이동 · 한 손가락 끌기 · 두 번 탭 확대 · 마우스 휠 · 탭 → 사진 좌표로 알려줌
// 틀린그림은 창 두 개가 같은 확대/위치를 공유 (link)
export class Viewer {
  constructor(sc, key, x, y, w, h, o = {}) {
    Object.assign(this, { sc, x, y, w, h, onTap: o.onTap || (() => {}), links: [] });
    const src = sc.textures.get(key).getSourceImage();
    this.iw = src.width; this.ih = src.height;
    this.base = Math.max(w / this.iw, h / this.ih);   // 창을 꽉 채우는 배율 (넘치는 쪽은 이동으로 봄)
    if (o.fit) this.base = Math.min(w / this.iw, h / this.ih);
    this.zoom = 1; this.maxZoom = o.maxZoom || 3.2; this.cx = this.iw / 2; this.cy = this.ih / 2;   // 창 가운데에 보이는 사진 점
    this.root = sc.add.container(0, 0);
    this.img = sc.add.image(0, 0, key).setOrigin(0.5);
    this.layer = sc.add.container(0, 0);   // 사진 좌표에 붙는 표시들 (정답 원 등)
    this.root.add([this.img, this.layer]);
    if (o.faded) this.addCover(key);
    const m = sc.make.graphics({ add: false }); m.fillStyle(0xffffff).fillRect(x, y, w, h); this.root.setMask(m.createGeometryMask());
    this.zone = sc.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
    this.ptrs = new Map(); this.apply();
    this.zone.on('pointerdown', p => this.down(p));
    sc.input.on('pointermove', this.mv = p => this.move(p));
    sc.input.on('pointerup', this.up_ = p => this.up(p));
    sc.input.on('pointerupoutside', this.up_);   // 화면 밖에서 손을 떼도 손가락 기록을 지움 (안 지우면 다음 터치가 유령 손가락과 핀치가 됨)
    // PC 마우스 휠: 커서 자리를 기준으로 확대·축소
    sc.input.on('wheel', this.wh = (p, objs, dx, dy) => { if (p.x < x || p.y < y || p.x > x + w || p.y > y + h) return; const ip = this.toImg(p.x, p.y); this.zoom = Phaser.Math.Clamp(this.zoom * Math.exp(-dy * 0.0015), 1, this.maxZoom); const s = this.s; this.cx = ip.x - (p.x - x - w / 2) / s; this.cy = ip.y - (p.y - y - h / 2) / s; this.apply(); });
    sc.events.once('shutdown', () => { sc.input.off('pointermove', this.mv); sc.input.off('pointerup', this.up_); sc.input.off('pointerupoutside', this.up_); sc.input.off('wheel', this.wh); this.pending?.remove(); });
  }
  // 빛바랜 사진 덮개: 세피아·흐린 사본을 위에 깔고, 찾을 때마다 그 둘레를 지워 원래 색이 드러나게
  addCover(key) {
    const sc = this.sc, sk = key + '_sep';
    if (!sc.textures.exists(sk)) {
      const src = sc.textures.get(key).getSourceImage(), c = sc.textures.createCanvas(sk, src.width, src.height), g = c.getContext();
      g.filter = 'sepia(0.85) saturate(0.55) brightness(1.04) contrast(0.82)'; g.drawImage(src, 0, 0); g.filter = 'none';
      g.fillStyle = 'rgba(240,222,190,0.22)'; g.fillRect(0, 0, src.width, src.height);   // 바랜 종이빛
      const vg = g.createRadialGradient(src.width / 2, src.height / 2, Math.min(src.width, src.height) * 0.3, src.width / 2, src.height / 2, Math.max(src.width, src.height) * 0.75); vg.addColorStop(0, 'rgba(60,35,10,0)'); vg.addColorStop(1, 'rgba(60,35,10,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, src.width, src.height);
      c.refresh();
    }
    if (!sc.textures.exists('brush')) { const c = sc.textures.createCanvas('brush', 256, 256), g = c.getContext(), gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); c.refresh(); }
    this.cover = sc.add.renderTexture(0, 0, this.iw, this.ih).setOrigin(0.5); this.cover.draw(sk, 0, 0);
    this.root.addAt(this.cover, 1); this.brush = sc.make.image({ key: 'brush', add: false });
  }
  // (x,y) 둘레 반지름 r 을 원래 색으로 (조금씩 넓어지며)
  restore(x, y, r) {
    if (!this.cover) return; const o = { k: 0.3 };
    this.sc.tweens.add({ targets: o, k: 1, duration: 450, ease: 'Cubic.easeOut', onUpdate: () => { this.brush.setScale(r * 3.2 * o.k / 256); this.cover.erase(this.brush, x, y); } });
  }
  restoreAll() { if (this.cover) this.sc.tweens.add({ targets: this.cover, alpha: 0, duration: 900, ease: 'Sine.easeIn' }); }
  get s() { return this.base * this.zoom; }
  clamp() {
    const s = this.s, hw = this.w / 2 / s, hh = this.h / 2 / s;
    this.cx = this.iw <= hw * 2 ? this.iw / 2 : Phaser.Math.Clamp(this.cx, hw, this.iw - hw);
    this.cy = this.ih <= hh * 2 ? this.ih / 2 : Phaser.Math.Clamp(this.cy, hh, this.ih - hh);
  }
  apply(from) {
    this.clamp(); const s = this.s;
    this.img.setScale(s).setPosition(this.x + this.w / 2 + (this.iw / 2 - this.cx) * s, this.y + this.h / 2 + (this.ih / 2 - this.cy) * s);
    if (this.cover) this.cover.setScale(s).setPosition(this.img.x, this.img.y);
    this.layer.setScale(s).setPosition(this.x + this.w / 2 - this.cx * s, this.y + this.h / 2 - this.cy * s);
    for (const v of this.links) if (v !== from) { v.zoom = this.zoom; v.cx = this.cx; v.cy = this.cy; v.apply(this); }
  }
  link(v) { this.links.push(v); v.links.push(this); }
  toImg(px, py) { const s = this.s; return { x: this.cx + (px - this.x - this.w / 2) / s, y: this.cy + (py - this.y - this.h / 2) / s }; }
  toScreen(ix, iy) { const s = this.s; return { x: this.x + this.w / 2 + (ix - this.cx) * s, y: this.y + this.h / 2 + (iy - this.cy) * s }; }
  down(p) {
    // 놓친 손 떼기(앱 전환·알림 등)로 남은 기록은 버림
    for (const id of [...this.ptrs.keys()]) { const ptr = this.sc.input.manager.pointers.find(q => q.id === id); if (!ptr || !ptr.isDown) this.ptrs.delete(id); }
    this.zt?.stop(); this.zt = null;
    this.ptrs.set(p.id, { x: p.x, y: p.y, sx: p.x, sy: p.y, t: p.downTime });
    if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoom, mid: this.toImg((a.x + b.x) / 2, (a.y + b.y) / 2) }; this.moved = true; }
    else this.moved = false;
  }
  move(p) {
    const q = this.ptrs.get(p.id); if (!q || !p.isDown) return;
    const dx = p.x - q.x, dy = p.y - q.y; q.x = p.x; q.y = p.y;
    if (this.ptrs.size >= 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoom = Phaser.Math.Clamp(this.pinch.z * d / this.pinch.d, 1, this.maxZoom);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, s = this.s;   // 손가락 가운데 점이 같은 사진 점에 머물게
      this.cx = this.pinch.mid.x - (mx - this.x - this.w / 2) / s; this.cy = this.pinch.mid.y - (my - this.y - this.h / 2) / s; this.apply();
    } else if (this.ptrs.size === 1) {
      if (Math.hypot(p.x - q.sx, p.y - q.sy) > 18) this.moved = true;
      if (this.moved) { this.cx -= dx / this.s; this.cy -= dy / this.s; this.apply(); }
    }
  }
  up(p) {
    const q = this.ptrs.get(p.id); if (!q) return; this.ptrs.delete(p.id);
    if (this.ptrs.size < 2) this.pinch = null;
    if (this.moved || this.ptrs.size) return;
    const now = this.sc.time.now;
    // 두 번 탭: 2배 확대 / 원래대로 (첫 탭은 바로 정답 판정, 두 번째 탭은 확대만)
    // 두 번 탭이면 첫 탭의 '빗나감' 판정은 취소 (확대하려다 하트를 잃지 않게)
    if (this.lastTap && now - this.lastTap.t < 280 && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 60) { this.lastTap = null; this.pending?.remove(); this.pending = null; this.zoomTo(this.zoom > 1.4 ? 1 : 2.2, p.x, p.y); return; }
    this.lastTap = { t: now, x: p.x, y: p.y };
    const ip = this.toImg(p.x, p.y); if (ip.x < 0 || ip.y < 0 || ip.x > this.iw || ip.y > this.ih) return;
    // 빗나감 처리는 later() 로 넘기면 두 번 탭 여부를 본 뒤(0.28초) 실행
    this.onTap(ip, p, fn => { this.pending?.remove(); this.pending = this.sc.time.delayedCall(290, () => { this.pending = null; fn(); }); });
  }
  zoomTo(z, px, py) {
    const ip = this.toImg(px, py), from = { z: this.zoom, cx: this.cx, cy: this.cy }, o = { k: 0 };
    this.zt?.stop(); this.zt = this.sc.tweens.add({ targets: o, k: 1, duration: 220, ease: 'Cubic.easeOut', onUpdate: () => { this.zoom = from.z + (z - from.z) * o.k; const tx = z > from.z ? ip.x : this.iw / 2, ty = z > from.z ? ip.y : this.ih / 2; this.cx = from.cx + (tx - from.cx) * o.k; this.cy = from.cy + (ty - from.cy) * o.k; this.apply(); } });
  }
  // 정답 쪽으로 화면 이동 (힌트)
  focus(ix, iy, z = 1.8) { const from = { z: this.zoom, cx: this.cx, cy: this.cy }, o = { k: 0 }; this.zt?.stop(); this.zt = this.sc.tweens.add({ targets: o, k: 1, duration: 450, ease: 'Cubic.easeInOut', onUpdate: () => { this.zoom = from.z + (Math.max(from.z, z) - from.z) * o.k; this.cx = from.cx + (ix - from.cx) * o.k; this.cy = from.cy + (iy - from.cy) * o.k; this.apply(); } }); }
}
