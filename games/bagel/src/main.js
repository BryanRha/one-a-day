// 시작: 렌더러 · 직각 투영 카메라(쿼터뷰) · 저장 불러오기 · 쉬는 동안 번 돈 · 루프
import * as THREE from 'three';
import { Game } from './game.js?v=0.59.0';
import { UI, IN } from './ui.js?v=0.59.0';
import { S, loadSave, save } from './state.js?v=0.59.0';
import { BRANCHES, MENU } from './data.js?v=0.59.0';
import { music, setAudio, preloadSfx } from './audio.js?v=0.59.0';
import { installBack } from './oad.js?v=0.59.0';

const app = {}; window.__app = app; import("./state.js?v=0.59.0").then(m => { window.__S = () => m.S; });
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
const fit = () => { const w = innerWidth, h = innerHeight, S2 = w / h < 0.8 ? 900 : 560; r.setSize(w, h, false); cam.left = -S2 * w / h; cam.right = S2 * w / h; cam.top = S2; cam.bottom = -S2; cam.updateProjectionMatrix(); };
addEventListener('resize', fit); fit();
loadSave(); setAudio(S.set); preloadSfx();
app.goBranch = i => { const prev = S.bi; if (S.branch[prev]) S.branch[prev].idleAt = Date.now(); S.bi = i; save(true); app.game.build(i); app.ui.progress(); };
app.game = new Game(sc, cam, null); app.ui = new UI(app); app.game.ui = app.ui; app.game.build(S.bi); app.ui.progress();
// 쉬는 동안 번 돈 (계산원 + 제빵사가 있으면 · 최대 2시간)
const st = S.branch[S.bi]?.staff || [], away = (Date.now() - S.last) / 1000;
if (st.includes('cashier') && st.includes('baker') && away > 120) { const v = Math.round(Math.min(away, 7200) * 0.9 * (BRANCHES[S.bi].mult) * (1 + (S.branch[S.bi].unl.length / 10))); setTimeout(() => app.ui.offline(v), 600); }
installBack({ back: () => { if (document.querySelector('#modal').firstChild) { app.ui.close(); return true; } return false; } });
music(S.bi % 2 ? 'shop2' : 'shop');
let last = performance.now();
const q = new URLSearchParams(location.search), SPEED = +(q.get('speed') || 1); if (q.get('fresh')) { localStorage.removeItem('marumi_v1'); q.delete('fresh'); location.replace(location.pathname + '?' + q.toString()); }
if (q.get('bot')) import('./bot.js?v=0.59.0').then(m => m.startBot(app));
const loop = now => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; for (let i = 0; i < SPEED; i++) app.game.update(dt, IN); r.render(sc, cam); };
requestAnimationFrame(loop); setInterval(() => save(), 5000); addEventListener('pagehide', () => save(true));
setTimeout(() => document.getElementById('boot').classList.add('off'), q.get('bot') ? 0 : 1600); window.done = 1;
