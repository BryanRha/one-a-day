// 효과음
import { load, save } from './save.js?v=0.24.0';
export const SFX = ['sfx_find', 'sfx_combo', 'sfx_miss', 'sfx_hint', 'sfx_clear', 'sfx_shutter', 'sfx_page', 'sfx_tick', 'sfx_click'];
class AudioManager {
  constructor() { this.game = null; this.last = {}; }
  attach(game) { this.game = game; }
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
