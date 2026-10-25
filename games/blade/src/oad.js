// One a Day 연동 (원어데이 공통 규칙을 이 게임 구조에 맞춤)
// · 뒤로가기: 앱이 { type: 'oad:back' } 를 보내면 → 열린 창 닫기 → 화면별 처리 → 첫 화면이면 handled: false (앱이 게임을 닫음)
// · 원어데이로 버튼: exitToOAD()
export const inOAD = (() => { try { return window.parent !== window; } catch { return true; } })();
export const exitToOAD = () => { try { window.parent.postMessage({ type: 'oad:exit' }, '*'); } catch { /* */ } };
const stack = [];
export function pushBack(back) { const e = { back }; stack.push(e); return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); }; }
export function installBack({ back }) {
  try { window.parent.postMessage({ type: 'oad:ready', back: true }, '*'); } catch { /* */ }
  const run = () => { while (stack.length) { const t = stack[stack.length - 1]; if (t.back() !== false) return true; stack.pop(); } return back(); };
  window.addEventListener('message', e => { if (!e.data || e.data.type !== 'oad:back') return; let h = false; try { h = run(); } catch (err) { console.warn(err); } try { window.parent.postMessage({ type: 'oad:back-result', handled: h }, '*'); } catch { /* */ } });
  if (inOAD && 'CloseWatcher' in window) { let w = null; const arm = () => { if (w) return; try { w = new CloseWatcher(); w.onclose = () => { w = null; let h = false; try { h = run(); } catch { h = false; } if (h) arm(); else exitToOAD(); }; } catch { w = null; } };
    arm(); addEventListener('pointerdown', arm, true); }
}
