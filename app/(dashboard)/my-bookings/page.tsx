import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CalendarDays, MapPin, QrCode, ChevronRight, AlertCircle } from 'lucide-react'
import { format, isPast, isFuture, parseISO } from 'date-fns'

export default async function MyBookingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const upcoming = (bookings || []).filter(
    (b) => b.check_in_date && isFuture(parseISO(b.check_in_date)) && b.status !== 'cancelled'
  )
  const past = (bookings || []).filter(
    (b) => b.check_in_date && (isPast(parseISO(b.check_in_date)) || b.status === 'cancelled' || b.status === 'completed')
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
          My Bookings
        </h1>
        <p className="text-gray-600 mt-1">View and manage your reservations</p>
      </div>

      {(!bookings || bookings.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CalendarDays className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-[#082032] mb-2">No bookings yet</h2>
          <p className="text-gray-500 mb-6">You haven't made any bookings yet. Start exploring our rooms and services.</p>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 bg-[#0A3D62] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#08324f] transition-colors"
          >
            Browse Rooms <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Bookings */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#082032] mb-4">
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-4">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}

          {/* Past Bookings */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#082032] mb-4">
                Past & Cancelled ({past.length})
              </h2>
              <div className="space-y-4">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking, isPast = false }: { booking: {
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
}; isPast?: boolean }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${isPast ? 'opacity-70' : ''}`}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <p className="text-sm text-gray-500">Reference</p>
            <p className="text-lg font-bold text-[#0A3D62]">{booking.booking_reference}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
              booking.payment_status === 'refunded' ? 'bg-orange-100 text-orange-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {booking.payment_status === 'paid' ? 'Paid' :
               booking.payment_status === 'refunded' ? 'Refunded' : 'Unpaid'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {booking.check_in_date && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Check-in</p>
                <p className="font-medium text-[#082032]">{format(parseISO(booking.check_in_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          )}
          {booking.check_out_date && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Check-out</p>
                <p className="font-medium text-[#082032]">{format(parseISO(booking.check_out_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Total</p>
              <p className="font-bold text-[#0A3D62]">₦{booking.total_amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Booking Items */}
        {booking.booking_items && booking.booking_items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {booking.booking_items.map((item, i) => (
              <span key={i} className="text-xs bg-[#F5F1E8] text-gray-600 px-2 py-1 rounded">
                {item.item_type.replace('_', ' ')} × {item.quantity}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-xs text-gray-400">
            Booked on {format(parseISO(booking.created_at), 'MMM d, yyyy')}
          </p>
          <div className="flex gap-2">
            {!isPast && booking.status === 'confirmed' && booking.qr_code && (
              <Link
                href={`/booking/confirmation?ref=${booking.booking_reference}`}
                className="flex items-center gap-1 text-sm text-[#0A3D62] hover:text-[#F97316] font-medium"
              >
                <QrCode className="w-4 h-4" /> QR Code
              </Link>
            )}
            {!isPast && booking.status !== 'cancelled' && (
              <Link
                href={`/booking/cancel?ref=${booking.booking_reference}`}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium"
              >
                <AlertCircle className="w-4 h-4" /> Cancel
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}