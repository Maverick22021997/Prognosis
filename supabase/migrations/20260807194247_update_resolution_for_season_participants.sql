begin;

-- ============================================================
-- PROGNOSIS
-- Prediction resolution MVP
--
-- Перевод resolve_event() и void_event()
-- с user_season_stats на season_participants.
--
-- Новая модель:
-- - ставка списывается из balance_gp сразу при прогнозе;
-- - выигрыш: начисляется полный potential_payout;
-- - проигрыш: дополнительного движения GP нет;
-- - void: исходная ставка полностью возвращается.
-- ============================================================


-- ============================================================
-- 1. RESOLVE EVENT
-- ============================================================

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
  v_participant public.season_participants;

  v_previous_status public.event_status;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  v_staff_user_id := auth.uid();

  if v_staff_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;


  if not public.is_staff() then
    raise exception 'STAFF_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- INPUT
  -- ==========================================================

  if p_event_id is null then
    raise exception 'EVENT_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_result is null then
    raise exception 'EVENT_RESULT_REQUIRED'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- LOCK EVENT
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


  -- ==========================================================
  -- VALIDATE EVENT
  -- ==========================================================

  if v_event.status = 'resolved' then
    raise exception 'EVENT_ALREADY_RESOLVED'
      using errcode = '55000';
  end if;


  if v_event.status in (
    'cancelled',
    'void'
  ) then
    raise exception
      'EVENT_CANNOT_BE_RESOLVED'
      using errcode = '55000';
  end if;


  if v_event.status not in (
    'active',
    'closed',
    'resolving'
  ) then
    raise exception
      'INVALID_EVENT_STATUS'
      using errcode = '55000';
  end if;


  if now() <
     v_event.prediction_close_at then
    raise exception
      'EVENT_PREDICTIONS_NOT_CLOSED'
      using errcode = '55000';
  end if;


  v_previous_status :=
    v_event.status;


  -- ==========================================================
  -- MARK AS RESOLVING
  -- ==========================================================

  update public.events
  set
    status = 'resolving'
  where id = p_event_id;


  -- ==========================================================
  -- PROCESS PREDICTIONS
  -- ==========================================================

  for v_prediction in

    select predictions.*
    from public.predictions
    where
      predictions.event_id =
        p_event_id

      and predictions.status =
        'active'

    order by predictions.id

    for update

  loop

    -- ========================================================
    -- LOCK PARTICIPANT
    -- ========================================================

    select *
    into v_participant
    from public.season_participants
    where
      season_id =
        v_prediction.season_id

      and user_id =
        v_prediction.user_id

    for update;


    if not found then
      raise exception
        'SEASON_PARTICIPANT_NOT_FOUND_FOR_PREDICTION_%',
        v_prediction.id
        using errcode = 'P0002';
    end if;


    -- ========================================================
    -- WIN
    -- ========================================================

    if
      v_prediction.prediction_side =
      p_result
    then

      -- ------------------------------------------------------
      -- Credit full payout.
      --
      -- Stake was already deducted when prediction
      -- was placed, therefore potential_payout
      -- contains the entire amount returned to winner.
      -- ------------------------------------------------------

      update public.season_participants
      set
        balance_gp =
          balance_gp
          + v_prediction.potential_payout,

        correct_predictions_count =
          correct_predictions_count + 1

      where id =
        v_participant.id

      returning *
      into v_participant;


      -- ------------------------------------------------------
      -- Prediction status
      -- ------------------------------------------------------

      update public.predictions
      set
        status = 'won',

        actual_payout =
          v_prediction.potential_payout,

        resolved_at = now()

      where id =
        v_prediction.id;


      -- ------------------------------------------------------
      -- GP ledger
      -- ------------------------------------------------------

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
        v_prediction.user_id,
        v_prediction.season_id,
        v_prediction.id,
        p_event_id,

        'prediction_win',

        v_prediction.potential_payout,
        0,

        v_participant.balance_gp,
        0,

        'prediction_resolution:'
          || v_prediction.id::text,

        'Начисление GP по правильному прогнозу.',

        jsonb_build_object(
          'prediction_id',
            v_prediction.id,

          'event_id',
            p_event_id,

          'event_result',
            p_result,

          'prediction_side',
            v_prediction.prediction_side,

          'stake_amount',
            v_prediction.stake_amount,

          'odds_at_purchase',
            v_prediction.odds_at_purchase,

          'actual_payout',
            v_prediction.potential_payout
        )
      );


    -- ========================================================
    -- LOSS
    -- ========================================================

    else

      /*
       * Никаких GP здесь дополнительно не списываем.
       *
       * Ставка уже была вычтена из balance_gp
       * в place_prediction().
       */


      update public.predictions
      set
        status = 'lost',
        actual_payout = 0,
        resolved_at = now()

      where id =
        v_prediction.id;


      /*
       * В gp_transactions запись для проигрыша
       * здесь намеренно НЕ создаём.
       *
       * Причина:
       * фактическое движение GP произошло ещё
       * при размещении прогноза.
       *
       * Кроме того, текущая таблица
       * gp_transactions запрещает транзакции,
       * где одновременно:
       *
       * amount_available = 0
       * amount_locked = 0
       *
       * Сам факт проигрыша сохраняется
       * в predictions.status = 'lost'.
       */

    end if;

  end loop;


  -- ==========================================================
  -- COMPLETE EVENT
  -- ==========================================================

  update public.events
  set
    status = 'resolved',
    result = p_result,
    resolved_at = now(),
    resolved_by = v_staff_user_id

  where id = p_event_id

  returning *
  into v_event;


  -- ==========================================================
  -- AUDIT LOG
  -- ==========================================================

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
      'status',
        v_previous_status,

      'result',
        null
    ),

    jsonb_build_object(
      'status',
        v_event.status,

      'result',
        v_event.result,

      'resolved_at',
        v_event.resolved_at,

      'resolved_by',
        v_event.resolved_by
    ),

    jsonb_build_object(
      'predictions_count',
        v_event.predictions_count,

      'volume_gp',
        v_event.volume_gp
    )
  );


  return v_event;

end;
$$;


revoke all
on function public.resolve_event(
  bigint,
  public.prediction_side
)
from public;


grant execute
on function public.resolve_event(
  bigint,
  public.prediction_side
)
to authenticated;



-- ============================================================
-- 2. VOID EVENT
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
  v_participant public.season_participants;

  v_previous_status public.event_status;

  v_reason text;

  v_refunded_predictions_count bigint := 0;
  v_refunded_gp_total bigint := 0;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  v_staff_user_id :=
    auth.uid();


  if v_staff_user_id is null then
    raise exception
      'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;


  if not public.is_staff() then
    raise exception
      'STAFF_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- INPUT
  -- ==========================================================

  if p_event_id is null then
    raise exception 'EVENT_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_reason is null then
    raise exception 'VOID_REASON_REQUIRED'
      using errcode = '22023';
  end if;


  v_reason :=
    btrim(p_reason);


  if char_length(v_reason) < 3 then
    raise exception
      'VOID_REASON_TOO_SHORT'
      using errcode = '22023';
  end if;


  if char_length(v_reason) > 1000 then
    raise exception
      'VOID_REASON_TOO_LONG'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- LOCK EVENT
  -- ==========================================================

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;


  if not found then
    raise exception
      'EVENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- VALIDATE EVENT
  -- ==========================================================

  if v_event.status = 'resolved' then
    raise exception
      'RESOLVED_EVENT_CANNOT_BE_VOIDED'
      using errcode = '55000';
  end if;


  if v_event.status = 'void' then
    raise exception
      'EVENT_ALREADY_VOIDED'
      using errcode = '55000';
  end if;


  if v_event.status = 'cancelled' then
    raise exception
      'CANCELLED_EVENT_CANNOT_BE_VOIDED'
      using errcode = '55000';
  end if;


  if v_event.status not in (
    'scheduled',
    'active',
    'closed',
    'resolving'
  ) then
    raise exception
      'EVENT_CANNOT_BE_VOIDED'
      using errcode = '55000';
  end if;


  v_previous_status :=
    v_event.status;


  -- ==========================================================
  -- PREVENT NEW PREDICTIONS
  -- ==========================================================

  update public.events
  set
    status = 'resolving'
  where id =
    p_event_id;


  -- ==========================================================
  -- REFUND ACTIVE PREDICTIONS
  -- ==========================================================

  for v_prediction in

    select predictions.*
    from public.predictions
    where
      predictions.event_id =
        p_event_id

      and predictions.status =
        'active'

    order by predictions.id

    for update

  loop

    -- ========================================================
    -- LOCK PARTICIPANT
    -- ========================================================

    select *
    into v_participant
    from public.season_participants
    where
      season_id =
        v_prediction.season_id

      and user_id =
        v_prediction.user_id

    for update;


    if not found then
      raise exception
        'SEASON_PARTICIPANT_NOT_FOUND_FOR_PREDICTION_%',
        v_prediction.id
        using errcode = 'P0002';
    end if;


    -- ========================================================
    -- RETURN STAKE
    -- ========================================================

    update public.season_participants
    set
      balance_gp =
        balance_gp
        + v_prediction.stake_amount

    where id =
      v_participant.id

    returning *
    into v_participant;


    -- ========================================================
    -- MARK PREDICTION REFUNDED
    -- ========================================================

    update public.predictions
    set
      status = 'refunded',

      actual_payout =
        v_prediction.stake_amount,

      resolved_at = now()

    where id =
      v_prediction.id;


    -- ========================================================
    -- GP LEDGER
    -- ========================================================

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
      v_prediction.user_id,
      v_prediction.season_id,
      v_prediction.id,
      p_event_id,

      'prediction_refund',

      v_prediction.stake_amount,
      0,

      v_participant.balance_gp,
      0,

      'prediction_refund:'
        || v_prediction.id::text,

      'Возврат GP в связи с аннулированием события.',

      jsonb_build_object(
        'prediction_id',
          v_prediction.id,

        'event_id',
          p_event_id,

        'stake_amount',
          v_prediction.stake_amount,

        'void_reason',
          v_reason
      )
    );


    v_refunded_predictions_count :=
      v_refunded_predictions_count
      + 1;


    v_refunded_gp_total :=
      v_refunded_gp_total
      + v_prediction.stake_amount;

  end loop;


  -- ==========================================================
  -- COMPLETE VOID
  -- ==========================================================

  update public.events
  set
    status = 'void',

    result = null,

    cancel_reason =
      v_reason,

    resolved_at = now(),

    resolved_by =
      v_staff_user_id

  where id =
    p_event_id

  returning *
  into v_event;


  -- ==========================================================
  -- AUDIT
  -- ==========================================================

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
      'status',
        v_previous_status,

      'result',
        null
    ),

    jsonb_build_object(
      'status',
        v_event.status,

      'result',
        v_event.result,

      'resolved_at',
        v_event.resolved_at,

      'resolved_by',
        v_event.resolved_by,

      'cancel_reason',
        v_event.cancel_reason
    ),

    jsonb_build_object(
      'reason',
        v_reason,

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
on function public.void_event(
  bigint,
  text
)
from public;


grant execute
on function public.void_event(
  bigint,
  text
)
to authenticated;


commit;