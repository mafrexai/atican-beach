import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function authorizeManager(): Promise<
  | { ok: true; admin: SupabaseClient; userId: string; role: string }
  | { ok: false; response: NextResponse }
> {
  const server = await createServerSupabaseClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const admin = createAdminClient() as SupabaseClient
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (!role || !['manager', 'admin'].includes(role.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Manager access required.' }, { status: 403 }) }
  }
  return { ok: true, admin, userId: user.id, role: role.role }
}

export async function writeAuditLog(admin: SupabaseClient, entry: {
  userId: string; role: string; action: string; summary: string; category: string
  severity?: 'info' | 'warning' | 'critical'; entityType?: string; entityId?: string; details?: Record<string, unknown>
}) {
  const { error } = await admin.from('staff_activity_logs').insert({
    user_id: entry.userId,
    actor_role: entry.role,
    action: entry.action,
    summary: entry.summary,
    category: entry.category,
    severity: entry.severity || 'info',
    entity_type: entry.entityType || null,
    entity_id: entry.entityId || null,
    details: entry.details || {},
  })
  if (error) console.error('[Manager Audit] Unable to write audit log:', error)
}
