import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingReference } = body as {
      bookingReference: string
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

    return apiSuccess({
      message: 'Payment status is managed by verified Paystack webhooks.',
      reference: bookingReference,
    })
  } catch (error) {
    console.error('Update payment API error:', error)
    return apiError(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
