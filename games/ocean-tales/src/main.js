import { W, BASE_H, setH } from './config.js?v=0.26.1';
import { audio } from './audio.js?v=0.26.1';
import { BootScene } from './scenes/Boot.js?v=0.26.1';
import { TitleScene } from './scenes/Title.js?v=0.26.1';
import { MapScene } from './scenes/Map.js?v=0.26.1';
import { GameScene } from './scenes/Game.js?v=0.26.1';
import { WorldClearScene } from './scenes/WorldClear.js?v=0.26.1';
import { ReefScene } from './scenes/Reef.js?v=0.26.1';
import { installBack } from './oad.js?v=0.26.1';

async function start() {
  try { await document.fonts.load('48px Jua'); } catch { /* 폰트 실패 시 기본 폰트 */ }
  document.getElementById('boot')?.remove();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: BASE_H,
    backgroundColor: '#BDEBFF',
    transparent: false,
    // 세로로 긴 화면은 아래위를 넓혀 꽉 채우고(EXPAND), 가로로 넓은 화면은 9:16 으로 맞춤(FIT)
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 1 },
    scene: [BootScene, TitleScene, MapScene, GameScene, WorldClearScene, ReefScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  // 화면 회전: 브라우저가 회전 직후 예전 크기를 알려 주는 경우가 있어서, 잠시 뒤 몇 번 더 크기를 다시 잰다
  // (안 그러면 가로→세로로 돌아와도 가로 크기에 머무름)
  // 화면이 넓어지면(폴더블 펼침 · 가로 회전) EXPAND 가 가로로 늘어나 화면이 왼쪽으로 쏠림
  //   → 넓을 땐 지금까지의 세로 길이 그대로 FIT(가운데 정렬), 다시 길어지면 EXPAND
  let tallH = game.scale.height;
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / W;
    if (tall) { if (sm.scaleMode !== Phaser.Scale.EXPAND) { sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(Phaser.Scale.EXPAND); sm.setGameSize(W, BASE_H); } }
    else if (sm.scaleMode !== Phaser.Scale.FIT || sm.width !== W) { sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(W, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND) tallH = sm.height; };
  const refresh = () => [60, 250, 600, 1200].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh);
  addEventListener('orientationchange', refresh);
  screen.orientation?.addEventListener?.('change', refresh);
  window.__game = game; // 디버그용
  installBack(game, { home: 'Map', roots: ['Title'] });   // One a Day 뒤로가기: 한 단계씩
}

// 홈 화면 추가(앱 설치): 크롬·삼성 인터넷은 설치 창을 띄울 수 있게 이벤트를 보관해 둔다
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
window.addEventListener('appinstalled', () => { window.__installPrompt = null; window.__installed = true; });
// One a Day 앱 안에서 실행될 때(iframe)는 앱이 캐시를 관리하므로 게임 자체 서비스 워커는 쓰지 않음
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

start();
