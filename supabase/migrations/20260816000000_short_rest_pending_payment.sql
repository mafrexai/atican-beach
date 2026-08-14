-- Defer a short rest's timer until MafrexPay payment is actually confirmed,
-- instead of starting it the moment front desk creates the booking (which
-- shortchanged the guest for however long the scan-to-pay checkout took).
-- Cash short rests are unaffected — payment is immediate, so the timer still
-- starts at creation.

ALTER TABLE public.room_short_rests ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE public.room_short_rests ALTER COLUMN ends_at DROP NOT NULL;

ALTER TABLE public.room_short_rests DROP CONSTRAINT IF EXISTS room_short_rests_status_check;
ALTER TABLE public.room_short_rests ADD CONSTRAINT room_short_rests_status_check
  CHECK (status IN ('pending_payment', 'active', 'completed', 'cancelled'));

-- A room is unavailable for another short rest whether the existing one is
-- already running or still waiting on payment.
DROP INDEX IF EXISTS idx_room_short_rests_one_active_per_room;
CREATE UNIQUE INDEX idx_room_short_rests_one_active_per_room
  ON public.room_short_rests(room_id) WHERE status IN ('pending_payment', 'active');

CREATE INDEX IF NOT EXISTS idx_room_short_rests_pending_created
  ON public.room_short_rests(status, created_at) WHERE status = 'pending_payment';

CREATE OR REPLACE FUNCTION public.create_short_rest_atomic(
  p_room_id UUID,
  p_booking_reference TEXT,
  p_confirmation_code TEXT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_price NUMERIC,
  p_duration_minutes INTEGER,
  p_payment_status TEXT,
  p_payment_reference TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_booking_id UUID;
  v_short_rest_id UUID;
  v_email TEXT;
  v_now TIMESTAMPTZ := now();
  v_ends_at TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;

  IF trim(COALESCE(p_guest_name, '')) = '' THEN RAISE EXCEPTION 'GUEST_NAME_REQUIRED'; END IF;
  IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 15 OR p_duration_minutes > 480 THEN
    RAISE EXCEPTION 'INVALID_DURATION';
  END IF;
  IF p_payment_status NOT IN ('paid', 'unpaid') THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('short-rest-room:' || p_room_id::TEXT));

  -- Self-heal: free a room whose previous short rest already timed out, or
  -- whose payment was never completed, so front desk isn't blocked waiting
  -- on the cron sweep to catch up.
  UPDATE public.room_short_rests SET status = 'completed'
  WHERE room_id = p_room_id AND status = 'active' AND ends_at <= v_now;
  UPDATE public.room_short_rests SET status = 'cancelled'
  WHERE room_id = p_room_id AND status = 'pending_payment' AND created_at <= v_now - interval '15 minutes';

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND is_active = TRUE FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  IF v_room.status <> 'available' OR v_room.housekeeping_status <> 'available' THEN
    RAISE EXCEPTION 'ROOM_NOT_READY';
  END IF;
  IF EXISTS (SELECT 1 FROM public.room_short_rests WHERE room_id = p_room_id AND status IN ('active', 'pending_payment')) THEN
    RAISE EXCEPTION 'ROOM_ON_SHORT_REST';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.item_id = p_room_id AND bi.item_type = 'room'
      AND b.checked_in_at IS NOT NULL AND b.checked_out_at IS NULL
  ) THEN RAISE EXCEPTION 'ROOM_OCCUPIED'; END IF;

  v_email := lower(trim(COALESCE(NULLIF(trim(p_guest_email), ''),
    (SELECT contact_email FROM public.resort_settings WHERE id = 1),
    'aticanbeachresort716@gmail.com')));

  INSERT INTO public.bookings (
    booking_reference, confirmation_code, user_id, guest_name, guest_email, guest_phone,
    total_amount, status, payment_status, payment_reference, check_in_date, check_out_date,
    special_requests, created_by, booking_type
  ) VALUES (
    p_booking_reference, p_confirmation_code, p_user_id, trim(p_guest_name), v_email,
    NULLIF(trim(p_guest_phone), ''), p_price, CASE WHEN p_payment_status = 'paid' THEN 'confirmed' ELSE 'pending' END,
    p_payment_status, NULLIF(trim(p_payment_reference), ''), v_now::DATE, v_now::DATE,
    'Short rest — ' || p_duration_minutes || ' minutes', p_user_id, 'short_rest'
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items(booking_id, item_type, item_id, quantity, price_at_booking, start_date, end_date, metadata)
  VALUES (v_booking_id, 'room', p_room_id, 1, p_price, v_now::DATE, v_now::DATE,
    jsonb_build_object('short_rest', true, 'duration_minutes', p_duration_minutes));

  -- Cash is already paid, so the clock starts now. MafrexPay bookings stay
  -- 'pending_payment' (no timer yet) until the trigger below activates them.
  IF p_payment_status = 'paid' THEN
    v_ends_at := v_now + make_interval(mins => p_duration_minutes);
    INSERT INTO public.room_short_rests (room_id, booking_id, price, duration_minutes, status, started_at, ends_at, created_by)
    VALUES (p_room_id, v_booking_id, p_price, p_duration_minutes, 'active', v_now, v_ends_at, p_user_id)
    RETURNING id INTO v_short_rest_id;
  ELSE
    INSERT INTO public.room_short_rests (room_id, booking_id, price, duration_minutes, status, started_at, ends_at, created_by)
    VALUES (p_room_id, v_booking_id, p_price, p_duration_minutes, 'pending_payment', NULL, NULL, p_user_id)
    RETURNING id INTO v_short_rest_id;
  END IF;

  INSERT INTO public.booking_activity_log(booking_id, user_id, action, details)
  VALUES (v_booking_id, p_user_id, 'short_rest_started',
    jsonb_build_object('room_id', p_room_id, 'price', p_price, 'duration_minutes', p_duration_minutes, 'payment_status', p_payment_status));
  INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
  VALUES (p_user_id, 'front_desk', 'short_rest_started',
    'Started short rest for room ' || v_room.room_number || ' (' || p_duration_minutes || ' min)',
    'booking', 'info', 'booking', v_booking_id,
    jsonb_build_object('room_id', p_room_id, 'price', p_price, 'duration_minutes', p_duration_minutes));

  RETURN jsonb_build_object(
    'short_rest_id', v_short_rest_id, 'booking_id', v_booking_id, 'reference', p_booking_reference,
    'room_number', v_room.room_number, 'started_at', v_now, 'ends_at', v_ends_at, 'guest_email', v_email
  );
END;
$$;

-- A short rest can be ended (cancelled) while still pending_payment, not
-- just while active — front desk needs a way to bail on a guest who never
-- pays without waiting on the 15-minute self-heal/cron window.
CREATE OR REPLACE FUNCTION public.end_short_rest_atomic(
  p_short_rest_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rest public.room_short_rests%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_was_active BOOLEAN;
BEGIN
  IF p_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;

  SELECT * INTO v_rest FROM public.room_short_rests WHERE id = p_short_rest_id FOR UPDATE;
  IF v_rest.id IS NULL THEN RAISE EXCEPTION 'SHORT_REST_NOT_FOUND'; END IF;
  IF v_rest.status NOT IN ('active', 'pending_payment') THEN RAISE EXCEPTION 'SHORT_REST_NOT_ACTIVE'; END IF;
  v_was_active := v_rest.status = 'active';

  UPDATE public.room_short_rests SET status = CASE WHEN v_was_active THEN 'completed' ELSE 'cancelled' END,
    updated_at = v_now WHERE id = p_short_rest_id;

  SELECT * INTO v_room FROM public.rooms WHERE id = v_rest.room_id FOR UPDATE;
  -- Only a room that was actually used needs cleaning; a cancelled,
  -- never-paid reservation didn't touch the room.
  IF v_was_active THEN
    UPDATE public.rooms SET housekeeping_status = 'dirty', housekeeping_updated_at = v_now,
      housekeeping_updated_by = p_user_id WHERE id = v_rest.room_id;
  END IF;

  UPDATE public.bookings SET status = CASE WHEN v_was_active THEN 'completed' ELSE 'cancelled' END, updated_at = v_now
  WHERE id = v_rest.booking_id AND status <> 'cancelled';

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
    VALUES (p_user_id, 'front_desk', CASE WHEN v_was_active THEN 'short_rest_ended' ELSE 'short_rest_cancelled' END,
      (CASE WHEN v_was_active THEN 'Ended' ELSE 'Cancelled' END) || ' short rest for room ' || COALESCE(v_room.room_number, ''),
      'booking', 'info', 'booking', v_rest.booking_id,
      jsonb_build_object('room_id', v_rest.room_id, 'short_rest_id', p_short_rest_id));
  END IF;

  RETURN jsonb_build_object('short_rest_id', p_short_rest_id, 'room_id', v_rest.room_id, 'ended_at', v_now);
END;
$$;

-- Fires when a booking's payment is confirmed. For a short rest waiting on
-- payment, this is what actually starts its clock.
CREATE OR REPLACE FUNCTION public.activate_short_rest_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_was_paid BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_was_paid := OLD.payment_status = 'paid';
  END IF;

  IF NEW.booking_type = 'short_rest' AND NEW.payment_status = 'paid' AND NOT v_was_paid THEN
    UPDATE public.room_short_rests
    SET status = 'active', started_at = v_now, ends_at = v_now + make_interval(mins => duration_minutes), updated_at = v_now
    WHERE booking_id = NEW.id AND status = 'pending_payment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_activate_short_rest ON public.bookings;
CREATE TRIGGER bookings_activate_short_rest
AFTER INSERT OR UPDATE OF payment_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.activate_short_rest_on_payment();

-- Sweeps timed-out active short rests (unchanged) and also cancels
-- short rests that have been waiting on payment too long, freeing the room.
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

  UPDATE public.room_short_rests SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending_payment' AND created_at <= now() - interval '15 minutes';
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  RETURN v_count + v_cancelled;
END;
$$;
