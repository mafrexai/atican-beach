-- A booking transitioning to cancelled/completed already flips its room back
-- to 'available' via this trigger (from 009_room_availability.sql) — but it
-- did so unconditionally, even overwriting a room that staff had separately
-- marked 'maintenance' for an unrelated reason (e.g. a broken AC). Add a
-- guard so a maintenance room stays in maintenance regardless of what
-- happens to bookings against it.
CREATE OR REPLACE FUNCTION update_room_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE rooms SET status = 'booked', updated_at = NOW()
    WHERE id IN (SELECT item_id FROM booking_items WHERE booking_id = NEW.id AND item_type = 'room');
  END IF;
  IF NEW.status IN ('cancelled', 'completed') AND (OLD IS NULL OR OLD.status NOT IN ('cancelled', 'completed')) THEN
    UPDATE rooms SET status = 'available', updated_at = NOW()
    WHERE id IN (SELECT item_id FROM booking_items WHERE booking_id = NEW.id AND item_type = 'room')
      AND status <> 'maintenance';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
