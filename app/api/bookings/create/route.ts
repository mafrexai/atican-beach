import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { generateConfirmationCode, generateBookingReference } from '@/lib/utils/bookingCodes'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'
import QRCode from 'qrcode'
import { apiSuccess, apiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestInfo, items, totalAmount, paymentReference } = body as {
      guestInfo: { name: string; email: string; phone?: string; specialRequests?: string }
      items: Array<{ id: string; type: string; name: string; price: number; quantity: number; metadata?: Record<string, unknown> }>
      totalAmount: number
      paymentReference?: string
    }

    // Use server client to read session from cookies
    const serverSupabase = await createServerSupabaseClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return apiError('Authentication required. Please log in to complete your booking.', 401)
    }

    const userId = user.id

    // Use admin client for database operations (bypers RLS for writes)
    const supabase = createAdminClient()

    const bookingReference = generateBookingReference()
    const confirmationCode = generateConfirmationCode()

    const qrData = JSON.stringify({
      bookingRef: bookingReference,
      confirmationCode,
      guestName: guestInfo.name,
    })
    const qrCode = await QRCode.toDataURL(qrData)

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
      return apiError(`Failed to create booking: ${bookingError.message}`, 500)
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
      return apiError(`Failed to save booking items: ${itemsError.message}`, 500)
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

    return apiSuccess({
      reference: bookingReference,
      confirmationCode,
      qrCode,
      totalAmount,
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return apiError(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}