grant usage on schema public to service_role;

grant select, delete
on table public.profiles
to service_role;

grant select, delete
on table public.season_participants
to service_role;