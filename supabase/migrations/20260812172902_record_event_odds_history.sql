-- ============================================================
-- EVENT ODDS HISTORY
--
-- После каждого нового прогноза events.predictions_count
-- увеличивается на 1.
--
-- На этом изменении автоматически сохраняем актуальное
-- состояние пула в event_odds_history.
-- ============================================================


create or replace function public.record_event_odds_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pool public.event_pools;

  v_total_pool bigint;

  v_yes_odds numeric(10, 4);
  v_no_odds numeric(10, 4);

  v_yes_probability numeric(7, 3);
  v_no_probability numeric(7, 3);

  v_max_odds numeric;
begin

  -- Историю записываем только если реально изменилось
  -- количество прогнозов.
  if new.predictions_count is not distinct from old.predictions_count then
    return new;
  end if;


  select *
  into v_pool
  from public.event_pools
  where event_id = new.id;


  if not found then
    return new;
  end if;


  v_total_pool :=
    v_pool.yes_pool +
    v_pool.no_pool;


  if v_total_pool <= 0 then
    return new;
  end if;


  select coalesce(
    (
      select
        (value #>> '{}')::numeric
      from public.system_settings
      where key = 'prediction.max_odds'
    ),
    10
  )
  into v_max_odds;


  -- ==========================================================
  -- ODDS
  -- ==========================================================

  v_yes_odds :=
    least(
      v_max_odds,
      greatest(
        1,
        round(
          v_total_pool::numeric /
          v_pool.yes_pool::numeric,
          4
        )
      )
    );


  v_no_odds :=
    least(
      v_max_odds,
      greatest(
        1,
        round(
          v_total_pool::numeric /
          v_pool.no_pool::numeric,
          4
        )
      )
    );


  -- ==========================================================
  -- PROBABILITIES
  -- ==========================================================

  v_yes_probability :=
    round(
      (
        v_pool.yes_pool::numeric /
        v_total_pool::numeric
      ) * 100,
      3
    );


  v_no_probability :=
    round(
      (
        v_pool.no_pool::numeric /
        v_total_pool::numeric
      ) * 100,
      3
    );


  -- ==========================================================
  -- HISTORY POINT
  -- ==========================================================

  insert into public.event_odds_history (
    event_id,

    yes_pool,
    no_pool,
    total_pool,

    yes_odds,
    no_odds,

    yes_probability,
    no_probability,

    predictions_count,

    recorded_at
  )
  values (
    new.id,

    v_pool.yes_pool,
    v_pool.no_pool,
    v_total_pool,

    v_yes_odds,
    v_no_odds,

    v_yes_probability,
    v_no_probability,

    new.predictions_count,

    now()
  );


  return new;

end;
$function$;


-- ============================================================
-- TRIGGER
-- ============================================================

drop trigger if exists
  trg_record_event_odds_history
on public.events;


create trigger
  trg_record_event_odds_history

after update of predictions_count
on public.events

for each row

when (
  old.predictions_count
  is distinct from
  new.predictions_count
)

execute function
  public.record_event_odds_history();


-- ============================================================
-- BACKFILL CURRENT STATE
--
-- Сохраняем одну актуальную точку для существующих событий,
-- если последняя записанная точка уже отличается от текущего
-- состояния пула.
-- ============================================================

insert into public.event_odds_history (
  event_id,

  yes_pool,
  no_pool,
  total_pool,

  yes_odds,
  no_odds,

  yes_probability,
  no_probability,

  predictions_count,

  recorded_at
)
select
  e.id,

  p.yes_pool,
  p.no_pool,

  p.yes_pool + p.no_pool,

  least(
    10,
    greatest(
      1,
      round(
        (p.yes_pool + p.no_pool)::numeric /
        p.yes_pool::numeric,
        4
      )
    )
  ),

  least(
    10,
    greatest(
      1,
      round(
        (p.yes_pool + p.no_pool)::numeric /
        p.no_pool::numeric,
        4
      )
    )
  ),

  round(
    (
      p.yes_pool::numeric /
      (p.yes_pool + p.no_pool)::numeric
    ) * 100,
    3
  ),

  round(
    (
      p.no_pool::numeric /
      (p.yes_pool + p.no_pool)::numeric
    ) * 100,
    3
  ),

  e.predictions_count,

  now()

from public.events e

join public.event_pools p
  on p.event_id = e.id

where not exists (
  select 1
  from public.event_odds_history h

  where h.event_id = e.id

    and h.id = (
      select h2.id
      from public.event_odds_history h2
      where h2.event_id = e.id
      order by h2.recorded_at desc, h2.id desc
      limit 1
    )

    and h.yes_pool = p.yes_pool
    and h.no_pool = p.no_pool
    and h.predictions_count = e.predictions_count
);