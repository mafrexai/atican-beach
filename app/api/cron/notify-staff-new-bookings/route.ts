import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

interface PendingNotification { id: string; title: string; body: string | null }
interface StaffRecipient { staff_email: string | null }

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: pending, error } = await admin
    .from('staff_notifications')
    .select('id, title, body')
    .is('emailed_at', null)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: `Unable to load pending notifications: ${error.message}` }, { status: 500 })

  const notifications = (pending || []) as PendingNotification[]
  if (!notifications.length) return NextResponse.json({ success: true, sent: 0 })

  let emailedTo = 0
  if (!resend) {
    console.warn('[Notify Staff] Resend not configured — skipping email, still clearing the backlog.')
  } else {
    const { data: recipients } = await admin
      .from('user_roles')
      .select('staff_email')
      .in('role', ['front_desk', 'manager'])
      .eq('is_active', true)
      .not('staff_email', 'is', null)

    const emails = [...new Set(((recipients || []) as StaffRecipient[]).map((r) => r.staff_email).filter((email): email is string => Boolean(email)))]

    const listHtml = notifications
      .map((n) => `<li style="margin-bottom:8px;"><strong>${n.title}</strong>${n.body ? `<br/><span style="color:#666;">${n.body}</span>` : ''}</li>`)
      .join('')
    const subject = notifications.length === 1 ? notifications[0]!.title : `${notifications.length} new bookings confirmed`
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;"><h2>New bookings at Atican Beach Resort</h2><ul style="padding-left:20px;">${listHtml}</ul></div>`

    for (const email of emails) {
      try {
        await resend.emails.send({ from: 'Atican Beach <bookings@aticanbeach.com>', to: [email], subject, html })
        emailedTo += 1
      } catch (sendError) {
        console.error(`[Notify Staff] Email send failed for ${email}:`, sendError)
      }
    }
  }

  const ids = notifications.map((n) => n.id)
  await admin.from('staff_notifications').update({ emailed_at: new Date().toISOString() }).in('id', ids)

  return NextResponse.json({ success: true, notifications: notifications.length, emailedTo })
}
