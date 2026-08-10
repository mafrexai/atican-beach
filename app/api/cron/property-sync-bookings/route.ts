import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildBookingPayloadByIds } from '@/lib/mafrexai/property-sync-bookings'
import { PropertySyncError, pushPropertySyncResource } from '@/lib/mafrexai/property-sync'

interface OutboxRow { id: string; entity_id: string; attempts: number }

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('claim_property_sync_booking_outbox', { p_limit: 50 })
  if (error) return NextResponse.json({ error: `Unable to claim booking sync work: ${error.message}` }, { status: 500 })
  const rows = (data || []) as OutboxRow[]
  if (!rows.length) return NextResponse.json({ success: true, claimed: 0 })

  try {
    const payload = await buildBookingPayloadByIds(admin, rows.map((row) => row.entity_id))
    let result: Awaited<ReturnType<typeof pushPropertySyncResource>> | null = null
    if (payload.bookings.length) result = await pushPropertySyncResource('bookings', { external_source: payload.external_source, bookings: payload.bookings })
    if (payload.includedIds.length) {
      await admin.from('property_sync_outbox').update({ status: 'completed', last_error: null, last_run_id: result?.runId || null, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in('entity_id', payload.includedIds)
    }
    for (const skipped of payload.skipped) {
      await admin.from('property_sync_outbox').update({ status: 'failed', last_error: skipped.reason, updated_at: new Date().toISOString() }).eq('entity_id', skipped.bookingId)
    }
    return NextResponse.json({ success: true, claimed: rows.length, submitted: payload.bookings.length, skipped: payload.skipped.length, runId: result?.runId || null })
  } catch (error) {
    const syncError = error instanceof PropertySyncError ? error : new PropertySyncError(error instanceof Error ? error.message : 'Booking sync failed.')
    for (const row of rows) {
      const failed = row.attempts >= 8
      const delayMinutes = Math.min(5 * (2 ** Math.max(row.attempts - 1, 0)), 360)
      await admin.from('property_sync_outbox').update({
        status: failed ? 'failed' : 'pending', last_error: syncError.message,
        available_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', row.id)
    }
    return NextResponse.json({ error: syncError.message, code: syncError.code, claimed: rows.length }, { status: 503 })
  }
}
