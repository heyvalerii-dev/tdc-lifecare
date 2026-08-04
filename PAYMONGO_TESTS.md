# PayMongo Manual Test Cases

These tests cover PayMongo Hosted Checkout, webhook processing, payment expiry,
authorization, and non-PayMongo admin bookings.

## Test environment

Unless a test says otherwise:

- Use a non-production Supabase project.
- Apply all migrations, including
  `018_paymongo_webhook_foundation.sql`.
- Set `PAYMONGO_ENABLED=true`.
- Use matching PayMongo **test** credentials:
  `PAYMONGO_SECRET_KEY=sk_test_...` and the test webhook's
  `PAYMONGO_WEBHOOK_SECRET=whsk_...`.
- Set `NEXT_PUBLIC_APP_URL` to the public app origin. For local testing, use an
  HTTPS tunnel such as ngrok.
- Register `POST /api/webhooks/paymongo` as the PayMongo test webhook URL and
  subscribe to `checkout_session.payment.paid`.
- Use a unique appointment for each test unless replaying the same event is the
  purpose of the test.
- Record the appointment ID, payment ID, Checkout Session ID, and webhook event
  ID so database changes can be verified.

Useful records to inspect:

```sql
SELECT id, status, payment_due_at, updated_at
FROM appointments
WHERE id = '<appointment_id>';

SELECT id, appointment_id, status, method, amount_cents, paid_at,
       expires_at, paymongo_checkout_id, paymongo_payment_id, metadata
FROM payments
WHERE appointment_id = '<appointment_id>';

SELECT action, source, metadata, created_at
FROM entity_activity
WHERE entity_type = 'appointment'
  AND entity_id = '<appointment_id>'
ORDER BY created_at;

SELECT event_id, event_type, processed_at, metadata
FROM paymongo_webhook_events
WHERE metadata->>'appointment_id' = '<appointment_id>'
ORDER BY processed_at;
```

## 1. Successful payment

### Preconditions

- The client is authenticated and owns the appointment.
- The appointment is `pending_payment`.
- Its payment is `pending`.
- `payment_due_at` is in the future.
- PayMongo test checkout and webhook delivery are configured.

### Steps

1. Open the booking payment step or `/pay/<appointment_id>`.
2. Click **Pay with PayMongo** (the booking wizard may show **Pay securely**).
3. Confirm the browser is redirected to the PayMongo-hosted `checkout_url`.
4. Complete checkout with a PayMongo test payment method that succeeds.
5. Allow PayMongo to redirect back to the application.
6. Observe the confirming state while the browser polls the server.
7. Wait for the paid webhook to be delivered.

### Expected database state

- `appointments.status = 'confirmed'`.
- The matching payment has:
  - `status = 'paid'`
  - `method = 'paymongo'`
  - non-null `paid_at`
  - non-null `paymongo_checkout_id`
  - `paymongo_payment_id` populated when supplied by PayMongo
- One `paymongo_webhook_events` row exists for the paid event ID.
- A `payment_confirmed` activity exists with `source = 'PayMongo'`.
- The earlier `checkout_created` activity remains in the timeline.

### Expected UI

- The return page initially shows **Confirming your payment...**.
- It changes to the existing confirmed/payment-received state only after the
  status endpoint reports the payment paid and appointment confirmed.
- The payment button is no longer displayed.

## 2. Cancel payment

### Preconditions

- The appointment is `pending_payment`.
- Its payment is `pending`.
- The payment deadline is in the future.

### Steps

1. Click **Pay with PayMongo**.
2. On the hosted checkout, cancel payment or follow PayMongo's cancel action.
3. Confirm that PayMongo returns to `/pay/<appointment_id>?cancelled=true`
   (or the booking wizard's cancel URL).

### Expected database state

- `appointments.status` remains `pending_payment`.
- `payments.status` remains `pending`.
- `paid_at` and `paymongo_payment_id` remain null.
- The Checkout Session ID created before cancellation remains in
  `payments.paymongo_checkout_id`.
- No `payment_confirmed` activity is added.
- No paid webhook event is recorded.

### Expected UI

- The page shows **Payment cancelled**.
- It states that no charge was made.
- A **Pay again** action is available.
- The appointment is not shown as confirmed.

## 3. Failed card

### Preconditions

- The appointment and payment are pending and unexpired.
- PayMongo test mode is enabled.
- A PayMongo-documented test card/payment method that produces a failed payment
  is available. Use the current value from PayMongo's test-mode documentation.

### Steps

1. Start checkout from the payment page.
2. Enter the PayMongo test payment details that trigger failure.
3. Submit the payment.
4. Verify the hosted checkout displays the decline/failure.
5. Return to or reopen `/pay/<appointment_id>` without completing a successful
   payment.

### Expected database state

- `appointments.status` remains `pending_payment`.
- `payments.status` remains `pending` because this integration only treats the
  checkout paid event as confirmation.
- `paid_at` and `paymongo_payment_id` remain null.
- `paymongo_checkout_id` remains associated with the attempted Checkout
  Session.
- No `payment_confirmed` activity is added.

### Expected UI

- PayMongo displays the failed-payment message in hosted checkout.
- The application does not show a confirmed state.
- On the payment page, **Pay with PayMongo** remains available while the hold is
  valid.

## 4. Retry payment

### Preconditions

- A previous checkout was cancelled, failed, or abandoned.
- The appointment remains `pending_payment`.
- The payment remains `pending`.
- The payment deadline has not passed.

### Steps

1. Return to `/pay/<appointment_id>`.
2. Click **Pay again** after cancellation, or click **Pay with PayMongo** after
   reopening the page.
3. Verify a new request is sent to `POST /api/payments/create-checkout`.
4. Verify the browser is redirected to a fresh PayMongo Checkout Session.
5. Complete the new checkout successfully.

### Expected database state

- Before successful payment:
  - appointment remains `pending_payment`
  - payment remains `pending`
  - `paymongo_checkout_id` is replaced with the fresh Checkout Session ID
- A new `checkout_created` activity is added for each successful checkout
  creation.
- After the fresh checkout's paid webhook:
  - appointment is `confirmed`
  - payment is `paid`
  - webhook event is recorded once
  - `payment_confirmed` activity is added

### Expected UI

- Retry disables itself while checkout creation is in progress.
- The browser redirects to the new hosted checkout URL.
- After successful payment and webhook processing, the page shows the
  confirmation state and removes the payment CTA.

## 5. Expired appointment

### Preconditions

- The appointment is `pending_payment`.
- The payment is `pending`.
- `payment_due_at` is in the past.
- `CRON_SECRET` is configured.

### Steps

1. Run the expiry cron with the correct bearer token:

   ```bash
   curl -i \
     -H "Authorization: Bearer $CRON_SECRET" \
     https://<host>/api/cron/expire-payments
   ```

2. Reload `/pay/<appointment_id>`.
3. Verify the same schedule can be offered again by the booking flow, subject to
   the normal availability rules.

### Expected database state

- `appointments.status = 'expired'`.
- The matching pending payment has `status = 'expired'`.
- A `payment_expired` activity exists with:
  - `source = 'System'`
  - metadata changing `pending_payment` to `expired`
- Re-running the cron sequentially does not add another expiry activity for the
  already-expired appointment.
- The Checkout Session is not cancelled through PayMongo.

### Expected UI

- The payment page shows **This payment link has expired.**
- No **Pay with PayMongo** button is displayed.
- The appointment is not shown as confirmed.

## 6. Webhook replay

### Preconditions

- A successful paid webhook has already been processed.
- The original webhook event ID and exact payload are available.

### Steps

1. In PayMongo's webhook delivery UI, resend the same event, ensuring it retains
   the same event ID. Alternatively, replay the exact payload with a valid
   signature generated using the webhook secret.
2. Record both webhook responses.
3. Inspect appointment, payment, activity, and webhook ledger records.

### Expected database state

- The appointment remains `confirmed`.
- The payment remains `paid`; `paid_at` is not cleared.
- Exactly one `paymongo_webhook_events` row exists for the event ID.
- The replay does not create another `payment_confirmed` activity.
- No duplicate appointment or payment is created.

### Expected UI

- The appointment remains in the existing confirmation state.
- No visible duplicate event, status change, or payment prompt appears.

## 7. Invalid webhook

### Preconditions

- `PAYMONGO_ENABLED=true`.
- The webhook route is publicly reachable.
- Prepare a webhook-shaped JSON body.

### Steps

1. POST the body with a missing or deliberately invalid
   `Paymongo-Signature` header:

   ```bash
   curl -i \
     -X POST \
     -H "Content-Type: application/json" \
     -H "Paymongo-Signature: t=0,te=invalid" \
     --data '{"data":{"id":"evt_invalid","attributes":{"type":"checkout_session.payment.paid"}}}' \
     https://<host>/api/webhooks/paymongo
   ```

2. Inspect the HTTP response and relevant database rows.

### Expected database state

- No appointment status changes.
- No payment status changes.
- No `paymongo_webhook_events` row is inserted for `evt_invalid`.
- No `payment_confirmed` activity is added.

### Expected UI

- No client-facing state changes.
- The payment page continues to reflect the server's previous appointment and
  payment state.
- The webhook request receives HTTP `401` with an invalid-signature error.

## 8. Unauthorized checkout

### Preconditions

- An appointment exists in `pending_payment` with a pending payment.
- Prepare:
  - a browser/API client with no authenticated session
  - a different non-admin client who does not own the appointment

### Steps

1. Without authentication, call:

   ```bash
   curl -i \
     -X POST \
     -H "Content-Type: application/json" \
     --data '{"appointment_id":"<appointment_id>","return_to":"pay"}' \
     https://<host>/api/payments/create-checkout
   ```

2. Repeat while authenticated as a different non-admin client.
3. Confirm neither response contains a `checkout_url`.

### Expected database state

- For both attempts, appointment and payment statuses are unchanged.
- `paymongo_checkout_id` is not changed.
- No `checkout_created` or `payment_confirmed` activity is added.
- No webhook event row is created.

### Expected UI

- An unauthenticated or non-owner payment attempt does not redirect to PayMongo.
- The shared checkout UI shows **Couldn't start payment. Please try again.**
- The API returns `401 Unauthorized` without a session and `403 Forbidden` for
  an authenticated non-owner who is not an admin.

## 9. Admin cash booking

### Preconditions

- Sign in as an admin.
- Clinic setting `allow_admin_booking_without_payment` is enabled.
- Choose an available slot and `cash` as the payment method.

### Steps

1. Create a manual booking from the admin booking flow.
2. Select **Cash** as the payment method.
3. Complete the booking.
4. Open the appointment and payment record.

### Expected database state

- `appointments.status = 'confirmed'`.
- `appointments.payment_due_at IS NULL`.
- The matching payment has:
  - `status = 'paid'`
  - `method = 'cash'`
  - non-null `paid_at`
- `paymongo_checkout_id` and `paymongo_payment_id` remain null.
- An `appointment_manual_booking` activity exists with
  `source = 'Manual Booking'`.
- No PayMongo webhook ledger row is created.

### Expected UI

- The appointment displays as confirmed.
- No PayMongo payment button is shown.
- Admin details show the cash payment method and paid state.

## 10. Payment after expiration

### Preconditions

- Start a real PayMongo checkout while the appointment is still
  `pending_payment`; record its Checkout Session ID.
- Before completing checkout, let the deadline pass and run the expiry cron.
- Verify the appointment and payment are `expired`.
- Keep the original hosted Checkout Session open. The application intentionally
  does not cancel it.

### Steps

1. Complete payment in the original PayMongo Checkout Session after expiry.
2. Wait for the valid paid webhook.
3. Inspect the appointment, payment, webhook ledger, and activity metadata.
4. Reload `/pay/<appointment_id>`.

### Expected database state

- The appointment remains `expired`; the webhook must not revive it.
- The payment changes from `expired` to `paid` for financial audit.
- The payment has:
  - non-null `paid_at`
  - `method = 'paymongo'`
  - the PayMongo payment ID when supplied
  - metadata containing:
    - `paid_while_appointment_status = 'expired'`
    - `requires_manual_review = true`
- The paid webhook event is recorded in `paymongo_webhook_events`.
- A `payment_confirmed` activity with `source = 'PayMongo'` is logged with
  `requiresManualReview = true` and a reason explaining that the expired
  appointment was not confirmed.
- The existing `payment_expired` activity remains.

### Expected UI

- The appointment is not shown as confirmed and the slot is not automatically
  restored to it.
- No payment button is shown because the payment is paid and the appointment is
  expired.
- Staff must resolve the late payment manually (for example, refund or arrange
  another appointment); the application does not automatically revive the
  expired booking.
