/* Progressa v6.4.8 — OCR robusto para prints longos de balança/bioimpedância */
(function(){
  if(typeof window.processMetricImport!=='function'||typeof BODY_METRICS==='undefined'||typeof metricNum!=='function')return;

  const previousProcessMetricImport=window.processMetricImport;
  const previousSaveImportedMetric=window.saveImportedMetric;
  const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  let draftV648=null;
  let busyV648=false;

  const FIELDS={
    weight:'ssi648Weight',bmi:'ssi648Bmi',bodyFat:'ssi648BodyFat',fatMass:'ssi648FatMass',leanMass:'ssi648LeanMass',
    skeletalMusclePct:'ssi648SkeletalMusclePct',skeletalMuscleMass:'ssi648SkeletalMuscleMass',musclePct:'ssi648MusclePct',muscleMass:'ssi648MuscleMass',
    waterPct:'ssi648WaterPct',waterMass:'ssi648WaterMass',bmr:'ssi648Bmr',proteinPct:'ssi648ProteinPct',visceralFat:'ssi648VisceralFat',boneMass:'ssi648BoneMass',
    obesityPct:'ssi648ObesityPct',metabolicAge:'ssi648MetabolicAge',realAge:'ssi648RealAge',height:'ssi648Height',
    neck:'ssi648Neck',shoulders:'ssi648Shoulders',chest:'ssi648Chest',waist:'ssi648Waist',abd:'ssi648Abd',hip:'ssi648Hip',armR:'ssi648ArmR',armL:'ssi648ArmL',forearmR:'ssi648ForearmR',forearmL:'ssi648ForearmL',thighR:'ssi648ThighR',thighL:'ssi648ThighL',calfR:'ssi648CalfR',calfL:'ssi648CalfL'
  };

  const ALIASES={
    weight:['peso(kg)','peso (kg)','peso kg','peso corporal'],
    bmi:['imc','bmi'],
    bodyFat:['gordura(%)','gordura (%)','gordura %','gordura corporal (%)','gordura corporal %','percentual de gordura','porcentagem de gordura'],
    fatMass:['peso da gordura(kg)','peso da gordura (kg)','peso da gordura kg','massa de gordura(kg)','massa de gordura (kg)','massa de gordura'],
    leanMass:['lbm(kg)','lbm (kg)','lbm kg','massa magra (lbm)','massa magra','lean body mass'],
    skeletalMusclePct:['percentual da massa muscular esquelética(%)','percentual da massa muscular esqueletica(%)','percentual da massa muscular esquelética','massa muscular esquelética(%)','massa muscular esqueletica(%)'],
    skeletalMuscleMass:['peso da massa muscular esquelética(kg)','peso da massa muscular esqueletica(kg)','peso da massa muscular esquelética','peso da massa muscular esqueletica','massa muscular esquelética (kg)','massa muscular esqueletica (kg)'],
    musclePct:['registro de massa muscular(%)','registro de massa muscular (%)','massa muscular total (%)','massa muscular total(%)','massa muscular(%)'],
    muscleMass:['peso da massa muscular(kg)','peso da massa muscular (kg)','peso da massa muscular kg','massa muscular total (kg)','massa muscular total(kg)'],
    waterPct:['água(%)','agua(%)','água (%)','agua (%)','água corporal (%)','agua corporal (%)'],
    waterMass:['peso da água(kg)','peso da agua(kg)','peso da água (kg)','peso da agua (kg)','água corporal (kg)','agua corporal (kg)'],
    bmr:['metabolismo basal','metabolismo','bmr'],
    proteinPct:['proteína(%)','proteina(%)','proteína (%)','proteina (%)','proteína corporal (%)','proteina corporal (%)'],
    visceralFat:['gordura visceral'],boneMass:['ossos(kg)','ossos (kg)','massa óssea (kg)','massa ossea (kg)','massa óssea','massa ossea'],
    obesityPct:['obesidade(%)','obesidade (%)','índice de obesidade (balança)','indice de obesidade (balanca)','índice de obesidade','indice de obesidade'],
    metabolicAge:['idade metabólica','idade metabolica'],realAge:['idade real','idade informada'],height:['altura(cm)','altura (cm)','altura cm'],
    neck:['pescoço','pescoco'],shoulders:['ombros'],chest:['tórax / busto','torax / busto','tórax','torax','busto'],waist:['cintura'],abd:['abdômen','abdomen'],hip:['quadril'],
    armR:['braço direito','braco direito'],armL:['braço esquerdo','braco esquerdo'],forearmR:['antebraço direito','antebraco direito'],forearmL:['antebraço esquerdo','antebraco esquerdo'],thighR:['coxa direita'],thighL:['coxa esquerda'],calfR:['panturrilha direita'],calfL:['panturrilha esquerda']
  };

  const RANGES={
    weight:[25,400],bmi:[10,80],bodyFat:[1,75],fatMass:[1,250],leanMass:[5,250],skeletalMusclePct:[5,70],skeletalMuscleMass:[3,120],musclePct:[10,90],muscleMass:[3,220],waterPct:[20,80],waterMass:[5,250],bmr:[500,5000],proteinPct:[2,35],visceralFat:[1,60],boneMass:[1,15],obesityPct:[-60,250],metabolicAge:[10,120],realAge:[10,120],height:[100,230],
    neck:[15,80],shoulders:[40,220],chest:[40,220],waist:[35,220],abd:[35,250],hip:[45,250],armR:[15,90],armL:[15,90],forearmR:[10,70],forearmL:[10,70],thighR:[20,120],thighL:[20,120],calfR:[15,80],calfL:[15,80]
  };

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[|]/g,' ').replace(/\s+/g,' ').trim();
  const round=(n,d=1)=>Number((+n).toFixed(d));

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve();
    return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src===TESSERACT_URL);if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=TESSERACT_URL;s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  }

  function status(title,detail='',progress=null){
    const t=document.getElementById('metricImportStatusTitle'),d=document.getElementById('metricImportStatusDetail'),bar=document.getElementById('metricImportProgressBar');
    if(t)t.textContent=title;if(d)d.textContent=detail;if(bar&&progress!=null)bar.style.width=`${Math.max(2,Math.min(100,Math.round(progress)))}%`;
  }

  function busyModal(file){
    modal(`<span class="eyebrow">LENDO BIOIMPEDÂNCIA</span><h2 id="metricImportStatusTitle">Preparando imagem</h2><p id="metricImportStatusDetail" class="muted small">${esc(file?.name||'Imagem selecionada')}</p><div style="height:8px;background:var(--line);border-radius:999px;overflow:hidden;margin:16px 0"><div id="metricImportProgressBar" style="height:100%;width:4%;background:var(--primary,#ff1630);transition:width .2s ease"></div></div><div class="notice"><b>Leitura reforçada para prints longos.</b><br>O Progressa amplia a imagem em partes e confere relações entre peso, IMC, gordura, água e massa muscular antes de preencher.</div>`);
  }

  function firstNumber(text){const m=String(text||'').match(/-?\d{1,4}(?:[.,]\d{1,3})?/);if(!m)return null;const n=Number(m[0].replace(',','.'));return Number.isFinite(n)?n:null}
  function valid(key,v,line=''){if(v==null)return false;const r=RANGES[key]||[-Infinity,Infinity];if(v<r[0]||v>r[1])return false;const n=norm(line);if(key==='weight'&&/(peso da gordura|peso da massa|peso da agua|peso ideal|controle de peso)/.test(n))return false;if(key==='bodyFat'&&/(peso da gordura|gordura visceral)/.test(n))return false;if(key==='muscleMass'&&/(esquelet|registro de massa muscular|percentual)/.test(n))return false;if(key==='waterPct'&&/peso da agua/.test(n))return false;return true}

  function findValue(raw,key){
    const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const aliases=(ALIASES[key]||[]).slice().sort((a,b)=>b.length-a.length);
    for(const aliasRaw of aliases){const alias=norm(aliasRaw);for(let i=0;i<lines.length;i++){if(!norm(lines[i]).includes(alias))continue;const candidates=[lines[i]];for(let j=1;j<=3&&lines[i+j];j++)candidates.push(lines[i+j]);for(const c of candidates){const v=firstNumber(c);if(valid(key,v,`${lines[i]} ${c}`))return v;}}}
    const compact=norm(raw);for(const aliasRaw of aliases){const alias=norm(aliasRaw),pos=compact.indexOf(alias);if(pos<0)continue;const snippet=compact.slice(pos,pos+alias.length+65),v=firstNumber(snippet.slice(alias.length));if(valid(key,v,snippet))return v;}
    return null;
  }

  function parseDate(raw){const text=String(raw||'');let m=text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;m=text.match(/\b(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-]((?:19|20)\d{2})\b/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return typeof today==='function'?today():new Date().toISOString().slice(0,10)}

  function bestCluster(values,tolerance=.055){
    const vals=values.filter(v=>Number.isFinite(v)&&v>=25&&v<=300);let best=[];
    for(const pivot of vals){const group=vals.filter(v=>Math.abs(v-pivot)<=Math.max(1.5,pivot*tolerance));if(group.length>best.length)best=group;}
    if(best.length<2)return null;best.sort((a,b)=>a-b);return best.length%2?best[(best.length-1)/2]:(best[best.length/2-1]+best[best.length/2])/2;
  }

  function reconcile(values){
    const notes=[],suspect=new Set();
    const weightCandidates=[];
    if(values.height&&values.bmi)weightCandidates.push(values.bmi*Math.pow(values.height/100,2));
    if(values.fatMass&&values.bodyFat)weightCandidates.push(values.fatMass/(values.bodyFat/100));
    if(values.muscleMass&&values.musclePct)weightCandidates.push(values.muscleMass/(values.musclePct/100));
    if(values.waterMass&&values.waterPct)weightCandidates.push(values.waterMass/(values.waterPct/100));
    if(values.skeletalMuscleMass&&values.skeletalMusclePct)weightCandidates.push(values.skeletalMuscleMass/(values.skeletalMusclePct/100));
    if(values.fatMass&&values.leanMass)weightCandidates.push(values.fatMass+values.leanMass);
    const consensus=bestCluster(weightCandidates);
    if(consensus&&(!values.weight||Math.abs(values.weight-consensus)>Math.max(2,consensus*.05))){values.weight=round(consensus,2);notes.push('Peso conferido pela consistência dos demais índices.');}

    if(values.weight&&values.height){const bmi=values.weight/Math.pow(values.height/100,2);if(!values.bmi||Math.abs(values.bmi-bmi)>.8){values.bmi=round(bmi,1);notes.push('IMC recalculado a partir de peso e altura.');}}

    if(values.weight){
      const w=values.weight;
      const fatCandidates=[];if(values.fatMass)fatCandidates.push(values.fatMass);if(values.bodyFat)fatCandidates.push(w*values.bodyFat/100);if(values.leanMass)fatCandidates.push(w-values.leanMass);
      const fatConsensus=bestCluster(fatCandidates,.03);
      if(fatConsensus&&fatConsensus>0&&fatConsensus<w){values.fatMass=round(fatConsensus,1);values.bodyFat=round(fatConsensus/w*100,1);values.leanMass=round(w-fatConsensus,2);}
      else if(values.fatMass&&values.bodyFat&&Math.abs(values.fatMass-w*values.bodyFat/100)>Math.max(1.2,w*.025)){suspect.add('bodyFat');suspect.add('fatMass');notes.push('Gordura em % e kg não ficaram coerentes; revise esses campos.');}
      else if(values.fatMass&&!values.bodyFat){values.bodyFat=round(values.fatMass/w*100,1)}else if(values.bodyFat&&!values.fatMass){values.fatMass=round(w*values.bodyFat/100,1)}
      if(values.fatMass&&!values.leanMass)values.leanMass=round(w-values.fatMass,2);

      const pairs=[['muscleMass','musclePct',1],['waterMass','waterPct',1],['skeletalMuscleMass','skeletalMusclePct',1]];
      for(const [massKey,pctKey] of pairs){const mass=values[massKey],pct=values[pctKey];if(mass&&!pct)values[pctKey]=round(mass/w*100,1);else if(pct&&!mass)values[massKey]=round(w*pct/100,1);else if(mass&&pct&&Math.abs(mass-w*pct/100)>Math.max(1,w*.02)){suspect.add(massKey);suspect.add(pctKey);notes.push(`${BODY_METRICS[massKey]?.label||massKey} em kg e % precisam de conferência.`);}}
    }
    return {values,notes:[...new Set(notes)],suspect};
  }

  async function imageBitmap(file){if('createImageBitmap'in window)return createImageBitmap(file);return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url})}

  async function readImageEnhanced(file){
    await loadTesseract();const img=await imageBitmap(file),w=img.width||img.naturalWidth,h=img.height||img.naturalHeight;if(!w||!h)throw new Error('Não consegui abrir a imagem.');
    const tileH=h>w*1.8?Math.min(h,Math.max(650,Math.round(w*1.45))):h,overlap=h>tileH?Math.min(90,Math.round(tileH*.1)):0,step=Math.max(1,tileH-overlap),starts=[];for(let y=0;y<h;y+=step){starts.push(y);if(y+tileH>=h)break;}
    const scale=Math.min(3,Math.max(1.65,1300/w));let text='';
    for(let i=0;i<starts.length;i++){
      const y=starts[i],sh=Math.min(tileH,h-y),canvas=document.createElement('canvas'),cw=Math.round(w*scale),ch=Math.round(sh*scale);canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='grayscale(1) contrast(1.28)';ctx.drawImage(img,0,y,w,sh,0,0,cw,ch);
      const base=8+(i/starts.length)*82;const part=82/starts.length;const result=await window.Tesseract.recognize(canvas,'por',{logger:m=>{if(m.status==='recognizing text')status('Reconhecendo imagem',`Parte ${i+1} de ${starts.length} · ${Math.round((m.progress||0)*100)}%`,base+(m.progress||0)*part);else if(m.status)status('Preparando leitura',`Parte ${i+1} de ${starts.length}`,base)}},{preserve_interword_spaces:'1'});text+=`\n${result?.data?.text||''}`;
    }
    try{if(img.close)img.close()}catch{}
    return text;
  }

  function parse(raw){const values={};for(const key of Object.keys(FIELDS)){const v=findValue(raw,key);if(v!=null)values[key]=v;}const checked=reconcile(values);return {date:parseDate(raw),values:checked.values,notes:checked.notes,suspect:checked.suspect,rawText:String(raw||'')}}

  function field(key){const cfg=BODY_METRICS[key]||{label:key,unit:'',decimals:1},value=draftV648?.values?.[key],step=(cfg.decimals||0)>=2?'0.01':(cfg.decimals||0)===0?'1':'0.1',warn=draftV648?.suspect?.has(key);return `<div><label>${esc(cfg.label)}${cfg.unit?` (${esc(cfg.unit)})`:''}${warn?' · REVISAR':''}</label><input id="${FIELDS[key]}" type="number" step="${step}" value="${value==null?'':esc(value)}" ${warn?'style="border-color:#ffb020"':''}></div>`}
  function section(title,keys){return `<div class="metric-section"><h4>${title}</h4><div class="grid grid2">${keys.map(field).join('')}</div></div>`}
  function review(){const found=Object.keys(draftV648?.values||{}).length,notes=draftV648?.notes||[];modal(`<span class="eyebrow">CONFERIR BIOIMPEDÂNCIA</span><h2>${found} dado${found===1?'':'s'} reconhecido${found===1?'':'s'}</h2><p class="muted small">Arquivo: <b>${esc(draftV648?.fileName||'')}</b> · OCR reforçado. Confira antes de salvar.</p>${notes.length?`<div class="notice"><b>Conferência automática:</b><br>${notes.map(esc).join('<br>')}</div>`:''}<label>Data da avaliação</label><input id="ssi648Date" type="date" value="${esc(draftV648?.date||today())}">${section('Peso e composição',['weight','bmi','bodyFat','fatMass','leanMass'])}${section('Músculos',['skeletalMusclePct','skeletalMuscleMass','musclePct','muscleMass'])}${section('Água e metabolismo',['waterPct','waterMass','bmr','proteinPct'])}${section('Outros índices da balança',['visceralFat','boneMass','obesityPct','metabolicAge','realAge','height'])}${section('Medidas corporais — se o arquivo tiver',['neck','shoulders','chest','waist','abd','hip','armR','armL','forearmR','forearmL','thighR','thighL','calfR','calfL'])}<div class="notice"><b>Importante:</b> qualquer campo marcado como REVISAR deve ser conferido no print antes de salvar.</div><button class="btn primary block" style="margin-top:16px" onclick="saveImportedMetric()">${typeof icon==='function'?icon('check'):''} Salvar avaliação</button><button class="btn secondary block" style="margin-top:8px" onclick="openMetricImport()">Escolher outro arquivo</button>`)}

  window.processMetricImport=async function(file){
    const isPdf=file?.type==='application/pdf'||/\.pdf$/i.test(file?.name||'');if(isPdf){draftV648=null;return previousProcessMetricImport(file)}
    if(!((file?.type||'').startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(file?.name||'')))return previousProcessMetricImport(file);
    if(busyV648)return;busyV648=true;busyModal(file);
    try{const text=await readImageEnhanced(file);status('Validando os números','Conferindo relações entre os índices da balança.',93);const parsed=parse(text);draftV648={...parsed,fileName:file.name||'imagem',fileType:file.type||'',method:'ocr-image-v648'};status('Leitura concluída','Abrindo conferência.',100);setTimeout(review,120)}catch(error){console.error('Falha no OCR reforçado',error);draftV648=null;return previousProcessMetricImport(file)}finally{busyV648=false}
  };

  window.saveImportedMetric=function(){
    if(!draftV648)return typeof previousSaveImportedMetric==='function'?previousSaveImportedMetric():undefined;
    const record={date:document.getElementById('ssi648Date')?.value||today(),measurementType:'smart-scale'},filled={};let count=0;
    for(const [key,id] of Object.entries(FIELDS)){const v=metricNum(document.getElementById(id)?.value);if(v!=null&&valid(key,v,'')){record[key]=v;filled[key]=v;count++;}}
    if(!count)return toast('Confira e preencha pelo menos um dado antes de salvar.');
    record.importSource={fileName:draftV648.fileName||'',fileType:draftV648.fileType||'',method:'ocr-image-v648',kind:'smart-scale',importedAt:new Date().toISOString()};
    state.metrics=Array.isArray(state.metrics)?state.metrics:[];const existingIndex=state.metrics.findIndex(m=>m.date===record.date);if(existingIndex>=0)state.metrics[existingIndex]={...state.metrics[existingIndex],...record};else state.metrics.push(record);state.metrics.sort((a,b)=>String(a.date).localeCompare(String(b.date)));saveLocal();draftV648=null;closeModal();renderApp();toast(existingIndex>=0?'Bioimpedância importada e registro da data atualizado.':'Bioimpedância importada e salva.');
  };
})();
