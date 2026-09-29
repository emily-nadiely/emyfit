/* Progressa v6.4.20 — aplica uma única vez a ficha PDF 4x ao perfil de Elizeu Santos */
(function(){
  const VERSION='elizeu_pdf_upper_lower_2026_09_28_v1';
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const isElizeu=()=>normalize(state?.profile?.name).startsWith('elizeu santos');

  const cardioOptions=['treadmill','elliptical','bike_h','bike_v','walk','stair','rower','jump_rope','curved_treadmill'];

  function makePlan(){
    const oldDays=Array.isArray(state?.plan?.days)?state.plan.days:[];
    const idByName=name=>oldDays.find(d=>d?.name===name)?.id;
    return {
      id:state?.plan?.id||'elizeu-upper-lower-4x',
      days:[
        {
          id:idByName('Treino A - Upper 1')||'elizeu-upper-1',
          name:'Treino A - Upper 1',
          cardio:0,
          exercises:[
            {id:'bench_press_barbell',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Supino reto (barra ou halteres).'},
            {id:'pulldown',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Puxada frente (pulley).'},
            {id:'shoulder_db',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Desenvolvimento com halteres.'},
            {id:'lateral_raise_db',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Elevação lateral.'},
            {id:'triceps',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Tríceps corda (polia).'},
            {id:'curl_barbell',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Rosca direta (barra).'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:idByName('Treino B - Lower 1')||'elizeu-lower-1',
          name:'Treino B - Lower 1',
          cardio:0,
          exercises:[
            {id:'barbell_squat',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Agachamento livre (ou goblet).'},
            {id:'stiff_barbell',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Stiff.'},
            {id:'curllying',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Mesa flexora.'},
            {id:'hip_thrust_barbell',reps:'12–15',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Elevação pélvica.'},
            {id:'calf',reps:'15–20',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Panturrilha em pé.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:idByName('Treino C - Upper 2')||'elizeu-upper-2',
          name:'Treino C - Upper 2',
          cardio:0,
          exercises:[
            {id:'incline_bench_barbell',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Supino inclinado.'},
            {id:'barbell_row',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Remada curvada (barra ou máquina).'},
            {id:'shoulder_db',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Desenvolvimento militar (halteres).'},
            {id:'curl_alternating_db',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Rosca alternada (halteres).'},
            {id:'skullcrusher_ez',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Tríceps testa (barra W).'},
            {id:'wrist_curl_barbell',reps:'15–20',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Rosca punho (barra).'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:idByName('Treino D - Lower 2')||'elizeu-lower-2',
          name:'Treino D - Lower 2',
          cardio:0,
          exercises:[
            {id:'legpress',reps:'10–12',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Leg press 45 graus.'},
            {id:'extension',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Cadeira extensora.'},
            {id:'curl',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Cadeira flexora.'},
            {id:'adductor_machine',reps:'12–15',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Cadeira adutora.'},
            {id:'seated_calf',reps:'15–20',rest:75,restRange:'60–90s',sets:3,reason:'Ficha enviada: Panturrilha sentado.'},
            {id:'crunch',reps:'15–20',rest:75,restRange:'60–90s',sets:2,reason:'Ficha enviada: Abdominal na máquina ou infra.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        }
      ],
      name:'Ficha 4x na semana — Upper / Lower',
      source:'PDF enviado pela usuária',
      status:'active',
      createdAt:'2026-09-28',
      cycleWeeks:6
    };
  }

  function applyOnce(){
    if(typeof state==='undefined'||!isElizeu())return false;
    state.meta=state.meta||{};
    if(state.meta.elizeuPdfPlanVersion===VERSION)return false;
    state.plan=makePlan();
    state.meta.elizeuPdfPlanVersion=VERSION;
    state.meta.updatedAt=new Date().toISOString();
    return true;
  }

  function persist(){
    try{
      if(typeof saveLocal==='function')saveLocal(false);
      if(typeof currentUser!=='undefined'&&currentUser&&typeof syncUp==='function'){
        clearTimeout(persist.timer);
        persist.timer=setTimeout(()=>syncUp().catch(()=>false),350);
      }
    }catch(error){console.warn('Falha ao salvar ficha do Elizeu',error)}
  }

  if(typeof normalizeState==='function'){
    const beforeNormalize=normalizeState;
    normalizeState=function(){
      beforeNormalize();
      if(applyOnce())persist();
    };
  }

  if(typeof renderApp==='function'){
    const beforeRender=renderApp;
    renderApp=function(){
      if(applyOnce())persist();
      return beforeRender();
    };
  }

  try{if(applyOnce())persist();}catch(error){console.warn('Falha ao aplicar ficha do Elizeu',error)}
})();
