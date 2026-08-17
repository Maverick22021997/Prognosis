-- Серверный API авторизации должен иметь возможность
-- находить профиль пользователя по username.

grant usage on schema public to service_role;

grant select on table public.profiles to service_role;