-- Lifepath v0.7: rankings.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Scores are computed on the server from the synced `records` table, never sent by the app:
-- only logs that have proof (trust = 'evidence') count, so a one-tap log never ranks.
-- People appear only if they opted in, under the display name they chose.

create table if not exists public.public_profiles (
  user_id      uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 1 and 24),
  country      text        check (country is null or char_length(country) = 2),
  city         text        check (city is null or char_length(city) <= 40),
  opted_in     boolean     not null default false,
  updated_at   timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

-- Each person can read and change only their own row. Everyone else is reached through leaderboard().
drop policy if exists "pp_select_own" on public.public_profiles;
create policy "pp_select_own" on public.public_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "pp_insert_own" on public.public_profiles;
create policy "pp_insert_own" on public.public_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "pp_update_own" on public.public_profiles;
create policy "pp_update_own" on public.public_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "pp_delete_own" on public.public_profiles;
create policy "pp_delete_own" on public.public_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Top players by proven XP, plus the caller's own row wherever it ranks.
--   p_since_ms: only count logs at or after this time (epoch ms); null = all time
--   p_country / p_city: optional filters (country is a 2-letter code)
create or replace function public.leaderboard(
  p_since_ms bigint default null,
  p_country  text   default null,
  p_city     text   default null,
  p_limit    int    default 50
)
returns table (rank bigint, display_name text, country text, city text, xp bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with scores as (
    select r.user_id, sum(coalesce((r.data ->> 'xp')::numeric, 0))::bigint as xp
    from public.records r
    where r.kind = 'entry'
      and r.deleted = false
      and r.data ->> 'trust' = 'evidence'
      and (p_since_ms is null or (r.data ->> 'at')::bigint >= p_since_ms)
    group by r.user_id
  ),
  ranked as (
    select
      rank() over (order by s.xp desc) as rank,
      s.user_id, pp.display_name, pp.country, pp.city, s.xp
    from scores s
    join public.public_profiles pp on pp.user_id = s.user_id
    where pp.opted_in
      and s.xp > 0
      and (p_country is null or pp.country = upper(p_country))
      and (p_city is null or lower(pp.city) = lower(p_city))
  )
  select ranked.rank, ranked.display_name, ranked.country, ranked.city, ranked.xp,
         (ranked.user_id = (select auth.uid())) as is_me
  from ranked
  where ranked.rank <= least(greatest(p_limit, 1), 100) or ranked.user_id = (select auth.uid())
  order by ranked.rank, ranked.display_name;
$$;

revoke all on function public.leaderboard(bigint, text, text, int) from public, anon;
grant execute on function public.leaderboard(bigint, text, text, int) to authenticated;
