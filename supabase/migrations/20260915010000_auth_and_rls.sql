-- Authentication helpers and least-privilege policies.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select id
  from public.customers
  where auth_user_id = (select auth.uid())
    and deleted_at is null
  limit 1;
$$;

-- Link a verified Auth email to its existing booking customer record.
create or replace function public.link_customer_to_auth()
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  linked_customer_id uuid;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email
    into current_email
  from auth.users
  where id = auth.uid();

  if current_email is null then
    return null;
  end if;

  select id
    into linked_customer_id
  from public.customers
  where lower(trim(email)) = lower(trim(current_email))
    and deleted_at is null
    and (auth_user_id is null or auth_user_id = auth.uid())
  limit 1;

  if linked_customer_id is null then
    return null;
  end if;

  update public.customers
  set auth_user_id = auth.uid()
  where id = linked_customer_id;

  return linked_customer_id;
end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_customer_id() from public;
revoke all on function public.link_customer_to_auth() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_customer_id() to authenticated;
grant execute on function public.link_customer_to_auth() to authenticated;

create policy "Public can read business profile"
  on public.business_profile
  for select
  to anon, authenticated
  using (true);

create policy "Admins can manage business profile"
  on public.business_profile
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read active treatments"
  on public.treatments
  for select
  to anon, authenticated
  using (active = true);

create policy "Admins can manage treatments"
  on public.treatments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read published gallery items"
  on public.gallery_items
  for select
  to anon, authenticated
  using (published = true);

create policy "Admins can manage gallery items"
  on public.gallery_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage business settings"
  on public.business_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage working hours"
  on public.working_hours
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage blocked times"
  on public.blocked_times
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers can read their own profile"
  on public.customers
  for select
  to authenticated
  using (id = public.current_customer_id());

create policy "Customers can update their own profile"
  on public.customers
  for update
  to authenticated
  using (id = public.current_customer_id())
  with check (
    id = public.current_customer_id()
    and auth_user_id = (select auth.uid())
    and deleted_at is null
  );

create policy "Admins can manage customers"
  on public.customers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers can read their own appointments"
  on public.appointments
  for select
  to authenticated
  using (customer_id = public.current_customer_id());

create policy "Admins can manage appointments"
  on public.appointments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can read their admin membership"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "Admins can manage admin memberships"
  on public.admin_users
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Anyone can view gallery images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'gallery');

create policy "Admins can upload gallery images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "Admins can update gallery images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "Admins can delete gallery images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());
