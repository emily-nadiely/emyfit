const CACHE='emyfit-premium-v3-0';
const FILES=["./", "./index.html", "./styles.css", "./app.js", "./config.js", "./manifest.webmanifest", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-maskable-512.png", "./assets/apple-touch-icon.png", "./assets/exercises/legpress-anatomico.png", "./assets/exercises/row-anatomico.png", "./assets/exercises/legpress.svg", "./assets/exercises/legpress_h.svg", "./assets/exercises/extension.svg", "./assets/exercises/curl.svg", "./assets/exercises/hip.svg", "./assets/exercises/abductor.svg", "./assets/exercises/pulldown.svg", "./assets/exercises/row.svg", "./assets/exercises/chest.svg", "./assets/exercises/shoulder.svg", "./assets/exercises/armcurl.svg", "./assets/exercises/triceps.svg", "./assets/exercises/crunch.svg", "./assets/exercises/calf.svg", "./assets/exercises/lateral.svg"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin===location.origin&&['document','script','style'].includes(e.request.destination)){
   e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const c=res.clone();if(u.origin===location.origin)caches.open(CACHE).then(x=>x.put(e.request,c));return res}).catch(()=>caches.match('./index.html'))));
});