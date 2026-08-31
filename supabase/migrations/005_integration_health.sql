create table if not exists integration_status(integration text primary key,status text not null check(status in('healthy','authentication_failed','configuration_error','network_error','rate_limited','service_error','malformed_response','unknown')),last_success_at timestamptz,last_failure_at timestamptz,last_failure_reason text,last_successful_publish_at timestamptz,updated_at timestamptz not null default now());
alter table integration_status enable row level security;
create policy "integration health is publicly readable" on integration_status for select using(true);
grant select on table integration_status to anon,authenticated;
grant select,insert,update on table integration_status to service_role;
revoke insert,update,delete on table integration_status from anon,authenticated;
create or replace function reject_integration_status_delete() returns trigger language plpgsql as $$ begin raise exception 'integration status cannot be deleted'; end $$;
drop trigger if exists no_integration_status_delete on integration_status;
create trigger no_integration_status_delete before delete on integration_status for each row execute function reject_integration_status_delete();
