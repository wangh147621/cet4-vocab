// CET-4 Vocab Service Worker — 离线缓存
const CACHE_NAME = 'cet4-vocab-v2';
const ASSETS = [
  './',
  './cet4-vocab.html',
  './manifest.json',
];

// 安装：预缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        // 部分文件失败不阻塞安装
        console.warn('SW cache install partial:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先 + 网络回退
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 网络不可用且无缓存时，返回 HTML 本身
        if (event.request.mode === 'navigate') {
          return caches.match('./cet4-vocab.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
