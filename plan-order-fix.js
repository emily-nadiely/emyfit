/* Progressa v6.4.19 — alterna treinos superiores e inferiores no ciclo */
(function(){
  const VERSION='6.4.19';

  function dayType(day){
    const name=String(day?.name||'').toLocaleLowerCase('pt-BR');
    if(/perna|quadr[ií]ceps|gl[uú]te|posterior|panturrilha/.test(name))return 'lower';
    if(/peito|costas|ombro|b[ií]ceps|tr[ií]ceps|superior/.test(name))return 'upper';

    let upper=0,lower=0;
    for(const item of day?.exercises||[]){
      const groups=(typeof EX_GROUPS!=='undefined'&&EX_GROUPS[item.id])||[];
      for(const g of groups){
        if(['legs','glutes','calves'].includes(g))lower++;
        if(['back','chest','shoulders','arms'].includes(g))upper++;
      }
    }
    if(lower>upper)return 'lower';
    if(upper>lower)return 'upper';
    return 'other';
  }

  function alternatingDays(days){
    if(!Array.isArray(days)||days.length!==4)return {days,changed:false};

    const typed=days.map(day=>({day,type:dayType(day)}));
    const uppers=typed.filter(x=>x.type==='upper').map(x=>x.day);
    const lowers=typed.filter(x=>x.type==='lower').map(x=>x.day);
    if(uppers.length!==2||lowers.length!==2)return {days,changed:false};

    const currentTypes=typed.map(x=>x.type);
    const alreadyAlternating=currentTypes.every((type,i)=>i===0||type!==currentTypes[i-1]);
    if(alreadyAlternating)return {days,changed:false};

    const start=currentTypes[0]==='lower'?'lower':'upper';
    const result=[];
    for(let i=0;i<2;i++){
      if(start==='upper'){
        result.push(uppers[i],lowers[i]);
      }else{
        result.push(lowers[i],uppers[i]);
      }
    }

    const changed=result.some((day,i)=>day!==days[i]);
    return {days:result,changed};
  }

  function fixPlan(plan){
    if(!plan?.days)return false;
    const fixed=alternatingDays(plan.days);
    if(!fixed.changed)return false;
    plan.days=fixed.days;
    return true;
  }

  function markFix(){
    if(typeof state==='undefined')return;
    state.meta=state.meta||{};
    state.meta.planOrderFix=VERSION;
  }

  function persistFix(){
    try{
      if(typeof saveLocal==='function')saveLocal(false);
      if(typeof currentUser!=='undefined'&&currentUser&&typeof syncUp==='function'){
        clearTimeout(persistFix.timer);
        persistFix.timer=setTimeout(()=>syncUp().catch(()=>false),250);
      }
    }catch(error){console.warn('Falha ao salvar nova ordem do plano',error)}
  }

  if(typeof normalizeState==='function'){
    const normalizeStateBeforeV6419=normalizeState;
    normalizeState=function(){
      normalizeStateBeforeV6419();
      if(typeof state!=='undefined'&&fixPlan(state.plan)){markFix();}
    };
  }

  if(typeof generatePlan==='function'){
    const generatePlanBeforeV6419=generatePlan;
    generatePlan=function(profile){
      const plan=generatePlanBeforeV6419(profile);
      fixPlan(plan);
      return plan;
    };
  }

  if(typeof renderApp==='function'){
    const renderAppBeforeV6419=renderApp;
    renderApp=function(){
      if(typeof state!=='undefined'&&fixPlan(state.plan)){
        markFix();
        persistFix();
      }
      return renderAppBeforeV6419();
    };
  }

  try{
    if(typeof state!=='undefined'&&fixPlan(state.plan)){
      markFix();
      persistFix();
    }
  }catch(error){console.warn('Falha ao aplicar alternância superior/inferior',error)}
})();
