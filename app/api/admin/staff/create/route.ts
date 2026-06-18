import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body as {
      name: string
      email: string
      password?: string
      role: 'front_desk' | 'admin'
    }

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
    }

    // Use server client to read user session from cookies
    const serverSupabase = await createServerSupabaseClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Use admin client for write operations
    const supabase = createAdminClient()

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create staff accounts' }, { status: 403 })
    }

    // Check if staff already exists
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('staff_email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email already exists' }, { status: 409 })
    }

    // Generate password if not provided
    const finalPassword = password || 'Staff' + Math.random().toString(36).slice(2, 8) + '!'

    // Create auth user
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ error: `Failed to create user: ${authError.message}` }, { status: 500 })
    }

    // Upsert into user_roles (handles duplicate user_id from existing guest roles)
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: newUser.user.id,
          role,
          staff_name: name,
          staff_email: email,
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )

    if (roleError) {
      console.error('User role creation error:', roleError)
      return NextResponse.json({ error: `Failed to assign role: ${roleError.message}` }, { status: 500 })
    }

    // Upsert profile
    await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: name,
        role,
      })

    return NextResponse.json({
      success: true,
      message: 'Staff account created successfully',
      credentials: {
        email,
        password: finalPassword,
      },
    })
  } catch (error) {
    console.error('Staff creation API error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}