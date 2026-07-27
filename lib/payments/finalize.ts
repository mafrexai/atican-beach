import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'

interface FinalizeBookingPaymentInput {
  bookingReference: string
  providerReference: string
  paidAmount: number
  source: string
  actorUserId?: string
}

export async function finalizeBookingPayment(input: FinalizeBookingPaymentInput) {
  const supabase = createAdminClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, confirmation_code, guest_name, guest_email, total_amount, payment_status, status, qr_code, check_in_date, check_out_date')
    .eq('booking_reference', input.bookingReference)
    .maybeSingle()

  if (error || !booking) throw new Error('BOOKING_NOT_FOUND')
  if (!Number.isFinite(input.paidAmount) || input.paidAmount !== Number(booking.total_amount)) {
    throw new Error('AMOUNT_MISMATCH')
  }

  if (booking.payment_status === 'paid') {
    return { booking, updated: false }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      payment_reference: input.providerReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
    .eq('payment_status', 'unpaid')
    .select('id, booking_reference, confirmation_code, guest_name, guest_email, total_amount, payment_status, status, qr_code, check_in_date, check_out_date')
    .maybeSingle()

  if (updateError) throw new Error('RECONCILIATION_FAILED')
  if (!updated) return { booking: { ...booking, payment_status: 'paid', status: 'confirmed' }, updated: false }

  await supabase.from('booking_activity_log').insert({
    booking_id: booking.id,
    user_id: input.actorUserId || null,
    action: 'payment_verified',
    details: {
      reference: input.providerReference,
      amount: input.paidAmount,
      source: input.source,
    },
  })

  await sendBookingConfirmation(updated.guest_email, {
    bookingReference: updated.booking_reference,
    confirmationCode: updated.confirmation_code,
    items: [],
    totalAmount: Number(updated.total_amount),
    qrCode: updated.qr_code || '',
    guestName: updated.guest_name,
    checkIn: updated.check_in_date || undefined,
    checkOut: updated.check_out_date || undefined,
    paymentPending: false,
  })

  return { booking: updated, updated: true }
}
