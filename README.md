# GYM Premium v5.9

Atualização corretiva do login em nuvem. Mantém as imagens, relatórios, PDF, biblioteca de exercícios, cardio, fadiga e histórico da v5.8.

## Correção principal

A v5.8 executava uma consulta assíncrona ao banco dentro do evento `onAuthStateChange` do Supabase. Isso podia bloquear o cliente e fazer o botão **Entrar** ficar sem resposta. A v5.9 adia a sincronização para fora do evento, mostra mensagens de erro na própria tela e não rejeita senhas antigas apenas por terem menos de oito caracteres.

Mantenha o seu `config.js` atual.
