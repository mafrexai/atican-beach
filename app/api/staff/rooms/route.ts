import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeFrontDesk } from '@/lib/staff/authorize'

const transitionSchema = z.object({ roomId: z.string().uuid(), nextStatus: z.enum(['cleaning', 'inspected', 'available']) })

export async function PATCH(request: NextRequest) {
  const auth = await authorizeFrontDesk(); if (!auth.ok) return auth.response
  const parsed = transitionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid housekeeping update.' }, { status: 400 })
  const { data, error } = await auth.admin.rpc('transition_room_housekeeping', {
    p_room_id: parsed.data.roomId, p_next_status: parsed.data.nextStatus, p_user_id: auth.userId,
  })
  if (error) return NextResponse.json({ error: 'That housekeeping step is no longer valid. Refresh and try again.' }, { status: 409 })
  return NextResponse.json({ success: true, room: data })
}
