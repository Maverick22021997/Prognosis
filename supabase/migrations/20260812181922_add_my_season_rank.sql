create or replace function public.get_my_season_rank(
  p_season_id bigint default null
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
  v_user_id uuid;
  v_season_id bigint;
begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

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

    and l.user_id =
      v_user_id

  limit 1;

end;
$function$;


revoke all
on function public.get_my_season_rank(
  bigint
)
from public;


grant execute
on function public.get_my_season_rank(
  bigint
)
to authenticated;