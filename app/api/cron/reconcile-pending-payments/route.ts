import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { reconcileBookingPayment } from '@/lib/payments/reconcile'

interface PendingBookingRow { booking_reference: string }

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('bookings')
    .select('booking_reference')
    .eq('payment_status', 'unpaid')
    .eq('status', 'pending')
    .not('payment_order_reference', 'is', null)
    .gte('payment_initialized_at', cutoff)
    .order('payment_initialized_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: `Unable to load pending payments: ${error.message}` }, { status: 500 })

  const rows = (data || []) as PendingBookingRow[]
  if (!rows.length) return NextResponse.json({ success: true, checked: 0, confirmed: 0, failed: 0 })

  let confirmed = 0
  let failed = 0
  for (const row of rows) {
    try {
      const result = await reconcileBookingPayment(row.booking_reference)
      if (result.paid) confirmed += 1
    } catch (reconcileError) {
      failed += 1
      console.error(`[Reconcile Pending Payments] ${row.booking_reference}:`, reconcileError instanceof Error ? reconcileError.message : reconcileError)
    }
  }

  return NextResponse.json({ success: true, checked: rows.length, confirmed, failed })
}
