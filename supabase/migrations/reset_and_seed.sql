-- ============================================
-- RESET: Drop all tables if they exist
-- ============================================
DROP TABLE IF EXISTS gate_entries CASCADE;
DROP TABLE IF EXISTS room_service_orders CASCADE;
DROP TABLE IF EXISTS dining_reservations CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS event_spaces CASCADE;
DROP TABLE IF EXISTS experiences CASCADE;
DROP TABLE IF EXISTS tents CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('guest', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number VARCHAR(10) UNIQUE NOT NULL,
  room_type VARCHAR(50) NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  max_occupancy INT NOT NULL,
  amenities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert all 45 rooms
INSERT INTO rooms (room_number, room_type, price_per_night, max_occupancy) VALUES
-- Standard Rooms (3)
('702', 'Standard', 55000, 2),
('704', 'Standard', 55000, 2),
('706', 'Standard', 55000, 2),
-- Deluxe Rooms (12)
('201', 'Deluxe', 65000, 2),
('203', 'Deluxe', 65000, 2),
('205', 'Deluxe', 65000, 2),
('207', 'Deluxe', 65000, 2),
('209', 'Deluxe', 65000, 2),
('211', 'Deluxe', 65000, 2),
('301', 'Deluxe', 65000, 2),
('303', 'Deluxe', 65000, 2),
('305', 'Deluxe', 65000, 2),
('307', 'Deluxe', 65000, 2),
('309', 'Deluxe', 65000, 2),
('311', 'Deluxe', 65000, 2),
-- Double Bed Rooms (10)
('401', 'Double Bed', 75000, 2),
('403', 'Double Bed', 75000, 2),
('405', 'Double Bed', 75000, 2),
('407', 'Double Bed', 75000, 2),
('409', 'Double Bed', 75000, 2),
('501', 'Double Bed', 75000, 2),
('503', 'Double Bed', 75000, 2),
('505', 'Double Bed', 75000, 2),
('507', 'Double Bed', 75000, 2),
('509', 'Double Bed', 75000, 2),
-- Family Rooms (8)
('601', 'Family', 95000, 4),
('603', 'Family', 95000, 4),
('605', 'Family', 95000, 4),
('607', 'Family', 95000, 4),
('701', 'Family', 95000, 4),
('703', 'Family', 95000, 4),
('705', 'Family', 95000, 4),
('707', 'Family', 95000, 4),
-- Executive Rooms (5)
('801', 'Executive', 120000, 2),
('803', 'Executive', 120000, 2),
('805', 'Executive', 120000, 2),
('807', 'Executive', 120000, 2),
('809', 'Executive', 120000, 2),
-- Premium Suite (4)
('901', 'Premium Suite', 180000, 4),
('903', 'Premium Suite', 180000, 4),
('905', 'Premium Suite', 180000, 4),
('907', 'Premium Suite', 180000, 4),
-- Executive Suite (2)
('1001', 'Executive Suite', 250000, 4),
('1003', 'Executive Suite', 250000, 4),
-- Presidential Suite (1)
('P01', 'Presidential Suite', 500000, 6);

-- ============================================
-- TENTS TABLE
-- ============================================
CREATE TABLE tents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tent_name VARCHAR(100) NOT NULL,
  capacity_chairs INT NOT NULL,
  capacity_tables INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity_available INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO tents (tent_name, capacity_chairs, capacity_tables, price, quantity_available) VALUES
('Standard Atican Tent', 25, 3, 50000, 3),
('Space Atican Tent', 50, 6, 100000, 2),
('VIP Atican Tent', 100, 20, 300000, 2),
('VVIP Atican Tent', 50, 10, 300000, 1);

-- ============================================
-- EXPERIENCES TABLE
-- ============================================
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  price_unit VARCHAR(50) DEFAULT 'per_group',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO experiences (name, description, price, price_unit) VALUES
('Bonfire', 'Evening beach bonfire experience', 30000, 'per_group'),
('Sack Race', 'Fun beach sack race activity', 5000, 'per_group'),
('Beach Ball', 'Beach ball games and activities', 10000, 'per_group'),
('Horse Riding', 'Beach horse riding experience', 3000, 'per_ride');

-- ============================================
-- EVENT SPACES TABLE
-- ============================================
CREATE TABLE event_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_name VARCHAR(100) NOT NULL,
  capacity_chairs INT,
  capacity_tables INT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO event_spaces (space_name, capacity_chairs, capacity_tables, description, price) VALUES
('Small Setup', 5, 1, 'Intimate gathering space', 15000),
('Medium Setup', NULL, NULL, 'Wooden chairs + sofas setup', 30000),
('Large Setup', 25, 3, 'Large group event space', 50000),
('XL Setup', 50, 6, 'Extra large event space', 100000),
('Photo Shoot', NULL, NULL, 'Professional photo shoot location', 50000),
('Video Shoot', NULL, NULL, 'Professional video shoot location', 100000),
('VIP Event Space', NULL, NULL, 'Exclusive VIP event area', 300000);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE dining_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE room_service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE gate_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference VARCHAR(20) REFERENCES bookings(booking_reference) ON DELETE SET NULL,
  entry_time TIMESTAMP DEFAULT NOW(),
  exit_time TIMESTAMP,
  verification_method VARCHAR(20) CHECK (verification_method IN ('qr', 'manual', 'nfc')),
  verified_by VARCHAR(100),
  notes TEXT
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
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_service_orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- BOOKINGS POLICIES
-- ============================================
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- BOOKING ITEMS POLICIES
-- ============================================
CREATE POLICY "Users can view own booking items" ON booking_items
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );
CREATE POLICY "Users can insert own booking items" ON booking_items
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- ============================================
-- DINING RESERVATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view own dining reservations" ON dining_reservations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dining reservations" ON dining_reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ROOM SERVICE ORDERS POLICIES
-- ============================================
CREATE POLICY "Users can view own room service orders" ON room_service_orders
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );
CREATE POLICY "Users can insert own room service orders" ON room_service_orders
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE auth.uid() = user_id)
  );

-- ============================================
-- GRANT PUBLIC ACCESS TO READ-ONLY TABLES
-- ============================================
GRANT SELECT ON rooms TO anon, authenticated;
GRANT SELECT ON tents TO anon, authenticated;
GRANT SELECT ON experiences TO anon, authenticated;
GRANT SELECT ON event_spaces TO anon, authenticated;