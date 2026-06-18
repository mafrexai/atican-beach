import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Filter } from 'lucide-react'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; checkin?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()
  const params = await searchParams

  // Build query with filters
  let query = admin
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Filter by booking type
  if (params.type === 'walk_in') {
    query = query.eq('booking_type', 'walk_in')
  } else if (params.type === 'online') {
    query = query.eq('booking_type', 'online')
  }

  // Filter by status
  if (params.status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(params.status)) {
    query = query.eq('status', params.status)
  }

  // Filter by check-in status
  if (params.checkin === 'checked_in') {
    query = query.not('checked_in_at', 'is', null).is('checked_out_at', null)
  } else if (params.checkin === 'not_checked_in') {
    query = query.is('checked_in_at', null)
  } else if (params.checkin === 'checked_out') {
    query = query.not('checked_out_at', 'is', null)
  }

  const { data: bookings } = await query

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700',
  }

  const walkInCount = bookings?.filter((b: any) => b.booking_type === 'walk_in').length || 0
  const onlineCount = bookings?.filter((b: any) => b.booking_type !== 'walk_in').length || 0
  const checkedInCount = bookings?.filter((b: any) => b.checked_in_at && !b.checked_out_at).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage all reservations</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium">
            {bookings?.filter((b: any) => b.status === 'pending').length || 0} Pending
          </span>
          <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
            {bookings?.filter((b: any) => b.status === 'confirmed').length || 0} Confirmed
          </span>
          <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
            {walkInCount} Walk-in
          </span>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
            {checkedInCount} Checked In
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Booking Type Filter */}
          <Link
            href={`/admin/bookings${params.type ? '' : '?type=online'}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !params.type || params.type === 'online'
                ? 'bg-[#0A3D62] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Online ({onlineCount})
          </Link>
          <Link
            href={`/admin/bookings${params.type === 'walk_in' ? '' : '?type=walk_in'}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              params.type === 'walk_in'
                ? 'bg-[#0A3D62] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Walk-in ({walkInCount})
          </Link>

          {/* Status Filter */}
          {['pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
            <Link
              key={status}
              href={`/admin/bookings${params.status === status ? '' : `?status=${status}`}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                params.status === status
                  ? 'bg-[#0A3D62] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status} ({bookings?.filter((b: any) => b.status === status).length || 0})
            </Link>
          ))}

          {/* Check-in Status Filter */}
          <Link
            href={`/admin/bookings${params.checkin === 'checked_in' ? '' : '?checkin=checked_in'}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              params.checkin === 'checked_in'
                ? 'bg-[#0A3D62] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Checked In ({checkedInCount})
          </Link>
          <Link
            href={`/admin/bookings${params.checkin === 'not_checked_in' ? '' : '?checkin=not_checked_in'}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              params.checkin === 'not_checked_in'
                ? 'bg-[#0A3D62] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Not Checked In ({bookings?.filter((b: any) => !b.checked_in_at).length || 0})
          </Link>

          {/* Clear Filters */}
          {(params.type || params.status || params.checkin) && (
            <Link
              href="/admin/bookings"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              Clear Filters
            </Link>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings && bookings.length > 0 ? (
                bookings.map((booking: any) => {
                  // Determine guest status
                  let guestStatus = 'Not Arrived'
                  let guestStatusColor = 'bg-gray-100 text-gray-600'
                  if (booking.checked_out_at) {
                    guestStatus = 'Checked Out'
                    guestStatusColor = 'bg-gray-100 text-gray-700'
                  } else if (booking.checked_in_at) {
                    guestStatus = 'Checked In'
                    guestStatusColor = 'bg-green-100 text-green-700'
                  }

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-[#0A3D62]">
                          {booking.booking_reference}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">{booking.guest_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          booking.booking_type === 'walk_in'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.booking_type === 'walk_in' ? 'Walk-in' : 'Online'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {booking.check_in_date
                          ? format(parseISO(booking.check_in_date), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {booking.check_out_date
                          ? format(parseISO(booking.check_out_date), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ₦{booking.total_amount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {booking.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${guestStatusColor}`}>
                          {guestStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}