import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeManager, writeAuditLog } from '@/lib/manager/authorize'
import {
  getPropertySyncConfiguration,
  PropertySyncError,
  pushPropertySyncResource,
  testPropertySyncConnection,
} from '@/lib/mafrexai/property-sync'
import { buildRoomCategoryPayload, buildRoomPayload } from '@/lib/mafrexai/property-sync-inventory'
import { buildActiveBookingPayload } from '@/lib/mafrexai/property-sync-bookings'
import { buildRecentStayEventPayload } from '@/lib/mafrexai/property-sync-checkins'

const actionSchema = z.object({ action: z.enum(['test', 'categories', 'rooms', 'bookings', 'checkins', 'all']) })

export async function GET() {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response

  const { data: recentActivity } = await auth.admin
    .from('staff_activity_logs')
    .select('id, action, summary, severity, details, created_at')
    .in('action', ['property_sync_tested', 'property_categories_synced', 'property_rooms_synced', 'property_bookings_synced', 'property_stays_synced', 'property_inventory_synced', 'property_sync_failed'])
    .order('created_at', { ascending: false })
    .limit(12)

  const { count: roomCount } = await auth.admin.from('rooms').select('id', { count: 'exact', head: true })
  const { data: roomTypes } = await auth.admin.from('rooms').select('room_type')
  const configuration = getPropertySyncConfiguration()
  const { count: activeBookingCount } = await auth.admin.from('bookings').select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'confirmed']).gte('check_out_date', new Date().toISOString().slice(0, 10))
  const { data: queueRows, error: queueError } = await auth.admin.from('property_sync_outbox').select('status')
  const queue = { pending: 0, processing: 0, failed: 0 }
  if (!queueError) for (const row of queueRows || []) if (row.status in queue) queue[row.status as keyof typeof queue]++

  return NextResponse.json({
    configuration,
    inventory: { rooms: roomCount || 0, categories: new Set((roomTypes || []).map((room) => room.room_type)).size, activeBookings: activeBookingCount || 0 },
    queue: { ...queue, available: !queueError },
    recentActivity: recentActivity || [],
  })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response

  const parsed = actionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Select a valid Property Sync action.' }, { status: 400 })

  try {
    if (parsed.data.action === 'test') {
      const result = await testPropertySyncConnection()
      await audit(auth, 'property_sync_tested', 'MafrexAI Property Sync connection verified.', result)
      return NextResponse.json({ success: true, action: 'test', result })
    }

    const results: Record<string, unknown> = {}
    if (parsed.data.action === 'bookings') {
      const payload = await buildActiveBookingPayload(auth.admin)
      if (!payload.bookings.length) return NextResponse.json({ error: 'No active room bookings are available to synchronize.', skipped: payload.skipped }, { status: 422 })
      const result = await pushPropertySyncResource('bookings', { external_source: payload.external_source, bookings: payload.bookings })
      await audit(auth, 'property_bookings_synced', `Submitted ${payload.bookings.length} active bookings to MafrexAI.`, result, { submitted: payload.bookings.length, skipped: payload.skipped })
      return NextResponse.json({ success: true, action: 'bookings', submitted: payload.bookings.length, skipped: payload.skipped, result })
    }
    if (parsed.data.action === 'checkins') {
      const payload = await buildRecentStayEventPayload(auth.admin)
      if (!payload.checkins.length) return NextResponse.json({ error: 'No check-in or check-out activity was recorded in the last 30 days.' }, { status: 422 })
      const result = await pushPropertySyncResource('checkins', { external_source: payload.external_source, checkins: payload.checkins })
      await audit(auth, 'property_stays_synced', `Submitted ${payload.checkins.length} recent stay events to MafrexAI.`, result, { submitted: payload.checkins.length, skipped: payload.skipped })
      return NextResponse.json({ success: true, action: 'checkins', submitted: payload.checkins.length, skipped: payload.skipped, result })
    }
    if (parsed.data.action === 'categories' || parsed.data.action === 'all') {
      const payload = await buildRoomCategoryPayload(auth.admin)
      if (!payload.categories.length) return NextResponse.json({ error: 'No room categories are available to synchronize.' }, { status: 422 })
      const result = await pushPropertySyncResource('room-categories', payload)
      results.categories = { submitted: payload.categories.length, ...result }
      if (parsed.data.action === 'categories') {
        await audit(auth, 'property_categories_synced', `Submitted ${payload.categories.length} room categories to MafrexAI.`, result, { submitted: payload.categories.length })
      }
    }

    if (parsed.data.action === 'rooms' || parsed.data.action === 'all') {
      const payload = await buildRoomPayload(auth.admin)
      if (!payload.rooms.length) return NextResponse.json({ error: 'No rooms are available to synchronize.' }, { status: 422 })
      const result = await pushPropertySyncResource('rooms', payload)
      results.rooms = { submitted: payload.rooms.length, ...result }
      if (parsed.data.action === 'rooms') {
        await audit(auth, 'property_rooms_synced', `Submitted ${payload.rooms.length} rooms to MafrexAI.`, result, { submitted: payload.rooms.length })
      }
    }

    if (parsed.data.action === 'all') {
      const categorySubmitted = numberFromResult(results.categories, 'submitted')
      const roomsSubmitted = numberFromResult(results.rooms, 'submitted')
      const combined = results.rooms as { runId?: string | null; requestId?: string | null } | undefined
      await writeAuditLog(auth.admin, {
        userId: auth.userId, role: auth.role, action: 'property_inventory_synced', category: 'integration',
        summary: `Submitted ${categorySubmitted} categories and ${roomsSubmitted} rooms to MafrexAI.`,
        entityType: 'property_sync', details: { categorySubmitted, roomsSubmitted, results: compactResults(results) },
      })
      return NextResponse.json({ success: true, action: 'all', results, runId: combined?.runId || null })
    }

    return NextResponse.json({ success: true, action: parsed.data.action, results })
  } catch (error) {
    const syncError = error instanceof PropertySyncError ? error : new PropertySyncError(error instanceof Error ? error.message : 'Property Sync failed.')
    await writeAuditLog(auth.admin, {
      userId: auth.userId, role: auth.role, action: 'property_sync_failed', category: 'integration', severity: 'warning',
      summary: `MafrexAI Property Sync failed: ${syncError.message}`, entityType: 'property_sync',
      details: { requestedAction: parsed.data.action, code: syncError.code, status: syncError.status },
    })
    return NextResponse.json({ error: syncError.message, code: syncError.code }, { status: normalizeStatus(syncError.status) })
  }
}

async function audit(
  auth: Extract<Awaited<ReturnType<typeof authorizeManager>>, { ok: true }>,
  action: string,
  summary: string,
  result: { runId: string | null; requestId: string | null; status: number },
  details: Record<string, unknown> = {}
) {
  await writeAuditLog(auth.admin, {
    userId: auth.userId, role: auth.role, action, summary, category: 'integration', entityType: 'property_sync',
    details: { ...details, runId: result.runId, requestId: result.requestId, httpStatus: result.status },
  })
}

function compactResults(results: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(results).map(([key, value]) => {
    const result = value as { submitted?: number; runId?: string | null; requestId?: string | null; status?: number }
    return [key, { submitted: result.submitted, runId: result.runId, requestId: result.requestId, httpStatus: result.status }]
  }))
}

function numberFromResult(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return 0
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'number' ? candidate : 0
}

function normalizeStatus(status: number) {
  return status >= 400 && status <= 599 ? status : 500
}
