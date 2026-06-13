import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BedDouble, Tent, Sparkles, CalendarDays, CreditCard, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient()

  // Fetch stats with individual try/catch to prevent one failure from breaking everything
  let totalRooms = 0
  let totalTents = 0
  let totalExperiences = 0
  let totalBookings = 0
  let pendingBookings = 0
  let recentBookings: any[] | null = null

  try {
    const [roomsResult, tentsResult, experiencesResult, bookingsResult, pendingResult, recentResult] = await Promise.all([
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('tents').select('*', { count: 'exact', head: true }),
      supabase.from('experiences').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('id, booking_reference, guest_name, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    totalRooms = roomsResult.count || 0
    totalTents = tentsResult.count || 0
    totalExperiences = experiencesResult.count || 0
    totalBookings = bookingsResult.count || 0
    pendingBookings = pendingResult.count || 0
    recentBookings = recentResult.data
  } catch {
    // If any query fails (e.g., table doesn't exist), use default values
  }

  const stats = [
    { title: 'Total Rooms', value: totalRooms, icon: BedDouble, color: 'bg-blue-500', href: '/admin/rooms' },
    { title: 'Total Tents', value: totalTents, icon: Tent, color: 'bg-amber-500', href: '/admin/tents' },
    { title: 'Experiences', value: totalExperiences, icon: Sparkles, color: 'bg-purple-500', href: '/admin/experiences' },
    { title: 'Total Bookings', value: totalBookings, icon: CalendarDays, color: 'bg-emerald-500', href: '/admin/bookings' },
    { title: 'Pending', value: pendingBookings, icon: Clock, color: 'bg-orange-500', href: '/admin/bookings' },
    { title: 'Revenue (MTD)', value: '₦0', icon: CreditCard, color: 'bg-[#0A3D62]', href: '/admin/payments' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A3D62]">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to Atican Beach Resort Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#0A3D62]">Recent Bookings</h2>
        </div>
        {recentBookings && recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-[#0A3D62]">{booking.booking_reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{booking.guest_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">₦{booking.total_amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings yet</p>
          </div>
        )}
      </div>
    </div>
  )
}