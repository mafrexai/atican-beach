import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BedDouble, Image, AlertTriangle, Eye, Settings } from 'lucide-react'
import { getThumbnailUrl } from '@/lib/images/imageOptimizer'

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ missing_images?: string }>
}) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true })

  const filteredRooms = params.missing_images === 'true'
    ? rooms?.filter((r: any) => !r.image_url)
    : rooms

  const roomsWithoutImages = rooms?.filter((r: any) => !r.image_url).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-500 mt-1">{rooms?.length || 0} total rooms · {roomsWithoutImages} missing images</p>
        </div>
        {roomsWithoutImages > 0 && (
          <Link
            href="/admin/batch-upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            Batch Upload Images
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Link
          href="/admin/rooms"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !params.missing_images ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          All Rooms
        </Link>
        <Link
          href="/admin/rooms?missing_images=true"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
            params.missing_images === 'true' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Missing Images ({roomsWithoutImages})
        </Link>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms?.map((room: any) => (
          <div
            key={room.id}
            className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Thumbnail */}
            <div className="h-32 bg-gray-100 relative">
              {room.image_url ? (
                <img
                  src={getThumbnailUrl(room.image_url)}
                  alt={room.image_alt || room.room_type}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <BedDouble className="w-10 h-10 text-gray-300" />
                </div>
              )}
              {!room.image_url && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  No image
                </div>
              )}
              {room.gallery_images && room.gallery_images.length > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {room.gallery_images.length + 1} images
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{room.room_type}</h3>
                <span className="text-xs text-gray-400">#{room.room_number}</span>
              </div>
              <p className="text-blue-600 font-bold text-sm mb-3">
                ₦{room.price_per_night.toLocaleString()}/night
              </p>

              <div className="flex gap-2">
                <Link
                  href={`/admin/rooms/${room.id}/media`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <Image className="w-3.5 h-3.5" />
                  Images
                </Link>
                <Link
                  href={`/admin/rooms/${room.id}/features`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Features
                </Link>
                <Link
                  href={`/rooms/${room.id}`}
                  target="_blank"
                  className="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}