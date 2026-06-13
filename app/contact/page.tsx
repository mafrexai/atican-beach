'use client'

import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-24 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <MessageSquare className="w-14 h-14 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Contact Us
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            We'd love to hear from you. Reach out to us for bookings, inquiries, or special requests.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0A3D62]/10 rounded-full flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-[#0A3D62]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082032] mb-1">Address</h3>
                  <p className="text-gray-600 text-sm">Atican Beach Resort & Hotel<br />Beachfront, Atican<br />Lagos, Nigeria</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F97316]/10 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-[#F97316]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082032] mb-1">Phone</h3>
                  <p className="text-gray-600 text-sm">+234 800 000 0000<br />+234 800 000 0001</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082032] mb-1">Email</h3>
                  <p className="text-gray-600 text-sm">info@aticanbeach.com<br />bookings@aticanbeach.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0A3D62]/10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-[#0A3D62]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082032] mb-1">Reception Hours</h3>
                  <p className="text-gray-600 text-sm">24/7 Front Desk<br />Concierge: 6:00 AM — 11:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#082032] mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>Send Us a Message</h2>

              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-[#082032] mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-6">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }) }}
                    className="text-[#0A3D62] font-medium hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
                        placeholder="+234 800 000 0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                      <select
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent appearance-none"
                      >
                        <option value="">Select a subject</option>
                        <option value="booking">Booking Inquiry</option>
                        <option value="events">Events & Tents</option>
                        <option value="dining">Dining Reservation</option>
                        <option value="room-service">Room Service</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                    <textarea
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0A3D62] text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-[#08324f] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? 'Sending...' : <><Send className="w-5 h-5" /> Send Message</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}