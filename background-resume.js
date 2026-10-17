/* Progressa v6.4.32 — restauração após Android encerrar o PWA em segundo plano */
(function(){
  const KEY='progressa_ui_resume_v1';
  const VALID=new Set(['home','workout','coach','reports','profile']);
  let restored=false,saveTimer=null;

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
  }
  function snapshot(){
    if(typeof screen==='undefined'||!VALID.has(screen))return;
    try{localStorage.setItem(KEY,JSON.stringify({
      screen,
      scrollY:Math.max(0,Math.round(window.scrollY||0)),
      at:Date.now(),
      active:!!(typeof state!=='undefined'&&state?.active)
    }))}catch{}
    try{if(typeof saveLocal==='function')saveLocal(false)}catch{}
  }
  function scheduleSnapshot(){clearTimeout(saveTimer);saveTimer=setTimeout(snapshot,120)}
  function tryRestoreBeforeRender(){
    if(restored)return;
    const saved=read();restored=true;
    if(!saved||!VALID.has(saved.screen))return;
    if(Date.now()-(+saved.at||0)>1000*60*60*12)return;
    try{
      if(typeof currentUser!=='undefined'&&(currentUser||localStorage.getItem('emyfit_demo')))screen=saved.screen;
    }catch{}
  }
  function restoreScroll(){
    const saved=read();
    if(!saved||saved.screen!==screen)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      try{window.scrollTo({top:Math.max(0,+saved.scrollY||0),behavior:'auto'})}catch{}
    }));
  }

  if(typeof renderApp==='function'){
    const before=renderApp;
    renderApp=function(){tryRestoreBeforeRender();const out=before();restoreScroll();return out};
  }
  if(typeof setScreen==='function'){
    const beforeSet=setScreen;
    setScreen=function(next){snapshot();const out=beforeSet(next);setTimeout(snapshot,0);return out};
  }

  window.addEventListener('scroll',scheduleSnapshot,{passive:true});
  window.addEventListener('pagehide',snapshot);
  window.addEventListener('beforeunload',snapshot);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')snapshot();else restoreScroll()});
  window.addEventListener('pageshow',event=>{if(event.persisted){const saved=read();if(saved&&VALID.has(saved.screen)){screen=saved.screen;renderApp()}}});

  async function requestPersistence(){
    try{
      if(navigator.storage?.persist){
        const already=await navigator.storage.persisted?.();
        if(!already)await navigator.storage.persist();
      }
    }catch{}
  }
  window.addEventListener('pointerdown',requestPersistence,{once:true,passive:true});
  setTimeout(()=>{tryRestoreBeforeRender();snapshot()},1200);
})();