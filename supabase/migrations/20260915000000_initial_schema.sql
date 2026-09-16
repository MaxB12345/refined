-- Core data model for a single-beautician booking business.
-- Availability and appointment mutations are added in later migrations.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

do $$
begin
  create type public.appointment_status as enum (
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.business_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Europe/London',
  slot_interval_minutes smallint not null default 15
    check (slot_interval_minutes between 5 and 60),
  cancellation_notice_hours smallint not null default 24
    check (cancellation_notice_hours between 0 and 168),
  minimum_booking_notice_minutes integer not null default 0
    check (minimum_booking_notice_minutes between 0 and 43200),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_profile (
  id boolean primary key default true check (id),
  business_name text not null default 'Sculpted by Ruby',
  beautician_name text not null default 'Ruby',
  tagline text,
  about_heading text,
  about_body text,
  contact_email text,
  contact_phone text,
  location text,
  instagram_url text,
  whatsapp_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_profile_email_format check (
    contact_email is null
    or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create table public.treatments (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  price_pence integer not null check (price_pence >= 0),
  duration_minutes smallint not null check (duration_minutes between 5 and 1440),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text not null
    check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (length(trim(phone)) between 5 and 40),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index customers_email_unique_idx
  on public.customers (lower(trim(email)))
  where deleted_at is null;

create index customers_auth_user_id_idx
  on public.customers (auth_user_id)
  where auth_user_id is not null;

create table public.working_hours (
  id uuid primary key default extensions.gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint working_hours_order check (ends_at > starts_at),
  constraint working_hours_slot_unique unique (day_of_week, starts_at, ends_at)
);

create index working_hours_day_idx
  on public.working_hours (day_of_week, starts_at)
  where is_enabled;

create table public.blocked_times (
  id uuid primary key default extensions.gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blocked_times_order check (ends_at > starts_at),
  constraint blocked_times_not_in_past check (ends_at > created_at)
);

alter table public.blocked_times
  add constraint blocked_times_no_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  );

create index blocked_times_range_idx
  on public.blocked_times using gist (tstzrange(starts_at, ends_at, '[)'));

create table public.appointments (
  id uuid primary key default extensions.gen_random_uuid(),
  public_token uuid not null unique default extensions.gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  treatment_id uuid not null references public.treatments (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  treatment_name text not null,
  price_pence integer not null check (price_pence >= 0),
  duration_minutes smallint not null check (duration_minutes between 5 and 1440),
  customer_note text,
  admin_note text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  confirmation_email_sent_at timestamptz,
  confirmation_email_error text,
  confirmation_whatsapp_sent_at timestamptz,
  confirmation_whatsapp_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointments_order check (ends_at > starts_at),
  constraint appointments_duration_matches_range check (
    ends_at = starts_at + (duration_minutes * interval '1 minute')
  ),
  constraint appointments_cancelled_timestamp check (
    status <> 'cancelled' or cancelled_at is not null
  )
);

alter table public.appointments
  add constraint appointments_no_confirmed_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('confirmed', 'completed'));

create index appointments_start_idx
  on public.appointments (starts_at);

create index appointments_customer_start_idx
  on public.appointments (customer_id, starts_at desc);

create index appointments_status_start_idx
  on public.appointments (status, starts_at);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.gallery_items (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  storage_path text,
  image_url text,
  alt_text text not null check (length(trim(alt_text)) between 2 and 200),
  caption text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gallery_items_source check (
    storage_path is not null or image_url is not null
  )
);

create index gallery_items_published_order_idx
  on public.gallery_items (display_order, created_at)
  where published;

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

create trigger business_profile_set_updated_at
  before update on public.business_profile
  for each row execute function public.set_updated_at();

create trigger treatments_set_updated_at
  before update on public.treatments
  for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger working_hours_set_updated_at
  before update on public.working_hours
  for each row execute function public.set_updated_at();

create trigger blocked_times_set_updated_at
  before update on public.blocked_times
  for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create trigger gallery_items_set_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- Keep all business data closed until its explicit policies are added.
alter table public.business_settings enable row level security;
alter table public.business_profile enable row level security;
alter table public.treatments enable row level security;
alter table public.customers enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.appointments enable row level security;
alter table public.admin_users enable row level security;
alter table public.gallery_items enable row level security;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gallery',
  'gallery',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
