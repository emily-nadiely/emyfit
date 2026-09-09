/* Progressa v6.4.12 — simplifica o card do treino em andamento */
(function(){
  const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
  const METRIC_LABELS=['Última carga máx.','Recorde pessoal','Vs. sessão anterior'];

  function exactText(root,text){
    const wanted=normalize(text);
    return [...root.querySelectorAll('div,span,p,b,strong,label,h1,h2,h3,h4,h5,h6')]
      .find(el=>normalize(el.textContent)===wanted)||null;
  }

  function isExerciseCardBoundary(el){
    if(!el)return false;
    const text=normalize(el.textContent);
    return text.includes('trocar exercício')&&text.includes('adicionar série');
  }

  function smallestGroup(root,labels){
    const first=exactText(root,labels[0]);
    if(!first)return null;
    let node=first.parentElement;
    while(node&&node!==root){
      const text=normalize(node.textContent);
      if(labels.every(label=>text.includes(normalize(label))))return node;
      if(isExerciseCardBoundary(node))break;
      node=node.parentElement;
    }
    return null;
  }

  function hideSingleMetric(root,label){
    const found=exactText(root,label);
    if(!found)return;
    let node=found;
    let candidate=found.parentElement;
    while(node.parentElement&&node.parentElement!==root){
      node=node.parentElement;
      if(isExerciseCardBoundary(node))break;
      const text=normalize(node.textContent);
      if(text.includes(normalize(label))&&text.length<120)candidate=node;
    }
    if(candidate)candidate.style.display='none';
  }

  function hideConsolidation(root){
    const found=exactText(root,'Consolidação');
    if(!found)return;
    let node=found;
    let candidate=found.parentElement;
    while(node.parentElement&&node.parentElement!==root){
      node=node.parentElement;
      if(isExerciseCardBoundary(node))break;
      const text=normalize(node.textContent);
      if(text.includes('consolidação')&&text.length<420)candidate=node;
    }
    if(candidate)candidate.style.display='none';
  }

  function cleanupWorkoutCard(){
    const app=document.getElementById('app');
    if(!app)return;
    if(typeof state!=='undefined'&&!state?.active)return;

    const metrics=smallestGroup(app,METRIC_LABELS);
    if(metrics)metrics.style.display='none';
    else METRIC_LABELS.forEach(label=>hideSingleMetric(app,label));

    hideConsolidation(app);
  }

  function scheduleCleanup(){
    clearTimeout(scheduleCleanup.timer);
    scheduleCleanup.timer=setTimeout(cleanupWorkoutCard,0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleCleanup,{once:true});
  else scheduleCleanup();

  const appObserver=new MutationObserver(scheduleCleanup);
  const startObserver=()=>{
    const app=document.getElementById('app');
    if(app)appObserver.observe(app,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();
