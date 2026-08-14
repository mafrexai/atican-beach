import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

const NOTIFIABLE_ROLES = ['front_desk', 'manager', 'admin']
const RECENT_LIMIT = 30

interface NotificationRow {
  id: string
  booking_id: string | null
  title: string
  body: string | null
  created_at: string
}

async function authorizeStaff() {
  const server = await createServerSupabaseClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: assignment } = await admin.from('user_roles')
    .select('role, is_active').eq('user_id', user.id).maybeSingle()
  if (!assignment || assignment.is_active === false || !NOTIFIABLE_ROLES.includes(assignment.role)) {
    return { error: NextResponse.json({ error: 'Staff access required.' }, { status: 403 }) }
  }

  return { admin, userId: user.id }
}

export async function GET() {
  const authorization = await authorizeStaff()
  if ('error' in authorization) return authorization.error
  const { admin, userId } = authorization

  const { data, error } = await admin
    .from('staff_notifications')
    .select('id, booking_id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (error) {
    console.error('[Staff Notifications] Load error:', error)
    return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 })
  }

  const notifications = (data || []) as NotificationRow[]
  const ids = notifications.map((n) => n.id)
  const { data: reads } = ids.length
    ? await admin.from('staff_notification_reads').select('notification_id').eq('user_id', userId).in('notification_id', ids)
    : { data: [] as { notification_id: string }[] }

  const readIds = new Set(((reads || []) as { notification_id: string }[]).map((r) => r.notification_id))
  const items = notifications.map((n) => ({ ...n, read: readIds.has(n.id) }))
  const unreadCount = items.filter((n) => !n.read).length

  return NextResponse.json({ notifications: items, unreadCount })
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeStaff()
  if ('error' in authorization) return authorization.error
  const { admin, userId } = authorization

  const body = await request.json().catch(() => ({}))
  const { notificationId, all } = body as { notificationId?: string; all?: boolean }

  let idsToMark: string[] = []
  if (all) {
    const { data: notifications } = await admin.from('staff_notifications').select('id').order('created_at', { ascending: false }).limit(RECENT_LIMIT)
    idsToMark = ((notifications || []) as { id: string }[]).map((n) => n.id)
  } else if (notificationId) {
    idsToMark = [notificationId]
  }

  if (!idsToMark.length) return NextResponse.json({ success: true })

  const { error } = await admin.from('staff_notification_reads')
    .upsert(idsToMark.map((id) => ({ notification_id: id, user_id: userId })), { onConflict: 'notification_id,user_id', ignoreDuplicates: true })

  if (error) {
    console.error('[Staff Notifications] Mark read error:', error)
    return NextResponse.json({ error: 'Unable to mark notifications read.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
