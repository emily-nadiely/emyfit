/* Progressa v6.4.28 — pesquisa em todos os painéis recolhíveis do relatório */
(function(){
  if(typeof reportDrawer!=='function')return;
  let drawerSeq=0;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

  window.filterReportDrawer=function(value,id){
    const host=document.getElementById(id);if(!host)return;
    const q=norm(value);
    const items=[...host.querySelectorAll('.report-list-row,.cardio-summary-row,.report-load-item,.report-history-row')];
    let visible=0;
    items.forEach(item=>{const show=!q||norm(item.textContent).includes(q);item.hidden=!show;if(show)visible++;});
    const empty=host.querySelector('.report-search-empty');
    if(empty)empty.hidden=items.length===0||visible!==0;
  };

  window.jumpReportCalendar=function(value){
    if(!value)return;
    const p=String(value).split('-').map(Number);if(p.length!==3||!p[0]||!p[1])return;
    const now=new Date(),target=new Date(p[0],p[1]-1,1);
    calendarMonthOffset=(target.getFullYear()-now.getFullYear())*12+(target.getMonth()-now.getMonth());
    renderApp();
    setTimeout(()=>{const d=document.querySelector('.report-drawer[data-report-title="Calendário geral"]');if(d)d.open=true;},0);
  };

  reportProgressionForSessions=function(sessions){
    const rows=reportExerciseProgress(sessions).slice(0,40);
    if(!rows.length)return '<p class="muted">Registre cargas neste período para acompanhar a progressão.</p>';
    return '<div class="report-progression-list">'+rows.map(x=>{
      const pct=x.firstKg>0?((x.lastKg-x.firstKg)/x.firstKg*100):null,name=EX[x.id]?.name||x.id;
      return '<div class="v6-insight report-load-item"><b>'+reportEscape(name)+'</b><small>'+x.count+' sessão'+(x.count===1?'':'ões')+' · primeira '+(x.firstKg||'—')+' kg · última '+(x.lastKg||'—')+' kg · recorde '+(x.bestKg||'—')+' kg</small><small>'+(pct==null?'Sem base suficiente para comparar.':(pct>=0?'+':'')+pct.toFixed(1).replace('.',',')+'% de variação entre a primeira e a última carga máxima do período.')+'</small></div>';
    }).join('')+'</div>';
  };

  reportDrawer=function(title,subtitle,content,open=false){
    const id='reportDrawerBody'+(++drawerSeq),calendar=title==='Calendário geral';
    const search=calendar
      ? '<div class="report-universal-search"><label>Buscar data</label><input type="date" onchange="jumpReportCalendar(this.value)"><small class="muted">Escolha uma data para abrir diretamente o mês correspondente.</small></div>'
      : '<div class="report-universal-search"><label>Pesquisar nesta seção</label><input type="search" placeholder="Digite para localizar..." oninput="filterReportDrawer(this.value,\''+id+'\')"><small class="muted">A lista é filtrada enquanto você digita.</small></div>';
    return '<details class="card report-drawer" data-report-title="'+reportEscape(title)+'" '+(open?'open':'')+'><summary><div><h3>'+title+'</h3>'+(subtitle?'<span class="muted small">'+subtitle+'</span>':'')+'</div><span class="report-drawer-chevron" aria-hidden="true">⌄</span></summary><div class="report-drawer-body" id="'+id+'">'+search+content+'<p class="muted report-search-empty" hidden>Nenhum resultado encontrado.</p></div></details>';
  };
})();