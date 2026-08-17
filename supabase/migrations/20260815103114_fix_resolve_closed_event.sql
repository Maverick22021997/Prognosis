create or replace function public.resolve_event(
  p_event_id bigint,
  p_result public.prediction_side
)
returns public.events
language plpgsql
security definer
set search_path = ''
as $function$
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


  -- ==========================================================
  -- IMPORTANT:
  --
  -- Если событие всё ещё active, календарная дата закрытия
  -- должна уже наступить.
  --
  -- Если staff вручную перевёл событие в closed, считаем,
  -- что приём прогнозов уже остановлен, и результат можно
  -- определить независимо от prediction_close_at.
  -- ==========================================================

  if
    v_event.status = 'active'
    and now() < v_event.prediction_close_at
  then
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


      update public.predictions
      set
        status = 'won',

        actual_payout =
          v_prediction.potential_payout,

        resolved_at = now()

      where id =
        v_prediction.id;


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

      update public.predictions
      set
        status = 'lost',
        actual_payout = 0,
        resolved_at = now()

      where id =
        v_prediction.id;

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
$function$;