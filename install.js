// 홈 화면에 추가: 환경을 알아내서 가장 쉬운 방법으로 안내
// - 안드로이드 크롬·삼성 인터넷·PC 크롬: 설치 창(beforeinstallprompt)을 버튼 한 번으로 띄움
// - 아이폰(사파리·크롬): 자동 설치가 불가 → 공유 버튼 → '홈 화면에 추가' 그림 안내
// - 카카오톡·네이버·인스타 등 앱 안 브라우저: 추가 불가 → 바깥 브라우저로 바로 열기
let deferred = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('oad:installable')); });
addEventListener('appinstalled', () => { deferred = null; localStorage.setItem('oad_installed', '1'); document.dispatchEvent(new Event('oad:installed')); });

const ua = navigator.userAgent;
export const env = {
  ios: /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/i.test(ua),
  kakao: /KAKAOTALK/i.test(ua),
  inApp: /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND|Snapchat|wv\)/i.test(ua),
  samsung: /SamsungBrowser/i.test(ua),
  iosChrome: /CriOS/i.test(ua),
};
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || localStorage.getItem('oad_installed') === '1';
export const canPrompt = () => !!deferred;

// 바깥 브라우저로 열기 (카카오톡은 전용 주소, 안드로이드는 크롬 인텐트)
export function openExternal() {
  const url = location.href.split('#')[0];
  if (env.kakao) { location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`; return; }
  if (env.android) { location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`; return; }
  copyLink();
}
export async function copyLink() {
  try { await navigator.clipboard.writeText(location.href.split('#')[0]); return true; } catch { return false; }
}

// 실행: 설치 창을 띄울 수 있으면 바로, 아니면 안내 화면(html)을 돌려줌
export async function install() {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    deferred = null;
    if (r && r.outcome === 'accepted') localStorage.setItem('oad_installed', '1');
    return null;
  }
  return guide();
}

const SHARE_IOS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><path fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v10h14V11h-1"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const DOTS = '<b style="font-size:20px;letter-spacing:-1px">⋮</b>';

function steps(list) { return list.map((s, i) => `<div class="step"><div class="num">${i + 1}</div><div><b>${s[0]}</b>${s[1] ? `<p>${s[1]}</p>` : ''}</div></div>`).join(''); }

export function guide() {
  if (env.inApp) {
    const app = env.kakao ? '카카오톡' : '이 앱';
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">${app} 안의 브라우저에서는 홈 화면에 추가할 수 없어요.<br>아래 버튼으로 ${env.ios ? '사파리' : '크롬'}에서 열어 주세요.</p>
      <div class="stack"><button class="btn" data-ext>🌐 ${env.ios ? '사파리' : '브라우저'}로 열기</button>
      <button class="btn ghost" data-copy>🔗 주소 복사하기</button></div>
      <p class="note">열린 브라우저에서 다시 ‘홈 화면에 추가’를 누르면 끝!</p></div>`;
  }
  if (env.ios) {
    const where = env.iosChrome ? '주소창 오른쪽의 공유 버튼' : '화면 아래 가운데 공유 버튼';
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">세 번만 누르면 앱처럼 쓸 수 있어요</p>
      ${steps([[`${where} ${SHARE_IOS} 누르기`, ''], [`목록을 내려 ‘홈 화면에 추가’ ${PLUS} 누르기`, '안 보이면 목록 맨 아래 ‘작업 편집’에서 추가할 수 있어요'], ['오른쪽 위 ‘추가’ 누르기', '홈 화면에 🌙 One a Day 아이콘이 생겨요']])}
      <div class="stack"><button class="btn" data-close>알겠어요</button></div>
      ${env.iosChrome ? '' : '<div class="ios-arrow">⬇</div>'}</div>`;
  }
  const menu = env.samsung ? '아래쪽 메뉴(☰)' : `오른쪽 위 메뉴 ${DOTS}`;
  return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
    <p style="color:var(--sub);margin:6px 0 4px">브라우저 메뉴에서 한 번만 누르면 돼요</p>
    ${steps([[`${menu} 누르기`, ''], ['‘홈 화면에 추가’ 또는 ‘앱 설치’ 누르기', ''], ['‘추가’ / ‘설치’ 누르기', '홈 화면에 🌙 One a Day 아이콘이 생겨요']])}
    <div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
}
