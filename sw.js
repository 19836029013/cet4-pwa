// Service Worker for CET-4 PWA
const CACHE_NAME = 'cet4-v1';
const ASSETS = [
  'english-dashboard.html',
  'manifest.json',
  'icon.svg',
  // 外部资源（FontAwesome CDN）
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
];

// 安装：预缓存所有静态资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('SW: caching assets');
      return cache.addAll(ASSETS).catch(function(err) {
        console.log('SW: cache addAll failed (some URLs may be offline):', err);
      });
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', function(event) {
  // 跳过 chrome-extension 和非 HTTP(S) 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 缓存命中，同时后台更新缓存
        fetch(event.request).then(function(response) {
          if (response.ok) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response);
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 缓存未命中，请求网络
      return fetch(event.request).then(function(response) {
        if (!response.ok) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // 网络也失败，返回离线页面（对于HTML请求）
        if (event.request.headers.get('accept').indexOf('text/html') !== -1) {
          return caches.match('english-dashboard.html');
        }
        // 其他资源返回空响应
        return new Response('', { status: 408 });
      });
    })
  );
});
