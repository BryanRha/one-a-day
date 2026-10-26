// 화면 정보와 창: 돈 · 지점 진행 · 쿠폰 · 광고 ×2 · 미션 · 지점 지도 · 설정 · 열기 칸 글자 · +돈 글자 · 조이스틱
import * as THREE from 'three';
import { BRAND, GAME, BRANCHES, COUPON, MENU, UPGRADES, UP_MAX, upCost, BRANCH_INFO, FINISHED_RATE, STAFF, STAFF_UP } from './data.js?v=0.61.0';
import { S, save, couponReady, claimCoupon, MISSIONS, missionReady, claimMission, mult } from './state.js?v=0.61.0';
import { sfx, setAudio } from './audio.js?v=0.61.0';
import { pushBack, inOAD, exitToOAD } from './oad.js?v=0.61.0';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
export const IN = { x: 0, y: 0 };
const SLOT = 'marumi_slot_';
const slotInfo = n => { try { const v = JSON.parse(localStorage.getItem(SLOT + n) || 'null'); if (!v) return ''; const d = JSON.parse(v.d), t = new Date(v.at); return `${['1호점', '2호점', '3호점', '4호점'][d.bi || 0]} · 돈 ${fmt(d.coins || 0)} · ${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };
const ICON = { bagel: '🥯', cream: '🥯', coffee: '🥣', drink: '☕' }, SHORT = new Proxy({}, { get: (_, k) => MENU[k]?.short || '' });
export class UI {
  constructor(app) {
    this.app = app; this.boostUntil = 0; const h = $('#hud');
    h.innerHTML = `<div class="top"><div class="coin"><i class="c"></i><b id="cn">0</b></div><div class="lvl"><b id="bn"></b><em id="bl"></em><div class="pb"><s id="bp"></s></div></div></div>
      <div class="cp" id="cp"><b>🎟 매장 쿠폰까지</b><div class="pb"><s id="cpb"></s></div><span id="cpt"></span></div>
      <div class="side"><button class="sb ad" id="bAd"><b>×2</b><span id="adT">광고 보고</span></button><button class="sb up" id="bUp"><b>⬆</b>업그레이드<i class="dot" id="upDot"></i></button><button class="sb" id="bMs"><b>📋</b>미션<i class="dot" id="msDot"></i></button><button class="sb" id="bMap"><b>🗺</b>지점<i class="dot" id="mapDot"></i></button><button class="sb" id="bSet"><b>⚙</b>설정</button>${inOAD ? '<button class="sb" id="bExit"><b>↩</b>원어데이</button>' : ''}</div>
      <div class="joy" id="joy"><i id="knob"></i></div><div class="hint" id="hint">어디든 끌어서 움직여요</div>`;
    this.tags = $('#tags'); this.floats = $('#floats');
    $('#bAd').onclick = () => this.ad('boost'); $('#bUp').onclick = () => this.upgrades(); $('#bMs').onclick = () => this.missions(); $('#bMap').onclick = () => this.map(); $('#bSet').onclick = () => this.settings(); $('#cp').onclick = () => this.coupon();
    if ($('#bExit')) $('#bExit').onclick = () => exitToOAD();
    this.joy(); this.progress();
  }
  joy() {
    const area = $('#app'), base = $('#joy'), knob = $('#knob'); let id = null, cx = 0, cy = 0; const R = 50;
    const down = e => { if (e.target.closest('button, .modal, .cp')) return; const t = e.changedTouches ? e.changedTouches[0] : e; id = e.changedTouches ? t.identifier : 'm'; cx = t.clientX; cy = t.clientY; base.style.left = cx + 'px'; base.style.top = cy + 'px'; base.classList.add('on'); };
    const move = e => { if (id === null) return; const t = e.changedTouches ? [...e.changedTouches].find(q => q.identifier === id) : e; if (!t) return; let dx = t.clientX - cx, dy = t.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } IN.x = dx / R; IN.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; e.cancelable && e.preventDefault(); };
    const up = e => { if (id === null) return; if (e.changedTouches && ![...e.changedTouches].some(q => q.identifier === id)) return; id = null; IN.x = IN.y = 0; base.classList.remove('on'); knob.style.transform = ''; };
    area.addEventListener('touchstart', down, { passive: true }); area.addEventListener('touchmove', move, { passive: false }); area.addEventListener('touchend', up); area.addEventListener('touchcancel', up);
    area.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
    const keys = new Set(); addEventListener('keydown', e => { keys.add(e.code); kb(); }); addEventListener('keyup', e => { keys.delete(e.code); kb(); });
    const kb = () => { if (id !== null) return; let x = 0, y = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) x--; if (keys.has('KeyD') || keys.has('ArrowRight')) x++; if (keys.has('KeyW') || keys.has('ArrowUp')) y--; if (keys.has('KeyS') || keys.has('ArrowDown')) y++; const l = Math.hypot(x, y) || 1; IN.x = x / l; IN.y = y / l; };
  }
  bubble() { const d = document.createElement('div'); d.className = 'bub'; this.tags.append(d); return d; }
  tag() { const d = document.createElement('div'); d.className = 'tag lock'; this.tags.append(d); return d; }
  float(t, pos, cls) { const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = t; d._p = pos.clone(); d._t = 0; this.floats.append(d); }
  boost() { return Date.now() < this.boostUntil; }
  hint(t) { const h = $('#hint'); if (t) { h.textContent = t; h.classList.remove('off'); } else if (h.textContent !== '어디든 끌어서 움직여요') h.classList.add('off'); }
  frame(g) {
    $('#cn').textContent = fmt(S.coins); const cam = g.cam, W = innerWidth, H = innerHeight, v = new THREE.Vector3();
    for (const p of g.padList()) { v.set(p.s.x, 30, p.s.z).project(cam); p.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; p.tag.classList.toggle('can', S.coins > 0); }
    for (const d of [...this.floats.children]) { d._t += 1 / 60; d._p.y += 1.6; v.copy(d._p).project(cam); d.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; d.style.opacity = Math.max(0, 1 - d._t / 1.1); if (d._t > 1.1) d.remove(); }
    for (const c of g.cust) { if (!c.tag) continue; const o = c.order[0], left = o.n - o.got, show = (c.state === 'queue' || c.state === 'walkQ') && c.qi < 4; c.tag.style.display = show ? '' : 'none'; if (!show) continue;
      v.set(c.pos.x, 215, c.pos.z).project(cam); c.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; const html = `<b>${ICON[o.k]}</b><span>${SHORT[o.k]}</span><em>×${left}</em>`; if (c.tag._h !== html) { c.tag.innerHTML = html; c.tag._h = html; } c.tag.classList.toggle('front', c.qi === 0); }
    for (const cr of g.cars || []) { if (!cr.tag) continue; const show = cr.state === 'wait' || cr.state === 'in'; cr.tag.style.display = show ? '' : 'none'; if (!show) continue; v.set(cr.g.position.x, 190, cr.g.position.z).project(cam);
      cr.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; const html = Object.entries(cr.order).map(([k, n]) => `<b>${ICON[k]}</b><em>${n - (cr.got[k] || 0)}</em>`).join(' '); if (cr.tag._h !== html) { cr.tag.innerHTML = '🚗 ' + html; cr.tag._h = html; } }
    /* 손에 든 것 표시 (머리 위): 아이콘 · 이름 · 개수 · 가득 차면 MAX */
    const pl = g.pl, hl = (this._held ||= Object.assign(document.createElement('div'), { className: 'held' })); if (!hl.isConnected) this.tags.append(hl);
    if (pl.stack.length) { const k = pl.kind, nb = pl.stack.filter(x => x.m.userData.b).length, nm = k === 'trash' ? '쓰레기' : k === 'dough' ? (nb === pl.stack.length ? '데친 반죽' : '반죽') : k === 'bagel' && pl.stack.some(x => x.m.userData.prem) ? '쫄깃 베이글' : MENU[k]?.short || k;
      const ic = k === 'trash' ? '🗑' : k === 'dough' ? '⚪' : ICON[k] || ''; const full = pl.stack.length >= pl.cap; const html = `${ic} ${nm} <em>${full ? 'MAX' : pl.stack.length}</em>`; if (hl._h !== html) { hl.innerHTML = html; hl._h = html; hl.classList.toggle('trash', k === 'trash'); hl.classList.toggle('max', full); }
      v.set(pl.pos.x, 230 + pl.stack.length * 15, pl.pos.z).project(cam); hl.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; hl.style.display = ''; } else hl.style.display = 'none';
    const b = this.boostUntil - Date.now(); $('#adT').textContent = b > 0 ? `${Math.floor(b / 60000)}:${String(Math.floor(b / 1000) % 60).padStart(2, '0')}` : '광고 보고'; $('#bAd').classList.toggle('on', b > 0);
  }
  progress() {
    const g = this.app.game; if (!g || !g.unl) return; const B = BRANCHES[S.bi], all = B.slots.filter(s => !s.free).length, done = B.slots.filter(s => !s.free && g.unl.has(s.id)).length;
    $('#bn').textContent = B.name; $('#bl').textContent = `${done} / ${all}`; $('#bp').style.width = done / all * 100 + '%';
    const r = Math.min(1, S.sold / COUPON.goal); $('#cpb').style.width = r * 100 + '%'; $('#cpt').textContent = S.coupon ? '오늘 쿠폰 받았어요 · 눌러서 보기' : couponReady() ? '쿠폰 받기!' : `베이글 ${S.sold} / ${COUPON.goal}개 팔기`;
    $('#cp').classList.toggle('ready', couponReady()); $('#msDot').style.display = missionReady() ? 'block' : 'none'; $('#upDot').style.display = this.cheapUp() ? 'block' : 'none'; $('#mapDot') && ($('#mapDot').style.display = this.idleTotal() > 0 ? 'block' : 'none');
  }
  toast(t) { let el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 1800); }
  modal(html, onClose) { const m = $('#modal'), cur = m.querySelector('.modal'); if (cur && this._ub) { cur.innerHTML = html; this._oc = onClose; return m; }   /* 이미 열린 창은 내용만 바꿈 (깜빡임 없음) */
    m.innerHTML = `<div class="mback"><div class="modal">${html}</div></div>`; m.firstChild.onclick = e => { if (e.target === m.firstChild) this.close(); }; this._oc = onClose; this._ub = pushBack(() => { this.close(); return true; }); sfx('tap', { vol: 0.4 }); return m; }
  close() { $('#modal').innerHTML = ''; this._ub && this._ub(); this._ub = null; const f = this._oc; this._oc = null; f && f(); }
  // ── 쿠폰
  coupon() {
    if (S.coupon) return this.showCoupon(S.coupon);
    if (!couponReady()) return this.modal(`<h3>🎟 매장 쿠폰</h3><p>오늘 베이글을 <b>${COUPON.goal}개</b> 팔면<br>실제 ${BRAND.name} 매장에서 쓸 수 있는 쿠폰을 드려요.</p><div class="cpbig">${S.sold} / ${COUPON.goal}</div><p class="sm">${COUPON.text}</p><button class="btn" onclick="document.querySelector('#modal').innerHTML=''">계속 굽기</button>`);
    const c = claimCoupon(); sfx('reward'); this.showCoupon(c); this.progress();
  }
  showCoupon(c) { this.modal(`<div class="ticket"><small>${BRAND.name}</small><b>${COUPON.text}</b><div class="code">${c.code}</div><span>매장 직원에게 이 화면을 보여 주세요 · ${COUPON.valid}</span></div><button class="btn" id="mOk">확인</button>`); $('#mOk').onclick = () => this.close(); }
  // ── 광고 (지금은 시험용 화면 · 앱으로 낼 때 실제 광고로 바꿈)
  ad(kind, done) {
    if (kind === 'boost' && this.boost()) return this.toast('수익 2배가 이미 켜져 있어요');
    const what = kind === 'boost' ? '3분 동안 수익 2배' : kind === 'offline' ? '쉬는 동안 번 돈 2배' : '보상';
    this.modal(`<h3>📺 광고 보고 받기</h3><p><b>${what}</b></p><div class="adbox" id="adbox"><span>광고 (시험용)</span><em id="adc">3</em></div><button class="btn ghost" id="adNo">그만두기</button>`);
    let n = 3; const tm = setInterval(() => { n--; const e = $('#adc'); if (e) e.textContent = n; if (n <= 0) { clearInterval(tm); this.close(); sfx('reward'); if (kind === 'boost') { this.boostUntil = Date.now() + 180000; this.toast('3분 동안 수익 2배!'); } done && done(); } }, 1000);
    $('#adNo').onclick = () => { clearInterval(tm); this.close(); };
  }
  missions() {
    const html = MISSIONS.map(m => { const v = Math.min(m.goal, S.miss[m.id] || 0), d = S.missDone[m.id], ok = v >= m.goal; return `<div class="ms ${d ? 'done' : ''}"><div><b>${m.name}</b><div class="pb"><s style="width:${v / m.goal * 100}%"></s></div><em>${fmt(v)} / ${fmt(m.goal)}</em></div><button class="btn sm ${ok && !d ? '' : 'off'}" data-m="${m.id}">${d ? '완료' : `<i class="c"></i>${fmt(m.coins * mult())}`}</button></div>`; }).join('');
    const m = this.modal(`<h3>📋 오늘의 미션</h3>${html}<button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const v = claimMission(b.dataset.m); if (v) { sfx('reward'); this.toast(`+${fmt(v)}`); this.progress(); this.missions(); } });
  }
  // ── 업그레이드 (이 지점)
  lv(id) { return S.branch[S.bi]?.lv?.[id] || 0; }
  upList() { const g = this.app.game; return UPGRADES.filter(u => !u.need || g.unl.has(u.need) || (u.need === 'baker' && g.staff.some(w => w.k === 'baker'))); }
  sCost(k) { return Math.round(STAFF_UP.base * Math.pow(1.6, this.slv(k)) * BRANCHES[S.bi].mult / 5) * 5; }
  slv(k) { return S.branch[S.bi]?.slv?.[k] || 0; }
  cheapUp() { const m = BRANCHES[S.bi].mult; return this.upList().some(u => this.lv(u.id) < UP_MAX && S.coins >= upCost(u, this.lv(u.id), m)) || this.app.game.staff.some(w => this.slv(w.k) < STAFF_UP.max && S.coins >= this.sCost(w.k)); }
  upgrades() {
    const m = BRANCHES[S.bi].mult; const L = this.upList();
    const html = L.map(u => { const lv = this.lv(u.id), max = lv >= UP_MAX, c = upCost(u, lv, m); return `<div class="upr"><i>${u.icon}</i><div><b>${u.name} <em>Lv.${lv}</em></b><span>${u.desc}</span><div class="pips">${'<s class="on"></s>'.repeat(lv)}${'<s></s>'.repeat(UP_MAX - lv)}</div></div>
      <button class="btn sm ${max || S.coins < c ? 'off' : ''}" data-u="${u.id}">${max ? 'MAX' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const tab = this._tab || 'shop', staff = this.app.game.staff;
    const sh = staff.map(w => { const d = STAFF[w.k], lv = this.slv(w.k), max = lv >= STAFF_UP.max, c = this.sCost(w.k); return `<div class="upr"><i class="sw" style="background:#${d.body.toString(16).padStart(6, '0')}">👤</i><div><b>${d.name} <em>Lv.${lv}</em></b><span>${d.up} 올리기</span><div class="pips">${'<s class="on"></s>'.repeat(lv)}${'<s></s>'.repeat(STAFF_UP.max - lv)}</div></div>
      <button class="btn sm ${max || S.coins < c ? 'off' : ''}" data-s="${w.k}">${max ? 'MAX' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('') || '<p class="sm">바닥의 「직원 뽑기」 칸을 열면 직원이 생겨요</p>';
    const md = this.modal(`<h3>⬆ ${BRANCHES[S.bi].name} 업그레이드</h3><div class="tabs"><button class="${tab === 'shop' ? 'on' : ''}" data-t="shop">가게 · 설비</button><button class="${tab === 'staff' ? 'on' : ''}" data-t="staff">직원 ${staff.length}</button></div><div class="uplist">${tab === 'shop' ? html : sh}</div><p class="sm">설비를 더 열면 업그레이드도 늘어나요</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = UPGRADES.find(x => x.id === b.dataset.u), lv = this.lv(u.id), c = upCost(u, lv, m); if (lv >= UP_MAX || S.coins < c) return; S.coins -= c;
      const br = (S.branch[S.bi] ||= { unl: [], staff: [], paid: {} }); (br.lv ||= {})[u.id] = lv + 1; save(); sfx('unlock', { vol: 0.6 }); this.toast(`${u.name} Lv.${lv + 1}!`); this.progress(); this.upgrades(); });
    md.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._tab = b.dataset.t; this.upgrades(); });
    md.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s, lv = this.slv(k), c = this.sCost(k); if (lv >= STAFF_UP.max || S.coins < c) return; S.coins -= c; const br = S.branch[S.bi]; (br.slv ||= {})[k] = lv + 1; save(); sfx('unlock', { vol: 0.6 }); this.toast(`${STAFF[k].name} Lv.${lv + 1}!`); this.progress(); this.upgrades(); }); }
  // ── 다 연 지점: 직원들이 계속 장사 → 지점 지도에서 받기
  finished(i) { const b = BRANCHES[i], br = S.branch[i]; return !!br && i !== S.bi && b.slots.filter(s => !s.free && s.id !== 'next').every(s => br.unl.includes(s.id)); }
  idleOf(i) { if (!this.finished(i)) return 0; const br = S.branch[i], t = Math.min(4 * 3600, (Date.now() - (br.idleAt || Date.now())) / 1000); return Math.floor(t * FINISHED_RATE * BRANCHES[i].mult * (1 + (br.lv?.price || 0) / 10)); }
  idleTotal() { let t = 0; for (let i = 0; i < BRANCHES.length; i++) t += this.idleOf(i); return t; }
  map() {
    const html = BRANCHES.map((b, i) => { const open = i <= (S.maxBi || 0), idle = this.idleOf(i); return `<div class="br ${i === S.bi ? 'cur' : ''} ${open ? '' : 'lock'}" data-i="${i}"><img src="assets/brand/${b.photo}.jpg"><div><b>${b.name}</b><small>${BRANCH_INFO[i]}</small>
      <span>${!open ? '앞 지점을 다 열면 열려요' : i === S.bi ? '지금 여기' : this.finished(i) ? '직원들이 장사 중' : '가기 ›'}</span></div>${idle > 0 ? `<button class="btn sm col" data-c="${i}"><i class="c"></i>${fmt(idle)}</button>` : ''}</div>`; }).join('');
    const m = this.modal(`<h3>🗺 ${BRAND.name} 지점</h3>${html}<p class="sm">게임 속 지점은 실제 ${BRAND.name} 매장이에요 · 다 연 지점은 직원들이 계속 장사해요 (최대 4시간)</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.c, v = this.idleOf(i); if (!v) return; S.coins += v; S.branch[i].idleAt = Date.now(); save(); sfx('coin'); this.toast(`${BRANCHES[i].name} 수익 +${fmt(v)}`); this.progress(); this.map(); });
    m.querySelectorAll('.br:not(.lock)').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (i !== S.bi) { this.close(); this.app.goBranch(i); } });
  }
  nextBranch(i) { S.maxBi = Math.max(S.maxBi || 0, i); save(true); sfx('levelup'); this.modal(`<h3>🎉 ${BRANCHES[i - 1].name} 완성!</h3><p>모든 설비를 열었어요.<br><b>${BRANCHES[i].name}</b>이(가) 문을 열어요.</p><button class="btn" id="mOk">새 지점으로</button>`); $('#mOk').onclick = () => { this.close(); this.app.goBranch(i); }; }
  offline(v) { this.modal(`<h3>☕ 쉬는 동안</h3><p>직원들이 <b>${fmt(v)}</b>을 벌어 놨어요!</p><div class="btns"><button class="btn ghost" id="o1">받기</button><button class="btn" id="o2">📺 2배 받기</button></div>`);
    $('#o1').onclick = () => { S.coins += v; save(); this.close(); sfx('coin'); }; $('#o2').onclick = () => { this.close(); this.ad('offline', () => { S.coins += v * 2; save(); this.toast(`+${fmt(v * 2)}`); }); }; }
  settings() { const m = this.modal(`<h3>⚙ 설정</h3><div class="tg"><button data-k="sfx" class="${S.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${S.set.bgm ? 'on' : ''}">배경음</button></div><p class="sm">${GAME.title} · ${BRAND.name} 공식 게임<br>“${BRAND.slogan}”<br>메뉴·매장·사진 ${BRAND.name} 제공</p><a class="btn ghost" href="${BRAND.insta}" target="_blank" rel="noopener">📷 인스타그램 보기</a>
      <div class="dev"><b>🧪 테스트 도구 (출시 전에만)</b>${[1, 2, 3].map(n => { const v = slotInfo(n); return `<div class="slot"><span>슬롯 ${n}<small>${v || '비어 있음'}</small></span><button class="btn sm" data-sv="${n}">저장</button><button class="btn sm ${v ? '' : 'off'}" data-ld="${n}">불러오기</button></div>`; }).join('')}
      <div class="btns"><button class="btn sm" id="dvMoney">돈 +10,000</button><button class="btn sm danger" id="dvReset">처음부터</button></div></div><button class="btn ghost" id="mOk">닫기</button>`);
    m.querySelectorAll('.tg button').forEach(b => b.onclick = () => { S.set[b.dataset.k] = !S.set[b.dataset.k]; setAudio(S.set); save(); b.classList.toggle('on'); }); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { save(true); try { localStorage.setItem(SLOT + b.dataset.sv, JSON.stringify({ at: Date.now(), d: localStorage.getItem('marumi_v1') })); } catch { /* */ } this.toast(`슬롯 ${b.dataset.sv}에 저장했어요`); this.settings(); });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const v = JSON.parse(localStorage.getItem(SLOT + b.dataset.ld) || 'null'); if (!v) return; S.last = Date.now(); localStorage.setItem('marumi_v1', v.d); window.__noSave = true; location.reload(); });
    $('#dvMoney').onclick = () => { S.coins += 10000 * BRANCHES[S.bi].mult; save(); this.toast('돈 +' + fmt(10000 * BRANCHES[S.bi].mult)); };
    $('#dvReset').onclick = () => { if (!confirm('지금 진행이 모두 지워져요. 처음부터 할까요? (슬롯은 그대로)')) return; localStorage.removeItem('marumi_v1'); window.__noSave = true; location.reload(); }; }
}
