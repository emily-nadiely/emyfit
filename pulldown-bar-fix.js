/* Progressa v6.4.15 — corrige cadastro da puxada frontal */
(function(){
  try{
    if(typeof EX!=='undefined'&&EX.pulldown){
      EX.pulldown.name='Puxada frontal na barra';
      EX.pulldown.machine='Puxada alta com barra';
      EX.pulldown.pattern='Puxada vertical';
    }
  }catch(error){console.warn('Falha ao corrigir puxada frontal',error)}
})();