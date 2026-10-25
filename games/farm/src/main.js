import { W, BASE_H, setH, VERSION } from './config.js?v=0.50.2';
import { audio } from './audio.js?v=0.50.2';
import { BootScene } from './scenes/Boot.js?v=0.50.2';
import { TownScene } from './scenes/Town.js?v=0.50.2';
import { HudScene } from './scenes/Hud.js?v=0.50.2';
import { MineScene, MiniScene, PeopleScene, EventsScene, IslandScene, CoopScene } from './scenes/Extra.js?v=0.50.2';
import { installBack } from './oad.js?v=0.50.2';
import { installNav } from './nav.js?v=0.50.2';

// 오류 알림: 같은 오류는 한 번만 · 최근 5개는 저장 (thefarm_err)
const seen = new Set();
function report(err, where) { const msg = String(err && err.message || err).slice(0, 160), key = where + msg; if (seen.has(key)) return; seen.add(key);
  const stack = String(err && err.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 500); console.warn('오류', where, msg, stack);
  try { const L = JSON.parse(localStorage.getItem('thefarm_err') || '[]'); L.unshift({ t: new Date().toISOString(), v: VERSION, where, msg, stack }); localStorage.setItem('thefarm_err', JSON.stringify(L.slice(0, 5))); } catch { /* */ }
  let box = document.getElementById('errbox'); if (!box) { box = document.createElement('div'); box.id = 'errbox'; box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99;background:rgba(160,20,20,.92);color:#fff;font:12px/1.4 sans-serif;padding:8px 10px;border-radius:10px;white-space:pre-wrap;word-break:break-all'; box.onclick = () => box.remove(); document.body.appendChild(box); }
  box.textContent = `⚠ 오류가 났어요 (v${VERSION} · ${where}) — 이 화면을 캡처해 보내 주세요 · 누르면 닫혀요\n${msg}\n${stack.slice(0, 300)}`; }
addEventListener('error', e => report(e.error || e.message, 'window')); addEventListener('unhandledrejection', e => report(e.reason, 'promise'));

async function start() {
  installNav();
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#7CC26A',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [BootScene, TownScene, HudScene, MineScene, MiniScene, PeopleScene, EventsScene, IslandScene, CoopScene],
  });
  // 근본 대책: 그림이 지워질 때 그 그림에 걸린 애니메이션(tween)도 함께 지움
  //   (지워진 그림을 애니메이션이 계속 고치려다 매 프레임 오류 → 화면 멈춤 · v0.9.1 꾹 누르기 원에서 실제로 남)
  const goDestroy = Phaser.GameObjects.GameObject.prototype.destroy;
  Phaser.GameObjects.GameObject.prototype.destroy = function (fromScene) { try { const tw = this.scene && this.scene.sys && this.scene.sys.tweens; if (tw && !fromScene) tw.killTweensOf(this); } catch { /* */ } return goDestroy.call(this, fromScene); };
  // 오류가 나도 멈추지 않게: 장면마다 따로 막아서(한 장면 오류가 화면 그리기까지 막지 않게) · 오류는 화면 위에 보여 주고 저장
  const sysStep = Phaser.Scenes.Systems.prototype.step;
  Phaser.Scenes.Systems.prototype.step = function (t, d) { try { sysStep.call(this, t, d); } catch (err) { report(err, this.settings && this.settings.key); } };
  const step = game.step;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { report(err, 'game'); try { const r = this.renderer; r.preRender(); this.scene.render(r); r.postRender(); } catch { /* */ } } };
  audio.attach(game); setH(game.scale.height); game.scale.on('resize', gs => setH(gs.height));
  // 화면이 넓어지면(폴더블 펼침 · 가로 회전) EXPAND 가 가로로 늘어나 화면이 왼쪽으로 쏠림
  //   → 넓을 땐 지금까지의 세로 길이 그대로 FIT(가운데 정렬), 다시 길어지면 EXPAND
  let tallH = game.scale.height;
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / W;
    if (tall) { if (sm.scaleMode !== Phaser.Scale.EXPAND) { sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(Phaser.Scale.EXPAND); sm.setGameSize(W, BASE_H); } }
    else if (sm.scaleMode !== Phaser.Scale.FIT || sm.width !== W) { sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(W, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND) tallH = sm.height; };
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  installBack(game, { home: 'Town', roots: ['Hud'] });
}
start();
