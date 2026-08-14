-- Short-rest (hourly) room bookings. A dedicated operational table drives
-- conflict-checking and the front-desk countdown timer; every short rest also
-- gets a companion `bookings` row (booking_type = 'short_rest') so revenue
-- flows through the existing reporting, MafrexAI property sync, and staff
-- notification paths without any changes to those systems.

CREATE TABLE IF NOT EXISTS public.room_short_rests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one active short rest per room at a time — hard DB-level conflict guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_short_rests_one_active_per_room
  ON public.room_short_rests(room_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_room_short_rests_status_ends_at
  ON public.room_short_rests(status, ends_at) WHERE status = 'active';

ALTER TABLE public.room_short_rests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.room_short_rests FROM anon;

DROP POLICY IF EXISTS "Staff can view short rests" ON public.room_short_rests;
CREATE POLICY "Staff can view short rests" ON public.room_short_rests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.is_active IS NOT FALSE
        AND user_roles.role IN ('front_desk', 'manager', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.set_room_short_rests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS room_short_rests_updated_at ON public.room_short_rests;
CREATE TRIGGER room_short_rests_updated_at
  BEFORE UPDATE ON public.room_short_rests
  FOR EACH ROW EXECUTE FUNCTION public.set_room_short_rests_updated_at();

-- Atomically starts a short rest: validates the room is free (not already on
-- another active short rest, not currently checked in from a regular booking,
-- not dirty/under maintenance), then creates the timer row and a companion
-- `bookings` row. Guest email is optional — falls back to the resort's
-- contact_email so the booking can still be paid through MafrexPay when a
-- short-rest guest doesn't want to give an email at the desk.
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

  -- Self-heal: free a room whose previous short rest already timed out, so
  -- front desk isn't blocked waiting on the cron sweep to catch up.
  UPDATE public.room_short_rests SET status = 'completed'
  WHERE room_id = p_room_id AND status = 'active' AND ends_at <= v_now;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND is_active = TRUE FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  IF v_room.status <> 'available' OR v_room.housekeeping_status <> 'available' THEN
    RAISE EXCEPTION 'ROOM_NOT_READY';
  END IF;
  IF EXISTS (SELECT 1 FROM public.room_short_rests WHERE room_id = p_room_id AND status = 'active') THEN
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
  v_ends_at := v_now + make_interval(mins => p_duration_minutes);

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

  INSERT INTO public.room_short_rests (room_id, booking_id, price, duration_minutes, started_at, ends_at, created_by)
  VALUES (p_room_id, v_booking_id, p_price, p_duration_minutes, v_now, v_ends_at, p_user_id)
  RETURNING id INTO v_short_rest_id;

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

-- Ends a short rest (early, by front desk, or by the cron sweep for
-- timed-out ones — pass p_user_id NULL for the latter): frees the room for
-- the unique-active-per-room guard and flips housekeeping to 'dirty', same
-- as a regular check-out.
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
BEGIN
  IF p_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;

  SELECT * INTO v_rest FROM public.room_short_rests WHERE id = p_short_rest_id FOR UPDATE;
  IF v_rest.id IS NULL THEN RAISE EXCEPTION 'SHORT_REST_NOT_FOUND'; END IF;
  IF v_rest.status <> 'active' THEN RAISE EXCEPTION 'SHORT_REST_NOT_ACTIVE'; END IF;

  UPDATE public.room_short_rests SET status = 'completed', updated_at = v_now WHERE id = p_short_rest_id;

  SELECT * INTO v_room FROM public.rooms WHERE id = v_rest.room_id FOR UPDATE;
  UPDATE public.rooms SET housekeeping_status = 'dirty', housekeeping_updated_at = v_now,
    housekeeping_updated_by = p_user_id WHERE id = v_rest.room_id;

  UPDATE public.bookings SET status = 'completed', updated_at = v_now
  WHERE id = v_rest.booking_id AND status <> 'cancelled';

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
    VALUES (p_user_id, 'front_desk', 'short_rest_ended',
      'Ended short rest for room ' || COALESCE(v_room.room_number, ''), 'booking', 'info', 'booking', v_rest.booking_id,
      jsonb_build_object('room_id', v_rest.room_id, 'short_rest_id', p_short_rest_id));
  END IF;

  RETURN jsonb_build_object('short_rest_id', p_short_rest_id, 'room_id', v_rest.room_id, 'ended_at', v_now);
END;
$$;

-- Sweeps timed-out short rests. Called by the cron; reuses end_short_rest_atomic
-- per row so housekeeping/status transitions stay identical to a manual end.
CREATE OR REPLACE FUNCTION public.expire_short_rests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_id IN SELECT id FROM public.room_short_rests WHERE status = 'active' AND ends_at <= now() LOOP
    PERFORM public.end_short_rest_atomic(v_id, NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_short_rest_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.end_short_rest_atomic(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_short_rests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_short_rest_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.end_short_rest_atomic(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_short_rests() TO service_role;
