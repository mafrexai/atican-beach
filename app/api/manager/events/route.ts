import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeManager, writeAuditLog } from '@/lib/manager/authorize'

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(10).max(320),
  description: z.string().trim().min(20).max(6000),
  venue: z.string().trim().min(3).max(240),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  recurrenceLabel: z.string().trim().max(80).nullable(),
  ticketPrice: z.number().min(0).max(100_000_000).nullable(),
  paymentUrl: z.string().url().refine((value) => {
    const url = new URL(value)
    return ['mafrexai.com', 'www.mafrexai.com'].includes(url.hostname)
  }, 'Use a verified mafrexai.com payment link.').nullable(),
  coverImageUrl: z.string().trim().max(1200).nullable(),
  galleryImages: z.array(z.string().url()).max(20),
  videoUrl: z.string().url().nullable(),
  highlights: z.array(z.string().trim().min(2).max(160)).max(12),
  status: z.enum(['draft', 'published', 'cancelled']),
  isFeatured: z.boolean(),
})

export async function GET() {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const { data, error } = await auth.admin.from('public_events').select('*').order('starts_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const parsed = eventSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid event details.' }, { status: 400 })
  if (parsed.data.endsAt && parsed.data.endsAt <= parsed.data.startsAt) return NextResponse.json({ error: 'The event end must be after its start.' }, { status: 400 })
  const { data, error } = await auth.admin.from('public_events').insert(toRow(parsed.data, auth.userId)).select().single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That event URL slug is already in use.' : error.message }, { status: 500 })
  await writeAuditLog(auth.admin, { userId: auth.userId, role: auth.role, action: 'event_created', summary: `Created public event: ${data.title}`, category: 'content', entityType: 'public_event', entityId: data.id })
  return NextResponse.json({ event: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const parsed = eventSchema.safeParse(await request.json())
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: parsed.error?.issues[0]?.message || 'A valid event is required.' }, { status: 400 })
  if (parsed.data.endsAt && parsed.data.endsAt <= parsed.data.startsAt) return NextResponse.json({ error: 'The event end must be after its start.' }, { status: 400 })
  const { id, ...values } = parsed.data
  const { data, error } = await auth.admin.from('public_events').update(toRow(values)).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That event URL slug is already in use.' : error.message }, { status: 500 })
  await writeAuditLog(auth.admin, { userId: auth.userId, role: auth.role, action: 'event_updated', summary: `Updated public event: ${data.title}`, category: 'content', entityType: 'public_event', entityId: data.id })
  return NextResponse.json({ event: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeManager()
  if (!auth.ok) return auth.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'A valid event ID is required.' }, { status: 400 })
  const { data: event } = await auth.admin.from('public_events').select('title').eq('id', id).single()
  const { error } = await auth.admin.from('public_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(auth.admin, { userId: auth.userId, role: auth.role, action: 'event_deleted', summary: `Deleted public event: ${event?.title || id}`, category: 'content', severity: 'warning', entityType: 'public_event', entityId: id })
  return NextResponse.json({ success: true })
}

function toRow(values: Omit<z.infer<typeof eventSchema>, 'id'> | z.infer<typeof eventSchema>, createdBy?: string) {
  return {
    title: values.title, slug: values.slug, summary: values.summary, description: values.description,
    venue: values.venue, starts_at: values.startsAt, ends_at: values.endsAt,
    recurrence_label: values.recurrenceLabel, ticket_price: values.ticketPrice,
    payment_url: values.paymentUrl, cover_image_url: values.coverImageUrl,
    gallery_images: values.galleryImages, video_url: values.videoUrl, highlights: values.highlights,
    status: values.status, is_featured: values.isFeatured, ...(createdBy ? { created_by: createdBy } : {}),
  }
}
