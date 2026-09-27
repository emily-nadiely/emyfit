/* Progressa v6.4.16 — ficha limpa + sequência real A/B/C/D por treino concluído */
(function(){
  const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();

  /* Remove os blocos de carga máxima/recorde/progressão da ficha em andamento.
     Mantém Favoritar/Evitar, séries, carga, repetições e demais controles do treino. */
  if(typeof activeExercise==='function'){
    const activeExerciseBeforeV6416=activeExercise;
    activeExercise=function(x,ei){
      const html=activeExerciseBeforeV6416(x,ei);
      try{
        const host=document.createElement('div');
        host.innerHTML=html;

        host.querySelectorAll('.exercise-progress-strip,.v6-insight').forEach(el=>el.remove());

        const labels=['última carga máx.','recorde pessoal','vs. sessão anterior','progressão recente','consolidação'];
        [...host.querySelectorAll('div,section,article')].forEach(el=>{
          const txt=normalize(el.textContent);
          if(!txt)return;
          const hasMetric=labels.some(label=>txt===label||txt.startsWith(label+' '));
          if(hasMetric&&txt.length<500)el.remove();
        });

        return host.innerHTML;
      }catch(error){
        console.warn('Falha ao limpar ficha do exercício',error);
        return html;
      }
    };
  }

  /* O ciclo só avança quando um treino do plano atual é realmente concluído.
     Dias sem treino e sessões somente de cardio não avançam A/B/C/D. */
  nextDay=function(){
    const days=Array.isArray(state?.plan?.days)?state.plan.days:[];
    if(!days.length)return undefined;

    const dayIndex=new Map(days.map((day,index)=>[String(day.id),index]));
    const sessions=Array.isArray(state?.sessions)?state.sessions:[];

    for(let i=sessions.length-1;i>=0;i--){
      const session=sessions[i];
      if(!session||session.sessionType==='cardio'||!session.dayId)continue;
      const index=dayIndex.get(String(session.dayId));
      if(index!==undefined)return days[(index+1)%days.length];
    }

    return days[0];
  };

  /* Fallback visual para conteúdo já renderizado/caches antigos. */
  function cleanupRenderedCard(){
    const app=document.getElementById('app');
    if(!app||!state?.active)return;
    app.querySelectorAll('.exercise-progress-strip,.v6-insight').forEach(el=>el.remove());
  }

  function scheduleCleanup(){
    clearTimeout(scheduleCleanup.timer);
    scheduleCleanup.timer=setTimeout(cleanupRenderedCard,0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleCleanup,{once:true});
  else scheduleCleanup();

  const observer=new MutationObserver(scheduleCleanup);
  const startObserver=()=>{
    const app=document.getElementById('app');
    if(app)observer.observe(app,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();
