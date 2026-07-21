import { NextResponse } from 'next/server'
import { authorizeManager } from '@/lib/manager/authorize'

export async function GET() {
  const auth = await authorizeManager(); if (!auth.ok) return auth.response
  const [staffLogs, bookingLogs, staff] = await Promise.all([
    auth.admin.from('staff_activity_logs').select('id, user_id, action, summary, category, severity, entity_type, entity_id, actor_role, details, created_at').order('created_at', { ascending: false }).limit(300),
    auth.admin.from('booking_activity_log').select('id, booking_id, user_id, action, details, created_at').order('created_at', { ascending: false }).limit(300),
    auth.admin.from('user_roles').select('user_id, staff_name, staff_email, role'),
  ])
  const actors = new Map((staff.data || []).map((person: { user_id: string; staff_name: string | null; staff_email: string | null; role: string }) => [person.user_id, person]))
  const primary = (staffLogs.data || []).map((log: Record<string, unknown>) => normalize(log, actors, 'operations'))
  const booking = (bookingLogs.data || []).map((log: Record<string, unknown>) => normalize({ ...log, entity_type: 'booking', entity_id: log.booking_id, category: 'booking', summary: humanize(String(log.action || 'booking activity')) }, actors, 'booking'))
  const events = [...primary, ...booking].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 500)
  return NextResponse.json({ events })
}

function normalize(log: Record<string, unknown>, actors: Map<string, { staff_name: string | null; staff_email: string | null; role: string }>, fallbackCategory: string) {
  const actor = actors.get(String(log.user_id || ''))
  return {
    id: String(log.id), action: String(log.action || 'activity'), summary: String(log.summary || humanize(String(log.action || 'activity'))),
    category: String(log.category || fallbackCategory), severity: String(log.severity || 'info'),
    entityType: log.entity_type ? String(log.entity_type) : null, entityId: log.entity_id ? String(log.entity_id) : null,
    actorName: actor?.staff_name || actor?.staff_email || 'System', actorRole: String(log.actor_role || actor?.role || 'system'),
    details: log.details, createdAt: String(log.created_at),
  }
}

function humanize(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
