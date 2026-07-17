import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateConfirmationCode, generateBookingReference } from '@/lib/utils/bookingCodes'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'
import { aiBookingSchema } from '@/lib/api/validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

/**
 * AI Booking Endpoint
 * Creates a booking from AI conversation and sends confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    const validation = aiBookingSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid booking details',
      }, { status: 400 })
    }

    const { guestName, guestEmail, guestPhone, roomType, checkIn, checkOut, guests, specialRequests } = validation.data

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(`${checkIn}T00:00:00`)
    const end = new Date(`${checkOut}T00:00:00`)
    if (start < today || end <= start) {
      return NextResponse.json({
        success: false,
        error: 'Check-in must be today or later, and check-out must be after check-in.',
      }, { status: 400 })
    }

    const supabase = createAdminClient() as SupabaseClient

    const bookingReference = generateBookingReference()
    const confirmationCode = generateConfirmationCode()

    const qrData = JSON.stringify({
      bookingRef: bookingReference,
      confirmationCode,
      guestName,
    })
    const qrCode = await QRCode.toDataURL(qrData)

    // The database function serializes room allocation and writes the booking
    // plus its room line item in one transaction.
    let { data: allocationRows, error: bookingError } = await supabase.rpc('create_room_booking_atomic', {
      p_booking_reference: bookingReference,
      p_confirmation_code: confirmationCode,
      p_user_id: null,
      p_guest_name: guestName,
      p_guest_email: guestEmail,
      p_guest_phone: guestPhone || '',
      p_room_type: roomType,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_special_requests: specialRequests || '',
      p_qr_code: qrCode,
      p_booking_type: 'ai_assisted',
    })

    // Preview/local environments may not have the new migration yet. Keep the
    // booking flow operational with a date-aware compatibility path; production
    // should still apply the atomic migration for concurrency protection.
    if (bookingError?.code === 'PGRST202') {
      const fallback = await createCompatibleRoomBooking(supabase, {
        bookingReference, confirmationCode, guestName, guestEmail,
        guestPhone: guestPhone || '', roomType, checkIn, checkOut, guests,
        specialRequests: specialRequests || '', qrCode,
      })
      allocationRows = fallback.data
      bookingError = fallback.error as typeof bookingError
    }

    if (bookingError) {
      console.error('[AI Book] Booking creation error:', bookingError)
      const unavailable = bookingError.message.includes('NO_ROOM_AVAILABLE')
      return NextResponse.json(
        { success: false, error: unavailable ? `No ${roomType} room is available for those dates and guest count.` : 'Unable to create the booking. Please try again.' },
        { status: unavailable ? 409 : 500 }
      )
    }

    const allocation = allocationRows?.[0]
    if (!allocation) {
      return NextResponse.json({ success: false, error: 'Booking allocation was not returned.' }, { status: 500 })
    }

    const roomPrice = Number(allocation.price_per_night)
    const nights = Number(allocation.nights)
    const totalAmount = Number(allocation.total_amount)

    // Send confirmation email
    try {
      await sendBookingConfirmation(guestEmail, {
        bookingReference,
        confirmationCode,
        items: [{ name: roomType + ' Room', price: roomPrice, quantity: nights }],
        totalAmount,
        qrCode,
        guestName,
        checkIn,
        checkOut,
        paymentPending: true,
      })
      console.log('[AI Book] Confirmation email sent to:', guestEmail)
    } catch (emailError) {
      console.error('[AI Book] Email send error:', emailError)
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        reference: bookingReference,
        confirmationCode,
        roomType,
        roomNumber: allocation.room_number,
        checkIn,
        checkOut,
        nights,
        totalAmount,
        guestName,
        guestEmail,
      },
    })
  } catch (error) {
    console.error('[AI Book] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface CompatibleBookingInput {
  bookingReference: string
  confirmationCode: string
  guestName: string
  guestEmail: string
  guestPhone: string
  roomType: string
  checkIn: string
  checkOut: string
  guests: number
  specialRequests: string
  qrCode: string
}

interface BookingDatabaseError {
  code: string
  message: string
  details: string
  hint: string
}

async function createCompatibleRoomBooking(
  supabase: SupabaseClient,
  input: CompatibleBookingInput
): Promise<{ data: Array<Record<string, unknown>> | null; error: BookingDatabaseError | null }> {
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, room_number, price_per_night, max_occupancy')
    .eq('room_type', input.roomType)
    .eq('is_active', true)
    .eq('status', 'available')
    .gte('max_occupancy', input.guests)
    .order('room_number')

  if (roomsError) return { data: null, error: roomsError }

  let room: { id: string; room_number: string; price_per_night: number; max_occupancy: number } | null = null
  for (const candidate of rooms || []) {
    const { data: available, error: availabilityError } = await supabase.rpc('check_room_availability', {
      p_room_id: candidate.id,
      p_check_in: input.checkIn,
      p_check_out: input.checkOut,
    })
    if (availabilityError) return { data: null, error: availabilityError }
    if (available) {
      room = candidate
      break
    }
  }

  if (!room) {
    return { data: null, error: compatibilityError('NO_ROOM_AVAILABLE', 'No matching room is available for the selected dates.') }
  }

  const nights = Math.ceil((new Date(`${input.checkOut}T00:00:00`).getTime() - new Date(`${input.checkIn}T00:00:00`).getTime()) / 86_400_000)
  const roomPrice = Number(room.price_per_night)
  const totalAmount = roomPrice * nights

  const { data: booking, error: bookingInsertError } = await supabase
    .from('bookings')
    .insert({
      booking_reference: input.bookingReference,
      confirmation_code: input.confirmationCode,
      user_id: null,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone || null,
      total_amount: totalAmount,
      payment_status: 'unpaid',
      status: 'pending',
      qr_code: input.qrCode,
      check_in_date: input.checkIn,
      check_out_date: input.checkOut,
      booking_type: 'ai_assisted',
      special_requests: input.specialRequests || null,
    })
    .select('id')
    .single()

  if (bookingInsertError) return { data: null, error: bookingInsertError }
  if (!booking) return { data: null, error: compatibilityError('BOOKING_INSERT_FAILED', 'The reservation record was not returned.') }

  const { error: itemError } = await supabase.from('booking_items').insert({
    booking_id: booking.id,
    item_type: 'room',
    item_id: room.id,
    quantity: nights,
    price_at_booking: roomPrice,
    start_date: input.checkIn,
    end_date: input.checkOut,
    metadata: { guests: input.guests, room_number: room.room_number },
  })

  if (itemError) {
    await supabase.from('bookings').delete().eq('id', booking.id)
    return { data: null, error: itemError }
  }

  return {
    data: [{
      booking_id: booking.id,
      room_id: room.id,
      room_number: room.room_number,
      price_per_night: roomPrice,
      nights,
      total_amount: totalAmount,
    }],
    error: null,
  }
}

function compatibilityError(code: string, message: string): BookingDatabaseError {
  return { code, message, details: message, hint: '' }
}
