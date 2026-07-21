-- Manager-controlled, catalog-backed offers for the AI Concierge.
CREATE TABLE IF NOT EXISTS public.concierge_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 500),
  target_type TEXT NOT NULL CHECK (target_type IN ('room', 'experience', 'tent', 'event_space')),
  target_id UUID NOT NULL,
  offer_price NUMERIC(12, 2) CHECK (offer_price IS NULL OR offer_price >= 0),
  cta_text TEXT NOT NULL DEFAULT 'View offer' CHECK (char_length(cta_text) BETWEEN 2 AND 40),
  audience_page TEXT NOT NULL DEFAULT 'any' CHECK (audience_page IN ('any', 'rooms', 'experiences', 'tents', 'events', 'checkout')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_concierge_offers_active_schedule
  ON public.concierge_offers (is_active, starts_at, ends_at, priority DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_offers_target
  ON public.concierge_offers (target_type, target_id);

ALTER TABLE public.concierge_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view eligible concierge offers" ON public.concierge_offers;
CREATE POLICY "Public can view eligible concierge offers"
  ON public.concierge_offers FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );

DROP POLICY IF EXISTS "Managers can manage concierge offers" ON public.concierge_offers;
CREATE POLICY "Managers can manage concierge offers"
  ON public.concierge_offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE OR REPLACE FUNCTION public.set_concierge_offer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS concierge_offers_updated_at ON public.concierge_offers;
CREATE TRIGGER concierge_offers_updated_at
  BEFORE UPDATE ON public.concierge_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_concierge_offer_updated_at();

GRANT SELECT ON public.concierge_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.concierge_offers TO authenticated;
