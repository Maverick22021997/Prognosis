-- ============================================================
-- ADMIN SEASON PRIZES
--
-- Управление призами 1 / 2 / 3 места.
-- После завершения сезона призы больше не редактируются.
-- ============================================================


-- ============================================================
-- UPSERT PRIZE
-- ============================================================

create or replace function public.admin_upsert_season_prize(
  p_season_id bigint,
  p_place integer,
  p_title text,
  p_description text
)
returns public.season_prizes
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
  v_prize public.season_prizes;

  v_title text;
  v_description text;
begin

  -- ==========================================================
  -- AUTH
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
  -- INPUT
  -- ==========================================================

  if p_season_id is null then
    raise exception 'SEASON_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_place is null then
    raise exception 'PRIZE_PLACE_REQUIRED'
      using errcode = '22023';
  end if;


  if p_place not in (
    1,
    2,
    3
  ) then
    raise exception 'INVALID_PRIZE_PLACE'
      using errcode = '22023';
  end if;


  v_title :=
    btrim(
      coalesce(
        p_title,
        ''
      )
    );


  if char_length(v_title) < 2 then
    raise exception 'PRIZE_TITLE_TOO_SHORT'
      using errcode = '22023';
  end if;


  if char_length(v_title) > 150 then
    raise exception 'PRIZE_TITLE_TOO_LONG'
      using errcode = '22023';
  end if;


  v_description :=
    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    );


  -- ==========================================================
  -- LOCK SEASON
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


  -- ==========================================================
  -- FINAL SEASON IS IMMUTABLE
  -- ==========================================================

  if v_season.status in (
    'finished',
    'cancelled'
  ) then
    raise exception 'SEASON_PRIZES_ARE_LOCKED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- UPSERT
  -- ==========================================================

  insert into public.season_prizes (
    season_id,
    place,
    title,
    description
  )
  values (
    p_season_id,
    p_place,
    v_title,
    v_description
  )

  on conflict (
    season_id,
    place
  )
  do update

  set
    title =
      excluded.title,

    description =
      excluded.description,

    updated_at =
      now()

  returning *
  into v_prize;


  -- ==========================================================
  -- AUDIT
  -- ==========================================================

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    auth.uid(),

    'season_prize_saved',

    'season_prize',

    v_prize.id::text,

    jsonb_build_object(
      'id',
        v_prize.id,

      'season_id',
        v_prize.season_id,

      'place',
        v_prize.place,

      'title',
        v_prize.title,

      'description',
        v_prize.description
    ),

    jsonb_build_object(
      'season_id',
        p_season_id,

      'place',
        p_place
    )
  );


  return v_prize;

end;
$function$;



-- ============================================================
-- DELETE PRIZE
-- ============================================================

create or replace function public.admin_delete_season_prize(
  p_season_id bigint,
  p_place integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
  v_prize public.season_prizes;
begin

  -- ==========================================================
  -- AUTH
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
  -- INPUT
  -- ==========================================================

  if p_season_id is null then
    raise exception 'SEASON_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_place not in (
    1,
    2,
    3
  ) then
    raise exception 'INVALID_PRIZE_PLACE'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- LOCK SEASON
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


  if v_season.status in (
    'finished',
    'cancelled'
  ) then
    raise exception 'SEASON_PRIZES_ARE_LOCKED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- FIND PRIZE
  -- ==========================================================

  select sp.*
  into v_prize
  from public.season_prizes as sp
  where sp.season_id = p_season_id
    and sp.place = p_place
  for update;


  if not found then
    return false;
  end if;


  -- ==========================================================
  -- AUDIT BEFORE DELETE
  -- ==========================================================

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    metadata
  )
  values (
    auth.uid(),

    'season_prize_deleted',

    'season_prize',

    v_prize.id::text,

    jsonb_build_object(
      'id',
        v_prize.id,

      'season_id',
        v_prize.season_id,

      'place',
        v_prize.place,

      'title',
        v_prize.title,

      'description',
        v_prize.description
    ),

    jsonb_build_object(
      'season_id',
        p_season_id,

      'place',
        p_place
    )
  );


  -- ==========================================================
  -- DELETE
  -- ==========================================================

  delete from public.season_prizes
  where id =
    v_prize.id;


  return true;

end;
$function$;



-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_upsert_season_prize(
  bigint,
  integer,
  text,
  text
)
from public;

grant execute
on function public.admin_upsert_season_prize(
  bigint,
  integer,
  text,
  text
)
to authenticated;



revoke all
on function public.admin_delete_season_prize(
  bigint,
  integer
)
from public;

grant execute
on function public.admin_delete_season_prize(
  bigint,
  integer
)
to authenticated;