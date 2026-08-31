create table if not exists news_articles (
  id bigint generated always as identity primary key,
  league_id text not null,
  season integer not null,
  week integer not null check (week > 0),
  snapshot_id bigint not null references ranking_snapshots(id),
  article_type text not null check (article_type = 'weekly_power_rankings'),
  title text not null,
  slug text not null unique,
  summary text not null,
  body jsonb not null,
  status text not null check (status = 'published'),
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  unique (league_id, season, week, article_type),
  unique (snapshot_id, article_type)
);
create or replace function publish_weekly_news_article(payload jsonb) returns table(article_id bigint,created boolean) language plpgsql security definer set search_path=public as $$
declare existing_id bigint; new_id bigint; snapshot_row ranking_snapshots%rowtype; ranking_count integer; team_count integer;
begin
  select * into snapshot_row from ranking_snapshots where id=(payload->>'snapshot_id')::bigint;
  if snapshot_row.id is null or snapshot_row.snapshot_type <> 'regular' then raise exception 'article requires a regular ranking snapshot'; end if;
  if snapshot_row.league_id <> payload->>'league_id' or snapshot_row.season <> (payload->>'season')::integer or snapshot_row.week <> (payload->>'week')::integer then raise exception 'article identity does not match snapshot'; end if;
  select id into existing_id from news_articles where snapshot_id=snapshot_row.id and article_type='weekly_power_rankings';
  if existing_id is not null then return query select existing_id,false; return; end if;
  ranking_count:=jsonb_array_length(payload->'body'->'rankings');
  team_count:=jsonb_array_length(snapshot_row.league_data->'teams');
  if ranking_count<>team_count or ranking_count<>(select count(distinct value->>'teamId') from jsonb_array_elements(payload->'body'->'rankings')) then raise exception 'article must contain every team exactly once'; end if;
  insert into news_articles(league_id,season,week,snapshot_id,article_type,title,slug,summary,body,status,published_at) values(payload->>'league_id',(payload->>'season')::integer,(payload->>'week')::integer,snapshot_row.id,'weekly_power_rankings',payload->>'title',payload->>'slug',payload->>'summary',payload->'body','published',coalesce((payload->>'published_at')::timestamptz,snapshot_row.published_at)) returning id into new_id;
  return query select new_id,true;
exception when unique_violation then select id into existing_id from news_articles where snapshot_id=snapshot_row.id and article_type='weekly_power_rankings';return query select existing_id,false;
end $$;
create or replace function reject_news_article_mutation() returns trigger language plpgsql as $$ begin raise exception 'published news articles are immutable'; end $$;
drop trigger if exists immutable_news_articles on news_articles;
create trigger immutable_news_articles before update or delete on news_articles for each row execute function reject_news_article_mutation();
alter table news_articles enable row level security;
create policy "published news is publicly readable" on news_articles for select using(status='published');
revoke all on function publish_weekly_news_article(jsonb) from public,anon,authenticated;
grant execute on function publish_weekly_news_article(jsonb) to service_role;
