import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeFrontDesk } from '@/lib/staff/authorize'
import { generateBookingReference, generateConfirmationCode } from '@/lib/utils/bookingCodes'

const DEFAULT_PRICE = 25000
const DEFAULT_DURATION_MINUTES = 60

const createSchema = z.object({
  roomId: z.string().uuid(),
  guestName: z.string().trim().min(2).max(200),
  guestEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  guestPhone: z.string().trim().max(30).optional().default(''),
  price: z.number().positive().max(1_000_000).default(DEFAULT_PRICE),
  durationMinutes: z.number().int().min(15).max(480).default(DEFAULT_DURATION_MINUTES),
  paymentMethod: z.enum(['cash', 'mafrexpay']).default('cash'),
})

interface RoomRow { id: string; room_number: string; room_type: string; status: string; housekeeping_status: string }
interface ShortRestRow {
  id: string; room_id: string; booking_id: string; price: number; duration_minutes: number
  started_at: string | null; ends_at: string | null; status: string
}
interface BookingRow { id: string; guest_name: string; guest_phone: string | null; guest_email: string; payment_status: string; booking_reference: string }
interface OccupiedRoomRow { item_id: string }

export async function GET() {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response

  const [roomsResult, activeRestsResult, occupiedResult] = await Promise.all([
    auth.admin.from('rooms').select('id, room_number, room_type, status, housekeeping_status')
      .eq('is_active', true).eq('status', 'available').eq('housekeeping_status', 'available').order('room_number'),
    auth.admin.from('room_short_rests').select('id, room_id, booking_id, price, duration_minutes, started_at, ends_at, status').in('status', ['active', 'pending_payment']),
    auth.admin.from('booking_items').select('item_id, bookings!inner(checked_in_at, checked_out_at)').eq('item_type', 'room')
      .not('bookings.checked_in_at', 'is', null).is('bookings.checked_out_at', null),
  ])

  if (roomsResult.error || activeRestsResult.error || occupiedResult.error) {
    return NextResponse.json({ error: 'Unable to load short rest data.' }, { status: 500 })
  }

  const activeRests = (activeRestsResult.data || []) as ShortRestRow[]
  const bookingIds = activeRests.map((r) => r.booking_id)
  const { data: bookingRows } = bookingIds.length
    ? await auth.admin.from('bookings').select('id, guest_name, guest_phone, guest_email, payment_status, booking_reference').in('id', bookingIds)
    : { data: [] as BookingRow[] }
  const bookingsById = new Map(((bookingRows || []) as BookingRow[]).map((b) => [b.id, b]))

  const shortRestRoomIds = new Set(activeRests.map((r) => r.room_id))
  const occupiedRoomIds = new Set(((occupiedResult.data || []) as OccupiedRoomRow[]).map((r) => r.item_id))
  const rooms = ((roomsResult.data || []) as RoomRow[]).filter((r) => !shortRestRoomIds.has(r.id) && !occupiedRoomIds.has(r.id))

  const shortRests = activeRests.map((r) => ({ ...r, booking: bookingsById.get(r.booking_id) || null }))

  return NextResponse.json({ rooms, shortRests, defaults: { price: DEFAULT_PRICE, durationMinutes: DEFAULT_DURATION_MINUTES } })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please check the room, guest name, price, and duration.', details: parsed.error.flatten() }, { status: 400 })
  const input = parsed.data

  const reference = generateBookingReference()
  const confirmationCode = generateConfirmationCode()
  const paymentStatus = input.paymentMethod === 'cash' ? 'paid' : 'unpaid'

  const { data, error } = await auth.admin.rpc('create_short_rest_atomic', {
    p_room_id: input.roomId, p_booking_reference: reference, p_confirmation_code: confirmationCode,
    p_guest_name: input.guestName, p_guest_email: input.guestEmail || null, p_guest_phone: input.guestPhone,
    p_price: input.price, p_duration_minutes: input.durationMinutes,
    p_payment_status: paymentStatus, p_payment_reference: null, p_user_id: auth.userId,
  })
  if (error) return NextResponse.json({ error: shortRestErrorMessage(error.message) }, { status: 409 })

  return NextResponse.json({ success: true, shortRest: data, paymentMethod: input.paymentMethod }, { status: 201 })
}

function shortRestErrorMessage(message: string) {
  if (message.includes('ROOM_ON_SHORT_REST')) return 'This room is already on a short rest.'
  if (message.includes('ROOM_OCCUPIED')) return 'This room currently has a checked-in guest.'
  if (message.includes('ROOM_NOT_READY')) return 'This room is not marked available (check status/housekeeping).'
  if (message.includes('ROOM_NOT_FOUND')) return 'That room could not be found.'
  if (message.includes('INVALID_DURATION')) return 'Duration must be between 15 minutes and 8 hours.'
  if (message.includes('INVALID_PRICE')) return 'Please enter a valid price.'
  return 'Unable to start the short rest. Please review the details and try again.'
}
