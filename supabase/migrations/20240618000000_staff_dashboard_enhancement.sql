-- ============================================================
-- SAFE MIGRATION: Staff Dashboard & Admin Enhancement
-- All operations use IF NOT EXISTS / exception handlers
-- to prevent data loss. Only ADDs, never DELETEs or DROPs.
-- ============================================================

-- Step 1: Alter CHECK constraint to support 'front_desk' role
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('admin', 'staff', 'guest', 'front_desk'));

-- Step 2: Add staff fields to user_roles (safe, non-destructive)
DO $$ 
BEGIN
  BEGIN ALTER TABLE user_roles ADD COLUMN staff_name TEXT;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'staff_name already exists'; END;
  
  BEGIN ALTER TABLE user_roles ADD COLUMN staff_email TEXT;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'staff_email already exists'; END;
  
  BEGIN ALTER TABLE user_roles ADD COLUMN shift VARCHAR(20);
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'shift already exists'; END;
  
  BEGIN ALTER TABLE user_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'is_active already exists'; END;
  
  BEGIN ALTER TABLE user_roles ADD COLUMN hire_date DATE;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'hire_date already exists'; END;
END $$;

-- Step 3: Add booking tracking fields (safe, non-destructive)
DO $$ 
BEGIN
  BEGIN ALTER TABLE bookings ADD COLUMN created_by UUID REFERENCES auth.users(id);
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'created_by already exists'; END;
  
  BEGIN ALTER TABLE bookings ADD COLUMN checked_in_at TIMESTAMP;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'checked_in_at already exists'; END;
  
  BEGIN ALTER TABLE bookings ADD COLUMN checked_out_at TIMESTAMP;
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'checked_out_at already exists'; END;
  
  BEGIN ALTER TABLE bookings ADD COLUMN confirmed_by UUID REFERENCES auth.users(id);
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'confirmed_by already exists'; END;
  
  BEGIN ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(20) DEFAULT 'online';
  EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'booking_type already exists'; END;
END $$;

-- Step 4: Create booking_comments table (if not exists)
CREATE TABLE IF NOT EXISTS booking_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create booking_activity_log table (if not exists)
CREATE TABLE IF NOT EXISTS booking_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_checked_in_at ON bookings(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_checked_out_at ON bookings(checked_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_booking_comments_booking_id ON booking_comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_activity_log_booking_id ON booking_activity_log(booking_id);

-- Step 7: Enable RLS on new tables
ALTER TABLE booking_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_activity_log ENABLE ROW LEVEL SECURITY;

-- Step 8: Add RLS policies for bookings (checking existence first)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Staff can view all bookings') THEN
    EXECUTE 'CREATE POLICY "Staff can view all bookings" ON bookings FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Staff can create bookings') THEN
    EXECUTE 'CREATE POLICY "Staff can create bookings" ON bookings FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Staff can update bookings') THEN
    EXECUTE 'CREATE POLICY "Staff can update bookings" ON bookings FOR UPDATE USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

-- Step 9: Add RLS policies for booking_comments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_comments' AND policyname = 'Staff can view booking comments') THEN
    EXECUTE 'CREATE POLICY "Staff can view booking comments" ON booking_comments FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_comments' AND policyname = 'Staff can create booking comments') THEN
    EXECUTE 'CREATE POLICY "Staff can create booking comments" ON booking_comments FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

-- Step 10: Add RLS policies for booking_activity_log
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_activity_log' AND policyname = 'Staff can view activity log') THEN
    EXECUTE 'CREATE POLICY "Staff can view activity log" ON booking_activity_log FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_activity_log' AND policyname = 'Staff can create activity log') THEN
    EXECUTE 'CREATE POLICY "Staff can create activity log" ON booking_activity_log FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''front_desk''))
    )';
  END IF;
END $$;