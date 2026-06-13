self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 1. URL 꼬리표에 붙어있는 인증 정보(auth)를 떼어냅니다.
  const auth = url.searchParams.get('auth');
  
  if (auth) {
    event.respondWith((async () => {
      // 2. 진짜 서버에 요청할 때는 꼬리표를 지워서 깔끔한 원래 주소로 만듭니다.
      url.searchParams.delete('auth');
      const cleanUrl = url.toString();

      // 3. 혹시 이미 다운받아둔 이미지인지 캐시부터 확인합니다.
      const cache = await caches.open('manga-image-cache');
      const cachedResponse = await cache.match(cleanUrl);
      if (cachedResponse) return cachedResponse; // 캐시에 있으면 0.1초 컷

      // 4. 캐시에 없으면 떼어냈던 인증 정보를 헤더에 정식으로 장착합니다.
      const modifiedHeaders = new Headers(event.request.headers);
      modifiedHeaders.set('Authorization', auth);

      const modifiedRequest = new Request(cleanUrl, {
        headers: modifiedHeaders,
        mode: 'cors'
      });

      try {
        // 5. 서버에 진짜로 요청
        const networkResponse = await fetch(modifiedRequest);
        
        // 6. 성공적으로 받아왔다면 다음을 위해 캐시에 저장해둡니다.
        if (networkResponse.ok && cleanUrl.match(/\.(jpe?g|png|gif|webp|avif)$/i)) {
          cache.put(cleanUrl, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.error('SW Fetch Error:', error);
        throw error;
      }
    })());
  }
});