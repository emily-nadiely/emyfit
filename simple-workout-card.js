/* Progressa v6.4.12 — ficha de treino simplificada */
(function(){
  if(typeof activeExercise!=='function')return;
  const activeExerciseBeforeSimpleCard=activeExercise;
  activeExercise=function(x,ei){
    const html=activeExerciseBeforeSimpleCard(x,ei);
    try{
      const host=document.createElement('div');
      host.innerHTML=html;
      host.querySelectorAll('.exercise-progress-strip,.v6-insight').forEach(el=>el.remove());
      return host.innerHTML;
    }catch(error){
      console.warn('Falha ao simplificar ficha do exercício',error);
      return html;
    }
  };
})();
