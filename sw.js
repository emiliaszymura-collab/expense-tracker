// HR-OS — service worker (offline + szybkie ładowanie po instalacji)
const CACHE='hr-os-v2';
const CORE=['./hr-os.html','./hr-os-cloud.html','./office.jpg','./icon-192.png','./icon-512.png','./manifest.json'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    const cp=res.clone();
    if(res.ok && (e.request.url.startsWith(self.location.origin)||e.request.url.includes('jsdelivr'))) caches.open(CACHE).then(c=>c.put(e.request,cp));
    return res;
  }).catch(()=>caches.match('./hr-os.html'))));
});
