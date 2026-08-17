-- ============================================================
-- FIX is_admin()
--
-- Старый вариант проверял profiles.role,
-- но роли сотрудников теперь хранятся в staff_users.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

  select exists (
    select 1
    from public.staff_users as su
    where su.user_id = auth.uid()
      and su.role = 'admin'
  );

$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.is_admin()
from public;

grant execute
on function public.is_admin()
to anon, authenticated;