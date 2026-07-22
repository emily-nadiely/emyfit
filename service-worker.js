const CACHE='gym-premium-v5-9-login-fix';
const CORE=[
  './','./index.html','./styles.css','./app.js','./exercise-images.js','./manifest.json','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon.png','./favicon.ico',
  './assets/icon-96.png','./assets/icon-128.png','./assets/icon-144.png','./assets/icon-152.png','./assets/icon-192.png','./assets/icon-256.png','./assets/icon-384.png','./assets/icon-512.png','./assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png','./assets/favicon.png','./assets/favicon.ico'
];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const networkFirst=event.request.mode==='navigate'||/\.(?:js|css|html|json|webmanifest)$/.test(url.pathname)||url.pathname.includes('/assets/exercises/');
  if(networkFirst){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })));
});
