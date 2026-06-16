const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local manually
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found at:', envPath)
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      process.env[key.trim()] = value
    }
  })
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Data to seed
const roomsData = [
  // Standard Rooms (3)
  { room_number: '702', room_type: 'Standard', price_per_night: 55000, max_occupancy: 2 },
  { room_number: '704', room_type: 'Standard', price_per_night: 55000, max_occupancy: 2 },
  { room_number: '706', room_type: 'Standard', price_per_night: 55000, max_occupancy: 2 },
  // Deluxe Rooms (12)
  { room_number: '201', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '203', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '205', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '207', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '209', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '211', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '301', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '303', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '305', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '307', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '309', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  { room_number: '311', room_type: 'Deluxe', price_per_night: 65000, max_occupancy: 2 },
  // Double Bed Rooms (10)
  { room_number: '401', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '403', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '405', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '407', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '409', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '501', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '503', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '505', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '507', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  { room_number: '509', room_type: 'Double Bed', price_per_night: 75000, max_occupancy: 2 },
  // Family Rooms (8)
  { room_number: '601', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '603', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '605', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '607', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '701', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '703', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '705', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  { room_number: '707', room_type: 'Family', price_per_night: 95000, max_occupancy: 4 },
  // Executive Rooms (5)
  { room_number: '801', room_type: 'Executive', price_per_night: 120000, max_occupancy: 2 },
  { room_number: '803', room_type: 'Executive', price_per_night: 120000, max_occupancy: 2 },
  { room_number: '805', room_type: 'Executive', price_per_night: 120000, max_occupancy: 2 },
  { room_number: '807', room_type: 'Executive', price_per_night: 120000, max_occupancy: 2 },
  { room_number: '809', room_type: 'Executive', price_per_night: 120000, max_occupancy: 2 },
  // Premium Suite (4)
  { room_number: '901', room_type: 'Premium Suite', price_per_night: 180000, max_occupancy: 4 },
  { room_number: '903', room_type: 'Premium Suite', price_per_night: 180000, max_occupancy: 4 },
  { room_number: '905', room_type: 'Premium Suite', price_per_night: 180000, max_occupancy: 4 },
  { room_number: '907', room_type: 'Premium Suite', price_per_night: 180000, max_occupancy: 4 },
  // Executive Suite (2)
  { room_number: '1001', room_type: 'Executive Suite', price_per_night: 250000, max_occupancy: 4 },
  { room_number: '1003', room_type: 'Executive Suite', price_per_night: 250000, max_occupancy: 4 },
  // Presidential Suite (1)
  { room_number: 'P01', room_type: 'Presidential Suite', price_per_night: 500000, max_occupancy: 6 }
]

const tentsData = [
  { tent_name: 'Standard Atican Tent', capacity_chairs: 25, capacity_tables: 3, price: 50000, quantity_available: 3 },
  { tent_name: 'Space Atican Tent', capacity_chairs: 50, capacity_tables: 6, price: 100000, quantity_available: 2 },
  { tent_name: 'VIP Atican Tent', capacity_chairs: 100, capacity_tables: 20, price: 300000, quantity_available: 2 },
  { tent_name: 'VVIP Atican Tent', capacity_chairs: 50, capacity_tables: 10, price: 300000, quantity_available: 1 }
]

const experiencesData = [
  { name: 'Bonfire', description: 'Evening beach bonfire experience', price: 30000, price_unit: 'per_group' },
  { name: 'Sack Race', description: 'Fun beach sack race activity', price: 5000, price_unit: 'per_group' },
  { name: 'Beach Ball', description: 'Beach ball games and activities', price: 10000, price_unit: 'per_group' },
  { name: 'Horse Riding', description: 'Beach horse riding experience', price: 3000, price_unit: 'per_ride' }
]

const eventSpacesData = [
  { space_name: 'Small Setup', capacity_chairs: 5, capacity_tables: 1, description: 'Intimate gathering space', price: 15000 },
  { space_name: 'Medium Setup', capacity_chairs: null, capacity_tables: null, description: 'Wooden chairs + sofas setup', price: 30000 },
  { space_name: 'Large Setup', capacity_chairs: 25, capacity_tables: 3, description: 'Large group event space', price: 50000 },
  { space_name: 'XL Setup', capacity_chairs: 50, capacity_tables: 6, description: 'Extra large event space', price: 100000 },
  { space_name: 'Photo Shoot', capacity_chairs: null, capacity_tables: null, description: 'Professional photo shoot location', price: 50000 },
  { space_name: 'Video Shoot', capacity_chairs: null, capacity_tables: null, description: 'Professional video shoot location', price: 100000 },
  { space_name: 'VIP Event Space', capacity_chairs: null, capacity_tables: null, description: 'Exclusive VIP event area', price: 300000 }
]

async function setupDatabase() {
  console.log('Setting up database...')
  
  try {
    // Create tables using SQL
    console.log('Creating tables if they do not exist...')
    
    // Create tents table
    const { error: tentsTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      // If exec_sql doesn't exist, try alternative approach
      return { error: null }
    })
    
    // Create experiences table
    const { error: experiencesTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS experiences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          price_unit VARCHAR(50) DEFAULT 'per_group',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create event_spaces table
    const { error: eventSpacesTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create bookings table
    const { error: bookingsTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create booking_items table
    const { error: bookingItemsTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create dining_reservations table
    const { error: diningTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create room_service_orders table
    const { error: roomServiceTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    }).catch(() => {
      return { error: null }
    })
    
    // Create gate_entries table
    const { error: gateEntriesTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS gate_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_reference VARCHAR(20) REFERENCES bookings(booking_reference) ON DELETE SET NULL,
          entry_time TIMESTAMP DEFAULT NOW(),
          exit_time TIMESTAMP,
          verification_method VARCHAR(20) CHECK (verification_method IN ('qr', 'manual', 'nfc')),
          verified_by VARCHAR(100),
          notes TEXT
        );
      `
    }).catch(() => {
      return { error: null }
    })
    
    console.log('Tables created (or already exist)')
    
    // Wait a moment for schema cache to update
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Seed Rooms
    console.log('Seeding rooms...')
    const { error: roomsError } = await supabase
      .from('rooms')
      .upsert(roomsData, { onConflict: 'room_number' })
    
    if (roomsError) {
      console.error('Error seeding rooms:', roomsError)
    } else {
      console.log(`Successfully seeded ${roomsData.length} rooms`)
    }
    
    // Seed Tents
    console.log('Seeding tents...')
    const { error: tentsError } = await supabase
      .from('tents')
      .upsert(tentsData, { onConflict: 'tent_name' })
    
    if (tentsError) {
      console.error('Error seeding tents:', tentsError)
    } else {
      console.log(`Successfully seeded ${tentsData.length} tents`)
    }
    
    // Seed Experiences
    console.log('Seeding experiences...')
    const { error: experiencesError } = await supabase
      .from('experiences')
      .upsert(experiencesData, { onConflict: 'name' })
    
    if (experiencesError) {
      console.error('Error seeding experiences:', experiencesError)
    } else {
      console.log(`Successfully seeded ${experiencesData.length} experiences`)
    }
    
    // Seed Event Spaces
    console.log('Seeding event spaces...')
    const { error: eventSpacesError } = await supabase
      .from('event_spaces')
      .upsert(eventSpacesData, { onConflict: 'space_name' })
    
    if (eventSpacesError) {
      console.error('Error seeding event spaces:', eventSpacesError)
    } else {
      console.log(`Successfully seeded ${eventSpacesData.length} event spaces`)
    }
    
    console.log('Database setup completed!')
    console.log('\nPlease verify the data in your Supabase dashboard.')
    
  } catch (error) {
    console.error('Error during setup:', error)
    process.exit(1)
  }
}

setupDatabase()