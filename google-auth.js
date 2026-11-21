/* Progressa v7.3.1 — Google OAuth seguro com retorno direto ao APK */
(function(){
  const CALLBACK_URL='https://progressa-livid.vercel.app/auth-callback.html';
  const APP_CALLBACK_PREFIX='com.progressa.app://login-callback';
  const isNative=()=>!!window.Capacitor?.isNativePlatform?.();

  function setBusy(v,label){ if(typeof setAuthBusy==='function')setAuthBusy(v,label); }
  function setMsg(msg,type){ if(typeof setAuthMessage==='function')setAuthMessage(msg,type); }

  async function finishSession(data){
    currentUser=data?.session?.user||data?.user||null;
    if(currentUser){
      try{loadLocal();await syncDown()}catch(e){console.warn('Login concluído; sincronização pendente',e)}
      screen='home';authMessage='';renderRoot();
    }
  }

  async function consumeCallback(url){
    if(!url||!url.startsWith(APP_CALLBACK_PREFIX)||!cloud)return false;
    try{
      const u=new URL(url);
      const query=new URLSearchParams(u.search||'');
      const hash=new URLSearchParams((u.hash||'').replace(/^#/,''));
      const error=query.get('error_description')||query.get('error')||hash.get('error_description')||hash.get('error');
      if(error)throw new Error(decodeURIComponent(error));

      const code=query.get('code');
      if(code){
        const result=await cloud.auth.exchangeCodeForSession(code);
        if(result.error)throw result.error;
        await finishSession(result.data);
      }else{
        const accessToken=hash.get('access_token');
        const refreshToken=hash.get('refresh_token');
        if(!accessToken||!refreshToken)throw new Error('O retorno do Google não trouxe a sessão esperada.');
        const result=await cloud.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
        if(result.error)throw result.error;
        await finishSession(result.data);
      }

      try{await window.Capacitor?.Plugins?.Browser?.close?.()}catch{}
      setBusy(false);
      return true;
    }catch(error){
      console.warn('Falha ao concluir login Google',error);
      setBusy(false);
      setMsg(error?.message||'Não foi possível concluir o login Google.','dangerbox');
      return false;
    }
  }

  async function installNativeCallbackHandler(){
    if(!isNative())return;
    const App=window.Capacitor?.Plugins?.App;
    if(!App)return;
    try{
      await App.addListener('appUrlOpen',event=>{consumeCallback(event?.url)});
      const launch=await App.getLaunchUrl?.();
      if(launch?.url)consumeCallback(launch.url);
    }catch(error){
      console.warn('Não foi possível preparar retorno OAuth',error);
    }
  }

  async function nativeGoogleLogin(){
    const Browser=window.Capacitor?.Plugins?.Browser;
    if(!Browser)throw new Error('Navegador seguro do Android não foi carregado.');

    const result=await cloud.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo:CALLBACK_URL,
        skipBrowserRedirect:true,
        queryParams:{prompt:'select_account'}
      }
    });
    if(result.error)throw result.error;
    if(!result.data?.url)throw new Error('O Google não retornou a URL de autenticação.');

    await Browser.open({
      url:result.data.url,
      presentationStyle:'popover'
    });
  }

  async function webGoogleLogin(){
    const redirectTo=(location.origin+location.pathname).replace(/index\.html$/,'');
    const result=await cloud.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo,queryParams:{prompt:'select_account'}}
    });
    if(result.error)throw result.error;
  }

  async function googleLogin(){
    if(typeof cloud==='undefined'||!cloud){
      setMsg('A nuvem não está configurada.','dangerbox');return;
    }
    try{
      setMsg('Abrindo login seguro do Google…','notice');
      setBusy(true,'Conectando…');
      if(isNative())await nativeGoogleLogin();
      else await webGoogleLogin();
    }catch(error){
      console.warn('Falha no login Google',error);
      setBusy(false);
      setMsg(typeof friendlyAuthError==='function'?friendlyAuthError(error):(error?.message||'Não foi possível entrar com Google.'),'dangerbox');
    }
  }

  window.signInWithGoogle=googleLogin;
  installNativeCallbackHandler();
})();