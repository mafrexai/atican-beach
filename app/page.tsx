import Link from 'next/link'
import { ArrowRight, Star, Waves, Tent, UtensilsCrossed, Sparkles } from 'lucide-react'
import { getFeaturedRooms } from '@/lib/supabase/queries'

const features = [
  { icon: Waves, title: 'Beachfront Luxury', desc: 'Wake up to the sound of waves in our premium rooms and suites' },
  { icon: Tent, title: 'Event Tents', desc: 'Host unforgettable events with our premium tent setups' },
  { icon: Sparkles, title: 'Experiences', desc: 'Bonfire nights, horse riding, beach games and more' },
  { icon: UtensilsCrossed, title: 'Fine Dining', desc: 'Savor exquisite cuisine at our ocean-view restaurant' },
]

export default async function HomePage() {
  const featuredRooms = await getFeaturedRooms(5)

  return (
    <div>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A3D62]/80 via-[#082032]/60 to-[#F97316]/40 z-10" />
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center" />
        <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[...Array(7)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
            Atican Beach Resort
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8">
            Where the ocean meets luxury. Experience 7-star beachfront hospitality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/rooms" className="bg-[#0A3D62] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#08324f] transition-colors inline-flex items-center gap-2">
              Book Your Stay <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/experiences" className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/30 transition-colors border border-white/30">
              Explore Experiences
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Why Choose Atican Beach</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Discover what makes us the premier beachfront destination</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="text-center p-6 rounded-xl hover:bg-[#F5F1E8] transition-colors">
                <div className="w-16 h-16 bg-[#0A3D62]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-8 h-8 text-[#0A3D62]" />
                </div>
                <h3 className="text-xl font-semibold text-[#082032] mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Types - Live from Supabase */}
      <section className="py-20 bg-[#F5F1E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Accommodations</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From cozy standard rooms to the lavish presidential suite</p>
          </div>
          {featuredRooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No rooms available at the moment. Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {featuredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Link href={`/rooms/${room.id}`}>
                    <div className="h-48 bg-gradient-to-br from-[#0A3D62] to-[#08324f] flex items-center justify-center relative overflow-hidden">
                      {room.image_url ? (
                        <img src={room.image_url} alt={room.image_alt || room.room_type} className="w-full h-full object-cover" />
                      ) : (
                        <Waves className="w-16 h-16 text-white/50" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#082032]">{room.room_type}</h3>
                      <p className="text-sm text-gray-500 mb-1">Room {room.room_number}</p>
                      <p className="text-[#0A3D62] font-bold mt-1">
                        ₦{room.price_per_night.toLocaleString()}
                        <span className="text-gray-400 text-sm font-normal">/night</span>
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link href="/rooms" className="inline-flex items-center gap-2 text-[#0A3D62] font-semibold hover:text-[#F97316] transition-colors">
              View All Rooms <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0A3D62] to-[#F97316]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Ready for an Unforgettable Experience?</h2>
          <p className="text-xl text-blue-100 mb-8">Book your stay today and discover why Atican Beach is the premier beachfront destination.</p>
          <Link href="/rooms" className="bg-white text-[#0A3D62] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#F5F1E8] transition-colors inline-flex items-center gap-2">
            Book Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}