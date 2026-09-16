-- Safe-to-edit local and first-deployment content.
-- The admin dashboard will manage these records after Section 9.

insert into public.business_settings (
  id,
  timezone,
  slot_interval_minutes,
  cancellation_notice_hours,
  minimum_booking_notice_minutes
)
values (true, 'Europe/London', 15, 24, 0)
on conflict (id) do update set
  timezone = excluded.timezone,
  slot_interval_minutes = excluded.slot_interval_minutes,
  cancellation_notice_hours = excluded.cancellation_notice_hours,
  minimum_booking_notice_minutes = excluded.minimum_booking_notice_minutes;

insert into public.business_profile (
  id,
  business_name,
  beautician_name,
  tagline,
  about_heading,
  about_body,
  contact_email,
  contact_phone,
  location
)
values (
  true,
  'Sculpted by Ruby',
  'Ruby',
  'Beauty, thoughtfully tailored.',
  'A little ritual, just for you.',
  'Sculpted by Ruby is a calm, considered space for modern beauty treatments shaped around you.',
  'hello@sculptedbyruby.example',
  'Contact details coming soon',
  'United Kingdom'
)
on conflict (id) do update set
  business_name = excluded.business_name,
  beautician_name = excluded.beautician_name,
  tagline = excluded.tagline,
  about_heading = excluded.about_heading,
  about_body = excluded.about_body,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  location = excluded.location;

insert into public.treatments (
  name,
  slug,
  description,
  price_pence,
  duration_minutes,
  display_order
)
values
  (
    'Signature Brow Sculpt',
    'signature-brow-sculpt',
    'A tailored brow tidy, shape, and finish designed to frame your features.',
    3500,
    45,
    10
  ),
  (
    'Lash Lift',
    'lash-lift',
    'A softly lifted, defined look for effortlessly polished lashes.',
    4500,
    60,
    20
  ),
  (
    'Skin Reset Facial',
    'skin-reset-facial',
    'A restorative facial ritual to cleanse, replenish, and leave skin luminous.',
    6500,
    75,
    30
  ),
  (
    'Express Dermaplane',
    'express-dermaplane',
    'A precise exfoliating treatment for a smoother, brighter-looking finish.',
    5000,
    45,
    40
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_pence = excluded.price_pence,
  duration_minutes = excluded.duration_minutes,
  display_order = excluded.display_order,
  active = true;

insert into public.working_hours (day_of_week, starts_at, ends_at, is_enabled)
values
  (1, '09:00', '17:00', true),
  (2, '09:00', '17:00', true),
  (3, '09:00', '17:00', true),
  (4, '09:00', '17:00', true),
  (5, '09:00', '17:00', true),
  (6, '09:00', '14:00', true)
on conflict (day_of_week, starts_at, ends_at) do update set
  is_enabled = excluded.is_enabled;

insert into public.gallery_items (
  slug,
  image_url,
  alt_text,
  caption,
  display_order,
  published
)
values
  (
    'soft-light',
    '/gallery/placeholder-01.svg',
    'Soft neutral beauty studio detail',
    'The quiet details matter.',
    10,
    true
  ),
  (
    'warm-ritual',
    '/gallery/placeholder-02.svg',
    'Warm taupe beauty treatment detail',
    'Time set aside for you.',
    20,
    true
  ),
  (
    'quiet-finish',
    '/gallery/placeholder-03.svg',
    'Minimal sculptural beauty detail',
    'Modern beauty, still your own.',
    30,
    true
  )
on conflict (slug) do update set
  image_url = excluded.image_url,
  alt_text = excluded.alt_text,
  caption = excluded.caption,
  display_order = excluded.display_order,
  published = excluded.published;
