/* Progressa v6.4.30 — calendário visual e ordem dos relatórios */
(function(){
  if(typeof reportsScreen!=='function'||typeof workoutCalendarHtml!=='function')return;

  const reportsBeforeLayout=reportsScreen;

  function directChildByClass(host,cls){
    return [...host.children].find(el=>el.classList?.contains(cls))||null;
  }

  function cardByHeading(host,title){
    return [...host.children].find(el=>
      el.classList?.contains('card') &&
      [...el.querySelectorAll('h3')].some(h=>h.textContent.trim()===title)
    )||null;
  }

  reportsScreen=function(){
    const html=reportsBeforeLayout();
    try{
      const host=document.createElement('div');
      host.innerHTML=html;

      const children=[...host.children];
      const hero=children.find(el=>el.tagName==='SECTION'&&el.classList?.contains('hero'))||null;
      const exportCard=directChildByClass(host,'report-export-card');
      const metrics=children.find(el=>el.classList?.contains('premium-metrics'))||null;
      const frequency=children.find(el=>el.classList?.contains('premium-insight'))||null;
      const bodyCard=children.find(el=>el.classList?.contains('body-evolution-card'))||children.find(el=>el.classList?.contains('report-body-card'))||null;
      const drawers=directChildByClass(host,'report-drawer-stack');

      const recoveryTabs=directChildByClass(host,'recovery-tabs');
      const recoveryCard=children.find(el=>el.classList?.contains('muscle-map-card'))||cardByHeading(host,'Fadiga muscular');

      if(drawers){
        [...drawers.querySelectorAll('details.report-drawer')].forEach(d=>{
          const title=d.getAttribute('data-report-title')||d.querySelector('h3')?.textContent.trim();
          if(title==='Calendário geral')d.remove();
        });
      }

      const visualCalendar=document.createElement('div');
      visualCalendar.className='card report-calendar-visual';
      visualCalendar.setAttribute('data-report-visual-calendar','1');
      visualCalendar.innerHTML='<div class="v6-section-title"><div><h3>Calendário geral</h3><span>Veja rapidamente os dias em que treinou</span></div></div><p class="muted small">Os dias destacados possuem treinos salvos. Toque em um dia marcado para abrir a sessão.</p>'+workoutCalendarHtml();

      const known=new Set([hero,exportCard,metrics,frequency,bodyCard,drawers,recoveryTabs,recoveryCard].filter(Boolean));
      const extras=children.filter(el=>!known.has(el) && !el.hasAttribute('data-report-visual-calendar'));

      const ordered=[
        hero,
        exportCard,
        recoveryTabs,
        recoveryCard,
        visualCalendar,
        metrics,
        frequency,
        bodyCard,
        ...extras,
        drawers
      ].filter(Boolean);

      host.replaceChildren(...ordered);
      return host.innerHTML;
    }catch(error){
      console.warn('Falha ao reorganizar relatórios',error);
      return html;
    }
  };
})();