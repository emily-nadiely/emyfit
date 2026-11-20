/* Progressa v7.2.0 — Health Connect */
(function(){
  const HEALTH_KEY=()=>`progressa_health_${(typeof currentUser!=='undefined'&&currentUser?.id)||'local'}`;
  const readTypes=['steps','heartRate','weight','workouts'];
  const writeTypes=['weight','workouts'];

  function healthPlugin(){ return window.Capacitor?.Plugins?.Health||null; }
  function isNativeAndroid(){ return !!window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.()==='android'; }
  function loadHealthCache(){ try{return JSON.parse(localStorage.getItem(HEALTH_KEY())||'{}')}catch{return {}} }
  function saveHealthCache(data){ try{localStorage.setItem(HEALTH_KEY(),JSON.stringify(data))}catch{} }
  function fmtSync(value){ if(!value)return 'Ainda não sincronizado'; try{return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}catch{return value} }

  function healthConnectCard(){
    const data=loadHealthCache(),native=isNativeAndroid(),connected=!!data.connected;
    return `<div class="card" id="healthConnectCard">
      <div class="row between" style="gap:12px;align-items:flex-start">
        <div>
          <span class="eyebrow">SAÚDE E ATIVIDADE</span>
          <h3 style="margin-top:6px">Conexão Saúde (Health Connect)</h3>
          <p class="muted small">Integra passos, frequência cardíaca, peso e treinos registrados por apps e dispositivos compatíveis.</p>
        </div>
        <span class="pill ${connected?'good':''}">${connected?'Conectado':native?'Disponível':'Android'}</span>
      </div>
      ${!native?`<div class="notice" style="margin-top:12px">A conexão é feita pelo aplicativo Android do Progressa. Na versão web, seus dados de saúde não são acessados.</div>`:`
        ${connected?`<div class="grid grid2" style="margin-top:14px">
          <div class="metric"><b>${Number.isFinite(+data.steps)?Math.round(+data.steps).toLocaleString('pt-BR'):'—'}</b><span>passos hoje</span></div>
          <div class="metric"><b>${Number.isFinite(+data.heartRate)?Math.round(+data.heartRate)+' bpm':'—'}</b><span>FC média 24h</span></div>
          <div class="metric"><b>${Number.isFinite(+data.weight)?Number(+data.weight).toFixed(1)+' kg':'—'}</b><span>último peso</span></div>
          <div class="metric"><b>${Number.isFinite(+data.workouts)?Math.round(+data.workouts):'—'}</b><span>treinos em 7 dias</span></div>
        </div>
        <p class="muted small" style="margin-top:10px">Última leitura: ${fmtSync(data.lastSync)}</p>
        <p class="muted small">Treinos concluídos no Progressa são enviados ao Health Connect automaticamente quando a permissão de escrita estiver ativa.</p>
        <button class="btn primary block" onclick="syncHealthConnect()">Sincronizar agora</button>\n        <button class="btn secondary block" style="margin-top:8px" onclick="connectHealthConnect()">Atualizar permissões</button>
        ${Number.isFinite(+data.weight)?`<button class="btn secondary block" style="margin-top:8px" onclick="useHealthWeight()">Usar ${Number(data.weight).toFixed(1)} kg no Progressa</button>`:''}
        <button class="btn ghost block" style="margin-top:8px" onclick="openHealthConnectSettings()">Gerenciar permissões</button>`
        :`<button class="btn primary block" style="margin-top:14px" onclick="connectHealthConnect()">Conectar ao Health Connect</button>
        <button class="btn ghost block" style="margin-top:8px" onclick="openHealthConnectSettings()">Abrir Conexão Saúde</button>`}
      `}
      <p class="muted small" style="margin-top:10px">Os dados lidos do Health Connect não são enviados automaticamente para a nuvem do Progressa.</p>
    </div>`;
  }

  function installCard(){
    if(typeof window.profileScreen!=='function'||window.__progressaHealthWrapped)return;
    const base=window.profileScreen;
    window.profileScreen=function(){return base()+healthConnectCard()};
    window.__progressaHealthWrapped=true;
  }

  async function connect(){
    const H=healthPlugin();
    if(!isNativeAndroid()||!H){toast?.('Health Connect só está disponível no app Android.');return}
    try{
      const available=await H.isAvailable();
      if(!available?.available){toast?.('Health Connect não está disponível neste aparelho.');try{await H.openHealthConnectSettings()}catch{}return}
      const status=await H.requestAuthorization({read:readTypes,write:writeTypes,requestHistoryAccess:true});
      saveHealthCache({...loadHealthCache(),connected:true,authorization:status,lastPermissionCheck:new Date().toISOString()});
      await sync();
    }catch(error){
      console.warn('Health Connect authorization',error);
      toast?.('Não foi possível concluir a autorização do Health Connect.');
    }
    renderApp?.();
  }

  async function sync(){
    const H=healthPlugin();
    if(!isNativeAndroid()||!H)return;
    try{
      const end=new Date(),startToday=new Date(),dayAgo=new Date(end.getTime()-86400000),monthAgo=new Date(end.getTime()-30*86400000),weekAgo=new Date(end.getTime()-7*86400000);
      startToday.setHours(0,0,0,0);
      const [stepsRes,hrRes,weightRes,workoutRes]=await Promise.all([
        H.queryAggregated({dataType:'steps',startDate:startToday.toISOString(),endDate:end.toISOString(),bucket:'day',aggregation:'sum'}).catch(()=>({samples:[]})),
        H.queryAggregated({dataType:'heartRate',startDate:dayAgo.toISOString(),endDate:end.toISOString(),bucket:'day',aggregation:'average'}).catch(()=>({samples:[]})),
        H.readSamples({dataType:'weight',startDate:monthAgo.toISOString(),endDate:end.toISOString(),limit:20,ascending:false}).catch(()=>({samples:[]})),
        H.queryWorkouts({startDate:weekAgo.toISOString(),endDate:end.toISOString(),limit:100,ascending:false}).catch(()=>({workouts:[]}))
      ]);
      const stepSample=(stepsRes.samples||[]).at(-1),hrSamples=hrRes.samples||[],hrValues=hrSamples.map(s=>Number(s.values?.average??s.value)).filter(Number.isFinite),weightSample=(weightRes.samples||[])[0];
      saveHealthCache({
        ...loadHealthCache(),connected:true,
        steps:Number(stepSample?.value)||0,
        heartRate:hrValues.length?hrValues.reduce((a,b)=>a+b,0)/hrValues.length:null,
        weight:Number.isFinite(Number(weightSample?.value))?Number(weightSample.value):null,
        workouts:(workoutRes.workouts||[]).length,
        lastSync:new Date().toISOString()
      });
      toast?.('Health Connect sincronizado.');
    }catch(error){
      console.warn('Health Connect sync',error);
      toast?.('Não foi possível ler os dados do Health Connect.');
    }
    renderApp?.();
  }

  function useWeight(){
    const data=loadHealthCache(),weight=Number(data.weight);
    if(!Number.isFinite(weight)||weight<=0)return toast?.('Nenhum peso disponível no Health Connect.');
    if(typeof state==='undefined'||!Array.isArray(state.metrics))return;
    const date=typeof today==='function'?today():new Date().toISOString().slice(0,10),existing=state.metrics.find(m=>m.date===date);
    if(existing)existing.weight=weight;else state.metrics.push({date,weight});
    if(state.profile)state.profile.weight=weight;
    saveLocal?.();renderApp?.();toast?.('Peso registrado no Progressa.');
  }

  async function openSettings(){
    const H=healthPlugin();
    if(!isNativeAndroid()||!H)return toast?.('Abra esta opção pelo app Android.');
    try{await H.openHealthConnectSettings()}catch{toast?.('Não foi possível abrir o Health Connect.')}
  }

  function workoutNotes(session){
    const lines=(session.exercises||[]).map(item=>{
      const name=typeof EX!=='undefined'?(EX[item.id]?.name||item.id):item.id;
      const done=(item.sets||[]).filter(s=>s?.done);
      return `${name}: ${done.length||item.sets?.length||0} séries`;
    });
    if(session.cardio>0)lines.push(`Cardio: ${session.cardio} min ${typeof cardioName==='function'?cardioName(session.cardioType):session.cardioType||''}`);
    if(session.rpe)lines.push(`RPE: ${session.rpe}/10`);
    if(session.notes)lines.push(session.notes);
    return lines.join('\n').slice(0,4000);
  }

  async function writeWorkout(session,startMs,endMs){
    const H=healthPlugin(),cache=loadHealthCache();
    if(!isNativeAndroid()||!H||!cache.connected||!session?.id)return false;
    const exported=cache.exportedWorkoutIds||{};
    if(exported[session.id])return true;
    try{
      const start=new Date(Number.isFinite(startMs)?startMs:Math.max(0,endMs-(+session.duration||1)*60000));
      const end=new Date(Number.isFinite(endMs)?endMs:Date.now());
      if(!(end>start))return false;
      const result=await H.saveWorkout({
        workoutType:'traditionalStrengthTraining',
        startDate:start.toISOString(),
        endDate:end.toISOString(),
        indoor:true,
        title:session.name||'Treino Progressa',
        notes:workoutNotes(session)
      });
      exported[session.id]={savedAt:new Date().toISOString(),healthId:result?.id||''};
      saveHealthCache({...cache,exportedWorkoutIds:exported,lastWorkoutWrite:new Date().toISOString()});
      return true;
    }catch(error){
      console.warn('Health Connect workout write',error);
      saveHealthCache({...cache,lastWorkoutWriteError:String(error?.message||error),lastWorkoutWriteAttempt:new Date().toISOString()});
      return false;
    }
  }

  function installWorkoutExport(){
    if(typeof window.finishWorkout!=='function'||window.__progressaHealthWorkoutExport)return;
    const baseFinish=window.finishWorkout;
    window.finishWorkout=function(){
      const activeId=typeof state!=='undefined'?state.active?.id:null;
      const startedAt=typeof state!=='undefined'?Number(state.active?.startedAt):NaN;
      const endedAt=Date.now();
      const result=baseFinish.apply(this,arguments);
      if(activeId&&typeof state!=='undefined'){
        const saved=(state.sessions||[]).find(s=>s.id===activeId);
        if(saved)writeWorkout(saved,startedAt,endedAt).then(ok=>{if(ok)toast?.('Treino também registrado no Health Connect.');});
      }
      return result;
    };
    window.__progressaHealthWorkoutExport=true;
  }

  window.connectHealthConnect=connect;
  window.syncHealthConnect=sync;
  window.useHealthWeight=useWeight;
  window.openHealthConnectSettings=openSettings;
  window.writeProgressaWorkoutToHealth=writeWorkout;
  installCard();
  installWorkoutExport();
})();