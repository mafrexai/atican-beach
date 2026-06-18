-- ============================================================
-- FIX: RLS Policies for booking_items and payment status
-- ============================================================

-- Ensure booking_items has SELECT policy for users
DROP POLICY IF EXISTS "Users can view own booking items" ON booking_items;
CREATE POLICY "Users can view own booking items" ON booking_items
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- Ensure bookings SELECT policy exists (recreate to be safe)
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure bookings UPDATE policy exists
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure bookings INSERT policy exists
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
CREATE POLICY "Users can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure booking_items INSERT policy exists
DROP POLICY IF EXISTS "Users can insert own booking items" ON booking_items;
CREATE POLICY "Users can insert own booking items" ON booking_items
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- Enable RLS on booking_items (in case it's not enabled)
ALTER TABLE IF EXISTS booking_items ENABLE ROW LEVEL SECURITY;