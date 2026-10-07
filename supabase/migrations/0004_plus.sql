-- Lifepath v0.8: Plus entitlements and AI planner usage limits.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

-- Who has Plus. People can read their own row; only the server (service role, e.g. a payment webhook) writes it.
create table if not exists public.entitlements (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  plan       text        not null default 'free' check (plan in ('free', 'plus')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "ent_select_own" on public.entitlements;
create policy "ent_select_own" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: the app can never grant itself Plus.

-- Daily AI plan counter (cost control). Only the Edge Function (service role) touches it.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  calls   int  not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security; -- no policies: invisible to the app

-- To give a tester Plus (replace the id with theirs from Authentication → Users):
--   insert into public.entitlements (user_id, plan) values ('00000000-0000-0000-0000-000000000000', 'plus')
--   on conflict (user_id) do update set plan = 'plus', expires_at = null, updated_at = now();
