insert into public.profiles (
  id,
  age_confirmed,
  age_confirmed_at,
  terms_accepted,
  terms_accepted_at
)
select
  u.id,

  coalesce(
    (u.raw_user_meta_data ->> 'age_confirmed')::boolean,
    false
  ),

  case
    when coalesce(
      (u.raw_user_meta_data ->> 'age_confirmed')::boolean,
      false
    )
    then coalesce(
      (u.raw_user_meta_data ->> 'age_confirmed_at')::timestamptz,
      u.created_at
    )
    else null
  end,

  coalesce(
    (u.raw_user_meta_data ->> 'terms_accepted')::boolean,
    false
  ),

  case
    when coalesce(
      (u.raw_user_meta_data ->> 'terms_accepted')::boolean,
      false
    )
    then coalesce(
      (u.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz,
      u.created_at
    )
    else null
  end

from auth.users u

where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);