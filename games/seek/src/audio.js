// 효과음
import { load, save } from './save.js?v=0.49.1';
export const SFX = ['sfx_find', 'sfx_combo', 'sfx_miss', 'sfx_hint', 'sfx_clear', 'sfx_shutter', 'sfx_page', 'sfx_tick', 'sfx_click'];
class AudioManager {
  constructor() { this.game = null; this.last = {}; }
  attach(game) { this.game = game; }
  // 효과음 파일마다 녹음 크기가 제각각(최대 음량 0.04 ~ 0.94)이라 작은 소리가 묻힘 → 불러온 뒤 최대 음량을 0.85 로 맞춤
  normalize() {
    for (const k of SFX) { const buf = this.game.cache.audio.get(k); if (!buf || !buf.getChannelData || buf.__norm) continue;
      let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; } }
      if (pk > 0.001) { const g = Math.min(25, 0.85 / pk); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; } }
      buf.__norm = true; }
  }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now(), gap = opts.gap ?? 40;
    if (this.last[key] && now - this.last[key] < gap) return; this.last[key] = now;
    if (!this.game.cache.audio.exists(key)) return;
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1 }); } catch { /* */ }
  }
  buzz(p) { if (!load().sfx) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
}
export const audio = new AudioManager();
