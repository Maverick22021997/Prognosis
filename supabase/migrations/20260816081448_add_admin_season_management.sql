-- ============================================================
-- ADMIN SEASON MANAGEMENT
--
-- MVP:
--   draft -> scheduled -> active
--
-- Финальное закрытие сезона:
--   active -> closing -> finished
-- будет реализовано отдельным этапом.
-- ============================================================


-- ============================================================
-- CREATE SEASON
-- ============================================================

create or replace function public.admin_create_season(
  p_title text,
  p_slug text,
  p_description text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_starting_balance integer default 25000,
  p_minimum_predictions_for_prize integer default 3
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
  v_title text;
  v_slug text;
begin

  -- ==========================================================
  -- ADMIN
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
  -- NORMALIZE
  -- ==========================================================

  v_title :=
    btrim(p_title);

  v_slug :=
    lower(
      btrim(p_slug)
    );


  -- ==========================================================
  -- VALIDATION
  -- ==========================================================

  if char_length(v_title) < 2 then
    raise exception 'SEASON_TITLE_TOO_SHORT'
      using errcode = '22023';
  end if;

  if char_length(v_title) > 100 then
    raise exception 'SEASON_TITLE_TOO_LONG'
      using errcode = '22023';
  end if;


  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_SEASON_SLUG'
      using errcode = '22023';
  end if;


  if exists (
    select 1
    from public.seasons as s
    where s.slug = v_slug
  ) then
    raise exception 'SEASON_SLUG_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  if p_end_at <= p_start_at then
    raise exception 'INVALID_SEASON_DATES'
      using errcode = '22023';
  end if;


  if p_starting_balance <= 0 then
    raise exception 'STARTING_BALANCE_MUST_BE_POSITIVE'
      using errcode = '22023';
  end if;


  if p_minimum_predictions_for_prize < 0 then
    raise exception 'MINIMUM_PREDICTIONS_CANNOT_BE_NEGATIVE'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- CREATE DRAFT
  -- ==========================================================

  insert into public.seasons (
    title,
    slug,
    description,
    start_at,
    end_at,
    status,
    starting_balance,
    minimum_predictions_for_prize
  )
  values (
    v_title,
    v_slug,
    nullif(
      btrim(p_description),
      ''
    ),
    p_start_at,
    p_end_at,
    'draft',
    p_starting_balance,
    p_minimum_predictions_for_prize
  )
  returning *
  into v_season;


  -- ==========================================================
  -- AUDIT
  -- ==========================================================

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  )
  values (
    auth.uid(),
    'season_created',
    'season',
    v_season.id::text,
    jsonb_build_object(
      'title', v_season.title,
      'slug', v_season.slug,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at,
      'status', v_season.status,
      'starting_balance', v_season.starting_balance,
      'minimum_predictions_for_prize',
        v_season.minimum_predictions_for_prize
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- UPDATE DRAFT SEASON
-- ============================================================

create or replace function public.admin_update_season(
  p_season_id bigint,
  p_title text,
  p_slug text,
  p_description text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_starting_balance integer,
  p_minimum_predictions_for_prize integer
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
  v_title text;
  v_slug text;
begin

  -- ==========================================================
  -- ADMIN
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
  -- LOCK
  -- ==========================================================

  select s.*
  into v_season
  from public.seasons as s
  where s.id = p_season_id
  for update;

  if not found then
    raise exception 'SEASON_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_season.status <> 'draft' then
    raise exception 'ONLY_DRAFT_SEASON_CAN_BE_EDITED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- NORMALIZE
  -- ==========================================================

  v_title :=
    btrim(p_title);

  v_slug :=
    lower(
      btrim(p_slug)
    );


  -- ==========================================================
  -- VALIDATION
  -- ==========================================================

  if char_length(v_title) < 2
     or char_length(v_title) > 100 then
    raise exception 'INVALID_SEASON_TITLE_LENGTH'
      using errcode = '22023';
  end if;


  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_SEASON_SLUG'
      using errcode = '22023';
  end if;


  if exists (
    select 1
    from public.seasons as s
    where s.slug = v_slug
      and s.id <> p_season_id
  ) then
    raise exception 'SEASON_SLUG_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  if p_end_at <= p_start_at then
    raise exception 'INVALID_SEASON_DATES'
      using errcode = '22023';
  end if;


  if p_starting_balance <= 0 then
    raise exception 'STARTING_BALANCE_MUST_BE_POSITIVE'
      using errcode = '22023';
  end if;


  if p_minimum_predictions_for_prize < 0 then
    raise exception 'MINIMUM_PREDICTIONS_CANNOT_BE_NEGATIVE'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- UPDATE
  -- ==========================================================

  update public.seasons as s
  set
    title =
      v_title,

    slug =
      v_slug,

    description =
      nullif(
        btrim(p_description),
        ''
      ),

    start_at =
      p_start_at,

    end_at =
      p_end_at,

    starting_balance =
      p_starting_balance,

    minimum_predictions_for_prize =
      p_minimum_predictions_for_prize,

    updated_at =
      now()

  where s.id =
    p_season_id

  returning *
  into v_season;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  )
  values (
    auth.uid(),
    'season_updated',
    'season',
    v_season.id::text,
    jsonb_build_object(
      'title', v_season.title,
      'slug', v_season.slug,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at,
      'starting_balance', v_season.starting_balance,
      'minimum_predictions_for_prize',
        v_season.minimum_predictions_for_prize
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- SCHEDULE SEASON
-- ============================================================

create or replace function public.admin_schedule_season(
  p_season_id bigint
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
begin

  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;


  select s.*
  into v_season
  from public.seasons as s
  where s.id = p_season_id
  for update;

  if not found then
    raise exception 'SEASON_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_season.status = 'scheduled' then
    return v_season;
  end if;


  if v_season.status <> 'draft' then
    raise exception 'ONLY_DRAFT_SEASON_CAN_BE_SCHEDULED'
      using errcode = '55000';
  end if;


  if v_season.end_at <= now() then
    raise exception 'SEASON_END_DATE_ALREADY_PASSED'
      using errcode = '55000';
  end if;


  update public.seasons as s
  set
    status = 'scheduled',
    updated_at = now()

  where s.id = p_season_id

  returning *
  into v_season;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  )
  values (
    auth.uid(),
    'season_scheduled',
    'season',
    v_season.id::text,

    jsonb_build_object(
      'status', 'draft'
    ),

    jsonb_build_object(
      'status', v_season.status,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- ACTIVATE SEASON
-- ============================================================

create or replace function public.admin_activate_season(
  p_season_id bigint
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
begin

  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;


  select s.*
  into v_season
  from public.seasons as s
  where s.id = p_season_id
  for update;

  if not found then
    raise exception 'SEASON_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  if v_season.status = 'active' then
    return v_season;
  end if;


  if v_season.status not in (
    'draft',
    'scheduled'
  ) then
    raise exception 'SEASON_CANNOT_BE_ACTIVATED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- DATE
  -- ==========================================================

  if v_season.start_at > now() then
    raise exception 'SEASON_HAS_NOT_STARTED_YET'
      using errcode = '55000';
  end if;


  if v_season.end_at <= now() then
    raise exception 'SEASON_ALREADY_ENDED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- ONLY ONE ACTIVE SEASON
  -- ==========================================================

  if exists (
    select 1
    from public.seasons as s
    where s.status = 'active'
      and s.id <> p_season_id
  ) then
    raise exception 'ANOTHER_ACTIVE_SEASON_EXISTS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- ACTIVATE
  -- ==========================================================

  update public.seasons as s
  set
    status = 'active',
    closed_at = null,
    updated_at = now()

  where s.id = p_season_id

  returning *
  into v_season;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  )
  values (
    auth.uid(),
    'season_activated',
    'season',
    v_season.id::text,

    jsonb_build_object(
      'status', v_season.status,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at,
      'starting_balance', v_season.starting_balance
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_create_season(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer
)
from public;

grant execute
on function public.admin_create_season(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer
)
to authenticated;



revoke all
on function public.admin_update_season(
  bigint,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer
)
from public;

grant execute
on function public.admin_update_season(
  bigint,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer
)
to authenticated;



revoke all
on function public.admin_schedule_season(
  bigint
)
from public;

grant execute
on function public.admin_schedule_season(
  bigint
)
to authenticated;



revoke all
on function public.admin_activate_season(
  bigint
)
from public;

grant execute
on function public.admin_activate_season(
  bigint
)
to authenticated;