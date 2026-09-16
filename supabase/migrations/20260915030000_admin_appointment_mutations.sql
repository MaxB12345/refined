-- Admin appointment operations used by the authenticated admin API.

create or replace function public.admin_cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns table (
  id uuid,
  status public.appointment_status,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  select appointment.*
    into appointment_record
  from public.appointments appointment
  where appointment.id = p_appointment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Appointment not found';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancellation_reason = nullif(trim(p_reason), ''),
      cancelled_at = coalesce(cancelled_at, now()),
      cancelled_by = (select auth.uid())
  where appointments.id = appointment_record.id
  returning appointments.id, appointments.status, appointments.starts_at, appointments.ends_at
  into id, status, starts_at, ends_at;

  return next;
end;
$$;

create or replace function public.admin_reschedule_appointment(
  p_appointment_id uuid,
  p_date date,
  p_start_time time
)
returns table (
  id uuid,
  status public.appointment_status,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  appointment_record public.appointments%rowtype;
  selected_slot record;
  business_timezone text;
  old_date date;
  requested_start timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  select coalesce(timezone, 'Europe/London')
    into business_timezone
  from public.business_settings settings
  where settings.id = true;
  business_timezone := coalesce(business_timezone, 'Europe/London');

  select appointment.*
    into appointment_record
  from public.appointments appointment
  where appointment.id = p_appointment_id
    and appointment.status = 'confirmed'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Confirmed appointment not found';
  end if;

  old_date := (appointment_record.starts_at at time zone business_timezone)::date;

  if old_date <= p_date then
    perform pg_advisory_xact_lock(hashtextextended('appointment:' || old_date::text, 0));
    if old_date <> p_date then
      perform pg_advisory_xact_lock(hashtextextended('appointment:' || p_date::text, 0));
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('appointment:' || p_date::text, 0));
    perform pg_advisory_xact_lock(hashtextextended('appointment:' || old_date::text, 0));
  end if;

  requested_start := (p_date + p_start_time) at time zone business_timezone;

  select available.starts_at, available.ends_at
    into selected_slot
  from public.get_available_slots(
    appointment_record.treatment_id,
    p_date,
    appointment_record.id
  ) available
  where available.starts_at = requested_start;

  if not found then
    raise exception using errcode = '23P01', message = 'That appointment time is not available';
  end if;

  update public.appointments
  set starts_at = selected_slot.starts_at,
      ends_at = selected_slot.ends_at,
      updated_by = (select auth.uid())
  where appointments.id = appointment_record.id
  returning appointments.id, appointments.status, appointments.starts_at, appointments.ends_at
  into id, status, starts_at, ends_at;

  return next;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'That appointment time is no longer available';
end;
$$;

revoke execute on function public.admin_cancel_appointment(uuid, text)
  from public, anon;
grant execute on function public.admin_cancel_appointment(uuid, text)
  to authenticated;

revoke execute on function public.admin_reschedule_appointment(uuid, date, time)
  from public, anon;
grant execute on function public.admin_reschedule_appointment(uuid, date, time)
  to authenticated;
