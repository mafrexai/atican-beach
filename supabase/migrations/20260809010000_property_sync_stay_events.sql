-- Forward-only extension for installations where the booking outbox migration
-- was already applied before check-in/check-out synchronization was added.
ALTER TABLE public.property_sync_outbox DROP CONSTRAINT IF EXISTS property_sync_outbox_entity_type_check;
ALTER TABLE public.property_sync_outbox ADD CONSTRAINT property_sync_outbox_entity_type_check
  CHECK (entity_type IN ('booking', 'checked_in', 'checked_out'));

CREATE OR REPLACE FUNCTION public.queue_stay_property_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN
    INSERT INTO public.property_sync_outbox(entity_type, entity_id) VALUES ('checked_in', NEW.id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET status = 'pending', attempts = 0,
      available_at = now(), last_error = NULL, last_run_id = NULL, synced_at = NULL, updated_at = now();
  END IF;
  IF NEW.checked_out_at IS NOT NULL AND OLD.checked_out_at IS NULL THEN
    INSERT INTO public.property_sync_outbox(entity_type, entity_id) VALUES ('checked_out', NEW.id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET status = 'pending', attempts = 0,
      available_at = now(), last_error = NULL, last_run_id = NULL, synced_at = NULL, updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_stay_property_sync_outbox ON public.bookings;
CREATE TRIGGER bookings_stay_property_sync_outbox
AFTER UPDATE OF checked_in_at, checked_out_at ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.queue_stay_property_sync();

CREATE OR REPLACE FUNCTION public.claim_property_sync_stay_outbox(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.property_sync_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.property_sync_outbox
    WHERE entity_type IN ('checked_in', 'checked_out')
      AND ((status = 'pending' AND available_at <= now()) OR
           (status = 'processing' AND updated_at < now() - interval '15 minutes'))
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.property_sync_outbox o
  SET status = 'processing', attempts = o.attempts + 1, updated_at = now()
  FROM candidates c WHERE o.id = c.id RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_property_sync_stay_outbox(INTEGER) FROM PUBLIC;
