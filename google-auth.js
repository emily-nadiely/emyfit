/* Progressa v7.2.3 — Google OAuth mobile com retorno nativo ao APK */
(function(){
  const NATIVE_REDIRECT='com.progressa.app://login-callback';
  const isNative=()=>!!window.Capacitor?.isNativePlatform?.();

  async function finishNativeGoogleLogin(url){
    try{
      if(!url||!url.startsWith(NATIVE_REDIRECT))return;
      const Browser=window.Capacitor?.Plugins?.Browser;
      try{await Browser?.close?.()}catch{}
      const parsed=new URL(url);
      const hashParams=new URLSearchParams((parsed.hash||'').replace(/^#/,''));
      const queryParams=parsed.searchParams;
      const error=queryParams.get('error_description')||hashParams.get('error_description')||queryParams.get('error')||hashParams.get('error');
      if(error)throw new Error(decodeURIComponent(error));

      const accessToken=hashParams.get('access_token')||queryParams.get('access_token');
      const refreshToken=hashParams.get('refresh_token')||queryParams.get('refresh_token');
      const code=queryParams.get('code');

      let result;
      if(accessToken&&refreshToken){
        result=await cloud.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      }else if(code&&cloud.auth.exchangeCodeForSession){
        result=await cloud.auth.exchangeCodeForSession(code);
      }else{
        throw new Error('O Google retornou ao Progressa sem os dados de sessão.');
      }
      if(result?.error)throw result.error;
      const session=result?.data?.session;
      currentUser=session?.user||result?.data?.user||null;
      if(typeof setAuthBusy==='function')setAuthBusy(false);
      if(typeof setAuthMessage==='function')setAuthMessage('Login Google concluído.','success');
      if(currentUser){
        try{loadLocal();await syncDown()}catch(syncError){console.warn('Login concluído; sincronização pendente',syncError)}
        screen='home';
        authMessage='';
        renderRoot();
      }
    }catch(error){
      console.warn('Falha ao concluir login Google nativo',error);
      if(typeof setAuthBusy==='function')setAuthBusy(false);
      if(typeof setAuthMessage==='function')setAuthMessage(
        typeof friendlyAuthError==='function'?friendlyAuthError(error):(error.message||'Não foi possível concluir o login com Google.'),
        'dangerbox'
      );
    }
  }

  function installNativeCallback(){
    if(!isNative())return;
    const App=window.Capacitor?.Plugins?.App;
    if(!App?.addListener)return;
    App.addListener('appUrlOpen',event=>finishNativeGoogleLogin(event?.url));
    App.getLaunchUrl?.().then(result=>{if(result?.url)finishNativeGoogleLogin(result.url)}).catch(()=>{});
  }

  async function googleLogin(){
    if(typeof cloud==='undefined'||!cloud){
      if(typeof setAuthMessage==='function')setAuthMessage('A nuvem não está configurada.','dangerbox');
      return;
    }
    try{
      if(typeof setAuthMessage==='function')setAuthMessage('Abrindo login seguro do Google…','notice');
      if(typeof setAuthBusy==='function')setAuthBusy(true,'Conectando…');

      if(isNative()){
        const result=await cloud.auth.signInWithOAuth({
          provider:'google',
          options:{redirectTo:NATIVE_REDIRECT,skipBrowserRedirect:true}
        });
        if(result.error)throw result.error;
        if(!result.data?.url)throw new Error('Não foi possível iniciar o login do Google.');
        const Browser=window.Capacitor?.Plugins?.Browser;
        if(Browser?.open)await Browser.open({url:result.data.url});
        else location.href=result.data.url;
        return;
      }

      const redirectTo=(location.origin+location.pathname).replace(/index\.html$/,'');
      const result=await cloud.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
      if(result.error)throw result.error;
      if(result.data?.url)location.href=result.data.url;
    }catch(error){
      console.warn('Falha no login Google',error);
      if(typeof setAuthMessage==='function')setAuthMessage(
        typeof friendlyAuthError==='function'?friendlyAuthError(error):(error.message||'Não foi possível entrar com Google.'),
        'dangerbox'
      );
      if(typeof setAuthBusy==='function')setAuthBusy(false);
    }
  }

  window.signInWithGoogle=googleLogin;
  installNativeCallback();
})();
