// 조작: 왼쪽 아래 어디든 누르면 생기는 조이스틱 · 키보드(WASD/방향키 · J 공격 · K 회피 · U I O L 스킬 · 스페이스 분노)
export const IN = { x: 0, y: 0, atk: false, atkTap: 0, evade: 0, skill: [0, 0, 0, 0], ult: 0, active: false };
const keys = new Set();
export function bindKeys() {
  addEventListener('keydown', e => { if (e.repeat) { if (e.code === 'KeyJ') IN.atk = true; return; } keys.add(e.code);
    if (e.code === 'KeyJ') { IN.atk = true; IN.atkTap++; } if (e.code === 'KeyK' || e.code === 'ShiftLeft') IN.evade++; if (e.code === 'Space') IN.ult++;
    const si = ['KeyU', 'KeyI', 'KeyO', 'KeyL'].indexOf(e.code); if (si >= 0) IN.skill[si]++; });
  addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'KeyJ') IN.atk = false; });
}
export function keyAxis() {
  let x = 0, y = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) x--; if (keys.has('KeyD') || keys.has('ArrowRight')) x++; if (keys.has('KeyW') || keys.has('ArrowUp')) y--; if (keys.has('KeyS') || keys.has('ArrowDown')) y++;
  const l = Math.hypot(x, y); return l ? [x / l, y / l] : null;
}
// 조이스틱 (el: 누를 수 있는 영역 · knob 표시)
export function joystick(area, base, knob) {
  let id = null, cx = 0, cy = 0; const R = 56;
  const down = e => { if (id !== null) return; const t = e.changedTouches ? e.changedTouches[0] : e; id = e.changedTouches ? t.identifier : 'm'; const r = area.getBoundingClientRect(); cx = t.clientX - r.left; cy = t.clientY - r.top;
    base.style.transform = `translate(${cx - 60}px,${cy - 60}px)`; base.classList.add('on'); knob.style.transform = 'translate(0,0)'; IN.active = true; e.preventDefault(); };
  const move = e => { if (id === null) return; const t = e.changedTouches ? [...e.changedTouches].find(q => q.identifier === id) : e; if (!t) return; const r = area.getBoundingClientRect(); let dx = t.clientX - r.left - cx, dy = t.clientY - r.top - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; } IN.x = dx / R; IN.y = dy / R; if (l < 8) IN.x = IN.y = 0; knob.style.transform = `translate(${dx}px,${dy}px)`; e.preventDefault(); };
  const up = e => { if (id === null) return; if (e.changedTouches && ![...e.changedTouches].some(q => q.identifier === id)) return; id = null; IN.x = IN.y = 0; IN.active = false; base.classList.remove('on'); knob.style.transform = 'translate(0,0)'; };
  area.addEventListener('touchstart', down, { passive: false }); area.addEventListener('touchmove', move, { passive: false }); area.addEventListener('touchend', up); area.addEventListener('touchcancel', up);
  area.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
  return () => { id = null; IN.x = IN.y = 0; IN.active = false; base.classList.remove('on'); };
}
// 버튼: 누름(탭) · 누르고 있기
export function holdButton(el, on, off) {
  const d = e => { e.preventDefault(); e.stopPropagation(); el.classList.add('press'); on(); }, u = e => { el.classList.remove('press'); off && off(); };
  el.addEventListener('touchstart', d, { passive: false }); el.addEventListener('touchend', u); el.addEventListener('touchcancel', u); el.addEventListener('mousedown', d); el.addEventListener('mouseup', u); el.addEventListener('mouseleave', u);
}
export function resetInput() { IN.x = IN.y = 0; IN.atk = false; IN.atkTap = 0; IN.evade = 0; IN.skill = [0, 0, 0, 0]; IN.ult = 0; }
