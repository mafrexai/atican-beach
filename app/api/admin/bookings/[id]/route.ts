import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBookingPayloadByIds } from '@/lib/mafrexai/property-sync-bookings'
import { pushPropertySyncResource } from '@/lib/mafrexai/property-sync'

async function authorizeAdmin() {
  const serverSupabase = await createServerSupabaseClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const admin = createAdminClient()
  const [{ data: userRole }, { data: profile }] = await Promise.all([
    admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])

  if (userRole?.role !== 'admin' && profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) }
  }

  return { admin, user }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeAdmin()
    if ('error' in authorization) return authorization.error
    const { admin } = authorization
    const { id } = await params

    const { data: booking, error: fetchError } = await admin.from('bookings').select('id, status, booking_reference').eq('id', id).maybeSingle()
    if (fetchError) {
      console.error('[Admin Delete Booking] Lookup error:', fetchError)
      return NextResponse.json({ error: `Unable to look up this booking: ${fetchError.message}` }, { status: 500 })
    }
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    // Cancel first (if not already) so the room-status trigger frees the room
    // and the property-sync outbox trigger queues MafrexAI a fallback update,
    // before the row disappears and there's nothing left to sync.
    if (booking.status !== 'cancelled') {
      const { error: cancelError } = await admin.from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
      if (cancelError) {
        console.error('[Admin Delete Booking] Cancel-before-delete error:', cancelError)
        return NextResponse.json({ error: `Unable to cancel the booking before deletion: ${cancelError.message}` }, { status: 500 })
      }
    }

    // Best-effort: push the cancellation to MafrexAI synchronously, right now,
    // rather than relying only on the outbox — once this row is deleted the
    // outbox entry can no longer find it to sync.
    try {
      const payload = await buildBookingPayloadByIds(admin, [id])
      if (payload.bookings.length) {
        await pushPropertySyncResource('bookings', { external_source: payload.external_source, bookings: payload.bookings })
      }
    } catch (syncError) {
      console.error(`[Admin Delete Booking] MafrexAI sync push failed for ${booking.booking_reference}:`, syncError)
    }

    const { error: deleteError } = await admin.from('bookings').delete().eq('id', id)
    if (deleteError) {
      console.error('[Admin Delete Booking] Delete error:', deleteError)
      return NextResponse.json({ error: `Unable to delete the booking: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, bookingReference: booking.booking_reference })
  } catch (error) {
    console.error('[Admin Delete Booking] Unhandled error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error deleting this booking.' }, { status: 500 })
  }
}
