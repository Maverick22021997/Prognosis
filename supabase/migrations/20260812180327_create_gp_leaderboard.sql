-- ============================================================
-- GP LEADERBOARD
--
-- Основной рейтинг сезона строится исключительно по GP.
--
-- Сортировка:
--   1. balance_gp DESC
--   2. accuracy DESC
--   3. resolved_events_count DESC
--   4. participant_updated_at ASC
--
-- Несколько прогнозов пользователя на одном событии
-- агрегируются в один итог события.
-- ============================================================


create or replace view public.v_season_leaderboard
with (security_invoker = true)
as

with prediction_event_results as (

  select
    p.user_id,
    p.season_id,
    p.event_id,

    sum(
      case

        when p.status = 'won'
          then
            coalesce(
              p.actual_payout,
              0
            )
            - p.stake_amount

        when p.status = 'lost'
          then
            -p.stake_amount

        else
          0

      end
    )::bigint
      as event_net_gp

  from public.predictions p

  join public.events e
    on e.id = p.event_id

  where
    e.status = 'resolved'

    and p.status in (
      'won',
      'lost'
    )

  group by
    p.user_id,
    p.season_id,
    p.event_id
),


event_stats as (

  select
    user_id,
    season_id,

    count(*)::integer
      as resolved_events_count,

    count(*) filter (
      where event_net_gp > 0
    )::integer
      as successful_events_count

  from prediction_event_results

  group by
    user_id,
    season_id
),


leaderboard_base as (

  select
    sp.id
      as participant_id,

    sp.season_id,

    sp.user_id,

    pr.username,

    sp.balance_gp,

    coalesce(
      es.resolved_events_count,
      0
    )::integer
      as resolved_events_count,

    coalesce(
      es.successful_events_count,
      0
    )::integer
      as successful_events_count,

    case

      when coalesce(
        es.resolved_events_count,
        0
      ) = 0
        then 0::numeric

      else
        round(
          (
            es.successful_events_count::numeric
            /
            es.resolved_events_count::numeric
          ) * 100,
          2
        )

    end
      as accuracy,

    sp.created_at
      as participant_created_at,

    sp.updated_at
      as participant_updated_at

  from public.season_participants sp

  join public.profiles pr
    on pr.id = sp.user_id

  left join event_stats es
    on es.user_id = sp.user_id
    and es.season_id = sp.season_id
)


select

  row_number() over (
    partition by season_id
    order by
      balance_gp desc,

      accuracy desc,

      resolved_events_count desc,

      participant_updated_at asc,

      user_id asc
  )::bigint
    as rank,

  participant_id,

  season_id,

  user_id,

  username,

  balance_gp,

  accuracy,

  resolved_events_count,

  successful_events_count,

  participant_created_at,

  participant_updated_at

from leaderboard_base;


-- ============================================================
-- PERMISSIONS
-- ============================================================

grant select
on public.v_season_leaderboard
to anon;


grant select
on public.v_season_leaderboard
to authenticated;