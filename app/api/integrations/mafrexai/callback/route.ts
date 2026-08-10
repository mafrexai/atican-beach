import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const callbackSchema = z.object({
  event: z.literal('booking.confirmed'),
  created_at: z.string().datetime(),
  hotel_id: z.string().uuid(),
  booking: z.object({
    id: z.string().uuid(),
    booking_reference: z.string().min(3).max(20),
    confirmation_code: z.string().min(3).max(10),
    guest_name: z.string().trim().min(2).max(200),
    guest_email: z.string().email().max(320),
    guest_phone: z.string().trim().max(40).nullable().optional(),
    check_in_date: z.string().date(),
    check_out_date: z.string().date(),
    guests: z.number().int().min(1).max(50).optional().default(1),
    total_amount: z.number().min(0),
    status: z.literal('confirmed'),
    payment_status: z.literal('paid'),
    payment_method: z.string().min(1).max(40),
    paystack_reference: z.string().min(1).max(200),
  }),
  room: z.object({
    id: z.string().uuid(),
    room_number: z.string().trim().min(1).max(40),
    room_type: z.string().trim().min(1).max(120),
    external_source: z.string().trim().min(1).max(120).nullable().optional(),
    external_room_id: z.string().trim().min(1).max(200),
    external_category_id: z.string().trim().max(200).nullable().optional(),
  }),
})

export async function POST(request: NextRequest) {
  const secret = process.env.MAFREX_SYNC_CALLBACK_SECRET
  if (!secret) {
    console.error('[MafrexAI callback] MAFREX_SYNC_CALLBACK_SECRET is not configured.')
    return NextResponse.json({ error: 'Callback receiver is not configured.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const eventType = request.headers.get('x-mafrexai-event')
  const clientId = request.headers.get('x-mafrexai-client')
  const deliveryId = request.headers.get('x-mafrexai-delivery')
  const suppliedSignature = request.headers.get('x-mafrexai-signature')?.trim().toLowerCase() || ''
  const expectedClientId = process.env.MAFREX_SYNC_CLIENT_ID

  if (eventType !== 'booking.confirmed') return NextResponse.json({ error: 'Unsupported event type.' }, { status: 422 })
  if (!clientId || !deliveryId) return NextResponse.json({ error: 'Missing callback identity headers.' }, { status: 400 })
  if (!expectedClientId) return NextResponse.json({ error: 'Callback client identity is not configured.' }, { status: 503 })
  if (clientId !== expectedClientId) return NextResponse.json({ error: 'Invalid callback client.' }, { status: 403 })

  const expectedSignature = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (!suppliedSignature || !safeHexEqual(suppliedSignature, expectedSignature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const parsed = callbackSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid callback payload.', details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 })
  }

  const event = parsed.data
  if (event.event !== eventType) return NextResponse.json({ error: 'Event header and payload do not match.' }, { status: 400 })
  const payloadHash = createHash('sha256').update(rawBody).digest('hex')
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('process_mafrex_booking_confirmed_callback', {
    p_event_id: deliveryId,
    p_payload_sha256: payloadHash,
    p_external_booking_id: event.booking.id,
    p_booking_reference: event.booking.booking_reference,
    p_confirmation_code: event.booking.confirmation_code,
    p_guest_name: event.booking.guest_name,
    p_guest_email: event.booking.guest_email,
    p_guest_phone: event.booking.guest_phone || null,
    p_external_room_id: event.room.external_room_id,
    p_room_number: event.room.room_number,
    p_check_in: event.booking.check_in_date,
    p_check_out: event.booking.check_out_date,
    p_guests: event.booking.guests,
    p_total_amount: event.booking.total_amount,
    p_payment_reference: event.booking.paystack_reference,
    p_qr_code: null,
  })

  if (error) {
    console.error('[MafrexAI callback] Booking upsert failed:', { deliveryId, code: error.code, message: error.message })
    return NextResponse.json({ error: callbackErrorMessage(error.message) }, { status: callbackErrorStatus(error.message) })
  }

  const result = data as { duplicate?: boolean; booking_reference?: string }
  return NextResponse.json({ received: true, duplicate: Boolean(result?.duplicate), booking_reference: result?.booking_reference }, { status: result?.duplicate ? 200 : 201 })
}

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function callbackErrorStatus(message: string) {
  if (/ROOM_NOT_FOUND|INVALID_|CAPACITY/i.test(message)) return 422
  if (/ROOM_NOT_AVAILABLE|duplicate key/i.test(message)) return 409
  return 500
}

function callbackErrorMessage(message: string) {
  if (/ROOM_NOT_FOUND/i.test(message)) return 'The referenced room does not exist in Atican.'
  if (/ROOM_NOT_AVAILABLE/i.test(message)) return 'The referenced room is no longer available for those dates.'
  if (/CAPACITY/i.test(message)) return 'The guest count exceeds the room capacity.'
  if (/INVALID_/i.test(message)) return 'The booking contains invalid values.'
  if (/duplicate key/i.test(message)) return 'The booking reference conflicts with an existing Atican booking.'
  return 'Unable to record the confirmed booking.'
}
