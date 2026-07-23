import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createPaymentOrder, MafrexPayError } from '@/lib/mafrexpay'
import { initializeTransaction } from '@/lib/paystack'
import { getActivePaymentProvider } from '@/lib/payments/config'
import { apiSuccess, apiError } from '@/lib/api/responses'
import { initializePaymentSchema } from '@/lib/api/validation'

function paymentReturnUrls(request: NextRequest, callbackUrl?: string) {
  const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const success = new URL(callbackUrl || '/booking/confirmation', fallbackOrigin)
  const allowedOrigin = new URL(fallbackOrigin).origin
  if (success.origin !== allowedOrigin && success.origin !== request.nextUrl.origin) {
    throw new Error('INVALID_CALLBACK_ORIGIN')
  }
  const cancel = new URL(success)
  cancel.searchParams.set('payment', 'cancelled')
  return { successUrl: success.toString(), cancelUrl: cancel.toString() }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = initializePaymentSchema.safeParse(await request.json())
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return apiError(`Validation failed: ${errors}`, 400, 'VALIDATION_ERROR')
    }

    const provider = getActivePaymentProvider()
    if (!provider) return apiError('Payment system is not configured.', 503, 'PAYMENT_NOT_CONFIGURED')

    const { email, bookingReference, callbackUrl } = parsed.data
    const supabase = createAdminClient()
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, booking_reference, guest_email, guest_name, guest_phone, total_amount, status, payment_status')
      .eq('booking_reference', bookingReference)
      .single()

    if (error || !booking) return apiError('Booking not found', 404, 'BOOKING_NOT_FOUND')
    if (booking.status !== 'pending') return apiError('Booking is not in pending status', 400, 'INVALID_BOOKING_STATUS')
    if (booking.payment_status !== 'unpaid') return apiError('Booking has already been paid', 400, 'ALREADY_PAID')
    if (booking.guest_email.toLowerCase() !== email.toLowerCase()) {
      return apiError('Booking email does not match', 403, 'BOOKING_EMAIL_MISMATCH')
    }

    if (provider === 'mafrexpay') {
      const { successUrl, cancelUrl } = paymentReturnUrls(request, callbackUrl)
      const order = await createPaymentOrder({
        reference: bookingReference,
        amountMinor: Math.round(Number(booking.total_amount) * 100),
        customer: { name: booking.guest_name, email, phone: booking.guest_phone },
        context: { type: 'room_booking', booking_id: booking.id, department: 'Rooms' },
        successUrl,
        cancelUrl,
      })
      if (!order.checkout_url) return apiError('Payment checkout is unavailable.', 502, 'CHECKOUT_URL_MISSING')

      const { error: saveError } = await supabase.from('bookings').update({
        payment_provider: 'mafrexpay',
        payment_order_id: order.payment_order_id,
        payment_order_reference: order.order_reference,
        payment_checkout_url: order.checkout_url,
        payment_initialized_at: new Date().toISOString(),
      }).eq('id', booking.id)
      if (saveError) return apiError('Payment was created but could not be linked to the booking.', 500, 'PAYMENT_LINK_FAILED')

      return apiSuccess({
        authorization_url: order.checkout_url,
        reference: bookingReference,
        payment_order_reference: order.order_reference,
        provider,
        reused: order.reused === true,
      })
    }

    const response = await initializeTransaction({
      email,
      amount: Number(booking.total_amount),
      reference: bookingReference,
      callback_url: callbackUrl,
      metadata: { booking_reference: bookingReference, booking_id: booking.id },
    })
    if (!response.status) return apiError(response.message || 'Payment initialization failed', 400, 'PAYSTACK_ERROR')
    await supabase.from('bookings').update({
      payment_provider: 'paystack',
      payment_initialized_at: new Date().toISOString(),
    }).eq('id', booking.id)

    return apiSuccess({
      authorization_url: response.data.authorization_url,
      reference: response.data.reference,
      provider,
    })
  } catch (error) {
    if (error instanceof MafrexPayError) return apiError(error.message, error.status, error.code)
    if (error instanceof Error && error.message === 'INVALID_CALLBACK_ORIGIN') {
      return apiError('Payment callback URL is not allowed.', 400, 'INVALID_CALLBACK_ORIGIN')
    }
    console.error('Payment initialize error:', error)
    return apiError('Unable to start payment at the moment. Please try again shortly.', 500, 'PAYMENT_INITIALIZATION_FAILED')
  }
}
