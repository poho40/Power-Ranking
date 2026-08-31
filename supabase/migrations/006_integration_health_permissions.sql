-- Forward repair for projects where migration 005 was already applied.
grant select on table integration_status to anon,authenticated;
grant select,insert,update on table integration_status to service_role;
revoke insert,update,delete on table integration_status from anon,authenticated;
