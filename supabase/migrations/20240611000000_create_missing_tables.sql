-- ============================================
-- NON-DESTRUCTIVE MIGRATION: Create Missing Tables
-- This script only creates tables if they don't exist
-- and inserts seed data without dropping anything
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tent_name VARCHAR(100) NOT NULL,
  capacity_chairs INT NOT NULL,
  capacity_tables INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity_available INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- EXPERIENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  price_unit VARCHAR(50) DEFAULT 'per_group',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- EVENT SPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_name VARCHAR(100) NOT NULL,
  capacity_chairs INT,
  capacity_tables INT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  confirmation_code VARCHAR(10) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(20),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_reference VARCHAR(100),
  qr_code TEXT,
  check_in_date DATE,
  check_out_date DATE,
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- BOOKING ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('room', 'tent', 'experience', 'event_space', 'dining')),
  item_id UUID NOT NULL,
  quantity INT DEFAULT 1,
  price_at_booking DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DINING RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dining_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(20),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INT NOT NULL,
  table_number VARCHAR(10),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROOM SERVICE ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference VARCHAR(20) UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  room_number VARCHAR(10),
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'delivered', 'cancelled')),
  requested_pickup BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GATE ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gate_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) REFERENCES bookings(booking_reference) ON DELETE SET NULL,
  entry_time TIMESTAMP DEFAULT NOW(),
  exit_time TIMESTAMP,
  verification_method VARCHAR(20) CHECK (verification_method IN ('qr', 'manual', 'nfc')),
  verified_by VARCHAR(100),
  notes TEXT
);

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_type ON booking_items(item_type);
CREATE INDEX IF NOT EXISTS idx_dining_reservations_date ON dining_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_room_service_orders_booking ON room_service_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_booking ON gate_entries(booking_reference);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dining_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Drop and recreate to avoid conflicts)
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
CREATE POLICY "Users can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Booking items policies
DROP POLICY IF EXISTS "Users can view own booking items" ON booking_items;
CREATE POLICY "Users can view own booking items" ON booking_items
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Users can insert own booking items" ON booking_items;
CREATE POLICY "Users can insert own booking items" ON booking_items
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- Dining reservations policies
DROP POLICY IF EXISTS "Users can view own dining reservations" ON dining_reservations;
CREATE POLICY "Users can view own dining reservations" ON dining_reservations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dining reservations" ON dining_reservations;
CREATE POLICY "Users can insert own dining reservations" ON dining_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Room service orders policies
DROP POLICY IF EXISTS "Users can view own room service orders" ON room_service_orders;
CREATE POLICY "Users can view own room service orders" ON room_service_orders
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Users can insert own room service orders" ON room_service_orders;
CREATE POLICY "Users can insert own room service orders" ON room_service_orders
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ============================================
-- GRANT PUBLIC ACCESS TO READ-ONLY TABLES
-- ============================================
GRANT SELECT ON rooms TO anon, authenticated;
GRANT SELECT ON tents TO anon, authenticated;
GRANT SELECT ON experiences TO anon, authenticated;
GRANT SELECT ON event_spaces TO anon, authenticated;

-- ============================================
-- SEED DATA (Only insert if table is empty)
-- ============================================

-- Seed Tents (if empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tents LIMIT 1) THEN
    INSERT INTO tents (tent_name, capacity_chairs, capacity_tables, price, quantity_available) VALUES
    ('Standard Atican Tent', 25, 3, 50000, 3),
    ('Space Atican Tent', 50, 6, 100000, 2),
    ('VIP Atican Tent', 100, 20, 300000, 2),
    ('VVIP Atican Tent', 50, 10, 300000, 1);
  END IF;
END $$;

-- Seed Experiences (if empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM experiences LIMIT 1) THEN
    INSERT INTO experiences (name, description, price, price_unit) VALUES
    ('Bonfire', 'Evening beach bonfire experience', 30000, 'per_group'),
    ('Sack Race', 'Fun beach sack race activity', 5000, 'per_group'),
    ('Beach Ball', 'Beach ball games and activities', 10000, 'per_group'),
    ('Horse Riding', 'Beach horse riding experience', 3000, 'per_ride');
  END IF;
END $$;

-- Seed Event Spaces (if empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM event_spaces LIMIT 1) THEN
    INSERT INTO event_spaces (space_name, capacity_chairs, capacity_tables, description, price) VALUES
    ('Small Setup', 5, 1, 'Intimate gathering space', 15000),
    ('Medium Setup', NULL, NULL, 'Wooden chairs + sofas setup', 30000),
    ('Large Setup', 25, 3, 'Large group event space', 50000),
    ('XL Setup', 50, 6, 'Extra large event space', 100000),
    ('Photo Shoot', NULL, NULL, 'Professional photo shoot location', 50000),
    ('Video Shoot', NULL, NULL, 'Professional video shoot location', 100000),
    ('VIP Event Space', NULL, NULL, 'Exclusive VIP event area', 300000);
  END IF;
END $$;

-- ============================================
-- CREATE TRIGGER FOR AUTO-ASSIGNING ROLES
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guest');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();