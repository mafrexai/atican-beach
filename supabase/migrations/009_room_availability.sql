-- Add room status tracking for availability management
-- Run this in Supabase SQL Editor

-- 1. Add status column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';

-- 2. Add check constraint for valid statuses
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
  CHECK (status IN ('available', 'booked', 'maintenance', 'unavailable'));

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_type_status ON rooms(room_type, status);

-- 4. Create function to check room availability for date range
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS main
DECLARE
  v_confirmed_bookings INT;
BEGIN
  -- Count overlapping bookings that are confirmed or pending
  SELECT COUNT(*) INTO v_confirmed_bookings
  FROM bookings
  WHERE id IN (
    SELECT booking_id FROM booking_items WHERE item_id = p_room_id AND item_type = 'room'
  )
  AND status IN ('confirmed', 'pending')
  AND (
    (check_in_date <= p_check_out AND check_out_date >= p_check_in)
  );
  
  RETURN v_confirmed_bookings = 0;
END;
main LANGUAGE plpgsql;

-- 5. Create function to auto-update room status
CREATE OR REPLACE FUNCTION update_room_status() RETURNS TRIGGER AS main
BEGIN
  -- When a booking is confirmed, mark room as booked
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE rooms SET status = 'booked', updated_at = NOW()
    WHERE id IN (
      SELECT item_id FROM booking_items WHERE booking_id = NEW.id AND item_type = 'room'
    );
  END IF;
  
  -- When booking is cancelled or checked out, mark room as available
  IF NEW.status IN ('cancelled', 'completed') AND (OLD IS NULL OR OLD.status NOT IN ('cancelled', 'completed')) THEN
    UPDATE rooms SET status = 'available', updated_at = NOW()
    WHERE id IN (
      SELECT item_id FROM booking_items WHERE booking_id = NEW.id AND item_type = 'room'
    );
  END IF;
  
  RETURN NEW;
END;
main LANGUAGE plpgsql;

-- 6. Create trigger for room status updates
DROP TRIGGER IF EXISTS trg_update_room_status ON bookings;
CREATE TRIGGER trg_update_room_status
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_room_status();
