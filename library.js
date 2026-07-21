
/* GYM Premium v4.0 — biblioteca aberta de exercícios
   Fontes: wger REST API (dados/imagens/licenças) + Exercemus (fallback de dados/vídeos).
*/
const GYM_LIBRARY = {
  wgerUrl: 'https://wger.de/api/v2/exerciseinfo/?limit=1000',
  fallbackUrl: 'https://raw.githubusercontent.com/exercemus/exercises/minified/minified-exercises.json',
  cacheKey: 'gym_open_exercise_library_v4',
  cacheHours: 24,
  items: [],
  source: '',
  loading: false,
  error: ''
};
const CORE_REMOTE_MEDIA={};
const CORE_ALIASES={
  extension:['Leg Extensions','Leg Extension'],
  curl:['Seated Leg Curl'],
  curllying:['Lying Leg Curls','Lying Leg Curl'],
  hip:['Hip Thrust','Glute Drive','Hip Extension with Machine'],
  abductor:['Thigh Abductor','Hip Abduction Machine','Abductor Machine'],
  glute:['Glute Kickback','Glute Kickback Machine'],
  pulldown:['Wide-Grip Lat Pulldown','Lat Pulldown','Front Pulldown'],
  row:['Seated Cable Rows','Seated Row','Row'],
  chest:['Seated Bench Press','Chest Press','Machine Bench Press'],
  pecdeck:['Butterfly','Pec Deck','Machine Fly'],
  shoulder:['Machine Shoulder (Military) Press','Machine Shoulder Press','Shoulder Press'],
  lateral:['Machine Lateral Raise','Lateral Raise Machine'],
  armcurl:['Machine Bicep Curl','Preacher Curl Machine','Biceps Curl Machine'],
  triceps:['Triceps Pushdown','Cable Triceps Pushdown','Triceps Pushdown - Rope Attachment'],
  crunch:['Machine Crunch','Ab Crunch Machine'],
  calf:['Standing Calf Raises','Seated Calf Raise','Calf Raise On A Dumbbell']
};
const EQUIPMENT_PT={
  machine:'Máquina',dumbbell:'Halteres',barbell:'Barra',cable:'Cabo/polia',none:'Peso corporal',bench:'Banco',
  'incline bench':'Banco inclinado','ez curl bar':'Barra W','pull-up bar':'Barra fixa',bands:'Elástico',
  kettlebell:'Kettlebell','gym mat':'Colchonete','exercise ball':'Bola suíça','medicine ball':'Medicine ball',other:'Outro'
};
const MUSCLE_PT={abs:'Abdômen',abductors:'Abdutores',adductors:'Adutores',biceps:'Bíceps',brachialis:'Braquial',calves:'Panturrilhas',
 chest:'Peitoral',forearms:'Antebraços',glutes:'Glúteos',hamstrings:'Posteriores de coxa',lats:'Dorsais','lower back':'Lombar',
 'middle back':'Costas',obliques:'Oblíquos',quads:'Quadríceps',shoulders:'Ombros',traps:'Trapézio',triceps:'Tríceps',
 'serratus anterior':'Serrátil anterior',soleus:'Sóleo'};
const normalizeText=s=>(s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const absUrl=u=>!u?'':u.startsWith('http')?u:`https://wger.de${u.startsWith('/')?'':'/'}${u}`;
const stripHtml=s=>{const d=document.createElement('div');d.innerHTML=s||'';return (d.textContent||'').trim()};
const youtubeThumb=u=>{if(!u)return'';const m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);return m?`https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`:''};
const ptEquipment=a=>(a||[]).map(x=>EQUIPMENT_PT[normalizeText(typeof x==='string'?x:(x.name||x.name_en||''))]||x.name||x.name_en||x).filter(Boolean);
const ptMuscles=a=>(a||[]).map(x=>MUSCLE_PT[normalizeText(typeof x==='string'?x:(x.name_en||x.name||''))]||x.name_en||x.name||x).filter(Boolean);
function normalizeWger(x){
  const trs=x.translations||[];
  const tr=trs.find(t=>t.language===7)||trs.find(t=>t.language===2)||trs.find(t=>/^[A-Za-z0-9]/.test(t.name||''))||trs[0]||{};
  const images=(x.images||[]).map(i=>({...i,image:absUrl(i.image)}));
  const main=images.find(i=>i.is_main)||images.find(i=>/3d/i.test(i.style||''))||images[0];
  const video=(x.videos||[])[0]?.video||'';
  return {id:`wger-${x.id}`,baseId:x.id,name:tr.name||`Exercício ${x.id}`,description:stripHtml(tr.description),instructions:stripHtml(tr.description).split(/\n|\.(?:\s+|$)/).map(s=>s.trim()).filter(s=>s.length>18).slice(0,8),equipment:ptEquipment(x.equipment),primary:ptMuscles(x.muscles),secondary:ptMuscles(x.muscles_secondary),image:main?.image||youtubeThumb(video),video,license:x.license||{},author:x.license_author||tr.license_author||'',source:'wger'};
}
function normalizeFallback(x,i){
  return {id:`open-${i}`,name:x.name,description:x.description||'',instructions:x.instructions||[],equipment:ptEquipment(x.equipment),primary:ptMuscles(x.primary_muscles),secondary:ptMuscles(x.secondary_muscles),image:youtubeThumb(x.video),video:x.video||'',license:x.license||{},author:x.license_author||'',source:'Exercemus'};
}
function saveLibraryCache(){try{localStorage.setItem(GYM_LIBRARY.cacheKey,JSON.stringify({saved:Date.now(),source:GYM_LIBRARY.source,items:GYM_LIBRARY.items}))}catch(e){console.warn('Biblioteca sem cache',e)}}
function loadLibraryCache(){try{const c=JSON.parse(localStorage.getItem(GYM_LIBRARY.cacheKey)||'null');if(c&&Date.now()-c.saved<GYM_LIBRARY.cacheHours*3600000&&c.items?.length){GYM_LIBRARY.items=c.items;GYM_LIBRARY.source=c.source||'cache';return true}}catch{}return false}
async function loadExerciseLibrary(force=false){
  if(GYM_LIBRARY.loading)return;
  if(!force&&(GYM_LIBRARY.items.length||loadLibraryCache())){bindCoreMedia();return}
  GYM_LIBRARY.loading=true;GYM_LIBRARY.error='';
  try{
    const r=await fetch(GYM_LIBRARY.wgerUrl,{headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error(`wger ${r.status}`);
    const j=await r.json();GYM_LIBRARY.items=(j.results||[]).map(normalizeWger).filter(x=>x.name);GYM_LIBRARY.source='wger';
  }catch(wgerError){
    try{
      const r=await fetch(GYM_LIBRARY.fallbackUrl);if(!r.ok)throw new Error(`fallback ${r.status}`);
      const j=await r.json();GYM_LIBRARY.items=(j.exercises||[]).map(normalizeFallback).filter(x=>x.name);GYM_LIBRARY.source='Exercemus';
    }catch(e){GYM_LIBRARY.error='Não foi possível carregar a biblioteca online. Verifique a internet.';console.warn(wgerError,e)}
  }
  GYM_LIBRARY.loading=false;if(GYM_LIBRARY.items.length){saveLibraryCache();bindCoreMedia()}
  if(screen==='library'||state?.profile?.onboardingComplete)renderApp();
}
function findExactExercise(names){const targets=names.map(normalizeText);return GYM_LIBRARY.items.find(x=>targets.includes(normalizeText(x.name)))}
function bindCoreMedia(){
  Object.entries(CORE_ALIASES).forEach(([id,names])=>{const x=findExactExercise(names);if(x?.image)CORE_REMOTE_MEDIA[id]=x});
}
const placeholderMedia=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f4f4f4"/><circle cx="400" cy="205" r="62" fill="#dfdfdf"/><path d="M290 390c20-90 70-135 110-135s90 45 110 135" fill="none" stroke="#c7c7c7" stroke-width="35" stroke-linecap="round"/><text x="400" y="470" text-anchor="middle" font-family="Arial" font-size="25" fill="#777">Imagem validada carregada online</text></svg>`)}`;
function coreMedia(id,e){return CORE_REMOTE_MEDIA[id]?.image||(id==='curl'?placeholderMedia:mediaSrc(e.media))}
function imageTag(src,alt,fallback=''){const safe=(src||placeholderMedia).replace(/"/g,'&quot;');const fb=(fallback||placeholderMedia).replace(/'/g,'&#39;');return `<img src="${safe}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fb}'">`}

// Atualiza os cards do treino com imagens da base aberta, mantendo ilustrações locais como fallback.
exercisePreview=function(x){const e=EX[x.id],remote=CORE_REMOTE_MEDIA[x.id];return `<div class="card flat"><div class="exercise-media">${imageTag(coreMedia(x.id,e),`Execução de ${e.name}`,mediaSrc(e.media))}</div><div class="row between"><div><h3>${e.name}</h3><span class="muted small">${x.sets} séries · ${x.reps} reps · ${x.rest}s</span></div><span class="pill">${e.machine}</span></div><p class="why">${x.reason}</p>${remote?`<p class="media-source">Imagem: ${remote.source}${remote.author?` · ${remote.author}`:''}</p>`:''}<button class="btn ghost sm" onclick="exerciseDetail('${x.id}')">Como executar</button></div>`};
activeExercise=function(x,ei){const e=EX[x.id],complete=x.sets.every(s=>s.done);return `<div class="card workout-card"><div class="exercise-media">${imageTag(coreMedia(x.id,e),`Execução de ${e.name}`,mediaSrc(e.media))}</div><div class="exercise-row"><div><div class="row wrap"><span class="pill">${e.machine}</span><span class="pill ${complete?'good':''}">${complete?'concluído':e.pattern}</span></div><h3 style="margin-top:9px">${e.name}</h3><p class="why">${e.why}</p></div><button class="btn secondary sm" onclick="exerciseDetail('${x.id}')">${icon('info')}</button></div><div class="row wrap"><button class="btn ghost sm" onclick="replacement('${x.id}',${ei})">Máquina ocupada</button><button class="btn ghost sm" onclick="startRest(${e.rest})">${icon('clock')} ${e.rest}s</button></div><div class="set-head"><span>#</span><span>kg</span><span>reps</span><span>RIR</span><span></span></div>${x.sets.map((s,si)=>`<div class="set-row"><b>${si+1}</b><input inputmode="decimal" value="${s.kg}" placeholder="kg" onchange="setValue(${ei},${si},'kg',this.value)"><input inputmode="numeric" value="${s.reps}" placeholder="reps" onchange="setValue(${ei},${si},'reps',this.value)"><input inputmode="numeric" value="${s.rir}" placeholder="2" onchange="setValue(${ei},${si},'rir',this.value)"><button class="set-check ${s.done?'done':''}" onclick="toggleSet(${ei},${si},${e.rest})">${s.done?icon('check'):'○'}</button></div>`).join('')}</div>`};
exerciseDetail=function(id){const e=EX[id],src=EVIDENCE[e.source],r=CORE_REMOTE_MEDIA[id];modal(`<span class="eyebrow">BIBLIOTECA DE EXERCÍCIOS</span><h2>${e.name}</h2><div class="exercise-media exercise-media-detail">${imageTag(coreMedia(id,e),`Execução de ${e.name}`,mediaSrc(e.media))}</div><div class="grid grid2"><div class="metric"><b>${e.machine}</b><span>equipamento</span></div><div class="metric"><b>${e.reps}</b><span>faixa sugerida</span></div></div><h3>Execução</h3><ol>${e.cues.map(c=>`<li>${c}</li>`).join('')}</ol><div class="notice"><b>Interrompa e reavalie se:</b><br>${e.avoid.join(' · ')}</div>${r?licenseBlock(r):''}<div class="source"><b>${src.title}</b><p>${src.note}</p></div><p class="muted small">A imagem ajuda a reconhecer o movimento, mas a regulagem e a execução devem ser conferidas presencialmente.</p>`)};

function licenseBlock(x){const l=x.license||{};const name=l.short_name||l.full_name||l.name||'Licença indicada pela fonte';const url=l.url||'';return `<div class="source"><b>Fonte visual: ${x.source}</b><p>${x.author?`Autor/fonte: ${x.author}. `:''}${url?`<a href="${url}" target="_blank" rel="noopener">${name}</a>`:name}</p></div>`}
function libraryCategory(x){const e=(x.equipment||[]).map(normalizeText);if(e.some(v=>v.includes('maquina')))return'machine';if(e.some(v=>v.includes('halter')))return'dumbbell';if(e.some(v=>v==='barra'||v.includes('barra w')))return'barbell';if(e.some(v=>v.includes('cabo')||v.includes('polia')))return'cable';if(e.some(v=>v.includes('peso corporal'))||!e.length)return'body';return'other'}
function libraryScreen(){setTimeout(()=>loadExerciseLibrary(),0);return `<section class="hero"><span class="eyebrow">BIBLIOTECA ABERTA</span><h2>Exercícios de máquinas, pesos livres, cabos e peso corporal.</h2><p>Dados, imagens, vídeos e licenças são carregados de fontes abertas. Resultados sem imagem usam vídeo como referência visual.</p></section><div class="card"><label>Pesquisar exercício</label><input id="librarySearch" placeholder="Ex.: rosca martelo, remada, flexora" oninput="renderLibraryResults()"><label>Categoria</label><select id="libraryCategory" onchange="renderLibraryResults()"><option value="all">Todas</option><option value="machine">Máquinas</option><option value="dumbbell">Halteres</option><option value="barbell">Barras</option><option value="cable">Cabos e polias</option><option value="body">Peso corporal</option><option value="other">Outros</option></select><div class="row wrap" style="margin-top:12px"><button class="btn secondary sm" onclick="loadExerciseLibrary(true)">Atualizar base</button><button class="btn ghost sm" onclick="setScreen('coach')">Abrir Coach</button></div></div><div id="libraryStatus">${GYM_LIBRARY.loading?'<div class="card"><p>Carregando biblioteca…</p></div>':GYM_LIBRARY.error?`<div class="notice">${GYM_LIBRARY.error}</div>`:''}</div><div id="libraryResults">${libraryResultsHtml()}</div>`}
function libraryResultsHtml(){if(!GYM_LIBRARY.items.length)return '<div class="card"><p class="muted">A biblioteca será carregada quando houver conexão com a internet.</p></div>';const q=normalizeText($('#librarySearch')?.value||''),cat=$('#libraryCategory')?.value||'all';const list=GYM_LIBRARY.items.filter(x=>(!q||normalizeText([x.name,x.description,...x.equipment,...x.primary].join(' ')).includes(q))&&(cat==='all'||libraryCategory(x)===cat)).slice(0,80);return `<div class="section-title"><h3>${list.length} resultados exibidos</h3><span>Fonte: ${GYM_LIBRARY.source}</span></div><div class="library-open-grid">${list.map(libraryCard).join('')}</div>${list.length===80?'<p class="muted small">Refine a busca para localizar outros exercícios.</p>':''}`}
function renderLibraryResults(){const e=$('#libraryResults');if(e)e.innerHTML=libraryResultsHtml()}
function libraryCard(x){return `<article class="library-open-card" onclick="openLibraryExercise('${x.id}')"><div class="library-open-media">${imageTag(x.image,`Demonstração de ${x.name}`)}</div><div class="library-open-body"><span class="eyebrow">${x.equipment.join(' · ')||'Exercício'}</span><h3>${x.name}</h3><p>${x.primary.join(' · ')||'Grupos musculares informados na ficha'}</p></div></article>`}
function openLibraryExercise(id){const x=GYM_LIBRARY.items.find(i=>i.id===id);if(!x)return;modal(`<span class="eyebrow">EXERCÍCIO DA BASE ABERTA</span><h2>${x.name}</h2><div class="exercise-media exercise-media-detail">${imageTag(x.image,`Demonstração de ${x.name}`)}</div><div class="grid grid2"><div class="metric"><b>${x.equipment.join(', ')||'—'}</b><span>equipamento</span></div><div class="metric"><b>${x.primary.join(', ')||'—'}</b><span>músculos principais</span></div></div>${x.description?`<p>${x.description}</p>`:''}${x.instructions?.length?`<h3>Execução</h3><ol>${x.instructions.slice(0,8).map(s=>`<li>${s}</li>`).join('')}</ol>`:''}${x.video?`<a class="btn primary block" href="${x.video}" target="_blank" rel="noopener">Abrir vídeo da execução</a>`:''}${licenseBlock(x)}<p class="muted small">Confira a execução com o professor da academia antes de aplicar carga.</p>`)}

const originalShell=shell;
shell=function(content){return `<div class="app-shell"><header class="topbar"><div class="brand"><div class="logo premium-logo-small"><img src="assets/icon-192.png?v=4.0" alt="GYM"></div><div><b>GYM</b><small>PREMIUM • PLANO ADAPTATIVO</small></div></div><div class="row"><button class="install-mini install-app-btn" onclick="installApp()">Instalar</button><div class="avatar">${(state.profile?.name||'E').slice(0,1).toUpperCase()}</div></div></header><main class="main">${content}</main><nav class="bottomnav">${[['home','home','Início'],['workout','workout','Treino'],['library','workout','Biblioteca'],['reports','chart','Relatórios'],['profile','user','Perfil']].map(x=>`<button class="${screen===x[0]?'active':''}" onclick="setScreen('${x[0]}')">${icon(x[1])}${x[2]}</button>`).join('')}</nav></div>`};
renderApp=function(){const fn={home:homeScreen,workout:workoutScreen,library:libraryScreen,coach:coachScreen,reports:reportsScreen,profile:profileScreen}[screen]||homeScreen;$('#app').innerHTML=shell(fn())};

loadExerciseLibrary();
