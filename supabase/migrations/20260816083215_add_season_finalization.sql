-- ============================================================
-- SEASON FINALIZATION
--
-- active -> closing -> finished
--
-- При finish:
--   - все события должны быть финализированы;
--   - определяются участники, выполнившие критерий для приза;
--   - TOP-3 фиксируется в season_winners;
--   - данные о призах сохраняются snapshot-ом;
--   - сезон получает finished + closed_at.
-- ============================================================


-- ============================================================
-- BEGIN CLOSING
-- ============================================================

create or replace function public.admin_begin_season_closing(
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


  -- ==========================================================
  -- STATUS
  -- ==========================================================

  if v_season.status = 'closing' then
    return v_season;
  end if;


  if v_season.status <> 'active' then
    raise exception 'ONLY_ACTIVE_SEASON_CAN_BEGIN_CLOSING'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- CLOSING
  -- ==========================================================

  update public.seasons as s
  set
    status = 'closing',
    updated_at = now()
  where s.id = p_season_id
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
    old_data,
    new_data
  )
  values (
    auth.uid(),
    'season_closing_started',
    'season',
    p_season_id::text,

    jsonb_build_object(
      'status',
      'active'
    ),

    jsonb_build_object(
      'status',
      v_season.status
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- FINISH SEASON
-- ============================================================

create or replace function public.admin_finish_season(
  p_season_id bigint
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season public.seasons;

  v_blocking_events_count bigint;

  v_winner record;

  v_place integer := 0;
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


  if v_season.status = 'finished' then
    return v_season;
  end if;


  if v_season.status <> 'closing' then
    raise exception 'SEASON_MUST_BE_CLOSING'
      using errcode = '55000';
  end if;


  -- ==========================================================
  -- LOCK PARTICIPANTS
  --
  -- Пока идёт финальная фиксация, блокируем строки текущих
  -- участников сезона.
  -- ==========================================================

  perform 1
  from public.season_participants as sp
  where sp.season_id = p_season_id
  order by sp.id
  for update;


  -- ==========================================================
  -- ALL EVENTS MUST BE FINAL
  --
  -- Допустимые конечные состояния:
  --   resolved
  --   void
  --   cancelled
  -- ==========================================================

  select count(*)
  into v_blocking_events_count
  from public.events as e
  where e.season_id = p_season_id
    and e.status not in (
      'resolved',
      'void',
      'cancelled'
    );


  if v_blocking_events_count > 0 then
    raise exception 'SEASON_HAS_UNFINISHED_EVENTS'
      using
        errcode = '55000',
        detail =
          'Unfinished events count: '
          || v_blocking_events_count::text;
  end if;


  -- ==========================================================
  -- IDEMPOTENCY / CLEAN PREVIOUS UNCOMMITTED SNAPSHOT
  -- ==========================================================

  delete from public.season_winners as sw
  where sw.season_id = p_season_id;


  -- ==========================================================
  -- TOP-3 ELIGIBLE PARTICIPANTS
  --
  -- Eligibility:
  -- resolved_events_count >= season.minimum_predictions_for_prize
  --
  -- Победители ранжируются по тем же критериям, что leaderboard:
  --
  -- 1. GP
  -- 2. accuracy
  -- 3. resolved events
  -- 4. participant_updated_at
  -- 5. user_id
  --
  -- Но из выборки заранее исключаются пользователи,
  -- не выполнившие минимальный критерий участия в призах.
  -- ==========================================================

  for v_winner in

    select
      lb.user_id,
      lb.balance_gp,
      lb.accuracy,
      lb.resolved_events_count,

      sp.predictions_count,

      prize.id
        as prize_id,

      prize.title
        as prize_title,

      prize.description
        as prize_description

    from public.v_season_leaderboard as lb

    join public.season_participants as sp
      on sp.id = lb.participant_id

    left join lateral (
      select
        spz.id,
        spz.title,
        spz.description
      from public.season_prizes as spz
      where spz.season_id = p_season_id
      order by spz.place
      limit 1
      offset v_place
    ) as prize
      on true

    where lb.season_id = p_season_id

      and lb.resolved_events_count >=
        v_season.minimum_predictions_for_prize

    order by
      lb.balance_gp desc,
      lb.accuracy desc,
      lb.resolved_events_count desc,
      lb.participant_updated_at asc,
      lb.user_id asc

    limit 3

  loop

    v_place :=
      v_place + 1;


    /*
     * Prize выбираем повторно именно по фактическому месту.
     *
     * Это делает код однозначным:
     * place 1 -> season_prizes.place = 1
     * place 2 -> season_prizes.place = 2
     * place 3 -> season_prizes.place = 3
     */

    insert into public.season_winners (
      season_id,
      user_id,
      prize_id,
      place,
      final_gp,
      accuracy,
      predictions_count,
      prize_title_snapshot,
      prize_description_snapshot
    )
    select
      p_season_id,
      v_winner.user_id,
      spz.id,
      v_place,
      v_winner.balance_gp,
      v_winner.accuracy,

      /*
       * Здесь сохраняем resolved unique events.
       *
       * Техническое имя колонки историческое:
       * predictions_count.
       *
       * Для текущей продуктовой модели показатель означает
       * число завершённых уникальных событий.
       */
      v_winner.resolved_events_count,

      spz.title,
      spz.description

    from (
      select
        1
    ) as dummy

    left join public.season_prizes as spz
      on spz.season_id = p_season_id
      and spz.place = v_place;

  end loop;


  -- ==========================================================
  -- FINISH
  -- ==========================================================

  update public.seasons as s
  set
    status = 'finished',

    closed_at = now(),

    updated_at = now()

  where s.id = p_season_id

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
    old_data,
    new_data,
    metadata
  )
  values (
    auth.uid(),

    'season_finished',

    'season',

    p_season_id::text,

    jsonb_build_object(
      'status',
      'closing'
    ),

    jsonb_build_object(
      'status',
      v_season.status,

      'closed_at',
      v_season.closed_at
    ),

    jsonb_build_object(
      'winners_count',
      (
        select count(*)
        from public.season_winners as sw
        where sw.season_id = p_season_id
      ),

      'minimum_events_for_prize',
      v_season.minimum_predictions_for_prize
    )
  );


  return v_season;

end;
$function$;



-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.admin_begin_season_closing(bigint)
from public;

grant execute
on function public.admin_begin_season_closing(bigint)
to authenticated;


revoke all
on function public.admin_finish_season(bigint)
from public;

grant execute
on function public.admin_finish_season(bigint)
to authenticated;