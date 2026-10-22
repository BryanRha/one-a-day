import { W, BASE_H, setH } from './config.js?v=0.21.0';
import { audio } from './audio.js?v=0.21.0';
import { BootScene } from './scenes/Boot.js?v=0.21.0';
import { LibraryScene } from './scenes/Library.js?v=0.21.0';
import { StoryScene } from './scenes/Story.js?v=0.21.0';
import { HuntScene } from './scenes/Hunt.js?v=0.21.0';
import { EvidenceScene } from './scenes/Evidence.js?v=0.21.0';
import { ToonScene } from './scenes/Toon.js?v=0.21.0';
import { installBack } from './oad.js?v=0.21.0';

async function start() {
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#2E1A2A',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [BootScene, LibraryScene, StoryScene, HuntScene, EvidenceScene, ToonScene],
  });
  const step = game.step; let errN = 0;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { if (errN++ < 5) console.warn('프레임 오류', String(err && err.stack || err).slice(0, 400)); } };
  audio.attach(game); setH(game.scale.height); game.scale.on('resize', gs => setH(gs.height));
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(() => game.scale.refresh(), ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  installBack(game, { home: 'Library', roots: [] });
}
start();
