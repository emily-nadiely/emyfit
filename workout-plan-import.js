/* Progressa v6.4.28 — Central de Importação de Treino por foto, PDF e planilha */
(function(){
  if(typeof EX==='undefined'||typeof modal!=='function')return;

  const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  let draft=null,busy=false;

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[º°]/g,'').replace(/[^a-z0-9%+\-×x ]+/g,' ').replace(/\s+/g,' ').trim();

  const ALIASES={
    bench_press_dumbbell:['supino reto halteres','sup reto halteres','supino halteres'],
    incline_press_dumbbell:['supino inclinado halteres','supino incl halteres','sup incl halteres'],
    shoulder_db:['desenvolvimento halteres','desenv halteres','desenvolvimento militar halteres'],
    lateral_raise_db:['elevacao lateral','elevação lateral'],
    triceps:['triceps corda','tríceps corda'],
    triceps_overhead_db:['triceps frances','tríceps francês','frances halter','francês halter'],
    pulldown:['puxada aberta','puxada frente','puxada frontal','pulley frente'],
    row:['remada aberta','remada baixa','remada sentada'],
    one_arm_row_db:['remada unilateral','serrote'],
    reverse_pecdeck:['inverso maquina','inverso máquina','crucifixo inverso maquina','voador inverso'],
    curl_alternating_db:['rosca alternada'],
    hammer_curl:['rosca martelo'],
    legpress:['leg press 45','leg press45','leg press'],
    stiff_barbell:['terra romeno','romeno','stiff'],
    extension:['cadeira extensora','extensora'],
    curllying:['mesa flexora'],
    curl:['cadeira flexora','flexora sentada'],
    seated_calf:['panturrilha sentada','panturr sentado'],
    calf_press_legpress:['panturrilha leg press','panturr leg press'],
    cable_crunch:['abdominal polia','abdominal na polia'],
    barbell_squat:['agachamento barra','agach livre','agachamento livre'],
    hip_thrust_barbell:['elevacao pelvica barra','elevação pélvica barra','hip thrust barra'],
    hip:['elevacao pelvica maquina','elevação pélvica máquina','glute drive'],
    abductor:['cadeira abdutora','abdutora'],
    adductor_machine:['cadeira adutora','adutora'],
    hanging_leg_raise:['pernas suspenso','pernas suspensas','elevacao de pernas suspenso','elevação de pernas suspenso']
  };

  function loadScript(src,test){
    if(test())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const old=[...document.scripts].find(s=>s.src===src);
      if(old){old.addEventListener('load',()=>test()?resolve():reject(new Error('Biblioteca indisponível')),{once:true});old.addEventListener('error',()=>reject(new Error('Falha ao carregar biblioteca')),{once:true});return;}
      const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>test()?resolve():reject(new Error('Biblioteca indisponível'));s.onerror=()=>reject(new Error('Falha ao carregar biblioteca'));document.head.appendChild(s);
    });
  }

  function status(title,detail='',pct=10){
    const t=document.getElementById('workoutImportTitle'),d=document.getElementById('workoutImportDetail'),b=document.getElementById('workoutImportBar');
    if(t)t.textContent=title;if(d)d.textContent=detail;if(b)b.style.width=Math.max(3,Math.min(100,pct))+'%';
  }

  function busyModal(file){
    modal('<span class="eyebrow">IMPORTAR TREINO</span><h2 id="workoutImportTitle">Preparando arquivo</h2><p id="workoutImportDetail" class="muted small">'+esc(file.name)+'</p><div class="import-progress"><span id="workoutImportBar"></span></div><div class="notice"><b>Nada será alterado automaticamente.</b><br>O Progressa mostra uma prévia do treino reconhecido antes de substituir sua ficha atual.</div>');
  }

  async function readPdf(file){
    await loadScript(PDFJS_URL,()=>!!window.pdfjsLib);window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';const pages=Math.min(pdf.numPages,10);
    for(let p=1;p<=pages;p++){status('Lendo PDF','Página '+p+' de '+pages,8+p/pages*45);const page=await pdf.getPage(p),tc=await page.getTextContent();out+='\n'+tc.items.map(x=>x.str||'').join(' ')+'\n'+tc.items.map(x=>x.str||'').join('\n');}
    if(norm(out).length>80)return out;
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);out='';
    for(let p=1;p<=Math.min(pages,5);p++){const page=await pdf.getPage(p),vp=page.getViewport({scale:1.6}),canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;const r=await window.Tesseract.recognize(canvas,'por',{logger:m=>{if(m.status==='recognizing text')status('Reconhecendo PDF','Página '+p+' · '+Math.round((m.progress||0)*100)+'%',55+(m.progress||0)*35)}});out+='\n'+(r.data?.text||'');}
    return out;
  }

  async function readImage(file){
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);
    const r=await window.Tesseract.recognize(file,'por',{logger:m=>{if(m.status==='recognizing text')status('Reconhecendo imagem',Math.round((m.progress||0)*100)+'%',15+(m.progress||0)*75)}});
    return r.data?.text||'';
  }

  async function readSheet(file){
    await loadScript(XLSX_URL,()=>!!window.XLSX);status('Lendo planilha','Extraindo células',35);
    const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});let out='';
    for(const name of wb.SheetNames){out+='\n### '+name+'\n'+window.XLSX.utils.sheet_to_csv(wb.Sheets[name],{FS:'\t'});}
    return out;
  }

  async function extract(file){
    const n=String(file.name||'').toLowerCase(),t=file.type||'';
    if(t==='application/pdf'||n.endsWith('.pdf'))return readPdf(file);
    if(t.startsWith('image/')||/\.(png|jpe?g|webp|heic|heif)$/i.test(n))return readImage(file);
    if(/\.(xlsx?|ods)$/i.test(n))return readSheet(file);
    if(/\.(csv|txt|tsv)$/i.test(n))return file.text();
    throw new Error('Formato não suportado. Use PDF, foto, XLS/XLSX, CSV ou TXT.');
  }

  function exerciseAliases(id,e){
    const list=[e.name,e.machine,...(ALIASES[id]||[])].filter(Boolean).map(norm).filter(x=>x.length>=4);
    return [...new Set(list)].sort((a,b)=>b.length-a.length);
  }

  function findExercise(text){
    const n=norm(text);let best=null;
    for(const [id,e] of Object.entries(EX)){
      for(const alias of exerciseAliases(id,e)){
        if(n.includes(alias)){const score=alias.length;if(!best||score>best.score)best={id,score};break;}
      }
    }
    return best?.id||null;
  }

  function parseSetsReps(text){
    const s=String(text||'').replace(/O/g,'0');
    let m=s.match(/(\d{1,2})\s*[x×]\s*(\d{1,3})\s*[-–a]\s*(\d{1,3})/i);
    if(m)return {sets:+m[1],reps:m[2]+'–'+m[3]};
    m=s.match(/(\d{1,2})\s*[x×]\s*(\d{1,3})/i);
    if(m)return {sets:+m[1],reps:m[2]};
    return null;
  }

  function heading(line,index){
    const n=norm(line);
    const m=n.match(/(?:^|\s)(push|pull|legs?|full body|upper\s*\d*|lower\s*\d*|treino\s*[a-z0-9]+|dia\s*\d+)(?:$|\s)/);
    if(!m)return null;
    const label=m[1].replace(/\b\w/g,x=>x.toUpperCase());
    return {name:'Treino '+(index+1)+' — '+label};
  }

  function parse(raw,fileName){
    const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    let days=[],current=null;
    const ensure=()=>{if(!current){current={name:'Treino 1',exercises:[]};days.push(current)}return current};
    for(let i=0;i<lines.length;i++){
      const h=heading(lines[i],days.length);if(h){current={...h,exercises:[]};days.push(current);continue;}
      const combined=[lines[i],lines[i+1]||'',lines[i+2]||''].join(' ');
      const id=findExercise(combined);if(!id)continue;
      const day=ensure();if(day.exercises.some(x=>x.id===id))continue;
      const sr=parseSetsReps(combined)||parseSetsReps(lines[i-1]||'')||{sets:EX[id]?.sets||3,reps:EX[id]?.reps||'10–15'};
      day.exercises.push({id,sets:Math.max(1,Math.min(10,+sr.sets||3)),reps:sr.reps||EX[id]?.reps||'10–15'});
    }
    days=days.filter(d=>d.exercises.length);
    if(!days.length)throw new Error('Não consegui reconhecer exercícios no arquivo. Tente uma foto mais nítida ou um PDF/planilha com os nomes dos exercícios.');
    return {fileName,days,raw};
  }

  function review(){
    const total=draft.days.reduce((n,d)=>n+d.exercises.length,0);
    modal('<span class="eyebrow">CONFERIR TREINO IMPORTADO</span><h2>'+draft.days.length+' treino'+(draft.days.length===1?'':'s')+' · '+total+' exercícios reconhecidos</h2><p class="muted small">Arquivo: <b>'+esc(draft.fileName)+'</b>. Confira os exercícios, séries e repetições antes de substituir a ficha.</p><div id="workoutImportReview">'+draft.days.map((d,di)=>'<div class="card flat import-day"><label>Nome do treino</label><input id="impDayName'+di+'" value="'+esc(d.name)+'">'+d.exercises.map((x,xi)=>'<div class="import-ex-row"><select id="impEx'+di+'_'+xi+'">'+Object.entries(EX).sort((a,b)=>a[1].name.localeCompare(b[1].name,'pt-BR')).map(([id,e])=>'<option value="'+id+'" '+(id===x.id?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select><input id="impSets'+di+'_'+xi+'" type="number" min="1" max="10" value="'+x.sets+'" aria-label="Séries"><input id="impReps'+di+'_'+xi+'" value="'+esc(x.reps)+'" aria-label="Repetições"></div>').join('')+'</div>').join('')+'</div><div class="notice"><b>Seu histórico será preservado.</b><br>Confirmar substitui somente o plano atual desta conta; treinos já concluídos, cargas e relatórios não são apagados.</div><button class="btn primary block" style="margin-top:14px" onclick="applyImportedWorkout()">Substituir plano atual por este treino</button><button class="btn secondary block" style="margin-top:8px" onclick="openWorkoutImport()">Escolher outro arquivo</button>');
  }

  window.openWorkoutImport=function(){
    if(busy)return;
    const input=document.createElement('input');input.type='file';input.accept='application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.xls,.xlsx,.ods,.csv,.tsv,.txt';input.style.display='none';document.body.appendChild(input);
    input.onchange=async()=>{const file=input.files?.[0];input.remove();if(!file)return;busy=true;busyModal(file);try{const text=await extract(file);status('Interpretando treino','Identificando dias, exercícios, séries e repetições',92);draft=parse(text,file.name);status('Pronto','Revise antes de aplicar',100);setTimeout(review,150)}catch(error){closeModal();modal('<span class="eyebrow">IMPORTAR TREINO</span><h2>Não consegui importar</h2><p class="muted">'+esc(error.message||error)+'</p><button class="btn primary block" onclick="openWorkoutImport()">Tentar outro arquivo</button>')}finally{busy=false}};
    input.click();
  };

  window.applyImportedWorkout=function(){
    if(!draft)return;
    const days=draft.days.map((d,di)=>({
      id:uid(),
      name:(document.getElementById('impDayName'+di)?.value||d.name).trim()||('Treino '+(di+1)),
      cardio:0,
      exercises:d.exercises.map((x,xi)=>{
        const id=document.getElementById('impEx'+di+'_'+xi)?.value||x.id,e=EX[id];
        return {id,sets:Math.max(1,+document.getElementById('impSets'+di+'_'+xi)?.value||x.sets),reps:(document.getElementById('impReps'+di+'_'+xi)?.value||x.reps).trim(),rest:e?.rest||75,reason:'Importado de '+draft.fileName};
      }),
      cardioType:'bike_h',cardioOptions:Object.keys(CARDIO),lockedExerciseIds:[]
    }));
    state.plan={id:uid(),name:'Treino importado — '+draft.fileName.replace(/\.[^.]+$/,''),createdAt:today(),cycleWeeks:6,status:'active',source:'Arquivo importado pelo Progressa',days};
    state.meta=state.meta||{};state.meta.lastWorkoutImport={fileName:draft.fileName,at:new Date().toISOString()};
    saveLocal();closeModal();screen='workout';renderApp();toast('Novo treino importado e salvo. Histórico preservado.');draft=null;
  };

  const workoutBeforeImport=workoutScreen;
  workoutScreen=function(){
    const html=workoutBeforeImport();
    if(state.active)return html;
    const card='<div class="card workout-import-card"><div class="row between"><div><span class="eyebrow">IMPORTAR TREINO</span><h3>Foto, PDF ou planilha</h3><p class="muted small">O Progressa lê o arquivo, reconhece o treino e mostra uma prévia antes de substituir sua ficha.</p></div><button class="btn secondary" onclick="openWorkoutImport()">Importar</button></div></div>';
    const marker='<div class="card">';
    return html.includes(marker)?html.replace(marker,card+marker):card+html;
  };
})();