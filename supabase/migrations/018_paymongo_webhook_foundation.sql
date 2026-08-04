-- PayMongo Phase 1: lookup safety + webhook idempotency

CREATE UNIQUE INDEX IF NOT EXISTS payments_paymongo_checkout_id_uidx
  ON payments (paymongo_checkout_id)
  WHERE paymongo_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_paymongo_payment_id_uidx
  ON payments (paymongo_payment_id)
  WHERE paymongo_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS paymongo_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS paymongo_webhook_events_processed_at_idx
  ON paymongo_webhook_events (processed_at DESC);

COMMENT ON TABLE paymongo_webhook_events IS
  'Idempotency ledger for PayMongo webhook deliveries (event_id unique).';

ALTER TABLE paymongo_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no client access needed.
CREATE POLICY "Admins can view paymongo webhook events"
  ON paymongo_webhook_events FOR SELECT
  USING (is_admin());
