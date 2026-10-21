// One a Day 앱 화면: 오늘 · 라이브러리 · 컬렉션 · 설정 + 게임 실행(iframe) + 잠금 해제(테스트 광고)
import { PLANNED } from './catalog.js';
import * as R from './rules.js';
import * as I from './install.js';

const $ = s => document.querySelector(s);
const view = $('#view');
const VERSION = '0.14.1';
let tab = 'today', timer = null;

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
const fmtKey = k => { const [, m, d] = k.split('-').map(Number); return `${m}월 ${d}일`; };
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };
const G = id => R.GAMES[id];
const STATE_BADGE = { today: ['today', '오늘의 게임'], free: ['open', '자유 플레이'], owned: ['open', '소장'], unlocked: ['open', '오늘 열림'], locked: ['lock', '🔒 잠김'] };

function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

// ── 탭 ─────────────────────────────────────────────
const RENDER = { today: renderToday, library: renderLibrary, collection: renderCollection, settings: renderSettings };
function go(t) {
  tab = t;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  clearInterval(timer);
  view.innerHTML = RENDER[t]();
  view.firstElementChild?.classList.add('fadein');
  window.scrollTo(0, 0);
  if (t === 'today') { tick(); timer = setInterval(tick, 1000); }
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));

function header() {
  const s = R.state();
  const streak = s.streak.count && (s.streak.last === R.keyOf(R.now()) || isYesterday(s.streak.last)) ? s.streak.count : 0;
  return `<div class="top"><div class="brand">🌙 <b>One a Day</b></div><span class="chip hot">${streak ? `🔥 ${streak}일 연속` : '✨ 오늘 시작!'}</span></div>`;
}
function isYesterday(k) { const y = R.now(); y.setDate(y.getDate() - 1); return k === R.keyOf(y); }

// ── 오늘 ───────────────────────────────────────────
function renderToday() {
  const id = R.todayId(), g = G(id), s = R.state(), lib = s.library[id];
  const playedToday = lib && lib.last === R.keyOf(R.now());
  const day = R.dayIndex() + 1;
  const yId = R.gameOn(R.dayIndex() - 1), hasY = R.dayIndex() > 0;
  return `<div>
    ${header()}
    <div class="date">${fmtDate(R.now())} · ${day}일째</div>
    ${installBanner()}
    <div class="hero">
      <div class="ribbon">오늘의 게임</div>
      <div class="cover" style="background-image:url('${g.cover}')"></div>
      <div class="body">
        <h2>${g.title}</h2>
        <div class="en">${g.en}</div>
        <div class="meta"><span class="chip">🎮 ${g.genre}</span><span class="chip">⏱ ${g.time}</span><span class="chip">👥 모두 같은 게임</span></div>
        <p>${g.tagline}</p>
        <button class="btn" data-play="${id}">▶ 지금 플레이</button>
        ${playedToday ? `<div class="played">✓ 오늘 ${lib.plays}판 플레이 · 라이브러리에 저장됨</div>` : ''}
      </div>
    </div>
    <div class="row">
      <div class="box"><div class="k">다음 게임 공개까지</div><div class="v" id="cd">--:--:--</div></div>
      <div class="box mystery"><div class="qmark"><span>?</span></div><div><div class="k">내일의 게임</div><div class="jua" style="font-size:17px">두근두근…</div></div></div>
    </div>
    ${R.RULES.openAll ? `<div class="section"><h3>모든 게임</h3><span class="more">테스트 기간 · 자유 플레이</span></div><div class="list">${R.ORDER.filter(g => g !== id).map(itemCard).join('')}</div>` : hasY ? `<div class="section"><h3>어제의 게임</h3></div>${itemCard(yId)}` : ''}
    <div class="section"><h3>이용 방법</h3><span class="more" data-intro>자세히 ›</span></div>
    <div class="box" style="color:#DDD5FA">매일 자정, 모든 플레이어에게 <b class="jua" style="color:var(--gold)">같은 게임 하나</b>가 열려요. 플레이한 게임은 라이브러리에 모이고, 다른 날 다시 하려면 광고로 열 수 있어요.</div>
  </div>`;
}
// 홈 화면 추가 배너 (설치 전 · 오늘 닫지 않았을 때)
function installBanner() {
  if (I.installed() || localStorage.getItem('oad_hide_install') === R.keyOf(R.now())) return '';
  const msg = I.env.inApp ? `${I.env.kakao ? '카카오톡' : '앱'} 브라우저에서는 홈 화면 추가가 안 돼요` : '홈 화면에 추가하면 매일 한 번에 들어와요';
  const btn = I.env.inApp ? '브라우저로 열기' : I.canPrompt() ? '설치' : '추가하기';
  return `<div class="install"><div class="ic">📲</div><div class="tx">${msg}</div><button data-${I.env.inApp ? 'ext' : 'install'}>${btn}</button><button class="x" data-hide-install aria-label="닫기">✕</button></div>`;
}
async function doInstall() { const html = await I.install(); if (html) openSheet(html); else setTimeout(() => go(tab), 300); }

function tick() { const el = $('#cd'); if (el) el.textContent = hms(R.msToTomorrow()); if (R.msToTomorrow() < 1000) setTimeout(() => go('today'), 1200); }

function itemCard(id) {
  const g = G(id), a = R.access(id), lib = R.state().library[id], [cls, label] = STATE_BADGE[a];
  const sub = lib ? `처음 만난 날 ${fmtKey(lib.first)} · ${lib.plays}판` : `${g.genre} · 아직 안 해 봤어요`;
  return `<div class="item" data-open="${id}"><img src="${g.icon}" alt=""><div><div class="t">${g.title}</div><div class="s">${sub}</div></div><span class="state badge ${cls}">${label}</span></div>`;
}

// ── 라이브러리 ─────────────────────────────────────
function renderLibrary() {
  const lib = R.state().library;
  const ids = Object.keys(lib).sort((a, b) => (lib[b].last > lib[a].last ? 1 : -1));
  return `<div>${header()}
    <h1 style="font-size:28px">라이브러리</h1>
    <div class="date">내가 만난 게임 ${ids.length}개</div>
    ${ids.length ? `<div class="list">${ids.map(itemCard).join('')}</div>`
      : `<div class="empty"><div class="big">📚</div><p>아직 비어 있어요.<br>오늘의 게임을 플레이하면 여기에 모여요!</p><button class="btn small" style="max-width:220px;margin:0 auto" data-tab-go="today">오늘의 게임 보러 가기</button></div>`}
  </div>`;
}

// ── 컬렉션 ─────────────────────────────────────────
function renderCollection() {
  const rel = R.released(), lib = R.state().library, total = Math.max(PLANNED, R.ORDER.length);
  const met = rel.filter(id => lib[id]).length;
  const tiles = [];
  R.ORDER.forEach((id, i) => {
    if (rel.includes(id)) tiles.push(`<div class="tile" data-open="${id}"><img src="${G(id).icon}" alt=""><span class="n">#${i + 1}</span>${lib[id] ? '' : '<span class="lk">✨</span>'}</div>`);
    else tiles.push(`<div class="tile unk">?</div>`);
  });
  for (let i = R.ORDER.length; i < total; i++) tiles.push(`<div class="tile unk" style="font-size:16px">곧 공개</div>`);
  return `<div>${header()}
    <h1 style="font-size:28px">컬렉션</h1>
    <div class="date">만난 게임 ${met} / 공개 ${rel.length} / 전체 ${total}</div>
    <div class="progress"><i style="width:${(met / total) * 100}%"></i></div>
    <div class="grid">${tiles.join('')}</div>
  </div>`;
}

// ── 설정 ───────────────────────────────────────────
function renderSettings() {
  const s = R.state();
  return `<div>${header()}
    <h1 style="font-size:28px;margin-bottom:14px">설정</h1>
    <div class="group">
      <div><span>홈 화면에 추가</span>${I.installed() ? '<span class="badge open">추가됨</span>' : '<button data-install>추가하기</button>'}</div>
      <div><span>이용 방법 다시 보기</span><button data-intro>보기</button></div>
      <div><span>버전</span><span class="badge">v${VERSION}</span></div>
    </div>
    <div class="group">
      <div><span>테스트: 날짜 이동 <span class="badge">${s.dayOffset >= 0 ? '+' : ''}${s.dayOffset}일</span></span><span><button data-day="-1">‹ 하루 전</button> <button data-day="1">하루 뒤 ›</button></span></div>
      <div><span>테스트: 날짜 되돌리기</span><button data-day="0">오늘로</button></div>
      <div><span>모든 기록 지우기</span><button class="warn" data-reset>초기화</button></div>
    </div>
    <div class="box"><div class="jua" style="font-size:18px;margin-bottom:6px">이용 규칙 (현재)</div><ul class="rules" style="margin:0;padding-left:18px">
      ${R.RULES.openAll ? '<li><b>지금은 테스트 기간이라 모든 게임을 자유롭게 할 수 있어요</b></li>' : ''}
      <li>오늘의 게임은 하루 종일 무료</li>
      <li>다른 게임은 광고를 보면 ${R.RULES.adUnlock === 'day' ? '그날 하루' : '한 판'} 열려요 (지금은 테스트 광고)</li>
      <li>소장(결제)은 준비 중</li></ul></div>
  </div>`;
}

// ── 시트(상세 · 광고 · 소개) ─────────────────────────
const sheet = $('#sheet'), panel = $('#sheet .panel');
function openSheet(html) { panel.innerHTML = `<div class="grab"></div>${html}`; sheet.hidden = false; }
function closeSheet() { sheet.hidden = true; }
$('#sheet .dim').onclick = closeSheet;

function detail(id) {
  const g = G(id), a = R.access(id), lib = R.state().library[id];
  const actions = a !== 'locked'
    ? `<button class="btn" data-play="${id}">▶ 플레이</button>`
    : `<button class="btn alt" data-ad="${id}">📺 광고 보고 ${R.RULES.adUnlock === 'day' ? '오늘 하루' : '한 판'} 플레이</button>
       <button class="btn ghost" ${R.RULES.purchase ? '' : 'disabled'}>💎 소장하기 (준비 중)</button>
       <div class="note">오늘의 게임이 돌아오는 날엔 무료로 할 수 있어요</div>`;
  openSheet(`<div class="cover" style="background-image:url('${g.cover}')"></div>
    <h2>${g.title}</h2><div class="en" style="color:var(--sub);font-size:13px;letter-spacing:1.5px">${g.en.toUpperCase()}</div>
    <div class="meta" style="margin:10px 0"><span class="chip">🎮 ${g.genre}</span><span class="chip">⏱ ${g.time}</span>${lib ? `<span class="chip">🗓 ${fmtKey(lib.first)} 첫 플레이</span>` : ''}</div>
    <p style="color:#DDD5FA">${g.desc}</p>
    <div class="stack">${actions}<button class="btn ghost" data-close>닫기</button></div>`);
}

function watchAd(id) {
  let left = R.RULES.adSeconds;
  openSheet(`<div class="ad"><div class="screen">광고 영역 (테스트)</div><div class="count" id="adc">${left}</div><div class="note">실제 서비스에서는 여기에 광고가 나와요</div>
    <div class="stack"><button class="btn" id="adok" disabled>보상 받기</button></div></div>`);
  const iv = setInterval(() => {
    left--; const c = $('#adc'); if (c) c.textContent = left;
    if (left <= 0) { clearInterval(iv); const b = $('#adok'); if (b) { b.disabled = false; b.onclick = () => { R.unlockByAd(id); closeSheet(); toast(`${G(id).title} 열림!`); play(id); }; } }
  }, 1000);
}

function intro() {
  openSheet(`<div class="intro"><h2>🌙 One a Day</h2><p style="color:var(--sub);margin:4px 0 6px">하루에 하나, 새로운 게임을 만나요</p>
    <div class="step"><div class="num">1</div><div><b>매일 자정, 새 게임 공개</b><p>모든 플레이어에게 같은 게임이 열려요. 친구와 오늘 기록을 겨뤄 보세요.</p></div></div>
    <div class="step"><div class="num">2</div><div><b>플레이하면 라이브러리에</b><p>한 번 만난 게임은 내 라이브러리에 차곡차곡 모여요.</p></div></div>
    <div class="step"><div class="num">3</div><div><b>또 하고 싶다면</b><p>오늘의 게임이 아닌 날엔 광고를 보거나 소장해서 다시 즐길 수 있어요.</p></div></div>
    <div class="stack"><button class="btn" data-close>시작하기</button></div></div>`);
  R.state().intro = true; R.save();
}

// ── 게임 실행 ──────────────────────────────────────
// 게임 화면(iframe)은 열 때마다 새로 만들고 닫을 때 지움 → 방문 기록이 쌓이지 않고, 소리·메모리도 깨끗이 정리됨
const player = $('#player');
let frame = null;
function play(id) {
  if (!R.canPlay(id)) return detail(id);
  closeSheet();
  R.recordPlay(id);
  frame = document.createElement('iframe');
  frame.id = 'frame'; frame.title = G(id).title; frame.allow = 'autoplay; fullscreen; vibrate';
  frame.src = `${G(id).path}${G(id).path.includes('?') ? '&' : '?'}v=${VERSION}`;
  player.prepend(frame);
  player.hidden = false;
  document.body.style.overflow = 'hidden';
  history.pushState({ game: id }, '');
}
function closeGame() {
  player.hidden = true;
  if (frame) { frame.remove(); frame = null; }
  document.body.style.overflow = '';
  go(tab);
  // 첫 게임을 마치고 돌아오면 한 번만 홈 화면 추가를 권함
  if (!I.installed() && !localStorage.getItem('oad_nudged')) { localStorage.setItem('oad_nudged', '1'); setTimeout(() => openSheet(I.env.inApp || !I.canPrompt() ? I.guide() : `<div class="intro"><h2>📲 내일도 쉽게 만나요</h2><p style="color:var(--sub)">홈 화면에 추가하면 매일 새 게임을 한 번에 열 수 있어요.</p><div class="stack"><button class="btn" data-install>홈 화면에 추가</button><button class="btn ghost" data-close>나중에</button></div></div>`), 500); }
}
// 뒤로가기: 먼저 게임에게 물어봄 (팝업 닫기 · 이전 화면 · 일시정지) → 게임이 처리하면 다시 막아 두고, 게임 첫 화면이면 원어데이로
let forceExit = false, backWait = null;
function exitGame() { forceExit = true; history.back(); }
addEventListener('popstate', () => {
  if (player.hidden) return;
  if (!$('#sheet').hidden && !forceExit) { closeSheet(); history.pushState({ game: true }, ''); return; }   // 나가기 확인 창이 떠 있으면 그 창만 닫음
  if (forceExit || !frame || !frame.contentWindow) { forceExit = false; closeGame(); return; }
  clearTimeout(backWait);
  backWait = setTimeout(() => { backWait = null; closeGame(); }, 450);   // 응답 없는 게임(옛 버전)은 바로 닫음
  frame.contentWindow.postMessage({ type: 'oad:back' }, '*');
});
// 게임 쪽에서 보내는 메시지: { type: 'oad:exit' } → 원어데이로 · { type: 'oad:back-result', handled } → 뒤로가기 처리 결과
addEventListener('message', e => {
  const d = e.data; if (!d || player.hidden) return;
  if (d.type === 'oad:exit') exitGame();
  else if (d.type === 'oad:back-result' && backWait) { clearTimeout(backWait); backWait = null; if (d.handled) history.pushState({ game: true }, ''); else closeGame(); }
});

// ── 공통 클릭 처리 ─────────────────────────────────
document.addEventListener('click', e => {
  const t = e.target.closest('[data-play],[data-open],[data-ad],[data-close],[data-exit],[data-intro],[data-day],[data-reset],[data-tab-go],[data-install],[data-ext],[data-copy],[data-hide-install]');
  if (!t) return;
  const d = t.dataset;
  if (d.play) play(d.play);
  else if (d.open) detail(d.open);
  else if (d.ad) watchAd(d.ad);
  else if ('close' in d) closeSheet();
  else if ('exit' in d) { closeSheet(); if (!player.hidden) exitGame(); else history.back(); }
  else if ('intro' in d) intro();
  else if ('install' in d) { closeSheet(); doInstall(); }
  else if ('ext' in d) I.openExternal();
  else if ('copy' in d) I.copyLink().then(ok => toast(ok ? '주소를 복사했어요. 브라우저에 붙여 넣어 주세요' : '주소: ' + location.href));
  else if ('hideInstall' in d) { localStorage.setItem('oad_hide_install', R.keyOf(R.now())); go(tab); }
  else if (d.tabGo) go(d.tabGo);
  else if (d.day !== undefined) { const s = R.state(); s.dayOffset = d.day === '0' ? 0 : s.dayOffset + Number(d.day); R.save(); go('settings'); toast(`${fmtDate(R.now())}로 이동`); }
  else if ('reset' in d) { if (t.dataset.confirm) { R.resetAll(); go('today'); toast('초기화했어요'); } else { t.dataset.confirm = 1; t.textContent = '한 번 더'; } }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

// 새 버전 확인: 앱을 열거나 다시 볼 때마다 서버의 version.json 을 확인 → 바뀌었으면 (게임 중이 아닐 때) 새로고침
async function checkUpdate() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await r.json();
    // 같은 버전으로는 한 번만 새로고침 (캐시 때문에 옛 파일이 오더라도 무한 새로고침 방지)
    if (version && version !== VERSION && player.hidden && sessionStorage.getItem('oad_reloaded') !== version) {
      sessionStorage.setItem('oad_reloaded', version);
      toast('새 버전으로 바꾸는 중…'); setTimeout(() => location.reload(), 600);
    }
  } catch { /* 오프라인 */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
setTimeout(checkUpdate, 1500);
document.addEventListener('oad:installable', () => { if (tab === 'today' || tab === 'settings') go(tab); });
document.addEventListener('oad:installed', () => { toast('홈 화면에 추가됐어요!'); go(tab); });
go('today');
if (!R.state().intro) setTimeout(intro, 400);
window.__oad = { R, go, play };
