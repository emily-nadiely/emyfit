/* Progressa v6.4 — sessão independente de Cardio */
(function(){
  if(typeof workoutScreen!=='function')return;

  const workoutScreenBeforeCardio=workoutScreen;
  const sessionDetailBeforeCardio=typeof sessionDetail==='function'?sessionDetail:null;
  const nextDayBeforeCardio=typeof nextDay==='function'?nextDay:null;
  const weekSessionsBeforeCardio=typeof weekSessions==='function'?weekSessions:null;

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cardioActive=()=>state?.active?.mode==='cardio';

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

  function cardioDetailValue(key){return state?.active?.cardioDetails?.[key]??''}

  function cardioMonitorFields(){
    const id=state?.active?.cardioType||'bike_h';
    const val=k=>esc(cardioDetailValue(k));
    if(id==='treadmill'||id==='curved_treadmill')return `<div class="grid grid2"><div><label>Velocidade média (km/h)</label><input inputmode="decimal" type="number" step="0.1" value="${val('speed')}" oninput="saveCardioSessionField('speed',this.value)"></div><div><label>Inclinação (%)</label><input inputmode="decimal" type="number" step="0.5" value="${val('incline')}" oninput="saveCardioSessionField('incline',this.value)"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="saveCardioSessionField('distance',this.value)"></div></div>`;
    if(id==='bike_h'||id==='bike_v')return `<div class="grid grid2"><div><label>Nível / resistência</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="saveCardioSessionField('level',this.value)"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="saveCardioSessionField('distance',this.value)"></div><div><label>Cadência média (RPM)</label><input inputmode="numeric" type="number" min="0" value="${val('rpm')}" oninput="saveCardioSessionField('rpm',this.value)"></div></div>`;
    if(id==='elliptical'||id==='rower')return `<div class="grid grid2"><div><label>Nível / resistência</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="saveCardioSessionField('level',this.value)"></div><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="saveCardioSessionField('distance',this.value)"></div></div>`;
    if(id==='stair')return `<div class="grid grid2"><div><label>Nível</label><input inputmode="numeric" type="number" min="0" value="${val('level')}" oninput="saveCardioSessionField('level',this.value)"></div><div><label>Andares / lances</label><input inputmode="numeric" type="number" min="0" value="${val('floors')}" oninput="saveCardioSessionField('floors',this.value)"></div></div>`;
    if(id==='jump_rope')return `<div class="grid grid2"><div><label>Esforço da corda (1–10)</label><input inputmode="numeric" type="number" min="1" max="10" value="${val('level')}" oninput="saveCardioSessionField('level',this.value)"></div><div><label>Ritmo</label><input value="${val('pace')}" placeholder="ex.: intervalado" oninput="saveCardioSessionField('pace',this.value)"></div></div>`;
    return `<div class="grid grid2"><div><label>Distância (km)</label><input inputmode="decimal" type="number" step="0.01" value="${val('distance')}" oninput="saveCardioSessionField('distance',this.value)"></div><div><label>Ritmo médio (min/km)</label><input value="${val('pace')}" placeholder="ex.: 10:30" oninput="saveCardioSessionField('pace',this.value)"></div></div>`;
  }

  function cardioSessionScreen(){
    const a=state.active,type=a.cardioType||'bike_h',paused=!!a.pausedAt;
    return `<section class="hero"><span class="eyebrow">CARDIO</span><h2>${cardioName(type)}</h2><p>Monitoramento em andamento. O tempo é salvo automaticamente.</p><p class="small" style="margin-top:8px;opacity:.82">✓ Salvamento automático ativo</p></section>
    <div class="card"><div class="row between"><div><span class="eyebrow">TEMPO DA SESSÃO</span><div id="cardioLiveTime" style="font-size:44px;font-weight:900;line-height:1.05;margin-top:8px">${cardioTimeText(cardioElapsedSeconds())}</div></div><span class="pill ${paused?'':'good'}">${paused?'Pausado':'Em andamento'}</span></div><button class="btn secondary block" style="margin-top:16px" onclick="pauseCardioSession()">${icon('clock')} ${paused?'Retomar':'Pausar'}</button></div>
    <div class="card"><h3>Modalidade</h3><label>O que você está fazendo?</label><select onchange="changeCardioSessionType(this.value)">${Object.keys(CARDIO).map(id=>`<option value="${id}" ${id===type?'selected':''}>${cardioName(id)}</option>`).join('')}</select><p class="muted small">Você pode alterar a modalidade durante o registro sem reiniciar o cronômetro.</p></div>
    <div class="card"><h3>Monitoramento</h3>${cardioMonitorFields()}<label>Esforço geral (RPE)</label><select onchange="saveCardioSessionField('rpe',this.value)">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${String(a.rpe||6)===String(v)?'selected':''}>${v}${v<=3?' — leve':v<=6?' — moderado':v<=8?' — intenso':' — muito intenso'}</option>`).join('')}</select><label>Observações</label><textarea placeholder="Como foi o cardio, sensação, intervalos ou outra observação..." oninput="saveCardioSessionField('notes',this.value)">${esc(a.notes||'')}</textarea></div>
    <div class="card"><button class="btn primary block" onclick="finishCardioSession()">${icon('check')} Concluir cardio</button><button class="btn danger block" style="margin-top:8px" onclick="cancelCardioSession()">Cancelar sessão</button></div>`;
  }

  window.startCardioSession=function(){
    if(state.active)return toast('Já existe uma sessão em andamento.');
    const preferred=CARDIO[state.profile?.cardio]?state.profile.cardio:'bike_h';
    state.active={id:uid(),mode:'cardio',sessionType:'cardio',date:today(),startedAt:Date.now(),pausedAt:null,pausedMs:0,dayId:null,exercises:[],cardioType:preferred,cardioDetails:{speed:'',incline:'',level:'',distance:'',pace:'',floors:'',rpm:''},rpe:6,notes:''};
    saveLocal();screen='workout';renderApp();toast('Cardio iniciado.');
  };

  window.pauseCardioSession=function(){
    if(!cardioActive())return;
    const a=state.active;
    if(a.pausedAt){a.pausedMs=(+a.pausedMs||0)+(Date.now()-+a.pausedAt);a.pausedAt=null;toast('Cardio retomado.')}else{a.pausedAt=Date.now();toast('Cardio pausado.');}
    saveLocal();renderApp();
  };

  window.changeCardioSessionType=function(id){
    if(!cardioActive()||!CARDIO[id])return;
    state.active.cardioType=id;saveLocal();renderApp();
  };

  window.saveCardioSessionField=function(key,value){
    if(!cardioActive())return;
    if(key==='rpe')state.active.rpe=+value||6;
    else if(key==='notes')state.active.notes=value;
    else{state.active.cardioDetails=state.active.cardioDetails||{};state.active.cardioDetails[key]=value;}
    saveLocal();
  };

  window.finishCardioSession=function(){
    if(!cardioActive())return;
    const a=state.active,seconds=cardioElapsedSeconds();
    if(seconds<10&&!confirm('O cronômetro registrou menos de 10 segundos. Deseja salvar mesmo assim?'))return;
    const minutes=Math.max(1,Math.round(seconds/60)),type=CARDIO[a.cardioType]?a.cardioType:'bike_h',raw=a.cardioDetails||{};
    const num=k=>{const n=Number(raw[k]);return Number.isFinite(n)?n:0};
    const details={speed:num('speed'),incline:num('incline'),level:num('level'),distance:num('distance'),pace:String(raw.pace||''),floors:num('floors'),rpm:num('rpm')};
    state.sessions.push({id:a.id,date:a.date,name:'Cardio',dayId:null,sessionType:'cardio',duration:minutes,cardio:minutes,cardioSeconds:seconds,cardioType:type,cardioDetails:details,discomfort:{had:false,region:'',intensity:0,note:''},painAfter:0,rpe:+a.rpe||6,notes:a.notes||'',exercises:[],startedAt:a.startedAt,endedAt:Date.now()});
    state.active=null;saveLocal();screen='reports';renderApp();toast('Cardio salvo e sincronizado.');
  };

  window.cancelCardioSession=function(){
    if(!cardioActive())return;
    if(confirm('Cancelar o cardio em andamento?')){state.active=null;saveLocal();screen='workout';renderApp();}
  };

  workoutScreen=function(){
    if(cardioActive())return cardioSessionScreen();
    const html=workoutScreenBeforeCardio();
    if(state.active)return html;
    try{
      const host=document.createElement('div');host.innerHTML=html;
      const card=document.createElement('div');card.className='card';card.innerHTML=`<div class="row between"><div><span class="eyebrow">CARDIO</span><h3 style="margin-top:5px">Cardio</h3><span class="muted small">Esteira, bike, elíptico, escada e outras modalidades<br>com cronômetro e monitoramento da sessão</span></div><button class="btn primary sm" onclick="startCardioSession()">${icon('play')} Iniciar</button></div>`;
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
      modal(`<span class="eyebrow">CARDIO</span><h2>${cardioName(s.cardioType)}</h2><p class="muted">${fmt(s.date)}</p><div class="grid grid3"><div class="metric"><b>${duration}</b><span>duração</span></div><div class="metric"><b>${s.rpe||'—'}</b><span>RPE</span></div><div class="metric"><b>${cardioName(s.cardioType)}</b><span>modalidade</span></div></div>${rows.length?`<div class="card flat">${rows.map(([k,v])=>`<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`:''}<p><b>Observações:</b> ${esc(s.notes||'Nenhuma')}</p>`);
    };
  }

  setInterval(()=>{
    const el=document.getElementById('cardioLiveTime');
    if(el&&cardioActive()&&!state.active.pausedAt)el.textContent=cardioTimeText(cardioElapsedSeconds());
  },1000);
})();
