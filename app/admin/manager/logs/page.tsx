import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export default async function ManagerLogsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: userRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
  if (userRole?.role !== 'admin' && userRole?.role !== 'manager') redirect('/admin/login')

  const { data: logs } = await admin
    .from('staff_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor staff actions and system events</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {logs && logs.length > 0 ? logs.map((log: any) => (
            <div key={log.id} className="px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A3D62]/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-[#0A3D62]">
                      {log.action.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      User: {log.user_id?.substring(0, 8)}...
                      {log.ip_address && ` | IP: ${log.ip_address}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.details && (
                <div className="mt-2 ml-13 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              )}
            </div>
          )) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No activity logs found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}