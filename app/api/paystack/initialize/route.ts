import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { initializeTransaction, isPaystackConfigured } from '@/lib/paystack'
import { apiSuccess, apiError } from '@/lib/api/responses'
import { initializePaymentSchema } from '@/lib/api/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const result = initializePaymentSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return apiError(`Validation failed: ${errors}`, 400, 'VALIDATION_ERROR')
    }

    const { email, amount, bookingReference, callbackUrl } = result.data

    if (!isPaystackConfigured) {
      return apiError(
        'Payment system not configured. Please contact the administrator.',
        503,
        'PAYSTACK_NOT_CONFIGURED'
      )
    }

    const supabase = createAdminClient()

    // Verify booking exists and is in pending status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_reference, total_amount, status')
      .eq('booking_reference', bookingReference)
      .single()

    if (bookingError || !booking) {
      return apiError('Booking not found', 404, 'BOOKING_NOT_FOUND')
    }

    if (booking.status !== 'pending') {
      return apiError('Booking is not in pending status', 400, 'INVALID_BOOKING_STATUS')
    }

    // Initialize Paystack transaction
    const response = await initializeTransaction({
      email,
      amount,
      reference: bookingReference,
      callback_url: callbackUrl,
      metadata: {
        booking_reference: bookingReference,
        booking_id: booking.id,
      },
    })

    if (!response.status) {
      return apiError(response.message || 'Payment initialization failed', 400, 'PAYSTACK_ERROR')
    }

    return apiSuccess({
      authorization_url: response.data.authorization_url,
      reference: response.data.reference,
    })
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return apiError(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}