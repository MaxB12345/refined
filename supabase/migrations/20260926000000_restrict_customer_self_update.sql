-- Customers may update their own row through the REST API, but only name and phone.
-- Changing email would let a signed-in customer claim a future booker's appointments.

-- Security invoker on purpose: current_user must reflect the caller, so updates made by
-- security definer functions (e.g. link_customer_to_auth) and the service role pass through.
create or replace function public.guard_customer_self_update()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.email is distinct from old.email
      or new.auth_user_id is distinct from old.auth_user_id
      or new.deleted_at is distinct from old.deleted_at
      or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '42501',
        message = 'Only name and phone can be changed';
    end if;
  end if;

  return new;
end;
$$;

create trigger customers_guard_self_update
  before update on public.customers
  for each row
  execute function public.guard_customer_self_update();
