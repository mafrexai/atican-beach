import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeFrontDesk } from '@/lib/staff/authorize'

const reportSchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['observation', 'note']), details: z.string().trim().min(3).max(2000) }),
  z.object({
    action: z.literal('maintenance'), title: z.string().trim().min(3).max(120),
    details: z.string().trim().min(5).max(2000), roomId: z.string().uuid().nullable(),
    location: z.string().trim().min(2).max(150),
    category: z.enum(['electrical', 'plumbing', 'air_conditioning', 'housekeeping', 'furniture', 'safety', 'it', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
  }),
])

export async function GET() {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const [logs, rooms] = await Promise.all([
    auth.admin.from('staff_activity_logs').select('id, user_id, action, summary, details, severity, created_at').order('created_at', { ascending: false }).limit(75),
    auth.admin.from('rooms').select('id, room_number, room_type, status').eq('is_active', true).order('room_number'),
  ])
  if (logs.error) return NextResponse.json({ error: logs.error.message }, { status: 500 })
  return NextResponse.json({ logs: logs.data || [], rooms: rooms.data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const parsed = reportSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please complete all required report details.', details: parsed.error.flatten() }, { status: 400 })
  const report = parsed.data

  if (report.action === 'maintenance') {
    const { data: order, error } = await auth.admin.from('facility_maintenance').insert({
      title: report.title, description: report.details, issue_type: report.category, category: report.category,
      priority: report.priority, room_id: report.roomId, location_type: report.roomId ? 'room' : 'property',
      location: report.location, reported_by: auth.userId, status: 'pending',
    }).select('id, work_order_number, title').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await auth.admin.from('staff_activity_logs').insert({
      user_id: auth.userId, actor_role: auth.role, action: 'maintenance_reported',
      summary: `Reported ${order.work_order_number}: ${order.title}`, category: 'maintenance',
      severity: report.priority === 'urgent' ? 'critical' : report.priority === 'high' ? 'warning' : 'info',
      entity_type: 'maintenance', entity_id: order.id,
      details: { description: report.details, room_id: report.roomId, location: report.location, priority: report.priority },
    })
    return NextResponse.json({ success: true, workOrder: order, message: `${order.work_order_number} created and sent to Maintenance.` }, { status: 201 })
  }

  const summary = report.action === 'observation' ? 'Staff observation recorded' : 'Guest note recorded'
  const { error } = await auth.admin.from('staff_activity_logs').insert({
    user_id: auth.userId, actor_role: auth.role, action: report.action, summary,
    category: report.action === 'note' ? 'guest' : 'operations', severity: 'info',
    details: { note: report.details },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: `${summary}.` }, { status: 201 })
}
