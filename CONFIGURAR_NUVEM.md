# GYM v2 — Configuração

## 1. Publicar a interface
Substitua os arquivos do repositório GitHub Pages pelos arquivos desta pasta. Mantenha `index.html` na raiz.

## 2. Criar o backend Supabase
1. Crie um projeto em Supabase.
2. Abra **SQL Editor** e execute `supabase/schema.sql`.
3. Em **Authentication > URL Configuration**, coloque a URL do seu GitHub Pages em Site URL e Redirect URLs.
4. Em **Project Settings > API**, copie a Project URL e a Publishable/anon key.
5. Edite `config.js`:

```js
window.GYM_CONFIG={
  supabaseUrl:"https://SEU-PROJETO.supabase.co",
  supabaseAnonKey:"SUA_CHAVE_PUBLICAVEL",
  aiFunctionUrl:"",
  appVersion:"2.0.0"
};
```

A chave publicável pode ficar no frontend **somente porque** o banco usa Row Level Security. Nunca coloque `service_role` nem chave da OpenAI no navegador.

## 3. E-mail e senha
O Supabase usa confirmação de e-mail por padrão. Você pode editar os modelos em **Authentication > Email Templates**.

## 4. Coach com IA generativa (opcional)
O app já funciona com regras offline. Para ativar respostas de linguagem natural:
1. Instale a Supabase CLI.
2. Vincule o projeto.
3. Salve a chave como segredo: `supabase secrets set OPENAI_API_KEY=...`
4. Publique: `supabase functions deploy coach`
5. Copie a URL da função para `aiFunctionUrl` no `config.js`.

A chave da API deve permanecer no servidor/Edge Function, nunca em `config.js`.

## Limites responsáveis
- As animações são esquemáticas e não substituem ajuste presencial do aparelho.
- O gerador usa regras transparentes; não faz diagnóstico.
- Antes de abrir para o público, contrate revisão de profissional de Educação Física e revisão jurídica/LGPD.


## Exclusão segura da conta

A exclusão do usuário do Supabase Auth precisa acontecer no servidor. O pacote inclui a Edge Function:

`supabase/functions/delete-account/index.ts`

Publique uma vez com o Supabase CLI:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy delete-account
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente no ambiente das Edge Functions. Nunca copie a service role para o `config.js` ou para o GitHub.
