import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CalendarDays, MapPin, QrCode, ChevronRight, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { format, isPast, isFuture, parseISO } from 'date-fns'

type Booking = {
  id: string
  booking_reference: string
  confirmation_code: string
  status: string
  payment_status: string
  total_amount: number
  check_in_date: string | null
  check_out_date: string | null
  guest_name: string
  created_at: string
  qr_code: string | null
  booking_items?: Array<{ item_type: string; quantity: number; price_at_booking: number }>
}

export default async function MyBookingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  const allBookings: Booking[] = bookings || []
  const upcoming = allBookings.filter(
    (b) => b.check_in_date && isFuture(parseISO(b.check_in_date)) && b.status !== 'cancelled'
  )
  const past = allBookings.filter(
    (b) => b.check_in_date && (isPast(parseISO(b.check_in_date)) || b.status === 'cancelled' || b.status === 'completed')
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
          My Bookings
        </h1>
        <p className="text-gray-600 mt-2">Manage your reservations at Atican Beach Resort</p>
      </div>

      {allBookings.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-16 text-center">
          <div className="w-24 h-24 mx-auto bg-[#F5F1E8] rounded-full flex items-center justify-center mb-6">
            <CalendarDays className="w-12 h-12 text-[#0A3D62]" />
          </div>
          <h2 className="text-3xl font-semibold text-[#082032] mb-3">No bookings yet</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            You haven’t made any reservations. Discover our luxurious rooms and experiences.
          </p>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-3 bg-[#0A3D62] text-white px-8 py-4 rounded-2xl font-semibold hover:bg-[#08324f] transition-all text-lg"
          >
            Browse Rooms <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Upcoming Bookings */}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-[#082032]">Upcoming Stays ({upcoming.length})</h2>
              </div>
              <div className="space-y-6">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}

          {/* Past Bookings */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-gray-500" />
                <h2 className="text-2xl font-semibold text-[#082032]">Past & Cancelled ({past.length})</h2>
              </div>
              <div className="space-y-6 opacity-90">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} isPast />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// Enhanced Booking Card
function BookingCard({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  return (
    <div className={`bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-300 ${isPast ? 'opacity-75' : ''}`}>
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-gray-500">Booking Reference</p>
              <p className="font-mono font-bold text-[#0A3D62] text-lg">{booking.booking_reference}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {booking.check_in_date && (
                <div>
                  <p className="text-xs text-gray-500">CHECK-IN</p>
                  <p className="font-semibold text-lg text-[#082032]">
                    {format(parseISO(booking.check_in_date), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              )}
              {booking.check_out_date && (
                <div>
                  <p className="text-xs text-gray-500">CHECK-OUT</p>
                  <p className="font-semibold text-lg text-[#082032]">
                    {format(parseISO(booking.check_out_date), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">TOTAL AMOUNT</p>
                <p className="font-bold text-2xl text-[#0A3D62]">₦{booking.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className={`px-5 py-2 rounded-2xl text-sm font-medium border ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
              {booking.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              {booking.payment_status === 'paid' ? '✓ Paid' : 'Pending Payment'}
            </span>
          </div>
        </div>

        {/* Booking Items */}
        {booking.booking_items && booking.booking_items.length > 0 && (
          <div className="mt-6 pt-6 border-t flex flex-wrap gap-2">
            {booking.booking_items.map((item, i) => (
              <span key={i} className="bg-[#F5F1E8] text-gray-700 text-sm px-4 py-1.5 rounded-2xl">
                {item.item_type.replace('_', ' ')} × {item.quantity}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <p className="text-sm text-gray-500">
            Booked on {format(parseISO(booking.created_at), 'MMMM d, yyyy')}
          </p>

          <div className="flex gap-3">
            {!isPast && booking.status === 'confirmed' && booking.qr_code && (
              <Link
                href={`/booking/confirmation?ref=${booking.booking_reference}`}
                className="flex items-center gap-2 px-6 py-3 bg-[#0A3D62] text-white rounded-2xl hover:bg-[#08324f] transition font-medium"
              >
                <QrCode className="w-4 h-4" /> View QR Code
              </Link>
            )}

            {!isPast && booking.status !== 'cancelled' && (
              <Link
                href={`/booking/cancel?ref=${booking.booking_reference}`}
                className="flex items-center gap-2 px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-2xl transition font-medium"
              >
                <AlertCircle className="w-4 h-4" /> Cancel Booking
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}