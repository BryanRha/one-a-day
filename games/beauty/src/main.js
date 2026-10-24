import { W, BASE_H, setH } from './config.js?v=0.38.0';
import { audio } from './audio.js?v=0.38.0';
import { BootScene } from './scenes/Boot.js?v=0.38.0';
import { HomeScene } from './scenes/Home.js?v=0.38.0';
import { BoardScene } from './scenes/Board.js?v=0.38.0';
import { StoryScene } from './scenes/Story.js?v=0.38.0';
import { SeasonScene } from './scenes/Season.js?v=0.38.0';
import { ShopScene } from './scenes/Shop.js?v=0.38.0';
import { AlbumScene } from './scenes/Album.js?v=0.38.0';
import { MiniScene } from './scenes/Mini.js?v=0.38.0';
import { installBack } from './oad.js?v=0.38.0';
import { installNav } from './nav.js?v=0.38.0';

async function start() {
  installNav();
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#FBEFE8',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [BootScene, HomeScene, BoardScene, StoryScene, SeasonScene, ShopScene, AlbumScene, MiniScene],
  });
  const step = game.step; let errN = 0;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { if (errN++ < 5) console.warn('프레임 오류', String(err && err.stack || err).slice(0, 400)); } };
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
  installBack(game, { home: 'Home', roots: [] });
}
start();
