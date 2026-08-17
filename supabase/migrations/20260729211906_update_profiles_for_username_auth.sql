-- =========================================================
-- Обновление профилей для регистрации и входа по username
-- =========================================================


-- ---------------------------------------------------------
-- 1. Удаляем устаревшие поля согласия
-- ---------------------------------------------------------

alter table public.profiles
  drop column if exists terms_accepted,
  drop column if exists terms_accepted_at;


-- ---------------------------------------------------------
-- 2. Заполняем username у старых тестовых пользователей
-- ---------------------------------------------------------
-- Ранее username не передавался при регистрации, поэтому
-- существующим профилям назначается временное уникальное имя.
-- Пользователь впоследствии сможет изменить его в профиле.

update public.profiles
set username =
  'user_' || left(replace(id::text, '-', ''), 12)
where username is null
   or btrim(username) = '';


-- ---------------------------------------------------------
-- 3. Убираем старые ограничения username
-- ---------------------------------------------------------

-- Создано автоматически конструкцией: username text unique
alter table public.profiles
  drop constraint if exists profiles_username_key;

-- Старое ограничение длины: от 3 до 30 символов
alter table public.profiles
  drop constraint if exists profiles_username_length;

-- На случай, если миграция запускается повторно
alter table public.profiles
  drop constraint if exists profiles_username_length_check;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;


-- ---------------------------------------------------------
-- 4. Проверяем существующие username
-- ---------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.profiles
    where username !~ '^[A-Za-z0-9_]{3,20}$'
  ) then
    raise exception
      'В profiles существуют username, не соответствующие формату: 3–20 символов, латинские буквы, цифры и знак подчёркивания.';
  end if;

  if exists (
    select lower(username)
    from public.profiles
    group by lower(username)
    having count(*) > 1
  ) then
    raise exception
      'В profiles существуют повторяющиеся username без учёта регистра.';
  end if;
end;
$$;


-- ---------------------------------------------------------
-- 5. Добавляем новые ограничения username
-- ---------------------------------------------------------

alter table public.profiles
  alter column username set not null;

alter table public.profiles
  add constraint profiles_username_length_check
  check (char_length(username) between 3 and 20);

alter table public.profiles
  add constraint profiles_username_format_check
  check (username ~ '^[A-Za-z0-9_]+$');


-- Username должен быть уникальным без учёта регистра:
-- Evgenii, evgenii и EVGENII считаются одним именем.

create unique index profiles_username_lower_unique
  on public.profiles (lower(username));


-- ---------------------------------------------------------
-- 6. Обновляем функцию автоматического создания профиля
-- ---------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_age_confirmed boolean;
begin
  v_username :=
    nullif(
      btrim(new.raw_user_meta_data ->> 'username'),
      ''
    );

  v_age_confirmed :=
    coalesce(
      (new.raw_user_meta_data ->> 'age_confirmed')::boolean,
      false
    );

  insert into public.profiles (
    id,
    username,
    age_confirmed,
    age_confirmed_at
  )
  values (
    new.id,
    v_username,
    v_age_confirmed,

    case
      when v_age_confirmed
      then coalesce(
        (new.raw_user_meta_data ->> 'age_confirmed_at')::timestamptz,
        now()
      )
      else null
    end
  );

  return new;
end;
$$;