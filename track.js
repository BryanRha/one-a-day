// 이용 기록(익명): 무작위 기기 번호 + 행동만 보냄 · 이름 · 생년월일 · 사주 내용은 절대 보내지 않음
//   보내는 곳: oneaday.kr · test.oneaday.kr · vercel.app → 같은 주소의 /api/ev
//             깃허브 주소(지인용 · 깃허브 테스트) → 테스트 서버 https://test.oneaday.kr/api/ev (o = friends / test 로 구분)
//   모아서 5초마다 · 화면을 떠날 때 한 번에 보냄 → 게임 성능에 영향 없음

const HOST = location.hostname;
const OFF = (() => { try { return localStorage.getItem('oad_track_off') === '1'; } catch { return false; } })();
const GH = HOST.endsWith('github.io');
const ON = !OFF && (/(^|\.)oneaday\.kr$/.test(HOST) || HOST.endsWith('.vercel.app') || GH || (() => { try { return localStorage.getItem('oad_track') === '1'; } catch { return false; } })());
const URL_EV = GH ? 'https://test.oneaday.kr/api/ev' : '/api/ev';
const ORIGIN = GH ? (location.pathname.startsWith('/one-a-day-test') ? 'test' : 'friends') : '';   /* 어느 주소에서 온 기록인지 */
const MAX_Q = 200;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 */ } },
};
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

let device = store.get('oad_did');
const isNew = !device;
if (!device) { device = rid(); store.set('oad_did', device); store.set('oad_first', new Date().toISOString().slice(0, 10)); }
const session = rid().slice(0, 12);

// 어디서 왔나: 광고 링크의 utm 값 → 없으면 들어온 사이트 → 없으면 직접
function source() {
  const q = new URLSearchParams(location.search);
  const ref = document.referrer && !document.referrer.includes(HOST) ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  const src = {
    src: q.get('utm_source') || ref || (window.matchMedia('(display-mode: standalone)').matches ? 'home' : 'direct'),
    med: q.get('utm_medium') || '',
    cmp: q.get('utm_campaign') || '',
    ad: q.get('utm_content') || '',
  };
  // 처음 데려온 곳은 계속 기억 (광고 성과를 결제까지 잇기 위해)
  if (!store.get('oad_src1') && src.src !== 'direct') store.set('oad_src1', JSON.stringify(src));
  return src;
}

const q = [];
let ver = '';
function push(name, p) {
  if (!ON || q.length >= MAX_Q) return;
  q.push({ n: name, t: Date.now(), p: p || {} });
}
function flush() {
  if (!ON || !q.length) return;
  const body = JSON.stringify({ d: device, s: session, v: ver, o: ORIGIN, e: q.splice(0, 50) });
  try {
    if (!(navigator.sendBeacon && navigator.sendBeacon(URL_EV, new Blob([body], { type: 'text/plain' })))) fetch(URL_EV, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  } catch { /* 네트워크 오류는 무시 */ }
}

export function track(name, props) { try { push(name, props); } catch { /* 기록 실패가 앱을 멈추면 안 됨 */ } }

// 오류: 같은 내용은 한 번만
const seen = new Set();
export function trackError(where, e) {
  const msg = String((e && (e.message || e.reason && e.reason.message)) || e || '').slice(0, 200);
  const key = where + msg;
  if (!msg || msg === 'Script error.' || seen.has(key) || seen.size > 30) return;   /* 다른 주소 스크립트 오류는 내용이 없어 버림 */
  seen.add(key);
  track('err', { where, msg });
}

export function start(version) {
  ver = version;
  if (!ON) return;
  const src = source();
  let first = null; try { first = JSON.parse(store.get('oad_src1') || 'null'); } catch { /* 깨진 값 */ }
  track('open', {
    ...src, new: isNew ? 1 : 0, first: store.get('oad_first') || '',
    src1: first ? first.src : '', cmp1: first ? first.cmp : '', ad1: first ? first.ad : '',
    app: window.matchMedia('(display-mode: standalone)').matches ? 1 : 0,
    mob: /Mobi|Android|iPhone|iPad/.test(navigator.userAgent) ? 1 : 0,
    os: /iPhone|iPad|Mac/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : /Windows/.test(navigator.userAgent) ? 'win' : 'etc',
    w: innerWidth,
  });
  addEventListener('error', e => trackError('app', e.error || e.message));
  addEventListener('unhandledrejection', e => trackError('app', e.reason));
  setInterval(flush, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
  setTimeout(flush, 1500);
}

export const enabled = ON;
// 설정의 「이용 기록 보내지 않기」 — 바꾼 뒤 다음 접속부터 적용, 지금 쌓인 것도 버림
export const optedOut = () => { try { return localStorage.getItem('oad_track_off') === '1'; } catch { return false; } };
export function setOptOut(off) { try { if (off) { localStorage.setItem('oad_track_off', '1'); q.length = 0; } else localStorage.removeItem('oad_track_off'); } catch { /* 저장 불가 */ } }
