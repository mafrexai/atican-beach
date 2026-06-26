import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export default async function ManagerFollowupsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') redirect('/admin/login')

  const { data: followups } = await admin
    .from('follow_ups')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-up Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage guest follow-ups</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {followups && followups.length > 0 ? followups.map((fu: any) => (
            <div key={fu.id} className="px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{fu.follow_up_type}</p>
                  <p className="text-xs text-gray-500 mt-1">{fu.notes || 'No notes'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    fu.status === 'completed' ? 'bg-green-100 text-green-700' :
                    fu.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {fu.status}
                  </span>
                  {fu.due_date && (
                    <p className="text-xs text-gray-400 mt-1">Due: {fu.due_date}</p>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No follow-ups found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}