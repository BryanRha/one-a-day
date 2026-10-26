// 전투 화면 정보 (DOM): 체력·분노 · 스테이지/웨이브 · 보스 체력 · 콤보 · 데미지 숫자 · 조이스틱 · 공격/스킬/회피 버튼 · 알림 글자
import { IN, joystick, holdButton } from './input.js?v=0.61.1';
import { SKILLS, SKILL_SLOTS } from './data.js?v=0.61.1';
import { toScreen } from './engine.js?v=0.61.1';
import { icons } from './icons.js?v=0.61.1';

/* 화면 요소 찾기: 같은 것은 한 번만 찾아 기억 (매 프레임 다시 찾지 않게 — REA 실행 분석으로 찾은 낭비) */
let Q = {}; const $ = (s, r) => r ? r.querySelector(s) : (Q[s] && Q[s].isConnected ? Q[s] : (Q[s] = document.querySelector(s)));
export const H = { el: null, nums: [], numI: 0 };
const fmt = n => Math.round(n).toLocaleString('en-US');
export function buildHud(o) {
  Q = {}; const el = $('#hud'); el.innerHTML = `
  <div class="h-top"><div class="h-face" style="background-image:url(${icons.face || ''})"></div><div class="h-bars"><div class="h-lv"><b id="hLv">Lv.1</b> <span id="hName">카일</span><span class="h-cp" id="hCp"></span></div>
    <div class="bar hp"><i id="hHpL"></i><i id="hHp"></i><span id="hHpT"></span></div><div class="bar rage"><i id="hRage"></i></div></div>
    <div class="h-tr"><button class="h-btn" id="hPause">${PAUSE}</button><button class="h-auto" id="hAuto">AUTO</button></div></div>
  <div class="h-stage"><b id="hStage"></b><span id="hWave"></span><em id="hTime"></em></div>
  <div class="h-boss" id="hBoss"><div class="h-bname"><b id="hBossN"></b><span id="hBossX"></span></div><div class="bar boss"><i id="hBossL"></i><i id="hBossHp"></i></div><div class="bar stag"><i id="hStag"></i></div></div>
  <div class="h-combo" id="hCombo"><b id="hComboN">0</b><span>HITS</span></div>
  <div class="h-msg" id="hMsg"></div><div class="h-go" id="hGo">${GO}</div>
  <div class="h-joy" id="hJoy"><div class="joy-base" id="hJB"><div class="joy-knob" id="hJK"></div></div><div class="joy-hint">이동</div></div>
  <div class="h-btns">
    <div class="b-atk" id="bAtk"><img src="${icons.atk || ''}"><span>공격</span></div>
    ${SKILL_SLOTS.map((k, i) => `<div class="b-sk s${i}" id="bSk${i}"><img src="${icons[k] || ''}"><s></s><em></em><span>${SKILLS[k].name}</span></div>`).join('')}
    <div class="b-ev" id="bEv">${EV}<s></s></div>
    <div class="b-ult" id="bUlt"><img src="${icons.ult || ''}"><s></s><span>분노</span></div>
  </div>
  <div class="h-low" id="hLow"></div>`;
  H.el = el; H.o = o;
  joystick($('#hJoy'), $('#hJB'), $('#hJK'));
  holdButton($('#bAtk'), () => { IN.atk = true; IN.atkTap++; }, () => { IN.atk = false; });
  SKILL_SLOTS.forEach((k, i) => holdButton($('#bSk' + i), () => { IN.skill[i]++; }));
  holdButton($('#bEv'), () => { IN.evade++; }); holdButton($('#bUlt'), () => { IN.ult++; });
  $('#hPause').onclick = () => o.pause(); $('#hAuto').onclick = () => o.auto();
  const fx = $('#fxlayer'); fx.innerHTML = ''; H.nums = []; for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.className = 'dmg'; fx.append(d); H.nums.push({ d, t: 9, x: 0, y: 0, p: null }); }
  H.combo = 0; H.comboT = 0; el.classList.add('show');
}
export function hideHud() { const el = $('#hud'); el.classList.remove('show'); el.innerHTML = ''; $('#fxlayer').innerHTML = ''; }
const PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const GO = '<svg viewBox="0 0 64 64"><path d="M32 6 L54 30 H40 V58 H24 V30 H10 Z"/></svg><span>GO</span>';
const EV = '<svg viewBox="0 0 48 48"><path d="M10 30c4-12 16-18 28-14l-3-6 9 9-12 4 3-5c-9-2-17 2-21 12z"/><circle cx="16" cy="36" r="3"/></svg><span>회피</span>';

export function hudPlayer(p) {
  const r = p.hp / p.maxHp; $('#hHp').style.width = (r * 100) + '%'; const l = $('#hHpL'); if (parseFloat(l.style.width || 100) < r * 100) l.style.width = (r * 100) + '%'; else l.style.width = (r * 100) + '%';
  $('#hHpT').textContent = fmt(Math.max(0, p.hp)) + ' / ' + fmt(p.maxHp); $('#hRage').style.width = p.rage + '%'; $('#bUlt').classList.toggle('ready', p.rage >= 100);
  $('#hLow').classList.toggle('on', r < 0.3);
  SKILL_SLOTS.forEach((k, i) => { const b = $('#bSk' + i), cd = p.cd[k] || 0, max = SKILLS[k].cd; (b._s ||= b.querySelector('s')).style.setProperty('--c', (cd > 0 ? cd / max * 100 : 0) + '%'); (b._e ||= b.querySelector('em')).textContent = cd > 0 ? Math.ceil(cd) : ''; b.classList.toggle('cool', cd > 0); });
  const ev = $('#bEv'); ev.classList.toggle('cool', p.evCd > 0);
}
export function hudInfo(stage, wave, time, lv, cp) {
  $('#hStage').textContent = stage; $('#hWave').textContent = wave; $('#hTime').textContent = time; $('#hLv').textContent = 'Lv.' + lv; if (cp) $('#hCp').textContent = '⚔ ' + fmt(cp);
}
export function hudAuto(on) { $('#hAuto').classList.toggle('on', on); }
export function hudBoss(b) {
  const el = $('#hBoss'); if (!b) { el.classList.remove('on'); return; } el.classList.add('on'); $('#hBossN').textContent = b.def.name;
  const r = Math.max(0, b.hp / b.maxHp); $('#hBossHp').style.width = r * 100 + '%'; $('#hBossL').style.width = r * 100 + '%'; $('#hStag').style.width = Math.min(100, b.stag / b.stagMax * 100) + '%';
  $('#hBossX').textContent = b.st === 'stun' ? '그로기!' : b.enraged ? '분노' : '';
}
export function hudCombo(n) { H.combo = n; const el = $('#hCombo'); if (n < 2) { el.classList.remove('on'); return; } $('#hComboN').textContent = n; el.classList.add('on'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
let msgT = null;
export function hudMsg(t, cls = '', ms = 1400) { const el = $('#hMsg'); el.className = 'h-msg on ' + cls; el.innerHTML = t; clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), ms); }
export function hudGo(on) { $('#hGo').classList.toggle('on', on); }
// 데미지 숫자: 3D 위치를 매 프레임 화면에 맞춤
export function dmgNum(pos, n, kind = '') {
  const s = H.nums[H.numI++ % H.nums.length]; s.p = pos.clone(); s.p.x += (Math.random() - 0.5) * 70; s.p.y += Math.random() * 40; s.t = 0; s.d.className = 'dmg ' + kind; s.d.textContent = kind === 'heal' ? '+' + fmt(n) : kind === 'miss' ? n : fmt(n);
  void s.d.offsetWidth; s.d.classList.add('go');
}
const _o = {};
export function updateNums(dt) {
  for (const s of H.nums) { if (s.t > 1.1 || !s.p) continue; s.t += dt; s.p.y += dt * 60; toScreen(s.p, _o); s.d.style.transform = `translate(${_o.x}px,${_o.y}px)`; if (s.t > 1.1) { s.d.className = 'dmg'; s.p = null; } }
}
