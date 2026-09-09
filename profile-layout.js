/* Progressa v6.4.10 — organização do Perfil e restauração do plano */
(function(){
  if(typeof profileScreen!=='function'||typeof workoutScreen!=='function')return;

  const profileScreenBeforeLayout=profileScreen;
  const workoutScreenBeforeLayout=workoutScreen;

  function directCardByTitle(host,title){
    return [...host.children].find(el=>
      el.classList?.contains('card') &&
      [...el.querySelectorAll('h3')].some(h=>h.textContent.trim()===title)
    );
  }

  function addPlanRestoreToProfile(planCard){
    if(!planCard)return;
    const heading=[...planCard.querySelectorAll('h3')].find(h=>h.textContent.trim()==='Plano');
    if(heading)heading.textContent='Plano e ciclo';

    if(planCard.querySelector('[data-profile-plan-restore]'))return;
    if(typeof window.hasPreviousPlanToRestore!=='function'||!window.hasPreviousPlanToRestore())return;

    const restore=document.createElement('div');
    restore.className='notice';
    restore.setAttribute('data-profile-plan-restore','1');
    restore.style.marginBottom='12px';
    restore.innerHTML='<b>Plano anterior disponível</b><p class="muted small" style="margin:6px 0 10px">Você pode voltar ao plano anterior sem apagar treinos concluídos, cargas, cardio ou relatórios.</p><button class="btn secondary block" onclick="restorePreviousPlanModal()">Restaurar plano anterior</button>';

    const firstAction=planCard.querySelector('button');
    if(firstAction)firstAction.insertAdjacentElement('beforebegin',restore);
    else planCard.appendChild(restore);
  }

  profileScreen=function(){
    const html=profileScreenBeforeLayout();
    try{
      const host=document.createElement('div');
      host.innerHTML=html;
      const children=[...host.children];
      const hero=children.find(el=>el.tagName==='SECTION'&&el.classList?.contains('hero'));
      const personal=directCardByTitle(host,'Dados pessoais');
      const assessment=directCardByTitle(host,'Avaliação e preferências');
      const focus=directCardByTitle(host,'Foco do plano');
      const plan=directCardByTitle(host,'Plano');
      const account=directCardByTitle(host,'Conta e sincronização');
      const danger=directCardByTitle(host,'Excluir conta');
      const science=directCardByTitle(host,'Base científica');

      addPlanRestoreToProfile(plan);

      const known=new Set([hero,personal,assessment,focus,plan,account,danger,science].filter(Boolean));
      const extras=children.filter(el=>!known.has(el));
      const ordered=[hero,personal,assessment,focus,plan,...extras,account,danger,science].filter(Boolean);
      host.replaceChildren(...ordered);
      return host.innerHTML;
    }catch(error){
      console.warn('Falha ao organizar Perfil',error);
      return html;
    }
  };

  workoutScreen=function(){
    const html=workoutScreenBeforeLayout();
    if(state?.active)return html;
    try{
      const host=document.createElement('div');
      host.innerHTML=html;
      [...host.children].forEach(el=>{
        if(!el.classList?.contains('card'))return;
        const eyebrow=el.querySelector('.eyebrow')?.textContent.trim();
        const title=el.querySelector('h3')?.textContent.trim();
        if(eyebrow==='PLANO ANTERIOR'||title==='Quer voltar ao treino de antes da atualização?')el.remove();
      });
      return host.innerHTML;
    }catch(error){
      console.warn('Falha ao ocultar restauração em Treino',error);
      return html;
    }
  };
})();
