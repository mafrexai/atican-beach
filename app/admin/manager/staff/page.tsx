import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export default async function ManagerStaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff/login')
  }

  const admin = createAdminClient()

  const { data: userRole } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') {
    redirect('/admin/login')
  }

  const { data: staffMembers } = await admin
    .from('user_roles')
    .select('*')
    .in('role', ['front_desk', 'staff'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage front desk staff and their permissions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            {staffMembers?.length || 0} total
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {staffMembers && staffMembers.length > 0 ? (
            staffMembers.map((staff: any) => (
              <div key={staff.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0A3D62] rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {(staff.staff_name || staff.role || 'S').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{staff.staff_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">{staff.staff_email || staff.user_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${staff.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {staff.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                      {staff.role}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No staff members found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
