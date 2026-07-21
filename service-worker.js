const CACHE='emyfit-pro-v2.3-anatomico-20260721';
const FILES=[
  './','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest',
  './assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png',
  './assets/exercises/legpress-anatomico.webp',
  './assets/exercises/remada-sentada-anatomica.webp',
  './assets/exercises/legpress_h.svg','./assets/exercises/extension.svg','./assets/exercises/curl.svg',
  './assets/exercises/hip.svg','./assets/exercises/abductor.svg','./assets/exercises/pulldown.svg',
  './assets/exercises/chest.svg','./assets/exercises/shoulder.svg','./assets/exercises/armcurl.svg',
  './assets/exercises/triceps.svg','./assets/exercises/crunch.svg','./assets/exercises/calf.svg',
  './assets/exercises/lateral.svg'
];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const isCore=/\/(index\.html|app\.js|styles\.css|service-worker\.js|config\.js)$/.test(url.pathname)||url.pathname.endsWith('/');
  if(isCore){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
  }else{
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
    })));
  }
});
