import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import Link from 'next/link'
import { CalendarPlus, LogIn, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function StaffDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()

  // Verify staff role
  const { data: userRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userRole?.role !== 'admin' && userRole?.role !== 'front_desk') {
    redirect('/admin/login')
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // Fetch today's arrivals (check-in date is today, not yet checked in)
  const { data: arrivals } = await admin
    .from('bookings')
    .select('*')
    .eq('check_in_date', today)
    .in('status', ['confirmed', 'pending'])
    .is('checked_in_at', null)
    .order('created_at', { ascending: true })

  // Fetch today's departures (check-out date is today, checked in but not checked out)
  const { data: departures } = await admin
    .from('bookings')
    .select('*')
    .eq('check_out_date', today)
    .not('checked_in_at', 'is', null)
    .is('checked_out_at', null)
    .order('created_at', { ascending: true })

  // Fetch currently checked in
  const { data: checkedIn } = await admin
    .from('bookings')
    .select('*')
    .not('checked_in_at', 'is', null)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })

  // Fetch today's walk-in bookings
  const { data: walkIns } = await admin
    .from('bookings')
    .select('*')
    .eq('booking_type', 'walk_in')
    .gte('created_at', today)
    .order('created_at', { ascending: false })

  // Stats
  const stats = [
    {
      label: "Today's Arrivals",
      value: arrivals?.length || 0,
      icon: LogIn,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-500',
    },
    {
      label: "Today's Departures",
      value: departures?.length || 0,
      icon: Clock,
      color: 'bg-orange-50 text-orange-700',
      iconColor: 'text-orange-500',
    },
    {
      label: 'Currently Checked In',
      value: checkedIn?.length || 0,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-green-500',
    },
    {
      label: "Today's Walk-ins",
      value: walkIns?.length || 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-700',
      iconColor: 'text-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/staff/book"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium"
          >
            <CalendarPlus className="w-4 h-4" />
            Walk-in Booking
          </Link>
          <Link
            href="/staff/check-in"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <LogIn className="w-4 h-4" />
            Check-in / Check-out
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Arrivals</h2>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              {arrivals?.length || 0}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {arrivals && arrivals.length > 0 ? (
              arrivals.map((booking: any) => (
                <div key={booking.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                      <p className="text-xs text-gray-500">{booking.guest_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#0A3D62]">{booking.booking_reference}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No arrivals scheduled for today
              </div>
            )}
          </div>
        </div>

        {/* Today's Departures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Departures</h2>
            <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
              {departures?.length || 0}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {departures && departures.length > 0 ? (
              departures.map((booking: any) => (
                <div key={booking.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                      <p className="text-xs text-gray-500">{booking.guest_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#0A3D62]">{booking.booking_reference}</p>
                      <p className="text-xs text-gray-400">
                        Since {booking.checked_in_at ? format(parseISO(booking.checked_in_at), 'MMM d') : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No departures scheduled for today
              </div>
            )}
          </div>
        </div>

        {/* Currently Checked In */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Currently Checked In</h2>
            <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              {checkedIn?.length || 0}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {checkedIn && checkedIn.length > 0 ? (
              checkedIn.map((booking: any) => (
                <div key={booking.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                      <p className="text-xs text-gray-500">
                        Checked in {booking.checked_in_at ? format(parseISO(booking.checked_in_at), 'MMM d, h:mm a') : '—'}
                      </p>
                    </div>
                    <p className="text-xs font-mono text-[#0A3D62]">{booking.booking_reference}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No guests currently checked in
              </div>
            )}
          </div>
        </div>

        {/* Recent Walk-in Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Walk-in Bookings</h2>
            <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              {walkIns?.length || 0}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {walkIns && walkIns.length > 0 ? (
              walkIns.map((booking: any) => (
                <div key={booking.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                      <p className="text-xs text-gray-500">₦{booking.total_amount?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-[#0A3D62]">{booking.booking_reference}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No walk-in bookings today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}