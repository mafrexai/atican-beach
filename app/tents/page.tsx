import { getTents } from '@/lib/supabase/queries'
import Link from 'next/link'
import { Tent, Users, ChevronRight, Armchair } from 'lucide-react'

export default async function TentsPage() {
  const tents = await getTents()

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#D4AF37] to-[#b8962f] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <Tent className="w-16 h-16 mx-auto mb-4 text-white/80" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Event Tents
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Premium tent setups for weddings, corporate events, and special celebrations
          </p>
        </div>
      </section>

      {/* Tents Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Our Tent Options</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Choose from our range of premium tents, each designed to make your event unforgettable</p>
          </div>

          {tents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tents available at the moment. Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tents.map((tent) => (
                <div
                  key={tent.id}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="h-48 bg-gradient-to-br from-[#D4AF37] to-[#F97316] flex items-center justify-center">
                    <Tent className="w-16 h-16 text-white/50" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#082032] text-lg mb-2">{tent.tent_name}</h3>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-[#D4AF37]" />
                        <span>{tent.capacity_chairs} chairs</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Armchair className="w-4 h-4 text-[#D4AF37]" />
                        <span>{tent.capacity_tables} tables</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {tent.quantity_available} available
                      </div>
                    </div>
                    <p className="text-[#D4AF37] font-bold text-xl">
                      ₦{tent.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#D4AF37] to-[#F97316]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Need a Custom Setup?</h2>
          <p className="text-lg text-white/80 mb-8">We can customize tent configurations to match your event vision. Contact us for a personalized quote.</p>
          <Link href="/contact" className="bg-white text-[#D4AF37] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#F5F1E8] transition-colors inline-flex items-center gap-2">
            Contact Us <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}