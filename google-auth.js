/* Progressa v6.5.2 — Login com Google */
(function(){
  async function googleLogin(){
    if(typeof cloud==='undefined'||!cloud){
      if(typeof setAuthMessage==='function')setAuthMessage('A nuvem não está configurada.','dangerbox');
      return;
    }
    try{
      if(typeof setAuthMessage==='function')setAuthMessage('Abrindo login do Google…','notice');
      if(typeof setAuthBusy==='function')setAuthBusy(true,'Conectando…');
      const redirectTo=(location.origin+location.pathname).replace(/index\.html$/,'');
      const result=await cloud.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo}
      });
      if(result.error){
        if(typeof setAuthMessage==='function')setAuthMessage(
          typeof friendlyAuthError==='function'?friendlyAuthError(result.error):result.error.message,
          'dangerbox'
        );
        if(typeof setAuthBusy==='function')setAuthBusy(false);
        return;
      }
      if(result.data&&result.data.url)location.href=result.data.url;
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

  if(typeof renderAuth!=='function')return;
  const originalRenderAuth=renderAuth;
  renderAuth=function(){
    originalRenderAuth();
    const form=document.querySelector('.auth-card form');
    if(!form||document.querySelector('.google-auth-btn'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='btn secondary block google-auth-btn';
    button.innerHTML='<span class="google-g">G</span><span>Continuar com Google</span>';
    button.addEventListener('click',googleLogin);

    const divider=document.createElement('div');
    divider.className='auth-divider';
    divider.innerHTML='<span>ou</span>';

    form.parentNode.insertBefore(divider,form);
    form.parentNode.insertBefore(button,divider);
  };

  if(!document.querySelector('.app-shell'))renderAuth();
})();