begin;

-- ============================================================
-- PROGNOSIS
-- Row Level Security policies
-- ============================================================
-- ============================================================
-- 1. AUTHORIZATION HELPERS
-- ============================================================


-- ------------------------------------------------------------
-- Check whether the current user is authenticated
-- ------------------------------------------------------------

create or replace function public.is_authenticated()
returns boolean
language sql
stable
security invoker
set search_path = ''
as
$$
  select auth.uid() is not null;
$$;


-- ------------------------------------------------------------
-- Check whether the current user is an administrator
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as
$$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
  );
$$;


-- ------------------------------------------------------------
-- Check whether the current user is an administrator
-- or moderator
-- ------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as
$$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'moderator')
  );
$$;
revoke all on function public.is_authenticated() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;


grant execute on function public.is_authenticated()
  to anon, authenticated;


grant execute on function public.is_admin()
  to authenticated;


grant execute on function public.is_staff()
  to authenticated;
  -- ============================================================
-- 2. SCHEMA ACCESS
-- ============================================================

grant usage on schema public
  to anon, authenticated;
  -- ============================================================
-- 3. PUBLIC REFERENCE DATA
-- ============================================================


-- ------------------------------------------------------------
-- Event categories
-- ------------------------------------------------------------

grant select on public.event_categories
  to anon, authenticated;


create policy event_categories_public_select
on public.event_categories
for select
to anon, authenticated
using (
  is_active = true
  or public.is_admin()
);


create policy event_categories_admin_all
on public.event_categories
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
-- ------------------------------------------------------------
-- Seasons
-- ------------------------------------------------------------

grant select on public.seasons
  to anon, authenticated;


grant insert, update, delete on public.seasons
  to authenticated;


create policy seasons_public_select
on public.seasons
for select
to anon, authenticated
using (
  status::text <> 'draft'
  or public.is_admin()
);


create policy seasons_admin_insert
on public.seasons
for insert
to authenticated
with check (
  public.is_admin()
);


create policy seasons_admin_update
on public.seasons
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy seasons_admin_delete
on public.seasons
for delete
to authenticated
using (
  public.is_admin()
);
-- ============================================================
-- 4. USER PROFILES
-- ============================================================

grant select on public.profiles
  to anon, authenticated;


grant insert on public.profiles
  to authenticated;


grant update (
  nickname,
  avatar_url
)
on public.profiles
to authenticated;


create policy profiles_public_select
on public.profiles
for select
to anon, authenticated
using (true);


create policy profiles_user_insert
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role::text = 'user'
  and reputation = 0
);


create policy profiles_user_update
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);
-- ============================================================
-- 5. EVENTS
-- ============================================================

grant select on public.events
  to anon, authenticated;


grant insert, update, delete on public.events
  to authenticated;


create policy events_public_select
on public.events
for select
to anon, authenticated
using (
  (
    status::text not in ('draft')
    and publish_at <= now()
  )
  or public.is_staff()
);


create policy events_staff_insert
on public.events
for insert
to authenticated
with check (
  public.is_staff()
);


create policy events_staff_update
on public.events
for update
to authenticated
using (
  public.is_staff()
)
with check (
  public.is_staff()
);


create policy events_admin_delete
on public.events
for delete
to authenticated
using (
  public.is_admin()
);
-- ------------------------------------------------------------
-- Event pools
-- ------------------------------------------------------------

grant select on public.event_pools
  to anon, authenticated;


create policy event_pools_public_select
on public.event_pools
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_pools.event_id
      and (
        (
          events.status::text <> 'draft'
          and events.publish_at <= now()
        )
        or public.is_staff()
      )
  )
);
-- ============================================================
-- 6. USER SEASON STATISTICS
-- ============================================================

grant select on public.user_season_stats
  to authenticated;


create policy user_season_stats_own_select
on public.user_season_stats
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_staff()
);
-- ============================================================
-- 7. PREDICTIONS
-- ============================================================

grant select on public.predictions
  to authenticated;


create policy predictions_own_select
on public.predictions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_staff()
);
-- ============================================================
-- 8. GP TRANSACTIONS
-- ============================================================

grant select on public.gp_transactions
  to authenticated;


create policy gp_transactions_own_select
on public.gp_transactions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);
-- ============================================================
-- 9. SEASON PRIZES
-- ============================================================

grant select on public.season_prizes
  to anon, authenticated;


grant insert, update, delete on public.season_prizes
  to authenticated;


create policy season_prizes_public_select
on public.season_prizes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.seasons
    where seasons.id = season_prizes.season_id
      and (
        seasons.status::text <> 'draft'
        or public.is_admin()
      )
  )
);


create policy season_prizes_admin_insert
on public.season_prizes
for insert
to authenticated
with check (
  public.is_admin()
);


create policy season_prizes_admin_update
on public.season_prizes
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy season_prizes_admin_delete
on public.season_prizes
for delete
to authenticated
using (
  public.is_admin()
);
-- ------------------------------------------------------------
-- Season winners
-- ------------------------------------------------------------

grant select on public.season_winners
  to anon, authenticated;


create policy season_winners_public_select
on public.season_winners
for select
to anon, authenticated
using (true);
-- ============================================================
-- 10. ACHIEVEMENTS
-- ============================================================

grant select on public.achievements
  to anon, authenticated;


grant insert, update, delete on public.achievements
  to authenticated;


create policy achievements_public_select
on public.achievements
for select
to anon, authenticated
using (
  is_active = true
  or public.is_admin()
);


create policy achievements_admin_insert
on public.achievements
for insert
to authenticated
with check (
  public.is_admin()
);


create policy achievements_admin_update
on public.achievements
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy achievements_admin_delete
on public.achievements
for delete
to authenticated
using (
  public.is_admin()
);
-- ------------------------------------------------------------
-- User achievements
-- ------------------------------------------------------------

grant select on public.user_achievements
  to anon, authenticated;


create policy user_achievements_public_select
on public.user_achievements
for select
to anon, authenticated
using (true);
-- ------------------------------------------------------------
-- Reputation levels
-- ------------------------------------------------------------

grant select on public.reputation_levels
  to anon, authenticated;


grant insert, update, delete on public.reputation_levels
  to authenticated;


create policy reputation_levels_public_select
on public.reputation_levels
for select
to anon, authenticated
using (
  is_active = true
  or public.is_admin()
);


create policy reputation_levels_admin_insert
on public.reputation_levels
for insert
to authenticated
with check (
  public.is_admin()
);


create policy reputation_levels_admin_update
on public.reputation_levels
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy reputation_levels_admin_delete
on public.reputation_levels
for delete
to authenticated
using (
  public.is_admin()
);
-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================

grant select on public.notifications
  to authenticated;


grant update (
  is_read,
  read_at
)
on public.notifications
to authenticated;


create policy notifications_own_select
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);


create policy notifications_own_update
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);
-- ============================================================
-- 12. EVENT SUGGESTIONS
-- ============================================================

grant select, insert on public.event_suggestions
  to authenticated;


grant update on public.event_suggestions
  to authenticated;


create policy event_suggestions_own_select
on public.event_suggestions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_staff()
);


create policy event_suggestions_user_insert
on public.event_suggestions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status::text = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and implemented_event_id is null
);


create policy event_suggestions_staff_update
on public.event_suggestions
for update
to authenticated
using (
  public.is_staff()
)
with check (
  public.is_staff()
);
-- ============================================================
-- 13. USER BANS
-- ============================================================

grant select on public.user_bans
  to authenticated;


grant insert, update on public.user_bans
  to authenticated;


create policy user_bans_own_select
on public.user_bans
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);


create policy user_bans_admin_insert
on public.user_bans
for insert
to authenticated
with check (
  public.is_admin()
);


create policy user_bans_admin_update
on public.user_bans
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
-- ============================================================
-- 14. SECURITY EVENTS
-- ============================================================

grant select on public.user_security_events
  to authenticated;


create policy user_security_events_admin_select
on public.user_security_events
for select
to authenticated
using (
  public.is_admin()
);
-- ============================================================
-- 15. AUDIT LOGS
-- ============================================================

grant select on public.audit_logs
  to authenticated;


create policy audit_logs_admin_select
on public.audit_logs
for select
to authenticated
using (
  public.is_admin()
);
-- ============================================================
-- 16. SYSTEM SETTINGS
-- ============================================================

grant select on public.system_settings
  to anon, authenticated;


grant insert, update, delete on public.system_settings
  to authenticated;


create policy system_settings_public_select
on public.system_settings
for select
to anon, authenticated
using (
  is_public = true
  or public.is_admin()
);


create policy system_settings_admin_insert
on public.system_settings
for insert
to authenticated
with check (
  public.is_admin()
);


create policy system_settings_admin_update
on public.system_settings
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


create policy system_settings_admin_delete
on public.system_settings
for delete
to authenticated
using (
  public.is_admin()
);
-- ============================================================
-- 17. SEQUENCE PERMISSIONS
-- ============================================================

grant usage, select on all sequences in schema public
  to authenticated;
  commit;