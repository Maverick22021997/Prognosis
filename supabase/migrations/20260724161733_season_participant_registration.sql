-- =========================================================
-- Автоматическое участие пользователя в активном сезоне
-- =========================================================

create or replace function public.ensure_active_season_participant(
  p_user_id uuid
)
returns public.season_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons;
  v_participant public.season_participants;
begin

  select *
  into v_season
  from public.seasons
  where status = 'active'
  order by start_at desc
  limit 1;

  if not found then
    raise exception 'ACTIVE_SEASON_NOT_FOUND';
  end if;

  insert into public.season_participants (
    season_id,
    user_id,
    balance_gp
  )
  values (
    v_season.id,
    p_user_id,
    v_season.starting_balance
  )
  on conflict (season_id, user_id)
  do nothing;

  select *
  into v_participant
  from public.season_participants
  where season_id = v_season.id
    and user_id = p_user_id;

  return v_participant;
end;
$$;


revoke all
on function public.ensure_active_season_participant(uuid)
from public;

grant execute
on function public.ensure_active_season_participant(uuid)
to authenticated;