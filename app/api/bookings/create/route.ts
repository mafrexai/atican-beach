import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateConfirmationCode, generateBookingReference } from '@/lib/utils/bookingCodes'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestInfo, items, totalAmount, paymentReference, userId: bodyUserId } = body as {
      guestInfo: { name: string; email: string; phone?: string; specialRequests?: string }
      items: Array<{ id: string; type: string; name: string; price: number; quantity: number; metadata?: Record<string, unknown> }>
      totalAmount: number
      paymentReference?: string
      userId?: string
    }

    // Use admin client to bypass RLS for booking creation
    const supabase = createAdminClient()

    const bookingReference = generateBookingReference()
    const confirmationCode = generateConfirmationCode()

    const qrData = JSON.stringify({
      bookingRef: bookingReference,
      confirmationCode,
      guestName: guestInfo.name,
    })
    const qrCode = await QRCode.toDataURL(qrData)

    // Get user ID — try session first, fall back to body for client-side auth
    let userId: string | undefined
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    } else if (bodyUserId && typeof bodyUserId === 'string') {
      // Fallback: use userId from request body (passed from checkout page)
      userId = bodyUserId
      console.log('[Booking API] Using userId from request body:', userId)
    } else {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to complete your booking.' },
        { status: 401 }
      )
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: bookingReference,
        confirmation_code: confirmationCode,
        user_id: userId,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone ?? null,
        total_amount: totalAmount,
        payment_reference: paymentReference ?? null,
        payment_status: paymentReference ? 'paid' : 'unpaid',
        status: paymentReference ? 'confirmed' : 'pending',
        qr_code: qrCode,
        check_in_date: items.find((i) => i.type === 'room')?.metadata?.checkIn ?? null,
        check_out_date: items.find((i) => i.type === 'room')?.metadata?.checkOut ?? null,
        special_requests: guestInfo.specialRequests ?? null,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json({ error: `Failed to create booking: ${bookingError.message}` }, { status: 500 })
    }

    const bookingItems = items.map((item) => ({
      booking_id: booking.id,
      item_type: item.type,
      item_id: item.id,
      quantity: item.quantity,
      price_at_booking: item.price,
      start_date: item.metadata?.checkIn ?? null,
      end_date: item.metadata?.checkOut ?? null,
      metadata: item.metadata ?? {},
    }))

    const { error: itemsError } = await supabase
      .from('booking_items')
      .insert(bookingItems)

    if (itemsError) {
      console.error('Booking items error:', itemsError)
      return NextResponse.json({ error: `Failed to save booking items: ${itemsError.message}` }, { status: 500 })
    }

    const emailPayload: {
      bookingReference: string
      confirmationCode: string
      items: Array<{ name: string; price: number; quantity: number }>
      totalAmount: number
      qrCode: string
      guestName: string
      checkIn?: string
      checkOut?: string
    } = {
      bookingReference,
      confirmationCode,
      items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
      totalAmount,
      qrCode,
      guestName: guestInfo.name,
    }

    const roomItem = items.find((i) => i.type === 'room')
    const ci = roomItem?.metadata?.checkIn
    const co = roomItem?.metadata?.checkOut
    if (typeof ci === 'string') emailPayload.checkIn = ci
    if (typeof co === 'string') emailPayload.checkOut = co

    await sendBookingConfirmation(guestInfo.email, emailPayload)

    return NextResponse.json({
      success: true,
      booking: {
        reference: bookingReference,
        confirmationCode,
        qrCode,
        totalAmount,
      },
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}