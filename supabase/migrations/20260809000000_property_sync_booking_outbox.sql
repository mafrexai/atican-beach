CREATE TABLE IF NOT EXISTS public.property_sync_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'booking' CHECK (entity_type IN ('booking', 'checked_in', 'checked_out')),
  entity_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  last_run_id TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS property_sync_outbox_dispatch_idx
  ON public.property_sync_outbox(status, available_at);

ALTER TABLE public.property_sync_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_sync_outbox FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_property_sync_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.property_sync_outbox(entity_type, entity_id)
  VALUES ('booking', p_booking_id)
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    status = 'pending', attempts = 0, available_at = now(), last_error = NULL,
    last_run_id = NULL, synced_at = NULL, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_booking_property_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.enqueue_property_sync_booking(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_property_sync_outbox ON public.bookings;
CREATE TRIGGER bookings_property_sync_outbox
AFTER INSERT OR UPDATE OF guest_name, guest_email, guest_phone, check_in_date, check_out_date,
  total_amount, status, payment_status, payment_provider ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.queue_booking_property_sync();

CREATE OR REPLACE FUNCTION public.queue_booking_item_property_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking_id UUID;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  IF COALESCE(NEW.item_type, OLD.item_type) = 'room' THEN
    PERFORM public.enqueue_property_sync_booking(v_booking_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS booking_items_property_sync_outbox ON public.booking_items;
CREATE TRIGGER booking_items_property_sync_outbox
AFTER INSERT OR UPDATE OR DELETE ON public.booking_items
FOR EACH ROW EXECUTE FUNCTION public.queue_booking_item_property_sync();

CREATE OR REPLACE FUNCTION public.claim_property_sync_booking_outbox(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.property_sync_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.property_sync_outbox
    WHERE entity_type = 'booking'
      AND ((status = 'pending' AND available_at <= now()) OR (status = 'processing' AND updated_at < now() - interval '15 minutes'))
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.property_sync_outbox o SET status = 'processing', attempts = o.attempts + 1, updated_at = now()
  FROM candidates c WHERE o.id = c.id RETURNING o.*;
END;
$$;

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
      AND ((status = 'pending' AND available_at <= now()) OR (status = 'processing' AND updated_at < now() - interval '15 minutes'))
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.property_sync_outbox o SET status = 'processing', attempts = o.attempts + 1, updated_at = now()
  FROM candidates c WHERE o.id = c.id RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_property_sync_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_property_sync_booking_outbox(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_property_sync_stay_outbox(INTEGER) FROM PUBLIC;
