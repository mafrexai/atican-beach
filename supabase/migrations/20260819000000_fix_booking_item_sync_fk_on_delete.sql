-- Deleting a booking cascades to delete its booking_items (ON DELETE CASCADE),
-- which fires this trigger on every insert/update/delete — including that
-- cascade. It then tried to enqueue a property-sync entry for the parent
-- booking, but by the time the cascade-delete trigger runs, the parent
-- bookings row is already gone, so the insert into property_sync_outbox
-- violated its foreign key back to bookings(id) and the whole delete failed.
-- Guard: only enqueue if the parent booking still actually exists — true for
-- a normal item removal (booking persists), false when the booking itself
-- is being deleted (nothing left to sync; the delete flow already handles
-- notifying MafrexAI of the cancellation before the row disappears).
CREATE OR REPLACE FUNCTION public.queue_booking_item_property_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking_id UUID;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF COALESCE(NEW.item_type, OLD.item_type) = 'room'
    AND EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_id) THEN
    PERFORM public.enqueue_property_sync_booking(v_booking_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
