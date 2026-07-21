-- Non-destructive manager operations upgrade: work orders and unified audit metadata.
ALTER TABLE public.facility_maintenance
  ADD COLUMN IF NOT EXISTS work_order_number TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'room',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.facility_maintenance
SET
  work_order_number = COALESCE(work_order_number, 'MNT-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))),
  title = COALESCE(NULLIF(title, ''), INITCAP(REPLACE(issue_type, '_', ' '))),
  location = COALESCE(location, CASE WHEN room_id IS NOT NULL THEN 'Guest room' ELSE 'Resort property' END),
  category = COALESCE(category, issue_type, 'other')
WHERE work_order_number IS NULL OR title IS NULL OR location IS NULL;

ALTER TABLE public.facility_maintenance
  ALTER COLUMN work_order_number SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_maintenance_work_order
  ON public.facility_maintenance(work_order_number);
CREATE INDEX IF NOT EXISTS idx_facility_maintenance_priority_status
  ON public.facility_maintenance(priority, status, due_at);
CREATE INDEX IF NOT EXISTS idx_facility_maintenance_assigned_to
  ON public.facility_maintenance(assigned_to);

ALTER TABLE public.staff_activity_logs
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'operations',
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

UPDATE public.staff_activity_logs
SET summary = COALESCE(summary, INITCAP(REPLACE(action, '_', ' ')))
WHERE summary IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_category_created
  ON public.staff_activity_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_logs_entity
  ON public.staff_activity_logs(entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.set_maintenance_work_order_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'MNT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));
  END IF;
  IF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN NEW.started_at := NOW(); END IF;
  IF NEW.status = 'completed' AND NEW.resolved_at IS NULL THEN NEW.resolved_at := NOW(); END IF;
  IF NEW.status <> 'completed' THEN
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_work_order_defaults ON public.facility_maintenance;
CREATE TRIGGER maintenance_work_order_defaults
  BEFORE INSERT OR UPDATE ON public.facility_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_work_order_defaults();

CREATE OR REPLACE FUNCTION public.sync_room_maintenance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_id IS NOT NULL AND NEW.status IN ('pending', 'in_progress') THEN
    UPDATE public.rooms SET status = 'maintenance', updated_at = NOW()
    WHERE id = NEW.room_id AND status <> 'unavailable';
  END IF;

  IF NEW.room_id IS NOT NULL AND NEW.status IN ('completed', 'cancelled') THEN
    UPDATE public.rooms SET status = 'available', updated_at = NOW()
    WHERE id = NEW.room_id
      AND status = 'maintenance'
      AND NOT EXISTS (
        SELECT 1 FROM public.facility_maintenance fm
        WHERE fm.room_id = NEW.room_id AND fm.id <> NEW.id AND fm.status IN ('pending', 'in_progress')
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_room_from_maintenance ON public.facility_maintenance;
CREATE TRIGGER sync_room_from_maintenance
  AFTER INSERT OR UPDATE OF status, room_id ON public.facility_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_maintenance_status();
