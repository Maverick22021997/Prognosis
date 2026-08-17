-- ============================================================
-- SAFE DELETE DRAFT SEASON
--
-- Физически удалить можно только полностью пустой draft.
-- Никаких каскадных удалений пользовательских данных.
-- ============================================================

create or replace function public.admin_delete_season(
  p_season_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;
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
  -- ONLY DRAFT
  -- ==========================================================

  if v_season.status <> 'draft' then
    raise exception 'ONLY_DRAFT_SEASON_CAN_BE_DELETED'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- EVENTS
  -- ==========================================================

  if exists (
    select 1
    from public.events as e
    where e.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_EVENTS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- PARTICIPANTS
  -- ==========================================================

  if exists (
    select 1
    from public.season_participants as sp
    where sp.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_PARTICIPANTS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- PREDICTIONS
  -- ==========================================================

  if exists (
    select 1
    from public.predictions as p
    where p.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_PREDICTIONS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- GP TRANSACTIONS
  -- ==========================================================

  if exists (
    select 1
    from public.gp_transactions as gt
    where gt.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_GP_TRANSACTIONS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- PRIZES
  -- ==========================================================

  if exists (
    select 1
    from public.season_prizes as spz
    where spz.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_PRIZES'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- WINNERS
  -- ==========================================================

  if exists (
    select 1
    from public.season_winners as sw
    where sw.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_WINNERS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- ACHIEVEMENTS
  -- ==========================================================

  if exists (
    select 1
    from public.user_achievements as ua
    where ua.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_ACHIEVEMENTS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- LEGACY USER SEASON STATS
  -- ==========================================================

  if exists (
    select 1
    from public.user_season_stats as uss
    where uss.season_id = p_season_id
  ) then
    raise exception 'SEASON_HAS_USER_STATS'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- AUDIT BEFORE DELETE
  -- ==========================================================

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data
  )
  values (
    auth.uid(),
    'season_deleted',
    'season',
    v_season.id::text,

    jsonb_build_object(
      'id', v_season.id,
      'title', v_season.title,
      'slug', v_season.slug,
      'status', v_season.status,
      'start_at', v_season.start_at,
      'end_at', v_season.end_at,
      'starting_balance', v_season.starting_balance,
      'minimum_predictions_for_prize',
        v_season.minimum_predictions_for_prize
    )
  );


  -- ==========================================================
  -- DELETE
  -- ==========================================================

  delete from public.seasons
  where id = p_season_id;


  return true;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_delete_season(bigint)
from public;

grant execute
on function public.admin_delete_season(bigint)
to authenticated;