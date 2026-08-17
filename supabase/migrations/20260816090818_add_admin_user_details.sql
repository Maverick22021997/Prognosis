-- ============================================================
-- ADMIN USER DETAILS
--
-- Только administrator.
-- Никаких изменений пользовательских данных.
-- ============================================================


-- ============================================================
-- USER DETAILS + SEASON HISTORY
-- ============================================================

create or replace function public.admin_get_user_details(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_profile record;
  v_staff_role text;

  v_current_season jsonb;
  v_season_history jsonb;
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
  -- PROFILE
  -- ==========================================================

  select
    p.id,
    p.username,
    p.age_confirmed,
    p.age_confirmed_at,
    p.created_at,
    p.updated_at
  into v_profile
  from public.profiles as p
  where p.id = p_user_id;


  if not found then
    raise exception 'USER_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- STAFF ROLE
  -- ==========================================================

  select su.role
  into v_staff_role
  from public.staff_users as su
  where su.user_id = p_user_id;


  -- ==========================================================
  -- CURRENT SEASON
  --
  -- active имеет приоритет над closing.
  -- ==========================================================

  select
    jsonb_build_object(
      'season_id',
        s.id,

      'season_title',
        s.title,

      'season_slug',
        s.slug,

      'season_status',
        s.status,

      'start_at',
        s.start_at,

      'end_at',
        s.end_at,

      'starting_balance',
        s.starting_balance,

      'minimum_predictions_for_prize',
        s.minimum_predictions_for_prize,

      'participant_id',
        sp.id,

      'balance_gp',
        sp.balance_gp,

      'predictions_count',
        coalesce(
          sp.predictions_count,
          0
        ),

      'emergency_refill_used',
        coalesce(
          sp.emergency_refill_used,
          false
        ),

      'accuracy',
        coalesce(
          lb.accuracy,
          0
        ),

      'resolved_events_count',
        coalesce(
          lb.resolved_events_count,
          0
        ),

      'successful_events_count',
        coalesce(
          lb.successful_events_count,
          0
        ),

      'rank',
        lb.rank
    )
  into v_current_season

  from public.seasons as s

  left join public.season_participants as sp
    on sp.season_id = s.id
    and sp.user_id = p_user_id

  left join public.v_season_leaderboard as lb
    on lb.season_id = s.id
    and lb.user_id = p_user_id

  where s.status in (
    'active',
    'closing'
  )

  order by
    case
      when s.status = 'active' then 1
      else 2
    end,
    s.start_at desc

  limit 1;


  -- ==========================================================
  -- SEASON HISTORY
  --
  -- Для finished при наличии snapshot используем snapshot.
  -- Для остальных сезонов — текущий leaderboard.
  -- ==========================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'season_id',
            x.season_id,

          'title',
            x.title,

          'slug',
            x.slug,

          'status',
            x.status,

          'start_at',
            x.start_at,

          'end_at',
            x.end_at,

          'closed_at',
            x.closed_at,

          'balance_gp',
            x.balance_gp,

          'predictions_count',
            x.predictions_count,

          'emergency_refill_used',
            x.emergency_refill_used,

          'rank',
            x.rank,

          'accuracy',
            x.accuracy,

          'resolved_events_count',
            x.resolved_events_count,

          'successful_events_count',
            x.successful_events_count
        )

        order by
          x.start_at desc
      ),
      '[]'::jsonb
    )

  into v_season_history

  from (
    select
      s.id
        as season_id,

      s.title,
      s.slug,
      s.status,
      s.start_at,
      s.end_at,
      s.closed_at,

      sp.balance_gp,

      coalesce(
        sp.predictions_count,
        0
      )::integer
        as predictions_count,

      coalesce(
        sp.emergency_refill_used,
        false
      )
        as emergency_refill_used,

      case
        when s.status = 'finished'
          then coalesce(
            sls.rank,
            lb.rank::integer
          )

        else lb.rank::integer
      end
        as rank,

      case
        when s.status = 'finished'
          then coalesce(
            sls.accuracy,
            lb.accuracy,
            0
          )

        else coalesce(
          lb.accuracy,
          0
        )
      end
        as accuracy,

      case
        when s.status = 'finished'
          then coalesce(
            sls.resolved_events_count,
            lb.resolved_events_count,
            0
          )

        else coalesce(
          lb.resolved_events_count,
          0
        )
      end::integer
        as resolved_events_count,

      case
        when s.status = 'finished'
          then coalesce(
            sls.successful_events_count,
            lb.successful_events_count,
            0
          )

        else coalesce(
          lb.successful_events_count,
          0
        )
      end::integer
        as successful_events_count

    from public.season_participants as sp

    join public.seasons as s
      on s.id = sp.season_id

    left join public.v_season_leaderboard as lb
      on lb.season_id = sp.season_id
      and lb.user_id = sp.user_id

    left join public.season_leaderboard_snapshots as sls
      on sls.season_id = sp.season_id
      and sls.user_id = sp.user_id

    where sp.user_id = p_user_id

  ) as x;


  -- ==========================================================
  -- RESULT
  -- ==========================================================

  return jsonb_build_object(
    'user_id',
      v_profile.id,

    'username',
      v_profile.username,

    'age_confirmed',
      v_profile.age_confirmed,

    'age_confirmed_at',
      v_profile.age_confirmed_at,

    'registered_at',
      v_profile.created_at,

    'updated_at',
      v_profile.updated_at,

    'staff_role',
      v_staff_role,

    'current_season',
      v_current_season,

    'season_history',
      v_season_history
  );

end;
$function$;


-- ============================================================
-- USER PREDICTIONS
-- ============================================================

create or replace function public.admin_get_user_predictions(
  p_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  prediction_id bigint,

  season_id bigint,
  season_title text,

  event_id bigint,
  event_title text,
  event_slug text,
  event_status text,

  prediction_side text,

  stake_amount bigint,
  odds_at_purchase numeric,
  potential_payout bigint,
  actual_payout bigint,

  prediction_status text,

  placed_at timestamptz,
  resolved_at timestamptz,

  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
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
  -- USER EXISTS
  -- ==========================================================

  if not exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
  ) then
    raise exception 'USER_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- PAGINATION
  -- ==========================================================

  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          50
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

  select
    p.id
      as prediction_id,

    p.season_id,

    s.title
      as season_title,

    p.event_id,

    e.title
      as event_title,

    e.slug
      as event_slug,

    e.status::text
      as event_status,

    p.prediction_side::text,

    p.stake_amount,
    p.odds_at_purchase,
    p.potential_payout,
    p.actual_payout,

    p.status::text
      as prediction_status,

    p.placed_at,
    p.resolved_at,

    count(*) over()::bigint
      as total_count

  from public.predictions as p

  join public.events as e
    on e.id = p.event_id

  join public.seasons as s
    on s.id = p.season_id

  where p.user_id = p_user_id

  order by
    p.placed_at desc,
    p.id desc

  limit v_limit
  offset v_offset;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_get_user_details(uuid)
from public;

grant execute
on function public.admin_get_user_details(uuid)
to authenticated;


revoke all
on function public.admin_get_user_predictions(
  uuid,
  integer,
  integer
)
from public;

grant execute
on function public.admin_get_user_predictions(
  uuid,
  integer,
  integer
)
to authenticated;