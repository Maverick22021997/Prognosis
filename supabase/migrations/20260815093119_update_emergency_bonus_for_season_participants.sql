-- ============================================================
-- EMERGENCY BONUS FOR SEASON_PARTICIPANTS
-- ============================================================

-- Старая функция возвращала user_season_stats.
-- Поскольку тип результата меняется, сначала удаляем функцию.

drop function if exists public.claim_emergency_bonus();


create function public.claim_emergency_bonus()
returns table (
  participant_id bigint,
  season_id bigint,
  user_id uuid,
  balance_gp bigint,
  emergency_refill_used boolean,
  bonus_amount bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;

  v_season public.seasons;

  v_participant public.season_participants;

  v_bonus_amount bigint;

  v_limit_per_season integer;

  v_idempotency_key text;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- ACTIVE SEASON
  -- ==========================================================

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by start_at desc
  limit 1;


  if not found then
    raise exception
      'Active season not found'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- SETTINGS: BONUS AMOUNT
  -- ==========================================================

  select
    (value #>> '{}')::bigint

  into
    v_bonus_amount

  from public.system_settings

  where key =
    'bonus.emergency.amount';


  if not found then
    raise exception
      'Emergency bonus amount setting not found'
      using errcode = 'P0002';
  end if;


  if v_bonus_amount <= 0 then
    raise exception
      'Emergency bonus amount must be positive'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- SETTINGS: LIMIT PER SEASON
  -- ==========================================================

  select
    (value #>> '{}')::integer

  into
    v_limit_per_season

  from public.system_settings

  where key =
    'bonus.emergency.limit_per_season';


  if not found then
    raise exception
      'Emergency bonus limit setting not found'
      using errcode = 'P0002';
  end if;


  if v_limit_per_season <> 1 then
    raise exception
      'Emergency bonus limit must equal 1'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- ENSURE ACTIVE SEASON PARTICIPANT
  -- ==========================================================

  perform
    public.ensure_active_season_participant(
      v_user_id
    );


  -- ==========================================================
  -- LOCK PARTICIPANT
  -- ==========================================================

  select *
  into v_participant

  from public.season_participants

  where user_id =
    v_user_id

    and season_id =
      v_season.id

  for update;


  if not found then
    raise exception
      'Season participant not found'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- VALIDATE AVAILABILITY
  -- ==========================================================

  if v_participant.emergency_refill_used then
    raise exception
      'Emergency bonus has already been used this season'
      using errcode = '55000';
  end if;


  if v_participant.balance_gp <> 0 then
    raise exception
      'Emergency bonus is available only when GP balance is zero'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_idempotency_key :=
    'emergency_bonus:'
    || v_season.id::text
    || ':'
    || v_user_id::text;


  if exists (
    select 1

    from public.gp_transactions

    where idempotency_key =
      v_idempotency_key
  ) then

    raise exception
      'Emergency bonus has already been processed'
      using errcode = '55000';

  end if;


  -- ==========================================================
  -- CREDIT BONUS
  -- ==========================================================

  update public.season_participants

  set
    balance_gp =
      balance_gp
      + v_bonus_amount,

    emergency_refill_used =
      true,

    updated_at =
      now()

  where id =
    v_participant.id

  returning *
  into v_participant;


  -- ==========================================================
  -- LEDGER
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

    v_season.id,

    null,

    null,

    'emergency_bonus',

    v_bonus_amount,

    0,

    v_participant.balance_gp,

    0,

    v_idempotency_key,

    'Экстренное пополнение GP.',

    jsonb_build_object(
      'bonus_amount',
      v_bonus_amount,

      'limit_per_season',
      v_limit_per_season,

      'season_id',
      v_season.id,

      'season_title',
      v_season.title
    )
  );


  -- ==========================================================
  -- RETURN
  -- ==========================================================

  return query

  select
    v_participant.id,

    v_participant.season_id,

    v_participant.user_id,

    v_participant.balance_gp,

    v_participant.emergency_refill_used,

    v_bonus_amount;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.claim_emergency_bonus()
from public;


grant execute
on function public.claim_emergency_bonus()
to authenticated;