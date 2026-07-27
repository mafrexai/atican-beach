import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { getPaymentOrder } from '@/lib/mafrexpay'
import { verifyTransaction } from '@/lib/paystack'
import { finalizeBookingPayment } from '@/lib/payments/finalize'

export interface ReconciliationResult {
  paid: boolean
  status: string
  provider: 'mafrexpay' | 'paystack'
  reference: string
  amount?: number
}

export async function reconcileBookingPayment(
  bookingReference: string,
  actorUserId?: string
): Promise<ReconciliationResult> {
  const supabase = createAdminClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, total_amount, payment_status, status, payment_provider, payment_order_reference')
    .eq('booking_reference', bookingReference)
    .maybeSingle()

  if (error || !booking) throw new Error('BOOKING_NOT_FOUND')
  const provider = booking.payment_provider === 'mafrexpay' ? 'mafrexpay' : 'paystack'

  if (booking.payment_status === 'paid') {
    return { paid: true, status: 'paid', provider, reference: bookingReference, amount: Number(booking.total_amount) }
  }

  let isPaid = false
  let providerReference = bookingReference
  let amount = 0

  if (provider === 'mafrexpay') {
    if (!booking.payment_order_reference) throw new Error('PAYMENT_ORDER_NOT_FOUND')
    const order = await getPaymentOrder(booking.payment_order_reference)
    amount = Number(order.amount_minor) / 100
    isPaid = order.status === 'paid'
    providerReference = order.provider_reference || order.order_reference
    if (order.currency !== 'NGN' || amount !== Number(booking.total_amount)) throw new Error('AMOUNT_MISMATCH')
  } else {
    const transaction = await verifyTransaction(bookingReference)
    if (!transaction.status) throw new Error('VERIFICATION_FAILED')
    amount = Number(transaction.data?.amount) / 100
    isPaid = transaction.data?.status === 'success'
    providerReference = transaction.data?.reference || bookingReference
    if (amount !== Number(booking.total_amount)) throw new Error('AMOUNT_MISMATCH')
  }

  if (!isPaid) return { paid: false, status: 'pending', provider, reference: providerReference, amount }

  await finalizeBookingPayment({
    bookingReference,
    providerReference,
    paidAmount: amount,
    source: `${provider}_status`,
    actorUserId,
  })

  return { paid: true, status: 'paid', provider, reference: providerReference, amount }
}
