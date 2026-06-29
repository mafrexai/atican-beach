import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateConfirmationCode, generateBookingReference } from '@/lib/utils/bookingCodes'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'
import QRCode from 'qrcode'

/**
 * AI Booking Endpoint
 * Creates a booking from AI conversation and sends confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      guestName,
      guestEmail,
      guestPhone,
      roomType,
      checkIn,
      checkOut,
      guests,
      specialRequests,
    } = body as {
      guestName: string
      guestEmail: string
      guestPhone?: string
      roomType: string
      checkIn: string
      checkOut: string
      guests: number
      specialRequests?: string
    }

    if (!guestName || !guestEmail || !roomType || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, roomType, checkIn, checkOut' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find available room of the requested type
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_type', roomType)
      .eq('is_active', true)
      .eq('status', 'available')
      .limit(1)

    if (roomsError || !rooms || rooms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No available ' + roomType + ' rooms found' },
        { status: 404 }
      )
    }

    const room = rooms[0]
    const roomPrice = room.price_per_night

    // Calculate number of nights
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (nights <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates: check-out must be after check-in' },
        { status: 400 }
      )
    }

    const totalAmount = roomPrice * nights
    const bookingReference = generateBookingReference()
    const confirmationCode = generateConfirmationCode()

    const qrData = JSON.stringify({
      bookingRef: bookingReference,
      confirmationCode,
      guestName,
    })
    const qrCode = await QRCode.toDataURL(qrData)

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: bookingReference,
        confirmation_code: confirmationCode,
        user_id: null,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        status: 'pending',
        qr_code: qrCode,
        check_in_date: checkIn,
        check_out_date: checkOut,
        booking_type: 'online',
        special_requests: specialRequests || null,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('[AI Book] Booking creation error:', bookingError)
      return NextResponse.json(
        { success: false, error: 'Failed to create booking: ' + bookingError.message },
        { status: 500 }
      )
    }

    // Update room status to booked
    await supabase.from('rooms').update({ status: 'booked' }).eq('id', room.id);

    // Create booking item
    await supabase.from('booking_items').insert({
      booking_id: booking.id,
      item_type: 'room',
      item_id: room.id,
      quantity: nights,
      price_at_booking: roomPrice,
      start_date: checkIn,
      end_date: checkOut,
      metadata: { guests, room_number: room.room_number },
    })

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
        roomNumber: room.room_number,
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
