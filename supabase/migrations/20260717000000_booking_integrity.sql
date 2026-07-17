-- Date-aware, atomic room reservation for online and AI-assisted bookings.
-- Room.status is now operational state only. Future bookings are represented
-- by booking_items date ranges, not by permanently marking a room "booked".

DROP TRIGGER IF EXISTS trg_update_room_status ON bookings;
DROP FUNCTION IF EXISTS update_room_status();

UPDATE rooms
SET status = 'available', updated_at = NOW()
WHERE status = 'booked';

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('available', 'maintenance', 'unavailable'));

CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_check_in < p_check_out
    AND NOT EXISTS (
      SELECT 1
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.item_type = 'room'
        AND bi.item_id = p_room_id
        AND b.status IN ('pending', 'confirmed')
        AND b.check_in_date < p_check_out
        AND b.check_out_date > p_check_in
    );
$$;

CREATE OR REPLACE FUNCTION create_room_booking_atomic(
  p_booking_reference TEXT,
  p_confirmation_code TEXT,
  p_user_id UUID,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_room_type TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_guests INTEGER,
  p_special_requests TEXT,
  p_qr_code TEXT,
  p_booking_type TEXT DEFAULT 'online'
)
RETURNS TABLE (
  booking_id UUID,
  room_id UUID,
  room_number TEXT,
  price_per_night NUMERIC,
  nights INTEGER,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_booking_id UUID;
  v_nights INTEGER;
  v_total NUMERIC;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in < CURRENT_DATE OR p_check_in >= p_check_out THEN
    RAISE EXCEPTION 'INVALID_BOOKING_DATES';
  END IF;

  IF p_guests IS NULL OR p_guests < 1 THEN
    RAISE EXCEPTION 'INVALID_GUEST_COUNT';
  END IF;

  -- Serialize allocation for the requested room type. This prevents two
  -- concurrent requests from selecting the same final available room.
  PERFORM pg_advisory_xact_lock(hashtext('room-booking:' || lower(p_room_type)));

  SELECT r.*
  INTO v_room
  FROM rooms r
  WHERE lower(r.room_type) = lower(p_room_type)
    AND r.is_active = TRUE
    AND r.status = 'available'
    AND r.max_occupancy >= p_guests
    AND check_room_availability(r.id, p_check_in, p_check_out)
  ORDER BY r.room_number
  LIMIT 1
  FOR UPDATE;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'NO_ROOM_AVAILABLE';
  END IF;

  v_nights := p_check_out - p_check_in;
  v_total := v_room.price_per_night * v_nights;

  INSERT INTO bookings (
    booking_reference, confirmation_code, user_id, guest_name, guest_email,
    guest_phone, total_amount, payment_status, status, qr_code,
    check_in_date, check_out_date, booking_type, special_requests
  ) VALUES (
    p_booking_reference, p_confirmation_code, p_user_id, trim(p_guest_name), lower(trim(p_guest_email)),
    NULLIF(trim(p_guest_phone), ''), v_total, 'unpaid', 'pending', p_qr_code,
    p_check_in, p_check_out, p_booking_type, NULLIF(trim(p_special_requests), '')
  ) RETURNING id INTO v_booking_id;

  INSERT INTO booking_items (
    booking_id, item_type, item_id, quantity, price_at_booking,
    start_date, end_date, metadata
  ) VALUES (
    v_booking_id, 'room', v_room.id, v_nights, v_room.price_per_night,
    p_check_in, p_check_out,
    jsonb_build_object('guests', p_guests, 'room_number', v_room.room_number)
  );

  RETURN QUERY SELECT
    v_booking_id,
    v_room.id,
    v_room.room_number::TEXT,
    v_room.price_per_night,
    v_nights,
    v_total;
END;
$$;

REVOKE ALL ON FUNCTION create_room_booking_atomic(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_room_booking_atomic(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, TEXT, TEXT, TEXT) TO service_role;

