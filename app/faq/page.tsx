import { ChevronDown, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const faqs = [
  {
    category: 'Booking & Reservations',
    questions: [
      {
        q: 'How do I make a reservation?',
        a: 'You can book directly through our website by visiting the Rooms page, selecting your preferred room, and completing the checkout process. You can also call us at +2349029622583 or email bookings@aticanbeachresort.com. aticanbeachresort716@gmail.com',
      },
      {
        q: 'What is your cancellation policy?',
        a: 'Cancellations made up to 48 hours before check-in receive a full refund. Cancellations within 48 hours may be subject to a one-night charge. No-shows will be charged for the full booking.',
      },
      {
        q: 'Can I modify my booking?',
        a: 'Yes, you can modify your booking up to 48 hours before check-in. Please contact our front desk or use your dashboard to make changes.',
      },
      {
        q: 'Do you offer group discounts?',
        a: 'Yes, we offer special rates for group bookings of 5 or more rooms. Please contact our events team for a custom quote.',
      },
    ],
  },
  {
    category: 'Check-in & Check-out',
    questions: [
      {
        q: 'What are the check-in and check-out times?',
        a: 'Check-in is at 2:00 PM and check-out is at 12:00 PM. Early check-in and late check-out may be available upon request, subject to availability.',
      },
      {
        q: 'What do I need to bring for check-in?',
        a: 'Please bring a valid government-issued ID (passport or national ID) and your booking confirmation. The confirmation code or QR code from your booking will be required for gate entry.',
      },
      {
        q: 'How does the QR code gate entry work?',
        a: 'After your booking is confirmed, you\'ll receive a QR code via email. Simply show this QR code at the gate scanner for entry. You can also use your 6-digit confirmation code as a backup.',
      },
    ],
  },
  {
    category: 'Rooms & Amenities',
    questions: [
      {
        q: 'What amenities are included in the rooms?',
        a: 'All rooms include AC, TV, and WiFi. Higher-tier rooms include additional amenities such as Mini Bar, Ocean View, Lounge access, and Butler service. Check individual room listings for specific amenities.',
      },
      // {
      //   q: 'Is room service available?',
      //   a: 'Yes, 24-hour room service is available. You can order through our Room Service page or by dialing extension 0 from your room phone.',
      // },
      {
        q: 'Is there a swimming pool?',
        a: 'Yes, we have a stunning infinity pool overlooking the beach, available to all guests.',
      },
    ],
  },
  {
    category: 'Events & Dining',
    questions: [
      {
        q: 'How do I book an event space or tent?',
        a: 'You can book event spaces and tents through our website or by contacting our events team. We offer customizable setups for weddings, corporate events, and special celebrations.',
      },
      {
        q: 'Do I need a reservation for the restaurant?',
        a: 'While walk-ins are welcome, we recommend making a reservation, especially during peak hours and weekends. You can reserve a table through our Dining page.',
      },
      {
        q: 'Do you accommodate dietary restrictions?',
        a: 'Yes, our chefs can accommodate various dietary requirements including vegetarian, vegan, gluten-free, and halal options. Please inform us when making your reservation.',
      },
    ],
  },
  {
    category: 'General',
    questions: [
      {
        q: 'Is parking available?',
        a: 'Yes, we offer complimentary secure parking for all guests. Valet parking is also available.',
      },
      {
        q: 'Is WiFi available?',
        a: 'Yes, complimentary high-speed WiFi is available throughout the resort, including all rooms, common areas, and the beach.',
      },
      {
        q: 'Are pets allowed?',
        a: 'Unfortunately, pets are not allowed at the resort with the exception of service animals. Please contact us if you have specific requirements.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards, bank transfers, and payments through Paystack. All online payments are processed securely.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-24 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <HelpCircle className="w-14 h-14 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Find answers to common questions about your stay at Atican Beach Resort
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-2xl font-bold text-[#082032] mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.questions.map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#F5F1E8] transition-colors">
                      <span className="font-medium text-[#082032] pr-4">{faq.q}</span>
                      <ChevronDown className="w-5 h-5 text-[#0A3D62] shrink-0 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-16 bg-gradient-to-r from-[#0A3D62] to-[#082032] rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>Still Have Questions?</h3>
          <p className="text-blue-200 mb-6">Our team is here to help. Reach out to us anytime.</p>
          <Link href="/contact" className="bg-[#D4AF37] text-[#082032] px-8 py-3 rounded-lg font-semibold hover:bg-[#b8962f] transition-colors inline-flex items-center gap-2">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}