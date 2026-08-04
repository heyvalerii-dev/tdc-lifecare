# Online Booking & Payment Portal

A mobile-first Next.js application for a psychology clinic. Clients self-book and pay online; admins manage schedules, appointments, and clinic settings.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + PostgreSQL)
- **PayMongo** (Hosted Checkout)

## Features

### Client
- Email and Google authentication
- Multi-step booking (psychologist → service → schedule → questionnaire → payment)
- Payment page with copy link, share, and QR code (`/pay/{appointmentId}`)
- Dashboard with upcoming and past appointments

### Admin
- Dashboard with clinic overview
- Manage psychologists, services, availability, and unavailable blocks
- Manual booking (walk-ins, pro bono, paid outside system)
- Appointment attendance tracking (completed, cancelled, no-show)
- Payments and questionnaire responses
- Editable clinic settings (no code changes required)

### Scheduling Rules
- Asia/Manila (PHT) timezone as source of truth
- Minimum advance booking hours (configurable)
- Payment hold with automatic slot release on expiry
- Overlap prevention across appointments, buffers, and unavailable blocks

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a [Supabase](https://supabase.com) project
2. Run migrations in `supabase/migrations/` (in order)
3. Run `supabase/seed.sql` for sample data
4. Enable Google OAuth in Supabase Auth settings
5. Add redirect URL: `http://localhost:3000/auth/callback`

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase and PayMongo credentials.

### 4. Create an admin user

After signing up, promote a user to admin in the Supabase SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## PayMongo Deployment Checklist

Use this checklist when enabling real PayMongo Hosted Checkout in local or production environments.

### Required environment variables

Copy `.env.example` to `.env.local` (or set the same keys in your host) and fill in:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | Public app origin used for checkout success/cancel return URLs (no trailing slash) |
| `PAYMONGO_SECRET_KEY` | Yes (when enabled) | PayMongo secret API key (`sk_test_…` or `sk_live_…`) |
| `PAYMONGO_WEBHOOK_SECRET` | Yes (when enabled) | Webhook signing secret (`whsk_…`) from the PayMongo dashboard |
| `PAYMONGO_ENABLED` | Yes | Feature flag — only the string `true` enables real checkout; any other value = Demo Mode |
| `CRON_SECRET` | Yes | Bearer token for `GET /api/cron/expire-payments` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (checkout persistence, webhooks, cron) |

Restart the Next.js server after changing any of these values.

### Feature flag: `PAYMONGO_ENABLED`

- `PAYMONGO_ENABLED=true` — create real PayMongo Checkout Sessions; process webhooks; confirm via webhook (source of truth).
- Any other value (including `false`, unset, or typos like `TRUE`) — **Demo Mode**: no PayMongo API calls; create-checkout returns a local success URL and simulates confirmation; incoming webhooks are acknowledged but ignored.

Switching modes only requires changing `PAYMONGO_ENABLED` and restarting the server.

### Creating a Checkout webhook

1. Open the [PayMongo Dashboard](https://dashboard.paymongo.com) → **Developers** → **Webhooks**.
2. Create a webhook for **Checkout** / Hosted Checkout events.
3. Subscribe at least to payment-paid for checkout sessions (this app handles `checkout_session.payment.paid` / `checkout.session.payment.paid`).
4. Other event types are acknowledged and ignored (no error), so PayMongo will not retry-storm on unused events.

### Webhook secret

1. After creating the webhook, copy the **webhook secret** (`whsk_…`).
2. Set it as `PAYMONGO_WEBHOOK_SECRET` in the environment that receives webhook POSTs.
3. The app verifies the `Paymongo-Signature` header (`t` + raw body → `te` / `li`). Do not strip or re-encode the request body.

Use the **test** secret with `sk_test_…` keys, and the **live** secret with `sk_live_…` keys. Do not mix modes.

### Registering the webhook URL

PayMongo must be able to reach your public HTTPS endpoint:

```
POST https://<your-host>/api/webhooks/paymongo
```

Register that exact path in the webhook settings. No auth query params — signature verification is the gate.

### ngrok instructions (local development)

1. Run the app locally: `npm run dev` (default `http://localhost:3000`).
2. Start ngrok (or similar) tunneling to port 3000:

```bash
ngrok http 3000
```

3. Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok-free.app`).
4. Set in `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
PAYMONGO_ENABLED=true
```

5. In PayMongo, register the webhook URL:

```
https://abc123.ngrok-free.app/api/webhooks/paymongo
```

6. Restart `npm run dev` so `NEXT_PUBLIC_APP_URL` and keys reload.
7. Complete a test booking → Pay securely → pay in PayMongo test checkout → confirm the webhook hits ngrok and the appointment becomes confirmed after return-URL polling.

Update the PayMongo webhook URL whenever the ngrok hostname changes.

### Production webhook URL

In production, register:

```
https://<your-production-domain>/api/webhooks/paymongo
```

Also set:

```bash
NEXT_PUBLIC_APP_URL=https://<your-production-domain>
PAYMONGO_ENABLED=true
PAYMONGO_SECRET_KEY=sk_live_…
PAYMONGO_WEBHOOK_SECRET=whsk_…
```

Ensure the production host allows `POST` to `/api/webhooks/paymongo` without blocking PayMongo IPs or requiring cookies.

### Cron setup

Pending payment holds must expire so slots are released. Configure a scheduler (e.g. Vercel Cron, GitHub Actions, or an external cron) to call:

```
GET https://<your-host>/api/cron/expire-payments
Authorization: Bearer <CRON_SECRET>
```

Recommended cadence: every 15 minutes.

The job:

- Expires appointments still `pending_payment` after `payment_due_at`
- Expires matching `pending` payment rows
- Releases the slot (expired appointments are ignored by scheduling)
- Logs a `payment_expired` activity entry

It does **not** cancel PayMongo Checkout Sessions.

### Test checklist before production

- [ ] Migrations applied through `018_paymongo_webhook_foundation.sql` (and earlier)
- [ ] All required env vars set; `NEXT_PUBLIC_APP_URL` matches the public origin (HTTPS in prod)
- [ ] `PAYMONGO_ENABLED=false` locally confirms Demo Mode still books and “pays” without PayMongo
- [ ] `PAYMONGO_ENABLED=true` with **test** keys creates a real Checkout Session and redirects to PayMongo
- [ ] Cancel on PayMongo returns to the app (`?payment=cancelled` / `?cancelled=true`) and allows **Pay again**
- [ ] Successful test payment: webhook received, signature accepted, payment `paid`, appointment `confirmed`
- [ ] Return URL shows confirming/polling UI; confirmation appears only after server status is ready (do not trust the query string alone)
- [ ] `/pay/{appointmentId}` “Pay with PayMongo” uses the same checkout flow as the booking wizard
- [ ] Duplicate webhook delivery does not double-confirm (idempotent event handling)
- [ ] Cron with `Authorization: Bearer {CRON_SECRET}` expires an overdue pending hold and frees the slot
- [ ] Unauthorized cron call returns `401`
- [ ] Live keys + live webhook secret only after test checklist passes; flip `PAYMONGO_ENABLED=true` on production and restart

## Clinic Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `minimum_advance_booking_hours` | 24 | Hours before appointment that public clients may book |
| `payment_hold_hours` | 24 | Hours a pending booking reserves a slot |
| `allow_same_day_booking` | false | Allow same-day public bookings |
| `allow_admin_booking_without_payment` | true | Admins can confirm without online payment |
| `default_timezone` | Asia/Manila | Clinic timezone |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── admin/           # Admin portal
│   ├── client/          # Client portal
│   ├── pay/             # Public payment pages
│   └── api/             # API routes
├── components/
│   ├── admin/
│   ├── booking/
│   ├── layout/
│   ├── payment/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── scheduling.ts
│   ├── clinic-settings.ts
│   └── paymongo/
│       ├── client.ts
│       ├── checkout.ts
│       ├── webhook.ts
│       ├── types.ts
│       └── index.ts
└── types/
supabase/
├── migrations/          # Database schema + RLS
└── seed.sql
```

## License

Private — Psychology Clinic internal use.
