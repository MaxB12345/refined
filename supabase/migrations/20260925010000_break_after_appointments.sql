-- A break after every appointment (default 15 minutes) for the beautician to reset.
--
-- Each appointment records the break it was booked with and the moment the beautician is
-- free again (`occupied_until`). The no-overlap constraint now covers the break too, so
-- nothing — including direct inserts — can be booked inside another appointment's break.
--
-- Availability also becomes anchored: besides the regular grid, a start time is offered at
-- the exact moment each appointment's break ends (and each block of time off ends), so the
-- next free time moves as bookings are made instead of waiting for the next grid mark.

alter table public.business_settings
  add column buffer_minutes smallint not null default 15
    check (buffer_minutes between 0 and 120);

comment on column public.business_settings.buffer_minutes is
  'Break after each appointment before the next one can start.';

alter table public.appointments
  add column buffer_minutes smallint not null default 0
    check (buffer_minutes between 0 and 120),
  add column occupied_until timestamptz;

-- Existing bookings keep their current footprint (no break) so none of them conflict;
-- availability still leaves the current break after them (see available_slots_for_duration).
alter table public.appointments disable trigger appointments_set_updated_at;
update public.appointments set occupied_until = ends_at;
alter table public.appointments enable trigger appointments_set_updated_at;

alter table public.appointments
  alter column occupied_until set not null,
  add constraint appointments_occupied_matches_buffer check (
    occupied_until = ends_at + (buffer_minutes * interval '1 minute')
  );

-- New bookings and reschedules take the break currently configured.
create or replace function public.set_appointment_occupied_until()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at then
    new.buffer_minutes := coalesce(
      (select settings.buffer_minutes from public.business_settings settings where settings.id = true),
      0
    );
  end if;
  new.occupied_until := new.ends_at + make_interval(mins => new.buffer_minutes);
  return new;
end;
$$;

revoke all on function public.set_appointment_occupied_until() from public, anon, authenticated;

create trigger appointments_set_occupied_until
  before insert or update on public.appointments
  for each row execute function public.set_appointment_occupied_until();

alter table public.appointments drop constraint appointments_no_confirmed_overlap;

alter table public.appointments
  add constraint appointments_no_overlap_including_break
  exclude using gist (
    tstzrange(starts_at, occupied_until, '[)') with &&
  ) where (status in ('confirmed', 'completed'));

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
  break_after interval;
  today_local date;
  working_period record;
  candidate record;
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
    coalesce(minimum_booking_notice_minutes, 0),
    make_interval(mins => coalesce(buffer_minutes, 0))
    into business_timezone, slot_interval, minimum_notice, break_after
  from public.business_settings settings
  where settings.id = true;

  business_timezone := coalesce(business_timezone, 'Europe/London');
  slot_interval := coalesce(slot_interval, 15);
  minimum_notice := coalesce(minimum_notice, 0);
  break_after := coalesce(break_after, interval '0');
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

    -- Candidate starts: the regular grid, plus the moment each booking's break ends and
    -- each block of time off ends that day.
    for candidate in
      select distinct minute_of_day
      from (
        select generate_series(
          period_start_minutes,
          period_end_minutes - p_duration_minutes,
          slot_interval
        ) as minute_of_day
        union
        select (extract(hour from free_at) * 60 + extract(minute from free_at))::integer
        from (
          select greatest(appointment.occupied_until, appointment.ends_at + break_after)
              at time zone business_timezone as free_at
          from public.appointments appointment
          where appointment.status in ('confirmed', 'completed')
            and (p_exclude_appointment_id is null or appointment.id <> p_exclude_appointment_id)
            and appointment.ends_at >= (p_date::timestamp at time zone business_timezone) - interval '1 day'
            and appointment.starts_at < ((p_date + 1)::timestamp at time zone business_timezone)
          union all
          select blocked.ends_at at time zone business_timezone
          from public.blocked_times blocked
          where blocked.ends_at >= (p_date::timestamp at time zone business_timezone)
            and blocked.starts_at < ((p_date + 1)::timestamp at time zone business_timezone)
        ) freed
        where free_at::date = p_date
      ) candidates
      where minute_of_day between period_start_minutes and period_end_minutes - p_duration_minutes
      order by minute_of_day
    loop
      slot_start := (p_date::timestamp + make_interval(mins => candidate.minute_of_day)) at time zone business_timezone;
      slot_end := slot_start + make_interval(mins => p_duration_minutes);

      if slot_start >= now() + make_interval(mins => minimum_notice)
        and not exists (
          select 1
          from public.blocked_times blocked
          where tstzrange(blocked.starts_at, blocked.ends_at, '[)')
            && tstzrange(slot_start, slot_end, '[)')
        )
        -- The new appointment plus its break must not touch another appointment plus its
        -- break. Older bookings made before breaks existed still get the current break.
        and not exists (
          select 1
          from public.appointments appointment
          where appointment.status in ('confirmed', 'completed')
            and (p_exclude_appointment_id is null
              or appointment.id <> p_exclude_appointment_id)
            and tstzrange(
                appointment.starts_at,
                greatest(appointment.occupied_until, appointment.ends_at + break_after),
                '[)'
              )
              && tstzrange(slot_start, slot_end + break_after, '[)')
        ) then
        starts_at := slot_start;
        ends_at := slot_end;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;
