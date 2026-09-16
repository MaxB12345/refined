# Sculpted by Ruby

The Sculpted by Ruby booking website is built with Next.js, Tailwind CSS,
Supabase, and Cloudflare Workers.

## Local development

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public Supabase values in `.env.local` are required when Supabase-backed
features are used. They are intentionally not committed.

## Checks

```bash
npm run check
```

## Cloudflare deployment

The application deploys as a Cloudflare Worker using OpenNext. It is not a
static export because authentication and bookings require server rendering.

Authenticate Wrangler, then create the R2 bucket used by the OpenNext cache:

```bash
npx wrangler login
npx wrangler r2 bucket create sculpted-by-ruby-opennext-cache
```

Set the three public values in the Cloudflare build environment and Worker
variables, then run:

```bash
npm run check:cloudflare
npm run preview:cloudflare
npm run deploy:cloudflare
```

The public values are safe to expose, but must be available during the
Next.js/Cloudflare build because `NEXT_PUBLIC_*` values are bundled into the
browser assets:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The Worker also needs the values at runtime for dynamic server-rendered pages.
Do not put service-role, Resend, or Meta credentials in these variables.

## Supabase database

The database schema and editable placeholder content live in `supabase/`.
Local development requires Docker and the Supabase CLI:

```bash
npx supabase start
npx supabase db reset
```

For a hosted project, authenticate and link the local project before pushing
the migration history:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npm run deploy:supabase
```

The `gallery` storage bucket is created by the migration and is limited to
JPEG, PNG, WebP, and AVIF images up to 10 MiB. RLS policies for public content,
customers, and admins are defined in the authentication migration.

`supabase/seed.sql` is used by local resets. Hosted projects do not run the
seed automatically; run it once in the Supabase SQL editor if the placeholder
treatments, hours, profile, and gallery content are wanted.

## Authentication setup

Customer access uses passwordless email OTP. Admin sign-in does not create new
users; the admin must first exist in Supabase Auth and be added to
`public.admin_users` from the Supabase SQL editor:

```sql
insert into public.admin_users (user_id, display_name)
values ('your-auth-user-uuid', 'Ruby');
```

For a hosted project, copy `supabase/templates/magic_link.html` into the
Supabase Auth email template for “Magic Link or OTP”. Configure the production
site URL and redirect allow-list to include `/account` and `/admin`.

## Booking engine

The booking migration exposes only the operations needed by the next backend
layer:

- `get_available_slots` is safe for public availability lookup.
- `book_appointment` is restricted to the Supabase service role.
- `cancel_customer_appointment` and `reschedule_customer_appointment` require an authenticated customer.

The database validates treatment duration, working hours, blocked times, the
24-hour customer policy, and overlapping appointments inside the transaction.

## Edge Functions

The server-side API lives in `supabase/functions/`:

- `public-api/availability` gets safe time-slot data.
- `public-api/book` creates an appointment through the service role.
- `public-api/confirmation` returns non-sensitive confirmation details.
- `customer-api/appointments` lists the signed-in customer's appointments.
- `customer-api/profile` reads or updates the signed-in customer's profile.
- `customer-api/cancel` and `customer-api/reschedule` enforce customer rules.
- `admin-api` provides authenticated CRUD for business records and admin appointment actions.

Run the functions locally with the Supabase stack:

```bash
npx supabase functions serve
```

Deploy them to a linked hosted project with:

```bash
npx supabase functions deploy public-api
npx supabase functions deploy customer-api
npx supabase functions deploy admin-api
```

Notification secrets are configured separately with `supabase secrets set`.

## Customer booking flow

The `/book` route loads active treatments, requests UK-local availability from
`public-api/availability`, and submits the final details to
`public-api/book`. The confirmation route uses the returned public token and
only displays non-sensitive appointment details.

## Customer portal

Signed-in customers can use `/account` to view upcoming, completed, and
cancelled appointments, update their name and phone number, cancel within the
configured policy, or reschedule through live availability. Individual
appointment management is available at `/account/appointments/[id]`.

## Admin workspace

The protected `/admin` route provides calendar and CRUD panels for appointments,
treatments, working hours, blocked times, customers, business profile/settings,
and gallery records. Appointment deletion is represented as cancellation and
customer deletion anonymises historical data.

## Notifications

Booking creation attempts confirmation delivery through Resend and the Meta
WhatsApp Cloud API from the Edge Functions only. Configure the production
secrets in Supabase, never in the browser:

```bash
npx supabase secrets set \
  RESEND_API_KEY=your-resend-key \
  RESEND_FROM_EMAIL="Sculpted by Ruby <bookings@example.com>" \
  PUBLIC_SITE_URL=https://your-domain.example \
  WHATSAPP_ACCESS_TOKEN=your-meta-token \
  WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id \
  WHATSAPP_TEMPLATE_NAME=sculpted_by_ruby_booking_confirmation \
  WHATSAPP_TEMPLATE_LANGUAGE=en_GB
```

The WhatsApp template must be approved in Meta and accept seven body text
parameters: customer name, treatment, date, time, duration, price, and the
confirmation URL. A notification failure does not roll back a valid booking;
the attempt result is stored on the appointment for admin visibility.

## Production checklist

- Configure Supabase Auth Site URL and redirect URLs for the Cloudflare domain.
- Configure Supabase Auth SMTP and copy the OTP template from `supabase/templates/magic_link.html`.
- Create the beautician Auth user and insert its UUID into `public.admin_users`.
- Verify the `gallery` Storage bucket and its admin policies.
- Set Resend and Meta secrets in Supabase Edge Functions.
- Verify the Resend sender domain and Meta WhatsApp template.
- Run one public booking, customer portal, admin CRUD, cancellation, and rescheduling smoke test.
- Test a booking conflict and the 24-hour cancellation boundary.
- Confirm customer data is not returned by anonymous REST requests.
- Configure Cloudflare custom domain, DNS, R2 bucket, and Worker variables.
- Enable production backups and review Supabase logs after the first live booking.

Cloudflare currently reports an advisory that Next.js Node.js Proxy support is
experimental in OpenNext. The build and Wrangler dry run pass, but this should
be monitored during the first production deployment.
