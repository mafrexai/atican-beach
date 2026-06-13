export interface User {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'guest' | 'admin'
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string
  price_per_night: number
  capacity: number
  amenities: string[]
  images: string[]
  is_available: boolean
  created_at: string
}

export interface Tent {
  id: string
  name: string
  description: string
  price_per_night: number
  capacity: number
  amenities: string[]
  images: string[]
  is_available: boolean
  created_at: string
}

export interface Experience {
  id: string
  name: string
  description: string
  price: number
  duration: number
  images: string[]
  is_available: boolean
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  room_id?: string
  tent_id?: string
  experience_id?: string
  check_in: string
  check_out: string
  guests: number
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'refunded'
  created_at: string
}

export interface CartItem {
  id: string
  type: 'room' | 'tent' | 'experience'
  name: string
  price: number
  quantity: number
  check_in?: string
  check_out?: string
}