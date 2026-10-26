import { W, BASE_H, setH } from './config.js?v=0.57.1';
import { audio } from './audio.js?v=0.57.1';
import { WindFX } from './fx.js?v=0.57.1';
import { BootScene } from './scenes/Boot.js?v=0.57.1';
import { LobbyScene } from './scenes/Lobby.js?v=0.57.1';
import { PlayScene } from './scenes/Play.js?v=0.57.1';
import { ResultScene } from './scenes/Result.js?v=0.57.1';
import { installBack } from './oad.js?v=0.57.1';

async function start() {
  try { await document.fonts.load('48px Jua'); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#1E2A52',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 }, fps: { target: 60 },
    pipeline: { WindFX },
    scene: [BootScene, LobbyScene, PlayScene, ResultScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
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
  installBack(game, { home: 'Lobby', roots: [] });   // One a Day 뒤로가기: 한 단계씩
}
// One a Day 앱 안(iframe)에서는 앱이 캐시를 관리하므로 자체 서비스 워커는 쓰지 않음
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
