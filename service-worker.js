const CACHE='progressa-v6-4-6-file-import-share';
const CORE=['./','./index.html','./styles.css','./app.js','./plan-personalization.js','./cardio-mode.js','./cardio-recovery.js','./cycle-exercise-preferences.js','./measurement-import.js','./share-target-import.js','./exercise-images.js','./manifest.json','./manifest.webmanifest','./progressa-icon-v640-192.png','./progressa-icon-v640-512.png','./progressa-icon-v640-maskable-512.png','./progressa-icon-v640-180.png','./favicon.ico'];

function openShareDb(){
 return new Promise((resolve,reject)=>{const request=indexedDB.open('progressa-share-target',1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('files'))db.createObjectStore('files')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Falha ao abrir compartilhamento'))});
}
async function storeSharedFile(file){
 const db=await openShareDb();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');store.put({blob:file,name:file?.name||'avaliacao',type:file?.type||'',lastModified:file?.lastModified||Date.now()},'pending');tx.oncomplete=()=>{try{db.close()}catch{}resolve()};tx.onerror=()=>{try{db.close()}catch{}reject(tx.error||new Error('Falha ao salvar arquivo compartilhado'))};tx.onabort=()=>reject(tx.error||new Error('Compartilhamento cancelado'))});
}

self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(url)));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method==='POST'&&url.origin===location.origin&&url.pathname.endsWith('/share-target')){
  event.respondWith((async()=>{try{const data=await event.request.formData(),files=data.getAll('files'),file=files.find(x=>x&&typeof x.size==='number'&&x.size>0);if(file)await storeSharedFile(file);return Response.redirect(new URL(file?'./?metricImportShare=1':'./',self.registration.scope).href,303)}catch(error){console.error('Falha ao receber arquivo compartilhado',error);return Response.redirect(new URL('./',self.registration.scope).href,303)}})());return;
 }
 if(event.request.method!=='GET')return;
 if(url.origin!==location.origin)return;
 const networkFirst=event.request.mode==='navigate'||/\.(?:js|css|html|json|webmanifest)$/.test(url.pathname);
 if(networkFirst){event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));return}
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r})));
});
