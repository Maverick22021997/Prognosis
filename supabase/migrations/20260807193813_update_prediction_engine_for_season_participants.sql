begin;

-- ============================================================
-- PROGNOSIS
-- Prediction Engine MVP
--
-- Перевод размещения прогнозов с устаревшей
-- user_season_stats на season_participants.
-- ============================================================


-- ============================================================
-- 1. PLACE PREDICTION
-- ============================================================

create or replace function public.place_prediction(
  p_event_id bigint,
  p_prediction_side public.prediction_side,
  p_stake_amount bigint,
  p_idempotency_key text
)
returns public.predictions
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_user_id uuid;

  v_event public.events;
  v_season public.seasons;
  v_pool public.event_pools;
  v_participant public.season_participants;
  v_prediction public.predictions;

  v_minimum_stake bigint;
  v_max_odds numeric;

  v_odds numeric(10, 4);
  v_potential_payout bigint;

  v_existing_transaction_id bigint;
  v_existing_prediction_id bigint;
begin

  -- ==========================================================
  -- 1. AUTHENTICATION
  -- ==========================================================

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- 2. INPUT VALIDATION
  -- ==========================================================

  if p_event_id is null then
    raise exception 'EVENT_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_prediction_side is null then
    raise exception 'PREDICTION_SIDE_REQUIRED'
      using errcode = '22023';
  end if;


  if p_stake_amount is null
     or p_stake_amount <= 0 then
    raise exception 'INVALID_STAKE_AMOUNT'
      using errcode = '22023';
  end if;


  if p_idempotency_key is null
     or char_length(
       btrim(p_idempotency_key)
     ) < 8 then
    raise exception 'INVALID_IDEMPOTENCY_KEY'
      using errcode = '22023';
  end if;


  if char_length(
    p_idempotency_key
  ) > 200 then
    raise exception 'IDEMPOTENCY_KEY_TOO_LONG'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- 3. CHECK USER PROFILE
  -- ==========================================================

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
  ) then
    raise exception 'PROFILE_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- 4. ACTIVE BAN CHECK
  -- ==========================================================

  if exists (
    select 1
    from public.user_bans
    where user_id = v_user_id
      and status = 'active'
      and (
        is_permanent = true
        or banned_until > now()
      )
  ) then
    raise exception 'USER_BANNED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- 5. IDEMPOTENCY
  -- ==========================================================

  select
    gp_transactions.id,
    nullif(
      gp_transactions.metadata
        ->> 'prediction_id',
      ''
    )::bigint
  into
    v_existing_transaction_id,
    v_existing_prediction_id
  from public.gp_transactions
  where gp_transactions.idempotency_key =
        p_idempotency_key
    and gp_transactions.user_id =
        v_user_id
  limit 1;


  if v_existing_transaction_id
     is not null then

    if v_existing_prediction_id
       is null then
      raise exception
        'IDEMPOTENCY_KEY_ALREADY_USED'
        using errcode = '23505';
    end if;


    select *
    into v_prediction
    from public.predictions
    where id =
          v_existing_prediction_id
      and user_id =
          v_user_id;


    if not found then
      raise exception
        'PREVIOUS_PREDICTION_NOT_FOUND'
        using errcode = 'P0002';
    end if;


    return v_prediction;

  end if;


  -- ==========================================================
  -- 6. SYSTEM SETTINGS
  -- ==========================================================

  select coalesce(
    (
      select
        (value #>> '{}')::bigint
      from public.system_settings
      where key =
        'prediction.minimum_stake'
    ),
    10
  )
  into v_minimum_stake;


  select coalesce(
    (
      select
        (value #>> '{}')::numeric
      from public.system_settings
      where key =
        'prediction.max_odds'
    ),
    10
  )
  into v_max_odds;


  if p_stake_amount <
     v_minimum_stake then
    raise exception
      'MINIMUM_STAKE_%',
      v_minimum_stake
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- 7. LOCK EVENT
  -- ==========================================================

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;


  if not found then
    raise exception 'EVENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_event.status <> 'active' then
    raise exception 'EVENT_NOT_ACTIVE'
      using errcode = '55000';
  end if;


  if now() < v_event.publish_at then
    raise exception 'EVENT_NOT_PUBLISHED'
      using errcode = '55000';
  end if;


  if now() >=
     v_event.prediction_close_at then
    raise exception
      'PREDICTION_PERIOD_CLOSED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- 8. CHECK EVENT SEASON
  -- ==========================================================

  select *
  into v_season
  from public.seasons
  where id = v_event.season_id
  for share;


  if not found then
    raise exception 'SEASON_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_season.status <> 'active' then
    raise exception 'SEASON_NOT_ACTIVE'
      using errcode = '55000';
  end if;


  if now() < v_season.start_at
     or now() >= v_season.end_at then
    raise exception 'SEASON_NOT_ACTIVE'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- 9. ONE PREDICTION PER EVENT
  -- ==========================================================

  if exists (
    select 1
    from public.predictions
    where user_id = v_user_id
      and event_id = p_event_id
  ) then
    raise exception
      'PREDICTION_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  -- ==========================================================
  -- 10. ENSURE SEASON PARTICIPANT
  -- ==========================================================

  insert into public.season_participants (
    season_id,
    user_id,
    balance_gp
  )
  values (
    v_event.season_id,
    v_user_id,
    v_season.starting_balance
  )
  on conflict (
    season_id,
    user_id
  )
  do nothing;


  -- ==========================================================
  -- 11. LOCK USER BALANCE
  -- ==========================================================

  select *
  into v_participant
  from public.season_participants
  where season_id =
        v_event.season_id
    and user_id =
        v_user_id
  for update;


  if not found then
    raise exception
      'SEASON_PARTICIPANT_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_participant.balance_gp <
     p_stake_amount then
    raise exception
      'INSUFFICIENT_GP_BALANCE'
      using errcode = '22003';
  end if;


  -- ==========================================================
  -- 12. LOCK EVENT POOL
  -- ==========================================================

  select *
  into v_pool
  from public.event_pools
  where event_id = p_event_id
  for update;


  if not found then
    raise exception
      'EVENT_POOL_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- 13. CALCULATE ODDS
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
    floor(
      p_stake_amount::numeric
      * v_odds
    )::bigint;


  v_potential_payout :=
    greatest(
      v_potential_payout,
      p_stake_amount
    );


  -- ==========================================================
  -- 14. CREATE PREDICTION
  -- ==========================================================

  insert into public.predictions (
    user_id,
    season_id,
    event_id,
    prediction_side,
    stake_amount,
    odds_at_purchase,
    potential_payout,
    status
  )
  values (
    v_user_id,
    v_event.season_id,
    p_event_id,
    p_prediction_side,
    p_stake_amount,
    v_odds,
    v_potential_payout,
    'active'
  )
  returning *
  into v_prediction;


  -- ==========================================================
  -- 15. DEDUCT GP
  -- ==========================================================

  update public.season_participants
  set
    balance_gp =
      balance_gp -
      p_stake_amount,

    predictions_count =
      predictions_count + 1

  where id =
        v_participant.id

  returning *
  into v_participant;


  -- ==========================================================
  -- 16. UPDATE EVENT POOLS
  -- ==========================================================

  update public.event_pools
  set

    yes_pool =
      yes_pool
      +
      case
        when p_prediction_side = 'yes'
          then p_stake_amount
        else 0
      end,

    no_pool =
      no_pool
      +
      case
        when p_prediction_side = 'no'
          then p_stake_amount
        else 0
      end

  where event_id =
        p_event_id;


  -- ==========================================================
  -- 17. UPDATE EVENT COUNTERS
  -- ==========================================================

  update public.events
  set
    predictions_count =
      predictions_count + 1,

    volume_gp =
      volume_gp +
      p_stake_amount

  where id =
        p_event_id;


  -- ==========================================================
  -- 18. GP TRANSACTION
  -- ==========================================================

  insert into public.gp_transactions (
    user_id,
    season_id,
    prediction_id,
    event_id,
    transaction_type,

    amount_available,
    amount_locked,

    balance_available_after,
    balance_locked_after,

    idempotency_key,
    description,
    metadata
  )
  values (
    v_user_id,
    v_event.season_id,
    v_prediction.id,
    p_event_id,
    'prediction_stake',

    -p_stake_amount,
    0,

    v_participant.balance_gp,
    0,

    p_idempotency_key,

    'GP списаны при размещении прогноза.',

    jsonb_build_object(
      'prediction_id',
        v_prediction.id,

      'event_id',
        p_event_id,

      'prediction_side',
        p_prediction_side,

      'stake_amount',
        p_stake_amount,

      'odds_at_purchase',
        v_odds,

      'potential_payout',
        v_potential_payout
    )
  );


  -- ==========================================================
  -- 19. RETURN RESULT
  -- ==========================================================

  return v_prediction;

end;
$$;


-- ============================================================
-- Permissions
-- ============================================================

revoke all
on function public.place_prediction(
  bigint,
  public.prediction_side,
  bigint,
  text
)
from public;


grant execute
on function public.place_prediction(
  bigint,
  public.prediction_side,
  bigint,
  text
)
to authenticated;


commit;