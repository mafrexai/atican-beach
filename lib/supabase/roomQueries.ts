import type { Room } from "@/types/database"
import { createServerSupabaseClient } from './server'

// ========== ROOM AVAILABILITY SYSTEM ==========

export async function getAvailableRooms(): Promise<Room[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'available')
    .order('room_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching available rooms:', error)
    return []
  }
  return (data || []) as Room[]
}

export async function getBookedRooms(): Promise<Array<Room & { booking: any }>> {
  const supabase = await createServerSupabaseClient()
  
  // Fix: Use proper select syntax with joins
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items (
        *
      )
    `)
    .in('status', ['confirmed', 'pending'])
    .order('check_in_date', { ascending: true })
  
  if (bookingsError || !bookings) {
    console.error('Error fetching bookings:', bookingsError)
    return []
  }
  
  // Extract room IDs from booking items with proper typing
  const roomIds = bookings
    .flatMap((b: any) => b.booking_items?.filter((i: any) => i.item_type === 'room').map((i: any) => i.item_id) || [])
    .filter(Boolean)
  
  if (roomIds.length === 0) return []
  
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .in('id', roomIds)
  
  if (roomsError || !rooms) {
    console.error('Error fetching rooms:', roomsError)
    return []
  }
  
  // Map rooms with their bookings
  const result: Array<Room & { booking: any }> = []
  
  for (const room of rooms) {
    const booking = bookings.find((b: any) => 
      b.booking_items?.some((i: any) => i.item_type === 'room' && i.item_id === room.id)
    )
    result.push({ ...(room as Room), booking: booking || null })
  }
  
  return result
}

export async function getRoomWithBooking(roomId: string): Promise<(Room & { booking: any }) | null> {
  const supabase = await createServerSupabaseClient()
  
  // Get room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) {
    console.error('Error fetching room:', roomError)
    return null
  }
  
  // Get booking for this room
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items (
        *
      )
    `)
    .in('status', ['confirmed', 'pending'])
    .filter('booking_items.item_id', 'eq', roomId)
    .filter('booking_items.item_type', 'eq', 'room')
    .maybeSingle()
  
  if (bookingsError) {
    console.error('Error fetching booking:', bookingsError)
    return { ...(room as Room), booking: null }
  }
  
  return { ...(room as Room), booking: bookings || null }
}

export async function updateRoomStatus(roomId: string, status: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('rooms')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', roomId)
  
  if (error) {
    console.error('Error updating room status:', error)
    return false
  }
  return true
}