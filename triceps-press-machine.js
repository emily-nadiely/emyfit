/* Progressa v6.4.33 — adiciona Tríceps Press na máquina */
(function(){
  if(typeof EX==='undefined')return;
  EX.triceps_press_machine={
    name:'Tríceps Press na máquina',
    category:'arms',
    machine:'Máquina Tríceps Press',
    pattern:'Extensão de cotovelo',
    primary:['tríceps'],
    level:'iniciante',
    knee:'ok',
    back:'ok',
    shoulder:'adapt',
    sets:3,
    reps:'10–15',
    rest:75,
    cues:[
      'Ajuste o banco para manter o tronco apoiado',
      'Segure as alças com os punhos neutros e firmes',
      'Mantenha os cotovelos próximos ao corpo',
      'Empurre as alças para baixo até quase estender os cotovelos',
      'Retorne de forma controlada sem deixar a carga bater'
    ],
    avoid:[
      'tirar as costas do apoio',
      'usar impulso do tronco',
      'travar os cotovelos com força',
      'carga que comprometa o controle do movimento'
    ],
    why:'Máquina guiada para extensão de cotovelo com ênfase nos tríceps e boa estabilidade do tronco.',
    subs:['triceps','triceps_bar','triceps_overhead_db'],
    source:'acsm'
  };
  for(const id of ['triceps','triceps_bar','triceps_overhead_db']){
    if(!EX[id])continue;
    EX[id].subs=Array.isArray(EX[id].subs)?EX[id].subs:[];
    if(!EX[id].subs.includes('triceps_press_machine'))EX[id].subs.push('triceps_press_machine');
  }
})();