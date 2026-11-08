/* Progressa v6.5.0 — suporte de instalação e execução em Android/iOS */
(function(){
  const ua=navigator.userAgent||'';
  const isiOS=/iPad|iPhone|iPod/.test(ua)||(
    navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1
  );
  const isAndroid=/Android/i.test(ua);
  const isStandalone=window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;
  let deferredPrompt=null;

  function osName(){
    if(isiOS)return 'iOS';
    if(isAndroid)return 'Android';
    return 'Web';
  }

  window.PROGRESSA_MOBILE={
    isiOS,isAndroid,isStandalone,platform:osName()
  };

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    window.PROGRESSA_MOBILE.canPromptInstall=true;
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    window.PROGRESSA_MOBILE.canPromptInstall=false;
    try{localStorage.setItem('progressa_installed','1')}catch{}
    if(typeof toast==='function')toast('Progressa instalado com sucesso.');
  });

  function iosInstructions(){
    return '<div class="mobile-install-steps">'+
      '<div><b>1.</b><span>Abra o Progressa no <b>Safari</b>.</span></div>'+
      '<div><b>2.</b><span>Toque no botão <b>Compartilhar</b> do Safari.</span></div>'+
      '<div><b>3.</b><span>Escolha <b>Adicionar à Tela de Início</b>.</span></div>'+
      '<div><b>4.</b><span>Confirme em <b>Adicionar</b>. O Progressa abre como aplicativo.</span></div>'+
      '</div>';
  }

  function androidInstructions(){
    return '<div class="mobile-install-steps">'+
      '<div><b>1.</b><span>Abra o Progressa no <b>Chrome</b>.</span></div>'+
      '<div><b>2.</b><span>Toque em <b>Instalar Progressa</b> abaixo.</span></div>'+
      '<div><b>3.</b><span>Se o botão não aparecer, use o menu ⋮ do Chrome e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span></div>'+
      '</div>';
  }

  window.installProgressaApp=async function(){
    if(isStandalone){
      if(typeof toast==='function')toast('O Progressa já está instalado.');
      return;
    }
    if(isiOS){
      if(typeof modal==='function')modal(
        '<span class="eyebrow">INSTALAR NO IPHONE/IPAD</span>'+
        '<h2>Adicionar o Progressa à Tela de Início</h2>'+
        '<p class="muted">No iOS, a instalação é feita pelo Safari.</p>'+
        iosInstructions()
      );
      return;
    }
    if(deferredPrompt){
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>null);
      deferredPrompt=null;
      if(choice?.outcome==='accepted'&&typeof toast==='function')toast('Instalação iniciada.');
      return;
    }
    if(typeof modal==='function')modal(
      '<span class="eyebrow">INSTALAR NO ANDROID</span>'+
      '<h2>Instalar o Progressa</h2>'+
      '<p class="muted">Use o Chrome para instalar como aplicativo.</p>'+
      androidInstructions()
    );
  };

  function platformCard(){
    const installed=isStandalone;
    const status=installed?'Instalado':'Disponível para instalar';
    const title=isiOS?'iPhone / iPad':isAndroid?'Android':'Celular';
    return '<div class="card mobile-platform-card" data-mobile-platform-card="1">'+
      '<div class="row between mobile-platform-head">'+
        '<div><span class="eyebrow">APP NO CELULAR</span><h3>'+title+'</h3>'+
        '<p class="muted small">'+(installed?'Você está usando o Progressa no modo aplicativo.':'Instale o Progressa para abrir em tela cheia e usar como um app.')+'</p></div>'+
        '<span class="pill '+(installed?'good':'')+'">'+status+'</span>'+
      '</div>'+
      (!installed?'<button class="btn primary block" onclick="installProgressaApp()">Instalar Progressa</button>':'')+
      '<div class="mobile-platform-badges"><span>✓ Android</span><span>✓ iOS/iPadOS</span><span>✓ PWA</span></div>'+
    '</div>';
  }

  if(typeof profileScreen==='function'){
    const before=profileScreen;
    profileScreen=function(){
      const html=before();
      if(html.includes('data-mobile-platform-card'))return html;
      try{
        const host=document.createElement('div');host.innerHTML=html;
        const hero=[...host.children].find(el=>el.tagName==='SECTION'&&el.classList?.contains('hero'));
        const card=document.createElement('div');
        card.innerHTML=platformCard();
        const node=card.firstElementChild;
        if(hero)hero.insertAdjacentElement('afterend',node);
        else host.prepend(node);
        return host.innerHTML;
      }catch{return platformCard()+html}
    };
  }

  // Corrige altura real em navegadores móveis e iOS com barras dinâmicas.
  function syncViewport(){
    document.documentElement.style.setProperty('--app-vh',(window.innerHeight*0.01)+'px');
  }
  syncViewport();
  window.addEventListener('resize',syncViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});

  // Mantém o app acordado durante treino quando a API estiver disponível.
  let wakeLock=null;
  async function requestWakeLock(){
    try{
      if(document.visibilityState==='visible'&&typeof state!=='undefined'&&state?.active&&navigator.wakeLock){
        wakeLock=await navigator.wakeLock.request('screen');
      }
    }catch{}
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')requestWakeLock()});
  document.addEventListener('click',requestWakeLock,{once:true,passive:true});
})();