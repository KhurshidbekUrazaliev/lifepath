-- Lifepath v0.3: cloud sync storage.
-- Every folder, task, log entry, plan and the profile is one row, owned by one user.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('folder', 'task', 'entry', 'plan', 'profile')),
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

-- Server clock decides updated_at, so device clocks never matter for sync.
create or replace function public.records_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch
  before insert or update on public.records
  for each row execute function public.records_touch_updated_at();

-- Row level security: people can only ever see and change their own rows.
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own" on public.records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "records_delete_own" on public.records;
create policy "records_delete_own" on public.records
  for delete to authenticated using ((select auth.uid()) = user_id);
