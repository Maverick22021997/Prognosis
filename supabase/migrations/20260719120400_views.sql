begin;

-- ============================================================
-- PROGNOSIS
-- 005_views.sql
-- Read models for frontend and public platform pages
-- ============================================================


-- ============================================================
-- 1. PUBLIC LEADERBOARD
-- ============================================================

create or replace view public.v_leaderboard
with (security_invoker = true)
as
select
  p.id as user_id,
  p.nickname,
  p.avatar_url,
  p.reputation,

  s.id as season_id,
  s.title as season_title,
  s.slug as season_slug,
  s.start_at as season_start_at,
  s.end_at as season_end_at,
  s.status as season_status,
  s.minimum_predictions_for_prize,

  uss.gp_balance,
  uss.gp_locked,

  uss.gp_balance + uss.gp_locked
    as total_capital,

  uss.predictions_count,
  uss.resolved_predictions_count,
  uss.correct_predictions_count,

  case
    when uss.resolved_predictions_count = 0
      then 0::numeric
    else round(
      (
        uss.correct_predictions_count::numeric
        / uss.resolved_predictions_count::numeric
      ) * 100,
      2
    )
  end as accuracy_percent,

  uss.current_streak,
  uss.best_streak,
  uss.capital_reached_at,

  (
    uss.resolved_predictions_count
    >= s.minimum_predictions_for_prize
  ) as eligible_for_prize,

  row_number() over (
    partition by uss.season_id
    order by
      uss.gp_balance + uss.gp_locked desc,

      case
        when uss.resolved_predictions_count = 0
          then 0::numeric
        else
          uss.correct_predictions_count::numeric
          / uss.resolved_predictions_count::numeric
      end desc,

      uss.resolved_predictions_count desc,
      uss.capital_reached_at asc,
      p.id asc
  ) as leaderboard_position

from public.user_season_stats uss

join public.profiles p
  on p.id = uss.user_id

join public.seasons s
  on s.id = uss.season_id;



comment on view public.v_leaderboard is
  'Public seasonal leaderboard ordered by total capital, accuracy, resolved predictions and capital achievement time.';



-- ============================================================
-- 2. PUBLIC EVENT LIST
-- ============================================================

create or replace view public.v_events
with (security_invoker = true)
as
select
  e.id,
  e.season_id,

  e.category_id,
  c.code as category_code,
  c.name as category_name,
  c.icon as category_icon,

  e.title,
  e.slug,
  e.description,

  e.source_name,
  e.source_url,
  e.resolution_rule,

  e.publish_at,
  e.prediction_close_at,
  e.expected_resolution_at,
  e.resolved_at,

  e.status,
  e.result,

  e.cancel_reason,
  e.is_featured,

  e.predictions_count,
  e.volume_gp,

  ep.yes_pool,
  ep.no_pool,

  ep.yes_pool + ep.no_pool
    as total_pool,

 public.calculate_prediction_odds(
  ep.yes_pool,
  ep.no_pool,
  'yes'::public.prediction_side,
  1
) as yes_odds,

public.calculate_prediction_odds(
  ep.yes_pool,
  ep.no_pool,
  'no'::public.prediction_side,
  1
) as no_odds,

  e.created_by,
  e.resolved_by,

  e.created_at,
  e.updated_at,

  (
    e.status = 'active'
    and e.publish_at <= now()
    and e.prediction_close_at > now()
  ) as prediction_available,

  greatest(
    extract(
      epoch from (
        e.prediction_close_at - now()
      )
    )::bigint,
    0
  ) as seconds_until_close

from public.events e

join public.event_categories c
  on c.id = e.category_id

join public.event_pools ep
  on ep.event_id = e.id;



comment on view public.v_events is
  'Public event list with categories, pools, calculated odds and prediction availability.';



-- ============================================================
-- 3. ACTIVE SEASON
-- ============================================================

create or replace view public.v_active_season
with (security_invoker = true)
as
select
  s.id,
  s.title,
  s.slug,
  s.description,

  s.start_at,
  s.end_at,
  s.status,

  s.starting_balance,
  s.minimum_predictions_for_prize,

  s.created_at,
  s.updated_at,
  s.closed_at,

  greatest(
    extract(
      epoch from (
        s.end_at - now()
      )
    )::bigint,
    0
  ) as seconds_until_end

from public.seasons s

where s.status = 'active';



comment on view public.v_active_season is
  'Current active season with frontend countdown data.';



-- ============================================================
-- 4. PUBLIC USER SEASON STATISTICS
-- ============================================================

create or replace view public.v_user_statistics
with (security_invoker = true)
as
select
  p.id as user_id,
  p.nickname,
  p.avatar_url,
  p.reputation,

  s.id as season_id,
  s.title as season_title,
  s.slug as season_slug,
  s.status as season_status,

  uss.gp_balance,
  uss.gp_locked,

  uss.gp_balance + uss.gp_locked
    as total_capital,

  uss.predictions_count,
  uss.resolved_predictions_count,
  uss.correct_predictions_count,

  case
    when uss.resolved_predictions_count = 0
      then 0::numeric
    else round(
      (
        uss.correct_predictions_count::numeric
        / uss.resolved_predictions_count::numeric
      ) * 100,
      2
    )
  end as accuracy_percent,

  uss.current_streak,
  uss.best_streak,
  uss.emergency_bonus_used,
  uss.capital_reached_at,

  uss.created_at,
  uss.updated_at

from public.user_season_stats uss

join public.profiles p
  on p.id = uss.user_id

join public.seasons s
  on s.id = uss.season_id;



comment on view public.v_user_statistics is
  'Public user statistics for each platform season.';



-- ============================================================
-- 5. CURRENT USER PREDICTIONS
-- ============================================================

create or replace view public.v_my_predictions
with (security_invoker = true)
as
select
  pr.id as prediction_id,

  pr.user_id,
  pr.season_id,
  pr.event_id,

  e.title as event_title,
  e.slug as event_slug,
  e.status as event_status,
  e.result as event_result,
  e.prediction_close_at as event_prediction_close_at,
  e.expected_resolution_at as event_expected_resolution_at,

  c.id as category_id,
  c.code as category_code,
  c.name as category_name,
  c.icon as category_icon,

  pr.prediction_side,
  pr.stake_amount,
  pr.odds_at_purchase,
  pr.potential_payout,
  pr.actual_payout,

  pr.status as prediction_status,

  pr.placed_at,
  pr.resolved_at,
  pr.created_at

from public.predictions pr

join public.events e
  on e.id = pr.event_id

join public.event_categories c
  on c.id = e.category_id

where pr.user_id = auth.uid();



comment on view public.v_my_predictions is
  'Authenticated user prediction history with related event and category information.';



-- ============================================================
-- 6. ACCESS RIGHTS
-- ============================================================

revoke all
on public.v_leaderboard
from public;

revoke all
on public.v_events
from public;

revoke all
on public.v_active_season
from public;

revoke all
on public.v_user_statistics
from public;

revoke all
on public.v_my_predictions
from public;



grant select
on public.v_leaderboard
to anon, authenticated;

grant select
on public.v_events
to anon, authenticated;

grant select
on public.v_active_season
to anon, authenticated;

grant select
on public.v_user_statistics
to anon, authenticated;

grant select
on public.v_my_predictions
to authenticated;


commit;