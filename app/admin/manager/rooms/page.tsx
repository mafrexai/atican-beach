import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export default async function ManagerRoomsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') redirect('/admin/login')

  const { data: rooms } = await admin.from('rooms').select('*').order('room_number')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Room Maintenance</h1>
        <p className="text-gray-500 text-sm mt-1">Toggle room status for maintenance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms && rooms.length > 0 ? rooms.map((room: any) => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{room.room_type}</p>
                <p className="text-sm text-gray-500">Room {room.room_number}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                room.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {room.is_active !== false ? 'Active' : 'Maintenance'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">₦{room.price_per_night?.toLocaleString()}/night</p>
            <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
              room.is_active !== false
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
              {room.is_active !== false ? 'Set Maintenance' : 'Activate Room'}
            </button>
          </div>
        )) : (
          <div className="col-span-full text-center py-8 text-gray-400">No rooms found</div>
        )}
      </div>
    </div>
  )
}