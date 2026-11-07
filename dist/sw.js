const CACHE = 'focus-space-v3';
const CORE = ["/","/index.html","/manifest.webmanifest","/assets/deep-work.svg","/assets/index-DXMI28rJ.js","/assets/index-DXs2Cb5f.css","/assets/morning-planning.svg","/assets/rainy-retreat.svg","/assets/reading-room.svg","/assets/warm-study.svg"];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match('/index.html')))); });
