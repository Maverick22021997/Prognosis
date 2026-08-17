-- ============================================================
-- ADMIN USERS OVERVIEW
--
-- Список пользователей для административной панели.
-- Только admin.
--
-- Не раскрывает email / auth-данные.
-- Не позволяет изменять баланс или статистику.
-- ============================================================

create or replace function public.admin_get_users(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  username text,
  registered_at timestamptz,
  age_confirmed boolean,

  staff_role text,

  season_id bigint,
  season_title text,

  balance_gp bigint,
  predictions_count integer,
  emergency_refill_used boolean,

  accuracy numeric,
  resolved_events_count integer,
  successful_events_count integer,

  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_search text;
  v_limit integer;
  v_offset integer;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- INPUT
  -- ==========================================================

  v_search :=
    nullif(
      btrim(
        coalesce(
          p_search,
          ''
        )
      ),
      ''
    );

  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          100
        ),
        200
      )
    );

  v_offset :=
    greatest(
      coalesce(
        p_offset,
        0
      ),
      0
    );


  -- ==========================================================
  -- RESULT
  -- ==========================================================

  return query

  with current_season as (
    select
      s.id,
      s.title

    from public.seasons as s

    where s.status in (
      'active',
      'closing'
    )

    order by
      case
        when s.status = 'active' then 1
        when s.status = 'closing' then 2
        else 3
      end,
      s.start_at desc

    limit 1
  ),

  filtered_users as (
    select
      p.id,
      p.username,
      p.created_at,
      p.age_confirmed

    from public.profiles as p

    where
      v_search is null

      or p.username ilike
        '%' || v_search || '%'
  ),

  user_rows as (
    select
      fu.id as user_id,
      fu.username,
      fu.created_at as registered_at,
      fu.age_confirmed,

      su.role as staff_role,

      cs.id as season_id,
      cs.title as season_title,

      sp.balance_gp,
      sp.predictions_count,
      sp.emergency_refill_used,

      coalesce(
        lb.accuracy,
        0::numeric
      ) as accuracy,

      coalesce(
        lb.resolved_events_count,
        0
      )::integer as resolved_events_count,

      coalesce(
        lb.successful_events_count,
        0
      )::integer as successful_events_count

    from filtered_users as fu

    left join public.staff_users as su
      on su.user_id = fu.id

    left join current_season as cs
      on true

    left join public.season_participants as sp
      on sp.user_id = fu.id
      and sp.season_id = cs.id

    left join public.v_season_leaderboard as lb
      on lb.user_id = fu.id
      and lb.season_id = cs.id
  )

  select
    ur.user_id,
    ur.username,
    ur.registered_at,
    ur.age_confirmed,

    ur.staff_role,

    ur.season_id,
    ur.season_title,

    ur.balance_gp,
    coalesce(
      ur.predictions_count,
      0
    )::integer,

    coalesce(
      ur.emergency_refill_used,
      false
    ),

    ur.accuracy,
    ur.resolved_events_count,
    ur.successful_events_count,

    count(*) over()::bigint

  from user_rows as ur

  order by
    ur.registered_at desc,
    ur.user_id

  limit v_limit
  offset v_offset;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_get_users(
  text,
  integer,
  integer
)
from public;

grant execute
on function public.admin_get_users(
  text,
  integer,
  integer
)
to authenticated;