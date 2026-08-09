import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

interface InventoryRoom {
  id: string
  room_number: string
  room_type: string
  price_per_night: number | string
  max_occupancy: number
  amenities: string[] | null
  image_url: string | null
  gallery_images: string[] | null
  is_active: boolean
  status: string
}

export async function buildRoomCategoryPayload(admin: SupabaseClient) {
  const rooms = await loadRooms(admin)
  const groups = new Map<string, InventoryRoom[]>()
  for (const room of rooms) {
    const id = categoryExternalId(room.room_type)
    groups.set(id, [...(groups.get(id) || []), room])
  }

  return {
    external_source: externalSource(),
    categories: [...groups.entries()].map(([externalCategoryId, categoryRooms]) => {
      const firstRoom = categoryRooms[0]!
      const activeRooms = categoryRooms.filter(isOperationallyActive)
      const sourceRooms = activeRooms.length ? activeRooms : categoryRooms
      return {
        external_category_id: externalCategoryId,
        name: firstRoom.room_type,
        base_price: Math.min(...sourceRooms.map((room) => Number(room.price_per_night))),
        max_occupancy: Math.max(...sourceRooms.map((room) => Number(room.max_occupancy))),
        description: `${firstRoom.room_type} accommodation at Atican Beach Resort & Hotel.`,
        amenities: unique(sourceRooms.flatMap((room) => room.amenities || [])),
        images: unique(sourceRooms.flatMap(roomImages)),
        is_active: activeRooms.length > 0,
      }
    }).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export async function buildPullRoomCategoryPayload(admin: SupabaseClient) {
  const payload = await buildRoomCategoryPayload(admin)
  return {
    ...payload,
    categories: payload.categories.map((category) => ({
      ...category,
      images: category.images.map(securePublicImageUrl),
    })),
  }
}

export async function buildRoomPayload(admin: SupabaseClient) {
  const rooms = await loadRooms(admin)
  return {
    external_source: externalSource(),
    rooms: rooms.map((room) => ({
      external_room_id: room.id,
      external_category_id: categoryExternalId(room.room_type),
      room_number: room.room_number,
      room_type: room.room_type,
      price: Number(room.price_per_night),
      max_occupancy: Number(room.max_occupancy),
      description: `${room.room_type} room ${room.room_number} at Atican Beach Resort & Hotel.`,
      amenities: unique(room.amenities || []),
      images: unique(roomImages(room)),
      is_active: isOperationallyActive(room),
    })).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
  }
}

export async function buildPullRoomPayload(admin: SupabaseClient) {
  const rooms = await loadRooms(admin)
  return {
    external_source: externalSource(),
    rooms: rooms.map((room) => ({
      external_room_id: room.id,
      external_category_id: categoryExternalId(room.room_type),
      room_number: room.room_number,
      room_type: room.room_type,
      price: Number(room.price_per_night),
      max_occupancy: Number(room.max_occupancy),
      description: `${room.room_type} room ${room.room_number} at Atican Beach Resort & Hotel.`,
      amenities: unique(room.amenities || []),
      image_url: room.image_url ? securePublicImageUrl(room.image_url) : null,
      gallery_images: unique((room.gallery_images || []).map(securePublicImageUrl)),
      is_active: isOperationallyActive(room),
    })).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
  }
}

async function loadRooms(admin: SupabaseClient): Promise<InventoryRoom[]> {
  const { data, error } = await admin.from('rooms').select('id, room_number, room_type, price_per_night, max_occupancy, amenities, image_url, gallery_images, is_active, status').order('room_number')
  if (error) throw new Error(`Unable to load Atican rooms: ${error.message}`)
  return (data || []) as InventoryRoom[]
}

function categoryExternalId(roomType: string) {
  return roomType.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function roomImages(room: InventoryRoom) {
  return [room.image_url, ...(room.gallery_images || [])]
    .filter((value): value is string => Boolean(value))
    .map(absoluteImageUrl)
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function isOperationallyActive(room: InventoryRoom) {
  return Boolean(room.is_active) && room.status === 'available'
}

function absoluteImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.aticanbeachresort.com').replace(/\/+$/, '')
  return `${origin}/${value.replace(/^\/+/, '')}`
}

function securePublicImageUrl(value: string) {
  return absoluteImageUrl(value).replace(/^http:\/\//i, 'https://')
}

function externalSource() {
  return process.env.MAFREXAI_PROPERTY_SYNC_SOURCE?.trim() || 'atican-website'
}
