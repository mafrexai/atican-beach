import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ConciergeTargetType = 'room' | 'experience' | 'tent' | 'event_space' | 'public_event'

export interface ConciergeRecommendation {
  id: string
  source: 'manager_offer' | 'catalog_recommendation'
  type: ConciergeTargetType
  title: string
  description: string
  itemName: string
  originalPrice: number
  offerPrice: number
  ctaText: string
  ctaLink: string
  priority: number
  expiresAt: string | null
}

interface RecommendationContext {
  currentPage: string
  cartItemTypes: string[]
}

interface CatalogItem {
  id: string
  type: ConciergeTargetType
  name: string
  description: string
  price: number
  ctaLink: string
}

interface OfferRow {
  id: string
  title: string
  description: string
  target_type: ConciergeTargetType
  target_id: string
  offer_price: number | string | null
  cta_text: string
  audience_page: string
  priority: number
  starts_at: string | null
  ends_at: string | null
}

export async function getConciergeRecommendation(
  context: RecommendationContext,
  supabase: SupabaseClient
): Promise<ConciergeRecommendation | null> {
  const catalog = await loadCatalog(supabase)
  if (!catalog.length) return null

  const now = new Date().toISOString()
  const pageAudience = audienceForPath(context.currentPage)
  const { data: offers } = await supabase
    .from('concierge_offers')
    .select('id, title, description, target_type, target_id, offer_price, cta_text, audience_page, priority, starts_at, ends_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('priority', { ascending: false })

  for (const offer of (offers || []) as OfferRow[]) {
    if (offer.audience_page !== 'any' && offer.audience_page !== pageAudience) continue
    const item = catalog.find((candidate) => candidate.type === offer.target_type && candidate.id === offer.target_id)
    if (!item) continue
    const offerPrice = offer.offer_price === null ? item.price : Number(offer.offer_price)
    if (!Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice > item.price) continue

    return {
      id: offer.id,
      source: 'manager_offer',
      type: item.type,
      title: offer.title,
      description: offer.description,
      itemName: item.name,
      originalPrice: item.price,
      offerPrice,
      ctaText: offer.cta_text,
      ctaLink: item.ctaLink,
      priority: offer.priority,
      expiresAt: offer.ends_at,
    }
  }

  const fallback = chooseFallback(catalog, context)
  if (!fallback) return null
  return {
    id: `catalog-${fallback.type}-${fallback.id}`,
    source: 'catalog_recommendation',
    type: fallback.type,
    title: fallbackTitle(fallback.type),
    description: fallback.description || `Discover ${fallback.name} during your visit to Atican Beach Resort & Hotel.`,
    itemName: fallback.name,
    originalPrice: fallback.price,
    offerPrice: fallback.price,
    ctaText: `View ${labelForType(fallback.type)}`,
    ctaLink: fallback.ctaLink,
    priority: 1,
    expiresAt: null,
  }
}

async function loadCatalog(supabase: SupabaseClient): Promise<CatalogItem[]> {
  const [roomsResult, experiencesResult, tentsResult, spacesResult, publicEventsResult] = await Promise.all([
    supabase.from('rooms').select('id, room_type, price_per_night').eq('is_active', true).eq('status', 'available'),
    supabase.from('experiences').select('id, name, description, price').eq('is_active', true),
    supabase.from('tents').select('id, tent_name, price, quantity_available').eq('is_active', true).gt('quantity_available', 0),
    supabase.from('event_spaces').select('id, space_name, description, price').eq('is_active', true),
    supabase.from('public_events').select('id, title, slug, summary, ticket_price').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('starts_at'),
  ])

  const rooms: CatalogItem[] = []
  const seenRoomTypes = new Set<string>()
  for (const room of roomsResult.data || []) {
    if (seenRoomTypes.has(room.room_type)) continue
    seenRoomTypes.add(room.room_type)
    rooms.push({ id: room.id, type: 'room', name: `${room.room_type} Room`, description: `Enjoy a comfortable ${room.room_type} stay by the beach.`, price: Number(room.price_per_night), ctaLink: `/rooms/${room.id}` })
  }

  return [
    ...rooms,
    ...(experiencesResult.data || []).map((item: { id: string; name: string; description: string | null; price: number }) => ({ id: item.id, type: 'experience' as const, name: item.name, description: item.description || '', price: Number(item.price), ctaLink: '/experiences' })),
    ...(tentsResult.data || []).map((item: { id: string; tent_name: string; price: number; quantity_available: number }) => ({ id: item.id, type: 'tent' as const, name: item.tent_name, description: `A verified event tent option with ${item.quantity_available} currently available.`, price: Number(item.price), ctaLink: '/tents' })),
    ...(spacesResult.data || []).map((item: { id: string; space_name: string; description: string | null; price: number }) => ({ id: item.id, type: 'event_space' as const, name: item.space_name, description: item.description || '', price: Number(item.price), ctaLink: '/tents' })),
    ...(publicEventsResult.data || []).filter((item: { ticket_price: number | null }) => item.ticket_price !== null).map((item: { id: string; title: string; slug: string; summary: string; ticket_price: number }) => ({ id: item.id, type: 'public_event' as const, name: item.title, description: item.summary, price: Number(item.ticket_price), ctaLink: `/events/${item.slug}` })),
  ].filter((item) => Number.isFinite(item.price) && item.price >= 0)
}

function chooseFallback(catalog: CatalogItem[], context: RecommendationContext): CatalogItem | null {
  const upcomingEvent = catalog.find((item) => item.type === 'public_event')
  if (upcomingEvent && (context.currentPage === '/' || context.currentPage.startsWith('/events'))) return upcomingEvent
  const preferredType: ConciergeTargetType = context.currentPage.startsWith('/rooms')
    ? 'experience'
    : context.currentPage.startsWith('/experiences')
      ? 'room'
      : context.currentPage.startsWith('/tents')
        ? 'event_space'
        : context.cartItemTypes.includes('room')
          ? 'experience'
          : 'room'
  return catalog.filter((item) => item.type === preferredType).sort((a, b) => a.price - b.price)[0]
    || catalog.sort((a, b) => a.price - b.price)[0]
    || null
}

function audienceForPath(path: string): string {
  if (path.startsWith('/rooms')) return 'rooms'
  if (path.startsWith('/experiences')) return 'experiences'
  if (path.startsWith('/tents')) return 'tents'
  if (path.startsWith('/events')) return 'events'
  if (path.startsWith('/checkout')) return 'checkout'
  return 'any'
}

function fallbackTitle(type: ConciergeTargetType): string {
  return type === 'room' ? 'A room you may enjoy' : type === 'experience' ? 'Complete your stay' : type === 'tent' ? 'Plan your beach event' : type === 'public_event' ? 'Coming up at Atican' : 'A setup to consider'
}

function labelForType(type: ConciergeTargetType): string {
  return type === 'event_space' ? 'setup' : type === 'public_event' ? 'event' : type
}
