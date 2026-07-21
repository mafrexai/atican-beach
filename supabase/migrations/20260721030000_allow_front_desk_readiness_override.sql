-- Front desk may complete check-in even when housekeeping or maintenance has
-- not cleared the room. The override remains visible in the audit trail.
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
  v_readiness_override BOOLEAN := FALSE;
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

    SELECT EXISTS (
      SELECT 1 FROM public.rooms WHERE id = ANY(v_room_ids)
        AND (status <> 'available' OR housekeeping_status <> 'available')
    ) INTO v_readiness_override;

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
    jsonb_build_object('processed_at', v_now, 'room_ids', v_room_ids, 'readiness_override', v_readiness_override));

  INSERT INTO public.staff_activity_logs(user_id, actor_role, action, summary, category, severity, entity_type, entity_id, details)
  VALUES (p_user_id, 'front_desk', CASE WHEN p_action = 'check_in' THEN 'guest_checked_in' ELSE 'guest_checked_out' END,
    CASE WHEN p_action = 'check_in' THEN 'Checked in ' ELSE 'Checked out ' END || v_booking.guest_name || ' (' || v_booking.booking_reference || ')',
    'booking', CASE WHEN v_readiness_override THEN 'warning' ELSE 'info' END, 'booking', p_booking_id,
    jsonb_build_object('room_ids', v_room_ids, 'readiness_override', v_readiness_override));

  RETURN jsonb_build_object('booking_id', p_booking_id, 'action', p_action, 'processed_at', v_now,
    'readiness_override', v_readiness_override,
    'housekeeping_status', CASE WHEN p_action = 'check_out' THEN 'dirty' ELSE 'available' END);
END;
$$;

REVOKE ALL ON FUNCTION public.process_front_desk_stay(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_front_desk_stay(UUID, TEXT, UUID) TO service_role;
