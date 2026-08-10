import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPropertySyncConfiguration } from './property-sync'

interface BookingRow {
  id: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  check_in_date: string | null
  check_out_date: string | null
  total_amount: number | string
  status: string
  payment_status: string
  payment_provider: string | null
}

interface RoomItemRow { booking_id: string; item_id: string }

export interface BookingPayloadResult {
  external_source: string
  bookings: Array<Record<string, unknown>>
  includedIds: string[]
  skipped: Array<{ bookingId: string; reason: string }>
}

export async function buildActiveBookingPayload(admin: SupabaseClient): Promise<BookingPayloadResult> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await admin.from('bookings').select('id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, total_amount, status, payment_status, payment_provider')
    .in('status', ['pending', 'confirmed']).gte('check_out_date', today).order('check_in_date')
  if (error) throw new Error(`Unable to load active Atican bookings: ${error.message}`)
  return buildPayload(admin, (data || []) as BookingRow[])
}

export async function buildBookingPayloadByIds(admin: SupabaseClient, bookingIds: string[]): Promise<BookingPayloadResult> {
  if (!bookingIds.length) return emptyPayload()
  const { data, error } = await admin.from('bookings').select('id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, total_amount, status, payment_status, payment_provider').in('id', bookingIds)
  if (error) throw new Error(`Unable to load queued Atican bookings: ${error.message}`)
  const found = new Set((data || []).map((booking) => booking.id))
  const result = await buildPayload(admin, (data || []) as BookingRow[])
  for (const bookingId of bookingIds) if (!found.has(bookingId)) result.skipped.push({ bookingId, reason: 'Booking no longer exists.' })
  return result
}

async function buildPayload(admin: SupabaseClient, bookings: BookingRow[]): Promise<BookingPayloadResult> {
  if (!bookings.length) return emptyPayload()
  const ids = bookings.map((booking) => booking.id)
  const { data: items, error } = await admin.from('booking_items').select('booking_id, item_id').in('booking_id', ids).eq('item_type', 'room')
  if (error) throw new Error(`Unable to load booking room assignments: ${error.message}`)
  const roomByBooking = new Map(((items || []) as RoomItemRow[]).map((item) => [item.booking_id, item.item_id]))
  const payload = emptyPayload()

  for (const booking of bookings) {
    const roomId = roomByBooking.get(booking.id)
    if (!roomId) { payload.skipped.push({ bookingId: booking.id, reason: 'No room is assigned to this booking.' }); continue }
    if (!booking.check_in_date || !booking.check_out_date) { payload.skipped.push({ bookingId: booking.id, reason: 'Stay dates are incomplete.' }); continue }
    payload.bookings.push({
      external_booking_id: booking.id,
      external_room_id: roomId,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone || undefined,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      total_amount: Number(booking.total_amount),
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_provider || 'paystack',
    })
    payload.includedIds.push(booking.id)
  }
  return payload
}

function emptyPayload(): BookingPayloadResult {
  return { external_source: getPropertySyncConfiguration().externalSource, bookings: [], includedIds: [], skipped: [] }
}
