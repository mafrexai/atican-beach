import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('expire_stale_pending_bookings')
  if (error) return NextResponse.json({ error: `Unable to expire stale bookings: ${error.message}` }, { status: 500 })

  return NextResponse.json({ success: true, cancelled: data })
}
