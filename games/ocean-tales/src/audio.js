// 효과음 / 배경음 관리. 설정(save.sfx / save.music)을 따른다.
import { load, save } from './save.js?v=0.10.4';

export const SFX = [
  'sfx_swap', 'sfx_swap_invalid', 'sfx_select', 'sfx_match_1', 'sfx_match_2', 'sfx_match_3', 'sfx_match_4', 'sfx_match_5',
  'sfx_special_create', 'sfx_line', 'sfx_bomb', 'sfx_rainbow', 'sfx_combo_special', 'sfx_jelly', 'sfx_ice', 'sfx_stone',
  'sfx_chain', 'sfx_item_drop', 'sfx_star_1', 'sfx_star_2', 'sfx_star_3', 'sfx_moves_low', 'sfx_shuffle', 'sfx_booster',
  'sfx_click', 'sfx_popup_open', 'sfx_popup_close', 'sfx_coin', 'jingle_win', 'jingle_lose',
  'sfx_star_slam', 'sfx_whale', 'sfx_world_clear',
];
export const BGM = ['bgm_title', 'bgm_map', 'bgm_game_1', 'bgm_game_2', 'bgm_game_3'];
// 월드 → 게임 배경음 (밝은 바다 1 · 열대 2 · 어두운 바다 3)
export const WORLD_BGM = [1, 2, 3, 1, 2, 1, 3, 3, 2, 1];

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.layer = null; this.last = {}; }
  attach(game) { this.game = game; }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now();
    if (this.last[key] && now - this.last[key] < 45) return; // 같은 소리 겹침 방지
    this.last[key] = now;
    // pan: -1(왼쪽) ~ 1(오른쪽) — 보드에서 터진 위치에 따라 소리를 좌우로
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1, detune: opts.detune ?? 0, pan: opts.pan ?? 0 }); } catch { /* 디코딩 실패 무시 */ }
  }
  // 바다의 신 목소리: vo_<이름> (파일이 있을 때만). 말하는 동안 배경음을 살짝 낮춤
  // 캔디크러쉬처럼 언어와 상관없이 영어 대사 하나로 통일 (짧고 힘 있는 감탄사)
  voice(name) {
    if (!this.game || !load().sfx) return;
    const key = `vo_${name}`;
    if (!this.game.cache.audio.exists(key)) return;
    const now = performance.now();
    if (this.lastVoice && now - this.lastVoice < 1400) return;   // 너무 자주 말하지 않게
    this.lastVoice = now;
    try {
      const snd = this.game.sound.add(key, { volume: 0.95 });
      if (this.current) this.current.setVolume(0.12);
      snd.once('complete', () => { if (this.current) this.current.setVolume(this.musicVol ?? 0.3); snd.destroy(); });
      snd.play();
    } catch { /* */ }
  }
  // 진동 (안드로이드 크롬 등 지원 기기만, 효과음이 꺼져 있으면 함께 끔)
  buzz(pattern) {
    if (!load().sfx) return;
    try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* */ }
  }
  // scene: 곡을 받을 때 쓸 장면(지금 시작하는 장면). 없으면 활성 장면 중 하나
  music(key, scene = null) {
    if (!this.game) return;
    if (this.currentKey === key && this.current && this.current.isPlaying) return;
    this.stopMusic();
    this.currentKey = key;
    if (!load().music) return;
    // 아직 안 받은 곡이면 지금 받고, 받는 동안 다른 곡으로 바뀌지 않았으면 재생
    const hiKey = `${key}_hi`;
    const need = [key, hiKey].filter(k => !this.game.cache.audio.exists(k) && (k === key || this.hasHi(key)));
    if (need.length && this.urlFor) {
      const sc = scene || this.game.scene.getScenes(true).slice(-1)[0];
      if (!sc) return;
      for (const k of need) sc.load.audio(k, [{ type: 'm4a', url: this.urlFor(k) }]);
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start();
      return;
    }
    try {
      this.musicVol = 0.28;   // 효과음·목소리보다 뒤에 깔리도록 (이전 0.4)
      this.current = this.game.sound.add(key, { loop: true, volume: this.musicVol });
      // 긴장 레이어(_hi): 같은 길이로 함께 돌다가 intensity() 로 소리를 키운다
      if (this.game.cache.audio.exists(hiKey)) {
        this.layer = this.game.sound.add(hiKey, { loop: true, volume: 0 });
        this.layer.play();
      }
      this.current.play();
    } catch { this.current = null; }
  }
  // 긴장 레이어(_hi)는 파일이 있을 때만 (외부 음원 곡에는 없음)
  hasHi(key) { return /^bgm_game_\d+$/.test(key) && !!(this.audioList && this.audioList.includes(`${key}_hi`)); }
  // 0 ~ 1: 남은 이동이 적을 때 긴장 레이어를 서서히 올린다
  intensity(v) {
    if (!this.layer || !this.game) return;
    const target = 0.4 * Math.max(0, Math.min(1, v));
    const scene = this.game.scene.getScenes(true)[0];
    if (scene) scene.tweens.add({ targets: this.layer, volume: target, duration: 900 });
    else this.layer.setVolume(target);
  }
  stopMusic() {
    if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; }
    if (this.layer) { this.layer.stop(); this.layer.destroy(); this.layer = null; }
  }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() {
    const d = load(); d.music = !d.music; save();
    if (!d.music) this.stopMusic(); else if (this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
}

export const audio = new AudioManager();
