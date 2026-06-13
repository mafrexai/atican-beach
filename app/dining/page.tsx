'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UtensilsCrossed, Clock, MapPin, Phone, Star, ChevronRight, CalendarDays, Users, CheckCircle } from 'lucide-react'

const menuHighlights = [
  { category: 'Starters', items: [
    { name: 'Grilled Prawns', description: 'Fresh Atlantic prawns with garlic butter', price: '₦8,500' },
    { name: 'Seafood Soup', description: 'Rich bisque with assorted seafood', price: '₦6,000' },
    { name: 'Caesar Salad', description: 'Crisp romaine with parmesan and croutons', price: '₦4,500' },
  ]},
  { category: 'Main Course', items: [
    { name: 'Grilled Lobster', description: 'Whole lobster with lemon herb butter', price: '₦25,000' },
    { name: 'Seafood Paella', description: 'Spanish rice with prawns, mussels, and calamari', price: '₦15,000' },
    { name: 'Grilled Fish', description: 'Catch of the day with plantain and salad', price: '₦12,000' },
    { name: 'Jollof Rice', description: 'Nigerian classic with assorted meat', price: '₦7,500' },
  ]},
  { category: 'Desserts', items: [
    { name: 'Coconut Panna Cotta', description: 'Creamy coconut dessert with berry compote', price: '₦4,000' },
    { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with vanilla ice cream', price: '₦5,000' },
  ]},
]

const restaurantFeatures = [
  { icon: UtensilsCrossed, title: 'Ocean View Dining', desc: 'Enjoy your meal with panoramic views of the Atlantic Ocean' },
  { icon: Clock, title: 'Extended Hours', desc: 'Open daily from 7:00 AM to 11:00 PM for your convenience' },
  { icon: Star, title: '7-Star Cuisine', desc: 'World-class chefs preparing local and international dishes' },
]

const timeSlots = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
  '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
]

export default function DiningPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    requests: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-r from-[#F97316] to-[#D4AF37] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-white/80" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Dining at Atican Beach
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Savor exquisite cuisine with breathtaking ocean views. Our restaurant offers the finest in local and international dishes.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {restaurantFeatures.map((f) => (
              <div
                key={f.title}
                className="text-center p-6 rounded-xl bg-[#F5F1E8] hover:bg-[#F97316]/10 transition-colors"
              >
                <div className="w-14 h-14 bg-[#F97316]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-7 h-7 text-[#F97316]" />
                </div>
                <h3 className="text-lg font-semibold text-[#082032] mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Highlights */}
      <section className="py-16 bg-[#F5F1E8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#082032] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Menu Highlights</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">A taste of what awaits you at our ocean-view restaurant</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {menuHighlights.map((section) => (
              <div
                key={section.category}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gradient-to-r from-[#F97316] to-[#D4AF37] p-4">
                  <h3 className="text-xl font-bold text-white">{section.category}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {section.items.map((item) => (
                    <div key={item.name} className="flex justify-between items-start pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div>
                        <h4 className="font-semibold text-[#082032]">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <span className="text-[#F97316] font-bold text-sm whitespace-nowrap ml-4">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reservation Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Restaurant Info */}
            <div>
              <h2 className="text-3xl font-bold text-[#082032] mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>Restaurant Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#F97316]" />
                  <div>
                    <p className="font-medium text-[#082032]">Opening Hours</p>
                    <p className="text-gray-600 text-sm">Daily: 7:00 AM — 11:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#F97316]" />
                  <div>
                    <p className="font-medium text-[#082032]">Location</p>
                    <p className="text-gray-600 text-sm">Ground Floor, Main Building, Beachfront</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#F97316]" />
                  <div>
                    <p className="font-medium text-[#082032]">Reservations</p>
                    <p className="text-gray-600 text-sm">+234 800 000 0000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservation Form */}
            <div className="bg-gradient-to-br from-[#F5F1E8] to-white rounded-xl p-8">
              <h3 className="text-2xl font-bold text-[#082032] mb-4">Make a Reservation</h3>

              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-[#082032] mb-2">Reservation Submitted!</h4>
                  <p className="text-gray-600 mb-4">We'll confirm your table reservation via email shortly.</p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', date: '', time: '', guests: '2', requests: '' }) }}
                    className="text-[#F97316] font-medium hover:underline"
                  >
                    Make another reservation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Party Size *</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          name="guests"
                          required
                          value={formData.guests}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent appearance-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                          ))}
                          <option value="10+">10+ Guests</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          name="date"
                          required
                          value={formData.date}
                          onChange={handleChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          name="time"
                          required
                          value={formData.time}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent appearance-none"
                        >
                          <option value="">Select time</option>
                          {timeSlots.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                    <textarea
                      name="requests"
                      value={formData.requests}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                      placeholder="Allergies, special occasions, seating preferences..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#F97316] text-white py-3 rounded-lg font-semibold hover:bg-[#e0650f] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Reserve Table'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}