-- ============================================================
-- PRIZE ELIGIBILITY
--
-- Пользователь допускается к распределению призов,
-- если участвовал минимум в N уникальных завершённых
-- событиях текущего сезона.
--
-- Несколько прогнозов на одно событие считаются как 1 событие.
-- Void / cancelled события не учитываются.
-- ============================================================


create or replace function public.get_my_prize_eligibility(
  p_season_id bigint default null
)
returns table (
  season_id bigint,
  resolved_events_count integer,
  minimum_events_required integer,
  remaining_events_count integer,
  is_eligible boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_season_id bigint;
  v_minimum_required integer;
  v_resolved_count integer;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- SEASON
  -- ==========================================================

  if p_season_id is null then

    select
      s.id,
      s.minimum_predictions_for_prize

    into
      v_season_id,
      v_minimum_required

    from public.seasons s

    where s.status = 'active'

    order by
      s.start_at desc

    limit 1;

  else

    select
      s.id,
      s.minimum_predictions_for_prize

    into
      v_season_id,
      v_minimum_required

    from public.seasons s

    where s.id =
      p_season_id;

  end if;


  if v_season_id is null then
    return;
  end if;


  -- ==========================================================
  -- UNIQUE RESOLVED EVENTS
  -- ==========================================================

  select
    count(
      distinct p.event_id
    )::integer

  into
    v_resolved_count

  from public.predictions p

  join public.events e
    on e.id =
      p.event_id

  where
    p.user_id =
      v_user_id

    and p.season_id =
      v_season_id

    and e.status =
      'resolved'

    and p.status in (
      'won',
      'lost'
    );


  v_resolved_count :=
    coalesce(
      v_resolved_count,
      0
    );


  -- ==========================================================
  -- RESULT
  -- ==========================================================

  return query

  select
    v_season_id,

    v_resolved_count,

    v_minimum_required,

    greatest(
      v_minimum_required
      - v_resolved_count,
      0
    )::integer,

    (
      v_resolved_count
      >= v_minimum_required
    );

end;
$function$;


revoke all
on function public.get_my_prize_eligibility(
  bigint
)
from public;


grant execute
on function public.get_my_prize_eligibility(
  bigint
)
to authenticated;