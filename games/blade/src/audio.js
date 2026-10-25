// 소리: 효과음(assets/audio/sfx_*.mp3, 여러 개면 무작위) · 배경음(bgm_*.mp3, 이어 재생) · 설정(켜기/끄기)
const SFX = { swing: 3, hit: 3, heavy: 2, hurt: 2, evade: 1, skill: 1, ult: 1, quake: 1, die: 2, bossdie: 1, coin: 1, roar: 1, spawn: 1, clear: 1, win: 1, death: 1, perfect: 1, stun: 1, eswing: 1, tap: 1, equip: 1, enhance: 1, fail: 1, reward: 1, levelup: 1, open: 1 };
/* mp3 로 만든 것 (나머지는 m4a) */
const HAS = new Set(['bgm_lobby', 'bgm_battle', 'bgm_boss', 'sfx_swing1', 'sfx_swing2', 'sfx_swing3', 'sfx_hit1', 'sfx_hit2', 'sfx_hit3', 'sfx_heavy1', 'sfx_heavy2', 'sfx_skill', 'sfx_eswing']);
let ctx = null, master = null, sfxG = null, bgmG = null; const buf = {}, loading = {}; let cur = null, curName = '', want = '';
export const AUD = { sfx: true, bgm: true };
function ac() { if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination); sfxG = ctx.createGain(); sfxG.gain.value = AUD.sfx ? 1 : 0; sfxG.connect(master); bgmG = ctx.createGain(); bgmG.gain.value = AUD.bgm ? 0.55 : 0; bgmG.connect(master); return ctx; }
export function unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); if (want && !cur) music(want); }
addEventListener('pointerdown', unlock, { capture: true }); addEventListener('keydown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
function get(name) { if (buf[name]) return Promise.resolve(buf[name]); const f = ext => fetch(`assets/audio/${name}.${ext}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject());
  return loading[name] ||= (HAS.has(name) ? f('mp3') : f('m4a')).then(a => new Promise((ok, no) => ac().decodeAudioData(a, ok, no))).then(b => (buf[name] = b)).catch(() => null); }
export function preloadSfx() { if (!ac()) return; for (const [k, n] of Object.entries(SFX)) for (let i = 1; i <= n; i++) get(`sfx_${k}${n > 1 ? i : ''}`); }
const lastT = {};
export function sfx(k, o = {}) {
  const c = ac(); if (!c || !AUD.sfx) return; const n = SFX[k] || 1, name = `sfx_${k}${n > 1 ? 1 + Math.floor(Math.random() * n) : ''}`;
  const now = c.currentTime; if (lastT[k] && now - lastT[k] < 0.03) return; lastT[k] = now;
  const b = buf[name]; if (!b) { get(name); return; }
  const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = o.rate || 1; const g = c.createGain(); g.gain.value = o.vol ?? 0.7; s.connect(g); g.connect(sfxG); s.start();
}
export function music(name) {
  want = name; const c = ac(); if (!c || name === curName) return; curName = name; const old = cur; cur = null;
  if (old) { old.g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => { try { old.s.stop(); } catch { /* */ } }, 1600); }
  if (!name) return;
  get('bgm_' + name).then(b => { if (!b || curName !== name) return; const s = c.createBufferSource(); s.buffer = b; s.loop = true; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, c.currentTime, 0.6); s.connect(g); g.connect(bgmG); s.start(); cur = { s, g }; });
}
export function setAudio(o) { Object.assign(AUD, o); if (sfxG) sfxG.gain.value = AUD.sfx ? 1 : 0; if (bgmG) bgmG.gain.value = AUD.bgm ? 0.55 : 0; }
