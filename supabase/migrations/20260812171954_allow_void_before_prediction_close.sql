-- ============================================================
-- ALLOW VOID / CANCELLED EVENTS BEFORE PREDICTION CLOSE
-- ============================================================

alter table public.events
drop constraint if exists events_resolved_at_valid;


alter table public.events
add constraint events_resolved_at_valid
check (
  resolved_at is null
  or status in (
    'void',
    'cancelled'
  )
  or resolved_at >= prediction_close_at
);