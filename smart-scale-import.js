/* Progressa v6.4.7 — leitura especializada de balança/bioimpedância */
(function(){
  if(typeof BODY_METRICS==='undefined'||typeof metricNum!=='function')return;

  Object.assign(BODY_METRICS,{
    bmi:{label:'IMC',unit:'',decimals:1,source:'scale'},
    fatMass:{label:'Massa de gordura',unit:'kg',decimals:1,source:'scale'},
    skeletalMusclePct:{label:'Massa muscular esquelética',unit:'%',decimals:1,source:'scale'},
    skeletalMuscleMass:{label:'Massa muscular esquelética',unit:'kg',decimals:1,source:'scale'},
    musclePct:{label:'Massa muscular total',unit:'%',decimals:1,source:'scale'},
    waterPct:{label:'Água corporal',unit:'%',decimals:1,source:'scale'},
    waterMass:{label:'Água corporal',unit:'kg',decimals:1,source:'scale'},
    visceralFat:{label:'Gordura visceral',unit:'',decimals:1,source:'scale'},
    boneMass:{label:'Massa óssea',unit:'kg',decimals:1,source:'scale'},
    bmr:{label:'Metabolismo basal',unit:'kcal/dia',decimals:0,source:'scale'},
    proteinPct:{label:'Proteína corporal',unit:'%',decimals:1,source:'scale'},
    obesityPct:{label:'Índice de obesidade (balança)',unit:'%',decimals:1,source:'scale'},
    metabolicAge:{label:'Idade metabólica',unit:'anos',decimals:0,source:'scale'},
    leanMass:{label:'Massa magra (LBM)',unit:'kg',decimals:2,source:'scale'},
    realAge:{label:'Idade informada',unit:'anos',decimals:0,source:'scale'},
    height:{label:'Altura',unit:'cm',decimals:0,source:'scale'}
  });
  BODY_METRICS.weight.decimals=2;
  BODY_METRICS.bodyFat.decimals=1;
  BODY_METRICS.muscleMass.label='Massa muscular total';
  BODY_METRICS.muscleMass.decimals=1;

  if(typeof metricFmt==='function'){
    metricFmt=function(value,key){
      if(value==null)return '—';
      const cfg=BODY_METRICS[key]||{unit:'',decimals:1};
      const decimals=Number.isFinite(cfg.decimals)?cfg.decimals:1;
      return `${(+value).toFixed(decimals).replace('.',',')} ${cfg.unit||''}`.trim();
    };
  }

  let scaleDraft=null;
  let scaleBusy=false;
  const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  const FIELDS={
    weight:'ssiWeight',bmi:'ssiBmi',bodyFat:'ssiBodyFat',fatMass:'ssiFatMass',skeletalMusclePct:'ssiSkeletalMusclePct',skeletalMuscleMass:'ssiSkeletalMuscleMass',musclePct:'ssiMusclePct',muscleMass:'ssiMuscleMass',waterPct:'ssiWaterPct',waterMass:'ssiWaterMass',visceralFat:'ssiVisceralFat',boneMass:'ssiBoneMass',bmr:'ssiBmr',proteinPct:'ssiProteinPct',obesityPct:'ssiObesityPct',metabolicAge:'ssiMetabolicAge',leanMass:'ssiLeanMass',realAge:'ssiRealAge',height:'ssiHeight',
    neck:'ssiNeck',shoulders:'ssiShoulders',chest:'ssiChest',waist:'ssiWaist',abd:'ssiAbd',hip:'ssiHip',armR:'ssiArmR',armL:'ssiArmL',forearmR:'ssiForearmR',forearmL:'ssiForearmL',thighR:'ssiThighR',thighL:'ssiThighL',calfR:'ssiCalfR',calfL:'ssiCalfL'
  };

  const ALIASES={
    weight:['peso(kg)','peso (kg)','peso kg','peso corporal','body weight'],
    bmi:['imc','bmi'],
    bodyFat:['gordura(%)','gordura (%)','gordura %','percentual de gordura','porcentagem de gordura','gordura corporal %','body fat %'],
    fatMass:['peso da gordura(kg)','peso da gordura (kg)','peso da gordura kg','massa de gordura','fat mass'],
    skeletalMusclePct:['percentual da massa muscular esquelética(%)','percentual da massa muscular esqueletica(%)','percentual da massa muscular esquelética','massa muscular esquelética(%)','skeletal muscle %'],
    skeletalMuscleMass:['peso da massa muscular esquelética(kg)','peso da massa muscular esqueletica(kg)','peso da massa muscular esquelética','massa muscular esquelética kg','skeletal muscle mass'],
    musclePct:['registro de massa muscular(%)','registro de massa muscular (%)','massa muscular(%)','massa muscular total(%)','muscle rate'],
    muscleMass:['peso da massa muscular(kg)','peso da massa muscular (kg)','peso da massa muscular kg','massa muscular total kg','muscle mass kg'],
    waterPct:['água(%)','agua(%)','água (%)','agua (%)','água corporal %','agua corporal %','body water %'],
    waterMass:['peso da água(kg)','peso da agua(kg)','peso da água (kg)','peso da agua (kg)','peso da água kg','peso da agua kg','water weight'],
    visceralFat:['gordura visceral','visceral fat'],
    boneMass:['ossos(kg)','ossos (kg)','massa óssea','massa ossea','bone mass'],
    bmr:['metabolismo basal','metabolismo','bmr'],
    proteinPct:['proteína(%)','proteina(%)','proteína (%)','proteina (%)','proteína corporal','protein %'],
    obesityPct:['obesidade(%)','obesidade (%)','grau de obesidade','índice de obesidade','indice de obesidade'],
    metabolicAge:['idade metabólica','idade metabolica','metabolic age'],
    leanMass:['lbm(kg)','lbm (kg)','massa corporal magra','massa magra','lean body mass','lean mass'],
    realAge:['idade real','idade cronológica','idade cronologica'],
    height:['altura(cm)','altura (cm)','altura cm','height'],
    neck:['circunferência do pescoço','circunferencia do pescoco','pescoço','pescoco'],
    shoulders:['circunferência dos ombros','circunferencia dos ombros','ombros'],
    chest:['circunferência do tórax','circunferencia do torax','tórax','torax','busto'],
    waist:['circunferência da cintura','circunferencia da cintura','cintura'],
    abd:['circunferência abdominal','circunferencia abdominal','abdômen','abdomen'],
    hip:['circunferência do quadril','circunferencia do quadril','quadril'],
    armR:['braço direito','braco direito','braço dir','braco dir'],
    armL:['braço esquerdo','braco esquerdo','braço esq','braco esq'],
    forearmR:['antebraço direito','antebraco direito','antebraço dir','antebraco dir'],
    forearmL:['antebraço esquerdo','antebraco esquerdo','antebraço esq','antebraco esq'],
    thighR:['coxa direita','coxa dir'],thighL:['coxa esquerda','coxa esq'],calfR:['panturrilha direita','panturrilha dir'],calfL:['panturrilha esquerda','panturrilha esq']
  };

  const RANGES={
    weight:[25,400],bmi:[10,80],bodyFat:[1,75],fatMass:[1,250],skeletalMusclePct:[5,70],skeletalMuscleMass:[3,120],musclePct:[10,90],muscleMass:[3,220],waterPct:[20,80],waterMass:[5,250],visceralFat:[1,60],boneMass:[1,15],bmr:[500,5000],proteinPct:[2,35],obesityPct:[-60,250],metabolicAge:[10,120],leanMass:[5,250],realAge:[10,120],height:[100,230],
    neck:[15,80],shoulders:[40,220],chest:[40,220],waist:[35,220],abd:[35,250],hip:[45,250],armR:[15,90],armL:[15,90],forearmR:[10,70],forearmL:[10,70],thighR:[20,120],thighL:[20,120],calfR:[15,80],calfL:[15,80]
  };

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[|]/g,' ').replace(/\s+/g,' ').trim();

  function loadScript(src,test){
    if(test())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){if(test())return resolve();existing.addEventListener('load',()=>test()?resolve():reject(new Error('Biblioteca indisponível')),{once:true});existing.addEventListener('error',()=>reject(new Error('Falha ao carregar biblioteca')),{once:true});return;}
      const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>test()?resolve():reject(new Error('Biblioteca indisponível'));s.onerror=()=>reject(new Error('Falha ao carregar biblioteca'));document.head.appendChild(s);
    });
  }

  function status(title,detail='',progress=null){
    const t=document.getElementById('metricImportStatusTitle'),d=document.getElementById('metricImportStatusDetail'),bar=document.getElementById('metricImportProgressBar');
    if(t)t.textContent=title;if(d)d.textContent=detail;if(bar&&progress!=null)bar.style.width=`${Math.max(2,Math.min(100,Math.round(progress)))}%`;
  }

  function busyModal(file){
    modal(`<span class="eyebrow">IMPORTANDO AVALIAÇÃO</span><h2 id="metricImportStatusTitle">Preparando arquivo</h2><p id="metricImportStatusDetail" class="muted small">${esc(file?.name||'Arquivo selecionado')}</p><div style="height:8px;background:var(--line);border-radius:999px;overflow:hidden;margin:16px 0"><div id="metricImportProgressBar" style="height:100%;width:4%;background:var(--primary,#ff1630);transition:width .2s ease"></div></div><div class="notice"><b>Leitura especializada para balança e bioimpedância.</b><br>Os valores são estimativas do aparelho. Confira todos os campos antes de salvar.</div>`);
  }

  function firstNumber(value){
    const m=String(value||'').match(/-?\d{1,4}(?:[.,]\d{1,3})?/);if(!m)return null;
    const n=Number(m[0].replace(',','.'));return Number.isFinite(n)?n:null;
  }

  function valid(key,value,line=''){
    if(value==null)return false;const range=RANGES[key]||[-Infinity,Infinity];if(value<range[0]||value>range[1])return false;
    const n=norm(line);
    if(key==='weight'&&/(peso da gordura|peso da massa|peso da agua|controle de peso|peso ideal|meta de peso)/.test(n))return false;
    if(key==='bodyFat'&&/(peso da gordura|gordura visceral)/.test(n))return false;
    if(key==='muscleMass'&&/(esquelet|registro de massa muscular|percentual)/.test(n))return false;
    if(key==='skeletalMuscleMass'&&/%/.test(line))return false;
    if(key==='skeletalMusclePct'&&/\bkg\b/.test(n)&&!/%/.test(line))return false;
    if(key==='waterPct'&&/(peso da agua)/.test(n))return false;
    return true;
  }

  function findValue(raw,key){
    const lines=String(raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),aliases=(ALIASES[key]||[]).slice().sort((a,b)=>b.length-a.length);
    for(const aliasRaw of aliases){
      const alias=norm(aliasRaw);
      for(let i=0;i<lines.length;i++){
        const nl=norm(lines[i]);if(!nl.includes(alias))continue;
        const candidates=[];
        const idx=nl.indexOf(alias),tail=lines[i].slice(Math.max(0,idx+aliasRaw.length));
        candidates.push(tail,lines[i]);if(lines[i+1])candidates.push(lines[i+1]);if(lines[i+2])candidates.push(lines[i+2]);
        for(const c of candidates){const v=firstNumber(c);if(valid(key,v,`${lines[i]} ${c}`))return v;}
      }
    }
    const compact=norm(raw);
    for(const aliasRaw of aliases){const alias=norm(aliasRaw),pos=compact.indexOf(alias);if(pos<0)continue;const snippet=compact.slice(pos,pos+alias.length+55),v=firstNumber(snippet.slice(alias.length));if(valid(key,v,snippet))return v;}
    return null;
  }

  function parseDate(raw){
    const text=String(raw||'');
    let m=text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=text.match(/\b(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-]((?:19|20)\d{2})\b/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return typeof today==='function'?today():new Date().toISOString().slice(0,10);
  }

  function parse(raw){const values={};for(const key of Object.keys(FIELDS)){const v=findValue(raw,key);if(v!=null)values[key]=v;}return {date:parseDate(raw),values,rawText:String(raw||'')}}

  async function readPdf(file){
    await loadScript(PDFJS_URL,()=>!!window.pdfjsLib);window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,maxPages=Math.min(pdf.numPages,8);let text='';
    for(let p=1;p<=maxPages;p++){status('Lendo PDF',`Página ${p} de ${maxPages}`,5+(p/maxPages)*45);const page=await pdf.getPage(p),content=await page.getTextContent(),items=(content.items||[]).map(x=>x.str||'');text+=`\n${items.join(' ')}\n${items.join('\n')}`;}
    if(norm(text).replace(/\s/g,'').length>80)return {text,method:'pdf-text'};
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);let ocr='';
    for(let p=1;p<=Math.min(maxPages,5);p++){const page=await pdf.getPage(p),viewport=page.getViewport({scale:1.8}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:ctx,viewport}).promise;const result=await window.Tesseract.recognize(canvas,'por',{logger:m=>{if(m.status==='recognizing text')status('Reconhecendo PDF',`Página ${p} · ${Math.round((m.progress||0)*100)}%`,50+(m.progress||0)*45)}});ocr+=`\n${result?.data?.text||''}`;}
    return {text:ocr,method:'ocr-pdf'};
  }

  async function readImage(file){
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);
    const result=await window.Tesseract.recognize(file,'por',{logger:m=>{if(m.status==='recognizing text')status('Reconhecendo imagem',`${Math.round((m.progress||0)*100)}% concluído`,12+(m.progress||0)*78);else if(m.status)status('Preparando leitura',m.status,10)}});
    return {text:result?.data?.text||'',method:'ocr-image'};
  }

  async function extract(file){const pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');if(pdf)return readPdf(file);if((file.type||'').startsWith('image/')||/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name||''))return readImage(file);throw new Error('Formato não suportado. Use PDF, JPG, PNG ou WEBP.')}

  function field(key){const cfg=BODY_METRICS[key],value=scaleDraft?.values?.[key],step=(cfg?.decimals||0)>=2?'0.01':(cfg?.decimals||0)===0?'1':'0.1';return `<div><label>${esc(cfg?.label||key)}${cfg?.unit?` (${esc(cfg.unit)})`:''}</label><input id="${FIELDS[key]}" type="number" step="${step}" value="${value==null?'':esc(value)}"></div>`}

  function section(title,keys){return `<div class="metric-section"><h4>${title}</h4><div class="grid grid2">${keys.map(field).join('')}</div></div>`}

  function review(){
    const found=Object.keys(scaleDraft?.values||{}).length,method=scaleDraft?.method==='pdf-text'?'texto do PDF':scaleDraft?.method==='ocr-pdf'?'OCR do PDF':'OCR da imagem';
    modal(`<span class="eyebrow">CONFERIR BIOIMPEDÂNCIA</span><h2>${found?`${found} dado${found===1?'':'s'} reconhecido${found===1?'':'s'}`:'Nenhum dado reconhecido automaticamente'}</h2><p class="muted small">Arquivo: <b>${esc(scaleDraft?.fileName||'')}</b> · ${method}. Os valores abaixo são os informados pela balança/app; confira antes de salvar.</p><label>Data da avaliação</label><input id="ssiDate" type="date" value="${esc(scaleDraft?.date||today())}">${section('Peso e composição',['weight','bmi','bodyFat','fatMass','leanMass'])}${section('Músculos',['skeletalMusclePct','skeletalMuscleMass','musclePct','muscleMass'])}${section('Água e metabolismo',['waterPct','waterMass','bmr','proteinPct'])}${section('Outros índices da balança',['visceralFat','boneMass','obesityPct','metabolicAge','realAge','height'])}${section('Medidas corporais — se o arquivo tiver',['neck','shoulders','chest','waist','abd','hip','armR','armL','forearmR','forearmL','thighR','thighL','calfR','calfL'])}<div class="notice"><b>Importante:</b> bioimpedância doméstica gera estimativas. O Progressa guarda o valor reportado pelo aparelho para acompanhar tendência, sem tratá-lo como medição clínica exata.</div>${found===0?'<div class="notice">Não encontrei os rótulos automaticamente. Você ainda pode preencher os campos manualmente ou tentar uma imagem mais nítida.</div>':''}<button class="btn primary block" style="margin-top:16px" onclick="saveImportedMetric()">${typeof icon==='function'?icon('check'):''} Salvar avaliação</button><button class="btn secondary block" style="margin-top:8px" onclick="openMetricImport()">Escolher outro arquivo</button>`);
  }

  window.processMetricImport=async function(file){
    if(scaleBusy)return;scaleBusy=true;busyModal(file);
    try{const extracted=await extract(file);status('Organizando informações','Separando peso, gordura, músculos, água e demais índices.',94);const parsed=parse(extracted.text);scaleDraft={...parsed,fileName:file.name||'arquivo',fileType:file.type||'',method:extracted.method};status('Leitura concluída','Abrindo conferência.',100);setTimeout(review,120);}catch(error){console.error('Falha na leitura especializada',error);modal(`<span class="eyebrow">IMPORTAÇÃO</span><h2>Não consegui ler este arquivo</h2><p class="muted">${esc(error?.message||'O arquivo não pôde ser processado.')}</p><div class="notice">Tente um PDF original ou uma imagem mais nítida e reta.</div><button class="btn primary block" onclick="openMetricImport()">Tentar outro arquivo</button>`)}finally{scaleBusy=false;}
  };

  window.saveImportedMetric=function(){
    if(!scaleDraft)return;const record={date:document.getElementById('ssiDate')?.value||today(),measurementType:'smart-scale'},recognized={};let filled=0;
    for(const [key,id] of Object.entries(FIELDS)){const v=metricNum(document.getElementById(id)?.value);if(v!=null&&valid(key,v,'')){record[key]=v;recognized[key]=v;filled++;}}
    if(!filled)return toast('Confira e preencha pelo menos um dado antes de salvar.');
    record.importSource={fileName:scaleDraft.fileName||'',fileType:scaleDraft.fileType||'',method:scaleDraft.method||'',kind:'smart-scale',importedAt:new Date().toISOString()};
    state.metrics=Array.isArray(state.metrics)?state.metrics:[];const existingIndex=state.metrics.findIndex(m=>m.date===record.date);
    if(existingIndex>=0)state.metrics[existingIndex]={...state.metrics[existingIndex],...record};else state.metrics.push(record);
    state.metrics.sort((a,b)=>String(a.date).localeCompare(String(b.date)));saveLocal();scaleDraft=null;closeModal();renderApp();toast(existingIndex>=0?'Bioimpedância importada e registro da data atualizado.':'Bioimpedância importada e salva.');
  };
})();
