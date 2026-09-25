-- Availability is computed from an explicit duration so every caller agrees on how long
-- the appointment is:
--   * new bookings use the treatment's duration, read under a share lock so it can't change
--     between the availability check and the insert;
--   * reschedules use the appointment's own booked duration, so editing or hiding a treatment
--     no longer breaks rescheduling (previously the new slot used the treatment's current
--     duration and failed the appointments_duration_matches_range check, and hidden
--     treatments had no slots at all).

create or replace function public.available_slots_for_duration(
  p_date date,
  p_duration_minutes integer,
  p_exclude_appointment_id uuid default null
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  business_timezone text;
  slot_interval integer;
  minimum_notice integer;
  today_local date;
  working_period record;
  slot_minutes integer;
  period_start_minutes integer;
  period_end_minutes integer;
  slot_start timestamptz;
  slot_end timestamptz;
begin
  if p_date is null or p_duration_minutes is null or p_duration_minutes <= 0 then
    return;
  end if;

  select
    coalesce(timezone, 'Europe/London'),
    coalesce(slot_interval_minutes, 15),
    coalesce(minimum_booking_notice_minutes, 0)
    into business_timezone, slot_interval, minimum_notice
  from public.business_settings settings
  where settings.id = true;

  business_timezone := coalesce(business_timezone, 'Europe/London');
  slot_interval := coalesce(slot_interval, 15);
  minimum_notice := coalesce(minimum_notice, 0);
  today_local := (now() at time zone business_timezone)::date;

  if p_date < today_local then
    return;
  end if;

  for working_period in
    select hours.starts_at as period_starts_at,
      hours.ends_at as period_ends_at
    from public.working_hours hours
    where hours.day_of_week = extract(dow from p_date)::smallint
      and hours.is_enabled
    order by hours.starts_at
  loop
    period_start_minutes :=
      (extract(epoch from working_period.period_starts_at) / 60)::integer;
    period_end_minutes :=
      (extract(epoch from working_period.period_ends_at) / 60)::integer;
    slot_minutes := period_start_minutes;

    while slot_minutes + p_duration_minutes <= period_end_minutes loop
      slot_start := (p_date::timestamp + make_interval(mins => slot_minutes)) at time zone business_timezone;
      -- Derive the end from the absolute start so it always equals start + duration,
      -- matching appointments_duration_matches_range even across a clock change.
      slot_end := slot_start + make_interval(mins => p_duration_minutes);

      if slot_start >= now() + make_interval(mins => minimum_notice)
        and not exists (
          select 1
          from public.blocked_times blocked
          where tstzrange(blocked.starts_at, blocked.ends_at, '[)')
            && tstzrange(slot_start, slot_end, '[)')
        )
        and not exists (
          select 1
          from public.appointments appointment
          where appointment.status in ('confirmed', 'completed')
            and (p_exclude_appointment_id is null
              or appointment.id <> p_exclude_appointment_id)
            and tstzrange(appointment.starts_at, appointment.ends_at, '[)')
              && tstzrange(slot_start, slot_end, '[)')
        ) then
        starts_at := slot_start;
        ends_at := slot_end;
        return next;
      end if;

      slot_minutes := slot_minutes + slot_interval;
    end loop;
  end loop;
end;
$$;

-- Public signature unchanged: slots for an active treatment's current duration.
create or replace function public.get_available_slots(
  p_treatment_id uuid,
  p_date date,
  p_exclude_appointment_id uuid default null
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select available.starts_at, available.ends_at
  from public.treatments treatment
  cross join lateral public.available_slots_for_duration(
    p_date,
    treatment.duration_minutes,
    p_exclude_appointment_id
  ) available
  where treatment.id = p_treatment_id
    and treatment.active;
$$;

create or replace function public.book_appointment(
  p_treatment_id uuid,
  p_date date,
  p_start_time time,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
returns table (
  id uuid,
  public_token uuid,
  customer_id uuid,
  treatment_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  treatment_name text,
  price_pence integer,
  duration_minutes smallint
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  treatment_record public.treatments%rowtype;
  customer_record public.customers%rowtype;
  selected_slot record;
  business_timezone text;
  requested_start timestamptz;
  customer_email text;
  customer_name text;
  customer_phone text;
begin
  customer_name := trim(p_customer_name);
  customer_email := lower(trim(p_customer_email));
  customer_phone := trim(p_customer_phone);

  if customer_name is null or length(customer_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'A valid customer name is required';
  end if;

  if customer_email is null
    or customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'A valid customer email is required';
  end if;

  if customer_phone is null or length(customer_phone) not between 5 and 40 then
    raise exception using errcode = '22023', message = 'A valid customer phone is required';
  end if;

  if p_date is null or p_start_time is null then
    raise exception using errcode = '22023', message = 'An appointment date and time are required';
  end if;

  -- Share lock: the duration, price and name we check against are the ones we store.
  select *
    into treatment_record
  from public.treatments treatment
  where treatment.id = p_treatment_id
    and treatment.active
  for share;

  if not found then
    raise exception using errcode = '22023', message = 'Treatment is unavailable';
  end if;

  select coalesce(timezone, 'Europe/London')
    into business_timezone
  from public.business_settings settings
  where settings.id = true;
  business_timezone := coalesce(business_timezone, 'Europe/London');
  requested_start := (p_date + p_start_time) at time zone business_timezone;

  -- All schedule mutations for a date share this transaction lock.
  perform pg_advisory_xact_lock(
    hashtextextended('appointment:' || p_date::text, 0)
  );

  select available.starts_at, available.ends_at
    into selected_slot
  from public.available_slots_for_duration(p_date, treatment_record.duration_minutes) available
  where available.starts_at = requested_start;

  if not found then
    raise exception using errcode = '23P01', message = 'That appointment time is no longer available';
  end if;

  -- This lock keeps customer upserts safe when the same email books on different dates.
  perform pg_advisory_xact_lock(
    hashtextextended('customer:' || customer_email, 0)
  );

  select *
    into customer_record
  from public.customers
  where lower(trim(email)) = customer_email
    and deleted_at is null
  for update;

  if not found then
    insert into public.customers (full_name, email, phone)
    values (customer_name, customer_email, customer_phone)
    returning * into customer_record;
  else
    update public.customers
    set full_name = customer_name,
        phone = customer_phone
    where customers.id = customer_record.id
    returning * into customer_record;
  end if;

  insert into public.appointments (
    customer_id,
    treatment_id,
    starts_at,
    ends_at,
    treatment_name,
    price_pence,
    duration_minutes,
    created_by
  )
  values (
    customer_record.id,
    treatment_record.id,
    selected_slot.starts_at,
    selected_slot.ends_at,
    treatment_record.name,
    treatment_record.price_pence,
    treatment_record.duration_minutes,
    (select auth.uid())
  )
  returning
    appointments.id,
    appointments.public_token,
    appointments.customer_id,
    appointments.treatment_id,
    appointments.starts_at,
    appointments.ends_at,
    appointments.status,
    appointments.treatment_name,
    appointments.price_pence,
    appointments.duration_minutes
  into id, public_token, customer_id, treatment_id, starts_at, ends_at,
    status, treatment_name, price_pence, duration_minutes;

  return next;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'That appointment time is no longer available';
end;
$$;

create or replace function public.reschedule_customer_appointment(
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
  notice_hours integer;
  old_date date;
  requested_start timestamptz;
begin
  select coalesce(timezone, 'Europe/London'), coalesce(cancellation_notice_hours, 24)
    into business_timezone, notice_hours
  from public.business_settings settings
  where settings.id = true;
  business_timezone := coalesce(business_timezone, 'Europe/London');
  notice_hours := coalesce(notice_hours, 24);

  if p_date is null or p_start_time is null then
    raise exception using errcode = '22023', message = 'A new date and time are required';
  end if;

  select appointment.*
    into appointment_record
  from public.appointments appointment
  where appointment.id = p_appointment_id
    and appointment.customer_id = public.current_customer_id()
  for update;

  if not found or appointment_record.status <> 'confirmed' then
    raise exception using errcode = '42501', message = 'Appointment cannot be rescheduled';
  end if;

  if appointment_record.starts_at <= now() + make_interval(hours => notice_hours) then
    raise exception using errcode = '42501',
      message = format('Appointments can only be rescheduled at least %s hours in advance', notice_hours);
  end if;

  old_date := (appointment_record.starts_at at time zone business_timezone)::date;

  -- Lock both dates in a deterministic order to avoid reschedule deadlocks.
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

  if requested_start <= now() + make_interval(hours => notice_hours) then
    raise exception using errcode = '42501',
      message = format('The new appointment time must be at least %s hours away', notice_hours);
  end if;

  -- Keep the length the customer booked, even if the treatment has since changed.
  select available.starts_at, available.ends_at
    into selected_slot
  from public.available_slots_for_duration(
    p_date,
    appointment_record.duration_minutes,
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

  if p_date is null or p_start_time is null then
    raise exception using errcode = '22023', message = 'A new date and time are required';
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

  -- Keep the booked length, even if the treatment has since been edited or hidden.
  select available.starts_at, available.ends_at
    into selected_slot
  from public.available_slots_for_duration(
    p_date,
    appointment_record.duration_minutes,
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

-- Internal helper: only reachable through the security-definer functions above.
revoke execute on function public.available_slots_for_duration(date, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.available_slots_for_duration(date, integer, uuid)
  to service_role;
