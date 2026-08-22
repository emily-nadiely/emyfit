/* Progressa v6.4.2 — Cardio independente: preparação, cronômetro persistente e registro manual */
(function(){
  if(typeof workoutScreen!=='function')return;

  const workoutScreenBeforeCardio=workoutScreen;
  const sessionDetailBeforeCardio=typeof sessionDetail==='function'?sessionDetail:null;
  const nextDayBeforeCardio=typeof nextDay==='function'?nextDay:null;
  const syncDownBeforeCardio=typeof syncDown==='function'?syncDown:null;

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cardioActive=()=>state?.active?.mode==='cardio';
  const defaultCardioType=()=>CARDIO[state.profile?.cardio]?state.profile.cardio:'bike_h';
  let cardioPageOpen=false;
  let cardioSetupType=defaultCardioType();
  let manualDraft=null;

  function cardioBackupKey(){
    try{return `${localKey()}_cardio_running_v2`}catch{return 'progressa_cardio_running_v2'}
  }

  function writeCardioBackup(){
    if(!cardioActive())return;
    try{localStorage.setItem(cardioBackupKey(),JSON.stringify(state.active))}catch(error){console.warn('Falha ao criar backup do cardio',error)}
  }

  function clearCardioBackup(){
    try{localStorage.removeItem(cardioBackupKey())}catch{}
  }

  function readCardioBackup(){
    try{
      const raw=localStorage.getItem(cardioBackupKey());
      if(!raw)return null;
      const saved=JSON.parse(raw);
      if(!saved||saved.mode!=='cardio'||!saved.id||!saved.startedAt)return null;
      if((state.sessions||[]).some(s=>s.id===saved.id)){clearCardioBackup();return null;}
      return saved;
    }catch(error){console.warn('Falha ao ler backup do cardio',error);return null}
  }

  function restoreCardioBackup(){
    if(cardioActive()){writeCardioBackup();return false;}
    if(state.active)return false;
    const saved=readCardioBackup();
    if(!saved)return false;
    state.active={...saved,mode:'cardio',sessionType:'cardio',exercises:[],cardioDetails:{speed:'',incline:'',level:'',distance:'',pace:'',floors:'',rpm:'',...(saved.cardioDetails||{})}};
    saveLocal(false);
    return true;
  }

  function persistRunningCardio(immediateCloud=false){
    if(!cardioActive())return;
    saveLocal(false);
    writeCardioBackup();
    if(immediateCloud&&typeof syncUp==='function')syncUp().catch(()=>false);
    else if(typeof scheduleCloudSave==='function')scheduleCloudSave();
  }

  if(syncDownBeforeCardio){
    syncDown=async function(){
      const backup=readCardioBackup();
      const result=await syncDownBeforeCardio();
      if(backup&&!state.active&&!(state.sessions||[]).some(s=>s.id===backup.id)){
        state.active={...backup,mode:'cardio',sessionType:'cardio',exercises:[],cardioDetails:{speed:'',incline:'',level:'',distance:'',pace:'',floors:'',rpm:'',...(backup.cardioDetails||{})}};
        saveLocal(false);writeCardioBackup();
        if(typeof syncUp==='function')syncUp().catch(()=>false);
      }else if(cardioActive())writeCardioBackup();
      return result;
    };
  }

  window.addEventListener('pagehide',()=>{if(cardioActive()){saveLocal(false);writeCardioBackup();}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&cardioActive()){saveLocal(false);writeCardioBackup();}});

  function cardioElapsedSeconds(){
    const a=state?.active;
    if(!a||a.mode!=='cardio')return 0;
    const now=a.pausedAt?+a.pausedAt:Date.now();
    return Math.max(0,Math.floor((now-(+a.startedAt||now)-(+a.pausedMs||0))/1000));
  }

  function cardioTimeText(sec){
    sec=Math.max(0,Math.floor(+sec||0));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function blankDetails(){return {speed:'',incline:'',level:'',distance:'',pace:'',floors:'',rpm:''}}

  function cleanCardioDetails(type,raw={}){
    const num=k=>{const n=Number(raw[k]);return Number.isFinite(n)?n:0};
    const base={speed:0,incline:0,level:0,distance:0,pace:'',floors:0,rpm:0};
    if(type==='treadmill'||type==='curved_treadmill')return {...base,speed:num('speed'),incline:num('incline'),distance:num('distance')};
    if(type==='bike_h'||type==='bike_v')return {...base,level:num('level'),distance:num('distance'),rpm:num('rpm')};
    if(type==='elliptical'||type==='rower')return {...base,level:num('level'),distance:num('distance')};
    if(type==='stair')return {...base,level:num('level'),floors:num('floors')};
    if(type==='jump_rope')return {...base,level:num('level'),pace:String(raw.pace||'')};
    return {...base,distance:num('distance'),pace:String(raw.pace||'')};
  }

  function cardioFieldsHtml(type,details,onChange){
    const val=k=>esc(details?.[k]??'');
    const change=k=>`${onChange}('${k}',this.value)`;
    if(type==='treadmill'||type==='curved_treadmill')return `<div class="grid grid2"><div><label>Velocidade média (km/h)</label><input inputmode="decimal" type="number" step="0.1" value="${val('speed')}" oninput="${change('speed')}"></div><div><label>Inclinação (%)</label><input inputmode="decimal" type="number" step="0.5" value="${val('incline')}" oninput="${change('incline')}"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="${change('distance')}"></div></div>`;
    if(type==='bike_h'||type==='bike_v')return `<div class="grid grid2"><div><label>Nível / resistência</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="${change('level')}"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="${change('distance')}"></div><div><label>Cadência média (RPM)</label><input inputmode="numeric" type="number" min="0" value="${val('rpm')}" oninput="${change('rpm')}"></div></div>`;
    if(type==='elliptical'||type==='rower')return `<div class="grid grid2"><div><label>Nível / resistência</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="${change('level')}"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="${change('distance')}"></div></div>`;
    if(type==='stair')return `<div class="grid grid2"><div><label>Nível</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="${change('level')}"></div><div><label>Andares / lances</label><input inputmode="numeric" type="number" min="0" value="${val('floors')}" oninput="${change('floors')}"></div></div>`;
    if(type==='jump_rope')return `<div class="grid grid2"><div><label>Esforço da corda (1–10)</label><input inputmode="numeric" type="number" min="1" max="10" value="${val('level')}" oninput="${change('level')}"></div><div><label>Ritmo</label><input value="${val('pace')}" placeholder="ex.: intervalado" oninput="${change('pace')}"></div></div>`;
    return `<div class="grid grid2"><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="${change('distance')}"></div><div><label>Ritmo médio (min/km)</label><input value="${val('pace')}" placeholder="ex.: 10:30" oninput="${change('pace')}"></div></div>`;
  }

  function cardioSetupScreen(){
    const type=CARDIO[cardioSetupType]?cardioSetupType:defaultCardioType();
    cardioSetupType=type;
    if(manualDraft)return manualCardioScreen();
    return `<section class="hero"><span class="eyebrow">CARDIO</span><h2>Cardio</h2><p>Escolha o aparelho primeiro. O cronômetro só começa quando você tocar em <b>Iniciar cardio</b>.</p></section>
    <div class="card"><h3>Aparelho ou modalidade</h3><label>O que você vai fazer?</label><select onchange="setCardioSetupType(this.value)">${Object.keys(CARDIO).map(id=>`<option value="${id}" ${id===type?'selected':''}>${cardioName(id)}</option>`).join('')}</select><p class="muted small">Você pode iniciar o cronômetro agora ou registrar depois um cardio que já fez.</p></div>
    <div class="card"><button class="btn primary block" onclick="startCardioSession()">${icon('play')} Iniciar cardio</button><button class="btn secondary block" style="margin-top:8px" onclick="openManualCardio()">Registrar manualmente</button><button class="btn ghost block" style="margin-top:8px" onclick="closeCardioPage()">Voltar aos treinos</button></div>`;
  }

  function manualCardioScreen(){
    const d=manualDraft||{};
    const type=CARDIO[d.cardioType]?d.cardioType:cardioSetupType;
    return `<section class="hero"><span class="eyebrow">REGISTRO MANUAL</span><h2>Cardio</h2><p>Use esta opção quando você já fez ou já está fazendo o cardio e não iniciou o cronômetro no aplicativo.</p></section>
    <div class="card"><h3>Sessão</h3><label>Data</label><input type="date" value="${esc(d.date||today())}" onchange="saveManualCardioField('date',this.value)"><label>Aparelho ou modalidade</label><select onchange="changeManualCardioType(this.value)">${Object.keys(CARDIO).map(id=>`<option value="${id}" ${id===type?'selected':''}>${cardioName(id)}</option>`).join('')}</select><div class="grid grid2"><div><label>Minutos realizados</label><input inputmode="numeric" type="number" min="0" step="1" value="${esc(d.minutes??'')}" placeholder="ex.: 11" oninput="saveManualCardioField('minutes',this.value)"></div><div><label>Segundos</label><input inputmode="numeric" type="number" min="0" max="59" step="1" value="${esc(d.seconds??0)}" oninput="saveManualCardioField('seconds',this.value)"></div></div></div>
    <div class="card"><h3>Detalhes do aparelho</h3>${cardioFieldsHtml(type,d.cardioDetails||{},'saveManualCardioDetail')}<label>Esforço geral (RPE)</label><select onchange="saveManualCardioField('rpe',this.value)">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${String(d.rpe||6)===String(v)?'selected':''}>${v}${v<=3?' — leve':v<=6?' — moderado':v<=8?' — intenso':' — muito intenso'}</option>`).join('')}</select><label>Observações</label><textarea placeholder="Como foi o cardio, sensação, intervalos ou outra observação..." oninput="saveManualCardioField('notes',this.value)">${esc(d.notes||'')}</textarea></div>
    <div class="card"><button class="btn primary block" onclick="saveManualCardio()">${icon('check')} Salvar cardio</button><button class="btn secondary block" style="margin-top:8px" onclick="cancelManualCardio()">Voltar</button></div>`;
  }

  function cardioSessionScreen(){
    const a=state.active,type=CARDIO[a.cardioType]?a.cardioType:'bike_h',paused=!!a.pausedAt;
    return `<section class="hero"><span class="eyebrow">CARDIO EM ANDAMENTO</span><h2>${cardioName(type)}</h2><p>O cronômetro continua contando mesmo se você sair do aplicativo.</p><p class="small" style="margin-top:8px;opacity:.82">✓ Sessão salva localmente e sincronizada</p></section>
    <div class="card"><div class="row between"><div><span class="eyebrow">TEMPO DA SESSÃO</span><div id="cardioLiveTime" style="font-size:44px;font-weight:900;line-height:1.05;margin-top:8px">${cardioTimeText(cardioElapsedSeconds())}</div></div><span class="pill ${paused?'':'good'}">${paused?'Pausado':'Em andamento'}</span></div><button class="btn secondary block" style="margin-top:16px" onclick="pauseCardioSession()">${icon('clock')} ${paused?'Retomar':'Pausar'}</button></div>
    <div class="card"><h3>Modalidade</h3><label>Aparelho atual</label><select onchange="changeCardioSessionType(this.value)">${Object.keys(CARDIO).map(id=>`<option value="${id}" ${id===type?'selected':''}>${cardioName(id)}</option>`).join('')}</select><p class="muted small">Se precisar trocar de aparelho durante a sessão, o cronômetro não reinicia.</p></div>
    <div class="card"><h3>Monitoramento</h3>${cardioFieldsHtml(type,a.cardioDetails||{},'saveCardioSessionDetail')}<label>Esforço geral (RPE)</label><select onchange="saveCardioSessionField('rpe',this.value)">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${String(a.rpe||6)===String(v)?'selected':''}>${v}${v<=3?' — leve':v<=6?' — moderado':v<=8?' — intenso':' — muito intenso'}</option>`).join('')}</select><label>Observações</label><textarea placeholder="Como foi o cardio, sensação, intervalos ou outra observação..." oninput="saveCardioSessionField('notes',this.value)">${esc(a.notes||'')}</textarea></div>
    <div class="card"><button class="btn primary block" onclick="finishCardioSession()">${icon('check')} Concluir cardio</button><button class="btn danger block" style="margin-top:8px" onclick="cancelCardioSession()">Cancelar sessão</button></div>`;
  }

  window.openCardioPage=function(){
    if(state.active)return toast('Já existe uma sessão em andamento.');
    cardioPageOpen=true;manualDraft=null;cardioSetupType=defaultCardioType();screen='workout';renderApp();
  };

  window.closeCardioPage=function(){cardioPageOpen=false;manualDraft=null;screen='workout';renderApp();};
  window.setCardioSetupType=function(id){if(CARDIO[id])cardioSetupType=id;};

  window.openManualCardio=function(){
    manualDraft={date:today(),cardioType:CARDIO[cardioSetupType]?cardioSetupType:defaultCardioType(),minutes:'',seconds:0,cardioDetails:blankDetails(),rpe:6,notes:''};
    renderApp();
  };

  window.cancelManualCardio=function(){manualDraft=null;renderApp();};

  window.changeManualCardioType=function(id){
    if(!manualDraft||!CARDIO[id])return;
    manualDraft.cardioType=id;cardioSetupType=id;renderApp();
  };

  window.saveManualCardioField=function(key,value){
    if(!manualDraft)return;
    if(key==='rpe')manualDraft.rpe=+value||6;
    else if(key==='seconds')manualDraft.seconds=Math.max(0,Math.min(59,+value||0));
    else manualDraft[key]=value;
  };

  window.saveManualCardioDetail=function(key,value){
    if(!manualDraft)return;
    manualDraft.cardioDetails=manualDraft.cardioDetails||blankDetails();manualDraft.cardioDetails[key]=value;
  };

  window.saveManualCardio=function(){
    if(!manualDraft)return;
    const d=manualDraft,type=CARDIO[d.cardioType]?d.cardioType:defaultCardioType();
    const minutes=Math.max(0,Math.floor(+d.minutes||0)),secondsPart=Math.max(0,Math.min(59,Math.floor(+d.seconds||0))),totalSeconds=minutes*60+secondsPart;
    if(totalSeconds<=0)return toast('Informe o tempo realizado no cardio.');
    const roundedMinutes=Math.max(1,Math.round(totalSeconds/60)),id=uid();
    state.sessions.push({id,date:d.date||today(),name:'Cardio',dayId:null,sessionType:'cardio',entryMode:'manual',duration:roundedMinutes,cardio:roundedMinutes,cardioSeconds:totalSeconds,cardioType:type,cardioDetails:cleanCardioDetails(type,d.cardioDetails||{}),discomfort:{had:false,region:'',intensity:0,note:''},painAfter:0,rpe:+d.rpe||6,notes:d.notes||'',exercises:[],startedAt:null,endedAt:null});
    manualDraft=null;cardioPageOpen=false;saveLocal();screen='reports';renderApp();toast('Cardio registrado e sincronizado.');
  };

  window.startCardioSession=function(){
    if(state.active)return toast('Já existe uma sessão em andamento.');
    const type=CARDIO[cardioSetupType]?cardioSetupType:defaultCardioType();
    state.active={id:uid(),mode:'cardio',sessionType:'cardio',entryMode:'timer',date:today(),startedAt:Date.now(),pausedAt:null,pausedMs:0,dayId:null,exercises:[],cardioType:type,cardioDetails:blankDetails(),rpe:6,notes:''};
    cardioPageOpen=true;manualDraft=null;persistRunningCardio(true);screen='workout';renderApp();toast('Cardio iniciado.');
  };

  window.pauseCardioSession=function(){
    if(!cardioActive())return;
    const a=state.active;
    if(a.pausedAt){a.pausedMs=(+a.pausedMs||0)+(Date.now()-+a.pausedAt);a.pausedAt=null;toast('Cardio retomado.')}else{a.pausedAt=Date.now();toast('Cardio pausado.');}
    persistRunningCardio(true);renderApp();
  };

  window.changeCardioSessionType=function(id){
    if(!cardioActive()||!CARDIO[id])return;
    state.active.cardioType=id;persistRunningCardio();renderApp();
  };

  window.saveCardioSessionDetail=function(key,value){
    if(!cardioActive())return;
    state.active.cardioDetails=state.active.cardioDetails||blankDetails();state.active.cardioDetails[key]=value;persistRunningCardio();
  };

  window.saveCardioSessionField=function(key,value){
    if(!cardioActive())return;
    if(key==='rpe')state.active.rpe=+value||6;
    else if(key==='notes')state.active.notes=value;
    persistRunningCardio();
  };

  window.finishCardioSession=function(){
    if(!cardioActive())return;
    const a=state.active,seconds=cardioElapsedSeconds();
    if(seconds<10&&!confirm('O cronômetro registrou menos de 10 segundos. Deseja salvar mesmo assim?'))return;
    const minutes=Math.max(1,Math.round(seconds/60)),type=CARDIO[a.cardioType]?a.cardioType:'bike_h';
    state.sessions.push({id:a.id,date:a.date,name:'Cardio',dayId:null,sessionType:'cardio',entryMode:'timer',duration:minutes,cardio:minutes,cardioSeconds:seconds,cardioType:type,cardioDetails:cleanCardioDetails(type,a.cardioDetails||{}),discomfort:{had:false,region:'',intensity:0,note:''},painAfter:0,rpe:+a.rpe||6,notes:a.notes||'',exercises:[],startedAt:a.startedAt,endedAt:Date.now()});
    clearCardioBackup();state.active=null;cardioPageOpen=false;saveLocal();screen='reports';renderApp();toast('Cardio salvo e sincronizado.');
  };

  window.cancelCardioSession=function(){
    if(!cardioActive())return;
    if(confirm('Cancelar o cardio em andamento?')){clearCardioBackup();state.active=null;cardioPageOpen=false;saveLocal();screen='workout';renderApp();}
  };

  workoutScreen=function(){
    restoreCardioBackup();
    if(cardioActive())return cardioSessionScreen();
    if(cardioPageOpen&&!state.active)return cardioSetupScreen();
    const html=workoutScreenBeforeCardio();
    if(state.active)return html;
    try{
      const host=document.createElement('div');host.innerHTML=html;
      const card=document.createElement('div');card.className='card';card.setAttribute('role','button');card.setAttribute('tabindex','0');card.onclick=()=>openCardioPage();card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCardioPage();}};
      card.innerHTML=`<div class="row between"><div><span class="eyebrow">CARDIO</span><h3 style="margin-top:5px">Cardio</h3><span class="muted small">Abra para escolher o aparelho, iniciar o cronômetro<br>ou registrar manualmente um cardio já realizado</span></div><button class="btn secondary sm" onclick="event.stopPropagation();openCardioPage()">Abrir ${icon('arrow')}</button></div>`;
      const history=[...host.children].find(el=>el.classList?.contains('card')&&el.querySelector('h3')?.textContent.trim()==='Histórico recente');
      if(history)history.insertAdjacentElement('beforebegin',card);else host.appendChild(card);
      return host.innerHTML;
    }catch(error){console.warn('Falha ao inserir Cardio na tela de treino',error);return html;}
  };

  nextDay=function(){
    const days=state.plan?.days||[];if(!days.length)return nextDayBeforeCardio?nextDayBeforeCardio():undefined;
    const strength=(state.sessions||[]).filter(s=>s.sessionType!=='cardio'&&s.dayId).length;
    return days[strength%days.length];
  };

  weekSessions=function(){
    const d=new Date();d.setDate(d.getDate()-6);
    return (state.sessions||[]).filter(s=>s.sessionType!=='cardio'&&new Date(s.date)>=d);
  };

  if(sessionDetailBeforeCardio){
    sessionDetail=function(id){
      const s=(state.sessions||[]).find(x=>x.id===id);
      if(!s||s.sessionType!=='cardio')return sessionDetailBeforeCardio(id);
      const d=s.cardioDetails||{},rows=[];
      if(+d.speed)rows.push(['Velocidade média',`${d.speed} km/h`]);
      if(+d.incline)rows.push(['Inclinação',`${d.incline}%`]);
      if(+d.level)rows.push(['Nível / resistência',d.level]);
      if(+d.distance)rows.push(['Distância',`${d.distance} km`]);
      if(d.pace)rows.push(['Ritmo',d.pace]);
      if(+d.floors)rows.push(['Andares / lances',d.floors]);
      if(+d.rpm)rows.push(['Cadência média',`${d.rpm} RPM`]);
      const duration=s.cardioSeconds?cardioTimeText(s.cardioSeconds):`${s.cardio||s.duration||0} min`;
      modal(`<span class="eyebrow">CARDIO</span><h2>${cardioName(s.cardioType)}</h2><p class="muted">${fmt(s.date)}${s.entryMode==='manual'?' · registro manual':''}</p><div class="grid grid3"><div class="metric"><b>${duration}</b><span>duração</span></div><div class="metric"><b>${s.rpe||'—'}</b><span>RPE</span></div><div class="metric"><b>${cardioName(s.cardioType)}</b><span>modalidade</span></div></div>${rows.length?`<div class="card flat">${rows.map(([k,v])=>`<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`:''}<p><b>Observações:</b> ${esc(s.notes||'Nenhuma')}</p>`);
    };
  }

  setInterval(()=>{
    const el=document.getElementById('cardioLiveTime');
    if(el&&cardioActive()&&!state.active.pausedAt)el.textContent=cardioTimeText(cardioElapsedSeconds());
  },1000);
})();
