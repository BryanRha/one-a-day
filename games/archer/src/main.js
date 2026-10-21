import { W, BASE_H, setH } from './config.js?v=0.17.3';
import { audio } from './audio.js?v=0.17.3';
import { BootScene } from './scenes/Boot.js?v=0.17.3';
import { HomeScene } from './scenes/Home.js?v=0.17.3';
import { PlayScene } from './scenes/Play.js?v=0.17.3';
import { ResultScene } from './scenes/Result.js?v=0.17.3';
import { installBack } from './oad.js?v=0.17.3';

async function start() {
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#0B0D1E',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 }, fps: { target: 60 },
    scene: [BootScene, HomeScene, PlayScene, ResultScene],
  });
  // 안전망: 한 프레임에서 오류가 나도 게임 전체가 멈추지 않게
  const step = game.step; let errN = 0;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { if (errN++ < 5) console.warn('프레임 오류', String(err && err.stack || err).slice(0, 400)); } };
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(() => game.scale.refresh(), ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  installBack(game, { home: 'Home', roots: [] });
}
start();
