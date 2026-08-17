-- ============================================================
-- PREDICTION QUOTE
--
-- Предварительный серверный расчёт коэффициента и выплаты.
-- Ничего не записывает в БД.
-- Использует ту же calculate_prediction_odds(), что и
-- place_prediction().
-- ============================================================

create or replace function public.quote_prediction(
  p_event_id bigint,
  p_prediction_side public.prediction_side,
  p_stake_amount bigint
)
returns table (
  odds numeric,
  potential_payout bigint,
  yes_pool_after bigint,
  no_pool_after bigint,
  total_pool_after bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_event public.events;
  v_pool public.event_pools;

  v_max_odds numeric := 10;
  v_minimum_stake bigint := 10;

  v_odds numeric;
  v_potential_payout bigint;

  v_yes_pool_after bigint;
  v_no_pool_after bigint;
begin

  -- ==========================================================
  -- INPUT
  -- ==========================================================

  if p_event_id is null then
    raise exception
      'EVENT_ID_REQUIRED'
      using errcode = '22023';
  end if;

  if p_prediction_side is null then
    raise exception
      'PREDICTION_SIDE_REQUIRED'
      using errcode = '22023';
  end if;

  if p_stake_amount is null
     or p_stake_amount <= 0 then
    raise exception
      'INVALID_STAKE_AMOUNT'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- SETTINGS
  -- ==========================================================

  select coalesce(
    (
      select
        (value #>> '{}')::bigint
      from public.system_settings
      where key = 'prediction.minimum_stake'
      limit 1
    ),
    10
  )
  into v_minimum_stake;


  select coalesce(
    (
      select
        (value #>> '{}')::numeric
      from public.system_settings
      where key = 'prediction.max_odds'
      limit 1
    ),
    10
  )
  into v_max_odds;


  if p_stake_amount < v_minimum_stake then
    raise exception
      'MINIMUM_STAKE:%',
      v_minimum_stake
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- EVENT
  -- ==========================================================

  select *
  into v_event
  from public.events
  where id = p_event_id;


  if not found then
    raise exception
      'EVENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_event.status <> 'active' then
    raise exception
      'EVENT_NOT_ACTIVE'
      using errcode = '55000';
  end if;


  if v_event.publish_at > now() then
    raise exception
      'EVENT_NOT_PUBLISHED'
      using errcode = '55000';
  end if;


  if v_event.prediction_close_at <= now() then
    raise exception
      'PREDICTION_PERIOD_CLOSED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- POOL
  -- ==========================================================

  select *
  into v_pool
  from public.event_pools
  where event_id = p_event_id;


  if not found then
    raise exception
      'EVENT_POOL_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- CALCULATE
  -- ==========================================================

  v_odds :=
    public.calculate_prediction_odds(
      v_pool.yes_pool,
      v_pool.no_pool,
      p_prediction_side,
      p_stake_amount,
      v_max_odds
    );


  v_potential_payout :=
    greatest(
      p_stake_amount,
      floor(
        p_stake_amount::numeric
        * v_odds
      )::bigint
    );


  v_yes_pool_after :=
    v_pool.yes_pool
    +
    case
      when p_prediction_side = 'yes'
        then p_stake_amount
      else 0
    end;


  v_no_pool_after :=
    v_pool.no_pool
    +
    case
      when p_prediction_side = 'no'
        then p_stake_amount
      else 0
    end;


  return query
  select
    v_odds,
    v_potential_payout,
    v_yes_pool_after,
    v_no_pool_after,
    v_yes_pool_after
      + v_no_pool_after;

end;
$function$;


revoke all
on function public.quote_prediction(
  bigint,
  public.prediction_side,
  bigint
)
from public;


grant execute
on function public.quote_prediction(
  bigint,
  public.prediction_side,
  bigint
)
to authenticated;