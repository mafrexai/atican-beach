import { getExperiences } from '@/lib/supabase/queries'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Flame, Bike, Waves, TreePine, ChevronRight } from 'lucide-react'

const experienceIcons: Record<string, typeof Flame> = {
  'Bonfire': Flame,
  'Sack Race': Bike,
  'Beach Ball': Waves,
  'Horse Riding': TreePine,
}

export default async function ExperiencesPage() {
  const experiences = await getExperiences()

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#F97316] to-[#e0650f] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-white/80" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Experiences
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Create unforgettable memories with our curated beach experiences and activities
          </p>
        </div>
      </section>

      {/* Experiences Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Activities & Experiences</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From relaxing bonfires to thrilling horse rides, there's something for everyone</p>
          </div>

          {experiences.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No experiences available at the moment. Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {experiences.map((exp) => {
                const Icon = experienceIcons[exp.name] || Sparkles
                return (
                  <div
                    key={exp.id}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="h-48 bg-gradient-to-br from-[#F97316] to-[#D4AF37] flex items-center justify-center relative overflow-hidden">
                      {exp.image_url ? (
                        <Image
                          src={exp.image_url}
                          alt={exp.image_alt || exp.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <Icon className="w-16 h-16 text-white/50" />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-[#082032] text-lg mb-1">{exp.name}</h3>
                      <p className="text-sm text-gray-500 mb-3">{exp.description}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-[#F97316] font-bold">
                          ₦{exp.price.toLocaleString()}
                          <span className="text-gray-400 text-xs font-normal">/{exp.price_unit.replace('_', ' ')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#F97316] to-[#D4AF37]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Ready for Adventure?</h2>
          <p className="text-lg text-white/80 mb-8">Book your stay and add experiences to make your visit truly memorable.</p>
          <Link href="/rooms" className="bg-white text-[#F97316] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#F5F1E8] transition-colors inline-flex items-center gap-2">
            Book Your Stay <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}