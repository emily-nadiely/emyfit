/* Progressa v6.4.31 — correção robusta das abas de fadiga muscular */
(function(){
  function activate(tab){
    if(typeof setMuscleRecoveryTab!=='function')return;
    setMuscleRecoveryTab(tab==='history'?'history':'current');
  }

  document.addEventListener('click',function(event){
    const btn=event.target?.closest?.('.recovery-tabs button');
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    const tab=btn.dataset.recoveryTab || (btn.textContent.trim().toLocaleLowerCase('pt-BR').includes('hist')?'history':'current');
    activate(tab);
  },true);

  document.addEventListener('touchend',function(event){
    const btn=event.target?.closest?.('.recovery-tabs button');
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    const tab=btn.dataset.recoveryTab || (btn.textContent.trim().toLocaleLowerCase('pt-BR').includes('hist')?'history':'current');
    activate(tab);
  },{capture:true,passive:false});

  if(typeof muscleRecoveryPanel==='function'){
    const before=muscleRecoveryPanel;
    muscleRecoveryPanel=function(){
      return before()
        .replace('onclick="setMuscleRecoveryTab(\'current\')"','data-recovery-tab="current"')
        .replace('onclick="setMuscleRecoveryTab(\'history\')"','data-recovery-tab="history"');
    };
  }
})();