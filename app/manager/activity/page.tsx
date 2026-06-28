import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Activity, ArrowLeft } from "lucide-react"
import { format } from "date-fns"

export default async function ManagerActivityPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/manager/login")
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (userRole?.role !== "manager") {
    redirect("/manager/login")
  }

  const { data: logs } = await supabase
    .from("staff_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manager/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-500 text-sm mt-1">View staff activity and booking logs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {logs && logs.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {logs.map((log: any) => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.details ? JSON.stringify(log.details).substring(0, 100) : "No details"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {log.created_at ? format(new Date(log.created_at), "MMM d, yyyy HH:mm") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No activity logs found</p>
          </div>
        )}
      </div>
    </div>
  )
}
