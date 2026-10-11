/* Progressa v6.4.27 — escopo ao excluir séries */
(function(){
  let pendingRemoval=null;

  function currentPlanExercise(activeExercise){
    const day=(state.plan?.days||[]).find(item=>item.id===state.active?.dayId);
    return (day?.exercises||[]).find(item=>item.id===activeExercise?.id)||null;
  }

  window.removeSetFromActive=function(exerciseIndex,setIndex){
    const exercise=state.active?.exercises?.[exerciseIndex];
    const set=exercise?.sets?.[setIndex];
    if(!exercise||!set)return;
    if(exercise.sets.length<=1)return toast('O exercício precisa manter pelo menos 1 série.');

    pendingRemoval={exerciseIndex,setIndex};
    const hasData=!!set.done||String(set.kg??'').trim()!==''||String(set.reps??'').trim()!=='';
    const nextCount=exercise.sets.length-1;
    const plural=nextCount===1?'':'s';
    modal('<span class="eyebrow">EXCLUIR SÉRIE</span><h2>Onde deseja aplicar?</h2><p class="muted">Este exercício ficará com <b>'+nextCount+' série'+plural+'</b>.</p>'+(hasData?'<div class="notice"><b>Atenção:</b> esta série possui dados preenchidos ou já foi concluída. Ao excluir, esses dados serão removidos deste treino.</div>':'')+'<div class="grid grid2" style="margin-top:16px"><button class="btn secondary block" onclick="applySetRemovalScope(\'current\')">Só neste treino</button><button class="btn primary block" onclick="applySetRemovalScope(\'future\')">Neste e nos próximos</button></div><button class="btn ghost block" style="margin-top:10px" onclick="cancelSetRemoval()">Cancelar</button>');
  };

  window.cancelSetRemoval=function(){
    pendingRemoval=null;
    closeModal();
  };

  window.applySetRemovalScope=function(scope){
    const pending=pendingRemoval;
    pendingRemoval=null;
    if(!pending)return closeModal();

    const exercise=state.active?.exercises?.[pending.exerciseIndex];
    if(!exercise||!exercise.sets?.[pending.setIndex])return closeModal();
    if(exercise.sets.length<=1){closeModal();return toast('O exercício precisa manter pelo menos 1 série.');}

    exercise.sets.splice(pending.setIndex,1);

    if(scope==='future'){
      const planExercise=currentPlanExercise(exercise);
      if(planExercise){
        planExercise.sets=exercise.sets.length;
        exercise.sets.forEach(set=>set.extra=false);
      }
    }

    saveLocal();
    closeModal();
    renderApp();
    toast(scope==='future'
      ? exercise.sets.length+' séries definidas para este e os próximos treinos.'
      : 'Série excluída somente deste treino.');
  };
})();