-- Forward repair for projects where migration 004 omitted explicit read grants.
-- Writes remain restricted to the security-definer publication RPC.
grant select on table public.news_articles to anon, authenticated, service_role;
