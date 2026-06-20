import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'


export const dynamic = 'force-dynamic'


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()   // ← FIXED

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  const { data: features } = await supabase
    .from('room_features')
    .select('*')
    .eq('room_id', id)
    .order('display_order')

  return NextResponse.json({ room, features })
}


// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params
//   const supabase = createAdminClient()

//   // Verify admin status
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   // Check if user is admin
//   const { data: role } = await supabase
//     .from('user_roles')
//     .select('role')
//     .eq('user_id', user.id)
//     .single()

//   if (role?.role !== 'admin') {
//     return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
//   }

//   // Get room
//   const { data: room, error: roomError } = await supabase
//     .from('rooms')
//     .select('*')
//     .eq('id', id)
//     .single()

//   if (roomError) {
//     return NextResponse.json({ error: roomError.message }, { status: 404 })
//   }

//   // Get features
//   const { data: features, error: featuresError } = await supabase
//     .from('room_features')
//     .select('*')
//     .eq('room_id', id)
//     .order('display_order')

//   if (featuresError) {
//     return NextResponse.json({ error: featuresError.message }, { status: 500 })
//   }

//   return NextResponse.json({ room, features })
// }