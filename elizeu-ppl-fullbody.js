/* Progressa v6.4.22 — aplica uma única vez PPL + Full Body ao perfil do Elizeu Santos */
(function(){
  const VERSION='elizeu_ppl_fullbody_2026_10_11_v1';
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const isElizeu=()=>normalize(state?.profile?.name).startsWith('elizeu santos');
  const cardioOptions=['treadmill','elliptical','bike_h','bike_v','walk','stair','rower','jump_rope','curved_treadmill'];

  function makePlan(){
    const oldDays=Array.isArray(state?.plan?.days)?state.plan.days:[];
    const oldId=(index,fallback)=>oldDays[index]?.id||fallback;
    return {
      id:state?.plan?.id||'elizeu-ppl-fullbody-4x',
      name:'PPL + Full Body — 4 dias',
      source:'Imagem enviada pela usuária',
      status:'active',
      createdAt:'2026-10-11',
      cycleWeeks:6,
      days:[
        {
          id:oldId(0,'elizeu-push'),
          name:'Treino A — Push',
          cardio:0,
          exercises:[
            {id:'bench_press_dumbbell',sets:4,reps:'6–10',rest:75,reason:'Ficha enviada: Supino reto com halteres.'},
            {id:'incline_press_dumbbell',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Supino inclinado com halteres.'},
            {id:'shoulder_db',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Desenvolvimento com halteres.'},
            {id:'lateral_raise_db',sets:3,reps:'12–20',rest:75,reason:'Ficha enviada: Elevação lateral.'},
            {id:'triceps',sets:2,reps:'10–15',rest:75,reason:'Ficha enviada: Tríceps corda.'},
            {id:'triceps_overhead_db',sets:2,reps:'10–15',rest:75,reason:'Ficha enviada: Tríceps francês.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:oldId(1,'elizeu-pull'),
          name:'Treino B — Pull',
          cardio:0,
          exercises:[
            {id:'pulldown',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Puxada aberta.'},
            {id:'row',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Remada aberta.'},
            {id:'one_arm_row_db',sets:2,reps:'10–15 por lado',rest:75,reason:'Ficha enviada: Remada unilateral.'},
            {id:'reverse_pecdeck',sets:3,reps:'12–20',rest:75,reason:'Ficha enviada: Inverso máquina.'},
            {id:'curl_alternating_db',sets:3,reps:'8–12 por lado',rest:75,reason:'Ficha enviada: Rosca alternada.'},
            {id:'hammer_curl',sets:2,reps:'10–15',rest:75,reason:'Ficha enviada: Rosca martelo.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:oldId(2,'elizeu-legs'),
          name:'Treino C — Legs',
          cardio:0,
          exercises:[
            {id:'legpress',sets:4,reps:'6–10',rest:75,reason:'Ficha enviada: Leg press 45°.'},
            {id:'stiff_barbell',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Terra romeno.'},
            {id:'extension',sets:3,reps:'10–15',rest:75,reason:'Ficha enviada: Cadeira extensora.'},
            {id:'curllying',sets:3,reps:'10–15',rest:75,reason:'Ficha enviada: Mesa flexora.'},
            {id:'calf_press_legpress',sets:4,reps:'10–15',rest:75,reason:'Ficha enviada: Panturrilha no leg press.'},
            {id:'cable_crunch',sets:3,reps:'10–15',rest:75,reason:'Ficha enviada: Abdominal na polia.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        },
        {
          id:oldId(3,'elizeu-fullbody'),
          name:'Treino D — Full Body',
          cardio:0,
          exercises:[
            {id:'barbell_squat',sets:3,reps:'6–10',rest:75,reason:'Ficha enviada: Agachamento com barra.'},
            {id:'bench_press_dumbbell',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Supino reto com halteres.'},
            {id:'row',sets:3,reps:'8–12',rest:75,reason:'Ficha enviada: Remada aberta.'},
            {id:'curl',sets:3,reps:'10–15',rest:75,reason:'Ficha enviada: Cadeira flexora.'},
            {id:'lateral_raise_db',sets:2,reps:'12–20',rest:75,reason:'Ficha enviada: Elevação lateral.'},
            {id:'seated_calf',sets:3,reps:'12–20',rest:75,reason:'Ficha enviada: Panturrilha sentada.'},
            {id:'hanging_leg_raise',sets:3,reps:'8–15',rest:75,reason:'Ficha enviada: Elevação de pernas suspenso.'}
          ],
          cardioType:'bike_h',cardioOptions:[...cardioOptions],lockedExerciseIds:[]
        }
      ]
    };
  }

  function applyOnce(){
    if(typeof state==='undefined'||!isElizeu())return false;
    state.meta=state.meta||{};
    if(state.meta.elizeuPplFullBodyVersion===VERSION)return false;
    state.plan=makePlan();
    state.meta.elizeuPplFullBodyVersion=VERSION;
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
    }catch(error){console.warn('Falha ao salvar PPL + Full Body do Elizeu',error)}
  }

  if(typeof normalizeState==='function'){
    const beforeNormalize=normalizeState;
    normalizeState=function(){beforeNormalize();if(applyOnce())persist();};
  }

  if(typeof renderApp==='function'){
    const beforeRender=renderApp;
    renderApp=function(){if(applyOnce())persist();return beforeRender();};
  }

  try{if(applyOnce())persist();}catch(error){console.warn('Falha ao aplicar PPL + Full Body do Elizeu',error)}
})();
