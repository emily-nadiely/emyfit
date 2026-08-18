-- Execute no SQL Editor do Supabase
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_app_state enable row level security;
drop policy if exists "Users read own state" on public.user_app_state;
create policy "Users read own state" on public.user_app_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own state" on public.user_app_state;
create policy "Users insert own state" on public.user_app_state for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own state" on public.user_app_state;
create policy "Users update own state" on public.user_app_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_app_state from anon;
grant select, insert, update on public.user_app_state to authenticated;
