-- ============================================================
-- STAFF USERS
-- ============================================================

create table if not exists public.staff_users (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  role text not null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint staff_users_role_valid
    check (
      role in (
        'admin',
        'moderator'
      )
    )
);


-- ============================================================
-- INDEX
-- ============================================================

create index if not exists
  staff_users_role_idx
on public.staff_users(role);


-- ============================================================
-- RLS
-- ============================================================

alter table public.staff_users
enable row level security;


-- Пользователь может увидеть только факт
-- собственной staff-роли.
create policy
  "staff users can read own role"
on public.staff_users
for select
to authenticated
using (
  user_id = auth.uid()
);


-- Прямые изменения клиентом запрещаем.
revoke insert, update, delete
on public.staff_users
from authenticated;


-- ============================================================
-- IS_STAFF
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

  select exists (
    select 1
    from public.staff_users
    where user_id = auth.uid()
      and role in (
        'admin',
        'moderator'
      )
  );

$function$;


revoke all
on function public.is_staff()
from public;

grant execute
on function public.is_staff()
to authenticated;