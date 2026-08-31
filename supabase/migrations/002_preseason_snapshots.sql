create table if not exists preseason_snapshots (
  id bigint generated always as identity primary key,
  league_id text not null references leagues(id) on delete cascade,
  season integer not null,
  created_at timestamptz not null default now(),
  effective_weights jsonb not null,
  replacement_levels jsonb not null,
  unique (league_id, season)
);

create table if not exists team_preseason_snapshots (
  snapshot_id bigint not null references preseason_snapshots(id) on delete cascade,
  team_id text not null,
  rank integer not null,
  overall_score numeric not null,
  position_groups jsonb not null,
  projected_lineup jsonb not null,
  explanation text not null,
  primary key (snapshot_id, team_id)
);
