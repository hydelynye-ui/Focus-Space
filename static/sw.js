const CACHE='focus-space-v2';
const CORE=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/assets/warm-study.svg','/assets/deep-work.svg','/assets/reading-room.svg','/assets/rainy-retreat.svg','/assets/morning-planning.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('/index.html'))))});
