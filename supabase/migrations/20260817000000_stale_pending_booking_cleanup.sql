-- Cancels bookings that have sat unpaid/pending long enough to be considered
-- abandoned (a failed or never-started checkout, or leftover test data),
-- freeing the room they were holding: check_room_availability() counts any
-- 'pending' booking against a room's date range, so a stale one makes that
-- room look unavailable for overlapping dates even though rooms.status
-- itself never changed. Cancelling (not deleting) is what keeps MafrexAI
-- property sync correct — the status change flows through the existing
-- bookings_property_sync_outbox trigger the same as any other update, so
-- the cancellation reaches MafrexAI on the next sync run automatically.
--
-- Two grace windows, gated on whether a payment attempt was ever started:
--   - payment_initialized_at set (checkout was actually opened) and 2+ hours
--     old: the guest almost certainly abandoned it.
--   - payment_initialized_at never set (booking created "pay later", e.g. a
--     walk-in front desk deliberately left unpaid) and 24+ hours old: a
--     genuine pay-later hold shouldn't need more than a day of grace.
-- short_rest bookings are excluded — they're already covered by
-- expire_short_rests()'s own pending_payment timeout, fixed below to also
-- cancel the companion booking row (it previously only cancelled the
-- room_short_rests row, leaving the booking itself stuck at 'pending').
CREATE OR REPLACE FUNCTION public.expire_stale_pending_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH stale AS (
    UPDATE public.bookings SET status = 'cancelled', updated_at = now()
    WHERE status = 'pending' AND payment_status = 'unpaid' AND booking_type <> 'short_rest'
      AND (
        (payment_initialized_at IS NOT NULL AND payment_initialized_at <= now() - interval '2 hours')
        OR (payment_initialized_at IS NULL AND created_at <= now() - interval '24 hours')
      )
    RETURNING id
  )
  INSERT INTO public.booking_activity_log(booking_id, action, details)
  SELECT id, 'auto_cancelled_stale_pending', jsonb_build_object('reason', 'no payment completed within the grace window') FROM stale;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_pending_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_pending_bookings() TO service_role;

-- Fix: a short rest that timed out while still pending_payment only had its
-- own room_short_rests row cancelled, leaving the companion bookings row
-- stuck at status='pending' forever (and never reflecting as cancelled in
-- MafrexAI property sync either, since nothing ever updated it).
CREATE OR REPLACE FUNCTION public.expire_short_rests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INTEGER := 0;
  v_cancelled INTEGER;
BEGIN
  FOR v_id IN SELECT id FROM public.room_short_rests WHERE status = 'active' AND ends_at <= now() LOOP
    PERFORM public.end_short_rest_atomic(v_id, NULL);
    v_count := v_count + 1;
  END LOOP;

  WITH stale AS (
    UPDATE public.room_short_rests SET status = 'cancelled', updated_at = now()
    WHERE status = 'pending_payment' AND created_at <= now() - interval '15 minutes'
    RETURNING booking_id
  )
  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
  WHERE id IN (SELECT booking_id FROM stale) AND status <> 'cancelled';
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  RETURN v_count + v_cancelled;
END;
$$;
