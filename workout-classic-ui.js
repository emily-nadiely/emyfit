/* Progressa v6.4.12 — interface de treino simplificada (modelo clássico) */
(function(){
  if(typeof workoutScreen!=='function')return;

  const workoutScreenBeforeClassicUi=workoutScreen;
  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function leafByText(root,text){
    return [...root.querySelectorAll('*')].find(el=>el.children.length===0&&norm(el.textContent)===text)||null;
  }

  function removeCompactAncestor(node,maxLength){
    if(!node)return;
    let current=node.parentElement,candidate=null;
    while(current&&current.parentElement){
      const text=norm(current.textContent);
      if(!text||text.length>maxLength)break;
      candidate=current;
      current=current.parentElement;
    }
    (candidate||node.parentElement||node).remove();
  }

  function stripPerformanceSummary(root){
    const first=leafByText(root,'Última carga máx.');
    if(first){
      let current=first.parentElement,candidate=null;
      while(current&&current!==root){
        const text=norm(current.textContent);
        const hasLast=text.includes('Última carga máx.');
        const hasPr=text.includes('Recorde pessoal');
        const hasPrev=text.includes('Vs. sessão anterior');
        if(text.length<=180&&(hasLast||hasPr||hasPrev))candidate=current;
        if(hasLast&&hasPr&&hasPrev&&text.length<=180){candidate=current;break;}
        current=current.parentElement;
      }
      if(candidate)candidate.remove();
      else removeCompactAncestor(first,90);
    }
    ['Recorde pessoal','Vs. sessão anterior'].forEach(label=>{
      const node=leafByText(root,label);
      if(node)removeCompactAncestor(node,90);
    });
  }

  function stripGuidanceBox(root){
    const headings=['Consolidação','Progressão','Manutenção','Regressão'];
    headings.forEach(title=>{
      const node=leafByText(root,title);
      if(!node)return;
      let current=node.parentElement,candidate=null;
      while(current&&current!==root){
        const text=norm(current.textContent);
        if(text.length<=320)candidate=current;
        else break;
        current=current.parentElement;
      }
      if(candidate)candidate.remove();
    });
  }

  function simplifyWorkoutHtml(html){
    try{
      const host=document.createElement('div');
      host.innerHTML=html;
      stripPerformanceSummary(host);
      stripGuidanceBox(host);
      return host.innerHTML;
    }catch(error){
      console.warn('Falha ao aplicar interface clássica do treino',error);
      return html;
    }
  }

  workoutScreen=function(){
    const html=workoutScreenBeforeClassicUi.apply(this,arguments);
    if(!state?.active||state.active.mode==='cardio')return html;
    return simplifyWorkoutHtml(html);
  };
})();
