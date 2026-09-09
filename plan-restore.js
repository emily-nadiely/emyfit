/* Progressa v6.4.8 — backup e restauração do plano anterior */
(function(){
  if(typeof state==='undefined'||typeof EX==='undefined'||typeof workoutScreen!=='function')return;

  const deepClone=value=>JSON.parse(JSON.stringify(value));
  const escRestore=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const nowIso=()=>new Date().toISOString();
  const planSig=plan=>JSON.stringify((plan?.days||[]).map(day=>({name:day.name,ex:(day.exercises||[]).map(x=>[x.id,+x.sets||0,x.reps||''])})));

  function ensureRestoreMeta(){
    state.meta=state.meta||{};
    state.meta.planBackups=Array.isArray(state.meta.planBackups)?state.meta.planBackups:[];
    state.meta.planRestoreHistory=Array.isArray(state.meta.planRestoreHistory)?state.meta.planRestoreHistory:[];
    return state.meta;
  }

  function backupCurrentPlan(reason='plan_change'){
    if(!state.plan?.days?.length||state.active)return null;
    const meta=ensureRestoreMeta(),signature=planSig(state.plan),last=meta.planBackups.at(-1);
    if(last?.signature===signature&&Date.now()-new Date(last.at||0).getTime()<60000)return last;
    const backup={id:typeof uid==='function'?uid():String(Date.now()),at:nowIso(),reason,signature,plan:deepClone(state.plan)};
    meta.planBackups.push(backup);meta.planBackups=meta.planBackups.slice(-8);return backup;
  }

  function planItemFromId(id,day){
    const existing=(day?.exercises||[]).find(x=>x.id===id);if(existing)return deepClone(existing);
    const e=EX[id];if(!e)return null;
    return {id,sets:+e.sets||3,reps:e.reps||'10–15',rest:+e.rest||75,reason:e.why||'Recuperado do plano anterior.'};
  }

  function candidateFromBackup(){
    const backups=ensureRestoreMeta().planBackups,current=planSig(state.plan);
    for(let i=backups.length-1;i>=0;i--){
      const b=backups[i];if(b?.plan?.days?.length&&b.signature!==current)return {kind:'backup',title:'Cópia exata do plano anterior',detail:'O Progressa salvou este plano antes da última alteração.',at:b.at,plan:deepClone(b.plan),sourceId:b.id,confidence:'exact'};
    }
    return null;
  }

  function candidateFromPlanChanges(){
    const changes=(state.meta?.planChanges||[]).filter(x=>x&&x.at&&Array.isArray(x.before)&&x.before.length).slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
    if(!changes.length||!state.plan?.days?.length)return null;
    const latest=changes.find(x=>x.type==='evolve_cycle_day'||x.type==='regenerate_day');if(!latest)return null;
    const age=Date.now()-new Date(latest.at).getTime();if(!Number.isFinite(age)||age>1000*60*60*24*14)return null;
    const plan=deepClone(state.plan),targetTime=new Date(latest.at).getTime();
    let batch=[];
    if(latest.type==='evolve_cycle_day')batch=changes.filter(x=>x.type==='evolve_cycle_day'&&Math.abs(new Date(x.at).getTime()-targetTime)<=120000);
    else batch=[latest];
    let restored=0;
    for(const change of batch){
      const day=(plan.days||[]).find(d=>d.id===change.dayId);if(!day)continue;
      const items=change.before.map(id=>planItemFromId(id,day)).filter(Boolean);if(!items.length)continue;
      day.exercises=items;day.lockedExerciseIds=[];restored++;
    }
    if(!restored)return null;
    return {kind:'changes',title:latest.type==='evolve_cycle_day'?'Plano antes da evolução':'Treino antes de “Outra opção”',detail:`Recuperei ${restored} treino${restored===1?'':'s'} a partir do registro de alterações.`,at:latest.at,plan,sourceId:latest.id,confidence:'high'};
  }

  function candidateFromSessions(){
    if(!state.plan?.days?.length)return null;
    const currentStart=String(state.plan.createdAt||'');
    const sessions=(state.sessions||[]).filter(s=>Array.isArray(s.exercises)&&s.exercises.length&&(!currentStart||String(s.date||'')<currentStart)).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if(!sessions.length)return null;
    const wanted=Math.max(2,+state.profile?.days||state.plan.days.length||3),seen=new Set(),picked=[];
    for(const s of sessions){const key=s.dayId||s.name;if(!key||seen.has(key))continue;seen.add(key);picked.push(s);if(picked.length>=wanted)break;}
    if(!picked.length)return null;
    picked.reverse();
    const days=picked.map((s,index)=>({
      id:s.dayId||((typeof uid==='function'?uid():String(Date.now()+index))),name:s.name||`Treino ${index+1}`,
      exercises:(s.exercises||[]).map(ex=>{const e=EX[ex.id];if(!e)return null;return {id:ex.id,sets:Math.max(1,(ex.sets||[]).length||+e.sets||3),reps:e.reps||'10–15',rest:+e.rest||75,reason:e.why||'Recuperado do histórico anterior.'}}).filter(Boolean),
      cardio:+s.cardio||0,cardioType:s.cardioType||'bike_h',cardioOptions:[s.cardioType||'bike_h','treadmill','elliptical','bike_h','bike_v'].filter((v,i,a)=>a.indexOf(v)===i),lockedExerciseIds:[]
    })).filter(d=>d.exercises.length);
    if(!days.length)return null;
    const plan={...deepClone(state.plan),days,name:`${state.plan.name||'Plano'} — restaurado`,createdAt:today(),cycleWeeks:state.plan.cycleWeeks||6,status:'active'};
    return {kind:'sessions',title:'Plano recuperado pelo histórico',detail:`Encontrei ${days.length} treino${days.length===1?'':'s'} do ciclo anterior no histórico. Confira a lista antes de restaurar.`,at:picked.at(-1)?.date||'',plan,sourceId:'sessions',confidence:'recovered'};
  }

  function getRestoreCandidate(){return candidateFromBackup()||candidateFromPlanChanges()||candidateFromSessions()}
  window.hasPreviousPlanToRestore=function(){return !!getRestoreCandidate()};

  function previewDay(day,index){
    return `<div class="card flat"><div class="row between"><div><span class="eyebrow">DIA ${index+1}</span><h3>${escRestore(day.name||`Treino ${index+1}`)}</h3></div><span class="pill">${(day.exercises||[]).length} exercícios</span></div>${(day.exercises||[]).map(item=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${escRestore(EX[item.id]?.name||item.id)}</b><div class="muted small">${+item.sets||EX[item.id]?.sets||3} séries · ${escRestore(item.reps||EX[item.id]?.reps||'')}</div></div>`).join('')}</div>`;
  }

  window.restorePreviousPlanModal=function(){
    if(state.active)return toast('Finalize ou cancele o treino em andamento antes de restaurar o plano.');
    const candidate=getRestoreCandidate();if(!candidate)return toast('Não encontrei uma versão anterior disponível para restaurar.');
    const confidence=candidate.confidence==='exact'?'Cópia completa salva antes da alteração.':candidate.confidence==='high'?'Estrutura anterior encontrada no registro de alterações.':'Recuperação feita a partir dos últimos treinos concluídos do ciclo anterior.';
    modal(`<span class="eyebrow">RESTAURAR PLANO</span><h2>Voltar ao treino anterior?</h2><p>${escRestore(candidate.title)}</p><p class="muted small">${escRestore(candidate.detail)} ${escRestore(confidence)}</p><div class="notice"><b>Seus treinos concluídos, cargas, cardio e relatórios não serão apagados.</b><br>Ao restaurar, este plano volta como o ciclo atual e começa uma nova contagem de 6 semanas.</div>${(candidate.plan?.days||[]).map(previewDay).join('')}<button class="btn primary block" style="margin-top:14px" onclick="restorePreviousPlanNow()">Restaurar este plano</button><button class="btn secondary block" style="margin-top:8px" onclick="closeModal()">Cancelar</button>`);
  };

  window.restorePreviousPlanNow=function(){
    if(state.active)return toast('Finalize ou cancele o treino em andamento antes de restaurar o plano.');
    const candidate=getRestoreCandidate();if(!candidate)return toast('A versão anterior não está mais disponível.');
    backupCurrentPlan('before_restore');
    const restored=deepClone(candidate.plan);restored.id=typeof uid==='function'?uid():String(Date.now());restored.createdAt=today();restored.cycleWeeks=restored.cycleWeeks||6;restored.status='active';restored.restoredAt=nowIso();restored.restoredFrom=candidate.kind;
    restored.days=(restored.days||[]).map(day=>({...day,id:typeof uid==='function'?uid():`${Date.now()}-${Math.random()}`,lockedExerciseIds:[],lastCustomizedAt:null}));
    state.plan=restored;
    if(state.profile){state.profile.exercisePrefs={favorite:[],avoid:[]};}
    state.meta=state.meta||{};state.meta.exercisePreferenceCycle={planId:String(restored.id),startedAt:nowIso(),decided:[]};
    state.meta.planRestoreHistory=Array.isArray(state.meta.planRestoreHistory)?state.meta.planRestoreHistory:[];
    state.meta.planRestoreHistory.push({id:typeof uid==='function'?uid():String(Date.now()),at:nowIso(),source:candidate.kind,sourceId:candidate.sourceId||null});state.meta.planRestoreHistory=state.meta.planRestoreHistory.slice(-12);
    saveLocal();closeModal();screen='workout';renderApp();toast('Plano anterior restaurado. Seu histórico e suas cargas foram preservados.');
  };

  const workoutScreenBeforeRestore=workoutScreen;
  workoutScreen=function(){
    const html=workoutScreenBeforeRestore();if(state.active)return html;
    const candidate=getRestoreCandidate();if(!candidate)return html;
    const card=`<div class="card"><span class="eyebrow">PLANO ANTERIOR</span><h3 style="margin-top:6px">Quer voltar ao treino de antes da atualização?</h3><p class="muted small">${escRestore(candidate.title)} disponível. Você pode visualizar tudo antes de confirmar; nenhum histórico será apagado.</p><button class="btn secondary block" onclick="restorePreviousPlanModal()">Restaurar plano anterior</button></div>`;
    const end=html.indexOf('</section>');return end>=0?html.slice(0,end+10)+card+html.slice(end+10):card+html;
  };

  if(typeof generatePlan==='function'){
    const generatePlanBeforeRestore=generatePlan;
    generatePlan=function(profile){backupCurrentPlan('before_new_cycle');return generatePlanBeforeRestore(profile)};
  }
  if(typeof window.evolveCurrentPlanCycle==='function'){
    const evolveBeforeRestore=window.evolveCurrentPlanCycle;
    window.evolveCurrentPlanCycle=function(){backupCurrentPlan('before_evolve_cycle');return evolveBeforeRestore.apply(this,arguments)};
  }
  if(typeof window.applyRegeneratedPlanDay==='function'){
    const regenerateDayBeforeRestore=window.applyRegeneratedPlanDay;
    window.applyRegeneratedPlanDay=function(){backupCurrentPlan('before_regenerate_day');return regenerateDayBeforeRestore.apply(this,arguments)};
  }
})();
