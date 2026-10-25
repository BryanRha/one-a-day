// One a Day 연동 (모든 게임 공통 파일 — 같은 내용을 각 게임 src/oad.js 로 복사해 씀)
// · 뒤로가기: 앱이 { type: 'oad:back' } 를 보내면 → 열린 팝업 닫기 → 화면별 처리(onBack) → 첫 화면이 아니면 첫 화면으로
//   처리했으면 handled: true, 게임 첫 화면이라 더 갈 곳이 없으면 false (→ 앱이 게임을 닫고 원어데이로)
// · 원어데이로 버튼: exitToOAD()
export const inOAD = (() => { try { return window.parent !== window; } catch { return true; } })();
export const exitToOAD = () => { try { window.parent.postMessage({ type: 'oad:exit' }, '*'); } catch { /* */ } };

const stack = [];   // 열린 팝업마다 { back } — 위에 있는 것부터 처리
// 팝업을 열 때 등록, 닫힐 때 해제 (back: 처리했으면 true)
export function pushBack(back) { const e = { back }; stack.push(e); return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); }; }

export function installBack(game, { home, roots = [] }) {
  // 원어데이에 '뒤로가기를 직접 처리하는 게임'이라고 알림 → 앱이 응답을 넉넉히 기다림 (무거운 화면에서 늦게 답해도 게임이 닫히지 않게)
  try { window.parent.postMessage({ type: 'oad:ready', back: true }, '*'); } catch { /* */ }
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'oad:back') return;
    let handled = false;
    try { handled = goBack(game, home, roots); } catch (err) { console.warn(err); handled = false; }
    try { window.parent.postMessage({ type: 'oad:back-result', handled }, '*'); } catch { /* */ }
  });
  // 폰의 뒤로가기를 게임 안에서 바로 받기 (CloseWatcher: 안드로이드 크롬 120+) — 방문 기록을 쓰지 않아 앱이 꺼지지 않음
  //   처리했으면 다시 받을 준비 · 게임 첫 화면이면 원어데이로 나가기
  if (inOAD && 'CloseWatcher' in window) {
    let w = null;
    const arm = () => { if (w) return; try { w = new CloseWatcher(); w.onclose = () => { w = null; let h = false; try { h = goBack(game, home, roots); } catch { h = false; } if (h) arm(); else exitToOAD(); }; } catch { w = null; } };
    arm(); addEventListener('pointerdown', arm, true);   // 터치할 때마다 빠진 받침을 채움
  }
}
export function goBack(game, home, roots) {
  // 1) 열린 팝업 (위에서부터)
  while (stack.length) { const top = stack[stack.length - 1]; if (top.back() !== false) return true; stack.pop(); }
  // 2) 지금 화면이 직접 처리 (게임 중 → 일시정지 등)
  const live = game.scene.getScenes(true).filter(s => s.scene.key !== 'Boot');
  const sc = live[live.length - 1]; if (!sc) return false;
  if (typeof sc.onBack === 'function') { const r = sc.onBack(); if (r !== undefined) return r; }
  // 3) 첫 화면이면 원어데이로, 아니면 첫 화면으로
  if (sc.scene.key === home || roots.includes(sc.scene.key)) return false;
  live.forEach(s => s.scene.stop()); game.scene.start(home);
  return true;
}
