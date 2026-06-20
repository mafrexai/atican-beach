import { getRooms, getRoomTypes } from '@/lib/supabase/queries'
import { Waves, Users, Search, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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

const priceRanges = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: '₦50,000 - ₦75,000', min: 50000, max: 75000 },
  { label: '₦75,000 - ₦150,000', min: 75000, max: 150000 },
  { label: '₦150,000 - ₦300,000', min: 150000, max: 300000 },
  { label: '₦300,000+', min: 300000, max: Infinity },
]

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; price?: string; search?: string }>
}) {
  const params = await searchParams
  const filterType = params.type
  const filterPrice = params.price
  const searchQuery = params.search?.toLowerCase()

  const [rooms, roomTypes] = await Promise.all([
    getRooms(),
    getRoomTypes(),
 ])

  let filtered = rooms

  // Filter by type
  if (filterType) {
    filtered = filtered.filter((r) => r.room_type === filterType)
  }

  // Filter by price range
  if (filterPrice) {
    const range = priceRanges.find((p) => p.label === filterPrice)
    if (range) {
      filtered = filtered.filter((r) => r.price_per_night >= range.min && r.price_per_night <= range.max)
    }
  }

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter((r) =>
      r.room_type.toLowerCase().includes(searchQuery) ||
      r.room_number.toLowerCase().includes(searchQuery) ||
      (r.amenities || []).some((a) => a.toLowerCase().includes(searchQuery))
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-24 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Rooms & Suites
          </h1>
          <p className="text-xl text-blue-200">
            Choose from our {rooms.length} premium rooms and suites
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <form method="GET" className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchQuery || ''}
                placeholder="Search by room type, number, or amenity..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#0A3D62] text-white rounded-lg font-medium hover:bg-[#08324f] transition-colors"
            >
              Search
            </button>
            {(filterType || filterPrice || searchQuery) && (
              <Link
                href="/rooms"
                className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Filter Pills */}
        <div className="space-y-4">
          {/* Type Filters */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href={`/rooms${filterPrice ? `?price=${encodeURIComponent(filterPrice)}` : ''}${searchQuery ? `${filterPrice ? '&' : '?'}search=${encodeURIComponent(searchQuery)}` : ''}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !filterType ? 'bg-[#0A3D62] text-white' : 'bg-white text-gray-600 hover:bg-[#0A3D62]/10 border'
              }`}
            >
              All Rooms
            </Link>
            {roomTypes.map((type) => {
              const href = `/rooms?type=${encodeURIComponent(type)}${filterPrice ? `&price=${encodeURIComponent(filterPrice)}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
              return (
                <Link
                  key={type}
                  href={href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filterType === type ? 'bg-[#0A3D62] text-white' : 'bg-white text-gray-600 hover:bg-[#0A3D62]/10 border'
                  }`}
                >
                  {type}
                </Link>
              )
            })}
          </div>

          {/* Price Filters */}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="flex items-center gap-1 text-sm text-gray-500 mr-2">
              <SlidersHorizontal className="w-4 h-4" /> Price:
            </span>
            {priceRanges.map((range) => {
              const queryParams = new URLSearchParams()
              if (filterType) queryParams.set('type', filterType)
              if (range.label !== 'All Prices') queryParams.set('price', range.label)
              if (searchQuery) queryParams.set('search', searchQuery)
              const href = `/rooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
              return (
                <Link
                  key={range.label}
                  href={href}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    (filterPrice === range.label) || (!filterPrice && range.label === 'All Prices')
                      ? 'bg-[#F97316] text-white'
                      : 'bg-white text-gray-500 hover:bg-[#F97316]/10 border'
                  }`}
                >
                  {range.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No rooms found matching your criteria.</p>
            <Link href="/rooms" className="text-[#0A3D62] hover:underline mt-2 inline-block">
              Clear all filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                <Link href={`/rooms/${room.id}`}>
                  <div className={`h-48 bg-gradient-to-br ${roomTypeColors[room.room_type] || 'from-gray-400 to-gray-500'} flex items-center justify-center relative overflow-hidden`}>
                    {room.image_url ? (
                      <Image
                        src={room.image_url}
                        alt={room.image_alt || room.room_type}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <Waves className="w-16 h-16 text-white/50" />
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Link href={`/rooms/${room.id}`}>
                        <h3 className="font-bold text-[#082032] text-lg hover:text-[#0A3D62] transition-colors">
                          {room.room_type}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500">Room {room.room_number}</p>
                    </div>
                    <span className="bg-[#0A3D62]/10 text-[#0A3D62] text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.max_occupancy}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(room.amenities || []).map((a) => (
                      <span key={a} className="text-xs bg-[#F5F1E8] text-gray-600 px-2 py-1 rounded">{a}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[#0A3D62] font-bold text-xl">
                      ₦{room.price_per_night.toLocaleString()}
                      <span className="text-gray-400 text-sm font-normal">/night</span>
                    </p>
                    <Link
                      href={`/rooms/${room.id}`}
                      className="bg-[#0A3D62] text-white px-4 py-2 rounded-lg hover:bg-[#08324f] transition-colors text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}