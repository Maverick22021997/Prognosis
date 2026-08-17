-- Публичный профиль пользователя PROGNOSIS.
-- Авторизация и пароль хранятся отдельно в auth.users.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  username text unique,

  age_confirmed boolean not null default false,
  age_confirmed_at timestamptz,

  terms_accepted boolean not null default false,
  terms_accepted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_length
    check (
      username is null
      or char_length(username) between 3 and 30
    ),

  constraint profiles_age_confirmation
    check (
      age_confirmed = false
      or age_confirmed_at is not null
    ),

  constraint profiles_terms_confirmation
    check (
      terms_accepted = false
      or terms_accepted_at is not null
    )
);


-- =========================================================
-- Автоматическое создание профиля после регистрации
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    age_confirmed,
    age_confirmed_at,
    terms_accepted,
    terms_accepted_at
  )
  values (
    new.id,

    coalesce(
      (new.raw_user_meta_data ->> 'age_confirmed')::boolean,
      false
    ),

    case
      when coalesce(
        (new.raw_user_meta_data ->> 'age_confirmed')::boolean,
        false
      )
      then coalesce(
        (new.raw_user_meta_data ->> 'age_confirmed_at')::timestamptz,
        now()
      )
      else null
    end,

    coalesce(
      (new.raw_user_meta_data ->> 'terms_accepted')::boolean,
      false
    ),

    case
      when coalesce(
        (new.raw_user_meta_data ->> 'terms_accepted')::boolean,
        false
      )
      then coalesce(
        (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz,
        now()
      )
      else null
    end
  );

  return new;
end;
$$;


create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();


-- =========================================================
-- updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_updated_at();


-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.profiles enable row level security;


-- Пользователь может видеть собственный профиль.
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);


-- Пользователь может изменять собственный профиль.
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);