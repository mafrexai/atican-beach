import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { generateBookingReference, generateConfirmationCode } from '@/lib/utils/bookingCodes'

const TEST_PAYMENT_AMOUNT = 100

async function authorizeAdmin() {
  const serverSupabase = await createServerSupabaseClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }

  const admin = createAdminClient()
  const [{ data: userRole }, { data: profile }] = await Promise.all([
    admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])

  if (userRole?.role !== 'admin' && profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) }
  }

  return { admin, user }
}

export async function POST() {
  const authorization = await authorizeAdmin()
  if ('error' in authorization) return authorization.error
  const { admin, user } = authorization

  if (!user.email) {
    return NextResponse.json({ error: 'Your admin account has no email on file to run a test payment.' }, { status: 400 })
  }

  const bookingReference = generateBookingReference()
  const confirmationCode = generateConfirmationCode()

  const { error } = await admin.from('bookings').insert({
    booking_reference: bookingReference,
    confirmation_code: confirmationCode,
    guest_name: 'Admin Payment Test',
    guest_email: user.email,
    total_amount: TEST_PAYMENT_AMOUNT,
    special_requests: 'Admin test payment created by the "Run test payment" button in Settings. Safe to delete.',
    created_by: user.id,
  })

  if (error) {
    console.error('[Admin Test Payment] Unable to create test booking:', error)
    return NextResponse.json({ error: 'Unable to create a test booking.' }, { status: 500 })
  }

  return NextResponse.json({ bookingReference, email: user.email, amount: TEST_PAYMENT_AMOUNT })
}
