import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CheckCircle, Download, Calendar, MapPin, Users, Phone, Mail, ChevronRight } from 'lucide-react'
import QRCode from 'react-qr-code'

interface Props {
  searchParams: Promise<{ ref?: string }>
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams
  const ref = params.ref

  if (!ref) {
    redirect('/rooms')
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items(*)
    `)
    .eq('booking_reference', ref)
    .single()

  if (!booking) {
    redirect('/rooms')
  }

  const qrValue = JSON.stringify({
    bookingRef: booking.booking_reference,
    confirmationCode: booking.confirmationCode,
    guestName: booking.guest_name,
  })

  const checkIn = booking.check_in_date
  const checkOut = booking.check_out_date

  const calendarTitle = `Atican Beach Resort - ${booking.booking_reference}`
  const calendarDates = checkIn && checkOut
    ? `${checkIn.replace(/-/g, '')}/${checkOut.replace(/-/g, '')}`
    : ''

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Success Header */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-16 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-200" />
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
            Booking Confirmed!
          </h1>
          <p className="text-green-100 text-lg">
            Your reservation has been successfully confirmed. A confirmation email has been sent to {booking.guest_email}.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Booking Reference Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Booking Reference</p>
              <p className="text-2xl font-bold text-[#0A3D62]">{booking.booking_reference}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Confirmation Code</p>
              <p className="text-2xl font-bold text-[#F97316]">{booking.confirmation_code}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center py-6 border-t border-b">
            <p className="text-sm text-gray-500 mb-4">Show this QR code at the gate for entry</p>
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200">
              <QRCode value={qrValue} size={180} />
            </div>
            <button
              onClick={() => {
                const svg = document.getElementById('booking-qr-code')
                if (svg) {
                  const svgData = new XMLSerializer().serializeToString(svg)
                  const blob = new Blob([svgData], { type: 'image/svg+xml' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `atican-beach-${booking.booking_reference}.svg`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              }}
              className="mt-4 flex items-center gap-2 text-[#0A3D62] hover:text-[#F97316] font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </button>
            <div className="hidden">
              <QRCode id="booking-qr-code" value={qrValue} size={256} />
            </div>
          </div>

          {/* Booking Details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Guest</p>
                <p className="text-sm font-medium text-[#082032]">{booking.guest_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-[#082032]">{booking.guest_email}</p>
              </div>
            </div>
            {booking.guest_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-[#082032]">{booking.guest_phone}</p>
                </div>
              </div>
            )}
            {checkIn && checkOut && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Dates</p>
                  <p className="text-sm font-medium text-[#082032]">{checkIn} → {checkOut}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#082032] mb-4">Order Summary</h2>
          <div className="space-y-3">
            {booking.booking_items?.map((item: { id: string; item_type: string; quantity: number; price_at_booking: number; metadata?: Record<string, unknown> }) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-[#F5F1E8] rounded-lg">
                <div>
                  <p className="font-medium text-[#082032] capitalize">{item.item_type.replace('_', ' ')}</p>
                  {typeof item.metadata?.checkIn === 'string' && typeof item.metadata?.checkOut === 'string' && (
                    <p className="text-xs text-gray-400">{item.metadata.checkIn} → {item.metadata.checkOut}</p>
                  )}
                </div>
                <p className="font-semibold text-[#0A3D62]">₦{(item.price_at_booking * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="text-lg font-semibold text-[#082032]">Total Paid</span>
            <span className="text-2xl font-bold text-[#0A3D62]">₦{booking.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Add to Calendar */}
        {checkIn && checkOut && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#082032] mb-3">Add to Calendar</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${calendarDates}&details=Booking Reference: ${booking.booking_reference}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A3D62]/10 text-[#0A3D62] rounded-lg hover:bg-[#0A3D62]/20 transition-colors text-sm font-medium"
              >
                <Calendar className="w-4 h-4" /> Google Calendar
              </a>
              <a
                href={`data:text/calendar;charset=utf8,BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${checkIn.replace(/-/g, '')}T140000Z\nDTEND:${checkOut.replace(/-/g, '')}T120000Z\nSUMMARY:${calendarTitle}\nDESCRIPTION:Booking Reference: ${booking.booking_reference}\nEND:VEVENT\nEND:VCALENDAR`}
                download={`atican-beach-${booking.booking_reference}.ics`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5F1E8] text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Download .ics
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          {user && (
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 bg-[#0A3D62] text-white py-3 rounded-lg font-semibold hover:bg-[#08324f] transition-colors"
            >
              View All Bookings <ChevronRight className="w-5 h-5" />
            </Link>
          )}
          <Link
            href="/rooms"
            className="flex-1 flex items-center justify-center gap-2 border-2 border-[#0A3D62] text-[#0A3D62] py-3 rounded-lg font-semibold hover:bg-[#0A3D62]/5 transition-colors"
          >
            Book Another Room
          </Link>
        </div>
      </div>
    </div>
  )
}