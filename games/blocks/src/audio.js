// 효과음 / 배경음. 배경음은 처음 틀 때 받아 온다 (첫 로딩을 가볍게).
import { load, save } from './save.js?v=0.53.1';

export const SFX = [
  'sfx_pick', 'sfx_place', 'sfx_invalid', 'sfx_clear_1', 'sfx_clear_2', 'sfx_clear_3', 'sfx_clear_4',
  'sfx_combo_1', 'sfx_combo_2', 'sfx_combo_3', 'sfx_combo_4', 'sfx_combo_5', 'sfx_combo_6', 'sfx_combo_7', 'sfx_combo_8',
  'sfx_praise_1', 'sfx_praise_2', 'sfx_praise_3', 'sfx_allclear', 'sfx_deal', 'sfx_over', 'sfx_best', 'sfx_click', 'sfx_cheer', 'sfx_fireworks', 'sfx_body_1', 'sfx_body_2', 'sfx_body_3', 'sfx_body_4', 'sfx_body_place',
  // 성우(해리): 상황별 2~4가지 버전
  ...Object.entries({ good: 2, great: 2, excellent: 2, amazing: 2, unbelievable: 2, best: 4, allclear: 2, record: 2, levelclear: 2, onfire: 1, unstoppable: 1, comeback: 2, hype: 3 }).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => `vo_${k}_${i + 1}`)),
];
export const BGM = ['bgm_game', 'bgm_lobby'];

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.last = {}; this.urlFor = k => `assets/audio/${k}.m4a`; }
  attach(game) { this.game = game; }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now();
    const gap = opts.gap ?? 45;
    if (this.last[key] && now - this.last[key] < gap) return;
    this.last[key] = now;
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1, detune: opts.detune ?? 0 }); } catch { /* 디코딩 실패 무시 */ }
  }
  buzz(p) { if (!load().sfx) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  music(key, scene = null) {
    if (!this.game) return;
    if (this.currentKey === key && this.current) return;
    this.stopMusic();
    this.currentKey = key;
    if (!load().music) return;
    if (!this.game.cache.audio.exists(key)) {
      const sc = scene || this.game.scene.getScenes(true).slice(-1)[0];
      if (!sc) return;
      sc.load.audio(key, [this.urlFor(key)]);
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start();
      return;
    }
    try { this.current = this.game.sound.add(key, { loop: true, volume: key === 'bgm_game' ? 0.34 : 0.4 }); this.current.play(); } catch { this.current = null; }
  }
  // 미리 받아 두기 (타이틀에서 비행·보스 곡을 조용히 받음)
  prefetch(scene, keys) {
    const need = keys.filter(k => !this.game.cache.audio.exists(k));
    if (!need.length) return;
    for (const k of need) scene.load.audio(k, [this.urlFor(k)]);
    scene.load.start();
  }
  stopMusic() { if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; } }
  duck(v) { if (this.current) this.current.setVolume(v); }
  // 콤보가 쌓일수록 배경음을 살짝 빠르게 (긴장감)
  rate(r) { if (this.current && Math.abs((this.current.rate || 1) - r) > 0.004) try { this.current.setRate(r); } catch { /* */ } }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() {
    const d = load(); d.music = !d.music; save();
    if (!d.music) this.stopMusic(); else if (this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
}
export const audio = new AudioManager();
