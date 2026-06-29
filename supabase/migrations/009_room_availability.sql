-- Room Availability Migration
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('available','booked','maintenance','unavailable'));
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE OR REPLACE FUNCTION check_room_availability(p_room_id UUID,p_check_in DATE,p_check_out DATE) RETURNS BOOLEAN AS UTF8 DECLARE v INT; BEGIN SELECT COUNT(*) INTO v FROM bookings WHERE id IN (SELECT booking_id FROM booking_items WHERE item_id=p_room_id AND item_type='room') AND status IN ('confirmed','pending') AND (check_in_date<=p_check_out AND check_out_date>=p_check_in); RETURN v=0; END; UTF8 LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_room_status() RETURNS TRIGGER AS UTF8 BEGIN IF NEW.status='confirmed' AND (OLD IS NULL OR OLD.status!='confirmed') THEN UPDATE rooms SET status='booked',updated_at=NOW() WHERE id IN (SELECT item_id FROM booking_items WHERE booking_id=NEW.id AND item_type='room'); END IF; IF NEW.status IN ('cancelled','completed') AND (OLD IS NULL OR OLD.status NOT IN ('cancelled','completed')) THEN UPDATE rooms SET status='available',updated_at=NOW() WHERE id IN (SELECT item_id FROM booking_items WHERE booking_id=NEW.id AND item_type='room'); END IF; RETURN NEW; END; UTF8 LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_update_room_status ON bookings;
CREATE TRIGGER trg_update_room_status AFTER INSERT OR UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION update_room_status();
