-- ============================================================
-- ADMIN MODERATOR MANAGEMENT
--
-- Через UI разрешаем только:
--
-- user -> moderator
-- moderator -> user
--
-- admin через эту функцию не назначается и не изменяется.
-- Только действующий admin может выполнять операцию.
-- Все изменения записываются в audit_logs.
-- ============================================================


create or replace function public.admin_set_moderator(
  p_user_id uuid,
  p_enabled boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid;

  v_profile public.profiles;

  v_existing_staff public.staff_users;

  v_old_role text;

  v_new_role text;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_actor_id :=
    auth.uid();


  if v_actor_id is null then
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

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED'
      using errcode = '22023';
  end if;


  if p_enabled is null then
    raise exception 'MODERATOR_STATE_REQUIRED'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- DO NOT MODIFY OWN STAFF ROLE FROM UI
  -- ==========================================================

  if p_user_id = v_actor_id then
    raise exception 'CANNOT_CHANGE_OWN_ROLE'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- TARGET USER
  -- ==========================================================

  select p.*
  into v_profile

  from public.profiles as p

  where p.id = p_user_id

  for update;


  if not found then
    raise exception 'USER_NOT_FOUND'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- CURRENT STAFF ROLE
  -- ==========================================================

  select su.*
  into v_existing_staff

  from public.staff_users as su

  where su.user_id = p_user_id

  for update;


  if found then
    v_old_role :=
      v_existing_staff.role;
  else
    v_old_role :=
      null;
  end if;


  -- ==========================================================
  -- EXISTING ADMIN IS IMMUTABLE HERE
  -- ==========================================================

  if v_old_role = 'admin' then
    raise exception 'ADMIN_ROLE_CANNOT_BE_CHANGED_HERE'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- ENABLE MODERATOR
  -- ==========================================================

  if p_enabled then

    -- Already moderator = idempotent

    if v_old_role = 'moderator' then
      return 'moderator';
    end if;


    insert into public.staff_users (
      user_id,
      role,
      created_at,
      updated_at
    )
    values (
      p_user_id,
      'moderator',
      now(),
      now()
    )

    on conflict (
      user_id
    )
    do update

    set
      role =
        'moderator',

      updated_at =
        now();


    v_new_role :=
      'moderator';


    -- ========================================================
    -- AUDIT
    -- ========================================================

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
      v_actor_id,

      'user_moderator_granted',

      'user',

      p_user_id::text,

      jsonb_build_object(
        'role',
        v_old_role
      ),

      jsonb_build_object(
        'role',
        v_new_role
      ),

      jsonb_build_object(
        'username',
        v_profile.username
      )
    );


    return v_new_role;

  end if;


  -- ==========================================================
  -- DISABLE MODERATOR
  -- ==========================================================

  if v_old_role is null then
    return 'user';
  end if;


  if v_old_role <> 'moderator' then
    raise exception 'UNSUPPORTED_STAFF_ROLE'
      using errcode = '55000';
  end if;


  delete from public.staff_users as su

  where su.user_id =
    p_user_id;


  v_new_role :=
    'user';


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
    v_actor_id,

    'user_moderator_revoked',

    'user',

    p_user_id::text,

    jsonb_build_object(
      'role',
        v_old_role
    ),

    jsonb_build_object(
      'role',
        null
    ),

    jsonb_build_object(
      'username',
        v_profile.username
    )
  );


  return v_new_role;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_set_moderator(
  uuid,
  boolean
)
from public;


grant execute
on function public.admin_set_moderator(
  uuid,
  boolean
)
to authenticated;