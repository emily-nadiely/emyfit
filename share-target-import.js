/* Progressa v6.4.6 — recebe PDF/imagem compartilhado pelo Android */
(function(){
  if(typeof window.processMetricImport!=='function')return;

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return resolve(null);
      const request=indexedDB.open('progressa-share-target',1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('files'))db.createObjectStore('files')};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Falha ao abrir compartilhamento'));
    });
  }

  async function takeFile(){
    const db=await openDb();if(!db)return null;
    const item=await new Promise((resolve,reject)=>{
      const tx=db.transaction('files','readwrite'),store=tx.objectStore('files'),get=store.get('pending');
      get.onsuccess=()=>{const value=get.result;if(value)store.delete('pending');resolve(value||null)};
      get.onerror=()=>reject(get.error);
    }).catch(()=>null);
    try{db.close()}catch{}
    if(!item)return null;
    if(item instanceof File)return item;
    if(item.blob)return new File([item.blob],item.name||'avaliacao',{type:item.type||item.blob.type||'',lastModified:item.lastModified||Date.now()});
    return null;
  }

  async function openShared(){
    try{
      const params=new URLSearchParams(location.search);if(params.get('metricImportShare')!=='1')return;
      params.delete('metricImportShare');const qs=params.toString();history.replaceState({},'',location.pathname+(qs?'?'+qs:'')+location.hash);
      const file=await takeFile();
      if(file)setTimeout(()=>window.processMetricImport(file),500);
      else if(typeof toast==='function')toast('Não encontrei o arquivo compartilhado. Tente novamente.');
    }catch(error){console.warn('Falha ao abrir arquivo compartilhado',error)}
  }

  setTimeout(openShared,700);
})();
