/* Progressa v6.4.6 — importação de medidas por PDF/imagem */
(function(){
  if(typeof BODY_METRICS==='undefined'||typeof bodyEvolutionCard!=='function'||typeof metricNum!=='function')return;

  const bodyEvolutionCardBeforeImport=bodyEvolutionCard;
  const reportBodyCardBeforeImport=typeof reportBodyCard==='function'?reportBodyCard:null;
  let importDraft=null;
  let importBusy=false;

  const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  const FIELD_IDS={
    weight:'impWeight',bodyFat:'impBodyFat',muscleMass:'impMuscleMass',neck:'impNeck',shoulders:'impShoulders',chest:'impChest',waist:'impWaist',abd:'impAbd',hip:'impHip',armR:'impArmR',armL:'impArmL',forearmR:'impForearmR',forearmL:'impForearmL',thighR:'impThighR',thighL:'impThighL',calfR:'impCalfR',calfL:'impCalfL'
  };

  const ALIASES={
    weight:['peso corporal','peso atual','peso','weight','body weight'],
    bodyFat:['percentual de gordura','porcentagem de gordura','gordura corporal','body fat percentage','body fat','% gordura'],
    muscleMass:['massa muscular esqueletica','massa muscular esquelética','massa muscular','skeletal muscle mass','muscle mass'],
    neck:['circunferencia do pescoco','circunferência do pescoço','pescoco','pescoço','neck'],
    shoulders:['circunferencia dos ombros','circunferência dos ombros','ombros','shoulders'],
    chest:['circunferencia do torax','circunferência do tórax','torax','tórax','busto','chest'],
    waist:['circunferencia da cintura','circunferência da cintura','cintura','waist'],
    abd:['circunferencia abdominal','circunferência abdominal','abdomen','abdômen','abdominal'],
    hip:['circunferencia do quadril','circunferência do quadril','quadril','hip'],
    armR:['braco direito','braço direito','braco dir','braço dir','right arm'],
    armL:['braco esquerdo','braço esquerdo','braco esq','braço esq','left arm'],
    forearmR:['antebraco direito','antebraço direito','antebraco dir','antebraço dir','right forearm'],
    forearmL:['antebraco esquerdo','antebraço esquerdo','antebraco esq','antebraço esq','left forearm'],
    thighR:['coxa direita','coxa dir','right thigh'],
    thighL:['coxa esquerda','coxa esq','left thigh'],
    calfR:['panturrilha direita','panturrilha dir','right calf'],
    calfL:['panturrilha esquerda','panturrilha esq','left calf']
  };

  const RANGES={
    weight:[25,400],bodyFat:[2,75],muscleMass:[5,180],neck:[15,80],shoulders:[40,220],chest:[40,220],waist:[35,220],abd:[35,250],hip:[45,250],armR:[15,90],armL:[15,90],forearmR:[10,70],forearmL:[10,70],thighR:[20,120],thighL:[20,120],calfR:[15,80],calfL:[15,80]
  };

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();

  function loadScript(src,test){
    if(test())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){existing.addEventListener('load',()=>test()?resolve():reject(new Error('Biblioteca indisponível')),{once:true});existing.addEventListener('error',()=>reject(new Error('Falha ao carregar biblioteca')),{once:true});return;}
      const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>test()?resolve():reject(new Error('Biblioteca indisponível'));s.onerror=()=>reject(new Error('Falha ao carregar biblioteca'));document.head.appendChild(s);
    });
  }

  function updateImportStatus(title,detail='',progress=null){
    const t=document.getElementById('metricImportStatusTitle'),d=document.getElementById('metricImportStatusDetail'),bar=document.getElementById('metricImportProgressBar');
    if(t)t.textContent=title;if(d)d.textContent=detail;
    if(bar&&progress!=null)bar.style.width=`${Math.max(2,Math.min(100,Math.round(progress)))}%`;
  }

  function busyModal(file){
    modal(`<span class="eyebrow">IMPORTANDO AVALIAÇÃO</span><h2 id="metricImportStatusTitle">Preparando arquivo</h2><p id="metricImportStatusDetail" class="muted small">${esc(file?.name||'Arquivo selecionado')}</p><div style="height:8px;background:var(--line);border-radius:999px;overflow:hidden;margin:16px 0"><div id="metricImportProgressBar" style="height:100%;width:4%;background:var(--primary,#ff1630);transition:width .2s ease"></div></div><div class="notice"><b>Confira antes de salvar.</b><br>A leitura automática pode errar números, principalmente em fotos desfocadas ou documentos com tabelas complexas.</div>`);
  }

  function firstNumber(value){
    const m=String(value||'').match(/-?\d{1,3}(?:[.,]\d{1,2})?/);if(!m)return null;
    const n=Number(m[0].replace(',','.'));return Number.isFinite(n)?n:null;
  }

  function validValue(key,value,line=''){
    if(value==null)return false;const [min,max]=RANGES[key]||[-Infinity,Infinity];if(value<min||value>max)return false;
    const n=norm(line);
    if(key==='weight'&&/(peso ideal|peso alvo|meta de peso|controle de peso|ideal weight|target weight)/.test(n))return false;
    if(key==='bodyFat'&&/\bkg\b/.test(n)&&!/%/.test(line))return false;
    if(key==='muscleMass'&&/%/.test(line)&&!/kg/.test(n))return false;
    return true;
  }

  function findValueInText(raw,key){
    const aliases=(ALIASES[key]||[]).map(norm);const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    for(const line of lines){
      const nl=norm(line);
      for(const alias of aliases){
        const pos=nl.indexOf(alias);if(pos<0)continue;
        const originalTail=line.slice(Math.max(0,pos));
        const after=originalTail.slice(Math.min(originalTail.length,alias.length));
        const v=firstNumber(after)||firstNumber(originalTail);
        if(validValue(key,v,line))return v;
      }
    }
    const normalized=norm(raw);
    for(const alias of aliases){
      let from=0;
      while(from<normalized.length){
        const pos=normalized.indexOf(alias,from);if(pos<0)break;
        const snippet=normalized.slice(pos,pos+Math.max(50,alias.length+35));const v=firstNumber(snippet.slice(alias.length));
        if(validValue(key,v,snippet))return v;from=pos+alias.length;
      }
    }
    return null;
  }

  function parseDate(raw){
    const text=String(raw||'');
    const iso=text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if(iso)return `${iso[1]}-${String(+iso[2]).padStart(2,'0')}-${String(+iso[3]).padStart(2,'0')}`;
    const br=text.match(/\b(0?[1-9]|[12]\d|3[01])[\/-](0?[1-9]|1[0-2])[\/-]((?:19|20)\d{2})\b/);
    if(br)return `${br[3]}-${String(+br[2]).padStart(2,'0')}-${String(+br[1]).padStart(2,'0')}`;
    return typeof today==='function'?today():new Date().toISOString().slice(0,10);
  }

  function parseMetrics(raw){
    const values={};for(const key of Object.keys(FIELD_IDS)){const v=findValueInText(raw,key);if(v!=null)values[key]=v;}
    return {date:parseDate(raw),values,rawText:String(raw||'')};
  }

  async function readPdf(file){
    await loadScript(PDFJS_URL,()=>!!window.pdfjsLib);window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const data=await file.arrayBuffer();const pdf=await window.pdfjsLib.getDocument({data}).promise;const maxPages=Math.min(pdf.numPages,8);let text='';
    for(let p=1;p<=maxPages;p++){
      updateImportStatus('Lendo PDF',`Página ${p} de ${maxPages}`,5+(p/maxPages)*45);
      const page=await pdf.getPage(p);const content=await page.getTextContent();const pageText=(content.items||[]).map(x=>x.str||'').join(' ');text+=`\n${pageText}\n${(content.items||[]).map(x=>x.str||'').join('\n')}`;
    }
    if(norm(text).replace(/\s/g,'').length>80)return {text,method:'pdf-text'};
    updateImportStatus('PDF escaneado','Vou reconhecer o texto das páginas por imagem.',52);
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);let ocr='';
    for(let p=1;p<=Math.min(maxPages,5);p++){
      const page=await pdf.getPage(p),viewport=page.getViewport({scale:1.65}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:ctx,viewport}).promise;
      const result=await window.Tesseract.recognize(canvas,'por',{logger:m=>{if(m.status==='recognizing text'){const base=55+((p-1)/Math.min(maxPages,5))*40,part=(m.progress||0)*(40/Math.min(maxPages,5));updateImportStatus('Reconhecendo PDF',`Página ${p} de ${Math.min(maxPages,5)} · ${Math.round((m.progress||0)*100)}%`,base+part)}}});ocr+=`\n${result?.data?.text||''}`;
    }
    return {text:ocr,method:'ocr-pdf'};
  }

  async function readImage(file){
    await loadScript(TESSERACT_URL,()=>!!window.Tesseract);
    const result=await window.Tesseract.recognize(file,'por',{logger:m=>{if(m.status==='recognizing text')updateImportStatus('Reconhecendo imagem',`${Math.round((m.progress||0)*100)}% concluído`,15+(m.progress||0)*75);else if(m.status)updateImportStatus('Preparando leitura',m.status,12)}});
    return {text:result?.data?.text||'',method:'ocr-image'};
  }

  async function extractFile(file){
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');if(isPdf)return readPdf(file);
    if((file.type||'').startsWith('image/')||/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name||''))return readImage(file);
    throw new Error('Formato não suportado. Use PDF, JPG, PNG ou WEBP.');
  }

  function fieldHtml(key){
    const cfg=BODY_METRICS[key],id=FIELD_IDS[key],value=importDraft?.values?.[key];return `<div><label>${esc(cfg.label)} (${esc(cfg.unit)})</label><input id="${id}" type="number" step="0.1" value="${value==null?'':esc(value)}"></div>`;
  }

  function reviewModal(){
    const found=Object.keys(importDraft?.values||{}).length,method=importDraft?.method==='pdf-text'?'texto do PDF':importDraft?.method==='ocr-pdf'?'OCR do PDF':'OCR da imagem';
    modal(`<span class="eyebrow">CONFERIR IMPORTAÇÃO</span><h2>${found?`${found} campo${found===1?'':'s'} reconhecido${found===1?'':'s'}`:'Nenhum campo reconhecido automaticamente'}</h2><p class="muted small">Arquivo: <b>${esc(importDraft?.fileName||'')}</b> · leitura por ${method}. Confira cada valor antes de salvar.</p><label>Data da avaliação</label><input id="impDate" type="date" value="${esc(importDraft?.date||today())}"><div class="metric-section"><h4>Peso e composição</h4><div class="grid grid2">${fieldHtml('weight')}${fieldHtml('bodyFat')}${fieldHtml('muscleMass')}</div></div><div class="metric-section"><h4>Tronco</h4><div class="grid grid2">${fieldHtml('neck')}${fieldHtml('shoulders')}${fieldHtml('chest')}${fieldHtml('waist')}${fieldHtml('abd')}${fieldHtml('hip')}</div></div><div class="metric-section"><h4>Braços</h4><div class="grid grid2">${fieldHtml('armR')}${fieldHtml('armL')}${fieldHtml('forearmR')}${fieldHtml('forearmL')}</div></div><div class="metric-section"><h4>Pernas</h4><div class="grid grid2">${fieldHtml('thighR')}${fieldHtml('thighL')}${fieldHtml('calfR')}${fieldHtml('calfL')}</div></div>${found===0?'<div class="notice">Não encontrei rótulos conhecidos no arquivo. Você pode preencher os campos manualmente nesta tela ou tentar uma imagem mais nítida.</div>':''}<button class="btn primary block" style="margin-top:16px" onclick="saveImportedMetric()">${typeof icon==='function'?icon('check'):''} Salvar avaliação</button><button class="btn secondary block" style="margin-top:8px" onclick="openMetricImport()">Escolher outro arquivo</button>`);
  }

  window.openMetricImport=function(){
    if(importBusy)return;
    const input=document.createElement('input');input.type='file';input.accept='application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif';input.style.display='none';document.body.appendChild(input);
    input.onchange=async()=>{const file=input.files?.[0];input.remove();if(!file)return;await window.processMetricImport(file)};input.click();
  };

  window.processMetricImport=async function(file){
    if(importBusy)return;importBusy=true;busyModal(file);
    try{
      const extracted=await extractFile(file);updateImportStatus('Organizando informações','Separando peso, medidas e composição corporal.',94);
      const parsed=parseMetrics(extracted.text);importDraft={...parsed,fileName:file.name||'arquivo',fileType:file.type||'',method:extracted.method};updateImportStatus('Leitura concluída','Abrindo conferência.',100);setTimeout(reviewModal,150);
    }catch(error){console.error('Falha na importação de medidas',error);modal(`<span class="eyebrow">IMPORTAÇÃO</span><h2>Não consegui ler este arquivo</h2><p class="muted">${esc(error?.message||'O arquivo não pôde ser processado.')}</p><div class="notice">Tente um PDF original ou uma foto nítida, reta e com boa iluminação.</div><button class="btn primary block" onclick="openMetricImport()">Tentar outro arquivo</button>`)}finally{importBusy=false;}
  };

  window.saveImportedMetric=function(){
    if(!importDraft)return;const record={date:document.getElementById('impDate')?.value||today()},values={};let filled=0;
    for(const [key,id] of Object.entries(FIELD_IDS)){const v=metricNum(document.getElementById(id)?.value);if(v!=null&&validValue(key,v,'')){record[key]=v;values[key]=v;filled++;}}
    if(!filled)return toast('Confira e preencha pelo menos uma medida antes de salvar.');
    record.importSource={fileName:importDraft.fileName||'',fileType:importDraft.fileType||'',method:importDraft.method||'',importedAt:new Date().toISOString()};
    state.metrics=Array.isArray(state.metrics)?state.metrics:[];const existingIndex=state.metrics.findIndex(m=>m.date===record.date);
    if(existingIndex>=0)state.metrics[existingIndex]={...state.metrics[existingIndex],...record};else state.metrics.push(record);
    state.metrics.sort((a,b)=>String(a.date).localeCompare(String(b.date)));saveLocal();importDraft=null;closeModal();renderApp();toast(existingIndex>=0?'Avaliação importada e registro da data atualizado.':'Avaliação importada e salva.');
  };

  function addImportButton(html){
    try{
      const host=document.createElement('div');host.innerHTML=html;const head=host.querySelector('.body-evolution-head');if(!head)return html;
      if(head.querySelector('[data-metric-import]'))return html;const button=document.createElement('button');button.className='btn secondary sm';button.setAttribute('data-metric-import','1');button.setAttribute('onclick','openMetricImport()');button.innerHTML=`${typeof icon==='function'?icon('plus'):''} Importar PDF/Imagem`;const register=head.querySelector('button[onclick*="metricModal"]');if(register)register.insertAdjacentElement('beforebegin',button);else head.appendChild(button);return host.innerHTML;
    }catch(error){console.warn('Falha ao inserir importador corporal',error);return html;}
  }

  bodyEvolutionCard=function(){return addImportButton(bodyEvolutionCardBeforeImport())};

  if(reportBodyCardBeforeImport){
    reportBodyCard=function(metrics){
      const html=reportBodyCardBeforeImport(metrics);try{const host=document.createElement('div');host.innerHTML=html;const row=host.querySelector('.report-body-card .row.between');if(row&&!row.querySelector('[data-metric-import]')){const button=document.createElement('button');button.className='btn ghost sm';button.setAttribute('data-metric-import','1');button.setAttribute('onclick','openMetricImport()');button.textContent='Importar PDF/Imagem';const reg=row.querySelector('button[onclick*="metricModal"]');if(reg)reg.insertAdjacentElement('beforebegin',button);else row.appendChild(button);}return host.innerHTML}catch{return html}
    };
  }
})();
