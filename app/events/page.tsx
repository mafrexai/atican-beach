import { getEventSpaces } from '@/lib/supabase/queries'
import Link from 'next/link'
import { CalendarDays, Users, ChevronRight, Camera, Video, Armchair, Music } from 'lucide-react'

const spaceIcons: Record<string, typeof Camera> = {
  'Photo Shoot': Camera,
  'Video Shoot': Video,
  'VIP Event Space': Music,
  'Small Setup': Armchair,
  'Medium Setup': Armchair,
  'Large Setup': Users,
  'XL Setup': Users,
}

export default async function EventsPage() {
  const eventSpaces = await getEventSpaces()

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <CalendarDays className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Event Spaces
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Host your special occasions in our stunning beachfront event venues
          </p>
        </div>
      </section>

      {/* Event Spaces */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Our Venues</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From intimate gatherings to grand celebrations, we have the perfect space for you</p>
          </div>

          {eventSpaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No event spaces available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventSpaces.map((space) => {
                const Icon = spaceIcons[space.space_name] || CalendarDays
                return (
                  <div
                    key={space.id}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="h-48 bg-gradient-to-br from-[#0A3D62] to-[#08324f] flex items-center justify-center">
                      <Icon className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-[#082032] text-lg mb-1">{space.space_name}</h3>
                      <p className="text-sm text-gray-500 mb-3">{space.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {space.capacity_chairs && (
                          <span className="text-xs bg-[#0A3D62]/10 text-[#0A3D62] px-2 py-1 rounded-full flex items-center gap-1">
                            <Users className="w-3 h-3" /> {space.capacity_chairs} chairs
                          </span>
                        )}
                        {space.capacity_tables && (
                          <span className="text-xs bg-[#0A3D62]/10 text-[#0A3D62] px-2 py-1 rounded-full">
                            {space.capacity_tables} tables
                          </span>
                        )}
                      </div>
                      <p className="text-[#0A3D62] font-bold">
                        ₦{space.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#0A3D62] to-[#082032]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Plan Your Event</h2>
          <p className="text-lg text-blue-100 mb-8">Contact us to discuss your event requirements and get a custom quote.</p>
          <Link href="/contact" className="bg-[#D4AF37] text-[#082032] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#b8962f] transition-colors inline-flex items-center gap-2">
            Get in Touch <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}