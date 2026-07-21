import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeFrontDesk } from '@/lib/staff/authorize'
import { generateBookingReference, generateConfirmationCode } from '@/lib/utils/bookingCodes'

const bookingSchema = z.object({
  guestName: z.string().trim().min(2).max(200),
  guestEmail: z.string().trim().email().max(200),
  guestPhone: z.string().trim().max(30).optional().default(''),
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
  specialRequests: z.string().trim().max(2000).optional().default(''),
  paymentStatus: z.enum(['paid', 'unpaid']).default('unpaid'),
  paymentReference: z.string().trim().max(100).optional().default(''),
  items: z.array(z.object({
    itemType: z.enum(['room', 'tent', 'experience']),
    itemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(30),
  })).min(1).max(20),
})

export async function GET() {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const [rooms, tents, experiences] = await Promise.all([
    auth.admin.from('rooms').select('id, room_number, room_type, price_per_night, max_occupancy, is_active, status, housekeeping_status').eq('is_active', true).order('room_number'),
    auth.admin.from('tents').select('id, tent_name, price, quantity_available, is_active').eq('is_active', true).order('tent_name'),
    auth.admin.from('experiences').select('id, name, price, price_unit, is_active').eq('is_active', true).order('name'),
  ])
  if (rooms.error || tents.error || experiences.error) return NextResponse.json({ error: 'Unable to load booking inventory.' }, { status: 500 })
  return NextResponse.json({ rooms: rooms.data || [], tents: tents.data || [], experiences: experiences.data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const parsed = bookingSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please check the guest, dates, payment, and selected items.', details: parsed.error.flatten() }, { status: 400 })
  const booking = parsed.data
  if (booking.checkInDate >= booking.checkOutDate) return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  if (booking.paymentStatus === 'paid' && !booking.paymentReference) return NextResponse.json({ error: 'A payment reference is required for a paid booking.' }, { status: 400 })

  const reference = generateBookingReference()
  const confirmationCode = generateConfirmationCode()
  const { data, error } = await auth.admin.rpc('create_walk_in_booking_atomic', {
    p_booking_reference: reference, p_confirmation_code: confirmationCode,
    p_guest_name: booking.guestName, p_guest_email: booking.guestEmail, p_guest_phone: booking.guestPhone,
    p_check_in: booking.checkInDate, p_check_out: booking.checkOutDate,
    p_special_requests: booking.specialRequests, p_payment_status: booking.paymentStatus,
    p_payment_reference: booking.paymentReference, p_items: booking.items, p_user_id: auth.userId,
  })
  if (error) return NextResponse.json({ error: bookingErrorMessage(error.message) }, { status: 409 })
  return NextResponse.json({ success: true, booking: data }, { status: 201 })
}

function bookingErrorMessage(message: string) {
  if (message.includes('ROOM_NOT_AVAILABLE')) return 'A selected room is no longer available for those dates.'
  if (message.includes('TENT_NOT_AVAILABLE')) return 'The requested tent quantity is no longer available.'
  if (message.includes('INVALID_BOOKING_DATES')) return 'Please enter valid future stay dates.'
  if (message.includes('ONE_ROOM_PER_SELECTION')) return 'Each physical room can only be selected once.'
  return 'Unable to create the walk-in booking. Please review the details and try again.'
}
