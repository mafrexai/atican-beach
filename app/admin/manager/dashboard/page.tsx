import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, BedDouble, Wrench, Activity, DollarSign } from 'lucide-react'

export default async function ManagerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') redirect('/admin/login')

  const { data: staffMembers } = await admin.from('user_roles').select('*').eq('role', 'front_desk')
  const { data: rooms } = await admin.from('rooms').select('*')
  const { data: bookings } = await admin.from('bookings').select('*').eq('status', 'confirmed')
  const { data: logs } = await admin.from('staff_activity_logs').select('*').order('created_at', { ascending: false }).limit(10)

  const activeRooms = rooms?.filter((r: any) => r.is_active !== false).length || 0
  const totalRooms = rooms?.length || 0
  const staffCount = staffMembers?.length || 0
  const bookingCount = bookings?.length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of hotel operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{staffCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-700"><Users className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{bookingCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-700"><DollarSign className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Rooms</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeRooms}/{totalRooms}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-700"><BedDouble className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Maintenance</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-700"><Wrench className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/manager/staff" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <Users className="w-6 h-6" /><span className="text-sm font-medium">Manage Staff</span>
          </Link>
          <Link href="/admin/manager/rooms" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
            <BedDouble className="w-6 h-6" /><span className="text-sm font-medium">Room Maintenance</span>
          </Link>
          <Link href="/admin/manager/logs" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">
            <Activity className="w-6 h-6" /><span className="text-sm font-medium">Activity Logs</span>
          </Link>
          <Link href="/admin/manager/analytics" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors">
            <DollarSign className="w-6 h-6" /><span className="text-sm font-medium">Analytics</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/admin/manager/logs" className="text-sm text-[#0A3D62] hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {logs && logs.length > 0 ? logs.map((log: any) => (
            <div key={log.id} className="px-5 py-3 hover:bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{log.action}</p>
                <p className="text-xs text-gray-500">{log.user_id?.substring(0, 8)}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  )
}