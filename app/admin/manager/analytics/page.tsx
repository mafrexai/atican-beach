import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { DollarSign, CalendarDays, BedDouble, Users } from 'lucide-react'

export default async function ManagerAnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') redirect('/admin/login')

  const { data: bookings } = await admin.from('bookings').select('*')
  const { data: rooms } = await admin.from('rooms').select('*')

  const totalRevenue = bookings?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0
  const paidBookings = bookings?.filter((b: any) => b.payment_status === 'paid').length || 0
  const totalBookings = bookings?.length || 0
  const occupancyRate = rooms && rooms.length > 0
    ? Math.round((bookings?.filter((b: any) => b.status === 'confirmed').length || 0) / rooms.length * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Track revenue and booking statistics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">₦{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-700"><DollarSign className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalBookings}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-700"><CalendarDays className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paid Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{paidBookings}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-700"><Users className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{occupancyRate}%</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-700"><BedDouble className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Statistics</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Confirmed</span>
              <span className="font-medium text-gray-900">{bookings?.filter((b: any) => b.status === 'confirmed').length || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${totalBookings > 0 ? ((bookings?.filter((b: any) => b.status === 'confirmed').length || 0) / totalBookings * 100) : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium text-gray-900">{bookings?.filter((b: any) => b.status === 'pending').length || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${totalBookings > 0 ? ((bookings?.filter((b: any) => b.status === 'pending').length || 0) / totalBookings * 100) : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium text-gray-900">{bookings?.filter((b: any) => b.status === 'completed').length || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${totalBookings > 0 ? ((bookings?.filter((b: any) => b.status === 'completed').length || 0) / totalBookings * 100) : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}