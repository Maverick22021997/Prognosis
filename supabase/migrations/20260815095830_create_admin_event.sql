-- ============================================================
-- CREATE EVENT FROM ADMIN
-- ============================================================

create or replace function public.admin_create_event(
  p_category_id bigint,
  p_title text,
  p_slug text,
  p_description text,
  p_source_name text,
  p_source_url text,
  p_resolution_rule text,
  p_publish_at timestamptz,
  p_prediction_close_at timestamptz,
  p_expected_resolution_at timestamptz,
  p_is_featured boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_season_id bigint;
  v_event_id bigint;
  v_title text;
  v_slug text;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;


  if not public.is_staff() then
    raise exception
      'Staff access required'
      using errcode = '42501';
  end if;


  -- ==========================================================
  -- ACTIVE SEASON
  -- ==========================================================

  select s.id
  into v_season_id
  from public.seasons as s
  where s.status = 'active'
  order by s.start_at desc
  limit 1;


  if v_season_id is null then
    raise exception
      'Active season not found'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- NORMALIZE
  -- ==========================================================

  v_title := trim(p_title);

  v_slug := lower(
    trim(p_slug)
  );


  -- ==========================================================
  -- VALIDATION
  -- ==========================================================

  if length(v_title) < 5 then
    raise exception
      'Event title is too short'
      using errcode = '22023';
  end if;


  if length(v_slug) < 3 then
    raise exception
      'Event slug is too short'
      using errcode = '22023';
  end if;


  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception
      'Invalid event slug'
      using errcode = '22023';
  end if;


  if exists (
    select 1
    from public.events as e
    where e.slug = v_slug
  ) then
    raise exception
      'Event slug already exists'
      using errcode = '23505';
  end if;


  if not exists (
    select 1
    from public.event_categories as ec
    where ec.id = p_category_id
      and ec.is_active = true
  ) then
    raise exception
      'Event category not found or inactive'
      using errcode = '22023';
  end if;


  if trim(p_resolution_rule) = '' then
    raise exception
      'Resolution rule is required'
      using errcode = '22023';
  end if;


  if p_prediction_close_at <= p_publish_at then
    raise exception
      'Prediction close date must be later than publish date'
      using errcode = '22023';
  end if;


  if
    p_expected_resolution_at is not null
    and p_expected_resolution_at < p_prediction_close_at
  then
    raise exception
      'Expected resolution date cannot be earlier than prediction close date'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- EVENT
  -- ==========================================================

  insert into public.events (
    season_id,
    category_id,
    title,
    slug,
    description,
    source_name,
    source_url,
    resolution_rule,
    publish_at,
    prediction_close_at,
    expected_resolution_at,
    status,
    is_featured,
    predictions_count,
    volume_gp,
    created_by
  )
  values (
    v_season_id,
    p_category_id,
    v_title,
    v_slug,
    nullif(trim(p_description), ''),
    nullif(trim(p_source_name), ''),
    nullif(trim(p_source_url), ''),
    trim(p_resolution_rule),
    p_publish_at,
    p_prediction_close_at,
    p_expected_resolution_at,
    'draft',
    coalesce(p_is_featured, false),
    0,
    0,
    v_user_id
  )
  returning id
  into v_event_id;


  -- ==========================================================
  -- INITIAL POOL
  -- ==========================================================

  insert into public.event_pools (
    event_id,
    yes_pool,
    no_pool
  )
  values (
    v_event_id,
    1000,
    1000
  );


  -- ==========================================================
  -- INITIAL ODDS HISTORY
  -- ==========================================================

  insert into public.event_odds_history (
    event_id,
    yes_pool,
    no_pool,
    yes_odds,
    no_odds,
    predictions_count,
    total_pool,
    yes_probability,
    no_probability
  )
  values (
    v_event_id,
    1000,
    1000,
    2.0000,
    2.0000,
    0,
    2000,
    50.00,
    50.00
  );


  return v_event_id;

end;
$function$;


revoke all
on function public.admin_create_event(
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean
)
from public;


grant execute
on function public.admin_create_event(
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean
)
to authenticated;