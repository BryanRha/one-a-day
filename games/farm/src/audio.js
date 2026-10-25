// 효과음 · 배경음 (ElevenLabs 로 만든 K뷰티 레시피 전용 소리, tools/gen_audio.sh)
import { load, save } from './save.js?v=0.51.0';
export const SFX = ['sfx_click', 'sfx_tap', 'sfx_coin', 'sfx_order', 'sfx_levelup', 'sfx_error', 'sfx_drop', 'sfx_pick', 'sfx_merge', 'sfx_merge_big', 'sfx_box', 'sfx_bubble', 'sfx_repair', 'sfx_gen', 'sfx_blip',
  'sfx_harvest', 'sfx_plant', 'sfx_moo', 'sfx_cluck', 'sfx_whistle', 'sfx_build'];
export const BGM = ['bgm_farm', 'bgm_story'];
const BGM_VOL = { bgm_farm: 0.36, bgm_story: 0.4 };
class AudioManager {
  constructor() { this.game = null; this.last = {}; this.cur = null; this.curKey = null; }
  attach(game) { this.game = game; }
  // 효과음: 파일마다 크기가 달라 최대 음량을 0.85 로 맞춤 · 앞뒤 무음 잘라 바로 들리게
  // 배경음: 앞뒤 무음(AAC 앞부분 빈 소리 포함)을 잘라 반복할 때 끊기지 않게
  normalize() {
    const ctx = this.game.sound.context; if (!ctx) return;
    for (const k of [...SFX, ...BGM]) {
      let buf = this.game.cache.audio.get(k); if (!buf || !buf.getChannelData || buf.__norm) continue;
      const nc = buf.numberOfChannels, len = buf.length; let pk = 0, s = len, e = 0;
      for (let c = 0; c < nc; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; if (a > 0.004) { if (i < s) s = i; if (i > e) e = i; } } }
      if (e <= s) { buf.__norm = true; continue; }
      const isBgm = k.startsWith('bgm'), g = isBgm ? 1 : pk > 0.001 ? Math.min(25, 0.85 / pk) : 1, n = e - s + 1;
      const out = ctx.createBuffer(nc, n, buf.sampleRate);
      for (let c = 0; c < nc; c++) { const src = buf.getChannelData(c), dst = out.getChannelData(c); for (let i = 0; i < n; i++) dst[i] = src[s + i] * g;
        // 효과음 끝은 짧게 줄여 딸깍 소리 없게
        if (!isBgm) { const f = Math.min(n, Math.floor(buf.sampleRate * 0.02)); for (let i = 0; i < f; i++) dst[n - 1 - i] *= i / f; } }
      out.__norm = true; this.game.cache.audio.entries.set(k, out);
    }
  }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now(), gap = opts.gap ?? 40;
    if (this.last[key] && now - this.last[key] < gap) return; this.last[key] = now;
    if (!this.game.cache.audio.exists(key)) return;
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1, detune: opts.detune ?? 0 }); } catch { /* */ }
  }
  buzz(p) { if (load().haptic === false) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  // 배경음: 장면마다 곡을 바꾸고 0.6초 동안 서로 겹쳐 넘어감 (같은 곡이면 계속 흐름)
  music(key) {
    if (!this.game) return;
    if (this.curKey === key && this.cur) return;
    this.curKey = key; const old = this.cur; this.cur = null;
    if (old) this.fadeOut(old);
    if (load().music === false || !this.game.cache.audio.exists(key)) return;
    try {
      const s = this.game.sound.add(key, { loop: true, volume: 0 }); s.play(); this.cur = s;
      this.fadeTo(s, BGM_VOL[key] ?? 0.35, 600);
    } catch { /* */ }
  }
  fadeTo(s, v, ms) { const v0 = s.volume, t0 = performance.now(); const step = () => { if (!s.isPlaying && !s.isPaused) return; const k = Math.min(1, (performance.now() - t0) / ms); s.setVolume(v0 + (v - v0) * k); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  fadeOut(s) { this.fadeTo(s, 0, 500); setTimeout(() => { try { s.stop(); s.destroy(); } catch { /* */ } }, 560); }
  // 큰 효과음(레벨업 등) 동안 배경음을 잠깐 줄임
  duck(ms = 1600) { const s = this.cur; if (!s) return; const v = BGM_VOL[this.curKey] ?? 0.35; this.fadeTo(s, v * 0.35, 150); clearTimeout(this.duckT); this.duckT = setTimeout(() => { if (this.cur === s) this.fadeTo(s, v, 500); }, ms); }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() { const d = load(); d.music = d.music === false; save(); const k = this.curKey; if (d.music === false) { if (this.cur) this.fadeOut(this.cur); this.cur = null; } else if (k) { this.curKey = null; this.music(k); } return d.music; }
  toggleHaptic() { const d = load(); d.haptic = d.haptic === false; save(); return d.haptic; }
}
export const audio = new AudioManager();
