-- ============================================================
-- PUBLIC SEASON LEADERBOARD
--
-- Безопасная публичная выдача рейтинга.
-- Не раскрывает email, внутренние данные профиля и т.д.
-- ============================================================

create or replace function public.get_season_leaderboard(
  p_season_id bigint default null,
  p_limit integer default 100
)
returns table (
  rank bigint,
  season_id bigint,
  user_id uuid,
  username text,
  balance_gp bigint,
  accuracy numeric,
  resolved_events_count integer,
  successful_events_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_season_id bigint;
  v_limit integer;
begin

  -- ==========================================================
  -- LIMIT
  -- ==========================================================

  v_limit :=
    least(
      greatest(
        coalesce(p_limit, 100),
        1
      ),
      100
    );


  -- ==========================================================
  -- SEASON
  -- ==========================================================

  if p_season_id is null then

    select s.id
    into v_season_id
    from public.seasons s
    where s.status = 'active'
    order by s.start_at desc
    limit 1;

  else

    v_season_id :=
      p_season_id;

  end if;


  if v_season_id is null then
    return;
  end if;


  -- ==========================================================
  -- LEADERBOARD
  -- ==========================================================

  return query

  select
    l.rank,
    l.season_id,
    l.user_id,
    l.username,
    l.balance_gp,
    l.accuracy,
    l.resolved_events_count,
    l.successful_events_count

  from public.v_season_leaderboard l

  where
    l.season_id =
      v_season_id

  order by
    l.rank

  limit
    v_limit;

end;
$function$;


revoke all
on function public.get_season_leaderboard(
  bigint,
  integer
)
from public;


grant execute
on function public.get_season_leaderboard(
  bigint,
  integer
)
to anon;


grant execute
on function public.get_season_leaderboard(
  bigint,
  integer
)
to authenticated;