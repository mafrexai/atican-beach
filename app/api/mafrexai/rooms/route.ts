import { NextResponse } from 'next/server'
import { authorizeMafrexAIPull } from '@/lib/mafrexai/pull-sync-auth'
import { buildPullRoomPayload } from '@/lib/mafrexai/property-sync-inventory'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  if (!authorizeMafrexAIPull(request)) return json({ error: 'Unauthorized' }, 401)
  try {
    return json(await buildPullRoomPayload(createAdminClient()), 200)
  } catch (error) {
    console.error('[MafrexAI Pull Sync] Unable to export rooms:', error instanceof Error ? error.message : 'Unknown error')
    return json({ error: 'Unable to retrieve rooms.' }, 500)
  }
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}
