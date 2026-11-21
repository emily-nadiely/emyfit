/* Progressa v7.2.6 — limpa estado Google antes de cada login */
(function(){
  const WEB_CLIENT_ID='677709943693-m19523hrbn2ebe6t66lb7gicpieeh8rb.apps.googleusercontent.com';
  const isNative=()=>!!window.Capacitor?.isNativePlatform?.();

  function setBusy(v,label){
    if(typeof setAuthBusy==='function')setAuthBusy(v,label);
  }
  function setMsg(msg,type){
    if(typeof setAuthMessage==='function')setAuthMessage(msg,type);
  }
  async function sha256Hex(value){
    const bytes=new TextEncoder().encode(value);
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function randomNonce(){
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    let s=''; for(const b of bytes)s+=String.fromCharCode(b);
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  async function finishSession(data){
    currentUser=data?.session?.user||data?.user||null;
    if(currentUser){
      try{loadLocal();await syncDown()}catch(e){console.warn('Login concluído; sincronização pendente',e)}
      screen='home'; authMessage=''; renderRoot();
    }
  }
  async function nativeGoogleLogin(){
    const GoogleSignIn=window.Capacitor?.Plugins?.GoogleSignIn;
    if(!GoogleSignIn)throw new Error('Google Sign-In nativo não foi carregado.');
    await GoogleSignIn.initialize({clientId:WEB_CLIENT_ID});
    try{ await GoogleSignIn.signOut(); }catch{}
    const rawNonce=randomNonce();
    const hashedNonce=await sha256Hex(rawNonce);
    let google;
    try{
      google=await GoogleSignIn.signIn({nonce:hashedNonce});
    }catch(firstError){
      const msg=String(firstError?.message||firstError||'');
      if(msg.includes('[16]')||/reauth failed/i.test(msg)){
        try{await GoogleSignIn.signOut();}catch{}
        await GoogleSignIn.initialize({clientId:WEB_CLIENT_ID});
        google=await GoogleSignIn.signIn({nonce:hashedNonce});
      }else{
        throw firstError;
      }
    }
    if(!google?.idToken)throw new Error('O Google não retornou um token de identidade.');
    const result=await cloud.auth.signInWithIdToken({
      provider:'google',
      token:google.idToken,
      nonce:rawNonce
    });
    if(result.error)throw result.error;
    await finishSession(result.data);
  }
  async function webGoogleLogin(){
    const redirectTo=(location.origin+location.pathname).replace(/index\.html$/,'');
    const result=await cloud.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if(result.error)throw result.error;
    if(result.data?.url)location.href=result.data.url;
  }
  async function googleLogin(){
    if(typeof cloud==='undefined'||!cloud){
      setMsg('A nuvem não está configurada.','dangerbox');return;
    }
    try{
      setMsg(isNative()?'Abrindo sua conta Google…':'Abrindo login seguro do Google…','notice');
      setBusy(true,'Conectando…');
      if(isNative())await nativeGoogleLogin();
      else await webGoogleLogin();
    }catch(error){
      console.warn('Falha no login Google',error);
      const raw=String(error?.message||error||'');
      const friendly=/\[16\]|reauth failed/i.test(raw)
        ? 'O Google não conseguiu validar esta instalação do Progressa. Atualize a autorização do app no Google e tente novamente.'
        : (typeof friendlyAuthError==='function'?friendlyAuthError(error):(error.message||'Não foi possível entrar com Google.'));
      setMsg(friendly,'dangerbox');
    }finally{
      setBusy(false);
    }
  }
  window.signInWithGoogle=googleLogin;
})();