let authHeader = '';
let baseUrl = '';

// 1. 메인 스크립트로부터 로그인 정보(주소, 헤더)를 전달받아 저장합니다.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_CREDENTIALS') {
    authHeader = event.data.authHeader;
    baseUrl = event.data.baseUrl;
  }
});

// 2. 브라우저에서 나가는 네트워크 요청을 중간에서 가로챕니다.
self.addEventListener('fetch', (event) => {
  // baseUrl이 설정되어 있고, 요청 주소가 Nextcloud 주소로 시작하는 경우에만 개입합니다.
  if (baseUrl && event.request.url.startsWith(baseUrl)) {
    event.respondWith(
      (async () => {
        // A. 이미 캐싱된 파일이 있는지 확인
        const cache = await caches.open('manga-image-cache');
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse; // 캐시에 있으면 바로 꺼내줍니다 (초고속!)
        }

        // B. 캐시에 없으면 Authorization 헤더를 붙여서 새로 요청 생성
        const modifiedHeaders = new Headers(event.request.headers);
        modifiedHeaders.set('Authorization', authHeader);

        const modifiedRequest = new Request(event.request, {
          headers: modifiedHeaders,
          mode: 'cors'
        });

        try {
          // C. 서버에 진짜로 요청
          const networkResponse = await fetch(modifiedRequest);
          
          // D. 성공적으로 받아왔고, 이미지 파일이라면 다음을 위해 캐시에 저장
          if (networkResponse.ok && event.request.url.match(/\.(jpe?g|png|gif|webp|avif)$/i)) {
            cache.put(event.request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          console.error('Service Worker Fetch Error:', error);
          throw error;
        }
      })()
    );
  }
});

// 서비스 워커 즉시 활성화
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
