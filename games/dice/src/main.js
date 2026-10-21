import { W, BASE_H, setH } from './config.js?v=0.15.0';
import { audio } from './audio.js?v=0.15.0';
import { WindFX } from './fx.js?v=0.15.0';
import { BootScene } from './scenes/Boot.js?v=0.15.0';
import { HomeScene } from './scenes/Home.js?v=0.15.0';
import { AltarScene } from './scenes/Altar.js?v=0.15.0';
import { RoadScene } from './scenes/Road.js?v=0.15.0';
import { ArcadeScene } from './scenes/Arcade.js?v=0.15.0';
import { DeckScene } from './scenes/Deck.js?v=0.15.0';
import { PlayScene } from './scenes/Play.js?v=0.15.0';
import { ResultScene } from './scenes/Result.js?v=0.15.0';
import { installBack } from './oad.js?v=0.15.0';

async function start() {
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#05061A',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 }, fps: { target: 60 },
    pipeline: { WindFX },
    scene: [BootScene, HomeScene, DeckScene, AltarScene, RoadScene, ArcadeScene, PlayScene, ResultScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(() => game.scale.refresh(), ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  installBack(game, { home: 'Home', roots: [] });   // One a Day 뒤로가기: 한 단계씩
}
// One a Day 앱 안(iframe)에서는 앱이 캐시를 관리하므로 자체 서비스 워커는 쓰지 않음
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
