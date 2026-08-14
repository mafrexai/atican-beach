CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'new_booking',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_created_at ON public.staff_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_unemailed ON public.staff_notifications(emailed_at) WHERE emailed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.staff_notification_reads (
  notification_id UUID NOT NULL REFERENCES public.staff_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_notifications FROM anon;
REVOKE ALL ON public.staff_notification_reads FROM anon;

DROP POLICY IF EXISTS "Staff can view booking notifications" ON public.staff_notifications;
CREATE POLICY "Staff can view booking notifications" ON public.staff_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.is_active IS NOT FALSE
        AND user_roles.role IN ('front_desk', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can view their own read receipts" ON public.staff_notification_reads;
CREATE POLICY "Staff can view their own read receipts" ON public.staff_notification_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can mark notifications read" ON public.staff_notification_reads;
CREATE POLICY "Staff can mark notifications read" ON public.staff_notification_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.is_active IS NOT FALSE
        AND user_roles.role IN ('front_desk', 'manager', 'admin')
    )
  );

-- Fires for every path a booking can become paid/confirmed through (guest self-serve,
-- AI concierge, front-desk walk-in, MafrexAI sync) without needing an app-level hook in each.
CREATE OR REPLACE FUNCTION public.notify_staff_of_confirmed_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_was_paid BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_was_paid := OLD.payment_status = 'paid';
  END IF;

  IF NEW.payment_status = 'paid' AND NOT v_was_paid THEN
    INSERT INTO public.staff_notifications (type, booking_id, title, body)
    VALUES (
      'new_booking',
      NEW.id,
      'New booking confirmed: ' || NEW.booking_reference,
      NEW.guest_name || ' — ₦' || to_char(NEW.total_amount, 'FM999,999,999') ||
        CASE WHEN NEW.check_in_date IS NOT NULL AND NEW.check_out_date IS NOT NULL
          THEN ' — ' || NEW.check_in_date || ' to ' || NEW.check_out_date
          ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_notify_staff ON public.bookings;
CREATE TRIGGER bookings_notify_staff
AFTER INSERT OR UPDATE OF payment_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_of_confirmed_booking();

REVOKE ALL ON FUNCTION public.notify_staff_of_confirmed_booking() FROM PUBLIC;
