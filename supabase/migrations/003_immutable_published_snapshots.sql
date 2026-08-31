alter table ranking_snapshots add column if not exists snapshot_type text;
alter table ranking_snapshots add column if not exists label text;
alter table ranking_snapshots add column if not exists published_at timestamptz;
alter table ranking_snapshots add column if not exists league_name text;
alter table ranking_snapshots add column if not exists league_data jsonb;
alter table ranking_snapshots add column if not exists result_data jsonb;
update ranking_snapshots set snapshot_type = 'regular', label = 'Week ' || week || ' Power Rankings', published_at = created_at where snapshot_type is null;
alter table ranking_snapshots alter column snapshot_type set not null;
alter table ranking_snapshots alter column published_at set default now();
alter table ranking_snapshots alter column published_at set not null;
alter table ranking_snapshots add constraint ranking_snapshots_type_check check (snapshot_type in ('preseason','regular'));
alter table ranking_snapshots drop constraint if exists ranking_snapshots_league_id_season_week_key;
alter table ranking_snapshots add constraint ranking_snapshots_identity_key unique (league_id, season, week, snapshot_type);

alter table team_ranking_snapshots add column if not exists id bigint generated always as identity;
alter table team_ranking_snapshots add column if not exists team_name text;
alter table team_ranking_snapshots add column if not exists previous_rank integer;
alter table team_ranking_snapshots add column if not exists rank_change integer;
alter table team_ranking_snapshots add column if not exists points_per_game numeric;
alter table team_ranking_snapshots add column if not exists expected_wins numeric;
alter table team_ranking_snapshots add column if not exists expected_win_pct numeric;
alter table team_ranking_snapshots add column if not exists luck numeric;
alter table team_ranking_snapshots add column if not exists explanation text;
alter table team_ranking_snapshots add column if not exists created_at timestamptz not null default now();

create table if not exists preseason_position_snapshots (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references ranking_snapshots(id) on delete cascade,
  team_id text not null,
  position_group text not null,
  position_rank integer not null,
  position_score numeric not null,
  raw_value numeric not null,
  starter_value numeric not null,
  depth_value numeric not null,
  starter_score numeric not null,
  depth_score numeric not null,
  top_starter_vor numeric not null,
  first_depth_vor numeric not null,
  total_useful_depth_vor numeric not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  unique(snapshot_id, team_id, position_group)
);

create table if not exists preseason_player_snapshots (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references ranking_snapshots(id) on delete cascade,
  team_id text not null,
  player_id text not null,
  player_name text not null,
  position text not null,
  assigned_slot text,
  season_projected_points numeric not null,
  replacement_projected_points numeric not null,
  raw_vor numeric not null,
  usable_vor numeric not null,
  contribution_multiplier numeric not null,
  final_contribution numeric not null,
  contribution_role text not null,
  created_at timestamptz not null default now(),
  unique(snapshot_id, team_id, player_id)
);

create or replace function publish_ranking_snapshot(payload jsonb)
returns table(snapshot_id bigint, created boolean)
language plpgsql security definer set search_path = public
as $$
declare existing_id bigint; new_id bigint; expected_count integer; inserted_count integer;
begin
  select id into existing_id from ranking_snapshots
  where league_id = payload->>'league_id' and season = (payload->>'season')::integer
    and week = (payload->>'week')::integer and snapshot_type = payload->>'snapshot_type';
  if existing_id is not null then return query select existing_id, false; return; end if;
  expected_count := jsonb_array_length(payload->'teams');
  if expected_count = 0 then raise exception 'snapshot must contain teams'; end if;
  insert into leagues(id,name,season) values(payload->>'league_id',payload->>'league_name',(payload->>'season')::integer)
    on conflict(id) do update set name=excluded.name,season=excluded.season;
  insert into ranking_snapshots(league_id,season,week,snapshot_type,label,published_at,league_name,league_data,result_data)
  values(payload->>'league_id',(payload->>'season')::integer,(payload->>'week')::integer,payload->>'snapshot_type',payload->>'label',coalesce((payload->>'published_at')::timestamptz,now()),payload->>'league_name',payload->'league_data',payload->'result_data') returning id into new_id;
  insert into team_ranking_snapshots(snapshot_id,team_id,team_name,rank,power_score,previous_rank,rank_change,scoring_score,recent_form_score,record_score,expected_wins_score,roster_score,schedule_score,points_per_game,expected_wins,expected_win_pct,luck,explanation)
  select new_id,x.team_id,x.team_name,x.rank,x.power_score,x.previous_rank,x.rank_change,x.scoring_score,x.recent_form_score,x.record_score,x.expected_wins_score,x.roster_score,x.schedule_score,x.points_per_game,x.expected_wins,x.expected_win_pct,x.luck,x.explanation
  from jsonb_to_recordset(payload->'teams') as x(team_id text,team_name text,rank integer,power_score numeric,previous_rank integer,rank_change integer,scoring_score numeric,recent_form_score numeric,record_score numeric,expected_wins_score numeric,roster_score numeric,schedule_score numeric,points_per_game numeric,expected_wins numeric,expected_win_pct numeric,luck numeric,explanation text);
  get diagnostics inserted_count = row_count;
  if inserted_count <> expected_count then raise exception 'partial snapshot rejected'; end if;
  if payload->>'snapshot_type' = 'preseason' then
    insert into preseason_position_snapshots(snapshot_id,team_id,position_group,position_rank,position_score,raw_value,starter_value,depth_value,starter_score,depth_score,top_starter_vor,first_depth_vor,total_useful_depth_vor,explanation)
    select new_id,x.team_id,x.position_group,x.position_rank,x.position_score,x.raw_value,x.starter_value,x.depth_value,x.starter_score,x.depth_score,x.top_starter_vor,x.first_depth_vor,x.total_useful_depth_vor,x.explanation
    from jsonb_to_recordset(payload->'positions') as x(team_id text,position_group text,position_rank integer,position_score numeric,raw_value numeric,starter_value numeric,depth_value numeric,starter_score numeric,depth_score numeric,top_starter_vor numeric,first_depth_vor numeric,total_useful_depth_vor numeric,explanation text);
    insert into preseason_player_snapshots(snapshot_id,team_id,player_id,player_name,position,assigned_slot,season_projected_points,replacement_projected_points,raw_vor,usable_vor,contribution_multiplier,final_contribution,contribution_role)
    select new_id,x.team_id,x.player_id,x.player_name,x.position,x.assigned_slot,x.season_projected_points,x.replacement_projected_points,x.raw_vor,x.usable_vor,x.contribution_multiplier,x.final_contribution,x.contribution_role
    from jsonb_to_recordset(payload->'players') as x(team_id text,player_id text,player_name text,position text,assigned_slot text,season_projected_points numeric,replacement_projected_points numeric,raw_vor numeric,usable_vor numeric,contribution_multiplier numeric,final_contribution numeric,contribution_role text);
  end if;
  return query select new_id, true;
exception when unique_violation then
  select id into existing_id from ranking_snapshots where league_id=payload->>'league_id' and season=(payload->>'season')::integer and week=(payload->>'week')::integer and snapshot_type=payload->>'snapshot_type';
  return query select existing_id, false;
end $$;

create or replace function reject_published_snapshot_mutation() returns trigger language plpgsql as $$ begin raise exception 'published ranking snapshots are immutable'; end $$;
drop trigger if exists immutable_ranking_snapshots on ranking_snapshots;
create trigger immutable_ranking_snapshots before update or delete on ranking_snapshots for each row execute function reject_published_snapshot_mutation();
drop trigger if exists immutable_team_ranking_snapshots on team_ranking_snapshots;
create trigger immutable_team_ranking_snapshots before update or delete on team_ranking_snapshots for each row execute function reject_published_snapshot_mutation();
drop trigger if exists immutable_preseason_position_snapshots on preseason_position_snapshots;
create trigger immutable_preseason_position_snapshots before update or delete on preseason_position_snapshots for each row execute function reject_published_snapshot_mutation();
drop trigger if exists immutable_preseason_player_snapshots on preseason_player_snapshots;
create trigger immutable_preseason_player_snapshots before update or delete on preseason_player_snapshots for each row execute function reject_published_snapshot_mutation();

alter table ranking_snapshots enable row level security;
alter table team_ranking_snapshots enable row level security;
alter table preseason_position_snapshots enable row level security;
alter table preseason_player_snapshots enable row level security;
create policy "published snapshots are publicly readable" on ranking_snapshots for select using (published_at is not null);
create policy "published team rankings are publicly readable" on team_ranking_snapshots for select using (exists(select 1 from ranking_snapshots s where s.id=snapshot_id and s.published_at is not null));
create policy "published positions are publicly readable" on preseason_position_snapshots for select using (exists(select 1 from ranking_snapshots s where s.id=snapshot_id and s.published_at is not null));
create policy "published players are publicly readable" on preseason_player_snapshots for select using (exists(select 1 from ranking_snapshots s where s.id=snapshot_id and s.published_at is not null));
revoke all on function publish_ranking_snapshot(jsonb) from public, anon, authenticated;
grant execute on function publish_ranking_snapshot(jsonb) to service_role;
