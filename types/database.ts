export type RoomType = 'Standard' | 'Deluxe' | 'Double Bed' | 'Family' | 'Executive' | 'Premium Suite' | 'Executive Suite' | 'Presidential Suite'

export type UserRole = 'admin' | 'staff' | 'guest' | 'front_desk'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  staff_name: string | null
  staff_email: string | null
  shift: string | null
  is_active: boolean
  hire_date: string | null
  created_at: string
}

export interface Room {
  id: string
  room_number: string
  room_type: string
  price_per_night: number
  max_occupancy: number
  amenities: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
  image_url?: string | null
  image_alt?: string | null
  image_metadata?: Record<string, unknown>
  gallery_images?: string[] | null
}

export interface Tent {
  id: string
  tent_name: string
  capacity_chairs: number
  capacity_tables: number
  price: number
  quantity_available: number
  is_active: boolean
  created_at: string
  image_url?: string | null
  image_alt?: string | null
  image_metadata?: Record<string, unknown>
  gallery_images?: string[] | null
}

export interface Experience {
  id: string
  name: string
  description: string | null
  price: number
  price_unit: string
  is_active: boolean
  created_at: string
  image_url?: string | null
  image_alt?: string | null
  image_metadata?: Record<string, unknown>
  gallery_images?: string[] | null
}

export interface RoomFeature {
  id: string
  room_id: string
  feature_name: string
  feature_value: string | null
  feature_icon: string
  display_order: number
  is_premium: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EventSpace {
  id: string
  space_name: string
  capacity_chairs: number | null
  capacity_tables: number | null
  description: string | null
  price: number
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  booking_reference: string
  confirmation_code: string
  user_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  payment_reference: string | null
  qr_code: string | null
  check_in_date: string | null
  check_out_date: string | null
  special_requests: string | null
  created_at: string
  updated_at: string
  // Staff dashboard fields
  created_by: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  confirmed_by: string | null
  booking_type: 'online' | 'walk_in'
}

export interface BookingItem {
  id: string
  booking_id: string
  item_type: 'room' | 'tent' | 'experience' | 'event_space' | 'dining'
  item_id: string
  quantity: number
  price_at_booking: number
  start_date: string | null
  end_date: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface BookingComment {
  id: string
  booking_id: string
  user_id: string | null
  comment: string
  is_internal: boolean
  created_at: string
}

export interface BookingActivityLog {
  id: string
  booking_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface DiningReservation {
  id: string
  booking_reference: string
  user_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  reservation_date: string
  reservation_time: string
  party_size: number
  table_number: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  special_requests: string | null
  created_at: string
}

export interface RoomServiceOrder {
  id: string
  order_reference: string
  booking_id: string | null
  room_number: string | null
  items: Record<string, unknown>
  total_amount: number
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled'
  requested_pickup: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GateEntry {
  id: string
  booking_reference: string | null
  entry_time: string
  exit_time: string | null
  verification_method: 'qr' | 'manual' | 'nfc' | null
  verified_by: string | null
  notes: string | null
}