import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(500),
  targetType: z.enum(['room', 'experience', 'tent', 'event_space']),
  targetId: z.string().uuid(),
  offerPrice: z.number().nonnegative().nullable(),
  ctaText: z.string().trim().min(2).max(40),
  audiencePage: z.enum(['any', 'rooms', 'experiences', 'tents', 'events', 'checkout']),
  priority: z.number().int().min(1).max(10),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
})

export async function GET() {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response

  const [offersResult, catalog] = await Promise.all([
    auth.admin.from('concierge_offers').select('*').order('created_at', { ascending: false }),
    loadManagerCatalog(auth.admin),
  ])
  if (offersResult.error) return NextResponse.json({ error: offersResult.error.message }, { status: 500 })
  return NextResponse.json({ offers: offersResult.data || [], catalog })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const parsed = offerSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Please check the offer details.', details: parsed.error.flatten() }, { status: 400 })

  const validation = await validateTargetAndPrice(auth.admin, parsed.data.targetType, parsed.data.targetId, parsed.data.offerPrice)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
  if (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt <= parsed.data.startsAt) {
    return NextResponse.json({ error: 'The end date must be after the start date.' }, { status: 400 })
  }

  const { data, error } = await auth.admin.from('concierge_offers').insert(toDatabaseRow(parsed.data, auth.userId)).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offer: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const parsed = offerSchema.safeParse(await request.json())
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: 'A valid offer and offer ID are required.' }, { status: 400 })

  const validation = await validateTargetAndPrice(auth.admin, parsed.data.targetType, parsed.data.targetId, parsed.data.offerPrice)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
  if (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt <= parsed.data.startsAt) {
    return NextResponse.json({ error: 'The end date must be after the start date.' }, { status: 400 })
  }

  const { id, ...values } = parsed.data
  const { data, error } = await auth.admin.from('concierge_offers').update(toDatabaseRow(values)).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offer: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'A valid offer ID is required.' }, { status: 400 })
  const { error } = await auth.admin.from('concierge_offers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

async function authorizeManager(): Promise<
  | { ok: true; admin: SupabaseClient; userId: string }
  | { ok: false; response: NextResponse }
> {
  const server = await createServerSupabaseClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
  const admin = createAdminClient()
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (!role || !['manager', 'admin'].includes(role.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Manager access required.' }, { status: 403 }) }
  }
  return { ok: true, admin, userId: user.id }
}

function toDatabaseRow(values: z.infer<typeof offerSchema> | Omit<z.infer<typeof offerSchema>, 'id'>, createdBy?: string) {
  return {
    title: values.title,
    description: values.description,
    target_type: values.targetType,
    target_id: values.targetId,
    offer_price: values.offerPrice,
    cta_text: values.ctaText,
    audience_page: values.audiencePage,
    priority: values.priority,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    is_active: values.isActive,
    ...(createdBy ? { created_by: createdBy } : {}),
  }
}

async function validateTargetAndPrice(admin: SupabaseClient, type: string, id: string, offerPrice: number | null) {
  const config: Record<string, { table: string; price: string }> = {
    room: { table: 'rooms', price: 'price_per_night' },
    experience: { table: 'experiences', price: 'price' },
    tent: { table: 'tents', price: 'price' },
    event_space: { table: 'event_spaces', price: 'price' },
  }
  const target = config[type]
  if (!target) return { ok: false, error: 'Unsupported offer target.' }
  const { data } = await admin.from(target.table).select(`id, ${target.price}`).eq('id', id).eq('is_active', true).single()
  if (!data) return { ok: false, error: 'The selected catalog item is no longer active.' }
  const row = data as unknown as Record<string, unknown>
  const livePrice = Number(row[target.price])
  if (offerPrice !== null && offerPrice > livePrice) return { ok: false, error: 'Offer price cannot exceed the current catalog price.' }
  return { ok: true }
}

async function loadManagerCatalog(admin: SupabaseClient) {
  const [rooms, experiences, tents, events] = await Promise.all([
    admin.from('rooms').select('id, room_number, room_type, price_per_night').eq('is_active', true).order('room_type'),
    admin.from('experiences').select('id, name, price').eq('is_active', true).order('name'),
    admin.from('tents').select('id, tent_name, price').eq('is_active', true).order('tent_name'),
    admin.from('event_spaces').select('id, space_name, price').eq('is_active', true).order('space_name'),
  ])
  return [
    ...(rooms.data || []).map((item: { id: string; room_number: string; room_type: string; price_per_night: number }) => ({ id: item.id, type: 'room', name: `${item.room_type} — Room ${item.room_number}`, price: Number(item.price_per_night) })),
    ...(experiences.data || []).map((item: { id: string; name: string; price: number }) => ({ id: item.id, type: 'experience', name: item.name, price: Number(item.price) })),
    ...(tents.data || []).map((item: { id: string; tent_name: string; price: number }) => ({ id: item.id, type: 'tent', name: item.tent_name, price: Number(item.price) })),
    ...(events.data || []).map((item: { id: string; space_name: string; price: number }) => ({ id: item.id, type: 'event_space', name: item.space_name, price: Number(item.price) })),
  ]
}
