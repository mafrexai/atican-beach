import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPropertySyncConfiguration } from './property-sync'

export interface StayEvent { outboxId?: string; bookingId: string; action: 'checked_in' | 'checked_out' }

export async function buildStayEventPayload(admin: SupabaseClient, events: StayEvent[]) {
  const ids = [...new Set(events.map((event) => event.bookingId))]
  const { data, error } = ids.length
    ? await admin.from('bookings').select('id, checked_in_at, checked_out_at').in('id', ids)
    : { data: [], error: null }
  if (error) throw new Error(`Unable to load Atican stay activity: ${error.message}`)
  const bookingById = new Map((data || []).map((booking) => [booking.id, booking]))
  const checkins: Array<Record<string, unknown>> = []
  const includedOutboxIds: string[] = []
  const skipped: Array<{ outboxId?: string; bookingId: string; reason: string }> = []
  for (const event of events) {
    const booking = bookingById.get(event.bookingId)
    const occurredAt = event.action === 'checked_in' ? booking?.checked_in_at : booking?.checked_out_at
    if (!booking || !occurredAt) { skipped.push({ ...event, reason: `${event.action === 'checked_in' ? 'Check-in' : 'Check-out'} timestamp is missing.` }); continue }
    checkins.push({ external_booking_id: event.bookingId, action: event.action, occurred_at: occurredAt })
    if (event.outboxId) includedOutboxIds.push(event.outboxId)
  }
  return { external_source: getPropertySyncConfiguration().externalSource, checkins, includedOutboxIds, skipped }
}

export async function buildRecentStayEventPayload(admin: SupabaseClient) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin.from('bookings').select('id, checked_in_at, checked_out_at')
    .or(`checked_in_at.gte.${since},checked_out_at.gte.${since}`)
  if (error) throw new Error(`Unable to load recent Atican stay activity: ${error.message}`)
  const events: StayEvent[] = []
  for (const booking of data || []) {
    if (booking.checked_in_at) events.push({ bookingId: booking.id, action: 'checked_in' })
    if (booking.checked_out_at) events.push({ bookingId: booking.id, action: 'checked_out' })
  }
  return buildStayEventPayload(admin, events)
}
