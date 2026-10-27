// 지인 주소(0.63.1)용 기록 연결: 앱 코드는 그대로 두고 화면 동작만 지켜봄 → 테스트 서버로 익명 기록
//   게임 열기/닫기(플레이 시간) · 탭 이동 · 운세 · 유료 미리보기 · 결제 버튼 · 오류
import { start, track, trackError } from './track.js';
import { GAMES } from './catalog.js';
const idOf = folder => Object.keys(GAMES).find(k => (GAMES[k].path || '').includes(`games/${folder}/`)) || folder;   /* 폴더 이름 → 게임 id */
start('0.63.1');
let cur = null;
const player = document.getElementById('player');
if (player) new MutationObserver(() => {
  const f = document.getElementById('frame'), fd = f && (f.getAttribute('src') || '').match(/games\/([^/?]+)/)?.[1], id = fd && idOf(fd);
  if (f && id && (!cur || cur.f !== f)) { cur = { f, id, t: Date.now() }; track('game_start', { game: id });
    f.addEventListener('load', () => { try { const w = f.contentWindow; w.addEventListener('error', e => trackError('game:' + id, e.error || e.message)); w.addEventListener('unhandledrejection', e => trackError('game:' + id, e.reason)); } catch { /* 다른 주소 */ } }); }
  if (!f && cur) { track('game_end', { game: cur.id, sec: Math.round((Date.now() - cur.t) / 1000) }); cur = null; }
}).observe(player, { childList: true, subtree: true });
document.addEventListener('click', e => {
  const t = e.target.closest('#tabs button,[data-fortune],[data-paid],[data-buy]'); if (!t) return; const d = t.dataset;
  if (d.tab) track('tab', { tab: d.tab }); else if ('fortune' in d) track('fortune_view'); else if (d.paid) track('paid_click', { product: d.paid }); else if ('buy' in d) track('buy_click', { product: d.buy });
}, true);
addEventListener('message', e => { const d = e.data; if (d && d.type === 'oad:error' && cur) trackError('game:' + cur.id, d.msg); });
