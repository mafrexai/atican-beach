ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS payment_order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_order_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_initialized_at TIMESTAMPTZ;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_provider_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_provider_check
  CHECK (payment_provider IN ('paystack', 'mafrexpay'));

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_order_reference_unique
  ON public.bookings (payment_order_reference)
  WHERE payment_order_reference IS NOT NULL;

COMMENT ON COLUMN public.bookings.payment_provider IS
  'Payment integration used for this booking. Existing bookings default to direct Paystack.';
COMMENT ON COLUMN public.bookings.payment_order_reference IS
  'MafrexPay order reference used for server-side status reconciliation.';
