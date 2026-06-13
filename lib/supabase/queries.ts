import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Room, Tent, Experience, EventSpace, Booking, BookingItem, Profile } from '@/types/database'

// ========== ROOMS ==========

export async function getRooms(): Promise<Room[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('price_per_night', { ascending: true })

  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }
  return (data ?? []) as unknown as Room[]
}

export async function getRoomById(id: string): Promise<Room | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching room:', error)
    return null
  }
  return (data ?? null) as unknown as Room | null
}

export async function getRoomTypes(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('room_type')
    .eq('is_active', true)

  if (error) return []
  const types = [...new Set((data as { room_type: string }[]).map((r) => r.room_type))]
  return types
}

export async function getFeaturedRooms(limit = 5): Promise<Room[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('price_per_night', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured rooms:', error)
    return []
  }
  return data as Room[]
}

// ========== TENTS ==========

export async function getTents(): Promise<Tent[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('tents')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching tents:', error)
    return []
  }
  return data as Tent[]
}

// ========== EXPERIENCES ==========

export async function getExperiences(): Promise<Experience[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching experiences:', error)
    return []
  }
  return data as Experience[]
}

// ========== EVENT SPACES ==========

export async function getEventSpaces(): Promise<EventSpace[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('event_spaces')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching event spaces:', error)
    return []
  }
  return data as EventSpace[]
}

// ========== BOOKINGS ==========

export async function getUserBookings(userId: string): Promise<Array<Booking & { items: BookingItem[] }>> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user bookings:', error)
    return []
  }
  return data as Array<Booking & { items: BookingItem[] }>
}

export async function getBookingByReference(reference: string): Promise<(Booking & { items: BookingItem[] }) | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items(*)
    `)
    .eq('booking_reference', reference)
    .single()

  if (error) {
    console.error('Error fetching booking:', error)
    return null
  }
  return data as Booking & { items: BookingItem[] }
}

// ========== PROFILE ==========

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data as Profile
}