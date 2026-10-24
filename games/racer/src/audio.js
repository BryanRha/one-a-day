// 효과음 / 배경음. 배경음은 처음 틀 때 받아 온다 (첫 로딩을 가볍게).
import { load, save } from './save.js?v=0.44.1';

export const SFX = [
  'sfx_honk_0', 'sfx_honk_1', 'sfx_honk_2', 'sfx_honk_3', 'sfx_honk_4', 'sfx_crash', 'sfx_smash', 'sfx_boom', 'sfx_jump', 'sfx_land',
  'sfx_coin', 'sfx_gold', 'sfx_item', 'sfx_fuel', 'sfx_checkpoint', 'sfx_fever', 'sfx_slip', 'sfx_skid', 'sfx_lowfuel', 'sfx_end', 'sfx_click',
  'vo_seu', 'vo_teu', 'vo_re', 'vo_cha', 'vo_full',
];
export const BGM = ['bgm_race', 'bgm_lobby', 'bgm_fever', 'bgm_boss'];

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
    try { this.current = this.game.sound.add(key, { loop: true, volume: key === 'bgm_race' ? 0.36 : key === 'bgm_fever' || key === 'bgm_boss' ? 0.5 : 0.42 }); this.current.play(); } catch { this.current = null; }
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
