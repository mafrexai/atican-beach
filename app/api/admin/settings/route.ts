import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

const defaults = {
  resort_name: 'Atican Beach Resort & Hotel',
  contact_email: 'info@aticanbeachresort.com',
  phone: '+2349029622583',
  currency: 'NGN' as const,
  paystack_mode: 'test' as const,
  check_in_time: '14:00',
  check_out_time: '12:00',
  cancellation_policy_hours: 24,
  email_new_booking: true,
  email_cancellation: true,
  daily_booking_summary: false,
  payment_confirmation: true,
}

const settingsSchema = z.object({
  resortName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  currency: z.enum(['NGN', 'USD']),
  paystackMode: z.enum(['test', 'live']),
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cancellationPolicyHours: z.number().int().min(0).max(8760),
  emailNewBooking: z.boolean(),
  emailCancellation: z.boolean(),
  dailyBookingSummary: z.boolean(),
  paymentConfirmation: z.boolean(),
})

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

export async function GET() {
  const authorization = await authorizeAdmin()
  if ('error' in authorization) return authorization.error

  const { data, error } = await authorization.admin.from('resort_settings').select('*').eq('id', 1).maybeSingle()
  if (error) {
    console.error('[Admin Settings] Load error:', error)
    return NextResponse.json({ error: 'Settings storage is unavailable. Please run the latest database migration.' }, { status: 500 })
  }

  return NextResponse.json({ settings: toClientSettings(data ?? defaults) })
}

export async function PUT(request: Request) {
  const authorization = await authorizeAdmin()
  if ('error' in authorization) return authorization.error

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please review the highlighted settings and try again.' }, { status: 400 })
  }

  const settings = parsed.data
  const row = {
    id: 1,
    resort_name: settings.resortName,
    contact_email: settings.contactEmail,
    phone: settings.phone,
    currency: settings.currency,
    paystack_mode: settings.paystackMode,
    check_in_time: settings.checkInTime,
    check_out_time: settings.checkOutTime,
    cancellation_policy_hours: settings.cancellationPolicyHours,
    email_new_booking: settings.emailNewBooking,
    email_cancellation: settings.emailCancellation,
    daily_booking_summary: settings.dailyBookingSummary,
    payment_confirmation: settings.paymentConfirmation,
    updated_by: authorization.user.id,
  }

  const { data, error } = await authorization.admin.from('resort_settings').upsert(row).select('*').single()
  if (error) {
    console.error('[Admin Settings] Save error:', error)
    return NextResponse.json({ error: 'Unable to save settings at the moment. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ settings: toClientSettings(data), message: 'Settings saved successfully.' })
}

function toClientSettings(row: Record<string, unknown>) {
  return {
    resortName: String(row.resort_name),
    contactEmail: String(row.contact_email),
    phone: String(row.phone),
    currency: row.currency === 'USD' ? 'USD' : 'NGN',
    paystackMode: row.paystack_mode === 'live' ? 'live' : 'test',
    checkInTime: String(row.check_in_time).slice(0, 5),
    checkOutTime: String(row.check_out_time).slice(0, 5),
    cancellationPolicyHours: Number(row.cancellation_policy_hours),
    emailNewBooking: Boolean(row.email_new_booking),
    emailCancellation: Boolean(row.email_cancellation),
    dailyBookingSummary: Boolean(row.daily_booking_summary),
    paymentConfirmation: Boolean(row.payment_confirmation),
  }
}
