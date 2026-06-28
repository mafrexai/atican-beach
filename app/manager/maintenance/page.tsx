import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { format } from "date-fns"

export default async function ManagerMaintenancePage() {
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

  const { data: maintenance } = await supabase
    .from("facility_maintenance")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "pending":
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manager/dashboard" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage facility maintenance requests</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Maintenance Requests</h2>
        </div>
        {maintenance && maintenance.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {maintenance.map((item: any) => (
              <div key={item.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title || item.description?.substring(0, 50)}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Location: {item.location || "N/A"} | Priority: {item.priority || "Normal"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No maintenance requests found</p>
          </div>
        )}
      </div>
    </div>
  )
}
