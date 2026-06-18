import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingReference, paymentStatus, status } = body as {
      bookingReference: string
      paymentStatus: string
      status: string
    }

    if (!bookingReference) {
      return apiError('Booking reference is required', 400)
    }

    const serverSupabase = await createServerSupabaseClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const supabase = createAdminClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_reference', bookingReference)
      .eq('user_id', user.id)
      .single()

    if (!booking) {
      return apiError('Booking not found or unauthorized', 404)
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: paymentStatus,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_reference', bookingReference)

    if (updateError) {
      console.error('Payment status update error:', updateError)
      return apiError(`Failed to update: ${updateError.message}`, 500)
    }

    return apiSuccess({ message: 'Payment status updated' })
  } catch (error) {
    console.error('Update payment API error:', error)
    return apiError(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
