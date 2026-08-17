-- ============================================================
-- FIX events_resolved_at_valid
--
-- Раньше resolved_at должен был быть не раньше
-- prediction_close_at.
--
-- Теперь событие может быть вручную закрыто staff раньше
-- запланированной даты, после чего результат можно определить
-- сразу.
--
-- Поэтому resolved_at больше не сравниваем с
-- prediction_close_at.
--
-- При этом resolved_at допускается только для финальных
-- статусов:
-- resolved / void / cancelled.
-- ============================================================

alter table public.events
drop constraint if exists events_resolved_at_valid;


alter table public.events
add constraint events_resolved_at_valid
check (
  resolved_at is null

  or status in (
    'resolved',
    'void',
    'cancelled'
  )
);