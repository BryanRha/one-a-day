// 서비스 워커: 홈 화면 설치 + 오프라인.
// 항상 서버에 새 버전이 있는지 확인(cache: 'no-cache')하고 받아 쓰며, 연결이 없을 때만 저장해 둔 사본을 쓴다.
// (GitHub Pages 는 파일을 10분간 캐시하라고 보내므로, 그냥 fetch 하면 설치한 앱이 옛 버전을 보여 줄 수 있음)
const CACHE = 'one-a-day-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
