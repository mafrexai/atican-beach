import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import Link from 'next/link'
import { CalendarPlus, LogIn, Users, Clock, CheckCircle2, AlertCircle, BedDouble, Check, X } from 'lucide-react'

export default async function StaffDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'front_desk') redirect('/staff/login')

  const today = format(new Date(), 'yyyy-MM-dd')

  // Fetch room data
  const { data: allRooms } = await admin.from('rooms').select('*').eq('is_active', true).order('room_number')
  const availableRooms = allRooms?.filter((r: any) => r.status === 'available') || []
  const bookedRooms = allRooms?.filter((r: any) => r.status === 'booked') || []
  const maintenanceRooms = allRooms?.filter((r: any) => r.status === 'maintenance') || []

  // Fetch bookings for booked rooms
  const { data: activeBookings } = await admin
    .from('bookings')
    .select('*, booking_items(*)')
    .in('status', ['confirmed', 'pending'])
    .order('check_in_date', { ascending: true })

  // Fetch today's data
  const { data: arrivals } = await admin.from('bookings').select('*').eq('check_in_date', today).in('status', ['confirmed', 'pending']).is('checked_in_at', null).order('created_at', { ascending: true })
  const { data: departures } = await admin.from('bookings').select('*').eq('check_out_date', today).not('checked_in_at', 'is', null).is('checked_out_at', null).order('created_at', { ascending: true })
  const { data: checkedIn } = await admin.from('bookings').select('*').not('checked_in_at', 'is', null).is('checked_out_at', null).order('checked_in_at', { ascending: false })

  const stats = [
    { label: 'Available Rooms', value: availableRooms.length, icon: Check, color: 'bg-green-50 text-green-700', iconColor: 'text-green-500' },
    { label: 'Booked Rooms', value: bookedRooms.length, icon: BedDouble, color: 'bg-red-50 text-red-700', iconColor: 'text-red-500' },
    { label: \"Today's Arrivals\", value: arrivals?.length || 0, icon: LogIn, color: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-500' },
    { label: 'Currently Checked In', value: checkedIn?.length || 0, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
  ]

  return (
    <div className=\"space-y-6\">
      <div>
        <h1 className=\"text-2xl font-bold text-gray-900\">Staff Dashboard</h1>
        <p className=\"text-gray-500 text-sm mt-1\">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className=\"grid grid-cols-2 sm:grid-cols-4 gap-4\">
        {stats.map((stat) => (
          <div key={stat.label} className=\"bg-white rounded-xl shadow-sm border border-gray-200 p-4\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-xs text-gray-500\">{stat.label}</p>
                <p className=\"text-2xl font-bold text-gray-900 mt-1\">{stat.value}</p>
              </div>
              <div className={\p-2 rounded-lg \\}>
                <stat.icon className={\w-5 h-5 \\} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className=\"bg-white rounded-xl shadow-sm border border-gray-200 p-5\">
        <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Quick Actions</h2>
        <div className=\"flex flex-wrap gap-3\">
          <Link href=\"/staff/book\" className=\"inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium\">
            <CalendarPlus className=\"w-4 h-4\" /> Walk-in Booking
          </Link>
          <Link href=\"/staff/check-in\" className=\"inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium\">
            <LogIn className=\"w-4 h-4\" /> Check-in / Check-out
          </Link>
        </div>
      </div>

      {/* Room Availability Table */}
      <div className=\"bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden\">
        <div className=\"px-5 py-4 border-b border-gray-100\">
          <h2 className=\"text-lg font-semibold text-gray-900\">Room Availability</h2>
          <p className=\"text-sm text-gray-500\">Click on a room to view booking details</p>
        </div>
        <div className=\"overflow-x-auto\">
          <table className=\"w-full\">
            <thead className=\"bg-gray-50\">
              <tr>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Room</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Type</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Price/Night</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Status</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Guest</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Check-in</th>
                <th className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase\">Check-out</th>
              </tr>
            </thead>
            <tbody className=\"divide-y divide-gray-100\">
              {allRooms?.map((room: any) => {
                const booking = activeBookings?.find((b: any) => b.booking_items?.some((i: any) => i.item_type === 'room' && i.item_id === room.id))
                return (
                  <tr key={room.id} className=\"hover:bg-gray-50 cursor-pointer\" onClick={() => window.location.href = \/staff/rooms/\\}>
                    <td className=\"px-4 py-3 text-sm font-medium text-gray-900\">{room.room_number}</td>
                    <td className=\"px-4 py-3 text-sm text-gray-600\">{room.room_type}</td>
                    <td className=\"px-4 py-3 text-sm text-gray-600\">N{room.price_per_night?.toLocaleString()}</td>
                    <td className=\"px-4 py-3\">
                      <span className={\inline-flex px-2 py-1 rounded-full text-xs font-medium \\}>
                        {room.status || 'available'}
                      </span>
                    </td>
                    <td className=\"px-4 py-3 text-sm text-gray-600\">{booking?.guest_name || '-'}</td>
                    <td className=\"px-4 py-3 text-sm text-gray-600\">{booking?.check_in_date || '-'}</td>
                    <td className=\"px-4 py-3 text-sm text-gray-600\">{booking?.check_out_date || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
