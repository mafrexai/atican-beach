import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { features } = await req.json()

  if (!Array.isArray(features)) {
    return NextResponse.json({ error: 'Invalid features data' }, { status: 400 })
  }

  // Delete existing features for this room
  await supabase.from('room_features').delete().eq('room_id', id)

  // Insert new features
  const featuresToInsert = features
    .filter((f: { feature_name: string }) => f.feature_name.trim())
    .map((f: Record<string, unknown>, index: number) => ({
      room_id: id,
      feature_name: f.feature_name,
      feature_value: f.feature_value || '',
      feature_icon: f.feature_icon || 'Check',
      display_order: index,
      is_premium: f.is_premium || false,
      is_active: f.is_active !== false,
    }))

  if (featuresToInsert.length > 0) {
    const { error } = await supabase.from('room_features').insert(featuresToInsert)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}