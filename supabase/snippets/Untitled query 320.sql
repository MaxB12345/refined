select
  u.id as auth_user_id,
  u.email,
  a.user_id as admin_user_id,
  a.display_name
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(u.email) = lower('max_briggs2005@icloud.com');