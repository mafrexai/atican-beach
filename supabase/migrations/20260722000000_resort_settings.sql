-- Persistent, admin-controlled resort preferences.
CREATE TABLE IF NOT EXISTS public.resort_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  resort_name TEXT NOT NULL CHECK (char_length(resort_name) BETWEEN 2 AND 120),
  contact_email TEXT NOT NULL CHECK (char_length(contact_email) <= 254),
  phone TEXT NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 30),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  paystack_mode TEXT NOT NULL DEFAULT 'test' CHECK (paystack_mode IN ('test', 'live')),
  check_in_time TIME NOT NULL DEFAULT '14:00',
  check_out_time TIME NOT NULL DEFAULT '12:00',
  cancellation_policy_hours INTEGER NOT NULL DEFAULT 24 CHECK (cancellation_policy_hours BETWEEN 0 AND 8760),
  email_new_booking BOOLEAN NOT NULL DEFAULT true,
  email_cancellation BOOLEAN NOT NULL DEFAULT true,
  daily_booking_summary BOOLEAN NOT NULL DEFAULT false,
  payment_confirmation BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.resort_settings (
  id, resort_name, contact_email, phone, currency, paystack_mode,
  check_in_time, check_out_time, cancellation_policy_hours,
  email_new_booking, email_cancellation, daily_booking_summary, payment_confirmation
)
VALUES (
  1, 'Atican Beach Resort & Hotel', 'info@aticanbeachresort.com', '+2349029622583', 'NGN', 'test',
  '14:00', '12:00', 24, true, true, false, true
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.resort_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read resort settings" ON public.resort_settings;
CREATE POLICY "Admins can read resort settings"
  ON public.resort_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update resort settings" ON public.resort_settings;
CREATE POLICY "Admins can update resort settings"
  ON public.resort_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, UPDATE ON public.resort_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.set_resort_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resort_settings_updated_at ON public.resort_settings;
CREATE TRIGGER resort_settings_updated_at
  BEFORE UPDATE ON public.resort_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_resort_settings_updated_at();
