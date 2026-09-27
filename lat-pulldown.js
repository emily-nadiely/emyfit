/* Progressa v6.4.18 — adiciona Lat Pulldown articulado */
(function(){
  if(typeof EX==='undefined')return;

  EX.lat_pulldown={
    name:'Lat Pulldown',
    category:'back',
    machine:'Máquina Lat Pulldown articulada',
    pattern:'Puxada vertical',
    primary:['dorsais','costas','bíceps'],
    level:'iniciante',
    knee:'ok',
    back:'adapt',
    shoulder:'adapt',
    sets:3,
    reps:'8–12',
    rest:75,
    cues:[
      'Ajuste o banco e o apoio para ficar estável',
      'Segure as alças com os braços elevados',
      'Puxe os cotovelos para baixo em direção ao tronco',
      'Mantenha o peito aberto e evite balançar o corpo',
      'Retorne de forma controlada até alongar as costas'
    ],
    avoid:[
      'puxar atrás da cabeça',
      'usar impulso do tronco',
      'carga que comprometa a amplitude ou a execução'
    ],
    why:'Máquina articulada de puxada vertical para trabalhar principalmente dorsais e costas, com participação dos bíceps.',
    subs:['pulldown','pulldown_close','pulldown_neutral','pulldown_unilateral'],
    source:'acsm'
  };

  if(EX.pulldown){
    EX.pulldown.subs=Array.isArray(EX.pulldown.subs)?EX.pulldown.subs:[];
    if(!EX.pulldown.subs.includes('lat_pulldown'))EX.pulldown.subs.unshift('lat_pulldown');
  }
})();
