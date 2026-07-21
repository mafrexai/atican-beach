-- Atomic front-desk stay operations and housekeeping workflow.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS housekeeping_status TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS housekeeping_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS housekeeping_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_housekeeping_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_housekeeping_status_check
  CHECK (housekeeping_status IN ('available', 'dirty', 'cleaning', 'inspected'));

CREATE INDEX IF NOT EXISTS idx_rooms_housekeeping_status
  ON public.rooms(housekeeping_status) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.process_front_desk_stay(
  p_booking_id UUID,
  p_action TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_room_ids UUID[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking.id IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  SELECT COALESCE(array_agg(item_id), ARRAY[]::UUID[]) INTO v_room_ids
  FROM public.booking_items WHERE booking_id = p_booking_id AND item_type = 'room';

  IF p_action = 'check_in' THEN
    IF v_booking.checked_out_at IS NOT NULL THEN RAISE EXCEPTION 'BOOKING_ALREADY_CHECKED_OUT'; END IF;
    IF v_booking.checked_in_at IS NOT NULL THEN RAISE EXCEPTION 'BOOKING_ALREADY_CHECKED_IN'; END IF;
    IF v_booking.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'BOOKING_NOT_ACTIVE'; END IF;
    IF cardinality(v_room_ids) = 0 THEN RAISE EXCEPTION 'ROOM_REQUIRED_FOR_CHECK_IN'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = ANY(v_room_ids)
        AND (status <> 'available' OR housekeeping_status <> 'available')
    ) THEN RAISE EXCEPTION 'ROOM_NOT_READY'; END IF;

    UPDATE public.bookings SET checked_in_at = v_now, status = 'confirmed',
      confirmed_by = p_user_id, updated_at = v_now WHERE id = p_booking_id;
    UPDATE public.rooms SET housekeeping_status = 'available', housekeeping_updated_at = v_now,
      housekeeping_updated_by = p_user_id WHERE id = ANY(v_room_ids);
  ELSIF p_action = 'check_out' THEN
    IF v_booking.checked_in_at IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_CHECKED_IN'; END IF;
    IF v_booking.checked_out_at IS NOT NULL THEN RAISE EXCEPTION 'BOOKING_ALREADY_CHECKED_OUT'; END IF;

    UPDATE public.bookings SET checked_out_at = v_now, status = 'completed', updated_at = v_now
      WHERE id = p_booking_id;
    UPDATE public.rooms SET housekeeping_status = 'dirty', housekeeping_updated_at = v_now,
      housekeeping_updated_by = p_user_id WHERE id = ANY(v_room_ids);
  ELSE RAISE EXCEPTION 'INVALID_STAY_ACTION'; END IF;

  INSERT INTO public.booking_activity_log(booking_id, user_id, action, details)
  VALUES (p_booking_id, p_user_id, CASE WHEN p_action = 'check_in' THEN 'checked_in' ELSE 'checked_out' END,
    jsonb_build_object('processed_at', v_now, 'room_ids', v_room_ids));

  INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
  VALUES (p_user_id, 'front_desk', CASE WHEN p_action = 'check_in' THEN 'guest_checked_in' ELSE 'guest_checked_out' END,
    CASE WHEN p_action = 'check_in' THEN 'Checked in ' ELSE 'Checked out ' END || v_booking.guest_name || ' (' || v_booking.booking_reference || ')',
    'booking', 'info', 'booking', p_booking_id, jsonb_build_object('room_ids', v_room_ids));

  RETURN jsonb_build_object('booking_id', p_booking_id, 'action', p_action, 'processed_at', v_now,
    'housekeeping_status', CASE WHEN p_action = 'check_out' THEN 'dirty' ELSE 'available' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_room_housekeeping(
  p_room_id UUID,
  p_next_status TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND is_active = TRUE FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  IF NOT ((v_room.housekeeping_status = 'dirty' AND p_next_status = 'cleaning')
    OR (v_room.housekeeping_status = 'cleaning' AND p_next_status = 'inspected')
    OR (v_room.housekeeping_status = 'inspected' AND p_next_status = 'available'))
  THEN RAISE EXCEPTION 'INVALID_HOUSEKEEPING_TRANSITION'; END IF;

  UPDATE public.rooms SET housekeeping_status = p_next_status, housekeeping_updated_at = NOW(),
    housekeeping_updated_by = p_user_id, updated_at = NOW() WHERE id = p_room_id;

  INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
  VALUES (p_user_id, 'front_desk', 'housekeeping_status_changed',
    'Room ' || v_room.room_number || ' moved from ' || v_room.housekeeping_status || ' to ' || p_next_status,
    'housekeeping', 'info', 'room', p_room_id,
    jsonb_build_object('from', v_room.housekeeping_status, 'to', p_next_status, 'room_number', v_room.room_number));

  RETURN jsonb_build_object('room_id', p_room_id, 'room_number', v_room.room_number, 'housekeeping_status', p_next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_walk_in_booking_atomic(
  p_booking_reference TEXT,
  p_confirmation_code TEXT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_special_requests TEXT,
  p_payment_status TEXT,
  p_payment_reference TEXT,
  p_items JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_item JSONB;
  v_type TEXT;
  v_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC;
  v_total NUMERIC := 0;
  v_nights INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'front_desk' AND COALESCE(is_active, TRUE)
  ) THEN RAISE EXCEPTION 'FRONT_DESK_ACCESS_REQUIRED'; END IF;
  IF trim(COALESCE(p_guest_name, '')) = '' OR trim(COALESCE(p_guest_email, '')) = '' THEN
    RAISE EXCEPTION 'GUEST_DETAILS_REQUIRED';
  END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in < CURRENT_DATE OR p_check_in >= p_check_out THEN
    RAISE EXCEPTION 'INVALID_BOOKING_DATES';
  END IF;
  IF p_payment_status NOT IN ('paid', 'unpaid') THEN RAISE EXCEPTION 'INVALID_PAYMENT_STATUS'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'BOOKING_ITEMS_REQUIRED'; END IF;
  v_nights := p_check_out - p_check_in;

  -- Lock and verify every selected item before creating any records.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_type := v_item->>'itemType';
    v_id := (v_item->>'itemId')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    IF v_quantity < 1 OR v_quantity > 30 THEN RAISE EXCEPTION 'INVALID_ITEM_QUANTITY'; END IF;

    IF v_type = 'room' THEN
      IF v_quantity <> 1 THEN RAISE EXCEPTION 'ONE_ROOM_PER_SELECTION'; END IF;
      PERFORM pg_advisory_xact_lock(hashtext('walk-in-room:' || v_id::TEXT));
      SELECT price_per_night INTO v_price FROM public.rooms
      WHERE id = v_id AND is_active = TRUE AND status = 'available' FOR UPDATE;
      IF v_price IS NULL OR NOT public.check_room_availability(v_id, p_check_in, p_check_out) THEN
        RAISE EXCEPTION 'ROOM_NOT_AVAILABLE';
      END IF;
      v_total := v_total + (v_price * v_nights);
    ELSIF v_type = 'tent' THEN
      SELECT price INTO v_price FROM public.tents
      WHERE id = v_id AND is_active = TRUE AND quantity_available >= v_quantity FOR UPDATE;
      IF v_price IS NULL THEN RAISE EXCEPTION 'TENT_NOT_AVAILABLE'; END IF;
      v_total := v_total + (v_price * v_quantity);
    ELSIF v_type = 'experience' THEN
      SELECT price INTO v_price FROM public.experiences WHERE id = v_id AND is_active = TRUE;
      IF v_price IS NULL THEN RAISE EXCEPTION 'EXPERIENCE_NOT_AVAILABLE'; END IF;
      v_total := v_total + (v_price * v_quantity);
    ELSE RAISE EXCEPTION 'INVALID_ITEM_TYPE'; END IF;
  END LOOP;

  INSERT INTO public.bookings(
    booking_reference, confirmation_code, user_id, guest_name, guest_email, guest_phone,
    total_amount, status, payment_status, payment_reference, check_in_date, check_out_date,
    special_requests, created_by, booking_type
  ) VALUES (
    p_booking_reference, p_confirmation_code, p_user_id, trim(p_guest_name), lower(trim(p_guest_email)),
    NULLIF(trim(p_guest_phone), ''), v_total, CASE WHEN p_payment_status = 'paid' THEN 'confirmed' ELSE 'pending' END,
    p_payment_status, NULLIF(trim(p_payment_reference), ''), p_check_in, p_check_out,
    NULLIF(trim(p_special_requests), ''), p_user_id, 'walk_in'
  ) RETURNING id INTO v_booking_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_type := v_item->>'itemType'; v_id := (v_item->>'itemId')::UUID; v_quantity := (v_item->>'quantity')::INTEGER;
    IF v_type = 'room' THEN SELECT price_per_night INTO v_price FROM public.rooms WHERE id = v_id;
    ELSIF v_type = 'tent' THEN SELECT price INTO v_price FROM public.tents WHERE id = v_id;
    ELSE SELECT price INTO v_price FROM public.experiences WHERE id = v_id; END IF;
    INSERT INTO public.booking_items(booking_id, item_type, item_id, quantity, price_at_booking, start_date, end_date, metadata)
    VALUES (v_booking_id, v_type, v_id, CASE WHEN v_type = 'room' THEN v_nights ELSE v_quantity END,
      v_price, p_check_in, p_check_out, jsonb_build_object('selected_quantity', v_quantity));
  END LOOP;

  INSERT INTO public.booking_activity_log(booking_id, user_id, action, details)
  VALUES (v_booking_id, p_user_id, 'walk_in_booking_created', jsonb_build_object('total_amount', v_total, 'payment_status', p_payment_status));
  INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
  VALUES (p_user_id, 'front_desk', 'walk_in_booking_created',
    'Created walk-in booking ' || p_booking_reference || ' for ' || trim(p_guest_name), 'booking', 'info', 'booking', v_booking_id,
    jsonb_build_object('total_amount', v_total, 'payment_status', p_payment_status));

  RETURN jsonb_build_object('booking_id', v_booking_id, 'reference', p_booking_reference,
    'confirmation_code', p_confirmation_code, 'total_amount', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.process_front_desk_stay(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_room_housekeeping(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_walk_in_booking_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_front_desk_stay(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_room_housekeeping(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_walk_in_booking_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, TEXT, TEXT, JSONB, UUID) TO service_role;
