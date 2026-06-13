import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRoomById } from '@/lib/supabase/queries'
import { Waves, Users, Wifi, Tv, Wind, Martini, Eye, Armchair, Sparkles, ChevronRight } from 'lucide-react'
import { RoomImageGallery } from '@/components/rooms/RoomImageGallery'
import { AddToCartButton } from '@/components/rooms/AddToCartButton'

const amenityIcons: Record<string, typeof Wifi> = {
  'WiFi': Wifi,
  'TV': Tv,
  'AC': Wind,
  'Mini Bar': Martini,
  'Ocean View': Eye,
  'Lounge': Armchair,
  'Jacuzzi': Sparkles,
}

const roomTypeColors: Record<string, string> = {
  'Standard': 'from-gray-400 to-gray-500',
  'Deluxe': 'from-[#0A3D62] to-[#08324f]',
  'Double Bed': 'from-teal-400 to-teal-600',
  'Family': 'from-green-400 to-green-600',
  'Executive': 'from-purple-400 to-purple-600',
  'Premium Suite': 'from-[#D4AF37] to-[#b8962f]',
  'Executive Suite': 'from-rose-400 to-rose-600',
  'Presidential Suite': 'from-[#D4AF37] to-[#F97316]',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoomDetailPage({ params }: Props) {
  const { id } = await params
  const room = await getRoomById(id)

  if (!room) {
    notFound()
  }

  const colorGradient = roomTypeColors[room.room_type] || 'from-[#0A3D62] to-[#08324f]'

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#0A3D62] transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/rooms" className="hover:text-[#0A3D62] transition-colors">Rooms</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#082032] font-medium">{room.room_type} — Room {room.room_number}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Gallery + Details */}
          <div className="lg:col-span-3 space-y-8">
            {/* Image Gallery */}
            <RoomImageGallery
              roomType={room.room_type}
              colorGradient={colorGradient}
              imageUrl={room.image_url}
              galleryImages={room.gallery_images || []}
              imageAlt={room.image_alt}
            />

            {/* Room Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {room.room_type}
                  </h1>
                  <p className="text-gray-500 mt-1">Room {room.room_number}</p>
                </div>
                <span className="bg-[#0A3D62]/10 text-[#0A3D62] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium">
                  <Users className="w-4 h-4" /> Up to {room.max_occupancy} guests
                </span>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">
                Experience comfort and elegance in our {room.room_type.toLowerCase()} room.
                {room.room_type.includes('Suite') ? ' This premium suite offers expansive living spaces with top-tier amenities for an unforgettable stay.' : ''}
                {room.room_type === 'Family' ? ' Perfect for families, this spacious room accommodates up to 4 guests with dedicated sleeping areas.' : ''}
                {room.room_type === 'Standard' ? ' A cozy and well-appointed room offering all essential amenities for a comfortable stay.' : ''}
                {room.room_type === 'Deluxe' ? ' An upgraded room with additional comforts and premium furnishings for a more luxurious experience.' : ''}
                {room.room_type === 'Executive' ? ' Designed for the discerning traveler, featuring exclusive amenities and refined decor.' : ''}
              </p>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-semibold text-[#082032] mb-3">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(room.amenities || []).map((amenity) => {
                    const Icon = amenityIcons[amenity] || Waves
                    return (
                      <div key={amenity} className="flex items-center gap-2 p-3 bg-[#F5F1E8] rounded-lg">
                        <Icon className="w-5 h-5 text-[#0A3D62]" />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#082032] mb-3">Room Policies</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Check-in: 2:00 PM — Check-out: 12:00 PM</p>
                <p>• Cancellation allowed up to 48 hours before check-in</p>
                <p>• No smoking inside rooms</p>
                <p>• Valid ID required at check-in</p>
                <p>• QR code will be provided upon confirmation for gate entry</p>
              </div>
            </div>
          </div>

          {/* Right: Booking Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-3xl font-bold text-[#0A3D62]">
                  ₦{room.price_per_night.toLocaleString()}
                  <span className="text-gray-400 text-base font-normal"> /night</span>
                </p>
              </div>

              <AddToCartButton room={room} />

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max occupancy</span>
                  <span className="text-[#082032] font-medium">{room.max_occupancy} guests</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Room number</span>
                  <span className="text-[#082032] font-medium">{room.room_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full" /> Available
                  </span>
                </div>
              </div>

              <Link
                href="/rooms"
                className="mt-6 block text-center text-sm text-[#0A3D62] hover:text-[#F97316] transition-colors"
              >
                ← View all rooms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}