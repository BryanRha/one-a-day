// 효과음 / 배경음. 배경음은 처음 틀 때 받아 온다 (첫 로딩을 가볍게).
import { load, save } from './save.js?v=0.16.0';

export const SFX = [
  'sfx_click', 'sfx_select', 'sfx_move_foot', 'sfx_move_tank', 'sfx_move_car', 'sfx_move_heli', 'sfx_rifle', 'sfx_bazooka', 'sfx_cannon', 'sfx_mg',
  'sfx_rocket', 'sfx_explode', 'sfx_capture', 'sfx_captured', 'sfx_build', 'sfx_turn', 'sfx_power', 'sfx_win', 'sfx_lose', 'sfx_cancel',
  'sfx_missile', 'sfx_crash', 'sfx_supply', 'sfx_dive', 'sfx_swap', 'sfx_bomb', 'sfx_seam', 'sfx_talk', 'sfx_page', 'sfx_rank',
];
export const BGM = ['bgm_battle', 'bgm_enemy', 'bgm_lobby', 'bgm_heroic', 'bgm_epic', 'bgm_naval', 'bgm_air', 'bgm_spy', 'bgm_winter', 'bgm_cheer', 'bgm_villain', 'bgm_story', 'bgm_warroom'];

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.last = {}; this.urlFor = k => `assets/audio/${k}.m4a`; }
  attach(game) { this.game = game; }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now();
    const gap = opts.gap ?? 45;
    if (this.last[key] && now - this.last[key] < gap) return;
    this.last[key] = now;
    if (!this.game.cache.audio.exists(key)) return;
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
      if (key !== 'bgm_battle') sc.load.once('loaderror', f => { if (f.key === key && this.currentKey === key) { this.currentKey = null; this.music('bgm_battle', sc); } });   // 테마곡이 없으면 기본 곡
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start();
      return;
    }
    try { this.current = this.game.sound.add(key, { loop: true, volume: key === 'bgm_lobby' ? 0.4 : key === 'bgm_story' ? 0.42 : 0.34 }); this.current.play(); } catch { this.current = null; }
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
