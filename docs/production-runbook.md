# Production Runbook

## 1. Supabase

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npm run deploy:supabase
```

The migration creates the schema, RLS policies, booking functions, and gallery
bucket. Run `supabase/seed.sql` in the hosted SQL editor only if the placeholder
content is wanted.

Create an Auth user for Ruby, then add the UUID in the SQL editor:

```sql
insert into public.admin_users (user_id, display_name)
values ('auth-user-uuid', 'Ruby');
```

Configure Auth Site URL and redirect URLs for:

- `https://your-domain.example/account`
- `https://your-domain.example/admin`

Configure SMTP and the Magic Link or OTP template. The local template is at
`supabase/templates/magic_link.html`.

## 2. Provider Secrets

Set Edge Function secrets without committing them:

```bash
npx supabase secrets set \
  RESEND_API_KEY=... \
  RESEND_FROM_EMAIL="Sculpted by Ruby <bookings@your-domain.example>" \
  PUBLIC_SITE_URL=https://your-domain.example \
  WHATSAPP_ACCESS_TOKEN=... \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_TEMPLATE_NAME=sculpted_by_ruby_booking_confirmation \
  WHATSAPP_TEMPLATE_LANGUAGE=en_GB
```

The Resend domain must be verified. The WhatsApp template must be approved and
match the seven body parameters documented in the main README.

## 3. Cloudflare

Create the cache bucket once:

```bash
npx wrangler login
npx wrangler r2 bucket create sculpted-by-ruby-opennext-cache
```

Set these public values in the CI build environment and Cloudflare Worker
variables:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Deploy after the values are available:

```bash
npm run check:cloudflare
npm run deploy:cloudflare
```

Attach the production domain to the `sculpted-by-ruby` Worker and add it to
Supabase Auth's allowed URLs.

## 4. Smoke Test

- Open the public home and treatments pages.
- Book a future appointment and confirm the email and WhatsApp messages.
- Sign in as the customer and verify the appointment appears.
- Verify customer cancellation is rejected inside 24 hours.
- Verify customer rescheduling updates the slot.
- Sign in as Ruby and create, edit, reschedule, and cancel an appointment.
- Edit a treatment and confirm its public page updates.
- Block a time and confirm it disappears from public availability.
- Confirm anonymous REST requests cannot read customers or appointments.
