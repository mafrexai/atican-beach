import Link from 'next/link'
import { Waves, Phone, Mail, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#082032] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Waves className="w-8 h-8 text-[#D4AF37]" />
              <span className="text-xl font-bold text-white">Atican Beach Resort</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Experience beachfront luxury at its finest. Atican Beach Resort & Hotel offers
              world-class accommodations, dining, and experiences.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>Beachfront, Atican</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                <span>+234 800 000 0000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                <span>info@aticanbeach.com</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/rooms" className="hover:text-[#D4AF37] transition-colors">Rooms & Suites</Link></li>
              <li><Link href="/experiences" className="hover:text-[#D4AF37] transition-colors">Experiences</Link></li>
              <li><Link href="/events" className="hover:text-[#D4AF37] transition-colors">Event Spaces</Link></li>
              <li><Link href="/dining" className="hover:text-[#D4AF37] transition-colors">Dining</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link href="/contact" className="hover:text-[#D4AF37] transition-colors">Contact Us</Link></li>
              <li><Link href="/about" className="hover:text-[#D4AF37] transition-colors">About Us</Link></li>
              <li><Link href="/gallery" className="hover:text-[#D4AF37] transition-colors">Gallery</Link></li>
              <li><Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Atican Beach Resort & Hotel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}