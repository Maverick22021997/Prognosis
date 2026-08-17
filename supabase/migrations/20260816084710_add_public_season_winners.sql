-- ============================================================
-- PUBLIC SEASON WINNERS
-- ============================================================

create or replace function public.get_finished_seasons()
returns table (
  season_id bigint,
  title text,
  slug text,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  closed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$

  select
    s.id as season_id,
    s.title,
    s.slug,
    s.description,
    s.start_at,
    s.end_at,
    s.closed_at
  from public.seasons as s
  where s.status = 'finished'
  order by
    s.closed_at desc nulls last,
    s.end_at desc,
    s.id desc;

$function$;


create or replace function public.get_season_winners(
  p_season_id bigint
)
returns table (
  season_id bigint,
  place integer,
  user_id uuid,
  username text,
  final_gp bigint,
  accuracy numeric,
  predictions_count integer,
  prize_title text,
  prize_description text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  if not exists (
    select 1
    from public.seasons as s
    where s.id = p_season_id
      and s.status = 'finished'
  ) then
    return;
  end if;


  return query

  select
    sw.season_id,
    sw.place,
    sw.user_id,
    p.username,
    sw.final_gp,
    sw.accuracy,
    sw.predictions_count,
    sw.prize_title_snapshot,
    sw.prize_description_snapshot

  from public.season_winners as sw

  join public.profiles as p
    on p.id = sw.user_id

  where sw.season_id = p_season_id

  order by
    sw.place asc;

end;
$function$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.get_finished_seasons()
from public;

grant execute
on function public.get_finished_seasons()
to anon, authenticated;


revoke all
on function public.get_season_winners(bigint)
from public;

grant execute
on function public.get_season_winners(bigint)
to anon, authenticated;