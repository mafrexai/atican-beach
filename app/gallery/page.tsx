import { Camera, Waves, Tent, UtensilsCrossed, Sparkles, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const gallerySections = [
  {
    title: 'Rooms & Suites',
    description: 'Luxurious accommodations with ocean views',
    icon: Waves,
    gradient: 'from-[#0A3D62] to-[#08324f]',
  },
  {
    title: 'Event Tents',
    description: 'Premium tent setups for unforgettable events',
    icon: Tent,
    gradient: 'from-[#D4AF37] to-[#F97316]',
  },
  {
    title: 'Dining',
    description: 'Exquisite cuisine with breathtaking ocean views',
    icon: UtensilsCrossed,
    gradient: 'from-[#F97316] to-[#D4AF37]',
  },
  {
    title: 'Experiences',
    description: 'Bonfire nights, horse riding, and beach activities',
    icon: Sparkles,
    gradient: 'from-[#F97316] to-[#e0650f]',
  },
  {
    title: 'Event Spaces',
    description: 'Stunning beachfront venues for special occasions',
    icon: Users,
    gradient: 'from-[#0A3D62] to-[#082032]',
  },
  {
    title: 'Beach & Surroundings',
    description: 'The natural beauty of Atican Beach',
    icon: Camera,
    gradient: 'from-[#08324f] to-[#D4AF37]',
  },
]

const galleryImages = [
  { alt: 'Beachfront view', category: 'Beach' },
  { alt: 'Luxury suite', category: 'Rooms' },
  { alt: 'Restaurant', category: 'Dining' },
  { alt: 'Event tent', category: 'Events' },
  { alt: 'Bonfire night', category: 'Experiences' },
  { alt: 'Pool area', category: 'Beach' },
  { alt: 'Deluxe room', category: 'Rooms' },
  { alt: 'Beach horse riding', category: 'Experiences' },
  { alt: 'VIP event space', category: 'Events' },
  { alt: 'Ocean view dining', category: 'Dining' },
  { alt: 'Presidential suite', category: 'Rooms' },
  { alt: 'Sunset at Atican', category: 'Beach' },
]

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <Camera className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Gallery
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Explore the beauty of Atican Beach Resort through our curated collection of moments
          </p>
        </div>
      </section>

      {/* Gallery Sections */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Explore Our Resort</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From luxurious rooms to stunning beach views, discover what makes Atican Beach special</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallerySections.map((section) => (
              <div
                key={section.title}
                className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`h-56 bg-gradient-to-br ${section.gradient} flex items-center justify-center`}>
                  <section.icon className="w-20 h-20 text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#082032] text-lg mb-1">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Photo Gallery</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">A glimpse into the Atican Beach experience</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className={`relative group overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${
                  index % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''
                }`}
              >
                <div className={`w-full ${index % 5 === 0 ? 'h-80' : 'h-48'} bg-gradient-to-br from-[#0A3D62]/20 to-[#D4AF37]/20 flex items-center justify-center`}>
                  <Camera className="w-10 h-10 text-[#0A3D62]/30" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#082032]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-medium text-sm">{image.alt}</p>
                    <p className="text-white/60 text-xs">{image.category}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#0A3D62] to-[#F97316]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Experience It Yourself</h2>
          <p className="text-lg text-blue-100 mb-8">Photos can only capture so much. Come experience the luxury and beauty of Atican Beach in person.</p>
          <Link href="/rooms" className="bg-white text-[#0A3D62] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#F5F1E8] transition-colors inline-flex items-center gap-2">
            Book Your Stay <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}