import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function authorizeFrontDesk() {
  const server = await createServerSupabaseClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: assignment } = await admin.from('user_roles')
    .select('role, is_active').eq('user_id', user.id).maybeSingle()
  if (assignment?.role !== 'front_desk' || assignment.is_active === false) {
    return { ok: false as const, response: NextResponse.json({ error: 'Front-desk access required.' }, { status: 403 }) }
  }
  return { ok: true as const, admin, userId: user.id, role: assignment.role }
}
