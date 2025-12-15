-- Management Score v3.0 – Blueprint Supabase (Schema, Views, Functions, RLS)
-- Jalankan bertahap jika diperlukan. Sesuaikan nama enum/status dengan skema Anda.

create schema if not exists public;

create or replace function public.has_role(target text)
returns boolean language sql stable as $$
select coalesce((auth.jwt() ->> 'role') = target, false)
$$;

create or replace function public.has_any_role(targets text[])
returns boolean language sql stable as $$
select exists (select 1 where (auth.jwt() ->> 'role') = any(targets))
$$;

-- Indexes
create index if not exists events_status_idx on public.events (status);
create index if not exists events_admin_idx on public.events (admin_id);
create index if not exists pots_event_idx on public.pots (event_id);
create index if not exists teams_event_idx on public.teams (event_id);
create index if not exists games_pot_idx on public.games (pot_id);
create index if not exists raw_scores_game_idx on public.raw_scores (game_id);
create index if not exists raw_scores_team_idx on public.raw_scores (team_id);
create index if not exists point_mapping_event_idx on public.point_mapping (event_id);
create index if not exists team_pot_mapping_team_pot_idx on public.team_pot_mapping (team_id, pot_id);

-- Settings per event
create table if not exists public.event_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  input_columns jsonb not null default '{"rank":true,"p_rank":true,"kill":true}',
  hidden_action boolean not null default false,
  sorting_mode text not null default 'points_then_kill',
  allow_public_recaps boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Views
create or replace view public.v_scores_by_game as
select
  rs.id,
  rs.game_id,
  g.pot_id,
  p.event_id,
  t.id as team_id,
  t.name as team_name,
  rs.rank,
  coalesce(rs.p_rank,
    (select pm.points from public.point_mapping pm
     where pm.event_id = p.event_id and pm.rank_position = rs.rank)
  ) as rank_points,
  rs.kill
from public.raw_scores rs
join public.games g on g.id = rs.game_id
join public.pots p on p.id = g.pot_id
join public.teams t on t.id = rs.team_id;

create or replace view public.v_pot_leaderboard as
select
  v.pot_id,
  v.event_id,
  v.team_id,
  v.team_name,
  sum(v.rank_points) as total_points,
  sum(v.kill) as total_kill
from public.v_scores_by_game v
group by v.pot_id, v.event_id, v.team_id, v.team_name;

-- Functions
create or replace function public.ensure_grand_final_pot(e_id uuid)
returns uuid language plpgsql as $$
declare final_pot uuid;
begin
  select id into final_pot from public.pots
  where event_id = e_id and lower(name) = 'grand final' limit 1;
  if final_pot is null then
    insert into public.pots (event_id, name, display_order, is_hidden)
    values (e_id, 'GRAND FINAL', 999, false)
    returning id into final_pot;
  end if;
  return final_pot;
end
$$;

create or replace function public.move_team_to_grand_final(e_id uuid, t_id uuid)
returns void language plpgsql as $$
declare final_pot uuid;
begin
  final_pot := public.ensure_grand_final_pot(e_id);
  if not exists (
    select 1 from public.team_pot_mapping m
    where m.team_id = t_id and m.pot_id = final_pot
  ) then
    insert into public.team_pot_mapping (team_id, pot_id, is_finalist)
    values (t_id, final_pot, true);
  end if;
end
$$;

create or replace function public.reset_scores_values(e_id uuid)
returns void language plpgsql as $$
begin
  update public.raw_scores rs
  set rank = null, p_rank = null, kill = 0
  where rs.game_id in (
    select g.id from public.games g
    join public.pots p on p.id = g.pot_id
    where p.event_id = e_id
  );
end
$$;

create or replace function public.reset_all_data(e_id uuid)
returns void language plpgsql as $$
begin
  delete from public.raw_scores using public.games g, public.pots p
  where raw_scores.game_id = g.id and g.pot_id = p.id and p.event_id = e_id;
end
$$;

-- RLS
alter table public.event_settings enable row level security;
alter table public.events enable row level security;
alter table public.pots enable row level security;
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.point_mapping enable row level security;
alter table public.team_pot_mapping enable row level security;
alter table public.raw_scores enable row level security;
alter table public.profiles enable row level security;

-- events
drop policy if exists public_read_events on public.events;
create policy public_read_events
on public.events
for select
to anon
using (status in ('live','completed'));

drop policy if exists auth_read_events on public.events;
create policy auth_read_events
on public.events
for select
to authenticated
using (public.has_role('admin') or public.has_role('operator') or status in ('live','completed'));

drop policy if exists admin_write_events on public.events;
create policy admin_write_events
on public.events
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- event_settings
drop policy if exists public_read_event_settings on public.event_settings;
create policy public_read_event_settings
on public.event_settings
for select
to anon
using (exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists auth_read_event_settings on public.event_settings;
create policy auth_read_event_settings
on public.event_settings
for select
to authenticated
using (public.has_role('admin') or public.has_role('operator') or exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists admin_write_event_settings on public.event_settings;
create policy admin_write_event_settings
on public.event_settings
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- pots
drop policy if exists public_read_pots on public.pots;
create policy public_read_pots
on public.pots
for select
to anon
using (not is_hidden and exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists auth_read_pots on public.pots;
create policy auth_read_pots
on public.pots
for select
to authenticated
using (public.has_role('admin') or not is_hidden and exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists admin_write_pots on public.pots;
create policy admin_write_pots
on public.pots
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- games
drop policy if exists public_read_games on public.games;
create policy public_read_games
on public.games
for select
to anon
using (exists (select 1 from public.pots p join public.events e on e.id = p.event_id where p.id = pot_id and e.status in ('live','completed')));

drop policy if exists auth_read_games on public.games;
create policy auth_read_games
on public.games
for select
to authenticated
using (public.has_role('admin') or exists (select 1 from public.pots p join public.events e on e.id = p.event_id where p.id = pot_id and e.status in ('live','completed')));

drop policy if exists admin_write_games on public.games;
create policy admin_write_games
on public.games
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- teams
drop policy if exists public_read_teams on public.teams;
create policy public_read_teams
on public.teams
for select
to anon
using (exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists auth_read_teams on public.teams;
create policy auth_read_teams
on public.teams
for select
to authenticated
using (public.has_role('admin') or exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists admin_write_teams on public.teams;
create policy admin_write_teams
on public.teams
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- point_mapping
drop policy if exists public_read_point_mapping on public.point_mapping;
create policy public_read_point_mapping
on public.point_mapping
for select
to anon
using (exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists auth_read_point_mapping on public.point_mapping;
create policy auth_read_point_mapping
on public.point_mapping
for select
to authenticated
using (public.has_role('admin') or exists (select 1 from public.events e where e.id = event_id and e.status in ('live','completed')));

drop policy if exists admin_write_point_mapping on public.point_mapping;
create policy admin_write_point_mapping
on public.point_mapping
for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- team_pot_mapping
drop policy if exists public_read_team_pot_mapping on public.team_pot_mapping;
create policy public_read_team_pot_mapping
on public.team_pot_mapping
for select
to anon
using (exists (select 1 from public.pots p join public.events e on e.id = p.event_id where p.id = pot_id and e.status in ('live','completed')));

drop policy if exists auth_read_team_pot_mapping on public.team_pot_mapping;
create policy auth_read_team_pot_mapping
on public.team_pot_mapping
for select
to authenticated
using (public.has_role('admin') or exists (select 1 from public.pots p join public.events e on e.id = p.event_id where p.id = pot_id and e.status in ('live','completed')));

drop policy if exists operator_write_team_pot_mapping on public.team_pot_mapping;
create policy operator_write_team_pot_mapping
on public.team_pot_mapping
for all
to authenticated
using (public.has_any_role(array['operator','admin']))
with check (public.has_any_role(array['operator','admin']));

-- raw_scores
drop policy if exists public_read_raw_scores on public.raw_scores;
create policy public_read_raw_scores
on public.raw_scores
for select
to anon
using (exists (select 1 from public.games g join public.pots p on p.id = g.pot_id join public.events e on e.id = p.event_id where g.id = game_id and e.status in ('live','completed')));

drop policy if exists auth_read_raw_scores on public.raw_scores;
create policy auth_read_raw_scores
on public.raw_scores
for select
to authenticated
using (public.has_role('admin') or public.has_role('operator') or exists (select 1 from public.games g join public.pots p on p.id = g.pot_id join public.events e on e.id = p.event_id where g.id = game_id and e.status in ('live','completed')));

drop policy if exists operator_write_raw_scores on public.raw_scores;
create policy operator_write_raw_scores
on public.raw_scores
for all
to authenticated
using (public.has_any_role(array['operator','admin']))
with check (public.has_any_role(array['operator','admin']));

-- profiles
drop policy if exists read_own_or_admin_profiles on public.profiles;
create policy read_own_or_admin_profiles
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.has_role('admin'));

drop policy if exists insert_self_profile on public.profiles;
create policy insert_self_profile
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists update_self_profile on public.profiles;
create policy update_self_profile
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists admin_update_profiles on public.profiles;
create policy admin_update_profiles
on public.profiles
for update
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
