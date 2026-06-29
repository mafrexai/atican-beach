import type { Room } from @/types/database
﻿// ========== ROOM AVAILABILITY SYSTEM ==========

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
  return (data ?? []) as unknown as Room[]
}

export async function getBookedRooms(): Promise<Array<Room & { booking: any }> {
  const supabase = await createServerSupabaseClient()
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      *,
      booking_items(*)
    )
    .in('status', ['confirmed', 'pending'])
    .order('check_in_date', { ascending: true })
  
  if (bookingsError || !bookings) return []
  
  const roomIds = bookings
    .flatMap(b => b.booking_items?.filter(i => i.item_type === 'room').map(i => i.item_id) || [])
    .filter(Boolean)
  
  if (roomIds.length === 0) return []
  
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .in('id', roomIds)
  
  if (roomsError || !rooms) return []
  
  return rooms.map(room => {
    const booking = bookings.find(b => 
      b.booking_items?.some(i => i.item_type === 'room' && i.item_id === room.id)
    )
    return { ...room, booking }
  }) as Array<Room & { booking: any }>
}

export async function getRoomWithBooking(roomId: string): Promise<(Room & { booking: any }) | null> {
  const supabase = await createServerSupabaseClient()
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (roomError || !room) return null
  
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      *,
      booking_items(*)
    )
    .in('status', ['confirmed', 'pending'])
    .filter('booking_items.item_id', 'eq', roomId)
    .filter('booking_items.item_type', 'eq', 'room')
    .maybeSingle()
  
  return { ...(room as Room), booking: bookingsError ? null : bookings }
}

export async function updateRoomStatus(roomId: string, status: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('rooms')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', roomId)
  return !error
}
