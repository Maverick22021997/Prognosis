-- ============================================================
-- ADMIN EVENT MANAGEMENT
--
-- 1. Редактирование черновика
-- 2. Публикация черновика
-- ============================================================


-- ============================================================
-- UPDATE DRAFT EVENT
-- ============================================================

create or replace function public.admin_update_event(
  p_event_id bigint,
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
  p_is_featured boolean
)
returns public.events
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_event public.events;

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
  -- LOCK EVENT
  -- ==========================================================

  select e.*
  into v_event
  from public.events as e
  where e.id = p_event_id
  for update;

  if not found then
    raise exception
      'Event not found'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- ONLY DRAFT CAN BE FULLY EDITED
  -- ==========================================================

  if v_event.status <> 'draft' then
    raise exception
      'Only draft events can be edited'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- NORMALIZE
  -- ==========================================================

  v_title :=
    trim(p_title);

  v_slug :=
    lower(
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
      and e.id <> p_event_id
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
  -- UPDATE
  -- ==========================================================

  update public.events as e

  set
    category_id =
      p_category_id,

    title =
      v_title,

    slug =
      v_slug,

    description =
      nullif(
        trim(p_description),
        ''
      ),

    source_name =
      nullif(
        trim(p_source_name),
        ''
      ),

    source_url =
      nullif(
        trim(p_source_url),
        ''
      ),

    resolution_rule =
      trim(
        p_resolution_rule
      ),

    publish_at =
      p_publish_at,

    prediction_close_at =
      p_prediction_close_at,

    expected_resolution_at =
      p_expected_resolution_at,

    is_featured =
      coalesce(
        p_is_featured,
        false
      ),

    updated_at =
      now()

  where e.id =
    p_event_id

  returning e.*
  into v_event;


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
    v_user_id,
    'event_updated',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'title', v_event.title,
      'slug', v_event.slug,
      'category_id', v_event.category_id,
      'publish_at', v_event.publish_at,
      'prediction_close_at', v_event.prediction_close_at,
      'expected_resolution_at', v_event.expected_resolution_at,
      'is_featured', v_event.is_featured
    )
  );


  return v_event;

end;
$function$;



-- ============================================================
-- PUBLISH DRAFT EVENT
--
-- Ставим active сразу.
--
-- Если publish_at находится в будущем, публичная RLS всё равно
-- не покажет событие до наступления publish_at.
-- ============================================================

create or replace function public.admin_publish_event(
  p_event_id bigint
)
returns public.events
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_event public.events;
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
  -- LOCK EVENT
  -- ==========================================================

  select e.*
  into v_event
  from public.events as e
  where e.id = p_event_id
  for update;

  if not found then
    raise exception
      'Event not found'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- VALIDATE STATUS
  -- ==========================================================

  if v_event.status = 'active' then
    return v_event;
  end if;


  if v_event.status <> 'draft' then
    raise exception
      'Only draft events can be published'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- VALIDATE DATES
  -- ==========================================================

  if v_event.prediction_close_at <= v_event.publish_at then
    raise exception
      'Prediction close date must be later than publish date'
      using errcode = '22023';
  end if;


  if v_event.prediction_close_at <= now() then
    raise exception
      'Prediction close date has already passed'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- PUBLISH
  -- ==========================================================

  update public.events as e

  set
    status = 'active',
    updated_at = now()

  where e.id =
    p_event_id

  returning e.*
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
    v_user_id,
    'event_published',
    'event',
    p_event_id::text,

    jsonb_build_object(
      'status',
      'draft'
    ),

    jsonb_build_object(
      'status',
      v_event.status
    ),

    jsonb_build_object(
      'publish_at',
      v_event.publish_at,
      'prediction_close_at',
      v_event.prediction_close_at
    )
  );


  return v_event;

end;
$function$;



-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_update_event(
  bigint,
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
on function public.admin_update_event(
  bigint,
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



revoke all
on function public.admin_publish_event(
  bigint
)
from public;


grant execute
on function public.admin_publish_event(
  bigint
)
to authenticated;