import Link from 'next/link'
import { Star, Waves, Award, Users, ChevronRight, Heart, Shield, Sparkles } from 'lucide-react'

const stats = [
  { value: '45', label: 'Luxury Rooms' },
  { value: '7', label: 'Event Spaces' },
  { value: '4', label: 'Experiences' },
  { value: '7★', label: 'Rating' },
]

const values = [
  {
    icon: Heart,
    title: 'Hospitality First',
    description: 'Every guest is family. We go above and beyond to ensure your stay is comfortable, memorable, and truly luxurious.',
  },
  {
    icon: Shield,
    title: 'Safety & Security',
    description: 'Your safety is our priority. With 24/7 security, QR-coded gate entry, and trained staff, you can relax with peace of mind.',
  },
  {
    icon: Sparkles,
    title: 'Attention to Detail',
    description: 'From the thread count of our sheets to the presentation of our dishes, every detail is crafted for excellence.',
  },
  {
    icon: Award,
    title: 'Award-Winning Service',
    description: 'Our 7-star rating reflects our commitment to world-class service, cuisine, and guest experience.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <Waves className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            About Atican Beach
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Where the ocean meets luxury. Discover the story behind Nigeria's premier beachfront resort.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-[#082032] mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
                Our Story
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Nestled along the pristine coastline of Atican Beach, our resort was born from a vision to create Nigeria's most luxurious beachfront destination. What began as a dream has blossomed into a 7-star resort that welcomes guests from around the world.
                </p>
                <p>
                  With 45 meticulously designed rooms and suites, 8 premium event tents, and 7 versatile event spaces, Atican Beach Resort offers an unparalleled experience for leisure travelers, families, and corporate guests alike.
                </p>
                <p>
                  Our world-class restaurant serves exquisite local and international cuisine with panoramic ocean views. From bonfire nights on the beach to horseback riding along the shore, every moment at Atican Beach is designed to create lasting memories.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-[#F5F1E8] rounded-xl p-6 text-center">
                  <p className="text-3xl font-bold text-[#0A3D62]">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#F5F1E8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Our Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">The principles that guide everything we do at Atican Beach Resort</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-[#0A3D62]/10 rounded-full flex items-center justify-center mb-4">
                  <value.icon className="w-7 h-7 text-[#0A3D62]" />
                </div>
                <h3 className="text-lg font-semibold text-[#082032] mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Recognition</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Proudly recognized for excellence in hospitality</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[...Array(7)].map((_, i) => (
              <Star key={i} className="w-10 h-10 fill-[#D4AF37] text-[#D4AF37]" />
            ))}
          </div>
          <p className="text-center text-2xl font-bold text-[#0A3D62] mt-4">7-Star Luxury Resort</p>
          <p className="text-center text-gray-500 mt-2">Certified Excellence in Beachfront Hospitality</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0A3D62] to-[#F97316]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Experience Atican Beach</h2>
          <p className="text-xl text-blue-100 mb-8">Your luxury beachfront escape awaits. Book your stay today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/rooms" className="bg-white text-[#0A3D62] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#F5F1E8] transition-colors inline-flex items-center gap-2">
              Book Now <ChevronRight className="w-5 h-5" />
            </Link>
            <Link href="/contact" className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/30 transition-colors border border-white/30 inline-flex items-center gap-2">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}