// 효과음 / 배경음. 배경음은 처음 틀 때 받아 온다 (첫 로딩을 가볍게).
import { load, save } from './save.js?v=0.29.0';

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
  // 배경음: HTML <audio> 로 흘려 들음 (곡 전체를 메모리에 풀지 않음 — 3분 곡 하나가 70MB 라 폰이 앱을 끌 수 있었음)
  music(key) {
    if (!this.game) return;
    if (this.currentKey === key && this.current) return;
    this.stopMusic();
    this.currentKey = key;
    if (!load().music) return;
    const el = new Audio(this.urlFor(key)); el.loop = true; el.preload = 'auto';
    el.volume = this.vol = key === 'bgm_lobby' ? 0.4 : key === 'bgm_story' ? 0.42 : 0.34;
    if (key !== 'bgm_battle') el.addEventListener('error', () => { if (this.currentKey === key) { this.currentKey = null; this.music('bgm_battle'); } }, { once: true });   // 곡이 없으면 기본 곡
    this.current = el;
    const go = () => { if (this.current === el && !document.hidden) el.play().catch(() => { this.waiting = el; }); };
    go();
    if (!this.hooked) {   // 첫 터치 전엔 재생이 막힐 수 있음 · 앱을 내리면 멈추고 돌아오면 이어서
      this.hooked = true;
      const resume = () => { const w = this.waiting; this.waiting = null; if (w && w === this.current) w.play().catch(() => {}); };
      addEventListener('pointerdown', resume, true); addEventListener('touchstart', resume, true);
      document.addEventListener('visibilitychange', () => { const c = this.current; if (!c) return; if (document.hidden) c.pause(); else c.play().catch(() => { this.waiting = c; }); });
    }
  }
  prefetch() { /* 흘려 듣기라 미리 받을 필요 없음 */ }
  stopMusic() { const c = this.current; if (c) { c.pause(); c.removeAttribute('src'); c.load(); this.current = null; } }
  duck(v) { if (this.current) this.current.volume = Math.max(0, Math.min(1, v)); }
  rate(r) { if (this.current && Math.abs((this.current.playbackRate || 1) - r) > 0.004) this.current.playbackRate = r; }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() {
    const d = load(); d.music = !d.music; save();
    if (!d.music) this.stopMusic(); else if (this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
}
export const audio = new AudioManager();
