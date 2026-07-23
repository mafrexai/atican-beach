import { NextRequest } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { reconcileBookingPayment } from '@/lib/payments/reconcile'
import { apiSuccess, apiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()
    if (!reference) return apiError('Reference is required', 400, 'MISSING_REFERENCE')

    const server = await createServerSupabaseClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return apiError('Authentication required', 401, 'AUTH_REQUIRED')

    const supabase = createAdminClient()
    const { data: booking } = await supabase.from('bookings')
      .select('id, user_id').eq('booking_reference', reference).maybeSingle()
    if (!booking) return apiError('Booking not found', 404, 'BOOKING_NOT_FOUND')

    const { data: assignment } = await supabase.from('user_roles')
      .select('role, is_active').eq('user_id', user.id).maybeSingle()
    const isOperational = assignment?.is_active !== false &&
      ['front_desk', 'manager', 'admin'].includes(assignment?.role || '')
    if (booking.user_id !== user.id && !isOperational) {
      return apiError('Booking access denied', 403, 'BOOKING_ACCESS_DENIED')
    }

    const result = await reconcileBookingPayment(reference, user.id)
    if (!result.paid) return apiError('Payment is still pending.', 409, 'PAYMENT_PENDING')

    if (assignment?.role === 'front_desk') {
      await supabase.from('staff_activity_logs').insert({
        user_id: user.id,
        actor_role: 'front_desk',
        action: 'payment_verified',
        summary: `Verified payment for ${reference}`,
        category: 'payment',
        severity: 'info',
        entity_type: 'booking',
        entity_id: booking.id,
        details: { reference: result.reference, amount: result.amount, provider: result.provider },
      })
    }

    return apiSuccess(result)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'VERIFICATION_FAILED'
    const messages: Record<string, string> = {
      AMOUNT_MISMATCH: 'Payment amount does not match this booking.',
      PAYMENT_ORDER_NOT_FOUND: 'No payment order is linked to this booking.',
      VERIFICATION_FAILED: 'Payment could not be verified.',
    }
    return apiError(messages[code] || 'Unable to verify payment at the moment.', code === 'AMOUNT_MISMATCH' ? 409 : 502, code)
  }
}
