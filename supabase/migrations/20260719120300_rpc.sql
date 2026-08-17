begin;

-- ============================================================
-- PROGNOSIS
-- Protected RPC functions and business logic
-- ============================================================
-- ============================================================
-- 1. SEASON HELPERS
-- ============================================================


-- ------------------------------------------------------------
-- Return the currently active season
-- ------------------------------------------------------------

create or replace function public.get_active_season()
returns public.seasons
language sql
stable
security definer
set search_path = ''
as
$$
  select seasons.*
  from public.seasons
  where seasons.status::text = 'active'
    and seasons.start_at <= now()
    and seasons.end_at > now()
  order by seasons.start_at desc
  limit 1;
$$;
revoke all on function public.get_active_season()
  from public;


grant execute on function public.get_active_season()
  to anon, authenticated;
  -- ============================================================
-- 2. PROFILE CREATION
-- ============================================================


-- ------------------------------------------------------------
-- Create a public profile after authentication signup
-- ------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_requested_nickname text;
  v_base_nickname text;
  v_final_nickname text;
  v_suffix integer := 0;
begin
  v_requested_nickname :=
    nullif(
      btrim(new.raw_user_meta_data ->> 'nickname'),
      ''
    );

  if v_requested_nickname is null then
    v_base_nickname :=
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  else
    v_base_nickname :=
      left(v_requested_nickname, 30);
  end if;

  if char_length(v_base_nickname) < 3 then
    v_base_nickname :=
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  v_final_nickname := v_base_nickname;

  while exists (
    select 1
    from public.profiles
    where lower(btrim(nickname)) = lower(btrim(v_final_nickname))
  )
  loop
    v_suffix := v_suffix + 1;

    v_final_nickname :=
      left(
        v_base_nickname,
        greatest(3, 30 - char_length(v_suffix::text) - 1)
      )
      || '_'
      || v_suffix::text;
  end loop;

  insert into public.profiles (
    id,
    nickname,
    avatar_url,
    role,
    reputation
  )
  values (
    new.id,
    v_final_nickname,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'user',
    0
  );

  return new;
end;
$$;
drop trigger if exists trg_auth_user_created
  on auth.users;


create trigger trg_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user()
  from public;
  revoke all on function public.handle_new_auth_user()
  from public;
  -- ============================================================
-- 3. SEASON PARTICIPATION
-- ============================================================


-- ------------------------------------------------------------
-- Ensure that a user has seasonal statistics
-- ------------------------------------------------------------

create or replace function public.ensure_user_season_stats(
  p_user_id uuid,
  p_season_id bigint
)
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_season public.seasons;
  v_stats public.user_season_stats;
begin
  select *
  into v_season
  from public.seasons
  where id = p_season_id;

  if not found then
    raise exception 'Season not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
  ) then
    raise exception 'User profile not found'
      using errcode = 'P0002';
  end if;

  insert into public.user_season_stats (
    user_id,
    season_id,
    gp_balance,
    gp_locked,
    capital_reached_at
  )
  values (
    p_user_id,
    p_season_id,
    v_season.starting_balance,
    0,
    now()
  )
  on conflict (user_id, season_id)
  do nothing;

  select *
  into v_stats
  from public.user_season_stats
  where user_id = p_user_id
    and season_id = p_season_id;

  return v_stats;
end;
$$;
revoke all on function public.ensure_user_season_stats(
  uuid,
  bigint
)
from public;
-- ------------------------------------------------------------
-- Join the authenticated user to the active season
-- ------------------------------------------------------------

create or replace function public.join_active_season()
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_user_id uuid;
  v_active_season public.seasons;
  v_stats public.user_season_stats;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into v_active_season
  from public.get_active_season();

  if v_active_season.id is null then
    raise exception 'No active season'
      using errcode = 'P0002';
  end if;

  v_stats :=
    public.ensure_user_season_stats(
      v_user_id,
      v_active_season.id
    );

  return v_stats;
end;
$$;
revoke all on function public.join_active_season()
  from public;


grant execute on function public.join_active_season()
  to authenticated;
  -- ------------------------------------------------------------
-- Return current user statistics for the active season
-- ------------------------------------------------------------

create or replace function public.get_my_active_season_stats()
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_user_id uuid;
  v_active_season public.seasons;
  v_stats public.user_season_stats;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into v_active_season
  from public.get_active_season();

  if v_active_season.id is null then
    return null;
  end if;

  select *
  into v_stats
  from public.user_season_stats
  where user_id = v_user_id
    and season_id = v_active_season.id;

  return v_stats;
end;
$$;
revoke all on function public.get_my_active_season_stats()
  from public;


grant execute on function public.get_my_active_season_stats()
  to authenticated;
  -- ============================================================
-- 4. PREDICTION ODDS
-- ============================================================


-- ------------------------------------------------------------
-- Calculate prediction odds after adding the user's stake
-- ------------------------------------------------------------

create or replace function public.calculate_prediction_odds(
  p_yes_pool bigint,
  p_no_pool bigint,
  p_prediction_side public.prediction_side,
  p_stake_amount bigint,
  p_max_odds numeric default 10
)
returns numeric(10, 4)
language plpgsql
immutable
security invoker
set search_path = ''
as
$$
declare
  v_yes_pool_after bigint;
  v_no_pool_after bigint;
  v_total_pool_after bigint;
  v_selected_pool_after bigint;
  v_odds numeric;
begin
  if p_yes_pool <= 0 or p_no_pool <= 0 then
    raise exception 'Event pools must be positive'
      using errcode = '22023';
  end if;

  if p_stake_amount <= 0 then
    raise exception 'Stake amount must be positive'
      using errcode = '22023';
  end if;

  if p_max_odds < 1 then
    raise exception 'Maximum odds must be at least 1'
      using errcode = '22023';
  end if;

  v_yes_pool_after :=
    p_yes_pool
    + case
        when p_prediction_side = 'yes' then p_stake_amount
        else 0
      end;

  v_no_pool_after :=
    p_no_pool
    + case
        when p_prediction_side = 'no' then p_stake_amount
        else 0
      end;

  v_total_pool_after :=
    v_yes_pool_after + v_no_pool_after;

  v_selected_pool_after :=
    case
      when p_prediction_side = 'yes' then v_yes_pool_after
      else v_no_pool_after
    end;

  v_odds :=
    v_total_pool_after::numeric
    / v_selected_pool_after::numeric;

  v_odds :=
    least(
      greatest(v_odds, 1::numeric),
      p_max_odds
    );

  return round(v_odds, 4);
end;
$$;
revoke all on function public.calculate_prediction_odds(
  bigint,
  bigint,
  public.prediction_side,
  bigint,
  numeric
)
from public;
-- ============================================================
-- 5. PLACE PREDICTION
-- ============================================================


-- ------------------------------------------------------------
-- Place a prediction for the authenticated user
-- ------------------------------------------------------------

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
  v_pool public.event_pools;
  v_stats public.user_season_stats;
  v_prediction public.predictions;

  v_minimum_stake bigint;
  v_max_odds numeric;

  v_odds numeric(10, 4);
  v_potential_payout bigint;

  v_existing_transaction_id bigint;
  v_existing_prediction_id bigint;
begin
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;


  -- ----------------------------------------------------------
  -- Basic request validation
  -- ----------------------------------------------------------

  if p_event_id is null then
    raise exception 'Event ID is required'
      using errcode = '22023';
  end if;

  if p_prediction_side is null then
    raise exception 'Prediction side is required'
      using errcode = '22023';
  end if;

  if p_stake_amount is null or p_stake_amount <= 0 then
    raise exception 'Stake amount must be positive'
      using errcode = '22023';
  end if;

  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) < 8 then
    raise exception 'Valid idempotency key is required'
      using errcode = '22023';
  end if;

  if char_length(p_idempotency_key) > 200 then
    raise exception 'Idempotency key is too long'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Idempotency check
  -- ----------------------------------------------------------

  select
    gp_transactions.id,
    nullif(
      gp_transactions.metadata ->> 'prediction_id',
      ''
    )::bigint
  into
    v_existing_transaction_id,
    v_existing_prediction_id
  from public.gp_transactions
  where gp_transactions.idempotency_key = p_idempotency_key
    and gp_transactions.user_id = v_user_id
  limit 1;

  if v_existing_transaction_id is not null then
    if v_existing_prediction_id is null then
      raise exception 'Idempotency key has already been used'
        using errcode = '23505';
    end if;

    select *
    into v_prediction
    from public.predictions
    where id = v_existing_prediction_id
      and user_id = v_user_id;

    if v_prediction.id is null then
      raise exception 'Previous prediction result was not found'
        using errcode = 'P0002';
    end if;

    return v_prediction;
  end if;


  -- ----------------------------------------------------------
  -- Read system settings
  -- ----------------------------------------------------------

  select coalesce(
    (
      select value::text::bigint
      from public.system_settings
      where key = 'prediction.minimum_stake'
    ),
    10
  )
  into v_minimum_stake;

  select coalesce(
    (
      select value::text::numeric
      from public.system_settings
      where key = 'prediction.max_odds'
    ),
    10
  )
  into v_max_odds;

  if p_stake_amount < v_minimum_stake then
    raise exception
      'Minimum stake is % GP',
      v_minimum_stake
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Lock and validate event
  -- ----------------------------------------------------------

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;

  if v_event.status <> 'active' then
    raise exception 'Event is not open for predictions'
      using errcode = '55000';
  end if;

  if now() < v_event.publish_at then
    raise exception 'Event has not been published yet'
      using errcode = '55000';
  end if;

  if now() >= v_event.prediction_close_at then
    raise exception 'Prediction period has already closed'
      using errcode = '55000';
  end if;


  -- ----------------------------------------------------------
  -- Check for an existing prediction
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.predictions
    where user_id = v_user_id
      and event_id = p_event_id
  ) then
    raise exception 'Prediction for this event already exists'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Ensure seasonal participation
  -- ----------------------------------------------------------

  perform public.ensure_user_season_stats(
    v_user_id,
    v_event.season_id
  );


  -- ----------------------------------------------------------
  -- Lock the user's seasonal balance
  -- ----------------------------------------------------------

  select *
  into v_stats
  from public.user_season_stats
  where user_id = v_user_id
    and season_id = v_event.season_id
  for update;

  if not found then
    raise exception 'Seasonal statistics were not created'
      using errcode = 'P0002';
  end if;

  if v_stats.gp_balance < p_stake_amount then
    raise exception 'Insufficient GP balance'
      using errcode = '22003';
  end if;


  -- ----------------------------------------------------------
  -- Lock the event pool
  -- ----------------------------------------------------------

  select *
  into v_pool
  from public.event_pools
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Event pool not found'
      using errcode = 'P0002';
  end if;


  -- ----------------------------------------------------------
  -- Calculate odds and payout
  -- ----------------------------------------------------------

  v_odds := public.calculate_prediction_odds(
    v_pool.yes_pool,
    v_pool.no_pool,
    p_prediction_side,
    p_stake_amount,
    v_max_odds
  );

  v_potential_payout :=
    floor(p_stake_amount::numeric * v_odds)::bigint;

  v_potential_payout :=
    greatest(
      v_potential_payout,
      p_stake_amount
    );


  -- ----------------------------------------------------------
  -- Create prediction
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Update user balance
  -- ----------------------------------------------------------

  update public.user_season_stats
  set
    gp_balance = gp_balance - p_stake_amount,
    gp_locked = gp_locked + p_stake_amount,
    predictions_count = predictions_count + 1
  where id = v_stats.id
  returning *
  into v_stats;


  -- ----------------------------------------------------------
  -- Update event pool
  -- ----------------------------------------------------------

  update public.event_pools
  set
    yes_pool =
      yes_pool
      + case
          when p_prediction_side = 'yes'
            then p_stake_amount
          else 0
        end,

    no_pool =
      no_pool
      + case
          when p_prediction_side = 'no'
            then p_stake_amount
          else 0
        end
  where event_id = p_event_id;


  -- ----------------------------------------------------------
  -- Update event counters
  -- ----------------------------------------------------------

  update public.events
  set
    predictions_count = predictions_count + 1,
    volume_gp = volume_gp + p_stake_amount
  where id = p_event_id;


  -- ----------------------------------------------------------
  -- Write immutable GP ledger record
  -- ----------------------------------------------------------

  insert into public.gp_transactions (
    user_id,
    season_id,
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
    'prediction_stake',
    -p_stake_amount,
    p_stake_amount,
    v_stats.gp_balance,
    v_stats.gp_locked,
    p_idempotency_key,
    'GP заблокированы для участия в прогнозе.',
    jsonb_build_object(
      'prediction_id', v_prediction.id,
      'event_id', p_event_id,
      'prediction_side', p_prediction_side,
      'stake_amount', p_stake_amount,
      'odds_at_purchase', v_odds,
      'potential_payout', v_potential_payout
    )
  );


  return v_prediction;
end;
$$;
revoke all on function public.place_prediction(
  bigint,
  public.prediction_side,
  bigint,
  text
)
from public;


grant execute on function public.place_prediction(
  bigint,
  public.prediction_side,
  bigint,
  text
)
to authenticated;
-- ============================================================
-- 6. EVENT RESOLUTION
-- ============================================================


-- ------------------------------------------------------------
-- Resolve an event with a YES or NO result
-- ------------------------------------------------------------

create or replace function public.resolve_event(
  p_event_id bigint,
  p_result public.prediction_side
)
returns public.events
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_staff_user_id uuid;
  v_event public.events;
  v_prediction public.predictions;
  v_stats public.user_season_stats;

  v_previous_status public.event_status;
begin
  -- ----------------------------------------------------------
  -- Authentication and staff authorization
  -- ----------------------------------------------------------

  v_staff_user_id := auth.uid();

  if v_staff_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Staff access required'
      using errcode = '42501';
  end if;


  -- ----------------------------------------------------------
  -- Validate input
  -- ----------------------------------------------------------

  if p_event_id is null then
    raise exception 'Event ID is required'
      using errcode = '22023';
  end if;

  if p_result is null then
    raise exception 'Event result is required'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Lock the event
  -- ----------------------------------------------------------

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;


  -- ----------------------------------------------------------
  -- Check event status
  -- ----------------------------------------------------------

  if v_event.status = 'resolved' then
    raise exception 'Event has already been resolved'
      using errcode = '55000';
  end if;

  if v_event.status in ('cancelled', 'void') then
    raise exception 'Cancelled or void event cannot be resolved'
      using errcode = '55000';
  end if;

  if v_event.status not in (
    'active',
    'closed',
    'resolving'
  ) then
    raise exception
      'Event cannot be resolved from its current status'
      using errcode = '55000';
  end if;

  if now() < v_event.prediction_close_at then
    raise exception
      'Event cannot be resolved before predictions close'
      using errcode = '55000';
  end if;

  v_previous_status := v_event.status;

  -- ----------------------------------------------------------
  -- Temporarily mark event as resolving
  -- ----------------------------------------------------------

  update public.events
  set status = 'resolving'
  where id = p_event_id;


  -- ----------------------------------------------------------
  -- Process every active prediction
  -- ----------------------------------------------------------

  for v_prediction in
    select predictions.*
    from public.predictions
    where predictions.event_id = p_event_id
      and predictions.status = 'active'
    order by predictions.id
    for update
  loop

    -- --------------------------------------------------------
    -- Lock the user's seasonal statistics
    -- --------------------------------------------------------

    select *
    into v_stats
    from public.user_season_stats
    where user_id = v_prediction.user_id
      and season_id = v_prediction.season_id
    for update;

    if not found then
      raise exception
        'Seasonal statistics not found for prediction %',
        v_prediction.id
        using errcode = 'P0002';
    end if;


    -- --------------------------------------------------------
    -- Winning prediction
    -- --------------------------------------------------------

    if v_prediction.prediction_side = p_result then

      update public.user_season_stats
      set
        gp_balance =
          gp_balance + v_prediction.potential_payout,

        gp_locked =
          gp_locked - v_prediction.stake_amount,

        resolved_predictions_count =
          resolved_predictions_count + 1,

        correct_predictions_count =
          correct_predictions_count + 1,

        current_streak =
          current_streak + 1,

        best_streak =
          greatest(
            best_streak,
            current_streak + 1
          ),

        capital_reached_at = now()
      where id = v_stats.id
      returning *
      into v_stats;


      update public.predictions
      set
        status = 'won',
        actual_payout = v_prediction.potential_payout,
        resolved_at = now()
      where id = v_prediction.id;


      insert into public.gp_transactions (
        user_id,
        season_id,
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
        v_prediction.user_id,
        v_prediction.season_id,
        'prediction_win',
        v_prediction.potential_payout,
        -v_prediction.stake_amount,
        v_stats.gp_balance,
        v_stats.gp_locked,
        'prediction_resolution:'
          || v_prediction.id::text,
        'Начисление выигрыша по правильному прогнозу.',
        jsonb_build_object(
          'prediction_id', v_prediction.id,
          'event_id', p_event_id,
          'event_result', p_result,
          'prediction_side', v_prediction.prediction_side,
          'stake_amount', v_prediction.stake_amount,
          'odds_at_purchase', v_prediction.odds_at_purchase,
          'actual_payout', v_prediction.potential_payout
        )
      );


    -- --------------------------------------------------------
    -- Losing prediction
    -- --------------------------------------------------------

    else

      update public.user_season_stats
      set
        gp_locked =
          gp_locked - v_prediction.stake_amount,

        resolved_predictions_count =
          resolved_predictions_count + 1,

        current_streak = 0,

        capital_reached_at = now()
      where id = v_stats.id
      returning *
      into v_stats;


      update public.predictions
      set
        status = 'lost',
        actual_payout = 0,
        resolved_at = now()
      where id = v_prediction.id;


      insert into public.gp_transactions (
        user_id,
        season_id,
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
        v_prediction.user_id,
        v_prediction.season_id,
        'prediction_loss',
        0,
        -v_prediction.stake_amount,
        v_stats.gp_balance,
        v_stats.gp_locked,
        'prediction_resolution:'
          || v_prediction.id::text,
        'Списание ставки по неправильному прогнозу.',
        jsonb_build_object(
          'prediction_id', v_prediction.id,
          'event_id', p_event_id,
          'event_result', p_result,
          'prediction_side', v_prediction.prediction_side,
          'stake_amount', v_prediction.stake_amount,
          'actual_payout', 0
        )
      );

    end if;

  end loop;


  -- ----------------------------------------------------------
  -- Complete event resolution
  -- ----------------------------------------------------------

  update public.events
  set
    status = 'resolved',
    result = p_result,
    resolved_at = now(),
    resolved_by = v_staff_user_id
  where id = p_event_id
  returning *
  into v_event;


    -- ----------------------------------------------------------
  -- Write audit record
  -- ----------------------------------------------------------

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_staff_user_id,
    'event_resolved',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'status', v_previous_status,
      'result', null
    ),
    jsonb_build_object(
      'status', v_event.status,
      'result', v_event.result,
      'resolved_at', v_event.resolved_at,
      'resolved_by', v_event.resolved_by
    ),
    jsonb_build_object(
      'predictions_count', v_event.predictions_count,
      'volume_gp', v_event.volume_gp
    )
  );

    return v_event;
end;
$$;


revoke all on function public.resolve_event(
  bigint,
  public.prediction_side
)
from public;


grant execute on function public.resolve_event(
  bigint,
  public.prediction_side
)
to authenticated;


-- ============================================================
-- 7. VOID EVENT AND REFUND PREDICTIONS
-- ============================================================

create or replace function public.void_event(
  p_event_id bigint,
  p_reason text
)
returns public.events
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_staff_user_id uuid;

  v_event public.events;
  v_prediction public.predictions;
  v_stats public.user_season_stats;

  v_previous_status public.event_status;

  v_refunded_predictions_count bigint := 0;
  v_refunded_gp_total bigint := 0;
begin
  -- ----------------------------------------------------------
  -- Authentication and staff authorization
  -- ----------------------------------------------------------

  v_staff_user_id := auth.uid();

  if v_staff_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Staff access required'
      using errcode = '42501';
  end if;

  -- ----------------------------------------------------------
  -- Validate input
  -- ----------------------------------------------------------

  if p_event_id is null then
    raise exception 'Event ID is required'
      using errcode = '22023';
  end if;

  if p_reason is null
     or char_length(btrim(p_reason)) < 3 then
    raise exception 'Void reason must contain at least 3 characters'
      using errcode = '22023';
  end if;

  if char_length(btrim(p_reason)) > 1000 then
    raise exception 'Void reason is too long'
      using errcode = '22023';
  end if;

  p_reason := btrim(p_reason);

  -- ----------------------------------------------------------
  -- Lock the event
  -- ----------------------------------------------------------

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;

  -- ----------------------------------------------------------
  -- Validate event status
  -- ----------------------------------------------------------

  if v_event.status = 'resolved' then
    raise exception 'Resolved event cannot be voided'
      using errcode = '55000';
  end if;

  if v_event.status = 'void' then
    raise exception 'Event has already been voided'
      using errcode = '55000';
  end if;

  if v_event.status = 'cancelled' then
    raise exception 'Cancelled event cannot be voided'
      using errcode = '55000';
  end if;

  if v_event.status not in (
    'scheduled',
    'active',
    'closed',
    'resolving'
  ) then
    raise exception
      'Event cannot be voided from its current status'
      using errcode = '55000';
  end if;

  v_previous_status := v_event.status;

  -- ----------------------------------------------------------
  -- Prevent new predictions during refund processing
  -- ----------------------------------------------------------

  update public.events
  set status = 'resolving'
  where id = p_event_id;

  -- ----------------------------------------------------------
  -- Refund every active prediction
  -- ----------------------------------------------------------

  for v_prediction in
    select predictions.*
    from public.predictions
    where predictions.event_id = p_event_id
      and predictions.status = 'active'
    order by predictions.id
    for update
  loop
    -- --------------------------------------------------------
    -- Lock the user's seasonal statistics
    -- --------------------------------------------------------

    select *
    into v_stats
    from public.user_season_stats
    where user_id = v_prediction.user_id
      and season_id = v_prediction.season_id
    for update;

    if not found then
      raise exception
        'Seasonal statistics not found for prediction %',
        v_prediction.id
        using errcode = 'P0002';
    end if;

    if v_stats.gp_locked < v_prediction.stake_amount then
      raise exception
        'Locked balance is insufficient for prediction %',
        v_prediction.id
        using errcode = '22003';
    end if;

    -- --------------------------------------------------------
    -- Return locked GP to the available balance
    -- --------------------------------------------------------

    update public.user_season_stats
    set
      gp_balance =
        gp_balance + v_prediction.stake_amount,

      gp_locked =
        gp_locked - v_prediction.stake_amount
    where id = v_stats.id
    returning *
    into v_stats;

    -- --------------------------------------------------------
    -- Mark prediction as refunded
    -- --------------------------------------------------------

    update public.predictions
    set
      status = 'refunded',
      actual_payout = v_prediction.stake_amount,
      resolved_at = now()
    where id = v_prediction.id;

    -- --------------------------------------------------------
    -- Write immutable GP ledger record
    -- --------------------------------------------------------

    insert into public.gp_transactions (
      user_id,
      season_id,
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
      v_prediction.user_id,
      v_prediction.season_id,
      'prediction_refund',
      v_prediction.stake_amount,
      -v_prediction.stake_amount,
      v_stats.gp_balance,
      v_stats.gp_locked,
      'prediction_refund:' || v_prediction.id::text,
      'Возврат ставки в связи с аннулированием события.',
      jsonb_build_object(
        'prediction_id', v_prediction.id,
        'event_id', p_event_id,
        'stake_amount', v_prediction.stake_amount,
        'void_reason', p_reason
      )
    );

    v_refunded_predictions_count :=
      v_refunded_predictions_count + 1;

    v_refunded_gp_total :=
      v_refunded_gp_total + v_prediction.stake_amount;
  end loop;

  -- ----------------------------------------------------------
  -- Complete event voiding
  -- ----------------------------------------------------------

  update public.events
  set
    status = 'void',
    result = null,
    resolved_at = now(),
    resolved_by = v_staff_user_id
  where id = p_event_id
  returning *
  into v_event;

  -- ----------------------------------------------------------
  -- Write audit record
  -- ----------------------------------------------------------

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_staff_user_id,
    'event_voided',
    'event',
    p_event_id::text,

    jsonb_build_object(
      'status', v_previous_status,
      'result', null
    ),

    jsonb_build_object(
      'status', v_event.status,
      'result', v_event.result,
      'resolved_at', v_event.resolved_at,
      'resolved_by', v_event.resolved_by
    ),

    jsonb_build_object(
      'reason', p_reason,
      'refunded_predictions_count',
        v_refunded_predictions_count,
      'refunded_gp_total',
        v_refunded_gp_total
    )
  );

  return v_event;
end;
$$;

revoke all
on function public.void_event(bigint, text)
from public;

grant execute
on function public.void_event(bigint, text)
to authenticated;


-- ============================================================
-- 8. CLOSE EVENT
-- ============================================================


-- ------------------------------------------------------------
-- Close an active event for new predictions
-- ------------------------------------------------------------
create or replace function public.close_event(
  p_event_id bigint,
  p_reason text default null
)
returns public.events
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_staff_user_id uuid;
  v_event public.events;

  v_previous_status public.event_status;
  v_close_reason text;
begin
  -- ----------------------------------------------------------
  -- Authentication and staff authorization
  -- ----------------------------------------------------------

  v_staff_user_id := auth.uid();

  if v_staff_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Staff access required'
      using errcode = '42501';
  end if;
    -- ----------------------------------------------------------
  -- Validate input
  -- ----------------------------------------------------------

  if p_event_id is null then
    raise exception 'Event ID is required'
      using errcode = '22023';
  end if;
    if p_reason is not null then
    v_close_reason := btrim(p_reason);

    if char_length(v_close_reason) = 0 then
      v_close_reason := null;
    end if;

    if v_close_reason is not null
       and char_length(v_close_reason) > 1000 then
      raise exception 'Close reason is too long'
        using errcode = '22023';
    end if;
  else
    v_close_reason := null;
  end if;
    -- ----------------------------------------------------------
  -- Lock the event
  -- ----------------------------------------------------------

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Validate event status
  -- ----------------------------------------------------------

  if v_event.status = 'closed' then
    return v_event;
  end if;

  if v_event.status = 'resolved' then
    raise exception 'Resolved event cannot be closed'
      using errcode = '55000';
  end if;

  if v_event.status in ('cancelled', 'void') then
    raise exception 'Cancelled or void event cannot be closed'
      using errcode = '55000';
  end if;

  if v_event.status = 'resolving' then
    raise exception 'Event is currently being resolved'
      using errcode = '55000';
  end if;

  if v_event.status <> 'active' then
    raise exception 'Only an active event can be closed'
      using errcode = '55000';
  end if;

  v_previous_status := v_event.status;
    -- ----------------------------------------------------------
  -- Close event
  -- ----------------------------------------------------------

  update public.events
  set
    status = 'closed'
  where id = p_event_id
  returning *
  into v_event;
    -- ----------------------------------------------------------
  -- Write audit record
  -- ----------------------------------------------------------

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_staff_user_id,
    'event_closed',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'status', v_previous_status
    ),
    jsonb_build_object(
      'status', v_event.status
    ),
    jsonb_build_object(
      'reason', v_close_reason,
      'prediction_close_at', v_event.prediction_close_at,
      'predictions_count', v_event.predictions_count,
      'volume_gp', v_event.volume_gp
    )
  );
    return v_event;
end;
$$;
revoke all on function public.close_event(
  bigint,
  text
)
from public;


grant execute on function public.close_event(
  bigint,
  text
)
to authenticated;

-- ============================================================
-- 9. OPEN EVENT
-- ============================================================


-- ------------------------------------------------------------
-- Open event for predictions
-- ------------------------------------------------------------
create or replace function public.open_event(
  p_event_id bigint,
  p_reason text default null
)
returns public.events
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_staff_user_id uuid;
  v_event public.events;

  v_previous_status public.event_status;
  v_open_reason text;
begin
  -- ----------------------------------------------------------
  -- Authentication and staff authorization
  -- ----------------------------------------------------------

  v_staff_user_id := auth.uid();

  if v_staff_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Staff access required'
      using errcode = '42501';
  end if;
    -- ----------------------------------------------------------
  -- Validate input
  -- ----------------------------------------------------------

  if p_event_id is null then
    raise exception 'Event ID is required'
      using errcode = '22023';
  end if;
    if p_reason is not null then
    v_open_reason := btrim(p_reason);

    if char_length(v_open_reason) = 0 then
      v_open_reason := null;
    end if;

    if v_open_reason is not null
       and char_length(v_open_reason) > 1000 then
      raise exception 'Open reason is too long'
        using errcode = '22023';
    end if;
  else
    v_open_reason := null;
  end if;
    -- ----------------------------------------------------------
  -- Lock the event
  -- ----------------------------------------------------------

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Validate event status
  -- ----------------------------------------------------------

  if v_event.status = 'active' then
    return v_event;
  end if;

  if v_event.status in ('resolved', 'void', 'cancelled') then
    raise exception 'Event cannot be opened'
      using errcode = '55000';
  end if;

  if v_event.status not in ('scheduled', 'closed') then
    raise exception 'Only scheduled or closed events can be opened'
      using errcode = '55000';
  end if;

  v_previous_status := v_event.status;
    -- ----------------------------------------------------------
  -- Open event
  -- ----------------------------------------------------------

  update public.events
  set
    status = 'active'
  where id = p_event_id
  returning *
  into v_event;
    -- ----------------------------------------------------------
  -- Write audit record
  -- ----------------------------------------------------------

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_staff_user_id,
    'event_opened',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'status', v_previous_status
    ),
    jsonb_build_object(
      'status', v_event.status
    ),
    jsonb_build_object(
      'reason', v_open_reason
    )
  );
    return v_event;
end;
$$;
revoke all on function public.open_event(
  bigint,
  text
)
from public;


grant execute on function public.open_event(
  bigint,
  text
)
to authenticated;

-- ============================================================
-- 10. AUTOMATIC EVENT CLOSING
-- ============================================================


-- ------------------------------------------------------------
-- Close active events whose prediction deadline has passed
-- ------------------------------------------------------------
create or replace function public.close_expired_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_event public.events;
  v_closed_count bigint := 0;
begin
  -- ----------------------------------------------------------
  -- Authorization
  -- ----------------------------------------------------------

  if auth.uid() is not null
     and not public.is_staff() then
    raise exception 'Staff access required'
      using errcode = '42501';
  end if;
   -- ----------------------------------------------------------
  -- Find and lock expired active events
  -- ----------------------------------------------------------

  for v_event in
    select events.*
    from public.events
    where events.status = 'active'
      and events.prediction_close_at is not null
      and events.prediction_close_at <= now()
    order by events.id
    for update skip locked
  loop
      -- --------------------------------------------------------
    -- Close event
    -- --------------------------------------------------------

    update public.events
    set
      status = 'closed'
    where id = v_event.id; 
        -- --------------------------------------------------------
    -- Write audit record
    -- --------------------------------------------------------

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      metadata
    )
    values (
      null,
      'event_closed_automatically',
      'event',
      v_event.id::text,
      jsonb_build_object(
        'status', v_event.status
      ),
      jsonb_build_object(
        'status', 'closed'
      ),
      jsonb_build_object(
        'prediction_close_at', v_event.prediction_close_at,
        'processed_at', now(),
        'predictions_count', v_event.predictions_count,
        'volume_gp', v_event.volume_gp
      )
    );
        v_closed_count := v_closed_count + 1;

  end loop;
    return v_closed_count;
end;
$$;
revoke all on function public.close_expired_events()
from public;


grant execute on function public.close_expired_events()
to service_role;


-- ============================================================
-- 11. INITIALIZE USER SEASON
-- ============================================================


-- ------------------------------------------------------------
-- Initialize seasonal balance for the authenticated user
-- ------------------------------------------------------------
create or replace function public.initialize_user_season()
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_user_id uuid;
  v_season public.seasons;
  v_stats public.user_season_stats;
begin
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
    -- ----------------------------------------------------------
  -- Find active season
  -- ----------------------------------------------------------

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by id desc
  limit 1;

  if not found then
    raise exception 'Active season not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Return existing seasonal statistics
  -- ----------------------------------------------------------

  select *
  into v_stats
  from public.user_season_stats
  where user_id = v_user_id
    and season_id = v_season.id;

  if found then
    return v_stats;
  end if;
    -- ----------------------------------------------------------
  -- Create seasonal statistics
  -- ----------------------------------------------------------

  insert into public.user_season_stats (
    user_id,
    season_id,
    gp_balance,
    gp_locked,
    predictions_count,
    resolved_predictions_count,
    correct_predictions_count,
    current_streak,
    best_streak,
    emergency_bonus_used,
    capital_reached_at
  )
  values (
    v_user_id,
    v_season.id,
    v_season.starting_balance,
    0,
    0,
    0,
    0,
    0,
    0,
    false,
    now()
  )
  returning *
  into v_stats;
    -- ----------------------------------------------------------
  -- Write immutable GP ledger record
  -- ----------------------------------------------------------

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
    v_season.id,
    null,
    null,
    'season_initial_balance',
    v_season.starting_balance,
    0,
    v_stats.gp_balance,
    v_stats.gp_locked,
    'season_initial:' || v_season.id::text || ':' || v_user_id::text,
    'Начисление стартового баланса сезона.',
    jsonb_build_object(
      'season_id', v_season.id,
      'season_title', v_season.title,
      'starting_balance', v_season.starting_balance
    )
  );
    return v_stats;
end;
$$;
revoke all on function public.initialize_user_season()
from public;


grant execute on function public.initialize_user_season()
to authenticated;


-- ============================================================
-- 12. CLAIM EMERGENCY BONUS
-- ============================================================


-- ------------------------------------------------------------
-- Claim the emergency GP bonus
-- ------------------------------------------------------------
create or replace function public.claim_emergency_bonus()
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_user_id uuid;
  v_season public.seasons;
  v_stats public.user_season_stats;

  v_bonus_amount bigint;
  v_limit_per_season integer;

  v_idempotency_key text;
begin
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;
    -- ----------------------------------------------------------
  -- Find active season
  -- ----------------------------------------------------------

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by id desc
  limit 1;

  if not found then
    raise exception 'Active season not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Read emergency bonus amount
  -- ----------------------------------------------------------

  select (value #>> '{}')::bigint
  into v_bonus_amount
  from public.system_settings
  where key = 'bonus.emergency.amount';

  if not found then
    raise exception 'Emergency bonus amount setting not found'
      using errcode = 'P0002';
  end if;

  if v_bonus_amount <= 0 then
    raise exception 'Emergency bonus amount must be positive'
      using errcode = '22023';
  end if;
    -- ----------------------------------------------------------
  -- Read emergency bonus limit
  -- ----------------------------------------------------------

  select (value #>> '{}')::integer
  into v_limit_per_season
  from public.system_settings
  where key = 'bonus.emergency.limit_per_season';

  if not found then
    raise exception 'Emergency bonus limit setting not found'
      using errcode = 'P0002';
  end if;

  if v_limit_per_season <> 1 then
    raise exception 'Emergency bonus limit must equal 1'
      using errcode = '22023';
  end if;
    -- ----------------------------------------------------------
  -- Ensure seasonal statistics exist
  -- ----------------------------------------------------------

  perform public.initialize_user_season();
    -- ----------------------------------------------------------
  -- Lock seasonal statistics
  -- ----------------------------------------------------------

  select *
  into v_stats
  from public.user_season_stats
  where user_id = v_user_id
    and season_id = v_season.id
  for update;

  if not found then
    raise exception 'User season statistics not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Validate emergency bonus availability
  -- ----------------------------------------------------------

  if v_stats.emergency_bonus_used then
    raise exception 'Emergency bonus has already been used this season'
      using errcode = '55000';
  end if;
    if v_stats.gp_balance <> 0 then
    raise exception 'Emergency bonus is available only when GP balance is zero'
      using errcode = '55000';
  end if;
    if v_stats.gp_locked <> 0 then
    raise exception 'Emergency bonus is unavailable while GP are locked'
      using errcode = '55000';
  end if;
    -- ----------------------------------------------------------
  -- Build idempotency key
  -- ----------------------------------------------------------

  v_idempotency_key :=
    'emergency_bonus:'
    || v_season.id::text
    || ':'
    || v_user_id::text;
      if exists (
    select 1
    from public.gp_transactions
    where idempotency_key = v_idempotency_key
  ) then
    raise exception 'Emergency bonus has already been processed'
      using errcode = '55000';
  end if;
    -- ----------------------------------------------------------
  -- Credit emergency bonus
  -- ----------------------------------------------------------

  update public.user_season_stats
  set
    gp_balance = gp_balance + v_bonus_amount,
    emergency_bonus_used = true,
    capital_reached_at = now()
  where id = v_stats.id
  returning *
  into v_stats;
    -- ----------------------------------------------------------
  -- Write immutable GP ledger record
  -- ----------------------------------------------------------

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
    v_season.id,
    null,
    null,
    'emergency_bonus',
    v_bonus_amount,
    0,
    v_stats.gp_balance,
    v_stats.gp_locked,
    v_idempotency_key,
    'Экстренное пополнение GP.',
    jsonb_build_object(
      'bonus_amount', v_bonus_amount,
      'limit_per_season', v_limit_per_season,
      'season_id', v_season.id,
      'season_title', v_season.title
    )
  );
    return v_stats;
end;
$$;
revoke all on function public.claim_emergency_bonus()
from public;


grant execute on function public.claim_emergency_bonus()
to authenticated;


-- ============================================================
-- 13. GRANT REWARDED AD BONUS
-- ============================================================


-- ------------------------------------------------------------
-- Grant GP after a server-verified rewarded advertisement
-- ------------------------------------------------------------
create or replace function public.grant_rewarded_ad_bonus(
  p_user_id uuid,
  p_provider_claim_id text
)
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_season public.seasons;
  v_stats public.user_season_stats;

  v_bonus_amount bigint;
  v_daily_limit integer;
  v_claims_today integer;

  v_provider_claim_id text;
  v_idempotency_key text;

  v_stats_created boolean := false;
begin
  -- ----------------------------------------------------------
  -- Validate input
  -- ----------------------------------------------------------

  if p_user_id is null then
    raise exception 'User ID is required'
      using errcode = '22023';
  end if;

  if p_provider_claim_id is null then
    raise exception 'Provider claim ID is required'
      using errcode = '22023';
  end if;

  v_provider_claim_id := btrim(p_provider_claim_id);

  if char_length(v_provider_claim_id) < 8 then
    raise exception 'Provider claim ID is too short'
      using errcode = '22023';
  end if;

  if char_length(v_provider_claim_id) > 120 then
    raise exception 'Provider claim ID is too long'
      using errcode = '22023';
  end if;
    -- ----------------------------------------------------------
  -- Validate user
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
  ) then
    raise exception 'User profile not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Find active season
  -- ----------------------------------------------------------

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by id desc
  limit 1;

  if not found then
    raise exception 'Active season not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Read rewarded ad bonus amount
  -- ----------------------------------------------------------

  select (value #>> '{}')::bigint
  into v_bonus_amount
  from public.system_settings
  where key = 'bonus.rewarded_ad.amount';

  if not found then
    raise exception 'Rewarded ad amount setting not found'
      using errcode = 'P0002';
  end if;

  if v_bonus_amount <= 0 then
    raise exception 'Rewarded ad amount must be positive'
      using errcode = '22023';
  end if;
    -- ----------------------------------------------------------
  -- Read rewarded ad daily limit
  -- ----------------------------------------------------------

  select (value #>> '{}')::integer
  into v_daily_limit
  from public.system_settings
  where key = 'bonus.rewarded_ad.daily_limit';

  if not found then
    raise exception 'Rewarded ad daily limit setting not found'
      using errcode = 'P0002';
  end if;

  if v_daily_limit <= 0 then
    raise exception 'Rewarded ad daily limit must be positive'
      using errcode = '22023';
  end if;
    -- ----------------------------------------------------------
  -- Build idempotency key
  -- ----------------------------------------------------------

  v_idempotency_key :=
    'rewarded_ad:'
    || p_user_id::text
    || ':'
    || v_provider_claim_id;
      if exists (
    select 1
    from public.gp_transactions
    where idempotency_key = v_idempotency_key
  ) then
    raise exception 'Rewarded ad claim has already been processed'
      using errcode = '55000';
  end if;
    -- ----------------------------------------------------------
  -- Create seasonal statistics when missing
  -- ----------------------------------------------------------

  insert into public.user_season_stats (
    user_id,
    season_id,
    gp_balance,
    gp_locked,
    predictions_count,
    resolved_predictions_count,
    correct_predictions_count,
    current_streak,
    best_streak,
    emergency_bonus_used,
    capital_reached_at
  )
  values (
    p_user_id,
    v_season.id,
    v_season.starting_balance,
    0,
    0,
    0,
    0,
    0,
    0,
    false,
    now()
  )
  on conflict (user_id, season_id)
  do nothing
  returning true
  into v_stats_created;
    if coalesce(v_stats_created, false) then
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
      p_user_id,
      v_season.id,
      null,
      null,
      'season_initial_balance',
      v_season.starting_balance,
      0,
      v_season.starting_balance,
      0,
      'season_initial:' || v_season.id::text || ':' || p_user_id::text,
      'Начисление стартового баланса сезона.',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_title', v_season.title,
        'starting_balance', v_season.starting_balance,
        'initialized_by', 'rewarded_ad_bonus'
      )
    );
  end if;
    -- ----------------------------------------------------------
  -- Lock seasonal statistics
  -- ----------------------------------------------------------

  select *
  into v_stats
  from public.user_season_stats
  where user_id = p_user_id
    and season_id = v_season.id
  for update;

  if not found then
    raise exception 'User season statistics not found'
      using errcode = 'P0002';
  end if;
    -- ----------------------------------------------------------
  -- Count today's rewarded ad claims
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_claims_today
  from public.gp_transactions
  where user_id = p_user_id
    and season_id = v_season.id
    and transaction_type = 'rewarded_ad'
    and created_at >= date_trunc('day', now())
    and created_at < date_trunc('day', now()) + interval '1 day';
      if v_claims_today >= v_daily_limit then
    raise exception 'Rewarded ad daily limit has been reached'
      using errcode = '55000';
  end if;
    -- ----------------------------------------------------------
  -- Credit rewarded ad bonus
  -- ----------------------------------------------------------

  update public.user_season_stats
  set
    gp_balance = gp_balance + v_bonus_amount,
    capital_reached_at = now()
  where id = v_stats.id
  returning *
  into v_stats;
    -- ----------------------------------------------------------
  -- Write immutable GP ledger record
  -- ----------------------------------------------------------

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
    p_user_id,
    v_season.id,
    null,
    null,
    'rewarded_ad',
    v_bonus_amount,
    0,
    v_stats.gp_balance,
    v_stats.gp_locked,
    v_idempotency_key,
    'Начисление GP за просмотр рекламного объявления.',
    jsonb_build_object(
      'bonus_amount', v_bonus_amount,
      'daily_limit', v_daily_limit,
      'claims_before_current', v_claims_today,
      'provider_claim_id', v_provider_claim_id,
      'reward_day_utc', to_char(
        now() at time zone 'UTC',
        'YYYY-MM-DD'
      )
    )
  );
    return v_stats;
end;
$$;
revoke all on function public.grant_rewarded_ad_bonus(
  uuid,
  text
)
from public;


grant execute on function public.grant_rewarded_ad_bonus(
  uuid,
  text
)
to service_role;

-- ============================================================
-- 14. ADMIN ADJUST GP BALANCE
-- ============================================================


-- ------------------------------------------------------------
-- Adjust a user's available GP balance
-- ------------------------------------------------------------

create or replace function public.admin_adjust_gp_balance(
  p_user_id uuid,
  p_amount bigint,
  p_reason text
)
returns public.user_season_stats
language plpgsql
security definer
set search_path = ''
as
$$
declare
  v_season public.seasons;
  v_stats public.user_season_stats;

  v_reason text;
  v_idempotency_key text;

  v_stats_created boolean := false;
begin
  -- Validate input

  if p_user_id is null then
    raise exception 'User ID is required'
      using errcode = '22023';
  end if;

  if p_amount is null then
    raise exception 'Adjustment amount is required'
      using errcode = '22023';
  end if;

  if p_amount = 0 then
    raise exception 'Adjustment amount cannot be zero'
      using errcode = '22023';
  end if;

  if p_reason is null then
    raise exception 'Adjustment reason is required'
      using errcode = '22023';
  end if;

  v_reason := btrim(p_reason);

  if char_length(v_reason) < 3 then
    raise exception 'Adjustment reason is too short'
      using errcode = '22023';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'Adjustment reason is too long'
      using errcode = '22023';
  end if;


  -- Validate user profile

  if not exists (
    select 1
    from public.profiles
    where id = p_user_id
  ) then
    raise exception 'User profile not found'
      using errcode = 'P0002';
  end if;


  -- Find active season

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by id desc
  limit 1;

  if not found then
    raise exception 'Active season not found'
      using errcode = 'P0002';
  end if;


  -- Create seasonal statistics when missing

  insert into public.user_season_stats (
    user_id,
    season_id,
    gp_balance,
    gp_locked,
    predictions_count,
    resolved_predictions_count,
    correct_predictions_count,
    current_streak,
    best_streak,
    emergency_bonus_used,
    capital_reached_at
  )
  values (
    p_user_id,
    v_season.id,
    v_season.starting_balance,
    0,
    0,
    0,
    0,
    0,
    0,
    false,
    now()
  )
  on conflict (user_id, season_id)
  do nothing
  returning true
  into v_stats_created;


  -- Record initial season balance when statistics were created

  if coalesce(v_stats_created, false) then
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
      p_user_id,
      v_season.id,
      null,
      null,
      'season_initial_balance',
      v_season.starting_balance,
      0,
      v_season.starting_balance,
      0,
      'season_initial:'
        || v_season.id::text
        || ':'
        || p_user_id::text,
      'Начисление стартового баланса сезона.',
      jsonb_build_object(
        'season_id', v_season.id,
        'season_title', v_season.title,
        'starting_balance', v_season.starting_balance,
        'initialized_by', 'admin_adjustment'
      )
    );
  end if;


  -- Lock seasonal statistics

  select *
  into v_stats
  from public.user_season_stats
  where user_id = p_user_id
    and season_id = v_season.id
  for update;

  if not found then
    raise exception 'User season statistics not found'
      using errcode = 'P0002';
  end if;


  -- Prevent negative available balance

  if v_stats.gp_balance + p_amount < 0 then
    raise exception 'Adjustment would make GP balance negative'
      using errcode = '22003';
  end if;


  -- Build unique transaction key

  v_idempotency_key :=
    'admin_adjustment:'
    || gen_random_uuid()::text;


  -- Update available balance

  update public.user_season_stats
  set
    gp_balance = gp_balance + p_amount,
    capital_reached_at = now()
  where id = v_stats.id
  returning *
  into v_stats;


  -- Write immutable GP ledger record

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
    p_user_id,
    v_season.id,
    null,
    null,
    'admin_adjustment',
    p_amount,
    0,
    v_stats.gp_balance,
    v_stats.gp_locked,
    v_idempotency_key,
    v_reason,
    jsonb_build_object(
      'reason', v_reason,
      'adjustment', p_amount,
      'season_id', v_season.id,
      'season_title', v_season.title
    )
  );


  return v_stats;
end;
$$;


revoke all
on function public.admin_adjust_gp_balance(
  uuid,
  bigint,
  text
)
from public;


grant execute
on function public.admin_adjust_gp_balance(
  uuid,
  bigint,
  text
)
to service_role;


commit;