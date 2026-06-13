import { createClient } from '@/lib/supabase/client'

export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const supabase = createClient()

  const { data: conflictingBookings, error } = await supabase
    .from('bookings')
    .select('id, booking_items!inner(*)')
    .eq('booking_items.item_type', 'room')
    .eq('booking_items.item_id', roomId)
    .in('status', ['pending', 'confirmed'])
    .or(`check_in_date.lte.${checkOut},check_out_date.gte.${checkIn}`)

  if (error) {
    console.error('Availability check error:', error)
    return false
  }

  return !conflictingBookings || conflictingBookings.length === 0
}

export async function checkTentAvailability(
  tentId: string,
  date: string
): Promise<boolean> {
  const supabase = createClient()

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: bookingsOnDate, error } = await supabase
    .from('bookings')
    .select('id, booking_items!inner(*)')
    .eq('booking_items.item_type', 'tent')
    .eq('booking_items.item_id', tentId)
    .eq('status', 'confirmed')
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())

  if (error) {
    console.error('Tent availability error:', error)
    return false
  }

  const { data: tent } = await supabase
    .from('tents')
    .select('quantity_available')
    .eq('id', tentId)
    .single()

  const bookedCount = bookingsOnDate?.length ?? 0
  return bookedCount < (tent?.quantity_available ?? 0)
}