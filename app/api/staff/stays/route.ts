import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeFrontDesk } from '@/lib/staff/authorize'

const actionSchema = z.object({
  bookingId: z.string().uuid(),
  action: z.enum(['check_in', 'check_out']),
})

interface BookingRow { id: string; [key: string]: unknown }
interface RoomItemRow { booking_id: string; item_id: string }
interface RoomRow { id: string; room_number: string; room_type: string }

export async function GET(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const query = request.nextUrl.searchParams.get('query')?.trim()
  if (!query || query.length < 2 || query.length > 150) {
    return NextResponse.json({ error: 'Enter a booking reference or guest email.' }, { status: 400 })
  }

  let bookingsQuery = auth.admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(10)
  bookingsQuery = query.toUpperCase().startsWith('AB-') || query.toUpperCase().startsWith('ATC-')
    ? bookingsQuery.ilike('booking_reference', query)
    : bookingsQuery.ilike('guest_email', `%${query.replace(/[%_,()]/g, '')}%`)
  const { data, error } = await bookingsQuery
  if (error) return NextResponse.json({ error: 'Unable to search bookings right now.' }, { status: 500 })
  const bookings = (data || []) as BookingRow[]
  const bookingIds = bookings.map((booking) => booking.id)
  if (!bookingIds.length) return NextResponse.json({ bookings: [] })

  const { data: roomItems } = await auth.admin.from('booking_items')
    .select('booking_id, item_id').in('booking_id', bookingIds).eq('item_type', 'room')
  const typedRoomItems = (roomItems || []) as RoomItemRow[]
  const roomIds = [...new Set(typedRoomItems.map((item) => item.item_id))]
  const { data: rooms } = roomIds.length
    ? await auth.admin.from('rooms').select('id, room_number, room_type').in('id', roomIds)
    : { data: [] }
  const roomById = new Map(((rooms || []) as RoomRow[]).map((room) => [room.id, room]))
  const enriched = bookings.map((booking) => ({ ...booking,
    room_details: typedRoomItems.filter((item) => item.booking_id === booking.id)
      .map((item) => roomById.get(item.item_id)).filter(Boolean),
  }))
  return NextResponse.json({ bookings: enriched })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const parsed = actionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid stay operation.' }, { status: 400 })
  const { data, error } = await auth.admin.rpc('process_front_desk_stay', {
    p_booking_id: parsed.data.bookingId, p_action: parsed.data.action, p_user_id: auth.userId,
  })
  if (error) return NextResponse.json({ error: stayErrorMessage(error.message) }, { status: 409 })
  return NextResponse.json({ success: true, operation: data,
    message: parsed.data.action === 'check_in' ? 'Guest checked in successfully.' : 'Guest checked out. The room is now awaiting housekeeping.' })
}

function stayErrorMessage(message: string) {
  if (message.includes('ROOM_NOT_READY')) return 'The assigned room is not ready. Complete housekeeping or maintenance first.'
  if (message.includes('ROOM_REQUIRED')) return 'This reservation does not include a room.'
  if (message.includes('ALREADY_CHECKED')) return 'This stay operation has already been completed.'
  if (message.includes('NOT_CHECKED_IN')) return 'The guest must be checked in before checkout.'
  if (message.includes('BOOKING_NOT_ACTIVE')) return 'This booking is not active.'
  return 'Unable to complete this stay operation.'
}
