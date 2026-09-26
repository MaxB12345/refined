-- Safe-to-edit local and first-deployment content.
-- The admin dashboard manages these records once deployed.

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

delete from public.treatments
where slug in ('signature-brow-sculpt', 'lash-lift', 'skin-reset-facial', 'express-dermaplane');

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
    'Intro Facial',
    'intro-facial',
    'Perfect for new clients. Not sure which treatment is right for your skin? Our Intro Facial is the perfect place to start. This appointment allows extra time for a detailed consultation and skin analysis, where we can discuss your skin concerns, current skincare routine and treatment goals. Following your consultation, we''ll create a personalised treatment plan and select the most appropriate treatment, or combination of treatments, for your skin on the day. Ideal for first-time clients or anyone who would like professional guidance before beginning a regular treatment plan.',
    5000,
    75,
    10
  ),
  (
    'Microneedling',
    'microneedling',
    'Skin renewal, fine lines, texture. Microneedling is a skin-renewing treatment designed to improve the appearance of fine lines, uneven texture and overall skin quality. It works by creating controlled micro-channels in the skin, encouraging the skin''s natural renewal process. Your treatment can be tailored to your individual skin concerns and goals.',
    6500,
    60,
    20
  ),
  (
    'Dermaplaning',
    'dermaplaning',
    'Smooth, fresh, glowing. Dermaplaning gently exfoliates the surface of the skin, removing dead skin cells and fine facial hair. This leaves the skin feeling exceptionally smooth and looking brighter and more refreshed. A great option for anyone wanting a fresh, glowing complexion and beautifully smooth skin.',
    4500,
    60,
    30
  ),
  (
    'Chemical Peel',
    'chemical-peel',
    'Acne, scarring, fine lines, pigmentation. Chemical peels use carefully selected exfoliating solutions to encourage skin renewal and improve the appearance of congestion, acne, post-acne marks, pigmentation, uneven texture and fine lines. The type and strength of peel will be selected according to your individual skin type, concerns and treatment goals. A consultation may be required before treatment.',
    5500,
    60,
    40
  ),
  (
    'High Frequency',
    'high-frequency',
    'Congestion, blemish-prone skin, skin purification. High Frequency is a targeted treatment designed to support congested and blemish-prone skin. It can be used as a standalone treatment or incorporated into a personalised facial. Your treatment will be adapted to your skin''s individual needs.',
    4500,
    60,
    50
  ),
  (
    'Hydra Facial',
    'hydra-facial',
    'Deep cleanse, hydration, glow. A refreshing treatment designed to cleanse, exfoliate and hydrate the skin, leaving your complexion looking fresh, smooth and revitalised. Ideal for congested, dull or dehydrated-looking skin and perfect when you want a refreshed, glowing appearance.',
    4500,
    60,
    60
  ),
  (
    'Luxury Facial',
    'luxury-facial',
    'Relaxation, skin refresh, personalised care. A relaxing and personalised facial designed to leave your skin feeling refreshed, nourished and revitalised. Your treatment can include cleansing, exfoliation, massage, a personalised mask and finishing skincare, depending on your skin''s individual needs.',
    4000,
    45,
    70
  ),
  (
    'LED Facial',
    'led-facial',
    'Sensitive skin, skin support, preparation. A gentle, non-invasive treatment using LED light therapy to support the skin and promote a healthy-looking complexion. Particularly suitable for sensitive skin, LED can be enjoyed as a standalone treatment or incorporated into other facial treatments as part of a personalised skincare plan.',
    3500,
    45,
    80
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
