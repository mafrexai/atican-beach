import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeManager, writeAuditLog } from '@/lib/manager/authorize'

const createSchema = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(5).max(2000),
  category: z.enum(['electrical', 'plumbing', 'air_conditioning', 'housekeeping', 'furniture', 'safety', 'it', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']), roomId: z.string().uuid().nullable(),
  location: z.string().trim().min(2).max(150), assignedTo: z.string().uuid().nullable(),
  dueAt: z.string().datetime().nullable(), estimatedCost: z.number().nonnegative().nullable(),
})

const updateSchema = z.object({
  id: z.string().uuid(), status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']), assignedTo: z.string().uuid().nullable(),
  dueAt: z.string().datetime().nullable(), resolutionNotes: z.string().trim().max(2000).nullable(),
  estimatedCost: z.number().nonnegative().nullable(), actualCost: z.number().nonnegative().nullable(),
})

export async function GET() {
  const auth = await authorizeManager(); if (!auth.ok) return auth.response
  const [orders, rooms, staff] = await Promise.all([
    auth.admin.from('facility_maintenance').select('*').order('created_at', { ascending: false }).limit(250),
    auth.admin.from('rooms').select('id, room_number, room_type, status').eq('is_active', true).order('room_number'),
    auth.admin.from('user_roles').select('user_id, staff_name, staff_email, role').eq('role', 'front_desk').eq('is_active', true),
  ])
  if (orders.error) return NextResponse.json({ error: orders.error.message }, { status: 500 })
  return NextResponse.json({ orders: orders.data || [], rooms: rooms.data || [], staff: staff.data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeManager(); if (!auth.ok) return auth.response
  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please check the work-order details.', details: parsed.error.flatten() }, { status: 400 })
  const value = parsed.data
  const { data, error } = await auth.admin.from('facility_maintenance').insert({
    title: value.title, description: value.description, issue_type: value.category, category: value.category,
    priority: value.priority, room_id: value.roomId, location_type: value.roomId ? 'room' : 'property',
    location: value.location, assigned_to: value.assignedTo, due_at: value.dueAt,
    estimated_cost: value.estimatedCost, reported_by: auth.userId, status: 'pending',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(auth.admin, { userId: auth.userId, role: auth.role, action: 'maintenance_created', summary: `Created work order ${data.work_order_number}: ${data.title}`, category: 'maintenance', severity: value.priority === 'urgent' ? 'critical' : value.priority === 'high' ? 'warning' : 'info', entityType: 'maintenance', entityId: data.id, details: { priority: value.priority, room_id: value.roomId } })
  return NextResponse.json({ order: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeManager(); if (!auth.ok) return auth.response
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please check the work-order update.', details: parsed.error.flatten() }, { status: 400 })
  const value = parsed.data
  const { data: existing } = await auth.admin.from('facility_maintenance').select('status, work_order_number, title').eq('id', value.id).single()
  if (!existing) return NextResponse.json({ error: 'Work order not found.' }, { status: 404 })
  if (value.status === 'completed' && !value.resolutionNotes) return NextResponse.json({ error: 'Resolution notes are required before completing a work order.' }, { status: 400 })
  const { data, error } = await auth.admin.from('facility_maintenance').update({
    status: value.status, priority: value.priority, assigned_to: value.assignedTo, due_at: value.dueAt,
    resolution_notes: value.resolutionNotes, estimated_cost: value.estimatedCost, actual_cost: value.actualCost,
    ...(value.status === 'completed' ? { verified_by: auth.userId, verified_at: new Date().toISOString() } : {}),
  }).eq('id', value.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(auth.admin, { userId: auth.userId, role: auth.role, action: 'maintenance_updated', summary: `${data.work_order_number} moved from ${existing.status} to ${data.status}`, category: 'maintenance', severity: data.priority === 'urgent' ? 'critical' : 'info', entityType: 'maintenance', entityId: data.id, details: { previous_status: existing.status, status: data.status, assigned_to: data.assigned_to } })
  return NextResponse.json({ order: data })
}
