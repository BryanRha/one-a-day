// 순위표 창 (전쟁실 · 오늘의 작전)
import { T, C, btn, popup } from './pui.js?v=0.42.0';
import { top, nick, askNick, submit, rankOn } from './rank.js?v=0.42.0';

export function rankPopup(scene, board, title, show = r => `${r.score}점`) {
  const p = popup(scene, title, 920, 1300);
  const wait = T(scene, 0, -300, '불러오는 중…', 30, C.sub, { w: 800 }); p.content.add(wait);
  top(board, 15).then(rows => {
    if (!p.active) return; wait.destroy();
    if (!rows) return p.content.add(T(scene, 0, -300, '순위표에 연결할 수 없어요', 30, C.pink, { w: 800 }));
    if (!rows.length) p.content.add(T(scene, 0, -300, '아직 기록이 없어요 · 첫 번째가 되어 보세요!', 28, C.sub, { w: 800 }));
    rows.forEach((r, i) => {
      const y = -460 + i * 66, me = r.name === nick(), col = i === 0 ? C.gold : me ? '#9BE07A' : C.text;
      if (me) { const g = scene.add.graphics(); g.fillStyle(0x9BE07A, 0.12).fillRoundedRect(-400, y - 28, 800, 56, 14); p.content.add(g); }
      p.content.add(T(scene, -360, y, `${i + 1}`, 30, col, { w: 900 }));
      p.content.add(T(scene, -300, y, r.name, 30, col, { ox: 0, w: 800 }));
      p.content.add(T(scene, 380, y, show(r), 28, col, { ox: 1, w: 800 }));
    });
  });
  p.content.add(T(scene, -380, 560, `내 별명: ${nick() || '없음'}`, 26, C.sub, { ox: 0, w: 800 }));
  p.content.add(btn(scene, 260, 560, 260, 76, '별명 바꾸기', () => askNick(() => { p.close(); rankPopup(scene, board, title, show); }), { style: 'ghost', size: 24 }));
  return p;
}
// 기록 올리기: 별명이 없으면 먼저 물어봄
export function postScore(board, score, extra, then) {
  if (!rankOn()) return;
  const go = () => submit(board, score, extra).then(ok => then && then(ok));
  if (!nick()) askNick(go); else go();
}
