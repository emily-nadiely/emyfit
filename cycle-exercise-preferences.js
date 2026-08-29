/* Progressa v6.4.5 — favoritos e evitados válidos por ciclo */
(function(){
  if(typeof EX==='undefined'||typeof exercisePrefs!=='function'||typeof exercisePreferenceControls!=='function')return;

  const generatePlanBeforeCyclePrefs=typeof generatePlan==='function'?generatePlan:null;
  const normalizeStateBeforeCyclePrefs=typeof normalizeState==='function'?normalizeState:null;

  const planKey=plan=>String(plan?.id||plan?.createdAt||'sem-plano');
  const uniq=list=>[...new Set((Array.isArray(list)?list:[]).filter(id=>EX[id]))];
  const nowIso=()=>new Date().toISOString();

  function sanitizePrefs(){
    if(!state.profile)return {favorite:[],avoid:[]};
    const current=state.profile.exercisePrefs||{favorite:[],avoid:[]};
    const favorite=uniq(current.favorite),avoid=uniq(current.avoid).filter(id=>!favorite.includes(id));
    state.profile.exercisePrefs={favorite,avoid};
    return state.profile.exercisePrefs;
  }

  function archiveCycle(cycle,prefs){
    if(!cycle||!cycle.planId||cycle.planId==='__generating__')return;
    state.meta=state.meta||{};
    state.meta.exercisePreferenceHistory=Array.isArray(state.meta.exercisePreferenceHistory)?state.meta.exercisePreferenceHistory:[];
    const hasChoice=(prefs.favorite||[]).length||(prefs.avoid||[]).length||(cycle.decided||[]).length;
    if(!hasChoice)return;
    state.meta.exercisePreferenceHistory.push({planId:cycle.planId,startedAt:cycle.startedAt||null,endedAt:nowIso(),favorite:[...(prefs.favorite||[])],avoid:[...(prefs.avoid||[])],decided:[...(cycle.decided||[])]});
    state.meta.exercisePreferenceHistory=state.meta.exercisePreferenceHistory.slice(-12);
  }

  function ensureCycleState(){
    if(!state.profile)return {planId:planKey(state.plan),startedAt:nowIso(),decided:[]};
    state.meta=state.meta||{};
    const prefs=sanitizePrefs(),currentPlan=planKey(state.plan),cycle=state.meta.exercisePreferenceCycle;
    if(!cycle){
      state.meta.exercisePreferenceCycle={planId:currentPlan,startedAt:nowIso(),decided:uniq([...(prefs.favorite||[]),...(prefs.avoid||[])])};
    }else if(cycle.planId!==currentPlan&&cycle.planId!=='__generating__'){
      archiveCycle(cycle,prefs);
      state.profile.exercisePrefs={favorite:[],avoid:[]};
      state.meta.exercisePreferenceCycle={planId:currentPlan,startedAt:nowIso(),decided:[]};
    }else{
      cycle.decided=uniq(cycle.decided);
    }
    return state.meta.exercisePreferenceCycle;
  }

  function rememberDecision(id){
    const cycle=ensureCycleState();
    cycle.decided=uniq([...(cycle.decided||[]),id]);
  }

  function removeDecision(id){
    const cycle=ensureCycleState();
    cycle.decided=(cycle.decided||[]).filter(x=>x!==id);
  }

  function equipmentOk(id){
    try{return typeof equipmentAllowed!=='function'||equipmentAllowed(id,state.profile||{})}catch{return true}
  }

  function safetyOk(id){
    try{return typeof blocked!=='function'||!blocked(EX[id])}catch{return true}
  }

  function shared(a,b){const set=new Set(b||[]);return (a||[]).reduce((n,x)=>n+(set.has(x)?1:0),0)}

  function fallbackReplacement(avoidId,day,index){
    const original=EX[avoidId];if(!original)return null;
    const prefs=sanitizePrefs(),used=new Set((day?.exercises||[]).map((x,i)=>i===index?null:x.id).filter(Boolean));
    const previousIds=new Set((state.plan?.days||[]).flatMap(d=>(d.exercises||[]).map(x=>x.id)));
    try{
      if(typeof smartReplacementFor==='function'){
        const smart=smartReplacementFor(avoidId,used,state.profile||{},previousIds);
        if(smart&&EX[smart]&&!prefs.avoid.includes(smart)&&equipmentOk(smart)&&safetyOk(smart))return smart;
      }
    }catch{}
    const originalGroups=typeof EX_GROUPS!=='undefined'?(EX_GROUPS[avoidId]||[]):[];
    return Object.keys(EX).map(id=>{
      const e=EX[id];if(id===avoidId||used.has(id)||prefs.avoid.includes(id)||!equipmentOk(id)||!safetyOk(id))return null;
      let score=0;if(e.pattern===original.pattern)score+=18;if(e.category===original.category)score+=14;score+=shared(e.primary,original.primary)*7;
      if(typeof EX_GROUPS!=='undefined')score+=shared(EX_GROUPS[id]||[],originalGroups)*8;
      if(prefs.favorite.includes(id))score+=10;if((original.subs||[]).includes(id))score+=20;
      return {id,score};
    }).filter(Boolean).sort((a,b)=>b.score-a.score)[0]?.id||null;
  }

  function lockFavoriteInPlan(id,locked=true){
    for(const day of state.plan?.days||[]){
      if(!(day.exercises||[]).some(x=>x.id===id))continue;
      let locks=uniq(day.lockedExerciseIds);
      if(locked&&!locks.includes(id))locks.push(id);
      if(!locked)locks=locks.filter(x=>x!==id);
      day.lockedExerciseIds=locks;
    }
  }

  function removeAvoidedFromUpcomingPlan(id){
    for(const day of state.plan?.days||[]){
      if(!Array.isArray(day.exercises))continue;
      for(let i=day.exercises.length-1;i>=0;i--){
        const item=day.exercises[i];if(item?.id!==id)continue;
        const replacement=fallbackReplacement(id,day,i);
        if(replacement&&EX[replacement]){
          const e=EX[replacement];
          day.exercises[i]={...item,id:replacement,reps:e.reps||item.reps,rest:e.rest||item.rest,reason:`Substituído nesta rodada porque ${EX[id]?.name||'o exercício anterior'} foi marcado para evitar.`};
        }else day.exercises.splice(i,1);
      }
      day.lockedExerciseIds=uniq(day.lockedExerciseIds).filter(x=>x!==id&&day.exercises.some(e=>e.id===x));
    }
  }

  function setPreference(id,type,toggle=false){
    if(!state.profile||!EX[id])return;
    ensureCycleState();
    const prefs=sanitizePrefs();let favorite=[...prefs.favorite],avoid=[...prefs.avoid];
    const already=type==='favorite'?favorite.includes(id):avoid.includes(id);
    if(toggle&&already){
      if(type==='favorite'){favorite=favorite.filter(x=>x!==id);lockFavoriteInPlan(id,false)}else avoid=avoid.filter(x=>x!==id);
      state.profile.exercisePrefs={favorite,avoid};removeDecision(id);saveLocal();return {active:false,type};
    }
    if(type==='favorite'){
      favorite=uniq([...favorite,id]);avoid=avoid.filter(x=>x!==id);lockFavoriteInPlan(id,true);
    }else{
      avoid=uniq([...avoid,id]);favorite=favorite.filter(x=>x!==id);lockFavoriteInPlan(id,false);removeAvoidedFromUpcomingPlan(id);
    }
    state.profile.exercisePrefs={favorite,avoid};rememberDecision(id);saveLocal();return {active:true,type};
  }

  const exercisePrefsBeforeCycle=exercisePrefs;
  exercisePrefs=function(){ensureCycleState();return state.profile?.exercisePrefs||exercisePrefsBeforeCycle()||{favorite:[],avoid:[]}};

  exercisePreferenceControls=function(id){
    ensureCycleState();
    const status=typeof exercisePrefState==='function'?exercisePrefState(id):'neutral';
    if(status==='favorite'||status==='avoid')return '';
    return `<div class="exercise-pref-row"><button type="button" class="pref-btn favorite" onclick="toggleExercisePreference('${id}','favorite')">☆ Favoritar</button><button type="button" class="pref-btn avoid" onclick="toggleExercisePreference('${id}','avoid')">Evitar exercício</button></div>`;
  };

  toggleExercisePreference=function(id,type){
    const result=setPreference(id,type,false);if(!result)return;
    renderApp();
    toast(type==='favorite'?'Favoritado nesta rodada. Ele será priorizado e você não precisará avaliar de novo até o próximo ciclo.':'Marcado para evitar nesta rodada. Ele foi retirado dos próximos treinos deste ciclo.');
  };

  toggleExercisePreferenceModal=function(id,type){
    const result=setPreference(id,type,true);if(!result)return;
    renderExercisePreferenceList(document.getElementById('exercisePrefSearch')?.value||'');
  };

  const exercisePreferencesModalBeforeCycle=typeof exercisePreferencesModal==='function'?exercisePreferencesModal:null;
  exercisePreferencesModal=function(){
    ensureCycleState();
    const p=sanitizePrefs(),cycle=state.meta?.exercisePreferenceCycle;
    modal(`<span class="eyebrow">PREFERÊNCIAS DA RODADA</span><h2>Favoritos e exercícios evitados</h2><p class="muted small">Estas escolhas valem somente para o ciclo atual. Favoritos ficam priorizados; evitados saem dos próximos treinos. No próximo ciclo, a avaliação começa novamente.</p><div class="v6-kpi-grid"><div class="v6-kpi"><b>${p.favorite.length}</b><span>favoritos nesta rodada</span></div><div class="v6-kpi"><b>${p.avoid.length}</b><span>evitados nesta rodada</span></div></div><label>Procurar exercício</label><input id="exercisePrefSearch" type="search" placeholder="Digite o nome" oninput="renderExercisePreferenceList(this.value)"><div id="exercisePrefList" class="pref-list"></div><p class="muted small" style="margin-top:12px">Rodada atual: ${String(cycle?.planId||'—').slice(0,8)}</p>`);setTimeout(()=>renderExercisePreferenceList(''),0);
  };

  if(generatePlanBeforeCyclePrefs){
    generatePlan=function(profile){
      if(state?.plan&&state?.profile){
        const prefs=sanitizePrefs(),cycle=ensureCycleState();archiveCycle(cycle,prefs);
        state.profile.exercisePrefs={favorite:[],avoid:[]};
        if(profile&&typeof profile==='object')profile.exercisePrefs={favorite:[],avoid:[]};
        state.meta.exercisePreferenceCycle={planId:'__generating__',startedAt:nowIso(),decided:[]};
      }
      const plan=generatePlanBeforeCyclePrefs(profile);
      if(state?.meta?.exercisePreferenceCycle?.planId==='__generating__')state.meta.exercisePreferenceCycle.planId=planKey(plan);
      return plan;
    };
  }

  if(normalizeStateBeforeCyclePrefs){
    normalizeState=function(){normalizeStateBeforeCyclePrefs();ensureCycleState()};
  }

  ensureCycleState();
})();
