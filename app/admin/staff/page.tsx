import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { Users, UserPlus, Mail, Shield, Calendar, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminStaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()

  // Fetch staff members (front_desk role)
  const { data: staffMembers } = await admin
    .from('user_roles')
    .select('*')
    .eq('role', 'front_desk')
    .order('created_at', { ascending: false })

  // Fetch all user roles for context
  const { data: allRoles } = await admin
    .from('user_roles')
    .select('*')
    .order('created_at', { ascending: false })

  const activeCount = staffMembers?.filter((s: any) => s.is_active !== false).length || 0
  const inactiveCount = staffMembers?.filter((s: any) => s.is_active === false).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage front desk staff and their permissions</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/staff/add"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </Link>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              {activeCount} Active
            </span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
              {inactiveCount} Inactive
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staffMembers?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Front Desk</p>
              <p className="text-2xl font-bold text-gray-900">{staffMembers?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {allRoles?.filter((r: any) => r.role === 'admin').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Front Desk Staff</h2>
          <p className="text-sm text-gray-500">Staff members with front desk access</p>
        </div>

        {staffMembers && staffMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hire Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffMembers.map((staff: any) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#0A3D62]/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-[#0A3D62]">
                            {(staff.staff_name || 'S').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{staff.staff_name || '—'}</p>
                          <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{staff.staff_email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">{staff.shift || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {staff.hire_date ? format(parseISO(staff.hire_date), 'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        staff.is_active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {staff.is_active !== false ? (
                          <ToggleRight className="w-3 h-3" />
                        ) : (
                          <ToggleLeft className="w-3 h-3" />
                        )}
                        {staff.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-sm text-[#0A3D62] hover:underline">
                          Edit
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-sm text-red-600 hover:underline">
                          {staff.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No front desk staff found</p>
            <p className="text-sm text-gray-400">
              Staff members will appear here when they are assigned the front_desk role.
            </p>
          </div>
        )}
      </div>

      {/* All Users by Role */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">All Users by Role</h2>
          <p className="text-sm text-gray-500">Overview of all user roles in the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allRoles && allRoles.length > 0 ? (
                allRoles.slice(0, 20).map((role: any) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-gray-500">
                        {role.user_id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        role.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : role.role === 'front_desk'
                            ? 'bg-blue-100 text-blue-700'
                            : role.role === 'staff'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}>
                        {role.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {role.staff_name || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        role.is_active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {role.is_active !== false ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {role.created_at ? format(parseISO(role.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No user roles found
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