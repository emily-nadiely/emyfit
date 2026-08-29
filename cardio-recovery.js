/* Progressa v6.4.4 — cardio no histórico e na estimativa de fadiga */
(function(){
  if(typeof recoveryData!=='function'||typeof recoveryHistoryData!=='function'||typeof muscleRecoveryHistoryHtml!=='function')return;

  const sessionDetailBeforeCardioRecovery=typeof sessionDetail==='function'?sessionDetail:null;
  const saveManualCardioBeforeRecovery=typeof window.saveManualCardio==='function'?window.saveManualCardio:null;
  const finishCardioSessionBeforeRecovery=typeof window.finishCardioSession==='function'?window.finishCardioSession:null;

  const CARDIO_RECOVERY_MUSCLES={
    treadmill:{legs:.75,glutes:.45,calves:.65,core:.15},
    curved_treadmill:{legs:.85,glutes:.60,calves:.70,core:.20},
    walk:{legs:.55,glutes:.30,calves:.45},
    elliptical:{legs:.70,glutes:.55,calves:.30,core:.10},
    bike_h:{legs:1.00,glutes:.45,calves:.20},
    bike_v:{legs:1.00,glutes:.55,calves:.25},
    stair:{legs:.90,glutes:1.00,calves:.55,core:.15},
    rower:{legs:.75,glutes:.45,back:.70,arms:.35,core:.45},
    jump_rope:{calves:1.00,legs:.60,core:.25,shoulders:.15}
  };

  const escCR=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const cardioMinutesOf=session=>{
    const direct=+session?.cardio||0;
    if(direct>0)return direct;
    return session?.sessionType==='cardio'?Math.max(0,+session?.duration||0):0;
  };
  const cardioTypeOf=session=>CARDIO?.[session?.cardioType]?session.cardioType:null;
  const cardioMuscleMap=session=>CARDIO_RECOVERY_MUSCLES[cardioTypeOf(session)]||{};
  const cardioLoadRate=session=>{
    const rpe=clamp(+session?.rpe||6,1,10);
    return .42+Math.max(0,rpe-4)*.055;
  };
  const sessionDiscomfort=session=>Math.max(0,+session?.discomfort?.intensity||+session?.painAfter||0);
  const sessionHasDiscomfort=session=>!!session?.discomfort?.had||sessionDiscomfort(session)>0;
  const sessionTimestamp=session=>{
    if(+session?.endedAt)return +session.endedAt;
    if(+session?.startedAt)return +session.startedAt;
    return new Date((session?.date||today())+'T12:00:00').getTime();
  };
  const activityDate=session=>new Date((session?.date||today())+'T12:00:00');

  function cardioActivityTitle(session){
    if(session?.sessionType==='cardio')return `Cardio — ${cardioName(session.cardioType)}`;
    return session?.name||'Treino';
  }

  function activitySummary(session){
    const cardio=cardioMinutesOf(session),strength=(session?.exercises||[]).some(ex=>(ex.sets||[]).some(a=>a.done||(+a.kg>0&&+a.reps>0)));
    const parts=[];
    if(strength)parts.push(`${+session?.duration||0} min de treino`);
    if(cardio>0)parts.push(`${Math.round(cardio)} min de cardio · ${cardioName(session.cardioType)}`);
    if(!parts.length)parts.push(`${+session?.duration||0} min`);
    if(session?.rpe)parts.push(`RPE ${session.rpe}`);
    return parts.join(' · ');
  }

  function recentActivities(days){
    const start=startOfDaysAgo(days);
    return (state.sessions||[]).filter(s=>activityDate(s)>=start).slice().sort((a,b)=>sessionTimestamp(b)-sessionTimestamp(a));
  }

  function activityTimelineHtml(days){
    const sessions=recentActivities(days);
    if(!sessions.length)return '<div class="recovery-empty-visual"><b>Sem atividades neste período</b><span>Treinos e cardios concluídos aparecerão aqui.</span></div>';
    return `<div class="card flat" style="margin:12px 0"><div class="row between"><div><b>Atividades do período</b><div class="muted small">Musculação e cardio aparecem em ordem cronológica.</div></div><span class="pill">${sessions.length}</span></div>${sessions.map(s=>`<button class="row between" style="width:100%;text-align:left;padding:11px 0;border:0;border-bottom:1px solid var(--line);background:transparent;color:inherit" onclick="sessionDetail('${s.id}')"><span><b>${escCR(cardioActivityTitle(s))}</b><small class="muted" style="display:block;margin-top:3px">${fmt(s.date)} · ${escCR(activitySummary(s))}</small>${sessionHasDiscomfort(s)?`<small style="display:block;margin-top:4px">⚠ Desconforto registrado: ${sessionDiscomfort(s)}/10${s.discomfort?.region?` · ${escCR(s.discomfort.region)}`:''}</small>`:''}</span><span class="summary-arrow">›</span></button>`).join('')}</div>`;
  }

  recoveryHistoryData=function(days){
    const start=startOfDaysAgo(days);
    const map=Object.fromEntries(Object.entries(GROUP_LABELS).map(([id,label])=>[id,{id,label,sets:0,cardioMinutes:0,cardioLoad:0,sessions:0,lastDate:null,modalities:new Set(),score:0}]));
    for(const session of state.sessions||[]){
      if(activityDate(session)<start)continue;
      const touched=new Set();
      for(const ex of session.exercises||[]){
        const completed=(ex.sets||[]).filter(a=>a.done||(+a.kg>0&&+a.reps>0)).length;
        if(!completed)continue;
        for(const group of EX_GROUPS[ex.id]||[]){
          if(!map[group])continue;
          map[group].sets+=completed;
          map[group].lastDate=!map[group].lastDate||session.date>map[group].lastDate?session.date:map[group].lastDate;
          touched.add(group);
        }
      }
      const minutes=cardioMinutesOf(session),muscles=cardioMuscleMap(session);
      if(minutes>0){
        for(const [group,weight] of Object.entries(muscles)){
          if(!map[group]||weight<=0)continue;
          map[group].cardioMinutes+=minutes;
          map[group].cardioLoad+=minutes*weight;
          if(session.cardioType)map[group].modalities.add(cardioName(session.cardioType));
          map[group].lastDate=!map[group].lastDate||session.date>map[group].lastDate?session.date:map[group].lastDate;
          touched.add(group);
        }
      }
      for(const group of touched)map[group].sessions++;
    }
    return Object.values(map).map(row=>({...row,modalities:[...row.modalities],score:row.sets*5+row.cardioLoad*.55})).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'pt-BR'));
  };

  muscleRecoveryHistoryHtml=function(){
    const rows=recoveryHistoryData(muscleRecoveryHistoryDays),active=rows.filter(x=>x.sets>0||x.cardioMinutes>0),max=Math.max(1,...active.map(x=>x.score));
    const rowText=x=>{
      const parts=[];
      if(x.sets>0)parts.push(`${x.sets} série${x.sets===1?'':'s'}`);
      if(x.cardioMinutes>0)parts.push(`${Math.round(x.cardioMinutes)} min cardio${x.modalities.length?` (${x.modalities.join(', ')})`:''}`);
      return `${parts.join(' + ')} em ${x.sessions} sessão${x.sessions===1?'':'ões'}${x.lastDate?` · último estímulo ${fmt(x.lastDate)}`:''}`;
    };
    return `<div class="history-periods">${[7,14,28].map(d=>`<button class="${muscleRecoveryHistoryDays===d?'active':''}" onclick="setMuscleHistoryDays(${d})">${d} dias</button>`).join('')}</div>${activityTimelineHtml(muscleRecoveryHistoryDays)}<div class="row between" style="margin:14px 0 8px"><div><b>Impacto muscular do período</b><div class="muted small">Séries de musculação e estímulo estimado do cardio são mostrados separadamente.</div></div></div>${active.length?`<div class="muscle-history-list">${active.map(x=>{const current=recoveryMap()[x.id],visual=recoveryVisualInfo(current);return `<button onclick="openMuscleRecovery('${x.id}')"><span class="history-dot" style="background:${visual.color}"></span><span class="history-main"><b>${x.label}</b><small>${escCR(rowText(x))}</small><i><em style="width:${Math.max(4,x.score/max*100)}%"></em></i></span><span class="summary-arrow">›</span></button>`}).join('')}</div>`:`<div class="recovery-empty-visual"><b>Sem estímulo muscular neste período</b><span>Conclua musculação ou cardio para visualizar o histórico muscular.</span></div>`}`;
  };

  recoveryData=function(){
    const now=Date.now();
    return Object.entries(GROUP_LABELS).map(([id,label])=>{
      let fatigue=0,lastDate=null,recentSets=0,recentSessions=0,recentCardioMinutes=0,maxDiscomfort=0;
      const modalities=new Set();
      for(const session of state.sessions||[]){
        const ageH=Math.max(0,(now-activityDate(session).getTime())/3600000);
        if(ageH>144)continue;
        let sets=0;
        for(const ex of session.exercises||[]){
          if(!(EX_GROUPS[ex.id]||[]).includes(id))continue;
          sets+=(ex.sets||[]).filter(a=>a.done||(+a.kg>0&&+a.reps>0)).length;
        }
        const minutes=cardioMinutesOf(session),cardioWeight=cardioMuscleMap(session)[id]||0;
        if(!sets&&!(minutes>0&&cardioWeight>0))continue;
        recentSessions++;
        if(!lastDate||session.date>lastDate)lastDate=session.date;
        const decay=Math.exp(-ageH/55),rpe=clamp(+session.rpe||7,1,10);
        if(sets>0){
          recentSets+=sets;
          const strengthRpe=clamp(rpe,5,10),rpeFactor=.78+(strengthRpe-5)*.1,discomfortFactor=1+Math.min(sessionDiscomfort(session),6)*.025;
          fatigue+=sets*5*rpeFactor*discomfortFactor*decay;
        }
        if(minutes>0&&cardioWeight>0){
          recentCardioMinutes+=minutes;
          if(session.cardioType)modalities.add(cardioName(session.cardioType));
          fatigue+=minutes*cardioLoadRate(session)*cardioWeight*decay;
          maxDiscomfort=Math.max(maxDiscomfort,sessionDiscomfort(session));
        }
      }
      fatigue=Math.round(clamp(fatigue,0,100));
      if(!lastDate)return {id,label,status:'Sem dados',cls:'',detail:'Ainda sem estímulo registrado',recommendation:'Conclua um treino ou cardio para iniciar a estimativa.',days:null,fatigue:0,recentSets:0,recentSessions:0,recentCardioMinutes:0};
      const daysAgo=Math.max(0,Math.floor((new Date(today()+'T12:00:00')-new Date(lastDate+'T12:00:00'))/86400000));
      let status='Pronta',cls='good',recommendation='Boa prontidão estimada. Faça o aquecimento e reavalie a sensação durante os primeiros minutos.';
      if(fatigue>=75){status='Muito carregada';cls='bad';recommendation='Evite repetir um estímulo pesado deste grupo hoje. Priorize recuperação ou outra região.'}
      else if(fatigue>=55){status='Fadiga alta';cls='bad';recommendation='Prefira outro grupo muscular ou reduza claramente intensidade e volume.'}
      else if(fatigue>=35){status='Recuperando';cls='warn';recommendation='Atividade leve ou moderada pode ser considerada somente se a execução e a sensação estiverem boas.'}
      else if(fatigue>=18){status='Fadiga leve';cls='warn';recommendation='Está próxima da recuperação. Aqueça e evite forçar se houver queda importante de desempenho.'}
      if(maxDiscomfort>=4)recommendation=`Há desconforto de até ${maxDiscomfort}/10 registrado em cardio recente. Dor localizada não é a mesma coisa que fadiga muscular; evite forçar a atividade que piora os sintomas e use este percentual apenas como referência de organização.`;
      const when=daysAgo===0?'hoje':daysAgo===1?'ontem':`há ${daysAgo} dias`,parts=[];
      if(recentSets)parts.push(`${recentSets} série${recentSets===1?'':'s'}`);
      if(recentCardioMinutes)parts.push(`${Math.round(recentCardioMinutes)} min cardio${modalities.size?` (${[...modalities].join(', ')})`:''}`);
      return {id,label,status,cls,detail:`${parts.join(' + ')} nos últimos 6 dias · último estímulo ${when}`,recommendation,days:daysAgo,fatigue,recentSets,recentSessions,recentCardioMinutes,maxDiscomfort};
    });
  };

  recoveryBlock=function(limit=8,detailed=false){
    const arr=recoveryData().filter(x=>x.days!==null).sort((a,b)=>b.fatigue-a.fatigue).slice(0,limit);
    if(!arr.length)return '<p class="muted small">Conclua seus primeiros treinos ou cardios para acompanhar a fadiga por grupo muscular.</p>';
    return `<div class="recovery-grid recovery-grid-v2">${arr.map(x=>`<div class="recovery-item recovery-item-v2"><div class="row between"><b>${x.label}</b><span class="pill ${x.cls}">${x.status}</span></div><div class="fatigue-bar"><span class="${x.cls}" style="width:${x.fatigue}%"></span></div><div class="recovery-meta"><span>Fadiga estimada: <b>${x.fatigue}%</b></span><span>${escCR(x.detail)}</span></div>${detailed?`<p>${escCR(x.recommendation)}</p>`:''}</div>`).join('')}</div><div class="recovery-method"><b>Como a estimativa é calculada</b><span>Tempo desde a atividade, séries concluídas na musculação, duração e modalidade do cardio, RPE, desconforto registrado e check-in. Cardio e musculação têm pesos diferentes. É uma orientação de organização, não uma medição fisiológica ou clínica.</span></div>`;
  };

  let cardioDiscomfortDraft=null;

  window.openCardioDiscomfort=function(sessionId,firstReview=false){
    const session=(state.sessions||[]).find(s=>s.id===sessionId&&s.sessionType==='cardio');
    if(!session)return;
    cardioDiscomfortDraft={sessionId,firstReview,had:!!session.discomfort?.had,region:session.discomfort?.region||'',intensity:Math.max(1,+session.discomfort?.intensity||1),note:session.discomfort?.note||''};
    if(cardioDiscomfortDraft.had)return openCardioDiscomfortForm(sessionId);
    modal(`<span class="eyebrow">APÓS O CARDIO</span><h2>Sentiu dor ou desconforto?</h2><p class="muted small">Registre separadamente da fadiga muscular. Isso ajuda o histórico a mostrar quando uma modalidade provocou sintomas.</p><div class="decision-grid"><button class="decision-button" onclick="saveCardioNoDiscomfort('${sessionId}')">Não</button><button class="decision-button" onclick="openCardioDiscomfortForm('${sessionId}')">Sim</button></div>${firstReview?'<p class="muted small" style="margin-top:10px">Você pode editar este registro depois abrindo o cardio no histórico.</p>':''}`);
  };

  window.openCardioDiscomfortForm=function(sessionId){
    const session=(state.sessions||[]).find(s=>s.id===sessionId&&s.sessionType==='cardio');if(!session)return;
    cardioDiscomfortDraft=cardioDiscomfortDraft?.sessionId===sessionId?cardioDiscomfortDraft:{sessionId,had:true,region:session.discomfort?.region||'',intensity:Math.max(1,+session.discomfort?.intensity||1),note:session.discomfort?.note||''};
    cardioDiscomfortDraft.had=true;
    modal(`<span class="eyebrow">DESCONFORTO NO CARDIO</span><h2>${escCR(cardioName(session.cardioType))}</h2><label>Onde sentiu?</label><input id="cardioPainRegion" value="${escCR(cardioDiscomfortDraft.region)}" placeholder="ex.: joelho direito"><label>Intensidade: <b id="cardioPainValue">${cardioDiscomfortDraft.intensity}/10</b></label><input id="cardioPainIntensity" type="range" min="1" max="10" value="${cardioDiscomfortDraft.intensity}" oninput="cardioPainValue.textContent=this.value+'/10'"><label>Observação</label><textarea id="cardioPainNote" placeholder="Ex.: precisei pausar, piorou ao aumentar a resistência...">${escCR(cardioDiscomfortDraft.note)}</textarea><div class="notice" style="margin-top:10px"><b>Dor não é calculada como se fosse uma série extra.</b> Ela fica registrada como um sinal separado e aparece nas orientações de recuperação.</div><button class="btn primary block" style="margin-top:14px" onclick="saveCardioDiscomfort('${sessionId}')">Salvar desconforto</button><button class="btn secondary block" style="margin-top:8px" onclick="saveCardioNoDiscomfort('${sessionId}')">Marcar como sem desconforto</button>`);
  };

  window.saveCardioNoDiscomfort=function(sessionId){
    const session=(state.sessions||[]).find(s=>s.id===sessionId&&s.sessionType==='cardio');if(!session)return;
    session.discomfort={had:false,region:'',intensity:0,note:''};session.painAfter=0;session.cardioDiscomfortReviewed=true;
    saveLocal();cardioDiscomfortDraft=null;closeModal();renderApp();toast('Cardio salvo sem desconforto.');
  };

  window.saveCardioDiscomfort=function(sessionId){
    const session=(state.sessions||[]).find(s=>s.id===sessionId&&s.sessionType==='cardio');if(!session)return;
    const region=(document.getElementById('cardioPainRegion')?.value||'').trim(),intensity=clamp(+(document.getElementById('cardioPainIntensity')?.value||0),1,10),note=(document.getElementById('cardioPainNote')?.value||'').trim();
    session.discomfort={had:true,region,intensity,note};session.painAfter=intensity;session.cardioDiscomfortReviewed=true;
    saveLocal();cardioDiscomfortDraft=null;closeModal();renderApp();toast('Desconforto do cardio registrado.');
  };

  function promptForNewCardio(sessionId){
    const session=(state.sessions||[]).find(s=>s.id===sessionId&&s.sessionType==='cardio');
    if(session&&!session.cardioDiscomfortReviewed)setTimeout(()=>openCardioDiscomfort(sessionId,true),60);
  }

  if(saveManualCardioBeforeRecovery){
    window.saveManualCardio=function(){
      const before=new Set((state.sessions||[]).map(s=>s.id));
      const result=saveManualCardioBeforeRecovery.apply(this,arguments);
      const saved=(state.sessions||[]).slice().reverse().find(s=>s.sessionType==='cardio'&&!before.has(s.id));
      if(saved)promptForNewCardio(saved.id);
      return result;
    };
  }

  if(finishCardioSessionBeforeRecovery){
    window.finishCardioSession=function(){
      const activeId=state?.active?.mode==='cardio'?state.active.id:null;
      const result=finishCardioSessionBeforeRecovery.apply(this,arguments);
      if(activeId&&(state.sessions||[]).some(s=>s.id===activeId))promptForNewCardio(activeId);
      return result;
    };
  }

  if(sessionDetailBeforeCardioRecovery){
    sessionDetail=function(id){
      const s=(state.sessions||[]).find(x=>x.id===id);
      if(!s||s.sessionType!=='cardio')return sessionDetailBeforeCardioRecovery(id);
      const d=s.cardioDetails||{},rows=[];
      if(+d.speed)rows.push(['Velocidade média',`${d.speed} km/h`]);
      if(+d.incline)rows.push(['Inclinação',`${d.incline}%`]);
      if(+d.level)rows.push(['Nível / resistência',d.level]);
      if(+d.distance)rows.push(['Distância',`${d.distance} km`]);
      if(d.pace)rows.push(['Ritmo',d.pace]);
      if(+d.floors)rows.push(['Andares / lances',d.floors]);
      if(+d.rpm)rows.push(['Cadência média',`${d.rpm} RPM`]);
      const seconds=Math.max(0,+s.cardioSeconds||0),duration=seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:`${Math.round(cardioMinutesOf(s))} min`,pain=sessionDiscomfort(s);
      const discomfort=sessionHasDiscomfort(s)?`<div class="notice"><b>Desconforto registrado:</b> ${escCR(s.discomfort?.region||'região não informada')} · ${pain}/10${s.discomfort?.note?`<br>${escCR(s.discomfort.note)}`:''}</div>`:'<div class="success">Nenhum desconforto registrado nesta sessão.</div>';
      modal(`<span class="eyebrow">CARDIO</span><h2>${escCR(cardioName(s.cardioType))}</h2><p class="muted">${fmt(s.date)}${s.entryMode==='manual'?' · registro manual':''}</p><div class="grid grid3"><div class="metric"><b>${duration}</b><span>duração</span></div><div class="metric"><b>${s.rpe||'—'}</b><span>RPE</span></div><div class="metric"><b>${escCR(cardioName(s.cardioType))}</b><span>modalidade</span></div></div>${rows.length?`<div class="card flat">${rows.map(([k,v])=>`<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${escCR(k)}</span><b>${escCR(v)}</b></div>`).join('')}</div>`:''}${discomfort}<p><b>Observações:</b> ${escCR(s.notes||'Nenhuma')}</p><button class="btn secondary block" onclick="openCardioDiscomfort('${s.id}')">${sessionHasDiscomfort(s)?'Editar desconforto':'Registrar dor ou desconforto'}</button>`);
    };
  }
})();
