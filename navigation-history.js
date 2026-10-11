/* Progressa v6.4.23 — navegação pelo gesto Voltar do Android/PWA */
(function(){
  const VALID_SCREENS=new Set(['home','workout','coach','reports','profile']);
  let handlingPop=false;

  function currentScreen(){ return VALID_SCREENS.has(screen)?screen:'home'; }
  function navState(extra={}){ return {progressa:true,screen:currentScreen(),...extra}; }

  function ensureBaseHistory(){
    try{
      const s=history.state;
      if(!s?.progressa || !VALID_SCREENS.has(s.screen)){
        history.replaceState(navState({root:currentScreen()==='home'}),'',location.href);
      }
    }catch(error){ console.warn('Falha ao inicializar histórico do Progressa',error); }
  }

  const setScreenBeforeHistory=setScreen;
  setScreen=function(next){
    const target=VALID_SCREENS.has(next)?next:'home';
    if(target===currentScreen()){
      setScreenBeforeHistory(target);
      return;
    }
    document.getElementById('modal')?.remove();
    screen=target;
    try{ history.pushState(navState({root:target==='home'}),'',location.href); }
    catch(error){ console.warn('Falha ao registrar navegação',error); }
    renderApp();
    scrollTo(0,0);
  };

  const modalBeforeHistory=modal;
  modal=function(html){
    modalBeforeHistory(html);
    if(handlingPop)return;
    try{ history.pushState(navState({modal:true}),'',location.href); }
    catch(error){ console.warn('Falha ao registrar modal no histórico',error); }
  };

  const closeModalBeforeHistory=closeModal;
  closeModal=function(){
    const hasModal=!!document.getElementById('modal');
    if(!hasModal)return;
    if(!handlingPop && history.state?.progressa && history.state?.modal){
      history.back();
      return;
    }
    closeModalBeforeHistory();
  };

  window.addEventListener('popstate',event=>{
    if(!currentUser && !localStorage.getItem('emyfit_demo'))return;
    handlingPop=true;
    try{
      if(document.getElementById('modal')){
        closeModalBeforeHistory();
        return;
      }

      const target=event.state?.progressa && VALID_SCREENS.has(event.state.screen)
        ? event.state.screen
        : 'home';

      if(target!==currentScreen()){
        screen=target;
        renderApp();
        scrollTo(0,0);
        return;
      }

      if(!event.state?.progressa && currentScreen()!=='home'){
        screen='home';
        renderApp();
        scrollTo(0,0);
        try{ history.replaceState(navState({root:true}),'',location.href); }catch{}
      }
    }finally{
      setTimeout(()=>{handlingPop=false},0);
    }
  });

  const renderAppBeforeHistory=renderApp;
  renderApp=function(){
    const result=renderAppBeforeHistory();
    if(!handlingPop){
      try{
        const s=history.state;
        if(s?.progressa && !s.modal && s.screen!==currentScreen()){
          history.replaceState(navState({root:currentScreen()==='home'}),'',location.href);
        }
      }catch{}
    }
    return result;
  };

  ensureBaseHistory();
})();