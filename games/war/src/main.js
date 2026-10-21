import { W, BASE_H, setH } from './config.js?v=0.17.0';
import { audio } from './audio.js?v=0.17.0';
import { BootScene } from './scenes/Boot.js?v=0.17.0';
import { HomeScene } from './scenes/Home.js?v=0.17.0';
import { BriefScene } from './scenes/Brief.js?v=0.17.0';
import { PlayScene } from './scenes/Play.js?v=0.17.0';
import { ResultScene } from './scenes/Result.js?v=0.17.0';
import { StoryScene } from './scenes/Story.js?v=0.17.0';
import { EditorScene } from './scenes/Editor.js?v=0.17.0';
import { installBack } from './oad.js?v=0.17.0';

async function start() {
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#1E2010',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 }, fps: { target: 60 },
    scene: [BootScene, HomeScene, BriefScene, PlayScene, ResultScene, EditorScene, StoryScene],
  });
  // 안전망: 한 프레임에서 오류가 나도 게임 전체가 멈추지 않게 (requestAnimationFrame 이 끊기지 않도록)
  const step = game.step; let errN = 0;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { if (errN++ < 5) console.warn('프레임 오류', err); } };
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(() => game.scale.refresh(), ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  installBack(game, { home: 'Home', roots: [] });   // One a Day 뒤로가기: 한 단계씩
}
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
