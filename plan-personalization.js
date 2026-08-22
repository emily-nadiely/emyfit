/* Progressa v6.4.3 — personalização assistida do plano */
(function(){
  if(typeof workoutScreen!=='function'||typeof EX==='undefined')return;

  const workoutScreenBeforePlanPersonalization=workoutScreen;
  const normalizeStateBeforePlanPersonalization=normalizeState;
  let dayCandidateDraft=null;

  const escPlan=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const dayById=id=>(state.plan?.days||[]).find(day=>day.id===id);
  const profilePrefs=()=>state.profile?.exercisePrefs||{favorite:[],avoid:[]};
  const groupsFor=id=>typeof EX_GROUPS!=='undefined'?(EX_GROUPS[id]||[]):[EX[id]?.category].filter(Boolean);

  function normalizeDayLocks(day){
    if(!day)return [];
    const present=new Set((day.exercises||[]).map(item=>item.id));
    day.lockedExerciseIds=[...new Set((day.lockedExerciseIds||[]).filter(id=>present.has(id)&&EX[id]))];
    return day.lockedExerciseIds;
  }
  function normalizeAllDayLocks(){(state.plan?.days||[]).forEach(normalizeDayLocks)}

  normalizeState=function(){normalizeStateBeforePlanPersonalization();normalizeAllDayLocks()};
  normalizeAllDayLocks();

  function logPlanChange(type,day,beforeIds,afterIds){
    state.meta=state.meta||{};
    state.meta.planChanges=Array.isArray(state.meta.planChanges)?state.meta.planChanges:[];
    state.meta.planChanges.push({id:typeof uid==='function'?uid():String(Date.now()),type,dayId:day?.id||null,dayName:day?.name||'',at:new Date().toISOString(),before:[...(beforeIds||[])],after:[...(afterIds||[])]});
    state.meta.planChanges=state.meta.planChanges.slice(-60);
  }

  function isPlanExerciseLocked(day,id){return normalizeDayLocks(day).includes(id)}

  window.togglePlanExerciseLock=function(dayId,exerciseId){
    const day=dayById(dayId);if(!day||!EX[exerciseId])return;
    let locks=normalizeDayLocks(day);
    if(locks.includes(exerciseId))locks=locks.filter(id=>id!==exerciseId);else locks=[...locks,exerciseId];
    day.lockedExerciseIds=locks;saveLocal();renderPlanEditor(dayId);
    toast(locks.includes(exerciseId)?'Exercício fixado. Ele será mantido ao gerar outra opção.':'Exercício liberado para novas versões.');
  };

  function blockedForPlan(id){const e=EX[id];if(!e)return true;try{if(typeof blocked==='function'&&blocked(e))return true}catch{}return false}
  function allowedForPlan(id){
    if(!EX[id]||blockedForPlan(id))return false;
    const prefs=profilePrefs();if((prefs.avoid||[]).includes(id))return false;
    try{if(typeof equipmentAllowed==='function'&&!equipmentAllowed(id,state.profile||{}))return false}catch{}
    return true;
  }
  function sharedCount(a,b){const bs=new Set(b||[]);return (a||[]).reduce((n,x)=>n+(bs.has(x)?1:0),0)}

  function candidateScore(originalId,candidateId,used,originalDayIds,variation=0){
    const original=EX[originalId],candidate=EX[candidateId];if(!original||!candidate)return -999;
    if(candidateId===originalId||used.has(candidateId)||!allowedForPlan(candidateId))return -999;
    let score=0;
    if(candidate.pattern===original.pattern)score+=48;
    if(candidate.category===original.category)score+=22;
    score+=sharedCount(candidate.primary,original.primary)*14;
    score+=sharedCount(groupsFor(candidateId),groupsFor(originalId))*11;
    const prefs=profilePrefs();if((prefs.favorite||[]).includes(candidateId))score+=15;
    if(originalDayIds.has(candidateId))score-=18;
    if(candidate.level===original.level)score+=4;
    try{
      const type=typeof equipmentType==='function'?equipmentType(candidate):'';
      if(state.profile?.preference==='machines'&&['machine','cable','smith'].includes(type))score+=6;
      if(state.profile?.preference==='mixed'&&['dumbbell','barbell','bodyweight','kettlebell','free'].includes(type))score+=4;
    }catch{}
    score+=Math.random()*Math.max(0,variation);return score;
  }

  function replacementCandidates(day,index,limit=7,variation=0){
    const item=day?.exercises?.[index],originalId=item?.id;if(!originalId)return [];
    const used=new Set((day.exercises||[]).map((x,i)=>i===index?null:x.id).filter(Boolean));
    const originals=new Set((day.exercises||[]).map(x=>x.id));
    return Object.keys(EX).map(id=>({id,score:candidateScore(originalId,id,used,originals,variation)})).filter(x=>x.score>=28).sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function planExerciseFromAlternative(oldItem,newId){
    const e=EX[newId];return {...oldItem,id:newId,sets:Math.max(1,+oldItem?.sets||+e?.sets||3),reps:e?.reps||oldItem?.reps||'10–15',rest:e?.rest||oldItem?.rest||75,reason:`Alternativa personalizada: ${e?.why||'mantém o objetivo do exercício anterior.'}`};
  }

  window.planReplacementModal=function(dayId,index){
    const day=dayById(dayId),item=day?.exercises?.[index],original=EX[item?.id];if(!day||!item||!original)return;
    const options=replacementCandidates(day,index,7,4);
    modal(`<span class="eyebrow">TROCAR NO PLANO</span><h2>${escPlan(original.name)}</h2><p class="muted small">As opções abaixo priorizam musculatura, padrão de movimento, equipamentos disponíveis, limitações e preferências cadastradas.</p>${options.length?options.map(option=>{const e=EX[option.id];return `<div class="card flat"><div class="row between"><div><b>${escPlan(e.name)}</b><div class="muted small">${escPlan(e.machine||'')} · ${escPlan(e.pattern||'')}</div></div><span class="pill">${Math.round(option.score)} pts</span></div><button class="btn primary block" style="margin-top:10px" onclick="applyPlanReplacement('${dayId}',${index},'${option.id}')">Usar esta opção</button></div>`}).join(''):'<div class="notice">Não encontrei outra opção suficientemente compatível com as regras atuais.</div>'}<button class="btn secondary block" onclick="closeModal();openPlanEditor('${dayId}')">Voltar ao treino</button>`);
  };

  window.applyPlanReplacement=function(dayId,index,newId){
    const day=dayById(dayId),old=day?.exercises?.[index];if(!day||!old||!EX[newId]||!allowedForPlan(newId))return;
    if(day.exercises.some((x,i)=>i!==index&&x.id===newId))return toast('Esse exercício já está neste treino.');
    const wasLocked=isPlanExerciseLocked(day,old.id),before=day.exercises.map(x=>x.id);
    day.exercises[index]=planExerciseFromAlternative(old,newId);
    if(wasLocked)day.lockedExerciseIds=normalizeDayLocks(day).filter(id=>id!==old.id).concat(newId);
    normalizeDayLocks(day);logPlanChange('replace_exercise',day,before,day.exercises.map(x=>x.id));saveLocal();closeModal();openPlanEditor(dayId);toast('Exercício trocado no plano.');
  };

  function dayGroupCounts(day){
    const counts={legs:0,glutes:0,back:0,chest:0,shoulders:0,arms:0,core:0,calves:0};
    for(const item of day?.exercises||[])for(const group of groupsFor(item.id))if(Object.prototype.hasOwnProperty.call(counts,group))counts[group]++;
    return counts;
  }

  function analyzePlanDay(day){
    const warnings=[],critical=[],positives=[],items=day?.exercises||[],counts=dayGroupCounts(day),patterns={};
    const ids=items.map(x=>x.id);if(new Set(ids).size!==ids.length)critical.push('Há exercício repetido no mesmo treino.');
    for(const item of items){
      const e=EX[item.id];if(!e){critical.push(`Exercício não reconhecido: ${item.id}`);continue}
      patterns[e.pattern]=(patterns[e.pattern]||0)+1;
      if(blockedForPlan(item.id))critical.push(`${e.name} conflita com uma limitação cadastrada.`);
      try{if(typeof equipmentAllowed==='function'&&!equipmentAllowed(item.id,state.profile||{}))warnings.push(`${e.name} usa um equipamento que não está marcado como disponível.`)}catch{}
    }
    if(items.length<4)warnings.push('O treino tem pouca variedade. Confira se isso foi intencional.');
    if(items.length>9)warnings.push('O treino tem muitos exercícios e pode ultrapassar o tempo planejado.');
    const duration=typeof estimatedWorkoutMinutes==='function'?estimatedWorkoutMinutes(day):0,preferred=+state.profile?.trainingPrefs?.preferredDuration||+state.profile?.duration||60;
    if(duration>preferred+15)warnings.push(`Duração estimada de ${duration} min, acima do tempo preferido de ${preferred} min.`);else if(duration)positives.push(`Duração estimada: cerca de ${duration} min.`);
    Object.entries(patterns).forEach(([pattern,count])=>{if(count>=3)warnings.push(`Há ${count} exercícios com padrão semelhante (${pattern.toLocaleLowerCase('pt-BR')}).`)});
    const name=String(day?.name||'').toLocaleLowerCase('pt-BR'),lower=counts.legs+counts.glutes+counts.calves,upper=counts.back+counts.chest+counts.shoulders+counts.arms;
    if(lower>upper||/perna|quadr[ií]ceps|gl[uú]te|posterior/.test(name)){
      const hasQuad=items.some(x=>(EX[x.id]?.primary||[]).some(m=>/quadr[ií]ceps/.test(m)));
      const hasPosterior=items.some(x=>(EX[x.id]?.primary||[]).some(m=>/posterior|gl[uú]te/.test(m)));
      if(!hasQuad)warnings.push('Treino de membros inferiores sem estímulo claro de quadríceps.');
      if(!hasPosterior)warnings.push('Treino de membros inferiores sem estímulo claro de posteriores/glúteos.');
      if(hasQuad&&hasPosterior)positives.push('Há estímulo para quadríceps e cadeia posterior/glúteos.');
    }
    if(upper>=lower||/superior|peito|costas|ombro|bra[cç]o/.test(name)){
      const hasPush=items.some(x=>/Empurrada|Adução horizontal/.test(EX[x.id]?.pattern||'')),hasPull=items.some(x=>/Puxada/.test(EX[x.id]?.pattern||''));
      if(hasPush&&!hasPull)warnings.push('Há movimentos de empurrar, mas nenhum padrão claro de puxar neste treino.');
      if(hasPush&&hasPull)positives.push('O treino combina movimentos de empurrar e puxar.');
    }
    const locks=normalizeDayLocks(day).length;if(locks)positives.push(`${locks} exercício${locks===1?' está':'s estão'} fixado${locks===1?'':'s'} para futuras versões.`);
    return {status:critical.length?'bad':warnings.length?'warn':'good',critical:[...new Set(critical)],warnings:[...new Set(warnings)],positives:[...new Set(positives)],duration,counts};
  }

  function analysisHtml(day,compact=false){
    const a=analyzePlanDay(day),title=a.status==='good'?'Treino bem distribuído':a.status==='bad'?'Ajustes importantes encontrados':'Treino utilizável, com pontos para revisar',cls=a.status==='good'?'success':a.status==='bad'?'dangerbox':'notice',issues=[...a.critical,...a.warnings];
    return `<div class="${cls}" style="margin-top:${compact?'8':'12'}px"><b>${title}</b>${issues.length?`<ul style="margin:8px 0 0;padding-left:18px">${issues.slice(0,compact?3:10).map(x=>`<li>${escPlan(x)}</li>`).join('')}</ul>`:`<p style="margin:6px 0 0">Não encontrei desequilíbrios evidentes pelas regras cadastradas.</p>`}${!compact&&a.positives.length?`<div class="muted small" style="margin-top:8px">${a.positives.map(escPlan).join(' · ')}</div>`:''}</div>`;
  }

  window.analyzePlanDayModal=function(dayId){
    const day=dayById(dayId);if(!day)return;
    modal(`<span class="eyebrow">ANÁLISE DO TREINO</span><h2>${escPlan(day.name)}</h2><p class="muted small">A análise verifica distribuição, redundância, duração, equipamentos e limitações cadastradas. É uma ferramenta de organização e não substitui avaliação profissional.</p>${analysisHtml(day,false)}<button class="btn primary block" style="margin-top:14px" onclick="closeModal();openPlanEditor('${dayId}')">Personalizar treino</button>`);
  };

  function buildAlternativeDay(day,variation=10){
    const clone={...day,exercises:(day.exercises||[]).map(x=>({...x})),lockedExerciseIds:[...normalizeDayLocks(day)]},locks=new Set(clone.lockedExerciseIds),originalIds=new Set((day.exercises||[]).map(x=>x.id)),used=new Set();
    clone.exercises=clone.exercises.map(item=>{
      if(locks.has(item.id)){used.add(item.id);return item}
      const options=Object.keys(EX).map(id=>({id,score:candidateScore(item.id,id,used,originalIds,variation)})).filter(x=>x.score>=30).sort((a,b)=>b.score-a.score);
      const pick=options[0]?.id||item.id;used.add(pick);return pick===item.id?item:planExerciseFromAlternative(item,pick);
    });
    const unique=[],seen=new Set();for(const item of clone.exercises){if(seen.has(item.id))continue;seen.add(item.id);unique.push(item)}clone.exercises=unique;normalizeDayLocks(clone);return clone;
  }

  function candidatePreviewHtml(candidate){
    const day=candidate?.day;if(!day)return '';
    return `<div class="card flat"><div class="row between"><div><span class="eyebrow">NOVA OPÇÃO</span><h3 style="margin-top:5px">${escPlan(day.name)}</h3></div><span class="pill">${day.exercises.length} exercícios</span></div>${day.exercises.map(item=>`<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line)"><div><b>${escPlan(EX[item.id]?.name||item.id)}</b><div class="muted small">${item.sets||EX[item.id]?.sets||3} séries · ${escPlan(item.reps||EX[item.id]?.reps||'')}</div></div>${day.lockedExerciseIds.includes(item.id)?'<span class="pill good">Fixado</span>':''}</div>`).join('')}</div>${analysisHtml(day,false)}`;
  }

  function openCandidateModal(){
    if(!dayCandidateDraft)return;
    modal(`<span class="eyebrow">GERAR OUTRA OPÇÃO</span><h2>Veja antes de aplicar</h2><p class="muted small">Os exercícios fixados foram mantidos. O restante foi reorganizado respeitando o objetivo do dia, equipamentos, limitações e preferências.</p>${candidatePreviewHtml(dayCandidateDraft)}<div class="grid grid2" style="margin-top:14px"><button class="btn secondary block" onclick="tryAnotherPlanDayVersion('${dayCandidateDraft.dayId}')">Gerar outra</button><button class="btn primary block" onclick="applyRegeneratedPlanDay('${dayCandidateDraft.dayId}')">Usar esta versão</button></div><button class="btn ghost block" style="margin-top:8px" onclick="closeModal()">Cancelar</button>`);
  }

  window.previewRegeneratePlanDay=function(dayId){
    if(state.active)return toast('Conclua ou cancele a sessão em andamento antes de alterar o plano.');
    const day=dayById(dayId);if(!day)return;dayCandidateDraft={dayId,day:buildAlternativeDay(day,12),createdAt:Date.now()};closeModal();openCandidateModal();
  };
  window.tryAnotherPlanDayVersion=function(dayId){const day=dayById(dayId);if(!day)return;dayCandidateDraft={dayId,day:buildAlternativeDay(day,28),createdAt:Date.now()};closeModal();openCandidateModal()};
  window.applyRegeneratedPlanDay=function(dayId){
    if(!dayCandidateDraft||dayCandidateDraft.dayId!==dayId)return;
    const current=dayById(dayId),candidate=dayCandidateDraft.day;if(!current||!candidate)return;
    const before=current.exercises.map(x=>x.id),after=candidate.exercises.map(x=>x.id);current.exercises=candidate.exercises.map(x=>({...x}));current.lockedExerciseIds=[...candidate.lockedExerciseIds];current.lastCustomizedAt=new Date().toISOString();logPlanChange('regenerate_day',current,before,after);dayCandidateDraft=null;saveLocal();closeModal();screen='workout';renderApp();toast('Nova opção aplicada. Seu histórico foi preservado.');
  };

  renderPlanEditor=function(dayId){
    const day=dayById(dayId),box=$('#planEditorCurrent');if(!day||!box)return;normalizeDayLocks(day);
    box.innerHTML=`<div class="row between wrap"><h3>Exercícios do dia (${day.exercises.length})</h3><span class="muted small">Fixe o que você não quer que mude.</span></div>${day.exercises.map((item,index)=>{const e=EX[item.id],locked=isPlanExerciseLocked(day,item.id);return `<div class="card flat" style="margin:8px 0"><div class="row between"><div style="min-width:0"><b>${escPlan(e?.name||item.id)}</b><div class="muted small">${item.sets||e?.sets||3} séries · ${escPlan(item.reps||e?.reps||'')} · ${escPlan(e?.machine||'')}</div></div><span class="pill ${locked?'good':''}">${locked?'Fixado':'Editável'}</span></div><div class="row wrap" style="margin-top:10px"><button class="btn ${locked?'primary':'ghost'} sm" onclick="togglePlanExerciseLock('${dayId}','${item.id}')">${locked?'★ Fixado':'☆ Fixar'}</button><button class="btn secondary sm" onclick="planReplacementModal('${dayId}',${index})">Trocar</button><button class="btn danger sm" onclick="removeExerciseFromPlan('${dayId}',${index})">Remover</button></div></div>`}).join('')}${analysisHtml(day,true)}`;
  };

  openPlanEditor=function(dayId){
    closeModal();const day=dayById(dayId);if(!day)return;normalizeDayLocks(day);
    modal(`<span class="eyebrow">PERSONALIZAR TREINO</span><h2>${escPlan(day.name)}</h2><p class="muted small">Fixe os exercícios que você gosta, troque apenas um ou gere uma versão inteira diferente. O histórico anterior não é alterado.</p><div class="grid grid2" style="margin-bottom:12px"><button class="btn secondary block" onclick="closeModal();analyzePlanDayModal('${dayId}')">Analisar treino</button><button class="btn primary block" onclick="closeModal();previewRegeneratePlanDay('${dayId}')">Gerar outra opção</button></div><div id="planEditorCurrent"></div><hr><div class="v6-section-title"><h3>Adicionar exercício</h3><span>opcional</span></div><label>Buscar exercício</label><input id="exerciseSearch" placeholder="Digite o nome do exercício" oninput="renderExercisePickerFromCurrent()">${typeof exerciseFilterControls==='function'?exerciseFilterControls():''}<div id="exercisePickerResults"></div><button class="btn primary block" style="margin-top:12px" onclick="closeModal();viewPlanDay('${dayId}')">Concluir personalização</button>`);
    renderPlanEditor(dayId);if(typeof renderExercisePicker==='function')renderExercisePicker('plan',dayId);
  };

  removeExerciseFromPlan=function(dayId,index){
    const day=dayById(dayId),item=day?.exercises?.[index];if(!day||!item)return;
    if(day.exercises.length<=1)return toast('O treino precisa manter pelo menos um exercício.');
    if(isPlanExerciseLocked(day,item.id)&&!confirm('Este exercício está fixado. Remover mesmo assim?'))return;
    const before=day.exercises.map(x=>x.id);day.exercises.splice(index,1);day.lockedExerciseIds=normalizeDayLocks(day).filter(id=>id!==item.id);logPlanChange('remove_exercise',day,before,day.exercises.map(x=>x.id));saveLocal();renderPlanEditor(dayId);if(typeof renderExercisePicker==='function')renderExercisePicker('plan',dayId);
  };

  const addExerciseToPlanBeforePersonalization=typeof addExerciseToPlan==='function'?addExerciseToPlan:null;
  if(addExerciseToPlanBeforePersonalization){
    addExerciseToPlan=function(dayId,id){
      const day=dayById(dayId),before=day?.exercises?.map(x=>x.id)||[];addExerciseToPlanBeforePersonalization(dayId,id);
      if(day&&day.exercises.some(x=>x.id===id)&&!before.includes(id)){logPlanChange('add_exercise',day,before,day.exercises.map(x=>x.id));saveLocal()}
    };
  }

  viewPlanDay=function(id){
    const day=dayById(id);if(!day)return;normalizeDayLocks(day);
    modal(`<span class="eyebrow">SEU PLANO</span><h2>${escPlan(day.name)}</h2>${analysisHtml(day,true)}${day.exercises.map(item=>exercisePreview(item)).join('')}<div class="grid grid2"><button class="btn secondary block" onclick="openPlanEditor('${day.id}')">Personalizar</button><button class="btn secondary block" onclick="closeModal();previewRegeneratePlanDay('${day.id}')">Outra opção</button></div><button class="btn primary block" style="margin-top:9px" onclick="closeModal();startWorkout('${day.id}')">Iniciar este treino</button>`);
  };

  workoutScreen=function(){
    if(state.active)return workoutScreenBeforePlanPersonalization();
    const days=state.plan?.days||[];
    return `<section class="hero"><span class="eyebrow">TREINOS</span><h2>Escolha a sessão</h2><p>Você pode iniciar o treino atual, personalizar os exercícios ou gerar outra opção mantendo o objetivo do dia.</p></section>${days.map((day,index)=>`<div class="card"><div class="row between"><div><span class="eyebrow">DIA ${index+1}</span><h3>${escPlan(day.name)}</h3><span class="muted small">${typeof dayMuscleSummary==='function'?escPlan(dayMuscleSummary(day)):''}<br>${day.exercises.length} exercícios · aproximadamente ${typeof estimatedWorkoutMinutes==='function'?estimatedWorkoutMinutes(day):'—'} min</span></div></div><div class="row wrap" style="margin-top:12px"><button class="btn secondary sm" onclick="openPlanEditor('${day.id}')">Personalizar</button><button class="btn secondary sm" onclick="previewRegeneratePlanDay('${day.id}')">Outra opção</button><button class="btn primary sm" onclick="startWorkout('${day.id}')">Iniciar</button></div></div>`).join('')}<div class="card"><h3>Histórico recente</h3>${(state.sessions||[]).slice(-4).reverse().map(s=>`<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><div><b>${escPlan(s.name||'Treino')}</b><div class="muted small">${fmt(s.date)} · ${+s.duration||0} min${+s.cardio>0?` · ${+s.cardio} min de cardio`:''}</div></div><span class="pill">RPE ${s.rpe||'—'}</span></div>`).join('')||'<p class="muted">Nenhum treino concluído ainda.</p>'}</div>`;
  };

  window.keepCurrentPlanCycle=function(){
    if(state.active)return toast('Finalize a sessão em andamento primeiro.');
    state.plan.createdAt=today();state.plan.cycleWeeks=state.plan.cycleWeeks||6;state.plan.status='active';logPlanChange('keep_cycle',state.plan,[],[]);saveLocal();closeModal();renderApp();toast('Plano mantido por um novo ciclo.');
  };
  window.evolveCurrentPlanCycle=function(){
    if(state.active)return toast('Finalize a sessão em andamento primeiro.');
    const days=state.plan?.days||[];for(const day of days){const before=day.exercises.map(x=>x.id),candidate=buildAlternativeDay(day,18);day.exercises=candidate.exercises;day.lockedExerciseIds=candidate.lockedExerciseIds;day.lastCustomizedAt=new Date().toISOString();logPlanChange('evolve_cycle_day',day,before,day.exercises.map(x=>x.id))}
    state.plan.createdAt=today();state.plan.cycleWeeks=state.plan.cycleWeeks||6;saveLocal();closeModal();screen='home';renderApp();toast('Plano evoluído para o próximo ciclo. Exercícios fixados foram mantidos.');
  };
  window.chooseDayToPersonalizeCycle=function(){
    closeModal();const days=state.plan?.days||[];modal(`<span class="eyebrow">PERSONALIZAR CICLO</span><h2>Qual treino você quer ajustar?</h2>${days.map((day,i)=>`<button class="btn secondary block" style="margin-top:8px" onclick="openPlanEditor('${day.id}')">Dia ${i+1} · ${escPlan(day.name)}</button>`).join('')}`);
  };

  reassessPlanModal=function(){
    const sessions=(state.sessions||[]).filter(s=>!state.plan?.createdAt||new Date(s.date+'T12:00:00')>=new Date(state.plan.createdAt+'T12:00:00')),records=typeof personalRecords==='function'?personalRecords(sessions,5):[];
    modal(`<span class="eyebrow">REAVALIAÇÃO DO CICLO</span><h2>Como você quer seguir?</h2><div class="grid grid3"><div class="metric"><b>${sessions.length}</b><span>treinos no ciclo</span></div><div class="metric"><b>${records.length}</b><span>recordes</span></div><div class="metric"><b>${typeof workoutStreak==='function'?workoutStreak():0}</b><span>sequência atual</span></div></div><p class="muted small">Você não precisa trocar tudo automaticamente ao completar seis semanas. Escolha a opção que combina melhor com sua adaptação ao plano.</p><div class="card flat"><h3>Gostei do plano</h3><p class="muted small">Mantém exatamente os mesmos treinos por mais um ciclo.</p><button class="btn secondary block" onclick="keepCurrentPlanCycle()">Manter por mais 6 semanas</button></div><div class="card flat"><h3>Quero evoluir sem mudar tudo</h3><p class="muted small">Mantém exercícios fixados e cria alternativas para os demais.</p><button class="btn primary block" onclick="evolveCurrentPlanCycle()">Evoluir meu plano</button></div><div class="card flat"><h3>Quero escolher melhor</h3><p class="muted small">Abra um treino por vez e personalize antes do próximo ciclo.</p><button class="btn secondary block" onclick="chooseDayToPersonalizeCycle()">Personalizar meus treinos</button></div><div class="card flat"><h3>Quero uma estrutura nova</h3><p class="muted small">Revê rotina e preferências e gera uma nova divisão completa.</p><button class="btn ghost block" onclick="closeModal();trainingAssessmentModal(true)">Gerar nova estrutura</button></div>`);
  };
})();